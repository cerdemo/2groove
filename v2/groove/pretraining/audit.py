"""Bounded-memory HVO audit. SQLite stores cross-row identity/provenance state."""
from collections import Counter
from contextlib import ExitStack
import hashlib
import json
from pathlib import Path
import sqlite3
import zipfile
import numpy as np
from ..events import STYLES

SPLITS=('train','validation','test')
SPEC={'drums':((32,9,3),'f',4),'bpm':((),'f',4),'style':((),'i',8),
      'has_fill':((),'i',1),'synthetic':((),'b',1),'fill_mask':((32,),'i',1),
      'fill_hit_mask':((32,9),'i',1),'fill_start_beat':((),'f',4),'fill_duration_beats':((),'f',4)}


def sha256(path):
    with Path(path).open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()


def batches(path,size=1024):
    """Read compressed NPY members sequentially. Never np.load the whole drum tensor."""
    if size<1:raise ValueError('batch size must be positive')
    with ExitStack() as stack:
        archive=stack.enter_context(zipfile.ZipFile(path));streams={};count=None
        if len(archive.namelist())!=len(set(archive.namelist())):raise ValueError('duplicate NPZ members')
        for key,(tail,kind,itemsize) in SPEC.items():
            stream=stack.enter_context(archive.open(key+'.npy'))
            version=np.lib.format.read_magic(stream)
            if version not in ((1,0),(2,0)):raise ValueError('unsupported NPY version')
            reader=np.lib.format.read_array_header_1_0 if version==(1,0) else np.lib.format.read_array_header_2_0
            shape,fortran,dtype=reader(stream)
            if fortran or dtype.hasobject or dtype.kind!=kind or dtype.itemsize!=itemsize:
                raise ValueError(f'{key}: invalid dtype/order {dtype}')
            if len(shape)!=len(tail)+1 or shape[1:]!=tail:raise ValueError(f'{key}: invalid shape {shape}')
            if count is None:count=shape[0]
            if shape[0]!=count:raise ValueError('inconsistent array lengths')
            streams[key]=(stream,tail,dtype)
        for start in range(0,count,size):
            n=min(size,count-start);values={}
            for key,(stream,tail,dtype) in streams.items():
                length=n*int(np.prod(tail))*dtype.itemsize;raw=stream.read(length)
                if len(raw)!=length:raise ValueError(f'{key}: truncated NPY data')
                values[key]=np.frombuffer(raw,dtype=dtype).reshape((n,*tail))
            yield start,values
        for key,(stream,_,_) in streams.items():
            if stream.read(1):raise ValueError(f'{key}: trailing NPY data')


