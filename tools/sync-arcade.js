#!/usr/bin/env node
/* One copy of the coin-op bits, written into every game.
 *
 * Same arrangement as the zoom guard next door, and for the same reason: each
 * game here is a single self-contained page that runs from a file:// URL with
 * nothing fetched, so shared code has to be copied rather than linked, and
 * copies drift. This writes shared/arcade.js into each page between its
 * markers and, with --check, fails instead of writing, so CI can hold every
 * copy to the one source.
 *
 *   node tools/sync-arcade.js            write
 *   node tools/sync-arcade.js --check    verify only
 */
'use strict';
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
const SRC=path.join(ROOT,'shared','arcade.js');
/* law-of-the-west is assembled, so its copy goes into the source page; its
 * built index.html is refreshed by that game's own assemble step. */
const PAGES=['archon/index.html','aztec/index.html','bards-tale/index.html',
  'choplifter/index.html','drol/index.html','galaga/index.html',
  'lode-runner/index.html','law-of-the-west/page.html',
  'law-of-the-west/index.html'];
const START='<!-- arcade:start -->', END='<!-- arcade:end -->';
const check=process.argv.indexOf('--check')>0;

const body=fs.readFileSync(SRC,'utf8').trimEnd();
const block=START+'\n<script data-shared="arcade">\n'+body+'\n</script>\n'+END;

let bad=[], wrote=[];
for(const rel of PAGES){
  const f=path.join(ROOT,rel);
  if(!fs.existsSync(f)){bad.push(rel+': no such page');continue;}
  const html=fs.readFileSync(f,'utf8');
  const i=html.indexOf(START), j=html.indexOf(END);
  let next;
  if(i>=0&&j>i)next=html.slice(0,i)+block+html.slice(j+END.length);
  else{
    /* It has to be in the page before the game's own script runs, because the
     * game calls Arcade.init() at boot. So it goes at the top of the body
     * rather than at the bottom like the zoom guard. */
    const k=html.indexOf('<body');
    if(k<0){bad.push(rel+': no <body> to put it after');continue;}
    const gt=html.indexOf('>',k);
    if(gt<0){bad.push(rel+': malformed <body>');continue;}
    next=html.slice(0,gt+1)+'\n'+block+html.slice(gt+1);
  }
  if(next===html)continue;
  if(check)bad.push(rel+': the arcade module is missing or out of date');
  else {fs.writeFileSync(f,next); wrote.push(rel);}
}
if(check){
  if(bad.length){console.error(bad.map(b=>'  '+b).join('\n'));process.exit(1);}
  console.log('every page carries the current arcade module');
}else{
  console.log(wrote.length?('updated:\n'+wrote.map(w=>'  '+w).join('\n'))
                          :'every page was already current');
  if(bad.length){console.error(bad.join('\n'));process.exit(1);}
}
