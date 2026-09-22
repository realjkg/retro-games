// The map, and whether you can actually get anywhere on it. A dungeon that
// generates a stairway behind a wall is a dungeon nobody notices is broken
// until they have walked every corridor twice.
const test=require('node:test'),assert=require('node:assert');
const {runtime,withParty}=require('./harness.cjs');

const walk=(r,x,y,depth)=>r.j(`(function(){
  var g=[];for(var yy=0;yy<SIZE;yy++){var row=[];
    for(var xx=0;xx<SIZE;xx++)row.push(solid(${depth},xx,yy)?'#':'.');g.push(row);}
  return reach(g,${x},${y});})()`);

test('every landmark in Skara Brae is on a street you can walk to', ()=>{
  const r=runtime();
  const dist=walk(r,6,6,0);
  const marks={};
  const town=r.j('TOWN');
  town.forEach((row,y)=>row.split('').forEach((ch,x)=>{
    if('GETVRS'.indexOf(ch)>=0)marks[ch]=[x,y];
  }));
  assert.equal(Object.keys(marks).length,6,'a landmark is missing from the map');
  for(const[ch,[x,y]]of Object.entries(marks))
    assert.ok(dist[y][x]>=0,'cannot reach '+ch+' at '+x+','+y);
});

test('the sewers connect: the way down is reachable from the way in', ()=>{
  const r=runtime();
  for(let n=1;n<=3;n++){
    const up=r.j(`LEVELS[${n}].up`),down=r.j(`LEVELS[${n}].down`);
    const dist=walk(r,up[0],up[1],n);
    assert.ok(dist[down[1]][down[0]]>0,
      'level '+n+': the exit at '+down+' is walled off from the entrance');
    assert.ok(dist[down[1]][down[0]]>20,
      'level '+n+': the exit is '+dist[down[1]][down[0]]+' steps away, which is no level at all');
  }
});

test('nothing is placed on a square that cannot be reached', ()=>{
  const r=runtime();
  for(let n=1;n<=3;n++){
    const up=r.j(`LEVELS[${n}].up`);
    const dist=walk(r,up[0],up[1],n);
    const grid=r.j(`LEVELS[${n}].grid`);
    grid.forEach((row,y)=>row.forEach((ch,x)=>{
      if('$DSX>B'.indexOf(ch)<0)return;
      assert.ok(dist[y][x]>=0,'level '+n+': a '+ch+' at '+x+','+y+' is sealed in');
    }));
  }
});

test('the dungeon is the same dungeon every time it is built', ()=>{
  // Two separate boots of the page must agree, or a save would put the party
  // down in a different maze from the one they left.
  const a=runtime(),b=runtime();
  for(let n=1;n<=3;n++)
    assert.deepEqual(a.j(`LEVELS[${n}].grid`),b.j(`LEVELS[${n}].grid`),'level '+n+' drifted');
});

test('a wall stops you and an open square does not', ()=>{
  const r=withParty(runtime());
  r.run(`P.depth=0;P.x=6;P.y=6;P.dir=2;`);     // south, into open street
  const before=r.run('P.y');
  r.run('step()');
  assert.equal(+r.run('P.y'),before+1);
  r.run(`P.x=1;P.y=1;P.dir=3;`);               // west, into the town wall
  r.run('step()');
  assert.equal(+r.run('P.x'),1,'walked through the town wall');
});

test('a spinner turns you and a teleporter moves you', ()=>{
  const r=withParty(runtime());
  const spin=r.j(`(function(){for(var y=0;y<SIZE;y++)for(var x=0;x<SIZE;x++)
    if(LEVELS[1].grid[y][x]==='S')return[x,y];return null;})()`);
  assert.ok(spin,'level one has no spinner on it');
  let turned=false;
  for(let i=0;i<40&&!turned;i++){
    r.run(`P.depth=1;P.x=${spin[0]};P.y=${spin[1]};P.dir=0;square('S');`);
    if(+r.run('P.dir')!==0)turned=true;
  }
  assert.ok(turned,'the spinner never turned anybody');
  r.run(`P.depth=2;P.x=1;P.y=1;square('X');`);
  assert.ok(+r.run('P.x')!==1||+r.run('P.y')!==1,'the teleporter left you where you were');
});

test('a strongbox pays once and then it is empty', ()=>{
  const r=withParty(runtime());
  r.run(`P.depth=1;P.x=5;P.y=5;P.gold=0;P.found={};square('$');`);
  const first=+r.run('P.gold');
  assert.ok(first>0,'the box was empty the first time');
  r.run(`square('$');`);
  assert.equal(+r.run('P.gold'),first,'it paid out twice');
});

test('light burns down a step at a time underground, and not in the street', ()=>{
  const r=withParty(runtime());
  r.run(`P.depth=1;P.light=10;tick(3);`);
  assert.equal(+r.run('P.light'),7);
  r.run(`P.depth=0;P.light=10;tick(3);`);
  assert.equal(+r.run('P.light'),10,'a torch burned in the open street');
});

test('a dark square puts your light out', ()=>{
  const r=withParty(runtime());
  r.run(`P.depth=1;P.light=99;square('D');`);
  assert.equal(+r.run('P.light'),0);
  assert.equal(r.run('String(lit())'),'false');
});
