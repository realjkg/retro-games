#!/usr/bin/env node
/* What the screen actually does, scene by scene, in a real browser.
 *
 * The tests under tests/ read the game's own numbers. This reads the canvas,
 * and asks the questions the repository asks of every figure in every scene:
 *
 *   walks in   did the figure come in through an opening on his own feet,
 *              from off the screen, or did he appear
 *   strides    is the walk a drawn cycle, or one pose slid along
 *   alive      within a second, is the figure a different picture
 *   answers    does the scene answer what a player presses at it
 *   walks off  does he leave through the opening, without a jump
 *   whole      is the figure on the screen the figure in the sprite: nothing
 *              drawn across him, nothing missing
 *
 *   PW=$PWD/../node_modules/playwright-core node tools/playtest.js
 *   PW=... node tools/playtest.js --break=slide     prove the checks can fail
 *
 * It prints one row per scene. Read the rows, not the summary line.
 */
'use strict';
const path=require('path'),fs=require('fs');
const pw=require(process.env.PW||'playwright-core');

/* Each scene: how to get there, who to watch, and what he should do.
 *   watch(x)   the figure the columns are about: G.P, or a guard
 *   IN         he is expected to walk in       OFF   ...and to walk off
 *   STRIDE     he is expected to walk (so strides applies) */
const SCENES=[
  ['title demo',  `showSplash();sim(2);watch(room().guards.find(live)||G.P);STRIDE=true`],
  ['the cell',    `play();watch(G.P);STRIDE=true;OFF=true`],
  ['next room',   `play();fromNext();watch(G.P);IN=true;STRIDE=true;OFF=true`],
  ['on patrol',   `play();visit(busiest());const g=regular();rounds(g);
                   G.P.uniform=true;watch(g);STRIDE=true`],
  ['halt!',       `play();bare(40,92);const g=put('guard',200,92);alarm(g);G.impenetrable=true;G.P.dir=2;
                   watch(g);STRIDE=true`],
  ['hands up',    `play();bare(60,92);const g=put('guard',150,92);g.st='hup';g.hupT=1e9;G.P.dir=0;watch(g)`],
  ['ss walks in', `play();bare(200,50);G.impenetrable=true;const g=put('ss',-6,92);g.st='enter';g.dir=0;g.face=1;
                   watch(g);IN=true;STRIDE=true`],
  ['the alarm',   `play();G.impenetrable=true;bare(140,120);raiseHunt();G.hunt.t=0.01;sim(1/60);
                   stepPursuers(0.01);const g=room().guards.find(g=>g.st==='enter');watch(g);IN=true;STRIDE=true`],
  ['squad in',    `play();G.impenetrable=true;bare(140,120);raiseHunt();G.hunt.t=0.01;sim(0.5);
                   const g=room().guards.filter(g=>g.st==='enter')[1]||room().guards[1];watch(g);IN=true;STRIDE=true`],
  ['frozen round',`play();G.impenetrable=true;bare(100,92);G.P.uniform=true;G.P.holstered=true;
                   const w=put('guard',200,60);w.st='patrol';w.dir=4;w.t=1e9;put('ss',130,92);sim(1.6);watch(w)`],
  ['questioned',  `play();G.impenetrable=true;bare(100,92);G.P.uniform=true;G.P.holstered=true;
                   const g=put('ss',130,92);put('ss',150,74);sim(1.6);watch(g)`],
  ['answered',    `play();G.impenetrable=true;bare(100,92);G.P.uniform=true;G.P.holstered=true;G.P.papers=true;
                   const g=put('ss',130,92);sim(1.6);let n=0;
                   while(G.state==='question'&&n++<6)answer(G.q.cur.a.findIndex(o=>o[2]==='good'||o[2]==='holster'));
                   sim(0.1);watch(G.P);STRIDE=true`],
  ['holstered',   `play();G.impenetrable=true;bare(60,92);G.P.holstered=true;watch(G.P);STRIDE=true;OFF=true`],
  ['picking',     `play();bare(108,98);room().chests.push({tx:12,ty:9,strong:false,state:'locked',item:{k:'vest'}});
                   search();sim(0.3);watch(G.P)`],
  ['grenade',     `play();bare(60,92);G.P.dir=0;throwNade();sim(0.2);watch(G.P)`],
  ['uniform',     `play();visit(busiest());G.P.uniform=true;G.impenetrable=true;watch(G.P);STRIDE=true`],
  ['impenetrable',`play();G.impenetrable=true;bare(60,92);const g=put('ss',150,92);alarm(g);g.fireT=0;
                   G.P.dir=2;sim(0.9);watch(G.P);STRIDE=true`],
  ['shot',        `play();G.impenetrable=false;bare(60,92);const g=put('guard',150,92);alarm(g);g.fireT=0;
                   G.P.dir=2;sim(0.5);watch(null)`],
  ['the way out', `play();visit(G.castle.exitRoom);toExit();watch(G.P);STRIDE=true;OFF=true`],
  ['castle 9',    `play(9);visit(busiest());G.P.uniform=true;G.P.holstered=true;G.impenetrable=true;
                   room().guards.forEach(o=>o.cleared=true);const g=regular();rounds(g);watch(g);STRIDE=true`],
  ['paused',      `play();sim(0.2);togglePause()`],
];

