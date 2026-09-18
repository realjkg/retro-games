// The rules of the tower. Run with node --test tests/rules.test.cjs — no packages.
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {runtime,clearRoom,step}=require('./harness.cjs');

// A runtime with the runner standing on a long clear floor at row 10.
function room(){
  const r=runtime();
  r.run('newGame(1,5);');
  clearRoom(r,10);
  return r;
}
const at=r=>r.run('G.hero.x+","+G.hero.y');

test('The runner walks, and a wall stops him where it stands',()=>{
  const r=room();
  r.run('keys.right=true;');step(r,60);
  assert.ok(r.run('G.hero.x')>10,'a second of running covers ground');
  r.run('keys.right=false;G.hero=mkActor(6,10,false);G.hero.digT=0;G.map[9][10]=BRICK;keys.right=true;');
  step(r,120);
  assert.equal(r.run('G.hero.x'),8,'he stops against the brick rather than through it');
});

test('Nothing underfoot means falling, and there is no steering a fall',()=>{
  const r=room();
  r.run('for(let y=11;y<ROWS;y++)G.map[9][y]=EMPTY;G.hero=mkActor(8,10,false);G.hero.digT=0;keys.right=true;');
  step(r,10);
  r.run('keys.right=false;keys.left=true;');
  step(r,120);
  r.run('keys.left=false;');
  assert.equal(r.run('G.hero.x'),9,'he falls down the shaft he walked into, not back out of it');
  assert.equal(r.run('G.hero.y'),15,'and lands at the bottom');
});

test('Ladders go up and down; the top of a ladder is a place to stand',()=>{
  const r=room();
  r.run('for(let y=4;y<=10;y++)G.map[6][y]=LADDER;keys.up=true;');
  step(r,120);
  r.run('keys.up=false;');
  assert.equal(at(r),'6,3','he climbs to the top rung and steps off onto the cell above it');
  assert.equal(r.run('supported(G.hero)'),true);
  r.run('keys.down=true;');step(r,180);r.run('keys.down=false;');
  assert.equal(r.run('G.hero.y'),10,'and back down again');
});

test('A rope is crossed hand over hand, and pressing down lets go',()=>{
  const r=room();
  r.run('for(let x=6;x<14;x++)G.map[x][8]=BAR;G.hero=mkActor(6,8,false);G.hero.digT=0;keys.right=true;');
  step(r,40);
  assert.equal(r.run('G.hero.mode'),'hang');
  assert.ok(r.run('G.hero.x')>8,'he moves along it');
  r.run('keys.right=false;keys.down=true;');step(r,60);r.run('keys.down=false;');
  assert.equal(r.run('G.hero.y'),10,'letting go drops him to the floor');
});

test('A false brick looks like brick and holds nothing up',()=>{
  const r=room();
  r.run('G.map[9][11]=TRAP;keys.right=true;');
  step(r,60);
  r.run('keys.right=false;');
  assert.equal(r.run('G.hero.y'),11,'he goes through the floor where the brick was not real');
  assert.equal(r.run('passable(9,11)'),true);
  assert.equal(r.run('blocks(9,11)'),false);
});

test('Digging takes real brick only, and only with its top clear',()=>{
  const r=room();
  assert.equal(r.run('canDig(1)'),true);
  r.run('G.map[7][11]=SOLID;');
  assert.equal(r.run('tryDig(1)'),false,'poured concrete cannot be dug');
  r.run('G.map[7][11]=BRICK;G.map[7][10]=BRICK;');
  assert.equal(r.run('tryDig(1)'),false,'nor brick with something sitting on it');
  r.run('G.map[7][10]=EMPTY;G.map[6][10]=BAR;');
  assert.equal(r.run('tryDig(1)'),false,'nor from a rope');
  r.run('G.map[6][10]=LADDER;');
  assert.equal(r.run('tryDig(1)'),false,'nor from a ladder');
  r.run('G.map[6][10]=EMPTY;');
  assert.equal(r.run('tryDig(1)'),true);
  step(r,40);
  assert.equal(r.run('G.map[7][11]'),0,'the brick is gone once the dig finishes');
  assert.equal(r.run('G.holes.length'),1);
});

test('The brick comes back, and buries whoever is still in the hole',()=>{
  const r=room();
  r.run('tryDig(1);');step(r,40);
  r.run('keys.right=true;');step(r,30);r.run('keys.right=false;');
  assert.equal(at(r),'7,11','he walked into his own hole');
  const lives=r.run('G.lives');
  step(r,60*6);
  assert.equal(r.run('G.map[7][11]'),1,'the hole has filled in');
  assert.equal(r.run('G.state'),'dead');
  assert.equal(r.run('G.lives'),lives-1,'and it cost him a man');
});

