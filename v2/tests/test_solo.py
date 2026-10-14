"""Engineering checks on synthetic fixtures; not real solo/perceptual evidence."""
import copy
import io
import json

import mido
import numpy as np
import pytest

from groove.events import notes_tensor, Note
from groove.solo.data import SourceGroup, SoloPairs, audit_splits, audit_pretraining, hard_negative
from groove.solo.diagnostics import (COMPONENTS, add_onsets, archive_copy_report, diagnose,
                                     hand_views, onset_overlap, tap_attacks)
from groove.solo.features import profile, profile_events, windows, hvo_events, syncopation
from groove.solo.model import FitConfig, LocalCompatibility, fit
from groove.solo.scoring import ConservationScorer
from groove.solo.search import Playability, SearchConfig, search, save_search, mutate
from groove.solo.evaluation import evaluate


def groups():
    rng = np.random.default_rng(191)
    rows = []
    for i in range(6):
        steps = np.sort(rng.choice(32, 9, replace=False))
        events = np.array([(step / 4, .4 + .05 * j, j % 3) for j, step in enumerate(steps)])
        taps = []
        for j in range(2):
            human = events.copy()
            human[:, 2] = np.arange(len(human)) % 2 + 1
            human[:, 1] *= 1 - j * .1
            taps.append(dict(events=human.tolist(), participant=j + 1, split='train', source=f'tap-{i}-{j}'))
        rows.append(SourceGroup(str(i), 'train', events, taps, {f'performance-{i}'}, {f'session-{i}'}, 120.))
    return rows


def validation_groups():
    rows = groups()[:3]
    for i, g in enumerate(rows):
        g.id = str(10 + i)
        g.split = 'validation'
        g.performances, g.sessions = {f'vperf-{i}'}, {f'vsess-{i}'}
        for t in g.taps:
            t['split'] = 'validation'
    return rows


@pytest.fixture(scope='module')
def learned():
    return fit(groups(), FitConfig(motifs=8, iterations=100))


def test_shared_contract_hand_invariance_duplicate_evidence_phase_and_timing():
    events = np.array([[7.99, .6, 1], [.28, .8, 2], [2., .5, 1]])
    p = profile(events)
    assert p[0, 2] == pytest.approx(-.04)
    np.testing.assert_allclose(profile(profile_events(p)), p)
    swapped = events.copy(); swapped[:, 2] = 9 - events[:, 2]
    np.testing.assert_array_equal(profile(swapped), p)
    # The same note appearing through many family pairs must not add evidence.
    np.testing.assert_array_equal(profile(np.tile(events, (10, 1))), p)
    x = windows(p, 8)
    assert not np.array_equal(x, windows(np.roll(p, 4, axis=0), 8))
    flat = p.copy(); flat[:, 2] = 0
    assert not np.array_equal(x, windows(flat, 8))
    hvo = notes_tensor([Note(drum=1, beat=7.99, velocity=.6)])
    assert hvo_events(hvo)[0, 0] == pytest.approx(7.99)


def test_fit_train_only_multi_positive_negative_exclusion_and_determinism(learned):
    original = groups()
    metadata = learned.metadata
    assert len(metadata['positive_pairs']) == 12
    assert all(x['source'] != x['tap_group'] for x in metadata['negatives'])
    contaminated = copy.deepcopy(original); contaminated[0].split = 'validation'
    with pytest.raises(ValueError, match='TRAIN'):
        fit(contaminated)
    contaminated = copy.deepcopy(original); contaminated[0].taps[0]['split'] = 'test'
    with pytest.raises(ValueError, match='Held-out'):
        fit(contaminated)
    # Adding/changing style metadata cannot affect fitted arrays.
    for g in original:
        for t in g.taps:
            t['style'] = 'deliberately-irrelevant'
    again = fit(original, FitConfig(motifs=8, iterations=100))
    for a, b in zip(learned.banks, again.banks):
        for k in a:
            np.testing.assert_array_equal(a[k], b[k])
    np.testing.assert_array_equal(learned.coefficients, again.coefficients)
    same_performance = groups()
    same_performance[1].performances = same_performance[0].performances.copy()
    restricted = fit(same_performance, FitConfig(motifs=2, iterations=2))
    assert not any({n['source'], n['tap_group']} == {'0', '1'} for n in restricted.metadata['negatives'])


