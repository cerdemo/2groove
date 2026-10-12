import json
from pathlib import Path
import subprocess
import sys
import wave
import numpy as np
import pytest
from groove.ingest.export import export_hvo
from groove.pretraining.audit import audit,batches
from groove.pretraining.plan import prepare
from test_fill_export import canonical,note


def corpus(tmp_path):
    specs=[]
    for i,split in enumerate(('train','validation','test')):
        styles=['funk'] if split=='train' else ['held-out-style']
        for j in range(2):
            specs.append(dict(role='groove',split=split,styles=styles,notes=[note(.1+i*.11+j*.04),note(1+j*.2,38)]))
            specs.append(dict(role='fill',split=split,styles=styles,duration=2,notes=[note(.3+i*.13+j*.07,38),note(1.5+j*.06)]))
        specs.append(dict(role='unknown',split=split,styles=styles,notes=[note(2+i*.17,38)]))
    run=canonical(tmp_path,specs);dataset=tmp_path/'hvo';export_hvo(run,dataset)
    return run,dataset


def check(tmp_path):
    run,dataset=corpus(tmp_path);out=tmp_path/'audit'
    report=audit(dataset,out,progress=lambda _:None,batch_size=2)
    assert report['status']=='passed',report
    return run,dataset,out,report


def mutate(path,key,change):
    with np.load(path,allow_pickle=False) as data:values={k:data[k].copy() for k in data.files}
    change(values[key]);np.savez_compressed(path,**values)


def test_streaming_audit_and_balanced_plan(tmp_path):
    run,dataset,checked,report=check(tmp_path)
    assert not any(report['checks'].values())
    assert sum(report['counts'].values())>0 and report['distributions']
    assert len(list(batches(dataset/'train.npz',size=2)))>1
    result=prepare(checked,tmp_path/'plan',per_groove=1,per_fill=1,progress=lambda _:None)
    train=result['train'];assert train['synthetic']<=train['original']
    assert train['max_synthetic_per_groove']==train['max_synthetic_per_fill']==1
    with np.load(tmp_path/'plan/train-plan.npz') as plan:
        assert plan['weight'].sum()==pytest.approx(1)
        for label,mass in [(-1,.1),(0,.45),(1,.45)]:
            assert plan['weight'][plan['has_fill']==label].sum()==pytest.approx(mass)
        assert np.isfinite(plan['weight']).all()
        assert len(set(plan['index']))==len(plan['index'])
        assert plan['style_indptr'][-1]==len(plan['style_ids'])
    vocab=json.loads((tmp_path/'plan/style-vocabulary.json').read_text())
    assert 'held-out-style' not in vocab
    assert result['held_out_unseen_styles']['test']==['held-out-style']
    with np.load(tmp_path/'plan/evaluation-indexes.npz') as ds:
        assert set(ds['test_original'])|set(ds['test_synthetic'])==set(ds['test_all'])
        assert not set(ds['test_original'])&set(ds['test_synthetic'])
    prepare(checked,tmp_path/'same-seed',per_groove=1,per_fill=1,progress=lambda _:None)
    with np.load(tmp_path/'plan/train-plan.npz') as a,np.load(tmp_path/'same-seed/train-plan.npz') as b:
        for key in a.files:np.testing.assert_array_equal(a[key],b[key])


@pytest.mark.parametrize('key,edit,reason',[
 ('drums',lambda a:a.__setitem__((0,0,0,1),np.nan),'nonfinite_hvo'),
 ('drums',lambda a:a.__setitem__((0,0,0,0),.5),'nonbinary_hits'),
 ('drums',lambda a:a.__setitem__(0,0),'empty_pattern'),
 ('fill_mask',lambda a:a.__setitem__((0,0),1),'fill_mask_mismatch'),
 ('fill_hit_mask',lambda a:a.__setitem__((0,0,0),1),'fill_hit_mask_mismatch'),
 ('fill_start_beat',lambda a:a.__setitem__(0,0),'unexpected_fill_boundary'),
 ('has_fill',lambda a:a.__setitem__(0,-2),'invalid_fill_label'),
 ('bpm',lambda a:a.__setitem__(0,0),'bpm_range'),
])
def test_corrupt_arrays_fail_audit(tmp_path,key,edit,reason):
    run,dataset=corpus(tmp_path);mutate(dataset/'train.npz',key,edit)
    report=audit(dataset,tmp_path/'audit',progress=lambda _:None)
    assert report['status']=='failed' and reason in report['errors']
    with pytest.raises(ValueError,match='passed'):prepare(tmp_path/'audit',tmp_path/'plan',progress=lambda _:None)
    assert not (tmp_path/'plan/plan.json').exists()


def test_parent_leak_detected_from_canonical(tmp_path):
    run,dataset=corpus(tmp_path)
    path=run/'manifest.jsonl';rows=[json.loads(s) for s in path.read_text().splitlines()]
    rows[0]['split']='test';path.write_text(''.join(json.dumps(r)+'\n' for r in rows))
    report=audit(dataset,tmp_path/'audit',progress=lambda _:None)
    assert report['errors']['parent_split_or_group_mismatch']>0


def test_actual_hvo_leak_detected_independently_of_manifest_hash(tmp_path):
    run,dataset=corpus(tmp_path)
    with np.load(dataset/'train.npz') as ds:y=ds['drums'][0].copy()
    mutate(dataset/'test.npz','drums',lambda a:a.__setitem__(0,y))
    report=audit(dataset,tmp_path/'audit',progress=lambda _:None)
    assert report['errors']['cross_split_hvo_hashes_after_export']==1
    assert report['errors']['manifest_hash_mismatch']>=1


