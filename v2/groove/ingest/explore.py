"""Read-only notebook helpers: HVO selection, provenance, piano roll and preview audio."""
import gzip
import json
from pathlib import Path
import zipfile
import numpy as np
from ..events import DRUMS,PITCHES,STYLES


def npz_row(path,key,index):
    """Read one C-order numeric row without materializing the entire compressed tensor."""
    with zipfile.ZipFile(path) as archive,archive.open(key+'.npy') as stream:
        version=np.lib.format.read_magic(stream)
        reader=np.lib.format.read_array_header_1_0 if version==(1,0) else np.lib.format.read_array_header_2_0
        shape,fortran,dtype=reader(stream)
        if fortran or dtype.hasobject:raise ValueError('Expected C-order numeric HVO arrays')
        if not 0<=index<shape[0]:raise IndexError(index)
        size=int(np.prod(shape[1:]))*dtype.itemsize
        stream.seek(index*size,1)
        raw=stream.read(size)
        if len(raw)!=size:raise ValueError('Truncated HVO array')
        return np.frombuffer(raw,dtype=dtype).reshape(shape[1:]).copy()


def split_files(folder):
    folder=Path(folder)
    result=[]
    for split in ('train','validation','test'):
        path=folder/f'{split}.npz'
        if not path.exists():continue
        with zipfile.ZipFile(path) as archive,archive.open('drums.npy') as stream:
            version=np.lib.format.read_magic(stream)
            reader=np.lib.format.read_array_header_1_0 if version==(1,0) else np.lib.format.read_array_header_2_0
            shape,_,_=reader(stream)
        result.append(dict(split=split,file=path.name,examples=shape[0],shape=str(shape),megabytes=round(path.stat().st_size/1e6,2)))
    return result


def example(folder,split,index=None,seed=None,fill=None):
    if split not in ('train','validation','test'):raise ValueError('Choose train, validation or test')
    path=Path(folder)/f'{split}.npz'
    with np.load(path,allow_pickle=False) as data:
        count=len(data['bpm']);choices=np.arange(count)
        if fill is not None:
            if 'has_fill' not in data:raise ValueError('This old export has no fill labels; re-export a role-aware canonical run.')
            choices=choices[data['has_fill']==fill]
        if not len(choices):return None
        if index is None:index=int(np.random.default_rng(seed).choice(choices))
        if index not in choices:raise ValueError(f'Index {index} is outside the split or selected fill filter')
        info=dict(split=split,index=index,bpm=float(data['bpm'][index]),style=STYLES[int(data['style'][index])])
        for key in ('has_fill','fill_start_beat','fill_duration_beats','synthetic'):
            if key in data:info[key]=data[key][index].item()
    y=npz_row(path,'drums',index)
    events=[dict(onset_beat=((step+float(y[step,voice,2]))/4)%8,voice=DRUMS[voice],pitch=PITCHES[voice],
                 velocity=float(y[step,voice,1])*127) for step,voice in np.argwhere(y[...,0]>.5)]
    return info,events


def provenance(folder,split,index):
    folder=Path(folder)
    if (folder/'manifest.jsonl').exists():
        with (folder/'manifest.jsonl').open() as f:
            for line in f:
                row=json.loads(line)
                if row['split']==split and row['split_index']==index:return row
        return {}
    if (folder/'manifest.json').exists():
        rows=json.loads((folder/'manifest.json').read_text())
        selected=[r for r in rows if r['split']==split]
        return selected[index] if index<len(selected) else {}
    return {}


def canonical_run(folder,override=None):
    path=Path(override) if override else Path(json.loads((Path(folder)/'dataset-card.json').read_text())['canonical_run'])
    if (path/'manifest.jsonl').exists():return path
    raise FileNotFoundError('Canonical run moved or unavailable. Set CANONICAL_RUN to its current path; HVO export alone does not contain discarded records.')


