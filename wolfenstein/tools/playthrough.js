#!/usr/bin/env node
/* A player's session, driven through the keyboard and the touch pads. Only
 * two things are set up behind the player's back, and both are said where
 * they happen: a guard is stood in front of him for the impenetrable check,
 * and he is carried to the way out rather than made to find it.
 *
 *   PW=$PWD/../node_modules/playwright-core node tools/playthrough.js
 */
'use strict';
const path=require('path'),fs=require('fs');
const pw=require(process.env.PW||'playwright-core');
const URL='file://'+path.join(__dirname,'..','index.html');
const results=[];
const check=(ok,what,got)=>{results.push([ok,what,got===undefined?'':got]);};

(async()=>{
  const CAND=[process.env.CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium'].filter(Boolean);
  const exe=CAND.find(p=>{try{return fs.existsSync(p);}catch(e){return false;}});
  const b=await pw.chromium.launch(exe?{executablePath:exe}:{});
  const ctx=await b.newContext({viewport:{width:640,height:860}});
  const pg=await ctx.newPage();
  const errs=[];pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(URL);
  await pg.evaluate(()=>localStorage.clear());
  await pg.reload();await pg.waitForTimeout(400);
  const read=e=>pg.evaluate(e);

  const title=await pg.innerText('#overlay');
  check(/IMPENETRABLE: OFF · MORTAL/.test(title),'a first visit is mortal',title.split('\n').find(l=>/IMPEN/.test(l)));
  check(await read('!!document.getElementById("rg-launch")'),'the way back to the collection is on the page');

  /* the switch, by keyboard: down to it, ENTER */
  await pg.keyboard.press('ArrowDown');await pg.keyboard.press('Enter');await pg.waitForTimeout(80);
  check(/IMPENETRABLE: ON · ENDLESS/.test(await pg.innerText('#overlay')),'ENTER on the switch turns it on');
  check(/IMPENETRABLE/.test(await pg.innerText('#kit')),'and the status bar says so');
  await pg.reload();await pg.waitForTimeout(400);
  check(/IMPENETRABLE: ON/.test(await pg.innerText('#overlay')),'a reload remembers it');

  await pg.keyboard.press('Enter');await pg.waitForTimeout(100);
  check(await read('G.state')==='card','ENTER on START tells the story first',await read('G.state'));
  await pg.keyboard.press('Enter');await pg.waitForTimeout(100);
  check(await read('G.state')==='play','ENTER again goes into the castle',await read('G.state'));

  /* walk */
  const p0=await read('[G.P.x,G.P.y]');
  await pg.keyboard.down('ArrowLeft');await pg.waitForTimeout(500);await pg.keyboard.up('ArrowLeft');
  const p1=await read('[G.P.x,G.P.y]');
  check(p1[0]<p0[0]-8,'holding ARROW LEFT walks him left',Math.round(p0[0])+' → '+Math.round(p1[0]));
  /* turn in place */
  await pg.keyboard.down('x');await pg.keyboard.down('ArrowUp');await pg.waitForTimeout(300);
  await pg.keyboard.up('ArrowUp');await pg.keyboard.up('x');
  const p2=await read('[G.P.x,G.P.y,G.P.dir]');
  check(Math.abs(p2[1]-p1[1])<0.5&&p2[2]===6,'with X held, ARROW UP turns him without a step',JSON.stringify(p2.map(Math.round)));
  /* fire */
  const a0=await read('G.P.ammo');
  await pg.keyboard.press('Space');await pg.waitForTimeout(60);
  check(await read('G.P.ammo')===a0-1,'SPACE fires one round',a0+' → '+await read('G.P.ammo'));
  await pg.keyboard.press('g');await pg.waitForTimeout(60);
  check(await read('G.P.gren')===2,'G throws a grenade',await read('G.P.gren'));
  await pg.waitForTimeout(1200);
  check(await read('G.state')==='play','and it does not end an impenetrable run, however close',await read('G.state'));

  /* impenetrable, in real time: an SS man put in front of him, ten seconds */
  await read(`(()=>{const g=mkGuard('ss',G.P.x+60,G.P.y);room().guards.push(g);alarm(g);return 0;})()`);
  await pg.waitForTimeout(10000);
  const shotAt=await read('G.state');
  check(shotAt==='play'&&!(await read('G.P.dead')),'ten seconds in front of an SS man, and still standing',shotAt);

  /* pause, the map, and the switch from the pause menu */
  await pg.keyboard.press('p');await pg.waitForTimeout(100);
  check(await read('G.state')==='paused','P pauses',await read('G.state'));
  check(await read('!!document.getElementById("map")'),'the pause card has the map');
  await pg.keyboard.press('ArrowDown');await pg.keyboard.press('Enter');await pg.waitForTimeout(80);
  check(/OFF · MORTAL/.test(await pg.innerText('#overlay'))&&await read('G.noRecord')===true,
    'switching it off part way does not make the run a record');
  /* the card is built again with BACK IN lit */
  await pg.keyboard.press('Enter');await pg.waitForTimeout(80);
  check(await read('G.state')==='play','BACK IN plays on',await read('G.state'));
  await read('setImpenetrable(true);0');   /* and on again, for the walk out */

  /* the way out: carried to it, then walked through by the player */
  await read(`(()=>{const C=G.castle;enterRoom(C.exitRoom);const rm=room();rm.guards=[];rm.chests=[];
    rm.g=rm.g.map(t=>t===INNER||t===RUBBLE?FLOOR:t);const s=C.exitSide;
    if(s==='w'){G.P.x=30;G.P.y=92;}else if(s==='e'){G.P.x=W-30;G.P.y=92;}
    else if(s==='n'){G.P.x=140;G.P.y=30;}else{G.P.x=140;G.P.y=H-14;}return 0;})()`);
  const key={w:'ArrowLeft',e:'ArrowRight',n:'ArrowUp',s:'ArrowDown'}[await read('G.castle.exitSide')];
  await pg.keyboard.down(key);
  await pg.waitForFunction(()=>G.state==='card',null,{timeout:8000}).catch(()=>{});
  await pg.keyboard.up(key);
  check(/ESCAPED/.test(await pg.innerText('#overlay')),'walking out of the way out escapes the castle',
    (await pg.innerText('#overlay')).split('\n')[0]);
  await pg.keyboard.press('Enter');await pg.waitForTimeout(100);
  check(await read('G.castle.d')===2&&/CASTLE 2/.test(await pg.innerText('#overlay')),'and there is another castle');
  check(await read('localStorage.getItem("wolfenstein.best")')===null,'an impenetrable run left no record');

  /* mortal, the other way: shot once, and it is over */
  await pg.keyboard.press('Enter');await pg.waitForTimeout(80);
  await pg.keyboard.press('p');await pg.keyboard.press('Escape');await pg.waitForTimeout(80);
  await read(`G.state='play';setImpenetrable(false);hideOverlay();G.P.vest=0;
    G.shots.push({x:G.P.x+6,y:G.P.y-8,vx:-GSHOT,vy:0,from:'g',life:3});0`);
  await pg.waitForFunction(()=>G.state==='over',null,{timeout:8000}).catch(()=>{});
  check(/KILLED/.test(await pg.innerText('#overlay')),'mortal, one bullet ends it',await read('G.state'));

  /* on a phone, with fingers */
  const ph=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  const pp=await ph.newPage();pp.on('pageerror',e=>errs.push(e.message));
  await pp.goto(URL);await pp.waitForTimeout(400);
  await pp.tap('#overlay .menuitem.sel');await pp.waitForTimeout(100);
  await pp.tap('#overlay .menuitem.sel');
  await pp.waitForFunction(()=>G.state==='play',null,{timeout:8000}).catch(()=>{});
  check(await pp.evaluate('G.state')==='play','two taps and a finger is in the castle',await pp.evaluate('G.state'));
  const cdp=await ph.newCDPSession(pp);
  const touch=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});
  const sb=await pp.locator('#stick').boundingBox();
  const cx=sb.x+sb.width/2,cy=sb.y+sb.height/2;
  const q0=await pp.evaluate('[G.P.x,G.P.y]');
  await touch('touchStart',cx,cy);await touch('touchMove',cx-40,cy-40);await pp.waitForTimeout(500);
  const q1=await pp.evaluate('[G.P.x,G.P.y,G.P.dir]');
  check(q1[2]===5,'the joystick pushed up and left faces him up and left',q1[2]);
  check(Math.hypot(q1[0]-q0[0],q1[1]-q0[1])>6,'and walks him',Math.round(Math.hypot(q1[0]-q0[0],q1[1]-q0[1]))+'px');
  check(/translate\(-/.test(await pp.evaluate(()=>document.getElementById('knob').style.transform)),
    'the stick on the glass leans the way it is pushed');
  await touch('touchEnd');await pp.waitForTimeout(150);
  check(await pp.evaluate('!keys.left&&!keys.up'),'letting go of it stops him');
  check(/translate\(0/.test(await pp.evaluate(()=>document.getElementById('knob').style.transform)),'and it springs back');
  const tapBtn=async id=>{const bb=await pp.locator(id).boundingBox();
    await touch('touchStart',bb.x+bb.width/2,bb.y+bb.height/2);await pp.waitForTimeout(60);await touch('touchEnd');
    await pp.waitForTimeout(60);};
  const f0=await pp.evaluate('G.P.ammo');
  await tapBtn('#bf');
  check(await pp.evaluate('G.P.ammo')===f0-1,'a finger on FIRE fires',f0+' → '+await pp.evaluate('G.P.ammo'));
  await tapBtn('#bg');
  check(await pp.evaluate('G.P.gren')===2,'a finger on THROW throws',await pp.evaluate('G.P.gren'));
  await tapBtn('#bs');
  check(await pp.evaluate('!!G.msg'),'a finger on SEARCH searches',await pp.evaluate('G.msg&&G.msg.text'));
  /* AIM held with one finger, the stick with the other */
  const ab=await pp.locator('#ba').boundingBox();
  const r0=await pp.evaluate('[G.P.x,G.P.y]');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:ab.x+ab.width/2,y:ab.y+ab.height/2,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:ab.x+ab.width/2,y:ab.y+ab.height/2,id:1},{x:cx,y:cy,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:ab.x+ab.width/2,y:ab.y+ab.height/2,id:1},{x:cx+45,y:cy,id:2}]});
  await pp.waitForTimeout(400);
  const r1=await pp.evaluate('[G.P.x,G.P.y,G.P.dir]');
  await touch('touchEnd');
  check(r1[2]===0&&Math.hypot(r1[0]-r0[0],r1[1]-r0[1])<0.5,'AIM held, the stick turns him and does not walk him',JSON.stringify(r1.map(Math.round)));

  for(const [ok,what,got] of results)console.log((ok?'  ok   ':'  FAIL ')+what+(got!==''?'  ('+got+')':''));
  if(errs.length){console.log('page errors:');errs.forEach(e=>console.log('  '+e));}
  const bad=results.filter(r=>!r[0]).length+errs.length;
  console.log(bad?bad+' failed':'all '+results.length+' held');
  await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
