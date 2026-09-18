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
let flash=0, bodyFall=0, said="", react="";

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
/* The sheriff's own arm. It runs out of the top-left corner of the frame, which
 * is what says whose arm it is: his shoulder is at the camera, not across the
 * street. Sleeve, cuff, black fist and revolver, 44x40 cells at three pixels
 * each — the largest thing in the picture, and the only part of him there is. */
const OWN={
  holstered:[
    "LLLB........................................",
    "LLLLB.......................................",
    "LLLLLB......................................",
    "SSSLLLB.....................................",
    "SSLLLLLB....................................",
    "SLLLLLLLB...................................",
    "SLLLLLLLLBB.................................",
    "LLLLLLSLLLLBB...............................",
    "LLLLLSSSLLLLLBB.............................",
    "LLLLSSSSSLLLLLLB............................",
    "SSSSSSSSSSSLLLLLBB..........................",
    "SSSSSSSSSSSSSLLLLLB.........................",
    "SSSSSSSSSSSSSSSLLLLB........................",
    "SSSSSSSSSSSSSSSSLLLB........................",
    "SSSSSSSSSSSSSSSSSSLLB.BBBB..................",
    "SSSSSSSSSSSSSSSSSSSLLBWWWWB.................",
    "DDSSSSSSDDDDSSSSSSSLLLWWWWB.................",
    "DDDSSSDDDDDDDSSSSSSSLLWWWWB.................",
    "DDDDDDDDDDDDDDSSSSSSSLWWWWB.................",
    "DDDDDDDDDDDDDDDSSSSSSSWWWWB.................",
    "DDDDDDDDDDDDDDDSSSSSSDWWWWB.................",
    "DDDDDDDDDDDDDDSSSSSSDDWWWWB.................",
    "DDDDDDDDDDDDDDSSSSSDDDWWWWB.................",
    "DDDDDDDDDDDDDSSSSSSDDDWWWWB.................",
    "BDDDDDDDDDDDDDDSSSSSDDWWWWB.................",
    ".BDDDDDDDDDDDDDDDSSSDDWWWWB.................",
    "..BDDDDDDDDDDDDDDDSSSDWWWWB.................",
    "...BBDDDDDDDDDDDDDDSSSWWWWB.................",
    ".....BBDDDDDDDDDDDDDSSWWWWB.................",
    ".......BBDDDDDDDDDDDDSWWWWB.................",
    ".........BBDDDDDDDDDDDWWWWB.................",
    "...........BBDDDDDDDDDWWWWB.................",
    ".............BBDDDDDDDWWWWB.................",
    "...............BBDDDDDWWWWB.................",
    ".................BDDDDWWWWB.................",
    "..................BDDDWWWWB.................",
    "...................BDDWWWWB.................",
    "....................BDWWWWB.................",
    ".....................BWWWWB.................",
    ".....................BWWWWB................."
  ],
  drawn:[
    "LLLLLLB.....................................",
    "LLLLLLLB....................................",
    "SLLLLLLLB...................................",
    "SSSLLLLLLBB.................................",
    "SSLLLLSLLLLBB...............................",
    "SLLLLSSSLLLLLBB.............................",
    "LLLLLSSSSLLLLLLB............................",
    "LLLLSSSSSSSLLLLLBB..........................",
    "LLLSSSSSSSSSSLLLLLB.........................",
    "SSSSSSSSSSSSSSSLLLLB........................",
    "SSSSSSSSSSSSSSSSLLLB........................",
    "SSSSSSSSSSSSSSSSSSLLB.BBBB..................",
    "SSSSSSSSSSSSSSSSSSSLLBWWWWB.................",
    "SSSSSSSSDDDDSSSSSSSLLLWWWWB.................",
    "DDSSSSDDDDDDDSSSSSSSLLWWWWB.................",
    "DDDSSDDDDDDDDDSSSSSSSLWWWWB.................",
    "DDDDDDDDDDDDDDDSSSSSSSWWWWB.................",
    "DDDDDDDDDDDDDDDSSSSSSDWWWWB.................",
    "DDDDDDDDDDDDDDSSSSSSDDWWWWB.................",
    "DDDDDDDDDDDDDDSSSSSDDDWWWWB.................",
    "DDDDDDDDDDDDDSSSSSSDDDWWWWB.................",
    "BDDDDDDDDDDDDDDSSSSSDDWWWWB.................",
    ".BDDDDDDDDDDDDDDDSSSDDWWWWB.................",
    "..BDDDDDDDDDDDDDDDSSSDWWWWB.................",
    "...BBDDDDDDDDDDDDDDSSSWWWWB.................",
    ".....BBDDDDDDDDDDDDDSSWWWWB.................",
    ".......BBDDDDDDDDDDDDSWWWWB.................",
    ".........BBDDDDDDDDDDDWWWWB.................",
    "...........BBDDDDDDDDDWWWWB.................",
    ".............BBDDDDDDDWWWWB.................",
    "...............BBDDDDDWWWWB.................",
    ".................BDDDDWWWWB.................",
    "..................BDDDWWWWB.................",
    "...................BDDWWWWB.................",
    "....................BDWWWWB.................",
    ".....................BWWWWB.................",
    ".....................BWWWWB.................",
    ".....................BWWWWB.................",
    ".....................BWWWWB.................",
    "......................BBBB.................."
  ]
};
const HAND={
  level:[
    "..........................................................................................",
    "..........................................................................................",
    "..........................................................................................",
    "......................BBBBBBBBBBBBB.......................................................",
    ".....................BLGGGGGGGGGGDDB......................................................",
    ".....................BLGGGGGGGGGGDDB......................................................",
    ".....................BLDDDDDDDDDDDDB......................................................",
    "....................BBLDDDDDDDDDDDDB......................................................",
    "...................BDDLDDDDDDDDDDDDB......................................................",
    "...................BDDLDDDDDDDDDDDDB......................................................",
    "...................BDDLDDDDDDDDDDDDB......................................................",
    "...................BDDLDDDDDDDDDDDDB......................................................",
    "...................BDDLDGGGGGGGGGGGB......................................................",
    "...................BDDDDGGGGGGGGGGGB......................................................",
    "...................BDDDDGGGGGGGGGGGB......................................................",
    "...................BDDDDGGGGGGGGGGGB......................................................",
    "...................BDDDDGGGGGGGGGGGB................................................BBBB..",
    "...................BDDDDGGGGGGGGGGGBBBBBBBBBBBBBBBBBBBBBBBBBB......................BLLGGB.",
    "...................BDDDDGGGGGGGGGGGLLLLLLLLLLLBLLLLLLLLLLLLLLB.....................BLLGGB.",
    "...................BDDDDGGGGGGGGGGGLLLLLLBBBBBBBBBBBLLLLLLLLLB.....................BLLGGB.",
    "...................BDDDDDBBBDDDGGGGGGGGLBBDGGGGDGGGBBGGGGGGGGB.....................BLLGGB.",
    "....................BBBBB..BDDDGGGGGGGBBLLDGGGGDGGGGDBBGGGGGGB.....................BLLGGB.",
    "...........................BDDDGGGGGGBBLLLDGGGGDGGGGDGBBGGGGGB.....................BLLGGB.",
    "...........................BDDDGGGGGBBLLLLDGGGGDGGGGDGGBBGGGGBBBBBBBBB.............BLLGGB.",
    "..............BBBBBBBBBBBBBBDDDGGGGLBDLLLGDGGGGDGGGGDGGGBGGGLLLLLLLLLLBBBBBBBBBBBBBBLLGGB.",
    ".............BHHHHHHHHHHHHHHHHHHHGLBLDLLLGDGGGGDGGGGDGGGGBGDLLLLLLLLLLLLLLLLLLLLLLLLLLGGB.",
    ".............BHHHHHHHHHHHHHHHHHHHGBBLDLLLGDGGGGDGGGGDGGGGBBBGGGGGGGGGGLLLLLLLLLLLLLLLLLLB.",
    ".............BAAAAAAAAAAAAAAAAAAAGBGGDGGGGDGGGGDGGGGDGGGGDBBGGGGGGGGGGGGGGGGGGGGGGGGGGGLB.",
    ".............BAAAAAAAAAAAAAAAAAAAGBGGDGGGGDGGGGDGGGGDGGGGDBGGGGGGGGGGGGGGGGGGGGGGGGGGGGGB.",
    ".............BAAAAAAAAAAAAAAAAAAAGBGGDGGGGDGGGGDGGGGDGGGGDBGGGGGGGGGGGGGGGGGGGGGGGGGGGGGB.",
    ".............BAAAAAAAAAAAAAAAAAAAGBGGDGGGGDGGGGDGGGGDGGGGDBGGGGGGGGGGGGGGGGGGGGGGGGGGGGGB.",
    ".............BAAAAAAAAAAAAAAAAAAAKKKADGGGGDGGGGDGGGGDGGGGDBBGGGGGGGGGGGGGGGGGGGGGGGGGGGGB.",
    "......BBBBBBBBKKKKKKKKKKKKKKKKKAAKKKADGGGGDGGGGDGGGGDGGGGDBGGGGGGGGGGGGGGGGGGGGGGGGGGGGGB.",
    "BBBBBBHHHHHHHHKKKKKKKKKKKKKKKKKAAKKAGDGGGGDGGGGDGGGGDGGGGDBGGGGGGGGGGGGGGGDDDDDDDDDDDDDDB.",
    "KKKKKKKKAAAAAAAAAAAAAAAAAAHHHAAKKKKAGDGGGGDGGGGDGGGGDGGGGDBGDDDDDDDDDDDDDDBBBBBBBBBBBBBB..",
    "AAAAAAAAAAAAAAAAAAAAAAAAAAHHHAAKKKAGGDGGGGDGGGGDGGGGDGGGGDBBBBGGGGGGGGGGGGGGGGGGGGGB......",
    "AAAAAAAAAAAAAAAAAAAAAAAAAAHHHAAKKKABGDGGGGGGGGGDGGGGDDDDDBBB.BDDDDDDDDDDDDDDDDDDDDDB......",
    "AAAAAAAAAAAAAAAAAAAAAAAAAAHHHAAKKAGBGDGGGGGGGGGDGGGGDDDDDBDB.BDDDDDDDDDDDDDDDDDDDDDB......",
    "AAAAAAAAAKKKKKKKKKKKKKKKKKKKKKKKKAGGGGGGGGGGGGGGGGGGDDDDBDB..BDDDDDDDDDDDDDDDDDDDDDB......",
    "KKKKKKKKABBBBBBBBDDDKKKKKKKKKKKKAGGGGGGGGGGGGGGGGGGDDDDBBB....BBBBBBBBBBBBBBBBBBBBB.......",
    "AAAAAAAAAHHHHHHHHHHHHHHHHHHHKKKKAGGGGGGGGGGGGGGGGGGDDDBBB.................................",
    "AAAAAAAAAAAAAAAAAAAAAAAHHHAAKKKKAGGGGBBGDDDDGGGDGGGGDBBB..................................",
    "AAAAAAAAAAAAAAAAAAAAAAAHHHAAKKKABGGGB.BGDDDDGGGDGGGGBDB...................................",
    "AAAAAAAAAAAAAAAAAAAAAAAHHHAAKKKAGGGGB.BGDDDDGGBBBGGGGB....................................",
    "KKKKKKKKAAAAAAAAAAAAAAAHHHAAKKABBBGB..BGDDDDGGBBBBGGGB....................................",
    "AAAAAAAAAKKKKKKKKKKKKKKKKKKKKKAB..B...BGDDDDGGB..BGGGB....................................",
    "KKKKAAAAABBBBBDDDKKKKKKKKKKKKAB.......BGDDDDGGB..BGGGB....................................",
    "KKKKAAAAAHHHHHHHHHHHHHHHHKKKKAB.......BGDDDDGGB..BGGGGB...................................",
    "KKKKAAAAAAAAAAAAAAAAHHHAAKKKKAB........BDDDDBB...BGGGB....................................",
    "KKKKAAAAAAAAAAAAAAAAHHHAAKKKAB.........BDDDDB....BGGGB....................................",
    "KKKKAAAAAAAAAAAAAAAAHHHAAKKKAB.........BDDDDB....BGGGB....................................",
    "KKKKAAAAAAAAAAAAAAAAHHHAAKKAB...........BBBB......BGGB....................................",
    "KKKKAAAAAKKKKKKKKKKKKKKKKKKAB......................BB.....................................",
    "KKKKAAAAABBDDDKKKKKKKKKKKKAB..............................................................",
    "KKKKAAAAAHHHHHHHHHHHHHKKKKAB..............................................................",
    "KKKKAAAAAAAAAAAAAHHHAAKKKKAB..............................................................",
    "KKKKAAAAAAAAAAAAAHHHAAKKKAB...............................................................",
    "KKKKAAAAAAAAAAAAAHHHAAKKKAB...............................................................",
    "KKKKAAAAAAAAAAAAAHHHAAKKAB................................................................",
    "KKKKAAAAAKKKKKKKKKKKKKKKAB................................................................",
    "KKKKAAAAADDDDDDDDDDDDDDDDB................................................................",
    "KKKKAAAAADDDDDDDDDDDDDDDDB................................................................",
    "KKKKAAAAADDDDDDDDDDDDDDDDB................................................................",
    "KKKKAAAADDDDDDDDDDDDDDDDDB................................................................",
    "KKKKAAAABBBBBBBBBBBBBBBBB.................................................................",
    "KKKKAAAAB................................................................................."
  ],
  down:[
    "..........................................................................................",
    "..........................................................................................",
    "..........................................................................................",
    "......................BBBBBBBBBBBBB.......................................................",
    ".....................BLGGGGGGGGGGDDB......................................................",
    ".....................BLGGGGGGGGGGDDB......................................................",
    ".....................BLDDDDDDDDDDDDB......................................................",
    "....................BBLDDDDDDDDDDDDB......................................................",
    "...................BDDLDDDDDDDDDDDDB......................................................",
    "...................BDDLDDDDDDDDDDDDB......................................................",
    "...................BDDLDDDDDDDDDDDDB......................................................",
    "...................BDDLDDDDDDDDDDDDB......................................................",
    "...................BDDLDGGGGGGGGGGGB......................................................",
    "...................BDDDDGGGGGGGGGGGB......................................................",
    "...................BDDDDGGGGGGGGGGGB......................................................",
    "...................BDDDDGGGGGGGGGGGB......................................................",
    "...................BDDDDGGGGGGGGGGGB......................................................",
    "...................BDDDDGGGGGGGGGGGBBBBBBBBBBBBBBBBBBBBBBBBBB.............................",
    "...................BDDDDGGGGGGGGGGGLLLLLLLLLLLBLLLLLLLLLLLLLLB............................",
    "...................BDDDDGGGGGGGGGGGLLLLLLBBBBBBBBBBBLLLLLLLLLB............................",
    "...................BDDDDDBBBDDDGGGGGGGGLBBDGGGGDGGGBBGGGGGGGGB............................",
    "....................BBBBB..BDDDGGGGGGGBBLLDGGGGDGGGGDBBGGGGGGB............................",
    "...........................BDDDGGGGGGBBLLLDGGGGDGGGGDGBBGGGGGB............................",
    "...........................BDDDGGGGGBBLLLLDGGGGDGGGGDGGBBGGGGB............................",
    "..............BBBBBBBBBBBBBBDDDGGGGLBDLLLGDGGGGDGGGGDGGGBGGGGB............................",
    ".............BHHHHHHHHHHHHHHHHHHHGLBLDLLLGDGGGGDGGGGDGGGGBGDLB............................",
    ".............BHHHHHHHHHHHHHHHHHHHGBBLDLLLGDGGGGDGGGGDGGGGBBBGLB...........................",
    ".............BAAAAAAAAAAAAAAAAAAAGBGGDGGGGDGGGGDGGGGDGGGGDBBGLB...........................",
    ".............BAAAAAAAAAAAAAAAAAAAGBGGDGGGGDGGGGDGGGGDGGGGDBGGGLB..........................",
    ".............BAAAAAAAAAAAAAAAAAAAGBGGDGGGGDGGGGDGGGGDGGGGDBGGGLB..........................",
    ".............BAAAAAAAAAAAAAAAAAAAGBGGDGGGGDGGGGDGGGGDGGGGDBGGGGLB.........................",
    ".............BAAAAAAAAAAAAAAAAAAAKKKADGGGGDGGGGDGGGGDGGGGDBBGGGLB.........................",
    "......BBBBBBBBKKKKKKKKKKKKKKKKKAAKKKADGGGGDGGGGDGGGGDGGGGDBGGGGGLB........................",
    "BBBBBBHHHHHHHHKKKKKKKKKKKKKKKKKAAKKAGDGGGGDGGGGDGGGGDGGGGDBGGGGGLB........................",
    "KKKKKKKKAAAAAAAAAAAAAAAAAAHHHAAKKKKAGDGGGGDGGGGDGGGGDGGGGDBGGGGGGLB.......................",
    "AAAAAAAAAAAAAAAAAAAAAAAAAAHHHAAKKKAGGDGGGGDGGGGDGGGGDGGGGDBBDGGGGGLB......................",
    "AAAAAAAAAAAAAAAAAAAAAAAAAAHHHAAKKKABGDGGGGGGGGGDGGGGDDDDDBBBBGGGGGLB......................",
    "AAAAAAAAAAAAAAAAAAAAAAAAAAHHHAAKKAGBGDGGGGGGGGGDGGGGDDDDDBDBBDGGGGGLB.....................",
    "AAAAAAAAAKKKKKKKKKKKKKKKKKKKKKKKKAGGGGGGGGGGGGGGGGGGDDDDBDB..BGGGGGLB.....................",
    "KKKKKKKKABBBBBBBBDDDKKKKKKKKKKKKAGGGGGGGGGGGGGGGGGGDDDDBBB...BDGGGGGLB....................",
    "AAAAAAAAAHHHHHHHHHHHHHHHHHHHKKKKAGGGGGGGGGGGGGGGGGGDDDBBB.....BGGGGGLB....................",
    "AAAAAAAAAAAAAAAAAAAAAAAHHHAAKKKKAGGGGBBGDDDDGGGDGGGGDBBB......BDGGGGGLB...................",
    "AAAAAAAAAAAAAAAAAAAAAAAHHHAAKKKABGGGB.BGDDDDGGGDGGGGBDB........BGGGGGLB...................",
    "AAAAAAAAAAAAAAAAAAAAAAAHHHAAKKKAGGGGB.BGDDDDGGBBBGGGGB.........BDGGGGGLB..................",
    "KKKKKKKKAAAAAAAAAAAAAAAHHHAAKKABBBGB..BGDDDDGGBBBBGGGB..........BDGGGGLB..................",
    "AAAAAAAAAKKKKKKKKKKKKKKKKKKKKKAB..B...BGDDDDGGB..BGGGB...........BGGGGGLB.................",
    "KKKKAAAAABBBBBDDDKKKKKKKKKKKKAB.......BGDDDDGGB..BGGGB...........BDGGGGGLB................",
    "KKKKAAAAAHHHHHHHHHHHHHHHHKKKKAB.......BGDDDDGGB..BGGGGB...........BGGGGGLB................",
    "KKKKAAAAAAAAAAAAAAAAHHHAAKKKKAB........BDDDDBB...BGGGB............BDGGGGGLB...............",
    "KKKKAAAAAAAAAAAAAAAAHHHAAKKKAB.........BDDDDB....BGGGB.............BGGGGGLB...............",
    "KKKKAAAAAAAAAAAAAAAAHHHAAKKKAB.........BDDDDB....BGGGB.............BDGGGGGLB..............",
    "KKKKAAAAAAAAAAAAAAAAHHHAAKKAB...........BBBB......BGGB..............BGGGGGLB..............",
    "KKKKAAAAAKKKKKKKKKKKKKKKKKKAB......................BB...............BDGGGGGLB.............",
    "KKKKAAAAABBDDDKKKKKKKKKKKKAB.........................................BGGGGGLB.............",
    "KKKKAAAAAHHHHHHHHHHHHHKKKKAB.........................................BDGGGGGLB............",
    "KKKKAAAAAAAAAAAAAHHHAAKKKKAB..........................................BDGGGGLB............",
    "KKKKAAAAAAAAAAAAAHHHAAKKKAB............................................BGGGGGLB...........",
    "KKKKAAAAAAAAAAAAAHHHAAKKKAB............................................BDGGGGGLB..........",
    "KKKKAAAAAAAAAAAAAHHHAAKKAB..............................................BGGGGGLB..........",
    "KKKKAAAAAKKKKKKKKKKKKKKKAB..............................................BDGGGGGLB.........",
    "KKKKAAAAADDDDDDDDDDDDDDDDB...............................................BGGGGGLB.........",
    "KKKKAAAAADDDDDDDDDDDDDDDDB...............................................BDGGGGGB.........",
    "KKKKAAAAADDDDDDDDDDDDDDDDB................................................BGGGGGB.........",
    "KKKKAAAADDDDDDDDDDDDDDDDDB................................................BDGGGGB.........",
    "KKKKAAAABBBBBBBBBBBBBBBBB..................................................BGGGGB.........",
    "KKKKAAAAB..................................................................BDGGGB........."
  ]
};
function figureRows(fig,pose){
  const rows=fig.rows.slice();
  const over=pose==="raise"?fig.raise:(pose==="surrender"?SURRENDER:null);
  if(over)for(const k of Object.keys(over))rows[+k]=over[k].padEnd(SPR.w,".").slice(0,SPR.w);
  return rows;
}
/* The silhouette is stamped a pixel larger in black first and the colours laid
 * over it, which gives a one-pixel rim at any cell size: that rim is what keeps
 * a figure legible against a lit window or a dark doorway. */
