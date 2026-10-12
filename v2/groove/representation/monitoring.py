"""Training telemetry only: never samples data or consumes the model RNG."""
from contextlib import ExitStack, closing
import json
import math
from pathlib import Path
import sys
from tqdm import tqdm


class ConsoleReporter:
    """Control terminal verbosity independently of JSONL, checkpoints and TensorBoard."""
    def __init__(self, mode):
        self.mode = mode

    def status(self, message):
        if self.mode != 'quiet':
            tqdm.write(message, file=sys.stdout)
            sys.stdout.flush()

    def run(self, description, output):
        if self.mode == 'json':
            self.status(json.dumps(description))
        elif self.mode == 'compact':
            if 'counts' in description:
                counts = description['counts']
                sizes = ' | '.join(f'{split}={row["groups"]} groups/{row["pairs"]} taps'
                                   for split, row in counts.items())
            else:
                sizes = f'train={description["train_rows"]} | validation={description["validation_rows"]}'
            self.status(f'Run: {output} | {sizes}')

    def epoch(self, log, total):
        if self.mode == 'json':
            self.status(json.dumps(log))
        elif self.mode == 'compact':
            validation = log['validation']
            message = (f'Epoch {log["epoch"]}/{total} | train={log["train"]["loss"]:.4f}'
                       f' | val={validation["loss"]:.4f}')
            if 'mrr' in validation:
                message += f' | MRR={validation["mrr"]:.3f} | R@1={validation["recall_at_1"]:.3f}'
            elif 'hit_f1' in validation:
                message += f' | F1={validation["hit_f1"]:.3f}'
            self.status(message + f' | {log["seconds"]:.2f}s')


def add_console_argument(parser):
    parser.add_argument('--console', choices=('compact', 'json', 'quiet'), default='compact',
                        help='Terminal output: one line per epoch (default), full JSON, or no normal stdout; '
                             'progress bars and saved metrics are independent')


def summary_writer():
    try:
        from torch.utils.tensorboard import SummaryWriter
    except ImportError as error:
        raise ValueError('TensorBoard is missing; install requirements.lock or use --no-tensorboard') from error
    return SummaryWriter


def epoch_scalars(log):
    """Use the same aggregation as metrics.jsonl, not an average of batch averages."""
    values = {}
    for split in (name for name in log if name == 'train' or name.startswith('validation')):
        for metric, value in log.get(split, {}).items():
            values[f'{metric}/{split}'] = value
    if 'seconds' in log:
        values['time/epoch_compute_seconds'] = log['seconds']
    if 'validation_shuffled_input' in log:
        values['context/shuffled_minus_real_loss'] = (
            log['validation_shuffled_input']['loss'] - log['validation']['loss'])
    if 'validation_shuffled_pairs' in log:
        values['context/real_minus_shuffled_mrr'] = (
            log['validation']['mrr'] - log['validation_shuffled_pairs']['mrr'])
    return values


