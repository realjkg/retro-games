/* ============ presentation and input ============
 * Two static zones, as the original had them: the scene fills the top half,
 * framed from behind the sheriff's holster, and the five-line dialogue matrix
 * fills the bottom. One rAF loop, wrapped, drives both.                      */
"use strict";
const cv=document.getElementById("scene"), ctx=cv.getContext("2d");
const panel=document.getElementById("panel");
const lineEls=[0,1,2,3,4].map(i=>document.getElementById("line"+i));
const scoreEl=document.getElementById("score");
const modeEl=document.getElementById("mode");
const muteBtn=document.getElementById("mute");

let G=newDay({}), cursor=0, started=false, lastFrame=0, drawnAt=0, firedLatency=null;
let build={at:0,rows:0};            // the block-load cadence
let flash=0, bodyFall=0, said="", react="";

/* ---- layout: the canvas keeps the scene's proportions inside the top half ---- */
function fit(){
  const r=cv.getBoundingClientRect(), d=Math.min(devicePixelRatio||1,2.5);
  cv.width=Math.max(160,Math.round(r.width*d));
  cv.height=Math.max(100,Math.round(r.height*d));
}
addEventListener("resize",()=>{fit();paint();});
const sceneGeom=()=>{
  const sc=Math.min(cv.width/SCENE.w,cv.height/SCENE.h);
  return {sc,ox:(cv.width-SCENE.w*sc)/2,oy:(cv.height-SCENE.h*sc)/2};
};

/* ---- the town and the people, built out of blocks ---- *
 * Every figure is a 12x21 grid of 4-pixel cells, written out as rows of
 * characters and painted cell by cell. Nothing is drawn at a fraction of a
 * cell, so the edges stay hard the way a sprite's do. The hitboxes in
 * content.js are read off this same grid.
 *   . nothing   H hat   F face   B dark (eyes, belt, boots)   C coat
 *   K coat shadow   L legs   A skin   G gunmetal   S star   W linen        */
const BODY=[
  "......HHHH......",
  ".....HHHHHH.....",
  "....HHHHHHHH....",
  "...HHHHHHHHHH...",
  "..HHHHHHHHHHHH..",
  "....FFFFFFFF....",
  "....FFFFFFFF....",
  "....FBFFFFBF....",
  "....FFFFFFFF....",
  ".....FFFFFF.....",
  "...CCCCCCCCCC...",
  "..CCCCCCCCCCCC..",
  "..CCCCCKKCCCCC..",
  "..CCCCCKKCCCCC..",
  "..CCCCCCCCCCCC..",
  "..CCCCCCCCCCCC..",
  "..CCCCCCCCCCCC..",
  "..CCCCCCCCCCCC..",
  "..BBBBBBBBBBBB..",
  "...CCCCCCCCCC...",
  "....LLL..LLL....",
  "....LLL..LLL....",
  "....LLL..LLL....",
  "....LLL..LLL....",
  "....LLL..LLL....",
  "...BBBB.BBBB...."];
/* The gun arm is its own overlay so the weapon hitbox can follow it up. */
const ARM={
  0:{10:"..C.............",11:"..C.............",12:"..C.............",
     13:"..C.............",14:"..C.............",15:"..C.............",
     16:"..A.............",17:".AA.............",18:"GGA.............",
     19:"GG..............",20:"GG..............",21:"..B............."},
  1:{10:"..C.............",11:".AA.............",12:"GGA.............",
     13:"GG..............",14:".AA.............",15:"..C............."},
  2:{11:"..A.............",12:"GGGA............",13:"GGGA............",
     14:"..C.............",15:"..C............."}};
/* What makes one visitor look unlike another, on the same frame. */
const VARIANT={
  skirt:{19:"...CCCCCCCCCC...",20:"..LLLLLLLLLLLL..",21:"..LLLLLLLLLLLL..",
         22:".LLLLLLLLLLLLLL.",23:".LLLLLLLLLLLLLL.",24:".LLLLLLLLLLLLLL.",
         25:"...BBB....BBB...",
         0:"......HHHH......",1:".....HHHHHH.....",2:".....HHHHHH.....",
         3:"....HHHHHHHH....",4:"...HHHHHHHHHH..."},
  collar:{10:"...CCCWWWWCCC...",4:"..HHHHHHHHHHHH.."},
  cap:{0:"................",1:"................",2:"......HHHH......",
       3:".....HHHHHH.....",4:"....HHHHHHHH...."},
  flathat:{0:"................",1:"....HHHHHHHH....",2:"...HHHHHHHHHH...",
           3:"..HHHHHHHHHHHH..",4:".HHHHHHHHHHHHHH."}};
