"""Field-level evidence; no unlabelled numeric tokens are treated as tempo."""
import csv
import io
import json
from pathlib import Path, PurePosixPath
import re
import zipfile
from .schema import evidence
from .library_names import decode_catalog_name,library_path_evidence

ALIASES={
 'hip hop':'hiphop','hip-hop':'hiphop','hiphop':'hiphop','r&b':'rnb','rnb':'rnb','rhythm and blues':'rnb',
 'rock':'rock','indie rock':'rock','rock indie':'rock','rock-indie':'rock','hard rock':'rock','punk rock':'punk',
 'funk':'funk','jazz':'jazz','bebop':'jazz','swing':'jazz','blues':'blues','soul':'soul',
 'pop':'pop','metal':'metal','heavy metal':'metal','punk':'punk','reggae':'reggae','ska':'ska',
 'latin':'latin','afro cuban':'afrocuban','afro-cuban':'afrocuban','afrocuban':'afrocuban',
 'afrobeat':'afrobeat','highlife':'highlife','samba':'samba','bossa nova':'bossa-nova',
 'country':'country','folk':'folk','classical':'classical','world':'world',
 'electronic':'electronic','dance':'electronic','edm':'electronic','house':'house',
 'techno':'techno','disco':'disco','drum and bass':'drum-and-bass','drum & bass':'drum-and-bass',
 'dnb':'drum-and-bass','trap':'trap','breakbeat':'breakbeat','gospel':'gospel',
 'doom metal':'metal','black metal':'metal','death metal':'metal','metalcore':'metal',
 'skate punk':'punk','bossa':'bossa-nova',
 'indie':'indie','progressive':'progressive','rock\'n\'roll':'rock-and-roll',
 'rock and roll':'rock-and-roll','traditional pop':'pop','heavy rock':'rock',
 'new wave':'new-wave','deathcore':'deathcore','hardcore':'hardcore',
 'boogie':'boogie','cha cha':'cha-cha','tango':'tango','charleston':'charleston',
 'nu metal':'nu-metal','drum n bass':'drum-and-bass','electronic dance':'electronic',
 'rock:indie':'rock',
}
PRIORITY={'annotation':0,'midi_event':10,'midi_text':15,'source_manifest':20,'sidecar':22,
          'track_name':30,'instrument_name':35,'filename':40,'parent_folder':50,'source_default':60,'web':70}
TEMPO=re.compile(r'(?:(?:bpm|tempo)\s*[:=_-]?\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*bpm)\b',re.I)
TEMPO_RANGE=re.compile(r'\b\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?\s*bpm\b',re.I)


def normalize_style(text):
    value=str(text).strip().lower().replace('_',' ')
    value=re.sub(r'\s+',' ',value)
    return ALIASES.get(value)


def declared_style(text):
    """Explicit genre fields retain unseen labels; ontology membership is optional."""
    known=normalize_style(text)
    if known:return known
    value=str(text).strip().lower()
    if not value or len(value)>80 or value in ('unknown','none','n/a','other','unspecified'):return None
    if not re.search(r'[^\W\d_]',value):return None
    return re.sub(r'[^\w]+','-',value).strip('-') or None


def styles_in_name(text):
    explicit=re.search(r'(?:genre|style)\s*[:=]\s*([^;\n|.]+)',text,re.I)
    if explicit:
        value=re.split(r'\s+(?:year|title|artist|album|tempo|bpm|role)\s*[:=]',explicit.group(1),flags=re.I)[0]
        parts=re.split(r'[,/]',value)
        return sorted({n for part in parts if (n:=declared_style(part))})
    cleaned=TEMPO.sub(' ',TEMPO_RANGE.sub(' ',text.lower().replace('_',' ')))
    cleaned=re.sub(r'\b(?:drums?|percussion|grooves?|loops?|beats?|fills?|midi|kit|patterns?|take|bars?|bpm|pack|files|type)\b',' ',cleaned)
    cleaned=re.sub(r'\b\d+(?:\.\d+)?\b',' ',cleaned)
    cleaned=re.sub(r'\s+',' ',cleaned).strip(' -/')
    # Whole names only: "We Will Rock You" must not become a rock label.
    label=normalize_style(cleaned)
    return [label] if label else []


