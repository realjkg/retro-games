#!/usr/bin/env node
/* One copy of the way back to the launcher, written into every game.
 *
 * Same arrangement as the zoom guard and the coin-op module beside it: these
 * pages fetch nothing, so shared code is copied rather than linked, and copies
 * drift. This writes shared/launcher.js into each page between its markers and,
 * with --check, fails instead of writing, so CI can hold every copy to the one
 * source.
 *
 * Every game is on this list. It is a link back to the collection, it is under
 * two kilobytes, and a game that cannot be got out of is the thing being fixed.
 *
 *   node tools/sync-launcher.js            write
 *   node tools/sync-launcher.js --check    verify only
 */
'use strict';
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
const SRC=path.join(ROOT,'shared','launcher.js');
const PAGES=['archon/index.html','aztec/index.html','bards-tale/index.html',
  'choplifter/index.html','drol/index.html','galaga/index.html',
  'lode-runner/index.html','law-of-the-west/page.html',
  'law-of-the-west/index.html'];
const START='<!-- launcher:start -->', END='<!-- launcher:end -->';
const check=process.argv.indexOf('--check')>0;

const body=fs.readFileSync(SRC,'utf8').trimEnd();
const block=START+'\n<script data-shared="launcher">\n'+body+'\n</script>\n'+END;

let bad=[], wrote=[];
for(const rel of PAGES){
  const f=path.join(ROOT,rel);
  if(!fs.existsSync(f)){bad.push(rel+': no such page');continue;}
  const html=fs.readFileSync(f,'utf8');
  const i=html.indexOf(START), j=html.indexOf(END);
  let next;
  if(i>=0&&j>i)next=html.slice(0,i)+block+html.slice(j+END.length);
  else{
    const k=html.lastIndexOf('</body>');
    if(k<0){bad.push(rel+': no </body> to put it before');continue;}
    next=html.slice(0,k)+block+'\n'+html.slice(k);
  }
  if(next===html)continue;
  if(check)bad.push(rel+': the launcher is missing or out of date');
  else {fs.writeFileSync(f,next); wrote.push(rel);}
}
if(check){
  if(bad.length){console.error(bad.map(b=>'  '+b).join('\n'));process.exit(1);}
  console.log('every page carries the current launcher');
}else{
  console.log(wrote.length?('updated:\n'+wrote.map(w=>'  '+w).join('\n'))
                          :'every page was already current');
  if(bad.length){console.error(bad.join('\n'));process.exit(1);}
}
