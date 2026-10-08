"""Explainable stream assessment; scores are heuristic evidence, not probabilities.

Streams are track × port × channel × program/bank epoch. No channel-wide decision
silently copies a melodic program segment into the percussion dataset.
"""
from collections import Counter,defaultdict
import re
import numpy as np

GM_NAMES=['acoustic-bass-drum','bass-drum','side-stick','acoustic-snare','hand-clap','electric-snare',
 'low-floor-tom','closed-hihat','high-floor-tom','pedal-hihat','low-tom','open-hihat','low-mid-tom',
 'hi-mid-tom','crash-cymbal-1','high-tom','ride-cymbal-1','chinese-cymbal','ride-bell','tambourine',
 'splash-cymbal','cowbell','crash-cymbal-2','vibraslap','ride-cymbal-2','hi-bongo','low-bongo',
 'mute-hi-conga','open-hi-conga','low-conga','high-timbale','low-timbale','high-agogo','low-agogo',
 'cabasa','maracas','short-whistle','long-whistle','short-guiro','long-guiro','claves','hi-wood-block',
 'low-wood-block','mute-cuica','open-cuica','mute-triangle','open-triangle']
GM_MAP=dict(zip(range(35,82),GM_NAMES))
NINE={35:'kick',36:'kick',37:'snare',38:'snare',40:'snare',41:'floor-tom',43:'floor-tom',
      45:'mid-tom',47:'mid-tom',48:'hi-tom',50:'hi-tom',42:'closed-hihat',44:'closed-hihat',
      46:'open-hihat',51:'ride',53:'ride',59:'ride',49:'crash',52:'crash',55:'crash',57:'crash'}
TD11={**NINE,22:'closed-hihat',26:'open-hihat',58:'floor-tom'}
DRUM=re.compile(r'\b(drums?|drumset|drumkit|percussion|perc|kick|snare|hi[ -]?hat|hihat|toms?|cymbals?|ride|crash|claps?|congas?|bongos?|shakers?|tambourine|cowbell|rimshot)\b',re.I)
MELODIC=re.compile(r'\b(piano|bass(?!\s*drum)|guitar|strings?|violin|cello|organ|synth|lead|pad|flute|vibraphone|marimba|xylophone|glockenspiel|timpani|vocal|sax|brass|trumpet)\b',re.I)


def named_part(text):
    for pattern,name in [(r'kick|bass\s*drum','kick'),(r'snare|rimshot','snare'),(r'open.*(?:hat|hihat)','open-hihat'),
        (r'(?:closed.*hat|hi[ -]?hat|hihat)','closed-hihat'),(r'floor.*tom','floor-tom'),(r'ride','ride'),(r'crash','crash')]:
        if re.search(r'\b(?:'+pattern+r')\b',text,re.I):return name