def rejected(folder,limit=100,status=None,reason=''):
    found=[]
    with (Path(folder)/'manifest.jsonl').open() as f:
        for line in f:
            row=json.loads(line)
            if row['status']=='accepted':continue
            if status and row['status']!=status:continue
            if reason and not any(reason.lower() in r.lower() for r in row.get('reasons',[])):continue
            found.append(row)
            if len(found)>=limit:break
    return found


def read_record(folder,row):
    with gzip.open(Path(folder)/row['record'],'rt',encoding='utf-8') as f:return json.load(f)


def piano_roll(events,bpm=None,fill_start=None,start=0.,beats=8.,title='Drum piano roll'):
    import matplotlib.pyplot as plt
    from matplotlib.patches import Rectangle
    from matplotlib.colors import Normalize
    from matplotlib.cm import ScalarMappable
    end=start+beats
    visible=[n for n in events if start<=n['onset_beat']<end]
    label=lambda n:n.get('voice') or n.get('instrument') or f"pitch:{n['pitch']}"
    labels=list(DRUMS)+sorted({label(n) for n in visible}-set(DRUMS))
    fig,ax=plt.subplots(figsize=(13,max(3.5,len(labels)*.35)))
    cmap=plt.get_cmap('viridis');norm=Normalize(1,127)
    for n in visible:
        ax.add_patch(Rectangle((n['onset_beat'],labels.index(label(n))-.35),.12,.7,
                              facecolor=cmap(norm(n['velocity'])),edgecolor='none'))
    if fill_start is not None and np.isfinite(fill_start):
        ax.axvspan(max(start,fill_start),end,color='orange',alpha=.14,label='fill region');ax.legend(loc='upper right')
    ax.set(xlim=(start,end),ylim=(-.6,len(labels)-.4),xlabel='Quarter-note beat',title=title+(f' · {bpm:g} BPM' if bpm else ''))
    ax.set_yticks(range(len(labels)),labels);ax.set_xticks(np.arange(start,end+.01,.5));ax.grid(axis='x',alpha=.2)
    fig.colorbar(ScalarMappable(norm=norm,cmap=cmap),ax=ax,label='Velocity');fig.tight_layout()
    return fig


def preview_audio(events,bpm,beats=8.,sample_rate=22050):
    """Deterministic synthesized drum preview; seconds preserve offsets and supplied tempo."""
    if not np.isfinite(bpm) or not 10<=bpm<=600:raise ValueError('Explicit finite BPM between 10 and 600 required for playback')
    duration=beats*60/bpm;audio=np.zeros(int((duration+.8)*sample_rate),np.float32)
    rng=np.random.default_rng(19);cache={}
    for voice in DRUMS:
        length=.7 if voice in ('crash','ride','open-hihat') else .4
        t=np.arange(int(length*sample_rate))/sample_rate
        noise=rng.normal(size=len(t));high=np.diff(noise,prepend=0)*.3
        if voice=='kick':
            frequency=45+100*np.exp(-t*35);wave=np.sin(2*np.pi*np.cumsum(frequency)/sample_rate)*np.exp(-t*13)
        elif voice=='snare':wave=(.6*noise+.4*np.sin(2*np.pi*180*t))*np.exp(-t*22)
        elif 'tom' in voice:
            frequency={'floor-tom':90,'mid-tom':130,'hi-tom':180}[voice]
            wave=np.sin(2*np.pi*frequency*t)*np.exp(-t*13)+noise*.05*np.exp(-t*30)
        else:wave=high*np.exp(-t*(75 if voice=='closed-hihat' else 8))
        cache[voice]=wave.astype(np.float32)*.4
    for note in events:
        voice=note.get('voice');beat=note['onset_beat']
        if voice not in cache or not 0<=beat<beats:continue
        offset=int(round(beat*60/bpm*sample_rate));wave=cache[voice]*(note['velocity']/127)
        n=min(len(wave),len(audio)-offset)
        if n>0:audio[offset:offset+n]+=wave[:n]
    peak=np.max(np.abs(audio),initial=0)
    if peak>.95:audio*=.95/peak
    return audio,sample_rate
