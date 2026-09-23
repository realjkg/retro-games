// What the bar is worth, and what it costs you.
const test=require('node:test'),assert=require('node:assert');
const {runtime,step,guest,pour}=require('./harness.cjs');

test('holding pour at the tap fills a mug, and letting go sends it down the bar', ()=>{
  const r=runtime();
  r.run(`G.bt.x=TAP_X;keys.fire=true;`);step(r,0.2);
  assert.equal(+r.run('G.mugs.length'),0,'a half-poured mug was sent');
  step(r,0.4);
  assert.equal(+r.run('G.bt.fill'),1);
  r.run(`keys.fire=false;`);step(r,1/60);
  assert.equal(+r.run('G.mugs.length'),1);
  assert.equal(r.run('String(G.mugs[0].full)'),'true');
  const x0=+r.run('G.mugs[0].x');step(r,0.2);
  assert.ok(+r.run('G.mugs[0].x')<x0-15,'the mug did not slide left');
});

test('a mug let go of half full stays under the tap and keeps filling', ()=>{
  const r=runtime();
  r.run(`G.bt.x=TAP_X;keys.fire=true;`);step(r,0.2);r.run(`keys.fire=false;`);step(r,0.1);
  assert.equal(+r.run('G.mugs.length'),0);
  assert.ok(+r.run('G.bt.fill')>0.3);
  r.run(`keys.fire=true;`);step(r,0.3);r.run(`keys.fire=false;`);step(r,1/60);
  assert.equal(+r.run('G.mugs.length'),1);
});

test('you cannot pour away from the tap, and walking off it spills the mug', ()=>{
  const r=runtime();
  r.run(`G.bt.x=120;keys.fire=true;`);step(r,1);r.run(`keys.fire=false;`);step(r,0.1);
  assert.equal(+r.run('G.mugs.length'),0);
  r.run(`G.bt.x=TAP_X;keys.fire=true;`);step(r,0.2);r.run(`keys.fire=false;keys.left=true;`);
  step(r,0.1);r.run(`keys.left=false;`);
  assert.equal(+r.run('G.bt.fill'),0);
});

// Through the shake and the shuffle, to the moment the player chooses.
function toPick(r){
  for(let i=0;i<60*40&&r.run('G.bonus.phase')!=='pick';i++)step(r,1/60);
}

test('a customer pushed through the door is fifty, the original score', ()=>{
  const r=runtime();
  guest(r,0,20);
  r.run(`G.score=0;`);pour(r);step(r,3);
  assert.equal(+r.run('G.score'),50);
  assert.equal(+r.run('G.cust.length'),0);
  assert.equal(+r.run('G.stats.served'),1);
});

test('a customer too far in drinks, and slides the empty back; catching it is a hundred', ()=>{
  const r=runtime();
  guest(r,0,150);
  r.run(`G.score=0;G.tips.length=0;cfg=()=>Object.assign(levelCfg(1),{tipP:0});`);
  pour(r);step(r,1.2);
  assert.equal(r.run('G.cust[0].st'),'drink');
  assert.equal(+r.run('G.score'),0);
  step(r,1.6);
  const m=r.j('G.mugs');
  assert.equal(m.length,1);assert.equal(m[0].full,false);
  step(r,4);
  assert.equal(+r.run('G.score'),100,'the empty was not caught at the tap');
  assert.equal(r.run('G.state'),'play');
});

test('a tip is fifteen hundred, and the whole bar stops to watch', ()=>{
  const r=runtime();
  guest(r,1,60,'walk');r.run(`G.cust[0].t=1e9;`);
  r.run(`G.score=0;G.tips.push({lane:0,x:200,t:5});G.bt.lane=0;G.bt.x=TAP_X;keys.left=true;`);
  step(r,0.4);r.run(`keys.left=false;`);
  assert.equal(+r.run('G.score'),1500);
  assert.ok(+r.run('G.showT')>0);
  const x=+r.run('G.cust[0].x');step(r,1);
  assert.equal(+r.run('G.cust[0].x'),x,'a customer walked during the show');
});

test('a customer who reaches the taps costs a bartender', ()=>{
  const r=runtime();
  r.run(`G.lives=3;`);guest(r,2,BAR_R_MINUS());
  function BAR_R_MINUS(){return 205;}
  r.run(`G.cust[0].st='walk';G.cust[0].t=1e9;`);step(r,2);
  assert.equal(r.run('G.state'),'dying');
  assert.equal(+r.run('G.lives'),2);
  assert.equal(r.run('G.why'),'reached');
});

test('a full mug off the far end costs a bartender', ()=>{
  const r=runtime();
  r.run(`G.lives=3;`);pour(r);step(r,2.5);
  assert.equal(r.run('G.why'),'missed');assert.equal(+r.run('G.lives'),2);
});

