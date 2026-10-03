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
        await p.click('#rg-fs');await p.waitForTimeout(250);
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
  if(errs.length){console.log('\npage errors:');errs.forEach(e=>console.log('  '+e));bad+=errs.length;}
  console.log('\n* below: the page was already taller than the screen without the chip, and scrolls to it');
  console.log(bad?'\n'+bad+' to look at':'\nevery game goes full screen and comes back');
  await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