def test_scoring_decomposition_and_anti_shortcut_controls(learned):
    source = groups()[0]
    scorer = ConservationScorer(learned, source.events)
    controls = scorer.controls()
    good = scorer.score(source.taps[0]['events'])
    assert good['quality'] > controls['saturated']['quality']
    assert good['quality'] > controls['shifted_beat']['quality']
    assert controls['empty']['quality'] == 0
    assert controls['saturated']['incompatible_additions'] > good['incompatible_additions']
    assert controls['saturated']['density_excess'] > good['density_excess']
    assert sum(w['evidence_weight'] for w in good['local']) == pytest.approx(1)
    expected = (.5 * good['weighted_retention'] + .5 * good['learned_compatibility']
                - .3 * good['incompatible_additions'] - .2 * good['phase_loss']
                - .2 * good['order_loss'] - .25 * good['density_excess'])
    assert good['raw_quality'] == pytest.approx(expected)
    duplicate = ConservationScorer(learned, np.tile(source.events, (10, 1)))
    assert duplicate.score(source.taps[0]['events']) == good


def test_diagnostics_ablation_attacks_and_artificial_views(learned):
    held_out = validation_groups()
    report = diagnose(learned, held_out)
    assert report['human_perceptual_validation'] is False
    assert report['transfer_to_solo_validated'] is False
    assert set(report['ablation']) >= {'full_raw_quality', 'weighted_retention', 'learned_compatibility',
                                       'positive_terms', 'penalty_terms', 'onset_baseline'}
    assert report['ablation']['full_raw_quality']['all']['queries'] == 6
    assert 'mrr' in report['chance']['all']
    aggregate = report['attack_battery']['aggregate']
    assert aggregate['tap_plus_additions']['groups'] == 3
    assert set(aggregate['tap_plus_additions']['mean_component_deltas']) == set(COMPONENTS)
    assert 'outscores_source_copy' in aggregate['reversed']
    assert 'outscores_source_copy' not in aggregate['source_onset_copy']
    for entry in report['attack_battery']['per_group']:
        assert entry['entries']['empty']['raw_quality'] <= 0
        assert entry['entries']['tap_plus_additions']['component_deltas']['density_excess'] >= 0
    # Fixture taps alternate two hands, so every tap yields artificial isolated views.
    probe = report['transfer_probe']
    assert probe['real_solo_ground_truth'] is False
    assert probe['eligible_taps'] == 6
    assert set(probe['metrics']) == {'two_channel_union', 'denser_hand', 'sparser_hand'}
    assert probe['metrics']['two_channel_union']['all']['queries'] == 6
    assert len(report['queries']) == 6 and all(q['rank'] >= 1 for q in report['queries'])
    with pytest.raises(ValueError, match='validation groups only'):
        diagnose(learned, groups()[:2])
    overlap = validation_groups()
    overlap[0].id = '0'
    with pytest.raises(ValueError, match='fitted'):
        diagnose(learned, overlap)
    assert diagnose(learned, [])['status'] == 'no_validation_groups'


def test_diagnostic_attack_and_view_constructors():
    p = np.zeros((32, 3))
    p[[0, 8, 16], :] = (1, .6, .1)
    support = np.linspace(1, 0, 32)
    attacked = add_onsets(p, support, 3)
    assert attacked[:, 0].sum() == 6
    assert ((attacked - p)[:, 0] >= 0).all()  # inflation never removes existing onsets
    np.testing.assert_array_equal(attacked[[0, 8, 16]], p[[0, 8, 16]])
    # Least-supported silent steps are occupied first.
    assert attacked[[29, 30, 31], 0].all()
    attacks = tap_attacks(p, support)
    assert (attacks['tap_quantized_timing'][:, 2] == 0).all()
    flat = attacks['tap_flat_velocity']
    assert (flat[flat[:, 0] > 0, 1] == .8).all()
    assert attacks['tap_plus_additions'][:, 0].sum() == 5  # ceil(3/2) added
    assert hand_views([[0., .8, 1]]) is None
    assert hand_views([]) is None
    v = hand_views([[0., .8, 1], [1., .6, 2], [2., .5, 2]])
    assert len(v['denser_hand']) == 2 and len(v['sparser_hand']) == 1
    assert (v['denser_hand'][:, 2] == 2).all() and (v['sparser_hand'][:, 2] == 1).all()


