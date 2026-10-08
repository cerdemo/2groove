"""Isolated native CoreMIDI/RtMidi loopback; never connects to user/DAW ports."""
import json
import faulthandler
from pathlib import Path
import sys
import time
import uuid
import mido
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from groove.midi_engine import MidiEngine
from groove.events import Pattern,Note
from groove.native_midi import Input


def main():
    faulthandler.dump_traceback_later(15,exit=True)
    suffix=uuid.uuid4().hex[:8];received=[]
    print('Creating isolated virtual source',flush=True)
    source=mido.open_output('2groove QA source '+suffix,virtual=True)
    print('Creating isolated virtual sink',flush=True)
    sink=Input('2groove QA sink '+suffix,virtual=True)
    engine=MidiEngine()
    try:
        print('Connecting engine to QA ports',flush=True)
        engine.configure(tap_input=source.name,clock_input=source.name,output=sink.name)
        engine.set_tempo(240,'external');engine.start_thread();engine.arm()
        engine.play(Pattern(notes=[Note(drum=0,beat=i,velocity=.8) for i in range(8)]))
        print('Sending clock and taps',flush=True)
        source.send(mido.Message('start'));start=time.perf_counter()+.02
        for tick in range(192):
            deadline=start+tick/96
            while time.perf_counter()<deadline:time.sleep(.0003)
            source.send(mido.Message('clock'))
            if tick%24==0:source.send(mido.Message('note_on',note=60,velocity=100))
        source.send(mido.Message('stop'));time.sleep(.05)
        received=[(stamp,msg) for msg,stamp in sink.drain(time.perf_counter())]
        on=[(t,m) for t,m in received if m.type=='note_on' and m.velocity>0]
        offs=[m for _,m in received if m.type=='note_off']
        result=dict(received_hits=len(on),received_note_offs=len(offs),captured_taps=len(engine.take),
                    bpm=engine.clock.bpm,dropped=engine.dropped,
                    scheduler_late_ms_p95=engine.state()['scheduler_late_ms_p95'],
                    scope='Native virtual-port loopback only; no physical interface, DAW or VST audio latency measurement')
        print(json.dumps(result,indent=2),flush=True)
        assert len(engine.take)==8 and len(on)==8 and len(offs)==len(on),result
        assert abs(engine.clock.bpm-240)<10
    finally:
        engine.close();source.close();sink.close();faulthandler.cancel_dump_traceback_later()
    result['clean_shutdown']=True
    out=Path('artifacts/midi-loopback.json');out.parent.mkdir(exist_ok=True);out.write_text(json.dumps(result,indent=2))

if __name__=='__main__':main()
