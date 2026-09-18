/* ============ engine ============
 * The day, the trees, the gun and the reckoning. No DOM, no words.
 *   intro -> approach -> dialogue -> aiming -> tell -> duel -> resolve
 *         -> interlude -> summary
 * Everything random goes through G.rng so a test can seed it.
 */
"use strict";

const RULES={
  ROUNDS:3,
  TELL_MIN:400, TELL_MAX:900,
  TELLS:{ambush:[120,260], delayed:[300,620], draw:[380,820]},
  FIRE_MIN:260, FIRE_MAX:420,
  REFLEX_MIN:1500, REFLEX_MAX:2600,
  AIM_STEP:0.04, AIM_FLOOR:120, AIM_CEIL:500,
  SIGMA_WIDE:0.95, SIGMA_TIGHT:0.42,
  ZONE_TIGHT:0.30, ZONE_WIDE:0.62,
  WOUNDS:2
};
/* Which job comes off after which caller, if the sheriff never heard of it. */
const INTERLUDES=[{after:3,job:"train"},{after:7,job:"stage"},{after:9,job:"bank"}];

const mulberry32=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);
  t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
const rnd=(g,a,b)=>a+(b-a)*g.rng();
function absNormal(g,sigma){
  const u=Math.max(1e-9,g.rng()), v=g.rng();
  return Math.abs(Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v))*sigma;
}

function newDay(opts){
  const seed=opts&&opts.seed;
  return {
    phase:"intro", encounter:0, node:"opening", round:1,
    rng:seed==null?Math.random:mulberry32(seed),
    alive:true, wounds:0,
    authority:0, arrests:0, dates:0, badGuysShot:0, innocentsKilled:0, crimesMissed:0,
    tips:{train:false,stage:false,bank:false},
    doctor:{met:false,disposition:0,sober:true,alive:true},
    met:[], flags:[], log:[], results:[],
    mode:"talk", aim:{x:0.5,y:0.5}, reflex:null, pending:null,
    duel:null, tell:null, outcome:null, ending:null, interlude:null, over:null
  };
}
const newGame=newDay;                      // the page calls it this
const who=G=>CAST[G.encounter]||null;
const nodeOf=G=>{const e=who(G);return e&&e.rounds?e.rounds[G.node]:null;};

/* ---- arrival and conversation ---- */
function beginEncounter(G){
  const e=who(G);
  if(!e)return finish(G,"dusk");
  G.phase="approach"; G.node="opening"; G.round=1;
  G.outcome=null; G.ending=null; G.duel=null; G.tell=null;
  G.mode="talk"; G.reflex=null; G.aim={x:0.5,y:0.5};
  if(e.doctor)G.doctor.met=true;
  if(!G.met.includes(e.id))G.met.push(e.id);
  return e;
}
function openDialogue(G){
  const e=who(G);
  if(!e)return finish(G,"dusk");
  if(e.forcedDuel)return theyDraw(G,"draw");           // the last one never talks
  if(!written(e))return resolve(G,"unwritten");
  G.phase="dialogue"; return nodeOf(G);
}
/* One of four replies. Each either goes a round deeper, ends the encounter,
 * or is answered with a hand rather than a sentence. */
function say(G,index){
  if(G.phase!=="dialogue")return null;
  const n=nodeOf(G); if(!n)return null;
  const reply=n.replies[index]; if(!reply)return null;
  if(reply.action)return act(G,reply.action);
  if(reply.end)return terminal(G,reply.end);
  if(reply.next){
    G.node=reply.next; G.round++;
    if(G.round>RULES.ROUNDS)return terminal(G,Object.keys(who(G).ends)[0]);
    return {next:nodeOf(G)};
  }
  return null;
}
function act(G,kind){
  if(kind==="draw")return theyDraw(G,"draw");
  if(kind==="ambush")return theyDraw(G,"ambush");
  if(kind==="delayed"){G.pending="delayed";return resolve(G,"turns_away");}
  if(kind==="surrender"){
    G.arrests++; G.authority+=1; G.flags.push("surrender","arrest");
    return resolve(G,"surrendered");
  }
  if(kind==="depart"){G.flags.push("depart");return resolve(G,"departed");}
  return resolve(G,"nothing");
}
function terminal(G,id){
  const e=who(G), t=e.ends&&e.ends[id];
  if(!t)return resolve(G,"nothing");
  G.ending=t;
  for(const f of t.flags||[]){
    G.flags.push(f);
    if(f==="tip_train")G.tips.train=true;
    if(f==="tip_stage")G.tips.stage=true;
    if(f==="tip_bank")G.tips.bank=true;
    if(f==="date")G.dates++;
    if(f==="arrest")G.arrests++;
    if(f==="doctor_civil")G.doctor.disposition+=1;
    if(f==="doctor_insulted")G.doctor.disposition-=2;
  }
  G.authority+=t.authority||0;
  return resolve(G,id);
}

