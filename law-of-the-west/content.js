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
 *           "trick"     he is cleverer than the sheriff: no bullet and no game
 *                       over, but the day goes on a caller without him
 * Drawing your own gun is always available and is not a menu line.
 *
 * A terminal emits flags the day counts: tip_train, tip_stage, tip_bank, date,
 * arrest, surrender, depart, offended, doctor_civil, doctor_insulted.
 */
const LIMITS={NPC:150,REPLY:92,ROUNDS:3,REPLIES:4};
const FLAGS=["tip_train","tip_stage","tip_bank","date","arrest","surrender",
  "depart","offended","doctor_civil","doctor_insulted","doctor_sober"];

/* The three jobs the day's tips are about. A sheriff who was told is standing
 * in the right place when it happens; a sheriff who was not reads about it. */
const JOBS={
 stage:{id:"stage", name:"The Stage Road", place:"STAGE ROAD", theme:"th_job",
   armed:true, arrive:["wagon"], temper:"hostile", masked:true,
   brief:"The Thursday coach comes down the grade with the mine's money aboard, and two men step out of the rocks above the ford.",
   missed:"They took it at the ford while you were up the street. The driver is alive. Nobody else saw a thing worth telling."},
 train:{id:"train", name:"The Westbound", place:"THE CUT", theme:"th_job",
   armed:true, arrive:["wagon","crowd"], temper:"hostile", masked:true,
   brief:"The westbound comes into the cut at a walking pace, and a man drops off the payroll car's step with his coat open.",
   missed:"The payroll car was opened at the cut and the westbound came in two hours late with nothing in it."},
 bank:{id:"bank", name:"The Bank", place:"BANK", theme:"th_job",
   armed:true, arrive:["crowd"], temper:"hostile", masked:true,
   brief:"The back wall of the bank has a door in it that was not there yesterday, and a man in the alley turns round with his hand already moving.",
   missed:"They went through the back wall while you were at the other end of town, and the flour sack went with them."}
};

