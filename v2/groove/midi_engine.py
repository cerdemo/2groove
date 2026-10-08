"""Native MIDI and monotonic scheduling. The DAW owns external MIDI clock.

No clock is echoed. MIDI output is silent until the user connects and presses Play.
The scheduler runs independently of the UI and of model/QD computation.
"""
import math
import statistics
import threading
import time
from collections import deque
import mido
from .events import PITCHES, Pattern, Tap
from .native_midi import Input


class Clock:
    def __init__(self):
        self.running=False;self.tick=-1;self.anchor=None;self.last=None
        self.bpm=120.;self.intervals=deque(maxlen=48);self.position=0.

    def feed(self,msg,now):
        if msg.type=='start':
            self.running=True;self.tick=-1;self.position=0.;self.anchor=now;self.last=None;self.intervals.clear()
        elif msg.type=='stop':
            self.position=self.beat(now);self.running=False
        elif msg.type=='songpos':
            self.tick=msg.pos*6-1;self.position=msg.pos/4;self.anchor=now;self.last=None;self.intervals.clear()
        elif msg.type=='continue':
            self.running=True;self.anchor=now;self.last=None
            self.tick=round(self.position*24)-1
        elif msg.type=='clock':
            if self.last is not None:
                dt=now-self.last
                # OS delivery can bunch valid pulses. Removing short intervals
                # while retaining long ones biases the tempo downward.
                if 0<=dt<.5:
                    self.intervals.append(dt)
                    average=statistics.fmean(self.intervals)
                    if average>0:self.bpm=max(30.,min(300.,60/(24*average)))
            self.last=now
            if self.running:
                self.tick+=1;self.position=max(0,self.tick)/24;self.anchor=now

    def beat(self,now):
        if not self.running or self.anchor is None or self.last is None:return self.position
        return self.position+max(0,now-self.anchor)*self.bpm/60

    def stale(self,now):
        return self.running and self.anchor is not None and now-(self.last or self.anchor)>.5