/* The broken builds, for proving a check is a check. Each patches in a defect
 * this collection has actually shipped. */
const BREAKS={
  /* one pose, translated: the walk nobody had looked at */
  slide:`const _p=playerSprite,_g=guardSprite;
    playerSprite=function(){const P=G.P;if(P.moving)return figure(P.uniform?'disguised':'player','H','stand',P.face<0);return _p();};
    guardSprite=function(g){if(g.st==='patrol'||g.st==='enter'||g.walking)return figure(g.kind,'H','stand',g.face<0);return _g(g);};`,
  /* the SS man put down inside the room instead of walking in */
  appear:`const _e=stepGuard;stepGuard=function(g,dt){if(g.st==='enter'&&g.x<10){g.x=40;}return _e(g,dt);};
    const _l=leave;leave=function(s){_l(s);if(G.P.x>W-12)G.P.x=W-60;else if(G.P.x<12)G.P.x=60;};`,
  /* a keyline across the middle: parts outlined separately */
  keyline:`const _d=drawFig;drawFig=function(img,x,y,f){_d(img,x,y,f);if(img.width<=11)rect(x-5,y-9,11,1,'#0b1a5c');};`,
  /* a frozen picture */
  still:`render=function(){};`,
  /* the jump on the way out */
  jump:`const _s=stepGame;stepGame=function(dt){_s(dt);if(G.state==='escaping'&&!G.j&&G.escT>0.3){G.j=1;G.P.x+=SIDES[G.escSide][0]*30;G.P.y+=SIDES[G.escSide][1]*30;}};
    const _v=leave;leave=function(s){_v(s);if(!G.j2){G.j2=1;G.P.x+=40;}};`
};
const BREAK=(process.argv.find(a=>a.startsWith('--break='))||'').slice(8);

