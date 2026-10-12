"""Create balanced training indexes/weights and fixed evaluation subsets after a passed audit."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from groove.pretraining.plan import prepare


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--audit',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True,help='Fresh plan directory')
    p.add_argument('--seed',type=int,default=42)
    p.add_argument('--synthetic-ratio',type=float,default=1.,help='Maximum retained synthetic/original train-row ratio')
    p.add_argument('--max-per-groove',type=int,default=4,help='Maximum retained synthetic rows per parent groove FILE')
    p.add_argument('--max-per-fill',type=int,default=32,help='Maximum retained synthetic rows per parent fill FILE')
    p.add_argument('--unknown-fill-mass',type=float,default=.1,help='Requested unknown-label sampling mass; missing classes renormalize')
    a=p.parse_args()
    try:r=prepare(a.audit,a.output,a.seed,a.synthetic_ratio,a.max_per_groove,a.max_per_fill,a.unknown_fill_mass,progress=lambda s:print(s,flush=True))
    except (ValueError,OSError) as e:p.error(str(e))
    print(json.dumps({'train':r['train'],'evaluation':r['evaluation'],'warnings':r['warnings']},indent=2))
    print('Plan:',a.output/'plan.json')


if __name__=='__main__':main()
