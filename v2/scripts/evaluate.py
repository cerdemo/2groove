"""Prior-generation diagnostics on validation; not a perceptual quality claim.

Uses pseudo-taps, so numbers do not establish generalization to human tapping.
"""
import json
from pathlib import Path
import sys
import time
import numpy as np
import torch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from groove.model import load_checkpoint
from groove.events import GenerateRequest,Tap,notes_tensor
from groove.generation import Generator
from train import batch_taps


def main():
    data=np.load('data/gmd/validation.npz');model,metadata=load_checkpoint(Path('artifacts/cvae.pt'))
    n=min(256,len(data['drums']));target=data['drums'][:n];taps,roles=batch_taps(target,np.random.default_rng(991),False)
    style=torch.from_numpy(data['style'][:n]).long();bpm=torch.from_numpy(data['bpm'][:n]);report={}
    with torch.inference_mode():
        for mode,input_taps in [('matched',taps),('shuffled_taps',taps.roll(1,0)),('zero_taps',torch.zeros_like(taps))]:
            heads,_=model(input_taps,style,roles,bpm,sample=False)
            p=heads[0].sigmoid().numpy()>=.45;y=target[...,0]>0
            tp=(p&y).sum();fp=(p&~y).sum();fn=(~p&y).sum()
            report[mode]={'micro_hit_f1':float(2*tp/max(1,2*tp+fp+fn)),
                          'predicted_density':float(p.sum()/n/8),'target_density':float(y.sum()/n/8)}
    generator=Generator(Path('artifacts/cvae.pt'));search=[]
    for engine in ('procedural','cvae'):
        for algorithm in ('random','map_elites'):
            for seed in (11,22,33):
                req=GenerateRequest(engine=engine,algorithm=algorithm,seed=seed,budget=256,
                    taps=[Tap(beat=b) for b in (0,1.5,2,3.5,4,5.5,6,7.5)])
                start=time.perf_counter();result=generator.search(req)
                search.append({k:result[k] for k in ('engine','algorithm','coverage','qd_score','unique_phenotypes')}|{'seed':seed,'seconds':time.perf_counter()-start})
    result={'checkpoint':metadata,'split':'first 256 validation windows in manifest order; diagnostic subset, not test',
            'prior_diagnostics':report,'search':search,
            'caveats':['Pseudo-taps are derived from target drums; no human tap validation.',
                'F1 is reference overlap, not co-creative musical quality.',
                'One fixed search context and three seeds are a smoke benchmark, not general superiority evidence.',
                'Official test remains untouched; no drummer-disjoint claim.']}
    Path('artifacts/evaluation.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))

if __name__=='__main__':main()
