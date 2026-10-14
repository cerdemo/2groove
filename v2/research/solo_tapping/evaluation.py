"""Held-out human two-channel retrieval and anti-shortcut diagnostics only."""
import numpy as np

from groove.representation.alignment_metrics import retrieval_metrics
from .data import hard_negative
from .features import profile
from .scoring import ConservationScorer


def evaluate(model, groups):
    if not groups:
        return dict(status='no_validation_groups')
    if any(g.split != 'validation' for g in groups):
        raise ValueError('Pilot evaluation accepts validation groups only; test remains frozen')
    if set(model.metadata['train_groups']) & {g.id for g in groups}:
        raise ValueError('Evaluation source was fitted')
    taps = [(g, t) for g in groups for t in g.taps]
    scores = np.zeros((len(taps), len(groups)))
    learned, onset, density = (np.zeros_like(scores) for _ in range(3))
    allowed, matched = (np.zeros_like(scores, dtype=bool) for _ in range(2))
    for j, g in enumerate(groups):
        scorer = ConservationScorer(model, g.events)
        gp = profile(g.events)
        for i, (owner, tap) in enumerate(taps):
            result = scorer.score(tap['events'], details=False)
            scores[i, j] = result['raw_quality']
            learned[i, j] = result['learned_compatibility']
            tp = profile(tap['events'])
            onset[i, j] = tp[:, 1] @ gp[:, 1] / max(1e-12, np.linalg.norm(tp[:, 1]) * np.linalg.norm(gp[:, 1]))
            density[i, j] = -abs(tp[:, 0].sum() - gp[:, 0].sum())
            allowed[i, j] = owner.id == g.id or not owner.performances & g.performances
            matched[i, j] = allowed[i, j] and (owner.id == g.id or hard_negative(owner, g))
    labels = [g.id for g, _ in taps]
    gallery = [g.id for g in groups]
    report = dict(status='exploratory_real_2ch_validation', source_groups=len(groups), human_taps=len(taps),
        transfer_to_solo_validated=False, human_perceptual_validation=False,
        hard_definition='source BPM within 10%, source unique-onset density within 20%; no style filter',
        candidate_semantics='Known positives; unrelated sources are not proven perceptual negatives.',
        metrics={})
    for name, values in dict(conservation=scores, learned=learned, onset=onset, density=density).items():
        report['metrics'][name] = dict(all=retrieval_metrics(values, labels, gallery, allowed),
                                      tempo_density_matched=retrieval_metrics(values, labels, gallery, matched))
    report['chance'] = {}
    for name, mask in [('all', allowed), ('tempo_density_matched', matched)]:
        counts = mask.sum(1)
        keep = counts >= 2
        per_group = []
        for group in gallery:
            selected = counts[keep & (np.array(labels) == group)]
            if len(selected):
                per_group.append([np.mean([np.mean(1 / np.arange(1, n+1)) for n in selected]),
                                  np.mean(1 / selected)])
        report['chance'][name] = (dict(mrr=float(np.mean(per_group, axis=0)[0]),
            recall_at_1=float(np.mean(per_group, axis=0)[1])) if per_group else dict(queries=0))
    # Every true human interpretation remains a positive in groove → human retrieval.
    report['full_to_human_multi_positive'] = retrieval_metrics(scores.T, gallery, labels, allowed.T)
    if len(groups) > 1:
        permuted = {g: gallery[(i + 1) % len(gallery)] for i, g in enumerate(gallery)}
        report['shuffled_pair_control'] = retrieval_metrics(scores, [permuted[g] for g in labels], gallery)
    report['queries'] = [dict(source_group=g.id, tap=t['source'], participant=t['participant'],
        scores=scores[i].tolist(), allowed=allowed[i].tolist(), hard_candidates=matched[i].tolist())
        for i, (g, t) in enumerate(taps)]
    report['gallery_groups'] = gallery
    return report
