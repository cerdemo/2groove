"""Human tap/groove alignment; scores are not calibrated perceptual probabilities."""
from dataclasses import dataclass
import torch
from torch import nn
from torch.nn import functional as F


class TapEncoder(nn.Module):
    """Continuous beat/velocity events with optional hand IDs (0 unknown, 1/2 pads)."""
    def __init__(self, hidden=64, embedding=128, layers=2, heads=4):
        super().__init__()
        self.hand = nn.Embedding(3, 8)
        self.input = nn.Linear(14, hidden)
        layer = nn.TransformerEncoderLayer(hidden, heads, hidden * 4, .1,
                                           batch_first=True, norm_first=True)
        self.temporal = nn.TransformerEncoder(layer, layers, enable_nested_tensor=False)
        self.projection = nn.Sequential(nn.LayerNorm(hidden), nn.Linear(hidden, embedding))

    def forward(self, events, padding):
        if events.ndim != 3 or events.shape[-1] != 3 or padding.shape != events.shape[:2]:
            raise ValueError('Expected events [B,N,3] and padding [B,N]')
        if padding.all(1).any():
            raise ValueError('Empty taps have no defined compatibility embedding')
        beat, velocity, hand = events.unbind(-1)
        if not torch.isfinite(events).all() or (beat < 0).any() or (beat >= 8).any():
            raise ValueError('Tap events require finite beats in [0,8)')
        if (velocity < 0).any() or (velocity > 1).any() or not torch.equal(hand, hand.round()) or (hand < 0).any() or (hand > 2).any():
            raise ValueError('Invalid tap velocity/hand')
        phase = beat * (2 * torch.pi / 4)
        cycle = beat * (2 * torch.pi / 8)
        features = torch.stack((beat / 8, velocity, phase.sin(), phase.cos(), cycle.sin(), cycle.cos()), -1)
        x = self.input(torch.cat((features, self.hand(hand.long())), -1))
        x = self.temporal(x, src_key_padding_mask=padding)
        pooled = x.masked_fill(padding[..., None], 0).sum(1) / (~padding).sum(1, keepdim=True)
        return F.normalize(self.projection(pooled), dim=-1)


@dataclass
class AlignmentConfig:
    groove_embedding: int
    hidden: int = 64
    embedding: int = 128
    layers: int = 2
    heads: int = 4
    tap_view: str = 'hand_agnostic'

    def validate(self):
        if min(self.groove_embedding, self.hidden, self.embedding, self.layers, self.heads) < 1:
            raise ValueError('Alignment dimensions must be positive')
        if self.hidden % self.heads or self.tap_view not in ('hand_agnostic', 'pad_aware'):
            raise ValueError('Invalid alignment heads/tap view')


class CompatibilityModel(nn.Module):
    def __init__(self, config):
        super().__init__()
        config.validate()
        self.config = config
        self.tap_encoder = TapEncoder(config.hidden, config.embedding, config.layers, config.heads)
        self.groove_projection = nn.Sequential(nn.LayerNorm(config.groove_embedding),
                                              nn.Linear(config.groove_embedding, config.embedding))

    def encode_taps(self, events, padding):
        if self.config.tap_view == 'hand_agnostic':
            events = events.clone()
            events[..., 2] = 0
        return self.tap_encoder(events, padding)

    def project_grooves(self, features):
        return F.normalize(self.groove_projection(features), dim=-1)


def load_alignment(path, device='cpu'):
    from .encoder import EncoderConfig, GrooveEncoder
    state = torch.load(path, map_location='cpu', weights_only=True)
    if state.get('format') != 'tap-groove-alignment-v1':
        raise ValueError('Expected tap-groove-alignment-v1 checkpoint')
    model = CompatibilityModel(AlignmentConfig(**state['architecture'])).to(device)
    model.load_state_dict(state['model'])
    encoder = GrooveEncoder(EncoderConfig(**state['groove_architecture'])).to(device)
    encoder.load_state_dict(state['groove_encoder'])
    encoder.requires_grad_(False)
    return model.eval(), encoder.eval(), state


def multi_positive_loss(taps, grooves, tap_groups, groove_groups, temperature=.1, allowed=None):
    """Symmetric multi-positive log-mass loss, with equal aggregate weight per group.

    Unlabelled off-group pairs are candidate negatives, NOT proven perceptual negatives.
    `allowed` can mask known ambiguous pairs; all labelled positives must remain allowed.
    The training sampler should provide unique groove groups and varied participants.
    """
    if not 0 < temperature <= 1:
        raise ValueError('temperature must be in (0,1]')
    if len(torch.unique(tap_groups)) < 2 or len(torch.unique(groove_groups)) < 2:
        raise ValueError('Contrastive batches need at least two source groups')
    positive = tap_groups[:, None] == groove_groups[None, :]
    if not positive.any(1).all() or not positive.any(0).all():
        raise ValueError('Every tap and groove needs a known positive')
    if allowed is None:
        allowed = torch.ones_like(positive)
    if allowed.shape != positive.shape or (positive & ~allowed).any():
        raise ValueError('Invalid contrastive candidate mask')
    score = F.normalize(taps, dim=-1) @ F.normalize(grooves, dim=-1).T / temperature
    def direction(logits, positives, candidates, groups):
        loss = torch.logsumexp(logits.masked_fill(~candidates, -torch.inf), 1) - torch.logsumexp(logits.masked_fill(~positives, -torch.inf), 1)
        return torch.stack([loss[groups == g].mean() for g in torch.unique(groups)]).mean()
    return (direction(score, positive, allowed, tap_groups) +
            direction(score.T, positive.T, allowed.T, groove_groups)) / 2
