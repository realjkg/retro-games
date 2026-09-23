#!/usr/bin/env node
/* What the screen actually does, scene by scene, in a real browser.
 *
 * The tests under tests/ read the game's own numbers. This reads the canvas,
 * and asks the questions the repository asks of every figure in every scene:
 *
 *   walks in   did the customer come in through the door on his own feet
 *   strides    is the walk a drawn cycle, or one pose slid along
 *   alive      is a tenth of a second later a different picture
 *   answers    does the scene answer what a player presses at it
 *   walks off  does he leave the way he came, without a jump
 *   whole      is the figure on the screen the figure in the sprite: nothing
 *              drawn across his middle, nothing missing
 *
 *   PW=$PWD/../node_modules/playwright-core node tools/playtest.js
 *   PW=... node tools/playtest.js --break=slide     prove the checks can fail
 *
 * It prints one row per scene. Read the rows, not the summary line.
 */
'use strict';
const path=require('path'),fs=require('fs');
const pw=require(process.env.PW||'playwright-core');

/* Each scene: how to get there, and which customer (by lane) to watch. */
const SCENES=[
  ['title demo', `showSplash();sim(3)`],
  ['saloon',     `play(1);walker(0)`],
  ['ball park',  `play(2);walker(1)`],
  ['punk club',  `play(3);walker(2)`],
  ['space bar',  `play(4);walker(3)`],
  ['pouring',    `play(1);G.bt.x=TAP_X;keys.fire=true;sim(0.2)`],
  ['served',     `play(1);follow(0);G.cust[0].x=30;G.cust[0].t=1e9;serveNow();sim(0.3)`],
  ['drinking',   `play(1);follow(2);G.cust[0].x=120;G.cust[0].t=1e9;G.bt.lane=2;serveNow();sim(1.3)`],
  ['empty back', `play(1);G.mugs.push({lane:1,x:120,v:40,full:false});G.bt.lane=1;sim(0.3)`],
  ['showtime',   `play(1);walker(1);G.showT=5;sim(0.3)`],
  ['losing one', `play(1);G.mugs.push({lane:2,x:20,v:118,full:true});sim(0.3)`],
  ['level card', `play(1);startLevel(2);G.state='card';G.cardT=5;showCard('LEVEL 2','');sim(1)`],
  ['the shake',  `play(1);startBonus();sim(2.4)`],
  ['shuffle',    `play(1);startBonus();while(G.bonus.phase!=='shuffle')sim(0.05);sim(0.1)`],
  ['the pick',   `play(1);startBonus();while(G.bonus.phase!=='pick')sim(0.05);sim(0.1)`],
  ['initials',   `play(1);G.score=5000;G.table=[];G.lives=1;G.mugs.push({lane:0,x:20,v:118,full:true});sim(2.4)`],
  ['resumed',    `play(1);follow(1);G.cust[0].x=60;sim(1);togglePause();const s=localStorage.getItem('tapped.save');
                  newGame();localStorage.setItem('tapped.save',s);resumeGame();togglePause();sim(0.1)`],
];

/* The broken builds, for proving a check is a check. Each is a patch that
 * reproduces a defect this collection has actually shipped. */
const BREAKS={
  /* one pose, translated: the walk nobody had looked at */
  slide:`custSprite=function(p){return figure(p.kind,p.shirt,p.kind,'stand','stand',false);};`,
  /* appear at the post instead of walking in */
  appear:`const _s=spawn;spawn=function(l){_s(l);G.cust[G.cust.length-1].x=90;};`,
  /* a keyline across the middle: parts outlined separately */
  keyline:`const _d=drawCust;drawCust=function(p){_d(p);rect(p.x,laneTop(p.lane)+12,14,1,KEY);};`,
  /* a frozen picture */
  still:`render=function(){};`,
  /* the jump backwards on the way out */
  jump:`const _c=custStep;custStep=function(p,dt){const r=_c(p,dt);if(p.st==='slide'&&p.x<60&&!p.j){p.j=1;p.x-=40;}return r;};`
};
const BREAK=(process.argv.find(a=>a.startsWith('--break='))||'').slice(8);

