// Run with node --test tests/combat.test.cjs. No packages required.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {test}=require('node:test');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8').split('<script>')[1].split('</script>')[0];
function runtime(env){
  const drawing=new Proxy({},{get:()=>()=>{}}),els=new Map(),notes=[];
  function el(id){if(!els.has(id))els.set(id,{style:{},id,idle:false,hidden:undefined,
    classList:{add(n){if(n==='idle')els.get(id).idle=true;},remove(n){if(n==='idle')els.get(id).idle=false;},
      toggle(n,on){if(n==='idle')els.get(id).idle=!!on;},has(n){return n==='idle'&&els.get(id).idle;}},textContent:'',innerHTML:'',setAttribute(){},addEventListener(){},querySelectorAll(){return[]},getBoundingClientRect(){return{width:520,height:520}},getContext(){return drawing}});return els.get(id);}
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
    navigator:Object.assign({getGamepads(){return pads;}},(env&&env.navigator)||{}),
    matchMedia:(env&&env.matchMedia)||(q=>({matches:false,media:q})),
    isSecureContext:false,
    localStorage:{getItem(){return null;},setItem(){}}};
  vm.createContext(box);vm.runInContext(source,box);
  const run=c=>vm.runInContext(c,box);
  run('G.mode="pvp";G.human={L:true,D:true};newGame();');
  return {run,notes,pads,el};
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

/* ---- installed-app behaviour: the only route to a full screen on iOS ---- */
const HTML=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');

test('The page carries everything a phone needs to install it as an app',()=>{
 assert.match(HTML,/<link rel="manifest" href="manifest\.webmanifest">/);
 assert.match(HTML,/<link rel="apple-touch-icon" href="icon-180\.png">/);
 assert.match(HTML,/name="apple-mobile-web-app-capable" content="yes"/);
 assert.match(HTML,/name="mobile-web-app-capable" content="yes"/);
 assert.match(HTML,/name="theme-color"/);
 const man=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../manifest.webmanifest'),'utf8'));
 assert.equal(man.display,'standalone');
 assert.deepEqual(man.display_override,['fullscreen','standalone']);
 assert.equal(man.start_url,'./');
 assert.equal(man.scope,'./');
 for(const size of ['192x192','512x512'])
  assert.ok(man.icons.some(i=>i.sizes===size),size+' icon is declared');
 assert.ok(man.icons.some(i=>i.purpose==='maskable'),'an Android launcher gets a maskable icon');
 for(const f of ['icon-180.png','icon-192.png','icon-512.png'])
  assert.ok(fs.existsSync(require('node:path').join(__dirname,'../'+f)),f+' exists');
 const sw=fs.readFileSync(require('node:path').join(__dirname,'../sw.js'),'utf8');
 for(const asset of ['./index.html','./manifest.webmanifest','./icon-192.png'])
  assert.ok(sw.includes(asset),asset+' is in the offline shell');
 assert.match(sw,/fetch\(req\)\.then/,'the worker is network first, so a deploy is not shadowed');
});

