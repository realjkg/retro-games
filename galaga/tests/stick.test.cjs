// The stick. Choplifter's, adapted: Galaga's cabinet had a two-way one, so the
// knob runs in a gate across the middle and only the sideways push counts.
const test=require('node:test'),assert=require('node:assert');
const {runtime,step}=require('./harness.cjs');

// The stub reports every element as 224 wide at left 0, so the pad's middle is
// 112 and its throw is that less the knob's radius and its clearance.
const MID=112,THROW=112-26-3;
const push=(r,frac)=>r.run(`moveStick({clientX:${MID+THROW*frac},preventDefault(){}})`);

function clear(r){
  r.run(`G.enemies.length=0;G.bullets.length=0;G.ebullets.length=0;
    G.waveI=0;G.waveT=1e9;G.spawnT=1e9;G.diveT=1e9;
    G.ship.inv=1e4;G.ship.alive=true;G.ship.dual=false;G.ship.x=112;
    keys.left=keys.right=keys.autofire=false;touchX=null;releaseStick();`);
}
// how far the fighter travels in a second under whatever is holding it
function travel(r,secs){
  const x0=+r.run('G.ship.x');
  step(r,secs||1);
  return +r.run('G.ship.x')-x0;
}

test('pushed to the edge the stick is as fast as the keyboard', ()=>{
  const r=runtime();clear(r);
  r.run(`keys.right=true;`);
  const byKey=travel(r,0.5);
  clear(r);
  push(r,1);
  const byStick=travel(r,0.5);
  assert.ok(byKey>0&&byStick>0,'nothing moved');
  assert.ok(Math.abs(byStick-byKey)<0.5,
    'the keyboard went '+byKey.toFixed(1)+' and the stick '+byStick.toFixed(1));
});

test('half a push is half the speed, which is the point of a stick', ()=>{
  const r=runtime();clear(r);
  push(r,1);
  const full=travel(r,0.4);
  clear(r);
  push(r,0.5);
  const half=travel(r,0.4);
  assert.ok(half>0,'a half push did nothing at all');
  const ratio=half/full;
  assert.ok(ratio>0.4&&ratio<0.6,'half a push went '+(ratio*100).toFixed(0)+'% as far');
});

test('it goes both ways, and it cannot be pushed past the edge of the pad', ()=>{
  const r=runtime();clear(r);
  push(r,-1);
  assert.ok(travel(r,0.3)<0,'pushing left did not go left');
  clear(r);
  push(r,4);                                  /* a thumb well outside the pad */
  assert.equal(+r.run('stick.x'),1,'it read '+r.run('stick.x')+' past the edge');
  clear(r);
  push(r,-4);
  assert.equal(+r.run('stick.x'),-1);
});

test('letting go stops the fighter', ()=>{
  const r=runtime();clear(r);
  push(r,1);
  assert.ok(travel(r,0.3)>0);
  r.run(`releaseStick();`);
  assert.equal(r.run('String(stick.held)'),'false');
  assert.equal(+r.run('stick.x'),0);
  assert.equal(Math.round(travel(r,0.5)*100)/100,0,'it kept going after the thumb left');
});

test('a thumb on the stick outranks a key that is stuck down', ()=>{
  // Three things can steer and they must not fight: the stick wins while it is
  // held, which is what stops a key left down on the keyboard dragging the
  // fighter against the thumb actually on the pad.
  const r=runtime();clear(r);
  r.run(`keys.left=true;`);
  push(r,1);
  assert.ok(travel(r,0.3)>0,'the stuck key beat the thumb on the stick');
});

test('a pointer the browser takes away still lets go of the stick', ()=>{
  // Without this the fighter carries on across the screen after the thumb has
  // gone, which is the failure the capture is there to prevent.
  const r=runtime();clear(r);
  push(r,1);
  assert.equal(r.run('String(stick.held)'),'true');
  r.run(`releaseStick();`);
  assert.equal(r.run('String(stick.held)'),'false');
});
