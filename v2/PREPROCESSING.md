# Unified MIDI ingestion

For a Turkish quickstart with recursive folder and single-file commands, see
[scripts/README.md](scripts/README.md). The direct entry point is
`python scripts/ingest_midi.py --input "/path/to/library" --output data/my-corpus`;
use `--config` instead for collection adapters and custom mappings.

For a small smoke run, append `--max-files 20` (also available as top-level config
`max_files`). This caps inspected candidates across all sources, including rejected
files and individual ZIP members; it does not target 20 accepted examples. Omit it
and leave config `max_files` unset/null for an unlimited run. CLI overrides config.
The saved config and report record the cap; `limit_reached` means the cap was met,
not that additional files are known to remain. Use a separate test output directory.

The new ingestion package is `groove/ingest/`. It produces an inspectable event
corpus before any model-specific quantization. It can process multiple directories
and ZIP collections in one run. No source file is modified or deleted.

## Run the existing corpus

From `v2`, using the existing isolated environment:

```sh
.venv/bin/python scripts/ingest_midi.py \
  --config configs/ingest-gmd.json \
  --export-hvo data/my-new-hvo-export
```

Each invocation creates an immutable timestamped run under `data/unified/runs/`.
`data/unified/latest.json` points to the last completed run. A model export requires
a fresh directory to avoid accidental replacement. `--export-hvo` is optional.

For other libraries, copy `configs/ingest-mixed.example.json`, change source paths
and source IDs, and select the relevant drum maps. Paths in configuration are
relative to the working directory; the examples assume `v2`. Source IDs must be
unique. Do not use `adapter: gmd` for an unrelated CSV-based collection.

Supported containers: SMF type 0/1, `.mid`, `.midi`, `.smf`, `.kar`, RIFF RMID
`.rmi`/`.rmid`, and those formats inside ZIP. Both pitched parts and percussion
are inspected. Type 2 asynchronous sequences and SMPTE time division are explicitly
quarantined for separate adapters. Nested ZIPs, DAW project formats and MIDI 2.0
clip files are not currently decoded. Archives are not extracted onto arbitrary
filesystem paths; traversal paths, duplicate member names and oversized entries
are rejected. File/event/member limits are configurable.

## Metadata resolution

The default acceptance policy requires **style and explicit tempo**, plus accepted
percussion. Meter is optional in the canonical corpus and mandatory for the current
HVO adapter. `policy.required_metadata` can change this without editing code.

Resolution is field-specific. A file can get tempo from MIDI, style from a folder,
and a title from a track name. The evidence order is:

1. A reasoned, explicitly supplied review annotation.
2. MIDI tempo/time-signature events at tick zero and labelled text metadata.
3. A known dataset manifest or per-file `.metadata.json` sidecar.
4. Track/instrument names, filename, parent directory names, source defaults.
5. An exact-identity web result for a still-missing required field.

Each candidate preserves value, source kind, source locator, raw label, evidence
score and scope. Web evidence also records query, URL and retrieval time. These
scores rank heuristic evidence; **they are not calibrated correctness probabilities**.
An explicit MIDI `set_tempo` proves what the file declares, not the performer's
intended tempo. Conflicting reliable candidates are kept and quarantined by default;
`prefer_priority` is available as a deliberate policy change.

Absent MIDI tempo does not silently become an observed 120 BPM. Unlabelled numbers
such as `001.mid` do not become tempos. Name parsing recognizes explicit `120bpm`,
`bpm=120`, `tempo:120`, and style labels. Generic name/folder inference uses a
controlled vocabulary and whole-name matching: “We Will Rock You” is not labelled
rock just because its title contains “Rock”. Explicit genre fields can retain new
labels such as `middleeastern`; the model's smaller style vocabulary is separate.
Raw subtype strings such as `neworleans/secondline` remain in the evidence and source
manifest rather than being irreversibly collapsed.