def test_search_time_copy_diagnostics():
    source = np.zeros((32, 3))
    source[[0, 4, 8, 12], :] = (1, .8, 0)
    exact = source.copy()
    partial = np.zeros((32, 3))
    partial[[0, 4, 2], :] = (1, .8, 0)  # two of three onsets copied
    assert onset_overlap(exact, source) == dict(precision=1., recall=1., jaccard=1.)
    overlap = onset_overlap(partial, source)
    assert overlap['precision'] == pytest.approx(2 / 3)
    assert overlap['recall'] == pytest.approx(.5)
    assert overlap['jaccard'] == pytest.approx(2 / 5)
    archive = [dict(cell=[0, 0], genome=exact.tolist(), score=dict(raw_quality=.9)),
               dict(cell=[1, 0], genome=partial.tolist(), score=dict(raw_quality=.4))]
    report = archive_copy_report(archive, source, best_human_raw=.7, source_copy_raw=.9)
    assert report['elites'] == 2
    assert report['precision_of_best'] == 1.
    assert report['max_jaccard'] == 1.
    assert report['best_exceeds_best_human'] is True
    assert report['quality_precision_correlation'] is None  # fewer than three elites
    assert report['source_onset_density'] == pytest.approx(4 / 32)
    assert archive_copy_report([], source, None, .5) == dict(elites=0)
    assert archive_copy_report(archive, source, None, .9)['best_exceeds_best_human'] is None


def test_feature_flags_onset_term_and_microtiming_exploit_closure(tmp_path):
    rows = groups()
    with pytest.raises(ValueError, match='feature configuration'):
        FitConfig(onset_term='bogus').validate()
    model = fit(rows, FitConfig(motifs=4, iterations=50, offset_channel=False, onset_term='source'))
    assert model.features == dict(offset_channel=False, onset_term='source')
    assert model.banks[0]['mean'].shape[0] == 4 * 5  # offset channel absent
    path = tmp_path / 'model'
    model.save(path)
    assert LocalCompatibility.load(path).features == model.features
    # Cards predating feature flags are exactly the v1 configuration.
    card_file = path / 'model.json'
    card = json.loads(card_file.read_text())
    card.pop('features')
    card_file.write_text(json.dumps(card))
    assert LocalCompatibility.load(path).features == dict(offset_channel=True, onset_term='none')
    scorer = ConservationScorer(model, rows[0].events)
    copy = scorer.score(profile_events(profile(rows[0].events)))
    assert copy['score_version'] == 'conservation-v2'
    assert copy['onset_alignment'] == pytest.approx(1)  # source term is maximal for a copy
    events = np.array(rows[0].taps[0]['events'], dtype=float)
    events[:, 0] += .05  # nonzero microtiming within the sixteenth
    good = scorer.score(events)
    expected = (.35 * good['weighted_retention'] + .35 * good['learned_compatibility']
                + .3 * good['onset_alignment'] - .3 * good['incompatible_additions']
                - .2 * good['phase_loss'] - .2 * good['order_loss'] - .25 * good['density_excess'])
    assert good['raw_quality'] == pytest.approx(expected)
    # Without the offset channel, zeroing microtiming cannot change any term.
    quantized = profile(events)
    quantized[:, 2] = 0
    assert scorer.score(profile_events(quantized))['raw_quality'] == pytest.approx(good['raw_quality'])
    hybrid = fit(rows, FitConfig(motifs=4, iterations=50, onset_term='expected'))
    with_expected = ConservationScorer(hybrid, rows[0].events).score(events)
    assert with_expected['onset_term'] == 'expected'
    assert 0 <= with_expected['onset_alignment'] <= 1
    assert ConservationScorer(hybrid, rows[0].events).score(np.empty((0, 3)))['onset_alignment'] == 0


def test_checkpoint_roundtrip_integrity_and_no_overwrite(tmp_path, learned):
    path = tmp_path / 'model'
    learned.save(path)
    restored = LocalCompatibility.load(path)
    x = profile(groups()[0].events)
    np.testing.assert_array_equal(learned.pair_features(x, x), restored.pair_features(x, x))
    assert learned.compatibility(learned.pair_features(x, x)) == restored.compatibility(restored.pair_features(x, x))
    with pytest.raises(FileExistsError):
        learned.save(path)
    with (path / 'model.npz').open('ab') as f:
        f.write(b'corrupt')
    with pytest.raises(ValueError, match='Changed'):
        LocalCompatibility.load(path)


