import gzip
import io
import json
from pathlib import Path
import zipfile
import subprocess
import sys
import mido
import numpy as np
import pytest
from groove.ingest.schema import Config,Source,Policy,WebConfig
from groove.ingest.discover import Asset,discover,unwrap_rmid
from groove.ingest.parse import parse
from groove.ingest.metadata import collect,resolve,search_identity,SourceMetadata
from groove.ingest.percussion import assess
from groove.ingest.web import WebResolver,web_evidence,cache_key
from groove.ingest.pipeline import run,group_splits
from groove.ingest.export import export_hvo


def midi_bytes(name='Drums',channel=9,tempo=True,meter=True,program=None,notes=None):
    mid=mido.MidiFile(ticks_per_beat=480);track=mido.MidiTrack();mid.tracks.append(track)
    track.append(mido.MetaMessage('track_name',name=name))
    if tempo:track.append(mido.MetaMessage('set_tempo',tempo=500000))
    if meter:track.append(mido.MetaMessage('time_signature',numerator=4,denominator=4))
    if program is not None:track.append(mido.Message('program_change',channel=channel,program=program))
    ticks=[]
    if notes is None:notes=[(i*.5,p) for i in range(16) for p in (42,36 if i%4==0 else 38 if i%4==2 else 46)]
    for beat,pitch in notes:
        tick=round(beat*480);ticks.extend([(tick,mido.Message('note_on',channel=channel,note=pitch,velocity=90)),(tick+48,mido.Message('note_on',channel=channel,note=pitch,velocity=0))])
    previous=0
    for tick,msg in sorted(ticks,key=lambda x:x[0]):msg.time=tick-previous;track.append(msg);previous=tick
    track.append(mido.MetaMessage('end_of_track',time=max(0,3840-previous)))
    f=io.BytesIO();mid.save(file=f);return f.getvalue()


@pytest.mark.parametrize('input_kind',['directory','file','zip','config'])
def test_ingest_cli_paths_and_output(tmp_path,input_kind):
    library=tmp_path/'MIDI Library'
    nested=library/'funk'/'session'/'deep'
    nested.mkdir(parents=True)
    midi=nested/'take.MIDI';midi.write_bytes(midi_bytes())
    archive=library/'collection.zip'
    with zipfile.ZipFile(archive,'w') as z:
        z.writestr('funk/session/archived.mid',midi_bytes())
    ignored=library/'.venv';ignored.mkdir()
    (ignored/'ignore.mid').write_bytes(midi_bytes())
    (nested/'not-midi.txt').write_text('not MIDI')
    output=tmp_path/'corpus output'
    if input_kind=='config':
        config=tmp_path/'sources.json'
        config.write_text(json.dumps({'sources':[{'id':'my-library','path':str(library)}],
                                      'output':str(tmp_path/'unused-output')}))
        source_args=['--config',str(config)]
    else:
        path={'directory':library,'file':midi,'zip':archive}[input_kind]
        source_args=['--input',str(path)]
    result=subprocess.run([sys.executable,'scripts/ingest_midi.py',*source_args,
                           '--output',str(output),'--web-mode','off'],
                          cwd=Path(__file__).resolve().parents[1],capture_output=True,text=True)
    assert result.returncode==0,result.stderr
    latest=json.loads((output/'latest.json').read_text())
    expected=2 if input_kind in ('directory','config') else 1
    assert latest['report']['assets']==expected
    assert latest['report']['status_counts']=={'accepted':expected}
    rows=[json.loads(line) for line in (Path(latest['run'])/'manifest.jsonl').read_text().splitlines()]
    assert all('ignore.mid' not in row['relative_path'] for row in rows)
    assert {row['source_id'] for row in rows}=={'my-library' if input_kind=='config' else 'local-midi'}
    assert not (tmp_path/'unused-output').exists()


@pytest.mark.parametrize('case',['missing','unsupported','both'])
def test_ingest_cli_rejects_invalid_inputs(tmp_path,case):
    path=tmp_path/'unsupported.txt'
    if case!='missing':path.write_text('not MIDI')
    args=['--input',str(path)]
    if case=='both':args+=['--config','configs/ingest-gmd.json']
    output=tmp_path/'output'
    result=subprocess.run([sys.executable,'scripts/ingest_midi.py',*args,'--output',str(output)],
                          cwd=Path(__file__).resolve().parents[1],capture_output=True,text=True)
    assert result.returncode==2
    assert 'error:' in result.stderr
    assert not output.exists()


