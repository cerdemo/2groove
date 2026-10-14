"""Train-only paired shapelet dictionary with source-balanced contrastive fitting.

This is a prototype/kernel baseline, not Ye & Keogh's class decision tree.
Positive examples are all human interpretations; source mismatches are weak
negative labels, with known shared performances masked. Style is never read.
"""
from dataclasses import dataclass, asdict
import json
from pathlib import Path

import numpy as np

from groove.pretraining.audit import sha256
from .data import negative_groups, hard_negative
from .features import VERSION, WIDTHS, windows, profile


def squared_distance(a, b):
    return np.maximum(0, (a * a).sum(-1)[:, None] + (b * b).sum(-1)[None, :] - 2 * a @ b.T) / a.shape[-1]


def sigmoid(x):
    return 1 / (1 + np.exp(-np.clip(x, -40, 40)))


@dataclass
class FitConfig:
    motifs: int = 16
    seed: int = 42
    iterations: int = 300
    learning_rate: float = .15
    regularization: float = .02
    # Step-3 feature flags; v1 defaults keep historical checkpoints reproducible.
    offset_channel: bool = True
    onset_term: str = 'none'  # 'expected' | 'source'; scalar weights live in scoring.py

    def validate(self):
        if type(self.motifs) != int or type(self.iterations) != int or min(self.motifs, self.iterations) < 1:
            raise ValueError('Positive integer motif/training budgets required')
        if self.seed < 0 or not np.isfinite([self.learning_rate, self.regularization]).all() or self.learning_rate <= 0 or self.regularization < 0:
            raise ValueError('Invalid fitting configuration')
        if type(self.offset_channel) != bool or self.onset_term not in ('none', 'expected', 'source'):
            raise ValueError('Invalid feature configuration')


def medoids(x, weights, count, rng):
    """Seeded weighted k-means, then select actual paired training exemplars."""
    count = min(count, len(x))
    chosen = [int(rng.choice(len(x), p=weights / weights.sum()))]
    distance = squared_distance(x, x[chosen])[:, 0]
    while len(chosen) < count:
        probabilities = distance * weights
        if probabilities.sum() < 1e-12:
            break
        j = int(rng.choice(len(x), p=probabilities / probabilities.sum()))
        chosen.append(j)
        distance = np.minimum(distance, squared_distance(x, x[[j]])[:, 0])
    centers = x[chosen].copy()
    for _ in range(20):
        labels = squared_distance(x, centers).argmin(1)
        updated = centers.copy()
        for k in range(len(centers)):
            keep = labels == k
            if keep.any():
                updated[k] = np.average(x[keep], axis=0, weights=weights[keep])
        if np.allclose(updated, centers, atol=1e-7):
            break
        centers = updated
    return np.unique(squared_distance(centers, x).argmin(1))


V1_FEATURES = dict(offset_channel=True, onset_term='none')


class LocalCompatibility:
    def __init__(self, banks, coefficients, mean, scale, bias, metadata, features=None):
        self.banks, self.coefficients = banks, coefficients
        self.mean, self.scale, self.bias, self.metadata = mean, scale, float(bias), metadata
        self.features = dict(V1_FEATURES) if features is None else dict(features)

    def activations(self, p, modality):
        values = []
        for b in self.banks:
            x = (windows(p, b['width'], self.features['offset_channel']) - b['mean']) / b['scale']
            values.append(np.exp(-squared_distance(x, b[modality]) / 2))
        return values

    def pair_features(self, source, tap):
        return np.concatenate([(s * t).mean(0) for s, t in zip(
            self.activations(source, 'source'), self.activations(tap, 'tap'))])

    def compatibility(self, features):
        return float(sigmoid(((features - self.mean) / self.scale) @ self.coefficients + self.bias))

    def save(self, directory):
        directory = Path(directory)
        directory.mkdir(parents=True, exist_ok=False)
        arrays = dict(coefficients=self.coefficients, mean=self.mean, scale=self.scale, bias=np.array(self.bias))
        for i, bank in enumerate(self.banks):
            arrays.update({f'b{i}_{k}': np.asarray(v) for k, v in bank.items()})
        np.savez_compressed(directory / 'model.npz', **arrays)
        card = dict(format='paired-local-shapelets-v1', representation=VERSION,
                    features=self.features, arrays_sha256=sha256(directory / 'model.npz'),
                    metadata=self.metadata)
        (directory / 'model.json').write_text(json.dumps(card, indent=2, allow_nan=False) + '\n')

    @classmethod
    def load(cls, directory):
        directory = Path(directory)
        card = json.loads((directory / 'model.json').read_text())
        if card.get('format') != 'paired-local-shapelets-v1' or card.get('representation') != VERSION:
            raise ValueError('Incompatible local motif checkpoint')
        if sha256(directory / 'model.npz') != card['arrays_sha256']:
            raise ValueError('Changed local motif checkpoint')
        with np.load(directory / 'model.npz', allow_pickle=False) as data:
            banks = [{k: data[f'b{i}_{k}'].copy() for k in
                      ('width', 'mean', 'scale', 'source', 'tap', 'tap_profile', 'importance')}
                     for i in range(len(WIDTHS))]
            for bank in banks:
                bank['width'] = int(bank['width'])
            # Cards predating feature flags are exactly the v1 configuration.
            return cls(banks, data['coefficients'].copy(), data['mean'].copy(), data['scale'].copy(),
                       data['bias'], card['metadata'], card.get('features', V1_FEATURES))


