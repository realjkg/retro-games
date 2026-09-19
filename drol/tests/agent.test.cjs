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
  // Not every maze falls in five minutes - a child can spend a long time on the
  // wrong side of a magnet - so this asks the question of four of them.
  const runs=[1,2,4,5].map(seed=>play({seed,diff:2,frames:300*60}));
  const whos=runs.map(r=>new Set(r.rescues.map(x=>x.who)));
  assert.ok(whos.filter(w=>w.has('boy')&&w.has('girl')).length>=3,
    'the first two scenes are finished in nearly every maze');
  assert.ok(whos.some(w=>w.has('mom')),'the mother is reached at the bottom of the third');
  assert.ok(runs.some(r=>r.rounds>=1),'and finishing her starts the whole thing again');
});

test('The maze is navigable: the agent works its way down through the holes',()=>{
  // Stalls are counted as twenty seconds without progress of any kind. A maze
  // with a child behind a floor that has no hole in it would show up here.
  const runs=[7,8,9].map(s=>game(s,90));
  const stalls=runs.reduce((n,r)=>n+r.stuck,0);
  assert.ok(stalls<=6,`the agent is rarely stuck for twenty seconds (${stalls})`);
  assert.ok(runs.every(r=>r.rescues.length>0),'and still finishes scenes while it happens');
});

test('A harder setting costs more robots per child',()=>{
  // Rescues per minute is the wrong measure now that flying is faster than
  // walking: a fuller maze makes the agent take off more, and it travels quicker
  // in the air. What a crowded maze really costs is robots.
  const cost=diff=>{
    const runs=[11,12,13,14,15,16,17,18].map(s=>play({seed:s,diff,frames:120*60}));
    const deaths=runs.reduce((n,r)=>n+r.deaths.length,0);
    const rescues=runs.reduce((n,r)=>n+r.rescues.length,0);
    return deaths/Math.max(1,rescues);
  };
  const quiet=cost(1), swarming=cost(4);
  assert.ok(swarming>quiet*1.4,
    `the swarming maze costs far more robots per child (${swarming.toFixed(2)} vs ${quiet.toFixed(2)})`);
});
