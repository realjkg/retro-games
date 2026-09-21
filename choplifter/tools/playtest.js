#!/usr/bin/env node
/* Fly the game the way a player flies it, and report on the motion.
 *
 * The test suite checks what the page computes. It cannot see what the page
 * shows, and everything that has ever been wrong with a figure in this
 * repository was wrong in the second place while the first was green. So this
 * opens the committed page in a real browser, presses the keys a player
 * presses, reads the pixels the page actually painted, and asks six questions
 * of every scene:
 *
 *   in      did it arrive under its own power, a step at a time, or appear?
 *   turn    did the chopper turn through drawn pictures, or flip between two?
 *   alive   is the picture a twentieth of a second later a different picture?
 *   answers does the scene do anything about what the player pressed?
 *   off     does it leave the way it came - the people aboard, the chopper away?
 *   leans   does she nose over into a run, and come back level out of it?
 *   seeks   does a seeker turn onto what it was fired at?
 *   whole   is the figure one figure: no shed ink, no sky shut inside it?
 *
 * Read the rows. The summary line at the bottom is for a machine.
 *
 * Every one of those checks has been shown to fail. --sabotage=<name> patches
 * one defect into the page in memory and runs against that instead, because a
 * check that passes on the broken build and the fixed one is not a check:
 *
 *   snapturn     the turn is set rather than walked        -> turn
 *   leanthrottle thrust taken off the lean, not the stick  -> off
 *   frozenrotor  the rotor is drawn at one angle for ever  -> alive
 *   slidwalk     one pose of the gait, slid along          -> stride
 *   teleport     a hostage crosses the ground in one frame -> in
 *   deaf         the keyboard is not read                  -> answers
 *   bands        the chopper drawn in three slid slices    -> whole
 *   levelflight  she flies flat out with her nose level     -> leans
 *   dumbseeker   the seeker flies straight on off the rail  -> seeks
 *
 *   PW=$PWD/../law-of-the-west/node_modules/playwright-core node tools/playtest.js
 *   node tools/playtest.js --keep             and write the frames to .playtest
 *   node tools/playtest.js --sabotage=bands   and prove the check can go red
 */
'use strict';
const fs=require('fs'), path=require('path'), os=require('os');
const ROOT=path.join(__dirname,'..');
const PAGE=path.join(ROOT,'index.html');
const OUT=path.join(ROOT,'.playtest');
const KEEP=process.argv.includes('--keep');
const SAB=(process.argv.find(a=>a.startsWith('--sabotage='))||'').split('=')[1]||'';

const JUMP=9;             // px a man may cross in one frame before it is a teleport
const LEANMIN=.10;        // radians before a lean is a lean and not a wobble
const TILTMIN=1.2;        // px between her ends before the picture has leaned
const STRIDES=3;          // drawn gait frames that must show while he crosses
const TURNPICS=5;         // drawn pictures a full left-to-right turn must show
const SNAP=1.4;           // turn units in one frame before it is a flip, not a turn

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
                        'chrome-win/chrome.exe','chrome-linux/headless_shell'])
        if(fs.existsSync(path.join(r,d,exe)))return path.join(r,d,exe);
    }
  }
  for(const p of ['/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome'])
    if(fs.existsSync(p))return p;
  return null;
}

