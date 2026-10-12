"""Audit final HVO arrays, provenance, split isolation and dataset distributions."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from groove.pretraining.audit import audit


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--dataset',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True,help='Fresh audit directory')
    p.add_argument('--canonical-run',type=Path,help='Override canonical location if moved')
    p.add_argument('--batch-size',type=int,default=1024)
    a=p.parse_args()
    if a.batch_size<1:p.error('--batch-size must be positive')
    if a.output.exists():p.error('--output must be a fresh directory')
    r=audit(a.dataset,a.output,a.canonical_run,a.batch_size,progress=lambda s:print(s,flush=True))
    print(json.dumps({k:r[k] for k in ('status','errors','warnings')},indent=2))
    print('Full report:',a.output/'audit.json')
    return 0 if r['status']=='passed' else 2


if __name__=='__main__':sys.exit(main())
