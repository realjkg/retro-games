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
 * It also counts the sheriff himself. A hinged picture that tears loses the
 * pixels the cut took and nothing draws back: lowering the arm used to shed
 * four per cent of him, which on the screen was the forearm - the sleeve
 * stopped flat at the wrist and the glove hung under it with nothing between.
 * Turning a rigid piece about a point keeps the ink; opening a seam does not.
 *
 * And it looks for the same fault in the callers. They were drawn in three
 * bands - legs, torso, head - each offset by a few pixels to sway, and each
 * smoothed and lit as if it were a whole figure. So every cut grew a keyline
 * of its own and they were outlined into pieces: a head clear of its collar, a
 * hand adrift of its cuff. A keyline belongs on a man's edge; one that runs
 * across the inside of him is a cut.
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
const SHED=0.02;                                   // of him, lost to a torn seam
const KEYLINE=6;                                   // px of outline across his middle

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

/* How much of the sheriff is actually on the screen at a given swing. Drawn
 * over a flat ground, so anything that is not the ground is him. */
const INK=function(sv){
  swing=sv; kickAt=-1e9; nowFrame=1000;
  const c=document.getElementById('scene'), g=c.getContext('2d');
  g.save(); g.setTransform(1,0,0,1,0,0);
  g.fillStyle='#d6c39a'; g.fillRect(0,0,140,200); g.restore();
  ownGun(true);
  const d=g.getImageData(0,0,140,200).data;
  let n=0;
  for(let i=0;i<d.length;i+=4)
    if(Math.abs(d[i]-0xd6)+Math.abs(d[i+1]-0xc3)+Math.abs(d[i+2]-0x9a)>24)n++;
  return n;
};

/* The longest run of keyline that has the caller's own body above and below
 * it, over a flat ground. His outline belongs on his edge. */
const SEAM=function(tm){
  const enc=who(G); if(!enc)return 0;
  const keep=[walkAt,leaving,reactAt];
  walkAt=-1e9; leaving=null; reactAt=-1e9;
  const c=document.getElementById('scene'), g=c.getContext('2d');
  const X0=130,Y0=20,W=180,H=180;
  g.save(); g.setTransform(1,0,0,1,0,0);
  g.fillStyle='#b0a898'; g.fillRect(X0,Y0,W,H); g.restore();
  visitor(enc,'idle',tm);
  const d=g.getImageData(X0,Y0,W,H).data;
  const on=new Uint8Array(W*H), dark=new Uint8Array(W*H);
  for(let p=0;p<W*H;p++){
    const q=p*4;
    on[p]=(Math.abs(d[q]-0xb0)+Math.abs(d[q+1]-0xa8)+Math.abs(d[q+2]-0x98)>20)?1:0;
    dark[p]=(on[p]&&d[q]<60&&d[q+1]<60&&d[q+2]<60)?1:0;
  }
  let worst=0;
  for(let y=1;y<H-1;y++){
    let run=0;
    for(let x=0;x<W;x++){
      const p=y*W+x;
      if(dark[p]&&on[p-W]&&on[p+W]&&!dark[p-W]&&!dark[p+W]){
        if(++run>worst)worst=run;
      } else run=0;
    }
  }
  walkAt=keep[0]; leaving=keep[1]; reactAt=keep[2];
  return worst;
};

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
      swing:+swing.toFixed(3),
      probing:!!window.__probing        // frames this tool posed itself
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

  const met=new Set(), seams=[];
  let ink=null, turns=0;
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
        // is he drawn as one man, or outlined into the pieces he sways in?
        await page.evaluate(()=>{window.__probing=true;});
        let seam=0;
        for(const tm of [0,500,1000,1700,2400,3100])
          seam=Math.max(seam,await page.evaluate(SEAM,tm));
        seams.push([s.who,seam]);
        await page.evaluate(()=>{window.__probing=false;paint();});
        if(met.size<=3){                             // and on some of them, the gun
          await page.keyboard.press('ArrowUp');  await page.waitForTimeout(500);
          await shot(String(met.size).padStart(2,'0')+'-'+s.who+'-gun');
          // with it out, take the arm through its whole swing and weigh him
          if(!ink&&await page.evaluate(()=>G.mode==='gun')){
            ink=[];
            await page.evaluate(()=>{window.__probing=true;});
            for(const sv of [1,0.75,0.5,0.34,0.2,0])
              ink.push([sv,await page.evaluate(INK,sv)]);
            await page.evaluate(()=>{swing=1;paint();window.__probing=false;});
          }
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
  report(log,errs,ink,seams);
})().catch(e=>{console.error(e);process.exit(1);});

function report(log,errs,ink,seams){
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
  // the swing as the game moved it, not as this tool posed it
  const sw=[]; let gap=false;
  for(const f of log){ if(f.probing){gap=true;continue;}
    if(gap){sw.push(null);gap=false;} sw.push(f.swing); }
  let armJump=0;
  for(let i=1;i<sw.length;i++)
    if(sw[i]!==null&&sw[i-1]!==null)armJump=Math.max(armJump,Math.abs(sw[i]-sw[i-1]));
  const seen=new Set(sw.filter(v=>v!==null));
  const armOk=seen.size>5&&armJump<=0.35;
  if(!armOk)bad++;
  console.log(`\n${armOk?'  ok  ':'  BAD '} the arm moves: ${seen.size} distinct positions, `+
    `biggest one-frame change ${armJump.toFixed(2)}`);
  if(!ink)console.log('  --   the arm holding together was not reached this run');
  else{
    const level=ink[0][1];
    const worst=ink.reduce((w,[sv,n])=>
      Math.abs(n-level)>Math.abs(w[1]-level)?[sv,n]:w,ink[0]);
    const shed=(level-worst[1])/level;
    const inkOk=Math.abs(shed)<=SHED;
    if(!inkOk)bad++;
    console.log(`${inkOk?'  ok  ':'  BAD '} the arm holds together: `+
      `${(shed*100).toFixed(1)}% of him lost at swing ${worst[0]} `+
      `(${ink.map(([s,n])=>s+':'+n).join(' ')})`);
  }
  if(!seams||!seams.length)console.log('  --   no caller was looked at closely this run');
  else{
    const torn=seams.filter(([,n])=>n>KEYLINE);
    if(torn.length)bad++;
    const w=seams.reduce((a,b)=>b[1]>a[1]?b:a,seams[0]);
    console.log(`${torn.length?'  BAD ':'  ok  '} the callers hold together: `+
      `worst keyline across a caller's inside ${w[1]}px (${w[0]})`+
      (torn.length?`; torn: ${torn.map(([n,v])=>n+' '+v+'px').join(', ')}`:''));
  }
  for(const e of errs){bad++;console.log('  BAD  page error: '+e);}
  console.log(bad?`\n${bad} thing(s) the player would see.`:'\nNothing a player would see wrong.');
  process.exitCode=bad?1:0;
}
