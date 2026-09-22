// Endless fighters: the count never moves, and the run is not a score.
const test=require('node:test'),assert=require('node:assert');
const {runtime,step,settle,park}=require('./harness.cjs');

const endless=r=>r.run(`setEndless(true);newGame();hideOverlay();G.state='play';G.diveT=1e9;`);

test('a death costs the fighter and never the count', ()=>{
  const r=runtime();endless(r);
  assert.equal(+r.run('G.lives'),3);
  for(let i=0;i<8;i++){
    r.run(`G.ship.alive=true;G.ship.inv=0;G.ship.dual=false;playerDies();`);
    step(r,2);
  }
  assert.equal(+r.run('G.lives'),3,'the count moved');
  assert.notEqual(r.run('G.state'),'over','it ended the game anyway');
  assert.equal(r.run('String(G.ship.alive)'),'true','it never came back');
});

test('without the switch a death still costs a fighter, and eight of them end it', ()=>{
  // The counterpart, so the test above is not passing because nothing dies.
  const r=runtime();
  r.run(`setEndless(false);newGame();hideOverlay();G.state='play';G.diveT=1e9;`);
  for(let i=0;i<8;i++){
    r.run(`G.ship.alive=true;G.ship.inv=0;G.ship.dual=false;playerDies();`);
    step(r,2);
  }
  assert.equal(r.run('G.state'),'over');
  assert.ok(+r.run('G.lives')<=0);
});

test('the boss still takes your fighter, it just cannot take the game', ()=>{
  const r=runtime();endless(r);settle(r);park(r);
  r.run(`G.stage=2;const b=G.enemies.find(e=>e.kind==='boss');b.__mark=1;launchCapture(b);`);
  for(let i=0;i<60*12;i++){
    step(r,1/60);
    if(r.run('String(G.enemies.find(e=>e.__mark).holds)')==='true')break;
  }
  assert.equal(r.run('String(G.enemies.find(e=>e.__mark).holds)'),'true',
    'the capture never happened');
  assert.equal(+r.run('G.lives'),3,'it charged a life for it');
});

test('no extra fighters are handed out when nothing runs out', ()=>{
  const r=runtime();endless(r);
  r.run(`G.lives=3;G.score=0;G.nextExtra=20000;addScore(25000);`);
  assert.equal(+r.run('G.lives'),3,'it handed out a fighter there is no room for');
  r.run(`setEndless(false);G.lives=3;G.score=0;G.nextExtra=20000;addScore(25000);`);
  assert.equal(+r.run('G.lives'),4,'and it stopped handing them out entirely');
});

test('an endless run never becomes a high score', ()=>{
  const r=runtime();endless(r);
  r.run(`G.high=0;G.score=0;addScore(50000);`);
  assert.equal(+r.run('G.high'),0,'it took the score');
  assert.equal(r.store.get('galaga.high'),undefined,'it wrote the score to storage');
});

test('turning the switch off mid-run does not launder the run', ()=>{
  const r=runtime();endless(r);
  r.run(`G.high=0;G.score=0;addScore(10000);setEndless(false);addScore(40000);`);
  assert.equal(+r.run('G.high'),0,'the second half of the run counted');
  // but the next run, started clean, does count
  r.run(`newGame();hideOverlay();addScore(1234);`);
  assert.equal(+r.run('G.high'),1234);
});

test('the switch is remembered between visits', ()=>{
  const r=runtime();
  r.run(`setEndless(true);`);
  assert.equal(r.store.get('galaga.endless'),'1');
  r.run(`setEndless(false);`);
  assert.equal(r.store.get('galaga.endless'),'0');
});