/* ---- the defects, written back into the page one at a time ---- */
const SABOTAGE={
  snapturn:['  h.tf=Math.abs(h.want-h.tf)<=Math.abs(step)?h.want:h.tf+step;',
            '  h.tf=h.want;'],
  // The defect the fidelity pass found: thrust taken off the lean, which makes
  // the turn a throttle and the three positions a gear lever.
  leanthrottle:[' const target=h.landed?0:MAXV*s.x;',
                ' const target=h.landed?0:MAXV*(h.tf/3);'],
  frozenrotor:[' h.rotor=(h.rotor+dt*26)%(Math.PI*2);',' h.rotor=0;'],
  slidwalk:['  p.f=Math.floor(p.gait/6)%4;','  p.f=0;'],
  teleport:[' p.x=clamp(p.x+p.vx*dt,0,WORLD-HOST_W);',
            ' p.x=clamp(p.x+p.vx*dt*16,0,WORLD-HOST_W);'],
  deaf:['function keyOf(e){return KMAP[e.key]||KMAP[(e.key||"").toLowerCase()];}',
        'function keyOf(e){return null;}'],
  bands:[' }else drawPix(CHOP_TURN[idx],CHOP_PAL,x,y,1,flip);',
         ' {const m=CHOP_TURN[idx];drawPix(m.slice(0,4),CHOP_PAL,x-2,y,1,flip);'+
         'drawPix(m.slice(4,8),CHOP_PAL,x+2,y+4,1,flip);'+
         'drawPix(m.slice(8),CHOP_PAL,x,y+8,1,flip);}']
       .map((t,i)=>i?' }else '+t.trim():t),
  // She flies flat out with her nose level, which is what she did before any
  // of this and what the lean checks exist to notice.
  levelflight:[' h.lean+=clamp(lean-h.lean,-LEAN_RATE*dt,LEAN_RATE*dt);',' h.lean=0;'],
  // The seeker leaves the rail and flies straight on, which is a rocket.
  dumbseeker:['   k.ang+=clamp(d,-SEEK_TURN*dt,SEEK_TURN*dt);','   k.ang+=0;']
};
function pageURL(){
  let html=fs.readFileSync(PAGE,'utf8');
  if(!SAB)return 'file://'+PAGE;
  const patch=SABOTAGE[SAB];
  if(!patch){console.error('no such sabotage: '+SAB+' (have: '+Object.keys(SABOTAGE).join(', ')+')');process.exit(2);}
  if(html.indexOf(patch[0])<0){
    console.error('the sabotage no longer matches the page: '+SAB);
    console.error('  looked for: '+patch[0].trim());
    process.exit(2);
  }
  html=html.replace(patch[0],patch[1]);
  fs.mkdirSync(OUT,{recursive:true});
  const f=path.join(OUT,'sabotage-'+SAB+'.html');
  fs.writeFileSync(f,html);
  return 'file://'+f;
}

/* ---- what the page is asked, in the page ---- *
 * Everything here reads the page defensively. The whole point of the tool is
 * being run against the build you are replacing as well as the one you are
 * proposing, and that build will be missing something.
 */
const SAMPLER=function(n){
  return new Promise(function(res){
    const out=[];
    function hash(){
      try{
        const c=document.getElementById('cv'), g=c.getContext('2d');
        const r=(typeof window.__chop==='function')?window.__chop():null;
        if(!r)return 0;
        const x=Math.max(0,Math.min(c.width-46,Math.round((+r.x||0)-(+r.cam||0))-8));
        const y=Math.max(0,Math.min(c.height-32,24+Math.round(+r.y||0)-14));
        const d=g.getImageData(x,y,46,32).data;
        let h=2166136261;
        for(let i=0;i<d.length;i+=4)h=Math.imul(h^(d[i]+d[i+1]*3+d[i+2]*7),16777619)>>>0;
        return h>>>0;
      }catch(e){return 0;}
    }
    function take(){
      let r=null; try{r=(typeof window.__chop==='function')?window.__chop():null;}catch(e){}
      const p=(r&&Array.isArray(r.people))?r.people:[];
      const sk=(r&&Array.isArray(r.seekers))?r.seekers:[];
      out.push({x:r?Math.round(+r.x||0):0,y:r?Math.round(+r.y||0):0,
        turn:r?(+r.turn||0):0,pic:r?(r.frame|0):0,
        lean:r?(+r.lean||0):0,
        attitude:(r&&typeof r.attitude==='string')?r.attitude:'',
        vx:r?(+r.vx||0):0,seek:r?(r.seek|0):0,
        seekers:sk.map(k=>({x:Math.round(+k.x||0),y:Math.round(+k.y||0)})),
        foePos:(r&&Array.isArray(r.foes))?r.foes.map(e=>({k:typeof e.k==='string'?e.k:'',
          x:Math.round(+e.x||0),y:Math.round(+e.y||0)})):[],
        landed:!!(r&&r.landed),aboard:r?(r.aboard|0):0,rescued:r?(r.rescued|0):0,
        lost:r?(r.lost|0):0,score:r?(r.score|0):0,
        huts:(r&&Array.isArray(r.huts))?r.huts.map(h=>({open:!!h.open,left:h.left|0})):[],
        foes:(r&&Array.isArray(r.foes))?r.foes.length:0,
        people:p.map(q=>({id:q.id|0,x:Math.round(+q.x||0),
          st:typeof q.st==='string'?q.st:'',f:q.f|0,duck:!!q.duck})),
        ink:hash()});
    }
    function step(){requestAnimationFrame(function(){take();
      if(out.length<n)step(); else res(out);});}
    step();
  });
};

