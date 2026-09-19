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
  /* How long a man takes between showing his hand and using it. Measured
   * against a person rather than guessed at: seeing a thing on a phone and
   * pressing a button is about 250ms at the very best and 400-600ms in normal
   * play, and the page's own cost sits on top of that. The old ambush gave
   * 380-680ms for the whole business, which no one alive could answer. */
  TELLS:{ambush:[320,500], delayed:[520,820], draw:[620,1000]},
  FIRE_MIN:260, FIRE_MAX:420,
  /* How long a man stands there with a gun in his face before he does something
   * about it, and what he does. It was one window and one answer for all of
   * them, which made every caller the same man wearing a different hat. A
   * hostile one is quick and answers it; a patient one gives you a long moment
   * to think better of it; a frightened one is quicker than either and runs,
   * and the street remembers that the badge did that to him. */
  TEMPERS:{
    hostile:{reflex:[900,1600],  flee:0},
    patient:{reflex:[2200,3400], flee:-1},
    coward: {reflex:[700,1400],  flee:-2}
  },
  AIM_STEP:0.02, AIM_FLOOR:120, AIM_CEIL:500,
  /* How far off the sights the ball goes, in pixels of the picture. A snap
   * shot throws it about; a shot he took his time over goes where he put it.
   * It used to be a lottery between the thing aimed at and the other thing,
   * decided by the clock alone - the crosshair chose nothing. */
  SPREAD_SNAP:9, SPREAD_AIMED:2.2,
  WOUNDS:2,
  /* How many extra balls a doctor on good terms will pull out of you. He is
   * meant to be worth being decent to; he was worth being immortal. */
  DOCTOR_GRACE:2,
  /* The man at the window: how often, how many in a day, how long before the
   * sash goes up, and how long the sheriff then has to do something about it.
   *
   * These were 1.6-3.4s to the sash and 5.2-8.2s to the shot, both measured
   * from the moment the scene began - while the caller was still walking in,
   * while the dialogue panel was still building itself a row at a time, and
   * while the player was reading a hundred and fifty characters and four
   * replies. Reading one beat takes fifteen to twenty-five seconds. He fired
   * two or three times over before anybody could have finished the first line,
   * every time, on a third of all encounters. That is not a hidden threat, it
   * is a coin flip with a wound on one face.
   *
   * The sash now goes up after the reading rather than during it, and what
   * follows it is a window wide enough to look up, find him and fire. The
   * warning is still the only warning. */
  SNIPER_ODDS:0.3, SNIPERS:2,
  SNIPER_SHOW_MIN:8000, SNIPER_SHOW_MAX:14000,
  SNIPER_REACT_MIN:4000, SNIPER_REACT_MAX:6000
};
/* The phases in which the street is still happening and a second gun in it can
 * do something. On the resolve screen and between encounters it cannot. */
const LIVE=["dialogue","aiming","tell","duel"];
/* The three jobs sit between callers, each after everybody who could have
 * warned about it: the stage after Rose, the train after the Dude and Miss
 * April, the bank after the Doctor, the new gun, Willy and the Deputy. */
const INTERLUDES=[{after:4,job:"stage"},{after:8,job:"train"},{after:10,job:"bank"}];

const mulberry32=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);
  t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
const rnd=(g,a,b)=>a+(b-a)*g.rng();
function absNormal(g,sigma){
  const u=Math.max(1e-9,g.rng()), v=g.rng();
  return Math.abs(Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v))*sigma;
}

function rawDay(opts){
  const seed=opts&&opts.seed;
  return {
    phase:"intro", encounter:0, node:"opening", round:1,
    rng:seed==null?Math.random:mulberry32(seed),
    alive:true, wounds:0,
    authority:0, arrests:0, dates:0, badGuysShot:0, innocentsKilled:0, crimesMissed:0,
    tips:{train:false,stage:false,bank:false},
    doctor:{met:false,disposition:0,sober:true,alive:true},
    met:[], flags:[], log:[], results:[], manner:{}, as:null, standing:"even",
    mode:"talk", aim:{x:0.5,y:0.5}, reflex:null, pending:null,
    spoke:false, balked:false, blackout:false, sniper:null, snipers:0, hatOff:false,
    atLarge:[], by:null, jobEnc:null, incapacitated:false, skipped:0,
    duel:null, tell:null, outcome:null, ending:null, interlude:null, over:null
  };
}
/* Whether the doctor has been up all night with a bottle is settled before the
 * day starts, not by anything the sheriff does; what he does about it is his. */
