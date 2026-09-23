#!/usr/bin/env node
/* Where the controls are, on real phone sizes, both ways up, during play.
 *
 * Asks, for each screen:
 *   clear     no control lies over the playfield, and none over another
 *   on screen the playfield and every control are inside the window, with
 *             nothing to scroll to and nothing off the side
 *   shape     the playfield is drawn at its own shape, not squashed
 * and then, with fingers, on a phone each way up:
 *   taps      a double tap and a triple tap - on the playfield, the status
 *             bar, the space between, the stick, the buttons - zoom nothing:
 *             the page's guard eats the second and third tap anywhere that is
 *             not a control, every control is exempt by its touch-action, and
 *             a triple tap on FIRE is three shots
 *
 *   PW=... node tools/layout.js [out-dir-for-pictures]
 */
'use strict';
const path=require('path'),fs=require('fs');
const pw=require(process.env.PW||'playwright-core');
const URL='file://'+(process.env.PAGE||path.join(__dirname,'..','index.html'));
const OUT=process.argv[2]||null;
const SCREENS=[
  ['320x568 SE1',320,568],['375x667 SE',375,667],['390x844 14',390,844],
  ['412x915 Pixel',412,915],['430x932 Max',430,932],['768x1024 iPad',768,1024]];

const results=[];
const check=(ok,what,got)=>{results.push([ok,what,got===undefined?'':got]);};

