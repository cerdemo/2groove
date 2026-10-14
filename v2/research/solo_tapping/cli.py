"""Offline research entry point; never modifies source data or old checkpoints."""
import argparse
from dataclasses import asdict
import json
from pathlib import Path

import numpy as np

from groove.pretraining.audit import sha256
from .data import SoloPairs, audit_pretraining
from .diagnostics import archive_copy_report, diagnose
from .evaluation import evaluate
from .model import FitConfig, LocalCompatibility, fit
from .scoring import ConservationScorer
from .search import SearchConfig, Playability, search, save_search
from .study import build_study, study_report


def write_json(path, value):
    Path(path).write_text(json.dumps(value, indent=2, allow_nan=False) + '\n')


def code_hashes():
    root = Path(__file__).resolve().parents[2]
    paths = [Path(__file__).parent / f'{name}.py' for name in
             ('cli', 'data', 'diagnostics', 'evaluation', 'features', 'model', 'scoring',
              'search', 'study')]
    paths.extend(root / 'groove/representation' / name for name in ('alignment_data.py', 'taptam.py'))
    return {str(p.relative_to(root)): sha256(p) for p in sorted(paths)}


def run(args):
    if args.command == 'study-report':
        report = study_report(args.study)
        if args.out is not None:
            if args.out.exists():
                raise ValueError('Report output already exists; choose a fresh path')
            args.out.parent.mkdir(parents=True, exist_ok=True)
            write_json(args.out, report)
        print(json.dumps(report, indent=2))
        return report
    corpus = SoloPairs(args.pairs)
    if args.command == 'study-build':
        card = build_study(corpus, args.search, args.out, args.seed, args.max_sources)
        print(json.dumps(card, indent=2))
        return card
    if args.command == 'fit':
        config = FitConfig(motifs=args.motifs, seed=args.seed, iterations=args.iterations,
                           offset_channel=not args.no_offset_channel, onset_term=args.onset_term)
        config.validate()
        overlap = audit_pretraining(corpus.patterns, args.pretraining_manifest)
        args.out.mkdir(parents=True, exist_ok=False)
        write_json(args.out / 'audit.json', dict(pairs=corpus.audit, pretraining=overlap))
        print(f'Fitting local motifs: {len(corpus.split("train"))} training groups', flush=True)
        model = fit(corpus.split('train'), config, corpus.fingerprint)
        model.metadata['code_sha256'] = code_hashes()
        model.save(args.out / 'model')
        print('Evaluating held-out human 2-ch pairs (test untouched)', flush=True)
        report = evaluate(model, corpus.split('validation'))
        queries = report.pop('queries', [])
        with (args.out / 'validation-queries.jsonl').open('w') as stream:
            for row in queries:
                stream.write(json.dumps(row, allow_nan=False) + '\n')
        write_json(args.out / 'validation.json', report)
        write_json(args.out / 'run.json', dict(status='complete', config=asdict(config),
            pairs_fingerprint=corpus.fingerprint, code_sha256=code_hashes(), numpy_version=np.__version__,
            model_sha256=sha256(args.out / 'model/model.npz'), test_evaluated=False,
            real_solo_validation='missing', perceptual_validation='missing', rl_in_scope=False))
        print(json.dumps({k: v for k, v in report.items() if k == 'metrics'}, indent=2))
        return report
    model = LocalCompatibility.load(args.model)
    if model.metadata['pairs_fingerprint'] != corpus.fingerprint:
        raise ValueError('Model and pairs fingerprint differ')
    if args.command == 'diagnose':
        args.out.mkdir(parents=True, exist_ok=False)
        print(f'Diagnosing fixed scorer on {len(corpus.split("validation"))} validation groups '
              '(test untouched)', flush=True)
        report = diagnose(model, corpus.split('validation'))
        queries = report.pop('queries', [])
        with (args.out / 'diagnostic-queries.jsonl').open('w') as stream:
            for row in queries:
                stream.write(json.dumps(row, allow_nan=False) + '\n')
        report.update(pairs_fingerprint=corpus.fingerprint, model_sha256=sha256(args.model / 'model.npz'),
                      code_sha256=code_hashes(), numpy_version=np.__version__, test_evaluated=False)
        write_json(args.out / 'report.json', report)
        compact = dict(status=report['status'])
        if 'ablation' in report:
            compact['ablation_all'] = {k: v['all'] for k, v in report['ablation'].items()}
            compact['attack_aggregate'] = report['attack_battery']['aggregate']
            compact['transfer_probe'] = {k: v for k, v in report['transfer_probe'].items()
                                         if k != 'metrics'}
        print(json.dumps(compact, indent=2))
        return report
    config = SearchConfig(seed=args.seed, budget=args.budget, bins=args.bins,
        initial_random=args.initial_random, velocity=not args.fixed_velocity,
        microtiming=not args.quantized, playability=Playability(args.technique, args.min_interval_ms,
                                                             args.max_hits_per_second))
    config.validate()
    groups = corpus.split(args.split)
    if args.groups:
        if not set(args.groups) <= {g.id for g in groups}:
            raise ValueError('Requested group absent from chosen split')
        groups = [g for g in groups if g.id in args.groups]
    if args.limit is not None:
        if args.limit < 1:
            raise ValueError('Positive source limit required')
        groups = groups[:args.limit]
    if not groups or any(g.bpm is None or not 30 <= g.bpm <= 300 for g in groups):
        raise ValueError('Nonempty selection with known BPM in [30,300] required')
    args.out.mkdir(parents=True, exist_ok=False)
    summary = []
    for g in groups:
        print(f'Source {g.id}: {args.budget} evaluations per algorithm', flush=True)
        scorer = ConservationScorer(model, g.events)
        directory = args.out / f'source-{g.id}'
        directory.mkdir()
        controls = scorer.controls()
        write_json(directory / 'controls.json', controls)
        write_json(directory / 'source.json', dict(id=g.id, split=g.split, bpm=g.bpm,
            performances=sorted(g.performances), sessions=sorted(g.sessions), events=g.events.tolist()))
        human_raw = [scorer.score(t['events'], details=False)['raw_quality'] for t in g.taps]
        for algorithm in ('map_elites', 'random'):
            result = search(scorer, g.id, g.bpm, config, algorithm)
            save_search(result, directory / algorithm)
            copy_report = archive_copy_report(result['archive'], scorer.source,
                max(human_raw) if human_raw else None, controls['source_onset_copy']['raw_quality'])
            write_json(directory / f'{algorithm}-copy-analysis.json', copy_report)
            row = {k: result[k] for k in ('source_id', 'algorithm', 'evaluations', 'coverage',
                                          'qd_score', 'unique_candidates', 'feasible_evaluations')}
            row['copy'] = {k: copy_report.get(k) for k in ('elites', 'source_onset_density',
                'mean_precision', 'precision_of_best', 'jaccard_of_best', 'max_jaccard',
                'best_exceeds_best_human', 'quality_precision_correlation')}
            summary.append(row)
    report = dict(status='complete', sources=[g.id for g in groups], config=asdict(config), results=summary,
        pairs_fingerprint=corpus.fingerprint, model_sha256=sha256(args.model / 'model.npz'), code_sha256=code_hashes(),
        interpretation='Search scores measure optimizer behavior, not human compatibility or playability.',
        transfer_to_solo_validated=False, test_evaluated=False)
    write_json(args.out / 'comparison.json', report)
    print(json.dumps(summary, indent=2))
    return report


