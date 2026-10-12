"""Sequential, resumable rhythm-branch studies with paired seeds and final diagnostics."""
import argparse
from contextlib import contextmanager
from dataclasses import asdict
import fcntl
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
import time

import numpy as np
import torch

from ..pretraining.audit import sha256
from .alignment import AlignmentConfig
from .alignment_data import HumanPairs
from .encoder import load_encoder
from .train_alignment import code_fingerprint, parser as training_parser


STUDIES = dict(baseline='none', groove_rhythm='groove', tap_rhythm='tap', both_rhythm='both')
TRAIN_FLAGS = ('device', 'epochs', 'batch_groups', 'taps_per_group', 'temperature', 'lr',
               'threads', 'hidden', 'embedding', 'layers', 'heads', 'tap_view', 'train_group_limit',
               'progress', 'log_every')


def write_json(path, value):
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, indent=2, allow_nan=False) + '\n')
    temporary.replace(path)


@contextmanager
def exclusive_suite(directory):
    # Advisory OS lock releases automatically after crashes; no stale PID cleanup.
    with (directory/'.suite.lock').open('a') as stream:
        try:
            fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise ValueError('Another process is using this ablation output directory') from error
        try:
            yield
        finally:
            fcntl.flock(stream.fileno(), fcntl.LOCK_UN)


def training_arguments(args, job):
    values = ['--pairs', str(args.pairs.resolve()), '--groove-checkpoint', str(args.groove_checkpoint.resolve()),
              '--out', str((args.out/'runs'/job['name']).resolve()), '--seed', str(job['seed']),
              '--rhythm-branch', job['branch'], '--console', 'quiet']
    for name in TRAIN_FLAGS:
        value = getattr(args, name)
        if value is not None:
            values.extend(['--' + name.replace('_', '-'), str(value)])
    if not args.tensorboard:
        values.append('--no-tensorboard')
    return values


def expected_identity(args, job, inputs, groove_embedding):
    parsed = training_parser().parse_args(training_arguments(args, job))
    settings = {k: v for k, v in vars(parsed).items() if k not in (
        'pairs', 'groove_checkpoint', 'out', 'resume', 'epochs', 'progress', 'tensorboard', 'log_every', 'console')}
    config = AlignmentConfig(groove_embedding, args.hidden, args.embedding, args.layers, args.heads,
                             args.tap_view, job['branch'])
    return dict(inputs=inputs, settings=settings, architecture=asdict(config), code_sha256=code_fingerprint())


def prepare(args):
    if (not args.seeds or len(set(args.seeds)) != len(args.seeds)
            or any(seed < 0 or seed >= 2**32 for seed in args.seeds)):
        raise ValueError('Seeds must be unique integers in [0, 2**32)')
    if len(set(args.studies)) != len(args.studies):
        raise ValueError('Studies must be unique')
    for key in ('epochs', 'batch_groups', 'taps_per_group', 'threads', 'hidden', 'embedding',
                'layers', 'heads', 'log_every', 'diagnostic_batch_size'):
        if getattr(args, key) < 1:
            raise ValueError(f'{key} must be positive')
    if args.batch_groups < 2 or (args.train_group_limit is not None and args.train_group_limit < 2):
        raise ValueError('At least two groups are required')
    if (not math.isfinite(args.lr) or args.lr <= 0 or not 0 < args.temperature <= 1
            or not math.isfinite(args.ridge_alpha) or args.ridge_alpha <= 0):
        raise ValueError('Invalid learning rate, temperature or ridge alpha')
    args.device = ('cuda' if torch.cuda.is_available() else 'cpu') if args.device == 'auto' else args.device
    if args.device == 'cuda' and not torch.cuda.is_available():
        raise ValueError('CUDA requested but unavailable')
    corpus = HumanPairs(args.pairs)
    if min(len(corpus.split_groups(s)) for s in ('train', 'validation')) < 2:
        raise ValueError('At least two eligible train and validation groups are required')
    encoder, _ = load_encoder(args.groove_checkpoint)
    config = AlignmentConfig(encoder.config.embedding, args.hidden, args.embedding, args.layers, args.heads,
                             args.tap_view)
    config.validate()
    if args.tensorboard:
        from .monitoring import summary_writer
        summary_writer()
    inputs = dict(pairs=corpus.fingerprint, groove_checkpoint=sha256(args.groove_checkpoint))
    jobs = [dict(name=f'{study}-seed{seed}', study=study, seed=seed, branch=STUDIES[study])
            for study in args.studies for seed in args.seeds]
    identities = {job['name']: expected_identity(args, job, inputs, encoder.config.embedding) for job in jobs}
    code = code_fingerprint() + ''.join(sha256(Path(__file__).with_name(name)) for name in (
        'ablation.py', 'diagnose_alignment.py', 'monitoring.py'))
    identity = dict(inputs=inputs, training_identities=identities, epochs=args.epochs,
                    jobs=jobs, ridge_alpha=args.ridge_alpha, diagnostic_batch_size=args.diagnostic_batch_size,
                    code_sha256=hashlib.sha256(code.encode()).hexdigest(),
                    environment=dict(torch=str(torch.__version__), numpy=np.__version__))
    digest = hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
    return dict(format='alignment-ablation-suite-v1', identity=identity, identity_sha256=digest,
                inputs=dict(pairs=str(args.pairs.resolve()), groove_checkpoint=str(args.groove_checkpoint.resolve())),
                jobs=jobs, protocol='Fixed session splits; paired initialization/sampling seeds; no test evaluation.')


