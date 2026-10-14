"""Local audiovisual research explorer. No production MIDI ports are opened."""
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
import csv
import hashlib
import io
import json
from pathlib import Path
import threading
import time
from typing import Literal
import uuid

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
import mido
import numpy as np
from pydantic import BaseModel, Field, ConfigDict

from groove.events import DRUMS, PITCHES
from groove.pretraining.audit import sha256
from groove.representation.taptam import GROOVE_MAP
from .cli import code_hashes, write_json
from .data import SoloPairs
from .features import profile, validate_events
from .model import LocalCompatibility
from .scoring import ConservationScorer
from .search import Playability, SearchConfig, search, save_search
from .study import Study

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent


class SearchRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    source_id: str = Field(max_length=100)
    algorithm: Literal['map_elites', 'random', 'both'] = 'both'
    bpm: float = Field(ge=30, le=300, allow_inf_nan=False)
    seed: int = Field(default=42, ge=0, le=2**31-1)
    budget: int = Field(default=256, ge=16, le=4096)
    bins: int = Field(default=8, ge=4, le=16)
    initial_random: int = Field(default=32, ge=1, le=4096)
    restart_probability: float = Field(default=.1, ge=0, le=1)
    velocity: bool = True
    microtiming: bool = True
    max_offset: float = Field(default=.45, ge=0, lt=.5)
    add_weight: float = Field(default=1, ge=0, le=10)
    delete_weight: float = Field(default=1, ge=0, le=10)
    shift_weight: float = Field(default=1, ge=0, le=10)
    velocity_weight: float = Field(default=1, ge=0, le=10)
    timing_weight: float = Field(default=1, ge=0, le=10)
    velocity_sigma: float = Field(default=.12, gt=0, le=.5)
    timing_sigma: float = Field(default=.1, gt=0, le=.5)
    shift_radius: int = Field(default=4, ge=1, le=8)
    technique: Literal['finger', 'stick'] = 'finger'
    min_interval_ms: float = Field(default=100, ge=20, le=1000)
    max_hits_per_second: float = Field(default=8, ge=.5, le=30)
    max_velocity_jump: float = Field(default=1, ge=0, le=1)

    def config(self):
        values = self.model_dump(exclude={'source_id', 'algorithm', 'bpm', 'technique',
            'min_interval_ms', 'max_hits_per_second', 'max_velocity_jump'})
        config = SearchConfig(**values, playability=Playability(self.technique, self.min_interval_ms,
            self.max_hits_per_second, self.max_velocity_jump))
        config.validate()
        return config


class Inspection(BaseModel):
    source_id: str
    width: Literal[4, 8, 16] = 8
    start: int = Field(default=0, ge=0, le=7)
    events: list[list[float]] = Field(default_factory=list, max_length=512)


class Export(BaseModel):
    events: list[list[float]] = Field(max_length=512)
    kind: Literal['full', 'dual', 'solo']
    bpm: float = Field(ge=30, le=300, allow_inf_nan=False)


def export_midi(events, kind, bpm):
    rows = validate_events(events)
    midi = mido.MidiFile(ticks_per_beat=960)
    track = mido.MidiTrack(); midi.tracks.append(track)
    track.extend([mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(bpm)),
                  mido.MetaMessage('time_signature', numerator=4, denominator=4)])
    messages = []
    for beat, velocity, voice in rows:
        voice = int(voice)
        if kind == 'full':
            if voice >= len(PITCHES):
                raise ValueError('Invalid full-groove voice')
            pitch = PITCHES[voice]
        elif kind == 'dual':
            if voice not in (0, 1, 2):
                raise ValueError('Invalid human pad')
            pitch = {0: 75, 1: 76, 2: 77}[voice]
        else:
            if voice != 0:
                raise ValueError('Solo export requires one channel labeled 0')
            pitch = 38
        tick = min(7679, round(beat*960))
        messages.extend([(tick, 1, pitch, max(1, round(velocity*127))), (min(7680, tick+60), 0, pitch, 0)])
    previous = 0
    for tick, on, pitch, velocity in sorted(messages):
        track.append(mido.Message('note_on' if on else 'note_off', channel=9, note=pitch,
                                  velocity=velocity, time=tick-previous))
        previous = tick
    track.append(mido.MetaMessage('end_of_track', time=7680-previous))
    buffer = io.BytesIO(); midi.save(file=buffer)
    return buffer.getvalue()


