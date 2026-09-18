/* ============ presentation and input ============
 * Two static zones, as the original had them: the scene fills the top half,
 * framed from behind the sheriff's holster, and the five-line dialogue matrix
 * fills the bottom. One rAF loop, wrapped, drives both.                      */
"use strict";
const cv=document.getElementById("scene"), ctx=cv.getContext("2d");
const panel=document.getElementById("panel");
const lineEls=[0,1,2,3,4].map(i=>document.getElementById("line"+i));
const scoreEl=document.getElementById("score");
const modeEl=document.getElementById("mode");
const muteBtn=document.getElementById("mute");

let G=newDay({}), cursor=0, started=false, lastFrame=0, drawnAt=0, firedLatency=null;
let screen=null, cueAt=0;           // the sound test, which is not a game phase
let build={at:0,rows:0};            // the block-load cadence
let flash=0, bodyFall=0, said="", react="", wokeAt=0;

/* ---- one clock for the sound ---- *
 * Cues used to be scheduled on setTimeout, which has no idea what happened
 * after it was set. A man's footsteps would arrive after he had been shot, a
 * church bell after the next visitor had knocked, a reload into the sundown
 * table. Every scheduled cue now carries the sequence it was scheduled in, and
 * the frame loop drops any whose sequence has moved on. Advancing the
 * encounter is a single call, and the street goes quiet with it.
 */
let seq=0;
const queue=[];
function cueAtMs(ms,fn){queue.push({at:performance.now()+ms,seq:seq,fn:fn});}
function newSeq(){seq++; queue.length=0;}
function runQueue(now){
  if(!queue.length)return;
  queue.sort((a,b)=>a.at-b.at);
  while(queue.length&&queue[0].at<=now){
    const c=queue.shift();
    if(c.seq===seq)c.fn();
  }
}

/* ---- layout: the canvas keeps the scene's proportions inside the top half ---- */
function fit(){
  const r=cv.getBoundingClientRect(), d=Math.min(devicePixelRatio||1,2.5);
  cv.width=Math.max(160,Math.round(r.width*d));
  cv.height=Math.max(100,Math.round(r.height*d));
}
addEventListener("resize",()=>{fit();paint();});
/* 320x200 was shown on a 4:3 screen, so the logical picture is stretched into
 * the largest 4:3 rectangle the canvas holds rather than into a square grid. */
const sceneGeom=()=>{
  const w=Math.min(cv.width,cv.height*4/3), h=w*3/4;
  return {sx:w/SCENE.w,sy:h/SCENE.h,ox:(cv.width-w)/2,oy:(cv.height-h)/2};
};


/* ---- the palette and the two painters everything else is built from ---- *
 * The C64's sixteen colours are the whole palette, and every shape is placed on
 * integer pixels so nothing on screen has a soft edge. */
const C64={blk:"#000000",wht:"#ffffff",red:"#68372b",cyn:"#70a4b2",pur:"#6f3d86",
  grn:"#588d43",blu:"#352879",yel:"#b8c76f",org:"#6f4f25",brn:"#433900",
  lrd:"#9a6759",dgy:"#444444",gry:"#6c6c6c",lgn:"#9ad284",lbl:"#6c5eb5",lgy:"#959595"};
