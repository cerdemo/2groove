# Solo tapping research workspace

Browser-based audiovisual exploration of **full groove → human 2-ch → generated
1-ch**, with a real local-motif scorer and evolutionary MAP-Elites. This directory
contains the research engine, explorer, methodology, tests and new experiment
outputs. RL is outside its scope.

**Real mono-contour benchmark:** [human_benchmark](human_benchmark/README.md)
audits Gómez-Marín et al.'s public human/source pairings and compares metre,
onset density, FWOD and local shapelets under source, participant/session and
crossed holdouts. It is separate from the 2-ch-to-1-ch transfer pilot.
The [completed audit and first results](evidence/human-benchmark-validation.json)
retain 588 primary pairs after quarantine; shapelet superiority is not established.

## Start

From `v2`, using the existing Python environment:

```sh
./research/solo_tapping/run.sh
```

Open **http://127.0.0.1:8766**. Stop with Ctrl-C. Alternatively:

```sh
.venv/bin/python -m research.solo_tapping --port 8766
```

No frontend build, notebook kernel, new package, MIDI hardware or external service
is required. The separate production application can continue on port 8765.

## Explore

1. **GMD + human interpretations** opens verified TapTamDrum source crops and all
   their real two-pad performances. Select another participant/repetition to
   compare it. The initial validation source has an existing pilot archive.
2. **Original GMD performances** reads the local GMD catalogue. Select an eight-beat
   crop starting at beat 0, 4, 8, etc. **Import drum MIDI** accepts a local `.mid`
   with explicit constant tempo, 4/4, at least eight beats, and supported v2
   GM/TD-11 pitches on channel 10. Unsupported/ambiguous files are rejected.
   These imports have no verified human pair: the 2-ch view explicitly stays empty.
3. **Listen** auditions the full drum kit, human pads, generated solo, or full+solo
   against one audio clock and synchronized piano-roll cursors. Note height and
   opacity encode velocity; exact horizontal position and offset stems show
   microtiming. Hover for beat, velocity and timing offset. Click is optional.
4. **Evolve a solo** changes seed, evaluation budget, grid resolution, initial
   random population, restart rate, relative mutation weights, shift radius,
   velocity/microtiming variation, offset bounds and hand constraints. Each press
   starts a fresh per-source archive. The optional independent random baseline
   receives exactly the same proposal budget and constraints. Cancel saves a
   partial run with its actual evaluation count; partial budgets are not a fair
   completed comparison.
5. Click an occupied **density × syncopation** cell to inspect/audition its elite.
   The six score contributions update with it. Both archive tabs show coverage,
   best proxy score, normalized QD score and feasible proposal counts.
6. **A closer look at shapelets** changes the 1-, 2- or 4-beat window and its
   metrical start, including cyclic wrap. It shows the current source profile,
   the dominant training-source template, its paired human response, and the
   selected solo window, with training provenance and activation weights.
7. Export any available view to MIDI; use **Saved research runs** to restore the
   source, parameters and both archives after restarting the browser/server.

Playback uses existing local drum samples with a synthesized fallback. Human pads
use distinguishable tom sounds and solo uses snare; these are MIDI sonifications,
not original audio recordings. Playback stops when the tab becomes hidden.
Changing audition BPM does not retroactively revalidate an archive: rerun the
search to apply hand constraints at the new tempo. The UI displays this reminder.

## Blinded listening study (master plan step 6)

Interactive exploration is not a study; the study mode is. Build a blinded
pairwise stimulus set from a **validation** search control, then serve it:

```sh
.venv/bin/python scripts/solo_tapping.py study-build \
  --pairs data/taptamdrum-pairs-raw-v1 \
  --search artifacts/solo-search-ctl-no-offset-expected \
  --out artifacts/solo-study-20261013 --seed 42 --max-sources 12

.venv/bin/python -m research.solo_tapping --port 8766 \
  --study artifacts/solo-study-20261013
```

Participants open **http://127.0.0.1:8766/study**, read the consent text, enter
a pseudonym and answer 2AFC trials: groove + two one-channel renderings, choose
the better fit, rate the difference slight/clear, optionally flag one-hand
unplayability. Per source the canonical pairs are elite-vs-human,
elite-vs-copy, elite-vs-random, distant-elite-vs-human, a human-vs-even anchor,
and one elite-vs-human retest. Trial order and sides are re-randomized per
pseudonym; provenance stays in `key.json`, which is never served. Responses
append to `responses.jsonl` with replay counts and timing. Sources are chosen
scorer-contentious-first — a prioritization heuristic, not a representative
sample. The human rendering is the temporal-union mono sonification of a real
2-ch tap: an artificial view, not a performed solo.

