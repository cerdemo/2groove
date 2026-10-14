"""Keyed pairing audit; retain ambiguity rather than filling absent performances."""
import ast
from collections import Counter, defaultdict
import csv
from datetime import datetime
import io
import json
from pathlib import Path
import pickle
import re

import mido
import numpy as np

from .source import digest, verify, write_json

ORDER = (894, 423, 1367, 249, 939, 427, 590, 143, 912, 580, 1043, 673, 1359, 736, 678, 1355)
CONTROLS = (678, 1355)


def matrix(path):
    with Path(path).open() as f:
        result = np.array(list(csv.reader(f)), dtype=float)
    if not np.isfinite(result).all() or (result < 0).any() or (result > 1).any():
        raise ValueError('Invalid normalized MIDI velocities')
    return result


def literal_mapping(path):
    """Read only the literal table, without importing upstream modules."""
    tree = ast.parse(Path(path).read_text())
    nodes = [n for n in tree.body if isinstance(n, ast.Assign) and any(
        isinstance(t, ast.Name) and t.id == 'GM_dict' for t in n.targets)]
    if len(nodes) != 1:
        raise ValueError('Ambiguous upstream pitch mapping')
    mapping = ast.literal_eval(nodes[0].value)
    if not isinstance(mapping, dict) or any(v[1] not in ('low', 'mid', 'high') for v in mapping.values()):
        raise ValueError('Invalid band mapping')
    return mapping


def read_midi(path, mapping):
    """Four quarter-note beats; original pitches retained, zero-velocity ignored.

    These are explicitly supplied experimental percussion files, including channel
    1/non-nine-voice instruments. Never silently feed this into the 32x9 HVO adapter.
    """
    midi = mido.MidiFile(path)
    if midi.type == 2 or midi.ticks_per_beat <= 0:
        raise ValueError('Unsupported MIDI timing')
    tick, events = 0, []
    mapped = [set() for _ in range(16)]
    for msg in mido.merge_tracks(midi.tracks):
        tick += msg.time
        if msg.type != 'note_on' or msg.velocity == 0:
            continue
        beat = tick / midi.ticks_per_beat
        grid = round(beat * 4)
        if not 0 <= grid < 16 or abs(beat * 4 - grid) > 1e-7:
            raise ValueError('Experimental source is not a one-bar sixteenth grid')
        if msg.note not in mapping or mapping[msg.note][2] not in mapping:
            raise ValueError('Unknown source pitch')
        events.append(dict(beat=beat, velocity=msg.velocity / 127,
                           pitch=msg.note, channel=msg.channel))
        mapped[grid].add(mapping[msg.note][2])
    counts = np.zeros((16, 3), dtype=int)
    for step, pitches in enumerate(mapped):
        for pitch in pitches:
            counts[step, ('low', 'mid', 'high').index(mapping[pitch][1])] += 1
    if not events:
        raise ValueError('Empty experimental source')
    return counts, events


class PrimitiveUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        raise ValueError('Executable pickle globals are forbidden')


def primitive_patterns(path):
    """Only the nested primitive LMH lists are permitted, for audit, never targets."""
    payload = Path(path).read_bytes()
    if len(payload) > 1_000_000:
        raise ValueError('Oversized pattern audit file')
    rows = PrimitiveUnpickler(io.BytesIO(payload)).load()
    if type(rows) != list or len(rows) > 10_000:
        raise ValueError('Invalid pattern list')
    for row in rows:
        if type(row) != list or len(row) != 16 or any(type(step) != list or len(step) > 128 or
            any(type(n) != int or n not in (1, 2, 3) for n in step) for step in row):
            raise ValueError('Nonprimitive or invalid LMH patterns')
    return rows


def read_trials(path):
    """Pinned upstream header omits ID; validate explicit positional schema."""
    with Path(path).open() as f:
        rows = list(csv.reader(f))
    if rows[0][:3] != ['TIME', 'DATE', 'NAME']:
        raise ValueError('Unexpected tapexplore header')
    trials = []
    for line, row in enumerate(rows[1:], 2):
        if len(row) < 86 or int(row[2]) not in ORDER:
            raise ValueError(f'Invalid trial row {line}')
        values = np.asarray(row[4:20], dtype=float)
        source_contour = np.asarray(row[20:36], dtype=float)
        if not np.isfinite(values).all() or (values < 0).any() or (values > 1).any():
            raise ValueError(f'Invalid tap values on row {line}')
        if not np.isfinite(source_contour).all() or (source_contour < 0).any():
            raise ValueError(f'Invalid logged source contour on row {line}')
        date = None
        for fmt in ('%m/%d/%y', '%Y-%m-%d'):
            try:
                date = datetime.strptime(row[0], fmt).date().isoformat()
                break
            except ValueError:
                pass
        if date is None:
            raise ValueError(f'Unrecognized recording date on row {line}')
        trials.append(dict(line=line, source_id=int(row[2]), source_name=row[3],
                           session=date, time=row[1], velocity=values,
                           logged_source_support=source_contour > 0))
    return trials