const LOOK_BY_ID={
  deputy:  {C:"#41506b",K:"#33405a",H:"#20283a",L:"#2b3448",S:true},
  rainmaker:{C:"#241f22",K:"#19161a",H:"#141215",L:"#1d1a1d",variant:"collar"},
  surveyor:{C:"#55654f",K:"#44513f",H:"#d8cfb4",L:"#3f4a3c",variant:"flathat"},
  widow:   {C:"#4a3a44",K:"#3a2c34",H:"#2a2028",L:"#33262e",variant:"skirt"},
  tuner:   {C:"#6a5a3a",K:"#544628",H:"#3a2f1e",L:"#4a3f28",variant:"flathat"},
  locket:  {C:"#9a7a4a",K:"#7d6138",H:"#7a5a30",L:"#5f4c2e",variant:"cap"}};
const PAL={sky:["#f2c988","#e8b46a","#dda059","#c9813f"],hill:"#9c6a3c",hill2:"#8a5c33",
  dust:"#c49a63",road:"#a87f4e",rut:"#9a713f",wood:"#6b4a2a",wood2:"#54381f",
  dark:"#2a1c10",glass:"#3b2a18",lit:"#e8cf6a",sign:"#e8cf6a",
  skin:"#e0ac7a",steel:"#9aa0a8",ink:"#f2e6d2",cuff:"#41506b",star:"#e8cf6a",linen:"#e8e0cc"};
function cellColour(ch,look){
  switch(ch){
    case "H":return look.H; case "C":return look.C; case "K":return look.K||look.C;
    case "L":return look.L||look.C; case "F":return PAL.skin; case "A":return PAL.skin;
    case "B":return PAL.dark;  case "G":return PAL.steel;
    case "S":return PAL.star;  case "W":return PAL.linen;
    default:return null;
  }
}
/* Paint a grid of rows at a cell origin. Rows may be sparse (an overlay). */
function blocks(rows,x0,y0,look,cell){
  const k=cell||CELL;                         // the foreground is drawn in bigger blocks
  for(const key of Object.keys(rows)){
    const r=+key, line=rows[r];
    for(let c=0;c<line.length;c++){
      const col=cellColour(line[c],look);
      if(!col)continue;
      ctx.fillStyle=col;
      ctx.fillRect(x0+c*k,y0+r*k,k,k);
    }
  }
}
function visitor(enc,armState){
  const look=LOOK_BY_ID[enc.id]||LOOK_BY_ID.deputy;
  ctx.fillStyle="rgba(60,40,22,.30)";                     // his shadow, also in cells
  for(let c=3;c<13;c++)ctx.fillRect(SPRX+c*CELL,SPRY+SPR.h*CELL,CELL,CELL);
  const body=Object.fromEntries(BODY.map((line,i)=>[i,line]));
  if(look.variant)Object.assign(body,VARIANT[look.variant]);
  blocks(body,SPRX,SPRY,look);
  blocks(ARM[armState]||ARM[0],SPRX,SPRY,look);
  if(look.S)blocks({14:"....S..........."},SPRX,SPRY,look);   // a star, on the one who wears one
}
/* The sheriff's own hand and gun, across the low corner, on the same grid. */
/* The sheriff's own forearm and revolver across the low right corner: his hand
 * is the only part of him the player ever sees. 16 cells wide, 10 tall. */
/* The sheriff fills the bottom of the frame: his shoulder, his forearm and his
 * revolver, seen from just behind his own hip. 22 cells across, 13 down. */