test('A guard hunts the runner down his own row',()=>{
  const r=room();
  r.run('G.guards=[mkActor(20,10,true)];');
  const lives=r.run('G.lives');
  step(r,40);
  assert.ok(r.run('G.guards[0].x')<20,'he comes after you');
  step(r,240);
  assert.equal(r.run('G.lives'),lives-1,'and catching you is fatal');
});

test('A guard in a hole is a floor, drops his gold, and is worth 75 either way',()=>{
  const r=room();
  r.run('G.score=0;G.guards=[mkActor(9,10,true)];G.guards[0].gold=1;G.map[9][11]=EMPTY;G.holes=[{x:9,y:11,t:HOLE_TIME,open:true}];G.hero.x=2;');
  step(r,40);
  assert.equal(r.run('G.guards[0].y'),11,'he drops into it');
  assert.ok(r.run('G.guards[0].stuck')>0,'and flounders there');
  assert.equal(r.run('G.score'),75,'which is worth 75');
  assert.equal(r.run('G.guards[0].gold'),0,'the chest he was carrying is out of his hands');
  const loose=r.run('(()=>{let n=0;for(let x=0;x<COLS;x++)for(let y=0;y<ROWS;y++)if(G.map[x][y]===GOLD)n++;return n;})()');
  assert.equal(loose,1,'and back on the level where it can be picked up');
  assert.equal(r.run('guardFloorAt(9,11)'),true,'while he is down there you can walk over him');
  assert.equal(r.run('supported({x:9,y:10})'),true);
});

test('A guard who cannot climb out is buried and comes back at the top',()=>{
  const r=room();
  r.run(`G.score=0;G.hero.x=24;
    G.guards=[mkActor(9,11,true)];G.guards[0].stuck=GUARD_STUCK;
    G.map[9][11]=EMPTY;G.map[8][10]=BRICK;G.map[10][10]=BRICK;
    G.holes=[{x:9,y:11,t:HOLE_TIME,open:true}];`);
  step(r,60*8);
  assert.equal(r.run('G.map[9][11]'),1,'the brick closed over him');
  assert.equal(r.run('G.score'),75,'burying him scores 75');
  assert.ok(r.run('G.guards[0].y')<3,'and he is back on his feet near the top of the screen');
});

test('A guard who can climb out does, and keeps coming',()=>{
  const r=room();
  r.run(`G.hero.x=2;G.guards=[mkActor(9,11,true)];G.guards[0].stuck=GUARD_STUCK;
    G.map[9][11]=EMPTY;G.holes=[{x:9,y:11,t:HOLE_TIME,open:true}];`);
  step(r,Math.ceil(60*3.5));
  assert.equal(r.run('G.guards[0].y'),10,'he is out of the hole');
  assert.equal(r.run('G.map[9][11]'),0,'well before the brick returns');
});

test('Every chest is 250, and the way out only shows when the last one is lifted',()=>{
  const r=room();
  r.run(`G.score=0;G.map[7][10]=GOLD;G.map[8][10]=GOLD;G.goldTotal=2;G.taken=0;
    G.hidden=[{x:4,y:0},{x:4,y:1}];G.exitOpen=false;keys.right=true;`);
  step(r,10);
  assert.equal(r.run('G.taken'),1);
  assert.equal(r.run('G.score'),250);
  assert.equal(r.run('G.exitOpen'),false,'one chest left, so nothing has appeared yet');
  step(r,20);
  r.run('keys.right=false;');
  assert.equal(r.run('G.score'),500);
  assert.equal(r.run('G.exitOpen'),true);
  assert.equal(r.run('G.map[4][0]'),3,'the hidden ladder is a ladder now');
});

test('The top row is only an exit once the gold is gone, and pays 1500',()=>{
  const r=room();
  r.run('for(let y=0;y<=10;y++)G.map[6][y]=LADDER;G.score=0;G.goldTotal=1;G.taken=0;G.exitOpen=false;keys.up=true;');
  step(r,240);
  assert.equal(r.run('G.state'),'play','reaching the top with gold still out there does nothing');
  assert.equal(r.run('G.hero.y'),0);
  r.run('G.exitOpen=true;');
  step(r,5);
  assert.equal(r.run('G.state'),'clear');
  assert.equal(r.run('G.score'),1500);
});

test('Men run out, and 15000 points buys another',()=>{
  const r=room();
  r.run('G.lives=1;G.score=0;killHero("test");');
  step(r,120);
  assert.equal(r.run('G.state'),'over');
  const r2=room();
  r2.run('G.lives=3;G.score=0;G.nextExtra=SC_EXTRA;addScore(15000);');
  assert.equal(r2.run('G.lives'),4);
});

test('Giving yourself up costs a man and starts the level again',()=>{
  const r=runtime();
  r.run('newGame(3,5);');
  const lives=r.run('G.lives');
  r.run('restartLevel();');
  step(r,120);
  assert.equal(r.run('G.lives'),lives-1);
  assert.equal(r.run('G.level'),2,'the same level, not the next one');
});
