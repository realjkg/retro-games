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
      const seen={opening:true}, ends=new Set(), deepest={};
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
      walk("opening",1);
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
    const go=(tips)=>{const G=newDay({seed:33});Object.assign(G.tips,tips);
      G.encounter=2; beginEncounter(G); resolve(G,"departed");
      nextEncounter(G);                                 // the interlude falls here
      return {outcome:G.outcome,missed:G.crimesMissed,authority:G.authority};};
    return JSON.stringify({warned:go({train:true}),blind:go({})});
  })()`));
  assert.equal(out.warned.outcome,'job_stopped','a warned sheriff missed the train job');
  assert.equal(out.warned.missed,0);
  assert.equal(out.blind.outcome,'job_missed','an unwarned sheriff somehow stopped it');
  assert.equal(out.blind.missed,1);
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

test('10. every cue is played or reserved, and the themes are named', ()=>{
  const ui=fs.readFileSync(path.join(ROOT,'ui.js'),'utf8');
  const {run}=load();
  const vm=require('node:vm');
  const audio=fs.readFileSync(path.join(ROOT,'sid-audio.js'),'utf8');
  const abox={};vm.createContext(abox);
  vm.runInContext(audio.slice(0,audio.indexOf('const GATE='))+'\nthis.S=SOUNDS;',abox);
  const cues=Object.keys(abox.S);
  const arrivals=new Set(JSON.parse(run('JSON.stringify(CAST.flatMap(e=>e.arrive||[]))')));
  const RESERVED=['romance','title','dusk','dawn','badge'];
  const idle=cues.filter(c=>!ui.includes('SND.'+c+'(')&&!arrivals.has(c)&&!RESERVED.includes(c));
  assert.deepEqual(idle,[],'cues nothing plays: '+idle.join(', '));
  const themes=JSON.parse(run('JSON.stringify(CAST.map(e=>e.theme))'));
  assert.equal(new Set(themes).size,11,'callers share entrance themes');
  report.themesPending=themes.filter(t=>!cues.includes(t));
});

test('report', ()=>{
  fs.writeFileSync(path.join(ROOT,'test','last-report.json'),JSON.stringify(report,null,2));
  console.log('\n'+JSON.stringify(report,null,2));
});
