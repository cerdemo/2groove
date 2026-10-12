"""Build provenance-preserving human tap/groove pairs from official TapTamDrum MIDI."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from groove.representation.taptam import prepare_pairs

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--seed', type=int, default=42)
    args = parser.parse_args()
    report = prepare_pairs(args.source, args.output, args.seed)
    print(json.dumps({k: report[k] for k in ('patterns', 'pairs', 'hvo_eligible_patterns', 'hvo_eligible_pairs', 'rejected', 'splits', 'cross_split_hashes_quarantined')}, indent=2))