/* Is she one machine?
 *
 * Two questions, because one of them cannot be asked of the picture on the
 * screen. Drawn alone over a flat ground, everything above the skids - body,
 * blades, tail rotor - has to come out as a single shape of six pixels or
 * more, and it has to weigh exactly the same mirrored as it does facing the
 * other way. A figure drawn in bands and slid apart fails the first; a figure
 * that sheds ink when it is flipped fails the second. The rotor's own disc is
 * a ring of loose dots by design, so anything under six pixels is not counted
 * against her.
 *
 * And the sprite on its own, with no rotor over it, has to have no ground shut
 * inside it - the slot of sky down the length of an arm that made every caller
 * in Law of the West read as sticks in a coat. Between the skids is not inside
 * her, so the skid rows are not looked at.
 */
const WHOLE=function(){
  try{
    if(typeof drawChopper!=='function'||typeof G!=='object'||!G.h)return null;
    const c=document.getElementById('cv'), g=c.getContext('2d');
    const h=G.h, W=52, H=10;                    // rows 0..9: everything but the skids
    const Y=Math.max(0,Math.min(c.height-H-1,24+Math.round(h.y)));
    const oldcam=G.cam.x, oldtf=h.tf, oldlean=h.lean;
    // She is posed level for this one. Whether she is one machine and whether
    // she leans are two questions, and the picture she is compared against
    // here is the drawn frame, which is level by definition. The lean has
    // checks of its own below, on pixels, so nothing is lost by holding her
    // still for this one.
    if(typeof h.lean==='number')h.lean=0;
    function read(draw){
      g.save();g.setTransform(1,0,0,1,0,0);
      g.fillStyle='#d6c39a';g.fillRect(0,Y,W,H);
      draw();
      const d=g.getImageData(0,Y,W,H).data;
      g.restore();
      const on=new Uint8Array(W*H);
      let ink=0;
      for(let i=0;i<W*H;i++){
        const o=i*4;
        if(Math.abs(d[o]-0xd6)+Math.abs(d[o+1]-0xc3)+Math.abs(d[o+2]-0x9a)>24){on[i]=1;ink++;}
      }
      return {on,ink};
    }
    function flood(on,want,seeds){
      const seen=new Uint8Array(W*H), st=seeds.slice();
      let n=0;
      while(st.length){
        const i=st.pop();
        if(i<0||i>=W*H||seen[i]||on[i]!==want)continue;
        seen[i]=1;n++;
        const x=i%W;
        if(x>0)st.push(i-1);
        if(x<W-1)st.push(i+1);
        st.push(i-W);st.push(i+W);
      }
      return {seen,n};
    }
    G.cam.x=h.x-8;
    const a=read(function(){drawChopper(h);});
    // What she should be: the drawn body, whole, where drawChopper put her.
    // Measuring the painted machine on its own is not enough - the rotor is
    // eighteen pixels of blade either side of the hub, and it bridges a body
    // cut into bands and slid apart, so the machine still comes out as one
    // shape and the check passes on the broken build. Comparing what was
    // painted against the picture it claims to be painting does not.
    let missing=-1;
    if(typeof drawPix==='function'&&typeof CHOP_TURN!=='undefined'){
      const idx=Math.max(0,Math.min(3,Math.round(Math.abs(h.tf))));
      const want=read(function(){drawPix(CHOP_TURN[idx],CHOP_PAL,8,Y,1,h.tf<0);});
      missing=0;
      for(let i=0;i<W*H;i++)if(want.on[i]&&!a.on[i])missing++;
    }
    G.cam.x=oldcam;h.tf=oldtf;
    if(typeof oldlean==='number')h.lean=oldlean;
    let bodies=0, main=0, seen=new Uint8Array(W*H);
    for(let i=0;i<W*H;i++){
      if(a.on[i]&&!seen[i]){
        const f=flood(a.on,1,[i]);
        for(let k=0;k<W*H;k++)if(f.seen[k])seen[k]=1;
        if(f.n>=6)bodies++;
        if(f.n>main)main=f.n;
      }
    }
    // The sprite by itself: no rotor over it, no skids under it. Turning a
    // picture over must not cost it a pixel, and no sky may be shut inside it.
    let holes=0, pics=0, shed=0, sprite=0;
    if(typeof drawPix==='function'&&typeof CHOP_TURN!=='undefined'){
      const border=[];
      for(let x=0;x<W;x++){border.push(x);border.push((H-1)*W+x);}
      for(let y=0;y<H;y++){border.push(y*W);border.push(y*W+W-1);}
      for(let k=0;k<CHOP_TURN.length;k++){
        const f=read(function(){drawPix(CHOP_TURN[k],CHOP_PAL,6,Y,1,false);});
        const m=read(function(){drawPix(CHOP_TURN[k],CHOP_PAL,6,Y,1,true);});
        pics+=2;sprite+=f.ink;
        if(f.ink!==m.ink)shed++;
        for(const one of [f,m]){
          const air=flood(one.on,0,border);
          for(let i=0;i<W*H;i++)if(!one.on[i]&&!air.seen[i])holes++;
        }
      }
    }
    return {ink:a.ink,main,missing,sprite,shed,bodies,holes,pics};
  }catch(e){return null;}
};

