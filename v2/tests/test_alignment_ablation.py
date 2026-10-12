from dataclasses import replace
import json
from pathlib import Path
import subprocess

import numpy as np
import pytest
import torch

from groove.representation import ablation, train_alignment, diagnose_alignment
from groove.representation.alignment import AlignmentConfig, CompatibilityModel, load_alignment, multi_positive_loss
from groove.representation.alignment_data import HumanPairs, pack_taps
from groove.representation.rhythm import groove_profile, tap_profile
from test_alignment_training import fixture, args_for


def test_profiles_match_baseline_padding_pickups_and_inactive_cells(tmp_path):
    pairs, _ = fixture(tmp_path)
    corpus = HumanPairs(pairs)
    selection = corpus.selection(corpus.split_groups('train'))
    events, padding = pack_taps(corpus, selection['pair_indexes'], 'pad_aware')
    expected = np.stack([diagnose_alignment.onset_profile(corpus.pairs[i]['events'])
                         for i in selection['pair_indexes']])
    np.testing.assert_allclose(tap_profile(events, padding), expected, atol=1e-7)
    events[padding] = torch.tensor([7., 1., 2.])
    np.testing.assert_allclose(tap_profile(events, padding), expected, atol=1e-7)
    hvo = torch.tensor(np.array(corpus.grooves[selection['groove_indexes']], copy=True))
    hvo[0, 0, 0] = torch.tensor([1., .9, -.5])
    hvo[0, 31, 1] = torch.tensor([1., .8, .5])
    hvo[1, 20, 0] = torch.tensor([0., 1., .5])
    target = np.stack([diagnose_alignment.groove_profile(y.numpy()) for y in hvo])
    np.testing.assert_allclose(groove_profile(hvo), target, atol=1e-7)


def test_branches_share_initial_function_rng_and_receive_gradients():
    config = AlignmentConfig(8, hidden=16, embedding=8, layers=1, heads=2)
    events = torch.tensor([[[0., 1., 1.], [1., .6, 2.]], [[.5, .8, 1.], [3., .9, 2.]]])
    padding = torch.zeros((2, 2), dtype=torch.bool)
    hvo = torch.zeros(2, 32, 9, 3)
    hvo[0, 0, 0, :2] = torch.tensor([1., .8])
    hvo[1, 2, 1, :2] = torch.tensor([1., .6])
    z = torch.randn(2, 8)
    base_state = base_rng = base_taps = base_grooves = None
    for branch in ('none', 'groove', 'tap', 'both'):
        torch.manual_seed(21)
        model = CompatibilityModel(replace(config, rhythm_branch=branch)).eval()
        rng = torch.get_rng_state()
        taps = model.encode_taps(events, padding)
        grooves = model.project_grooves(model.groove_inputs(z, hvo))
        if branch == 'none':
            base_state, base_rng = model.state_dict(), rng
            base_taps, base_grooves = taps, grooves
        else:
            for key in base_state:
                torch.testing.assert_close(model.state_dict()[key], base_state[key], rtol=0, atol=0)
            assert torch.equal(rng, base_rng)
            torch.testing.assert_close(taps, base_taps, rtol=0, atol=1e-7)
            torch.testing.assert_close(grooves, base_grooves, rtol=0, atol=1e-7)
        multi_positive_loss(taps, grooves, torch.arange(2), torch.arange(2)).backward()
        for layer in (model.tap_rhythm, model.groove_rhythm):
            if layer is not None:
                assert layer.weight.grad.abs().sum() > 0
        if model.groove_rhythm is not None:
            with pytest.raises(ValueError, match='encode_grooves'):
                model.project_grooves(z)


def suite_args(pairs, checkpoint, out):
    return ablation.parser().parse_args(['--pairs', str(pairs), '--groove-checkpoint', str(checkpoint),
        '--out', str(out), '--device', 'cpu', '--epochs', '2', '--seeds', '42', '43', '--threads', '1',
        '--hidden', '16', '--embedding', '8', '--layers', '1', '--heads', '2', '--batch-groups', '2',
        '--progress', 'off', '--console', 'quiet', '--no-tensorboard'])


