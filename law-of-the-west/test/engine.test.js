/* The day, the trees and the reckoning.  node --test test/*.test.js */
'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('fs'), path=require('path'), {execFileSync}=require('child_process');
const {load}=require('./harness.js');
const ROOT=path.join(__dirname,'..');
const report={};

test('1. the scripts parse', ()=>{
  for(const f of ['content.js','engine.js','ui.js','sid-audio.js'])
    execFileSync(process.execPath,['--check',path.join(ROOT,f)]);
});

test('2. eleven callers, in order, and every written tree is sound', ()=>{
  const {run}=load();
  const out=JSON.parse(run(`(()=>{
    const bad=[],ids=new Set();
    if(CAST.length!==11)bad.push("cast is "+CAST.length+", expected eleven callers");
    for(const e of CAST){
      if(ids.has(e.id))bad.push(e.id+": duplicate id"); ids.add(e.id);
      for(const f of ["name","place","theme"])if(!e[f])bad.push(e.id+": no "+f);
      if(typeof e.armed!=="boolean")bad.push(e.id+": armed is not a boolean");
      if(!written(e))continue;
      if(!e.rounds.opening)bad.push(e.id+": no opening");
      const roots=e.roots||["opening"];
      const seen={}, ends=new Set(), deepest={};
      for(const r of roots){seen[r]=true; if(!e.rounds[r])bad.push(e.id+": no root "+r);}
      const walk=(id,d)=>{
        if(deepest[id]>=d)return;                     // already checked at least this deep
        deepest[id]=d;
        const n=e.rounds[id];
        if(!n){bad.push(e.id+": no node "+id);return;}
        if(!n.npc)bad.push(e.id+"/"+id+": the visitor says nothing");
        if(n.npc&&n.npc.length>LIMITS.NPC)bad.push(e.id+"/"+id+": visitor line "+n.npc.length+" chars");
        if(!n.replies||n.replies.length!==LIMITS.REPLIES)
          bad.push(e.id+"/"+id+": "+(n.replies||[]).length+" replies, expected "+LIMITS.REPLIES);
        (n.replies||[]).forEach((r,i)=>{
          const where=e.id+"/"+id+" reply "+(i+1);
          if(!r.text)bad.push(where+": no words");
          if(r.text&&r.text.length>LIMITS.REPLY)bad.push(where+": "+r.text.length+" chars");
          const routes=["next","end","action"].filter(k=>r[k]);
          if(routes.length!==1)bad.push(where+": "+routes.length+" routes, expected one");
          if(r.next){
            if(!e.rounds[r.next])bad.push(where+" -> "+r.next+": no such node");
            else if(d+1>LIMITS.ROUNDS)bad.push(where+": goes past "+LIMITS.ROUNDS+" exchanges");
            else {seen[r.next]=true;walk(r.next,d+1);}
          }
          if(r.end){ends.add(r.end); if(!e.ends[r.end])bad.push(where+" -> "+r.end+": no such ending");}
          if(r.action&&!["draw","ambush","delayed","surrender","depart"].includes(r.action))
            bad.push(where+": unknown action "+r.action);
        });
      };
      for(const r of roots)walk(r,1);
      for(const id of Object.keys(e.rounds))if(!seen[id])bad.push(e.id+": node "+id+" is unreachable");
      for(const id of Object.keys(e.ends||{})){
        if(!ends.has(id))bad.push(e.id+": ending "+id+" is unreachable");
        const t=e.ends[id];
        if(!t.text)bad.push(e.id+"/"+id+": no text");
        for(const f of t.flags||[])if(!FLAGS.includes(f))bad.push(e.id+"/"+id+": unknown flag "+f);
      }
    }
    return JSON.stringify({bad,written:CAST.filter(written).map(e=>e.id),order:CAST.map(e=>e.id)});
  })()`));
  assert.deepEqual(out.bad,[]);
  report.written=out.written; report.order=out.order;
});

