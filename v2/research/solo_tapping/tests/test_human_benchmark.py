import csv
import json
import pickle

import mido
import numpy as np
import pytest

from research.solo_tapping.human_benchmark import data
from research.solo_tapping.human_benchmark.benchmark import (
    assert_disjoint, plan_folds, response_loss, shuffled_records, tie_metrics,
)
from research.solo_tapping.human_benchmark.models import descriptors, fit, local_windows
from research.solo_tapping.human_benchmark.source import fetch


def fixture_pairs():
    sources, records = [], []
    for sid in range(8):
        counts = np.zeros((16, 3), int)
        counts[(np.arange(0, 16, 4) + sid) % 16, sid % 3] = 1
        counts[(sid * 3 + 1) % 16, (sid + 1) % 3] += 1
        sources.append(dict(id=sid, group=f'parent-{sid // 2}', counts=counts.tolist()))
        for person in range(8):
            v = (counts.sum(1) > 0) * (.4 + person / 30)
            records.append(dict(id=f'{sid}-{person}', source_id=sid, participant=f'p{person}',
                session=f'd{person // 2}', role='primary', velocity=v.tolist(), hit=(v > 0).tolist()))
    return sources, records


def test_split_before_local_windows_and_both_axes():
    sources, records = fixture_pairs()
    primary, plans = plan_folds(sources, records, folds=2, seed=7)
    assert len(plans) == 8
    groups = {s['id']: s['group'] for s in sources}
    for plan in plans:
        assert_disjoint(plan, primary, groups)
    crossed = next(p for p in plans if p['regime'] == 'crossed')
    assert len(crossed['train']) + len(crossed['test']) < len(records)
    broken = dict(crossed, train=crossed['train'] + crossed['test'][:1])
    with pytest.raises(ValueError, match='Trial leakage'):
        assert_disjoint(broken, primary, groups)


def test_pure_meter_and_known_fwod_weights():
    a = np.zeros((16, 3), int)
    a[0, 0] = 1
    a[1, 1] = 1
    a[2, 2] = 1
    b = np.roll(a, 3, axis=0)
    np.testing.assert_equal(descriptors(a)[:, 0], descriptors(b)[:, 0])
    np.testing.assert_allclose(descriptors(a)[:3, 2], [1, 2/3, 1/3])
    np.testing.assert_equal(descriptors(a)[:3, 1], [1, 1, 1])
    assert not np.array_equal(local_windows(a, 4), local_windows(b, 4))
    np.testing.assert_equal(local_windows(a, 4)[0].reshape(4, 2), descriptors(a)[[14, 15, 0, 1], 1:])


def test_train_only_dictionary_reproducibility_and_real_response_fit():
    sources, records = fixture_pairs()
    primary, plans = plan_folds(sources, records, folds=2)
    plan = next(p for p in plans if p['regime'] == 'crossed')
    train = [primary[i] for i in plan['train']]
    selected = [s for s in sources if s['id'] in {t['source_id'] for t in train}]
    model = fit(selected, train, 'shapelet', motifs=4, seed=3)
    again = fit(selected, train, 'shapelet', motifs=4, seed=3)
    assert model.serialize() == again.serialize()
    assert model.metadata['fit_diagnostics']['converged']
    for bank in model.banks:
        assert {e['source_id'] for e in bank['exemplars']} <= set(model.metadata['train_sources'])
    assert not set(model.metadata['train_participants']) & {primary[i]['participant'] for i in plan['test']}
    # The learned heads must capture source-dependent onset locations in this fixture.
    model = fit(sources, records, 'fwod')
    constant = fit(sources, records, 'constant')
    source = sources[0]
    target = records[0]['velocity']
    good = response_loss(target, *model.predict(source['counts']), model.sigma)
    bad = response_loss(target, *constant.predict(source['counts']), constant.sigma)
    assert good['brier'] < bad['brier']
    with pytest.raises(ValueError, match='primary'):
        fit(selected, [dict(train[0], role='retest')], 'meter')


def test_shuffled_control_preserves_person_and_excludes_related_source():
    sources, records = fixture_pairs()
    shuffled, mapping = shuffled_records(records, sources, 4)
    groups = {s['id']: s['group'] for s in sources}
    lookup = {(t['source_id'], t['participant']): t for t in records}
    for a, b in zip(records, shuffled):
        assert a['participant'] == b['participant']
        assert groups[a['source_id']] != groups[mapping[a['source_id']]]
        assert b['velocity'] == lookup[mapping[a['source_id']], a['participant']]['velocity']


def test_ties_are_chance_and_empty_tap_has_no_fake_velocity_error():
    result = tie_metrics([0., 0., 0., 0.], 2)
    assert result['retrieval_r1'] == .25
    assert result['retrieval_mrr'] == result['chance_mrr']
    assert tie_metrics([0., 1., 0.], 1)['retrieval_mrr'] == 1
    result = response_loss(np.zeros(16), np.ones(16) * .2, np.ones(16) * .5, .1)
    assert result['velocity_mae'] is None


