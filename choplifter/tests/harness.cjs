// The game's own script, run against the smallest DOM and audio stubs it will
// accept. No packages required: node --test tests/*.test.cjs.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')
  .split('<script>')[1].split('</script>')[0];

function runtime(diff=2,seed=7,start=true,store){
  const grad={addColorStop(){}};
  const drawing=new Proxy({},{get:(t,k)=>{
    if(k==='canvas')return{width:336,height:192};
    if(k==='globalAlpha')return 1;
    return (...a)=>/Gradient|Pattern|ImageData/.test(String(k))
      ?(/ImageData/.test(String(k))?{data:new Uint8ClampedArray(4)}:grad):undefined;}});
  const els=new Map(),notes=[];
  function el(id){if(!els.has(id))els.set(id,{id,style:{},dataset:{},hidden:false,handlers:{},
    classList:{add(){},remove(){},toggle(){},contains(){return false}},textContent:'',innerHTML:'',
    setAttribute(){},addEventListener(t,fn){this.handlers[t]=fn;},setPointerCapture(){},
    querySelectorAll(){return[]},rect:{width:336,height:192},getBoundingClientRect(){return this.rect},
    getContext(){return drawing}});return els.get(id);}
  // A browser's storage, or something close enough: shared between runtimes so a
  // "next visit" can be tested, and able to throw the way a private window does.
  const kept=store||new Map();
  const localStorage={
    getItem:k=>{if(kept.broken)throw new Error("denied");return kept.has(k)?kept.get(k):null;},
    setItem:(k,v)=>{if(kept.broken)throw new Error("denied");kept.set(k,String(v));},
    removeItem:k=>{kept.delete(k);}};
  class AudioContext{
    constructor(){this.state='running';this.currentTime=0;this.destination={};}
    createGain(){return{gain:{value:1,setValueAtTime(){},linearRampToValueAtTime(){},
      exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
    createOscillator(){return{type:'',frequency:{setValueAtTime(hz){notes.push(hz)},
      exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){},stop(){}};}
    resume(){return Promise.resolve();}
  }
  const cls=new Set(),docEvents=[];
  const body={classList:{toggle(n,on){on?cls.add(n):cls.delete(n);},add(n){cls.add(n)},
    remove(n){cls.delete(n)},contains:n=>cls.has(n)}};
  const box={console,setTimeout(){},localStorage,navigator:{userAgent:"node",maxTouchPoints:0},
    document:{hidden:false,body,documentElement:{},getElementById:el,querySelectorAll(){return[]},
      querySelector(){return null},addEventListener(type){docEvents.push(type)}},
    window:{AudioContext},performance:{now:()=>0},devicePixelRatio:1,
    addEventListener(){},requestAnimationFrame(){}};
  box.window.__proto__=box;
  vm.createContext(box);vm.runInContext(source,box);
  // The game uses Math.random for the things a seed should not have to carry.
  // A test that leaves that to chance passes most of the time, which is the
  // worst kind of test.
  vm.runInContext(`Math.random=(()=>{let s=${(seed>>>0)+0x9E3779B9};
    return()=>{s=(s+0x6D2B79F5)>>>0;let t=Math.imul(s^s>>>15,1|s);
     t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})();`,box);
  const run=c=>vm.runInContext(c,box);
  if(start)run(`newGame(${diff},${seed});`);
  return {run,notes,el,cls,docEvents,store:kept};
}
const step=(r,n,dt=0.02)=>r.run(`for(let i=0;i<${n};i++)stepGame(${dt});`);
// Her alone on the strip: nothing shooting, nothing in the air, nobody walking.
function clear(r){
  r.run(`G.foes=[];G.shots=[];G.flak=[];G.people=[];G.puffs=[];G.waveT=1e9;
   for(const k of Object.keys(keys))delete keys[k];`);
}
// Read the sprite maps straight out of the page source, for the checks that are
// about the pictures rather than about the rules.
function maps(name){
  const m=source.match(new RegExp("const "+name+"=\\[([\\s\\S]*?)\\];"));
  if(!m)throw new Error("index.html no longer defines "+name);
  return (m[1].match(/"[^"]*"/g)||[]).map(x=>x.slice(1,-1));
}
module.exports={runtime,step,clear,maps,source};
