# Tap–groove compatibility: implementation plan and encoder training

Objective: retrieve and explore grooves compatible with a user's rhythmic idea.
Human tap/groove pairs supervise compatibility, not reconstruction of one prescribed
MIDI file from target-derived pseudo taps. The old CVAE remains a baseline.

## Work sequence and acceptance gates

1. **Groove encoder pretraining — implemented.** Train a small bidirectional
   Transformer with masked HVO prediction on audited original training windows.
   Per-cell/time/voice masks hide hits, velocities and offsets together. An explicit
   missingness flag distinguishes hidden cells from rests. The pooled embedding is
   a reconstruction bottleneck; masked hit BCE balances positive and negative cells,
   velocity/offset losses apply only to masked true hits. No style/BPM shortcut is
   supplied to the network. This baseline uses 32 time tokens, hidden/embedding 128,
   3 layers and 4 attention heads by default. It is not a general event encoder.
   Gate: finite gradients, tiny-set overfit, repeatable validation, resumed training
   equivalence, cache/provenance checks, CUDA smoke run and context sensitivity.
2. **TapTamDrum bridge — raw adapter implemented; benchmark reservation pending.**
   Pin/download official MIDI; retain continuous tap beats, velocity, hand, performer,
   interpretation, original GMD session/performance and segment. Keep whole GMD
   sessions together when splitting. Reserve held-out sessions and equivalent copies
   in the multi-source corpus before an inductive encoder experiment. Exact hashes
   alone do not find all cropped/performance duplicates. A separate participant-held-out
   evaluation is necessary; do not call the default session split participant-disjoint.
3. **Human contrastive alignment — encoder/loss primitives implemented; training and
   evaluation runner next.** Freeze the groove encoder initially, learn projection
   heads and a continuous-event tap encoder. Use source-group multi-positive loss,
   group/participant-balanced batches and masks for known ambiguous negatives.
   Simple and complex interpretations remain distinct records, not averaged taps.
   Benchmark pad-aware, hand-agnostic and mono views; artificial mono views do not
   replace real single-finger input. Compare frozen and partially fine-tuned encoders.
   Gate: source/session-held-out and participant-held-out retrieval, matched-tempo/style
   distractors, shuffled-pair controls, descriptor and TapTam exemplar baselines.
4. **Retrieval — groove index exporter and exact search primitives implemented;
   aligned tap queries and UI pending.** Rebuild every corpus vector with the learned
   GROOVE projection after alignment. Fingerprint model/projection/representation.
   Filter style, fill, source and tempo independently of compatibility; handle empty
   taps and low-confidence queries explicitly. Inspect retrieval on real input takes.
   Gate: human compatibility judgments as well as Recall@K/MRR. The original source
   is a known positive, not proof that all other retrieved grooves are wrong.
5. **Diverse corpus archive — static per-cell selection implemented; product integration
   pending.** Density × metrical syncopation proxy; exact bounds [0,12] × [0,1].
   Search every eligible cell, not only the global nearest neighbours. A static
   corpus archive is NOT evolutionary MAP-Elites. Compare top-K, random and archive
   recommendations with equal candidate budgets and independent human judgments.
6. **Generative QD, personalization and polyrhythm — planned.** Seed MAP-Elites from
   retrieved grooves; mutate events or a separately trained generator latent, then
   re-encode actual outputs. A contrastive vector has no automatic MIDI inverse.
   Recompute quality for every tap/style/fill/lock context. Penalize invalid proposals
   and audit scorer exploitation. Keep NI-grid structure separate from timing noise;
   retain event data for representations exceeding 32x9 HVO. Add explicit user
   preferences only after collecting suitable judgments; no valence/arousal claims
   without corresponding annotations.

## Current scope and research protocol

The standalone encoder can train while alignment, retrieval and UI work proceeds.
This is **exploratory representation pretraining**, not a perceptual validation run.
TapTamDrum uses GMD-derived references, which can overlap our pretraining corpus.
Until source/session reservation is mapped and checked, do not claim inductive
TapTamDrum generalization from this checkpoint. `--exclude-parents file.json` accepts
a nonempty list of canonical parent IDs, applies it to train and validation, and
records its hash. The caller must include aliases/equivalent copies; this option
does not itself establish a complete leakage audit. A clean benchmark run can be
retrained with the frozen reservation once that mapping is ready.

Default pretraining uses **all selected ORIGINAL train windows, uniformly shuffled**;
original-only validation selects the best checkpoint. It never opens test tensors.
`--include-synthetic` enables selected synthetic rows, not the entire combinatorial
export. `--sampling plan` uses the existing plan's weights with replacement; those
weights were designed for fill/style balancing and can overemphasize rare examples.
They are therefore not the default for self-supervised pretraining.

## Remote commands (from v2, activated Python 3.12 environment)

First finish the existing [pretraining workflow](PRETRAINING.md). The following
paths must exist and refer to **the same passed audit**:

- `artifacts/pretrain-plan/plan.json`
- `data/2groove2-hvo-mmap/cache.json`

The trainer checks file hashes, index bounds and shapes before training. This
initial scan reads NPY files sequentially; training reads them with memory mapping.
If preparation is still pending, run in order (fresh output directories):

