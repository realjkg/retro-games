/* Tests 1-7 of the plan, against the fixture dialogue. Test 8 (jsdom on the
 * real page) waits for the page, which waits for the dialogue table.
 *   node --test test/                                                       */
'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('fs'), path=require('path'), {execFileSync}=require('child_process');
const {load}=require('./harness.js');
const ROOT=path.join(__dirname,'..');
const report={};

test('1. the scripts parse', ()=>{
  for(const f of ['content.js','engine.js','sid-audio.js'])
    execFileSync(process.execPath,['--check',path.join(ROOT,f)]);
});

test('2. the cast and dialogue graph are complete and sound', ()=>{
  const {run}=load();
  const problems=JSON.parse(run(`(()=>{
    const bad=[],ids=new Set();
    if(CAST.length!==10)bad.push("cast is "+CAST.length+", expected 10 encounters");
    for(const c of CAST){
      if(ids.has(c.id))bad.push(c.id+": duplicate id"); ids.add(c.id);
      if(!c.name)bad.push(c.id+": no name");
      if(!c.role)bad.push(c.id+": no role");
      if(!c.resolves||!c.resolves.length)bad.push(c.id+": resolves to nothing");
      if(c.fragment&&!JOBS.includes(c.fragment))bad.push(c.id+": unknown job "+c.fragment);
      for(const t of TONES)if(!c.reacts[t])bad.push(c.id+": no reaction to "+t);
      for(const t of TONES){const [dt,da]=c.reacts[t];
        if(!Number.isFinite(dt)||!Number.isFinite(da))bad.push(c.id+"."+t+": bad deltas");}
      if(!c.armed&&c.draws<99)bad.push(c.id+": unarmed but has a draw threshold");
      const beats=DIALOGUE[c.id]||[];
      if(beats.length!==RULES.BEATS)bad.push(c.id+": "+beats.length+" beats, expected "+RULES.BEATS);
      beats.forEach((b,i)=>{
        if(!b.say)bad.push(c.id+" beat "+(i+1)+": nothing said");
        const tones=b.replies.map(r=>r.tone);
        if(b.replies.length!==5)bad.push(c.id+" beat "+(i+1)+": "+b.replies.length+" replies, expected 4 + draw");
        for(const t of TONES)if(!tones.includes(t))bad.push(c.id+" beat "+(i+1)+": no "+t+" reply");
        if(!tones.includes("draw"))bad.push(c.id+" beat "+(i+1)+": draw not offered");
        b.replies.forEach(r=>{if(!r.t)bad.push(c.id+" beat "+(i+1)+": reply with no text");});
      });
    }
    // every job must be reachable from somebody, or a thread can never be stopped
    for(const j of JOBS)if(!CAST.some(c=>c.fragment===j))bad.push("no fragment holder for "+j);
    return JSON.stringify(bad);
  })()`));
  assert.deepEqual(problems,[]);
});

/* one full day, choices picked by the given chooser */
function playDay(seed,chooser){
  const {run,box}=load();
  box.__choose=chooser;
  return JSON.parse(run(`(()=>{
    const G=newGame({seed:${seed}});
    globalThis.G=G; beginSlot(G); openDialogue(G);
    let guard=0;
    while(G.phase!=="summary"&&guard++<400){
      if(G.phase==="dialogue"){ respond(G,__choose(G.slot,G.beat,G.rng())); }
      else if(G.phase==="tell"){ G.phase="duel"; }
      else if(G.phase==="duel"){ aimAt(G,G.rng()<0.5?"arm":"torso");
        shoot(G,180+Math.floor(G.rng()*420)); }
      else if(G.phase==="resolve"){ nextSlot(G); if(G.phase==="approach")openDialogue(G); }
      else if(G.phase==="approach"){ openDialogue(G); }
      else break;
    }
    return JSON.stringify({phase:G.phase,over:G.over,points:G.points,
      murders:G.murders,kills:G.kills.length,disarms:G.disarms.length,
      romance:G.romance,prevented:G.over?G.over.prevented.length:0,
      committed:G.over?G.over.committed.length:0,hp:G.hp,treated:G.treated,
      shots:G.shots,hits:G.hits,slot:G.slot,
      results:G.results.map(r=>r.duel||r.outcome)});
  })()`));
}