function drawFigure(rows,x0,y0,look,cw,ch){
  const w=cw||FIGCW, h=ch||FIGCH, at=(r,c)=>(rows[r]&&rows[r][c])||".";
  ctx.fillStyle=C64.blk;
  for(let r=0;r<rows.length;r++)for(let c=0;c<SPR.w;c++){
    if(cellColour(at(r,c),look)===null)continue;
    ctx.fillRect(Math.round(x0+c*w)-1,Math.round(y0+r*h)-1,w+2,h+2);
  }
  for(let r=0;r<rows.length;r++)for(let c=0;c<SPR.w;c++){
    const col=cellColour(at(r,c),look); if(!col)continue;
    px(x0+c*w,y0+r*h,w,h,col);
  }
}
function visitor(enc,pose){
  const fig=figureOf(enc), look=LOOK[enc.figure||enc.id]||LOOK.robber;
  const rows=figureRows(fig,pose);
  let lowest=0;
  for(let r=0;r<rows.length;r++)if(/[^.]/.test(rows[r]))lowest=r;
  ctx.fillStyle="rgba(0,0,0,.35)";                   // his shadow, on the grid
  ctx.fillRect(SPRX+4*FIGCW,SPRY+(lowest+1)*FIGCH,16*FIGCW,FIGCH);
  drawFigure(rows,SPRX,SPRY,look);
}