const CAST=[
 /* 1 ------------------------------------------------------------- */
 {id:"stranger", name:"A Dude", place:"STREET", theme:"th_stranger",
  armed:true, arrive:["wagon","crowd"], temper:"patient",
  hatline:"The derby goes into the dirt behind him and both hands are up before it lands. “London felt,” he says, to nobody in particular, and does not move again.",
  balk:"He takes his hands out of his coat and holds them where you can see them. “I'll say the rest of it when that is back in the leather.”",
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
     {text:"\"The reason is the badge. Say it plain.\"", next:"train", as:"hard"},
     {text:"\"I'll take it kindly, and remember who told me.\"", next:"train", as:"warm"},
     {text:"\"Then keep them. I've enough to do.\"", end:"peaceful"},
     {text:"\"Repeat them now or in a cell.\"", end:"offended"}]},
   wary:{npc:"A man can look at a street. There's no law against standing still that I know of.",
    replies:[
     {text:"\"None at all. Stand somewhere I can see you.\"", end:"peaceful"},
     {text:"\"There's none. There's a law about what you're not saying.\"", next:"train", as:"hard"},
     {text:"\"Empty your coat pockets for me.\"", end:"offended"},
     {text:"\"Move.\"", end:"offended"}]},
   prickly:{npc:"You've a hard way with a stranger who's done nothing. That's how the last one started, I'd guess.",
    replies:[
     {text:"\"You're right. Start again — what did you hear?\"", next:"train", as:"warm"},
     {text:"\"A derby and a soft hand. Go and see the town.\"", action:"trick"},
     {text:"\"Done nothing yet. I'm early, that's all.\"", action:"delayed"},
     {text:"\"Then we'll see how you finish.\"", action:"draw"}]},
   train:{npc:"…There's men meaning to take the westbound where it slows at the cut. Payroll car. That's all I know and it's more than I should say.",
    npcIf:{hard:"…Plain, then. Men mean to take the westbound where it slows at the cut. Payroll car. That is the whole of it and I want no part of the rest.", warm:"…You asked it like a man and I'll answer it like one. They mean to take the westbound at the cut. Payroll car. You never had it from me."},
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
 /* 2 ------------------------------------------------------------- */
 {id:"rose", name:"Miss Rose", place:"SALOON", theme:"th_rose",
  armed:false, arrive:["piano","bottle"], temper:"coward",
  balk:"She stops with her hand on the bottle and does not pour. \u201cPut that away or take it outside, Sheriff. I can wait all afternoon.\u201d",
  rounds:{
   opening:{npc:"Well. The badge came in for a drink at last. Sit where I can see you, Sheriff — it's the only view worth having.",
    replies:[
     {text:"\"Coffee, if the pot's honest.\"", next:"easy"},
     {text:"\"Who's been drinking here that shouldn't be?\"", next:"askers", as:"hard"},
     {text:"\"You see everyone who comes through that door.\"", next:"askers", as:"warm"},
     {text:"\"I'm working, Miss Rose.\"", next:"cool"}]},
   easy:{npc:"Honest as anything in this town. Sit long enough and the room will tell you things it wouldn't tell a stranger.",
    replies:[
     {text:"\"Then I'll sit. What's the room saying?\"", next:"stage"},
     {text:"\"You could tell me quicker.\"", next:"stage", as:"hard"},
     {text:"\"I'd rather hear what you think.\"", next:"warm", as:"warm"},
     {text:"\"I haven't the afternoon.\"", end:"ordinary"}]},
   askers:{npc:"Two men, three nights, one table. They asked what day the coach runs heavy. I told them I pour whiskey, not timetables.",
    npcIf:{hard:"Two men, three nights, one table \u2014 and no, I'll not give you a name to go and be hard at. They asked what day the coach runs heavy.", warm:"Two men, three nights, one table. They asked what day the coach runs heavy, and I have been waiting three days for somebody to ask me about it."},
    replies:[
     {text:"\"Did they take that for an answer?\"", next:"stage"},
     {text:"\"You told them right. What else?\"", next:"stage", as:"warm"},
     {text:"\"Describe them.\"", next:"stage", as:"hard"},
     {text:"\"And you waited until now to mention it?\"", end:"ordinary"}]},
   cool:{npc:"Everybody's working. I've been working since five and I'll be working when you're asleep with your boots on.",
    replies:[
     {text:"\"Fair. Start again — sit with me a minute.\"", next:"warm"},
     {text:"\"Then work, and tell me what you've seen.\"", next:"stage", as:"hard"},
     {text:"\"I'll come back when there's less noise.\"", end:"ordinary"},
     {text:"\"Mind your tone with the law.\"", end:"cold"}]},
   warm:{npc:"You're better company than the badge suggested. There's a supper at the hotel Saturday, and nobody has asked me to it.",
    npcIf:{warm:"Nobody has asked me what I think in three years of pouring. There's a supper at the hotel Saturday, and nobody has asked me to that either."},
    replies:[
     {text:"\"Then nobody has any sense. Saturday.\"", end:"date"},
     {text:"\"Saturday, if the town lets me.\"", end:"date"},
     {text:"\"Ask me again when the streets are quiet.\"", end:"ordinary"},
     {text:"\"I don't keep company in this town.\"", end:"cold"}]},
   stage:{npc:"Thursday's coach carries the mine's money. They knew that before they asked. Whoever told them drinks here too.",
    npcIf:{hard:"Thursday's coach carries the mine's money. There. You could have had that sitting down, and you'd have had the rest of it too.", warm:"Thursday's coach carries the mine's money. They knew it before they asked, which means somebody at my own bar told them. That is what frightens me."},
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
 /* 3 ------------------------------------------------------------- */
 {id:"kid", name:"The Mexicali Kid", place:"STREET", theme:"th_kid",
  armed:true, arrive:["hooves","spurs"], temper:"hostile",
  hatline:"The brim spins off him and he does not turn to watch it go. Whatever he rode up this street to be offered, he has stopped wanting it.",
  balk:"He goes very still, and his hands go nowhere at all. Whatever he rode in to say, he is not saying it down a barrel.",
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
     {text:"\"You'd be alive in it.\"", next:"yield", as:"warm"},
     {text:"\"Walk in on your own and I'll say so to the judge.\"", next:"yield", as:"warm"},
     {text:"\"Or you can try the street. Your choice.\"", action:"draw"}]},
   talk:{npc:"Wanting and having are two horses, Sheriff. Nobody has ever had me.",
    replies:[
     {text:"\"There's a first day for everything.\"", next:"yield"},
     {text:"\"Then ride on before somebody tries.\"", next:"leave", as:"hard"},
     {text:"\"Four hundred buys a lot of men willing to try.\"", next:"leave", as:"sly"},
     {text:"\"Today's the day, Kid.\"", action:"draw"}]},
   belt:{npc:"My hand is where my hand lives. You're the one who keeps looking at it.",
    replies:[
     {text:"\"Then we'll both look somewhere else.\"", next:"leave"},
     {text:"\"Move it, slowly, and we'll talk about the spring.\"", next:"yield", as:"hard"},
     {text:"\"You came a long way to be careful.\"", next:"leave", as:"sly"},
     {text:"\"Move it or use it.\"", action:"draw"}]},
   leave:{npc:"Ride on. That's the first sensible thing said to me in this county.",
    npcIf:{hard:"Ride on. You've a way of giving a man no room, Sheriff. One day somebody will take it back off you.", sly:"Ride on. You've been counting my chances out loud this whole while, and I'd sooner leave than hear the total."},
    replies:[
     {text:"\"Then take it and go.\"", action:"depart"},
     {text:"\"Go south. Don't come back through here.\"", action:"depart"},
     {text:"\"Go — but the four hundred rides with you.\"", action:"delayed"},
     {text:"\"You'll go in irons or not at all.\"", action:"draw"}]},
   yield:{npc:"…The spring, then. On your word, Sheriff, and your word had better be worth the ride.",
    npcIf:{warm:"…The spring, then. You did not have to say it that way, and you did. I'll hold you to your word, Sheriff, and I'll be there.", hard:"…The spring. Not because you told me to. Because I've counted what's between us and I don't like the sum."},
    replies:[
     {text:"\"It is. Hands where I can see them.\"", action:"surrender"},
     {text:"\"You have it. Walk ahead of me.\"", action:"surrender"},
     {text:"\"My word, and the judge's mercy after.\"", action:"surrender"},
     {text:"\"My word is a cell. Nothing after it.\"", action:"draw"}]}},
  ends:{}},
 /* 4 ------------------------------------------------------------- */
 {id:"doctor", name:"The Doctor", place:"DOCTOR", theme:"th_doctor",
  armed:false, arrive:["crowd"], doctor:true, roots:["opening","opening_drunk"], temper:"patient",
  hatline:"The derby comes off and he does not flinch, or duck, or put his hands anywhere. He picks it up, looks at the hole in it, and then looks at you.",
  balk:"He folds his arms. \u201cI have sewn up four men who opened a conversation that way. Put it up and I will talk to you.\u201d",
  rounds:{
   /* Which of the two he opens with is settled at dawn, not by the player. */
   opening_drunk:{npc:"Sheriff. I have had a night of it and a bottle after the night, and I am ashamed of neither. Ask me what you like, but ask it slowly.",
    replies:[
     {text:"\"Then sit down and take the coffee instead.\"", next:"coffee", as:"warm"},
     {text:"\"Slowly, then. What have you heard this week?\"", next:"listen", as:"warm"},
     {text:"\"You're the only doctor in sixty miles, Doc.\"", next:"coffee"},
     {text:"\"A drunk doctor is no doctor at all.\"", next:"sour", as:"hard"}]},
   coffee:{npc:"…The pot is on the stove and it is yesterday's. You would have to pour it yourself and stand over me while I drank it, and you have a street to walk.",
    npcIf:{warm:"…The pot is on the stove and it is yesterday's. Sit down anyway. Nobody has sat down in this room since the last sheriff, and he was carried."},
    replies:[
     {text:"\"The street will keep. Drink it.\"", end:"sobered"},
     {text:"\"I'll pour, and stand here till it's gone.\"", end:"sobered"},
     {text:"\"Drink it or don't. I've said my piece.\"", end:"still_drinking"},
     {text:"\"Sleep it off. Try to be useful by dark.\"", end:"insulted"}]},
   opening:{npc:"Sheriff. I dug a ball out of a freighter's shoulder at four this morning and I'd like to know whether I'll be doing it again tonight.",
    replies:[
     {text:"\"Not if the day goes the way I mean it to.\"", next:"civil", as:"warm"},
     {text:"\"You hear things in that surgery. What have you heard?\"", next:"listen"},
     {text:"\"That depends on who walks up this street.\"", next:"civil"},
     {text:"\"Doctors bury opinions with the patients, Doc.\"", next:"sour", as:"hard"}]},
   civil:{npc:"Then we understand each other. I've no objection to the law. I object to sewing up what it leaves behind.",
    npcIf:{warm:"Then we understand each other, and that is more than I had at breakfast. I've no objection to the law. I object to sewing up what it leaves."},
    replies:[
     {text:"\"So do I. I'd rather arrest than shoot.\"", next:"listen"},
     {text:"\"Keep your kit ready anyway.\"", next:"listen", as:"hard"},
     {text:"\"You'd rather I let men walk?\"", end:"grudging"},
     {text:"\"Stick to your trade and I'll keep to mine.\"", end:"insulted"}]},
   listen:{npc:"A man under laudanum says what he wouldn't say sober. One of them said a good deal about the bank's back wall.",
    npcIf:{warm:"A man under laudanum says what he wouldn't say sober. Since you asked it civil: one of them said a good deal about the bank's back wall.", hard:"A man under laudanum says what he wouldn't say sober. The bank's back wall. Now go and be hard at somebody who has earned it."},
    replies:[
     {text:"\"Go on. I'll keep his name out of it.\"", end:"bank"},
     {text:"\"When was this?\"", end:"bank"},
     {text:"\"That's worth knowing. Thank you.\"", end:"bank"},
     {text:"\"You should have come to me at four this morning.\"", end:"grudging"}]},
   sour:{npc:"My trade is what's left of men like you when the day is over. I'd remember that, if I were the one wearing the star.",
    npcIf:{hard:"My trade is what's left of men like you when the day is over, and you have just told me what kind of day it is going to be."},
    replies:[
     {text:"\"You're right, and I'm sorry for it. Say your piece.\"", next:"listen", as:"warm"},
     {text:"\"I'll remember. I'd still take a warning if you have one.\"", next:"listen"},
     {text:"\"Remember it yourself. I've a street to walk.\"", end:"insulted"},
     {text:"\"Keep your sermon for the ones who don't make it.\"", end:"insulted"}]}},
  ends:{
   bank:{text:"He tells you the hour and the wall, and then goes back inside to boil his instruments, which is his way of ending a conversation.",
         flags:["tip_bank","doctor_civil"], authority:1},
   grudging:{text:"\"At four this morning I had my hands inside a man,\" he says, and shuts the door. He will still come if you are shot, but he will not hurry.",
         flags:["tip_bank"], authority:0},
   insulted:{text:"\"Then don't send for me,\" he says, loud enough for the street. Several people hear him say it.",
         flags:["doctor_insulted","offended"], authority:-1},
   sobered:{text:"He drinks it scalding, twice, and by the second cup his hands have stopped and he is looking at you like a man again.",
         flags:["doctor_sober","doctor_civil"], authority:1},
   still_drinking:{text:"He puts the cork back in the bottle and sets it where he can reach it, which is the whole of his answer.",
         flags:[], authority:0}}},
 /* 5 ------------------------------------------------------------- */
 {id:"shotgun", name:"Dude with a New Gun", place:"STREET", theme:"th_shotgun",
  armed:true, arrive:["spurs","crowd"], temper:"hostile",
  hatline:"The hat goes into the road and the new gun comes level, and the showing of it is over.",
  balk:"He lets the new gun hang and says nothing more about it. Whatever he came up the street to show you, the showing is over.",
  rounds:{
   opening:{npc:"Look at it, Sheriff. Forty dollars in Kansas City and it come out of the crate oiled. You'll not see another like it this side of the river.",
    npcIf:{hard:"I heard what you did up the street. I'm keeping hold of this one and you can say what you like about it.", kind:"They say you've been fair with folks this morning. Forty dollars, this. You can look at it, but I'm holding it."},
    replies:[
     {text:"\"That's a handsome piece of work. Mind the hammer.\"", next:"admire"},
     {text:"\"Forty dollars is a deal of money for a man to be carrying.\"", next:"money"},
     {text:"\"Put it back in the leather while we talk.\"", next:"order"},
     {text:"\"A new gun and an old habit. Which one brought you here?\"", next:"probe"}]},
   admire:{npc:"You know guns, then. Most men see a gun and see trouble coming. I see forty dollars of Kansas City work and a thing that fits my hand.",
    replies:[
     {text:"\"I see both. Keep it pointed at the dirt.\"", next:"intent"},
     {text:"\"Where does a man your age come by forty dollars?\"", next:"intent", as:"sly"},
     {text:"\"Show me how it sits in the holster.\"", end:"holstered"},
     {text:"\"Sell it before somebody makes you use it.\"", next:"proud"}]},
   money:{npc:"I had a piece of work up in Ellsworth. Honest, most of it. The part that wasn't is not written down anywhere a man could go and read it.",
    replies:[
     {text:"\"Then we'll leave it unwritten. Mind how you go.\"", end:"holstered"},
     {text:"\"Tell me the part that wasn't.\"", next:"intent"},
     {text:"\"Nothing stays unwritten. Hand me the gun.\"", next:"proud", as:"hard"},
     {text:"\"Ellsworth. I'll wire them tonight.\"", action:"delayed"}]},
   order:{npc:"It's in my hand because it's mine. You'd be the first man in this town to tell me where to keep my own property, and I've been here a week.",
    replies:[
     {text:"\"Then hold it and listen. Nobody's taking it.\"", next:"intent", as:"warm"},
     {text:"\"I'll be the first and the last. Holster it.\"", next:"proud", as:"hard"},
     {text:"\"Your property. My street.\"", next:"proud"},
     {text:"\"Holster it or lose the hand.\"", action:"draw"}]},
   probe:{npc:"Habits. Every man's got habits. Mine is shooting bottles off the corral rail of an evening, and there is no law in this territory about bottles.",
    replies:[
     {text:"\"There isn't. Shoot bottles and we'll stay friends.\"", end:"holstered"},
     {text:"\"Bottles don't cost forty dollars. What does?\"", next:"intent"},
     {text:"\"There's a law about what comes after bottles.\"", next:"intent", as:"hard"},
     {text:"\"Shoot one now and I'll show you the law.\"", action:"ambush"}]},
   proud:{npc:"You've a way of speaking to a man that gets a town a new sheriff every spring. I'll put it away when I am done looking at it and not before.",
    npcIf:{hard:"You've a way of speaking to a man that gets a town a new sheriff every spring. I'll put it away when I'm done looking at it and not before."},
    replies:[
     {text:"\"Look at it, then. I'll wait.\"", end:"holstered"},
     {text:"\"Last spring's sheriff. What became of him?\"", end:"warned"},
     {text:"\"You're done. Set it on the rail.\"", action:"surrender"},
     {text:"\"You'll put it away now or in the dust.\"", action:"draw"}]},
   intent:{npc:"…All right. A man at the livery says the bank's takings go out Friday in a flour sack. I only wanted to know if a sheriff would be watching.",
    npcIf:{warm:"…All right. A man at the livery says the bank's takings go out Friday in a flour sack. You're the first to talk to me like I'm grown.", sly:"…You're quick. All right. A man at the livery says the bank's takings go out Friday in a flour sack. I only wanted to know who'd be watching."},
    replies:[
     {text:"\"Now I am. Set the gun down and walk to the jail.\"", action:"surrender"},
     {text:"\"Who is the man at the livery?\"", end:"tip"},
     {text:"\"You've told me. Go home and stay there.\"", end:"warned"},
     {text:"\"You wanted to know. Now you do.\"", action:"draw"}]}},
  ends:{
   holstered:{text:"He turns it over once more, the way a man does with a thing he has paid too much for, and puts it away.",
        flags:["depart"], authority:1},
   tip:{text:"He gives the name at the livery and the day with it, and looks like a man who has set down something heavy.",
        flags:["tip_bank","depart"], authority:1},
   warned:{text:"He goes, and not toward the livery, and the new gun stays in the leather the whole length of the street.",
        flags:["depart"], authority:0}}},
 /* 6 ------------------------------------------------------------- */
 {id:"willie", name:"Little Willy", place:"STREET", theme:"th_willie",
  armed:false, arrive:["crowd"], temper:"coward",
  hatline:"The cap goes into the road and the boy goes down after it with both arms over his head. He is nine years old and he never had a gun on him.",
  balk:"The boy's mouth shuts and stays shut. He is looking at the gun and at nothing else in the street.",
  rounds:{
   opening:{npc:"Sheriff! I ain't supposed to be up this end of town and I ain't supposed to tell you neither, so you can't say it was me that said it.",
    npcIf:{hard:"…Ma says to stay off the street when you're on it today. I come anyway. I know a thing and I ain't decided about telling it.", kind:"Everybody's saying you listen. I been stood here a while waiting to find out, and I know a thing nobody else does."},
    replies:[
     {text:"\"Nobody hears it from me, Willy. Sit on the rail.\"", next:"kind"},
     {text:"\"What's it worth, then? I've a nickel says a nickel.\"", next:"deal"},
     {text:"\"Say it quick, then. I've a street to walk.\"", next:"brisk"},
     {text:"\"If you've done something, say so now.\"", next:"stern"}]},
   kind:{npc:"You're the only one calls me Willy instead of boy. Ma says a sheriff's got no time for boys. You've got some, though, ain't you.",
    replies:[
     {text:"\"As much as this takes. Go on.\"", next:"secret"},
     {text:"\"I've time for anybody who saw something.\"", next:"secret", as:"warm"},
     {text:"\"Not much of it. What did you see?\"", next:"clam"},
     {text:"\"Then don't waste it. Out with it.\"", next:"clam", as:"hard"}]},
   deal:{npc:"A nickel! Mister Hanley gives a nickel for sweeping out the whole store. A secret's got to be worth more than sweeping a store.",
    replies:[
     {text:"\"It is. Tell it and we'll settle after.\"", next:"secret"},
     {text:"\"Two bits if it's true and if it's mine first.\"", next:"secret", as:"sly"},
     {text:"\"You don't sell what you know to the law, Willy.\"", next:"clam"},
     {text:"\"I don't buy from boys. Go home.\"", end:"sent"}]},
   brisk:{npc:"I can say it fast. I only want to know first whether I'm saying it to the sheriff or to the man who drinks coffee with my ma of a Sunday.",
    replies:[
     {text:"\"To the sheriff. Your ma hears nothing.\"", next:"secret"},
     {text:"\"To both, and neither of them tells.\"", next:"secret"},
     {text:"\"To the sheriff. That's the only one here today.\"", next:"clam"},
     {text:"\"You're saying it to a man in a hurry.\"", next:"clam", as:"hard"}]},
   stern:{npc:"I ain't done nothing! I only saw a thing. Seeing ain't doing. Ma says seeing ain't doing and she says it about you as well.",
    replies:[
     {text:"\"Your ma's right and I'm sorry. What did you see?\"", next:"secret", as:"warm"},
     {text:"\"Seeing isn't doing. Telling isn't either. Go on.\"", next:"secret"},
     {text:"\"Then seeing is what I want. Quickly.\"", next:"clam"},
     {text:"\"Boys who see things get shot at. Home.\"", end:"scared"}]},
   secret:{npc:"Two men been out back of the bank with a rope, measuring along the wall. They gave me a nickel not to say and I already spent it on liquorice.",
    npcIf:{warm:"Two men been out back of the bank with a rope, measuring along the wall. I been wanting to tell somebody all day and nobody'd stop walking.", sly:"Two men been out back of the bank with a rope, measuring the wall. They give me a nickel not to say, so I reckon yours is owing now."},
    replies:[
     {text:"\"Then it's paid for already. You did right, Willy.\"", end:"tip"},
     {text:"\"Measuring with a rope. What day was that?\"", end:"tip"},
     {text:"\"You keep the liquorice. I'll keep the rope.\"", end:"tip"},
     {text:"\"You took their money? Get home.\"", end:"scared"}]},
   clam:{npc:"…No. I promised. A promise is a promise even when it's a bad one, Ma says. Ask me something else and I'll answer that.",
    npcIf:{hard:"…No. You can't hurry a promise out of a person. Ask me something else and I'll answer that one quick as you like."},
    replies:[
     {text:"\"Then keep it. That's a fair thing to do.\"", end:"kept"},
     {text:"\"Come and find me when it stops being a promise.\"", end:"kept"},
     {text:"\"Promises don't hold against the law, son.\"", end:"kept"},
     {text:"\"You'll say it now or say it in the jail.\"", end:"scared"}]}},
  ends:{
   tip:{text:"He tells it in one breath and then again slower, in case the first time was too fast, and runs for the corner before you can thank him.",
        flags:["tip_bank","depart"], authority:1},
   kept:{text:"He goes off up the boardwalk with it still in him, walking slowly, hoping the whole way to be called back.",
        flags:["depart"], authority:0},
   sent:{text:"He shrugs the way a boy shrugs when he has decided not to mind, and goes back down toward the store.",
        flags:["depart"], authority:0},
   scared:{text:"He runs. Two women outside the milliner's watch him go, and then look at you for rather a long time.",
        flags:["depart","offended"], authority:-1}}},
 /* 7 ------------------------------------------------------------- */
 {id:"april", name:"Miss April", place:"SCHOOL", theme:"th_april",
  armed:false, arrive:["crowd"], temper:"coward",
  hatline:"The bonnet comes off her and she is down in the dirt with her arms over her head, in front of the schoolhouse, in front of the window full of children.",
  balk:"She steps back into the schoolhouse doorway. \u201cNot one word, Sheriff, until that is back where it belongs.\u201d",
  rounds:{
   opening:{npc:"Sheriff. The children have been at the window all morning saying the new sheriff would be shot before dinner. I told them that was not arithmetic.",
    npcIf:{hard:"The children watched you from that window this morning. I would rather they had been doing arithmetic. Say what you came to say.", kind:"The children have been telling me about you all morning, and for once it was worth hearing. Come in out of the sun."},
    replies:[
     {text:"\"Nor is it manners. What are they learning instead?\"", next:"warm"},
     {text:"\"They may be better at it than arithmetic. What have they seen?\"", next:"seen"},
     {text:"\"Keep them at the window. They see more than I do.\"", next:"seen", as:"warm"},
     {text:"\"Then teach them to mind their own business.\"", next:"cool"}]},
   warm:{npc:"Long division, and not gracefully. It is a quiet post. A woman may go a month here without being asked a single question worth answering.",
    replies:[
     {text:"\"Then ask me one. I'll try to be worth it.\"", next:"supper"},
     {text:"\"I'll ask you one a day if it helps.\"", next:"supper", as:"warm"},
     {text:"\"Ask the window, then. What does it show?\"", next:"window"},
     {text:"\"Quiet is what I'm paid for, ma'am.\"", end:"ordinary"}]},
   seen:{npc:"The schoolhouse looks down the grade to where the westbound slows. The children count the cars. Lately they have been counting men instead.",
    npcIf:{warm:"The schoolhouse looks down the grade to where the westbound slows. Say that again where they can hear it \u2014 they've been counting men."},
    replies:[
     {text:"\"Men. Where, and how many?\"", next:"window"},
     {text:"\"Children count better than deputies. Go on.\"", next:"window", as:"warm"},
     {text:"\"Keep them counting. I'll come back at four.\"", next:"supper"},
     {text:"\"Children imagine. Don't bring me imagining.\"", end:"alienated"}]},
   cool:{npc:"I have taught in three towns, Sheriff, and been told to mind my business in every one of them. It has never once been good advice.",
    replies:[
     {text:"\"It wasn't this time either. I'm sorry — go on.\"", next:"window"},
     {text:"\"Then give me yours instead of minding it.\"", next:"window", as:"hard"},
     {text:"\"In this town it is the only advice I have.\"", end:"ordinary"},
     {text:"\"Three towns, and not one of them kept you.\"", end:"alienated"}]},
   supper:{npc:"There is a supper at the hotel on Saturday. I have been asked twice already by men I do not care for, and I am running out of ways to say no.",
    npcIf:{warm:"There is a supper at the hotel on Saturday. I have been asked twice by men I do not care for, and now once by a man I might."},
    replies:[
     {text:"\"Then say yes to one you haven't met properly.\"", end:"date"},
     {text:"\"Say no again and let me ask you on Sunday.\"", end:"date"},
     {text:"\"I'd take you, if the town lets me. It may not.\"", end:"date"},
     {text:"\"I'd stay clear of hotel suppers this week.\"", end:"ordinary"}]},
   window:{npc:"Four men, three mornings, at the cut where the grade slows the westbound. They were not counting cars. One of them had a rifle rolled in a blanket.",
    npcIf:{warm:"Four men, three mornings, at the cut where the grade slows the westbound. I have told nobody, because nobody asked it kindly enough to be told.", hard:"Four men, three mornings, at the cut. One had a rifle rolled in a blanket. I'd rather you heard it than kept that tone for somebody else."},
    replies:[
     {text:"\"At the cut. That's a day's work you've done.\"", end:"tip"},
     {text:"\"Keep the children inside tomorrow morning.\"", end:"tip"},
     {text:"\"A rifle in a blanket. Anything else?\"", end:"tip"},
     {text:"\"Four men and a blanket is not evidence.\"", end:"alienated"}]}},
  ends:{
   tip:{text:"She writes the hour on a slate in a clear hand, turns it round for you to read, and wipes it off again with her sleeve.",
        flags:["tip_train"], authority:1},
   date:{text:"\"Saturday,\" she says, and goes back in to the long division with something in her step that was not there before.",
        flags:["date"], authority:1},
   ordinary:{text:"She closes the schoolhouse door quietly, which somehow says a great deal more than slamming it would have.",
        flags:["depart"], authority:0},
   alienated:{text:"\"Good day, Sheriff,\" she says, in the voice she keeps for boys who have not done the work.",
        flags:["depart","offended"], authority:-1}}},
 /* 8 ------------------------------------------------------------- */
 {id:"gambler", name:"The Gambler", place:"SALOON", theme:"th_gambler",
  armed:true, arrive:["piano","crowd"], temper:"patient",
  hatline:"The topper turns over twice and lands crown-down in the road. He looks at it, then at you, and puts his hands up without any hurry at all.",
  balk:"He sets the deck down square on the rail and folds his hands on it. “I'll wait. I am a patient man about most things, Sheriff.”",
  rounds:{
   opening:{npc:"Sheriff. Sit in. Four hands teaches a man more about a town than a year of asking questions, and I have learned that nobody here can bluff.",
    npcIf:{hard:"The whole room saw you coming up the street. Sit down, Sheriff, and let us find out what it is you want with me.", kind:"They speak well of you at this table, which is rarer than a straight flush. Will you sit, or is this the standing sort of talk?"},
    replies:[
     {text:"\"I don't play. I'll watch a hand.\"", next:"watch"},
     {text:"\"Show me the deck you've been learning with.\"", next:"deck"},
     {text:"\"Stand up and turn out your sleeves.\"", next:"sleeves"},
     {text:"\"You've cleaned out two freighters this week. Out.\"", next:"hard"}]},
   watch:{npc:"Watch, then. It is an honest game with honest men and I have had honest luck for eleven nights running, which is a thing that happens.",
    replies:[
     {text:"\"Eleven nights is a deal of luck for one man.\"", next:"caught"},
     {text:"\"Deal one hand face up and I'll believe you.\"", next:"caught", as:"sly"},
     {text:"\"Enjoy the twelfth somewhere else.\"", next:"leave"},
     {text:"\"Luck like that gets a man buried, not rich.\"", next:"leave"}]},
   deck:{npc:"It is the house's deck. Ask the man behind the bar. I have not carried my own cards since Natchez, and Natchez was a misunderstanding.",
    replies:[
     {text:"\"Natchez. Tell me about the misunderstanding.\"", next:"caught"},
     {text:"\"Then you'll not mind me cutting it.\"", next:"caught", as:"sly"},
     {text:"\"That's a long way to come for a misunderstanding.\"", next:"leave"},
     {text:"\"Hand it here, house deck or not.\"", next:"caught", as:"hard"}]},
   sleeves:{npc:"…I will stand. I will not turn out anything in front of six men who owe me money. You can see the difficulty in it, Sheriff.",
    replies:[
     {text:"\"Then step outside and turn them out there.\"", next:"caught"},
     {text:"\"I can. Outside, or here in front of all of them.\"", next:"caught"},
     {text:"\"I see six men who'd like their money back.\"", next:"leave"},
     {text:"\"Turn them out or I'll turn them out for you.\"", action:"draw"}]},
   hard:{npc:"Two freighters who could not count. That is not cheating, that is arithmetic, and there is no statute against arithmetic in this territory.",
    replies:[
     {text:"\"There's one against what's up your left cuff.\"", next:"caught", as:"hard"},
     {text:"\"Give them back their wages and we're square.\"", next:"leave", as:"warm"},
     {text:"\"There's a statute about me. Move.\"", next:"leave", as:"hard"},
     {text:"\"Then we'll settle it without one.\"", action:"draw"}]},
   caught:{npc:"…A holdout clip. Well. Eleven good nights. What is it precisely that you would like me to do about it now, Sheriff?",
    npcIf:{sly:"…A holdout clip, and a sheriff who saw it before I did. Eleven good nights. What is it you would like me to do about it now?", hard:"…A holdout clip. Well. You have not left me a great deal of room, have you. Eleven good nights and a man in a hurry to end them."},
    replies:[
     {text:"\"Set it on the table and walk to the jail.\"", action:"surrender"},
     {text:"\"Pay the freighters back, then the jail.\"", action:"surrender"},
     {text:"\"Leave the money and leave the territory.\"", action:"depart"},
     {text:"\"Nothing. I want the whole room to see it.\"", action:"delayed"}]},
   leave:{npc:"Then I shall finish this hand and be on the noon coach. You will not see me again and you will not miss me by Thursday.",
    npcIf:{hard:"Then I shall finish this hand and go. You have a fine flat way of saying a thing, Sheriff. I hope it serves you as long as it served me.", warm:"The wages, then, and the noon coach. You could have had me in a cell and you asked for their money instead. I'll remember which it was."},
    replies:[
     {text:"\"Finish the hand, then. I'll wait on the boardwalk.\"", action:"trick"},
     {text:"\"Leave the hand. Take the coach.\"", action:"depart"},
     {text:"\"The coach — and the freighters' wages on the bar.\"", end:"repaid"},
     {text:"\"You'll go when I say and not before.\"", action:"delayed"}]}},
  ends:{
   repaid:{text:"He counts it out without hurrying, touches his hat to the room, and is on the boardwalk before the deck has been shuffled.",
        flags:["depart"], authority:1}}},
 /* 9 ------------------------------------------------------------- */
 {id:"deputy", name:"The Deputy", place:"JAIL", theme:"th_deputy",
  deputy:true, armed:true, arrive:["hooves"], temper:"patient",
  hatline:"Your own deputy's hat is in the road and your own deputy has his hands up in the middle of the street, in front of everybody who can see the jail door.",
  balk:"He puts both hands up about level with his ears. \u201cThat is a fine way to greet a man on your own side. I'll wait.\u201d",
  rounds:{
   opening:{npc:"Sheriff! There's men at the bank. There was. I run the whole way from the corner and now I ain't certain what I saw, but I'm certain I saw it.",
    npcIf:{hard:"…Sheriff. Before you start on me — I know. I heard about the street. I've something, and I'd as soon say it and go.", kind:"Sheriff! They're saying you had a good morning of it. I've got something, and this time I think it's a real one."},
    replies:[
     {text:"\"Slow down. Tell it in the order it happened.\"", next:"order"},
     {text:"\"How many, and were they mounted?\"", next:"count"},
     {text:"\"You're certain or you're not. Which is it?\"", next:"press"},
     {text:"\"You've been certain twice this week already.\"", next:"sting"}]},
   order:{npc:"I come round by the assay office and there was two horses stood at the bank's back wall with nobody holding them. Horses don't stand like that.",
    replies:[
     {text:"\"No, they don't. Go on — what else?\"", next:"confirm"},
     {text:"\"Two horses. Anything in the alley?\"", next:"confirm"},
     {text:"\"Horses stand where they're tied, Deputy.\"", next:"doubt"},
     {text:"\"You ran all this way to tell me about horses.\"", next:"doubt", as:"hard"}]},
   count:{npc:"Two. Maybe three. Mounted — no, stood, and one up on the boardwalk in a coat that was wrong for the weather we're having.",
    replies:[
     {text:"\"A coat wrong for the weather is worth the run.\"", next:"confirm"},
     {text:"\"Three men and a heavy coat. Where's your gun?\"", next:"confirm"},
     {text:"\"Two, maybe three. That is not a report.\"", next:"doubt"},
     {text:"\"Come back when the number stops moving.\"", next:"doubt", as:"hard"}]},
   press:{npc:"…Certain. I am certain. I'd not have run if I wasn't and I'd not be stood here letting you look at me like that either.",
    replies:[
     {text:"\"Then I'm certain too. Get the shotgun.\"", next:"confirm", as:"warm"},
     {text:"\"Good man. Tell me the rest as we walk.\"", next:"confirm", as:"warm"},
     {text:"\"You've been certain about a deal of things.\"", next:"doubt"},
     {text:"\"Looking at you is all I've done. Try being right.\"", next:"doubt", as:"hard"}]},
   sting:{npc:"Twice, and both times you went and both times it was nothing, and you have not let me forget either of them. This one is not nothing.",
    replies:[
     {text:"\"Then this is the one that counts. Show me.\"", next:"confirm"},
     {text:"\"You're right. I've been hard on you. Go on.\"", next:"confirm", as:"warm"},
     {text:"\"Third time pays for all, they say. Prove it.\"", next:"doubt"},
     {text:"\"Three for three, then. Sit down, Deputy.\"", next:"doubt"}]},
   confirm:{npc:"Back wall, two horses, and the coat. If you want me at the front I'll take the front, and if you want me nowhere I'll take that too.",
    npcIf:{warm:"Back wall, two horses, and the coat. Nobody's said 'good man' to me since I pinned this on. I'll take the front, or nowhere, whichever you want."},
    replies:[
     {text:"\"Take the front. I'll come round the back.\"", end:"ready"},
     {text:"\"You've done well. Get the shotgun and follow.\"", end:"ready"},
     {text:"\"Nowhere. Stay here and mind the jail.\"", end:"alone"},
     {text:"\"You'll take the back, and you'll go first.\"", end:"pushed"}]},
   doubt:{npc:"…All right. All right, Sheriff. Maybe it was horses. I'll go back by the corner and look again, and I'll not run this time.",
    npcIf:{hard:"…All right. All right, Sheriff. You needn't say it twice. I'll go back by the corner and look again, and I'll not run this time."},
    replies:[
     {text:"\"Look again. Come straight to me either way.\"", end:"ready"},
     {text:"\"No. We'll both look, and we'll look now.\"", end:"ready"},
     {text:"\"Do that. And Deputy — walk, don't run.\"", end:"dismissed"},
     {text:"\"Don't trouble. Mind the jail and let me work.\"", end:"dismissed"}]}},
  ends:{
   ready:{text:"He is out of the door before you are, and for once in the day you are following a man who knows where he is going.",
        flags:["tip_bank"], authority:1},
   alone:{text:"He takes the keys and the chair by the stove, and does not look up when you go out.",
        flags:["tip_bank"], authority:0},
   pushed:{text:"He goes where he is sent, white about the mouth, and the men on the boardwalk watch him being sent.",
        flags:["tip_bank","offended"], authority:-1},
   dismissed:{text:"He hangs his hat back on the nail and says nothing at all, which from him is a great deal.",
        flags:["depart"], authority:-1}}},
 /* 10 ------------------------------------------------------------ */
 {id:"belle", name:"Belle", place:"CORRAL", theme:"th_belle",
  armed:true, arrive:["hooves"], temper:"hostile",
  hatline:"The hat goes off her and she does not go after it, and she does not take her eyes off you while it falls.",
  balk:"She looks at the gun, and then at you, and says nothing. Whatever she came about, it will keep until you put it up.",
  rounds:{
   opening:{npc:"You'll be wanting the two steers with the Bar-K burn on them. They're in my corral and I'll not pretend they walked in there by themselves.",
    npcIf:{hard:"I've heard what kind of day you're having. Go on, then. Say the thing you came out here to say to me.", kind:"You'll be the one they say hears a person out. That'd be a change on this road. Ask me, then, and I'll answer it."},
    replies:[
     {text:"\"You'll not pretend. That's a start. Why are they there?\"", next:"why"},
     {text:"\"Then they can walk out again, and you with them.\"", next:"out"},
     {text:"\"Whose iron did the second burn, Belle?\"", next:"iron"},
     {text:"\"Two steers is a rope in this territory.\"", next:"rope"}]},
   why:{npc:"Because Kinch at the Bar-K runs his stock over my water and calls it open range. I took two. He has taken my water for three years running.",
    replies:[
     {text:"\"Three years is a grievance, not a defence.\"", next:"square"},
     {text:"\"Then we'll take it to the judge, water and all.\"", next:"square", as:"hard"},
     {text:"\"Drive them back tonight and I'll speak for you.\"", next:"turn", as:"warm"},
     {text:"\"He'll get the judge and you'll get the rope.\"", next:"square", as:"hard"}]},
   out:{npc:"They can. I'll walk them back myself at first light and Kinch can count them twice. It is what I meant to do before you came up the hill.",
    replies:[
     {text:"\"Then I'll ride out and watch him count.\"", next:"turn"},
     {text:"\"First light. I'll be here at first light.\"", next:"turn"},
     {text:"\"You'll walk them back now, and I'll follow.\"", next:"square"},
     {text:"\"You meant nothing of the kind.\"", next:"square", as:"hard"}]},
   iron:{npc:"Mine. I burned it over his and I made a poor job of it, which you can see from where you are stood, and I did not much care that you could.",
    replies:[
     {text:"\"A poor job and an honest answer. Sit down.\"", next:"turn", as:"warm"},
     {text:"\"You cared, or you'd not have said it that way.\"", next:"turn"},
     {text:"\"Then come down to the jail and say it again.\"", next:"square"},
     {text:"\"Careless and a thief. Hands where I see them.\"", next:"square", as:"hard"}]},
   rope:{npc:"It is. It's a rope for a man as well. You'll notice nobody has hung Kinch over the water, and nobody in this county is going to.",
    replies:[
     {text:"\"Nobody's hanging anybody today. Talk to me.\"", next:"turn", as:"warm"},
     {text:"\"Then let me be the first to ask him about it.\"", next:"turn"},
     {text:"\"Kinch isn't stood in front of me. You are.\"", next:"square"},
     {text:"\"Keep talking and we'll see about the rope.\"", action:"draw"}]},
   square:{npc:"…So it's the jail. Say it straight out, Sheriff, and let me fetch my coat. I would rather that than be talked round to it by degrees.",
    npcIf:{hard:"…So it's the jail, and you've been walking me to it since you opened your mouth. Let me fetch my coat and have done."},
    replies:[
     {text:"\"It's the jail, and I'll speak to the judge for you.\"", action:"surrender"},
     {text:"\"Fetch it. The water goes in the record too.\"", action:"surrender"},
     {text:"\"No jail. Drive them back and we never spoke.\"", action:"depart"},
     {text:"\"Fetch your coat, and be quick about it.\"", action:"delayed"}]},
   turn:{npc:"You are the first man off that road in three years to say a thing to me that was not about cattle. There is a dance at the grange on Saturday.",
    npcIf:{warm:"You are the first man off that road in three years to say a thing to me that was not about cattle. There's a dance at the grange Saturday."},
    replies:[
     {text:"\"Then I'll come up the road again Saturday.\"", end:"date"},
     {text:"\"Saturday, and I'll not mention cattle once.\"", end:"date"},
     {text:"\"Drive them back first. Then ask me again.\"", end:"steers"},
     {text:"\"I came about the steers, Belle. Only the steers.\"", end:"steers"}]}},
  ends:{
   date:{text:"She whistles the dog off the gate and walks you as far as the road, which is further than she has walked anybody in three years.",
        flags:["date"], authority:1},
   steers:{text:"She drives them back at first light, Kinch counts them twice, and she does not look at you once the whole way down.",
        flags:["depart"], authority:1}}},
 /* 11 ------------------------------------------------------------ */
 {id:"lastgun", name:"The Last Gunfighter", place:"STREET", theme:"th_lastgun",
  armed:true, arrive:["spurs"], forcedDuel:true, temper:"hostile",
  hatline:"The hat goes. He has not said one word since noon and he does not start now.",
  standoff:"He has been across the street since noon and has not said one word. The boardwalk has emptied from both ends.",
  rounds:{}, ends:{}}
];
const written=e=>!!(e.rounds&&e.rounds.opening);
/* What a caller does when the gun comes out before he has been answered: he
 * stops talking, and does not start again while it is out. */
