import hashlib
import json
from pathlib import Path

import mido
import numpy as np
import pytest
import torch
from tensorboard.backend.event_processing.event_accumulator import EventAccumulator

from groove.pretraining.audit import sha256
from groove.representation.alignment import load_alignment
from groove.representation.alignment_data import HumanPairs, group_batches, pack_taps, candidate_mask
from groove.representation.alignment_metrics import retrieval_metrics
from groove.representation.encoder import EncoderConfig, GrooveEncoder
from groove.representation.taptam import prepare_pairs
from groove.representation.train_alignment import parser, run


def write_midi(path, events):
    path.parent.mkdir(parents=True, exist_ok=True)
    midi = mido.MidiFile(ticks_per_beat=480)
    track = mido.MidiTrack(); midi.tracks.append(track)
    track.append(mido.MetaMessage('set_tempo', tempo=500000))
    previous = 0
    for tick, note in events:
        track.append(mido.Message('note_on', note=note, velocity=100, time=tick-previous))
        previous = tick
    midi.save(path)


def fixture(tmp_path):
    sessions = {}
    for n in range(1, 100):
        session = f'drummer{n}-session1'
        number = int(hashlib.sha256(f'42:{session}'.encode()).hexdigest()[:8], 16) % 100
        split = 'train' if number < 80 else 'validation' if number < 90 else 'test'
        sessions.setdefault(split, session)
    counter = 0
    for split, count in [('train', 5), ('validation', 3), ('test', 2)]:
        for performance in range(count):
            counter += 1
            folder = tmp_path/'source'/f'[{counter:03d} P1] {sessions[split]}-{performance}_funk_120_beat_4-4_best_2bar_segment_0'
            groove = [(0, 36), (120+counter*7, 42), (480+counter*11, 38), (1200+counter*3, 36)]
            write_midi(folder/'original.mid', groove)
            for participant in (1, 2):
                for interpretation in ('simple', 'complex'):
                    write_midi(folder/f'Participant_{participant}_{interpretation}.mid',
                               [(tick, 76 if i % 2 else 77) for i, (tick, _) in enumerate(groove)])
    # A repeated recording is a positive alias, not an extra negative group.
    source = next((tmp_path/'source').glob('[[]001*'))
    duplicate = source.with_name(source.name.replace('[001', '[101'))
    duplicate.mkdir()
    for path in source.iterdir():
        (duplicate/path.name).write_bytes(path.read_bytes())
    # A lossy HVO pattern retains raw human pairs but cannot enter training.
    folder = tmp_path/'source'/f'[201 P1] {sessions["train"]}-99_funk_120_beat_4-4_best_2bar_segment_0'
    write_midi(folder/'original.mid', [(0, 36), (1, 36), (480, 38)])
    write_midi(folder/'Participant_1_simple.mid', [(0, 76), (480, 77)])
    pairs = tmp_path/'pairs'
    prepare_pairs(tmp_path/'source', pairs)
    torch.manual_seed(7)
    config = EncoderConfig(16, 8, 1, 2, 0)
    encoder = GrooveEncoder(config)
    checkpoint = tmp_path/'groove.pt'
    torch.save(dict(format='groove-encoder-v1', architecture=vars(config), model=encoder.state_dict(),
                    identity=dict(inputs={}, settings={}, code_sha256='fixture')), checkpoint)
    return pairs, checkpoint


def args_for(pairs, checkpoint, out, epochs=2):
    return parser().parse_args(['--pairs', str(pairs), '--groove-checkpoint', str(checkpoint),
        '--out', str(out), '--epochs', str(epochs), '--device', 'cpu', '--threads', '1',
        '--hidden', '16', '--embedding', '8', '--layers', '1', '--heads', '2',
        '--batch-groups', '2', '--progress', 'off', '--log-every', '1'])


def test_group_sampler_filters_aliases_and_lossy_hvo_and_balances_participants(tmp_path):
    pairs, _ = fixture(tmp_path)
    corpus = HumanPairs(pairs)
    groups = corpus.split_groups('train')
    assert len(groups) == 5
    assert len(corpus.split_groups('validation')) == 3
    first = list(group_batches(corpus, groups, 2, 2, 42))
    assert first == list(group_batches(corpus, groups, 2, 2, 42))
    assert sorted(g for batch, _ in first for g in batch) == groups
    assert sorted(len(batch) for batch, _ in first) == [2, 3]  # No singleton batch dropped.
    for batch, selected in first:
        for group in batch:
            assert {corpus.pairs[i]['participant'] for i in selected if corpus.pair_groups[i] == group} == {1, 2}
        events, padding = pack_taps(corpus, selected, 'hand_agnostic')
        assert not events[..., 2].any() and not padding.all(1).any()
        original = torch.tensor(corpus.pairs[selected[0]]['events'])
        torch.testing.assert_close(events[0, :len(original), :2], original[:, :2])
    corpus.groups[groups[1]]['performances'] = corpus.groups[groups[0]]['performances'].copy()
    allowed = candidate_mask(corpus, groups[:2], groups[:2])
    assert torch.equal(allowed, torch.eye(2, dtype=torch.bool))