def assess(parsed,source,policy,annotation=None):
    buckets=defaultdict(list)
    for index,n in enumerate(parsed['notes']):
        key=f"t{n['track']}:p{n['port']}:c{n['channel']+1}:e{n['epoch']}"
        buckets[key].append((index,n))
    decisions=[];selected=[]
    track_channels=defaultdict(set)
    for n in parsed['notes']:track_channels[n['track']].add(n['channel'])
    overrides=(annotation or {}).get('streams',{})
    for key,rows in sorted(buckets.items()):
        indexes,notes=zip(*rows);first=notes[0];track=parsed['tracks'][first['track']]
        # A type-0 track label is not automatically the label of every channel.
        label=' '.join(s['text'] for s in track['label_scopes'] if s['channel']==first['channel'] or
                       (s['channel'] is None and len(track_channels[first['track']])==1)).replace('_',' ')
        pitch=np.array([n['pitch'] for n in notes]);onsets=np.array([n['onset_beat'] for n in notes]);unique=len(set(pitch))
        durations=[n['duration_beats'] for n in notes if n['duration_beats'] is not None]
        short=float(np.mean(np.array(durations)<=.35)) if durations else 0.
        gm_fraction=float(np.mean((pitch>=35)&(pitch<=81)))
        reuse=1-unique/len(notes);simultaneous=1-len(set(onsets))/len(notes)
        families=sum(bool(set(pitch)&s) for s in ({35,36},{37,38,39,40},{42,44,46,49,51,53,55,57,59}))
        name_drum=bool(DRUM.search(label));name_melodic=bool(MELODIC.search(label))
        score=0.;reasons=[];hard_conflict=False
        if first['channel']==9:score=.91;reasons.append('conventional_channel_10')
        if first['bank_msb'] in (120,127):
            # 120: GM2 rhythm bank; 127: XG drum bank. Explicit mapping still matters.
            score=max(score,.97);reasons.append('rhythm_bank_select')
        if name_drum:score=max(score,.90);reasons.append('percussion_name')
        features=dict(note_count=len(notes),unique_pitches=unique,gm_pitch_fraction=gm_fraction,
                      short_note_fraction=short,pitch_reuse=reuse,simultaneous_fraction=simultaneous,
                      kit_families=families,missing_note_off_fraction=1-len(durations)/len(notes))
        pattern_score=.1+.2*gm_fraction+.15*short+.15*max(0,reuse)+.15*(families/3)+.1*min(1,simultaneous*4)
        if families==3 and unique>=4 and len(notes)>=16 and gm_fraction>=.95 and short>=.85 and reuse>=.65:
            pattern_score+=.1;reasons.append('repeated_short_kit_pattern')
        else:pattern_score=min(pattern_score,.79)
        if pattern_score>score:score=pattern_score;reasons.append('pattern_assessment')
        if name_melodic:score-=.6;hard_conflict=name_drum or first['channel']==9;reasons.append('melodic_name_conflict')
        program=first['program']
        if program is not None and first['channel']!=9 and first['bank_msb'] not in (120,127):
            score-=.35;reasons.append('melodic_program_on_nonrhythm_channel')
            if name_drum:hard_conflict=True
        if gm_fraction<.5 and source.drum_map=='gm' and not named_part(label):
            score-=.25;reasons.append('unmapped_pitch_distribution')
        score=float(np.clip(score,0,1));decision='percussion' if score>=policy.minimum_percussion_score and not hard_conflict else 'ambiguous' if score>=.45 or hard_conflict else 'non_percussion'
        override=overrides.get(key)
        if override and (annotation or {}).get('reason') and override.get('role') in ('percussion','non_percussion'):
            decision=override['role'];score=1.;reasons.append('reviewed_annotation')
        part_hint=named_part(label) if unique==1 else None
        mapping=(override or {}).get('pitch_map') or source.pitch_map
        mapped=[]
        for index,n in rows:
            event=dict(n);raw=n['pitch']
            explicit=mapping.get(raw,mapping.get(str(raw)))
            if explicit:
                event['instrument']=explicit;event['voice']=explicit if explicit in set(NINE.values()) else None;basis='configured_pitch_map'
            elif source.drum_map=='roland_td11':
                event['voice']=TD11.get(raw);event['instrument']=event['voice'];basis='roland_td11'
            elif source.drum_map=='custom':
                event['voice']=None;event['instrument']=None;basis='unknown_custom_map'
            elif part_hint:
                event['voice']=part_hint;event['instrument']=part_hint;basis='single_pitch_named_voice'
            else:
                event['voice']=NINE.get(raw);event['instrument']=GM_MAP.get(raw);basis='gm_assumption'
            event['mapping_basis']=basis;event['stream_id']=key
            if decision=='percussion':selected.append(event)
        decisions.append(dict(id=key,track=first['track'],port=first['port'],channel=first['channel']+1,
            program=program,bank_msb=first['bank_msb'],bank_lsb=first['bank_lsb'],label=label,
            decision=decision,evidence_score=score,reasons=reasons,features=features,
            onset_min=min(onsets),onset_max=max(onsets)))
    return decisions,sorted(selected,key=lambda n:(n['onset_tick'],n['track'],n['pitch']))