def parser():
    p = argparse.ArgumentParser(description=__doc__)
    subs = p.add_subparsers(dest='command', required=True)
    f = subs.add_parser('fit', help='Train on real full-groove/human-2ch positives; evaluate validation')
    s = subs.add_parser('search', help='Separate per-source MAP-Elites and equal-budget random archives')
    d = subs.add_parser('diagnose', help='Deterministic step-3 scorer diagnostics: component ablation, '
                        'adversarial attacks and artificial 1-ch probes on validation groups')
    sb = subs.add_parser('study-build', help='Build a blinded pairwise listening study from a '
                         'validation search control; produces no human evidence by itself')
    sr = subs.add_parser('study-report', help='Exploratory summary of recorded study responses')
    for cmd in (f, s, d, sb):
        cmd.add_argument('--pairs', type=Path, required=True)
        cmd.add_argument('--out', type=Path, required=True, help='Fresh directory; existing paths refused')
    for cmd in (f, s, sb):
        cmd.add_argument('--seed', type=int, default=42)
    sb.add_argument('--search', type=Path, required=True,
                    help='Validation search-control output directory (comparison.json + per-source archives)')
    sb.add_argument('--max-sources', type=int, default=12)
    sr.add_argument('--study', type=Path, required=True)
    sr.add_argument('--out', type=Path, help='Optional fresh JSON file for the report')
    f.add_argument('--motifs', type=int, default=16)
    f.add_argument('--iterations', type=int, default=300)
    f.add_argument('--pretraining-manifest', type=Path)
    f.add_argument('--no-offset-channel', action='store_true',
                   help='Drop the hit-masked offset feature channel (closes the microtiming exploit)')
    f.add_argument('--onset-term', choices=('none', 'expected', 'source'), default='none',
                   help='Add a velocity-profile cosine: human-conditioned expectation or raw source')
    d.add_argument('--model', type=Path, required=True)
    s.add_argument('--model', type=Path, required=True)
    s.add_argument('--split', choices=('train', 'validation'), default='validation')
    s.add_argument('--groups', nargs='+', help='Source group IDs; defaults to all groups in chosen split')
    s.add_argument('--limit', type=int, help='Bounded engineering smoke run, not a benchmark')
    s.add_argument('--budget', type=int, default=512)
    s.add_argument('--bins', type=int, default=8)
    s.add_argument('--initial-random', type=int, default=32)
    s.add_argument('--technique', choices=('finger', 'stick'), default='finger')
    s.add_argument('--min-interval-ms', type=float)
    s.add_argument('--max-hits-per-second', type=float)
    s.add_argument('--fixed-velocity', action='store_true')
    s.add_argument('--quantized', action='store_true')
    return p


def main():
    run(parser().parse_args())
