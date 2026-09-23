/* ---- the coin-op bits every game here shares ----
 *
 * A high score table with three-letter initials, the entry screen that goes
 * with it, and one save slot. Eight games, one implementation, so the letters
 * are chosen the same way in all of them: three cells, the live one lit and
 * blinking, up and down to turn the letter, left and right to move along, fire
 * to take it. Type the letters straight in if you have a keyboard.
 *
 * The screen is built out of DOM rather than drawn into each game's canvas.
 * Half of these games draw their menus and half write markup, and the point of
 * this is that the entry screen is the same one everywhere; a canvas version
 * would have had to be written twice and would have drifted.
 *
 * Nothing here assumes anything about the page it is in beyond document.body.
 * It reads the host's colours through CSS custom properties where they exist
 * and falls back to its own where they do not.
 *
 * This file is the one copy. tools/sync-arcade.js writes it into each game
 * between its markers, and the check in CI fails if any of them drifts.
 */
(function(){
  /* In a browser globalThis is window and this is the same object; under a test
   * harness the page's script runs in a context where they are not, and an
   * Arcade hung only on `window` would leave the bare name undefined. */
  var root=(typeof globalThis!=='undefined'&&globalThis)||window;
  if(typeof document==='undefined'||root.Arcade)return;

  /* Storage is namespaced per game, and every touch of it is guarded: it is
   * absent in a file:// sandbox on some browsers and throws on read in private
   * mode on others, and a high score table is never worth a dead page. */
  function get(k,d){try{var v=localStorage.getItem(k);return v===null?d:v;}catch(e){return d;}}
  function put(k,v){try{localStorage.setItem(k,String(v));return true;}catch(e){return false;}}
  function drop(k){try{localStorage.removeItem(k);}catch(e){}}
  function readJSON(k,d){
    var raw=get(k,null);
    if(raw===null)return d;
    try{var v=JSON.parse(raw);return v===null?d:v;}catch(e){return d;}
  }

  /* A-Z, then the digits, then the three marks an arcade cabinet usually gave
   * you. A blank is last so it is one step back from A. */
  var GLYPHS='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-!_';
  var BLANK='_';                       /* drawn as a space, stored as a space */

  var CSS=''+
  '.ac-wrap{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;'+
    'justify-content:center;padding:14px;background:rgba(6,5,10,.93);'+
    'font-family:ui-rounded,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;'+
    '-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}'+
  '.ac-card{width:min(380px,100%);max-height:100%;overflow-y:auto;text-align:center;'+
    'background:var(--panel,#14141f);border:1px solid var(--line,#2e2e42);'+
    'border-radius:12px;padding:14px 12px;color:var(--ink,#e6e6f2)}'+
  '.ac-h{font-size:15px;letter-spacing:.16em;font-weight:800;margin:0 0 2px;'+
    'color:var(--gold,#e8c63a)}'+
  '.ac-sub{font-size:11.5px;line-height:1.5;color:var(--dim,#9a8b76);margin:0 0 10px}'+
  '.ac-cells{display:flex;gap:10px;justify-content:center;margin:6px 0 10px}'+
  '.ac-cell{width:52px;height:64px;display:flex;align-items:center;justify-content:center;'+
    'font-size:34px;font-weight:800;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;'+
    'border:2px solid var(--line,#2e2e42);border-radius:8px;background:var(--panel2,#1e1e2d);'+
    'color:var(--ink,#e6e6f2)}'+
  /* the live cell: lit, and blinking so it is unmistakably the one you are on */
  '.ac-cell.on{border-color:var(--gold,#e8c63a);color:#16130a;'+
    'background:var(--gold,#e8c63a);animation:ac-blink 1s steps(1,end) infinite}'+
  '@keyframes ac-blink{0%,55%{opacity:1}56%,100%{opacity:.45}}'+
  '@media (prefers-reduced-motion:reduce){.ac-cell.on{animation:none}}'+
  '.ac-pad{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:4px}'+
  '.ac-b{background:var(--panel2,#1e1e2d);border:1px solid var(--line,#2e2e42);'+
    'border-radius:9px;color:var(--ink,#e6e6f2);font:inherit;font-size:15px;'+
    'padding:10px 4px;cursor:pointer;touch-action:manipulation}'+
  '.ac-b:active{background:var(--gold,#e8c63a);color:#16130a;border-color:var(--gold,#e8c63a)}'+
  '.ac-b.wide{grid-column:span 4;font-size:13px;font-weight:700;letter-spacing:.06em}'+
  '.ac-rows{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;'+
    'font-size:13px;line-height:1.85;text-align:left;margin:4px 0 10px}'+
  '.ac-row{display:flex;gap:8px;align-items:baseline;padding:0 4px;border-radius:5px}'+
  '.ac-row.me{background:rgba(232,198,58,.16);color:var(--gold,#e8c63a)}'+
  '.ac-rank{width:2.2em;color:var(--dim,#9a8b76);text-align:right}'+
  '.ac-ini{width:3.6em;letter-spacing:.18em}'+
  '.ac-sc{flex:1;text-align:right;font-weight:700}'+
  '.ac-x{width:7.5em;text-align:right;color:var(--dim,#9a8b76);font-size:11px}'+
  '.ac-empty{color:var(--dim,#9a8b76);font-size:12px;padding:12px 0}'+
  '.ac-slot{display:flex;width:100%;align-items:baseline;justify-content:space-between;'+
    'gap:12px;margin-bottom:6px;text-align:left}'+
  '.ac-slot .n{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;'+
    'letter-spacing:.18em;font-weight:700;font-size:15px}'+
  '.ac-slot .w{font-size:11px;opacity:.7;text-align:right}'+
  '.ac-slot.on{border-color:var(--gold,#e8c63a)}';

  function styles(){
    if(document.getElementById('ac-style'))return;
    var s=document.createElement('style');
    s.id='ac-style';s.textContent=CSS;
    (document.head||document.documentElement).appendChild(s);
  }

  var cfg={game:'game',slots:8,title:'HIGH SCORES',extraLabel:''};

  var K={
    scores:function(){return 'arcade.'+cfg.game+'.scores';},
    slots:function(){return 'arcade.'+cfg.game+'.slots';},
    last:function(){return 'arcade.'+cfg.game+'.initials';}
  };

  function table(){
    var rows=readJSON(K.scores(),[]);
    if(!rows||!rows.length||typeof rows.length!=='number')return[];
    return rows.filter(function(r){
      return r&&typeof r.score==='number'&&isFinite(r.score);
    }).map(function(r){
      return{ini:String(r.ini||'AAA').slice(0,3),score:Math.floor(r.score),
        at:r.at||0,extra:r.extra===undefined?'':String(r.extra)};
    }).sort(function(a,b){return b.score-a.score||a.at-b.at;}).slice(0,cfg.slots);
  }
  /* A score gets in if the table is short or it beats the last row. Ties go to
   * whoever got there first, which is what the sort above does. */
  function qualifies(score){
    if(typeof score!=='number'||!isFinite(score)||score<=0)return false;
    var t=table();
    return t.length<cfg.slots||score>t[t.length-1].score;
  }
  function record(ini,score,extra){
    var t=table();
    var row={ini:String(ini||'AAA').toUpperCase().slice(0,3),score:Math.floor(score),
      at:Date.now(),extra:extra===undefined?'':String(extra)};
    t.push(row);
    t.sort(function(a,b){return b.score-a.score||a.at-b.at;});
    t=t.slice(0,cfg.slots);
    put(K.scores(),JSON.stringify(t));
    put(K.last(),row.ini);
    return row;
  }

  /* ---- save slots, one per set of initials ----
   * A table of saves the same shape as the table of scores: your three letters
   * are the name on it, so two people can leave a game half finished on the
   * same machine and each pick up their own. Oldest goes when it is full. */
  function slots(){
    var raw=readJSON(K.slots(),{});
    if(!raw||typeof raw!=='object'||raw.length!==undefined)return[];
    var out=[];
    for(var k in raw){
      if(!Object.prototype.hasOwnProperty.call(raw,k))continue;
      var v=raw[k];
      if(!v||v.state===undefined)continue;
      out.push({ini:String(k).slice(0,3),at:v.at||0,
        extra:v.extra===undefined?'':String(v.extra),state:v.state});
    }
    return out.sort(function(a,b){return b.at-a.at;});
  }
  function slotFor(ini){
    ini=String(ini||'').toUpperCase().slice(0,3);
    var all=slots();
    for(var i=0;i<all.length;i++)if(all[i].ini===ini)return all[i];
    return null;
  }
  function writeSlot(ini,state,extra){
    ini=String(ini||'AAA').toUpperCase().slice(0,3);
    var all=slots().filter(function(s){return s.ini!==ini;});
    all.unshift({ini:ini,at:Date.now(),extra:extra===undefined?'':String(extra),state:state});
    all=all.slice(0,cfg.slots);
    var obj={};
    all.forEach(function(s){obj[s.ini]={at:s.at,extra:s.extra,state:s.state};});
    var ok=put(K.slots(),JSON.stringify(obj));
    if(ok)put(K.last(),ini);
    return ok?slotFor(ini):null;
  }
  function dropSlot(ini){
    ini=String(ini||'').toUpperCase().slice(0,3);
    var obj={};
    slots().forEach(function(s){if(s.ini!==ini)obj[s.ini]={at:s.at,extra:s.extra,state:s.state};});
    put(K.slots(),JSON.stringify(obj));
  }
  /* "3 minutes ago", near enough — a save slot wants to know how stale it is,
   * not what the clock said. */
  function ago(t){
    var d=Math.max(0,Date.now()-t), m=Math.round(d/60000);
    if(m<1)return'just now';
    if(m<60)return m+(m===1?' minute':' minutes')+' ago';
    var h=Math.round(m/60);
    if(h<24)return h+(h===1?' hour':' hours')+' ago';
    var dy=Math.round(h/24);
    return dy+(dy===1?' day':' days')+' ago';
  }

  /* ---- the screens ---- */
  var open=null;                       /* the overlay on screen, if any */
  function close(){
    if(!open)return;
    document.removeEventListener('keydown',open.key,true);
    if(open.el&&open.el.parentNode)open.el.parentNode.removeChild(open.el);
    open=null;
  }
  /* Can this document be built on at all? A page with no createElement is not
   * a page a screen can be put on, and the answer must be no rather than a
   * throw: the moment this is asked is the moment a game has just ended, and a
   * high score table is never worth taking the game down with it. */
  function buildable(){
    return !!(document&&typeof document.createElement==='function'&&document.body&&
      typeof document.body.appendChild==='function');
  }
  function frame(){
    styles();
    var w=document.createElement('div');w.className='ac-wrap';
    var c=document.createElement('div');c.className='ac-card';
    w.appendChild(c);
    document.body.appendChild(w);
    return{wrap:w,card:c};
  }
  function button(parent,label,fn,cls){
    var b=document.createElement('button');
    b.type='button';b.className='ac-b'+(cls?' '+cls:'');b.textContent=label;
    b.addEventListener('click',function(e){e.preventDefault();fn();});
    parent.appendChild(b);
    return b;
  }
  function fmt(n){return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');}
  function show(opts){
    opts=opts||{};
    if(!buildable()){if(opts.onClose)opts.onClose();return null;}
    close();
    var f=frame(),rows=table();
    var h=document.createElement('p');h.className='ac-h';h.textContent=cfg.title;
    f.card.appendChild(h);
    if(opts.sub){
      var sb=document.createElement('p');sb.className='ac-sub';sb.textContent=opts.sub;
      f.card.appendChild(sb);
    }
    var list=document.createElement('div');list.className='ac-rows';
    if(!rows.length){
      var e=document.createElement('div');e.className='ac-empty';
      e.textContent='Nobody has been here yet.';
      list.appendChild(e);
    }
    rows.forEach(function(r,i){
      var row=document.createElement('div');
      row.className='ac-row'+(opts.mark&&r.at===opts.mark?' me':'');
      row.innerHTML='<span class="ac-rank">'+(i+1)+'</span>'+
        '<span class="ac-ini"></span><span class="ac-sc"></span>'+
        (cfg.extraLabel?'<span class="ac-x"></span>':'');
      row.querySelector('.ac-ini').textContent=r.ini;
      row.querySelector('.ac-sc').textContent=fmt(r.score);
      if(cfg.extraLabel)row.querySelector('.ac-x').textContent=r.extra||'';
      list.appendChild(row);
    });
    f.card.appendChild(list);
    var pad=document.createElement('div');pad.className='ac-pad';
    f.card.appendChild(pad);
    var done=opts.onClose||function(){};
    button(pad,'BACK',function(){close();done();},'wide');
    open={el:f.wrap,key:function(ev){
      if(ev.key==='Escape'||ev.key==='Enter'||ev.key===' '){
        ev.preventDefault();ev.stopPropagation();close();done();
      }
    }};
    document.addEventListener('keydown',open.key,true);
    return f;
  }

  /* Three cells, the live one lit; one keydown handler taken at the capture
   * phase so the game underneath never sees the letters being chosen. Both the
   * high score entry and the save slot go through here, which is the point: a
   * player enters their initials the same way whatever they are for. */
  function letters(o,then){
    if(!buildable()){then(null);return null;}
    close();
    var f=frame();
    var seed=((o.seed||get(K.last(),'AAA'))+'AAA').slice(0,3).toUpperCase();
    var idx=[0,1,2].map(function(i){
      var p=GLYPHS.indexOf(seed[i]);return p<0?0:p;
    });
    var at=0,fin=false;

    var h=document.createElement('p');h.className='ac-h';
    h.textContent=o.title||'ENTER YOUR INITIALS';
    var sub=document.createElement('p');sub.className='ac-sub';
    sub.textContent=o.sub||'';
    f.card.appendChild(h);f.card.appendChild(sub);

    var cells=document.createElement('div');cells.className='ac-cells';
    var cellEls=[0,1,2].map(function(){
      var d=document.createElement('div');d.className='ac-cell';
      cells.appendChild(d);return d;
    });
    f.card.appendChild(cells);
    function paint(){
      for(var i=0;i<3;i++){
        var g=GLYPHS[idx[i]];
        cellEls[i].textContent=g===BLANK?' ':g;
        cellEls[i].className='ac-cell'+(i===at?' on':'');
      }
    }
    function turn(d){idx[at]=(idx[at]+d+GLYPHS.length)%GLYPHS.length;paint();}
    function move(d){at=Math.max(0,Math.min(2,at+d));paint();}
    function setGlyph(ch){
      var p=GLYPHS.indexOf(ch);
      if(p<0)return false;
      idx[at]=p;
      if(at<2){at++;}
      paint();return true;
    }
    function finish(){
      if(fin)return;
      fin=true;
      var ini=idx.map(function(i){
        var g=GLYPHS[i];return g===BLANK?' ':g;
      }).join('').replace(/\s+$/,'');
      if(!ini)ini='AAA';
      close();
      then(ini);
    }

    var pad=document.createElement('div');pad.className='ac-pad';
    f.card.appendChild(pad);
    button(pad,'◀',function(){move(-1);});
    button(pad,'▲',function(){turn(1);});
    button(pad,'▼',function(){turn(-1);});
    button(pad,'▶',function(){move(1);});
    button(pad,'ENTER',finish,'wide');

    if(o.cancel)button(pad,'NEVER MIND',function(){close();then(null);},'wide');
    open={el:f.wrap,key:function(ev){
      var k=ev.key;
      var used=true;
      if(k==='Escape'&&o.cancel){close();then(null);}
      else if(k==='ArrowUp'||k==='w'||k==='W')turn(1);
      else if(k==='ArrowDown'||k==='s'||k==='S')turn(-1);
      else if(k==='ArrowLeft'||k==='a'||k==='A')move(-1);
      else if(k==='ArrowRight'||k==='d'||k==='D')move(1);
      else if(k==='Enter')finish();
      else if(k==='Backspace'){if(at>0)move(-1);else turn(0);}
      else if(k&&k.length===1&&setGlyph(k.toUpperCase())){/* typed straight in */}
      else used=false;
      if(used){ev.preventDefault();ev.stopPropagation();}
    }};
    document.addEventListener('keydown',open.key,true);
    paint();
    return f;
  }

  root.Arcade={
    /* name the game once, at boot */
    init:function(o){
      o=o||{};
      cfg.game=String(o.game||'game');
      cfg.slots=Math.max(1,Math.min(20,o.slots||8));
      if(o.title)cfg.title=String(o.title);
      cfg.extraLabel=o.extraLabel?String(o.extraLabel):'';
      return this;
    },
    glyphs:GLYPHS,
    table:table,
    qualifies:qualifies,
    /* Offer the entry screen if the score is worth one; `then` gets the row
     * that was written, or null if it was not a high score at all. */
    submit:function(score,extra,then){
      then=then||function(){};
      if(!qualifies(score)||!buildable()){then(null);return false;}
      letters({title:'NEW HIGH SCORE',
        sub:fmt(Math.floor(score))+(extra?'  ·  '+extra:'')+'  —  enter your initials'},
        function(ini){then(ini?record(ini,score,extra):null);});
      return true;
    },
    /* the three-letter picker on its own, for anything else that wants one */
    letters:function(o,then){return letters(o||{},then||function(){});},
    /* whether a screen can be put up here at all */
    canAsk:buildable,
    show:function(opts){show(opts);return this;},
    close:close,
    isOpen:function(){return !!open;},
    /* for the tests and for a player who wants their table back */
    clear:function(){drop(K.scores());return this;},
    record:record,
    /* ---- save slots ----
     * What goes in one is the game's business; all this does is keep it under
     * three letters, namespaced per game, and admit when it could not. */
    slots:slots,
    slotFor:slotFor,
    writeSlot:writeSlot,
    dropSlot:dropSlot,
    hasSlots:function(){return slots().length>0;},
    clearSlots:function(){drop(K.slots());return this;},
    /* Ask for three letters, then keep the state under them. */
    saveAs:function(state,extra,then){
      then=then||function(){};
      if(!buildable()){then(null);return false;}
      letters({title:'SAVE',sub:'Three letters to keep it under',cancel:true},
        function(ini){then(ini?writeSlot(ini,state,extra):null);});
      return true;
    },
    /* Show what is saved and hand back the one that is chosen. */
    resume:function(then){
      then=then||function(){};
      var all=slots();
      if(!all.length||!buildable()){then(null);return false;}
      close();
      var f=frame();
      var h=document.createElement('p');h.className='ac-h';h.textContent='RESUME';
      var sb=document.createElement('p');sb.className='ac-sub';
      sb.textContent='Whose game?';
      f.card.appendChild(h);f.card.appendChild(sb);
      var list=document.createElement('div');list.className='ac-rows';
      f.card.appendChild(list);
      var pad=document.createElement('div');pad.className='ac-pad';
      f.card.appendChild(pad);
      var sel=0,rowEls=[];
      all.forEach(function(sl){
        var b=document.createElement('button');
        b.type='button';b.className='ac-b ac-slot';
        b.innerHTML='<span class="n"></span><span class="w"></span>';
        b.querySelector('.n').textContent=sl.ini;
        b.querySelector('.w').textContent=(sl.extra?sl.extra+'  ·  ':'')+ago(sl.at);
        b.addEventListener('click',function(e){e.preventDefault();close();then(sl);});
        list.appendChild(b);rowEls.push(b);
      });
      function paintSel(){
        rowEls.forEach(function(b,i){b.className='ac-b ac-slot'+(i===sel?' on':'');});
      }
      button(pad,'NEVER MIND',function(){close();then(null);},'wide');
      open={el:f.wrap,key:function(ev){
        var k=ev.key,used=true;
        if(k==='ArrowDown'||k==='s'||k==='S'){sel=(sel+1)%rowEls.length;paintSel();}
        else if(k==='ArrowUp'||k==='w'||k==='W'){sel=(sel-1+rowEls.length)%rowEls.length;paintSel();}
        else if(k==='Enter'||k===' '){close();then(all[sel]);}
        else if(k==='Escape'){close();then(null);}
        else used=false;
        if(used){ev.preventDefault();ev.stopPropagation();}
      }};
      document.addEventListener('keydown',open.key,true);
      paintSel();
      return true;
    }
  };
})();
