// What the game is worth, what it costs you, and what the boss does with your
// fighter once it has it.
const test=require('node:test'),assert=require('node:assert');
const {runtime,step,settle,park}=require('./harness.cjs');

const at=(r,i)=>JSON.parse(r.run(`JSON.stringify({x:G.enemies[${i}].x,y:G.enemies[${i}].y})`));
// Put a bullet exactly where an enemy is and let the frame resolve it.
function shoot(r,i){
  const p=at(r,i);
  r.run(`G.bullets.push({x:${p.x},y:${p.y}});G.shots++;`);
  step(r,1/60);
}

test('two shots on the screen at a time, four when you are flying a pair', ()=>{
  const r=runtime();
  r.run(`G.bullets.length=0;for(let i=0;i<8;i++){G.ship.t=0;shipStep(0);}`);
  r.run(`keys.autofire=true;`);
  for(let i=0;i<10;i++)r.run(`G.ship.t=0;shipStep(1/600);`);
  assert.equal(+r.run('G.bullets.length'),2);
  r.run(`G.bullets.length=0;G.ship.dual=true;`);
  for(let i=0;i<10;i++)r.run(`G.ship.t=0;shipStep(1/600);`);
  assert.equal(+r.run('G.bullets.length'),4);
});

test('a bee is fifty in the formation and a hundred on its way down', ()=>{
  const r=runtime();settle(r);
  const z=+r.run(`G.enemies.findIndex(e=>e.kind==='zako')`);
  r.run(`G.score=0;`);shoot(r,z);
  assert.equal(+r.run('G.score'),50);
  const z2=+r.run(`G.enemies.findIndex(e=>e.kind==='zako')`);
  r.run(`G.score=0;G.ship.alive=false;launchDive(G.enemies[${z2}],112);`);
  step(r,0.3);shoot(r,z2);
  assert.equal(+r.run('G.score'),100);
});

test('a butterfly is eighty and a hundred and sixty', ()=>{
  const r=runtime();settle(r);
  const i=+r.run(`G.enemies.findIndex(e=>e.kind==='goei')`);
  r.run(`G.score=0;`);shoot(r,i);
  assert.equal(+r.run('G.score'),80);
});

test('a boss takes two hits, and shows it after the first', ()=>{
  const r=runtime();settle(r);
  const i=+r.run(`G.enemies.findIndex(e=>e.kind==='boss')`);
  r.run(`G.score=0;`);
  shoot(r,i);
  assert.equal(r.run(`G.enemies[${i}].kind`),'boss','it died on one hit');
  assert.equal(r.run(`String(G.enemies[${i}].hurt)`),'true');
  assert.equal(+r.run('G.score'),0,'a non-fatal hit scored');
  shoot(r,i);
  assert.equal(+r.run('G.score'),150);
});

test('a diving boss is four hundred alone, and sixteen hundred with both escorts', ()=>{
  const r=runtime();settle(r);
  const solo=`(()=>{const b=G.enemies.find(e=>e.kind==='boss');b.hp=1;
    G.ship.alive=false;launchDive(b,112);b.escorts=[];return valueOf(b);})()`;
  assert.equal(+r.run(solo),400);
  const r2=runtime();settle(r2);
  const pair=`(()=>{const b=G.enemies.find(e=>e.kind==='boss');
    const z=G.enemies.filter(e=>e.kind==='zako').slice(0,2);
    G.ship.alive=false;launchDive(b,112);z.forEach(e=>launchDive(e,112));
    b.escorts=z;return valueOf(b);})()`;
  assert.equal(+r2.run(pair),1600);
  assert.equal(+r2.run(`(()=>{const b=G.enemies.find(e=>e.kind==='boss');
    b.escorts[0].dead=true;return valueOf(b);})()`),800);
});

test('an extra fighter at twenty thousand, and every seventy thousand after', ()=>{
  const r=runtime();
  r.run(`G.lives=3;G.score=0;G.nextExtra=20000;addScore(19999);`);
  assert.equal(+r.run('G.lives'),3);
  r.run(`addScore(1);`);
  assert.equal(+r.run('G.lives'),4);
  r.run(`addScore(69999);`);
  assert.equal(+r.run('G.lives'),4);
  r.run(`addScore(1);`);
  assert.equal(+r.run('G.lives'),5);
});