def verify_run(directory, identity, epochs):
    """Verify ownership and checkpoint identities before resuming or trusting completion."""
    if not (directory/'run.json').exists():
        if any((directory/name).exists() for name in ('best.pt', 'last.pt', 'completed.json')):
            raise ValueError(f'Checkpoint exists without run identity: {directory}')
        return None  # A suite-owned initialization interrupted before run.json.
    metadata = json.loads((directory/'run.json').read_text())
    if metadata['identity'] != identity:
        raise ValueError(f'Run identity mismatch: {directory}')
    last = directory/'last.pt'
    if not last.exists():
        return None
    state = torch.load(last, map_location='cpu', weights_only=True)
    if state['identity'] != identity or not 1 <= state['epoch'] <= epochs:
        raise ValueError(f'Invalid last checkpoint identity/epoch: {last}')
    completed = directory/'completed.json'
    if completed.exists():
        marker = json.loads(completed.read_text())
        best = torch.load(directory/'best.pt', map_location='cpu', weights_only=True)
        if (marker['epochs'] != epochs or marker['last_sha256'] != sha256(last)
                or state['epoch'] != epochs or best['identity'] != identity
                or not 1 <= best['epoch'] <= epochs
                or best['metrics']['validation']['mrr'] != state['best_mrr']):
            raise ValueError(f'Invalid completed run: {directory}')
    return state['epoch']


def run_hashes(directory):
    return {name: sha256(directory/name) for name in
            ('best.pt', 'last.pt', 'metrics.jsonl', 'selection.json', 'run.json', 'completed.json')}


def moments(values):
    return dict(mean=float(np.mean(values)), std=float(np.std(values, ddof=1)) if len(values) > 1 else None,
                count=len(values))


