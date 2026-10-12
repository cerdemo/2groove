import json

import numpy as np
import pytest
import torch

from groove.pretraining.audit import sha256
from groove.representation import diagnose_alignment as diagnostic
from groove.representation.alignment_data import HumanPairs
from groove.representation.alignment_metrics import onset_scores
from groove.representation.train_alignment import run as train
from test_alignment_training import args_for, fixture


def test_probe_recovers_linear_information_and_handles_collapse():
    rng = np.random.default_rng(14)
    train_x, validation_x = rng.normal(size=(80, 6)), rng.normal(size=(20, 6))
    transform = rng.normal(size=(6, 32))
    train_y, validation_y = train_x @ transform + .5, validation_x @ transform + .5
    probe = diagnostic.fit_probe(train_x, train_y, np.arange(80), 1e-8)
    np.testing.assert_allclose(diagnostic.predict(probe, validation_x), validation_y, atol=1e-6)
    # Repeating every observation in just one group cannot increase its weight.
    repeat = np.r_[np.arange(80), np.zeros(30, dtype=int)]
    balanced = diagnostic.fit_probe(train_x[repeat], train_y[repeat], repeat, 1e-8)
    for key in probe:
        np.testing.assert_allclose(probe[key], balanced[key], atol=1e-12)
    collapsed = diagnostic.fit_probe(np.ones((80, 6)), train_y, np.arange(80), .1)
    predicted = diagnostic.predict(collapsed, np.ones((20, 6)))
    np.testing.assert_allclose(predicted, np.tile(train_y.mean(0), (20, 1)))
    metrics = diagnostic.probe_metrics(predicted, validation_y, np.arange(20), collapsed['mean_y'])
    assert metrics['mse_skill_vs_train_mean'] == pytest.approx(0)
    assert diagnostic.geometry(np.ones((20, 6)))['effective_rank'] == 0
    with pytest.raises(ValueError, match='probe inputs'):
        diagnostic.fit_probe(train_x, train_y, np.arange(80), float('nan'))


def test_diagnostics_use_train_only_preserve_checkpoints_and_reproduce_baselines(tmp_path, monkeypatch, capsys):
    pairs, encoder_checkpoint = fixture(tmp_path)
    training = args_for(pairs, encoder_checkpoint, tmp_path/'alignment', 1)
    training.tensorboard = False
    training.console = 'quiet'
    train(training)
    paths = [training.out/'best.pt', training.out/'last.pt']
    before = {p: sha256(p) for p in paths}
    corpus = HumanPairs(pairs)
    original_collect, original_fit = diagnostic.collect, diagnostic.fit_probe
    collected, fits = {}, []

    def checked_collect(model, encoder, data, groups, batch_size):
        split = data.groups[groups[0]]['split']
        assert split in ('train', 'validation')
        assert all(data.groups[g]['split'] == split for g in groups)
        assert not model.training and not encoder.training
        collected[split] = original_collect(model, encoder, data, groups, batch_size)
        values = collected[split]
        np.testing.assert_allclose(values['tap_onsets'] @ values['groove_onsets'].T,
                                   onset_scores(data, values['selection']['pair_indexes'], groups), atol=1e-12)
        return values

    def checked_fit(x, y, groups, alpha):
        # Every actual regression fit must use exactly the training features and targets.
        name = ('frozen_groove', 'projected_groove', 'tap')[len(fits) % 3]
        target = 'tap_onsets' if name == 'tap' else 'groove_onsets'
        assert np.array_equal(x, collected['train'][name])
        assert np.array_equal(y, collected['train'][target])
        expected_groups = (collected['train']['tap_groups'] if name == 'tap'
                           else collected['train']['selection']['groups'])
        np.testing.assert_array_equal(groups, expected_groups)
        fits.append(name)
        return original_fit(x, y, groups, alpha)

    monkeypatch.setattr(diagnostic, 'collect', checked_collect)
    monkeypatch.setattr(diagnostic, 'fit_probe', checked_fit)
    args = diagnostic.parser().parse_args(['--pairs', str(pairs), '--checkpoints', *map(str, paths),
        '--out', str(tmp_path/'report'), '--device', 'cpu', '--threads', '1', '--console', 'quiet'])
    report = diagnostic.run(args)
    assert capsys.readouterr().out == ''
    assert len(fits) == 6
    assert {p: sha256(p) for p in paths} == before
    assert json.loads((args.out/'report.json').read_text()) == report
    state = torch.load(paths[0], weights_only=True)
    for result in report['checkpoints']:
        for measured, saved in [('alignment', 'validation'), ('onset_baseline', 'validation_onset_baseline')]:
            for metric, value in result['retrieval']['validation'][measured].items():
                assert value == pytest.approx(state['metrics'][saved][metric])
        assert result['selection'] == json.loads((training.out/'selection.json').read_text())
    queries = [json.loads(line) for line in (args.out/'validation-queries.jsonl').read_text().splitlines()]
    assert len(queries) == 2 * len(corpus.selection(corpus.split_groups('validation'))['pair_indexes'])
    assert all(corpus.pairs[q['pair_index']]['split'] == 'validation' for q in queries)
    for method, metrics in report['checkpoints'][0]['retrieval']['validation'].items():
        by_group = {}
        for q in queries:
            if q['checkpoint_index'] == 0:
                by_group.setdefault(q['group'], []).append(1 / q['methods'][method]['rank'])
        assert np.mean([np.mean(v) for v in by_group.values()]) == pytest.approx(metrics['mrr'])
    with pytest.raises(FileExistsError, match='fresh'):
        diagnostic.run(args)


def test_diagnostics_honor_training_subset_and_reject_wrong_pairs(tmp_path):
    pairs, checkpoint = fixture(tmp_path)
    training = args_for(pairs, checkpoint, tmp_path/'alignment', 1)
    training.train_group_limit = 3
    training.tensorboard = False
    training.console = 'quiet'
    train(training)
    corpus = HumanPairs(pairs)
    path = training.out/'best.pt'
    report, _ = diagnostic.diagnose(corpus, path, 'cpu', .1, 2)
    assert report['selection'] == json.loads((training.out/'selection.json').read_text())
    assert len(report['selection']['train']['groups']) == 3
    corpus.fingerprint = 'different-pairs'
    with pytest.raises(ValueError, match='fingerprint differs'):
        diagnostic.diagnose(corpus, path, 'cpu', .1, 128)
