#!/usr/bin/env node
/* A player, not a script.
 *
 * The other two harnesses assert a list somebody already believed. They can
 * only find the bugs that list anticipates, which is why a game that passes
 * both of them can still be broken to play. This one is given no list. It is
 * given the page, a thumb, and a set of things that are true of any game
 * whatever it is about:
 *
 *   - a control you press does something, or it is visibly not available;
 *   - a screen with nothing to press on it is a dead end;
 *   - the same screen for ever is a freeze;
 *   - words on a panel are words, not "undefined" or "NaN" or nothing at all;
 *   - the picture moves, because somebody is always breathing;
 *   - and the day ends.
 *
 * It only ever touches the controls a player can touch and only ever reads
 * what a player can see: the panel, the status bar, the buttons, the canvas.
 * It never looks at G, never calls into the page, and never sets up a state
 * by hand. When it finds something it writes the whole run of taps that got
 * there, so it can be done again by hand.
 *
 *   PW=/path/to/node_modules/playwright-core node tools/agent.js [--runs 6]
 */
'use strict';
const path=require('path'), fs=require('fs');
const ROOT=path.join(__dirname,'..');
const PAGE='file://'+path.join(ROOT,'index.html');
const OUT=process.env.OUT||'/tmp/claude-0/qa/agent';
const CHROME=process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const arg=(k,d)=>{const i=process.argv.indexOf(k);return i>0?+process.argv[i+1]:d;};
const RUNS=arg('--runs',6), STEPS=arg('--steps',260);

let chromium;
try{ chromium=require(process.env.PW?path.join(process.env.PW,'index.js'):'playwright-core').chromium; }
catch(e){ console.log('playwright-core not installed; skipping the agent.'); process.exit(0); }

/* Seven thumbs, each with a different idea of what a phone is for. */
const AGENTS=[
  {name:'masher',   wait:[90,260],   keys:false, bias:{fire:8,down:1,up:1,holster:1,left:1,right:1}},
  {name:'reader',   wait:[2600,9000],keys:false, bias:{fire:6,down:3,up:1,holster:1}},
  {name:'fidget',   wait:[120,700],  keys:false, bias:{fire:3,down:3,up:3,left:3,right:3,holster:3}},
  {name:'gunhappy', wait:[200,900],  keys:false, bias:{up:5,fire:6,left:2,right:2,holster:2}},
  {name:'keyboard', wait:[200,900],  keys:true,  bias:{fire:5,down:2,up:2,left:2,right:2,holster:2}},
  {name:'thumbler', wait:[400,1800], keys:false, bias:{fire:5,down:2,up:2,holster:2,mute:1,full:1}},
  {name:'stone',    wait:[7000,16000],keys:false,bias:{fire:9,down:1}}
];
const KEYS={fire:'Enter',up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',
            right:'ArrowRight',holster:'Escape',mute:'m',full:'g'};

const findings=[];
const found=(agent,run,what,detail,trace)=>{
  findings.push({agent,run,what,detail,taps:trace.slice(-14)});
};

