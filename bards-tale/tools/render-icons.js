#!/usr/bin/env node
/* The home-screen icons, drawn from the game's own monster art and its own
 * corridor, so an icon can never drift from what it is a picture of.
 *   PW=$PWD/../node_modules/playwright-core node tools/render-icons.js
 *   ...                                      node tools/render-icons.js --check
 */
'use strict';
const path=require('path'),fs=require('fs');
const pw=require(process.env.PW||'playwright-core');
const check=process.argv.includes('--check');
const SIZES=[180,192,512];
(async()=>{
  const CAND=[process.env.CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium'].filter(Boolean);
  const exe=CAND.find(p=>{try{return fs.existsSync(p);}catch(e){return false;}});
  const b=await pw.chromium.launch(exe?{executablePath:exe}:{});
  const pg=await b.newPage();
  await pg.goto('file://'+path.join(__dirname,'..','index.html'));
  const out=await pg.evaluate(sizes=>sizes.map(S=>{
    const cv=document.createElement('canvas');cv.width=cv.height=S;
    const g=cv.getContext('2d');g.imageSmoothingEnabled=false;
    /* the corridor, in one frame: floor, ceiling, and two walls running away */
    g.fillStyle='#0d0a08';g.fillRect(0,0,S,S);
    const k=S/48;
    const inset=(f)=>({x0:S/2-(S/2)*f,x1:S/2+(S/2)*f,y0:S/2-(S/2)*f,y1:S/2+(S/2)*f});
    const quad=(p,q,which,col)=>{
      g.fillStyle=col;g.beginPath();
      if(which==='l'){g.moveTo(p.x0,p.y0);g.lineTo(q.x0,q.y0);g.lineTo(q.x0,q.y1);g.lineTo(p.x0,p.y1);}
      if(which==='r'){g.moveTo(p.x1,p.y0);g.lineTo(q.x1,q.y0);g.lineTo(q.x1,q.y1);g.lineTo(p.x1,p.y1);}
      if(which==='f'){g.moveTo(p.x0,p.y1);g.lineTo(q.x0,q.y1);g.lineTo(q.x1,q.y1);g.lineTo(p.x1,p.y1);}
      if(which==='c'){g.moveTo(p.x0,p.y0);g.lineTo(q.x0,q.y0);g.lineTo(q.x1,q.y0);g.lineTo(p.x1,p.y0);}
      g.closePath();g.fill();
    };
    const shades=['#5a5344','#4a4436','#3a352a','#2a261e'];
    for(let i=3;i>=0;i--){
      const p=inset(Math.pow(0.6,i)),q=inset(Math.pow(0.6,i+1));
      quad(p,q,'c','#191510');
      quad(p,q,'f',['#3a352c','#312c25','#26221c','#1c1915'][i]);
      quad(p,q,'l',shades[i]);
      quad(p,q,'r',['#463f33','#3a3429','#2e2921','#241f19'][i]);
    }
    /* and the thing standing in it */
    const w=Math.round(30*k);
    g.drawImage(ART.gremlin,Math.round(S/2-w/2),Math.round(S*0.30),w,w);
    return cv.toDataURL('image/png');
  }),SIZES);
  await b.close();
  let bad=0;
  SIZES.forEach((S,i)=>{
    const f=path.join(__dirname,'..','icon-'+S+'.png');
    const buf=Buffer.from(out[i].split(',')[1],'base64');
    if(check){
      const cur=fs.existsSync(f)?fs.readFileSync(f):null;
      if(!cur||!cur.equals(buf)){console.error('  icon-'+S+'.png is not what the art makes');bad++;}
    }else fs.writeFileSync(f,buf);
  });
  if(check){if(bad)process.exit(1);console.log('the icons match the art');}
  else console.log('wrote icon-180.png, icon-192.png, icon-512.png');
})().catch(e=>{console.error(e);process.exit(1);});