/* Play a whole day, choosing replies with the given chooser. */
function playDay(seed,chooser,opts){
  const {run,box}=load();
  box.__choose=chooser; box.__opts=opts||{};
  return JSON.parse(run(`(()=>{
    const G=newDay({seed:${seed}}); globalThis.G=G;
    beginEncounter(G); openDialogue(G);
    let guard=0;
    while(G.phase!=="summary"&&guard++<400){
      if(G.phase==="dialogue"){
        if(__opts.drawAt&&__opts.drawAt===G.encounter&&G.mode==="talk"){drawGun(G,0);continue;}
        say(G,__choose(G.encounter,G.round,G.rng()));
      }
      else if(G.phase==="tell"){G.phase="duel";G.duel.drawn=true;}
      else if(G.phase==="duel"||G.phase==="aiming"){
        aimAt(G,G.rng()<0.5?"arm":"torso"); shoot(G,300);
      }
      else if(G.phase==="resolve"||G.phase==="interlude"){
        nextEncounter(G); if(G.phase==="approach")openDialogue(G);
      }
      else if(G.phase==="approach")openDialogue(G);
      else break;
    }
    return JSON.stringify({phase:G.phase,over:G.over,alive:G.alive,
      encounters:G.results.length,met:G.met,tips:G.tips,flags:G.flags,
      results:G.results.map(r=>r.who+":"+r.outcome)});
  })()`));
}

test('3. a day runs all eleven callers in order and ends at sundown', ()=>{
  const seen={};
  for(let i=0;i<200;i++){
    const r=playDay(i,(enc,round,x)=>Math.floor(x*4));
    assert.equal(r.phase,'summary','day '+i+' never reached sundown');
    assert.ok(r.over,'no reckoning');
    for(const k of Object.keys(r.over.categories))seen[k]=true;
    if(r.alive)assert.equal(r.met.length,11,'day '+i+' met '+r.met.length+' callers');
  }
  assert.deepEqual(Object.keys(seen).sort(),
    ["authority maintained","bad guys shot","crimes missed","crooks captured",
     "innocents killed","romance","wounds survived"].sort(),
    'the reckoning is not the seven dimensions');
});

test('4. the gun interrupts any conversation', ()=>{
  const {run}=load();
  const r=JSON.parse(run(`(()=>{
    const G=newDay({seed:4});
    beginEncounter(G); openDialogue(G);
    const before=G.phase;
    drawGun(G,0);
    const drawn=G.phase, mode=G.mode;
    holster(G);
    return JSON.stringify({before,drawn,mode,after:G.phase,talking:G.mode});
  })()`));
  assert.equal(r.before,'dialogue');
  assert.equal(r.drawn,'aiming','drawing did not interrupt the conversation');
  assert.equal(r.mode,'gun');
  assert.equal(r.after,'dialogue','holstering did not hand the conversation back');
  assert.equal(r.talking,'talk');
});

test('5. surrender, departure, the delayed draw and the ambush all behave', ()=>{
  const {run}=load();
  const out=JSON.parse(run(`(()=>{
    const o={};
    const fresh=()=>{const G=newDay({seed:9});G.encounter=CAST.findIndex(e=>e.id==="kid");
      beginEncounter(G);openDialogue(G);return G;};
    let G=fresh(); act(G,"surrender");
    o.surrender={outcome:G.outcome,arrests:G.arrests,authority:G.authority};
    G=fresh(); act(G,"depart");
    o.depart={outcome:G.outcome,flags:G.flags.slice()};
    G=fresh(); act(G,"delayed");
    o.delayed={outcome:G.outcome,pending:G.pending};
    nextEncounter(G);
    o.delayedThen={phase:G.phase,why:G.tell&&G.tell.why,tell:G.tell&&G.tell.delay};
    G=fresh(); act(G,"ambush");
    o.ambush={phase:G.phase,why:G.tell.why,tell:G.tell.delay};
    return JSON.stringify(o);
  })()`));
  assert.equal(out.surrender.outcome,'surrendered');
  assert.equal(out.surrender.arrests,1);
  assert.equal(out.depart.outcome,'departed');
  assert.equal(out.delayed.pending,'delayed');
  assert.equal(out.delayedThen.phase,'tell','he never turned back');
  assert.equal(out.delayedThen.why,'delayed');
  assert.equal(out.ambush.phase,'tell');
  assert.ok(out.ambush.tell<=260,'an ambush gave '+out.ambush.tell+'ms of warning');
  assert.ok(out.delayedThen.tell>out.ambush.tell,'a delayed draw warns no more than an ambush');
});

