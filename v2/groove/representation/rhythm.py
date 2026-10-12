"""Fixed onset/accent inputs, not synthetic tap targets or perceptual labels."""
import torch
from torch.nn import functional as F


def tap_profile(events, padding):
    bins = torch.round(events[..., 0].double() * 4).long() % 32
    # Avoid CUDA scatter_add: deterministic training must also work on GPU.
    membership = bins[..., None] == torch.arange(32, device=events.device)
    velocity = events[..., 1].masked_fill(padding, 0)
    return F.normalize((membership * velocity[..., None]).sum(1), dim=-1)


def groove_profile(hvo):
    step = torch.arange(32, device=hvo.device)[None, :, None]
    bins = torch.round((step + hvo[..., 2].double()) % 32).long() % 32
    membership = bins[..., None] == torch.arange(32, device=hvo.device)
    velocity = hvo[..., 0] * hvo[..., 1]
    return F.normalize((membership * velocity[..., None]).sum((1, 2)), dim=-1)