/* Does she actually lean, on the screen?
 *
 * The report says how far over she is. That number being right is exactly the
 * thing this repository has been caught by before, so it is not what is
 * measured here. She is posed at an angle and painted on a blank ground, and
 * the picture is asked whether one end of her is lower than the other: the
 * mean height of her ink down the nose third against the mean height down the
 * tail third. Level that difference is nothing; nosed over it is pixels, and
 * its sign says which end went down.
 *
 * It is also asked whether the leaned machine is still a machine - that she
 * did not shed her rails or come apart on the way round - because a lean that
 * breaks her is worse than no lean at all.
 */
const LEANS=function(ang){
  try{
    if(typeof drawChopper!=='function'||typeof G!=='object'||!G.h)return null;
    if(typeof G.h.lean!=='number')return null;       // an older build does not lean
    const c=document.getElementById('cv'), g=c.getContext('2d');
    const h=G.h, W=54, H=20;
    const Y=Math.max(0,Math.min(c.height-H-1,24+Math.round(h.y)-4));
    const keep={cam:G.cam.x,lean:h.lean,tf:h.tf,x:h.x,y:h.y};
    function look(tf,lean){
      h.tf=tf;h.lean=lean;G.cam.x=h.x-10;
      g.save();g.setTransform(1,0,0,1,0,0);
      g.fillStyle='#d6c39a';g.fillRect(0,Y,W,H);
      drawChopper(h);
      const d=g.getImageData(0,Y,W,H).data;
      g.restore();
      let ls=0,ln=0,rs=0,rn=0,ink=0,lo=1e9,hi=-1e9;
      for(let y=0;y<H;y++)for(let x=0;x<W;x++){
        const o=(y*W+x)*4;
        if(Math.abs(d[o]-0xd6)+Math.abs(d[o+1]-0xc3)+Math.abs(d[o+2]-0x9a)<=24)continue;
        ink++;lo=Math.min(lo,x);hi=Math.max(hi,x);
        if(x<W*0.28){ls+=y;ln++;}else if(x>W*0.62){rs+=y;rn++;}
      }
      return {tilt:(ln&&rn)?+((rs/rn)-(ls/ln)).toFixed(2):0,ink:ink};
    }
    const out={
      level:look(3,0),
      dive:look(3,ang),
      climb:look(3,-ang),
      mirrored:look(-3,-ang),                       // nose left, going left: the same dive
      roll:look(0,ang)
    };
    G.cam.x=keep.cam;h.lean=keep.lean;h.tf=keep.tf;
    return out;
  }catch(e){return null;}
};

