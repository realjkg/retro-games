/* ============ content ============
 * An original encounter anthology built on the design grammar of the 1985
 * game rather than its script: a visitor arrives with a public pretext and a
 * concealed motive, the sheriff gets four sharply distinct attitudes, every
 * response moves state, and an encounter can settle, leave a clue, create a
 * consequence, or become a duel. Nothing here is drawn from the original's
 * dialogue, characters or plot.
 *
 * Intents, not wordings, are what the engine reads:
 *   conciliate  lowers tension, and invites being handled
 *   probe       buys information, at the cost of insult or suspicion
 *   command     asserts the badge, and provokes proud men
 *   threaten    ends a scene fast, at a price in reputation and draw risk
 */
const INTENTS=["conciliate","probe","command","threaten"];
/* Per-encounter state, reset at each arrival, plus the town ledger that
 * carries across the day: safety, clues and the sheriff's standing. */
const VARS=["respect","fear","suspicion","evidence","drawRisk"];

const ENCOUNTERS=[
 {id:"deputy", title:"The Brass-Button Deputy", place:"JAIL",
  surface:"A territorial deputy demands custody of a prisoner",
  hidden:"His warrant may be fabricated",
  core:"authority", armed:true, nerve:2, drawAt:6, hostile:0.12,
  arrive:["hooves","spurs"],
  /* First match wins, so the specific outcomes sit above the fallback. */
  endings:[
   {id:"forgery",   when:[["evidence",">=",2]], chance:0.85,
    text:"The seal is a county seal, and the county it names has no such court. He goes into his own cell, and the prisoner stays in the next one.",
    fx:{safety:+1,clue:"warrant"}, award:"arrest", points:180},
   {id:"escorted",  when:[["respect",">=",2],["suspicion","<=",1]], chance:0.85,
    text:"He signs for the prisoner in front of two witnesses and rides out at a walk. Whatever he is, he is now a man on paper.",
    fx:{clue:"escort"}, award:"talked", points:120},
   {id:"standoff",  when:[["drawRisk",">=",4]],
    text:"Neither of you touches leather, and neither of you looks away. He backs off the boardwalk and leaves the prisoner where he lies, for now.",
    fx:{}, award:null, points:40},
   {id:"handover",  when:[],
    text:"You hand the prisoner over to a warrant you did not read closely. By evening the deputy and the prisoner are both gone, and so is the payroll box.",
    fx:{safety:-1}, award:"lost", points:-60, sound:"robbery"}
  ]},
 /* The rest of the anthology, written to the same grammar. Metadata stands;
  * their dialogue is not authored yet, and the engine says so rather than
  * inventing any. */
 {id:"rainmaker", title:"The Rainmaker", place:"STREET",
  surface:"A travelling preacher wants permission to hold a revival",
  hidden:"He is collecting money for someone dangerous",
  core:"trust", armed:false, nerve:0, drawAt:99, hostile:0.00,
  arrive:["wagon","crowd"],
  endings:[
   /* Cross-scene: the hand on the forged warrant and the name on his
    * subscription book belong to the same outfit. */
   {id:"collection_named", when:[["clue:warrant",">=",1],["suspicion",">=",2]],
    text:"He gives up the name in the subscription book rather than the name in the sermon, and it is the one off the warrant. The revival goes ahead. The collection goes into the safe at the jail.",
    fx:{safety:+1,clue:"collection"}, award:"talked", points:190, sound:"thread"},
   {id:"revival_watched", when:[["respect",">=",2],["suspicion",">=",1]], chance:0.82,
    text:"He may have the lot behind the livery, on the condition that you stand at the back with your hat off and your eyes open. He agrees a shade too easily.",
    fx:{clue:"revival"}, award:"talked", points:130},
   {id:"run_off", when:[["fear",">=",3]],
    text:"The wagon is turned around before the canvas is out of it. Whoever the money was for will send somebody less nervous next time.",
    fx:{}, award:null, points:40},
   {id:"revival_free", when:[],
    text:"Three nights of singing, a full collection plate, and a wagon gone by Sunday. Nobody in Gold Gulch can say where the money went, least of all the sheriff.",
    fx:{safety:-1}, award:"lost", points:-30, sound:"penalty"}
  ]},
 {id:"surveyor", title:"The Quiet Surveyor", place:"RECORDS",
  surface:"A polite land agent requests town records",
  hidden:"He is scouting properties for a railroad takeover",
  core:"suspicion", armed:false, nerve:0, drawAt:99, hostile:0.00,
  arrive:["crowd"], endings:[]},
 {id:"widow", title:"The Widow's Ledger", place:"RANCH",
  surface:"A ranch widow says her husband's debt was forged",
  hidden:"Her own books contain a damaging secret",
  core:"evidence", armed:false, nerve:0, drawAt:99, hostile:0.00,
  arrive:["wagon"],
  endings:[
   /* The one durable favour in the anthology. Shown her the courtesy and read
    * the ledger properly and she owes the sheriff something worth having; make
    * her afraid and she owes him nothing. */
   /* Cross-scene: whoever forged the deputy's warrant forged this too, and a
    * sheriff who has seen the one recognises the other. */
   {id:"same_hand", when:[["clue:warrant",">=",1],["evidence",">=",2],["fear","<=",1]], chance:0.7,
    text:"You have seen that downstroke before, on a warrant a man in brass buttons was carrying. The same hand wrote them both, and now there is a pattern instead of a grievance.",
    fx:{safety:+1,clue:"same_hand",favour:1}, award:"arrest", points:210, sound:"thread"},
   {id:"widow_favour", when:[["evidence",">=",2],["respect",">=",1],["fear","<=",1]], chance:0.78,
    text:"Mrs. Vale closes the ledger, then presses the sheriff's hand. \u201cIf this town ever leaves you in the dust, send word to my place.\u201d",
    fx:{favour:1,safety:+1,clue:"ledger"}, award:"talked", points:160},
   {id:"secret_exposed", when:[["suspicion",">=",4]], chance:0.8,
    text:"You read far enough to find what she was hiding: four years of quiet payments to a name she will not say aloud. The debt was forged, and so was her good standing.",
    fx:{safety:+1,clue:"payments"}, award:"clue", points:-20, sound:"penalty"},
   {id:"debt_voided", when:[["evidence",">=",2]],
    text:"Two hands wrote that signature and neither of them was her husband's. The debt is void, and the man who drew it up has a week's head start.",
    fx:{clue:"ledger"}, award:"talked", points:110},
   {id:"closed_book", when:[],
    text:"She closes the ledger, thanks you for your time in the voice people use on tax collectors, and drives the wagon home.",
    fx:{}, award:null, points:-20}
  ]},
 {id:"tuner", title:"The Piano Tuner", place:"SALOON",
  surface:"A musician says someone stole his instrument case",
  hidden:"The case holds coded messages, not tools",
  core:"perception", armed:false, nerve:1, drawAt:99, hostile:0.00,
  arrive:["piano","bottle"], endings:[]},
 {id:"locket", title:"The Boy With the Locket", place:"STREET",
  surface:"A teenager asks the sheriff to find a missing parent",
  hidden:"The missing person may be fleeing a crime",
  core:"mercy", armed:false, nerve:0, drawAt:99, hostile:0.00,
  arrive:["crowd"], endings:[]}
];