def test_changed_inputs_block_existing_audit(tmp_path):
    _,dataset,checked,_=check(tmp_path)
    path=dataset/'dataset-card.json';path.write_text(path.read_text()+'\n')
    with pytest.raises(ValueError,match='input changed'):prepare(checked,tmp_path/'plan',progress=lambda _:None)


def test_unknown_label_masks_not_assumed_negative(tmp_path):
    run=canonical(tmp_path,[dict(role='unknown')]);dataset=tmp_path/'hvo';export_hvo(run,dataset)
    report=audit(dataset,tmp_path/'audit',progress=lambda _:None)
    assert report['status']=='passed'
    result=prepare(tmp_path/'audit',tmp_path/'plan',progress=lambda _:None)
    assert result['train']['expected_sampling_mass']=={'fill=-1,synthetic=0':1.}
    with np.load(tmp_path/'plan/train-plan.npz') as d:assert (d['has_fill']==-1).all()


def test_wrong_shape_and_missing_canonical_fail_cleanly(tmp_path):
    run,dataset=corpus(tmp_path)
    report=audit(dataset,tmp_path/'absent',canonical=tmp_path/'not-present',progress=lambda _:None)
    assert report['status']=='failed' and 'audit_exception' in report['errors']
    with np.load(dataset/'train.npz') as d:values={k:d[k] for k in d.files}
    values['drums']=values['drums'][:,:31];np.savez_compressed(dataset/'train.npz',**values)
    report=audit(dataset,tmp_path/'bad-shape',progress=lambda _:None)
    assert report['status']=='failed' and 'invalid shape' in report['error_examples'][0]['detail']


def test_review_cli_and_failure_exit_code(tmp_path):
    _,dataset,checked,_=check(tmp_path)
    prepare(checked,tmp_path/'plan',progress=lambda _:None)
    cwd=Path(__file__).resolve().parents[1]
    result=subprocess.run([sys.executable,'scripts/review_pretraining.py','--plan',str(tmp_path/'plan'),
        '--output',str(tmp_path/'review'),'--max-examples','5'],cwd=cwd,capture_output=True,text=True)
    assert result.returncode==0,result.stderr
    rows=json.loads((tmp_path/'review/review.json').read_text())['examples']
    assert len(rows)==5
    for row in rows:
        assert (tmp_path/'review'/row['midi']).read_bytes().startswith(b'MThd')
        with wave.open(str(tmp_path/'review'/row['audio'])) as w:assert w.getnframes()>0
    mutate(dataset/'train.npz','bpm',lambda a:a.__setitem__(0,0))
    result=subprocess.run([sys.executable,'scripts/audit_hvo.py','--dataset',str(dataset),'--output',str(tmp_path/'bad')],cwd=cwd,capture_output=True,text=True)
    assert result.returncode==2


def test_mmap_cache_preserves_values_and_empty_splits(tmp_path):
    run=canonical(tmp_path,[dict(role='unknown')]);dataset=tmp_path/'hvo';export_hvo(run,dataset)
    checked=tmp_path/'audit';assert audit(dataset,checked,progress=lambda _:None)['status']=='passed'
    cwd=Path(__file__).resolve().parents[1]
    result=subprocess.run([sys.executable,'scripts/cache_hvo.py','--audit',str(checked),'--output',str(tmp_path/'cache')],cwd=cwd,capture_output=True,text=True)
    assert result.returncode==0,result.stderr
    card=json.loads((tmp_path/'cache/cache.json').read_text());assert card['status']=='complete'
    for split in ('train','validation','test'):
        with np.load(dataset/(split+'.npz'),allow_pickle=False) as expected:
            for key in expected.files:
                actual=np.load(tmp_path/'cache'/split/(key+'.npy'),mmap_mode='r',allow_pickle=False)
                np.testing.assert_array_equal(actual,expected[key])


def test_terminal_pickup_fill_mask_survives_audit(tmp_path):
    run=canonical(tmp_path,[dict(role='groove'),dict(role='fill',duration=2,notes=[note(1.99,38)])])
    from groove.ingest.schema import HVOConfig
    dataset=tmp_path/'hvo';export_hvo(run,dataset,options=HVOConfig(fill_boundary='strict'))
    report=audit(dataset,tmp_path/'audit',progress=lambda _:None,batch_size=1)
    assert report['status']=='passed',report['errors']


def test_missing_manifest_row_is_a_hard_failure(tmp_path):
    _,dataset=corpus(tmp_path);manifest=dataset/'manifest.jsonl'
    lines=manifest.read_text().splitlines();manifest.write_text('\n'.join(lines[1:])+'\n')
    report=audit(dataset,tmp_path/'audit',progress=lambda _:None)
    assert report['status']=='failed' and report['errors']['array_without_manifest']==1


def test_zero_synthetic_ratio_keeps_originals_and_index_tampering_blocks_plan(tmp_path):
    _,_,checked,_=check(tmp_path)
    r=prepare(checked,tmp_path/'plan',synthetic_ratio=0,progress=lambda _:None)
    assert r['train']['synthetic']==0 and r['train']['original']>0
    import sqlite3
    with sqlite3.connect(checked/'audit.sqlite') as db:db.execute('UPDATE windows SET label=0')
    with pytest.raises(ValueError,match='index changed'):prepare(checked,tmp_path/'bad-plan',progress=lambda _:None)