test('an empty nobody catches costs a bartender', ()=>{
  const r=runtime();
  r.run(`G.lives=3;G.bt.lane=1;G.mugs.push({lane:0,x:200,v:40,full:false});`);step(r,1.5);
  assert.equal(r.run('G.why'),'dropped');assert.equal(+r.run('G.lives'),2);
});

test('after a death the customers still at the bars come in again', ()=>{
  const r=runtime();
  r.run(`G.total=10;`);
  for(let i=0;i<3;i++)guest(r,i,40+i*20);
  const before=+r.run('G.spawned');
  r.run(`G.cust[2].x=BAR_R-16;G.cust[2].st='walk';`);step(r,0.1);
  assert.equal(r.run('G.state'),'dying');
  assert.equal(+r.run('G.spawned'),before-3);
  step(r,2.2);
  assert.equal(r.run('G.state'),'card');
});

test('the last bartender lost is last call', ()=>{
  const r=runtime();
  r.run(`G.lives=1;G.score=0;G.mugs.push({lane:0,x:20,v:118,full:true});`);step(r,2.4);
  assert.equal(r.run('G.state'),'over');
});

test('endless bartenders never run out, and never make a high score', ()=>{
  const r=runtime();
  r.run(`setEndless(true);newGame();hideOverlay();G.state='play';G.spawnT=1e9;G.score=90000;`);
  for(let i=0;i<5;i++){r.run(`G.mugs.push({lane:0,x:20,v:118,full:true});`);step(r,2.2);r.run(`G.state='play';`);}
  assert.notEqual(r.run('G.state'),'over');
  assert.equal(r.run('String(qualifies(G.score))'),'false');
});

test('a bar is clear when everyone has been served, and the Soda Shake follows', ()=>{
  const r=runtime();
  r.run(`G.spawned=G.total;G.cust=[];G.mugs=[];`);step(r,0.1);
  assert.equal(r.run('G.state'),'clear');
  step(r,2);
  assert.equal(r.run('G.state'),'bonus');
});

test('the Soda Shake: the right can is three thousand, and then the next bar', ()=>{
  const r=runtime();
  r.run(`startBonus();`);
  toPick(r);
  assert.equal(r.run('G.bonus.phase'),'pick');
  const at=+r.run('G.bonus.slots.indexOf(G.bonus.good)');
  r.run(`G.score=0;G.bonus.cur=${at};bonusPick();`);
  assert.equal(+r.run('G.score'),3000);
  step(r,2.6);
  assert.equal(r.run('G.state'),'card');
  assert.equal(+r.run('G.level'),2);
});

test('the shuffle carries the good can to wherever the swaps say', ()=>{
  const r=runtime();
  r.run(`startBonus();`);
  const B=r.j('G.bonus');
  let pos=B.good;
  for(const[a,b]of B.swaps)pos=pos===a?b:pos===b?a:pos;
  toPick(r);
  assert.equal(+r.run('G.bonus.slots[G.bonus.good]'),pos);
});

test('the switch has two positions: the arcade count of bartenders, or unlimited', ()=>{
  const r=runtime();
  r.store.delete('tapped.endless');
  r.run(`setEndless(false);showSplash();`);
  assert.equal(r.run('livesLabel()'),'BARTENDERS: '+r.run('ARCADE_LIVES')+' · ARCADE');
  r.run(`cycleLives();`);
  assert.equal(r.run('livesLabel()'),'BARTENDERS: UNLIMITED');
  assert.equal(r.store.get('tapped.endless'),'1','the choice is not remembered');
  r.run(`cycleLives();`);
  assert.equal(r.run('livesLabel()'),'BARTENDERS: '+r.run('ARCADE_LIVES')+' · ARCADE','it did not come back round');
});

test('an arcade game starts with the arcade count, and loses one a death', ()=>{
  const r=runtime();
  r.run(`setEndless(false);newGame();hideOverlay();G.state='play';G.spawnT=1e9;`);
  const n=+r.run('ARCADE_LIVES');
  assert.equal(+r.run('G.lives'),n);
  r.run(`G.mugs.push({lane:0,x:20,v:118,full:true});`);step(r,0.2);
  assert.equal(+r.run('G.lives'),n-1);
});

test('an unlimited game shows infinity and never ends on a death', ()=>{
  const r=runtime();
  r.run(`setEndless(true);newGame();hideOverlay();G.state='play';G.spawnT=1e9;`);
  assert.equal(r.el('lives').textContent,'∞');
  for(let i=0;i<8;i++){r.run(`G.mugs.push({lane:0,x:20,v:118,full:true});`);step(r,2.2);
    if(r.run('G.state')==='card')step(r,1.3);}
  assert.equal(r.run('G.state'),'play');
  assert.equal(r.run('String(G.noScore)'),'true');
});
