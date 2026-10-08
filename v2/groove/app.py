"""Local-only production workspace; run with `python -m groove` from v2."""
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from pathlib import Path
import threading
import time
import uuid
from fastapi import FastAPI,HTTPException,Request
from fastapi.responses import FileResponse,Response,JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel,Field
from typing import Literal
from .events import GenerateRequest,Pattern,Tap,DRUMS,PITCHES,STYLES
from .generation import Generator,measures
from .midi_engine import MidiEngine

ROOT=Path(__file__).resolve().parents[1]
engine=MidiEngine();generator=Generator(ROOT/'artifacts/cvae.pt')
pool=ThreadPoolExecutor(max_workers=1,thread_name_prefix='2groove-generation')
jobs={};jobs_lock=threading.RLock()


@asynccontextmanager
async def lifespan(app):
    engine.start_thread()
    yield
    for j in jobs.values():j['cancel'].set()
    engine.close()


app=FastAPI(title='2groove v2',lifespan=lifespan)


@app.middleware('http')
async def local_origin(request:Request,call_next):
    origin=request.headers.get('origin')
    if origin and origin not in ('http://127.0.0.1:8765','http://localhost:8765'):
        return JSONResponse({'detail':'Use the local 2groove workspace'},status_code=403)
    try:size=int(request.headers.get('content-length','0'))
    except ValueError:return JSONResponse({'detail':'Invalid content length'},status_code=400)
    if size>4_000_000:
        return JSONResponse({'detail':'Payload too large'},status_code=413)
    return await call_next(request)


@app.get('/api/info')
def info():
    return dict(version='0.2.0',drums=DRUMS,pitches=PITCHES,styles=STYLES,
        engines=['procedural']+(['cvae'] if generator.model is not None else []),
        model_info=getattr(generator,'model_info',None),descriptor='metrical displacement proxy v1')


@app.get('/api/state')
def state():return engine.state()


@app.get('/api/midi/ports')
def ports():return engine.ports()


class Routing(BaseModel):
    tap_input:str|None=None
    clock_input:str|None=None
    output:str|None=None
    channel:int=Field(default=10,ge=1,le=16)
    tap_channel:int|None=Field(default=None,ge=1,le=16)
    tap_note:int|None=Field(default=None,ge=0,le=127)


@app.post('/api/midi/connect')
def connect(r:Routing):
    try:engine.configure(**r.model_dump());return engine.state()
    except Exception as e:raise HTTPException(400,str(e)) from e


@app.post('/api/midi/disconnect')
def disconnect():engine.disconnect();return engine.state()


class Tempo(BaseModel):
    bpm:float=Field(default=120,ge=30,le=300,allow_inf_nan=False)
    mode:Literal['internal','external']='internal'


@app.post('/api/tempo')
def tempo(r:Tempo):
    try:engine.set_tempo(r.bpm,r.mode);return engine.state()
    except ValueError as e:raise HTTPException(409,str(e)) from e


class Arm(BaseModel):
    count_in:int=Field(default=4,ge=0,le=8)


@app.post('/api/record/arm')
def arm(r:Arm):
    try:return engine.arm(r.count_in)
    except ValueError as e:raise HTTPException(409,str(e)) from e


class TapInput(BaseModel):
    timestamp:float=Field(allow_inf_nan=False)
    velocity:float=Field(default=.8,gt=0,le=1,allow_inf_nan=False)


@app.post('/api/record/tap')
def tap(r:TapInput):
    # Browser timestamps are mapped to the local monotonic clock with a midpoint handshake.
    if abs(engine.now()-r.timestamp)>2:raise HTTPException(400,'Tap timestamp is out of sync; refresh the workspace')
    return {'accepted':engine.tap(r.timestamp,r.velocity)}


@app.post('/api/record/finish')
def finish():return {'taps':engine.finish_recording()}


@app.post('/api/play')
def play(p:Pattern):return engine.play(p)


@app.post('/api/stop')
def stop():engine.stop();return engine.state()


@app.post('/api/panic')
def panic():engine.stop();engine.finish_recording();return engine.state()


