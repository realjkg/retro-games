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
 * Ink alone is not enough, though, and it took a second report from a player
 * to find out why: a joint drawn wide enough to cover the whole of where the
 * arm meets him swallows the forearm instead. Nothing is lost - the forearm is
 * still drawn, just never turned - so the weight comes out right while the
 * sleeve ends in a rounded stump on the joint's own edge and the arm above the
 * hand is missing. So it also turns him and checks that the whole arm turned:
 * his ink is taken in rings about the elbow, and a rigid arm moves every ring
 * by the same angle.
 *
 * And it looks for the same fault in the callers. They were drawn in three
 * bands - legs, torso, head - each offset by a few pixels to sway, and each
 * smoothed and lit as if it were a whole figure. So every cut grew a keyline
 * of its own and they were outlined into pieces: a head clear of its collar, a
 * hand adrift of its cuff. A keyline belongs on a man's edge; one that runs
 * across the inside of him is a cut.
 *
 * And it counts the air inside each of them. A sleeve that stands one pixel
 * clear of the chest puts a slot of street through him the length of the arm,
 * shut at the shoulder and shut at the hand, rimmed in black down both sides -
 * which is what made every caller read as sticks leaned against a coat. Air
 * the outside cannot reach is air that should not be there.
 *
 * Above the waist, that is. Below it there is a gap between a man's legs, and
 * it is shut at the bottom whenever his boots meet - so a flood fill calls it
 * trapped and it is nothing of the kind. Counting it cost this check its
 * meaning: the three robbers stand with their boots together and came in at
 * sixteen to eighteen pixels of perfectly good daylight, over a bar set on
 * callers whose boots happen to be apart. The arm slot is what is being looked
 * for and the arm is above the waist.
 *
 * Its sibling tools/playthrough.js drives the same page and asks what it says -
 * that the line is on screen, that nothing resolves without an input. This one
 * asks how it moved. Both are run by hand and neither is part of `npm test`:
 * CI has no browser, and the game must stay playable from file:// with nothing
 * installed.
 *
 * It reads one thing the page writes down for it - gaitPose, which beat of the
 * walk a caller was drawn on - and it reads it defensively, because the point
 * of this tool is being run against the build you are replacing as well as the
 * one you are proposing, and that build will not have it.
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
const RIGID=40;                                    // degrees of disagreement between rings
const TRAPPED=16;                                  // px of street shut inside a caller
const SCISSOR=3;                                   // px of top half sliding against bottom

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
  swing=sv; spin=0; seqKind=''; kickAt=-1e9; nowFrame=1000;
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

/* Where his ink sits round each ring about the elbow, at a given swing. */
const RINGS=function(sv){
  swing=sv; spin=0; seqKind=''; kickAt=-1e9; nowFrame=1000;
  const c=document.getElementById('scene'), g=c.getContext('2d');
  g.save(); g.setTransform(1,0,0,1,0,0);
  g.fillStyle='#d6c39a'; g.fillRect(0,0,145,200); g.restore();
  ownGun(true);
  const d=g.getImageData(0,0,145,200).data;
  const ex=ELBOW.x, ey=ELBOW.y;
  return [[14,22],[22,30],[30,38],[38,48]].map(function(band){
    let sx=0,sy=0,n=0;
    for(let y=60;y<190;y++)for(let x=ex-6;x<145;x++){
      const q=((y*145)+x)*4;
      if(Math.abs(d[q]-0xd6)+Math.abs(d[q+1]-0xc3)+Math.abs(d[q+2]-0x9a)<=24)continue;
      const dx=x-ex, dy=y-ey, r=Math.hypot(dx,dy);
      if(r<band[0]||r>=band[1])continue;
      sx+=dx/r; sy+=dy/r; n++;                     // a mean direction, not a mean angle
    }
    return n?Math.atan2(sy,sx):null;
  });
};