@pytest.mark.parametrize('limit',[1,2,3,8,None])
def test_max_files_is_global_and_counts_failures_and_zip_members(tmp_path,limit):
    broken=tmp_path/'broken.mid';broken.write_bytes(b'not a MIDI')
    archive=tmp_path/'takes.zip'
    with zipfile.ZipFile(archive,'w') as z:
        z.writestr('funk/b.mid',midi_bytes())
        z.writestr('funk/a.mid',midi_bytes())
    last=tmp_path/'funk.mid';last.write_bytes(midi_bytes())
    config=Config(sources=[Source(id='broken',path=str(broken)),
                           Source(id='zip',path=str(archive)),Source(id='last',path=str(last))],
                  output=str(tmp_path/'output'),max_files=limit,web=WebConfig(mode='off'))
    out,report=run(config,progress=lambda _:None)
    rows=[json.loads(line) for line in (out/'manifest.jsonl').read_text().splitlines()]
    expected=4 if limit is None else min(limit,4)
    assert report['assets']==expected
    assert [r['relative_path'] for r in rows]==[
        'broken.mid','takes.zip!funk/a.mid','takes.zip!funk/b.mid','funk.mid'][:expected]
    assert rows[0]['status']=='quarantined'
    assert report['max_files']==limit
    assert report['limit_reached']==(limit is not None and limit<=4)
    assert json.loads((out/'config.json').read_text())['max_files']==limit


def test_max_files_does_not_open_later_sources(tmp_path):
    midi=tmp_path/'funk.mid';midi.write_bytes(midi_bytes())
    config=Config(sources=[Source(id='first',path=str(midi)),
                           Source(id='unopened',path=str(tmp_path/'does-not-exist'))],
                  output=str(tmp_path/'output'),max_files=1,web=WebConfig(mode='off'))
    _,report=run(config,progress=lambda _:None)
    assert report['assets']==1 and report['limit_reached']


@pytest.mark.parametrize('mode',['input','config'])
def test_max_files_cli_and_config_override(tmp_path,mode):
    library=tmp_path/'funk';library.mkdir()
    for i in range(3):(library/f'{i}.mid').write_bytes(midi_bytes())
    config=tmp_path/'config.json'
    config.write_text(json.dumps({'sources':[{'id':'test','path':str(library)}],'max_files':1}))
    output=tmp_path/'output'
    args=['--input',str(library)] if mode=='input' else ['--config',str(config)]
    result=subprocess.run([sys.executable,'scripts/ingest_midi.py',*args,'--output',str(output),
                           '--max-files','2','--web-mode','off'],
                          cwd=Path(__file__).resolve().parents[1],capture_output=True,text=True)
    assert result.returncode==0,result.stderr
    report=json.loads((output/'latest.json').read_text())['report']
    assert report['assets']==2 and report['max_files']==2 and report['limit_reached']


@pytest.mark.parametrize('value',['0','-1','1.5'])
def test_max_files_cli_rejects_invalid_limits(tmp_path,value):
    result=subprocess.run([sys.executable,'scripts/ingest_midi.py','--input',str(tmp_path),
                           '--max-files',value],cwd=Path(__file__).resolve().parents[1],
                          capture_output=True,text=True)
    assert result.returncode==2 and '--max-files' in result.stderr
    with pytest.raises(ValueError):
        Config(sources=[Source(id='s',path=str(tmp_path))],max_files=float(value))


def inspect(data,name='funk_120bpm.mid',source=None):
    source=source or Source(id='s',path='/not-a-real-folder');asset=Asset(Path('/not-a-real-folder')/name,name)
    parsed=parse(data,Policy());c,issues=collect(parsed,asset,source,{})
    return parsed,c,resolve(c,Policy()),asset


def test_tempo_is_not_fabricated_from_midi_default():
    p,c,(r,conflicts),_=inspect(midi_bytes(tempo=False),'funk.mid')
    assert not p['tempo_map'] and 'tempo' not in r
    assert r['style']['value']==['funk']


def test_metadata_hierarchy_and_conflict():
    _,_,(r,conflicts),_=inspect(midi_bytes(),'funk_90bpm.mid')
    assert r['tempo']['value']==120 and r['tempo']['kind']=='midi_event'
    assert conflicts and conflicts[0]['field']=='tempo'