(async()=>{
  const CAND=[process.env.CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium'].filter(Boolean);
  const exe=CAND.find(p=>{try{return fs.existsSync(p);}catch(e){return false;}});
  const b=await pw.chromium.launch(exe?{executablePath:exe}:{});
  const errs=[];
  const open=async(w,h)=>{
    const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:true,hasTouch:true,deviceScaleFactor:2});
    const pg=await ctx.newPage();pg.on('pageerror',e=>errs.push(e.message));
    await pg.goto(URL);await pg.waitForTimeout(300);
    await pg.evaluate(()=>{newGame(3);hideOverlay();G.state='play';G.impenetrable=true;});
    await pg.waitForTimeout(200);
    return{ctx,pg};
  };
  for(const [name,W0,H0] of SCREENS)for(const turn of [false,true]){
    const w=turn?H0:W0,h=turn?W0:H0,label=name+(turn?' landscape':' portrait');
    const {ctx,pg}=await open(w,h);
    const m=await pg.evaluate(()=>{
      const R=e=>{const r=e.getBoundingClientRect();return{x:r.left,y:r.top,w:r.width,h:r.height,id:e.id||e.className};};
      const stage=R(document.getElementById('stage'));
      const ctl=[...document.querySelectorAll('#joy,#pads .btn,#status,#rg-launch')]
        .filter(e=>e.offsetParent!==null).map(R);
      return{stage,ctl,iw:innerWidth,ih:innerHeight,sw:document.documentElement.scrollWidth,
        sh:document.documentElement.scrollHeight};
    });
    const hit=(a,b)=>a.x<b.x+b.w-0.5&&a.x+a.w>b.x+0.5&&a.y<b.y+b.h-0.5&&a.y+a.h>b.y+0.5;
    const inside=r=>r.x>=-0.5&&r.y>=-0.5&&r.x+r.w<=m.iw+0.5&&r.y+r.h<=m.ih+0.5;
    const over=m.ctl.filter(c=>hit(c,m.stage)).map(c=>c.id);
    const clash=[];
    for(let i=0;i<m.ctl.length;i++)for(let j=i+1;j<m.ctl.length;j++){
      const a=m.ctl[i],c=m.ctl[j];
      /* the joystick box holds its own buttons */
      if(hit(a,c)&&!(a.id==='joy'||c.id==='joy'))clash.push(a.id+'/'+c.id);
    }
    const off=[m.stage].concat(m.ctl).filter(r=>!inside(r)).map(r=>r.id+'@'+Math.round(r.y+r.h));
    const shape=m.stage.w/m.stage.h;
    const row=[
      [over.length===0&&clash.length===0,'clear',over.concat(clash).join(' ')||'yes'],
      [off.length===0&&m.sw<=m.iw&&m.sh<=m.ih+0.5,'on screen',off.join(' ')||(m.sw>m.iw?'scrolls sideways':m.sh>m.ih+0.5?'scrolls '+(m.sh-m.ih):'yes')],
      [Math.abs(shape-280/168)<0.03,'shape',shape.toFixed(3)],
      [m.stage.w>=0.55*Math.min(m.iw,640)||turn,'big enough',Math.round(m.stage.w)+'x'+Math.round(m.stage.h)]];
    /* questioned: the whole card, the question, the clock and every answer,
       inside the playfield, with nothing to scroll to */
    const q=await pg.evaluate(()=>{
      if(typeof startQuestions!=='function')return null;
      const rm=room();rm.guards=[];G.P.uniform=true;G.P.holstered=false;
      const g=mkGuard('ss',G.P.x+20,G.P.y);g.st='stand';rm.guards.push(g);
      G.castle.d=5;startQuestions(g);
      const st=document.getElementById('stage').getBoundingClientRect(),ov=document.getElementById('overlay');
      const parts=[...ov.querySelectorAll('.qa,.qde,.qbar')].map(e=>e.getBoundingClientRect());
      const out=parts.filter(r=>r.top<st.top-0.5||r.bottom>st.bottom+0.5||r.left<st.left-0.5||r.right>st.right+0.5).length;
      return{out,n:parts.length,scroll:ov.scrollHeight-ov.clientHeight};
    });
    if(q)row.push([q.out===0&&q.scroll<=1&&q.n>=5,'questions fit',q.out?q.out+' of '+q.n+' parts outside':q.scroll>1?'scrolls '+q.scroll:'yes']);
    for(const [ok,what,got] of row)check(ok,label.padEnd(24)+what,got);
    if(OUT){fs.mkdirSync(OUT,{recursive:true});
      await pg.screenshot({path:path.join(OUT,label.replace(/\W+/g,'_')+'.png')});}
    await ctx.close();
  }

  /* the taps, with fingers */
  for(const [w,h,label] of [[390,844,'portrait'],[844,390,'landscape']]){
    const {ctx,pg}=await open(w,h);
    const cdp=await ctx.newCDPSession(pg);
    await pg.evaluate(()=>{window.__eaten=[];window.__taps=0;
      window.addEventListener('touchend',e=>{window.__taps++;window.__eaten.push(e.defaultPrevented);});});
    const tapN=async(x,y,n)=>{for(let i=0;i<n;i++){
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await pg.waitForTimeout(90);}};
    const centre=async sel=>{const bb=await pg.locator(sel).boundingBox();return[bb.x+bb.width/2,bb.y+bb.height/2];};
    const spots=[['the playfield','#stage'],['the status bar','#hud'],['the stick','#stick'],['FIRE','#bf'],
      ['button 0','#j0'],['SEARCH','#bs']];
    const gap=await pg.evaluate(()=>{const a=document.getElementById('stage').getBoundingClientRect(),
      b=document.getElementById('pads').getBoundingClientRect();
      return b.top-a.bottom>20?[innerWidth/2,(a.bottom+b.top)/2]:null;});
    if(gap)spots.push(['the space between',gap]);
    for(const [what,where] of spots){
      /* an older build may not have this control; skip it rather than stop */
      if(!Array.isArray(where)&&!(await pg.locator(where).count()))continue;
      const [x,y]=Array.isArray(where)?where:await centre(where);
      const kind=await pg.evaluate(([x,y])=>{const e=document.elementFromPoint(x,y);
        const t=e&&e.closest('button,a,[data-cmd],[role=button]');
        /* touch-action is not inherited but it does intersect down the tree:
           what counts is the tightest one between the finger and the page */
        let ta='auto';for(let n=e;n&&n.nodeType===1;n=n.parentElement){const v=getComputedStyle(n).touchAction;
          if(v==='none'){ta='none';break;}if(v==='manipulation')ta='manipulation';}
        return{press:!!t,ta};},[x,y]);
      const a0=await pg.evaluate('G.P.ammo');
      await pg.evaluate(()=>{__eaten=[];});
      await tapN(x,y,3);
      await pg.waitForTimeout(200);
      const r=await pg.evaluate(()=>({eaten:__eaten.slice(),scale:visualViewport.scale,sx:scrollX,sy:scrollY}));
      /* a control is exempt from double-tap zoom by its own touch-action (the
         guard steps aside for controls, so a mash is not eaten); anywhere else
         the guard itself must eat the second and the third tap, whatever the
         stylesheet says, because iOS has not always honoured the stylesheet */
      const guarded=kind.press?/none|manipulation/.test(kind.ta):(r.eaten[1]&&r.eaten[2]);
      check(guarded&&r.scale===1&&r.sx===0&&r.sy===0,
        (label+': triple tap on '+what).padEnd(40)+'no zoom',
        (kind.press?'control, ':'')+'touch-action '+kind.ta+', eaten '+r.eaten.map(v=>v?1:0).join('')+', scale '+r.scale);
      if(what==='FIRE'||what==='button 0'){
        const a1=await pg.evaluate('G.P.ammo');
        check(a0-a1===3,(label+': triple tap on '+what).padEnd(40)+'is three shots',a0+' → '+a1);
        await pg.evaluate('G.P.ammo=10;G.P.fireCool=0');
      }
    }
    await ctx.close();
  }

  for(const [ok,what,got] of results)console.log((ok?'  ok   ':'  FAIL ')+what+(got!==''?'  ('+got+')':''));
  if(errs.length){console.log('page errors:');errs.forEach(e=>console.log('  '+e));}
  const bad=results.filter(r=>!r[0]).length+errs.length;
  console.log(bad?bad+' failed':'all '+results.length+' held');
  await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
