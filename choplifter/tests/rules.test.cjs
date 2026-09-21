// Run with node --test tests/rules.test.cjs. No packages required.
// These read what the page computes. They cannot see what it shows, and the
// difference between the two is what tools/playtest.js is for.
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {runtime,step,clear}=require('./harness.cjs');

test('One strip of country: a post, a line, four barracks, sixty-four of ours',()=>{
  const r=runtime(2,5);
  assert.equal(r.run('HUTS.length'),4);
  assert.equal(r.run('PER_HUT'),16);
  assert.equal(r.run('HOSTAGES'),64);
  assert.equal(r.run('CAPACITY'),16);
  assert.equal(r.run('G.huts.reduce((n,h)=>n+h.left,0)'),64);
  // The post is on your side of the line and every barrack is on theirs.
  assert.ok(r.run('POST_X<FRONTIER_X'),'the post is behind the line');
  assert.equal(r.run('HUTS.every(x=>x>FRONTIER_X)'),true);
  assert.equal(r.run('HUTS.every(x=>x+HUT_W<WORLD)'),true);
});

test('A seed reproduces a battlefield, and a different seed does not',()=>{
  const dump=r=>{step(r,300);return r.run(
    'G.ridge.map(v=>v.toFixed(2)).join(",")+"|"+G.foes.map(e=>e.k+Math.round(e.x)).join(",")');};
  assert.equal(dump(runtime(2,21)),dump(runtime(2,21)));
  assert.notEqual(dump(runtime(2,21)),dump(runtime(2,22)));
});

test('The turn is walked, not set: she passes through every picture on the way',()=>{
  const r=runtime(2,9);clear(r);
  r.run('G.h.tf=0;G.h.landed=false;G.h.y=60;keys.R=true;');
  // A third of a second from nose-on to profile, and a picture for each step.
  const seen=r.run(`(()=>{const s=new Set();
   for(let i=0;i<24;i++){stepGame(1/60);s.add(clamp(Math.round(Math.abs(G.h.tf)),0,3));}
   return [...s].sort().join(",");})()`);
  assert.equal(seen,'0,1,2,3','every drawn picture of the turn is used');
  assert.ok(Math.abs(r.run('G.h.tf')-3)<.01,'and it ends at the profile');
  // Nothing ever moves more than a fraction of a step in one frame.
  r.run('G.h.tf=3;keys.R=false;keys.L=true;');
  const worst=r.run(`(()=>{let m=0,p=G.h.tf;
   for(let i=0;i<50;i++){stepGame(1/60);m=Math.max(m,Math.abs(G.h.tf-p));p=G.h.tf;}return m;})()`);
  assert.ok(worst<=TURN_STEP(r),'a turn is walked ('+worst.toFixed(3)+' per frame)');
  function TURN_STEP(r){return r.run('TURN_RATE/60')+1e-9;}
  assert.ok(Math.abs(r.run('G.h.tf')+3)<.01,'and round to the other profile');
});

test('Upright she hovers; over, she goes, and the further over the faster',()=>{
  const r=runtime(2,9);clear(r);
  r.run('G.h.landed=false;G.h.y=60;G.h.tf=0;G.h.vx=0;keys.HOLD=true;');
  step(r,60);
  assert.ok(Math.abs(r.run('G.h.vx'))<1,'nose-on is a hover, not a drift');
  const speedAt=t=>{const q=runtime(2,9);clear(q);
    q.run(`G.h.landed=false;G.h.y=60;G.h.tf=${t};G.h.vx=0;keys.HOLD=true;`);
    step(q,90);return q.run('G.h.vx');};
  const half=speedAt(1.5), full=speedAt(3);
  assert.ok(full>half+8,'full profile is faster than half ('+full.toFixed(0)+' > '+half.toFixed(0)+')');
  assert.ok(speedAt(-3)<-8,'and the other way is the other way');
});

test('HOVER holds the height; nothing held at all does not',()=>{
  const hold=runtime(2,9);clear(hold);
  hold.run('G.h.landed=false;G.h.y=60;G.h.vy=0;keys.HOLD=true;');
  step(hold,90);
  assert.ok(Math.abs(hold.run('G.h.y')-60)<4,'HOVER keeps her where she was');
  const drop=runtime(2,9);clear(drop);
  drop.run('G.h.landed=false;G.h.y=60;G.h.vy=0;');
  step(drop,90);
  assert.ok(drop.run('G.h.y')>70,'and gravity is still gravity without it');
});