const px=(x,y,w,h,col)=>{ctx.fillStyle=col;ctx.fillRect(Math.round(x),Math.round(y),
  Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
const lerp=(x,x0,y0,x1,y1)=>y0+(y1-y0)*(x-x0)/(x1-x0||1);
/* A colour a step up or down its own ramp: positive toward the light, negative
 * into the shadow. Flat fields are what made the town read as a different kind
 * of drawing from the sheriff, and a ramp is the cheapest way off a flat field. */
const CLAMP=v=>v<0?0:v>255?255:Math.round(v);
function shade(col,f){
  if(typeof col!=="string"||col.charAt(0)!=="#"||col.length!==7)return col;
  const n=parseInt(col.slice(1),16);
  let r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  if(f>=0){r+=(255-r)*f; g+=(255-g)*f; b+=(255-b)*f;}
  else{r*=1+f; g*=1+f; b*=1+f;}
  return "#"+((1<<24)|(CLAMP(r)<<16)|(CLAMP(g)<<8)|CLAMP(b)).toString(16).slice(1);
}

/* ---- figures ---- *
 * A caller is a 24x20 grid painted two pixels to a cell, with a one-pixel dark
 * rim on every edge that meets the air. The rim is what keeps a figure legible
 * against a lit window or a dark doorway. */
function cellColour(ch,look){
  switch(ch){
    case "H":return look.H; case "R":return look.R||look.H;
    case "C":return look.C; case "K":return look.K||look.C;
    case "L":return look.L||look.C; case "W":return look.W||C64.wht;
    case "F":return look.F||C64.lrd; case "A":return look.F||C64.lrd;
    case "E":return C64.blk; case "B":return C64.blk;
    case "G":return C64.lgy; case "S":return C64.yel;
    case "P":return look.P||C64.brn;
    default:return null;
  }
}
const LOOK={
  stranger:{H:C64.brn,C:C64.dgy,K:"#2e2e2e",L:C64.dgy,W:C64.lgy},
  rose:    {H:C64.brn,R:C64.brn,C:C64.red,K:"#54291f",L:C64.red,W:C64.wht},
  kid:     {H:C64.org,C:C64.brn,K:"#2e2700",L:C64.brn,W:C64.yel},
  doctor:  {H:C64.blk,C:C64.blu,K:"#241a54",L:C64.blu,W:C64.wht,P:C64.brn},
  shotgun: {H:C64.lrd,C:C64.lgn,K:C64.grn,L:C64.blu,W:C64.lgn},
  willie:  {H:C64.grn,C:C64.yel,K:C64.grn,L:C64.brn,W:C64.yel},
  april:   {H:C64.brn,R:C64.brn,C:C64.grn,K:"#3e6330",L:C64.grn,W:C64.wht,P:C64.dgy},
  gambler: {H:C64.blk,C:C64.pur,K:"#4c2a5c",L:C64.blk,W:C64.wht,P:C64.wht},
  deputy:  {H:C64.org,C:C64.lbl,K:"#4a4080",L:C64.blu,W:C64.lgy},
  belle:   {H:C64.lrd,R:C64.brn,C:C64.brn,K:"#2e2700",L:C64.brn,W:C64.cyn,P:C64.yel},
  lastgun: {H:C64.blk,C:"#1a1a1a",K:"#101010",L:C64.blk,W:C64.dgy},
  robber:  {H:C64.dgy,C:C64.red,K:"#4a271d",L:C64.brn,W:C64.gry}
};
function figureRows(fig,pose){
  const rows=fig.rows.slice();
  const over=pose==="raise"?fig.raise:(pose==="surrender"?SURRENDER:null);
  if(over)for(const k of Object.keys(over))rows[+k]=over[k].padEnd(SPR.w,".").slice(0,SPR.w);
  return rows;
}
/* The silhouette is stamped a pixel larger in black and the colours laid over
 * it, which gives a one-pixel rim at any cell size: that rim is what keeps a
 * figure legible against a lit window or a dark doorway. */
function drawFigure(rows,x0,y0,look,cw,ch){
  const w=cw||FIGCW, h=ch||FIGCH, at=(r,c)=>(rows[r]&&rows[r][c])||".";
  let cols=0; for(const r of rows)if(r.length>cols)cols=r.length;
  ctx.fillStyle=C64.blk;
  for(let r=0;r<rows.length;r++)for(let c=0;c<cols;c++){
    if(cellColour(at(r,c),look)===null)continue;
    ctx.fillRect(Math.round(x0+c*w)-1,Math.round(y0+r*h)-1,w+2,h+2);
  }
  // The light comes from the left, as it does in the sheriff's own drawing, so
  // each row is lit along the edge it turns toward the light and dropped a step
  // along the edge it turns away. A flat silhouette becomes a body.
  for(let r=0;r<rows.length;r++){
    let l=-1,rt=-1;
    for(let c=0;c<cols;c++)if(cellColour(at(r,c),look)!==null){if(l<0)l=c;rt=c;}
    const round=rt-l>2;
    for(let c=0;c<cols;c++){
      const col=cellColour(at(r,c),look); if(!col)continue;
      let k=col;
      if(round&&rt-c<=1)k=shade(col,-0.24);
      else if(round&&c-l<=0)k=shade(col,0.18);
      px(x0+c*w,y0+r*h,w,h,k);
    }
  }
}

/* ---- what a body does while it is standing there ---- *
 * A figure that holds one pose is a cut-out, whatever is drawn on it. These
 * are twenty-four cells across, so there is no room to act with; what there is
 * is a pixel of movement, and a pixel at this size is the difference between a
 * man waiting and a prop of a man. Everyone breathes, sways off one hip, and
 * blinks on his own clock. The head carries a mood on three rows of it: a brow
 * that comes down, a mouth that sets, and a lean. And when the sheriff says
 * something, whoever he said it to reacts before he answers.
 */
const HEADROWS=6;                       // rows 0-5 are hat, brow, eyes, jaw
const MOODS={
  warm:   {brow:0, mouth:"soft", lean: 0, rise: 0},
  neutral:{brow:0, mouth:"set",  lean: 0, rise: 0},
  wary:   {brow:1, mouth:"set",  lean: 0, rise:-1},
  hostile:{brow:2, mouth:"grim", lean: 1, rise:-1},
  scared: {brow:0, mouth:"open", lean:-1, rise: 1}
};
/* Each round of talk is named for its temper, so the name is the mood. */
const MOOD_OF={
  cordial:"warm", kind:"warm", civil:"warm", easy:"warm", warm:"warm", admire:"warm",
  proud:"warm", supper:"warm", deal:"warm", square:"warm", money:"warm", talk:"warm",
  wary:"wary", doubt:"wary", probe:"wary", watch:"wary", secret:"wary", clam:"wary",
  cool:"wary", listen:"wary", why:"wary", seen:"wary", askers:"wary", count:"wary",
  deck:"wary", window:"wary", confirm:"wary", terms:"wary", business:"wary",
  prickly:"hostile", sour:"hostile", hard:"hostile", stern:"hostile", iron:"hostile",
  sting:"hostile", press:"hostile", order:"hostile", belt:"hostile", intent:"hostile",
  brisk:"hostile", sleeves:"hostile",
  caught:"scared", out:"scared", leave:"scared", turn:"scared", rope:"scared",
  yield:"scared", clam_up:"scared"
};
function moodNow(){
  if(G.duel&&G.duel.drawn)return "hostile";
  if(G.phase==="tell")return "hostile";
  if(G.outcome==="surrendered")return "scared";
  return MOOD_OF[G.node]||"neutral";
}
/* Nobody breathes in time with anybody else. */
const phaseOf=id=>((hash(id.length,id.charCodeAt(0)|0)%1000)/1000)*6.283;
let reactAt=-1e9, reactKind="";
function reactTo(nextNode){
  const m=MOOD_OF[nextNode]||"neutral";
  reactKind=(m==="hostile"||m==="scared")?"flinch":(m==="warm"?"nod":"take");
  reactAt=performance.now();
}
/* The eyes are the only cells named E on the face row, and the brow sits on the
 * row above them: to bring a brow down is to put its own shadow over the eyes. */
function expressOn(head,mood,blink){
  const out=head.slice();
  const eyeRow=4, browRow=3, mouthRow=5;
  const eyes=[];
  for(let c=0;c<(out[eyeRow]||"").length;c++)if(out[eyeRow][c]==="E")eyes.push(c);
  const put=(r,c,ch)=>{
    if(!out[r]||c<0||c>=out[r].length)return;
    out[r]=out[r].slice(0,c)+ch+out[r].slice(c+1);
  };
  if(blink)for(const c of eyes)put(eyeRow,c,"F");
  for(let k=0;k<mood.brow;k++)
    for(const c of eyes)put(browRow,c-(k?1:0),"E");
  if(eyes.length>=2){
    const mid=Math.round((eyes[0]+eyes[eyes.length-1])/2);
    if(mood.mouth==="grim"){put(mouthRow,mid-1,"E");put(mouthRow,mid,"E");}
    else if(mood.mouth==="open"){put(mouthRow,mid,"E");put(mouthRow,mid+1,"E");}
    else if(mood.mouth==="set")put(mouthRow,mid,"E");
  }
  return out;
}
function visitor(enc,pose,now){
  const fig=figureOf(enc), look=LOOK[enc.figure||enc.id]||LOOK.robber;
  const rows=figureRows(fig,pose);
  let lowest=0;
  for(let r=0;r<rows.length;r++)if(/[^.]/.test(rows[r]))lowest=r;
  const t=(now||0)/1000, ph=phaseOf(enc.figure||enc.id||"x");
  const mood=MOODS[moodNow()]||MOODS.neutral;
  // breath, and the weight going from one hip to the other
  const breath=Math.sin(t*1.7+ph)>0.55?-1:0;
  const sway=Math.round(Math.sin(t*0.63+ph)*1.2);
  // an eye shuts for a moment, on his own clock and not on anyone else's
  const cyc=3.1+((ph*7)%2.4), blink=(t+ph)%cyc<0.13;
  // and he answers before he answers: a flinch back, a nod in, a beat taken
  const since=(now||0)-reactAt, RE=460;
  let rdx=0, rdy=0;
  if(since>=0&&since<RE){
    const u=1-since/RE, e=u*u;
    if(reactKind==="flinch"){rdx=-Math.round(2.6*e); rdy=-Math.round(e);}
    else if(reactKind==="nod"){rdy=Math.round(1.6*e);}
    else rdx=Math.round(1.2*e);
  }
  const bdx=sway+mood.lean, bdy=breath+mood.rise;
  ctx.fillStyle="rgba(0,0,0,.35)";                   // his shadow stays put
  ctx.fillRect(SPRX+4*FIGCW,SPRY+(lowest+1)*FIGCH,16*FIGCW,FIGCH);
  const body=rows.map((r,i)=>i>=HEADROWS?r:"");
  const head=expressOn(rows.map((r,i)=>i<HEADROWS?r:""),mood,blink);
  drawFigure(body,SPRX+bdx,SPRY+bdy,look);
  // The shoulders come up, the head stays where it was: that is what hunching
  // is. Letting the rise carry the head too only opens a gap at his neck.
  drawFigure(head,SPRX+bdx+rdx,SPRY+bdy-mood.rise+rdy,look);
}

/* ---- the sheriff ---- *
 * Not an arm: the man himself, at the left edge of the frame with his back to
 * us, so the street is seen past his shoulder. He is drawn by the same painter
 * every caller is drawn by — the same letters, the same look table, the same
 * one-pixel black rim — only on a coarser cell, because he is the nearest thing
 * in the picture and nothing else in it is allowed to be bigger. The same
 * figure carries every screen; only the gun hand changes.
 */
/* His artwork, keyed off its background and scaled to the picture's own grid,
 * then reduced to a 64-colour indexed image so the page carries it without
 * asking the network for anything. It is drawn, never smoothed: at this size
 * one of its pixels is one of the street's.
 *
 * The drawing has the revolver already in his hand, so it is the drawn pose.
 * While he is only talking, the frame shows the strip below the gun arm —
 * his hip, the cartridge belt and the holster — and clearing leather brings
 * the whole of him up. */
const SHERIFF_SRC="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIEAAADICAMAAAD4KXLGAAAAwFBMVEUAAABONiktMDvEubZYLRY8HQ4PIktMJxOWh3xDIxF3RCe7sa0fNWZnOR5AT3alnJkdDgeKeG8lFBiYj40XCgYuFw1VYIBfWFTu498iOnQnHhqknqFNRkcRFB0wFwoIBQQPCQYCAgNHJCBRTU0CCyEVEhIHHEktRoImEglXMR3PxMGTYDwqJycRKl/g19J5c3LKwb1mYWEEFDYICRCzqaZAPT4AAABfWltHQ0SGf35WUlNwamrTycWvpaLWzcnezs/b8nkBAAAAQHRSTlMA////////////////////////////////////////////////////////////////////////////////////EyueMQAAIoRJREFUeNq1XIlim9iSjUEIIYQhAiyZYBZjbJAQCAnEJtD//9WcutjpfjM9nTwHM96SvGkOtZw6VbfwN883XN/3XdeNIsFxDM91PU2MI8+LjGgpfvv6y3c1zTAiR3AkukRJ0BzPdw0N/+BGy+evRxA5Dm5Pt8bnTFkqMxEoItjiAtNEsfT1CAwtkqQZ3RxXjB9ne7qWoqPBPd4s/nobCMIsnuHRZxJMsWR3V2ALXJLp+Z4kml+LQBBEZTaDEcQokkSYQZkxFOO1FATNE74WAh6dLgGZIIozXMpyv9zDADH9tFjsYwE58pUIJEEQTAeXgGBUZrA/3X+v0P3fLyUyzS+0gxNpyDqHmUBh4aiQIRQGZR/HIxDFJKBfg8DwKBs0E56gRJzFkohLiePZbKmIP2MC3ogB4isQeBowaOAEkcIAUTFGg0jpEH94AoaBcfYgCvMrEHia5oAQGQAGgpxAtx6/4vb4C/o3Zf8difocTY3Ahw3AyTCxwO7O0mEMB3pyogr8GItA8xxTbADFxHUBYaiBi4CAQgC3oxvvyQ4K7k9BQU7Z76U7mEUwXFcTJy0XhobLkURBBATywjImE9CTKxSadM1AlXEEG3he6HoopIIyIQQDZdDA7VGPJHLCkuUhfZsp7/efScr++e57DIpOyuTpjIolTIlAM2ACcgEhEPHw49MrY/SJwmwm7PfCci+4Sd3mTZNlteW6ZjQhH1AgAgCFgsiinm6OSBQVZhdFUpbmfm96Zdcc092QDseiDY31ZAigT2ACZCOJ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";
const OWN={x:0,y:0,w:129,h:200,rest:138};
let sheriffImg=null;
if(typeof Image==="function"){
  sheriffImg=new Image();
  sheriffImg.onload=function(){paint();};
  sheriffImg.src=SHERIFF_SRC;
}
function ownGun(out){
  if(!sheriffImg||!sheriffImg.complete||!sheriffImg.naturalWidth)return;
  ctx.imageSmoothingEnabled=false;
  if(out)ctx.drawImage(sheriffImg,OWN.x,OWN.y,OWN.w,OWN.h);
  else{
    const t=OWN.rest, h=OWN.h-t;
    const strip=restingStrip(t,h);
    if(strip)ctx.drawImage(strip,OWN.x,OWN.y+t);
    else ctx.drawImage(sheriffImg,0,t,OWN.w,h,OWN.x,OWN.y+t,OWN.w,h);
  }
}
/* With the gun down the frame holds the strip below his gun arm. Cut clean,
 * that reads as a rendering fault rather than a crop: a straight horizontal
 * line ruled across a man. So the top of the strip goes down into shadow over
 * eight rows, on the same ordered matrix as everything else, and the edge
 * becomes him falling away into the dark nearest the camera.
 *
 * It is built once on its own canvas and kept, because the shadow has to fall
 * on him and nowhere else: laid straight onto the street it would stipple the
 * dirt beside him as well, which is a worse fault than the one it fixes.
 */
const FADE=8;
let restStrip=null;
function restingStrip(t,h){
  if(restStrip!==null)return restStrip;
  restStrip=false;
  try{
    const cv2=document.createElement("canvas");
    cv2.width=OWN.w; cv2.height=h;
    const c=cv2.getContext("2d");
    if(!c||!c.drawImage||!c.fillRect)return restStrip;
    c.imageSmoothingEnabled=false;
    c.drawImage(sheriffImg,0,t,OWN.w,h,0,0,OWN.w,h);
    c.globalCompositeOperation="source-atop";      // only where he already is
    for(let k=0;k<FADE;k++){
      const amt=Math.round((1-(k+0.5)/FADE)*16);
      for(let i=0;i<OWN.w;i++){
        if(BAYER[((t+k)&3)*4+(i&3)]>=amt)continue;
        c.fillStyle="#0b0906"; c.fillRect(i,k,1,1);
      }
    }
    c.globalCompositeOperation="source-over";
    restStrip=cv2;
  }catch(e){ restStrip=false; }
  return restStrip;
}

/* ---- the title card ---- *
 * A 1985 title screen is a plate of wood type over a scene, and the machine had
 * no typeface to do it with: the letters were drawn. These are drawn too — five
 * by seven cells, stamped at whatever size the plate needs, with a hard black
 * rim and a drop shadow, which is what gives a flat colour the weight of
 * painted wood. Nothing here is the browser's text: at this size a font would
 * be soft, and nothing else in the picture is.
 */
const GLYPH={
  " ":".....|.....|.....|.....|.....|.....|.....",
  "$":"..#..|.####|#.#..|.###.|..#.#|####.|..#..",
  "&":".##..|#..#.|#..#.|.##..|#.#.#|#..#.|.##.#",
  "\'":"..#..|..#..|.....|.....|.....|.....|.....",
  "-":".....|.....|.....|#####|.....|.....|.....",
  ".":".....|.....|.....|.....|.....|.##..|.##..",
  "0":".###.|#...#|#..##|#.#.#|##..#|#...#|.###.",
  "1":"..#..|.##..|..#..|..#..|..#..|..#..|.###.",
  "2":".###.|#...#|....#|...#.|..#..|.#...|#####",
  "3":"####.|....#|....#|.###.|....#|....#|####.",
  "4":"...#.|..##.|.#.#.|#..#.|#####|...#.|...#.",
  "5":"#####|#....|####.|....#|....#|#...#|.###.",
  "6":".###.|#....|#....|####.|#...#|#...#|.###.",
  "7":"#####|....#|...#.|..#..|.#...|.#...|.#...",
  "8":".###.|#...#|#...#|.###.|#...#|#...#|.###.",
  "9":".###.|#...#|#...#|.####|....#|....#|.###.",
  "A":".###.|#...#|#...#|#####|#...#|#...#|#...#",
  "B":"####.|#...#|#...#|####.|#...#|#...#|####.",
  "C":".####|#....|#....|#....|#....|#....|.####",
  "D":"####.|#...#|#...#|#...#|#...#|#...#|####.",
  "E":"#####|#....|#....|####.|#....|#....|#####",
  "F":"#####|#....|#....|####.|#....|#....|#....",
  "G":".####|#....|#....|#..##|#...#|#...#|.####",
  "H":"#...#|#...#|#...#|#####|#...#|#...#|#...#",
  "I":"#####|..#..|..#..|..#..|..#..|..#..|#####",
  "J":"..###|...#.|...#.|...#.|...#.|#..#.|.##..",
  "K":"#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#",
  "L":"#....|#....|#....|#....|#....|#....|#####",
  "M":"#...#|##.##|#.#.#|#...#|#...#|#...#|#...#",
  "N":"#...#|##..#|#.#.#|#..##|#...#|#...#|#...#",
  "O":".###.|#...#|#...#|#...#|#...#|#...#|.###.",
  "P":"####.|#...#|#...#|####.|#....|#....|#....",
  "Q":".###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#",
  "R":"####.|#...#|#...#|####.|#.#..|#..#.|#...#",
  "S":".####|#....|#....|.###.|....#|....#|####.",
  "T":"#####|..#..|..#..|..#..|..#..|..#..|..#..",
  "U":"#...#|#...#|#...#|#...#|#...#|#...#|.###.",
  "V":"#...#|#...#|#...#|#...#|#...#|.#.#.|..#..",
  "W":"#...#|#...#|#...#|#...#|#.#.#|##.##|#...#",
  "X":"#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#",
  "Y":"#...#|#...#|.#.#.|..#..|..#..|..#..|..#..",
  "Z":"#####|....#|...#.|..#..|.#...|#....|#####"};
const GLYPH_W=5, GLYPH_H=7;
function textWidth(str,cell,track){return str.length*(GLYPH_W*cell+(track==null?cell:track))-(track==null?cell:track);}
function stamp(str,x,y,cell,fill,rim,shadow,track){
  const gap=(track==null?cell:track);
  const rows=(g)=>(GLYPH[g]||GLYPH[" "]).split("|");
  const each=(dx,dy,paint)=>{
    let cx=x;
    for(const ch of str){
      const r=rows(ch.toUpperCase());
      for(let j=0;j<GLYPH_H;j++)for(let i=0;i<GLYPH_W;i++)
        if(r[j][i]==="#")paint(cx+i*cell+dx,y+j*cell+dy,j);
      cx+=GLYPH_W*cell+gap;
    }
  };
  if(shadow)each(cell,cell,(px_,py_)=>px(px_,py_,cell,cell,shadow));
  if(rim)for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]])
    each(dx,dy,(px_,py_)=>px(px_,py_,cell,cell,rim));
  // the face is lit across its own height, the way a painted sign catches light
  each(0,0,(px_,py_,j)=>px(px_,py_,cell,cell,
    typeof fill==="function"?fill(j):fill));
}
const TITLE={a:"LAW",b:"OF THE",c:"WEST",town:"GOLD GULCH"};
const TP={                                    /* the title card's own palette */
  bg:"#0b0b2e", bg2:"#14143f", ink:"#f4efe2", gold:"#e8a13a", gold2:"#b4701a",
  rim:"#0a0608", vine:"#7fb7d8", vine2:"#c9e6f4", leaf:"#3f8f5c", leaf2:"#69c07f",
  box:"#2f8f4f", box2:"#1c5c33", boxin:"#07070f",
  paper:"#e6dcc0", paper2:"#c2b493", red:"#a8352a"};
