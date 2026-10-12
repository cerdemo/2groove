"""Deterministic bounded synthetic selection, sampling weights and fixed evaluation indexes.

No drum tensors are copied, modified, resplit, or used to fit a model.
"""
from collections import Counter,defaultdict
from contextlib import closing
import hashlib
import json
from pathlib import Path
import sqlite3
import numpy as np
from .audit import SPLITS,sha256


def prepare(audit_dir,output,seed=42,synthetic_ratio=1.,per_groove=4,per_fill=32,unknown_mass=.1,progress=print):
    if not np.isfinite(synthetic_ratio) or synthetic_ratio<0:raise ValueError('synthetic_ratio must be finite and nonnegative')
    if per_groove<1 or per_fill<1:raise ValueError('parent caps must be positive')
    if not 0<=unknown_mass<1:raise ValueError('unknown_mass must be in [0,1)')
    audit_dir=Path(audit_dir).resolve();output=Path(output).resolve()
    report_path=audit_dir/'audit.json';report=json.loads(report_path.read_text())
    if report.get('version')!='pretraining-audit-v1' or report['status']!='passed':raise ValueError('A passed pretraining audit is required')
    if sha256(audit_dir/'audit.sqlite')!=report['index_sha256']:raise ValueError('Audit index changed; rerun audit')
    progress('Verifying audited input fingerprints')
    for key,value in report['inputs'].items():
        if sha256(value['path'])!=value['sha256']:raise ValueError(f'Audited input changed: {key}; rerun audit')
    output.mkdir(parents=True,exist_ok=False)
    rank=lambda text:hashlib.sha256(f'{seed}:{text}'.encode()).hexdigest()
    with closing(sqlite3.connect(output/'selection.sqlite',uri=True)) as db:
        db.execute('PRAGMA temp_store=FILE')
        db.execute('ATTACH DATABASE ? AS audited',((audit_dir/'audit.sqlite').as_uri()+'?mode=ro',))
        db.create_function('stable_rank',1,rank,deterministic=True)
        db.executescript('''CREATE TABLE selected AS SELECT * FROM audited.windows WHERE split='train' AND synthetic=0;
          CREATE UNIQUE INDEX selected_index ON selected(idx);''')
        original=db.execute('SELECT count(*) FROM selected').fetchone()[0]
        if not original:raise ValueError('No original training examples; cannot build original-anchored plan')
        target=int(original*synthetic_ratio);selected=0;visited=0;grooves=Counter();fills=Counter()
        if target:
            # Round-robin source/style strata; deterministic shuffled order within each.
            query='''SELECT * FROM (
              SELECT idx,meta,source,styles,stable_rank(hash) AS tie,
                row_number() OVER (PARTITION BY source,styles ORDER BY stable_rank(hash),idx) AS turn
              FROM audited.windows WHERE split='train' AND synthetic=1
            ) ORDER BY turn,stable_rank(source || styles),tie,idx'''
            progress(f'Selecting at most {target:,} synthetic rows; source/style strata and parent caps apply')
            for idx,encoded,*_ in db.execute(query):
                visited+=1;r=json.loads(encoded);groove,fill=r['parent_ids']
                if grooves[groove]>=per_groove or fills[fill]>=per_fill:continue
                db.execute('INSERT INTO selected SELECT * FROM audited.windows WHERE split=\'train\' AND idx=?',(idx,))
                grooves[groove]+=1;fills[fill]+=1;selected+=1
                if selected%10000==0:progress(f'{selected:,} synthetic rows selected')
                if selected>=target:break
        db.commit()
        count=original+selected
        # Hierarchical probability: fill class -> origin -> source -> full style set
        # -> primary parent file -> windows. This is an expectation, not exact batches.
        group_counts={tuple(row[:5]):row[5] for row in db.execute('SELECT label,synthetic,source,styles,parent,count(*) FROM selected GROUP BY label,synthetic,source,styles,parent')}
        children=defaultdict(set)
        for key in group_counts:
            for depth in range(1,5):children[key[:depth]].add(key[depth])
        present={key[0] for key in group_counts};masses={-1:unknown_mass,0:(1-unknown_mass)/2,1:(1-unknown_mass)/2}
        normalizer=sum(masses[label] for label in present)
        if normalizer<=0:raise ValueError('Selected rows have zero requested sampling mass')
        labels=set()
        # Fit ontology to TRAIN ONLY. Held-out labels never extend the vocabulary.
        for (text,) in db.execute('SELECT DISTINCT styles FROM audited.windows WHERE split=\'train\''):
            labels.update(json.loads(text))
        vocabulary={'<unknown>':0,**{label:i+1 for i,label in enumerate(sorted(labels-{'<unknown>'}))}}
        (output/'style-vocabulary.json').write_text(json.dumps(vocabulary,indent=2)+'\n')
        indexes=np.empty(count,np.int64);weights=np.empty(count,np.float64)
        has_fill=np.empty(count,np.int8);synthetic=np.empty(count,np.bool_)
        offsets=[0];style_ids=[];expected=Counter();review=defaultdict(list)
        with (output/'train-manifest.jsonl').open('w') as out:
            for i,(idx,encoded) in enumerate(db.execute('SELECT idx,meta FROM selected ORDER BY idx')):
                r=json.loads(encoded);key=(r['has_fill'],int(r['synthetic']),r['source_id'],json.dumps(sorted(set(r['style_labels']))),r['parent_ids'][0])
                weight=masses[key[0]]/normalizer
                for depth in range(1,5):weight/=len(children[key[:depth]])
                weight/=group_counts[key]
                indexes[i]=idx;weights[i]=weight;has_fill[i]=r['has_fill'];synthetic[i]=r['synthetic']
                style_ids.extend(vocabulary[s] for s in sorted(set(r['style_labels'])))
                if offsets[-1]==len(style_ids):style_ids.append(0)
                offsets.append(len(style_ids))
                expected[f'fill={key[0]},synthetic={key[1]}']+=weight
                out.write(json.dumps(dict(r,sampling_weight=weight,plan_index=i))+'\n')
                bucket=(key[0],key[1],key[2],key[3])
                review[bucket].append(dict(split='train',index=idx,has_fill=key[0],synthetic=bool(key[1]),source=key[2],style_labels=r['style_labels'],parent_ids=r['parent_ids']))
                review[bucket].sort(key=lambda item:rank(str(item['index'])))
                del review[bucket][3:]
        if not np.isclose(weights.sum(),1):raise ValueError('Internal sampling weights do not sum to one')
        np.savez_compressed(output/'train-plan.npz',index=indexes,weight=weights,has_fill=has_fill,synthetic=synthetic,
                            style_indptr=np.array(offsets,np.int64),style_ids=np.array(style_ids,np.int64))
        evaluation={};eval_counts={};unseen={}
        for split in ('validation','test'):
            for name,clause in [('all','1'),('original','synthetic=0'),('synthetic','synthetic=1'),
                                ('no_fill','label=0'),('with_fill','label=1'),('unknown_fill','label=-1')]:
                key=split+'_'+name
                evaluation[key]=np.fromiter((r[0] for r in db.execute(f'SELECT idx FROM audited.windows WHERE split=? AND {clause} ORDER BY idx',(split,))),dtype=np.int64)
                eval_counts[key]=len(evaluation[key])
            labels=set()
            for (encoded,) in db.execute('SELECT DISTINCT styles FROM audited.windows WHERE split=?',(split,)):labels.update(json.loads(encoded))
            unseen[split]=sorted(labels-set(vocabulary))
            for idx,encoded in db.execute('''SELECT idx,meta FROM (
                SELECT idx,meta,row_number() OVER (PARTITION BY label,synthetic,source,styles ORDER BY stable_rank(hash)) AS position
                FROM audited.windows WHERE split=?) WHERE position<=3 ORDER BY idx''',(split,)):
                r=json.loads(encoded);review[(split,) ].append(dict(split=split,index=idx,has_fill=r['has_fill'],synthetic=r['synthetic'],source=r['source_id'],style_labels=r['style_labels'],parent_ids=r['parent_ids']))
        np.savez_compressed(output/'evaluation-indexes.npz',**evaluation)
        with (output/'review-examples.jsonl').open('w') as f:
            for bucket in sorted(review,key=str):
                for row in review[bucket]:f.write(json.dumps(row)+'\n')
    artifacts={p.name:sha256(p) for p in sorted(output.iterdir()) if p.is_file()}
    warnings=[]
    effective_size=1/float(np.square(weights).sum())
    if effective_size<count*.25:
        warnings.append('Sampling is concentrated: effective sample size is below 25% of retained rows. Inspect rare strata before training; balancing can repeatedly draw very few examples.')
    if selected<target:warnings.append('Synthetic target not met because candidates/parent caps limit coverage.')
    for label in (-1,0,1):
        if label not in present:warnings.append(f'No training examples with has_fill={label}; requested masses were renormalized.')
    for split in ('validation','test'):
        if not eval_counts[split+'_original']:warnings.append(f'No original {split} examples; original-only evaluation unavailable.')
    result=dict(version='pretraining-plan-v1',status='complete',dataset=report['dataset'],audit=str(report_path),audit_sha256=sha256(report_path),
                inputs=report['inputs'],seed=seed,options=dict(synthetic_ratio=synthetic_ratio,per_groove=per_groove,per_fill=per_fill,unknown_mass=unknown_mass),
                train=dict(original=original,synthetic=selected,synthetic_target=target,candidates_visited=visited,total=count,
                           max_synthetic_per_groove=max(grooves.values(),default=0),max_synthetic_per_fill=max(fills.values(),default=0),
                           expected_sampling_mass=dict(expected),effective_sample_size=effective_size,
                           max_row_probability=float(weights.max())),
                evaluation=eval_counts,held_out_unseen_styles=unseen,artifacts=artifacts,
                warnings=warnings,
                trainer_contract=dict(train_index='Row in the original train.npz; draw plan positions with replacement using weight, then map through index.',
                    fill_loss='Mask has_fill=-1 and fill mask values -1; never treat unknown as no-fill.',
                    style='CSR multi-label style_ids/style_indptr; train-only vocabulary; map unseen held-out labels to 0.',
                    evaluation='Fixed original and synthetic subsets; report separately. Never tune on test.',
                    existing_train_py_compatible=False),
                limitations=['This is a sampling/conditioning plan, not a trained or updated model.',
                             'Source/style balance does not validate annotation truth or musical quality.',
                             'Per-parent caps apply to retained synthetic rows; replacement sampling can revisit them.',
                             'Review sampled joins, timing, groove/fill labels and source mappings before training.'])
    (output/'plan.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    return result
