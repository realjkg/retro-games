#!/usr/bin/env node
/* One copy of the zoom guard, written into every game.
 *
 * Each game here is a single self-contained page, which is the point of them:
 * they run from a file:// URL with nothing fetched. That means shared code has
 * to be copied rather than linked, and copies drift. This writes
 * shared/no-zoom.js into each page between its markers and, with --check,
 * fails instead of writing, so CI can hold every copy to the one source.
 *
 *   node tools/sync-nozoom.js            write
 *   node tools/sync-nozoom.js --check    verify only
 */
'use strict';
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
const SRC=path.join(ROOT,'shared','no-zoom.js');
/* law-of-the-west is assembled, so its copy goes into the source page; its
 * built index.html is refreshed by that game's own assemble step. */
const PAGES=['archon/index.html','aztec/index.html','choplifter/index.html',
  'bards-tale/index.html','drol/index.html','galaga/index.html',
  'lode-runner/index.html','tapped/index.html','law-of-the-west/page.html'];
const START='<!-- no-zoom:start -->', END='<!-- no-zoom:end -->';
const check=process.argv.indexOf('--check')>0;

const body=fs.readFileSync(SRC,'utf8').trimEnd();
const block=START+'\n<script data-shared="no-zoom">\n'+body+'\n</script>\n'+END;

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
  if(check)bad.push(rel+': the zoom guard is missing or out of date');
  else {fs.writeFileSync(f,next); wrote.push(rel);}
}
if(check){
  if(bad.length){console.error(bad.map(b=>'  '+b).join('\n'));process.exit(1);}
  console.log('every page carries the current zoom guard');
}else{
  console.log(wrote.length?('updated:\n'+wrote.map(w=>'  '+w).join('\n'))
                          :'every page was already current');
  if(bad.length){console.error(bad.join('\n'));process.exit(1);}
}
