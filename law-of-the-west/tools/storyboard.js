#!/usr/bin/env node
/* The day as a storyboard, read the way a player meets it.
 *
 * Eleven encounters are eleven scenes, and a scene works when three things are
 * true of it: the player can tell what a choice is likely to cost before he
 * makes it, he is told what it cost afterwards, and the sound tells him which
 * kind of moment he is in before he has read a word. This walks every caller
 * and reports on those three, per scene, and fails on the ones that are
 * missing rather than on a checklist of my own.
 *
 *   node tools/storyboard.js
 */
'use strict';
const path=require('path');
const {load}=require(path.join(__dirname,'..','test','harness.js'));
const {run}=load();

const B=JSON.parse(run(`(()=>{
  const out={cast:[], jobs:Object.keys(JOBS).length, cues:{}};
  for(const e of CAST){
    const s={id:e.id, name:e.name, place:e.place, armed:!!e.armed,
      theme:e.theme||null, arrive:(e.arrive||[]).slice(),
      temper:e.temper||null, written:written(e),
      hatline:!!e.hatline, balk:!!e.balk, standoff:!!e.standoff,
      neverDraws:!!e.neverDraws,
      beats:0, replies:0, endings:[], gun:0, talk:0, deep:0, flags:{}, acts:{}};
    if(written(e)){
      const nodes=Object.keys(e.rounds);
      s.beats=nodes.length;
      for(const n of nodes)for(const r of (e.rounds[n].replies||[])){
        s.replies++;
        if(r.action){s.gun++; s.acts[r.action]=1;}
        else if(r.end)s.talk++; else s.deep++;
      }
      for(const k of Object.keys(e.ends||{})){
        const t=e.ends[k];
        s.endings.push({id:k, authority:t.authority||0,
          flags:(t.flags||[]).slice(), words:(t.text||"").length});
        for(const f of (t.flags||[]))s.flags[f]=1;
      }
    }
    out.cast.push(s);
  }
  return JSON.stringify(out);
})()`));

const fail=[], note=[];
const ok=(c,m)=>{ if(!c)fail.push(m); };

note.push('scene by scene, as a player meets them:');
note.push('  #  who       place       armed  theme          beats  ways out  '+
          'talk/gun  hat  balk');
B.cast.forEach((s,i)=>{
  note.push('  '+String(i+1).padStart(2)+' '+s.id.padEnd(10)+
    (s.place||'').padEnd(12)+(s.armed?'yes   ':'no    ')+
    (s.theme||'(none)').padEnd(15)+String(s.beats).padStart(3)+
    String(s.endings.length).padStart(10)+
    String(s.talk+'/'+s.gun).padStart(10)+
    (s.hatline?'   y':'   -')+(s.balk?'     y':'     -'));
});

/* 1. every scene must sound like itself before it reads like itself */
const themes=B.cast.map(s=>s.theme).filter(Boolean);
ok(new Set(themes).size===themes.length,
  'two callers arrive on the same music: '+themes.join(' '));
for(const s of B.cast)
  ok(s.theme,s.id+' arrives in silence — nothing tells the player who this is');

/* 2. a choice must be able to cost something, and the costs must differ.
 *    A reply answered with a hand rather than a sentence is a way out of the
 *    scene too, worth what the engine says it is worth: these are read off
 *    act() rather than guessed at. */
const ACT={surrender:1, depart:0, delayed:0, trick:-2, draw:0, ambush:0};
for(const s of B.cast){
  if(!s.written)continue;
  const acts=Object.keys(s.acts);
  const worth=s.endings.map(e=>e.authority).concat(acts.map(k=>ACT[k]));
  ok(s.endings.length+acts.length>=2,s.id+' has only one way out of the scene');
  ok(new Set(worth).size>=2,
    s.id+': every way out of him is worth the same '+[...new Set(worth)][0]+
    ' to the sheriff, so the choice costs nothing either way');
}

/* 3. the player must be told what it cost. Every ending carries words, and
 *    an ending that moves the score must move something the player can see. */
for(const s of B.cast)for(const e of s.endings){
  ok(e.words>40,s.id+'/'+e.id+' ends in '+e.words+' characters');
  ok(e.authority!==0||e.flags.length>0,
    s.id+'/'+e.id+' changes nothing and says nothing happened');
}

/* 4. an armed man must be able to make it a gunfight, and an unarmed one
 *    must not be treated as one */
for(const s of B.cast){
  if(!s.written)continue;
  /* An armed man must be able to have it come to the gun - unless the writing
   * says in so many words that he will not, which is a decision and is allowed
   * to be one so long as it is written down rather than merely absent. */
  if(s.armed&&!s.neverDraws)ok(s.acts.draw||s.acts.ambush||s.acts.surrender,
    s.id+' carries a gun and nothing the sheriff says ever brings it into it');
  if(s.neverDraws)ok(s.hatline&&s.balk,
    s.id+' will never draw and has no other way for the gun to matter to him');
  ok(s.balk||!s.armed,s.id+' has no words for having a gun put in his face');
}

/* 5. the scoring the day is judged on must actually be exercised by the cast */
const all={};
for(const s of B.cast){
  for(const f of Object.keys(s.flags))all[f]=(all[f]||0)+1;
  if(s.acts.surrender)all.arrest=(all.arrest||0)+1;
  if(s.acts.depart)all.depart=(all.depart||0)+1;
  if(s.acts.trick)all.outsmarted=(all.outsmarted||0)+1;
}
note.push('what the eleven between them can produce: '+
  Object.keys(all).map(k=>k+'×'+all[k]).join(' '));
for(const f of ['date','arrest','depart','offended','tip_train','tip_stage','tip_bank'])
  ok(all[f]>0,'nothing in the whole day can produce "'+f+'"');

console.log('\n--- the storyboard ---');
for(const n of note)console.log('  '+n);
console.log('\n--- '+(fail.length?fail.length+' FAILURES':'all clear')+' ---');
for(const f of fail)console.log('  FAIL  '+f);
process.exit(fail.length?1:0);
