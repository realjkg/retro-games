#!/usr/bin/env node
/* The men's voices: every line in the game's SPOKEN list, rendered once by
 * eSpeak NG (through meSpeak) in its male German voices, trimmed, brought
 * down to 6,000 samples a second and sixteen levels (the grain of a computer
 * speaker, as the 1981 game's digitised shouts had), and written into
 * index.html between its voices markers.
 *
 * eSpeak is GPL and is not part of this repository or the page: it is run
 * here, once, as a tool, and only what it says is kept. Install it to run
 * this, somewhere outside the repository:
 *
 *   npm i --prefix /some/dir mespeak
 *   MESPEAK=/some/dir/node_modules/mespeak node tools/render-voices.js
 *   MESPEAK=... node tools/render-voices.js --check   (fails if the page is stale)
 *   MESPEAK=... node tools/render-voices.js --verify  (the measure, on eSpeak's own
 *                                                      labelled men and women)
 *
 * Every voice here was chosen by measurement: tools/voicegender.js, checked
 * against real recordings of men and of a woman, calls each of eSpeak's
 * male variants a man and each female variant a woman, and the voices below
 * are male variants, pitched down, not up.
 */
'use strict';
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const {runtime}=require('../tests/harness.cjs');
const MESPEAK=process.env.MESPEAK;
if(!MESPEAK){console.error('set MESPEAK to an installed meSpeak (see the top of this file)');process.exit(2);}
const PAGE=path.join(__dirname,'..','index.html');
const check=process.argv.includes('--check');
const SR=6000;
/* the men: eSpeak variant and pitch (0-99, 50 is the variant's own) */
const VOICES={
  g1:{variant:'m3',pitch:46},     /* a guard, the higher of the two */
  g2:{variant:'m4',pitch:38},     /* a guard, deeper */
  g3:{variant:'m7',pitch:34},     /* a third guard, between them, another throat */
  ss:{variant:'m1',pitch:30},     /* the SS, at the bottom */
  ss2:{variant:'m2',pitch:20}     /* a second SS man, lower still */
};
/* the moods: pace (words a minute), and pitch and its range relative to the man's own */
const MOODS={
  bark:{speed:185,dp:6,range:70,amp:130},ask:{speed:165,dp:0,range:60,amp:110},
  cold:{speed:140,dp:-8,range:25,amp:100},suspicious:{speed:135,dp:-4,range:55,amp:100},
  dismiss:{speed:185,dp:0,range:40,amp:100},plead:{speed:180,dp:10,range:70,amp:110},
  scream:{speed:190,dp:14,range:80,amp:140},chat:{speed:170,dp:0,range:45,amp:90}
};
const ONE=`const m=require(${JSON.stringify(MESPEAK)});
m.loadConfig(require(${JSON.stringify(MESPEAK+'/src/mespeak_config.json')}));
m.loadVoice(require(${JSON.stringify(MESPEAK+'/voices/de.json')}));
const [t,o]=JSON.parse(process.argv[1]);process.stdout.write(Buffer.from(m.speak(t,Object.assign({rawdata:'array'},o))));`;
const V=require('./voicegender.js');
function render(text,voice,mood){
  const v=VOICES[voice],M=MOODS[mood];
  /* a one-word shout is drawn out, as it is when a man shouts it, and so
     there is enough of the voice in it to hear, and to measure, whose it is */
  const oneWord=text.replace(/[^A-Za-zÄÖÜäöüß ]/g,'').trim().split(/\s+/).length===1;
  const wav=execFileSync(process.execPath,['-e',ONE,JSON.stringify([text,
    {variant:v.variant,pitch:Math.max(0,Math.min(99,v.pitch+M.dp)),speed:oneWord?Math.min(M.speed,120):M.speed,amplitude:M.amp,wordgap:0}])],
    {stdio:['ignore','pipe','ignore'],maxBuffer:1<<26});
  const {sr,x}=V.wavToFloat(wav);
  /* to 6 kHz, averaging */
  const r=sr/SR,n=Math.floor(x.length/r),y=new Float32Array(n);
  for(let i=0;i<n;i++){const a=Math.floor(i*r),b=Math.max(a+1,Math.floor((i+1)*r));let s=0;for(let k=a;k<b;k++)s+=x[k];y[i]=s/(b-a);}
  /* trimmed of the silence either side */
  let pk=0;for(const q of y)pk=Math.max(pk,Math.abs(q));
  let a=0,b=y.length-1;while(a<b&&Math.abs(y[a])<pk*0.02)a++;while(b>a&&Math.abs(y[b])<pk*0.02)b--;
  return y.slice(Math.max(0,a-30),Math.min(y.length,b+60)).map(q=>q/(pk||1));
}
/* sixteen levels, companded so quiet sounds keep their shape: two to a byte */
function encode(y){
  const mu=15,codes=new Uint8Array(Math.ceil(y.length/2));
  for(let i=0;i<y.length;i++){
    const v=Math.max(-1,Math.min(1,y[i]*0.95));
    const c=Math.sign(v)*Math.log(1+mu*Math.abs(v))/Math.log(1+mu);
    const q=Math.max(0,Math.min(15,Math.round((c+1)*7.5)));
    codes[i>>1]|=i&1?q<<4:q;
  }
  return Buffer.from(codes).toString('base64')+'|'+y.length;
}
/* --verify: before anything is rendered, the measure is shown to call every
   one of eSpeak's own labelled voices right, male and female, on the lines
   the game says */