def test_tempo_technique_and_boundary_constraints():
    limits = Playability(min_interval_ms=90)
    boundary = [[.01, .8, 0], [7.99, .8, 0]]
    assert not limits.check(boundary, 120)['feasible']
    sixteenths = [[0., .8, 0], [.25, .8, 0]]
    assert limits.check(sixteenths, 120)['feasible']
    assert not limits.check(sixteenths, 240)['feasible']
    assert Playability(technique='stick').check(sixteenths, 180)['feasible']
    assert not Playability(technique='finger').check(sixteenths, 180)['feasible']
    assert not limits.check([[0, .8, 0], [0, .5, 0]], 120)['feasible']
    assert not limits.check([[0, .8, 0], [2, .5, 1]], 120)['feasible']
    with pytest.raises(ValueError):
        limits.check(sixteenths, float('nan'))


def test_defined_cyclic_syncopation():
    assert syncopation([]) == 0
    assert syncopation([[i, .8, 0] for i in range(8)]) == 0
    assert syncopation([[7.75, .8, 0]]) == 1  # strongest rest across loop
    assert syncopation([[7.75, .8, 0], [0., .8, 0]]) == 0


def test_mutations_search_budget_evolution_repeatability_and_midi(tmp_path, learned):
    scorer = ConservationScorer(learned, groups()[0].events)
    cfg = SearchConfig(seed=8, budget=64, initial_random=4, microtiming=False,
                       playability=Playability(min_interval_ms=20, max_hits_per_second=100))
    a = search(scorer, 'fixture', 120., cfg)
    assert a == search(scorer, 'fixture', 120., cfg)
    b = search(scorer, 'fixture', 120., cfg, 'random')
    assert a['evaluations'] == b['evaluations'] == 64
    assert any(r['parent'] is not None for r in a['history'])
    assert all(r['parent'] is None for r in b['history'])
    for row in a['history']:
        if row['parent'] is not None:
            assert row['parent'] < row['iteration']
            assert a['history'][row['parent']]['accepted']
    assert a['history'][:4] == b['history'][:4]
    assert {r['operation'] for r in a['history']} >= {'add', 'delete', 'shift', 'velocity'}
    for elite in a['archive']:
        eligible = [r for r in a['history'] if r['cell'] == elite['cell'] and r['constraints']['feasible']]
        assert elite['score']['quality'] == max(r['score']['quality'] for r in eligible)
    path = tmp_path / 'search'
    save_search(a, path)
    assert len(list(path.glob('*.mid'))) == len(a['archive']) > 0
    for midi in path.glob('*.mid'):
        clip = mido.MidiFile(file=io.BytesIO(midi.read_bytes()))
        notes = [m for m in clip.tracks[0] if m.type == 'note_on']
        assert {m.note for m in notes} == {38}
        assert {m.channel for m in notes} == {9}
        assert sum(m.time for m in clip.tracks[0]) == 8 * 960
    assert len((path / 'evaluations.jsonl').read_text().splitlines()) == cfg.budget
    with pytest.raises(FileExistsError):
        save_search(a, path)
    with pytest.raises(ValueError):
        search(scorer, 'x', 120, SearchConfig(budget=0))


def test_hard_negative_tempo_density_and_no_style_dependency():
    a, b = groups()[:2]
    assert hard_negative(a, b)
    b.bpm = 180
    assert not hard_negative(a, b)
    b.bpm = 120; b.events = b.events[:2]
    assert not hard_negative(a, b)
    b.bpm = None
    assert not hard_negative(a, b)


def test_audit_known_identity_leak_and_pretraining_partial_coverage(tmp_path):
    patterns = [dict(source=f'source-{i}', source_sha256=f'hash-{i}', gmd_performance=f'p{i}',
        gmd_session=f's{i}', hvo_hash=f'hvo-{i}', pattern_id=str(i), split=s,
        raw_events=[[float(i), .8, 0]]) for i, s in enumerate(('train', 'validation'))]
    assert audit_splits(patterns, [])['identity_split_check'] == 'passed'
    bad = copy.deepcopy(patterns); bad[1]['gmd_performance'] = 'p0'
    with pytest.raises(ValueError, match='performance crosses'):
        audit_splits(bad, [])
    path = tmp_path / 'manifest.jsonl'
    path.write_text(json.dumps(dict(split='train', hash='hvo-1')) + '\n')
    result = audit_pretraining(patterns, path)
    assert result['status'] == 'overlap_detected'
    assert result['coverage'] == 'partial'
    assert result['matches'][0]['pair_split'] == 'validation'
    assert audit_pretraining(patterns)['status'] == 'not_provided'