def test_complete_benchmark_artifacts_and_fold_provenance(tmp_path, monkeypatch):
    from research.solo_tapping.human_benchmark import benchmark
    from research.solo_tapping.human_benchmark.source import digest
    sources, records = fixture_pairs()
    monkeypatch.setattr(benchmark, 'load', lambda _: (sources, records, 'fixture'))
    (tmp_path / 'audit.json').write_text(json.dumps({'limitations': ['synthetic fixture']}))
    out = tmp_path / 'run'
    summary = benchmark.run(tmp_path, out, folds=2, motifs=2, bootstrap=16)
    completed = json.loads((out / 'completed.json').read_text())
    assert completed['fitted_models'] == 80
    assert completed['prediction_rows'] == len(records) * 3 * 10
    assert json.loads((out / 'run.json').read_text())['status'] == 'complete'
    for name, sha in completed['files'].items():
        assert digest((out / name).read_bytes()) == sha
    for regime in summary['results'].values():
        assert regime['meter']['retrieval_mrr'] == pytest.approx(regime['meter']['chance_mrr'])
    with pytest.raises(FileExistsError):
        benchmark.run(tmp_path, out, folds=2)


def test_midi_contract_and_no_executable_pickle(tmp_path):
    mapping = {36: ['kick', 'low', 36], 38: ['snare', 'mid', 38]}
    midi = mido.MidiFile(ticks_per_beat=960)
    track = mido.MidiTrack()
    midi.tracks.append(track)
    track.extend([mido.Message('note_on', note=36, velocity=100, channel=0, time=0),
                  mido.Message('note_on', note=38, velocity=0, time=240),
                  mido.MetaMessage('end_of_track', time=3600)])
    path = tmp_path / 'source.mid'
    midi.save(path)
    counts, events = data.read_midi(path, mapping)
    assert counts.sum() == 1 and events[0]['channel'] == 0
    assert events[0]['velocity'] == 100 / 127
    path = tmp_path / 'evil.pkl'
    path.write_bytes(pickle.dumps(eval))
    with pytest.raises(ValueError, match='globals'):
        data.primitive_patterns(path)
    with pytest.raises(ValueError, match='checksum'):
        fetch(tmp_path / 'download', archive=path)
    assert not (tmp_path / 'download').exists()


def test_keyed_audit_quarantines_mismatch_and_missing_source(tmp_path, monkeypatch):
    """End-to-end synthetic upstream fixture, with shuffled presentation order."""
    source = tmp_path / 'source'
    (source / 'data').mkdir(parents=True)
    (source / 'midi/_MIDI+samples').mkdir(parents=True)
    mapping = {36: ['kick', 'low', 36]}
    for name in ('functions.py', 'descriptors.py'):
        (source / name).write_text(f'GM_dict = {mapping!r}\n')
    patterns = [[[1]] + [[] for _ in range(15)] for _ in range(max(data.ORDER) + 1)]
    (source / 'data/patterns.pkl').write_bytes(pickle.dumps(patterns))
    for sid in data.ORDER:
        midi = mido.MidiFile(ticks_per_beat=960)
        track = mido.MidiTrack()
        midi.tracks.append(track)
        track.extend([mido.Message('note_on', note=36, velocity=127),
                      mido.MetaMessage('end_of_track', time=3840)])
        # Also test a plausible wrong crop with the same onset mask.
        crop = 2 if sid == 1043 else 1
        midi.save(source / f'midi/_MIDI+samples/1--{sid}_pattern{crop}.mid')
        midi.save(source / f'midi/parent{sid}.mid')
    rows, ordered, raw = [], [], []
    rng = np.random.default_rng(12)
    for block in range(43):
        # All primary takes differ, so a positional join cannot pass accidentally.
        tap = {sid: rng.uniform(.1, 1, 16).tolist() for sid in data.ORDER}
        sequence = list(data.ORDER + data.CONTROLS)
        rng.shuffle(sequence)
        for sid in sequence:
            support = [1.] + [0.] * 15
            if sid == 143:
                support = [0., 1.] + [0.] * 14  # quarantined source
            rows.append(['2023-10-11', '12:00:00', sid, f'parent{sid}_1',
                         *tap[sid], *support, *([0] * 50)])
        values = [v for sid in data.ORDER + data.CONTROLS for v in tap[sid]]
        ordered.append(values)
        raw.append(values[:256])
    # One whole block has an unresolvable repeat/missing pattern.
    block = rows[18:36]
    next(row for row in block if row[2] == 912)[2] = 143
    def write_csv(path, values):
        with path.open('w') as f:
            csv.writer(f).writerows(values)
    write_csv(source / 'data/tapexplore.csv', [['TIME', 'DATE', 'NAME']] + rows)
    write_csv(source / 'data/raw_subjects.csv', raw)
    write_csv(source / 'data/patterns_by_subject_[ORDERED].csv', ordered)
    # Retain a consistent source NAME on the deliberately malformed ID row.
    rows[18:36][next(i for i, row in enumerate(block) if row[2] == 143 and row[3] == 'parent912_1')][3] = 'parent143_1'
    write_csv(source / 'data/tapexplore.csv', [['TIME', 'DATE', 'NAME']] + rows)
    monkeypatch.setattr(data, 'verify', lambda _: {'revision': 'fixture'})
    out = tmp_path / 'prepared'
    report = data.prepare(source, out)
    assert report['sources_accepted'] == 14
    assert report['primary_pairs'] == 42 * 14
    assert report['retest_pairs'] == 84
    sources, records, fingerprint = data.load(out)
    assert len(fingerprint) == 64
    assert not any(t['source_id'] in (143, 1043) or t['participant'] == 'block-01' for t in records)
    (out / 'records.json').write_text('[]')
    with pytest.raises(ValueError, match='Changed'):
        data.load(out)
