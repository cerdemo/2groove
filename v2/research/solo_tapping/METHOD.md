# Full groove → 1-ch tapping research pilot

This offline research path learns local compatibility from real full-groove /
human two-channel TapTamDrum pairs, then searches for new one-channel streams.
It does not use style labels, the CVAE, a pretrained groove encoder, or RL.
The existing application and `groove/generation.py` remain their separate
tap → full-groove baseline. The new entry point is `scripts/solo_tapping.py`.

**Research hypothesis, not an established result:** local rhythmic compatibility
learned from human two-channel interpretations transfers to generated one-channel
interpretations. Neither the union of two hands nor an isolated hand is real solo
ground truth. There is no human solo or perceptual validation in this pilot.

A separate [real mono-contour benchmark](human_benchmark/README.md) now audits
Gómez-Marín et al.'s released human data and compares metre/onset/FWOD/shapelet
response prediction with source and participant/session holdouts. Its 588 primary
pairs are one-bar grid observations without microtiming or verified hand technique.
It does not validate this pilot's 2-ch-to-1-ch transfer or conservation score.

## Local verification — 2026-10-13

[initial-validation.json](evidence/initial-validation.json) records the actual runs and limitations.
All **195 tests** passed, including 11 new solo tests. On the real raw export,
training used 225 source groups / 743 interpretations; validation used 51 groups /
172 interpretations. Conservation MRR was **.240**, learned compatibility **.241**,
and the onset baseline **.518**. With tempo/density-matched candidates, conservation
MRR was **.524** versus onset **.740**, over 170 queries and a source-macro mean of
8.92 candidates. This first learned model has **not** passed the retrieval gate.

The supplied groove corpus manifest yielded 22 exact HVO matches to TapTamDrum,
including 9 held-out matches. Session/performance mapping coverage in that manifest
is partial. The new local model uses no pretrained encoder, and this corpus audit
does not establish which rows any existing encoder checkpoint consumed.

For validation sources 19/24/25, seed 42 and 256 evaluations per algorithm, both
searches completed and 106 elite MIDI files passed onset/velocity/channel/length
round-trip inspection. MAP-Elites had greater coverage/QD score on these three
contexts, but this is a bounded execution check on an optimized proxy, not human
evidence or a multi-seed benchmark. The raw artifacts are in
`artifacts/solo-local-20261013-final/` and `artifacts/solo-search-20261013-final/`.

Shortcut diagnostics remain consequential: zeroing microtiming improved the source
copy's score in all three contexts; source 25's one-step shift and reversal also
outscored its unaltered source copy. These synthetic comparisons do not establish
which solo interpretation humans prefer, but expose timing/phase weaknesses that
must be investigated before using this score as a preservation measure. No weights
were retuned to make these observed controls pass.

## Run

From `v2`, with the existing environment and the current verified pairs export:

```sh
.venv/bin/python scripts/solo_tapping.py fit \
  --pairs data/taptamdrum-pairs-raw-v1 \
  --out artifacts/solo-local-v1 \
  --motifs 16 --iterations 300 --seed 42 \
  --pretraining-manifest data/unified-hvo-fill-aware-final/manifest.jsonl

.venv/bin/python scripts/solo_tapping.py search \
  --pairs data/taptamdrum-pairs-raw-v1 \
  --model artifacts/solo-local-v1/model \
  --out artifacts/solo-search-v1 \
  --split validation --budget 512 --seed 42 --technique finger

.venv/bin/python -m pytest -q tests/test_solo.py
```

Every output directory must be new. Inputs and previous artifacts are read-only.
Training and search require no new packages and run on CPU. The fit command uses
all training groups and evaluates validation only. Test events are checked for
artifact integrity/leakage, but never used to fit parameters or compute retrieval.
There is no automatic selection or promotion of a checkpoint on validation results.

Search defaults to every source group in the chosen split, making **two separate
archives per source** (MAP-Elites and random). Use `--limit 3` for a bounded smoke
run, or `--groups 12 28` for explicitly selected group IDs from the model/report.
Use `--fixed-velocity --quantized` for occupancy-only genome edits, with velocity .8
and zero offsets. The default also enables velocity and microtiming edits.
`--min-interval-ms` and `--max-hits-per-second` override the technique defaults.
The Python `Playability` configuration also exposes a cyclic velocity-jump limit.

