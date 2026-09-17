/* ============ content ============
 * The cast, exactly as supplied: ten encounters over one day in Gold Gulch,
 * plus the Sheriff, who is the camera. Names, roles and what each one knows
 * are the only content settled so far; `beats` stays empty until the dialogue
 * table arrives, and the engine reads lines from here and nowhere else.
 *
 * tone is the engine's handle on a response: each character reacts to the same
 * tone differently, which is what makes a drifter read firmness as respect and
 * a frightened child read it as a threat.
 *   apologetic  submissive, giving him room
 *   neutral     professional, the badge talking
 *   cocky       sarcastic, turning it aside
 *   aggressive  threatening, leaning on him
 *   draw        the fifth option, always available, and never a menu line
 */
/* The attitude quad: every beat offers one of each, in the order the original
 * put them on screen. */
const TONES=["apologetic","neutral","cocky","aggressive"];
const JOBS=["train","stage","bank"];

const CAST=[
 /* reacts: how this man reads each attitude, as [trust, agitation].
    insults: attitudes he takes as an insult — the Doctor remembers them. */
 {id:"dude",     name:"A Dude",            role:"Nervous newcomer who warns you about the James Gang",
  armed:true,  nerve:1, resolves:["info","fight"],  fragment:"train", draws:6, hostile:0.16,
  reacts:{apologetic:[+2,-2],neutral:[+2,-1],cocky:[-1,+1],aggressive:[-1,+3]}},
 {id:"rose",     name:"Miss Rose",         role:"Saloon hostess who hints at stagecoach robberies",
  armed:false, nerve:0, resolves:["info"],          fragment:"stage", draws:99, hostile:0.00,
  reacts:{apologetic:[+1,-1],neutral:[+2,0],cocky:[+3,-1],aggressive:[-3,+2]}},
 {id:"mexicali", name:"The Mexicali Kid",  role:"Trigger-happy fugitive with a price on his head",
  armed:true,  nerve:3, resolves:["fight"],         fragment:null,    draws:3, hostile:0.55,
  reacts:{apologetic:[-1,+2],neutral:[+1,0],cocky:[-2,+3],aggressive:[0,+3]}},
 {id:"doctor",   name:"The Doctor",        role:"Cynical local who knows about bank-robbing rumours",
  armed:false, nerve:0, resolves:["info","treat"],  fragment:"bank",  draws:99, hostile:0.00,
  reacts:{apologetic:[+1,0],neutral:[+2,0],cocky:[+2,-1],aggressive:[-3,+2]},
  insults:["aggressive"]},
 {id:"newgun",   name:"Dude with new Gun", role:"Hostile gunslinger showing off a new shotgun",
  armed:true,  nerve:2, resolves:["fight","nothing"], fragment:null,  draws:4, hostile:0.40,
  reacts:{apologetic:[0,+2],neutral:[+2,-1],cocky:[-1,+2],aggressive:[-1,+3]}},
 {id:"willy",    name:"Little Willy",      role:"Obnoxious local kid who holds a town secret",
  armed:false, nerve:0, resolves:["info"],          fragment:"bank",  draws:99, hostile:0.00,
  reacts:{apologetic:[+1,0],neutral:[0,+1],cocky:[+3,-1],aggressive:[-3,+3]}},
 {id:"april",    name:"Miss April",        role:"Schoolteacher interested in romance and a picnic",
  armed:false, nerve:0, resolves:["romance","info"], fragment:"train", draws:99, hostile:0.00,
  reacts:{apologetic:[+2,-1],neutral:[+2,0],cocky:[+1,0],aggressive:[-3,+2]}, fragmentCosts:"romance"},
 {id:"gambler",  name:"The Gambler",       role:"Shady card player quick to draw his weapon",
  armed:true,  nerve:2, resolves:["fight","nothing"], fragment:null,  draws:5, hostile:0.34,
  reacts:{apologetic:[-1,+1],neutral:[+2,-1],cocky:[+1,+2],aggressive:[-1,+3]}},
 {id:"deputy",   name:"The Deputy",        role:"Unreliable helper who reports bank trouble",
  armed:true,  nerve:0, resolves:["robbery"],       fragment:null,    draws:99, hostile:0.00,
  reacts:{apologetic:[+1,0],neutral:[+2,0],cocky:[0,+1],aggressive:[-1,+1]}},
 {id:"belle",    name:"Belle",             role:"Female cattle rustler",
  armed:true,  nerve:2, resolves:["fight","alliance"], fragment:null, draws:5, hostile:0.38,
  reacts:{apologetic:[0,+1],neutral:[+2,0],cocky:[+2,-1],aggressive:[-2,+3]}}
];

/* One geometry for the drawing and for the shooting, so what the crosshair is
 * over is what the bullet finds. Everything is pixels in the 320x200 scene the
 * page draws, and the figure constants are the ones ui.js draws him from. */
const SCENE={w:320,h:200};
const FIG={cx:147,ground:170,handX:109};
const HITBOX={
  lethal:{x:130,y:94,w:34,h:62},        // head and centre mass: a killing shot
  weapon:{x:95,y:118,w:26,h:18},        // the gun at his hip, while it is holstered
  weaponRaised:{x:95,y:90,w:26,h:30}    // and once his hand has come up with it
};

/* Dialogue lives here, keyed by character id and beat, so lines can be edited
 * without touching the engine:
 *   DIALOGUE.dude = [{ say, replies:[{tone, t, react}, x4] }, beat2, beat3]
 * Empty until the supplied table is in hand. The engine treats a missing beat
 * as "content pending" and never invents one.  */
const DIALOGUE={};
