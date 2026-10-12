"""Read official TapTamDrum MIDI pairs without running upstream Python or unpickling data."""
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import mido
import numpy as np
from ..pretraining.audit import sha256

# Explicit mapping from the official hvo_sequence/drum_mappings.py, reordered to our voices.
GROOVE_MAP = {pitch: voice for voice, pitches in enumerate(
    ([36], [38, 37, 40], [43, 58], [47, 45], [50, 48], [46, 26],
     [42, 22, 44], [51, 53, 59], [49, 52, 55, 57])) for pitch in pitches}
HAND_MAP = {**dict.fromkeys([76, 60, 48, 72, 67], 1), **dict.fromkeys([77, 74, 62, 86], 2)}


def read_events(path, mapping):
    midi = mido.MidiFile(path)
    if midi.type == 2 or midi.ticks_per_beat <= 0:
        raise ValueError('Unsupported MIDI clock/type')
    tick, events, tempos = 0, [], set()
    for message in mido.merge_tracks(midi.tracks):
        tick += message.time
        if message.type == 'set_tempo':
            tempos.add(message.tempo)
        elif message.type == 'time_signature' and (message.numerator, message.denominator) != (4, 4):
            raise ValueError('Non-4/4 pair')
        elif message.type == 'note_on' and message.velocity > 0:
            if message.note not in mapping:
                raise ValueError(f'Unmapped note {message.note}')
            beat = tick / midi.ticks_per_beat
            if not 0 <= beat < 8:
                raise ValueError(f'Onset outside two-bar clip: {beat}')
            events.append([beat, message.velocity / 127, mapping[message.note]])
    if not events or len(tempos) > 1:
        raise ValueError('Empty or tempo-changing MIDI')
    bpm = mido.tempo2bpm(next(iter(tempos))) if tempos else None
    return events, bpm


def groove_hvo(events, max_collision_rate=.05):
    hvo = np.zeros((32, 9, 3), np.float32)
    collisions = 0
    for beat, velocity, voice in events:
        grid = round(beat * 4)
        step = grid % 32
        collisions += int(hvo[step, voice, 0] > 0)
        if velocity > hvo[step, voice, 1]:
            hvo[step, voice] = (1, velocity, beat * 4 - grid)
    if collisions / len(events) > max_collision_rate:
        raise ValueError(f'HVO collision rate {collisions / len(events):.3f}')
    return hvo, collisions


