"""Exploratory human contrastive alignment with a frozen pretrained groove encoder."""
import argparse
from dataclasses import asdict
import hashlib
import json
import math
from pathlib import Path
import platform
import sys
import time

import numpy as np
import torch
from tqdm import tqdm

from .alignment import AlignmentConfig, CompatibilityModel, multi_positive_loss
from .alignment_data import HumanPairs, candidate_mask, group_batches, pack_taps
from .alignment_metrics import evaluate
from .encoder import load_encoder
from .monitoring import TrainingMonitor, summary_writer
from .train import save_checkpoint
from ..pretraining.audit import sha256


def code_fingerprint():
    digest = hashlib.sha256()
    for name in ('alignment.py', 'alignment_data.py', 'alignment_metrics.py', 'train_alignment.py', 'encoder.py'):
        digest.update((Path(__file__).parent/name).read_bytes())
    return digest.hexdigest()


def run(args):
    for name in ('epochs', 'taps_per_group', 'threads', 'hidden', 'embedding', 'layers', 'heads', 'log_every'):
        if getattr(args, name) < 1:
            raise ValueError(f'{name} must be positive')
    if args.batch_groups < 2 or (args.train_group_limit is not None and args.train_group_limit < 2):
        raise ValueError('batch-groups and train-group-limit must be at least two')
    if not math.isfinite(args.lr) or args.lr <= 0 or not 0 < args.temperature <= 1:
        raise ValueError('Invalid learning rate/temperature')
    device = torch.device('cuda' if args.device == 'auto' and torch.cuda.is_available()
                          else 'cpu' if args.device == 'auto' else args.device)
    if device.type == 'cuda' and not torch.cuda.is_available():
        raise ValueError('CUDA requested but unavailable')
    if args.tensorboard:
        summary_writer()
    torch.set_num_threads(args.threads)
    torch.manual_seed(args.seed)
    if device.type == 'cuda':
        torch.cuda.manual_seed_all(args.seed)
        torch.backends.cudnn.benchmark = False
    torch.use_deterministic_algorithms(True)
    print('Verifying human pairs and loading frozen groove encoder', flush=True)
    corpus = HumanPairs(args.pairs)
    train_groups, validation_groups = corpus.split_groups('train'), corpus.split_groups('validation')
    if args.train_group_limit is not None and args.train_group_limit < len(train_groups):
        train_groups = sorted(map(int, np.random.default_rng(args.seed).choice(
            train_groups, args.train_group_limit, replace=False)))
    if min(len(train_groups), len(validation_groups)) < 2:
        raise ValueError('At least two eligible source groups required in train and validation')
    encoder, pretrained = load_encoder(args.groove_checkpoint, device)
    encoder.requires_grad_(False)
    config = AlignmentConfig(encoder.config.embedding, args.hidden, args.embedding,
                             args.layers, args.heads, args.tap_view)
    model = CompatibilityModel(config).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=.01)
    settings = {k: v for k, v in vars(args).items() if k not in (
        'pairs', 'groove_checkpoint', 'out', 'resume', 'epochs', 'progress', 'tensorboard', 'log_every')}
    identity = dict(inputs=dict(pairs=corpus.fingerprint, groove_checkpoint=sha256(args.groove_checkpoint)),
                    settings=settings, architecture=asdict(config), code_sha256=code_fingerprint())
    start, best_mrr, best_loss = 0, -1., float('inf')
    checkpoint = None
    if args.resume:
        checkpoint = torch.load(args.resume, map_location='cpu', weights_only=True)
        if checkpoint.get('format') != 'tap-groove-alignment-v1' or checkpoint['identity'] != identity:
            raise ValueError('Resume requires identical pairs, groove checkpoint, code and settings')
        if args.out.resolve() != args.resume.parent.resolve() or args.resume.name != 'last.pt':
            raise ValueError('Resume from the same output directory / last.pt')
        model.load_state_dict(checkpoint['model'])
        optimizer.load_state_dict(checkpoint['optimizer'])
        start, best_mrr, best_loss = checkpoint['epoch'], checkpoint['best_mrr'], checkpoint['best_loss']
    elif args.out.exists():
        raise FileExistsError(f'Use a fresh --out directory: {args.out}')
    if start >= args.epochs:
        raise ValueError('--epochs must exceed the completed checkpoint epoch')
    disable = None if args.progress == 'auto' else args.progress == 'off'
    all_groups = train_groups + validation_groups
    features = {}
    with torch.no_grad():
        for offset in tqdm(range(0, len(all_groups), 128), desc='Frozen groove features', disable=disable):
            groups = all_groups[offset:offset+128]
            rows = [corpus.groups[g]['index'] for g in groups]
            y = torch.from_numpy(np.array(corpus.grooves[rows], copy=True)).to(device)
            z = encoder.encode(y).cpu()
            if not torch.isfinite(z).all():
                raise ValueError('Nonfinite frozen groove features')
            features.update(zip(groups, z))
    if checkpoint is not None:
        torch.set_rng_state(checkpoint['torch_rng'])
        if device.type == 'cuda':
            torch.cuda.set_rng_state_all(checkpoint['cuda_rng'])
    selection = {s: corpus.selection(groups) for s, groups in (
        ('train', train_groups), ('validation', validation_groups))}
    if not args.resume:
        args.out.mkdir(parents=True, exist_ok=False)
        (args.out/'selection.json').write_text(json.dumps(selection, indent=2) + '\n')
    description = dict(format='tap-groove-alignment-run-v1', identity=identity,
        counts={s: dict(groups=len(v['groups']), pairs=len(v['pair_indexes'])) for s, v in selection.items()},
        environment=dict(python=platform.python_version(), torch=str(torch.__version__), cuda=torch.version.cuda,
                         gpu=torch.cuda.get_device_name(device) if device.type == 'cuda' else None),
        protocol='Exploratory session-held-out alignment; pretraining overlap is NOT certified.',
        groove_encoder_frozen=True, checkpoint_selection='Validation group-macro MRR; loss breaks ties',
        tap_view=args.tap_view, monitoring=dict(tensorboard=args.tensorboard, log_every=args.log_every),
        limitations=['Pretraining may include TapTamDrum/GMD references; this is not a clean inductive benchmark.',
            'Session splits do not hold out participants. Participant-held-out evaluation remains pending.',
            'Only HVO-eligible human pairs are used; raw pairs are preserved in the source export.',
            'Hand-agnostic retains both hands onset events; it is not real one-finger tapping.',
            'Other source groups are candidate negatives, not proven perceptual negatives.',
            'Recall/MRR measure known-source recovery; human compatibility judgments are still required.',
            'Test pairs are not encoded, fitted or evaluated for checkpoint selection.'])
    (args.out/'run.json').write_text(json.dumps(description, indent=2) + '\n')
    (args.out/'completed.json').unlink(missing_ok=True)
    print(json.dumps(description), flush=True)
    steps = len(list(group_batches(corpus, train_groups, args.batch_groups, args.taps_per_group, args.seed)))
    # Save the frozen encoder for self-contained inference; no optimizer sees its weights.
    frozen_state = {k: v.detach().cpu().clone() for k, v in encoder.state_dict().items()}
    with TrainingMonitor(args.out/'tensorboard', enabled=args.tensorboard, start_epoch=start,
                         train_batches=steps, metadata=description, kind='alignment') as monitor, \
            tqdm(total=args.epochs, initial=start, desc='Alignment epochs', unit='epoch',
                 dynamic_ncols=True, disable=disable) as epochs:
        for epoch in range(start, args.epochs):
            started = time.perf_counter()
            model.train()
            weighted_loss, visited, examples = 0., 0, 0
            batches = group_batches(corpus, train_groups, args.batch_groups, args.taps_per_group,
                                    args.seed + epoch * 1009)
            with tqdm(batches, total=steps, desc=f'Epoch {epoch+1}/{args.epochs} train', unit='batch',
                      dynamic_ncols=True, leave=False, disable=disable) as progress:
                for batch, (groups, pairs) in enumerate(progress, 1):
                    taps = model.encode_taps(*pack_taps(corpus, pairs, args.tap_view, device))
                    grooves = model.project_grooves(torch.stack([features[g] for g in groups]).to(device))
                    tap_groups = corpus.pair_groups[pairs]
                    allowed = candidate_mask(corpus, list(tap_groups), groups).to(device)
                    tg, gg = torch.as_tensor(tap_groups, device=device), torch.tensor(groups, device=device)
                    if not (allowed & (tg[:, None] != gg[None, :])).any():
                        raise ValueError('Batch has no unambiguous negatives; increase --batch-groups')
                    loss = multi_positive_loss(taps, grooves, tg, gg, args.temperature, allowed)
                    if not torch.isfinite(loss):
                        raise FloatingPointError('Nonfinite alignment training loss')
                    optimizer.zero_grad(set_to_none=True)
                    loss.backward()
                    norm = torch.nn.utils.clip_grad_norm_(model.parameters(), 1., error_if_nonfinite=True)
                    optimizer.step()
                    weighted_loss += float(loss.detach()) * len(groups)
                    visited += len(groups)
                    examples += len(pairs)
                    progress.set_postfix(loss=f'{weighted_loss/visited:.4f}', groups=visited, refresh=False)
                    if batch % args.log_every == 0 or batch == steps:
                        monitor.batch(epoch * steps + batch, dict(loss=float(loss.detach())), args.lr, norm)
            result = evaluate(model, features, corpus, validation_groups, args.temperature)
            if not math.isfinite(result['validation']['loss']):
                raise FloatingPointError('Nonfinite validation loss')
            log = dict(epoch=epoch+1, train=dict(loss=weighted_loss/visited, groups=visited, examples=examples),
                       **result, seconds=round(time.perf_counter()-started, 3))
            mrr, val_loss = log['validation']['mrr'], log['validation']['loss']
            improved = mrr > best_mrr or (mrr == best_mrr and val_loss < best_loss)
            if improved:
                best_mrr, best_loss = mrr, val_loss
            state = dict(format='tap-groove-alignment-v1', identity=identity, architecture=asdict(config),
                groove_architecture=pretrained['architecture'], groove_encoder=frozen_state,
                groove_pretraining_identity=pretrained['identity'], model=model.state_dict(),
                optimizer=optimizer.state_dict(), epoch=epoch+1, best_mrr=best_mrr, best_loss=best_loss,
                metrics=log, torch_rng=torch.get_rng_state(),
                cuda_rng=torch.cuda.get_rng_state_all() if device.type == 'cuda' else [],
                semantic_status='exploratory-human-alignment; not perceptually validated')
            if improved:
                save_checkpoint(state, args.out/'best.pt')
            save_checkpoint(state, args.out/'last.pt')
            with (args.out/'metrics.jsonl').open('a') as stream:
                stream.write(json.dumps(log, allow_nan=False) + '\n')
            monitor.epoch(log)
            epochs.set_postfix(val_mrr=f'{mrr:.3f}', best=f'{best_mrr:.3f}', refresh=False)
            epochs.update(1)
            tqdm.write(json.dumps(log), file=sys.stdout)
            sys.stdout.flush()
    (args.out/'completed.json').write_text(json.dumps(dict(epochs=args.epochs, best_mrr=best_mrr,
        last_sha256=sha256(args.out/'last.pt')), indent=2) + '\n')
    return log