/* What the street sees when a hat comes off. A masked man's goes with it. */
const HAT_UNMASKED="The Stetson goes, and it takes the bandana down with it. He is standing in the daylight with his face out in front of the whole street, and then he is running.";
const HAT_LINE="The hat turns over twice and lands in the road, and whoever was wearing it has stopped doing anything else at all.";
const BALK_LINE="He is looking at the gun in your hand and not at you, and he has stopped talking.";

/* ============ the pixel grid ============
 * A 320x200 logical screen, presented in 4:3 the way a C64 was. The sheriff
 * stands in the left foreground, seen from behind and drawn in the largest
 * blocks on the screen; the visitor stands deeper in the street, smaller and
 * finer. The hitboxes are read off the visitor's own grid, so what the
 * crosshair is over is what the bullet finds, for every one of them.
 */
const SCENE={w:320,h:200};
const CELL=2;                            // the block the street furniture is built on

/* ============ the twelve figures ============
 * These are not twelve drawings. They are one draughtsman.
 *
 * They used to be twelve hand-cut grids, twenty-four cells across, and at that
 * size a man is a torso-shaped blob with two dots on it: no neck, no sleeve, no
 * hand, no lapel, and whatever anatomy each grid happened to get on the day it
 * was cut. Standing beside the sheriff - who is a painting - they read as a
 * different game, which is exactly the complaint.
 *
 * So every caller is now laid out on one skeleton, forty-eight cells across and
 * eighty-four down, one cell to the screen pixel: the same head on the same
 * neck on the same shoulders, the same sleeve hung from the same joint, the
 * same belt, the same boots. What differs between them is what the parts are
 * made of and how they are cut - a frock coat's tails, a skirt's flare, a
 * child's proportions, a bonnet instead of a Stetson - which is what tells one
 * caller from another at this distance anyway. One draughtsman means one
 * standard; nobody is drawn worse than anybody else.
 *
 * The letters say only what a part is made of. The light, the rounding and the
 * dithered tone steps are worked out per pixel when it is painted.
 *   . nothing  H hat   R hair  F face  E eye     C coat   K coat shadow
 *   W linen    L legs and skirts       A skin    G gunmetal
 *   B dark (belts, boots, bags)        S star    P prop (bag, slate, cards, rope)
 *
 * 48 by 84 is not a taste either: the horizon is at 118 and a caller's boots
 * are at 150, the sheriff's are at 200, and a man the sheriff's size standing
 * that much nearer the horizon comes out 0.39 of him. His own drawing is 129 by
 * 200, so the caller is 50 by 78, and 48 by 84 is the nearest round figure. */