/* ---- the gun, which is always available ---- */
function drawGun(G,nowMs){
  if(G.mode==="gun")return G.mode;
  G.mode="gun"; G.aim={x:0.5,y:0.5};
  if(G.phase==="dialogue")G.phase="aiming";            // drawing interrupts anything
  G.reflex={at:nowMs||0,limit:Math.round(rnd(G,RULES.REFLEX_MIN,RULES.REFLEX_MAX))};
  return G.mode;
}
function holster(G){
  if(G.mode!=="gun")return G.mode;
  G.mode="talk"; G.reflex=null;
  if(G.phase==="aiming")G.phase="dialogue";
  return G.mode;
}
function moveAim(G,dx,dy){
  if(G.mode!=="gun")return null;
  G.aim.x=Math.max(0,Math.min(1,G.aim.x+dx*RULES.AIM_STEP));
  G.aim.y=Math.max(0,Math.min(1,G.aim.y+dy*RULES.AIM_STEP));
  return G.aim;
}
function tick(G,nowMs){
  if(G.reflex&&nowMs-G.reflex.at>=G.reflex.limit){
    const e=who(G); G.reflex=null;
    if(e&&e.armed)return takeHit(G,"he answered the gun in his face");
    return resolve(G,"walked_away");
  }
  if(G.phase==="tell"&&G.tell&&nowMs-G.tell.at>=G.tell.delay){G.phase="duel";G.duel.drawn=true;}
  if(G.phase==="duel"&&G.duel&&G.duel.drawn&&!G.duel.fired&&G.tell){
    if(nowMs-(G.tell.at+G.tell.delay)>=G.duel.fireDelay){
      G.duel.fired=true; G.duel.result="too_slow";
      return takeHit(G,"outdrawn");
    }
  }
  return null;
}
const inBox=(px,py,b)=>px>=b.x&&px<=b.x+b.w&&py>=b.y&&py<=b.y+b.h;
const weaponBox=G=>(G.duel&&(G.duel.drawn||G.duel.initiator==="you"))?HITBOX.weaponRaised:HITBOX.weapon;
function boxAt(G,x,y){
  const px=x*SCENE.w, py=y*SCENE.h;
  if(inBox(px,py,weaponBox(G)))return "weapon";
  if(inBox(px,py,HITBOX.lethal))return "lethal";
  return null;
}
const boxCentre=b=>({x:(b.x+b.w/2)/SCENE.w,y:(b.y+b.h/2)/SCENE.h});
function aimAt(G,zone){
  G.aim=boxCentre(zone==="arm"?weaponBox(G):HITBOX.lethal);
  if(G.duel)G.duel.zone=zone;
  return zone;
}
function theyDraw(G,why){
  const e=who(G);
  const span=RULES.TELLS[why]||[RULES.TELL_MIN,RULES.TELL_MAX];
  G.phase="tell";
  G.tell={at:0,why,delay:Math.round(rnd(G,span[0],span[1]))};
  G.duel={initiator:"them",drawn:false,fired:false,zone:"torso",why,
    fireDelay:Math.round(rnd(G,RULES.FIRE_MIN,RULES.FIRE_MAX)),
    latency:null,error:null,result:null};
  return {tell:G.tell,duel:G.duel};
}
function playerDraws(G){
  const e=who(G);
  G.phase="duel";
  G.duel={initiator:"you",drawn:true,fired:false,zone:"torso",unprovoked:true,
    fireDelay:Math.round(rnd(G,RULES.FIRE_MIN,RULES.FIRE_MAX)),
    latency:null,error:null,result:null};
  return {duel:G.duel};
}
/* Latency and aim are read apart: fast and wide, or slow and shot. */
function shoot(G,latencyMs){
  let d=G.duel, e=who(G);
  if(!d){playerDraws(G);d=G.duel;}
  if(!d||d.fired)return null;
  d.fired=true; d.latency=latencyMs; G.reflex=null;
  const box=boxAt(G,G.aim.x,G.aim.y);
  d.zone=box==="weapon"?"arm":(box==="lethal"?"torso":"off");
  const theirShot=(d.initiator==="them"&&G.tell)?G.tell.delay+d.fireDelay:Infinity;
  if(latencyMs>theirShot){d.result="too_slow";return takeHit(G,"outdrawn");}
  if(d.zone==="off"){d.result="miss";return theirReply(G);}
  const q=Math.max(0,Math.min(1,(latencyMs-RULES.AIM_FLOOR)/(RULES.AIM_CEIL-RULES.AIM_FLOOR)));
  const sigma=RULES.SIGMA_WIDE-(RULES.SIGMA_WIDE-RULES.SIGMA_TIGHT)*q;
  const err=absNormal(G,sigma); d.error=err;
  const other=d.zone==="torso"?"arm":"torso";
  const hit=err<RULES.ZONE_TIGHT?d.zone:(err<RULES.ZONE_WIDE?other:"miss");
  if(hit==="miss"){d.result="miss";return theirReply(G);}
  if(hit==="arm"){
    d.result="disarm"; G.arrests++; G.authority+=1; G.flags.push("arrest");
    return resolve(G,"disarmed");
  }
  d.result="kill";
  if(d.unprovoked||!e.armed){G.innocentsKilled++;G.authority-=2;return resolve(G,"innocent_killed");}
  G.badGuysShot++;
  return resolve(G,"killed_him");
}
function theirReply(G){
  const e=who(G);
  if(G.duel.initiator==="you"&&!e.armed)return resolve(G,"missed_him");
  return takeHit(G,"he answered your miss");
}
/* The doctor is the difference between a wound and a grave:
 *   insulted        the first ball is the last thing that happens to you
 *   civil and sober he has you inside and patched, and the day goes on
 *   otherwise       nobody comes; one wound is survivable, two are not
 * He must be alive and sober to be any use, however he was spoken to. */
