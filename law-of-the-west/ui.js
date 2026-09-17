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

let G=newGame({}), cursor=0, started=false, lastFrame=0, drawnAt=0, firedLatency=null;
let build={at:0,rows:0};            // the block-load cadence
let flash=0, bodyFall=0, said="", react="";

/* ---- layout: the canvas keeps the scene's proportions inside the top half ---- */
function fit(){
  const r=cv.getBoundingClientRect(), d=Math.min(devicePixelRatio||1,2.5);
  cv.width=Math.max(160,Math.round(r.width*d));
  cv.height=Math.max(100,Math.round(r.height*d));
}
addEventListener("resize",fit);
const sceneGeom=()=>{
  const sc=Math.min(cv.width/SCENE.w,cv.height/SCENE.h);
  return {sc,ox:(cv.width-SCENE.w*sc)/2,oy:(cv.height-SCENE.h*sc)/2};
};

/* ---- the town, drawn as flat blocks in the machine's own manner ---- */
const PAL={sky:"#e8b46a",sky2:"#c9813f",dust:"#c49a63",road:"#a87f4e",
  wood:"#6b4a2a",wood2:"#54381f",dark:"#2a1c10",glass:"#3b2a18",sign:"#e8cf6a",
  skin:"#e0ac7a",steel:"#9aa0a8",cuff:"#4a5d80",ink:"#f2e6d2"};
const LOOK={
  deputy:{coat:"#3f4a60",hat:"#22293a"}, rainmaker:{coat:"#2e2a2c",hat:"#191718"},
  surveyor:{coat:"#5a6a5a",hat:"#e8dcc0"}, widow:{coat:"#4a3a44",hat:"#2a2028"},
  tuner:{coat:"#6a5a3a",hat:"#3a2f1e"},   locket:{coat:"#9a7a4a",hat:"#7a5a30"}};
