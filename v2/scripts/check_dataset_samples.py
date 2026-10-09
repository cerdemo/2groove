"""Read-only stratified sample audit of local collections; copied samples/results stay under --output."""
import argparse
import csv
import hashlib
import heapq
import json
from pathlib import Path
import shutil
import subprocess
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from groove.ingest.schema import Config,Source,WebConfig
from groove.ingest.pipeline import run
from groove.ingest.export import export_hvo


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True)
    p.add_argument('--per-role',type=int,default=12)
    a=p.parse_args()
    if a.per_role<1:p.error('--per-role must be positive')
    if a.output.exists():p.error('Use a fresh output directory')
    a.output.mkdir(parents=True);inventory=[];sources=[]
    for index,d in enumerate(sorted(a.root.iterdir())):
        if not d.is_dir():continue
        heaps={'fill':[],'other':[]};count=0
        proc=subprocess.Popen(['rg','--files','--hidden',str(d)],stdout=subprocess.PIPE,text=True)
        for line in proc.stdout:
            path=Path(line.rstrip('\n'))
            if path.suffix.lower() not in ('.mid','.midi','.kar','.smf','.rmi','.rmid'):continue
            count+=1;relative=path.relative_to(d).as_posix();category='fill' if 'fill' in relative.lower() else 'other'
            rank=int(hashlib.sha256(relative.encode()).hexdigest(),16)
            heap=heaps[category];item=(-rank,relative)
            if len(heap)<a.per_role:heapq.heappush(heap,item)
            elif item>heap[0]:heapq.heapreplace(heap,item)
        if proc.wait() not in (0,1):raise RuntimeError(f'rg failed for {d}')
        selected=sorted(relative for heap in heaps.values() for _,relative in heap)
        sid=f'collection-{index:02d}';dest=a.output/'samples'/d.name;entries=[]
        for relative in selected:
            origin=d/relative;target=dest/relative;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(origin,target)
            side=origin.with_suffix('.metadata.json')
            if side.is_file():shutil.copyfile(side,target.with_suffix('.metadata.json'))
            entries.append(dict(relative=relative,sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
        adapter='egmd' if (d/'e-gmd-v1.0.0.csv').exists() else 'generic'
        if adapter=='egmd':
            with (d/'e-gmd-v1.0.0.csv').open() as f:
                reader=csv.DictReader(f)
                with (dest/'e-gmd-v1.0.0.csv').open('w') as out:
                    writer=csv.DictWriter(out,fieldnames=reader.fieldnames);writer.writeheader()
                    selected_set=set(selected)
                    for row in reader:
                        if row['midi_filename'] in selected_set:writer.writerow(row)
        if selected:sources.append(Source(id=sid,path=str(dest.resolve()),adapter=adapter,drum_map='roland_td11' if adapter=='egmd' else 'gm'))
        inventory.append(dict(id=sid,dataset=d.name,root=str(d),midi_candidates=count,samples=entries,adapter=adapter))
        print(d.name,count,'candidates;',len(selected),'samples',flush=True)
    config=Config(sources=sources,output=str((a.output/'canonical').resolve()),
        web=WebConfig(mode='off',cache=str((a.output/'web-cache').resolve())))
    (a.output/'sample-config.json').write_text(config.model_dump_json(indent=2))
    (a.output/'inventory.json').write_text(json.dumps(inventory,indent=2))
    canonical,report=run(config,progress=lambda _:None)
    card=export_hvo(canonical,a.output/'hvo')
    from collections import Counter
    rows=[json.loads(line) for line in (canonical/'manifest.jsonl').read_text().splitlines()]
    details=[]
    for collection in inventory:
        subset=[r for r in rows if r['source_id']==collection['id']]
        details.append(dict(dataset=collection['dataset'],candidates=collection['midi_candidates'],sampled=len(subset),
            statuses=dict(Counter(r['status'] for r in subset)),
            roles=dict(Counter(r.get('metadata',{}).get('role',{}).get('value','unknown') for r in subset)),
            reasons=dict(Counter(reason for r in subset for reason in r['reasons']))))
    result=dict(canonical_run=str(canonical),collections=details,canonical_report=report,hvo_card=card,
                limitations=['Deterministic path-hash samples stratified by fill-like filename; not a classifier accuracy estimate.',
                             'Generic GM mapping is unverified for vendor-specific mappings.',
                             'Web disabled; missing metadata reflects local evidence only.',
                             'All MIDI counts are inventory counts, not a full parse audit.'])
    (a.output/'validation.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result,indent=2),flush=True)


if __name__=='__main__':main()
