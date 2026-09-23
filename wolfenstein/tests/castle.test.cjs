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
  r.run(`G.impenetrable=false;G.P.grazed=true;`);
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
  r.run(`G.impenetrable=false;G.P.grazed=true;`);
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
  r.run(`G.P.x=room().guards[0].x-10;G.P.y=room().guards[0].y;search();`);
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

test('in a uniform you blend in, with the guards and the SS alike, until you fire', ()=>{
  const r=runtime();
  r.run(`G.impenetrable=true;`);
  bare(r,60,92);
  guard(r,'guard',200,92);guard(r,'ss',200,40);
  r.run(`G.P.uniform=true;G.P.dir=2;room().guards.forEach(g=>g.st='stand');`);
  step(r,4);
  assert.deepEqual(r.j(`room().guards.map(g=>g.st)`),['stand','stand'],'someone saw through the uniform at a distance');
  assert.equal(r.j('G.hunt.on'),false);
  r.run(`fire();`);step(r,0.1);
  assert.deepEqual(r.j(`room().guards.map(g=>g.st)`),['alert','alert'],'firing did not give the uniform away');
  assert.equal(r.j('G.hunt.on'),true,'an SS man saw a spy and raised no alarm');
});

test('in uniform, come close and you are stopped and questioned in German', ()=>{
  const r=runtime();
  r.run(`G.impenetrable=true;`);
  bare(r,100,92);
  guard(r,'ss',130,92);
  r.run(`G.P.uniform=true;G.P.holstered=true;G.P.dir=2;`);
  step(r,1.5);
  assert.equal(r.j('G.state'),'question','he walked right up to an SS man and was not stopped');
  const q=r.j('G.q.cur.q');
  assert.ok(q.de&&q.en,'a question with no German or no English');
  assert.equal(r.j('G.q.cur.a.length'),3,'not three answers to choose from');
  /* the world waits while he is questioned */
  const x=r.j('room().guards[0].x');step(r,1);
  assert.equal(r.j('room().guards[0].x'),x);
});

test('the right answers and he waves you on, and does not stop you again', ()=>{
  const r=runtime();
  r.run(`G.impenetrable=true;`);
  bare(r,100,92);guard(r,'ss',130,92);
  r.run(`G.P.uniform=true;G.P.holstered=true;G.P.papers=true;G.P.dir=2;`);
  step(r,1.5);
  let n=0;
  while(r.j('G.state')==='question'&&n++<6)
    r.run(`answer(G.q.cur.a.findIndex(o=>o[2]==='good'||o[2]==='holster'))`);
  assert.equal(r.j('G.state'),'play');
  assert.equal(r.j('room().guards[0].cleared'),true);
  assert.equal(r.j('G.hunt.on'),false,'right answers raised the alarm');
  step(r,5);
  assert.equal(r.j('G.state'),'play','he was stopped again by a man who had passed him');
});

test('two wrong answers and you are a spy; hesitating counts as wrong', ()=>{
  const r=runtime();
  r.run(`G.impenetrable=true;`);
  bare(r,100,92);guard(r,'ss',130,92);
  r.run(`G.P.uniform=true;G.P.holstered=true;G.P.dir=2;`);
  step(r,1.5);
  r.run(`answer(G.q.cur.a.findIndex(o=>o[2]==='bad'))`);
  assert.equal(r.j('G.state'),'question','one wrong answer ended it');
  const left=r.j('G.q.t');
  step(r,left+0.1);                       /* and then say nothing at all */
  assert.equal(r.j('G.state'),'play');
  assert.equal(r.j('room().blown'),true);
  assert.equal(r.j('room().guards[0].st'),'alert');
  assert.equal(r.j('G.hunt.on'),true);
  assert.equal(r.j('room().guards[0].say.text'),'SPION! ALARM!');
});

