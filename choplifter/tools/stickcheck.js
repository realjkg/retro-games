#!/usr/bin/env node
/* Does the stick actually fly her, with a thumb rather than a keyboard?
 *
 * The game this is after wanted a joystick and two buttons, and a d-pad of four
 * on/off buttons is not one: how far you push a stick is how hard she goes, and
 * that is the difference between placing her on a patch of sand between two men
 * and arriving at it. So the pad is a stick, and this drives it the way a thumb
 * does - press, drag, drag somewhere else, let go - in a mobile context with
 * touch, and reads what the page did about it.
 *
 * The four things it will not take on trust:
 *
 *   1. Pushed to the rim she goes at the top speed, and pushed half way she
 *      goes at about half of it. Analogue, not four switches.
 *   2. Both axes at once. A helicopter that cannot climb while it moves is a
 *      lift, and the original's stick did both.
 *   3. Let go, it recentres and she stops being flown.
 *   4. A thumb that slides off the pad in the middle of a dive keeps flying her,
 *      and a thumb that lets go out there lets go. Without pointer capture the
 *      first is a dead stick and the second is a stuck one - and a stuck stick
 *      in a game with a ground is a crash you did not ask for.
 *
 * It also presses TURN and checks the facing walks the ring rather than the
 * stick doing it, because that is the fidelity fix this game exists to carry.
 *
 *   PW=$PWD/../law-of-the-west/node_modules/playwright-core node tools/stickcheck.js
 */
'use strict';
const fs=require('fs'), path=require('path');
const PAGE=path.join(__dirname,'..','index.html');
let chromium;
try{({chromium}=require(process.env.PW||'playwright-core'));}
catch(e){console.log('playwright-core not installed; skipping.');process.exit(0);}
function browserPath(){
  if(process.env.CHROME)return process.env.CHROME;
  const roots=[process.env.PLAYWRIGHT_BROWSERS_PATH,'/opt/pw-browsers',
    path.join(process.env.HOME||'','.cache/ms-playwright')].filter(Boolean);
  for(const r of roots){
    let dirs=[];try{dirs=fs.readdirSync(r);}catch(e){continue;}
    for(const d of dirs.filter(d=>d.startsWith('chromium')))
      for(const exe of ['chrome-linux/chrome','chrome-mac/Chromium.app/Contents/MacOS/Chromium',
                        'chrome-win/chrome.exe','chrome-linux/headless_shell'])
        if(fs.existsSync(path.join(r,d,exe)))return path.join(r,d,exe);
  }
  for(const p of ['/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome'])
    if(fs.existsSync(p))return p;
  return null;
}

const fails=[], rows=[];
const ok=(c,m)=>{if(!c)fails.push(m);};

