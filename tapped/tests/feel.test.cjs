// How it handles, held to what a player can feel — and the walk, held to what
// a player can see: nobody slides.
const test=require('node:test'),assert=require('node:assert');
const {runtime,step,guest}=require('./harness.cjs');

test('the bartender runs the length of the bar in under two seconds', ()=>{
  const r=runtime();
  const t=(+r.run('TAP_X')-+r.run('BX_MIN'))/+r.run('RUNSPD');
  assert.ok(t<2,t+'s');
});

test('a mug pours in under half a second', ()=>{
  const r=runtime();
  assert.ok(+r.run('POURT')<0.5);
});

test('a customer walks in from off the screen, through the door', ()=>{
  const r=runtime();
  r.run(`spawn(1);`);
  assert.ok(+r.run('G.cust[0].x')<0,'he appeared inside the bar');
  step(r,4);
  assert.ok(+r.run('G.cust[0].x')>0,'he never came in');
});

test('a walking customer changes stride every few pixels, and never moves without a step', ()=>{
  const r=runtime();
  guest(r,0,40,'walk');r.run(`G.cust[0].t=1e9;`);
  const seen=new Set();let lastFrame=null,lastX=null,moves=0,changes=0;
  for(let i=0;i<120;i++){
    step(r,1/60);
    const f=r.run(`(()=>{const p=G.cust[0];return Math.floor(p.dist/3)%4+','+p.x;})()`).split(',');
    seen.add(f[0]);
    if(lastX!==null&&+f[1]!==lastX)moves++;
    if(lastFrame!==null&&f[0]!==lastFrame)changes++;
    lastFrame=f[0];lastX=+f[1];
  }
  assert.equal(seen.size,4,'not all four frames of the walk were used');
  assert.ok(changes>=8,'the legs changed '+changes+' times in two seconds');
  assert.ok(moves>0);
});

test('a standing customer is never still: he bangs on the bar', ()=>{
  const r=runtime();
  guest(r,0,60,'wait');
  const frames=new Set();
  for(let i=0;i<30;i++){step(r,1/60);frames.add(r.run(`Object.keys(SPR).find(k=>SPR[k]===custSprite(G.cust[0]))`));}
  assert.ok(frames.size>=2,'one picture for half a second');
});

test('up and down go straight to the tap of the next bar, and wrap', ()=>{
  const r=runtime();
  r.run(`G.bt.lane=0;G.bt.x=100;laneMove(-1);`);
  assert.equal(+r.run('G.bt.lane'),3);
  assert.equal(+r.run('G.bt.x'),+r.run('TAP_X'));
});

test('a held direction key keeps moving bars', ()=>{
  const r=runtime();
  r.run(`G.bt.lane=0;press('down',true);`);step(r,0.4);r.run(`press('down',false);`);
  assert.equal(+r.run('G.bt.lane'),2);
  step(r,0.5);
  assert.equal(+r.run('G.bt.lane'),2,'it kept moving after the key came up');
});
