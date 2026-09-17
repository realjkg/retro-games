/* ============ engine ============
 * All rules, no DOM and no writing. The state machine the page drives:
 *   intro -> approach -> dialogue -> aiming -> tell -> duel -> resolve -> summary
 * Every random draw goes through G.rng so a test can seed it.               */
"use strict";

const RULES={
  TURNS:3,
  TELL_MIN:400, TELL_MAX:900,        // ms of tell before his hand moves
  FIRE_MIN:260, FIRE_MAX:420,        // ms from his draw to his shot
  REFLEX_MIN:1500, REFLEX_MAX:2600,  // how long a drawn gun is tolerated
  AIM_STEP:0.055,                    // crosshair travel per input step, in scene widths
  AIM_FLOOR:120, AIM_CEIL:500,       // the latency window aim quality is read from
  SIGMA_WIDE:0.95, SIGMA_TIGHT:0.42, // shot spread, fast draw to steady draw
  ZONE_TIGHT:0.30, ZONE_WIDE:0.62,   // < tight hits what you aimed at, < wide the other
  WOUNDS:2,                          // wounds the sheriff carries before one is too many
  POINTS:{arrest:120, talked:80, clue:60, disarm:70, kill:20, lost:-60,
          murder:-260, killed_needless:-90, wounded:-50, drawn_on_unarmed:-120}
};

const mulberry32=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);
  t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
const rnd=(g,a,b)=>a+(b-a)*g.rng();
function absNormal(g,sigma){          // folded gaussian: the size of a shot's error
  const u=Math.max(1e-9,g.rng()), v=g.rng();
  return Math.abs(Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v))*sigma;
}

function newGame(opts){
  const seed=opts&&opts.seed;
  return {
    phase:"intro", slot:0, turn:0, rng:seed==null?Math.random:mulberry32(seed),
    S:blankState(), safety:0, clues:[], favours:0, reputation:0,
    wounds:0, wounded:false, mode:"talk", aim:{x:0.5,y:0.5}, reflex:null,
    shots:0, hits:0, arrests:[], kills:[], disarms:[], murders:0, needlessKills:0,
    settled:[], points:0, log:[], results:[],
    duel:null, tell:null, outcome:null, ending:null, over:null
  };
}
const blankState=()=>({respect:0,fear:0,suspicion:0,evidence:0,drawRisk:0});
const who=G=>ENCOUNTERS[G.slot]||null;
const turnFor=(id,turn)=>(DIALOGUE[id]||[])[turn]||null;
const authored=id=>Array.isArray(DIALOGUE[id])&&DIALOGUE[id].length===RULES.TURNS;

function award(G,key,note){
  const p=RULES.POINTS[key]||0; G.points+=p;
  G.log.push({slot:G.slot,who:who(G)?who(G).id:null,key,points:p,note:note||""});
  return p;
}

/* ---- arrival and dialogue ---- */
function beginSlot(G){
  const e=who(G);
  if(!e)return finish(G,"dusk");
  G.phase="approach"; G.turn=0; G.S=blankState();
  G.outcome=null; G.ending=null; G.duel=null; G.tell=null;
  G.mode="talk"; G.reflex=null; G.aim={x:0.5,y:0.5};
  G.mood=Math.floor(G.rng()*3)-1;          // what mood he is in today
  return e;
}
function openDialogue(G){G.phase="dialogue";return turnFor(who(G).id,0);}

/* A reply moves the state by what the writing says it moves, plus a point of
 * temper either way on the draw risk, so the same four answers do not always
 * land on the same side of his patience. */
