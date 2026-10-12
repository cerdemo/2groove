"""Train-only linear probes of frozen alignment checkpoints; no test evaluation."""
import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
import torch

from ..pretraining.audit import sha256
from .alignment import load_alignment
from .alignment_data import HumanPairs, pack_taps
from .alignment_metrics import retrieval_metrics


def normalize(rows):
    rows = np.asarray(rows, dtype=np.float64)
    return rows / np.maximum(np.linalg.norm(rows, axis=1, keepdims=True), 1e-12)


def onset_profile(events):
    """Same velocity-weighted, periodic 32-bin convention as onset_scores()."""
    row = np.zeros(32, dtype=np.float64)
    for beat, velocity, _ in events:
        row[round(float(beat) * 4) % 32] += float(velocity)
    return normalize(row[None])[0]


def groove_profile(hvo):
    steps, voices = np.where(hvo[..., 0] > 0)
    return onset_profile([(((step + hvo[step, voice, 2]) / 4) % 8,
                           hvo[step, voice, 1], voice) for step, voice in zip(steps, voices)])


def group_weights(groups):
    """Each source group has equal total weight, regardless of its tap count."""
    _, inverse, counts = np.unique(groups, return_inverse=True, return_counts=True)
    return 1. / (len(counts) * counts[inverse])


def fit_probe(features, targets, groups, alpha):
    """Weighted mean squared error + alpha * ||W||^2, unpenalized intercept.

    Only TRAIN rows may be supplied here. Scaling and centering are fitted on
    those same rows. A fixed alpha is used; validation never selects a probe.
    """
    x, y = np.asarray(features, np.float64), np.asarray(targets, np.float64)
    weights = group_weights(groups)
    if (x.ndim != 2 or y.ndim != 2 or len(x) != len(y) or len(x) != len(weights)
            or not len(x) or not np.isfinite(x).all() or not np.isfinite(y).all()
            or not math.isfinite(alpha) or alpha <= 0):
        raise ValueError('Invalid probe inputs or ridge alpha')
    mean_x, mean_y = weights @ x, weights @ y
    scale = np.sqrt(weights @ ((x - mean_x) ** 2))
    scale[scale < 1e-8] = 1.
    centered = (x - mean_x) / scale
    coefficient = np.linalg.solve(centered.T @ (weights[:, None] * centered)
                                  + alpha * np.eye(x.shape[1]),
                                  centered.T @ (weights[:, None] * (y - mean_y)))
    return dict(mean_x=mean_x, mean_y=mean_y, scale=scale, coefficient=coefficient)


def predict(probe, features):
    # Keep signed outputs for MSE and cosine: clipping could hide probe errors.
    return (features - probe['mean_x']) / probe['scale'] @ probe['coefficient'] + probe['mean_y']


def probe_metrics(predicted, targets, groups, train_mean):
    weights = group_weights(groups)
    mse = float(weights @ np.mean((predicted - targets) ** 2, axis=1))
    baseline = float(weights @ np.mean((train_mean - targets) ** 2, axis=1))
    return dict(mse=mse, train_mean_mse=baseline,
                mse_skill_vs_train_mean=1 - mse / baseline if baseline > 1e-15 else None,
                cosine_to_own_profile=float(weights @ np.sum(normalize(predicted) * targets, axis=1)))


def geometry(features):
    x = np.asarray(features, np.float64)
    singular = np.linalg.svd(x - x.mean(0), compute_uv=False)
    energy = singular ** 2
    total = float(energy.sum())
    p = energy[energy > 0] / total if total > 1e-24 else np.zeros(0)
    unit = normalize(x)
    n = len(x)
    return dict(rows=n, dimensions=x.shape[1], mean_dimension_std=float(x.std(0).mean()),
                effective_rank=float(np.exp(-(p * np.log(p)).sum())) if len(p) else 0.,
                mean_off_diagonal_cosine=float((np.sum(unit.sum(0) ** 2) - np.sum(unit ** 2))
                                              / (n * (n - 1))) if n > 1 else None)