def test_real_ranks_chance_and_collapsed_embeddings():
    good = retrieval_metrics(np.eye(3)[[0, 0, 1, 2]], [0, 0, 1, 2], [0, 1, 2])
    assert good['mrr'] == good['recall_at_1'] == 1
    collapsed = retrieval_metrics(np.ones((3, 3)), [0, 1, 2], [0, 1, 2])
    assert collapsed['recall_at_1'] == 0 and collapsed['mrr'] == pytest.approx(1/3)
    no_distractors = retrieval_metrics(np.eye(3), [0, 1, 2], [0, 1, 2], np.eye(3, dtype=bool))
    assert no_distractors['queries'] == 0 and 'mrr' not in no_distractors


def test_alignment_resume_frozen_encoder_and_self_contained_inference(tmp_path, monkeypatch):
    pairs, checkpoint = fixture(tmp_path)
    # Fail if a test tap is ever sent to the network (metadata integrity checks are OK).
    import groove.representation.train_alignment as training
    import groove.representation.alignment_metrics as metrics
    original_pack = pack_taps
    def checked_pack(corpus, indexes, *args, **kwargs):
        assert all(corpus.pairs[i]['split'] != 'test' for i in indexes)
        return original_pack(corpus, indexes, *args, **kwargs)
    monkeypatch.setattr(training, 'pack_taps', checked_pack)
    monkeypatch.setattr(metrics, 'pack_taps', checked_pack)
    full = args_for(pairs, checkpoint, tmp_path/'full')
    full.tensorboard = False
    run(full)
    first = args_for(pairs, checkpoint, tmp_path/'resumed', 1)
    run(first)
    second = args_for(pairs, checkpoint, tmp_path/'resumed', 2)
    second.resume = first.out/'last.pt'
    second.log_every = 5
    run(second)
    a = torch.load(full.out/'last.pt', weights_only=True)
    b = torch.load(first.out/'last.pt', weights_only=True)
    for name in a['model']:
        torch.testing.assert_close(a['model'][name], b['model'][name], rtol=0, atol=0)
    assert a['metrics']['validation'] == b['metrics']['validation']
    before = torch.load(checkpoint, weights_only=True)
    for name in before['model']:
        torch.testing.assert_close(b['groove_encoder'][name], before['model'][name], rtol=0, atol=0)
    events = EventAccumulator(str(first.out/'tensorboard/epochs')).Reload()
    assert [row.step for row in events.Scalars('mrr/validation')] == [1, 2]
    assert events.Scalars('mrr/validation')[-1].value == pytest.approx(b['metrics']['validation']['mrr'])
    aligned, frozen, state = load_alignment(first.out/'best.pt')
    corpus = HumanPairs(pairs)
    selected = corpus.selection(corpus.split_groups('validation'))
    with torch.no_grad():
        tap = aligned.encode_taps(*pack_taps(corpus, selected['pair_indexes'], 'hand_agnostic'))
        groove = aligned.project_grooves(frozen.encode(torch.from_numpy(
            np.array(corpus.grooves[selected['groove_indexes']], copy=True))))
    assert torch.isfinite(tap @ groove.T).all()
    torch.testing.assert_close(tap.norm(dim=-1), torch.ones(len(tap)))
    changed = args_for(pairs, checkpoint, tmp_path/'resumed', 3)
    changed.resume = first.out/'last.pt'; changed.temperature = .2
    with pytest.raises(ValueError, match='identical'):
        run(changed)


def test_modified_pairs_and_session_leak_fail_closed(tmp_path):
    pairs, _ = fixture(tmp_path)
    path = pairs/'patterns.jsonl'
    original = path.read_bytes()
    path.write_bytes(original + b'\n')
    with pytest.raises(ValueError, match='Changed TapTamDrum'):
        HumanPairs(pairs)
    rows = [json.loads(line) for line in original.decode().splitlines()]
    train_session = next(r['gmd_session'] for r in rows if r['split'] == 'train')
    next(r for r in rows if r['split'] == 'validation')['gmd_session'] = train_session
    path.write_text(''.join(json.dumps(r) + '\n' for r in rows))
    card = json.loads((pairs/'pairs-card.json').read_text())
    card['artifacts']['patterns.jsonl'] = sha256(path)
    (pairs/'pairs-card.json').write_text(json.dumps(card))
    with pytest.raises(ValueError, match='session crosses'):
        HumanPairs(pairs)
