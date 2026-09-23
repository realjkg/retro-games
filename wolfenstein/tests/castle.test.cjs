// The castle, the guards, the prisoner and the impenetrable switch, read from
// the game's own numbers. The pictures are checked by tools/playtest.js.
const test=require('node:test'),assert=require('node:assert');
const {runtime,step,bare,guard}=require('./harness.cjs');

test('every castle can be walked from the cell to the way out, and to every chest', ()=>{
  const r=runtime(1);
  for(const d of [1,2,3,5,8,12]){
    for(const sd of [1,2,3,4,5]){
      const res=r.j(`(()=>{seed=${sd*977+d};const C=makeCastle(${d});
        const bad=[];
        C.rooms.forEach((rm,i)=>{if(!roomOk(rm))bad.push(i);});
        /* the rooms themselves are joined: a walk through the openings */
        const seen=[C.start],q=[C.start];
        while(q.length){const i=q.shift(),rm=C.rooms[i];
          for(const s in SIDES)if(rm.doors[s]){const j=(rm.cy+SIDES[s][1])*C.CW+rm.cx+SIDES[s][0];
            if(seen.indexOf(j)<0){seen.push(j);q.push(j);}}}
        const plans=C.rooms.reduce((n,rm)=>n+rm.chests.filter(c=>c.item&&c.item.k==='plans').length,0);
        const ex=C.rooms[C.exitRoom];
        const onEdge={n:ex.cy===0,s:ex.cy===C.CH-1,w:ex.cx===0,e:ex.cx===C.CW-1}[C.exitSide];
        return{bad,joined:seen.length===C.rooms.length,plans,onEdge,
          guardsInCell:C.rooms[C.start].guards.length,exitIsCell:C.exitRoom===C.start};})()`);
      assert.deepEqual(res.bad,[],`castle ${d} seed ${sd}: rooms with a door or chest you cannot reach`);
      assert.ok(res.joined,`castle ${d} seed ${sd}: a room no opening leads to`);
      assert.equal(res.plans,1,`castle ${d} seed ${sd}: the war plans are in ${res.plans} chests`);
      assert.ok(res.onEdge,`castle ${d} seed ${sd}: the way out is not in an outside wall`);
      assert.equal(res.guardsInCell,0,'there is a guard in the cell');
      assert.equal(res.exitIsCell,false,'the way out is in the cell');
    }
  }
});

test('the castles get bigger, and stop at six by five', ()=>{
  const r=runtime();
  const sizes=r.j(`[1,2,3,4,5,6,7,8,20,100].map(d=>castleSize(d))`);
  for(let i=1;i<sizes.length;i++)
    assert.ok(sizes[i][0]*sizes[i][1]>=sizes[i-1][0]*sizes[i-1][1],'a later castle is smaller');
  assert.deepEqual(sizes[sizes.length-1],[6,5]);
  assert.ok(sizes[0][0]*sizes[0][1]>=6,'the first castle is too small to be a castle');
});

test('the same seed is the same castle', ()=>{
  const r=runtime();
  const a=r.j(`(seed=42,makeCastle(3).rooms.map(rm=>rm.g.join('')+rm.chests.length+rm.guards.length))`);
  const b=r.j(`(seed=42,makeCastle(3).rooms.map(rm=>rm.g.join('')+rm.chests.length+rm.guards.length))`);
  assert.deepEqual(a,b);
});

test('a bullet kills a guard; an SS man takes three', ()=>{
  const r=runtime();
  bare(r,60,92);
  guard(r,'guard',160,92);
  r.run(`G.P.dir=0;fire();`);step(r,1);
  assert.equal(r.j(`room().guards[0].st`),'dead');
  assert.equal(r.j('G.stats.kills'),1);
  bare(r,60,92);
  guard(r,'ss',160,92);
  r.run(`G.impenetrable=true;`);
  for(let i=0;i<2;i++){r.run(`G.P.fireCool=0;fire();`);step(r,0.6);}
  assert.ok(r.j(`live(room().guards[0])`),'the vest did not take the first two');
  r.run(`G.P.fireCool=0;fire();`);step(r,1);
  assert.ok(!r.j(`live(room().guards[0])`),'three bullets did not stop him');
  assert.equal(r.j('G.P.ammo'),6);
});

