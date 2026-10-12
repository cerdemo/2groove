"""Exact cosine retrieval and per-cell selection. No mutations: this is not MAP-Elites."""
import numpy as np


def search(query, embeddings, k=16, eligible=None, descriptors=None, bins=8, minimum_score=-1.):
    query = np.asarray(query, np.float32)
    if embeddings.ndim != 2 or query.shape != (embeddings.shape[1],):
        raise ValueError('Embedding/query dimensions differ')
    if k < 1 or bins < 1 or not np.isfinite(query).all() or np.linalg.norm(query) < 1e-8:
        raise ValueError('Invalid query/search parameters')
    query = query / np.linalg.norm(query)
    eligible = np.ones(len(embeddings), bool) if eligible is None else np.asarray(eligible, bool)
    if eligible.shape != (len(embeddings),):
        raise ValueError('Invalid eligibility mask')
    if descriptors is not None and np.shape(descriptors) != (len(embeddings), 2):
        raise ValueError('Expected density and syncopation-proxy descriptors [N,2]')
    winners, best = {}, []
    for start in range(0, len(embeddings), 8192):
        block = np.asarray(embeddings[start:start+8192])
        norms = np.linalg.norm(block, axis=1)
        if not np.isfinite(block).all() or (norms < 1e-8).any():
            raise ValueError('Invalid indexed embeddings')
        scores = (block @ query) / norms
        indexes = np.flatnonzero(eligible[start:start+len(block)] & (scores >= minimum_score))
        for local in indexes:
            idx, score = start + int(local), float(scores[local])
            if descriptors is not None:
                density, syncopation = descriptors[idx]
                if not np.isfinite([density, syncopation]).all() or not 0 <= density <= 12 or not 0 <= syncopation <= 1:
                    continue
                cell = (min(bins-1, int(density/12*bins)), min(bins-1, int(syncopation*bins)))
                if cell not in winners or score > winners[cell]['score']:
                    winners[cell] = dict(index=idx, score=score, cell=list(cell))
        # Keep bounded top-k independently of the per-cell archive.
        ranked = sorted(indexes, key=lambda i: (-float(scores[i]), int(i)))[:k]
        best.extend(dict(index=start+int(i), score=float(scores[i])) for i in ranked)
        best = sorted(best, key=lambda row: (-row['score'], row['index']))[:k]
    return dict(nearest=best, archive=sorted(winners.values(), key=lambda row: (-row['score'], row['index'])),
                score_semantics='cosine compatibility proxy, not a calibrated probability',
                algorithm='static-corpus-retrieval', bounds=[[0, 12], [0, 1]], bins=bins)