/* ---- the scenes, in the order a rescue happens ---- */
const at=(s,i)=>s[i<0?Math.max(0,s.length+i):Math.min(s.length-1,i)];
let K={FRONTIER_X:430,POST_X:150,WORLD:2520};   // replaced by the page's own
const SCENES=[
 {name:'the pad at dawn',
  setup:'newGame(2,90210);',
  ask:'turn alive answers whole',
  // Four presses of the button walk her all the way round the ring, and the
  // page has to draw her through every picture on the way.
  script:[{keys:[],taps:['x'],n:26},{keys:[],taps:['x'],n:26},
          {keys:[],taps:['x'],n:26},{keys:[],taps:['x'],n:26},
          {keys:['ArrowUp'],n:26}],
  answers:s=>Math.min.apply(null,s.map(f=>f.y))<at(s,0).y-8},

 {name:'over the fence',
  setup:'newGame(2,7);G.h.x=FRONTIER_X+120;G.h.y=68;G.h.landed=false;'+
        'G.cam.x=Math.max(0,G.h.x-200);',
  ask:'in alive answers off whole',
  script:[{keys:['Shift','ArrowLeft'],n:160}],
  answers:s=>at(s,-1).x<at(s,0).x-40,
  off:s=>at(s,-1).x<K.FRONTIER_X},

 {name:'the first barracks',
  setup:'newGame(2,11);G.foes=[];G.waveT=999;'+
        'const H=G.huts.find(q=>!q.open);G.hutUnderFire=H;'+
        'G.h.x=H.x+86;G.h.y=GROUND_Y-CHOP_H;G.h.landed=true;G.h.tf=-3;G.h.want=-3;'+
        'G.h.seq=2;G.cam.x=Math.max(0,H.x-60);',
  ask:'in stride alive answers whole',
  script:[{keys:[],taps:['z'],n:12},{keys:[],taps:['z'],n:12},{keys:[],taps:['z'],n:12},
          {keys:[],taps:['z'],n:12},{keys:[],n:130}],
  answers:s=>at(s,-1).huts.filter(h=>h.open).length>at(s,0).huts.filter(h=>h.open).length},

 {name:'loading',
  setup:'newGame(2,12);G.foes=[];G.waveT=999;'+
        'const H=G.huts.find(q=>!q.open);H.hp=0;openHut(H);'+
        'G.h.x=H.x+72;G.h.y=GROUND_Y-CHOP_H;G.h.landed=true;G.h.tf=-3;G.h.want=-3;'+
        'G.h.seq=2;G.cam.x=Math.max(0,H.x-40);',
  ask:'in stride alive off whole',
  script:[{keys:[],n:200}],
  off:s=>at(s,-1).aboard>=3},

 {name:'under fire',
  setup:'newGame(2,13);G.foes=[];G.waveT=999;G.people=[];'+
        'G.h.x=FRONTIER_X-600;G.h.y=GROUND_Y-CHOP_H;G.h.landed=true;'+
        'G.h.tf=-3;G.h.want=-3;G.h.seq=2;G.cam.x=G.h.x-150;'+
        'G.foes.push(tank(G.h.x-150,1));',
  ask:'in alive answers whole',
  script:[{keys:[],taps:['z'],n:10},{keys:[],taps:['z'],n:10},{keys:[],taps:['z'],n:10},
          {keys:[],taps:['z'],n:10},{keys:[],taps:['z'],n:10},{keys:[],n:40}],
  answers:s=>at(s,-1).foes<at(s,0).foes||at(s,-1).score>at(s,0).score},

 {name:'the flight home',
  setup:'newGame(2,14);G.foes=[];G.waveT=999;G.aboard=8;'+
        'G.h.x=FRONTIER_X-240;G.h.y=60;G.h.landed=false;'+
        'G.cam.x=Math.max(0,G.h.x-160);',
  ask:'in turn alive answers off whole',
  // The stick held east the whole way while the button is turning her round
  // and round: where she is pointing has nothing to do with where she is going,
  // so she must not lose a pixel of ground to any of it.
  script:[{keys:['Shift','ArrowRight'],taps:['x'],n:52},
          {keys:['Shift','ArrowRight'],taps:['x'],n:52},
          {keys:['Shift','ArrowRight'],taps:['x'],n:52},
          {keys:['Shift','ArrowRight'],taps:['x'],n:52},
          {keys:['Shift','ArrowRight'],n:60}],
  answers:s=>at(s,-1).x>at(s,0).x+60,
  off:s=>at(s,-1).x>K.FRONTIER_X&&s.every((f,i)=>!i||f.x>=s[i-1].x-1)},

 {name:'the run in',
  // Flat out east in profile, then let go of everything and hover. She has to
  // nose over into the run, come back level when she stops asking for it, and
  // lean the other way when she is flown backwards - which she can be, because
  // where she points and where she is going are two questions here.
  setup:'newGame(2,4242);G.foes=[];G.waveT=999;G.people=[];'+
        'G.h.x=FRONTIER_X-700;G.h.y=56;G.h.landed=false;'+
        'G.h.tf=3;G.h.want=3;G.h.seq=0;G.cam.x=Math.max(0,G.h.x-160);',
  ask:'alive answers whole leans',
  script:[{keys:['Shift','ArrowRight'],n:70},   // the run
          {keys:['Shift'],n:90},                 // hands off: the speed comes off, and so does the lean
          {keys:['Shift','ArrowLeft'],n:80}],    // and backwards, nose still east
  answers:s=>at(s,-1).x<at(s,-70).x-20,
  // in her own terms: nosed over in the run, level in the hover, tail down
  // when she is dragged backwards
  leans:s=>{
   const run=s.slice(30,70), hover=s.slice(140,160), back=s.slice(200);
   const mx=a=>a.reduce((m,f)=>Math.max(m,f.lean),-9);
   const mn=a=>a.reduce((m,f)=>Math.min(m,f.lean),9);
   return {dive:mx(run),level:Math.max(Math.abs(mx(hover)),Math.abs(mn(hover))),
           back:mn(back),
           dived:run.some(f=>f.attitude==='dive'),
           climbed:back.some(f=>f.attitude==='climb')};
  }},

 {name:'seekers away',
  // One jet, crossing above her, and one seeker off the rail. The gun cannot
  // answer that shot: it fires level and the jet is not level with her.
  setup:'newGame(2,99);G.foes=[];G.waveT=999;G.people=[];'+
        'G.h.x=FRONTIER_X-520;G.h.y=86;G.h.landed=false;G.h.tf=3;G.h.want=3;G.h.seq=0;'+
        'G.h.seek=4;G.foes=[jet(G.h.x+150,-1,20)];G.foes[0].sp=26;'+
        'G.cam.x=Math.max(0,G.h.x-140);',
  ask:'alive answers seeks',
  script:[{keys:['Shift'],taps:['c'],n:8},{keys:['Shift'],n:120}],
  answers:s=>s.some(f=>f.seekers.length>0)&&at(s,-1).seek<4,
  seeks:s=>{
   const gone=at(s,-1).foePos.length===0&&at(s,0).foePos.length===1;
   // and it got there by turning towards it, not by luck: the gap closes
   let near=1e9;
   for(const f of s){
    for(const k of f.seekers)for(const e of f.foePos)
     near=Math.min(near,Math.hypot(k.x-e.x,k.y-e.y));
   }
   return {killed:gone,closed:near};
  }},

 {name:'the pad again',
  setup:'newGame(2,15);G.foes=[];G.waveT=999;G.aboard=8;G.h.x=POST_X;G.h.y=52;'+
        'G.h.landed=false;G.h.tf=0;G.h.want=0;G.h.seq=1;G.cam.x=POST_X-200;',
  ask:'in alive answers off whole',
  script:[{keys:['ArrowDown'],n:60},{keys:[],n:150}],
  answers:s=>at(s,-1).y>at(s,0).y+20,
  off:s=>at(s,-1).rescued>=8&&at(s,-1).aboard===0}
];

