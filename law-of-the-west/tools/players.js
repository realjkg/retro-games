#!/usr/bin/env node
/* A room full of players, playing the whole game over and over.
 *
 * The browser harness proves the page works. It cannot tell you whether the
 * day is worth playing twice, because one player walking one line through
 * eleven trees sees one day. This puts a group of them at it - each with his
 * own idea of how a sheriff talks, and one who plays to see what nobody has
 * seen yet - runs every one of them through the day from dawn to the sundown
 * table, and reports what the game actually gave back:
 *
 *   - which authored endings nobody can reach,
 *   - whether the sheriff lives or dies, and which reckoning he gets,
 *   - and, the thing that matters most, whether what he says changes what he
 *     hears: how many different transcripts a caller can produce, and how many
 *     of his lines are the same line whatever the sheriff said to earn them.
 *
 *   node tools/players.js [--days 60] [--quiet]
 * It exits non-zero when the day fails one of the standards at the bottom.  */
'use strict';
const path=require('path');
const {load}=require(path.join(__dirname,'..','test','harness.js'));

const arg=(k,d)=>{const i=process.argv.indexOf(k);return i>0?+process.argv[i+1]:d;};
const DAYS=arg('--days',60), QUIET=process.argv.indexOf('--quiet')>0;

const {run}=load();
const A=run('({newDay,beginEncounter,openDialogue,say,act,tick,nextEncounter,'+
  'who,nodeOf,npcOf,standing,CAST,RULES,drawGun,holster,shoot,aimAt,playerDraws,setAim,'+
  'terminal,resolve,finish,written,INTERLUDES})');

/* ---- how each of them plays ---- *
 * A reply is judged by where it goes, never by reading its words: the words
 * are the author's business and a player who picks by keyword is testing the
 * prose and not the game. */
const kindOf=r=>r.action?("act:"+r.action):r.end?"end":"next";
const firstBy=(reps,order)=>{
  for(const k of order){
    const i=reps.findIndex(r=>kindOf(r)===k||(k==='act'&&r.action));
    if(i>=0)return i;
  }
  return 0;
};
/* The memory the explorer plays out of: every reply anybody has ever taken. */
const seenEdge=new Set(), seenEnd=new Set();
const edgeKey=(id,node,i)=>id+'/'+node+'['+i+']';

const PLAYERS=[
  {name:'peacemaker', read:9000,                  // hears everyone out, never draws
   pick:(reps)=>firstBy(reps,['next','end'])},
  {name:'closer',     read:4000,                  // takes the first way out offered
   pick:(reps)=>firstBy(reps,['end','next'])},
  {name:'bully',      read:2500, gun:'late',      // leans on every one of them
   pick:(reps)=>reps.length-1},
  {name:'trigger',    read:1200, gun:'early',     // draws on everybody, talks after
   pick:(reps)=>firstBy(reps,['act','end','next'])},
  {name:'dawdler',    read:20000,                 // reads every word, slowly
   pick:(reps)=>0},
  {name:'drifter',    read:5000, rng:true,        // no plan at all
   pick:(reps,ctx)=>Math.floor(ctx.rnd()*reps.length)},
  {name:'explorer',   read:6000,                  // plays to see what nobody has
   pick:(reps,ctx)=>{
     /* An ending nobody has reached is worth more than a beat nobody has
      * heard, and both are worth more than a road already walked - otherwise
      * the room wanders the middle of the trees forever and the last few
      * endings are never seen by anybody. */
     const score=(r,i)=>
       (r.end&&!seenEnd.has(ctx.id+':'+r.end))?3
       :(!seenEdge.has(edgeKey(ctx.id,ctx.node,i)))?2
       :r.next?1:0;
     let best=0, pick=[];
     reps.forEach((r,i)=>{const v=score(r,i);
       if(v>best){best=v;pick=[i];} else if(v===best)pick.push(i);});
     return pick[Math.floor(ctx.rnd()*pick.length)];
   }}
];