def audit(dataset,output,canonical=None,batch_size=1024,progress=print):
    dataset=Path(dataset).resolve();output=Path(output).resolve()
    output.mkdir(parents=True,exist_ok=False)
    errors=Counter();examples=[];inputs={};counts={};coverage={};warning_counts={}
    report=dict(version='pretraining-audit-v1',dataset=str(dataset),status='failed')
    db=sqlite3.connect(output/'audit.sqlite')
    db.executescript('''PRAGMA temp_store=FILE;
      CREATE TABLE canonical(id TEXT PRIMARY KEY,status TEXT,split TEXT,grp TEXT,source TEXT,styles TEXT,content_hash TEXT);
      CREATE TABLE windows(split TEXT,idx INTEGER,hash TEXT,structure TEXT,source TEXT,styles TEXT,
        label INTEGER,synthetic INTEGER,bpm REAL,parent TEXT,meta TEXT,actual_hash TEXT,actual_structure TEXT,
        PRIMARY KEY(split,idx));
      CREATE TABLE parents(split TEXT,idx INTEGER,parent TEXT,grp TEXT);
    ''')
    def problem(reason,detail=None,n=1):
        errors[reason]+=n
        if detail is not None and len(examples)<100:examples.append(dict(reason=reason,detail=str(detail)))
    def snapshot(key,path):
        inputs[key]=dict(path=str(path),sha256=sha256(path),bytes=path.stat().st_size)
    try:
        card_path=dataset/'dataset-card.json';card=json.loads(card_path.read_text());snapshot('card',card_path)
        if card.get('adapter')!='hvo32x9-fill-v2':raise ValueError('Expected completed hvo32x9-fill-v2 export')
        canonical=Path(canonical or card['canonical_run']).resolve()
        report['canonical_run']=str(canonical)
        canonical_manifest=canonical/'manifest.jsonl';snapshot('canonical_manifest',canonical_manifest)
        with canonical_manifest.open() as f:
            for i,line in enumerate(f,1):
                r=json.loads(line);sid=r['source_id'];c=coverage.setdefault(sid,dict(statuses=Counter(),reasons=Counter()))
                c['statuses'][r['status']]+=1;c['reasons'].update(r.get('reasons',[]))
                styles=r.get('metadata',{}).get('style',{}).get('value',[])
                db.execute('INSERT INTO canonical VALUES(?,?,?,?,?,?,?)',(r['id'],r['status'],r.get('split'),r.get('split_group'),sid,json.dumps(sorted(set(styles))),r.get('percussion_hash')))
                if i%50000==0:db.commit();progress(f'Canonical provenance: {i:,} rows')
        manifest=dataset/'manifest.jsonl';snapshot('manifest',manifest)
        with manifest.open() as f:
            for i,line in enumerate(f,1):
                r=json.loads(line);split=r['split'];idx=r['split_index']
                if split not in SPLITS or type(idx)!=int or idx<0:raise ValueError('Invalid manifest index/split')
                if type(r['synthetic'])!=bool or type(r['has_fill'])!=int or r['has_fill'] not in (-1,0,1):raise ValueError('Invalid manifest labels')
                labels=r['style_labels']
                if not isinstance(labels,list) or not all(isinstance(s,str) and s for s in labels):raise ValueError('Invalid style_labels')
                parents=r['parent_ids'];groups=r['parent_groups']
                if len(parents)!=(2 if r['synthetic'] else 1) or len(groups)!=len(parents):raise ValueError('Invalid parent arity')
                if not all(isinstance(p,str) and p for p in parents+groups):raise ValueError('Invalid parent identity')
                if r['synthetic'] and (parents[0]==parents[1] or parents[1]!=r.get('fill_source')):problem('manifest_fill_parent',f'{split}:{idx}')
                if parents[0]!=r['source'] or groups[0]!=r['group']:problem('manifest_primary_parent',f'{split}:{idx}')
                db.execute('INSERT INTO windows VALUES(?,?,?,?,?,?,?,?,?,?,?,NULL,NULL)',
                  (split,idx,r['hash'],r['structure_hash'],r['source_id'],json.dumps(sorted(set(labels))),
                   r['has_fill'],int(r['synthetic']),r['bpm'],parents[0],json.dumps(r)))
                db.executemany('INSERT INTO parents VALUES(?,?,?,?)',[(split,idx,p,g) for p,g in zip(parents,groups)])
                if i%50000==0:db.commit();progress(f'Export manifest: {i:,} rows')
        db.commit()
        for split in SPLITS:
            path=dataset/(split+'.npz');snapshot(split,path);count=0
            for start,ds in batches(path,batch_size):
                y=ds['drums'];n=len(y);count+=n
                rows=dict(db.execute('SELECT idx,meta FROM windows WHERE split=? AND idx>=? AND idx<?',(split,start,start+n)))
                def check(mask,reason):
                    bad=np.flatnonzero(~np.asarray(mask).reshape(n,-1).all(axis=1))
                    if len(bad):problem(reason,f'{split}:{start+int(bad[0])}',len(bad))
                check(np.isfinite(y),'nonfinite_hvo');hits=y[...,0]==1
                check((y[...,0]==0)|hits,'nonbinary_hits')
                check(hits.any(axis=(1,2)),'empty_pattern')
                check((y[...,1]>=0)&(y[...,1]<=1)&(~hits|(y[...,1]>0)),'velocity_range')
                check(abs(y[...,2])<=.50001,'offset_range')
                check(hits|((y[...,1]==0)&(y[...,2]==0)),'inactive_cell_nonzero')
                check(np.isfinite(ds['bpm'])&(ds['bpm']>=30)&(ds['bpm']<=300),'bpm_range')
                check((ds['style']>=0)&(ds['style']<len(STYLES)),'model_style_range')
                check(np.isin(ds['has_fill'],[-1,0,1]),'invalid_fill_label')
                updates=[]
                for j in range(n):
                    idx=start+j;where=f'{split}:{idx}';label=int(ds['has_fill'][j]);synthetic=bool(ds['synthetic'][j])
                    begin=float(ds['fill_start_beat'][j]);length=float(ds['fill_duration_beats'][j])
                    mask=np.full(32,-1 if label==-1 else 0,np.int8)
                    hit_mask=np.full((32,9),-1 if label==-1 else 0,np.int8)
                    if label==1:
                        valid=np.isfinite(begin) and np.isfinite(length) and begin>=0 and length>0 and begin+length<=8+1e-6
                        valid=valid and abs(begin*4-round(begin*4))<1e-5 and abs(length*4-round(length*4))<1e-5
                        if not valid:problem('invalid_fill_boundary',where)
                        else:
                            mask[round(begin*4):round((begin+length)*4)]=1
                            beats=((np.arange(32)[:,None]+y[j,...,2])/4)%8
                            hit_mask[hits[j]&(beats>=begin)&(beats<begin+length)]=1
                    elif not (np.isnan(begin) and np.isnan(length)):problem('unexpected_fill_boundary',where)
                    if synthetic and label!=1:problem('synthetic_without_fill',where)
                    if not np.array_equal(mask,ds['fill_mask'][j]):problem('fill_mask_mismatch',where)
                    if not np.array_equal(hit_mask,ds['fill_hit_mask'][j]):problem('fill_hit_mask_mismatch',where)
                    actual=hashlib.sha256(np.round(y[j],4).tobytes()).hexdigest()
                    structure=hashlib.sha256(y[j,...,0].tobytes()).hexdigest()
                    updates.append((actual,structure,split,idx))
                    if idx not in rows:problem('array_without_manifest',where);continue
                    r=json.loads(rows[idx])
                    if actual!=r['hash'] or structure!=r['structure_hash']:problem('manifest_hash_mismatch',where)
                    if r['has_fill']!=label or r['synthetic']!=synthetic or r['style']!=int(ds['style'][j]) or not np.isclose(r['bpm'],ds['bpm'][j],rtol=1e-6):problem('manifest_array_metadata_mismatch',where)
                    for field,value in [('fill_start_beat',begin),('fill_duration_beats',length)]:
                        expected=r[field]
                        if not (np.isnan(value) and expected is None) and not (expected is not None and np.isclose(expected,value)):problem('manifest_boundary_mismatch',where)
                db.executemany('UPDATE windows SET actual_hash=?,actual_structure=? WHERE split=? AND idx=?',updates)
                if start//10000!=(start+n)//10000:db.commit();progress(f'{split}: {count:,} HVO rows verified')
            counts[split]=count
            manifest_count,lo,hi=db.execute('SELECT count(*),min(idx),max(idx) FROM windows WHERE split=?',(split,)).fetchone()
            if manifest_count!=count or (count and (lo!=0 or hi!=count-1)):problem('manifest_array_count_or_index_mismatch',split)
            if card['splits'].get(split)!=count:problem('card_count_mismatch',split)
            labels=dict((str(k),v) for k,v in db.execute('SELECT label,count(*) FROM windows WHERE split=? GROUP BY label',(split,)))
            if labels!=card['fill_labels'].get(split):problem('card_fill_count_mismatch',split)
        db.executescript('CREATE INDEX parent_id ON parents(parent); CREATE INDEX window_hash ON windows(actual_hash); CREATE INDEX window_structure ON windows(actual_structure);')
        queries={
          'missing_or_unaccepted_parent':"SELECT count(*) FROM parents p LEFT JOIN canonical c ON c.id=p.parent WHERE c.id IS NULL OR c.status!='accepted'",
          'parent_split_or_group_mismatch':"SELECT count(*) FROM parents p JOIN canonical c ON c.id=p.parent WHERE p.split IS NOT c.split OR p.grp IS NOT c.grp",
          'parent_source_or_style_mismatch':"SELECT count(*) FROM windows w JOIN canonical c ON c.id=w.parent WHERE w.source IS NOT c.source OR w.styles IS NOT c.styles",
          'cross_split_canonical_patterns':'SELECT count(*) FROM (SELECT c.content_hash FROM parents p JOIN canonical c ON c.id=p.parent WHERE c.content_hash IS NOT NULL GROUP BY c.content_hash HAVING count(DISTINCT p.split)>1)',
          'cross_split_parent_ids':'SELECT count(*) FROM (SELECT parent FROM parents GROUP BY parent HAVING count(DISTINCT split)>1)',
          'cross_split_parent_groups':'SELECT count(*) FROM (SELECT grp FROM parents GROUP BY grp HAVING count(DISTINCT split)>1)',
          'cross_split_hvo_hashes_after_export':'SELECT count(*) FROM (SELECT actual_hash FROM windows GROUP BY actual_hash HAVING count(DISTINCT split)>1)',
          'duplicate_hvo_hashes_after_export':'SELECT count(*) FROM (SELECT actual_hash FROM windows GROUP BY actual_hash HAVING count(*)>1)',
        }
        checks={key:db.execute(sql).fetchone()[0] for key,sql in queries.items()}
        for key,value in checks.items():
            if value:problem(key,n=value)
        warning_counts['cross_split_hit_grids']=db.execute('SELECT count(*) FROM (SELECT actual_structure FROM windows GROUP BY actual_structure HAVING count(DISTINCT split)>1)').fetchone()[0]
        warning_counts['maximum_parent_reuse']=db.execute('SELECT coalesce(max(n),0) FROM (SELECT count(*) AS n FROM parents GROUP BY parent)').fetchone()[0]
        distributions=[dict(zip(('split','source','style_labels','has_fill','synthetic','count'),row)) for row in db.execute('SELECT split,source,styles,label,synthetic,count(*) FROM windows GROUP BY split,source,styles,label,synthetic ORDER BY split,source,styles,label,synthetic')]
        for row in distributions:row['style_labels']=json.loads(row['style_labels'])
        usage={}
        for synthetic in (0,1):
            usage['synthetic' if synthetic else 'original']={s:db.execute('SELECT count(*) FROM windows WHERE split=? AND synthetic=?',(s,synthetic)).fetchone()[0] for s in SPLITS}
        report.update(counts=counts,checks=checks,distributions=distributions,origin_counts=usage,
            tempo_bins=[dict(split=s,bpm_from=b*10,bpm_to=b*10+10,count=n) for s,b,n in db.execute('SELECT split,cast(bpm/10 AS INTEGER),count(*) FROM windows GROUP BY split,cast(bpm/10 AS INTEGER) ORDER BY split,2')])
        # Ensure inputs did not mutate while being scanned. Planning checks these hashes again.
        for value in inputs.values():
            if sha256(value['path'])!=value['sha256']:problem('input_changed_during_audit',value['path'])
        report['status']='passed' if not errors else 'failed'
    except Exception as exc:
        problem('audit_exception',f'{type(exc).__name__}: {exc}')
    finally:
        db.commit();db.close()
    report.update(inputs=inputs,errors=dict(errors),error_examples=examples,warnings=warning_counts,canonical_coverage=coverage,
                  limitations=['Exact hashes use the exporter rounding to four decimals; approximate musical duplicates need separate review.',
                    'Shared hit grids are a diagnostic, not automatically leakage.',
                    'Passing validates the serialized corpus contract, not musical quality, style truth or model readiness.'])
    report['index_sha256']=sha256(output/'audit.sqlite')
    (output/'audit.json').write_text(json.dumps(report,indent=2,allow_nan=False)+'\n')
    return report
