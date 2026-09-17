// Run with node --test tests/combat.test.cjs. No packages required.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {test}=require('node:test');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8').split('<script>')[1].split('</script>')[0];
function runtime(){
  const drawing=new Proxy({},{get:()=>()=>{}}),els=new Map(),notes=[];
  function el(id){if(!els.has(id))els.set(id,{style:{},classList:{add(){},remove(){},toggle(){}},textContent:'',innerHTML:'',setAttribute(){},addEventListener(){},querySelectorAll(){return[]},getBoundingClientRect(){return{width:520,height:520}},getContext(){return drawing}});return els.get(id);}
  class AudioContext{
    constructor(){this.state='running';this.currentTime=0;this.destination={};}
    createGain(){return{gain:{value:1,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
    createOscillator(){return {frequency:{setValueAtTime(hz){notes.push(hz)},exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){},stop(){}};}
    resume(){return Promise.resolve();}
  }
  const pads=[];
  const box={console,document:{hidden:false,getElementById:el,querySelectorAll(){return[]},addEventListener(){},
    body:el('body'),documentElement:el('html'),elementFromPoint(){return null}},
    window:{AudioContext},performance:{now:()=>0},devicePixelRatio:1,addEventListener(){},requestAnimationFrame(){},
    navigator:{getGamepads(){return pads;}}};
  vm.createContext(box);vm.runInContext(source,box);
  const run=c=>vm.runInContext(c,box);
  run('G.mode="pvp";G.human={L:true,D:true};newGame();');
  return {run,notes,pads};
}
function duel(a='archer',b='manticore'){
 const r=runtime();r.run(`startCombat(mk('${a}','L'),mk('${b}','D'),4,4);G.combat.barriers=[];`);return r;
}
test('Original board layout and six-stage luminosity cycle',()=>{
 const r=runtime();assert.equal(r.run('KIND[0][0]'),'D');assert.equal(r.run('KIND[0][4]'),'L');assert.equal(r.run('KIND[8][4]'),'D');
 for(const [x,y]of[[3,0],[2,1],[1,2],[0,3],[8,5],[6,7]])assert.equal(r.run(`KIND[${x}][${y}]`),'O');
 assert.equal(r.run('C64_CYCLE.length'),6);r.run('G.lum=4;G.lumDir=1;G.turn="D";completeTurn();');assert.equal(r.run('G.lum'),5);assert.equal(r.run('G.lumDir'),-1);
 r.run('completeTurn();');assert.equal(r.run('G.lum'),5);
});
test('Holding fire roots the fighter but allows eight-direction aim',()=>{
 const r=duel();r.run('keys["1R"]=true;keys["1U"]=true;keys["1A"]=true;combatStep(.05,50);');
 assert.equal(r.run('G.combat.a.x'),24);assert.equal(r.run('G.combat.a.y'),96);
 assert.ok(r.run('G.combat.shots[0].vx>0&&G.combat.shots[0].vy<0'));
 r.run('keys["1A"]=false;combatStep(.05,100);');assert.ok(r.run('G.combat.a.x>24&&G.combat.a.y<96'));
});
test('Barriers have invisible, slowing and solid stages',()=>{
 const r=duel();r.run('G.combat.lum=0;G.combat.barriers=[{x:100,y:60,w:10,h:12,phase:0}];');
 for(const [time,factor]of[[0,1],[1.1,.62],[2.1,.32],[3.1,0]]){r.run(`G.combat.time=${time}`);assert.equal(r.run('barrierFactor(105,66)'),factor);}
 r.run('G.combat.time=0;');assert.equal(r.run('blocked(105,66)'),false);
});
test('Fading barriers slow fighters and missiles, solid ones stop shots',()=>{
 const r=duel();r.run('G.combat.lum=0;G.combat.barriers=[{x:80,y:70,w:30,h:40,phase:0}];G.combat.time=1.1;G.combat.a.x=95;G.combat.a.y=90;moveFighter(G.combat.a,10,0);');
 assert.ok(Math.abs(r.run('G.combat.a.x')-101.2)<.001);
 r.run('G.combat.shots=[{x:95,y:90,vx:100,vy:0,dmg:10,owner:G.combat.a,side:"L"}];combatStep(.05,50);');
 assert.ok(Math.abs(r.run('G.combat.shots[0].x')-98.1)<.001);
 r.run('G.combat.time=3.1;combatStep(.01,60);');assert.equal(r.run('G.combat.shots.length'),0);
});
test('Narrow barriers cannot be tunnelled through by fast projectiles',()=>{
 const r=duel();r.run('G.combat.lum=0;G.combat.time=4;G.combat.barriers=[{x:100,y:60,w:10,h:12,phase:0}];G.combat.shots=[{x:80,y:66,vx:1000,vy:0,dmg:10,owner:G.combat.a,side:"L"}];combatStep(.05,50);');
 assert.equal(r.run('G.combat.shots.length'),0);
});
test('An obstacle solidifying around a fighter ejects it',()=>{
 const r=duel();r.run('G.combat.lum=0;G.combat.time=2.99;G.combat.barriers=[{x:100,y:60,w:10,h:12,phase:0,wasSolid:false}];G.combat.a.x=105;G.combat.a.y=66;combatStep(.05,50);');
 assert.equal(r.run('blocked(G.combat.a.x,G.combat.a.y)'),false);
});
test('Area attacks damage throughout exposure; only Phoenix shields itself',()=>{
 const r=duel('phoenix','banshee');r.run('G.combat.a.x=140;G.combat.b.x=165;doAttack(G.combat.a,G.combat.b,[]);');
 const before=r.run('G.combat.b.hp');r.run('combatStep(.05,50);');const after=r.run('G.combat.b.hp');r.run('combatStep(.05,100);');assert.ok(before>after&&after>r.run('G.combat.b.hp'));
 const phoenixHp=r.run('G.combat.a.hp');r.run('hurt(G.combat.a,20);');assert.equal(r.run('G.combat.a.hp'),phoenixHp);
 r.run('doAttack(G.combat.b,G.combat.a,[]);');const bansheeHp=r.run('G.combat.b.hp');r.run('hurt(G.combat.b,20);');assert.equal(r.run('G.combat.b.hp'),bansheeHp-20);
});
test('Damage is deterministic and no health drains after fifty seconds',()=>{
 const r=duel();const hp=r.run('G.combat.a.hp');r.run('hurt(G.combat.a,10);');assert.equal(r.run('G.combat.a.hp'),hp-10);
 r.run('G.combat.time=60;combatStep(.05,60050);');assert.equal(r.run('G.combat.a.hp'),hp-10);
});
test('Missiles already fired can cause a double kill',()=>{
 const r=duel();r.run('G.combat.a.hp=0;G.combat.b.hp=1;G.combat.shots=[{x:270,y:96,vx:100,vy:0,dmg:10,owner:G.combat.a,side:"L"}];');
 for(let i=0;i<8;i++)r.run(`combatStep(.05,${i*50});`);
 assert.ok(r.run('G.combat.a.hp<=0&&G.combat.b.hp<=0'));
});
test('Terrain benefits health rather than multiplying damage; wounded survivors stay wounded',()=>{
 const r=duel();r.run('startCombat(mk("archer","L"),mk("manticore","D"),0,4);G.combat.barriers=[];');
 assert.equal(r.run('G.combat.a.dmg'),r.run('3+TYPES.archer.F*2.3'));
 r.run('G.combat.a.hp*=.5;G.combat.b.hp=0;finishCombat();');assert.ok(r.run('G.grid[0][4].hp<maxHP("archer")'));
 assert.ok(Math.abs(r.run('G.grid[0][4].hp/maxHP("archer")')-.5)<.001);
});
test('Shapeshifter copies attack, interval, speed and Phoenix shielding',()=>{
 const r=duel('phoenix','shapeshifter');assert.equal(r.run('G.combat.b.icon'),'phoenix');assert.equal(r.run('G.combat.b.atk'),'burst');assert.equal(r.run('G.combat.b.rate'),r.run('G.combat.a.rate'));
});
test('Bells distinguish sides, respect mute, and long attacks recharge in two seconds',()=>{
 const r=duel('golem','troll');assert.equal(r.run('G.combat.a.rate'),2000);
 r.run('unlockAudio();readySound("L");readySound("D");');assert.deepEqual(r.notes,[1320,660]);
 r.run('SOUND.enabled=false;readySound("L");');assert.equal(r.notes.length,2);
});
test('An imprisoned mage cannot cast; release follows global cycle, not tile colour',()=>{
 const r=runtime();r.run('G.turnPhase="select";G.grid[0][4].imprisoned=true;openSpells();');assert.match(r.run('G.msg'),/imprisoned mage/);
 r.run('G.lum=3;beginTurn();');assert.equal(r.run('G.grid[0][4].imprisoned'),true);
 r.run('G.lum=0;beginTurn();');assert.equal(r.run('G.grid[0][4].imprisoned'),false);
});
test('Enemy teleport initiates combat and exchange accepts an enemy icon',()=>{
 const r=runtime();r.run('G.target={spell:"teleport",step:1};spellTarget(1,0);spellTarget(7,0);');assert.equal(r.run('G.phase'),'combat');assert.equal(r.run('G.spells.L.teleport'),true);
 r.run('newGame();G.target={spell:"exchange",step:1};spellTarget(1,0);spellTarget(7,0);');assert.equal(r.run('G.grid[1][0].side'),'D');assert.equal(r.run('G.grid[7][0].side'),'L');
});
test('AI duels resolve without forced health drain',()=>{
 const r=duel('knight','goblin');r.run('G.human={L:false,D:false};G.mode="cvc";');
 r.run('for(let i=1;i<12000&&G.combat;i++)combatStep(.02,i*20);');assert.equal(r.run('G.combat'),null);
});

/* ---- full game mode: controls outside the game's own rules ---- */
const gamepad=b=>({buttons:Array.from({length:17},(_,i)=>({pressed:!!b.buttons?.includes(i),value:0})),
  axes:b.axes||[0,0,0,0]});
test('A gamepad drives the pad keys, and a second one drives Dark',()=>{
 const r=duel();
 r.pads.push(gamepad({buttons:[15,0]}));                      // d-pad right + A
 r.run('pollGamepads();');
 assert.equal(r.run('keys["1R"]'),true); assert.equal(r.run('keys["1A"]'),true);
 r.pads[0]=gamepad({axes:[0,-1,0,0]});                        // stick up, buttons released
 r.run('pollGamepads();');
 assert.equal(r.run('keys["1R"]'),false); assert.equal(r.run('keys["1A"]'),false);
 assert.equal(r.run('keys["1U"]'),true);
 r.pads.push(gamepad({buttons:[14]}));                        // second pad: left for Dark
 r.run('pollGamepads();');
 assert.equal(r.run('keys["2L"]'),true);
 r.pads[1]=gamepad({});
 r.run('pollGamepads();'); assert.equal(r.run('keys["2L"]'),false);
});
test('A gamepad never clears a direction the keyboard is holding',()=>{
 const r=duel();
 r.run('keys["1U"]=true;'); r.pads.push(gamepad({buttons:[15]}));
 r.run('pollGamepads();');
 assert.equal(r.run('keys["1U"]'),true);                      // untouched by the pad
 assert.equal(r.run('keys["1R"]'),true);
});
test('Keys map by physical code so non-QWERTY layouts still fire',()=>{
 const r=runtime();
 assert.equal(r.run('mapKey({code:"KeyZ"})'),'1A');
 assert.equal(r.run('mapKey({code:"ShiftRight"})'),'2A');
 assert.equal(r.run('mapKey({code:"Space"})'),'1A');
 assert.equal(r.run('mapKey({key:"ArrowUp"})'),'1U');         // key name is still honoured
 assert.equal(r.run('mapKey({code:"KeyG"})'),'FULL');
 assert.equal(r.run('mapKey({code:"BracketLeft",key:"["})'),null);
});
test('Full game mode toggles from any control and survives a missing Fullscreen API',()=>{
 const r=runtime();
 assert.equal(r.run('gameMode'),false);
 r.run('press("FULL");'); assert.equal(r.run('gameMode'),true);
 r.run('press("FULL");'); assert.equal(r.run('gameMode'),false);
 r.run('G.phase="combat";press("FULL");');                    // reachable mid-duel as well
 assert.equal(r.run('gameMode'),true);
});
test('Sliding across the d-pad hands the direction over without lifting',()=>{
 const r=duel();
 const el=k=>`{dataset:{k:"${k}"},classList:{add(){},remove(){}},`+
   `closest(sel){return sel===".dpad"?DPAD:this}}`;
 r.run(`var DPAD={};var up=${el('1U')},ur=${el('1U,1R')};`);
 r.run('padDown({target:{closest(){return up}},pointerId:1});');
 assert.equal(r.run('keys["1U"]'),true);
 r.run('document.elementFromPoint=()=>ur;padMove({pointerId:1,clientX:0,clientY:0});');
 assert.equal(r.run('keys["1U"]'),true); assert.equal(r.run('keys["1R"]'),true);
 r.run('document.elementFromPoint=()=>null;padMove({pointerId:1,clientX:0,clientY:0});');
 assert.equal(r.run('keys["1U"]'),false); assert.equal(r.run('keys["1R"]'),false);
 r.run('padUp({pointerId:1});'); assert.equal(r.run('holders.size'),0);
});
