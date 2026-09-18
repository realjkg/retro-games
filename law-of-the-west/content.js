/* ============ content ============
 * An original recreation of the 1985 game's structure, not a port and not a
 * copy: eleven callers over one day, in the documented order, each a tree of
 * three exchanges with one visitor line and four replies at every node. Every
 * word here is newly written; no dialogue, artwork or music of the original is
 * reproduced.
 *
 * A node is either a round - {npc, replies:[4]} - or a terminal in `ends`.
 * A reply carries exactly one of:
 *   next    another round node, one exchange deeper (three at most)
 *   end     a terminal in this encounter's `ends`
 *   action  "draw"      he goes for it now
 *           "ambush"    he was never going to talk
 *           "delayed"   he walks, then turns and fires
 *           "surrender" hands up, arrest available
 *           "depart"    he leaves, and that is that
 * Drawing your own gun is always available and is not a menu line.
 *
 * A terminal emits flags the day counts: tip_train, tip_stage, tip_bank, date,
 * arrest, surrender, depart, offended, doctor_civil, doctor_insulted.
 */
const LIMITS={NPC:150,REPLY:92,ROUNDS:3,REPLIES:4};
const FLAGS=["tip_train","tip_stage","tip_bank","date","arrest","surrender",
  "depart","offended","doctor_civil","doctor_insulted","warned_bank"];

