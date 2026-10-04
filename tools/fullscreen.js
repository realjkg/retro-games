#!/usr/bin/env node
/* Does every game go full screen, and give it back?
 *
 * For each game, in Chromium, on a computer, a phone held upright and a phone
 * held sideways:
 *
 *   there    the chip is there where the page has no button of its own, and
 *            hidden where it has (those keep theirs);
 *   goes     pressed, the page is full screen, and the chip says EXIT;
 *   back     pressed again, it is not;
 *   space    after pressing it, SPACE goes to the game and not to the chip
 *            (SPACE is FIRE in most of these, and a focused button eats it);
 *   clear    the chip covers no control and no part of the playfield, and is
 *            on the screen.
 *
 * Then as an iPhone, which has no full-screen switch for a page (the API is
 * taken out before the page loads): the chip is on every page, own button or
 * not, and pressing it shows how to Add to Home Screen, with the game's name,
 * and Got it closes that. And as a game launched from the home screen: no chip.
 *
 * What this cannot do is be an iPhone. Safari's Add to Home Screen, and how a
 * game looks launched from it, need a real one.
 *
 *   PW=/path/to/node_modules/playwright-core node tools/fullscreen.js
 */
'use strict';
const path=require('path'), fs=require('fs');
const ROOT=path.join(__dirname,'..');
const CHROME=process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let chromium;
try{ chromium=require(process.env.PW?path.join(process.env.PW,'index.js'):'playwright-core').chromium; }
catch(e){ console.log('playwright-core not installed; skipping.'); process.exit(0); }

const GAMES=['archon','aztec','bards-tale','choplifter','drol','galaga',
  'lode-runner','law-of-the-west','tapped','wolfenstein'];
const OWN=['archon','aztec','choplifter','drol','lode-runner','law-of-the-west'];
const ROOT_PAGE=process.env.PAGES||ROOT;   /* another checkout, to run against an older build */
const SCREENS=[
  {name:'computer',viewport:{width:1280,height:800}},
  {name:'phone up',viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2},
  {name:'phone side',viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:2}];
const rows=[];let bad=0;
const cell=(ok,note)=>{if(!ok)bad++;return (ok?'yes ':'NO  ')+String(note).padEnd(12);};

/* everything the chip must not sit on */
const MEASURE=()=>{
  const chip=document.getElementById('rg-fs');
  if(!chip)return{there:false};
  const r=chip.getBoundingClientRect(),cs=getComputedStyle(chip);
  const shown=!chip.hidden&&cs.display!=='none'&&r.width>0&&r.height>0;
  const hits=[];
  if(shown){
    const vis=el=>{const q=el.getBoundingClientRect();if(q.width<2||q.height<2)return null;
      for(let e=el;e;e=e.parentElement){const s=getComputedStyle(e);
        if(s.display==='none'||s.visibility==='hidden'||+s.opacity===0)return null;}
      return q;};
    document.querySelectorAll('canvas,button,[role=button],[data-cmd],a,input,select,.pad,.stick').forEach(el=>{
      if(el===chip||el.id==='rg-launch'||el.closest('#rg-row')||el.closest('#rg-fs-how'))return;
      const q=vis(el);if(!q)return;
      const ix=Math.min(r.right,q.right)-Math.max(r.left,q.left),iy=Math.min(r.bottom,q.bottom)-Math.max(r.top,q.top);
      if(ix>1&&iy>1)hits.push((el.id||el.className||el.tagName).toString().slice(0,18));
    });
  }
  const inside=r.top>=0&&r.bottom<=innerHeight+0.5&&r.left>=0&&r.right<=innerWidth+0.5;
  /* Off the bottom: was the page already taller than the screen without it?
     Three games are, held sideways, and their way back to the collection was
     already down there. That is their layout, and it is reported, not passed
     over: the row says so. */
  let scrolled=false;
  if(shown&&!inside){const row=document.getElementById('rg-row')||chip;const d=row.style.display;
    row.style.display='none';scrolled=document.scrollingElement.scrollHeight>innerHeight+1;row.style.display=d;}
  return{there:true,shown,text:chip.textContent,hits,inside,scrolled};
};

