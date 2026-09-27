#!/usr/bin/env node
/* Every clip in the page, as the game plays it, into one WAV to listen to:
 * the first guard voice, the deeper one, then the SS, each line at the
 * lowest and the highest pitch a man of that voice plays it at. Needs
 * nothing but the page.
 *
 *   node tools/listen.js out.wav
 */
'use strict';
const fs=require('fs'),path=require('path');
const {runtime}=require('../tests/harness.cjs');
const OUT=path.resolve(process.argv[2]||'voices.wav');
const r=runtime(1),SR=24000,parts=[];
const range={g1:[0.98,1.04],g2:[0.92,0.98],ss:[0.9,1.0]};
for(const kind of ['g1','g2','ss']){
  for(const text of r.j(`Object.keys(CLIPS.v.${kind})`)){
    const pcm=r.j(`Array.from(decodeClip(CLIPS.v.${kind}[${JSON.stringify(text)}]))`);
    for(const rate of range[kind]){
      /* held four times, as the page does, then played at the man's rate */
      const held=[];for(const v of pcm)held.push(v,v,v,v);
      for(let t=0;t<held.length/rate;t++)parts.push(held[Math.floor(t*rate)]||0);
      for(let k=0;k<SR*0.35;k++)parts.push(0);
    }
  }
  for(let k=0;k<SR*1.2;k++)parts.push(0);
}
const data=Buffer.alloc(parts.length*2);
parts.forEach((x,i)=>data.writeInt16LE(Math.max(-32767,Math.min(32767,Math.round(x*0.7*32767))),i*2));
const h=Buffer.alloc(44);
h.write('RIFF',0);h.writeUInt32LE(36+data.length,4);h.write('WAVE',8);h.write('fmt ',12);
h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(SR,24);
h.writeUInt32LE(SR*2,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(data.length,40);
fs.writeFileSync(OUT,Buffer.concat([h,data]));
console.log('wrote '+OUT+' ('+(parts.length/SR).toFixed(0)+'s)');
