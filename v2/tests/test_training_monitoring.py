import json
import math

import pytest
import torch
from tensorboard.backend.event_processing.event_accumulator import EventAccumulator
from torch.utils.tensorboard import SummaryWriter

from groove.representation.monitoring import epoch_scalars, replay_history, TrainingMonitor
from groove.representation.train import run
from test_representation import arguments, inputs


def events(path):
    return EventAccumulator(str(path), size_guidance={'scalars': 0}).Reload()


def test_training_events_match_jsonl_and_resume_purges_stale_steps(tmp_path):
    cache, plan = inputs(tmp_path)
    out = tmp_path/'run'
    args = arguments(cache, plan, out)
    args.log_every = 1
    args.max_train_batches = args.max_validation_batches = 1
    run(args)
    # Simulate logs flushed in an uncheckpointed partial epoch.
    with SummaryWriter(str(out/'tensorboard/epochs')) as writer:
        writer.add_scalar('loss/validation', 999, 2)
    with SummaryWriter(str(out/'tensorboard/batches')) as writer:
        writer.add_scalar('train_batch/loss', 999, 2)
    args.resume = out/'last.pt'
    args.epochs = 2
    args.log_every = 17  # Monitoring settings must not invalidate resume identity.
    args.progress = 'off'
    run(args)
    logs = [json.loads(line) for line in (out/'metrics.jsonl').read_text().splitlines()]
    epoch_events = events(out/'tensorboard/epochs')
    for log in logs:
        for tag, value in epoch_scalars(log).items():
            rows = epoch_events.Scalars(tag)
            assert [row.step for row in rows] == [1, 2]
            assert rows[log['epoch'] - 1].value == pytest.approx(value, rel=1e-6)
    batch_events = events(out/'tensorboard/batches')
    for tag in batch_events.Tags()['scalars']:
        values = batch_events.Scalars(tag)
        assert [row.step for row in values] == [1, 2]
        assert all(math.isfinite(row.value) and row.value != 999 for row in values)
    assert batch_events.Scalars('optimizer/learning_rate')[-1].value == pytest.approx(args.lr)


def test_monitoring_does_not_change_learning_and_progress_is_stderr(tmp_path, capsys):
    cache, plan = inputs(tmp_path)
    silent = arguments(cache, plan, tmp_path/'silent')
    silent.tensorboard = False
    silent.progress = 'off'
    run(silent)
    capsys.readouterr()
    visible = arguments(cache, plan, tmp_path/'visible')
    visible.progress = 'on'
    visible.log_every = 1
    run(visible)
    captured = capsys.readouterr()
    assert 'Epochs' in captured.err and 'train' in captured.err and 'validation' in captured.err
    assert '\r' not in captured.out and '\x1b' not in captured.out
    assert not (silent.out/'tensorboard').exists()
    a = torch.load(silent.out/'last.pt', weights_only=True)
    b = torch.load(visible.out/'last.pt', weights_only=True)
    assert a['identity'] == b['identity']
    for name in a['model']:
        torch.testing.assert_close(a['model'][name], b['model'][name], rtol=0, atol=0)
    assert a['metrics']['validation'] == b['metrics']['validation']
    assert torch.equal(a['torch_rng'], b['torch_rng'])


def test_history_export_preserves_sources_and_rejects_overwrite(tmp_path):
    cache, plan = inputs(tmp_path)
    args = arguments(cache, plan, tmp_path/'run', 2)
    args.tensorboard = False
    run(args)
    originals = {path: path.read_bytes() for path in args.out.iterdir() if path.is_file()}
    report = replay_history(args.out)
    assert report['epochs'] == 2
    exported = events(args.out/'tensorboard-history/epochs')
    logs = [json.loads(line) for line in (args.out/'metrics.jsonl').read_text().splitlines()]
    assert [row.value for row in exported.Scalars('loss/validation')] == pytest.approx(
        [log['validation']['loss'] for log in logs])
    assert not (args.out/'tensorboard-history/batches').exists()
    assert all(path.read_bytes() == original for path, original in originals.items())
    with pytest.raises(FileExistsError):
        replay_history(args.out)
    with (args.out/'metrics.jsonl').open('a') as stream:
        stream.write('{broken json')
    with pytest.raises(ValueError, match='line 3'):
        replay_history(args.out, tmp_path/'bad-export')
    assert not (tmp_path/'bad-export').exists()


def test_writer_closes_on_training_failure(tmp_path):
    with pytest.raises(RuntimeError, match='simulated interruption'):
        with TrainingMonitor(tmp_path/'events', train_batches=2) as monitor:
            monitor.batches.add_scalar('train_batch/loss', .25, 1)
            raise RuntimeError('simulated interruption')
    assert monitor.epochs.file_writer is None and monitor.batches.file_writer is None
    assert events(tmp_path/'events/batches').Scalars('train_batch/loss')[0].value == .25
