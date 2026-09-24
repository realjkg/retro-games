#!/usr/bin/env node
/* The guards' lines, as a WAV file, for ears: every voice and mood the game
 * uses, one after another, with a breath between. No browser needed; the
 * page's own synthesiser is run under the test harness.
 *
 *   node tools/voices.js out.wav
 */
'use strict';
const fs=require('fs'),path=require('path');
const {runtime}=require('../tests/harness.cjs');
const OUT=path.resolve(process.argv[2]||'voices.wav');
const r=runtime(1);
const LINES=[
  ['Halt! Kommen Sie!','bark',"voiceFor('guard',1.15,1)"],
  ['Was ist los?','ask',"voiceFor('guard',0.95,1)"],
  ['Pass!','bark',"voiceFor('guard',0.85,1.05)"],
  ['Achtung!','bark',"voiceFor('guard',1.05,1.1)"],
  ['Kommen Sie hier!','bark',"voiceFor('guard',0.9,1)"],
  ['Halt! SS!','bark',"voiceFor('ss',0.9,1)"],
  ['Halt. Sie da. Pass!','cold',"voiceFor('ss',0.9,0.95)"],
  ['Ihren Pass, bitte. Ihre Papiere.','cold',"voiceFor('ss',1.1,1)"],
  ['Wohin gehen Sie?','ask',"voiceFor('guard',1,1)"],
  ['Sie haben einen komischen Akzent. Woher kommen Sie?','suspicious',"voiceFor('ss',1,1)"],
  ['Die Parole!','bark',"voiceFor('ss',0.95,1)"],
  ['Gut. Weitermachen.','dismiss',"voiceFor('ss',1,1)"],
  ['Kamerad! Nicht schießen!','plead',"voiceFor('guard',1.1,1)"],
  ['Schweinehund!','bark',"voiceFor('guard',0.9,1)"],
  ['Spion! Alarm!','scream',"voiceFor('ss',1,1)"],
  /* and a stop in the corridor, the way the game plays it */
  ['Halt. Sie da. Pass!','cold',"voiceFor('ss',0.95,1)"],
  ['Wohin gehen Sie?','ask',"voiceFor('ss',0.95,1)"],
  ['Hmm... Seltsam.','suspicious',"voiceFor('ss',0.95,1)"],
  ['Die Parole!','bark',"voiceFor('ss',0.95,1)"],
  ['Gut. Weitermachen.','dismiss',"voiceFor('ss',0.95,1)"]
];
const SR=22050,parts=[];
for(const [t,m,v] of LINES){
  const pcm=r.j(`Array.from(synthLine(${JSON.stringify(t)},'${m}',${v}))`);
  /* the same sample-and-hold the page plays it with */
  for(const x of pcm){parts.push(x,x);}
  for(let k=0;k<SR*0.45;k++)parts.push(0);
}
const data=Buffer.alloc(parts.length*2);
parts.forEach((x,i)=>data.writeInt16LE(Math.max(-32767,Math.min(32767,Math.round(x*0.8*32767))),i*2));
const h=Buffer.alloc(44);
h.write('RIFF',0);h.writeUInt32LE(36+data.length,4);h.write('WAVE',8);h.write('fmt ',12);
h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(SR,24);
h.writeUInt32LE(SR*2,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(data.length,40);
fs.writeFileSync(OUT,Buffer.concat([h,data]));
console.log('wrote '+OUT+' ('+(parts.length/SR).toFixed(1)+'s, '+LINES.length+' lines)');