const SPR={w:48,h:84}, FIGCW=1, FIGCH=1, FIGCELL=FIGCW;

/* ---- the skeleton, in rows and widths, at full height ---- */
const BONE={
  crown:0, brim:6, brimEnd:8, faceTop:4, eye:10, faceBot:16,
  neck:16, shoulder:19, chest:26, waist:43, beltEnd:47, hip:52,
  thigh:53, knee:65, ankle:76, ground:83,
  elbow:33, wrist:46, hand:51,
  hatCrown:13, hatBrim:23, faceW:11, neckW:6,
  shoulderW:21, chestW:20, waistW:15, hipW:18,
  upperArm:6, foreArm:5, handW:5, thighW:9, calfW:7, bootW:9
};
const CX=24;                                      // he stands on the middle of it

/* ---- a very small drawing hand ---- */
function figGrid(){const g=[];for(let r=0;r<SPR.h;r++)g.push(new Array(SPR.w).fill("."));return g;}
function figPut(g,x,y,ch){x=Math.round(x);y=Math.round(y);
  if(y>=0&&y<SPR.h&&x>=0&&x<SPR.w)g[y][x]=ch;}
function figSpan(g,y,cx,w,ch){
  if(w<=0)return;
  const a=Math.round(cx-w/2), b=Math.round(cx+w/2)-1;
  for(let x=a;x<=b;x++)figPut(g,x,y,ch);
}
/* A limb, a torso or a skirt: both the width and the centre travel down it. */
function figTaper(g,y0,y1,cx0,w0,cx1,w1,ch){
  y0=Math.round(y0); y1=Math.round(y1);
  for(let y=y0;y<=y1;y++){
    const t=(y1===y0)?0:(y-y0)/(y1-y0);
    figSpan(g,y,cx0+(cx1-cx0)*t,w0+(w1-w0)*t,ch);
  }
}
function figDisc(g,cx,cy,rx,ry,ch){
  for(let y=Math.round(cy-ry);y<=Math.round(cy+ry);y++)
    for(let x=Math.round(cx-rx);x<=Math.round(cx+rx);x++){
      const u=(x-cx)/rx, v=(y-cy)/ry;
      if(u*u+v*v<=1.02)figPut(g,x,y,ch);
    }
}
/* A seam of coat-shadow laid down the join between a sleeve and the body, and
 * round a hem. Without it a sleeve and the chest it hangs against are one run
 * of one colour and the light models them as one barrel. */
