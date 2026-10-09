"""Dataset-specific, auditable decoding of local SMF distributions.

Never equate a collection's name/subset label with a verified percussion route.
Raw MIDI stays in record['midi']; normalized timing is a separate event_timeline.
"""
from collections import defaultdict
from contextlib import closing
import ast
import csv
import hashlib
import json
import math
from pathlib import Path
import re
import sqlite3
import tempfile
import zlib

import numpy as np


def fingerprint(path):
    with Path(path).open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()


def finite_number(value):
    result=float(value)
    if not math.isfinite(result):raise ValueError('adapter_requires_finite_numeric_metadata')
    return result


def split_name(path):
    for part in Path(path).parts:
        if re.fullmatch(r'(?:training|train)(?:[-_].*)?', part, re.I):return 'train'
        if re.fullmatch(r'(?:validation|valid|val)(?:[-_].*)?', part, re.I):return 'validation'
        if re.fullmatch(r'test(?:[-_].*)?', part, re.I):return 'test'


def labels(value):
    value=(value or '').strip()
    if not value or value.lower() in ('nan','none','null','unknown','[]'):return []
    if len(value)>10000:raise ValueError('gigamidi_style_requires_review: oversized label')
    if value.startswith(('[','{','(')):
        try:result=ast.literal_eval(value)
        except (ValueError,SyntaxError,RecursionError):raise ValueError('gigamidi_style_requires_review: malformed list')
        if not isinstance(result,(list,tuple)) or not all(isinstance(x,str) for x in result):
            raise ValueError('gigamidi_style_requires_review: expected string labels')
        return [x.strip() for x in result if x.strip()]
    return [x.strip() for x in re.split(r'[,;|]',value) if x.strip()]


