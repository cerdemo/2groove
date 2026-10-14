"""Predeclared grouped cross-validation; no selection on held-out outcomes."""
from collections import defaultdict
import itertools
import json
from pathlib import Path
import platform

import numpy as np

from .data import load
from .models import CONDITIONS, fit
from .source import digest, write_json


def assignment(values, folds, seed):
    values = sorted(set(values))
    if not 2 <= folds <= len(values):
        raise ValueError('Need at least two nonempty folds, no more than group count')
    order = np.random.default_rng(seed).permutation(len(values))
    return {values[int(j)]: int(i % folds) for i, j in enumerate(order)}


def plan_folds(sources, records, folds=4, seed=42):
    primary = [t for t in records if t['role'] == 'primary']
    groups = {s['id']: s['group'] for s in sources}
    source_fold = assignment(groups.values(), folds, seed)
    session_fold = assignment([t['session'] for t in primary], folds, seed + 1)
    # All blocks on the same recording date stay together. Person identities are proxies.
    plans = []
    for regime in ('source', 'participant_session', 'crossed'):
        pairs = (itertools.product(range(folds), range(folds)) if regime == 'crossed' else
                 ((i, None) if regime == 'source' else (None, i) for i in range(folds)))
        for sf, pf in pairs:
            train, test = [], []
            for i, t in enumerate(primary):
                source_test = sf is None or source_fold[groups[t['source_id']]] == sf
                person_test = pf is None or session_fold[t['session']] == pf
                source_train = sf is None or source_fold[groups[t['source_id']]] != sf
                person_train = pf is None or session_fold[t['session']] != pf
                if source_test and person_test:
                    test.append(i)
                elif source_train and person_train:
                    train.append(i)
                # Crossed off-diagonal observations are excluded, never borrowed for fitting.
            if not train or not test:
                raise ValueError('Empty training/evaluation cell')
            plan = dict(regime=regime, id=f'{regime}-s{sf}-p{pf}', train=train, test=test,
                        source_fold=sf, session_fold=pf)
            assert_disjoint(plan, primary, groups)
            plans.append(plan)
    for regime in ('source', 'participant_session', 'crossed'):
        seen = sorted(i for p in plans if p['regime'] == regime for i in p['test'])
        if seen != list(range(len(primary))):
            raise ValueError('Each primary pair must be evaluated exactly once per regime')
    return primary, plans


def assert_disjoint(plan, records, groups):
    train = [records[i] for i in plan['train']]
    test = [records[i] for i in plan['test']]
    if set(plan['train']) & set(plan['test']):
        raise ValueError('Trial leakage')
    if plan['regime'] in ('source', 'crossed') and (
        {groups[t['source_id']] for t in train} & {groups[t['source_id']] for t in test}):
        raise ValueError('Source-family leakage')
    if plan['regime'] in ('participant_session', 'crossed'):
        for key in ('session', 'participant'):
            if {t[key] for t in train} & {t[key] for t in test}:
                raise ValueError(f'{key} leakage')


def response_loss(velocity, prob, predicted_velocity, sigma):
    v = np.asarray(velocity)
    hit = v > 0
    bce = -np.mean(hit * np.log(prob) + (~hit) * np.log1p(-prob))
    # Fixed Gaussian observation model; sigma is learned only on training hits.
    nll = bce + np.sum(hit * (.5 * ((v - predicted_velocity) / sigma) ** 2 +
                                   np.log(sigma * np.sqrt(2 * np.pi)))) / 16
    return dict(bce=float(bce), brier=float(np.mean((hit - prob) ** 2)),
        velocity_mae=float(np.mean(np.abs(v[hit] - predicted_velocity[hit]))) if hit.any() else None,
        contour_mse=float(np.mean((v - prob * predicted_velocity) ** 2)), nll=float(nll))


def tie_metrics(scores, positive):
    """Expected rank metrics under uniform tie-breaking; a constant equals chance."""
    scores = np.asarray(scores, float)
    target = scores[positive]
    ties = np.isclose(scores, target, rtol=0, atol=1e-10)
    better = int(np.sum((scores > target) & ~ties))
    tied = int(ties.sum())
    ranks = np.arange(better + 1, better + tied + 1)
    n = len(scores)
    return dict(retrieval_mrr=float(np.mean(1 / ranks)),
                retrieval_r1=float(np.mean(ranks <= 1)),
                candidate_count=n, chance_mrr=float(np.mean(1 / np.arange(1, n + 1))),
                chance_r1=1 / n)


def shuffled_records(records, sources, seed):
    """Train-only broken source/response control, retaining participant and phase."""
    rng = np.random.default_rng(seed)
    mapping = {}
    for s in sources:
        pool = [t['id'] for t in sources if t['group'] != s['group']]
        if not pool:
            raise ValueError('Shuffled control needs unrelated training source groups')
        mapping[s['id']] = int(rng.choice(pool))
    lookup = {(t['source_id'], t['participant']): t for t in records}
    result = []
    for t in records:
        donor = lookup.get((mapping[t['source_id']], t['participant']))
        if donor is None:
            raise ValueError('Incomplete training rectangle for within-person shuffled control')
        result.append(dict(t, velocity=donor['velocity'], hit=donor['hit']))
    return result, mapping


