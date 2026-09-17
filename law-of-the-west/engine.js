/* ============ engine ============
 * All rules, no DOM and no content. The state machine the UI drives:
 *   intro -> approach -> dialogue -> tell -> duel -> resolve -> summary
 * Everything random goes through G.rng so a test can seed it.               */
"use strict";

const RULES={
  BEATS:3,
  TELL_MIN:400, TELL_MAX:900,        // ms of tell before his hand moves
  FIRE_MIN:260, FIRE_MAX:420,        // ms from his draw to his shot
  REFLEX_MIN:1500, REFLEX_MAX:2600,  // how long a drawn gun is tolerated before he answers it
  AIM_STEP:0.055,                    // crosshair travel per input step, in scene widths
  AIM_FLOOR:120, AIM_CEIL:500,       // the latency window aim quality is read from
  SIGMA_WIDE:0.95, SIGMA_TIGHT:0.42, // shot spread, fast draw to steady draw
  ZONE_TIGHT:0.30, ZONE_WIDE:0.62,   // < tight hits what you aimed at, < wide hits the other
  TRUST_INFO:4, TRUST_ROMANCE:6, TRUST_ALLY:5,
  TEMP:2.5,                          // how much of an outcome is left to chance
  WOUND_HP:2,                        // wounds the sheriff survives untreated
  POINTS:{crime:200, arrest:80, talked:60, disarm:70, kill:25, romance:60,
          murder:-260, killed_needless:-90, wounded:-50, lost_fragment:-15}
};

const mulberry32=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);
  t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
const rnd=(g,a,b)=>a+(b-a)*g.rng();
const pick=(g,list)=>list[Math.floor(g.rng()*list.length)];
/* box-muller, folded: the size of a shot's error, never negative */
function absNormal(g,sigma){
  const u=Math.max(1e-9,g.rng()), v=g.rng();
  return Math.abs(Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v))*sigma;
}

function newGame(opts){
  const seed=opts&&opts.seed;
  const G={
    phase:"intro", slot:0, beat:0, rng:seed==null?Math.random:mulberry32(seed),
    trust:0, agit:0, hp:RULES.WOUND_HP, wounded:false, doctorSpent:false, treated:false,
    doctorFavour:0, metDoctor:false, aim:{x:0.5,y:0.5}, mode:"talk", reflex:null,
    fragments:{train:0,stage:0,bank:0}, prevented:[], committed:[],
    romance:false, allies:[], arrests:[], kills:[], disarms:[], murders:0,
    needlessKills:0, shots:0, hits:0, talked:[], points:0, log:[], results:[],
    duel:null, tell:null, outcome:null, over:null
  };
  return G;
}
const who=G=>CAST[G.slot]||null;
const dialogueFor=(id,beat)=>(DIALOGUE[id]||[])[beat]||null;

function award(G,key,note){
  const p=RULES.POINTS[key]||0; G.points+=p;
  G.log.push({slot:G.slot,who:who(G)?who(G).id:null,key,points:p,note:note||""});
  return p;
}

/* ---- approach and dialogue ---- */
function beginSlot(G){
  const c=who(G);
  if(!c){return finish(G,"dusk");}
  G.phase="approach"; G.beat=0; G.trust=0; G.agit=0; G.outcome=null; G.duel=null;
  // what mood he is in today: the same answers meet a slightly different man
  G.mood=Math.floor(G.rng()*3)-1;
  G.needInfo=RULES.TRUST_INFO+G.mood;
  G.needWarm=RULES.TRUST_ROMANCE+G.mood;
  return c;
}
function openDialogue(G){G.phase="dialogue";return dialogueFor(who(G).id,0);}

/* A response moves trust and agitation by amounts specific to this character,
 * with a point of jitter either way so the same path does not always land on
 * the same side of a threshold. */
