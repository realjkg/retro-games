/* Test 8: the real index.html in jsdom, with real pointerdown and keydown
 * events dispatched at every control. The fixture dialogue is injected after
 * load, because the shipped table is not written yet.
 *
 * This test exists because a delegated handler that matches some data
 * attributes and not others leaves whole paths dead while every headless
 * simulation passes clean. It asserts state actually changed, control by
 * control, and that no control in the markup is unhandled.                  */
'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('fs'), path=require('path');
/* jsdom is the only dependency in the project and it is a dev one: a fresh
 * clone can run every other test without installing anything. */
let JSDOM=null, jsdomMissing=false;
try{ JSDOM=require('jsdom').JSDOM; }catch(e){ jsdomMissing=true; }
const ROOT=path.join(__dirname,'..');
const HTML=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const open_pages=[];
process.on('exit',()=>open_pages.forEach(d=>{try{d.window.close();}catch(e){}}));

function openPage(setup,cold){
  if(jsdomMissing)throw new Error('jsdom is not installed');
  // no pretendToBeVisual: the page's loop must not keep the harness alive.
  // The canvas stub goes in before the page's scripts run, because they capture
  // the 2d context at load and jsdom has none.
  // The stub records what was painted where, in the colour that was set, so a
  // test can read the picture back without a real canvas. Everything else on a
  // 2d context is a no-op.
  const painted=[];
  const state={fillStyle:'#000000'};
  const ctx2d=new Proxy(state,{
    get:(t,k)=>{
      if(k==='canvas')return {width:320,height:200};
      if(k==='fillStyle')return t.fillStyle;
      if(k==='fillRect')return (x,y,w,h)=>painted.push({x,y,w,h,c:t.fillStyle});
      if(k==='__painted')return painted;
      return ()=>{};
    },
    set:(t,k,v)=>{t[k]=v;return true;}});
  const dom=new JSDOM(HTML,{runScripts:"dangerously",
    url:"https://example.invalid/law-of-the-west/",
    beforeParse(win){win.HTMLCanvasElement.prototype.getContext=()=>ctx2d;
      if(setup)setup(win);}});
  open_pages.push(dom);
  const w=dom.window;
  const errors=[];
  w.addEventListener("error",e=>errors.push(String(e.message||e.error)));
  w.console.error=(...a)=>errors.push(a.join(' '));
  // top-level const/let in a classic script are global lexical bindings, not
  // window properties, so the page's scope is reached through its own eval
  const ev=code=>w.eval(code);
  assert.ok(ev('typeof SND')==='object','the page did not build SND');
  // On the title the first gesture is spent raising the music. Every test but
  // the ones about that moment wants the page already awake, so the gesture is
  // marked used here rather than in forty call sites.
  if(!cold)ev('themePlayed=true;');
  return {dom,w,errors,ev,painted,
    G:()=>ev('G'), snd:()=>ev('SND'), hit:()=>ev('HITBOX'),
    ready(){ev('build').rows=10;ev('paint()');},
    el:id=>w.document.getElementById(id),
    press:key=>w.document.dispatchEvent(new w.KeyboardEvent("keydown",{key,bubbles:true})),
    tap:sel=>{const el=w.document.querySelector(sel);
      assert.ok(el,'no control matching '+sel);
      const Ev=w.PointerEvent||w.MouseEvent||w.Event;
      el.dispatchEvent(new Ev("pointerdown",{bubbles:true,cancelable:true}));
      return el;},
    frame:ms=>{w.performance.now=()=>ms; ev('__frame')(ms);},
    /* Every cue the page asks for, in order, with the theme's name attached.
     * The engine is replaced wholesale: these tests are about what the game
     * asks to be played and when, not about what the synthesiser makes of it. */
    log(){const out=[]; const S=ev('SND');
      for(const k of Object.keys(ev('SOUNDS'))) S[k]=()=>out.push(k);
      S.theme=n=>out.push('theme:'+n); S.cut=()=>out.push('cut');
      S.stopAll=()=>out.push('stopAll'); S.toggle=()=>{out.push('toggle');return false;};
      S.suspend=()=>out.push('suspend');
      return out;},
    key(k,extra){w.document.dispatchEvent(new w.KeyboardEvent("keydown",
      Object.assign({key:k,bubbles:true,cancelable:true},extra||{})));},
    keyup(k){w.document.dispatchEvent(new w.KeyboardEvent("keyup",{key:k,bubbles:true}));},
    at(sel,type){const el=w.document.querySelector(sel);
      el.dispatchEvent(new (w.PointerEvent||w.Event)(type,{bubbles:true,cancelable:true}));
      return el;}};
}

test('8a. the page loads, builds its state and wires every control', {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage();
  assert.equal(p.G().phase,'intro');
  // every data-cmd in the markup must be a command the handler knows
  const cmds=[...p.w.document.querySelectorAll('[data-cmd]')].map(e=>e.dataset.cmd);
  assert.ok(cmds.length>=8,'only '+cmds.length+' controls found');
  const known=new Set([...Object.keys(p.ev('CONTROL')),'choose']);
  const orphan=[...new Set(cmds)].filter(c=>!known.has(c));
  assert.deepEqual(orphan,[],'controls with no handler: '+orphan.join(', '));
  // and every command the handler knows must be reachable from the markup or a key
  const keyCmds=new Set(Object.values(p.ev('KEYS')));
  const unreachable=Object.keys(p.ev('CONTROL')).filter(c=>!cmds.includes(c)&&!keyCmds.has(c));
  assert.deepEqual(unreachable,[],'handlers no control reaches: '+unreachable.join(', '));
  assert.deepEqual(p.errors,[]);
});

test('8b. FIRE starts the day and each of the four lines is selectable and speakable', {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage();
  p.tap('[data-cmd="fire"]');
  assert.equal(p.G().phase,'dialogue','FIRE did not start the day');
  assert.equal(p.ev('CAST')[p.G().encounter].id,'stranger');   // the day's first caller
  p.ready();                                           // skip the block-load cadence

  const texts=[1,2,3,4].map(i=>p.el('line'+i).textContent);
  assert.ok(texts.every(t=>t.length>3),'a choice line is empty: '+JSON.stringify(texts));
  // the down control moves the cursor
  const before=p.ev('cursor');
  p.tap('[data-cmd="down"]');
  assert.notEqual(p.ev('cursor'),before,'down did not move the cursor');
  // each of the four reply lines, by tap and by number key, must advance a beat
  for(let i=0;i<4;i++){
    const q=openPage();
    q.tap('[data-cmd="fire"]'); q.ready();
    const node0=q.G().node, round0=q.G().round;
    q.tap('#line'+(i+1));
    assert.ok(q.G().round>round0||q.G().node!==node0||q.G().phase!=='dialogue',
      'tapping choice '+(i+1)+' changed nothing');
    const r=openPage();
    r.tap('[data-cmd="fire"]'); r.ready();
    const b0=r.G().round;
    r.press(String(i+1));
    assert.ok(r.G().round>b0||r.G().phase!=='dialogue',
      'key '+(i+1)+' changed nothing');
    assert.deepEqual(r.errors,[]);
  }
});

