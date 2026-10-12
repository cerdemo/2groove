"""Disk-staged HVO export with split-safe, provenance-preserving fill composition."""
from collections import Counter
import gzip
import hashlib
import json
from pathlib import Path
import sqlite3
import tempfile
import zlib
import numpy as np
from .schema import HVOConfig
from ..events import DRUMS,STYLES


def model_style(labels):
    coarse={'afrocuban':'latin','afrobeat':'latin','samba':'latin','bossa-nova':'latin','house':'electronic','techno':'electronic','drum-and-bass':'electronic','trap':'hiphop'}
    targets={coarse.get(s,s) for s in labels if coarse.get(s,s) in STYLES}
    return STYLES.index(next(iter(targets)) if len(targets)==1 else 'unknown')


def quantize(events,stats,max_collision_rate):
    if not events:stats['empty_windows']+=1;return None
    if any(n['voice'] not in DRUMS for n in events):stats['outside_nine_voice_windows']+=1;return None
    y=np.zeros((32,9,3),np.float32);collisions=0
    for n in events:
        local=n['onset_beat']*4;nearest=round(local);step=nearest%32
        # Periodic HVO: decode ((step + offset) / 4) % 8, including terminal pickups.
        if not 0<=n['onset_beat']<8:stats['boundary_grid_rejected_windows']+=1;return None
        part=DRUMS.index(n['voice']);velocity=n['velocity']/127
        collisions+=int(y[step,part,0]>0)
        if velocity>=y[step,part,1]:y[step,part]=[1,velocity,local-nearest]
    stats['grid_collisions']+=collisions
    if collisions/len(events)>max_collision_rate:stats['collision_rejected_windows']+=1;return None
    return y,collisions


def initial_maps(record):
    meta=record['metadata'];midi=record.get('event_timeline',record['midi'])
    if 'tempo' not in meta or 'meter' not in meta:return None
    meters={m['beat']:[m['numerator'],m['denominator']] for m in midi['meter_map']}
    meters[0]=meta['meter']['value']
    tempi={t['beat']:t['bpm'] for t in midi['tempo_map']};tempi[0]=meta['tempo']['value']
    return sorted(meters.items()),sorted(tempi.items())


def constant_tempo(tempi,begin,length):
    bpm=next(value for beat,value in reversed(tempi) if beat<=begin)
    if any(begin<beat<begin+length and abs(value-bpm)>.01 for beat,value in tempi):return None
    return bpm if 30<=bpm<=300 else None


