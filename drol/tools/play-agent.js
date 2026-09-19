#!/usr/bin/env node
// A robot for the robot: drives the real game script, with no browser and no
// packages, so the mechanics can be watched rather than assumed.
//
//   node drol/tools/play-agent.js                  one game, the default setting
//   node drol/tools/play-agent.js --games 20       twenty games, seeds 1..20
//   node drol/tools/play-agent.js --diff 4 --trace what it decides, frame by frame
//
// It plays the same index.html the browser loads: the page's script is run in a
// vm against the same minimal DOM and audio stubs the tests use, the agent puts
// its hands on `keys` once per frame, and stepGame() does the rest. Whatever it
// reports is therefore true of the shipped game, not of a model of it.
"use strict";
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");

/* ---------- the game, with a stub for everything a page would have ---------- */
function boot(seed){
 const source=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8")
   .split("<script>")[1].split("</script>")[0];
 const grad={addColorStop(){}};
 const drawing=new Proxy({},{get:(t,k)=>{
   if(k==="canvas")return{width:346,height:216};
   return (...a)=>/Gradient|Pattern/.test(String(k))?grad:undefined;}});
 const els=new Map();
 const el=id=>{if(!els.has(id))els.set(id,{id,style:{},dataset:{},
   classList:{add(){},remove(){},toggle(){}},textContent:"",innerHTML:"",
   setAttribute(){},addEventListener(){},setPointerCapture(){},
   querySelectorAll(){return[];},rect:{width:346,height:216},
   getBoundingClientRect(){return this.rect;},getContext(){return drawing;}});
  return els.get(id);};
 const box={console,setTimeout(){},
  document:{hidden:false,body:{classList:{toggle(){},add(){},remove(){},contains:()=>false}},
   documentElement:{},getElementById:el,querySelectorAll(){return[];},addEventListener(){}},
  window:{},performance:{now:()=>0},devicePixelRatio:1,
  addEventListener(){},requestAnimationFrame(){}};
 vm.createContext(box);vm.runInContext(source,box);
 // The game leans on Math.random for the things a seed should not have to carry -
 // when a scorpion next hops, which way a toy drifts. Give the context a seeded
 // one so a run of the agent is a run anybody can repeat.
 if(seed!==undefined)vm.runInContext(`Math.random=(()=>{let s=${seed>>>0}+0x9E3779B9;
   return()=>{s=(s+0x6D2B79F5)>>>0;let t=Math.imul(s^s>>>15,1|s);
    t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})();`,box);
 return c=>vm.runInContext(c,box);
}

/* ---------- what the agent is allowed to see ---------- */
// Only what a player can see on the screen and the scope: positions, kinds and
// the holes in the floors. No peeking at which trapdoor is the safe one.
const SNAPSHOT=`(()=>{const L=G.L,h=G.hero;return{
 phase:G.phase,scene:G.scene,loop:G.loop,score:G.score,lives:G.lives,time:G.time,msg:G.msg,msgT:G.msgT,
 hero:h?{x:h.x,y:h.y,w:h.w,h:h.h,vx:h.vx,vy:h.vy,face:h.face,alive:h.alive,inv:h.inv,cool:h.cool}:null,
 foes:L?L.foes.filter(e=>!e.dead).map(e=>({k:e.k,x:e.x,y:e.y,w:e.w,h:e.h,dir:e.dir})):[],
 shots:L?L.shots.length:0,
 curses:L?L.curses.map(c=>({x:c.x,y:c.y,w:c.w,h:c.h,vx:c.vx})):[],
 plants:L?L.plants.map(p=>({x:p.x,y:p.y,w:p.w,h:p.h})):[],
 traps:L?L.traps.map(t=>({x:t.x,y:t.y,w:t.w,h:t.h,sprung:t.sprung})):[],
 gaps:L?L.gaps:[],
 child:L&&L.child?{kind:L.child.kind,x:L.child.x,y:L.child.y,w:L.child.w,h:L.child.h,
   chasing:L.child.chasing,freed:L.child.freed}:null,
 toy:L&&L.toy?{kind:L.toy.kind,x:L.toy.x,y:L.toy.y,w:L.toy.w,h:L.toy.h,alive:L.toy.alive}:null,
 pet:L&&L.pet?{kind:L.pet.kind,x:L.pet.x,y:L.pet.y,w:L.pet.w,h:L.pet.h,freed:L.pet.freed}:null};})()`;