def prepare_pairs(source, output, seed=42):
    source, output = Path(source).resolve(), Path(output).resolve()
    originals = sorted(source.rglob('original.mid'))
    if not originals:
        raise ValueError('No original.mid found; use the official midi_files directory')
    output.mkdir(parents=True, exist_ok=False)
    pairs, patterns, rejected = [], [], []
    arrays = []
    for original in originals:
        try:
            match = re.fullmatch(r'\[(\d+) ([^]]+)\] (.+)_best_2bar_segment_(\d+)', original.parent.name)
            if not match:
                raise ValueError('Unrecognized official folder naming')
            test, participants, performance, segment = match.groups()
            stem = performance.split('_')[0]
            session = stem.rsplit('-', 1)[0]
            # Entire GMD sessions stay together, including all participant repetitions.
            split_number = int(hashlib.sha256(f'{seed}:{session}'.encode()).hexdigest()[:8], 16) % 100
            split = 'train' if split_number < 80 else 'validation' if split_number < 90 else 'test'
            events, bpm = read_events(original, GROOVE_MAP)
            # Keep ALL raw human pairs. HVO representability is a separate eligibility flag.
            hvo, collisions = groove_hvo(events, max_collision_rate=1.)
            index = len(arrays)
            pattern = dict(pattern_id=test, index=index, gmd_performance=performance, gmd_session=session,
                           selected_segment=int(segment), split=split, bpm=bpm, collisions=collisions,
                           hvo_eligible=collisions / len(events) <= .05,
                           hvo_collision_rate=collisions / len(events),
                           source=str(original.relative_to(source)), source_sha256=sha256(original),
                           hvo_hash=hashlib.sha256(np.round(hvo, 4).tobytes()).hexdigest(), raw_events=events)
            if any(p['pattern_id'] == test for p in patterns):
                raise ValueError('Duplicate test ID')
            local_pairs = []
            for path in sorted(original.parent.glob('Participant_*.mid')):
                try:
                    name = re.fullmatch(r'Participant_([1-4])_(repetition_[0-2]|simple|complex)\.mid', path.name)
                    if not name:
                        raise ValueError('Unrecognized participant filename')
                    taps, tap_bpm = read_events(path, HAND_MAP)
                    if bpm and tap_bpm and not np.isclose(bpm, tap_bpm, atol=.05):
                        raise ValueError('Tap/groove tempo mismatch')
                    local_pairs.append(dict(pattern_id=test, groove_index=index, split=split,
                        participant=int(name[1]), interpretation=name[2], events=taps,
                        hvo_eligible=pattern['hvo_eligible'],
                        source=str(path.relative_to(source)), source_sha256=sha256(path)))
                except (ValueError, OSError, EOFError) as error:
                    rejected.append(dict(path=str(path), reason=str(error)))
            if not local_pairs:
                raise ValueError('No readable human interpretations')
            arrays.append(hvo)
            patterns.append(pattern)
            pairs.extend(local_pairs)
        except (ValueError, OSError, EOFError) as error:
            rejected.append(dict(path=str(original), reason=str(error)))
    if not arrays:
        raise ValueError('No valid TapTamDrum pairs')
    # Fail closed if identical exported patterns cross the proposed session splits.
    splits_by_hash = {}
    for pattern in patterns:
        splits_by_hash.setdefault(pattern['hvo_hash'], set()).add(pattern['split'])
    conflicts = {key for key, splits in splits_by_hash.items() if len(splits) > 1}
    for pattern in patterns:
        if pattern['hvo_hash'] in conflicts:
            pattern['split'] = 'quarantined'
    for pair in pairs:
        pair['split'] = patterns[pair['groove_index']]['split']
    np.save(output/'grooves.npy', np.stack(arrays))
    np.save(output/'hvo_eligible.npy', np.array([p['hvo_eligible'] for p in patterns], dtype=bool))
    for filename, rows in [('patterns.jsonl', patterns), ('pairs.jsonl', pairs), ('rejected.jsonl', rejected)]:
        with (output/filename).open('w') as handle:
            for row in rows:
                handle.write(json.dumps(row, allow_nan=False) + '\n')
    report = dict(version='taptam-pairs-v1', status='complete', source=str(source), seed=seed,
        patterns=len(patterns), pairs=len(pairs), rejected=len(rejected),
        hvo_eligible_patterns=sum(p['hvo_eligible'] for p in patterns),
        hvo_eligible_pairs=sum(p['hvo_eligible'] for p in pairs),
        splits=dict(Counter(p['split'] for p in pairs)), cross_split_hashes_quarantined=len(conflicts),
        upstream_download=json.loads((source/'download.json').read_text()) if (source/'download.json').exists() else None,
        artifacts={name: sha256(output/name) for name in ('grooves.npy', 'hvo_eligible.npy', 'patterns.jsonl', 'pairs.jsonl', 'rejected.jsonl')},
        limitations=['Session-grouped splits do not isolate participants; evaluate held-out participants separately.',
                      'Map original GMD sessions against pretraining provenance before claiming inductive evaluation.',
                      'Human events retain continuous beats and both hands; mono collapse is not a new human performance.',
                      'Filter hvo_eligible for the HVO baseline; raw pairs remain available for an event encoder.',
                      'Two-bar nine-voice HVO is an initial groove adapter, not a general polyrhythm representation.'])
    (output/'pairs-card.json').write_text(json.dumps(report, indent=2) + '\n')
    return report
