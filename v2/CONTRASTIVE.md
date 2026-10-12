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
3. **Human contrastive alignment — frozen-encoder pilot runner implemented.** Train
   a continuous-event tap encoder and groove projection on human pairs using
   source-group multi-positive loss, participant-aware batches and masks for other
   segments of a known common performance. Session-held-out validation reports
   retrieval, chance/onset baselines, label-permutation controls and matched
   style/tempo candidate subsets. Pretraining overlap certification and separate
   participant-held-out evaluation remain pending.
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
Keep the full checkpoint on the remote machine; the alignment runner uses `best.pt`.
Masked reconstruction improvement alone is not permission to claim perceptual success.

## Next training: human tap–groove alignment

The next pilot starts from the existing `artifacts/groove-encoder-v1/best.pt` and
**freezes every groove encoder weight**. It trains only the continuous-event tap
encoder and a normalized groove projection. The checkpoint includes both networks
and the frozen encoder, so inference does not require the original checkpoint path.
An older pretraining trainer code hash is fine for this initialization: this is a
new training stage, not `--resume` of the old pretraining run.

This remains exploratory: the previous pretraining run did not reserve TapTamDrum's
GMD references. No claim of clean inductive generalization is made. Neither fitting
nor checkpoint selection encodes/evaluates test taps or grooves. All pair artifacts
are hashed for integrity, including the shared array containing all splits.

After transferring the updated code to the remote PC, from `v2` with its venv active:

```bash
python -m pip install "tensorboard==2.21.0" "tqdm==4.70.1"
python -m pytest -q

python scripts/fetch_taptamdrum.py --output data/taptamdrum-source
python scripts/prepare_taptamdrum.py \
  --source data/taptamdrum-source --output data/taptamdrum-pairs-v2
```

The fetcher verifies/reuses existing matching MIDI files. Preparation needs a fresh
output directory. If a current export with `hvo_eligible.npy` already exists, use
that path and skip preparation. Older exports without explicit eligibility are
rejected with an instruction to rebuild. The full current export preserves all
1,116 taps; the HVO alignment selection uses 571 train and 80 validation taps, over
163 train / 24 validation positive groups after alias merging. The 93 eligible test
taps remain outside training and checkpoint selection.

First check the new training path on CUDA:

```bash
python scripts/train_tap_alignment.py \
  --pairs data/taptamdrum-pairs-v2 \
  --groove-checkpoint artifacts/groove-encoder-v1/best.pt \
  --out artifacts/tap-alignment-smoke \
  --device cuda --epochs 2 --train-group-limit 32 \
  --batch-groups 16 --taps-per-group 2 --progress on
```

Then start the full eligible human-pair pilot from the same pretrained encoder,
using a fresh output directory (100 epochs is an initial budget, not an optimum):

```bash
python scripts/train_tap_alignment.py \
  --pairs data/taptamdrum-pairs-v2 \
  --groove-checkpoint artifacts/groove-encoder-v1/best.pt \
  --out artifacts/tap-alignment-v1 \
  --device cuda --epochs 100 \
  --batch-groups 16 --taps-per-group 2 \
  --tap-view hand_agnostic --progress on --log-every 10
```

`--batch-groups` counts source groups, not taps. Every selected group is visited once
per epoch, with up to two interpretations sampled by participant before choosing a
take. A final singleton group is merged into the preceding batch. Exact HVO aliases
and repeated exports of the same performance segment are one positive group; one
deterministic representative groove is used per group. The hand-agnostic view removes
pad labels but preserves all onset/velocity events from both hands. It is not a
substitute for real one-finger data. `--tap-view pad_aware` is an explicit ablation.
No style or BPM metadata is fed into either encoder.

Outputs: `run.json`, `selection.json`, `metrics.jsonl`, `best.pt`, `last.pt`,
`completed.json`, and `tensorboard/epochs` / `tensorboard/batches`. Progress and
TensorBoard are enabled by default; use the same server command documented below.
The Custom Scalars tab compares MRR against chance, onset similarity and shuffled
pairs. TensorBoard logs gradient norm, learning rate and batch contrastive loss too.

`best.pt` maximizes **validation source-group-macro MRR**, using validation loss only
to break ties. Validation uses every eligible interpretation against one candidate
per validation positive group; it is not a corpus-wide retrieval benchmark. Ties
with negatives are ranked conservatively so collapsed embeddings cannot win by
gallery order. Recall@5/10 must be interpreted alongside the 24-candidate gallery.
The diagnostics are:

- `validation`: known-source MRR, Recall@1/5/10, loss, candidate counts and embedding
  dimension variation. Contrastive loss depends on candidate count; train and
  validation losses have different candidate sets.
- `validation_chance`: analytic uniform-ranking chance on the same full gallery.
- `validation_shuffled_pairs`: fixed cyclic source-label permutation, with no fixed
  points. This is an evaluation control, not a model retrained on shuffled pairs.
- `validation_onset_baseline`: fixed velocity-weighted 32-bin onset cosine similarity;
  there are no learned parameters. A trained model needs to be compared against this
  stronger baseline, not only against chance.
- `validation_matched_style_tempo`: same parsed source style and within 10% of the
  query reference BPM. Unknown metadata or fewer than two candidates excludes a
  query from this diagnostic; coverage and candidate counts are reported. This is a
  diagnostic using reference metadata, not a deployed tap-conditioning method.

For resume, repeat the **same full-pilot command** and add
`--resume artifacts/tap-alignment-v1/last.pt`. `--epochs` is the total desired epoch
count, not an increment. Dataset/encoder hashes, training settings and alignment
code must match. Monitoring flags can change. Partial epochs restart; optimizer and
RNG states are restored, and stale TensorBoard steps are purged.

After training, share `run.json`, `completed.json` and the last five JSONL rows.
Before product use or formal evaluation we still need source overlap reservation,
participant-held-out tests, real one-finger taps and human compatibility judgments.
`load_alignment()` in `groove/representation/alignment.py` loads the tap model and
frozen encoder for inference. All corpus embeddings must be regenerated through
`model.encode_grooves(encoder, hvo)`; this also supplies measured onset features when
the groove rhythm branch is enabled. The old unprojected groove index cannot
be queried with aligned tap vectors. Index/UI integration is a separate next step.

## Alignment representation diagnostics

When longer training or a lower learning rate does not improve validation retrieval,
inspect existing checkpoints before changing the model. From `v2`, using the current
remote pairs export (its name is `taptamdrum-pairs-raw-v1`, despite containing the HVO
eligibility files):

```bash
python scripts/diagnose_tap_alignment.py \
  --pairs data/taptamdrum-pairs-raw-v1 \
  --checkpoints artifacts/tap-alignment-v1/best.pt \
                artifacts/tap-alignment-lr1e4-seed42/best.pt \
  --out artifacts/alignment-diagnostics-v1 \
  --device cuda
```

No new dependencies or pretrained-groove path are needed: alignment checkpoints
contain the frozen encoder. Each checkpoint must match the pairs fingerprint.
The original training group subset is reproduced, including `--train-group-limit`.
An output directory must be fresh; checkpoints and training files are read-only.
The diagnostic command does not modify trainer/model files. Console output defaults to a compact
summary; `--console quiet` saves files silently and `--console json` prints the report.

The script fits three fixed ridge probes **only on train groups**, including their
feature centering/scaling. Each group has equal aggregate weight. Each probe reads
its own modality's velocity-weighted 32-bin onset profile from an embedding:

- `frozen_groove`: the pretrained groove representation before alignment projection.
- `projected_groove`: the same representation after the learned projection.
- `tap`: the learned tap embedding, targeting that human tap's own onsets, not the
  source groove's onsets. This is a diagnostic, not a new tap-compression objective.

`--ridge-alpha 0.1` fixes the standardized-feature regression penalty, without
validation tuning. `report.json` includes train/validation MSE, improvement relative
to a constant train-mean predictor, cosine recovery and embedding geometry. A
negative `mse_skill_vs_train_mean` means the probe is worse than that constant on the
specified split. Probe predictions stay signed rather than clipping away errors.

Retrieval comparisons use the same within-split gallery and conservative tie ranks
as alignment training: the original `alignment` and `onset_baseline`, then human tap
onsets against decoded frozen/projected groove profiles, and decoded tap profiles
against original groove onsets. A drop specifically after projection suggests
investigating the projection/loss; poor tap readout suggests investigating tap time
features or pooling. These are hypotheses: weak linear recovery does not prove
information loss, and cross-modal retrieval depends on both sides and the gallery.
`validation-queries.jsonl` stores ranks, all tied top candidates, original tap source,
participant and group, so disagreement cases can be inspected individually.

No test examples are encoded or evaluated. Dataset-wide checksums and integrity
checks still include the shared files. Validation checkpoints have already been
selected on these same groups, and the pretraining-overlap/participant limitations
still apply. Onset reconstruction and source retrieval cannot establish perceptual
compatibility; these diagnostics do not replace listening evaluations or turn all
unmatched grooves into perceptually invalid negatives.