/* One geometry for the drawing and for the shooting, so what the crosshair is
 * over is what the bullet finds. Pixels in the 320x200 scene the page draws. */
const SCENE={w:320,h:200};
const FIG={cx:147,ground:170,handX:109};
const HITBOX={
  lethal:{x:130,y:94,w:34,h:62},        // head and centre mass: a killing shot
  weapon:{x:95,y:118,w:26,h:18},        // the gun at his hip, while it is holstered
  weaponRaised:{x:95,y:90,w:26,h:30}    // and once his hand has come up with it
};

/* ============ dialogue ============
 * Keyed by encounter and turn, separate from the engine, so lines can be
 * rewritten without touching a rule. Three turns; four intents per turn; fx is
 * what the reply does to the state.
 */
const DIALOGUE={
 rainmaker:[
  {say:"Sheriff. Brother Amos Teague, of no fixed pulpit. Three nights on the lot behind the livery, a tent, and a hymn or two. The town keeps the peace and heaven keeps the accounts.",
   replies:[
    {intent:"conciliate",
     t:"\"Three nights, and I'll keep the drunks off your canvas myself.\"",
     react:"\"A man who offers before he is asked.\" He writes something small in a book he does not offer to show you.",
     fx:{respect:+2,fear:-1}},
    {intent:"probe",
     t:"\"Whose accounts, Brother? Heaven's, or the ones in that book?\"",
     react:"The book shuts. \"A subscription list. Names of the faithful, and what the faithful can spare.\"",
     fx:{suspicion:+2,respect:-1}},
    {intent:"command",
     t:"\"You'll hold it on the lot, off the street, and be quiet by ten.\"",
     react:"\"Ten o'clock.\" He inclines his head. \"The Lord has kept worse hours.\"",
     fx:{respect:+1,fear:+1}},
    {intent:"threaten",
     t:"\"I've run four of your trade out of this town. Give me a reason not to make it five.\"",
     react:"He smiles as though you had complimented the tent. \"Four. And did any of them leave poorer than they came?\"",
     fx:{fear:+2,suspicion:+1,respect:-1}}]},

  {say:"\"The collection is for the mission at Sand Fork. Orphans, mostly. I carry it in myself, which is why I travel light and sleep badly.\"",
   replies:[
    {intent:"conciliate",
     t:"\"Then sleep in a cell with the door open. It's the safest room in town for a man carrying money.\"",
     react:"\"In a cell.\" He laughs, and then stops laughing, and then considers it seriously. \"You are a strange sort of lawman.\"",
     fx:{respect:+2,fear:-1}},
    {intent:"probe",
     t:"\"Sand Fork burned out two summers ago. Who is taking delivery?\"",
     react:"There is a pause of exactly the wrong length. \"The mission moved. Missions do.\"",
     fx:{suspicion:+2}},
    {intent:"command",
     t:"\"You'll count it in front of me before you leave, and I'll write the figure down.\"",
     react:"\"Count it.\" His hand goes flat on the book, which is answer enough about where the figure would differ.",
     fx:{respect:+1,suspicion:+1,fear:+1}},
    {intent:"threaten",
     t:"\"If one cent of that plate ends up with the men I think it ends up with, I'll take the tent down with you inside it.\"",
     react:"\"With me inside it.\" He looks up the street, at nothing, for a good while. \"You have somebody in mind. That is a comfort and a worry both.\"",
     fx:{fear:+3,suspicion:+1,respect:-2}}]},

  {say:"\"So. Do I put up the canvas, or do I drive on and let the next town have the singing?\"",
   replies:[
    {intent:"conciliate",
     t:"\"Put it up. I'll be at the back on the first night, and I'll pass the plate myself.\"",
     react:"\"You will pass it.\" He hesitates over the book. \"…Then it had better be an honest plate.\"",
     fx:{respect:+2,suspicion:+1}},
    {intent:"probe", needs:["clue:warrant"],
     t:"\"Open the subscription book to the back page. I took a forged warrant off a man this morning and I want to compare a name.\"",
     react:"He opens it to the back page himself, slowly, the way a man does when he has decided which side to be on. \"Then you already know who I am collecting for.\"",
     fx:{suspicion:+2,respect:+1}},
    {intent:"command",
     t:"\"Canvas up, plate counted, and you'll be gone by Monday.\"",
     react:"\"Monday.\" He writes that down too, in the same small hand.",
     fx:{respect:+1,fear:+1}},
    {intent:"threaten",
     t:"\"Drive on, Brother. Tonight, while the road is still light.\"",
     react:"\"Tonight.\" He does not argue, which is the first thing all morning that has not sounded rehearsed.",
     fx:{fear:+3,respect:-1}}]}],

 widow:[
  {say:"Sheriff. My husband is eight weeks in the ground and a man from the bank says he signed for four hundred dollars the month he was too sick to hold a cup. I have the ledger. I want somebody to look at it.",
   replies:[
    {intent:"conciliate",
     t:"\"Sit down, Mrs. Vale. Nobody takes a ranch off a widow in my town on a piece of paper.\"",
     react:"She sits, and the ledger stays shut on her knees. \"That is more than the bank said, and it said a great deal.\"",
     fx:{respect:+2,fear:-1}},
    {intent:"probe",
     t:"\"Open it to the month he took ill. I want the page before and the page after.\"",
     react:"She turns to it without looking down, which means she has turned to it often. The hand in the margin is not the hand on the line.",
     fx:{evidence:+1,suspicion:+1}},
    {intent:"command",
     t:"\"Leave the ledger with me and go home. I'll send word when I know something.\"",
     react:"\"Leave it.\" Her hands close on the cover. \"It is the only thing in the house that is still mine.\"",
     fx:{respect:+1,fear:+1}},
    {intent:"threaten",
     t:"\"If you've written a line of that yourself, I'll know it by supper.\"",
     react:"The colour goes out of her face in a way that tells you something, though not the thing you asked about.",
     fx:{fear:+2,respect:-2,suspicion:+1}}]},

  {say:"\"The bank's man says the debt was witnessed. He named two riders who left the county before the funeral.\"",
   replies:[
    {intent:"conciliate",
     t:"\"Then we'll write to the county they left for, and until it answers, nobody touches your fences.\"",
     react:"\"You would put that in writing?\" \u2014 and for the first time she opens the ledger the rest of the way.",
     fx:{respect:+2,evidence:+1,fear:-1}},
    {intent:"probe", needs:["clue:warrant"],
     t:"\"Hold it to the light. I took a forged warrant off a man this morning \u2014 I want to see whether the same hand wrote your husband's name.\"",
     react:"She holds the page up herself, and her hands are steadier than they have been since she walked in. \"Then it is not only me.\"",
     fx:{evidence:+2,respect:+1}},
    {intent:"command",
     t:"\"Names, dates, and what you paid out. All of it, Mrs. Vale, or the bank's story is the only one I have.\"",
     react:"\"All of it.\" She reads the room, then the ledger, then the room again.",
     fx:{respect:+1,evidence:+1,fear:+1}},
    {intent:"threaten",
     t:"\"Widows have forged a signature before now. Give me a reason to believe you did not.\"",
     react:"\"A reason.\" She stands up with the ledger against her chest. \"I brought you the reason. You would rather have a confession.\"",
     fx:{fear:+3,respect:-2}}]},

  {say:"\"So. Do I drive home and wait for men with a wagon, or is there law in this town for a woman who owns a fence line somebody wants?\"",
   replies:[
    {intent:"conciliate",
     t:"\"There's law. Leave your name on my book and the bank can come and argue with me.\"",
     react:"She writes her name in a round, careful hand, and puts the pen down straight.",
     fx:{respect:+2,evidence:+1,fear:-1}},
    {intent:"probe",
     t:"\"One more question, and I want the pencil column answered. Who were you paying?\"",
     react:"\"Somebody who stopped asking when my husband died,\" she says, and closes the book on her own hand.",
     fx:{evidence:+2,suspicion:+2}},
    {intent:"command",
     t:"\"You'll drive home, and you'll leave the ledger where the court can find it. That is the law, and it is on your side today.\"",
     react:"\"On my side.\" She nods slowly, the way people do when they are deciding whether to believe a man.",
     fx:{respect:+1,evidence:+1,fear:+1}},
    {intent:"threaten",
     t:"\"Drive home. If any of this is your doing, I'll be out at your place before the week is up.\"",
     react:"\"Then come out,\" she says, and the wagon is moving before you have finished the sentence.",
     fx:{fear:+3,respect:-1}}]}],

 deputy:[
  {say:"Sheriff. Deputy Marsh, territorial office. I'm here for the man you're holding — Coyle. Warrant's made out and my horse is tired.",
   replies:[
    {intent:"conciliate",
     t:"\"Long ride. Coffee's on the stove and the paperwork can wait ten minutes.\"",
     react:"He takes the cup with his left hand and keeps his right where it is. \"Ten minutes. Then Coyle rides with me.\"",
     fx:{respect:+1,drawRisk:-1}},
    {intent:"probe",
     t:"\"Territorial office out of which court? I'll want to read the warrant twice.\"",
     react:"\"Read it as many times as you like.\" He holds it out flat, and his thumb sits over the lower seal.",
     fx:{evidence:+1,suspicion:+1}},
    {intent:"command",
     t:"\"Coyle stays in my jail until a judge I know of tells me different.\"",
     react:"\"You'd put yourself between a territorial warrant and a prisoner?\" The brass on his coat catches the light as he squares up.",
     fx:{respect:+1,drawRisk:+2,fear:+1}},
    {intent:"threaten",
     t:"\"Turn that horse around before I decide you're the one I'm holding.\"",
     react:"He laughs once, without any of it reaching his eyes. \"That's a lot of mouth for one badge and one street.\"",
     fx:{drawRisk:+3,respect:-1,fear:+1}}]},

  {say:"\"Coyle shot a station agent in Cutter's Bend. My office wants him where the witnesses are. Every hour he sits here is an hour the case gets thinner.\"",
   replies:[
    {intent:"conciliate",
     t:"\"Then we'll do it properly and fast. Sign the book, name your court, and he's yours by noon.\"",
     react:"\"By noon.\" He turns the book around and looks at it a while before he touches the pen.",
     fx:{respect:+2,drawRisk:-1}},
    {intent:"probe",
     t:"\"Cutter's Bend has no station. It lost the line three years back — who wrote this for you?\"",
     react:"Nothing moves in his face, which is the loudest thing in the room. \"A clerk. Clerks get places wrong.\"",
     fx:{evidence:+2,suspicion:+2,drawRisk:+1}},
    {intent:"command",
     t:"\"Witnesses can ride to my jail as easily as Coyle can ride to yours.\"",
     react:"\"They could. They won't.\" His weight comes forward onto the front foot.",
     fx:{drawRisk:+2,respect:+1}},
    {intent:"threaten",
     t:"\"One more word about my jail and you'll see the inside of it.\"",
     react:"\"You've got a temper on you for a town this size, Sheriff.\" His hand drifts to his belt buckle, which is near enough to other things.",
     fx:{drawRisk:+3,fear:+1,respect:-1}}]},

  {say:"\"Last time. The man, or the trouble. I've no appetite for either, but I'll take whichever you hand me.\"",
   replies:[
    {intent:"conciliate",
     t:"\"Nobody's handing anybody trouble. Ride with me to the telegraph and we'll wire your office together.\"",
     react:"\"The telegraph.\" He looks up the street towards it for a long moment. \"…Fine. We'll wire them.\"",
     fx:{respect:+2,evidence:+1,drawRisk:-2}},
    {intent:"probe",
     t:"\"Take your thumb off the seal and let me see the whole of it.\"",
     react:"His thumb does not move. \"You've read it.\"",
     fx:{evidence:+2,suspicion:+1,drawRisk:+1}},
    {intent:"command",
     t:"\"You'll wait in the office while I wire the territorial marshal. Sit down, Deputy.\"",
     react:"\"Sit down.\" He repeats it as though testing how it sounds in a room he does not own.",
     fx:{respect:+2,drawRisk:+2,fear:+1}},
    {intent:"threaten",
     t:"\"Reach for that paper again and I'll take it off you with your hand still on it.\"",
     react:"\"Then reach,\" he says, very quietly, and stops talking.",
     fx:{drawRisk:+4,respect:-2,fear:+2}}]}]
};