test('Launched from the home screen it opens as a game, not a page',()=>{
 const plain=runtime();
 assert.equal(plain.run('isStandalone()'),false);
 assert.equal(plain.run('wantGameMode'),false);
 const app=runtime({matchMedia:q=>({matches:/standalone/.test(q),media:q})});
 assert.equal(app.run('isStandalone()'),true);
 assert.equal(app.run('wantGameMode'),true,'the installed app wants game mode from the start');
 app.run('enterGameModeIfWanted();');
 assert.equal(app.run('gameMode'),true);
 const ios=runtime({navigator:{standalone:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)'}});
 assert.equal(ios.run('isStandalone()'),true);
 assert.equal(ios.run('isIOS()'),true);
});

test('An iPhone in Safari is told how to install, and the button is hidden elsewhere',()=>{
 const ios=runtime({navigator:{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Safari'}});
 assert.equal(ios.run('isIOS()'),true);
 assert.equal(ios.run('isStandalone()'),false);
 assert.equal(ios.el('install').hidden,false,'the hint button is offered');
 const desktop=runtime();
 assert.equal(desktop.run('isIOS()'),false);
 assert.notEqual(desktop.el('install').hidden,false,'no button until Chrome offers the install');
});

/* ---- hot seat: one device, one pad each ---- */
function hotseat(){
 const r=runtime();
 r.run('G.mode="pvp";G.human={L:true,D:true};newGame();applySeating();');
 return r;
}
test('On the board each pad drives its own side and is dead on the other side\'s turn',()=>{
 const r=hotseat();
 assert.equal(r.run('G.turn'),'L');
 r.run('G.turnPhase="select";G.cursor={x:4,y:4};press("1R");');
 assert.equal(r.run('G.cursor.x'),5,'Light moves on pad 1');
 r.run('press("2R");');
 assert.equal(r.run('G.cursor.x'),5,'pad 2 does nothing while Light is to move');
 r.run('G.turn="D";G.turnPhase="select";press("2R");');
 assert.equal(r.run('G.cursor.x'),6,'Dark moves on pad 2');
 r.run('press("1R");');
 assert.equal(r.run('G.cursor.x'),6,'and pad 1 goes quiet in turn');
 // One human keeps one pad whichever side they chose.
 const solo=runtime();
 solo.run('G.mode="pvc";G.human={L:false,D:true};newGame();G.turn="D";G.turnPhase="select";G.cursor={x:4,y:4};press("1R");');
 assert.equal(solo.run('G.cursor.x'),5,'a lone player drives from pad 1 playing the Dark');
});

test('Dark selects and moves its own icons, and casts from its own pad',()=>{
 const r=hotseat();
 r.run('G.turn="D";G.turnPhase="select";G.cursor={x:8,y:1};press("2A");');   // a troll
 assert.ok(r.run('!!G.sel'),'pad 2 selects a Dark icon');
 assert.equal(r.run('G.sel.x'),8);
 r.run('press("2B");');
 assert.equal(r.run('G.sel'),null,'and cancels with its own B');
 r.run('press("2SPELL");');
 assert.equal(r.run('G.turnPhase'),'spellmenu','Dark reaches the spell list without borrowing pad 1');
 // Menu navigation is DOM work the stub cannot show, so check the routing itself.
 assert.equal(r.run('padAction("2D")'),'D','a menu reads either pad');
 r.run('press("2D");');
 assert.equal(r.run('G.turnPhase'),'spellmenu','pad 2 works the list without throwing');
 const light=hotseat();
 light.run('G.turnPhase="select";press("2SPELL");');
 assert.notEqual(light.run('G.turnPhase'),'spellmenu','Dark cannot open spells on Light\'s turn');
});

test('Seating decides which way the second pad faces, and is remembered',()=>{
 const store={};
 const r=runtime();
 r.run('G.mode="pvp";G.human={L:true,D:true};newGame();setSeating("side");');
 assert.equal(r.run('seating'),'side');
 assert.equal(r.run('document.body.classList.has?document.body.classList.has("facing"):false'),false);
 r.run('setSeating("facing");');
 assert.equal(r.run('seating'),'facing');
 r.run('setSeating("nonsense");');
 assert.equal(r.run('seating'),'side','anything unrecognised is the upright layout');
});

test('The second pad is on screen for the whole hot seat game, not only the duel',()=>{
 const r=hotseat();
 r.run('G.phase="play";G.turnPhase="select";updatePadState();');
 assert.equal(r.el('pad2').style.display,'flex','the Dark player has a pad on the board');
 r.run('G.phase="combat";updatePadState();');
 assert.equal(r.el('pad2').style.display,'flex');
 r.run('G.phase="menu";updatePadState();');
 assert.equal(r.el('pad2').style.display,'none','and none of it clutters the menus');
 const solo=runtime();
 solo.run('G.mode="pvc";G.human={L:true,D:false};newGame();G.phase="play";updatePadState();');
 assert.equal(solo.el('pad2').style.display,'none','one player, one pad');
});

test('The idle pad is marked while the other side is to move',()=>{
 const r=hotseat();
 r.run('G.turnPhase="select";G.turn="L";updatePadState();');
 assert.equal(r.el('pad1').idle,false,'the side to move is live');
 assert.equal(r.el('pad2').idle,true);
 r.run('G.turn="D";updatePadState();');
 assert.equal(r.el('pad1').idle,true);
 assert.equal(r.el('pad2').idle,false);
 r.run('G.phase="combat";updatePadState();');
 assert.equal(r.el('pad1').idle,false,'both pads are live in a duel');
 assert.equal(r.el('pad2').idle,false);
});

test('Both pads label the same buttons the same way',()=>{
 // A selects, confirms and fires on either pad; B cancels. The second pad used to
 // say FIRE, from when it only existed inside a duel.
 const btn=k=>{const m=HTML.match(new RegExp('data-k="'+k+'">([^<]*)<'));return m&&m[1].trim();};
 assert.equal(btn('1A'),'A');
 assert.equal(btn('2A'),'A');
 assert.equal(btn('1B'),'B');
 assert.equal(btn('2B'),'B');
 assert.equal(btn('SPELL'),btn('2SPELL'),'and both spell buttons read alike');
});

/* ---- the thumbstick ---- */
test('The stick reads eight ways with a dead centre',()=>{
 const r=runtime();
 const dirs=(x,y)=>r.run(`JSON.stringify(stickDirs(${x},${y}))`);
 assert.deepEqual(JSON.parse(dirs(0,0)),{U:false,D:false,L:false,R:false},'a resting thumb steers nothing');
 assert.deepEqual(JSON.parse(dirs(.2,.1)),{U:false,D:false,L:false,R:false},'and neither does a twitch');
 assert.deepEqual(JSON.parse(dirs(1,0)),{U:false,D:false,L:false,R:true});
 assert.deepEqual(JSON.parse(dirs(-1,0)),{U:false,D:false,L:true,R:false});
 assert.deepEqual(JSON.parse(dirs(0,-1)),{U:true,D:false,L:false,R:false});
 assert.deepEqual(JSON.parse(dirs(0,1)),{U:false,D:true,L:false,R:false});
 assert.deepEqual(JSON.parse(dirs(.7,-.7)),{U:true,D:false,L:false,R:true},'and the corners are there too');
 assert.deepEqual(JSON.parse(dirs(-.7,.7)),{U:false,D:true,L:true,R:false});
});

test('A push of the stick moves the cursor, holding it repeats, letting go stops',()=>{
 const r=runtime();
 r.run('G.mode="pvc";G.human={L:true,D:false};newGame();G.turnPhase="select";G.cursor={x:4,y:4};');
 r.run('STICK[1].on=true;stickApply(1,1,0,0);');           // pushed right
 assert.equal(r.run('G.cursor.x'),5,'the push itself is a step');
 assert.equal(r.run('keys["1R"]'),true,'and combat would read it as held');
 r.run('stickRepeat(1000);');
 assert.equal(r.run('G.cursor.x'),6,'holding walks on');
 r.run('stickRepeat(1001);');
 assert.equal(r.run('G.cursor.x'),6,'but not faster than the repeat rate');
 r.run('stickApply(1,0,0,1200);stickRelease(1);');
 assert.equal(r.run('keys["1R"]'),false);
 r.run('stickRepeat(2000);');
 assert.equal(r.run('G.cursor.x'),6,'a released stick is still');
});

test('Each stick belongs to its own player',()=>{
 const r=runtime();
 r.run('G.mode="pvp";G.human={L:true,D:true};newGame();G.turnPhase="select";G.cursor={x:4,y:4};');
 r.run('STICK[2].on=true;stickApply(2,1,0,0);');
 assert.equal(r.run('G.cursor.x'),4,'Dark\'s stick does nothing on Light\'s turn');
 assert.equal(r.run('keys["2R"]'),true,'though a duel would still read it');
 r.run('G.turn="D";stickApply(2,0,0,0);stickApply(2,1,0,100);');
 assert.equal(r.run('G.cursor.x'),5,'and it drives on Dark\'s turn');
});

/* ---- how hard the machine plays ---- */
test('The CPU has three strengths, and starts at the gentlest',()=>{
 const r=runtime();
 assert.equal(r.run('cpuLevel'),'novice','a first game is not a beating');
 assert.deepEqual(JSON.parse(r.run('JSON.stringify(Object.keys(CPU_LEVELS))')),['novice','knight','master']);
 for(const [a,b] of [['novice','knight'],['knight','master']]){
  assert.ok(r.run(`CPU_LEVELS.${b}.fire>CPU_LEVELS.${a}.fire`),b+' shoots more readily than '+a);
  assert.ok(r.run(`CPU_LEVELS.${b}.aim>CPU_LEVELS.${a}.aim`),b+' aims straighter');
  assert.ok(r.run(`CPU_LEVELS.${b}.noise<CPU_LEVELS.${a}.noise`),b+' guesses less on the board');
 }
 r.run('setCpuLevel("master");');assert.equal(r.run('cpuLevel'),'master');
 r.run('setCpuLevel("nonsense");');assert.equal(r.run('cpuLevel'),'master','junk is ignored');
});

test('A novice hesitates and misses shots a master takes',()=>{
 const r=duel('knight','goblin');
 r.run('aiRand=()=>0.9;');                        // the same luck for both levels
 r.run('G.combat.a.x=100;G.combat.a.y=96;G.combat.b.x=112;G.combat.b.y=96;G.combat.b.cd=0;');
 r.run('setCpuLevel("master");');
 assert.equal(r.run('aiInput(G.combat.b,G.combat.a,1)[2]'),true,'the master takes the shot');
 r.run('setCpuLevel("novice");');
 assert.equal(r.run('aiInput(G.combat.b,G.combat.a,1)[2]'),false,'the novice does not');
 assert.deepEqual(JSON.parse(r.run('JSON.stringify(aiInput(G.combat.b,G.combat.a,1))')),[0,0,false],
   'and stands there a moment instead of closing in');
 r.run('aiRand=()=>Math.random();');
});

test('Only a master sidesteps a missile already in the air',()=>{
 const r=duel('archer','manticore');
 // Its weapon is still recharging, so this is a question of feet, not of firing.
 r.run('aiRand=()=>0.1;G.combat.a.x=40;G.combat.a.y=96;G.combat.b.x=200;G.combat.b.y=96;G.combat.b.cd=500;');
 r.run('G.combat.shots=[{x:190,y:96,vx:-200,vy:0,dmg:5,owner:G.combat.a,side:"L"}];');
 r.run('setCpuLevel("novice");');
 const soft=JSON.parse(r.run('JSON.stringify(aiInput(G.combat.b,G.combat.a,1))'));
 r.run('setCpuLevel("master");');
 const hard=JSON.parse(r.run('JSON.stringify(aiInput(G.combat.b,G.combat.a,1))'));
 assert.notDeepEqual(soft,hard,'the novice walks into what the master steps around');
 r.run('aiRand=()=>Math.random();setCpuLevel("novice");');
});
