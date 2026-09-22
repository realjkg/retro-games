// How things move. Every failure the game has had so far has been a movement
// failure that a state check was happy with, so these look at positions over
// time rather than at flags.
const test=require('node:test'),assert=require('node:assert');
const {runtime,step,settle}=require('./harness.cjs');

test('all forty enemies arrive and take a slot', ()=>{
  const r=runtime();settle(r);
  assert.equal(r.run('G.enemies.length'),40);
  assert.equal(r.run(`G.enemies.filter(e=>e.st==='slot').length`),40);
});

test('every entry path starts off the screen — nothing appears at its post', ()=>{
  const r=runtime();
  for(let k=0;k<4;k++)for(const d of[1,-1]){
    const p=r.run(`JSON.stringify(entryPath(${k},${d})[0])`);
    const {x,y}=JSON.parse(p);
    const outside=y<-16||y>288+16||x<-16||x>224+16;
    assert.ok(outside,`entry path ${k}/${d} starts on screen at ${x},${y}`);
  }
});

test('no flight path has a gap in it', ()=>{
  // A path assembled from an arc and a line that do not meet teleports whatever
  // is flying it. The break is invisible in any state the game stores, and it
  // is exactly what happened to the third entry pattern.
  const r=runtime();
  const worst=(code)=>r.run(`(()=>{const p=${code};let m=0;
    for(let i=1;i<p.length;i++)m=Math.max(m,Math.hypot(p[i].x-p[i-1].x,p[i].y-p[i-1].y));
    return m;})()`);
  for(let k=0;k<4;k++)for(const d of[1,-1])
    assert.ok(worst(`entryPath(${k},${d})`)<12,`entry ${k}/${d} jumps`);
  assert.ok(worst('divePath(100,40,112,1)')<12,'dive jumps');
  assert.ok(worst('divePath(100,40,112,-1)')<12,'mirrored dive jumps');
  assert.ok(worst('returnPath(30,{x:112,y:52})')<12,'return jumps');
  assert.ok(worst('capturePath(100,36,112)')<12,'capture run jumps');
});

test('an enemy flies in on its own — it is never dropped at its slot', ()=>{
  const r=runtime();
  step(r,0.9);
  const e=JSON.parse(r.run(`JSON.stringify({x:G.enemies[0].x,y:G.enemies[0].y,st:G.enemies[0].st})`));
  const s=JSON.parse(r.run(`JSON.stringify(slotPos(G.enemies[0].slot))`));
  assert.equal(e.st,'entering');
  assert.ok(Math.hypot(e.x-s.x,e.y-s.y)>60,'it is already sitting in its slot');
});

test('heading follows the step just taken, so nothing slides sideways', ()=>{
  const r=runtime();
  for(let i=0;i<70;i++){
    step(r,1/60);
    const n=+r.run('G.enemies.length');
    if(!n)continue;
    const d=JSON.parse(r.run(`JSON.stringify(G.enemies.map(e=>({x:e.x,y:e.y,a:e.ang,s:e.st})))`));
    if(!r.__prev){r.__prev=d;continue;}
    d.forEach((e,j)=>{
      const p=r.__prev[j];
      if(!p||e.s!=='entering')return;
      const dx=e.x-p.x,dy=e.y-p.y;
      if(Math.hypot(dx,dy)<0.4)return;
      const want=Math.atan2(dy,dx);
      let diff=Math.abs(((e.a-want+Math.PI*3)%(Math.PI*2))-Math.PI);
      assert.ok(diff<0.5,`facing ${(e.a*180/Math.PI).toFixed(0)} while moving ${(want*180/Math.PI).toFixed(0)}`);
    });
    r.__prev=d;
  }
});

test('the formation is alive: it sways, it breathes, and it keeps its shape', ()=>{
  const r=runtime();settle(r);
  const sample=()=>JSON.parse(r.run(
    `JSON.stringify(G.enemies.map(e=>({x:e.x,y:e.y,c:e.slot.col,rr:e.slot.row})))`));
  // The sway and the breath are both slow, and at some phases a column near
  // the middle barely shifts in a single second; what has to be true is that
  // over a few seconds every one of the forty travels.
  const lo=sample().map(e=>e.x),hi=lo.slice();
  for(let i=0;i<16;i++){
    step(r,0.25);
    sample().forEach((e,j)=>{lo[j]=Math.min(lo[j],e.x);hi[j]=Math.max(hi[j],e.x);});
  }
  const still=lo.filter((v,i)=>hi[i]-v<3).length;
  assert.equal(still,0,`${still} of forty stood perfectly still for four seconds`);
  // still a grid: neighbours in a row stay one column apart
  const b=sample();
  const row=b.filter(e=>e.rr===4).sort((p,q)=>p.c-q.c);
  for(let i=1;i<row.length;i++){
    const gap=row[i].x-row[i-1].x;
    assert.ok(gap>14&&gap<18,`column gap went to ${gap.toFixed(1)}`);
  }
});

test('wings beat: a sprite frame a tenth of a second later is a different one', ()=>{
  const r=runtime();settle(r);
  const f=()=>r.run('G.enemies.map(e=>e.frame).join("")');
  const a=f();step(r,0.14);const b=f();
  assert.notEqual(a,b,'nothing flapped');
});

test('a diver leaves its slot, goes off the bottom, and comes back to it', ()=>{
  const r=runtime();settle(r);
  r.run(`G.ship.alive=false;const e=G.enemies[20];window0=e;launchDive(e,112);`);
  const slot=JSON.parse(r.run(`JSON.stringify(slotPos(G.enemies[20].slot))`));
  let sawBelow=false;
  for(let i=0;i<60*14;i++){
    step(r,1/60);
    const st=r.run('G.enemies[20]?G.enemies[20].st:"x"');
    const y=+r.run('G.enemies[20]?G.enemies[20].y:0');
    if(st==='diving'&&y>230)sawBelow=true;
    if(st==='slot'&&sawBelow)break;
  }
  assert.ok(sawBelow,'the dive never got near the bottom of the screen');
  assert.equal(r.run('G.enemies[20].st'),'slot');
  const now=JSON.parse(r.run(`JSON.stringify({x:G.enemies[20].x,y:G.enemies[20].y})`));
  assert.ok(Math.abs(now.y-slot.y)<1,'it came home to a different row');
});

test('a returning enemy arrives heading down, not sideways', ()=>{
  const r=runtime();settle(r);
  r.run(`G.ship.alive=false;const e=G.enemies[5];
    e.path=returnPath(30,slotPos(e.slot));e.d=0;e.spd=90;e.st='returning';`);
  let last=0;
  for(let i=0;i<60*8;i++){
    step(r,1/60);
    const st=r.run('G.enemies[5].st');
    if(st==='slot')break;
    last=+r.run('G.enemies[5].ang');
  }
  assert.equal(r.run('G.enemies[5].st'),'slot');
  assert.ok(Math.abs(last-Math.PI/2)<0.7,
    `arrived facing ${(last*180/Math.PI).toFixed(0)} degrees`);
});
