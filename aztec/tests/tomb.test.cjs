// Run with node --test tests/tomb.test.cjs. No packages required.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {test}=require('node:test');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8')
  .split('<script>')[1].split('</script>')[0];

function runtime(diff=3,seed=7){
  const grad={addColorStop(){}};
  const drawing=new Proxy({},{get:(t,k)=>{
    if(k==='canvas')return{width:320,height:192};
    return (...a)=>/Gradient|Pattern/.test(String(k))?grad:undefined;}});
  const els=new Map(),notes=[];
  function el(id){if(!els.has(id))els.set(id,{id,style:{},dataset:{},
    classList:{add(){},remove(){},toggle(){}},textContent:'',innerHTML:'',
    setAttribute(){},addEventListener(){},setPointerCapture(){},
    querySelectorAll(){return[]},rect:{width:320,height:192},getBoundingClientRect(){return this.rect},
    getContext(){return drawing}});return els.get(id);}
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
  const box={console,setTimeout(){},
    document:{hidden:false,body,documentElement:{},getElementById:el,querySelectorAll(){return[]},
      addEventListener(type){docEvents.push(type)}},
    window:{AudioContext},performance:{now:()=>0},devicePixelRatio:1,
    addEventListener(){},requestAnimationFrame(){}};
  vm.createContext(box);
  /* The page loads the shared coin-op module before the game's own script,
     so the harness does too: without it Arcade.init() at boot is a
     ReferenceError and nothing in the game runs at all. */
  vm.runInContext(require('node:fs').readFileSync(
    require('node:path').join(__dirname,'../../shared/arcade.js'),'utf8'),box);
  vm.runInContext(source,box);
  const run=c=>vm.runInContext(c,box);
  run(`newGame(${diff},${seed});`);
  return {run,notes,el,cls,docEvents};
}
// Drop the explorer onto an empty stretch of floor with nothing else alive nearby.
function clearRoom(r,floor=2){
  r.run(`G.L.enemies=[];G.L.chests=[];G.L.crushers=[];G.L.shots=[];G.L.bombs=[];
   for(let x=1;x<MAPW-1;x++)for(let y=bandTop(${floor})+1;y<bandFloor(${floor});y++)G.L.map[x][y]=AIR;
   for(let x=1;x<MAPW-1;x++)G.L.map[x][bandFloor(${floor})]=ROCK;
   G.hero.x=20*TS;G.hero.y=bandFloor(${floor})*TS-G.hero.h;G.hero.vx=0;G.hero.vy=0;G.hero.inv=0;`);
}
const step=(r,n,dt=0.02)=>r.run(`for(let i=0;i<${n};i++)stepGame(${dt});`);

test('The tomb is generated from a seed: same seed, same tomb; more levels when harder',()=>{
  const a=runtime(3,12),b=runtime(3,12),c=runtime(3,13);
  const dump=r=>r.run('G.levels.map(L=>L.map.map(col=>col.join("")).join("")).join("|")');
  assert.equal(dump(a),dump(b));
  assert.notEqual(dump(a),dump(c));
  assert.equal(a.run('G.levels.length'),3+Math.ceil(3/2));
  assert.equal(runtime(8,5).run('G.levels.length'),3+Math.ceil(8/2));
});

test('Every level has an exit up, only the deepest lacks one down, and the idol lies at the bottom',()=>{
  const r=runtime(4,99);
  const n=r.run('G.levels.length');
  for(let d=0;d<n;d++){
    assert.ok(r.run(`!!G.levels[${d}].up`),`level ${d} has an up exit`);
    assert.equal(r.run(`!!G.levels[${d}].down`),d<n-1);
  }
  assert.equal(r.run('G.levels.reduce((a,L)=>a+L.chests.filter(c=>c.item==="idol").length,0)'),1);
  assert.equal(r.run('G.levels[G.levels.length-1].chests.some(c=>c.item==="idol")'),true);
  assert.equal(r.run('G.levels[G.levels.length-1].enemies.some(e=>e.k==="dino")'),true);
});

