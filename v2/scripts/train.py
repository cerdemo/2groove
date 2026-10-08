"""Reproducible engineering baseline; keep held-out test untouched while tuning."""
import argparse
import json
from pathlib import Path
import random
import sys
import time
import numpy as np
import torch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from groove.model import CVAE,loss_function


def batch_taps(y,rng,augment):
    result=np.zeros((len(y),32,3),np.float32);roles=np.zeros(len(y),np.int64)
    for b,drum in enumerate(y):
        role=int(rng.integers(2));roles[b]=role
        parts=[5,6,7] if role else [0,1]
        for i in range(32):
            active=[p for p in parts if drum[i,p,0]]
            if active:
                p=max(active,key=lambda p:drum[i,p,1]);result[b,i]=drum[i,p]
        if augment:
            keep=rng.random(32)>.12;result[b,~keep]=0
            hits=result[b,:,0]>0
            result[b,hits,2]=np.clip(result[b,hits,2]+rng.normal(0,.035,hits.sum()),-.5,.5)
    return torch.from_numpy(result),torch.from_numpy(roles)


def train(args):
    torch.manual_seed(args.seed);random.seed(args.seed);np.random.seed(args.seed);torch.set_num_threads(args.threads)
    datasets={s:np.load(args.data/f'{s}.npz') for s in ('train','validation')}
    model=CVAE();optimizer=torch.optim.AdamW(model.parameters(),lr=.001,weight_decay=1e-4)
    rng=np.random.default_rng(args.seed);logs=[];best=float('inf');started=time.perf_counter()
    args.out.parent.mkdir(parents=True,exist_ok=True)
    for epoch in range(args.epochs):
        row={'epoch':epoch+1};beta=.02*min(1,(epoch+1)/5)
        for split,ds in datasets.items():
            training=split=='train';model.train(training)
            indexes=rng.permutation(len(ds['drums'])) if training else np.arange(len(ds['drums']))
            totals=[];metrics=[]
            local_rng=rng if training else np.random.default_rng(991)
            for start in range(0,len(indexes),args.batch):
                ix=indexes[start:start+args.batch];y=ds['drums'][ix]
                taps,role=batch_taps(y,local_rng,training)
                target=torch.from_numpy(y);style=torch.from_numpy(ds['style'][ix]).long();bpm=torch.from_numpy(ds['bpm'][ix])
                with torch.set_grad_enabled(training):
                    heads,dist=model(taps,style,role,bpm,target,sample=training)
                    loss,parts=loss_function(heads,target,dist,beta=.02 if not training else beta)
                    if training:
                        optimizer.zero_grad();loss.backward();torch.nn.utils.clip_grad_norm_(model.parameters(),1);optimizer.step()
                totals.append((float(loss.detach()),len(ix)));metrics.append(parts)
            row[split]=sum(v*n for v,n in totals)/sum(n for _,n in totals)
            row[split+'_components']={k:sum(m[k] for m in metrics)/len(metrics) for k in metrics[0]}
        row['seconds']=round(time.perf_counter()-started,2);logs.append(row);print(json.dumps(row),flush=True)
        if row['validation']<best:
            best=row['validation']
            temporary=args.out.with_suffix('.tmp')
            torch.save(dict(architecture={'hidden':48,'latent':32},state_dict=model.state_dict(),
                metadata={'epoch':epoch+1,'validation_loss':best,'seed':args.seed,
                    'dataset':'GMD official performance split; exact HVO dedup',
                    'status':'engineering baseline; not human-validated',
                    'unsupported_role':'complement uses untrained role embedding; use procedural for complement'}),temporary)
            temporary.replace(args.out)
        args.out.with_suffix('.training.json').write_text(json.dumps(logs,indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--data',type=Path,default=Path('data/gmd'))
    p.add_argument('--out',type=Path,default=Path('artifacts/cvae.pt'));p.add_argument('--epochs',type=int,default=12)
    p.add_argument('--batch',type=int,default=128);p.add_argument('--threads',type=int,default=4);p.add_argument('--seed',type=int,default=42)
    train(p.parse_args())
