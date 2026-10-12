"""Epoch-resumable masked groove pretraining; independent of target-derived pseudo taps."""
import argparse
from collections import Counter
from dataclasses import asdict
import hashlib
from itertools import islice
import json
import math
from pathlib import Path
import platform
import sys
import time
import numpy as np
import torch
from torch.utils.data import DataLoader, WeightedRandomSampler
from tqdm import tqdm
from .data import HVOExamples, selections, verify_inputs
from .encoder import EncoderConfig, GrooveEncoder, make_mask, masked_loss, summarize
from .monitoring import TrainingMonitor, summary_writer
from ..pretraining.audit import sha256


def save_checkpoint(state, path):
    temporary = path.with_suffix('.tmp')
    torch.save(state, temporary)
    temporary.replace(path)


def validation_mask(indexes, seed, probability):
    # Stable per source row: independent of batch size, workers and epoch.
    return torch.cat([make_mask(1, torch.Generator().manual_seed(seed + int(i) * 104729), probability)
                      for i in indexes])


def code_fingerprint():
    digest = hashlib.sha256()
    for name in ('encoder.py', 'data.py', 'train.py'):
        digest.update((Path(__file__).parent/name).read_bytes())
    return digest.hexdigest()


def run(args):
    for name in ('epochs', 'batch_size', 'threads', 'log_every'):
        if getattr(args, name) < 1:
            raise ValueError(f'{name} must be positive')
    for name in ('train_limit', 'validation_limit', 'max_train_batches', 'max_validation_batches'):
        value = getattr(args, name)
        if value is not None and value < 1:
            raise ValueError(f'{name} must be positive')
    if args.workers < 0 or not math.isfinite(args.lr) or args.lr <= 0 or not 0 < args.mask_probability < 1:
        raise ValueError('Invalid workers, learning rate or mask probability')
    device = torch.device('cuda' if args.device == 'auto' and torch.cuda.is_available()
                          else 'cpu' if args.device == 'auto' else args.device)
    if device.type == 'cuda' and not torch.cuda.is_available():
        raise ValueError('CUDA requested but unavailable; inspect the remote PyTorch/CUDA installation')
    if args.tensorboard:
        summary_writer()  # Check the optional runtime import before creating an output directory.
    torch.set_num_threads(args.threads)
    torch.manual_seed(args.seed)
    if device.type == 'cuda':
        torch.cuda.manual_seed_all(args.seed)
        torch.backends.cudnn.benchmark = False
    torch.use_deterministic_algorithms(True)
    print('Verifying plan and cache fingerprints (streaming file hashes)', flush=True)
    cache, plan, fingerprints = verify_inputs(args.cache, args.plan)
    train_rows, weights, validation_rows = selections(cache, args.plan, args.include_synthetic,
                                                      args.train_limit, args.validation_limit, args.seed)
    # Reserve known human benchmark parents before sampling. The mapping must be explicit.
    exclusions = {'train': set(), 'validation': set()}
    if args.exclude_parents:
        held_out = json.loads(args.exclude_parents.read_text())
        if not isinstance(held_out, list) or not held_out or not all(isinstance(p, str) and p for p in held_out):
            raise ValueError('--exclude-parents requires a nonempty JSON list of canonical parent IDs')
        held_out = set(held_out)
        manifest = Path(plan['inputs']['manifest']['path'])
        if sha256(manifest) != plan['inputs']['manifest']['sha256']:
            raise ValueError('Changed HVO provenance manifest')
        with manifest.open() as f:
            for line in f:
                row = json.loads(line)
                if row['split'] in exclusions and held_out.intersection(row['parent_ids']):
                    exclusions[row['split']].add(row['split_index'])
        fingerprints['exclude_parents'] = sha256(args.exclude_parents)
        if not any(exclusions.values()):
            raise ValueError('No excluded parents matched the pretraining corpus; check the mapping')
        keep = ~np.isin(train_rows, list(exclusions['train']))
        train_rows, weights = train_rows[keep], weights[keep]
        validation_rows = validation_rows[~np.isin(validation_rows, list(exclusions['validation']))]
    if not len(train_rows) or not len(validation_rows):
        raise ValueError('Training and original validation must be nonempty after exclusions')
    weights = weights / weights.sum()
    config = EncoderConfig(args.hidden, args.embedding, args.layers, args.heads, args.dropout)
    config.validate()
    settings = {k: v for k, v in vars(args).items() if k not in
                ('out', 'resume', 'epochs', 'cache', 'plan', 'exclude_parents',
                 'progress', 'tensorboard', 'log_every')}
    identity = dict(inputs=fingerprints, settings=settings, architecture=asdict(config), code_sha256=code_fingerprint())
    model = GrooveEncoder(config).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=.01)
    start, best = 0, float('inf')
    if args.resume:
        checkpoint = torch.load(args.resume, map_location='cpu', weights_only=True)
        if checkpoint.get('format') != 'groove-encoder-v1' or checkpoint['identity'] != identity:
            raise ValueError('Resume requires identical data, code, architecture and training settings')
        if args.out.resolve() != args.resume.parent.resolve() or args.resume.name != 'last.pt':
            raise ValueError('Resume from the same output directory / last.pt')
        model.load_state_dict(checkpoint['model'])
        optimizer.load_state_dict(checkpoint['optimizer'])
        start, best = checkpoint['epoch'], checkpoint['best_validation']
        torch.set_rng_state(checkpoint['torch_rng'])
        if device.type == 'cuda':
            torch.cuda.set_rng_state_all(checkpoint['cuda_rng'])
    else:
        args.out.mkdir(parents=True, exist_ok=False)
        np.savez_compressed(args.out/'selection.npz', train=train_rows, validation=validation_rows)
    if start >= args.epochs:
        raise ValueError('--epochs must exceed the completed checkpoint epoch')
    (args.out/'completed.json').unlink(missing_ok=True)
    description = dict(format='groove-pretraining-run-v1', identity=identity,
        train_rows=len(train_rows), validation_rows=len(validation_rows), device=str(device),
        excluded={s: len(rows) for s, rows in exclusions.items()},
        monitoring=dict(progress=args.progress, tensorboard=args.tensorboard, log_every=args.log_every,
                        directory=str(args.out/'tensorboard') if args.tensorboard else None),
        environment=dict(python=platform.python_version(), torch=str(torch.__version__),
                         cuda=torch.version.cuda, gpu=torch.cuda.get_device_name(device) if device.type == 'cuda' else None),
        protocol='Exploratory representation pretraining; TapTamDrum parent/session overlap is not certified.',
        limitations=['Masked reconstruction does not validate perceptual tap/groove compatibility.',
                      '32x9 HVO preserves accepted offsets but cannot recover events discarded by export.',
                      'No test data is used for fitting or checkpoint selection.'])
    (args.out/'run.json').write_text(json.dumps(description, indent=2) + '\n')
    print(json.dumps(description), flush=True)
    train_ds = HVOExamples(args.cache/'train/drums.npy', train_rows)
    validation_ds = HVOExamples(args.cache/'validation/drums.npy', validation_rows)
    train_batches = math.ceil(len(train_ds) / args.batch_size)
    train_batches = min(train_batches, args.max_train_batches or train_batches)
    disable_progress = None if args.progress == 'auto' else args.progress == 'off'
    with TrainingMonitor(args.out/'tensorboard', enabled=args.tensorboard, start_epoch=start,
                         train_batches=train_batches, metadata=description) as monitor, \
            tqdm(total=args.epochs, initial=start, desc='Epochs', unit='epoch',
                 dynamic_ncols=True, disable=disable_progress) as epoch_progress:
        for epoch in range(start, args.epochs):
            started = time.perf_counter()
            gen = torch.Generator().manual_seed(args.seed + epoch * 1009)
            sampler = WeightedRandomSampler(weights, len(train_ds), replacement=True, generator=gen) if args.sampling == 'plan' else None
            train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=sampler is None,
                                      sampler=sampler, generator=gen, num_workers=args.workers,
                                      pin_memory=device.type == 'cuda')
            # A private loader generator avoids changing dropout RNG during validation.
            validation_loader = DataLoader(validation_ds, batch_size=args.batch_size, shuffle=False,
                num_workers=args.workers, generator=torch.Generator().manual_seed(args.seed), pin_memory=device.type == 'cuda')
            mask_gen = torch.Generator().manual_seed(args.seed + epoch * 1013 + 17)
            log = dict(epoch=epoch + 1)
            for name, loader in [('train', train_loader), ('validation', validation_loader)]:
                training = name == 'train'
                model.train(training)
                totals, baseline, shuffled, examples = Counter(), Counter(), Counter(), 0
                max_batches = args.max_train_batches if training else args.max_validation_batches
                batch_count = min(len(loader), max_batches or len(loader))
                with tqdm(islice(loader, batch_count), total=batch_count,
                          desc=f'Epoch {epoch+1}/{args.epochs} {name}', unit='batch',
                          dynamic_ncols=True, leave=False, disable=disable_progress) as batches:
                    for batch, (target, indexes) in enumerate(batches):
                        mask = make_mask(len(target), mask_gen, args.mask_probability) if training else validation_mask(indexes, args.seed + 900001, args.mask_probability)
                        target, mask = target.to(device), mask.to(device)
                        with torch.set_grad_enabled(training):
                            _, heads = model(target, mask)
                            loss, stats = masked_loss(heads, target, mask)
                            if not torch.isfinite(loss):
                                raise FloatingPointError(f'Nonfinite {name} loss at epoch {epoch + 1}, batch {batch}')
                            if not training:
                                _, constant = masked_loss(torch.zeros_like(heads), target, mask)
                                baseline.update(constant)
                                # Same targets/masks, wrong visible groove context. A model that
                                # only learned positional priors can pass reconstruction unnoticed.
                                _, mismatched = model(target.roll(1, dims=0), mask)
                                _, mismatch_stats = masked_loss(mismatched, target, mask)
                                shuffled.update(mismatch_stats)
                            if training:
                                optimizer.zero_grad(set_to_none=True)
                                loss.backward()
                                gradient_norm = torch.nn.utils.clip_grad_norm_(model.parameters(), 1., error_if_nonfinite=True)
                                optimizer.step()
                        totals.update(stats)
                        examples += len(target)
                        if not batches.disable:
                            running = summarize(totals)
                            batches.set_postfix(loss=f'{running["loss"]:.4f}', f1=f'{running["hit_f1"]:.3f}',
                                                examples=examples, refresh=False)
                        if training and ((batch + 1) % args.log_every == 0 or batch + 1 == batch_count):
                            monitor.batch(epoch * train_batches + batch + 1, summarize(stats),
                                          optimizer.param_groups[0]['lr'], gradient_norm)
                log[name] = dict(summarize(totals), examples=examples)
                if not training:
                    log['validation_constant_baseline'] = summarize(baseline)
                    log['validation_shuffled_input'] = summarize(shuffled)
            log['seconds'] = round(time.perf_counter() - started, 3)
            improved = log['validation']['loss'] < best
            best = min(best, log['validation']['loss'])
            checkpoint = dict(format='groove-encoder-v1', architecture=asdict(config), identity=identity,
                model=model.state_dict(), optimizer=optimizer.state_dict(), epoch=epoch + 1,
                best_validation=best, metrics=log, torch_rng=torch.get_rng_state(),
                cuda_rng=torch.cuda.get_rng_state_all() if device.type == 'cuda' else [],
                semantic_status='masked-HVO-pretraining; not tap-aligned')
            if improved:
                save_checkpoint(checkpoint, args.out/'best.pt')
            save_checkpoint(checkpoint, args.out/'last.pt')
            # Checkpoints are authoritative; a crash may leave the JSONL one row behind.
            with (args.out/'metrics.jsonl').open('a') as f:
                f.write(json.dumps(log, allow_nan=False) + '\n')
            monitor.epoch(log)
            epoch_progress.set_postfix(val_loss=f'{log["validation"]["loss"]:.4f}', best=f'{best:.4f}', refresh=False)
            epoch_progress.update(1)
            tqdm.write(json.dumps(log), file=sys.stdout)
            sys.stdout.flush()
    (args.out/'completed.json').write_text(json.dumps(dict(epochs=args.epochs, best_validation=best,
                                                          last_sha256=sha256(args.out/'last.pt')), indent=2) + '\n')
    return log


