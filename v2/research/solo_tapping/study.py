"""Blinded pairwise listening study: offline stimulus builder, response log, report.

Building a study produces no human evidence by itself. Responses become
evidence only after consented listeners complete trials, and the report is
exploratory: it never promotes a checkpoint. Provenance stays in key.json,
which is never served; participants see randomized stimulus identifiers only.
"""
import hashlib
import json
from pathlib import Path
import threading
import time

import numpy as np

from .features import profile, profile_events

FORMAT = 'solo-listening-study-v1'
RESPONSE_SCHEMA = 'solo-study-response-v1'
CONSENT = ('You will hear a short drum groove and two one-channel rhythm renderings, '
           'then choose which rendering fits the groove better. Only the pseudonym you '
           'enter, your answers and timing/replay counts are stored, locally on this '
           'computer. Participation is voluntary and you can stop at any time.')
INSTRUCTIONS = ('Listen to the groove first, then to renderings 1 and 2 as often as you '
                'like. Choose the rendering that fits the groove better, say whether the '
                'difference is slight or clear, and mark a rendering only if it sounds '
                'impossible to play with one hand.')
# Canonical trial pairs; sides are re-randomized per participant at serve time.
PAIRS = (('elite_vs_human', 'elite_best', 'human'),
         ('elite_vs_copy', 'elite_best', 'copy'),
         ('elite_vs_random', 'elite_best', 'random_best'),
         ('distant_vs_human', 'elite_distant', 'human'),
         ('human_vs_even', 'human', 'even'))


def mono_events(p):
    """Single-channel event list from a (32,3) profile; channel 0 by contract."""
    return [[float(b), float(v), 0.] for b, v, _ in profile_events(np.asarray(p, dtype=float))]


def source_candidates(group, search_source_dir):
    """Deterministic candidate profiles and their sealed provenance for one source."""
    archives = {}
    for algorithm in ('map_elites', 'random'):
        card = json.loads((search_source_dir / algorithm / 'archive.json').read_text())
        archives[algorithm] = card['archive']
    if not archives['map_elites'] or not archives['random']:
        return None
    best = max(archives['map_elites'], key=lambda e: e['score']['raw_quality'])
    others = [e for e in archives['map_elites'] if e is not best]
    distant = max(others, key=lambda e: (abs(e['cell'][0] - best['cell'][0])
                                         + abs(e['cell'][1] - best['cell'][1]),
                                         e['score']['raw_quality']), default=None)
    random_best = max(archives['random'], key=lambda e: e['score']['raw_quality'])
    tap = group.taps[0]
    source_profile = profile(group.events)
    count = int(source_profile[:, 0].sum())
    even = np.zeros((32, 3))
    even[np.floor(np.arange(count) * 32 / count).astype(int)] = (1, .8, 0)

    def elite(entry, role, algorithm):
        return (np.array(entry['genome']), dict(role=role, algorithm=algorithm,
                iteration=entry['iteration'], cell=list(entry['cell']),
                raw_quality=float(entry['score']['raw_quality']),
                provenance='synthetic 1-ch candidate, NOT human ground truth'))

    candidates = dict(
        human=(profile(tap['events']), dict(role='human', participant=tap['participant'],
              tap_source=tap['source'],
              provenance='temporal union of a real 2-ch human tap; artificial mono '
                         'rendering, not a performed solo')),
        elite_best=elite(best, 'elite_best', 'map_elites'),
        random_best=elite(random_best, 'random_best', 'random'),
        copy=(source_profile, dict(role='copy', provenance='source onset copy control')),
        even=(even, dict(role='even', provenance='density-matched even control')))
    if distant is not None:
        candidates['elite_distant'] = elite(distant, 'elite_distant', 'map_elites')
    return candidates