test('A harder tomb is a more crowded tomb',()=>{
  const easy=runtime(1,4).run('G.levels[0].enemies.length');
  const hard=runtime(8,4).run('G.levels[0].enemies.length');
  assert.ok(hard>easy,`${hard} > ${easy}`);
});

test('Crawling slips under a half-blocked wall that stops a standing explorer',()=>{
  const r=runtime(2,3);clearRoom(r);
  r.run(`const wx=23;for(let y=bandTop(2)+1;y<bandFloor(2)-1;y++)G.L.map[wx][y]=DIRT;
   G.hero.x=21*TS;`);
  r.run('keys.R=true;');step(r,90);
  assert.ok(r.run('G.hero.x')<r.run('23*TS'),'standing hero is stopped by the wall');
  r.run('keys.D=true;');step(r,120);
  assert.ok(r.run('G.hero.crawl'),'hero is crawling');
  assert.ok(r.run('G.hero.x')>r.run('24*TS'),'crawling hero passes under the wall');
});

test('Digging clears dirt only, and never solid rock',()=>{
  const r=runtime(2,3);clearRoom(r);
  r.run(`G.L.map[22][bandFloor(2)-1]=DIRT;G.hero.x=22*TS-G.hero.w-1;G.hero.face=1;keys.USE=true;`);
  step(r,80);
  assert.equal(r.run('G.L.map[22][bandFloor(2)-1]'),0);
  r.run(`G.L.map[22][bandFloor(2)-1]=ROCK;G.dig=null;`);
  step(r,120);
  assert.equal(r.run('G.L.map[22][bandFloor(2)-1]'),1);
});

test('Dynamite blows dirt open, kills what is beside it and wounds a careless thrower',()=>{
  const r=runtime(2,3);clearRoom(r);
  r.run(`G.L.map[21][bandFloor(2)-1]=DIRT;G.L.map[21][bandFloor(2)-2]=DIRT;
   G.L.enemies=[mkFoe("spider",21*TS,bandFloor(2)*TS-10,2,1)];
   G.hero.weapon="dynamite";G.hero.dynamite=3;G.hero.hp=100;G.hero.inv=0;attack();`);
  assert.equal(r.run('G.hero.dynamite'),2);
  step(r,140);
  assert.equal(r.run('G.L.map[21][bandFloor(2)-1]'),0);
  assert.equal(r.run('G.L.enemies[0].dead'),true);
  assert.ok(r.run('G.hero.hp')<100,'standing on your own charge hurts');
});

test('A standing machete swing passes over a serpent; a crawling stab reaches it',()=>{
  const r=runtime(2,3);clearRoom(r);
  const put=()=>r.run(`G.L.enemies=[mkFoe("snake",G.hero.x+G.hero.w+2,bandFloor(2)*TS-6,2,-1)];
    G.hero.machete=true;G.hero.weapon="machete";G.hero.face=1;G.hero.cool=0;`);
  put();r.run('attack();meleeStep();');
  assert.equal(r.run('G.L.enemies[0].hp'),r.run('mkFoe("snake",0,0,2,1).hp'));
  r.run('keys.D=true;');step(r,10);r.run('keys.D=false;');
  put();r.run('setStance(G.hero,true);attack();meleeStep();');
  assert.ok(r.run('G.L.enemies[0].hp')<r.run('mkFoe("snake",0,0,2,1).hp'),'a low stab connects');
  // The same standing swing does reach a jaguar.
  r.run(`setStance(G.hero,false);G.hero.cool=0;
   G.L.enemies=[mkFoe("jaguar",G.hero.x+G.hero.w+2,bandFloor(2)*TS-12,2,-1)];attack();meleeStep();`);
  assert.ok(r.run('G.L.enemies[0].hp')<r.run('mkFoe("jaguar",0,0,2,1).hp'));
});