test('with the gun out he asks about the gun first, and saying sorry holsters it', ()=>{
  const r=runtime();
  r.run(`G.impenetrable=true;`);
  bare(r,100,92);guard(r,'ss',140,92);
  r.run(`G.P.uniform=true;G.P.holstered=false;G.P.dir=2;`);
  step(r,1);
  assert.equal(r.j('G.state'),'question','the gun did not hurry him');
  assert.equal(r.j('G.q.cur.key'),'gun');
  r.run(`answer(G.q.cur.a.findIndex(o=>o[2]==='holster'))`);
  assert.equal(r.j('G.P.holstered'),true);
});

test('what they ask builds up: easy in the first castle, the password and the commandant later', ()=>{
  const r=runtime();
  const asked=d=>r.j(`(()=>{startCastle(${d});hideOverlay();G.state='play';const o={};
    for(let i=0;i<60;i++){G.P.holstered=true;for(const k of questionPlan(mkGuard('ss',0,0)))o[k]=1;
      for(const k of questionPlan(mkGuard('guard',0,0)))o[k]=1;}return Object.keys(o).sort();})()`);
  const one=asked(1),five=asked(5);
  assert.deepEqual(one,['accent','unit','where'],'the first castle asks '+one);
  assert.ok(five.includes('parole')&&five.includes('chief')&&five.includes('papers'),'castle five asks only '+five);
  const n=r.j(`[1,4,6].map(d=>{startCastle(d);G.P.holstered=true;return questionPlan(mkGuard('ss',0,0)).length;})`);
  assert.deepEqual(n,[1,2,3],'the SS do not ask more as the castles go on');
});

test('the password question has the castle\'s password among its answers, and the notebook has it once found', ()=>{
  const r=runtime();
  r.run(`startCastle(4);hideOverlay();G.state='play';G.impenetrable=true;`);
  bare(r,100,92);
  const res=r.j(`(()=>{const a=QUESTIONS.parole.a();return{a:a.map(o=>o[0]),good:a.filter(o=>o[2]==='good').map(o=>o[0]),p:G.castle.parole};})()`);
  assert.equal(res.good.length,1);
  assert.equal(res.good[0],res.p+'.');
  r.run(`give({k:'note',what:'parole'})`);
  assert.equal(r.j('G.P.knows.parole'),true);
  assert.match(r.j('notebookHtml()'),new RegExp(res.p));
});

test('in uniform the guards let slip the password and the commandant\'s name', ()=>{
  const r=runtime();
  r.run(`startCastle(4);hideOverlay();G.state='play';G.impenetrable=true;`);
  bare(r,100,92);
  guard(r,'guard',150,92);
  r.run(`G.P.uniform=true;G.P.holstered=true;room().guards[0].cleared=true;G.P.dir=2;`);
  let t=0;
  while(t<240&&!(r.j('G.P.knows.parole')&&r.j('G.P.knows.chief'))){step(r,1);t++;}
  assert.ok(r.j('G.P.knows.parole'),'never overheard the password in '+t+'s');
  assert.ok(r.j('G.P.knows.chief'),'never overheard the commandant in '+t+'s');
});

test('the uniform is always close: in the cell in castle one, next door after', ()=>{
  const r=runtime();
  for(const d of [1,2,3,5,9])for(const sd of [3,8,13]){
    const res=r.j(`(()=>{seed=${sd*31+d};const C=makeCastle(${d});
      const where=C.rooms.findIndex(rm=>rm.chests.some(c=>c.item&&c.item.k==='uniform'));
      const cell=C.rooms[C.start],u=C.rooms[C.uniformRoom];
      return{d:Math.abs(cell.cx-u.cx)+Math.abs(cell.cy-u.cy),inU:u.chests.some(c=>c.item&&c.item.k==='uniform'),
        start:C.uniformRoom===C.start,ok:roomOk(u)};})()`);
    assert.ok(res.inU,`castle ${d}: no uniform in the room it was put in`);
    assert.ok(res.ok,`castle ${d}: the uniform's chest cannot be reached`);
    if(d===1)assert.ok(res.start,'castle one: the uniform is not in the cell');
    else assert.ok(res.d<=1,`castle ${d}: the uniform is ${res.d} rooms away`);
  }
});