def parser():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--pairs', type=Path, required=True)
    p.add_argument('--groove-checkpoint', type=Path, required=True)
    p.add_argument('--out', type=Path, required=True)
    p.add_argument('--resume', type=Path)
    p.add_argument('--device', choices=('auto', 'cpu', 'cuda'), default='auto')
    p.add_argument('--epochs', type=int, default=100)
    p.add_argument('--batch-groups', type=int, default=16)
    p.add_argument('--taps-per-group', type=int, default=2)
    p.add_argument('--temperature', type=float, default=.1)
    p.add_argument('--lr', type=float, default=3e-4)
    p.add_argument('--seed', type=int, default=42)
    p.add_argument('--threads', type=int, default=4)
    p.add_argument('--hidden', type=int, default=64)
    p.add_argument('--embedding', type=int, default=128)
    p.add_argument('--layers', type=int, default=2)
    p.add_argument('--heads', type=int, default=4)
    p.add_argument('--tap-view', choices=('hand_agnostic', 'pad_aware'), default='hand_agnostic')
    p.add_argument('--train-group-limit', type=int)
    p.add_argument('--progress', choices=('auto', 'on', 'off'), default='auto')
    p.add_argument('--no-tensorboard', dest='tensorboard', action='store_false')
    p.add_argument('--log-every', type=int, default=10)
    return p


def main():
    p = parser()
    try:
        run(p.parse_args())
    except (ValueError, OSError) as error:
        p.error(str(error))