test('the beam takes the fighter, and the boss carries it', ()=>{
  const r=runtime();settle(r);
  park(r);
  r.run(`G.stage=2;G.lives=3;
    const b=G.enemies.find(e=>e.kind==='boss');b.__mark=1;launchCapture(b);`);
  for(let i=0;i<60*12;i++){
    step(r,1/60);
    if(r.run('String(G.enemies.find(e=>e.__mark).holds)')==='true')break;
  }
  assert.equal(r.run('String(G.enemies.find(e=>e.__mark).holds)'),'true');
  assert.equal(+r.run('G.lives'),2,'the capture was free');
  assert.equal(r.run('String(G.ship.captured)'),'true');
});

test('shoot the captor in flight and the fighter comes home as a pair', ()=>{
  const r=runtime();settle(r);
  park(r);
  r.run(`G.ship.captured=true;
    const b=G.enemies.find(e=>e.kind==='boss');b.holds=true;b.hp=1;b.__mark=1;
    launchDive(b,112);`);
  step(r,0.4);
  const i=+r.run(`G.enemies.findIndex(e=>e.__mark)`);
  shoot(r,i);
  assert.ok(r.run('String(!!G.freed)')==='true','nothing was freed');
  for(let k=0;k<60*12&&r.run('String(!!G.freed)')==='true';k++)step(r,1/60);
  assert.equal(r.run('String(G.ship.dual)'),'true');
  assert.equal(r.run('String(G.ship.captured)'),'false');
});

test('shoot the captor in the formation and the fighter dies with it', ()=>{
  const r=runtime();settle(r);
  r.run(`G.ship.captured=true;
    const b=G.enemies.find(e=>e.kind==='boss');b.holds=true;b.hp=1;b.__mark=1;`);
  const i=+r.run(`G.enemies.findIndex(e=>e.__mark)`);
  shoot(r,i);
  assert.equal(r.run('String(!!G.freed)'),'false');
  assert.equal(r.run('String(G.ship.captured)'),'false');
  assert.equal(r.run('String(G.ship.dual)'),'false');
});

test('losing one of a pair costs the pair, not a life', ()=>{
  const r=runtime();
  r.run(`G.ship.dual=true;G.ship.alive=true;G.ship.inv=0;G.lives=3;playerDies();`);
  assert.equal(r.run('String(G.ship.dual)'),'false');
  assert.equal(+r.run('G.lives'),3);
  assert.equal(r.run('String(G.ship.alive)'),'true');
});

test('a challenging stage shoots at nobody, and forty of forty is ten thousand', ()=>{
  const r=runtime();
  r.run(`startStage(3);G.state='play';G.ship.alive=true;G.ship.inv=0;`);
  assert.equal(r.run('String(G.challenge)'),'true');
  step(r,8);
  assert.equal(+r.run('G.ebullets.length'),0,'a challenging stage fired back');
  r.run(`G.score=0;G.chalHit=40;G.chalTotal=40;endChallenge();`);
  assert.equal(+r.run('G.score'),10000);
  assert.equal(+r.run('G.stage'),4,'it did not move on');
});

test('every fourth stage is a challenging stage', ()=>{
  const r=runtime();
  const got=[];
  for(let n=1;n<=12;n++)if(r.run(`String(stageIsChallenge(${n}))`)==='true')got.push(n);
  assert.deepEqual(got,[3,7,11]);
});

test('clearing the formation starts the next stage', ()=>{
  const r=runtime();settle(r);
  r.run(`G.ship.alive=false;G.enemies.length=0;`);
  step(r,1/60);
  assert.equal(+r.run('G.stage'),2);
  assert.equal(r.run('G.state'),'stagecard');
});

test('the high score outlives the game', ()=>{
  const r=runtime();
  r.run(`G.high=0;G.score=0;addScore(1234);`);
  assert.equal(r.store.get('galaga.high'),'1234');
});

test('shots and hits are both counted, for the tally at the end', ()=>{
  const r=runtime();settle(r);
  r.run(`G.shots=0;G.hits=0;`);
  shoot(r,0);
  assert.equal(+r.run('G.shots'),1);
  assert.equal(+r.run('G.hits'),1);
  r.run(`G.bullets.push({x:2,y:200});G.shots++;`);
  step(r,0.4);
  assert.equal(+r.run('G.shots'),2);
  assert.equal(+r.run('G.hits'),1);
});