def macro(rows, key):
    # Equal source-family mass, then equal source mass, then equal human take mass.
    groups = defaultdict(lambda: defaultdict(list))
    for row in rows:
        if row[key] is not None:
            groups[row['group']][row['source_id']].append(row[key])
    return float(np.mean([np.mean([np.mean(v) for v in sources.values()])
                          for sources in groups.values()])) if groups else None


def paired_intervals(rows, other, key, cluster, seed, count):
    """Cluster bootstrap of paired losses, conditional on the other grouping axis.

    We report source and session intervals separately rather than claiming that a
    one-way bootstrap resolves crossed dependence or provides confirmatory inference.
    """
    lookup = {r['record_id']: r for r in other}
    samples = defaultdict(list)
    for r in rows:
        b = lookup[r['record_id']]
        if r[key] is not None and b[key] is not None:
            samples[r[cluster]].append(r[key] - b[key])
    values = np.array([np.mean(v) for v in samples.values()])
    if not len(values):
        return None
    rng = np.random.default_rng(seed)
    draws = values[rng.integers(len(values), size=(count, len(values)))].mean(1)
    return dict(delta_mean=float(values.mean()), low=float(np.quantile(draws, .025)),
                high=float(np.quantile(draws, .975)), clusters=len(values),
                definition=f'Equal {cluster}-cluster mean paired delta; negative loss delta is better',
                conditional_interval=True)


def retest_consistency(records):
    primary = {(t['source_id'], t['participant']): t for t in records if t['role'] == 'primary'}
    rows = []
    for t in records:
        if t['role'] != 'retest':
            continue
        a = np.asarray(primary[t['source_id'], t['participant']]['velocity'])
        b = np.asarray(t['velocity'])
        both = (a > 0) & (b > 0)
        rows.append(dict(record_id=t['id'], source_id=t['source_id'], participant=t['participant'],
            onset_disagreement=float(np.mean((a > 0) != (b > 0))),
            contour_mae=float(np.mean(np.abs(a - b))),
            velocity_mae_on_shared_hits=float(np.mean(np.abs(a[both] - b[both]))) if both.any() else None))
    return dict(pairs=len(rows), rows=rows, note='Descriptive repeatability; never a train/test split or a performance ceiling.')