function figSeam(g,x,y0,y1,ch){for(let y=Math.round(y0);y<=Math.round(y1);y++)
  if(g[y]&&g[y][Math.round(x)]&&g[y][Math.round(x)]!==".")figPut(g,x,y,ch);}

/* ---- the builder ---- *
 * Every landmark row is measured up from the ground, so shortening a figure
 * keeps his boots on the street; widths take their own scale, because a boy is
 * not a small man - his head is nearly a man's on a much smaller frame. */
function figLayout(S){
  const hs=S.tall===undefined?1:S.tall, ws=S.wide===undefined?1:S.wide;
  const hw=S.headWide===undefined?ws:S.headWide;
  const G=BONE.ground;
  const R={}, Wd={};
  for(const k of Object.keys(BONE)){
    if(/W$|^hat|Arm$/.test(k))continue;      // those are widths, not rows
    R[k]=Math.round(G-(G-BONE[k])*hs);
  }
  const head=["hatCrown","hatBrim","faceW","neckW"];
  for(const k of ["hatCrown","hatBrim","faceW","neckW","shoulderW","chestW","waistW",
                  "hipW","upperArm","foreArm","handW","thighW","calfW","bootW"])
    Wd[k]=BONE[k]*(head.indexOf(k)>=0?hw:ws);
  // The arm hangs outside the chest, not inside it: a sleeve buried in the
  // torso is what made him a slab with a head on it.
  const armX=(Wd.chestW/2+Wd.upperArm/2-1.5);
  return {R:R, Wd:Wd, armX:armX, elbowX:armX+1, wristX:armX+0.5,
          gunSide:-1, holsterX:CX-(Wd.waistW/2+2.5)};
}
function buildFigure(S,pose){
  const P=figLayout(S), R=P.R, Wd=P.Wd;
  const g=figGrid();
  const dress=S.coat==="dress";
  const gunSide=P.gunSide;                // his gun hand is the one nearest us
  const armX=P.armX, elbowX=P.elbowX, wristX=P.wristX;

  /* legs, or a skirt over them */
  if(dress){
    figTaper(g,R.waist,R.ankle+4,CX,Wd.hipW,CX,Wd.hipW*1.75,"L");
    figTaper(g,R.ankle+5,R.ground,CX-Wd.thighW*0.45,Wd.bootW*0.8,
             CX-Wd.thighW*0.45,Wd.bootW*0.8,"B");
    figTaper(g,R.ankle+5,R.ground,CX+Wd.thighW*0.45,Wd.bootW*0.8,
             CX+Wd.thighW*0.45,Wd.bootW*0.8,"B");
  }else{
    for(const s of [-1,1]){
      const hipC=CX+s*Wd.thighW*0.52, ankC=CX+s*Wd.thighW*0.58;
      figTaper(g,R.hip,R.knee,hipC,Wd.thighW,ankC,Wd.calfW+1,"L");
      figTaper(g,R.knee+1,R.ankle,ankC,Wd.calfW+1,ankC,Wd.calfW,"L");
      figTaper(g,R.ankle+1,R.ground,ankC,Wd.bootW*0.85,ankC+s*1.2,Wd.bootW,"B");
    }
  }
  /* the body: shoulders down to the waist, then the coat's own cut */
  const bodyBot=dress?R.waist:(S.coat==="frock"?R.hip+10:R.hip+2);
  // shoulders slope off the neck; they do not start at their full width
  figTaper(g,R.shoulder,R.shoulder+4,CX,Wd.neckW+4,CX,Wd.shoulderW,"C");
  figTaper(g,R.shoulder+5,R.chest,CX,Wd.shoulderW,CX,Wd.chestW,"C");
  figTaper(g,R.chest+1,R.waist,CX,Wd.chestW,CX,Wd.waistW,"C");
  if(!dress)figTaper(g,R.waist+1,bodyBot,CX,Wd.waistW,CX,Wd.hipW,"C");
  if(S.coat==="frock"){                  // the tails, split up the back seam
    figSpan(g,bodyBot,CX,1,".");
    for(let y=R.hip;y<=bodyBot;y++)figPut(g,CX,y,"K");
  }
  /* linen between the lapels, and the lapels themselves */
  // A coat opens on linen in a long V; a bodice closes at the throat on a
  // collar and no more, so the women are not walking about in a man's shirt.
  const vTop=R.shoulder+1;
  const vBot=dress?R.chest-1:R.chest+Math.round((R.waist-R.chest)*0.55);
  const vw0=Wd.neckW*0.55, vw1=dress?Wd.chestW*0.3:Wd.chestW*0.58;
  figTaper(g,vTop,vBot,CX,vw0,CX,vw1,S.linen||"W");
  for(let y=vTop;y<=vBot;y++){                       // the lapels, two cells of them
    const t=(y-vTop)/(vBot-vTop||1), w=(vw0+(vw1-vw0)*t)/2;
    for(const x of [CX-w-1,CX-w-2,CX+w,CX+w+1])
      if(g[y]&&g[y][Math.round(x)]==="C")figPut(g,x,y,"K");
  }
  if(S.coat==="vest"){                   // shirtsleeves: the linen runs the whole torso
    figTaper(g,vBot+1,R.waist,CX,Wd.chestW*0.42,CX,Wd.waistW*0.4,S.linen||"W");
  }
  /* the belt, and what hangs off it */
  if(!dress){
    for(let y=R.waist+1;y<=R.beltEnd;y++)figSpan(g,y,CX,Wd.waistW+1,"B");
  }else{
    for(let y=R.waist-1;y<=R.waist+1;y++)figSpan(g,y,CX,Wd.hipW,"B");
  }
  if(S.gun==="holster"){                   // the holster hangs clear of his hip,
    const hx=P.holsterX;                   // so the gun is its own target
    figTaper(g,R.beltEnd+1,R.beltEnd+9,hx,5,hx-1,5,"B");
    figTaper(g,R.waist,R.beltEnd+2,hx-1,3,hx-1,3,"G");
  }
  /* arms. The near one is the gun arm and it is the one that moves. */
  const raised=pose==="raise", up=pose==="surrender";
  for(const s of [1,-1]){
    const sx=CX+s*armX, ex=CX+s*elbowX, wx=CX+s*wristX;
    const sleeve=(S.coat==="vest")?(S.linen||"W"):"C";
    figDisc(g,sx,R.shoulder+3,Wd.upperArm/2,2,(S.coat==="vest")?(S.linen||"W"):"C");
    if(up||(raised&&s===gunSide)){
      // forearm up: the elbow stays where it is and the hand goes over the hat
      const topY=up?R.crown+(S.tall?2:2):R.chest-2;
      figTaper(g,R.shoulder+2,R.elbow,sx,Wd.upperArm,ex,Wd.upperArm*0.92,sleeve);
      figTaper(g,topY+4,R.elbow,ex,Wd.foreArm,ex,Wd.upperArm*0.92,sleeve);
      figDisc(g,ex,topY+2,Wd.handW/2,Wd.handW/2+0.5,"A");
      // the drawn gun comes out well clear of him: what the crosshair finds
      // there is the weapon, and never the man behind it
      if(raised&&s===gunSide&&S.gun!=="none")
        figTaper(g,topY,topY+3,ex-6,9,ex-7,7,"G");
    }else{
      figTaper(g,R.shoulder+2,R.elbow,sx,Wd.upperArm,ex,Wd.upperArm*0.92,sleeve);
      figTaper(g,R.elbow+1,R.wrist,ex,Wd.foreArm+1,wx,Wd.foreArm,sleeve);
      figDisc(g,wx,R.hand,Wd.handW/2,Wd.handW/2+1,"A");
    }
    figSeam(g,CX+s*(Wd.chestW/2-1),R.shoulder+4,R.waist,"K");
  }
  /* neck, head, hair, hat */
  if(!up)figTaper(g,R.neck-1,R.shoulder,CX,Wd.neckW,CX,Wd.neckW+1,"A");
  figDisc(g,CX,(R.faceTop+R.faceBot)/2,Wd.faceW/2,(R.faceBot-R.faceTop)/2+1,"F");
  if(S.hair==="long"){
    figDisc(g,CX,(R.faceTop+R.faceBot)/2-1,Wd.faceW/2+2,(R.faceBot-R.faceTop)/2+2,"R");
    figTaper(g,R.faceTop+2,R.neck+4,CX,Wd.faceW+4,CX,Wd.faceW+2,"R");
    figDisc(g,CX,(R.faceTop+R.faceBot)/2,Wd.faceW/2,(R.faceBot-R.faceTop)/2+1,"F");
  }else if(S.hair==="short"){
    figDisc(g,CX,R.faceTop+2,Wd.faceW/2+1,3,"R");
  }
  if(S.hat==="stetson"){
    figDisc(g,CX,R.brim-2,Wd.hatCrown/2,(R.brim-R.crown)/2+1,"H");
    figTaper(g,R.brim,R.brimEnd-1,CX,Wd.hatBrim,CX,Wd.hatBrim*0.86,"H");
  }else if(S.hat==="derby"){
    figDisc(g,CX,R.brim-1,Wd.hatCrown/2*0.88,(R.brim-R.crown)/2+1,"H");
    figTaper(g,R.brim,R.brim+1,CX,Wd.hatBrim*0.76,CX,Wd.hatBrim*0.7,"H");
  }else if(S.hat==="cap"){
    figDisc(g,CX,R.brim,Wd.hatCrown/2*0.85,(R.brim-R.crown)/2,"H");
    figSpan(g,R.brim+1,CX-2,Wd.hatBrim*0.5,"H");
  }else if(S.hat==="sombrero"){          // a brim you can see coming up the street
    figDisc(g,CX,R.brim-3,Wd.hatCrown/2*0.82,(R.brim-R.crown)/2+2,"H");
    figTaper(g,R.brim-1,R.brimEnd,CX,Wd.hatBrim*1.34,CX,Wd.hatBrim*1.1,"H");
  }else if(S.hat==="topper"){            // a tall silk hat, and nothing else like it
    figTaper(g,R.crown,R.brim-1,CX,Wd.hatCrown*0.78,CX,Wd.hatCrown*0.82,"H");
    figTaper(g,R.brim,R.brim+1,CX,Wd.hatBrim*0.72,CX,Wd.hatBrim*0.66,"H");
  }else if(S.hat==="bonnet"){
    figDisc(g,CX,R.brim-1,Wd.hatCrown/2+1,(R.brim-R.crown)/2+2,"H");
    figTaper(g,R.brim,R.brim+2,CX,Wd.hatBrim*0.62,CX,Wd.hatBrim*0.5,"H");
  }
  /* eyes: two of them, and they are the only cells named E on that row */
  if(!0){
    const ey=R.eye, ex=Math.max(2,Math.round(Wd.faceW*0.22));
    for(const s of [-1,1])for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)
      if(g[ey+dy]&&g[ey+dy][CX+s*ex+dx-(s<0?1:0)]==="F")
        figPut(g,CX+s*ex+dx-(s<0?1:0),ey+dy,"E");
  }
  // a brow, the shadow down one side of the nose, and a mouth: at eleven rows
  // of face there is room for all three, and without them he is an egg
  {
    const ey=R.eye, mid=Math.round((R.faceTop+R.faceBot)/2);
    for(let x=CX-3;x<=CX+2;x++)if(g[ey-2]&&g[ey-2][x]==="F")figPut(g,x,ey-2,"R");
    for(let y=ey+2;y<=ey+4;y++)if(g[y]&&g[y][CX-1]==="F")figPut(g,CX-1,y,"R");
    for(let x=CX-2;x<=CX+1;x++)if(g[mid+4]&&g[mid+4][x]==="F")figPut(g,x,mid+4,"R");
  }
  // A brand new shotgun, carried across him for everyone to see. It is drawn in
  // the prop colour, not in gunmetal: the gun the crosshair is looking for is
  // the one on his hip, and two of them on one man is two answers.
  if(S.longgun&&!up)for(let i=0;i<22;i++)
    figPut(g,CX-9+i,raised?R.chest+1:R.chest+9-Math.round(i*0.55),"P");
  // Nobody who means to be recognised wears one. It goes on in linen rather
  // than in black, and below the eyes rather than over them: a dark band across
  // a face that already has two black eyes on it reads as a moustache.
  if(S.mask){
    for(let y=R.eye+3;y<=R.faceBot;y++)
      for(let x=0;x<SPR.w;x++)if(g[y][x]==="F")figPut(g,x,y,"W");
    for(let x=0;x<SPR.w;x++)if(g[R.eye+3][x]==="W")figPut(g,x,R.eye+3,"K");
  }
  if(S.star)for(let y=R.chest;y<R.chest+3;y++)figSpan(g,y,CX-Wd.chestW*0.28,3,"S");
  if(S.prop==="bag")figTaper(g,R.hand-1,R.hand+7,CX+wristX+1,9,CX+wristX+1,9,"P");
  if(S.prop==="slate")figTaper(g,R.chest+1,R.chest+11,CX+wristX,9,CX+wristX,9,"P");
  if(S.prop==="cards")figTaper(g,R.hand-3,R.hand+1,CX+wristX,6,CX+wristX,6,"P");
  if(S.prop==="rope")figDisc(g,CX+wristX,R.hand,4,4,"P");
  return g.map(r=>r.join(""));
}