def select_sources(rows, count):
    """Front-load scorer-contentious sources, keep half from the typical middle."""
    rows = sorted(rows, key=lambda r: (-(r[1]['best_elite_raw_quality']
                                         - r[1]['best_human_raw_quality']), r[0]))
    count = min(count, len(rows))
    top = rows[:(count + 1) // 2]
    rest = rows[len(top):]
    start = max(0, len(rest) // 2 - (count - len(top)) // 2)
    return top + rest[start:start + count - len(top)]


def build_study(corpus, search_dir, out, seed=42, max_sources=12):
    search_dir, out = Path(search_dir), Path(out)
    comparison = json.loads((search_dir / 'comparison.json').read_text())
    if comparison.get('pairs_fingerprint') != corpus.fingerprint:
        raise ValueError('Search control and pairs fingerprints differ')
    groups = {g.id: g for g in corpus.split('validation')}
    rows = []
    for directory in sorted(search_dir.glob('source-*')):
        gid = directory.name[len('source-'):]
        if gid not in groups:
            raise ValueError('Study stimuli require a validation-split search control')
        rows.append((gid, json.loads((directory / 'map_elites-copy-analysis.json').read_text())))
    if len(rows) < 2 or max_sources < 2:
        raise ValueError('A study needs at least two validation sources')
    rng = np.random.default_rng(seed)
    salt = rng.bytes(16).hex()
    stimuli, sealed_stimuli, trials, sealed_trials, skipped = {}, {}, [], {}, []
    for gid, copy_info in select_sources(rows, max_sources):
        group = groups[gid]
        candidates = source_candidates(group, search_dir / f'source-{gid}')
        if candidates is None:
            skipped.append(gid)
            continue
        source_id = 'g' + rng.bytes(9).hex()
        stimuli[source_id] = dict(kind='full', bpm=float(group.bpm), events=group.events.tolist())
        sealed_stimuli[source_id] = dict(role='source', source_group=gid)
        ids = {}
        for role, (candidate, provenance) in candidates.items():
            sid = 's' + rng.bytes(9).hex()
            stimuli[sid] = dict(kind='solo', bpm=float(group.bpm), events=mono_events(candidate))
            sealed_stimuli[sid] = dict(source_group=gid, **provenance)
            ids[role] = sid
        retest_of = None
        for pair_type, a, b in PAIRS:
            if a not in ids or b not in ids:
                continue
            tid = 't' + rng.bytes(9).hex()
            trials.append(dict(id=tid, source=source_id, a=ids[a], b=ids[b]))
            sealed_trials[tid] = dict(pair_type=pair_type, source_group=gid,
                                      a_role=a, b_role=b, retest_of=None)
            if pair_type == 'elite_vs_human':
                retest_of = tid
        if retest_of is not None:
            tid = 't' + rng.bytes(9).hex()
            first = next(t for t in trials if t['id'] == retest_of)
            trials.append(dict(id=tid, source=source_id, a=first['a'], b=first['b']))
            sealed_trials[tid] = dict(pair_type='elite_vs_human', source_group=gid,
                                      a_role='elite_best', b_role='human', retest_of=retest_of)
    if not trials:
        raise ValueError('No source produced both archives; rebuild the search control')
    out.mkdir(parents=True, exist_ok=False)
    files = dict(stimuli=stimuli, trials=trials,
                 key=dict(salt=salt, stimuli=sealed_stimuli, trials=sealed_trials))
    for name, value in files.items():
        (out / f'{name}.json').write_text(json.dumps(value, indent=2, allow_nan=False) + '\n')
    card = dict(format=FORMAT, seed=seed, max_sources=max_sources,
        consent=CONSENT, instructions=INSTRUCTIONS,
        pairs_fingerprint=corpus.fingerprint, search_model_sha256=comparison['model_sha256'],
        search_directory=str(search_dir), skipped_sources=skipped,
        sources=len({t['source'] for t in trials}), trials=len(trials),
        selection='scorer-contentious sources first, remainder from the typical middle; '
                  'a prioritization heuristic, not a representative sample',
        file_sha256={name: hashlib.sha256((out / f'{name}.json').read_bytes()).hexdigest()
                     for name in files},
        human_rendering='temporal union mono sonification of real 2-ch taps; artificial view',
        human_perceptual_validation='pending real responses', test_evaluated=False)
    (out / 'study.json').write_text(json.dumps(card, indent=2, allow_nan=False) + '\n')
    return card


class Study:
    """Serve-side access: participant-specific blinded manifests and response log."""

    def __init__(self, directory):
        self.directory = Path(directory)
        self.card = json.loads((self.directory / 'study.json').read_text())
        if self.card.get('format') != FORMAT:
            raise ValueError('Unsupported study format')
        for name, digest in self.card['file_sha256'].items():
            if hashlib.sha256((self.directory / f'{name}.json').read_bytes()).hexdigest() != digest:
                raise ValueError(f'Study file changed after build: {name}.json')
        self.stimuli = json.loads((self.directory / 'stimuli.json').read_text())
        self.trials = json.loads((self.directory / 'trials.json').read_text())
        self.key = json.loads((self.directory / 'key.json').read_text())
        self.by_id = {t['id']: (i, t) for i, t in enumerate(self.trials)}
        self.lock = threading.Lock()

    @staticmethod
    def participant_id(value):
        value = str(value).strip()
        if not 2 <= len(value) <= 40 or not all(c.isalnum() or c in ' _-' for c in value):
            raise ValueError('Pseudonym must be 2-40 letters, digits, spaces, _ or -')
        return value

    def arrangement(self, participant):
        digest = hashlib.sha256(f'{self.key["salt"]}:{participant}'.encode()).digest()
        rng = np.random.default_rng(int.from_bytes(digest[:8], 'big'))
        return rng.permutation(len(self.trials)), rng.random(len(self.trials)) < .5

    def manifest(self, participant):
        participant = self.participant_id(participant)
        order, flips = self.arrangement(participant)
        rows, needed = [], set()
        for index in order:
            trial = self.trials[index]
            first, second = (trial['b'], trial['a']) if flips[index] else (trial['a'], trial['b'])
            rows.append(dict(trial=trial['id'], source=trial['source'], first=first, second=second))
            needed.update((trial['source'], first, second))
        answered = sorted({r['trial'] for r in self.responses() if r['participant'] == participant})
        return dict(participant=participant, consent=self.card['consent'],
            instructions=self.card['instructions'], trials=rows, answered=answered,
            stimuli={sid: self.stimuli[sid] for sid in sorted(needed)})

    def record(self, participant, session, trial_id, choice, confidence,
               unplayable_first, unplayable_second, replays, elapsed_ms, consent):
        if consent is not True:
            raise ValueError('Consent is required before storing any response')
        participant = self.participant_id(participant)
        if trial_id not in self.by_id:
            raise ValueError('Unknown study trial')
        index, trial = self.by_id[trial_id]
        flip = bool(self.arrangement(participant)[1][index])
        canonical = {'first': 'b' if flip else 'a', 'second': 'a' if flip else 'b'}[choice]
        unplayable = {('b' if flip else 'a'): bool(unplayable_first),
                      ('a' if flip else 'b'): bool(unplayable_second)}
        row = dict(schema=RESPONSE_SCHEMA, recorded=time.strftime('%Y-%m-%dT%H:%M:%S'),
            participant=participant, session=str(session)[:64], trial=trial_id,
            presented_first=('b' if flip else 'a'), choice_presented=choice,
            choice=canonical, confidence=confidence, unplayable=unplayable,
            replays=int(replays), elapsed_ms=int(elapsed_ms))
        with self.lock:
            with (self.directory / 'responses.jsonl').open('a') as stream:
                stream.write(json.dumps(row, allow_nan=False) + '\n')
        return row

    def responses(self):
        path = self.directory / 'responses.jsonl'
        if not path.exists():
            return []
        return [json.loads(line) for line in path.read_text().splitlines()]


def study_report(directory, bootstrap=1000, seed=0):
    """Exploratory summary of recorded responses; not a confirmatory analysis."""
    study = Study(directory)
    sealed = study.key['trials']
    latest = {}
    for row in study.responses():
        latest[row['participant'], row['trial']] = row
    if not latest:
        return dict(status='no_responses', trials=len(study.trials))
    rng = np.random.default_rng(seed)
    participants = sorted({p for p, _ in latest})
    by_type = {}
    for (participant, trial_id), row in latest.items():
        meta = sealed[trial_id]
        by_type.setdefault(meta['pair_type'], []).append(
            dict(participant=participant, source=meta['source_group'],
                 a_win=row['choice'] == 'a', confidence=row['confidence']))
    pair_types = {}
    for pair_type, rows in sorted(by_type.items()):
        wins = np.array([r['a_win'] for r in rows])
        owners = np.array([r['participant'] for r in rows])
        rates = []
        for _ in range(bootstrap):
            chosen = rng.choice(participants, len(participants), replace=True)
            mask = np.concatenate([np.flatnonzero(owners == p) for p in chosen]) \
                if len(participants) else np.array([], dtype=int)
            if len(mask):
                rates.append(float(wins[mask].mean()))
        first_role, second_role = next((a, b) for t, a, b in PAIRS if t == pair_type)
        pair_types[pair_type] = dict(first_role=first_role, second_role=second_role,
            responses=len(rows), participants=len({r['participant'] for r in rows}),
            sources=len({r['source'] for r in rows}), first_win_rate=float(wins.mean()),
            participant_bootstrap_interval=([float(np.percentile(rates, 2.5)),
                                             float(np.percentile(rates, 97.5))] if rates else None),
            clear_fraction=float(np.mean([r['confidence'] == 'clear' for r in rows])))
    retest = []
    for (participant, trial_id), row in latest.items():
        earlier = sealed[trial_id].get('retest_of')
        if earlier and (participant, earlier) in latest:
            retest.append(row['choice'] == latest[participant, earlier]['choice'])
    anchors = {}
    for (participant, trial_id), row in latest.items():
        if sealed[trial_id]['pair_type'] == 'human_vs_even':
            anchors.setdefault(participant, []).append(row['choice'] == 'a')
    unplayable = {}
    for (participant, trial_id), row in latest.items():
        meta = sealed[trial_id]
        for side in ('a', 'b'):
            counts = unplayable.setdefault(meta[f'{side}_role'], [0, 0])
            counts[0] += bool(row['unplayable'][side])
            counts[1] += 1
    return dict(status='exploratory_listening_report', responses=len(latest),
        participants=participants, pair_types=pair_types,
        retest=dict(pairs=len(retest), agreement=float(np.mean(retest)) if retest else None),
        anchor_human_vs_even={p: float(np.mean(v)) for p, v in sorted(anchors.items())},
        unplayable_rate_by_role={role: dict(flagged=c, responses=n, rate=c / n)
                                 for role, (c, n) in sorted(unplayable.items())},
        interpretation='Participant-bootstrap intervals are exploratory, not significance '
                       'tests; pseudonyms are self-chosen and not identity-verified. '
                       'No checkpoint is promoted by this report.',
        human_rendering=study.card['human_rendering'], test_evaluated=False)
