#!/usr/bin/env node
/* Play the whole thing, badly, for a few thousand turns, and say what happened.
 *
 * It walks the sewers at random, fights whatever turns up by attacking the
 * nearest group, goes back to town to heal when it is nearly dead, and levels
 * up when it can. What it is checking is that the game survives being played:
 * no throw, no state it cannot get out of, and a party that can actually get
 * deeper rather than one that is stuck on level one for ever.
 *
 *   PW=$PWD/../node_modules/playwright-core node tools/playthrough.js [turns]
 */
'use strict';
const path=require('path'),fs=require('fs');
const pw=require(process.env.PW||'playwright-core');
const TURNS=+(process.argv[2]||3000);

(async()=>{
  const CAND=[process.env.CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium'].filter(Boolean);
  const exe=CAND.find(p=>{try{return fs.existsSync(p);}catch(e){return false;}});
  const b=await pw.chromium.launch(exe?{executablePath:exe}:{});
  const pg=await b.newPage({viewport:{width:540,height:980}});
  const errs=[];
  pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto('file://'+path.join(__dirname,'..','index.html'));
  const out=await pg.evaluate(TURNS=>{
    newGame();
    [['Brann','dwarf','warrior'],['Tarna','human','paladin'],['Rook','hobbit','rogue'],
     ['Mab','elf','bard'],['Orrin','gnome','magician'],['Ysolde','halfelf','conjurer']]
    .forEach(function(s){
      var st=rollStats(s[1]);
      STATS.forEach(function(k){var n=CLASSES[s[2]].req[k]||0;if(st[k]<n)st[k]=n;});
      var pc=mkChar(s[0],s[1],s[2],st);starterKit(pc);P.roster.push(pc);
    });
    hideOverlay();
    P.gold=2000;
    /* a player would spend the starting purse before going down, so this does */
    P.roster.forEach(function(pc){
      ['plate','chain','leather','shield','buckler','helm','broadsw','mace','shortsw']
        .forEach(function(id){
          if(P.gold>=ITEMS[id].cost&&canUse(pc,id)){P.gold-=ITEMS[id].cost;pc.pack.push(id);}
        });
      pc.pack.push('potion');equipBest(pc);
    });
    P.depth=1;P.x=LEVELS[1].up[0];P.y=LEVELS[1].up[1];P.dir=1;P.light=500;
    const seen={1:0,2:0,3:0},tally={fights:0,wins:0,levels:0,deaths:0,deepest:1,longest:0,boss:false};
    let turns=0;
    while(turns++<TURNS){
      if(wipedOut())break;
      if(P.fight){
        tally.fights++;
        let guard=0;
        while(P.fight&&guard++<80){
          const f=P.fight;
          if(f.round>tally.longest)tally.longest=f.round;
          if(f.boss)tally.boss=true;
          if(f.who>=P.roster.length){resolveRound();continue;}
          const pc=P.roster[f.who];
          if(!pc||!alive(pc)){f.who++;continue;}
          const gi=f.groups.findIndex(groupAlive);
          if(gi<0){resolveRound();continue;}
          /* the bard opens, the casters throw what they have, everyone else
             swings: a party that only ever attacks is not this game */
          const spells=knownSpells(pc).filter(function(sp){
            return (sp.where==='fight'||sp.where==='any')&&pc.sp>=sp.sp&&
                   (sp.fx==='dmg'||sp.fx==='group');});
          const heals=knownSpells(pc).filter(function(sp){
            return sp.fx==='heal'&&pc.sp>=sp.sp;});
          const worst=living().slice().sort(function(a,b){
            return a.hp/a.maxhp-b.hp/b.maxhp;})[0];
          if(heals.length&&worst&&worst.hp<worst.maxhp*0.4)
            setOrder({k:'cast',sp:heals[0],ally:worst});
          else if(pc.cls==='bard'&&pc.flask>0&&f.round===1)setOrder({k:'sing',song:0});
          else if(spells.length&&pc.sp>spells[0].sp)
            setOrder({k:'cast',sp:spells[spells.length-1],g:gi});
          else setOrder({k:'attack',g:gi});
        }
        if(!P.fight)tally.wins++;
        closeFightbar();hideOverlay();
        continue;
      }
      /* keep the light going and the party upright */
      if(P.depth>0&&P.light<10)P.light=400;
      /* A trip back to the Temple, at the Temple's prices. Resting is free and
         puts the spell points back; everything else is paid for, in order, for
         as far as the purse goes. */
      const hurt=P.roster.filter(p=>alive(p)&&p.hp<p.maxhp*0.6).length;
      const down=P.roster.filter(p=>p.status==='dead').length;
      if(hurt>=2||down>0||living().length<=4){
        tally.town=(tally.town||0)+1;
        P.roster.forEach(function(p){
          if(p.status==='dead'){
            const c=TEMPLE.dead*p.lvl;
            if(P.gold>=c){P.gold-=c;p.status='ok';p.hp=p.maxhp;}
          }else if(p.status==='poisoned'&&P.gold>=TEMPLE.poison){
            P.gold-=TEMPLE.poison;p.status='ok';
          }else if(p.hp<p.maxhp){
            const c=TEMPLE.wound*(p.maxhp-p.hp);
            if(P.gold>=c){P.gold-=c;p.hp=p.maxhp;}
          }
          if(p.maxsp)p.sp=p.maxsp;
          if(p.cls==='bard')p.flask=6;
        });
      }
      P.roster.forEach(p=>{
        while(p.xp>=nextXp(p)&&p.status!=='dead'){levelUp(p);tally.levels++;}
      });
      /* walk: forward if you can, otherwise turn */
      /* Do not go down until the party could plausibly survive it: a player
         who dives to level two at character level two dies there, and so
         does this. */
      const avg=P.roster.reduce((a,p)=>a+p.lvl,0)/P.roster.length;
      const ready=avg>=P.depth*3+3;
      const t=tileAt(P.depth,P.x,P.y);
      if(t==='>'&&P.depth<3&&ready){
        P.depth++;P.x=LEVELS[P.depth].up[0];P.y=LEVELS[P.depth].up[1];
        tally.deepest=Math.max(tally.deepest,P.depth);
        continue;
      }
      seen[P.depth]=(seen[P.depth]||0)+1;
      /* Head for the way down. A random walk wanders a twenty-one square maze
         for three thousand turns without finding an exit a hundred steps away,
         and then the run tells you nothing about levels two and three. */
      /* when it is not ready to go down it walks between the stairs and the
         far corner, which is what grinding looks like from the outside */
      const tgt=ready?LEVELS[P.depth].down:(turns%400<200?LEVELS[P.depth].up:LEVELS[P.depth].down);
      const grid=[];
      for(let yy=0;yy<SIZE;yy++){const row=[];
        for(let xx=0;xx<SIZE;xx++)row.push(solid(P.depth,xx,yy)?'#':'.');grid.push(row);}
      const dist=reach(grid,tgt[0],tgt[1]);
      let bestDir=-1,bestD=dist[P.y][P.x];
      for(let k=0;k<4;k++){
        const nx=P.x+DIRS[k][0],ny=P.y+DIRS[k][1];
        if(solid(P.depth,nx,ny))continue;
        if(dist[ny][nx]>=0&&dist[ny][nx]<bestD){bestD=dist[ny][nx];bestDir=k;}
      }
      if(bestDir<0){turn(Math.random()<0.5?1:-1);}
      else if(P.dir!==bestDir){
        const cw=(bestDir-P.dir+4)%4;
        turn(cw===3?-1:1);
      }else step();
      /* Standing on a stair opens the stair menu, and a menu that is up stops
         the game dead — which is right when a person is playing and wrong for
         a robot. Shut it and carry on. */
      if(overlayUp())hideOverlay();
    }
    tally.deaths=P.roster.filter(p=>p.status==='dead').length;
    return{turns,tally,seen,depth:P.depth,gold:P.gold,madgod:P.flag.madgod,
      tail:logLines.slice(-14).map(function(l){return l.text;}),
      levels:P.roster.map(p=>p.name+' '+CLASSES[p.cls].name+' '+p.lvl),
      alive:living().length,wiped:wipedOut()};
  },TURNS);
  console.log('turns played   ',out.turns);
  console.log('fights         ',out.tally.fights,'  won',out.tally.wins);
  console.log('levels gained  ',out.tally.levels);
  console.log('trips to town  ',out.tally.town||0);
  console.log('deepest level  ',out.tally.deepest);
  console.log('longest fight  ',out.tally.longest,'rounds');
  console.log('met the boss   ',out.tally.boss?'yes':'no',out.madgod?'(and killed it)':'');
  console.log('squares walked ',JSON.stringify(out.seen));
  console.log('party          ',out.levels.join(', '));
  console.log('still standing ',out.alive,out.wiped?'(wiped out)':'');
  console.log('last words:');out.tail.forEach(t=>console.log('   '+t));
  const bad=[];
  if(errs.length)bad.push(errs.length+' page errors');
  if(out.tally.deepest<3)bad.push('never reached the bottom of the sewers');
  if(out.tally.wins<10)bad.push('only won '+out.tally.wins+' fights');
  if(out.tally.levels<5)bad.push('barely levelled: '+out.tally.levels);
  if(out.tally.longest>30)bad.push('a fight ran '+out.tally.longest+' rounds');
  if(!out.madgod)bad.push('the Mad God is still down there');
  if(errs.length){console.log('page errors:');errs.forEach(e=>console.log('  '+e));}
  console.log(bad.length?'PROBLEMS: '+bad.join('; '):'the game survived being played');
  await b.close();
  process.exit(bad.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