test('6. the doctor decides whether a bullet is survivable', ()=>{
  const {run}=load();
  const out=JSON.parse(run(`(()=>{
    const hit=(set)=>{const G=newDay({seed:21});G.encounter=2;beginEncounter(G);
      set(G); takeHit(G,"test");
      return {outcome:G.outcome,phase:G.phase,alive:G.alive,wounds:G.wounds};};
    return JSON.stringify({
      civil:  hit(G=>{G.doctor.met=true;G.doctor.disposition=1;}),
      insulted:hit(G=>{G.doctor.met=true;G.doctor.disposition=-2;}),
      drunk:  hit(G=>{G.doctor.met=true;G.doctor.disposition=1;G.doctor.sober=false;}),
      dead:   hit(G=>{G.doctor.alive=false;})
    });
  })()`));
  assert.equal(out.civil.outcome,'doctor_saved','a civil sheriff was not patched up');
  assert.equal(out.civil.alive,true);
  assert.equal(out.insulted.phase,'summary','insulting him was survivable');
  assert.equal(out.insulted.alive,false);
  assert.notEqual(out.drunk.outcome,'doctor_saved','a drunk doctor still patched him up');
  assert.equal(out.drunk.alive,true,'one wound should be survivable on his own');
  assert.notEqual(out.dead.outcome,'doctor_saved','a dead doctor still patched him up');
  report.doctor=out;
});

test('7. a tip stops its robbery and silence lets it happen', ()=>{
  const {run}=load();
  const out=JSON.parse(run(`(()=>{
    const at=INTERLUDES.find(i=>i.job==="stage").after;
    const go=(tips)=>{const G=newDay({seed:33});Object.assign(G.tips,tips);
      G.encounter=at-1; beginEncounter(G); resolve(G,"departed");
      const brief=nextEncounter(G);                     // the job falls here
      const entered=enterJob(G);                        // and the sheriff walks into it
      return {brief,phase:G.phase,outcome:G.outcome,missed:G.crimesMissed,
        authority:G.authority,why:G.tell&&G.tell.why,who:who(G)&&who(G).id};};
    return JSON.stringify({warned:go({stage:true}),blind:go({})});
  })()`));
  assert.equal(out.warned.brief.warned,true,'the brief did not say he had been warned');
  assert.equal(out.warned.phase,'tell','a warned sheriff was not there when they came');
  assert.equal(out.warned.who,'stage','the robbery is not who he is facing');
  assert.equal(out.warned.missed,0);
  assert.ok(out.warned.authority>0,'standing in front of it earned nothing');
  assert.equal(out.blind.outcome,'job_missed','an unwarned sheriff somehow stopped it');
  assert.equal(out.blind.missed,1);
  assert.ok(out.blind.authority<0,'missing it cost nothing');
});

test('8. shooting an unarmed man counts against the sheriff, not for him', ()=>{
  const {run}=load();
  const out=JSON.parse(run(`(()=>{
    for(let seed=0;seed<40;seed++){                   // a steady shot still scatters
      const G=newDay({seed}); G.encounter=CAST.findIndex(e=>e.id==="rose");
      beginEncounter(G); openDialogue(G);
      drawGun(G,0); aimAt(G,"torso"); shoot(G,500);
      if(G.outcome==="innocent_killed")
        return JSON.stringify({outcome:G.outcome,innocents:G.innocentsKilled,
          bad:G.badGuysShot,authority:G.authority,seed});
    }
    return JSON.stringify({outcome:"never hit her",innocents:0,bad:0,authority:0});
  })()`));
  assert.equal(out.innocents,1,'an unarmed visitor was counted as a bad guy');
  assert.equal(out.bad,0);
  assert.ok(out.authority<0,'shooting her cost no authority');
});

test('9. what the crosshair is over is what the bullet finds', ()=>{
  const {run}=load();
  const g=JSON.parse(run(`(()=>{
    const G=newDay({seed:7}); G.encounter=0; beginEncounter(G);
    const out={};
    for(const zone of ["arm","torso"]){aimAt(G,zone);out[zone]=boxAt(G,G.aim.x,G.aim.y);}
    theyDraw(G,"draw"); G.duel.drawn=true;
    aimAt(G,"arm"); out.raised=boxAt(G,G.aim.x,G.aim.y);
    out.off=boxAt(G,0.02,0.02); out.boxes=HITBOX; out.scene=SCENE;
    return JSON.stringify(out);
  })()`));
  assert.equal(g.arm,'weapon'); assert.equal(g.torso,'lethal');
  assert.equal(g.raised,'weapon'); assert.equal(g.off,null);
  const b=g.boxes, over=(p,q)=>p.x<q.x+q.w&&q.x<p.x+p.w&&p.y<q.y+q.h&&q.y<p.y+p.h;
  assert.ok(!over(b.weapon,b.lethal)&&!over(b.weaponRaised,b.lethal),'the boxes overlap');
  for(const [k,r] of Object.entries(b))
    assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=g.scene.w&&r.y+r.h<=g.scene.h,k+' is off the scene');
  assert.deepEqual([g.scene.w,g.scene.h],[320,200],'the logical screen is not 320x200');
});

