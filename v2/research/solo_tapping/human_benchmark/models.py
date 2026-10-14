"""Small, fixed-budget hurdle models: onset probability + hit-conditional velocity.

Every model uses the same heads/regularization. Local kernels are source shapelet
features, not a claim to reproduce either Ye/Keogh trees or the paired 2-ch pilot.
"""
from dataclasses import dataclass, field

import numpy as np

from ..features import METER
from ..model import medoids, squared_distance, sigmoid

CONDITIONS = ('constant', 'meter', 'onset', 'fwod', 'meter_onset', 'meter_fwod',
              'meter_onset_fwod', 'local_linear', 'shapelet')
WIDTHS = (4, 8)


def descriptors(counts):
    x = np.asarray(counts, dtype=float)
    if x.shape != (16, 3) or not np.isfinite(x).all() or (x < 0).any() or (x != np.floor(x)).any():
        raise ValueError('Expected one-bar [16,3] nonnegative LMH counts')
    onset = x.sum(1)
    fwod = x @ np.array([3., 2., 1.])
    return np.column_stack((METER[:16], onset / max(1, onset.max()), fwod / max(1, fwod.max())))


def local_windows(counts, width):
    # Fixed cyclic positions, centered at the target step; no minimum over shifts.
    d = descriptors(counts)[:, 1:]
    indices = (np.arange(16)[:, None] + np.arange(width) - width // 2) % 16
    return d[indices].reshape(16, -1)


def source_weights(sources):
    groups = {}
    for s in sources:
        groups[s['group']] = groups.get(s['group'], 0) + 1
    return np.array([1 / len(groups) / groups[s['group']] for s in sources])


def record_weights(records, sources):
    """Equal parent-group mass, equal source mass within group, equal take mass."""
    by_id = {s['id']: s for s in sources}
    totals = {}
    for t in records:
        totals[t['source_id']] = totals.get(t['source_id'], 0) + 1
    sw = dict(zip([s['id'] for s in sources], source_weights(sources)))
    return np.array([sw[t['source_id']] / totals[t['source_id']] for t in records])


def linear_head(x, y, weights, ridge):
    penalty = np.eye(x.shape[1]) * ridge
    penalty[0, 0] = 1e-10
    w = weights / weights.sum()
    return np.linalg.solve(x.T @ (x * w[:, None]) + penalty, x.T @ (w * y))


def logistic_head(x, y, weights, ridge):
    w = weights / weights.sum()
    beta = np.zeros(x.shape[1])
    mean = np.clip(w @ y, 1e-5, 1 - 1e-5)
    beta[0] = np.log(mean / (1 - mean))
    penalty = np.eye(x.shape[1]) * ridge
    penalty[0, 0] = 0
    if np.all(y == y[0]):
        return beta, dict(converged=True, iterations=0, constant_target=True)
    def loss(b):
        z = x @ b
        return float(w @ (np.logaddexp(0, z) - y * z) + .5 * b @ penalty @ b)
    for iteration in range(100):
        prob = sigmoid(x @ beta)
        gradient = x.T @ (w * (prob - y)) + penalty @ beta
        if np.max(np.abs(gradient)) < 1e-8:
            return beta, dict(converged=True, iterations=iteration)
        hessian = x.T @ (x * (w * prob * (1 - prob))[:, None]) + penalty
        step = np.linalg.solve(hessian + np.eye(len(beta)) * 1e-10, gradient)
        rate, old = 1., loss(beta)
        while rate > 1e-8 and loss(beta - rate * step) > old:
            rate *= .5
        beta -= rate * step
    raise ValueError('Onset head failed to converge; do not publish partial fit')


@dataclass
class HurdleModel:
    condition: str
    banks: list = field(default_factory=list)
    metadata: dict = field(default_factory=dict)
    mean: np.ndarray | None = None
    scale: np.ndarray | None = None
    hit_beta: np.ndarray | None = None
    velocity_beta: np.ndarray | None = None
    sigma: float = .1

    def features(self, counts):
        d = descriptors(counts)
        columns = {'constant': [], 'meter': [0], 'onset': [1], 'fwod': [2],
                   'meter_onset': [0, 1], 'meter_fwod': [0, 2],
                   'meter_onset_fwod': [0, 1, 2], 'local_linear': [0, 1, 2], 'shapelet': [0, 1, 2]}
        if self.condition not in columns:
            raise ValueError('Unknown feature condition')
        parts = [d[:, columns[self.condition]]]
        if self.condition == 'local_linear':
            parts.extend(local_windows(counts, width) for width in WIDTHS)
        if self.condition == 'shapelet':
            for bank in self.banks:
                x = (local_windows(counts, bank['width']) - bank['mean']) / bank['scale']
                parts.append(np.exp(-squared_distance(x, bank['prototypes']) / 2))
        return np.concatenate(parts, axis=1)

    def predict(self, counts):
        f = self.features(counts)
        x = np.column_stack((np.ones(16), (f - self.mean) / self.scale))
        return np.clip(sigmoid(x @ self.hit_beta), 1e-6, 1 - 1e-6), np.clip(x @ self.velocity_beta, 0, 1)

    def serialize(self):
        return dict(condition=self.condition, banks=[{
            k: v.tolist() if isinstance(v, np.ndarray) else v for k, v in bank.items()
        } for bank in self.banks], metadata=self.metadata, mean=self.mean.tolist(),
            scale=self.scale.tolist(), hit_beta=self.hit_beta.tolist(),
            velocity_beta=self.velocity_beta.tolist(), sigma=self.sigma)


def fit(sources, records, condition, *, motifs=8, ridge=.01, seed=42):
    if condition not in CONDITIONS or motifs < 1 or not np.isfinite(ridge) or ridge <= 0:
        raise ValueError('Invalid model configuration')
    ids = {s['id'] for s in sources}
    if not sources or not records or len(ids) != len(sources):
        raise ValueError('Unique training sources and training records required')
    if any(t['source_id'] not in ids or t['role'] != 'primary' for t in records):
        raise ValueError('Only selected primary training records may fit a model')
    if {t['source_id'] for t in records} != ids:
        raise ValueError('Every training source needs human responses')
    model = HurdleModel(condition)
    if condition == 'shapelet':
        rng = np.random.default_rng(seed)
        weights = np.repeat(source_weights(sources) / 16, 16)
        for width in WIDTHS:
            x = np.concatenate([local_windows(s['counts'], width) for s in sources])
            mean = np.average(x, axis=0, weights=weights)
            sd = np.sqrt(np.average((x - mean) ** 2, axis=0, weights=weights))
            sd = np.where(sd < 1e-6, 1., sd)
            scaled = (x - mean) / sd
            chosen = medoids(scaled, weights, motifs, rng)
            model.banks.append(dict(width=width, mean=mean, scale=sd, prototypes=scaled[chosen],
                exemplars=[dict(source_id=sources[int(i) // 16]['id'], center_step=int(i % 16)) for i in chosen]))
    feature_by_id = {s['id']: model.features(s['counts']) for s in sources}
    features = np.concatenate([feature_by_id[t['source_id']] for t in records])
    weights = np.repeat(record_weights(records, sources) / 16, 16)
    velocity = np.asarray([t['velocity'] for t in records], float).ravel()
    if not np.isfinite(velocity).all() or (velocity < 0).any() or (velocity > 1).any():
        raise ValueError('Invalid observed velocities')
    hit = velocity > 0
    model.mean = np.average(features, axis=0, weights=weights)
    sd = np.sqrt(np.average((features - model.mean) ** 2, axis=0, weights=weights))
    model.scale = np.where(sd < 1e-6, 1., sd)
    x = np.column_stack((np.ones(len(features)), (features - model.mean) / model.scale))
    model.hit_beta, diagnostics = logistic_head(x, hit.astype(float), weights, ridge)
    if not hit.any():
        model.velocity_beta = np.zeros(x.shape[1])
        model.sigma = .1
    else:
        model.velocity_beta = linear_head(x[hit], velocity[hit], weights[hit], ridge)
        residual = velocity[hit] - np.clip(x[hit] @ model.velocity_beta, 0, 1)
        model.sigma = float(max(.05, np.sqrt(np.average(residual ** 2, weights=weights[hit]))))
    model.metadata = dict(train_sources=sorted(ids), train_groups=sorted({s['group'] for s in sources}),
        train_records=sorted(t['id'] for t in records),
        train_participants=sorted({t['participant'] for t in records}),
        train_sessions=sorted({t['session'] for t in records}),
        fit_diagnostics=diagnostics, seed=seed, ridge=ridge, motifs=motifs,
        pretrained_encoder_used=False, style_target=False,
        velocity='Original normalized MIDI velocity, conditional on human onset; no subject-wise test normalization',
        dictionary='Training-source local prototypes; response heads supervised by all selected human interpretations')
    return model
