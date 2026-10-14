"""Actual event-genome MAP-Elites and matched-budget independent random search."""
from dataclasses import dataclass, asdict, field
import hashlib
import json
from pathlib import Path

import numpy as np

from groove.events import Note, Pattern, midi_bytes
from .features import profile_events, syncopation, validate_events


@dataclass
class Playability:
    technique: str = 'finger'
    min_interval_ms: float | None = None
    max_hits_per_second: float | None = None
    max_velocity_jump: float = 1.

    def limits(self):
        # Engineering defaults only; must be calibrated for performer/technique.
        presets = {'finger': (100., 8.), 'stick': (70., 12.)}
        if self.technique not in presets:
            raise ValueError('Technique must be finger or stick; override numeric limits as needed')
        gap, rate = presets[self.technique]
        gap = gap if self.min_interval_ms is None else self.min_interval_ms
        rate = rate if self.max_hits_per_second is None else self.max_hits_per_second
        if not np.isfinite([gap, rate, self.max_velocity_jump]).all() or min(gap, rate) <= 0 or not 0 <= self.max_velocity_jump <= 1:
            raise ValueError('Invalid playability limits')
        return gap, rate

    def check(self, events, bpm):
        if not np.isfinite(bpm) or not 30 <= bpm <= 300:
            raise ValueError('BPM must be in [30,300]')
        gap, rate = self.limits()
        x = validate_events(events)
        reasons = []
        if len(np.unique(x[:, 2])) > 1:
            reasons.append('multiple_channels')
        if not len(x):
            reasons.append('empty')
            return dict(feasible=False, reasons=reasons, minimum_ioi_ms=None, hits_per_second=0.)
        times = x[:, 0]
        intervals = np.diff(np.r_[times, times[0] + 8]) * 60000 / bpm
        velocity_jumps = abs(np.diff(np.r_[x[:, 1], x[0, 1]]))
        hps = len(x) * bpm / 480
        if intervals.min() < gap - 1e-8:
            reasons.append('minimum_ioi_including_loop')
        if hps > rate + 1e-8:
            reasons.append('mean_rate')
        if velocity_jumps.max() > self.max_velocity_jump + 1e-8:
            reasons.append('velocity_jump_including_loop')
        return dict(feasible=not reasons, reasons=reasons, minimum_ioi_ms=float(intervals.min()), hits_per_second=hps)


@dataclass
class SearchConfig:
    seed: int = 42
    budget: int = 512
    bins: int = 8
    initial_random: int = 32
    restart_probability: float = .1
    velocity: bool = True
    microtiming: bool = True
    max_offset: float = .45
    add_weight: float = 1.
    delete_weight: float = 1.
    shift_weight: float = 1.
    velocity_weight: float = 1.
    timing_weight: float = 1.
    velocity_sigma: float = .12
    timing_sigma: float = .1
    shift_radius: int = 4
    playability: Playability = field(default_factory=Playability)

    def validate(self):
        if any(type(v) != int or v < 1 for v in (self.budget, self.bins, self.initial_random)) or self.seed < 0:
            raise ValueError('Invalid search seed/budget/grid')
        if not np.isfinite([self.restart_probability, self.max_offset]).all() or not 0 <= self.restart_probability <= 1 or not 0 <= self.max_offset < .5:
            raise ValueError('Invalid restart/offset range')
        weights = [self.add_weight, self.delete_weight, self.shift_weight,
                   self.velocity_weight if self.velocity else 0, self.timing_weight if self.microtiming else 0]
        if not np.isfinite(weights).all() or min(weights) < 0 or sum(weights) <= 0:
            raise ValueError('At least one enabled mutation must have positive weight')
        if not np.isfinite([self.velocity_sigma, self.timing_sigma]).all() or min(self.velocity_sigma, self.timing_sigma) <= 0:
            raise ValueError('Mutation scales must be positive')
        if type(self.shift_radius) != int or not 1 <= self.shift_radius <= 8:
            raise ValueError('Shift radius must be 1–8 steps')
        self.playability.limits()


def random_genome(rng, config):
    result = np.zeros((32, 3))
    ids = rng.choice(32, size=int(rng.integers(1, 33)), replace=False)
    result[ids, 0] = 1
    result[ids, 1] = rng.uniform(.35, 1, len(ids)) if config.velocity else .8
    if config.microtiming:
        result[ids, 2] = rng.uniform(-config.max_offset, config.max_offset, len(ids))
    return result


