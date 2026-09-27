#!/usr/bin/env node
/* Is the title screen playing Oh! Susanna?
 *
 * Two questions, because they fail in different ways.
 *
 * 1. Is the TUNE the song? The melody is checked against Stephen Foster's
 *    1848 tune written as scale degrees. A table full of plausible notes is
 *    not the song, and only the degrees can tell you which you have.
 * 2. Does the SYNTH play it? The rendered wav is listened to note by note -
 *    the strongest partial in the lead voice's range, turned back into a
 *    degree. Reading the table back proves only that somebody typed what they
 *    typed; the thing a player hears is the audio.
 *
 *   node tools/render-sounds.js --out /tmp/a --only title --combined ""
 *   node tools/hear-title.js /tmp/a/01-title.wav
 *
 * With no wav it checks the tune alone, which is the half that needs no
 * renderer and so can run anywhere.
 */
'use strict';
const fs=require('fs'),vm=require('node:vm'),path=require('path');

/* Oh! Susanna, in scale degrees. Verse: "I come from Alabama with a banjo on
 * my knee". Chorus: "Oh Susanna, don't you cry for me". Semitones from the
 * tonic, so the key can move without the check caring. */
const VERSE=[0,2,4,4,7,7,9,7,4,0,2,4,2];
const CHORUS=[9,9,7,4,0,2,4,2,0];   // already comes home on the last note
/* line, line, chorus, line: the first line half-closes on the second degree
 * and every other phrase comes home to the tonic. */
const SONG=[].concat(VERSE,[2],VERSE,[0],CHORUS,VERSE,[0]);

const src=fs.readFileSync(path.join(__dirname,'..','sid-audio.js'),'utf8');
const head=src.slice(0,src.indexOf('const GATE='));
const box={};vm.createContext(box);vm.runInContext(head+'\nthis.SOUNDS=SOUNDS;',box);
const lead=(box.SOUNDS.title||[])[0];
let bad=0;
if(!lead||!lead.seq){console.log('  BAD  the title has no melody at all');process.exit(1);}
const degs=lead.seq.map(s=>((s[0]%12)+12)%12);
const isSong=degs.length===SONG.length&&degs.every((v,i)=>v===SONG[i]);
console.log((isSong?'  ok   ':'  BAD  ')+'the tune is the song: '+degs.length+' notes');
if(!isSong){
  bad++;
  console.log('       want '+SONG.join(' '));
  console.log('       have '+degs.join(' '));
}

const wav=process.argv[2];
if(!wav){console.log('  --   no wav given, so the synthesis was not listened to');
  process.exit(bad?1:0);}
const W=fs.readFileSync(wav);
let p=12,fmt=null,off=0,len=0;
while(p<W.length-8){
  const id=W.toString('ascii',p,p+4), sz=W.readUInt32LE(p+4);
  if(id==='fmt ')fmt={ch:W.readUInt16LE(p+10),sr:W.readUInt32LE(p+12)};
  if(id==='data'){off=p+8;len=sz;break;}
  p+=8+sz+(sz&1);
}
const SR=fmt.sr, CH=fmt.ch, N=Math.floor(len/(2*CH));
const x=new Float64Array(N);
for(let i=0;i<N;i++)x[i]=W.readInt16LE(off+i*2*CH)/32768;
const f0=lead.f0;
const cand=[];for(let st=-6;st<=20;st++)cand.push({st:st,f:f0*Math.pow(2,st/12)});
const power=(a,b,f)=>{let re=0,im=0;
  for(let i=a;i<b;i++){const t=(i-a)/SR,w=0.5-0.5*Math.cos(2*Math.PI*(i-a)/(b-a));
    re+=x[i]*w*Math.cos(2*Math.PI*f*t); im+=x[i]*w*Math.sin(2*Math.PI*f*t);}
  return Math.hypot(re,im)/(b-a);};
const heard=[],want=[],when=[];
for(const [deg,at,dur] of lead.seq){
  const a=Math.floor((at+dur*0.25)*SR), b=Math.floor((at+dur*0.75)*SR);
  if(b-a<200||b>N)continue;
  let best=null;
  for(const c of cand){const pw=power(a,b,c.f); if(!best||pw>best.pw)best={st:c.st,pw:pw};}
  heard.push(((best.st%12)+12)%12); want.push(((deg%12)+12)%12); when.push(at);
}
const wrong=heard.map((v,i)=>v===want[i]?null:i).filter(i=>i!==null);
if(wrong.length)bad++;
console.log((wrong.length?'  BAD  ':'  ok   ')+'the synth plays it: '+heard.length
  +' notes listened to, '+wrong.length+' wrong'
  +(wrong.length?' at '+wrong.slice(0,6).map(i=>when[i]+'s').join(', '):''));
console.log('\n'+(bad?bad+' thing(s) wrong with the title music':'The title screen plays Oh! Susanna.'));
process.exit(bad?1:0);