/* ---- the sheriff, nearest the camera and biggest on the screen ---- *
 * 44x34 cells at three pixels each: a hundred and thirty across the left third
 * of the frame, from his shoulder down past his holster. He is the only figure
 * the player never sees the face of. */
const OWN_CELL=3, OWN_X=0, OWN_Y=12;
/* His coat is the darkest blue on the screen and nothing else in the town is
 * that colour, so the foreground never reads as part of the boardwalk. */
/* The sleeve is mottled light grey, the cuff dark, the fist and the revolver
 * black with a grey barrel: the only thing on screen bigger than a building. */
/* A dusty canvas sleeve, lit along the top of the arm and shadowed beneath it,
 * with a leather cuff at the wrist. Nothing else in the town is this colour, so
 * the foreground never joins the scenery, and the contour is brown rather than
 * black so the arm does not read as a ridge of rock. */
const OWN_LOOK={S:"#7d7466",L:"#a89b82",D:"#4f483e",W:"#4a3524",B:"#2a231c"};
function ownGun(out){
  const rows=out?OWN.drawn:OWN.holstered;
  const at=(r,c)=>(rows[r]&&rows[r][c])||".";
  const col=ch=>OWN_LOOK[ch]||null;
  for(let r=0;r<rows.length;r++)for(let c=0;c<rows[r].length;c++){
    const k=col(at(r,c)); if(!k)continue;
    px(OWN_X+c*OWN_CELL,OWN_Y+r*OWN_CELL,OWN_CELL,OWN_CELL,k);
  }
  hand(out);
}
/* The nearest thing in the picture gets the finest grain: the fist and the
 * revolver are drawn a scene pixel to a cell, so the cylinder is round, the
 * barrel has a rib and a front sight, and the fingers have knuckles. */