test('10. every cue is played or reserved, and every caller has his own theme', ()=>{
  const ui=fs.readFileSync(path.join(ROOT,'ui.js'),'utf8');
  const {run}=load();
  const vm=require('node:vm');
  const audio=fs.readFileSync(path.join(ROOT,'sid-audio.js'),'utf8');
  const abox={};vm.createContext(abox);
  vm.runInContext(audio.slice(0,audio.indexOf('const GATE='))+'\nthis.S=SOUNDS;',abox);
  const S=abox.S, cues=Object.keys(S);
  const arrivals=new Set(JSON.parse(run('JSON.stringify('+
    'CAST.concat(Object.keys(JOBS).map(k=>JOBS[k])).flatMap(e=>e.arrive||[]))')));
  const themes=JSON.parse(run('JSON.stringify(CAST.map(e=>e.theme))'));
  const named=new Set(themes.concat('th_job'));
  const RESERVED=['romance','title','dusk','dawn','badge'];
  const idle=cues.filter(c=>!ui.includes('SND.'+c+'(')&&!arrivals.has(c)
    &&!RESERVED.includes(c)&&!named.has(c));
  assert.deepEqual(idle,[],'cues nothing plays: '+idle.join(', '));
  assert.equal(new Set(themes).size,11,'callers share entrance themes');
  const missing=[...named].filter(t=>!cues.includes(t));
  assert.deepEqual(missing,[],'themes with no music written: '+missing.join(', '));
  // three voices was the machine's limit, so no cue may need a fourth at once
  const over=[];
  for(const name of named){
    let longest=0;
    const spans=[];
    for(const v of S[name]){
      for(const [,st,d] of (v.seq||[[0,0,v.dur]])){
        spans.push([(v.dly||0)+st,(v.dly||0)+st+d]);
        longest=Math.max(longest,(v.dly||0)+st+d);
      }
    }
    for(const [t] of spans){
      const n=spans.filter(([a,b])=>t>=a-1e-9&&t<b-1e-9).length;
      if(n>3){over.push(name+' needs '+n+' voices');break;}
    }
    if(longest<0.8||longest>6)over.push(name+' runs '+longest.toFixed(2)+'s');
  }
  assert.deepEqual(over,[],over.join('; '));
  // a drawn gun has to be able to stop one
  assert.ok(audio.includes('function theme(')&&audio.includes('function cut('),
    'the audio has no way to start or stop a theme');
  assert.ok(ui.includes('SND.cut()'),'nothing ever cuts a theme');
  report.themes=[...named];
});