test('The gun points where she does',()=>{
  const r=runtime(2,9);clear(r);
  r.run('G.h.landed=false;G.h.y=60;G.h.tf=3;G.h.cool=0;shoot();');
  assert.ok(r.run('G.shots[0].vx')>0&&r.run('G.shots[0].vy')===0,'profile fires level, forwards');
  r.run('G.shots=[];G.h.tf=-3;G.h.cool=0;shoot();');
  assert.ok(r.run('G.shots[0].vx')<0,'and the other profile the other way');
  r.run('G.shots=[];G.h.tf=0;G.h.cool=0;shoot();');
  assert.equal(r.run('G.shots[0].vx'),0);
  assert.ok(r.run('G.shots[0].vy')<0,'nose-on it fires straight up, which is what a jet needs');
  // Four in the air and no more, and not faster than the gun cycles.
  r.run('G.shots=[];for(let i=0;i<12;i++){G.h.cool=0;shoot();}');
  assert.equal(r.run('G.shots.length'),4);
});

test('Three into a barrack and the door goes; then they come out, one at a time',()=>{
  const r=runtime(2,11);clear(r);
  // The camera is what decides a bullet is off the screen, so it has to be
  // looking at the barrack before anything is fired at it.
  r.run('G.h.landed=false;G.h.y=GROUND_Y-CHOP_H;G.h.x=HUTS[0]-80;G.h.tf=3;G.cam.x=HUTS[0]-200;');
  assert.equal(r.run('G.huts[0].open'),false);
  for(let i=0;i<3;i++)r.run('G.h.cool=0;shoot();'),step(r,30);
  assert.equal(r.run('G.huts[0].open'),true,'the door goes on the third');
  assert.equal(r.run('G.people.length'),0,'and not before');
  // Nobody is standing outside before he has walked out of the door.
  r.run('G.h.x=0;G.h.landed=false;');        // too far off to call anyone
  step(r,30);
  const out=r.run('G.people.length');
  assert.ok(out>0&&out<6,'they file out rather than pour out ('+out+')');
  assert.equal(r.run('G.people.every(p=>Math.abs(p.x-(HUTS[0]+HUT_W/2-HOST_W/2))<40)'),true,
    'and they start at the door they came out of');
});

test('Set her down near them and they run for her, sixteen and no more',()=>{
  const r=runtime(2,12);clear(r);
  r.run(`G.huts[0].hp=0;openHut(G.huts[0]);
   G.h.x=HUTS[0]+70;G.h.y=GROUND_Y-CHOP_H;G.h.landed=true;`);
  step(r,40);
  assert.equal(r.run('G.people.some(p=>p.st==="run")'),true,'they set off');
  assert.equal(r.run('G.people.every(p=>p.st!=="run"||p.face===Math.sign(G.h.x+CHOP_W/2-(p.x+HOST_W/2)))'),
    true,'and they face the way they are going');
  step(r,800);
  assert.ok(r.run('G.aboard')>0,'and they get in');
  assert.ok(r.run('G.aboard')<=16,'never more than sixteen ('+r.run('G.aboard')+')');
  // In the air she is not a bus.
  const q=runtime(2,12);clear(q);
  q.run(`G.huts[0].hp=0;openHut(G.huts[0]);
   G.h.x=HUTS[0]+70;G.h.y=40;G.h.landed=false;keys.HOLD=true;`);
  step(q,300);
  assert.equal(q.run('G.aboard'),0,'nobody climbs into a chopper that is forty pixels up');
});

test('Sixteen home is sixteen scored, and only at the post',()=>{
  const r=runtime(2,13);clear(r);
  r.run('G.aboard=6;G.h.x=HUTS[0];G.h.y=GROUND_Y-CHOP_H;G.h.landed=true;');
  step(r,100);
  assert.equal(r.run('G.rescued'),0,'the middle of the desert is not home');
  r.run('G.h.x=POST_X;');
  step(r,120);
  assert.equal(r.run('G.rescued'),6);
  assert.equal(r.run('G.aboard'),0);
  assert.equal(r.run('G.score'),600);
});

test('Your own gun, and your own skids, kill them as surely as a tank does',()=>{
  const r=runtime(2,14);clear(r);
  // Hovering over them: high enough that nobody climbs in, close enough that
  // the camera - which is what decides a bullet has left the screen - is there.
  r.run(`G.huts[0].hp=0;openHut(G.huts[0]);G.h.x=HUTS[0]+40;G.h.y=20;
   G.h.landed=false;keys.HOLD=true;`);
  step(r,60);
  assert.ok(r.run('G.people.length')>0);
  assert.equal(r.run('G.aboard'),0,'nobody boards a chopper in the air');
  r.run(`const p=G.people[0];
   G.shots.push({x:p.x+1,y:p.y+2,vx:1,vy:0,w:3,h:2,mine:true});`);
  step(r,2);
  assert.equal(r.run('G.lost'),1,'a bullet of yours is a bullet');
  const q=runtime(2,14);clear(q);
  q.run(`G.huts[0].hp=0;openHut(G.huts[0]);G.h.x=HUTS[0]+40;G.h.y=20;
   G.h.landed=false;keys.HOLD=true;`);
  step(q,60);
  q.run(`const p=G.people[0];delete keys.HOLD;
   G.h.x=p.x-10;G.h.y=GROUND_Y-CHOP_H-1;G.h.vy=20;G.h.landed=false;`);
  step(q,6);
  assert.ok(q.run('G.lost')>=1,'and so is setting her down on top of one');
});