## One-command rhythm-branch ablation

From `v2`, run all four conditions sequentially on the remote GPU:

```bash
python scripts/run_alignment_ablation.py \
  --pairs data/taptamdrum-pairs-raw-v1 \
  --groove-checkpoint artifacts/groove-encoder-v1/best.pt \
  --out artifacts/alignment-ablation-v1 \
  --device cuda \
  --epochs 500 \
  --seeds 42 43 44 \
  --progress on
```

Defaults are **four conditions × three seeds = 12 training runs**, followed by one
diagnostic pass over every `best.pt`. `--epochs` is the budget **per run**. The
learning rate defaults to `3e-4`; numeric architecture, temperature and batch options
match `train_tap_alignment.py`. No new dependencies are needed. Each subprocess
releases its GPU resources before the next run starts. Failures stop the sequence.

The study names, in default execution order, are:

- `baseline`: the original event tap encoder and frozen groove encoder/projection.
- `groove_rhythm`: add the groove's velocity-weighted 32-bin onset profile.
- `tap_rhythm`: add the human tap's own velocity-weighted 32-bin onset profile.
- `both_rhythm`: enable both additions.

Each added branch is `Linear(32, embedding, bias=False)`, added to the normalized
base embedding and normalized again. Its weights start at zero. The base weights,
post-initialization RNG state and group/tap sampling match across conditions for a
given seed; branches learn only through the existing human contrastive loss. They
do not generate synthetic tap targets. Frozen groove weights remain unchanged.
At embedding size 128, each branch adds 4,096 parameters: this is not a
parameter-count-matched control. Groove rhythm branches require actual groove HVO,
so an old index containing only frozen embeddings is insufficient.

Choose any subset and any unique seed list, for example:

```bash
python scripts/run_alignment_ablation.py \
  --pairs data/taptamdrum-pairs-raw-v1 \
  --groove-checkpoint artifacts/groove-encoder-v1/best.pt \
  --out artifacts/alignment-ablation-smoke \
  --studies baseline both_rhythm --seeds 42 \
  --epochs 2 --train-group-limit 32 --device cuda --progress on
```

Append `--dry-run` to validate inputs/settings and print a compact study plan without
creating output or starting training (`--console json` includes all fingerprints and
settings). The full run uses the existing fixed session
split; seeds change initialization and sampling, not the dataset split. A limited
smoke run selects its train subset using the seed, consistently across conditions.

To resume, repeat the **same command with `--resume`**. The suite checks data/code,
settings, seeds and epoch budget. Completed runs are verified and skipped; a partial
run resumes from `last.pt`. An interruption after saving an epoch but before writing
its JSONL row is recovered from checkpoint metrics. An attempt interrupted before
its first checkpoint is preserved under `incomplete-attempts/` and restarted. A
process lock prevents two runners writing the same suite. Different budgets or
studies require a fresh output directory; console/progress/TensorBoard flags may
change on resume. Completed run hashes detect subsequently modified artifacts.

Outputs:

- `suite.json`: immutable study plan, settings and input/code fingerprints.
- `progress.json`: per-run status and completed artifact hashes.
- `runs/<study>-seed<N>/`: normal checkpoints, JSONL metrics and TensorBoard events.
- `diagnostics/report.json`: train/validation readout probes, retrieval and geometry
  for each best checkpoint; `validation-queries.jsonl` contains individual ranks.
- `summary.json`: each run's best epoch, MRR/Recall@1, last MRR and mean MRR over the
  final 50 epochs (or all epochs if fewer), plus mean/sample-standard-deviation
  across seeds and paired MRR differences against the same-seed baseline. With one
  seed, standard deviation is null. If baseline is omitted, paired deltas are absent.

Terminal output is one status per run, the usual progress bars, then a compact
study summary. Per-epoch JSON is still saved. `--console quiet --progress off`
suppresses normal terminal output; `--console json` prints the full final summary.
TensorBoard is on by default (`--no-tensorboard` disables it):

```bash
tensorboard --logdir artifacts/alignment-ablation-v1/runs --port 6006
```

The rhythm-branch implementation changes the trainer code fingerprint. Historical
v1 alignment checkpoints still load for inference/diagnostics; strict resume of an
old training run requires its original code. Start this suite in a new directory.
New rhythm-enabled checkpoints use `tap-groove-alignment-v2`; the loader supports
both versions. Standalone training also accepts `--rhythm-branch none|groove|tap|both`.

