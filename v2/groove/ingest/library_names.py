"""Conservative naming grammars for inspected commercial MIDI library layouts."""
from pathlib import Path, PurePosixPath
import re
from .schema import evidence


def decode_catalog_name(text):
    """Toontrack browser ordering and trailing subdivision are not genre text."""
    text=re.sub(r'^\d+@','',text)
    return re.sub(r'[_ ]*\(\d+#\d+\)\s*$','',text).replace('_',' ')


def library_path_evidence(asset,source):
    from .metadata import TEMPO, TEMPO_RANGE, declared_style
    path=PurePosixPath(asset.member or asset.relative)
    context=list(path.parts[:-1])+list(Path(source.path).parts)
    ron=any(re.search(r'\b(?:Essentials|Anthology)\b.*(?:Ron D\. Rock|MIDI Pack)',part,re.I)
            or part.startswith(('Djentastic','KVLT2 - Black Metal MIDI Pack')) for part in context)
    gm=any(part.startswith('GM MIDI Pack') for part in context)
    superior=any(part.startswith('Superior Drummer 2 Drum Midi') for part in context)
    ni=any('Drummer MIDI Files' in part for part in context)
    result={}
    def add(field,value,raw,locator,rule,kind='filename'):
        result.setdefault(field,[]).append(evidence(value,kind,locator,.86,raw=raw,naming_rule=rule))
    if ron or gm or superior or ni:
        stem=decode_catalog_name(path.stem)
        words=re.sub(r'(?<=[a-z])(?=[A-Z])',' ',stem)
        words=TEMPO.sub(' ',TEMPO_RANGE.sub(' ',words))
        # Explicit Fill/Beat/Groove tokens only, not the absence of a fill label.
        if re.search(r'\bfill(?:s)?\s*(?:\d+)?\s*(?:-midi-remap-com)?$',words,re.I):
            add('role','fill',path.stem,asset.relative,'library_terminal_fill_token')
        elif ron and re.search(r'\b(?:beat|groove)s?\s*\d+(?:[-_ ]\d+)*(?:-midi-remap-com)?$',words,re.I):
            add('role','groove',path.stem,asset.relative,'ron_beat_groove_number')
        # The inspected GM catalog uses a leading BPM in this filename grammar.
        # Theme-80, Beat-179-0, and bare file indexes do not match.
        if gm and (match:=re.match(r'^(\d{2,3}(?:\.\d+)?)\s+(?=\S)',stem)):
            rest=stem[match.end():]
            if not re.match(r'[-–]\s*\d',rest) and re.search(r'[a-zA-Z]',rest):
                bpm=float(match[1])
                if 30<=bpm<=300:add('tempo',bpm,path.stem,asset.relative,'gm_catalog_leading_bpm')
    # Two product titles that do not use the ordinary '<genre> Essentials' grammar.
    for parent in path.parents:
        if parent.name=='KVLT2 - Black Metal MIDI Pack':
            add('style',[declared_style('black metal')],parent.name,str(parent),'kvlt2_explicit_genre','parent_folder')
        if parent.name=='Djentastic (Ron D. Rock)':
            add('style',['djent'],parent.name,str(parent),'djentastic_catalog_alias','parent_folder')
    return result