function newDay(opts){const G=rawDay(opts); G.doctor.sober=G.rng()>=0.3; return G;}
const newGame=newDay;                      // the page calls it this
/* During a robbery the man in front of the sheriff is the robber, not the next
 * caller, and every rule below reads him through the same accessor. */
const who=G=>(G.interlude?(G.jobEnc||JOBS[G.interlude]):CAST[G.encounter])||null;
const castOf=id=>CAST.filter(e=>e.id===id)[0]||null;
/* Who is loose. An armed man who walks out of his encounter unstopped - sent
 * off, told to leave the territory, given offence and gone, or simply cleverer
 * than the sheriff - is a man the town may hear from again. Arrested, shot or
 * dead, he is not; unarmed, he is not either, because a schoolteacher does not
 * go through the back wall of a bank. */
function atLarge(G,why){
  const e=who(G);
  if(!e||!e.armed||G.interlude)return;
  if(G.atLarge.indexOf(e.id)<0)G.atLarge.push(e.id);
  if(why)G.log.push("at large: "+e.id+" ("+why+")");
}
const nodeOf=G=>{const e=who(G);return e&&e.rounds?e.rounds[G.node]:null;};

/* ---- arrival and conversation ---- */
/* Everything that belongs to one scene and must not follow the sheriff into the
 * next one. A caller's encounter is not the only way a scene starts - a robbery
 * is the other - so this is shared rather than written out twice, which is how
 * it came to be wrong: the hat shot off the man before the robbery left the man
 * in the alley bare-headed and untargetable, a wound in the last encounter left
 * the street dark through the whole hold-up, and a rifle nobody dealt with was
 * still at the window with its clock running. */
function resetScene(G){
  G.outcome=null; G.ending=null; G.duel=null; G.tell=null;
  G.mode="talk"; G.reflex=null; G.aim={x:0.5,y:0.5};
  G.spoke=false; G.balked=false; G.blackout=false; G.hatOff=false; G.as=null;
  G.sniper=null;
}
function beginEncounter(G){
  const e=who(G);
  if(!e)return finish(G,"dusk");
  resetScene(G);
  G.phase="approach"; G.round=1;
  G.node=(e.doctor&&!G.doctor.sober&&e.rounds.opening_drunk)?"opening_drunk":"opening";
  /* What kind of morning the sheriff has had, settled before the next man
   * opens his mouth. A caller who has heard he shot two men does not greet him
   * the way he would have at dawn, and until now every one of them did. */
  G.standing=standing(G);
  // Somebody at the window over the street, on some encounters and not others,
  // and never more than twice in a day: a day where every caller brings a
  // second gun is a day about windows rather than about people. The doctor's
  // own scene is indoors, so nobody is above it.
  if(!e.doctor&&G.snipers<RULES.SNIPERS&&G.rng()<RULES.SNIPER_ODDS){
    G.snipers++;
    const show=Math.round(rnd(G,RULES.SNIPER_SHOW_MIN,RULES.SNIPER_SHOW_MAX));
    G.sniper={alive:true,fired:false,shown:false,at:null, show:show,
      limit:show+Math.round(rnd(G,RULES.SNIPER_REACT_MIN,RULES.SNIPER_REACT_MAX))};
  }
  if(e.doctor)G.doctor.met=true;
  if(!G.met.includes(e.id))G.met.push(e.id);
  return e;
}
/* What the street has decided about him by the time the next man walks up. */
function standing(G){
  const c=f=>G.flags.filter(x=>x===f).length, m=k=>G.manner[k]||0;
  const hard=G.badGuysShot+G.innocentsKilled*2+m("hard")
    +c("offended")+c("gun_first")+c("outsmarted");
  const kind=G.dates+m("warm")+c("tip_train")+c("tip_stage")+c("tip_bank")
    +c("doctor_civil");
  return hard-kind>=3?"hard":kind-hard>=3?"kind":"even";
}
/* The same beat, said differently because of what the sheriff said to earn it.
 * A beat two or more replies reach used to read identically whether he had
 * been civil about it or hard, which is the whole of the complaint: the words
 * he chose changed where he went and never once changed what he heard back.
 * A reply carries its manner - warm, hard, sly - and the beat it leads to
 * answers that manner if it has an answer for it. Keying it on the beat he
 * came from is not enough: two replies of the same beat, one kind and one
 * cruel, very often arrive at the same place. */