def prepare(source, output):
    source, output = Path(source), Path(output)
    if output.exists():
        raise FileExistsError(output)
    manifest = verify(source)
    trials = read_trials(source / 'data/tapexplore.csv')
    ordered = matrix(source / 'data/patterns_by_subject_[ORDERED].csv')
    raw = matrix(source / 'data/raw_subjects.csv')
    if ordered.shape != (43, 288) or raw.shape != (43, 256) or len(trials) != 43 * 18:
        raise ValueError('Unexpected pinned study dimensions')
    if not np.allclose(raw, ordered[:, :256], atol=1e-8, rtol=0):
        raise ValueError('Raw/ordered derivatives disagree')
    mapping = literal_mapping(source / 'functions.py')
    if mapping != literal_mapping(source / 'descriptors.py'):
        raise ValueError('Conflicting upstream band mappings')
    old_patterns = primitive_patterns(source / 'data/patterns.pkl')
    sources, excluded, counts_by_id = [], [], {}
    for sid in ORDER:
        files = list((source / 'midi/_MIDI+samples').glob(f'*--{sid}_*'))
        if len(files) != 1:
            raise ValueError(f'Ambiguous experimental MIDI for {sid}')
        counts, events = read_midi(files[0], mapping)
        owners = [t for t in trials if t['source_id'] == sid]
        names = {t['source_name'] for t in owners}
        if len(names) != 1:
            raise ValueError(f'Source name conflict: {sid}')
        name = names.pop()
        parent = name.rsplit('_', 1)[0]
        crop_tag = re.search(r'(\d+)$', files[0].stem)
        crop_matches = bool(crop_tag and int(crop_tag[1]) == int(name.rsplit('_', 1)[1]))
        parents = [p for p in (source / 'midi').rglob('*.mid') if p.stem.lower() == parent.lower()]
        if len(parents) != 1:
            raise ValueError(f'Unresolved source parent for {sid}')
        support_matches = [np.array_equal(counts.sum(1) > 0, t['logged_source_support']) for t in owners]
        legacy = np.array([[step.count(band) for band in (1, 2, 3)] for step in old_patterns[sid]])
        source_reasons = []
        if not all(support_matches):
            source_reasons.append('logged_source_support_mismatch')
        if not crop_matches:
            source_reasons.append('selected_midi_crop_tag_disagrees_with_trial_name')
        valid = not source_reasons
        # Group by original parent identity; join exact LMH aliases conservatively below.
        record = dict(id=sid, name=name, parent=parent, group=parent, counts=counts.tolist(),
                      events=events, midi=str(files[0].relative_to(source)),
                      midi_sha256=digest(files[0].read_bytes()), accepted=valid,
                      logged_support_matches=sum(support_matches), logged_trials=len(owners),
                      crop_tag_matches=crop_matches, exclusion_reasons=source_reasons,
                      legacy_lmh_matches=bool(np.array_equal(counts, legacy)),
                      identity_evidence='Explicit ID in trial and selected MIDI name; trial NAME parent; step support cross-check',
                      unresolved='Full audio/stimulus provenance and exact parent crop not certified')
        if not valid:
            excluded.append(dict(kind='source', source_id=sid, reasons=source_reasons))
        sources.append(record)
        counts_by_id[sid] = counts
    # Union parent groups when two accepted descriptors are exact aliases.
    links = {s['parent']: s['parent'] for s in sources}
    def root(x):
        while links[x] != x:
            x = links[x]
        return x
    aliases = defaultdict(list)
    for s in sources:
        if s['accepted']:
            aliases[tuple(counts_by_id[s['id']].ravel())].append(s)
    for same in aliases.values():
        for s in same[1:]:
            links[root(s['parent'])] = root(same[0]['parent'])
    for s in sources:
        s['group'] = root(s['parent'])
    accepted_ids = {s['id'] for s in sources if s['accepted']}
    records, block_audit = [], []
    expected_counts = Counter(ORDER + CONTROLS)
    for block in range(43):
        batch = trials[block * 18:(block + 1) * 18]
        reasons = []
        if Counter(t['source_id'] for t in batch) != expected_counts:
            reasons.append('unexpected_source_repetitions_or_missing_trial')
        if len({t['session'] for t in batch}) != 1:
            reasons.append('block_spans_dates')
        lookup = defaultdict(list)
        for t in batch:
            lookup[t['source_id']].append(t)
        if not reasons:
            reconstructed = np.concatenate([lookup[sid][0]['velocity'] for sid in ORDER] +
                                           [lookup[sid][1]['velocity'] for sid in CONTROLS])
            if not np.allclose(reconstructed, ordered[block], atol=1e-8, rtol=0):
                reasons.append('keyed_trials_disagree_with_ordered_derivative')
        block_audit.append(dict(block=block, accepted=not reasons, reasons=reasons,
                                counts=dict(Counter(t['source_id'] for t in batch))))
        for sid, takes in lookup.items():
            for repetition, t in enumerate(takes):
                if reasons or sid not in accepted_ids:
                    excluded.append(dict(kind='trial', line=t['line'], block=block, source_id=sid,
                                         reasons=reasons or ['quarantined_source']))
                    continue
                records.append(dict(id=f'row-{t["line"]}', source_id=sid,
                    participant=f'block-{block:02}', session=t['session'], repetition=repetition,
                    role='primary' if repetition == 0 else 'retest', line=t['line'],
                    velocity=t['velocity'].tolist(), hit=(t['velocity'] > 0).astype(int).tolist(),
                    duration_beats=4, step_beats=.25, microtiming_observed=False,
                    technique='single_stream; hand/finger technique unverified'))
    if not records:
        raise ValueError('No verified pairs')
    report = dict(format='human-contour-audit-v2', revision=manifest['revision'],
        sources_total=len(sources), sources_accepted=len(accepted_ids),
        source_groups=len({s['group'] for s in sources if s['accepted']}),
        primary_pairs=sum(t['role'] == 'primary' for t in records),
        retest_pairs=sum(t['role'] == 'retest' for t in records),
        participant_blocks=len({t['participant'] for t in records}),
        recording_dates=len({t['session'] for t in records}), blocks=block_audit,
        legacy_lmh_mismatches=[s['id'] for s in sources if not s['legacy_lmh_matches']],
        limitations=[
            'Participant identity is the upstream 18-trial block convention, cross-checked against ordered derivatives; no independent participant IDs.',
            'Recording date is a conservative session proxy, not a certified session/person identity.',
            'Pairing verifies released ID/name/onset evidence, not original audio playback or band salience.',
            'MIDI sources and legacy LMH dictionary disagree; features are recomputed from selected MIDI, not a paper replication.',
            'Study tempo 120 BPM is contextual metadata; CSV BPM field is not interpreted as stimulus tempo.',
            'No microtiming observations. One-bar contours are never duplicated into two-bar ground truth.',
            'No pretrained encoder is used; overlap of unrelated historical checkpoints remains uncertified.',
        ])
    output.mkdir(parents=True, exist_ok=False)
    for name, rows in [('sources.json', sources), ('records.json', records), ('excluded.json', excluded),
                       ('audit.json', report), ('upstream.json', manifest)]:
        write_json(output / name, rows)
    write_json(output / 'dataset.json', dict(format='human-contour-data-v1', files={
        name: digest((output / name).read_bytes()) for name in
        ('sources.json', 'records.json', 'excluded.json', 'audit.json', 'upstream.json')}))
    return report


def load(directory):
    directory = Path(directory)
    card = json.loads((directory / 'dataset.json').read_text())
    if card.get('format') != 'human-contour-data-v1':
        raise ValueError('Unknown benchmark dataset')
    for name, sha in card['files'].items():
        if Path(name).name != name or digest((directory / name).read_bytes()) != sha:
            raise ValueError('Changed benchmark data')
    sources = [s for s in json.loads((directory / 'sources.json').read_text()) if s['accepted']]
    records = json.loads((directory / 'records.json').read_text())
    return sources, records, digest((directory / 'dataset.json').read_bytes())
