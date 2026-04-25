/**
 * Virtuoso Studio v3 — Realistic Piano + Trumpet
 * Features: full keyboard mapping, reverb toggle, multitrack mixing
 */
(() => {
'use strict';

const MAX_REC = 90;
const WW = 48, BW = 30; // piano key widths

// ── Chromatic helpers ─────────────────────────────
const CHR = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// ── Piano key shortcuts ───────────────────────────
const PIANO_MAP = {
  'z':'C3','s':'C#3','x':'D3','d':'D#3','c':'E3',
  'v':'F3','g':'F#3','b':'G3','h':'G#3','n':'A3','j':'A#3','m':'B3',
  'q':'C4','2':'C#4','w':'D4','3':'D#4','e':'E4',
  'r':'F4','5':'F#4','t':'G4','6':'G#4','y':'A4','7':'A#4','u':'B4','i':'C5'
};

// ── Trumpet: ALL keyboard keys mapped chromatically ──
// Row 1 (number): 1-0,-,= → C3..B3
// Row 2 (qwerty): q-] → C4..B4
// Row 3 (home):   a-' → C5..B5
// Row 4 (bottom): z-/ → C6..A#6 (10 keys)
const TKEYS_R1 = ['1','2','3','4','5','6','7','8','9','0','-','='];
const TKEYS_R2 = ['q','w','e','r','t','y','u','i','o','p','[',']'];
const TKEYS_R3 = ['a','s','d','f','g','h','j','k','l',';',"'"];
const TKEYS_R4 = ['z','x','c','v','b','n','m',',','.','/'];
const TRUMPET_MAP = {};
TKEYS_R1.forEach((k,i)=>{ if(i<12) TRUMPET_MAP[k]=CHR[i]+'3'; });
TKEYS_R2.forEach((k,i)=>{ if(i<12) TRUMPET_MAP[k]=CHR[i]+'4'; });
TKEYS_R3.forEach((k,i)=>{ if(i<11) TRUMPET_MAP[k]=CHR[i]+'5'; });
TKEYS_R4.forEach((k,i)=>{ if(i<10) TRUMPET_MAP[k]=CHR[i]+'6'; });

// Valve fingering (octave independent — same pattern repeats)
const VALVE = {'C':'','C#':'123','D':'13','D#':'23','E':'12','F':'1','F#':'2',
  'G':'','G#':'23','A':'12','A#':'1','B':'2'};

// Full trumpet range for the note grid
const TRUMPET_RANGE = [];
for(let o=3;o<=5;o++) CHR.forEach(n=>TRUMPET_RANGE.push(n+o));
['C6','C#6','D6','D#6','E6','F6','F#6','G6','G#6','A6','A#6'].forEach(n=>TRUMPET_RANGE.push(n));

// ── State ─────────────────────────────────────────
let mode = 'piano';
let piano=null, trumpet=null, reverb=null, recorder=null, ready=false;
let reverbOn=false;
let activeNotes=new Set();
let isRec=false, hasRec=false, isPlay=false;
let blobUrl=null, recStart=null, recTimer=null, recTimeout=null;
// Mix state
let mixRecorder=null, mixRecording=null; // which instrument is being mix-recorded
let mixBlobs={piano:null, trumpet:null};
let mixPlaying=false;

// ── DOM ───────────────────────────────────────────
const $=s=>document.querySelector(s);
const splash=$('#splash'), startBtn=$('#start-btn'), sStatus=$('#s-status');
const app=$('#app'), sdot=$('#sdot'), stext=$('#stext');
const heroPiano=$('#hero-piano'), heroTrumpet=$('#hero-trumpet');
const pianoSec=$('#piano-section'), trumpetSec=$('#trumpet-section'), mixSec=$('#mix-section');
const recSec=$('#rec-section');
const togPiano=$('#tog-piano'), togTrumpet=$('#tog-trumpet'), togMix=$('#tog-mix');
const reverbBtn=$('#reverb-btn');
const tDisp=$('#t-disp');
const v1=$('#v1'),v2=$('#v2'),v3=$('#v3');
const rRec=$('#rbtn-rec'), rStop=$('#rbtn-stop'), rPlay=$('#rbtn-play'), rDl=$('#rbtn-dl');
const prg=$('#prg'), timer=$('#timer'), playback=$('#playback');

// ── Build Piano ───────────────────────────────────
function buildPiano() {
  const kb=$('#piano-kb'); kb.innerHTML='';
  const notes=[], whites=[], blacks=[];
  for(let o=3;o<=4;o++) CHR.forEach(n=>notes.push(n+o));
  notes.push('C5');
  notes.forEach(n=>n.includes('#')?blacks.push(n):whites.push(n));
  kb.style.width=(whites.length*WW)+'px';
  const rev={}; Object.entries(PIANO_MAP).forEach(([k,n])=>rev[n]=k.toUpperCase());
  whites.forEach((note,i)=>{
    const el=mk('div','key white-key'); el.dataset.note=note;
    el.style.left=(i*WW)+'px'; el.style.width=WW+'px';
    el.innerHTML=`<span class="kn">${note}</span>${rev[note]?`<span class="kh">${rev[note]}</span>`:''}`;
    addMouse(el,note,'piano'); kb.appendChild(el);
  });
  blacks.forEach(note=>{
    const wi=whites.indexOf(note[0]+note.slice(-1));
    if(wi<0)return;
    const el=mk('div','key black-key'); el.dataset.note=note;
    el.style.left=((wi+1)*WW-BW/2)+'px'; el.style.width=BW+'px';
    el.innerHTML=`<span class="kn">${note.slice(0,-1)}</span>${rev[note]?`<span class="kh">${rev[note]}</span>`:''}`;
    addMouse(el,note,'piano'); kb.appendChild(el);
  });
}

// ── Build Trumpet Grid ────────────────────────────
function buildTrumpetGrid() {
  const g=$('#notes-grid'); g.innerHTML='';
  const rev={}; Object.entries(TRUMPET_MAP).forEach(([k,n])=>rev[n]=k.toUpperCase());
  const rows=[
    {label:'Octave 3 — Row 1 (1–=)', notes:TRUMPET_RANGE.filter(n=>n.endsWith('3'))},
    {label:'Octave 4 — Row Q (q–])', notes:TRUMPET_RANGE.filter(n=>n.endsWith('4'))},
    {label:'Octave 5 — Row A (a–\')', notes:TRUMPET_RANGE.filter(n=>n.endsWith('5'))},
    {label:'Octave 6 — Row Z (z–/)', notes:TRUMPET_RANGE.filter(n=>n.endsWith('6'))}
  ];
  rows.forEach(r=>{
    const lbl=mk('div','row-label'); lbl.textContent=r.label; g.appendChild(lbl);
    r.notes.forEach(note=>{
      const el=mk('button','nbtn'+(note.includes('#')?' sharp-note':''));
      el.dataset.note=note;
      const sc=rev[note]||'';
      el.innerHTML=`<span class="ntn">${note}</span><span class="nkh ${sc?'mapped':''}">${sc||'·'}</span>`;
      addMouse(el,note,'trumpet'); g.appendChild(el);
    });
  });
}

function mk(tag,cls){const e=document.createElement(tag);e.className=cls;return e;}

function addMouse(el,note,inst){
  el.addEventListener('mousedown',ev=>{ev.preventDefault();noteOn(note,inst);});
  el.addEventListener('mouseup',()=>noteOff(note,inst));
  el.addEventListener('mouseleave',()=>noteOff(note,inst));
  el.addEventListener('touchstart',ev=>{ev.preventDefault();noteOn(note,inst);},{passive:false});
  el.addEventListener('touchend',ev=>{ev.preventDefault();noteOff(note,inst);},{passive:false});
}

// ── Note On / Off ─────────────────────────────────
function noteOn(note, inst) {
  if(!ready||activeNotes.has(note)) return;
  activeNotes.add(note);
  try {
    if(inst==='trumpet') {
      // Fixed 0.5-second duration — note auto-stops
      trumpet.triggerAttackRelease(note, 0.5, Tone.immediate());
      highlightKey(note,true,inst);
      showValves(note);
      // Auto-clear after 0.5 second
      setTimeout(()=>{
        activeNotes.delete(note);
        highlightKey(note,false,inst);
        if(activeNotes.size===0) clearValves();
      }, 500);
    } else {
      piano.triggerAttack(note, Tone.immediate());
      highlightKey(note,true,inst);
    }
  } catch(e){}
}

function noteOff(note, inst) {
  if(!activeNotes.has(note)) return;
  if(inst==='trumpet') return; // trumpet notes are self-terminating (1s)
  activeNotes.delete(note);
  try { piano.triggerRelease(note, Tone.immediate()); } catch(e){}
  highlightKey(note,false,inst);
}

function highlightKey(note,on,inst) {
  if(inst==='piano'){
    const el=document.querySelector(`.key[data-note="${note}"]`);
    if(el) el.classList.toggle('active',on);
  } else {
    const el=document.querySelector(`.nbtn[data-note="${note}"]`);
    if(el) el.classList.toggle('active',on);
    if(on) tDisp.textContent=note;
  }
}

function showValves(note) {
  const base=note.replace(/\d/,'');
  const f=VALVE[base]||'';
  v1.classList.toggle('pressed',f.includes('1'));
  v2.classList.toggle('pressed',f.includes('2'));
  v3.classList.toggle('pressed',f.includes('3'));
}
function clearValves(){v1.classList.remove('pressed');v2.classList.remove('pressed');v3.classList.remove('pressed');tDisp.textContent='—';}

// ── Keyboard Events ───────────────────────────────
document.addEventListener('keydown',e=>{
  if(e.repeat) return;
  const key=e.key.toLowerCase();
  if(e.key===' ') { e.preventDefault(); return; }
  if(mode==='piano' || (mode==='mix' && mixRecording==='piano')) {
    const note=PIANO_MAP[key]||PIANO_MAP[e.key];
    if(note){e.preventDefault();noteOn(note,'piano');}
  }
  if(mode==='trumpet' || (mode==='mix' && mixRecording==='trumpet')) {
    const note=TRUMPET_MAP[key]||TRUMPET_MAP[e.key];
    if(note){e.preventDefault();noteOn(note,'trumpet');}
  }
});
document.addEventListener('keyup',e=>{
  const key=e.key.toLowerCase();
  if(mode==='piano' || (mode==='mix' && mixRecording==='piano')) {
    const note=PIANO_MAP[key]||PIANO_MAP[e.key];
    if(note) noteOff(note,'piano');
  }
  if(mode==='trumpet' || (mode==='mix' && mixRecording==='trumpet')) {
    const note=TRUMPET_MAP[key]||TRUMPET_MAP[e.key];
    if(note) noteOff(note,'trumpet');
  }
});

// ── Mode Switch ───────────────────────────────────
togPiano.addEventListener('click',()=>switchMode('piano'));
togTrumpet.addEventListener('click',()=>switchMode('trumpet'));
togMix.addEventListener('click',()=>switchMode('mix'));

function switchMode(m){
  activeNotes.forEach(n=>noteOff(n,mode==='trumpet'?'trumpet':'piano'));
  activeNotes.clear();
  mode=m;
  togPiano.classList.toggle('on',m==='piano');
  togTrumpet.classList.toggle('on',m==='trumpet');
  togMix.classList.toggle('on',m==='mix');
  heroPiano.style.display=(m==='piano')?'':'none';
  heroTrumpet.style.display=(m==='trumpet')?'':'none';
  pianoSec.style.display=(m==='piano')?'':'none';
  trumpetSec.classList.toggle('show',m==='trumpet');
  mixSec.classList.toggle('show',m==='mix');
  recSec.style.display=(m==='mix')?'none':'';
  if(m==='trumpet'){clearValves();buildTrumpetGrid();}
}

// ── Reverb Toggle ─────────────────────────────────
reverbBtn.addEventListener('click',()=>{
  reverbOn=!reverbOn;
  reverbBtn.textContent=reverbOn?'🔊 Reverb: ON':'🔊 Reverb: OFF';
  reverbBtn.classList.toggle('active',reverbOn);
  if(reverbOn){
    reverb.wet.rampTo(0.35, 0.2);
  } else {
    reverb.wet.rampTo(0, 0.2);
  }
});

// ── Audio Init ────────────────────────────────────
async function init() {
  await Tone.start();
  Tone.context.lookAhead = 0;
  setStatus('Loading piano…','spin');

  // Reverb (starts dry, toggled by button)
  reverb = new Tone.Reverb({ decay: 2.5, wet: 0 });
  await reverb.generate();
  reverb.toDestination();

  // Piano — Salamander Grand Piano
  await new Promise(res=>{
    piano = new Tone.Sampler({
      urls:{
        'A0':'A0.mp3','C1':'C1.mp3','D#1':'Ds1.mp3','F#1':'Fs1.mp3',
        'A1':'A1.mp3','C2':'C2.mp3','D#2':'Ds2.mp3','F#2':'Fs2.mp3',
        'A2':'A2.mp3','C3':'C3.mp3','D#3':'Ds3.mp3','F#3':'Fs3.mp3',
        'A3':'A3.mp3','C4':'C4.mp3','D#4':'Ds4.mp3','F#4':'Fs4.mp3',
        'A4':'A4.mp3','C5':'C5.mp3','D#5':'Ds5.mp3','F#5':'Fs5.mp3',
        'A5':'A5.mp3','C6':'C6.mp3','D#6':'Ds6.mp3','F#6':'Fs6.mp3',
        'A6':'A6.mp3','C7':'C7.mp3','D#7':'Ds7.mp3','F#7':'Fs7.mp3',
        'A7':'A7.mp3','C8':'C8.mp3'
      },
      baseUrl:'https://tonejs.github.io/audio/salamander/',
      onload:()=>res(),
      onerror:()=>res()
    });
    piano.connect(reverb);
    piano.toDestination();
  });

  setStatus('Loading trumpet…','spin');

  // Trumpet — FluidR3 GM real samples
  try {
    const sfData = await loadFluidR3Trumpet();
    trumpet = new Tone.Sampler({ urls: sfData, release: 0.15 });
    trumpet.connect(reverb);
    trumpet.toDestination();
    await Tone.loaded();
  } catch(e) {
    console.warn('[V] Trumpet fallback:', e);
    trumpet = makeFallbackTrumpet();
    trumpet.connect(reverb);
  }

  // Recorder
  recorder = new Tone.Recorder();
  Tone.Destination.connect(recorder);

  // Mix recorder (separate instance)
  mixRecorder = new Tone.Recorder();
  Tone.Destination.connect(mixRecorder);

  ready=true;
  rRec.disabled=false;
  setStatus('Ready','ok');
  buildPiano();
  buildTrumpetGrid();
}

function loadFluidR3Trumpet() {
  return new Promise((resolve,reject)=>{
    if(!window.MIDI) window.MIDI={};
    if(!window.MIDI.Soundfont) window.MIDI.Soundfont={};
    const s=document.createElement('script');
    s.src='https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/trumpet-mp3.js';
    s.onload=()=>{
      const raw=window.MIDI?.Soundfont?.trumpet;
      if(!raw){reject(new Error('No data'));return;}
      const flats={'Bb':'A#','Eb':'D#','Ab':'G#','Db':'C#','Gb':'F#'};
      const urls={};
      Object.entries(raw).forEach(([k,v])=>{
        urls[k.replace(/^([A-G]b)/,m=>flats[m]||m)]=v;
      });
      resolve(urls);
    };
    s.onerror=reject;
    document.head.appendChild(s);
  });
}

function makeFallbackTrumpet() {
  const vib=new Tone.Vibrato({frequency:4.5,depth:0.07}).toDestination();
  const s=new Tone.FMSynth({
    harmonicity:3.01,modulationIndex:14,
    oscillator:{type:'sawtooth'},
    envelope:{attack:0.02,decay:0.1,sustain:0.5,release:0.15},
    modulation:{type:'square'},
    modulationEnvelope:{attack:0.04,decay:0.15,sustain:0.4,release:0.2}
  });
  s.connect(vib);
  return s;
}

function setStatus(t,s){stext.textContent=t;sdot.className='sdot'+(s==='ok'?' ok':s==='spin'?' spin':'');}

// ── Quick Recording ───────────────────────────────
rRec.addEventListener('click', startRec);
rStop.addEventListener('click', stopRec);
rPlay.addEventListener('click', togglePlay);
rDl.addEventListener('click', download);

async function startRec(){
  if(isRec||!ready)return;
  if(blobUrl){URL.revokeObjectURL(blobUrl);blobUrl=null;}
  isRec=true;recStart=Date.now();
  rRec.classList.add('recording');rRec.disabled=true;
  rStop.disabled=false;rPlay.disabled=true;rDl.disabled=true;
  timer.classList.add('rec');
  recorder.start();
  recTimer=setInterval(updateTimer,100);
  recTimeout=setTimeout(stopRec,MAX_REC*1000);
}
async function stopRec(){
  if(!isRec)return; isRec=false;
  clearInterval(recTimer);clearTimeout(recTimeout);
  try{const b=await recorder.stop();blobUrl=URL.createObjectURL(b);playback.src=blobUrl;hasRec=true;}catch(e){}
  rRec.classList.remove('recording');rRec.disabled=false;
  rStop.disabled=true;rPlay.disabled=!hasRec;rDl.disabled=!hasRec;
  timer.classList.remove('rec','warn');
}
function updateTimer(){
  const s=(Date.now()-recStart)/1000;
  prg.style.width=Math.min(s/MAX_REC*100,100)+'%';
  timer.textContent=fmt(s)+' / '+fmt(MAX_REC);
  if(s>=MAX_REC-15)timer.classList.add('warn');
}
function togglePlay(){
  if(!hasRec)return;
  if(isPlay){playback.pause();playback.currentTime=0;isPlay=false;rPlay.textContent='▶ Play';}
  else{playback.play();isPlay=true;rPlay.textContent='⏸ Pause';}
}
playback.addEventListener('timeupdate',()=>{
  if(!isPlay)return;
  const d=playback.duration||1;
  prg.style.width=(playback.currentTime/d*100)+'%';
  timer.textContent=fmt(playback.currentTime)+' / '+fmt(d);
});
playback.addEventListener('ended',()=>{isPlay=false;rPlay.textContent='▶ Play';});

function download(){
  if(!blobUrl)return;
  const a=document.createElement('a');a.href=blobUrl;a.download='virtuoso-'+Date.now()+'.webm';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
}
function fmt(s){return String(Math.floor(s/60)).padStart(2,'0')+':'+String(Math.floor(s%60)).padStart(2,'0');}

// ── Multitrack Mixer ──────────────────────────────
const mRecP=$('#mix-rec-piano'), mStopP=$('#mix-stop-piano'), mDurP=$('#mix-dur-piano');
const mPlayP=$('#mix-play-piano'), mClearP=$('#mix-clear-piano');
const mRecT=$('#mix-rec-trumpet'), mStopT=$('#mix-stop-trumpet'), mDurT=$('#mix-dur-trumpet');
const mPlayT=$('#mix-play-trumpet'), mClearT=$('#mix-clear-trumpet');
const mPlayAll=$('#mix-play-all'), mStopAll=$('#mix-stop-all');
const mAudioP=$('#mix-audio-piano'), mAudioT=$('#mix-audio-trumpet');

let mixRecStart=null, mixRecTimer=null;

mRecP.addEventListener('click',()=>startMixRec('piano'));
mStopP.addEventListener('click',()=>stopMixRec('piano'));
mPlayP.addEventListener('click',()=>playMixTrack('piano'));
mClearP.addEventListener('click',()=>clearMixTrack('piano'));

mRecT.addEventListener('click',()=>startMixRec('trumpet'));
mStopT.addEventListener('click',()=>stopMixRec('trumpet'));
mPlayT.addEventListener('click',()=>playMixTrack('trumpet'));
mClearT.addEventListener('click',()=>clearMixTrack('trumpet'));

mPlayAll.addEventListener('click',playMixAll);
mStopAll.addEventListener('click',stopMixAll);

async function startMixRec(inst) {
  if(!ready || mixRecording) return;
  mixRecording = inst;
  mixRecStart = Date.now();
  const btn = inst==='piano' ? mRecP : mRecT;
  const stopBtn = inst==='piano' ? mStopP : mStopT;
  btn.classList.add('recording'); btn.disabled=true;
  stopBtn.disabled=false;
  (inst==='piano'?mRecT:mRecP).disabled=true;
  const dur = inst==='piano' ? mDurP : mDurT;
  mixRecTimer = setInterval(()=>{
    dur.textContent = '⏺ ' + fmt((Date.now()-mixRecStart)/1000);
  },200);
  // Show the right instrument sections for playing while recording
  heroPiano.style.display = inst==='piano' ? '' : 'none';
  heroTrumpet.style.display = inst==='trumpet' ? '' : 'none';
  pianoSec.style.display = inst==='piano' ? '' : 'none';
  trumpetSec.classList.toggle('show', inst==='trumpet');
  if(inst==='trumpet') { clearValves(); buildTrumpetGrid(); }
  mixRecorder.start();
  setStatus('Recording '+inst+'…','spin');
}

async function stopMixRec(inst) {
  if(mixRecording!==inst) return;
  clearInterval(mixRecTimer);
  try {
    const blob = await mixRecorder.stop();
    const url = URL.createObjectURL(blob);
    if(mixBlobs[inst]) URL.revokeObjectURL(mixBlobs[inst]);
    mixBlobs[inst] = url;
    const audio = inst==='piano' ? mAudioP : mAudioT;
    audio.src = url;
    const dur = inst==='piano' ? mDurP : mDurT;
    dur.textContent = '✓ ' + fmt((Date.now()-mixRecStart)/1000);
  } catch(e) { console.error(e); }

  const btn = inst==='piano' ? mRecP : mRecT;
  const stopBtn = inst==='piano' ? mStopP : mStopT;
  const playBtn = inst==='piano' ? mPlayP : mPlayT;
  const clearBtn = inst==='piano' ? mClearP : mClearT;
  btn.classList.remove('recording'); btn.disabled=false;
  stopBtn.disabled=true; playBtn.disabled=false; clearBtn.disabled=false;
  (inst==='piano'?mRecT:mRecP).disabled=false;
  mixRecording = null;

  // Hide instrument panels in mix mode
  heroPiano.style.display='none'; heroTrumpet.style.display='none';
  pianoSec.style.display='none'; trumpetSec.classList.remove('show');

  mPlayAll.disabled = !(mixBlobs.piano || mixBlobs.trumpet);
  setStatus('Ready','ok');
}

function playMixTrack(inst) {
  const audio = inst==='piano' ? mAudioP : mAudioT;
  if(!audio.src) return;
  audio.currentTime=0; audio.play();
}

function clearMixTrack(inst) {
  if(mixBlobs[inst]) URL.revokeObjectURL(mixBlobs[inst]);
  mixBlobs[inst]=null;
  const audio = inst==='piano' ? mAudioP : mAudioT;
  audio.src='';
  const dur = inst==='piano' ? mDurP : mDurT;
  dur.textContent='Not recorded';
  (inst==='piano'?mPlayP:mPlayT).disabled=true;
  (inst==='piano'?mClearP:mClearT).disabled=true;
  mPlayAll.disabled = !(mixBlobs.piano || mixBlobs.trumpet);
}

function playMixAll() {
  mixPlaying=true;
  mStopAll.disabled=false;
  if(mixBlobs.piano){mAudioP.currentTime=0;mAudioP.play();}
  if(mixBlobs.trumpet){mAudioT.currentTime=0;mAudioT.play();}
  setStatus('Playing mix…','ok');
  const check=()=>{
    if(!mixPlaying)return;
    if(mAudioP.ended && mAudioT.ended){mixPlaying=false;mStopAll.disabled=true;setStatus('Ready','ok');}
    else requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
}

function stopMixAll(){
  mixPlaying=false;
  mAudioP.pause();mAudioP.currentTime=0;
  mAudioT.pause();mAudioT.currentTime=0;
  mStopAll.disabled=true;
  setStatus('Ready','ok');
}

// ── Start ─────────────────────────────────────────
startBtn.addEventListener('click',async()=>{
  startBtn.disabled=true; startBtn.textContent='Initializing…';
  sStatus.textContent='Starting audio context…';
  try { await init(); splash.classList.add('gone'); app.classList.add('show'); }
  catch(e){ console.error(e); sStatus.textContent='Error: '+e.message; startBtn.textContent='Retry'; startBtn.disabled=false; }
});

})();
