/* Tests 1-7 of the plan against the new content model. Test 8 is page.test.js.
 *   node --test test/*.test.js                                              */
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

test('2. the anthology and every authored encounter are sound', ()=>{
  const {run}=load({fill:false});
  const problems=JSON.parse(run(`(()=>{
    const bad=[],ids=new Set(),ops=[">=","<=",">","<","==","!="];
    const known=["respect","fear","suspicion","evidence","drawRisk","safety","favours","wounds","clues"];
    const isVar=n=>known.includes(n)||/^clue:[a-z_]+$/.test(n);
    for(const e of ENCOUNTERS){
      if(ids.has(e.id))bad.push(e.id+": duplicate id"); ids.add(e.id);
      for(const f of ["title","surface","hidden","core","place"])
        if(!e[f])bad.push(e.id+": no "+f);
      if(typeof e.armed!=="boolean")bad.push(e.id+": armed is not a boolean");
      if(!e.armed&&e.drawAt<99)bad.push(e.id+": unarmed but can be provoked into a draw");
      const turns=DIALOGUE[e.id];
      if(!turns)continue;                                  // not authored yet
      if(turns.length!==RULES.TURNS)bad.push(e.id+": "+turns.length+" turns, expected "+RULES.TURNS);
      turns.forEach((t,i)=>{
        const where=e.id+" turn "+(i+1);
        if(!t.say)bad.push(where+": nothing said");
        if(t.replies.length!==INTENTS.length)
          bad.push(where+": "+t.replies.length+" replies, expected "+INTENTS.length);
        for(const intent of INTENTS)
          if(!t.replies.some(r=>r.intent===intent))bad.push(where+": no "+intent+" reply");
        t.replies.forEach(r=>{
          if(!r.t)bad.push(where+": reply with no words");
          if(!r.react)bad.push(where+" ("+r.intent+"): no reaction");
          const fx=Object.keys(r.fx||{});
          if(!fx.length)bad.push(where+" ("+r.intent+"): changes no state");
          for(const k of fx)if(!known.includes(k)&&k!=="clue")bad.push(where+": unknown variable "+k);
          for(const n of (r.needs||[]))
            if(!isVar(n))bad.push(where+" ("+r.intent+"): needs unknown "+n);
        });
      });
      // endings: two or more, conditions on known variables, a fallback last
      if(!e.endings||e.endings.length<2)bad.push(e.id+": authored but fewer than two endings");
      (e.endings||[]).forEach((x,i)=>{
        if(!x.id)bad.push(e.id+" ending "+i+": no id");
        if(!x.text)bad.push(e.id+" ending "+x.id+": no text");
        for(const [n,op] of (x.when||[])){
          if(!isVar(n))bad.push(e.id+"/"+x.id+": unknown variable "+n);
          if(!ops.includes(op))bad.push(e.id+"/"+x.id+": unknown operator "+op);
        }
        if(x.chance!=null&&!(x.chance>0&&x.chance<=1))
          bad.push(e.id+"/"+x.id+": chance out of 0..1");
        const last=i===(e.endings.length-1);
        if(!last&&!(x.when||[]).length)bad.push(e.id+"/"+x.id+": unconditional but not last");
        if(last&&(x.when||[]).length)bad.push(e.id+": no fallback ending");
        if(last&&x.chance!=null)bad.push(e.id+": the fallback must be certain");
      });
    }
    return JSON.stringify(bad);
  })()`));
  assert.deepEqual(problems,[]);
  report.authored=JSON.parse(run('JSON.stringify(ENCOUNTERS.map(e=>e.id+(DIALOGUE[e.id]?" written":" pending")))'));
});

/* Play one encounter with a chooser over the four intents. */
function playEncounter(id,seed,chooser,fireLatency,clues){
  const h=load(); const {run,box}=h;
  box.__choose=chooser;
  box.__clues=clues||[];
  return JSON.parse(run(`(()=>{
    const G=newGame({seed:${seed}}); globalThis.G=G;
    G.slot=ENCOUNTERS.findIndex(e=>e.id==="${id}");
    G.clues.push(...__clues);                         // what earlier scenes taught him
    beginSlot(G); openDialogue(G);
    let guard=0;
    while(G.phase!=="resolve"&&G.phase!=="summary"&&guard++<40){
      if(G.phase==="dialogue"){
        // a line he could not have known to say is skipped, as a player would
        const t=turnFor(ENCOUNTERS[G.slot].id,G.turn);
        let i=__choose(G.turn,G.rng()), tries=0;
        while(t.replies[i]&&!available(G,t.replies[i])&&tries++<t.replies.length)
          i=(i+1)%t.replies.length;
        respond(G,i);
      }
      else if(G.phase==="tell"){G.phase="duel";G.duel.drawn=true;}
      else if(G.phase==="duel"||G.phase==="aiming"){aimAt(G,G.rng()<0.5?"arm":"torso");
        shoot(G,${fireLatency||320});}
      else break;
    }
    return JSON.stringify({phase:G.phase,outcome:G.outcome,
      ending:G.ending?G.ending.id:null,state:G.S,points:G.points,
      clues:G.clues,duel:G.duel?G.duel.result:null});
  })()`));
}