@app.post('/api/export/midi')
def export(pattern:Pattern):
    from .events import midi_bytes
    return Response(midi_bytes(pattern),media_type='audio/midi',headers={'Content-Disposition':'attachment; filename="2groove.mid"'})


@app.post('/api/measure')
def measure(pattern:Pattern):return measures(pattern.notes)


def run_job(job_id,req):
    job=jobs[job_id];started=time.perf_counter()
    def progress(done,filled):
        with jobs_lock:job.update(completed=done,filled=filled)
    try:
        if job['cancel'].is_set():job['status']='cancelled';return
        result=generator.search(req,job['cancel'],progress)
        with jobs_lock:
            job.update(status='cancelled' if job['cancel'].is_set() else 'complete',result=result,
                       seconds=time.perf_counter()-started,completed=result['evaluations'])
    except Exception as e:
        with jobs_lock:job.update(status='error',error=str(e))


@app.post('/api/generate',status_code=202)
def generate(req:GenerateRequest):
    if req.engine=='cvae' and generator.model is None:raise HTTPException(400,'No trained checkpoint loaded')
    if req.engine=='cvae' and req.role=='complement':raise HTTPException(400,'CVAE baseline supports accent/pulse; use procedural for complement')
    with jobs_lock:
        if sum(j['status']=='running' for j in jobs.values())>=2:
            raise HTTPException(429,'Generation queue full; wait for the current job')
        for job in jobs.values():
            if job['status']=='running':job['cancel'].set()
        # Bounded results retained for inspection; prevent large UI sessions retaining every archive.
        for key in list(jobs):
            if len(jobs)<=12:break
            if jobs[key]['status']!='running':del jobs[key]
        key=uuid.uuid4().hex
        jobs[key]={'id':key,'status':'running','cancel':threading.Event(),'completed':0,'budget':req.budget,'filled':0}
        pool.submit(run_job,key,req)
        return {'id':key}


@app.get('/api/jobs/{key}')
def job(key:str):
    with jobs_lock:
        if key not in jobs:raise HTTPException(404,'Job not found')
        return {k:v for k,v in jobs[key].items() if k!='cancel'}


@app.post('/api/jobs/{key}/cancel')
def cancel(key:str):
    with jobs_lock:
        if key not in jobs:raise HTTPException(404,'Job not found')
        jobs[key]['cancel'].set();return {'cancelled':True}


@app.post('/api/model/reload')
def reload_model():
    global generator
    with jobs_lock:
        if any(j['status']=='running' for j in jobs.values()):raise HTTPException(409,'Wait for generation to finish')
        if not (ROOT/'artifacts/cvae.pt').exists():raise HTTPException(404,'No checkpoint yet')
        generator=Generator(ROOT/'artifacts/cvae.pt')
    return info()


class HistoryEntry(BaseModel):
    label:str=Field(max_length=200)
    pattern:Pattern|None=None
    taps:list[Tap]=Field(default_factory=list,max_length=512)
    request:GenerateRequest|None=None
    time:str=Field(max_length=100)


class Project(BaseModel):
    format:Literal['2groove-v2']
    version:Literal[1]
    taps:list[Tap]=Field(default_factory=list,max_length=512)
    selected:Pattern|None=None
    history:list[HistoryEntry]=Field(default_factory=list,max_length=40)
    pinned:dict[Literal['A','B'],Pattern]=Field(default_factory=dict)
    locks:list[int]=Field(default_factory=list,max_length=9)
    request:GenerateRequest|None=None
    settings:GenerateRequest|None=None


@app.post('/api/project/validate')
def validate_project(project:Project):
    if any(d not in range(9) for d in project.locks):raise HTTPException(422,'Invalid voice lock')
    if project.locks and project.selected is None:raise HTTPException(422,'Locks require a selected groove')
    return project


@app.get('/')
def index():return FileResponse(ROOT/'web/index.html')

app.mount('/web',StaticFiles(directory=ROOT/'web'),name='web')
app.mount('/samples',StaticFiles(directory=ROOT.parent/'db_app/assets/sounds/drum_samples'),name='samples')