test('The pistol spends bullets, stops at rock and refuses to fire when empty',()=>{
  const r=runtime(2,3);clearRoom(r);
  r.run(`G.hero.weapon="pistol";G.hero.bullets=2;G.hero.face=1;G.hero.cool=0;
   G.L.enemies=[mkFoe("spider",G.hero.x+60,bandFloor(2)*TS-10,2,-1)];attack();`);
  assert.equal(r.run('G.hero.bullets'),1);
  step(r,40);
  assert.ok(r.run('G.L.enemies[0].hp')<r.run('mkFoe("spider",0,0,2,1).hp'));
  r.run(`G.hero.cool=0;G.L.enemies=[];
   for(let y=bandTop(2)+1;y<bandFloor(2);y++)G.L.map[22][y]=ROCK;G.hero.x=20*TS;attack();`);
  step(r,40);
  assert.equal(r.run('G.L.shots.length'),0);
  r.run('G.hero.cool=0;G.hero.bullets=0;attack();');
  assert.equal(r.run('G.L.shots.length'),0);
  assert.equal(r.run('G.hero.bullets'),0);
});

test('Spikes wound and deep water drowns',()=>{
  const r=runtime(2,3);clearRoom(r);
  r.run(`G.L.map[20][bandFloor(2)]=SPIKE;G.hero.hp=100;G.hero.inv=0;`);
  step(r,60);
  assert.ok(r.run('G.hero.hp')<100);
  const r2=runtime(2,3);clearRoom(r2);
  r2.run(`for(let y=bandFloor(2)-2;y<=bandFloor(2);y++)G.L.map[20][y]=WATER;
   G.hero.hp=100;G.hero.inv=0;G.hero.x=20*TS;G.hero.y=(bandFloor(2)-1)*TS;`);
  step(r2,60);
  assert.ok(r2.run('G.hero.hp')<100,'a submerged head drowns');
});

test('Enemies do damage on contact, and dying ends the run',()=>{
  const r=runtime(2,3);clearRoom(r);
  r.run(`G.L.enemies=[mkFoe("jaguar",G.hero.x+6,bandFloor(2)*TS-12,2,-1)];G.hero.hp=20;G.hero.inv=0;`);
  step(r,60);
  assert.equal(r.run('G.phase'),'dead');
});

test('Stairs and shafts move between floors and levels, and opened chests stay opened',()=>{
  const r=runtime(3,21);
  r.run('G.L.chests[0].open=false;openChest(G.L.chests[0]);G.L.chests.forEach(c=>c.open=true);');
  assert.equal(r.run('G.L.chests[0].open'),true);
  r.run('G.hero.x=G.L.down.x;G.hero.y=bandFloor(FLOORS-1)*TS-G.hero.h;');
  assert.equal(r.run('useAction()'),'down');
  assert.equal(r.run('G.depth'),1);
  assert.equal(r.run('useAction()'),'up');
  assert.equal(r.run('G.depth'),0);
  assert.equal(r.run('G.levels[0].chests[0].open'),true);
});

test('There is no leaving without the idol, and the idol pays by difficulty',()=>{
  const r=runtime(4,33);
  r.run('G.hero.x=G.L.up.x;G.hero.y=bandFloor(0)*TS-G.hero.h;');
  assert.equal(r.run('useAction()'),'blocked');
  assert.equal(r.run('G.phase'),'play');
  r.run('G.hero.idol=true;G.score=0;G.time=10;');
  assert.equal(r.run('useAction()'),'won');
  assert.equal(r.run('G.phase'),'won');
  assert.ok(r.run('G.score')>=4000,'idol bounty scales with difficulty');
  const easy=runtime(1,33);
  easy.run('G.hero.x=G.L.up.x;G.hero.y=bandFloor(0)*TS-G.hero.h;G.hero.idol=true;G.score=0;G.time=10;useAction();');
  assert.ok(easy.run('G.score')<r.run('G.score'));
});

