'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const S={info:null,sources:[],gmd:[],source:null,human:null,results:{},algorithm:'map_elites',elite:null,mode:'full',busy:false,job:null,inspectToken:0,loadToken:0};
const colors={full:'#a8d8be',dual:'#c6b7e7',solo:'#e7bb82'};
const numbers=['seed','budget','bins','initial_random','restart_probability','max_offset','add_weight','delete_weight','shift_weight','velocity_weight','timing_weight','velocity_sigma','timing_sigma','shift_radius','min_interval_ms','max_hits_per_second','max_velocity_jump'];
function notice(message=''){$('notice').textContent=message;$('notice').hidden=!message;}
async function api(path,body){const r=await fetch(path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(typeof data.detail==='string'?data.detail:JSON.stringify(data.detail));return data;}
function guard(fn){return async(...args)=>{try{await fn(...args);}catch(e){notice(e.message);}};}
function candidateEvents(elite=S.elite){return elite?elite.genome.flatMap(([h,v,o],i)=>h?[[((i+o)/4+8)%8,v,0]]:[]).sort((a,b)=>a[0]-b[0]):[];}
function events(kind){return kind==='full'?(S.source?.events||[]):kind==='dual'?(S.human?.events||[]):candidateEvents();}
function hasAudio(mode=S.mode){return mode==='overlay'?events('full').length&&events('solo').length:events(mode).length;}

function renderCatalog(){
  const mode=$('libraryMode').value, query=$('sourceFilter').value.toLowerCase();
  $('catalogInputs').hidden=mode==='upload';$('cropInputs').hidden=mode==='paired';$('uploadInputs').hidden=mode!=='upload';
  const rows=(mode==='paired'?S.sources:S.gmd).filter(r=>`${r.name} ${r.split}`.toLowerCase().includes(query));
  $('sourceSelect').replaceChildren(...rows.map(r=>new Option(`${mode==='paired'?'#'+r.id+' · ':''}${r.name.replace('.mid','')} · ${Number(r.bpm).toFixed(0)} BPM`,r.id)));
  $('catalogCount').textContent=`${rows.length} performances · train + validation`;
  if(mode==='paired'&&rows.some(r=>r.id===S.source?.id))$('sourceSelect').value=S.source.id;
}
async function loadSource(){
  const token=++S.loadToken, mode=$('libraryMode').value;notice();stopAudio();
  $('loadSource').disabled=true;
  try{
    let source;
    if(mode==='paired'){
      if(!$('sourceSelect').value)throw Error('No matching source. Clear the search filter.');
      source=await api(`/api/sources/${encodeURIComponent($('sourceSelect').value)}`);
    }else if(mode==='gmd')source=await api(`/api/gmd/${$('sourceSelect').value}?start=${Number($('startBeat').value)}`,{});
    else{
      const file=$('midiFile').files[0];if(!file)throw Error('Choose a drum MIDI file first.');
      if(file.size>2000000)throw Error('Maximum MIDI upload is 2 MB.');
      const r=await fetch(`/api/import?name=${encodeURIComponent(file.name)}&start=${Number($('startBeat').value)}`,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:await file.arrayBuffer()});
      source=await r.json();if(!r.ok)throw Error(source.detail);
    }
    if(token===S.loadToken)setSource(source);
  }finally{$('loadSource').disabled=S.busy;}
}
function setSource(source){
  stopAudio();S.source=source;S.results={};S.elite=null;S.algorithm='map_elites';S.human=source.taps?.[0]||null;
  $('bpm').value=Number((source.bpm||120).toFixed(3));$('sourceName').textContent=source.name;$('splitTag').textContent=source.split.toUpperCase();
  $('fullTag').textContent=source.provenance.includes('GMD')?'GMD':'MIDI';
  $('sourceCount').textContent=`${source.events.length} events`; $('fullProvenance').textContent=source.provenance;
  $('interpretation').replaceChildren(...(source.taps?.length?source.taps.map((t,i)=>new Option(`Participant ${t.participant} · ${t.interpretation.replaceAll('_',' ')}`,String(i))):[new Option('No paired human interpretation','')]));
  $('interpretation').disabled=!source.taps?.length;
  $('pairInfo').textContent=source.taps?.length?`${source.taps.length} real interpretations of this source. Both pads retained.`:'This import has no verified human pair. The 2-ch panel stays empty.';
  if(!hasAudio())S.mode='full';renderListenModes();renderHuman();renderPatterns();
  setResults(source.saved_results||[],(source.saved_results||[]).length?'Saved pilot · seed 42 · original source tempo':'No archive yet. Run evolution to populate the map.');
  $('runSearch').disabled=!S.info.model_ready||S.busy;
  $('searchStatus').textContent='Ready. Each run is saved in the research workspace.';
  $('searchProgress').value=0;
  inspectMotif();
}
function renderHuman(){
  $('dualTag').textContent=S.human?'HUMAN':'UNAVAILABLE';
  $('humanCaption').textContent=S.human?`Participant ${S.human.participant} · ${S.human.interpretation.replaceAll('_',' ')} · original pad events`:'No linked human performance; no synthetic 2-ch target is substituted.';
  $('dualHits').textContent=S.human?`${S.human.events.length} hits`:'';
}
function renderRoll(id,kind){
  const data=events(kind), container=$(id), labels=kind==='full'?S.info.drums.map(s=>s.replaceAll('-',' ')):kind==='dual'?(data.some(e=>e[2]===0)?['Pad A','Pad B','Unknown']:['Pad A','Pad B']):['Solo'];
  if(!data.length){container.innerHTML=`<div class="empty-state">${kind==='dual'?'No verified human 2-ch pair for this import.':'Select an occupied archive cell, or run evolution.'}</div>`;return;}
  const left=80,w=704,row=kind==='full'?18:26,height=26+labels.length*row+12;
  let svg=`<svg viewBox="0 0 800 ${height}" role="img" aria-label="${kind} rhythm piano roll">`;
  const start=Number($('motifStart').value)*4,width=Number($('motifWidth').value);
  for(let i=0;i<32;i++)if((i-start+32)%32<width)svg+=`<rect class="window-highlight" x="${left+i*w/32}" y="21" width="${w/32}" height="${height-24}"/>`;
  for(let i=0;i<=32;i++){
    const x=left+i*w/32;svg+=`<line x1="${x}" y1="20" x2="${x}" y2="${height-5}" stroke="${i%16===0?'#62716b':i%4===0?'#414e4d':'#2b373a'}" stroke-width="${i%16===0?1.3:.6}"/>`;
    if(i<32&&i%4===0)svg+=`<text x="${x+3}" y="11" fill="#a5b1ac" font-size="8" font-family="monospace">${i<16?1:2}.${i/4%4+1}</text>`;
  }
  labels.forEach((label,i)=>{const y=26+i*row;svg+=`<text x="0" y="${y+row/2+3}" fill="#9eaeaa" font-size="9" font-family="monospace">${esc(label)}</text><line x1="${left}" y1="${y+row}" x2="784" y2="${y+row}" stroke="#303a3c" stroke-width=".5"/>`;});
  data.forEach(([beat,v,voice])=>{
    const lane=kind==='full'?voice:kind==='dual'?(voice===0?2:voice-1):0;
    const x=left+beat/8*w,y=26+lane*row+row/2, gridBeat=((Math.round(beat*4)%32)/4), offset=(beat*4-Math.round(beat*4))/4*60000/Number($('bpm').value);
    if(Math.abs(beat-gridBeat)<.3)svg+=`<line x1="${left+gridBeat/8*w}" y1="${y}" x2="${x}" y2="${y}" stroke="${colors[kind]}" opacity=".4"/>`;
    svg+=`<rect class="hit" x="${x-2.4}" y="${y-(4+v*9)/2}" width="4.8" height="${4+v*9}" rx="1.2" fill="${colors[kind]}" opacity="${.35+.65*v}"><title>Beat ${beat.toFixed(4)} · velocity ${Math.round(v*127)} · offset ${offset.toFixed(1)} ms</title></rect>`;
  });
  svg+=`<line class="playhead" x1="80" x2="80" y1="16" y2="${height-4}"/></svg>`;container.innerHTML=svg;
}
function renderPatterns(){if(!S.info)return;renderRoll('fullRoll','full');renderRoll('dualRoll','dual');renderRoll('soloRoll','solo');$('fullHits').textContent=S.source?`${events('full').length} hits`:'';$('soloHits').textContent=S.elite?`${events('solo').length} hits`:'';document.querySelectorAll('[data-export],[data-audition]').forEach(b=>b.disabled=!events(b.dataset.export||b.dataset.audition).length);}
function setResults(results,origin){S.results=Object.fromEntries(results.map(r=>[r.algorithm,r]));if(!S.results[S.algorithm])S.algorithm=results[0]?.algorithm||'map_elites';S.elite=null;const archive=S.results[S.algorithm]?.archive||[];if(archive.length)S.elite=archive.reduce((a,b)=>a.score.quality>b.score.quality?a:b);$('archiveOrigin').textContent=origin;renderArchive();renderElite();}
function renderArchive(){
  const result=S.results[S.algorithm], bins=result?.config.bins||Number($('bins').value), archive=result?.archive||[], cells=new Map(archive.map(e=>[e.cell.join(','),e]));
  const grid=$('archiveGrid');grid.style.gridTemplateColumns=`repeat(${bins},1fr)`;grid.replaceChildren();
  for(let y=bins-1;y>=0;y--)for(let x=0;x<bins;x++){
    const elite=cells.get(`${x},${y}`),b=document.createElement('button');b.disabled=!elite;b.dataset.cell=`${x},${y}`;
    b.setAttribute('aria-label',`Density cell ${x+1}, syncopation cell ${y+1}${elite?`, quality ${elite.score.quality.toFixed(3)}`:', empty'}`);
    if(elite){b.classList.add('occupied');const q=elite.score.quality;b.style.background=`rgb(${Math.round(65+170*q)} ${Math.round(64+137*q)} ${Math.round(55+92*q)})`;b.title=`${elite.density.toFixed(2)} hits/beat · sync ${elite.syncopation.toFixed(3)} · quality ${q.toFixed(3)}`;b.onclick=()=>{S.elite=elite;renderArchive();renderElite();if(A.playing&&['solo','overlay'].includes(S.mode))playAudio(S.mode);};}
    if(elite&&elite===S.elite)b.classList.add('selected');grid.append(b);
  }
  document.querySelectorAll('[data-algorithm]').forEach(b=>{b.classList.toggle('active',b.dataset.algorithm===S.algorithm);b.disabled=!S.results[b.dataset.algorithm];});
  $('coverage').textContent=result?`${(result.coverage*100).toFixed(1)}%`:'—';$('bestScore').textContent=archive.length?Math.max(...archive.map(e=>e.score.quality)).toFixed(3):'—';$('evaluations').textContent=result?.evaluations??'—';
  $('comparison').innerHTML=Object.values(S.results).map(r=>`<div class="compare-row ${r.algorithm===S.algorithm?'active':''}"><span>${r.algorithm==='random'?'Random':'MAP-Elites'}</span><span>QD ${r.qd_score.toFixed(3)} · ${r.feasible_evaluations}/${r.evaluations} valid</span></div>`).join('');
}
function renderElite(){
  const elite=S.elite;renderPatterns();renderListenModes();
  $('soloTag').textContent=S.algorithm==='random'?'RANDOM':'MAP-ELITES';
  $('eliteCaption').textContent=elite?`Cell ${elite.cell.join(' / ')} · ${elite.density.toFixed(2)} hits/beat · sync ${elite.syncopation.toFixed(3)} · proposal ${elite.iteration+1}`:'No candidate selected';
  $('feasibility').textContent=elite?`Min IOI ${elite.constraints.minimum_ioi_ms.toFixed(0)} ms · feasible`: '—';
  $('quality').textContent=elite?elite.score.quality.toFixed(3):'—';
  const terms=[['weighted_retention','Weighted retention',.5],['learned_compatibility','Learned compatibility',.5],['incompatible_additions','Unsupported additions',-.3],['phase_loss','Phase loss',-.2],['order_loss','Order loss',-.2],['density_excess','Density excess',-.25]];
  $('scoreBars').innerHTML=terms.map(([k,label,w])=>{const value=elite?elite.score[k]*w:0;return `<div class="score-term"><div class="term-label"><span>${label}</span><span>${elite?(value>=0?'+':'')+value.toFixed(3):'—'}</span></div><div class="score-track"><div class="score-fill ${w<0?'negative':''}" style="width:${Math.min(100,Math.abs(value)*200)}%"></div></div></div>`;}).join('');
  $('scoreMeta').textContent=elite?`Raw ${elite.score.raw_quality.toFixed(3)} · expected ${elite.score.expected_onsets.toFixed(1)} onsets · selected ${elite.score.candidate_onsets}. Proxy, not a perceptual rating.`:'Choose an elite to see its score decomposition.';
  $('tempoNotice').hidden=!S.results[S.algorithm]||Math.abs(Number($('bpm').value)-S.results[S.algorithm].bpm)<.01;
  inspectMotif();
}
function tinyProfile(p,color,label){const width=280,step=width/p.length;let lines='';for(let i=0;i<=p.length;i++)lines+=`<line x1="${i*step}" x2="${i*step}" y1="4" y2="44" stroke="#2c383b" stroke-width=".6"/>`;p.forEach(([h,v,o],i)=>{if(h>.01){const x=((i+o+p.length)%p.length)*step;lines+=`<line x1="${x}" x2="${x}" y1="43" y2="${43-34*v}" stroke="${color}" stroke-width="3" opacity="${.25+.75*Math.min(1,h)}"/><circle cx="${x}" cy="${43-34*v}" r="2.5" fill="${color}"/>`;}});return `<div><label>${label}</label><svg viewBox="0 0 280 48" role="img" aria-label="${label}">${lines}</svg></div>`;}
async function inspectMotif(){
  if(!S.source||!S.info?.model_ready)return;const token=++S.inspectToken;
  try{const r=await api('/api/inspect',{source_id:S.source.id,width:Number($('motifWidth').value),start:Number($('motifStart').value),events:candidateEvents()});if(token!==S.inspectToken)return;const motif=r.motifs[0];
    $('motifViz').innerHTML=tinyProfile(r.source_window,colors.full,'CURRENT SOURCE · SHARED PROFILE')+tinyProfile(motif.source_profile,'#8fb39e','TRAINING SOURCE SHAPELET')+tinyProfile(motif.tap_profile,colors.dual,'PAIRED HUMAN RESPONSE SHAPELET')+tinyProfile(r.candidate_window,colors.solo,'SELECTED SOLO WINDOW');
    $('motifDetails').textContent=`Motif #${motif.id} · source weight ${(motif.weight*100).toFixed(1)}% · training group ${motif.exemplar.group}, participant ${motif.exemplar.participant}, beat ${(motif.exemplar.start_step/4+1).toFixed(0)}. Top weights: ${r.motifs.map(m=>`#${m.id} ${(m.weight*100).toFixed(1)}%`).join(' · ')}. Template profiles are analysis views, not new human performances.`;
  }catch(e){if(token===S.inspectToken)$('motifDetails').textContent=e.message;}
}
function readRequest(){const r={source_id:S.source.id,bpm:Number($('bpm').value),algorithm:$('compareRandom').checked?'both':'map_elites',technique:$('technique').value,velocity:$('velocity').checked,microtiming:$('microtiming').checked};for(const id of numbers)r[id]=Number($(id).value);return r;}
function setParameters(r){for(const id of numbers)if(r[id]!==undefined)$(id).value=r[id];for(const id of ['velocity','microtiming'])if(r[id]!==undefined)$(id).checked=r[id];if(r.technique)$('technique').value=r.technique;if(r.bpm)$('bpm').value=r.bpm;$('compareRandom').checked=r.algorithm==='both';$('restartOut').textContent=`${Math.round(Number($('restart_probability').value)*100)}%`;}
function setBusy(busy){S.busy=busy;$('runSearch').disabled=busy||!S.info?.model_ready||!S.source;$('cancelSearch').hidden=!busy;for(const id of ['loadSource','libraryMode','sourceSelect','sourceFilter','openRun','savedRuns'])$(id).disabled=busy;}
async function runSearch(){
  for(const input of document.querySelectorAll('.parameters input,#bpm'))if(!input.reportValidity())return;
  notice();const request=readRequest();setBusy(true);$('searchStatus').textContent='Starting a fresh archive…';$('searchProgress').max=request.budget;$('searchProgress').value=0;
  try{const response=await api('/api/search',request);S.job=response.id;await pollJob(response.id,request);}catch(e){setBusy(false);throw e;}
}
async function pollJob(id,request){
  try{const job=await api(`/api/jobs/${id}`);if(id!==S.job)return;
    $('searchProgress').value=job.progress.evaluations;
    $('searchStatus').textContent=`${job.active_algorithm==='random'?'Random baseline':'MAP-Elites'} · ${job.progress.evaluations}/${request.budget} · ${job.progress.filled} cells · best ${job.progress.best.toFixed(3)}`;
    if(job.status==='running'){setTimeout(()=>pollJob(id,request),250);return;}
    setBusy(false);S.job=null;
    if(job.status==='error')throw Error(job.error);
    if(job.source_id===S.source?.id)setResults(job.result.results,`${job.status==='cancelled'?'Partial, cancelled':'Saved run'} · ${id} · seed ${request.seed} · ${request.bpm} BPM`);
    $('searchStatus').textContent=`${job.status==='cancelled'?'Cancelled; partial results saved':'Complete; all proposals and MIDI saved'} · ${job.seconds.toFixed(1)} s`;
    await refreshRuns();
  }catch(e){setBusy(false);S.job=null;notice(e.message);}
}
async function refreshRuns(){const runs=await api('/api/runs');$('savedRuns').replaceChildren(...(runs.length?runs.map(r=>new Option(`${r.id} · source ${r.source_id} · ${r.status}`,r.id)):[new Option('No new runs yet','')]));}
async function restoreRun(){if(!$('savedRuns').value)return;const {source,run}=await api(`/api/runs/${$('savedRuns').value}`);setSource(source);setParameters(run.request);setResults(run.results,`Restored ${run.status} run · ${run.id}`);}
async function downloadMidi(kind){const data=events(kind);if(!data.length)return;const r=await fetch('/api/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({events:data,kind,bpm:Number($('bpm').value)})});if(!r.ok)throw Error((await r.json()).detail);const url=URL.createObjectURL(await r.blob()),a=document.createElement('a');a.href=url;a.download=`solo-lab-${S.source.id}-${kind}.mid`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

// AudioContext is the shared clock. A 120 ms lookahead schedules raw event beats;
// requestAnimationFrame only draws the cursor. No MIDI hardware ports are opened.
const A={ctx:null,master:null,buffers:null,playing:false,origin:0,bpm:120,nodes:new Set(),scheduled:new Set(),loading:null,token:0};
async function initAudio(){
  if(!A.ctx){A.ctx=new AudioContext({latencyHint:'interactive'});A.master=A.ctx.createGain();A.master.connect(A.ctx.destination);}
  await A.ctx.resume();A.master.gain.value=Number($('volume').value);
  if(!A.loading)A.loading=Promise.all(S.info.drums.map(name=>Promise.all([3,7,11].map(async layer=>{const r=await fetch(`/samples/${name}_${layer}.mp3`);if(!r.ok)throw Error('Missing sample');return A.ctx.decodeAudioData(await r.arrayBuffer());})))).then(buffers=>{A.buffers=buffers;}).catch(()=>{$('audioStatus').textContent='Samples unavailable · synthesized percussion fallback';A.buffers=null;});
  await A.loading;
}
function releaseNodes(){for(const n of A.nodes)try{n.stop();}catch{}A.nodes.clear();A.scheduled.clear();}
function stopAudio(){A.token++;A.playing=false;releaseNodes();$('playStatus').textContent='Ready to listen';$('play').textContent='▶';document.querySelectorAll('.playhead').forEach(x=>x.style.opacity=0);}
function renderListenModes(){document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===S.mode);b.disabled=!hasAudio(b.dataset.mode);});}
async function playAudio(mode=S.mode){
  if(!$('bpm').reportValidity())return;
  if(!hasAudio(mode)){notice('This view has no events to audition yet.');return;}
  const token=++A.token;const phase=A.playing?Math.max(0,((A.ctx.currentTime-A.origin)*A.bpm/60)%8):0;
  await initAudio();if(token!==A.token)return;releaseNodes();S.mode=mode;renderListenModes();A.bpm=Number($('bpm').value);A.origin=A.ctx.currentTime+.045-phase*60/A.bpm;A.playing=true;
  $('playStatus').textContent={full:'Full groove',dual:'Human two-channel',solo:'Generated one-channel',overlay:'Full groove + solo'}[mode];$('play').textContent='Ⅱ';scheduleAudio();
}
function sound(voice,v,when,gainFactor=1,click=false){
  const gain=A.ctx.createGain();gain.connect(A.master);gain.gain.value=v*.45*gainFactor;let node;
  if(A.buffers&&!click){node=A.ctx.createBufferSource();node.buffer=A.buffers[voice][v<.4?0:v<.75?1:2];node.connect(gain);node.start(when);}
  else{node=A.ctx.createOscillator();node.type=click?'sine':voice===0?'sine':'triangle';node.frequency.setValueAtTime(click?1400:voice===0?110:180+voice*95,when);node.frequency.exponentialRampToValueAtTime(click?1000:60,when+.07);gain.gain.setValueAtTime(v*(click?.1:.3)*gainFactor,when);gain.gain.exponentialRampToValueAtTime(.001,when+.09);node.connect(gain);node.start(when);node.stop(when+.1);}
  A.nodes.add(node);node.onended=()=>{A.nodes.delete(node);gain.disconnect();};
}
function scheduleAudio(){
  if(!A.playing||!A.ctx)return;const now=A.ctx.currentTime,horizon=now+.12,spb=60/A.bpm,cycle=Math.max(0,Math.floor((now-A.origin)/(8*spb)));
  const kinds=S.mode==='overlay'?['full','solo']:[S.mode];
  for(let loop=cycle;loop<=cycle+1;loop++){
    for(const kind of kinds)events(kind).forEach(([beat,v,voice],i)=>{const when=A.origin+(loop*8+beat)*spb,key=`${loop}:${kind}:${i}`;if(when>=now-.005&&when<horizon&&!A.scheduled.has(key)){A.scheduled.add(key);sound(kind==='full'?voice:kind==='dual'?(voice===2?4:3):1,v,Math.max(now+.002,when),S.mode==='overlay'?.65:1);}});
    if($('metronome').checked)for(let beat=0;beat<8;beat++){const when=A.origin+(loop*8+beat)*spb,key=`${loop}:click:${beat}`;if(when>=now&&when<horizon&&!A.scheduled.has(key)){A.scheduled.add(key);sound(0,beat%4===0?.9:.5,when,1,true);}}
  }
  if(A.scheduled.size>4000)for(const key of A.scheduled)if(Number(key.split(':')[0])<cycle-1)A.scheduled.delete(key);
}
setInterval(scheduleAudio,25);
function animate(){if(A.playing){const beat=Math.max(0,(A.ctx.currentTime-A.origin)*A.bpm/60)%8;document.querySelectorAll('.playhead').forEach(line=>{line.style.opacity=1;line.setAttribute('x1',80+beat/8*704);line.setAttribute('x2',80+beat/8*704);});}requestAnimationFrame(animate);}requestAnimationFrame(animate);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAudio();});

