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
  const url=await pg.evaluate(()=>{
    const rows=[];
    for(const k of ['player','disguised','guard','ss']){
      const r=WALKCYCLE.map(f=>figure(k,'H',f,false))
        .concat([['H','stand'],['H2','stand'],['U','stand'],['D','stand'],['carry','stand'],['carry2','stand'],
          ['hup','stand'],['rum1','stand'],['rum2','stand'],['H','kneel']].map(([t,l])=>figure(k,t,l,false)))
        .concat([figure(k,'H','stand',false,true),figure(k,'H','a',true),figure(k,'H','lying',false)]);
      rows.push(r);
    }
    const S=8,cw=17*S,ch=17*S;
    const c=document.createElement('canvas');c.width=cw*rows[0].length;c.height=ch*rows.length;
    const x=c.getContext('2d');x.imageSmoothingEnabled=false;
    x.fillStyle='#000';x.fillRect(0,0,c.width,c.height);
    rows.forEach((r,j)=>r.forEach((im,i)=>{
      x.fillStyle='#181818';x.fillRect(i*cw+2,j*ch+2,cw-4,ch-4);
      x.drawImage(im,i*cw+4,j*ch+4,im.width*S,im.height*S);}));
    return c.toDataURL();
  });
  fs.writeFileSync(OUT,Buffer.from(url.split(',')[1],'base64'));
  console.log('wrote '+OUT);
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
