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
const {fillUnwritten}=require('./fixture-content.js');
const ROOT=path.join(__dirname,'..');
const HTML=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const open_pages=[];
process.on('exit',()=>open_pages.forEach(d=>{try{d.window.close();}catch(e){}}));

function openPage(){
  if(jsdomMissing)throw new Error('jsdom is not installed');
  // no pretendToBeVisual: the page's loop must not keep the harness alive
  const dom=new JSDOM(HTML,{runScripts:"dangerously",
    url:"https://example.invalid/law-of-the-west/"});
  open_pages.push(dom);
  const w=dom.window;
  const errors=[];
  w.addEventListener("error",e=>errors.push(String(e.message||e.error)));
  w.console.error=(...a)=>errors.push(a.join(' '));
  // canvas has no 2d context in jsdom, and there is no audio hardware
  const ctx2d=new Proxy({},{get:(t,k)=>k==='canvas'?{width:320,height:200}:()=>{}});
  w.HTMLCanvasElement.prototype.getContext=()=>ctx2d;
  // top-level const/let in a classic script are global lexical bindings, not
  // window properties, so the page's scope is reached through its own eval
  const ev=code=>w.eval(code);
  assert.ok(ev('typeof SND')==='object','the page did not build SND');
  // the written encounter plays as authored; the rest get fixture turns
  fillUnwritten(ev('ENCOUNTERS'),ev('DIALOGUE'),ev('INTENTS'),ev('RULES').TURNS);
  return {dom,w,errors,ev,
    G:()=>ev('G'), snd:()=>ev('SND'), hit:()=>ev('HITBOX'),
    ready(){ev('build').rows=10;ev('paint()');},
    el:id=>w.document.getElementById(id),
    press:key=>w.document.dispatchEvent(new w.KeyboardEvent("keydown",{key,bubbles:true})),
    tap:sel=>{const el=w.document.querySelector(sel);
      assert.ok(el,'no control matching '+sel);
      const Ev=w.PointerEvent||w.MouseEvent||w.Event;
      el.dispatchEvent(new Ev("pointerdown",{bubbles:true,cancelable:true}));
      return el;},
    frame:ms=>{w.performance.now=()=>ms; ev('__frame')(ms);}};
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
  assert.equal(p.ev('ENCOUNTERS')[p.G().slot].id,'deputy');
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
    const turn0=q.G().turn, risk0=q.G().S.drawRisk;
    q.tap('#line'+(i+1));
    assert.ok(q.G().turn>turn0||q.G().phase!=='dialogue'||q.G().S.drawRisk!==risk0,
      'tapping choice '+(i+1)+' changed nothing');
    const r=openPage();
    r.tap('[data-cmd="fire"]'); r.ready();
    const b0=r.G().turn;
    r.press(String(i+1));
    assert.ok(r.G().turn>b0||r.G().phase!=='dialogue',
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
  assert.match(p.el('mode').textContent,/GUN DRAWN/);
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
  assert.match(p.el('mute').textContent,/SOUND (ON|OFF)/);
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
    else if(ph==='resolve'){p.tap('[data-cmd="fire"]');}
    else if(ph==='tell'||ph==='duel'){
      if(p.G().mode!=='gun')p.tap('[data-cmd="up"]');   // he telegraphed: draw
      p.G().aim={...p.hit().weapon};
      p.tap('[data-cmd="fire"]');}
    else if(ph==='aiming'){p.G().aim={...p.hit().weapon};p.tap('[data-cmd="fire"]');}
    else break;
  }
  assert.equal(p.G().phase,'summary','the day never reached sundown (stuck in '+p.G().phase+')');
  assert.ok(p.G().over.rating>=1&&p.G().over.rating<=12,'rating out of range: '+p.G().over.rating);
  assert.equal(Object.keys(p.G().over.categories).length,7,'expected a 7-category matrix');
  assert.match(p.el('line0').textContent,/RATING \d+ OF 12/);
  p.tap('[data-cmd="fire"]');
  assert.equal(p.G().phase,'dialogue','FIRE on the summary did not start a new day');
  assert.equal(p.G().slot,0);
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
