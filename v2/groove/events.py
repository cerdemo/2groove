"""Quarter-note beats are canonical. Grid offsets are fractions of a 16th."""
import io
from typing import Literal
import mido
import numpy as np
from pydantic import BaseModel, Field, model_validator

DRUMS = ("kick", "snare", "floor-tom", "mid-tom", "hi-tom", "open-hihat", "closed-hihat", "ride", "crash")
PITCHES = (36, 38, 41, 47, 48, 46, 42, 51, 49)
STYLES = ("unknown", "rock", "funk", "hiphop", "jazz", "electronic", "latin")


class Note(BaseModel):
    drum: int = Field(ge=0, le=8)
    beat: float = Field(ge=0, lt=8, allow_inf_nan=False)
    velocity: float = Field(gt=0, le=1, allow_inf_nan=False)
    duration: float = Field(default=0.12, gt=0, le=2, allow_inf_nan=False)


class Tap(BaseModel):
    beat: float = Field(ge=0, lt=8, allow_inf_nan=False)
    velocity: float = Field(default=0.8, gt=0, le=1, allow_inf_nan=False)
    source: str = Field(default="keyboard", max_length=80)


class Pattern(BaseModel):
    id: str = Field(default="edited", max_length=100)
    notes: list[Note] = Field(default_factory=list, max_length=512)
    beats: Literal[8] = 8
    bpm: float = Field(default=120, ge=30, le=300, allow_inf_nan=False)
    seed: int = 0
    engine: str = "manual"
    descriptors: dict[str, float] = Field(default_factory=dict)
    latent: list[float] = Field(default_factory=list, max_length=64)


class PolyConfig(BaseModel):
    mode: Literal['off', 'overlay', 'ni_grid'] = 'off'
    formative: int = Field(default=4, ge=1, le=16)
    target: int = Field(default=3, ge=1, le=16)
    cycle: Literal[4, 8] = 4
    shift: float = Field(default=.35, ge=0, le=1, allow_inf_nan=False)
    phase: float = Field(default=0, ge=0, lt=1, allow_inf_nan=False)
    drum: int = Field(default=7, ge=0, le=8)
    tap_drum: int = Field(default=0, ge=0, le=8)


class GenerateRequest(BaseModel):
    taps: list[Tap] = Field(default_factory=list, max_length=512)
    bpm: float = Field(default=120, ge=30, le=300, allow_inf_nan=False)
    style: Literal["unknown", "rock", "funk", "hiphop", "jazz", "electronic", "latin"] = "funk"
    role: Literal["accent", "pulse", "complement"] = "accent"
    engine: Literal["procedural", "cvae"] = "procedural"
    seed: int = Field(default=42, ge=0, le=2**31-1)
    budget: int = Field(default=256, ge=16, le=4096)
    algorithm: Literal["map_elites", "random"] = "map_elites"
    reference: Pattern | None = None
    locked_drums: list[int] = Field(default_factory=list, max_length=9)
    variation: float = Field(default=0.55, ge=0, le=1, allow_inf_nan=False)
    quantize: float = Field(default=0, ge=0, le=1, allow_inf_nan=False)
    poly: PolyConfig = Field(default_factory=PolyConfig)
    descriptor_axis: Literal['syncopation', 'nonisochrony'] = 'syncopation'

    @model_validator(mode="after")
    def check_locks(self):
        if any(x not in range(9) for x in self.locked_drums):
            raise ValueError("Invalid drum lock")
        if self.locked_drums and self.reference is None:
            raise ValueError("Locks require a selected reference groove")
        if self.poly.mode != 'off' and self.poly.drum in self.locked_drums:
            raise ValueError('Unlock the polyrhythm voice before applying it')
        if self.poly.mode == 'overlay' and self.poly.tap_drum == self.poly.drum:
            raise ValueError('Tap and counter-pulse must use different voices')
        if self.poly.mode == 'overlay' and self.poly.tap_drum in self.locked_drums:
            raise ValueError('Unlock the tap voice before applying overlay')
        return self


def taps_tensor(taps, quantize=0.0):
    result = np.zeros((32, 3), dtype=np.float32)
    for tap in taps:
        step = round(tap.beat * 4) % 32
        offset = (tap.beat * 4 - round(tap.beat * 4)) * (1-quantize)
        if tap.velocity >= result[step, 1]:
            result[step] = (1, tap.velocity, offset)
    return result


def notes_tensor(notes):
    result = np.zeros((32, 9, 3), dtype=np.float32)
    for n in notes:
        step = round(n.beat * 4) % 32
        if n.velocity >= result[step, n.drum, 1]:
            result[step, n.drum] = (1, n.velocity, n.beat*4-round(n.beat*4))
    return result


def from_heads(h, v, o, threshold=0.5):
    return [Note(drum=int(j), beat=float(((i+np.clip(o[i,j],-.5,.5))/4) % 8),
                 velocity=float(np.clip(v[i,j],1/127,1)))
            for i,j in np.argwhere(h >= threshold)]


def midi_bytes(pattern: Pattern, ppq=960) -> bytes:
    """Preserve absolute onsets; the silent tail belongs to end_of_track."""
    mid = mido.MidiFile(ticks_per_beat=ppq)
    track = mido.MidiTrack(); mid.tracks.append(track)
    track.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(pattern.bpm)))
    track.append(mido.MetaMessage("time_signature", numerator=4, denominator=4))
    end = round(pattern.beats*ppq)
    events = []
    for n in pattern.notes:
        on = min(end-1, round(n.beat*ppq))
        off = min(end, max(on+1, round((n.beat+n.duration)*ppq)))
        events.extend([(on,1,n), (off,0,n)])
    previous=0
    for tick,kind,n in sorted(events,key=lambda e:(e[0],e[1],e[2].drum)):
        track.append(mido.Message("note_on" if kind else "note_off", channel=9,
            note=PITCHES[n.drum], velocity=max(1,round(n.velocity*127)) if kind else 0,
            time=tick-previous))
        previous=tick
    track.append(mido.MetaMessage("end_of_track",time=end-previous))
    buffer=io.BytesIO();mid.save(file=buffer);return buffer.getvalue()