const HAND_LOOK={A:"#2f2620",K:"#181310",H:"#453a2c",       // the glove, near black
  D:"#1a1e23",G:"#3b424b",L:"#8a94a2",B:C64.blk};            // and blued steel
const HAND_X=72, HAND_Y=72;
function hand(out){
  const rows=out?HAND.level:HAND.down;
  const dy=out?0:4;
  for(let r=0;r<rows.length;r++){
    const line=rows[r];
    for(let c=0;c<line.length;c++){
      const k=HAND_LOOK[line[c]]; if(!k)continue;
      px(HAND_X+c,HAND_Y+dy+r,1,1,k);
    }
  }
}

/* ---- the street ---- *
 * The 1985 frame, drawn with the craft the machine's artists used: ordered
 * dithering between two colours wherever a flat field would show, clapboard
 * siding on every wall, framed and mullioned windows, panelled doors, awnings
 * with the shadow they cast, plank boardwalks, and light that comes from the
 * left so every edge knows which side it is on. Nothing has a soft edge.
 */
const HORIZON=126, ROOF=48, WALK=118;
const PEOPLE=[{x:196,w:5,h:13},{x:206,w:5,h:12},{x:52,w:5,h:13}];
const hash=(a,b)=>((a*73856093)^(b*19349663))>>>0;
/* A 4x4 ordered matrix: the same one a C64 artist would have dithered with. */
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
function dither(x,y,w,h,a,b,amount){
  const t=Math.round(Math.max(0,Math.min(1,amount))*16);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const X=Math.round(x)+i, Y=Math.round(y)+j;
    ctx.fillStyle=BAYER[(j&3)*4+(i&3)]<t?b:a;
    ctx.fillRect(X,Y,1,1);
  }
}
/* A vertical run of colours with a dithered band between each pair. */
function skyband(y0,y1,a,b){
  const n=y1-y0;
  for(let j=0;j<n;j++)dither(0,y0+j,SCENE.w,1,a,b,j/(n-1||1));
}
/* Gold Gulch keeps the same five fronts every day; what changes is the big
 * board over the middle one and what is parked in the near right. */
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
const STORES=[
  {x0:0,  x1:46, top:44, wall:C64.lgy, dark:C64.gry,  trim:C64.dgy, storey:2, sign:"HANLEY'S"},
  {x0:46, x1:96, top:56, wall:C64.yel, dark:"#8d9a52", trim:C64.org, storey:1, sign:"ASSAY OFFICE"},
  {x0:96, x1:170,top:38, wall:C64.lrd, dark:"#784f3f", trim:C64.brn, storey:2, board:true},
  {x0:170,x1:216,top:54, wall:C64.yel, dark:"#8d9a52", trim:C64.org, storey:1, sign:"LIVERY"},
  {x0:216,x1:252,top:48, wall:C64.gry, dark:C64.dgy,  trim:C64.dgy, storey:2, sign:"TELEGRAPH"}];