function facade(name){
  ctx.fillStyle=PAL.wood;  ctx.fillRect(0,26,SCENE.w,86);
  ctx.fillStyle=PAL.wood2; ctx.fillRect(0,26,SCENE.w,8);
  for(let i=0;i<9;i++){ctx.fillStyle="rgba(0,0,0,.08)";ctx.fillRect(0,38+i*9,SCENE.w,2);}
  ctx.fillStyle=PAL.glass; ctx.fillRect(28,52,54,44); ctx.fillRect(238,52,54,44);
  ctx.fillStyle="rgba(232,207,106,.14)"; ctx.fillRect(30,54,50,40);
  ctx.fillStyle=PAL.dark;  ctx.fillRect(140,48,42,64);
  ctx.fillStyle=PAL.sign;  ctx.font="700 11px monospace";
  ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(name,SCENE.w/2,32);
}
/* The visitor, facing the camera. Hitboxes in content.js follow this drawing. */
function visitor(c,armState){
  const look=LOOK[c.id]||LOOK.deputy, cx=FIG.cx, ground=FIG.ground;
  ctx.fillStyle="rgba(60,40,22,.35)";
  ctx.beginPath();ctx.ellipse(cx,ground+2,20,5,0,0,7);ctx.fill();
  ctx.fillStyle=look.coat; ctx.fillRect(cx-17,ground-58,34,44);       // torso
  ctx.fillRect(cx-15,ground-16,12,16); ctx.fillRect(cx+3,ground-16,12,16);
  ctx.fillStyle=PAL.dark; ctx.fillRect(cx-16,ground-4,13,5); ctx.fillRect(cx+3,ground-4,13,5);
  ctx.fillStyle=PAL.skin; ctx.fillRect(cx-8,ground-76,16,19);         // face
  ctx.fillStyle=PAL.dark; ctx.fillRect(cx-5,ground-70,4,3); ctx.fillRect(cx+2,ground-70,4,3);
  ctx.fillStyle=look.hat; ctx.fillRect(cx-19,ground-78,38,5); ctx.fillRect(cx-10,ground-88,20,11);
  ctx.fillStyle=PAL.dark; ctx.fillRect(cx-17,ground-22,34,5);         // gunbelt
  const arm=armState||0;                                               // 0 hanging, 1 rising, 2 levelled
  const hx=FIG.handX, hy=ground-(arm===0?46:arm===1?62:74);
  ctx.fillStyle=look.coat; ctx.fillRect(cx-25,ground-56,9,arm===0?30:18);
  ctx.fillStyle=PAL.skin;  ctx.fillRect(hx-5,hy,11,8);
  if(c.armed){ctx.fillStyle=PAL.steel;ctx.fillRect(hx-13,hy+1,10,5);
    ctx.fillStyle=PAL.dark;ctx.fillRect(hx-4,hy+5,5,5);}
}
/* Our own side of it: the sheriff's right arm and gun across the low corner. */
function ownGun(out){
  const y=SCENE.h-(out?118:88);          // the sheriff's own arm, inside the frame
  ctx.fillStyle=PAL.cuff; ctx.fillRect(SCENE.w-104,y+22,64,30);
  ctx.fillStyle=PAL.skin; ctx.fillRect(SCENE.w-118,y+16,30,18);
  if(out){
    ctx.fillStyle=PAL.steel; ctx.fillRect(SCENE.w-150,y+8,42,9);
    ctx.fillStyle=PAL.dark;  ctx.fillRect(SCENE.w-126,y+17,12,14);
    ctx.fillStyle=PAL.steel; ctx.fillRect(SCENE.w-134,y+4,14,6);
  } else {
    ctx.fillStyle=PAL.dark;  ctx.fillRect(SCENE.w-120,y+30,22,16);   // holstered
    ctx.fillStyle=PAL.steel; ctx.fillRect(SCENE.w-116,y+26,10,6);
  }
}
function crosshair(){
  const a=G.aim, x=a.x*SCENE.w, y=a.y*SCENE.h;   // the same mapping boxAt uses
  ctx.strokeStyle=PAL.ink; ctx.lineWidth=1.4;
  ctx.beginPath();ctx.arc(x,y,9,0,7);ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x-15,y);ctx.lineTo(x-4,y); ctx.moveTo(x+4,y);ctx.lineTo(x+15,y);
  ctx.moveTo(x,y-15);ctx.lineTo(x,y-4); ctx.moveTo(x,y+4);ctx.lineTo(x,y+15);
  ctx.stroke();
}
function drawScene(now){
  const g=sceneGeom();
  ctx.fillStyle="#000"; ctx.fillRect(0,0,cv.width,cv.height);
  ctx.save(); ctx.translate(g.ox,g.oy); ctx.scale(g.sc,g.sc);
  const c=who(G);
  const sky=["#f2c988","#e8b46a","#dda059","#c9813f"];
  for(let i=0;i<4;i++){ctx.fillStyle=sky[i];ctx.fillRect(0,i*7,SCENE.w,7);}
  ctx.fillStyle=PAL.dust; ctx.fillRect(0,26,SCENE.w,SCENE.h-26);
  if(c)facade(c.place||"STREET");
  ctx.fillStyle=PAL.road; ctx.fillRect(0,112,SCENE.w,SCENE.h-112);
  if(c&&build.rows>=6){
    const arm=G.duel?(G.duel.drawn?2:1):(G.phase==="tell"?1:0);
    if(G.outcome==="killed_him"||G.outcome==="murder"){
      ctx.save();ctx.translate(SCENE.w*0.46,170);ctx.rotate(Math.min(1.4,bodyFall));
      ctx.translate(-SCENE.w*0.46,-170);visitor(c,0);ctx.restore();
    } else visitor(c,arm);
  }
  ownGun(G.mode==="gun");
  if(G.mode==="gun"&&build.rows>=6)crosshair();
  if(flash>0){ctx.fillStyle="rgba(255,242,192,"+Math.min(1,flash*6)+")";
    ctx.fillRect(0,0,SCENE.w,SCENE.h);}
  // the block-load cadence: the scene arrives in rows before anything is live
  if(build.rows<10){
    ctx.fillStyle="#000";
    ctx.fillRect(0,build.rows*(SCENE.h/10),SCENE.w,SCENE.h-build.rows*(SCENE.h/10));
  }
  ctx.fillStyle="rgba(20,14,8,.6)"; ctx.fillRect(0,SCENE.h-12,SCENE.w,12);
  ctx.fillStyle=PAL.ink; ctx.font="700 8px monospace";
  ctx.textAlign="left"; ctx.textBaseline="middle";
  ctx.fillText((c?c.title.toUpperCase():"GOLD GULCH")+"   "+(G.slot+1)+" OF "+ENCOUNTERS.length,5,SCENE.h-6);
  ctx.textAlign="right";
  ctx.fillText(G.wounds?"WOUNDED":"UNHURT",SCENE.w-5,SCENE.h-6);
  ctx.restore();
}