def test_title_is_not_keyword_genre_and_track_title_is_searchable():
    _,c,(r,_),asset=inspect(midi_bytes(name='We Will Rock You'),'file0001.mid')
    assert 'style' not in r
    assert search_identity(c,asset)['title']=='We Will Rock You'


def test_parent_folder_and_no_bare_numeric_bpm():
    _,_,(r,_),_=inspect(midi_bytes(tempo=False),'jazz/session/001.mid')
    assert r['style']['value']==['jazz'] and 'tempo' not in r


def test_velocity_zero_note_off_and_timing_preserved():
    p=parse(midi_bytes(notes=[(.1333,36)]),Policy());n=p['notes'][0]
    assert n['onset_tick']==64 and n['duration_beats']==.1 and len(p['notes'])==1


def test_program_changes_split_streams():
    data=mido.MidiFile(file=io.BytesIO(midi_bytes(name='Track 1',channel=0,program=1)))
    track=data.tracks[0];track.insert(10,mido.Message('program_change',channel=0,program=32))
    f=io.BytesIO();data.save(file=f);p=parse(f.getvalue(),Policy())
    streams,_=assess(p,Source(id='s',path='.'),Policy())
    assert len(streams)==2 and {s['program'] for s in streams}=={1,32}


def test_percussion_assessment_and_melodic_counterexample():
    for name,channel,program,expected in [('Drums',9,None,'percussion'),('Drums',2,None,'percussion'),('Track 1',2,None,'percussion'),('Piano',9,0,'ambiguous')]:
        p=parse(midi_bytes(name=name,channel=channel,program=program),Policy())
        streams,notes=assess(p,Source(id='s',path='.'),Policy())
        assert streams[0]['decision']==expected
        assert bool(notes)==(expected=='percussion')
    p=parse(midi_bytes(name='Piano',channel=0,program=0,notes=[(i*.25,[60,64,67][i%3]) for i in range(32)]),Policy())
    streams,notes=assess(p,Source(id='s',path='.'),Policy());assert not notes and streams[0]['decision']=='non_percussion'


def test_nameless_single_voice_is_not_guessed():
    p=parse(midi_bytes(name='Track 1',channel=0,notes=[(i*.5,38) for i in range(16)]),Policy())
    streams,notes=assess(p,Source(id='s',path='.'),Policy())
    assert not notes


def test_known_td11_map_differs_from_gm():
    p=parse(midi_bytes(notes=[(0,58),(1,22)]),Policy())
    _,notes=assess(p,Source(id='gmd',path='.',drum_map='roland_td11'),Policy())
    assert [n['voice'] for n in notes]==['floor-tom','closed-hihat']
    _,notes=assess(p,Source(id='generic',path='.'),Policy())
    assert notes[0]['instrument']=='vibraslap' and notes[0]['voice'] is None


def test_rmid_and_archive_bounds(tmp_path):
    data=midi_bytes();body=b'RMIDdata'+len(data).to_bytes(4,'little')+data
    wrapped=b'RIFF'+len(body).to_bytes(4,'little')+body
    assert unwrap_rmid(wrapped)==data
    z=tmp_path/'collection.zip'
    with zipfile.ZipFile(z,'w') as archive:
        archive.writestr('../bad.mid',data);archive.writestr('funk/good.mid',data)
    assets=list(discover(z,Policy()));assert len(assets)==2
    assert any(a.error=='unsafe_archive_path' for a in assets)
    assert next(a for a in assets if not a.error).read(10000)==data


def test_type_two_and_smpte_are_not_misread():
    data=bytearray(midi_bytes());data[8:10]=(2).to_bytes(2,'big')
    with pytest.raises(ValueError,match='type2'):parse(bytes(data),Policy())
    data=bytearray(midi_bytes());data[12:14]=b'\xe7\x28'
    with pytest.raises(ValueError,match='smpte'):parse(bytes(data),Policy())


def test_web_exact_identity_genre_cache_and_no_recording_bpm(tmp_path):
    identity={'title':'Example Song','artist':'Example Artist'};calls=[]
    identifier='12345678-1234-1234-1234-123456789abc'
    def fetch(url):
        calls.append(url)
        if '/recording/?' in url:return {'count':1,'recordings':[{'id':identifier,'title':'Example Song','artist-credit':[{'name':'Example Artist'}]}]}
        return {'genres':[{'name':'rock','count':3}]}
    r=WebResolver(WebConfig(cache=str(tmp_path)),fetch=fetch)
    result=r.lookup(identity);assert result['status']=='resolved' and len(calls)==2
    assert r.lookup(identity)['cache_hit'] and len(calls)==2
    result['evidence'].append(dict(field='tempo',value=87,url='https://example.org/song',scope='recording'))
    assert 'tempo' not in web_evidence(result,identity)
    assert web_evidence(result,identity)['style'][0]['value']==['rock']


