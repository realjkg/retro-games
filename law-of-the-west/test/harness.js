/* Loads content.js + engine.js into one sandbox with canvas, AudioContext and
 * rAF stubbed. `fill` adds fixture turns for encounters whose dialogue is not
 * authored yet; without it, only the authored ones can be played. */
'use strict';
const fs=require('fs'), path=require('path'), vm=require('node:vm');
const {fillUnwritten}=require('./fixture-content.js');
const ROOT=path.join(__dirname,'..');

function stubs(){
  const ctx2d=new Proxy({},{get:(t,k)=>k==='canvas'?{width:320,height:200}:()=>{}});
  const el=()=>({style:{},classList:{add(){},remove(){},toggle(){},contains:()=>false},
    textContent:'',innerHTML:'',dataset:{},setAttribute(){},getAttribute(){return null;},
    addEventListener(){},appendChild(){},querySelectorAll(){return[];},
    getBoundingClientRect(){return{width:320,height:200,left:0,top:0};},
    getContext(){return ctx2d;}});
  return {console,
    document:{hidden:false,getElementById:el,querySelector:el,querySelectorAll(){return[];},
      addEventListener(){},body:el(),documentElement:el(),elementFromPoint(){return null;}},
    window:{AudioContext:function(){throw new Error('AudioContext before a gesture');}},
    performance:{now:()=>0},devicePixelRatio:1,addEventListener(){},
    requestAnimationFrame(){return 0;},Math,JSON,Date};
}
function load(opts){
  const box=stubs();
  vm.createContext(box);
  for(const f of ['content.js','engine.js'])
    vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),box,{filename:f});
  if(!opts||opts.fill!==false)
    fillUnwritten(box.ENCOUNTERS||vm.runInContext('ENCOUNTERS',box),
      vm.runInContext('DIALOGUE',box),
      vm.runInContext('INTENTS',box),
      vm.runInContext('RULES',box).TURNS);
  const run=code=>vm.runInContext(code,box);
  return {run,box,slotOf:id=>run(`ENCOUNTERS.findIndex(e=>e.id==="${id}")`)};
}
module.exports={load};