def run(data, output, *, seed=42, folds=4, motifs=8, ridge=.01, bootstrap=1000):
    output = Path(output)
    if output.exists():
        raise FileExistsError(output)
    if seed < 0 or motifs < 1 or not np.isfinite(ridge) or ridge <= 0 or bootstrap < 1:
        raise ValueError('Invalid benchmark budget/configuration')
    sources, records, fingerprint = load(data)
    primary, plans = plan_folds(sources, records, folds, seed)
    by_id = {s['id']: s for s in sources}
    code_dir = Path(__file__).parent
    code = {str(p.relative_to(code_dir)): digest(p.read_bytes()) for p in code_dir.glob('*.py')}
    for p in (code_dir.parent / 'features.py', code_dir.parent / 'model.py'):
        code['../' + p.name] = digest(p.read_bytes())
    config = dict(seed=seed, folds=folds, motifs=motifs, ridge=ridge, bootstrap=bootstrap)
    output.mkdir(parents=True, exist_ok=False)
    (output / 'models').mkdir()
    write_json(output / 'run.json', dict(format='human-contour-benchmark-v1', config=config,
        data_fingerprint=fingerprint, code_hashes=code, numpy=np.__version__, python=platform.python_version(),
        conditions=list(CONDITIONS) + ['shapelet_shuffled'],
        hyperparameter_selection=False, frozen_external_test=False, pretrained_encoder_used=False,
        status='running', note='Exploratory grouped cross-validation on real mono contours; not a perceptual study.'))
    write_json(output / 'folds.json', [dict(p, train_records=[primary[i]['id'] for i in p['train']],
        test_records=[primary[i]['id'] for i in p['test']]) for p in plans])
    write_json(output / 'retest.json', retest_consistency(records))
    all_rows = []
    with (output / 'predictions.jsonl').open('x') as log:
        for number, plan in enumerate(plans):
            train = [primary[i] for i in plan['train']]
            test = [primary[i] for i in plan['test']]
            train_ids = {t['source_id'] for t in train}
            train_sources = [s for s in sources if s['id'] in train_ids]
            gallery_ids = sorted({t['source_id'] for t in test})
            shuffled, donor_map = shuffled_records(train, train_sources, seed)
            for condition in (*CONDITIONS, 'shapelet_shuffled'):
                model = fit(train_sources, shuffled if condition == 'shapelet_shuffled' else train,
                    'shapelet' if condition == 'shapelet_shuffled' else condition,
                    motifs=motifs, ridge=ridge, seed=seed)
                if condition == 'shapelet_shuffled':
                    model.metadata['shuffled_training_donors'] = donor_map
                write_json(output / 'models' / f'{plan["id"]}-{condition}.json', model.serialize())
                predictions = {sid: model.predict(by_id[sid]['counts']) for sid in gallery_ids}
                shifted = {sid: model.predict(np.roll(by_id[sid]['counts'], 1, axis=0)) for sid in gallery_ids}
                for t in test:
                    sid = t['source_id']
                    p, v = predictions[sid]
                    loss = response_loss(t['velocity'], p, v, model.sigma)
                    shifted_loss = response_loss(t['velocity'], *shifted[sid], model.sigma)
                    # Exact LMH aliases collapse to one candidate. Other segments of the
                    # known same parent are excluded rather than labelled wrong responses.
                    target_signature = tuple(np.asarray(by_id[sid]['counts']).ravel())
                    signatures, gallery, scores, positive = set(), [], [], None
                    for candidate in gallery_ids:
                        sig = tuple(np.asarray(by_id[candidate]['counts']).ravel())
                        if sig in signatures:
                            continue
                        if by_id[candidate]['group'] == by_id[sid]['group'] and sig != target_signature:
                            continue
                        signatures.add(sig)
                        if sig == target_signature:
                            positive = len(scores)
                        gallery.append(candidate)
                        scores.append(-response_loss(t['velocity'], *predictions[candidate], model.sigma)['nll'])
                    if positive is None:
                        raise ValueError('Missing positive in held-out gallery')
                    row = dict(record_id=t['id'], source_id=sid, group=by_id[sid]['group'],
                        participant=t['participant'], session=t['session'], regime=plan['regime'],
                        fold=plan['id'], condition=condition, **loss, **tie_metrics(scores, positive),
                        shifted_source_bce=shifted_loss['bce'], gallery=gallery, retrieval_scores=scores,
                        predicted_hit=p.tolist(), predicted_velocity=v.tolist(), observed_velocity=t['velocity'])
                    log.write(json.dumps(row, allow_nan=False) + '\n')
                    all_rows.append(row)
            log.flush()
            print(f'[{number + 1}/{len(plans)}] {plan["id"]}: {len(train)} train / {len(test)} held out', flush=True)
    summary = dict(config=config, data_fingerprint=fingerprint, results={}, paired_deltas={},
        claim='Exploratory human-response prediction and known-source retrieval, not perceptual preference or generation validation',
        limitations=json.loads((Path(data) / 'audit.json').read_text())['limitations'] + [
            'Small source vocabulary; fold galleries differ. Compare conditions within the same regime and fold.',
            'Primary metrics average source families, then source patterns, then human responses.',
            'Bootstrap intervals separately condition on source or session clusters; they are exploratory, not full crossed-effects inference.',
            'No nested tuning or model promotion; all regularization/dictionary budgets were fixed before evaluation.',
        ])
    for regime in ('source', 'participant_session', 'crossed'):
        summary['results'][regime] = {}
        summary['paired_deltas'][regime] = {}
        for condition in (*CONDITIONS, 'shapelet_shuffled'):
            rows = [r for r in all_rows if r['regime'] == regime and r['condition'] == condition]
            summary['results'][regime][condition] = dict(queries=len(rows), **{key: macro(rows, key) for key in
                ('bce', 'brier', 'velocity_mae', 'contour_mse', 'retrieval_mrr', 'retrieval_r1',
                 'candidate_count', 'chance_mrr', 'chance_r1', 'shifted_source_bce')})
        shapelet = [r for r in all_rows if r['regime'] == regime and r['condition'] == 'shapelet']
        for baseline in ('meter_onset_fwod', 'local_linear', 'shapelet_shuffled'):
            other = [r for r in all_rows if r['regime'] == regime and r['condition'] == baseline]
            summary['paired_deltas'][regime][baseline] = {key: {cluster: paired_intervals(
                shapelet, other, key, cluster, seed, bootstrap) for cluster in ('group', 'session')}
                for key in ('bce', 'brier', 'velocity_mae', 'contour_mse')}
    write_json(output / 'summary.json', summary)
    run_info = json.loads((output / 'run.json').read_text())
    run_info['status'] = 'complete'
    write_json(output / 'run.json', run_info)
    write_json(output / 'completed.json', dict(data_fingerprint=fingerprint, code_hashes=code,
        folds=len(plans), fitted_models=len(plans) * (len(CONDITIONS) + 1),
        primary_pairs=len(primary), prediction_rows=len(all_rows),
        files={str(p.relative_to(output)): digest(p.read_bytes()) for p in output.rglob('*') if p.is_file()}))
    print(f'Completed: {output / "summary.json"}', flush=True)
    return summary