test('the first castle is the gentle one, and it builds up', ()=>{
  const r=runtime();
  const T=r.j(`[1,2,3,6,9].map(tune)`);
  for(let i=1;i<T.length;i++){
    assert.ok(T[i].react<=T[i-1].react&&T[i].fireGap<=T[i-1].fireGap&&T[i].jitter<=T[i-1].jitter,
      'castle '+[1,2,3,6,9][i]+' is easier than the one before it');
  }
  assert.ok(T[0].react>=1.5&&T[0].jitter>=0.3&&T[0].gshot<=90,'castle one is not gentle: '+JSON.stringify(T[0]));
  const ss=r.j(`(()=>{let n=0;for(let sd=1;sd<30;sd++){seed=sd;const C=makeCastle(1);
    n+=C.rooms.reduce((a,rm)=>a+rm.guards.filter(g=>g.kind==='ss').length,0);}return n;})()`);
  assert.equal(ss,0,'there are SS in the first castle');
});

test('the first bullet in the first castles only grazes him', ()=>{
  const r=runtime();
  r.run(`G.impenetrable=false;`);
  bare(r,60,92);
  r.run(`hitPlayer('shot')`);
  assert.equal(r.j('G.P.dead'),false,'the first bullet of castle one killed him');
  r.run(`hitPlayer('shot')`);
  assert.equal(r.j('G.P.dead'),true,'the second did not');
  r.run(`startCastle(3);G.state='play';G.impenetrable=false;`);
  r.run(`hitPlayer('shot')`);
  assert.equal(r.j('G.P.dead'),true,'castle three still grazes');
});

test('the gun holstered: FIRE draws it and does not shoot, and a guard is not held up by it', ()=>{
  const r=runtime();
  r.run(`G.impenetrable=true;`);
  bare(r,60,92);
  r.run(`holster();`);
  assert.equal(r.j('G.P.holstered'),true);
  const a=r.j('G.P.ammo');
  r.run(`G.P.fireCool=0;fire();`);
  assert.equal(r.j('G.P.ammo'),a,'a holstered gun went off');
  assert.equal(r.j('G.P.holstered'),false,'FIRE did not draw it');
  r.run(`holster();`);
  guard(r,'guard',150,92);
  r.run(`alarm(room().guards[0]);G.P.dir=0;`);
  step(r,4);
  assert.notEqual(r.j('room().guards[0].st'),'hup','he put his hands up for a gun in its holster');
  assert.notEqual(r.j('figRows("player","hol","stand").join()'),r.j('figRows("player","H","stand").join()'),
    'holstered, he looks the same');
});

test('each man has his own voice, and a question rises where an order falls', ()=>{
  const r=runtime();
  const sing=(text,mood,who)=>{r.notes.length=0;r.run(`Snd.on=true;Snd.intone(${JSON.stringify(text)},'${mood}',${JSON.stringify(who)})`);
    return r.notes.filter((f,i)=>i%1===0).slice();};
  const guard={kind:'guard',pitch:1,rate:1},ss={kind:'ss',pitch:1,rate:1};
  const ask=sing('Wohin gehen Sie?','ask',guard),bark=sing('Halt! Stehenbleiben!','bark',guard);
  assert.ok(ask.length>=3&&bark.length>=3);
  assert.ok(ask[ask.length-1]>ask[0]*1.2,'a question does not rise: '+ask.map(Math.round));
  assert.ok(bark[bark.length-1]<bark[0]*0.8,'an order does not fall: '+bark.map(Math.round));
  const cold=sing('Ihre Papiere, bitte.','cold',ss);
  const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
  assert.ok(avg(cold)<avg(sing('Ihre Papiere, bitte.','cold',guard))*0.8,'the SS do not sound lower');
  const sus=sing('Sie haben einen komischen Akzent.','suspicious',guard);
  const ups=sus.slice(1).filter((f,i)=>f>sus[i]).length,downs=sus.slice(1).filter((f,i)=>f<sus[i]).length;
  assert.ok(ups>0&&downs>0,'suspicion does not waver');
  const voices=r.j(`[mkGuard('guard',0,0),mkGuard('guard',0,0),mkGuard('guard',0,0)].map(g=>g.voice.pitch)`);
  assert.ok(new Set(voices).size===3,'the guards all sound the same');
});

