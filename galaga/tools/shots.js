#!/usr/bin/env node
/* Put the game on the screen and take pictures of it.
 *
 * Nothing here judges anything; it exists so a person can look. Give it a list
 * of moments and it writes one PNG per moment, at 4x, into the directory given.
 *
 *   PW=$PWD/../node_modules/playwright-core node tools/shots.js out/
 */
'use strict';
const path=require('path'),fs=require('fs');
const pw=require(process.env.PW||'playwright-core');
const OUT=path.resolve(process.argv[2]||'shots');
const SCALE=+(process.env.SCALE||4);

const MOMENTS=[
  ['title',      `showSplash();for(let i=0;i<120;i++){starStep(1/60);formationStep(1/60);G.enemies.forEach(e=>enemyStep(e,1/60));}`],
  ['entry',      `newGame();hideOverlay();G.state='play';step(1.6)`],
  ['entry2',     `newGame();hideOverlay();G.state='play';step(3.4)`],
  ['formed',     `newGame();hideOverlay();G.state='play';step(17)`],
  ['diving',     `newGame();hideOverlay();G.state='play';step(17);G.diveT=0;step(1.4)`],
  ['beam',       `newGame();hideOverlay();G.state='play';step(17);G.ship.x=112;G.diveT=99;launchCapture(G.enemies.find(e=>e.kind==='boss'&&e.st==='slot'));step(4.2)`],
  ['boom',       `newGame();hideOverlay();G.state='play';step(17);G.enemies.slice(0,6).forEach(e=>{boom(e.x,e.y);});boom(G.ship.x,G.ship.y,true);step(0.12)`],
  ['firing',     `newGame();hideOverlay();G.state='play';G.ship.inv=99;step(17);G.diveT=1e9;keys.autofire=true;step(0.9);keys.autofire=false`],
  ['dual',       `newGame();hideOverlay();G.state='play';step(17);G.ship.dual=true;playerFire();step(0.25)`],
  ['held',       `newGame();hideOverlay();G.state='play';step(17);const b=G.enemies.find(e=>e.kind==='boss');b.holds=true;b.hurt=true;step(0.1)`],
  ['challenge',  `newGame();startStage(3);hideOverlay();G.state='play';step(4)`],
  ['flags',      `newGame();hideOverlay();G.stage=44;G.lives=5;G.state='play';step(0.1)`],
  ['gameover',   `newGame();G.score=45280;G.shots=210;G.hits=131;G.stage=9;gameOver()`],
  ['help',       `showSplash();showHelp()`]
];

(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  /* Whatever chromium this machine happens to carry; the point is to see the
   * picture, not to pin a browser build. */
  const CAND=[process.env.CHROME,
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/opt/pw-browsers/chromium/chrome-linux/chrome',
    '/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
  const exe=CAND.find(p=>{try{return fs.existsSync(p);}catch(e){return false;}});
  const b=await pw.chromium.launch(exe?{executablePath:exe}:{});
  const pg=await b.newPage({viewport:{width:224*SCALE,height:288*SCALE+120},
    deviceScaleFactor:1});
  pg.on('pageerror',e=>console.error('PAGE ERROR:',e.message));
  await pg.goto('file://'+path.join(__dirname,'..','index.html'));
  await pg.addScriptTag({content:`
    window.step=function(t){const dt=1/60;for(let i=0;i<Math.round(t/dt);i++){stepGame(dt);}render();};
    window.G=G;window.showSplash=showSplash;window.showHelp=showHelp;window.newGame=newGame;
    window.startStage=startStage;window.gameOver=gameOver;window.launchCapture=launchCapture;
    window.boom=boom;window.hideOverlay=hideOverlay;window.playerFire=playerFire;window.starStep=starStep;
    window.formationStep=formationStep;window.enemyStep=enemyStep;window.render=render;
  `}).catch(e=>console.error('inject:',e.message));
  await pg.evaluate(()=>{ if(window.__raf) return; });
  for(const [name,code] of MOMENTS){
    await pg.evaluate(c=>{ (0,eval)('(function(){'+c+'})()'); },code);
    await pg.waitForTimeout(40);
    const stage=await pg.$('#stage');
    await stage.screenshot({path:path.join(OUT,name+'.png')});
    process.stdout.write(name+' ');
  }
  console.log('\nwrote '+MOMENTS.length+' frames to '+OUT);
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