/* ---- the questions, asked of what came back ---- */
function jumps(s){
  let m=0;
  for(let i=1;i<s.length;i++)m=Math.max(m,Math.abs(s[i].x-s[i-1].x));
  const seen=new Map();
  let pm=0;
  for(const f of s)for(const p of f.people){
    if(seen.has(p.id))pm=Math.max(pm,Math.abs(p.x-seen.get(p.id)));
    seen.set(p.id,p.x);
  }
  return {chopper:m,man:pm};
}
function strides(s){
  const walked=new Map(), pics=new Map();
  for(const f of s)for(const p of f.people){
    const w=walked.get(p.id)||{lo:p.x,hi:p.x};
    w.lo=Math.min(w.lo,p.x);w.hi=Math.max(w.hi,p.x);walked.set(p.id,w);
    if(!pics.has(p.id))pics.set(p.id,new Set());
    pics.get(p.id).add(p.f);
  }
  let best=0, moved=false;
  for(const [id,w] of walked){
    if(w.hi-w.lo<24)continue;
    moved=true;best=Math.max(best,pics.get(id).size);
  }
  return moved?best:-1;
}
function turning(s){
  const pics=new Set();
  let snap=0;
  for(let i=0;i<s.length;i++){
    pics.add((s[i].turn<0?-1:1)*s[i].pic);
    if(i)snap=Math.max(snap,Math.abs(s[i].turn-s[i-1].turn));
  }
  return {pics:pics.size,snap:+snap.toFixed(2)};
}
const mark=ok=>ok===null?'  —  ':(ok?'  ok ':' FAIL');

