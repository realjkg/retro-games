#!/usr/bin/env node
/* The home-screen icons, drawn from the game's own sprites: the bartender and a
 * full mug on the bar. --check fails if the committed icons are stale.
 *
 *   PW=... node tools/render-icons.js [--check]
 */
'use strict';
const path=require('path'),fs=require('fs');
const pw=require(process.env.PW||'playwright-core');
const DIR=path.join(__dirname,'..');
const check=process.argv.includes('--check');
(async()=>{
  const CAND=[process.env.CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium'].filter(Boolean);
  const exe=CAND.find(p=>{try{return fs.existsSync(p);}catch(e){return false;}});
  const b=await pw.chromium.launch(exe?{executablePath:exe}:{});
  const pg=await b.newPage();
  await pg.goto('file://'+path.join(DIR,'index.html'));
  let bad=0;
  for(const n of [180,192,512]){
    const url=await pg.evaluate(n=>{
      /* a 32x32 picture, scaled up by whole pixels and centred */
      const c=document.createElement('canvas');c.width=32;c.height=32;
      const g=c.getContext('2d');g.imageSmoothingEnabled=false;
      g.fillStyle='#5a3418';g.fillRect(0,0,32,32);
      for(let x=0;x<32;x+=6)g.fillStyle='#4a2a12',g.fillRect(x,0,3,32);
      g.fillStyle='#b0763a';g.fillRect(0,19,32,4);g.fillStyle='#6a3a16';g.fillRect(0,23,32,9);
      g.drawImage(figure('bartender','','bartender','pour','stand',false),15,5);
      g.drawImage(SPR.mugFullL,5,12);
      const o=document.createElement('canvas');o.width=o.height=n;
      const og=o.getContext('2d');og.imageSmoothingEnabled=false;
      const k=Math.floor(n/32),off=Math.floor((n-32*k)/2);
      og.fillStyle='#5a3418';og.fillRect(0,0,n,n);
      og.drawImage(c,off,off,32*k,32*k);
      return o.toDataURL('image/png');
    },n);
    const buf=Buffer.from(url.split(',')[1],'base64');
    const f=path.join(DIR,'icon-'+n+'.png');
    if(check){if(!fs.existsSync(f)||!fs.readFileSync(f).equals(buf)){console.error('stale: '+f);bad++;}}
    else{fs.writeFileSync(f,buf);console.log('wrote '+f);}
  }
  await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
