from pathlib import Path
import pytest
from groove.ingest.discover import Asset
from groove.ingest.metadata import collect,resolve,name_evidence
from groove.ingest.parse import parse
from groove.ingest.schema import Source,Policy
from test_ingest import midi_bytes


def read_name(relative,tempo=False):
    source=Source(id='library',path='/tmp/library');asset=Asset(Path(source.path)/relative,relative)
    candidates,_=collect(parse(midi_bytes(tempo=tempo),Policy()),asset,source,{})
    result,conflicts=resolve(candidates,Policy())
    return result,conflicts,candidates


@pytest.mark.parametrize('filename,role',[
 ('122bpmDoneFill 011.mid','fill'),('141bpmDeadBeat10.mid','groove'),
 ('120bpmLazyGroove7.mid','groove'),('178bpmDbBackBeat11.mid','groove'),
 ('182bpmDoubleSkankBeat3-midi-remap-com.mid','groove')])
def test_ron_compact_role_names(filename,role):
    result,conflicts,_=read_name('Rock Anthology (Ron D. Rock)/'+filename)
    assert result['role']['value']==role
    assert 'tempo' in result and not conflicts


def test_generic_song_titles_do_not_become_roles():
    result,_,_=read_name('Songs/122bpmDoneFill 011.mid')
    assert 'role' not in result
    c={};name_evidence(c,'We Will Rock You','filename','file',.84)
    assert 'style' not in c


def test_deep_genre_and_encoded_names():
    result,conflicts,_=read_name('Superior Drummer 2 Drum Midi [425,000 files]/000043@EZX_DRUMKIT_FROM_HELL/26@METAL_(1#4)/a/b/c/d/011@FILLS/Fill01.mid')
    assert result['style']['value']==['metal']
    assert result['role']['value']=='fill' and not conflicts
    result,_,_=read_name('Vintage Drummer MIDI Files/08 Indie/03 Moon 137BPM/09 Fill 2.mid')
    assert result['style']['value']==['indie'] and result['tempo']['value']==137


def test_gm_bpm_and_fill_tokens_are_profile_scoped():
    result,conflicts,_=read_name('GM MIDI Pack [360,000 files]/GM - Jazz/GM - Jazz GM/Type 0/Basic Swing/140 Basic Swing 02 Hats Fill.mid')
    assert result['tempo']['value']==140
    assert result['role']['value']=='fill' and result['style']['value']==['jazz']
    assert not conflicts
    result,_,_=read_name('Songs/140 Basic Swing 02 Hats Fill.mid')
    assert 'tempo' not in result and 'role' not in result


@pytest.mark.parametrize('relative',[
 'Melodeath Essentials (Ron D. Rock)/Fill7.mid',
 'Superior Drummer 2 Drum Midi [425,000 files]/00071@FullKit/Theme-80/Variation-6/Beat-179-0.mid',
 'GM MIDI Pack [360,000 files]/GM - Jazz/130-150 BPM/Fill1.mid'])
def test_missing_tempo_not_filled_from_indexes_or_ranges(relative):
    result,_,_=read_name(relative)
    assert 'tempo' not in result


def test_real_tempo_conflicts_still_require_review():
    result,conflicts,_=read_name('GM MIDI Pack [360,000 files]/GM - Jazz/140 Basic Swing 02 Hats Fill.mid',tempo=True)
    assert result['tempo']['value']==120
    assert any(x['field']=='tempo' for x in conflicts)


def test_product_codes_do_not_become_genres():
    result,_,_=read_name('GM MIDI Pack [360,000 files]/GM - RE2/GM - RE2 GM/Fills/120 Roll Fill 05.mid')
    assert 'style' not in result


def test_nearest_folder_specificity_is_auditable():
    result,conflicts,candidates=read_name('Electronic/Techno/Grooves/Fills/Fill1.mid')
    assert result['style']['value']==['techno'] and result['role']['value']=='fill'
    assert not conflicts
    assert any(e['value']==['electronic'] and e['scope']=='ancestor_context' for e in candidates['style'])


def test_encoded_groove_folder_is_not_generic_filename():
    result,_,_=read_name('097@GROOVE_097/Variation1.mid')
    assert result['role']['value']=='groove'
    result,_,_=read_name('Fills/Groove 01.mid')
    assert result['role']['value']=='fill'
