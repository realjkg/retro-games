/* ---- the Apple IIe joystick, on the glass ---- *
 *
 * The machines these games came off had a stick, not a d-pad: two pots and two
 * buttons, and the games were written for it. A three-by-three grid of buttons
 * is a later idea from a different console, and on a phone it is the worse of
 * the two - nine targets a thumb finds by feel, with hard edges between them,
 * so a thumb drifting from the left button to the up one crosses the corner
 * and stops the player dead mid-stride.
 *
 * This is the stick instead: one round gate, a knob that follows the thumb, and
 * the pointer taken captive on the way down so a thumb that slides off the pad
 * keeps steering instead of handing the gesture back to the page. That last
 * part is also why it helps with the zoom - a captured pointer inside a
 * touch-action:none gate is not a scroll, a pull-to-refresh, the first finger
 * of a pinch, or a long press the browser can put a magnifier on top of. The
 * guard in shared/no-zoom.js still does its half; this stops the control
 * surface itself from ever starting one of those gestures.
 *
 * The games below still read directions, not angles, so the vector is turned
 * back into up/down/left/right - four ways or eight - and handed over on the
 * edge, when a direction is entered or left. A game wires it to the same key
 * state its d-pad set and nothing else about the game changes.
 *
 * One copy. tools/sync-stick.js writes it into each page that uses it.
 *
 *   Stick.make({host:'#stickhost', ways:4, onDirs:function(now,was){...}})
 *
 * host  element or selector, the gate is built inside it | ways 4 or 8
 * axes  'xy' (default), 'x' or 'y' | dead  deadzone 0..1, default .34
 * label aria-label | unlock  called on the way down, for the audio unlock
 * onDirs(now,was) only when the set changes | onMove(x,y,held) every move
 *
 * It returns {el,x,y,held,dirs,radius,release} and keeps x/y/held/dirs live.
 */
