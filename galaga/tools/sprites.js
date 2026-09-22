#!/usr/bin/env node
/* Every sprite, every frame, at eight times size, on one sheet — so the art can
 * be judged as art before anything flies it around. */
'use strict';
const path=require('path'),fs=require('fs');
const pw=require(process.env.PW||'playwright-core');
const OUT=path.resolve(process.argv[2]||'sprites.png');
(async()=>{
  const CAND=[process.env.CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium'].filter(Boolean);
  const exe=CAND.find(p=>{try{return fs.existsSync(p);}catch(e){return false;}});
  const b=await pw.chromium.launch(exe?{executablePath:exe}:{});
  const pg=await b.newPage({viewport:{width:900,height:460}});
  pg.on('pageerror',e=>console.error('PAGE ERROR:',e.message));
  await pg.goto('file://'+path.join(__dirname,'..','index.html'));
  const data=await pg.evaluate(()=>{
    const names=[['ship',SPR.ship],['ship dim',SPR.shipDim],
      ['zako 0',SPR.zako[0]],['zako 1',SPR.zako[1]],
      ['goei 0',SPR.goei[0]],['goei 1',SPR.goei[1]],
      ['boss 0',SPR.boss[0]],['boss 1',SPR.boss[1]],
      ['hurt 0',SPR.bossHurt[0]],['hurt 1',SPR.bossHurt[1]]];
    const S=8,cell=16*S+8,cols=5;
    const cv=document.createElement('canvas');
    cv.width=cols*cell+8;cv.height=Math.ceil(names.length/cols)*(cell+16)+8;
    const g=cv.getContext('2d');g.imageSmoothingEnabled=false;
    g.fillStyle='#000010';g.fillRect(0,0,cv.width,cv.height);
    names.forEach(([n,img],i)=>{
      const x=8+(i%cols)*cell,y=8+Math.floor(i/cols)*(cell+16);
      g.strokeStyle='#223';g.strokeRect(x-0.5,y-0.5,16*S+1,16*S+1);
      g.drawImage(img,x,y,16*S,16*S);
      g.fillStyle='#889';g.font='11px monospace';g.fillText(n,x,y+16*S+12);
    });
    return cv.toDataURL('image/png');
  });
  fs.writeFileSync(OUT,Buffer.from(data.split(',')[1],'base64'));
  console.log('wrote '+OUT);
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
