#!/usr/bin/env node
/* One copy of the full-screen chip, written into every game.
 *
 * Same arrangement as the zoom guard and the launcher: these pages fetch
 * nothing, so shared code is copied rather than linked, and copies drift. This
 * writes shared/fullscreen.js into each page between its markers, just after
 * the launcher's (the chip sits in a row with that link), and with --check
 * fails instead of writing, so CI can hold every copy to the one source.
 *
 * OWN are the games that already had a full-screen button of their own, laid
 * out for them. Their copy is marked data-own="1" and shows the chip only on an
 * iPhone, where no button can do it and the chip says how instead.
 *
 *   node tools/sync-fullscreen.js            write
 *   node tools/sync-fullscreen.js --check    verify only
 */
'use strict';
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
const SRC=path.join(ROOT,'shared','fullscreen.js');
const PAGES=['archon/index.html','aztec/index.html','bards-tale/index.html',
  'choplifter/index.html','drol/index.html','galaga/index.html',
  'lode-runner/index.html','tapped/index.html','wolfenstein/index.html',
  'law-of-the-west/page.html','law-of-the-west/index.html'];
const OWN=['archon','aztec','choplifter','drol','lode-runner','law-of-the-west'];
/* the eight built the same way, #wrap > #status, #stage, #pads, which get the
 * game mode: Archon and Law of the West have full game screens of their own */
const FIT=['aztec','bards-tale','choplifter','drol','galaga','lode-runner','tapped','wolfenstein'];
/* held sideways on a touch screen: which part of the pads goes on the left and
 * which on the right, top to bottom */
const SIDE={
  aztec:'L:#pads .dpad,.soundrow|R:#pads .acts',
  drol:'L:#pads .dpad,.soundrow|R:#pads .acts',
  'lode-runner':'L:#pads .dpad,.soundrow|R:#pads .acts',
  choplifter:'L:#stick,.soundrow|R:#pads .acts',
  galaga:'L:#stick|R:#pads .tops,#bf',
  tapped:'L:#pads .stickwrap|R:#pads .right',
  wolfenstein:'L:#pads .stickwrap|R:#pads .right',
  /* no stick: the party, the log and the commands in a column beside it */
  'bards-tale':'R:#roster,#log,#pads'};
/* games whose buttons are needed without a touch screen too */
const KEEP_PADS=['bards-tale'];
const START='<!-- fullscreen:start -->', END='<!-- fullscreen:end -->';
const AFTER='<!-- launcher:end -->';
const check=process.argv.indexOf('--check')>0;

/* The comments stay in shared/fullscreen.js: Law of the West holds its page
 * to 320 KB, and the explanation does not need to travel with every copy. Each
 * copy points back to it. (The source has no comment marker inside a string,
 * which is what makes stripping them this simply safe.) */
const prep=src=>'/* full screen: shared/fullscreen.js, written in by tools/sync-fullscreen.js */\n'+
  src.replace(/\/\*[\s\S]*?\*\//g,'')   /* every comment: they are all read in the source */
     .replace(/^[ \t]+/gm,'')              /* and the indentation */
     .replace(/\n{2,}/g,'\n').trim();
const raw=fs.readFileSync(SRC,'utf8');
const full=prep(raw);
/* the game mode, only where it is used: the parts between its markers are
 * left out of the pages that have a full game screen of their own */
const lean=prep(raw.replace(/\/\*@fit\*\/[\s\S]*?\/\*@\/fit\*\//g,''));
const blockFor=rel=>START+'\n<script data-shared="fullscreen"'+
  (OWN.includes(rel.split('/')[0])?' data-own="1"':'')+
  (FIT.includes(rel.split('/')[0])?' data-fit="1"':'')+
  (SIDE[rel.split('/')[0]]?' data-side="'+SIDE[rel.split('/')[0]]+'"':'')+
  (KEEP_PADS.includes(rel.split('/')[0])?' data-pads="keep"':'')+'>\n'+(FIT.includes(rel.split('/')[0])?full:lean)+'\n</script>\n'+END;

let bad=[], wrote=[];
for(const rel of PAGES){
  const f=path.join(ROOT,rel);
  if(!fs.existsSync(f)){bad.push(rel+': no such page');continue;}
  const html=fs.readFileSync(f,'utf8'), block=blockFor(rel);
  const i=html.indexOf(START), j=html.indexOf(END);
  let next;
  if(i>=0&&j>i)next=html.slice(0,i)+block+html.slice(j+END.length);
  else{
    const a=html.indexOf(AFTER);
    if(a>=0)next=html.slice(0,a+AFTER.length)+'\n'+block+html.slice(a+AFTER.length);
    else{
      const k=html.lastIndexOf('</body>');
      if(k<0){bad.push(rel+': no </body> to put it before');continue;}
      next=html.slice(0,k)+block+'\n'+html.slice(k);
    }
  }
  if(next===html)continue;
  if(check)bad.push(rel+': the full-screen chip is missing or out of date');
  else {fs.writeFileSync(f,next); wrote.push(rel);}
}
if(check){
  if(bad.length){console.error(bad.map(b=>'  '+b).join('\n'));process.exit(1);}
  console.log('every page carries the current full-screen chip');
}else{
  console.log(wrote.length?('updated:\n'+wrote.map(w=>'  '+w).join('\n'))
                          :'every page was already current');
  if(bad.length){console.error(bad.join('\n'));process.exit(1);}
}
