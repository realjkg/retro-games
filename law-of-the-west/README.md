# Law of the West — Gold Gulch

A browser recreation of the 1985 Accolade release for the Commodore 64, built to
play the way the original played. Part of [retro-games](../README.md); it will be
served at `/retro-games/law-of-the-west/` once the dialogue is in.

**Not playable yet.** The engine, the page and the audio are built and tested;
the dialogue table is empty, so the encounters have nothing to say. Nothing is
linked from the collection until it does.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | The deliverable: one self-contained page, everything inline, 52 KB |
| `page.html` | The markup and CSS shell, with a `/* SCRIPTS */` marker |
| `sid-audio.js` | The supplied SID-idiom synth, engine untouched, 42 cues in `SOUNDS` |
| `content.js` | The cast, the scene geometry and the hitboxes; `DIALOGUE` awaits lines |
| `engine.js` | Rules only: state machine, trust, the duel, the doctor, threads, scoring |
| `ui.js` | The two zones, the five-line matrix, dual-mode input, one rAF loop |
| `tools/assemble.js` | Writes `index.html` from the shell and the four scripts |
| `tools/render-sounds.js` | Renders the cue table to wavs for auditioning |
| `tools/check-audio.js` | Drives every cue through the runtime with a stubbed AudioContext |
| `test/` | The harness, the throwaway fixture dialogue, and the tests |

```
node tools/assemble.js       # index.html, and the size against the 120 KB budget
node --test test/*.test.js   # 16 tests; numbers land in test/last-report.json
node tools/render-sounds.js  # 42 wavs plus 00-all-sounds.wav (gitignored)
```

`index.html` is committed and is what runs; the four scripts exist so the source
can be edited in pieces. Opening `index.html` from the file system and serving it
from Pages behave identically — no external requests of any kind, asserted by a
test.

## How it plays

**Two static zones.** The scene fills the top half, framed from behind the
sheriff's holster: his own arm and gun across the low right, the visitor facing
the camera, the building behind him. The five-line matrix fills the bottom: the
visitor's line in its own colour, then four responses. The scene block-loads in
rows before anything is live, and the choices do not take input until it has.

**The attitude quad.** Every beat offers one of each: apologetic, neutral, cocky,
aggressive. Each character reads them his own way — a nervous newcomer takes
aggression badly, Little Willy warms to cheek, the Mexicali Kid reads an apology
as weakness. Three beats, then the encounter settles.

**Two modes, one pad.** Up draws: the gun hand comes up, a crosshair appears over
the scene and the dialogue lines go dim. The pad then moves the crosshair; down
walks it back down and, pulled past the bottom, holsters — as do HOL and Escape,
which hand the conversation back. Drawn guns are not tolerated for long: a hidden
reflex timer of 1.5 to 2.6 seconds runs while yours is out, and an armed man
answers it.

**The shooting.** His gun box and centre mass are separate, and his gun box
follows his hand as it rises. Shooting the gun out of his hand disarms and
arrests him; centre mass kills. Draw latency and aim spread are tracked apart:
a fast shot is a wide one, so rushing turns a killing shot into a wounding one,
and a slow one lets him fire first. A killing where a wound would have done costs
standing, and shooting a man whose hand never moved is murder.

**Being shot.** Exactly as far as the doctor is willing: insult the only doctor
in Gold Gulch and the first bullet ends the day; leave him civil and he patches
you up once; after that a wound is a wound until there is one too many.

**Threads.** Three robberies — train, stage, bank. Fragments come from A Dude,
Miss Rose, the Doctor, Little Willy and Miss April, and Miss April's costs the
romance. What nobody stopped happens at dusk.

**Sundown.** Seven categories — crimes solved, interactions, pacifism,
marksmanship, lawfulness, judgement, romance — and a rating from 1 to 12 with a
verdict in words. Standing is on screen all day, not just at the end.

## Decisions taken, so they are not buried in code

- **Ten encounters.** The supplied cast is ten characters plus the Sheriff. The
  technical brief says eleven; the cast list is what ships, so the day ends on
  Belle. Name an eleventh and it slots straight in.
- **Disclosure is weighed, not gated.** `P = 1/(1+e^-((trust-need)/2.5))`. Hard
  thresholds made the same answers always end the same way.
- **A settled man can still turn**, on a per-character chance that rises once he
  is riled.
