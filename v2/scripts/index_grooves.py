"""Index selected training grooves using an encoder; this is NOT yet a tap-aligned index."""
import argparse
import json
from pathlib import Path
import sys
import numpy as np
import torch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from groove.representation.data import verify_inputs, selections
from groove.representation.encoder import load_encoder
from groove.pretraining.audit import sha256
from groove.events import from_heads
from groove.generation import measures


def build(cache_dir, plan_dir, checkpoint, output, batch_size=128, device='cpu', include_synthetic=False):
    if batch_size < 1:
        raise ValueError('batch-size must be positive')
    cache_dir, plan_dir, checkpoint, output = map(Path, (cache_dir, plan_dir, checkpoint, output))
    cache, plan, fingerprints = verify_inputs(cache_dir, plan_dir)
    model, state = load_encoder(checkpoint, device)
    if any(state['identity']['inputs'][k] != value for k, value in fingerprints.items()):
        raise ValueError('Encoder was trained against a different cache/plan')
    rows, _, _ = selections(cache, plan_dir, include_synthetic)
    output.mkdir(parents=True, exist_ok=False)
    source = np.load(cache_dir/'train/drums.npy', mmap_mode='r', allow_pickle=False)
    matrix = np.lib.format.open_memmap(output/'embeddings.npy', mode='w+', dtype=np.float32,
                                       shape=(len(rows), model.config.embedding))
    descriptors = np.empty((len(rows), 2), np.float32)
    metadata = {}
    wanted = set(map(int, rows))
    with (plan_dir/'train-manifest.jsonl').open() as handle:
        for line in handle:
            row = json.loads(line)
            if row['split_index'] in wanted:
                metadata[row['split_index']] = row
    with torch.inference_mode(), (output/'manifest.jsonl').open('w') as manifest:
        for start in range(0, len(rows), batch_size):
            indexes = rows[start:start+batch_size]
            hvo = np.array(source[indexes], copy=True)
            matrix[start:start+len(indexes)] = model.encode(torch.from_numpy(hvo).to(device)).cpu().numpy()
            for local, index in enumerate(indexes):
                y = hvo[local]
                desc = measures(from_heads(y[..., 0], y[..., 1], y[..., 2]))
                descriptors[start+local] = (desc['density'], desc['syncopation'])
                manifest.write(json.dumps(dict(metadata[int(index)], embedding_index=start+local, descriptors=desc)) + '\n')
            if start//10000 != (start+len(indexes))//10000:
                print(f'{start+len(indexes)} embeddings indexed', flush=True)
    matrix.flush()
    # Small deterministic sample: representation diagnostics, not perceptual evaluation.
    sample = np.asarray(matrix[np.linspace(0, len(rows)-1, min(len(rows), 4096), dtype=int)])
    centered = sample - sample.mean(0)
    eigen = np.linalg.eigvalsh(centered.T @ centered / max(len(sample)-1, 1)).clip(0)
    probability = eigen / max(eigen.sum(), 1e-12)
    effective_rank = float(np.exp(-np.sum(probability[probability > 0] * np.log(probability[probability > 0])))) if eigen.sum() > 1e-12 else 0.
    matrix._mmap.close()
    np.save(output/'descriptors.npy', descriptors)
    np.save(output/'rows.npy', rows)
    report = dict(version='groove-index-v1', space='groove-pretraining-not-tap-aligned', split='train',
        rows=len(rows), embedding=model.config.embedding, checkpoint_sha256=sha256(checkpoint),
        input_fingerprints=fingerprints, include_synthetic=include_synthetic,
        diagnostics=dict(mean_dimension_std=float(sample.std(0).mean()), effective_rank=effective_rank),
        artifacts={name: sha256(output/name) for name in ('embeddings.npy', 'descriptors.npy', 'rows.npy', 'manifest.jsonl')},
        limitations=['Do not query with an untrained tap encoder or compare vectors from different projection checkpoints.',
                      'Corpus contains selected train rows, possibly beyond a limited smoke-training subset.',
                      'Density and syncopation use the existing metrical-proxy-v1 definitions.'])
    (output/'index.json').write_text(json.dumps(report, indent=2) + '\n')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('cache', 'plan', 'checkpoint', 'output'):
        parser.add_argument('--'+name, type=Path, required=True)
    parser.add_argument('--batch-size', type=int, default=128)
    parser.add_argument('--device', choices=('cpu', 'cuda'), default='cpu')
    parser.add_argument('--include-synthetic', action='store_true')
    args = parser.parse_args()
    torch.set_num_threads(4)
    print(json.dumps(build(args.cache, args.plan, args.checkpoint, args.output, args.batch_size, args.device, args.include_synthetic), indent=2))
