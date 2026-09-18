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

/* The sheriff's own shoulder, arm, hand and revolver, 44x34 cells generated as
 * a silhouette with a one-cell contour and then frozen here as the art. */
const OWN={
  holstered:[
    "BBBB........................................",
    "CCCCBBB.....................................",
    "CCCCCCCBB...................................",
    "CCCCCCCCCBB.................................",
    "CCCCCFFFCCCBB...............................",
    "CCCCCFFFCCCCCB..............................",
    "CCCCCFFFCCCCCCBB............................",
    "CCCCCFFFCCCCCCCCB...........................",
    "CCCCCFFFCCCCCCCCCB..........................",
    "CCCCCFFFCCCCCCCCCCBB........................",
    "CCCCCFFFCCCCCCCCCCCCBB......................",
    "CCCCCFFFCCCCCCCCCCCCCCBB....................",
    "CCCCCFFFCCCCCCCCCCCCCCCCBB..................",
    "CCCCCFFFCCCCCCCCCCCCCCCCCKBB................",
    "CCCCCFFFCCCCCCCCCCCCCCCCCKKKB...............",
    "CCCCCFFFCCCCCCCCCCCCCCCCCKKKKBB.............",
    "CCCCCFFFCCCCCCCCCCCCCCCCCKKKKKKBB...........",
    "CCCCCFFFCCCCCCCCCCCGGGGCCKKKKKKKKB..........",
    "CCCCCFFFCCCCCCCCCCGGGGGGCKKKKKKKKKBB........",
    "CCCCCFFFCCCCCCCCCCGGGGGGCKKKKKKKKKKKBB......",
    "CCCCCFFFCCCCCCCCCCGGGGGGCKKKKKKKKKKKKKB.....",
    "CCCCCFFFCCCCCCCCCCGGGGGGCKKKKKKKKKKKKKKBB...",
    "CCCCCFFFCCCCCCCCCHGGGGGGHKKKKKKKKKKKKKKKKB..",
    "CCCCCFFFCCCCCCCHHHGGGGGGHHKKKKKKKKKKKKKKKKB.",
    "CCCCCFFFCCCCCCCHHHHHHHHHHHKKKKKKKKKKKKKKKKB.",
    "CCCCCFFFCCCCCCCHHHHHHHHHHHKKKKKWWWWWWWWWWKB.",
    "CCCCCFFFCCCCCCCHHHHHHHHHHHKKKKKWWWWWWWWWWWB.",
    "CCCCCFFFCCCCCCCHHHHHHHHHHHKKKKKAAAAAAAAAAAB.",
    "CCCCCFFFCCCCCCCHHHHHHHHHHHKKKKAAAAAAAAAAAAAB",
    "CCCCCFFFCCCCCCCHHHHHHHHHHHKKKKAAAAAAAAAAAAAB",
    "CCCCCFFFCCCCCCCHHHHHHHHHHHKKKKKAAAAAAAAAAAB.",
    "CCCCCFFFCCCCCCCHHHHHHHHHHHKKKKKKAAAAAAAAAKB.",
    "CCCCCFFFCCCCCCCHHHHHHHHHHHKKKKKKKKKKKKKKKKB.",
    "CCCCCFFFCCCCCCCHHHHHHHHHHHKKKKKKKKKKBBBBBB.."
  ],
  drawn:[
    "BBBB.....................................BBK",
    "CCCCBBB................................BBGGG",
    "CCCCCCCBB.............................BGGGGG",
    "CCCCCCCCCBB..........................BGGGGGG",
    "CCCCCFFFCCCBB.......................BAAAAAAA",
    "CCCCCFFFCCCCCB.....................BAAAAAAAA",
    "CCCCCFFFCCCCCCBB...................BAAAAAAAK",
    "CCCCCFFFCCCCCCCCB..................BWWWWWWWK",
    "CCCCCFFFCCCCCCCCCB................BWWWWWWWKK",
    "CCCCCFFFCCCCCCCCCCBB.............BKKKKKKKKKK",
    "CCCCCFFFCCCCCCCCCCCCBB..........BKKKKKKKKKKK",
    "CCCCCFFFCCCCCCCCCCCCCCBB.......BKKKKKKKKKKKB",
    "CCCCCFFFCCCCCCCCCCCCCCCCBB....BKKKKKKKKKKKB.",
    "CCCCCFFFCCCCCCCCCCCCCCCCCKBB.BKKKKKKKKKKKKB.",
    "CCCCCFFFCCCCCCCCCCCCCCCCCKKKBKKKKKKKKKKKKB..",
    "CCCCCFFFCCCCCCCCCCCCCCCCCKKKKKKKKKKKKKKKB...",
    "CCCCCFFFCCCCCCCCCCCCCCCCCKKKKKKKKKKKKKKB....",
    "CCCCCFFFCCCCCCCCCCCCCCCCCKKKKKKKKKKKKKKB....",
    "CCCCCFFFCCCCCCCCCCCCCCCCCKKKKKKKKKKKKKB.....",
    "CCCCCFFFCCCCCCCCCCCCCCCCCKKKKKKKKKKKKB......",
    "CCCCCFFFCCCCCCCCCCCCCCCCCKKKKKKKKKKKB.......",
    "CCCCCFFFCCCCCCCCCCCCCCCCCKKKKKKKKKKKB.......",
    "CCCCCFFFCCCCCCCCCHHHHHHHHKKKKKKKKKKB........",
    "CCCCCFFFCCCCCCCHHHHHHHHHHHKKKKKKKKB.........",
    "CCCCCFFFCCCCCCCHHHHHHHHHHHKKKKKKKKB.........",
    "CCCCCFFFCCCCCCCHHHHHHHHHHHKKKKKKKB..........",
    "CCCCCFFFCCCCCCCHHHHHHHHHHHKKKKKKB...........",
    "CCCCCFFFCCCCCCCHHHHHHHHHHHKKKKKB............",
    "CCCCCFFFCCCCCCCHHHHHHHHHHHKKKKKB............",
    "CCCCCFFFCCCCCCCHHHHHHHHHHHKKKKB.............",
    "CCCCCFFFCCCCCCCHHHHHHHHHHHKKKB..............",
    "CCCCCFFFCCCCCCCHHHHHHHHHHHKKB...............",
    "CCCCCFFFCCCCCCCHHHHHHHHHHHKKB...............",
    "CCCCCFFFCCCCCCCHHHHHHHHHHHKB................"
  ]
};
/* ---- the town, in perspective, out of blocks ---- *
 * Everything is stepped by hand rather than filled as a polygon: a column at a
 * time with integer edges, so the diagonals stair the way a bitmap's do and
 * nothing on screen has a soft edge. The C64's sixteen colours are the whole
 * palette. */
