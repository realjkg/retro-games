/* Loads content.js + engine.js into one sandbox with canvas, AudioContext and
 * rAF stubbed. No fixtures: an unwritten caller is walked past, and the tests
 * say so rather than inventing words for him. */
'use strict';
const fs=require('fs'), path=require('path'), vm=require('node:vm');
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
function load(){
  const box=stubs(); vm.createContext(box);
  for(const f of ['content.js','engine.js'])
    vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),box,{filename:f});
  return {box,run:code=>vm.runInContext(code,box)};
}
module.exports={load};
