"""Lossless inspection in tick/quarter-beat coordinates; no grid quantization."""
from collections import defaultdict, deque
import io
import mido
from .discover import unwrap_rmid


def parse(data,policy):
    midi=mido.MidiFile(file=io.BytesIO(unwrap_rmid(data)),clip=False)
    if midi.ticks_per_beat<=0:raise ValueError('smpte_time_division_requires_adapter')
    if midi.type==2:raise ValueError('asynchronous_type2_requires_sequence_adapter')
    ppq=midi.ticks_per_beat;events=[];texts=[];tracks=[];warnings=[];end_tick=0
    for track_id,track in enumerate(midi.tracks):
        tick=0;port=0;names=[];instruments=[];prefix=None;label_scopes=[]
        for index,msg in enumerate(track):
            tick+=msg.time
            if tick<0:raise ValueError('negative_tick')
            if msg.type=='midi_port':port=msg.port
            if msg.type=='channel_prefix':prefix=msg.channel
            elif hasattr(msg,'channel'):prefix=None
            events.append((tick,track_id,index,port,msg))
            if len(events)>policy.max_events:raise ValueError('event_count_limit')
            if msg.type in ('track_name','instrument_name','text','copyright','marker','cue_marker','lyrics'):
                text=getattr(msg,'name',getattr(msg,'text',''))
                texts.append(dict(type=msg.type,text=text,track=track_id,tick=tick))
                if msg.type=='track_name':names.append(text)
                if msg.type=='instrument_name':instruments.append(text)
                if msg.type in ('track_name','instrument_name'):label_scopes.append(dict(text=text,channel=prefix,tick=tick))
        end_tick=max(end_tick,tick);tracks.append(dict(index=track_id,names=names,instruments=instruments,label_scopes=label_scopes,end_tick=tick))
    events.sort(key=lambda e:(e[0],e[1],e[2]))
    state=defaultdict(lambda:dict(program=None,bank_msb=0,bank_lsb=0,epoch=0))
    active=defaultdict(deque);notes=[];meta=[];controls=[];sysex=[];tempo=[];meter=[];orphans=0;gm_mode=None
    for tick,track_id,index,port,msg in events:
        route=(port,getattr(msg,'channel',0));s=state[route]
        if msg.is_meta:
            raw=msg.dict();raw.pop('time',None)
            raw={k:list(v) if isinstance(v,(bytes,bytearray,tuple)) else v for k,v in raw.items()}
            meta.append(dict(track=track_id,tick=tick,event=raw))
            if msg.type=='set_tempo':
                if msg.tempo<=0:raise ValueError('invalid_tempo')
                tempo.append(dict(tick=tick,beat=tick/ppq,microseconds_per_quarter=msg.tempo,bpm=60_000_000/msg.tempo,track=track_id))
            if msg.type=='time_signature':meter.append(dict(tick=tick,beat=tick/ppq,numerator=msg.numerator,denominator=msg.denominator,track=track_id))
        elif msg.type=='sysex':
            payload=list(msg.data);sysex.append(dict(tick=tick,track=track_id,data=payload))
            if len(payload)>=4 and payload[0]==0x7e and payload[2]==9 and payload[3] in (1,3):gm_mode='gm2' if payload[3]==3 else 'gm1'
            else:warnings.append('uninterpreted_sysex')
        elif msg.type=='program_change':
            s['program']=msg.program;s['epoch']+=1
            controls.append(dict(track=track_id,port=port,tick=tick,event=msg.dict()))
        elif msg.type=='control_change':
            if msg.control in (0,32):s['bank_msb' if msg.control==0 else 'bank_lsb']=msg.value;s['epoch']+=1
            controls.append(dict(track=track_id,port=port,tick=tick,event=msg.dict()))
        elif msg.type=='note_on' and msg.velocity>0:
            n=dict(track=track_id,port=port,channel=msg.channel,pitch=msg.note,velocity=msg.velocity,
                onset_tick=tick,onset_beat=tick/ppq,offset_tick=None,duration_beats=None,
                program=s['program'],bank_msb=s['bank_msb'],bank_lsb=s['bank_lsb'],epoch=s['epoch'])
            active[(port,msg.channel,msg.note)].append(len(notes));notes.append(n)
        elif msg.type=='note_off' or (msg.type=='note_on' and msg.velocity==0):
            key=(port,msg.channel,msg.note)
            if active[key]:
                n=notes[active[key].popleft()];n['offset_tick']=tick;n['duration_beats']=(tick-n['onset_tick'])/ppq
            else:orphans+=1
        else:controls.append(dict(track=track_id,port=port,tick=tick,event=msg.dict()))
    if any(active.values()):warnings.append('missing_note_off')
    if orphans:warnings.append('orphan_note_off')
    if not notes:raise ValueError('no_note_events')
    return dict(format=midi.type,ppq=ppq,end_tick=end_tick,duration_beats=end_tick/ppq,tracks=tracks,
                notes=notes,metadata_events=meta,texts=texts,tempo_map=tempo,meter_map=meter,
                control_events=controls,sysex=sysex,gm_mode=gm_mode,warnings=sorted(set(warnings)),
                orphan_note_offs=orphans)
