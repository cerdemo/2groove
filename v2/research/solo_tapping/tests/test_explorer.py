"""Synthetic engineering checks. These do not validate musical perception."""
import csv
import hashlib
import io
import json
import threading
import time

from fastapi.testclient import TestClient
import mido
import numpy as np
import pytest

from groove.representation.taptam import prepare_pairs
from research.solo_tapping.data import SoloPairs
from research.solo_tapping.model import FitConfig, fit
from research.solo_tapping.scoring import ConservationScorer
from research.solo_tapping.search import SearchConfig, mutate, search
from research.solo_tapping.server import Workspace, create_app, export_midi, read_crop


def midi_payload(events, length=8, meter=True, channel=9, tempo_change=False):
    clip = mido.MidiFile(ticks_per_beat=960)
    track = mido.MidiTrack(); clip.tracks.append(track)
    track.append(mido.MetaMessage('set_tempo', tempo=500000))
    if meter:
        track.append(mido.MetaMessage('time_signature', numerator=4, denominator=4))
    messages = [(round(b*960), mido.Message('note_on', channel=channel, note=n, velocity=v))
                for b, n, v in events]
    if tempo_change:
        messages.append((3*960, mido.MetaMessage('set_tempo', tempo=600000)))
    previous = 0
    for tick, msg in sorted(messages, key=lambda x: x[0]):
        track.append(msg.copy(time=tick-previous)); previous = tick
    track.append(mido.MetaMessage('end_of_track', time=length*960-previous))
    buffer = io.BytesIO(); clip.save(file=buffer)
    return buffer.getvalue()


@pytest.fixture(scope='module')
def artifacts(tmp_path_factory):
    root = tmp_path_factory.mktemp('solo-explorer')
    sessions = {}
    for i in range(100):
        session = f'drummer{i}-session1'
        n = int(hashlib.sha256(f'42:{session}'.encode()).hexdigest()[:8], 16) % 100
        sessions.setdefault('train' if n < 80 else 'validation' if n < 90 else 'test', session)
    for i, split in enumerate(['train']*4 + ['validation', 'test']):
        folder = root/'raw'/f'[{i+1:03d} P1] {sessions[split]}-{i}_funk_120_beat_4-4_best_2bar_segment_0'
        folder.mkdir(parents=True)
        events = [(0, 36, 99), (.3+i*.09, 42, 80), (2+i*.2, 38, 100), (6+i*.13, 36, 90)]
        (folder/'original.mid').write_bytes(midi_payload(events))
        for person in (1, 2):
            taps = [(b, 76+j%2, v-person) for j, (b, _, v) in enumerate(events)]
            (folder/f'Participant_{person}_simple.mid').write_bytes(midi_payload(taps))
    prepare_pairs(root/'raw', root/'pairs')
    corpus = SoloPairs(root/'pairs')
    model = fit(corpus.split('train'), FitConfig(motifs=2, iterations=4), corpus.fingerprint)
    model.save(root/'model')
    (root/'gmd').mkdir()
    (root/'gmd/performance.mid').write_bytes(midi_payload([(0, 36, 90), (4.1, 42, 80), (8.05, 38, 100), (12, 36, 90)], length=16))
    with (root/'gmd/info.csv').open('w') as stream:
        fields = ['midi_filename', 'time_signature', 'split', 'bpm', 'duration']
        writer = csv.DictWriter(stream, fieldnames=fields); writer.writeheader()
        for split in ('train', 'test'):
            writer.writerow(dict(zip(fields, ['performance.mid', '4-4', split, 120, 8])))
    return root


@pytest.fixture
def explorer(artifacts, tmp_path):
    w = Workspace(artifacts/'pairs', artifacts/'model', tmp_path/'runs', artifacts/'gmd', tmp_path/'historical')
    with TestClient(create_app(w)) as client:
        yield client, w


def finish_job(client, key):
    deadline = time.monotonic()+10
    while time.monotonic() < deadline:
        job = client.get('/api/jobs/'+key).json()
        if job['status'] != 'running':
            return job
        time.sleep(.01)
    pytest.fail('Search did not finish within ten seconds')


def test_real_pair_routes_frozen_test_and_shapelet_provenance(explorer):
    client, w = explorer
    assert client.get('/').status_code == 200
    assert client.get('/web/app.js').status_code == 200
    assert client.get('/api/info').json()['model_ready']
    sources = client.get('/api/sources').json()
    assert {s['split'] for s in sources} == {'train', 'validation'}
    assert len(sources) == 5
    frozen = w.corpus.split('test')[0].id
    assert client.get('/api/sources/'+frozen).status_code == 404
    assert client.post('/api/search', json=dict(source_id=frozen, bpm=120)).status_code == 404
    source = client.get('/api/sources/'+sources[0]['id']).json()
    assert len(source['taps']) == 2
    assert {e[2] for e in source['taps'][0]['events']} == {1, 2}
    result = client.post('/api/inspect', json=dict(source_id=source['id'], width=16, start=7,
        events=[[.1, .7, 0], [7.8, .8, 0]])).json()
    assert len(result['candidate_window']) == 16  # cyclic wrap
    assert sum(x['evidence_weight'] for x in result['score']['local']) == pytest.approx(1)
    for motif in result['motifs']:
        assert motif['exemplar']['group'] in w.model.metadata['train_groups']
        assert len(motif['source_profile']) == len(motif['tap_profile']) == 16


