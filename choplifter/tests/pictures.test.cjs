// The pictures, read straight out of the page. These cannot see the screen
// either - tools/playtest.js does that - but a picture that is not a rectangle,
// or that is the same picture twice, is wrong before it is ever drawn.
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {maps,source}=require('./harness.cjs');

const chop=n=>maps('CHOP'+n);
const CHOPS=[chop(0),chop(1),chop(2),chop(3)];
const rect=m=>m.every(r=>r.length===m[0].length);
const ink=(m,f)=>m.reduce((n,r)=>n+[...r].filter(c=>f?f(c):c!=='.').length,0);
const flip=m=>m.map(r=>[...r].reverse().join(''));
// How many separate things a picture is made of, counting only the ones big
// enough to be a part of her rather than a stray pixel of the baking.
function pieces(m,least){
  const R=m.length,C=m[0].length,seen=Array.from({length:R},()=>new Array(C).fill(false));
  let n=0;
  for(let y=0;y<R;y++)for(let x=0;x<C;x++){
    if(m[y][x]==='.'||seen[y][x])continue;
    const st=[[x,y]];let size=0;
    while(st.length){
      const [a,b]=st.pop();
      if(a<0||b<0||a>=C||b>=R||seen[b][a]||m[b][a]==='.')continue;
      seen[b][a]=true;size++;
      st.push([a-1,b]);st.push([a+1,b]);st.push([a,b-1]);st.push([a,b+1]);
    }
    if(size>=(least||1))n++;
  }
  return n;
}
// The ground shut inside a figure: transparent cells that cannot be reached
// from outside it. The skids are not inside her, so their rows are not looked at.
function trapped(m,rows){
  const R=rows||m.length, C=m[0].length;
  const seen=Array.from({length:R},()=>new Array(C).fill(false));
  const st=[];
  for(let x=0;x<C;x++){st.push([x,0]);st.push([x,R-1]);}
  for(let y=0;y<R;y++){st.push([0,y]);st.push([C-1,y]);}
  while(st.length){
    const [x,y]=st.pop();
    if(x<0||y<0||x>=C||y>=R||seen[y][x]||m[y][x]!=='.')continue;
    seen[y][x]=true;
    st.push([x-1,y]);st.push([x+1,y]);st.push([x,y-1]);st.push([x,y+1]);
  }
  let n=0;
  for(let y=0;y<R;y++)for(let x=0;x<C;x++)if(m[y][x]==='.'&&!seen[y][x])n++;
  return n;
}

test('Every picture of the chopper is the same rectangle',()=>{
  for(let i=0;i<4;i++){
    assert.ok(rect(CHOPS[i]),'CHOP'+i+' is a rectangle');
    assert.equal(CHOPS[i].length,12,'CHOP'+i+' is twelve rows');
    assert.equal(CHOPS[i][0].length,28,'CHOP'+i+' is twenty-eight wide');
  }
  assert.equal(source.includes('const CHOP_W=28, CHOP_H=12;'),true,
    'and the game is told the same size the pictures are');
});

test('The four are four pictures, not one picture four times',()=>{
  const seen=new Set(CHOPS.map(m=>m.join('\n')));
  assert.equal(seen.size,4,'no two frames of the turn are the same drawing');
  // And they are a turn: the further round she is, the more tail there is.
  const tail=m=>ink(m.map(r=>r.slice(0,9)));
  const t=CHOPS.map(tail);
  for(let i=1;i<4;i++)
    assert.ok(t[i]>=t[i-1],'the boom comes out as she turns ('+t.join(' < ')+')');
  assert.ok(t[3]>t[0]+10,'and by the profile there is a boom to see');
  assert.ok(ink(CHOPS[3])>ink(CHOPS[0])*1.8,'and there is twice as much of her to see');
});

test('Nose-on is the only one that is its own mirror',()=>{
  assert.equal(CHOPS[0].join('\n'),flip(CHOPS[0]).join('\n'),
    'looking down the barrel, both sides are the same side');
  for(let i=1;i<4;i++)
    assert.notEqual(CHOPS[i].join('\n'),flip(CHOPS[i]).join('\n'),
      'CHOP'+i+' has a nose and a tail, and they are not the same end');
});

test('Nothing in the turn loses the glass, the skids or its weight',()=>{
  for(let i=0;i<4;i++){
    assert.ok(ink(CHOPS[i],c=>c==='C')>=6,'CHOP'+i+' still has a canopy');
    assert.ok(ink(CHOPS[i],c=>c==='O')>=8,'CHOP'+i+' still has skids under it');
    // Nose-on weighs least - you are looking at the front of her and there is
    // no boom in sight - so the floor is what a machine weighs, not what the
    // profile does.
    assert.ok(ink(CHOPS[i])>=70,'CHOP'+i+' is a machine, not a stump ('+ink(CHOPS[i])+')');
    // Turning a picture over must not cost it a pixel.
    assert.equal(ink(flip(CHOPS[i])),ink(CHOPS[i]));
  }
});

