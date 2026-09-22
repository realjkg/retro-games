#!/usr/bin/env node
// What a player sees, scene by scene, in a real browser.
//
// The unit tests read state; this reads the screen. Every spatial defect this
// game has had looked fine to a test that asked the game where things were:
//
//  * all four storeys held thirty pixels of air and the top one held twenty,
//    for an eighteen-pixel robot - the numbers were right, the maze was a
//    letterbox and the jetpack had nowhere to go;
//  * a slab was a ten-pixel row of solid with only six pixels painted, so you
//    cracked your head four pixels below the floor you could see;
//  * the pillars were painted after the floors they stand behind, so every
//    pillar cut a white notch through every band it met;
//  * the view was a pixel shorter than the world, so the bottom storey's floor
//    was scrolled off the screen, and the message line was painted over it.
//
// Run:  PW=<playwright dir> node drol/tools/playtest.js [--url http://host/drol/]
// It serves nothing: point --url at a served copy, or let it use a file:// URL.
const path=require('node:path');
const URL_ARG=(()=>{const i=process.argv.indexOf('--url');return i>0?process.argv[i+1]:null;})();
const PAGE=URL_ARG||('file://'+path.join(__dirname,'..','index.html'));
const PW=process.env.PW||'playwright';
const EXE=process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const rows=[];
const ok=v=>v?'ok  ':'FAIL';