const OWN={
  holstered:[
    "...................BBB",
    "................BBBCCC",
    "............BBBCCCCCCC",
    "............CCCCCCCCCC",
    ".........CCCAAAAACCCCC",
    "......CCCCAAAAAAAACCCC",
    "....CCCCAAAAAAAAAACCCC",
    "...BBBGGGGGAAAAAACCCCC",
    "..BBGGGGGGGBBBBBBCCCCC",
    "..BBGGGGGBBBBBBBBBBBBB",
    "...BBBBBBBBBBBBBBBBBBB",
    "....BBBBBBBBBBBBBBBBBB",
    ".....BBBBBBBBBBBBBBBBB"],
  drawn:[
    "BBBBB.................",
    "GGGGGBB...............",
    "GGGGGGGBB.............",
    ".BBGGGGGGGGG..........",
    "...BAAAAAGGGGG........",
    "..BAAAAAAAAGGGG.......",
    "..BCCAAAAAAAAGG.......",
    "..BCCCCAAAAAAAAB......",
    "...BCCCCCCAAAAAAB.....",
    "....BCCCCCCCCAAAAB....",
    ".....BCCCCCCCCCCCCB...",
    "......BCCCCCCCCCCCCCB.",
    ".......BCCCCCCCCCCCCCB"]};
/* He is nearest the camera, so his blocks are the biggest thing on screen:
 * seven scene-pixels to a cell against the street's four. */
const OWN_CELL=CELL*1.5;
function ownGun(out){
  const rows=Object.fromEntries((out?OWN.drawn:OWN.holstered).map((l,i)=>[i,l]));
  const x0=SCENE.w-20*OWN_CELL, y0=SCENE.h-12*OWN_CELL;
  blocks(rows,x0,y0,{C:PAL.cuff,K:PAL.cuff,H:PAL.dark,L:PAL.cuff},OWN_CELL);
}
/* A reticle of blocks, with a dark cell behind every light one so it reads
 * over a white shirt or a black doorway alike. */