/* ---- filigree ---- *
 * The border on a title screen of this kind is engraved scrollwork, and it was
 * drawn a pixel at a time because there was no other way to get it. Same here:
 * a stem that wanders, curls that wind in on themselves, and leaves hung off
 * the outside of every bend.
 */
function spiral(cx,cy,r0,turns,dir,col){
  const n=Math.max(8,Math.round(turns*54));
  for(let i=0;i<=n;i++){
    const t=i/n, a=dir*t*turns*Math.PI*2, r=r0*(1-t*0.84);
    px(cx+Math.cos(a)*r,cy+Math.sin(a)*r,1,1,col);
  }
}
function leaf(cx,cy,rw,rh,col){
  for(let y=-rh;y<=rh;y++)for(let x=-rw;x<=rw;x++)
    if((x/rw)*(x/rw)+(y/rh)*(y/rh)<=1)px(cx+x,cy+y,1,1,col);
}
function vine(x0,y0,x1,y1,amp,side){
  const n=Math.round(Math.hypot(x1-x0,y1-y0));
  const at=t=>[x0+(x1-x0)*t+Math.sin(t*Math.PI*3.1)*amp, y0+(y1-y0)*t];
  for(let i=0;i<=n;i++){
    const t=i/n, [x,y]=at(t);
    px(x-1,y,1,1,TP.vine); px(x,y,1,1,TP.vine2); px(x+1,y,1,1,TP.vine);
    // a second stem shadowing the first is what makes an engraving of a line
    const [x2]=at(Math.min(1,t+0.045));
    px(x2+side*3,y,1,1,TP.vine);
  }
  for(let k=0;k<5;k++){
    const t=0.09+k*0.205, [x,y]=at(t);
    spiral(x+side*7,y,6,1.25,(k%2?1:-1)*side,TP.vine2);
    leaf(x-side*6,y+4,5,2,TP.leaf); leaf(x-side*6,y+3,4,1,TP.leaf2);
    leaf(x+side*2,y-7,2,4,TP.leaf); leaf(x+side*2,y-8,1,3,TP.leaf2);
  }
}
function corner(x,y,sx,sy){
  spiral(x+sx*9,y+sy*8,7,1.3,sx*sy,TP.vine2);
  spiral(x+sx*22,y+sy*5,5,1.1,-sx*sy,TP.vine);
  leaf(x+sx*16,y+sy*12,4,2,TP.leaf); leaf(x+sx*16,y+sy*11,3,1,TP.leaf2);
  for(let i=0;i<16;i++)px(x+sx*(26+i),y+sy*2,1,1,i%3?TP.vine:TP.vine2);
}
/* ---- the poster the town nails up, and the gun that answers it ---- */
function poster(x,y,w,h){
  ctx.fillStyle="rgba(0,0,0,.45)"; ctx.fillRect(x+2,y+2,w,h);
  px(x,y,w,h,TP.paper);
  dither(x,y,w,h,TP.paper,TP.paper2,0.22);
  px(x,y,w,1,"#f4ecd6"); px(x,y+h-1,w,1,TP.paper2);
  px(x+2,y+2,w-4,1,"#8a7a58"); px(x+2,y+h-3,w-4,1,"#8a7a58");
  const t="REWARD", tw=textWidth(t,2,1);
  stamp(t,x+Math.round((w-tw)/2),y+5,2,"#231a10",null,null,1);
  const d="$500", dw=textWidth(d,2,2);
  stamp(d,x+Math.round((w-dw)/2),y+20,2,TP.red,null,null,2);
  for(let k=0;k<4;k++){                     // the small print, as much as fits
    const ly=y+34+k*5; if(ly>y+h-4)break;
    px(x+5,ly,w-10,1,"#9c8e6e");
  }
  for(const [nx,ny] of [[x+1,y+1],[x+w-3,y+1],[x+1,y+h-3],[x+w-3,y+h-3]])
    px(nx,ny,2,2,"#6b5a3a");
}
function titleGun(){
  // his own revolver, lifted out of the drawing the game already carries
  if(!sheriffImg||!sheriffImg.complete||!sheriffImg.naturalWidth)return;
  ctx.imageSmoothingEnabled=false;
  ctx.save();
  ctx.translate(308,156); ctx.scale(-1,1);          // pointing back into the card
  ctx.drawImage(sheriffImg,58,84,68,46,0,0,76,52);
  ctx.restore();
}
function titleCard(now){
  px(0,0,SCENE.w,SCENE.h,TP.bg);
  dither(0,0,SCENE.w,SCENE.h,TP.bg,TP.bg2,0.4);
  // the engraved border: a panel down each side, a flourish in each corner
  vine(14,18,14,SCENE.h-20,6,-1);
  vine(SCENE.w-14,18,SCENE.w-14,SCENE.h-20,6,1);
  corner(11,10,1,1); corner(SCENE.w-12,10,-1,1);
  /* The name is set in three parts and staggered, the way a wood-type poster
     sets a long title: the first word large and high, the joining words small
     and tucked in beside it, the last word large and dropped. */
  const face=j=>j<2?"#ffffff":j<4?"#f4d089":TP.gold2;
  stamp(TITLE.a,30,12,6,face,TP.rim,"rgba(0,0,0,.6)");
  stamp(TITLE.b,144,28,2,j=>j<3?TP.gold:TP.gold2,TP.rim,null,2);
  stamp(TITLE.c,108,52,6,face,TP.rim,"rgba(0,0,0,.6)");
  // the town, small, on the rule between the name and the credits
  const t=TITLE.town, tw=textWidth(t,2,3);
  px(34,102,SCENE.w-68,1,TP.gold2);
  px(30,100,4,5,TP.gold); px(SCENE.w-34,100,4,5,TP.gold);
  ctx.fillStyle=TP.bg; ctx.fillRect((SCENE.w-tw)/2-6,97,tw+12,12);
  stamp(t,Math.round((SCENE.w-tw)/2),99,2,TP.ink,null,null,3);
  // the credit box, bordered the way the original bordered its own, and saying
  // who this is after rather than claiming to be them
  const bx=10,by=114,bw=SCENE.w-20,bh=44;
  px(bx,by,bw,bh,TP.box); px(bx+2,by+2,bw-4,bh-4,TP.box2);
  px(bx+4,by+4,bw-8,bh-8,TP.boxin);
  const centred=(str,cell,y2,col,track)=>{
    const wdt=textWidth(str,cell,track);
    stamp(str,Math.round((SCENE.w-wdt)/2),y2,cell,col,null,null,track);
    return wdt;
  };
  centred("INSPIRED BY ALAN MILLER",2,by+7,TP.ink,2);
  centred("ORIGINAL MUSIC BY ED BOGAS",1,by+24,TP.gold,2);
  centred("AN INDEPENDENT UNOFFICIAL RECREATION",1,by+33,"#8f9fb8",2);
  poster(6,SCENE.h-40,68,38);
  titleGun();
  const blink=Math.floor(now/560)%2===0;
  if(blink){
    const s3="PRESS FIRE", w3=textWidth(s3,2,3), sx=145-Math.round(w3/2);
    ctx.fillStyle="rgba(8,6,14,.78)";
    ctx.fillRect(sx-7,SCENE.h-38,w3+14,GLYPH_H*2+7);
    stamp(s3,sx,SCENE.h-35,2,"#e8cf6a",TP.rim,null,3);
  }
}

/* ---- the street ---- *
 * The 1985 frame, drawn with the craft the machine's artists used: ordered
 * dithering between two colours wherever a flat field would show, clapboard
 * siding on every wall, framed and mullioned windows, panelled doors, awnings
 * with the shadow they cast, plank boardwalks, and light that comes from the
 * left so every edge knows which side it is on. Nothing has a soft edge.
 */
const HORIZON=118;
const PEOPLE=[{x:206,w:5,h:13},{x:216,w:5,h:12},{x:120,w:5,h:13}];
const hash=(a,b)=>((a*73856093)^(b*19349663))>>>0;
/* A 4x4 ordered matrix: the one a C64 artist would have dithered with. */
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
/* The matrix is read at the pixel's own place on the screen, not at its place
 * inside whatever rectangle is being filled. Reading it from the rectangle's
 * own corner gives two wrong pictures: a band filled a row at a time never
 * leaves the matrix's first row, so a 4x4 dither collapses into a 1x4 one and
 * the sky comes out in vertical stripes; and two dithered shapes that meet
 * anywhere but on a multiple of four show a seam where each restarts the
 * pattern. Indexing by the screen keeps one continuous weave under everything. */
function dither(x,y,w,h,a,b,amount){
  const t=Math.round(Math.max(0,Math.min(1,amount))*16);
  const x0=Math.round(x), y0=Math.round(y);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const X=x0+i, Y=y0+j;
    ctx.fillStyle=BAYER[(Y&3)*4+(X&3)]<t?b:a;
    ctx.fillRect(X,Y,1,1);
  }
}
function skyband(y0,y1,a,b){
  const n=y1-y0;
  for(let j=0;j<n;j++)dither(0,y0+j,SCENE.w,1,a,b,j/(n-1||1));
}
/* ---- the palette of the town ---- */
const T={
  sky1:"#3c2fb4", sky2:"#5a4fd0", sky3:"#8a86e8", haze:"#b9b4e4",
  cloud:"#ffffff", cloud2:"#c8c4e8", cloudsh:"#9a95c8",
  hill:"#4a4a72", hill2:"#34345a",
  dirt:"#b4b0a8", dirt2:"#9c988f", dirt3:"#cac6bd", dirtsh:"#807c74",
  board:"#c8a878", boardsh:"#8a6a3a", boardtr:"#6a4a22",
  green:"#6f8f5c", greensh:"#4c6b3e",
  adobe:"#a97e4c", adobesh:"#7a5630",
  brick:"#a85a4a", bricksh:"#7a3a30", stone:"#d8c8ae",
  white:"#e9e2d2", whitesh:"#bfb6a2",
  stn:"#8b5a38", stnsh:"#5f3b22", awn:"#d8c060", awnsh:"#a08828",
  tank:"#a8392e", tanksh:"#76241c",
  glass:"#2b2f6a", lit:"#e8d060", dark:"#241a12",
  tree:"#4a7a3a", tree2:"#6f9e4e", trunk:"#6a4a2a",
  iron:"#1c1c1e", iron2:"#4a4a50", iron3:"#8e8e96", shine:"#e6e6ee",
  tie:"#6a4a2a", rail:"#9a9aa2", ballast:"#8e8a82"};