test('3. five hundred runs of every written encounter reach every ending', ()=>{
  const {run}=load({fill:false});
  const written=JSON.parse(run(`JSON.stringify(ENCOUNTERS.filter(e=>DIALOGUE[e.id]).map(e=>({
    id:e.id,
    endings:e.endings.map(x=>({id:x.id,
      needsClues:(x.when||[]).filter(c=>String(c[0]).startsWith("clue:")).map(c=>c[0].slice(5))}))
  })))`));
  report.runs={};
  for(const enc of written){
    const endings={};
    let exceptions=0;
    for(let i=0;i<500;i++){
      let r;
      try{ r=playEncounter(enc.id,i,(turn,x)=>Math.floor(x*4)); }
      catch(e){exceptions++;continue;}
      assert.equal(r.phase,'resolve',enc.id+' run '+i+' did not settle');
      const key=r.ending||('duel:'+r.outcome);
      endings[key]=(endings[key]||0)+1;
    }
    assert.equal(exceptions,0,enc.id+' threw '+exceptions+' times');
    report.runs[enc.id]=endings;
    // an ending that needs an earlier scene's clue is proved with it in hand
    for(const x of enc.endings.filter(e=>e.needsClues.length)){
      const seen={};
      for(let i=0;i<200;i++){
        const r=playEncounter(enc.id,9000+i,(turn,x2)=>Math.floor(x2*4),320,x.needsClues);
        const key=r.ending||('duel:'+r.outcome);
        seen[key]=(seen[key]||0)+1;
      }
      report.runs[enc.id+' with '+x.needsClues.join('+')]=seen;
      assert.ok(seen[x.id],enc.id+'/'+x.id+' unreachable even holding '+x.needsClues.join('+')
        +': '+JSON.stringify(seen));
      // and it must not be reachable without the clue
      assert.ok(!endings[x.id],enc.id+'/'+x.id+' fired without the clue it needs');
    }
    const local=enc.endings.filter(e=>!e.needsClues.length).map(e=>e.id);
    const missing=local.filter(id=>!endings[id]);
    assert.deepEqual(missing,[],enc.id+': endings never reached: '+missing.join(', '));
    const total=Object.values(endings).reduce((a,b)=>a+b,0);
    const top=Math.max(...Object.values(endings))/total;
    assert.ok(top<=0.6,enc.id+': one outcome took '+(top*100).toFixed(1)+'%: '+JSON.stringify(endings));
  }
});

test('4. one intent held all the way through does not always end the same', ()=>{
  const per={};
  const {run}=load();
  const intents=JSON.parse(run('JSON.stringify(INTENTS)'));
  for(const id of JSON.parse(run('JSON.stringify(ENCOUNTERS.map(e=>e.id))'))){
    per[id]={};
    intents.forEach((intent,idx)=>{
      const counts={};
      for(let i=0;i<100;i++){
        const r=playEncounter(id,i+idx*1000,()=>idx);
        const key=r.ending||('duel:'+r.outcome);
        counts[key]=(counts[key]||0)+1;
      }
      per[id][intent]={top:Math.max(...Object.values(counts)),counts};
    });
  }
  report.variance=per;
  const rigid=Object.entries(per).filter(([,paths])=>
    Object.values(paths).every(p=>p.top>80)).map(([id])=>id);
  // the unwritten encounters run on a single fixture ending, so only the
  // written ones can be judged here
  // ask an unfilled harness which scenes are actually authored
  const writtenIds=JSON.parse(load({fill:false})
    .run('JSON.stringify(ENCOUNTERS.filter(e=>DIALOGUE[e.id]).map(e=>e.id))'));
  const stuck=writtenIds.filter(id=>rigid.includes(id));
  assert.deepEqual(stuck,[],'no intent path varies for: '+stuck.join(', '));
  report.rigidPaths=Object.entries(per).flatMap(([id,paths])=>
    Object.entries(paths).filter(([,p])=>p.top>80).map(([t,p])=>id+'/'+t+' '+p.top+'%'));
});

