"""Fixed-scorer step-3 diagnostics: component ablation, score attacks, artificial 1-ch views.

Everything here evaluates the unchanged conservation-v1 scorer on validation
groups only. Attacks measure score exploitability, not human preference.
Channel-isolated taps are artificial views, never real solo ground truth.
Test data is never encoded or evaluated.
"""
import math

import numpy as np

from groove.representation.alignment_metrics import retrieval_metrics
from .data import hard_negative
from .features import profile, profile_events, validate_events
from .scoring import ConservationScorer

COMPONENTS = ('weighted_retention', 'learned_compatibility', 'onset_alignment',
              'incompatible_additions', 'phase_loss', 'order_loss', 'density_excess')
# Degraded source copies must not outscore the unaltered copy they came from.
DEGRADATIONS = ('shifted_sixteenth', 'shifted_beat', 'reversed', 'flat_velocity', 'quantized_timing')


def add_onsets(p, support, count):
    """Density-inflation attack: occupy the least-supported silent steps."""
    result = np.asarray(p, dtype=float).copy()
    silent = np.flatnonzero(result[:, 0] == 0)
    for i in silent[np.argsort(support[silent], kind='stable')][:count]:
        result[i] = (1, .8, 0)
    return result


def tap_attacks(p, support):
    """Manipulations of a real human tap that must not raise a trustworthy score."""
    quantized = p.copy(); quantized[:, 2] = 0
    flat = p.copy(); flat[flat[:, 0] > 0, 1] = .8
    additions = max(1, math.ceil(p[:, 0].sum() / 2))
    return dict(tap_plus_additions=add_onsets(p, support, additions),
                tap_quantized_timing=quantized, tap_flat_velocity=flat)


def hand_views(events):
    """ARTIFICIAL channel isolation; None unless at least two channels have events."""
    x = validate_events(events)
    if not len(x):
        return None
    channels = sorted({int(c) for c in x[:, 2]})
    if len(channels) < 2:
        return None
    counts = {c: int((x[:, 2] == c).sum()) for c in channels}
    dense = max(channels, key=lambda c: (counts[c], -c))
    sparse = min(channels, key=lambda c: (counts[c], c))
    return dict(denser_hand=x[x[:, 2] == dense], sparser_hand=x[x[:, 2] == sparse])


def onset_overlap(candidate, source):
    """Structural copy indicators toward the source onset set; occupancy only."""
    c, s = np.asarray(candidate)[:, 0] > 0, np.asarray(source)[:, 0] > 0
    inter = float((c & s).sum())
    return dict(precision=inter / max(1., float(c.sum())), recall=inter / max(1., float(s.sum())),
                jaccard=inter / max(1., float((c | s).sum())))


def archive_copy_report(archive, source_profile, best_human_raw, source_copy_raw):
    """Search-time onset-copy diagnostics.

    Onset structure is comparable across scorer conditions; quality values are
    not, because each condition defines its own scalar. Elites remain synthetic
    candidates, never human solo targets.
    """
    source = np.asarray(source_profile, dtype=float)
    rows = []
    for elite in archive:
        overlap = onset_overlap(np.array(elite['genome']), source)
        rows.append(dict(cell=list(elite['cell']), raw_quality=float(elite['score']['raw_quality']),
                         **overlap))
    if not rows:
        return dict(elites=0)
    best = max(rows, key=lambda r: r['raw_quality'])
    precisions = np.array([r['precision'] for r in rows])
    qualities = np.array([r['raw_quality'] for r in rows])
    correlation = None
    if len(rows) >= 3 and precisions.std() > 1e-12 and qualities.std() > 1e-12:
        correlation = float(np.corrcoef(precisions, qualities)[0, 1])
    return dict(elites=len(rows), source_onset_density=float((source[:, 0] > 0).mean()),
        mean_precision=float(precisions.mean()), precision_of_best=best['precision'],
        jaccard_of_best=best['jaccard'], max_jaccard=float(max(r['jaccard'] for r in rows)),
        best_elite_raw_quality=best['raw_quality'], best_human_raw_quality=best_human_raw,
        source_copy_raw_quality=source_copy_raw,
        best_exceeds_best_human=(None if best_human_raw is None
                                 else bool(best['raw_quality'] >= best_human_raw)),
        quality_precision_correlation=correlation, per_elite=rows)