/* ---- where each caller is, what is over the door and what is parked ---- */
const PLACES={
  STREET:      {sign:"GOLD GULCH HOTEL",     prop:"coach"},
  SALOON:      {sign:"MAGUIRE'S SALOON",     prop:"barrels"},
  DOCTOR:      {sign:"DR FINCH SURGEON",     prop:"crates"},
  SCHOOL:      {sign:"GOLD GULCH SCHOOL",    prop:"fence"},
  JAIL:        {sign:"GOLD GULCH JAIL",      prop:"crates"},
  CORRAL:      {sign:"BELLE HOLLISTER",      prop:"fence"},
  "STAGE ROAD":{sign:"MORGAN EXPRESS CO",    prop:"coach"},
  "THE CUT":   {sign:"GOLD GULCH & WESTERN", prop:"loco"},
  BANK:        {sign:"J P MORGAN BANK",      prop:"crates"}};

function sky(){
  skyband(0,14,T.sky1,T.sky2);
  skyband(14,34,T.sky2,T.sky3);
  skyband(34,52,T.sky3,T.haze);
  for(const [cx,cy,w] of [[26,12,40],[96,8,54],[168,16,46],[236,6,50],[292,20,36]]){
    for(let k=0;k<4;k++){                                  // stepped, lit on top
      const inset=[0,5,11,19][k], hh=[3,3,3,2][k];
      px(cx+inset,cy+7-k*3,w-inset*2,hh,k?T.cloud:T.cloud2);
    }
    dither(cx+3,cy+8,w-6,3,T.cloud2,T.cloudsh,0.55);
  }
  for(let x=0;x<SCENE.w;x++){                              // the rim of hills
    const h=Math.round(50+7*Math.sin(x/33)+4*Math.sin(x/11));
    px(x,h,1,4,T.hill); px(x,h+4,1,HORIZON-h-4,T.hill2);
  }
  dither(0,46,SCENE.w,10,T.hill2,T.haze,0.4);
}
/* ---- ground: one broad dirt plaza, tonal rather than striped ---- */
function ground(){
  px(0,HORIZON,SCENE.w,SCENE.h-HORIZON,T.dirt);
  dither(0,HORIZON,SCENE.w,10,T.dirt,T.dirt2,0.55);        // it packs hard at the walls
  for(let i=0;i<14;i++){                                   // broad patches of wear
    const x=(hash(i,5)%300)-20, y=HORIZON+4+(hash(i,9)%70);
    const w=30+(hash(i,13)%70), h=6+(hash(i,17)%14);
    dither(x,y,w,h,T.dirt,(i%3)?T.dirt3:T.dirt2,0.22);
  }
  dither(0,SCENE.h-22,SCENE.w,22,T.dirt,T.dirtsh,0.30);    // shadow at the near edge
  for(let i=0;i<90;i++){                                   // stones, lit and shadowed
    const x=(hash(i,3)%SCENE.w), y=HORIZON+2+(hash(i,7)%(SCENE.h-HORIZON-4));
    const w=1+(hash(i,11)%3);
    px(x,y,w,1,T.dirt3); px(x,y+1,w,1,T.dirtsh);
  }
}
/* ---- buildings: each one its own design, not five of the same ---- */
function windowPane(x,y,w,h,lit,frame){
  px(x-1,y-1,w+2,h+2,frame);
  px(x,y,w,h,lit?T.lit:T.glass);
  dither(x,y,w,h,lit?T.lit:T.glass,lit?T.awnsh:"#171a44",0.4);
  px(x+((w/2)|0),y,1,h,frame); px(x,y+((h/2)|0),w,1,frame);
  px(x,y,w,1,lit?T.cloud:T.iron3);
}
function boarded(x0,x1,top){                               // tan boards, false front
  const w=x1-x0;
  px(x0,top,w,HORIZON-top,T.board);
  dither(x0,top,w,HORIZON-top,T.board,T.boardsh,0.26);
  for(let y=top+5;y<HORIZON;y+=3)px(x0,y,w,1,T.boardsh);
  px(x0,top,w,5,T.boardtr); px(x0,top,w,1,T.stone); px(x0,top+5,w,1,T.dark);
  px(x0,top+5,2,HORIZON-top-5,T.boardtr); px(x1-2,top+5,2,HORIZON-top-5,T.boardtr);
  windowPane(x0+7,top+12,10,11,hash(x0,1)%3!==0,T.boardtr);
  px(x0+4,HORIZON-24,w-8,3,T.boardtr); px(x0+4,HORIZON-21,w-8,1,T.dark);
  dither(x0+4,HORIZON-20,w-8,5,T.board,T.dark,0.5);
  for(const p of [x0+5,x1-8])px(p,HORIZON-21,2,21,T.boardtr);
  px(x0+((w/2)|0)-6,HORIZON-18,13,18,T.dark);
  px(x0+((w/2)|0)-5,HORIZON-17,11,17,"#14100a");
}
function plastered(x0,x1,top,wall,sh){                     // green or white plaster
  const w=x1-x0;
  px(x0,top,w,HORIZON-top,wall);
  dither(x0,top,w,HORIZON-top,wall,sh,0.22);
  px(x0,top,w,4,sh); px(x0,top,w,1,T.stone);               // parapet
  px(x0,top+4,w,1,"rgba(0,0,0,.35)");
  px(x1-3,top+4,3,HORIZON-top-4,sh);                       // the shaded side
  windowPane(x0+6,top+11,9,10,false,sh);
  windowPane(x1-16,top+11,9,10,hash(x0,2)%2===0,sh);
  windowPane(x0+6,top+30,9,10,false,sh);
  px(x1-17,top+30,13,HORIZON-top-30,T.dark);
  px(x1-16,top+31,11,HORIZON-top-31,"#14100a");
}
function adobe(x0,x1,top){                                 // squat, arched, sun-baked
  const w=x1-x0;
  px(x0,top,w,HORIZON-top,T.adobe);
  dither(x0,top,w,HORIZON-top,T.adobe,T.adobesh,0.24);
  px(x0,top,w,3,T.stone); px(x0,top+3,w,2,T.adobesh);
  for(let i=0;i<3;i++){                                    // deep-set arched windows
    const wx=x0+5+i*((w-10)/3|0), wy=top+10;
    px(wx,wy+3,9,10,T.dark);
    for(let k=0;k<5;k++)px(wx+k,wy+3-Math.round(Math.sqrt(25-(k-2)*(k-2))),1,1,T.dark);
    px(wx+1,wy+5,7,8,T.glass);
  }
  px(x0+((w/2)|0)-6,HORIZON-20,13,20,T.dark);
  px(x0+((w/2)|0)-5,HORIZON-19,11,19,"#14100a");
  px(x0,HORIZON-3,w,3,T.adobesh);
}
function brickHouse(x0,x1,top,carry){                      // the one the board hangs on
  const w=x1-x0;
  px(x0,top,w,HORIZON-top,T.brick);
  for(let y=top+3;y<HORIZON;y+=3){                         // courses
    px(x0,y,w,1,T.bricksh);
    for(let x=x0+((y/3|0)%2?0:3);x<x1;x+=6)px(x,y-2,1,2,T.bricksh);
  }
  px(x0,top,w,4,T.stone); px(x0,top+4,w,1,T.dark);
  px(x0,top,2,HORIZON-top,T.stone); px(x1-2,top,2,HORIZON-top,T.bricksh);
  for(let i=0;i<3;i++)windowPane(x0+8+i*((w-16)/3|0),top+30,10,12,i===1,T.stone);
  px(x0+4,HORIZON-26,w-8,4,T.awn); px(x0+4,HORIZON-22,w-8,1,T.awnsh);
  dither(x0+4,HORIZON-21,w-8,5,T.brick,T.dark,0.5);
  for(const p of [x0+6,x1-9])px(p,HORIZON-22,2,22,T.stone);
  px(x0+((w/2)|0)-8,HORIZON-20,17,20,T.dark);
  px(x0+((w/2)|0)-7,HORIZON-19,15,19,T.glass);
}
function station(x0,x1,top){                               // brick, striped awning
  const w=x1-x0;
  px(x0,top,w,HORIZON-top,T.stn);
  for(let y=top+3;y<HORIZON;y+=3){
    px(x0,y,w,1,T.stnsh);
    for(let x=x0+((y/3|0)%2?0:3);x<x1;x+=6)px(x,y-2,1,2,T.stnsh);
  }
  px(x0,top,w,5,T.stone); px(x0,top+5,w,1,T.dark);
  for(let i=0;i<3;i++)windowPane(x0+6+i*((w-12)/3|0),top+12,9,12,i!==1,T.stone);
  px(x0+2,HORIZON-30,w-4,7,T.awn);                          // the striped awning
  for(let x=x0+2;x<x1-2;x+=4)px(x,HORIZON-30,2,7,T.awnsh);
  px(x0+2,HORIZON-23,w-4,1,T.dark);
  dither(x0+2,HORIZON-22,w-4,5,T.stn,T.dark,0.5);
  px(x0+((w/2)|0)-7,HORIZON-20,15,20,T.glass);
  px(x0+((w/2)|0)-8,HORIZON-21,17,1,T.stone);
}
function watertower(cx,base){
  px(cx-14,base-46,28,22,T.tank);
  dither(cx-14,base-46,28,22,T.tank,T.tanksh,0.35);
  px(cx-14,base-46,28,3,T.iron3); px(cx-14,base-28,28,3,T.tanksh);
  px(cx-16,base-49,32,4,T.iron2);
  for(const dx of [-12,-4,4,12])px(cx+dx,base-24,3,24,T.trunk);
  px(cx-14,base-16,28,2,T.trunk);
  px(cx+2,base-24,2,14,T.iron2);
}
function treeAt(x,base,r){
  px(x,base-r-6,4,r+6,T.trunk); px(x,base-r-6,1,r+6,T.tree2);
  for(const [dx,dy,rr] of [[2,-r-4,r],[-r+4,-r+2,r-3],[r-2,-r+2,r-3],[2,-r+4,r-2]]){
    for(let y=-rr;y<=rr;y++){const h=Math.round(Math.sqrt(Math.max(0,rr*rr-y*y)));
      px(x+dx-h,base+dy+y,h*2,1,T.tree);}
  }
  for(const [dx,dy,rr] of [[2,-r-4,r],[-r+4,-r+2,r-3]])
    for(let y=-rr;y<=-rr/3;y++){const h=Math.round(Math.sqrt(Math.max(0,rr*rr-y*y)));
      px(x+dx-h,base+dy+y,Math.round(h*1.2),1,T.tree2);}
}
const ROW=[
  {kind:"board",   x0:34, x1:74,  top:64},
  {kind:"green",   x0:74, x1:110, top:56},
  {kind:"adobe",   x0:110,x1:146, top:62},
  {kind:"brick",   x0:146,x1:214, top:40, carry:true},
  {kind:"white",   x0:214,x1:250, top:58},
  {kind:"station", x0:250,x1:296, top:46}];
