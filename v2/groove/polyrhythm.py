"""Explicit event-domain experiment based on Sioros (ISMIR 2023), section 3.

This is a post-decoder constraint, not learned polyrhythm conditioning.
The two underlying periodic pulses share phase and cycle; nearest ties go forward.
"""
import math
import numpy as np
from .events import Note


def ni_grid(formative, target, shift, cycle=4., phase=0.):
    f=np.arange(formative,dtype=float)*cycle/formative
    t=np.floor(f*target/cycle+.5)*cycle/target
    return np.mod(f+shift*(t-f)+phase*cycle,cycle).tolist()


def apply_poly(notes, taps, config):
    if config.mode=='off':return notes
    removed={config.drum}
    if config.mode=='overlay':removed.add(config.tap_drum)
    output=[n for n in notes if n.drum not in removed]
    if config.mode=='overlay':
        # Preserve observed taps, rather than pretending arbitrary taps are an iso pulse.
        output += [Note(drum=config.tap_drum,beat=t.beat,velocity=t.velocity) for t in taps]
        grid=[(i*config.cycle/config.target+config.phase*config.cycle)%config.cycle for i in range(config.target)]
    else:
        grid=ni_grid(config.formative,config.target,config.shift,config.cycle,config.phase)
    for cycle_start in range(0,8,config.cycle):
        for beat in grid:
            output.append(Note(drum=config.drum,beat=cycle_start+beat,velocity=.72))
    # S=1 with nF>nT creates coincident grid points. Emit one note at max velocity.
    merged={}
    for n in output:
        key=(n.drum,round(n.beat,9))
        if key not in merged or n.velocity>merged[key].velocity:merged[key]=n
    return list(merged.values())


def nonisochrony(notes):
    """Mean per-voice cyclic IOI coefficient of variation, clipped for fixed bins.

    Sparse articulation also changes this descriptor; it is NOT NI shift estimation.
    """
    values=[]
    for drum in range(9):
        onsets=sorted({n.beat for n in notes if n.drum==drum})
        if len(onsets)>=2:
            intervals=np.diff(onsets+[onsets[0]+8])
            values.append(float(np.std(intervals)/np.mean(intervals)))
    return min(1.,float(np.mean(values))) if values else 0.
