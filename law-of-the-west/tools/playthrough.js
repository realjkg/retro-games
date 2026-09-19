#!/usr/bin/env node
/* A real browser, playing the real page, on a phone-shaped screen.
 *
 * jsdom cannot tell you that a timer shot the player while they were reading,
 * because jsdom has no clock of its own and no screen. This drives the shipped
 * index.html in Chromium at iPhone size, walks every caller's journey, and
 * asserts the things a person would notice: that the caller's authored opening
 * line is on screen before anything can happen to it, that nothing resolves an
 * encounter without an input, that the gun comes out and goes away again, and
 * that locking the phone does not cost you the scene.
 *
 * It is not part of `npm test`: it needs a browser. Install playwright-core
 * anywhere and point PW at it, then:
 *   PW=/path/to/node_modules/playwright-core node tools/playthrough.js
 * It exits non-zero on the first thing a player would call a bug.           */
'use strict';
const path=require('path'), fs=require('fs');
const ROOT=path.join(__dirname,'..');
const PAGE='file://'+path.join(ROOT,'index.html');
const SHOTS=process.env.SHOTS||'/tmp/claude-0/qa/shots';
const CHROME=process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

let chromium;
try{ chromium=require(process.env.PW?path.join(process.env.PW,'index.js'):'playwright-core').chromium; }
catch(e){
  console.log('playwright-core not installed; skipping the browser playthrough.');
  console.log('  npm i playwright-core && PW=$PWD/node_modules/playwright-core node tools/playthrough.js');
  process.exit(0);
}

const fail=[], note=[];
const ok=(cond,msg)=>{ if(!cond)fail.push(msg); return cond; };