if(process.argv.includes('--verify')){
  const lines=['Halt! Kommen Sie!','Was ist los?','Achtung!','Wohin gehen Sie?','Ihren Pass, bitte.'];
  let bad=0;
  for(const variant of ['m1','m2','m3','m4','m5','m6','m7','f1','f2','f3','f4','f5']){
    const all=[];
    for(const l of lines){
      const wav=execFileSync(process.execPath,['-e',ONE,JSON.stringify([l,{variant}])],{stdio:['ignore','pipe','ignore'],maxBuffer:1<<26});
      const {sr,x}=V.wavToFloat(wav);all.push(...V.yin(V.to8k(x,sr),8000));
    }
    const f0=V.median(all),man=variant[0]==='m';
    /* a man under the top of men's voices; a woman clear above the bar */
    const ok=man?f0<V.MAN_TOP:f0>V.MAN_MAX+15;
    if(!ok)bad++;
    console.log(variant,man?'man  ':'woman','measured',Math.round(f0)+'Hz',ok?'as expected':'  WRONG');
  }
  process.exit(bad?1:0);
}
const r=runtime(1);
const SPOKEN=r.j('SPOKEN');
const clips={g1:{},g2:{},g3:{},ss:{},ss2:{}};
let n=0,secs=0;
for(const [text,mood,who] of SPOKEN){
  /* every guard voice has its own shouts and challenges (an order falls, a
     question rises: the mood gives each its own tune); for the questioning
     and the talk the others borrow the first's, played at their own pitch.
     The second SS man shouts in his own voice too */
  const shout=mood==='bark'||mood==='plead'||mood==='scream'||mood==='ask';
  const guards=shout?['g1','g2','g3']:['g1'];
  const sss=shout?['ss','ss2']:['ss'];
  const voices=who==='ss'?sss:who==='guard'?guards:guards.concat(sss);
  for(const v of voices){const y=render(text,v,mood);clips[v][text]=encode(y);n++;secs+=y.length/SR;}
  process.stdout.write('.');
}
const body='/* voices:start - written by tools/render-voices.js; do not edit by hand */\n'+
  'const CLIPS={sr:'+SR+',v:'+JSON.stringify(clips)+'};\n/* voices:end */';
const html=fs.readFileSync(PAGE,'utf8');
const i=html.indexOf('/* voices:start'),j=html.indexOf('/* voices:end */');
if(i<0||j<0){console.error('\nno voices markers in the page');process.exit(1);}
const next=html.slice(0,i)+body+html.slice(j+'/* voices:end */'.length);
console.log('\n'+n+' clips, '+secs.toFixed(1)+'s of speech, '+(body.length/1024).toFixed(0)+' KB in the page');
if(check){if(next!==html){console.error('the voices in the page are stale');process.exit(1);}console.log('the voices in the page are current');}
else{fs.writeFileSync(PAGE,next);console.log('wrote '+PAGE);}
