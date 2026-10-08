"""Isolate original arr2midi arithmetic via AST. Lightweight event containers replace
Mido; denorm=False avoids sklearn. This checks timing arithmetic, not MIDI serialization."""
import ast,json
from pathlib import Path
import numpy as np
class Message:
    def __init__(self,type,**kw):self.type=type;self.time=kw.pop('time',0);self.__dict__.update(kw)
class MetaMessage(Message):pass
class MidiTrack(list):pass
class MidiFile:
    def __init__(self,ticks_per_beat):self.ticks_per_beat=ticks_per_beat;self.tracks=[]
def bpm2tempo(bpm):return round(60000000/bpm)
p=Path(__file__).resolve().parents[2]/'db_vm/gen.py'
tree=ast.parse(p.read_text()); names={'dynamic_tolerance','apply_even_adjustments','arr2midi'}
ns=dict(Message=Message,MetaMessage=MetaMessage,MidiTrack=MidiTrack,MidiFile=MidiFile,bpm2tempo=bpm2tempo)
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in names],type_ignores=[]),str(p),'exec'),ns)
def run(h,o):
    m=ns['arr2midi'](h.copy(),o.copy(),np.full((32,9),100),[4,4,500000],120,denorm=False,verbose=False,tolerance=0.3)
    t=0;ons=[]
    for msg in m.tracks[0]:
        t+=msg.time
        if msg.type=='note_on':ons.append({'note':msg.note,'tick':t})
    return {'onsets':ons,'duration_ticks':t}
h=np.zeros((32,9));o=np.zeros_like(h);h[0,0]=1
result={'method':__doc__,'single_hit_at_tick_0':{'expected_tick':0,'actual':run(h,o)}}
try:run(np.zeros_like(h),o)
except Exception as e:result['silence']={'exception':type(e).__name__,'message':str(e)}
# Disable spreading solely to isolate cumulative offset bug.
ns['apply_even_adjustments']=lambda track,discrepancy:None
h[0,1]=1;h[1,0]=1;o[0,1]=0.1
result['offset_accumulation_isolated']={'expected_onsets':[0,48,120],'actual':run(h,o)}
assert result['single_hit_at_tick_0']['actual']['onsets'][0]['tick'] == 1920
assert result['silence']['exception'] == 'ZeroDivisionError'
assert [x['tick'] for x in result['offset_accumulation_isolated']['actual']['onsets']] == [0,49,169]
Path(__file__).with_name('export-repro.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
