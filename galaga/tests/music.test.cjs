// The tunes. Nothing here can tell you whether they sound like Galaga — that
// needs ears, and tools/music.js draws them so a person can at least look. What
// it can tell you is that every note is a note, that the parts of a tune are
// the same length as each other, and that starting a game actually plays one.
const test=require('node:test'),assert=require('node:assert');
const {runtime}=require('./harness.cjs');

const beats=line=>line.trim().split(/\s+/)
  .reduce((a,tok)=>a+(+tok.split(':')[1]||1),0);

test('the scale is the scale', ()=>{
  const r=runtime();
  assert.equal(Math.round(+r.run(`hz('A4')`)),440);
  assert.equal(Math.round(+r.run(`hz('C5')`)*100)/100,523.25);
  assert.equal(Math.round(+r.run(`hz('A3')`)),220);
  assert.equal(Math.round(+r.run(`hz('A5')`)),880);
  assert.equal(+r.run(`hz('-')`),0,'a rest has to be silent');
  assert.equal(+r.run(`hz('H9')`),0,'a note that is not a note has to be silent');
});

test('every note in every tune is one the scale knows', ()=>{
  const r=runtime();
  const tunes=r.j('Object.keys(TUNES)');
  for(const k of tunes){
    const parts=r.j(`TUNES['${k}'].parts`);
    for(const[voice,line]of parts){
      assert.ok(r.j(`Object.keys(VOICES)`).includes(voice),
        k+': there is no voice called '+voice);
      for(const tok of line.trim().split(/\s+/)){
        const[n,b]=tok.split(':');
        if(n!=='-')assert.ok(+r.run(`hz('${n}')`)>0,k+': '+n+' is not a note');
        assert.ok(+b>0||b===undefined,k+': '+tok+' has no length');
      }
    }
  }
});

test('the parts of a tune are the same length as each other', ()=>{
  // A bass line that runs out two beats early is the sort of thing you hear
  // once and then spend ten minutes looking for.
  const r=runtime();
  for(const k of r.j('Object.keys(TUNES)')){
    const parts=r.j(`TUNES['${k}'].parts`);
    const lens=parts.map(([v,l])=>beats(l));
    assert.ok(lens.every(x=>Math.abs(x-lens[0])<1e-9),
      k+': the parts run '+lens.join(' / ')+' beats');
  }
});

test('the fanfare is a fanfare, not a blip', ()=>{
  const r=runtime();
  const parts=r.j(`TUNES.start.parts`);
  assert.ok(parts.length>=3,'the theme has only '+parts.length+' voice(s)');
  const bars=beats(parts[0][1])/4;
  assert.ok(bars>=4,'the theme is '+bars+' bars long');
  const secs=beats(parts[0][1])*60/+r.run('TUNES.start.bpm');
  assert.ok(secs>4&&secs<12,'the theme runs '+secs.toFixed(1)+' seconds');
});

test('starting a game plays the theme, and silence means silence', ()=>{
  const r=runtime();
  r.run(`Snd.on=true;Snd.ctx=null;`);
  const before=r.notes.length;
  r.run(`newGame();`);
  assert.ok(r.notes.length-before>30,
    'starting a game scheduled '+(r.notes.length-before)+' notes');
  r.run(`Snd.on=false;`);
  const quiet=r.notes.length;
  r.run(`Music.play(TUNES.start);`);
  assert.equal(r.notes.length,quiet,'it played with the sound switched off');
});
