// The shared coin-op module: the table, the initials and the save slot.
//
// The entry screen itself is DOM and is checked in a real browser by
// tools/arcade-check.js, which also proves every game is wired to it. What is
// here is the part that decides who gets on the table and what is kept.
const test=require('node:test'),assert=require('node:assert');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');

function load(opts){
  const src=fs.readFileSync(path.join(__dirname,'..','shared','arcade.js'),'utf8');
  const store=new Map();
  const el=()=>({style:{},className:'',textContent:'',innerHTML:'',id:'',
    appendChild(){},removeChild(){},setAttribute(){},addEventListener(){},
    querySelector(){return el();},parentNode:null});
  const box={console,Math,Date,JSON,String,Number,Array,Object,isFinite,
    document:{body:el(),head:el(),documentElement:el(),
      getElementById(){return null;},createElement(){return el();},
      addEventListener(){},removeEventListener(){}},
    localStorage:{
      getItem:k=>store.has(k)?store.get(k):null,
      setItem:(k,v)=>{if(opts&&opts.readonly)throw new Error('quota');store.set(k,String(v));},
      removeItem:k=>store.delete(k)}};
  box.window=box;box.globalThis=box;
  vm.createContext(box);
  vm.runInContext(src,box);
  return{A:box.window.Arcade,store,box};
}

test('two games do not see each other\'s table', ()=>{
  const {A,store}=load();
  A.init({game:'galaga'}).record('ABC',5000);
  A.init({game:'drol'}).record('XYZ',10);
  assert.deepEqual(A.table().map(r=>r.ini),['XYZ']);
  A.init({game:'galaga'});
  assert.deepEqual(A.table().map(r=>r.ini),['ABC']);
  assert.ok(store.has('arcade.galaga.scores')&&store.has('arcade.drol.scores'),
    'the keys are not namespaced per game');
});

test('the table sorts, caps and keeps the earlier of two equal scores', ()=>{
  const {A}=load();
  A.init({game:'g',slots:3});
  A.record('AAA',100);A.record('BBB',300);A.record('CCC',200);A.record('DDD',50);
  assert.deepEqual(A.table().map(r=>r.ini),['BBB','CCC','AAA'],'not sorted, or not capped');
  assert.equal(A.table().length,3);
  const {A:B}=load();
  B.init({game:'g',slots:8});
  const first=B.record('EAR',777);
  B.record('LTR',777);
  assert.equal(B.table()[0].ini,'EAR','a later equal score jumped the earlier one');
  assert.ok(first.at<=B.table()[1].at);
});

test('a score gets in while there is room, and has to beat the last row after', ()=>{
  const {A}=load();
  A.init({game:'g',slots:2});
  assert.equal(A.qualifies(1),true,'an empty table turned somebody away');
  A.record('AAA',100);A.record('BBB',200);
  assert.equal(A.qualifies(150),true);
  assert.equal(A.qualifies(100),false,'equalling the last row got in');
  assert.equal(A.qualifies(0),false,'nothing got on the table');
  assert.equal(A.qualifies(-5),false);
  assert.equal(A.qualifies(NaN),false);
  assert.equal(A.qualifies('900'),false,'a string got on the table');
});

test('initials are three upper-case characters, whatever is handed in', ()=>{
  const {A}=load();
  A.init({game:'g'});
  assert.equal(A.record('abcd',10).ini,'ABC');
  assert.equal(A.record('',20).ini,'AAA');
  assert.equal(A.record(null,30).ini,'AAA');
});

test('the extra column is kept with the score', ()=>{
  const {A}=load();
  A.init({game:'g',extraLabel:'STAGE'});
  A.record('BRN',4200,'STAGE 9');
  assert.equal(A.table()[0].extra,'STAGE 9');
});

test('a slot is kept under three letters and given back by them', ()=>{
  const {A}=load();
  A.init({game:'g'});
  assert.equal(A.hasSlots(),false);
  assert.equal(A.slotFor('BRN'),null);
  const w=A.writeSlot('BRN',{stage:7,party:['a','b']},'STAGE 7');
  assert.equal(w.ini,'BRN');
  assert.equal(A.hasSlots(),true);
  assert.deepEqual(A.slotFor('BRN').state,{stage:7,party:['a','b']});
  assert.equal(A.slotFor('BRN').extra,'STAGE 7');
  assert.ok(A.slotFor('BRN').at>0,'the slot did not record when it was written');
  assert.equal(A.slotFor('brn').ini,'BRN','initials are matched case-insensitively');
});

