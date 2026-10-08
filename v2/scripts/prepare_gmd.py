"""Fetch the official MIDI-only GMD and build source-aware, deduplicated arrays.

CC BY 4.0: Gillick et al. (2019), https://magenta.tensorflow.org/datasets/groove
Do not mix the old indexed NPY files into a new benchmark without source provenance.
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import sys
import urllib.request
import zipfile
import numpy as np
import mido
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from groove.events import STYLES

URL='https://storage.googleapis.com/magentadata/datasets/groove/groove-v1.0.0-midionly.zip'
SHA='651cbc524ffb891be1a3e46d89dc82a1cecb09a57c748c7b45b844c4841dcc1e'
# Roland TD-11 mapping, not a generic GM pitch folding table.
MAP={36:0,38:1,40:1,37:1,43:2,58:2,45:3,47:3,48:4,50:4,46:5,26:5,42:6,22:6,44:6,51:7,59:7,53:7,49:8,55:8,57:8,52:8}


def prepare(out,download=True):
    out.mkdir(parents=True,exist_ok=True);archive=out/'gmd.zip'
    if not archive.exists():
        if not download:raise FileNotFoundError('GMD archive not found')
        urllib.request.urlretrieve(URL,archive)
    if hashlib.sha256(archive.read_bytes()).hexdigest()!=SHA:raise ValueError('GMD checksum mismatch')
    raw=out/'gmd';raw.mkdir(exist_ok=True)
    with zipfile.ZipFile(archive) as z:
        for n in z.namelist():
            if not (raw/n).resolve().is_relative_to(raw.resolve()):raise ValueError('Unsafe archive path')
        z.extractall(raw)
    info=next(raw.rglob('info.csv'));base=info.parent
    records=[];stats=dict(collisions=0,unknown_pitches=0,skipped_meter=0,skipped_short=0)
    for row in csv.DictReader(info.open()):
        if row['time_signature']!='4-4':stats['skipped_meter']+=1;continue
        mid=mido.MidiFile(base/row['midi_filename']);absolute=0;notes=[]
        for msg in mido.merge_tracks(mid.tracks):
            absolute+=msg.time
            if msg.type=='note_on' and msg.velocity>0:
                if msg.note not in MAP:stats['unknown_pitches']+=1;continue
                notes.append((absolute/mid.ticks_per_beat,MAP[msg.note],msg.velocity/127))
        length=absolute/mid.ticks_per_beat
        if length<8:stats['skipped_short']+=1;continue
        primary=row['style'].split('/')[0].lower().replace('-','')
        style={'dance':'electronic','afrocuban':'latin','afrobeat':'latin'}.get(primary,primary)
        style_id=STYLES.index(style) if style in STYLES else 0
        for start in np.arange(0,length-8+1e-6,8):
            y=np.zeros((32,9,3),np.float32)
            for beat,part,vel in notes:
                if not start<=beat<start+8:continue
                local=(beat-start)*4;k=round(local)
                # Preserve cyclic pickups explicitly; track collisions instead of silent overwrite.
                k%=32
                if y[k,part,0]:stats['collisions']+=1
                if vel>=y[k,part,1]:y[k,part]=[1,vel,local-round(local)]
            if not y[...,0].any():continue
            fingerprint=hashlib.sha256(np.round(y,3).tobytes()).hexdigest()
            records.append(dict(y=y,style=style_id,bpm=float(row['bpm']),split=row['split'],
                source=row['midi_filename'],group=row['id'],start=float(start),hash=fingerprint))
    # Remove ALL exact cross-split duplicates (not just a duplicate from the test split).
    by_hash={}
    for r in records:by_hash.setdefault(r['hash'],set()).add(r['split'])
    bad={h for h,ss in by_hash.items() if len(ss)>1};seen=set();kept=[]
    for r in records:
        if r['hash'] in bad or r['hash'] in seen:continue
        seen.add(r['hash']);kept.append(r)
    for split in ('train','validation','test'):
        rows=[r for r in kept if r['split']==split]
        np.savez_compressed(out/f'{split}.npz',drums=np.array([r['y'] for r in rows]),
            style=np.array([r['style'] for r in rows]),bpm=np.array([r['bpm'] for r in rows],np.float32))
    manifest=[{k:v for k,v in r.items() if k!='y'} for r in kept]
    stats.update(raw_segments=len(records),retained=len(kept),cross_split_duplicate_hashes=len(bad),
        splits={sp:sum(r['split']==sp for r in kept) for sp in ('train','validation','test')},
        license='CC BY 4.0',source=URL,source_sha256=SHA,
        scope='Official performance split, exact HVO dedup. Not a drummer-held-out benchmark; near-duplicate audit remains necessary.')
    (out/'manifest.json').write_text(json.dumps(manifest,indent=2))
    (out/'dataset-card.json').write_text(json.dumps(stats,indent=2));print(json.dumps(stats,indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--out',type=Path,default=Path('data/gmd'))
    prepare(p.parse_args().out)