class TrainingMonitor:
    """Separate epoch/batch step spaces so resume can purge each correctly."""
    def __init__(self, directory, *, enabled=True, start_epoch=0, train_batches=0, metadata=None, kind='groove'):
        self.directory = Path(directory)
        self.enabled = enabled
        self.start_epoch = start_epoch
        self.train_batches = train_batches
        self.metadata = metadata
        self.kind = kind
        self.epochs = self.batches = None
        self.stack = ExitStack()

    def __enter__(self):
        if not self.enabled:
            return self
        writer = summary_writer()
        try:
            self.epochs = self.stack.enter_context(closing(writer(
                str(self.directory/'epochs'), flush_secs=10,
                purge_step=self.start_epoch + 1 if self.start_epoch else None)))
            layout = {'Groove encoder': {
                'Loss comparison': ['Multiline', ['loss/train', 'loss/validation',
                    'loss/validation_constant_baseline', 'loss/validation_shuffled_input']],
                'Masked hit F1': ['Multiline', ['hit_f1/train', 'hit_f1/validation',
                    'hit_f1/validation_shuffled_input']],
            }}
            if self.kind == 'alignment':
                layout = {'Tap-groove alignment': {
                    'Contrastive loss': ['Multiline', ['loss/train', 'loss/validation']],
                    'Retrieval MRR': ['Multiline', ['mrr/validation', 'mrr/validation_shuffled_pairs',
                        'mrr/validation_onset_baseline', 'mrr/validation_chance']],
                    'Recall at 1': ['Multiline', ['recall_at_1/validation',
                        'recall_at_1/validation_onset_baseline', 'recall_at_1/validation_chance']],
                }}
            self.epochs.add_custom_scalars(layout)
            if self.metadata is not None:
                self.epochs.add_text('run/configuration',
                                     '```json\n' + json.dumps(self.metadata, indent=2) + '\n```',
                                     self.start_epoch)
            if self.train_batches:
                self.batches = self.stack.enter_context(closing(writer(
                    str(self.directory/'batches'), flush_secs=10,
                    purge_step=self.start_epoch * self.train_batches + 1 if self.start_epoch else None)))
        except BaseException:
            self.stack.close()
            raise
        return self

    def batch(self, step, metrics, learning_rate, gradient_norm):
        if self.batches is None:
            return
        for name, value in metrics.items():
            self.batches.add_scalar(f'train_batch/{name}', value, step)
        self.batches.add_scalar('optimizer/learning_rate', learning_rate, step)
        self.batches.add_scalar('optimizer/gradient_norm_before_clip', float(gradient_norm), step)

    def epoch(self, log):
        if self.epochs is None:
            return
        for tag, value in epoch_scalars(log).items():
            self.epochs.add_scalar(tag, value, log['epoch'])
        self.epochs.flush()
        if self.batches is not None:
            self.batches.flush()

    def __exit__(self, *exc):
        return self.stack.__exit__(*exc)


def replay_history(run_directory, output=None):
    """Convert existing JSONL to a fresh TensorBoard directory without training."""
    run_directory = Path(run_directory)
    output = Path(output) if output is not None else run_directory/'tensorboard-history'
    metadata = json.loads((run_directory/'run.json').read_text())
    kind = 'alignment' if metadata.get('format') == 'tap-groove-alignment-run-v1' else 'groove'
    if metadata.get('format') not in ('groove-pretraining-run-v1', 'tap-groove-alignment-run-v1'):
        raise ValueError('Expected a groove-pretraining or tap-groove-alignment run.json')
    logs, previous = [], 0
    with (run_directory/'metrics.jsonl').open() as stream:
        for line_number, line in enumerate(stream, 1):
            if not line.strip():
                continue
            try:
                log = json.loads(line)
                epoch = log['epoch']
                if isinstance(epoch, bool) or not isinstance(epoch, int) or epoch <= previous:
                    raise ValueError('Epochs must be positive and strictly increasing')
                if not all(math.isfinite(value) for value in epoch_scalars(log).values()):
                    raise ValueError('Nonfinite metric')
                # Both splits are required for a completed epoch.
                float(log['train']['loss']); float(log['validation']['loss'])
            except (ValueError, KeyError, TypeError) as error:
                raise ValueError(f'Invalid metrics.jsonl line {line_number}: {error}') from error
            logs.append(log)
            previous = epoch
    if not logs:
        raise ValueError('No completed epoch metrics found')
    summary_writer()  # Fail before reserving the output directory if not installed.
    output.mkdir(parents=True, exist_ok=False)
    with TrainingMonitor(output, metadata=metadata, kind=kind) as monitor:
        for log in logs:
            monitor.epoch(log)
    return dict(epochs=len(logs), first_epoch=logs[0]['epoch'], last_epoch=logs[-1]['epoch'],
                tensorboard=str(output), note='Epoch history only; batch metrics were not recorded.')