/* ---- flying it ---- */
async function sample(pg,n){return pg.evaluate(SAMPLER,n);}
async function runScene(pg,def,i){
  await pg.evaluate('(function(){'+def.setup+'})()');
  await pg.evaluate(SAMPLER,4);                 // let the setup land before it is read
  let s=[];
  const down=new Set();
  for(const seg of def.script){
    for(const k of Array.from(down))if(!seg.keys.includes(k)){await pg.keyboard.up(k);down.delete(k);}
    for(const k of seg.keys)if(!down.has(k)){await pg.keyboard.down(k);down.add(k);}
    for(const k of (seg.taps||[]))await pg.keyboard.press(k);
    s=s.concat(await sample(pg,seg.n));
  }
  for(const k of Array.from(down)){await pg.keyboard.up(k);down.delete(k);}
  // Everything let go of, the camera settled, nothing asked of her: what is
  // still moving now is what is alive on its own.
  await pg.keyboard.down('Shift');
  await sample(pg,14);
  const still=await sample(pg,16);
  await pg.keyboard.up('Shift');
  const whole=await pg.evaluate(WHOLE);
  // How far over she goes, asked of the machine at the angle she actually
  // reached in this scene rather than at one picked here.
  let reached=0;
  for(const f of s)reached=Math.max(reached,Math.abs(f.lean||0));
  const leans=reached>0.02?await pg.evaluate(LEANS,reached):null;
  if(KEEP){
    fs.mkdirSync(OUT,{recursive:true});
    const st=await pg.$('#stage');
    if(st)await st.screenshot({path:path.join(OUT,String(i+1).padStart(2,'0')+'-'+
      def.name.replace(/[^a-z]+/g,'-')+'.png')});
  }
  return {s,still,whole,leans};
}