The comparisons are exploratory, not significance tests. Best checkpoints are
selected on the same small validation set; multiple seeds are not independent data
splits. Test examples are never encoded or evaluated. Probes for augmented embeddings
measure the combined representation, including the added explicit rhythm input.
The pretraining-overlap, participant and perceptual-compatibility limitations above
remain in force; the runner does not automatically promote a winning model.

## Progress and TensorBoard

`train_groove_encoder.py` now enables TensorBoard logging by default. Install the
updated dependencies with `python -m pip install -r requirements.lock`. To add only
the monitoring dependencies to an existing CUDA environment:

```bash
python -m pip install "tensorboard==2.21.0" "tqdm==4.70.1"
python -m pip check
```

The terminal shows overall epoch progress and a train/validation batch bar with
ETA, batch rate, processed examples, running loss and hit F1. `--progress auto`
(default) draws bars only on interactive stderr; `--progress on` forces them and
`--progress off` hides them. Progress uses the actual selected rows and batch limits.

Both `train_groove_encoder.py` and `train_tap_alignment.py` accept `--console`:

- `--console compact` (default): short startup information and one line per epoch
  with train/validation loss and F1 or MRR/Recall@1.
- `--console quiet --progress on`: progress bars only, without normal stdout output.
- `--console quiet --progress off`: no routine terminal output; errors remain visible.
- `--console json`: full run metadata and epoch JSON on stdout, as in earlier versions.

Full `run.json`, `metrics.jsonl`, checkpoints and enabled TensorBoard events are saved
in every mode. `--log-every` controls TensorBoard batch frequency, not terminal JSON.
Console mode can change when resuming with the same trainer code. As with other
trainer edits, older checkpoints still require their original trainer revision to
pass the strict code-hash resume check. There is no need to interrupt a running job
for a display change. With the older code, appending `>> training-console.log` to a
new command also keeps its stdout in a file while stderr progress/errors stay visible.

TensorBoard files live inside each run:

- `tensorboard/epochs`: epoch steps; train/validation loss, hit BCE, velocity/offset
  losses, hit F1, masked hit/rest counts, example counts, baseline and shuffled-input
  metrics, and epoch compute time (excluding checkpoint saving). The Custom Scalars
  tab overlays loss and F1 comparisons. `context/shuffled_minus_real_loss` is positive
  when real groove context improves loss; it is not a perceptual compatibility score.
- `tensorboard/batches`: optimizer steps; individual training-batch metrics every
  `--log-every 50` batches (default) and at the last batch of each epoch, learning
  rate and gradient norm before clipping. These are batch values, not epoch averages.
- Run settings/environment/provenance appear under Text. Epoch scalars use the
  exact aggregations stored in `metrics.jsonl`. Test data is not evaluated.

For subsequent runs, existing training commands need no additional flags. Use a
fresh `--out` directory; optionally add `--progress on --log-every 10`. To disable
TensorBoard, pass `--no-tensorboard`; JSONL and checkpoints are still saved.

In a second terminal on the remote computer, activate the same venv and run:

```bash
tensorboard --logdir artifacts --host 127.0.0.1 --port 6006
```

Open `http://127.0.0.1:6006` in the **remote computer's browser via AnyDesk**.
Select the relevant run(s), then Scalars or Custom Scalars; epoch and batch streams
have separate step axes. This command does not expose a public server. With SSH
access, `ssh -N -L 6006:127.0.0.1:6006 USER@HOST` also makes it accessible from a local
browser without changing the binding.

Monitoring switches can change on resume without invalidating the training
identity. Writers flush each epoch and close even on interruption. Resume removes
stale TensorBoard points after the last checkpoint, separately for epoch and batch
steps. Data/model/trainer code checks remain strict: **checkpoints created before
this trainer update cannot resume under the new code hash**. Use the original code
revision for that continuation. Existing checkpoints still work for indexing and
existing JSONL logs can be visualized without training again.

### Visualize a completed run that predates TensorBoard

```bash
python scripts/export_training_tensorboard.py \
  --run artifacts/groove-encoder-v1

tensorboard --logdir artifacts/groove-encoder-v1/tensorboard-history \
  --host 127.0.0.1 --port 6006
```

The exporter reads `run.json` and `metrics.jsonl`, then creates a new
`tensorboard-history/epochs` directory. It does not load a model, cache or dataset,
and leaves existing logs/checkpoints unchanged. Only recorded epoch metrics are
available; historical batch metrics cannot be reconstructed. Malformed or
non-monotonic history is rejected before output is created. For another export,
use `--output PATH` with a fresh directory; existing output is never overwritten.