@torch.no_grad()
def collect(model, encoder, corpus, groups, batch_size):
    if any(corpus.groups[g]['split'] not in ('train', 'validation') for g in groups):
        raise ValueError('Diagnostics may encode only train/validation groups')
    device = next(model.parameters()).device
    selection = corpus.selection(groups)
    pairs, indexes = selection['pair_indexes'], selection['groove_indexes']
    frozen, projected, taps = [], [], []
    for start in range(0, len(indexes), batch_size):
        hvo = torch.from_numpy(np.array(corpus.grooves[indexes[start:start+batch_size]], copy=True))
        hvo = hvo.to(device)
        z = encoder.encode(hvo)
        frozen.append(z.cpu())
        projected.append(model.project_grooves(model.groove_inputs(z, hvo)).cpu().numpy())
    frozen = torch.cat(frozen)
    projected = np.concatenate(projected)
    for start in range(0, len(pairs), batch_size):
        taps.append(model.encode_taps(*pack_taps(corpus, pairs[start:start+batch_size],
                                                model.config.tap_view, device)).cpu().numpy())
    result = dict(selection=selection, tap_groups=corpus.pair_groups[pairs],
                  frozen_groove=frozen.numpy(), projected_groove=projected, tap=np.concatenate(taps),
                  groove_onsets=np.stack([groove_profile(corpus.grooves[i]) for i in indexes]),
                  tap_onsets=np.stack([onset_profile(corpus.pairs[i]['events']) for i in pairs]))
    if any(not np.isfinite(result[k]).all() for k in (
            'frozen_groove', 'projected_groove', 'tap', 'groove_onsets', 'tap_onsets')):
        raise ValueError('Nonfinite diagnostic features')
    return result


def diagnose(corpus, checkpoint, device, alpha, batch_size):
    model, encoder, state = load_alignment(checkpoint, device)
    if state['identity']['inputs']['pairs'] != corpus.fingerprint:
        raise ValueError(f'Checkpoint pairs fingerprint differs: {checkpoint}')
    settings = state['identity']['settings']
    groups = corpus.split_groups('train')
    limit = settings.get('train_group_limit')
    if limit is not None and limit < len(groups):
        # Reconstruct the original trainer selection, including smoke runs.
        groups = sorted(map(int, np.random.default_rng(settings['seed']).choice(groups, limit, replace=False)))
    selections = dict(train=groups, validation=corpus.split_groups('validation'))
    if min(map(len, selections.values())) < 2:
        raise ValueError('At least two train and validation groups are required')
    data = {split: collect(model, encoder, corpus, chosen, batch_size) for split, chosen in selections.items()}
    probes, predictions = {}, {split: {} for split in data}
    for name in ('frozen_groove', 'projected_groove', 'tap'):
        target = 'tap_onsets' if name == 'tap' else 'groove_onsets'
        group_key = 'tap_groups' if name == 'tap' else None
        train_groups = data['train'][group_key] if group_key else selections['train']
        probe = fit_probe(data['train'][name], data['train'][target], train_groups, alpha)
        probes[name] = {}
        for split, values in data.items():
            predicted = predict(probe, values[name])
            predictions[split][name] = normalize(predicted)
            probes[name][split] = probe_metrics(predicted, values[target],
                values[group_key] if group_key else selections[split], probe['mean_y'])
    retrieval, query_rows = {}, []
    for split, values in data.items():
        scores = dict(
            alignment=values['tap'] @ values['projected_groove'].T,
            onset_baseline=values['tap_onsets'] @ values['groove_onsets'].T,
            tap_onsets_to_decoded_frozen_grooves=values['tap_onsets'] @ predictions[split]['frozen_groove'].T,
            tap_onsets_to_decoded_projected_grooves=values['tap_onsets'] @ predictions[split]['projected_groove'].T,
            decoded_taps_to_groove_onsets=predictions[split]['tap'] @ values['groove_onsets'].T)
        retrieval[split] = {name: retrieval_metrics(score, values['tap_groups'], selections[split])
                            for name, score in scores.items()}
        if split == 'validation':
            positive = values['tap_groups'][:, None] == np.asarray(selections[split])[None]
            for i, pair in enumerate(values['selection']['pair_indexes']):
                record = corpus.pairs[pair]
                methods = {}
                for name, score in scores.items():
                    threshold = score[i][positive[i]].max()
                    methods[name] = dict(rank=int(1 + ((score[i] >= threshold) & ~positive[i]).sum()),
                        top_groups=[int(selections[split][j]) for j in np.flatnonzero(score[i] == score[i].max())])
                query_rows.append(dict(pair_index=pair, source=record['source'],
                    participant=record['participant'], group=int(values['tap_groups'][i]), methods=methods))
    return dict(checkpoint=str(checkpoint), checkpoint_sha256=sha256(checkpoint), epoch=state['epoch'],
                identity=state['identity'], selection={s: v['selection'] for s, v in data.items()},
                retrieval=retrieval, probes=probes,
                geometry={s: {name: geometry(v[name]) for name in probes} for s, v in data.items()}), query_rows