/* A cheap fingerprint of the caller as he is drawn at a given moment. */
const STILL=function(tm){
  const enc=who(G); if(!enc)return '-';
  const keep=[walkAt,leaving,reactAt];
  walkAt=-1e9; leaving=null; reactAt=-1e9;
  const c=document.getElementById('scene'), g=c.getContext('2d');
  g.save(); g.setTransform(1,0,0,1,0,0);
  g.fillStyle='#b0a898'; g.fillRect(130,20,180,180); g.restore();
  visitor(enc,'idle',tm);
  const d=g.getImageData(130,20,180,180).data;
  let h=0;
  for(let i=0;i<d.length;i+=16)h=(h*31+d[i]+d[i+1]*3+d[i+2]*7)|0;
  walkAt=keep[0]; leaving=keep[1]; reactAt=keep[2];
  return String(h);
};

/* How far the top of a caller and the bottom of him pull apart at one moment.
 *
 * A body shifting its weight turns about itself, so the hips and the shoulders
 * do go opposite ways - a little. Given a walk's numbers while standing still
 * they went opposite ways a lot: three pixels of hip against two of shoulder
 * and two of head, which measured five and a half pixels of top half sliding
 * against bottom half on a forty-eight pixel figure, and read on the screen as
 * two bodies moving at two separate speeds. A player said exactly that.
 *
 * Posed over a flat ground, and every band measured against HIS OWN top row,
 * so a man who rises and falls does not come back as a man who slides. */
const SCISS=function(tm){
  const enc=who(G); if(!enc)return null;
  const keep=[walkAt,leaving,reactAt];
  walkAt=-1e9; leaving=null; reactAt=-1e9;
  const g=document.getElementById('scene').getContext('2d');
  const X0=130,Y0=10,W=180,H=200;
  g.save(); g.setTransform(1,0,0,1,0,0);
  g.fillStyle='#b0a898'; g.fillRect(X0,Y0,W,H); g.restore();
  visitor(enc,'idle',tm);
  const d=g.getImageData(X0,Y0,W,H).data;
  const mid=[]; let top=-1,bot=-1;
  for(let y=0;y<H;y++){
    let lo=1e9,hi=-1e9;
    for(let x=0;x<W;x++){
      const q=((y*W)+x)*4;
      if(Math.abs(d[q]-0xb0)+Math.abs(d[q+1]-0xa8)+Math.abs(d[q+2]-0x98)<=20)continue;
      if(x<lo)lo=x; if(x>hi)hi=x;
    }
    if(hi<0){mid.push(null);continue;}
    if(top<0)top=y; bot=y; mid.push((lo+hi)/2);
  }
  walkAt=keep[0]; leaving=keep[1]; reactAt=keep[2];
  if(top<0)return null;
  const h=bot-top+1;
  const band=function(a,z){var s=0,n=0;
    for(var y=top+Math.round(a*h);y<=top+Math.round(z*h)&&y<mid.length;y++){
      if(mid[y]==null)continue; s+=mid[y]; n++; }
    return n?s/n:null; };
  return [band(0,0.16),band(0.86,1.0)];            // his head, and his hem
};

