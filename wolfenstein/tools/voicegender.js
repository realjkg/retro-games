/* Is it a man's voice? Measured, not assumed.
 *
 * The fundamental of voiced speech, found by YIN (de Cheveigné & Kawahara,
 * 2002): the cumulative-mean-normalised difference function, whose first dip
 * below a threshold is the period. Unlike plain autocorrelation it does not
 * jump an octave up on a voice with a strong second harmonic, which is the
 * mistake an earlier pitch check in this game made.
 *
 * An adult man's speaking voice centres around 85-155 Hz and a woman's
 * around 165-255 Hz, and they overlap. What is decided here (below) is on
 * the median of the voiced frames, and is checked in tests/voices.test.cjs
 * against recordings of men and women before it is trusted on anything the
 * game plays.
 */
'use strict';
function wavToFloat(buf){
  const b=Buffer.isBuffer(buf)?buf:Buffer.from(buf);
  if(b.toString('ascii',0,4)!=='RIFF')throw new Error('not a wav');
  let off=12,fmt=null,data=null;
  while(off+8<=b.length){
    const id=b.toString('ascii',off,off+4),sz=b.readUInt32LE(off+4);
    if(id==='fmt ')fmt={ch:b.readUInt16LE(off+10),sr:b.readUInt32LE(off+12),bits:b.readUInt16LE(off+22)};
    if(id==='data'){data=[off+8,Math.min(sz,b.length-off-8)];break;}
    off+=8+sz+(sz&1);
  }
  const [d0,dn]=data,bps=fmt.bits/8,n=Math.floor(dn/bps/fmt.ch),x=new Float32Array(n);
  for(let i=0;i<n;i++){const p=d0+i*bps*fmt.ch;
    x[i]=fmt.bits===16?b.readInt16LE(p)/32768:fmt.bits===8?(b.readUInt8(p)-128)/128:b.readInt32LE(p)/2147483648;}
  return{sr:fmt.sr,x};
}
/* to 8 kHz, averaging, so every voice is measured on the same footing */
function to8k(x,sr){
  if(sr===8000)return x;
  const r=sr/8000,n=Math.floor(x.length/r),y=new Float32Array(n);
  for(let i=0;i<n;i++){const a=Math.floor(i*r),b=Math.max(a+1,Math.floor((i+1)*r));let s=0;for(let k=a;k<b;k++)s+=x[k];y[i]=s/(b-a);}
  return y;
}
/* YIN, frame by frame: the fundamental of every voiced 40 ms frame */
function yin(x,sr,opt){
  opt=opt||{};const lo=opt.lo||60,hi=opt.hi||400,th=opt.th||0.2;
  /* 30 ms: a barked HALT! falls from 120 to 80 Hz in a fifth of a second,
     and a longer window smears it past recognising */
  const W=Math.round(sr*0.03),hop=Math.round(sr*0.01),tMin=Math.floor(sr/hi),tMax=Math.ceil(sr/lo);
  let peak=0;for(const v of x)peak=Math.max(peak,Math.abs(v));
  const out=[],d=new Float32Array(tMax+1);
  for(let a=0;a+W+tMax<x.length;a+=hop){
    let e=0;for(let k=a;k<a+W;k++)e+=x[k]*x[k];
    /* silence: a gate well under the loudest moment. The first version gated
       at 8% of the peak, and on a one-word recording threw away nearly every
       voiced frame of five of six men */
    if(Math.sqrt(e/W)<peak*0.03)continue;
    for(let t=1;t<=tMax;t++){let s=0;for(let k=a;k<a+W;k++){const q=x[k]-x[k+t];s+=q*q;}d[t]=s;}
    let run=0,tau=-1;
    for(let t=1;t<=tMax;t++){run+=d[t];const c=d[t]*t/(run||1);d[t]=c;}
    for(let t=tMin;t<=tMax;t++){if(d[t]<th){while(t+1<=tMax&&d[t+1]<d[t])t++;tau=t;break;}}
    /* no dip under the threshold: the deepest dip, as the YIN paper does,
       if it is still plainly periodic and the frame is not quiet */
    if(tau<0&&Math.sqrt(e/W)>=peak*0.05){let mn=0.45;for(let t=tMin;t<=tMax;t++)if(d[t]<mn){mn=d[t];tau=t;}}
    if(tau<0)continue;
    /* parabolic interpolation of the dip */
    const a1=d[tau-1],b1=d[tau],c1=d[tau+1]||b1,den=a1+c1-2*b1;
    const tt=den?tau+0.5*(a1-c1)/den:tau;
    out.push(sr/tt);
  }
  return out;
}
const median=a=>{if(!a.length)return NaN;const b=a.slice().sort((p,q)=>p-q);return b[b.length>>1];};
/* What pitch can and cannot say, measured on tests/voices/:
 *
 *   the real woman (LJSpeech) speaks at 235 Hz, and eSpeak's five labelled
 *   women from 166 to about 200;
 *   six real men from 102 to 164 Hz, and eSpeak's seven labelled men from
 *   89 to 101.
 *
 * A deep woman and a high man overlap: eSpeak's deepest woman (166, on the
 * excerpt kept here) and the highest real man (164) are two hertz apart,
 * and an earlier version of this file, drawing one line at 178, called two
 * of eSpeak's women men. So there is no single line. There is a bar: under MAN_MAX is a man's voice,
 * with every woman measured well above it, and everything the game plays
 * is held under it. Over it, pitch alone cannot tell. */
const MAN_MAX=150,MAN_TOP=170;
function judge(x,sr){
  const f=yin(to8k(x,sr),8000),f0=median(f);
  return{f0,voiced:f.length,man:f.length>=3&&f0<MAN_MAX};
}
module.exports={wavToFloat,to8k,yin,median,judge,MAN_MAX,MAN_TOP};