The GMD adapter uses official `info.csv` identities/splits and Roland TD-11 mapping.
Generic libraries can supply `song.metadata.json` next to `song.mid`, including
inside ZIP. A sidecar can provide `style`, `tempo`, `meter`, `title` and `artist`.
Additional collection adapters can use the same evidence schema; arbitrary CSV
schemas are not silently guessed.

## Web search and unresolved files

`web.mode` supports `musicbrainz`, `brave`, `auto`, `cache`, and `off`.

- MusicBrainz searches a recording by title and artist when available, verifies
  exact normalized identity and reads recording genres. Multiple plausible
  recordings remain ambiguous. Its rate limiter spaces requests by at least 1.1 s,
  with a bounded per-run request budget, timeouts and a meaningful User-Agent.
- Brave provides general web search using `BRAVE_SEARCH_API_KEY` in the environment.
  It requires matching title and artist, an explicitly labelled genre, and agreeing
  results on at least two different hosts. A genre word elsewhere in a result is
  insufficient. Search snippets are evidence proposals, not instructions to execute.
- `auto` tries MusicBrainz, then Brave when a key is available and the catalogue
  result did not resolve the identity/metadata. Without a Brave key, its search scope
  is MusicBrainz. The supplied GMD config explicitly selects MusicBrainz.
- `cache` allows a reproducible offline rerun. A cache miss is deferred, not an
  assertion that no information exists. `off` still reports which files need lookup.

Only title/artist queries leave the machine. MIDI bytes and local paths are not
uploaded. A song recording's tempo is **not** copied into an arbitrary MIDI
arrangement. A reviewed web tempo entry must be scoped to `midi_arrangement` and
bound to that exact MIDI's SHA-256. Otherwise it can be retained as evidence but
cannot satisfy the required tempo field.

Results are cached under `web.cache` by identity, with provider mode. Successful,
negative and ambiguous results can be replayed; transient network errors are not
cached as negative evidence. Remove or replace an individual cache entry to refresh
it. `web-requests.jsonl` contains attempted identities and outcomes. A reviewed
cache entry from a different source can be added with `reviewed: true`, the exact
identity, `identity_status: exact`, a retrieval timestamp, and field/value/source-URL
evidence. It is an explicit review override, not automatic verification of a webpage.

Three final states have distinct meanings:

- **accepted**: required metadata and percussion criteria are met.
- **discarded**: excluded from the dataset after no usable evidence, no percussion,
  malformed input or explicit reviewer exclusion. Original bytes remain available.
- **quarantined**: an identity/metadata/stream conflict, unsupported format,
  disabled lookup, request budget or temporary network error needs resolution.

“No result” means none from the configured provider(s) under the chosen matching
policy; it is not a claim to have exhausted the entire web. Ambiguity never becomes
an automatic best-guess genre.

Live MusicBrainz connectivity has been tested. Brave parsing/identity gates are
covered by fixtures; no Brave API key was configured for a live integration test.

## Percussion assessment and mapping

The assessment unit is **track × MIDI port × channel × bank/program epoch**.
Tracks and channels are not interchangeable. Channel/program changes are processed
in global event order; a later program segment does not inherit an earlier segment's
classification. Channel-prefix labels are respected. An unscoped label on a type-0
multichannel track does not classify every channel as drums.

Evidence combines conventional channel 10, rhythm bank selection, names, program
information and symbolic event features. Pattern features include GM percussion
pitch coverage, pitch reuse, short-note fraction, simultaneous hits and coverage of
kick/snare/cymbal pitch families. Melodic names/programs reduce the score; contradictory
signals produce an ambiguous stream. Pitched percussion such as marimba is not
automatically treated as a drum kit. An anonymous monophonic snare-like pattern can
remain unresolved: the same pitches could encode a pitched instrument.

