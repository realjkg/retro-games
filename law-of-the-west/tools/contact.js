#!/usr/bin/env node
/* A contact sheet of the whole picture book.
 *
 * Every screen the game can put in front of a person, captured at phone size
 * and at the same moment in its life, so they can be laid side by side and
 * looked at as drawings rather than as states. An illustrator does not debug a
 * frame, he looks at it next to the one before it.
 *
 *   PW=/path/to/node_modules/playwright-core node tools/contact.js
 */
'use strict';
const path=require('path'), fs=require('fs');
const ROOT=path.join(__dirname,'..');
const PAGE='file://'+path.join(ROOT,'index.html');
const OUT=process.env.OUT||'/tmp/claude-0/qa/sheet';
const CHROME=process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let chromium;
try{ chromium=require(process.env.PW?path.join(process.env.PW,'index.js'):'playwright-core').chromium; }
catch(e){ console.log('playwright-core not installed; skipping.'); process.exit(0); }

(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch({executablePath:CHROME,
    args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
  const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,
    isMobile:true,hasTouch:true});
  const p=await c.newPage();
  const shots=[];
  const grab=async(name,full)=>{
    const t=full?p:await p.$('#scene');
    await t.screenshot({path:path.join(OUT,name+'.png')});
    shots.push(name);
  };
  await p.goto(PAGE);
  await p.waitForFunction(()=>typeof G!=='undefined');
  await p.waitForTimeout(1400);
  await grab('00-title',true);

  await p.click('[data-cmd="fire"]',{force:true});
  await p.click('[data-cmd="fire"]',{force:true});
  await p.waitForFunction(()=>G.phase==='dialogue');

  const ids=await p.evaluate(()=>CAST.map(e=>e.id));
  for(let i=0;i<ids.length;i++){
    await p.evaluate(n=>{
      G.encounter=n; beginEncounter(G); openDialogue(G);
      newSeq(); newScene(); build.rows=10; paint();
    },i);
    await p.waitForTimeout(2700);                       // let him finish walking in
    await grab(String(i+1).padStart(2,'0')+'-'+ids[i],true);
  }
  /* the three states a scene can turn into */
  await p.evaluate(()=>{G.encounter=0;beginEncounter(G);openDialogue(G);
    build.rows=10;drawGun(G,performance.now());aimAt(G,'torso');paint();});
  await p.waitForTimeout(700); await grab('20-sights',true);
  await p.evaluate(()=>{theyDraw(G,'draw');G.tell.delay=1e9;paint();});
  await p.waitForTimeout(700); await grab('21-he-draws',true);
  await p.evaluate(()=>{resolve(G,'killed_him');bodyFall=0.1;paint();});
  await p.waitForTimeout(900); await grab('22-killed',true);
  await p.evaluate(()=>{G.encounter=2;beginEncounter(G);openDialogue(G);
    build.rows=10;resolve(G,'doctor_came');G.blackout=true;paint();});
  await p.waitForTimeout(700); await grab('23-wounded',true);
  /* the three robberies, each in the place its own words put it */
  for(const job of ['stage','train','bank']){
    await p.evaluate(j=>{G.tips[j]=true;G.encounter=4;G.interlude=null;
      runInterlude(G,j);build.rows=10;paint();},job);
    await p.waitForTimeout(700); await grab('24-job-'+job,true);
  }
  /* the two reckonings */
  await p.evaluate(()=>{G.authority=11;G.arrests=2;G.dates=1;finish(G,'dusk');paint();});
  await p.waitForTimeout(700); await grab('25-sundown-alive',true);
  await p.evaluate(()=>{G.alive=false;G.authority=-2;G.arrests=0;G.dates=0;
    finish(G,'killed','a ball in the street');paint();});
  await p.waitForTimeout(700); await grab('26-sundown-dead',true);

  await b.close();
  console.log(shots.join('\n'));
  console.log('\n'+shots.length+' screens in '+OUT);
})().catch(e=>{console.error('contact sheet error:',e);process.exit(2);});
