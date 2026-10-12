"""Render a bounded review pack (MIDI/WAV, optional piano rolls) from a training plan."""
import argparse
from collections import defaultdict
import hashlib
import json
from pathlib import Path
import sys
import wave
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from groove.pretraining.audit import batches,sha256,SPLITS
from groove.ingest.explore import preview_audio
from groove.events import DRUMS,Pattern,Note,midi_bytes


def render(plan_dir,output,limit=24,plots=False):
    plan_dir=Path(plan_dir);output=Path(output)
    if limit<1:raise ValueError('max examples must be positive')
    plan=json.loads((plan_dir/'plan.json').read_text())
    if plan.get('status')!='complete':raise ValueError('Completed plan required')
    review_path=plan_dir/'review-examples.jsonl'
    if sha256(review_path)!=plan['artifacts']['review-examples.jsonl']:raise ValueError('Review indexes changed')
    groups=defaultdict(list)
    for line in review_path.read_text().splitlines():
        row=json.loads(line)
        if row['split'] not in SPLITS or type(row['index'])!=int or row['index']<0:raise ValueError('Invalid review index')
        groups[(row['split'],row['synthetic'],row['has_fill'])].append(row)
    for rows in groups.values():rows.sort(key=lambda r:hashlib.sha256(f"{plan['seed']}:{r['split']}:{r['index']}".encode()).hexdigest())
    chosen=[]
    while groups and len(chosen)<limit:
        for key in sorted(list(groups)):
            chosen.append(groups[key].pop(0))
            if not groups[key]:del groups[key]
            if len(chosen)==limit:break
    output.mkdir(parents=True,exist_ok=False);completed=[]
    if plots:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        from groove.ingest.explore import piano_roll
    for split in SPLITS:
        wanted={r['index']:r for r in chosen if r['split']==split}
        if not wanted:continue
        path=Path(plan['dataset'])/(split+'.npz')
        if sha256(path)!=plan['inputs'][split]['sha256']:raise ValueError('Dataset changed; rerun audit')
        for start,ds in batches(path):
            indexes=[i for i in wanted if start<=i<start+len(ds['drums'])]
            for index in indexes:
                row=wanted.pop(index);j=index-start;y=ds['drums'][j];bpm=float(ds['bpm'][j])
                events=[dict(onset_beat=((int(step)+float(y[step,voice,2]))/4)%8,
                    voice=DRUMS[voice],velocity=float(y[step,voice,1])*127) for step,voice in np.argwhere(y[...,0]==1)]
                pattern=Pattern(bpm=bpm,notes=[Note(drum=DRUMS.index(n['voice']),beat=n['onset_beat'],velocity=n['velocity']/127) for n in events])
                stem=f'{split}-{index}';(output/(stem+'.mid')).write_bytes(midi_bytes(pattern))
                audio,sr=preview_audio(events,bpm)
                with wave.open(str(output/(stem+'.wav')),'wb') as wav:
                    wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(sr)
                    wav.writeframes((np.clip(audio,-1,1)*32767).astype('<i2').tobytes())
                fill=float(ds['fill_start_beat'][j]);fill=fill if np.isfinite(fill) else None
                if plots:
                    fig=piano_roll(events,bpm=bpm,fill_start=fill,title=stem)
                    fig.savefig(output/(stem+'.png'));plt.close(fig)
                completed.append(dict(row,bpm=bpm,fill_start_beat=fill,midi=stem+'.mid',audio=stem+'.wav',
                    plot=stem+'.png' if plots else None,review_status='pending',notes=''))
            if not wanted:break
        if wanted:raise ValueError('Review indexes absent from arrays')
    (output/'review.json').write_text(json.dumps(dict(examples=completed,
        instructions=['Inspect tempo/microtiming, drum identity, fill boundary and continuity at the join.',
                      'Check source annotations for questionable labels; this pack is not automatic approval.',
                      'WAV uses synthesized nine-voice sounds, not the source VST. MIDI quantizes timing to 960 PPQ.'],
        plan_sha256=sha256(plan_dir/'plan.json')),indent=2)+'\n')
    return len(completed)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--plan',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    p.add_argument('--max-examples',type=int,default=24);p.add_argument('--plots',action='store_true',help='Requires matplotlib')
    a=p.parse_args()
    print('Review examples:',render(a.plan,a.output,a.max_examples,a.plots))


if __name__=='__main__':main()