(async()=>{
 let chromium;
 try{ ({chromium}=require(PW)); }
 catch(e){ console.error(`playtest needs playwright: PW=<dir> node ${path.basename(__filename)}`); process.exit(2); }
 const b=await chromium.launch(EXE?{executablePath:EXE}:{});
 const p=await b.newPage({viewport:{width:760,height:900},deviceScaleFactor:2});
 const errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.goto(PAGE);
 await p.waitForTimeout(500);

 // How much room the jetpack has, measured by flying it. Reading slabRow and
 // storeyTop instead said all four storeys were the same and missed that the
 // roof used to be the top storey's own first row, leaving it a third shorter
 // than the other three for an eighteen-pixel robot.
 await p.click('.menuitem');await p.waitForTimeout(150);
 await p.click('.diffgrid .menuitem:nth-child(3)');await p.waitForTimeout(500);
 const climb=await p.evaluate(()=>{
  const out=[];
  for(let f=0;f<FLOORS;f++){
   G.scene=0;startScene();G.hero.inv=999;
   for(let i=0;i<MAPW;i++){if(f>0)G.L.map[i][slabRow(f-1)]=SLAB;G.L.map[i][slabRow(f)]=SLAB;}
   G.hero.x=30*TS;G.hero.y=slabRow(f)*TS-G.hero.h;G.hero.vy=0;
   for(const k of Object.keys(keys))delete keys[k];
   const floor=G.hero.y;keys.U=true;
   for(let i=0;i<240;i++)stepGame(1/60);
   out.push(Math.round(floor-G.hero.y));
  }
  for(const k of Object.keys(keys))delete keys[k];
  return out;
 });
 const same=climb.every(a=>Math.abs(a-climb[0])<=1);
 rows.push(['every storey gives the same room',same,climb.join('/')+'px of climb']);
 rows.push(["room over the robot's head",Math.min(...climb)>=20,
            `${Math.min(...climb)}px at the tightest`]);

 const geo=await p.evaluate(()=>{
  const msg=(typeof MSG_H==='number')?MSG_H:0;   // read defensively: older builds have none
  return {world:MAPH*TS,view:VH-(G.radar?RADAR_H:0)-msg};
 });
 rows.push(['the whole maze is on the screen',geo.view>=geo.world,
            `view ${geo.view}px for a ${geo.world}px world`]);

 // A slab is solid for a whole tile row, so a whole tile row of it must be
 // painted. This reads the canvas: fly him up under a floor, then walk up the
 // pixels beside him and find the lowest one that is not black. Where he stops
 // and where the floor can be seen to end have to be the same row. Comparing
 // his stop against the tile boundary instead passed on the build that left
 // four black pixels of solid floor under every band.
 const slab=await p.evaluate(()=>{
  G.scene=1;startScene();G.hero.inv=999;G.msgT=0;
  const f=2;
  for(let i=0;i<MAPW;i++){G.L.map[i][slabRow(f-1)]=SLAB;G.L.map[i][slabRow(f)]=SLAB;}
  G.hero.x=30*TS;G.hero.y=slabRow(f)*TS-G.hero.h;G.hero.vy=0;
  for(const k of Object.keys(keys))delete keys[k];
  keys.U=true;
  for(let i=0;i<240;i++)stepGame(1/60);
  delete keys.U;
  render();
  const top=G.radar?RADAR_H:0;
  const headY=Math.round(G.hero.y-G.cam.y+top);
  const hx=Math.round(G.hero.x-G.cam.x)-14;          // clear air beside him
  const d=ctx.getImageData(hx,0,1,cv.height).data;
  let paint=-1;
  for(let y=headY-1;y>=top;y--){const i=y*4;if(d[i]+d[i+1]+d[i+2]>40){paint=y;break;}}
  return {gap:headY-paint-1,headY,paint};
 });
 rows.push(['he stops where the floor can be seen to end',slab.gap===0,
            `${slab.gap}px of floor painted black`]);

 // Now every scene: is it alive, is the picture whole, does it answer the pad?
 for(const sc of [0,1,2]){
  const name=await p.evaluate(s=>{
    for(const k of Object.keys(keys))delete keys[k];   // nothing held over from the last check
    G.scene=s;startScene();G.hero.inv=999;G.msgT=0;
    return SCENES[s].name;},sc);
  await p.waitForTimeout(40);

  // alive: two frames a third of a second apart must be different pictures
  const alive=await p.evaluate(()=>{
   render();const a=cv.toDataURL();
   for(let i=0;i<20;i++)stepGame(1/60);
   render();return a!==cv.toDataURL();
  });
  rows.push([`scene ${sc+1} moves`,alive,name]);

  // answers the pad: hold the jetpack and he must climb, hold a direction and go
  const answers=await p.evaluate(()=>{
   // Put him back on his feet first: measuring a climb from a robot already
   // pinned against the ceiling says he cannot fly when he is only out of room.
   for(const k of Object.keys(keys))delete keys[k];
   for(let i=0;i<40;i++)stepGame(1/60);
   const y0=G.hero.y;keys.U=true;
   for(let i=0;i<30;i++)stepGame(1/60);
   const rose=G.hero.y<y0-6;
   delete keys.U;const x0=G.hero.x;keys.R=true;
   for(let i=0;i<30;i++)stepGame(1/60);
   const moved=G.hero.x>x0+6;
   for(const k of Object.keys(keys))delete keys[k];
   return {rose,moved};
  });
  rows.push([`scene ${sc+1} answers the pad`,answers.rose&&answers.moved,
             `${answers.rose?'flies':'will not fly'}, ${answers.moved?'walks':'will not move'}`]);

  // whole: nothing in the maze may be drawn across a slab it does not touch, and
  // nothing may hang outside the storey it belongs to
  // Embedded in a floor is not the same as falling through a hole in one, and
  // the difference is the game's own collision: hits() is true only where the
  // tile is actually solid. Asking instead whether a thing sat inside the
  // storey it was spawned in called every scorpion mid-hop and every zombie
  // mid-fall a defect, and hid the ones that matter.
  const outside=await p.evaluate(()=>{
   const bad=[];
   const embedded=(o,label)=>{if(hits({x:o.x,y:o.y,w:o.w,h:o.h}))bad.push(label+' drawn inside a slab');};
   for(const u of G.L.urns)embedded(u,'an urn');
   for(const e of G.L.foes){if(e.dead)continue;embedded(e,'a '+e.k);}
   if(G.L.pet&&!G.L.pet.freed)embedded(G.L.pet,'the '+G.L.pet.kind);
   if(G.L.child&&!G.L.child.freed)embedded(G.L.child,'the '+G.L.child.kind);
   for(const q of G.L.pillars){
    const w=PILLAR_PIX[0].length;
    for(let k=0;k<Math.ceil(w/TS);k++){
     const col=G.L.map[Math.floor(q.x/TS)+k];
     if(col&&col[slabRow(q.f)]!==SLAB)bad.push('a pillar standing on a hole');
    }
   }
   return [...new Set(bad)];
  });
  rows.push([`scene ${sc+1} draws nothing inside a floor`,outside.length===0,
             outside.length?outside.join('; '):'urns, pillars, pets and the menagerie all clear']);
 }

 rows.push(['no exception while any of that ran',errors.length===0,
            errors.length?errors[0]:'clean']);
 await b.close();

 const w=Math.max(...rows.map(r=>r[0].length));
 for(const [what,pass,note] of rows)
  console.log(`${ok(pass)}  ${what.padEnd(w)}  ${note}`);
 const failed=rows.filter(r=>!r[1]).length;
 console.log(`\n${rows.length-failed}/${rows.length} pass`);
 process.exit(failed?1:0);
})();
