# 2groove v2 — production workspace

**MIDI preprocessing kullanım rehberi (Türkçe):** [scripts/README.md](scripts/README.md)
— tek dosya, ZIP veya tüm alt klasörleriyle bir MIDI arşivini işleme.

**Dataset exploration:** [notebooks/explore_ingest.ipynb](notebooks/explore_ingest.ipynb)
— select train/validation/test examples, view piano rolls, listen to synthesized
previews and inspect canonical/HVO rejection reasons. [Usage](notebooks/README.md).

**Groove/fill preprocessing:** role evidence, split-safe composition and conditioning
arrays are available; see [the preprocessing contract](PREPROCESSING.md#groovefill-roles-and-composition-2026-10-09)
and [multi-source config](configs/ingest-groove-fill.example.json). Existing CVAE
training/inference does not yet consume the new fill-conditioning fields.

The [validation report](fill-preprocessing-validation.json) records the full GMD
run, 242 sampled files from local collections, and unresolved adapters/mappings.
Sample acceptance is not a whole-library readiness or classifier accuracy claim.

**GigaMIDI / Lucerne adapters:** [configuration and decoding details](PREPROCESSING.md#gigamidi-and-lucerne-adapters)
and [adapter validation](dataset-adapters-validation.json). Lucerne separates the
300 BPM carrier, count-in and bass from musical drum events; GigaMIDI joins verified
MIDI byte hashes to an indexed metadata CSV. Unknown groove/fill roles remain unknown.

**Preprocessing update (2026-10-08):** the generalized, provenance-aware MIDI pipeline
is documented in [PREPROCESSING.md](PREPROCESSING.md). It supersedes the GMD-only
preparation path for new experiments. Earlier training/evaluation below describes
the preserved initial baseline.

Phase 1: record a two-bar idea, generate alternatives, audition, edit and lock voices,
retap, compare A/B, and export MIDI. Phase 2 (continuous listening and adaptive
accompaniment) is deliberately deferred. This is a working engineering baseline,
not a finished or perceptually validated generative model.

## Run

Use Python **3.12** on both macOS and Linux. Create a separate `.venv` on each
machine; do not copy or sync virtual environments between operating systems.
From this directory, set up the environment first:

```sh
./setup.sh
```

Then start the app:

```sh
source .venv/bin/activate
python -m groove
```

Open <http://127.0.0.1:8765>. Alternatively run `./run.sh` from any directory.
The server binds only to localhost. Stop it with Ctrl-C. A browser refresh preserves
the last session in local storage; **Save session** writes portable JSON. Session
files store taps, selected groove, locks, A/B patterns, history and generation
settings. They do not store live MIDI connections or resume transport automatically.

`setup.sh` requires `python3.12` on your PATH (or set `PYTHON` to its full path).
On macOS, Homebrew users can install it with `brew install python@3.12`.
On a machine with Conda, install it separately from the base environment:

```sh
conda create -n twogroove-py312 python=3.12 -y
conda activate twogroove-py312
PYTHON="$CONDA_PREFIX/bin/python" ./setup.sh
```

If an existing `.venv` uses Python 3.11, deactivate it, move it out of the way
(for example, `mv .venv .venv-py311-backup`), and run setup again. Updating pip
alone cannot fix this: `networkx==3.7` requires Python 3.12 or newer, and the
project also declares Python 3.12 as its minimum. Check the actual environment
with `.venv/bin/python --version`; the shell's `(base)` prefix is not sufficient.

`requirements.lock` pins package versions from the original environment. Pip
selects OS-specific wheels and additional platform dependencies, so this is not
a complete cross-platform lock. PyTorch's Linux CUDA dependencies can differ
from its macOS dependencies. Native MIDI/DAW behavior needs testing on each OS.

The package currently runs from the source checkout. Drum samples are served from
the existing `../db_app/assets/sounds/drum_samples` directory. Their original
licensing still needs auditing before distributing an application bundle.

## Production flow

1. Apply an internal tempo, or select **DAW · MIDI clock** and connect clock input.
2. Press **Record taps**. Internal mode gives one bar of count-in followed by two
   bars of capture. Tap with space, the pad, or MIDI note-ons. External mode arms
   for DAW Start or the next bar when transport already runs. **Finish take** keeps
   a shorter capture within the same two-bar container.
3. Select style, tap meaning, engine, search algorithm and seed; generate variations.
   The procedural engine works without a checkpoint. CVAE uses the local trained
   GMD checkpoint. Its supported tap roles are accent and pulse; complement is a
   procedural baseline only.
4. Select archive cells or candidates. Play through local sample audio or MIDI out.
   While playing, selections/edits queue for the next eight-beat boundary. Pin two
   versions for A/B. Connect MIDI output to automatically disable local monitoring
   and avoid doubling; it can be re-enabled manually.
5. Click empty drum cells to add notes. Select a note to change exact beat or velocity.
   Check a voice lock before regeneration: its notes are copied exactly. This is a
   deterministic overlay, not a learned inpainting model. Undo/redo covers note edits.
6. Record another idea, recall prior takes/variations, save a session or export `.mid`.
   The file is two bars, 4/4, 960 PPQ, GM percussion notes, channel 10. MIDI routing
   can use a different output channel; exported files intentionally use GM channel 10.

## DAW routing

Open **MIDI & DAW routing**, choose existing ports or create the three virtual ports:

- **2groove Tap In**: DAW MIDI track output → this destination. Send the tapped
  note(s); optional channel/note filters restrict capture. Velocity-zero note-ons
  are ignored. No input notes are echoed directly back out.
- **2groove Clock In**: DAW MIDI clock/sync output → this destination. Enable clock
  send, including Start/Stop/Continue; select external clock and press Apply.
  24 PPQN clock, Song Position Pointer, Start, Stop and Continue are handled.
- **2groove Drum Out**: select this source as a DAW instrument track's input. Put
  your drum VST on that track, enable monitoring, and match the output channel
  (10 by default). Remap the GM pitches if the VST uses a different drum map.

A hardware controller can be selected directly as tap input. The same existing
input may carry taps and clock; it is opened once. Virtual ports use native
CoreMIDI on macOS; IAC is not necessary. RtMidi virtual ports are also available on
Linux, while Windows generally needs an external virtual MIDI driver. Only macOS
has been tested here. This app is a standalone MIDI companion, **not a VST plugin
or VST host**. DAW audio rendering remains in your instrument track.

Play in external mode waits for DAW transport, then loops against its beat position.
Clock loss (>500 ms without pulses) stops output, sends panic, and requires a new
Start/Continue. Stop/Panic sends note-offs plus CC 123/120 on the chosen channel.
Avoid routing Drum Out back into the tap/clock track. Unplug/replug errors are
reported; use Disconnect/Connect after reconnecting hardware.

## Polyrhythm and NI grids

Two separate event-domain operations are available:

- **Exact taps + counter-pulse** replaces two selected voices: one reproduces raw
  tap times/velocities, the other articulates `nT` equally spaced pulses in a 4- or
  8-beat shared cycle. Arbitrary taps do not guarantee a mathematically isochronous
  `nF:nT` polyrhythm. `nF` and `S` do not affect this mode.
- **NI grid voice** replaces one voice with the Sioros construction. For formative
  onset `fᵢ = iL/nF`, nearest target onset `tᵢ`, and uniform shift `S`,
  `gᵢ = fᵢ + S(tᵢ − fᵢ)`. The shared phase rotates the whole result. Nearest ties go
  forward, including across the cycle boundary. At S=1 coincident events are
  merged at maximum velocity. Exact floating-point beat positions survive to
  playback/export; export alone rounds to 1/960 beat.

This implements the construction from [Sioros, ISMIR 2023](https://archives.ismir.net/ismir2023/paper/000016.pdf),
also presented in the [supplied poster](https://ismir2023program.ismir.net/static/posters/82.pdf).
The supplied PEARL download returned HTTP 403; the paper was read from ISMIR's
publisher archive. It is the same publication, not independent supporting evidence.
The original paper is CC BY 4.0. Implementation decisions, UI, constraints and
evaluation proposals here are our own application of the framework.

The CVAE is **not trained on these polyrhythmic conditions**. Transformation follows
decoding, precedes exact lock restoration, and precedes QD measurement. Selecting a
locked transform voice is rejected explicitly. See `ROADMAP.md` for learned
conditioning and tap-to-grid inference experiments.

## Model, data and search

`scripts/prepare_gmd.py` downloads the official Groove MIDI Dataset MIDI-only archive,
verifies its pinned SHA-256, respects the official performance split, and constructs
non-overlapping two-bar windows. The nine-voice H/V/O schema uses quarter-note beats;
grid offsets are fractions of a sixteenth. Duplicate hashes crossing splits are
removed, and duplicates within a split are deduplicated. Current counts: 8,173 train,
1,016 validation and 1,019 test windows. The card and source manifest are in `data/gmd`.
This is **not drummer-disjoint**, and exact HVO hashing is not a near-duplicate audit.

The bidirectional GRU conditional VAE has a tap-conditioned prior, a training-only
posterior over drums, and independent Bernoulli hit logits, bounded velocities and
offsets. BCE handles simultaneous hits; H-masked velocity/offset losses avoid
learning nonexistent events; conditional KL uses a short warm-up. Styles use a
coarsened GMD vocabulary; unknown styles remain explicitly unknown. Training taps
are synthesized from kick/snare or hats/ride with dropout/timing perturbation.
No paired human-tap dataset is claimed. The checkpoint has completed 12 epochs.

MAP-Elites searches 32-dimensional prior noise with fixed tap/style/lock/poly context.
It uses Gaussian mutation, 20% prior restarts, a fixed 8×8 grid and the same evaluation
budget as the random baseline. Seeding is deterministic in this local environment.
Candidate quality is a declared tap-proximity/over-polyphony proxy, not a learned
musical preference score. Latent and seed are saved; manual edits clear the latent.

- Horizontal axis: final event density, fixed 0–12 hits/beat.
- Vertical default: metrical displacement/syncopation **proxy** on a 32-step grid.
  It is not a validated Witek score and loses NI timing information.
- Alternative: mean per-voice cyclic IOI coefficient of variation, clipped to [0,1].
  It uses exact beats but also changes with sparse articulation. It is not a measure
  of perceived polyrhythm, NI shift S, or groove quality.

Valence/arousal is deferred until annotations and a calibrated perceptual model
exist. Calling density “arousal” or syncopation “valence” would be unsupported.

## Timing contract

MIDI scheduling runs in a dedicated monotonic thread, independent of the browser and
generation worker. Native input uses RtMidi's C++ queue at a nominal 1.5 ms poll
interval, preserving native inter-message deltas. This avoids a reproduced
CoreMIDI/Python callback disposal deadlock. Initial timestamp anchoring still has
poll latency; this is not a hard real-time process.

Late MIDI events beyond 40 ms are dropped rather than burst after a stall. MIDI clock
sets musical position; exported events use absolute ticks, with silent tail on EOT.
Local browser audio uses AudioContext scheduling with a 100 ms look-ahead and 25 ms
timer; requestAnimationFrame is only visual. It follows server transport via a
midpoint clock handshake. Browser preview cannot guarantee sample-accurate agreement
with a DAW under abrupt tempo changes, background throttling or audio-device latency.
Use native MIDI out for the DAW workflow. A stale server snapshot mutes browser audio.
Scheduler p95 measures lateness **inside the software scheduler**, not DAC/VST latency.

## Reproduce checks

```sh
.venv/bin/python -m pytest -q
.venv/bin/python scripts/prepare_gmd.py
.venv/bin/python scripts/train.py --epochs 12 --threads 4
.venv/bin/python scripts/evaluate.py
.venv/bin/python scripts/check_midi_loopback.py
```

Data download requires network access. Native loopback requires OS MIDI access; it
creates unique temporary ports and does not connect to your DAW or controller.
`requirements.lock` pins the installed environment. Checkpoints, raw data and local
generated reports in `artifacts/` are ignored by git, but remain on this machine.
Tracked `validation-summary.json` records the initial diagnostic run. The full
evaluation and training logs are in `artifacts/`.

Remaining gates: paired human-tap evaluation; style/pulse ablations over multiple
contexts and seeds; latent utilization/diversity; near-duplicate/source leakage
audit; drummer-held-out evaluation; calibrated descriptor/user preference studies;
physical MIDI and target DAW/VST latency measurements. These are research/product
validation work, not implied by passing software tests.

Browser integration checks are in `scripts/check_browser.cjs` (requires Playwright
and Chrome, with the server already running). Run `node scripts/check_browser.cjs`;
set `PLAYWRIGHT_MODULE` if Playwright is installed outside normal Node resolution.
The test writes screenshots, session/MIDI exports and a check log to `artifacts/`.
Initial verification: 26 pytest tests passed, native virtual MIDI capture/output and
clean shutdown passed, and desktop/mobile browser workflow checks passed. A
Starlette TestClient/httpx deprecation warning remains; it did not fail tests.
