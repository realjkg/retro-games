// Run with node --test tests/rescue.test.cjs. No packages required.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {test}=require('node:test');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8')
  .split('<script>')[1].split('</script>')[0];

// The game's own script, run against the smallest DOM and audio stubs it will accept.
function runtime(diff=2,seed=7,start=true,store){
  const grad={addColorStop(){}};
  const drawing=new Proxy({},{get:(t,k)=>{
    if(k==='canvas')return{width:346,height:216};
    return (...a)=>/Gradient|Pattern/.test(String(k))?grad:undefined;}});
  const els=new Map(),notes=[];
  function el(id){if(!els.has(id))els.set(id,{id,style:{},dataset:{},hidden:false,handlers:{},
    classList:{add(){},remove(){},toggle(){}},textContent:'',innerHTML:'',
    setAttribute(){},addEventListener(t,fn){this.handlers[t]=fn;},setPointerCapture(){},
    querySelectorAll(){return[]},rect:{width:346,height:216},getBoundingClientRect(){return this.rect},
    getContext(){return drawing}});return els.get(id);}
  // A browser's storage, or something close enough: shared between runtimes so a
  // "next visit" can be tested, and able to throw the way a private window does.
  const kept=store||new Map();
  const localStorage={
    getItem:k=>{if(kept.broken)throw new Error("denied");return kept.has(k)?kept.get(k):null;},
    setItem:(k,v)=>{if(kept.broken)throw new Error("denied");kept.set(k,String(v));},
    removeItem:k=>{kept.delete(k);}};
  class AudioContext{
    constructor(){this.state='running';this.currentTime=0;this.destination={};}
    createGain(){return{gain:{value:1,setValueAtTime(){},linearRampToValueAtTime(){},
      exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
    createOscillator(){return{frequency:{setValueAtTime(hz){notes.push(hz)},
      exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){},stop(){}};}
    resume(){return Promise.resolve();}
  }
  const cls=new Set(),docEvents=[];
  const body={classList:{toggle(n,on){on?cls.add(n):cls.delete(n);},add(n){cls.add(n)},
    remove(n){cls.delete(n)},contains:n=>cls.has(n)}};
  const box={console,setTimeout(){},localStorage,navigator:{userAgent:"node",maxTouchPoints:0},
    document:{hidden:false,body,documentElement:{},getElementById:el,querySelectorAll(){return[]},
      addEventListener(type){docEvents.push(type)}},
    window:{AudioContext},performance:{now:()=>0},devicePixelRatio:1,
    addEventListener(){},requestAnimationFrame(){}};
  box.store=kept;
  vm.createContext(box);vm.runInContext(source,box);
  // The game uses Math.random for the things a seed should not have to carry -
  // when a scorpion next hops, which way a toy drifts. A test that leaves that
  // to chance passes most of the time, which is the worst kind of test.
  vm.runInContext(`Math.random=(()=>{let s=${(seed>>>0)+0x9E3779B9};
    return()=>{s=(s+0x6D2B79F5)>>>0;let t=Math.imul(s^s>>>15,1|s);
     t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})();`,box);
  const run=c=>vm.runInContext(c,box);
  if(start)run(`newGame(${diff},${seed});`);
  return {run,notes,el,cls,docEvents,store:kept};
}
const clampTo=(v,a,b)=>v<a?a:v>b?b:v;
const step=(r,n,dt=0.02)=>r.run(`for(let i=0;i<${n};i++)stepGame(${dt});`);
// Put the robot alone on a storey with nothing else alive in the maze.
function clearMaze(r,f=1,x=20){
  r.run(`G.L.foes=[];G.L.shots=[];G.L.curses=[];G.L.plants=[];G.L.traps=[];
   G.L.toy=null;G.L.pet=null;G.L.child=null;
   G.hero.x=${x}*TS;G.hero.y=slabRow(${f})*TS-G.hero.h;G.hero.vx=0;G.hero.vy=0;G.hero.inv=0;
   for(const k of Object.keys(keys))delete keys[k];`);
}

test('A seed reproduces a whole scene, and a different seed does not',()=>{
  const dump=r=>r.run('G.L.map.map(col=>col.join("")).join("")+"|"+G.L.foes.map(e=>e.k+e.x+e.y).join(",")');
  assert.equal(dump(runtime(2,21)),dump(runtime(2,21)));
  assert.notEqual(dump(runtime(2,21)),dump(runtime(2,22)));
});

test('The maze is four storeys of slab with gaps cut in them, and walls at both ends',()=>{
  const r=runtime(2,5);
  assert.equal(r.run('FLOORS'),4);
  for(let f=0;f<4;f++){
    const solid=r.run(`(()=>{let n=0;for(let x=0;x<MAPW;x++)if(G.L.map[x][slabRow(${f})]===SLAB)n++;return n;})()`);
    const gaps=r.run(`G.L.gaps.filter(g=>g.f===${f}).length`);
    assert.ok(solid>MAPW_OF(r)*0.5,`storey ${f} is mostly floor`);
    if(f<3)assert.ok(gaps>=2,`storey ${f} has holes to fly through (${gaps})`);
  }
  assert.equal(r.run('G.L.map[0].every(t=>t===SLAB)'),true);
  assert.equal(r.run('G.L.map[MAPW-1].every(t=>t===SLAB)'),true);
  function MAPW_OF(r){return r.run('MAPW');}
});

test('A busier setting and a later round both put more in the maze',()=>{
  const quiet=runtime(1,4).run('G.L.foes.length');
  const swarm=runtime(4,4).run('G.L.foes.length');
  assert.ok(swarm>quiet,`${swarm} > ${quiet}`);
  const r=runtime(2,4);
  const first=r.run('G.L.foes.length');
  r.run('G.loop=2;startScene();');
  assert.ok(r.run('G.L.foes.length')>first,'the loop back round is a fuller maze');
  // And they move faster the further round you are.
  assert.ok(r.run('G.L.foes[0].sp')>runtime(2,4).run('G.L.foes[0].sp'));
});

test('The robot rises on the backpack, sinks without it, and cannot pass through a slab',()=>{
  const r=runtime(2,9);clearMaze(r,1);
  const floor=r.run('G.hero.y');
  r.run('keys.U=true;');step(r,40);
  const up=r.run('G.hero.y');
  // A storey is forty pixels now, as the original's are, so the room over his
  // head is twelve rather than twenty.
  assert.ok(up<floor-8,`holding rise climbs (${(floor-up).toFixed(1)}px)`);
  r.run('delete keys.U;');step(r,120);
  assert.ok(Math.abs(r.run('G.hero.y')-floor)<2,'letting go settles back to the floor');
  // A slab with no gap in it stops him going up.
  r.run(`for(let x=0;x<MAPW;x++)G.L.map[x][slabRow(0)]=SLAB;keys.U=true;`);
  step(r,200);
  assert.ok(r.run('G.hero.y')>r.run('slabRow(0)*TS'),'a solid ceiling is a ceiling');
  // Cut a hole above him and he goes through it.
  r.run(`G.hero.x=20*TS;for(let x=19;x<23;x++)G.L.map[x][slabRow(0)]=AIR;`);
  step(r,200);
  assert.ok(r.run('G.hero.y')<r.run('slabRow(0)*TS'),'a gap is a way up');
});

test('Three balls in the air at a time, and they leave the chest the way you ask',()=>{
  const r=runtime(2,9);clearMaze(r,1);
  r.run('G.hero.face=1;');
  for(let i=0;i<5;i++)r.run('G.hero.cool=0;shoot(G.hero.face,0);');
  assert.equal(r.run('G.L.shots.length'),3,'no more than three at once');
  assert.ok(r.run('G.L.shots[0].vx')>0&&r.run('G.L.shots[0].vy')===0,'a level shot goes where you face');
  r.run('G.L.shots=[];G.hero.cool=0;shoot(0,-1);');
  assert.ok(r.run('G.L.shots[0].vy')<0,'the second button shoots straight up');
  r.run('G.L.shots=[];G.hero.cool=0;keys.D=true;press("VERT");');
  assert.ok(r.run('G.L.shots[0].vy')>0,'held down, it shoots straight down');
});

test('A shot kills what it hits and scores it; a magnet eats the shot instead',()=>{
  const r=runtime(2,9);clearMaze(r,1);
  // The scorpion is pinned where it stands: what is under test is the ball, not
  // whether a hopping target happens to be in the way of it.
  r.run(`G.L.foes=[mkFoe("scorpion",G.hero.x+30,G.hero.y,1,1,0,0)];
   G.L.foes[0].sp=0;G.L.foes[0].cool=99;G.hero.inv=99;G.hero.face=1;G.hero.cool=0;shoot(1,0);`);
  step(r,20);
  assert.equal(r.run('G.L.foes[0].dead'),true);
  assert.equal(r.run('G.score'),r.run('FOE.scorpion.pts'));
  assert.equal(r.run('G.L.shots.length'),0,'the shot is spent');
  // The witch doctor takes three.
  clearMaze(r,1);
  r.run(`G.score=0;G.hero.inv=99;G.L.foes=[mkFoe("doctor",G.hero.x+60,G.hero.y,1,1,0,0)];
   G.L.foes[0].sp=0;G.L.foes[0].cool=99;`);
  for(let i=0;i<2;i++){r.run('G.hero.cool=0;shoot(1,0);');step(r,20);}
  assert.equal(r.run('G.L.foes[0].dead'),false);
  r.run('G.hero.cool=0;shoot(1,0);');step(r,20);
  assert.equal(r.run('G.L.foes[0].dead'),true);
  // A magnet is not shootable: it swallows the ball and stays where it is.
  clearMaze(r,1);
  r.run(`G.L.foes=[mkFoe("magnet",G.hero.x+30,G.hero.y,1,1,0,0)];G.score=0;G.hero.cool=0;shoot(1,0);`);
  step(r,20);
  assert.equal(r.run('G.L.foes[0].dead'),false,'the magnet survives');
  assert.equal(r.run('G.L.shots.length'),0,'the shot does not');
  assert.equal(r.run('G.score'),0);
});

test('Shooting the toy stops the child chasing it, and is worth points',()=>{
  const r=runtime(2,3);
  r.run('G.scene=0;G.loop=0;startScene();');
  assert.equal(r.run('G.L.child.chasing'),true);
  r.run(`G.L.foes=[];G.score=0;G.hero.inv=0;
   G.L.child.f=1;G.L.child.y=slabRow(1)*TS-G.L.child.h;G.L.child.x=40*TS;
   G.L.toy.f=1;G.L.toy.alive=true;G.L.toy.x=52*TS;G.L.toy.y=slabRow(1)*TS-24;
   G.L.toy.vx=0;G.L.toy.vy=0;
   G.hero.x=48*TS;G.hero.y=G.L.toy.y;G.hero.face=1;G.hero.cool=0;shoot(1,0);`);
  step(r,14);   // the ball crosses those forty pixels in a quarter of a second
  assert.equal(r.run('G.L.toy.alive'),false);
  assert.equal(r.run('G.L.child.chasing'),false);
  assert.equal(r.run('G.score'),500);
  // A child that is no longer chasing stays within a few pixels of where it stood.
  const x0=r.run('G.L.child.x');
  r.run('G.hero.x=4*TS;');step(r,200);
  assert.ok(Math.abs(r.run('G.L.child.x')-x0)<14,'he stops to look');
});

test('Touching the child ends the scene, and the third scene ends the round',()=>{
  const r=runtime(2,11);
  r.run(`G.L.foes=[];G.hero.inv=0;G.hero.x=G.L.child.x;G.hero.y=G.L.child.y;`);
  step(r,2);
  assert.equal(r.run('G.phase'),'cheer');
  assert.ok(r.run('G.score')>=2000,'a rescue is worth a rescue');
  r.run('G.cheerT=0;nextScene();');
  assert.equal(r.run('G.scene'),1);
  assert.equal(r.run('G.L.child.kind'),'girl');
  assert.equal(r.run('G.L.toy.kind'),'balloon');
  r.run('G.scene=2;startScene();');
  assert.equal(r.run('G.L.child.kind'),'mom');
  assert.equal(r.run('G.L.toy'),null,'there is no toy to shoot in the third scene');
  assert.equal(r.run('G.L.child.bound'),true);
  assert.ok(r.run('G.L.child.x')>r.run('MAPW*TS*0.7'),'she is at the far right');
  assert.equal(r.run('storeyOf(G.L.child)'),3,'on the lowest floor');
  r.run('G.loop=0;G.scene=2;nextScene();');
  assert.equal(r.run('G.scene'),0);
  assert.equal(r.run('G.loop'),1,'after the mother it all starts again');
});

test('The pet is a bonus you can leave behind',()=>{
  const r=runtime(2,15);
  r.run('G.scene=0;startScene();G.L.foes=[];G.score=0;G.hero.inv=0;');
  assert.equal(r.run('G.L.pet.kind'),'lizard');
  r.run('G.hero.x=G.L.pet.x;G.hero.y=G.L.pet.y;');step(r,2);
  assert.equal(r.run('G.L.pet.freed'),true);
  assert.equal(r.run('G.score'),1000);
  r.run('G.scene=1;startScene();');
  assert.equal(r.run('G.L.pet.kind'),'gator');
});

test('Scene three has three trapdoors, one of them safe, and the others have teeth',()=>{
  const r=runtime(2,31);
  r.run('G.scene=2;startScene();G.L.foes=[];G.hero.inv=0;');
  assert.equal(r.run('G.L.traps.length'),3);
  assert.equal(r.run('G.L.traps.filter(t=>t.safe).length'),1);
  // The safe one is a hole and nothing more.
  r.run(`G.hero.x=G.L.traps.find(q=>q.safe).x+6;G.hero.y=G.L.traps.find(q=>q.safe).y-2;`);
  step(r,3);
  assert.equal(r.run('G.L.plants.length'),0);
  assert.equal(r.run('G.hero.alive'),true);
  // A wrong one grows something that eats a robot left sitting in it.
  r.run(`G.hero.x=G.L.traps.find(q=>!q.safe).x+6;G.hero.y=G.L.traps.find(q=>!q.safe).y-2;G.hero.inv=0;`);
  step(r,3);
  assert.equal(r.run('G.L.plants.length'),1);
  step(r,60);
  assert.equal(r.run('G.hero.alive'),false,'the plant gets what stays under the trapdoor');
});

test('Contact costs a robot, invulnerability covers the respawn, and the last one ends it',()=>{
  const r=runtime(2,17);clearMaze(r,1);
  const lives=r.run('G.lives');
  r.run('G.L.foes=[mkFoe("zombie",G.hero.x,G.hero.y,1,1,0,0)];');
  step(r,2);
  assert.equal(r.run('G.hero.alive'),false);
  assert.equal(r.run('G.lives'),lives-1);
  step(r,90);
  assert.equal(r.run('G.hero.alive'),true,'a fresh robot after the pause');
  assert.ok(r.run('G.hero.inv')>0,'and it cannot be killed the instant it appears');
  assert.equal(r.run('killHero("a test")'),false,'invulnerable is invulnerable');
  r.run('G.lives=1;G.hero.inv=0;G.L.foes=[mkFoe("zombie",G.hero.x,G.hero.y,1,1,0,0)];');
  step(r,2);step(r,90);
  assert.equal(r.run('G.phase'),'over');
});

test('A witch doctor throws a curse down his own floor, and it kills',()=>{
  const r=runtime(2,19);clearMaze(r,1);
  r.run(`G.L.foes=[mkFoe("doctor",G.hero.x+80,G.hero.y,1,-1,0,0)];G.L.foes[0].cool=0;`);
  step(r,4);
  assert.ok(r.run('G.L.curses.length')>0,'he throws');
  const lives=r.run('G.lives');
  r.run('G.hero.inv=0;');
  step(r,60);
  assert.equal(r.run('G.lives'),lives-1,'the curse costs a robot');
});

test('A ball knocks a curse out of the air',()=>{
  const r=runtime(2,19);clearMaze(r,1);
  r.run(`G.L.curses=[{x:G.hero.x+40,y:G.hero.y+5,w:7,h:7,vx:-130,vy:0,t:0,gone:false}];
   G.score=0;G.hero.face=1;G.hero.cool=0;shoot(1,0);`);
  step(r,20);
  assert.equal(r.run('G.L.curses.length'),0,'the curse is gone');
  assert.equal(r.run('G.hero.alive'),true,'and it never reached the robot');
  assert.equal(r.run('G.score'),25);
});

test('A magnet pulls hardest up close, and can be flown out of at its edge',()=>{
  const r=runtime(2,23);
  // How far the robot gets in half a second with nothing pulling at it.
  const fly=setup=>{
    clearMaze(r,1);
    r.run(`G.hero.inv=99;${setup||""}keys.L=true;`);
    const x0=r.run('G.hero.x');
    step(r,30);
    return r.run('G.hero.x')-x0;
  };
  const free=fly();
  const rim=fly('G.L.foes=[mkFoe("magnet",G.hero.x+MAGNET_REACH-8,G.hero.y,1,1,0,0)];');
  const close=fly('G.L.foes=[mkFoe("magnet",G.hero.x+14,G.hero.y,1,1,0,0)];');
  assert.ok(close>rim,`close in it costs more ground (${close} > ${rim})`);
  assert.ok(rim>free,`the pull costs you ground at the rim too (${rim} > ${free})`);
  assert.ok(rim<free*0.6,`but at the rim you still fly out of it (${rim} vs ${free})`);
  assert.ok(close>-8,`from close in the backpack does not win (${close})`);
});

test('Every 10000 points is another robot',()=>{
  const r=runtime(2,29);
  const lives=r.run('G.lives');
  r.run('addScore(10000);');
  assert.equal(r.run('G.lives'),lives+1);
  r.run('addScore(20000);');
  assert.equal(r.run('G.lives'),lives+3);
});

test('The scope can be switched off, and the view takes those rows back',()=>{
  const kept=new Map();
  const r=runtime(2,33,true,kept);
  assert.equal(r.run('G.radar'),true);
  const withScope=r.run('viewH()');
  r.run('press("RADAR");');
  assert.equal(r.run('G.radar'),false);
  assert.equal(r.run('viewH()'),withScope+r.run('RADAR_H'));
  assert.equal(r.run('viewTop()'),0);
  assert.equal(JSON.parse(kept.get('drol.prefs')).radar,false,'and the switch is remembered');
});

// This test used to assert that VW was 346 whatever the box was, which is the
// bug written down as the contract: the scale came off the view's own width, so
// every screen showed the same narrow slice of a thousand-pixel maze.
test('A wider box shows more maze, and a narrow one shows what it can',()=>{
  const r=runtime(2,35);
  const box=r.el('cv').rect;
  const want=r.run('VIEW_WANT'), max=r.run('VIEW_MAX'), full=r.run('viewFullH()');

  box.width=1038;box.height=648;r.run('fit(true);');
  const wide=r.run('VW');
  assert.ok(wide>=want,`a wide box shows at least the target (${wide} vs ${want})`);
  assert.ok(wide<=max,`and never more than the cap (${wide} vs ${max})`);
  assert.equal(r.run('VH'),full,'the whole maze, its scope and the line under it');

  // A phone has no more width to give, so it shows what it has at 1:1 rather
  // than shrinking the panel's lettering below a pixel a pixel.
  box.width=372;box.height=275;r.run('fit(true);');
  const narrow=r.run('VW');
  assert.ok(narrow<=372,`never more game pixels than the box has (${narrow})`);
  assert.ok(narrow>=340,`and all of the ones it has (${narrow})`);
  assert.equal(r.run('VH'),full,'still the whole maze');
  assert.ok(narrow<wide,'a bigger screen is more maze, not the same slice magnified');
});

test('Full screen is a layout, and the buttons say what they will do',()=>{
  const r=runtime(2,37);
  assert.equal(r.cls.has('fs'),false);
  r.run('toggleFullscreen();');
  assert.equal(r.cls.has('fs'),true);
  r.run('toggleFullscreen();');
  assert.equal(r.cls.has('fs'),false);
  r.run('G.hero.face=1;');
  assert.match(r.run('fireLabel()'),/▶/);
  r.run('G.hero.face=-1;');
  assert.match(r.run('fireLabel()'),/◀/);
  assert.match(r.run('vertLabel()'),/▲/);
  r.run('keys.D=true;');
  assert.match(r.run('vertLabel()'),/▼/);
});

test('Holding a control is never a text selection',()=>{
  const r=runtime(2,39);
  for(const ev of ['contextmenu','selectstart','dragstart'])
    assert.ok(r.docEvents.includes(ev),ev+' is refused inside the game');
});

test('The music follows the state of the game, and both switches silence it',()=>{
  const r=runtime(2,41,false);
  r.run('unlockAudio();musicForState();musicTick();');
  assert.equal(r.run('MUSIC.cur'),'title');
  const titleNotes=r.notes.length;
  assert.ok(titleNotes>0,'the attract screen plays');
  r.run('newGame(2,41);musicForState();musicTick();');
  assert.equal(r.run('MUSIC.cur'),'s0');
  r.run('G.scene=2;musicForState();');
  assert.equal(r.run('MUSIC.cur'),'s2');
  r.run('G.phase="cheer";musicForState();');
  assert.equal(r.run('MUSIC.cur'),'win','the rescue has its own fanfare');
  // A later round is a faster one: count the sixteenths scheduled over one second.
  const sixteenths=loop=>{
    r.run(`G.phase="play";G.loop=${loop};musicForState();MUSIC.step=0;MUSIC.next=0;
      musicTick();SOUND.ctx.currentTime=1;musicTick();SOUND.ctx.currentTime=0;`);
    return r.run('MUSIC.step');
  };
  assert.ok(sixteenths(3)>sixteenths(0),'the pulse quickens round after round');
  // Both switches stop it.
  r.run('setMusic(false);MUSIC.next=0;MUSIC.step=0;musicForState();musicTick();');
  assert.equal(r.run('MUSIC.step'),0);
  r.run('setMusic(true);SOUND.enabled=false;MUSIC.next=0;MUSIC.step=0;musicForState();musicTick();');
  assert.equal(r.run('MUSIC.step'),0);
});

test('Pausing stops the world, and the tab going away pauses it for you',()=>{
  const r=runtime(2,43);
  r.run('press("MENU");');
  assert.equal(r.run('G.phase'),'paused');
  const x=r.run('G.hero.x');
  r.run('keys.R=true;');
  r.run('if(G.phase==="play")stepGame(.02);');
  assert.equal(r.run('G.hero.x'),x);
  r.run('press("MENU");');
  assert.equal(r.run('G.phase'),'play');
});

test('Sound, music, the scope and the best score are remembered between visits',()=>{
  const kept=new Map();
  const a=runtime(2,61,true,kept);
  a.run('SOUND.enabled=false;setMusic(false);G.radar=false;savePrefs();addScore(4200);');
  const saved=JSON.parse(kept.get('drol.prefs'));
  assert.equal(saved.sound,false);
  assert.equal(saved.music,false);
  assert.equal(saved.radar,false);
  assert.equal(saved.best,4200);
  // Next visit: the same switches come back the way they were left.
  const b=runtime(2,61,false,kept);
  assert.equal(b.run('SOUND.enabled'),false);
  assert.equal(b.run('MUSIC.on'),false);
  assert.equal(b.run('G.radar'),false);
  assert.equal(b.run('G.best'),4200);
  assert.equal(b.el('sound').textContent,'SOUND OFF');
  // A lower score never overwrites the best.
  b.run('newGame(2,61);addScore(100);');
  assert.equal(JSON.parse(kept.get('drol.prefs')).best,4200);
});

test('A browser that refuses storage is still a game',()=>{
  const kept=new Map();kept.broken=true;      // private window, or site data blocked
  const r=runtime(2,63,true,kept);
  r.run('addScore(500);savePrefs();');
  assert.equal(r.run('G.score'),500,'the game does not care that nothing was written');
  assert.equal(r.run('Object.keys(loadPrefs()).length'),0,'it reads back nothing, and does not throw');
});

test('The install button is there for a browser that can install it',()=>{
  const r=runtime(2,65);
  assert.equal(r.el('install').hidden,false,'hidden until something offers, then shown');
  r.run('showInstall(false);');
  assert.equal(r.el('install').hidden,true);
  r.run('showInstall(true);');
  assert.equal(r.el('install').hidden,false);
  // With no Chrome prompt to hand, it explains Add to Home Screen instead.
  r.el('install').handlers.click();
  assert.match(r.el('overlay').innerHTML,/Add to Home Screen/);
});

test('There is one picture of the hero, and everything draws that one',()=>{
  const r=runtime(2,67);
  // The icon and the tile show him flying, so that is the pose they read.
  const rows=r.run('HERO_FLY.join("|")'), palKeys=r.run('Object.keys(HERO_PAL).sort().join("")');
  assert.equal(r.run('HERO_PIX.every(x=>x.length===HERO_PIX[0].length)'),true,'a rectangle');
  // The picture is drawn around the body that collides, never smaller than it.
  const pw=r.run('HERO_FLY[0].length'), ph=r.run('HERO_FLY.length');
  assert.ok(pw>=r.run('G.hero.w')&&pw<=r.run('G.hero.w')+6,`${pw} wide against a ${r.run('G.hero.w')} body`);
  assert.ok(ph>=r.run('G.hero.h')&&ph<=r.run('G.hero.h')+4,`${ph} tall against a ${r.run('G.hero.h')} body`);
  assert.ok(r.run('G.hero.w')<HOLE_PX(r),'and he fits through a hole');
  function HOLE_PX(r){return r.run('HOLEW*TS');}
  // Every pixel that is not blank has a colour.
  const missing=r.run(`(()=>{const bad=new Set();
    for(const row of HERO_PIX)for(const ch of row)if(ch!=="."&&!HERO_PAL[ch])bad.add(ch);
    return [...bad].join("");})()`);
  assert.equal(missing,'','every character in the sprite has a colour');
  // The game and the title card both draw it, rather than each drawing their own.
  const src=source;
  const hero=src.slice(src.indexOf('function drawHero('),src.indexOf('function drawRadar('));
  const title=src.slice(src.indexOf('function drawTitle('),src.indexOf('function render('));
  assert.match(hero,/drawPix\(frame,HERO_PAL/,'the game draws the sprite');
  // Three poses. Each is a rectangle, and each hangs off the body by its own
  // offset, but they line up with each other where it matters.
  for(const name of ['HERO_WALK','HERO_FLY'])
    assert.equal(r.run(name+'.every(x=>x.length==='+name+'[0].length)'),true,name+' is a rectangle');
  assert.equal(r.run('HERO_WALK.length'),r.run('HERO_PIX.length'),'standing and walking are one pose apart');
  assert.equal(r.run('HERO_WALK.slice(0,14).join("|")===HERO_PIX.slice(0,14).join("|")'),true,
    'walking moves only the white of him');
  // The three poses line up with each other: the red band across his middle is on
  // the same row in all of them, so swapping frames never makes him jump.
  const bandRow=name=>r.run(`${name}.findIndex(row=>(row.match(/R/g)||[]).length>8)`);
  assert.equal(bandRow('HERO_WALK'),bandRow('HERO_PIX'));
  assert.equal(bandRow('HERO_FLY'),bandRow('HERO_PIX'));
  assert.ok(bandRow('HERO_PIX')>0,'and there is a band to line up');
  assert.match(title,/drawPix\(HERO_PIX,HERO_PAL/,'so does the title card');
  // And so does the tool that writes the icon and the tile on the collection page.
  const art=require('../tools/render-art.js');
  const sprite=art.readSprite();
  assert.equal(sprite.rows.join('|'),rows,'the icon and the tile are generated from the same rows');
  assert.equal(Object.keys(sprite.colours).sort().join(''),palKeys,'and the same colours');
});

test('Up is the jetpack, down is his feet',()=>{
  const r=runtime(2,71);clearMaze(r,1);
  const floor=r.run('G.hero.y');
  assert.equal(r.run('G.hero.walking'),true,'he starts on his feet');
  // Held up, he climbs on the jetpack and the flame lights.
  r.run('keys.U=true;');step(r,30);
  assert.ok(r.run('G.hero.y')<floor-8,'the jetpack lifts him');
  assert.equal(r.run('G.hero.walking'),false,'and he is flying, not walking');
  assert.ok(r.run('G.hero.thrust')>.5,'with the rocket lit');
  // Held down, he comes back to the floor and walks it. (Over a hole, down is how
  // you drop a storey, so this one is sealed.)
  r.run(`for(let x=0;x<MAPW;x++)G.L.map[x][slabRow(1)]=SLAB;
   delete keys.U;keys.D=true;`);
  step(r,60);
  assert.ok(Math.abs(r.run('G.hero.y')-floor)<2,'down puts him back on the floor');
  assert.equal(r.run('G.hero.walking'),true,'which is walking');
  assert.equal(r.run('G.hero.thrust'),0,'the jetpack is off');
  // Walking is slower than flying, and the legs animate while he does it.
  r.run('keys.R=true;');step(r,60);
  const walked=Math.abs(r.run('G.hero.vx'));
  assert.ok(walked>0&&walked<=r.run('WALK_SPEED')+1,`he walks at walking pace (${walked})`);
  assert.ok(r.run('G.hero.step')>0,'the stride is running');
  r.run('keys.U=true;');step(r,40);
  assert.ok(Math.abs(r.run('G.hero.vx'))>walked,'the jetpack is the faster way across');
});

test('Every kind of thing in the maze can move and be drawn without falling over',()=>{
  // This is the test that would have caught a sprite being pasted into the AI:
  // an exception in either one shows up here rather than as a frozen screen.
  const r=runtime(2,73);
  for(const scene of [0,1,2]){
    r.run(`G.scene=${scene};startScene();G.hero.inv=999;
     G.L.foes=Object.keys(FOE).map((k,i)=>mkFoe(k,(14+i*6)*TS,slabRow(i%FLOORS)*TS-FOE[k].h,
       i%FLOORS,i%2?1:-1,0,0));
     G.L.curses=[{x:30*TS,y:slabRow(1)*TS-12,w:7,h:7,vx:-130,vy:0,t:0,gone:false}];
     G.L.plants=[{x:30*TS,y:slabRow(2)*TS,w:20,h:10,t:.5,grown:true}];`);
    const before=r.run('G.L.foes.map(e=>e.x+","+e.y).join("|")');
    step(r,60);
    r.run('render();updateStatus();updatePads();');
    assert.equal(r.run('G.L.foes.every(e=>isFinite(e.x)&&isFinite(e.y))'),true,
      `scene ${scene+1}: nothing has flown off to NaN`);
    assert.notEqual(r.run('G.L.foes.map(e=>e.x+","+e.y).join("|")'),before,
      `scene ${scene+1}: the menagerie actually moves`);
  }
  // And each kind individually, in case one of them is the quiet one.
  for(const k of r.run('Object.keys(FOE)')){
    r.run(`G.scene=2;startScene();G.hero.inv=999;
     G.L.foes=[mkFoe("${k}",20*TS,slabRow(1)*TS-FOE["${k}"].h,1,1,0,0)];`);
    step(r,40);
    r.run('render();');
    assert.equal(r.run('G.L.foes.length'),1,k+' survives being stepped');
  }
});

test('Five balls do not kill a turkey. They cook it.',()=>{
  const r=runtime(2,79);clearMaze(r,1);
  r.run(`G.score=0;G.hero.inv=99;G.hero.face=1;
   G.L.foes=[mkFoe("turkey",G.hero.x+40,G.hero.y,1,1,0,0)];
   G.L.foes[0].sp=0;G.L.foes[0].cool=99;G.L.foes[0].vy=0;`);
  // He is pinned at the turkey's height: this is about the fifth ball, not about
  // whether he can hover in one place for five of them.
  const pin=()=>r.run('G.hero.y=G.L.foes[0].y;G.hero.vy=0;G.hero.cool=0;');
  for(let i=0;i<4;i++){pin();r.run('shoot(1,0);');step(r,14);}
  assert.equal(r.run('G.L.foes[0].k'),'turkey','four shots and it is still a turkey');
  assert.equal(r.run('G.L.foes[0].dead'),false);
  pin();r.run('shoot(1,0);');step(r,14);
  assert.equal(r.run('G.L.foes[0].k'),'roast','the fifth cooks it');
  assert.equal(r.run('G.L.foes[0].dead'),false,'and it is still there to collect');
  assert.equal(r.run('G.score'),r.run('FOE.turkey.pts'));
  // It comes down to the floor, it does not chase anybody, and it cannot kill you.
  step(r,60);
  assert.equal(r.run('G.L.foes[0].vy'),0,'dinner settles');
  assert.equal(r.run('Math.round(G.L.foes[0].y+G.L.foes[0].h)'),
               r.run('slabRow(storeyOf(G.L.foes[0]))*TS'),'on the floor it landed on');
  r.run('G.hero.inv=0;G.hero.x=G.L.foes[0].x;G.hero.y=G.L.foes[0].y;');
  step(r,2);
  assert.equal(r.run('G.hero.alive'),true,'walking into dinner is not fatal');
  assert.equal(r.run('G.score'),r.run('FOE.turkey.pts+FOE.roast.pts'),'it is worth collecting');
});

test('A game starts with ten robots',()=>{
  const r=runtime(2,41);
  assert.equal(r.run('START_LIVES'),10);
  assert.equal(r.run('G.lives'),10,'and newGame hands you all of them');
});

test('Endless robots: a death costs the scene, never the game',()=>{
  const r=runtime(2,43);clearMaze(r,1);
  r.run('G.endless=true;G.lives=1;');
  for(let i=0;i<3;i++){
    r.run('G.hero.inv=0;G.L.foes=[mkFoe("zombie",G.hero.x,G.hero.y,1,1,0,0)];');
    step(r,2);
    assert.equal(r.run('G.hero.alive'),false,'it still kills you');
    step(r,90);
    assert.equal(r.run('G.hero.alive'),true,'and you come straight back');
  }
  assert.equal(r.run('G.lives'),1,'the count never moves');
  assert.equal(r.run('G.phase'),'play','and it is never over');
});

test('A score made on endless robots is not a high score',()=>{
  const r=runtime(2,45);
  r.run('G.endless=true;G.best=0;');
  r.run('addScore(50000);');
  assert.equal(r.run('G.best'),0,'the best stays where it was');
  assert.equal(r.run('G.lives'),r.run('START_LIVES'),'and no extra robots are handed out');
  r.run('G.endless=false;addScore(1000);');
  assert.equal(r.run('G.best'),51000,'switched off, it counts again');
});

// A storey now holds forty pixels of air and the robot is eighteen of them, so
// height is a real choice and a ball fired along a floor is not meant to reach
// something forty pixels above it. What must hold is that every shootable thing
// can be shot from somewhere: level with it for the forward shot, under it or
// over it for the vertical one. The sword used to fail all three, because it
// swayed into the ceiling where no ball could go.
test('Everything the game says you can shoot, you can shoot',()=>{
  const r0=runtime(2,53);
  const kinds=JSON.parse(r0.run('JSON.stringify(Object.keys(FOE).filter(k=>FOE[k].shootable))'));
  const air=r0.run('storeyTop(1)*TS'), slab=r0.run('slabRow(1)*TS');
  // Put it where the game puts it and let it settle there - a blade rides up and
  // down its storey and a turkey holds its height, so where they end up is not
  // where they were spawned.
  const place=k=>`G.L.foes=[mkFoe("${k}",G.hero.x+44,`+
    ((k==='turkey'||k==='blade')?'storeyTop(1)*TS+2':`slabRow(1)*TS-FOE["${k}"].h`)+
    `,1,-1,0,0)];const e=G.L.foes[0];e.sp=0;e.cool=99;e.vx=0;e.vy=0;e.hp=1;`;
  const settle=(r,hy)=>{for(let i=0;i<6;i++)r.run(`G.hero.y=${hy};G.hero.vy=0;stepGame(0.01);`);};
  const where=k=>{
    const r=runtime(2,53);clearMaze(r,1,20);
    r.run(`G.hero.inv=999;G.hero.face=1;`+place(k));
    settle(r,slab-18);
    return JSON.parse(r.run('JSON.stringify({y:G.L.foes[0].y,h:G.L.foes[0].h})'));
  };
  const hit=(k,hy,dx,dy)=>{
    const r=runtime(2,53);clearMaze(r,1,20);
    r.run(`G.hero.inv=999;G.hero.face=1;G.hero.y=${hy};G.hero.vy=0;`+place(k));
    if(dy)r.run('G.L.foes[0].x=G.hero.x;');
    settle(r,hy);
    r.run(`shoot(${dx},${dy});`);
    for(let i=0;i<30;i++)r.run(`G.hero.y=${hy};G.hero.vy=0;stepGame(0.01);`);
    // a turkey turns into dinner rather than dying, which still counts as hit
    return r.run('!G.L.foes[0]||G.L.foes[0].dead||G.L.foes[0].k==="roast"');
  };

  const bad=[];
  for(const k of kinds){
    const at=where(k);
    const level=clampTo(Math.round(at.y+at.h/2-9),air,slab-18);
    if(!hit(k,level,1,0))bad.push(`${k}: the forward shot misses it from level with it`);
  }
  // And the vertical shot is what answers something flying above you: a turkey
  // holds the top of its storey, out of reach of a ball fired along the floor.
  if(!hit('turkey',slab-18,0,-1))bad.push('turkey: cannot be shot from the floor under it');
  assert.deepEqual(bad,[],'every shootable thing can be shot from somewhere');
});

test('A thrown sword stays in the storey it was thrown down',()=>{
  const r=runtime(2,49);clearMaze(r,1,20);
  const air=r.run('storeyTop(1)*TS'), slab=r.run('slabRow(1)*TS');
  r.run('G.hero.inv=999;G.L.foes=[mkFoe("blade",30*TS,storeyTop(1)*TS+2,1,-1,0,0)];');
  let lo=1e9, hi=-1e9;
  for(let i=0;i<300;i++){
    step(r,1);
    const {y,h}=JSON.parse(r.run('JSON.stringify({y:G.L.foes[0].y,h:G.L.foes[0].h})'));
    lo=Math.min(lo,y);hi=Math.max(hi,y+h);
  }
  assert.ok(lo>=air,`never in the ceiling (${lo} vs ${air})`);
  assert.ok(hi<=slab,`never through the floor (${hi} vs ${slab})`);
  assert.ok(hi-lo>4,'and it does sway as it flies');
});