test('the SS go in squads: never one alone', ()=>{
  const r=runtime();
  const squads=r.j(`(()=>{const out=[];for(let sd=1;sd<40;sd++){seed=sd*131;const C=makeCastle(3+sd%6);
    for(const rm of C.rooms){const n=rm.guards.filter(g=>g.kind==='ss').length;if(n)out.push(n);}}return out;})()`);
  assert.ok(squads.length>20,'hardly any SS at all: '+squads.length);
  const alone=squads.filter(n=>n<2).length;
  assert.ok(alone<=squads.length*0.05,alone+' of '+squads.length+' SS rooms have one SS man in them');
  assert.ok(squads.some(n=>n>=3),'never a squad of three');
});

test('the alarm sends squads through the doors, walking in from off the screen', ()=>{
  const r=runtime();
  r.run(`G.impenetrable=true;`);
  const res=r.j(`(()=>{
    const C=G.castle;const i=C.rooms.findIndex(rm=>Object.values(rm.doors).filter(Boolean).length>=1&&C.rooms.indexOf(rm)!==C.start);
    enterRoom(i);const rm=room();rm.guards=[];rm.chests=[];rm.g=rm.g.map(t=>t===INNER||t===RUBBLE?FLOOR:t);
    G.P.x=140;G.P.y=92;
    raiseHunt();G.hunt.t=0.01;
    const first=[];let n=0;
    for(let k=0;k<180;k++){stepGame(1/60);
      for(const g of room().guards)if(first.indexOf(g.id)<0){first.push(g.id);n++;
        first.push({x:g.x,y:g.y});}}
    return{pos:first.filter(v=>typeof v==='object'),n,st:room().guards.map(g=>g.st),kinds:room().guards.map(g=>g.kind)};})()`);
  assert.ok(res.n>=2,'the alarm sent '+res.n+' SS');
  assert.ok(res.kinds.every(k=>k==='ss'));
  for(const p of res.pos)
    assert.ok(p.x<0||p.x>280||p.y<8||p.y>168,'an SS man appeared inside the room at '+JSON.stringify(p));
  assert.ok(res.st.every(s=>s==='alert'),'the squad came in and did not come for him: '+res.st);
});

test('the alarm goes quiet, and sooner in a uniform', ()=>{
  const quiet=uniform=>{
    const r=runtime();
    bare(r,60,92);
    r.run(`G.impenetrable=true;G.P.uniform=${uniform};raiseHunt();G.hunt.t=1e9;`);
    let t=0;while(t<60&&r.j('G.hunt.on')){step(r,0.5);t+=0.5;}
    return t;
  };
  const plain=quiet(false),dressed=quiet(true);
  assert.ok(plain<60,'the alarm never went quiet');
  assert.ok(dressed<plain/2,'the uniform did not quieten the hunt: '+dressed+'s against '+plain+'s');
});

test('a squad that comes in after a man in uniform does not know him', ()=>{
  const r=runtime();
  bare(r,140,92);
  r.run(`G.impenetrable=true;G.P.uniform=true;room().blown=false;raiseHunt();G.hunt.t=0.01;`);
  step(r,4);
  const st=r.j(`room().guards.map(g=>g.st)`);
  assert.ok(st.length>=2);
  assert.ok(st.every(s=>s!=='alert'),'they came in and knew him at once: '+st);
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