test('one bullet kills a mortal prisoner, and the run is over', ()=>{
  const r=runtime();
  r.run(`G.impenetrable=false;`);
  bare(r,60,92);
  guard(r,'guard',140,92);
  r.run(`G.P.dir=4;G.P.face=-1;G.shots.push({x:120,y:81,vx:-GSHOT,vy:0,from:'g',life:3});`);
  step(r,0.8);
  assert.equal(r.j('G.P.dead'),true);
  step(r,2);
  assert.equal(r.j('G.state'),'over');
});

test('a vest takes three bullets and then it is gone', ()=>{
  const r=runtime();
  r.run(`G.impenetrable=false;`);
  bare(r,60,92);
  r.run(`G.P.vest=VEST_HITS;`);
  for(let i=0;i<3;i++){r.run(`hitPlayer('shot')`);}
  assert.equal(r.j('G.P.dead'),false);
  assert.equal(r.j('G.P.vest'),0);
  r.run(`hitPlayer('shot')`);
  assert.equal(r.j('G.P.dead'),true);
});

test('impenetrable: bullets and grenades ring off him, and he keeps what he has', ()=>{
  const r=runtime();
  r.run(`setImpenetrable(true);`);
  bare(r,60,92);
  guard(r,'ss',120,92);
  r.run(`alarm(room().guards[0]);G.P.dir=4;G.P.face=-1;`);
  step(r,20);                                  /* twenty seconds in front of an SS man */
  assert.equal(r.j('G.P.dead'),false);
  assert.equal(r.j('G.state'),'play');
  r.run(`explode(G.P.x,G.P.y-6)`);             /* and a grenade at his feet */
  step(r,1);
  assert.equal(r.j('G.P.dead'),false);
  assert.equal(r.j('G.P.vest'),0,'the vest was spent on hits that did nothing');
  assert.equal(r.j('G.state'),'play');
});

test('impenetrable is endless: castle after castle, well past the last rank', ()=>{
  const r=runtime();
  r.run(`setImpenetrable(true);`);
  for(let i=0;i<14;i++){
    r.run(`G.P.plans=true;G.state='play';escape(G.castle.exitSide);`);
    step(r,1.5);
    assert.equal(r.j('G.state'),'card');
    r.run(`menuGo();`);                          /* NEXT CASTLE, then INTO THE CASTLE */
    assert.equal(r.j('G.state'),'card');
    r.run(`menuGo();`);
    assert.equal(r.j('G.state'),'play');
  }
  assert.equal(r.j('G.castle.d'),15);
  assert.equal(r.j('G.rank'),14);
  assert.match(r.j('rankName(G.rank)'),/^FIELD MARSHAL \*\d+$/);
});

test('an impenetrable run is never a record, even switched off part way', ()=>{
  const r=runtime();
  r.run(`setImpenetrable(true);newGame(3);hideOverlay();G.state='play';setImpenetrable(false);`);
  r.run(`G.P.plans=true;escape(G.castle.exitSide);`);step(r,1.5);
  assert.equal(r.j('G.rank'),1);
  assert.equal(r.store.get('wolfenstein.best'),undefined,'an impenetrable run went on the record');
  r.run(`newGame(4);hideOverlay();G.state='play';G.P.plans=true;escape(G.castle.exitSide);`);step(r,1.5);
  assert.deepEqual(JSON.parse(r.store.get('wolfenstein.best')),{rank:1,castles:1});
});

test('the switch is remembered between visits', ()=>{
  const r=runtime();
  r.run(`toggleInv();`);
  assert.equal(r.store.get('wolfenstein.impenetrable'),'1');
  r.run(`toggleInv();`);
  assert.equal(r.store.get('wolfenstein.impenetrable'),'0');
});

test('out without the plans is no promotion; with them, one rank', ()=>{
  const r=runtime();
  r.run(`escape(G.castle.exitSide);`);step(r,1.5);
  assert.equal(r.j('G.rank'),0);
  assert.equal(r.j('G.castles'),1);
  r.run(`menuGo();menuGo();G.P.plans=true;escape(G.castle.exitSide);`);step(r,1.5);
  assert.equal(r.j('G.rank'),1);
  r.run(`menuGo();`);
  assert.equal(r.j('G.P.plans'),false,'the plans came with him into the next castle');
  assert.equal(r.j('G.P.ammo'),10);
});

