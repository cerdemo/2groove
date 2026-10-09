import csv
import gzip
import hashlib
import io
import json
from pathlib import Path

import mido
import pytest
from groove.ingest.adapters import GigaMIDI, labels
from groove.ingest.discover import Asset, discover
from groove.ingest.export import export_hvo
from groove.ingest.pipeline import run
from groove.ingest.schema import Config, Policy, Source
from test_ingest import midi_bytes


def write_csv(path,rows):
    fields=list(dict.fromkeys(k for row in rows for k in row))
    with path.open('w',newline='') as f:
        writer=csv.DictWriter(f,fields);writer.writeheader();writer.writerows(rows)


def giga(tmp_path,raw=None):
    raw=raw or midi_bytes();md5=hashlib.md5(raw).hexdigest()
    midi=tmp_path/(md5+'.mid');midi.write_bytes(raw)
    row=dict(md5=md5,file_path=f'collection/training-V1.1-80%/drums-only/1/{md5}.mid',Type='drums-only',
             music_styles_curated="['Funk', 'Soul']",tempo="Tempo(time=0, qpm=120, mspq=500000, ttype='Tick')")
    manifest=tmp_path/'Final-Metadata-GigaMIDI.csv';write_csv(manifest,[row])
    source=Source(id='giga',path=str(midi),adapter='gigamidi',metadata_path=str(manifest),metadata_cache=str(tmp_path/'cache'))
    return source,midi,row


def ingest(tmp_path,source):
    path,report=run(Config(sources=[source],output=str(tmp_path/'out'),web={'mode':'off'}),progress=lambda _:None)
    rows=[json.loads(line) for line in (path/'manifest.jsonl').read_text().splitlines()]
    with gzip.open(path/rows[0]['record'],'rt') as f:record=json.load(f)
    return path,report,rows[0],record


def test_giga_verified_hash_metadata_split_and_unknown_role(tmp_path):
    source,midi,_=giga(tmp_path)
    _,report,row,record=ingest(tmp_path,source)
    assert report['status_counts']=={'accepted':1}
    assert row['official_split']=='train'
    assert row['metadata']['style']['value']==['funk','soul']
    assert row['metadata']['role']['value']=='unknown'
    provenance=record['source_metadata']['metadata_provenance']
    assert provenance['join']=='verified_byte_md5'
    assert provenance['sha256']==hashlib.sha256(Path(source.metadata_path).read_bytes()).hexdigest()


def test_giga_cache_reuse_and_invalidation(tmp_path):
    source,midi,row=giga(tmp_path);a=GigaMIDI(source,lambda _:None)
    b=GigaMIDI(source,lambda _:pytest.fail('unexpected cache rebuild'))
    assert a.index==b.index
    row['music_styles_curated']='Jazz';write_csv(Path(source.metadata_path),[row])
    c=GigaMIDI(source,lambda _:None)
    assert c.index!=a.index
    assert c.get(Asset(midi,midi.name),midi.read_bytes())['style_evidence'][0]['value']==['Jazz']


@pytest.mark.parametrize('case',['missing','duplicate','split'])
def test_giga_unsafe_joins_quarantined(tmp_path,case):
    source,midi,row=giga(tmp_path)
    if case=='missing':midi.write_bytes(midi_bytes(name='Changed content'))
    if case=='duplicate':write_csv(Path(source.metadata_path),[row,dict(row,music_styles_curated='Metal')])
    if case=='split':
        folder=tmp_path/'test_10';folder.mkdir();midi.rename(folder/midi.name);source.path=str(tmp_path)
    _,_,summary,_=ingest(tmp_path,source)
    assert summary['status']=='quarantined'
    assert any('gigamidi_' in r for r in summary['reasons'])


def test_giga_drum_subset_does_not_override_melodic_program(tmp_path):
    source,_,_=giga(tmp_path,raw=midi_bytes(name='Piano',channel=0,program=0))
    _,_,row,_=ingest(tmp_path,source)
    assert row['status']!='accepted'
    assert row['counts']['percussion_notes']==0


