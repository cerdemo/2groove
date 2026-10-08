"""Explicitly lossy 32×9 HVO adapter, separate from the canonical event corpus."""
from collections import Counter,defaultdict
import gzip
import hashlib
import json
from pathlib import Path
import numpy as np
from ..events import DRUMS,STYLES


def export_hvo(run_path,output,max_collision_rate=.05):
    run_path=Path(run_path);output=Path(output)
    if output.exists():raise FileExistsError('Use a fresh model-export directory')
    output.mkdir(parents=True)
    rows=[json.loads(line) for line in (run_path/'manifest.jsonl').read_text().splitlines()]
    windows=[];stats=Counter();seen_files=set()
    for row in rows:
        if row['status']!='accepted':stats['excluded_'+row['status']]+=1;continue
        if row['percussion_hash'] in seen_files:stats['duplicate_files']+=1;continue
        seen_files.add(row['percussion_hash'])
        with gzip.open(run_path/row['record'],'rt') as f:record=json.load(f)
        meta=record['metadata'];midi=record['midi'];notes=record['percussion_events']
        if 'tempo' not in meta or 'meter' not in meta:stats['missing_initial_tempo_or_meter']+=1;continue
        meter_events={}
        for m in midi['meter_map']:meter_events[m['beat']]=[m['numerator'],m['denominator']]
        meter_events[0]=meta['meter']['value']
        regions=[];previous=None
        for beat,meter in sorted(meter_events.items()):
            if meter!=previous:regions.append((beat,meter));previous=meter
        tempo_events={}
        for t in midi['tempo_map']:tempo_events[t['beat']]=t['bpm']
        tempo_events[0]=meta['tempo']['value']
        tempi=sorted(tempo_events.items())
        labels=meta.get('style',{}).get('value',[])
        coarse={'afrocuban':'latin','afrobeat':'latin','samba':'latin','bossa-nova':'latin','house':'electronic','techno':'electronic','drum-and-bass':'electronic','trap':'hiphop'}
        target_styles={coarse.get(s,s) for s in labels if coarse.get(s,s) in STYLES}
        style=next(iter(target_styles)) if len(target_styles)==1 else 'unknown'
        if style=='unknown':stats['files_with_unknown_model_style']+=1
        for region,(start,meter) in enumerate(regions):
            end=regions[region+1][0] if region+1<len(regions) else midi['duration_beats']
            if meter!=[4,4]:stats['non_four_four_regions']+=1;continue
            for begin in np.arange(start,end-8+1e-8,8):
                stats['candidate_windows']+=1
                bpm=next(value for beat,value in reversed(tempi) if beat<=begin)
                if any(begin<beat<begin+8 and abs(value-bpm)>.01 for beat,value in tempi):stats['tempo_change_windows']+=1;continue
                if not 30<=bpm<=300:stats['unsupported_tempo_windows']+=1;continue
                events=[n for n in notes if begin<=n['onset_beat']<begin+8]
                if not events:stats['empty_windows']+=1;continue
                if any(n['voice'] not in DRUMS for n in events):stats['outside_nine_voice_windows']+=1;continue
                y=np.zeros((32,9,3),np.float32);collisions=0
                for n in events:
                    local=(n['onset_beat']-begin)*4;step=round(local)%32;part=DRUMS.index(n['voice']);v=n['velocity']/127
                    collisions+=int(y[step,part,0]>0)
                    if v>=y[step,part,1]:y[step,part]=[1,v,local-round(local)]
                stats['grid_collisions']+=collisions
                if collisions/len(events)>max_collision_rate:stats['collision_rejected_windows']+=1;continue
                fingerprint=hashlib.sha256(np.round(y,4).tobytes()).hexdigest()
                structural=hashlib.sha256(y[...,0].tobytes()).hexdigest()
                windows.append(dict(y=y,style=STYLES.index(style),bpm=bpm,source=row['id'],start=float(begin),
                    split=row['split'],group=row['split_group'],hash=fingerprint,structure_hash=structural,collisions=collisions))
    splits=defaultdict(set);structure_splits=defaultdict(set)
    for w in windows:splits[w['hash']].add(w['split']);structure_splits[w['structure_hash']].add(w['split'])
    cross={h for h,s in splits.items() if len(s)>1};seen=set();kept=[]
    for w in windows:
        if w['hash'] in cross:stats['cross_split_duplicate_windows']+=1;continue
        if w['hash'] in seen:stats['within_split_duplicate_windows']+=1;continue
        seen.add(w['hash']);kept.append(w)
    for split in ('train','validation','test'):
        group=[w for w in kept if w['split']==split]
        np.savez_compressed(output/f'{split}.npz',drums=np.array([w['y'] for w in group],dtype=np.float32).reshape(-1,32,9,3),
            bpm=np.array([w['bpm'] for w in group],np.float32),style=np.array([w['style'] for w in group],np.int64))
    (output/'manifest.json').write_text(json.dumps([{k:v for k,v in w.items() if k!='y'} for w in kept],indent=2))
    report=dict(adapter='hvo32x9-v1',canonical_run=str(run_path.resolve()),statistics=dict(stats),
        splits={s:sum(w['split']==s for w in kept) for s in ('train','validation','test')},
        cross_split_hvo_hashes=len(cross),structural_overlap_hashes=sum(len(s)>1 for s in structure_splits.values()),
        hash_precision='HVO values rounded to 4 decimal places for duplicate screening',
        structural_overlap_note='Identical hit grids can be common rhythmic vocabulary; reported for near-duplicate audit, not automatically excluded.',
        collision_policy=f'Strongest velocity per cell; reject windows above {max_collision_rate:.1%} collision rate. Canonical corpus is unquantized.')
    (output/'dataset-card.json').write_text(json.dumps(report,indent=2));return report
