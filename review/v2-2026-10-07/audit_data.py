"""Read-only audit of the legacy arrays. Run with numpy; no training/import of app code."""
from pathlib import Path
from collections import Counter, defaultdict
import hashlib, json, math
import numpy as np

ROOT=Path('/Users/cagrierdem/Desktop/ongoing/POSTDOC/dB_workspace/drumbot/dB_dat')
OUT=Path(__file__).parent/'data-audit.json'

def ids(path):
    return {p.stem.split('_',1)[1]:p for p in path.glob('*.npy')}

result={'scope':'All base npy_pulse and npy_pulse_tap arrays; extended inventory only. Local copies are not proven to be the deployed training version.','root':str(ROOT),'inventory':{}}
for name in ['npy_pulse','npy_pulse_tap','npy_pulse_extended','npy_tap_pulse_extended']:
    result['inventory'][name]={p.name:len(list(p.glob('*.npy'))) for p in (ROOT/name).iterdir() if p.is_dir()}
sets={k:ids(ROOT/'npy_pulse'/f'{k}_matrices') for k in 'hvom'}
sets['tap']=ids(ROOT/'npy_pulse_tap'/'h_matrices')
common=set.intersection(*(set(x) for x in sets.values()))
result['base_pairing']={'common_ids':len(common),'missing_from_union':{k:len(set.union(*(set(x) for x in sets.values()))-set(v)) for k,v in sets.items()}}
counts=Counter(); shapes=defaultdict(Counter); hashes=defaultdict(list); tap_targets=defaultdict(set); mins=defaultdict(lambda:float('inf'));maxs=defaultdict(lambda:float('-inf'))
for key in sorted(common):
    a={k:np.load(v[key],allow_pickle=False) for k,v in sets.items()}
    for k,v in a.items():
        shapes[k][str(v.shape)]+=1
        counts[k+'_nonfinite']+=int((~np.isfinite(v)).sum())
        mins[k]=min(mins[k],float(v.min()));maxs[k]=max(maxs[k],float(v.max()))
    h,v,o,t=a['h'],a['v'],a['o'],a['tap']
    counts['examples']+=1;counts['empty_grooves']+=int(h.sum()==0);counts['empty_taps']+=int(t.sum()==0)
    counts['hit_cells']+=int(h.sum());counts['all_cells']+=h.size
    counts['polyphonic_steps']+=int((h.sum(axis=1)>1).sum());counts['active_steps']+=int((h.sum(axis=1)>0).sum());counts['all_steps']+=h.shape[0]
    counts['hit_with_zero_velocity']+=int(((h>0)&(v==0)).sum())
    counts['tap_equals_cymbal_union']+=int(np.array_equal(t.reshape(-1),(h[:,5:8].max(axis=1))))
    counts['tap_equals_full_union']+=int(np.array_equal(t.reshape(-1),(h.max(axis=1))))
    signature=hashlib.sha256(b''.join(a[k].tobytes() for k in 'hvom')).hexdigest()
    hashes[signature].append(key)
    tap_targets[t.tobytes()].add(signature)
result['base_stats']=dict(counts)
result['shapes']={k:dict(v) for k,v in shapes.items()};result['min']=dict(mins);result['max']=dict(maxs)
result['duplicates']={'unique_hvom':len(hashes),'excess_exact_hvom':sum(len(x)-1 for x in hashes.values()),'unique_taps':len(tap_targets),'tap_patterns_with_multiple_hvom':sum(len(x)>1 for x in tap_targets.values())}
# sklearn TimeSeriesSplit default geometry: test_size=n//(n_splits+1), expanding prefix train.
N=len(common);test_size=N//12
ordered=sorted(sets['h'],key=lambda i:sets['h'][i].name)
folds=[]
for start in range(N-11*test_size,N,test_size):
    folds.append((set(ordered[:start]),set(ordered[start:start+test_size])))
result['split_check']=[{'training_iteration':i,'train_n':len(folds[i][0]),'validation_n':len(folds[i-1][1]),'overlap_n':len(folds[i][0]&folds[i-1][1])} for i in range(1,len(folds))]
result['softmax_demo']={'target':[1,1,0,0,0,0,0,0,0],'perfect_multihit_impossible':'sum(softmax)=1; target sum=2','silence_categorical_crossentropy':0,'second_softmax_max_at_temperature_1':math.exp(1)/(math.exp(1)+8),'default_threshold':0.35}
OUT.write_text(json.dumps(result,indent=2,ensure_ascii=False))
print(json.dumps(result,indent=2,ensure_ascii=False))