const RETICLE=[[-4,0],[-3,0],[3,0],[4,0],[0,-4],[0,-3],[0,3],[0,4],[0,0]];
function crosshair(){
  const a=G.aim;
  const x=Math.round(a.x*SCENE.w/CELL)*CELL, y=Math.round(a.y*SCENE.h/CELL)*CELL;
  ctx.fillStyle="rgba(20,14,8,.85)";
  for(const [dx,dy] of RETICLE)ctx.fillRect(x+dx*CELL+1,y+dy*CELL+1,CELL,CELL);
  ctx.fillStyle=G.duel&&G.duel.drawn?"#ffe9a8":PAL.ink;
  for(const [dx,dy] of RETICLE)ctx.fillRect(x+dx*CELL,y+dy*CELL,CELL,CELL);
}
const grid=v=>Math.round(v/CELL)*CELL;                     // nothing lands off the grid
function facade(name){
  ctx.fillStyle=PAL.wood;  ctx.fillRect(0,grid(40),SCENE.w,grid(96));
  ctx.fillStyle=PAL.wood2; ctx.fillRect(0,grid(40),SCENE.w,CELL*2);
  for(let y=grid(52);y<grid(136);y+=CELL*3){
    ctx.fillStyle="rgba(0,0,0,.10)"; ctx.fillRect(0,y,SCENE.w,CELL);
  }
  ctx.fillStyle=PAL.glass; ctx.fillRect(grid(24),grid(64),grid(48),grid(48));
  ctx.fillStyle="rgba(232,207,106,.16)"; ctx.fillRect(grid(28),grid(68),grid(40),grid(40));
  ctx.fillStyle=PAL.glass; ctx.fillRect(grid(240),grid(64),grid(48),grid(36));
  ctx.fillStyle=PAL.dark;  ctx.fillRect(grid(140),grid(60),grid(40),grid(76));
  ctx.fillStyle=PAL.sign;  ctx.font="700 12px monospace";
  ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText(name,SCENE.w/2,grid(46));
  ctx.fillStyle=PAL.wood2; ctx.fillRect(0,grid(136),SCENE.w,CELL*2);   // boardwalk
  for(const px of [grid(16),grid(300)]){ctx.fillStyle=PAL.wood;ctx.fillRect(px,grid(68),CELL,grid(68));}
}
function drawScene(now){
  const g=sceneGeom();
  ctx.fillStyle="#000"; ctx.fillRect(0,0,cv.width,cv.height);
  ctx.save(); ctx.translate(g.ox,g.oy); ctx.scale(g.sc,g.sc);
  for(let i=0;i<5;i++){ctx.fillStyle=PAL.sky[Math.min(3,i)];ctx.fillRect(0,i*CELL*2,SCENE.w,CELL*2);}
  ctx.fillStyle=PAL.hill; ctx.fillRect(0,grid(40),SCENE.w,grid(12));
  for(let i=0;i<6;i++){                                    // hills, stepped in cells
    ctx.fillStyle=PAL.hill2;
    for(let k=0;k<4;k++)
      ctx.fillRect(grid(i*56+k*CELL*2),grid(52)-k*CELL,CELL*2*(4-k)+CELL*4,CELL);
  }
  ctx.fillStyle=PAL.dust; ctx.fillRect(0,grid(52),SCENE.w,SCENE.h-grid(52));
  const enc=who(G);
  if(enc)facade(enc.place||"STREET");
  ctx.fillStyle=PAL.road; ctx.fillRect(0,grid(140),SCENE.w,SCENE.h-grid(140));
  for(let i=0;i<26;i++){                                   // ruts, one cell each
    ctx.fillStyle=i%3?PAL.rut:"#cdaa7a";
    ctx.fillRect(grid((i*47)%SCENE.w),grid(146+((i*37)%40)),CELL,CELL);
  }
  if(enc&&build.rows>=6){
    const arm=G.duel?(G.duel.drawn?2:1):(G.phase==="tell"?1:0);
    if(G.outcome==="killed_him"||G.outcome==="murder"){
      ctx.save();ctx.translate(FIG.cx,FIG.ground);ctx.rotate(Math.min(1.4,bodyFall));
      ctx.translate(-FIG.cx,-FIG.ground);visitor(enc,0);ctx.restore();
    } else visitor(enc,arm);
  }
  ownGun(G.mode==="gun");
  if(G.mode==="gun"&&build.rows>=6)crosshair();
  if(flash>0){ctx.fillStyle="rgba(255,242,192,"+Math.min(1,flash*6)+")";
    ctx.fillRect(0,0,SCENE.w,SCENE.h);}
  if(build.rows<10){                                       // the block-load cadence
    ctx.fillStyle="#000";
    ctx.fillRect(0,build.rows*(SCENE.h/10),SCENE.w,SCENE.h-build.rows*(SCENE.h/10));
  }
  ctx.fillStyle="rgba(20,14,8,.6)"; ctx.fillRect(0,SCENE.h-CELL*3,SCENE.w,CELL*3);
  ctx.fillStyle=PAL.ink; ctx.font="700 8px monospace";
  ctx.textAlign="left"; ctx.textBaseline="middle";
  const counted=Math.min(G.encounter+1,CAST.length);
  ctx.fillText(G.phase==="summary"?"GOLD GULCH   SUNDOWN"
    :((enc?enc.name.toUpperCase():"GOLD GULCH")+"   "+counted+" OF "+CAST.length),
    4,SCENE.h-6);
  ctx.textAlign="right";
  ctx.fillText(G.wounds?"WOUNDED":"UNHURT",SCENE.w-4,SCENE.h-6);
  ctx.restore();
}

/* ---- the five-line matrix ---- *
 * Nothing a character says may be cut off or hidden behind a scroll, so after
 * every repaint the dialogue type is stepped down until all five lines fit the
 * box they are in. The floor is 70%: below that the panel scrolls rather than
 * becoming unreadable. */
const DLG_STEPS=[1,0.95,0.9,0.85,0.8,0.75,0.7];
function fitText(){
  if(!panel||!panel.style||typeof panel.scrollHeight!=="number")return;
  for(const scale of DLG_STEPS){
    panel.style.setProperty("--dlg",String(scale));
    if(panel.scrollHeight<=panel.clientHeight+1)return;
  }
}

