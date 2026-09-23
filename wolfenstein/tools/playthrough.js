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
  /* the castle is a new one every time, and the cell's chest may stand on
     either side of him: walk the way that has floor */
  const way=await read('boxFree(room(),G.P.x-20,G.P.y)&&boxFree(room(),G.P.x-8,G.P.y)?-1:1');
  const p0=await read('[G.P.x,G.P.y]');
  const arrow=way<0?'ArrowLeft':'ArrowRight';
  await pg.keyboard.down(arrow);await pg.waitForTimeout(500);await pg.keyboard.up(arrow);
  const p1=await read('[G.P.x,G.P.y]');
  check((p1[0]-p0[0])*way>8,'holding '+arrow.replace('Arrow','ARROW ').toUpperCase()+' walks him that way',Math.round(p0[0])+' → '+Math.round(p1[0]));
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

  /* the gun away, and questioned: an SS man stood beside a man in uniform */
  await pg.keyboard.press('h');await pg.waitForTimeout(60);
  check(await read('G.P.holstered')===true,'H puts the gun away');
  const a1=await read('G.P.ammo');
  await pg.keyboard.press('Space');await pg.waitForTimeout(400);
  check(await read('G.P.ammo')===a1&&await read('G.P.holstered')===false,'SPACE with the gun away draws it, no shot');
  await pg.keyboard.press('h');await pg.waitForTimeout(400);
  await read(`(()=>{G.P.uniform=true;G.P.papers=true;room().blown=false;const rm=room();rm.guards=[];
    const g=mkGuard('ss',G.P.x+24,G.P.y);g.st='stand';g.t=1e9;rm.guards.push(g);return 0;})()`);
  await pg.waitForFunction(()=>G.state==='question',null,{timeout:6000}).catch(()=>{});
  check(await read('G.state')==='question','walk up to an SS man in uniform and he questions you',await read('G.state'));
  check(/„.+“/.test(await pg.innerText('#overlay')),'in German, on the card',(await pg.innerText('#overlay')).split('\n')[0]);
  for(let n=0;n<6&&await read('G.state')==='question';n++){
    const want=await read(`G.q.cur.a.findIndex(o=>o[2]==='good'||o[2]==='holster')`);
    const at=await read('menuSel');
    for(let k=0;k<(want-at+3)%3;k++)await pg.keyboard.press('ArrowDown');
    await pg.keyboard.press('Enter');await pg.waitForTimeout(80);
  }
  check(await read('G.state')==='play'&&await read('room().guards[0].cleared'),'answered right by keyboard, he waves you on');
  await read(`room().guards=[];0`);

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
  await read(`G.state='play';setImpenetrable(false);hideOverlay();G.P.vest=0;G.P.grazed=true;/* castle 2 grazes once */
    room().guards=[];room().chests=[];room().g=room().g.map(t=>t===INNER||t===RUBBLE?FLOOR:t);G.P.x=140;G.P.y=92;
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
  /* Galaga's handling: how far you push is how fast he walks */
  const speed=async(frac)=>{
    await pp.evaluate(()=>{const rm=room();rm.guards=[];rm.chests=[];rm.g=rm.g.map(t=>t===INNER||t===RUBBLE?FLOOR:t);
      G.P.x=60;G.P.y=92;});
    const R=await pp.evaluate(()=>stickRadius());
    const x0=await pp.evaluate('G.P.x');
    await touch('touchStart',cx,cy);await touch('touchMove',cx+R*frac,cy);await pp.waitForTimeout(700);
    const x1=await pp.evaluate('G.P.x');await touch('touchEnd');await pp.waitForTimeout(100);
    return x1-x0;};
  const soft=await speed(0.45),hard=await speed(1);
  check(soft>2&&soft<hard*0.75,'a light push on the stick walks him slower than a full one',
    Math.round(soft)+'px against '+Math.round(hard)+'px');
  const tapBtn=async id=>{const bb=await pp.locator(id).boundingBox();
    await touch('touchStart',bb.x+bb.width/2,bb.y+bb.height/2);await pp.waitForTimeout(60);await touch('touchEnd');
    await pp.waitForTimeout(60);};
  const f0=await pp.evaluate('G.P.ammo');
  await tapBtn('#bf');
  check(await pp.evaluate('G.P.ammo')===f0-1,'a finger on FIRE fires',f0+' → '+await pp.evaluate('G.P.ammo'));
  const j0=await pp.evaluate('G.P.ammo');
  await tapBtn('#j0');
  check(await pp.evaluate('G.P.ammo')===j0-1,'button 0 on the joystick box fires',j0+' → '+await pp.evaluate('G.P.ammo'));
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
  const j1=await pp.locator('#j1').boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:j1.x+j1.width/2,y:j1.y+j1.height/2,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:j1.x+j1.width/2,y:j1.y+j1.height/2,id:1},{x:cx,y:cy,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:j1.x+j1.width/2,y:j1.y+j1.height/2,id:1},{x:cx,y:cy+45,id:2}]});
  await pp.waitForTimeout(400);
  const r2=await pp.evaluate('[G.P.x,G.P.y,G.P.dir]');
  await touch('touchEnd');
  check(r2[2]===2&&Math.hypot(r2[0]-r1[0],r2[1]-r1[1])<0.5,'button 1 held does the same: turn, no step',JSON.stringify(r2.map(Math.round)));

  /* a finger on HOLSTER, and a finger on an answer */
  await pp.evaluate(()=>{G.P.holstered=false;G.P.busy=null;});
  await tapBtn('#bh');
  check(await pp.evaluate('G.P.holstered'),'a finger on HOLSTER puts the gun away');
  await pp.evaluate(()=>{G.P.uniform=true;room().blown=false;const rm=room();rm.guards=[];
    const g=mkGuard('guard',G.P.x+16,G.P.y);g.st='stand';g.t=1e9;rm.guards.push(g);});
  await pp.waitForFunction(()=>G.state==='question',null,{timeout:6000}).catch(()=>{});
  check(await pp.evaluate('G.state')==='question','a guard questions a man in uniform, on a phone too');
  const good=await pp.evaluate(`G.q.cur.a.findIndex(o=>o[2]==='good'||o[2]==='holster')`);
  const qb=await pp.locator('#overlay .qa').nth(good).boundingBox();
  await touch('touchStart',qb.x+qb.width/2,qb.y+qb.height/2);await touch('touchEnd');await pp.waitForTimeout(150);
  check(await pp.evaluate('G.state')==='play','a finger on the right answer, and he waves you on',await pp.evaluate('G.state'));

  /* The German voice. This machine's browser has no speech voices, so a
     German one is put in its place and every line handed to it is kept:
     what is said, in which language, at what pitch and what pace. */
  const vc=await b.newContext({viewport:{width:640,height:860}});
  await vc.addInitScript(()=>{
    window.__spoken=[];
    const v={lang:'de-DE',name:'Deutsch (test)'};
    window.SpeechSynthesisUtterance=function(t){this.text=t;};
    Object.defineProperty(window,'speechSynthesis',{value:{pending:false,getVoices:()=>[v],
      addEventListener(){},cancel(){},speak(u){window.__spoken.push({t:u.text,lang:u.lang,v:u.voice&&u.voice.lang,
        p:u.pitch,r:u.rate});}}});
  });
  const vp=await vc.newPage();vp.on('pageerror',e=>errs.push(e.message));
  await vp.goto(URL);await vp.waitForTimeout(300);
  await vp.evaluate(()=>{newGame(4);startCastle(4);hideOverlay();G.state='play';G.impenetrable=true;Snd.on=true;
    const rm=room();rm.guards=[];rm.chests=[];rm.g=rm.g.map(t=>t===INNER||t===RUBBLE?FLOOR:t);
    G.P.x=100;G.P.y=92;G.P.uniform=true;G.P.holstered=true;room().blown=false;
    const a=mkGuard('ss',124,92);a.st='stand';a.t=1e9;rm.guards.push(a);});
  await vp.waitForFunction(()=>G.state==='question',null,{timeout:6000}).catch(()=>{});
  await vp.waitForTimeout(700);
  await vp.evaluate(()=>{const g=mkGuard('guard',0,0);say(g,'Halt!','bark',true);say(g,'Wohin gehen Sie?','ask',true);});
  const said=await vp.evaluate(()=>__spoken);
  check(said.length>=3&&said.every(u=>u.lang==='de-DE'&&u.v==='de-DE'),'with a German voice, every line is spoken in German',
    said.map(u=>u.t).join(' / '));
  const ssLine=said.find(u=>/Sie da|Moment/.test(u.t)),q=said[said.length-3]||said[1];
  const bark=said[said.length-2],ask=said[said.length-1];
  check(ssLine&&ssLine.p<bark.p*0.8,'the SS speak lower than a guard',ssLine&&(ssLine.p.toFixed(2)+' against '+bark.p.toFixed(2)));
  check(bark.r>ask.r,'an order comes faster than a question',bark.r.toFixed(2)+' against '+ask.r.toFixed(2));
  await vc.close();

  for(const [ok,what,got] of results)console.log((ok?'  ok   ':'  FAIL ')+what+(got!==''?'  ('+got+')':''));
  if(errs.length){console.log('page errors:');errs.forEach(e=>console.log('  '+e));}
  const bad=results.filter(r=>!r[0]).length+errs.length;
  console.log(bad?bad+' failed':'all '+results.length+' held');
  await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
