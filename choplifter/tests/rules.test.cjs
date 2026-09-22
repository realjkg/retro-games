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
  // One barrack is already open and burning when you arrive, with some of its
  // people out, so the sixty-four are spread between the huts and the sand.
  assert.equal(r.run('G.huts.filter(h=>h.open).length'),1,'exactly one is open');
  assert.ok(r.run('G.huts.find(h=>h.open).fire')>0,'and it is alight');
  assert.ok(r.run('G.people.length')>0,'with people already out of it');
  assert.equal(r.run('G.people.every(p=>p.panic>0)'),true,'and running about');
  assert.equal(
   r.run('G.huts.reduce((n,h)=>n+h.left,0)+G.people.length+G.aboard+G.rescued+G.lost'),64,
   'and all sixty-four are accounted for between them');
  // The post office is at the far right of the strip, the fence is west of it,
  // and every barrack is west of the fence: you fly out left and come home right.
  assert.ok(r.run('POST_X>FRONTIER_X'),'the post office is behind the fence');
  assert.equal(r.run('HUTS.every(x=>x+HUT_W<FRONTIER_X)'),true);
  assert.equal(r.run('HUTS.every(x=>x>0)'),true);
  assert.ok(r.run('POST_X+CHOP_W<WORLD'),'and the pad is on the map');
});

test('A seed reproduces a battlefield, and a different seed does not',()=>{
  const dump=r=>{step(r,300);return r.run(
    'G.ridge.map(v=>v.toFixed(2)).join(",")+"|"+G.foes.map(e=>e.k+Math.round(e.x)).join(",")');};
  assert.equal(dump(runtime(2,21)),dump(runtime(2,21)));
  assert.notEqual(dump(runtime(2,21)),dump(runtime(2,22)));
});

test('The button walks the ring: side, at you, the other side, at you',()=>{
  const r=runtime(2,9);clear(r);
  r.run('G.h.tf=3;G.h.want=3;G.h.seq=0;G.h.landed=false;G.h.y=60;');
  const settle=()=>r.run('for(let i=0;i<40;i++)stepGame(1/60);');
  const wants=[];
  for(let i=0;i<4;i++){r.run('turnHer();');settle();wants.push(r.run('Math.round(G.h.tf)'));}
  assert.deepEqual(wants,[0,-3,0,3],'right, at you, left, at you, right again');
});

test('The turn is walked, not set: she passes through every picture on the way',()=>{
  const r=runtime(2,9);clear(r);
  r.run('G.h.tf=0;G.h.want=0;G.h.seq=1;G.h.landed=false;G.h.y=60;turnHer();');
  // A third of a second from nose-on to profile, and a picture for each step.
  const seen=r.run(`(()=>{const s=new Set();
   for(let i=0;i<24;i++){stepGame(1/60);s.add(clamp(Math.round(Math.abs(G.h.tf)),0,3));}
   return [...s].sort().join(",");})()`);
  assert.equal(seen,'0,1,2,3','every drawn picture of the turn is used');
  assert.equal(Math.abs(r.run('G.h.tf')),3,'and it ends at the profile');
  // Nothing ever moves more than a fraction of a step in one frame.
  r.run('turnHer();turnHer();');
  const worst=r.run(`(()=>{let m=0,p=G.h.tf;
   for(let i=0;i<60;i++){stepGame(1/60);m=Math.max(m,Math.abs(G.h.tf-p));p=G.h.tf;}return m;})()`);
  assert.ok(worst<=r.run('TURN_RATE/60')+1e-9,'a turn is walked ('+worst.toFixed(3)+' per frame)');
  assert.equal(Math.abs(r.run('G.h.tf')),3,'and round to the other profile');
});