def read_crop(payload, start=0., bpm_hint=None, require_drum_channel=False):
    """Strict complete two-bar, constant-tempo 4/4 import with explicit mapping."""
    if not np.isfinite(start) or start < 0 or abs(start/4 - round(start/4)) > 1e-8:
        raise ValueError('Crop must start on a nonnegative 4-beat bar boundary')
    midi = mido.MidiFile(file=io.BytesIO(payload))
    if midi.type == 2 or midi.ticks_per_beat <= 0:
        raise ValueError('Unsupported MIDI clock/type')
    tick, events, tempos, meters = 0, [], [], []
    for message in mido.merge_tracks(midi.tracks):
        tick += message.time
        beat = tick / midi.ticks_per_beat
        if message.type == 'set_tempo':
            tempos.append((beat, mido.tempo2bpm(message.tempo)))
        if message.type == 'time_signature':
            meters.append((beat, (message.numerator, message.denominator)))
        if message.type == 'note_on' and message.velocity and start <= beat < start+8:
            if require_drum_channel and message.channel != 9:
                raise ValueError('Upload must contain GM/TD-11 percussion on MIDI channel 10')
            if message.note not in GROOVE_MAP:
                raise ValueError(f'Unmapped drum pitch {message.note}; use the v2 ingestion adapter first')
            events.append([beat-start, message.velocity/127, GROOVE_MAP[message.note]])
    if tick / midi.ticks_per_beat < start+8-.001:
        raise ValueError('The MIDI does not contain a complete eight-beat crop at this start')
    bpm = next((value for beat, value in reversed(tempos) if beat <= start), bpm_hint)
    meter = next((value for beat, value in reversed(meters) if beat <= start), (4, 4) if bpm_hint else None)
    if meter != (4, 4) or any(value != (4, 4) for beat, value in meters if start < beat < start+8):
        raise ValueError('An explicit 4/4 reference is required')
    if bpm is None or not 30 <= bpm <= 300 or any(abs(value-bpm) > .01 for beat, value in tempos if start < beat < start+8):
        raise ValueError('A known constant tempo in [30,300] is required')
    if not events:
        raise ValueError('No drum events in the selected two bars')
    return validate_events(events).tolist(), float(bpm)


class StudyResponse(BaseModel):
    model_config = ConfigDict(extra='forbid')
    participant: str = Field(min_length=2, max_length=40)
    session: str = Field(default='', max_length=64)
    trial: str = Field(max_length=64)
    choice: Literal['first', 'second']
    confidence: Literal['slight', 'clear']
    unplayable_first: bool = False
    unplayable_second: bool = False
    replays: int = Field(default=0, ge=0, le=10000)
    elapsed_ms: int = Field(default=0, ge=0, le=86_400_000)
    consent: bool