/* ---------- the policy ---------- */
const mid=b=>({x:b.x+b.w/2,y:b.y+b.h/2});
const clamp=(v,a,b)=>v<a?a:v>b?b:v;

function makeAgent(K){                       // K: the geometry constants of the game
 const storeyOf=b=>clamp(Math.floor((b.y+b.h/2)/(K.FLOORH*K.TS)),0,K.FLOORS-1);
 const slabTop=f=>(f*K.FLOORH+K.FLOORH-1)*K.TS;
 const storeyCeil=f=>(f*K.FLOORH)*K.TS;

 // The hole to use to get from storey `from` one step towards storey `to`.
 function gapToward(s,from,to){
  const between=to>from?from:from-1;
  const cols=s.gaps.filter(g=>g.f===between).map(g=>g.x).sort((a,b)=>a-b);
  if(!cols.length)return null;
  // Aim at the middle of a run of open tiles, not at one tile of it: the robot is
  // wider than a tile, so the centre of the left-hand tile of a hole is a slab.
  const runs=[];
  for(const x of cols){
   const last=runs[runs.length-1];
   if(last&&x<=last.to+1)last.to=Math.max(last.to,x);else runs.push({from:x,to:x});
  }
  const hx=mid(s.hero).x;
  let best=null,bestD=1e9;
  for(const r of runs){
   const gx=(r.from+(r.to-r.from+1)/2)*K.TS, d=Math.abs(gx-hx);
   if(d<bestD){bestD=d;best={x:gx,f:between};}
  }
  return best;
 }
 // Trapdoors are the only way down in the third scene, and two of the three eat
 // you: take the nearest one that has not been sprung, and get out from under it.
 function trapToward(s){
  // A door that has already sprung, and whose plant has retracted, is a known
  // quantity: the safest way down is the one you have already survived.
  const live=p=>s.plants.some(pl=>Math.abs(pl.x-p.x)<p.w);
  const spent=s.traps.filter(t=>t.sprung&&!live(t));
  const open=spent.length?spent:s.traps.filter(t=>!t.sprung);
  const pool=open.length?open:s.traps;
  if(!pool.length)return null;
  const hx=mid(s.hero).x;
  let best=pool[0];
  for(const t of pool)if(Math.abs(t.x+t.w/2-hx)<Math.abs(best.x+best.w/2-hx))best=t;
  return {x:best.x+best.w/2,f:Math.floor(best.y/(K.FLOORH*K.TS))};
 }

 return function decide(s,memory,log){
  const keys={};
  if(!s.hero||!s.hero.alive)return keys;
  const h=s.hero, me=mid(h), myF=storeyOf(h);

  /* 1. what am I going for? */
  let goal=null, mode="wait";
  if(s.child&&!s.child.freed){
   if(s.toy&&s.toy.alive&&s.child.chasing){goal=s.toy;mode="toy";}
   else{goal=s.child;mode="child";}
   // A pet on the way is worth a detour, but only while the child is still loose.
   if(s.pet&&!s.pet.freed&&mode!=="wait"){
    const p=mid(s.pet);
    if(storeyOf(s.pet)===myF&&Math.abs(p.x-me.x)<180&&!memory.skipPet){goal=s.pet;mode="pet";}
   }
  }
  if(!goal)return keys;
  const g=mid(goal), goalF=storeyOf(goal);
  const near=s.foes.filter(e=>Math.hypot(mid(e).x-me.x,mid(e).y-me.y)<110).map(e=>e.k);
  memory.why=mode+" on storey "+goalF+" from "+myF+(near.length?" near "+[...new Set(near)].sort().join("+"):" alone");
  memory.goalDist=Math.hypot(g.x-me.x,g.y-me.y);
  memory.goalKey=mode+goalF;

  /* 2. the route: same floor, or the nearest hole towards it */
  let wantX=g.x, wantY=g.y, throughHole=false;
  if(goalF!==myF){
   // In the third scene the slab above the mother is holed only by trapdoors.
   const trapStorey=s.traps.length?Math.floor(s.traps[0].y/(K.FLOORH*K.TS)):-1;
   let target=(goalF>myF&&trapStorey===myF)?trapToward(s):gapToward(s,myF,goalF);
   // Stick with a hole once chosen for a second: a toy that keeps changing floors
   // will otherwise have the agent hovering between two of them.
   if(memory.holeT>0&&memory.hole&&memory.hole.f===(goalF>myF?myF:myF-1)){
    target=memory.hole;memory.holeT--;
   }else if(target){memory.hole=target;memory.holeT=60;}
   if(!target)memory.why=mode+": no hole between storey "+myF+" and "+goalF;
   if(target){
    wantX=target.x;throughHole=true;
    // Sit at the right height for the hole: low to drop through, high to rise.
    wantY=goalF>myF?slabTop(myF)-h.h/2-2:storeyCeil(myF)+K.TS+h.h/2;
   }
  }

  /* 3. what is about to hit me */
  const threats=s.foes.concat(s.curses.map(c=>({k:"curse",x:c.x,y:c.y,w:c.w,h:c.h})))
   .concat(s.plants.map(p=>({k:"plant",x:p.x,y:p.y,w:p.w,h:p.h})));
  let flee=0, panic=false;
  for(const e of threats){
   const c=mid(e), dx=c.x-me.x, dy=c.y-me.y;
   if(Math.abs(dy)>K.FLOORH*K.TS*.55)continue;
   const d=Math.hypot(dx,dy);
   // A magnet cannot be shot and cannot be outflown from close up, so it is
   // given a wider berth than anything that can be killed - but only overhead.
   // Its reach stops short of the floor, so the way past one, and the way to a
   // child standing under one, is low.
   const sameFloor=Math.abs(dy)<K.FLOORH*K.TS*.5;
   // A magnet overhead is survivable at floor level: its pull only beats the
   // backpack inside about seventeen pixels, so a child standing under one is
   // reached by flying low and holding ▼, not by keeping clear.
   const keepOut=e.k==="magnet"?(sameFloor?(dy<-12?20:56):26):e.k==="vacuum"?70:46;
   if(d<keepOut){flee+=dx>0?-1:1;panic=true;}
  }

  // A curse travels faster than the backpack, so there is no outrunning one along
  // a floor: the only answer is to be somewhere else vertically by the time it
  // arrives. This is the agent learning the counter-play, not a change to it.
  let duck=0;
  for(const c of s.curses){
   const cc=mid(c), lead=(cc.x-me.x)*Math.sign(c.vx);
   if(lead<0||lead>150)continue;
   if(Math.abs(cc.y-me.y)<15)duck=me.y>cc.y?1:-1;
  }

  /* 4. hands on the pad */
  const dx=wantX-me.x, dy=wantY-me.y;
  if(panic){
   // Hold a direction for half a second once chosen, or the agent dithers on the
   // spot between two things that are both too close.
   if(memory.fleeT>0)memory.fleeT--;
   else{memory.fleeDir=flee>0?1:-1;memory.fleeT=30;}
   if(memory.fleeDir>0)keys.R=true;else keys.L=true;
   if(dy<0||memory.fleeT%2)keys.U=true;             // rising is usually the way out
  }else{
   if(dx>6)keys.R=true;else if(dx<-6)keys.L=true;
   if(dy<-5)keys.U=true;else if(dy>5)keys.D=true;
   else keys.HOLD=true;
  }
  if(duck){
   delete keys.HOLD;
   if(duck<0){keys.U=true;delete keys.D;}else{keys.D=true;delete keys.U;}
  }
  // Lined up under or over the hole, commit to it. The threshold has to be wider
  // than the deadzone that stops it steering (6px), or there is a band between
  // the two where the agent neither moves nor drops, and it parks there for good.
  if(throughHole&&Math.abs(dx)<9){
   delete keys.HOLD;
   if(goalF>myF){keys.D=true;delete keys.U;}else{keys.U=true;delete keys.D;}
  }
  // The trapdoors of the third scene spring as you pass: two of the three grow
  // something with a mouth, so clear the column the moment you are through.
  if(s.plants.length){
   const p=s.plants[0], pc=mid(p);
   if(Math.abs(pc.x-me.x)<p.w/2+h.w&&me.y>p.y-60){
    delete keys.HOLD;delete keys.D;
    keys[pc.x>me.x?"L":"R"]=true;
    if(me.y>p.y-20)keys.U=true;
   }
  }
  // Wedged: a robot inside a hole cannot move sideways, because the slab is on
  // both sides of him. Climb out before trying again.
  if(memory.jam>18){
   delete keys.HOLD;
   if(goalF<myF||myF===K.FLOORS-1){keys.U=true;delete keys.D;}
   else{keys.D=true;delete keys.U;}
  }

  /* 5. the trigger */
  const face=keys.R?1:keys.L?-1:h.face;
  const shootable=t=>t.k!=="magnet"&&t.k!=="curse"&&t.k!=="plant";
  let fire=false, vert=0;
  for(const e of s.foes){
   const c=mid(e), ddx=c.x-me.x, ddy=c.y-me.y;
   if(!shootable(e))continue;
   if(Math.abs(ddy)<9&&Math.sign(ddx)===face&&Math.abs(ddx)<190)fire=true;
   if(Math.abs(ddx)<9&&ddy<0&&ddy>-90)vert=-1;
   if(Math.abs(ddx)<9&&ddy>0&&ddy<90)vert=1;
  }
  // The toy is the whole trick of the first two scenes: shoot it and the child
  // stops chasing it.
  if(mode==="toy"){
   const c=mid(s.toy), ddx=c.x-me.x, ddy=c.y-me.y;
   if(Math.abs(ddy)<8&&Math.abs(ddx)<190&&Math.sign(ddx)===face)fire=true;
   if(Math.abs(ddx)<8&&Math.abs(ddy)<80)vert=Math.sign(ddy)||-1;
  }
  if(fire)keys.FIRE=true;
  if(vert&&!fire){keys.VERT=true;if(vert>0)keys.D=true;else delete keys.D;}
  return keys;
 };
}

