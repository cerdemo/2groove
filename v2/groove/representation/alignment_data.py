"""Verified human pairs, grouped positives and deterministic participant-aware batches."""
from collections import defaultdict
import hashlib
import json
from pathlib import Path
import re

import numpy as np
import torch

from ..pretraining.audit import sha256


class HumanPairs:
    def __init__(self, directory):
        directory = Path(directory)
        card_path = directory/'pairs-card.json'
        card = json.loads(card_path.read_text())
        if card.get('version') != 'taptam-pairs-v1' or card.get('status') != 'complete':
            raise ValueError('A completed TapTamDrum pairs export is required')
        required = ('grooves.npy', 'hvo_eligible.npy', 'patterns.jsonl', 'pairs.jsonl', 'rejected.jsonl')
        if not set(required) <= card.get('artifacts', {}).keys():
            raise ValueError('Old pairs export: rerun prepare_taptamdrum.py into a fresh directory')
        for name in required:
            if sha256(directory/name) != card['artifacts'][name]:
                raise ValueError(f'Changed TapTamDrum artifact: {name}')
        self.fingerprint = sha256(card_path)
        self.patterns = [json.loads(line) for line in (directory/'patterns.jsonl').read_text().splitlines()]
        self.pairs = [json.loads(line) for line in (directory/'pairs.jsonl').read_text().splitlines()]
        self.grooves = np.load(directory/'grooves.npy', mmap_mode='r', allow_pickle=False)
        eligible = np.load(directory/'hvo_eligible.npy', allow_pickle=False)
        if self.grooves.dtype != np.float32 or self.grooves.shape != (len(self.patterns), 32, 9, 3):
            raise ValueError('Invalid groove HVO shape/dtype')
        if eligible.dtype != bool or eligible.shape != (len(self.patterns),):
            raise ValueError('Invalid HVO eligibility array')
        if card['patterns'] != len(self.patterns) or card['pairs'] != len(self.pairs):
            raise ValueError('Pair card counts do not match artifacts')
        if len({p['pattern_id'] for p in self.patterns}) != len(self.patterns):
            raise ValueError('Duplicate pattern IDs')
        sessions, keys, parents = {}, {}, list(range(len(self.patterns)))

        def root(i):
            while parents[i] != i:
                parents[i] = parents[parents[i]]
                i = parents[i]
            return i

        for i, pattern in enumerate(self.patterns):
            if pattern['index'] != i or pattern.get('hvo_eligible') != bool(eligible[i]):
                raise ValueError('Pattern index/eligibility mismatch')
            y = self.grooves[i]
            if not np.isfinite(y).all() or not np.isin(y[..., 0], [0, 1]).all():
                raise ValueError('Nonfinite/nonbinary HVO')
            if (y[..., 1] < 0).any() or (y[..., 1] > 1).any() or (np.abs(y[..., 2]) > .5).any():
                raise ValueError('Invalid HVO velocity/offset')
            if not y[..., 0].any() or (y[..., 1:][y[..., 0] == 0] != 0).any():
                raise ValueError('Empty HVO or nonzero inactive cells')
            if hashlib.sha256(np.round(y, 4).tobytes()).hexdigest() != pattern['hvo_hash']:
                raise ValueError('Pattern HVO hash mismatch')
            split = pattern['split']
            if split not in ('train', 'validation', 'test', 'quarantined'):
                raise ValueError('Invalid pair split')
            if split == 'quarantined':
                continue
            session = pattern['gmd_session']
            if sessions.setdefault(session, split) != split:
                raise ValueError('GMD session crosses pair splits')
            if eligible[i]:
                # Exact aliases and repeated exports of the same selected performance
                # segment are one positive group, never negatives for each other.
                for key in (('hvo', pattern['hvo_hash']),
                            ('segment', pattern['gmd_performance'], pattern['selected_segment'])):
                    other = keys.setdefault(key, i)
                    parents[root(i)] = root(other)
        self.groups = {}
        self.pair_groups = []
        seen_sources = set()
        for i, pair in enumerate(self.pairs):
            index = pair['groove_index']
            if isinstance(index, bool) or not isinstance(index, int) or not 0 <= index < len(self.patterns):
                raise ValueError('Invalid pair groove index')
            pattern = self.patterns[index]
            if any(pair.get(k) != pattern[k] for k in ('pattern_id', 'split', 'hvo_eligible')):
                raise ValueError('Pair provenance/eligibility mismatch')
            if pair['participant'] not in (1, 2, 3, 4) or pair['source'] in seen_sources:
                raise ValueError('Invalid participant or duplicate tap source')
            seen_sources.add(pair['source'])
            events = np.asarray(pair['events'], dtype=np.float32)
            if events.ndim != 2 or events.shape[1] != 3 or not len(events) or not np.isfinite(events).all():
                raise ValueError('Empty or invalid human tap events')
            if ((events[:, 0] < 0) | (events[:, 0] >= 8)).any() or (np.diff(events[:, 0]) < 0).any():
                raise ValueError('Tap beats must be sorted in [0,8)')
            if ((events[:, 1] < 0) | (events[:, 1] > 1)).any() or not np.isin(events[:, 2], [0, 1, 2]).all():
                raise ValueError('Invalid human velocity/hand')
            group = root(index) if eligible[index] and pair['split'] != 'quarantined' else -1
            self.pair_groups.append(group)
            if group < 0:
                continue
            record = self.groups.setdefault(group, dict(index=index, split=pair['split'], pairs=[], performances=set()))
            if record['split'] != pair['split']:
                raise ValueError('Positive group crosses pair splits')
            record['index'] = min(record['index'], index)
            record['pairs'].append(i)
            record['performances'].add(pattern['gmd_performance'])
        self.pair_groups = np.asarray(self.pair_groups, dtype=np.int64)

    def split_groups(self, split):
        return sorted(group for group, record in self.groups.items() if record['split'] == split)

    def selection(self, groups):
        return dict(groups=list(groups), groove_indexes=[self.groups[g]['index'] for g in groups],
                    pair_indexes=[i for g in groups for i in self.groups[g]['pairs']])