test('Three hits and she is down, and everyone aboard goes down with her',()=>{
  const r=runtime(2,15);clear(r);
  r.run('G.aboard=9;G.h.landed=false;G.h.y=60;');
  assert.equal(r.run('G.h.hp'),3);
  r.run('damageChopper();');assert.equal(r.run('G.h.hp'),2);
  r.run('damageChopper();');assert.equal(r.run('G.h.hp'),1);
  r.run('damageChopper();');
  assert.equal(r.run('G.lost'),9,'the nine she was carrying are lost');
  assert.equal(r.run('G.aboard'),0);
  assert.equal(r.run('G.chops'),2,'and one machine of three is gone');
  step(r,200);
  assert.equal(r.run('G.h.hp'),3,'a fresh one comes out of the hangar');
  assert.equal(r.run('Math.round(G.h.x)'),r.run('POST_X'),'on the pad, where they start');
});

test('A heavy landing hurts; a gentle one does not',()=>{
  const soft=runtime(2,16);clear(soft);
  soft.run('G.h.landed=false;G.h.y=GROUND_Y-CHOP_H-3;G.h.vy=20;');
  step(soft,20);
  assert.equal(soft.run('G.h.landed'),true);
  assert.equal(soft.run('G.h.hp'),3,'a gentle one is free');
  const hard=runtime(2,16);clear(hard);
  hard.run('G.h.landed=false;G.h.y=GROUND_Y-CHOP_H-3;G.h.vy=HARD_LANDING+20;');
  step(hard,20);
  assert.equal(hard.run('G.h.hp'),2,'a heavy one costs you');
});

test('The Empire keeps its armour on its own side of the line',()=>{
  const r=runtime(2,17);clear(r);
  r.run('for(let i=0;i<8;i++)sendWave();');
  assert.equal(r.run('G.foes.filter(e=>e.k==="tank").every(e=>e.x>FRONTIER_X)'),true);
  r.run('G.foes=[tank(FRONTIER_X+30,-1)];G.h.x=0;G.h.y=20;G.h.landed=false;');
  step(r,600);
  assert.ok(r.run('G.foes[0].x')>=r.run('FRONTIER_X'),'and it turns round at the post');
});

test('A tank is artillery, not a battering ram',()=>{
  const r=runtime(2,25);clear(r);
  // Sitting on the ground loading, with a tank rolling at her: it has to stop
  // short. One that drives onto the pad and fires at point blank ends a loaded
  // chopper in five seconds and there is nothing the player can do about it.
  // On a stretch of sand with no barrack between them, because a barrack stops
  // a tank dead and that is a different rule.
  r.run('G.h.x=1300;G.h.y=GROUND_Y-CHOP_H;G.h.landed=true;G.foes=[tank(1600,-1)];');
  let closest=1e9;
  for(let i=0;i<900;i++){
    r.run('stepGame(1/60);');
    closest=Math.min(closest,r.run('Math.abs(G.foes[0].x+TANK_W/2-(G.h.x+CHOP_W/2))'));
  }
  const standoff=r.run('TANK_STANDOFF');
  assert.ok(closest>standoff-20,'it kept its distance ('+closest.toFixed(0)+' of '+standoff+')');
  assert.ok(closest<standoff+100,'but it did come and look for her ('+closest.toFixed(0)+')');
});

test('No tank is ever parked inside a barrack it could not drive out of',()=>{
  const r=runtime(3,27);clear(r);
  r.run('for(let i=0;i<10;i++)sendWave();');
  assert.equal(r.run(`G.foes.filter(e=>e.k==="tank")
    .every(e=>HUTS.every(q=>e.x+TANK_W<=q-5||e.x>=q+HUT_W+5))`),true);
});