const C64={blk:"#000000",wht:"#ffffff",red:"#68372b",cyn:"#70a4b2",pur:"#6f3d86",
  grn:"#588d43",blu:"#352879",yel:"#b8c76f",org:"#6f4f25",brn:"#433900",
  lrd:"#9a6759",dgy:"#444444",gry:"#6c6c6c",lgn:"#9ad284",lbl:"#6c5eb5",lgy:"#959595"};
const VP={x:150,y:118};                  // where the street runs out
const px=(x,y,w,h,col)=>{ctx.fillStyle=col;ctx.fillRect(Math.round(x),Math.round(y),
  Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
/* A shape given as a top and a bottom edge over a span of columns. */
function columns(x0,x1,top,bot,col){
  ctx.fillStyle=col;
  for(let x=Math.round(x0);x<Math.round(x1);x++){
    const a=Math.round(top(x)), b=Math.round(bot(x));
    if(b>a)ctx.fillRect(x,a,1,b-a);
  }
}
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
function figureRows(fig,pose){
  const rows=fig.rows.slice();
  const over=pose==="raise"?fig.raise:(pose==="surrender"?SURRENDER:null);
  if(over)for(const k of Object.keys(over))rows[+k]=over[k].padEnd(SPR.w,".").slice(0,SPR.w);
  return rows;
}
/* The rim: for each filled cell, a one-pixel line on every side facing air. */
function drawFigure(rows,x0,y0,look,cell){
  const k=cell||FIGCELL, at=(r,c)=>(rows[r]&&rows[r][c])||".";
  for(let r=0;r<rows.length;r++)for(let c=0;c<SPR.w;c++){
    const col=cellColour(at(r,c),look); if(!col)continue;
    px(x0+c*k,y0+r*k,k,k,col);
  }
  ctx.fillStyle=C64.blk;
  for(let r=0;r<rows.length;r++)for(let c=0;c<SPR.w;c++){
    if(cellColour(at(r,c),look)===null)continue;
    const X=Math.round(x0+c*k), Y=Math.round(y0+r*k);
    if(cellColour(at(r-1,c),look)===null)ctx.fillRect(X,Y,k,1);
    if(cellColour(at(r+1,c),look)===null)ctx.fillRect(X,Y+k-1,k,1);
    if(cellColour(at(r,c-1),look)===null)ctx.fillRect(X,Y,1,k);
    if(cellColour(at(r,c+1),look)===null)ctx.fillRect(X+k-1,Y,1,k);
  }
}
function visitor(enc,pose){
  const fig=figureOf(enc), look=LOOK[enc.figure||enc.id]||LOOK.robber;
  const rows=figureRows(fig,pose);
  let lowest=0;
  for(let r=0;r<rows.length;r++)if(/[^.]/.test(rows[r]))lowest=r;
  ctx.fillStyle="rgba(0,0,0,.35)";                   // his shadow, on the grid
  ctx.fillRect(SPRX+4*FIGCELL,SPRY+(lowest+1)*FIGCELL,16*FIGCELL,FIGCELL);
  drawFigure(rows,SPRX,SPRY,look);
}

/* ---- the sheriff, nearest the camera and biggest on the screen ---- *
 * 44x34 cells at three pixels each: a hundred and thirty across the left third
 * of the frame, from his shoulder down past his holster. He is the only figure
 * the player never sees the face of. */
const OWN_CELL=3, OWN_X=0, OWN_Y=98;
/* His coat is the darkest blue on the screen and nothing else in the town is
 * that colour, so the foreground never reads as part of the boardwalk. */
const OWN_LOOK={C:"#2d3c66",K:"#1d2846",F:"#41548a",W:C64.lgy};
function ownGun(out){
  const rows=out?OWN.drawn:OWN.holstered;
  const at=(r,c)=>(rows[r]&&rows[r][c])||".";
  const col=ch=>({".":null,H:C64.brn,C:OWN_LOOK.C,K:OWN_LOOK.K,F:OWN_LOOK.F,
    W:OWN_LOOK.W,A:C64.lrd,G:C64.lgy,B:C64.blk}[ch]||null);
  for(let r=0;r<rows.length;r++)for(let c=0;c<rows[r].length;c++){
    const ch=at(r,c); const k=col(ch); if(!k)continue;
    px(OWN_X+c*OWN_CELL,OWN_Y+r*OWN_CELL,OWN_CELL,OWN_CELL,k);
  }
  // the light off the street catches the top edge of him, one pixel wide, which
  // is what keeps a mass this size from reading as a hole in the picture
  for(let c=0;c<44;c++){
    let top=-1;
    for(let r=0;r<rows.length;r++)if(col(at(r,c))&&at(r,c)!=="B"){top=r;break;}
    if(top<0)continue;
    px(OWN_X+c*OWN_CELL,OWN_Y+top*OWN_CELL,OWN_CELL,1,"#6f7ea8");
  }
}

/* ---- the street ---- */
const PEOPLE=[{x:196,w:4,h:10},{x:206,w:4,h:9},{x:126,w:4,h:10}];
function town(now,armed){
  // sky, in four bands, and the rim of hills behind the town
  const sky=[[0,12,C64.lbl],[12,24,C64.cyn],[24,34,C64.lgy],[34,44,C64.lrd]];
  for(const [a,b,c] of sky)px(0,a,SCENE.w,b-a,c);
  for(let x=0;x<SCENE.w;x++){
    const h=Math.round(44+6*Math.sin(x/37)+4*Math.sin(x/11));
    px(x,h,1,58-h,C64.brn);
  }
  // the ground: the far haze first, then the street, so nothing shows through
  px(0,56,SCENE.w,VP.y-56,"#8a6050");                     // dust hanging at the far end
  for(let i=0;i<6;i++){                                   // the rest of the town, far off
    const x=102+i*20, h=30+((i*7)%16), w=18;
    px(x,VP.y-h,w,h,i%2?"#3a3020":"#4a3d28");
    px(x-1,VP.y-h,w+2,3,C64.brn);                         // the roof
    px(x+5,VP.y-h+8,5,6,C64.blk); px(x+6,VP.y-h+9,3,4,i%3?C64.yel:C64.blk);
  }
  px(0,VP.y,SCENE.w,SCENE.h-VP.y,C64.lrd);
  for(let i=1;i<7;i++){                                   // ruts, converging on the gap
    const t=i/7;
    for(let y=VP.y+2;y<SCENE.h;y+=4){
      const u=(y-VP.y)/(SCENE.h-VP.y);
      px(VP.x+(t*2-1)*u*230,y,Math.max(1,Math.round(u*3)),1,i%2?C64.org:C64.brn);
    }
  }
  // the block on the left: front corner at the frame, far edge toward the gap
  const lBoard=x=>lerp(x,0,168,108,VP.y+2);
  columns(0,108,()=>16,lBoard,C64.brn);
  columns(0,108,x=>lerp(x,0,16,108,60),x=>lerp(x,0,28,108,66),C64.org);    // roof line
  for(const [wx,wy,ww] of [[10,52,22],[46,56,18],[78,64,12]]){
    px(wx,wy,ww,Math.round(ww*0.9),C64.blk);
    px(wx+2,wy+2,ww-4,Math.round(ww*0.9)-4,C64.yel);
  }
  px(22,100,26,44,C64.blk); px(24,102,22,42,"#1d1508");                     // a doorway
  columns(0,108,lBoard,x=>lBoard(x)+lerp(x,0,10,108,3),C64.dgy);            // boardwalk edge
  // the block on the right, larger and nearer
  const rBoard=x=>lerp(x,212,VP.y+4,SCENE.w,180);
  columns(212,SCENE.w,()=>2,rBoard,C64.brn);
  columns(212,SCENE.w,x=>lerp(x,212,50,SCENE.w,2),x=>lerp(x,212,58,SCENE.w,16),C64.org);
  for(const [wx,wy,ww] of [[220,70,14],[244,76,20],[276,84,26]]){
    px(wx,wy,ww,Math.round(ww*0.9),C64.blk);
    px(wx+2,wy+2,ww-4,Math.round(ww*0.9)-4,C64.yel);
  }
  px(286,116,32,56,C64.blk); px(288,118,28,54,"#1d1508");
  columns(212,SCENE.w,rBoard,x=>rBoard(x)+lerp(x,212,3,SCENE.w,14),C64.dgy);
  for(let i=0;i<6;i++){                                   // porch posts, thickening forward
    const x=216+i*20, w=1+Math.round(i*0.7), top=lerp(x,212,48,SCENE.w,0);
    px(x,top,w,rBoard(x)-top,C64.brn);
  }
  // hitching rail, trough and barrels along the near right
  px(214,138,92,2,C64.brn); px(222,140,2,14,C64.brn); px(280,142,3,20,C64.brn);
  px(196,150,34,12,C64.brn); px(198,152,30,8,C64.blu);
  for(const [bx,by,bw,bh] of [[246,150,14,20],[266,156,16,24]]){
    px(bx,by,bw,bh,C64.org); px(bx,by,bw,2,C64.brn); px(bx,by+bh-3,bw,3,C64.brn);
  }
  // people on the far boardwalk, who do not stay for gunplay
  if(!armed)for(const p of PEOPLE){
    px(p.x,VP.y-p.h,p.w,p.h,C64.dgy); px(p.x,VP.y-p.h,p.w,2,C64.blk);
  }
  // the sign over the door of wherever this is
  const enc=who(G), name=(enc&&enc.place)||"GOLD GULCH";
  px(228,54,84,13,C64.brn); px(230,56,80,9,C64.blk);
  ctx.fillStyle=C64.yel; ctx.font="700 8px monospace";
  ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText(name,270,61);
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
  ownGun(G.mode==="gun");
  if(G.mode==="gun"&&build.rows>=6)crosshair();
  if(flash>0){ctx.fillStyle="rgba(255,255,255,"+Math.min(1,flash*6)+")";
    ctx.fillRect(0,0,SCENE.w,SCENE.h);}
  if(build.rows<10){                                       // the block-load cadence
    ctx.fillStyle="#000";
    ctx.fillRect(0,build.rows*(SCENE.h/10),SCENE.w,SCENE.h-build.rows*(SCENE.h/10));
  }
  px(0,0,SCENE.w,9,"rgba(0,0,0,.72)");
  ctx.fillStyle=C64.yel; ctx.font="700 8px monospace";
  ctx.textAlign="left"; ctx.textBaseline="middle";
  const counted=Math.min(G.encounter+1,CAST.length);
  ctx.fillText(G.phase==="summary"?"GOLD GULCH   SUNDOWN"
    :G.interlude?((enc?enc.name.toUpperCase():"")+"   A ROBBERY")
    :((enc?enc.name.toUpperCase():"GOLD GULCH")+"   "+counted+" OF "+CAST.length),4,5);
  ctx.textAlign="right"; ctx.fillStyle=G.wounds?C64.red:C64.lgy;
  ctx.fillText(G.wounds?"WOUNDED":"UNHURT",SCENE.w-4,5);
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

function beat(){return nodeOf(G);}
const JOB_PROMPT={stage:"1. Ride for the ford",train:"1. Get down to the cut",
  bank:"1. Round the back of the bank"};
function paint(){
  const b=beat(), live=build.rows>=10;
  if(G.phase==="summary"){return paintSummary();}
  if(G.phase==="intro"){
    lineEls[0].textContent="LAW OF THE WEST — GOLD GULCH";
    lineEls[0].className="npc";
    lineEls[1].textContent="1. Pin on the badge";
    lineEls[1].className="choice sel";
    const done=CAST.filter(written).length;
    lineEls[2].textContent=done+" of "+CAST.length+" callers written so far.";
    lineEls[2].className="choice dim";
    lineEls[3].textContent="An original recreation inspired by the 1985 game.";
    lineEls[3].className="choice dim";
    lineEls[4].textContent=(gameMode?"":"Opens full screen; EXIT or g stays in the page.");
    lineEls[4].className="choice dim";
    modeEl.textContent="GOLD GULCH"; scoreEl.textContent="";
    fitText(); return;
  }
  lineEls[0].className="npc";
  if(G.phase==="interlude"){
    const job=JOBS[G.interlude]||{};
    lineEls[0].textContent=G.tips[G.interlude]?job.brief:"Word comes up the street, and it comes late.";
    lineEls[1].textContent=G.tips[G.interlude]?(JOB_PROMPT[G.interlude]||"1. Go"):"1. Hear it out";
    lineEls[1].className="choice sel";
    for(let i=2;i<5;i++){lineEls[i].textContent="";lineEls[i].className="choice";}
    modeEl.textContent=(job.name||"").toUpperCase();
    scoreEl.textContent="Authority "+G.authority+"   arrests "+G.arrests;
    fitText(); return;
  }
  if(G.phase==="resolve"){
    lineEls[0].textContent=G.ending?G.ending.text:outcomeLine();
    lineEls[1].textContent=(G.encounter>=CAST.length-1)?"1. End the day":"1. Walk on down the street";
    lineEls[1].className="choice sel";
    for(let i=2;i<5;i++){lineEls[i].textContent="";lineEls[i].className="choice";}
    scoreEl.textContent="Authority "+G.authority+"   arrests "+G.arrests;
    modeEl.textContent=who(G)?who(G).name.toUpperCase():"";
    fitText(); return;
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
  modeEl.textContent=G.mode==="gun"?"GUN DRAWN — down to holster":"TALKING — up to draw";
  scoreEl.textContent="Authority "+G.authority+"   arrests "+G.arrests+
    (G.wounds?"   wounded":"");
  fitText();
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
  scoreEl.textContent=o.score+" points";
  modeEl.textContent="SUNDOWN";
  fitText();
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
  if(G.phase==="intro")return;
  if(G.mode==="talk"&&(G.phase==="dialogue"||G.phase==="tell")){
    drawGun(G,performance.now()); drawnAt=performance.now();
    SND.cut();                                  // the theme stops where the gun starts
    SND.holster(); SND.cock(); setTimeout(()=>SND.aim(),140); paint(); return;
  }
  if(G.mode==="gun"){moveAim(G,0,-1);SND.click();}
}
function down(){
  if(G.mode==="gun"){
    // down walks the crosshair down the scene; pulled past the bottom it
    // holsters, which is the way out of a stand-off. HOL and Escape do it at once.
    if(G.aim.y>=0.995){holster(G);SND.holster();paint();return;}
    moveAim(G,0,1); SND.click(); return;
  }
  if(G.phase==="dialogue"&&build.rows>=10){cursor=(cursor+1)%4;SND.click();paint();}
}
function left(){if(G.mode==="gun"){moveAim(G,-1,0);SND.click();}
  else if(G.phase==="dialogue"){cursor=(cursor+3)%4;SND.click();paint();}}
function right(){if(G.mode==="gun"){moveAim(G,1,0);SND.click();}
  else if(G.phase==="dialogue"){cursor=(cursor+1)%4;SND.click();paint();}}
function fire(){
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
  if(G.phase==="intro"){startDay();paint();return;}
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
  const o=G.outcome;
  const flags=(G.ending&&G.ending.flags)||[];
  if(flags.indexOf("offended")>=0)SND.penalty();
  if(flags.some(f=>f.indexOf("tip_")===0)){SND.clue();SND.point();}
  else if(o==="surrendered"){SND.respect();SND.thread();}
  else if(o==="departed"||o==="walked_away"||o==="turns_away")SND.step();
  else if(o==="disarmed"){SND.ricochet();SND.wound();}
  else if(o==="wounded_innocent"){SND.wound();SND.disgrace();}
  else if(o==="killed_him"){SND.hit();SND.death();bodyFall=0.01;}
  else if(o==="innocent_killed"){SND.hit();SND.death();SND.disgrace();bodyFall=0.01;}
  else if(o==="missed_him"){SND.ricochet();setTimeout(()=>SND.graze(),220);}
  else if(o==="wounded"){SND.gunshot();SND.hit();}
  else if(o==="doctor_saved"||o==="doctor_came"){SND.gunshot();SND.hit();setTimeout(()=>SND.patch(),400);}
  else if(o==="job_stopped"){SND.thread();SND.respect();}
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
      if(ev&&G.phase==="resolve"){settleSound();paint();}
      if(before==="tell"&&G.phase==="duel"){SND.holster();}
    }
    drawScene(now);
  }catch(err){console.error(err);}
  if(RAF)RAF(frame);
}
globalThis.__frame=frame;
fit(); paint(); if(RAF)RAF(frame);