const PRELUDE=`
window.sim=function(t){const dt=1/60;for(let i=0;i<Math.round(t/dt);i++)stepGame(dt);render();};
window.play=function(d){newGame(11);if(d>1)startCastle(d);hideOverlay();G.state='play';G.impenetrable=false;
  for(const k in keys)keys[k]=false;};
window.visit=function(i){enterRoom(i);const s=place(room(),1,6)[0]||[17,9];G.P.x=s[0]*8+4;G.P.y=(s[1]+2)*8;};
window.busiest=function(){let b=0;G.castle.rooms.forEach((r,i)=>{if(r.guards.filter(live).length>G.castle.rooms[b].guards.filter(live).length)b=i;});return b;};
window.bare=function(x,y){const rm=room();rm.guards=[];rm.chests=[];rm.g=rm.g.map(t=>t===INNER||t===RUBBLE?FLOOR:t);
  G.P.x=x;G.P.y=y;G.P.dir=0;G.P.face=1;};
window.put=function(k,x,y){const g=mkGuard(k,x,y);g.st='stand';g.t=1e9;g.face=-1;room().guards.push(g);return g;};
/* stand him in the room west of one with an east opening, a step from it */
window.fromNext=function(){const C=G.castle;const i=C.rooms.findIndex(r=>r.doors.e);enterRoom(i);
  room().guards=[];G.P.x=W-8;G.P.y=92;G.P.dir=0;G.P.face=1;window.ENTER_DIR='e';};
/* ...or a few steps from the way out */
window.toExit=function(){const s=G.castle.exitSide;room().guards=[];room().chests=[];
  room().g=room().g.map(t=>t===INNER||t===RUBBLE?FLOOR:t);
  if(s==='w'){G.P.x=40;G.P.y=92;}else if(s==='e'){G.P.x=W-40;G.P.y=92;}
  else if(s==='n'){G.P.x=140;G.P.y=40;}else{G.P.x=140;G.P.y=H-24;}window.EXIT_DIR=s;};
window.watch=function(f){window.W0=f;};
/* a guard, not an SS man, who will let a uniform walk by */
window.regular=function(){return room().guards.find(g=>live(g)&&g.kind==='guard')||
  (()=>{const s=place(room(),1,4)[0]||[17,9];const g=mkGuard('guard',s[0]*8+4,(s[1]+2)*8);room().guards.push(g);return g;})();};
/* send a guard on his rounds, the way that has the most floor in front of him */
window.rounds=function(g){let best=0,far=-1;
  for(let d=0;d<8;d++){const[ux,uy]=unit(d);let n=0;while(n<80&&boxFree(room(),g.x+ux*n,g.y+uy*n,true))n+=2;
    if(n>far){far=n;best=d;}}
  g.st='patrol';g.dir=best;g.t=1e9;};
window.px=function(x,y,w,h){return document.getElementById('c').getContext('2d').getImageData(x,y,w,h).data;};
window.diff=function(a,b){let n=0;for(let i=0;i<a.length;i+=4)
  if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>40)n++;return n;};
window.spriteOf=function(f){return f===G.P?playerSprite():guardSprite(f);};
window.origin=function(f,img){const flip=f.face<0;return[Math.round(f.x-(img.width>11?8:flip?6:5)),Math.round(f.y-16)];};
/* take him out of the picture, and put him back */
window.without=function(f,fn){
  if(f===G.P){const s=G.state,e=G.escT;G.state='escaping';G.escT=9;render();const r=fn();G.state=s;G.escT=e;render();return r;}
  const a=room().guards,i=a.indexOf(f);a.splice(i,1);render();const r=fn();a.splice(i,0,f);render();return r;};
/* how much of his sprite shows on the canvas where it was drawn */
window.wholeness=function(f){
  const img=spriteOf(f),[x0,y0]=origin(f,img);
  const c=document.createElement('canvas');c.width=img.width;c.height=img.height;
  const g2=c.getContext('2d');g2.drawImage(img,0,0);
  const s=g2.getImageData(0,0,img.width,img.height).data;
  const d=px(x0,y0,img.width,img.height);
  let want=0,got=0;
  for(let j=0;j<img.height;j++)for(let i=0;i<img.width;i++){
    if(x0+i<0||x0+i>=W||y0+j<0||y0+j>=H)continue;
    const k=(j*img.width+i)*4;if(s[k+3]<200)continue;want++;
    if(Math.abs(s[k]-d[k])+Math.abs(s[k+1]-d[k+1])+Math.abs(s[k+2]-d[k+2])<24)got++;}
  return want?got/want:1;
};
/* his own pixels in a window that moves with him: the difference between the
   picture with him and the picture without. The wall behind him does not count. */
window.himself=function(f){
  const X=Math.round(f.x)-9,Y=Math.round(f.y)-18,w=18,h=20;
  const cur=px(X,Y,w,h),bg=without(f,()=>px(X,Y,w,h));
  let hsh=0,n=0;
  for(let k=0;k<cur.length;k+=4){
    const his=Math.abs(cur[k]-bg[k])+Math.abs(cur[k+1]-bg[k+1])+Math.abs(cur[k+2]-bg[k+2])>0;
    if(his)n++;
    hsh=(hsh*31+(his?cur[k]*7+cur[k+1]*3+cur[k+2]+1:0))>>>0;
  }
  return{hsh,n,cur,bg};
};
`;

function row(name,cells){
  const pad=(s,n)=>String(s)+' '.repeat(Math.max(0,n-String(s).length));
  return pad(name,13)+cells.map(c=>pad(c.ok?' yes':' NO ',5)+pad(c.note||'',9)).join('|');
}