/* ---------- one game ---------- */
function play(opts){
 const run=boot(opts.seed);
 const K=run("({TS,FLOORH,FLOORS,MAPW,MAPH})");
 const decide=makeAgent(K);
 run(`newGame(${opts.diff},${opts.seed});`);
 const log={seed:opts.seed,diff:opts.diff,score:0,rescues:[],deaths:[],scenesSeen:0,
   rounds:0,frames:0,shots:0,stuck:0,stalls:[],ended:"time"};
 const memory={skipPet:false,jam:0,fleeT:0,fleeDir:1,hole:null,holeT:0};
 const DT=1/60;
 let lastLives=run("G.lives"), sceneStart=0, lastScene=-1, still=0, cheered=false,
     bestDist=1e9, lastGoal=null, lastFloor=-1;
 for(let f=0;f<opts.frames;f++){
  const s=run(SNAPSHOT);
  if(s.phase==="over"){log.ended="all robots lost";break;}
  if(s.phase==="cheer"){                       // the RESCUED card, then the next scene
   if(!cheered){
    cheered=true;
    log.rescues.push({scene:s.scene,round:s.loop,who:s.child?s.child.kind:"?",
      seconds:+(s.time-sceneStart).toFixed(1),pet:!!(s.pet&&s.pet.freed)});
   }
   run(`G.cheerT-=${DT};if(G.cheerT<=0)nextScene();`);
   continue;
  }
  if(s.phase!=="play"){run('G.phase="play";');continue;}
  if(s.scene!==lastScene){
   if(lastScene>=0)log.scenesSeen++;
   lastScene=s.scene;sceneStart=s.time;memory.skipPet=false;cheered=false;
   log.rounds=s.loop;
  }
  if(s.lives<lastLives){
   log.deaths.push({scene:s.scene,round:s.loop,cause:(s.msg||"").replace(/^Caught by |\.$/g,""),
     at:+(s.time-sceneStart).toFixed(1)});
   lastLives=s.lives;
  }
  const keys=decide(s,memory,log);
  const set=JSON.stringify(keys);
  run(`for(const k of Object.keys(keys))delete keys[k];Object.assign(keys,${set});`);
  if(keys.FIRE||keys.VERT)log.shots++;
  run(`stepGame(${DT});`);
  log.frames++;
  const moved=Math.abs(run("G.hero?G.hero.x:0")-s.hero.x);
  memory.jam=((keys.L||keys.R)&&moved<.4)?memory.jam+1:0;
  // Standing still is not the test - flying up and down a hole without ever
  // reaching the child is just as stuck. Measure progress towards the goal, and
  // call twelve seconds without any a stall.
  // Crossing four storeys for a child at the far end is twenty seconds of honest
  // work in which the straight-line distance barely moves, so a stall has to be
  // no progress of any kind: not towards the goal, and not between floors.
  if(s.hero&&memory.goalDist!==undefined){
   const floor=Math.floor((s.hero.y+s.hero.h/2)/(K.FLOORH*K.TS));
   if(floor!==lastFloor){lastFloor=floor;still=0;}
   if(memory.goalDist<bestDist-20){bestDist=memory.goalDist;still=0;}
   else if(++still>1200){
    log.stuck++;log.stalls.push(memory.why||"?");memory.skipPet=true;still=0;bestDist=1e9;
   }
  }
  if(memory.goalKey!==lastGoal){lastGoal=memory.goalKey;bestDist=1e9;still=0;}
  if(opts.trace&&f%30===0&&s.hero)
   console.log(`t=${s.time.toFixed(1)} scene ${s.scene+1} storey ${
     Math.floor((s.hero.y+s.hero.h/2)/(K.FLOORH*K.TS))} x=${Math.round(s.hero.x)} `+
     `score ${s.score} lives ${s.lives} keys ${Object.keys(keys).join("+")||"-"}`);
 }
 log.score=run("G.score");
 log.lives=run("G.lives");
 log.gameSeconds=+run("G.time").toFixed(1);
 return log;
}

