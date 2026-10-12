import gzip
import json
import sqlite3
import zlib
import numpy as np
import mido
import pytest
from groove.ingest.schema import Config,Source,Policy,WebConfig,HVOConfig
from groove.ingest.metadata import name_evidence,resolve,SourceMetadata
from groove.ingest.discover import Asset
from groove.ingest.pipeline import run
from groove.ingest.export import export_hvo


def note(beat,pitch=36,velocity=90):
    return dict(onset_beat=beat,pitch=pitch,voice='kick' if pitch==36 else 'snare',velocity=velocity,duration_beats=.1)


def canonical(tmp_path,specs):
    root=tmp_path/'canonical';root.mkdir();(root/'records').mkdir();(root/'config.json').write_text('{}');rows=[]
    for i,s in enumerate(specs):
        ident=str(i);role=s.get('role','unknown');bpm=s.get('bpm',120)
        meta={'style':{'value':s.get('styles',['funk'])},'tempo':{'value':bpm},'meter':{'value':s.get('meter',[4,4])},'role':{'value':role}}
        if 'phrase_beats' in s:meta['phrase_beats']={'value':s['phrase_beats']}
        row=dict(id=ident,source_id=s.get('source','s'),split=s.get('split','train'),split_group='group'+ident,
                 status='accepted',percussion_hash=s.get('hash','hash'+ident),record=f'records/{ident}.json.gz',metadata=meta)
        record=dict(metadata=meta,midi=dict(duration_beats=s.get('duration',8),meter_map=[],tempo_map=s.get('tempo_map',[])),
                    percussion_events=s.get('notes',[note(0),note(1,38)]),metadata_conflicts=s.get('conflicts',[]))
        with gzip.open(root/row['record'],'wt') as f:json.dump(record,f)
        rows.append(row)
    (root/'manifest.jsonl').write_text(''.join(json.dumps(r)+'\n' for r in rows));return root


def export(tmp_path,specs,**options):
    options.setdefault('fill_boundary','strict')
    out=tmp_path/'hvo';report=export_hvo(canonical(tmp_path,specs),out,options=HVOConfig(**options))
    return report,json.loads((out/'manifest.json').read_text()),np.load(out/'train.npz',allow_pickle=False)


def test_composes_before_quantization_preserving_timing(tmp_path):
    report,manifest,ds=export(tmp_path,[dict(role='groove',notes=[note(0),note(5.6,38,72),note(6.25),note(7.5)]),
        dict(role='fill',duration=2,bpm=100,notes=[note(.1,38,113),note(1.5,38,80)])])
    assert report['statistics']['compatible_pairs']==1
    s=next(r for r in manifest if r['synthetic']);i=s['split_index']
    assert s['parent_ids']==['0','1'] and s['parent_groups']==['group0','group1']
    assert s['fill_start_beat']==6 and s['fill_duration_beats']==2 and s['fill_tempo_ratio']==1.2
    assert ds['has_fill'].tolist()==[0,1] and ds['fill_mask'][i].tolist()==[0]*24+[1]*8
    y=ds['drums'][i];assert y[24,1,0]==1
    assert y[24,1,1]==pytest.approx(113/127) and y[24,1,2]==pytest.approx(.4)
    assert y[25,0,0]==0 and y[30,0,0]==0 and np.isnan(ds['fill_start_beat'][0])