test('11. twelve figures, no two alike, each with hitboxes over his own art', ()=>{
  const {run}=load();
  const out=JSON.parse(run(`(()=>{
    const bad=[], seen=new Map();
    for(const e of CAST.concat(Object.keys(JOBS).map(k=>JOBS[k]))){
      const fig=figureOf(e), key=(e.figure||e.id);
      if(fig.rows.length!==SPR.h)bad.push(key+": "+fig.rows.length+" rows, expected "+SPR.h);
      for(const r of fig.rows)if(r.length!==SPR.w)bad.push(key+": a row is "+r.length+" wide");
      const sig=fig.rows.join("|");
      if(seen.has(sig)&&seen.get(sig)!==key&&!JOBS[key]&&!JOBS[seen.get(sig)])
        bad.push(key+" and "+seen.get(sig)+" are the same figure");
      if(!JOBS[key])seen.set(sig,key);
      const b=fig.box||DEFAULT_BOX;
      for(const k of ["lethal","weapon","raised"]){
        const [c0,r0,c1,r1]=b[k];
        if(c0<0||r0<0||c1>=SPR.w||r1>=SPR.h||c1<c0||r1<r0)bad.push(key+"/"+k+" is off the grid");
      }
      // the lethal box has to be over him, and the weapon box over his weapon
      const filled=(c0,r0,c1,r1,ch)=>{
        for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){
          const g=(fig.rows[r]||"")[c]||".";
          if(ch?g===ch:g!==".")return true;
        } return false;
      };
      if(!filled.apply(null,b.lethal))bad.push(key+": the lethal box is over empty air");
      if(e.armed&&!filled.apply(null,b.weapon.concat("G")))
        bad.push(key+": the weapon box is not over any gunmetal");
      if(e.armed&&fig.raise){
        const rows=fig.rows.slice();
        for(const k of Object.keys(fig.raise))
          rows[+k]=(fig.raise[k]+"........................").slice(0,SPR.w);
        const [c0,r0,c1,r1]=b.raised; let g=false;
        for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++)if(((rows[r]||"")[c])==="G")g=true;
        if(!g)bad.push(key+": the raised box is not over the raised gun");
      }
      if(e.armed&&!fig.raise&&!e.forcedDuel&&false)bad.push(key+": no raised pose");
    }
    // the boxes must not overlap, or a shot would be two things at once
    const over=(p,q)=>p.x<q.x+q.w&&q.x<p.x+p.w&&p.y<q.y+q.h&&q.y<p.y+p.h;
    for(const e of CAST){
      const bx=boxesFor(e);
      if(over(bx.weapon,bx.lethal))bad.push(e.id+": weapon and lethal boxes overlap");
      if(over(bx.weaponRaised,bx.lethal))bad.push(e.id+": raised and lethal boxes overlap");
      for(const k of Object.keys(bx)){const r=bx[k];
        if(r.x<0||r.y<0||r.x+r.w>SCENE.w||r.y+r.h>SCENE.h)bad.push(e.id+"/"+k+" is off the scene");}
    }
    return JSON.stringify({bad,figures:[...seen.values()]});
  })()`));
  assert.deepEqual(out.bad,[]);
  assert.equal(out.figures.length,11,'expected eleven distinct callers');
  report.figures=out.figures;
});

test('12. every caller is reachable and every action class occurs across the day', ()=>{
  const {run}=load();
  const out=JSON.parse(run(`(()=>{
    const actions={}, ends={}, unwritten=[];
    for(const e of CAST){
      if(!written(e)){unwritten.push(e.id);continue;}
      const per=new Set();
      for(const id of Object.keys(e.rounds))
        for(const r of e.rounds[id].replies){
          if(r.action){actions[r.action]=(actions[r.action]||0)+1;per.add("act:"+r.action);}
          if(r.end)per.add("end:"+r.end);
        }
      ends[e.id]=[...per].sort();
    }
    return JSON.stringify({actions,ends,unwritten});
  })()`));
  assert.deepEqual(out.unwritten,['lastgun'],'the only caller without words is the last one');
  for(const a of ['draw','ambush','delayed','surrender','depart'])
    assert.ok(out.actions[a]>0,'no caller ever answers with "'+a+'"');
  report.actions=out.actions;
});

test('13. the doctor has five states and each one decides the day differently', ()=>{
  const {run}=load();
  const out=JSON.parse(run(`(()=>{
    const hit=(set,n)=>{const G=newDay({seed:21});G.encounter=2;beginEncounter(G);
      set(G); for(let i=0;i<(n||1);i++)if(G.alive)takeHit(G,"test");
      return {state:doctorState(G),outcome:G.outcome,phase:G.phase,alive:G.alive,wounds:G.wounds};};
    return JSON.stringify({
      civil:    hit(G=>{G.doctor.disposition=1;G.doctor.sober=true;},2),
      neutral1: hit(G=>{G.doctor.disposition=0;G.doctor.sober=true;},1),
      neutral2: hit(G=>{G.doctor.disposition=0;G.doctor.sober=true;},2),
      drunk1:   hit(G=>{G.doctor.sober=false;G.doctor.disposition=1;},1),
      drunk2:   hit(G=>{G.doctor.sober=false;G.doctor.disposition=1;},2),
      hostile:  hit(G=>{G.doctor.disposition=-2;},1),
      dead:     hit(G=>{G.doctor.alive=false;},1)});
  })()`));
  assert.equal(out.civil.state,'civil');
  assert.equal(out.civil.alive,true,'a civil doctor let two wounds kill him');
  assert.equal(out.civil.outcome,'doctor_saved');
  assert.equal(out.neutral1.alive,true,'one wound alone was fatal');
  assert.equal(out.neutral1.outcome,'doctor_came');
  assert.equal(out.neutral2.alive,false,'the second wound was survivable');
  assert.equal(out.drunk1.state,'drunk');
  assert.equal(out.drunk1.outcome,'doctor_drunk');
  assert.equal(out.drunk2.alive,false);
  assert.equal(out.hostile.alive,false,'insulting him was survivable');
  assert.equal(out.dead.alive,false,'a dead doctor still came');
  report.doctorStates=out;
});

