// Shared stub runtime: runs the page's own script with just enough DOM and
// audio to boot, and hands back a way to poke at its globals.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');

function runtime(file){
  const source=fs.readFileSync(file||path.join(__dirname,'../index.html'),'utf8')
    .split('<script>')[1].split('</script>')[0];
  const grad={addColorStop(){}};
  const drawing=new Proxy({},{get:(t,k)=>{
    if(k==='canvas')return{width:448,height:256};
    if(k==='font'||k==='fillStyle'||k==='strokeStyle'||k==='lineWidth'||k==='textAlign'||k==='textBaseline')return '';
    return (...a)=>/Gradient|Pattern/.test(String(k))?grad:undefined;}});
  const els=new Map(),notes=[],store=new Map();
  function el(id){
    if(!els.has(id))els.set(id,{id,style:{},dataset:{},value:'',textContent:'',innerHTML:'',
      classList:{add(){},remove(){},toggle(){},contains(){return false}},
      setAttribute(){},addEventListener(){},querySelectorAll(){return[]},select(){},
      width:448,height:256,
      getBoundingClientRect(){return{left:0,top:0,width:448,height:256}},
      getContext(){return drawing}});
    return els.get(id);
  }
  class AudioContext{
    constructor(){this.state='running';this.currentTime=0;this.sampleRate=44100;this.destination={};}
    createGain(){return{gain:{value:1,setValueAtTime(){},linearRampToValueAtTime(){},
      exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
    createOscillator(){return{type:'',frequency:{setValueAtTime(hz){notes.push(hz)},
      exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){},stop(){}};}
    createBuffer(ch,n){return{getChannelData(){return new Float32Array(n)}};}
    createBufferSource(){return{buffer:null,connect(){},start(){}};}
    resume(){return Promise.resolve();}
  }
  const cls=new Set(),docEvents=[];
  const body={classList:{toggle(n,on){on?cls.add(n):cls.delete(n);},add(n){cls.add(n)},
    remove(n){cls.delete(n)},contains:n=>cls.has(n)}};
  const box={console,setTimeout(){},clearTimeout(){},Math,Date,JSON,
    document:{hidden:false,body,documentElement:{},getElementById:el,
      querySelectorAll(){return[]},addEventListener(type){docEvents.push(type)},
      execCommand(){}},
    window:{AudioContext},localStorage:{
      getItem:k=>store.has(k)?store.get(k):null,
      setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
    performance:{now:()=>0},devicePixelRatio:1,
    addEventListener(){},requestAnimationFrame(){}};
  box.globalThis=box;
  vm.createContext(box);
  vm.runInContext(source,box);
  const run=c=>vm.runInContext(c,box);
  return {run,notes,el,cls,docEvents,store,box};
}

// Puts the runner on a clear stretch of floor with no guards in the way.
function clearRoom(r,row=10){
  r.run(`G.holes=[];G.guards=[];
    for(let x=0;x<COLS;x++)for(let y=0;y<ROWS;y++)G.map[x][y]=EMPTY;
    for(let x=0;x<COLS;x++)for(let y=${row}+1;y<ROWS;y++)G.map[x][y]=BRICK;
    G.hero=mkActor(6,${row},false);G.hero.digT=0;G.hero.digAt=null;
    G.goldTotal=1;G.taken=0;G.exitOpen=false;G.state='play';
    keys.up=keys.down=keys.left=keys.right=false;`);
}
const step=(r,n,dt=1/60)=>r.run(`for(let i=0;i<${n};i++)stepGame(${dt});`);

module.exports={runtime,clearRoom,step};