function respond(G,index){
  if(G.phase!=="dialogue")return null;
  const c=who(G), beat=dialogueFor(c.id,G.beat);
  if(!beat)return null;
  const reply=beat.replies[index];
  if(!reply)return null;
  if(reply.tone==="draw")return playerDraws(G);
  const [dt,da]=c.reacts[reply.tone]||[0,0];
  const jitter=()=>Math.floor(G.rng()*3)-1;            // -1, 0 or +1, every beat
  G.trust+=dt+jitter();
  G.agit +=da+jitter();
  if(c.id==="doctor"){
    G.metDoctor=true;
    if((c.insults||[]).includes(reply.tone))G.doctorFavour--;
    else if(reply.tone==="apologetic"||reply.tone==="neutral")G.doctorFavour++;
  }
  if(G.agit>=c.draws&&c.armed)return theyDraw(G,"agitated");
  G.beat++;
  if(G.beat>=RULES.BEATS)return settle(G);
  return {react:reply.react,next:dialogueFor(c.id,G.beat)};
}

/* ---- how an encounter lands when nobody has drawn ---- *
 * Trust does not cross a line, it weighs the odds: a warm conversation makes
 * disclosure likely and a cold one makes it unlikely, and neither is certain.
 * That is what stops the same four answers always ending the same way.      */
const odds=(G,margin)=>G.rng()<1/(1+Math.exp(-margin/RULES.TEMP));
function settle(G){
  const c=who(G);
  // even a settled man can turn
  if(c.armed&&G.rng()<c.hostile*(G.agit>0?1.5:0.7))return theyDraw(G,"turned");
  if(c.id==="deputy")return robberyBreaks(G);
  if(c.resolves.includes("romance")&&!G.pressedFragment&&odds(G,G.trust-G.needWarm)){
    G.romance=true; award(G,"romance");
    return resolve(G,"romance");
  }
  if(c.resolves.includes("alliance")&&odds(G,G.trust-(RULES.TRUST_ALLY+G.mood))){
    G.allies.push(c.id); award(G,"talked","alliance");
    return resolve(G,"alliance");
  }
  if(c.fragment&&odds(G,G.trust-G.needInfo)){
    G.fragments[c.fragment]++; G.talked.push(c.id); award(G,"talked");
    return resolve(G,"info");
  }
  if(c.id==="doctor"&&G.wounded)return doctorTreats(G);
  if(c.fragment)award(G,"lost_fragment");
  return resolve(G,"nothing");
}
/* Miss April is the deliberate trade: press her for the train job and the
 * picnic is off. The UI marks that response; the engine only records it. */
function pressForFragment(G){G.pressedFragment=true;}

/* ---- the doctor ---- */
function doctorTreats(G){
  const c=who(G);
  const drunk=G.rng()<(G.trust>=2?0.25:0.6);           // his bottle, and your manners
  if(drunk||G.doctorSpent)return resolve(G,"refused");
  G.doctorSpent=true; G.treated=true; G.wounded=false; G.hp=RULES.WOUND_HP;
  return resolve(G,"treated");
}

/* ---- the robbery the deputy brings ---- */
function robberyBreaks(G){
  const job=JOBS.find(j=>G.fragments[j]===0)||"bank";   // whichever you are least ready for
  if(G.fragments[job]>0||G.fragments.bank>0&&job==="bank"){
    G.prevented.push(job); award(G,"crime",job);
    return resolve(G,"prevented");
  }
  G.committed.push(job);
  return resolve(G,"robbery");
}

/* ---- duels ---- */
function theyDraw(G,why){
  const c=who(G);
  G.phase="tell";
  G.tell={at:0,why,delay:Math.round(rnd(G,RULES.TELL_MIN,RULES.TELL_MAX))};
  G.duel={initiator:"them",drawn:false,fired:false,zone:"torso",
    fireDelay:Math.round(rnd(G,RULES.FIRE_MIN,RULES.FIRE_MAX)-c.nerve*20),
    latency:null,error:null,result:null};
  return {tell:G.tell,duel:G.duel};
}
function playerDraws(G){
  const c=who(G);
  G.phase="duel";
  G.duel={initiator:"you",drawn:true,fired:false,zone:"torso",
    fireDelay:Math.round(rnd(G,RULES.FIRE_MIN,RULES.FIRE_MAX)-c.nerve*20),
    latency:null,error:null,result:null,unprovoked:true};
  return {duel:G.duel};
}
/* Pushing up draws: the dialogue lines stop taking input and a crosshair
 * appears over the scene. Pulling down holsters again and hands the
 * conversation back, which is how a sheriff talks his way out of one. */