/* What each of them is made of. The spec is the whole difference between one
 * caller and the next; everything else about them is the same draughtsman. */
/* Twelve specs, and no two of them may read as each other at forty-eight pixels
 * across. Colour is not enough for that - four men in Stetsons and jackets are
 * four men in Stetsons and jackets whatever colour their coats are - so the
 * silhouette does the telling: a dude wears a derby, the Kid a sombrero, the
 * Gambler a topper, the boy a cap, Miss April a bonnet, the two other women
 * their hair, Belle a working hat over a jacket because she rustles cattle for
 * a living and is not dressed for a saloon, the Doctor and the last man frock
 * coats of very different colours, the man with the new gun a vest and the gun
 * itself, the Deputy a star, and the outlaw of the hold-ups a bandana over his
 * face, which nobody who means to be recognised wears. */
const FIGSPEC={
  stranger:{hat:"derby", coat:"jacket",                gun:"holster"},
  rose:    {hat:"none", hair:"long", coat:"dress",     gun:"none", wide:0.94},
  kid:     {hat:"sombrero", coat:"jacket",             gun:"holster", wide:0.94},
  doctor:  {hat:"derby", coat:"frock",                 gun:"none", prop:"bag"},
  shotgun: {hat:"stetson", coat:"vest", longgun:true,  gun:"holster"},
  willie:  {hat:"cap", hair:"short", coat:"vest",      gun:"none",
            tall:0.7, wide:0.76, headWide:0.92},
  april:   {hat:"bonnet", hair:"long", coat:"dress",   gun:"none", wide:0.92,
            prop:"slate"},
  gambler: {hat:"topper", coat:"frock",                gun:"holster", prop:"cards"},
  deputy:  {hat:"stetson", coat:"jacket",              gun:"holster", star:true},
  belle:   {hat:"stetson", hair:"long", coat:"jacket", gun:"holster", wide:0.96,
            prop:"rope"},
  lastgun: {hat:"stetson", coat:"frock",               gun:"holster", wide:1.06},
  robber:  {hat:"stetson", coat:"jacket", mask:true,   gun:"holster", wide:1.04}
};
/* The bullet's three targets are not guessed and not hand-tuned per figure:
 * they are read off the drawing that was just made. The weapon box is where
 * the gunmetal actually is, the raised box is where the gunmetal goes when he
 * draws, and the lethal box is his torso between them. Because the gun hangs
 * clear of his hip and the drawn gun comes out clear of his chest, no two of
 * the three ever overlap - a shot is one answer, never two. */
