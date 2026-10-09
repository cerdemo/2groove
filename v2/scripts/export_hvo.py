"""Re-export a canonical run without re-ingesting raw files or repeating web lookups."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from groove.ingest.schema import HVOConfig
from groove.ingest.export import export_hvo


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run',type=Path,required=True,help='Canonical run directory containing manifest.jsonl')
    parser.add_argument('--output',type=Path,required=True,help='Fresh export directory')
    parser.add_argument('--config',type=Path,help='HVO options JSON; otherwise use canonical config hvo section')
    args=parser.parse_args()
    options=HVOConfig.model_validate_json(args.config.read_text()) if args.config else None
    print(json.dumps(export_hvo(args.run,args.output,options=options),indent=2))


if __name__=='__main__':main()