def test_web_ambiguity_and_failure_are_not_no_match(tmp_path):
    identity={'title':'Song','artist':None}
    def fetch(url):return {'recordings':[{'id':'1','title':'Song'},{'id':'2','title':'Song'}]}
    assert WebResolver(WebConfig(cache=str(tmp_path)),fetch=fetch).lookup(identity)['status']=='ambiguous'
    def error(url):raise TimeoutError('network timeout')
    result=WebResolver(WebConfig(cache=str(tmp_path/'new')),fetch=error).lookup(identity)
    assert result['status']=='error'


def test_pipeline_canonical_export_and_rejection(tmp_path):
    raw=tmp_path/'raw';raw.mkdir();(raw/'funk_120bpm.mid').write_bytes(midi_bytes())
    (raw/'untitled.mid').write_bytes(midi_bytes(tempo=False));(raw/'broken.mid').write_bytes(b'bad')
    config=Config(sources=[Source(id='s',path=str(raw))],output=str(tmp_path/'out'),web=WebConfig(mode='off',cache=str(tmp_path/'cache')))
    out,report=run(config,progress=lambda _:None)
    assert report['status_counts']=={'discarded':2,'accepted':1}
    rows=[json.loads(x) for x in (out/'manifest.jsonl').read_text().splitlines()]
    accepted=next(r for r in rows if r['status']=='accepted')
    with gzip.open(out/accepted['record'],'rt') as f:record=json.load(f)
    assert len(record['percussion_events'])==32 and record['midi']['control_events']==[]
    exported=export_hvo(out,tmp_path/'hvo');assert sum(exported['splits'].values())==1
    arr=np.load(tmp_path/'hvo'/f"{accepted['split']}.npz")
    assert arr['drums'].shape==(1,32,9,3)
    assert (raw/'untitled.mid').exists()


def test_conflicts_quarantined_and_annotation_reproducible(tmp_path):
    raw=tmp_path/'raw';raw.mkdir();(raw/'funk_90bpm.mid').write_bytes(midi_bytes())
    config=Config(sources=[Source(id='s',path=str(raw))],output=str(tmp_path/'out'),web=WebConfig(mode='off',cache=str(tmp_path/'cache')))
    out,report=run(config,progress=lambda _:None);assert report['status_counts']=={'quarantined':1}
    row=json.loads((out/'manifest.jsonl').read_text());annotations=tmp_path/'annotations.json'
    annotations.write_text(json.dumps({row['sha256']:{'reason':'Checked MIDI tempo against source session','metadata':{'tempo':120}}}))
    config.annotations=str(annotations);out,report=run(config,progress=lambda _:None)
    assert report['status_counts']=={'accepted':1}


def test_exact_duplicate_split_conflict_quarantines_both():
    rows=[dict(group_keys=['source:a','bytes:same'],official_split='train',status='accepted',reasons=[]),
          dict(group_keys=['source:b','bytes:same'],official_split='test',status='accepted',reasons=[])]
    group_splits(rows,42)
    assert all(r['status']=='quarantined' and r['split'] is None for r in rows)


def test_generic_web_error_quarantines_instead_of_discards(tmp_path):
    raw=tmp_path/'raw';raw.mkdir();(raw/'Artist - Missing Song.mid').write_bytes(midi_bytes())
    class Resolver:
        def lookup(self,identity):return {'identity':identity,'status':'error','error':'temporary timeout'}
    config=Config(sources=[Source(id='s',path=str(raw))],output=str(tmp_path/'out'))
    out,report=run(config,resolver=Resolver(),progress=lambda _:None)
    assert report['status_counts']=={'quarantined':1} and 'web_error' in report['reason_counts']


def test_new_genres_in_declared_fields_survive_normalization():
    from groove.ingest.metadata import add_fields
    c={};add_fields(c,{'style':'neworleans/secondline'},'source_manifest','info.csv',.98)
    assert c['style'][0]['value']==['neworleans'] and c['style'][0]['raw']==['neworleans/secondline']