(async()=>{
  fs.mkdirSync(SHOTS,{recursive:true});
  const browser=await chromium.launch({executablePath:CHROME,
    args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,
    isMobile:true,hasTouch:true,
    userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 '+
      '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
  const p=await ctx.newPage();
  const errs=[];
  p.on('pageerror',e=>errs.push('pageerror: '+e));
  p.on('console',m=>{ if(m.type()==='error')errs.push('console.error: '+m.text()); });
  await p.goto(PAGE);
  await p.waitForFunction(()=>typeof G!=='undefined'&&typeof CAST!=='undefined',null,{timeout:15000});

  const state=()=>p.evaluate(()=>({
    phase:G.phase, mode:G.mode, enc:G.encounter, node:G.node, round:G.round,
    interlude:G.interlude, outcome:G.outcome, wounds:G.wounds, alive:G.alive,
    who:(typeof who==='function'&&who(G))?(who(G).id||G.interlude):null,
    line:document.getElementById('line0').textContent,
    replies:[1,2,3,4].map(i=>document.getElementById('line'+i).textContent).filter(Boolean),
    swing:typeof swing!=='undefined'?swing:null,
    sound:document.getElementById('mute').textContent,
    sndOn:SND.on, sndState:SND.state
  }));
  const tap=async sel=>{ await p.click(sel,{force:true}); await p.waitForTimeout(80); };
  const shot=async name=>p.screenshot({path:path.join(SHOTS,name+'.png')});

  /* ---- the title, and the first gesture ---- */
  let s=await state();
  ok(s.phase==='intro','the page did not open on the title, it opened on '+s.phase);
  note.push('title: sound button reads "'+s.sound+'" with SND.on='+s.sndOn+' state='+s.sndState);
  ok(!(s.sndOn&&s.sndState==='none'&&/SOUND: ON/.test(s.sound)),
    'the button reads "'+s.sound+'" before any audio context exists, so it claims sound that cannot play');

  await tap('[data-cmd="fire"]');                    // first gesture: raises the music
  await tap('[data-cmd="fire"]');                    // and this one starts the day
  await p.waitForFunction(()=>G.phase!=='intro',null,{timeout:8000});

  /* ---- every caller, in order ---- */
  const expected=await p.evaluate(()=>CAST.map(e=>({
    id:e.id, name:e.name, place:e.place, armed:!!e.armed,
    opening:e.rounds&&e.rounds.opening?e.rounds.opening.npc:null,
    drunk:e.rounds&&e.rounds.opening_drunk?e.rounds.opening_drunk.npc:null
  })));
  const seen=[], places=[], hours=[];
  /* Met means his scene began, not that he spoke: the last gunfighter never
   * says a word and goes straight to a tell. */
  const meet=async(s)=>{
    const e=expected[s.enc];
    if(!e||s.interlude||seen.indexOf(e.id)>=0)return false;
    seen.push(e.id); places.push(e.place);
    hours.push(await p.evaluate(()=>hue().sky1));
    return true;
  };

  for(let guard=0; guard<200; guard++){
    s=await state();
    if(s.phase==='summary')break;

    if(s.phase==='dialogue'){
      const e=expected[s.enc];
      if(await meet(s)){
        await shot(String(seen.length).padStart(2,'0')+'-'+e.id);
        /* the line on screen must be the line that was written for him */
        if(s.round===1&&e.opening){
          const want=[e.opening,e.drunk].filter(Boolean);
          ok(want.indexOf(s.line)>=0,
            e.id+': the panel opened on "'+s.line.slice(0,60)+'…" not his authored opening line');
        }
        ok(s.replies.length===4,e.id+': '+s.replies.length+' replies on screen, not four');

        /* he must still be there to talk to after a person-sized pause */
        const before=await state();
        await p.waitForTimeout(6000);
        const after=await state();
        ok(after.phase===before.phase&&after.enc===before.enc,
          e.id+': the encounter went from '+before.phase+' to '+after.phase+
          ' in six seconds while nobody touched the controls');

        /* the gun: out, sights on screen, and away again */
        await tap('[data-cmd="up"]');
        const drawn=await state();
        ok(drawn.mode==='gun',e.id+': pressing up did not draw the gun (mode='+drawn.mode+')');
        await p.waitForTimeout(400);
        const aimed=await p.evaluate(()=>({swing:swing,aim:G.aim,
          lit:(function(){const c=document.getElementById('scene');return !!c;})()}));
        ok(aimed.swing>0.9,e.id+': the arm never came up (swing='+aimed.swing+')');
        await shot(String(seen.length).padStart(2,'0')+'-'+e.id+'-drawn');
        await tap('[data-cmd="holster"]');
        const put=await state();
        ok(put.mode==='talk',e.id+': HOL did not put the gun away (mode='+put.mode+')');
      }
      await tap('[data-cmd="fire"]');                 // speak the highlighted reply
    }
    else if(s.phase==='aiming'){ await tap('[data-cmd="holster"]'); }
    else if(s.phase==='tell'||s.phase==='duel'){
      if(!s.interlude&&await meet(s))
        await shot(String(seen.length).padStart(2,'0')+'-'+expected[s.enc].id+'-duel');
      const t0=Date.now();
      await tap('[data-cmd="fire"]');
      note.push('duel with '+s.who+': answered in '+(Date.now()-t0)+' ms');
    }
    else if(s.phase==='interlude'){
      await shot('job-'+s.interlude);
      await tap('[data-cmd="fire"]');
    }
    else if(s.phase==='resolve'||s.phase==='approach'){ await tap('[data-cmd="fire"]'); }
    else { note.push('unexpected phase '+s.phase); break; }
  }

  s=await state();
  await shot('99-sundown');
  ok(s.phase==='summary','the day never reached sundown; it stopped in '+s.phase);
  ok(seen.length===expected.length,
    'met '+seen.length+' of '+expected.length+' callers: '+seen.join(', '));
  note.push('places in order: '+places.join(' '));
  note.push('sky at each caller: '+hours.join(' '));
  /* Five callers share STREET and two of them are consecutive, and that cannot
   * be fixed by moving them: most of the cast say where they are in their own
   * written lines. What can be fixed is the street being the same photograph
   * every time, so what is asserted is that the day visibly moves. */
  const dull=hours.filter((h,i)=>i&&h===hours[i-1]);
  ok(dull.length===0,'two encounters in a row under an identical sky: '+dull.join(', '));
  ok(new Set(hours).size===hours.length,
    'only '+new Set(hours).size+' distinct skies across '+hours.length+' callers');

  /* ---- locking the phone must not cost you the scene ---- */
  await p.reload();
  await p.waitForFunction(()=>typeof G!=='undefined',null,{timeout:15000});
  await tap('[data-cmd="fire"]'); await tap('[data-cmd="fire"]');
  await p.waitForFunction(()=>G.phase==='dialogue',null,{timeout:8000});
  const pre=await state();
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});
    document.dispatchEvent(new Event('visibilitychange'));});
  await p.waitForTimeout(9000);                       // nine seconds in another app
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true});
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));});
  await p.waitForTimeout(500);
  const post=await state();
  ok(post.phase===pre.phase&&post.wounds===pre.wounds,
    'coming back from another app cost the scene: '+pre.phase+'/w'+pre.wounds+
    ' became '+post.phase+'/w'+post.wounds);
  note.push('after backgrounding: sound button "'+post.sound+'" state='+post.sndState);

  ok(errs.length===0,'the page logged errors: '+errs.slice(0,3).join(' | '));

  await browser.close();
  console.log('\n--- notes ---');
  for(const n of note)console.log('  '+n);
  console.log('\n--- '+(fail.length?fail.length+' FAILURES':'all clear')+' ---');
  for(const f of fail)console.log('  FAIL  '+f);
  console.log('\nscreenshots in '+SHOTS);
  process.exit(fail.length?1:0);
})().catch(e=>{ console.error('harness error:',e); process.exit(2); });
