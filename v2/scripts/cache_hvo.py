"""Materialize audited NPZ arrays as memory-mappable NPY files for a future training loader."""
import argparse
import json
from pathlib import Path
import sys
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from groove.pretraining.audit import SPEC,SPLITS,batches,sha256


def materialize(audit_dir,output,progress=print):
    audit_dir=Path(audit_dir);output=Path(output)
    report=json.loads((audit_dir/'audit.json').read_text())
    if report.get('status')!='passed':raise ValueError('Passed audit required')
    output.mkdir(parents=True,exist_ok=False);artifacts={}
    for split in SPLITS:
        source=Path(report['inputs'][split]['path']);expected=report['inputs'][split]['sha256']
        if sha256(source)!=expected:raise ValueError(f'{split}: input changed; rerun audit')
        folder=output/split;folder.mkdir();count=report['counts'][split]
        arrays={key:np.lib.format.open_memmap(folder/(key+'.npy'),mode='w+',dtype=np.dtype(kind+str(size)),shape=(count,*tail)) for key,(tail,kind,size) in SPEC.items()}
        seen=0
        try:
            for start,ds in batches(source):
                n=len(ds['drums']);seen+=n
                for key,array in arrays.items():array[start:start+n]=ds[key]
                if start//10000!=(start+n)//10000:progress(f'{split}: {seen:,} rows cached')
            if seen!=count:raise ValueError('Array count changed')
            for array in arrays.values():array.flush()
        finally:
            for array in arrays.values():array._mmap.close()
        if sha256(source)!=expected:raise ValueError('Input changed during caching')
        for path in sorted(folder.glob('*.npy')):artifacts[str(path.relative_to(output))]=dict(sha256=sha256(path),bytes=path.stat().st_size)
    result=dict(version='hvo-npy-cache-v1',status='complete',dataset=report['dataset'],audit_sha256=sha256(audit_dir/'audit.json'),
                source_fingerprints={s:report['inputs'][s]['sha256'] for s in SPLITS},counts=report['counts'],arrays=artifacts,
                usage="np.load(cache / 'train/drums.npy', mmap_mode='r', allow_pickle=False)[original_row_indexes]")
    (output/'cache.json').write_text(json.dumps(result,indent=2)+'\n')
    return result


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--audit',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    a=p.parse_args();r=materialize(a.audit,a.output,progress=lambda s:print(s,flush=True));print(json.dumps(r['counts'],indent=2))


if __name__=='__main__':main()