def test_brave_requires_matching_artist_and_corroboration(tmp_path):
    def fetch(url):
        return {'web':{'results':[dict(title='Example Song — Example Artist',description='Genre: funk.',url='https://'+host+'/song') for host in ('catalog.example.org','music.example.net')]}}
    resolver=WebResolver(WebConfig(mode='brave',cache=str(tmp_path)),fetch=fetch)
    result=resolver.lookup({'title':'Example Song','artist':'Example Artist'})
    assert result['status']=='resolved' and len(result['evidence'])==2
    assert resolver.lookup({'title':'Example Song','artist':None})['status']=='ambiguous'


def test_duplicate_source_ids_are_invalid():
    with pytest.raises(ValueError):Config(sources=[Source(id='same',path='a'),Source(id='same',path='b')])


def test_multichannel_track_name_does_not_label_every_channel():
    mid=mido.MidiFile(file=io.BytesIO(midi_bytes(name='Drums')))
    mid.tracks[0].insert(2,mido.Message('note_on',channel=0,note=72,velocity=90))
    mid.tracks[0].insert(3,mido.Message('note_off',channel=0,note=72,velocity=0))
    data=io.BytesIO();mid.save(file=data)
    streams,notes=assess(parse(data.getvalue(),Policy()),Source(id='s',path='.'),Policy())
    assert {n['channel'] for n in notes}=={9}


def test_web_tempo_is_bound_to_exact_midi_arrangement():
    identity={'title':'Song','artist':'Artist'}
    result=dict(status='resolved',identity=identity,identity_status='exact',evidence=[
        dict(field='tempo',value=123,url='https://example.org/song',scope='midi_arrangement',midi_sha256='one')])
    assert not web_evidence(result,identity,'two')
    assert web_evidence(result,identity,'one')['tempo'][0]['value']==123


def test_gmd_zip_manifest_adapter(tmp_path):
    path=tmp_path/'gmd.zip'
    with zipfile.ZipFile(path,'w') as z:
        z.writestr('groove/info.csv','midi_filename,style,bpm,time_signature,id,split\nd/s/test.mid,funk,120,4-4,d/s/test,train\n')
        z.writestr('groove/d/s/test.mid',midi_bytes())
    source=Source(id='gmd',path=str(path),adapter='gmd');asset=next(discover(path,Policy()))
    assert SourceMetadata(source).get(asset)['group_id']=='d/s/test'


def test_zip_sidecar_is_equivalent_to_file_sidecar(tmp_path):
    path=tmp_path/'library.zip'
    with zipfile.ZipFile(path,'w') as z:
        z.writestr('song.mid',midi_bytes(tempo=False));z.writestr('song.metadata.json',json.dumps({'tempo':99,'style':'nu jazz'}))
    source=Source(id='s',path=str(path));asset=next(discover(path,Policy()))
    c,_=collect(parse(asset.read(10000),Policy()),asset,source,{})
    metadata,_=resolve(c,Policy());assert metadata['tempo']['value']==99 and metadata['style']['value']==['nu-jazz']


def test_tempo_override_is_used_in_model_export(tmp_path):
    raw=tmp_path/'raw';raw.mkdir();(raw/'funk.mid').write_bytes(midi_bytes())
    annotations=tmp_path/'a.json';annotations.write_text(json.dumps({'s:funk.mid':{'reason':'Verified initial tempo','metadata':{'tempo':90}}}))
    config=Config(sources=[Source(id='s',path=str(raw))],output=str(tmp_path/'out'),annotations=str(annotations),web=WebConfig(mode='off',cache=str(tmp_path/'cache')))
    out,_=run(config,progress=lambda _:None);report=export_hvo(out,tmp_path/'hvo')
    arrays=[np.load(tmp_path/'hvo'/f'{s}.npz')['bpm'] for s in ('train','validation','test')]
    assert np.concatenate(arrays).tolist()==[90.]


def test_uninterpreted_vendor_routing_requires_review(tmp_path):
    raw=tmp_path/'raw';raw.mkdir();mid=mido.MidiFile(file=io.BytesIO(midi_bytes()))
    mid.tracks[0].insert(0,mido.Message('sysex',data=[0x41,0x10,0x42,0x12,0x40,0,0x7f,0,0x41]))
    mid.save(raw/'funk.mid')
    config=Config(sources=[Source(id='s',path=str(raw))],output=str(tmp_path/'out'),web=WebConfig(mode='off',cache=str(tmp_path/'cache')))
    out,report=run(config,progress=lambda _:None)
    assert report['status_counts']=={'quarantined':1}
    assert report['reason_counts']['uninterpreted_sysex_requires_review']==1
