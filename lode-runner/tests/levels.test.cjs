// The levels, the generator and the page around them.
// Run with node --test tests/levels.test.cjs — no packages.
const fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {runtime,step}=require('./harness.cjs');

const PAGE=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');

test('The board is the original 28 x 16, and every shipped level fills it',()=>{
  const r=runtime();
  assert.equal(r.run('COLS'),28);
  assert.equal(r.run('ROWS'),16);
  const n=r.run('LEVELS.length');
  assert.ok(n>=16,'the set ships '+n+' levels');
  for(let i=0;i<n;i++){
    const rows=JSON.parse(r.run('JSON.stringify(LEVELS['+i+'].rows)'));
    assert.equal(rows.length,16,'level '+(i+1)+' has 16 rows');
    rows.forEach((row,y)=>assert.ok(row.length<=28,'level '+(i+1)+' row '+y+' is '+row.length+' wide'));
    assert.ok(r.run('LEVELS['+i+'].name').length>0);
  }
});

test('Every level has a runner, chests, guards and a hidden way out',()=>{
  const r=runtime();
  const n=r.run('LEVELS.length');
  for(let i=0;i<n;i++){
    const L='parseLevel(LEVELS['+i+'])';
    assert.ok(r.run(L+'.gold')>0,'level '+(i+1)+' has gold');
    assert.ok(r.run(L+'.guards.length')>0,'level '+(i+1)+' has guards');
    assert.ok(r.run(L+'.hidden.length')>0,'level '+(i+1)+' has a hidden ladder');
    assert.ok(r.run(L+'.start.y')>0,'level '+(i+1)+' starts the runner somewhere');
  }
});

// This is the check that matters: a level whose gold or whose exit is walled
// off is a level nobody can finish.
test('Every chest and the top row can be reached on every shipped level',()=>{
  const r=runtime();
  const n=r.run('LEVELS.length');
  for(let i=0;i<n;i++){
    const bad=JSON.parse(r.run('JSON.stringify(checkLevel(LEVELS['+i+']))'));
    assert.deepEqual(bad,[],'level '+(i+1)+' ('+r.run('LEVELS['+i+'].name')+')');
  }
});

test('The reachability check is not simply saying yes to everything',()=>{
  const r=runtime();
  const walled={name:'X',rows:[
    '','','','','','','','','','','',
    '          @$@',
    '          @@@',
    '','',
    '############################']};
  const bad=JSON.parse(r.run('JSON.stringify(checkLevel('+JSON.stringify(walled)+'))'));
  assert.ok(bad.some(s=>/cannot be reached/.test(s)),'gold sealed in concrete is reported: '+bad.join('; '));
});

test('Levels read and write the same character set the Lode Runner archives use',()=>{
  const r=runtime();
  // # brick, @ solid, H ladder, - rope, X false brick, $ gold, S hidden ladder,
  // & runner, 0 guard.
  assert.equal(r.run('CHARS["#"]'),r.run('BRICK'));
  assert.equal(r.run('CHARS["@"]'),r.run('SOLID'));
  assert.equal(r.run('CHARS["H"]'),r.run('LADDER'));
  assert.equal(r.run('CHARS["-"]'),r.run('BAR'));
  assert.equal(r.run('CHARS["X"]'),r.run('TRAP'));
  assert.equal(r.run('CHARS["$"]'),r.run('GOLD'));
  const n=r.run('LEVELS.length');
  for(let i=0;i<n;i++){
    const there=r.run('LEVELS['+i+'].rows.map(s=>s.replace(/\\s+$/,"")).join("\\n")');
    const back=r.run('levelText(parseLevel(LEVELS['+i+']))');
    assert.equal(back,there,'level '+(i+1)+' survives the round trip through text');
  }
});

test('The generator lays tiles, counts the gold and keeps what it is given',()=>{
  const r=runtime();
  r.run('openEditor();');
  assert.equal(r.run('G.state'),'editor');
  assert.ok(r.run('G.customSet.length')>=1,'it opens on a slot');
  r.run('ED.tile="#";editPaint(5,5);');
  assert.equal(r.run('G.map[5][5]'),r.run('BRICK'));
  r.run('ED.tile="$";editPaint(6,4);editPaint(7,4);');
  assert.equal(r.run('G.goldTotal'),2,'the chest count follows what is on the board');
  r.run('ED.tile="H";editPaint(8,8);');
  assert.equal(r.run('G.map[8][8]'),r.run('LADDER'));
  r.run('ED.tile="0";editPaint(9,9);');
  assert.equal(r.run('G.guards.some(g=>g.x===9&&g.y===9)'),true);
  r.run('ED.tile="&";editPaint(3,14);');
  assert.equal(r.run('G.hero.x+","+G.hero.y'),'3,14');
  r.run('ED.tile="S";editPaint(2,1);');
  assert.equal(r.run('G.hidden.some(h=>h.x===2&&h.y===1)'),true);
  // painting over something clears what was there
  r.run('ED.tile=" ";editPaint(9,9);');
  assert.equal(r.run('G.guards.some(g=>g.x===9&&g.y===9)'),false);
  r.run('editCommit();saveCustom();');
  assert.equal(r.store.has('lode-runner-levels'),true,'saved levels go to local storage');
  const saved=JSON.parse(r.store.get('lode-runner-levels'));
  assert.ok(Array.isArray(saved)&&saved[0].rows.length===16);
});

