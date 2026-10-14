# Implementation prompt: remote-runnable generator training + tap-conditioned generative QD

You are implementing a new work package in `v2/` of the 2groove2 repository. The
goal of the package: **train a groove generator on the combined unified corpus and
implement tap-conditioned generative MAP-Elites/QD** — given a human tapping input,
search for full drum grooves that maximize the learned tap–groove compatibility
while covering a behaviour space. This realizes step 6 of [CONTRASTIVE.md](CONTRASTIVE.md)
("Generative QD") and the "improve the generative distribution" + "QD and
customization gate" sections of [ROADMAP.md](ROADMAP.md).

Everything you produce must be **runnable on the remote GPU machine** (Linux,
CUDA, Python 3.12, the `v2` venv) with copy-paste commands, while all tests and
smoke paths stay runnable on CPU. You implement and test locally; the heavy runs
happen remotely. Do not start multi-hour trainings yourself.

## Read before writing code

- [CONTRASTIVE.md](CONTRASTIVE.md) — especially steps 4–6, the trainer command
  conventions, and the alignment checkpoint contract.
- [ROADMAP.md](ROADMAP.md) — "Next: improve the generative distribution" and
  "QD and customization gate".
- `groove/representation/alignment.py` — `load_alignment(path, device)` returns
  `(model, frozen_encoder, state)` for both `tap-groove-alignment-v1` and `-v2`
  (rhythm-branch) checkpoints. **All groove embeddings for scoring must go through
  `model.encode_grooves(encoder, hvo)`** with the actual HVO tensor; `project_grooves`
  deliberately raises on wrong inputs, and rhythm-branch checkpoints need measured
  onset profiles from the real HVO. Never score a mutated candidate with a stale
  embedding: re-encode the decoded output.
- `groove/representation/retrieval.py` — static cosine retrieval + per-cell archive
  with descriptors `[N,2]` = (density ∈ [0,12], syncopation proxy ∈ [0,1]) and its
  binning. This is the seeding source and the descriptor/cell convention the QD
  archive must stay comparable with. Reuse the exact descriptor implementation the
  index pipeline uses (see `scripts/index_grooves.py` and its helpers); do not
  re-implement a slightly different syncopation.
- `research/solo_tapping/search.py` — the existing event-genome MAP-Elites with a
  matched-budget random baseline (reverse direction, groove→1-ch). Reuse its
  *patterns* (archive bookkeeping, matched budgets, restart probability, provenance)
  but do not couple the new package to `research/` code; the new module lives under
  `groove/`.
- `scripts/train_groove_encoder.py`, `scripts/train_tap_alignment.py`,
  `scripts/run_alignment_ablation.py` — the trainer contract you must follow:
  `run.json` with identity hashes (input hashes, settings, `code_sha256`), strict
  resume checks (same data/code/settings; `--epochs` is a total, partial epochs
  restart, optimizer/RNG restored), fresh `--out` directories, `metrics.jsonl`,
  `best.pt`/`last.pt`/`completed.json`, TensorBoard `tensorboard/epochs` +
  `tensorboard/batches`, `--console compact|quiet|json` and `--progress auto|on|off`
  flags, explicit `--device cuda` failing when CUDA is absent, and **no test-split
  data ever touched by fitting or checkpoint selection**.
- Frozen baselines you must not modify: `groove/generation.py` (legacy app CVAE
  decoders + fixed-context MAP-Elites), `artifacts/cvae.pt`, `scripts/train.py`.
  New code goes in new modules.

## Data and checkpoints on the remote machine

- `data/2groove2-hvo-mmap` + `artifacts/pretrain-plan` — the prepared cache/plan
  over the unified fill-aware corpus (same passed audit; the groove encoder was
  pretrained from these). Default selection = **original train windows (~5.6k)**;
  `--include-synthetic` exposes the ~98k synthetic groove+fill compositions.
  Beware the synthetic fill-label skew (train: 94,981 fill-present vs 4,482
  groove-labelled): synthetic inclusion is an explicit, flagged ablation, never
  the silent default.
- `data/taptamdrum-pairs-raw-v1` — current pairs export **with** `hvo_eligible`
  files (571 train / 80 validation eligible taps over 163/24 positive groups;
  the 93 eligible test taps stay untouched).