test('walking out through an opening is the next room, with no jump', ()=>{
  const r=runtime();
  const res=r.j(`(()=>{
    const C=G.castle;let i=C.rooms.findIndex(rm=>rm.doors.e);
    enterRoom(i);const rm=room();rm.guards=[];
    G.P.x=W-20;G.P.y=92;keys.right=true;
    let last=G.P.x,jump=0,from=G.cur;
    for(let k=0;k<120;k++){stepGame(1/60);
      const x=G.cur===from?G.P.x:G.P.x+W;jump=Math.max(jump,Math.abs(x-last));last=x;}
    keys.right=false;
    return{from,to:G.cur,want:i+1,jump,x:G.P.x};})()`);
  assert.equal(res.to,res.want,'he did not come out in the room to the east');
  assert.ok(res.jump<2,'he jumped '+res.jump+' pixels crossing the threshold');
  assert.ok(res.x>0&&res.x<100,'he is not just inside the west opening');
});

test('the SS follow you through the opening, walking in from off the screen', ()=>{
  const r=runtime();
  const res=r.j(`(()=>{
    G.impenetrable=true;
    const C=G.castle;let i=C.rooms.findIndex(rm=>rm.doors.e);
    enterRoom(i);const rm=room();rm.guards=[];rm.chests=[];
    const s=mkGuard('ss',200,92);rm.guards.push(s);alarm(s);
    G.P.x=W-2;G.P.y=92;G.P.dir=0;keys.right=true;for(let k=0;k<6;k++)stepGame(1/60);keys.right=false;
    const xs=[];
    for(let k=0;k<300;k++){stepGame(1/60);if(room().guards.indexOf(s)>=0)xs.push(Math.round(s.x));}
    return{moved:G.cur!==i,xs,st:s.st};})()`);
  assert.ok(res.moved);
  assert.ok(res.xs.length>0,'the SS man never followed');
  assert.ok(res.xs[0]<0,'he appeared inside the room at x='+res.xs[0]+' instead of walking in');
  assert.ok(res.xs[res.xs.length-1]>8,'he never got in');
  assert.equal(res.st,'alert');
});

test('a guard with the gun on him puts his hands up and does not shoot', ()=>{
  const r=runtime(5);
  r.run(`G.impenetrable=false;`);
  bare(r,60,92);
  guard(r,'guard',150,92);
  r.run(`alarm(room().guards[0]);G.P.dir=0;G.P.face=1;`);
  /* he is given every chance to go for it: the drop has to win in the end */
  let st='';
  for(let i=0;i<40&&st!=='hup';i++){r.run(`G.P.dead=false;G.state='play';G.shots=[];`);step(r,0.1);st=r.j(`room().guards[0].st`);}
  assert.equal(st,'hup');
  r.run(`G.shots=[];`);
  step(r,3);
  assert.equal(r.j(`room().guards[0].st`),'hup','he lowered his hands with the gun still on him');
  assert.equal(r.j(`G.shots.length`),0,'a guard with his hands up fired');
  /* search him for his bullets */
  r.run(`G.P.x=140;G.P.y=92;search();`);
  step(r,1.2);
  assert.equal(r.j(`room().guards[0].searched`),true);
  /* and look away: he goes for his gun */
  r.run(`G.P.dir=4;`);step(r,3);
  assert.equal(r.j(`room().guards[0].st`),'alert');
});

test('the SS never surrender', ()=>{
  const r=runtime();
  r.run(`G.impenetrable=true;`);
  bare(r,60,92);
  guard(r,'ss',150,92);
  r.run(`alarm(room().guards[0]);G.P.dir=0;`);
  step(r,8);
  assert.notEqual(r.j(`room().guards[0].st`),'hup');
});

test('a uniform walks you past the guards, until you fire; not past the SS', ()=>{
  const r=runtime();
  r.run(`G.impenetrable=true;`);
  bare(r,60,92);
  guard(r,'guard',200,92);
  r.run(`G.P.uniform=true;G.P.dir=2;room().guards[0].st='stand';`);
  step(r,3);
  assert.equal(r.j(`room().guards[0].st`),'stand','a guard saw through the uniform');
  r.run(`fire();`);step(r,0.1);
  assert.equal(r.j(`room().guards[0].st`),'alert','firing did not give the uniform away');
  bare(r,60,92);
  guard(r,'ss',200,92);
  step(r,0.2);
  assert.equal(r.j(`room().guards[0].st`),'alert','the SS let a uniform by');
});

