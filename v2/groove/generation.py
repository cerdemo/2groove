"""Deterministic decoders and fixed-context MAP-Elites; no work on audio threads."""
import hashlib
import threading
import uuid
import numpy as np
from .events import Note, Pattern, GenerateRequest, taps_tensor, from_heads
from .polyrhythm import apply_poly, nonisochrony

# This is a documented metrical displacement PROXY, not a perceptual emotion score.
METER = np.array([4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0]*2)


def measures(notes):
    grid=np.zeros((32,9),bool)
    for n in notes: grid[round(n.beat*4)%32,n.drum]=True
    # Group pulse, low, and backbeat separately to avoid a hat masking every rest.
    groups=[grid[:,[0,2,3,4]].any(1),grid[:,1],grid[:,[5,6,7,8]].any(1)]
    score=0.0;active=0
    for g in groups:
        for i in np.flatnonzero(g):
            active+=1
            for distance in range(1,5):
                j=(i+distance)%32
                if g[j]: break
                if METER[j]>METER[i]:
                    score+=(METER[j]-METER[i])/4;break
    return {"density":len(notes)/8, "syncopation":score/max(1,active), "nonisochrony":nonisochrony(notes)}


def quality(notes, req):
    if not notes:return 0.0
    positions=np.array([n.beat for n in notes]);vel=np.array([n.velocity for n in notes])
    fit=[]
    for t in req.taps:
        delta=np.abs(positions-t.beat);delta=np.minimum(delta,8-delta)
        fit.append(float(np.max(np.exp(-(delta/.14)**2)*vel)))
    fidelity=np.mean(fit) if fit else .5
    if req.role=="complement":fidelity=.5 # Do not reward copying every accent in complement mode.
    # Fixed baseline proxy: conditioning fit and a mild excessive-polyphony penalty.
    counts=np.bincount([round(n.beat*4)%32 for n in notes],minlength=32)
    feasibility=1-float(np.maximum(counts-4,0).sum())/max(1,len(notes))
    return float(np.clip(.7*fidelity+.3*feasibility,0,1))


class Generator:
    def __init__(self, checkpoint=None):
        self.model=None
        self.lock=threading.Lock()
        rng=np.random.default_rng(1907)
        self.projection=rng.normal(0,.22,(32,32,9))
        if checkpoint and checkpoint.exists():
            from .model import load_checkpoint
            self.model,self.model_info=load_checkpoint(checkpoint)

    def decode(self,z,req):
        if req.engine=="cvae":
            if self.model is None:raise ValueError("No trained CVAE checkpoint is loaded")
            with self.lock:
                notes=self.model.generate(req,z)
        else:
            logits=np.full((32,9),-3.0)
            for i in range(32):
                if i%16 in (0,8):logits[i,0]=2.8
                if i%16 in (4,12):logits[i,1]=3.0
                if i%2==0:logits[i,6]=1.2
            if req.style=="electronic": logits[::4,0]=3;logits[2::4,5]=1;logits[2::4,6]=-2
            if req.style=="funk":logits[[3,7,10,14,19,23,26,30],0]=-.6;logits[[3,11,19,27],1]=-1
            if req.style=="hiphop":logits[::2,6]=.3;logits[[6,15,22,31],0]=.1
            if req.style=="jazz":logits[:,6]=-3;logits[::4,7]=2;logits[[7,15,23,31],7]=1;logits[::4,0]=-.5
            if req.style=="latin":logits[::2,7]=1;logits[:,6]=-2;logits[[0,6,12,16,22,28],0]=2
            tap=taps_tensor(req.taps,req.quantize)
            for i in np.flatnonzero(tap[:,0]):
                part=6 if req.role=="pulse" else (0 if i%8<4 else 1)
                if req.role=="complement":logits[(i+2)%32,part]=2
                else:logits[i,part]=3
            # Smooth latent controls plus local projections; a true baseline, not a trained model.
            logits+=np.tensordot(z,self.projection,axes=1)*(.4+req.variation)
            logits+=z[0]*1.3
            logits[1::2]+=z[1]*1.4
            h=1/(1+np.exp(-np.clip(logits,-20,20)))
            v=np.clip(.72+.12*np.tanh(z[2])+np.tensordot(z,self.projection,axes=1)*.07,.15,1)
            o=np.zeros((32,9))+np.tanh(z[3])*.09
            if req.style in ('jazz','hiphop'):o[2::4]+=.24
            for i in np.flatnonzero(tap[:,0]):o[i]=tap[i,2]
            notes=from_heads(h,v,o)
        notes=apply_poly(notes,req.taps,req.poly)
        if req.reference:
            locked=set(req.locked_drums)
            # Exact lock preservation. Refinement overlay is explicit; not a trained inpainting claim.
            notes=[n for n in notes if n.drum not in locked]
            notes += [n.model_copy(deep=True) for n in req.reference.notes if n.drum in locked]
        return sorted(notes,key=lambda n:(n.beat,n.drum))

    def search(self,req:GenerateRequest,cancel=None,progress=None):
        rng=np.random.default_rng(req.seed);archive={};seen=set()
        context=hashlib.sha256(req.model_dump_json().encode()).hexdigest()[:16]
        for iteration in range(req.budget):
            if cancel and cancel.is_set():break
            if req.algorithm=='map_elites' and archive and rng.random()<.8:
                elite=list(archive.values())[int(rng.integers(len(archive)))]
                z=np.array(elite['pattern']['latent'])+rng.normal(0,.22+.6*req.variation,32)
            else:z=rng.normal(0,1,32)
            z=np.clip(z,-3.5,3.5)
            notes=self.decode(z,req);desc=measures(notes)
            # Fixed bounds across takes: density 0..12 hits/beat, proxy syncopation 0..1.
            if desc['density']>12:continue
            cell=(min(7,int(desc['density']/12*8)),min(7,int(desc[req.descriptor_axis]*8)))
            q=quality(notes,req)
            signature=tuple((n.drum,round(n.beat,3),round(n.velocity,2)) for n in notes)
            if signature in seen:continue
            seen.add(signature)
            if cell not in archive or archive[cell]['quality']<q:
                pattern=Pattern(id=f'{context}-{iteration}',notes=notes,bpm=req.bpm,
                    seed=req.seed,engine=req.engine,descriptors=desc,latent=z.tolist())
                archive[cell]={'cell':list(cell),'quality':q,'pattern':pattern.model_dump()}
            if progress and iteration%32==0:progress(iteration+1,len(archive))
        elites=sorted(archive.values(),key=lambda e:-e['quality'])
        # Spread default candidates across cells; full archive remains available.
        return {'context_id':context,'algorithm':req.algorithm,'engine':req.engine,
                'evaluations':iteration+1,'unique_phenotypes':len(seen),'coverage':len(elites)/64,
                'qd_score':sum(e['quality'] for e in elites)/64,
                'descriptor_version':'metrical-proxy-v1','descriptor_axis':req.descriptor_axis,'archive':elites,'candidates':elites[:8]}