test('And it will not drive through a barrack',()=>{
  const r=runtime(2,26);clear(r);
  r.run(`G.h.x=HUTS[0]-200;G.h.y=GROUND_Y-CHOP_H;G.h.landed=true;
   G.foes=[tank(HUTS[0]+90,-1)];`);
  for(let i=0;i<900;i++)r.run('stepGame(1/60);');
  assert.equal(r.run('G.foes[0].x+TANK_W>HUTS[0]-5&&G.foes[0].x<HUTS[0]+HUT_W+5'),false,
    'it stopped at the wall rather than parking in the doorway');
});

test('A busier setting sends more, and each wave is fuller than the last',()=>{
  const count=(d,n)=>{const r=runtime(d,4);clear(r);
    r.run(`for(let i=0;i<${n};i++)sendWave();`);return r.run('G.foes.length');};
  assert.ok(count(4,1)>count(1,1),'crowded is crowded from the start');
  assert.ok(count(2,4)>count(2,1),'and it builds either way');
  const r=runtime(2,4);clear(r);r.run('sendWave();');
  assert.equal(r.run('G.foes.some(e=>e.k==="jet")'),false,'no jets in the first wave');
  r.run('sendWave();');
  assert.equal(r.run('G.foes.some(e=>e.k==="jet")'),true,'they come in the second');
});

test('A shell that lands near them throws them flat, and one that lands on them does not',()=>{
  const r=runtime(2,18);clear(r);
  r.run(`G.huts[0].hp=0;openHut(G.huts[0]);G.h.x=0;G.h.landed=false;G.h.y=20;`);
  step(r,400);
  assert.ok(r.run('G.people.length')>3,'several of them are out and spread along the sand');
  // Everyone who has got where he is going stands on his own patch, so a shell
  // can find one of them without finding four.
  assert.equal(r.run(`(()=>{const xs=G.people.filter(p=>p.st==="wait")
    .map(p=>Math.round(p.x)).sort((a,b)=>a-b);
   return xs.length>3&&xs.every((x,i)=>!i||x-xs[i-1]>=6);})()`),true,
   'nobody is standing on anybody');
  const edge=r.run('Math.max(...G.people.map(p=>p.x))');
  r.run(`blast(${edge}+24,GROUND_Y-2,true);`);
  assert.equal(r.run(`G.people.filter(p=>p.duck>0).length>0`),true,
    'near enough to hear it is near enough to duck');
  assert.equal(r.run('G.lost'),0,'and near is not a hit');
  r.run(`blast(${edge}+HOST_W/2,GROUND_Y-2,true);`);
  assert.equal(r.run('G.lost'),1,'one shell, one man');
});

test('The mission is over when all sixty-four are accounted for',()=>{
  const r=runtime(2,19);clear(r);
  r.run('G.rescued=60;G.lost=3;');
  step(r,2);
  assert.equal(r.run('G.phase'),'play','sixty-three is not sixty-four');
  r.run('G.lost=4;');
  step(r,2);
  assert.equal(r.run('G.phase'),'over');
  assert.ok(r.run('G.score')>=60*25,'and the count is what you are graded on');
});

test('Endless machines never runs out; three machines does',()=>{
  const r=runtime(2,20);clear(r);
  r.run('G.endless=true;G.chops=1;G.h.landed=false;G.h.y=60;damageChopper();damageChopper();damageChopper();');
  step(r,200);
  assert.equal(r.run('G.phase'),'play');
  assert.ok(r.run('G.chops')>=1);
  const q=runtime(2,20);clear(q);
  q.run('G.chops=1;G.h.landed=false;G.h.y=60;damageChopper();damageChopper();damageChopper();');
  step(q,200);
  assert.equal(q.run('G.phase'),'over');
});

test('The scanner is a panel, not a change of ground',()=>{
  // Toggling it used to be allowed to give rows back to the field, and a field
  // that changes height under a chopper in flight is a field that drops her.
  const r=runtime(2,23);clear(r);
  const before=r.run('[SCAN_H,GROUND_Y,CEIL_Y,FIELD_TOP,VH]').join(',');
  r.run('press("SCAN");');
  assert.equal(r.run('G.scan'),false);
  assert.equal(r.run('[SCAN_H,GROUND_Y,CEIL_Y,FIELD_TOP,VH]').join(','),before);
});

test('What the browser remembers, and what it does when it refuses to',()=>{
  const store=new Map();
  const r=runtime(2,24,true,store);
  r.run('G.score=0;addScore(4200);setMusic(false);G.scan=false;savePrefs();');
  const back=runtime(2,24,false,store);
  assert.equal(back.run('G.best'),4200);
  assert.equal(back.run('MUSIC.on'),false);
  assert.equal(back.run('G.scan'),false);
  store.broken=true;                         // a private window, or blocked site data
  assert.doesNotThrow(()=>runtime(2,24,true,store));
});