def test_giga_scraped_fallback_and_machine_evidence_not_ground_truth(tmp_path):
    source,midi,row=giga(tmp_path)
    row['music_styles_curated']='';row['music_style_scraped']='Funk; Soul'
    row['music_style_audio_text_Lastfm']="['metal']"
    write_csv(Path(source.metadata_path),[row])
    _,_,summary,record=ingest(tmp_path,source)
    assert summary['metadata']['style']['value']==['funk','soul']
    assert not record['metadata_conflicts']
    assert len(record['metadata_candidates']['style'])==2
    row['music_style_scraped']='';write_csv(Path(source.metadata_path),[row])
    _,_,summary,_=ingest(tmp_path,source)
    assert 'missing_style' in summary['reasons']


@pytest.mark.parametrize('value',["{'rock': 1}","[1]",'['*500])
def test_giga_rejects_malformed_lists(value):
    with pytest.raises(ValueError):labels(value)


def lucerne(tmp_path,*,bass_only=False,missing_rpp=False):
    root=tmp_path/'library';(root/'MIDI').mkdir(parents=True);(root/'RPP').mkdir()
    mid=mido.MidiFile(ticks_per_beat=9600);track=mido.MidiTrack();mid.tracks.append(track)
    track.append(mido.MetaMessage('set_tempo',tempo=200000))
    pairs=[]
    def note(seconds,pitch,channel=0,velocity=100):
        tick=round(seconds*48000)
        pairs.extend([(tick,mido.Message('note_on',channel=channel,note=pitch,velocity=velocity)),
                      (tick+48,mido.Message('note_off',channel=channel,note=pitch,velocity=0))])
    if not bass_only:
        for beat in [0,2,4,5,6,7]:note(.5+beat*.5,35)
    rows=[]
    for beat in range(33):
        if not bass_only:
            name='BD' if beat%2==0 else 'SD';pitch=36 if name=='BD' else 39
            time=.5+beat*.5+(.015 if beat%2 else 0)
            note(time+4,pitch,velocity=90)
            rows.append(dict(siglum='A+1',time=time,name=name,position=beat,duration=-1,accent=2))
        note(4.5+beat*.5,40,2)
        rows.append(dict(siglum='A+1',time=.5+beat*.5,name='E2',position=beat,duration=100,accent=22))
    note(25,0)
    previous=0
    for tick,msg in sorted(pairs,key=lambda x:x[0]):msg.time=tick-previous;previous=tick;track.append(msg)
    f=io.BytesIO();mid.save(file=f);(root/'MIDI'/'A+1.mid').write_bytes(f.getvalue())
    write_csv(root/'events.csv',rows)
    write_csv(root/'stimuli.csv',[dict(Stimulus='A+1',Title='Song',Band='Artist',Style='Funk',Tempo=120,MOV=4.2,ENE=3.1)])
    if not missing_rpp:(root/'RPP'/'A+1.RPP').write_text('<REAPER_PROJECT\n  TEMPO 300 4 4\n>')
    return Source(id='lucerne',path=str(root/'MIDI'),adapter='lucerne'),root


def test_lucerne_verified_routing_carrier_timing_raw_preserved_and_hvo(tmp_path):
    source,root=lucerne(tmp_path)
    path,report,row,record=ingest(tmp_path,source)
    assert report['status_counts']=={'accepted':1}
    assert row['counts']['percussion_notes']==33
    assert row['metadata']['role']['value']=='unknown'
    assert record['midi']['tempo_map'][0]['bpm']==300
    assert record['metadata']['tempo']['value']==pytest.approx(120)
    assert record['source_metadata']['raw']['MOV']=='4.2'
    assert record['adapter_audit']['count_in_notes']==6
    assert record['adapter_audit']['excluded_bass_notes']==33
    for event in record['percussion_events']:
        assert event['pitch'] not in (0,35,40)
        assert event['voice']==('kick' if event['pitch']==36 else 'snare')
        timeline=record['event_timeline']
        assert event['onset_seconds']==pytest.approx(event['onset_beat']*timeline['seconds_per_beat']+timeline['origin_seconds'])
    assert record['percussion_events'][1]['onset_beat']==pytest.approx(1.03)
    card=export_hvo(path,tmp_path/'hvo')
    assert card['statistics']['candidate_windows']==4
    assert card['statistics']['original_kept']==1  # Four identical bars deduplicate.
    assert card['statistics']['compatible_pairs']==0