class MidiEngine:
    def __init__(self,monotonic=time.perf_counter):
        self.now=monotonic;self.lock=threading.RLock();self.clock=Clock()
        self.mode='internal';self.bpm=120.;self.origin=self.now();self.playing=False
        self.pattern=None;self.pending=None;self.play_origin=0.;self.last_scan=0.
        self.output=None;self.inputs=[];self.routes={};self.channel=9
        self.active={};self.error=None;self.recording=None;self.take=[];self.take_version=0
        self.tap_channel=None;self.tap_note=None;self.dropped=0;self.lateness=[]
        self.shutdown_event=threading.Event();self.thread=None

    def start_thread(self):
        self.thread=threading.Thread(target=self._run,daemon=True,name='2groove-midi')
        self.thread.start()

    def _run(self):
        while not self.shutdown_event.wait(.0015):
            with self.lock:
                now=self.now()
                incoming=[]
                for port in self.inputs:
                    try:incoming.extend((stamp,msg,port.roles) for msg,stamp in port.drain(now))
                    except Exception as e:self.error=str(e)
                for stamp,msg,roles in sorted(incoming,key=lambda item:item[0]):self.receive(msg,roles,stamp)
                self.advance(now)

    def position(self,now):
        return self.clock.beat(now) if self.mode=='external' else (now-self.origin)*self.bpm/60

    def ports(self):
        try:
            return {'inputs':mido.get_input_names(),'outputs':mido.get_output_names(),'error':None}
        except Exception as e:
            return {'inputs':[],'outputs':[],'error':str(e)}

    def configure(self,tap_input=None,clock_input=None,output=None,channel=10,
                  tap_channel=None,tap_note=None):
        if not 1<=channel<=16:raise ValueError('MIDI channel must be 1..16')
        if tap_channel is not None and not 1<=tap_channel<=16:raise ValueError('Tap channel must be 1..16')
        if tap_note is not None and not 0<=tap_note<=127:raise ValueError('Tap note must be 0..127')
        # Close outside the lock: RtMidi may wait for a callback which needs the lock.
        self.disconnect()
        new_inputs=[];out=None
        try:
            routes={}
            for name,role in [(tap_input,'tap'),(clock_input,'clock')]:
                if name:routes.setdefault(name,set()).add(role)
            for name,roles in routes.items():
                virtual=name.startswith('@virtual:')
                label={'@virtual:tap':'2groove Tap In','@virtual:clock':'2groove Clock In'}.get(name,name)
                new_inputs.append(Input(label,virtual=virtual,roles=roles))
            if output:
                out=mido.open_output('2groove Drum Out' if output=='@virtual' else output,virtual=output=='@virtual')
            with self.lock:
                self.inputs=new_inputs;self.output=out;self.routes=dict(tap=tap_input,clock=clock_input,output=output)
                self.channel=channel-1;self.tap_channel=None if tap_channel is None else tap_channel-1
                self.tap_note=tap_note;self.error=None
        except Exception:
            for port in new_inputs:port.close()
            if out:out.close()
            raise

    def disconnect(self):
        with self.lock:
            self.stop();self.finish_recording();inputs=self.inputs;output=self.output
            self.clock.running=False
            self.inputs=[];self.output=None;self.routes={}
        for port in inputs:port.close()
        if output:output.close()

    def receive(self,msg,roles,timestamp=None):
        now=self.now() if timestamp is None else timestamp
        with self.lock:
            if 'clock' in roles and msg.type in ('clock','start','stop','continue','songpos'):
                self.clock.feed(msg,now)
                if self.mode=='external':
                    if msg.type in ('start','continue'):self.error=None
                    if msg.type in ('stop','start','songpos','continue'):
                        self.panic();self.last_scan=self.position(now)-1e-7
                    if msg.type=='start':
                        if self.pending:self.pattern=self.pending[1];self.pending=None
                        self.play_origin=0.
                        if self.recording:self.recording['start']=0.
                    if msg.type=='stop' and self.recording:self.finish_recording()
            if 'tap' in roles and msg.type=='note_on' and msg.velocity>0:
                if self.tap_channel is not None and msg.channel!=self.tap_channel:return
                if self.tap_note is not None and msg.note!=self.tap_note:return
                self.tap(now,msg.velocity/127,'midi')

    def set_tempo(self,bpm,mode):
        with self.lock:
            if self.recording:raise ValueError('Finish the take before changing clock or tempo')
            self.stop();self.bpm=bpm;self.mode=mode;self.origin=self.now()

    def arm(self,count_in=4):
        with self.lock:
            if self.recording:raise ValueError('Already recording')
            now=self.now();beat=self.position(now)
            if self.mode=='external':
                start=math.ceil((beat+.1)/4)*4 if self.clock.running else None
            else:start=beat+count_in
            self.recording={'start':start,'armed_at':now};self.take=[];self.take_version+=1
            return self.state()

    def tap(self,now,velocity=.8,source='keyboard'):
        with self.lock:
            if not self.recording or self.recording['start'] is None:return False
            if len(self.take)>=512:return False
            relative=self.position(now)-self.recording['start']
            if 0<=relative<8:
                self.take.append(Tap(beat=relative,velocity=velocity,source=source))
                return True
            return False

    def finish_recording(self):
        with self.lock:
            self.recording=None
            return [t.model_dump() for t in self.take]

    def play(self,pattern:Pattern):
        with self.lock:
            now=self.now();beat=self.position(now)
            if self.playing and self.pattern and (self.mode!='external' or self.clock.running):
                self.pending=(self.play_origin+(math.floor((beat-self.play_origin)/8)+1)*8,pattern)
            else:
                self.pattern=pattern;self.pending=None;self.playing=True
                self.play_origin=(math.ceil((beat+.05)/4)*4 if self.mode=='external' and self.clock.running else beat+.2*self.bpm/60)
                if self.mode=='external' and not self.clock.running:self.play_origin=0
                self.last_scan=beat-1e-7
            return self.state()

    def stop(self):
        with self.lock:
            self.playing=False;self.pending=None;self.panic()

    def send(self,msg):
        if self.output:
            try:self.output.send(msg)
            except Exception as e:
                self.error=str(e);self.playing=False

    def panic(self):
        for pitch in list(self.active):self.send(mido.Message('note_off',note=pitch,velocity=0,channel=self.channel))
        self.active.clear()
        if self.output:
            self.send(mido.Message('control_change',control=123,value=0,channel=self.channel))
            self.send(mido.Message('control_change',control=120,value=0,channel=self.channel))

    def advance(self,now):
        beat=self.position(now)
        if self.mode=='external' and self.clock.stale(now):
            self.clock.position=self.clock.beat(now);self.clock.running=False
            self.panic();self.error='MIDI clock lost; waiting for DAW Start/Continue'
            if self.recording:self.finish_recording()
        if self.recording:
            if self.recording['start'] is None and self.clock.running:
                self.recording['start']=math.ceil(beat/4)*4
            if self.recording['start'] is not None and beat-self.recording['start']>=8:self.finish_recording()
        if not self.playing or not self.pattern:return
        if self.mode=='external' and (not self.clock.running or self.clock.last is None):return
        if self.pending and beat>=self.pending[0]:
            switch,pattern=self.pending;self.pending=None;self.panic()
            self.pattern=pattern;self.play_origin=switch;self.last_scan=switch-1e-7
        if beat<self.last_scan:
            self.panic();self.last_scan=beat-1e-7
        for pitch,off in list(self.active.items()):
            if beat>=off:
                self.send(mido.Message('note_off',note=pitch,velocity=0,channel=self.channel));del self.active[pitch]
        period=8
        first=max(0,math.floor((self.last_scan-self.play_origin)/period))
        last=max(0,math.floor((beat-self.play_origin)/period))
        for loop in range(max(first,last-1),last+1):
            for n in self.pattern.notes:
                onset=self.play_origin+loop*period+n.beat
                if self.last_scan<onset<=beat:
                    late=(beat-onset)*60/(self.clock.bpm if self.mode=='external' else self.bpm)
                    if late>.04:self.dropped+=1;continue
                    pitch=PITCHES[n.drum]
                    if pitch in self.active:self.send(mido.Message('note_off',note=pitch,velocity=0,channel=self.channel))
                    self.send(mido.Message('note_on',note=pitch,velocity=max(1,round(n.velocity*127)),channel=self.channel))
                    self.active[pitch]=onset+n.duration
                    self.lateness.append(late*1000);self.lateness=self.lateness[-2000:]
        self.last_scan=beat

    def state(self):
        with self.lock:
            now=self.now();beat=self.position(now)
            recording=None if not self.recording else dict(self.recording,beat=beat)
            return dict(server_time=now,mode=self.mode,bpm=self.clock.bpm if self.mode=='external' else self.bpm,
                beat=beat,clock_running=self.clock.running,clock_age=None if self.clock.last is None else now-self.clock.last,
                playing=self.playing,play_origin=self.play_origin,pattern_id=self.pattern.id if self.pattern else None,
                pending_id=self.pending[1].id if self.pending else None,recording=recording,
                pending_at=self.pending[0] if self.pending else None,
                taps=[t.model_dump() for t in self.take],take_version=self.take_version,routes=self.routes,
                error=self.error,dropped_notes=self.dropped,
                scheduler_late_ms_p95=sorted(self.lateness)[int(.95*(len(self.lateness)-1))] if self.lateness else None)

    def close(self):
        self.shutdown_event.set()
        if self.thread:self.thread.join(timeout=2)
        self.disconnect()