def fit(groups, config=None, fingerprint=None):
    config = config or FitConfig()
    config.validate()
    if len(groups) < 2 or any(g.split != 'train' for g in groups):
        raise ValueError('Fit requires at least two TRAIN source groups only')
    if len({g.id for g in groups}) != len(groups):
        raise ValueError('Repeated source groups')
    rng = np.random.default_rng(config.seed)
    pools = {g.id: negative_groups(g, groups) for g in groups}
    hard_pools = {g.id: [other for other in pools[g.id] if hard_negative(g, other)] for g in groups}
    sources, taps, positive_groups, weights, provenance = [], [], [], [], []
    for g in groups:
        if not g.taps or not pools[g.id] or not profile(g.events)[:, 0].any():
            raise ValueError('Every training group needs human positives and unrelated negatives')
        for t in g.taps:
            if t['split'] != 'train':
                raise ValueError('Held-out tap in training group')
            if not len(t['events']):
                raise ValueError('Empty human positive')
            sources.append(profile(g.events)); taps.append(profile(t['events']))
            positive_groups.append(g.id); weights.append(1 / len(g.taps))
            provenance.append(dict(group=g.id, tap=t['source'], participant=t['participant']))
    sources, taps, weights = np.array(sources), np.array(taps), np.array(weights)
    weights /= weights.sum()
    banks, exemplars = [], []
    for width in WIDTHS:
        s = np.stack([windows(p, width, config.offset_channel) for p in sources]).reshape(len(sources) * 8, -1)
        t = np.stack([windows(p, width, config.offset_channel) for p in taps]).reshape(len(taps) * 8, -1)
        w = np.repeat(weights / 8, 8)
        joint = np.concatenate((s, t))
        mean = np.average(joint, axis=0, weights=np.tile(w, 2))
        variance = np.average((joint - mean) ** 2, axis=0, weights=np.tile(w, 2))
        scale = np.where(variance < 1e-8, 1., np.sqrt(variance))
        s, t = (s - mean) / scale, (t - mean) / scale
        ids = medoids(np.concatenate((s, t), axis=1), w, config.motifs, rng)
        raw_taps = np.stack([p[(start + np.arange(width)) % 32]
                             for p in taps for start in range(0, 32, 4)])
        banks.append(dict(width=width, mean=mean, scale=scale, source=s[ids], tap=t[ids],
                          tap_profile=raw_taps[ids], importance=np.ones(len(ids))))
        exemplars.append([dict(**provenance[int(i) // 8], start_step=int(i % 8) * 4) for i in ids])
    size = sum(len(b['source']) for b in banks)
    model = LocalCompatibility(banks, np.zeros(size), np.zeros(size), np.ones(size), 0., {},
                               dict(offset_channel=config.offset_channel, onset_term=config.onset_term))
    by_id = {g.id: g for g in groups}
    indexes = {g.id: np.flatnonzero(np.array(positive_groups) == g.id) for g in groups}
    s_cache = [model.activations(p, 'source') for p in sources]
    t_cache = [model.activations(p, 'tap') for p in taps]
    def features(i, j):
        return np.concatenate([(s * t).mean(0) for s, t in zip(s_cache[i], t_cache[j])])
    x, y, sample_weights, negatives = [], [], [], []
    for i, group_id in enumerate(positive_groups):
        g = by_id[group_id]
        options = pools[g.id]
        hard = hard_pools[g.id]
        selected = [options[int(rng.integers(len(options)))], (hard or options)[int(rng.integers(len(hard or options)))]]
        x.append(features(i, i)); y.append(1); sample_weights.append(weights[i] / 2)
        for other in selected:
            j = int(rng.choice(indexes[other.id]))
            x.append(features(i, j)); y.append(0); sample_weights.append(weights[i] / 4)
            negatives.append(dict(source=group_id, tap_group=other.id, tap=provenance[j]['tap'],
                                  hard=hard_negative(g, other)))
    x, y, w = np.array(x), np.array(y), np.array(sample_weights)
    model.mean = np.average(x, axis=0, weights=w)
    sd = np.sqrt(np.average((x - model.mean) ** 2, axis=0, weights=w))
    model.scale = np.where(sd < 1e-6, 1., sd)
    x = (x - model.mean) / model.scale
    for _ in range(config.iterations):
        residual = (sigmoid(x @ model.coefficients + model.bias) - y) * w
        model.coefficients -= config.learning_rate * (x.T @ residual + config.regularization * model.coefficients)
        model.bias -= config.learning_rate * residual.sum()
    offset = 0
    for b in banks:
        n = len(b['source'])
        b['importance'] = .1 + np.maximum(0, model.coefficients[offset:offset+n])
        offset += n
    model.metadata = dict(config=asdict(config), pairs_fingerprint=fingerprint,
        train_groups=[g.id for g in groups], positive_pairs=provenance, negatives=negatives,
        exemplars=exemplars, pretrained_encoder_used=False, style_target=False,
        transfer_hypothesis='Human 2-ch local compatibility transfers to generated 1-ch; UNVALIDATED.',
        supervision='All observed interpretations positive; unrelated-source pairs weak negatives.',
        training_loss=float(np.sum(w * (np.logaddexp(0, x @ model.coefficients + model.bias)
                                       - y * (x @ model.coefficients + model.bias)))))
    return model
