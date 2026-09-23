#!/usr/bin/env node
/* Does the stick actually steer, in every game?
 *
 * The control surface changed in six of the nine games, and a control surface
 * is the one thing in this collection that nothing in a test suite can see.
 * The suites read state; a stick can set every flag correctly while the knob
 * sits in the middle of the gate, or ride out over its own rim, or answer a
 * thumb the page has already scrolled out from under. So this drags the thing
 * with a real pointer in a real browser and asks, game by game:
 *
 *   is there a stick on the page at all, and is it round?
 *   does the knob MOVE when the thumb does - and stay inside its own rim?
 *   does the GAME answer: the direction its own code reads, set while held?
 *   does the man MOVE, where there is a man to move?
 *   does it STOP on release - the flag cleared and the man standing still?
 *   and does the page stay put while all that is dragged across it?
 *
 * The last one is the zoom complaint from the other end: a stick that scrolls
 * the page under itself puts every other control somewhere else.
 *
 *   PW=/path/to/node_modules/playwright-core node tools/stickcheck.js
 */
'use strict';
const path=require('path'), fs=require('fs');
const ROOT=__dirname+'/..';
const CHROME=process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let chromium;
try{ chromium=require(process.env.PW?path.join(process.env.PW,'index.js'):'playwright-core').chromium; }
catch(e){ console.log('playwright-core not installed; skipping.'); process.exit(0); }

/* gate:  what the stick is called in that page
 * start: how to get a game running, if the stick needs one under it
 * right: the game's OWN reading of "the thumb is pushing right", as the game
 *        writes it - not the module's, or this would be asking the stick
 *        whether the stick is working
 * moved: something in the world that a push to the right should change
 * wake:  a control to tap first, where the page spends its first gesture on
 *        the audio unlock and nothing else - a real player loses that one too
 * coasts:the man has momentum and rolls to a stop rather than stopping dead,
 *        so "did it stop" is asked a beat later  */
const GAMES=[
  {g:'aztec',       gate:'.jstick', start:'newGame(3,7)',  right:'!!keys.R',
   moved:'G.hero.x'},
  {g:'drol',        gate:'.jstick', start:'newGame(2,7)',  right:'!!keys.R',
   moved:'G.hero.x', coasts:true},
  {g:'lode-runner', gate:'.jstick', start:'newGame(1,4)',  right:'!!keys.right',
   moved:'G.hero.x'},
  {g:'bards-tale',  gate:'.jstick', right:'!!(stick&&stick.dirs.r)'},
  {g:'law-of-the-west',gate:'.jstick', right:"pressed.has('right')",
   wake:'[data-cmd="fire"]'},
  /* The three that came with a stick of their own, and archon's, which the
   * game already hands a player by default. They are not on the shared
   * module, so this is the only thing holding them to the same bar. */
  {g:'archon',      gate:'.stick',  right:"!!keys['1R']"},
  {g:'choplifter',  gate:'.stick',  right:'stick.x>0.4'},
  {g:'galaga',      gate:'.stick',  right:'stick.x>0.4'},
  {g:'tapped',      gate:'#stick',  right:'Stick.x>0.4'}];

const fail=[], note=[];
const ok=(c,m)=>{ if(!c)fail.push(m); };

