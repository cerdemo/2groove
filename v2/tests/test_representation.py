import json
from pathlib import Path
import sys
import numpy as np
import pytest
import torch
from groove.representation.encoder import EncoderConfig, GrooveEncoder, make_mask, masked_loss
from groove.representation.alignment import TapEncoder, multi_positive_loss
from groove.representation.train import parser, run, validation_mask
from groove.representation.data import verify_inputs
from groove.pretraining.plan import prepare
from test_pretraining import check


def inputs(tmp_path):
    _, _, audit, _ = check(tmp_path)
    prepare(audit, tmp_path/'plan', progress=lambda _: None)
    # Import the real cache implementation, not a test approximation.
    import importlib.util
    spec = importlib.util.spec_from_file_location('cache_hvo', Path(__file__).parents[1]/'scripts/cache_hvo.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.materialize(audit, tmp_path/'cache', progress=lambda _: None)
    return tmp_path/'cache', tmp_path/'plan'


def arguments(cache, plan, out, epochs=1):
    return parser().parse_args(['--cache', str(cache), '--plan', str(plan), '--out', str(out),
        '--epochs', str(epochs), '--device', 'cpu', '--threads', '1', '--batch-size', '2',
        '--hidden', '16', '--embedding', '8', '--layers', '1', '--heads', '2'])


def test_masked_targets_cannot_leak_and_only_masked_cells_contribute():
    torch.set_num_threads(1)
    torch.manual_seed(3)
    model = GrooveEncoder(EncoderConfig(16, 8, 1, 2, 0)).eval()
    x = torch.rand(2, 32, 9, 3)
    mask = make_mask(2, torch.Generator().manual_seed(5))
    y = x.clone(); y[mask] = 999
    for first, second in zip(model(x, mask), model(y, mask)):
        torch.testing.assert_close(first, second, rtol=0, atol=0)
    target = torch.zeros_like(x)
    target[0, 0, 0] = torch.tensor([1, .8, -.2])
    mask[0, 0, 0] = True
    heads = torch.zeros_like(x, requires_grad=True)
    loss, _ = masked_loss(heads, target, mask)
    loss.backward()
    assert heads.grad[~mask].abs().sum() == 0
    assert heads.grad[0, 0, 0].abs().sum() > 0
    assert heads.grad[..., 1:][target[..., 0] == 0].abs().sum() == 0


def test_validation_masks_batch_independent_and_embedding_normalized():
    rows = [2, 19, 30]
    whole = validation_mask(rows, 42, .3)
    pieces = torch.cat([validation_mask([r], 42, .3) for r in rows])
    assert torch.equal(whole, pieces)
    assert whole.any() and not whole.all()
    model = GrooveEncoder(EncoderConfig(16, 8, 1, 2, 0)).eval()
    z = model.encode(torch.zeros(3, 32, 9, 3))
    torch.testing.assert_close(z.norm(dim=-1), torch.ones(3))


def test_epoch_resume_matches_uninterrupted_and_tamper_is_rejected(tmp_path):
    cache, plan = inputs(tmp_path)
    full = arguments(cache, plan, tmp_path/'full', 2)
    run(full)
    first = arguments(cache, plan, tmp_path/'resumed', 1)
    run(first)
    second = arguments(cache, plan, tmp_path/'resumed', 2)
    second.resume = tmp_path/'resumed/last.pt'
    run(second)
    a = torch.load(tmp_path/'full/last.pt', weights_only=True)
    b = torch.load(tmp_path/'resumed/last.pt', weights_only=True)
    for key in a['model']:
        torch.testing.assert_close(a['model'][key], b['model'][key], rtol=0, atol=0)
    assert a['metrics']['validation'] == b['metrics']['validation']
    assert b['epoch'] == 2 and 'validation_constant_baseline' in b['metrics']
    rows = np.load(tmp_path/'full/selection.npz')
    with np.load(plan/'train-plan.npz') as original:
        assert not original['synthetic'][np.isin(original['index'], rows['train'])].any()
    # Training works with no test array at all.
    (cache/'test/drums.npy').unlink()
    verify_inputs(cache, plan)
    array = np.load(cache/'train/drums.npy', mmap_mode='r+')
    array[0, 0, 0, 0] = .123; array.flush()
    with pytest.raises(ValueError, match='Changed cache'):
        verify_inputs(cache, plan)


def test_missing_cuda_is_explicit(tmp_path):
    if torch.cuda.is_available():
        pytest.skip('CUDA exists')
    args = arguments(tmp_path/'missing', tmp_path/'missing', tmp_path/'out')
    args.device = 'cuda'
    with pytest.raises(ValueError, match='CUDA requested'):
        run(args)


def test_tiny_masked_overfit_has_finite_learning_signal():
    torch.set_num_threads(1)
    torch.manual_seed(10)
    model = GrooveEncoder(EncoderConfig(16, 8, 1, 2, 0))
    target = torch.zeros(2, 32, 9, 3)
    target[:, ::4, 0, 0] = 1; target[:, ::4, 0, 1] = .8
    mask = make_mask(2, torch.Generator().manual_seed(5), .5)
    optimizer = torch.optim.AdamW(model.parameters(), lr=.01)
    initial = float(masked_loss(model(target, mask)[1], target, mask)[0].detach())
    for _ in range(50):
        optimizer.zero_grad()
        loss, _ = masked_loss(model(target, mask)[1], target, mask)
        loss.backward(); optimizer.step()
    assert torch.isfinite(loss) and float(loss.detach()) < initial * .6


def test_multi_positive_alignment_and_padding():
    q = torch.tensor([[1., 0], [1., 0], [0., 1]], requires_grad=True)
    g = torch.eye(2, requires_grad=True)
    groups = torch.tensor([10, 10, 20]); refs = torch.tensor([10, 20])
    correct = multi_positive_loss(q, g, groups, refs)
    wrong = multi_positive_loss(q, g.flip(0), groups, refs)
    assert correct < wrong
    correct.backward()
    assert torch.isfinite(q.grad).all()
    with pytest.raises(ValueError, match='two source'):
        multi_positive_loss(q, g, torch.ones(3), refs)
    model = TapEncoder(hidden=16, embedding=8, layers=1, heads=2).eval()
    events = torch.tensor([[[0., .7, 1], [1.5, .9, 2], [0., 0., 0]]])
    padded = torch.tensor([[False, False, True]])
    torch.testing.assert_close(model(events, padded), model(events[:, :2], padded[:, :2]), atol=1e-6, rtol=1e-6)
    with pytest.raises(ValueError, match='Empty taps'):
        model(events, torch.ones_like(padded))


def test_static_archive_searches_all_cells_and_respects_filters():
    from groove.representation.retrieval import search
    embeddings = np.array([[1., 0.], [.99, .1], [.7, .7], [-1., 0.]], np.float32)
    descriptors = np.array([[1, .1], [1, .1], [10, .8], [4, .5]])
    result = search([1, 0], embeddings, k=1, descriptors=descriptors,
                    eligible=[False, True, True, True], minimum_score=0)
    assert result['nearest'][0]['index'] == 1
    assert {row['index'] for row in result['archive']} == {1, 2}
    assert result['algorithm'] == 'static-corpus-retrieval'


def test_taptam_preserves_raw_pairs_and_marks_lossy_hvo(tmp_path):
    import mido
    from groove.representation.taptam import prepare_pairs
    folder = tmp_path/'source/midi_files/Repetitions/[001 P1] drummer1-session1-1_funk_120_beat_4-4_best_2bar_segment_0'
    folder.mkdir(parents=True)
    def midi(path, events):
        file = mido.MidiFile(ticks_per_beat=480)
        track = mido.MidiTrack(); file.tracks.append(track)
        track.append(mido.MetaMessage('set_tempo', tempo=500000))
        previous = 0
        for tick, note in events:
            track.append(mido.Message('note_on', note=note, velocity=100, time=tick-previous))
            previous = tick
        file.save(path)
    midi(folder/'original.mid', [(0, 36), (20, 36), (480, 38)])
    midi(folder/'Participant_1_simple.mid', [(0, 76), (600, 77)])
    report = prepare_pairs(tmp_path/'source', tmp_path/'pairs')
    assert report['patterns'] == report['pairs'] == 1
    assert report['hvo_eligible_pairs'] == report['rejected'] == 0
    pair = json.loads((tmp_path/'pairs/pairs.jsonl').read_text())
    assert pair['events'][1] == [1.25, 100/127, 2]
    assert pair['hvo_eligible'] is False
    pattern = json.loads((tmp_path/'pairs/patterns.jsonl').read_text())
    assert len(pattern['raw_events']) == 3 and pattern['gmd_session'] == 'drummer1-session1'


def test_index_export_uses_checkpoint_space_and_source_rows(tmp_path):
    import importlib.util
    cache, plan = inputs(tmp_path)
    run(arguments(cache, plan, tmp_path/'encoder'))
    spec = importlib.util.spec_from_file_location('index_grooves', Path(__file__).parents[1]/'scripts/index_grooves.py')
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    report = module.build(cache, plan, tmp_path/'encoder/best.pt', tmp_path/'index', batch_size=2)
    vectors = np.load(tmp_path/'index/embeddings.npy')
    assert len(vectors) == report['rows']
    np.testing.assert_allclose(np.linalg.norm(vectors, axis=1), 1, atol=1e-6)
    assert report['space'] == 'groove-pretraining-not-tap-aligned'
    metadata = [json.loads(s) for s in (tmp_path/'index/manifest.jsonl').read_text().splitlines()]
    assert all(not r['synthetic'] and r['split'] == 'train' for r in metadata)


def test_resume_settings_and_parent_exclusions(tmp_path):
    cache, plan = inputs(tmp_path)
    args = arguments(cache, plan, tmp_path/'encoder')
    run(args)
    args.epochs = 2; args.resume = tmp_path/'encoder/last.pt'; args.lr *= 2
    with pytest.raises(ValueError, match='identical'):
        run(args)
    metadata = [json.loads(s) for s in (plan/'train-manifest.jsonl').read_text().splitlines()]
    parent = next(r['parent_ids'][0] for r in metadata if not r['synthetic'])
    exclusions = tmp_path/'exclude.json'; exclusions.write_text(json.dumps([parent]))
    clean = arguments(cache, plan, tmp_path/'excluded'); clean.exclude_parents = exclusions
    run(clean)
    with np.load(tmp_path/'excluded/selection.npz') as selected:
        forbidden = {r['split_index'] for r in metadata if parent in r['parent_ids']}
        assert not forbidden.intersection(selected['train'])