(async()=>{
  const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox','--disable-dev-shm-usage']});
  const errs=[];
  const open=async(g,opt,init)=>{
    const c=await b.newContext(Object.assign({},opt));
    if(init)await c.addInitScript(init);
    const p=await c.newPage();p.on('pageerror',e=>errs.push(g+': '+e.message));
    await p.goto('file://'+path.join(ROOT_PAGE,g,'index.html'));
    try{await p.evaluate(()=>localStorage.clear());await p.reload();}catch(e){}
    await p.waitForTimeout(900);
    return{c,p};
  };
  console.log('game            screen      there         goes          back          space         clear');
  for(const g of GAMES){
    const own=OWN.includes(g);
    for(const s of SCREENS){
      const{c,p}=await open(g,s);
      const m=await p.evaluate(MEASURE);
      const row=[g.padEnd(16)+s.name.padEnd(12)];
      const wantShown=!own;
      row.push(cell(m.there&&m.shown===wantShown,!m.there?'no chip':m.shown?'shown':'hidden (own)'));
      if(m.there&&m.shown){
        await p.click('#rg-fs');await p.waitForTimeout(250);
        const on=await p.evaluate(()=>({fs:!!document.fullscreenElement,t:document.getElementById('rg-fs').textContent,
          focus:document.activeElement&&document.activeElement.id}));
        row.push(cell(on.fs&&/exit/i.test(on.t),on.fs?'full':'not full'));
        /* SPACE goes to the game: the chip has let go of the focus */
        const space=await p.evaluate(()=>{let n=0;const b=document.getElementById('rg-fs');
          const f=()=>n++;b.addEventListener('click',f);
          document.activeElement&&document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true}));
          b.removeEventListener('click',f);return{focus:document.activeElement===b,n};});
        await p.keyboard.press('Space');await p.waitForTimeout(150);
        const still=await p.evaluate(()=>!!document.fullscreenElement);
        const whileFull=await p.evaluate(MEASURE);
        /* out: in the game mode the chip's row is put away, and the way out is
           the EXIT in the status bar */
        await p.evaluate(()=>{const x=document.getElementById('rg-x');
          (x&&!x.hidden?x:document.getElementById('rg-fs')).click();});await p.waitForTimeout(250);
        const off=await p.evaluate(()=>({fs:!!document.fullscreenElement,t:document.getElementById('rg-fs').textContent}));
        row.push(cell(!off.fs&&!/exit/i.test(off.t),off.fs?'still full':'back'));
        row.push(cell(!space.focus&&still,space.focus?'chip has it':still?'to the game':'SPACE left'));
        const hits=[...m.hits,...whileFull.hits];
        row.push(cell(!hits.length&&(m.inside||m.scrolled),hits.length?'on '+hits[0]:m.inside?'clear':
          m.scrolled?'clear, below*':'off screen'));
      }else row.push(cell(true,'n/a'),cell(true,'n/a'),cell(true,'n/a'),cell(true,'n/a'));
      rows.push(row.join('  '));console.log(rows[rows.length-1]);
      await c.close();
    }
  }
  /* an iPhone: no Fullscreen API for a page */
  console.log('\ngame            iPhone: chip  says how      the name      closes        clear');
  const noAPI=()=>{try{delete Element.prototype.requestFullscreen;delete Element.prototype.webkitRequestFullscreen;
    delete HTMLElement.prototype.webkitRequestFullscreen;}catch(e){}};
  for(const g of GAMES){
    const{c,p}=await open(g,SCREENS[1],noAPI);
    const m=await p.evaluate(MEASURE);
    const row=[g.padEnd(16)];
    row.push(cell(m.there&&m.shown,!m.there?'no chip':m.shown?'shown':'hidden'));
    if(m.there&&m.shown){
      await p.click('#rg-fs');await p.waitForTimeout(200);
      const d=await p.evaluate(()=>{const d=document.getElementById('rg-fs-how');
        return d&&!d.hidden?{text:d.innerText,name:(d.querySelector('.rg-name')||{}).textContent||'',
          title:document.title}:null;});
      row.push(cell(!!d&&/Add to Home Screen/.test(d.text),d?'shown':'nothing'));
      row.push(cell(!!d&&d.name.length>2&&d.title.indexOf(d.name)>=0||!!d&&d.name.length>2,d?d.name.slice(0,12):'-'));
      if(d){await p.click('#rg-fs-how button');await p.waitForTimeout(100);}
      const shut=await p.evaluate(()=>{const d=document.getElementById('rg-fs-how');return !d||d.hidden;});
      row.push(cell(!!d&&shut,shut?'closed':'still open'));
      row.push(cell(!m.hits.length&&m.inside,m.hits.length?'on '+m.hits[0]:m.inside?'clear':'off screen'));
    }else row.push(cell(false,'-'),cell(false,'-'),cell(false,'-'),cell(false,'-'));
    console.log(row.join('  '));
    await c.close();
  }
  /* launched from the home screen: nothing to take away */
  console.log('\ngame            from the home screen');
  const standalone=()=>{Object.defineProperty(navigator,'standalone',{value:true});};
  for(const g of GAMES){
    const{c,p}=await open(g,SCREENS[1],standalone);
    const m=await p.evaluate(MEASURE);
    console.log(g.padEnd(16)+cell(m.there&&!m.shown,!m.there?'no chip':m.shown?'chip shown':'no chip shown'));
    await c.close();
  }
  /* The game mode. Full screen is only worth having if the game fills it:
     the first version of the chip put the same small page in the middle of
     the screen, and the game had 9 to 17 per cent of a monitor. On the eight
     pages built the same way, entered the way a player would (the chip, or
     the game's own button):
       fill     the picture is as large as it can be: made 4% larger, something
                no longer fits (it leaves the screen, a control does, a
                control ends up under it, or the page starts to scroll).
                Compared with the page it came from it would mislead: held
                sideways most of these pages scroll, and part of the picture
                was off the screen to begin with;
       reach    every control left on the screen is wholly on it, 4 px clear of
                the edge, and a finger on its middle lands on it and not on
                something laid over it;
       clear    no control sits on the picture;
       restore  out of full screen, the page is put back as it was. */
  const FIT=['aztec','bards-tale','choplifter','drol','galaga','lode-runner','tapped','wolfenstein'];
  const OWNBTN={aztec:'#fs',choplifter:'#fs',drol:'#fs','lode-runner':'#fs'};
  const GSCREENS=[SCREENS[0],{name:'laptop',viewport:{width:1366,height:768}},SCREENS[2],SCREENS[1],
    {name:'iPad side',viewport:{width:1024,height:768},isMobile:true,hasTouch:true,deviceScaleFactor:2}];
  const LOOK=()=>{
    const st=document.getElementById('stage');const r=st.getBoundingClientRect();
    const ctl=[];
    document.querySelectorAll('#pads button,#pads .btn,#pads .stick,#pads #stick,#pads #joy,#pads .dpad,.soundrow button,#status button').forEach(el=>{
      const q=el.getBoundingClientRect();if(q.width<4||q.height<4)return;
      for(let e=el;e;e=e.parentElement){const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return;}
      const cx=q.left+q.width/2,cy=q.top+q.height/2;
      /* the whole control, a few pixels clear of the edge: flush against it
         is cut off by a phone's rounded corners. The first version of this
         looked only at the middle, and passed buttons that ran off the side */
      const m=el.closest('#status')?0:4;
      const on=q.left>=m-0.5&&q.top>=m-0.5&&q.right<=innerWidth-m+0.5&&q.bottom<=innerHeight-m+0.5;
      const hit=on?document.elementFromPoint(cx,cy):null;
      const ix=Math.min(r.right,q.right)-Math.max(r.left,q.left),iy=Math.min(r.bottom,q.bottom)-Math.max(r.top,q.top);
      ctl.push({id:(el.id||el.className||el.tagName).toString().slice(0,14),on,
        hits:!!hit&&(hit===el||el.contains(hit)||hit.contains(el)),over:ix>1&&iy>1&&!st.contains(el)});
    });
    return{x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),
      pct:Math.round(100*r.width*r.height/(innerWidth*innerHeight)),
      edge:Math.round(100*Math.max(r.width/innerWidth,r.height/innerHeight)),
      touch:matchMedia('(any-pointer: coarse)').matches,ctl};
  };
  console.log('\ngame         screen      fill: picture, of the screen      reach           clear           restore');
  for(const g of FIT){
    for(const s of GSCREENS){
      const{c,p}=await open(g,s);
      const before=await p.evaluate(LOOK);
      const sel=OWNBTN[g]||'#rg-fs';
      try{await p.click(sel,{timeout:3000});}catch(e){await p.evaluate(q=>{const b=document.querySelector(q);if(b)b.click();},sel);}
      await p.waitForTimeout(600);
      const inn=await p.evaluate(LOOK);
      const full=await p.evaluate(()=>!!document.fullscreenElement);
      const row=[g.padEnd(13)+s.name.padEnd(12)];
      /* 4% larger: does it still all fit? Then it was not as large as it could be */
      const roomy=await p.evaluate(()=>{
        const st=document.getElementById('stage'),root=document.documentElement,se=document.scrollingElement;
        const fits=()=>{const r=st.getBoundingClientRect();
          if(r.left<-1||r.top<-1||r.right>innerWidth+1||r.bottom>innerHeight+1)return false;
          for(const el of document.querySelectorAll('#status,#pads button,#pads .btn,#pads .stick,#pads #stick,#pads #joy,#pads .dpad,.soundrow button')){
            const q=el.getBoundingClientRect();if(q.width<2||q.height<2)continue;
            let hid=false;for(let e=el;e;e=e.parentElement){if(getComputedStyle(e).display==='none')hid=true;}
            if(hid)continue;
            const m=el.id==='status'?-1:4;   /* the same rule as reach: a control clear of the edge */
            if(q.left<m||q.top<m||q.right>innerWidth-m||q.bottom>innerHeight-m)return false;
            if(Math.min(r.right,q.right)-Math.max(r.left,q.left)>1&&Math.min(r.bottom,q.bottom)-Math.max(r.top,q.top)>1)return false;}
          return true;};
        const s0=se.scrollHeight>innerHeight+1,was=root.style.getPropertyValue('--rg-sw');
        root.style.setProperty('--rg-sw',Math.round(st.getBoundingClientRect().width*1.04)+'px');
        const still=fits()&&(s0||se.scrollHeight<=innerHeight+1);
        if(was)root.style.setProperty('--rg-sw',was);else root.style.removeProperty('--rg-sw');
        return still;});
      const fillOk=full&&!roomy;
      row.push(cell(fillOk,(full?'':'not full ')+(roomy?'could be bigger ':'')+inn.pct+'% (was '+before.pct+')'));
      const lost=inn.ctl.filter(k=>!k.on||!k.hits);
      row.push(cell(!lost.length,lost.length?lost[0].id+(lost[0].on?' covered':' at the edge'):inn.ctl.length+' controls'));
      const over=inn.ctl.filter(k=>k.over);
      row.push(cell(!over.length,over.length?'on '+over[0].id:'clear'));
      /* out again: the game's own button, or the chip's EXIT in the status bar */
      await p.evaluate(q=>{const x=document.getElementById('rg-x');const b=(x&&!x.hidden)?x:document.querySelector(q);if(b)b.click();},sel);
      await p.waitForTimeout(600);
      const after=await p.evaluate(LOOK);
      const same=['x','y','w','h'].every(k=>Math.abs(after[k]-before[k])<=1);
      row.push(cell(same,same?'as it was':'moved '+JSON.stringify([after.x,after.y,after.w,after.h])));
      console.log(row.join('  '));
      await c.close();
    }
  }
  if(errs.length){console.log('\npage errors:');errs.forEach(e=>console.log('  '+e));bad+=errs.length;}
  console.log('\n* below: the page was already taller than the screen without the chip, and scrolls to it');
  console.log(bad?'\n'+bad+' to look at':'\nevery game goes full screen and comes back');
  await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
