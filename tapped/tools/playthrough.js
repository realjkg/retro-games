#!/usr/bin/env node
/* A player's session, driven only through the keyboard and the touch pads -
 * nothing here calls into the game to make something happen. It asks what a
 * player would ask: did START start it, did holding pour send a mug, does the
 * bar I left come back when I reload the page, did my three letters go on the
 * wall.
 *
 *   PW=$PWD/../node_modules/playwright-core node tools/playthrough.js
 */
'use strict';
const path=require('path'),fs=require('fs');
const pw=require(process.env.PW||'playwright-core');
const URL='file://'+path.join(__dirname,'..','index.html');
const results=[];
const check=(ok,what,got)=>{results.push([ok,what,got]);};

(async()=>{
  const CAND=[process.env.CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium'].filter(Boolean);
  const exe=CAND.find(p=>{try{return fs.existsSync(p);}catch(e){return false;}});
  const b=await pw.chromium.launch(exe?{executablePath:exe}:{});
  const ctx=await b.newContext({viewport:{width:520,height:860}});
  const pg=await ctx.newPage();
  const errs=[];pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(URL);
  await pg.evaluate(()=>localStorage.clear());
  await pg.reload();await pg.waitForTimeout(400);
  const read=e=>pg.evaluate(e);

  check(!/RESUME/.test(await pg.innerText('#overlay')),'a first visit offers no RESUME','');
  await pg.keyboard.press('Enter');
  await pg.waitForTimeout(2300);
  check(await read('G.state')==='play','ENTER on START starts a game',await read('G.state'));

  await pg.keyboard.down('Space');await pg.waitForTimeout(650);await pg.keyboard.up('Space');
  await pg.waitForTimeout(80);
  const mugs=await read('G.mugs.filter(m=>m.full).length+G.cust.filter(p=>p.st==="slide").length');
  check(mugs>=1,'holding SPACE at the tap and letting go sends a mug',mugs);

  const l0=await read('G.bt.lane');
  await pg.keyboard.press('ArrowDown');await pg.waitForTimeout(60);
  check(await read('G.bt.lane')===(l0+1)%4,'ARROW DOWN moves one bar down',await read('G.bt.lane'));
  await pg.keyboard.down('ArrowLeft');await pg.waitForTimeout(400);await pg.keyboard.up('ArrowLeft');
  const bx=await read('G.bt.x');
  check(bx<200,'ARROW LEFT runs down the bar',Math.round(bx));

  await pg.keyboard.press('p');await pg.waitForTimeout(100);
  check(await read('G.state')==='paused','P pauses',await read('G.state'));
  const before=await read('JSON.stringify({s:G.score,l:G.level,n:G.cust.length,b:G.bt.lane})');
  await pg.reload();await pg.waitForTimeout(500);
  const menu=await pg.innerText('#overlay');
  check(/RESUME · LEVEL 1/.test(menu),'after a reload the title offers RESUME',menu.split('\n')[2]||'');
  await pg.keyboard.press('Enter');await pg.waitForTimeout(200);
  const after=await read('JSON.stringify({s:G.score,l:G.level,n:G.cust.length,b:G.bt.lane})');
  check(after===before,'RESUME brings back the same bar',before+' → '+after);
  check(await read('G.state')==='paused','and brings it back paused',await read('G.state'));
  await pg.keyboard.press('Enter');await pg.waitForTimeout(100);
  check(await read('G.state')==='play','ENTER on BACK IN plays on',await read('G.state'));

  /* lose the last bartender and sign the wall, by keyboard */
  await read(`G.lives=1;G.score=4200;G.mugs.push({lane:G.bt.lane===0?1:0,x:24,v:118,full:true});0`);
  /* wait on the state, not the clock: a headless frame loop runs slow */
  await pg.waitForFunction(()=>G.state!=='play'&&G.state!=='dying',null,{timeout:10000}).catch(()=>{});
  check(await read('G.state')==='initials','a score for the table asks for letters',await read('G.state'));
  await pg.keyboard.type('jkg');await pg.keyboard.press('Enter');await pg.waitForTimeout(200);
  const table=await read('localStorage.getItem("tapped.scores")')||'';
  check(/"n":"JKG","s":4200/.test(table),'typed letters go on the wall',table.slice(0,40));
  check(/1\. JKG/.test(await pg.innerText('#overlay')),'and the wall is shown','');
  check(await read('localStorage.getItem("tapped.save")')===null,'game over clears the slot','');
  await pg.reload();await pg.waitForTimeout(400);
  check(!/RESUME/.test(await pg.innerText('#overlay')),'no RESUME once the game is over','');
  check(await read('high()')===4200,'the high score survives a reload',await read('high()'));

  /* the same on a phone, with fingers */
  const ph=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  const pp=await ph.newPage();pp.on('pageerror',e=>errs.push(e.message));
  await pp.goto(URL);await pp.waitForTimeout(400);
  await pp.tap('#overlay .menuitem.sel');
  await pp.waitForFunction(()=>G.state==='play',null,{timeout:8000}).catch(()=>{});
  check(await pp.evaluate('G.state')==='play','a tap on START starts it',await pp.evaluate('G.state'));
  const box=await pp.locator('#bf').boundingBox();
  const cdp=await ph.newCDPSession(pp);
  const at=(type)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:
    [{x:box.x+box.width/2,y:box.y+box.height/2}]});
  await at('touchStart');await pp.waitForTimeout(650);await at('touchEnd');await pp.waitForTimeout(80);
  const pm=await pp.evaluate('G.mugs.filter(m=>m.full).length+G.cust.filter(p=>p.st==="slide").length');
  check(pm>=1,'holding POUR with a finger and letting go sends a mug',pm);
  /* the joystick, with a thumb: push down, come back, push left, let go */
  const sb=await pp.locator('#stick').boundingBox();
  const cx=sb.x+sb.width/2,cy=sb.y+sb.height/2;
  const touch=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});
  const lane0=await pp.evaluate('G.bt.lane');
  await touch('touchStart',cx,cy);await touch('touchMove',cx,cy+50);await pp.waitForTimeout(60);
  await touch('touchMove',cx,cy);
  check(await pp.evaluate('G.bt.lane')===(lane0+1)%4,'a push down on the joystick moves one bar',await pp.evaluate('G.bt.lane'));
  const x0=await pp.evaluate('G.bt.x');
  await touch('touchMove',cx-50,cy);await pp.waitForTimeout(400);
  const x1=await pp.evaluate('G.bt.x');
  check(x1<x0-20,'holding the joystick left runs down the bar',Math.round(x0)+' → '+Math.round(x1));
  const knob=await pp.evaluate(()=>document.getElementById('knob').style.transform);
  check(/translate\(-/.test(knob),'the stick on the glass leans the way it is pushed',knob);
  await touch('touchEnd');await pp.waitForTimeout(200);
  const x2=await pp.evaluate('G.bt.x');
  check(Math.abs(x2-x1-0)<30&&await pp.evaluate('keys.left')===false,'letting go of it stops him',Math.round(x2));
  check(/translate\(0/.test(await pp.evaluate(()=>document.getElementById('knob').style.transform)),'and it springs back to the middle','');

  for(const [ok,what,got] of results)console.log((ok?'  ok   ':'  FAIL ')+what+(got!==''?'  ('+got+')':''));
  if(errs.length){console.log('page errors:');errs.forEach(e=>console.log('  '+e));}
  const bad=results.filter(r=>!r[0]).length+errs.length;
  console.log(bad?bad+' failed':'all '+results.length+' held');
  await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