test('No sky is shut inside her',()=>{
  // The slot of daylight down the length of an arm is what made every caller in
  // Law of the West read as sticks leaned against a coat. Between the skids is
  // not inside her, so rows ten and eleven are not counted.
  for(let i=0;i<4;i++)
    assert.equal(trapped(CHOPS[i],10),0,'CHOP'+i+' has no trapped sky above the skids');
});

test('Every letter drawn has a colour, and every colour is drawn',()=>{
  const pal=n=>{const m=source.match(new RegExp('const '+n+'=\\{([\\s\\S]*?)\\};'));
    return new Set([...m[1].matchAll(/([A-Za-z])\s*:\s*"#/g)].map(x=>x[1]));};
  const used=ms=>new Set(ms.flat().flatMap(r=>[...r]).filter(c=>c!=='.'));
  const pairs=[['CHOP_PAL',CHOPS],['HOST_PAL',[maps('HOST_WALK'),maps('HOST_WAVE'),maps('HOST_DUCK')]],
    ['TANK_PAL',[maps('TANK_PIX')]],['JET_PAL',[maps('JET_PIX')]],['DRONE_PAL',[maps('DRONE_PIX')]]];
  for(const [name,ms] of pairs){
    const p=pal(name), u=used(ms);
    for(const c of u)assert.ok(p.has(c),name+' has no colour for "'+c+'"');
    for(const c of p)assert.ok(u.has(c),name+' carries "'+c+'" that nothing draws');
  }
});

test('The rotor has a hub over every picture, and a tail rotor where one shows',()=>{
  const rotor=source.match(/const ROTOR=\[([\s\S]*?)\];/)[1];
  assert.equal((rotor.match(/hx:/g)||[]).length,4,'one hub per drawn picture');
  const tail=source.match(/const TAIL_ROTOR=\[([\s\S]*?)\];/)[1];
  assert.equal(tail.split(',')[0].trim(),'null','nose-on you cannot see the tail rotor');
  assert.ok(/\{x:/.test(tail),'and in profile you can');
  // The disc is a horizontal circle and the eye is at its height, so it is the
  // same flat ellipse whichever way her nose is pointing. Drawing it opening
  // out as she came round put a lasso round her on the screen.
  const one=n=>{const v=[...rotor.matchAll(new RegExp(n+':([A-Za-z_.\\d]+)','g'))].map(m=>m[1]);
    assert.equal(v.length,4,'one '+n+' per drawn picture');
    return new Set(v);};
  assert.equal(one('tilt').size,1,'the disc does not change shape when she yaws');
  assert.equal(one('r').size,1,'nor size');
  // The hub does move, because the cabin under it does.
  const hx=[...rotor.matchAll(/hx:(\d+)/g)].map(m=>+m[1]);
  assert.ok(hx[3]>hx[0],'the mast follows the cabin round ('+hx+')');
});

test('The walk is four pictures, and the passing frames are not the striding ones',()=>{
  const w=maps('HOST_WALK');
  assert.equal(w.length,36,'four frames of nine rows');
  assert.ok(rect(w),'and all of them seven wide');
  const f=[0,1,2,3].map(i=>w.slice(i*9,i*9+9));
  assert.equal(new Set(f.map(m=>m.join('\n'))).size,4,'four different drawings');
  // The legs are the test of a gait: apart on the strides, together on the passes.
  const legs=m=>m.slice(6).join('');
  const spread=m=>{const rows=m.slice(6).map(r=>{const on=[...r].map((c,i)=>c!=='.'?i:-1)
     .filter(i=>i>=0);return on.length?on[on.length-1]-on[0]:0;});
   return Math.max(...rows);};
  assert.ok(spread(f[0])>spread(f[1]),'frame one closes the legs frame nought had open');
  assert.ok(spread(f[2])>spread(f[3]),'and frame three closes what frame two opened');
  assert.notEqual(legs(f[1]),legs(f[3]),'the two passing frames bring different knees through');
  // And the passing frames ride a pixel high, which is the bob in a walk.
  const bob=source.match(/const HOST_BOB=\[([^\]]*)\]/)[1].split(',').map(Number);
  assert.deepEqual(bob,[0,-1,0,-1]);
});

test('Waving is not standing, and ducking is not either',()=>{
  const wv=maps('HOST_WAVE'), dk=maps('HOST_DUCK'), wk=maps('HOST_WALK');
  assert.ok(rect(wv)&&rect(dk));
  const a=wv.slice(0,9).join('\n'), b=wv.slice(9,18).join('\n');
  assert.notEqual(a,b,'the two waves are two pictures');
  assert.notEqual(a,wk.slice(0,9).join('\n'),'and neither is the walk standing still');
  // Arms up: the wave puts ink in the outside columns of the top rows, the
  // walk does not.
  const shoulders=m=>m.slice(0,2).reduce((n,r)=>n+(r[0]!=='.'?1:0)+(r[6]!=='.'?1:0),0);
  assert.ok(shoulders(wv.slice(0,9))>shoulders(wk.slice(0,9)),'a wave is arms up');
  // Ducking is lower: his head is further down the picture than when he stands.
  const head=m=>m.findIndex(r=>r.includes('H'));
  assert.ok(head(dk.slice(0,9))>head(wk.slice(0,9)),'flat on the sand is lower than upright');
});

test('Everything else the Empire owns is a rectangle too',()=>{
  for(const [n,w,h] of [['TANK_PIX',14,6],['JET_PIX',16,5],['DRONE_PIX',7,7]]){
    const m=maps(n);
    assert.ok(rect(m),n+' is a rectangle');
    assert.equal(m[0].length,w);assert.equal(m.length,h);
  }
  // The tank has two treads so that a tank on the screen is a tank moving.
  const t=source.match(/const TANK_TREADS=\[([\s\S]*?)\];/)[1];
  const rows=(t.match(/"[^"]*"/g)||[]).map(x=>x.slice(1,-1));
  assert.equal(rows.length,2);
  assert.notEqual(rows[0],rows[1],'and the two are not the same row twice');
  assert.equal(rows[0].length,14);assert.equal(rows[1].length,14);
});

/* ---- the leaning pictures ---- *
 * These are not drawn by hand, they are baked from the drawn ones when the
 * page loads, so what is checked here is that the baking keeps a machine.
 * None of it can see the screen: tools/playtest.js measures whether the
 * painted picture actually has one end lower than the other.
 */
const {runtime}=require('./harness.cjs');

test('Every leaning picture is still the machine, and still one piece',()=>{
  const r=runtime(2,3);
  const steps=r.run('LEAN_SHAPES.steps');
  assert.ok(steps>=3,'she leans through enough pictures to be a lean: '+steps);
  const shapes=JSON.parse(r.run('JSON.stringify(LEAN_SHAPES.out)'));
  assert.equal(shapes.length,4,'one bank of them per drawn frame');
  for(let f=0;f<shapes.length;f++){
    const level=ink(CHOPS[f],c=>c!=='.'&&c!=='O');  // the rails are drawn, not baked
    for(let n=0;n<shapes[f].length;n++){
      const g=shapes[f][n];
      if(n===steps){assert.equal(g,null,'level is the drawn machine itself');continue;}
      assert.ok(Array.isArray(g)&&g.length,'a picture for every angle she leans to');
      assert.ok(rect(g),'and it is a rectangle');
      assert.equal(ink(g,c=>c==='O'),0,'with no rails baked into it');
      assert.ok(ink(g,c=>c==='C')>0,'her glass is still in it');
      // Turning her must not cost her: a machine that loses a fifth of itself
      // on the way round is not leaning, it is dissolving.
      const got=ink(g);
      assert.ok(got>=level*0.88,'frame '+f+' at step '+(n-steps)+' kept '+got+' of '+level);
      assert.ok(got<=level*1.3,'and did not swell: '+got+' of '+level);
      // And it is one machine, not a shower of pieces. The tail boom of the
      // profile frames is joined to the cabin by two rows, so six pixels is
      // the smallest thing that counts as a piece of her.
      assert.equal(pieces(g,6),1,'frame '+f+' at step '+(n-steps)+' is in pieces');
    }
  }
});

test('She leans further one way than the other, and least of all nose-on',()=>{
  const r=runtime(2,4);
  assert.ok(r.run('LEAN_DIVE')>r.run('LEAN_CLIMB'),'a dive is steeper than being dragged');
  assert.ok(r.run('LEAN_CLIMB')>0);
  assert.ok(r.run('LEAN_ROLL')<r.run('LEAN_DIVE'),'and a roll is the smallest of the three');
  // Every angle she can reach has a picture baked for it, both ways.
  const steps=r.run('LEAN_SHAPES.steps'), step=r.run('LEAN_STEP');
  assert.ok(steps*step>=r.run('LEAN_DIVE')-1e-9,'the bank covers the whole of a dive');
  assert.equal(r.run('LEAN_SHAPES.out[3].length'),steps*2+1,'and covers it either way');
});