class GigaMIDI:
    """Streaming CSV -> persistent SQLite index; byte-MD5 join, never basename-only.

    Cache freshness uses path/size/mtime; the initial index also records CSV SHA256.
    Delete the cache to force verification if a file was replaced preserving its stat.
    """
    VERSION=1

    def __init__(self,source,progress=print):
        root=Path(source.path)
        if source.metadata_path:self.manifest=Path(source.metadata_path).resolve()
        else:
            directory=root if root.is_dir() else root.parent
            matches=sorted(directory.glob('*Metadata*GigaMIDI*.csv'))
            if len(matches)!=1:raise ValueError('gigamidi_requires_metadata_path: expected one metadata CSV')
            self.manifest=matches[0].resolve()
        stat=self.manifest.stat()
        stamp=dict(path=str(self.manifest),size=stat.st_size,mtime_ns=stat.st_mtime_ns,version=self.VERSION)
        key=hashlib.sha256(json.dumps(stamp,sort_keys=True).encode()).hexdigest()
        cache=Path(source.metadata_cache).resolve();cache.mkdir(parents=True,exist_ok=True)
        self.index=cache/(key+'.sqlite')
        if not self.index.exists():
            progress('GigaMIDI: building metadata index (one complete CSV pass, independent of --max-files)')
            # An interrupted/concurrent build never publishes a partial index.
            with tempfile.TemporaryDirectory(prefix='.gigamidi-',dir=cache) as temp:
                path=Path(temp)/'index.sqlite'
                old_limit=csv.field_size_limit(16_000_000)
                try:
                    with closing(sqlite3.connect(path)) as db:
                        db.executescript('CREATE TABLE records(md5 TEXT,payload BLOB); CREATE TABLE info(payload TEXT);')
                        batch=[];count=0
                        with self.manifest.open(encoding='utf-8-sig',newline='') as f:
                            reader=csv.DictReader(f)
                            if not {'md5','file_path','Type'}.issubset(reader.fieldnames or []):
                                raise ValueError('gigamidi_requires_supported_csv_schema')
                            for line,row in enumerate(reader,2):
                                md5=row['md5'].strip().lower()
                                if not re.fullmatch('[0-9a-f]{32}',md5):
                                    raise ValueError(f'gigamidi_requires_valid_md5: CSV line {line}')
                                payload=dict(row={k:v for k,v in row.items() if v},line=line)
                                batch.append((md5,zlib.compress(json.dumps(payload,separators=(',',':')).encode(),1)))
                                count+=1
                                if len(batch)==10000:
                                    db.executemany('INSERT INTO records VALUES(?,?)',batch);batch=[];db.commit()
                                if count%250000==0:progress(f'GigaMIDI metadata: {count:,} rows indexed')
                        db.executemany('INSERT INTO records VALUES(?,?)',batch)
                        db.execute('CREATE INDEX md5_lookup ON records(md5)')
                        current=self.manifest.stat()
                        if (current.st_size,current.st_mtime_ns)!=(stat.st_size,stat.st_mtime_ns):
                            raise ValueError('gigamidi_metadata_changed_during_index')
                        info=dict(**stamp,sha256=fingerprint(self.manifest),rows=count)
                        db.execute('INSERT INTO info VALUES(?)',(json.dumps(info),));db.commit()
                    path.replace(self.index)
                finally:csv.field_size_limit(old_limit)
        with closing(sqlite3.connect(self.index)) as db:
            self.provenance=json.loads(db.execute('SELECT payload FROM info').fetchone()[0])

    def get(self,asset,raw):
        md5=hashlib.md5(raw).hexdigest()
        with closing(sqlite3.connect(self.index)) as db:
            matches=[json.loads(zlib.decompress(r[0])) for r in db.execute('SELECT payload FROM records WHERE md5=?',(md5,))]
        if not matches:raise ValueError('gigamidi_requires_metadata_match: MIDI byte MD5 absent from CSV')
        unique={json.dumps(m['row'],sort_keys=True):m for m in matches}
        if len(unique)!=1:raise ValueError('gigamidi_requires_unique_metadata: conflicting rows for byte MD5')
        match=next(iter(unique.values()));row=match['row']
        issues=[];official=split_name(row['file_path']);local=split_name(asset.relative)
        if official and local and official!=local:issues.append('gigamidi_split_path_conflict')
        curated=labels(row.get('music_styles_curated'))
        # Machine/scraped labels are retained, but do not silently become ground truth.
        alternatives={k:row[k] for k in row if k.startswith('music_style') and k!='music_styles_curated'}
        style_evidence=[]
        for field in ('music_styles_curated','music_style_scraped','music_style_audio_text_Discogs',
                      'music_style_audio_text_Lastfm','music_style_audio_text_Tagtraum'):
            items=labels(row.get(field))
            if items:
                score=.98 if field=='music_styles_curated' else .84 if field=='music_style_scraped' and not curated else .6
                style_evidence.append(dict(value=items,field=field,score=score))
        tempo=None
        value=row.get('tempo','')
        m=re.search(r'\btime=0(?:\.0)?\s*,\s*qpm=([\d.eE+-]+)',value)
        if m:tempo=float(m.group(1))
        elif re.fullmatch(r'\d+(?:\.\d+)?',value):tempo=float(value)
        title=row.get('title','').strip();artist=row.get('artist','').strip()
        group='song:'+artist.casefold()+'|'+title.casefold() if title and artist else md5
        return dict(adapter='gigamidi',style_evidence=style_evidence,tempo=tempo,title=title,artist=artist,role='unknown',
                    group_id=group,split=official,raw=row,alternative_styles=alternatives,
                    metadata_provenance=dict(**self.provenance,line=match['line'],join='verified_byte_md5',md5=md5),
                    adapter_issues=issues)


# Local library readme + supplied EZDrummer mappings; corroborated event-by-event.
# channel 1 (zero-based) is auxiliary percussion; channel 2 is bass/keyswitches.
LUCERNE_INSTRUMENTS={
 'BD':(0,36,'kick'),'CC':(0,49,'crash'),'CHC':(0,52,'crash'),
 'SD':(0,39,'snare'),'SDF':(0,39,'snare'),'SFi':(0,39,'snare'),
 'SDC':(0,37,'snare'),'SCF':(0,37,'snare'),'SDP':(0,29,'snare'),
 'SDB':(0,27,'snare'),'SDBF':(0,27,'snare'),
 'HH':(0,42,'closed-hihat'),'HHp':(0,44,'closed-hihat'),'HHP':(0,44,'closed-hihat'),
 'HHh':(0,93,'open-hihat'),'HHo':(0,46,'open-hihat'),'Hpo':(0,90,'open-hihat'),
 'RC':(0,51,'ride'),'RCc':(0,94,'ride'),'RBe':(0,53,'ride'),'Rbe':(0,53,'ride'),
 'SC':(0,55,'crash'),'TO':(0,47,'mid-tom'),
 'TA':(1,54,None),'CO':(1,56,None),'HC':(1,39,None),
 'SH':(1,82,None),'TR':(1,81,None),'CA':(1,69,None),
}


