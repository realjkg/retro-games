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
    fx:{safety:-1}, award:"lost", points:-60}
  ]},
 /* The rest of the anthology, written to the same grammar. Metadata stands;
  * their dialogue is not authored yet, and the engine says so rather than
  * inventing any. */
 {id:"rainmaker", title:"The Rainmaker", place:"STREET",
  surface:"A travelling preacher wants permission to hold a revival",
  hidden:"He is collecting money for someone dangerous",
  core:"trust", armed:false, nerve:0, drawAt:99, hostile:0.00, endings:[]},
 {id:"surveyor", title:"The Quiet Surveyor", place:"RECORDS",
  surface:"A polite land agent requests town records",
  hidden:"He is scouting properties for a railroad takeover",
  core:"suspicion", armed:false, nerve:0, drawAt:99, hostile:0.00, endings:[]},
 {id:"widow", title:"The Widow's Ledger", place:"RANCH",
  surface:"A ranch widow says her husband's debt was forged",
  hidden:"Her own books contain a damaging secret",
  core:"evidence", armed:false, nerve:0, drawAt:99, hostile:0.00,
  endings:[
   /* The one durable favour in the anthology. Shown her the courtesy and read
    * the ledger properly and she owes the sheriff something worth having; make
    * her afraid and she owes him nothing. */
   {id:"widow_favour", when:[["evidence",">=",2],["respect",">=",1],["fear","<=",1]], chance:0.78,
    text:"Mrs. Vale closes the ledger, then presses the sheriff's hand. \u201cIf this town ever leaves you in the dust, send word to my place.\u201d",
    fx:{favour:1,safety:+1,clue:"ledger"}, award:"talked", points:160},
   {id:"secret_exposed", when:[["suspicion",">=",4]], chance:0.8,
    text:"You read far enough to find what she was hiding: four years of quiet payments to a name she will not say aloud. The debt was forged, and so was her good standing.",
    fx:{safety:+1,clue:"payments"}, award:"clue", points:-20},
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
  core:"perception", armed:false, nerve:1, drawAt:99, hostile:0.00, endings:[]},
 {id:"locket", title:"The Boy With the Locket", place:"STREET",
  surface:"A teenager asks the sheriff to find a missing parent",
  hidden:"The missing person may be fleeing a crime",
  core:"mercy", armed:false, nerve:0, drawAt:99, hostile:0.00, endings:[]}
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
    {intent:"probe",
     t:"\"Show me the page you turned past. The narrow column, the one in pencil.\"",
     react:"\"That is household.\" She says it too quickly, and does not cover the page, which is worse.",
     fx:{evidence:+2,suspicion:+2}},
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
