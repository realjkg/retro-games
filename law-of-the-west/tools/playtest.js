#!/usr/bin/env node
/* Play the game the way a player plays it, and report on the motion.
 *
 * The test suite checks what the page computes. It cannot see what the page
 * shows, and the difference between those two is where the entrance bug lived:
 * walkNow() returned exactly the right offsets, test 9v passed on them, and on
 * the screen every caller still appeared at his post, stood there, and jumped
 * eighty-six pixels back up the street to begin the walk the test had just
 * approved. Nothing that reads state can catch that. This opens the committed
 * page in a real browser, presses the keys a player presses, records every
 * frame the page paints, and reports on how the figures moved between them.
 *
 * A one-frame jump is the thing to look for. A stride is three or four pixels;
 * anything above ten is a man teleporting.
 *
 * Its sibling tools/playthrough.js drives the same page and asks what it says -
 * that the line is on screen, that nothing resolves without an input. This one
 * asks how it moved. Both are run by hand and neither is part of `npm test`:
 * CI has no browser, and the game must stay playable from file:// with nothing
 * installed.
 *
 *   PW=$PWD/node_modules/playwright-core node tools/playtest.js
 *   node tools/playtest.js --keep      # and write the screenshots to .playtest
 */
'use strict';
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
const PAGE='file://'+path.join(ROOT,'index.html');
const OUT=path.join(ROOT,'.playtest');
const KEEP=process.argv.includes('--keep');
const JUMP=10;                                     // px in one frame: a teleport

let chromium;
try{({chromium}=require(process.env.PW||'playwright-core'));}
catch(e){
  console.error('playtest needs playwright-core: npm i playwright-core, then'+
    ' PW=/path/to/node_modules/playwright-core node tools/playtest.js');
  process.exit(2);
}
/* Whatever browser is already on the machine. Playwright's own download is a
 * hundred megabytes and this is a script somebody runs once. */
function browserPath(){
  if(process.env.CHROME)return process.env.CHROME;
  const roots=[process.env.PLAYWRIGHT_BROWSERS_PATH,'/opt/pw-browsers',
    path.join(process.env.HOME||'','.cache/ms-playwright')].filter(Boolean);
  for(const r of roots){
    let dirs=[]; try{dirs=fs.readdirSync(r);}catch(e){continue;}
    for(const d of dirs.filter(d=>d.startsWith('chromium'))){
      for(const exe of ['chrome-linux/chrome','chrome-mac/Chromium.app/Contents/MacOS/Chromium',
                        'chrome-win/chrome.exe','chrome-linux/headless_shell']){
        const p=path.join(r,d,exe);
        if(fs.existsSync(p))return p;
      }
    }
  }
  for(const p of ['/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'])
    if(fs.existsSync(p))return p;
  return null;
}

/* Runs inside the page: one row per painted frame. `drawn` is the question the
 * suite cannot ask - whether the figure was on the screen at all. */
const RECORD=function(){
  window.__log=[];
  const t0=performance.now();
  (function rec(){
    const now=performance.now();
    const w=walkNow(now), l=leaveNow(now);
    window.__log.push({
      t:Math.round(now-t0),
      phase:G.phase, mode:G.mode,
      who:(who(G)&&who(G).id)||null,
      drawn:G.phase!=="intro"&&G.phase!=="summary"&&!(w&&w.before),
      dx:(w&&!w.before?w.dx:0)+(l?l.dx:0),
      swing:+swing.toFixed(3)
    });
    requestAnimationFrame(rec);
  })();
};

