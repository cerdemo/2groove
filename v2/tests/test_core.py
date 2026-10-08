import io
from pathlib import Path
import threading
import numpy as np
import mido
import pytest
import torch
from pydantic import ValidationError
from groove.events import Note,Tap,Pattern,GenerateRequest,PolyConfig,midi_bytes,taps_tensor,from_heads
from groove.generation import Generator,measures
from groove.polyrhythm import ni_grid,apply_poly
from groove.model import CVAE,loss_function
from groove.midi_engine import Clock,MidiEngine
from groove.native_midi import Input


def test_export_preserves_onsets_and_silent_tail():
    p=Pattern(notes=[Note(drum=0,beat=0,velocity=1),Note(drum=1,beat=0,velocity=.8),Note(drum=7,beat=4/3,velocity=.6)])
    mid=mido.MidiFile(file=io.BytesIO(midi_bytes(p)));tick=0;hits=[]
    for m in mid.tracks[0]:
        tick+=m.time
        if m.type=='note_on':hits.append((tick,m.note,m.channel))
    assert hits==[(0,36,9),(0,38,9),(1280,51,9)]
    assert tick==8*960


def test_silent_export_and_end_boundary():
    for notes in ([],[Note(drum=0,beat=7.9999,velocity=.5)]):
        mid=mido.MidiFile(file=io.BytesIO(midi_bytes(Pattern(notes=notes))))
        assert sum(m.time for m in mid.tracks[0])==7680
        assert all(m.time>=0 for m in mid.tracks[0])


def test_circular_offsets_and_polyphony():
    t=taps_tensor([Tap(beat=7.98,velocity=.8)])
    assert t[0,0]==1 and t[0,2]==pytest.approx(-.08)
    h=np.zeros((32,9));h[0,:2]=1
    notes=from_heads(h,np.ones((32,9))*.8,np.ones((32,9))*-.08)
    assert len(notes)==2 and all(n.beat==pytest.approx(7.98) for n in notes)


@pytest.mark.parametrize('f,t',[(4,3),(3,4),(5,2),(5,4),(7,11)])
def test_ni_endpoints_and_two_intervals(f,t):
    assert ni_grid(f,t,0)==pytest.approx(np.arange(f)*4/f)
    for s in (.09,.27,.71,1.):
        points=sorted(ni_grid(f,t,s));intervals=np.diff(points+[points[0]+4])
        assert len(set(np.round(intervals,8)))<=2
        assert np.all(intervals>=-1e-12)
    assert all(abs((x*t/4)-round(x*t/4))<1e-8 for x in ni_grid(f,t,1))


def test_poly_overlay_exact_taps_and_coincidences():
    taps=[Tap(beat=.113,velocity=.31),Tap(beat=4.888,velocity=.91)]
    out=apply_poly([],taps,PolyConfig(mode='overlay'))
    assert [(n.beat,n.velocity) for n in out if n.drum==0]==[(t.beat,t.velocity) for t in taps]
    assert len([n for n in out if n.drum==7])==6
    out=apply_poly([],[],PolyConfig(mode='ni_grid',formative=4,target=3,shift=1))
    assert len(out)==6 # coincident points intentionally merged


def test_seed_locks_and_fixed_context_archive():
    reference=Pattern(notes=[Note(drum=1,beat=.134,velocity=.39)])
    req=GenerateRequest(seed=3,budget=32,reference=reference,locked_drums=[1],taps=[Tap(beat=0)])
    generator=Generator();a=generator.search(req);b=generator.search(req)
    assert a==b
    assert len(a['archive'])>1
    for elite in a['archive']:
        assert [n for n in elite['pattern']['notes'] if n['drum']==1]==[reference.notes[0].model_dump()]
        assert 0<=elite['quality']<=1
    assert a['coverage']==len(a['archive'])/64


def test_validation_and_poly_locks():
    for kwargs in ({'beat':float('nan')},{'beat':8},{'beat':-1}):
        with pytest.raises(ValidationError):Tap(**kwargs)
    with pytest.raises(ValidationError):GenerateRequest(locked_drums=[0])
    with pytest.raises(ValidationError):GenerateRequest(reference=Pattern(),locked_drums=[7],poly=PolyConfig(mode='ni_grid'))
    with pytest.raises(ValidationError):GenerateRequest(poly=PolyConfig(mode='overlay',drum=0,tap_drum=0))


def test_masked_losses_silence_and_multihot():
    torch.manual_seed(2);model=CVAE();target=torch.zeros(2,32,9,3)
    target[0,0,:2,0]=1;target[0,0,:2,1]=.8
    heads,dist=model(torch.zeros(2,32,3),torch.zeros(2,dtype=torch.long),torch.zeros(2,dtype=torch.long),torch.ones(2)*120,target)
    loss,parts=loss_function(heads,target,dist);loss.backward()
    assert torch.isfinite(loss) and all(torch.isfinite(p.grad).all() for p in model.parameters() if p.grad is not None)
    silent=torch.zeros_like(target);_,parts=loss_function(heads,silent,dist)
    assert parts['velocity']==parts['offset']==0


class Output:
    def __init__(self):self.messages=[]
    def send(self,msg):self.messages.append(msg)


