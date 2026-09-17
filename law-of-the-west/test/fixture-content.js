/* TEST FIXTURE ONLY — never shipped, never merged into content.js.
 * Stand-in lines so the mechanics can be exercised before the supplied
 * dialogue table exists. The text is deliberately non-dialogue: it names the
 * tone and nothing else, so nobody can mistake it for content. */
function fixtureDialogue(CAST,TONES,BEATS){
  const D={};
  for(const c of CAST){
    D[c.id]=[];
    for(let b=0;b<BEATS;b++){
      D[c.id].push({
        say:`[${c.id} beat ${b+1} line]`,
        replies:[...TONES.map(t=>({tone:t,t:`[${t}]`,react:`[${c.id} reacts to ${t}]`})),
                 {tone:"draw",t:"[draw]",react:"[draw]"}]
      });
    }
  }
  return D;
}
module.exports={fixtureDialogue};