(async()=>{
  const exe=browserPath();
  if(!exe){console.error('playtest found no chromium. Set CHROME to one.');process.exit(2);}
  if(KEEP){fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});}
  const browser=await chromium.launch({executablePath:exe,args:['--no-sandbox','--mute-audio']});
  const page=await(await browser.newContext({viewport:{width:900,height:700}})).newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(PAGE);
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter');               // the gesture that unlocks the audio
  await page.waitForTimeout(200);
  await page.evaluate(RECORD);

  const state=()=>page.evaluate(()=>({phase:G.phase,rows:build.rows,
    who:(who(G)&&who(G).id)||null,
    moving:!!leaveNow(performance.now())||(()=>{const w=walkNow(performance.now());return !!w&&!w.before;})()}));
  const shot=async n=>{if(KEEP)fs.writeFileSync(path.join(OUT,n+'.png'),
    await page.locator('#scene').screenshot());};

  const met=new Set();
  let turns=0;
  while(turns++<500){
    const s=await state();
    if(s.phase==='summary')break;
    if(s.phase==='intro'){await page.keyboard.press('Enter');await page.waitForTimeout(400);continue;}
    if(s.moving){await page.waitForTimeout(150);continue;}   // let him walk; watch him do it
    if(s.phase==='dialogue'||s.phase==='tell'){
      if(s.rows<10){await page.waitForTimeout(150);continue;}
      if(s.who&&!met.has(s.who)){
        met.add(s.who);
        await shot(String(met.size).padStart(2,'0')+'-'+s.who);
        if(met.size<=3){                             // and on some of them, the gun
          await page.keyboard.press('ArrowUp');  await page.waitForTimeout(500);
          await shot(String(met.size).padStart(2,'0')+'-'+s.who+'-gun');
          await page.keyboard.press('ArrowLeft');await page.waitForTimeout(120);
          await page.keyboard.press('Escape');   await page.waitForTimeout(500);
        }
      }
      await page.keyboard.press('1'); await page.waitForTimeout(500); continue;
    }
    await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  }
  const log=await page.evaluate(()=>window.__log);
  await browser.close();
  report(log,errs);
})().catch(e=>{console.error(e);process.exit(1);});

function report(log,errs){
  const segs=[]; let cur=null;
  for(const f of log){
    if(!cur||cur.who!==f.who){cur={who:f.who,frames:[]};segs.push(cur);}
    cur.frames.push(f);
  }
  let bad=0;
  console.log(`played ${log.length} frames over ${(log[log.length-1].t/1000).toFixed(1)}s\n`);
  for(const s of segs){
    if(!s.who)continue;
    const F=s.frames;
    const shown=F.filter(f=>f.drawn);
    if(!shown.length)continue;
    // the only jumps that count are between two frames he was actually on
    let jump=0,at=null;
    for(let i=1;i<shown.length;i++){
      if(shown[i].t-shown[i-1].t>120)continue;      // a cut is not a jump
      const d=Math.abs(shown[i].dx-shown[i-1].dx);
      if(d>jump){jump=d;at=shown[i].t;}
    }
    // was he ever painted at his post before his own walk began?
    const firstShown=shown[0], moved=shown.filter(f=>f.dx!==0);
    const held=moved.length?moved[0].t-firstShown.t:0;
    const ok=jump<=JUMP&&held<80;
    if(!ok)bad++;
    console.log(`${ok?'  ok  ':'  BAD '} ${String(s.who).padEnd(10)} `+
      `on screen ${(shown[shown.length-1].t-firstShown.t)/1000|0}s  `+
      `walk-in ${moved.length?moved[0].dx:0}px  `+
      `biggest one-frame move ${jump}px  `+
      `held at his post before moving ${held}ms`);
  }
  const sw=log.map(f=>f.swing);
  let armJump=0; for(let i=1;i<sw.length;i++)armJump=Math.max(armJump,Math.abs(sw[i]-sw[i-1]));
  const armOk=new Set(sw).size>5&&armJump<=0.35;
  if(!armOk)bad++;
  console.log(`\n${armOk?'  ok  ':'  BAD '} the arm: ${new Set(sw).size} distinct positions, `+
    `biggest one-frame change ${armJump.toFixed(2)}`);
  for(const e of errs){bad++;console.log('  BAD  page error: '+e);}
  console.log(bad?`\n${bad} thing(s) the player would see.`:'\nNothing a player would see wrong.');
  process.exitCode=bad?1:0;
}