test('3. five hundred randomised days, every ending reachable, none dominant', ()=>{
  // Two agents: one that will also draw on people at random, and one that only
  // ever talks. The second is the one that says whether the day is playable.
  const agents={
    'draws too':  (slot,beat,x)=>Math.floor(x*5),
    'talks only': (slot,beat,x)=>Math.floor(x*4)
  };
  let exceptions=0;
  for(const [label,chooser] of Object.entries(agents)){
    const verdicts={}, outcomes={}, prevented={}, cats={};
    for(let i=0;i<500;i++){
      let r;
      try{ r=playDay(i,chooser); }catch(e){exceptions++;continue;}
      assert.equal(r.phase,'summary','day '+i+' ('+label+') never reached the summary');
      verdicts[r.over.verdict]=(verdicts[r.over.verdict]||0)+1;
      prevented[r.prevented]=(prevented[r.prevented]||0)+1;
      for(const o of r.results)outcomes[o]=(outcomes[o]||0)+1;
      for(const [k,v] of Object.entries(r.over.categories))
        if(typeof v==='number'){cats[k]=cats[k]||[];cats[k].push(v);}
    }
    const total=Object.values(verdicts).reduce((a,b)=>a+b,0);
    const mean=a=>+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1);
    report['days: '+label]={verdicts,outcomes,prevented,
      meanCategories:Object.fromEntries(Object.entries(cats).map(([k,v])=>[k,mean(v)]))};
    const top=Math.max(...Object.values(verdicts))/total;
    assert.ok(Object.keys(verdicts).length>=4,
      label+': only '+Object.keys(verdicts).length+' endings: '+JSON.stringify(verdicts));
    assert.ok(top<=0.6,label+': one ending took '+(top*100).toFixed(1)+'%: '+JSON.stringify(verdicts));
  }
  assert.equal(exceptions,0);
});

test('4. the same choices do not always produce the same outcome', ()=>{
  const {run,box}=load();
  const per={};
  for(let ci=0;ci<10;ci++){
    const id=run(`CAST[${ci}].id`);
    per[id]={};
    for(let tone=0;tone<4;tone++){                       // firm, kind, joke, probe
      const counts={};
      for(let i=0;i<100;i++){
        box.__ci=ci; box.__tone=tone;
        const o=run(`(()=>{
          const G=newGame({seed:${ci*10000+tone*1000+i}}); G.slot=__ci;
          beginSlot(G); openDialogue(G);
          let guard=0;
          while(G.phase!=="resolve"&&G.phase!=="summary"&&guard++<40){
            if(G.phase==="dialogue")respond(G,__tone);
            else if(G.phase==="tell")G.phase="duel";
            else if(G.phase==="duel"){aimAt(G,"torso");shoot(G,320);}
            else break;
          }
          return G.outcome||G.phase;
        })()`);
        counts[o]=(counts[o]||0)+1;
      }
      const name=run(`TONES[${tone}]`);
      per[id][name]={top:Math.max(...Object.values(counts)),counts};
    }
  }
  report.variance=per;
  // Every character must have real variance somewhere. A single decisively cold
  // or hot path can still be near-certain - that is trust mattering - and the
  // deputy's slot is structural: whether the robbery is stopped depends on the
  // fragments in hand, not on a coin. Those are reported, not asserted away.
  const rigid=Object.entries(per)
    .filter(([id])=>id!=="deputy")
    .filter(([,paths])=>Object.values(paths).every(p=>p.top>80))
    .map(([id])=>id);
  assert.deepEqual(rigid,[],'no path varies for: '+rigid.join(', '));
  report.deterministicPaths=Object.entries(per).flatMap(([id,paths])=>
    Object.entries(paths).filter(([,p])=>p.top>80)
      .map(([tone,p])=>id+'/'+tone+' '+p.top+'% '+Object.keys(p.counts).join('|')));
});

test('5. two thousand duels across the tell range', ()=>{
  const {run}=load();
  const buckets={};
  for(let i=0;i<2000;i++){
    const lat=140+(i%64)*20;                      // 140..1400 ms, past the point he wins
    const b=Math.floor(lat/100)*100;
    const res=run(`(()=>{
      const G=newGame({seed:${i}}); G.slot=2; beginSlot(G);
      theyDraw(G,"test"); G.phase="duel"; aimAt(G,"torso");
      shoot(G,${lat}); return G.duel.result;
    })()`);
    buckets[b]=buckets[b]||{n:0,kill:0,disarm:0,miss:0,too_slow:0};
    buckets[b].n++; buckets[b][res]++;
  }
  report.duel=Object.fromEntries(Object.entries(buckets).map(([k,v])=>
    [k+'ms',{hit:+(((v.kill+v.disarm)/v.n)*100).toFixed(0),kill:+((v.kill/v.n)*100).toFixed(0),
      disarm:+((v.disarm/v.n)*100).toFixed(0),miss:+((v.miss/v.n)*100).toFixed(0),
      slow:+((v.too_slow/v.n)*100).toFixed(0),n:v.n}]));
  const at=ms=>report.duel[ms+'ms'];
  for(const ms of [200,300,400])assert.ok(at(ms),'no samples at '+ms+'ms');
  const human=[200,300,400].map(ms=>at(ms).hit);
  assert.ok(Math.min(...human)>=25,'unwinnable at human speed: '+human.join('/'));
  assert.ok(Math.max(...human)<=90,'trivial at human speed: '+human.join('/'));
  for(const k of ['kill','disarm','miss'])
    assert.ok(Object.values(report.duel).some(v=>v[k]>0),'no '+k+' outcomes at all');
  assert.ok(Object.values(report.duel).some(v=>v.slow>0),'nobody was ever beaten to the shot');
});