test('Picking up loot arms the explorer; the idol is worth taking',()=>{
  const r=runtime(2,3);clearRoom(r);
  r.run(`G.hero.machete=false;G.hero.bullets=0;G.hero.dynamite=0;G.hero.hp=10;
   const c=(item)=>({x:G.hero.x,y:G.hero.y,w:14,h:12,open:false,item,kind:"chest"});
   openChest(c("machete"));openChest(c("bullets"));openChest(c("dynamite"));openChest(c("potion"));`);
  assert.equal(r.run('G.hero.machete'),true);
  assert.equal(r.run('G.hero.bullets'),6);
  assert.equal(r.run('G.hero.dynamite'),2);
  assert.equal(r.run('G.hero.hp'),45);
  r.run(`G.score=0;openChest({x:0,y:0,w:14,h:12,open:false,item:"idol",kind:"chest"});`);
  assert.equal(r.run('G.hero.idol'),true);
  assert.equal(r.run('G.score'),500);
});

test('Sound effects are distinct, and muting silences them',()=>{
  const r=runtime(2,3);
  r.run('unlockAudio();shotSound();boomSound();');
  assert.ok(r.notes.length>=3);
  assert.notEqual(r.notes[0],r.notes[1]);
  const n=r.notes.length;
  r.run('SOUND.enabled=false;shotSound();hitSound();');
  assert.equal(r.notes.length,n);
});

test('A frame renders and the status line reports the descent',()=>{
  const r=runtime(2,3);
  r.run('render();updateStatus();');
  assert.match(r.run('document.getElementById("status").innerHTML'),/Depth 1\/\d+/);
});

test('Full screen isolates the controls, and the layout drops when fullscreen ends',()=>{
  const r=runtime();
  assert.equal(r.cls.has('fs'),false);
  r.run('toggleFullscreen();');
  assert.equal(r.cls.has('fs'),true,'the focus layout is applied');
  assert.match(r.el('fs').textContent,/EXIT FULL SCREEN/);
  r.run('toggleFullscreen();');
  assert.equal(r.cls.has('fs'),false);
  assert.equal(r.el('fs').textContent,'FULL SCREEN');
  // Escape or the system gesture leaves native fullscreen; the layout follows it out.
  r.run('toggleFullscreen();setFocus(false);');
  assert.equal(r.cls.has('fs'),false);
});

test('The buttons name the weapon in hand and the action underfoot',()=>{
  const r=runtime(2,3);clearRoom(r);
  r.run('G.hero.weapon="pistol";G.hero.pistol=true;G.hero.bullets=4;updatePads();');
  assert.equal(r.el('firebtn').dataset.lbl,'SHOOT 4');
  r.run('G.hero.machete=true;G.hero.weapon="machete";updatePads();');
  assert.equal(r.el('firebtn').dataset.lbl,'MACHETE');
  r.run('G.hero.weapon="dynamite";G.hero.dynamite=2;updatePads();');
  assert.equal(r.el('firebtn').dataset.lbl,'LIGHT 2');
  assert.equal(r.run('actionLabel()'),'USE');
  r.run('G.L.chests=[{x:G.hero.x,y:G.hero.y,w:14,h:12,open:false,item:"potion",kind:"chest"}];');
  assert.equal(r.run('actionLabel()'),'OPEN');
  r.run('G.L.chests=[];G.L.map[Math.floor((G.hero.x+G.hero.w+2)/TS)][Math.floor((G.hero.y+G.hero.h*.5)/TS)]=DIRT;G.hero.face=1;');
  assert.equal(r.run('actionLabel()'),'DIG');
  const r2=runtime(3,21);
  r2.run('G.hero.x=G.L.down.x;G.hero.y=bandFloor(FLOORS-1)*TS-G.hero.h;G.L.chests=[];');
  assert.equal(r2.run('actionLabel()'),'GO DOWN');
  r2.run('G.hero.x=G.L.up.x;G.hero.y=bandFloor(0)*TS-G.hero.h;');
  assert.equal(r2.run('actionLabel()'),'NEED IDOL');
  r2.run('G.hero.idol=true;');
  assert.equal(r2.run('actionLabel()'),'ESCAPE');
  r2.run('updatePads();');
  assert.equal(r2.el('usebtn').dataset.lbl,'ESCAPE');
});