/* ---- one day ---- */
function playDay(who_,seed){
  const G=A.newDay({seed:seed});
  let t=1000, rngState=seed*2654435761%2147483647||12345;
  const rnd=()=>{rngState=(rngState*48271)%2147483647;return rngState/2147483647;};
  const ctx={rnd:rnd,id:null,node:null};
  const step=ms=>{                       // time passing, in frames, as it does
    const end=t+ms, was=G.phase;
    while(t<end){ t+=50; A.tick(G,t); if(G.phase!==was)return false; }
    return true;
  };
  const day={who:who_.name,seed:seed,scenes:[],transcripts:[],over:null};
  A.beginEncounter(G); A.openDialogue(G);
  for(let guard=0;guard<2000&&G.phase!=='summary';guard++){
    const e=A.who(G), id=(e&&e.id)||G.interlude||'?';
    if(G.phase==='dialogue'){
      const n=A.nodeOf(G);
      if(!n){A.nextEncounter(G);continue;}
      ctx.id=id; ctx.node=G.node;
      // he reads the beat before he answers it, and the street keeps its clock
      if(!step(who_.read))continue;
      if(who_.gun==='early'&&G.mode!=='gun'&&!G.balked){A.drawGun(G,t);continue;}
      const i=Math.max(0,Math.min(n.replies.length-1,who_.pick(n.replies,ctx)));
      seenEdge.add(edgeKey(id,G.node,i));
      day.transcripts.push(id+'|'+G.node+'|'+A.npcOf(G,n).slice(0,40));
      A.say(G,i);
    }
    else if(G.phase==='aiming'){
      if(who_.gun==='early'&&G.balked){A.holster(G);continue;}
      A.aimAt(G,'arm'); if(!step(600))continue;
      A.shoot(G,320);
    }
    else if(G.phase==='tell'||G.phase==='duel'){
      const late=who_.gun==='early'?260:who_.name==='dawdler'?1400:520;
      A.aimAt(G,who_.name==='bully'?'torso':'arm');
      if(!step(late))continue;
      A.shoot(G,late);
    }
    else if(G.phase==='resolve'){
      if(G.outcome)seenEnd.add(id+':'+G.outcome);
      day.scenes.push({who:id,outcome:G.outcome,
        end:G.ending?(G.ending.flags||[]).join('+'):null});
      A.nextEncounter(G);
      if(G.phase==='approach')A.openDialogue(G);
    }
    // the caller is on the street but has not been spoken to yet; the page
    // opens the dialogue after the walk in, and so does the room
    else if(G.phase==='approach'){A.openDialogue(G);}
    else if(G.phase==='interlude'){A.nextEncounter(G);}
    else {day.scenes.push({who:id,outcome:'STUCK:'+G.phase});break;}
  }
  if(G.phase!=='summary')A.finish(G,'stuck');
  day.over=G.over; day.alive=G.alive; day.wounds=G.wounds;
  return day;
}

/* ---- the whole cast's written shape, to measure the days against ---- */
const shape=run(`(()=>{
  const out={};
  for(const e of CAST){
    if(!written(e)){out[e.id]={written:false};continue;}
    const ends=Object.keys(e.ends||{});
    const nodes=Object.keys(e.rounds||{});
    // how many different ways into each node there are: a node two or more
    // replies reach is a node the caller says the same thing at, however he
    // got there - which is where cause and effect goes to die
    const into={};
    for(const n of nodes)for(const r of (e.rounds[n].replies||[]))
      if(r.next)into[r.next]=(into[r.next]||0)+1;
    out[e.id]={written:true,ends:ends,nodes:nodes,into:into,
      converged:nodes.filter(n=>(into[n]||0)>1),
      variants:nodes.filter(n=>e.rounds[n].npcIf)};
  }
  return JSON.stringify(out);
})()`);
const SHAPE=JSON.parse(shape);

/* ---- the room ---- *
 * First a fixed rotation, so every idea of how a sheriff talks gets the same
 * number of days and the survival figures mean something. Then the explorer
 * keeps going on his own: he has the memory of everything anybody has reached,
 * and he plays until there is nothing left to reach or until a long run of
 * days turns up nothing new. A fixed day count cannot do this - the last two
 * or three endings sit behind a coin flip and a particular road, and whether
 * anybody finds them comes down to how many days you happened to ask for. */
const days=[];
for(let d=0;d<DAYS;d++)days.push(playDay(PLAYERS[d%PLAYERS.length],1+d*7919));

const EXPLORER=PLAYERS.find(p=>p.name==='explorer');
/* Only the authored endings count as ground to cover. seenEnd also collects
 * the outcomes the gun produces and the robberies, which would say the job
 * was done while two written endings had still never been read by anybody. */
const AUTHORED=new Set();
for(const id of Object.keys(SHAPE))
  if(SHAPE[id].written)for(const k of SHAPE[id].ends)AUTHORED.add(id+':'+k);
const covered=()=>[...AUTHORED].filter(k=>seenEnd.has(k)).length;
let extra=0, barren=0;
for(let d=0;d<900&&covered()<AUTHORED.size;d++){
  const before=covered();
  days.push(playDay(EXPLORER,1000003+d*104729));
  extra++;
  barren=covered()>before?0:barren+1;
  if(barren>=250)break;                 // it has stopped finding anything
}

const fail=[], note=[];
const ok=(c,m)=>{ if(!c)fail.push(m); return c; };