function respond(G,index){
  if(G.phase!=="dialogue")return null;
  const e=who(G), t=turnFor(e.id,G.turn);
  if(!t)return null;
  const reply=t.replies[index];
  if(!reply)return null;
  for(const [k,v] of Object.entries(reply.fx||{})){
    if(k in G.S)G.S[k]+=v; else if(k==="safety")G.safety+=v;
  }
  G.S.drawRisk+=Math.floor(G.rng()*3)-1;
  if(e.armed&&G.S.drawRisk>=e.drawAt+G.mood)return theyDraw(G,"provoked");
  G.turn++;
  if(G.turn>=RULES.TURNS)return settle(G);
  return {react:reply.react,next:turnFor(e.id,G.turn)};
}

/* ---- how an encounter lands when nobody has drawn ---- */
const CMP={">=":(a,b)=>a>=b,"<=":(a,b)=>a<=b,">":(a,b)=>a>b,"<":(a,b)=>a<b,
  "==":(a,b)=>a===b,"!=":(a,b)=>a!==b};
function value(G,name){
  if(name in G.S)return G.S[name];
  if(name==="safety")return G.safety;
  if(name==="favours")return G.favours;
  if(name==="wounds")return G.wounds;
  return 0;
}
const holds=(G,when)=>(when||[]).every(([n,op,v])=>(CMP[op]||CMP["=="])(value(G,n),v));
function settle(G){
  const e=who(G);
  // even a settled man can turn, and a riled one more easily
  if(e.armed&&G.rng()<(e.hostile||0)*(G.S.drawRisk>0?1.5:0.7))return theyDraw(G,"turned");
  const ending=(e.endings||[]).find(x=>holds(G,x.when));
  if(!ending)return resolve(G,"unwritten");
  G.ending=ending;
  for(const [k,v] of Object.entries(ending.fx||{})){
    if(k==="safety")G.safety+=v;
    else if(k==="clue"&&!G.clues.includes(v))G.clues.push(v);
    else if(k==="favour")G.favours+=1;
    else if(k in G.S)G.S[k]+=v;
  }
  if(ending.fx&&ending.fx.clue)award(G,"clue",ending.fx.clue);
  if(ending.award)award(G,ending.award,ending.id);
  G.points+=ending.points||0;
  G.settled.push({slot:G.slot,who:e.id,ending:ending.id});
  return resolve(G,ending.id);
}