`fit` writes the model/scalers/dictionaries in `model/model.npz`, their metadata
and checksum in `model/model.json`, `audit.json`, `validation.json`, per-query scores
in `validation-queries.jsonl`, and a completed `run.json` with code/data hashes.
`search` writes `comparison.json`, then `source-<id>/source.json`, synthetic scorer
controls, and per-algorithm `archive.json`, `evaluations.jsonl`, and one MIDI per elite.
The evaluation log includes **every proposed genome**, its parent, edit, rejection
reasons, descriptors and complete score breakdown, including unsuccessful proposals.

## Representation contract

Quarter-note beats remain in `[0,8)`, two bars of 4/4. A generated stream is
`[32,3]` occupancy/velocity/offset with one event at most per sixteenth. Velocity
is `(0,1]`; offset is a fraction of a sixteenth, initially bounded to ±.45.
Decode as `((step + offset) / 4) % 8`, including pickups at grid step zero.
MIDI uses the existing v2 `Pattern`/`Note`/`midi_bytes` implementation: 960 PPQ,
one GM snare pitch on channel 10, tempo and 4/4 metadata, full eight-beat EOT.

Raw full grooves and both human hands remain in the original files. The shared
analysis view takes a **temporal evidence union** at each grid step: occupancy,
loudest velocity and that event's offset. Equal-velocity ties use earliest raw
beat, independent of channel ordering. Each time step has one contribution, so
duplicating an event through several instrument-family pairs cannot increase it.
This deliberately loses multiplicity and quieter colliding events, including
flams; the audit reports this reduction. It is not a new performed mono target.
Unlike HVO alignment, this event path can use collision-heavy raw originals too.

Windows start every beat and span 1, 2 or 4 beats (4/8/16 steps), wrapping around
the loop. There is no first-onset alignment, per-example normalization, free
warping, sorting of events into a bag, or phase-invariant minimum in the optimized
match. The six ordered feature channels are:

- onset occupancy;
- maximum velocity;
- hit-masked residual offset;
- signed velocity/metre-reference strength ratio, `(v-m)/(v+m)` (zero if both zero);
- locally accumulated velocity, divided by window width;
- locally accumulated fixed metre-reference strength, divided by window width.

The last three are explicit **metric-reference analogues** of METER/DOT.
They are not the previous two-voice glyph geometry and do not implement its
400 ms rate extractor. Full/2-ch/1-ch all use this same temporal/metre definition.
The fixed reference is `[4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0]/4` in each bar.
Instrument/hand roles are not modeled in this first baseline; swapping hand labels
does not change features. Held-out performance and expressivity ablations must
decide whether this loss of information is acceptable.

## Learned local compatibility