function npcOf(G,n){
  n=n||nodeOf(G);
  if(!n)return "";
  if(n.npcIf){
    // inside a scene it is the manner of the reply that earned this beat; at
    // the opening, where nothing has been said yet, it is his standing in town
    if(G.as&&n.npcIf[G.as])return n.npcIf[G.as];
    if(!G.as&&G.standing&&n.npcIf[G.standing])return n.npcIf[G.standing];
  }
  return n.npc;
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
  if(G.balked&&G.mode==="gun")return null;   // he is not talking to a gun
  const n=nodeOf(G); if(!n)return null;
  const reply=n.replies[index]; if(!reply)return null;
  G.spoke=true;
  if(reply.action)return act(G,reply.action);
  if(reply.end)return terminal(G,reply.end);
  if(reply.as)G.manner[reply.as]=(G.manner[reply.as]||0)+1;
  G.as=reply.as||null;
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
  if(kind==="depart"){
    G.flags.push("depart"); atLarge(G,"sent off unstopped");
    return resolve(G,"departed");
  }
  // Outsmarted. Not a bullet and not the end of the day: the sheriff wakes up
  // where he was standing, poorer in the town's estimation, with one caller
  // already come and gone while he was down and the man who did it loose.
  if(kind==="trick"){
    G.authority-=2; G.flags.push("outsmarted");
    G.incapacitated=true; G.blackout=true;
    atLarge(G,"outsmarted");
    return resolve(G,"outsmarted");
  }
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
    if(f==="doctor_sober")G.doctor.sober=true;
  }
  G.authority+=t.authority||0;
  // a man who walked out of it unstopped, or who left having taken offence
  const f=t.flags||[];
  if(f.indexOf("offended")>=0||f.indexOf("depart")>=0)atLarge(G,"left unstopped");
  return resolve(G,id);
}

/* ---- the gun, which is always available ---- */
const temperOf=e=>(e&&RULES.TEMPERS[e.temper])||RULES.TEMPERS.patient;
function drawGun(G,nowMs){
  if(G.mode==="gun")return G.mode;
  G.mode="gun"; G.aim={x:0.5,y:0.5};
  G.aim.x=Math.max(sightFloor(G.aim.y),G.aim.x);
  // A man who has a gun pointed at him before he has been answered stops
  // talking, and does not start again while it is out. Keeping it on him is
  // still the sheriff's business: the reflex below decides what he does about
  // it, which is answer it if he is armed and leave if he is not.
  if(G.phase==="dialogue"&&!G.spoke&&who(G)&&!(G.duel&&G.duel.drawn)){
    G.balked=true;
    // pulling it before a man has been answered is remembered by the street
    if(G.flags.indexOf("gun_first:"+G.encounter)<0)
      G.flags.push("gun_first","gun_first:"+G.encounter);
  }
  if(G.phase==="dialogue")G.phase="aiming";            // drawing interrupts anything
  const t=temperOf(who(G)).reflex;
  G.reflex={at:nowMs||0,limit:Math.round(rnd(G,t[0],t[1]))};
  return G.mode;
}
function holster(G){
  if(G.mode!=="gun")return G.mode;
  G.mode="talk"; G.reflex=null;
  if(G.phase==="aiming")G.phase="dialogue";
  return G.mode;
}
/* Laying the sights straight onto a point, which is what a thumb on the glass
 * or a mouse over the street means. The same rule as moving them: no sights
 * unless the gun is out. */
function setAim(G,x,y){
  if(G.mode!=="gun")return null;
  G.aim.y=Math.max(0,Math.min(1,y));
  G.aim.x=Math.max(sightFloor(G.aim.y),Math.min(1,x));
  return G.aim;
}
function moveAim(G,dx,dy){
  if(G.mode!=="gun")return null;
  G.aim.y=Math.max(0,Math.min(1,G.aim.y+dy*RULES.AIM_STEP));
  // the sights are pushed back out of him whichever way they got there: moved
  // down the picture into his shoulder, as much as dragged left across it
  G.aim.x=Math.max(sightFloor(G.aim.y),Math.min(1,G.aim.x+dx*RULES.AIM_STEP));
  return G.aim;
}
/* Time the page was not running is not time the sheriff stood there. rAF stops
 * while a phone is locked or the player is in another app, but performance.now()
 * does not, so the first frame back used to deliver a nowMs that had jumped by
 * the whole absence and every clock expired on that single frame: you came back
 * to the street already shot. Every origin moves forward with the gap instead. */