test('6. the doctor treats, refuses, and being wounded twice can kill', ()=>{
  const {run}=load();
  const seen={treated:0,refused:0};
  for(let i=0;i<200;i++){
    const o=run(`(()=>{
      const G=newGame({seed:${i}}); G.slot=CAST.findIndex(c=>c.id==="doctor");
      beginSlot(G); G.wounded=true; G.hp=1; G.trust=2;
      return doctorTreats(G);
    })()`);
    const out=JSON.parse(o&&typeof o==='object'?JSON.stringify(o):'{}').outcome||run('G.outcome');
    if(out==='treated')seen.treated++; else if(out==='refused')seen.refused++;
  }
  report.doctor=seen;
  assert.ok(seen.treated>0&&seen.refused>0,'one branch never happened: '+JSON.stringify(seen));
  // wounded, doctor already spent: survivable but not certain
  let died=0,lived=0;
  for(let i=0;i<200;i++){
    const r=run(`(()=>{
      const G=newGame({seed:${i+5000}}); G.slot=2; beginSlot(G);
      G.hp=1; G.wounded=true; G.doctorSpent=true;
      theyDraw(G,"test"); G.phase="duel"; aimAt(G,"torso"); shoot(G,520);
      return G.phase==="summary"&&G.over.why==="killed";
    })()`);
    r?died++:lived++;
  }
  report.woundedSpent={died,lived};
  assert.ok(died>0&&lived>0,'death with the doctor spent is certain or impossible: '+died+'/'+lived);
});

test('7. every cue plays through the runtime with only finite, in-range values', ()=>{
  const out=execFileSync(process.execPath,[path.join(ROOT,'tools','check-audio.js')],{encoding:'utf8'});
  assert.match(out,/bad values      none/);
  assert.match(out,/table problems  none/);
  report.audio=out.trim().split('\n').filter(l=>/^cues|^values/.test(l)).join(' · ');
});

test('report', ()=>{
  fs.writeFileSync(path.join(ROOT,'test','last-report.json'),JSON.stringify(report,null,2));
  console.log('\n===== numbers =====\n'+JSON.stringify(report,null,2));
});

test('9. what the crosshair is over is what the bullet finds', ()=>{
  const {run}=load();
  const g=JSON.parse(run(`(()=>{
    const G=newGame({seed:7}); G.slot=2; beginSlot(G);
    const out={holstered:{},raised:{}};
    for(const zone of ["arm","torso"]){
      aimAt(G,zone);
      out.holstered[zone]={aim:G.aim,box:boxAt(G,G.aim.x,G.aim.y)};
    }
    theyDraw(G,"test"); G.duel.drawn=true;
    for(const zone of ["arm","torso"]){
      aimAt(G,zone);
      out.raised[zone]={aim:G.aim,box:boxAt(G,G.aim.x,G.aim.y)};
    }
    out.offTarget=boxAt(G,0.02,0.02);
    out.scene=SCENE; out.boxes=HITBOX;
    return JSON.stringify(out);
  })()`));
  assert.equal(g.holstered.arm.box,'weapon','aiming at his hand missed the gun box');
  assert.equal(g.holstered.torso.box,'lethal','aiming at centre mass missed the lethal box');
  assert.equal(g.raised.arm.box,'weapon','the gun box did not follow his hand up');
  assert.notDeepEqual(g.raised.arm.aim,g.holstered.arm.aim,'the raised gun box is in the same place');
  assert.equal(g.offTarget,null,'the top corner of the scene is somehow a hitbox');
  // the boxes must not overlap, or one shot would be both outcomes
  const b=g.boxes, over=(p,q)=>p.x<q.x+q.w&&q.x<p.x+p.w&&p.y<q.y+q.h&&q.y<p.y+p.h;
  assert.ok(!over(b.weapon,b.lethal),'the gun box overlaps centre mass');
  assert.ok(!over(b.weaponRaised,b.lethal),'the raised gun box overlaps centre mass');
  for(const [k,r] of Object.entries(b))
    assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=g.scene.w&&r.y+r.h<=g.scene.h,k+' is off the scene');
});