function sky(){
  skyband(0,16,C64.blu,"#4a3a8f");
  skyband(16,30,"#4a3a8f",C64.lbl);
  skyband(30,42,C64.lbl,C64.lgy);
  skyband(42,ROOF+8,C64.lgy,C64.lrd);
  for(let i=0;i<6;i++){                                   // cloud banks, lit on top
    const cx=10+i*56, cy=6+(i%3)*10, w=44+(i%3)*14;
    for(let k=0;k<4;k++){
      const inset=[0,5,12,22][k], hh=[4,3,3,2][k];
      px(cx+inset,cy+8-k*3,w-inset*2,hh,k?C64.wht:C64.lgy);
    }
    dither(cx+4,cy+9,w-8,3,C64.lgy,C64.gry,0.6);          // the shaded underside
  }
  for(let x=0;x<SCENE.w;x++){                             // hills, lit from the left
    const h=Math.round(ROOF-8+6*Math.sin(x/31)+3*Math.sin(x/9));
    const slope=Math.cos(x/31)>0;
    px(x,h,1,4,slope?"#5f4f6e":"#402f52");
    px(x,h+4,1,HORIZON-h-4,"#402f52");
  }
  dither(0,ROOF-6,SCENE.w,8,"#402f52","#33264a",0.5);     // haze at their feet
}
function window2(x,y,w,h,lit){
  px(x-1,y-1,w+2,h+2,C64.brn);                            // frame
  px(x,y,w,h,lit?C64.yel:"#26305c");
  if(lit)dither(x,y,w,h,C64.yel,"#8d9a52",0.35);
  else dither(x,y,w,h,"#26305c",C64.blu,0.5);
  px(x+Math.floor(w/2),y,1,h,C64.brn);                    // mullions
  px(x,y+Math.floor(h/2),w,1,C64.brn);
  px(x,y,w,1,lit?C64.wht:C64.lgy);                        // a line of light off the glass
  px(x-1,y+h+1,w+2,2,C64.org);                            // the sill
}
function door(x,y,w,h){
  px(x-1,y-1,w+2,h+1,C64.brn);
  px(x,y,w,h,"#2a1c10");
  for(const j of [0,1]){                                  // two sunken panels
    const py0=y+3+j*Math.floor((h-8)/2), ph=Math.floor((h-10)/2);
    px(x+3,py0,w-6,ph,"#1d1409");
    px(x+3,py0,w-6,1,C64.brn); px(x+3,py0,1,ph,C64.brn);
  }
  px(x+w-4,y+Math.floor(h/2),2,2,C64.yel);                // the knob
}
function storefront(s){
  const w=s.x1-s.x0;
  px(s.x0,s.top,w,WALK-s.top,s.wall);
  dither(s.x0,s.top,w,WALK-s.top,s.wall,s.dark,0.28);     // grain in the paint
  for(let y=s.top+6;y<WALK;y+=3)px(s.x0,y,w,1,s.dark);    // clapboard siding
  px(s.x0,s.top,w,5,s.trim);                              // the false front's cap
  px(s.x0,s.top+5,w,1,C64.blk);
  px(s.x0,s.top,w,1,C64.lgy);
  px(s.x0,s.top+6,2,WALK-s.top-6,s.trim);                 // corner boards
  px(s.x1-2,s.top+6,2,WALK-s.top-6,s.trim);
  px(s.x1-3,s.top+6,1,WALK-s.top-6,C64.blk);              // and the shadow in the joint
  if(s.storey>1)for(let i=0;i<2;i++)
    window2(s.x0+9+i*(w-25),s.top+13,11,13,hash(s.x0,i)%3!==0);
  const ay=WALK-27;
  px(s.x0+2,ay,w-4,3,s.trim); px(s.x0+2,ay+3,w-4,1,C64.blk);   // the awning
  dither(s.x0+2,ay+4,w-4,5,s.wall,C64.blk,0.55);              // its shadow on the wall
  for(const px0 of [s.x0+4,s.x1-7])px(px0,ay+3,2,WALK-ay-3,C64.brn);  // posts
  const dx=s.x0+Math.round(w/2)-8;
  door(dx,WALK-21,16,21);
  for(const side of [s.x0+7,s.x1-20])
    if(side<dx-13||side>dx+15)window2(side,WALK-19,13,12,false);
  if(s.sign)painted(s.sign,s.x0+3,s.top+7,w-6,11,6);
}
/* A painted board: brown frame, black field, yellow letters, the face dropped a
 * point at a time until the name fits the front it is nailed to. */