- `artifacts/groove-encoder-v1/best.pt` — pretrained masked-HVO groove encoder.
- `artifacts/tap-alignment-v1/best.pt` and, once the pending ablation suite has
  run, `artifacts/alignment-ablation-v1/runs/<study>-seed<N>/best.pt`. The QD
  package must accept **any** v1/v2 alignment checkpoint path as an argument and
  record its hash; it must not hardcode a winner (none has been promoted).

Local smoke equivalents exist (`artifacts/encoder-lucerne-*`,
`artifacts/alignment-local-pilot`); use them for development, never present them
as results.

## Deliverable 1 — groove generator training (`groove/generator/`, `scripts/train_groove_generator.py`)

A compact latent-variable generator over 32×9 HVO windows, trained on the unified
corpus through the existing cache/plan (`--cache data/2groove2-hvo-mmap --plan
artifacts/pretrain-plan`), mirroring the pretraining data selection semantics.

- **Architecture**: Transformer encoder → diagonal Gaussian latent (default 64
  dims) → Transformer decoder reconstructing hits/velocities/offsets. Stay near
  the pretraining baseline scale (hidden 128, 3 layers, 4 heads) — matched-compute
  modesty, not a new large model. All dims CLI-configurable and recorded.
- **Losses**: hit BCE balanced between positive and negative cells (as in
  pretraining), velocity/offset losses only on true hits, KL with **free bits**
  (configurable nats/dim, default documented) and an optional cyclical-annealing
  flag. ROADMAP explicitly asks these before any model-size increase.
- **Diagnostics** (per epoch, in `metrics.jsonl` + TensorBoard): validation
  posterior reconstruction; prior-sample diagnostics on a fixed budget — unique
  pattern rate, density/syncopation coverage histogram against the train
  distribution, active latent units (KL > 0.01), per-dimension KL; hit-threshold
  sensitivity (decode at several thresholds, report density/F1 sweep). These are
  the "narrow decoder" checks ROADMAP requires; MAP-Elites on top of a collapsed
  decoder is explicitly called out as not a fix.
- **Gates** (tests): finite gradients, tiny-set overfit, resume equivalence
  (CPU), determinism given seed, cache/plan hash verification, no test tensors
  opened. CUDA smoke command documented (2 epochs, small limits) before the full
  run.
- **Default run**: originals-only, uniform shuffle, original-only validation for
  checkpoint selection. Provide one documented `--include-synthetic` ablation
  command with the sampling-plan caveat from CONTRASTIVE.md.

## Deliverable 2 — aligned corpus index rebuild

Extend `scripts/index_grooves.py` (or add a sibling script, whichever is cleaner
given its current structure) to build an index whose vectors are produced by
`model.encode_grooves(encoder, hvo)` from a given alignment checkpoint. The index
metadata must fingerprint the alignment checkpoint and state that it supersedes
the `groove-pretraining-not-tap-aligned` index for tap queries. Keep descriptors
and provenance columns identical so `retrieval.search` works unchanged. Mixing
vectors from different projections must be structurally impossible (fingerprint
check at query time).

## Deliverable 3 — tap-conditioned generative QD (`groove/qd/`, `scripts/qd_tap_search.py`)

Given: a tap query, an alignment checkpoint, the aligned index, and optionally a
generator checkpoint.

- **Tap input**: (a) by pair/tap ID from the pairs export (validation taps for
  evaluation), and (b) a minimal MIDI tap adapter for real recorded taps — raw
  continuous events, no first-onset alignment, no hard quantization, no silent
  tempo default (consistent with the TapTamDrum adapter rules).
- **Seeding**: static retrieval over the aligned index (`retrieval.search` top-K
  + archive cells, corpus HVOs as initial genomes), plus optional generator prior
  samples. Seeds are recorded with provenance (corpus row vs prior sample).
- **Two mutation operator families, compared under matched budgets**:
  1. `events`: bounded HVO event ops — add/remove hit, velocity jitter, offset
     jitter, voice move, step shift — with validity checks (velocity/offset
     ranges, non-empty output).
  2. `latent`: encode elite through the generator posterior mean, perturb z with
     configurable sigma, decode, threshold. Requires the generator checkpoint;
     `events` must work without it.
- **Quality**: cosine between the tap embedding and the **re-encoded actual
  candidate HVO** via `encode_grooves`. Invalid candidates are rejected, not
  clipped. Label the score everywhere as a learned compatibility *proxy*, not a
  perceptual quantity.
- **Archive**: density × syncopation with the exact bounds [0,12] × [0,1] and the
  same binning as retrieval/index descriptors, so static-archive, QD and random
  cells are comparable. Out-of-bounds/non-finite descriptors reject the candidate.