/* ---- the five-line matrix ---- */
function beat(){const e=who(G);return e?turnFor(e.id,G.turn):null;}
function paint(){
  const b=beat(), live=build.rows>=10;
  if(G.phase==="summary"){return paintSummary();}
  if(G.phase==="intro"){
    lineEls[0].textContent="LAW OF THE WEST — GOLD GULCH";
    lineEls[0].className="npc";
    lineEls[1].textContent="Press FIRE or Enter to pin on the badge";
    lineEls[1].className="choice sel";
    const written=ENCOUNTERS.filter(e=>Array.isArray(DIALOGUE[e.id])).length;
    lineEls[2].textContent=written+" of "+ENCOUNTERS.length+
      " encounters written. The rest are walked past for now."+
      (gameMode?"":"  ·  It opens full screen; EXIT or g stays in the page.");
    lineEls[2].className="choice dim";
    for(let i=3;i<5;i++){lineEls[i].textContent="";lineEls[i].className="choice";}
    modeEl.textContent="GOLD GULCH"; scoreEl.textContent="";
    return;
  }
  lineEls[0].className="npc";
  if(G.phase==="resolve"){
    lineEls[0].textContent=G.ending?G.ending.text:outcomeLine();
    lineEls[1].textContent=(G.slot>=ENCOUNTERS.length-1)?"1. End the day":"1. Walk on down the street";
    lineEls[1].className="choice sel";
    for(let i=2;i<5;i++){lineEls[i].textContent="";lineEls[i].className="choice";}
    scoreEl.textContent="Standing "+G.points+"   clues "+G.clues.length;
    modeEl.textContent=who(G)?who(G).title.toUpperCase():"";
    return;
  }
  lineEls[0].textContent=!b?"["+(who(G)?who(G).title:"this encounter")+" is not written yet]"
    :(react||said||b.say);
  const replies=b?b.replies:[];
  for(let i=0;i<4;i++){
    const r=replies[i];
    lineEls[i+1].textContent=r?(i+1)+". "+r.t:"";
    lineEls[i+1].className="choice"+(live&&G.mode==="talk"&&cursor===i?" sel":"")+
      (G.mode==="gun"?" dim":"");
  }
  modeEl.textContent=G.mode==="gun"?"GUN DRAWN — down to holster":"TALKING — up to draw";
  scoreEl.textContent="Standing "+G.points+"   clues "+G.clues.length;
}
const OUTCOME_LINES={
  disarmed:"His gun is in the dust and his wrists are in irons.",
  killed_him:"He is dead on the boardwalk, and the street saw who fired.",
  murder:"You shot a man whose hand never moved. The street saw that too.",
  missed_him:"Your shot goes into the facade behind him. Nobody moves.",
  wound_consequence:"You are hit. It will keep until sundown, and no longer.",
  rescued_from_street:"A wagon you did not send comes up the street. Somebody who owes you a favour gets you off it and closes the hole.",
  walked_away:"He looks at the gun in your hand, decides against all of it, and leaves.",
  unwritten:"[this encounter has no authored ending yet]"
};
const outcomeLine=()=>OUTCOME_LINES[G.outcome]||"The matter settles.";
function paintSummary(){
  const o=G.over;
  lineEls[0].className="npc";
  lineEls[0].textContent="RATING "+o.rating+" OF 12 — "+o.verdict.toUpperCase();
  const cats=Object.entries(o.categories);
  lineEls[1].className="choice"; lineEls[1].textContent=cats.slice(0,3).map(([k,v])=>k+" "+v).join("   ");
  lineEls[2].className="choice"; lineEls[2].textContent=cats.slice(3,5).map(([k,v])=>k+" "+v).join("   ");
  lineEls[3].className="choice"; lineEls[3].textContent=cats.slice(5).map(([k,v])=>k+" "+v).join("   ");
  lineEls[4].className="choice sel"; lineEls[4].textContent="1. Ride in again";
  scoreEl.textContent="Standing "+o.points;
  modeEl.textContent="SUNDOWN";
}

/* ---- full game mode ---- */
const NAV=typeof navigator==="object"&&navigator?navigator:null;
const bodyEl=document.body||{classList:{add(){},remove(){}}};
const fullBtn=document.getElementById("full");
let gameMode=false, wakeLock=null;
/* Full screen is how the game is meant to be launched, so it is the default:
 * the first gesture - pinning on the badge - asks for it. EXIT or g turns it
 * off and that choice is what gets remembered. */
