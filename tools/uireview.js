#!/usr/bin/env node
/* What does each game put round its picture? The material for a design review.
 *
 * A minimal game screen is mostly game: the picture as large as it can be,
 * and round it only what a player needs to play. This photographs every game
 * and measures how far each screen is from that, so a reviewer (a person, or
 * .claude/agents/ui-game-reviewer.md) can look at the pictures with numbers
 * beside them instead of opinions.
 *
 * For each game, on a phone held upright, a phone held sideways and a
 * computer; on the page as it opens and in full-screen game mode; on the
 * title and after ENTER:
 *
 *   picture   per cent of the screen that is the game picture
 *   chrome    controls round the picture that are not the joystick, the
 *             d-pad or the action buttons (menus, toggles, links), counted
 *   words     words of text on the screen outside the picture and its
 *             controls
 *   type      distinct font families / sizes in that text
 *   colours   distinct text and button colours outside the picture
 *   scroll    whether the page is taller than the screen
 *   stick     on a touch screen: is there a stick or d-pad, and an action
 *             button, at least 44 px (a thumb), and is every one of them
 *             wholly on the screen, clear of its edge?
 *             This is the line a design change may not cross.
 *
 * Writes <out>/index.html, a contact sheet of every screen with its numbers,
 * <out>/report.json, and one PNG per screen.
 *
 *   PW=/path/to/node_modules/playwright-core node tools/uireview.js [out] [game,game]
 */
'use strict';
const path=require('path'), fs=require('fs');
const ROOT=path.join(__dirname,'..');
const CHROME=process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let chromium;
try{ chromium=require(process.env.PW?path.join(process.env.PW,'index.js'):'playwright-core').chromium; }
catch(e){ console.log('playwright-core not installed; skipping.'); process.exit(0); }

const OUT=path.resolve(process.argv[2]||path.join(require('os').tmpdir(),'uireview'));
const ALL=['archon','aztec','bards-tale','choplifter','drol','galaga','lode-runner','law-of-the-west','tapped','wolfenstein'];
const GAMES=process.argv[3]?process.argv[3].split(','):ALL;
/* how each page goes full screen: its own button, or the shared chip */
const FULL={archon:'#full',aztec:'#fs',choplifter:'#fs',drol:'#fs','lode-runner':'#fs','law-of-the-west':'#full'};
const SCREENS=[
  {name:'phone up',viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2},
  {name:'phone side',viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:2},
  {name:'computer',viewport:{width:1366,height:768}}];
/* the joystick and the buttons under the thumbs: kept, whatever else goes */
const STICK='#stick,#joy,.stick,.dpad,.stickwrap,[data-pad],.pad,#bfwd';   /* The Bard's Tale walks with FORWARD */
const ACTION='#bf,.abtn,#pads .acts button,.acts button,#pad1 button,[data-act="a"],#bA,#ba,#bcast';