function beat(){return nodeOf(G);}
function paint(){
  const b=beat(), live=build.rows>=10;
  if(G.phase==="summary"){return paintSummary();}
  if(G.phase==="intro"){
    lineEls[0].textContent="LAW OF THE WEST — GOLD GULCH";
    lineEls[0].className="npc";
    lineEls[1].textContent="1. Pin on the badge";
    lineEls[1].className="choice sel";
    const done=CAST.filter(written).length;
    lineEls[2].textContent=done+" of "+CAST.length+" callers written so far.";
    lineEls[2].className="choice dim";
    lineEls[3].textContent="An original recreation inspired by the 1985 game.";
    lineEls[3].className="choice dim";
    lineEls[4].textContent=(gameMode?"":"Opens full screen; EXIT or g stays in the page.");
    lineEls[4].className="choice dim";
    modeEl.textContent="GOLD GULCH"; scoreEl.textContent="";
    fitText(); return;
  }
  lineEls[0].className="npc";
  if(G.phase==="resolve"){
    lineEls[0].textContent=G.ending?G.ending.text:outcomeLine();
    lineEls[1].textContent=(G.encounter>=CAST.length-1)?"1. End the day":"1. Walk on down the street";
    lineEls[1].className="choice sel";
    for(let i=2;i<5;i++){lineEls[i].textContent="";lineEls[i].className="choice";}
    scoreEl.textContent="Authority "+G.authority+"   arrests "+G.arrests;
    modeEl.textContent=who(G)?who(G).name.toUpperCase():"";
    fitText(); return;
  }
  lineEls[0].textContent=!b?"["+(who(G)?who(G).name:"this caller")+" is not written yet]"
    :b.npc;
  const replies=b?b.replies:[];
  for(let i=0;i<4;i++){
    const r=replies[i];
    lineEls[i+1].textContent=r?(i+1)+". "+r.text:"";
    lineEls[i+1].className="choice"+(live&&G.mode==="talk"&&cursor===i?" sel":"")+
      (G.mode==="gun"?" dim":"");
  }
  modeEl.textContent=G.mode==="gun"?"GUN DRAWN — down to holster":"TALKING — up to draw";
  scoreEl.textContent="Authority "+G.authority+"   arrests "+G.arrests+
    (G.wounds?"   wounded":"");
  fitText();
}
const OUTCOME_LINES={
  disarmed:"His gun is in the dust and his wrists are in irons.",
  killed_him:"He is dead in the street, and the street saw who fired.",
  innocent_killed:"He never went for a gun. Gold Gulch watched you shoot him anyway.",
  missed_him:"Your shot goes into the facade behind him. Nobody moves.",
  wounded:"You are hit, and on your feet, which is more than some manage.",
  doctor_saved:"The doctor has you inside and the ball out before the dust settles.",
  doctor_came:"The doctor comes, unhurried, and does the work without looking at you.",
  turns_away:"He turns and walks, which is not the same as leaving.",
  surrendered:"Hands up, gun in the dust, and a walk to the jail ahead of you.",
  departed:"He goes, and the street closes behind him.",
  walked_away:"He looks at the gun in your hand, thinks better of all of it, and leaves.",
  job_stopped:"You were waiting for them. It was over before the horses were tied.",
  job_missed:"It happened while you were up the street, and nobody had told you it would.",
  unwritten:"[this caller is not written yet]"
};
const outcomeLine=()=>OUTCOME_LINES[G.outcome]||"The matter settles.";
function paintSummary(){
  const o=G.over;
  lineEls[0].className="npc";
  lineEls[0].textContent=(o.alive?"SUNDOWN":"THE STREET KEPT YOU")+" — "+o.score+" points";
  const cats=Object.entries(o.categories);
  lineEls[1].className="choice dim"; lineEls[1].textContent=cats.slice(0,3).map(([k,v])=>k+" · "+v).join("     ");
  lineEls[2].className="choice dim"; lineEls[2].textContent=cats.slice(3,5).map(([k,v])=>k+" · "+v).join("     ");
  lineEls[3].className="choice dim"; lineEls[3].textContent=cats.slice(5).map(([k,v])=>k+" · "+v).join("     ");
  lineEls[4].className="choice sel"; lineEls[4].textContent="1. Ride in again";
  scoreEl.textContent=o.score+" points";
  modeEl.textContent="SUNDOWN";
  fitText();
}