test('two players keep their own game on the same machine', ()=>{
  // This is the whole reason the slot has a name on it.
  const {A}=load();
  A.init({game:'g'});
  A.writeSlot('ACE',{who:'ace'});
  A.writeSlot('BRN',{who:'brn'});
  assert.equal(A.slots().length,2);
  assert.deepEqual(A.slotFor('ACE').state,{who:'ace'});
  assert.deepEqual(A.slotFor('BRN').state,{who:'brn'});
  A.dropSlot('ACE');
  assert.equal(A.slotFor('ACE'),null);
  assert.deepEqual(A.slotFor('BRN').state,{who:'brn'},'dropping one took the other');
});

test('saving again under the same letters replaces that slot, not the rest', ()=>{
  const {A}=load();
  A.init({game:'g'});
  A.writeSlot('ACE',{n:1});
  A.writeSlot('BRN',{n:2});
  A.writeSlot('ACE',{n:3});
  assert.equal(A.slots().length,2,'it kept two games for one set of initials');
  assert.deepEqual(A.slotFor('ACE').state,{n:3});
});

test('the newest slot is first, and the oldest goes when it is full', ()=>{
  const {A}=load();
  A.init({game:'g',slots:3});
  ['AAA','BBB','CCC','DDD'].forEach(i=>A.writeSlot(i,{i}));
  const kept=A.slots().map(s=>s.ini);
  assert.equal(kept.length,3,'it kept more slots than it has');
  assert.equal(kept[0],'DDD','the newest is not first');
  assert.ok(!kept.includes('AAA'),'the oldest survived a full table');
});

test('the slots are per game too', ()=>{
  const {A}=load();
  A.init({game:'one'});A.writeSlot('ACE',{n:1});
  A.init({game:'two'});
  assert.equal(A.slotFor('ACE'),null,'game two read game one\'s slot');
  A.init({game:'one'});
  assert.deepEqual(A.slotFor('ACE').state,{n:1});
});

test('storage that refuses to be written does not take the page with it', ()=>{
  // It is absent in some file:// sandboxes and throws on write in private
  // mode. A high score table is never worth a dead game.
  const {A}=load({readonly:true});
  A.init({game:'g'});
  assert.doesNotThrow(()=>A.record('ABC',100));
  assert.equal(A.writeSlot('ABC',{a:1}),null,'it claimed to have saved');
  assert.deepEqual(A.table(),[]);
  assert.deepEqual(A.slots(),[]);
  assert.equal(A.qualifies(10),true);
});

test('a corrupted slot store reads as no slots rather than throwing', ()=>{
  const {A,store}=load();
  A.init({game:'g'});
  store.set('arcade.g.slots','{not json');
  assert.deepEqual(A.slots(),[]);
  store.set('arcade.g.slots','[1,2,3]');
  assert.deepEqual(A.slots(),[]);
  store.set('arcade.g.slots','{"ACE":{"at":1},"BRN":{"at":2,"state":{"n":1}}}');
  assert.deepEqual(A.slots().map(s=>s.ini),['BRN'],'a slot with nothing in it got through');
});

test('a corrupted table reads as an empty one rather than throwing', ()=>{
  const {A,store}=load();
  A.init({game:'g'});
  store.set('arcade.g.scores','{not json at all');
  assert.deepEqual(A.table(),[]);
  store.set('arcade.g.scores','{"not":"an array"}');
  assert.deepEqual(A.table(),[]);
  store.set('arcade.g.scores','[{"ini":"AAA"},{"ini":"BBB","score":5}]');
  assert.deepEqual(A.table().map(r=>r.ini),['BBB'],'a row with no score got through');
});

test('the alphabet has the letters, the digits and a blank', ()=>{
  const {A}=load();
  assert.ok(/^ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/.test(A.glyphs));
  assert.ok(A.glyphs.length>36);
});