(async()=>{
  const exe=browserPath();
  if(!exe){console.error('no chromium found; set CHROME=/path/to/chrome');process.exit(2);}
  const b=await chromium.launch({executablePath:exe});
  // A phone, with touch, because that is who the stick is for.
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,
    isMobile:true,hasTouch:true});
  const pg=await ctx.newPage();
  const errs=[];
  pg.on('pageerror',e=>errs.push(String(e)));
  await pg.goto('file://'+PAGE,{waitUntil:'load'});
  await pg.waitForTimeout(500);
  await pg.evaluate(()=>{newGame(2,777);G.h.y=70;G.h.landed=false;});
  const el=await pg.$('#stick');
  if(!el){console.error('this page has no stick to check');process.exit(2);}
  const box=await el.boundingBox();
  const cx=box.x+box.width/2, cy=box.y+box.height/2, R=box.width/2-14;
  const read=()=>pg.evaluate(()=>({
    vx:+G.h.vx.toFixed(1),vy:+G.h.vy.toFixed(1),
    sx:+stick.x.toFixed(2),sy:+stick.y.toFixed(2),held:!!stick.held,
    knob:(document.getElementById('knob')||{style:{}}).style.transform||'',
    tf:+G.h.tf.toFixed(2),want:G.h.want}));
  const top=await pg.evaluate(()=>MAXV);
  const row=(n,r)=>rows.push(n.padEnd(24)+'vx '+String(r.vx).padStart(6)+
    '  vy '+String(r.vy).padStart(6)+'  stick '+r.sx+','+r.sy+
    (r.held?' held':' free')+'  knob '+(r.knob||'centred'));

  // 1. pushed to the rim
  await pg.mouse.move(cx,cy);await pg.mouse.down();
  await pg.mouse.move(cx-R,cy,{steps:6});
  await pg.waitForTimeout(900);
  const full=await read();row('pushed to the rim',full);
  ok(full.vx<-top*0.9,'the rim is not the top speed ('+full.vx+' of '+(-top)+')');
  ok(full.held,'a thumb on the pad is not registered as holding it');

  // 2. half a push, and both axes at once
  await pg.mouse.move(cx+R*0.5,cy-R*0.6,{steps:6});
  await pg.waitForTimeout(900);
  const half=await read();row('half over, and climbing',half);
  ok(half.vx>top*0.3&&half.vx<top*0.72,'half a push is not about half a speed ('+half.vx+')');
  ok(half.vy<-8,'she will not climb while she flies ('+half.vy+')');

  // 3. let go
  await pg.mouse.up();
  await pg.waitForTimeout(300);
  const let_go=await read();row('let go',let_go);
  ok(!let_go.held&&let_go.sx===0&&let_go.sy===0,'the stick does not recentre when let go');
  ok(/translate\(0px, ?0px\)|^$/.test(let_go.knob),'the knob does not go back to the middle');

  // 4. a thumb that slides off the pad
  await pg.mouse.move(cx,cy);await pg.mouse.down();
  await pg.mouse.move(cx-R,cy,{steps:4});
  await pg.mouse.move(cx-500,cy-400,{steps:4});
  await pg.waitForTimeout(250);
  const off=await read();row('dragged off the pad',off);
  ok(off.held,'a thumb that slides off the pad is a dead stick');
  ok(Math.hypot(off.sx,off.sy)<=1.02,'the stick is not clamped to its own rim');
  await pg.mouse.up();
  await pg.waitForTimeout(250);
  const done=await read();row('released off the pad',done);
  ok(!done.held&&done.sx===0&&done.sy===0,'a thumb let go off the pad leaves the stick stuck');

  // and the button, which is the other half of the arrangement
  const before=await pg.evaluate(()=>G.h.want);
  await pg.tap('#turnbtn');
  await pg.waitForTimeout(500);
  const turned=await read();
  rows.push('TURN'.padEnd(24)+'want '+before+' -> '+turned.want+', drawn round to '+turned.tf);
  ok(turned.want!==before,'the button does not turn her');
  ok(Math.abs(turned.tf-turned.want)<.05,'she did not finish walking round to it');
  // ...and it must not fly her, which is the whole of the fidelity fix.
  const drift=await pg.evaluate(()=>{
    G.h.vx=0;G.h.x=1000;stick.x=0;stick.y=0;stick.held=false;
    return new Promise(r=>{let n=0;const go=()=>requestAnimationFrame(()=>{
      if(++n<40)go();else r(+G.h.vx.toFixed(2));});go();});
  });
  rows.push('TURN, stick centred'.padEnd(24)+'vx '+drift);

  // The seeker button, which is the third thing on the pad and the only one
  // with a count on it: it has to fire one, say how many are left, and go out
  // when there are none.
  const seek0=await pg.evaluate(()=>{G.h.landed=false;G.h.y=60;G.h.seekCool=0;return G.h.seek;});
  await pg.tap('#seekbtn');
  await pg.waitForTimeout(260);
  const s1=await pg.evaluate(()=>({left:G.h.seek,up:G.seekers.length,
    label:(document.getElementById('seekbtn')||{}).textContent||''}));
  rows.push('SEEK'.padEnd(24)+seek0+' -> '+s1.left+', '+s1.up+' in the air, button says "'+s1.label+'"');
  ok(s1.left===seek0-1&&s1.up>0,'the seeker button does not fire one');
  ok(s1.label.indexOf(String(s1.left))>=0,'the button does not say how many are left');
  const spent=await pg.evaluate(async()=>{
    G.h.seek=0;
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const b=document.getElementById('seekbtn');
    return {dim:!!(b&&b.classList.contains('spent')),text:b?b.textContent:''};
  });
  rows.push('SEEK, empty rails'.padEnd(24)+'dimmed '+spent.dim+', says "'+spent.text+'"');
  ok(spent.dim,'an empty rail looks the same as a full one');

  // The same button, standing on the pad, is the loadout. One button with two
  // jobs has to say which one it is doing, or it is a trap.
  const pad=await pg.evaluate(async()=>{
    G.h=chopper();G.h.x=POST_X;G.h.y=GROUND_Y-CHOP_H;G.h.landed=true;G.h.vx=0;
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    return {label:(document.getElementById('seekbtn')||{}).textContent||'',
            was:(typeof loadout==='function')?loadout().id:''};
  });
  await pg.tap('#seekbtn');
  await pg.waitForTimeout(220);
  const swapped=await pg.evaluate(()=>({now:loadout().id,seek:G.h.seek,
    up:G.seekers.length,label:(document.getElementById('seekbtn')||{}).textContent||''}));
  rows.push('LOAD, on the pad'.padEnd(24)+pad.was+' -> '+swapped.now+
    ', button says "'+swapped.label+'"');
  ok(/STD/.test(pad.label),'the button does not say what she is loaded with on the pad');
  ok(swapped.now!==pad.was,'tapping it on the pad does not change what she carries');
  ok(swapped.label.indexOf('LIGHT')>=0,'the button does not say what she was just loaded with');
  ok(swapped.up===0,'it fired a seeker off the pad instead of loading her');
  ok(Math.abs(drift)<2,'turning her flies her: the button is acting as a throttle ('+drift+')');

  console.log('--- the stick, driven with a thumb ---');
  for(const r of rows)console.log('  '+r);
  if(errs.length){console.log('\npage errors:');for(const e of errs.slice(0,6))console.log('  '+e);}
  console.log('\n--- '+(fails.length?fails.length+' FAILURES':'all clear')+' ---');
  for(const f of fails)console.log('  FAIL  '+f);
  console.log('\nNOTE: this is Chromium with touch emulation, not a phone. What is proved is');
  console.log('that the page reads a drag and flies her by it; how it feels under a real');
  console.log('thumb is not something this can tell you.');
  await b.close();
  process.exit(fails.length||errs.length?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