def group_batches(corpus, groups, batch_groups, taps_per_group, seed):
    """One visit per source group; sample participants uniformly before interpretations."""
    rng = np.random.default_rng(seed)
    order = list(map(int, rng.permutation(groups)))
    chunks = [order[i:i+batch_groups] for i in range(0, len(order), batch_groups)]
    if len(chunks) > 1 and len(chunks[-1]) == 1:
        chunks[-2].extend(chunks.pop())
    for chunk in chunks:
        if len(chunk) < 2:
            raise ValueError('At least two source groups required in every batch')
        chosen = []
        for group in chunk:
            by_participant = defaultdict(list)
            for i in corpus.groups[group]['pairs']:
                by_participant[corpus.pairs[i]['participant']].append(i)
            remaining = min(taps_per_group, sum(map(len, by_participant.values())))
            while remaining:
                for participant in rng.permutation(sorted(by_participant)):
                    options = by_participant[participant]
                    if options and remaining:
                        chosen.append(options.pop(int(rng.integers(len(options)))))
                        remaining -= 1
        yield chunk, chosen


def pack_taps(corpus, indexes, view, device='cpu'):
    if view not in ('hand_agnostic', 'pad_aware'):
        raise ValueError('Unknown tap view')
    rows = [corpus.pairs[i]['events'] for i in indexes]
    events = torch.zeros(len(rows), max(map(len, rows)), 3)
    padding = torch.ones(events.shape[:2], dtype=torch.bool)
    for i, row in enumerate(rows):
        events[i, :len(row)] = torch.as_tensor(row)
        padding[i, :len(row)] = False
    if view == 'hand_agnostic':
        events[..., 2] = 0  # Preserve both hands' onsets: this is not real one-finger data.
    return events.to(device), padding.to(device)


def candidate_mask(corpus, tap_groups, groove_groups):
    # Different segments from a known common performance may be ambiguous negatives.
    return torch.tensor([[a == b or not corpus.groups[a]['performances'].intersection(
        corpus.groups[b]['performances']) for b in groove_groups] for a in tap_groups], dtype=torch.bool)


def style_and_tempo(corpus, group):
    pattern = corpus.patterns[corpus.groups[group]['index']]
    match = re.fullmatch(r'[^_]+_(.+)_\d+(?:\.\d+)?_[^_]+_\d+-\d+', pattern['gmd_performance'])
    return (match[1] if match else None), pattern['bpm']
