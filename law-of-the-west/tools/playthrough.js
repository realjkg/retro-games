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
    walkOn:document.getElementById('line1').textContent,
    line:document.getElementById('line0').textContent,
    replies:[1,2,3,4].map(i=>document.getElementById('line'+i).textContent).filter(Boolean),
    swing:typeof swing!=='undefined'?swing:null,
    leaving:typeof leaving!=='undefined'&&!!leaving,
    said:typeof npcOf==='function'&&typeof beat==='function'&&beat()
      ?npcOf(G,beat()):null,
    sound:document.getElementById('mute').textContent,
    sndOn:SND.on, sndState:SND.state
  }));
  const tap=async sel=>{ await p.click(sel,{force:true}); await p.waitForTimeout(80); };
  const shot=async name=>p.screenshot({path:path.join(SHOTS,name+'.png')});

  /* Four passes through the day, each taking a different one of the four
   * replies, so between them every branch of every caller is walked and every
   * caller is met - a day where the sheriff is killed at the eighth man is a
   * real day, but it is not a test of the other three. */
  /* What each caller was written to say, read out of the page's own tables, so
   * the assertion is against the authored line and not against a copy of it. */
  const expected=await p.evaluate(()=>{
    const lines=n=>n?[n.npc].concat(Object.keys(n.npcIf||{}).map(k=>n.npcIf[k])):[];
    return CAST.map(e=>({
      id:e.id, name:e.name, place:e.place, armed:!!e.armed,
      opening:e.rounds&&e.rounds.opening?e.rounds.opening.npc:null,
      openings:lines(e.rounds&&e.rounds.opening)
        .concat(lines(e.rounds&&e.rounds.opening_drunk))
    }));
  });
  const met=new Set(), conclusions=[], hours=[], places=[];
  const heard={}, endings=[];
  let reachedSundown=0, left=0;

  for(let branch=0; branch<4; branch++){
    if(branch)await p.reload();
    await p.waitForFunction(()=>typeof G!=='undefined',null,{timeout:15000});
    let s=await state();

    if(!branch){
      ok(s.phase==='intro','the page did not open on the title, it opened on '+s.phase);
      note.push('title: sound button reads "'+s.sound+'" with SND.on='+s.sndOn+
        ' state='+s.sndState);
      ok(!(s.sndOn&&s.sndState==='none'&&/SOUND: ON/.test(s.sound)),
        'the button reads "'+s.sound+'" before any audio context exists');
    }
    await tap('[data-cmd="fire"]');                  // the gesture that raises the music
    await tap('[data-cmd="fire"]');                  // and the one that starts the day
    await p.waitForFunction(()=>G.phase!=='intro',null,{timeout:8000});

    const metHere=new Set();
    for(let guard=0; guard<300; guard++){
      s=await state();
      if(s.phase==='summary'){
        if(s.alive)reachedSundown++;
        /* Both ends of the day have to arrive somewhere a player can read:
         * the sundown table, the seven things it counts, and a verdict that
         * matches whether he is standing up at the end of it. */
        const over=await p.evaluate(()=>({
          score:G.over&&G.over.score, alive:G.over&&G.over.alive,
          cats:Object.keys((G.over&&G.over.categories)||{}),
          why:G.over&&G.over.why,
          panel:[0,1,2,3,4].map(i=>document.getElementById('line'+i).textContent)
            .filter(Boolean).join(' / ')}));
        ok(over.cats.length===7,'the sundown table counts '+over.cats.length+' things');
        ok(/\S/.test(over.panel),'the day ended on an empty panel');
        endings.push({alive:over.alive,score:over.score,why:over.why,
                      band:over.score>=400?'respect':'disgrace',panel:over.panel});
        await shot('99-sundown-'+branch+'-'+(over.alive?'alive':'killed'));
        break;
      }

      if(s.phase==='dialogue'){
        const e=expected[s.enc];
        if(e&&!s.interlude&&!metHere.has(e.id)){
          metHere.add(e.id);
          const first=!met.has(e.id);
          met.add(e.id);
          if(first){
            places.push(e.place);
            hours.push(await p.evaluate(()=>hue().sky1));
            await shot(String(s.enc+1).padStart(2,'0')+'-'+e.id);
          }
          if(s.round===1&&e.opening){
            ok(e.openings.indexOf(s.line)>=0,
              e.id+': opened on "'+s.line.slice(0,50)+'…" not one of his authored lines');
          }
          ok(s.replies.length===4,e.id+': '+s.replies.length+' replies, not four');
          ok(s.said===null||s.said===s.line,
            e.id+': the panel is not showing the line the engine chose');

          if(!branch){
            /* he is still there to talk to after a person-sized pause */
            const before=await state();
            await p.waitForTimeout(6000);
            const after=await state();
            ok(after.phase===before.phase&&after.enc===before.enc,
              e.id+': went from '+before.phase+' to '+after.phase+
              ' in six seconds while nobody touched the controls');
            /* and the gun comes out, aims, and goes away */
            await tap('[data-cmd="up"]');
            const drawn=await state();
            ok(drawn.mode==='gun',e.id+': up did not draw (mode='+drawn.mode+')');
            await p.waitForTimeout(400);
            const sw=await p.evaluate(()=>swing);
            ok(sw>0.9,e.id+': the arm never came up (swing='+sw+')');
            await shot(String(s.enc+1).padStart(2,'0')+'-'+e.id+'-drawn');
            await tap('[data-cmd="holster"]');
            ok((await state()).mode==='talk',e.id+': HOL did not put it away');
          }
        }
        if(!s.interlude&&expected[s.enc]){
          const k=expected[s.enc].id+'/'+s.node;
          (heard[k]=heard[k]||new Set()).add(s.line);
        }
        for(let k=0;k<branch;k++)await tap('[data-cmd="down"]');
        await tap('[data-cmd="fire"]');
      }
      else if(s.phase==='aiming'){ await tap('[data-cmd="holster"]'); }
      else if(s.phase==='tell'||s.phase==='duel'){
        /* One of the four plays it badly on purpose. Answering a drawn gun is
         * one press now and the windows are set to what a person can manage,
         * so a pass that always answers promptly never dies - and then neither
         * reckoning screen but one is ever seen. A player who hesitates past
         * every window there is gets shot, which is the other half of the day
         * and has to be looked at too. */
        if(branch===3)await p.waitForTimeout(1700);
        const e=expected[s.enc];
        if(e&&!s.interlude&&!met.has(e.id)){
          met.add(e.id); places.push(e.place);
          hours.push(await p.evaluate(()=>hue().sky1));
          await shot(String(s.enc+1).padStart(2,'0')+'-'+e.id+'-duel');
        }
        await tap('[data-cmd="fire"]');
      }
      else if(s.phase==='interlude'){
        if(branch===0)await shot('job-'+s.interlude);
        await tap('[data-cmd="fire"]');
      }
      else if(s.phase==='resolve'){
        if(!s.interlude&&expected[s.enc])
          conclusions.push({who:expected[s.enc].id,outcome:s.outcome,
                            line:s.line.slice(0,46),walkOn:s.walkOn});
        await tap('[data-cmd="fire"]');
        /* Nobody should vanish. Anyone still on his feet walks off the street
         * before the next man has it; only a man who has been shot stays. */
        if(!s.leaving){
          const after=await state();
          const dead=s.outcome==='killed_him'||s.outcome==='innocent_killed';
          if(!dead&&after.phase==='resolve'&&!after.leaving)
            ok(false,(expected[s.enc]?expected[s.enc].id:s.interlude)+
              ': ended on '+s.outcome+' and was simply gone');
          if(!dead&&after.leaving)left++;
        }
      }
      else if(s.phase==='approach'){ await tap('[data-cmd="fire"]'); }
      else { note.push('unexpected phase '+s.phase); break; }
    }
    note.push('pass '+branch+': met '+metHere.size+', '+
      ((await state()).alive?'alive':'killed')+' at '+(await state()).phase);
  }

  note.push('how the days ended:');
  for(const e of endings)
    note.push('  '+(e.alive?'alive  ':'killed ')+String(e.score).padStart(5)+
      '  '+e.band.padEnd(9)+e.panel.slice(0,64));
  ok(endings.some(e=>e.alive),'not one of the four days ended with him standing');
  ok(endings.some(e=>!e.alive),'the sheriff could not be killed in four days');
  const missing=expected.map(e=>e.id).filter(id=>!met.has(id));
  ok(missing.length===0,'never met: '+missing.join(', '));
  ok(reachedSundown>0,'not one of the four passes reached sundown alive');
  const twoWays=Object.keys(heard).filter(k=>heard[k].size>1);
  note.push('beats that read two different ways on screen: '+twoWays.length+
    ' ('+twoWays.slice(0,6).join(' ')+')');
  ok(twoWays.length>=3,
    'not one beat read differently for a different reply, across four passes');
  note.push('walked off rather than vanished: '+left+' times');
  ok(left>=8,'only '+left+' callers walked off the street');
  note.push('places in order: '+places.join(' '));
  note.push('sky at each caller: '+hours.join(' '));
  const dull=hours.filter((h,i)=>i&&h===hours[i-1]);
  ok(dull.length===0,'two encounters in a row under an identical sky');
  ok(new Set(hours).size===hours.length,
    'only '+new Set(hours).size+' distinct skies across '+hours.length+' callers');

  /* Eleven journeys must not finish on the same sentence. */
  note.push('conclusions ('+conclusions.length+'):');
  const byWho={};
  for(const c of conclusions)if(!byWho[c.who])byWho[c.who]=c;
  for(const k of Object.keys(byWho))
    note.push('  '+k.padEnd(9)+(byWho[k].outcome+'').padEnd(16)+'| '+byWho[k].walkOn);
  const buttons=conclusions.map(c=>c.walkOn.replace(/^1\.\s*/,''));
  ok(new Set(buttons).size>=5,
    'the day ends on only '+new Set(buttons).size+' different conclusions: '+
    [...new Set(buttons)].join(' / '));

  /* ---- locking the phone must not cost you the scene ---- */
  await p.reload();
  await p.waitForFunction(()=>typeof G!=='undefined',null,{timeout:15000});
  await tap('[data-cmd="fire"]'); await tap('[data-cmd="fire"]');
  await p.waitForFunction(()=>G.phase==='dialogue',null,{timeout:8000});
  const pre=await state();
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});
    document.dispatchEvent(new Event('visibilitychange'));});
  await p.waitForTimeout(9000);
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
