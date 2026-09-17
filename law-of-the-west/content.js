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
   {id:"forgery",   when:[["evidence",">=",2]],
    text:"The seal is a county seal, and the county it names has no such court. He goes into his own cell, and the prisoner stays in the next one.",
    fx:{safety:+1,clue:"warrant"}, award:"arrest", points:180},
   {id:"escorted",  when:[["respect",">=",2],["suspicion","<=",1]],
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
  core:"evidence", armed:false, nerve:0, drawAt:99, hostile:0.00, endings:[]},
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
