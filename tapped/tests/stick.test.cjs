// The joystick: the one on the glass and a real one through the Gamepad API.
const test=require('node:test'),assert=require('node:assert');
const {runtime,step}=require('./harness.cjs');

test('push the stick across to run, and it does not change bar on the way', ()=>{
  const r=runtime();
  const d=r.j('stickDirs(-0.8,0.3)');
  assert.deepEqual(d,{up:false,down:false,left:true,right:false});
  assert.equal(r.j('stickDirs(0.2,0.1)').right,false,'the dead zone ran');
});

test('push it up or down to change bar, and a diagonal that is mostly up is up', ()=>{
  const r=runtime();
  assert.equal(r.j('stickDirs(0.3,-0.9)').up,true);
  assert.equal(r.j('stickDirs(0,0.4)').down,false,'a nudge changed bar');
});

test('the stick on the glass drives the bartender, and letting go stops him', ()=>{
  const r=runtime();
  const box=`{left:0,top:0,width:150,height:150}`;
  r.run(`el('stick').getBoundingClientRect=()=>(${box});G.bt.lane=0;G.bt.x=TAP_X;`);
  r.run(`stickAt({clientX:75,clientY:130});`);            /* down */
  assert.equal(+r.run('G.bt.lane'),1);
  r.run(`stickAt({clientX:75,clientY:75});stickAt({clientX:20,clientY:75});`);   /* back to centre, then left */
  step(r,0.3);
  const x=+r.run('G.bt.x');
  assert.ok(x<+r.run('TAP_X')-20,'it did not run');
  r.run(`stickOff();`);step(r,0.3);
  assert.equal(+r.run('G.bt.x'),x,'it kept running after the thumb came off');
  assert.equal(+r.run('G.bt.lane'),1,'letting go changed bar');
});

test('a real joystick: stick, d-pad and the fire button', ()=>{
  const r=runtime();
  r.run(`var PADSTATE={axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};
    navigator.getGamepads=()=>[null,PADSTATE];G.bt.lane=0;G.bt.x=TAP_X;`);
  r.run(`PADSTATE.buttons[13].pressed=true;pollPads();PADSTATE.buttons[13].pressed=false;pollPads();`);
  assert.equal(+r.run('G.bt.lane'),1,'the d-pad did not change bar');
  r.run(`PADSTATE.buttons[0].pressed=true;`);
  for(let i=0;i<40;i++){r.run('pollPads();');step(r,1/60);}
  r.run(`PADSTATE.buttons[0].pressed=false;pollPads();`);step(r,1/60);
  assert.equal(+r.run('G.mugs.length'),1,'holding the button and letting go did not pour and send');
  r.run(`PADSTATE.axes[0]=-1;pollPads();`);step(r,0.3);
  assert.ok(+r.run('G.bt.x')<+r.run('TAP_X')-20);
  r.run(`PADSTATE.buttons[9].pressed=true;pollPads();`);
  assert.equal(r.run('G.state'),'paused','START did not pause');
});

test('a joystick unplugged mid-run lets go of everything', ()=>{
  const r=runtime();
  r.run(`var PADSTATE={axes:[-1,0],buttons:[]};navigator.getGamepads=()=>[PADSTATE];pollPads();
    navigator.getGamepads=()=>[];pollPads();`);
  assert.equal(r.run('String(keys.left)'),'false');
});
