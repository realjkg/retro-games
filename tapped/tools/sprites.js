#!/usr/bin/env node
/* Every figure, every frame, at eight times size, on one sheet — so the art can
 * be judged as art before anything walks it around.
 *
 *   PW=... node tools/sprites.js out.png
 */
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
    const rows=[];
    for(const k of ['cowboy','athlete','punk','alien','bandit']){
      const sh=k==='bandit'?'':SHIRTS[k][0];
      rows.push([k,[0,1,2,3].map(f=>['walk '+f,figure(k,sh,k,ARMS[f],WALK[f],false)])
        .concat(['stand','bang1','bang2','hold','drink','cheer'].map(t=>[t,figure(k,sh,k,t,'stand',false)]))]);
    }
    rows.push(['bartender',[0,1,2,3].map(f=>['run '+f,figure('bartender','','bartender',ARMS[f],WALK[f],true)])
      .concat(['stand','fwd','pour','throw','hold','cheer'].map(t=>[t,figure('bartender','','bartender',t,'stand',t==='throw')]))]);
    rows.push(['props',[['mug',SPR.mugFull],['mugL',SPR.mugFullL],['empty',SPR.mugEmpty],['can',SPR.can],['coin',SPR.coin]]]);
    const S=6,cw=14*S+10,ch=26*S+22;
    const cv=document.createElement('canvas');
    cv.width=10*cw+90;cv.height=rows.length*ch+8;
    const g=cv.getContext('2d');g.imageSmoothingEnabled=false;
    g.fillStyle='#5a3418';g.fillRect(0,0,cv.width,cv.height);
    rows.forEach(([name,cells],r)=>{
      g.fillStyle='#fff';g.font='12px monospace';g.fillText(name,4,r*ch+20);
      cells.forEach(([n,img],i)=>{
        const x=90+i*cw,y=r*ch+4;
        g.drawImage(img,x,y,img.width*S,img.height*S);
        g.fillStyle='#ddd';g.font='10px monospace';g.fillText(n,x,y+26*S+14);
      });
    });
    return cv.toDataURL('image/png');
  });
  fs.writeFileSync(OUT,Buffer.from(data.split(',')[1],'base64'));
  console.log('wrote '+OUT);
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
