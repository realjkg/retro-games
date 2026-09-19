/* ---- the pinch and the double tap ---- *
 *
 * iOS Safari has ignored `user-scalable=no` and `maximum-scale` in the viewport
 * meta tag since iOS 10. Every one of these pages carried both and neither did
 * anything, so a double tap anywhere - on the glass, on a control, on the black
 * - zoomed the page, and a zoomed page puts the controls off the edge of the
 * screen. In a game with a clock running that is not an inconvenience, it is a
 * death, and full screen does not help because the zoom is applied to the
 * visual viewport on top of whatever the layout is doing.
 *
 * Three things are needed and the meta tag is none of them:
 *
 *   1. gesturestart / gesturechange / gestureend. This is how WebKit offers a
 *      pinch, and it exists on no other engine.
 *   2. A non-passive touchend that eats the second tap of a double tap. It has
 *      to be non-passive or preventDefault is ignored outright, and it has to
 *      be touchend rather than dblclick, because the zoom is committed before
 *      a dblclick is ever dispatched.
 *   3. A way back for a player who is zoomed already, because neither of the
 *      above can un-zoom a page that is. Rewriting the viewport meta is the
 *      only lever a page has over WebKit's zoom, and it only fires on a real
 *      change, so the content is toggled rather than re-set.
 *
 * This file is the one copy. tools/sync-nozoom.js writes it into each game
 * between its markers, and the check in CI fails if any of them drifts.
 */
(function(){
  var D=document, W=window;
  if(!D.addEventListener)return;
  for(var i=0,g=["gesturestart","gesturechange","gestureend"];i<g.length;i++)
    D.addEventListener(g[i],function(e){e.preventDefault();},{passive:false});
  /* Eating the second tap of a double tap eats the click the browser makes
   * out of it, and every game here has controls that listen for one - so on a
   * control this would cost the player every second press of a fast mash,
   * which in a game about pressing fire quickly is worse than the zoom. The
   * controls do not need it: a button carrying touch-action none or
   * manipulation is already exempt from double-tap zoom on every engine that
   * honours it. So the guard leaves anything pressable alone and covers the
   * rest of the page, which is where the zoom was coming from. */
  var PRESSABLE="button,a,input,select,textarea,label,[data-cmd],[role=button]";
  function pressable(t){
    return !!(t&&t.closest&&t.closest(PRESSABLE));
  }
  var lastTap=0;
  D.addEventListener("touchend",function(e){
    var now=Date.now();
    if(now-lastTap<=350&&e.cancelable&&!pressable(e.target))e.preventDefault();
    lastTap=now;
  },{passive:false});
  /* A second finger is a pinch wherever it lands, and no game here wants one. */
  D.addEventListener("touchstart",function(e){
    if(e.touches&&e.touches.length>1&&e.cancelable)e.preventDefault();
  },{passive:false});

  var vv=W.visualViewport, meta=D.querySelector('meta[name="viewport"]');
  if(!vv||!meta)return;
  var base=meta.getAttribute("content"), fixing=false;
  function unzoom(){
    if(fixing||vv.scale<=1.01)return;
    fixing=true;
    meta.setAttribute("content",base+", minimum-scale=1");
    W.setTimeout(function(){
      meta.setAttribute("content",base);
      fixing=false;
      if(W.scrollTo)W.scrollTo(0,0);
    },50);
  }
  vv.addEventListener("resize",unzoom);
  vv.addEventListener("scroll",unzoom);
  W.__unzoom=unzoom;                 // so a harness can ask for it directly
})();