/* ---- full screen ---- *
 * The game is meant to be launched in it: pinning on the badge is a gesture,
 * which is the only moment a browser grants fullscreen. EXIT, g or F11 stays
 * in the page, and that choice is the one remembered. */
const NAV=typeof navigator==="object"&&navigator?navigator:null;
const bodyEl=document.body||{classList:{add(){},remove(){}}};
const fullBtn=document.getElementById("full");
let gameMode=false, wakeLock=null;
function readGameModePref(){
  let want=true;
  try{const pref=localStorage.getItem("lotw.gamemode"); if(pref!==null)want=pref==="1";}
  catch(e){}                            // private windows and blocked storage
  return want;
}
let wantGameMode=readGameModePref();
const fsElement=()=>document.fullscreenElement||document.webkitFullscreenElement||null;
function requestFS(){
  const el=document.documentElement; if(!el)return;
  try{const r=el.requestFullscreen?.({navigationUI:"hide"})??el.webkitRequestFullscreen?.();
    if(r&&r.catch)r.catch(()=>{});}catch(e){}
}
function exitFS(){try{const r=document.exitFullscreen?.()??document.webkitExitFullscreen?.();
  if(r&&r.catch)r.catch(()=>{});}catch(e){}}
function keepAwake(){if(!NAV?.wakeLock?.request)return;
  try{NAV.wakeLock.request("screen").then(l=>{wakeLock=l;}).catch(()=>{});}catch(e){}}
function releaseAwake(){try{wakeLock?.release?.();}catch(e){}wakeLock=null;}
function setGameMode(on){
  gameMode=!!on; wantGameMode=gameMode;
  bodyEl.classList?.[gameMode?"add":"remove"]("gamemode");
  fullBtn?.setAttribute?.("aria-pressed",gameMode?"true":"false");
  if(fullBtn)fullBtn.textContent=gameMode?"EXIT":"FULL";
  try{localStorage.setItem("lotw.gamemode",gameMode?"1":"0");}catch(e){}
  if(gameMode)keepAwake(); else releaseAwake();
  fit(); paint();
}
function toggleGameMode(){
  if(gameMode){exitFS();setGameMode(false);}
  else{setGameMode(true);requestFS();}
}
function enterGameModeIfWanted(){if(wantGameMode&&!gameMode){setGameMode(true);requestFS();}}
document.addEventListener?.("fullscreenchange",()=>{if(!fsElement()&&gameMode)setGameMode(false);});
document.addEventListener?.("webkitfullscreenchange",()=>{if(!fsElement()&&gameMode)setGameMode(false);});
for(const t of ["gesturestart","gesturechange","gestureend"])
  document.addEventListener?.(t,e=>{e.preventDefault?.();});
const inUI=e=>!!e.target?.closest?.("#app");
document.addEventListener?.("contextmenu",e=>{if(gameMode||inUI(e))e.preventDefault?.();});
document.addEventListener?.("dblclick",e=>{if(gameMode)e.preventDefault?.();});
document.addEventListener?.("visibilitychange",()=>{if(!document.hidden&&gameMode)keepAwake();});

/* ---- input, one control set for the pad and the keyboard ---- */
/* The theme belongs to the title screen, and it needs a gesture before the
 * audio context exists at all, so the first tap or key is where it starts. */
let themePlayed=false;
function firstGesture(){
  if(themePlayed||G.phase!=="intro")return;
  themePlayed=true; SND.title();
}
function startDay(){
  SND.unlock(); started=true; enterGameModeIfWanted();
  SND.dawn();
  G=newDay({}); cursor=0; said=""; react="";
  beginEncounter(G); openDialogue(G); newScene();
  SND.badge();
}
/* Each visitor is audible before he is visible: his own arrival over the door
 * and the boardwalk. */