```sh
.venv/bin/python scripts/solo_tapping.py study-report \
  --study artifacts/solo-study-20261013 --out artifacts/solo-study-20261013-report.json
```

The report gives per-pair-type win rates with participant-bootstrap intervals,
retest agreement, per-participant anchor pass rates and unplayability rates by
hidden role. It is exploratory, assumes self-chosen pseudonyms, and never
promotes a checkpoint. Building a study produces no human evidence by itself.

## What the method means

The shapelet-inspired dictionary contains paired local source/response exemplars
learned only from training groups. It is not the original class-discriminative
shapelet-tree algorithm. It matches phase-anchored onset, velocity, microtiming,
DOT and metre features on a common beat reference. Family pairs and two-voice
glyph geometry are not the cross-channel matching unit. [METHOD.md](METHOD.md)
documents the equations, train-only fitting, multiple positives and hard negatives.

Density is event count / 8 beats, with fixed archive bounds **[0,4] hits/beat**.
Syncopation is the versioned cyclic metrical-rest proxy in `features.py`: for each
occupied step, scan at most one beat forward, stopping at the next onset or the
first metrically stronger rest. That rest contributes the positive difference in
normalized metrical strength. Average over occupied steps. It lies in **[0,1]**,
includes the loop boundary, and is not a perceptually calibrated syncopation score.
Candidate quality combines retention and learned compatibility, penalizing
unsupported additions, phase loss, order loss and excess density separately.

**2-ch → 1-ch transfer remains an unvalidated hypothesis.** Neither one human hand
nor the union of two hands is treated as a real solo target. The initial real-pair
pilot underperformed the onset baseline (MRR .240 vs .518) and showed phase/timing
weaknesses; see [the preserved report](evidence/initial-validation.json).
The displayed pilot metrics describe that historical model, not later checkpoints.
Higher search scores, engineering tests and listening in this UI are not a human
study. One-hand limits are configurable engineering assumptions.

Paired browsing excludes the session-assigned test split; the original GMD
catalogue excludes its official test split. These are different split schemes.
Arbitrary uploads are exploration inputs without a verified split. Interactive
selection is not a frozen evaluation protocol and must not be reported as one.
The existing source/session and groove-pretraining overlap limitations remain open.

## Files and reproducibility

- `features.py`, `data.py`, `model.py`, `scoring.py`, `search.py`, `evaluation.py`,
  `cli.py`: the research engine, moved here with compatible `groove.solo.*` imports.
- `server.py`, `__main__.py`, `web/`: the local API and browser application.
- `METHOD.md`, `evidence/`: methodology and preserved historical evidence.
- `tests/`: explorer/API, import/export, search-control and persistence checks.
- `runs/<timestamp>-<id>/`: new source/request snapshots, run metadata, model/data/
  code hashes, separate algorithm archives, every proposal's genome/parent/score/
  feasibility, and one MIDI per elite. This directory is ignored by git.

Existing data/checkpoints and prior artifacts remain in their original locations;
the explorer reads them without moving or overwriting them. Defaults:

```text
pairs: data/taptamdrum-pairs-raw-v1
model: artifacts/solo-local-20261013-final/model
GMD:   data/gmd/gmd/groove
```

Override these using `--pairs`, `--model`, `--gmd`, `--output`. A missing checkpoint
leaves source loading, display, audio and MIDI export available; learned inspection
and search are disabled. A mismatched checkpoint/pairs fingerprint is rejected.
To fit a new model without overwriting the existing one, from `v2`:

```sh
.venv/bin/python scripts/solo_tapping.py fit \
  --pairs data/taptamdrum-pairs-raw-v1 \
  --out research/solo_tapping/fits/my-first-fit \
  --motifs 16 --iterations 300 --seed 42

./research/solo_tapping/run.sh \
  --model research/solo_tapping/fits/my-first-fit/model
```

The CLI also supports offline `search`; `fit` includes held-out validation.
See `METHOD.md`. Its old
entry point remains compatible. Saved search runs are viewable with their original
model; loading them against a different checkpoint fails explicitly.

## Verify

The [explorer verification report](evidence/explorer-validation.json) records
208 passing tests, the desktop browser workflows, MIDI download round-trip and
the automated file-picker permission limitation. A local screenshot is saved at
`qa/explorer.jpg` (ignored by git).

From `v2`:

```sh
.venv/bin/python -m pytest -q
node --check research/solo_tapping/web/app.js
```

Automated synthetic checks include actual adapter→model→API→search→saved archive
flows, deterministic equal budgets, cancellation, frozen-test exclusion,
training-exemplar provenance, ambiguous MIDI rejection and 960-PPQ time/velocity/
voice/loop-length preservation. They are engineering evidence, not musical-quality
or perceptual validation. Local sample redistribution still requires the existing
project's sample-license audit.
