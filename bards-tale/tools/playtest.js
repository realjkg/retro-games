#!/usr/bin/env node
/* What the screen actually does, scene by scene, in a real browser.
 *
 * tests/ reads the game's numbers. This reads the canvas, and asks the things a
 * state check cannot answer: does the corridor have depth in it, does turning
 * change the picture, is the monster whole and not half off the edge, is the
 * dark actually dark.
 *
 *   PW=$PWD/../node_modules/playwright-core node tools/playtest.js
 *
 * One row per scene. Read the rows.
 */
'use strict';
const path=require('path'),fs=require('fs');
const pw=require(process.env.PW||'playwright-core');

const SCENES=[
  ['street',     `at(0,1,6,1)`,                               {}],
  ['guild door', `at(0,6,6,0)`,                               {door:1}],
  ['plaza',      `at(0,12,9,2)`,                              {}],
  ['dead end',   `at(0,1,1,3)`,                               {}],
  ['sewer lit',  `at(1,1,1,2);P.light=99`,                    {}],
  ['sewer dark', `at(1,1,1,2);P.light=0`,                     {dark:1}],
  ['stairs up',  `at(1,1,1,1);P.light=99`,                    {}],
  ['fight x1',   `at(1,3,1,2);P.light=99;fight(['kobold'])`,  {art:1}],
  ['fight x2',   `at(2,1,1,2);P.light=99;fight(['skel','rat'])`,{art:1}],
  ['fight x3',   `at(2,1,1,2);P.light=99;fight(['skel','rat','gremlin'])`,{art:1}],
  ['the boss',   `at(3,1,1,2);P.light=99;fight(['madgod'],true)`,{art:1}]
];

const PRELUDE=`
window.demo=function(){
  newGame();
  [['Brann','dwarf','warrior'],['Tarna','human','paladin'],['Rook','hobbit','rogue'],
   ['Mab','elf','bard'],['Orrin','gnome','magician'],['Ysolde','halfelf','conjurer']]
  .forEach(function(s){
    var st=rollStats(s[1]);
    STATS.forEach(function(k){var n=CLASSES[s[2]].req[k]||0;if(st[k]<n)st[k]=n;});
    var pc=mkChar(s[0],s[1],s[2],st);starterKit(pc);pc.lvl=4;
    pc.maxhp+=30;pc.hp=pc.maxhp;if(pc.maxsp){pc.maxsp+=20;pc.sp=pc.maxsp;}
    P.roster.push(pc);
  });
  hideOverlay();closeFightbar();
};
window.at=function(depth,x,y,dir){
  if(!P.roster.length)demo();
  P.fight=null;closeFightbar();hideOverlay();
  P.depth=depth;P.x=x;P.y=y;P.dir=dir;paint();
};
window.fight=function(ids,boss){startFight(ids,!!boss);paint();};
window.shot=function(){
  return document.getElementById('c').getContext('2d').getImageData(6,6,244,152).data;};
window.diff=function(a,b){let n=0;for(let i=0;i<a.length;i+=4)
  if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>30)n++;return n;};
window.shades=function(){const d=shot(),s=new Set();
  for(let i=0;i<d.length;i+=4)s.add((d[i]<<16)|(d[i+1]<<8)|d[i+2]);return s.size;};
window.lume=function(){const d=shot();let t=0,n=0;
  for(let i=0;i<d.length;i+=4){t+=d[i]+d[i+1]+d[i+2];n++;}return t/n/3;};
/* the wood of a door, which is the only thing in the palette that colour */
window.doorpx=function(){const d=shot();let n=0;
  for(let i=0;i<d.length;i+=4){
    const r=d[i],g=d[i+1],b=d[i+2];
    if(r>40&&r<110&&g>18&&g<70&&b<44&&r>g*1.35&&g>=b)n++;}
  return n;};
window.artink=function(){
  const g2=document.getElementById('c').getContext('2d');
  const d=g2.getImageData(6,10,244,100).data;let n=0;
  for(let i=0;i<d.length;i+=4)if(d[i]+d[i+1]+d[i+2]>150)n++;return n;};
`;

function pad(s,n){return String(s)+' '.repeat(Math.max(0,n-String(s).length));}

(async()=>{
  const CAND=[process.env.CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
  const exe=CAND.find(p=>{try{return fs.existsSync(p);}catch(e){return false;}});
  const b=await pw.chromium.launch(exe?{executablePath:exe}:{});
  const pg=await b.newPage({viewport:{width:540,height:980}});
  const errs=[];
  pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto('file://'+path.join(__dirname,'..','index.html'));
  await pg.addScriptTag({content:PRELUDE});

  console.log('scene         depth      turns      answers     extra');
  console.log('-'.repeat(66));
  let bad=0,litLume=null;
  for(const[name,setup,want]of SCENES){
    const res=await pg.evaluate(({setup})=>{
      (0,eval)('(function(){'+setup+'})()');
      /* paint after the setup, not during it: a scene that sets the light and
         then reads a canvas painted before it measured the scene before. */
      paint();
      const a=shot();
      const sh=shades();
      const l=lume();
      const door=doorpx();
      const ink=artink();
      /* turning has to change the picture: a view that does not answer the
         controls is the oldest bug there is in a game like this */
      const d0=P.dir;turn(1);const t=diff(a,shot());turn(-1);
      /* and forward has to do something, even if what it does is say 'a wall' */
      let ans='n/a';
      if(!P.fight){
        const x0=P.x,y0=P.y,n0=logLines.length;
        step();
        ans=(P.x!==x0||P.y!==y0)?'moved':(logLines.length>n0?'a wall':'nothing');
        P.x=x0;P.y=y0;P.fight=null;closeFightbar();hideOverlay();paint();
      }
      return{sh,l:Math.round(l*10)/10,door,ink,t,ans};
    },{setup});
    if(!want.dark&&litLume===null&&name==='sewer lit')litLume=res.l;
    const cells=[];
    cells.push({ok:res.sh>=6,note:res.sh+' cols'});
    cells.push({ok:res.t>300,note:res.t+'px'});
    cells.push({ok:res.ans!=='nothing',note:res.ans});
    if(want.door)cells.push({ok:res.door>60,note:res.door+' door px'});
    else if(want.art)cells.push({ok:res.ink>400,note:res.ink+' ink'});
    else if(want.dark)cells.push({ok:litLume!==null&&res.l<litLume*0.6,
      note:'lume '+res.l+' vs '+litLume});
    else cells.push({ok:true,note:''});
    if(cells.some(c=>!c.ok))bad++;
    console.log(pad(name,13)+cells.map(c=>pad(c.ok?' yes':' NO ',5)+pad(c.note,12)).join(''));
  }
  console.log('-'.repeat(66));
  if(errs.length){console.log('page errors:');errs.forEach(e=>console.log('  '+e));bad+=errs.length;}
  console.log(bad?bad+' scene(s) to look at':'every scene had depth, answered and stayed whole');
  await b.close();
  process.exit(bad?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
