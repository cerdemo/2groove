"""Channel-count-compatible, phase-anchored descriptors under the v2 beat contract."""
import numpy as np

VERSION = 'metric-local-v1'
WIDTHS = (4, 8, 16)  # one, two, four quarter-note beats
STARTS = np.arange(0, 32, 4)
METER = np.array([4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0] * 2) / 4


def validate_events(events):
    """Rows are (quarter-note beat, velocity, channel/voice); never first-onset align."""
    x = np.asarray(events, dtype=float)
    if x.size == 0:
        return np.empty((0, 3))
    if x.ndim != 2 or x.shape[1] != 3 or not np.isfinite(x).all():
        raise ValueError('Expected finite [N,3] beat/velocity/channel events')
    if ((x[:, 0] < 0) | (x[:, 0] >= 8)).any() or ((x[:, 1] <= 0) | (x[:, 1] > 1)).any():
        raise ValueError('Events require beats in [0,8) and velocity in (0,1]')
    if (x[:, 2] < 0).any() or (x[:, 2] != np.floor(x[:, 2])).any():
        raise ValueError('Channel IDs must be nonnegative integers')
    return x[np.lexsort((x[:, 2], x[:, 0]))]


def hvo_events(hvo):
    x = np.asarray(hvo)
    if x.shape != (32, 9, 3) or not np.isfinite(x).all():
        raise ValueError('Expected finite v2 [32,9,3] HVO')
    if not np.isin(x[..., 0], [0, 1]).all() or (abs(x[..., 2]) > .5).any():
        raise ValueError('Invalid HVO hits/offsets')
    if (x[..., 1:] [x[..., 0] == 0] != 0).any():
        raise ValueError('Inactive HVO cells must be zero')
    return validate_events([(((i + x[i, j, 2]) / 4) % 8, x[i, j, 1], j)
                            for i, j in np.argwhere(x[..., 0] == 1)])


def profile(events):
    """Temporal evidence union, NOT a performed mono target.

    Each sixteenth contributes once, irrespective of family/hand multiplicity.
    Loudest event wins, matching v2 collision policy; equal-velocity ties use the
    earliest raw beat. Offsets remain fractions of a sixteenth, including step 0.
    Raw events remain authoritative; collision loss is reported separately.
    """
    x = validate_events(events)
    result = np.zeros((32, 3))
    for beat, velocity, _ in x:
        grid = round(beat * 4)
        i = grid % 32
        if velocity > result[i, 1]:
            result[i] = (1, velocity, beat * 4 - grid)
    return result


def windows(p, width, offset_channel=True):
    """Ordered, cyclic, metre-anchored blocks; no phase/warping invariance.

    Feature channels: occupancy, velocity, optionally hit-masked offset, signed
    activity/metre strength ratio, and two local-origin cumulative coordinates
    (activity and fixed metre). The last three are explicit metric reference
    analogues of METER/DOT, not the previous two-voice glyph tensors. The 2026-10-13
    scorer diagnostics showed the offset channel systematically rewards zeroed
    microtiming, so it is configurable per fitted model rather than assumed.
    """
    p = np.asarray(p, dtype=float)
    if p.shape != (32, 3) or width not in WIDTHS or not np.isfinite(p).all():
        raise ValueError('Invalid local profile/width')
    indexes = (STARTS[:, None] + np.arange(width)) % 32
    h, v, o = p[indexes].transpose(2, 0, 1)
    m = METER[indexes]
    ratio = (v - m) / np.maximum(v + m, 1e-8)
    channels = [h, v] + ([h * o] if offset_channel else []) + [ratio,
                np.cumsum(v, axis=1) / width, np.cumsum(m, axis=1) / width]
    return np.stack(channels, axis=-1).reshape(8, -1)


def profile_events(p):
    """Explicitly synthetic rendering of a profile; never human solo ground truth."""
    return validate_events([(((i + o) / 4) % 8, max(v, 1/127), 0)
                            for i, (h, v, o) in enumerate(p) if h > 0])


def syncopation(events):
    """Mean metrical-rest tension: first stronger rest before next hit, ≤1 beat.

    For each occupied grid step i, scan d=1..4 cyclically. Stop at another hit;
    otherwise the first rest j with M[j]>M[i] contributes M[j]-M[i]. Divide by
    occupied steps. Range [0,1]; empty=0. Grid proxy, not perceptual syncopation.
    """
    h = profile(events)[:, 0].astype(bool)
    total = 0.
    for i in np.flatnonzero(h):
        for d in range(1, 5):
            j = (i + d) % 32
            if h[j]:
                break
            if METER[j] > METER[i]:
                total += METER[j] - METER[i]
                break
    return float(total / max(1, h.sum()))
