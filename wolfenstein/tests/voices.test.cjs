// The men's voices, measured. Every earlier version of this game's voice
// passed its own tests and was heard as a woman's, because those tests
// checked numbers the code had chosen, not the sound, and never looked at
// the voice the device actually used. These check the sound against real
// people first, and then every clip the game can play, and the choice of
// device voice against what devices actually have.
const test=require('node:test'),assert=require('node:assert');
const fs=require('node:fs'),path=require('node:path');
const V=require('../tools/voicegender.js');
const {runtime}=require('./harness.cjs');
const REF=path.join(__dirname,'voices');

test('the measure is right about people: every woman above the bar, every man below the top', ()=>{
  /* real people (LJSpeech's woman, the digit dataset's six men) and eSpeak's
     own labelled voices (m1-m7, f1-f5): one per speaker, on all he says */
  const by={};
  for(const f of fs.readdirSync(REF).filter(f=>f.endsWith('.wav'))){
    const who=f.startsWith('LJ')?'woman:ljspeech':f.startsWith('espeak-f')?'woman:'+f.slice(0,-4):
      f.startsWith('espeak-m')?'man:'+f.slice(0,-4):'man:'+f.split('_')[1];
    const {sr,x}=V.wavToFloat(fs.readFileSync(path.join(REF,f)));
    (by[who]=by[who]||[]).push(...V.yin(V.to8k(x,sr),8000));
  }
  const women=Object.keys(by).filter(k=>k.startsWith('woman')),men=Object.keys(by).filter(k=>k.startsWith('man'));
  assert.equal(women.length,6);assert.equal(men.length,13);
  for(const who in by){
    const f0=V.median(by[who]);
    assert.ok(by[who].length>=8,who+': too little voice to judge');
    if(who.startsWith('woman')){
      /* the claim the game rests on: no woman comes within 10 Hz of the bar.
         (There is no line between the sexes: eSpeak's deepest woman, here,
         and the highest real man are two hertz apart. There is only a bar
         low enough that no woman reaches it.) */
      assert.ok(f0>V.MAN_MAX+10,who+' at '+Math.round(f0)+'Hz is too close to the bar of '+V.MAN_MAX);
    }else assert.ok(f0<V.MAN_TOP,who+' at '+Math.round(f0)+'Hz');
  }
});

/* every clip in the page, decoded the way the page decodes it */
function clips(){
  const r=runtime(1);
  const out=[];
  for(const kind of ['g1','g2','ss'])
    for(const text of r.j(`Object.keys(CLIPS.v.${kind})`))
      out.push({kind,text,pcm:r.j(`Array.from(decodeClip(CLIPS.v.${kind}[${JSON.stringify(text)}]))`),
        sr:r.j('CLIPS.sr')});
  return{r,out};
}
/* the fastest each voice is played: a guard's voice at his highest, and the
   deeper guards borrowing the first voice for their questions */
function fastest(r,kind){
  return r.j(`(()=>{let m=0;for(let p=0.85;p<=1.1501;p+=0.01){const v=voiceFor(${JSON.stringify(kind==='ss'?'ss':'guard')},p,1);
    if(v.clip===${JSON.stringify(kind)}||(${JSON.stringify(kind)}==='g1'&&v.clip==='g2'))m=Math.max(m,v.play);}return m;})()`);
}

test('every line the men say is a man\'s voice, at every pitch the game plays it', ()=>{
  const {r,out}=clips();
  assert.ok(out.length>=60,'only '+out.length+' clips in the page');
  const mood=Object.fromEntries(r.j('SPOKEN').map(l=>[l[0],l[1]]));
  const rows=[];
  for(const c of out){
    const f=V.yin(V.to8k(c.pcm,c.sr),8000);
    const top=V.median(f)*fastest(r,c.kind);
    /* every line, screams too, under the bar that no woman measured comes near */
    const bar=V.MAN_MAX;
    rows.push([c.kind,c.text,Math.round(top),f.length]);
    assert.ok(f.length>=3,c.kind+' "'+c.text+'": no voice in it to judge');
    assert.ok(top<bar,c.kind+' "'+c.text+'" at '+Math.round(top)+'Hz, over '+bar+' Hz: not a man\'s voice');
  }
  /* and the voices sound like different men: the SS lowest */
  const med=k=>V.median(rows.filter(x=>x[0]===k&&mood[x[1]]!=='scream').map(x=>x[2]));
  assert.ok(med('ss')<med('g2')&&med('g2')<med('g1'),'the SS are not the deepest: '+['g1','g2','ss'].map(k=>k+' '+med(k)).join(', '));
});