def test_export_streams_without_payload_sort_and_releases_split_arrays(tmp_path,monkeypatch):
    connect=sqlite3.connect
    checked=[]

    class CheckedConnection(sqlite3.Connection):
        def execute(self,sql,parameters=()):
            if sql.startswith('SELECT w.y,w.meta'):
                plan=list(super().execute('EXPLAIN QUERY PLAN '+sql,parameters))
                assert not any('TEMP B-TREE' in row[3] for row in plan),plan
                for (blob,) in super().execute('SELECT y FROM windows'):
                    assert len(blob)<32*9*3*4
                    assert len(zlib.decompress(blob))==32*9*3*4
                assert not list(super().execute("SELECT name FROM sqlite_master WHERE name='exclusions'"))
                checked.append(parameters[0])
            return super().execute(sql,parameters)

    monkeypatch.setattr(sqlite3,'connect',lambda path:connect(path,factory=CheckedConnection))
    save=np.savez_compressed
    def checked_save(path,**arrays):
        if path.name!='train.npz':
            assert not list(path.parent.glob('.hvo-stage-*/train-*.npy'))
        save(path,**arrays)
    monkeypatch.setattr(np,'savez_compressed',checked_save)
    report,manifest,ds=export(tmp_path,[dict(role='groove'),dict(role='fill',duration=2)])
    assert checked==['train','validation','test']
    assert report['splits']=={'train':2,'validation':0,'test':0}
    assert [r['split_index'] for r in manifest]==[0,1]
    assert ds['has_fill'].tolist()==[0,1]
    assert (tmp_path/'hvo/excluded.jsonl').read_text()
    assert not list((tmp_path/'hvo').glob('.hvo-stage-*'))


@pytest.mark.parametrize('options,fill,expected',[
    ({},dict(split='test'),0),({},dict(source='another'),0),({'pair_scope':'corpus'},dict(source='another'),1),
    ({},dict(styles=['jazz']),0),({},dict(bpm=60),0),({'tempo_policy':'match'},dict(bpm=110),0),
    ({'combine_fills':False},{},0),({},dict(meter=[3,4]),0)])
def test_pair_constraints(tmp_path,options,fill,expected):
    r,_,_=export(tmp_path,[dict(role='groove'),dict(role='fill',duration=2,notes=[note(.5,38)],**fill)],fill_boundary='strict',**options)
    assert r['statistics']['compatible_pairs']==expected


def test_coarse_model_styles_do_not_define_pairs(tmp_path):
    r,_,_=export(tmp_path,[dict(role='groove',styles=['house']),dict(role='fill',styles=['techno'],duration=2)])
    assert r['statistics']['compatible_pairs']==0


def test_unknown_and_mixed_are_not_negative_labels(tmp_path):
    _,manifest,ds=export(tmp_path,[dict(role='unknown'),dict(role='mixed',notes=[note(2,38)])])
    assert ds['has_fill'].tolist()==[-1,-1] and (ds['fill_mask']==-1).all()
    assert all(not r['synthetic'] for r in manifest)


def test_terminal_hit_decodes_at_end_not_at_zero(tmp_path):
    r,manifest,ds=export(tmp_path,[dict(role='groove'),dict(role='fill',duration=2,notes=[note(1.99,38)])],fill_boundary='strict')
    s=next(r for r in manifest if r['synthetic']);i=s['split_index'];y=ds['drums'][i]
    assert ((float(y[0,1,2]))/4)%8==pytest.approx(7.99)
    assert ds['fill_hit_mask'][i,0,1]==1 and ds['fill_hit_mask'][i,0,0]==0


def test_fill_phrase_length_and_explicit_override(tmp_path):
    r,_,_=export(tmp_path,[dict(role='groove'),dict(role='fill',duration=1.98,notes=[note(1,38)])],fill_boundary='strict')
    assert r['statistics']['fill_non_grid_phrase_length']==1 and r['statistics']['compatible_pairs']==0
    second=tmp_path/'second';second.mkdir()
    r,m,_=export(second,[dict(role='groove'),dict(role='fill',duration=2.08,phrase_beats=2,notes=[note(1.5,38)])])
    assert r['statistics']['compatible_pairs']==1 and any(x['synthetic'] for x in m)


def test_combination_guard_fails_without_success_card(tmp_path):
    root=canonical(tmp_path,[dict(role='groove'),dict(role='fill',duration=2),dict(role='fill',duration=1,notes=[note(.5,38)])])
    with pytest.raises(ValueError,match='exceeds max_combinations'):
        export_hvo(root,tmp_path/'hvo',options=HVOConfig(max_combinations=1))
    assert not (tmp_path/'hvo/dataset-card.json').exists() and not list((tmp_path/'hvo').glob('.hvo-stage-*'))