/* ---------- the report ---------- */
function main(argv){
 const arg=(n,d)=>{const i=argv.indexOf("--"+n);return i<0?d:argv[i+1];};
 const games=+arg("games",1), diff=+arg("diff",2), seconds=+arg("seconds",180),
       trace=argv.includes("--trace"), json=argv.includes("--json");
 const runs=[];
 for(let i=0;i<games;i++)
   runs.push(play({seed:+arg("seed",0)||i+1,diff,frames:Math.round(seconds*60),trace}));
 if(json){console.log(JSON.stringify(runs,null,1));return;}
 const all=k=>runs.flatMap(r=>r[k]);
 const rescues=all("rescues"), deaths=all("deaths");
 const by=(list,k)=>list.reduce((m,x)=>(m[x[k]]=(m[x[k]]||0)+1,m),{});
 const avg=a=>a.length?+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1):0;
 console.log(`\n${games} game(s), setting ${diff}, ${seconds}s of game time each\n`);
 console.log(`score        avg ${avg(runs.map(r=>r.score))}  best ${Math.max(...runs.map(r=>r.score))}`);
 console.log(`rescues      ${rescues.length} in ${games} game(s)  `+
   JSON.stringify(by(rescues,"who")));
 console.log(`seconds/rescue  `+["boy","girl","mom"].map(w=>
   `${w} ${avg(rescues.filter(r=>r.who===w).map(r=>r.seconds))}`).join("  "));
 const minutes=runs.reduce((n,r)=>n+r.gameSeconds,0)/60;
 console.log(`per minute   ${(rescues.length/minutes).toFixed(2)} rescues  `+
   `${(deaths.length/minutes).toFixed(2)} deaths  ${Math.round(runs.reduce((n,r)=>n+r.score,0)/minutes)} points`+
   `  (${(deaths.length/Math.max(1,rescues.length)).toFixed(2)} deaths per rescue)`);
 console.log(`deaths       ${deaths.length}  (${avg(runs.map(r=>r.deaths.length))} per game)`);
 const causes=by(deaths,"cause");
 for(const c of Object.keys(causes).sort((a,b)=>causes[b]-causes[a]))
   console.log(`   ${String(causes[c]).padStart(4)}  ${c}`);
 console.log(`rounds reached  ${runs.map(r=>r.rounds+1).join(", ")}`);
 console.log(`ended        ${JSON.stringify(by(runs.map(r=>({e:r.ended})),"e"))}`);
 const stuck=runs.reduce((n,r)=>n+r.stuck,0);
 if(stuck){
  console.log(`stalls       ${stuck} (twenty seconds with no progress at all)`);
  const why=by(runs.flatMap(r=>r.stalls).map(w=>({w})),"w");
  for(const w of Object.keys(why).sort((a,b)=>why[b]-why[a]).slice(0,8))
   console.log(`   ${String(why[w]).padStart(4)}  ${w}`);
 }
}
if(require.main===module)main(process.argv.slice(2));
module.exports={play,boot,makeAgent,SNAPSHOT};
