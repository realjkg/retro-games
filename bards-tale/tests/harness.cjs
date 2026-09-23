// Runs the page's own script with just enough DOM and audio to boot. Nothing
// here draws: the 2d context swallows every call, because these tests are about
// what the game believes. What the screen does is tools/playtest.js's job.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');

function runtime(file){
  const source=fs.readFileSync(file||path.join(__dirname,'../index.html'),'utf8')
    .split('<script>')[1].split('</script>')[0];
  const grad={addColorStop(){}};
  const pixels={data:new Uint8ClampedArray(48*48*4)};
  const drawing=new Proxy({},{
    get:(t,k)=>{
      if(k==='canvas')return{width:256,height:176};
      if(k==='getImageData')return()=>pixels;
      if(['fillStyle','strokeStyle','font','textAlign','lineWidth','textBaseline',
          'imageSmoothingEnabled'].includes(k))return '';
      return (...a)=>/Gradient|Pattern/.test(String(k))?grad:undefined;
    },set:()=>true});
  function classList(){
    const set=new Set();
    return{add:n=>set.add(n),remove:n=>set.delete(n),
      toggle:(n,on)=>{on===undefined?(set.has(n)?set.delete(n):set.add(n)):(on?set.add(n):set.delete(n));},
      contains:n=>set.has(n),_set:set};
  }
  const els=new Map(),store=new Map();
  function mkEl(id){
    const e={id,style:{},dataset:{},value:'',textContent:'',innerHTML:'',hidden:false,
      disabled:false,width:256,height:176,classList:classList(),
      setAttribute(){},addEventListener(){},removeEventListener(){},
      querySelectorAll(){return[]},closest(){return null},
      getBoundingClientRect(){return{left:0,top:0,width:256,height:176}},
      getContext(){return drawing},toDataURL(){return'data:,'}};
    Object.defineProperty(e,'className',{
      get(){return Array.from(e.classList._set).join(' ');},
      set(v){e.classList._set.clear();String(v).split(/\s+/).filter(Boolean)
        .forEach(n=>e.classList._set.add(n));}});
    return e;
  }
  function el(id){if(!els.has(id))els.set(id,mkEl(id));return els.get(id);}
  class AudioContext{
    constructor(){this.state='running';this.currentTime=0;this.sampleRate=44100;this.destination={};}
    createGain(){return{gain:{value:1,setValueAtTime(){},linearRampToValueAtTime(){},
      exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
    createOscillator(){return{type:'',frequency:{setValueAtTime(){},
      exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){},stop(){}};}
    createBuffer(c,n){const d=new Float32Array(n);return{length:n,getChannelData(){return d}};}
    createBufferSource(){return{buffer:null,connect(){},start(){}};}
    createBiquadFilter(){return{type:'',frequency:{value:0},connect(){},disconnect(){}};}
    resume(){return Promise.resolve();}
  }
  const box={console,setTimeout(){},clearTimeout(){},Math,Date,JSON,Array,Object,String,
    Number,Boolean,Promise,Float32Array,Uint8ClampedArray,Set,Map,isNaN,parseInt,parseFloat,
    document:{hidden:false,body:{classList:classList()},documentElement:{},
      getElementById:el,createElement:()=>mkEl('new'),
      querySelectorAll(){return[]},addEventListener(){}},
    window:{AudioContext,addEventListener(){}},
    navigator:{},location:{protocol:'file:'},
    localStorage:{getItem:k=>store.has(k)?store.get(k):null,
      setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
    performance:{now:()=>0},devicePixelRatio:1,
    addEventListener(){},requestAnimationFrame(){}};
  box.globalThis=box;
  vm.createContext(box);
  /* The page loads the shared coin-op module before the game's own script,
     so the harness does too: without it Arcade.init() at boot is a
     ReferenceError and nothing in the game runs at all. */
  vm.runInContext(require('node:fs').readFileSync(
    require('node:path').join(__dirname,'../../shared/arcade.js'),'utf8'),box);
  /* and the joystick beside it: the game wires it as it boots. It refuses
     softly here - this document has no head to build a gate in - and the
     game runs on its keyboard, which is what the tests press. */
  vm.runInContext(require('node:fs').readFileSync(
    require('node:path').join(__dirname,'../../shared/stick.js'),'utf8'),box);
  vm.runInContext(source,box);
  const run=c=>vm.runInContext(c,box);
  const j=c=>JSON.parse(run('JSON.stringify('+c+')'));
  return {run,j,el,store,box};
}

// Six adventurers with the stats their class needs, so a test never fails on a
// bad roll. Level is nudged up so the casters have something to cast.
const PARTY=`(function(){
  newGame();
  const spec=[['Brann','dwarf','warrior'],['Tarna','human','paladin'],
    ['Rook','hobbit','rogue'],['Mab','elf','bard'],
    ['Orrin','gnome','magician'],['Ysolde','halfelf','conjurer']];
  P.roster=[];
  spec.forEach(function(s){
    var st=rollStats(s[1]);
    STATS.forEach(function(k){var need=CLASSES[s[2]].req[k]||0;if(st[k]<need)st[k]=need;});
    var pc=mkChar(s[0],s[1],s[2],st);starterKit(pc);
    pc.lvl=5;pc.maxhp+=40;pc.hp=pc.maxhp;
    if(pc.maxsp){pc.maxsp+=40;pc.sp=pc.maxsp;}
    P.roster.push(pc);
  });
  P.gold=1000;hideOverlay();
})()`;
const withParty=r=>{r.run(PARTY);return r;};

module.exports={runtime,withParty,PARTY};
