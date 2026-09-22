// Runs the page's own script with just enough DOM, canvas and audio to boot,
// and hands back a way to poke at its globals. Nothing here draws anything: the
// context is a proxy that swallows every call, because these tests are about
// what the game believes, and the pictures are checked by tools/playtest.js.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');

function runtime(file){
  const source=fs.readFileSync(file||path.join(__dirname,'../index.html'),'utf8')
    .split('<script>')[1].split('</script>')[0];
  const grad={addColorStop(){}};
  const drawing=new Proxy({},{
    get:(t,k)=>{
      if(k==='canvas')return{width:224,height:288};
      if(k==='fillStyle'||k==='strokeStyle'||k==='font'||k==='textAlign'||
         k==='lineWidth'||k==='textBaseline'||k==='imageSmoothingEnabled')return '';
      return (...a)=>/Gradient|Pattern/.test(String(k))?grad:undefined;
    },
    set:()=>true});
  const els=new Map(),notes=[],store=new Map();
  function mkEl(id){
    return{id,style:{},dataset:{},value:'',textContent:'',innerHTML:'',
      className:'',width:224,height:288,
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
      getBoundingClientRect(){return{left:0,top:0,width:224,height:288}},
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
    Number,Boolean,Promise,Float32Array,isNaN,parseInt,parseFloat,
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
  // Start every test from a running stage 1 with no overlay in the way and
  // nothing diving: a parked fighter is shot down inside twenty seconds
  // otherwise, and then the test is measuring the respawn instead.
  run(`newGame();hideOverlay();G.state='play';G.diveT=1e9;`);
  return {run,j,notes,el,store,box,docEvents};
}
// Advance the game the way the frame loop does: fixed sixtieths.
const step=(r,seconds,dt=1/60)=>
  r.run(`for(let i=0;i<${Math.round(seconds/dt)};i++)stepGame(${dt});`);
// Long enough for all five flights to arrive and settle into the formation.
const settle=r=>step(r,22);

// A fighter that is on the screen and cannot be shot off it.
//
// Anything in flight fires at you, the boss on its capture run included. A test
// that parks a fighter at the centre of the screen for twelve seconds and then
// checks what the capture cost is really checking what the capture cost *plus*
// whatever the boss hit it with on the way down, and that came out wrong two
// times in five. Invulnerability stops the bullets and does not stop the beam,
// which is exactly the isolation these tests want.
const park=(r,x)=>r.run(`G.ship.alive=true;G.ship.dual=false;G.ship.x=${x||112};
  G.ship.inv=1e4;`);

module.exports={runtime,step,settle,park};
