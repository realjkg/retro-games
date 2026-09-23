// The two things every game should have had: three letters on the wall, and a
// save slot that brings the bar back exactly as it was.
const test=require('node:test'),assert=require('node:assert');
const {runtime,step,guest}=require('./harness.cjs');

test('the slot is written while you play, and holds the whole bar', ()=>{
  const r=runtime();
  guest(r,1,80);guest(r,3,120);
  r.run(`G.score=4321;G.level=1;G.mugs.push({lane:2,x:140,v:40,full:false});G.bt.lane=2;G.bt.x=60;`);
  step(r,2.1);
  const s=JSON.parse(r.store.get('tapped.save'));
  assert.equal(s.score,4321);
  assert.equal(s.cust.length,2);
  assert.equal(s.mugs.length,1);
  assert.equal(s.bt.lane,2);
});

test('resume brings back the same bar, paused, with nobody moved', ()=>{
  const r=runtime();
  guest(r,1,80);guest(r,3,120);
  r.run(`G.score=4321;G.lives=2;G.mugs.push({lane:2,x:140,v:40,full:false});togglePause();`);
  const saved=r.store.get('tapped.save');
  const r2=runtime();
  r2.store.set('tapped.save',saved);
  r2.run(`showSplash();resumeGame();`);
  assert.equal(r2.run('G.state'),'paused');
  assert.equal(+r2.run('G.score'),4321);
  assert.equal(+r2.run('G.lives'),2);
  assert.deepEqual(r2.j('G.cust.map(p=>[p.lane,Math.round(p.x)])'),[[1,80],[3,120]]);
  assert.equal(+r2.run('G.mugs.length'),1);
  r2.run(`togglePause();`);
  assert.equal(r2.run('G.state'),'play');
});

test('the title offers RESUME only when there is something to resume', ()=>{
  const r=runtime();
  r.store.delete('tapped.save');
  r.run(`showSplash();`);
  assert.ok(!/RESUME/.test(r.el('overlay').innerHTML));
  r.run(`newGame();hideOverlay();G.state='play';G.score=700;saveSlot();showSplash();`);
  assert.ok(/RESUME · LEVEL 1 · 700/.test(r.el('overlay').innerHTML));
});

test('a death is paid for in the slot the moment it happens', ()=>{
  const r=runtime();
  r.run(`G.lives=3;G.mugs.push({lane:0,x:20,v:118,full:true});`);step(r,0.2);
  assert.equal(r.run('G.state'),'dying');
  assert.equal(JSON.parse(r.store.get('tapped.save')).lives,2,'closing the page mid-fall would give the bartender back');
});

test('game over clears the slot', ()=>{
  const r=runtime();
  r.run(`saveSlot();G.lives=1;G.mugs.push({lane:0,x:20,v:118,full:true});`);step(r,2.4);
  assert.equal(r.run('G.state')==='over'||r.run('G.state')==='initials',true);
  assert.equal(r.store.has('tapped.save'),false);
});

test('clearing a bar saves a checkpoint at the start of the next one', ()=>{
  const r=runtime();
  r.run(`G.score=999;G.spawned=G.total;G.cust=[];G.mugs=[];`);step(r,0.1);
  const s=JSON.parse(r.store.get('tapped.save'));
  assert.equal(s.level,2);assert.equal(s.score,999);assert.equal(s.cust.length,0);
});

test('a broken slot is ignored rather than trusted', ()=>{
  const r=runtime();
  for(const junk of ['{','null','{"v":1}','{"v":1,"level":2,"score":5,"lives":0}']){
    r.store.set('tapped.save',junk);
    assert.equal(r.run('readSlot()'),null,junk);
  }
});

test('a score that makes the table asks for three letters', ()=>{
  const r=runtime();
  r.run(`G.score=5000;G.lives=1;G.mugs.push({lane:0,x:20,v:118,full:true});`);step(r,2.4);
  assert.equal(r.run('G.state'),'initials');
  r.run(`iniType('j');iniType('k');iniType('g');iniDone();`);
  const t=JSON.parse(r.store.get('tapped.scores'));
  assert.deepEqual(t.map(e=>[e.n,e.s]),[['JKG',5000]]);
  assert.equal(r.store.get('tapped.initials'),'JKG');
  assert.equal(r.run('G.state'),'over');
});

test('the letters turn round the alphabet both ways, arcade fashion', ()=>{
  const r=runtime();
  r.run(`G.score=10;startInitials();G.ini.l=[0,0,0];iniTurn(-1);`);
  assert.equal(r.run('iniName()'),'-AA');
  r.run(`iniTurn(1);iniTurn(1);iniMove(1);iniTurn(1);iniMove(1);iniMove(1);iniTurn(2);`);
  assert.equal(r.run('iniName()'),'BBC');
});

test('the table keeps the best five, and a score below them is not asked for letters', ()=>{
  const r=runtime();
  for(const s of [100,900,300,700,500,200])r.run(`insertScore('AAA',${s},1);`);
  assert.deepEqual(r.j('G.table.map(e=>e.s)'),[900,700,500,300,200]);
  assert.equal(r.run('String(qualifies(150))'),'false');
  assert.equal(r.run('String(qualifies(250))'),'true');
  assert.equal(+r.run('high()'),900);
});