function painted(text,x,y,w,h,size){
  while(size>4&&text.length*size*0.62>w-4)size--;
  px(x,y,w,h,C64.brn); px(x,y,w,1,C64.org); px(x+1,y+1,w-2,h-2,C64.blk);
  ctx.fillStyle=C64.yel; ctx.font="700 "+size+"px monospace";
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
      if(m<best){best=m;cut=i;}
    }
    lines=[words.slice(0,cut).join(" "),words.slice(cut).join(" ")];
  }
  const longest=Math.max.apply(null,lines.map(t=>t.length));
  const size=longest<=11?8:6;
  const bx=90, bw=96, by=44, bh=lines.length>1?22:14;
  px(bx-1,by-1,bw+2,bh+2,C64.blk);
  px(bx,by,bw,bh,C64.brn); px(bx,by,bw,2,C64.org);
  px(bx+2,by+2,bw-4,bh-4,C64.blk);
  ctx.fillStyle=C64.yel; ctx.font="700 "+size+"px monospace";
  ctx.textAlign="center"; ctx.textBaseline="middle";
  lines.forEach((t,i)=>ctx.fillText(t,bx+bw/2,by+bh/2+1+(i-(lines.length-1)/2)*(size+3)));
  px(bx+5,by+bh,3,8,C64.brn); px(bx+bw-8,by+bh,3,8,C64.brn);   // the brackets
}
/* A cottonwood: an irregular head of foliage, lit from the left. */
function tree(){
  px(220,94,7,WALK-94,C64.brn); px(220,94,2,WALK-94,"#6a5a33"); // trunk, lit edge
  px(227,100,5,2,C64.brn);                                      // a branch
  const blobs=[[224,78,13],[213,86,10],[236,86,11],[224,92,11],[232,76,8]];
  for(const [cx,cy,r] of blobs)
    for(let y=-r;y<=r;y++){const h=Math.round(Math.sqrt(Math.max(0,r*r-y*y)));
      px(cx-h,cy+y,h*2,1,C64.grn);}
  for(const [cx,cy,r] of blobs)                                // light on the upper left
    for(let y=-r;y<=-r/3;y++){const h=Math.round(Math.sqrt(Math.max(0,r*r-y*y)));
      px(cx-h,cy+y,Math.round(h*1.1),1,C64.lgn);}
  for(const [cx,cy,r] of blobs)                                // and shadow beneath
    dither(cx-r,cy+Math.round(r*0.45),r*2,Math.round(r*0.5),C64.grn,"#3a5c2c",0.6);
}
function street(){
  px(0,HORIZON,SCENE.w,SCENE.h-HORIZON,C64.gry);
  dither(0,HORIZON,SCENE.w,SCENE.h-HORIZON,C64.gry,C64.lgy,0.30);
  dither(0,SCENE.h-26,SCENE.w,26,C64.gry,C64.dgy,0.28);        // the dirt near the boots
  // the boardwalk: planks, board ends and the shadow it throws on the street
  px(0,WALK,SCENE.w,HORIZON-WALK,C64.org);
  dither(0,WALK,SCENE.w,HORIZON-WALK,C64.org,C64.brn,0.35);
  px(0,WALK,SCENE.w,1,"#8a6a3a");
  for(let i=0;i<40;i++)px(i*8+3,WALK+1,1,HORIZON-WALK-1,C64.brn);
  px(0,HORIZON-2,SCENE.w,2,C64.brn);
  dither(0,HORIZON,SCENE.w,3,C64.gry,C64.dgy,0.7);
  for(let i=0;i<5;i++){                                        // wheel ruts
    const y=HORIZON+10+i*13, w=40+i*22;
    dither(18+i*44,y,w,2,C64.gry,C64.dgy,0.75);
    px(18+i*44,y+2,w,1,C64.lgy);
  }
  for(let i=0;i<70;i++){                                       // stones, lit and shadowed
    const x=(hash(i,3)%SCENE.w), y=HORIZON+3+(hash(i,7)%(SCENE.h-HORIZON-6));
    const w=1+(hash(i,11)%3);
    px(x,y,w,1,C64.lgy); px(x,y+1,w,1,C64.dgy);
  }
}
/* The one large thing parked in the near right, chosen by the place. Lit from
 * the left like everything else, and dithered where a flat panel would show. */
function propAt(kind){
  if(kind==="loco"){
    px(250,56,60,20,C64.dgy); dither(250,56,60,20,C64.dgy,C64.blk,0.4);
    px(250,56,60,2,C64.gry);
    px(246,76,74,48,C64.blk);                              // the boiler
    for(let y=-24;y<=24;y++){const h=Math.round(Math.sqrt(Math.max(0,576-y*y)));
      const lit=y<-6;
      px(266-h,100+y,h*2,1,lit?C64.gry:C64.dgy);}          // the smokebox door, round
    dither(242,88,50,26,C64.dgy,C64.blk,0.45);
    for(let y=78;y<122;y+=6)px(248,y,70,1,C64.blk);        // boiler bands
    px(274,92,18,18,C64.blk); px(276,94,14,14,C64.lgy);    // the headlamp
    px(278,96,10,10,C64.wht);
    px(256,32,16,26,C64.dgy); px(252,28,24,6,C64.gry);     // the stack
    dither(256,32,16,26,C64.dgy,C64.blk,0.4);
    px(242,124,80,10,C64.blk);                             // the cowcatcher
    for(let i=0;i<9;i++)px(246+i*9,134,4,16,i%2?C64.dgy:C64.gry);
    for(let i=0;i<6;i++){const y=160+i*8;                  // the rails running out
      px(230+i*14,y,SCENE.w,3,C64.brn); px(230+i*14,y,SCENE.w,1,"#6a5a33");}
  } else if(kind==="coach"){
    px(248,66,70,48,C64.brn); dither(248,66,70,48,C64.brn,"#2e2700",0.35);
    px(248,66,70,4,C64.org); px(248,70,70,1,C64.blk);
    for(const wx of [256,284]){                            // windows with a blind
      px(wx-1,75,20,18,C64.blk); px(wx,76,18,16,"#26305c");
      dither(wx,76,18,16,"#26305c",C64.blu,0.5);
      px(wx,76,18,3,C64.org);
    }
    px(244,114,78,6,C64.dgy); px(244,114,78,1,C64.lgy);
    px(250,120,6,20,C64.brn); px(300,120,6,24,C64.brn);    // springs
    for(const [cx,r] of [[264,20],[306,25]]){              // wheels: rim, spokes, hub
      for(let y=-r;y<=r;y++){const h=Math.round(Math.sqrt(Math.max(0,r*r-y*y)));
        px(cx-h,132+y,h*2,1,C64.brn);}
      for(let y=-r+4;y<=r-4;y++){const h=Math.round(Math.sqrt(Math.max(0,(r-4)*(r-4)-y*y)));
        px(cx-h,132+y,h*2,1,C64.gry);}
      for(let a=0;a<10;a++){const dx=Math.cos(a*0.628),dy=Math.sin(a*0.628);
        for(let t=0;t<r-3;t++)px(cx+dx*t,132+dy*t,2,2,C64.brn);}
      px(cx-3,129,6,6,C64.org);
    }
  } else if(kind==="barrels"){
    for(const [bx,by,bw,bh] of [[250,106,28,44],[286,118,30,50],[256,150,32,36]]){
      px(bx,by,bw,bh,C64.org);
      dither(bx,by,bw,bh,C64.org,C64.brn,0.35);
      px(bx,by,3,bh,"#8a6a3a");                            // the lit stave
      px(bx+bw-4,by,4,bh,C64.brn);
      for(const hy of [by+2,by+Math.round(bh/2)-1,by+bh-5])px(bx,hy,bw,3,C64.brn);
      px(bx,by,bw,2,"#8a6a3a");
      ctx.fillStyle="rgba(0,0,0,.35)";ctx.fillRect(bx-3,by+bh,bw+6,2);
    }
  } else if(kind==="crates"){
    for(const [bx,by,bw,bh] of [[246,114,44,38],[292,128,28,30],[254,152,48,40]]){
      px(bx,by,bw,bh,C64.brn); px(bx+2,by+2,bw-4,bh-4,C64.org);
      dither(bx+2,by+2,bw-4,bh-4,C64.org,C64.brn,0.3);
      px(bx+2,by+2,bw-4,1,"#8a6a3a");
      px(bx+2,by+Math.round(bh/2)-1,bw-4,2,C64.brn);       // the band
      px(bx+Math.round(bw/2)-1,by+2,2,bh-4,C64.brn);
      ctx.fillStyle="rgba(0,0,0,.35)";ctx.fillRect(bx-3,by+bh,bw+6,2);
    }
  } else {                                                 // a corral fence in perspective
    for(let i=0;i<4;i++){
      const x=242+i*26, y=114+i*11, h=74-i*7;
      px(x,y,9,h,C64.brn); px(x,y,3,h,"#6a5a33"); px(x,y,9,2,C64.org);
    }
    for(let k=0;k<3;k++)for(let i=0;i<3;i++){
      const x=242+i*26, y=124+i*11+k*17;
      px(x,y,28,6,C64.org); px(x,y,28,1,"#8a6a3a"); px(x,y+5,28,1,C64.brn);
    }
  }
}
function town(now,armed){
  sky();
  const enc=who(G), here=PLACES[(enc&&enc.place)]||PLACES.STREET;
  street();
  for(const s of STORES)storefront(s);
  signboard(here.sign);
  tree();
  // people on the boardwalk, who do not stay for gunplay
  if(!armed)for(const p of PEOPLE){
    px(p.x,WALK-p.h,p.w,p.h,C64.dgy); px(p.x,WALK-p.h,p.w,2,C64.blk);
  }
  propAt(here.prop);
}
/* A hitching rail at the sheriff's own boots, nearer than anything else on the
 * ground. With the arm out of the top corner it is what puts the player in the
 * street rather than watching it. */