def test_all_pairs_without_duplicate_multistyle_join(tmp_path):
    r,m,_=export(tmp_path,[dict(role='groove',styles=['funk','soul']),dict(role='groove',notes=[note(0,38)],styles=['funk','soul']),
        dict(role='fill',duration=2,notes=[note(.5,38)],styles=['funk','soul']),dict(role='fill',duration=1,notes=[note(.5)],styles=['funk','soul'])],fill_boundary='strict')
    assert r['statistics']['compatible_pairs']==4 and sum(x['synthetic'] for x in m)==4


def test_conflicting_fill_labels_and_cross_split_tensors_removed(tmp_path):
    r,m,_=export(tmp_path,[dict(role='groove'),dict(role='fill'),dict(role='unknown',split='test')])
    assert m==[] and r['conflicting_fill_label_hashes']==1 and r['cross_split_hvo_hashes']==1


def test_role_evidence_and_tempo_ranges():
    c={};name_evidence(c,'Groove 01','filename','file',.84);name_evidence(c,'03 - Fills.prt','parent_folder','folder',.86)
    r,conflicts=resolve(c,Policy());assert r['role']['value']=='fill' and not conflicts
    c={};name_evidence(c,'Fill Me In','track_name','track',.86);assert 'role' not in c
    name_evidence(c,'role=groove; style=funk','midi_text','track',.90)
    name_evidence(c,'funk_fill_01','filename','file',.84)
    _,conflicts=resolve(c,Policy());assert any(x['field']=='role' for x in conflicts)
    c={};name_evidence(c,'03 - 130 - 150 BPM.sng','parent_folder','folder',.86);assert 'tempo' not in c


def test_egmd_role_and_group(tmp_path):
    (tmp_path/'e-gmd-v1.0.0.csv').write_text('midi_filename,style,bpm,time_signature,id,split,beat_type\na.midi,funk,120,4-4,performance,train,beat\nb.midi,funk,120,4-4,performance,train,fill\n')
    adapter=SourceMetadata(Source(id='egmd',path=str(tmp_path),adapter='egmd'))
    assert adapter.get(Asset(tmp_path/'a.midi','a.midi'))['role']=='groove'
    assert adapter.get(Asset(tmp_path/'b.midi','b.midi'))['role']=='fill'
    assert adapter.get(Asset(tmp_path/'b.midi','b.midi'))['group_id']=='performance'


def test_end_to_end_sidecar_role(tmp_path):
    raw=tmp_path/'raw';raw.mkdir()
    for name,duration,role in [('groove',8,'groove'),('fill',2,'fill')]:
        mid=mido.MidiFile();track=mido.MidiTrack();mid.tracks.append(track)
        track.append(mido.MetaMessage('set_tempo',tempo=500000));track.append(mido.MetaMessage('time_signature',numerator=4,denominator=4))
        pitch=36 if role=='groove' else 38
        track.append(mido.Message('note_on',channel=9,note=pitch,velocity=100));track.append(mido.Message('note_off',channel=9,note=pitch,time=48))
        track.append(mido.MetaMessage('end_of_track',time=duration*480-48));mid.save(raw/f'{name}.mid')
        (raw/f'{name}.metadata.json').write_text(json.dumps({'role':role,'style':'funk'}))
    cfg=Config(sources=[Source(id='s',path=str(raw),defaults={'group_id':'one-session'})],output=str(tmp_path/'corpus'),web=WebConfig(mode='off',cache=str(tmp_path/'cache')))
    root,report=run(cfg,progress=lambda _:None)
    assert report['role_counts']=={'fill':1,'groove':1}
    assert export_hvo(root,tmp_path/'hvo')['statistics']['synthetic_kept']==1