def test_suite_runs_all_studies_recovers_interrupted_epoch_and_reuses_results(tmp_path, monkeypatch, capsys):
    pairs, checkpoint = fixture(tmp_path)
    args = suite_args(pairs, checkpoint, tmp_path/'suite')
    calls, saves = [], []
    original_save = train_alignment.save_checkpoint

    def interrupted_save(state, path):
        original_save(state, path)
        if path.name == 'last.pt' and not saves:
            saves.append(path)
            raise RuntimeError('Simulated crash after checkpoint, before JSONL')

    def local_process(command, check):
        assert check
        calls.append(Path(command[1]).name)
        try:
            if calls[-1] == 'train_tap_alignment.py':
                train_alignment.run(train_alignment.parser().parse_args(command[2:]))
            else:
                diagnose_alignment.run(diagnose_alignment.parser().parse_args(command[2:]))
        except RuntimeError as error:
            raise subprocess.CalledProcessError(1, command) from error

    monkeypatch.setattr(ablation.subprocess, 'run', local_process)
    monkeypatch.setattr(train_alignment, 'save_checkpoint', interrupted_save)
    with pytest.raises(subprocess.CalledProcessError):
        ablation.run(args)
    assert len(calls) == 1
    assert not (args.out/'runs/baseline-seed42/metrics.jsonl').exists()
    args.resume = True
    original_lr = args.lr
    args.lr *= 2
    with pytest.raises(ValueError, match='identical suite'):
        ablation.run(args)
    args.lr = original_lr
    summary = ablation.run(args)
    assert len(calls) == 10  # Failed first attempt + eight training completions + diagnostics.
    assert len(summary['runs']) == 8
    assert len(summary['paired_vs_baseline']) == 3
    diagnostics = json.loads((args.out/'diagnostics/report.json').read_text())
    for result, report in zip(summary['runs'], diagnostics['checkpoints']):
        directory = args.out/'runs'/result['name']
        assert result['metrics']['best_mrr'] == pytest.approx(report['retrieval']['validation']['alignment']['mrr'])
        state = torch.load(directory/'best.pt', weights_only=True)
        for name in ('tap_rhythm.weight', 'groove_rhythm.weight'):
            if name in state['model']:
                assert state['model'][name].abs().sum() > 0
        assert report['selection']['validation']['groups'] == diagnostics['checkpoints'][0]['selection']['validation']['groups']
    progress = json.loads((args.out/'progress.json').read_text())
    assert progress['status'] == 'complete'
    hashes = progress['jobs']
    assert ablation.run(args) == summary
    assert len(calls) == 10
    assert json.loads((args.out/'progress.json').read_text())['jobs'] == hashes
    assert capsys.readouterr().out == ''
    with (args.out/'runs/baseline-seed42/metrics.jsonl').open('a') as stream:
        stream.write('\n')
    with pytest.raises(ValueError, match='artifacts changed'):
        ablation.run(args)


def test_dry_run_validation_and_exclusive_lock(tmp_path, capsys):
    pairs, checkpoint = fixture(tmp_path)
    args = suite_args(pairs, checkpoint, tmp_path/'suite')
    args.dry_run = True
    args.console = 'json'
    plan = ablation.run(args)
    assert len(plan['jobs']) == 8 and not args.out.exists()
    assert json.loads(capsys.readouterr().out) == plan
    args.seeds = [42, 42]
    with pytest.raises(ValueError, match='Seeds must be unique'):
        ablation.run(args)
    args.out.mkdir()
    assert ablation.verify_run(args.out, {}, 2) is None
    (args.out/'last.pt').write_bytes(b'incomplete')
    with pytest.raises(ValueError, match='without run identity'):
        ablation.verify_run(args.out, {}, 2)
    with ablation.exclusive_suite(args.out):
        with pytest.raises(ValueError, match='Another process'):
            with ablation.exclusive_suite(args.out):
                pass


def test_legacy_checkpoint_loading_and_finalize_interrupted_completion(tmp_path):
    pairs, checkpoint = fixture(tmp_path)
    args = args_for(pairs, checkpoint, tmp_path/'run', 1)
    args.tensorboard, args.console = False, 'quiet'
    train_alignment.run(args)
    state = torch.load(args.out/'best.pt', weights_only=True)
    del state['architecture']['rhythm_branch']
    legacy = tmp_path/'legacy.pt'
    torch.save(state, legacy)
    model, _, _ = load_alignment(legacy)
    assert model.config.rhythm_branch == 'none'
    # Recover a crash after the final checkpoint without running an extra epoch.
    (args.out/'completed.json').unlink()
    (args.out/'metrics.jsonl').write_text('{"epoch":')
    args.resume = args.out/'last.pt'
    train_alignment.run(args)
    rows = [json.loads(line) for line in (args.out/'metrics.jsonl').read_text().splitlines()]
    assert [r['epoch'] for r in rows] == [1]
    assert (args.out/'completed.json').exists()
    assert len(list(args.out.glob('metrics-recovery-*.jsonl'))) == 1
