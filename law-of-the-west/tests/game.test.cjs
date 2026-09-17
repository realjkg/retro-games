// Run with node --test law-of-the-west/tests/game.test.cjs. No packages required.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {test}=require('node:test');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8').split('<script>')[1].split('</script>')[0];
function runtime(){
  const drawing=new Proxy({},{get:()=>()=>{}}),els=new Map(),notes=[],pads=[];
  function el(id){if(!els.has(id))els.set(id,{style:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},
    textContent:'',innerHTML:'',setAttribute(){},addEventListener(){},
    querySelectorAll(){return[]},getBoundingClientRect(){return{width:480,height:360}},getContext(){return drawing}});
    return els.get(id);}
  class AudioContext{
    constructor(){this.state='running';this.currentTime=0;this.destination={};}
    createGain(){return{gain:{value:1,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
    createOscillator(){return {frequency:{setValueAtTime(hz){notes.push(hz)},exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){},stop(){}};}
    resume(){return Promise.resolve();}
  }
  const box={console,document:{hidden:false,getElementById:el,querySelectorAll(){return[]},addEventListener(){},
    body:el('body'),documentElement:el('html'),elementFromPoint(){return null}},
    window:{AudioContext},performance:{now:()=>0},devicePixelRatio:1,addEventListener(){},requestAnimationFrame(){},
    navigator:{getGamepads(){return pads;}}};
  vm.createContext(box);vm.runInContext(source,box);
  const run=c=>vm.runInContext(c,box);
  return {run,notes,pads};
}
// Reach a duel with a given visitor, with his gun still holstered.
function facing(who='gunman'){
  const r=runtime();
  r.run(`newGame();G.person=PEOPLE.findIndex(p=>p.id==="${who}");G.node="start";startDuel();`);
  return r;
}

test('Every reply leads somewhere real, and every visitor can be settled with words',()=>{
 const r=runtime();
 const report=r.run(`(()=>{
   const outs=new Set(["draw","end","murder"]),bad=[],peaceful=[];
   for(const p of PEOPLE){
     let talkable=false;
     for(const [id,node] of Object.entries(p.nodes)){
       if(!node.replies||!node.replies.length)bad.push(p.id+"."+id+": no replies");
       for(const rep of node.replies||[]){
         if(!rep.t)bad.push(p.id+"."+id+": reply with no text");
         if(outs.has(rep.to)){if(rep.to==="end"){talkable=true;if(!rep.msg)bad.push(p.id+"."+id+": end with no message");}}
         else if(!p.nodes[rep.to])bad.push(p.id+"."+id+" -> "+rep.to+": no such node");
       }
     }
     if(!p.nodes.start)bad.push(p.id+": no start node");
     if(talkable)peaceful.push(p.id);
   }
   return JSON.stringify({bad,peaceful,count:PEOPLE.length});
 })()`);
 const {bad,peaceful,count}=JSON.parse(report);
 assert.deepEqual(bad,[]);
 assert.equal(count,7);
 assert.equal(peaceful.length,7);            // no encounter forces a shooting
});

test('Every node is reachable from the visitor\'s opening line',()=>{
 const r=runtime();
 const orphans=JSON.parse(r.run(`(()=>{
   const o=[];
   for(const p of PEOPLE){
     const seen=new Set(["start"]),queue=["start"];
     while(queue.length){for(const rep of p.nodes[queue.pop()].replies||[])
       if(p.nodes[rep.to]&&!seen.has(rep.to)){seen.add(rep.to);queue.push(rep.to);}}
     for(const id of Object.keys(p.nodes))if(!seen.has(id))o.push(p.id+"."+id);
   }
   return JSON.stringify(o);
 })()`));
 assert.deepEqual(orphans,[]);
});

test('Shooting a man whose hand has not moved is murder, and two murders cost the badge',()=>{
 const r=facing();
 r.run('G.score=500;fire();');
 assert.equal(r.run('G.murders'),1);
 assert.equal(r.run('G.score'),250);                       // 250 off the standing
 assert.match(r.run('G.msg'),/murder/i);
 assert.equal(r.run('G.phase'),'settled');
 r.run('G.person=PEOPLE.findIndex(p=>p.id==="robber");startDuel();fire();');
 assert.equal(r.run('G.murders'),2);
 assert.equal(r.run('G.phase'),'over');
 assert.equal(r.run('G.over.rating'),'Run out of town');
});

test('Drawing on an unarmed visitor is murder rather than a duel',()=>{
 const r=runtime();
 r.run('newGame();G.person=PEOPLE.findIndex(p=>p.id==="kid");G.node="scared";choose(1);');
 assert.equal(r.run('G.murders'),1);
 assert.equal(r.run('G.phase'),'settled');
});

test('Once his hand moves, the gun hand disarms and the chest kills',()=>{
 const disarm=facing();
 disarm.run('duelStep(1.8);');                             // Hollis draws at 1.65s
 assert.equal(disarm.run('G.duel.drawn'),true);
 disarm.run('G.duel.aim=1;fire();');
 assert.equal(disarm.run('G.duel.result'),'disarm');
 assert.equal(disarm.run('G.score'),150);
 assert.equal(disarm.run('G.murders'),0);

 const kill=facing();
 kill.run('duelStep(1.8);G.duel.aim=2;fire();');
 assert.equal(kill.run('G.duel.result'),'kill');
 assert.equal(kill.run('G.score'),60);                     // a killing is worth less than a disarming
});

test('A shot fired in a panic pulls one zone low',()=>{
 const r=facing();
 r.run('duelStep(1.7);');                                  // 0.05s after his draw: inside the panic window
 assert.ok(r.run('G.duel.t-G.duel.theirDraw')<0.12);
 r.run('G.duel.aim=1;fire();');                            // aimed at the hand, hits the chest
 assert.equal(r.run('G.duel.result'),'kill');
 assert.match(r.run('G.duel.msg'),/panic/);

 const steady=facing();
 steady.run('duelStep(1.8);G.duel.aim=1;fire();');
 assert.equal(steady.run('G.duel.result'),'disarm');
});

test('A hat shot cows a nervous man and only angers a hired gun',()=>{
 const slim=facing('robber');
 slim.run('duelStep(1.6);G.duel.aim=0;fire();');          // his draw is at 1.4s, so this is steady
 assert.equal(slim.run('G.duel.result'),'surrender');
 assert.equal(slim.run('G.score'),120);

 const bart=facing('gunman');
 bart.run('duelStep(1.8);G.duel.aim=0;fire();');
 assert.equal(bart.run('G.duel.result'),'miss');
 assert.equal(bart.run('G.duel.theirShot'),false);         // he still has his shot to take
 bart.run('duelStep(0.7);');
 assert.equal(bart.run('G.duel.theirShot'),true);
 assert.equal(bart.run('G.lives'),2);
});

test('Standing still gets the sheriff shot, and three hits end the day',()=>{
 const r=facing();
 r.run('duelStep(1.8);duelStep(0.7);');
 assert.equal(r.run('G.lives'),2);
 assert.match(r.run('G.msg'),/fired first/);
 r.run('startDuel();duelStep(1.8);duelStep(0.7);');
 assert.equal(r.run('G.lives'),1);
 r.run('startDuel();duelStep(1.8);duelStep(0.7);');
 assert.equal(r.run('G.lives'),0);
 assert.equal(r.run('G.phase'),'over');
});

test('Held up and down step the aim between the three marks',()=>{
 const r=facing();
 assert.equal(r.run('aimZone()'),'GUN HAND');
 r.run('keys["1U"]=true;duelStep(.02);');
 assert.equal(r.run('aimZone()'),'HAT');
 r.run('duelStep(.02);');                                  // a held key steps, it does not run away
 assert.equal(r.run('aimZone()'),'HAT');
 r.run('duelStep(.2);');
 assert.equal(r.run('aimZone()'),'HAT');                   // already at the top
 r.run('keys["1U"]=false;keys["1D"]=true;duelStep(.02);duelStep(.2);');
 assert.equal(r.run('aimZone()'),'GUN HAND');             // one step per 0.18s of holding
 r.run('duelStep(.2);');
 assert.equal(r.run('aimZone()'),'CHEST');
 r.run('keys["1D"]=false;duelStep(.02);keys["1U"]=true;duelStep(.01);');
 assert.equal(r.run('aimZone()'),'GUN HAND');             // a fresh press steps at once
});

test('The rating follows the standing, and murder or death overrides it',()=>{
 const r=runtime();
 assert.equal(r.run('rating(-10,0,3)'),'Run out of town');
 assert.equal(r.run('rating(120,0,3)'),'Deputy on probation');
 assert.equal(r.run('rating(300,0,3)'),'Town constable');
 assert.equal(r.run('rating(600,0,3)'),'Sheriff of Gold Gulch');
 assert.equal(r.run('rating(900,0,3)'),'Marshal of the territory');
 assert.equal(r.run('rating(1500,0,3)'),'Legend of the West');
 assert.equal(r.run('rating(1500,2,3)'),'Run out of town');
 assert.equal(r.run('rating(1500,0,0)'),'Run out of town');
});

test('Talking a visitor down banks the reply points and moves the street along',()=>{
 const r=runtime();
 r.run('newGame();');                                      // starts on Muley the drunk
 assert.equal(r.run('PEOPLE[G.person].id'),'drunk');
 r.run('choose(0);');                                      // offer him the cell
 assert.equal(r.run('G.node'),'cell');
 r.run('choose(0);');
 assert.equal(r.run('G.score'),120);                        // 60 for the offer, 60 for the outcome
 assert.equal(r.run('G.phase'),'settled');
 r.run('nextPerson();');
 assert.equal(r.run('PEOPLE[G.person].id'),'kid');
 assert.equal(r.run('G.phase'),'talk');
});

test('The day ends after the last visitor',()=>{
 const r=runtime();
 r.run('newGame();G.person=PEOPLE.length-1;G.score=700;nextPerson();');
 assert.equal(r.run('G.phase'),'over');
 assert.equal(r.run('G.over.why'),'day');
 assert.equal(r.run('G.over.rating'),'Sheriff of Gold Gulch');
});

/* ---- controls, shared in shape with Archon's ---- */
test('Keys map by physical code so non-QWERTY layouts still fire',()=>{
 const r=runtime();
 assert.equal(r.run('mapKey({code:"KeyZ"})'),'1A');
 assert.equal(r.run('mapKey({code:"Space"})'),'1A');
 assert.equal(r.run('mapKey({key:"ArrowDown"})'),'1D');
 assert.equal(r.run('mapKey({code:"KeyG"})'),'FULL');
 assert.equal(r.run('mapKey({code:"BracketLeft",key:"["})'),null);
});

test('A gamepad aims and fires, and never clears a key the keyboard holds',()=>{
 const r=facing();
 r.run('keys["1U"]=true;');
 r.pads.push({buttons:Array.from({length:17},(_,i)=>({pressed:i===0,value:0})),axes:[0,0,0,0]});
 r.run('pollGamepads();');
 assert.equal(r.run('keys["1A"]'),true);
 assert.equal(r.run('keys["1U"]'),true);
 r.pads[0]={buttons:Array.from({length:17},()=>({pressed:false,value:0})),axes:[0,.9,0,0]};
 r.run('pollGamepads();');
 assert.equal(r.run('keys["1A"]'),false);
 assert.equal(r.run('keys["1D"]'),true);
});

test('Full game mode toggles from any control, with or without a Fullscreen API',()=>{
 const r=runtime();
 assert.equal(r.run('gameMode'),false);
 r.run('press("FULL");'); assert.equal(r.run('gameMode'),true);
 r.run('G.phase="duel";press("FULL");'); assert.equal(r.run('gameMode'),false);
});

test('Sliding across the d-pad hands the direction over without lifting',()=>{
 const r=facing();
 const el=k=>`{dataset:{k:"${k}"},classList:{add(){},remove(){}},`+
   `closest(sel){return sel===".dpad"?DPAD:this}}`;
 r.run(`var DPAD={};var up=${el('1U')},down=${el('1D')};`);
 r.run('padDown({target:{closest(){return up}},pointerId:1});');
 assert.equal(r.run('keys["1U"]'),true);
 r.run('document.elementFromPoint=()=>down;padMove({pointerId:1,clientX:0,clientY:0});');
 assert.equal(r.run('keys["1U"]'),false);
 assert.equal(r.run('keys["1D"]'),true);
 r.run('padUp({pointerId:1});');
 assert.equal(r.run('keys["1D"]'),false);
 assert.equal(r.run('holders.size'),0);
});
