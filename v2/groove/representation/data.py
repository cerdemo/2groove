"""Verified training-plan indexes over NPY maps. Test arrays are never opened for fitting."""
import json
from pathlib import Path
import numpy as np
import torch
from torch.utils.data import Dataset
from ..pretraining.audit import sha256


def read_json(path):
    return json.loads(Path(path).read_text())


def verify_inputs(cache_dir, plan_dir):
    cache_dir, plan_dir = Path(cache_dir), Path(plan_dir)
    cache, plan = read_json(cache_dir/'cache.json'), read_json(plan_dir/'plan.json')
    if cache.get('version') != 'hvo-npy-cache-v1' or cache.get('status') != 'complete':
        raise ValueError('Completed HVO cache required')
    if plan.get('version') != 'pretraining-plan-v1' or plan.get('status') != 'complete':
        raise ValueError('Completed pretraining plan required')
    if cache['audit_sha256'] != plan['audit_sha256']:
        raise ValueError('Cache and plan must reference the same audit')
    for split in ('train', 'validation'):
        if cache['source_fingerprints'][split] != plan['inputs'][split]['sha256']:
            raise ValueError('Cache and plan refer to different arrays')
        path = cache_dir/split/'drums.npy'
        if sha256(path) != cache['arrays'][f'{split}/drums.npy']['sha256']:
            raise ValueError(f'Changed cache array: {split}')
        array = np.load(path, mmap_mode='r', allow_pickle=False)
        if array.dtype != np.float32 or array.shape != (cache['counts'][split], 32, 9, 3):
            raise ValueError(f'Invalid HVO cache shape/dtype: {split}')
    for name in ('train-plan.npz', 'evaluation-indexes.npz', 'train-manifest.jsonl'):
        if sha256(plan_dir/name) != plan['artifacts'][name]:
            raise ValueError(f'Changed plan artifact: {name}')
    fingerprints = dict(cache=sha256(cache_dir/'cache.json'), plan=sha256(plan_dir/'plan.json'))
    return cache, plan, fingerprints


def selections(cache, plan_dir, include_synthetic=False, train_limit=None, validation_limit=None, seed=42):
    with np.load(Path(plan_dir)/'train-plan.npz', allow_pickle=False) as data:
        keep = np.ones(len(data['index']), bool) if include_synthetic else ~data['synthetic']
        train, weights = data['index'][keep].copy(), data['weight'][keep].copy()
    with np.load(Path(plan_dir)/'evaluation-indexes.npz', allow_pickle=False) as data:
        validation = data['validation_original'].copy()
    for split, rows in [('train', train), ('validation', validation)]:
        if rows.dtype != np.int64 or len(rows) != len(np.unique(rows)):
            raise ValueError(f'Invalid {split} indexes')
        if not len(rows) or rows.min() < 0 or rows.max() >= cache['counts'][split]:
            raise ValueError(f'Empty or out-of-range {split} selection')
    rng = np.random.default_rng(seed)
    if train_limit is not None and train_limit < len(train):
        chosen = np.sort(rng.choice(len(train), train_limit, replace=False))
        train, weights = train[chosen], weights[chosen]
    if validation_limit is not None and validation_limit < len(validation):
        validation = np.sort(rng.choice(validation, validation_limit, replace=False))
    if not np.isfinite(weights).all() or (weights < 0).any() or weights.sum() <= 0:
        raise ValueError('Invalid sampling weights')
    return train, weights / weights.sum(), validation


class HVOExamples(Dataset):
    def __init__(self, path, indexes):
        self.path = str(path)
        self.indexes = np.asarray(indexes, dtype=np.int64)
        self.array = None

    def __len__(self):
        return len(self.indexes)

    def __getitem__(self, index):
        if self.array is None:
            self.array = np.load(self.path, mmap_mode='r', allow_pickle=False)
        row = int(self.indexes[index])
        return torch.from_numpy(self.array[row].copy()), row

    def __getstate__(self):
        return dict(self.__dict__, array=None)
