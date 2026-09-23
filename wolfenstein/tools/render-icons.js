#!/usr/bin/env node
/* The home-screen icons, drawn from the game's own sprites: the prisoner, gun
 * up, in front of a brick wall and the steel strongbox with the plans in it.
 * --check fails if the committed icons are stale.
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
      const x=c.getContext('2d');x.imageSmoothingEnabled=false;
      x.fillStyle='#000';x.fillRect(0,0,32,32);
      for(let ty=0;ty<2;ty++)for(let tx=0;tx<4;tx++){const X=tx*8,Y=ty*8;
        x.fillStyle=WALLC;x.fillRect(X,Y,8,8);x.fillStyle=WALLHI;x.fillRect(X,Y,8,1);
        x.fillStyle=MORTAR;x.fillRect(X,Y+3,8,1);x.fillRect(X,Y+7,8,1);
        x.fillRect(X+((tx+ty)%2?1:5),Y,1,3);x.fillRect(X+((tx+ty)%2?5:1),Y+4,1,3);}
      /* the strongbox */
      x.fillStyle='#8a90a8';x.fillRect(3,23,14,6);x.fillStyle='#b8bed0';x.fillRect(3,23,14,2);
      x.fillStyle='#4a5068';x.fillRect(3,25,14,1);x.fillRect(3,28,14,1);
      x.fillStyle='#ffd84a';x.fillRect(9,25,2,3);
      x.drawImage(figure('player','U','stand',false),17,14);
      const o=document.createElement('canvas');o.width=o.height=n;
      const og=o.getContext('2d');og.imageSmoothingEnabled=false;
      const k=Math.floor(n/32),off=Math.floor((n-32*k)/2);
      og.fillStyle='#000';og.fillRect(0,0,n,n);
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