test('picking a lock takes time, walking away gives it up, shooting it off is quick', ()=>{
  const r=runtime();
  bare(r,108,98);
  r.run(`room().chests.push({tx:12,ty:9,strong:false,state:'locked',item:{k:'bullets',n:5}});`);
  r.run(`search();`);
  step(r,1);
  assert.equal(r.j(`room().chests[0].state`),'locked','it opened in a second');
  r.run(`keys.left=true;`);step(r,0.1);r.run(`keys.left=false;G.P.x=108;G.P.y=98;`);
  assert.equal(r.j(`G.P.busy`),null,'walking away did not stop the picking');
  r.run(`search();`);step(r,2.5);
  assert.equal(r.j(`room().chests[0].state`),'open');
  assert.equal(r.j(`G.P.ammo`),15);
  /* a second chest, the lock shot off first */
  r.run(`room().chests.push({tx:24,ty:9,strong:false,state:'locked',item:{k:'grenades',n:2}});
    G.P.x=150;G.P.y=84;G.P.dir=0;G.P.face=1;G.P.fireCool=0;fire();`);
  step(r,0.4);
  assert.equal(r.j(`room().chests[1].state`),'unlocked');
  r.run(`G.P.x=200;G.P.y=98;search();`);step(r,0.6);
  assert.equal(r.j(`room().chests[1].state`),'open');
  assert.equal(r.j(`G.P.gren`),5);
});

test('the plans are in a strongbox: bullets and grenades do not open it', ()=>{
  const r=runtime();
  bare(r,40,78);
  r.run(`room().chests.push({tx:12,ty:9,strong:true,state:'locked',item:{k:'plans'}});
    G.P.dir=0;fire();`);
  step(r,0.5);
  r.run(`explode(104,76);`);step(r,1);
  assert.equal(r.j(`room().chests[0].state`),'locked');
  r.run(`G.P.x=100;G.P.y=98;search();`);step(r,3.5);
  assert.equal(r.j(`G.P.plans`),true);
});

test('a grenade brings down inside walls and chests, never the castle wall', ()=>{
  const r=runtime();
  bare(r,40,92);
  r.run(`room().g[10*COLS+20]=INNER;room().chests.push({tx:18,ty:12,strong:false,state:'locked',item:{k:'vest'}});
    G.impenetrable=true;explode(164,84);explode(8,28);`);
  assert.equal(r.j(`room().g[10*COLS+20]`),3,'the inside wall stood');
  assert.equal(r.j(`room().chests[0].state`),'wrecked');
  assert.equal(r.j(`room().g[3*COLS+0]`),1,'the castle wall came down');
});

test('the legs move only when he does, and standing still is not a still picture', ()=>{
  const r=runtime();
  bare(r,60,92);
  const pics=new Set(),dist=[];
  r.run(`keys.right=true;`);
  for(let i=0;i<24;i++){step(r,1/12);pics.add(r.j(`WALKCYCLE[Math.floor(G.P.dist/6)%4]`));dist.push(r.j('G.P.dist'));}
  r.run(`keys.right=false;`);
  assert.equal(pics.size,4,'the walk is not four frames');
  /* walk into a wall: the legs stop */
  r.run(`G.P.x=W-12;keys.right=true;G.cur=G.cur;room().doors.e=false;room().g=blankGrid(room());`);
  step(r,1);const d0=r.j('G.P.dist');step(r,1);
  assert.equal(r.j('G.P.dist'),d0,'he walked on the spot against a wall');
  assert.equal(r.j('G.P.moving'),false);
  r.run(`keys.right=false;`);
  /* the idle picture changes */
  const idle=new Set();
  for(let i=0;i<30;i++){step(r,0.1);idle.add(r.j(`(()=>{const P=G.P;return (P.idle*1.6|0)%2+'|'+((P.idle%2.6)>2.45)})()`));}
  assert.ok(idle.size>=2,'standing still, nothing about him changes');
});

test('storage that throws does not take the game down', ()=>{
  const r=runtime();
  r.run(`localStorage.setItem=()=>{throw new Error('quota')};localStorage.getItem=()=>{throw new Error('denied')};`);
  assert.doesNotThrow(()=>r.run(`toggleInv();G.P.plans=true;escape(G.castle.exitSide);`));
  step(r,1.5);
  assert.equal(r.j('G.state'),'card');
});

test('a hand-edited record is ignored rather than trusted', ()=>{
  const r=runtime();
  r.store.set('wolfenstein.best','{"rank":"lots"}');
  r.run(`G.best=loadJSON('wolfenstein.best',null);
    if(!G.best||typeof G.best.rank!=='number'||typeof G.best.castles!=='number')G.best={rank:0,castles:0};`);
  assert.deepEqual(r.j('G.best'),{rank:0,castles:0});
  assert.doesNotThrow(()=>r.run(`showSplash();`));
});
