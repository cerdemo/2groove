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
