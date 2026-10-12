"""View an existing groove encoder run in TensorBoard without retraining."""
import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from groove.representation.monitoring import replay_history


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run', type=Path, required=True, help='Directory containing run.json and metrics.jsonl')
    parser.add_argument('--output', type=Path, help='Fresh output directory; default: RUN/tensorboard-history')
    args = parser.parse_args()
    try:
        report = replay_history(args.run, args.output)
    except (ValueError, OSError) as error:
        parser.error(str(error))
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
