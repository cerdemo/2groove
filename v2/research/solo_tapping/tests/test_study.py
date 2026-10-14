"""Engineering checks for the blinded listening study; not human evidence."""
import json

from fastapi.testclient import TestClient
import pytest

from groove.representation.taptam import prepare_pairs
from research.solo_tapping.cli import parser, run
from research.solo_tapping.data import SoloPairs
from research.solo_tapping.model import FitConfig, fit
from research.solo_tapping.server import Workspace, create_app
from research.solo_tapping.study import Study, build_study, study_report
from test_explorer import midi_payload

BLIND_TOKENS = ('human', 'elite', 'copy', 'even', 'random', 'role', 'provenance', 'participant')


@pytest.fixture(scope='module')
def workspace(tmp_path_factory):
    root = tmp_path_factory.mktemp('solo-study')
    import hashlib
    sessions = {}
    for i in range(100):
        session = f'drummer{i}-session1'
        n = int(hashlib.sha256(f'42:{session}'.encode()).hexdigest()[:8], 16) % 100
        sessions.setdefault('train' if n < 80 else 'validation' if n < 90 else 'test', session)
    for i, split in enumerate(['train'] * 4 + ['validation', 'validation', 'test']):
        folder = root / 'raw' / (f'[{i+1:03d} P1] {sessions[split]}-{i}_funk_120_beat'
                                 '_4-4_best_2bar_segment_0')
        folder.mkdir(parents=True)
        events = [(0, 36, 99), (.3 + i * .09, 42, 80), (2 + i * .2, 38, 100), (6 + i * .13, 36, 90)]
        (folder / 'original.mid').write_bytes(midi_payload(events))
        for person in (1, 2):
            taps = [(b, 76 + j % 2, v - person) for j, (b, _, v) in enumerate(events)]
            (folder / f'Participant_{person}_simple.mid').write_bytes(midi_payload(taps))
    prepare_pairs(root / 'raw', root / 'pairs')
    corpus = SoloPairs(root / 'pairs')
    model = fit(corpus.split('train'), FitConfig(motifs=2, iterations=4), corpus.fingerprint)
    model.save(root / 'model')
    run(parser().parse_args(['search', '--pairs', str(root / 'pairs'), '--model', str(root / 'model'),
        '--out', str(root / 'search'), '--split', 'validation', '--budget', '48',
        '--initial-random', '8', '--min-interval-ms', '20', '--max-hits-per-second', '100',
        '--quantized', '--fixed-velocity']))
    card = build_study(corpus, root / 'search', root / 'study', seed=5, max_sources=2)
    return dict(root=root, corpus=corpus, card=card)


def test_build_blinding_determinism_and_validation_only(workspace, tmp_path):
    root, corpus = workspace['root'], workspace['corpus']
    card = workspace['card']
    assert card['sources'] == 2 and card['trials'] >= 10
    assert card['test_evaluated'] is False
    for name in ('stimuli', 'trials'):
        text = (root / 'study' / f'{name}.json').read_text()
        assert not any(f'"{token}"' in text for token in BLIND_TOKENS), name
    key = json.loads((root / 'study' / 'key.json').read_text())
    stimuli = json.loads((root / 'study' / 'stimuli.json').read_text())
    trials = json.loads((root / 'study' / 'trials.json').read_text())
    assert set(key['stimuli']) == set(stimuli)
    roles = {v['role'] for v in key['stimuli'].values()}
    assert roles >= {'source', 'human', 'elite_best', 'random_best', 'copy', 'even'}
    retests = [t for t in key['trials'].values() if t['retest_of']]
    assert len(retests) == 2 and all(t['pair_type'] == 'elite_vs_human' for t in retests)
    assert all(stimuli[t['a']]['kind'] == stimuli[t['b']]['kind'] == 'solo' for t in trials)
    again = build_study(corpus, root / 'search', tmp_path / 'again', seed=5, max_sources=2)
    for name in ('stimuli', 'trials', 'key'):
        assert ((tmp_path / 'again' / f'{name}.json').read_text()
                == (root / 'study' / f'{name}.json').read_text())
    run(parser().parse_args(['search', '--pairs', str(root / 'pairs'), '--model', str(root / 'model'),
        '--out', str(tmp_path / 'train-search'), '--split', 'train', '--limit', '1',
        '--budget', '16', '--initial-random', '4', '--quantized', '--fixed-velocity']))
    with pytest.raises(ValueError, match='validation'):
        build_study(corpus, tmp_path / 'train-search', tmp_path / 'bad', seed=5)