function figInk(rows,ch,r0,r1){
  let c0=SPR.w, cr0=SPR.h, c1=-1, cr1=-1;
  for(let r=Math.max(0,r0);r<=Math.min(rows.length-1,r1);r++)
    for(let c=0;c<rows[r].length;c++)if(rows[r][c]===ch){
      if(c<c0)c0=c; if(c>c1)c1=c; if(r<cr0)cr0=r; if(r>cr1)cr1=r;
    }
  return c1<0?null:[c0,cr0,c1,cr1];
}
function figBoxes(S,stand,up){
  const P=figLayout(S), R=P.R, Wd=P.Wd;
  const half=Math.max(3,Math.round(Wd.chestW*0.42));
  const lethal=[CX-half,R.shoulder+2,CX+half,R.waist-1];
  const gone=[Math.max(0,CX-half-9),R.waist,CX-half-2,Math.min(SPR.h-1,R.beltEnd+9)];
  const rgone=[Math.max(0,CX-half-14),R.chest-4,CX-half-2,R.chest+3];
  // His hat, wherever the builder put it, and only the part of it that is clear
  // of his face: a ball through a Stetson takes the Stetson, and a ball an inch
  // lower takes the man, so the two must not be the same target.
  const hat=figInk(stand,"H",0,R.eye-2);
  return {lethal:lethal, hat:hat,
          weapon:figInk(stand,"G",R.waist-2,SPR.h-1)||gone,
          raised:figInk(up,"G",0,R.waist-1)||rgone};
}
const FIGURES={};
for(const k of Object.keys(FIGSPEC)){
  const S=FIGSPEC[k], stand=buildFigure(S,"stand");
  const up=buildFigure(S,"raise"), hands=buildFigure(S,"surrender");
  const sparse=(a,b)=>{const o={};for(let i=0;i<a.length;i++)if(a[i]!==b[i])o[i]=a[i];return o;};
  FIGURES[k]={rows:stand, raise:sparse(up,stand), surrender:sparse(hands,stand),
              box:figBoxes(S,stand,up)};
}
const DEFAULT_BOX=FIGURES.robber.box;
/* Hands up: kept as a name for anything that asks for it generically. */
const SURRENDER=FIGURES.robber.surrender;
const FIG={cx:190, ground:150};          // the caller, in the middle of the street
const SPRX=FIG.cx-(SPR.w/2)*FIGCW;
const SPRY=FIG.ground-SPR.h*FIGCH;
const cellsBox=(c0,r0,c1,r1)=>({x:SPRX+c0*FIGCW,y:SPRY+r0*FIGCH,
  w:(c1-c0+1)*FIGCW,h:(r1-r0+1)*FIGCH});