class Workspace:
    def __init__(self, pairs=None, model=None, output=None, gmd=None, historical=None, study=None):
        self.pairs_path = Path(pairs or ROOT/'data/taptamdrum-pairs-raw-v1')
        self.model_path = Path(model or ROOT/'artifacts/solo-local-20261013-final/model')
        self.output = Path(output or HERE/'runs')
        self.gmd = Path(gmd or ROOT/'data/gmd/gmd/groove')
        self.historical = Path(historical or ROOT/'artifacts/solo-search-20261013-final')
        self.corpus = SoloPairs(self.pairs_path) if self.pairs_path.exists() else None
        self.model, self.model_error = None, None
        try:
            self.model = LocalCompatibility.load(self.model_path)
            if self.corpus and self.model.metadata['pairs_fingerprint'] != self.corpus.fingerprint:
                raise ValueError('Model/pairs fingerprint mismatch')
        except (OSError, ValueError, KeyError) as exc:
            self.model = None; self.model_error = str(exc)
        self.model_hash = sha256(self.model_path/'model.npz') if self.model else None
        self.study, self.study_error = None, None
        if study is not None:
            try:
                self.study = Study(study)
            except (OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
                self.study_error = str(exc)
        self.imports, self.jobs, self.lock = {}, {}, threading.RLock()
        self.pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix='solo-research')
        self.gmd_rows = []
        if (self.gmd/'info.csv').exists():
            with (self.gmd/'info.csv').open() as stream:
                self.gmd_rows = [r for r in csv.DictReader(stream) if r['time_signature'] == '4-4' and r['split'] != 'test']

    def close(self):
        for job in self.jobs.values():
            job['cancel'].set()
        self.pool.shutdown(wait=True, cancel_futures=True)

    def source(self, key):
        if key.startswith('import-'):
            if key not in self.imports:
                raise HTTPException(404, 'Imported source not in this server session; import again')
            return self.imports[key]
        if not self.corpus or key not in self.corpus.groups or self.corpus.groups[key].split == 'test':
            raise HTTPException(404, 'Unknown train/validation source')
        g = self.corpus.groups[key]
        return dict(id=g.id, name=sorted(g.performances)[0], bpm=g.bpm, split=g.split,
            provenance='GMD-derived TapTamDrum stimulus', events=g.events.tolist(),
            sessions=sorted(g.sessions), performances=sorted(g.performances),
            taps=[dict(events=t['events'], participant=t['participant'], interpretation=t['interpretation'],
                       source=t['source'], source_sha256=t['source_sha256']) for t in g.taps])

    def import_source(self, payload, name, start, bpm_hint=None, provenance='Uploaded drum MIDI'):
        events, bpm = read_crop(payload, start, bpm_hint, require_drum_channel=bpm_hint is None)
        key = 'import-'+hashlib.sha256(payload+str(start).encode()).hexdigest()[:20]
        source = dict(id=key, name=name, bpm=bpm, split='exploration', provenance=provenance,
            events=events, taps=[], start_beat=start, source_sha256=hashlib.sha256(payload).hexdigest())
        with self.lock:
            if len(self.imports) >= 32:
                self.imports.pop(next(iter(self.imports)))
            self.imports[key] = source
        return source

    def historical_results(self, key):
        comparison = self.historical/'comparison.json'
        if not comparison.exists() or not self.model:
            return []
        card = json.loads(comparison.read_text())
        if card.get('model_sha256') != self.model_hash or not self.corpus or card.get('pairs_fingerprint') != self.corpus.fingerprint:
            return []
        return [json.loads(p.read_text()) for p in sorted((self.historical/f'source-{key}').glob('*/archive.json'))]

    def run_job(self, key, request, source):
        job = self.jobs[key]
        try:
            directory = self.output/key
            directory.mkdir(parents=True, exist_ok=False)
            write_json(directory/'source.json', source)
            write_json(directory/'request.json', request.model_dump())
            scorer = ConservationScorer(self.model, source['events'])
            algorithms = ['map_elites', 'random'] if request.algorithm == 'both' else [request.algorithm]
            results = []
            for algorithm in algorithms:
                if job['cancel'].is_set():
                    break
                def progress(value):
                    with self.lock:
                        job.update(progress=value, active_algorithm=algorithm)
                result = search(scorer, source['id'], request.bpm, request.config(), algorithm,
                                progress=progress, cancel=job['cancel'])
                save_search(result, directory/algorithm)
                results.append({k: v for k, v in result.items() if k != 'history'})
            card = dict(id=key, status='cancelled' if job['cancel'].is_set() else 'complete',
                source_id=source['id'], request=request.model_dump(), results=results,
                model_sha256=self.model_hash, code_sha256=code_hashes(),
                interface_code_sha256={name: sha256(HERE/name) for name in
                    ('server.py', '__main__.py', 'web/app.js', 'web/index.html', 'web/style.css')},
                pairs_fingerprint=self.corpus.fingerprint if self.corpus else None,
                human_solo_validation=False, perceptual_validation=False)
            write_json(directory/'run.json', card)
            with self.lock:
                job.update(status=card['status'], result=card, seconds=time.monotonic()-job['started'])
        except Exception as exc:
            with self.lock:
                job.update(status='error', error=str(exc))