def test_study_endpoints_canonical_mapping_and_consent(workspace, tmp_path):
    root = workspace['root']
    study_dir = tmp_path / 'live-study'
    build_study(workspace['corpus'], root / 'search', study_dir, seed=5, max_sources=2)
    w = Workspace(root / 'pairs', root / 'model', tmp_path / 'runs', tmp_path / 'gmd-absent',
                  tmp_path / 'historical', study=study_dir)
    with TestClient(create_app(w)) as client:
        info = client.get('/api/study').json()
        assert info['configured'] and info['responses'] == 0
        assert client.get('/study').status_code == 200
        manifest = client.get('/api/study/manifest?participant=alice').json()
        assert manifest == client.get('/api/study/manifest?participant=alice').json()
        assert not any(token in json.dumps(manifest) for token in ('"role"', 'provenance', 'pair_type'))
        assert {t['trial'] for t in manifest['trials']} == {t['id'] for t in w.study.trials}
        assert client.get('/api/study/manifest?participant=x').status_code == 400
        first = manifest['trials'][0]
        index, canonical = next((i, t) for i, t in enumerate(w.study.trials)
                                if t['id'] == first['trial'])
        flip = bool(w.study.arrangement('alice')[1][index])
        assert first['first'] == (canonical['b'] if flip else canonical['a'])
        body = dict(participant='alice', session='s1', trial=first['trial'], choice='first',
                    confidence='clear', consent=True)
        assert client.post('/api/study/respond', json=dict(body, consent=False)).status_code == 400
        assert client.post('/api/study/respond',
                           json=dict(body, trial='t0000missing')).status_code == 400
        row = client.post('/api/study/respond', json=body).json()
        assert row['choice'] == ('b' if flip else 'a')
        assert row['presented_first'] == row['choice']
        stored = w.study.responses()
        assert len(stored) == 1 and stored[0]['participant'] == 'alice'
        resumed = client.get('/api/study/manifest?participant=alice').json()
        assert resumed['answered'] == [first['trial']]
    bare = Workspace(root / 'pairs', root / 'model', tmp_path / 'runs2', tmp_path / 'gmd-absent2')
    with TestClient(create_app(bare)) as client:
        assert not client.get('/api/study').json()['configured']
        assert client.get('/api/study/manifest?participant=alice').status_code == 409


def test_report_win_rates_retest_anchors_and_integrity(workspace, tmp_path):
    root = workspace['root']
    study_dir = tmp_path / 'report-study'
    build_study(workspace['corpus'], root / 'search', study_dir, seed=5, max_sources=2)
    study = Study(study_dir)
    assert study_report(study_dir)['status'] == 'no_responses'
    for participant, canonical in (('alice', 'a'), ('bob', 'b')):
        _, flips = study.arrangement(participant)
        for index, trial in enumerate(study.trials):
            presented_first = 'b' if flips[index] else 'a'
            choice = 'first' if presented_first == canonical else 'second'
            study.record(participant, 's', trial['id'], choice, 'slight', False, False, 0, 10, True)
    report = study_report(study_dir, bootstrap=50)
    assert report['responses'] == 2 * len(study.trials)
    for values in report['pair_types'].values():
        assert values['first_win_rate'] == pytest.approx(.5)
        assert values['participants'] == 2
    assert report['retest']['agreement'] == 1.
    assert report['anchor_human_vs_even'] == {'alice': 1., 'bob': 0.}
    assert all(v['rate'] == 0 for v in report['unplayable_rate_by_role'].values())
    with pytest.raises(ValueError, match='Consent'):
        study.record('alice', 's', study.trials[0]['id'], 'first', 'clear', False, False, 0, 0, False)
    out = tmp_path / 'report.json'
    run(parser().parse_args(['study-report', '--study', str(study_dir), '--out', str(out)]))
    assert json.loads(out.read_text())['status'] == 'exploratory_listening_report'
    with pytest.raises(ValueError, match='fresh'):
        run(parser().parse_args(['study-report', '--study', str(study_dir), '--out', str(out)]))
    stimuli = study_dir / 'stimuli.json'
    stimuli.write_text(stimuli.read_text() + ' ')
    with pytest.raises(ValueError, match='changed'):
        Study(study_dir)
