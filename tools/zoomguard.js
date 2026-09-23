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

const GAMES=['archon','aztec','bards-tale','choplifter','drol','galaga',
  'lode-runner','law-of-the-west','tapped'];
const fail=[], note=[];
const ok=(c,m)=>{ if(!c)fail.push(m); };

(async()=>{
  const b=await chromium.launch({executablePath:CHROME,
    args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const g of GAMES){
    const file=path.join(ROOT,g,'index.html');
    if(!fs.existsSync(file)){fail.push(g+': no page');continue;}
    /* 320px is the narrowest phone still in use, and the width the pads did
     * not fit on. Checking at 390 only is how the overflow went unseen. */
    const c=await b.newContext({viewport:{width:320,height:640},deviceScaleFactor:2,
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
      // The guard steps aside for anything pressable, on the understanding
      // that a control is already exempt from double-tap zoom. That is only
      // true if the control says so itself: .menuitem said nothing, in every
      // game, so double-tapping a menu button zoomed the page.
      out.bare=[];
      document.querySelectorAll('button,[role=button],[data-cmd],a').forEach(el=>{
        const ta=getComputedStyle(el).touchAction;
        if(ta!=='none'&&ta!=='manipulation')
          out.bare.push((el.id||el.className||el.tagName)+'='+ta);
      });
      // The other half of the same report: a control held down raises iOS's
      // callout - magnifier, selection handles, the copy bubble, an image's
      // drag ghost - and while it is up the control has stopped answering.
      // There is no event to cancel, so this is CSS or nothing.
      // -webkit-touch-callout is the one property here Blink does not
      // implement at all: it is dropped at parse time, so it is absent from
      // getComputedStyle AND from the CSSOM, and asking either would fail on
      // a fixed page as loudly as on a broken one. So the rule is read out of
      // the guard's own stylesheet as text, and each control is asked whether
      // that selector matches it. Chromium can still answer that honestly.
      out.press=[];
      let calloutSel='';
      const gst=document.querySelector('style[data-nozoom="press"]');
      if(gst){
        const m=/([^{}]+)\{[^{}]*-webkit-touch-callout:\s*none/.exec(gst.textContent||'');
        if(m)calloutSel=m[1].trim();
      }
      document.querySelectorAll('button,[role=button],[data-cmd],a,label,.menuitem')
        .forEach(el=>{
          const s=getComputedStyle(el), miss=[];
          let covered=false;
          try{covered=!!calloutSel&&el.matches(calloutSel);}catch(e){}
          if(!covered)miss.push('callout');
          if(s.webkitUserSelect!=='none'&&s.userSelect!=='none')miss.push('select');
          if(s.webkitUserDrag!=='none')miss.push('drag');
          if(miss.length)out.press.push((el.id||el.className||el.tagName)+':'+miss.join('+'));
        });
      // and the pads must not ask for a wider page than the phone has: a page
      // that scrolls sideways is a page whose buttons can be half off the
      // wrong edge while the thumb lands where they were drawn.
      const de=document.documentElement;
      out.over=de.scrollWidth-de.clientWidth;
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
      ' | un-zoom '+(r.rewrote?'yes':'NO')+
      ' | controls exempt '+(r.bare.length?'NO ('+r.bare.length+')':'yes')+
      ' | long press '+(r.press.length?'OPEN ('+r.press.length+')':'guarded')+
      ' | sideways '+(r.over>0?'PANS '+r.over+'px':'no'));
    ok(!r.single,g+': a single tap is being swallowed, so nothing can be pressed');
    ok(r.second,g+': the second tap of a double tap goes through - this is the zoom');
    ok(r.mash!==true,g+': mashing a control loses every second press');
    ok(r.pinch,g+': two fingers down is not prevented');
    ok(r.gesture,g+": WebKit's own pinch gesture is not prevented");
    ok(r.hasUnzoom,g+': nothing can put the page back if it is zoomed already');
    ok(r.rewrote,g+': a zoomed page is not put back');
    ok(!r.bare.length,g+': pressable controls with no touch-action of their own, '+
      'which the guard steps aside for: '+r.bare.slice(0,4).join(' '));
    ok(!r.press.length,g+': controls a long press can take away from the player, '+
      'for want of callout/select/drag suppression: '+r.press.slice(0,4).join(' '));
    ok(r.over<=0,g+': the page scrolls sideways by '+r.over+'px, so the pads '+
      'can sit off the edge of the screen');
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