/* A hit box is not a drawing. The revolver on his hip is three pixels by two -
 * about a fifth of a millimetre of glass on a phone - so laying the sights on
 * it is not difficult, it is impossible, and that is why the shot used to be
 * settled by a lottery instead of by where the sights were. Every box is grown
 * about its own centre to something a thumb can be asked for, and nothing that
 * is drawn changes. */
const TOUCH_MIN=9;
const touchable=b=>{
  const w=Math.max(b.w,TOUCH_MIN), h=Math.max(b.h,TOUCH_MIN);
  return {x:Math.round(b.x+(b.w-w)/2), y:Math.round(b.y+(b.h-h)/2), w:w, h:h};
};
/* A hat has a man's head directly beneath it - Little Willy's is four pixels
 * deep - so it cannot be grown the way the others are without eating the shot
 * that kills him, which would be a worse lie than the one being fixed. Above
 * the crown there is nothing but sky, and a ball over a man's hat takes it off
 * just as well as one through it, so it grows upwards only. */
const touchableUp=b=>{
  const w=Math.max(b.w,TOUCH_MIN), h=Math.max(b.h,TOUCH_MIN);
  return {x:Math.round(b.x+(b.w-w)/2), y:Math.round(b.y-(h-b.h)), w:w, h:h};
};
const figureOf=e=>(e&&FIGURES[e.figure||e.id])||FIGURES.robber;
function boxesFor(e){
  const b=figureOf(e).box||DEFAULT_BOX;
  return {lethal:cellsBox(b.lethal[0],b.lethal[1],b.lethal[2],b.lethal[3]),
          hat:b.hat?touchableUp(cellsBox(b.hat[0],b.hat[1],b.hat[2],b.hat[3])):null,
          weapon:touchable(cellsBox(b.weapon[0],b.weapon[1],b.weapon[2],b.weapon[3])),
          weaponRaised:touchable(cellsBox(b.raised[0],b.raised[1],b.raised[2],b.raised[3]))};
}
/* The second gun. Not every caller comes alone: on some encounters a sash goes
 * up at the lit window over the street and a rifle comes out of it, and the
 * sheriff who is looking only at the man in front of him is the sheriff who
 * gets shot from above. The pane is the upper right one on the green front -
 * ROW[1] is x0 74, top 56, and plastered() puts that window at x1-16, top+11 -
 * and the box is that pane with a cell of slack round it. */
const SNIPER_BOX={x:92, y:65, w:13, h:14};
/* Where the sights may not go. A gunsight that can be walked back over the
 * sheriff's own sleeve, glove and revolver is a gunsight aimed at the man
 * holding it, and at 320 by 200 he is a third of the picture. This is the right
 * edge of his own drawing, banded ten rows at a time and read at full level,
 * which is the only pose the sights exist in; the reticle's centre is kept a
 * few pixels clear of it. Nothing is clamped vertically, because walking them
 * off the bottom of the street is how a stand-off is ended. */
const SHERIFF_EDGE=[45,57,61,62,61,59,59,59,61,124,119,99,94,88,45,74,75,74,73,73];
const SIGHT_CLEAR=4;
function sightFloor(y){
  const b=Math.max(0,Math.min(SHERIFF_EDGE.length-1,Math.floor(y*SCENE.h/10)));
  return (SHERIFF_EDGE[b]+SIGHT_CLEAR)/SCENE.w;
}
const HITBOX=boxesFor(null);             // the default, for anything asking without a caller