(async()=>{
  const b=await chromium.launch({executablePath:CHROME,
    args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const G of GAMES){
    const file=path.join(ROOT,G.g,'index.html');
    if(!fs.existsSync(file)){fail.push(G.g+': no page');continue;}
    const c=await b.newContext({viewport:{width:390,height:820},deviceScaleFactor:2,
      isMobile:true,hasTouch:true});
    const p=await c.newPage();
    const errs=[];
    p.on('pageerror',e=>errs.push(String(e.message||e)));
    await p.goto('file://'+file);
    await p.waitForTimeout(700);
    if(G.wake){const w=await p.$(G.wake); if(w)await w.click();}
    if(G.start)await p.evaluate(s=>{try{eval(s);}catch(e){}},G.start);
    await p.waitForTimeout(300);

    /* Two of the pages keep a second, hidden stick for a second player, and a
     * hidden element measures zero - so take the one that is actually up. */
    const box=await p.evaluate(sel=>{
      const all=[...document.querySelectorAll(sel)];
      const el=all.find(e=>e.getBoundingClientRect().width>0);
      if(!el)return null;
      const r=el.getBoundingClientRect();
      const k=el.querySelector('.jknob,.knob,#knob');
      return {x:r.left,y:r.top,w:r.width,h:r.height,
              knob:k?k.getBoundingClientRect().width:0};
    },G.gate);
    if(!box){fail.push(G.g+': no stick on the page');await c.close();continue;}

    const read=()=>p.evaluate(s=>{try{return eval(s);}catch(e){return 'ERR '+e.message;}},
      '({right:'+G.right+(G.moved?',moved:'+G.moved:'')+'})');
    const scroll=()=>p.evaluate(()=>({x:window.scrollX||0,
      y:window.scrollY||0,over:document.documentElement.scrollWidth-document.documentElement.clientWidth}));

    const cx=box.x+box.w/2, cy=box.y+box.h/2;
    const before=await read(), s0=await scroll();
    await p.mouse.move(cx,cy); await p.mouse.down();
    /* Push it well past the rim: a thumb does, and the knob must not follow it
     * out there. This is the check that caught a knob riding 14px over its own
     * edge in Galaga. */
    await p.mouse.move(cx+box.w,cy,{steps:6});
    await p.waitForTimeout(80);
    const held=await read();
    const knob=await p.evaluate(sel=>{
      const all=[...document.querySelectorAll(sel)];
      const el=all.find(e=>e.getBoundingClientRect().width>0);
      const k=el.querySelector('.jknob,.knob,#knob');
      if(!k)return null;
      const r=el.getBoundingClientRect(), q=k.getBoundingClientRect();
      return {dx:(q.left+q.width/2)-(r.left+r.width/2),
              out:Math.round(q.right-r.right)};
    },G.gate);
    await p.waitForTimeout(480);
    const ran=await read(), s1=await scroll();
    await p.mouse.up();
    await p.waitForTimeout(120);
    const rest=await read();
    /* A man with momentum rolls to a stop; a man with a stuck control does not
     * stop at all. The difference is only visible after the roll has had time
     * to finish, so the standing-still window opens late. */
    await p.waitForTimeout(G.coasts?900:200);
    const settled=await read();
    await p.waitForTimeout(400);
    const after=await read();

    const moved=G.moved&&typeof ran.moved==='number'&&typeof before.moved==='number'
      ? Math.abs(ran.moved-before.moved) : null;
    const stopped=G.moved&&typeof after.moved==='number'&&typeof settled.moved==='number'
      ? Math.abs(after.moved-settled.moved) : null;
    note.push(G.g.padEnd(16)+
      'gate '+Math.round(box.w)+'px'+
      ' | knob '+(knob?Math.round(knob.dx)+'px':'NONE')+
      ' | rim '+(knob?(knob.out>0?'OVER by '+knob.out:'inside'):'-')+
      ' | game '+(held.right===true?'right':'DID NOT ANSWER')+
      ' | man '+(moved===null?'n/a':moved>0.5?'moved '+moved.toFixed(0)+'px':'STILL')+
      ' | let go '+(rest.right===false?'stops':'HELD ON')+
      (stopped===null?'':', '+(stopped<0.5?'and stands':'AND KEEPS GOING')));

    ok(box.w>40,G.g+': the gate is '+Math.round(box.w)+'px across, which is not a control');
    ok(Math.abs(box.w-box.h)<2,G.g+': the gate is not round ('+
      Math.round(box.w)+'x'+Math.round(box.h)+')');
    ok(knob&&knob.dx>8,G.g+': the knob did not follow the thumb');
    ok(knob&&knob.out<=0,G.g+': the knob rides '+(knob?knob.out:'?')+
      'px over its own rim');
    ok(held.right===true,G.g+': the game did not read the push as right ('+
      G.right+' = '+JSON.stringify(held.right)+')');
    if(G.moved)ok(moved>0.5,G.g+': nothing in the world moved while it was held');
    ok(rest.right===false,G.g+': letting go did not stop it ('+
      JSON.stringify(rest.right)+')');
    if(G.moved)ok(stopped<0.5,G.g+': it kept going after the thumb came off');
    ok(s1.x===s0.x&&s1.y===s0.y,G.g+': dragging the stick scrolled the page');
    ok(s1.over<=0,G.g+': the page can be panned sideways by '+s1.over+'px');
    ok(!errs.length,G.g+': the page threw: '+errs.slice(0,2).join(' | '));
    await c.close();
  }
  await b.close();
  console.log('\n--- the stick, game by game ---');
  for(const n of note)console.log('  '+n);
  console.log('\n--- '+(fail.length?fail.length+' FAILURES':'all clear')+' ---');
  for(const f of fail)console.log('  FAIL  '+f);
  process.exit(fail.length?1:0);
})().catch(e=>{console.error('stick harness error:',e);process.exit(2);});
