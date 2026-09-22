#!/usr/bin/env node
/* Every monster in the game at four times size, on one sheet, so the art can be
 * judged as art before anything is fighting you with it.
 *   PW=$PWD/../node_modules/playwright-core node tools/monsters.js out.png
 */
'use strict';
const path=require('path'),fs=require('fs');
const pw=require(process.env.PW||'playwright-core');
(async()=>{
  const CAND=[process.env.CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium'].filter(Boolean);
  const exe=CAND.find(p=>{try{return fs.existsSync(p);}catch(e){return false;}});
  const b=await pw.chromium.launch(exe?{executablePath:exe}:{});
  const pg=await b.newPage({viewport:{width:1100,height:600}});
  pg.on('pageerror',e=>console.error('PAGE ERROR:',e.message));
  await pg.goto('file://'+path.join(__dirname,'..','index.html'));
  const data=await pg.evaluate(()=>{
    const S=4,cell=48*S+10,cols=5;
    const rows=Math.ceil(MONSTERS.length/cols);
    const cv=document.createElement('canvas');
    cv.width=cols*cell+10;cv.height=rows*(cell+16)+10;
    const g=cv.getContext('2d');g.imageSmoothingEnabled=false;
    g.fillStyle='#0d0a08';g.fillRect(0,0,cv.width,cv.height);
    MONSTERS.forEach((m,i)=>{
      const x=10+(i%cols)*cell,y=10+Math.floor(i/cols)*(cell+16);
      g.strokeStyle='#3a2c22';g.strokeRect(x-0.5,y-0.5,48*S+1,48*S+1);
      if(ART[m.id])g.drawImage(ART[m.id],x,y,48*S,48*S);
      g.fillStyle='#9a8b76';g.font='12px monospace';g.fillText(m.name,x,y+48*S+13);
    });
    return cv.toDataURL('image/png');
  });
  fs.writeFileSync(process.argv[2]||'monsters.png',Buffer.from(data.split(',')[1],'base64'));
  console.log('wrote '+(process.argv[2]||'monsters.png'));
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
