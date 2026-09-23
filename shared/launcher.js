/* ---- the way back to the launcher ----
 *
 * Every game here is its own page, and until now only one of them had a link
 * back to the collection it belongs to: open a game directly, or install it to
 * a home screen, and the rest of the cabinet was unreachable without editing
 * the address bar.
 *
 * Where it goes took two tries and a measurement.
 *
 * Seven of these pages are flex columns whose wrap has flex:1, so the last
 * child of the body settles at the bottom of the viewport on its own: under
 * the controls, covering nothing. Law of the West is not one of them - its
 * whole interface is a position:fixed #app over a body with no flow at all,
 * and appended there the link landed at the top of the page and shoved the
 * game down it.
 *
 * Pinning it to the bottom of the viewport instead fixed that one and broke
 * seven: measured against every control on every page, a fixed chip sat on a
 * full-screen button in five of them and on Galaga's thumb stick.
 *
 * So it goes in the flow; and if the flow turns out not to have put it near
 * the bottom - which is what a body with nothing in it looks like from here -
 * it moves into whatever element is actually covering the screen and rides
 * that one's layout instead.
 *
 * The lettering is the collection's own: monospace, wide-spaced, upper case,
 * and split a little cyan to the left and magenta to the right the way a
 * mistuned tube did it.
 *
 * This file is the one copy. tools/sync-launcher.js writes it into each page
 * between its markers, and the check in CI fails if any of them drifts.
 */
(function(){
  if(typeof document==='undefined')return;
  if(document.getElementById('rg-launch'))return;

  var CSS=''+
  '#rg-launch{display:block;margin:8px auto calc(env(safe-area-inset-bottom) + 2px);'+
    'padding:6px 13px;border-radius:999px;flex:0 0 auto;'+
    'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;'+
    'font-size:11px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;'+
    'text-decoration:none;color:#fff8e6;background:rgba(10,7,19,.72);'+
    'border:1px solid rgba(255,210,127,.32);text-align:center;width:max-content;'+
    'max-width:92%;touch-action:manipulation;-webkit-tap-highlight-color:transparent;'+
    'text-shadow:-1px 0 0 rgba(56,232,255,.75),1px 0 0 rgba(255,62,165,.75),'+
      '0 0 10px rgba(255,210,127,.45)}'+
  '#rg-launch:hover,#rg-launch:focus-visible{border-color:rgba(255,210,127,.7);'+
    'background:rgba(20,14,32,.9);outline:none}'+
  '#rg-launch:active{transform:translateY(1px)}'+
  '#rg-launch .rg-c{color:#ffd27f;text-shadow:none;margin-right:.5em}'+
  /* a tube that has been on a while */
  '@keyframes rg-flick{0%,96%,100%{opacity:1}97%{opacity:.78}98%{opacity:1}99%{opacity:.88}}'+
  '#rg-launch{animation:rg-flick 9s steps(1) infinite}'+
  '@media (prefers-reduced-motion:reduce){#rg-launch{animation:none}}';

  function put(){
    if(document.getElementById('rg-launch'))return;
    var s=document.createElement('style');
    s.id='rg-launch-style';s.textContent=CSS;
    (document.head||document.documentElement).appendChild(s);
    var a=document.createElement('a');
    a.id='rg-launch';
    /* One level up is the collection, whether that is a folder on a disk or
     * the Pages site. Relative so it works from file:// as well. */
    a.href='../';
    a.setAttribute('aria-label','Back to the Retro Games launcher');
    a.innerHTML='<span class="rg-c">◀</span>Retro Games';
    var host=document.body||document.documentElement;
    host.appendChild(a);
    /* Did the flow put it near the bottom? If not, this page keeps its
     * interface somewhere other than the body, and the link belongs there. */
    try{
      var r=a.getBoundingClientRect();
      if(r.top<(window.innerHeight||0)*0.5){
        var best=null,area=0,all=document.body.querySelectorAll('*');
        for(var i=0;i<all.length;i++){
          var el=all[i];
          if(el===a||el.contains(a))continue;
          var cs=window.getComputedStyle(el);
          if(cs.position!=='fixed'&&cs.position!=='absolute')continue;
          var q=el.getBoundingClientRect();
          if(q.height<window.innerHeight*0.8)continue;
          if(q.width*q.height>area){area=q.width*q.height;best=el;}
        }
        if(best)best.appendChild(a);
      }
    }catch(e){}
  }
  if(document.body)put();
  else document.addEventListener('DOMContentLoaded',put);
})();
