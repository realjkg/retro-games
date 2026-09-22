#!/usr/bin/env node
/* The tunes, drawn as piano rolls.
 *
 * Nobody working on this can hear it, and a tune is exactly the kind of thing
 * that is wrong in a way no assertion catches: a part that runs short, a
 * melody with no shape, a bass that sits on one note for four bars. Drawn side
 * by side against a bar grid, all three are visible at a glance.
 *
 *   PW=$PWD/../node_modules/playwright-core node tools/music.js out.png
 */
'use strict';
const path=require('path'),fs=require('fs');
const pw=require(process.env.PW||'playwright-core');
(async()=>{
  const CAND=[process.env.CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium'].filter(Boolean);
  const exe=CAND.find(p=>{try{return fs.existsSync(p);}catch(e){return false;}});
  const b=await pw.chromium.launch(exe?{executablePath:exe}:{});
  const pg=await b.newPage({viewport:{width:1200,height:900}});
  pg.on('pageerror',e=>console.error('PAGE ERROR:',e.message));
  await pg.goto('file://'+path.join(__dirname,'..','index.html'));
  const data=await pg.evaluate(()=>{
    const COL={lead:'#f8d000',harm:'#5ad1e6',arp:'#7ad47a',bass:'#ee6688',drum:'#9a8b76'};
    const names=Object.keys(TUNES);
    const PX=26,ROW=5,PAD=54,GAP=30;
    // one semitone a row, one beat PX pixels wide
    const roll=k=>{
      const t=TUNES[k],notes=[];
      t.parts.forEach(([v,line])=>{
        let at=0;
        const drum=!!(VOICES[v]&&VOICES[v].drum);
        line.trim().split(/\s+/).forEach(tok=>{
          const[n,d]=tok.split(':');const len=+d||1;
          /* the noise channel has no pitch, so it gets a lane of its own
             under the staff rather than a row on it - plotted on the pitch
             grid its frequency of zero took the whole drawing with it */
          if(n!=='-')notes.push({v,n,at,len,f:hz(n),drum});
          at+=len;
        });
      });
      return{t,notes,beats:Math.max(...t.parts.map(([v,l])=>
        l.trim().split(/\s+/).reduce((a,x)=>a+(+x.split(':')[1]||1),0)))};
    };
    const rolls=names.map(roll);
    const semi=f=>Math.round(12*Math.log2(f/440)+69);
    let lo=999,hi=0;
    rolls.forEach(r=>r.notes.forEach(n=>{
      if(n.drum)return;
      const s=semi(n.f);
      if(s<lo)lo=s;if(s>hi)hi=s;}));
    const DRUMROW={k:0,s:1,h:2};
    const DRUMH=4*ROW;
    const H=(hi-lo+3)*ROW+DRUMH;
    const W=Math.max(...rolls.map(r=>r.beats))*PX+PAD+20;
    const cv=document.createElement('canvas');
    cv.width=W;cv.height=rolls.length*(H+GAP)+20;
    const g=cv.getContext('2d');
    g.fillStyle='#0a0a12';g.fillRect(0,0,cv.width,cv.height);
    rolls.forEach((r,i)=>{
      const top=14+i*(H+GAP);
      g.fillStyle='#e8ddc8';g.font='13px monospace';
      g.fillText(names[i]+'   '+r.t.bpm+' bpm   '+r.beats+' beats   '+
        (r.beats*60/r.t.bpm).toFixed(1)+'s',6,top-2);
      // bar lines every four beats, so a part that runs short is obvious
      for(let bt=0;bt<=r.beats;bt+=1){
        g.fillStyle=(bt%4===0)?'#3a3a52':'#1c1c28';
        g.fillRect(PAD+bt*PX,top,1,H);
      }
      g.fillStyle='#2a2a3a';g.fillRect(PAD,top+H,r.beats*PX,1);
      r.notes.forEach(n=>{
        if(n.drum){
          const y=top+H-(DRUMROW[n.n]||0)*ROW-ROW;
          g.fillStyle=COL.drum;
          g.fillRect(PAD+n.at*PX+1,y,Math.max(2,Math.min(5,n.len*PX-2)),ROW-1);
          return;
        }
        const y=top+H-DRUMH-(semi(n.f)-lo+1)*ROW;
        g.fillStyle=COL[n.v]||'#fff';
        g.fillRect(PAD+n.at*PX+1,y,Math.max(3,n.len*PX-2),ROW-1);
      });
      /* a line between the pitched voices and the noise lane */
      g.fillStyle='#2a2a3a';g.fillRect(PAD,top+H-DRUMH,r.beats*PX,1);
      // which voice is which
      let lx=6;
      Object.keys(COL).forEach(v=>{
        if(!r.t.parts.some(p=>p[0]===v))return;
        g.fillStyle=COL[v];g.fillRect(lx,top+H-9,8,8);
        g.fillStyle='#9a8b76';g.font='10px monospace';g.fillText(v,lx+11,top+H-2);
        lx+=44;
      });
    });
    return cv.toDataURL('image/png');
  });
  fs.writeFileSync(process.argv[2]||'music.png',Buffer.from(data.split(',')[1],'base64'));
  console.log('wrote '+(process.argv[2]||'music.png'));
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
