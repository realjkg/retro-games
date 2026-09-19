#!/usr/bin/env node
/* Is there time to answer? Measured against a person, not guessed at.
 *
 * The rules give every kind of draw a window: a warning, and then a ball some
 * time after it. Whether that window is a gunfight or a coin flip depends
 * entirely on what a human being can do in the time, which is not something
 * the constants know. This sweeps a range of reaction times - the fast end of
 * what people manage on a phone through to the slow end - adds what the page
 * itself costs on top, and reports what happens to a player who responds that
 * fast, ten thousand fights at a time.
 *
 * The page's cost was measured in Chromium on the real page: from the frame
 * the tell is painted to the latency the engine ends up seeing for a press.
 * A press is one press now; it used to be two, and two could not be made.
 *
 *   node tools/timing.js [--cost 120]
 */
'use strict';
const path=require('path');
const {load}=require(path.join(__dirname,'..','test','harness.js'));
const arg=(k,d)=>{const i=process.argv.indexOf(k);return i>0?+process.argv[i+1]:d;};
const COST=arg('--cost',120);          // touch latency plus a frame, in ms
const TRIALS=arg('--trials',4000);

const {run}=load();
const A=run('({newDay,beginEncounter,openDialogue,theyDraw,shoot,aimAt,who,CAST,RULES})');

/* What people actually do. The fast end is a practised player who knows the
 * shot is coming; the slow end is somebody reading the man's face first. */
const PLAYERS=[
  {name:'quick',    ms:250},
  {name:'ready',    ms:350},
  {name:'ordinary', ms:500},
  {name:'unhurried',ms:650},
  {name:'slow',     ms:850}
];
const KINDS=['ambush','delayed','draw'];

const fight=(kind,respond,seed,zone)=>{
  const G=A.newDay({seed:seed});
  G.encounter=CAST_IDX; A.beginEncounter(G); A.openDialogue(G);
  A.theyDraw(G,kind);
  A.aimAt(G,zone||'torso');
  A.shoot(G,respond);
  const d=G.duel;
  return d.result==='too_slow'?'outdrawn':d.result;
};
const CAST_IDX=run('CAST.findIndex(e=>e.id==="kid")');

const rows=[];
for(const kind of KINDS){
  for(const who of PLAYERS){
    const c={kill:0,disarm:0,miss:0,outdrawn:0};
    for(let i=0;i<TRIALS;i++)c[fight(kind,who.ms+COST,i+1)]++;
    rows.push({kind,who:who.name,ms:who.ms,
      answered:Math.round(1000*(TRIALS-c.outdrawn)/TRIALS)/10,
      hit:Math.round(1000*(c.kill+c.disarm)/TRIALS)/10,
      outdrawn:Math.round(1000*c.outdrawn/TRIALS)/10});
  }
}
console.log('a press costs '+COST+'ms on top of the player, '+TRIALS+' fights each\n');
console.log('  kind      player      reacts    got a shot off    was outdrawn    hit him');
for(const r of rows)
  console.log('  '+r.kind.padEnd(10)+r.who.padEnd(11)+
    String(r.ms+'ms').padStart(6)+String(r.answered+'%').padStart(16)+
    String(r.outdrawn+'%').padStart(16)+String(r.hit+'%').padStart(11));

/* And the standard the day is held to. A gunfight the fastest player alive
 * cannot answer is not difficulty; a gunfight the slowest always wins is not
 * a gunfight. */
const at=(k,n)=>rows.find(r=>r.kind===k&&r.who===n);
const fail=[];
const ok=(c,m)=>{ if(!c)fail.push(m); };
ok(at('draw','ordinary').answered>=85,
  'an ordinary player answers a squared-up draw only '+at('draw','ordinary').answered+'% of the time');
ok(at('draw','ordinary').hit>=70,
  'an ordinary player who answers a draw lands it only '+at('draw','ordinary').hit+'% of the time');
ok(at('ambush','quick').answered>=60,
  'even the quickest player answers an ambush only '+at('ambush','quick').answered+'% of the time');
ok(at('ambush','slow').outdrawn>=25,
  'an ambush costs a slow player nothing: outdrawn '+at('ambush','slow').outdrawn+'% of the time');
/* Compared where the three kinds actually differ. At the quick end nobody is
 * outdrawn by anything, which is the point of the change: the fastest player
 * alive could not answer an ambush before. The gradient shows up in the
 * players who take a moment. */
ok(at('ambush','unhurried').outdrawn>at('draw','unhurried').outdrawn,
  'an ambush is no more dangerous than a man squaring up');
ok(at('delayed','slow').outdrawn>at('draw','slow').outdrawn,
  'a man who turns back on you is no worse than one who never turned away');
ok(at('draw','slow').answered<at('draw','quick').answered,
  'being slow costs nothing at all');

console.log('\n--- '+(fail.length?fail.length+' FAILURES':'all clear')+' ---');
for(const f of fail)console.log('  FAIL  '+f);
process.exit(fail.length?1:0);