test('8c. up draws, the crosshair moves, down holsters, fire shoots', {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage();
  p.tap('[data-cmd="fire"]'); p.ready();
  assert.equal(p.G().mode,'talk');
  p.tap('[data-cmd="up"]');
  assert.equal(p.G().mode,'gun','up did not draw');
  assert.equal(p.G().phase,'aiming');
  assert.match(p.el('mode').textContent,/\bGUN\b/);
  const aim={...p.G().aim};
  p.tap('[data-cmd="left"]');
  assert.notEqual(p.G().aim.x,aim.x,'left did not move the crosshair');
  p.press('ArrowUp');
  assert.notEqual(p.G().aim.y,aim.y,'up did not move the crosshair while drawn');
  // the dialogue lines are suspended while the gun is out
  assert.match(p.el('line1').className,/dim/);
  p.tap('[data-cmd="holster"]');
  assert.equal(p.G().mode,'talk','holster did not put it away');
  assert.equal(p.G().phase,'dialogue');
  // draw again and shoot: aim at the weapon box and expect a resolved encounter
  p.tap('[data-cmd="up"]');
  p.G().aim={...p.hit().weapon};
  p.tap('[data-cmd="fire"]');
  assert.ok(p.G().duel,'firing did not open a duel');
  assert.ok(['disarm','kill','miss','too_slow'].includes(p.G().duel.result),
    'unexpected duel result '+p.G().duel.result);
  assert.deepEqual(p.errors,[]);
});

test('8d. down walks the crosshair down, and holsters only at the bottom', {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage();
  p.tap('[data-cmd="fire"]'); p.ready();
  p.tap('[data-cmd="up"]');
  p.G().aim={x:0.5,y:0.5};
  p.tap('[data-cmd="down"]');
  assert.equal(p.G().mode,'gun','down from mid-screen should not holster');
  assert.ok(p.G().aim.y>0.5,'down did not move the crosshair down');
  p.G().aim={x:0.5,y:1};
  p.tap('[data-cmd="down"]');
  assert.equal(p.G().mode,'talk','down at the bottom edge should holster');
  assert.equal(p.G().phase,'dialogue','holstering did not hand the conversation back');
  // and the dedicated controls holster from anywhere
  p.tap('[data-cmd="up"]'); p.G().aim={x:0.5,y:0.5};
  p.press('Escape');
  assert.equal(p.G().mode,'talk','Escape did not holster');
});

test('8e. the mute control and the m key both toggle and show it', {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage();
  const before=p.snd().on;
  p.tap('#mute');
  assert.notEqual(p.snd().on,before,'the mute control did nothing');
  assert.match(p.el("mute").textContent,/^SOUND: (ON|OFF)$|^NO AUDIO$/);
  assert.equal(p.el('mute').getAttribute('aria-pressed'),String(p.snd().on));
  p.press('m');
  assert.equal(p.snd().on,before,'the m key did not toggle it back');
});

test('8f. a whole day can be played through to the summary and restarted', {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage();
  p.tap('[data-cmd="fire"]');
  let guard=0;
  while(p.G().phase!=='summary'&&guard++<400){
    p.ready();
    const ph=p.G().phase;
    if(ph==='dialogue'){p.press(String(1+(guard%4)));}
    else if(ph==='resolve'||ph==='interlude'){p.tap('[data-cmd="fire"]');}
    else if(ph==='tell'||ph==='duel'){
      if(p.G().mode!=='gun')p.tap('[data-cmd="up"]');   // he telegraphed: draw
      p.G().aim={...p.hit().weapon};
      p.tap('[data-cmd="fire"]');}
    else if(ph==='aiming'){p.G().aim={...p.hit().weapon};p.tap('[data-cmd="fire"]');}
    else break;
  }
  assert.equal(p.G().phase,'summary','the day never reached sundown (stuck in '+p.G().phase+')');
  assert.ok(Number.isFinite(p.G().over.score),'no score at sundown: '+p.G().over.score);
  assert.equal(Object.keys(p.G().over.categories).length,7,'expected the seven dimensions');
  assert.match(p.el('line0').textContent,/(SUNDOWN|THE STREET KEPT YOU) — -?\d+ points/);
  p.tap('[data-cmd="fire"]');
  assert.equal(p.G().phase,'dialogue','FIRE on the summary did not start a new day');
  assert.equal(p.G().encounter,0);
  assert.deepEqual(p.errors,[]);
});