def parser():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--cache', type=Path, required=True)
    p.add_argument('--plan', type=Path, required=True)
    p.add_argument('--out', type=Path, required=True)
    p.add_argument('--resume', type=Path)
    p.add_argument('--device', choices=('auto', 'cpu', 'cuda'), default='auto')
    p.add_argument('--epochs', type=int, default=30)
    p.add_argument('--batch-size', type=int, default=128)
    p.add_argument('--lr', type=float, default=3e-4)
    p.add_argument('--seed', type=int, default=42)
    p.add_argument('--threads', type=int, default=4)
    p.add_argument('--workers', type=int, default=0)
    p.add_argument('--hidden', type=int, default=128)
    p.add_argument('--embedding', type=int, default=128)
    p.add_argument('--layers', type=int, default=3)
    p.add_argument('--heads', type=int, default=4)
    p.add_argument('--dropout', type=float, default=.1)
    p.add_argument('--mask-probability', type=float, default=.3)
    p.add_argument('--sampling', choices=('uniform', 'plan'), default='uniform')
    p.add_argument('--include-synthetic', action='store_true')
    p.add_argument('--exclude-parents', type=Path, help='JSON list of reserved canonical parent IDs, including equivalent copies')
    p.add_argument('--train-limit', type=int)
    p.add_argument('--validation-limit', type=int)
    p.add_argument('--max-train-batches', type=int)
    p.add_argument('--max-validation-batches', type=int)
    p.add_argument('--progress', choices=('auto', 'on', 'off'), default='auto',
                   help='Epoch/batch progress on stderr; auto enables it in interactive terminals')
    p.add_argument('--no-tensorboard', dest='tensorboard', action='store_false',
                   help='Disable TensorBoard events (JSONL metrics are always saved)')
    p.add_argument('--log-every', type=int, default=50,
                   help='TensorBoard batch logging interval; epoch metrics and final batch are always logged')
    return p


def main():
    p = parser()
    try:
        run(p.parse_args())
    except (ValueError, FileExistsError) as error:
        p.error(str(error))