function nearRail(){
  px(0,148,108,9,"#2a1c10"); px(0,148,108,2,C64.brn);
  px(0,176,96,10,"#2a1c10"); px(0,176,96,2,C64.brn);
  px(10,140,18,60,"#1d1409"); px(10,140,4,60,C64.brn);
  px(78,152,12,48,"#1d1409"); px(78,152,3,48,C64.brn);
}
function drawScene(now){
  const g=sceneGeom();
  ctx.fillStyle="#000"; ctx.fillRect(0,0,cv.width,cv.height);
  ctx.save(); ctx.translate(g.ox,g.oy); ctx.scale(g.sx,g.sy);
  const armed=G.mode==="gun"||(G.duel&&G.duel.drawn)||G.phase==="tell";
  town(now,armed);
  const enc=who(G);
  if(enc&&build.rows>=6){
    const pose=(G.outcome==="surrendered")?"surrender"
      :(G.duel&&(G.duel.drawn||G.phase==="tell"))?"raise":"idle";
    if(G.outcome==="killed_him"||G.outcome==="innocent_killed"){
      ctx.save();ctx.translate(FIG.cx,FIG.ground);ctx.rotate(Math.min(1.4,bodyFall));
      ctx.translate(-FIG.cx,-FIG.ground);visitor(enc,"idle");ctx.restore();
    } else visitor(enc,pose);
  }
  nearRail();
  ownGun(G.mode==="gun");
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
  ["1. Play it","2. Next","3. Previous","4. Back to the street"].forEach((t,i)=>{
    lineEls[i+1].textContent=t;
    lineEls[i+1].className="choice"+(i===0?" sel":"");
  });
  modeEl.textContent="GOLD GULCH \u00b7 SOUND TEST";
  scoreEl.textContent=name;
  fitText();
}

function beat(){return nodeOf(G);}
/* Who is in front of you, where you are in the day, and how it is going. It
 * lives above the picture rather than over it: the 320x200 frame carries no
 * chrome of its own, the way the machine's did not. */
function hud(){
  const e=who(G), n=Math.min(G.encounter+1,CAST.length);
  const dot=" \u00b7 ";
  const where=G.phase==="intro"?"GOLD GULCH"
    :G.phase==="summary"?"GOLD GULCH"+dot+"SUNDOWN"
    :G.interlude?(((e&&e.name)||"")+dot+"A ROBBERY")
    :e?(e.name+dot+n+"/"+CAST.length):"GOLD GULCH";
  const mode=G.mode==="gun"?dot+"GUN":(G.phase==="dialogue"?dot+"TALK":"");
  modeEl.textContent=where+mode;
  scoreEl.textContent=G.phase==="intro"?""
    :"auth "+G.authority+dot+"arr "+G.arrests+(G.wounds?dot+"WOUNDED":"");
}
const JOB_PROMPT={stage:"1. Ride for the ford",train:"1. Get down to the cut",
  bank:"1. Round the back of the bank"};
