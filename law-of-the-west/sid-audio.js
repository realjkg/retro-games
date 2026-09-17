/* ============ audio — SID (MOS 6581) idiom ============ *
 * Pulse oscillators with pulse-width modulation, a resonant multimode
 * lowpass, ring modulation, 23-bit LFSR noise and 4-bit ADSR levels.
 * Everything synthesised at run time. No samples, no files, nothing
 * lifted from any commercial release. SOUNDS is plain data so the same
 * definitions can be rendered offline to wav for auditioning.
 *
 * voice fields:
 *   w    "pulse" | "saw" | "tri" | "noise"
 *   f0   start frequency (Hz)        f1  end frequency (sweep, optional)
 *   pw   pulse width 0..1            pw1 end width (PWM sweep, optional)
 *   ring ring-modulator ratio against f0 (optional, tri/pulse only)
 *   cut  filter cutoff (Hz)          cut1 end cutoff (sweep, optional)
 *   res  filter resonance 0..15      dur seconds      vol 0..1
 *   dly  start offset (seconds)
 *   seq  [[semitoneOffset, startSec, durSec], ...] for melodic phrases   */
const SID_CLK=985248, FRAME=1/50;          // PAL machine, 50 Hz play routine
const sidF=f=>Math.round(f*16777216/SID_CLK)*SID_CLK/16777216;   // 16-bit register
const sid4=v=>Math.round(Math.max(0,Math.min(1,v))*15)/15;       // 4-bit level
const sidCut=c=>Math.round(Math.max(30,Math.min(12000,c))/12000*2047)/2047*12000;
const SOUNDS={
  step:    [{w:"noise",f0:1,dur:0.07,vol:0.16,cut:420,cut1:180,res:4}],
  click:   [{w:"pulse",f0:1400,pw:0.5,dur:0.03,vol:0.13,cut:5000,res:2}],
  select:  [{w:"pulse",f0:520,f1:1040,pw:0.3,pw1:0.6,dur:0.09,vol:0.2,cut:4200,res:5}],
  deny:    [{w:"saw",f0:190,f1:96,dur:0.22,vol:0.22,cut:1400,cut1:380,res:9}],
  creak:   [{w:"saw",f0:88,f1:150,dur:0.34,vol:0.15,cut:600,cut1:2600,res:12}],
  door:    [{w:"saw",f0:70,f1:128,dur:0.45,vol:0.16,cut:520,cut1:2200,res:13},
            {w:"noise",f0:1,dur:0.12,vol:0.2,cut:300,cut1:110,res:5,dly:0.44}],
  tell:    [{w:"tri",f0:330,f1:520,ring:1.51,dur:0.5,vol:0.18,cut:3000,cut1:5200,res:10},
            {w:"pulse",f0:82,pw:0.12,pw1:0.45,dur:0.55,vol:0.14,cut:900,res:8}],
  gunshot: [{w:"noise",f0:1,dur:0.2,vol:0.3,cut:7000,cut1:260,res:6},
            {w:"pulse",f0:150,f1:48,pw:0.5,dur:0.16,vol:0.26,cut:1600,cut1:300,res:4},
            {w:"noise",f0:1,dur:0.5,vol:0.08,cut:1100,cut1:180,res:9,dly:0.06}],
  ricochet:[{w:"pulse",f0:2400,f1:640,pw:0.08,pw1:0.5,dur:0.26,vol:0.16,
             cut:6000,cut1:1500,res:12}],
  hit:     [{w:"noise",f0:1,dur:0.11,vol:0.26,cut:2400,cut1:200,res:5},
            {w:"tri",f0:120,f1:62,dur:0.18,vol:0.22,cut:900,res:3}],
  wound:   [{w:"noise",f0:1,dur:0.14,vol:0.2,cut:900,cut1:180,res:7},
            {w:"tri",f0:95,f1:58,dur:0.3,vol:0.2,cut:600,res:4}],
  death:   [{w:"saw",f0:220,f1:44,dur:0.8,vol:0.26,cut:3200,cut1:180,res:11},
            {w:"pulse",f0:110,f1:40,pw:0.2,pw1:0.5,dur:0.85,vol:0.18,cut:1200,cut1:200,res:8}],
  holster: [{w:"noise",f0:1,dur:0.09,vol:0.12,cut:1800,cut1:700,res:8},
            {w:"saw",f0:130,f1:96,dur:0.14,vol:0.1,cut:900,cut1:1800,res:11,dly:0.03}],
  /* melodic cues — seq entries are [semitones from f0, start, length]     */
  respect: [{w:"pulse",f0:98,pw:0.3,pw1:0.5,vol:0.21,cut:1100,cut1:1600,res:7,
             seq:[[0,0,0.3],[7,0.32,0.15],[12,0.48,0.55]]},
            {w:"tri",f0:49,vol:0.2,cut:420,res:3,
             seq:[[0,0,0.46],[0,0.48,0.6]]}],
  disgrace:[{w:"pulse",f0:98,f1:92,pw:0.14,pw1:0.06,vol:0.22,cut:1300,cut1:520,res:14,
             seq:[[0,0,0.2],[-1,0.22,0.2],[-3,0.44,0.55]]},
            {w:"tri",f0:49,f1:46,vol:0.18,cut:420,cut1:260,res:5,
             seq:[[0,0,0.55],[-2,0.55,0.55]]}],
  /* An identity sting rather than a melody: a three-note motif, answered twice,
     low in the register. The high voice is a glint, never the lead. */
  title:   [{w:"pulse",f0:146.83,vol:0.19,cut:1500,cut1:2100,pw:0.16,pw1:0.5,res:9,
             seq:[[0,0,0.9],[7,0.95,0.55],[10,1.55,1.5],
                  [0,3.4,0.75],[7,4.2,0.5],[3,4.75,1.1],
                  [0,6.1,1.9]]},
            {w:"tri",f0:73.42,vol:0.2,cut:520,res:3,
             seq:[[0,0,1.55],[0,1.55,1.8],[7,3.4,1.35],[0,4.75,1.3],[0,6.1,1.9]]},
            {w:"pulse",f0:1174.66,pw:0.5,vol:0.035,cut:5200,res:6,
             seq:[[0,1.6,0.14],[7,3.5,0.14],[0,6.2,0.4]]}],
  dusk:    [{w:"pulse",f0:110,pw:0.22,pw1:0.5,vol:0.17,cut:1800,cut1:900,res:8,
             seq:[[0,0,0.5],[-2,0.52,0.5],[-3,1.04,0.4],[-4,1.46,0.4],
                  [-5,1.88,0.45],[-7,2.35,0.6]]},
            {w:"tri",f0:55,vol:0.19,cut:480,cut1:240,res:3,
             seq:[[0,0,1.05],[-5,1.06,1.25],[-12,2.35,1.6]]},
            {w:"pulse",f0:110,pw:0.3,pw1:0.12,vol:0.15,cut:1400,cut1:120,res:12,
             seq:[[-12,2.95,1.5]]}],
  /* ---- the rest of the day: cues for the parts the first table did not cover.
     Data only; the synthesis above is untouched. ---- */

  /* dawn and dusk bracket the day. dawn answers dusk: same idiom, rising. */
  dawn:    [{w:"pulse",f0:146.83,pw:0.26,pw1:0.46,vol:0.17,cut:1400,cut1:2400,res:7,
             seq:[[0,0,0.55],[7,0.58,0.55],[12,1.16,0.55],[19,1.74,1.3]]},
            {w:"tri",f0:73.42,vol:0.2,cut:480,cut1:700,res:3,
             seq:[[0,0,1.13],[7,1.16,1.13],[0,2.32,1.4]]},
            {w:"pulse",f0:1174.66,pw:0.5,vol:0.035,cut:5000,res:6,
             seq:[[0,1.2,0.12],[7,1.8,0.12],[12,2.4,0.4]]}],
  /* the star going on, at the head of the day */
  badge:   [{w:"pulse",f0:523.25,pw:0.22,pw1:0.48,vol:0.17,cut:4000,res:6,
             seq:[[0,0,0.09],[4,0.09,0.09],[7,0.18,0.09],[12,0.27,0.34]]},
            {w:"tri",f0:130.81,vol:0.12,cut:1100,res:3,seq:[[0,0,0.2],[7,0.2,0.42]]}],

  /* arrivals. Who comes up the street is audible before it is visible. */
  hooves:  [{w:"noise",f0:1,dur:0.06,vol:0.2,cut:300,cut1:120,res:6},
            {w:"tri",f0:74,f1:52,dur:0.09,vol:0.2,cut:420,res:4},
            {w:"noise",f0:1,dur:0.06,vol:0.19,cut:320,cut1:120,res:6,dly:0.17},
            {w:"tri",f0:70,f1:50,dur:0.09,vol:0.19,cut:420,res:4,dly:0.17},
            {w:"noise",f0:1,dur:0.06,vol:0.21,cut:340,cut1:130,res:6,dly:0.31},
            {w:"tri",f0:78,f1:54,dur:0.09,vol:0.2,cut:440,res:4,dly:0.31},
            {w:"noise",f0:1,dur:0.07,vol:0.22,cut:300,cut1:110,res:6,dly:0.46},
            {w:"tri",f0:66,f1:46,dur:0.11,vol:0.21,cut:400,res:4,dly:0.46}],
  wagon:   [{w:"noise",f0:1,dur:0.9,vol:0.13,cut:520,cut1:240,res:7},
            {w:"saw",f0:52,f1:63,dur:0.9,vol:0.12,cut:420,cut1:900,res:11},
            {w:"noise",f0:1,vol:0.1,cut:1600,cut1:600,res:9,
             seq:[[0,0.1,0.04],[0,0.34,0.04],[0,0.58,0.04],[0,0.8,0.05]]}],
  spurs:   [{w:"pulse",f0:2100,pw:0.12,pw1:0.4,ring:1.47,vol:0.1,cut:6200,res:11,
             seq:[[0,0,0.05],[3,0.13,0.05],[-2,0.27,0.07]]}],
  crowd:   [{w:"noise",f0:1,dur:0.85,vol:0.11,cut:380,cut1:240,res:5},
            {w:"saw",f0:96,f1:112,dur:0.8,vol:0.06,cut:300,cut1:520,res:8}],
  wind:    [{w:"noise",f0:1,dur:1.3,vol:0.13,cut:280,cut1:1100,res:4},
            {w:"noise",f0:1,dur:0.9,vol:0.08,cut:1400,cut1:320,res:6,dly:0.5}],
  /* The saloon reads from rhythm: off-beats pushed late and played lighter, with
     a flattened third leaning on the major over an oom-pah bass. */
  piano:   [{w:"pulse",f0:196,pw:0.34,pw1:0.18,vol:0.15,cut:2400,res:5,
             seq:[[0,0,0.2],[7,0.32,0.2],[7,0.64,0.2],[4,0.96,0.34]]},
            {w:"pulse",f0:392,pw:0.24,pw1:0.12,vol:0.075,cut:3000,res:6,
             seq:[[4,0.23,0.07],[10,0.55,0.07],[3,0.87,0.07],[0,1.19,0.14]]},
            {w:"tri",f0:98,vol:0.16,cut:700,res:3,
             seq:[[0,0,0.3],[7,0.32,0.3],[0,0.64,0.3],[-5,0.96,0.45]]}],
  /* a killing has a bell after it */
  churchbell:[{w:"tri",f0:220,ring:1.503,dur:1.6,vol:0.42,cut:4200,cut1:1400,res:9},
            {w:"tri",f0:110,dur:1.7,vol:0.3,cut:1400,cut1:600,res:4},
            {w:"tri",f0:219,ring:1.497,dur:1.2,vol:0.26,cut:3600,cut1:1200,res:9,dly:0.9}],
  /* the day moving on between encounters */
  clock:   [{w:"pulse",f0:1800,pw:0.2,dur:0.02,vol:0.1,cut:5200,res:3},
            {w:"noise",f0:1,dur:0.03,vol:0.09,cut:2600,cut1:900,res:4,dly:0.02}],

  /* what the player learns, and what it is worth */
  clue:    [{w:"pulse",f0:660,f1:990,pw:0.35,pw1:0.6,dur:0.13,vol:0.17,cut:4200,res:6},
            {w:"tri",f0:165,vol:0.11,cut:1200,res:3,seq:[[0,0.06,0.2]]}],
  point:   [{w:"pulse",f0:880,f1:1320,pw:0.4,dur:0.05,vol:0.11,cut:5000,res:4}],
  penalty: [{w:"pulse",f0:520,f1:330,pw:0.3,dur:0.09,vol:0.13,cut:2200,cut1:900,res:7}],
  /* a robbery stopped, and a robbery not stopped */
  thread:  [{w:"pulse",f0:392,pw:0.25,pw1:0.5,vol:0.18,cut:3600,res:7,
             seq:[[0,0,0.11],[4,0.11,0.11],[7,0.22,0.11],[12,0.33,0.42]]},
            {w:"tri",f0:98,vol:0.15,cut:1100,res:3,seq:[[0,0,0.33],[12,0.33,0.42]]}],
  alarm:   [{w:"pulse",f0:990,pw:0.5,vol:0.18,cut:4800,res:8,
             seq:[[0,0,0.14],[-5,0.16,0.14],[0,0.32,0.14],[-5,0.48,0.14],
                  [0,0.64,0.14],[-5,0.8,0.18]]},
            {w:"saw",f0:124,dur:1,vol:0.1,cut:600,cut1:1500,res:10}],
  robbery: [{w:"saw",f0:260,f1:58,dur:1.1,vol:0.22,cut:2600,cut1:200,res:11},
            {w:"pulse",f0:98,f1:44,pw:0.2,pw1:0.5,dur:1.2,vol:0.16,cut:1000,cut1:220,res:8},
            {w:"noise",f0:1,vol:0.12,cut:2000,cut1:300,res:6,
             seq:[[0,0.35,0.09],[0,0.62,0.09],[0,0.8,0.12]]}],
  /* slot seven, if it goes that way: a suspended fourth that takes its time
     falling to the third, with a sixth underneath. No triad arpeggio. */
  romance: [{w:"tri",f0:130.81,vol:0.19,cut:1100,cut1:1700,res:4,
             seq:[[0,0,0.55],[5,0.58,0.75],[9,1.36,0.5],[4,1.9,0.95]]},
            {w:"pulse",f0:65.41,pw:0.2,pw1:0.4,vol:0.12,cut:700,res:6,
             seq:[[0,0,1.33],[9,1.36,1.5]]},
            {w:"pulse",f0:1046.5,pw:0.5,vol:0.03,cut:4800,res:5,
             seq:[[9,1.4,0.12],[4,1.95,0.35]]}],

  /* the duel, either side of the tell */
  tension: [{w:"tri",f0:58,f1:44,dur:0.2,vol:0.5,cut:520,cut1:220,res:6},
            {w:"tri",f0:56,f1:42,dur:0.24,vol:0.44,cut:480,cut1:200,res:6,dly:0.36}],
  cock:    [{w:"noise",f0:1,dur:0.025,vol:0.14,cut:3200,cut1:1400,res:7},
            {w:"pulse",f0:1250,pw:0.15,dur:0.03,vol:0.12,cut:4800,res:5,dly:0.05},
            {w:"noise",f0:1,dur:0.03,vol:0.11,cut:2400,cut1:900,res:6,dly:0.08}],
  aim:     [{w:"pulse",f0:300,f1:620,pw:0.18,pw1:0.44,dur:0.11,vol:0.12,
             cut:1400,cut1:3800,res:9}],
  dryfire: [{w:"noise",f0:1,dur:0.03,vol:0.13,cut:2600,cut1:800,res:6},
            {w:"saw",f0:180,f1:70,dur:0.13,vol:0.12,cut:900,cut1:300,res:9,dly:0.02}],
  graze:   [{w:"pulse",f0:1800,f1:380,pw:0.1,pw1:0.5,dur:0.2,vol:0.14,
             cut:5200,cut1:900,res:13},
            {w:"noise",f0:1,dur:0.16,vol:0.1,cut:3000,cut1:600,res:8,dly:0.02}],
  reload:  [{w:"noise",f0:1,vol:0.1,cut:2800,cut1:1200,res:7,
             seq:[[0,0,0.025],[0,0.11,0.025],[0,0.22,0.025],[0,0.33,0.025],
                  [0,0.44,0.03]]},
            {w:"pulse",f0:900,pw:0.2,vol:0.07,cut:3600,res:5,
             seq:[[0,0.06,0.02],[0,0.17,0.02],[0,0.28,0.02],[0,0.39,0.02],[0,0.5,0.04]]}],

  /* the doctor: the bottle, or the patch-up */
  bottle:  [{w:"tri",f0:1560,ring:1.49,dur:0.22,vol:0.13,cut:5600,cut1:2200,res:12},
            {w:"noise",f0:1,dur:0.04,vol:0.14,cut:900,cut1:280,res:5,dly:0.24},
            {w:"tri",f0:1480,ring:1.51,dur:0.18,vol:0.09,cut:5200,cut1:2000,res:12,dly:0.3}],
  patch:   [{w:"tri",f0:329.63,vol:0.15,cut:2000,res:4,seq:[[0,0,0.22],[5,0.24,0.44]]},
            {w:"pulse",f0:164.81,pw:0.3,pw1:0.5,vol:0.1,cut:1600,res:6,
             seq:[[0,0,0.22],[5,0.24,0.44]]}]
};
const GATE={step:90,click:30,hit:60,ricochet:70};
const SND=(function(){
  const AC=window.AudioContext||window.webkitAudioContext;
  let ac=null,bus=null,nz=null,on=true; const lastAt={};
  function noiseBuf(c){                       // SID's 23-bit LFSR
    const n=(c.sampleRate*2)|0, b=c.createBuffer(1,n,c.sampleRate), d=b.getChannelData(0);
    let r=0x7ffff8, held=1, acc=0; const inc=(SID_CLK/256)/c.sampleRate;
    for(let i=0;i<n;i++){ acc+=inc;
      while(acc>=1){ acc-=1;
        const fb=((r>>22)^(r>>17))&1; r=((r<<1)|fb)&0x7fffff; held=(r&0x100000)?1:-1; }
      d[i]=held; }
    return b;
  }
  function ctx(){
    if(!AC)return null;
    if(!ac){ ac=new AC(); bus=ac.createGain(); bus.gain.value=0.3;
             bus.connect(ac.destination); nz=noiseBuf(ac); }
    if(ac.state==="suspended"){try{ac.resume();}catch(e){}}
    return ac;
  }
  /* a pulse of variable width: saw minus the same saw delayed by width/f */
  function pulseSource(c,v,t0,dur,steps){
    const a=c.createOscillator(), b=c.createOscillator(), inv=c.createGain();
    const dl=c.createDelay(0.05), out=c.createGain();
    a.type="sawtooth"; b.type="sawtooth"; inv.gain.value=-1;
    steps.forEach(({t,f,pw})=>{
      a.frequency.setValueAtTime(f,t); b.frequency.setValueAtTime(f,t);
      dl.delayTime.setValueAtTime(Math.min(0.049,Math.max(0.0001,pw/f)),t); });
    a.connect(out); b.connect(inv); inv.connect(dl); dl.connect(out);
    a.start(t0); b.start(t0); a.stop(t0+dur+0.05); b.stop(t0+dur+0.05);
    return out;
  }
  function voice(v,t0base){
    const c=ctx(); if(!c)return;
    const notes=v.seq||[[0,0,v.dur]];
    for(const [st,ns,nd] of notes){
      const t0=t0base+(v.dly||0)+ns, dur=nd, mul=Math.pow(2,st/12);
      const n=Math.max(2,Math.round(dur/FRAME));
      const steps=[];
      for(let k=0;k<=n;k++){ const u=k/n;
        steps.push({ t:t0+u*dur,
          f:sidF((v.f1?v.f0*Math.pow(v.f1/v.f0,u):v.f0)*mul),
          pw:(v.pw==null?0.5:(v.pw1==null?v.pw:v.pw+(v.pw1-v.pw)*u)),
          cut:sidCut(v.cut1?v.cut*Math.pow(v.cut1/v.cut,u):(v.cut||8000)),
          g:sid4((v.vol==null?0.2:v.vol)*Math.pow(1-u,1.5)) }); }
      let src;
      if(v.w==="pulse") src=pulseSource(c,v,t0,dur,steps);
      else if(v.w==="noise"){ const s=c.createBufferSource();
        s.buffer=nz; s.loop=true; s.start(t0); s.stop(t0+dur+0.05); src=s; }
      else { const o=c.createOscillator(); o.type=v.w==="saw"?"sawtooth":"triangle";
        steps.forEach(s=>o.frequency.setValueAtTime(s.f,s.t));
        o.start(t0); o.stop(t0+dur+0.05); src=o; }
      let node=src;
      if(v.ring){                              // ring modulation: multiply by a second voice
        const rg=c.createGain(); rg.gain.value=0;
        const m=c.createOscillator(); m.type="triangle";
        steps.forEach(s=>m.frequency.setValueAtTime(sidF(s.f*v.ring),s.t));
        m.connect(rg.gain); node.connect(rg); m.start(t0); m.stop(t0+dur+0.05);
        node=rg;
      }
      const flt=c.createBiquadFilter();
      flt.type="lowpass"; flt.Q.value=0.7+(v.res==null?4:v.res)*0.75;
      steps.forEach(s=>flt.frequency.setValueAtTime(s.cut,s.t));
      const env=c.createGain();
      steps.forEach(s=>env.gain.setValueAtTime(s.g,s.t));
      env.gain.setValueAtTime(0,t0+dur+0.002);
      node.connect(flt); flt.connect(env); env.connect(bus);
    }
  }
  function play(name){
    if(!on)return; const list=SOUNDS[name]; if(!list)return;
    const ms=GATE[name];
    if(ms){const t=performance.now(); if(lastAt[name]&&t-lastAt[name]<ms)return; lastAt[name]=t;}
    const c=ctx(); if(!c)return;
    list.forEach(v=>voice(v,c.currentTime));
  }
  const API={unlock(){ctx();}, get on(){return on;},
    toggle(){on=!on; if(on){ctx();play("select");} return on;}};
  Object.keys(SOUNDS).forEach(k=>API[k]=()=>play(k));
  return API;
})();
