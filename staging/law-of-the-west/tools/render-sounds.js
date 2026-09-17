#!/usr/bin/env node
/* Offline auditioning renderer for sid-audio.js.
 *
 * It does not replace the runtime synthesis: it mirrors it on a plain sample
 * buffer so the SOUNDS table can be listened to as wav files without a
 * browser. The SOUNDS data is read from sid-audio.js itself, so the two can
 * never drift apart. Node's sawtooth is naive where Web Audio's is
 * band-limited, so a render is a touch brighter than the browser; the
 * envelopes, sweeps, quantisation and timing are the same.
 *
 *   node tools/render-sounds.js [--out audio] [--rate 44100] [--only a,b] [--gap 0.33]
 *                              [--combined 00-all-sounds.wav]
 */
'use strict';
const fs=require('fs'), path=require('path'), vm=require('node:vm');

const args=process.argv.slice(2);
const opt=(name,dflt)=>{const i=args.indexOf('--'+name);return i<0?dflt:args[i+1];};
const OUT=path.resolve(opt('out','audio'));
const SR=+opt('rate',44100);
const ONLY=opt('only','')?opt('only').split(','):null;
const COMBINED=opt('combined','00-all-sounds.wav');
const GAP=+opt('gap',0.33);   // the gap the reference audition wav uses

/* ---- the table, straight out of the runtime file ---- */
const src=fs.readFileSync(path.join(__dirname,'..','sid-audio.js'),'utf8');
const head=src.slice(0,src.indexOf('const GATE='));
const box={};vm.createContext(box);vm.runInContext(head+'\nthis.SOUNDS=SOUNDS;',box);
const SOUNDS=box.SOUNDS;

const SID_CLK=985248, FRAME=1/50;
const sidF=f=>Math.round(f*16777216/SID_CLK)*SID_CLK/16777216;
const sid4=v=>Math.round(Math.max(0,Math.min(1,v))*15)/15;
const sidCut=c=>Math.round(Math.max(30,Math.min(12000,c))/12000*2047)/2047*12000;
const BUS=0.3;

/* SID's 23-bit LFSR, sampled and held at the same rate the runtime uses */
function noiseTable(seconds){
  const n=(SR*seconds)|0, d=new Float32Array(n);
  let r=0x7ffff8, held=1, acc=0; const inc=(SID_CLK/256)/SR;
  for(let i=0;i<n;i++){ acc+=inc;
    while(acc>=1){ acc-=1;
      const fb=((r>>22)^(r>>17))&1; r=((r<<1)|fb)&0x7fffff; held=(r&0x100000)?1:-1; }
    d[i]=held; }
  return d;
}
const NOISE=noiseTable(2);

const saw=p=>2*(p-Math.floor(p+0.5));
const tri=p=>{const x=p-Math.floor(p);
  return x<0.25?4*x:(x<0.75?2-4*x:4*x-4);};

/* one lowpass biquad, coefficients recomputed whenever the cutoff steps */
function Lowpass(q){
  let b0=1,b1=0,b2=0,a1=0,a2=0,x1=0,x2=0,y1=0,y2=0,last=-1;
  return {
    set(f){ if(f===last)return; last=f;
      const w=2*Math.PI*Math.min(f,SR*0.45)/SR, cs=Math.cos(w), sn=Math.sin(w);
      const al=sn/(2*Math.max(0.5,q)), a0=1+al;
      b0=(1-cs)/2/a0; b1=(1-cs)/a0; b2=b0; a1=-2*cs/a0; a2=(1-al)/a0; },
    run(x){ const y=b0*x+b1*x1+b2*x2-a1*y1-a2*y2;
      x2=x1;x1=x;y2=y1;y1=y; return y; }
  };
}

/* the same step list the runtime builds: 50 Hz, held between frames */
function stepsFor(v,dur,mul){
  const n=Math.max(2,Math.round(dur/FRAME)), out=[];
  for(let k=0;k<=n;k++){ const u=k/n;
    out.push({ u,
      f:sidF((v.f1?v.f0*Math.pow(v.f1/v.f0,u):v.f0)*mul),
      pw:(v.pw==null?0.5:(v.pw1==null?v.pw:v.pw+(v.pw1-v.pw)*u)),
      cut:sidCut(v.cut1?v.cut*Math.pow(v.cut1/v.cut,u):(v.cut||8000)),
      g:sid4((v.vol==null?0.2:v.vol)*Math.pow(1-u,1.5)) }); }
  return out;
}

