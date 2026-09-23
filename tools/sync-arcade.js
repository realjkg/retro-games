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
/* The pages that use it. A game is added here when it is wired, not before:
 * this is eighteen kilobytes and it is copied into every page on the list, so
 * a page that never calls Arcade should not be carrying it.
 *
 * law-of-the-west is the reason that rule is written down. It has no score to
 * put on a table, it is the largest page here, and its assemble step holds it
 * to a hard size budget which this pushed it straight through. Wire it and it
 * goes back on the list — and whoever does will have to find the bytes.
 *
 * tapped is off the list for the opposite reason: it arrived with a high-score
 * table, a three-letter picker and resume slots of its own, written out in the
 * page rather than taken from here. It is not missing the feature, it is
 * carrying a second copy of it, and folding it onto this module is a change to
 * that game rather than a line on this list. */
const PAGES=['archon/index.html','aztec/index.html','bards-tale/index.html',
  'choplifter/index.html','drol/index.html','galaga/index.html',
  'lode-runner/index.html'];
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