function readGameModePref(){
  let want=true;                        // full screen unless told otherwise
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
/* Fullscreen is only granted inside a user gesture, so every caller is a tap
 * or a key. Where the API is missing - iPhone Safari - the layout still goes. */
function toggleGameMode(){
  if(gameMode){exitFS();setGameMode(false);}
  else{setGameMode(true);requestFS();}
}
function enterGameModeIfWanted(){if(wantGameMode&&!gameMode){setGameMode(true);requestFS();}}
document.addEventListener?.("fullscreenchange",()=>{if(!fsElement()&&gameMode)setGameMode(false);});
document.addEventListener?.("webkitfullscreenchange",()=>{if(!fsElement()&&gameMode)setGameMode(false);});
for(const t of ["gesturestart","gesturechange","gestureend"])
  document.addEventListener?.(t,e=>{e.preventDefault?.();});
document.addEventListener?.("contextmenu",e=>{if(gameMode||e.target?.closest?.("[data-cmd]"))e.preventDefault?.();});
document.addEventListener?.("dblclick",e=>{if(gameMode)e.preventDefault?.();});
document.addEventListener?.("visibilitychange",()=>{if(!document.hidden&&gameMode)keepAwake();});

/* ---- input, one control set for the pad and the keyboard ---- */
function startDay(){
  SND.unlock(); started=true; enterGameModeIfWanted();
  G=newGame({}); cursor=0; said=""; react="";
  beginSlot(G); openDialogue(G); newScene();
  SND.badge();
}
function newScene(){
  build={at:performance.now(),rows:0};
  said=""; react=""; cursor=0;
  SND.door(); setTimeout(()=>SND.step(),260);
}
function up(){
  if(G.phase==="intro")return;
  if(G.mode==="talk"&&(G.phase==="dialogue"||G.phase==="tell")){
    drawGun(G,performance.now()); drawnAt=performance.now(); SND.holster(); paint(); return;
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
    const lat=Math.round(performance.now()-(G.tell?G.tell.at:drawnAt));
    SND.gunshot(); flash=0.16;
    const before=G.outcome;
    shoot(G,Math.max(60,lat));
    afterShot(before);
    return;
  }
  if(G.phase!=="dialogue"||build.rows<10)return;
  const b=beat(); if(!b){SND.deny();return;}
  const replies=b.replies.filter(r=>r.tone!=="draw");
  const chosen=replies[cursor]; if(!chosen){SND.deny();return;}
  SND.select();
  const r=respond(G,b.replies.indexOf(chosen));
  react=r&&r.react?r.react:"";
  if(G.phase==="tell"){G.tell.at=performance.now();SND.tell();SND.tension();}
  if(G.phase==="resolve")settleSound();
  paint();
}
function choose(i){                       // the 1-4 keys and the tapped lines
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
  if(G.ending){                                   // an authored ending
    if(G.ending.award==="arrest"){SND.thread();SND.respect();}
    else if(G.ending.award==="talked"){SND.clue();SND.point();}
    else if(G.ending.points<0){SND.alarm();SND.penalty();}
    else SND.clock();
    if(G.ending.fx&&G.ending.fx.clue)SND.clue();
  }
  else if(o==="disarmed"){SND.ricochet();SND.wound();}
  else if(o==="killed_him"){SND.hit();SND.death();bodyFall=0.01;}
  else if(o==="murder"){SND.hit();SND.death();SND.disgrace();bodyFall=0.01;}
  else if(o==="missed_him")SND.ricochet();
  else if(o==="wound_consequence"){SND.gunshot();SND.hit();}
  else if(o==="rescued_from_street"){SND.gunshot();SND.hit();setTimeout(()=>SND.patch(),400);}
  else if(o==="walked_away")SND.step();
  else SND.clock();
  if(G.phase==="summary")endSound();
}
function endSound(){
  SND.dusk();
  setTimeout(()=>{(G.over&&G.over.rating>=7)?SND.respect():SND.disgrace();},700);
}
function advance(){
  if(G.phase==="summary")return;
  const r=nextSlot(G);
  if(G.phase==="summary"){endSound();paint();return;}
  openDialogue(G); newScene(); SND.clock(); paint();
}
const CONTROL={up,down,left,right,fire,
  full:toggleGameMode,
  holster:()=>{holster(G);paint();},
  mute:()=>{const on=SND.toggle();muteBtn.textContent=on?"SOUND ON":"SOUND OFF";
    muteBtn.setAttribute("aria-pressed",on?"true":"false");}};
/* Every on-screen control carries data-cmd; the same names are the key map, so
 * a control can never exist that no handler covers. */
document.querySelectorAll("[data-cmd]").forEach(el=>{
  el.addEventListener("pointerdown",e=>{
    e.preventDefault(); SND.unlock();
    const cmd=el.dataset.cmd;
    if(cmd==="choose")choose(+el.dataset.index);
    else if(CONTROL[cmd])CONTROL[cmd]();
    else SND.deny();
    paint();
  });
});
const KEYS={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",
  Enter:"fire"," ":"fire",Escape:"holster",m:"mute",g:"full",F11:"full"};
addEventListener("keydown",e=>{
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  SND.unlock();
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
