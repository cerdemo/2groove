"""Full-clip CVAE. Posterior sees drums during training; serving uses the prior."""
import numpy as np
import torch
from torch import nn
from torch.nn import functional as F
from .events import STYLES, taps_tensor, from_heads


class CVAE(nn.Module):
    def __init__(self,hidden=48,latent=32):
        super().__init__();self.hidden=hidden;self.latent=latent
        self.style=nn.Embedding(len(STYLES),8);self.role=nn.Embedding(3,4)
        self.tap_encoder=nn.GRU(3,hidden,batch_first=True,bidirectional=True)
        self.drum_encoder=nn.GRU(27,hidden,batch_first=True,bidirectional=True)
        context=2*hidden+13
        self.prior=nn.Sequential(nn.Linear(context,96),nn.SiLU(),nn.Linear(96,latent*2))
        self.posterior=nn.Sequential(nn.Linear(context+2*hidden,96),nn.SiLU(),nn.Linear(96,latent*2))
        self.decoder=nn.GRU(3+latent+13+2,hidden*2,batch_first=True)
        self.head=nn.Linear(hidden*2,27)
        phase=torch.arange(32)*2*torch.pi/16
        self.register_buffer('position',torch.stack((phase.sin(),phase.cos()),-1))

    def context(self,taps,style,role,bpm):
        _,h=self.tap_encoder(taps)
        cond=torch.cat((self.style(style),self.role(role),((bpm-120)/120).unsqueeze(-1)),-1)
        return torch.cat((h[-2],h[-1],cond),-1),cond

    def distribution(self,head):
        mu,logvar=head.chunk(2,-1);return mu,logvar.clamp(-7,4)

    def decode(self,taps,cond,z):
        batch=len(taps)
        x=torch.cat((taps,z[:,None].expand(-1,32,-1),cond[:,None].expand(-1,32,-1),
                     self.position[None].expand(batch,-1,-1)),-1)
        x,_=self.decoder(x);heads=self.head(x).reshape(batch,32,9,3)
        return heads[...,0],heads[...,1].sigmoid(),.5*heads[...,2].tanh()

    def forward(self,taps,style,role,bpm,drums=None,sample=True):
        context,cond=self.context(taps,style,role,bpm)
        pm,pl=self.distribution(self.prior(context));qm,ql=pm,pl
        if drums is not None:
            _,h=self.drum_encoder(drums.flatten(2))
            qm,ql=self.distribution(self.posterior(torch.cat((context,h[-2],h[-1]),-1)))
        z=qm+torch.exp(.5*ql)*torch.randn_like(qm) if sample else qm
        return self.decode(taps,cond,z),(qm,ql,pm,pl)

    @torch.inference_mode()
    def generate(self,req,epsilon):
        taps=torch.from_numpy(taps_tensor(req.taps,req.quantize))[None]
        ctx,cond=self.context(taps,torch.tensor([STYLES.index(req.style)]),
            torch.tensor([('accent','pulse','complement').index(req.role)]),torch.tensor([req.bpm]))
        mu,lv=self.distribution(self.prior(ctx))
        z=mu+torch.exp(.5*lv)*torch.tensor(epsilon,dtype=torch.float32)[None]*(.3+req.variation)
        h,v,o=self.decode(taps,cond,z)
        return from_heads(h[0].sigmoid().numpy(),v[0].numpy(),o[0].numpy(),threshold=.45)


def loss_function(heads,target,distributions,beta=.02):
    logits,v,o=heads;h=target[...,0];den=h.sum().clamp_min(1)
    # Normalized, finite on silent targets. Separate categorical/polyphonic semantics.
    hit=F.binary_cross_entropy_with_logits(logits,h)
    velocity=(F.smooth_l1_loss(v,target[...,1],reduction='none')*h).sum()/den
    offset=(F.smooth_l1_loss(o,target[...,2],reduction='none')*h).sum()/den
    qm,ql,pm,pl=distributions
    kl=.5*(pl-ql+(ql.exp()+(qm-pm).square())/pl.exp()-1).sum(-1).mean()
    total=hit+velocity+offset+beta*kl
    return total,dict(hit=float(hit.detach()),velocity=float(velocity.detach()),offset=float(offset.detach()),kl=float(kl.detach()))


def load_checkpoint(path):
    # Only our local state_dict format; do not deserialize arbitrary model objects.
    checkpoint=torch.load(path,map_location='cpu',weights_only=True)
    model=CVAE(**checkpoint['architecture']);model.load_state_dict(checkpoint['state_dict'])
    model.eval();torch.set_num_threads(2)
    return model,checkpoint.get('metadata',{})
