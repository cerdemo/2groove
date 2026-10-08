const $ = id => document.getElementById(id);
const clone = x => structuredClone(x);
const uid = () => crypto.randomUUID();
let info, state, syncOffset=0, bestRTT=Infinity, receivedAt=0, recordingBefore=false, seenTake=-1;
let taps=[], selected=null, archive=[], candidates=[], history=[], locks=new Set(), patterns=new Map();
let undo=[], redo=[], selectedNote=-1, pinned={}, job=null, currentRequest=null, busyPoll=false;
let audio=null, buffers=[], sources=new Set(), scheduled=new Set(), audioToken='', audioBeat=null, pollFailures=0;
let actualAxis='syncopation';

async function api(path, data) {
  const response=await fetch('/api/'+path, data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  if(!response.ok){const body=await response.json().catch(()=>({detail:response.statusText}));throw Error(typeof body.detail==='string'?body.detail:JSON.stringify(body.detail));}
  return response.json();
}
function notice(message){$('notice').textContent=message;$('notice').hidden=!message;}
function action(id,fn){$(id).addEventListener('click',async()=>{try{notice('');await fn();}catch(e){notice(e.message);}});}
function num(id){return Number($(id).value);}
function download(blob,name){const url=URL.createObjectURL(blob), a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function remember(pattern){patterns.set(pattern.id,clone(pattern));}
function snapshot(label){history.unshift({label,pattern:selected?clone(selected):null,taps:clone(taps),request:clone(currentRequest),time:new Date().toISOString()});history=history.slice(0,40);renderHistory();persist();}
function persist(){try{localStorage.setItem('2groove-v2',JSON.stringify(session()));}catch{notice('Browser storage is full. Save the session as a file.');}}
function session(){return {format:'2groove-v2',version:1,taps,selected,history,pinned,locks:[...locks],request:currentRequest,settings:readRequest(false)};}

async function initAudio(){
  if(!audio){audio=new AudioContext({latencyHint:'interactive'});await audio.resume();
    buffers=await Promise.all(info.drums.map(name=>Promise.all([3,7,11].map(async layer=>{
      const r=await fetch(`/samples/${name}_${layer}.mp3`);if(!r.ok)throw Error('Missing drum sample');return audio.decodeAudioData(await r.arrayBuffer());
    }))));
  }else await audio.resume();
}
function stopAudio(){for(const s of sources){try{s.stop();}catch{}}sources.clear();scheduled.clear();audioToken='';audioBeat=null;}
function sound(note,when){
  if(!audio || !buffers[note.drum])return;
  const s=audio.createBufferSource(),gain=audio.createGain();
  s.buffer=buffers[note.drum][note.velocity<.4?0:note.velocity<.75?1:2];gain.gain.value=note.velocity*.65;
  s.connect(gain).connect(audio.destination);sources.add(s);s.onended=()=>{sources.delete(s);gain.disconnect();};s.start(Math.max(audio.currentTime,when));
}
function click(when,accent){if(!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=accent?1300:900;g.gain.setValueAtTime(.12,when);g.gain.exponentialRampToValueAtTime(.001,when+.035);o.connect(g).connect(audio.destination);o.start(when);o.stop(when+.04);sources.add(o);o.onended=()=>{sources.delete(o);g.disconnect();};}
function estimatedBeat(){if(!state)return 0;const moving=state.mode==='internal'||state.clock_running;return state.beat+(moving?(performance.now()/1000-receivedAt)*state.bpm/60:0);}
function scheduleAudio(){
  if(!state||!audio||audio.state!=='running')return;
  if(performance.now()/1000-receivedAt>.3){stopAudio();return;}
  const beat=estimatedBeat(),tempo=state.bpm;
  const moving=state.mode==='internal'||state.clock_running;
  const token=[state.playing,state.pattern_id,state.play_origin,moving,state.recording?.start,$('monitor').checked,$('metro').checked].join('|');
  if(token!==audioToken || (audioBeat!==null && (beat<audioBeat-.08 || beat-audioBeat>1))){stopAudio();audioToken=token;}
  audioBeat=beat;if(!moving)return;
  const horizon=beat+.10*tempo/60;
  const schedule=(key,onset,fn)=>{if(onset>=beat-.01&&onset<=horizon&&!scheduled.has(key)){scheduled.add(key);fn(audio.currentTime+Math.max(.003,(onset-beat)*60/tempo));}};
  if(state.playing && $('monitor').checked){
    const p=patterns.get(state.pattern_id);
    if(p)for(let loop=Math.max(0,Math.floor((beat-state.play_origin)/8));loop<=Math.max(0,Math.floor((horizon-state.play_origin)/8));loop++){
      p.notes.forEach((n,i)=>{const onset=state.play_origin+loop*8+n.beat;if(state.pending_at===null||state.pending_at===undefined||onset<state.pending_at)schedule(`n:${loop}:${i}`,onset,when=>sound(n,when));});
    }
  }
  if(state.recording && state.recording.start!==null && $('metro').checked){
    const start=state.recording.start;
    for(let i=Math.floor(beat-start);i<=Math.ceil(horizon-start);i++)if(i<8)schedule(`c:${start}:${i}`,start+i,when=>click(when,i%4===0));
  }
  // Keep only recent loop keys; held audio sources clean themselves up onended.
  if(scheduled.size>4096)scheduled.clear();
}
setInterval(scheduleAudio,25);

async function poll(){
  if(busyPoll)return;busyPoll=true;
  try{
    const before=performance.now()/1000, next=await api('state'), after=performance.now()/1000;
    const rtt=after-before;if(rtt<bestRTT*1.1){syncOffset=next.server_time-(before+after)/2;bestRTT=rtt;}
    state=next;receivedAt=(before+after)/2;pollFailures=0;$('connection').textContent='● Local engine';
    if(next.recording || (recordingBefore&&!next.recording) || (seenTake!==next.take_version && next.take_version>0)){
      taps=clone(next.taps);renderTaps();
      if(recordingBefore&&!next.recording)snapshot(`Take · ${taps.length} taps`);
    }
    recordingBefore=!!next.recording;seenTake=next.take_version;
    $('record').classList.toggle('active',!!next.recording);$('record').disabled=!!next.recording;
    $('finish').disabled=!next.recording;
    let status='Stopped';if(next.playing)status=next.mode==='external'&&!next.clock_running?'Waiting for DAW transport':next.pending_id?'Variation queued · next loop':'Playing';
    $('transportStatus').textContent=status;
    if(next.recording){const r=next.recording;const rel=r.start===null?null:next.beat-r.start;$('recordStatus').textContent=rel===null?'Armed · start DAW transport':rel<0?`Count-in · ${Math.ceil(-rel)} beats`:`Recording · ${Math.min(8,rel).toFixed(1)} / 8 beats · ${next.taps.length} taps`;}
    else $('recordStatus').textContent=`${taps.length} taps ready. Record again or edit the timeline; your selected groove stays available.`;
    $('diagnostics').textContent=`${next.bpm.toFixed(1)} BPM · scheduler p95 ${next.scheduler_late_ms_p95===null?'—':next.scheduler_late_ms_p95.toFixed(2)+' ms'} · dropped ${next.dropped_notes}`;
    if(next.error)$('midiStatus').textContent=next.error;
  }catch(e){pollFailures++;$('connection').textContent='Engine unavailable';if(pollFailures===3){stopAudio();notice('Local engine disconnected. Run python -m groove in the v2 environment.');}}
  finally{busyPoll=false;}
}
function renderTaps(){
  const lane=$('tapTimeline');lane.replaceChildren();
  taps.forEach((t,i)=>{const b=document.createElement('button');b.className='tap-marker';b.style.left=`${t.beat/8*100}%`;b.style.height=`${20+t.velocity*35}px`;b.title=`Beat ${t.beat.toFixed(3)} · velocity ${Math.round(t.velocity*127)} · click to remove`;b.setAttribute('aria-label',b.title);b.onclick=e=>{e.stopPropagation();if(state?.recording)return;taps.splice(i,1);renderTaps();persist();};lane.append(b);});
  const head=document.createElement('div');head.id='tapHead';head.className='playhead';head.hidden=true;lane.append(head);$('takeCount').textContent=`${taps.length} taps · 2 bars`;
}
$('tapTimeline').onclick=e=>{if(state?.recording)return;const r=e.currentTarget.getBoundingClientRect();taps.push({beat:Math.min(7.999,Math.max(0,(e.clientX-r.left)/r.width*8)),velocity:.8,source:'editor'});taps.sort((a,b)=>a.beat-b.beat);renderTaps();persist();};
function renderEditor(){
  const editor=$('editor');editor.replaceChildren();
  const ruler=document.createElement('div');ruler.className='grid-row';ruler.innerHTML='<span></span><div class="ruler"><span>1</span><span>2</span><span>3</span><span>4</span><span>1</span><span>2</span><span>3</span><span>4</span></div>';editor.append(ruler);
  info.drums.forEach((name,d)=>{
    const row=document.createElement('div');row.className='grid-row';const label=document.createElement('label');label.className='voice';
    const lock=document.createElement('input');lock.type='checkbox';lock.checked=locks.has(d);lock.title=`Lock ${name}`;lock.disabled=!selected;lock.onchange=()=>{lock.checked?locks.add(d):locks.delete(d);persist();};label.append(lock,document.createTextNode(name));
    const lane=document.createElement('div');lane.className='lane';lane.title=`Add ${name}`;
    (selected?.notes||[]).forEach((n,i)=>{if(n.drum!==d)return;const hit=document.createElement('button');hit.className='hit'+(selectedNote===i?' selected':'');hit.style.left=`${n.beat/8*100}%`;hit.style.opacity=.3+n.velocity*.7;hit.title=`${name}: beat ${n.beat.toFixed(4)}, velocity ${Math.round(n.velocity*127)}`;hit.setAttribute('aria-label',hit.title);hit.onclick=e=>{e.stopPropagation();selectedNote=i;renderEditor();};lane.append(hit);});
    lane.onclick=e=>{if(locks.has(d)){notice('Unlock this voice before editing.');return;}const r=lane.getBoundingClientRect(),beat=Math.min(7.75,Math.max(0,Math.floor((e.clientX-r.left)/r.width*32)/4));selectedNote=-1;edit(p=>{p.notes.push({drum:d,beat,velocity:.8,duration:.12});selectedNote=p.notes.length-1;});};
    row.append(label,lane);editor.append(row);
  });
  const n=selected?.notes[selectedNote];$('noteBeat').disabled=!n;$('noteVelocity').disabled=!n;$('deleteNote').disabled=!n;
  $('noteLabel').textContent=n?`${info.drums[n.drum]} · exact event timing`:'Select a hit to edit velocity and exact timing.';
  if(n){$('noteBeat').value=n.beat.toFixed(4);$('noteVelocity').value=Math.round(n.velocity*127);}
  $('grooveTitle').textContent=selected?`${selected.notes.length} hits · ${selected.engine}`:'Groove editor';$('undo').disabled=!undo.length;$('redo').disabled=!redo.length;
}
async function queueEdited(){remember(selected);if(state?.playing)await api('play',selected);persist();}
function edit(fn){
  if(selected?.notes[selectedNote]&&locks.has(selected.notes[selectedNote].drum)){notice('Unlock the selected voice before editing.');return;}
  undo.push(clone(selected));undo=undo.slice(-50);redo=[];
  selected=selected?clone(selected):{id:uid(),notes:[],beats:8,bpm:num('bpm'),seed:0,engine:'manual',descriptors:{},latent:[]};
  fn(selected);selected.id=uid();selected.engine='edited';selected.latent=[];selected.descriptors={};renderEditor();queueEdited().catch(e=>notice(e.message));
}
$('noteBeat').onchange=()=>{const value=num('noteBeat');if(!Number.isFinite(value)||value<0||value>=8){notice('Beat must be between 0 and 8 (exclusive).');renderEditor();return;}edit(p=>p.notes[selectedNote].beat=value);};
$('noteVelocity').onchange=()=>{const value=num('noteVelocity');if(value<1||value>127){renderEditor();return;}edit(p=>p.notes[selectedNote].velocity=value/127);};
action('deleteNote',()=>edit(p=>{p.notes.splice(selectedNote,1);selectedNote=-1;}));
action('undo',async()=>{if(!undo.length)return;redo.push(clone(selected));selected=undo.pop();selectedNote=-1;renderEditor();if(selected)await queueEdited();});
action('redo',async()=>{if(!redo.length)return;undo.push(clone(selected));selected=redo.pop();selectedNote=-1;renderEditor();if(selected)await queueEdited();});

function readRequest(reference=true){
  return {taps:clone(taps),bpm:state?.mode==='external'?state.bpm:num('bpm'),style:$('style').value,role:$('role').value,engine:$('engine').value,algorithm:$('algorithm').value,seed:num('seed'),budget:num('budget'),variation:num('variation'),quantize:num('quantize'),reference:reference&&selected?clone(selected):null,locked_drums:reference?[...locks]:[],descriptor_axis:$('axis').value,poly:{mode:$('polyMode').value,formative:num('formative'),target:num('target'),cycle:num('cycle'),shift:num('shift'),phase:num('phase'),drum:num('polyDrum'),tap_drum:num('tapDrum')}};
}
function restoreControls(req){if(!req)return;for(const key of ['bpm','style','role','engine','algorithm','seed','budget','variation','quantize'])if(req[key]!==undefined)$(key).value=req[key];if(req.descriptor_axis)$('axis').value=req.descriptor_axis;if(req.poly)for(const [id,key] of [['polyMode','mode'],['formative','formative'],['target','target'],['cycle','cycle'],['shift','shift'],['phase','phase'],['polyDrum','drum'],['tapDrum','tap_drum']])$(id).value=req.poly[key];renderControls();}
function renderControls(){
  $('variationOut').value=num('variation').toFixed(2);$('quantizeOut').value=`${Math.round(num('quantize')*100)}%`;$('shiftOut').value=num('shift').toFixed(2);
  const mode=$('polyMode').value;for(const id of ['formative','shift'])$(id).disabled=mode!=='ni_grid';$('tapDrum').disabled=mode!=='overlay';
  $('polyPreview').textContent=mode==='off'?'':mode==='overlay'?`Raw taps on ${info.drums[num('tapDrum')]} + ${num('target')} counter-pulses every ${num('cycle')} beats`:`NI(${num('formative')} | ${num('target')}, ${num('shift').toFixed(2)}) · phase ${num('phase')} · ${num('cycle')}-beat cycle`;
}
for(const id of ['variation','quantize','polyMode','formative','target','cycle','shift','phase','polyDrum','tapDrum'])$(id).oninput=renderControls;
$('polyMode').addEventListener('change',()=>{if($('polyMode').value==='ni_grid')$('axis').value='nonisochrony';});
action('generate',async()=>{
  if(state?.recording)throw Error('Finish the take before generating.');
  currentRequest=readRequest();job=(await api('generate',currentRequest)).id;$('generate').disabled=true;$('cancel').hidden=false;
  try{while(job){await new Promise(r=>setTimeout(r,250));const result=await api('jobs/'+job);$('jobStatus').textContent=`${result.completed} / ${result.budget} evaluated · ${result.filled} cells`;
    if(result.status==='error')throw Error(result.error);
    if(result.status==='complete'){
      archive=result.result.archive;candidates=result.result.candidates;actualAxis=result.result.descriptor_axis;
      for(const cell of archive)remember(cell.pattern);renderArchive();renderCandidates();
      $('jobStatus').textContent=`${result.seconds.toFixed(2)} s · ${result.result.unique_phenotypes} unique · QD score ${result.result.qd_score.toFixed(3)}`;
      if(candidates.length)await select(candidates[0].pattern,'Generated variation');else notice('No cells filled. Try a different seed or wider search.');break;
    }if(result.status==='cancelled'){$('jobStatus').textContent='Search cancelled';break;}
  }}finally{job=null;$('generate').disabled=false;$('cancel').hidden=true;}
});
action('cancel',async()=>{if(job)await api(`jobs/${job}/cancel`,{});});
async function select(pattern,label='Selected variation'){
  selected=clone(pattern);remember(selected);selectedNote=-1;undo=[];redo=[];
  renderEditor();renderArchive();renderCandidates();snapshot(label);
  if(state?.playing)await api('play',selected);
}
function renderArchive(){
  $('archive').replaceChildren();$('coverage').textContent=`${archive.length} / 64`;$('axisLabel').textContent=actualAxis==='nonisochrony'?'IOI variability ↑':'Syncopation proxy ↑';
  for(let y=7;y>=0;y--)for(let x=0;x<8;x++){
    const elite=archive.find(e=>e.cell[0]===x&&e.cell[1]===y),b=document.createElement('button');b.disabled=!elite;
    if(elite){b.className='occupied'+(selected?.id===elite.pattern.id?' selected':'');b.style.background=`hsl(89 40% ${28+elite.quality*35}%)`;b.title=`Density ${elite.pattern.descriptors.density.toFixed(2)}, ${actualAxis} ${elite.pattern.descriptors[actualAxis].toFixed(3)}, proxy quality ${elite.quality.toFixed(3)}`;b.onclick=()=>select(elite.pattern,'Archive selection').catch(e=>notice(e.message));}
    else b.title=`Empty cell ${x+1}, ${y+1}`;b.setAttribute('aria-label',b.title);$('archive').append(b);
  }
}
function renderCandidates(){
  $('candidates').replaceChildren();candidates.forEach((e,i)=>{const b=document.createElement('button');b.className='candidate'+(selected?.id===e.pattern.id?' active':'');b.textContent=`Variation ${i+1}`;const s=document.createElement('small');s.textContent=`${e.pattern.notes.length} hits · ${e.pattern.descriptors[actualAxis].toFixed(2)} ${actualAxis==='nonisochrony'?'IOI CV':'sync'}`;b.append(s);b.onclick=()=>select(e.pattern,`Variation ${i+1}`).catch(e=>notice(e.message));$('candidates').append(b);});
}
function renderHistory(){
  $('history').replaceChildren();history.forEach((item,i)=>{const b=document.createElement('button');b.textContent=`${item.label} · ${item.taps.length} taps`;b.title=item.time;b.onclick=async()=>{try{taps=clone(item.taps);currentRequest=clone(item.request);restoreControls(item.request);renderTaps();if(item.pattern){selected=clone(item.pattern);remember(selected);selectedNote=-1;undo=[];redo=[];renderEditor();if(state?.playing)await api('play',selected);}persist();}catch(e){notice(e.message);}};$('history').append(b);});
  $('playA').disabled=!pinned.A;$('playB').disabled=!pinned.B;
}
async function startPlay(pattern=selected){if(!pattern)throw Error('Generate or draw a groove first.');if($('monitor').checked)await initAudio();remember(pattern);state=await api('play',pattern);receivedAt=performance.now()/1000;}
action('play',()=>startPlay());action('stop',async()=>{stopAudio();await api('stop',{});});action('panic',async()=>{stopAudio();await api('panic',{});});
for(const slot of ['A','B']){action('pin'+slot,()=>{if(!selected)throw Error('Select a groove first.');pinned[slot]=clone(selected);renderHistory();persist();});action('play'+slot,()=>startPlay(pinned[slot]));}
action('setTempo',async()=>{stopAudio();state=await api('tempo',{bpm:num('bpm'),mode:$('clock').value});receivedAt=performance.now()/1000;});
action('record',async()=>{await initAudio();await api('record/arm',{count_in:4});await poll();});
action('finish',async()=>{taps=(await api('record/finish',{})).taps;renderTaps();});
async function tap(){if(!state?.recording)return;await api('record/tap',{timestamp:performance.now()/1000+syncOffset,velocity:.8});}
$('tapPad').addEventListener('pointerdown',e=>{e.preventDefault();tap().catch(e=>notice(e.message));});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&state?.recording&&!['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)){e.preventDefault();if(!e.repeat)tap().catch(e=>notice(e.message));}});
action('demo',()=>{if(state?.recording)throw Error('Finish recording first.');taps=[0,.75,1.5,2,3.25,4,4.75,5.5,6,7.25].map((beat,i)=>({beat,velocity:i%3===0?.95:.65,source:'demo'}));renderTaps();snapshot('Demo phrase');});
action('clearTaps',()=>{if(state?.recording)throw Error('Finish recording first.');taps=[];renderTaps();persist();});
action('export',async()=>{if(!selected)throw Error('Select a groove first.');const r=await fetch('/api/export/midi',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...selected,bpm:state.bpm})});if(!r.ok)throw Error('Invalid groove');download(await r.blob(),'2groove.mid');});
action('save',()=>download(new Blob([JSON.stringify(session(),null,2)],{type:'application/json'}),'2groove-session.json'));
async function loadSession(data){
  // Validate the entire project server-side before replacing the current working state.
  data=await api('project/validate',data);taps=data.taps;selected=data.selected;history=data.history;pinned=data.pinned;locks=new Set(data.locks);currentRequest=data.request;
  if(selected)remember(selected);for(const p of Object.values(pinned))remember(p);for(const h of history)if(h.pattern)remember(h.pattern);
  undo=[];redo=[];selectedNote=-1;restoreControls(data.settings);renderTaps();renderEditor();renderHistory();persist();
}
$('open').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>4_000_000)throw Error('Session exceeds 4 MB');await loadSession(JSON.parse(await file.text()));}catch(e){notice(e.message);}e.target.value='';};
async function refreshPorts(){
  const ports=await api('midi/ports');
  for(const [id,list,virtual,label] of [['tapInput',ports.inputs,'@virtual:tap','Create 2groove Tap In'],['clockInput',ports.inputs,'@virtual:clock','Create 2groove Clock In'],['midiOutput',ports.outputs,'@virtual','Create 2groove Drum Out']]){
    const old=$(id).value;$(id).replaceChildren(new Option('None',''),new Option(label,virtual));list.forEach(name=>$(id).add(new Option(name,name)));$(id).value=old;
  }if(ports.error)$('midiStatus').textContent=ports.error;
}
action('refreshPorts',refreshPorts);
action('connectMidi',async()=>{
  const routes={tap_input:$('tapInput').value||null,clock_input:$('clockInput').value||null,output:$('midiOutput').value||null,channel:num('channel'),tap_channel:$('tapChannel').value?num('tapChannel'):null,tap_note:$('tapNote').value?num('tapNote'):null};
  await api('midi/connect',routes);if(routes.output){$('monitor').checked=false;stopAudio();}$('midiStatus').textContent='Connected · '+[routes.tap_input,routes.clock_input,routes.output].filter(Boolean).join(' → ');
});
action('disconnectMidi',async()=>{await api('midi/disconnect',{});stopAudio();$('midiStatus').textContent='Disconnected';});
$('monitor').onchange=async()=>{try{if($('monitor').checked)await initAudio();else stopAudio();}catch(e){notice(e.message);}};
function animate(){
  if(state?.recording&&state.recording.start!==null){const rel=estimatedBeat()-state.recording.start;$('tapHead').hidden=rel<0||rel>=8;$('tapHead').style.left=`${Math.max(0,rel/8*100)}%`;}
  else if($('tapHead'))$('tapHead').hidden=true;
  requestAnimationFrame(animate);
}
async function boot(){
  info=await api('info');if(info.engines.includes('cvae'))$('engine').add(new Option('CVAE · GMD baseline','cvae'));
  for(const id of ['polyDrum','tapDrum'])info.drums.forEach((name,i)=>$(id).add(new Option(name,String(i))));$('polyDrum').value='7';$('tapDrum').value='0';
  renderTaps();renderEditor();renderArchive();renderHistory();renderControls();
  const saved=localStorage.getItem('2groove-v2');if(saved){try{await loadSession(JSON.parse(saved));}catch(e){notice('Saved session could not be restored: '+e.message);}}
  await poll();await refreshPorts();setInterval(poll,60);animate();
}
boot().catch(e=>notice(e.message));