function buildings(){
  watertower(276,HORIZON);
  for(const b of ROW){
    if(b.kind==="board")boarded(b.x0,b.x1,b.top);
    else if(b.kind==="green")plastered(b.x0,b.x1,b.top,T.green,T.greensh);
    else if(b.kind==="white")plastered(b.x0,b.x1,b.top,T.white,T.whitesh);
    else if(b.kind==="adobe")adobe(b.x0,b.x1,b.top);
    else if(b.kind==="brick")brickHouse(b.x0,b.x1,b.top,b.carry);
    else station(b.x0,b.x1,b.top);
  }
  // A dark turn at each frontage edge, so the row reads as solids standing in
  // light rather than as coloured paper laid side by side.
  for(const b of ROW){
    ctx.fillStyle="rgba(18,12,8,.30)"; ctx.fillRect(b.x1-2,b.top,2,HORIZON-b.top);
    ctx.fillStyle="rgba(255,228,170,.13)"; ctx.fillRect(b.x0,b.top,1,HORIZON-b.top);
    ctx.fillStyle="rgba(18,12,8,.22)"; ctx.fillRect(b.x0,b.top,b.x1-b.x0,1);
  }
  treeAt(68,HORIZON,11); treeAt(148,HORIZON,9);
  px(0,HORIZON-2,SCENE.w,2,"rgba(0,0,0,.35)");
  for(let i=0;i<7;i++)                                  // what the row throws down
    px(0,HORIZON+i,SCENE.w,1,"rgba(26,18,10,"+(0.20-i*0.028).toFixed(3)+")");
}
/* ---- the board over the middle building ---- */
function painted(text,x,y,w,h,size){
  while(size>4&&text.length*size*0.62>w-4)size--;
  px(x,y,w,h,T.trunk); px(x,y,w,1,T.stone); px(x+1,y+1,w-2,h-2,T.dark);
  ctx.fillStyle=T.awn; ctx.font="700 "+size+"px monospace";
  ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText(text,x+w/2,y+h/2+1);
}
function signboard(text){
  const words=text.split(" ");
  let lines=[text];
  if(text.length>12&&words.length>1){
    let best=1e9,cut=1;
    for(let i=1;i<words.length;i++){
      const m=Math.max(words.slice(0,i).join(" ").length,words.slice(i).join(" ").length);
      // On a tie take the later break: GOLD GULCH / JAIL, never GOLD / GULCH JAIL
      if(m<=best){best=m;cut=i;}
    }
    lines=[words.slice(0,cut).join(" "),words.slice(cut).join(" ")];
  }
  const longest=Math.max.apply(null,lines.map(t=>t.length));
  const size=longest<=11?8:6;
  const bx=150, bw=62, by=46, bh=lines.length>1?20:13;
  px(bx-1,by-1,bw+2,bh+2,T.dark);
  px(bx,by,bw,bh,T.trunk); px(bx,by,bw,2,T.stone); px(bx+2,by+2,bw-4,bh-4,T.dark);
  ctx.fillStyle=T.awn; ctx.font="700 "+(longest<=11?7:6)+"px monospace";
  ctx.textAlign="center"; ctx.textBaseline="middle";
  lines.forEach((t,i)=>ctx.fillText(t,bx+bw/2,by+bh/2+1+(i-(lines.length-1)/2)*(size+2)));
}

/* ---- what is parked in the near right ---- */
function rails(){
  /* Two rails running out of the bottom-right corner toward the town, with
     sleepers between them and ballast under the lot. */
  const ax=258, ay=HORIZON+2, bx=392, by=SCENE.h+6;       // the vanishing pair
  for(let t=0;t<=1.0001;t+=0.01){
    const y=ay+(by-ay)*t, half=3+t*44, cx=ax+(bx-ax)*t*0.42;
    dither(cx-half-8,y,half*2+16,3,T.ballast,T.dirtsh,0.5);
  }
  for(let t=0;t<=1.0001;t+=0.055){                        // sleepers
    const y=ay+(by-ay)*t, half=3+t*44, cx=ax+(bx-ax)*t*0.42;
    const h=Math.max(1,Math.round(1+t*5));
    px(cx-half-6,y,half*2+12,h,T.tie);
    px(cx-half-6,y,half*2+12,1,"#8a6a3a");
  }
  for(let t=0;t<=1.0001;t+=0.004){                        // the rails themselves
    const y=ay+(by-ay)*t, half=3+t*44, cx=ax+(bx-ax)*t*0.42;
    const w=Math.max(1,Math.round(1+t*3));
    px(cx-half,y,w,1,T.rail); px(cx+half-w,y,w,1,T.rail);
  }
}
function loco(){
  rails();
  const cx=296, cy=100, R=33;
  /* The boiler runs back off the right edge: a cylinder, so it is banded
     light at the top quarter and dark along the bottom. */
  const BT=62, BB=142;
  px(268,BT,56,BB-BT,T.iron2);
  for(let y=BT;y<BB;y++){
    const t=(y-BT)/(BB-BT);                               // 0 top .. 1 bottom
    const c=t<0.18?T.iron3:t<0.30?T.iron2:t<0.72?T.iron2:T.iron;
    px(268,y,56,1,c);
  }
  dither(268,BT+10,56,16,T.iron3,T.iron2,0.5);            // the roll of the light
  dither(268,BB-28,56,20,T.iron2,T.iron,0.55);
  for(const by of [BT+2,BB-14]){                          // boiler bands
    px(268,by,56,3,T.iron); px(268,by,56,1,T.iron3);
  }
  px(266,BT,2,BB-BT,T.iron); px(268,BT,1,BB-BT,T.iron3);  // the near edge, hard
  px(268,BT,56,1,T.iron); px(268,BB-1,56,1,T.iron);
  /* The smokebox door. Flat plate, rim ring, one seam of rivets, a hinge
     strap down the middle and a handle boss at the centre. */
  for(let y=-R;y<=R;y++){
    const h=Math.round(Math.sqrt(Math.max(0,R*R-y*y)));
    px(cx-h,cy+y,h*2,1,T.iron2);
    const lit=Math.max(0,1-(y+R)/(R*1.3));                // light from up-left
    dither(cx-h,cy+y,h,1,T.iron3,T.iron2,0.25+lit*0.45);
    dither(cx,cy+y,h,1,T.iron2,T.iron,0.30+(1-lit)*0.4);
  }
  ring(cx,cy,R,2,T.iron3); ring(cx,cy,R-2,1,T.iron);      // the rim
  ring(cx,cy,R-6,1,T.iron);                               // the rivet seam
  for(let a=0;a<360;a+=15){
    const t=a*Math.PI/180;
    px(cx+Math.cos(t)*(R-6)-1,cy+Math.sin(t)*(R-6)-1,2,2,T.iron3);
  }
  px(cx-2,cy-R+3,4,R*2-6,T.iron);                         // the hinge strap
  px(cx-2,cy-R+3,1,R*2-6,T.iron3);
  px(cx-6,cy-6,12,12,T.iron3); px(cx-4,cy-4,8,8,T.iron);  // the handle boss
  px(cx-5,cy-1,10,2,T.iron3); px(cx-1,cy-5,2,10,T.iron3);
  /* The stack: a straight column that flares into a lip at the crown. */
  px(cx-10,18,20,44,T.iron2);
  for(let y=18;y<62;y++)dither(cx-10,y,10,1,T.iron3,T.iron2,0.4);
  for(let y=18;y<62;y++)dither(cx,y,10,1,T.iron2,T.iron,0.45);
  px(cx-15,12,30,8,T.iron2); px(cx-15,12,30,2,T.iron3);
  px(cx-15,20,30,2,T.iron); px(cx-15,12,7,8,T.iron3);
  /* The headlamp is bolted to the smokebox front, above the door. */
  px(cx-11,60,22,18,T.iron); px(cx-9,62,18,14,T.lit);
  dither(cx-9,62,18,14,T.lit,T.shine,0.4);
  px(cx-11,59,22,2,T.iron3); px(cx-11,77,22,2,T.iron3);
  px(cx-4,78,8,4,T.iron2);
  /* Pilot beam and cowcatcher. */
  px(262,144,68,9,T.iron2); px(262,144,68,2,T.iron3); px(262,151,68,2,T.iron);
  for(let i=0;i<10;i++){
    const x=264+i*7, len=20+Math.abs(4.5-i)*4;
    px(x,153,4,len,T.iron2); px(x,153,1,len,T.iron3); px(x+3,153,1,len,T.iron);
  }
  px(260,152,72,4,T.iron3); px(260,156,72,2,T.iron);
}
function ring(cx,cy,r,w,col){
  for(let a=0;a<360;a+=0.5){
    const t=a*Math.PI/180;
    px(cx+Math.cos(t)*r-(w>>1),cy+Math.sin(t)*r-(w>>1),w,w,col);
  }
}
function propAt(kind){
  if(kind==="loco")return loco();
  if(kind==="coach"){
    px(250,64,70,46,T.trunk); dither(250,64,70,46,T.trunk,T.stnsh,0.3);
    px(250,64,70,4,T.awn); px(250,68,70,1,T.dark);
    for(const wx of [258,286]){
      px(wx-1,73,20,18,T.dark); px(wx,74,18,16,T.glass);
      dither(wx,74,18,16,T.glass,"#171a44",0.5); px(wx,74,18,3,T.awn);
    }
    px(246,110,78,6,T.iron2); px(246,110,78,1,T.iron3);
    px(252,116,6,20,T.trunk); px(302,116,6,24,T.trunk);
    for(const [wx,r] of [[266,20],[308,25]]){
      for(let y=-r;y<=r;y++){const h=Math.round(Math.sqrt(Math.max(0,r*r-y*y)));
        px(wx-h,132+y,h*2,1,T.trunk);}
      for(let y=-r+4;y<=r-4;y++){const h=Math.round(Math.sqrt(Math.max(0,(r-4)*(r-4)-y*y)));
        px(wx-h,132+y,h*2,1,T.dirt2);}
      for(let a=0;a<10;a++){const t=a*0.628;
        for(let k=0;k<r-3;k++)px(wx+Math.cos(t)*k,132+Math.sin(t)*k,2,2,T.trunk);}
      px(wx-3,129,6,6,T.awn);
    }
  } else if(kind==="barrels"){
    for(const [bx,by,bw,bh] of [[252,104,28,44],[288,116,30,50],[258,148,32,36]]){
      px(bx,by,bw,bh,T.board); dither(bx,by,bw,bh,T.board,T.boardsh,0.3);
      px(bx,by,3,bh,T.stone); px(bx+bw-4,by,4,bh,T.boardsh);
      for(const hy of [by+2,by+((bh/2)|0)-1,by+bh-5])px(bx,hy,bw,3,T.trunk);
      px(bx,by,bw,2,T.stone);
      ctx.fillStyle="rgba(0,0,0,.35)";ctx.fillRect(bx-3,by+bh,bw+6,2);
    }
  } else if(kind==="crates"){
    for(const [bx,by,bw,bh] of [[248,112,44,38],[294,126,26,30],[256,150,48,40]]){
      px(bx,by,bw,bh,T.trunk); px(bx+2,by+2,bw-4,bh-4,T.board);
      dither(bx+2,by+2,bw-4,bh-4,T.board,T.boardsh,0.28);
      px(bx+2,by+2,bw-4,1,T.stone);
      px(bx+2,by+((bh/2)|0)-1,bw-4,2,T.trunk);
      px(bx+((bw/2)|0)-1,by+2,2,bh-4,T.trunk);
      ctx.fillStyle="rgba(0,0,0,.35)";ctx.fillRect(bx-3,by+bh,bw+6,2);
    }
  } else {
    for(let i=0;i<4;i++){
      const x=244+i*26, y=110+i*12, h=76-i*8;
      // every other thing standing in this street casts where it meets the dirt;
      // without it a post reads as hanging in the air rather than sunk in it
      ctx.fillStyle="rgba(0,0,0,.38)"; ctx.fillRect(x-3,y+h-1,15,2);
      ctx.fillStyle="rgba(0,0,0,.18)"; ctx.fillRect(x-5,y+h+1,19,1);
      px(x,y,9,h,T.trunk); px(x,y,3,h,"#8a6a3a"); px(x,y,9,2,T.board);
    }
    for(let k=0;k<3;k++)for(let i=0;i<3;i++){
      const x=244+i*26, y=120+i*12+k*18;
      px(x,y,28,6,T.board); px(x,y,28,1,"#8a6a3a"); px(x,y+5,28,1,T.trunk);
    }
  }
}
/* The sheriff is a drawing with a warm key from the left, a cool shadow and
 * corners that fall away. The town was painted flat, under no light at all, and
 * that — not its colours — is what made the two read as different kinds of
 * picture. The town is graded to meet the drawing rather than the drawing being
 * flattened to meet the town. */
