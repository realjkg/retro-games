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
/* The sheriff's own arm: a mottled sleeve entering from the left edge at the
 * height of the caller's chest, a cuff, a black fist and the revolver. 40x22
 * cells at three pixels each, the largest thing in the frame, and the only part
 * of him the player ever sees. */
const OWN={
  holstered:[
    "............................................",
    "............................................",
    "................BB..........................",
    ".............BBBLLBBBBBBB...................",
    "............BLLLLLLLLLWWWB..................",
    "....B.....BBSLLLLLLLLLWWWBBBBB..............",
    "BBBBDBBBBBSSSSLLLLLLLLWWWBBBBBB.............",
    "DDDDDDDDDDSSSSSSSSSSSSWBBBBBBBB.............",
    "DDDDDDDDDDDSSSSSSSSSSSWBBBBBBBBBB...........",
    "DDDDDDDDDDDSSSSSSSDDDDWBBBBBBBBBBB..........",
    "DDDDDDDDDDSSSSSDDDDDDDBBBBBBBBBBBB..........",
    "DDDDDDDSSSSSSSDDDDDDDBBBBBBBBBBBBBB.........",
    "DSSSSSSSSSSSSSDDDDDDSBBBBBBBBBBBBBB.........",
    "SSSSSSSSSSSSSSDDDDDSSBBBBBBBBBBBBBB.........",
    "LLLLLLLLSSSSSSDDDSSSSBBBBBBBBBBBBBB.........",
    "LLLLLLLLSSSSSDDDSSSSSBBBBBBBBBBBBBB.........",
    "LLLLLLLSSSSSSDDSSSSSSSBBBBBBBBBBBGB.........",
    "LLLLLLSSSSSDDDDSSSSSSSWBBBBBBBBBBGB.........",
    "LLLLLSSSSSDDDDSSSSSSSSWBBBBBBBBGGGB.........",
    "LLSSSSSSDDDDDSSSSSSSSDWBBBBBBBMGGGGB........",
    "SSSSSSDDDDDSSSSSSSSSDDWBBBBB.BMGGGGB........",
    "SSSSSDDDSSSSSSSSSBBBDDWWWB....BMGGGGB.......",
    "SSSSSSSSSSSSSSSBB...BBWWWB....BMGGGGB.......",
    "SSSSSSSSSSLLLLB......BWWWB.....BMGGGGB......",
    "SSSSSSSLLLLLLB........BBB......BMGGGGB......",
    "SSSSSLLLBLBBB...................BMGGGGB....."
  ],
  drawn:[
    "................BB..........................",
    ".............BBBSSBBBBBBB...................",
    "............BSLLLLLLLLWWWB..................",
    "....B.....BBSLLLLLLLLLWWWB....BBBB..........",
    "BBBBSBBBBBSSSLLLLLLLLLWWWB.B.BGGGGB.........",
    "SSSSSSSSSSSSSLLLLLLLLLWBBBBBBBGGGGGBB.......",
    "SSDDDDDDDDSSSSLLLLLLLLWBBBBBBBBGMMMMGB......",
    "DDDDDDDDDDSSSSSSSSSSSSWBBBBBBBBBBGGGGBBBBBBB",
    "DDDDDDDDDDDSSSSSSSSSSSBBBBBBBBBBBGGGMMMMMMMM",
    "DDDDDDDDDDDSSSSSSSDDDBBBBBBBBBBBBBGGGGGGGGGG",
    "DDDDDDDDDDSSSSSDDDDDDBBBBBBBBBBBBBGGGGGGGGGG",
    "DDDDDDDSSSSSSSDDDDDDDBBBBBBBBBBBBBGGGGGGGGGG",
    "DSSSSSSSSSSSSSDDDDDDSBBBBBBBBBBBBBGGGBBBBBBB",
    "SSSSSSSSSSSSSSDDDDDSSBBBBBBBBBBBBBGGGB......",
    "LLLLLLLLSSSSSSDDDSSSSSBBBBBBBBBBBBBBB.......",
    "LLLLLLLLSSSSSDDDSSSSSLWBBBBBBBBBBBBB........",
    "LLLLLLLSSSSSSDDSSSSSSSWBBBBBBBBBBBB.........",
    "LLLLLLSSSSSDDDDSSSSSSSWBBBBBBBBBB...........",
    "LLLLLSSSSSDDDDSSSSSSSSWBBBBBBBBBB...........",
    "LLSSSSSSDDDDDSSSSBBBSDWWWBBBBBBBB...........",
    "SSSSSSDDDDDSSSSBB...BBWWWBBBBBBBB...........",
    "SSSSSDDDSSSSSSB......BWWWBBBBBBBB...........",
    "SSSSSSSSSSSSSB........BBBBBBBBBBB...........",
    "SSSSSSSSBSBBB............BBBBBBB............",
    "SSSSSSBB.B..................................",
    "SSSSBB......................................"
  ]
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
const OWN_CELL=3, OWN_X=0, OWN_Y=92;
/* His coat is the darkest blue on the screen and nothing else in the town is
 * that colour, so the foreground never reads as part of the boardwalk. */
/* The sleeve is mottled light grey, the cuff dark, the fist and the revolver
 * black with a grey barrel: the only thing on screen bigger than a building. */
const OWN_LOOK={S:C64.lgy,L:"#c3c3c3",D:C64.gry,W:"#2b2b2b",
  G:C64.blk,M:C64.gry,B:C64.blk};   // the revolver is a black silhouette with one light edge
function ownGun(out){
  const rows=out?OWN.drawn:OWN.holstered;
  const at=(r,c)=>(rows[r]&&rows[r][c])||".";
  const col=ch=>OWN_LOOK[ch]||null;
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

/* ---- the street ---- *
 * The frame the 1985 game used, rebuilt from scratch: a flat row of storefronts
 * across the back under a cloudy sky, the caller standing in the middle of a
 * grey street, one large piece of scenery in the near right, and the sheriff's
 * own sleeve, fist and revolver coming in across the left at the height of the
 * caller's chest. Everything is stepped a column at a time with integer edges.
 */
const HORIZON=126, ROOF=48, WALK=118;
const PEOPLE=[{x:196,w:5,h:13},{x:206,w:5,h:12},{x:52,w:5,h:13}];
const hash=(a,b)=>((a*73856093)^(b*19349663))>>>0;
/* Each caller's place decides the sign over the door and what is parked in the
 * near right of the frame. */
const PROPS={STREET:"coach","STAGE ROAD":"coach","THE CUT":"loco",SALOON:"barrels",
  BANK:"crates",JAIL:"crates",DOCTOR:"barrels",SCHOOL:"fence",CORRAL:"fence"};
const STORES=[
  {x0:0,  x1:46, top:44, wall:C64.lgy, trim:C64.dgy, storey:2},
  {x0:46, x1:100,top:56, wall:C64.yel, trim:C64.org, storey:1},
  {x0:100,x1:158,top:40, wall:C64.lrd, trim:C64.brn, storey:2, signs:true},
  {x0:158,x1:212,top:54, wall:C64.yel, trim:C64.org, storey:1},
  {x0:212,x1:252,top:48, wall:C64.gry, trim:C64.dgy, storey:2}];
function sky(){
  px(0,0,SCENE.w,ROOF+8,C64.blu);
  for(let i=0;i<6;i++){                                   // cloud banks, stepped
    const cx=10+i*56, cy=6+(i%3)*10, w=44+(i%3)*14;
    for(let k=0;k<4;k++){
      const inset=[0,5,12,22][k], hh=[4,3,3,2][k];
      px(cx+inset,cy+8-k*3,w-inset*2,hh,k?C64.lgy:C64.gry);
    }
    px(cx+6,cy+9,w-12,2,C64.dgy);
  }
  for(let x=0;x<SCENE.w;x++){                             // the ridge behind the town
    const h=Math.round(ROOF-6+5*Math.sin(x/29)+3*Math.sin(x/9));
    px(x,h,1,HORIZON-h,C64.dgy);
  }
}
function storefront(s,sign){
  px(s.x0,s.top,s.x1-s.x0,WALK-s.top,s.wall);
  px(s.x0,s.top,s.x1-s.x0,4,s.trim);                      // the false front's cap
  px(s.x0,s.top+4,2,WALK-s.top-4,s.trim);
  px(s.x1-2,s.top+4,2,WALK-s.top-4,s.trim);
  const w=s.x1-s.x0;
  if(s.storey>1)for(let i=0;i<2;i++){                     // upstairs windows
    const wx=s.x0+8+i*(w-24), wy=s.top+12;
    px(wx,wy,10,12,C64.blk); px(wx+1,wy+1,8,10,hash(wx,wy)%3?C64.blu:C64.yel);
  }
  px(s.x0+4,WALK-26,w-8,4,s.trim);                        // the awning
  const dx=s.x0+Math.round(w/2)-7;
  px(dx,WALK-22,14,22,C64.blk); px(dx+1,WALK-21,12,21,"#1d1508");
  for(const side of [s.x0+5,s.x1-17]){                    // shop windows either side
    if(side<dx-14||side>dx+14){
      px(side,WALK-20,12,14,C64.blk); px(side+1,WALK-19,10,12,C64.dgy);
    }
  }
  if(sign){                                               // the name over the door
    px(s.x0+4,s.top+6,w-8,12,C64.blk);
    ctx.fillStyle=C64.yel; ctx.font="700 8px monospace";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(sign,(s.x0+s.x1)/2,s.top+12);
  }
}
function tree(){
  px(78,WALK-4,6,-40+WALK-(WALK-44),C64.brn);
  px(78,74,6,44,C64.brn);
  for(const [cx,cy,r] of [[81,62,15],[70,70,11],[92,70,11],[81,74,13]]){
    for(let y=-r;y<=r;y++){const half=Math.round(Math.sqrt(Math.max(0,r*r-y*y)));
      px(cx-half,cy+y,half*2,1,(y+cx)%5?C64.grn:C64.lgn);}
  }
}
function street(){
  px(0,HORIZON,SCENE.w,SCENE.h-HORIZON,C64.gry);
  px(0,WALK,SCENE.w,HORIZON-WALK,C64.org);                // the boardwalk
  px(0,HORIZON-2,SCENE.w,2,C64.brn);
  for(let i=0;i<9;i++)px(i*36+4,WALK,3,HORIZON-WALK,C64.brn);
  for(let i=0;i<90;i++){                                  // stones and ruts in the dirt
    const x=(hash(i,3)%SCENE.w), y=HORIZON+2+(hash(i,7)%(SCENE.h-HORIZON-4));
    px(x,y,1+(hash(i,11)%3),1,(i%3)?C64.lgy:C64.dgy);
  }
  for(let i=0;i<5;i++)px(20+i*62,HORIZON+14+i*9,46+i*10,2,C64.dgy);
}
function propAt(kind){
  if(kind==="loco"){
    px(252,58,58,18,C64.dgy);                             // the cab
    px(248,76,72,46,C64.blk);                             // the boiler
    for(let y=0;y<44;y+=4)px(250,78+y,68,2,C64.dgy);
    for(let y=-22;y<=22;y++){const h=Math.round(Math.sqrt(Math.max(0,484-y*y)));
      px(268-h,100+y,h*2,1,y%3?C64.dgy:C64.gry);}         // the smokebox door
    px(276,92,16,16,C64.blk); px(280,96,8,8,C64.lgy);
    px(258,36,14,24,C64.dgy); px(254,32,22,6,C64.dgy);    // the stack
    px(244,122,76,10,C64.blk);                            // the cowcatcher
    for(let i=0;i<8;i++)px(248+i*9,132,4,14,C64.dgy);
    for(let i=0;i<7;i++)px(236+i*12,158+i*6,SCENE.w,3,C64.brn);  // the rails running out
  } else if(kind==="coach"){
    px(250,70,66,44,C64.brn); px(250,70,66,5,C64.dgy);
    px(258,78,18,16,C64.blk); px(284,78,18,16,C64.blk);
    px(260,80,14,12,C64.yel); px(286,80,14,12,C64.yel);
    px(246,112,74,6,C64.dgy);
    for(const [cx,r] of [[266,20],[306,24]]){             // wheels, spoked
      for(let y=-r;y<=r;y++){const h=Math.round(Math.sqrt(Math.max(0,r*r-y*y)));
        px(cx-h,128+y,h*2,1,C64.brn);}
      for(let y=-r+4;y<=r-4;y++){const h=Math.round(Math.sqrt(Math.max(0,(r-4)*(r-4)-y*y)));
        px(cx-h,128+y,h*2,1,C64.gry);}
      for(let a=0;a<8;a++){const dx=Math.cos(a*0.785),dy=Math.sin(a*0.785);
        for(let t=0;t<r-3;t++)px(cx+dx*t,128+dy*t,2,2,C64.dgy);}
    }
  } else if(kind==="barrels"){
    for(const [bx,by,bw,bh] of [[252,110,26,40],[286,120,28,46],[258,150,30,34]]){
      px(bx,by,bw,bh,C64.org);
      px(bx,by,bw,4,C64.brn); px(bx,by+bh-5,bw,5,C64.brn);
      px(bx+2,by+Math.round(bh/2),bw-4,3,C64.brn);
    }
    px(246,166,74,10,C64.brn);
  } else if(kind==="crates"){
    for(const [bx,by,bw,bh] of [[248,118,40,34],[292,130,28,28],[256,152,44,38]]){
      px(bx,by,bw,bh,C64.brn); px(bx+2,by+2,bw-4,bh-4,C64.org);
      px(bx+2,by+Math.round(bh/2)-1,bw-4,2,C64.brn);
    }
  } else {                                                // a corral fence, in perspective
    for(let i=0;i<4;i++)px(244+i*24,118+i*10,8,70-i*6,C64.brn);
    for(let k=0;k<3;k++)for(let i=0;i<3;i++)
      px(244+i*24,126+i*10+k*16,26,5,C64.org);
  }
}
function town(now,armed){
  sky();
  const enc=who(G), place=(enc&&enc.place)||"GOLD GULCH";
  street();
  for(const s of STORES)storefront(s,s.signs?place:null);
  tree();
  // people on the boardwalk, who do not stay for gunplay
  if(!armed)for(const p of PEOPLE){
    px(p.x,WALK-p.h,p.w,p.h,C64.dgy); px(p.x,WALK-p.h,p.w,2,C64.blk);
  }
  propAt(PROPS[place]||"crates");
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
  const b=beat(), live=build.rows>=10;
  if(G.phase==="summary"){return paintSummary();}
  if(G.phase==="intro"){
    lineEls[0].textContent="LAW OF THE WEST — GOLD GULCH";
    lineEls[0].className="npc";
    lineEls[1].textContent="1. Pin on the badge";
    lineEls[1].className="choice sel";
    lineEls[2].textContent=CAST.length+" callers, one day, and a gun you may draw at any of it.";
    lineEls[2].className="choice dim";
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
