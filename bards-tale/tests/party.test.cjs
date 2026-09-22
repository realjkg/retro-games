// Characters, what they may carry, and what happens to them in a fight.
const test=require('node:test'),assert=require('node:assert');
const {runtime,withParty}=require('./harness.cjs');

test('a race moves the numbers it says it moves', ()=>{
  const r=runtime();
  const avg=(race,stat)=>{
    let t=0;for(let i=0;i<400;i++)t+=r.j(`rollStats('${race}')`)[stat];
    return t/400;
  };
  assert.ok(avg('dwarf','cn')-avg('elf','cn')>3.5,'a dwarf is no sturdier than an elf');
  assert.ok(avg('hobbit','dx')-avg('dwarf','dx')>3.5,'a hobbit is no nimbler than a dwarf');
});

test('a class you have not rolled for is shut to you', ()=>{
  const r=runtime();
  assert.equal(r.run(`String(meetsReq({st:9,iq:9,dx:9,cn:9,lk:9},'wizard'))`),'false');
  assert.equal(r.run(`String(meetsReq({st:18,iq:18,dx:18,cn:18,lk:18},'wizard'))`),'true');
  assert.equal(r.run(`String(meetsReq({st:18,iq:9,dx:9,cn:9,lk:9},'warrior'))`),'true');
});

test('a magician cannot put on plate mail and a warrior can', ()=>{
  const r=withParty(runtime());
  const mage=+r.run(`P.roster.findIndex(p=>p.cls==='magician')`);
  const warr=+r.run(`P.roster.findIndex(p=>p.cls==='warrior')`);
  assert.equal(r.run(`String(canUse(P.roster[${mage}],'plate'))`),'false');
  assert.equal(r.run(`String(canUse(P.roster[${warr}],'plate'))`),'true');
  assert.equal(r.run(`String(canUse(P.roster[${mage}],'staff'))`),'true');
  r.run(`P.roster[${mage}].pack.push('plate');equipBest(P.roster[${mage}]);`);
  assert.notEqual(r.run(`String(P.roster[${mage}].gear.body)`),'plate',
    'the magician got into plate through the pack');
});

test('better armour goes on, and it shows in the armour class', ()=>{
  const r=withParty(runtime());
  const i=+r.run(`P.roster.findIndex(p=>p.cls==='warrior')`);
  const before=+r.run(`acOf(P.roster[${i}])`);
  r.run(`P.roster[${i}].pack.push('plate');equipBest(P.roster[${i}]);`);
  const after=+r.run(`acOf(P.roster[${i}])`);
  assert.equal(r.run(`P.roster[${i}].gear.body`),'plate');
  assert.ok(after<before,'plate mail made no difference: '+before+' to '+after);
});

test('a hit takes hit points off the front one of a group', ()=>{
  const r=withParty(runtime());
  r.run(`P.depth=1;startFight(['rat'],false);closeFightbar();hideOverlay();`);
  const before=r.j('P.fight.groups[0].list.map(u=>u.hp)');
  r.run(`hurtGroup(P.fight.groups[0],2);`);
  const after=r.j('P.fight.groups[0].list.map(u=>u.hp)');
  assert.equal(after[0],before[0]-2);
  assert.deepEqual(after.slice(1),before.slice(1),'the damage spread down the rank');
});

test('a group is only dead when every one of it is', ()=>{
  const r=withParty(runtime());
  r.run(`P.depth=1;startFight(['kobold'],false);closeFightbar();hideOverlay();`);
  const n=+r.run('P.fight.groups[0].list.length');
  for(let i=0;i<n-1;i++)r.run(`hurtGroup(P.fight.groups[0],999);`);
  assert.equal(r.run('String(groupAlive(P.fight.groups[0]))'),'true');
  r.run(`hurtGroup(P.fight.groups[0],999);`);
  assert.equal(r.run('String(groupAlive(P.fight.groups[0]))'),'false');
});

test('clearing the floor pays experience and gold', ()=>{
  const r=withParty(runtime());
  r.run(`P.depth=1;P.gold=0;startFight(['rat'],false);closeFightbar();hideOverlay();
    P.roster.forEach(p=>p.xp=0);
    P.fight.groups[0].list.forEach(u=>u.alive=false);`);
  assert.equal(r.run('String(victory())'),'true');
  assert.ok(+r.run('P.roster[0].xp')>0,'no experience');
  assert.ok(+r.run('P.gold')>0,'no gold');
  assert.equal(r.run('String(P.fight)'),'null');
});