```bash
python scripts/prepare_training.py --audit artifacts/pretrain-audit --output artifacts/pretrain-plan
python scripts/cache_hvo.py --audit artifacts/pretrain-audit --output data/2groove2-hvo-mmap
```

Check the remote environment and training loop:

```bash
python -m pytest -q
python -c "import torch; print(torch.__version__, torch.version.cuda); print('CUDA:', torch.cuda.is_available())"
python scripts/train_groove_encoder.py \
  --cache data/2groove2-hvo-mmap --plan artifacts/pretrain-plan \
  --out artifacts/groove-encoder-smoke --device cuda \
  --epochs 2 --batch-size 64 --train-limit 512 --validation-limit 128
```

Explicit CUDA fails if unavailable; `--device auto` can fall back to CPU. No silent
CUDA fallback in the command above. FP32 is the initial baseline; mixed precision
is not enabled yet. If VRAM is insufficient, use a smaller batch in a fresh run.

After smoke success, begin the full-original-corpus **pilot** (30 is a starting
budget, not an optimized epoch count):

```bash
python scripts/train_groove_encoder.py \
  --cache data/2groove2-hvo-mmap --plan artifacts/pretrain-plan \
  --out artifacts/groove-encoder-v1 --device cuda \
  --epochs 30 --batch-size 128 --workers 0
```

Use a persistent remote terminal session if needed. Checkpoints are saved after
each completed epoch. Resume the same run after interruption with exactly the
same settings and a final epoch count greater than the completed epoch:

```bash
python scripts/train_groove_encoder.py \
  --cache data/2groove2-hvo-mmap --plan artifacts/pretrain-plan \
  --out artifacts/groove-encoder-v1 --device cuda \
  --epochs 30 --batch-size 128 --workers 0 \
  --resume artifacts/groove-encoder-v1/last.pt
```

Resume verifies data, code and settings, restores optimizer/RNG state and resumes at
the next epoch; partial epochs restart. CPU equivalence is covered by a test.
CUDA determinism is requested but cross-device/framework bitwise identity is not
claimed. New runs require a fresh output folder. Keep source/cache files immutable
during training. Outputs: `run.json`, `selection.npz`, `metrics.jsonl`, `best.pt`,
`last.pt`, and `completed.json` only when the requested epoch budget finishes.

Inspect `validation.loss`, masked hit F1, velocity/offset errors and
`validation_shuffled_input`: better loss with real context than mismatched visible
grooves supports context usage. Shuffling is within each batch; a singleton cannot
test this. `validation_constant_baseline` predicts hit probability .5, velocity .5,
offset 0; beating it is an engineering check, not a strong retrieval baseline.
No test metric is used to choose checkpoints.

## TapTamDrum adapter and representation decision

Official sources: [dataset and API](https://github.com/TapTamDrum/dataset),
[paper](https://archives.ismir.net/ismir2023/paper/000012.pdf).
Pinned revision: `c1e9e56359135cec090b9a2e6feabf1c76123e40`.
Downloader fetches only 1,461 MIDI files (~652 KB payload; HTTP overhead additional),
verifies upstream Git blob hashes and records SHA256. No pickle/API code is executed.

```bash
python scripts/fetch_taptamdrum.py --output data/taptamdrum-source
python scripts/prepare_taptamdrum.py \
  --source data/taptamdrum-source --output data/taptamdrum-pairs-v1
```

Local full-source verification retained **345 originals / 1,116 human interpretations**.
With the existing 32x9 mapping and a 5% collision threshold, only **224 originals /
744 interpretations** qualify for the HVO baseline. The remaining raw human pairs
are retained, not thrown away. `hvo_eligible` and `hvo_eligible.npy` MUST be applied
before HVO alignment; `patterns.jsonl.raw_events` and `pairs.jsonl.events` preserve
the data for an event encoder. This loss of coverage is a concrete reason to test
an event representation before committing to HVO as the final architecture.

Default seed 42 session splits contain 743/172/201 raw train/validation/test pairs.
They are not participant-disjoint or automatically clean relative to pretraining.
Original/tap pitch mappings follow the upstream Roland maps, not generic GM guesses.
No first-onset alignment, hard quantization or tempo default is silently applied to
human tap events. MIDI onset resolution is the source PPQ.

## Index diagnostic after encoder training

```bash
python scripts/index_grooves.py \
  --cache data/2groove2-hvo-mmap --plan artifacts/pretrain-plan \
  --checkpoint artifacts/groove-encoder-v1/best.pt \
  --output artifacts/groove-index-v1 --device cuda
```

This indexes selected original TRAIN windows, not validation/test or the whole
synthetic export. It writes normalized embeddings, descriptors, original row indexes
and provenance. Check dimension variance and effective rank for collapse, but do
not treat them as perceptual quality. Index metadata explicitly says
`groove-pretraining-not-tap-aligned`. Querying it with an untrained tap encoder or a
different projection is invalid. After human alignment the index must be rebuilt.

## What to send back from the remote pilot

Send `run.json`, the last few lines of `metrics.jsonl` (including shuffled-input
metrics), and any error/VRAM information. After indexing, also send `index.json`.
Keep the full checkpoint on the remote machine until we connect the alignment runner.
Masked reconstruction improvement alone is not permission to claim perceptual success.