function judge(def,r){
  const ask=def.ask.split(/\s+/);
  const has=k=>ask.includes(k);
  const j=jumps(r.s), st=strides(r.s), t=turning(r.s);
  const alive=new Set(r.still.map(f=>f.ink)).size;
  const w=r.whole, L=r.leans, lf=has('leans')&&def.leans?def.leans(r.s):null;
  const sk=has('seeks')&&def.seeks?def.seeks(r.s):null;
  /* She leans if all four hold:
   *   she nosed over in the run and came back level in the hover,
   *   she leaned the other way when she was flown backwards,
   *   the picture painted at that angle really is lower at one end than the
   *   other, and the other way round for the other sign, and
   *   nose left going left paints the mirror of nose right going right.
   * The picture is where this is decided - the first two only say the angle
   * was asked for. */
  const leansOK=!!(lf&&L&&
    lf.dive>=LEANMIN&&lf.level<=LEANMIN/3&&lf.back<=-LEANMIN*0.5&&
    lf.dived&&lf.climbed&&
    L.dive.tilt-L.level.tilt>=TILTMIN&&L.climb.tilt-L.level.tilt<=-TILTMIN&&
    L.mirrored.tilt+L.level.tilt<=-TILTMIN&&Math.abs(L.roll.tilt-L.level.tilt)>=TILTMIN/3&&
    L.dive.ink>=L.level.ink*0.85);
  /* A seeker works if the jet is down and it was on it when it went: the gap
   * measured here is between the seeker and the jet's top corner, sampled a
   * frame at a time while the seeker is crossing three pixels a frame, so
   * twenty is a hit on a jet sixteen pixels long. A seeker that does not turn
   * goes by a hundred pixels away, which is the distance this is measuring. */
  const seeksOK=!!(sk&&sk.killed&&sk.closed<=20);
  return {
    in:   has('in')?(j.chopper<=14&&(j.man<0||j.man<=JUMP)):null,
    stride: has('stride')?(st>=STRIDES):null,
    turn: has('turn')?(t.pics>=TURNPICS&&t.snap<=SNAP):null,
    alive:has('alive')?(alive>=4):null,
    answers: has('answers')?!!(def.answers&&def.answers(r.s)):null,
    off:  has('off')?!!(def.off&&def.off(r.s)):null,
    whole:has('whole')?!!(w&&w.ink>60&&w.missing===0&&w.shed===0&&w.holes===0):null,
    leans:has('leans')?leansOK:null,
    seeks:has('seeks')?seeksOK:null,
    note:'pic '+t.pics+'/'+t.snap.toFixed(2)+' jump '+j.chopper.toFixed(0)+'/'+
      (j.man<0?'-':j.man.toFixed(0))+' gait '+(st<0?'-':st)+' live '+alive+
      (w?' lost '+w.missing+' one-piece '+Math.round(100*w.main/Math.max(1,w.ink))+
         '% shed '+w.shed+'/'+w.pics+' hole '+w.holes:' whole -')+
      (lf?' lean '+lf.dive.toFixed(2)+'/'+lf.level.toFixed(2)+'/'+lf.back.toFixed(2):'')+
      (L?' tilt '+L.dive.tilt+'/'+L.level.tilt+'/'+L.climb.tilt+
         ' mirror '+L.mirrored.tilt+' roll '+L.roll.tilt:'')+
      (sk?' seeker '+(sk.killed?'hit':'missed')+' by '+
         (sk.closed>1e8?'-':sk.closed.toFixed(1))+'px':'')
  };
}

(async()=>{
  const exe=browserPath();
  if(!exe){console.error('no chromium found; set CHROME=/path/to/chrome');process.exit(2);}
  const browser=await chromium.launch({executablePath:exe});
  const pg=await browser.newPage({viewport:{width:900,height:520},deviceScaleFactor:1});
  const errs=[];
  pg.on('pageerror',e=>errs.push(String(e)));
  pg.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text());});
  await pg.goto(pageURL(),{waitUntil:'load'});
  await pg.waitForTimeout(400);
  // The country's own numbers, read out of the page rather than repeated here.
  K=Object.assign(K,await pg.evaluate(function(){
    try{return {FRONTIER_X:FRONTIER_X,POST_X:POST_X,WORLD:WORLD};}catch(e){return {};}
  }));
  const cols=['in','stride','turn','alive','answers','off','whole','leans','seeks'];
  console.log((SAB?'SABOTAGED: '+SAB+'\n\n':'')+
    'scene'.padEnd(22)+cols.map(c=>c.padStart(5)).join(' ')+'   what was measured');
  console.log('-'.repeat(22+cols.length*6+40));
  let bad=0, asked=0;
  for(let i=0;i<SCENES.length;i++){
    const def=SCENES[i];
    const r=await runScene(pg,def,i);
    const v=judge(def,r);
    for(const c of cols){if(v[c]===false)bad++;if(v[c]!==null)asked++;}
    console.log(def.name.padEnd(22)+cols.map(c=>mark(v[c])).join(' ')+'   '+v.note);
  }
  console.log('-'.repeat(22+cols.length*6+40));
  console.log(bad?(bad+' of '+asked+' checks failed'):(asked+' checks, all of them green'));
  if(errs.length){console.log('\npage errors:');for(const e of errs.slice(0,8))console.log('  '+e);}
  await browser.close();
  process.exit(bad||errs.length?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