/* Air that is inside the caller: background the outside cannot reach. */
const TRAP=function(tm){
  const enc=who(G); if(!enc)return 0;
  const keep=[walkAt,leaving,reactAt];
  walkAt=-1e9; leaving=null; reactAt=-1e9;
  const c=document.getElementById('scene'), g=c.getContext('2d');
  const X0=130,Y0=20,W=180,H=180, Y0h=SPRY;
  g.save(); g.setTransform(1,0,0,1,0,0);
  g.fillStyle='#b0a898'; g.fillRect(X0,Y0,W,H); g.restore();
  visitor(enc,'idle',tm);
  const d=g.getImageData(X0,Y0,W,H).data;
  const on=new Uint8Array(W*H);
  for(let i=0,p=0;i<d.length;i+=4,p++)
    on[p]=(Math.abs(d[i]-0xb0)+Math.abs(d[i+1]-0xa8)+Math.abs(d[i+2]-0x98)>20)?1:0;
  const seen=new Uint8Array(W*H), st=new Int32Array(W*H); let tp=0;
  const push=q=>{if(!on[q]&&!seen[q]){seen[q]=1;st[tp++]=q;}};
  for(let x=0;x<W;x++){push(x);push((H-1)*W+x);}
  for(let y=0;y<H;y++){push(y*W);push(y*W+W-1);}
  while(tp){const q=st[--tp],x=q%W,y=(q-x)/W;
    if(x>0)push(q-1); if(x<W-1)push(q+1);
    if(y>0)push(q-W); if(y<H-1)push(q+W);}
  /* only above his waist: the daylight between his legs is his own */
  const waist=Y0h+Math.round(SPR.h*0.62)*FIGCH-Y0;
  let n=0;
  for(let p=0;p<W*H;p++)if(!on[p]&&!seen[p]&&(p-(p%W))/W<waist)n++;
  walkAt=keep[0]; leaving=keep[1]; reactAt=keep[2];
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
      beat:(typeof gaitPose==='string'?gaitPose:''),                    // which of the four he is drawn on
      scene:G.interlude?('job:'+G.interlude)
            :(who(G)&&who(G).id)||G.phase,
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

  /* Every scene the day has, not just the ones with a man in them: eleven
   * callers, three robberies, the interludes between them and the reckoning at
   * the end. For each one the same questions - did he walk in on his own feet,
   * did he stride or only slide, is he alive while he stands there, does the
   * scene answer what is pressed at it, and does he leave the way he came. */
  const met=new Set(), seams=[], scenes=new Map();
  const note=(id,k,v)=>{
    let r=scenes.get(id);
    if(!r){r={id:id,arrived:0,beats:new Set(),alive:-1,answered:false,left:0,
              seam:null,trap:null,sciss:null};scenes.set(id,r);}
    if(k)r[k]=v;
    return r;
  };
  let ink=null, rings=null, turns=0;
  while(turns++<500){
    const s=await state();
    if(s.phase==='summary')break;
    if(s.phase==='intro'){await page.keyboard.press('Enter');await page.waitForTimeout(400);continue;}
    if(s.moving){                                   // let him walk; watch him do it
      const m=await page.evaluate(()=>{
        const w=walkNow(performance.now()), l=leaveNow(performance.now());
        return {id:G.interlude?('job:'+G.interlude):((who(G)&&who(G).id)||G.phase),
                walk:(w&&!w.before)?w.dx:null, leave:l?Math.abs(l.dx):null,
                beat:(typeof gaitPose==='string'?gaitPose:'')};
      });
      const r=note(m.id);
      if(m.beat)r.beats.add(m.beat);
      if(m.walk!=null)r.arrived=Math.max(r.arrived,m.walk);
      if(m.leave!=null)r.left=Math.max(r.left,m.leave);
      await page.waitForTimeout(90); continue;
    }
    if(s.phase==='dialogue'||s.phase==='tell'){
      if(s.rows<10){await page.waitForTimeout(150);continue;}
      if(s.who&&!met.has(s.who)){
        met.add(s.who);
        await shot(String(met.size).padStart(2,'0')+'-'+s.who);
        // is he drawn as one man, or outlined into the pieces he sways in?
        await page.evaluate(()=>{window.__probing=true;});
        let seam=0, trap=0;
        for(const tm of [0,500,1000,1700,2400,3100]){
          seam=Math.max(seam,await page.evaluate(SEAM,tm));
          trap=Math.max(trap,await page.evaluate(TRAP,tm));
        }
        seams.push([s.who,seam,trap]);
        note(s.who,'seam',seam); note(s.who,'trap',trap);
        /* Standing there, is he alive? Two moments a second apart must not be
         * the same picture: a caller who holds one pose is a cut-out. */
        const a1=await page.evaluate(STILL,0), a2=await page.evaluate(STILL,1300);
        note(s.who,'alive',a1===a2?0:1);
        /* And is he one body? Standing still, his head and his hem must not
         * set off in opposite directions at once. */
        {
          const H=[],M=[];
          for(let i=0;i<40;i++){
            const v=await page.evaluate(SCISS,200000+i*140);
            if(v){H.push(v[0]);M.push(v[1]);}
          }
          let sc=0;
          if(H.length){
            const h0=H.reduce((a,b)=>a+b,0)/H.length, m0=M.reduce((a,b)=>a+b,0)/M.length;
            for(let i=0;i<H.length;i++){
              const dh=H[i]-h0, dm=M[i]-m0;
              if(dh*dm<0)sc=Math.max(sc,Math.abs(dh)+Math.abs(dm));
            }
          }
          note(s.who,'sciss',+sc.toFixed(2));
        }
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
            rings=[await page.evaluate(RINGS,1),await page.evaluate(RINGS,0)];
            await page.evaluate(()=>{swing=1;paint();window.__probing=false;});
          }
          await page.keyboard.press('ArrowLeft');await page.waitForTimeout(120);
          await page.keyboard.press('Escape');   await page.waitForTimeout(500);
        }
      }
      // and does the scene answer? Something pressed at it must change it.
      {
        const was=await page.evaluate(()=>G.phase+'/'+G.round+'/'+G.node);
        await page.keyboard.press('1'); await page.waitForTimeout(500);
        const now2=await page.evaluate(()=>G.phase+'/'+G.round+'/'+G.node);
        if(was!==now2)note(s.who||s.phase,'answered',true);
      }
      continue;
    }
    {
      const id=await page.evaluate(()=>G.interlude?('job:'+G.interlude)
        :((who(G)&&who(G).id)||G.phase));
      const r=note(id);
      // a robbery and a stand-off are scenes too: is the man in them alive?
      if(r.alive<0&&await page.evaluate(()=>!!who(G))){
        await page.evaluate(()=>{window.__probing=true;});
        const a1=await page.evaluate(STILL,0), a2=await page.evaluate(STILL,1300);
        r.alive=a1===a2?0:1;
        r.seam=Math.max(await page.evaluate(SEAM,0),await page.evaluate(SEAM,1300));
        r.trap=Math.max(await page.evaluate(TRAP,0),await page.evaluate(TRAP,1300));
        await page.evaluate(()=>{window.__probing=false;paint();});
      }
      const was=await page.evaluate(()=>G.phase+'/'+(G.interlude||''));
      await page.keyboard.press('Enter'); await page.waitForTimeout(500);
      const now2=await page.evaluate(()=>G.phase+'/'+(G.interlude||''));
      if(was!==now2)note(id,'answered',true);
    }
  }
  const log=await page.evaluate(()=>window.__log);
  await browser.close();
  report(log,errs,ink,seams,rings,scenes);
})().catch(e=>{console.error(e);process.exit(1);});

