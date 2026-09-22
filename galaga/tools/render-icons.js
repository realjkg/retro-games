#!/usr/bin/env node
/* The home-screen icons, drawn from the game's own sprite art.
 *
 *   PW=$PWD/../node_modules/playwright-core node tools/render-icons.js
 *   ...              node tools/render-icons.js --check
 *
 * --check re-renders and compares, so an icon can never drift from the fighter
 * it is a picture of.
 */
'use strict';
const path=require('path'),fs=require('fs');
const pw=require(process.env.PW||'playwright-core');
const check=process.argv.includes('--check');
const SIZES=[180,192,512];

(async()=>{
  const CAND=[process.env.CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
  const exe=CAND.find(p=>{try{return fs.existsSync(p);}catch(e){return false;}});
  const b=await pw.chromium.launch(exe?{executablePath:exe}:{});
  const pg=await b.newPage();
  await pg.goto('file://'+path.join(__dirname,'..','index.html'));
  const out=await pg.evaluate(sizes=>sizes.map(S=>{
    const cv=document.createElement('canvas');cv.width=cv.height=S;
    const g=cv.getContext('2d');g.imageSmoothingEnabled=false;
    g.fillStyle='#04040a';g.fillRect(0,0,S,S);
    /* a few stars, on a fixed pattern so the icon is the same every time */
    const cols=['#ffffff','#5ad1e6','#f8d000','#ee6688'];
    for(let i=0;i<26;i++){
      const x=((i*73)%S),y=((i*151)%S),p=Math.max(1,Math.round(S/96));
      g.fillStyle=cols[i%4];g.fillRect(x,y,p,p);
    }
    const u=Math.max(1,Math.round(S/44));          /* one sprite pixel */
    const cx=Math.round(S/2),sp=16*u;
    const by=Math.round(S*0.07),sy=Math.round(S*0.93)-sp;
    /* the beam between them, which is the whole story of this game */
    const y0=by+sp-u*2,y1=sy+u*3;
    for(let y=y0;y<y1;y++){
      const f=(y-y0)/(y1-y0),w=(u*1.6+u*5.2*f);
      g.fillStyle=(((y-y0)>>2)&1)?'rgba(120,215,255,0.85)':'rgba(120,215,255,0.16)';
      g.fillRect(Math.round(cx-w),y,Math.round(w*2),1);
    }
    g.drawImage(SPR.boss[0],cx-8*u,by,sp,sp);
    g.drawImage(SPR.ship,cx-8*u,sy,sp,sp);
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
  if(check){
    if(bad){process.exit(1);}
    console.log('the icons match the sprites');
  }else console.log('wrote icon-180.png, icon-192.png, icon-512.png');
})().catch(e=>{console.error(e);process.exit(1);});