def test_inferred_fill_boundary_is_recorded_and_does_not_cut_resolution(tmp_path):
    r,m,ds=export(tmp_path,[dict(role='groove'),dict(role='fill',duration=4.7,notes=[note(3.4,38)])],fill_boundary='next_bar')
    s=next(x for x in m if x['synthetic'])
    assert s['fill_duration_beats']==4 and s['fill_boundary_basis']=='inferred_next_bar_after_last_onset'
    assert s['fill_original_duration_beats']==4.7
    other=tmp_path/'resolution';other.mkdir()
    r,m,_=export(other,[dict(role='groove'),dict(role='fill',duration=4.2,notes=[note(4,38)])],fill_boundary='next_bar')
    assert r['statistics']['fill_not_shorter_than_window']==1 and not any(x['synthetic'] for x in m)


def test_tempo_changes_are_not_flattened_into_fill_pairs(tmp_path):
    r,m,_=export(tmp_path,[dict(role='groove'),dict(role='fill',duration=2,tempo_map=[{'beat':1,'bpm':90}])])
    assert r['statistics']['fill_unsupported_tempo']==1 and not any(x['synthetic'] for x in m)


def test_role_conflict_cannot_create_negative_supervision(tmp_path):
    r,m,ds=export(tmp_path,[dict(role='groove',conflicts=[{'field':'role'}])])
    assert ds['has_fill'].tolist()==[-1] and r['statistics']['compatible_pairs']==0


def test_rejections_and_streaming_manifest_are_inspectable(tmp_path):
    r,m,ds=export(tmp_path,[dict(role='groove'),dict(role='unknown',notes=[note(1),note(1.01)])])
    errors=[json.loads(line) for line in (tmp_path/'hvo/excluded.jsonl').read_text().splitlines()]
    assert any(e['reason']=='collision_rejected_windows' and e['source']=='1' for e in errors)
    assert [json.loads(line) for line in (tmp_path/'hvo/manifest.jsonl').read_text().splitlines()]==m


def test_name_role_camelcase_and_explicit_tempo():
    c={};name_evidence(c,'135bpmMediumBeat4','filename','file',.84)
    r,_=resolve(c,Policy());assert r['role']['value']=='groove' and r['tempo']['value']==135


def test_notebook_preview_decodes_pickup_and_produces_finite_audio(tmp_path):
    from groove.ingest.explore import split_files,example,preview_audio,provenance
    r,m,_=export(tmp_path,[dict(role='groove',notes=[note(0)]),dict(role='fill',duration=2,notes=[note(1.99,38)])])
    folder=tmp_path/'hvo';assert split_files(folder)[0]['examples']==2
    info,events=example(folder,'train',index=1,fill=1)
    assert max(n['onset_beat'] for n in events)==pytest.approx(7.99)
    audio,sr=preview_audio(events,info['bpm'])
    assert sr==22050 and np.isfinite(audio).all() and np.max(np.abs(audio))>0
    assert provenance(folder,'train',1)['parent_ids']==['0','1']
    assert example(folder,'validation') is None
    with pytest.raises(ValueError):preview_audio(events,float('nan'))


def test_gmd_zip_distribution_root_does_not_mislabel_fills(tmp_path):
    import zipfile
    from groove.ingest.discover import discover
    from groove.ingest.metadata import collect
    from groove.ingest.parse import parse
    path=tmp_path/'gmd.zip';mid=mido.MidiFile();track=mido.MidiTrack();mid.tracks.append(track)
    track.append(mido.Message('note_on',channel=9,note=36,velocity=100));track.append(mido.Message('note_off',channel=9,note=36,time=480))
    import io
    buffer=io.BytesIO();mid.save(file=buffer)
    with zipfile.ZipFile(path,'w') as archive:
        archive.writestr('groove/info.csv','midi_filename,style,bpm,time_signature,id,split,beat_type\nd/s/fill.mid,funk,120,4-4,one,train,fill\n')
        archive.writestr('groove/d/s/fill.mid',buffer.getvalue())
    source=Source(id='gmd',path=str(path),adapter='gmd')
    asset=next(discover(path,Policy()));adapter=SourceMetadata(source)
    candidates,_=collect(parse(asset.read(10000),Policy()),asset,source,adapter.get(asset))
    result,conflicts=resolve(candidates,Policy())
    assert result['role']['value']=='fill' and not conflicts


