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
/* What a press costs before the engine ever sees it.
 *
 * The page's own share is measured, not guessed: from the input landing to the
 * engine stamping the shot is a median of 41ms in Chromium on the real page.
 * The rest is the input path, and that is where the two numbers part company.
 * A key on a desk is quick. A finger on glass is not: iOS delivers the touch a
 * frame or more later than a desktop keypress, and the page is a phone game -
 * it launches fullscreen, it is driven by a thumb on a drawn pad, and it is
 * played on a phone. So the standard below is held at the phone figure, and
 * the desk figure is printed beside it so the gap is visible rather than
 * assumed away.
 *
 * The touch share is an allowance, not a measurement - there is no iPhone in
 * CI - so it is named here rather than buried in a default. */
const DESK=arg('--cost',120);          // a keypress on a desktop, plus a frame
const PHONE=arg('--phone',220);        // a thumb on glass, plus a frame
const COST=DESK;
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

const sweep=cost=>{
  const out=[];
  for(const kind of KINDS){
    for(const who of PLAYERS){
      const c={kill:0,disarm:0,miss:0,outdrawn:0};
      for(let i=0;i<TRIALS;i++)c[fight(kind,who.ms+cost,i+1)]++;
      out.push({kind,who:who.name,ms:who.ms,
        answered:Math.round(1000*(TRIALS-c.outdrawn)/TRIALS)/10,
        hit:Math.round(1000*(c.kill+c.disarm)/TRIALS)/10,
        outdrawn:Math.round(1000*c.outdrawn/TRIALS)/10});
    }
  }
  return out;
};
const rows=sweep(PHONE), desk=sweep(DESK);
console.log('a press costs '+PHONE+'ms on a phone and '+DESK+'ms on a desk; '
  +TRIALS+' fights each. The standard below is held at the phone.\n');
console.log('  kind      player      reacts    got a shot off    was outdrawn    hit him');
for(const r of rows)
  console.log('  '+r.kind.padEnd(10)+r.who.padEnd(11)+
    String(r.ms+'ms').padStart(6)+String(r.answered+'%').padStart(16)+
    String(r.outdrawn+'%').padStart(16)+String(r.hit+'%').padStart(11));

/* And the standard the day is held to. A gunfight the fastest player alive
 * cannot answer is not difficulty; a gunfight the slowest always wins is not
 * a gunfight. */
const at=(k,n)=>rows.find(r=>r.kind===k&&r.who===n);
const atDesk=(k,n)=>desk.find(r=>r.kind===k&&r.who===n);
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

/* And what the same day is on a desk, said out loud rather than left to be
 * discovered. The windows were opened deliberately, at a player's request,
 * because the fight was unwinnable on a phone. On a keyboard that same fight
 * is generous, and pretending otherwise would be the sort of green that means
 * nothing. */
console.log('\n  on a desk, the slowest player is outdrawn: '
  +KINDS.map(k=>k+' '+atDesk(k,'slow').outdrawn+'%').join(', '));

console.log('\n--- '+(fail.length?fail.length+' FAILURES':'all clear')+' ---');
for(const f of fail)console.log('  FAIL  '+f);
process.exit(fail.length?1:0);
