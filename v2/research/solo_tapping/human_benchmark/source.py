"""Pinned, read-only upstream acquisition. Never execute upstream Python/pickles."""
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import urllib.request
import zipfile

REVISION = 'e2a1590bb137c7284e8a78946470be07a032338c'
REPOSITORY = 'peter-clark/investigating-human-tapping-behavior-polyphonic-rhythms'
ARCHIVE_SHA256 = 'b675ccd82f788c583d040fa5113d9f453c1ae5d7f7675de551017b115fa287bc'
URL = f'https://codeload.github.com/{REPOSITORY}/zip/{REVISION}'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def write_json(path, value):
    Path(path).write_text(json.dumps(value, indent=2, allow_nan=False) + '\n')


def fetch(output, archive=None):
    """A fresh output directory is mandatory; --archive supports offline replay."""
    output = Path(output)
    if output.exists():
        raise FileExistsError(output)
    if archive is None:
        with urllib.request.urlopen(URL, timeout=60) as response:
            payload = response.read(30_000_001)
    else:
        payload = Path(archive).read_bytes()
    if digest(payload) != ARCHIVE_SHA256:
        raise ValueError('Pinned upstream ZIP checksum mismatch')
    selected = {}
    with zipfile.ZipFile(io.BytesIO(payload)) as z:
        for info in z.infolist():
            parts = PurePosixPath(info.filename).parts
            if info.is_dir() or len(parts) < 2:
                continue
            rel = PurePosixPath(*parts[1:])
            if rel.is_absolute() or '..' in rel.parts:
                raise ValueError('Unsafe archive path')
            name = str(rel)
            keep = (name.startswith('midi/') and rel.suffix.lower() == '.mid') or name in {
                'data/tapexplore.csv', 'data/tap_rhythm_contour_raw.csv',
                'data/raw_subjects.csv', 'data/patterns_by_subject_[ORDERED].csv',
                'data/patterns.pkl', 'functions.py', 'descriptors.py', 'LICENSE', 'README.md',
            }
            if keep:
                if name in selected or info.file_size > 3_000_000:
                    raise ValueError('Duplicate or oversized upstream member')
                selected[name] = z.read(info)
    output.mkdir(parents=True, exist_ok=False)
    for name, data in selected.items():
        target = output / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    manifest = dict(repository=REPOSITORY, revision=REVISION, url=URL,
                    archive_sha256=ARCHIVE_SHA256,
                    files={name: digest(data) for name, data in sorted(selected.items())},
                    license='Upstream repository GPL-3.0; retain LICENSE. No raw data bundled in source control.')
    write_json(output / 'source.json', manifest)
    return manifest


def verify(directory):
    directory = Path(directory)
    manifest = json.loads((directory / 'source.json').read_text())
    if manifest['revision'] != REVISION or manifest['archive_sha256'] != ARCHIVE_SHA256:
        raise ValueError('Unexpected upstream revision')
    for name, expected in manifest['files'].items():
        path = PurePosixPath(name)
        if path.is_absolute() or '..' in path.parts:
            raise ValueError('Unsafe manifest path')
        if digest((directory / name).read_bytes()) != expected:
            raise ValueError(f'Changed upstream file: {name}')
    return manifest