- **One geometry.** The figure constants, the hitboxes and the crosshair share
  `SCENE`, `FIG` and `HITBOX` in `content.js`, and a test asserts that what the
  crosshair is over is what the bullet finds.
- **Drawing first cannot lose a race.** Only a man who drew on you can outshoot
  you; drawing first risks the reflex timer, not his speed.
- **Fragments** (open): one fragment stops a job. The Deputy's slot triggers
  whichever job you hold nothing for, preferring the bank he reports.
- **Belle's alliance** (open): counts towards judgement and standing, with no
  fourth crime attached.

## Numbers

From `node --test test/*.test.js`, with the fixture dialogue standing in:

- **500 days, choices at random, twice over.** An agent that also draws on people
  at random: run out of town 198, buried 121, sheriff 92, constable 63,
  probation 24, marshal 2. An agent that only talks: sheriff 211, constable 111,
  buried 84, probation 44, marshal 41, run out of town 9. Every ending occurs and
  none exceeds 60%. Robberies stopped per day, talking agent: none 95, one 192,
  two 171, all three 42.
- **2000 duels, 140–1400 ms.** Hit rate 59% at 200 ms, 66% at 300, 79% at 400,
  81% at 600, then falling away as he gets there first: beaten to the shot 3% at
  600 ms, 32% at 800, 71% at 1000, 99% at 1200. Arm, centre mass and miss all
  occur throughout. Winnable at human speed, and rushing costs accuracy.
- **Doctor.** Treated 146, refused 54 of 200. Wounded with him already spent:
  died 24, lived 176.
- **Audio.** 42 cues, 2164 nodes, 36,083 scheduled values, nothing non-finite,
  negative or out of range.
- **The page.** Loaded in jsdom with real `pointerdown` and `keydown` events at
  every control: the day starts, all four lines select and speak by tap and by
  number key, up draws, the crosshair moves, down and Escape holster, fire
  shoots, a full day reaches sundown with a 1-to-12 rating and seven categories,
  and FIRE restarts. Every `data-cmd` in the markup has a handler and every
  handler is reachable — asserted, because a delegated selector that covers some
  attributes and not others is how a whole path goes dead while headless
  simulations pass clean.

Where the brief is not met: its variance rule asks that no single choice path
repeat an outcome more than 80% of the time. 11 of 40 character-and-tone paths
still do. The Deputy's four are structural — whether the bank job is stopped
depends on the fragments in hand — and the rest are decisively cold or hot paths
on unarmed characters, where trust deciding the outcome is the point. Every
character has at least one path that varies; the matrix is in the report.
Raising `RULES.TEMP` satisfies the rule and makes choices matter less.

## What the game still needs

- **The dialogue table.** Ten characters, three beats: the line, four written
  responses on the attitude quad, and a reaction to each. `DIALOGUE` in
  `content.js` is where it goes, keyed by character and beat.
- **Four answers**: the gang's name (the James Gang, per the cast list, or the
  Daltons), whether an eleventh encounter exists, what counts as enough
  fragments, and whether Belle's alliance carries a crime.

## Credit

Inspired by Law of the West (Accolade, 1985), designed by Alan Miller. Original
game music and sound effects by Ed Bogas.

This project is an independent, unofficial reinterpretation. Its code, writing,
artwork, and audio are newly created and do not reproduce the original game's
dialogue, audiovisual assets, or musical compositions.

## The music

Original material in the SID idiom, not a transcription and not a reworking of
the original score. The identity aimed at is dusty frontier and saloon tension:
Dorian colour with a flat seventh, open-fifth drones under a lead that calls and
answers, and a swung honky-tonk figure with a flattened third for the saloon.
The title cue runs 11.4 s over three voices at a walking pace; dawn and dusk are
the same intervals opening upward and closing downward; the saloon figure swings
long-short over an oom-pah bass.

The sound effects — the gunshot, the tell, the bells, the doctor's bottle — are
unchanged from the supplied table, and the synthesis itself has never been
touched. `node tools/render-sounds.js` renders any of it to wav for auditioning.

## What is faithful, and what is not

Not an emulator, a port, or a copy of the original's content. The structure is
the 1985 design's: the split screen and the holster-level view, the five-line
matrix and the attitude quad, dual-mode draw and holster, the reflex timer,
separate weapon and lethal boxes, the doctor deciding whether a bullet is
survivable, and a rated day at sundown. The art, the audio, the numbers and the
prose are new, and nothing from the original's code, artwork, script or sound is
reused.