/* endings reached against endings authored */
const reached={}, missed=[];
for(const day of days)for(const s of day.scenes)
  if(s.outcome)(reached[s.who]=reached[s.who]||new Set()).add(s.outcome);
let authored=0, got=0;
for(const id of Object.keys(SHAPE)){
  if(!SHAPE[id].written)continue;
  authored+=SHAPE[id].ends.length;
  const hit=reached[id]||new Set();
  for(const k of SHAPE[id].ends)if(hit.has(k))got++; else missed.push(id+':'+k);
}
note.push('authored endings reached by the room: '+got+' of '+authored);
note.push('  the explorer went on for '+extra+' days of his own after the rotation');
if(missed.length)note.push('  never reached: '+missed.join(' '));

/* the sheriff lives, and the sheriff dies, and both get a reckoning */
const lived=days.filter(d=>d.alive), died=days.filter(d=>!d.alive);
const band=d=>d.over&&d.over.score>=400?'respect':'disgrace';
note.push('days: '+days.length+'  survived: '+lived.length+'  killed: '+died.length);
note.push('reckonings: '+['respect','disgrace'].map(b=>
  b+' '+days.filter(d=>band(d)===b).length).join(', '));
const byPlayer={};
for(const d of days){
  const p=byPlayer[d.who]=byPlayer[d.who]||{n:0,alive:0,score:0,scenes:0};
  p.n++; p.alive+=d.alive?1:0; p.score+=(d.over&&d.over.score)||0; p.scenes+=d.scenes.length;
  if(!d.alive)(p.fell=p.fell||{})[d.scenes.length?d.scenes[d.scenes.length-1].who:'?']=
    ((p.fell||{})[d.scenes.length?d.scenes[d.scenes.length-1].who:'?']||0)+1;
}
note.push('by player:');
for(const k of Object.keys(byPlayer)){
  const p=byPlayer[k];
  note.push('  '+k.padEnd(11)+'lived '+String(p.alive+'/'+p.n).padEnd(7)+
    'mean score '+String(Math.round(p.score/p.n)).padStart(5)+
    '   scenes '+Math.round(p.scenes/p.n)+
    (p.fell?'   fell at '+Object.keys(p.fell).map(k=>k+'x'+p.fell[k]).join(' '):''));
}

/* ---- the thing this tool exists for: does what he says change what he hears? ---- */
note.push('cause and effect, caller by caller:');
let railed=[], echoes=0, nodesTotal=0;
for(const id of Object.keys(SHAPE)){
  const s=SHAPE[id]; if(!s.written)continue;
  nodesTotal+=s.nodes.length; echoes+=s.variants.length;
  const heard=new Set();
  for(const day of days)for(const line of day.transcripts)
    if(line.split('|')[0]===id)heard.add(line);
  const conv=s.converged.length;
  note.push('  '+id.padEnd(9)+s.nodes.length+' beats, '+s.ends.length+' endings, '+
    conv+' reached more than one way, '+s.variants.length+' that answer back');
  if(s.nodes.length>1&&s.variants.length===0&&conv>0)railed.push(id);
}
note.push('beats whose words change with how the sheriff got there: '+
  echoes+' of '+nodesTotal);

ok(got===authored,'the room could not reach '+(authored-got)+' authored endings: '+
  missed.join(' '));
ok(lived.length>0,'nobody survived the day, in '+days.length+' tries');
ok(died.length>0,'nobody could get killed, in '+days.length+' tries');
ok(days.filter(d=>band(d)==='respect').length>0,'no day ever earned the town’s respect');
ok(days.filter(d=>band(d)==='disgrace').length>0,'no day ever ended in disgrace');
ok(!days.some(d=>d.scenes.some(s=>/^STUCK/.test(s.outcome))),
  'a player got stuck: '+JSON.stringify((days.find(d=>d.scenes.some(s=>/^STUCK/.test(s.outcome)))||{}).scenes));
ok(echoes>=nodesTotal*0.25,
  'only '+echoes+' of '+nodesTotal+' beats answer back differently depending on how '+
  'the sheriff got there — the rest say the same words whatever he said');
ok(railed.length===0,'these callers say the same thing however you treat them: '+
  railed.join(', '));
for(const k of Object.keys(byPlayer)){
  const p=byPlayer[k];
  if(p.alive===0&&p.fell&&Object.keys(p.fell).length===1)
    fail.push(k+' dies in the same place every single day: '+Object.keys(p.fell)[0]);
}

if(!QUIET){ console.log('\n--- the room ---'); for(const n of note)console.log('  '+n); }
console.log('\n--- '+(fail.length?fail.length+' FAILURES':'all clear')+' ---');
for(const f of fail)console.log('  FAIL  '+f);
process.exit(fail.length?1:0);