def export_hvo(run_path,output,max_collision_rate=.05,options=None):
    run_path=Path(run_path);output=Path(output)
    if not 0<=max_collision_rate<=1:raise ValueError('max_collision_rate must be between 0 and 1')
    saved=json.loads((run_path/'config.json').read_text())
    options=options or HVOConfig.model_validate(saved.get('hvo',{}))
    if output.exists():raise FileExistsError('Use a fresh model-export directory')
    output.mkdir(parents=True)
    stats=Counter()
    # SQLite stores tensors, clip events, metadata and joins; no Cartesian product in RAM.
    with tempfile.TemporaryDirectory(prefix='.hvo-stage-',dir=output) as temporary, (output/'excluded.jsonl').open('w') as exclusions:
        stage=Path(temporary);db=sqlite3.connect(stage/'index.sqlite')
        try:
            db.executescript('''
                PRAGMA temp_store=FILE;
                CREATE TABLE windows(id INTEGER PRIMARY KEY,split TEXT,hash TEXT,structure TEXT,label TEXT,y BLOB,meta TEXT);
                CREATE INDEX window_hash ON windows(hash);
                CREATE TABLE clips(id INTEGER PRIMARY KEY,role TEXT,split TEXT,scope TEXT,bpm REAL,length REAL,source TEXT,events TEXT,meta TEXT);
                CREATE TABLE styles(clip INTEGER,style TEXT,PRIMARY KEY(clip,style));
                CREATE INDEX style_name ON styles(style,clip);
                CREATE INDEX clip_role ON clips(role,split,scope);
                CREATE TABLE seen(hash TEXT PRIMARY KEY);
                CREATE TABLE identities(hash TEXT,role TEXT,split TEXT);
            ''')
            # Conflicting labels or pre-existing split leakage must not seed synthetic pairs.
            with (run_path/'manifest.jsonl').open() as handle:
                for line in handle:
                    row=json.loads(line)
                    if row['status']=='accepted':
                        role=row.get('metadata',{}).get('role',{}).get('value','unknown')
                        db.execute('INSERT INTO identities VALUES(?,?,?)',(row['percussion_hash'],role,row.get('split')))
            invalid={row[0] for row in db.execute('SELECT hash FROM identities GROUP BY hash HAVING count(DISTINCT role)>1 OR count(DISTINCT split)>1')}

            def log_exclusion(reason,meta):
                exclusions.write(json.dumps(dict(meta,reason=reason))+'\n')

            def omit(reason,meta):
                stats[reason]+=1;log_exclusion(reason,meta)

            def add_window(events,meta):
                before=stats.copy()
                value=quantize(events,stats,max_collision_rate)
                if value is None:
                    reason=next((key for key in ('empty_windows','outside_nine_voice_windows','boundary_grid_rejected_windows','collision_rejected_windows') if stats[key]>before[key]),'quantization_rejected')
                    log_exclusion(reason,meta);return
                y,collisions=value
                meta=dict(meta,collisions=collisions)
                fingerprint=hashlib.sha256(np.round(y,4).tobytes()).hexdigest()
                structure=hashlib.sha256(y[...,0].tobytes()).hexdigest()
                label=json.dumps([meta['has_fill'],meta['fill_start_beat'],meta['fill_duration_beats']])
                meta.update(hash=fingerprint,structure_hash=structure)
                db.execute('INSERT INTO windows(split,hash,structure,label,y,meta) VALUES(?,?,?,?,?,?)',
                           (meta['split'],fingerprint,structure,label,zlib.compress(y.tobytes(),level=1),json.dumps(meta)))

            def add_clip(role,events,meta,length,labels):
                scope=meta['source_id'] if options.pair_scope=='source' else '*'
                cursor=db.execute('INSERT INTO clips(role,split,scope,bpm,length,source,events,meta) VALUES(?,?,?,?,?,?,?,?)',
                    (role,meta['split'],scope,meta['bpm'],length,meta['source'],json.dumps(events),json.dumps(meta)))
                db.executemany('INSERT INTO styles VALUES(?,?)',[(cursor.lastrowid,label) for label in sorted(set(labels))])

            with (run_path/'manifest.jsonl').open() as handle:
                for line in handle:
                    row=json.loads(line)
                    if row['status']!='accepted':omit('excluded_'+row['status'],row);continue
                    if row.get('split') not in ('train','validation','test'):omit('missing_split',row);continue
                    if row['percussion_hash'] in invalid:omit('conflicting_duplicate_role_or_split',row);continue
                    dedup_key=row['percussion_hash']+(':'+row['source_id'] if options.pair_scope=='source' else '')
                    if db.execute('INSERT OR IGNORE INTO seen VALUES(?)',(dedup_key,)).rowcount==0:
                        omit('duplicate_files',row);continue
                    with gzip.open(run_path/row['record'],'rt') as f:record=json.load(f)
                    maps=initial_maps(record)
                    if maps is None:omit('missing_initial_tempo_or_meter',row);continue
                    meters,tempi=maps;notes=record['percussion_events'];metadata=record['metadata']
                    labels=metadata.get('style',{}).get('value',[])
                    role=metadata.get('role',{}).get('value','unknown')
                    stats['role_'+role+'_files']+=1
                    if any(c['field']=='role' for c in record.get('metadata_conflicts',[])):
                        role='unknown';stats['role_conflict_unconditioned_files']+=1
                    duration=record.get('event_timeline',record['midi'])['duration_beats']
                    phrase=metadata.get('phrase_beats',{}).get('value')
                    if phrase is not None:
                        if any(n['onset_beat']>=phrase for n in notes):omit('phrase_excludes_notes',row);continue
                        duration=phrase
                    base=dict(style=model_style(labels),style_labels=labels,source=row['id'],source_id=row['source_id'],
                        split=row['split'],group=row['split_group'],role=role,synthetic=False,
                        parent_ids=[row['id']],parent_groups=[row['split_group']],has_fill=-1,
                        fill_start_beat=None,fill_duration_beats=None,tempo_policy='original')
                    if base['style']==STYLES.index('unknown'):stats['files_with_unknown_model_style']+=1
                    # A file end often includes note-off tails, not the musical phrase end.
                    if role=='fill' and options.combine_fills:
                        length=round(duration*4)/4
                        boundary_basis='explicit_phrase_beats' if phrase is not None else 'midi_end'
                        if phrase is None and options.fill_boundary=='next_bar' and notes:
                            # Include every onset, including a resolution hit exactly on the next downbeat.
                            length=(int(max(n['onset_beat'] for n in notes)//4)+1)*4.
                            boundary_basis='inferred_next_bar_after_last_onset'
                        bpm=constant_tempo(tempi,0,length)
                        if not 0<length<8:omit('fill_not_shorter_than_window',base)
                        elif (phrase is not None or options.fill_boundary=='strict') and abs(length-duration)>1e-6:omit('fill_non_grid_phrase_length',base)
                        elif any(meter!=[4,4] for beat,meter in meters if beat<length):omit('fill_non_four_four',base)
                        elif bpm is None:omit('fill_unsupported_tempo',base)
                        elif not notes or any(n['voice'] not in DRUMS for n in notes):omit('fill_unmapped_or_empty',base)
                        else:
                            events=[dict(n,onset_beat=n['onset_beat']) for n in notes if n['onset_beat']<length]
                            add_clip('fill',events,dict(base,bpm=bpm,start=0.,boundary_basis=boundary_basis,original_duration_beats=record['midi']['duration_beats']),length,labels)
                            stats['fill_clips']+=1
                    regions=[];previous=None
                    for beat,meter in meters:
                        if meter!=previous:regions.append((beat,meter));previous=meter
                    for index,(start,meter) in enumerate(regions):
                        end=regions[index+1][0] if index+1<len(regions) else duration
                        if meter!=[4,4]:omit('non_four_four_regions',dict(base,start=start));continue
                        if end-start<8:omit('short_region_no_original_window',dict(base,start=start))
                        for begin in np.arange(start,end-8+1e-8,8):
                            stats['candidate_windows']+=1
                            bpm=constant_tempo(tempi,begin,8)
                            if bpm is None:omit('unsupported_or_changing_tempo_windows',dict(base,start=float(begin)));continue
                            events=[dict(n,onset_beat=n['onset_beat']-begin) for n in notes if begin<=n['onset_beat']<begin+8]
                            meta=dict(base,bpm=bpm,start=float(begin),has_fill=0 if role=='groove' else 1 if role=='fill' else -1,
                                      fill_start_beat=0. if role=='fill' else None,fill_duration_beats=8. if role=='fill' else None)
                            add_window(events,meta)
                            if role=='groove' and options.combine_fills and events and all(n['voice'] in DRUMS for n in events):
                                add_clip('groove',events,meta,8.,labels);stats['groove_clips']+=1
            db.commit()
            # Exact normalized styles, NEVER the coarser model style IDs, define compatibility.
            pairs='''SELECT DISTINCT g.id AS groove,f.id AS fill FROM clips g
                JOIN styles gs ON gs.clip=g.id JOIN styles fs ON fs.style=gs.style
                JOIN clips f ON f.id=fs.clip
                WHERE g.role='groove' AND f.role='fill' AND g.split=f.split AND g.scope=f.scope
                AND g.source!=f.source AND max(g.bpm,f.bpm)/min(g.bpm,f.bpm)<=?
                AND (?='groove' OR abs(g.bpm-f.bpm)<=?)'''
            args=(options.max_tempo_ratio,options.tempo_policy,options.tempo_tolerance_bpm)
            pair_count=db.execute('SELECT count(*) FROM ('+pairs+')',args).fetchone()[0]
            stats['compatible_pairs']=pair_count
            if options.max_combinations is not None and pair_count>options.max_combinations:
                raise ValueError(f'{pair_count} compatible pairs exceeds max_combinations={options.max_combinations}; raise the explicit limit or narrow sources. No completed export was published.')
            for groove_id,fill_id in db.execute(pairs+' ORDER BY groove,fill',args):
                grow=db.execute('SELECT events,meta FROM clips WHERE id=?',(groove_id,)).fetchone()
                frow=db.execute('SELECT events,meta,length FROM clips WHERE id=?',(fill_id,)).fetchone()
                groove,gm=json.loads(grow[0]),json.loads(grow[1]);fill,fm=json.loads(frow[0]),json.loads(frow[1])
                length=frow[2];junction=8-length
                prefix=[dict(n,duration_beats=min(n['duration_beats'],junction-n['onset_beat']) if n.get('duration_beats') is not None else None)
                        for n in groove if n['onset_beat']<junction]
                if not prefix:omit('empty_groove_prefix_pairs',dict(gm,fill_source=fm['source']));continue
                events=prefix+[dict(n,onset_beat=n['onset_beat']+junction) for n in fill]
                meta=dict(gm,synthetic=True,role='groove_fill',has_fill=1,fill_start_beat=junction,fill_duration_beats=length,
                    parent_ids=[gm['source'],fm['source']],parent_groups=[gm['group'],fm['group']],
                    fill_source=fm['source'],fill_source_id=fm['source_id'],fill_original_bpm=fm['bpm'],
                    fill_boundary_basis=fm['boundary_basis'],fill_original_duration_beats=fm['original_duration_beats'],
                    tempo_policy=options.tempo_policy,fill_tempo_ratio=gm['bpm']/fm['bpm'],
                    matched_styles=sorted(set(gm['style_labels'])&set(fm['style_labels'])))
                add_window(events,meta)
            db.commit()
            # Remove all sides of cross-split duplicates and conflicting fill supervision.
            db.executescript('''CREATE TABLE rejected AS SELECT hash FROM windows GROUP BY hash
                HAVING count(DISTINCT split)>1 OR count(DISTINCT label)>1;
                CREATE INDEX rejected_hash ON rejected(hash);
                CREATE TABLE kept(id INTEGER PRIMARY KEY);
                INSERT INTO kept SELECT min(id) FROM windows WHERE hash NOT IN (SELECT hash FROM rejected) GROUP BY hash;''')
            cross=db.execute('SELECT count(*) FROM (SELECT hash FROM windows GROUP BY hash HAVING count(DISTINCT split)>1)').fetchone()[0]
            conflicts=db.execute('SELECT count(*) FROM (SELECT hash FROM windows GROUP BY hash HAVING count(DISTINCT label)>1)').fetchone()[0]
            structural=db.execute('SELECT count(*) FROM (SELECT structure FROM windows GROUP BY structure HAVING count(DISTINCT split)>1)').fetchone()[0]
            stats['duplicate_or_conflicting_windows_removed']=db.execute('SELECT count(*) FROM windows').fetchone()[0]-db.execute('SELECT count(*) FROM kept').fetchone()[0]
            for (encoded,) in db.execute('SELECT meta FROM windows WHERE id NOT IN (SELECT id FROM kept)'):
                log_exclusion('duplicate_or_conflicting_window',json.loads(encoded))
            exclusions.flush()
            counts={};fill_counts={}
            with (output/'manifest.json').open('w') as manifest,(output/'manifest.jsonl').open('w') as jsonl:
                manifest.write('[');first=True
                for split in ('train','validation','test'):
                    count=db.execute('SELECT count(*) FROM windows w JOIN kept k ON w.id=k.id WHERE split=?',(split,)).fetchone()[0]
                    counts[split]=count;fill_counts[split]=Counter()
                    shapes={'drums':((count,32,9,3),np.float32),'bpm':((count,),np.float32),'style':((count,),np.int64),
                        'has_fill':((count,),np.int8),'fill_mask':((count,32),np.int8),
                        'fill_hit_mask':((count,32,9),np.int8),
                        'fill_start_beat':((count,),np.float32),'fill_duration_beats':((count,),np.float32),
                        'synthetic':((count,),np.bool_)}
                    arrays={key:np.lib.format.open_memmap(stage/f'{split}-{key}.npy',mode='w+',dtype=dtype,shape=shape)
                            for key,(shape,dtype) in shapes.items()}
                    # Scan integer primary keys in order, then fetch each window. A normal
                    # join may sort every tensor + metadata row into a temporary B-tree.
                    query='SELECT w.y,w.meta FROM kept k CROSS JOIN windows w ON w.id=k.id WHERE w.split=? ORDER BY k.id'
                    for i,(blob,encoded) in enumerate(db.execute(query,(split,))):
                        meta=json.loads(encoded);meta['split_index']=i
                        arrays['drums'][i]=np.frombuffer(zlib.decompress(blob),dtype=np.float32).reshape(32,9,3)
                        for key in ('bpm','style','has_fill','synthetic'):arrays[key][i]=meta[key]
                        for key in ('fill_start_beat','fill_duration_beats'):arrays[key][i]=meta[key] if meta[key] is not None else np.nan
                        mask=np.full(32,-1 if meta['has_fill']==-1 else 0,np.int8)
                        if meta['has_fill']==1:mask[int(round(meta['fill_start_beat']*4)):int(round((meta['fill_start_beat']+meta['fill_duration_beats'])*4))]=1
                        arrays['fill_mask'][i]=mask
                        hvo=arrays['drums'][i];hit_mask=np.full((32,9),-1 if meta['has_fill']==-1 else 0,np.int8)
                        if meta['has_fill']==1:
                            beats=((np.arange(32)[:,None]+hvo[...,2])/4)%8
                            hit_mask[(hvo[...,0]>.5)&(beats>=meta['fill_start_beat'])&(beats<meta['fill_start_beat']+meta['fill_duration_beats'])]=1
                        arrays['fill_hit_mask'][i]=hit_mask
                        fill_counts[split][str(meta['has_fill'])]+=1
                        stats['synthetic_kept' if meta['synthetic'] else 'original_kept']+=1
                        manifest.write(('' if first else ',\n')+json.dumps(meta));first=False
                        jsonl.write(json.dumps(meta)+'\n')
                    for array in arrays.values():array.flush()
                    np.savez_compressed(output/f'{split}.npz',**arrays)
                    # Release all views/mappings before unlinking (also works on Windows).
                    hvo=None
                    del array
                    for mapped in arrays.values():mapped._mmap.close()
                    del arrays
                    for key in shapes:(stage/f'{split}-{key}.npy').unlink()
                manifest.write(']\n')
            report=dict(adapter='hvo32x9-fill-v2',canonical_run=str(run_path.resolve()),statistics=dict(stats),
                config=options.model_dump(),splits=counts,fill_labels={s:dict(v) for s,v in fill_counts.items()},
                conditioning={'has_fill':'int8: -1 unknown, 0 groove-labelled, 1 fill present; file labels are not event-level ground truth',
                              'fill_mask':'int8 [N,32]: -1 unknown, 0 groove region, 1 fill region; not a hit mask',
                              'fill_hit_mask':'int8 [N,32,9]: fill membership at decoded onsets; ignore inactive cells',
                              'decode_beats':'((step + offset) / 4) % 8; terminal pickups may occupy grid step zero with negative offset',
                              'absent_boundary':'NaN for groove-only or unknown'},
                cross_split_hvo_hashes=cross,conflicting_fill_label_hashes=conflicts,structural_overlap_hashes=structural,
                hash_precision='HVO values rounded to 4 decimal places for duplicate screening',
                structural_overlap_note='Identical hit grids can be common vocabulary; audit separately.',
                collision_policy=f'Strongest velocity per cell; reject above {max_collision_rate:.1%}; periodic offsets preserve terminal pickup timing.',
                limits=['File role labels do not prove absence of embedded fills in long performances.',
                        'Unknown/mixed roles remain unconditioned; synthetic quality needs listening evaluation.',
                        'Pairing is deterministic and exhaustive within configured source/split/style/tempo constraints.',
                        'Current CVAE does not consume fill conditioning yet.'])
            (output/'dataset-card.json').write_text(json.dumps(report,indent=2));return report
        finally:db.close()