class Lucerne:
    def __init__(self,source):
        root=Path(source.metadata_path or source.path).resolve()
        if root.is_file():root=root.parent
        if not (root/'stimuli.csv').exists() and root.name=='MIDI':root=root.parent
        self.root=root;self.stimuli={};self.events=defaultdict(list)
        with (root/'stimuli.csv').open(encoding='utf-8-sig',newline='') as f:
            for row in csv.DictReader(f):
                key=row['Stimulus']
                if key in self.stimuli:raise ValueError('lucerne_requires_unique_stimulus')
                self.stimuli[key]=row
        with (root/'events.csv').open(encoding='utf-8-sig',newline='') as f:
            for line,row in enumerate(csv.DictReader(f),2):self.events[row['siglum']].append(dict(row,csv_line=line))
        self.provenance={name:dict(path=str(root/name),sha256=fingerprint(root/name)) for name in ('stimuli.csv','events.csv')}

    def get(self,asset,raw):
        key=Path(asset.member or asset.relative).stem
        row=self.stimuli.get(key)
        if row is None or key not in self.events:raise ValueError('lucerne_requires_stimulus_match')
        meter=None;provenance=dict(self.provenance)
        rpps=[self.root/'RPP'/(key+ext) for ext in ('.RPP','.rpp')]
        rpp=next((p for p in rpps if p.exists()),None)
        if rpp:
            content=rpp.read_text();m=re.search(r'^\s*TEMPO\s+[\d.]+\s+(\d+)\s+(\d+)\s*$',content,re.M)
            if m:meter=m.group(1)+'/'+m.group(2)
            provenance['rpp']=dict(path=str(rpp),sha256=fingerprint(rpp),meter_basis='render_project_reference')
        return dict(adapter='lucerne',stimulus=key,style=row['Style'],tempo=finite_number(row['Tempo']),meter=meter,
                    title=row['Title'],artist=row['Band'],role='unknown',
                    group_id='song:'+row['Band'].casefold()+'|'+row['Title'].casefold(),
                    raw=row,metadata_provenance=provenance)

    def decode(self,parsed,values):
        """Validate the 300 BPM carrier/count-in, then join typed MIDI triggers to CSV.

        A single linear time transform preserves expressive timing (no snapping).
        Meter is the RPP rendering reference, not a guessed value from note density.
        """
        events=self.events[values['stimulus']];notes=parsed['notes']
        issues=[];audit={};selected=[]
        for event in events:
            for field in ('time','position','duration'):finite_number(event[field])
        drum_rows=[e for e in events if float(e['duration'])==-1 and e['name']!='XX']
        if not drum_rows:
            if any(n['channel']!=2 and not (n['channel']==0 and n['pitch']==0) for n in notes):
                issues.append('lucerne_unexpected_nonbass_events')
            return [],[],None,issues,dict(reason='bass_only_stimulus')
        if not parsed['tempo_map'] or any(t['microseconds_per_quarter']!=200000 for t in parsed['tempo_map']):
            raise ValueError('lucerne_requires_300_bpm_carrier')
        clicks=[n for n in notes if n['channel']==0 and n['pitch']==35][:6]
        if len(clicks)!=6:raise ValueError('lucerne_requires_count_in')
        positions=np.array([0,2,4,5,6,7]);times=np.array([n['onset_beat']*.2 for n in clicks])
        seconds_per_beat,origin=np.polyfit(positions,times,1)
        tolerance=max(.00005,.2/parsed['ppq']*2)
        if seconds_per_beat<=0 or max(abs(times-(origin+positions*seconds_per_beat)))>tolerance:
            raise ValueError('lucerne_requires_regular_count_in')
        bpm=60/seconds_per_beat
        if abs(bpm-values['tempo'])>.1:raise ValueError('lucerne_requires_tempo_agreement')
        delay=8*seconds_per_beat;start=origin+delay
        # Reject extra/unknown routes rather than applying the GM map to them.
        click_ids={id(n) for n in clicks};matched=set();buckets=defaultdict(list)
        for i,n in enumerate(notes):
            if id(n) not in click_ids and n['channel'] in (0,1) and n['pitch']!=0:
                buckets[(n['channel'],n['pitch'])].append((i,n,n['onset_beat']*.2-delay))
        annotations=defaultdict(list);voice_by_index={};errors=[]
        for e in drum_rows:
            name=e['name'].removesuffix('.txt');spec=LUCERNE_INSTRUMENTS.get(name)
            if spec is None:issues.append('lucerne_unknown_event_instrument:'+name);continue
            channel,pitch,voice=spec
            options=buckets.get((channel,pitch),[])
            if not options:issues.append('lucerne_event_without_midi_trigger');continue
            target=float(e['time']);i,n,time=min(options,key=lambda item:abs(item[2]-target))
            # 2 ms accommodates supplied timestamp rounding; the residual is recorded.
            if abs(time-target)>.002:issues.append('lucerne_event_timing_mismatch');continue
            matched.add(i);annotations[i].append(e);voice_by_index[i]=voice;errors.append(abs(time-target))
        unmatched=[i for rows in buckets.values() for i,_,_ in rows if i not in matched]
        if unmatched:issues.append('lucerne_unmatched_midi_triggers')
        if any(n['channel'] not in (0,1,2) for n in notes):issues.append('lucerne_unexpected_midi_route')
        for i in sorted(matched):
            n=notes[i];onset=(n['onset_beat']*.2-start)/seconds_per_beat
            # Floating tick rounding can put the first trigger a few microseconds before zero.
            if -tolerance/seconds_per_beat<=onset<0:onset=0.
            if onset<0:issues.append('lucerne_negative_onset_requires_review')
            selected.append(dict(n,onset_beat=float(onset),duration_beats=None if n['duration_beats'] is None else n['duration_beats']*.2/seconds_per_beat,
                raw_onset_beat=n['onset_beat'],onset_seconds=n['onset_beat']*.2,
                instrument=annotations[i][0]['name'].removesuffix('.txt'),voice=voice_by_index[i],
                mapping_basis='lucerne_events_csv_verified_trigger',stream_id=f"t{n['track']}:p{n['port']}:c{n['channel']+1}:e{n['epoch']}",
                source_annotations=annotations[i]))
        streams=[]
        for channel in sorted({n['channel'] for n in notes}):
            streams.append(dict(id=f'lucerne:channel:{channel+1}',channel=channel+1,
                decision='percussion' if channel in (0,1) else 'non_percussion',evidence_score=1.,
                reasons=['lucerne_csv_trigger_verification' if channel in (0,1) else 'lucerne_bass_route'],
                features=dict(note_count=sum(n['channel']==channel for n in notes))))
        # Only musical content, not the MIDI end marker's long rendering tail.
        metric_end=max(float(e['position']) for e in events)
        duration=max(math.ceil(metric_end/4)*4,max((n['onset_beat']+(n['duration_beats'] or 0) for n in selected),default=0))
        timeline=dict(duration_beats=float(duration),tempo_map=[],meter_map=[],
                      basis='lucerne_count_in_linear_seconds_to_beats',bpm=float(bpm),
                      seconds_per_beat=float(seconds_per_beat),origin_seconds=float(start))
        # Use the exact count-in-derived tempo; CSV rounded tempo is retained in raw.
        values['tempo']=float(bpm)
        audit=dict(count_in_notes=6,matched_midi_triggers=len(matched),csv_drum_rows=len(drum_rows),
                   count_in_tolerance_seconds=tolerance,event_match_tolerance_seconds=.002,
                   unmatched_midi_triggers=len(unmatched),max_match_error_seconds=max(errors,default=0),
                   excluded_bass_notes=sum(n['channel']==2 for n in notes),
                   excluded_render_markers=sum(n['pitch']==0 and n['channel'] in (0,1) for n in notes))
        return streams,selected,timeline,sorted(set(issues)),audit
