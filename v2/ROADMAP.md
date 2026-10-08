# V2 implementation and research gates

## Phase 1: co-creative production

Implemented: two-bar tap recording (keyboard/pad/native MIDI), internal or DAW clock,
offline whole-clip generation, native MIDI out, local sample preview, exact event
editor, voice locks, undo/redo, A/B, take history, session files, MIDI export,
procedural + CVAE baseline, seeded random/MAP-Elites comparison, density × metrical
proxy or IOI-variability archive, and explicit polyrhythm/NI-grid transformation.

These are engineering foundations. The old dataset and metrics are not reused as
unqualified evidence of progress; see `../review/v2-2026-10-07/` for the audit.

### Next: establish human tap semantics

Collect paired production takes with consent and source/session/drummer identifiers.
Ask separately for pulse, accented skeleton and complement tasks. Retain raw note
timestamps, velocities, capture clock, tempo changes, latency calibration and the
user's selected/edited result. A tap can indicate salience without prescribing a
specific drum instrument. Keep raw events independent of model-specific HVO grids.

Compare target-derived pseudo taps, independently performed taps and mismatched taps.
Use train-only augmentation and source/session grouping before segmentation. Audit
near duplicates using normalized onset structure as well as full HVO hashes.
Evaluate performance-held-out and drummer-held-out regimes separately; report style
and tempo distributions, sparse input cases and ambiguous half/double-time cases.

### Next: improve the generative distribution

Keep the current CVAE and procedural engine as frozen baselines. First test prior vs
posterior reconstruction, conditional KL per dimension, active latent units, prior
sample diversity, threshold sensitivity and style/tap ablations. Initial diagnostics
show low CVAE archive coverage; adding MAP-Elites alone does not fix a narrow decoder.

Test free bits/cyclical KL, richer tap encodings and style-balanced batches before
increasing model size. Compare a conditional Transformer and a masked discrete
diffusion model only under matched data and compute budgets. Add observed drum masks
and reference tokens if learned inpainting is required; exact output locking remains
a hard final constraint even with a learned refiner.

Objective: independent multilabel hit loss, observed-hit velocity/offset loss,
conditional latent regularization and tap-role consistency. Benchmark auxiliary
onset-distance and accent-envelope losses with ablations: copying every tap can
increase overlap while destroying complementarity. Evaluate hallucinated hits,
missed salient gestures, event density, timing distributions, instrument balance
and repeatability alongside listening/production judgments. Do not optimize solely
for MIDI F1 or reconstruction ELBO.

### Polyrhythm: model condition, structure and residual timing

Current implementation separates raw-tap overlay from a synthesized NI voice.
Next represent a condition as `(cycle, nF, nT, phase, shift, voice assignment)` and
an event as `(voice, grid index, occupancy, velocity, residual timing)`. Structural
grid displacement must not be conflated with expressive residual microtiming.
Some NI onsets fall outside the current ±half-sixteenth head's useful interpretation;
the present 32×9 HVO CVAE must not silently quantize them for training.

Three controlled experiments:

1. **Post-decoder transform** (current baseline): fixed user-selected NI structure,
   exact taps retained in overlay mode, output measured after transformation.
2. **Conditioned grid decoder**: decode occupancy/velocity/residuals on the explicitly
   supplied NI grid. Include S=0 and S=1 controls; preserve collisions as a documented
   many-to-one event mapping. Lock constraints remain exact.
3. **Tap-to-grid inference**: rank candidate cycle/phase/nF/nT/S fits with a timing
   tolerance and a complexity penalty; expose multiple hypotheses and an “unfitted”
   option. Tap count alone cannot establish nF. Hold out ratios and tempi to test
   compositional generalization, rather than memorizing known patterns.

Evaluate tap preservation, circular onset error, onset-order violations, coincident
event handling, voice collisions, IOI distributions and structural-vs-residual
timing. Obtain listener judgments of relation to the gesture, controllability,
distinctness and usefulness. The Sioros mathematical construction does not itself
establish these perceptual outcomes. Include isochronous, Euclidean endpoint and
NI intermediate controls with identical instrumentation and velocity envelopes.

For QD, first keep the NI condition fixed and search latent variation. A separate
experiment can search S/phase or ratio alongside latent variables, with an archive
reset/context key that includes the transform. Otherwise cells from different
conditions or descriptor calibrations are not comparable. Test density × cyclic
IOI variability separately from density × calibrated metrical syncopation.

### QD and customization gate

Use identical decoding and final-note constraints across random search, rejection
sampling and MAP-Elites. Repeat across many real takes, styles, masks, budgets and
seeds; report confidence intervals, coverage, QD score, within-cell diversity,
duplicate rate, constraint failures and wall-clock time. Do not compare QD scores
between incompatible descriptor/quality definitions. The current quality objective
can reward loud tap copies and is deliberately labelled a proxy.

Personalization begins with explicit user selection/edits and locally retained
preferences. Learn a ranking objective only after collecting suitable comparisons;
preserve reproducibility and a neutral baseline. Valence/arousal becomes an optional
perceptual archive only after inter-rater reliability and out-of-domain calibration.

### DAW release gate

Validate chosen DAW and VST with a physical controller and audio interface: Start,
Stop, Continue, SPP, tempo ramp/step, loop boundaries, clock loss, port removal,
note-offs, repeated reconnects, clock/tap channel filters and CPU contention. Measure
input→record timing and scheduled MIDI→rendered audio separately; report p50/p95/p99,
dropouts and drift over a long session. Virtual loopback is necessary but insufficient.
Consider a native plugin companion only when plugin deployment is in scope.

## Phase 2: continuously listening accompaniment

Only after phase-1 data/quality/timing gates: introduce rolling tap context, explicit
tempo/phase uncertainty, bounded asynchronous inference, musical boundary updates,
intentional silence, and a policy for when to retain, vary or replace the groove.
Evaluate recovery after performer tempo shifts and ambiguous gestures. Keep capture,
transport, generation and selection as separate components; no inference in the
MIDI/audio scheduling path. The full-clip bidirectional model is not a causal live
model; any causal replacement needs a separate evaluation.