def add_fields(candidates,values,kind,locator,score,raw=None):
    role=str(values.get('role','')).strip().lower()
    if role in ('groove','fill','mixed','unknown'):
        candidates.setdefault('role',[]).append(evidence(role,kind,locator,score,raw=values.get('role')))
    if values.get('phrase_beats') is not None:
        try:
            length=float(values['phrase_beats'])
            if 0<length<=100000:candidates.setdefault('phrase_beats',[]).append(evidence(length,kind,locator,score,raw=values['phrase_beats']))
        except (TypeError,ValueError):pass
    if values.get('style'):
        styles=values['style'] if isinstance(values['style'],list) else [values['style']]
        normalized=sorted({x for s in styles if (x:=declared_style(str(s).split('/')[0]))})
        if normalized:candidates.setdefault('style',[]).append(evidence(normalized,kind,locator,score,raw=styles))
    if values.get('tempo') is not None:
        try:
            bpm=float(values['tempo'])
            if 10<=bpm<=600:candidates.setdefault('tempo',[]).append(evidence(bpm,kind,locator,score,raw=raw))
        except (TypeError,ValueError):pass
    if values.get('meter'):
        match=re.fullmatch(r'(\d+)\s*[-/]\s*(\d+)',str(values['meter']))
        if match:
            a,b=map(int,match.groups())
            if 0<a<=64 and b in (1,2,4,8,16,32,64):candidates.setdefault('meter',[]).append(evidence([a,b],kind,locator,score,raw=raw))
    for key in ('title','artist'):
        if isinstance(values.get(key),str) and values[key].strip():
            candidates.setdefault(key,[]).append(evidence(values[key].strip()[:200],kind,locator,score,raw=raw))


def name_evidence(candidates,text,kind,locator,score):
    decoded=decode_catalog_name(text) if kind in ('filename','parent_folder') else text
    prepared=re.sub(r'(?<=[a-z])(?=[A-Z])',' ',decoded)
    explicit=re.search(r'\brole\s*[:=]\s*(groove|fill|mixed|unknown)\b',text,re.I)
    if explicit:
        candidates.setdefault('role',[]).append(evidence(explicit.group(1).lower(),kind,locator,score,raw=text))
    else:
        # Require library-like labels; arbitrary song titles containing "fill" do not qualify.
        cleaned=TEMPO.sub(' ',TEMPO_RANGE.sub(' ',prepared.lower().replace('_',' ')))
        cleaned=re.sub(r'(?<=[a-z])(?=\d)|(?<=\d)(?=[a-z])',' ',cleaned)
        cleaned=re.sub(r'\b(fast|medium|slow)(beat|fill)',r'\1 \2',cleaned)
        tokens=re.findall(r'[a-z]+',cleaned)
        allowed=set('groove grooves fill fills beat beats drum drums percussion midi loop loops variation variations verse chorus intro outro bridge prechorus breakdown fast medium slow straight swing half time halftime double doubletime bars bar prt main ending endings'.split())
        allowed.update(word for alias in ALIASES for word in re.findall(r'[a-z]+',alias))
        roles=set()
        if tokens and all(t in allowed for t in tokens):
            if any(t in ('fill','fills') for t in tokens):roles.add('fill')
            # "Groove 01" is a generic SSD clip name, including inside Fills folders.
            if any(t in ('groove','grooves') for t in tokens) and not (kind=='filename' and re.fullmatch(r'groove\s*\d+',cleaned.strip())):roles.add('groove')
            if any(t in ('beat','beats') for t in tokens) and 'fill' not in roles:roles.add('groove')
        for role in sorted(roles):candidates.setdefault('role',[]).append(evidence(role,kind,locator,score,raw=text))
    styles=styles_in_name(decoded)
    if not styles and kind=='parent_folder':
        # Explicit collection-label templates, not keyword search in arbitrary titles.
        folder=re.sub(r'\([^)]*\)','',decoded).strip()
        collection=re.fullmatch(r'(.+?)\s+(?:Essentials|Anthology)(?:\s+(?:MIDI|Drum|Drums|Pack|Files))*',folder,re.I)
        if collection:
            label=declared_style(collection.group(1))
            if label:styles=[label]
        elif re.match(r'^GM\s*-\s*',folder,re.I):
            styles=styles_in_name(re.sub(r'^GM\s*-\s*','',folder,flags=re.I))
    if styles:candidates.setdefault('style',[]).append(evidence(styles,kind,locator,score,raw=text))
    for match in TEMPO.finditer(TEMPO_RANGE.sub(' ',prepared)):
        bpm=float(match.group(1) or match.group(2))
        if 10<=bpm<=600:candidates.setdefault('tempo',[]).append(evidence(bpm,kind,locator,score,raw=text))
    for key in ('title','artist'):
        match=re.search(r'\b'+key+r'\s*[:=]\s*([^;\n|]+)',text,re.I)
        if match:candidates.setdefault(key,[]).append(evidence(match.group(1).strip(),kind,locator,score,raw=text))