/* ---- the gun hand ---- */
function drawGun(G,nowMs){
  if(G.mode==="gun")return G.mode;
  G.mode="gun"; G.aim={x:0.5,y:0.5};
  if(G.phase==="dialogue")G.phase="aiming";
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
/* Called every frame: his patience with a drawn gun, his tell, and his shot. */
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

/* ---- duels ---- */
function theyDraw(G,why){
  const e=who(G);
  G.phase="tell";
  G.tell={at:0,why,delay:Math.round(rnd(G,RULES.TELL_MIN,RULES.TELL_MAX))};
  G.duel={initiator:"them",drawn:false,fired:false,zone:"torso",
    fireDelay:Math.round(rnd(G,RULES.FIRE_MIN,RULES.FIRE_MAX)-(e.nerve||0)*20),
    latency:null,error:null,result:null};
  return {tell:G.tell,duel:G.duel};
}
function playerDraws(G){
  const e=who(G);
  G.phase="duel";
  G.duel={initiator:"you",drawn:true,fired:false,zone:"torso",unprovoked:true,
    fireDelay:Math.round(rnd(G,RULES.FIRE_MIN,RULES.FIRE_MAX)-(e.nerve||0)*20),
    latency:null,error:null,result:null};
  return {duel:G.duel};
}
/* Latency and aim are read apart: a fast hand is a wide one, a slow hand is a
 * shot hand. Only a man who drew on you can beat you to it. */
function shoot(G,latencyMs){
  let d=G.duel, e=who(G);
  if(!d){playerDraws(G);d=G.duel;}
  if(!d||d.fired)return null;
  d.fired=true; d.latency=latencyMs; G.shots++; G.reflex=null;
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
  G.hits++;
  if(hit==="arm"){
    G.disarms.push(e.id); award(G,"disarm");
    G.arrests.push(e.id); award(G,"arrest");
    d.result="disarm"; return resolve(G,"disarmed");
  }
  G.kills.push(e.id); d.result="kill";
  if(d.unprovoked){                       // he never went for his gun
    G.murders++; award(G,!e.armed?"drawn_on_unarmed":"murder");
    return resolve(G,"murder");
  }
  award(G,"kill");
  if(G.S.drawRisk<4){                     // his hand moved, but a wound would have done
    G.needlessKills++; award(G,"killed_needless");
  }
  return resolve(G,"killed_him");
}
function theirReply(G){
  const e=who(G);
  if(G.duel.initiator==="you"&&!e.armed)return resolve(G,"missed_him");
  return takeHit(G,"he answered your miss");
}
/* A wound is carried, not cured: the day goes on until there is one too many.
 * A favour banked with someone in town buys one of them back. */
function takeHit(G,why){
  G.wounded=true; award(G,"wounded");
  if(G.favours>0){G.favours--; G.wounds=Math.max(0,G.wounds-0); return resolve(G,"patched"); }
  G.wounds++;
  if(G.wounds>=RULES.WOUNDS)return finish(G,"killed",why);
  return resolve(G,"wounded");
}

/* ---- resolution and the day's end ---- */
function resolve(G,outcome){
  G.phase="resolve"; G.outcome=outcome;
  G.mode="talk"; G.reflex=null; G.aim={x:0.5,y:0.5};
  G.results.push({slot:G.slot,who:who(G)?who(G).id:null,outcome,
    duel:G.duel?G.duel.result:null,ending:G.ending?G.ending.id:null});
  return {outcome,ending:G.ending};
}
function nextSlot(G){
  if(G.phase==="summary")return null;
  G.slot++;
  if(G.slot>=ENCOUNTERS.length)return finish(G,"dusk");
  return beginSlot(G);
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Math.round(v)));
function finish(G,why,how){
  const acc=G.shots?G.hits/G.shots:null;
  const done=G.results.filter(r=>r.outcome!=="unwritten").length;
  const cats={
    "crimes solved":  G.clues.length+Math.max(0,G.safety),
    "interactions":   done+"/"+ENCOUNTERS.length,
    "pacifism":       clamp(100-G.kills.length*16-G.needlessKills*24-G.murders*60+G.disarms.length*12,0,100),
    "marksmanship":   acc==null?null:Math.round(acc*100),
    "authority":      clamp(50+G.arrests.length*14+G.settled.length*8-G.murders*40,0,100),
    "mercy":          clamp(100-G.kills.length*22-G.murders*50+G.disarms.length*8,0,100),
    "evidence":       G.clues.length
  };
  G.phase="summary";
  G.over={why,how:how||null,categories:cats,points:G.points,rating:rating(G,why),
    verdict:verdict(G,why),clues:[...G.clues],safety:G.safety};
  return G.over;
}
/* One to twelve. Duty and crime prevention carry it; a killing costs. */
function rating(G,why){
  if(why==="killed")return 1;
  let r=2;
  r+=Math.min(3,G.clues.length);
  r+=Math.min(2,Math.floor(G.settled.length/2));
  r+=Math.min(2,Math.floor(G.disarms.length/2));
  r+=G.arrests.length>=2?1:0;
  r+=Math.max(0,Math.min(2,G.safety));
  r+=G.points>=500?1:0;
  r-=G.murders*3;
  r-=G.needlessKills;
  return Math.max(1,Math.min(12,r));
}
function verdict(G,why){
  if(why==="killed")return "buried in Gold Gulch";
  if(G.murders>=2)return "run out of town";
  const r=rating(G,why);
  if(r>=11)return "marshal of the territory";
  if(r>=9)return "sheriff of Gold Gulch";
  if(r>=6)return "town constable";
  if(r>=3)return "deputy on probation";
  return "run out of town";
}