def test_real_adapter_cli_fit_eval_search_without_test_encoding(tmp_path):
    # Existing v2 synthetic MIDI fixture exercises its actual TapTamDrum adapter.
    from test_alignment_training import fixture
    pairs, _ = fixture(tmp_path)
    corpus = SoloPairs(pairs)
    # Raw event path includes the collision-heavy source that HVO alignment excludes.
    assert len(corpus.split('train')) == 6
    from groove.solo.cli import parser, run
    out = tmp_path / 'fit'
    args = parser().parse_args(['fit', '--pairs', str(pairs), '--out', str(out),
                               '--motifs', '2', '--iterations', '2'])
    report = run(args)
    model = LocalCompatibility.load(out / 'model')
    assert report['human_taps'] == 12
    assert report['metrics']['conservation']['all']['queries'] == 12
    assert report['full_to_human_multi_positive']['queries'] == 3
    with pytest.raises(ValueError, match='test remains frozen'):
        evaluate(model, corpus.split('test'))
    with pytest.raises(ValueError, match='only'):
        fit(corpus.split('train') + corpus.split('validation'))
    result = run(parser().parse_args(['search', '--pairs', str(pairs), '--model', str(out / 'model'),
        '--out', str(tmp_path / 'search'), '--limit', '1', '--budget', '16', '--initial-random', '4',
        '--quantized', '--fixed-velocity']))
    assert len(result['results']) == 2
    assert {r['evaluations'] for r in result['results']} == {16}
    assert result['transfer_to_solo_validated'] is False
    assert all(set(r['copy']) >= {'mean_precision', 'precision_of_best', 'best_exceeds_best_human'}
               for r in result['results'])
    searched = next((tmp_path / 'search').glob('source-*'))
    assert (searched / 'map_elites-copy-analysis.json').exists()
    assert (searched / 'random-copy-analysis.json').exists()
    diag = run(parser().parse_args(['diagnose', '--pairs', str(pairs), '--model', str(out / 'model'),
        '--out', str(tmp_path / 'diag')]))
    assert diag['test_evaluated'] is False
    assert diag['attack_battery']['aggregate']['source_onset_copy']['groups'] == 3
    assert (tmp_path / 'diag' / 'report.json').exists()
    assert len((tmp_path / 'diag' / 'diagnostic-queries.jsonl').read_text().splitlines()) == 12
    with pytest.raises(FileExistsError):
        run(parser().parse_args(['diagnose', '--pairs', str(pairs), '--model', str(out / 'model'),
            '--out', str(tmp_path / 'diag')]))
    report2 = run(parser().parse_args(['fit', '--pairs', str(pairs), '--out', str(tmp_path / 'fit-v2'),
        '--motifs', '2', '--iterations', '2', '--no-offset-channel', '--onset-term', 'expected']))
    assert report2['metrics']['conservation']['all']['queries'] == 12
    assert LocalCompatibility.load(tmp_path / 'fit-v2' / 'model').features == dict(
        offset_channel=False, onset_term='expected')


def test_velocity_and_microtiming_mutations_keep_v2_bounds():
    cfg = SearchConfig(max_offset=.45)
    rng = np.random.default_rng(7)
    p = np.tile([1., .8, 0.], (32, 1))
    operations = set()
    for _ in range(300):
        p, operation = mutate(p, rng, cfg)
        operations.add(operation)
        assert np.isin(p[:, 0], [0, 1]).all()
        assert (p[p[:, 0] == 0] == 0).all()
        assert abs(p[:, 2]).max() <= .45
        assert (p[p[:, 0] > 0, 1] > 0).all()
        np.testing.assert_allclose(profile(profile_events(p)), p, atol=1e-13)
    assert operations == {'add', 'delete', 'shift', 'velocity', 'microtiming'}
