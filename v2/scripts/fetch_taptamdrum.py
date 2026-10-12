"""Download only official MIDI files at a pinned revision; verify every Git blob hash."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path, PurePosixPath
from urllib.parse import quote
from urllib.request import Request, urlopen

REVISION = 'c1e9e56359135cec090b9a2e6feabf1c76123e40'
REPO = 'TapTamDrum/dataset'


def download(url):
    with urlopen(Request(url, headers={'User-Agent': '2groove-research-adapter'}), timeout=45) as response:
        return response.read()


def blob_hash(data):
    return hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest()


def fetch(output, max_patterns=None):
    output = Path(output)
    tree = json.loads(download(f'https://api.github.com/repos/{REPO}/git/trees/{REVISION}?recursive=1'))
    if tree.get('truncated'):
        raise ValueError('Incomplete upstream tree')
    files = [r for r in tree['tree'] if r['type'] == 'blob' and r['path'].startswith('midi_files/') and r['path'].endswith('.mid')]
    folders = sorted({str(PurePosixPath(r['path']).parent) for r in files})
    if max_patterns is not None:
        if max_patterns < 1:
            raise ValueError('max-patterns must be positive')
        folders = folders[:max_patterns]
    folders = set(folders)
    files = [r for r in files if str(PurePosixPath(r['path']).parent) in folders]
    output.mkdir(parents=True, exist_ok=True)
    def one(row):
        relative = PurePosixPath(row['path'])
        if relative.is_absolute() or '..' in relative.parts:
            raise ValueError('Unsafe upstream path')
        target = output.joinpath(*relative.parts)
        payload = target.read_bytes() if target.exists() else download(f'https://raw.githubusercontent.com/{REPO}/{REVISION}/{quote(row["path"])}')
        if blob_hash(payload) != row['sha']:
            raise ValueError(f'Hash mismatch: {relative}')
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(payload)
        return dict(path=str(relative), git_blob_sha1=row['sha'], sha256=hashlib.sha256(payload).hexdigest())
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = []
        for i, result in enumerate(pool.map(one, files), 1):
            results.append(result)
            if i % 100 == 0:
                print(f'{i}/{len(files)} MIDI files verified', flush=True)
    # Existing matching files are reused when a partial download is expanded to the full corpus.
    manifest = dict(repository=REPO, revision=REVISION, requested_patterns=len(folders), files=results,
                    note='Research source files only. Check upstream distribution terms before redistribution.')
    (output/'download.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'{len(files)} files / {len(folders)} patterns verified at {REVISION}', flush=True)
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path('data/taptamdrum-source'))
    parser.add_argument('--max-patterns', type=int)
    args = parser.parse_args()
    fetch(args.output, args.max_patterns)
