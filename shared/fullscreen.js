/* ---- full screen ----
 *
 * A game in a browser tab plays inside the tab: the address bar, the tabs and
 * the toolbar stay round it. This puts a FULL SCREEN chip beside the way back
 * to the collection, and the chip asks the browser for the whole screen.
 *
 * What a page can ask for depends on the device:
 *
 *   A computer, Android, an iPad: the Fullscreen API. It works only from a tap,
 *   a click or a key, which is what the chip is. Esc, or the chip again, gives
 *   the screen back.
 *
 *   An iPhone: Safari there has no Fullscreen API for a page at all, and no
 *   page can take its bars away. What takes them away is Add to Home Screen:
 *   launched from that icon the game opens on its own, with no browser round
 *   it. So on an iPhone the chip says how.
 *
 *   Launched from the home screen, or already installed as an app: there is
 *   nothing to take away, and the chip is not shown.
 *
 * Six of the games had a full-screen button of their own before this, sized
 * to their own layouts. They keep it: the sync tool marks those pages
 * data-own="1", and there the chip appears only on an iPhone, where no button
 * can do it, to say how.
 *
 * While the screen is the game's it is kept awake, where the browser allows.
 *
 * The chip is a button, and a focused button is pressed by SPACE, which is
 * FIRE in most of these games. So it gives up the focus as soon as it is
 * pressed.
 *
 * This file is the one copy. tools/sync-fullscreen.js writes it into each page
 * between its markers, and the check in CI fails if any of them drifts.
 */