const MEASURE=({STICK,ACTION})=>{
  const vis=el=>{const r=el.getBoundingClientRect();if(r.width<2||r.height<2)return null;
    for(let e=el;e;e=e.parentElement){const s=getComputedStyle(e);
      if(s.display==='none'||s.visibility==='hidden'||+s.opacity<0.05)return null;}
    return r;};
  const W=innerWidth,H=innerHeight;
  const cv=[...document.querySelectorAll('canvas')].map(c=>({c,r:vis(c)})).filter(x=>x.r)
    .sort((a,b)=>b.r.width*b.r.height-a.r.width*a.r.height)[0];
  const pic=cv?cv.r:{left:0,top:0,right:0,bottom:0,width:0,height:0};
  const clip=r=>Math.max(0,Math.min(r.right,W)-Math.max(r.left,0))*Math.max(0,Math.min(r.bottom,H)-Math.max(r.top,0));
  const inPic=r=>r.left>=pic.left-1&&r.right<=pic.right+1&&r.top>=pic.top-1&&r.bottom<=pic.bottom+1;
  const stage=cv?cv.c.parentElement:null;
  const isPad=el=>!!el.closest(STICK+',#pads,.acts,#pad1,#pad2');
  const chrome=[];
  document.querySelectorAll('button,a,[role=button],select,input').forEach(el=>{
    const r=vis(el);if(!r||clip(r)<4)return;
    if(stage&&stage.contains(el))return;            /* menus on the picture belong to the game */
    if(isPad(el)&&!/sound|menu|pause|full|exit|fs/i.test(el.id+' '+el.textContent))return;
    chrome.push((el.id||el.textContent.trim().split(/\s+/).slice(0,2).join(' ')||el.tagName).slice(0,16));
  });
  /* the words round the picture */
  let words=0;const fonts=new Set(),sizes=new Set(),cols=new Set();
  const tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  for(let n=tw.nextNode();n;n=tw.nextNode()){
    const t=n.textContent.trim();if(!t)continue;
    const el=n.parentElement;if(!el)continue;const r=vis(el);if(!r||clip(r)<4)continue;
    if(stage&&stage.contains(el))continue;
    if(isPad(el))continue;
    const s=getComputedStyle(el);
    words+=t.split(/\s+/).length;
    fonts.add(s.fontFamily.split(',')[0].replace(/["']/g,'').trim());sizes.add(Math.round(parseFloat(s.fontSize)));
    cols.add(s.color);
  }
  document.querySelectorAll('button').forEach(el=>{const r=vis(el);if(!r||(stage&&stage.contains(el)))return;
    const b=getComputedStyle(el).backgroundColor;if(b&&b!=='rgba(0, 0, 0, 0)')cols.add(b);});
  /* the line not to cross: a stick or d-pad, and an action button, each a thumb */
  const touch=matchMedia('(any-pointer: coarse)').matches;
  /* there is one, a thumb wide, and none of them runs off the screen (4 px
     clear of the edge: flush against it, a phone's rounded corner cuts it) */
  const thumb=sel=>{const rs=[...document.querySelectorAll(sel)].map(vis).filter(Boolean);
    const whole=r=>r.left>=3.5&&r.top>=3.5&&r.right<=W-3.5&&r.bottom<=H-3.5;
    return rs.some(r=>r.width>=44&&r.height>=44&&whole(r))&&rs.every(whole);};
  return{picture:Math.round(100*clip(pic)/(W*H)),chrome:chrome.length,chromeList:chrome.slice(0,12),words,
    type:fonts.size+' / '+sizes.size,colours:cols.size,
    scroll:document.scrollingElement.scrollHeight>H+1,
    stick:touch?(thumb(STICK)&&thumb(ACTION)?'yes':'MISSING'):'n/a',
    full:!!document.fullscreenElement};
};

(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox','--disable-dev-shm-usage']});
  const rows=[];
  for(const g of GAMES){
    for(const s of SCREENS){
      for(const mode of ['page','game']){
        const c=await b.newContext(Object.assign({},s));
        const p=await c.newPage();
        await p.goto('file://'+path.join(ROOT,g,'index.html'));
        try{await p.evaluate(()=>localStorage.clear());await p.reload();}catch(e){}
        await p.waitForTimeout(900);
        if(mode==='game'){
          const sel=FULL[g]||'#rg-fs';
          try{await p.click(sel,{timeout:2500});}
          catch(e){await p.evaluate(q=>{const x=document.querySelector(q);if(x)x.click();},sel);}
          await p.waitForTimeout(700);
        }
        for(const state of ['title','playing']){
          if(state==='playing'){await p.keyboard.press('Enter');await p.waitForTimeout(1200);}
          const m=await p.evaluate(MEASURE,{STICK,ACTION});
          const file=`${g}-${s.name.replace(' ','-')}-${mode}-${state}.png`;
          await p.screenshot({path:path.join(OUT,file)});
          rows.push(Object.assign({game:g,screen:s.name,mode,state,file},m));
          console.log([g.padEnd(16),s.name.padEnd(11),mode.padEnd(5),state.padEnd(8),
            ('picture '+m.picture+'%').padEnd(13),('chrome '+m.chrome).padEnd(10),('words '+m.words).padEnd(10),
            ('type '+m.type).padEnd(11),('colours '+m.colours).padEnd(11),(m.scroll?'SCROLLS':'').padEnd(8),
            'stick '+m.stick].join(' '));
        }
        await c.close();
      }
    }
  }
  await b.close();
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(rows,null,1));
  const esc=t=>String(t).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const html='<!doctype html><meta charset="utf-8"><title>UI review</title><style>'+
    'body{background:#111;color:#ddd;font:13px ui-monospace,Menlo,monospace;margin:16px}'+
    'h2{margin:28px 0 8px;color:#ffd27f}.g{display:flex;flex-wrap:wrap;gap:12px}'+
    'figure{margin:0;background:#1c1c22;padding:8px;border-radius:8px;max-width:440px}'+
    'img{max-width:420px;max-height:420px;display:block}figcaption{margin-top:6px;line-height:1.5}'+
    '.bad{color:#ff6a6a}</style><h1>UI review</h1>'+
    GAMES.map(g=>'<h2>'+g+'</h2><div class="g">'+rows.filter(r=>r.game===g).map(r=>
      '<figure><img src="'+r.file+'" loading="lazy"><figcaption>'+esc(r.screen+' · '+r.mode+' · '+r.state)+'<br>'+
      'picture '+r.picture+'% · chrome '+r.chrome+' · words '+r.words+'<br>type '+r.type+' · colours '+r.colours+
      (r.scroll?' · <span class="bad">scrolls</span>':'')+
      ' · stick <span class="'+(r.stick==='MISSING'?'bad':'')+'">'+r.stick+'</span><br><small>'+
      esc(r.chromeList.join(', '))+'</small></figcaption></figure>').join('')+'</div>').join('');
  fs.writeFileSync(path.join(OUT,'index.html'),html);
  const missing=rows.filter(r=>r.stick==='MISSING');
  console.log('\ncontact sheet: '+path.join(OUT,'index.html'));
  if(missing.length){console.log('stick or action button missing or under thumb size on '+missing.length+' screen(s):');
    missing.forEach(r=>console.log('  '+r.game+' · '+r.screen+' · '+r.mode+' · '+r.state));}
  process.exit(missing.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