function ramp(make,stops){
  // A context without gradients still gets the light, in bands rather than a
  // sweep: the picture is 320 across, so the difference is small and the page
  // never depends on a canvas feature it might not have.
  let g=null;
  try{ g=make(); }catch(e){ g=null; }
  if(g&&typeof g.addColorStop==="function"){
    for(const [at,col] of stops)g.addColorStop(at,col);
    return g;
  }
  return null;
}
function grade(){
  const warm=ramp(()=>ctx.createLinearGradient(0,0,SCENE.w*0.75,SCENE.h),
    [[0,"rgba(255,214,152,.15)"],[0.45,"rgba(255,238,210,.04)"],[1,"rgba(26,22,44,.22)"]]);
  if(warm){ctx.fillStyle=warm; ctx.fillRect(0,0,SCENE.w,SCENE.h);}
  else{
    ctx.fillStyle="rgba(255,214,152,.10)"; ctx.fillRect(0,0,SCENE.w*0.45,SCENE.h);
    ctx.fillStyle="rgba(26,22,44,.14)"; ctx.fillRect(SCENE.w*0.45,0,SCENE.w*0.55,SCENE.h);
  }
  const vig=ramp(()=>ctx.createRadialGradient(SCENE.w*0.48,SCENE.h*0.44,24,
                                              SCENE.w*0.48,SCENE.h*0.44,SCENE.w*0.70),
    [[0,"rgba(0,0,0,0)"],[1,"rgba(22,16,32,.30)"]]);
  if(vig){ctx.fillStyle=vig; ctx.fillRect(0,0,SCENE.w,SCENE.h);}
  else for(let i=0;i<6;i++){
    ctx.fillStyle="rgba(22,16,32,.05)";
    ctx.fillRect(0,0,SCENE.w,4-i); ctx.fillRect(0,SCENE.h-(4-i),SCENE.w,4-i);
  }
}
function town(now,armed){
  sky();
  const enc=who(G), here=PLACES[(enc&&enc.place)]||PLACES.STREET;
  ground();
  buildings();
  signboard(here.sign);
  if(!armed)for(const p of PEOPLE){
    px(p.x,HORIZON-p.h,p.w,p.h,T.hill); px(p.x,HORIZON-p.h,p.w,2,T.dark);
  }
  propAt(here.prop);
}
function drawScene(now){
  const g=sceneGeom();
  ctx.fillStyle="#000"; ctx.fillRect(0,0,cv.width,cv.height);
  ctx.save(); ctx.translate(g.ox,g.oy); ctx.scale(g.sx,g.sy);
  if(G.phase==="intro"){
    if(build.rows>=10)titleCard(now);
    if(build.rows<10){ctx.fillStyle="#000";
      ctx.fillRect(0,build.rows*(SCENE.h/10),SCENE.w,SCENE.h-build.rows*(SCENE.h/10));}
    ctx.restore(); return;
  }
  const armed=G.mode==="gun"||(G.duel&&G.duel.drawn)||G.phase==="tell";
  town(now,armed);
  const enc=who(G);
  if(enc&&build.rows>=6){
    const pose=(G.outcome==="surrendered")?"surrender"
      :(G.duel&&(G.duel.drawn||G.phase==="tell"))?"raise":"idle";
    if(G.outcome==="killed_him"||G.outcome==="innocent_killed"){
      // He turns about his own boots. The shadow he was standing in has to come
      // round with him and lie flat, or he ends up floating over the plaza with
      // everything else in the picture sitting on it.
      const turn=Math.min(1.4,bodyFall), lay=turn/1.4;
      ctx.fillStyle="rgba(0,0,0,"+(0.34*lay+0.06).toFixed(3)+")";
      ctx.fillRect(FIG.cx-6,FIG.ground-1,Math.round(12+40*lay),2);
      ctx.save();ctx.translate(FIG.cx,FIG.ground);ctx.rotate(turn);
      ctx.translate(-FIG.cx,-FIG.ground);visitor(enc,"idle",now);ctx.restore();
    } else visitor(enc,pose,now);
  }
  // The street and the man standing in it are both fifty feet off, so both sit
  // in the same air. The sheriff is a foot away and stands outside it.
  grade();
  ownGun(G.mode==="gun");   // his own body is the near foreground now
  if(G.mode==="gun"&&build.rows>=6)crosshair();
  if(flash>0){ctx.fillStyle="rgba(255,255,255,"+Math.min(1,flash*6)+")";
    ctx.fillRect(0,0,SCENE.w,SCENE.h);}
  if(build.rows<10){                                       // the block-load cadence
    ctx.fillStyle="#000";
    ctx.fillRect(0,build.rows*(SCENE.h/10),SCENE.w,SCENE.h-build.rows*(SCENE.h/10));
  }
  ctx.restore();
}
/* A reticle of blocks, dark behind light, so it reads over a lit window or a
 * black doorway alike. */
const RETICLE=[[-4,0],[-3,0],[3,0],[4,0],[0,-4],[0,-3],[0,3],[0,4],[0,0]];
function crosshair(){
  const a=G.aim;
  const x=Math.round(a.x*SCENE.w), y=Math.round(a.y*SCENE.h);
  ctx.fillStyle=C64.blk;
  for(const [dx,dy] of RETICLE)ctx.fillRect(x+dx*2+1,y+dy*2+1,2,2);
  ctx.fillStyle=G.duel&&G.duel.drawn?C64.yel:C64.wht;
  for(const [dx,dy] of RETICLE)ctx.fillRect(x+dx*2,y+dy*2,2,2);
}

/* ---- the five-line matrix ---- *
 * Nothing a character says may be cut off or hidden behind a scroll, so after
 * every repaint the dialogue type is stepped down until all five lines fit the
 * box they are in. The floor is 70%: below that the panel scrolls rather than
 * becoming unreadable. */
const DLG_STEPS=[1,0.95,0.9,0.85,0.8,0.75,0.7];
function fitText(){
  if(!panel||!panel.style||typeof panel.scrollHeight!=="number")return;
  for(const scale of DLG_STEPS){
    panel.style.setProperty("--dlg",String(scale));
    if(panel.scrollHeight<=panel.clientHeight+1)return;
  }
}

/* ---- sound test ---- *
 * Every cue the game can make, on a screen of its own, so the pistol, the tell,
 * the bells and the eleven entrance themes can be heard without playing a day
 * to reach them. Reached from the title; it is a screen, not a game phase, so
 * nothing in the engine knows about it. */
const CUES=()=>Object.keys(SOUNDS);
const MUSIC=["title","dawn","dusk","badge","romance","respect","disgrace","piano"];
function cueKind(name){
  return name.indexOf("th_")===0?"entrance theme"
    :MUSIC.indexOf(name)>=0?"music":"sound effect";
}
function playCue(name){
  if(name.indexOf("th_")===0)SND.theme(name);
  else if(typeof SND[name]==="function")SND[name]();
}
function soundCmd(what){
  const list=CUES();
  if(what==="play")playCue(list[cueAt]);
  else if(what==="next")cueAt=(cueAt+1)%list.length;
  else if(what==="prev")cueAt=(cueAt+list.length-1)%list.length;
  else if(what==="back"){screen=null;SND.cut();}
  paint();
}
function paintSound(){
  const list=CUES(), name=list[cueAt];
  lineEls[0].className="npc";
  lineEls[0].textContent=(cueAt+1)+" of "+list.length+" \u00b7 "+name+" \u00b7 "+cueKind(name);
  ["Play it","Next","Previous","Back to the street"].forEach((t,i)=>
    setChoice(lineEls[i+1],i+1,t,i===0?"sel":""));
  modeEl.textContent="GOLD GULCH \u00b7 SOUND TEST";
  // What the audio is actually doing. A phone that will not make a sound looks
  // exactly like a game that will not make a sound, and this is the only way to
  // tell them apart from across the room.
  scoreEl.textContent="AUDIO "+(SND.on?SND.state.toUpperCase():"OFF")
    +(SND.session?" \u00b7 SESSION":"");
  fitText();
}

/* A reply is written as two elements — the number and the words — so the words
 * can hang under themselves when they wrap. An empty slot collapses. */
function setChoice(el,n,text,cls){
  el.className="choice"+(cls?" "+cls:"")+(text?"":" empty");
  while(el.firstChild)el.removeChild(el.firstChild);
  if(!text)return;
  const num=document.createElement("b"); num.className="num"; num.textContent=n+". ";
  const txt=document.createElement("span"); txt.className="txt"; txt.textContent=text;
  el.appendChild(num); el.appendChild(txt);
}
/* Name on the left, count on the right, one to a row. */
function setTable(el,rows){
  el.className="choice table";
  while(el.firstChild)el.removeChild(el.firstChild);
  const t=document.createElement("div"); t.className="tbl";
  for(const [k,v] of rows){
    const a=document.createElement("span"); a.className="k"; a.textContent=k;
    const b=document.createElement("span"); b.className="v"; b.textContent=String(v);
    t.appendChild(a); t.appendChild(b);
  }
  el.appendChild(t);
}
function beat(){return nodeOf(G);}
/* Who is in front of you, where you are in the day, and how it is going. It
 * lives above the picture rather than over it: the 320x200 frame carries no
 * chrome of its own, the way the machine's did not. */
function hud(){
  const e=who(G), n=Math.min(G.encounter+1,CAST.length);
  const dot=" \u00b7 ";
  // on the title the card is carrying the name; the strip says it twice otherwise
  const where=G.phase==="intro"?""
    :G.phase==="summary"?"GOLD GULCH"+dot+"SUNDOWN"
    :G.interlude?(((e&&e.name)||"")+dot+"A ROBBERY")
    :e?(e.name+dot+n+"/"+CAST.length):"GOLD GULCH";
  const mode=G.mode==="gun"?dot+"GUN":(G.phase==="dialogue"?dot+"TALK":"");
  modeEl.textContent=where+mode;
  scoreEl.textContent=G.phase==="intro"?""
    :"auth "+G.authority+dot+"arr "+G.arrests+(G.wounds?dot+"WOUNDED":"");
}
const JOB_PROMPT={stage:"Ride for the ford",train:"Get down to the cut",
  bank:"Round the back of the bank"};
function paint(){
  if(screen==="sound")return paintSound();
  const b=beat(), live=build.rows>=10;
  if(G.phase==="summary"){return paintSummary();}
  if(G.phase==="intro"){
    lineEls[0].textContent="LAW OF THE WEST — GOLD GULCH";
    lineEls[0].className="npc";
    setChoice(lineEls[1],1,"Pin on the badge","sel");
    setChoice(lineEls[2],2,"Sound test");
    lineEls[3].className="choice dim note";
    lineEls[3].textContent="An original recreation inspired by the 1985 game.";
    lineEls[4].className="choice dim note";
    lineEls[4].textContent=(gameMode?"":"Opens full screen; EXIT or g stays in the page.");
    hud(); fitText(); return;
  }
  lineEls[0].className="npc";
  if(G.phase==="interlude"){
    const job=JOBS[G.interlude]||{};
    lineEls[0].textContent=G.tips[G.interlude]?job.brief:"Word comes up the street, and it comes late.";
    setChoice(lineEls[1],1,G.tips[G.interlude]
      ?(JOB_PROMPT[G.interlude]||"Go"):"Hear it out","sel");
    for(let i=2;i<5;i++)setChoice(lineEls[i],i,"");
    hud(); fitText(); return;
  }
  if(G.phase==="resolve"){
    lineEls[0].textContent=G.ending?G.ending.text:outcomeLine();
    setChoice(lineEls[1],1,(G.encounter>=CAST.length-1)
      ?"End the day":"Walk on down the street","sel");
    for(let i=2;i<5;i++)setChoice(lineEls[i],i,"");
    hud(); fitText(); return;
  }
  const him=who(G);
  lineEls[0].textContent=b?b.npc
    :(him&&him.standoff)?him.standoff
    :(G.interlude&&JOBS[G.interlude])?JOBS[G.interlude].brief
    :"Nobody is saying anything. The street has gone quiet.";
  const replies=b?b.replies:[];
  for(let i=0;i<4;i++){
    // the cursor stays visible with the gun out, so holstering does not lose your place
    setChoice(lineEls[i+1],i+1,replies[i]?replies[i].text:"",
      (live&&cursor===i?"sel":"")+(G.mode==="gun"?" dim":""));
  }
  hud(); fitText();
}
const OUTCOME_LINES={
  disarmed:"His gun is in the dust and his wrists are in irons.",
  killed_him:"He is dead in the street, and the street saw who fired.",
  innocent_killed:"He never went for a gun. Gold Gulch watched you shoot him anyway.",
  missed_him:"Your shot goes into the facade behind him. Nobody moves.",
  wounded_innocent:"You have shot the arm off a man who never had a gun in it, in front of the street.",
  wounded:"You are hit, and on your feet, which is more than some manage.",
  doctor_saved:"The doctor has you inside and the ball out before the dust settles.",
  doctor_came:"The doctor comes, unhurried, and does the work without once looking at you.",
  doctor_drunk:"The doctor comes with the bottle still on him and makes a poor, slow job of it.",
  turns_away:"He turns and walks, which is not the same as leaving.",
  surrendered:"Hands up, gun in the dust, and a walk to the jail ahead of you.",
  departed:"He goes, and the street closes behind him.",
  walked_away:"He looks at the gun in your hand, thinks better of all of it, and leaves.",
  job_missed:"It happened while you were elsewhere, and nobody had told you it would.",
  unwritten:"[this caller is not written yet]"
};
function outcomeLine(){
  if(G.outcome==="job_missed"&&JOBS[G.interlude])return JOBS[G.interlude].missed;
  return OUTCOME_LINES[G.outcome]||"The matter settles.";
}
function paintSummary(){
  const o=G.over;
  lineEls[0].className="npc";
  lineEls[0].textContent=(o.alive?"SUNDOWN":"THE STREET KEPT YOU")+" — "+o.score+" points";
  setTable(lineEls[1],Object.entries(o.categories));
  setChoice(lineEls[2],2,""); setChoice(lineEls[3],3,"");
  setChoice(lineEls[4],1,"Ride in again","sel act");
  hud(); fitText();
}