function newScene(){
  build={at:performance.now(),rows:0};
  said=""; react=""; cursor=0;
  SND.door(); setTimeout(()=>SND.step(),260);
  const e=who(G);
  (e&&e.arrive||[]).forEach((cue,i)=>{
    if(typeof SND[cue]==="function")setTimeout(()=>SND[cue](),420+i*520);
  });
}
function up(){
  if(G.phase==="intro")return;
  if(G.mode==="talk"&&(G.phase==="dialogue"||G.phase==="tell")){
    drawGun(G,performance.now()); drawnAt=performance.now();
    SND.holster(); SND.cock(); setTimeout(()=>SND.aim(),140); paint(); return;
  }
  if(G.mode==="gun"){moveAim(G,0,-1);SND.click();}
}
function down(){
  if(G.mode==="gun"){
    // down walks the crosshair down the scene; pulled past the bottom it
    // holsters, which is the way out of a stand-off. HOL and Escape do it at once.
    if(G.aim.y>=0.995){holster(G);SND.holster();paint();return;}
    moveAim(G,0,1); SND.click(); return;
  }
  if(G.phase==="dialogue"&&build.rows>=10){cursor=(cursor+1)%4;SND.click();paint();}
}
function left(){if(G.mode==="gun"){moveAim(G,-1,0);SND.click();}
  else if(G.phase==="dialogue"){cursor=(cursor+3)%4;SND.click();paint();}}
function right(){if(G.mode==="gun"){moveAim(G,1,0);SND.click();}
  else if(G.phase==="dialogue"){cursor=(cursor+1)%4;SND.click();paint();}}
function fire(){
  if(G.phase==="intro"){startDay();paint();return;}
  if(G.phase==="summary"){startDay();paint();return;}
  if(G.phase==="resolve"){advance();return;}
  if(G.mode==="gun"){
    if(G.duel&&G.duel.fired){SND.dryfire();return;}      // that chamber is spent
    const lat=Math.round(performance.now()-(G.tell?G.tell.at:drawnAt));
    SND.gunshot(); flash=0.16;
    const before=G.outcome;
    shoot(G,Math.max(60,lat));
    afterShot(before);
    return;
  }
  if(G.phase!=="dialogue"||build.rows<10)return;
  const b=beat(); if(!b){SND.deny();return;}
  const chosen=b.replies[cursor]; if(!chosen){SND.deny();return;}
  SND.select();
  say(G,cursor);
  if(G.phase==="tell"){G.tell.at=performance.now();SND.tell();SND.tension();}
  if(G.phase==="resolve")settleSound();
  paint();
}
function choose(i){                       // the 1-4 keys and the tapped lines
  if(G.phase==="intro"){startDay();paint();return;}
  if(G.phase!=="dialogue"||G.mode!=="talk")return;
  cursor=Math.max(0,Math.min(3,i)); fire();
}
function afterShot(before){
  const d=G.duel;
  if(!d)return;
  settleSound();
  if(G.phase==="summary")endSound();
  paint();
}
function settleSound(){
  const o=G.outcome;
  const flags=(G.ending&&G.ending.flags)||[];
  if(flags.indexOf("offended")>=0)SND.penalty();
  if(flags.some(f=>f.indexOf("tip_")===0)){SND.clue();SND.point();}
  else if(o==="surrendered"){SND.respect();SND.thread();}
  else if(o==="departed"||o==="walked_away"||o==="turns_away")SND.step();
  else if(o==="disarmed"){SND.ricochet();SND.wound();}
  else if(o==="killed_him"){SND.hit();SND.death();bodyFall=0.01;}
  else if(o==="innocent_killed"){SND.hit();SND.death();SND.disgrace();bodyFall=0.01;}
  else if(o==="missed_him"){SND.ricochet();setTimeout(()=>SND.graze(),220);}
  else if(o==="wounded"){SND.gunshot();SND.hit();}
  else if(o==="doctor_saved"||o==="doctor_came"){SND.gunshot();SND.hit();setTimeout(()=>SND.patch(),400);}
  else if(o==="job_stopped"){SND.thread();SND.respect();}
  else if(o==="job_missed"){SND.alarm();SND.robbery();}
  else SND.clock();
  if(o==="killed_him"||o==="innocent_killed")setTimeout(()=>SND.churchbell(),900);
  if(G.duel&&G.duel.fired)setTimeout(()=>SND.reload(),1200);
  if(G.phase==="summary")endSound();
}
function endSound(){
  SND.dusk();
  setTimeout(()=>{(G.over&&G.over.score>=400)?SND.respect():SND.disgrace();},700);
}
function advance(){
  if(G.phase==="summary")return;
  const r=nextEncounter(G);
  if(G.phase==="summary"){endSound();paint();return;}
  openDialogue(G); newScene(); SND.clock(); SND.wind(); paint();
}
const CONTROL={up,down,left,right,fire,
  full:toggleGameMode,
  holster:()=>{holster(G);paint();},
  mute:()=>{const on=SND.toggle();muteBtn.textContent=on?"SOUND ON":"SOUND OFF";
    muteBtn.setAttribute("aria-pressed",on?"true":"false");}};