function paint(){
  if(screen==="sound")return paintSound();
  const b=beat(), live=build.rows>=10;
  if(G.phase==="summary"){return paintSummary();}
  if(G.phase==="intro"){
    lineEls[0].textContent="LAW OF THE WEST — GOLD GULCH";
    lineEls[0].className="npc";
    lineEls[1].textContent="1. Pin on the badge";
    lineEls[1].className="choice sel";
    lineEls[2].textContent="2. Sound test";
    lineEls[2].className="choice";
    lineEls[3].textContent="An original recreation inspired by the 1985 game.";
    lineEls[3].className="choice dim";
    lineEls[4].textContent=(gameMode?"":"Opens full screen; EXIT or g stays in the page.");
    lineEls[4].className="choice dim";
    hud(); fitText(); return;
  }
  lineEls[0].className="npc";
  if(G.phase==="interlude"){
    const job=JOBS[G.interlude]||{};
    lineEls[0].textContent=G.tips[G.interlude]?job.brief:"Word comes up the street, and it comes late.";
    lineEls[1].textContent=G.tips[G.interlude]?(JOB_PROMPT[G.interlude]||"1. Go"):"1. Hear it out";
    lineEls[1].className="choice sel";
    for(let i=2;i<5;i++){lineEls[i].textContent="";lineEls[i].className="choice";}
    hud(); fitText(); return;
  }
  if(G.phase==="resolve"){
    lineEls[0].textContent=G.ending?G.ending.text:outcomeLine();
    lineEls[1].textContent=(G.encounter>=CAST.length-1)?"1. End the day":"1. Walk on down the street";
    lineEls[1].className="choice sel";
    for(let i=2;i<5;i++){lineEls[i].textContent="";lineEls[i].className="choice";}
    hud(); fitText(); return;
  }
  const him=who(G);
  lineEls[0].textContent=b?b.npc
    :(him&&him.standoff)?him.standoff
    :(G.interlude&&JOBS[G.interlude])?JOBS[G.interlude].brief
    :"Nobody is saying anything. The street has gone quiet.";
  const replies=b?b.replies:[];
  for(let i=0;i<4;i++){
    const r=replies[i];
    lineEls[i+1].textContent=r?(i+1)+". "+r.text:"";
    lineEls[i+1].className="choice"+(live&&G.mode==="talk"&&cursor===i?" sel":"")+
      (G.mode==="gun"?" dim":"");
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
  const cats=Object.entries(o.categories);
  lineEls[1].className="choice dim"; lineEls[1].textContent=cats.slice(0,3).map(([k,v])=>k+" · "+v).join("     ");
  lineEls[2].className="choice dim"; lineEls[2].textContent=cats.slice(3,5).map(([k,v])=>k+" · "+v).join("     ");
  lineEls[3].className="choice dim"; lineEls[3].textContent=cats.slice(5).map(([k,v])=>k+" · "+v).join("     ");
  lineEls[4].className="choice sel"; lineEls[4].textContent="1. Ride in again";
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
document.addEventListener?.("visibilitychange",()=>{if(!document.hidden&&gameMode)keepAwake();});

/* ---- input, one control set for the pad and the keyboard ---- */
/* The theme belongs to the title screen, and it needs a gesture before the
 * audio context exists at all, so the first tap or key is where it starts. */
let themePlayed=false;
function firstGesture(){
  if(themePlayed||G.phase!=="intro")return;
  themePlayed=true; SND.title();
}
function startDay(){
  SND.unlock(); started=true; enterGameModeIfWanted();
  SND.dawn();
  G=newDay({}); cursor=0; said=""; react="";
  beginEncounter(G); openDialogue(G); newScene();
  SND.badge();
}
/* Each visitor is audible before he is visible: his own arrival over the door
 * and the boardwalk. */
function newScene(){
  build={at:performance.now(),rows:0};
  said=""; react=""; cursor=0;
  SND.door(); setTimeout(()=>SND.step(),260);
  const e=who(G);
  (e&&e.arrive||[]).forEach((cue,i)=>{
    if(typeof SND[cue]==="function")setTimeout(()=>SND[cue](),420+i*520);
  });
  // and then his own theme, which is how you know who is in the street
  const theme=e&&e.theme;
  if(theme)setTimeout(()=>{if(who(G)===e&&G.mode!=="gun")SND.theme(theme);},700);
}
function up(){
  if(screen==="sound"){soundCmd("prev");return;}
  if(G.phase==="intro")return;
  if(G.mode==="talk"&&(G.phase==="dialogue"||G.phase==="tell")){
    drawGun(G,performance.now()); drawnAt=performance.now();
    SND.cut();                                  // the theme stops where the gun starts
    SND.holster(); SND.cock(); setTimeout(()=>SND.aim(),140); paint(); return;
  }
  if(G.mode==="gun"){moveAim(G,0,-1);SND.click();}
}
function down(){
  if(screen==="sound"){soundCmd("next");return;}
  if(G.mode==="gun"){
    // down walks the crosshair down the scene; pulled past the bottom it
    // holsters, which is the way out of a stand-off. HOL and Escape do it at once.
    if(G.aim.y>=0.995){holster(G);SND.holster();paint();return;}
    moveAim(G,0,1); SND.click(); return;
  }
  if(G.phase==="dialogue"&&build.rows>=10){cursor=(cursor+1)%4;SND.click();paint();}
}
function left(){if(screen==="sound"){soundCmd("prev");return;}
  if(G.mode==="gun"){moveAim(G,-1,0);SND.click();}
  else if(G.phase==="dialogue"){cursor=(cursor+3)%4;SND.click();paint();}}
function right(){if(screen==="sound"){soundCmd("next");return;}
  if(G.mode==="gun"){moveAim(G,1,0);SND.click();}
  else if(G.phase==="dialogue"){cursor=(cursor+1)%4;SND.click();paint();}}
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
  else if(o==="missed_him"){SND.ricochet();setTimeout(()=>SND.graze(),220);}
  else if(o==="wounded"){SND.gunshot();SND.hit();}
  else if(o==="doctor_saved"||o==="doctor_came"){SND.gunshot();SND.hit();setTimeout(()=>SND.patch(),400);}
  else if(o==="job_missed"){SND.alarm();SND.robbery();}
  else SND.clock();
  if(o==="killed_him"||o==="innocent_killed")setTimeout(()=>SND.churchbell(),900);
  if(G.duel&&G.duel.fired)setTimeout(()=>SND.reload(),1200);
  if(G.phase==="summary")endSound();
}
function endSound(){
  SND.cut(); SND.dusk();
  setTimeout(()=>{(G.over&&G.over.score>=400)?SND.respect():SND.disgrace();},700);
}
function advance(){
  if(G.phase==="summary")return;
  const r=nextEncounter(G);
  if(G.phase==="summary"){endSound();paint();return;}
  if(G.phase!=="interlude")openDialogue(G);
  newScene(); SND.clock(); SND.wind(); paint();
  if(G.phase==="interlude")setTimeout(()=>{if(G.phase==="interlude")SND.theme("th_job");},300);
}
const CONTROL={up,down,left,right,fire,
  full:toggleGameMode,
  holster:()=>{holster(G);paint();},
  mute:()=>{const on=SND.toggle();muteBtn.textContent=on?"SOUND ON":"SOUND OFF";
    muteBtn.setAttribute("aria-pressed",on?"true":"false");}};
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
document.querySelectorAll("[data-cmd]").forEach(el=>{
  el.addEventListener("pointerdown",e=>{
    e.preventDefault(); SND.unlock(); firstGesture();
    const cmd=el.dataset.cmd;
    // capture can throw if the pointer has already gone; the press still counts
    try{el.setPointerCapture?.(e.pointerId);}catch(err){}
    runCmd(cmd,el);
    if(REPEATS.has(cmd))held={cmd,el,next:performance.now()+REPEAT_DELAY};
  });
  for(const t of ["pointerup","pointercancel","lostpointercapture","pointerleave"])
    el.addEventListener(t,()=>{if(held&&held.el===el)releaseHeld();});
});
/* Nothing on this page is text to be selected or dragged. */
document.addEventListener?.("selectstart",e=>{
  if(!e.target?.closest?.("input,textarea"))e.preventDefault?.();
});
document.addEventListener?.("dragstart",e=>e.preventDefault?.());
addEventListener("blur",releaseHeld);
const KEYS={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",
  Enter:"fire"," ":"fire",Escape:"holster",m:"mute",g:"full",F11:"full"};
addEventListener("keydown",e=>{
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  SND.unlock(); firstGesture();
  if(/^[1-4]$/.test(e.key)){e.preventDefault();choose(+e.key-1);paint();return;}
  const cmd=KEYS[e.key]||KEYS[(e.key||"").toLowerCase()];
  if(!cmd)return;
  e.preventDefault();
  CONTROL[cmd]();
  paint();
});

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
