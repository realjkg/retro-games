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
const VG=require('./voicegender.js');
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
  check(/TALK: 1981 · SHOUTS ONLY/.test(title),'and shouts only, as in 1981',title.split('\n').find(l=>/TALK/.test(l)));
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

  /* The castle's own voice: the keys pressed so far have unlocked the sound,
     and a guard's shout is played through it, not handed to the device */
  check(await read('!!Snd.ctx&&Snd.ctx.state==="running"'),'a key unlocks the sound',await read('Snd.ctx&&Snd.ctx.state'));
  /* a shout is played through the castle's own voice: a clip, not a beep and
     not the device (read defensively, so this still runs on older builds) */
  const heard=await read(`(()=>{const n0=typeof Snd.played==='number'?Snd.played:0;
    say(mkGuard('guard',0,0),'Halt! Kommen Sie!','bark',true);
    return (typeof Snd.played==='number'?Snd.played:0)-n0;})()`);
  check(heard===1,'a guard\'s shout is played as a recorded line: "Halt! Kommen Sie!"',heard+' clip(s)');

  /* the gun away, and questioned: an SS man stood beside a man in uniform */
  await pg.keyboard.press('h');await pg.waitForTimeout(60);
  check(await read('G.P.holstered')===true,'H puts the gun away');
  const a1=await read('G.P.ammo');
  await pg.keyboard.press('Space');await pg.waitForTimeout(400);
  check(await read('G.P.ammo')===a1&&await read('G.P.holstered')===false,'SPACE with the gun away draws it, no shot');
  await pg.keyboard.press('h');await pg.waitForTimeout(400);
  await read(`(()=>{G.talk='questioned';G.P.uniform=true;G.P.papers=true;room().blown=false;const rm=room();rm.guards=[];
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
  /* stopped again, and this time H: the gun comes out on him */
  await read(`(()=>{G.P.holstered=true;const rm=room();rm.guards=[];room().blown=false;
    const g=mkGuard('guard',G.P.x+18,G.P.y);g.st='stand';g.t=1e9;rm.guards.push(g);return 0;})()`);
  await pg.waitForFunction(()=>G.state==='question',null,{timeout:6000}).catch(()=>{});
  await pg.keyboard.press('h');await pg.waitForTimeout(120);
  check(await read('G.state')==='play'&&await read('room().guards[0].st')==='hup','stopped and questioned, H draws on him and his hands go up',
    await read('room().guards[0].st'));
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
  check(await pp.evaluate('!!Snd.ctx&&Snd.ctx.state==="running"'),'and the first tap unlocked the sound',await pp.evaluate('Snd.ctx&&Snd.ctx.state'));
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
  await pp.evaluate(()=>{G.talk='questioned';G.P.uniform=true;room().blown=false;const rm=room();rm.guards=[];
    const g=mkGuard('guard',G.P.x+16,G.P.y);g.st='stand';g.t=1e9;rm.guards.push(g);});
  await pp.waitForFunction(()=>G.state==='question',null,{timeout:6000}).catch(()=>{});
  check(await pp.evaluate('G.state')==='question','a guard questions a man in uniform, on a phone too');
  const good=await pp.evaluate(`G.q.cur.a.findIndex(o=>o[2]==='good'||o[2]==='holster')`);
  const qb=await pp.locator('#overlay .qa').nth(good).boundingBox();
  await touch('touchStart',qb.x+qb.width/2,qb.y+qb.height/2);await touch('touchEnd');await pp.waitForTimeout(150);
  check(await pp.evaluate('G.state')==='play','a finger on the right answer, and he waves you on',await pp.evaluate('G.state'));

  /* The voice, heard. Two things are put into this page before it loads.
     The device voices a German iPhone or Mac actually has: Anna, a woman,
     who is the first German voice there and whom an earlier build picked,
     and Markus, a man. Every line handed to them is kept. And a tap on the
     loudspeaker: everything the page's own sound plays is recorded as it
     plays, so what a guard's shout sounds like is measured from the output,
     whatever made it, clip or beep, by tools/voicegender.js. */
  const vc=await b.newContext({viewport:{width:640,height:860}});
  await vc.addInitScript(()=>{
    window.__spoken=[];window.__pcm=[];window.__rec=false;window.__sr=0;
    const vs=[{lang:'de-DE',name:'Anna',default:true},{lang:'de-DE',name:'Markus'},{lang:'en-US',name:'Samantha'}];
    window.SpeechSynthesisUtterance=function(t){this.text=t;};
    Object.defineProperty(window,'speechSynthesis',{value:{pending:false,speaking:false,getVoices:()=>vs,
      addEventListener(){},removeEventListener(){},cancel(){},pause(){},resume(){},
      speak(u){window.__spoken.push({t:u.text,v:u.voice?u.voice.name:'(default: Anna)',p:u.pitch==null?1:u.pitch});}}});
    const taps=new WeakMap(),conn=AudioNode.prototype.connect;
    AudioNode.prototype.connect=function(dst){
      const r=conn.apply(this,arguments);
      const c=this.context;
      if(dst&&dst===c.destination&&!(c instanceof OfflineAudioContext)&&!(this instanceof ScriptProcessorNode)){
        let t=taps.get(c);
        if(!t){t=c.createScriptProcessor(4096,1,1);window.__sr=c.sampleRate;
          t.onaudioprocess=e=>{if(window.__rec)window.__pcm.push(Array.from(e.inputBuffer.getChannelData(0)));};
          conn.call(t,c.destination);taps.set(c,t);}
        conn.call(this,t);
      }
      return r;
    };
  });
  const vp=await vc.newPage();vp.on('pageerror',e=>errs.push(e.message));
  await vp.goto(URL);await vp.waitForTimeout(300);
  await vp.keyboard.press('ArrowLeft');await vp.waitForTimeout(200);
  await vp.evaluate(()=>{G.talk='questioned';newGame(4);startCastle(4);hideOverlay();G.state='play';G.impenetrable=true;Snd.on=true;G.demo=false;
    if(typeof Voice!=='undefined'&&Voice.init)try{Voice.init();}catch(e){}
    const rm=room();rm.guards=[];rm.chests=[];rm.g=rm.g.map(t=>t===INNER||t===RUBBLE?FLOOR:t);
    G.P.x=100;G.P.y=92;G.P.uniform=true;G.P.holstered=true;room().blown=false;
    const a=mkGuard('ss',124,92);a.st='stand';a.t=1e9;rm.guards.push(a);});
  await vp.waitForFunction(()=>G.state==='question',null,{timeout:6000}).catch(()=>{});
  await vp.waitForTimeout(700);
  check(await vp.evaluate('G.state')==='question','an SS man stops a man in uniform and questions him',await vp.evaluate('G.state'));
  /* the lines every guard has, and one nobody recorded */
  await vp.evaluate(()=>{const g=mkGuard('guard',0,0);say(g,'Halt!','bark',true);say(g,'Wohin gehen Sie?','ask',true);
    say(g,'Das Wetter ist heute schlecht, Kamerad.','chat',true);});
  const said=await vp.evaluate(()=>__spoken);
  const women=said.filter(u=>u.v!=='Markus');
  check(women.length===0,'the device\'s woman\'s voice, Anna, never speaks for a guard',
    women.length?women.map(u=>u.v+': '+u.t).join(' / '):said.length+' line(s), all Markus');
  check(!said.some(u=>/^(Halt!|Wohin gehen Sie\?)$/.test(u.t)),'what the castle has recorded is never handed to the device',
    said.map(u=>u.t).join(' / ')||'nothing handed over');
  check(said.every(u=>u.p<=1),'and the man\'s voice is never pitched up',said.map(u=>u.p.toFixed(2)).join(' ')||'-');

  /* the shouts, heard at the loudspeaker. The highest-voiced guard and SS
     man the castle can make, at the fastest they are played */
  const pitchOf=async(kind,text)=>{
    await vp.evaluate(([kind,text])=>{Snd.clips&&Snd.clips.forEach(s=>{try{s.stop();}catch(e){}});
      window.__pcm=[];window.__rec=true;const g=mkGuard(kind,0,0);
      if(typeof voiceFor==='function')g.voice=voiceFor(kind,1.15,1.1);
      say(g,text,'bark',true);},[kind,text]);
    await vp.waitForTimeout(2600);
    const {pcm,sr}=await vp.evaluate(()=>{window.__rec=false;return{pcm:[].concat(...window.__pcm),sr:window.__sr};});
    let e=0;for(const v of pcm)e+=v*v;
    if(!pcm.length||e<1e-6)return{f0:NaN,voiced:0,sound:false};
    return Object.assign(VG.judge(Float32Array.from(pcm),sr),{sound:true});
  };
  for(const [kind,text] of [['guard','Halt! Kommen Sie!'],['guard','Was ist los?'],['ss','Halt! SS!'],['ss','Ihren Pass!']]){
    const j=await pitchOf(kind,text);
    check(j.sound&&j.man,'a '+(kind==='ss'?'SS man':'guard')+' shouting "'+text+'" is heard in a man\'s voice, under '+VG.MAN_MAX+' Hz',
      j.sound?Math.round(j.f0)+' Hz over '+j.voiced+' voiced frames':'no sound came out');
  }
  await vc.close();

  /* Hands up. A gun pointed at a guard, by real keys: turned on him with X
     held and an arrow, or drawn with SPACE (H while questioned), and his
     hands must go up within half a second and stay up while it is on him.
     Read defensively, so this runs on builds without the challenge. */
  const hc=await b.newContext({viewport:{width:640,height:860}});
  const hp=await hc.newPage();hp.on('pageerror',e=>errs.push(e.message));
  await hp.goto(URL);await hp.waitForTimeout(300);
  const stand=o=>hp.evaluate(o=>{
    G.talk=o.talk||'1981';newGame(4);startCastle(4);hideOverlay();G.state='play';G.impenetrable=true;Snd.on=false;G.demo=false;
    const rm=room();rm.guards=[];rm.chests=[];rm.g=rm.g.map(t=>t===INNER||t===RUBBLE?FLOOR:t);rm.blown=false;
    G.P.x=100;G.P.y=92;G.P.uniform=!!o.uniform;G.P.holstered=!!o.holstered;G.P.dir=o.dir;G.P.face=o.dir===4?-1:1;
    const g=mkGuard('guard',100+o.dx,92);g.st=o.st||'stand';g.t=1e9;g.face=-1;if(o.st==='alert')g.fireT=1;
    if(o.cleared)g.cleared=true;rm.guards.push(g);window.__g=g;},o);
  const turnOn=async()=>{await hp.keyboard.down('x');await hp.keyboard.down('ArrowRight');await hp.waitForTimeout(120);
    await hp.keyboard.up('ArrowRight');await hp.keyboard.up('x');};
  const upBy=async ms=>{for(let t=0;t<ms;t+=50){if(await hp.evaluate('__g.st')==='hup')return t;await hp.waitForTimeout(50);}return -1;};
  const HUP=[
    ['challenged, he turns his gun on the guard',{dir:4,dx:60},'challenge',turnOn],
    ['in uniform, he draws on the guard in front of him',{uniform:true,holstered:true,dir:0,dx:60},null,()=>hp.keyboard.press('Space')],
    ['waved on after questioning, then he draws',{talk:'questioned',uniform:true,holstered:true,dir:0,dx:60,cleared:true},null,()=>hp.keyboard.press('Space')],
    ['stopped and questioned, he draws (H)',{talk:'questioned',uniform:true,holstered:true,dir:0,dx:20},'question',()=>hp.keyboard.press('h')],
    ['the guard is already shooting, he turns his gun on him',{dir:4,dx:70,st:'alert'},null,turnOn]];
  for(const [what,o,wait,act] of HUP){
    await stand(o);
    if(wait==='challenge')await hp.waitForFunction(()=>__g.st==='challenge',null,{timeout:3000}).catch(()=>{});
    if(wait==='question')await hp.waitForFunction(()=>G.state==='question',null,{timeout:6000}).catch(()=>{});
    else await hp.waitForTimeout(150);
    await act();
    const t=await upBy(800);
    check(t>=0,'hands up: '+what,t>=0?'within '+(t/1000).toFixed(2)+' s':'he did not ('+await hp.evaluate('__g.st')+')');
  }
  /* kept on him, they stay up; turned away, he drops them and fires */
  await stand({dir:4,dx:60});await hp.waitForFunction(()=>__g.st==='challenge',null,{timeout:3000}).catch(()=>{});
  await turnOn();await hp.waitForTimeout(600);
  const kept=[];for(let i=0;i<8;i++){kept.push(await hp.evaluate('__g.st'));await hp.waitForTimeout(500);}
  check(kept.every(s=>s==='hup'),'the gun kept on him four seconds, his hands stay up',[...new Set(kept)].join('>'));
  await hp.keyboard.down('x');await hp.keyboard.down('ArrowLeft');await hp.waitForTimeout(120);
  await hp.keyboard.up('ArrowLeft');await hp.keyboard.up('x');
  await hp.waitForFunction(()=>__g.st!=='hup',null,{timeout:5000}).catch(()=>{});
  check(await hp.evaluate('__g.st')==='alert','turned away, he drops them and goes for his gun',await hp.evaluate('__g.st'));
  await hc.close();

  for(const [ok,what,got] of results)console.log((ok?'  ok   ':'  FAIL ')+what+(got!==''?'  ('+got+')':''));
  if(errs.length){console.log('page errors:');errs.forEach(e=>console.log('  '+e));}
  const bad=results.filter(r=>!r[0]).length+errs.length;
  console.log(bad?bad+' failed':'all '+results.length+' held');
  await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