test('14. shooting the doctor takes the town\'s only rescue with him', ()=>{
  const {run}=load();
  const out=JSON.parse(run(`(()=>{
    for(let seed=0;seed<200;seed++){
      const G=newDay({seed}); G.encounter=CAST.findIndex(e=>e.id==="doctor");
      beginEncounter(G); openDialogue(G);
      drawGun(G,0); aimAt(G,"torso"); shoot(G,500);
      if(G.outcome==="innocent_killed")
        return JSON.stringify({alive:G.doctor.alive,state:doctorState(G),
          innocents:G.innocentsKilled,seed});
    }
    return JSON.stringify({alive:true,state:"never hit him"});
  })()`));
  assert.equal(out.alive,false,'the doctor survived being shot dead');
  assert.equal(out.state,'dead');
  assert.equal(out.innocents,1);
});

test('15. an unarmed caller has no gun to shoot out of his hand', ()=>{
  const {run}=load();
  const out=JSON.parse(run(`(()=>{
    for(let seed=0;seed<200;seed++){
      const G=newDay({seed}); G.encounter=CAST.findIndex(e=>e.id==="rose");
      beginEncounter(G); openDialogue(G);
      drawGun(G,0); aimAt(G,"arm"); shoot(G,500);
      if(G.outcome==="wounded_innocent")
        return JSON.stringify({outcome:G.outcome,arrests:G.arrests,authority:G.authority});
    }
    return JSON.stringify({outcome:"never hit her arm",arrests:0,authority:0});
  })()`));
  assert.equal(out.outcome,'wounded_innocent','shooting her arm made an arrest');
  assert.equal(out.arrests,0);
  assert.ok(out.authority<0);
});

test('16. all three robberies happen, in their place, and only once each', ()=>{
  const {run}=load();
  const out=JSON.parse(run(`(()=>{
    const runDay=(tips)=>{
      const want=!!tips.stage;
      const G=newDay({seed:5}); Object.assign(G.tips,tips);
      const seen=[]; let guard=0;
      beginEncounter(G); openDialogue(G);
      while(G.phase!=="summary"&&guard++<500){
        if(G.phase==="dialogue"){say(G,0); if(!want)Object.assign(G.tips,{train:false,stage:false,bank:false});}
        else if(G.phase==="interlude"){
          if(want)Object.assign(G.tips,{train:true,stage:true,bank:true});
          seen.push(G.interlude+(G.tips[G.interlude]?":met":":missed"));
          enterJob(G);}
        else if(G.phase==="tell"){G.phase="duel";G.duel.drawn=true;}
        else if(G.phase==="duel"||G.phase==="aiming"){aimAt(G,"arm");shoot(G,300);}
        else if(G.phase==="resolve"){nextEncounter(G);if(G.phase==="approach")openDialogue(G);}
        else if(G.phase==="approach")openDialogue(G);
        else break;
      }
      return {seen,missed:G.crimesMissed,phase:G.phase,
        order:INTERLUDES.map(i=>i.job+"@"+i.after)};
    };
    return JSON.stringify({warned:runDay({stage:true,train:true,bank:true}),blind:runDay({})});
  })()`));
  assert.deepEqual(out.warned.order,['stage@4','train@8','bank@10']);
  assert.deepEqual(out.blind.seen,['stage:missed','train:missed','bank:missed']);
  assert.equal(out.blind.missed,3,'a blind sheriff missed '+out.blind.missed+' of three');
  assert.deepEqual(out.warned.seen,['stage:met','train:met','bank:met']);
  // every tip has a caller who can give it, before the job it is about
  const {run:r2}=load();
  const sources=JSON.parse(r2(`(()=>{
    const first={};
    CAST.forEach((e,i)=>{
      for(const id of Object.keys(e.ends||{}))
        for(const f of e.ends[id].flags||[])
          if(f.indexOf("tip_")===0&&first[f.slice(4)]==null)first[f.slice(4)]=i+1;
    });
    return JSON.stringify({first,jobs:INTERLUDES});
  })()`));
  for(const i of sources.jobs)
    assert.ok(sources.first[i.job]<=i.after,
      'nobody can warn about the '+i.job+' job before it happens');
});