def analytic_chance(mask, labels, gallery):
    counts = mask.sum(1)
    keep = counts >= 2
    per_group = []
    for group in gallery:
        selected = counts[keep & (labels == group)]
        if len(selected):
            per_group.append([np.mean([np.mean(1 / np.arange(1, n + 1)) for n in selected]),
                              np.mean(1 / selected)])
    if not per_group:
        return dict(queries=0)
    mrr, recall = np.mean(per_group, axis=0)
    return dict(mrr=float(mrr), recall_at_1=float(recall))


def diagnose(model, groups):
    if not groups:
        return dict(status='no_validation_groups')
    if any(g.split != 'validation' for g in groups):
        raise ValueError('Diagnostics accept validation groups only; test remains frozen')
    if set(model.metadata['train_groups']) & {g.id for g in groups}:
        raise ValueError('Diagnostic source was fitted')
    taps = [(g, t) for g in groups for t in g.taps]
    labels = np.array([g.id for g, _ in taps])
    gallery = [g.id for g in groups]
    scorers = [ConservationScorer(model, g.events) for g in groups]
    fields = COMPONENTS + ('raw_quality',)
    matrices = {name: np.zeros((len(taps), len(groups))) for name in fields}
    onset = np.zeros((len(taps), len(groups)))
    allowed = np.zeros(onset.shape, dtype=bool)
    matched = np.zeros_like(allowed)
    tap_profiles = [profile(t['events']) for _, t in taps]
    for j, (g, scorer) in enumerate(zip(groups, scorers)):
        gp = profile(g.events)
        for i, (owner, tap) in enumerate(taps):
            result = scorer.score(tap['events'], details=False)
            for name in fields:
                matrices[name][i, j] = result[name]
            tp = tap_profiles[i]
            onset[i, j] = tp[:, 1] @ gp[:, 1] / max(1e-12, np.linalg.norm(tp[:, 1]) * np.linalg.norm(gp[:, 1]))
            allowed[i, j] = owner.id == g.id or not owner.performances & g.performances
            matched[i, j] = allowed[i, j] and (owner.id == g.id or hard_negative(owner, g))
    m = matrices
    penalty = (.3 * m['incompatible_additions'] + .2 * m['phase_loss']
               + .2 * m['order_loss'] + .25 * m['density_excess'])
    scorelike = dict(full_raw_quality=m['raw_quality'],
        weighted_retention=m['weighted_retention'], learned_compatibility=m['learned_compatibility'],
        onset_alignment_only=m['onset_alignment'],
        positive_terms=m['raw_quality'] + penalty,
        additions_only=-m['incompatible_additions'], phase_only=-m['phase_loss'],
        order_only=-m['order_loss'], density_excess_only=-m['density_excess'],
        penalty_terms=-penalty, onset_baseline=onset)
    ablation = {name: dict(all=retrieval_metrics(s, labels, gallery, allowed),
                           tempo_density_matched=retrieval_metrics(s, labels, gallery, matched))
                for name, s in scorelike.items()}
    chance = {name: analytic_chance(mask, labels, gallery)
              for name, mask in (('all', allowed), ('tempo_density_matched', matched))}
    rows = {g.id: np.flatnonzero(labels == g.id) for g in groups}
    battery = []
    for j, (g, scorer) in enumerate(zip(groups, scorers)):
        own = m['raw_quality'][rows[g.id], j]
        best_human = float(own.max())
        controls = scorer.controls()
        copy_quality = float(controls['source_onset_copy']['raw_quality'])
        entries = {}
        for name, result in controls.items():
            entry = dict(raw_quality=float(result['raw_quality']), quality=float(result['quality']),
                         outscores_best_human=bool(result['raw_quality'] >= best_human),
                         components={k: float(result[k]) for k in COMPONENTS})
            if name in DEGRADATIONS:
                entry['outscores_source_copy'] = bool(result['raw_quality'] >= copy_quality)
            entries[name] = entry
        tap = g.taps[0]
        base = scorer.score(tap['events'], details=False)
        for name, view in tap_attacks(profile(tap['events']), scorer.expected).items():
            result = scorer.score(profile_events(view), details=False)
            entries[name] = dict(raw_quality=float(result['raw_quality']), quality=float(result['quality']),
                score_increased=bool(result['raw_quality'] > base['raw_quality']),
                delta_raw_quality=float(result['raw_quality'] - base['raw_quality']),
                outscores_best_human=bool(result['raw_quality'] >= best_human),
                component_deltas={k: float(result[k] - base[k]) for k in COMPONENTS})
        battery.append(dict(source_group=g.id, best_human_raw_quality=best_human,
            median_human_raw_quality=float(np.median(own)), source_copy_raw_quality=copy_quality,
            attacked_tap=dict(source=tap['source'], participant=tap['participant'],
                              raw_quality=float(base['raw_quality'])),
            entries=entries))
    aggregate = {}
    for name in battery[0]['entries']:
        values = [b['entries'][name] for b in battery]
        aggregate[name] = dict(groups=len(values),
            outscores_best_human=int(sum(v['outscores_best_human'] for v in values)))
        if 'outscores_source_copy' in values[0]:
            aggregate[name]['outscores_source_copy'] = int(sum(v['outscores_source_copy'] for v in values))
        if 'score_increased' in values[0]:
            aggregate[name].update(score_increased=int(sum(v['score_increased'] for v in values)),
                mean_delta_raw_quality=float(np.mean([v['delta_raw_quality'] for v in values])),
                mean_component_deltas={k: float(np.mean([v['component_deltas'][k] for v in values]))
                                       for k in COMPONENTS})
    views = {i: hand_views(taps[i][1]['events']) for i in range(len(taps))}
    eligible = np.array([i for i, v in views.items() if v is not None], dtype=int)
    if len(eligible):
        per_view = dict(two_channel_union=m['raw_quality'][eligible])
        for key in ('denser_hand', 'sparser_hand'):
            s = np.zeros((len(eligible), len(groups)))
            for j, scorer in enumerate(scorers):
                for k, i in enumerate(eligible):
                    s[k, j] = scorer.score(views[i][key], details=False)['raw_quality']
            per_view[key] = s
        own_positive = labels[eligible][:, None] == np.array(gallery)[None, :]
        transfer = dict(status='artificial_channel_isolation', real_solo_ground_truth=False,
            eligible_taps=int(len(eligible)), total_taps=len(taps),
            metrics={key: dict(all=retrieval_metrics(s, labels[eligible], gallery, allowed[eligible]),
                               tempo_density_matched=retrieval_metrics(s, labels[eligible], gallery,
                                                                       matched[eligible]))
                     for key, s in per_view.items()},
            own_source_mean_raw_quality={key: float(s[own_positive].mean())
                                         for key, s in per_view.items()})
    else:
        transfer = dict(status='no_multi_channel_taps', real_solo_ground_truth=False,
                        eligible_taps=0, total_taps=len(taps))
    positive = labels[:, None] == np.array(gallery)[None, :]
    best_positive = np.where(positive, m['raw_quality'], -np.inf).max(1)
    ranks = 1 + ((m['raw_quality'] >= best_positive[:, None]) & ~positive & allowed).sum(1)
    own_column = [gallery.index(labels[i]) for i in range(len(taps))]
    queries = [dict(source_group=str(labels[i]), tap=taps[i][1]['source'],
        participant=taps[i][1]['participant'], rank=int(ranks[i]), candidates=int(allowed[i].sum()),
        components={k: float(m[k][i, own_column[i]]) for k in fields},
        onset_baseline=float(onset[i, own_column[i]])) for i in range(len(taps))]
    return dict(status='exploratory_scorer_diagnostics', score_version='conservation-v1',
        source_groups=len(groups), human_taps=len(taps),
        interpretation='Fixed-scorer diagnostics: ablation retrieval, synthetic attacks and artificial '
                       '1-ch probes. None of these are human perceptual judgments.',
        human_perceptual_validation=False, transfer_to_solo_validated=False,
        ablation=ablation, chance=chance,
        attack_battery=dict(provenance='synthetic attacks, NOT human solo targets',
                            per_group=battery, aggregate=aggregate),
        transfer_probe=transfer, queries=queries, gallery_groups=gallery)