function catchUp(G,gap){
  if(!(gap>0))return;
  if(G.sniper&&G.sniper.at!=null)G.sniper.at+=gap;
  if(G.reflex)G.reflex.at+=gap;
  if(G.tell&&G.tell.at!=null)G.tell.at+=gap;
}
function tick(G,nowMs){
  // The man at the window keeps his own clock, and it runs whatever the two in
  // the street are doing. The sash goes up first, which is the only warning
  // there is; a while after that he fires.
  const sn=G.sniper;
  if(sn&&sn.alive&&!sn.fired&&LIVE.indexOf(G.phase)>=0){
    if(sn.at==null)sn.at=nowMs;
    const t=nowMs-sn.at;
    if(!sn.shown&&t>=sn.show)sn.shown=true;
    if(t>=sn.limit){
      sn.fired=true;
      return takeHit(G,"a rifle out of the window over the street");
    }
  }
  if(G.reflex&&LIVE.indexOf(G.phase)>=0&&nowMs-G.reflex.at>=G.reflex.limit){
    const e=who(G); G.reflex=null;
    if(e&&e.armed)return takeHit(G,"he answered the gun in his face");
    // Nobody unarmed is a threat, but frightening one off the street with a gun
    // is a thing the town watched the badge do, and it costs what it costs.
    const cost=temperOf(e).flee;
    G.authority+=cost;
    if(cost<0)G.flags.push("offended");
    return resolve(G,cost<=-2?"fled":"walked_away");
  }
  if(G.tell&&G.tell.at==null&&(G.phase==="tell"||G.phase==="duel"))G.tell.at=nowMs;
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
/* Every caller has his own boxes, off his own grid: the boy's are low and the
 * man with the long gun carries his across his chest. */
const weaponBox=G=>{const b=boxesFor(who(G));
  return (G.duel&&(G.duel.drawn||G.duel.initiator==="you"))?b.weaponRaised:b.weapon;};
function boxAt(G,x,y){
  const px=x*SCENE.w, py=y*SCENE.h;
  if(G.sniper&&G.sniper.alive&&G.sniper.shown&&inBox(px,py,SNIPER_BOX))return "sniper";
  const hb=G.hatOff?null:boxesFor(who(G)).hat;
  if(hb&&inBox(px,py,hb))return "hat";
  if(inBox(px,py,weaponBox(G)))return "weapon";
  if(inBox(px,py,boxesFor(who(G)).lethal))return "lethal";
  return null;
}
const boxCentre=b=>({x:(b.x+b.w/2)/SCENE.w,y:(b.y+b.h/2)/SCENE.h});
function aimAt(G,zone){
  G.aim=boxCentre(zone==="arm"?weaponBox(G):boxesFor(who(G)).lethal);
  if(G.duel)G.duel.zone=zone;
  return zone;
}
function theyDraw(G,why){
  const e=who(G);
  const span=RULES.TELLS[why]||[RULES.TELL_MIN,RULES.TELL_MAX];
  G.phase="tell";
  /* Stamped on the first frame this is live, the way the sniper's is. It used
   * to be 0, and the UI re-stamped it on two of the four paths that reach here.
   * On the other two - the last gunfighter, who never talks, and the ambush a
   * shot-off hat provokes - it stayed 0, and since nowMs is performance.now()
   * and the day is minutes old, the very first tick found the whole tell and
   * the whole fire delay already elapsed and answered with "outdrawn". The
   * eleventh caller killed you the instant he appeared, every game. */
  G.tell={at:null,why,delay:Math.round(rnd(G,span[0],span[1]))};
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
  // read what the crosshair is over before drawing first changes his pose:
  // the player aimed at the hand on the hip, not at the hand he has not raised
  /* Where the ball actually went: the sights, and what haste did to them. The
   * shot is then simply read off the picture - whatever it landed in is what
   * it hit - so the crosshair means what it shows. */
  const lat0=Math.max(0,latencyMs||0);
  const qa=Math.max(0,Math.min(1,(lat0-RULES.AIM_FLOOR)/(RULES.AIM_CEIL-RULES.AIM_FLOOR)));
  const spread=RULES.SPREAD_SNAP-(RULES.SPREAD_SNAP-RULES.SPREAD_AIMED)*qa;
  const ang=G.rng()*Math.PI*2, off=absNormal(G,1)*spread;
  const land={x:G.aim.x+Math.cos(ang)*off/SCENE.w,
              y:G.aim.y+Math.sin(ang)*off/SCENE.h};
  const box=boxAt(G,land.x,land.y);
  // A ball through the window is not a duel with the man in the street, and it
  // ends the encounter whatever was being said: nobody carries on a
  // conversation after that.
  if(box==="sniper"){
    G.sniper.alive=false; G.badGuysShot++; G.authority+=1;
    G.flags.push("sniper_down"); G.reflex=null;
    return resolve(G,"sniper_down");
  }
  /* His hat. A ball an inch above a man is a different sentence from a ball
   * through him, and who he is decides which. An armed man who was giving you
   * time to think better of it gives it up instead, and that is the best piece
   * of policing in the game: an arrest, nobody hurt, and the street watching.
   * An armed man who was already minded to answer you is now minded to answer
   * you bareheaded and at once. And anybody with no gun at all has just been
   * shot at, which the street also watched. Mid-duel it is showing off, and
   * showing off is a miss. */
  if(box==="hat"&&!G.hatOff&&e){
    if(d&&d.drawn){d.fired=true;d.result="miss";d.zone="off";return theirReply(G);}
    G.hatOff=true; G.reflex=null;
    // A hold-up man's Stetson takes his bandana down with it, and a man whose
    // face the whole street has just seen does not stay to finish the job. No
    // arrest, no body, and the job stopped: that is the shot of the day.
    if(e.masked){
      G.authority+=2; G.flags.push("hat_off","unmasked");
      return resolve(G,"hat_unmasked");
    }
    // He is your deputy. The street can see the jail door from here.
    if(e.deputy){
      G.authority-=2; G.flags.push("offended");
      return resolve(G,"hat_deputy");
    }
    if(!e.armed){
      G.authority-=2; G.flags.push("offended");
      // and the man who decides whether your next wound is survivable does not
      // forget being shot at, whatever else he does about it
      if(e.doctor)G.doctor.disposition-=2;
      return resolve(G,"hat_scared");
    }
    if(e.temper==="hostile"){
      G.flags.push("hat_off");
      return theyDraw(G,"ambush");
    }
    G.arrests++; G.authority+=2; G.flags.push("arrest","hat_off");
    return resolve(G,"hat_yield");
  }
  if(!d){playerDraws(G);d=G.duel;}
  if(!d||d.fired)return null;
  d.fired=true; d.latency=latencyMs; G.reflex=null; d.error=off;
  d.zone=box==="weapon"?"arm":(box==="lethal"?"torso":"off");
  const theirShot=(d.initiator==="them"&&G.tell)?G.tell.delay+d.fireDelay:Infinity;
  if(latencyMs>theirShot){d.result="too_slow";return takeHit(G,"outdrawn");}
  if(d.zone==="off"){d.result="miss";return theirReply(G);}
  if(d.zone==="arm"){
    // there is nothing to shoot out of an unarmed caller's hand, and the town
    // can see that as well as the sheriff can
    if(!e.armed){d.result="wounded_innocent"; G.authority-=2; G.flags.push("offended");
      return resolve(G,"wounded_innocent");}
    d.result="disarm"; G.arrests++; G.authority+=1; G.flags.push("arrest");
    return resolve(G,"disarmed");
  }
  d.result="kill";
  if(e.doctor)G.doctor.alive=false;                     // there is no other one
  if(d.unprovoked||!e.armed){G.innocentsKilled++;G.authority-=2;return resolve(G,"innocent_killed");}
  G.badGuysShot++;
  return resolve(G,"killed_him");
}
function theirReply(G){
  const e=who(G);
  if(G.duel.initiator==="you"&&!e.armed)return resolve(G,"missed_him");
  return takeHit(G,"he answered your miss");
}
/* The doctor is the difference between a wound and a grave, and he is in one of
 * four states by the time the sheriff needs him:
 *   dead        nothing is survivable; the town has no other one
 *   hostile     he will not come, and the first ball is the last thing
 *   drunk       he comes and makes a poor job of it: one wound, no more
 *   civil       alive, sober and well disposed — patched up, and the day goes on
 *   neutral     alive and sober but owing nothing: one wound, no more
 * Not having met him yet counts as neutral; he is in the town either way. */
/* Whether the doctor comes, and how willingly, is not only about the doctor.
 * A sheriff who has shot men who never drew, or put the whole street's back up,
 * is a sheriff Gold Gulch is slower to send for - so the town's standing moves
 * his disposition a step either way before it is read. */
function doctorStanding(G){
  let n=G.doctor.disposition;
  n-=G.innocentsKilled;                     // the town saw all of them
  if(G.flags.filter(f=>f==="offended").length>=2)n-=1;
  if(G.authority>=3)n+=1;                   // a sheriff worth patching up
  return n;
}
function doctorState(G){
  const d=G.doctor;
  if(!d.alive)return "dead";
  const n=doctorStanding(G);
  if(n<0)return "hostile";
  if(!d.sober)return "drunk";
  return n>0?"civil":"neutral";
}
/* Being shot is not a line of bookkeeping either: the street goes out, and the
 * next thing the sheriff knows is whether anybody came. */
function takeHit(G,why){
  G.wounds++; G.blackout=true;
  const state=doctorState(G);
  if(state==="dead"){
    G.alive=false;
    return finish(G,"killed",why||"no doctor left in Gold Gulch to send for");
  }
  if(state==="hostile"){
    G.alive=false;
    return finish(G,"killed",why||"the doctor would not come");
  }
  /* A doctor who likes you comes when you send for him, and used to come
   * every single time: eight balls, eight patch-ups, no limit anywhere. A
   * sheriff who had been civil to him could not be killed, which quietly put
   * the whole of the day's other ending out of reach. He is still worth being
   * decent to - he is worth two more than anybody else gets - but there is a
   * number of holes a country doctor cannot close. */
  if(state==="civil"){
    if(G.wounds<RULES.WOUNDS+RULES.DOCTOR_GRACE)return resolve(G,"doctor_saved");
    G.alive=false;
    return finish(G,"killed",why||"the doctor came, and did what he could, and it was not enough");
  }
  if(G.wounds>=RULES.WOUNDS){
    G.alive=false;
    return finish(G,"killed",why||(state==="drunk"
      ?"a second ball, and the doctor's hands no steadier"
      :"a second ball, and nobody owing you a favour"));
  }
  return resolve(G,state==="drunk"?"doctor_drunk":"doctor_came");
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
/* A job that has come due happens, and a job the sheriff was carried past by
 * being knocked down still happens: the test is "after", not "exactly at". */
function interludeDue(G){
  const done=G.encounter+1;
  return INTERLUDES.find(i=>i.after<=done&&!G.results.some(r=>r.outcome==="job_"+i.job));
}
/* The job is a scene, not a line of bookkeeping: being told about it puts the
 * sheriff in front of it with his own gun still in the leather. */
function runInterlude(G,job){
  // Whoever the sheriff let go most recently is the man in the alley. If he let
  // nobody go, it is an outlaw nobody in Gold Gulch can name.
  const by=G.atLarge.length?G.atLarge[G.atLarge.length-1]:null;
  const j=JOBS[job];
  G.by=by;
  if(by){
    G.atLarge=G.atLarge.filter(function(id){return id!==by;});
    const him=castOf(by);
    // a man you met this morning is not wearing anything over his face, and his
    // temper is his own rather than the outlaw's
    G.jobEnc=Object.assign({},j,{figure:by, masked:false,
      temper:(him&&him.temper)||j.temper, hatline:him&&him.hatline,
      name:j.name+" \u2014 "+(him?him.name:"someone you know"),
      brief:j.brief+" You have seen that coat before today."});
  }else{ G.jobEnc=null; }
  resetScene(G);
  G.interlude=job; G.phase="interlude";
  G.results.push({encounter:G.encounter,who:job,outcome:"job_"+job});
  return {interlude:job,warned:!!G.tips[job]};
}
/* Entering it: warned, and it is a gunfight; unwarned, and it is a report. */
function enterJob(G){
  const job=G.interlude; if(!job)return null;
  if(!G.tips[job]){
    G.crimesMissed++; G.authority-=1;
    return resolve(G,"job_missed");
  }
  G.authority+=1;
  return theyDraw(G,"ambush");
}
function nextEncounter(G){
  if(G.phase==="summary")return null;
  if(G.phase==="interlude"&&G.interlude)return enterJob(G);   // walk into it
  if(G.pending){                         // he had not finished after all
    const why=G.pending; G.pending=null;
    G.ending=null; G.outcome=null;
    return theyDraw(G,why);
  }
  const due=interludeDue(G);
  if(due&&G.interlude!==due.job)return runInterlude(G,due.job);
  G.interlude=null; G.by=null; G.jobEnc=null;
  G.encounter++;
  // knocked down: the street went on without him, and one caller came and went
  if(G.incapacitated){G.incapacitated=false; G.skipped++; G.encounter++;}
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