**Percussion detection and pitch interpretation are separate decisions.** GM,
Roland TD-11 and explicit custom pitch maps are supported. A single-pitch, named
voice can provide its instrument identity. Unknown pitches remain explicit unknowns.
For example, pitch 58 maps to vibraslap under GM and a tom in the GMD TD-11 profile;
using the wrong source map silently would contaminate training.

Selected events preserve original tick, quarter-note beat, velocity, channel, port,
track, bank/program state, note-off/duration when present, mapping basis and stream
ID. The canonical instrument taxonomy includes GM percussion beyond the nine voices
of the current CVAE. Tempo/meter maps, raw metadata, controls, SysEx and all pitched
note events remain inspectable. The original bytes are the lossless authority.
Unsupported SysEx is retained and flagged; proprietary GS/XG/custom remapping is not
fully decoded. Generic sources with uninterpreted SysEx are quarantined by default;
a reasoned review or an explicit `allow_uninterpreted_sysex` policy change is required.
Do not interpret the GM fallback as proof of a proprietary kit map.

This detector is an explainable heuristic baseline. GMD is mostly well-labelled
drums and cannot validate its accuracy on arbitrary multitrack arrangements. The
next calibration dataset must include manually labelled nonstandard drum channels,
melodic false positives, pitched percussion and custom kits. Report precision,
recall and abstention by source before relaxing the acceptance threshold.

## Review overrides

Use a JSON object keyed by file SHA-256 or `source-id:relative/path.mid`. For example:

```json
{
  "my-library:song.mid": {
    "reason": "Checked against the source session",
    "metadata": {"tempo": 96, "style": "funk"},
    "streams": {
      "t1:p0:c3:e0": {
        "role": "percussion",
        "pitch_map": {"36": "kick", "40": "snare"}
      }
    }
  }
}
```

Pass it with `--annotations path/to/annotations.json`. Stream channel numbers in
IDs are one-based; canonical event channels retain MIDI's zero-based convention.
Overrides require a reason and are stored with the record. `exclude: true` excludes
the file. Tempo/meter overrides change the initial resolved value; later MIDI map
events remain separate. `review-queue.json` supplies unresolved file/stream IDs.
Rerunning produces a new version and does not rewrite prior decisions.

## Provenance, splitting and model export

Every run records schema version, configuration hash, implementation hash, source
locator, byte hash, raw object and evidence. A source-code snapshot and parser/package
versions are saved in `implementation/` and `environment.json`. Exact file aliases, full percussion
fingerprints and source provenance groups form connected split groups. Conflicting
official split assignments quarantine all affected records. Generic sources use
deterministic group-level 80/10/10 assignment. `group_by: parent` is conservative
for session folders; choose groups based on actual source provenance. No automatic
drummer-disjoint or song-disjoint guarantee is claimed without those identities.

The optional HVO adapter imposes explicit additional restrictions:

- Eight-quarter-note windows within 4/4 regions, aligned from the meter-region start.
- Known initial tempo/meter, constant tempo within a window, 30–300 BPM.
- All selected notes representable by the nine-voice model map.
- Strongest velocity wins a grid collision; windows with >5% collided events are
  excluded by default. The canonical event corpus remains unquantized.
- HVO hashes rounded to four decimal places identify cross-split duplicate windows;
  all sides of a cross-split collision are excluded. Within-split duplicates are
  deduplicated. Hit-only structural overlap is reported separately for review.

Hit-grid overlap can be ordinary rhythmic vocabulary and is not automatically proof
of shared recording provenance. Full near-duplicate alignment and drummer-held-out
evaluation remain future work. The export card reports every exclusion count and
style labels that become `unknown` in the CVAE vocabulary.

The exported `train.npz`, `validation.npz` and `test.npz` can be read by the existing
training script with `--data`. For the verified run, arrays are in
`data/unified-hvo-20261008`. No new training was started in this preprocessing change;
the previous checkpoint remains a separate baseline. Review representation loss
before treating the HVO export as the final v2 training corpus.

## Verification