def create_app(workspace=None):
    @asynccontextmanager
    async def lifespan(app):
        app.state.workspace = workspace or Workspace()
        yield
        app.state.workspace.close()

    app = FastAPI(title='2groove · Solo research explorer', lifespan=lifespan)

    @app.middleware('http')
    async def local_only(request, call_next):
        host = request.headers.get('host', '')
        origin = request.headers.get('origin')
        if host.split(':')[0] not in ('localhost', '127.0.0.1', 'testserver'):
            return JSONResponse({'detail': 'Use the localhost research explorer'}, 403)
        if origin and origin not in (f'http://{host}', f'https://{host}'):
            return JSONResponse({'detail': 'Cross-origin requests are disabled'}, 403)
        try:
            if int(request.headers.get('content-length', '0')) > 2_000_000:
                return JSONResponse({'detail': 'Maximum upload is 2 MB'}, 413)
        except ValueError:
            return JSONResponse({'detail': 'Invalid content length'}, 400)
        return await call_next(request)

    def ws():
        return app.state.workspace

    @app.exception_handler(ValueError)
    async def bad_value(request, error):
        return JSONResponse({'detail': str(error)}, 400)

    @app.get('/api/info')
    def info():
        w = ws()
        return dict(model_ready=w.model is not None, model_error=w.model_error,
            model_hash=w.model_hash, drums=DRUMS, pairs_ready=w.corpus is not None,
            run_directory=str(w.output),
            default_source='19' if w.corpus and '19' in w.corpus.groups else None,
            training_groups=len(w.model.metadata['train_groups']) if w.model else 0)

    @app.get('/api/sources')
    def sources():
        return [dict(id=g.id, name=sorted(g.performances)[0], bpm=g.bpm, split=g.split,
            interpretations=len(g.taps), hits=len(g.events)) for g in (ws().corpus.groups.values() if ws().corpus else [])
            if g.split in ('train', 'validation')]

    @app.get('/api/sources/{key}')
    def source(key: str):
        result = ws().source(key).copy()
        result['saved_results'] = ws().historical_results(key)
        return result

    @app.get('/api/gmd')
    def gmd():
        return [dict(id=str(i), name=r['midi_filename'], bpm=float(r['bpm']), split=r['split'],
                     duration=float(r['duration'])) for i, r in enumerate(ws().gmd_rows)]

    @app.post('/api/gmd/{index}')
    def import_gmd(index: int, start: float = 0):
        if not 0 <= index < len(ws().gmd_rows):
            raise HTTPException(404, 'GMD source not found')
        row = ws().gmd_rows[index]
        path = (ws().gmd/row['midi_filename']).resolve()
        if not path.is_relative_to(ws().gmd.resolve()):
            raise ValueError('Invalid GMD manifest path')
        result = ws().import_source(path.read_bytes(), row['midi_filename'], start, float(row['bpm']), 'Original GMD performance crop')
        result['split'] = row['split']
        return result

    @app.post('/api/import')
    async def import_file(request: Request, name: str = 'drums.mid', start: float = 0):
        data = bytearray()
        async for chunk in request.stream():
            data.extend(chunk)
            if len(data) > 2_000_000:
                raise HTTPException(413, 'Maximum upload is 2 MB')
        try:
            return ws().import_source(bytes(data), name[:200], start)
        except (OSError, EOFError, KeyError) as exc:
            raise ValueError('Could not decode the drum MIDI') from exc

    @app.post('/api/inspect')
    def inspect(r: Inspection):
        w = ws()
        if not w.model:
            raise HTTPException(409, 'Fit a local motif model before inspection/search')
        source = w.source(r.source_id)
        events = validate_events(r.events)
        scorer = ConservationScorer(w.model, source['events'])
        bank_index = [b['width'] for b in w.model.banks].index(r.width)
        bank = w.model.banks[bank_index]
        weights = scorer.conditionals[bank_index][r.start]
        best = np.argsort(-weights)[:3]
        motifs = []
        for k in best:
            raw = (bank['source'][k]*bank['scale'] + bank['mean']).reshape(r.width, 6)
            motifs.append(dict(id=int(k), weight=float(weights[k]),
                source_profile=raw[:, :3].tolist(), tap_profile=bank['tap_profile'][k].tolist(),
                exemplar=w.model.metadata['exemplars'][bank_index][int(k)]))
        indexes = (r.start*4 + np.arange(r.width)) % 32
        return dict(score=scorer.score(events), expected_support=scorer.expected.tolist(),
            source_window=profile(source['events'])[indexes].tolist(),
            candidate_window=profile(events)[indexes].tolist(), motifs=motifs)

    @app.post('/api/search', status_code=202)
    def start(r: SearchRequest):
        w = ws()
        if not w.model:
            raise HTTPException(409, 'No local motif checkpoint; use the documented fit command')
        r.config()
        source = w.source(r.source_id)
        with w.lock:
            if any(j['status'] == 'running' for j in w.jobs.values()):
                raise HTTPException(409, 'Wait for or cancel the active search')
            for key in list(w.jobs)[:-7]:
                del w.jobs[key]
            key = time.strftime('%Y%m%d-%H%M%S')+'-'+uuid.uuid4().hex[:8]
            w.jobs[key] = dict(id=key, status='running', source_id=source['id'], started=time.monotonic(),
                progress=dict(evaluations=0, filled=0, best=0), active_algorithm='map_elites' if r.algorithm=='both' else r.algorithm,
                cancel=threading.Event())
            w.pool.submit(w.run_job, key, r, source)
        return dict(id=key)

    @app.get('/api/jobs/{key}')
    def job(key: str):
        with ws().lock:
            if key not in ws().jobs:
                raise HTTPException(404, 'Unknown search job')
            return {k: v for k, v in ws().jobs[key].items() if k not in ('cancel', 'started')}

    @app.post('/api/jobs/{key}/cancel')
    def cancel(key: str):
        with ws().lock:
            if key not in ws().jobs:
                raise HTTPException(404, 'Unknown search job')
            ws().jobs[key]['cancel'].set()
        return dict(cancel_requested=True)

    @app.get('/api/runs')
    def runs():
        result = []
        for p in sorted(ws().output.glob('*/run.json'), reverse=True)[:30]:
            card = json.loads(p.read_text())
            result.append(dict(id=card['id'], source_id=card['source_id'], status=card['status'], request=card['request']))
        return result

    @app.get('/api/runs/{key}')
    def run(key: str):
        if '/' in key or '..' in key or not (ws().output/key/'run.json').is_file():
            raise HTTPException(404, 'Unknown saved run')
        card = json.loads((ws().output/key/'run.json').read_text())
        if card['model_sha256'] != ws().model_hash:
            raise HTTPException(409, 'Saved run uses a different model; load its checkpoint to inspect it')
        source = json.loads((ws().output/key/'source.json').read_text())
        if source['id'].startswith('import-'):
            ws().imports[source['id']] = source
        return dict(source=source, run=card)

    @app.post('/api/export')
    def export(r: Export):
        return Response(export_midi(r.events, r.kind, r.bpm), media_type='audio/midi',
                        headers={'Content-Disposition': f'attachment; filename="solo-lab-{r.kind}.mid"'})

    def study_or_409():
        w = ws()
        if not w.study:
            raise HTTPException(409, w.study_error or 'No listening study is loaded; build one '
                                'with study-build and pass --study to the server')
        return w.study

    @app.get('/api/study')
    def study_info():
        w = ws()
        if not w.study:
            return dict(configured=False, error=w.study_error)
        return dict(configured=True, trials=len(w.study.trials), sources=w.study.card['sources'],
            consent=w.study.card['consent'], instructions=w.study.card['instructions'],
            responses=len(w.study.responses()),
            blinding='Stimulus provenance stays in key.json on the server and is never served.')

    @app.get('/api/study/manifest')
    def study_manifest(participant: str):
        return study_or_409().manifest(participant)

    @app.post('/api/study/respond')
    def study_respond(r: StudyResponse):
        return study_or_409().record(r.participant, r.session, r.trial, r.choice, r.confidence,
            r.unplayable_first, r.unplayable_second, r.replays, r.elapsed_ms, r.consent)

    @app.get('/study')
    def study_page():
        return FileResponse(HERE/'web/study.html')

    @app.get('/')
    def index():
        return FileResponse(HERE/'web/index.html')

    app.mount('/web', StaticFiles(directory=HERE/'web'), name='web')
    samples = ROOT.parent/'db_app/assets/sounds/drum_samples'
    if samples.exists():
        app.mount('/samples', StaticFiles(directory=samples), name='samples')
    return app