$('loadSource').onclick=guard(loadSource);$('libraryMode').onchange=()=>{renderCatalog();};$('sourceFilter').oninput=renderCatalog;
$('interpretation').onchange=()=>{stopAudio();S.human=S.source.taps[Number($('interpretation').value)]||null;renderHuman();renderPatterns();};
$('restart_probability').oninput=()=>{$('restartOut').textContent=`${Math.round(Number($('restart_probability').value)*100)}%`;};
$('technique').onchange=()=>{const stick=$('technique').value==='stick';$('min_interval_ms').value=stick?70:100;$('max_hits_per_second').value=stick?12:8;};
$('runSearch').onclick=guard(runSearch);$('cancelSearch').onclick=guard(async()=>{if(S.job)await api(`/api/jobs/${S.job}/cancel`,{});});$('openRun').onclick=guard(restoreRun);
$('play').onclick=guard(()=>A.playing?stopAudio():playAudio());$('stop').onclick=stopAudio;
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=guard(async()=>{S.mode=b.dataset.mode;renderListenModes();if(A.playing)await playAudio(S.mode);}));
document.querySelectorAll('[data-audition]').forEach(b=>b.onclick=guard(()=>playAudio(b.dataset.audition)));
document.querySelectorAll('[data-export]').forEach(b=>b.onclick=guard(()=>downloadMidi(b.dataset.export)));
document.querySelectorAll('[data-algorithm]').forEach(b=>b.onclick=()=>{stopAudio();S.algorithm=b.dataset.algorithm;S.elite=null;const a=S.results[S.algorithm]?.archive||[];if(a.length)S.elite=a.reduce((x,y)=>x.score.quality>y.score.quality?x:y);renderArchive();renderElite();});
for(const id of ['motifWidth','motifStart'])$(id).onchange=()=>{renderPatterns();inspectMotif();};
$('bpm').onchange=()=>{stopAudio();if(!$('bpm').reportValidity())return;renderElite();};$('volume').oninput=()=>{if(A.master)A.master.gain.value=Number($('volume').value);};
$('helpToggle').onclick=()=>$('method').scrollIntoView({behavior:'smooth'});
async function initialize(){
  [S.info,S.sources,S.gmd]=await Promise.all([api('/api/info'),api('/api/sources'),api('/api/gmd')]);
  $('engineStatus').textContent=S.info.model_ready?'Local engine · model loaded':'Local engine · model missing';renderCatalog();renderArchive();
  const first=S.sources.find(x=>x.id===S.info.default_source)||S.sources.find(x=>x.split==='validation')||S.sources[0];
  if(first){$('sourceSelect').value=first.id;await loadSource();}else{$('searchStatus').textContent='Paired library unavailable. Import a GMD performance or drum MIDI.';renderPatterns();}
  if(!S.info.model_ready)notice('No usable local motif checkpoint. Source loading and audio remain available. See research/solo_tapping/README.md for the fit command.\n'+S.info.model_error);
  await refreshRuns();
}
guard(initialize)();
