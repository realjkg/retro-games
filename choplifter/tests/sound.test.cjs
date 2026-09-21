// Run with node --test tests/sound.test.cjs. No packages required.
// The audio context is a stub, so what these read is the numbers the page
// computes before it hands them to one - which is the part that decides what
// you hear, and the only part a machine with no speakers can check.
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {runtime,step,clear,source}=require('./harness.cjs');

test('Out of the box it runs the way 1982 ran: no score, just the blades',()=>{
  const r=runtime(2,101);
  assert.equal(r.run('MUSIC.on'),false,'there is no music until somebody asks for it');
  assert.equal(r.run('AUDIO.rotor'),true,'and the blades are the sound');
  assert.equal(r.run('SOUND.enabled'),true);
  // The Apple II had one bit of sound and spent it on the rotor; it took a
  // certificate for its effects, not for a score, and there is no score of the
  // original to transcribe even if transcribing one were the idea.
  assert.ok(/no music at all/.test(source),'the page says why, where the code is');
});

test('The blades answer the collective',()=>{
  const r=runtime(2,102);clear(r);
  r.run('G.h.landed=false;G.h.y=70;G.h.vy=0;keys.HOLD=true;bladesTick();');
  const hover={hz:r.run('BLADES.hz'),beat:r.run('BLADES.beat')};
  assert.ok(hover.hz>0&&hover.beat>0,'hovering, she is still turning over');
  r.run('delete keys.HOLD;stick.held=true;stick.x=0;stick.y=-1;');
  step(r,40);r.run('bladesTick();');
  const climb={hz:r.run('BLADES.hz'),beat:r.run('BLADES.beat')};
  assert.ok(climb.hz>hover.hz+4,
    'pulling up leans on the engine ('+hover.hz.toFixed(1)+' -> '+climb.hz.toFixed(1)+')');
  assert.ok(climb.beat>hover.beat,'and brings the blades round faster');
  // Two blades at the rate the picture turns at, which is what makes the sound
  // and the screen the same machine.
  assert.ok(Math.abs(hover.beat-r.run('26/Math.PI'))<.01,
    'the blade-pass rate is the one the rotor is drawn at');
});

test('Down is silent, and so is the switch',()=>{
  const r=runtime(2,103);clear(r);
  r.run('G.h.landed=false;G.h.y=70;bladesTick();');
  assert.ok(r.run('BLADES.level')>0);
  r.run('G.downT=2;bladesTick();');
  assert.equal(r.run('BLADES.level'),0,'a machine that is down is not turning over');
  assert.equal(r.run('BLADES.hz'),0);
  r.run('G.downT=0;setRotor(false);bladesTick();');
  assert.equal(r.run('BLADES.level'),0,'and the switch is a switch');
  r.run('setRotor(true);SOUND.enabled=false;bladesTick();');
  assert.equal(r.run('BLADES.level'),0,'so is SOUND OFF');
  r.run('SOUND.enabled=true;G.phase="menu";bladesTick();');
  assert.equal(r.run('BLADES.level'),0,'nothing turns over on the title card');
});

test('Both switches are remembered, and the default survives a first visit',()=>{
  const store=new Map();
  const first=runtime(2,104,true,store);
  assert.equal(first.run('MUSIC.on'),false);
  first.run('setMusic(true);setRotor(false);');
  const back=runtime(2,104,false,store);
  assert.equal(back.run('MUSIC.on'),true,'music asked for is music remembered');
  assert.equal(back.run('AUDIO.rotor'),false,'and blades switched off stay off');
  back.run('setMusic(false);setRotor(true);');
  const third=runtime(2,104,false,store);
  assert.equal(third.run('MUSIC.on'),false);
  assert.equal(third.run('AUDIO.rotor'),true);
});

test('The score is four voices of sixteen, and it follows the situation',()=>{
  const r=runtime(2,105);clear(r);
  // Joined, because an array out of the vm is another realm's Array and
  // deepEqual will not have it.
  const cues=r.run('Object.keys(PATTERNS).sort().join(",")').split(",");
  assert.equal(cues.join(","),'field,home,hot,title,win');
  for(const c of cues)
    for(const v of ['ost','lead','bass','drum'])
      assert.equal(r.run(`PATTERNS[${JSON.stringify(c)}][${JSON.stringify(v)}].length`),16,
        c+'.'+v+' is sixteen steps');
  // Nothing plays while the switch is off, whatever the situation.
  assert.equal(r.run('musicWanted()'),null);
  r.run('setMusic(true);');
  r.run('G.h.x=POST_X;');
  assert.equal(r.run('musicWanted()'),'home','over your own ground');
  r.run('G.h.x=HUTS[0];');
  assert.equal(r.run('musicWanted()'),'field','and over theirs');
  r.run('G.threat=2;');
  assert.equal(r.run('musicWanted()'),'hot','and while something is shooting at you');
  r.run('G.threat=0;G.phase="menu";');
  assert.equal(r.run('musicWanted()'),'title');
});