/* ---- full screen ---- *
 * The game is meant to be launched in it: pinning on the badge is a gesture,
 * which is the only moment a browser grants fullscreen. EXIT, g or F11 stays
 * in the page, and that choice is the one remembered. */
const NAV=typeof navigator==="object"&&navigator?navigator:null;
const bodyEl=document.body||{classList:{add(){},remove(){}}};
const fullBtn=document.getElementById("full");
let gameMode=false, wakeLock=null;
function readGameModePref(){
  let want=true;
  try{const pref=localStorage.getItem("lotw.gamemode"); if(pref!==null)want=pref==="1";}
  catch(e){}                            // private windows and blocked storage
  return want;
}
let wantGameMode=readGameModePref();
const fsElement=()=>document.fullscreenElement||document.webkitFullscreenElement||null;
function requestFS(){
  const el=document.documentElement; if(!el)return;
  try{const r=el.requestFullscreen?.({navigationUI:"hide"})??el.webkitRequestFullscreen?.();
    if(r&&r.catch)r.catch(()=>{});}catch(e){}
}
function exitFS(){try{const r=document.exitFullscreen?.()??document.webkitExitFullscreen?.();
  if(r&&r.catch)r.catch(()=>{});}catch(e){}}
function keepAwake(){if(!NAV?.wakeLock?.request)return;
  try{NAV.wakeLock.request("screen").then(l=>{wakeLock=l;}).catch(()=>{});}catch(e){}}
function releaseAwake(){try{wakeLock?.release?.();}catch(e){}wakeLock=null;}
function setGameMode(on){
  gameMode=!!on; wantGameMode=gameMode;
  bodyEl.classList?.[gameMode?"add":"remove"]("gamemode");
  fullBtn?.setAttribute?.("aria-pressed",gameMode?"true":"false");
  if(fullBtn)fullBtn.textContent=gameMode?"EXIT":"FULL";
  try{localStorage.setItem("lotw.gamemode",gameMode?"1":"0");}catch(e){}
  if(gameMode)keepAwake(); else releaseAwake();
  fit(); paint();
}
function toggleGameMode(){
  if(gameMode){exitFS();setGameMode(false);}
  else{setGameMode(true);requestFS();}
}
function enterGameModeIfWanted(){if(wantGameMode&&!gameMode){setGameMode(true);requestFS();}}
document.addEventListener?.("fullscreenchange",()=>{if(!fsElement()&&gameMode)setGameMode(false);});
document.addEventListener?.("webkitfullscreenchange",()=>{if(!fsElement()&&gameMode)setGameMode(false);});
for(const t of ["gesturestart","gesturechange","gestureend"])
  document.addEventListener?.(t,e=>{e.preventDefault?.();});
const inUI=e=>!!e.target?.closest?.("#app");
document.addEventListener?.("contextmenu",e=>{if(gameMode||inUI(e))e.preventDefault?.();});
document.addEventListener?.("dblclick",e=>{if(gameMode)e.preventDefault?.();});
/* Going away. A thumb still down when the page is backgrounded would otherwise
 * be held forever, and a cue scheduled before it went would land on a street
 * nobody is watching. The context is suspended rather than torn down; a gesture
 * on the way back is what resumes it, as it was what started it. */
document.addEventListener?.("visibilitychange",()=>{
  if(document.hidden){releaseAll(); newSeq(); SND.suspend(); return;}
  // Coming back is not a fresh start: the gesture that unlocked the audio still
  // counts, so the sound comes back with the picture rather than waiting for
  // another tap that, on a television across the room, may never come.
  SND.wake();
  if(gameMode)keepAwake();
});
addEventListener("pageshow",()=>SND.wake());
addEventListener("focus",()=>SND.wake());
addEventListener("pagehide",()=>{releaseAll(); newSeq(); SND.suspend();});

/* ---- input, one control set for the pad and the keyboard ---- */
/* The theme belongs to the title screen, and it needs a gesture before the
 * audio context exists at all, so the first tap or key is where it starts. */
let themePlayed=false;
/* A gesture unlocks the audio and does nothing else with it. The title cue is
 * scheduled behind the unlock rather than played inside it, so a player who
 * presses FIRE straight through never hears it start under the dawn: starting
 * the day cancels the sequence it was scheduled in. */
/* The title music runs for as long as he is looking at the title, which is what
 * a title screen did: it comes round again rather than playing once and leaving
 * him in silence. Starting the day moves the sequence, and the loop goes with
 * it. */
function titleLoop(){
  if(G.phase!=="intro")return;
  SND.title();
  cueAtMs(SND.spec.lengthOf(SOUNDS.title)*1000+900,titleLoop);
}
/* Returns true when this was the gesture that woke the audio. On the title that
 * gesture is spent on the music and nothing else: a browser will not make a
 * sound until it is asked to, so the press that asks is the press that raises
 * the title theme, and the next one starts the day. With the sound off there is
 * nothing to raise and the press goes straight through. */
function firstGesture(){
  SND.unlock();
  if(themePlayed||G.phase!=="intro")return false;
  themePlayed=true;
  titleLoop();                       // in the gesture, not a frame behind it
  return SND.on;
}
/* Back to the title from the sundown table: the music starts over with it. */
function toTitle(){
  newSeq(); SND.stopAll(); themePlayed=false;
  G=newDay({}); G.phase="intro"; cursor=0; said=""; react="";
  build={at:performance.now(),rows:0};
  themePlayed=true; cueAtMs(0,titleLoop);
  paint();
}
function startDay(){
  SND.unlock(); started=true; enterGameModeIfWanted();
  // whatever was sounding — the title, the sundown, the last man's theme — is
  // over, and nothing it scheduled is still owed
  newSeq(); SND.stopAll();
  SND.dawn();
  G=newDay({}); cursor=0; said=""; react="";
  beginEncounter(G); openDialogue(G);
  // the badge follows the dawn rather than landing on top of it, and the day's
  // first visitor follows the badge
  const d=SND.spec.lengthOf(SOUNDS.dawn)*1000;
  const b=SND.spec.lengthOf(SOUNDS.badge)*1000;
  cueAtMs(d+60,()=>SND.badge());
  newScene(d+b+160);
}
/* Each visitor is audible before he is visible: his own arrival over the door
 * and the boardwalk. */
function newScene(after){
  build={at:performance.now(),rows:0};
  said=""; react=""; cursor=0;
  const t0=after||0, e=who(G);
  cueAtMs(t0,()=>SND.door());                       // the door, then the boardwalk
  cueAtMs(t0+260,()=>SND.step());
  (e&&e.arrive||[]).forEach((cue,i)=>{
    if(typeof SND[cue]==="function")cueAtMs(t0+420+i*520,()=>SND[cue]());
  });
  // and then his own theme, which is how you know who is in the street
  const theme=e&&e.theme;
  if(theme)cueAtMs(t0+700,()=>{if(who(G)===e&&G.mode!=="gun")SND.theme(theme);});
}
/* A navigation click marks a selection changing. Walking into a wall is not a
 * selection changing, and neither is a reply that is not there. */
function moveCursor(d){
  if(build.rows<10)return;
  const b=beat(); const n=b&&b.replies?b.replies.length:0;
  if(n<1)return;
  const was=cursor;
  cursor=((cursor+d)%n+n)%n;
  if(cursor!==was)SND.click();
  paint();
}
/* Putting the gun up is one sound, the same one whichever way he does it: the
 * HOL control, Escape, or walking the sights off the bottom of the street. */
function putUp(){
  if(G.mode!=="gun")return;
  holster(G); SND.holster(); paint();
}
function up(){
  if(screen==="sound"){soundCmd("prev");return;}
  if(G.phase==="intro")return;
  if(G.mode==="talk"&&(G.phase==="dialogue"||G.phase==="tell")){
    drawGun(G,performance.now()); drawnAt=performance.now();
    SND.cut();                                  // the theme stops where the gun starts
    // leather out of the holster, the hammer back, the sights settling: once
    SND.leather(); SND.cock(); cueAtMs(140,()=>SND.aim());
    paint(); return;
  }
  if(G.mode==="gun")moveAim(G,0,-1);            // the sights make no sound
}
function down(){
  if(screen==="sound"){soundCmd("next");return;}
  if(G.mode==="gun"){
    // down walks the crosshair down the scene; pulled past the bottom it
    // holsters, which is the way out of a stand-off. HOL and Escape do it at once.
    if(G.aim.y>=0.995){putUp();return;}
    moveAim(G,0,1); return;                     // the sights make no sound
  }
  if(G.phase==="dialogue"&&build.rows>=10)moveCursor(1);
}
function left(){if(screen==="sound"){soundCmd("prev");return;}
  if(G.mode==="gun"){moveAim(G,-1,0);return;}
  if(G.phase==="dialogue")moveCursor(-1);}
function right(){if(screen==="sound"){soundCmd("next");return;}
  if(G.mode==="gun"){moveAim(G,1,0);return;}
  if(G.phase==="dialogue")moveCursor(1);}