(function(root){
  'use strict';
  var D=root&&root.document;
  var CSS=
   '.jstick{position:relative;width:136px;height:136px;border-radius:50%;flex:0 0 auto;'+
     'background:var(--panel2,#2a2f45);border:1px solid var(--line,#4a5170);'+
     'touch-action:none;cursor:grab;-webkit-touch-callout:none;'+
     '-webkit-user-select:none;user-select:none;-webkit-user-drag:none;'+
     '-webkit-tap-highlight-color:transparent}'+
   '.jstick .jring{position:absolute;inset:13px;border-radius:50%;'+
     'border:1px dashed var(--line,#4a5170);opacity:.55;pointer-events:none}'+
   '.jstick .jtick{position:absolute;background:var(--dim,#8a90ad);opacity:.5;'+
     'pointer-events:none}'+
   '.jstick .j-u,.jstick .j-d{left:50%;width:2px;height:7px;margin-left:-1px}'+
   '.jstick .j-l,.jstick .j-r{top:50%;height:2px;width:7px;margin-top:-1px}'+
   '.jstick .j-u{top:4px}.jstick .j-d{bottom:4px}'+
   '.jstick .j-l{left:4px}.jstick .j-r{right:4px}'+
   '.jstick .jknob{position:absolute;left:50%;top:50%;width:58px;height:58px;'+
     'margin:-29px 0 0 -29px;border-radius:50%;'+
     /* The knob has to read against the gate in nine different palettes, two
      * of which flip for light mode. --dim is the one mid-tone every game
      * defines and the only one that contrasts with --panel2 both ways round;
      * a game that wants its own can set --knob. */
     'background:var(--knob,var(--dim,#46537a));'+
     'border:2px solid var(--line,#4a5170);pointer-events:none;'+
     'box-shadow:0 2px 0 rgba(0,0,0,.35) inset;transition:background .08s linear}'+
   '.jstick.on{cursor:grabbing}'+
   '.jstick.on .jknob{background:var(--gold,#e8c06a);border-color:var(--gold,#e8c06a)}'+
   /* The middle cell of the d-pad was never a direction in any of these games -
    * it was WALK, HOVER, MENU, HOLSTER. A round gate has no middle cell to put
    * it in, so it stands beside the stick instead of being quietly lost. */
   '.jstickwrap{display:flex;flex-direction:column;align-items:center;gap:6px;'+
     'flex:0 0 auto}'+
   '.jstickwrap .jaside{display:flex;gap:6px;align-items:center}'+
   '@media (max-width:360px){.jstick{width:116px;height:116px}'+
     '.jstick .jknob{width:50px;height:50px;margin:-25px 0 0 -25px}}';

  function css(){
    if(!D||!D.head||D.getElementById('jstick-css'))return;
    var st=D.createElement('style');
    st.id='jstick-css';
    st.appendChild(D.createTextNode(CSS));
    D.head.appendChild(st);
  }

  function clamp(v,a,b){return v<a?a:v>b?b:v;}

  /* Four-way is winner-takes-all: the bigger component wins, so a thumb that
   * wanders off true never gives a diagonal a game cannot use. Eight-way calls
   * a direction pushed once its component is better than a third of the throw,
   * which puts the diagonal wedges at roughly the same width as the straights. */
  function dirsOf(x,y,ways,dead){
    var d={u:false,d:false,l:false,r:false};
    var m=Math.sqrt(x*x+y*y);
    if(m<dead)return d;
    if(ways===8){
      if(y<-0.38*m)d.u=true; else if(y>0.38*m)d.d=true;
      if(x<-0.38*m)d.l=true; else if(x>0.38*m)d.r=true;
    }else if(Math.abs(x)>=Math.abs(y)){
      if(x<0)d.l=true; else d.r=true;
    }else{
      if(y<0)d.u=true; else d.d=true;
    }
    return d;
  }
  function same(a,b){return a.u===b.u&&a.d===b.d&&a.l===b.l&&a.r===b.r;}

  /* The test harnesses run each game's script in a bare vm with a document
   * stubbed down to what the game asks for, and none of them has a head to
   * hang a stylesheet on. A control surface that cannot be built is not an
   * error there - it is a page with no pads - so this refuses softly and the
   * game runs on its keyboard. */
  function buildable(){
    return !!(D&&D.createElement&&D.head&&D.querySelector);
  }

  function make(o){
    o=o||{};
    if(!buildable())return null;
    var host=null;
    try{host=typeof o.host==='string'?D.querySelector(o.host):o.host;}catch(e){}
    if(!host||!host.appendChild)return null;
    css();
    var axes=o.axes||'xy', ways=o.ways===8?8:4;
    var dead=typeof o.dead==='number'?o.dead:0.34;

    var el=D.createElement('div');
    el.className='jstick';
    el.setAttribute('role','application');
    el.setAttribute('aria-label',o.label||'Joystick');
    var html='<i class="jring" aria-hidden="true"></i>';
    if(axes.indexOf('y')>=0)
      html+='<i class="jtick j-u" aria-hidden="true"></i><i class="jtick j-d" aria-hidden="true"></i>';
    if(axes.indexOf('x')>=0)
      html+='<i class="jtick j-l" aria-hidden="true"></i><i class="jtick j-r" aria-hidden="true"></i>';
    html+='<i class="jknob" aria-hidden="true"></i>';
    el.innerHTML=html;
    host.appendChild(el);
    var knob=el.querySelector('.jknob');

    var S={el:el,x:0,y:0,held:false,dirs:dirsOf(0,0,ways,dead),radius:radius,
           release:release};

    /* The throw is measured off the knob rather than guessed, because the gate
     * and the knob are both sized in a media query and a guessed number let the
     * knob ride out over its own rim. */
    function radius(){
      var r=el.getBoundingClientRect();
      var kw=(knob&&knob.offsetWidth)||52;
      if(!r||!r.width)return 48;
      return Math.max(16,r.width/2-kw/2-3);
    }
    function paint(dx,dy){
      if(knob)knob.style.transform='translate('+Math.round(dx)+'px,'+Math.round(dy)+'px)';
    }
    function settle(x,y,held){
      S.x=x;S.y=y;S.held=held;
      var next=dirsOf(x,y,ways,dead), was=S.dirs;
      if(!same(next,was)){S.dirs=next; if(o.onDirs)o.onDirs(next,was);}
      if(o.onMove)o.onMove(x,y,held);
    }
    function moveTo(ev){
      var r=el.getBoundingClientRect(), R=radius();
      var dx=axes.indexOf('x')>=0?ev.clientX-(r.left+r.width/2):0;
      var dy=axes.indexOf('y')>=0?ev.clientY-(r.top+r.height/2):0;
      var d=Math.sqrt(dx*dx+dy*dy);
      if(d>R){dx=dx/d*R;dy=dy/d*R;}
      paint(dx,dy);
      settle(clamp(dx/R,-1,1),clamp(dy/R,-1,1),true);
    }
    function release(){
      id=null;
      el.classList.remove('on');
      paint(0,0);
      settle(0,0,false);
    }

    var id=null;
    el.addEventListener('pointerdown',function(e){
      if(e.preventDefault)e.preventDefault();
      if(o.unlock)o.unlock();
      try{el.setPointerCapture&&el.setPointerCapture(e.pointerId);}catch(err){}
      id=e.pointerId; el.classList.add('on');
      moveTo(e);
    });
    el.addEventListener('pointermove',function(e){
      if(id!==e.pointerId)return;
      if(e.preventDefault)e.preventDefault();
      moveTo(e);
    });
    ['pointerup','pointercancel','lostpointercapture'].forEach(function(ev){
      el.addEventListener(ev,function(e){ if(id===e.pointerId)release(); });
    });
    /* A pointer the page loses track of entirely - the tab going away mid-dive,
     * a gesture the browser takes over - must still let go, or the player comes
     * back to a character walking into a wall. */
    if(root.addEventListener){
      root.addEventListener('blur',function(){if(S.held)release();});
      D.addEventListener('visibilitychange',function(){if(D.hidden&&S.held)release();});
    }

    /* A keyboard is a stick with four positions, and the knob has to say so or
     * the player on a keyboard is looking at a control that never moves. */
    S.showKeys=function(kx,ky){
      if(S.held)return;
      var R=radius();
      paint(kx*R,ky*R);
      el.classList.toggle('on',!!(kx||ky));
    };
    return S;
  }

  root.Stick={make:make,dirsOf:dirsOf,buildable:buildable,css:CSS};
})(typeof window!=='undefined'?window:this);
