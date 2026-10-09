"""Bounded discovery, including MIDI members inside ZIP and RIFF RMID files."""
from dataclasses import dataclass
from collections import Counter
from pathlib import Path, PurePosixPath
import zipfile
import os

EXTENSIONS={'.mid','.midi','.kar','.smf','.rmi','.rmid'}
SKIP={'.git','.venv','node_modules','__pycache__'}


@dataclass
class Asset:
    path: Path
    relative: str
    member: str | None = None
    error: str | None = None

    @property
    def locator(self):return str(self.path.resolve())+('!'+self.member if self.member else '')

    def read(self,limit):
        if self.error:raise ValueError(self.error)
        if self.member:
            with zipfile.ZipFile(self.path) as z:
                with z.open(self.member) as f:data=f.read(limit+1)
        else:
            with self.path.open('rb') as f:data=f.read(limit+1)
        if len(data)>limit:raise ValueError('file_size_limit')
        return data


def discover(root,policy,excluded=()):
    root=Path(root).resolve()
    if not root.exists():raise FileNotFoundError(root)
    def walk(directory):
        # Deterministic traversal without materializing a million-file collection;
        # max-files can now stop discovery as well as MIDI decoding early.
        with os.scandir(directory) as entries:children=sorted(entries,key=lambda e:e.name)
        for entry in children:
            if entry.is_symlink() or entry.name in SKIP:continue
            path=Path(entry.path)
            if any(path.is_relative_to(x) for x in excluded):continue
            if entry.is_dir(follow_symlinks=False):yield from walk(path)
            elif entry.is_file(follow_symlinks=False):yield path
    paths=[root] if root.is_file() else walk(root)
    for p in paths:
        if not p.is_file() or p.is_symlink():continue
        if any(part in SKIP for part in p.parts):continue
        if any(p.resolve().is_relative_to(x) for x in excluded):continue
        rel=p.name if root.is_file() else p.relative_to(root).as_posix()
        if p.suffix.lower()=='.zip':
            try:
                with zipfile.ZipFile(p) as z:
                    entries=z.infolist()
                    if len(entries)>policy.max_archive_members:raise ValueError('archive_member_limit')
                    counts=Counter(i.filename for i in entries)
                    seen=set()
                    for item in sorted(entries,key=lambda i:i.filename):
                        name=PurePosixPath(item.filename)
                        if item.is_dir() or name.suffix.lower() not in EXTENSIONS:continue
                        error=None
                        if name.is_absolute() or '..' in name.parts or '\\' in item.filename:error='unsafe_archive_path'
                        elif counts[item.filename]>1:error='duplicate_archive_member'
                        elif item.file_size>policy.max_file_bytes:error='file_size_limit'
                        elif item.flag_bits&1:error='encrypted_archive_member'
                        seen.add(item.filename)
                        yield Asset(p,rel+'!'+item.filename,item.filename,error)
            except (ValueError,zipfile.BadZipFile,OSError) as e:yield Asset(p,rel,error=str(e))
        elif p.suffix.lower() in EXTENSIONS:
            yield Asset(p,rel,error='file_size_limit' if p.stat().st_size>policy.max_file_bytes else None)


def unwrap_rmid(data):
    if data[:4]!=b'RIFF':return data
    if data[8:12]!=b'RMID':raise ValueError('unsupported_riff_type')
    end=int.from_bytes(data[4:8],'little')+8
    if end>len(data):raise ValueError('truncated_rmid')
    pos=12
    while pos+8<=end:
        tag=data[pos:pos+4];size=int.from_bytes(data[pos+4:pos+8],'little');pos+=8
        if pos+size>end:raise ValueError('truncated_rmid_chunk')
        if tag==b'data':return data[pos:pos+size]
        pos+=size+(size%2)
    raise ValueError('rmid_without_midi_data')