(async()=>{
  const CAND=[process.env.CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
  const exe=CAND.find(p=>{try{return fs.existsSync(p);}catch(e){return false;}});
  const b=await pw.chromium.launch(exe?{executablePath:exe}:{});
  const pg=await b.newPage({viewport:{width:560,height:820}});
  const errs=[];
  pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto('file://'+path.join(__dirname,'..','index.html'));
  await pg.addScriptTag({content:PRELUDE});
  if(BREAK){
    if(!BREAKS[BREAK]){console.error('no such break: '+BREAK+' ('+Object.keys(BREAKS).join(', ')+')');process.exit(2);}
    await pg.addScriptTag({content:BREAKS[BREAK]});
    console.log('** running against a deliberately broken build: '+BREAK+' **');
  }

  console.log('scene        walks in      |strides       |alive         |answers       |walks off     |whole');
  console.log('-'.repeat(100));
  let bad=0;
  for(const [name,setup] of SCENES){
    const res=await pg.evaluate(({setup})=>{
      window.W0=null;window.IN=window.OFF=window.STRIDE=false;window.ENTER_DIR=window.EXIT_DIR=null;
      G.j=G.j2=0;
      (0,eval)('(function(){'+setup+'})()');
      render();
      const out={},f=window.W0;
      const here=()=>f&&(f===G.P||room().guards.indexOf(f)>=0);
      /* walks in: the SS man from outside the opening, or the prisoner into the next room */
      if(f&&IN){
        const r0=G.cur;
        if(ENTER_DIR){keys.right=true;}
        const from=Math.round(f===G.P?f.x:f.x);
        let seenEdge=false,arrived=false,crossed=f!==G.P,t=0,jump=0,lastX=null;
        while(t<4&&!arrived){
          sim(1/20);t+=1/20;
          if(f===G.P&&G.cur!==r0)crossed=true;
          if(!crossed)continue;
          const x=f.x;if(lastX!==null)jump=Math.max(jump,Math.abs(x-lastX));lastX=x;
          const img=spriteOf(f),[ox]=origin(f,img);
          if((ox<0||ox+img.width>W)&&wholeness(f)>0.3)seenEdge=true;
          if(f.x>14&&f.x<W-14)arrived=true;
        }
        keys.right=false;
        out.walkIn={from:f===G.P?from-W:from,edge:seenEdge,arrived,jump:Math.round(jump*10)/10,crossed};
      }
      /* strides: follow him with a window that moves with him and count the
         different pictures of him alone. A slid pose is one picture. */
      if(f&&STRIDE&&here()){
        let x0=f.x,y0=f.y,moved=0;const seen=new Set();
        const drive=f===G.P;
        if(drive){keys.right=G.P.x<W/2;keys.left=!keys.right;keys.down=true;}
        for(let i=0;i<30;i++){
          sim(1/15);
          if(!here())break;
          moved=Math.max(moved,Math.hypot(f.x-x0,f.y-y0));
          const walking=f===G.P?f.moving:(f.st==='patrol'||f.st==='enter'||f.walking);
          if(walking)seen.add(himself(f).hsh);
        }
        keys.right=keys.left=keys.down=false;
        sim(1/60);
        out.stride={moved:Math.round(moved),pictures:seen.size};
      }
      /* alive: a second later, a different picture of him (or of the scene) */
      if(f&&here()){
        keys.right=keys.left=keys.down=keys.up=false;
        const key=()=>{const s=spriteOf(f);return Object.keys(SPR).find(k=>SPR[k]===s)+'@'+Math.round(f.x)+','+Math.round(f.y);};
        /* four looks across the second, so a walker whose legs happen to come
           round to the same frame on the second is not called a statue */
        out.keys=[key()];const a=himself(f).cur;let most=0;
        for(let q=0;q<4;q++){sim(0.25);if(!here())break;most=Math.max(most,diff(a,himself(f).cur));}
        out.keys.push(key());
        out.alive=most;
        out.aliveWhat='him';
      }else if(G.state==='paused'){out.alive=null;}   /* paused is meant to hold still */
      else{const a=px(0,0,W,H);sim(1);out.alive=diff(a,px(0,0,W,H));out.aliveWhat='scene';}
      /* whole: every pixel of his sprite on the screen where it was drawn */
      if(f&&here()&&G.state!=='escaping'){
        const sv={s:G.shots,n:G.nades,b:G.booms,k:G.sparks,m:G.msg};
        G.shots=[];G.nades=[];G.booms=[];G.sparks=[];G.msg=null;
        const says=room().guards.map(g=>g.say);room().guards.forEach(g=>g.say=null);
        const busy=G.P.busy;G.P.busy=null;
        render();out.whole=Math.round(wholeness(f)*100);
        G.shots=sv.s;G.nades=sv.n;G.booms=sv.b;G.sparks=sv.k;G.msg=sv.m;G.P.busy=busy;
        room().guards.forEach((g,i)=>g.say=says[i]);render();
      }
      /* walks off: the prisoner out through the opening he is next to */
      if(f===G.P&&OFF&&G.state==='play'){
        const dir=EXIT_DIR||'e';
        if(EXIT_DIR)toExit();
        if(!EXIT_DIR){G.P.x=W-24;G.P.y=92;const rm=room();rm.guards=[];rm.chests=[];
          rm.g=rm.g.map(t=>t===INNER||t===RUBBLE?FLOOR:t);
          if(!rm.doors.e){const C=G.castle;const i=C.rooms.findIndex(r=>r.doors.e);enterRoom(i);room().guards=[];
            room().chests=[];room().g=room().g.map(t=>t===INNER||t===RUBBLE?FLOOR:t);}}
        const k={e:'right',w:'left',n:'up',s:'down'}[dir];
        keys[k]=true;const r0=G.cur;
        let jump=0,last=[f.x,f.y],gone=false,t=0,lastImg=null;
        while(t<4){sim(1/30);t+=1/30;
          const dx=f.x-last[0],dy=f.y-last[1];
          const leftRoom=G.cur!==r0||G.state!=='play';
          /* the step across into the next room is a change of screen, not a jump */
          if(!leftRoom||G.state==='escaping')jump=Math.max(jump,Math.hypot(dx,dy));
          last=[f.x,f.y];
          if(leftRoom){gone=true;if(G.state!=='escaping'||G.escT>=1.1)break;}
        }
        keys[k]=false;
        out.off={gone,jump:Math.round(jump*10)/10,how:G.state==='card'?'out':G.cur!==r0?'next':'stayed'};
      }
      /* answers: press something and see the picture change */
      const before=px(0,0,W,H);
      if(G.state==='play'){
        press('fire',true);press('fire',false);sim(0.05);press('left',true);sim(0.3);press('left',false);sim(0.05);
        out.answers=diff(before,px(0,0,W,H));
      }else if(menuItems.length&&ov.className.indexOf('hidden')<0){
        const s=menuSel;press('down',true);press('down',false);
        out.answers=menuSel!==s||menuItems.length===1?1:0;out.answersNote='menu';
      }else if(G.state==='dying'||G.state==='escaping'||G.state==='over'){out.answers=null;}
      else out.answers=null;
      for(const k in keys)keys[k]=false;
      return Object.assign(out,{state:G.state});
    },{setup});

    const cells=[];
    const w=res.walkIn;
    cells.push(w?{ok:w.crossed&&w.edge&&w.arrived&&w.jump<3,note:w.crossed?(w.edge?'from '+w.from:'appeared'):'never'}:{ok:true,note:'n/a'});
    const s=res.stride;
    /* four frames of legs: a drawn walk shows at least four pictures in two
       seconds, one pose slid along shows one or two */
    cells.push(s?{ok:s.moved>6&&s.pictures>=4,note:s.pictures+' pics'}:{ok:true,note:'n/a'});
    cells.push(res.alive===null?{ok:true,note:'paused'}:{ok:res.alive>2,note:res.alive+'px '+(res.aliveWhat==='him'?'him':'')});
    cells.push(res.answers===null||res.answers===undefined?{ok:true,note:'n/a'}:{ok:res.answers>0,note:res.answersNote||(res.answers+'px')});
    const o=res.off;
    cells.push(o?{ok:o.gone&&o.jump<3,note:o.gone?o.how+' '+o.jump:'stayed'}:{ok:true,note:'n/a'});
    cells.push(res.whole===undefined?{ok:true,note:'n/a'}:{ok:res.whole>=99,note:res.whole+'%'});
    if(cells.some(c=>!c.ok))bad++;
    console.log(row(name,cells));
    if(process.env.DEBUG&&res.keys)console.log('   ',res.keys.join(' -> '));
  }
  console.log('-'.repeat(100));
  if(errs.length){console.log('page errors:');errs.forEach(e=>console.log('  '+e));bad+=errs.length;}
  console.log(bad?bad+' scene(s) to look at':'every scene walked, strode, lived, answered and stayed whole');
  await b.close();
  process.exit(bad?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