function drawGun(G,nowMs){
  if(G.mode==="gun")return G.mode;
  G.mode="gun"; G.aim={x:0.5,y:0.5};
  if(G.phase==="dialogue")G.phase="aiming";
  // he will not watch a drawn gun for ever
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
/* Called every frame while the gun is out: his reflex timer, and the tell. */
function tick(G,nowMs){
  if(G.reflex&&nowMs-G.reflex.at>=G.reflex.limit){
    const c=who(G);
    G.reflex=null;
    if(c&&c.armed)return takeHit(G,"reflex");     // he answers the gun in his face
    return resolve(G,"nothing");                  // an unarmed man simply leaves
  }
  if(G.phase==="tell"&&G.tell&&nowMs-G.tell.at>=G.tell.delay){G.phase="duel";G.duel.drawn=true;}
  // once his gun is up he fires on his own timer, whatever the sheriff is doing
  if(G.phase==="duel"&&G.duel&&G.duel.drawn&&!G.duel.fired&&G.tell){
    if(nowMs-(G.tell.at+G.tell.delay)>=G.duel.fireDelay){
      G.duel.fired=true; G.duel.result="too_slow";
      return takeHit(G,"outdrawn");
    }
  }
  return null;
}
/* Which box the crosshair is over, if any. Aim is kept as a fraction of the
 * scene; the boxes are scene pixels. His gun box follows his hand up. */
const inBox=(px,py,b)=>px>=b.x&&px<=b.x+b.w&&py>=b.y&&py<=b.y+b.h;
function weaponBox(G){
  return (G.duel&&(G.duel.drawn||G.duel.initiator==="you"))?HITBOX.weaponRaised:HITBOX.weapon;
}
function boxAt(G,x,y){
  const px=x*SCENE.w, py=y*SCENE.h;
  if(inBox(px,py,weaponBox(G)))return "weapon";
  if(inBox(px,py,HITBOX.lethal))return "lethal";
  return null;
}
const boxCentre=b=>({x:(b.x+b.w/2)/SCENE.w,y:(b.y+b.h/2)/SCENE.h});
function aimAt(G,zone){                            // tests and the AI aim by name
  G.aim=boxCentre(zone==="arm"?weaponBox(G):HITBOX.lethal);
  if(G.duel)G.duel.zone=zone;
  return zone;
}
/* Latency and aim are separate: a fast hand is a wide one, a slow hand is a
 * shot hand. Everything below is measured from the tell. */
function shoot(G,latencyMs){
  let d=G.duel, c=who(G);
  if(!d){playerDraws(G);d=G.duel;}                 // fired without being drawn on
  if(!d||d.fired)return null;
  d.fired=true; d.latency=latencyMs; G.shots++;
  G.reflex=null;
  const box=boxAt(G,G.aim.x,G.aim.y);              // where the crosshair actually is
  d.zone=box==="weapon"?"arm":(box==="lethal"?"torso":"off");
  // Only a man who drew on you can beat you to the shot. Draw first and the
  // danger is his reflex timer running out while you line it up, not his speed.
  const theirShot=(d.initiator==="them"&&G.tell)?G.tell.delay+d.fireDelay:Infinity;
  if(latencyMs>theirShot){d.result="too_slow";return takeHit(G,"outdrawn");}
  if(d.zone==="off"){d.result="miss";return theirReply(G);}
  const q=Math.max(0,Math.min(1,(latencyMs-RULES.AIM_FLOOR)/(RULES.AIM_CEIL-RULES.AIM_FLOOR)));
  const sigma=RULES.SIGMA_WIDE-(RULES.SIGMA_WIDE-RULES.SIGMA_TIGHT)*q;
  const err=absNormal(G,sigma); d.error=err;
  const other=d.zone==="torso"?"arm":"torso";
  const hit=err<RULES.ZONE_TIGHT?d.zone:(err<RULES.ZONE_WIDE?other:"miss");
  if(hit==="miss"){d.result="miss";return theirReply(G);}
  G.hits++;
  if(hit==="arm"){
    G.disarms.push(c.id); award(G,"disarm"); G.arrests.push(c.id); award(G,"arrest");
    d.result="disarm"; return resolve(G,"disarm");
  }
  G.kills.push(c.id); d.result="kill";
  if(d.unprovoked&&!c.armed){G.murders++;award(G,"murder");return resolve(G,"murder");}
  if(d.unprovoked){G.murders++;award(G,"murder");return resolve(G,"murder");}
  award(G,"kill");
  if(err<RULES.ZONE_TIGHT&&d.zone==="torso"&&c.nerve<=1){   // a wound would have done
    G.needlessKills++; award(G,"killed_needless");
  }
  return resolve(G,"kill");
}
function theirReply(G){                     // he was always going to answer a miss
  const d=G.duel;
  if(d.initiator==="you"&&!who(G).armed)return resolve(G,"miss");
  return takeHit(G,"answered");
}
/* Being shot is survivable exactly as far as the doctor is willing. Insult the
 * only doctor in Gold Gulch and the first bullet is the end of the day; leave
 * him civil and he patches you up once; after that a wound is just a wound,
 * until there is one too many. */
function takeHit(G,why){
  G.wounded=true; award(G,"wounded");
  if(G.doctorFavour<0)return finish(G,"killed",why||"the doctor would not come");
  if(!G.doctorSpent){
    G.doctorSpent=true; G.treated=true; G.hp=RULES.WOUND_HP;
    return resolve(G,"rescued");
  }
  G.hp--;
  if(G.hp<=0)return finish(G,"killed",why||"bled out");
  return resolve(G,"wounded");
}
function resolve(G,outcome){
  G.phase="resolve"; G.outcome=outcome;
  // the encounter is over: the gun goes away and the next man is met talking
  G.mode="talk"; G.reflex=null; G.aim={x:0.5,y:0.5};
  G.results.push({slot:G.slot,who:who(G)?who(G).id:null,outcome,
    duel:G.duel?G.duel.result:null});
  return {outcome};
}
function nextSlot(G){
  if(G.phase==="summary")return null;
  G.slot++; G.pressedFragment=false;
  if(G.slot>=CAST.length)return finish(G,"dusk");
  return beginSlot(G);
}
/* The jobs nobody stopped happen at dusk. */
function finish(G,why,how){
  for(const job of JOBS){
    if(G.prevented.includes(job)||G.committed.includes(job))continue;
    if(G.fragments[job]>0){G.prevented.push(job);award(G,"crime",job);}
    else G.committed.push(job);
  }
  const acc=G.shots?G.hits/G.shots:null;
  const done=G.results.filter(r=>r.outcome!=="nothing").length;
  const cats={
    "crimes solved":        G.prevented.length,
    "interactions":         done+"/"+CAST.length,
    "pacifism":             clamp(100-G.kills.length*16-G.needlessKills*24-G.murders*60+G.disarms.length*12,0,100),
    "marksmanship":         acc==null?null:Math.round(acc*100),
    "lawfulness":           clamp(100-G.murders*70+G.arrests.length*12,0,100),
    "judgement":            clamp(G.talked.length*13+G.allies.length*10-G.murders*30,0,100),
    "romance":              G.romance?100:0
  };
  G.phase="summary";
  G.over={why,how:how||null,categories:cats,points:G.points,rating:rating(G,why),
    verdict:verdict(G,why,cats),prevented:[...G.prevented],committed:[...G.committed]};
  return G.over;
}
/* One to twelve, the way the original graded a day. Duty and crime prevention
 * carry it; romance is a point, not a career. */
function rating(G,why){
  if(why==="killed")return 1;
  let r=2;
  r+=Math.min(3,G.prevented.length);                  // up to 3
  r+=Math.min(2,Math.floor(G.talked.length/2));       // up to 2
  r+=Math.min(2,Math.floor(G.disarms.length/2));      // up to 2
  r+=G.arrests.length>=3?1:0;
  r+=G.romance?1:0;
  r+=G.points>=600?1:0;
  r-=G.murders*3;
  r-=G.needlessKills;
  return Math.max(1,Math.min(12,r));
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Math.round(v)));
function verdict(G,why,c){
  if(why==="killed")return "buried";
  if(G.murders>=2)return "run out of town";
  if(G.points>=700&&G.prevented.length===3)return "marshal";
  if(G.points>=450)return "sheriff of gold gulch";
  if(G.points>=200)return "town constable";
  if(G.points>=0)return "deputy on probation";
  return "run out of town";
}
