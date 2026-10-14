import argparse
import json


def main():
    parser = argparse.ArgumentParser(description='Audited real mono-contour benchmark')
    commands = parser.add_subparsers(dest='command', required=True)
    fetch = commands.add_parser('fetch')
    fetch.add_argument('--output', required=True)
    fetch.add_argument('--archive', help='Replay a pinned local ZIP without network access')
    prepare = commands.add_parser('prepare')
    prepare.add_argument('--source', required=True)
    prepare.add_argument('--output', required=True)
    run = commands.add_parser('run')
    run.add_argument('--data', required=True)
    run.add_argument('--output', required=True)
    run.add_argument('--seed', type=int, default=42)
    run.add_argument('--folds', type=int, default=4)
    run.add_argument('--motifs', type=int, default=8)
    run.add_argument('--ridge', type=float, default=.01)
    run.add_argument('--bootstrap', type=int, default=1000)
    args = parser.parse_args()
    if args.command == 'fetch':
        from .source import fetch as acquire
        report = acquire(args.output, args.archive)
        print(f"Pinned {report['revision']}: {len(report['files'])} files")
    elif args.command == 'prepare':
        from .data import prepare as audit
        report = audit(args.source, args.output)
        print(json.dumps({k: v for k, v in report.items() if k not in ('blocks', 'limitations')}, indent=2))
    else:
        from .benchmark import run as benchmark
        benchmark(args.data, args.output, seed=args.seed, folds=args.folds,
                  motifs=args.motifs, ridge=args.ridge, bootstrap=args.bootstrap)


if __name__ == '__main__':
    main()