- **Baselines under identical budgets, decoding and constraints**: matched-budget
  independent random search (both operator families) and retrieval-only (no
  mutations). Deterministic given seed; default ≥3 seeds.
- **Mandatory exploitation controls** (the solo-tapping line showed the optimizer
  will exploit the scorer; assume the same here):
  - onset-copy analysis: overlap of elite onsets with tap onsets vs the human
    paired groove's overlap;
  - velocity/density inflation statistics relative to seeds and the human pair;
  - shuffled-tap control: elite quality against mismatched taps;
  - elites-vs-human margin: fraction of queries where any elite outscores the
    true paired groove (report it as a red flag, not a win).
  Write these per query as JSON evidence, mirroring the
  `research/solo_tapping/evidence/` style.
- **Outputs**: archive + provenance JSON, per-elite HVO, MIDI export of selected
  elites for listening, `run.json` with all fingerprints (alignment ckpt,
  generator ckpt, index, pairs export, code hash, seeds, budgets).

## Deliverable 4 — evaluation harness (`scripts/evaluate_qd.py` or a subcommand)

Run the full comparison over all eligible **validation** taps (80 taps / 24
groups; test taps are never encoded): MAP-Elites-events vs MAP-Elites-latent vs
random vs retrieval-only, equal budgets, ≥3 seeds. Report per ROADMAP's QD gate:
coverage, QD score, within-cell diversity, duplicate rate, constraint-failure
rate, wall-clock, mean/CI of best quality, plus all exploitation controls above.
Single `report.json` + human-readable summary. No promotion logic: the harness
describes, the listening study decides.

## Deliverable 5 — docs, tests, hygiene

- `GENERATIVE_QD.md` at `v2/` root: what the package is, its limitations, and the
  ordered **remote commands** (venv activation assumption, pytest, CUDA check,
  generator smoke → full run → index rebuild → QD smoke → evaluation), including
  resume commands. Follow the voice and caution level of CONTRASTIVE.md.
- Update the step-6 line of CONTRASTIVE.md and the relevant ROADMAP section with
  one-paragraph pointers (do not rewrite those documents), and add a short status
  line to SYNOPSIS.md.
- Tests in `tests/test_generator.py` and `tests/test_qd.py` (CPU, fast):
  generator shapes/losses/tiny-overfit/resume/determinism; QD archive binning and
  bounds, operator validity, budget parity enforcement, seed determinism, the
  re-encode path (direct `project_grooves` misuse raises), rejection of mixed
  projection fingerprints, no-test-data guards. `python -m pytest -q` must pass
  entirely (currently 223+ tests).
- A frozen validation artifact at `v2/qd-validation.json` produced by a scripted
  local smoke (tiny budgets, local pilot checkpoints), following the existing
  `*-validation.json` pattern.
- No new dependencies beyond `pyproject.toml` unless genuinely necessary; if one
  is added, pin it and update `requirements.lock`.

## Sequencing on the remote machine (document this in GENERATIVE_QD.md)

1. The pending alignment ablation suite (`scripts/run_alignment_ablation.py`
   command in CONTRASTIVE.md) is a prerequisite for *meaningful* QD quality, but
   not for implementing or smoke-testing this package — `tap-alignment-v1` serves
   as the placeholder checkpoint.
2. Generator training is independent of alignment → it can run in parallel on
   the same machine if VRAM allows; otherwise sequentially.
3. Aligned index rebuild after an alignment checkpoint is chosen for use (chosen
   ≠ promoted; record which one and why).
4. QD runs + evaluation harness last; send back `run.json`s, `completed.json`s,
   `report.json`, a handful of exported MIDI elites, and the last lines of each
   `metrics.jsonl`.

## Out of scope — do not implement

Conditional Transformer / discrete diffusion comparison (matched-budget future
work), RL, personalization/preference learning, valence–arousal, live/causal
generation, any perceptual or generalization claim. Participant-held-out and
pretraining-overlap limitations from CONTRASTIVE.md apply verbatim to everything
here; repeat them in the docs rather than weakening them.

## Working style

Work through the deliverables in order; keep commits small and buildable. Match
the repository's existing code style (compact, defensive validation, explicit
provenance). When an existing helper covers a need (descriptors, HVO decoding,
MIDI export, archive bookkeeping), find and reuse it instead of re-implementing.
If you find a factual mismatch between this prompt and the code (paths, counts,
formats), trust the code and note the discrepancy in your summary.
