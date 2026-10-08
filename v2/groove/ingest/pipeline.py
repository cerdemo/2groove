import gzip
import hashlib
import json
from collections import Counter,defaultdict
from datetime import datetime,timezone
from pathlib import Path
import importlib.metadata
import sys
from . import VERSION
from .discover import discover
from .metadata import SourceMetadata,collect,resolve,search_identity
from .parse import parse
from .percussion import assess
from .web import WebResolver,web_evidence


def digest(value):return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()


def dump_gzip(path,value):
    with gzip.open(path,'wt',encoding='utf-8') as f:json.dump(value,f,ensure_ascii=False,separators=(',',':'))


def group_splits(rows,seed):
    """Connected groups prevent exact-content aliases leaking across sources/splits."""
    parent={}
    def find(x):
        parent.setdefault(x,x)
        if parent[x]!=x:parent[x]=find(parent[x])
        return parent[x]
    def union(a,b):
        a,b=find(a),find(b)
        if a!=b:parent[max(a,b)]=min(a,b)
    for row in rows:
        keys=row['group_keys']
        for k in keys:union(keys[0],k)
    members=defaultdict(list)
    for row in rows:members[find(row['group_keys'][0])].append(row)
    for group,items in members.items():
        splits={r['official_split'] for r in items if r.get('official_split')}
        if len(splits)>1:
            for r in items:
                r['status']='quarantined';r['reasons'].append('cross_split_duplicate_or_group_conflict');r['split']=None
        else:
            split=next(iter(splits),None)
            if split not in ('train','validation','test'):split=None
            if split is None:
                bucket=int(hashlib.sha256(f'{seed}:{group}'.encode()).hexdigest()[:8],16)%100
                split='train' if bucket<80 else 'validation' if bucket<90 else 'test'
            for r in items:r['split']=split
        for r in items:r['split_group']=group