```sh
.venv/bin/python -m pytest -q
.venv/bin/python scripts/check_metadata_web.py
```

Tests exercise metadata precedence/conflicts, missing tempo, false genre keywords,
folder/sidecar/archive evidence, nonstandard percussion channels, melodic negatives,
program segmentation, type-0 channel scoping, MIDI note-off semantics, TD-11 vs GM,
RMID, unsupported time divisions, web ambiguity/errors/cache, MIDI-bound tempo
evidence, reviewer overrides, split conflicts and the final model adapter.

Provider documentation: [MusicBrainz search/API](https://musicbrainz.org/doc/MusicBrainz_API),
[rate limiting](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting),
[Brave search API](https://api-dashboard.search.brave.com/app/documentation/web-search/responses).
MIDI format reference: [MIDI Association — Standard MIDI Files](https://midi.org/standard-midi-files).

## Groove/fill roles and composition (2026-10-09)

Canonical ingestion now collects field-level `role` evidence (`groove`, `fill`,
`mixed`, `unknown`) from MIDI labelled text, manifests, sidecars, library-like
track/file/folder labels, source defaults and reasoned review annotations. Unknown
roles remain unknown. A generic SSD filename such as `Groove 01` does not override
its `Fills` folder. Arbitrary song titles containing “fill” are not role labels.
Conflicting reliable role evidence follows the existing quarantine policy.

GMD `beat_type=beat/fill` supplies groove/fill labels. The `egmd` adapter reads
`e-gmd-v1.0.0.csv`, preserving official splits and the original performance ID across
kit variants. Use the appropriate mapping; adapter selection is explicit. A long
performance labelled `beat` may still contain musical fills: these are dataset role
labels, not event-level human verification of fill absence. Unlabelled/mixed files
are preserved with unknown supervision, not labelled negative.

For a verified individual file, a sidecar can declare:

```json
{"style": "funk", "role": "fill", "tempo": 120, "meter": "4/4", "phrase_beats": 2}
```

`phrase_beats` is an explicit musical boundary, independent of note-off tails. If
it excludes an onset, export refuses the file rather than silently cutting it.
Do not add guessed values merely to pass acceptance. The same fields work through
source defaults or reasoned review annotations; defaults should only apply to a
homogeneous, verified source.

### Pairing and duration

The model adapter remains **8 quarter-note beats / 32 steps / 9 voices** in 4/4.
Original windows are preserved where representable. For every compatible pair of
a groove window and a short fill, trim the groove prefix to `8 - fill_length` and
append the entire fill, including its leading silence, **before quantization**.
No fill notes are dropped to force a match. Whole 8-beat fills can be exported as
original fill-only windows but cannot leave room for a groove prefix. Longer fills
need separately verified segmentation and are not automatically chopped into a
short fill pool. Non-4/4 and tempo-changing regions remain in the canonical corpus.

Default fill boundary policy `next_bar` uses the next 4-beat boundary strictly after
the last onset. This is an **explicit inference**, recorded as
`fill_boundary_basis=inferred_next_bar_after_last_onset`. It avoids treating a long
note-off tail as phrase length. A resolution note exactly at beat 4 is retained,
therefore moves the inferred boundary to beat 8 and prevents short-fill composition.
Leading silence is preserved. `fill_boundary: strict` instead requires an exact
quarter-beat-aligned MIDI end or explicit `phrase_beats`; it does not guess length.
An explicit `phrase_beats` overrides either policy.

Compatibility requires the same canonical split, an exact shared normalized style
label, and (by default) the same configured source. It does **not** match via coarse
CVAE styles (e.g. house and techno do not pair just because both map to electronic).
`pair_scope: corpus` explicitly enables pairing between configured sources.
With `tempo_policy: groove`, fill beat coordinates/velocities are preserved and the
whole result plays at the groove tempo; the original fill BPM and tempo ratio are
recorded. Default `max_tempo_ratio: 1.25` rejects more extreme tempo adaptation.
`tempo_policy: match` additionally requires absolute BPM difference within
`tempo_tolerance_bpm` (default 1). No tempo curve is flattened silently.

Original duplicate groups/splits are assigned before composition; parents never
cross splits. Exact post-quantization cross-split duplicates and conflicting fill
supervision are removed on all sides. Near-duplicates still require a separate
audit. Deterministic exhaustive pairing can heavily rebalance the data; keep
`synthetic` and parent provenance for later weighting/sampling during training.

### Export contract

`train.npz`, `validation.npz`, `test.npz` retain `drums`, `bpm`, `style` and add:

- `has_fill`: int8, `-1` unknown, `0` groove-labelled, `1` fill present.
- `fill_mask`: int8 `[N,32]`, structural fill region (not a hit mask); unknown is -1.
- `fill_hit_mask`: int8 `[N,32,9]`, membership at each decoded hit onset. Ignore
  inactive cells. This handles pickups encoded at step zero with a negative offset.
- `fill_start_beat`, `fill_duration_beats`: float32; NaN for absent/unknown boundaries.
- `synthetic`: boolean flag distinguishing composed samples from original windows.

Decode onset beats as **`((step + offset) / 4) % 8`**. Periodic grid encoding may place
a hit at 7.99 beats in step 0 with a negative offset; it must still play at 7.99,
not at zero. Strongest-velocity collision selection and the 5% rejection threshold
remain explicit and are counted. `manifest.json` and streaming `manifest.jsonl`
include per-split indices, parent IDs/groups, source starts, full style labels,
fill source/BPM/duration/boundary basis and synthesis policy. `excluded.jsonl`
records rejected file/window/composition stages with source IDs and reasons.
`dataset-card.json` is written only on successful completion.

SQLite staging and disk-backed NumPy arrays bound the export's tensor/product RAM.
Staged tensors are losslessly compressed, exclusions stream directly to JSONL,
and final rows stream in primary-key order without sorting tensor payloads.
Temporary NumPy arrays are removed after each split is compressed. Allow space for
the staging database, the largest split's uncompressed arrays, final NPZ files,
and JSON manifests/exclusions. Each uncompressed sample needs about 3.8 KB for
arrays alone; five million retained samples would need about 19 GB, before the
database and metadata. SQLite may also use the system temporary directory for
other grouping operations; `SQLITE_TMPDIR` can point to an existing writable
directory on a larger disk, and `--output` controls the staging/array location.
The default
`max_combinations: 1000000` **fails explicitly** before generating an oversized
product, rather than truncating it. Raise it or set it to null deliberately. A failed
export has no dataset card and should not be consumed; use a fresh output directory
on retry. Canonical ingestion remains available independently.

After a combination-limit or disk-space failure, use `scripts/export_hvo.py`
with the existing canonical run instead of re-running ingestion:

```sh
.venv/bin/python scripts/export_hvo.py \
  --run data/2groove2-canonical/runs/20261009T150754276820Z-a30858d9 \
  --output data/2groove2-hvo-5m-retry \
  --config configs/hvo-remote-5m.json
```

The config here contains HVO options directly, including `max_combinations`.
Increasing that limit permits more pairs; it does not reduce disk requirements.

The existing CVAE does not yet consume these conditioning fields. Creating labelled
arrays alone does not implement inference-time fill control; model/trainer/UI
conditioning is a separate next step.

### Remote multi-dataset workflow

`configs/ingest-remote.example.json` includes the selected local collections and
**GigaMIDI**. Replace `/datasets` with the remote dataset root, and adjust the GMD
path separately if needed. This is the intended source inventory, not a claim
that all pending mapping profiles or million-file resource use are validated.
Unknown mappings/metadata retain the normal quarantine and exclusion behavior.

For GigaMIDI, transfer `train_80/`, `validation_10/`, `test_10/`, and
`Final-Metadata-Extended-GigaMIDI-Dataset-updated.csv` together. The remote machine
builds its own reusable metadata index; copying the local index is unnecessary.
Test GigaMIDI independently using `configs/ingest-gigamidi.example.json` and
`--max-files 1000` before a full run. This limits MIDI decoding, not the initial
complete CSV indexing pass. A mixed config's global file cap can stop before
GigaMIDI is reached. Full-scale RAM/disk use still needs measurement: canonical
ingestion retains manifest/grouping state in memory even though CSV indexing and
directory discovery are incremental. Style requirements remain enabled; including
the source does not mean all 1.28 million files become training examples.

Copy `configs/ingest-groove-fill.example.json`, replace source paths/IDs and verify
per-source mapping/metadata. Test sources separately or use the stratified sample
auditor; a global `--max-files` can stop before later sources are reached.

```sh
.venv/bin/python scripts/ingest_midi.py \
  --config configs/my-remote-datasets.json \
  --export-hvo data/my-fill-aware-hvo
```

To change composition settings without rescanning raw MIDI or repeating web calls:

```sh
.venv/bin/python scripts/export_hvo.py \
  --run data/combined-canonical/runs/<run-id> \
  --output data/hvo-reexport \
  --config configs/hvo-fill.example.json
```

The latter config contains only HVO options; ingestion config contains them under
`hvo`. All relative paths resolve from the current working directory (`v2` in these
examples). Preserve the full canonical run, not just NPZ files, for provenance and
rejection inspection on another machine.

A deterministic, filename-stratified local audit is available:

```sh
.venv/bin/python scripts/check_dataset_samples.py \
  --root /path/to/datasets \
  --output artifacts/my-dataset-audit \
  --per-role 12
```

It inventories with `rg`, copies bounded MIDI samples and matching sidecars into the
fresh output directory, preserves E-GMD manifest rows, and tests generic sources
without invented style/tempo defaults or online lookup. Its inventory includes
selected relative paths and content hashes. Vendor-specific GM assumptions, custom
CSV schemas, installers and unknown phrase boundaries can require adapters/review.
This audit is not a full-corpus parse or classification accuracy benchmark. The
canonical ingest still retains discovery/manifest/grouping state in RAM; million-file
end-to-end resource use has not been load-tested. Do not infer whole-library readiness
from a few accepted samples.

### Findings incorporated from local collection samples

Library folder templates such as `GM - Jazz` and `Skate Punk Essentials (Ron D.
Rock)` can supply style evidence without treating arbitrary song titles as genres.
Camel-case filenames such as `135bpmMediumBeat4` expose their explicit tempo/role.
A range such as `130 - 150 BPM` is not a scalar tempo. A fill marker later in a MIDI
file marks mixed/section evidence rather than labelling the entire performance a
pure fill. Unknown/mixed roles do not become no-fill training targets.

Recognized vendor-map branches (e.g. `SD3`, `SSD`, `IMAP`, `GM - Jazz FPC`, `Doom SSD3.5`
where recognized) must not silently inherit a GM map. Detected unresolved branches
are quarantined with `unverified_vendor_mapping`. Coverage is deliberately limited
to recognized naming templates, not a guarantee to identify every custom map.
Choose a verified per-source `custom`/`roland_td11` map, or set source
`mapping_verified: true` only after verifying that the configured GM map actually
matches that source. A per-file review can also supply `mapping_verified: true`
along with a reason. An unrelated tempo correction does not waive mapping review.

Before splitting, percussion fingerprints now sort normalized voice/onset/velocity
triples, falling back to full instrument or raw pitch only when necessary. This
links known vendor pitch aliases and ignores track event ordering, including for
short fills that never produce standalone HVO windows. The row records
`percussion_hash_basis=sorted_normalized_voice_onset_velocity_v2`. This is a change
in the grouping basis; do not combine old and new canonical runs as though their
fingerprint definitions were identical. Within source-scoped pair pools, a duplicate
in another source does not erase that source's own pairing opportunities; final
HVO tensors are deduplicated afterward.

## GigaMIDI and Lucerne adapters

Use `configs/ingest-gigamidi.example.json` or
`configs/ingest-lucerne.example.json`, replacing `/path/to/datasets` with your
actual dataset directory. To ingest several collections together, put their
source objects in one configuration's `sources` array. `--max-files` is a global
limit: test the two sources separately if each needs coverage.

```sh
# Run from v2. Edit source paths in the example first.
.venv/bin/python scripts/ingest_midi.py --config configs/ingest-gigamidi.example.json --max-files 40
.venv/bin/python scripts/ingest_midi.py --config configs/ingest-lucerne.example.json --export-hvo data/lucerne-hvo
```

**GigaMIDI (`adapter: gigamidi`).** Supports the local SMF release with
`Final-Metadata-Extended-GigaMIDI-Dataset-updated.csv`. It locates one
`*Metadata*GigaMIDI*.csv` immediately inside the source root, or accepts an explicit
source `metadata_path` pointing to the CSV. Set that field when `path` is a single
MIDI, a sample directory, or a ZIP. The metadata CSV must be available on disk;
its schema is validated rather than inferred from arbitrary CSVs.

The initial run streams the **entire CSV**, even with `--max-files 1`, into a
persistent SQLite index under `metadata_cache` (default `data/metadata-index`).
This bounds CSV memory and makes later runs reuse the index. The inspected local
2,136,218-row CSV produces an approximately 1.4 GB index; allow temporary disk space
during construction. An interrupted build never publishes a partial cache. The
cache key includes CSV path, size, modification time and adapter version; initial
CSV SHA256 and matching row number are recorded with every canonical record.
Delete the index if a CSV has been replaced while preserving size and modification
time. MIDI discovery is incremental, so a small file limit does not first
materialize the whole million-file directory tree.

Joins use the **MD5 of the actual MIDI bytes**, not a filename guess. Missing or
conflicting matches and contradictory split directories are quarantined. Official
train/validation/test identity comes from the matched CSV path, with title+artist
used conservatively to group song variants. Curated style labels score .98;
scraped style is a .84 fallback when curated labels are absent. Audio-linked labels
and alternatives to curated styles remain visible at .60, below the default
acceptance threshold. These are evidence rules, not calibrated probabilities.
Tempo is parsed without executing serialized objects; missing tempo is not silently
filled with 120 BPM. Loopability/loop boundaries and raw metadata are preserved but
**do not imply a groove/fill label**. Hash-only filenames are not sent to web search.

The directory/CSV label `drums-only` is not routing ground truth: the local sample
includes melodic program/channel content under that label. Percussion still goes
through the normal stream assessment and mapping policy. Missing style or actual
drum content stays unresolved/excluded; the adapter does not make every file
trainable by relabelling it.

**Lucerne (`adapter: lucerne`).** Targets the local **444-stimulus** release, not
the older 250-pattern corpus. Requires `stimuli.csv` and `events.csv` at the dataset
root. `path` may point to the root or its `MIDI` directory; for copied samples or
ZIP inputs, set `metadata_path` to the original metadata root. `RPP/<Stimulus>.RPP`
supplies the rendering project's reference meter. If absent, no meter is invented:
canonical ingestion can succeed, but HVO export requires an explicitly supplied
meter or review annotation. The RPP meter is a project reference, not independently
verified score-level meter. `observations.csv` (participant-level data) is not read.

The adapter verifies the 300 BPM MIDI carrier and six count-in triggers at beats
0, 2, 4, 5, 6, 7, estimates the actual beat period, checks it against the rounded
`stimuli.csv` tempo (within .1 BPM), and removes the eight-beat count-in and rendering
tail. It matches each annotated percussion event against the expected channel and
EZDrummer trigger pitch within 2 ms, records residuals, and requires all musical
percussion triggers to be accounted for. Unknown instruments, routes, timing or
carrier layouts quarantine the file instead of falling back to GM.

The supplied mapping makes note 39 a **snare** on channel 1; it is a clap on the
auxiliary percussion route. Bass and keyswitches, count-in clicks, and the silent
end marker are excluded. Multiple annotations can reference one MIDI trigger
(e.g. a sampled flam); the physical trigger is emitted once with every annotation
retained. Original velocity and measured timing survive a linear seconds-to-beats
conversion; events are not snapped to annotated metric positions. Sub-tick negative
round-off at the first onset is clamped to zero (at most the recorded decoding
tolerance). Half-open hats fold to open hats, toms to mid-tom, and snare articulations
to snare for the current nine-voice model. Original articulation names remain in
canonical events; auxiliary percussion remains canonical but excludes affected HVO
windows rather than being silently dropped.

Raw carrier MIDI remains under `midi`; normalized drums use a separate
`event_timeline` containing the time transform. `source_annotations` retain CSV
positions, accents and row numbers. `source_metadata.raw` retains stimulus-level
MOV/PLE/REG/INT/ENE and other supplied measurements; these are not yet model
conditioning inputs, and pleasure is not automatically relabelled as valence.
Title+artist groups keep related excerpts together across splits. Roles stay
`unknown`, so neither dataset seeds automatic groove+fill combinations without
additional role annotations.

Dataset references: [GigaMIDI release documentation](https://huggingface.co/datasets/Metacreation/GigaMIDI/blob/main/README.md),
[Lucerne 444-stimulus publication](https://doi.org/10.3758/s13428-026-02989-z).
The concrete Lucerne decoder is grounded in the local `_readme.docx`, `events.csv`,
MIDI, RPP files and supplied drum mappings; its inferred count-in layout is checked
per file. See `dataset-adapters-validation.json` for actual test scope and results.

## Filename and folder metadata in commercial collections

The generic metadata reader also supports inspected naming layouts in
`800000_Drum_Percussion_MIDI` and `Almighty_pack`; a separate adapter setting is
not required. It now searches every ancestor **inside the input collection**,
instead of stopping after four directory levels. Preserve the original tree when
copying to the remote host.

Examples include `26@METAL_(1#4)` (metal), `08 Indie` (indie),
`122bpmDoneFill 011.mid` (122 BPM, fill), and `141bpmDeadBeat10.mid`
(141 BPM, groove in the Ron D. Rock/Anthology naming profile). In GM MIDI Pack
paths, `140 Basic Swing 02 Hats Fill.mid` supplies BPM and fill role. These compact
filename grammars are scoped to recognized library layouts; arbitrary song titles
do not gain labels merely because they contain a genre or the word "fill".
The explicit catalog aliases `KVLT2 - Black Metal MIDI Pack` and
`Djentastic (Ron D. Rock)` resolve to metal and djent respectively.

The closest informative style/role folder supplies inherited metadata. More distant
labels remain visible with `scope: ancestor_context` and a .60 evidence score:
`Electronic/Techno` does not create a contradictory style assignment at the default
.80 threshold. Explicit filename roles likewise take precedence over containing
Grooves/Fills folders. MIDI-vs-filename tempo disagreements still require review.

A file called `Fill12.mid` has no implied BPM; `Theme-80` and `Beat-179-0` contain
indices, not verified tempos. Product codes such as `RE1`/`RE2` are not genres.
Missing role remains unknown; absence of "fill" does not prove a groove-only clip.
Percussion routing and vendor-map checks remain independent of metadata extraction.

See [library-names-validation.json](library-names-validation.json) for the paired
before/after audit on 612 files. The counts show parser coverage on a branch sample,
not full-corpus acceptance or correctness rates. These collections should be copied
with names/metadata intact and processed by branch; metadata misses alone were not
sufficient grounds for excluding the entire collections from transfer.
