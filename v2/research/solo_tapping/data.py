"""Audited TapTamDrum groups, before any local-window extraction."""
from collections import defaultdict
from dataclasses import dataclass
import hashlib
import json
from pathlib import Path

import numpy as np

from groove.pretraining.audit import sha256
from groove.representation.alignment_data import HumanPairs
from .features import profile, validate_events


@dataclass
class SourceGroup:
    id: str
    split: str
    events: np.ndarray
    taps: list
    performances: set
    sessions: set
    bpm: float | None


def audit_splits(patterns, pairs):
    """Fail on known identity leaks, report structure matches as review evidence."""
    seen, structural, tap_hashes = {}, defaultdict(set), defaultdict(set)
    for p in patterns:
        if p['split'] == 'quarantined':
            continue
        for field in ('source', 'source_sha256', 'gmd_performance', 'gmd_session', 'hvo_hash'):
            key = (field, p[field])
            if seen.setdefault(key, p['split']) != p['split']:
                raise ValueError(f'{field} crosses splits: {p[field]}')
        # Only an audit signature, never dictionary fitting on held-out data.
        x = validate_events(p['raw_events'])
        if not len(x) or (x[:, 2] > 8).any():
            raise ValueError('Raw full groove must contain v2 nine-voice events')
        if p.get('bpm') is not None and (not np.isfinite(p['bpm']) or not 30 <= p['bpm'] <= 300):
            raise ValueError('Invalid reference BPM')
        h = profile(x)[:, 0].astype(np.uint8).tobytes()
        structural[hashlib.sha256(h).hexdigest()].add(p['split'])
    pair_sources = {}
    for p in pairs:
        if p['split'] == 'quarantined':
            continue
        if pair_sources.setdefault(p['source'], p['split']) != p['split']:
            raise ValueError('Human performance source crosses splits')
        tap_hashes[p['source_sha256']].add(p['split'])
    return dict(identity_split_check='passed',
                split_basis='existing session assignment before HVO/local segmentation',
                cross_split_onset_signatures=sum(len(v) > 1 for v in structural.values()),
                cross_split_tap_byte_hashes=sum(len(v) > 1 for v in tap_hashes.values()),
                near_duplicate_status='structure signatures only; crop/expressive near-duplicate review pending',
                participant_disjoint=False)


class SoloPairs:
    def __init__(self, directory):
        # Reuse v2 artifact, event and provenance verification, not its HVO selection.
        base = HumanPairs(directory)
        self.fingerprint = base.fingerprint
        self.patterns, self.pairs = base.patterns, base.pairs
        card = json.loads((Path(directory) / 'pairs-card.json').read_text())
        for p in self.patterns:
            number = int(hashlib.sha256(f'{card["seed"]}:{p["gmd_session"]}'.encode()).hexdigest()[:8], 16) % 100
            expected = 'train' if number < 80 else 'validation' if number < 90 else 'test'
            if p['split'] not in (expected, 'quarantined'):
                raise ValueError('Split differs from pre-segmentation session assignment')
        self.audit = audit_splits(self.patterns, self.pairs)
        parents = list(range(len(self.patterns)))

        def root(i):
            while parents[i] != i:
                parents[i] = parents[parents[i]]
                i = parents[i]
            return i

        aliases = {}
        for i, p in enumerate(self.patterns):
            if p['split'] == 'quarantined':
                continue
            raw = validate_events(p['raw_events'])
            keys = [('raw', hashlib.sha256(raw.tobytes()).hexdigest()),
                    ('segment', p['gmd_performance'], p['selected_segment'])]
            if p['hvo_eligible']:
                keys.append(('hvo', p['hvo_hash']))
            for key in keys:
                parents[root(i)] = root(aliases.setdefault(key, i))
        self.groups = {}
        for tap in self.pairs:
            if tap['split'] == 'quarantined':
                continue
            p = self.patterns[tap['groove_index']]
            key = str(root(tap['groove_index']))
            g = self.groups.setdefault(key, SourceGroup(key, p['split'],
                validate_events(self.patterns[int(key)]['raw_events']), [], set(), set(), p['bpm']))
            if g.split != p['split']:
                raise ValueError('Raw positive group crosses splits')
            # Repeated stimulus exports are aliases. Preserve distinct participants,
            # conditions and performances, without weighting a copied file twice.
            identity = (tap['participant'], tap['interpretation'], tap['source_sha256'])
            if not any((t['participant'], t['interpretation'], t['source_sha256']) == identity for t in g.taps):
                g.taps.append(tap)
            g.performances.add(p['gmd_performance'])
            g.sessions.add(p['gmd_session'])
        self.audit['groups'] = {s: len(self.split(s)) for s in ('train', 'validation', 'test')}
        self.audit['profile_collision_events'] = {
            'grooves': sum(len(g.events) - int(profile(g.events)[:, 0].sum()) for g in self.groups.values()),
            'taps': sum(len(t['events']) - int(profile(t['events'])[:, 0].sum())
                        for g in self.groups.values() for t in g.taps)}

    def split(self, split):
        return [self.groups[k] for k in sorted(self.groups, key=int) if self.groups[k].split == split]


def audit_pretraining(patterns, manifest=None):
    """Audit supplied selected-training provenance; never assert completeness from hashes.

    Native export `hash` is supported; session/performance keys must be explicitly
    mapped, not guessed from canonical opaque parent IDs. Missing coverage stays
    partial. No pretrained groove checkpoint is consumed by the solo model.
    """
    report = dict(checkpoint_used=False, status='not_provided', matches=[], rows=0,
                  missing_session_rows=0, inductive_encoder_claim=False)
    if manifest is None:
        return report
    keys = ('gmd_session', 'gmd_performance', 'source_sha256', 'hvo_hash')
    index = defaultdict(list)
    for p in patterns:
        if p['split'] != 'quarantined':
            for k in keys:
                index[k, p[k]].append((p['pattern_id'], p['split']))
    with Path(manifest).open() as stream:
        for line in stream:
            row = json.loads(line)
            if row.get('split', 'train') != 'train':
                continue
            report['rows'] += 1
            report['missing_session_rows'] += not bool(row.get('gmd_session'))
            for k in keys:
                value = row.get(k, row.get('hash') if k == 'hvo_hash' else None)
                for pattern_id, split in index.get((k, value), []):
                    report['matches'].append(dict(row=report['rows'], key=k, value=value,
                                                   pattern_id=pattern_id, pair_split=split))
    report.update(manifest_sha256=sha256(manifest), status='overlap_detected' if report['matches'] else 'no_known_match',
                  coverage='partial' if report['missing_session_rows'] or not report['rows'] else 'declared_session_ids',
                  limitation='Selected manifest identity mapping and cropped/near-duplicate aliases require review.')
    return report


def negative_groups(group, groups):
    return [g for g in groups if g.id != group.id and not g.performances & group.performances]


def hard_negative(group, candidate, tempo_tolerance=.1, density_tolerance=.2):
    """Source BPM within 10% and unique source onset density within 20%, symmetric."""
    if not group.bpm or not candidate.bpm:
        return False
    a, b = profile(group.events)[:, 0].sum(), profile(candidate.events)[:, 0].sum()
    return bool(abs(group.bpm - candidate.bpm) / min(group.bpm, candidate.bpm) <= tempo_tolerance
                and abs(a - b) / max(1, min(a, b)) <= density_tolerance)
