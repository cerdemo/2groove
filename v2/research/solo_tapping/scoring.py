"""Inspectable conservation components; optimization proxies, not human ratings."""
import numpy as np

from .features import STARTS, profile, profile_events
from .model import V1_FEATURES

# Declared engineering choices, not human-fitted preferences. With an onset term
# the positive mass is redistributed; penalties are unchanged across versions.
POSITIVE_WEIGHTS = dict(none=(.5, .5, 0.), expected=(.35, .35, .3), source=(.35, .35, .3))
PENALTY_WEIGHTS = dict(incompatible_additions=.3, phase_loss=.2, order_loss=.2, density_excess=.25)


class ConservationScorer:
    def __init__(self, model, source_events):
        self.model = model
        self.source = profile(source_events)
        if not self.source[:, 0].any():
            raise ValueError('A nonempty full groove is required')
        self.source_activations = model.activations(self.source, 'source')
        self.conditionals, self.window_weights = [], []
        self.expected = np.zeros(32)
        self.expected_velocity = np.zeros(32)
        for b, activation in zip(model.banks, self.source_activations):
            weights = activation * b['importance']
            weights /= np.maximum(weights.sum(1, keepdims=True), 1e-12)
            self.conditionals.append(weights)
            idx = (STARTS[:, None] + np.arange(b['width'])) % 32
            # Inverse overlap allocation: every source onset contributes total 1
            # per scale, never once per family pair or overlapping window.
            mass = self.source[idx, 0].sum(1) / (b['width'] / 4)
            self.window_weights.append(mass / mass.sum() / len(model.banks))
            support = weights @ b['tap_profile'][..., 0]
            np.add.at(self.expected, idx.ravel(), (support / (b['width'] / 4) / len(model.banks)).ravel())
            velocity = weights @ b['tap_profile'][..., 1]
            np.add.at(self.expected_velocity, idx.ravel(),
                      (velocity / (b['width'] / 4) / len(model.banks)).ravel())
        term = model.features['onset_term']
        # 'expected' compares with the human-conditioned velocity profile, not the
        # raw source, so the onset term itself does not reward source onset copying.
        self.onset_reference = dict(none=None, expected=self.expected_velocity,
                                    source=self.source[:, 1])[term]

    def score(self, events, details=True):
        candidate = profile(events)
        tap_activations = self.model.activations(candidate, 'tap')
        local = []
        pair_features = []
        retention, bag = 0., 0.
        phase_scores = np.zeros(8)
        for b, source, tap, weights, mass in zip(self.model.banks, self.source_activations,
                tap_activations, self.conditionals, self.window_weights):
            match = weights @ tap.T
            pair_features.append((source * tap).mean(0))
            aligned = match.diagonal()
            retention += float(mass @ aligned)
            bag += float(mass @ match.max(1))
            for shift in range(8):
                phase_scores[shift] += mass @ match[np.arange(8), (np.arange(8) + shift) % 8]
            if details:
                local.extend(dict(width_steps=b['width'], start_step=int(STARTS[i]),
                    evidence_weight=float(mass[i]), compatibility=float(aligned[i]),
                    dominant_motif=int(weights[i].argmax())) for i in range(8))
        learned = self.model.compatibility(np.concatenate(pair_features))
        count = float(candidate[:, 0].sum())
        additions = float(candidate[:, 0] @ (1 - self.expected) / max(1, count))
        density_excess = float(max(0, count - self.expected.sum()) / 32)
        # Compare coherent cyclic window reassignment with an order-free upper
        # bound. Also probe all 32 onset phases against source-conditioned support,
        # so sub-beat displacements are not missed by the four-step window hop.
        best_phase = float(phase_scores.max())
        support_by_phase = np.array([np.roll(candidate[:, 0], shift) @ self.expected / max(1, count)
                                     for shift in range(32)])
        phase_loss = max(0., best_phase - retention, float(support_by_phase.max() - support_by_phase[0]))
        order_loss = max(0., bag - best_phase)
        onset_alignment = 0.
        if self.onset_reference is not None:
            velocities = candidate[:, 1]
            onset_alignment = float(velocities @ self.onset_reference / max(
                1e-12, np.linalg.norm(velocities) * np.linalg.norm(self.onset_reference)))
        if not count:
            retention, learned = 0., 0.
        term = self.model.features['onset_term']
        wr, wl, wo = POSITIVE_WEIGHTS[term]
        raw = (wr * retention + wl * learned + wo * onset_alignment
               - .3 * additions - .2 * phase_loss - .2 * order_loss - .25 * density_excess)
        return dict(quality=float(np.clip(raw, 0, 1)), raw_quality=float(raw),
            weighted_retention=retention, learned_compatibility=learned,
            onset_alignment=onset_alignment,
            incompatible_additions=additions, phase_loss=phase_loss, order_loss=order_loss,
            density_excess=density_excess, expected_onsets=float(self.expected.sum()),
            candidate_onsets=int(count), source_onsets=int(self.source[:, 0].sum()), local=local,
            score_version='conservation-v1' if self.model.features == V1_FEATURES else 'conservation-v2',
            onset_term=term, transfer_validated=False)

    def controls(self):
        p = self.source
        count = int(p[:, 0].sum())
        metronome = np.zeros((32, 3))
        metronome[np.floor(np.arange(count) * 32 / count).astype(int)] = (1, .8, 0)
        dense = np.tile([1, .8, 0], (32, 1))
        flat = p.copy(); flat[flat[:, 0] > 0, 1] = .8
        quantized = p.copy(); quantized[:, 2] = 0
        views = dict(source_onset_copy=p, density_matched_even=metronome, saturated=dense,
                     shifted_sixteenth=np.roll(p, 1, axis=0), shifted_beat=np.roll(p, 4, axis=0),
                     reversed=p[::-1], flat_velocity=flat, quantized_timing=quantized,
                     empty=np.zeros((32, 3)))
        return {name: dict(provenance='synthetic control, NOT human solo target',
                           **self.score(profile_events(view))) for name, view in views.items()}