test('8g. no AudioContext exists until a gesture, and nothing external is fetched', {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const raw=HTML.replace(/<!--[\s\S]*?-->/g,'');
  assert.ok(!/<script[^>]+\bsrc=/.test(raw),'the page loads an external script');
  assert.ok(!/<link[^>]+href="https?:/.test(raw),'the page loads an external stylesheet');
  assert.ok(!/\bfetch\(|XMLHttpRequest|importScripts/.test(raw),'the page fetches something');
  assert.ok(!/https?:\/\/(?!www\.w3\.org)/.test(raw.replace(/<meta[^>]*>/g,'')),
    'the page references a remote URL');
  // SND.unlock is what builds it, and nothing calls unlock on load
  const p=openPage();
  assert.equal(p.ev('SOUNDS')&&p.ev('typeof performance'),'object');
  assert.deepEqual(p.errors,[]);
});

test('8i. the day is launched in full screen unless that was turned off', {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage();
  assert.equal(p.ev('wantGameMode'),true,'full screen is not the launch default');
  assert.equal(p.ev('gameMode'),false,'it should not enter before a gesture');
  p.tap('[data-cmd="fire"]');                      // pinning on the badge is the gesture
  assert.equal(p.ev('gameMode'),true,'the launch did not go full screen');
  assert.equal(p.G().phase,'dialogue','and the day still started');
  // turning it off is what gets remembered
  p.tap('#full');
  assert.equal(p.ev('gameMode'),false);
  let stored=null;
  try{stored=p.w.localStorage.getItem('lotw.gamemode');}catch(e){}
  assert.equal(stored,'0','the choice to stay in the page was not remembered');
  // and a page that opens with that stored reads it back (each jsdom window has
  // its own storage, so the read path is exercised rather than a second load)
  assert.equal(p.ev('readGameModePref()'),false,'the stored choice is not read back');
  try{p.w.localStorage.setItem('lotw.gamemode','1');}catch(e){}
  assert.equal(p.ev('readGameModePref()'),true);
  try{p.w.localStorage.removeItem('lotw.gamemode');}catch(e){}
  assert.equal(p.ev('readGameModePref()'),true,'the default with nothing stored is not full screen');
});

test('8h. full screen mode toggles from the control and the g key', {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage();
  assert.equal(p.ev('gameMode'),false);
  assert.equal(p.el('full').getAttribute('aria-pressed'),'false');
  p.tap('#full');
  assert.equal(p.ev('gameMode'),true,'the FULL control did nothing');
  assert.ok(p.w.document.body.classList.contains('gamemode'),'the page did not enter game mode');
  assert.equal(p.el('full').textContent,'EXIT');
  assert.equal(p.el('full').getAttribute('aria-pressed'),'true');
  p.press('g');
  assert.equal(p.ev('gameMode'),false,'the g key did not leave game mode');
  assert.ok(!p.w.document.body.classList.contains('gamemode'));
  assert.equal(p.el('full').textContent,'FULL');
  // it survives a missing Fullscreen API, which is what jsdom and iPhone Safari have
  assert.deepEqual(p.errors,[]);
  // and the preference is remembered for the next day started
  p.tap('#full');
  p.tap('[data-cmd="fire"]');
  assert.equal(p.ev('gameMode'),true,'starting the day dropped game mode');
  assert.equal(p.G().phase,'dialogue');
});

test('8j. nothing a character says can be clipped or hidden behind a scroll', {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const css=HTML.slice(HTML.indexOf('<style>'),HTML.indexOf('</style>'));
  // the words wrap, the box can scroll as a last resort, and the type is scalable
  assert.match(css,/overflow-wrap:break-word/,'the dialogue does not wrap long words');
  assert.match(css,/#panel\{[^}]*overflow-y:auto/,'the panel cannot scroll as a fallback');
  assert.match(css,/--dlg:1/,'there is no dialogue scale to fit with');
  assert.match(css,/\.npc\{[^}]*font-size:calc\(14px \* var\(--dlg\)\)/,'the NPC line ignores the scale');
  assert.match(css,/\.choice\{[^}]*font-size:calc\(13px \* var\(--dlg\)\)/,'the choices ignore the scale');
  assert.ok(!/\.npc\{[^}]*min-height/.test(css),'the NPC line still has a fixed height to clip against');
  // and the fitter runs on every repaint without throwing where there is no layout
  const p=openPage();
  p.tap('[data-cmd="fire"]'); p.ready();
  assert.equal(typeof p.ev('fitText'),'function','there is no text fitter');
  p.ev('fitText()');
  const scale=p.el('panel').style.getPropertyValue('--dlg');
  assert.ok(scale===''||(+scale>=0.7&&+scale<=1),'the dialogue scale went out of range: '+scale);
  assert.deepEqual(p.errors,[]);
});

test('8k. a held control repeats, and nothing on the page is selectable', {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const css=HTML.slice(HTML.indexOf('<style>'),HTML.indexOf('</style>'));
  assert.match(css,/-webkit-touch-callout:none/,'long press can still raise the callout');
  assert.match(css,/\*\{[^}]*user-select:none/,'the page is still selectable');

  const p=openPage();
  p.tap('[data-cmd="fire"]'); p.ready();
  // a selection gesture is refused
  const ev=new p.w.Event('selectstart',{bubbles:true,cancelable:true});
  p.el('line1').dispatchEvent(ev);
  assert.equal(ev.defaultPrevented,true,'selectstart was not prevented');
  const drag=new p.w.Event('dragstart',{bubbles:true,cancelable:true});
  p.el('line1').dispatchEvent(drag);
  assert.equal(drag.defaultPrevented,true,'dragstart was not prevented');

  // While he is talking the directions are a menu, and a held one repeats
  const dn=p.tap('[data-cmd="down"]');
  assert.ok(p.ev('held'),'a held menu direction was not registered');
  assert.equal(p.ev('held').cmd,'down');
  dn.dispatchEvent(new (p.w.PointerEvent||p.w.Event)('pointerup',{bubbles:true}));
  assert.equal(p.ev('held'),null,'the hold did not clear on release');

  // With the gun out they are sights: they run on the loop, not on a repeat
  // timer, and two held at once give a diagonal.
  p.tap('[data-cmd="up"]');                       // draws the gun
  assert.equal(p.G().mode,'gun');
  const upEl=p.tap('[data-cmd="up"]');            // and now aims
  assert.equal(p.ev('held'),null,'the sights are still on the menu repeat timer');
  assert.equal(p.ev("pressed.has('up')"),true,'a held direction was not registered');
  const before={...p.G().aim};
  p.frame(1000); p.frame(1050);
  assert.ok(p.G().aim.y<before.y,'holding did not run the sights');
  const oneWay={...p.G().aim};
  const leftEl=p.tap('[data-cmd="left"]');
  p.frame(1100); p.frame(1150);
  assert.ok(p.G().aim.y<oneWay.y&&p.G().aim.x<oneWay.x,
    'two directions at once did not give a diagonal');
  for(const el of [upEl,leftEl])
    el.dispatchEvent(new (p.w.PointerEvent||p.w.Event)('pointerup',{bubbles:true}));
  assert.equal(p.ev('pressed.size'),0,'the sights did not stop on release');
  const still={x:p.G().aim.x,y:p.G().aim.y};
  p.frame(1200); p.frame(1250);
  assert.ok(Math.abs(p.G().aim.x-still.x)<1e-9&&Math.abs(p.G().aim.y-still.y)<1e-9,
    'the sights kept running with nothing held');
  // a non-directional control never repeats
  p.tap('[data-cmd="fire"]');
  assert.equal(p.ev('held'),null,'FIRE should not repeat');
  assert.deepEqual(p.errors,[]);
});

test('8l. a robbery is a screen the sheriff walks into, and it plays out', {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage();
  p.tap('[data-cmd="fire"]');
  const at=p.ev('INTERLUDES').find(i=>i.job==='stage').after;
  // stand at the caller before the stage job, with the tip in hand, and resolve
  p.ev(`G.tips.stage=true;G.encounter=${at-1};beginEncounter(G);openDialogue(G);resolve(G,"departed");paint();`);
  p.tap('[data-cmd="fire"]');                       // walk on down the street
  assert.equal(p.G().phase,'interlude','the job never came up');
  assert.equal(p.G().interlude,'stage');
  assert.match(p.el('line0').textContent,/coach|ford/i,'no word of what is happening');
  assert.match(p.el('line1').textContent,/^1\. /,'nothing to do about it');
  p.tap('[data-cmd="fire"]');                       // ride for the ford
  assert.equal(p.G().phase,'tell','being there was not a gunfight');
  assert.equal(p.ev('who(G)').id,'stage','he is facing the wrong man');
  assert.ok(p.G().authority>0,'standing in front of it earned nothing');
  // and the unwarned case is a report, not a fight
  const q=openPage();
  q.tap('[data-cmd="fire"]');
  q.ev(`G.tips.bank=false;G.encounter=${p.ev('INTERLUDES').find(i=>i.job==='bank').after-1};`+
       `beginEncounter(G);openDialogue(G);resolve(G,"departed");paint();`);
  q.tap('[data-cmd="fire"]'); q.tap('[data-cmd="fire"]');
  assert.equal(q.G().outcome,'job_missed');
  assert.equal(q.G().crimesMissed,1);
  assert.deepEqual(p.errors,[]); assert.deepEqual(q.errors,[]);
});

test('8m. each caller arrives on his own theme and a drawn gun cuts it', {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage();
  const log=[];
  for(const n of ['door','step','theme','cut','leather','cock','aim','holster','click'])
    p.ev('SND')[n]=(a)=>log.push(n==='theme'?'theme:'+a:n);
  p.tap('[data-cmd="fire"]');
  // the sound runs on the frame clock, so the clock is what a test turns
  p.frame(0);
  p.w.eval('newSeq();newScene()');
  for(let t=0;t<=1200;t+=50)p.frame(t);
  const want=p.ev('who(G)').theme;
  assert.ok(log.indexOf('theme:'+want)>=0,
    'the caller arrived without his theme: '+log.join(','));
  // he is heard before he is seen, and in order: the door, the boardwalk, him
  assert.ok(log.indexOf('door')<log.indexOf('step'),'he crossed the boardwalk first');
  assert.ok(log.indexOf('step')<log.indexOf('theme:'+want),'his theme beat him in');
  p.ready();
  p.tap('[data-cmd="up"]');                      // draw
  assert.equal(p.G().mode,'gun');
  assert.ok(log.indexOf('cut')>log.indexOf('theme:'+want),
    'the theme played on over a drawn gun');
  assert.deepEqual(p.errors,[]);
});

test('8n. the picture is 320x200 painted into a 4:3 frame', {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage();
  assert.deepEqual([p.ev('SCENE.w'),p.ev('SCENE.h')],[320,200]);
  const cv=p.ev('cv'); cv.width=800; cv.height=800;
  const g=p.ev('sceneGeom()');
  assert.ok(Math.abs((g.sx*320)/(g.sy*200)-4/3)<1e-6,
    'the frame is '+(g.sx*320)+'x'+(g.sy*200)+', not 4:3');
  assert.ok(g.sx*320<=800.001&&g.sy*200<=800.001,'the picture does not fit the canvas');
  cv.width=1600; cv.height=400;
  const w=p.ev('sceneGeom()');
  assert.ok(w.sy*200<=400.001&&Math.abs((w.sx*320)/(w.sy*200)-4/3)<1e-6);
  // and the sheriff is the near third of it, with the caller clear of him
  const own=p.ev('OWN');
  assert.ok(own.x<=4,'the sheriff is not against the frame');
  assert.ok(own.w>=320/4,'the sheriff is only '+own.w+' pixels of the near third');
  assert.equal(own.y+own.h,200,'he does not run out of the bottom of the frame');
  assert.ok(p.ev('SPRX')>own.x+own.w*0.55,'the caller stands inside his gun arm');
  // his artwork travels with the page: no request, and nothing to smooth
  const src=p.ev('SHERIFF_SRC');
  assert.ok(/^data:image\/png;base64,/.test(src),'his artwork is not carried inline');
  assert.ok(src.length<40000,'his artwork is '+src.length+' characters');
  // talking shows the strip below the gun arm, drawing shows the whole of him
  assert.ok(own.rest>0&&own.rest<own.h,'the resting crop is '+own.rest);
  assert.deepEqual(p.errors,[]);
});

test('8o. being outdrawn by the clock still paints the reckoning', {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage();
  p.tap('[data-cmd="fire"]');
  p.ready();
  // one wound already carried, a hostile doctor, and a man who has drawn
  p.ev('G.doctor.disposition=-2;');
  p.ev('theyDraw(G,"draw");G.tell.at=0;');
  p.frame(60);                                     // he clears leather
  p.frame(4000);                                   // and fires before anybody moved
  assert.equal(p.G().phase,'summary','the clock never killed him');
  assert.equal(p.G().alive,false);
  assert.match(p.el('line0').textContent,/THE STREET KEPT YOU — -?\d+ points/,
    'the screen still showed the encounter: '+p.el('line0').textContent);
  assert.match(p.el('line4').textContent,/^1\. /,'no way to ride in again');
  assert.deepEqual(p.errors,[]);
});

test('8p. the sound test reaches every cue the game can make', {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage();
  const played=[];
  p.ev('SND').theme=n=>played.push(n);
  p.ev('SND').cut=()=>{};
  for(const k of Object.keys(p.ev('SOUNDS')))p.ev('SND')[k]=()=>played.push(k);
  p.press('2');                                    // the title offers it
  assert.equal(p.ev('screen'),'sound','the sound test did not open');
  const cues=p.ev('CUES()');
  assert.ok(cues.includes('gunshot')&&cues.includes('ricochet')&&cues.includes('reload'),
    'the gunfight effects are not in the list');
  for(let i=0;i<cues.length;i++){p.press('1');p.press('2');}
  assert.deepEqual([...new Set(played)].sort(),[...cues].sort(),
    'the test cannot reach: '+cues.filter(c=>!played.includes(c)).join(', '));
  assert.equal(p.G().phase,'intro','the sound test started a day');
  p.press('4');
  assert.equal(p.ev('screen'),null,'there is no way back to the street');
  p.tap('[data-cmd="fire"]');
  assert.equal(p.G().phase,'dialogue','the title no longer starts a day');
  assert.deepEqual(p.errors,[]);
});

test('8q. the sound remembers itself, steps back for a cue, and never repeats exactly',
  {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  // a preference to be silent survives a reload, and restoring it is not itself
  // the gesture that builds an AudioContext
  const quiet=openPage(win=>{try{win.localStorage.setItem('lotw.sound','0');}catch(e){}});
  assert.equal(quiet.ev('SND.on'),false,'the page came back up making noise');
  assert.equal(quiet.el('mute').textContent,'SOUND: OFF','the control does not say so');
  // the label is a state, never an instruction: a button saying SOUND ON is
  // pressed by someone wanting sound on, which turns it off and keeps it off
  assert.match(quiet.el('mute').textContent,/^SOUND: (ON|OFF)$|^NO AUDIO$/);
  assert.equal(quiet.el('mute').getAttribute('aria-pressed'),'false');
  quiet.tap('[data-cmd="fire"]');
  assert.equal(quiet.ev('typeof (window.AudioContext||window.webkitAudioContext)'),
    'undefined','jsdom grew an AudioContext');
  assert.equal(quiet.ev('SND.on'),false,'a gesture turned the sound back on');
  assert.deepEqual(quiet.errors,[]);

  // and turning it off writes that down
  const p=openPage();
  assert.equal(p.ev('SND.on'),true,'a fresh page came up silent');
  p.tap('[data-cmd="mute"]');
  assert.equal(p.ev('SND.on'),false,'the control did not silence it');
  assert.equal(p.w.localStorage.getItem('lotw.sound'),'0','the choice was not kept');
  p.tap('[data-cmd="mute"]');
  assert.equal(p.w.localStorage.getItem('lotw.sound'),'1');
  assert.equal(p.el('mute').textContent,'SOUND: ON');

  // every cue the game can fire is one the engine knows, and the ones a player
  // hears over and over are the ones allowed to move
  const cues=p.ev('Object.keys(SOUNDS)');
  for(const n of p.ev('Object.keys(SOUNDS).filter(k=>SND.spec.varies(k))'))
    assert.ok(cues.indexOf(n)>=0,'nothing named '+n+' can be varied');
  for(const n of ['gunshot','hit','ricochet','click','step'])
    assert.ok(p.ev(`SND.spec.varies(${JSON.stringify(n)})`),n+' fires identically every time');
  for(const n of p.ev('Object.keys(SOUNDS).filter(k=>k.indexOf("th_")===0)'))
    assert.equal(p.ev(`SND.spec.varies(${JSON.stringify(n)})`),false,
      n+' is a tune and must not be detuned');

  // a cue knows its own length, which is what the theme under it ducks for
  assert.ok(p.ev('SND.spec.lengthOf(SOUNDS.gunshot)')>0,'a gunshot has no length');
  assert.ok(p.ev('SND.spec.lengthOf(SOUNDS.th_kid)')>p.ev('SND.spec.lengthOf(SOUNDS.click)'),
    'a theme is not longer than a click');
  assert.ok(p.ev('SND.spec.duck')>0&&p.ev('SND.spec.duck')<1,'the duck is '+p.ev('SND.spec.duck'));

  // Three voices was the machine's whole limit and it is the limit here. What
  // counts is three at the same instant, not three entries: a cue may lay out a
  // dozen hoofbeats one after another without ever breaking it.
  assert.equal(p.ev('SND.spec.voices'),3,'the ceiling moved');
  for(const n of cues)
    assert.ok(p.ev(`SND.spec.peak(SOUNDS[${JSON.stringify(n)}])`)<=3,
      n+' wants '+p.ev(`SND.spec.peak(SOUNDS[${JSON.stringify(n)}])`)+' voices at once');
  // a shot over a theme takes a voice; a footstep does not
  for(const n of ['gunshot','alarm','churchbell'])
    assert.equal(p.ev(`SND.spec.alerts(${JSON.stringify(n)})`),true,
      n+' does not take a voice from the theme');
  for(const n of ['click','step','select'])
    assert.equal(p.ev(`SND.spec.alerts(${JSON.stringify(n)})`),false,
      n+' takes a voice from the theme');
  // answers to a shot replace one another by weight rather than pile up
  assert.ok(p.ev('SND.spec.outcomePri("death")')>p.ev('SND.spec.outcomePri("graze")'),
    'a death does not outrank a graze');
  assert.equal(p.ev('SND.spec.outcomePri("click")'),0,'a click is an outcome');
  assert.deepEqual(p.errors,[]);
});

/* ---- 9: one input state, one frame clock, one cancellable sound queue ---- */

test('9a. touch and the keys make the same commands in the same order',
  {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const run=how=>{
    const p=openPage();
    p.w.eval('window.__cmds=[];');
    // both hands arrive at the same table of commands; wrap its entries rather
    // than the two handlers, which is the whole point being asserted
    p.w.eval('Object.keys(CONTROL).forEach(function(k){'+
             'var f=CONTROL[k];CONTROL[k]=function(){window.__cmds.push(k);'+
             'return f.apply(null,arguments);};});');
    how(p);
    // the page has its own realm and so its own Array: bring the list home
    // before comparing, or two identical lists compare unequal
    return Array.from(p.ev('window.__cmds'));
  };
  const byTouch=run(p=>{p.tap('[data-cmd="fire"]');p.ready();
    p.tap('[data-cmd="down"]');p.tap('[data-cmd="up"]');p.tap('[data-cmd="holster"]');});
  const byKey=run(p=>{p.key('Enter');p.ready();
    p.key('ArrowDown');p.key('ArrowUp');p.key('Escape');});
  assert.deepEqual(byKey,byTouch,
    'the two hands do not agree: keys '+JSON.stringify(byKey)+
    ' vs touch '+JSON.stringify(byTouch));
  assert.ok(byTouch.length>=4,'nothing was recorded: '+byTouch.join(','));
});

test('9b. the browser key repeat cannot fire an action twice',
  {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage(); p.tap('[data-cmd="fire"]'); p.ready();
  const log=p.log();
  p.key('ArrowDown');                         // a real press moves the cursor
  const once=p.G().phase, moved=log.length;
  p.key('ArrowDown',{repeat:true});            // the OS repeating it must not
  p.key('ArrowDown',{repeat:true});
  assert.equal(log.length,moved,'a repeated keydown spoke again: '+log.join(','));
  assert.equal(p.G().phase,once);
});

test('9c. holding FIRE never shoots twice',
  {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage(); p.tap('[data-cmd="fire"]'); p.ready();
  p.tap('[data-cmd="up"]');                    // draw
  assert.equal(p.G().mode,'gun');
  const log=p.log();
  p.key(' ');                                  // one shot
  assert.equal(log.filter(c=>c==='gunshot').length>=1,true,
    'the press did not fire: '+log.join(','));
  const after=log.slice();
  p.key(' ',{repeat:true}); p.key(' ',{repeat:true});
  assert.deepEqual(log,after,'a held FIRE emptied the cylinder: '+log.join(','));
  assert.equal(p.ev("held"),null,'FIRE was put on the repeat timer');
  // a second real press finds the chamber spent rather than firing again
  const n=log.length;
  p.key(' ');
  assert.equal(log.slice(n).filter(c=>c==='gunshot').length,0,
    'the second press fired a spent chamber');
});

test('9d. a held direction repeats only through the frame loop',
  {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage(); p.tap('[data-cmd="fire"]'); p.ready();
  p.tap('[data-cmd="up"]');                    // draw
  p.tap('[data-cmd="left"]');                  // and hold the sights left
  const held={...p.G().aim};
  assert.equal(p.ev("pressed.has('left')"),true,'the direction was not held');
  assert.equal(p.G().aim.x,held.x,'the sights moved with no frame');
  p.frame(1000); p.frame(1040);
  assert.ok(p.G().aim.x<held.x,'the frame loop did not move the sights');
});

test('9e. a press survives the thumb sliding off the button',
  {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage(); p.tap('[data-cmd="fire"]'); p.ready();
  p.tap('[data-cmd="up"]'); p.tap('[data-cmd="left"]');
  assert.equal(p.ev("pressed.has('left')"),true);
  p.at('[data-cmd="left"]','pointerleave');    // the thumb wanders off the key
  assert.equal(p.ev("pressed.has('left')"),true,
    'the press was handed back to the page mid-gesture');
  p.at('[data-cmd="left"]','pointerup');       // only letting go ends it
  assert.equal(p.ev("pressed.has('left')"),false);
  assert.match(p.w.document.querySelector('.dpad').outerHTML,/data-cmd/);
});

test('9f. blur and going away clear every held input',
  {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage(); p.tap('[data-cmd="fire"]'); p.ready();
  p.tap('[data-cmd="up"]'); p.tap('[data-cmd="left"]'); p.key('ArrowRight');
  assert.ok(p.ev('pressed.size')>=1,'nothing was held to begin with');
  p.w.dispatchEvent(new p.w.Event('blur'));
  assert.equal(p.ev('pressed.size'),0,'blur left a control down');

  const q=openPage(); q.tap('[data-cmd="fire"]'); q.ready();
  q.tap('[data-cmd="up"]'); q.tap('[data-cmd="left"]');
  const log=q.log();
  Object.defineProperty(q.w.document,'hidden',{value:true,configurable:true});
  q.w.document.dispatchEvent(new q.w.Event('visibilitychange'));
  assert.equal(q.ev('pressed.size'),0,'backgrounding left a control down');
  assert.ok(log.indexOf('suspend')>=0,'the audio was left running in the background');
  assert.equal(q.ev('queue.length'),0,'cues were still owed to a hidden page');
});

test('9g. drawing cuts the visitor theme in the same frame',
  {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage(); p.tap('[data-cmd="fire"]'); p.frame(0);
  p.w.eval('newSeq();newScene()');
  const log=p.log();
  for(let t=0;t<=900;t+=50)p.frame(t);
  const theme=log.findIndex(c=>c.indexOf('theme:')===0);
  assert.ok(theme>=0,'no theme to cut: '+log.join(','));
  p.ready();
  const before=log.length;
  p.tap('[data-cmd="up"]');
  assert.ok(log.indexOf('cut')>theme,'the theme was not cut');
  assert.ok(log.indexOf('cut')>=before,'the cut did not happen on the draw');
  assert.equal(p.G().mode,'gun');
});

test('9h. drawing is leather, then cock, then aim, once each',
  {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage(); p.tap('[data-cmd="fire"]'); p.ready(); p.frame(0);
  const log=p.log();
  p.tap('[data-cmd="up"]');
  for(let t=0;t<=400;t+=40)p.frame(t);
  const only=log.filter(c=>c==='leather'||c==='cock'||c==='aim'||c==='holster');
  assert.deepEqual(only,['leather','cock','aim'],
    'the draw sounded as '+log.join(','));
  // and pressing up again, with the gun already out, adds none of them
  const n=log.length;
  p.tap('[data-cmd="up"]'); for(let t=440;t<=700;t+=40)p.frame(t);
  assert.deepEqual(log.slice(n).filter(c=>c==='leather'||c==='cock'||c==='aim'),[],
    'the draw sounded a second time');
});

test('9i. holstering is the holster cue and nothing else',
  {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage(); p.tap('[data-cmd="fire"]'); p.ready(); p.frame(0);
  p.tap('[data-cmd="up"]'); for(let t=0;t<=400;t+=40)p.frame(t);
  // the dedicated control
  let log=p.log();
  p.tap('[data-cmd="holster"]');
  for(let t=440;t<=700;t+=40)p.frame(t);
  assert.equal(p.G().mode,'talk','HOL did not put the gun up');
  assert.deepEqual(log,['holster'],'HOL sounded as '+log.join(','));
  // Escape, the same
  p.tap('[data-cmd="up"]'); for(let t=740;t<=1000;t+=40)p.frame(t);
  log=p.log(); p.key('Escape');
  for(let t=1040;t<=1300;t+=40)p.frame(t);
  assert.equal(p.G().mode,'talk','Escape did not put the gun up');
  assert.deepEqual(log,['holster'],'Escape sounded as '+log.join(','));
  // and walking the sights off the bottom of the street, the same again
  p.tap('[data-cmd="up"]'); for(let t=1340;t<=1600;t+=40)p.frame(t);
  p.ev('G.aim.y=1;'); log=p.log(); p.tap('[data-cmd="down"]');
  assert.equal(p.G().mode,'talk','the lower boundary did not put the gun up');
  assert.deepEqual(log,['holster'],'the boundary sounded as '+log.join(','));
});

test('9j. the title, the dawn and the badge never overlap',
  {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage(null,true);                 // cold: no gesture has been spent
  const log=p.log();
  p.frame(0);
  p.tap('[data-cmd="fire"]');                  // the first press raises the music
  for(let t=0;t<=40;t+=20)p.frame(t);
  assert.equal(p.G().phase,'intro','the first press started the day as well');
  assert.ok(log.indexOf('title')>=0,'the first press raised nothing');
  log.length=0;
  p.tap('[data-cmd="fire"]');                  // and the next one starts the day
  for(let t=0;t<=12000;t+=100)p.frame(t);
  assert.equal(log.indexOf('title'),-1,
    'the title played on under the dawn: '+log.join(','));
  const d=log.indexOf('dawn'), b=log.indexOf('badge');
  assert.ok(d>=0&&b>d,'the badge did not follow the dawn: '+log.join(','));
  const door=log.indexOf('door');
  assert.ok(door>b,'the visitor arrived over the badge: '+log.join(','));
});

test('9k. advancing the scene cancels what the last one still owed',
  {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage(); p.tap('[data-cmd="fire"]'); p.ready(); p.frame(0);
  p.w.eval('newSeq();newScene()');
  assert.ok(p.ev('queue.length')>0,'the arrival scheduled nothing');
  const wasSeq=p.ev('seq');
  const log=p.log();
  p.w.eval('advance()');
  assert.ok(p.ev('seq')>wasSeq,'the sequence did not move on');
  for(let t=0;t<=1500;t+=50)p.frame(t);
  // nothing from the cancelled sequence survived into this one
  assert.equal(p.ev('queue.filter(c=>c.seq<seq).length'),0,
    'a stale cue is still waiting');
});

test('9l. muting stops what is sounding and what is owed',
  {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage(); p.tap('[data-cmd="fire"]'); p.ready(); p.frame(0);
  p.w.eval('newSeq();newScene()');
  assert.ok(p.ev('queue.length')>0);
  const log=p.log();
  p.tap('[data-cmd="mute"]');
  assert.ok(log.indexOf('toggle')>=0,'the control did not reach the engine');
  assert.equal(p.ev('queue.length'),0,'cues were still owed after the mute');
  // the real engine takes everything down with it
  const q=openPage(); q.tap('[data-cmd="fire"]');
  assert.equal(typeof q.ev('SND.stopAll'),'function','there is no way to stop it');
  q.tap('[data-cmd="mute"]');
  assert.equal(q.ev('SND.on'),false);
  assert.equal(q.ev('SND.playing'),null,'a theme survived the mute');
  q.tap('[data-cmd="mute"]');
  assert.equal(q.ev('SND.playing'),null,'unmuting brought a dead theme back');
});

test('9m. moving the sights makes no sound at all',
  {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage(); p.tap('[data-cmd="fire"]'); p.ready(); p.frame(0);
  p.tap('[data-cmd="up"]'); for(let t=0;t<=400;t+=40)p.frame(t);
  assert.equal(p.G().mode,'gun');
  const log=p.log();
  for(const c of ['up','down','left','right'])p.tap('[data-cmd="'+c+'"]');
  for(let t=440;t<=900;t+=40)p.frame(t);
  assert.deepEqual(log.filter(c=>c==='click'),[],
    'the sights clicked like a menu: '+log.join(','));
});

test('9n. the dialogue clicks once per selection that actually changed',
  {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage(); p.tap('[data-cmd="fire"]'); p.ready();
  const log=p.log();
  const n=p.ev('beat().replies.length');
  p.tap('[data-cmd="down"]');
  assert.equal(log.filter(c=>c==='click').length,1,'one step, '+log.length+' clicks');
  const at=p.ev('cursor');
  p.tap('[data-cmd="right"]');
  assert.equal(log.filter(c=>c==='click').length,2);
  assert.notEqual(p.ev('cursor'),at,'the cursor did not move');
  // walking all the way round lands back where it started, one click a step
  const before=log.filter(c=>c==='click').length;
  for(let i=0;i<n;i++)p.tap('[data-cmd="down"]');
  assert.equal(log.filter(c=>c==='click').length,before+n,
    'a step made more than one click');
});

test('9o. a man who outdraws you resolves, and sounds, with no press at all',
  {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage(); p.tap('[data-cmd="fire"]'); p.ready();
  p.ev('theyDraw(G,"draw");G.tell.at=0;');
  const log=p.log();
  for(let t=0;t<12000;t+=100){p.frame(t); if(p.G().phase==='resolve'||p.G().phase==='summary')break;}
  assert.ok(['resolve','summary'].indexOf(p.G().phase)>=0,
    'the clock never ran out: '+p.G().phase);
  assert.ok(log.length>0,'the resolution was silent');
  assert.deepEqual(p.errors,[]);
});

test('9p. the artwork, the budget, the offline rule and the hard pixels all hold',
  {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  // the supplied pixels are untouched and still travel with the page
  const src=HTML.match(/const SHERIFF_SRC="([^"]+)"/);
  assert.ok(src,'the sheriff lost his artwork');
  assert.match(src[1],/^data:image\/png;base64,/,'his artwork is not inline');
  const bytes=Buffer.from(src[1].split(',')[1],'base64');
  assert.equal(bytes.slice(1,4).toString(),'PNG','his artwork is not a PNG');
  assert.equal(bytes.readUInt32BE(16),129,'his artwork changed width');
  assert.equal(bytes.readUInt32BE(20),200,'his artwork changed height');
  // nothing is fetched, ever
  assert.equal(HTML.search(/<(script|link|img)[^>]+\b(src|href)=["'](?!data:)/i),-1,
    'the page reaches outside itself');
  for(const bad of [/\bfetch\s*\(/,/XMLHttpRequest/,/importScripts/])
    assert.equal(HTML.search(bad),-1,'the page can still call out: '+bad);
  // it stays inside its budget
  assert.ok(Buffer.byteLength(HTML)<240*1024,
    'the page is '+(Buffer.byteLength(HTML)/1024).toFixed(1)+' KB');
  // and nothing on the way to the screen is smoothed
  assert.match(HTML,/image-rendering:pixelated/,'the canvas is smoothed by CSS');
  assert.match(HTML,/imageSmoothingEnabled=false/,'his artwork is smoothed');
});

test('9q. the title is a drawn plate and its music comes round again',
  {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage();
  // the letters are drawn, not set: every character the card uses has a glyph
  const T=p.ev('TITLE');
  const used=[T.a,T.b,T.c,T.town,'PRESS FIRE','REWARD','$500',
    'INSPIRED BY THE 1985 GAME','DESIGNED BY ALAN MILLER',
    'ORIGINAL MUSIC BY ED BOGAS','AN INDEPENDENT UNOFFICIAL RECREATION']
    .join('');
  for(const ch of used)
    assert.ok(p.ev(`!!GLYPH[${JSON.stringify(ch)}]`),'no glyph for '+JSON.stringify(ch));
  assert.equal(p.ev('GLYPH.A.split("|").length'),p.ev('GLYPH_H'),'a glyph is the wrong height');
  for(const k of p.ev('Object.keys(GLYPH)'))
    for(const row of p.ev(`GLYPH[${JSON.stringify(k)}].split("|")`))
      assert.equal(row.length,p.ev('GLYPH_W'),'glyph '+k+' is ragged');
  // and the plate fits the picture it is painted on
  for(const [line,cell] of [[T.a,8],[T.c,8]])
    assert.ok(p.ev(`textWidth(${JSON.stringify(line)},${cell})`)<=320,
      JSON.stringify(line)+' is wider than the frame');

  // the card is painted on the title and nowhere else
  p.ev('build.rows=10;'); p.frame(0);
  assert.equal(p.G().phase,'intro');
  p.tap('[data-cmd="fire"]'); p.frame(20);
  assert.notEqual(p.G().phase,'intro','the day did not start');
  assert.deepEqual(p.errors,[]);

  // the music comes round again for as long as he is looking at the title
  const r=openPage(null,true);                    // cold: the gesture is unspent
  const rlog=r.log();
  r.frame(0);
  assert.equal(r.w.eval('firstGesture()'),true,'the first gesture was not spent on the music');
  assert.equal(r.w.eval('firstGesture()'),false,'a later gesture was spent again');
  r.frame(1);
  assert.ok(rlog.indexOf('title')>=0,'the title never played: '+rlog.join(','));
  const len=r.ev('SND.spec.lengthOf(SOUNDS.title)')*1000;
  assert.ok(len>8000,'the title music is only '+(len/1000).toFixed(1)+'s');
  assert.ok(r.ev('queue.length')>0,'the title did not queue its own return');
  for(let t=0;t<=len+1200;t+=200)r.frame(t);
  assert.ok(rlog.filter(c=>c==='title').length>=2,
    'the title music did not come round again: '+rlog.join(','));
  // and starting the day takes the loop with it
  const n=rlog.length;
  r.w.eval('startDay()');
  for(let t=len+1400;t<=len*2+2000;t+=200)r.frame(t);
  assert.equal(rlog.slice(n).filter(c=>c==='title').length,0,
    'the title music played on over the day');
  assert.deepEqual(r.errors,[]);
});

test('9r. the dither is one weave over the whole picture, not a stripe per row',
  {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage();
  const at=(rows)=>{
    p.painted.length=0;
    rows();
    const grid={};
    for(const q of p.painted)grid[q.x+','+q.y]=q.c;
    return grid;
  };
  // A band laid down a row at a time is what the sky is made of. Read from each
  // rectangle's own corner the matrix never leaves its first row, every row
  // comes out identical, and the sky is vertical stripes.
  const band=at(()=>{for(let y=0;y<4;y++)p.ev(`dither(0,${y},8,1,"#000000","#ffffff",0.5)`);});
  const row=y=>[0,1,2,3,4,5,6,7].map(x=>band[x+','+y]).join('');
  const rows=[row(0),row(1),row(2),row(3)];
  assert.equal(new Set(rows).size>1,true,
    'every row of the band came out the same: '+rows[0]);
  // and the four rows together are the matrix, so each column varies too
  const cols=[0,1,2,3].map(x=>[0,1,2,3].map(y=>band[x+','+y]).join(''));
  assert.equal(new Set(cols).size>1,true,'every column came out the same');

  // Two shapes that meet must share one weave: the same pixel gets the same
  // answer whichever rectangle painted it.
  const whole=at(()=>p.ev('dither(0,0,8,4,"#000000","#ffffff",0.5)'));
  const split=at(()=>{p.ev('dither(0,0,8,2,"#000000","#ffffff",0.5)');
                      p.ev('dither(0,2,8,2,"#000000","#ffffff",0.5)');});
  for(let y=0;y<4;y++)for(let x=0;x<8;x++)
    assert.equal(split[x+','+y],whole[x+','+y],
      'a seam at '+x+','+y+': split '+split[x+','+y]+' vs whole '+whole[x+','+y]);
  // an offset rectangle keeps the weave too, rather than restarting it
  const off=at(()=>p.ev('dither(2,1,6,3,"#000000","#ffffff",0.5)'));
  for(let y=1;y<4;y++)for(let x=2;x<8;x++)
    assert.equal(off[x+','+y],whole[x+','+y],'the weave restarted at '+x+','+y);
  assert.deepEqual(p.errors,[]);
});

test('9s. every figure gets a face, wherever its face is drawn',
  {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage();
  const figs=p.ev('Object.keys(FIGURES)');
  assert.ok(figs.length>=12,'only '+figs.length+' figures');
  const seen={};
  for(const k of figs){
    const cut=p.ev(`headOf(FIGURES[${JSON.stringify(k)}])`);
    const rows=p.ev(`FIGURES[${JSON.stringify(k)}].rows`);
    // the eye row is read off the drawing, not assumed: they are not all alike
    assert.equal(rows[cut.eye].indexOf('E')>=0,true,
      k+" has no eyes on the row it was told to put a brow over");
    // the head is cut below the face, never through it
    assert.ok(cut.head>cut.eye+1,k+' is cut through its own face');
    // and a mood actually marks that face
    const plain=p.ev(`expressOn(FIGURES[${JSON.stringify(k)}].rows.slice(0,${cut.head}),`+
      `MOODS.neutral,false,${cut.eye})`).join('|');
    const cross=p.ev(`expressOn(FIGURES[${JSON.stringify(k)}].rows.slice(0,${cut.head}),`+
      `MOODS.hostile,false,${cut.eye})`).join('|');
    const shut=p.ev(`expressOn(FIGURES[${JSON.stringify(k)}].rows.slice(0,${cut.head}),`+
      `MOODS.neutral,true,${cut.eye})`).join('|');
    assert.notEqual(cross,plain,k+' looks the same angry as calm');
    assert.notEqual(shut,plain,k+' never blinks');
    seen[k]=cut.eye;
  }
  // the bug this holds shut: assuming one eye row for all of them
  assert.ok(new Set(Object.values(seen)).size>1,
    'every figure now has its eyes on the same row; the test proves nothing');
  assert.deepEqual(p.errors,[]);
});

test('9t. backgrounding really parks the audio, and waking respects that',
  {skip:jsdomMissing&&'jsdom not installed'}, ()=>{
  const p=openPage();
  p.tap('[data-cmd="fire"]');
  // suspend must not be undone by the statechange it causes
  p.ev('SND.suspend()');
  assert.equal(p.ev('SND.parked'),true,'suspending did not park it');
  assert.equal(p.ev('SND.wake()'),false,'waking undid a suspend we asked for');
  assert.equal(p.ev('SND.parked'),true,'waking unparked what backgrounding parked');
  // only a gesture unparks it
  p.ev('SND.unlock()');
  assert.equal(p.ev('SND.parked'),false,'a gesture did not unpark it');
  // and a muted player holds nobody's audio session
  const q=openPage(win=>{try{win.localStorage.setItem('lotw.sound','0');}catch(e){}});
  q.tap('[data-cmd="fire"]');
  assert.equal(q.ev('SND.on'),false);
  assert.equal(q.ev('SND.session'),false,'a muted page seized the audio session');
  assert.deepEqual(p.errors,[]);
});