@pytest.mark.parametrize('case',['carrier','timing','unknown','extra','missing_meter'])
def test_lucerne_abstains_on_unsupported_or_unverified_data(tmp_path,case):
    source,root=lucerne(tmp_path,missing_rpp=case=='missing_meter')
    if case in ('timing','unknown'):
        with (root/'events.csv').open() as f:rows=list(csv.DictReader(f))
        if case=='timing':rows[0]['time']=30
        if case=='unknown':rows[0]['name']='Unidentified'
        write_csv(root/'events.csv',rows)
    if case in ('carrier','extra'):
        midi=mido.MidiFile(root/'MIDI'/'A+1.mid')
        if case=='carrier':midi.tracks[0][0].tempo=500000
        else:midi.tracks[0].insert(1,mido.Message('note_on',channel=4,note=38,velocity=100))
        midi.save(root/'MIDI'/'A+1.mid')
    path,_,row,record=ingest(tmp_path,source)
    if case=='missing_meter':
        assert row['status']=='accepted'
        card=export_hvo(path,tmp_path/'hvo')
        assert card['statistics']['missing_initial_tempo_or_meter']==1
    else:assert row['status']=='quarantined'


def test_lucerne_bass_only_is_legitimate_exclusion(tmp_path):
    source,root=lucerne(tmp_path,bass_only=True)
    _,_,row,record=ingest(tmp_path,source)
    assert row['status']=='discarded'
    assert row['reasons']==['no_accepted_percussion']
    assert record['adapter_audit']['reason']=='bass_only_stimulus'


def test_discovery_limit_does_not_visit_later_subtrees(tmp_path,monkeypatch):
    import importlib
    module=importlib.import_module('groove.ingest.discover')
    (tmp_path/'a.mid').write_bytes(b'fixture');(tmp_path/'z').mkdir()
    original=module.os.scandir
    def checked(path):
        if Path(path).name=='z':pytest.fail('visited subtree after caller stopped discovery')
        return original(path)
    monkeypatch.setattr(module.os,'scandir',checked)
    assert next(discover(tmp_path,Policy())).relative=='a.mid'


def test_lucerne_rejects_nonfinite_annotation(tmp_path):
    source,root=lucerne(tmp_path)
    with (root/'events.csv').open() as f:rows=list(csv.DictReader(f))
    rows[0]['time']='nan';write_csv(root/'events.csv',rows)
    _,_,row,_=ingest(tmp_path,source)
    assert row['status']=='quarantined'
    assert 'finite_numeric_metadata' in row['reasons'][0]


def test_giga_hash_filename_is_not_web_identity(tmp_path):
    from groove.ingest.metadata import search_identity
    source,midi,_=giga(tmp_path)
    assert search_identity({},Asset(midi,midi.name)) is None


def test_lucerne_song_excerpts_share_split_group(tmp_path):
    source,root=lucerne(tmp_path)
    with (root/'stimuli.csv').open() as f:rows=list(csv.DictReader(f))
    rows.append(dict(rows[0],Stimulus='A+2'))
    write_csv(root/'stimuli.csv',rows)
    from groove.ingest.adapters import Lucerne
    adapter=Lucerne(source)
    adapter.events['A+2']=adapter.events['A+1']
    a=adapter.get(Asset(root/'MIDI'/'A+1.mid','A+1.mid'),b'')
    b=adapter.get(Asset(root/'MIDI'/'A+2.mid','A+2.mid'),b'')
    assert a['group_id']==b['group_id']
