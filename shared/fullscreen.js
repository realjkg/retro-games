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
 * Full screen is not much use if the game stays the size it was in the tab:
 * the first version of this put the same 560-pixel page in the middle of a
 * 1920-pixel screen, and the game had 9 to 17 per cent of it. So on the eight
 * pages built the same way (a #wrap holding #status, #stage and #pads; the
 * sync tool marks them data-fit="1") full screen is a game mode:
 *
 *   the page goes black, the row of links at the bottom goes, and the cap on
 *   the page's width comes off;
 *
 *   the stage (the picture and its menus) is made as large as it can be with
 *   the whole game still on the screen: status, picture and, on a phone, the
 *   pads, in whatever arrangement the game's own stylesheet gives them for
 *   that screen. It is found by trying sizes and measuring, not worked out,
 *   because each game arranges itself differently;
 *
 *   a small EXIT goes into the status bar where the page has no button of its
 *   own to leave by;
 *
 *   on a touch screen wider than it is tall (a phone on its side, an iPad) it
 *   is laid out like a handheld: the picture in the middle, as tall as the
 *   screen allows, the stick under the left thumb and the buttons under the
 *   right. Which part of each game's pads goes where is data-side, written
 *   by the sync tool: "L:selectors|R:selectors", up to three a side, top to
 *   bottom. A game held that way used to put its pads under the picture,
 *   where they pushed it smaller the larger it got. But a very wide picture
 *   (Drol's is 2.3 times as wide as it is tall) runs out of width between
 *   two columns of pads long before it runs out of height, and on an iPad
 *   that left it a fifth of the screen. So both are tried, beside and below,
 *   and the one that gives the larger picture is kept;
 *
 *   with no touch screen at all, the pads are put away: the game is played
 *   from the keyboard, and they were taking the picture's room. (Not in The
 *   Bard's Tale, data-pads="keep", whose buttons are how a mouse plays it.)
 *
 * Launched from a home screen the game is in this mode from the start.
 * Archon and Law of the West have full game screens of their own already,
 * and their copies leave the game mode out: the parts between the @fit
 * markers are dropped from them by the sync tool.
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
  var fit=!!(me&&me.getAttribute('data-fit')==='1');
  var side=(me&&me.getAttribute('data-side'))||'';
  var keepPads=!!(me&&me.getAttribute('data-pads')==='keep');
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
  /* Archon's and Law of the West's own game modes: the row goes there too */
  'body.gamemode #rg-row{display:none!important}'+
  /* the game's own type: a second family round the picture was the chip's */
  '#rg-fs{display:block;margin:0;padding:6px 13px;border-radius:999px;cursor:pointer;'+
    'font-family:inherit;'+
    'font-size:11px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;'+
    'color:#fff8e6;background:rgba(10,7,19,.72);border:1px solid rgba(56,232,255,.34);'+
    'touch-action:manipulation;-webkit-tap-highlight-color:transparent;'+
    'text-shadow:-1px 0 0 rgba(56,232,255,.75),1px 0 0 rgba(255,62,165,.75)}'+
  '#rg-fs:hover,#rg-fs:focus-visible{border-color:rgba(56,232,255,.75);background:rgba(20,14,32,.9);outline:none}'+
  '#rg-fs:active{transform:translateY(1px)}'+
  '#rg-fs .rg-c{color:#38e8ff;text-shadow:none;margin-right:.5em}'+
  '#rg-fs[hidden]{display:none}'+
  /* the game mode */
  /*@fit*/'html.rg-game,html.rg-game body{background:#000!important}'+
  'html.rg-game #rg-row{display:none!important}'+
  /* a margin round the whole game: flush against the edge, a phone's rounded
   * corners and its notch cut the outer buttons off */
  'html.rg-game #wrap{max-width:none!important;margin-top:auto;margin-bottom:auto;height:auto!important;'+
    'box-sizing:border-box;padding:max(4px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) '+
    'max(8px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left))!important}'+
  'html.rg-game #stage{width:var(--rg-sw)!important;max-width:none!important;flex:none!important;'+
    'margin-left:auto;margin-right:auto}'+
  'html.rg-nopads #pads{display:none!important}'+
  'html.rg-side #wrap{display:grid!important;grid-template-columns:auto auto auto!important;'+
    'grid-template-rows:auto auto auto auto!important;justify-content:center;align-content:center;'+
    'column-gap:10px!important;row-gap:6px!important;height:auto!important;flex:none!important;width:100%!important}'+
  /* held sideways the picture is limited by the height, so the status bar
   * stops spanning the top and takes the top of the left column instead:
   * the picture gets the screen's whole height */
  'html.rg-side #status{grid-area:1/1/2/2!important;flex-direction:column!important;flex-wrap:wrap!important;'+
    'align-items:stretch!important;justify-content:flex-start!important;gap:4px!important;height:auto!important;'+
    'width:auto!important;max-width:30vw;align-self:start!important;text-align:left}'+
  'html.rg-side #status>*{margin:0!important}'+
  'html.rg-side #stage{grid-area:1/2/5/3!important;align-self:center!important;margin:0!important;order:0!important}'+
  'html.rg-side .rg-thru{display:contents!important}'+
  'html.rg-side .rg-l1{grid-area:2/1/3/2!important}html.rg-side .rg-l2{grid-area:3/1/4/2!important}'+
  'html.rg-side .rg-l3{grid-area:4/1/5/2!important}html.rg-side .rg-r1{grid-area:2/3/3/4!important}'+
  'html.rg-side .rg-r2{grid-area:3/3/4/4!important}html.rg-side .rg-r3{grid-area:4/3/5/4!important}'+
  'html.rg-side .rg-sd{align-self:center!important;justify-self:center!important;margin:0!important;order:0!important}'+
  /* four games pin their SOUND / EXIT row 2 px off the bottom when held
   * sideways: lifted clear of the edge, and in a column it is just an item */
  'html.rg-game .soundrow{bottom:max(8px,env(safe-area-inset-bottom))!important}'+
  'html.rg-side .rg-sd{position:static!important;transform:none!important;left:auto!important;bottom:auto!important}'+
  'html.rg-side #log,html.rg-side #roster{justify-self:stretch!important;width:auto!important}'+
  '#rg-x{margin-left:6px;padding:4px 9px;border-radius:999px;cursor:pointer;flex:none;'+
    'font-weight:700;font-size:10px;font-family:inherit;letter-spacing:.16em;text-transform:uppercase;'+
    'color:#fff8e6;background:rgba(10,7,19,.85);border:1px solid rgba(56,232,255,.45);touch-action:manipulation}'+
  '#rg-x[hidden]{display:none}'+/*@/fit*/
  '#rg-fs-how{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;'+
    'justify-content:center;padding:16px;background:rgba(4,3,10,.82)}'+
  '#rg-fs-how[hidden]{display:none}'+
  '#rg-fs-how .rg-box{max-width:340px;padding:18px 18px 14px;border-radius:12px;'+
    'background:#0d0a18;border:1px solid rgba(56,232,255,.4);color:#fff8e6;'+
    'font-size:14px;line-height:1.45;font-family:inherit}'+
  '#rg-fs-how h2{margin:0 0 8px;font-size:14px;letter-spacing:.18em;text-transform:uppercase;color:#38e8ff}'+
  '#rg-fs-how ol{margin:8px 0 12px;padding-left:20px}'+
  '#rg-fs-how li{margin:4px 0}'+
  '#rg-fs-how b{color:#ffd27f}'+
  '#rg-fs-how button{display:block;margin:0 auto;padding:7px 18px;border-radius:999px;cursor:pointer;'+
    'font-weight:700;font-size:12px;font-family:inherit;letter-spacing:.2em;text-transform:uppercase;'+
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

  /* ---- the game mode ---- */
  /*@fit*/
  function gameOn(){return !!current()||installed();}
  function touch(){try{return matchMedia('(any-pointer: coarse)').matches;}catch(e){return false;}}
  /* each part of the pads that has a side, and everything between it and the
   * page's column, which steps out of the way (display:contents) */
  function sides(){
    var wrap=document.getElementById('wrap');if(!wrap||!side)return;
    side.split('|').forEach(function(part){
      var k=part.charAt(0)==='L'?'l':'r',n=0;
      part.slice(2).split(',').forEach(function(q){
        var el=null;try{el=document.querySelector(q.trim());}catch(e){}
        if(!el||n>=3)return;
        n++;el.classList.add('rg-'+k+n,'rg-sd');
        for(var a=el.parentElement;a&&a!==wrap;a=a.parentElement)a.classList.add('rg-thru');
      });
    });
  }
  var sizing=false,queued=false;
  function size(){
    queued=false;
    if(!fit||sizing)return;
    var on=gameOn(),st=document.getElementById('stage');
    root.classList.toggle('rg-game',on);
    /* beside: on a touch screen held wide; and on any wide screen for a game
     * whose buttons stay out without one (The Bard's Tale's, and its log) */
    var t=touch(),canSide=on&&!!side&&(t||keepPads)&&window.innerWidth>window.innerHeight;
    root.classList.remove('rg-side');
    root.classList.toggle('rg-nopads',on&&!t&&!keepPads);
    var x=document.getElementById('rg-x');if(x)x.hidden=!(on&&current());
    if(!st)return;
    if(!on){root.style.removeProperty('--rg-sw');return;}
    sizing=true;
    var se=document.scrollingElement||root,W=window.innerWidth,H=window.innerHeight;
    /* what the picture must leave room for: the status bar and every control,
     * each on the screen and none under the picture. Measuring only whether
     * the page scrolled let Galaga, held sideways, push its stick off the
     * bottom, and let Wolfenstein's picture grow over its own PAUSE */
    /* (#pads .btn: Aztec's, Drol's and Lode Runner's pads are divs, not buttons) */
    var keep=[].slice.call(document.querySelectorAll('#status,#pads button,#pads .btn,#pads .stick,#pads #stick,'+
      '#pads #joy,#pads .dpad,.soundrow button'));
    var clear=function(r){
      for(var i=0;i<keep.length;i++){
        var q=keep[i].getBoundingClientRect();if(q.width<2||q.height<2)continue;
        /* wholly on the screen, and a control 4 px clear of its edge */
        var m=keep[i].id==='status'?-1:4;
        if(q.left<m||q.top<m||q.right>W-m||q.bottom>H-m)return false;
        if(Math.min(r.right,q.right)-Math.max(r.left,q.left)>1&&Math.min(r.bottom,q.bottom)-Math.max(r.top,q.top)>1)return false;
      }
      return true;};
    var at=function(w){root.style.setProperty('--rg-sw',w+'px');return st.getBoundingClientRect();};
    var inside=function(r){return r.left>=-1&&r.top>=-1&&r.right<=W+1&&r.bottom<=H+1;};
    /* the whole game on the screen, nothing scrolling; failing that (a page
     * with more on it than a screen holds), every control still in reach;
     * failing even that, the picture on the screen */
    var all=function(w){var r=at(w);return inside(r)&&clear(r)&&se.scrollHeight<=H+1&&se.scrollWidth<=W+1;};
    var reach=function(w){var r=at(w);return inside(r)&&clear(r);};
    var alone=function(w){return inside(at(w));};
    /* the widest stage that fits, in whichever arrangement is on now */
    /* (and how well it fits: 3 all of it, 2 every control, 1 the picture.
     * An arrangement that keeps the controls beats a bigger one that does not:
     * Galaga's pads under its picture only "fitted" with the stick off the
     * screen) */
    var widest=function(){
      var level=all(160)?3:reach(160)?2:1,ok=[alone,reach,all][level-1],lo=160,hi=W;
      while(hi-lo>2){var m=(lo+hi)>>1;if(ok(m))lo=m;else hi=m;}
      return{w:lo,level:level};};
    var below=widest(),best=below.w;
    if(canSide){
      root.classList.add('rg-side');
      var beside=widest();
      if(beside.level>below.level||beside.level===below.level&&beside.w>below.w)best=beside.w;
      else root.classList.remove('rg-side');
    }
    root.style.setProperty('--rg-sw',best+'px');
    /* the games size their canvases on resize: tell them the stage changed */
    try{window.dispatchEvent(new Event('resize'));}catch(e){}
    sizing=false;
  }
  function later(){if(queued||sizing)return;queued=true;
    (window.requestAnimationFrame||setTimeout)(size);}
  /*@/fit*/

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
    /*@fit*/
    if(fit){
      /* leaving, where the page has no button of its own to leave by */
      var st=document.getElementById('status');
      if(st&&!own){
        var x=document.createElement('button');x.id='rg-x';x.type='button';x.hidden=true;
        x.textContent='✕ Exit';x.setAttribute('aria-label','Leave full screen');
        x.addEventListener('click',function(e){e.preventDefault();x.blur();if(current())toggle(b);});
        st.appendChild(x);
      }
      sides();
      window.addEventListener('resize',later);
      window.addEventListener('orientationchange',later);
      /* the pads can change size in play (a fight bar, a question) */
      try{var pads=document.getElementById('pads');
        if(pads&&window.ResizeObserver)new ResizeObserver(later).observe(pads);}catch(e){}
      size();
    }
    /*@/fit*/
    var on=function(){
      /* A game's own full-screen button kept the focus, and the next ENTER,
       * which starts most of these games, pressed it again and left full
       * screen (Lode Runner did). Whatever button took the screen lets go. */
      var f=document.activeElement;
      if(f&&f!==document.body&&/^(BUTTON|A)$/.test(f.tagName)&&f.blur)f.blur();
      refresh(b);if(current())keepAwake();else letSleep();if(fit)later();};
    document.addEventListener('fullscreenchange',on);
    document.addEventListener('webkitfullscreenchange',on);
    document.addEventListener('visibilitychange',function(){if(!document.hidden&&current())keepAwake();});
  }
  if(document.body)put();
  else document.addEventListener('DOMContentLoaded',put);
})();
