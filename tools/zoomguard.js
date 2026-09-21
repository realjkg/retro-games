#!/usr/bin/env node
/* Does the zoom guard actually fire, in every game?
 *
 * This cannot prove the fix on iOS, and says so: the behaviour being defended
 * against is WebKit's, and there is no WebKit here. What it can prove is that
 * each page's own handlers are registered, are non-passive, and do call
 * preventDefault on exactly the events WebKit would zoom on - which is the
 * part that was missing. The rest needs a real device.
 *
 *   PW=/path/to/node_modules/playwright-core node tools/zoomguard.js
 */
'use strict';
const path=require('path'), fs=require('fs');
const ROOT=__dirname+'/..';
const CHROME=process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let chromium;
try{ chromium=require(process.env.PW?path.join(process.env.PW,'index.js'):'playwright-core').chromium; }
catch(e){ console.log('playwright-core not installed; skipping.'); process.exit(0); }

const GAMES=['archon','aztec','choplifter','drol','lode-runner','law-of-the-west'];
const fail=[], note=[];
const ok=(c,m)=>{ if(!c)fail.push(m); };

(async()=>{
  const b=await chromium.launch({executablePath:CHROME,
    args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const g of GAMES){
    const file=path.join(ROOT,g,'index.html');
    if(!fs.existsSync(file)){fail.push(g+': no page');continue;}
    const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,
      isMobile:true,hasTouch:true});
    const p=await c.newPage();
    await p.goto('file://'+file);
    await p.waitForTimeout(900);
    const r=await p.evaluate(()=>{
      const out={};
      const touch=t=>new Touch({identifier:1,target:document.body,clientX:100,clientY:100});
      const fire=(type,init)=>{
        const e=new TouchEvent(type,Object.assign({bubbles:true,cancelable:true},init));
        document.body.dispatchEvent(e);
        return e.defaultPrevented;
      };
      const one=[touch()];
      const fireOn=(el,type,init)=>{
        const e=new TouchEvent(type,Object.assign({bubbles:true,cancelable:true},init));
        el.dispatchEvent(e); return e.defaultPrevented;
      };
      // a single tap must go through, or nothing in the game can be pressed
      out.single=fire('touchend',{changedTouches:one,touches:[]});
      // the second tap of a double tap is what WebKit zooms on
      out.first=fire('touchend',{changedTouches:one,touches:[]});
      out.second=fire('touchend',{changedTouches:one,touches:[]});
      // but a control must survive being mashed: every game here has buttons
      // that listen for a click, and a prevented touchend makes no click
      const btn=document.querySelector('button,[data-cmd],[role=button]');
      if(btn){
        fireOn(btn,'touchend',{changedTouches:one,touches:[]});
        out.mash=fireOn(btn,'touchend',{changedTouches:one,touches:[]});
      } else out.mash=null;
      // two fingers down is a pinch wherever it lands
      out.pinch=fire('touchstart',{touches:[touch(),touch()],changedTouches:[touch()]});
      // and the pinch WebKit offers as a gesture
      const ge=new Event('gesturestart',{bubbles:true,cancelable:true});
      document.dispatchEvent(ge); out.gesture=ge.defaultPrevented;
      // a page that is zoomed already must be put back
      const meta=document.querySelector('meta[name="viewport"]');
      out.meta=!!meta;
      out.hasUnzoom=typeof window.__unzoom==='function';
      if(out.hasUnzoom&&meta&&window.visualViewport){
        const was=meta.getAttribute('content');
        try{Object.defineProperty(window.visualViewport,'scale',
          {value:2.4,configurable:true});}catch(e){}
        window.__unzoom();
        out.rewrote=meta.getAttribute('content')!==was;
      }
      return out;
    });
    note.push(g.padEnd(16)+
      'single tap '+(r.single?'BLOCKED':'through')+
      ' | double tap '+(r.second?'blocked':'THROUGH')+
      ' | mash on a button '+(r.mash===null?'n/a':r.mash?'SWALLOWED':'through')+
      ' | pinch '+(r.pinch?'blocked':'THROUGH')+
      ' | gesture '+(r.gesture?'blocked':'THROUGH')+
      ' | un-zoom '+(r.rewrote?'yes':'NO'));
    ok(!r.single,g+': a single tap is being swallowed, so nothing can be pressed');
    ok(r.second,g+': the second tap of a double tap goes through - this is the zoom');
    ok(r.mash!==true,g+': mashing a control loses every second press');
    ok(r.pinch,g+': two fingers down is not prevented');
    ok(r.gesture,g+": WebKit's own pinch gesture is not prevented");
    ok(r.hasUnzoom,g+': nothing can put the page back if it is zoomed already');
    ok(r.rewrote,g+': a zoomed page is not put back');
    await c.close();
  }
  await b.close();
  console.log('\n--- the zoom guard, game by game ---');
  for(const n of note)console.log('  '+n);
  console.log('\nNOTE: this is Chromium. The behaviour being defended against is');
  console.log('WebKit’s, and there is no WebKit here - what is proved is that each');
  console.log('page’s own handlers fire and prevent the right events, not that iOS');
  console.log('Safari then behaves. That needs a real device.');
  console.log('\n--- '+(fail.length?fail.length+' FAILURES':'all clear')+' ---');
  for(const f of fail)console.log('  FAIL  '+f);
  process.exit(fail.length?1:0);
})().catch(e=>{console.error('zoom guard harness error:',e);process.exit(2);});