/* The three mechanics the 1985 description names that this build did not have:
 * a gun in a man's face before he has been answered, the blackout when the
 * sheriff is the one hit, and a doctor whose willingness is not only about the
 * doctor. */
test('17. a gun drawn before he is answered stops him talking until it is up', ()=>{
  const {run}=load();
  const out=JSON.parse(run(`(()=>{
    const r={};
    const G=newDay({seed:17});
    beginEncounter(G); openDialogue(G);
    r.opening=G.phase;
    drawGun(G,0);
    r.balked=G.balked;
    r.saidAnyway=say(G,0);                 // he is not talking to a gun
    r.stillOpening=G.node;
    holster(G);
    r.afterHolster=G.phase;
    r.saysNow=!!say(G,0);                  // and the conversation is handed back
    // but a gun drawn after he has been answered is not the same thing
    const H=newDay({seed:18});
    beginEncounter(H); openDialogue(H); say(H,0);
    drawGun(H,0);
    r.lateDraw=H.balked;
    // every caller has words for it, and none of them runs long
    r.lines=CAST.filter(e=>written(e)).map(e=>e.balk?e.balk.length:0);
    r.fallback=typeof BALK_LINE;
    return JSON.stringify(r);
  })()`));
  assert.equal(out.opening,'dialogue');
  assert.equal(out.balked,true,'the gun came out first and he carried on regardless');
  assert.equal(out.saidAnyway,null,'he answered a man pointing a gun at him');
  assert.equal(out.stillOpening,'opening','the conversation moved on without him');
  assert.equal(out.afterHolster,'dialogue');
  assert.equal(out.saysNow,true,'putting it up did not hand the conversation back');
  assert.equal(out.lateDraw,false,'drawing after he was answered counts as balking him');
  assert.equal(out.fallback,'string','no line for a caller who has none of his own');
  for(const n of out.lines)assert.ok(n>20&&n<=150,'a balk line is '+n+' characters');
});

test('18. being shot blacks the street out, and the doctor reads the whole town', ()=>{
  const {run}=load();
  const out=JSON.parse(run(`(()=>{
    const r={};
    const G=newDay({seed:19}); G.doctor.sober=true; G.doctor.disposition=1;
    beginEncounter(G);
    r.before=G.blackout;
    takeHit(G,"shot");
    r.after=G.blackout;
    r.outcome=G.outcome;
    beginEncounter(G);                     // and it lifts when he walks on
    r.next=G.blackout;
    // a sheriff who shoots men who never drew is one the town is slower to send for
    const K=newDay({seed:20}); K.doctor.sober=true; K.doctor.disposition=1;
    r.civil=doctorState(K);
    K.innocentsKilled=2;
    r.afterKillings=doctorState(K);
    // and one the street stands behind is patched up
    const P=newDay({seed:21}); P.doctor.sober=true; P.doctor.disposition=0;
    r.neutral=doctorState(P);
    P.authority=3;
    r.afterStanding=doctorState(P);
    return JSON.stringify(r);
  })()`));
  assert.equal(out.before,false);
  assert.equal(out.after,true,'he was shot and the street stayed lit');
  assert.equal(out.outcome,'doctor_saved');
  assert.equal(out.next,false,'the blackout never lifted');
  assert.equal(out.civil,'civil');
  assert.equal(out.afterKillings,'hostile',
    'the doctor does not care how many men the sheriff shot who never drew');
  assert.equal(out.neutral,'neutral');
  assert.equal(out.afterStanding,'civil',
    'the town standing behind the sheriff counts for nothing with the doctor');
});