def run(args):
    if args.out.exists():
        raise FileExistsError(f'Use a fresh --out directory: {args.out}')
    if not math.isfinite(args.ridge_alpha) or args.ridge_alpha <= 0 or min(args.threads, args.batch_size) < 1:
        raise ValueError('ridge-alpha, threads and batch-size must be positive')
    if len({p.resolve() for p in args.checkpoints}) != len(args.checkpoints):
        raise ValueError('Duplicate checkpoint paths')
    device = 'cuda' if args.device == 'auto' and torch.cuda.is_available() else args.device
    device = 'cpu' if device == 'auto' else device
    if device == 'cuda' and not torch.cuda.is_available():
        raise ValueError('CUDA requested but unavailable')
    torch.set_num_threads(args.threads)
    corpus = HumanPairs(args.pairs)
    reports, queries = [], []
    for index, checkpoint in enumerate(args.checkpoints):
        report, rows = diagnose(corpus, checkpoint, device, args.ridge_alpha, args.batch_size)
        reports.append(report)
        queries.extend(dict(checkpoint_index=index, **row) for row in rows)
        if args.console == 'compact':
            print(f'{checkpoint.parent.name}/{checkpoint.name} | epoch={report["epoch"]}')
            for name, metrics in report['retrieval']['validation'].items():
                print(f'  {name}: MRR={metrics["mrr"]:.3f} R@1={metrics["recall_at_1"]:.3f}')
            for name, metrics in report['probes'].items():
                skill = [metrics[s]['mse_skill_vs_train_mean'] for s in ('train', 'validation')]
                text = '/'.join('n/a' if v is None else f'{v:.3f}' for v in skill)
                rank = report['geometry']['validation'][name]['effective_rank']
                print(f'  probe {name}: MSE-skill(train/val)={text} effective-rank(val)={rank:.2f}')
    files = ('diagnose_alignment.py', 'alignment.py', 'alignment_data.py', 'alignment_metrics.py', 'encoder.py', 'rhythm.py')
    report = dict(format='alignment-diagnostics-v1', pairs_sha256=corpus.fingerprint,
        code_sha256=hashlib.sha256(b''.join(Path(__file__).with_name(n).read_bytes() for n in files)).hexdigest(),
        settings=dict(device=device, ridge_alpha=args.ridge_alpha, batch_size=args.batch_size),
        environment=dict(torch=str(torch.__version__), numpy=np.__version__), checkpoints=reports,
        protocol='Train/validation diagnostics; fixed ridge probes fitted/scaled on original train groups; no test encoding.',
        limitations=[
            'Onset readout is a structural diagnostic, not the compatibility training objective or perceptual ground truth.',
            'Poor linear readout does not prove information is absent; probe capacity/regularization may limit recovery.',
            'Cross-modal probe retrieval also depends on the other modality and candidate gallery.',
            'Probe train scores are in-sample; every group has equal weight within each modality.',
            'Validation checkpoints were already selected on these groups; this is not an independent benchmark.',
            'Groove pretraining overlap with TapTamDrum/GMD is not certified; participants are not held out.',
            '32-bin onset profiles discard voice identity and sub-bin timing; signed probe predictions are not clipped.',
            'Geometry is row-weighted and cannot establish perceptual quality or a causal bottleneck.'])
    report_text = json.dumps(report, indent=2, allow_nan=False) + '\n'
    query_text = ''.join(json.dumps(q, allow_nan=False) + '\n' for q in queries)
    args.out.mkdir(parents=True, exist_ok=False)
    (args.out/'validation-queries.jsonl').write_text(query_text)
    (args.out/'report.json').write_text(report_text)
    if args.console == 'json':
        print(report_text, end='')
    elif args.console == 'compact':
        print(f'Report: {args.out/"report.json"}')
    return report


def parser():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--pairs', type=Path, required=True)
    p.add_argument('--checkpoints', type=Path, nargs='+', required=True)
    p.add_argument('--out', type=Path, required=True)
    p.add_argument('--device', choices=('auto', 'cpu', 'cuda'), default='auto')
    p.add_argument('--ridge-alpha', type=float, default=.1)
    p.add_argument('--batch-size', type=int, default=128)
    p.add_argument('--threads', type=int, default=4)
    p.add_argument('--console', choices=('compact', 'json', 'quiet'), default='compact')
    return p


def main():
    p = parser()
    try:
        run(p.parse_args())
    except (ValueError, OSError) as error:
        p.error(str(error))