class SourceMetadata:
    def __init__(self,source,progress=print):
        self.source=source;self.rows={};self.delegate=None
        if source.adapter in ('gigamidi','lucerne'):
            from .adapters import GigaMIDI,Lucerne
            self.delegate=GigaMIDI(source,progress) if source.adapter=='gigamidi' else Lucerne(source)
        root=Path(source.path)
        if source.adapter in ('gmd','egmd'):
            manifest_name='info.csv' if source.adapter=='gmd' else 'e-gmd-v1.0.0.csv'
            if root.is_file() and root.suffix.lower()=='.zip':
                with zipfile.ZipFile(root) as z:
                    for name in z.namelist():
                        if name.endswith('/'+manifest_name) or name==manifest_name:
                            if z.getinfo(name).file_size>10_000_000:raise ValueError('source_manifest_too_large')
                            for row in csv.DictReader(io.StringIO(z.read(name).decode('utf-8-sig'))):
                                key=str(PurePosixPath(name).parent/row['midi_filename']);self.rows[key]=row
            elif root.is_dir():
                for info in sorted(root.rglob(manifest_name)):
                    for row in csv.DictReader(info.open(encoding='utf-8-sig')):
                        self.rows[str((info.parent/row['midi_filename']).resolve())]=row

    def get(self,asset,raw=None):
        if self.delegate is not None:
            return self.delegate.get(asset,raw)
        row=self.rows.get(asset.member if asset.member else str(asset.path.resolve()))
        if row:
            return dict(style=row['style'],tempo=row['bpm'],meter=row['time_signature'],
                        group_id=row['id'],performer=row.get('drummer'),session=row.get('session'),
                        split=row.get('split'),role={'beat':'groove','fill':'fill'}.get(row.get('beat_type'),'unknown'),
                        adapter=self.source.adapter,raw=row)
        return {}


def collect(parsed,asset,source,source_values,annotation=None):
    c={};issues=[]
    for field,items,value in [('tempo',parsed['tempo_map'],lambda x:x['bpm']),
                               ('meter',parsed['meter_map'],lambda x:[x['numerator'],x['denominator']])]:
        initial=[x for x in items if x['tick']==0]
        for item in initial:c.setdefault(field,[]).append(evidence(value(item),'midi_event',f"track:{item['track']}:tick:0",1.,raw=item))
        at_tick={}
        for item in items:
            val=value(item);key=item['tick']
            if key in at_tick and at_tick[key]!=val:issues.append(f'conflicting_{field}_events')
            at_tick[key]=val
    for item in parsed['texts']:
        if item['type'] in ('lyrics','copyright'):continue
        kind=item['type'] if item['type'] in ('track_name','instrument_name') else 'midi_text'
        text_candidates={}
        name_evidence(text_candidates,item['text'],kind,f"track:{item['track']}:tick:{item['tick']}",.90 if kind=='midi_text' else .86)
        if item['tick']>0 and text_candidates.get('role'):
            # A section/track label midway through a song does not label the whole file.
            sections=text_candidates.pop('role')
            c.setdefault('_section_role_candidates',[]).extend(sections)
            if any(e['value']=='fill' for e in sections):
                c.setdefault('role',[]).append(evidence('mixed',kind,f"track:{item['track']}:tick:{item['tick']}",.90,raw=item['text']))
        for key,items in text_candidates.items():c.setdefault(key,[]).extend(items)
        if item['type']=='track_name':c.setdefault('_title_candidates',[]).append(evidence(item['text'],'track_name',f"track:{item['track']}",.5,raw=item['text']))
    add_fields(c,source_values,'source_manifest',asset.relative,.98)
    for item in source_values.get('style_evidence',[]):
        add_fields(c,{'style':item['value']},'source_manifest',asset.relative+':'+item['field'],item['score'])
    if asset.member:
        side=str(PurePosixPath(asset.member).with_suffix('.metadata.json'))
        try:
            with zipfile.ZipFile(asset.path) as z:
                if side in z.namelist():
                    if z.getinfo(side).file_size>100_000:raise ValueError('sidecar_too_large')
                    values=json.loads(z.read(side));add_fields(c,values,'sidecar',str(asset.path)+'!'+side,.96)
        except (ValueError,TypeError,AttributeError,zipfile.BadZipFile):issues.append('invalid_metadata_sidecar')
    else:
        side=asset.path.with_suffix('.metadata.json')
        if side.exists():
            try:
                if side.stat().st_size>100_000:raise ValueError('sidecar_too_large')
                values=json.loads(side.read_text());add_fields(c,values,'sidecar',str(side),.96)
            except (ValueError,TypeError,AttributeError):issues.append('invalid_metadata_sidecar')
    name=PurePosixPath(asset.member or asset.relative)
    name_evidence(c,name.stem,'filename',asset.relative,.84)
    for key,items in library_path_evidence(asset,source).items():c.setdefault(key,[]).extend(items)
    inherited=set()
    if any(e['kind']=='filename' for e in c.get('role',[])):inherited.add('role')
    def append_ancestor(ancestor):
        # The closest genre/role folder describes the clip; broader collection
        # labels remain visible as context (e.g. Electronic/Techno, Grooves/Fills).
        for key,items in ancestor.items():
            if key in ('style','role'):
                if key in inherited:
                    items=[dict(e,evidence_score=min(e['evidence_score'],.6),scope='ancestor_context') for e in items]
                else:inherited.add(key)
            c.setdefault(key,[]).extend(items)
    for depth,parent in enumerate(name.parents):
        if parent.name:
            ancestor={};name_evidence(ancestor,parent.name,'parent_folder',str(parent),max(.8,.86-.02*depth))
            if source.adapter in ('gmd','egmd','gigamidi','lucerne'):ancestor.pop('role',None)
            append_ancestor(ancestor)
    # A configured source root itself can be a genre directory.
    source_path=Path(source.path)
    if source_path.is_file():source_path=source_path.parent
    for i,folder in enumerate([source_path]+list(source_path.parents)[:2]):
        ancestor={};name_evidence(ancestor,folder.name,'parent_folder','source_ancestor:'+str(i),.82)
        # GMD's distribution root is literally named "groove", including its fills.
        if source.adapter in ('gmd','egmd','gigamidi','lucerne'):ancestor.pop('role',None)
        append_ancestor(ancestor)
    add_fields(c,source.defaults,'source_default',source.id,.9)
    if annotation:
        if not annotation.get('reason'):issues.append('annotation_without_reason')
        else:add_fields(c,annotation.get('metadata',{}),'annotation','annotation:'+annotation['reason'],1.)
    return c,sorted(set(issues))