def test_clock_24ppqn_transport_and_spp():
    c=Clock();c.feed(mido.Message('start'),0)
    for i in range(49):c.feed(mido.Message('clock'),i/48)
    assert c.bpm==pytest.approx(120) and c.beat(1)==pytest.approx(2)
    c.feed(mido.Message('stop'),1);assert not c.running
    c.feed(mido.Message('songpos',pos=32),2);assert c.beat(2)==8
    c.feed(mido.Message('continue'),3);c.feed(mido.Message('clock'),3)
    assert c.beat(3)==8
    assert c.stale(3.6)


def test_native_record_velocity_zero_filter_clock_and_timeout():
    now=[0.];e=MidiEngine(lambda:now[0]);e.set_tempo(120,'external');e.arm()
    e.receive(mido.Message('start'),{'clock'});e.receive(mido.Message('clock'),{'clock'})
    e.receive(mido.Message('note_on',note=60,velocity=0),{'tap'})
    e.receive(mido.Message('note_on',note=60,velocity=100),{'tap'})
    assert len(e.take)==1 and e.take[0].beat==0
    now[0]=.6;e.advance(now[0]);assert e.recording is None and not e.clock.running
    assert 'lost' in e.error


def test_internal_schedule_note_off_and_no_late_burst():
    now=[0.];e=MidiEngine(lambda:now[0]);e.output=Output();p=Pattern(notes=[Note(drum=0,beat=0,velocity=.8)])
    e.play(p);now[0]=.2;e.advance(now[0]);assert [m.type for m in e.output.messages]==['note_on']
    now[0]=.27;e.advance(now[0]);assert e.output.messages[-1].type=='note_off'
    now[0]=4.4;e.advance(now[0]);assert e.dropped==1
    e.stop();assert not e.active and e.output.messages[-1].control==120


def test_boundary_swap_and_locked_note_timing():
    now=[0.];e=MidiEngine(lambda:now[0]);e.output=Output()
    a=Pattern(id='a',notes=[Note(drum=0,beat=0,velocity=.8)])
    b=Pattern(id='b',notes=[Note(drum=1,beat=0,velocity=.8)])
    e.play(a);now[0]=.2;e.advance(now[0]);now[0]=1;e.play(b)
    assert e.pattern.id=='a' and e.pending[1].id=='b'
    now[0]=4.2;e.advance(now[0]);assert e.pattern.id=='b'
    assert e.output.messages[-1].type=='note_on' and e.output.messages[-1].note==38


def test_same_input_opened_once(monkeypatch):
    calls=[]
    class Port:
        def close(self):pass
    monkeypatch.setattr('groove.midi_engine.Input',lambda name,**kwargs:(calls.append((name,kwargs)) or Port()))
    e=MidiEngine();e.configure(tap_input='shared',clock_input='shared')
    assert len(calls)==1
    e.disconnect()


def test_trained_prior_is_reproducible_and_finite():
    checkpoint=Path('artifacts/cvae.pt')
    if not checkpoint.exists():pytest.skip('Train the local baseline first')
    g=Generator(checkpoint);req=GenerateRequest(engine='cvae',budget=16,taps=[Tap(beat=0)])
    notes=g.decode(np.zeros(32),req)
    assert notes==g.decode(np.zeros(32),req)
    assert notes and all(0<=n.beat<8 and 0<n.velocity<=1 for n in notes)


def test_native_delta_timestamps_survive_poll_jitter():
    class Queue:
        def __init__(self):self.items=[]
        def get_message(self):return self.items.pop(0) if self.items else None
    port=Input.__new__(Input);port.last_stamp=None;port.rt=Queue()
    port.rt.items=[([0xFA],0),([0xF8],.01)]
    assert [t for _,t in port.drain(.012)]==pytest.approx([.002,.012])
    port.rt.items=[([0xF8],.02)]
    assert port.drain(.0335)[0][1]==pytest.approx(.032)


def test_external_start_waits_for_first_pulse_without_duplicate_downbeat():
    now=[0.];e=MidiEngine(lambda:now[0]);e.set_tempo(120,'external');e.output=Output()
    e.play(Pattern(notes=[Note(drum=0,beat=0,velocity=.8)]))
    e.receive(mido.Message('start'),{'clock'});now[0]=.01;e.advance(now[0])
    assert not any(m.type=='note_on' for m in e.output.messages)
    e.receive(mido.Message('clock'),{'clock'});e.advance(now[0]);e.advance(now[0]+.002)
    assert sum(m.type=='note_on' for m in e.output.messages)==1


def test_external_stopped_selection_is_ready_for_next_start():
    e=MidiEngine(lambda:0.);e.set_tempo(120,'external')
    e.play(Pattern(id='a'));e.play(Pattern(id='b'))
    assert e.pattern.id=='b' and e.pending is None


def test_tap_channel_and_note_filter():
    e=MidiEngine(lambda:0.);e.arm(0);e.tap_channel=2;e.tap_note=60
    for channel,note in [(1,60),(2,61),(2,60)]:
        e.receive(mido.Message('note_on',channel=channel,note=note,velocity=80),{'tap'})
    assert len(e.take)==1


def test_bunched_clock_pulses_do_not_bias_tempo():
    c=Clock();c.feed(mido.Message('start'),0);c.feed(mido.Message('clock'),0)
    now=0.
    for i in range(48):
        now+=.001 if i%2==0 else 2/96-.001
        c.feed(mido.Message('clock'),now)
    assert c.bpm==pytest.approx(240)