test('A level made in the generator can be played in place of the shipped set',()=>{
  const r=runtime();
  r.run('openEditor();');
  r.run(`G.customSet[0]={name:'T',rows:LEVELS[0].rows.slice()};
    ED.slot=0;editLoad();closeEditor();
    G.custom=true;G.started=true;loadLevel(0);`);
  assert.equal(r.run('levelSet().length'),r.run('G.customSet.length'));
  assert.equal(r.run('G.goldTotal'),r.run('parseLevel(LEVELS[0]).gold'));
});

test('A blank slot is a floor, a runner and nothing else',()=>{
  const r=runtime();
  const L=r.run('JSON.stringify((()=>{const b=blankLevel("B");return{gold:b.gold,guards:b.guards.length,start:b.start};})())');
  const b=JSON.parse(L);
  assert.equal(b.gold,0);
  assert.equal(b.guards,0);
  assert.equal(b.start.y,14);
  const bad=JSON.parse(r.run('JSON.stringify(checkLevel({rows:levelText(blankLevel()).split("\\n")}))'));
  assert.ok(bad.includes('no gold'),'and the generator says so before you try to play it');
});

test('The screen takes the shape of the box it is in, not a fixed size',()=>{
  const r=runtime();
  const el=r.el('cv');
  el.rect={left:0,top:0,width:700,height:400};
  el.getBoundingClientRect=()=>el.rect;
  r.run('sizeCanvas();');
  const wide=r.run('V.ts');
  el.rect={left:0,top:0,width:350,height:200};
  r.run('sizeCanvas();');
  assert.ok(r.run('V.ts')<wide,'a smaller box draws smaller tiles rather than cropping the board');
  assert.ok(r.run('V.ox')>=0&&r.run('V.oy')>=0,'and the board stays inside the canvas');
});

test('Drawing the title, the tower and the generator grid all survive a frame',()=>{
  const r=runtime();
  r.run('sizeCanvas();drawTitle(2.5);');
  r.run('newGame(1,3);sizeCanvas();drawField();drawActors();drawHUD();');
  r.run('openEditor();drawField();drawActors();drawEditGrid();');
});

test('Full screen is a class on the page and says how to get out again',()=>{
  const r=runtime();
  assert.equal(r.cls.has('fs'),false);
  r.run('toggleFull();');
  assert.equal(r.cls.has('fs'),true);
  assert.equal(r.el('fs').textContent,'EXIT FULL SCREEN');
  r.run('toggleFull();');
  assert.equal(r.cls.has('fs'),false);
  assert.equal(r.el('fs').textContent,'FULL SCREEN');
});

test('The game stops itself when the tab goes away',()=>{
  const r=runtime();
  assert.ok(r.docEvents.includes('visibilitychange'));
});

test('Holding a control holds the control: nothing on the page is text to select',()=>{
  const css=PAGE.split('</style>')[0];
  assert.match(css,/user-select:none/);
  assert.match(css,/-webkit-touch-callout:none/);
  assert.match(css,/touch-action:(manipulation|none)/);
  assert.match(PAGE,/user-scalable=no/);
  assert.match(css,/overscroll-behavior:none/);
});

test('The page carries the controls it promises, and both dig buttons',()=>{
  for(const id of ['k-up','k-down','k-left','k-right','k-digl','k-digr','k-restart','k-pause',
    'sound','fs','palette','e-test','e-save','e-exit','slug']){
    assert.ok(PAGE.includes('id="'+id+'"'),'the page has #'+id);
  }
  const r=runtime();
  // The original's own keys: I J K L to move, U and O to dig.
  for(const [k,m] of [['i','up'],['j','left'],['k','down'],['l','right'],['u','digL'],['o','digR'],
    ['ArrowUp','up'],['ArrowLeft','left'],['z','digL'],['x','digR']]){
    assert.equal(r.run('KEYMAP['+JSON.stringify(k)+']'),m,k+' means '+m);
  }
});

test('The music follows the game and answers both switches',()=>{
  const r=runtime();
  r.run('A.on=true;A.music=true;audioReady();');
  assert.equal(r.run('tuneFor()'),'title','the title screen has its own tune');
  r.run('newGame(1,4);');
  assert.equal(r.run('tuneFor()'),'play');
  r.run('G.exitOpen=true;');
  assert.equal(r.run('tuneFor()'),'run','with the way out open it plays faster');
  const before=r.notes.length;
  r.run('A.next=0;A.step=0;musicTick();');
  assert.ok(r.notes.length>before,'notes are scheduled');
  r.run('A.music=false;');
  const quiet=r.notes.length;
  r.run('musicTick();');
  assert.equal(r.notes.length,quiet,'MUSIC OFF stops the tune');
  r.run('A.music=true;A.on=false;musicTick();');
  assert.equal(r.notes.length,quiet,'SOUND OFF stops everything');
});

test('Sound effects are fired for the things the game says they are',()=>{
  const r=runtime();
  r.run('A.on=true;audioReady();');
  const n=()=>r.notes.length;
  const before=n();
  r.run('sfx("gold");sfx("dig");sfx("trap");sfx("bury");sfx("death");sfx("reveal");');
  assert.ok(n()>before,'each of them reaches the audio graph');
});
