"""Masked HVO encoder baseline. Its embedding is not a perceptual score or decoder latent."""
from dataclasses import asdict, dataclass
import torch
from torch import nn
from torch.nn import functional as F


@dataclass
class EncoderConfig:
    hidden: int = 128
    embedding: int = 128
    layers: int = 3
    heads: int = 4
    dropout: float = 0.1

    def validate(self):
        if min(self.hidden, self.embedding, self.layers, self.heads) < 1:
            raise ValueError('Encoder dimensions must be positive')
        if self.hidden % self.heads or not 0 <= self.dropout < 1:
            raise ValueError('Invalid attention heads/dropout')


class GrooveEncoder(nn.Module):
    def __init__(self, config=None):
        super().__init__()
        self.config = config or EncoderConfig()
        self.config.validate()
        c = self.config
        # Explicit missingness: a masked rest is distinguishable from an observed rest.
        self.input = nn.Linear(36, c.hidden)
        self.position = nn.Parameter(torch.randn(1, 32, c.hidden) * .02)
        layer = nn.TransformerEncoderLayer(c.hidden, c.heads, c.hidden * 4,
                                           c.dropout, batch_first=True, norm_first=True)
        self.temporal = nn.TransformerEncoder(layer, c.layers, enable_nested_tensor=False)
        self.pool = nn.Sequential(nn.LayerNorm(c.hidden), nn.Linear(c.hidden, c.embedding))
        # Reconstruction must pass through the pooled embedding; no untrained CLS head.
        self.decoder = nn.Sequential(nn.Linear(c.embedding + c.hidden, c.hidden * 2),
                                     nn.GELU(), nn.Linear(c.hidden * 2, 27))

    def forward(self, hvo, hidden=None):
        if hvo.ndim != 4 or tuple(hvo.shape[1:]) != (32, 9, 3):
            raise ValueError('Expected HVO [B,32,9,3]')
        if hidden is None:
            hidden = torch.zeros_like(hvo[..., 0], dtype=torch.bool)
        visible = hvo.masked_fill(hidden[..., None], 0)
        x = torch.cat((visible.flatten(2), hidden.to(hvo.dtype)), dim=-1)
        x = self.temporal(self.input(x) + self.position)
        z = self.pool(x.mean(1))
        context = torch.cat((z[:, None].expand(-1, 32, -1),
                             self.position.expand(len(hvo), -1, -1)), dim=-1)
        heads = self.decoder(context).reshape(-1, 32, 9, 3)
        return F.normalize(z, dim=-1), heads

    def encode(self, hvo):
        return self(hvo)[0]


def make_mask(count, generator, probability=.3):
    """Mix hidden cells, time steps and voices; sampling does not inspect target hits."""
    if not 0 < probability < 1:
        raise ValueError('mask_probability must be in (0,1)')
    cells = torch.rand(count, 32, 9, generator=generator) < probability
    steps = (torch.rand(count, 32, 1, generator=generator) < probability).expand(-1, -1, 9)
    voices = (torch.rand(count, 1, 9, generator=generator) < probability).expand(-1, 32, -1)
    mode = torch.randint(3, (count, 1, 1), generator=generator)
    mask = torch.where(mode == 0, cells, torch.where(mode == 1, steps, voices)).clone()
    for row in mask:
        if not row.any():
            row[torch.randint(32, (), generator=generator), torch.randint(9, (), generator=generator)] = True
        if row.all():
            row[0, 0] = False
    return mask


def masked_loss(heads, target, mask):
    """Balanced masked hit BCE + velocity/offset only at masked active target cells."""
    hit = target[..., 0] > .5
    positive, negative = mask & hit, mask & ~hit
    bce = F.binary_cross_entropy_with_logits(heads[..., 0], target[..., 0], reduction='none')
    v = F.smooth_l1_loss(heads[..., 1].sigmoid(), target[..., 1], reduction='none')
    o = F.smooth_l1_loss(.5 * heads[..., 2].tanh(), target[..., 2], reduction='none')
    def average(values, selected):
        return (values * selected).sum() / selected.sum().clamp_min(1)
    # Each present hit class receives equal weight. Silence cannot dominate by count.
    classes = positive.any().to(heads.dtype) + negative.any().to(heads.dtype)
    loss = (average(bce, positive) + average(bce, negative)) / classes.clamp_min(1)
    loss = loss + average(v, positive) + average(o, positive)
    prediction = heads[..., 0] >= 0
    stats = {'positive_bce': float((bce * positive).sum().detach()),
             'negative_bce': float((bce * negative).sum().detach()),
             'velocity': float((v * positive).sum().detach()),
             'offset': float((o * positive).sum().detach()),
             'positive': int(positive.sum()), 'negative': int(negative.sum()),
             'tp': int((prediction & positive).sum()),
             'fp': int((prediction & negative).sum()),
             'fn': int((~prediction & positive).sum())}
    return loss, stats


def summarize(stats):
    p, n = stats.get('positive', 0), stats.get('negative', 0)
    hit = (stats.get('positive_bce', 0) / max(p, 1) +
           stats.get('negative_bce', 0) / max(n, 1)) / max(bool(p) + bool(n), 1)
    velocity, offset = (stats.get(k, 0) / max(p, 1) for k in ('velocity', 'offset'))
    tp, fp, fn = (stats.get(k, 0) for k in ('tp', 'fp', 'fn'))
    return dict(loss=hit + velocity + offset, hit_bce=hit, velocity=velocity, offset=offset,
                hit_f1=2 * tp / max(2 * tp + fp + fn, 1), masked_hits=p, masked_rests=n)


def load_encoder(path, device='cpu'):
    state = torch.load(path, map_location='cpu', weights_only=True)
    if state.get('format') != 'groove-encoder-v1':
        raise ValueError('Expected groove-encoder-v1 checkpoint')
    model = GrooveEncoder(EncoderConfig(**state['architecture']))
    model.load_state_dict(state['model'])
    return model.to(device).eval(), state