const PRELUDE=`
window.sim=function(t){const dt=1/60;for(let i=0;i<Math.round(t/dt);i++)stepGame(dt);render();};
window.play=function(L){newGame();if(L>1)startLevel(L);hideOverlay();G.state='play';G.spawnT=1e9;};
/* a customer comes in through lane l's door, and the tool follows him */
window.walker=function(l){spawn(l);window.W0=G.cust[G.cust.length-1];window.EXPECT_IN=true;};
/* ...or one who is already in, doing something else */
window.follow=function(l){spawn(l);window.W0=G.cust[G.cust.length-1];};
window.serveNow=function(){G.bt.x=TAP_X;G.bt.lane=window.W0?W0.lane:G.bt.lane;G.bt.fill=1;G.bt.holding=true;keys.fire=false;sim(1/60);};
window.px=function(x,y,w,h){return document.getElementById('c').getContext('2d').getImageData(x,y,w,h).data;};
window.diff=function(a,b){let n=0;for(let i=0;i<a.length;i+=4)
  if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>40)n++;return n;};
/* how much of the sprite shows on the canvas where it was drawn */
window.wholeness=function(img,x,y){
  const c=document.createElement('canvas');c.width=img.width;c.height=img.height;
  const g2=c.getContext('2d');g2.drawImage(img,0,0);
  const s=g2.getImageData(0,0,img.width,img.height).data;
  const x0=Math.round(x),y0=Math.round(y);
  const d=px(x0,y0,img.width,img.height);
  let want=0,got=0;
  for(let j=0;j<img.height;j++)for(let i=0;i<img.width;i++){
    if(x0+i<0||x0+i>=256)continue;
    const k=(j*img.width+i)*4;if(s[k+3]<200)continue;want++;
    if(Math.abs(s[k]-d[k])+Math.abs(s[k+1]-d[k+1])+Math.abs(s[k+2]-d[k+2])<24)got++;}
  return want?got/want:1;
};
`;

function row(name,cells){
  const pad=(s,n)=>String(s)+' '.repeat(Math.max(0,n-String(s).length));
  return pad(name,12)+cells.map(c=>pad(c.ok?' yes':' NO ',5)+pad(c.note||'',8)).join('|');
}

