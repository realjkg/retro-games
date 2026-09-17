#!/usr/bin/env node
/* Drives the real sid-audio.js against a stubbed AudioContext and asserts that
 * every value it ever schedules is finite and in range — the audio half of the
 * test plan, runnable before the game exists.  node tools/check-audio.js      */
'use strict';
const fs=require('fs'), path=require('path'), vm=require('node:vm'), assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'..','sid-audio.js'),'utf8');

const bad=[], seen={nodes:0,params:0,sets:0};
function param(kind,{min=-Infinity,max=Infinity}={}){
  const rec=v=>{seen.sets++;
    if(!Number.isFinite(v))bad.push(kind+' set to non-finite '+v);
    else if(v<min||v>max)bad.push(kind+' set to out-of-range '+v);};
  seen.params++;
  return {get value(){return 0;},set value(v){rec(v);},
    setValueAtTime(v,t){rec(v);if(!Number.isFinite(t)||t<0)bad.push(kind+' scheduled at '+t);},
    linearRampToValueAtTime(v,t){rec(v);},exponentialRampToValueAtTime(v,t){
      rec(v); if(v===0)bad.push(kind+' exponential ramp to zero');},
    connect(){},cancelScheduledValues(){}};
}
const node=extra=>Object.assign({connect(){},disconnect(){},start(t){
  if(!Number.isFinite(t)||t<0)bad.push('start at '+t);},stop(t){
  if(!Number.isFinite(t)||t<0)bad.push('stop at '+t);}},extra);
class FakeCtx{
  constructor(){this.state='running';this.currentTime=1;this.sampleRate=44100;this.destination={};}
  createGain(){seen.nodes++;return node({gain:param('gain',{min:-1,max:4})});}
  createOscillator(){seen.nodes++;return node({type:'sine',
    frequency:param('frequency',{min:0,max:22050}),detune:param('detune')});}
  createBiquadFilter(){seen.nodes++;return node({type:'lowpass',
    frequency:param('filter frequency',{min:0,max:22050}),Q:param('Q',{min:0,max:64}),
    gain:param('filter gain')});}
  createDelay(){seen.nodes++;return node({delayTime:param('delayTime',{min:0,max:0.05})});}
  createBufferSource(){seen.nodes++;return node({buffer:null,loop:false});}
  createBuffer(ch,len,rate){seen.nodes++;const d=new Float32Array(len);
    return {getChannelData:()=>d,length:len,sampleRate:rate};}
  resume(){return Promise.resolve();}
}
const box={window:{AudioContext:FakeCtx},performance:{now:()=>Date.now()},console};
vm.createContext(box);vm.runInContext(src+'\nthis.SND=SND;this.SOUNDS=SOUNDS;',box);
const {SND,SOUNDS}=box;

const names=Object.keys(SOUNDS);
SND.unlock();
// every cue, twice each, plus a mute cycle, so the gate and toggle paths run too
for(let pass=0;pass<2;pass++)for(const n of names){
  assert.equal(typeof SND[n],'function','no SND.'+n+'() for the "'+n+'" cue');
  SND[n]();
}
SND.toggle(); names.forEach(n=>SND[n]()); SND.toggle();
assert.equal(SND.on,true);

// the table itself: shapes the renderer and the engine both rely on
const shape=[];
for(const [name,list] of Object.entries(SOUNDS)){
  if(!Array.isArray(list)||!list.length)shape.push(name+': no voices');
  for(const v of list){
    if(!['pulse','saw','tri','noise'].includes(v.w))shape.push(name+': bad waveform '+v.w);
    if(!(v.f0>0))shape.push(name+': f0 must be positive');
    if(v.seq){ if(!v.seq.every(s=>s.length===3&&s.every(Number.isFinite)))shape.push(name+': bad seq entry');
      let prev=-1; for(const [,st] of v.seq){if(st<prev)shape.push(name+': seq out of order');prev=st;} }
    else if(!(v.dur>0))shape.push(name+': needs dur or seq');
    if(v.vol!=null&&(v.vol<=0||v.vol>1))shape.push(name+': vol out of range '+v.vol);
    if(v.res!=null&&(v.res<0||v.res>15))shape.push(name+': res out of 0..15 '+v.res);
    if(v.cut!=null&&(v.cut<30||v.cut>12000))shape.push(name+': cut out of 30..12000 '+v.cut);
    if(v.pw!=null&&(v.pw<=0||v.pw>=1))shape.push(name+': pw out of range '+v.pw);
    if(v.ring!=null&&!(v.ring>0))shape.push(name+': ring must be positive');
  }
}
console.log('cues            '+names.length);
console.log('nodes built     '+seen.nodes);
console.log('params touched  '+seen.params);
console.log('values set      '+seen.sets);
console.log('table problems  '+(shape.length?'\n  '+shape.join('\n  '):'none'));
console.log('bad values      '+(bad.length?'\n  '+[...new Set(bad)].join('\n  '):'none'));
if(bad.length||shape.length)process.exit(1);
console.log('\nOK: every cue plays through the runtime with no non-finite, negative or out-of-range value.');
