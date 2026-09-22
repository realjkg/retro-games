#!/usr/bin/env node
/* What the screen actually does, scene by scene, in a real browser.
 *
 * The tests under tests/ read the game's own numbers. This reads the canvas.
 * Every question here is one that a state check cannot answer: is the picture
 * different a tenth of a second later, is the fighter whole, does the thing you
 * press change what you see.
 *
 *   PW=$PWD/../node_modules/playwright-core node tools/playtest.js
 *
 * It prints one row per scene. Read the rows.
 */
'use strict';
const path=require('path'),fs=require('fs');
const pw=require(process.env.PW||'playwright-core');

const SCENES=[
  ['title',      `showSplash();sim(2)`],
  ['entry 1',    `play();sim(1.5)`],
  ['entry 3',    `play();sim(5)`],
  ['formation',  `play();sim(22)`],
  ['dive',       `play();sim(22);G.diveT=0;sim(1.2)`],
  ['boss run',   `play();sim(22);G.ship.x=112;G.diveT=1e9;
                  launchCapture(G.enemies.find(e=>e.kind==='boss'&&e.st==='slot'));sim(3.6)`],
  ['beam',       `play();sim(22);G.ship.x=112;G.diveT=1e9;
                  launchCapture(G.enemies.find(e=>e.kind==='boss'&&e.st==='slot'));sim(4.6)`],
  ['captured',   `play();sim(22);G.diveT=1e9;const b=G.enemies.find(e=>e.kind==='boss');
                  b.holds=true;b.hurt=true;sim(0.5)`],
  ['dual',       `play();sim(22);G.diveT=1e9;G.ship.dual=true;sim(0.5)`],
  ['challenge',  `newGame();hideOverlay();startStage(3);G.state='play';G.ship.inv=0;sim(5)`],
  ['explosion',  `play();sim(22);G.diveT=1e9;G.enemies.slice(0,5).forEach(e=>boom(e.x,e.y));sim(0.1)`],
  ['death',      `play();sim(22);G.diveT=1e9;G.ship.inv=0;playerDies();sim(0.2)`],
  ['stage card', `play();sim(22);G.diveT=1e9;G.enemies.length=0;sim(0.1)`]
];

const PRELUDE=`
window.sim=function(t){const dt=1/60;for(let i=0;i<Math.round(t/dt);i++)stepGame(dt);render();};
window.play=function(){newGame();hideOverlay();G.state='play';G.ship.inv=99;};
window.shot=function(){const c=document.getElementById('c');
  const g2=c.getContext('2d');return g2.getImageData(0,0,224,272).data;};
window.ink=function(x0,y0,w,h){const g2=document.getElementById('c').getContext('2d');
  const d=g2.getImageData(x0,y0,w,h).data;let n=0;
  for(let i=0;i<d.length;i+=4)if(d[i]+d[i+1]+d[i+2]>60)n++;return n;};
window.diff=function(a,b){let n=0;for(let i=0;i<a.length;i+=4)
  if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>40)n++;return n;};
`;

function row(name,cells){
  const pad=(s,n)=>String(s)+' '.repeat(Math.max(0,n-String(s).length));
  return pad(name,12)+cells.map(c=>pad(c.ok?'  yes':'  NO ',6)+pad(c.note||'',0)).join(' | ');
}

(async()=>{
  const CAND=[process.env.CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
  const exe=CAND.find(p=>{try{return fs.existsSync(p);}catch(e){return false;}});
  const b=await pw.chromium.launch(exe?{executablePath:exe}:{});
  const pg=await b.newPage({viewport:{width:460,height:720}});
  const errs=[];
  pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto('file://'+path.join(__dirname,'..','index.html'));
  await pg.addScriptTag({content:PRELUDE});

  console.log('scene        alive    moving   whole    on-screen  answers');
  console.log('-'.repeat(64));
  let bad=0;
  for(const [name,setup] of SCENES){
    const res=await pg.evaluate(({setup})=>{
      (0,eval)('(function(){'+setup+'})()');
      const a=shot();
      /* is it alive? a tenth of a second later, is it a different picture */
      const pos0=new Map(G.enemies.map(e=>[e.id,[e.x,e.y]]));
      sim(0.1);
      const b2=shot();
      const alive=diff(a,b2);
      /* an enemy that has flown off the bottom is parked off-canvas until it
         comes back; counting its jump as movement flatters the row */
      const moved=G.enemies.reduce((m,e)=>{
        const p=pos0.get(e.id);
        if(!p||e.st==='gone'||e.x<-100)return m;
        return Math.max(m,Math.abs(e.x-p[0])+Math.abs(e.y-p[1]));},0);
      /* is the fighter whole? the ink under it must match the sprite's own ink */
      let whole=-1,want=0;
      if(G.ship.alive&&!G.ship.dual&&G.state==='play'){
        /* clear the sky, and stop the respawn blink, or this measures the
           half of the flash where the fighter is deliberately not drawn */
        const save=G.enemies.slice(),inv=G.ship.inv;
        G.enemies=[];G.booms=[];G.ebullets=[];G.bullets=[];G.ship.inv=0;
        render();G.ship.inv=inv;
        whole=ink(Math.round(G.ship.x)-8,G.ship.y-8,16,16);
        G.enemies=save;
        /* what the sprite itself is worth, so the row compares like with like */
        const c3=document.createElement('canvas');c3.width=c3.height=16;
        const g3=c3.getContext('2d');g3.imageSmoothingEnabled=false;
        g3.drawImage(SPR.ship,0,0);
        const d3=g3.getImageData(0,0,16,16).data;
        want=0;for(let i=0;i<d3.length;i+=4)if(d3[i]+d3[i+1]+d3[i+2]>60)want++;
      }
      /* is anything stranded outside the playfield */
      const stray=G.enemies.filter(e=>e.st!=='gone'&&
        (e.x<-30||e.x>254||e.y<-40||e.y>320)).length;
      /* does it answer what you press */
      let answers=null;
      if(G.state==='play'&&G.ship.alive){
        const x0=G.ship.x;keys.left=true;sim(0.25);keys.left=false;
        answers=Math.round((x0-G.ship.x)*10)/10;
      }
      return{alive,moved:Math.round(moved*10)/10,whole,want,stray,answers,
             state:G.state,n:G.enemies.length};
    },{setup});

    const cells=[
      {ok:res.alive>12,note:res.alive+'px'},
      {ok:res.moved>0.4||res.state!=='play',note:res.moved+''},
      /* stars behind the fighter add a pixel or two; a missing wing costs ten */
      {ok:res.whole<0||Math.abs(res.whole-res.want)<=4,
       note:res.whole<0?'n/a':res.whole+'/'+res.want},
      {ok:res.stray===0,note:res.stray?res.stray+' out':''},
      {ok:res.answers===null||res.answers>12,note:res.answers===null?'n/a':res.answers+'px'}
    ];
    if(cells.some(c=>!c.ok))bad++;
    console.log(row(name,cells));
  }
  console.log('-'.repeat(64));
  if(errs.length){console.log('page errors:');errs.forEach(e=>console.log('  '+e));bad+=errs.length;}
  console.log(bad?bad+' scene(s) to look at':'every scene moved, answered and stayed whole');
  await b.close();
  process.exit(bad?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