test('5. two thousand duels across the tell range', ()=>{
  const {run,slotOf}=load();
  const slot=slotOf('deputy'), buckets={};
  for(let i=0;i<2000;i++){
    const lat=140+(i%64)*20;
    const b=Math.floor(lat/100)*100;
    const res=run(`(()=>{
      const G=newGame({seed:${i}}); G.slot=${slot}; beginSlot(G);
      theyDraw(G,"test"); G.phase="duel"; G.duel.drawn=true; aimAt(G,"torso");
      shoot(G,${lat}); return G.duel.result;
    })()`);
    buckets[b]=buckets[b]||{n:0,kill:0,disarm:0,miss:0,too_slow:0};
    buckets[b].n++; buckets[b][res]++;
  }
  report.duel=Object.fromEntries(Object.entries(buckets).map(([k,v])=>
    [k+'ms',{hit:+(((v.kill+v.disarm)/v.n)*100).toFixed(0),kill:+((v.kill/v.n)*100).toFixed(0),
      disarm:+((v.disarm/v.n)*100).toFixed(0),miss:+((v.miss/v.n)*100).toFixed(0),
      slow:+((v.too_slow/v.n)*100).toFixed(0),n:v.n}]));
  const human=[200,300,400].map(ms=>report.duel[ms+'ms'].hit);
  assert.ok(Math.min(...human)>=25,'unwinnable at human speed: '+human.join('/'));
  assert.ok(Math.max(...human)<=90,'trivial at human speed: '+human.join('/'));
  for(const k of ['kill','disarm','miss'])
    assert.ok(Object.values(report.duel).some(v=>v[k]>0),'no '+k+' outcomes');
  assert.ok(Object.values(report.duel).some(v=>v.slow>0),'nobody was ever beaten to the shot');
});

test('6. wounds carry, a banked favour buys one back, and the second is fatal', ()=>{
  const {run,slotOf}=load();
  const slot=slotOf('deputy');
  const one=run(`(()=>{const G=newGame({seed:1});G.slot=${slot};beginSlot(G);
    takeHit(G,"test");return JSON.stringify({o:G.outcome,w:G.wounds,phase:G.phase});})()`);
  assert.deepEqual(JSON.parse(one),{o:'wound_consequence',w:1,phase:'resolve'});
  const two=run(`(()=>{const G=newGame({seed:2});G.slot=${slot};beginSlot(G);
    takeHit(G,"a");takeHit(G,"b");return JSON.stringify({phase:G.phase,why:G.over&&G.over.why,rating:G.over&&G.over.rating});})()`);
  const t=JSON.parse(two);
  assert.equal(t.phase,'summary'); assert.equal(t.why,'killed'); assert.equal(t.rating,1);
  const fav=run(`(()=>{const G=newGame({seed:3});G.slot=${slot};beginSlot(G);G.favours=1;
    takeHit(G,"test");return JSON.stringify({o:G.outcome,w:G.wounds,f:G.favours});})()`);
  assert.deepEqual(JSON.parse(fav),{o:'rescued_from_street',w:0,f:0});
  report.wounds='one wound carries, a banked favour patches it, the second kills';
});

/* The favour is the one state that has to survive between encounters, so it is
 * tested across them rather than in isolation. */
test('6b. the Widow\'s favour is earned in her scene and spent in a later one', ()=>{
  const {run}=load();
  // her favour ending carries a chance of its own, so take the first seed
  // that earns it rather than assuming one does
  const earned=JSON.parse(run(`(()=>{
    for(let seed=0;seed<80;seed++){
      const G=newGame({seed});
      G.slot=ENCOUNTERS.findIndex(e=>e.id==="widow");
      beginSlot(G); openDialogue(G);
      G.S.evidence=2; G.S.respect=2; G.S.fear=0; G.turn=RULES.TURNS-1;
      respond(G,0);                                   // the conciliate reply
      if(G.ending&&G.ending.id==="widow_favour"){
        globalThis.G=G;
        return JSON.stringify({ending:G.ending.id,favours:G.favours,
          clues:G.clues,safety:G.safety,seed});
      }
    }
    return JSON.stringify({ending:null});
  })()`));
  assert.equal(earned.ending,'widow_favour','no seed in eighty earned her favour');
  assert.equal(earned.favours,1,'the favour was not banked');
  assert.ok(earned.clues.includes('ledger'));
  assert.equal(earned.safety,1);
  // carried into a later encounter, spent once, and gone
  const spent=JSON.parse(run(`(()=>{
    const G=globalThis.G;
    while(G.slot<ENCOUNTERS.length-1&&ENCOUNTERS[G.slot].id!=="deputy")nextSlot(G);
    const first=takeHit(G,"shot");
    const second=takeHit(G,"shot again");
    return JSON.stringify({first:first.outcome,favours:G.favours,
      second:second.outcome||G.phase,wounds:G.wounds});
  })()`));
  assert.equal(spent.first,'rescued_from_street','the banked favour was not spent');
  assert.equal(spent.favours,0,'the favour was not consumed');
  assert.equal(spent.second,'wound_consequence','the favour paid twice');
  assert.equal(spent.wounds,1);
  // and a sheriff who frightened her gets nothing
  const feared=JSON.parse(run(`(()=>{
    const G=newGame({seed:12});
    G.slot=ENCOUNTERS.findIndex(e=>e.id==="widow");
    beginSlot(G); openDialogue(G);
    G.S.evidence=3; G.S.respect=2; G.S.fear=2; G.turn=RULES.TURNS;
    settle(G);
    return JSON.stringify({ending:G.ending&&G.ending.id,favours:G.favours});
  })()`));
  assert.notEqual(feared.ending,'widow_favour','fear did not cost her goodwill');
  assert.equal(feared.favours,0);
});