def mutate(genome, rng, config):
    result = genome.copy()
    occupied = np.flatnonzero(result[:, 0]); empty = np.flatnonzero(1 - result[:, 0])
    options = []
    if len(empty):
        options.append('add')
    if len(occupied):
        options.append('delete')
        if len(empty):
            options.append('shift')
        if config.velocity:
            options.append('velocity')
        if config.microtiming:
            options.append('microtiming')
    weights = dict(add=config.add_weight, delete=config.delete_weight, shift=config.shift_weight,
                   velocity=config.velocity_weight, microtiming=config.timing_weight)
    options = [op for op in options if weights[op] > 0]
    if not options:
        return result, 'no_valid_mutation'
    probabilities = np.array([weights[op] for op in options])
    op = str(rng.choice(options) if np.ptp(probabilities) == 0 else rng.choice(options, p=probabilities/probabilities.sum()))
    if op == 'add':
        i = int(rng.choice(empty))
        result[i] = (1, rng.uniform(.35, 1) if config.velocity else .8,
                     rng.uniform(-config.max_offset, config.max_offset) if config.microtiming else 0)
    else:
        i = int(rng.choice(occupied))
        if op == 'delete':
            result[i] = 0
        elif op == 'shift':
            destinations = [(i + d) % 32 for d in (-8, -4, -2, -1, 1, 2, 4, 8)
                            if abs(d) <= config.shift_radius and (i + d) % 32 in empty]
            if not destinations:
                # A blocked onset must not jump outside the configured radius.
                # A partially occupied cyclic grid always has an adjacent gap.
                movable = [int(k) for k in occupied if (k-1) % 32 in empty or (k+1) % 32 in empty]
                i = int(rng.choice(movable))
                destinations = [(i + d) % 32 for d in (-8, -4, -2, -1, 1, 2, 4, 8)
                                if abs(d) <= config.shift_radius and (i + d) % 32 in empty]
            j = int(rng.choice(destinations))
            result[j], result[i] = result[i].copy(), 0
        elif op == 'velocity':
            result[i, 1] = np.clip(result[i, 1] + rng.normal(0, config.velocity_sigma), 1/127, 1)
        else:
            result[i, 2] = np.clip(result[i, 2] + rng.normal(0, config.timing_sigma), -config.max_offset, config.max_offset)
    return result, op


def search(scorer, source_id, bpm, config=None, algorithm='map_elites', progress=None, cancel=None):
    config = config or SearchConfig()
    config.validate()
    if algorithm not in ('map_elites', 'random'):
        raise ValueError('Unknown solo search algorithm')
    config.playability.check([], bpm)
    rng = np.random.default_rng(config.seed)
    archive, history, seen = {}, [], set()
    context = hashlib.sha256(json.dumps(dict(source_id=source_id, source=scorer.source.tolist(), bpm=bpm,
        config=asdict(config), model=scorer.model.metadata), sort_keys=True).encode()).hexdigest()[:20]
    for iteration in range(config.budget):
        if cancel is not None and cancel.is_set():
            break
        parent = None
        if algorithm == 'map_elites' and archive and iteration >= config.initial_random and rng.random() >= config.restart_probability:
            elite = list(archive.values())[int(rng.integers(len(archive)))]
            parent = elite['iteration']
            genome, operation = mutate(np.array(elite['genome']), rng, config)
        else:
            genome, operation = random_genome(rng, config), 'random'
        events = profile_events(genome)
        feasible = config.playability.check(events, bpm)
        breakdown = scorer.score(events)  # Every proposal consumes one evaluation, including rejects/duplicates.
        density, syn = len(events) / 8, syncopation(events)
        cell = (min(config.bins-1, int(density / 4 * config.bins)), min(config.bins-1, int(syn * config.bins)))
        signature = hashlib.sha256(genome.tobytes()).hexdigest()
        duplicate = signature in seen
        seen.add(signature)
        accepted = feasible['feasible'] and (cell not in archive or breakdown['quality'] > archive[cell]['score']['quality'])
        row = dict(iteration=iteration, parent=parent, operation=operation, cell=list(cell),
            density=density, syncopation=syn, constraints=feasible, score=breakdown,
            duplicate=duplicate, accepted=bool(accepted), genome=genome.tolist())
        history.append(row)
        if accepted:
            archive[cell] = row
        if progress is not None and (iteration % 16 == 0 or iteration + 1 == config.budget):
            progress(dict(evaluations=iteration+1, filled=len(archive),
                          best=max((r['score']['quality'] for r in archive.values()), default=0.)))
    elites = sorted(archive.values(), key=lambda r: tuple(r['cell']))
    return dict(context_id=context, source_id=source_id, source_profile=scorer.source.tolist(), bpm=bpm,
        algorithm=algorithm, config=asdict(config), evaluations=len(history), unique_candidates=len(seen),
        feasible_evaluations=sum(r['constraints']['feasible'] for r in history),
        coverage=len(elites) / config.bins**2,
        qd_score=sum(r['score']['quality'] for r in elites) / config.bins**2,
        descriptor=dict(version='solo-metrical-rest-v1', density_bounds=[0, 4], syncopation_bounds=[0, 1]),
        archive=elites, history=history, cancelled=bool(cancel is not None and cancel.is_set()),
        generated_provenance='synthetic 1-ch interpretation; not human ground truth')


def save_search(result, directory):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=False)
    for elite in result['archive']:
        x, y = elite['cell']
        events = profile_events(np.array(elite['genome']))
        pattern = Pattern(id=f'{result["context_id"]}-{elite["iteration"]}', bpm=result['bpm'],
            seed=result['config']['seed'], engine=f'solo-{result["algorithm"]}', notes=[
                Note(drum=1, beat=float(b), velocity=float(v)) for b, v, _ in events])
        (directory / f'cell-{x}-{y}.mid').write_bytes(midi_bytes(pattern))
    (directory / 'archive.json').write_text(json.dumps({k: v for k, v in result.items() if k != 'history'},
                                                     indent=2, allow_nan=False) + '\n')
    with (directory / 'evaluations.jsonl').open('w') as stream:
        for row in result['history']:
            stream.write(json.dumps(row, allow_nan=False) + '\n')
