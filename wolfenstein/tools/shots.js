#!/usr/bin/env node
/* Moments of the game, each at three times size, on one sheet — for a person
 * to look at. Nothing is checked here; this is the tool for step one.
 *
 *   PW=... node tools/shots.js out.png
 *   PW=... node tools/shots.js out.png --only="a squad in,papers"
 */
'use strict';
const path=require('path'),fs=require('fs');
const pw=require(process.env.PW||'playwright-core');
const OUT=path.resolve(process.argv[2]||'shots.png');
const ONLY=(process.argv.find(a=>a.startsWith('--only='))||'').slice(7).split(',').filter(Boolean);
const MOMENTS=[
  ['title demo',  `showSplash();sim(4)`],
  ['the cell',    `play();sim(0.5)`],
  ['a guard room',`play();visit(busiest());sim(1.2)`],
  ['halt!',       `play();visit(busiest());G.P.uniform=false;room().guards.forEach(alarm);sim(0.4)`],
  ['hands up',    `play();bare(60,90);const g=put('guard',160,90);g.st='hup';g.hupT=9;sim(0.2)`],
  ['gunfight',    `play();bare(60,90);const g=put('guard',180,94);alarm(g);sim(1.6);fire();sim(0.05)`],
  ['ss follows',  `play();bare(20,92);put('ss',-6,92).st='enter';room().guards[0].dir=0;sim(0.35)`],
  ['the alarm',   `play();G.impenetrable=true;bare(140,92);raiseHunt();sim(0.25)`],
  ['a squad in',  `play();G.impenetrable=true;bare(140,120);raiseHunt();G.hunt.t=0.01;sim(1.3)`],
  ['the squad',   `play();G.impenetrable=true;bare(140,120);raiseHunt();G.hunt.t=0.01;sim(3.4)`],
  ['papers',      `play();G.impenetrable=true;bare(100,92);G.P.uniform=true;const a=put('ss',130,92),b=put('ss',150,80);sim(1.5)`],
  ['spion!',      `play();G.impenetrable=true;bare(100,92);G.P.uniform=true;const a=put('ss',130,92),b=put('ss',150,80);sim(3.9)`],
  ['ss squad room',`play(5);let i=G.castle.rooms.findIndex(r=>r.guards.filter(g=>g.kind==='ss').length>=2);visit(i);G.P.uniform=true;sim(1)`],
  ['picking',     `play();bare(60,90);room().chests.push({tx:12,ty:9,strong:false,state:'locked',item:{k:'vest'}});
                   G.P.x=108;G.P.y=100;search();sim(1)`],
  ['strongbox',   `play();bare(60,90);room().chests.push({tx:12,ty:9,strong:true,state:'locked',item:{k:'plans'}},
                   {tx:22,ty:6,strong:false,state:'open',item:null},{tx:22,ty:13,strong:false,state:'wrecked',item:null});sim(0.2)`],
  ['grenade',     `play();visit(busiest());G.P.dir=0;throwNade();sim(0.9)`],
  ['rubble',      `play();visit(busiest());G.P.dir=0;throwNade();sim(2)`],
  ['impenetrable',`play();G.impenetrable=true;bare(60,90);const g=put('guard',140,90);alarm(g);g.fireT=0;sim(0.55)`],
  ['shot dead',   `play();G.impenetrable=false;bare(60,90);const g=put('guard',140,90);alarm(g);g.fireT=0;sim(1.2)`],
  ['the way out', `play();visit(G.castle.exitRoom);sim(0.6)`],
  ['disguised',   `play();visit(busiest());G.P.uniform=true;sim(1)`],
  ['a castle 6',  `play(6);visit(busiest());sim(1)`],
];
const PRELUDE=`
window.sim=function(t){const dt=1/60;for(let i=0;i<Math.round(t/dt);i++)stepGame(dt);render();};
window.play=function(d){newGame(11);if(d>1)startCastle(d);hideOverlay();G.state='play';G.impenetrable=false;};
window.visit=function(i){enterRoom(i);const s=place(room(),1,6)[0]||[17,9];G.P.x=s[0]*8+4;G.P.y=(s[1]+2)*8;};
window.busiest=function(){let b=0;G.castle.rooms.forEach((r,i)=>{if(r.guards.length>G.castle.rooms[b].guards.length)b=i;});return b;};
window.bare=function(x,y){const rm=room();rm.guards=[];rm.chests=[];rm.g=rm.g.map(t=>t===INNER||t===RUBBLE?FLOOR:t);
  G.P.x=x;G.P.y=y;G.P.dir=0;G.P.face=1;};
window.put=function(k,x,y){const g=mkGuard(k,x,y);g.st='stand';g.t=1e9;g.face=-1;room().guards.push(g);return g;};
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
  const shots=[];
  for(const [name,setup] of MOMENTS.filter(m=>!ONLY.length||ONLY.includes(m[0]))){
    const url=await pg.evaluate(s=>{(0,eval)('(function(){'+s+'})()');
      return document.getElementById('c').toDataURL();},setup);
    shots.push([name,url]);
  }
  const sheet=await pg.evaluate(async shots=>{
    const S=3,cw=280*S+12,ch=168*S+26,cols=2;
    const c=document.createElement('canvas');
    c.width=cw*cols;c.height=ch*Math.ceil(shots.length/cols);
    const x=c.getContext('2d');x.imageSmoothingEnabled=false;
    x.fillStyle='#333';x.fillRect(0,0,c.width,c.height);
    for(let i=0;i<shots.length;i++){
      const im=new Image();im.src=shots[i][1];await im.decode();
      const X=(i%cols)*cw+6,Y=Math.floor(i/cols)*ch+20;
      x.drawImage(im,X,Y,280*S,168*S);
      x.fillStyle='#fff';x.font='14px monospace';x.fillText(shots[i][0],X,Y-5);
    }
    return c.toDataURL();
  },shots);
  fs.writeFileSync(OUT,Buffer.from(sheet.split(',')[1],'base64'));
  console.log('wrote '+OUT);
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