def test_import_gmd_crop_never_fabricates_human_pairs(explorer):
    client, w = explorer
    assert len(client.get('/api/gmd').json()) == 1
    source = client.post('/api/gmd/0?start=8').json()
    assert source['events'][0] == pytest.approx([.05, 100/127, 1])
    assert source['taps'] == [] and source['split'] == 'train'
    assert client.post('/api/gmd/0?start=12').status_code == 400
    assert client.post('/api/gmd/0?start=2').status_code == 400
    assert client.post('/api/gmd/9').status_code == 404
    response = client.post('/api/import?name=fixture.mid', content=midi_payload([(.27, 36, 80)]))
    assert response.status_code == 200
    assert response.json()['taps'] == []
    assert response.json()['events'][0][0] == pytest.approx(.27, abs=.5/960)
    assert client.post('/api/import', content=b'invalid midi').status_code == 400
    assert client.post('/api/import', content=b'x'*2_000_001).status_code == 413
    assert client.post('/api/import', content=b'x', headers={'Origin': 'https://unrelated.example'}).status_code == 403


@pytest.mark.parametrize('kwargs,message', [({'meter': False}, '4/4'),
    ({'channel': 1}, 'channel 10'), ({'tempo_change': True}, 'constant tempo'),
    ({'length': 4}, 'eight-beat')])
def test_reject_ambiguous_midi_contract(kwargs, message):
    with pytest.raises(ValueError, match=message):
        read_crop(midi_payload([(.25, 36, 100)], **kwargs), require_drum_channel=True)


@pytest.mark.parametrize('kind,events,pitches', [
    ('full', [[.27, .65, 0], [7.99, .9, 1]], [36, 38]),
    ('dual', [[.27, .65, 1], [7.99, .9, 2]], [76, 77]),
    ('solo', [[.27, .65, 0], [7.99, .9, 0]], [38, 38])])
def test_midi_export_preserves_time_velocity_voice_and_loop(kind, events, pitches):
    data = export_midi(events, kind, 133)
    clip = mido.MidiFile(file=io.BytesIO(data))
    tick, onsets, notes, velocities = 0, [], [], []
    for msg in mido.merge_tracks(clip.tracks):
        tick += msg.time
        if msg.type == 'note_on':
            assert msg.channel == 9
            onsets.append(tick/960); notes.append(msg.note); velocities.append(msg.velocity/127)
    assert tick == 8*960
    assert notes == pitches
    np.testing.assert_allclose(onsets, np.array(events)[:, 0], atol=.5/960)
    np.testing.assert_allclose(velocities, np.array(events)[:, 1], atol=.5/127)


def test_async_search_equal_budgets_saved_history_restore_and_repeatability(explorer):
    client, w = explorer
    source = client.get('/api/sources').json()[0]['id']
    request = dict(source_id=source, bpm=120, budget=32, initial_random=4, seed=17,
                   algorithm='both', bins=4, min_interval_ms=20, max_hits_per_second=30,
                   add_weight=0, delete_weight=2, shift_weight=0, velocity=False, microtiming=False)
    response = client.post('/api/search', json=request)
    assert response.status_code == 202
    key = response.json()['id']; job = finish_job(client, key)
    assert job['status'] == 'complete', job
    results = job['result']['results']
    assert [r['evaluations'] for r in results] == [32, 32]
    assert not job['result']['human_solo_validation']
    assert not job['result']['perceptual_validation']
    for result in results:
        directory = w.output/key/result['algorithm']
        history = [json.loads(line) for line in (directory/'evaluations.jsonl').read_text().splitlines()]
        assert len(history) == 32
        assert len(list(directory.glob('*.mid'))) == len(result['archive']) > 0
        assert {r['operation'] for r in history} <= {'random', 'delete'}
        assert result['config']['delete_weight'] == 2
    restored = client.get('/api/runs/'+key).json()
    assert restored['run'] == job['result']
    assert restored['source']['id'] == source
    assert client.get('/api/runs').json()[0]['id'] == key
    again = finish_job(client, client.post('/api/search', json=request).json()['id'])
    assert again['result']['results'] == results
    w.model_hash = 'another checkpoint'
    assert client.get('/api/runs/'+key).status_code == 409


def test_missing_checkpoint_still_allows_source_audio_and_import(artifacts, tmp_path):
    w = Workspace(artifacts/'pairs', tmp_path/'absent', tmp_path/'runs', artifacts/'gmd')
    with TestClient(create_app(w)) as client:
        assert not client.get('/api/info').json()['model_ready']
        source = client.get('/api/sources').json()[0]['id']
        assert client.get('/api/sources/'+source).status_code == 200
        assert client.post('/api/search', json=dict(source_id=source, bpm=120)).status_code == 409
        assert client.post('/api/gmd/0').status_code == 200


def test_mutation_radius_zero_weights_and_cancellation(explorer):
    _, w = explorer
    config = SearchConfig(budget=64, initial_random=2, shift_radius=1, add_weight=0,
        delete_weight=0, velocity_weight=0, timing_weight=0)
    config.validate()
    genome = np.zeros((32, 3)); genome[0] = [1, .8, 0]
    rng = np.random.default_rng(12)
    for _ in range(20):
        mutated, op = mutate(genome, rng, config)
        assert op == 'shift'
        assert np.flatnonzero(mutated[:, 0]).item() in (1, 31)
    config.shift_weight = 0
    with pytest.raises(ValueError, match='positive weight'):
        config.validate()
    scorer = ConservationScorer(w.model, w.corpus.split('train')[0].events)
    cancel = threading.Event(); reports = []
    def progress(r):
        reports.append(r)
        if r['evaluations'] >= 17:
            cancel.set()
    result = search(scorer, 'cancel-fixture', 120, SearchConfig(budget=64), progress=progress, cancel=cancel)
    assert result['cancelled'] and result['evaluations'] == len(result['history']) == 17
    assert reports[-1]['evaluations'] == 17


def test_original_import_alias_retains_class_identity():
    from groove.solo.search import SearchConfig as LegacySearchConfig
    assert LegacySearchConfig is SearchConfig