const CAST=[
 /* 1 ---------------------------------------------------------------- */
 {id:"stranger", name:"A Stranger", place:"STREET", theme:"stranger",
  armed:true, arrive:["wagon","crowd"],
  rounds:{
   opening:{npc:"You'd be the new sheriff. Folks said you were younger than the last one. They didn't say much else.",
    replies:[
     {text:"\"Newer, anyway. What brings you to Gold Gulch?\"", next:"cordial"},
     {text:"\"They talk. You listen. What have you heard?\"", next:"business"},
     {text:"\"You've been looking up this street a while, mister.\"", next:"wary"},
     {text:"\"State your business or move along.\"", next:"prickly"}]},
   cordial:{npc:"Passing through. I came up on the westbound and I'd as soon not go back down on it.",
    replies:[
     {text:"\"Trouble on the line?\"", next:"train"},
     {text:"\"Room at the hotel, if you're staying.\"", end:"peaceful"},
     {text:"\"What's wrong with the westbound?\"", next:"train"},
     {text:"\"Then buy a horse and stop loitering.\"", end:"offended"}]},
   business:{npc:"I heard a sheriff here lasted eleven days. I heard some other things I'd want a reason to repeat.",
    replies:[
     {text:"\"The reason is the badge. Say it plain.\"", next:"train"},
     {text:"\"I'll take it kindly, and remember who told me.\"", next:"train"},
     {text:"\"Then keep them. I've enough to do.\"", end:"peaceful"},
     {text:"\"Repeat them now or in a cell.\"", end:"offended"}]},
   wary:{npc:"A man can look at a street. There's no law against standing still that I know of.",
    replies:[
     {text:"\"None at all. Stand somewhere I can see you.\"", end:"peaceful"},
     {text:"\"There's none. There's a law about what you're not saying.\"", next:"train"},
     {text:"\"Empty your coat pockets for me.\"", end:"offended"},
     {text:"\"Move.\"", end:"offended"}]},
   prickly:{npc:"You've a hard way with a stranger who's done nothing. That's how the last one started, I'd guess.",
    replies:[
     {text:"\"You're right. Start again — what did you hear?\"", next:"train"},
     {text:"\"The last one is why I'm careful.\"", end:"peaceful"},
     {text:"\"Done nothing yet. I'm early, that's all.\"", action:"delayed"},
     {text:"\"Then we'll see how you finish.\"", action:"draw"}]},
   train:{npc:"…There's men meaning to take the westbound where it slows at the cut. Payroll car. That's all I know and it's more than I should say.",
    replies:[
     {text:"\"Much obliged. Nobody hears it from me.\"", end:"tip"},
     {text:"\"Names.\"", end:"tip_hard"},
     {text:"\"Why tell me at all?\"", end:"tip"},
     {text:"\"If you're in it, say so now.\"", action:"delayed"}]}},
  ends:{
   tip:{text:"He tells it once, quietly, and is gone up the street before you have thanked him twice.",
        flags:["tip_train","depart"], authority:1},
   tip_hard:{text:"He gives you the cut, the hour and no names at all, and makes it clear that is the whole of it.",
        flags:["tip_train"], authority:0},
   peaceful:{text:"He touches his hat and goes on up the boardwalk, and the street closes behind him.",
        flags:["depart"], authority:0},
   offended:{text:"He looks at you the way a man looks at weather, and walks away without another word.",
        flags:["depart","offended"], authority:-1}}},

 /* 2 ---------------------------------------------------------------- */
 {id:"rose", name:"Miss Rose", place:"SALOON", theme:"rose",
  armed:false, arrive:["piano","bottle"],
  rounds:{
   opening:{npc:"Well. The badge came in for a drink at last. Sit where I can see you, Sheriff — it's the only view worth having.",
    replies:[
     {text:"\"Coffee, if the pot's honest.\"", next:"easy"},
     {text:"\"Who's been drinking here that shouldn't be?\"", next:"askers"},
     {text:"\"You see everyone who comes through that door.\"", next:"askers"},
     {text:"\"I'm working, Miss Rose.\"", next:"cool"}]},
   easy:{npc:"Honest as anything in this town. Sit long enough and the room will tell you things it wouldn't tell a stranger.",
    replies:[
     {text:"\"Then I'll sit. What's the room saying?\"", next:"stage"},
     {text:"\"You could tell me quicker.\"", next:"stage"},
     {text:"\"I'd rather hear what you think.\"", next:"warm"},
     {text:"\"I haven't the afternoon.\"", end:"ordinary"}]},
   askers:{npc:"Two men, three nights, one table. They asked what day the coach runs heavy. I told them I pour whiskey, not timetables.",
    replies:[
     {text:"\"Did they take that for an answer?\"", next:"stage"},
     {text:"\"You told them right. What else?\"", next:"stage"},
     {text:"\"Describe them.\"", next:"stage"},
     {text:"\"And you waited until now to mention it?\"", end:"ordinary"}]},
   cool:{npc:"Everybody's working. I've been working since five and I'll be working when you're asleep with your boots on.",
    replies:[
     {text:"\"Fair. Start again — sit with me a minute.\"", next:"warm"},
     {text:"\"Then work, and tell me what you've seen.\"", next:"stage"},
     {text:"\"I'll come back when there's less noise.\"", end:"ordinary"},
     {text:"\"Mind your tone with the law.\"", end:"cold"}]},
   warm:{npc:"You're better company than the badge suggested. There's a supper at the hotel Saturday, and nobody has asked me to it.",
    replies:[
     {text:"\"Then nobody has any sense. Saturday.\"", end:"date"},
     {text:"\"Saturday, if the town lets me.\"", end:"date"},
     {text:"\"Ask me again when the streets are quiet.\"", end:"ordinary"},
     {text:"\"I don't keep company in this town.\"", end:"cold"}]},
   stage:{npc:"Thursday's coach carries the mine's money. They knew that before they asked. Whoever told them drinks here too.",
    replies:[
     {text:"\"Thursday. I'm obliged to you.\"", end:"tip"},
     {text:"\"Point him out when he comes in.\"", end:"tip"},
     {text:"\"Anything else about Thursday?\"", end:"tip"},
     {text:"\"Keep your voice down and keep pouring.\"", end:"ordinary"}]}},
  ends:{
   tip:{text:"She wipes the bar where it is already clean, and says Thursday once more, quietly, in case you missed it.",
        flags:["tip_stage"], authority:1},
   date:{text:"\"Saturday,\" she says, and goes back down the bar with the particular walk of a woman who has won something.",
        flags:["date"], authority:1},
   ordinary:{text:"She nods, unsurprised, and the saloon closes over the conversation like water.",
        flags:["depart"], authority:0},
   cold:{text:"She turns to the next man at the bar and does not turn back.",
        flags:["depart","offended"], authority:-1}}},

 /* 3 ---------------------------------------------------------------- */
 {id:"kid", name:"The Mexicali Kid", place:"STREET", theme:"kid",
  armed:true, arrive:["hooves","spurs"],
  rounds:{
   opening:{npc:"They're offering four hundred dollars for me two counties over, Sheriff. I came to see what you'd offer.",
    replies:[
     {text:"\"A cell, three meals, and a judge in the spring.\"", next:"terms"},
     {text:"\"Four hundred says somebody wants you badly.\"", next:"talk"},
     {text:"\"Take your hand away from your belt first.\"", next:"belt"},
     {text:"\"I'll offer what you're standing on.\"", action:"draw"}]},
   terms:{npc:"A judge. In the spring. And between now and the spring I'd be in that little room of yours with the one window.",
    replies:[
     {text:"\"It's a poor room. It's better than the alternative.\"", next:"yield"},
     {text:"\"You'd be alive in it.\"", next:"yield"},
     {text:"\"Walk in on your own and I'll say so to the judge.\"", next:"yield"},
     {text:"\"Or you can try the street. Your choice.\"", action:"draw"}]},
   talk:{npc:"Wanting and having are two horses, Sheriff. Nobody has ever had me.",
    replies:[
     {text:"\"There's a first day for everything.\"", next:"yield"},
     {text:"\"Then ride on before somebody tries.\"", next:"leave"},
     {text:"\"Four hundred buys a lot of men willing to try.\"", next:"leave"},
     {text:"\"Today's the day, Kid.\"", action:"draw"}]},
   belt:{npc:"My hand is where my hand lives. You're the one who keeps looking at it.",
    replies:[
     {text:"\"Then we'll both look somewhere else.\"", next:"leave"},
     {text:"\"Move it, slowly, and we'll talk about the spring.\"", next:"yield"},
     {text:"\"You came a long way to be careful.\"", next:"leave"},
     {text:"\"Move it or use it.\"", action:"draw"}]},
   leave:{npc:"Ride on. That's the first sensible thing said to me in this county.",
    replies:[
     {text:"\"Then take it and go.\"", action:"depart"},
     {text:"\"Go south. Don't come back through here.\"", action:"depart"},
     {text:"\"Go — but the four hundred rides with you.\"", action:"delayed"},
     {text:"\"You'll go in irons or not at all.\"", action:"draw"}]},
   yield:{npc:"…The spring, then. On your word, Sheriff, and your word had better be worth the ride.",
    replies:[
     {text:"\"It is. Hands where I can see them.\"", action:"surrender"},
     {text:"\"You have it. Walk ahead of me.\"", action:"surrender"},
     {text:"\"My word, and the judge's mercy after.\"", action:"surrender"},
     {text:"\"My word is a cell. Nothing after it.\"", action:"draw"}]}},
  ends:{}},

 /* 4 ---------------------------------------------------------------- */
 {id:"doctor", name:"The Doctor", place:"DOCTOR", theme:"doctor",
  armed:false, arrive:["crowd"], doctor:true,
  rounds:{
   opening:{npc:"Sheriff. I dug a ball out of a freighter's shoulder at four this morning and I'd like to know whether I'll be doing it again tonight.",
    replies:[
     {text:"\"Not if the day goes the way I mean it to.\"", next:"civil"},
     {text:"\"You hear things in that surgery. What have you heard?\"", next:"listen"},
     {text:"\"That depends on who walks up this street.\"", next:"civil"},
     {text:"\"Doctors bury opinions with the patients, Doc.\"", next:"sour"}]},
   civil:{npc:"Then we understand each other. I've no objection to the law. I object to sewing up what it leaves behind.",
    replies:[
     {text:"\"So do I. I'd rather arrest than shoot.\"", next:"listen"},
     {text:"\"Keep your kit ready anyway.\"", next:"listen"},
     {text:"\"You'd rather I let men walk?\"", end:"grudging"},
     {text:"\"Stick to your trade and I'll keep to mine.\"", end:"insulted"}]},
   listen:{npc:"A man under laudanum says what he wouldn't say sober. One of them said a good deal about the bank's back wall.",
    replies:[
     {text:"\"Go on. I'll keep his name out of it.\"", end:"bank"},
     {text:"\"When was this?\"", end:"bank"},
     {text:"\"That's worth knowing. Thank you.\"", end:"bank"},
     {text:"\"You should have come to me at four this morning.\"", end:"grudging"}]},
   sour:{npc:"My trade is what's left of men like you when the day is over. I'd remember that, if I were the one wearing the star.",
    replies:[
     {text:"\"You're right, and I'm sorry for it. Say your piece.\"", next:"listen"},
     {text:"\"I'll remember. I'd still take a warning if you have one.\"", next:"listen"},
     {text:"\"Remember it yourself. I've a street to walk.\"", end:"insulted"},
     {text:"\"Keep your sermon for the ones who don't make it.\"", end:"insulted"}]}},
  ends:{
   bank:{text:"He tells you the hour and the wall, and then goes back inside to boil his instruments, which is his way of ending a conversation.",
         flags:["tip_bank","doctor_civil"], authority:1},
   grudging:{text:"\"At four this morning I had my hands inside a man,\" he says, and shuts the door. He will still come if you are shot, but he will not hurry.",
         flags:["tip_bank"], authority:0},
   insulted:{text:"\"Then don't send for me,\" he says, loud enough for the street. Several people hear him say it.",
         flags:["doctor_insulted","offended"], authority:-1}}},

 /* 5-11: the rest of the day, not yet written ------------------------ */
 {id:"shotgun", name:"The Shotgun Owner", place:"STREET", theme:"shotgun",
  armed:true, arrive:["spurs","crowd"], rounds:{}, ends:{}},
 {id:"willie", name:"Little Willie", place:"STREET", theme:"willie",
  armed:false, arrive:["crowd"], rounds:{}, ends:{}},
 {id:"april", name:"Miss April", place:"SCHOOL", theme:"april",
  armed:false, arrive:["crowd"], rounds:{}, ends:{}},
 {id:"gambler", name:"The Gambler", place:"SALOON", theme:"gambler",
  armed:true, arrive:["piano","crowd"], rounds:{}, ends:{}},
 {id:"deputy", name:"The Deputy", place:"JAIL", theme:"deputy",
  armed:true, arrive:["hooves"], rounds:{}, ends:{}},
 {id:"belle", name:"Belle", place:"CORRAL", theme:"belle",
  armed:true, arrive:["hooves"], rounds:{}, ends:{}},
 {id:"lastgun", name:"The Last Gunfighter", place:"STREET", theme:"lastgun",
  armed:true, arrive:["spurs"], forcedDuel:true, rounds:{}, ends:{}}
];
const written=e=>!!(e.rounds&&e.rounds.opening);

/* ============ the pixel grid ============
 * A 320x200 logical screen, drawn at one scene pixel per unit and scaled with
 * nearest-neighbour. The sheriff stands in the left foreground, seen from
 * behind; the visitor stands deeper in the street.
 */
const SCENE={w:320,h:200};
const CELL=2;                            // fine enough for one-pixel contours
const FIG={cx:196,ground:150};           // the visitor, up the street and right of centre
const SPR={w:16,h:26};
const SPRX=FIG.cx-(SPR.w/2)*CELL;
const SPRY=FIG.ground-SPR.h*CELL;
const cellsBox=(c0,r0,c1,r1)=>({x:SPRX+c0*CELL,y:SPRY+r0*CELL,
  w:(c1-c0+1)*CELL,h:(r1-r0+1)*CELL});
const HITBOX={
  lethal:      cellsBox(4,5,11,18),
  weapon:      cellsBox(0,17,3,20),
  weaponRaised:cellsBox(0,11,3,14)
};