def summarize(args, plan, report):
    results = []
    if len(report['checkpoints']) != len(plan['jobs']):
        raise ValueError('Diagnostic checkpoint count differs from suite plan')
    for job, diagnostic in zip(plan['jobs'], report['checkpoints']):
        directory = args.out/'runs'/job['name']
        rows = [json.loads(line) for line in (directory/'metrics.jsonl').read_text().splitlines()]
        if [r['epoch'] for r in rows] != list(range(1, args.epochs + 1)):
            raise ValueError(f'Incomplete or duplicate epoch history: {directory}')
        best = max(rows, key=lambda r: (r['validation']['mrr'], -r['validation']['loss']))
        if (diagnostic['checkpoint_sha256'] != sha256(directory/'best.pt')
                or best['epoch'] != diagnostic['epoch']):
            raise ValueError(f'Diagnostic/checkpoint/history mismatch: {directory}')
        tail = rows[-50:]
        values = dict(best_mrr=best['validation']['mrr'], best_recall_at_1=best['validation']['recall_at_1'],
                      onset_mrr=best['validation_onset_baseline']['mrr'],
                      last_mrr=rows[-1]['validation']['mrr'],
                      tail_mrr=float(np.mean([r['validation']['mrr'] for r in tail])))
        values['best_minus_onset_mrr'] = values['best_mrr'] - values['onset_mrr']
        results.append(dict(**job, best_epoch=best['epoch'], tail_epochs=len(tail), metrics=values,
                            diagnostic_checkpoint_sha256=diagnostic['checkpoint_sha256']))
    aggregate, paired = {}, {}
    baseline = {r['seed']: r for r in results if r['study'] == 'baseline'}
    for study in args.studies:
        members = [r for r in results if r['study'] == study]
        aggregate[study] = {metric: moments([r['metrics'][metric] for r in members])
                            for metric in members[0]['metrics']}
        if study != 'baseline' and baseline:
            differences = [dict(seed=r['seed'], best_mrr_delta=r['metrics']['best_mrr'] - baseline[r['seed']]['metrics']['best_mrr'],
                                tail_mrr_delta=r['metrics']['tail_mrr'] - baseline[r['seed']]['metrics']['tail_mrr']) for r in members]
            paired[study] = dict(seeds=differences,
                best_mrr_delta=moments([r['best_mrr_delta'] for r in differences]),
                tail_mrr_delta=moments([r['tail_mrr_delta'] for r in differences]))
    return dict(format='alignment-ablation-summary-v1', suite_sha256=plan['identity_sha256'],
                runs=results, aggregate=aggregate, paired_vs_baseline=paired,
                diagnostics='diagnostics/report.json',
                limitations=['Seeds repeat optimization on the same fixed split; they are not independent datasets.',
                    'Best checkpoints are validation-selected; mean/std and paired deltas are descriptive, not significance tests.',
                    'All runs share the same epoch budget; branch models add parameters and computation.',
                    'Known-source retrieval and onset probes do not establish perceptual compatibility.',
                    'Pretraining overlap is not certified; participants are not held out; test data is not evaluated.'])


def execute(args, plan):
    progress_path = args.out/'progress.json'
    progress = json.loads(progress_path.read_text()) if progress_path.exists() else dict(jobs={})
    scripts = Path(__file__).resolve().parents[2]/'scripts'

    def status(message):
        if args.console != 'quiet':
            print(message, flush=True)

    for index, job in enumerate(plan['jobs'], 1):
        name = job['name']
        directory = args.out/'runs'/name
        prior = progress['jobs'].get(name, {})
        identity = plan['identity']['training_identities'][name]
        completed_epoch = verify_run(directory, identity, args.epochs) if directory.exists() else None
        if prior.get('hashes') and prior['hashes'] != run_hashes(directory):
            raise ValueError(f'Completed run artifacts changed: {directory}')
        if directory.exists() and (directory/'completed.json').exists():
            status(f'[{index}/{len(plan["jobs"])}] {name}: verified, skipping training')
        else:
            command = [sys.executable, str(scripts/'train_tap_alignment.py'), *training_arguments(args, job)]
            if completed_epoch is not None:
                command.extend(['--resume', str((directory/'last.pt').resolve())])
            elif directory.exists():
                # A crash before the first committed epoch has no optimizer state.
                # Preserve that attempt and restart only this suite-owned job.
                archive = args.out/'incomplete-attempts'
                archive.mkdir(exist_ok=True)
                directory.rename(archive/f'{name}-{time.time_ns()}')
            progress['jobs'][name] = dict(status='training')
            write_json(progress_path, progress)
            status(f'[{index}/{len(plan["jobs"])}] {name}: training {completed_epoch or 0}/{args.epochs}')
            try:
                subprocess.run(command, check=True)
            except BaseException:
                progress['jobs'][name] = dict(status='interrupted')
                write_json(progress_path, progress)
                raise
            verify_run(directory, identity, args.epochs)
        progress['jobs'][name] = dict(status='trained', hashes=run_hashes(directory))
        write_json(progress_path, progress)
    output = args.out/'diagnostics'
    if progress.get('diagnostic_hashes'):
        if any(sha256(output/name) != digest for name, digest in progress['diagnostic_hashes'].items()):
            raise ValueError('Completed diagnostic artifacts changed')
    else:
        if output.exists():
            # Preserve incomplete reports; never silently trust a half-written result.
            archive = args.out/'incomplete-attempts'
            archive.mkdir(exist_ok=True)
            output.rename(archive/f'diagnostics-{time.time_ns()}')
        status('All training runs complete. Running train/validation diagnostics...')
        subprocess.run([sys.executable, str(scripts/'diagnose_tap_alignment.py'), '--pairs', str(args.pairs.resolve()),
            '--checkpoints', *[str((args.out/'runs'/j['name']/'best.pt').resolve()) for j in plan['jobs']],
            '--out', str(output.resolve()), '--device', args.device, '--ridge-alpha', str(args.ridge_alpha),
            '--batch-size', str(args.diagnostic_batch_size), '--threads', str(args.threads), '--console', 'quiet'], check=True)
        progress['diagnostic_hashes'] = {name: sha256(output/name) for name in ('report.json', 'validation-queries.jsonl')}
        write_json(progress_path, progress)
    summary = summarize(args, plan, json.loads((output/'report.json').read_text()))
    write_json(args.out/'summary.json', summary)
    progress['status'] = 'complete'
    write_json(progress_path, progress)
    if args.console == 'json':
        print(json.dumps(summary, indent=2))
    elif args.console == 'compact':
        for study, values in summary['aggregate'].items():
            best, tail = values['best_mrr'], values['tail_mrr']
            spread = 'n/a' if best['std'] is None else f'{best["std"]:.3f}'
            print(f'{study}: best MRR={best["mean"]:.3f} (seed std={spread}), '
                  f'tail MRR={tail["mean"]:.3f}, n={best["count"]}')
        print(f'Summary: {args.out/"summary.json"}\nDiagnostics: {output/"report.json"}')
    return summary


