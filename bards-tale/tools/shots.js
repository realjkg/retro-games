#!/usr/bin/env node
/* Moments of the game, written out as PNGs so a person can look at them.
 *   PW=$PWD/../node_modules/playwright-core node tools/shots.js out/
 */
'use strict';
const path=require('path'),fs=require('fs');
const pw=require(process.env.PW||'playwright-core');
const OUT=path.resolve(process.argv[2]||'shots');

const MOMENTS=[
  ['title',     ``],
  ['guild',     `demo();guild()`],
  ['street',    `demo();hideOverlay();P.depth=0;P.x=6;P.y=6;P.dir=0;paint()`],
  ['street-s',  `demo();hideOverlay();P.depth=0;P.x=12;P.y=6;P.dir=2;paint()`],
  ['plaza',     `demo();hideOverlay();P.depth=0;P.x=12;P.y=9;P.dir=2;paint()`],
  ['sewer-lit', `demo();hideOverlay();P.depth=1;P.x=1;P.y=1;P.dir=2;P.light=99;paint()`],
  ['sewer-dark',`demo();hideOverlay();P.depth=1;P.x=1;P.y=1;P.dir=2;P.light=0;paint()`],
  ['deadend',   `demo();hideOverlay();P.depth=1;P.x=1;P.y=1;P.dir=1;P.light=99;paint()`],
  ['fight1',    `demo();hideOverlay();P.depth=1;P.light=99;startFight(['kobold'],false);paint()`],
  ['fight3',    `demo();hideOverlay();P.depth=2;P.light=99;startFight(['skel','rat','gremlin'],false);paint()`],
  ['boss',      `demo();hideOverlay();P.depth=3;P.light=99;startFight(['madgod'],true);paint()`],
  ['order',     `demo();hideOverlay();P.depth=1;P.light=99;startFight(['zerk'],false);paint()`],
  ['sheet',     `demo();partyMenu();sheet(P.roster[0])`],
  ['garth',     `demo();garth()`]
];

(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const CAND=[process.env.CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium'].filter(Boolean);
  const exe=CAND.find(p=>{try{return fs.existsSync(p);}catch(e){return false;}});
  const b=await pw.chromium.launch(exe?{executablePath:exe}:{});
  const pg=await b.newPage({viewport:{width:540,height:980}});
  const errs=[];
  pg.on('pageerror',e=>errs.push(e.message));
  pg.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text());});
  await pg.goto('file://'+path.join(__dirname,'..','index.html'));
  await pg.addScriptTag({content:`
    window.demo=function(){
      newGame();
      const spec=[['Brann','dwarf','warrior'],['Tarna','human','paladin'],
        ['Rook','hobbit','rogue'],['Mab','elf','bard'],
        ['Orrin','gnome','magician'],['Ysolde','halfelf','conjurer']];
      P.roster=[];
      spec.forEach(([n,r,c])=>{
        let st,tries=0;
        do{st=rollStats(r);tries++;}while(!meetsReq(st,c)&&tries<400);
        STATS.forEach(k=>{const need=(CLASSES[c].req[k]||0);if(st[k]<need)st[k]=need;});
        const pc=mkChar(n,r,c,st);starterKit(pc);pc.lvl=3;
        pc.maxhp+=14;pc.hp=pc.maxhp;if(pc.maxsp){pc.maxsp+=10;pc.sp=pc.maxsp;}
        P.roster.push(pc);
      });
      P.gold=1200;paint();
    };
  `});
  for(const [name,code] of MOMENTS){
    if(code)await pg.evaluate(c=>{(0,eval)('(function(){'+c+'})()');},code);
    await pg.waitForTimeout(30);
    await (await pg.$('#wrap')).screenshot({path:path.join(OUT,name+'.png')});
    process.stdout.write(name+' ');
  }
  console.log('');
  if(errs.length){console.log('PAGE ERRORS:');errs.forEach(e=>console.log('  '+e));}
  else console.log('no page errors');
  await b.close();
  process.exit(errs.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