def equivalent(field,a,b):
    if field=='tempo':return abs(a-b)<=max(.25,.005*max(a,b))
    if field=='style':return bool(set(a)&set(b))
    return a==b


def resolve(candidates,policy):
    resolved={};conflicts=[]
    for field,items in candidates.items():
        if field.startswith('_'):continue
        ordered=sorted(items,key=lambda x:(PRIORITY.get(x['kind'],99),-x['evidence_score']))
        eligible=[e for e in ordered if e['evidence_score']>=policy.minimum_metadata_score]
        if not eligible:continue
        chosen=eligible[0];resolved[field]=chosen
        if chosen['kind']=='annotation':continue
        for other in eligible[1:]:
            if field in ('tempo','style','meter','role','phrase_beats') and not equivalent(field,chosen['value'],other['value']):
                conflicts.append(dict(field=field,preferred=chosen,alternative=other))
    return resolved,conflicts


def search_identity(candidates,asset):
    def first(key):
        rows=candidates.get(key,[])
        return min(rows,key=lambda x:PRIORITY[x['kind']])['value'] if rows else None
    title=first('title');artist=first('artist')
    if not title:
        stem=PurePosixPath(asset.member or asset.relative).stem
        if ' - ' in stem:artist,title=stem.split(' - ',1)
        else:
            # Track names can be a title, but discard instrument/generic labels.
            from .percussion import DRUM,MELODIC
            track_names=[e['raw'] for e in candidates.get('_title_candidates',[]) if not DRUM.search(e['raw']) and not MELODIC.search(e['raw'])
                         and not re.fullmatch(r'(?:note track|track|midi|untitled|default|sequence)[\s_\d-]*',e['raw'],re.I)]
            title=next(iter(track_names),None) or stem.replace('_',' ')
    title=str(title).strip()[:160];artist=str(artist).strip()[:160] if artist else None
    if artist is None and re.fullmatch(r'(?:[a-fA-F0-9]{32}|[a-fA-F0-9]{40}|[a-fA-F0-9]{64})',title):return None
    if artist is None and ' - ' in title:artist,title=title.split(' - ',1)
    title=TEMPO.sub('',title).strip(' []()_-')
    generic=re.fullmatch(r'(?:untitled|track|midi|drums?|percussion|groove|beat|pattern|loop|clip|take|export|test|ui export)[\s_\d-]*',title,re.I)
    if generic or len(re.sub(r'[^\w]','',title))<3:return None
    if styles_in_name(title) or re.fullmatch(r'[\d_\- ]+',title):return None
    return dict(title=title,artist=artist)