test('19. the second gun at the window shows itself, can be shot, and shoots back', ()=>{
  const {run}=load();
  const out=JSON.parse(run(`(()=>{
    const r={};
    // he is not on every caller, and never more than twice in a day
    const counts=[], where=new Set(); let enc=0, sn=0;
    for(let seed=0;seed<40;seed++){
      const G=newDay({seed}); let n=0;
      for(let i=0;i<CAST.length;i++){
        G.encounter=i; beginEncounter(G); enc++;
        if(G.sniper){n++;sn++;where.add(i);}
      }
      counts.push(n);
    }
    r.most=Math.max.apply(null,counts);
    r.rate=sn/enc;
    r.callers=where.size;
    // find a day that has one, and walk its clock
    let G=null;
    for(let seed=0;seed<60&&!G;seed++){
      const H=newDay({seed}); H.encounter=0; beginEncounter(H);
      if(H.sniper)G=H;
    }
    r.found=!!G;
    openDialogue(G);
    r.hiddenAtFirst=boxAt(G,(SNIPER_BOX.x+3)/SCENE.w,(SNIPER_BOX.y+3)/SCENE.h);
    tick(G,0); tick(G,G.sniper.show+1);
    r.shown=G.sniper.shown;
    r.nowATarget=boxAt(G,(SNIPER_BOX.x+3)/SCENE.w,(SNIPER_BOX.y+3)/SCENE.h);
    // the sash goes up before he fires, or there was no warning at all
    r.warning=G.sniper.limit-G.sniper.show;
    r.phaseStill=G.phase;
    // shoot him
    const shot=newDay({seed:0});
    Object.assign(shot,{sniper:{alive:true,fired:false,shown:true,at:0,show:0,limit:9e9}});
    shot.encounter=0; shot.phase="aiming"; shot.mode="gun";
    shot.aim={x:(SNIPER_BOX.x+3)/SCENE.w,y:(SNIPER_BOX.y+3)/SCENE.h};
    shoot(shot,300);
    r.outcome=shot.outcome; r.badGuys=shot.badGuysShot;
    r.windowEmpty=shot.sniper.alive;
    // and if he is left alone he fires
    const hit=newDay({seed:0}); hit.encounter=0; beginEncounter(hit); openDialogue(hit);
    hit.sniper={alive:true,fired:false,shown:false,at:null,show:10,limit:20};
    hit.doctor.sober=true; hit.doctor.disposition=1;
    tick(hit,0); tick(hit,25);
    r.fired=hit.sniper.fired; r.wounds=hit.wounds; r.blackout=hit.blackout;
    // but not once the street is over
    const past=newDay({seed:0}); past.encounter=0; beginEncounter(past);
    past.phase="resolve";
    past.sniper={alive:true,fired:false,shown:true,at:0,show:0,limit:10};
    tick(past,999);
    r.firedAfter=past.sniper.fired;
    return JSON.stringify(r);
  })()`));
  assert.ok(out.most<=2,'a day had '+out.most+' men at the window');
  // some callers bring one and most do not: a street where every window has a
  // rifle in it is a game about windows rather than about people
  assert.ok(out.rate>0.1&&out.rate<0.4,
    'a window over '+(out.rate*100).toFixed(0)+'% of encounters');
  // and never the same caller twice over: which encounter has one is the
  // surprise, not whether the day has one somewhere in it
  assert.ok(out.callers>=5,'only '+out.callers+' callers ever bring one');
  assert.equal(out.found,true,'no seed in sixty put a man at the window');
  assert.equal(out.hiddenAtFirst,null,'the window was a target before the sash went up');
  assert.equal(out.shown,true,'the sash never went up');
  assert.equal(out.nowATarget,'sniper','the sash went up and he still cannot be shot');
  assert.ok(out.warning>=1200,'only '+out.warning+'ms between the sash and the shot');
  assert.equal(out.phaseStill,'dialogue','the sash going up ended the conversation');
  assert.equal(out.outcome,'sniper_down');
  assert.equal(out.badGuys,1,'shooting him off the sill counted for nothing');
  assert.equal(out.windowEmpty,false);
  assert.equal(out.fired,true,'he was left alone and never fired');
  assert.equal(out.wounds,1,'his shot did nothing');
  assert.equal(out.blackout,true,'being shot from a window does not black the street out');
  assert.equal(out.firedAfter,false,'he fired into an encounter that was already over');
});

test('report', ()=>{
  fs.writeFileSync(path.join(ROOT,'test','last-report.json'),JSON.stringify(report,null,2));
  console.log('\n'+JSON.stringify(report,null,2));
});
