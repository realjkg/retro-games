// How the fighter answers the controls. These are the numbers a player feels
// and no other check in here looks at: how long the ship takes to cross, how
// long a held button can go quiet, and whether a shot can pass through
// something on a frame the browser dropped.
const test=require('node:test'),assert=require('node:assert');
const {runtime,step}=require('./harness.cjs');

// A fighter alone on an empty screen, so nothing absorbs a bullet early and
// flatters the rate.
//
// The sky has to be empty without the stage counting as cleared: an empty
// screen with every flight spawned is the win condition, and the stage card
// that follows stops the fighter stepping at all. Holding the wave counter
// back with a spawn timer that never reaches zero gives an empty sky in a
// stage that is still running.
function loner(r){
  r.run(`G.enemies.length=0;G.bullets.length=0;G.ebullets.length=0;
    G.waveI=0;G.waveT=1e9;G.spawnT=1e9;
    G.diveT=1e9;G.ship.inv=1e4;G.ship.alive=true;
    G.ship.dual=false;G.ship.t=0;G.shots=0;G.hits=0;`);
}

test('the fighter crosses the playfield in about a second, not two', ()=>{
  const r=runtime();loner(r);
  r.run(`G.ship.x=W-10;keys.left=true;keys.right=false;keys.autofire=false;`);
  let t=0;
  for(let i=0;i<60*6;i++){step(r,1/60);t+=1/60;if(+r.run('G.ship.x')<=10.01)break;}
  assert.ok(t<1.45,'it took '+t.toFixed(2)+'s to get across a 224 pixel screen');
  assert.ok(t>0.7,'it crossed in '+t.toFixed(2)+'s, which is not steering any more');
});

test('a tenth of a second of held control is worth a column of the swarm', ()=>{
  // The formation stands on sixteen pixel columns. A nudge that moves the
  // fighter less than one of them cannot be aimed with.
  const r=runtime();loner(r);
  r.run(`G.ship.x=112;keys.left=true;keys.right=false;keys.autofire=false;`);
  step(r,0.1);
  const moved=112-+r.run('G.ship.x');
  assert.ok(moved>=16,'a tenth of a second moved it '+moved.toFixed(1)+' pixels');
});

test('a held fire button never goes quiet for a third of a second', ()=>{
  // The two-bullet limit is the arcade's and stays. What was wrong was paying
  // the cooldown for a shot the limit turned away: the button gave a tenth of
  // a second, then a whole second of nothing, then a tenth again.
  const r=runtime();loner(r);
  r.run(`keys.left=false;keys.right=false;keys.autofire=true;G.ship.x=112;`);
  let t=0,prev=0,last=0,worst=0;
  for(let i=0;i<60*5;i++){
    step(r,1/60);t+=1/60;
    const s=+r.run('G.shots');
    if(s>last){if(prev)worst=Math.max(worst,t-prev);prev=t;last=s;}
  }
  assert.ok(last>=15,'only '+last+' shots left the ship in five seconds');
  assert.ok(worst<=0.36,'the button went quiet for '+worst.toFixed(2)+'s while held');
});

test('a shot cannot be stepped straight through an enemy on a slow frame', ()=>{
  // The frame loop clamps a long frame to a tenth of a second, which at this
  // bullet speed is sixty pixels in one step — four times the height of a
  // bee's hit band. Testing only where the bullet ended up puts the shot
  // through the enemy and out the other side.
  const r=runtime();loner(r);
  r.run(`G.enemies.push(mkEnemy({kind:'zako',row:4,col:5},[{x:112,y:120},{x:112,y:121}]));
    G.enemies[0].st='slot';`);
  step(r,1/60);                           /* let it stand in its slot */
  const e=JSON.parse(r.run(`JSON.stringify({x:G.enemies[0].x,y:G.enemies[0].y})`));
  /* twenty pixels below it, so one long frame carries the shot clean past:
     it ends eleven pixels above the bee, well outside the band a check on the
     new position alone would test */
  r.run(`G.bullets.push({x:${e.x},y:${e.y+20}});G.shots++;`);
  step(r,0.05,0.05);                      /* one twentieth-of-a-second frame */
  assert.equal(+r.run('G.enemies.length'),0,
    'the bullet passed through the bee and kept going');
  assert.equal(+r.run('G.hits'),1);
});