test('every line the game says in 1981 has a man\'s voice to say it', ()=>{
  const r=runtime(1);
  const miss=r.j(`(()=>{const need=[];
    for(const l of HALT.concat(CHALLENGE))need.push([l,'guard']);
    for(const l of SSHALT.concat(['Halt! SS! Hände hoch!','Waffe runter!']))need.push([l,'ss']);
    for(const q of Object.values(QUESTIONS))need.push([q.de,'guard'],[q.de,'ss']);
    return need.filter(([l,k])=>!clipFor(l,voiceFor(k,1,1))&&!clipFor(l,voiceFor(k,0.9,1))).map(x=>x.join(' / '));})()`);
  assert.deepEqual(miss,[],'lines with no clip');
});

/* What devices actually offer in German, by name. */
const DEVICES={
  'iPhone, iOS 17':['Anna','Helena','Markus','Petra','Yannick','Eddy (Deutsch (Deutschland))','Flo (Deutsch (Deutschland))',
    'Grandma (Deutsch (Deutschland))','Grandpa (Deutsch (Deutschland))','Reed (Deutsch (Deutschland))',
    'Rocko (Deutsch (Deutschland))','Sandy (Deutsch (Deutschland))','Shelley (Deutsch (Deutschland))'],
  'iPhone, only the default':['Anna'],
  'Mac, Safari':['Anna','Markus (Erweitert)','Petra (Premium)','Yannick'],
  'Chrome, desktop':['Google Deutsch'],
  'Android':['Deutsch Deutschland','de-de-x-deb-local','de-de-x-nfh-network'],
  'Windows, Edge':['Microsoft Hedda - German (Germany)','Microsoft Katja - German (Germany)','Microsoft Stefan - German (Germany)',
    'Microsoft Amala Online (Natural) - German (Germany)','Microsoft Conrad Online (Natural) - German (Germany)',
    'Microsoft Katja Online (Natural) - German (Germany)','Microsoft Killian Online (Natural) - German (Germany)',
    'Microsoft Seraphina Online (Natural) - German (Germany)','Microsoft Florian Online (Natural) - German (Germany)'],
  'Windows, Chrome':['Microsoft Hedda - German (Germany)','Microsoft Katja - German (Germany)','Google Deutsch']
};
const WOMEN=/anna|helena|petra|flo\b|grandma|sandy|shelley|hedda|katja|amala|seraphina|google deutsch/i;

test('a device\'s own voice is used only if it is a man\'s, and never pitched up', ()=>{
  for(const [dev,names] of Object.entries(DEVICES)){
    const r=runtime(1);
    r.box.SpeechSynthesisUtterance=function(t){this.text=t;};
    r.box.speechSynthesis={pending:false,cancel(){},addEventListener(){},
      getVoices:()=>names.map(n=>({name:n,lang:'de-DE'})),speak(u){(r.box.__said=r.box.__said||[]).push(u);}};
    r.run(`Voice.init();Snd.on=true;G.demo=false;`);
    /* a line no clip has: the password, which changes every castle */
    r.run(`Voice.say('Die Parole heute ist Enzian.','chat',voiceFor('guard',1.15,1));
           Voice.say('Kommandant Vogel ist heute schlecht gelaunt.','chat',voiceFor('ss',1.15,1));`);
    const said=r.box.__said||[];
    for(const u of said){
      assert.ok(!WOMEN.test(u.voice.name),dev+': spoke in '+u.voice.name+', a woman\'s voice');
      assert.ok(u.pitch<=1,dev+': a man\'s voice pitched up, to '+u.pitch);
    }
    const man=names.find(n=>!WOMEN.test(n)&&/markus|yannick|stefan|conrad|killian|florian|eddy|grandpa|reed|rocko/i.test(n));
    if(man)assert.ok(said.length===2,dev+': had '+man+' and did not use him');
    else assert.equal(said.length,0,dev+': no man\'s voice, and it spoke anyway');
  }
});

test('the shouts do not go to the device at all: they are the page\'s own, on every device', ()=>{
  const r=runtime(1);
  r.box.SpeechSynthesisUtterance=function(t){this.text=t;};
  r.box.speechSynthesis={pending:false,cancel(){},addEventListener(){},
    getVoices:()=>[{name:'Anna',lang:'de-DE'}],speak(u){(r.box.__said=r.box.__said||[]).push(u);}};
  r.run(`Voice.init();Snd.on=true;G.demo=false;Snd.played=0;
    for(const l of HALT)Voice.say(l,'bark',voiceFor('guard',1,1));
    for(const l of SSHALT)Voice.say(l,'bark',voiceFor('ss',1,1));`);
  assert.equal((r.box.__said||[]).length,0,'a shout was handed to the device\'s voice');
  assert.equal(r.j('Snd.played'),r.j('HALT.length+SSHALT.length'),'not every shout was played from the page');
});
