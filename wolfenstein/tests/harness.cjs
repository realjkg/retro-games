// Runs the page's own script with just enough DOM, canvas and audio to boot,
// and hands back a way to poke at its globals. Nothing here draws anything: the
// context is a proxy that swallows every call, because these tests are about
// what the game believes, and the pictures are checked by tools/playtest.js.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');

function runtime(seed,file){
  seed=seed===undefined?7:seed;
  const source=fs.readFileSync(file||path.join(__dirname,'../index.html'),'utf8')
    .split('<script>')[1].split('</script>')[0];
  const grad={addColorStop(){}};
  const drawing=new Proxy({},{
    get:(t,k)=>{
      if(k==='canvas')return{width:280,height:168};
      if(k==='fillStyle'||k==='strokeStyle'||k==='font'||k==='textAlign'||
         k==='lineWidth'||k==='textBaseline'||k==='imageSmoothingEnabled')return '';
      return (...a)=>/Gradient|Pattern/.test(String(k))?grad:undefined;
    },
    set:()=>true});
  const els=new Map(),notes=[],store=new Map();
  function mkEl(id){
    return{id,style:{},dataset:{},value:'',textContent:'',innerHTML:'',
      className:'',width:280,height:168,
      classList:{add(){},remove(){},toggle(){},contains(){return false}},
      setAttribute(){},addEventListener(){},removeEventListener(){},
      setPointerCapture(){},hasPointerCapture(){return false},
      releasePointerCapture(){},closest(){return null},
      /* Menus are built by writing innerHTML and then wiring up whatever
         querySelectorAll hands back. Returning nothing made every screen that
         has buttons on it throw the moment a test reached one — game over
         among them. Counting the buttons in the markup is enough of a DOM. */
      querySelectorAll(sel){
        const n=String(this.innerHTML||'').split('class="menuitem').length-1;
        return /menuitem/.test(String(sel))?Array.from({length:n},()=>mkEl('item')):[];
      },
      getBoundingClientRect(){return{left:0,top:0,width:280,height:168}},
      getContext(){return drawing},toDataURL(){return'data:,'}};
  }
  function el(id){
    if(!els.has(id))els.set(id,mkEl(id));
    return els.get(id);
  }
  class AudioContext{
    constructor(){this.state='running';this.currentTime=0;this.sampleRate=44100;this.destination={};}
    createGain(){return{gain:{value:1,setValueAtTime(){},linearRampToValueAtTime(){},
      exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
    createOscillator(){return{type:'',frequency:{setValueAtTime(hz){notes.push(hz)},
      exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){},stop(){}};}
    createBuffer(ch,n){const d=new Float32Array(n);return{length:n,getChannelData(){return d}};}
    createBufferSource(){return{buffer:null,connect(){},start(){}};}
    createBiquadFilter(){return{type:'',frequency:{value:0},connect(){},disconnect(){}};}
    createDelay(){return{delayTime:{value:0},connect(){},disconnect(){}};}
    resume(){return Promise.resolve();}
  }
  const docEvents=[];
  const box={console,setTimeout(){},clearTimeout(){},Math,Date,JSON,Array,Object,String,
    Number,Boolean,Promise,Float32Array,Uint8Array,isNaN,parseInt,parseFloat,
    document:{hidden:false,body:{classList:{add(){},remove(){},toggle(){},contains(){return false}}},
      documentElement:{},getElementById:el,createElement:()=>mkEl('new'),
      querySelectorAll(){return[]},addEventListener(type){docEvents.push(type);}},
    window:{AudioContext,addEventListener(){}},
    navigator:{},location:{protocol:'file:'},
    localStorage:{getItem:k=>store.has(k)?store.get(k):null,
      setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
    performance:{now:()=>0},devicePixelRatio:1,
    addEventListener(){},requestAnimationFrame(){}};
  box.globalThis=box;
  vm.createContext(box);
  vm.runInContext(source,box);
  const run=c=>vm.runInContext(c,box);
  /* the same thing, brought back as data rather than as a string */
  const j=c=>JSON.parse(run('JSON.stringify('+c+')'));
  run(`newGame(${seed|0});hideOverlay();G.state='play';`);
  return {run,j,notes,el,store,box,docEvents};
}
// Advance the game the way the frame loop does: fixed sixtieths.
const step=(r,seconds,dt=1/60)=>
  r.run(`for(let i=0;i<${Math.round(seconds/dt)};i++)stepGame(${dt});`);
// An empty room of the current castle, with the prisoner standing in it where
// the test wants him and nothing else about.
const bare=(r,x,y)=>r.run(`(()=>{const rm=room();rm.guards=[];rm.chests=[];
  rm.g=rm.g.map(t=>t===INNER||t===RUBBLE?FLOOR:t);G.P.x=${x};G.P.y=${y};G.P.dir=0;G.P.face=1;})()`);
// Put a guard in the room, standing where the test wants him.
const guard=(r,kind,x,y,st)=>r.run(`(()=>{const g=mkGuard('${kind}',${x},${y});g.st='${st||'stand'}';
  g.t=1e9;room().guards.push(g);return g.id;})()`);
module.exports={runtime,step,bare,guard};