function takeHit(G,why){
  const doc=G.doctor;
  if(doc.disposition<0){
    G.wounds++; G.alive=false;
    return finish(G,"killed",why||"the doctor would not come");
  }
  G.wounds++;
  if(doc.alive&&doc.sober&&doc.disposition>0)return resolve(G,"doctor_saved");
  if(G.wounds>=RULES.WOUNDS){
    G.alive=false;
    return finish(G,"killed",why||"bled out with nobody to send for");
  }
  return resolve(G,"wounded");
}

/* ---- resolution, interludes and the reckoning ---- */
function resolve(G,outcome){
  G.phase="resolve"; G.outcome=outcome;
  G.mode="talk"; G.reflex=null; G.aim={x:0.5,y:0.5};
  G.results.push({encounter:G.encounter,who:who(G)?who(G).id:null,outcome,
    duel:G.duel?G.duel.result:null});
  return {outcome,ending:G.ending};
}
/* A job the sheriff was warned about is one he can be standing in front of. */
function interludeDue(G){
  const done=G.encounter+1;
  return INTERLUDES.find(i=>i.after===done&&!G.results.some(r=>r.outcome==="job_"+i.job));
}
function runInterlude(G,job){
  G.interlude=job; G.phase="interlude";
  if(G.tips[job]){
    G.authority+=1;
    G.results.push({encounter:G.encounter,who:job,outcome:"job_"+job});
    return resolve(G,"job_stopped");
  }
  G.crimesMissed++;
  G.results.push({encounter:G.encounter,who:job,outcome:"job_"+job});
  return resolve(G,"job_missed");
}
function nextEncounter(G){
  if(G.phase==="summary")return null;
  if(G.pending){                         // he had not finished after all
    const why=G.pending; G.pending=null;
    G.ending=null; G.outcome=null;
    return theyDraw(G,why);
  }
  const due=interludeDue(G);
  if(due&&G.interlude!==due.job)return runInterlude(G,due.job);
  G.interlude=null;
  G.encounter++;
  if(G.encounter>=CAST.length)return finish(G,"dusk");
  return beginEncounter(G);
}
/* The seven dimensions the day is judged on. */
function finish(G,why,how){
  const cats={
    "authority maintained": G.authority,
    "crooks captured":      G.arrests,
    "romance":              G.dates,
    "bad guys shot":        G.badGuysShot,
    "wounds survived":      G.wounds,
    "innocents killed":     G.innocentsKilled,
    "crimes missed":        G.crimesMissed
  };
  const score=G.authority*40+G.arrests*120+G.dates*60+G.badGuysShot*30
    -G.innocentsKilled*200-G.crimesMissed*100-G.wounds*40+(G.alive?100:0);
  G.phase="summary";
  G.over={why,how:how||null,categories:cats,score,
    tips:{...G.tips},met:G.met.length,alive:G.alive};
  return G.over;
}