test('only the four in front are in reach of what is swinging', ()=>{
  const r=withParty(runtime());
  const names=r.j('front().map(p=>p.name)');
  assert.deepEqual(names,r.j('P.roster.slice(0,4).map(p=>p.name)'));
  r.run(`P.roster[0].status='dead';P.roster[0].hp=0;`);
  assert.equal(r.j('front().length'),4,'the fifth did not step up');
  assert.equal(r.j('front().map(p=>p.name)')[3],r.j('P.roster[4].name'));
});

test('you cannot run from the thing on the bottom floor', ()=>{
  const r=withParty(runtime());
  r.run(`P.depth=3;startFight(['madgod'],true);closeFightbar();hideOverlay();`);
  assert.equal(r.run('String(tryRun())'),'false');
  assert.ok(r.run('String(P.fight)')!=='null','it let you go anyway');
});

test('poison takes a point a step and can finish somebody', ()=>{
  const r=withParty(runtime());
  r.run(`P.roster[0].status='poisoned';P.roster[0].hp=3;tick(2);`);
  assert.equal(+r.run('P.roster[0].hp'),1);
  r.run(`tick(2);`);
  assert.equal(r.run('P.roster[0].status'),'dead');
});

test('a level costs the experience it is worth and pays in hit points', ()=>{
  const r=withParty(runtime());
  r.run(`P.roster[0].lvl=1;P.roster[0].xp=0;P.roster[0].maxhp=10;P.roster[0].hp=10;`);
  const need=+r.run('nextXp(P.roster[0])');
  r.run(`P.roster[0].xp=${need};levelUp(P.roster[0]);`);
  assert.equal(+r.run('P.roster[0].lvl'),2);
  assert.equal(+r.run('P.roster[0].xp'),0);
  assert.ok(+r.run('P.roster[0].maxhp')>10,'no hit points for the level');
});

test('spells arrive as the caster gets older', ()=>{
  const r=withParty(runtime());
  const i=+r.run(`P.roster.findIndex(p=>p.cls==='magician')`);
  r.run(`P.roster[${i}].lvl=1;`);
  const at1=r.j(`knownSpells(P.roster[${i}]).map(s=>s.code)`);
  r.run(`P.roster[${i}].lvl=6;`);
  const at6=r.j(`knownSpells(P.roster[${i}]).map(s=>s.code)`);
  assert.ok(at1.length>=1,'a first-level magician knows nothing at all');
  assert.ok(at6.length>at1.length,'nothing new by level six');
  assert.ok(at6.every(c=>r.j(`SPELL_BY_CODE['${c}'].cls`)==='ma'),
    'a magician learned somebody else\'s spell');
});

test('a spell costs its points and a caster without them cannot', ()=>{
  const r=withParty(runtime());
  const i=+r.run(`P.roster.findIndex(p=>p.cls==='magician')`);
  r.run(`P.depth=1;startFight(['rat'],false);closeFightbar();hideOverlay();
    P.roster[${i}].sp=20;`);
  r.run(`castAt(P.roster[${i}],SPELL_BY_CODE.ARFI,0);`);
  assert.equal(+r.run(`P.roster[${i}].sp`),17);
  r.run(`P.roster[${i}].sp=0;castAt(P.roster[${i}],SPELL_BY_CODE.ARFI,0);`);
  assert.equal(+r.run(`P.roster[${i}].sp`),0,'it cast on an empty pool');
});

test('a song costs a swallow and puts a bonus on the party', ()=>{
  const r=withParty(runtime());
  const i=+r.run(`P.roster.findIndex(p=>p.cls==='bard')`);
  r.run(`P.roster[${i}].flask=2;P.buff={};P.buffT={};sing(P.roster[${i}],0);`);
  assert.equal(+r.run(`P.roster[${i}].flask`),1);
  assert.ok(+r.run('P.buff.ac')>0,'Sanctuary Score did nothing');
  r.run(`tick(99);`);
  assert.equal(r.run('String(P.buff.ac)'),'undefined','the song never ended');
});

test('the temple will not raise somebody for nothing', ()=>{
  const r=withParty(runtime());
  r.run(`P.roster[0].status='dead';P.roster[0].hp=0;P.gold=0;temple();`);
  assert.equal(r.run('P.roster[0].status'),'dead');
});

test('a saved party comes back the same party', ()=>{
  const r=withParty(runtime());
  r.run(`P.depth=2;P.x=5;P.y=7;P.dir=3;P.gold=777;P.roster[0].hp=4;saveGame();`);
  const before=r.j('P.roster');
  r.run(`P.roster=[];P.gold=0;P.depth=0;`);
  assert.equal(r.run('String(loadGame())'),'true');
  assert.equal(+r.run('P.gold'),777);
  assert.equal(+r.run('P.depth'),2);
  assert.equal(+r.run('P.dir'),3);
  assert.deepEqual(r.j('P.roster'),before);
});