/* Every on-screen control carries data-cmd; the same names are the key map, so
 * a control can never exist that no handler covers.
 *
 * A press takes pointer capture, so a thumb that slides off the button keeps
 * the gesture instead of handing it to the page as a text selection, and a
 * held direction repeats: 320ms, then every 90ms. Holding a control now does
 * what holding a control should, which is also why the browser never gets long
 * enough to decide the player meant to select something. */
const REPEAT_DELAY=320, REPEAT_RATE=90;
const REPEATS=new Set(["up","down","left","right"]);
let held=null;                        // {cmd, at, next, el}
function runCmd(cmd,el){
  if(cmd==="choose")choose(+el.dataset.index);
  else if(CONTROL[cmd])CONTROL[cmd]();
  else SND.deny();
  paint();
}
function releaseHeld(){
  if(held&&held.el&&held.el.classList)held.el.classList.remove("on");
  held=null;
}
document.querySelectorAll("[data-cmd]").forEach(el=>{
  el.addEventListener("pointerdown",e=>{
    e.preventDefault(); SND.unlock(); firstGesture();
    const cmd=el.dataset.cmd;
    // capture can throw if the pointer has already gone; the press still counts
    try{el.setPointerCapture?.(e.pointerId);}catch(err){}
    runCmd(cmd,el);
    if(REPEATS.has(cmd))held={cmd,el,next:performance.now()+REPEAT_DELAY};
  });
  for(const t of ["pointerup","pointercancel","lostpointercapture","pointerleave"])
    el.addEventListener(t,()=>{if(held&&held.el===el)releaseHeld();});
});
/* Nothing on this page is text to be selected or dragged. */
document.addEventListener?.("selectstart",e=>{
  if(!e.target?.closest?.("input,textarea"))e.preventDefault?.();
});
document.addEventListener?.("dragstart",e=>e.preventDefault?.());
addEventListener("blur",releaseHeld);
const KEYS={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",
  Enter:"fire"," ":"fire",Escape:"holster",m:"mute",g:"full",F11:"full"};
addEventListener("keydown",e=>{
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  SND.unlock(); firstGesture();
  if(/^[1-4]$/.test(e.key)){e.preventDefault();choose(+e.key-1);paint();return;}
  const cmd=KEYS[e.key]||KEYS[(e.key||"").toLowerCase()];
  if(!cmd)return;
  e.preventDefault();
  CONTROL[cmd]();
  paint();
});

/* ---- the loop ----
 * One rAF loop, wrapped. Where there is no rAF - a headless harness - the
 * frame function is exposed instead so a test can step time itself. */
const RAF=typeof requestAnimationFrame==="function"?requestAnimationFrame:null;
function frame(now){
  try{
    if(build.rows<10&&now-build.at>60*build.rows){
      build.rows++;
      if(build.rows===10){if(G.phase!=="intro")SND.creak();paint();}
    }
    if(held&&now>=held.next){held.next=now+REPEAT_RATE;runCmd(held.cmd,held.el);}
    if(flash>0)flash-=1/60;
    if(bodyFall>0&&bodyFall<1.4)bodyFall+=0.06;
    if(G.phase!=="intro"&&G.phase!=="summary"){
      const before=G.phase;
      const ev=tick(G,now);
      if(ev&&G.phase==="resolve"){settleSound();paint();}
      if(before==="tell"&&G.phase==="duel"){SND.holster();}
    }
    drawScene(now);
  }catch(err){console.error(err);}
  if(RAF)RAF(frame);
}
globalThis.__frame=frame;
fit(); paint(); if(RAF)RAF(frame);