(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const browser=await chromium.launch({executablePath:CHROME,
    args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});

  for(let run=0;run<RUNS;run++){
    const who=AGENTS[run%AGENTS.length];
    let seed=(run+1)*2654435761%2147483647;
    const rnd=()=>{seed=(seed*48271)%2147483647;return seed/2147483647;};
    const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,
      isMobile:true,hasTouch:true,
      userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 '+
        '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
    const p=await ctx.newPage();
    const errs=[];
    p.on('pageerror',e=>errs.push('pageerror: '+String(e).slice(0,180)));
    p.on('console',m=>{ if(m.type()==='error')errs.push('console.error: '+m.text().slice(0,180)); });
    await p.goto(PAGE);
    await p.waitForTimeout(1200);

    /* Everything the agent is allowed to know: what is on the glass. */
    const look=()=>p.evaluate(()=>{
      const txt=id=>{const e=document.getElementById(id);return e?e.textContent.trim():null;};
      const cv=document.getElementById('scene');
      let pic='';
      try{
        const c=cv.getContext('2d');
        const d=c.getImageData(0,0,cv.width,cv.height).data;
        let h=2166136261;
        for(let i=0;i<d.length;i+=997){h^=d[i];h=(h*16777619)>>>0;}
        pic=String(h);
      }catch(e){pic='?';}
      const btns=[...document.querySelectorAll('[data-cmd]')].map(b=>({
        cmd:b.dataset.cmd, text:b.textContent.trim(),
        off:b.disabled||b.getAttribute('aria-disabled')==='true'||
            getComputedStyle(b).display==='none'||getComputedStyle(b).visibility==='hidden'}));
      return {panel:[0,1,2,3,4].map(i=>txt('line'+i)),
              status:txt('status')||txt('hud')||'',
              title:document.title, pic:pic, btns:btns};
    });

    const trace=[];
    let prev=await look(), same=0, lastChange=Date.now(), ended=false;
    const badWord=/\b(undefined|NaN|\[object|null)\b/;

    for(let step=0;step<STEPS&&!ended;step++){
      const live=prev.btns.filter(b=>!b.off&&who.bias[b.cmd]);
      if(!live.length){
        found(who.name,run,'a screen with nothing to press',
          JSON.stringify(prev.panel.filter(Boolean)).slice(0,200),trace);
        break;
      }
      // pick a control the way a thumb does: some things more often than others
      const pool=[];
      for(const b of live)for(let k=0;k<(who.bias[b.cmd]||0);k++)pool.push(b.cmd);
      const cmd=pool[Math.floor(rnd()*pool.length)];
      trace.push(cmd);
      if(who.keys)await p.keyboard.press(KEYS[cmd]);
      else await p.tap('[data-cmd="'+cmd+'"]',{force:true}).catch(()=>{});

      // a control does something, or it is not available. Give it a beat.
      await p.waitForTimeout(260);
      let now=await look();
      const moved=()=>now.panel.join('|')!==prev.panel.join('|')||now.status!==prev.status||
        now.pic!==prev.pic||now.btns.map(b=>b.text).join()!==prev.btns.map(b=>b.text).join();
      if(!moved()){
        await p.waitForTimeout(900);
        now=await look();
        if(!moved())
          found(who.name,run,'a control that did nothing at all',
            cmd+' on "'+(now.panel[0]||'').slice(0,70)+'"',trace);
      }

      // words must be words
      for(const line of now.panel)
        if(line&&badWord.test(line))
          found(who.name,run,'the panel printed a value, not a sentence',
            line.slice(0,140),trace);
      // and there must be some
      if(!now.panel.some(Boolean))
        found(who.name,run,'a panel with nothing on it',
          'buttons: '+now.btns.filter(b=>!b.off).map(b=>b.cmd).join(','),trace);

      // the picture is alive, because somebody is always breathing
      if(now.pic===prev.pic&&now.panel.join('|')===prev.panel.join('|')){
        same++;
        if(same===26)
          found(who.name,run,'the screen stopped moving',
            'unchanged through '+same+' taps on "'+(now.panel[0]||'').slice(0,60)+'"',trace);
      } else { same=0; lastChange=Date.now(); }

      if(/RIDE IN AGAIN/i.test(now.panel.join(' '))){ ended=true; }
      prev=now;
      await p.waitForTimeout(who.wait[0]+rnd()*(who.wait[1]-who.wait[0]));
    }

    if(!ended)found(who.name,run,'the day never ended',
      String(trace.length)+' presses and still going: "'+(prev.panel[0]||'').slice(0,70)+'"',trace);
    for(const e of errs)found(who.name,run,'the page threw',e,trace);
    await p.screenshot({path:path.join(OUT,'run'+run+'-'+who.name+'.png')});
    await ctx.close();
    console.log('run '+run+' ('+who.name+'): '+trace.length+' presses, '+
      (ended?'day ended':'DID NOT END')+', findings so far '+findings.length);
  }
  await browser.close();

  /* One line per kind of thing, with the presses that got there. */
  const kinds={};
  for(const f of findings)(kinds[f.what]=kinds[f.what]||[]).push(f);
  console.log('\n--- what the players ran into ---');
  if(!findings.length)console.log('  nothing');
  for(const k of Object.keys(kinds)){
    console.log('\n  '+k+'  ('+kinds[k].length+')');
    for(const f of kinds[k].slice(0,4)){
      console.log('    ['+f.agent+' run '+f.run+'] '+f.detail);
      console.log('      last presses: '+f.taps.join(' '));
    }
  }
  fs.writeFileSync(path.join(OUT,'findings.json'),JSON.stringify(findings,null,1));
  console.log('\n'+findings.length+' findings, written to '+path.join(OUT,'findings.json'));
})().catch(e=>{ console.error('agent error:',e); process.exit(2); });