def run(args):
    plan = prepare(args)
    if args.dry_run:
        if args.console == 'json':
            print(json.dumps(plan, indent=2))
        elif args.console == 'compact':
            print(f'Validated plan: {len(plan["jobs"])} runs, {args.epochs} epochs/run, device={args.device}')
            print(f'LR={args.lr:g}, batch-groups={args.batch_groups}, taps/group={args.taps_per_group}')
            for job in plan['jobs']:
                print(f'  {job["name"]}: rhythm={job["branch"]}')
        return plan
    if args.out.exists() and not args.resume:
        raise FileExistsError('Output exists; repeat the same command with --resume, or choose a fresh --out')
    if args.resume and not (args.out/'suite.json').exists():
        raise ValueError('--resume requires an existing suite.json')
    if not args.out.exists():
        args.out.mkdir(parents=True, exist_ok=False)
    with exclusive_suite(args.out):
        path = args.out/'suite.json'
        if args.resume:
            previous = json.loads(path.read_text())
            if previous['identity'] != plan['identity']:
                raise ValueError('Resume requires identical suite studies, seeds, budget, data, code and training settings')
        else:
            write_json(path, plan)
        return execute(args, plan)


def parser():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--pairs', type=Path, required=True)
    p.add_argument('--groove-checkpoint', type=Path, required=True)
    p.add_argument('--out', type=Path, required=True)
    p.add_argument('--studies', choices=tuple(STUDIES), nargs='+', default=list(STUDIES))
    p.add_argument('--seeds', type=int, nargs='+', default=[42, 43, 44])
    p.add_argument('--resume', action='store_true')
    p.add_argument('--dry-run', action='store_true')
    p.add_argument('--ridge-alpha', type=float, default=.1)
    p.add_argument('--diagnostic-batch-size', type=int, default=128)
    # Keep trainer defaults in one place while exposing the same numeric controls.
    source = training_parser()
    for name in TRAIN_FLAGS:
        action = next(a for a in source._actions if a.dest == name)
        options = dict(default=500 if name == 'epochs' else action.default)
        if action.type is not None:
            options['type'] = action.type
        if action.choices is not None:
            options['choices'] = action.choices
        p.add_argument('--' + name.replace('_', '-'), **options)
    p.add_argument('--no-tensorboard', dest='tensorboard', action='store_false')
    p.add_argument('--console', choices=('compact', 'quiet', 'json'), default='compact')
    return p


def main():
    p = parser()
    try:
        run(p.parse_args())
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        p.error(str(error))