function renderVoice(v,buf,base){
  const notes=v.seq||[[0,0,v.dur]];
  for(const [st,ns,nd] of notes){
    const t0=base+(v.dly||0)+ns, dur=nd, mul=Math.pow(2,st/12);
    const steps=stepsFor(v,dur,mul);
    const i0=Math.round(t0*SR), len=Math.round(dur*SR);
    const flt=Lowpass(0.7+(v.res==null?4:v.res)*0.75);
    // a pulse is a saw minus the same saw delayed by pulsewidth/frequency
    const sawbuf=(v.w==='pulse')?new Float32Array(len+1):null;
    let ph=0, mph=0;
    for(let i=0;i<len;i++){
      const u=i/len, s=steps[Math.min(steps.length-1,Math.floor(u*(steps.length-1)))];
      const f=s.f, dt=1/SR;
      let x;
      if(v.w==='noise') x=NOISE[(i0+i)%NOISE.length];
      else if(v.w==='pulse'){ sawbuf[i]=saw(ph);
        const d=Math.min(0.049,Math.max(0.0001,s.pw/f)), back=Math.round(d*SR);
        x=sawbuf[i]-(i-back>=0?sawbuf[i-back]:0); }
      else if(v.w==='saw') x=saw(ph);
      else x=tri(ph);
      ph+=f*dt; if(ph>1e6)ph-=1e6;
      if(v.ring){ x*=tri(mph); mph+=sidF(f*v.ring)*dt; if(mph>1e6)mph-=1e6; }
      flt.set(s.cut);
      const y=flt.run(x)*s.g*BUS;
      const at=i0+i; if(at>=0&&at<buf.length)buf[at]+=y;
    }
  }
}
function lengthOf(list){
  let end=0;
  for(const v of list){
    const notes=v.seq||[[0,0,v.dur]];
    for(const [,ns,nd] of notes)end=Math.max(end,(v.dly||0)+ns+nd);
  }
  return end;
}
function render(name){
  const list=SOUNDS[name], dur=lengthOf(list)+0.05;
  const buf=new Float32Array(Math.ceil(dur*SR));
  list.forEach(v=>renderVoice(v,buf,0));
  return buf;
}
function wav(buf){
  const n=buf.length, out=Buffer.alloc(44+n*2);
  out.write('RIFF',0);out.writeUInt32LE(36+n*2,4);out.write('WAVE',8);
  out.write('fmt ',12);out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);
  out.writeUInt16LE(1,22);out.writeUInt32LE(SR,24);out.writeUInt32LE(SR*2,28);
  out.writeUInt16LE(2,32);out.writeUInt16LE(16,34);
  out.write('data',36);out.writeUInt32LE(n*2,40);
  for(let i=0;i<n;i++){
    const s=Math.max(-1,Math.min(1,buf[i]));
    out.writeInt16LE(Math.round(s*32767),44+i*2);
  }
  return out;
}
const stat=buf=>{
  let peak=0,bad=0,rms=0;
  for(const v of buf){ if(!Number.isFinite(v)){bad++;continue;}
    peak=Math.max(peak,Math.abs(v)); rms+=v*v; }
  return {peak,bad,rms:Math.sqrt(rms/Math.max(1,buf.length)),secs:buf.length/SR};
};

fs.mkdirSync(OUT,{recursive:true});
const names=Object.keys(SOUNDS).filter(n=>!ONLY||ONLY.includes(n));
const rows=[]; let total=0;
const parts=[];
names.forEach((name,i)=>{
  const buf=render(name), s=stat(buf);
  const file=String(i+1).padStart(2,'0')+'-'+name+'.wav';
  fs.writeFileSync(path.join(OUT,file),wav(buf));
  rows.push({name,secs:+s.secs.toFixed(2),peak:+s.peak.toFixed(3),rms:+s.rms.toFixed(4),nonFinite:s.bad});
  parts.push(buf); total+=buf.length+Math.round(GAP*SR);
});
const all=new Float32Array(total); let at=0;
parts.forEach(b=>{all.set(b,at);at+=b.length+Math.round(GAP*SR);});
fs.writeFileSync(path.join(OUT,COMBINED),wav(all));
const allStat=stat(all);
console.log(rows.map(r=>`${r.name.padEnd(11)} ${String(r.secs).padStart(5)}s  peak ${String(r.peak).padStart(5)}  rms ${r.rms}${r.nonFinite?'  NON-FINITE '+r.nonFinite:''}`).join('\n'));
console.log(`\n${rows.length} cues -> ${OUT}`);
console.log(`${COMBINED}  ${allStat.secs.toFixed(2)}s  peak ${allStat.peak.toFixed(3)}  non-finite ${allStat.bad}`);
const clipped=rows.filter(r=>r.peak>=0.999), silent=rows.filter(r=>r.peak<0.01);
if(clipped.length)console.log('clipping:',clipped.map(r=>r.name).join(', '));
if(silent.length)console.log('silent:',silent.map(r=>r.name).join(', '));