test('The stick flies her, and where she is pointing has nothing to do with it',()=>{
  // Thrust used to come off the lean, which made the turn a throttle and the
  // three positions a gear lever. On the machine it was written for, the stick
  // flew her and the button turned her, and the two were independent.
  const fly=(tf,sx)=>{const q=runtime(2,9);clear(q);
    q.run(`G.h.landed=false;G.h.y=60;G.h.tf=${tf};G.h.want=${tf};G.h.vx=0;
     keys.HOLD=true;stick.held=true;stick.x=${sx};stick.y=0;`);
    step(q,90);return q.run('G.h.vx');};
  assert.ok(fly(0,1)>60,'nose-on with the stick right, she goes right');
  assert.ok(fly(3,-1)<-60,'facing right with the stick left, she goes left');
  assert.ok(Math.abs(fly(3,0))<2,'facing right with the stick centred, she stays');
  assert.ok(Math.abs(fly(-3,0))<2,'and facing left with it centred, likewise');
  // And how far you push it is how hard she goes.
  const half=fly(0,.5), full=fly(0,1);
  assert.ok(full>half+20,'half a push is half a speed ('+half.toFixed(0)+' < '+full.toFixed(0)+')');
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

test('The gun points where she does, and nose-on that is down',()=>{
  const r=runtime(2,9);clear(r);
  r.run('G.h.landed=false;G.h.y=60;G.h.tf=3;G.h.want=3;G.h.cool=0;shoot();');
  assert.ok(r.run('G.shots[0].vx')>0&&r.run('G.shots[0].vy')===0,'profile fires level, forwards');
  r.run('G.shots=[];G.h.tf=-3;G.h.want=-3;G.h.cool=0;shoot();');
  assert.ok(r.run('G.shots[0].vx')<0,'and the other profile the other way');
  r.run('G.shots=[];G.h.tf=0;G.h.want=0;G.h.cool=0;shoot();');
  assert.equal(r.run('G.shots[0].vx'),0);
  // Pointed at you she is in the tank attacking position, and that fires down.
  assert.ok(r.run('G.shots[0].vy')>0,'nose-on it fires straight down, at the tanks');
  assert.ok(r.run('G.shots[0].y')>=r.run('G.h.y+CHOP_H-1'),'out of the belly, not the roof');
  // Four in the air and no more, and not faster than the gun cycles.
  r.run('G.shots=[];G.h.tf=3;G.h.want=3;for(let i=0;i<12;i++){G.h.cool=0;shoot();}');
  assert.equal(r.run('G.shots.length'),4);
});

test('Three into a barrack and the door goes; then they come out, one at a time',()=>{
  const r=runtime(2,11);
  // One of the four is alight before you get there; this is about the others.
  const shut=r.run('G.huts.findIndex(h=>!h.open)');
  clear(r);
  // The camera is what decides a bullet is off the screen, so it has to be
  // looking at the barrack before anything is fired at it.
  r.run(`const H=G.huts[${shut}];
   G.h.landed=false;G.h.y=GROUND_Y-CHOP_H;G.h.x=H.x-80;G.h.tf=3;G.h.want=3;
   G.cam.x=H.x-200;`);
  assert.equal(r.run(`G.huts[${shut}].open`),false);
  // Only this barrack's people are counted: the one that was alight when you
  // arrived is still letting its own out the whole time.
  const mine=()=>r.run(`G.people.filter(p=>p.hut===G.huts[${shut}]).length`);
  for(let i=0;i<2;i++){r.run('G.h.cool=0;shoot();');step(r,30);
    assert.equal(mine(),0,'nobody is out of it before the door goes');}
  r.run('G.h.cool=0;shoot();');step(r,30);
  assert.equal(r.run(`G.huts[${shut}].open`),true,'the door goes on the third');
  // Nobody is standing outside before he has walked out of the door.
  r.run('G.h.x=WORLD-CHOP_W;G.h.landed=false;');   // too far off to call anyone
  step(r,30);
  const out=mine();
  assert.ok(out>0&&out<6,'they file out rather than pour out ('+out+')');
  assert.equal(r.run(`G.people.filter(p=>p.hut===G.huts[${shut}])
    .every(p=>Math.abs(p.x-(G.huts[${shut}].x+HUT_W/2-HOST_W/2))<40)`),
    true,'and they start at the door they came out of');
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

test('Held, down is a rate you can land at; let go, it is a fall',()=>{
  // Pushing her at the ground used to reach the falling speed in half a second,
  // so every landing made on the button was a heavy one and the only safe way
  // down was to let go and catch her, which is exactly backwards.
  const r=runtime(2,28);clear(r);
  r.run('G.h.landed=false;G.h.y=20;G.h.vy=0;keys.D=true;');
  step(r,30);
  const rate=r.run('G.h.vy');
  assert.ok(rate>20,'she does come down ('+rate.toFixed(0)+')');
  assert.ok(rate<r.run('HARD_LANDING'),
    'at a rate she can be put down at ('+rate.toFixed(0)+')');
  r.run('G.h.y=GROUND_Y-CHOP_H-60;');
  step(r,200);
  assert.equal(r.run('G.h.landed'),true);
  assert.equal(r.run('G.h.hp'),3,'holding it all the way down costs nothing');
  // And a free fall is still a free fall.
  const q=runtime(2,28);clear(q);
  q.run('G.h.landed=false;G.h.y=20;G.h.vy=0;');
  step(q,400);
  assert.equal(q.run('G.h.landed'),true);
  assert.ok(q.run('G.h.hp')<3,'letting go of everything and dropping does not');
});

test('Nothing the Empire owns shoots across the line',()=>{
  // Being destroyed on your own concrete with sixteen aboard is not a
  // difficulty, it is a tax.
  const r=runtime(2,29);clear(r);
  r.run(`G.h.x=POST_X;G.h.y=GROUND_Y-CHOP_H;G.h.landed=true;G.aboard=12;
   G.foes=[tank(FRONTIER_X-60,1),jet(FRONTIER_X-140,1,GROUND_Y-CHOP_H),
           drone(FRONTIER_X-100,60)];`);
  step(r,1200);
  assert.equal(r.run('G.flak.length'),0,'not a shell was fired at the pad');
  assert.equal(r.run('G.h.hp'),3,'and she is untouched');
  assert.equal(r.run('G.aboard'),0,'the twelve she carried are out and home');
  assert.equal(r.run('G.rescued'),12);
  // An air mine will not follow her over it either.
  assert.ok(r.run('G.foes.filter(e=>e.k==="drone").every(e=>e.x<=FRONTIER_X)'),true);
  // Over the line, the same tank does fire.
  const q=runtime(2,29);clear(q);
  q.run(`G.h.x=FRONTIER_X-260;G.h.y=GROUND_Y-CHOP_H;G.h.landed=true;
   G.foes=[tank(FRONTIER_X-420,1)];`);
  let fired=false;
  for(let i=0;i<900&&!fired;i++){q.run('stepGame(0.02);');fired=q.run('G.flak.length>0');}
  assert.equal(fired,true,'east of it, the same tank shoots');
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
  assert.equal(r.run('G.foes.filter(e=>e.k==="tank").every(e=>e.x+TANK_W<FRONTIER_X)'),true);
  r.run('G.foes=[tank(FRONTIER_X-60,1)];G.h.x=WORLD-CHOP_W;G.h.y=20;G.h.landed=false;');
  step(r,600);
  assert.ok(r.run('G.foes[0].x+TANK_W')<=r.run('FRONTIER_X'),'and it turns round at the fence');
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

test('The opening is quiet at every setting',()=>{
  // Two tanks at four seconds, and a jet by twenty, was the first minute of
  // this game whatever you picked, which is not a difficulty switch.
  for(const d of [1,2,3,4]){
    const r=runtime(d,40+d);
    assert.equal(r.run('G.foes.length'),0,'nothing is out there at the start (diff '+d+')');
    assert.ok(r.run('G.waveT')>=r.run('OPENING')-.01,'and nothing is due for a while');
    step(r,Math.round((r.run('OPENING')-2)*60),1/60);
    assert.equal(r.run('G.foes.length'),0,
      'the Empire has not noticed you yet at '+(r.run('OPENING')-2)+'s (diff '+d+')');
    assert.equal(r.run('G.wave'),0);
  }
});

test('The first thing it ever sends is one tank',()=>{
  for(const d of [1,2,3,4]){
    const r=runtime(d,50+d);clear(r);
    r.run('sendWave();');
    assert.equal(r.run('G.foes.length'),1,'one, at diff '+d);
    assert.equal(r.run('G.foes[0].k'),'tank','and it is armour, not aircraft');
  }
});

test('Each setting has its own ceiling, and its own road to it',()=>{
  // Run every setting out to a standstill and see what it settles on.
  const settle=d=>{const r=runtime(d,61);clear(r);
    for(let i=0;i<40;i++)r.run('sendWave();');
    return {t:r.run('G.foes.filter(e=>e.k==="tank").length'),
            j:r.run('G.foes.filter(e=>e.k==="jet").length'),
            m:r.run('G.foes.filter(e=>e.k==="drone").length')};};
  const top=[1,2,3,4].map(settle);
  for(let i=1;i<4;i++){
    assert.ok(top[i].t>=top[i-1].t,'tanks: '+JSON.stringify(top.map(x=>x.t)));
    assert.ok(top[i].j>=top[i-1].j,'jets: '+JSON.stringify(top.map(x=>x.j)));
    assert.ok(top[i].m>=top[i-1].m,'mines: '+JSON.stringify(top.map(x=>x.m)));
  }
  assert.ok(top[3].t>top[0].t&&top[3].j>top[0].j,'Swarming is not Quiet');
  assert.equal(top[0].m,0,'Quiet never sends an air mine at all');
  // And it gets there sooner. Count the waves each needs to field three tanks.
  const wavesTo3=d=>{const r=runtime(d,62);clear(r);
    for(let w=1;w<=60;w++){r.run('sendWave();');
      if(r.run('G.foes.filter(e=>e.k==="tank").length')>=3)return w;}
    return 99;};
  const w=[1,2,3,4].map(wavesTo3);
  assert.ok(w[3]<w[0],'Swarming reaches three tanks sooner than Quiet ('+w+')');
  for(let i=1;i<4;i++)assert.ok(w[i]<=w[i-1],'and the road shortens each step ('+w+')');
});

test('The trips you make push it harder than the clock does',()=>{
  // A player who is struggling should not also be escalated at; a player who is
  // getting them home should be. It is the original's own axis.
  const after=(trips,waves)=>{const r=runtime(2,63);clear(r);
    r.run('G.trips='+trips+';');
    for(let i=0;i<waves;i++)r.run('sendWave();');
    return r.run('G.foes.length');};
  assert.ok(after(4,3)>after(0,3),'four trips in is a busier sky than none');
  assert.ok(after(0,3)>0,'and the clock still moves on its own');
  // Two trips is worth about two waves.
  const r=runtime(2,64);clear(r);
  r.run('G.wave=5;G.trips=0;');
  const clockOnly=r.run('pressure()');
  r.run('G.wave=3;G.trips=1;');
  assert.equal(r.run('pressure()'),clockOnly,'a trip counts for two waves');
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

test('Nose-on is the narrowest she gets, which is the way to land among people',()=>{
  // The walkthroughs make a point of it: head for the ground in tank attack
  // position, because it is the smallest amount of helicopter that touches it.
  const crushed=tf=>{
    const r=runtime(2,31);clear(r);
    const shut=r.run('G.huts.findIndex(h=>!h.open)');
    r.run(`const H=G.huts[${shut}];H.hp=0;openHut(H);
     G.h.x=H.x+40;G.h.y=20;G.h.landed=false;keys.HOLD=true;G.cam.x=H.x-60;`);
    step(r,600);                                   // let a crowd gather outside
    // Line them up under her, then put her down on them.
    r.run(`const mid=G.h.x+CHOP_W/2;
     G.people.filter(p=>p.st!=="dead"&&p.st!=="gone").forEach((p,i)=>{
      p.x=mid-HOST_W/2+(i-3)*5;p.panic=0;});
     delete keys.HOLD;G.h.tf=${tf};G.h.want=${tf};G.h.y=GROUND_Y-CHOP_H-2;
     G.h.vy=10;G.h.landed=false;`);
    const before=r.run('G.lost');
    step(r,20);
    assert.equal(r.run('G.h.landed'),true);
    return r.run('G.lost')-before;
  };
  const side=crushed(3), nose=crushed(0);
  assert.ok(nose<side,'she flattens fewer nose-on ('+nose+' against '+side+')');
  assert.ok(side>0,'and side-on she really does flatten them');
});

test('A tank kills the hostages it drives over',()=>{
  const r=runtime(2,32);clear(r);
  const shut=r.run('G.huts.findIndex(h=>!h.open)');
  r.run(`const H=G.huts[${shut}];H.hp=0;openHut(H);
   G.h.x=H.x+40;G.h.y=20;G.h.landed=false;keys.HOLD=true;`);
  step(r,400);
  assert.ok(r.run('G.people.length')>2);
  // Park one on top of a man and let it drive.
  r.run(`const p=G.people.find(q=>q.st!=="dead");p.panic=0;
   G.foes=[tank(p.x-TANK_W-2,1)];G.foes[0].sp=30;`);
  const before=r.run('G.lost');
  step(r,120);
  assert.ok(r.run('G.lost')>before,'it went over him');
});

test('The air mines learn to shoot on the fourth trip, and not before',()=>{
  const shots=trips=>{
    const r=runtime(3,33);clear(r);
    r.run(`G.trips=${trips};G.h.x=200;G.h.y=70;G.h.landed=false;keys.HOLD=true;
     G.foes=[drone(580,70)];`);
    let seen=0;
    for(let i=0;i<600;i++){r.run('stepGame(1/60);');
      seen=Math.max(seen,r.run('G.flak.filter(b=>b.k==="mine").length'));}
    return seen;
  };
  assert.equal(shots(3),0,'on the third trip they are only something to avoid');
  assert.ok(shots(4)>0,'on the fourth they shoot as well');
});

test('They get out, they wave, and they walk off on their own feet',()=>{
  const r=runtime(2,34);clear(r);
  r.run('G.aboard=4;G.h.x=POST_X;G.h.y=GROUND_Y-CHOP_H;G.h.landed=true;');
  step(r,20);
  assert.ok(r.run('G.homeFolk.length')>0,'somebody is out on the pad');
  assert.equal(r.run('G.homeFolk.every(f=>f.ph==="wave")'),true,'waving, to start with');
  step(r,60);
  const where=r.run('G.homeFolk.map(f=>Math.round(f.x))');
  step(r,200);
  assert.equal(r.run('G.homeFolk.some(f=>f.ph==="walk")')||r.run('G.homeFolk.length')===0,
    true,'and then walking');
  // A frame of the gait per six pixels, the same as everyone else's walk.
  step(r,120);
  const gone=r.run('G.homeFolk.length');
  assert.ok(gone<4,'they go inside and are not drawn for ever ('+gone+' left)');
  assert.equal(r.run('G.rescued'),4);
  assert.equal(r.run('G.trips'),1,'and that is one trip made');
  void where;
});

/* ---- how she carries herself, and what she carries ---- */

test('She noses over into a run and comes back level out of it',()=>{
  const r=runtime(2,31); clear(r);
  r.run('G.h.x=FRONTIER_X-700;G.h.y=56;G.h.landed=false;G.h.tf=3;G.h.want=3;G.h.seq=0;');
  assert.equal(r.run('G.h.lean'),0,'level to begin with');
  r.run('stick.held=true;stick.x=1;stick.y=0;');
  step(r,60);
  const dive=r.run('G.h.lean');
  assert.ok(dive>0.15,'nosed over into the run, and not by a token amount: '+dive);
  assert.ok(dive<=r.run('LEAN_DIVE')+1e-9,'and no further than she is allowed');
  // Hands off. She is still moving, so she is still leaning - but she comes
  // back as the speed comes off, rather than snapping level the moment the
  // stick is centred.
  r.run('stick.held=false;stick.x=0;');
  step(r,10);
  const easing=r.run('G.h.lean');
  assert.ok(easing<dive&&easing>0.02,'she eases out of it: '+easing);
  step(r,200);
  assert.ok(Math.abs(r.run('G.h.lean'))<0.02,'and ends level: '+r.run('G.h.lean'));
});

test('Flown backwards she leans the other way, and nose-on she rolls',()=>{
  const r=runtime(2,32); clear(r);
  // Nose east, stick west: she is being dragged along backwards, so her nose
  // comes up rather than going down.
  r.run('G.h.x=FRONTIER_X-500;G.h.y=56;G.h.landed=false;G.h.tf=3;G.h.want=3;G.h.seq=0;'+
        'stick.held=true;stick.x=-1;');
  step(r,60);
  const back=r.run('G.h.lean');
  assert.ok(back<-0.05,'nose up, dragging her tail: '+back);
  assert.ok(Math.abs(back)<r.run('LEAN_DIVE'),'and less of it than a dive is');
  // The same, mirrored: nose west and flying west is a dive, not a climb.
  const m=runtime(2,33); clear(m);
  m.run('G.h.x=FRONTIER_X-500;G.h.y=56;G.h.landed=false;G.h.tf=-3;G.h.want=-3;G.h.seq=2;'+
        'stick.held=true;stick.x=-1;');
  step(m,60);
  assert.ok(m.run('G.h.lean')<-0.15,'she dives to the west as she dives to the east');
  // Nose-on there is no nose to drop, so the same lean is a roll and a smaller
  // one - and it still goes the way she is sliding.
  const n=runtime(2,34); clear(n);
  n.run('G.h.x=FRONTIER_X-500;G.h.y=56;G.h.landed=false;G.h.tf=0;G.h.want=0;G.h.seq=1;'+
        'stick.held=true;stick.x=1;');
  step(n,60);
  const roll=n.run('G.h.lean');
  assert.ok(roll>0.05&&roll<r.run('LEAN_DIVE'),'she heels over rather than noses over: '+roll);
  assert.equal(n.run('report().attitude'),'roll');
});

test('On the ground she sits level, whatever she was doing a moment ago',()=>{
  const r=runtime(2,35); clear(r);
  r.run('G.h.x=FRONTIER_X-400;G.h.y=40;G.h.landed=false;G.h.tf=3;G.h.want=3;G.h.seq=0;'+
        'stick.held=true;stick.x=1;');
  step(r,50);
  assert.ok(r.run('G.h.lean')>0.1);
  r.run('stick.held=true;stick.x=0;stick.y=1;');   // put her down
  step(r,200);
  assert.equal(r.run('G.h.landed'),true,'she is down');
  assert.ok(Math.abs(r.run('G.h.lean'))<0.02,'and sitting level on her rails');
});

test('The gun points where her nose points',()=>{
  const r=runtime(2,36); clear(r);
  r.run('G.h.x=FRONTIER_X-600;G.h.y=56;G.h.landed=false;G.h.tf=3;G.h.want=3;G.h.seq=0;');
  r.run('shoot();');
  assert.equal(r.run('G.shots[0].vy'),0,'level in the hover');
  r.run('G.shots=[];stick.held=true;stick.x=1;');
  step(r,60);
  r.run('G.h.cool=0;shoot();');
  const s=r.run('JSON.stringify({vx:G.shots[0].vx,vy:G.shots[0].vy})');
  const {vx,vy}=JSON.parse(s);
  assert.ok(vy>10,'and down the slope when she is nosed over into a run: '+vy);
  assert.ok(vx>200,'still mostly forwards');
  // Nose-on is the tank position and fires straight down whatever she is doing.
  r.run('G.shots=[];G.h.tf=0;G.h.cool=0;shoot();');
  assert.equal(r.run('G.shots[0].vx'),0);
  assert.ok(r.run('G.shots[0].vy')>0);
});

test('Four seekers, one at a time, and the only refill is at home',()=>{
  const r=runtime(2,37); clear(r);
  assert.equal(r.run('G.h.seek'),r.run('SEEK_MAX'),'she leaves the pad with full rails');
  r.run('G.h.x=FRONTIER_X-500;G.h.y=60;G.h.landed=false;');
  r.run('fireSeeker();');
  assert.equal(r.run('G.h.seek'),r.run('SEEK_MAX')-1,'one off the rail');
  assert.equal(r.run('G.seekers.length'),1);
  r.run('fireSeeker();');
  assert.equal(r.run('G.seekers.length'),1,'and not two in the same instant');
  step(r,40);
  for(let i=0;i<6;i++){r.run('G.h.seekCool=0;fireSeeker();');}
  assert.equal(r.run('G.h.seek'),0,'four is four');
  const inAir=r.run('G.seekers.length');
  r.run('G.h.seekCool=0;fireSeeker();');
  assert.equal(r.run('G.seekers.length'),inAir,'an empty rail fires nothing');
  // Home, and the crew put them back on one at a time rather than all at once.
  r.run('G.h.x=POST_X;G.h.y=GROUND_Y-CHOP_H;G.h.landed=true;G.h.vx=0;');
  step(r,20);
  assert.equal(r.run('G.h.seek'),0,'not in the first fifth of a second');
  step(r,30);
  const part=r.run('G.h.seek');
  assert.ok(part>0&&part<r.run('SEEK_MAX'),'they come back one at a time: '+part);
  step(r,200);
  assert.equal(r.run('G.h.seek'),r.run('SEEK_MAX'),'and then she is full again');
});

test('A seeker turns onto what is hottest, and can be out-turned',()=>{
  const r=runtime(2,38); clear(r);
  r.run('G.h.x=FRONTIER_X-520;G.h.y=86;G.h.landed=false;G.h.tf=3;G.h.want=3;G.h.seq=0;'+
        'G.foes=[jet(G.h.x+150,-1,20)];G.foes[0].sp=26;');
  r.run('fireSeeker();');
  // It leaves along her nose - level, because she is - and only then turns.
  assert.equal(r.run('G.seekers[0].ang'),0);
  step(r,8);
  assert.equal(r.run('G.seekers[0].ang'),0,'it does not turn while it is still on top of her');
  step(r,60);
  assert.equal(r.run('G.foes.length'),0,'the jet is down');
  assert.equal(r.run('G.score'),80,'and scored as a jet');
  // Air before armour: a tank right under it does not distract it from a jet.
  const t=runtime(2,39); clear(t);
  t.run('G.h.x=FRONTIER_X-520;G.h.y=60;G.h.landed=false;G.h.tf=3;G.h.want=3;G.h.seq=0;'+
        'G.foes=[tank(G.h.x+60,1),jet(G.h.x+220,-1,18)];t=0;');
  t.run('fireSeeker();');
  step(t,90);
  assert.equal(t.run('G.foes.filter(e=>e.k==="jet").length'),0,'it went for the jet');
  assert.equal(t.run('G.foes.filter(e=>e.k==="tank").length'),1,'and left the tank alone');
  // But it is not a guarantee: it turns at a rate, so a target that is behind
  // it when it arms is one it has to come round for, and it can run out first.
  const m=runtime(2,40); clear(m);
  m.run('G.h.x=FRONTIER_X-300;G.h.y=40;G.h.landed=false;G.h.tf=3;G.h.want=3;G.h.seq=0;'+
        'G.foes=[jet(G.h.x-260,1,150)];');
  m.run('fireSeeker();');
  step(m,40);
  const a=m.run('G.seekers.length?G.seekers[0].ang:null');
  assert.ok(a===null||Math.abs(a)>0.3,'it has to come round for one behind it');
});

test('A seeker does not fly out of the world, or live for ever',()=>{
  const r=runtime(2,41); clear(r);
  r.run('G.h.x=FRONTIER_X-400;G.h.y=60;G.h.landed=false;G.h.tf=3;G.h.want=3;G.h.seq=0;');
  r.run('fireSeeker();');
  step(r,Math.ceil(r.run('SEEK_LIFE')/0.02)+20);
  assert.equal(r.run('G.seekers.length'),0,'nothing is still in the air from four seconds ago');
});

test('She cannot fire one sitting on the pad',()=>{
  const r=runtime(2,42); clear(r);
  r.run('G.h.landed=true;G.h.seekCool=0;');
  const had=r.run('G.h.seek');
  r.run('fireSeeker();');
  assert.equal(r.run('G.seekers.length'),0);
  assert.equal(r.run('G.h.seek'),had,'and it does not cost her one');
});

/* ---- up on the step ---- */
// Flown level on purpose: what the collective is doing is not what these are
// about, and letting her sink turns every one of them into a landing test.
const fly=(r,n)=>r.run(`for(let i=0;i<${n};i++){stepGame(0.02);G.h.y=56;G.h.vy=0;G.h.landed=false;}`);
const run=(r,dir)=>r.run(`G.h.x=${dir>0?300:2000};G.h.y=56;G.h.landed=false;`+
  `G.h.tf=${dir*3};G.h.want=${dir*3};G.h.seq=${dir>0?0:2};stick.held=true;stick.x=${dir};`);

test('She is not faster; she gets faster, and only on a committed run',()=>{
  const r=runtime(2,51); clear(r); run(r,1);
  fly(r,60);                                   // a second and a bit of full stick
  assert.ok(r.run('G.h.vx')<=r.run('MAXV')+1,'she starts at her hovering speed');
  assert.equal(r.run('G.h.cruise'),0,'and is not on the step yet');
  fly(r,120);
  const top=r.run('G.h.vx');
  assert.ok(top>r.run('MAXV')*1.35,'she works up to a real difference: '+top);
  assert.ok(top<=r.run('CRUISE')+1,'and no further than she is allowed');
  assert.equal(r.run('G.h.cruise'),1);
  // It is hers to lose: turning her off the run takes it away faster than it
  // came, which is what stops it being a free upgrade.
  r.run('G.h.tf=0;G.h.want=0;');
  fly(r,30);
  assert.ok(r.run('G.h.vx')<=r.run('MAXV')+2,'turned nose-on she is back to hovering speed');
  assert.ok(r.run('G.h.cruise')<0.05);
});

test('Half a push, a turn or flying her backwards is not a run',()=>{
  // Half over is half her speed and never the step.
  const h=runtime(2,52); clear(h); run(h,1); h.run('stick.x=0.5;');
  fly(h,200);
  assert.equal(h.run('G.h.cruise'),0,'half a push does not get her up on it');
  assert.ok(h.run('G.h.vx')<h.run('MAXV')*0.6);
  // Nose east, stick west: she is being dragged, not flown.
  const b=runtime(2,53); clear(b); run(b,1); b.run('stick.x=-1;');
  fly(b,200);
  assert.equal(b.run('G.h.cruise'),0,'backwards is not a run');
  // Nose-on is not a run either, whatever the stick is doing.
  const n=runtime(2,54); clear(n); run(n,1); n.run('G.h.tf=0;G.h.want=0;G.h.seq=1;');
  fly(n,200);
  assert.equal(n.run('G.h.cruise'),0,'nose-on she is not on the step');
  // And she gets there going west exactly as she does going east.
  const w=runtime(2,55); clear(w); run(w,-1);
  fly(w,200);
  assert.equal(w.run('G.h.cruise'),1,'west is the same as east');
  assert.ok(w.run('G.h.vx')<-w.run('MAXV')*1.35);
});

test('The step is lost on the ground and is not hers when she starts',()=>{
  const r=runtime(2,56); clear(r);
  assert.equal(r.run('G.h.cruise'),0,'she leaves the pad off the step');
  run(r,1); fly(r,200);
  assert.equal(r.run('G.h.cruise'),1);
  // Put her down. Whatever she was doing a moment ago, she is not doing it now.
  r.run('stick.x=0;stick.y=1;');
  step(r,220);
  assert.equal(r.run('G.h.landed'),true);
  assert.equal(r.run('G.h.cruise'),0,'she does not sit on the pad up on the step');
});

test('The run buys a trip that was three minutes of holding the stick',()=>{
  // The measurement the change exists for: the pad to the deepest barrack.
  const HUTS_DEEPEST=374;                       // the deepest barrack on the strip
  const go=(cruising)=>{
    const t=runtime(2,57); clear(t);
    t.run('G.h.x=POST_X;G.h.y=56;G.h.landed=false;G.h.tf=-3;G.h.want=-3;G.h.seq=2;'+
          'stick.held=true;stick.x=-1;');
    if(!cruising)t.run('Object.defineProperty(G.h,"cruise",{get:()=>0,set:()=>{}});');
    let n=0;
    while(t.run('G.h.x')>HUTS_DEEPEST&&n<6000){
      t.run('stepGame(0.02);G.h.y=56;G.h.vy=0;G.h.landed=false;');n++;}
    return n*0.02;
  };
  const was=go(false), now=go(true);
  assert.ok(was>19&&was<22,'the old trip was about twenty seconds: '+was);
  assert.ok(now<was*0.78,'and the run takes a fifth off it or better: '+now+' against '+was);
  assert.ok(now>10,'without making the country feel small: '+now);
});