def run(config,resolver=None,progress=print):
    root=Path(config.output).resolve();root.mkdir(parents=True,exist_ok=True)
    config_hash=digest(config.model_dump());run_id=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')+'-'+config_hash[:8]
    implementation={p.name:p.read_bytes() for p in Path(__file__).parent.glob('*.py')}
    implementation['shared_events.py']=Path(__file__).parents[1].joinpath('events.py').read_bytes()
    code_hash=digest({name:hashlib.sha256(data).hexdigest() for name,data in implementation.items()})
    out=root/'runs'/run_id;out.mkdir(parents=True)
    for name in ('records','objects','implementation'): (out/name).mkdir()
    for name,data in implementation.items():(out/'implementation'/name).write_bytes(data)
    (out/'environment.json').write_text(json.dumps(dict(python=sys.version,
        packages={name:importlib.metadata.version(name) for name in ('numpy','mido','pydantic')}),indent=2))
    (out/'config.json').write_text(config.model_dump_json(indent=2))
    annotations=json.loads(Path(config.annotations).read_text()) if config.annotations else {}
    resolver=resolver or WebResolver(config.web);rows=[];requests=[];seen_assets=set();annotation_requests=[]
    for source in config.sources:
        if config.max_files is not None and len(rows)>=config.max_files:break
        adapter=SourceMetadata(source)
        for asset in discover(source.path,config.policy,excluded=[root,Path(config.web.cache).resolve()]):
            locator=source.id+':'+asset.relative
            if locator in seen_assets:continue
            seen_assets.add(locator);record_id=digest(locator)[:24]
            row=dict(id=record_id,source_id=source.id,relative_path=asset.relative,locator=asset.locator,
                     status='discarded',reasons=[],warnings=[],schema_version=VERSION,config_hash=config_hash,code_hash=code_hash)
            row['record']='records/'+record_id+'.json.gz';details={};raw=None
            try:
                raw=asset.read(config.policy.max_file_bytes);sha=hashlib.sha256(raw).hexdigest();row['sha256']=sha
                object_path=out/'objects'/sha
                if not object_path.exists():object_path.write_bytes(raw)
                row['raw_object']='objects/'+sha
                parsed=parse(raw,config.policy);details['midi']=parsed
                annotation=annotations.get(sha,annotations.get(locator,{}))
                values=adapter.get(asset)
                candidates,issues=collect(parsed,asset,source,values,annotation)
                metadata,conflicts=resolve(candidates,config.policy)
                missing=[f for f in config.policy.required_metadata if f not in metadata]
                lookup=None
                if missing:
                    identity=search_identity(candidates,asset)
                    if identity:
                        lookup=resolver.lookup(identity);requests.append(dict(id=record_id,missing=missing,**lookup))
                        for field,items in web_evidence(lookup,identity,sha).items():
                            if field not in metadata:candidates.setdefault(field,[]).extend(items)
                        metadata,conflicts=resolve(candidates,config.policy)
                    else:lookup={'status':'unsearchable','reason':'No usable song/track identity'}
                streams,drums=assess(parsed,source,config.policy,annotation)
                missing=[f for f in config.policy.required_metadata if f not in metadata]
                reasons=[];quarantine=[]
                if missing:
                    reasons+=['missing_'+f for f in missing]
                    if lookup and lookup['status'] in ('error','deferred','ambiguous'):quarantine.append('web_'+lookup['status'])
                if conflicts and config.policy.conflict_policy=='quarantine':quarantine.append('metadata_conflict')
                if issues:quarantine.extend(issues)
                if 'uninterpreted_sysex' in parsed['warnings'] and source.adapter=='generic' and not config.policy.allow_uninterpreted_sysex and not annotation.get('reason'):
                    quarantine.append('uninterpreted_sysex_requires_review')
                ambiguous=[s['id'] for s in streams if s['decision']=='ambiguous']
                if ambiguous:quarantine.append('ambiguous_percussion_streams')
                if not drums:reasons.append('no_accepted_percussion')
                if annotation.get('exclude'):
                    reasons.append('reviewer_excluded');quarantine=[]
                row['status']='quarantined' if quarantine else 'discarded' if reasons else 'accepted'
                row['reasons']=sorted(set(reasons+quarantine));row['warnings']=parsed['warnings']
                row['metadata']={k:dict(value=v['value'],kind=v['kind'],evidence_score=v['evidence_score'],scope=v['scope']) for k,v in metadata.items() if not k.startswith('_')}
                row['counts']=dict(all_notes=len(parsed['notes']),percussion_notes=len(drums),streams=len(streams),
                                   ambiguous_streams=len(ambiguous),unmapped_instruments=sum(n['instrument'] is None for n in drums),
                                   outside_nine_voice_map=sum(n['voice'] is None for n in drums))
                row['duration_beats']=parsed['duration_beats'];row['official_split']=values.get('split')
                row['license']=source.license or source.defaults.get('license');row['origin_url']=source.origin_url
                group=values.get('group_id') or source.defaults.get('group_id')
                if not group:
                    path=Path(asset.relative)
                    group=str(path.parent if source.group_by=='parent' else path.parent.parent) if source.group_by!='file' else sha
                pattern_hash=digest([(round(n['onset_beat'],7),n['pitch'],n['voice'],n['velocity']) for n in drums]) if drums else sha
                row['percussion_hash']=pattern_hash
                row['group_keys']=['source:'+source.id+':'+str(group),'bytes:'+sha,'percussion:'+pattern_hash]
                if lookup and lookup.get('recording_id'):row['group_keys'].append('recording:'+lookup['recording_id'])
                details.update(metadata=metadata,metadata_candidates=candidates,metadata_conflicts=conflicts,
                    web_lookup=lookup,source_metadata=values,percussion_streams=streams,percussion_events=drums,
                    annotation=annotation or None)
                if row['status']!='accepted':
                    annotation_requests.append(dict(key=sha,source=locator,reasons=row['reasons'],
                        metadata={},streams={s['id']:{'role':s['decision'],'evidence_score':s['evidence_score']} for s in streams},reason=''))
            except Exception as e:
                row['reasons']=[type(e).__name__+': '+str(e)]
                row['status']='quarantined' if isinstance(e,(OSError,PermissionError)) or 'requires_' in str(e) else 'discarded'
            dump_gzip(out/row['record'],dict(summary=row,**details));rows.append(row)
            if len(rows)%100==0:progress(f'{len(rows)} MIDI assets inspected')
            if config.max_files is not None and len(rows)>=config.max_files:
                progress(f'Max-files limit reached: {len(rows)} MIDI candidates inspected')
                break
    group_splits([r for r in rows if 'group_keys' in r],config.seed)
    # Manifest is authoritative; decisions are repeated in records only after final group audit.
    review_ids={r['source'] for r in annotation_requests}
    for row in rows:
        with gzip.open(out/row['record'],'rt',encoding='utf-8') as f:record=json.load(f)
        record['summary']=row;dump_gzip(out/row['record'],record)
        locator=row['source_id']+':'+row['relative_path']
        if row['status']!='accepted' and locator not in review_ids:
            annotation_requests.append(dict(key=row.get('sha256',locator),source=locator,reasons=row['reasons'],metadata={},streams={},reason=''))
    with (out/'manifest.jsonl').open('w') as f:
        for row in rows:f.write(json.dumps(row,ensure_ascii=False)+'\n')
    with (out/'web-requests.jsonl').open('w') as f:
        for request in requests:f.write(json.dumps(request,ensure_ascii=False)+'\n')
    (out/'review-queue.json').write_text(json.dumps(annotation_requests,ensure_ascii=False,indent=2))
    accepted=[r for r in rows if r['status']=='accepted']
    report=dict(schema_version=VERSION,run_id=run_id,config_hash=config_hash,code_hash=code_hash,assets=len(rows),
        max_files=config.max_files,limit_reached=config.max_files is not None and len(rows)>=config.max_files,
        status_counts=dict(Counter(r['status'] for r in rows)),
        reason_counts=dict(Counter(reason for r in rows for reason in r['reasons'])),
        unique_raw_files=len({r['sha256'] for r in rows if 'sha256' in r}),
        accepted_unique_percussion=len({r['percussion_hash'] for r in accepted}),
        accepted_splits=dict(Counter(r['split'] for r in accepted)),
        metadata_sources={field:dict(Counter(r['metadata'][field]['kind'] for r in accepted if field in r['metadata'])) for field in ('style','tempo','meter')},
        web_status_counts=dict(Counter(r['status'] for r in requests)),
        limitations=['Percussion scores are heuristic, not calibrated probabilities.',
                    'Full-file exact drum fingerprints and provenance groups are linked; near-duplicate audit is separate.',
                    'Web search is limited to configured providers; no-match does not prove absence on the entire web.',
                    'Canonical events preserve all tempos/meters; model exports impose explicit separate restrictions.'])
    (out/'report.json').write_text(json.dumps(report,indent=2));temporary=root/'latest.tmp'
    temporary.write_text(json.dumps({'run':str(out),'report':report},indent=2));temporary.replace(root/'latest.json')
    progress(json.dumps(report,indent=2));return out,report