(async()=>{
  const CAND=[process.env.CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
  const exe=CAND.find(p=>{try{return fs.existsSync(p);}catch(e){return false;}});
  const b=await pw.chromium.launch(exe?{executablePath:exe}:{});
  const pg=await b.newPage({viewport:{width:520,height:820}});
  const errs=[];
  pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto('file://'+path.join(__dirname,'..','index.html'));
  await pg.addScriptTag({content:PRELUDE});
  if(BREAK){
    if(!BREAKS[BREAK]){console.error('no such break: '+BREAK+' ('+Object.keys(BREAKS).join(', ')+')');process.exit(2);}
    await pg.addScriptTag({content:BREAKS[BREAK]});
    console.log('** running against a deliberately broken build: '+BREAK+' **');
  }

  console.log('scene       walks in     |strides      |alive        |answers      |walks off    |whole');
  console.log('-'.repeat(96));
  let bad=0;
  for(const [name,setup] of SCENES){
    const res=await pg.evaluate(({setup})=>{
      window.W0=null;window.EXPECT_IN=false;
      try{localStorage.removeItem('tapped.save');}catch(e){}
      (0,eval)('(function(){'+setup+'})()');
      const out={};
      /* alive: a tenth of a second later, a different picture? */
      const a=px(0,0,256,248);sim(0.1);out.alive=diff(a,px(0,0,256,248));
      const p=window.W0&&G.cust.indexOf(W0)>=0?W0:null;
      /* walks in: from off the screen, visible in the doorway on the way */
      if(p&&p.st!=='slide'&&p.x<-8){
        const x0=p.x;let seenDoor=false,t=0;p.st='walk';p.t=1e9;
        while(p.x<30&&t<8){sim(0.1);t+=0.1;if(p.x>-8&&p.x<14&&wholeness(custSprite(p),p.x,laneTop(p.lane))>0.5)seenDoor=true;}
        out.walkIn={from:Math.round(x0),to:Math.round(p.x),door:seenDoor};
      }else if(window.EXPECT_IN)out.walkIn={from:p?Math.round(p.x):NaN,to:NaN,door:false};
      /* strides: follow him with a window that moves with him; a slid pose is
         the same picture in every window */
      if(p&&(p.st==='walk'||p.st==='wait')&&!G.mugs.some(m=>m.full&&m.lane===p.lane)){
        p.st='walk';p.t=1e9;
        /* Only his own pixels count. The window moves with him, so the
           wallpaper behind changes as he walks, and a first version of this
           check counted that and passed a pose that was only slid along. The
           mask is what changes when he is taken out of the picture. */
        const seen=new Set();const x0=p.x;
        for(let i=0;i<30;i++){
          sim(1/15);
          const X=Math.round(p.x),Y=laneTop(p.lane);
          const cur=px(X,Y,14,26);
          const i0=G.cust.indexOf(p);G.cust.splice(i0,1);render();
          const bg=px(X,Y,14,26);G.cust.splice(i0,0,p);render();
          let h=0;
          for(let k=0;k<cur.length;k+=4){
            const his=Math.abs(cur[k]-bg[k])+Math.abs(cur[k+1]-bg[k+1])+Math.abs(cur[k+2]-bg[k+2])>0;
            h=(h*31+(his?cur[k]*7+cur[k+1]*3+cur[k+2]+1:0))>>>0;
          }
          seen.add(h);
        }
        out.stride={moved:Math.round(p.x-x0),pictures:seen.size};
        /* whole: every pixel of his sprite is on the screen where it was drawn */
        p.st='wait';
        const save={m:G.mugs,t:G.tips,s:G.showT};G.mugs=[];G.tips=[];G.showT=0;render();
        out.whole=Math.round(wholeness(custSprite(p),p.x,laneTop(p.lane))*100);
        G.mugs=save.m;G.tips=save.t;G.showT=save.s;render();
        /* walks off: serve him from right in front and watch him go out */
        if(G.state==='play'){
          p.x=Math.min(p.x,40);G.bt.lane=p.lane;G.bt.x=TAP_X;G.bt.fill=1;G.bt.holding=true;keys.fire=false;
          let jump=0,last=p.x,gone=false;
          for(let i=0;i<300;i++){sim(1/60);if(G.cust.indexOf(p)<0){gone=true;break;}
            jump=Math.max(jump,Math.abs(p.x-last));last=p.x;}
          out.off={gone,jump:Math.round(jump*10)/10,exit:Math.round(last)};
        }
      }
      /* answers: press something and see the picture change */
      const before=px(0,0,256,248);
      if(G.state==='play'){
        keys.fire=false;sim(1/60);
        const l=G.bt.lane;laneMove(1);sim(0.05);keys.left=true;sim(0.2);keys.left=false;sim(0.05);
        out.answers=G.bt.lane!==l&&G.bt.x<TAP_X?diff(before,px(0,0,256,248)):0;
      }else if(G.state==='bonus'&&G.bonus.phase==='pick'){
        const c=G.bonus.cur;press('left',true);press('left',false);sim(0.3);
        out.answers=G.bonus.cur!==c?diff(before,px(0,0,256,248)):0;
      }else if(G.state==='initials'){
        const n=iniName();press('up',true);
        out.answers=iniName()!==n?1:0;out.answersNote='letter';
      }else if(G.state==='splash'){
        const s=menuSel;press('down',true);out.answers=menuSel!==s?1:0;out.answersNote='menu';
      }else out.answers=null;
      keys.fire=false;
      return Object.assign(out,{state:G.state});
    },{setup});

    const cells=[];
    const w=res.walkIn;
    cells.push(w?{ok:w.from<0&&w.to>w.from&&w.door,note:w.from+'→'+w.to+(w.door?'':' hid')}:{ok:true,note:'n/a'});
    const s=res.stride;
    /* four frames of legs against two of the arms: a drawn walk shows at least
     four pictures in two seconds, one pose slid along shows one */
  cells.push(s?{ok:s.moved>6&&s.pictures>=4,note:s.pictures+' pics'}:{ok:true,note:'n/a'});
    cells.push({ok:res.alive>6,note:res.alive+'px'});
    cells.push(res.answers===null?{ok:true,note:'n/a'}:{ok:res.answers>0,note:res.answersNote||(res.answers+'px')});
    const o=res.off;
    cells.push(o?{ok:o.gone&&o.jump<3&&o.exit<0,note:o.gone?'door '+o.jump:'stayed'}:{ok:true,note:'n/a'});
    cells.push(res.whole===undefined?{ok:true,note:'n/a'}:{ok:res.whole>=99,note:res.whole+'%'});
    if(cells.some(c=>!c.ok))bad++;
    console.log(row(name,cells));
  }
  console.log('-'.repeat(96));
  if(errs.length){console.log('page errors:');errs.forEach(e=>console.log('  '+e));bad+=errs.length;}
  console.log(bad?bad+' scene(s) to look at':'every scene walked, strode, lived, answered and stayed whole');
  await b.close();
  process.exit(bad?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