function report(log,errs,ink,seams,rings,scenes){
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
  /* A quick draw is 280ms, so at thirty frames a second one frame is an eighth
   * of it and the fast part of the curve fairly covers a third of the travel.
   * What this is for is a draw that is a switch rather than a movement, so the
   * bar is a third of it in one frame, not a tenth. */
  const armOk=seen.size>5&&armJump<=0.5;
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
  if(!rings)console.log('  --   the whole arm turning was not reached this run');
  else{
    const turn=rings[0].map((u,i)=>{
      if(u==null||rings[1][i]==null)return null;
      let t=rings[1][i]-u;
      while(t>Math.PI)t-=2*Math.PI; while(t<-Math.PI)t+=2*Math.PI;
      return t*180/Math.PI;
    }).filter(v=>v!=null);
    const spread=Math.max.apply(null,turn)-Math.min.apply(null,turn);
    const ok=spread<=RIGID;
    if(!ok)bad++;
    console.log(`${ok?'  ok  ':'  BAD '} the whole arm turns: rings about the elbow moved `+
      `${turn.map(v=>Math.round(v)+'\u00b0').join(' ')} - they disagree by `+
      `${Math.round(spread)}\u00b0`);
  }
  if(!seams||!seams.length)console.log('  --   no caller was looked at closely this run');
  else{
    const torn=seams.filter(([,n])=>n>KEYLINE);
    if(torn.length)bad++;
    const w=seams.reduce((a,b)=>b[1]>a[1]?b:a,seams[0]);
    console.log(`${torn.length?'  BAD ':'  ok  '} the callers hold together: `+
      `worst keyline across a caller's inside ${w[1]}px (${w[0]})`+
      (torn.length?`; torn: ${torn.map(([n,v])=>n+' '+v+'px').join(', ')}`:''));
    const slotted=seams.filter(q=>q[2]>TRAPPED);
    if(slotted.length)bad++;
    const t=seams.reduce((a,b)=>b[2]>a[2]?b:a,seams[0]);
    const mean=(seams.reduce((a,b)=>a+b[2],0)/seams.length).toFixed(1);
    console.log(`${slotted.length?'  BAD ':'  ok  '} the callers are one body: `+
      `worst ${t[2]}px of street shut inside one (${t[0]}), mean ${mean}px`+
      (slotted.length?`; slotted: ${slotted.map(q=>q[0]+' '+q[2]+'px').join(', ')}`:''));
  }
  /* And the standing rule: every scene the day has, asked the same questions.
   * A day that is right on average is not the point - a caller who never walks
   * in, or a scene that does not answer what is pressed at it, is a scene a
   * player will meet. */
  if(scenes&&scenes.size){
    console.log('\n  scene        walked in   strode        alive  answers  walked off  one body');
    let sceneBad=0;
    const all=[...scenes.values()].filter(r=>r.id!=='summary'&&r.id!=='intro');
    const last=all.length?all[all.length-1].id:null;
    for(const r of all){
      const ending=r.id===last;          // the day stops here; it owes no exit
      const beats=[...r.beats].filter(Boolean);
      const moved=r.arrived>0||r.left>0;
      const fail=[];
      if(!moved)fail.push('never moved');
      if(moved&&beats.length<2)fail.push('slid');
      if(r.alive===0)fail.push('held one pose');
      if(!r.answered&&!ending)fail.push('no answer');
      if(r.seam!=null&&r.seam>KEYLINE)fail.push('torn');
      if(r.trap!=null&&r.trap>TRAPPED)fail.push('slotted');
      if(r.sciss!=null&&r.sciss>SCISSOR)fail.push('scissors');
      if(fail.length)sceneBad++;
      console.log(`  ${fail.length?'BAD ':'ok  '} ${r.id.padEnd(11)}`+
        `${String(r.arrived||'-').padStart(6)}px  `+
        `${String(beats.length||'-').padStart(2)} beat(s)  `+
        `${r.alive<0?'  -  ':(r.alive?' yes ':' NO  ')}  `+
        `${r.answered?' yes ':' NO  '}  `+
        `${String(r.left||'-').padStart(6)}px`+
        `${String(r.sciss==null?'-':r.sciss.toFixed(2)+'px').padStart(9)}`+
        (fail.length?'   <- '+fail.join(', '):''));
    }
    if(sceneBad)bad++;
    console.log(sceneBad?`\n  ${sceneBad} scene(s) a player would meet and find wrong.`
                        :'\n  Every scene walked, strode, lived, answered, left and held together.');
  }
  for(const e of errs){bad++;console.log('  BAD  page error: '+e);}
  console.log(bad?`\n${bad} thing(s) the player would see.`:'\nNothing a player would see wrong.');
  process.exitCode=bad?1:0;
}