function fire(){
  if(screen==="sound"){soundCmd("play");return;}
  if(G.phase==="intro"){startDay();paint();return;}
  if(G.phase==="summary"){startDay();paint();return;}
  if(G.phase==="resolve"){advance();return;}
  if(G.phase==="interlude"){
    const warned=!!G.tips[G.interlude];
    enterJob(G);
    if(warned){SND.cut();SND.alarm();G.tell.at=performance.now();SND.tell();SND.tension();}
    else settleSound();
    paint(); return;
  }
  if(G.mode==="gun"){
    if(G.duel&&G.duel.fired){SND.dryfire();return;}      // that chamber is spent
    const lat=Math.round(performance.now()-(G.tell?G.tell.at:drawnAt));
    SND.gunshot(); flash=0.16;
    const before=G.outcome;
    shoot(G,Math.max(60,lat));
    afterShot(before);
    return;
  }
  if(G.phase!=="dialogue"||build.rows<10)return;
  const b=beat(); if(!b){SND.deny();return;}
  const chosen=b.replies[cursor]; if(!chosen){SND.deny();return;}
  SND.select();
  reactTo(chosen.next||chosen.end||chosen.action||"");
  say(G,cursor);
  if(G.phase==="tell"){G.tell.at=performance.now();SND.cut();SND.tell();SND.tension();}
  if(G.phase==="resolve")settleSound();
  paint();
}
function choose(i){                       // the 1-4 keys and the tapped lines
  if(screen==="sound"){soundCmd(["play","next","prev","back"][i]||"play");return;}
  if(G.phase==="intro"){
    if(i===1){screen="sound";cueAt=0;SND.unlock();paint();return;}
    startDay();paint();return;}
  if(G.phase!=="dialogue"||G.mode!=="talk")return;
  cursor=Math.max(0,Math.min(3,i)); fire();
}
function afterShot(before){
  const d=G.duel;
  if(!d)return;
  settleSound();
  if(G.phase==="summary")endSound();
  paint();
}
function settleSound(){
  SND.cut();                              // the theme is over; this is the answer
  const o=G.outcome;
  const flags=(G.ending&&G.ending.flags)||[];
  if(flags.indexOf("offended")>=0)SND.penalty();
  if(flags.some(f=>f.indexOf("tip_")===0)){SND.tipoff();SND.point();}
  else if(o==="surrendered"){SND.respect();SND.thread();}
  else if(o==="departed"||o==="walked_away"||o==="turns_away")SND.step();
  else if(o==="disarmed"){SND.ricochet();SND.wound();}
  else if(o==="wounded_innocent"){SND.wound();SND.disgrace();}
  else if(o==="killed_him"){SND.hit();SND.death();bodyFall=0.01;}
  else if(o==="innocent_killed"){SND.hit();SND.death();SND.disgrace();bodyFall=0.01;}
  else if(o==="missed_him"){SND.ricochet();cueAtMs(220,()=>SND.graze());}
  else if(o==="wounded"){SND.gunshot();SND.hit();}
  else if(o==="doctor_saved"||o==="doctor_came"){SND.gunshot();SND.hit();cueAtMs(400,()=>SND.patch());}
  else if(o==="job_missed"){SND.alarm();SND.robbery();}
  else SND.clock();
  if(o==="killed_him"||o==="innocent_killed")cueAtMs(900,()=>SND.churchbell());
  if(G.duel&&G.duel.fired)cueAtMs(1200,()=>SND.reload());
  if(G.phase==="summary")endSound();
}
function endSound(){
  SND.cut(); SND.dusk();
  cueAtMs(700,()=>{(G.over&&G.over.score>=400)?SND.respect():SND.disgrace();});
}
function advance(){
  if(G.phase==="summary")return;
  // the last man's footsteps, bell and reload are no longer owed to anyone
  newSeq(); SND.cut();
  const r=nextEncounter(G);
  if(G.phase==="summary"){endSound();paint();return;}
  if(G.phase!=="interlude")openDialogue(G);
  newScene(); SND.clock(); SND.wind(); paint();
  if(G.phase==="interlude")cueAtMs(300,()=>{if(G.phase==="interlude")SND.theme("th_job");});
}
const CONTROL={up,down,left,right,fire,
  full:toggleGameMode,
  holster:putUp,
  mute:()=>{const on=SND.toggle(); if(!on)newSeq(); showSound(on);
    try{localStorage.setItem("lotw.sound",on?"1":"0");}catch(e){}}};
function showSound(on){
  if(!muteBtn)return;
  // "SOUND ON" while a phone sits on silent is a lie the player cannot see
  // through. If the sound is wanted but the context is not running, say so.
  const stuck=on&&SND.state!=="none"&&SND.state!=="running";
  muteBtn.textContent=on?(stuck?"NO AUDIO":"SOUND ON"):"SOUND OFF";
  muteBtn.setAttribute("aria-pressed",on?"true":"false");
}
/* A player who turned the sound off does not want it back on every reload. The
 * preference is restored through quiet(), never through toggle(), so restoring
 * it is not itself the gesture that builds an AudioContext. */
(function restoreSound(){
  let off=false;
  try{off=localStorage.getItem("lotw.sound")==="0";}catch(e){}
  if(off)SND.quiet();
  showSound(SND.on);
})();
/* Every on-screen control carries data-cmd; the same names are the key map, so
 * a control can never exist that no handler covers.
 *
 * A press takes pointer capture, so a thumb that slides off the button keeps
 * the gesture instead of handing it to the page as a text selection, and a
 * held direction repeats: 320ms, then every 90ms. Holding a control now does
 * what holding a control should, which is also why the browser never gets long
 * enough to decide the player meant to select something. */
const REPEAT_DELAY=320, REPEAT_RATE=90;
const REPEATS=new Set(["up","down","left","right"]);
let held=null;                        // {cmd, at, next, el}
/* With the gun out the directions are not a menu and should not behave like
 * one. Every held direction, from the pad or from the keys, goes into one set
 * and the loop integrates them, so two at once give a diagonal and the sights
 * run instead of stepping on a repeat timer. A duel is scored on how long the
 * shot took; a control that waits 320ms before it will move twice is a control
 * that loses it. */
const DIRV={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
const pressed=new Set();
let aimRun=0, aimTick=0;
const aiming=()=>G.mode==="gun"&&G.phase!=="intro"&&screen!=="sound";
function runAim(now){
  if(!pressed.size||!aiming()){aimRun=0;aimTick=0;return;}
  let dx=0,dy=0;
  for(const c of pressed){const v=DIRV[c]; if(v){dx+=v[0];dy+=v[1];}}
  if(!dx&&!dy){aimRun=0;return;}
  const dt=aimTick?Math.min(64,now-aimTick):16; aimTick=now;
  aimRun=Math.min(1,aimRun+dt/300);            // the sights take a moment to run
  const m=Math.sqrt(dx*dx+dy*dy);
  const k=(0.55+aimRun*1.40)*dt/1000/RULES.AIM_STEP;
  moveAim(G,dx/m*k,dy/m*k);
}
function runCmd(cmd,el){
  if(cmd==="choose")choose(+el.dataset.index);
  else if(CONTROL[cmd])CONTROL[cmd]();
  else SND.deny();
  paint();
}
function releaseHeld(){
  if(held&&held.el&&held.el.classList)held.el.classList.remove("on");
  held=null;
}
function releaseAll(){pressed.clear();aimRun=0;aimTick=0;releaseHeld();}
document.querySelectorAll("[data-cmd]").forEach(el=>{
  el.addEventListener("pointerdown",e=>{
    e.preventDefault();
    if(firstGesture()){paint();return;}          // that press raised the music
    const cmd=el.dataset.cmd;
    // capture can throw if the pointer has already gone; the press still counts
    try{el.setPointerCapture?.(e.pointerId);}catch(err){}
    runCmd(cmd,el);
    if(REPEATS.has(cmd)){
      pressed.add(cmd);
      if(!aiming())held={cmd,el,next:performance.now()+REPEAT_DELAY};
    }
  });
  // Capture is taken on the press, so a thumb that slides off the button still
  // owns the gesture: only letting go, or the system taking it away, ends it.
  // pointerleave is not letting go.
  for(const t of ["pointerup","pointercancel","lostpointercapture"])
    el.addEventListener(t,()=>{
      if(el.dataset.cmd)pressed.delete(el.dataset.cmd);
      if(held&&held.el===el)releaseHeld();
    });
});
/* Nothing on this page is text to be selected or dragged. */
document.addEventListener?.("selectstart",e=>{
  if(!e.target?.closest?.("input,textarea"))e.preventDefault?.();
});
document.addEventListener?.("dragstart",e=>e.preventDefault?.());
addEventListener("blur",releaseAll);
/* The arrows, the same four under the left hand, and the numeric keypad, so a
 * player reaches for whichever of the three they already use. */
const KEYS={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",
  w:"up",s:"down",a:"left",d:"right",
  "8":"up","2":"down","4":"left","6":"right",
  Enter:"fire"," ":"fire",f:"fire",
  Escape:"holster",h:"holster",m:"mute",g:"full",F11:"full"};
function keyCmd(e){
  // the keypad digits are directions; the row above the letters picks a reply
  if(e.code&&e.code.indexOf("Numpad")===0)return KEYS[e.code.slice(6)]||null;
  return KEYS[e.key]||KEYS[(e.key||"").toLowerCase()]||null;
}
/* The browser's own key repeat never does anything. A held key is a held key:
 * it goes into the same set the pad fills, and whatever repeating it should do
 * is done by the frame loop, on the frame loop's clock. That is what makes a
 * held key and a held thumb the same thing. */
addEventListener("keydown",e=>{
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(firstGesture()){e.preventDefault();paint();return;}
  if(/^[1-4]$/.test(e.key)&&!(e.code&&e.code.indexOf("Numpad")===0)){
    e.preventDefault();
    if(!e.repeat){choose(+e.key-1);paint();}
    return;
  }
  const cmd=keyCmd(e);
  if(!cmd)return;
  e.preventDefault();
  if(e.repeat)return;                       // the OS may not act on the player's behalf
  if(DIRV[cmd]){
    pressed.add(cmd);
    CONTROL[cmd]();
    // with the gun out the loop runs the sights; in the dialogue it repeats
    // the menu, on the same clock and after the same wait as the pad
    if(!aiming())held={cmd,el:null,next:performance.now()+REPEAT_DELAY};
    paint(); return;
  }
  CONTROL[cmd]();
  paint();
});
addEventListener("keyup",e=>{
  const cmd=keyCmd(e);
  if(cmd){
    pressed.delete(cmd);
    if(held&&held.cmd===cmd&&!held.el)releaseHeld();
  }
  if(!pressed.size){aimRun=0;aimTick=0;}
});

/* ---- the street itself, as a sight ---- *
 * With the gun out, a thumb on the picture lays the sights where it lands and
 * drags them from there. It does not fire: a shot costs a man's life and an
 * arrest, so it stays on FIRE and on the keys, where it cannot be an accident.
 */
function scenePoint(e){
  const r=cv.getBoundingClientRect?.();
  if(!r||!r.width||!r.height)return null;
  const d=Math.min(devicePixelRatio||1,2.5), g=sceneGeom();
  const x=(((e.clientX-r.left)*(cv.width/(r.width*d))*d)-g.ox)/g.sx;
  const y=(((e.clientY-r.top)*(cv.height/(r.height*d))*d)-g.oy)/g.sy;
  return {x:x/SCENE.w,y:y/SCENE.h};
}
let laying=false;
function layOn(e){
  if(!aiming())return;
  const p=scenePoint(e); if(!p)return;
  if(p.x<-0.04||p.x>1.04||p.y<-0.04||p.y>1.04)return;
  e.preventDefault?.();
  setAim(G,p.x,p.y); SND.click(); paint();
}
if(cv.addEventListener){
  cv.addEventListener("pointerdown",e=>{
    SND.unlock(); firstGesture();
    if(!aiming())return;
    laying=true;
    try{cv.setPointerCapture?.(e.pointerId);}catch(err){}
    layOn(e);
  });
  cv.addEventListener("pointermove",e=>{if(laying)layOn(e);});
  for(const t of ["pointerup","pointercancel","lostpointercapture"])
    cv.addEventListener(t,()=>{laying=false;});
}

/* ---- the loop ----
 * One rAF loop, wrapped. Where there is no rAF - a headless harness - the
 * frame function is exposed instead so a test can step time itself. */
const RAF=typeof requestAnimationFrame==="function"?requestAnimationFrame:null;
function frame(now){
  try{
    if(build.rows<10&&now-build.at>60*build.rows){
      build.rows++;
      if(build.rows===10){if(G.phase!=="intro")SND.creak();paint();}
    }
    if(held&&now>=held.next){held.next=now+REPEAT_RATE;runCmd(held.cmd,held.el);}
    runAim(now);
    runQueue(now);
    // Nothing announces an audio route change. Once a second, if the sound is
    // meant to be on and the context is not running, take it back.
    if(now-wokeAt>1000){
      wokeAt=now;
      if(SND.on&&SND.suspended)SND.wake();
      showSound(SND.on);
    }
    if(flash>0)flash-=1/60;
    if(bodyFall>0&&bodyFall<1.4)bodyFall+=0.06;
    if(G.phase!=="intro"&&G.phase!=="summary"){
      const before=G.phase;
      const ev=tick(G,now);
      // a man who outdraws you ends the encounter, and sometimes the day, from
      // inside the loop rather than from a keypress: repaint either way
      if(ev&&G.phase==="resolve"){settleSound();paint();}
      if(ev&&G.phase==="summary"){endSound();paint();}
      if(before==="tell"&&G.phase==="duel"){SND.holster();}
    }
    drawScene(now);
  }catch(err){console.error(err);}
  if(RAF)RAF(frame);
}
globalThis.__frame=frame;
fit(); paint(); if(RAF)RAF(frame);