This is a paired prototype/kernel baseline inspired by the local-subsequence idea
in [Ye and Keogh's shapelet paper](https://www.cs.ucr.edu/~eamonn/shaplet.pdf),
not its exhaustive class-discrimination tree algorithm.

At each scale, training-only paired groove/tap windows fit a shared scaler and
weighted k-means dictionary, followed by actual training-pair medoid selection.
Every source group has equal aggregate weight regardless of its number of human
interpretations. All interpretations are positives; their templates remain distinct.
Exact aliases and repeated performance segments form one positive group. Copied
participant/condition files are deduplicated within a group. Exemplars retain their
source, human performance, participant and start step.

For each motif, source and tap similarities are `exp(-standardized_MSE/2)`.
Their product averaged across aligned windows is a compatibility feature. A fixed
budget of weighted logistic fitting learns coefficients from all observed positives
and two unrelated-source human negatives per positive: one random and one sampled
from a tempo/density-matched pool if available, otherwise random. Known common
source performances are excluded from negative pools. Positive and negative mass
are balanced, then balanced across sources. These are weak source-mismatch labels,
not proof that an unmatched human interpretation is perceptually incompatible.

Scalers, dictionary exemplars, feature scales and coefficients are fitted **only
on train**. Style labels are never consumed by fitting, scoring or search. BPM and
density define negative pools/evaluation strata, not classifier inputs. Fitted
coefficients are converted to nonnegative motif importance by `.1 + max(0,w)`;
negative evidence still enters the separate learned compatibility term.

## Conservation score and shortcut controls

For a fixed full groove, normalize its motif activations × learned importance to
get a source-conditioned distribution over human response shapelets at each window.
Weighted retention is the expected similarity of the candidate to those responses.
Allocate each source onset's contribution across overlapping windows by inverse
coverage; normalize across the three scales. Total evidence weight is one. There
are no family-pair votes and no extra reward for covering the same event repeatedly.

Fold the response templates' occupancies into a source-conditioned onset-support
profile, again dividing by overlap. Incompatible additions are mean `1-support`
at candidate onsets. Density excess is `max(0, candidate_count-expected_count)/32`.
Thus adding notes earns neither a direct density bonus nor a source-onset-copy bonus.

Phase loss compares aligned support with all 32 cyclic onset shifts and also
compares aligned motif matches with coherent cyclic window reassignment. Order loss
is the gain from independently reassigning each window beyond the best coherent
cyclic window reassignment. These are bounded diagnostic proxies: cyclic/window
tests do not exhaustively characterize all ordering or expressive-timing errors.
Velocity and microtiming discrepancies additionally affect the ordered local match.

The fixed initial scalar (v1 defaults) is:

```text
raw_quality = .5 * weighted_retention + .5 * learned_compatibility
              - .3 * incompatible_additions - .2 * phase_loss
              - .2 * order_loss - .25 * density_excess
quality = clip(raw_quality, 0, 1)
```

Two step-3 feature flags respond to the 2026-10-13 diagnostics and are recorded
in the model card (`fit --no-offset-channel --onset-term none|expected|source`):

- `offset_channel=False` removes the hit-masked offset feature from fitting and
  scoring, closing the systematic microtiming exploit. Residual timing then
  affects playability constraints only, not quality.
- `onset_term` adds a velocity-profile cosine between the candidate and either
  the human-conditioned expected profile (`expected`) or the raw source
  (`source`, an explicit onset-copy-risk ablation). With a term enabled, the
  positive weights become `.35/.35/.3`; penalties are unchanged. These remain
  declared engineering choices, not human-fitted preferences.

Non-default flags report `score_version: conservation-v2`. Checkpoints without
a `features` card entry are exactly the v1 configuration and still load.

The matched-budget comparison of v1, `no_offset`, `no_offset+expected` and
`no_offset+source` (motifs 16, iterations 300, seed 42) is summarized in
[score-redesign-20261013.json](evidence/score-redesign-20261013.json). Removing
the offset channel closes the microtiming exploit (0/51 raised scores, from
51/51) at no retrieval cost (.253/.554 vs .240/.524 MRR). The source onset term
yields the best known-source retrieval (.415/.666) and removes phase violations,
but raises source-copy dominance over every real human tap to 23/51 sources —
the onset-copy degeneracy the master plan requires controlling. The expected
(human-conditioned) term is intermediate on both axes, and its alignment signal
(.358/.626) is weaker than the raw source profile (.518/.740), consistent with
the human benchmark's weak-shapelet result. Every condition remains below the
onset baseline, so the retrieval gate stays failed; no model is promoted, and
any onset term in a search objective requires search-time controls and human
judgments, not retrieval evidence alone.

An empty candidate has zero retention/learned compatibility and is infeasible.
Every evaluation saves all six terms, raw/clipped quality, expected/onset counts
and local contributions. Logistic output is not a calibrated perceptual probability.
Scalar weights are declared engineering choices, not human-fitted preferences.

Synthetic source-onset copy, density-matched even pattern, saturation, one-step and
one-beat phase shifts, reversal, flattened velocity, zero timing and empty controls
are saved alongside each source search. Passing these controls on a fixture does
not guarantee immunity to scorer exploitation on real grooves. No artificial view
is labeled a human solo target. Search score increases are optimizer diagnostics.

Each search additionally writes `<algorithm>-copy-analysis.json` per source:
onset precision/recall/Jaccard of every elite toward the source onset set, the
best elite's copy structure, whether the best elite's raw quality reaches the
best real human tap, and the within-archive quality–precision correlation.
Onset structure is comparable across scorer conditions; quality values and QD
scores are not, because each condition defines its own scalar.

The 51-source validation control (budget 512, seed 42, both algorithms, four
scorer conditions) is summarized in
[search-copy-control-20261013.json](evidence/search-copy-control-20261013.json).
MAP-Elites beats the best real human tap in **46/51** sources under v1 — the
v1 scalar is invalid as a search objective. Removing the offset channel lowers
this to 35/51; onset terms lower it to 18/51 (expected) and 14/51 (source),
with matched-budget random search at 2–4/51. The onset terms simultaneously
raise the best elite's structural source copying (mean Jaccard .21 → ~.38):
exploitation pressure moves from timing tricks to onset-set imitation, and the
MAP-Elites-versus-random gap shows it scales with optimization budget. No
condition is a trustworthy objective yet; archive outputs remain synthetic
candidate pairings pending blinded human judgments.

## Step-3 scorer diagnostics

The master plan's third step requires component-level evidence before trusting
or redesigning the scalar. From `v2`, with a fitted model and the same pairs
export (deterministic; no seed):

```sh
.venv/bin/python scripts/solo_tapping.py diagnose \
  --pairs data/taptamdrum-pairs-raw-v1 \
  --model artifacts/solo-local-v1/model \
  --out artifacts/solo-diagnostics-v1
```

The command reads validation groups only and never encodes test data. It writes
`report.json` and per-tap `diagnostic-queries.jsonl` (own-source components and
conservative full-score rank):

- **Component ablation:** retrieval metrics for each conservation component as
  its own retrieval score (retention, learned compatibility, each negated
  penalty), the weighted positive/penalty aggregates, the full raw quality and
  the onset baseline, on all candidates and the tempo/density-matched stratum,
  with analytic chance. This localizes which terms carry held-out human signal
  and which remove it.
- **Adversarial battery on every validation source:** the existing synthetic
  controls, each compared with the best real human tap for that source and (for
  degraded copies) with the unaltered source copy; plus targeted attacks on a
  real human tap — least-supported-step density inflation, zeroed microtiming
  and flattened velocity — with per-component score deltas. An attack that
  raises raw quality is a scorer exploit, not an improvement.
- **Artificial 1-ch probe:** channel-isolated single-hand views of each
  multi-channel human tap; retrieval of the two-channel union versus the denser
  and sparser hand. These views are artificial. They do not validate
  2-ch → 1-ch transfer and are never solo ground truth.

Violation rates and deltas are engineering evidence for the score redesign.
They are not human preference measurements, and passing the battery does not
pass the perceptual gate or authorize closed-loop training.

The first real run on the 51-group validation split is summarized in
[scorer-diagnostics-20261013.json](evidence/scorer-diagnostics-20261013.json).
Zeroing microtiming raised raw quality in **51/51** groups for both the source
copy and a real human tap, through the retention and learned terms: the offset
channel systematically penalizes real human timing and is the first redesign
target. One-sixteenth shifts (11/51) and reversal (7/51) still beat the source
copy in a minority of sources. Density inflation (3/51), flattened velocity
(0/51) and source onset copying (3/51 above the best human) are largely
controlled. No component approaches the onset-cosine baseline (full raw quality
MRR .240 vs .518 on all candidates; .524 vs .740 tempo/density-matched), so the
local terms lose direct onset-profile information rather than merely weighting
it badly. Artificial single-hand views retrieve above chance (.157/.206 vs
.089) but below the two-channel union (.240); this is consistent with, not
proof of, 2-ch → 1-ch transfer.

## Evolutionary search and feasibility

The archive starts empty for each full groove. Following the
[MAP-Elites formulation](https://arxiv.org/abs/1504.04909), random initialization is
followed by uniform elite-parent selection, genome mutation, measurement and
replacement only when quality improves that cell. Default initialization is 32
evaluations and subsequent random restart probability is .1. Insert/delete/shift
edits modify the actual single-channel event stream; shifts prefer ±1/2/4 steps.
Optional velocity and offset mutations retain the v2 units.

Both axes have eight bins by default:

- Density: events per beat, fixed bounds `[0,4]`.
- Cyclic metrical-rest tension: for each occupied step, scan up to four following
  steps, stopping at the next onset. The first stronger silent step contributes
  its metrical-strength difference. Average over onsets, with empty defined as 0;
  bounds `[0,1]`. A last-sixteenth onset can create tension with the silent first
  downbeat. This is explicitly a grid syncopation proxy, not a validated perceptual
  score; residual timing affects feasibility/local matching, not this descriptor.

The independent random baseline uses the identical random proposal distribution,
scorer, feasibility rules, grid and budget. Invalid and duplicate proposals each
consume one evaluation in **both** algorithms; there is no hidden resampling.
The initial random proposals are paired by seed. Results include feasible counts,
unique candidates, coverage and QD score; infeasible candidates never enter archives.
Seeds are repeatable in the local NumPy environment, not a cross-platform bitwise promise.

Constraints use actual decoded onsets, including last-to-first loop IOI, and tempo
to convert to milliseconds. Initial `finger` defaults are minimum IOI 100 ms and
mean rate ≤8 hits/s; `stick` defaults are 70 ms and 12 hits/s. These are configurable
engineering assumptions, **not validated human biomechanical thresholds**. A cyclic
velocity-jump bound can also be set. Feasibility is not equivalent to comfortable
one-hand performance; human technique-specific assessment remains necessary.

## Blinded listening study (step 6 instrument)

`study-build` freezes a blinded pairwise 2AFC stimulus set from a validation
search control: per source, elite-vs-human, elite-vs-copy, elite-vs-random,
distant-elite-vs-human, a human-vs-even attention anchor and one retest of
elite-vs-human. Stimulus provenance lives only in the unserved `key.json`;
trial order and presentation sides are derived per pseudonym from a sealed
salt, and stored responses keep the canonical orientation. `study-report`
summarizes win rates with participant-bootstrap intervals, retest agreement,
anchor pass rates and per-role unplayability flags. File hashes freeze the
stimulus set; changed files are rejected at load.

Limitations: the human stimulus is an artificial mono union rendering of a
real 2-ch tap; sources are prioritized toward scorer-contentious cases; all
renderings are MIDI sonifications; pseudonyms are not identity-verified; the
report is exploratory and promotes nothing. Real consented responses are
required before any perceptual claim, and a positive result would still not
certify 2-ch → 1-ch transfer by itself.

## Leakage protocol and remaining gates

`SoloPairs` reuses the verified v2 TapTamDrum artifact reader, then verifies the
session hash split from the pairs card before extracting any local windows. All
segments and human versions from a source performance/session remain together.
Source locator/byte hash, performance, session, HVO hash and raw positive aliases
are checked across splits. Cross-split onset signatures and tap-byte matches are
reported separately, since ordinary shared rhythm vocabulary is not alone proof
of a shared recording. The adapter receives upstream selected two-bar clips; this
does not audit how upstream chose the musical excerpt.

Optional `--pretraining-manifest` audits training rows against known source byte
hashes, HVO hashes (`hvo_hash` or native export `hash`), and explicitly supplied
`gmd_performance`/`gmd_session` fields. Opaque canonical parent IDs are not guessed.
Missing identity coverage stays `partial`; absent manifests stay `not_provided`.
A whole corpus manifest reveals potential checkpoint overlap, not which rows a
particular checkpoint actually consumed. No pretrained checkpoint is used here.
Future encoder integration must map selected parents/aliases and reserve whole
sessions before pretraining. A negative exact-hash audit is not a near-duplicate
certificate.

Validation reports source-group-macro human→source retrieval, multi-positive
source→human retrieval, conservative ties, density/onset baselines, shuffled-pair
control and matched-tempo/density candidates (10% / 20% relative to the smaller
value). Candidate counts and coverage accompany the hard-negative metric. Missing
tempo excludes a distractor from the hard stratum rather than inventing a tempo.
Participants overlap these session splits; participant-held-out validation remains
pending. Repeated seeds on one split are not independent data replications.

Next gates: improve held-out compatibility beyond the onset baseline; assess
velocity/microtiming and motif-scale ablations; audit cropped/near-duplicate
provenance; performer-held-out evaluation; independent one-hand recordings and
blinded human representativeness/playability judgments. This research path remains
offline until those gates justify product integration. RL is outside current scope.
