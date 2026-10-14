"""Run from v2: python -m research.solo_tapping [--port 8766]."""
import argparse
from pathlib import Path
import uvicorn
from .server import Workspace, create_app


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8766)
    parser.add_argument('--pairs', type=Path)
    parser.add_argument('--model', type=Path)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--gmd', type=Path)
    parser.add_argument('--study', type=Path, help='Built listening-study directory (study-build)')
    args = parser.parse_args()
    workspace = Workspace(args.pairs, args.model, args.output, args.gmd, study=args.study)
    uvicorn.run(create_app(workspace), host='127.0.0.1', port=args.port)


if __name__ == '__main__':
    main()
