"""Group-macro known-source retrieval diagnostics, not human compatibility judgments."""
import math
import numpy as np
import torch

from .alignment import multi_positive_loss
from .alignment_data import candidate_mask, pack_taps, style_and_tempo


def retrieval_metrics(scores, tap_groups, gallery_groups, allowed=None):
    scores = np.asarray(scores)
    tap_groups, gallery_groups = np.asarray(tap_groups), np.asarray(gallery_groups)
    positive = tap_groups[:, None] == gallery_groups[None, :]
    if scores.shape != positive.shape or not np.isfinite(scores).all() or not positive.any(1).all():
        raise ValueError('Invalid retrieval scores/positive groups')
    allowed = np.ones_like(positive) if allowed is None else np.asarray(allowed, dtype=bool)
    if allowed.shape != positive.shape or (positive & ~allowed).any():
        raise ValueError('Retrieval mask excludes positives')
    # A collapsed embedding must not win through arbitrary gallery ordering. Ties
    # with negatives are conservatively counted ahead of the best positive.
    best_positive = np.where(positive, scores, -np.inf).max(1)
    ranks = 1 + ((scores >= best_positive[:, None]) & ~positive & allowed).sum(1)
    counts = allowed.sum(1)
    keep = counts >= 2
    if not keep.any():
        return dict(queries=0, source_groups=0, mean_candidates=0.)
    def macro(values):
        return float(np.mean([values[keep & (tap_groups == group)].mean()
                              for group in np.unique(tap_groups[keep])]))
    return dict(mrr=macro(1 / ranks), recall_at_1=macro(ranks <= 1),
                recall_at_5=macro(ranks <= 5), recall_at_10=macro(ranks <= 10),
                queries=int(keep.sum()), source_groups=len(np.unique(tap_groups[keep])),
                mean_candidates=macro(counts))


def onset_scores(corpus, pairs, gallery_groups):
    """Fixed 32-bin velocity-weighted onset cosine baseline; no fitted parameters."""
    def histogram(events):
        result = np.zeros(32)
        for beat, velocity, _ in events:
            result[round(beat * 4) % 32] += velocity
        return result / max(np.linalg.norm(result), 1e-12)
    taps = np.stack([histogram(corpus.pairs[i]['events']) for i in pairs])
    grooves = []
    for group in gallery_groups:
        hvo = corpus.grooves[corpus.groups[group]['index']]
        steps, voices = np.where(hvo[..., 0] > 0)
        grooves.append(histogram([(((step + hvo[step, voice, 2]) / 4) % 8,
                                   hvo[step, voice, 1], voice) for step, voice in zip(steps, voices)]))
    return taps @ np.stack(grooves).T


@torch.no_grad()
def evaluate(model, features, corpus, groups, temperature, batch_size=128):
    model.eval()
    device = next(model.parameters()).device
    pairs = corpus.selection(groups)['pair_indexes']
    tap_groups = corpus.pair_groups[pairs]
    taps = torch.cat([model.encode_taps(*pack_taps(corpus, pairs[start:start+batch_size],
                      model.config.tap_view, device)) for start in range(0, len(pairs), batch_size)])
    grooves = model.project_grooves(torch.stack([features[g] for g in groups]).to(device))
    tg, gg = torch.as_tensor(tap_groups, device=device), torch.tensor(groups, device=device)
    allowed = candidate_mask(corpus, list(tap_groups), groups).to(device)
    loss = multi_positive_loss(taps, grooves, tg, gg, temperature, allowed)
    score = (taps @ grooves.T).cpu().numpy()
    result = retrieval_metrics(score, tap_groups, groups)
    result.update(loss=float(loss), groove_embedding_std=float(grooves.std(0, unbiased=False).mean()),
                  tap_embedding_std=float(taps.std(0, unbiased=False).mean()))
    # Cyclic source-label permutation has no fixed points. This diagnostic does
    # not retrain on shuffled labels and does not establish statistical significance.
    permuted = {group: groups[(i + 1) % len(groups)] for i, group in enumerate(groups)}
    shuffled = retrieval_metrics(score, [permuted[g] for g in tap_groups], groups)
    baseline = retrieval_metrics(onset_scores(corpus, pairs, groups), tap_groups, groups)
    count = len(groups)
    chance = dict(mrr=sum(1 / k for k in range(1, count+1)) / count,
                  recall_at_1=1 / count, recall_at_5=min(5, count) / count,
                  recall_at_10=min(10, count) / count, candidate_groups=count)
    attributes = {g: style_and_tempo(corpus, g) for g in groups}
    matched = np.zeros_like(score, dtype=bool)
    for i, a in enumerate(tap_groups):
        style, bpm = attributes[a]
        for j, b in enumerate(groups):
            other_style, other_bpm = attributes[b]
            known = style is not None and bpm is not None and math.isfinite(bpm) and bpm > 0
            matched[i, j] = a == b or (known and style == other_style and other_bpm is not None
                                      and abs(other_bpm / bpm - 1) <= .1)
    return dict(validation=result, validation_shuffled_pairs=shuffled,
                validation_onset_baseline=baseline, validation_chance=chance,
                validation_matched_style_tempo=retrieval_metrics(score, tap_groups, groups, matched))
