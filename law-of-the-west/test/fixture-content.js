/* TEST FIXTURE ONLY — never shipped, never merged into content.js.
 * Stand-in turns for the encounters whose dialogue is not authored yet, so a
 * whole day can be simulated. The text names its own intent and nothing else,
 * so it cannot be mistaken for content. */
function fixtureTurns(enc,INTENTS,TURNS){
  const out=[];
  for(let t=0;t<TURNS;t++){
    out.push({say:`[${enc.id} turn ${t+1}]`,
      replies:INTENTS.map(intent=>({intent,t:`[${intent}]`,
        react:`[${enc.id} answers ${intent}]`,
        fx:intent==="threaten"?{drawRisk:+3,respect:-1}
          :intent==="command"?{respect:+1,drawRisk:+1}
          :intent==="probe"?{evidence:+1,suspicion:+1}
          :{respect:+1,drawRisk:-1}}))});
  }
  return out;
}
/* A fallback ending so an unwritten encounter can still close in a simulation. */
const fixtureEnding=[{id:"fixture_settled",when:[],text:"[fixture ending]",fx:{},award:null,points:0}];
function fillUnwritten(ENCOUNTERS,DIALOGUE,INTENTS,TURNS){
  for(const e of ENCOUNTERS){
    if(!DIALOGUE[e.id])DIALOGUE[e.id]=fixtureTurns(e,INTENTS,TURNS);
    if(!e.endings||!e.endings.length)e.endings=fixtureEnding.map(x=>({...x}));
  }
  return DIALOGUE;
}
module.exports={fixtureTurns,fillUnwritten};