(function(){
  if(typeof document==='undefined')return;
  if(document.getElementById('rg-fs'))return;
  var me=document.currentScript;
  var own=!!(me&&me.getAttribute('data-own')==='1');
  var root=document.documentElement;
  var canAsk=!!(root.requestFullscreen||root.webkitRequestFullscreen);
  var nav=typeof navigator==='object'&&navigator?navigator:{};

  function installed(){
    if(nav.standalone===true)return true;
    try{return matchMedia('(display-mode: standalone)').matches||
               matchMedia('(display-mode: fullscreen)').matches;}catch(e){return false;}
  }
  function current(){return document.fullscreenElement||document.webkitFullscreenElement||null;}
  /* the name on the home-screen icon, as the page gives it */
  function gameName(){
    var m=document.querySelector('meta[name="apple-mobile-web-app-title"]');
    var t=(m&&m.getAttribute('content'))||document.title||'the game';
    return t.split(/\s+[—–-]\s+/)[0];
  }

  var CSS=''+
  '#rg-row{display:flex;justify-content:center;align-items:center;gap:8px;flex-wrap:wrap;'+
    'margin:8px auto calc(env(safe-area-inset-bottom) + 2px);flex:0 0 auto;max-width:96%}'+
  '#rg-row #rg-launch{margin:0}'+
  '#rg-fs{display:block;margin:0;padding:6px 13px;border-radius:999px;cursor:pointer;'+
    'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;'+
    'font-size:11px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;'+
    'color:#fff8e6;background:rgba(10,7,19,.72);border:1px solid rgba(56,232,255,.34);'+
    'touch-action:manipulation;-webkit-tap-highlight-color:transparent;'+
    'text-shadow:-1px 0 0 rgba(56,232,255,.75),1px 0 0 rgba(255,62,165,.75)}'+
  '#rg-fs:hover,#rg-fs:focus-visible{border-color:rgba(56,232,255,.75);background:rgba(20,14,32,.9);outline:none}'+
  '#rg-fs:active{transform:translateY(1px)}'+
  '#rg-fs .rg-c{color:#38e8ff;text-shadow:none;margin-right:.5em}'+
  '#rg-fs[hidden]{display:none}'+
  '#rg-fs-how{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;'+
    'justify-content:center;padding:16px;background:rgba(4,3,10,.82)}'+
  '#rg-fs-how[hidden]{display:none}'+
  '#rg-fs-how .rg-box{max-width:340px;padding:18px 18px 14px;border-radius:12px;'+
    'background:#0d0a18;border:1px solid rgba(56,232,255,.4);color:#fff8e6;'+
    'font:14px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace}'+
  '#rg-fs-how h2{margin:0 0 8px;font-size:14px;letter-spacing:.18em;text-transform:uppercase;color:#38e8ff}'+
  '#rg-fs-how ol{margin:8px 0 12px;padding-left:20px}'+
  '#rg-fs-how li{margin:4px 0}'+
  '#rg-fs-how b{color:#ffd27f}'+
  '#rg-fs-how button{display:block;margin:0 auto;padding:7px 18px;border-radius:999px;cursor:pointer;'+
    'font:700 12px ui-monospace,Menlo,Consolas,monospace;letter-spacing:.2em;text-transform:uppercase;'+
    'color:#fff8e6;background:#1b1530;border:1px solid rgba(255,210,127,.5);touch-action:manipulation}';

  var wake=null;
  function keepAwake(){
    try{if(nav.wakeLock&&nav.wakeLock.request)
      nav.wakeLock.request('screen').then(function(l){wake=l;}).catch(function(){});}catch(e){}
  }
  function letSleep(){try{if(wake)wake.release();}catch(e){}wake=null;}

  function label(b,text){b.innerHTML='<span class="rg-c">'+(current()?'▣':'⛶')+'</span>'+text;}
  function refresh(b){
    if(installed()){b.hidden=true;return;}
    if(!canAsk){b.hidden=false;label(b,'Full screen');return;}
    /* a page with its own button keeps it, wherever the browser can do it */
    b.hidden=own;
    label(b,current()?'Exit full screen':'Full screen');
  }

  function how(){
    var d=document.getElementById('rg-fs-how');
    if(!d){
      d=document.createElement('div');d.id='rg-fs-how';
      d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');
      d.setAttribute('aria-labelledby','rg-fs-how-h');
      d.innerHTML='<div class="rg-box"><h2 id="rg-fs-how-h">Play full screen</h2>'+
        '<div>Safari on an iPhone cannot hide its bars for a web page. '+
        'Put the game on your Home Screen and it opens with none:</div>'+
        '<ol><li>Tap <b>Share</b> (the square with the arrow).</li>'+
        '<li>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li>'+
        '<li>Open <b class="rg-name"></b> from the new icon.</li></ol>'+
        '<button type="button">Got it</button></div>';
      d.querySelector('.rg-name').textContent=gameName();
      var shut=function(e){if(e)e.preventDefault();d.hidden=true;};
      d.querySelector('button').addEventListener('click',shut);
      d.addEventListener('click',function(e){if(e.target===d)shut(e);});
      document.addEventListener('keydown',function(e){
        if(!d.hidden&&(e.key==='Escape'||e.key==='Enter')){shut(e);e.stopPropagation();}},true);
      document.body.appendChild(d);
    }
    d.hidden=false;
    try{d.querySelector('button').focus();}catch(e){}
  }

  function toggle(b){
    if(!canAsk){how();return;}
    try{
      if(current()){
        var x=document.exitFullscreen||document.webkitExitFullscreen;
        var r=x&&x.call(document);if(r&&r.catch)r.catch(function(){});
      }else{
        var q=root.requestFullscreen?root.requestFullscreen({navigationUI:'hide'}):root.webkitRequestFullscreen();
        /* refused (a page shown inside another page can be): say so, briefly */
        if(q&&q.catch)q.catch(function(){label(b,'Not allowed here');setTimeout(function(){refresh(b);},2200);});
      }
    }catch(e){}
  }

  function put(){
    if(document.getElementById('rg-fs'))return;
    var s=document.createElement('style');s.id='rg-fs-style';s.textContent=CSS;
    (document.head||root).appendChild(s);
    var b=document.createElement('button');
    b.id='rg-fs';b.type='button';
    b.setAttribute('aria-label','Play full screen');
    b.addEventListener('click',function(e){e.preventDefault();toggle(b);b.blur();});
    /* beside the way back to the collection, in one row; where a page has no
     * way back, the row goes where that link would have gone */
    var row=document.createElement('div');row.id='rg-row';
    var back=document.getElementById('rg-launch');
    if(back&&back.parentNode){back.parentNode.insertBefore(row,back);row.appendChild(back);}
    else (document.body||root).appendChild(row);
    row.appendChild(b);
    refresh(b);
    var on=function(){refresh(b);if(current())keepAwake();else letSleep();};
    document.addEventListener('fullscreenchange',on);
    document.addEventListener('webkitfullscreenchange',on);
    document.addEventListener('visibilitychange',function(){if(!document.hidden&&current())keepAwake();});
  }
  if(document.body)put();
  else document.addEventListener('DOMContentLoaded',put);
})();