test('The view takes the shape of the screen it is drawn on',()=>{
  const r=runtime(2,3);
  r.run('fit();');
  const w0=r.run('VW'), h0=r.run('VH');
  assert.equal(w0,320);assert.equal(h0,192);
  r.el('cv').rect={width:720,height:540};      // a taller box in full screen
  r.run('fit();');
  assert.equal(r.run('VW'),360);
  assert.equal(r.run('VH'),270,'more tomb is visible, not more letterbox');
  assert.equal(r.el('cv').width,360);
  assert.equal(r.el('cv').height,270);
  r.el('cv').rect={width:2000,height:1400};    // clamped so the pixels stay chunky
  r.run('fit();');
  assert.ok(r.run('VW')<=520&&r.run('VH')<=300);
  r.run('render();');                          // a view larger than the map still draws
});

test('A held button is an input, never a text selection',()=>{
  const r=runtime();
  for(const ev of ['contextmenu','selectstart','dragstart'])
    assert.ok(r.docEvents.includes(ev),ev+' is refused inside the UI');
  // iOS Safari reads only the prefixed properties, so they have to be in the sheet.
  const css=require('node:fs').readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8')
    .split('<style>')[1].split('</style>')[0];
  assert.match(css,/-webkit-user-select:none/);
  assert.match(css,/-webkit-touch-callout:none/);
  for(const sel of ['.btn','.menuitem','canvas'])
    assert.ok(css.includes(sel),sel+' is covered by the no-select rule');
});

// The stub clock does not run on its own, so the tests wind it forward by hand.
const play=(r,seconds)=>r.run(`SOUND.ctx.currentTime+=${seconds};musicTick();`);

test('The score plays, follows the game, and answers the mute',()=>{
  const r=runtime();
  r.run('mainMenu();unlockAudio();musicForState();');   // the title screen has a theme
  assert.equal(r.run('MUSIC.name'),'title');
  const before=r.notes.length;
  play(r,1);
  assert.ok(r.notes.length>before,'notes are scheduled ahead of the clock');
  const first=r.run('SONGS.title.lead.find(n=>n)');
  assert.ok(r.notes.some(hz=>Math.abs(hz-r.run(`nf(${first})`))<.01),'the melody is the written one');
  r.run('newGame(2,5);musicForState();');           // in the tomb
  assert.equal(r.run('MUSIC.name'),'delve');
  r.run('G.hero.idol=true;musicForState();');       // and once the idol is yours
  assert.equal(r.run('MUSIC.name'),'flight');
  assert.ok(r.run('SONGS.flight.bpm')>r.run('SONGS.delve.bpm'),'the chase is quicker');
  r.run('G.phase="paused";musicForState();');
  assert.equal(r.run('MUSIC.name'),null,'a paused game is a silent one');
  const quiet=r.notes.length;
  play(r,1);
  assert.equal(r.notes.length,quiet);
  r.run('G.phase="play";musicForState();SOUND.enabled=false;');
  play(r,1);
  assert.equal(r.notes.length,quiet,'mute silences the music too');
  r.run('SOUND.enabled=true;setMusic(false);musicForState();');
  play(r,1);
  assert.equal(r.notes.length,quiet,'and so does turning the music off on its own');
  r.run('setMusic(true);musicForState();');
  play(r,1);
  assert.ok(r.notes.length>quiet,'turning it back on resumes it');
});

test('Deeper levels press the tempo',()=>{
  const r=runtime(3,21);
  const top=r.run('SONGS.delve.bpm');
  r.run('G.hero.x=G.L.down.x;G.hero.y=bandFloor(FLOORS-1)*TS-G.hero.h;G.L.chests=[];useAction();');
  assert.equal(r.run('G.depth'),1);
  assert.ok(r.run('SONGS.delve.bpm')>top,'one level down beats faster');
  r.run('newGame(3,21);');
  assert.equal(r.run('SONGS.delve.bpm'),top,'and a new tomb starts from the top again');
});
