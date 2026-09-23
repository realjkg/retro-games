#!/usr/bin/env node
/* Moments of the game, each at three times size, on one sheet — for a person
 * to look at. Nothing is checked here; this is the tool for step one.
 *
 *   PW=... node tools/shots.js out.png
 */
'use strict';
const path=require('path'),fs=require('fs');
const pw=require(process.env.PW||'playwright-core');
const OUT=path.resolve(process.argv[2]||'shots.png');
const MOMENTS=[
  ['title demo',  `showSplash();sim(6)`],
  ['walk in',     `play();sim(2.2)`],
  ['busy bar',    `play();for(let i=0;i<4;i++){spawn(i);G.cust[G.cust.length-1].x=40+i*30;}
                   G.mugs.push({lane:1,x:150,v:118,full:true},{lane:2,x:120,v:40,full:false});sim(0.4)`],
  ['pouring',     `play();keys.fire=true;sim(0.25)`],
  ['served',      `play();spawn(0);G.cust[0].x=60;serveNow();sim(1.2)`],
  ['drinking',    `play();spawn(0);G.cust[0].x=120;serveNow();sim(2.2)`],
  ['showtime',    `play();for(let i=0;i<4;i++){spawn(i);G.cust[i].x=50+i*25;}G.showT=2;sim(0.3)`],
  ['crash',       `play();G.mugs.push({lane:2,x:20,v:118,full:true});sim(0.2)`],
  ['ball park',   `play(2);for(let i=0;i<4;i++){spawn(i);G.cust[i].x=50+i*30;}sim(0.5)`],
  ['punk club',   `play(3);for(let i=0;i<4;i++){spawn(i);G.cust[i].x=50+i*30;}sim(0.5)`],
  ['space bar',   `play(4);for(let i=0;i<4;i++){spawn(i);G.cust[i].x=50+i*30;}sim(0.5)`],
  ['shake',       `play();startBonus();sim(2.2)`],
  ['shuffle',     `play();startBonus();sim(6.2)`],
  ['pick',        `play();startBonus();sim(14)`],
];
const PRELUDE=`
window.sim=function(t){const dt=1/60;for(let i=0;i<Math.round(t/dt);i++)stepGame(dt);render();};
window.play=function(L){newGame();startLevel(L||1);hideOverlay();G.state='play';};
window.serveNow=function(){G.bt.x=TAP_X;G.bt.lane=0;G.bt.fill=1;G.bt.holding=true;keys.fire=false;};
`;
(async()=>{
  const CAND=[process.env.CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium'].filter(Boolean);
  const exe=CAND.find(p=>{try{return fs.existsSync(p);}catch(e){return false;}});
  const b=await pw.chromium.launch(exe?{executablePath:exe}:{});
  const pg=await b.newPage({viewport:{width:900,height:900}});
  pg.on('pageerror',e=>console.error('PAGE ERROR:',e.message));
  await pg.goto('file://'+path.join(__dirname,'..','index.html'));
  await pg.addScriptTag({content:PRELUDE});
  const urls=[];
  for(const [name,setup] of MOMENTS){
    urls.push([name,await pg.evaluate(s=>{(0,eval)('(function(){'+s+'})()');
      keys.fire=false;return document.getElementById('c').toDataURL();},setup)]);
  }
  const data=await pg.evaluate(async urls=>{
    const S=3,cols=3,cw=256*S+8,ch=248*S+24;
    const cv=document.createElement('canvas');
    cv.width=cols*cw;cv.height=Math.ceil(urls.length/cols)*ch;
    const g=cv.getContext('2d');g.imageSmoothingEnabled=false;
    g.fillStyle='#222';g.fillRect(0,0,cv.width,cv.height);
    for(let i=0;i<urls.length;i++){
      const im=new Image();im.src=urls[i][1];await im.decode();
      const x=(i%cols)*cw,y=Math.floor(i/cols)*ch;
      g.drawImage(im,x,y+20,256*S,248*S);
      g.fillStyle='#fff';g.font='16px monospace';g.fillText(urls[i][0],x+4,y+15);
    }
    return cv.toDataURL();
  },urls);
  fs.writeFileSync(OUT,Buffer.from(data.split(',')[1],'base64'));
  console.log('wrote '+OUT);
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