test('7. every cue plays through the runtime with only finite, in-range values', ()=>{
  const out=execFileSync(process.execPath,[path.join(ROOT,'tools','check-audio.js')],{encoding:'utf8'});
  assert.match(out,/bad values      none/);
  assert.match(out,/table problems  none/);
});

test('9. what the crosshair is over is what the bullet finds', ()=>{
  const {run,slotOf}=load();
  const slot=slotOf('deputy');
  const g=JSON.parse(run(`(()=>{
    const G=newGame({seed:7}); G.slot=${slot}; beginSlot(G);
    const out={holstered:{},raised:{}};
    for(const zone of ["arm","torso"]){aimAt(G,zone);
      out.holstered[zone]=boxAt(G,G.aim.x,G.aim.y);}
    theyDraw(G,"test"); G.duel.drawn=true;
    for(const zone of ["arm","torso"]){aimAt(G,zone);
      out.raised[zone]=boxAt(G,G.aim.x,G.aim.y);}
    out.offTarget=boxAt(G,0.02,0.02); out.boxes=HITBOX; out.scene=SCENE;
    return JSON.stringify(out);
  })()`));
  assert.equal(g.holstered.arm,'weapon');
  assert.equal(g.holstered.torso,'lethal');
  assert.equal(g.raised.arm,'weapon','the gun box did not follow his hand up');
  assert.equal(g.offTarget,null);
  const b=g.boxes, over=(p,q)=>p.x<q.x+q.w&&q.x<p.x+p.w&&p.y<q.y+q.h&&q.y<p.y+p.h;
  assert.ok(!over(b.weapon,b.lethal)&&!over(b.weaponRaised,b.lethal),'the boxes overlap');
  for(const [k,r] of Object.entries(b))
    assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=g.scene.w&&r.y+r.h<=g.scene.h,k+' is off the scene');
});


/* Cues that exist but are never played are half-built presentation, so the
 * table and the page are held against each other. */
test('10. every sound cue is either played by the page or explicitly reserved', ()=>{
  const ui=fs.readFileSync(path.join(ROOT,'ui.js'),'utf8');
  const {run}=load({fill:false});
  // the cue table lives in sid-audio.js, which the rules harness does not load
  const vm=require('node:vm');
  const audio=fs.readFileSync(path.join(ROOT,'sid-audio.js'),'utf8');
  const abox={};vm.createContext(abox);
  vm.runInContext(audio.slice(0,audio.indexOf('const GATE='))+'\nthis.S=SOUNDS;',abox);
  const cues=Object.keys(abox.S);
  const arrivals=new Set(JSON.parse(run('JSON.stringify(ENCOUNTERS.flatMap(e=>e.arrive||[]))')));
  const endingSounds=new Set(JSON.parse(run('JSON.stringify(ENCOUNTERS.flatMap(e=>(e.endings||[]).map(x=>x.sound).filter(Boolean)))')));
  const RESERVED=['romance'];        // no romance in the anthology yet
  const idle=cues.filter(c=>!ui.includes('SND.'+c+'(')&&!arrivals.has(c)
    &&!endingSounds.has(c)&&!RESERVED.includes(c));
  assert.deepEqual(idle,[],'cues nothing ever plays: '+idle.join(', '));
  // and nothing is asked for that the table does not have
  const named=[...arrivals,...endingSounds];
  const unknown=named.filter(c=>!cues.includes(c));
  assert.deepEqual(unknown,[],'content asks for cues that do not exist: '+unknown.join(', '));
  report.audioCoverage=(cues.length-RESERVED.length)+' of '+cues.length+' cues played; reserved: '+RESERVED.join(', ');
});

test('report', ()=>{
  fs.writeFileSync(path.join(ROOT,'test','last-report.json'),JSON.stringify(report,null,2));
  console.log('\n===== numbers =====\n'+JSON.stringify(report,null,2).slice(0,2000));
});
