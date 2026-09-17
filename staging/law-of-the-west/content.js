/* ============ content ============
 * The cast, exactly as supplied: ten encounters over one day in Gold Gulch,
 * plus the Sheriff, who is the camera. Names, roles and what each one knows
 * are the only content settled so far; `beats` stays empty until the dialogue
 * table arrives, and the engine reads lines from here and nowhere else.
 *
 * tone is the engine's handle on a response: each character reacts to the same
 * tone differently, which is what makes a drifter read firmness as respect and
 * a frightened child read it as a threat.
 *   firm   standing on the badge          kind   giving him room
 *   joke   turning it aside               probe  pressing for what he knows
 *   draw   the fifth option, always available
 */
const TONES=["firm","kind","joke","probe"];
const JOBS=["train","stage","bank"];

const CAST=[
 {id:"dude",     name:"A Dude",            role:"Nervous newcomer who warns you about the James Gang",
  armed:true,  nerve:1, resolves:["info","fight"],  fragment:"train", draws:6, hostile:0.16,
  reacts:{firm:[+2,-1],kind:[+1,-2],joke:[-1,+1],probe:[+2,+2]}},
 {id:"rose",     name:"Miss Rose",         role:"Saloon hostess who hints at stagecoach robberies",
  armed:false, nerve:0, resolves:["info"],          fragment:"stage", draws:99, hostile:0.00,
  reacts:{firm:[-1,+1],kind:[+2,-1],joke:[+2,-1],probe:[+1,+1]}},
 {id:"mexicali", name:"The Mexicali Kid",  role:"Trigger-happy fugitive with a price on his head",
  armed:true,  nerve:3, resolves:["fight"],         fragment:null,    draws:3, hostile:0.55,
  reacts:{firm:[+1,+2],kind:[-1,+1],joke:[-2,+3],probe:[0,+2]}},
 {id:"doctor",   name:"The Doctor",        role:"Cynical local who knows about bank-robbing rumours",
  armed:false, nerve:0, resolves:["info","treat"],  fragment:"bank",  draws:99, hostile:0.00,
  reacts:{firm:[-2,+1],kind:[+2,-1],joke:[+1,0],probe:[+1,+1]}},
 {id:"newgun",   name:"Dude with new Gun", role:"Hostile gunslinger showing off a new shotgun",
  armed:true,  nerve:2, resolves:["fight","nothing"], fragment:null,  draws:4, hostile:0.40,
  reacts:{firm:[0,+2],kind:[+1,0],joke:[-1,+2],probe:[+1,+1]}},
 {id:"willy",    name:"Little Willy",      role:"Obnoxious local kid who holds a town secret",
  armed:false, nerve:0, resolves:["info"],          fragment:"bank",  draws:99, hostile:0.00,
  reacts:{firm:[-2,+2],kind:[+2,-1],joke:[+3,-2],probe:[-1,+2]}},
 {id:"april",    name:"Miss April",        role:"Schoolteacher interested in romance and a picnic",
  armed:false, nerve:0, resolves:["romance","info"], fragment:"train", draws:99, hostile:0.00,
  reacts:{firm:[-1,+1],kind:[+3,-1],joke:[+1,0],probe:[-1,+2]}, fragmentCosts:"romance"},
 {id:"gambler",  name:"The Gambler",       role:"Shady card player quick to draw his weapon",
  armed:true,  nerve:2, resolves:["fight","nothing"], fragment:null,  draws:5, hostile:0.34,
  reacts:{firm:[+1,+1],kind:[0,-1],joke:[+1,-1],probe:[-1,+3]}},
 {id:"deputy",   name:"The Deputy",        role:"Unreliable helper who reports bank trouble",
  armed:true,  nerve:0, resolves:["robbery"],       fragment:null,    draws:99, hostile:0.00,
  reacts:{firm:[+1,0],kind:[+1,0],joke:[0,0],probe:[+2,0]}},
 {id:"belle",    name:"Belle",             role:"Female cattle rustler",
  armed:true,  nerve:2, resolves:["fight","alliance"], fragment:null, draws:5, hostile:0.38,
  reacts:{firm:[-1,+2],kind:[+2,0],joke:[+2,-1],probe:[0,+2]}}
];

/* Dialogue lives here, keyed by character id and beat, so lines can be edited
 * without touching the engine:
 *   DIALOGUE.dude = [{ say, replies:[{tone, t, react}, x4] }, beat2, beat3]
 * Empty until the supplied table is in hand. The engine treats a missing beat
 * as "content pending" and never invents one.  */
const DIALOGUE={};