def test_collection_genres_are_parsed_only_in_folder_context():
    c={};name_evidence(c,'Skate Punk Essentials (Ron D. Rock)','parent_folder','folder',.86)
    r,_=resolve(c,Policy());assert r['style']['value']==['punk']
    c={};name_evidence(c,'Rock Anthology','track_name','track',.86);assert 'style' not in c
    c={};name_evidence(c,'GM - Jazz','parent_folder','folder',.86)
    r,_=resolve(c,Policy());assert r['style']['value']==['jazz']


def test_unverified_vendor_mapping_is_not_silently_gm(tmp_path):
    raw=tmp_path/'SD3';raw.mkdir()
    mid=mido.MidiFile();track=mido.MidiTrack();mid.tracks.append(track)
    track.append(mido.MetaMessage('set_tempo',tempo=500000))
    track.append(mido.Message('note_on',channel=9,note=36,velocity=100))
    track.append(mido.Message('note_off',channel=9,note=36,time=480));mid.save(raw/'funk.mid')
    source=Source(id='s',path=str(raw))
    cfg=Config(sources=[source],output=str(tmp_path/'out'),web=WebConfig(mode='off',cache=str(tmp_path/'cache')))
    _,report=run(cfg,progress=lambda _:None)
    assert report['reason_counts']['unverified_vendor_mapping']==1
    source.mapping_verified=True
    _,report=run(cfg,progress=lambda _:None)
    assert report['status_counts']=={'accepted':1}


def test_internal_fill_marker_does_not_label_whole_song_as_fill(tmp_path):
    from groove.ingest.metadata import collect
    parsed=dict(tempo_map=[],meter_map=[],texts=[dict(type='marker',text='Fill',track=0,tick=1920)])
    source=Source(id='s',path=str(tmp_path))
    candidates,_=collect(parsed,Asset(tmp_path/'song.mid','song.mid'),source,{})
    result,_=resolve(candidates,Policy())
    assert result['role']['value']=='mixed'
    assert candidates['_section_role_candidates'][0]['value']=='fill'


def test_vendor_pitch_aliases_share_split_group_even_for_short_fills(tmp_path):
    sources=[]
    for sid,pitch,drum_map,mapping in [('gm',36,'gm',{}),('custom',22,'custom',{22:'kick'})]:
        raw=tmp_path/sid;raw.mkdir()
        mid=mido.MidiFile();track=mido.MidiTrack();mid.tracks.append(track)
        track.append(mido.MetaMessage('set_tempo',tempo=500000));track.append(mido.MetaMessage('time_signature',numerator=4,denominator=4))
        track.append(mido.Message('note_on',channel=9,note=pitch,velocity=100));track.append(mido.Message('note_off',channel=9,note=pitch,time=480))
        mid.save(raw/'funk_fill.mid')
        sources.append(Source(id=sid,path=str(raw),drum_map=drum_map,pitch_map=mapping))
    cfg=Config(sources=sources,output=str(tmp_path/'out'),web=WebConfig(mode='off',cache=str(tmp_path/'cache')))
    root,report=run(cfg,progress=lambda _:None)
    rows=[json.loads(line) for line in (root/'manifest.jsonl').read_text().splitlines()]
    assert report['status_counts']=={'accepted':2}
    assert rows[0]['sha256']!=rows[1]['sha256']
    assert rows[0]['percussion_hash']==rows[1]['percussion_hash']
    assert rows[0]['split_group']==rows[1]['split_group'] and rows[0]['split']==rows[1]['split']


def test_source_scoped_pair_pool_keeps_cross_source_aliases(tmp_path):
    r,m,_=export(tmp_path,[dict(role='groove',source='a',hash='same'),dict(role='groove',source='b',hash='same'),
                         dict(role='fill',source='b',duration=2,notes=[note(.5,38)])])
    assert r['statistics']['compatible_pairs']==1
    assert next(x for x in m if x['synthetic'])['parent_ids']==['1','2']
