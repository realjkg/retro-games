#!/usr/bin/env node
/* One copy of the on-screen joystick, written into every game that flies one.
 *
 * Same arrangement as the zoom guard, the coin-op module and the launcher
 * beside it: these pages fetch nothing, so shared code is copied rather than
 * linked, and copies drift. This writes shared/stick.js into each page between
 * its markers and, with --check, fails instead of writing.
 *
 * The block goes in at the top of the body rather than the bottom, because the
 * game's own script calls Stick.make() as it wires its controls and a module
 * that arrives afterwards is a ReferenceError.
 *
 * archon, choplifter, galaga and tapped are not on this list and it is not an
 * oversight: each of them shipped with a stick of its own, written into the
 * page, and three of those are not this one - galaga's runs on one axis behind
 * a gate, tapped's is a ball-top that leans, archon's is eight-way with a
 * repeat and there are two of them, one per player. Archon's is already what
 * the game hands a player by default; the others are the only control their
 * game has. Folding them onto this module is a change to four working games
 * with their own tests around the stick, and it is worth doing on its own
 * rather than buried in a rollout to five others.
 *
 *   node tools/sync-stick.js            write
 *   node tools/sync-stick.js --check    verify only
 */
'use strict';
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
const SRC=path.join(ROOT,'shared','stick.js');
const PAGES=['aztec/index.html','bards-tale/index.html',
  'drol/index.html','lode-runner/index.html',
  'law-of-the-west/page.html'];
const START='<!-- stick:start -->', END='<!-- stick:end -->';
const check=process.argv.indexOf('--check')>0;

const body=fs.readFileSync(SRC,'utf8').trimEnd();
const block=START+'\n<script data-shared="stick">\n'+body+'\n</script>\n'+END;

let bad=[], wrote=[];
for(const rel of PAGES){
  const f=path.join(ROOT,rel);
  if(!fs.existsSync(f)){bad.push(rel+': no such page');continue;}
  const html=fs.readFileSync(f,'utf8');
  const i=html.indexOf(START), j=html.indexOf(END);
  let next;
  if(i>=0&&j>i)next=html.slice(0,i)+block+html.slice(j+END.length);
  else{
    const k=html.indexOf('<body');
    if(k<0){bad.push(rel+': no <body> to put it after');continue;}
    const gt=html.indexOf('>',k);
    if(gt<0){bad.push(rel+': no <body> to put it after');continue;}
    next=html.slice(0,gt+1)+'\n'+block+html.slice(gt+1);
  }
  if(next===html)continue;
  if(check)bad.push(rel+': the joystick is missing or out of date');
  else {fs.writeFileSync(f,next); wrote.push(rel);}
}
if(check){
  if(bad.length){console.error(bad.map(b=>'  '+b).join('\n'));process.exit(1);}
  console.log('every page carries the current joystick');
}else{
  console.log(wrote.length?('updated:\n'+wrote.map(w=>'  '+w).join('\n'))
                          :'every page was already current');
  if(bad.length){console.error(bad.join('\n'));process.exit(1);}
}
