# Real human mono-contour benchmark

This is the small real-human benchmark preceding any long closed-loop training.
It compares metre, onset density, FWOD and local source shapelets for predicting
human **onset selection** and **velocity conditional on an onset**. It also tests
known-source retrieval from a real tap using the fitted response model. It does
not generate grooves, train the existing solo scorer, or promote a checkpoint.

Source: [Gómez-Marín et al. (2026)](https://journals.sagepub.com/doi/full/10.1177/20592043261466428),
the [shared analysis notebooks](https://drive.google.com/drive/folders/151i4-XbOheyvGa5W-eGhUrpLMDNGmUQO),
and their [upstream code/data repository](https://github.com/peter-clark/investigating-human-tapping-behavior-polyphonic-rhythms).
The dataset snapshot is pinned to `e2a1590bb137c7284e8a78946470be07a032338c` and
the ZIP SHA-256 is embedded in `source.py`. The upstream GPL-3.0 license is retained
with the downloaded files. No upstream code is imported or executed. Only a
literal mapping table is parsed, and a restricted unpickler reads primitive LMH
lists for an audit; it rejects executable globals. No raw upstream data is checked in.

## Run from v2

Use the existing `.venv`; no additional dependencies are required. Every command
requires a fresh output directory. The installed applications, datasets and
checkpoints are untouched.

```sh
.venv/bin/python -m research.solo_tapping.human_benchmark fetch \
  --output research/solo_tapping/human_benchmark/data/source-e2a1590

.venv/bin/python -m research.solo_tapping.human_benchmark prepare \
  --source research/solo_tapping/human_benchmark/data/source-e2a1590 \
  --output research/solo_tapping/human_benchmark/data/verified-v2

.venv/bin/python -m research.solo_tapping.human_benchmark run \
  --data research/solo_tapping/human_benchmark/data/verified-v2 \
  --output research/solo_tapping/human_benchmark/runs/my-pilot \
  --seed 42 --folds 4 --motifs 8 --ridge .01 --bootstrap 1000
```

`fetch --archive /path/to/pinned.zip` verifies and imports an already downloaded
ZIP offline. Existing matching source/data directories can be reused by later
commands, but never overwritten. Fetch fails if the archive checksum changes.

## What the pairing audit establishes

Trials are read from `tapexplore.csv` using its explicit, validated positional
schema: the header omits an ID field present in each data row. We join by source
ID and participant block, never by repeating a flattened feature array against
the human rows. We verify against `patterns_by_subject_[ORDERED].csv` and
`raw_subjects.csv`, including the first/repeated control presentations.

Source verification combines the explicit ID in the selected MIDI filename, the
trial source name, the numeric crop tag, the named original parent file, and the
onset support in the source contour logged alongside each human trial. All known
segments of a named parent share a split group; exact LMH aliases also merge groups.
This verifies consistency of the released pairing evidence. It does **not** certify
the original audio playback, exact parent MIDI crop, percussion timbre, or physical
force calibration. The selected MIDI files are the documented feature authority
for this benchmark, not interchangeable with the full parent files.

The audit excludes whole ambiguous sources/participant blocks instead of creating
missing targets or choosing one contradictory record. On the pinned snapshot:

- Source **143**: selected MIDI onset support disagrees with every logged source
  support for that ID.
- Source **1043**: selected MIDI filename identifies crop **136**, while the trial
  name identifies crop **138**, despite matching onset support.
- Participant block **11** (zero-based): source 143 occurs twice and source 912 is
  missing. The entire block is quarantined; it does not become a zero-tap example.
- The published primitive LMH dictionary disagrees with recomputed selected-MIDI
  LMH counts for all 16 source IDs. It is audited, not used for features or labels.

The stricter audit retains **14 sources / 8 named source families / 42 participant
blocks / 14 recording dates**, with **588 primary pairs** and **84 retest pairs**.
All exclusions and their original CSV line numbers are saved. No participant is
excluded for performing poorly on a control; the only block exclusion is structural.

The completed seed-42 run is summarized in
[human-benchmark-validation.json](../evidence/human-benchmark-validation.json).
With both source families and participant/date groups held out, onset BCE (lower
is better) was **.6310 metre**, **.5750 onset density**, **.5657 FWOD**,
**.5584 metre+onset+FWOD**, and **.5568 shapelet**. The paired source-cluster interval
for shapelet minus the combined baseline was **[-.00510, .00218]**. This does not
establish a robust shapelet advantage. All 240 models converged; all 245 saved-file
hashes and 768 dictionary exemplars were verified, and 216 project tests passed.
The earlier `verified-v1` / `pilot-seed42` artifacts remain preserved locally but
predate the source-1043 quarantine; use `verified-v2` and `pilot-seed42-v2` results.

Participant IDs are **proxies**: the upstream notebook treats each consecutive
18-trial block as a participant. Agreement with its ordered derivative supports
that convention, but no independent participant registry is available here.
Recording date is a conservative session proxy. A participant appearing in
multiple blocks/dates cannot be ruled out. Do not claim certified person-disjoint
generalization from these identifiers.

## Representation and hypotheses

These observations contain **one bar, 4 quarter-note beats, 16 sixteenths**, on a
fixed metrical phase. Tap values are original normalized MIDI velocities in [0,1];
zero means no onset. We retain this length explicitly and never repeat a bar into
two-bar ground truth, treat a two-hand union as a performed solo, or fabricate
microtiming. The tap tables have no within-step timing observations. Pad/finger/hand
technique is not established by the single stream. The study's nominal 120 BPM is
context; the unexplained CSV BPM field is not used as stimulus tempo or a feature.

The selected source MIDIs contain non-nine-voice percussion and channel-1 events.
This adapter uses their explicit experimental provenance and the upstream mapping;
it does not relax v2's generic MIDI detector or 32x9 HVO export contract. Original
MIDI bytes and decoded beat/velocity/pitch/channel events remain available.

Descriptors per step are:

- Pure metre: v2's `[4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0]/4`, **without** onset masking.
- Onset density: number of simultaneous mapped instruments, divided by the
  pattern's maximum. This is explicitly density, not binary onset presence.
- FWOD: `(3*low + 2*mid + high) / pattern_max`. Instrument-band assignments and
  3:2:1 weights are fixed assumptions, not measured spectra or learned human weights.

The two peak normalizations are fixed descriptor definitions, not dataset-fitted
scalers. Learned centering/scaling always uses training observations only.

All conditions use identical regularized heads: logistic onset probability and
ridge regression for velocity, fitted **only at observed human hits**. Conditional
velocity predictions are clipped to [0,1]. There is no per-person normalization
using held-out responses. This is a predictive hurdle baseline, not the paper's
mixed-effects statistical analysis or a perceptually calibrated likelihood.

Conditions: constant, metre, onset, FWOD, metre+onset, metre+FWOD,
metre+onset+FWOD, local-linear, shapelet, and shapelet with shuffled training pairs.

Shapelets add RBF responses to train-only source medoids in ordered cyclic
4-/8-step windows centered at each step. These windows contain onset density and
FWOD; the pure metrical reference remains an explicit base feature. There is no
minimum over shifts or temporal sorting. Each bank saves its scaler, actual
training-source exemplars and center steps. Human responses train the two heads;
this source-dictionary baseline is distinct from the existing paired 2-ch scorer
and from Ye/Keogh's class-discrimination trees.

Local-linear receives the **same ordered window contents** without a prototype
dictionary. It tests whether any benefit comes simply from additional context.
Parameter counts differ, so this is not a capacity-matched architecture study.
The shuffled model assigns each training source a different-family source's
responses from the same participant, retaining phase and motor differences.
Held-out data never supplies dictionaries, scalers, donor responses or hyperparameters.

## Splits, metrics and outputs

With four folds, the run fits 240 small models over 24 partitions:

1. **Source:** hold out named parent families; participants can be shared.
2. **Participant/session:** hold out date groups, keeping every block on a date
   together; source patterns are shared.
3. **Crossed:** hold out source families and date groups simultaneously. Off-diagonal
   pairs are excluded from training. Each primary pair is evaluated once per regime.

Groups are assigned before constructing local windows. All interpretations of a
held-out source remain together in source/crossed regimes. Retest performances
never train or select any model: they produce a separate consistency report.
All models are fit from scratch; no historical groove-pretraining checkpoint is
used. Overlap of those unrelated checkpoints remains uncertified.

Primary outcomes are onset BCE/Brier, velocity MAE conditional on human hits, and
expected-contour MSE. Aggregate metrics give equal weight to source families, then
source patterns, then human responses. A one-sixteenth source shift, with metre
fixed, is an additional phase diagnostic.

Secondary retrieval scores combine onset BCE and a Gaussian velocity residual
term whose scale is estimated only on training hits. Galleries contain fold test
sources, collapse exact LMH aliases and exclude other segments of the known parent.
The known source is a positive; other sources are **not** proven perceptual negatives.
Uniform tie expectations make a collapsed model equal analytical chance. Always
report candidate counts and chance: source/crossed galleries are particularly small,
and MRR values across regimes are not directly comparable.

Paired bootstrap intervals separately resample source-family and recording-date
clusters. They condition on the other grouping axis and use their stated equal-cluster
estimand; they are not full crossed-effects inference or confirmatory significance tests.
The number of source families is only eight. Hyperparameters are fixed, with no
model selection or early stopping on held-out data. This is exploratory CV, not an
untouched external test; repeated use for development would require a new validation plan.

Outputs include data/code hashes, exact folds and record IDs, every fitted model,
per-query predictions/scores, primary metrics, paired deltas, and retest agreement.
`completed.json` hashes all saved files; absence of that marker means an incomplete
run. `summary.json` is the main result. Raw data and full runs are ignored by git;
the compact checked evidence is linked from the research workspace README.

Passing software tests does not validate a listening preference, single-hand
playability, 1-ch → full-groove generation, or transfer from EDM to expressive GMD.
Do not use this pilot alone to authorize long self-training or declare shapelets
superior. A new human evaluation remains necessary for those claims.

```sh
.venv/bin/python -m pytest -q research/solo_tapping/tests/test_human_benchmark.py
```
