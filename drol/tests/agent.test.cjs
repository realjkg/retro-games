// The agent in tools/play-agent.js is the game's other player: it drives the real
// script with no browser, so these are the tests that say the maze can actually be
// flown, the children caught and the mother reached - things the unit tests check
// the parts of, but nobody checks end to end.
//
// Run with node --test tests/agent.test.cjs.
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {play}=require('../tools/play-agent.js');

const game=(seed,seconds=60,diff=2)=>play({seed,diff,frames:Math.round(seconds*60)});

test('The same seed is the same game twice over',()=>{
  assert.deepEqual(game(5,20),game(5,20));
  assert.notDeepEqual(game(5,20),game(6,20));
});

test('A player who knows the rules gets the children out',()=>{
  const runs=[1,2,3,4,5].map(s=>game(s,60));
  const rescues=runs.reduce((n,r)=>n+r.rescues.length,0);
  assert.ok(rescues>=5,`five minutes of play is worth more than a rescue a minute (${rescues})`);
  assert.ok(runs.every(r=>r.rescues.length>0),'every maze can be finished at least once');
  // Every rescue is a child the scene was about, and it takes some doing.
  for(const r of runs)for(const res of r.rescues){
    assert.ok(["boy","girl","mom"].includes(res.who));
    assert.ok(res.seconds>1,'a rescue is never instant');
  }
});

test('The round can be played through all three scenes to the mother',()=>{
  const r=play({seed:3,diff:2,frames:300*60});
  const who=new Set(r.rescues.map(x=>x.who));
  assert.ok(who.has('boy')&&who.has('girl'),`the first two scenes are finished (${[...who]})`);
  assert.ok(who.has('mom'),'and the mother is reached at the bottom of the third');
  assert.ok(r.rounds>=1,'which starts the whole thing again');
});

test('The maze is navigable: the agent works its way down through the holes',()=>{
  // Stalls are counted as twenty seconds without progress of any kind. A maze
  // with a child behind a floor that has no hole in it would show up here.
  const runs=[7,8,9].map(s=>game(s,90));
  const stalls=runs.reduce((n,r)=>n+r.stuck,0);
  assert.ok(stalls<=6,`the agent is rarely stuck for twenty seconds (${stalls})`);
  assert.ok(runs.every(r=>r.rescues.length>0),'and still finishes scenes while it happens');
});

test('A harder setting is a slower rescue, not just a fuller screen',()=>{
  const rate=diff=>{
    const runs=[11,12,13,14,15,16].map(s=>play({seed:s,diff,frames:120*60}));
    const seconds=runs.reduce((n,r)=>n+r.gameSeconds,0);
    return runs.reduce((n,r)=>n+r.rescues.length,0)/(seconds/60);
  };
  const quiet=rate(1), swarming=rate(4);
  assert.ok(swarming<quiet,`rescues per minute fall as the maze fills (${swarming.toFixed(2)} < ${quiet.toFixed(2)})`);
});
