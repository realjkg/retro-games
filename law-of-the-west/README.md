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

**The four intents.** Every turn offers one of each, and the writing says what
each one does to the state: *conciliate* lowers tension and invites being
handled, *probe* buys information at the cost of insult or suspicion, *command*
asserts the badge and provokes proud men, *threaten* ends a scene fast at a
price in reputation and draw risk. Three turns, then the encounter settles on the
first ending whose conditions hold.

**State, not scripting.** Each encounter carries respect, fear, suspicion,
evidence and draw risk; the town carries safety, the clues collected and the
sheriff's standing. Endings are authored with conditions over those variables —
`[["evidence",">=",2]]` — so an encounter can settle peacefully, leave a clue
that matters later, create a consequence, or become a duel, without a line of
one-off branching code. Draw risk crossing a man's patience is what starts a
gunfight; a point of temper either way each turn means the same four answers do
not always land on the same side of it.

**Two modes, one pad.** Up draws: the gun hand comes up, a crosshair appears over
the scene and the dialogue lines go dim. The pad moves the crosshair; down walks
it back and, pulled past the bottom, holsters — as do HOL and Escape, which hand
the conversation back. Drawn guns are not tolerated for long: a hidden reflex
timer of 1.5 to 2.6 seconds runs while yours is out, and an armed man answers it.

**The shooting.** His gun box and centre mass are separate, and the gun box
follows his hand as it rises. Shooting the gun out of his hand disarms and
arrests; centre mass kills. Draw latency and aim spread are tracked apart: a fast
shot is a wide one, so rushing turns a killing shot into a wounding one, and a
slow one lets him fire first. Killing where a wound would have done costs
standing, and shooting a man whose hand never moved is murder — violence is
always available and always expensive.

**Full screen.** The game launches in it: pinning on the badge is a user gesture,
which is the only moment a browser will grant fullscreen, so that is when it is
asked for. `EXIT`, the `g` key or `F11` stays in the page instead, and that
choice is the one remembered. The page also carries the web-app meta tags, so
adding it to a phone's Home Screen launches it with no browser chrome at all.
`FULL`, `g` or `F11` hands the whole screen to the game:
browser fullscreen where the API allows it, the page's own gestures stopped so a
pinch or a long press cannot interrupt a held direction, and the screen kept
awake. On a phone in portrait the scene takes the top and the words and controls
the bottom; turn it to landscape and the scene moves to one side with the words
and the pad on the other, so a thumb never crosses the street. The choice is
remembered, so the next day starts in it. iPhone Safari allows no element
fullscreen; the layout still applies, and adding the page to the Home Screen
removes the browser's chrome.

**Wounds.** A wound is carried, not cured: the day goes on until there is one too
many. A favour banked with somebody in town buys one of them back.

**Sundown.** Seven categories — crimes solved, interactions, pacifism,
marksmanship, lawfulness, judgement, romance — and a rating from 1 to 12 with a
verdict in words. Standing is on screen all day, not just at the end.

## The anthology

Six original encounters on the design grammar of the 1985 game — a visitor with
a public pretext and a concealed motive, four sharply distinct attitudes, state
that moves, and violence that is possible but costly. None of the original's
characters, plot or dialogue is used.

| Encounter | Surface | Hidden | Core | Dialogue |
| --- | --- | --- | --- | --- |
| The Brass-Button Deputy | Demands custody of a prisoner | His warrant may be fabricated | authority | **written** |
| The Rainmaker | Wants permission to hold a revival | Collecting for someone dangerous | trust | pending |
| The Quiet Surveyor | Requests town records | Scouting for a railroad takeover | suspicion | pending |
| The Widow's Ledger | Says her husband's debt was forged | Her own books hold a secret | evidence, and the favour | **written** |
| The Piano Tuner | Says his instrument case was stolen | The case holds coded messages | perception | pending |
| The Boy With the Locket | Asks the sheriff to find a missing parent | The missing person may be fleeing | mercy | pending |

The Deputy was written first because one scene exercises everything: evidence,
authority, a hidden identity, a peaceful resolution, a consequential wrong
choice, and a draw that can be justified or not. Its four endings are the
forgery exposed, the prisoner escorted out on paper, a stand-off nobody wins,
and the handover that costs the town its payroll.

The Widow's Ledger came second because it owns the only durable favour in the
anthology. Read her ledger properly while treating her decently and she banks
one with the sheriff; frighten her and she owes him nothing. Her four endings
are that favour, the forged debt voided, her own quiet payments dug up at the
cost of her standing, and the closed book. The favour is spent once, later, when
a bullet would otherwise leave the sheriff in the street.

## Decisions taken, so they are not buried in code

- **Endings are data.** Conditions are `[variable, operator, value]` triples with
  a fallback last, validated by a test, so writing an encounter never means
  touching a rule.
- **Evidence is what probing buys.** Conciliating built evidence as well in the
  first draft, so the calm path exposed the forgery in 91% of runs; now
  conciliation earns respect and an escort, and probing earns the forgery.
- **One geometry.** Figure, hitboxes and crosshair share `SCENE`, `FIG` and
  `HITBOX`, with a test asserting that what the crosshair is over is what the
  bullet finds.
- **Drawing first cannot lose a race.** Only a man who drew on you can outshoot
  you; drawing first risks the reflex timer, not his speed.
- **No physician in the anthology**, so the original's doctor rescue became a
  banked favour, and the Widow owns it: a wagon nobody sent comes up the street
  and gets the sheriff off it. One use, consumed explicitly, tested across
  encounters rather than in isolation.
- **An ending may be less than certain.** Endings carry an optional `chance`, so
  a man can nearly tell you and then not. Without it an unarmed visitor was
  perfectly deterministic — the Widow ended the same way 100 times out of 100
  for each attitude — because draw-risk temper was the only variation in the
  model. A social reading of the sheriff now jitters by a point each turn too,
  while evidence never does: the ledger says what it says.

## Numbers

From `node --test test/*.test.js`, with fixture turns standing in for the five
unwritten encounters:

- **Both written encounters, 500 runs each with the intent picked at random.**
  The Deputy: forgery 135, escorted 85, handover 45, stand-off 27, and 208 that
  became gunfights. The Widow: debt voided 200, favour banked 153, closed book
  111, her secret dug up 36. Every authored ending reached in both, nothing over
  60%.
- **One intent held all three turns.** The Deputy — conciliate escorts him out
  79/100, probe exposes the forgery 65/100, command splits four ways with no
  outcome over 27%, threaten always ends in gunsmoke at 37/32/31. The Widow —
  conciliate banks the favour 79/100, probe digs up her secret 65/100, command
  voids the debt 98/100, threaten sends her home every time. An attitude has a
  signature without a certainty, except where the writing means it absolutely.
- **2000 duels, 140–1400 ms.** Hit 59% at 200 ms, 66% at 300, 79% at 400, 82% at
  600, then falling as he gets there first: beaten to the shot 2% at 600 ms, 27%
  at 800, 66% at 1000. Arm, centre mass and miss all occur throughout.
- **Wounds.** One carries; the Widow's favour, if banked, takes the sheriff off
  the street instead and is consumed; the second wound is fatal and rates the
  day at 1. Tested end to end: earned in her scene, spent in a later one, never
  twice, and never earned at all by a sheriff who frightened her.
- **Audio.** 42 cues, nothing non-finite, negative or out of range. Title 8.05 s,
  dusk 4.50 s, dawn 3.77 s, romance 2.91 s, saloon 1.46 s, respect 1.13 s,
  disgrace 1.15 s; peaks 0.12 to 0.29.
- **The page.** Real `pointerdown` and `keydown` events at every control in
  jsdom: the day starts, all four lines select and speak by tap and by number
  key, up draws, the crosshair moves, down and Escape holster, fire shoots, a
  full day reaches sundown with a 1-to-12 rating over seven categories, and FIRE
  restarts. Every `data-cmd` has a handler and every handler is reachable.

## What the game still needs

- **Four encounters' dialogue**: the Rainmaker, the Surveyor, the Tuner and the
  Boy, each three turns of four intents with a reaction and an effect per reply,
  and two to four endings. `DIALOGUE` and `endings` in `content.js` are where
  they go; the Deputy and the Widow are the worked examples.
- Each remaining scene wants its own resource focus — fear, standing, safety or
  clues — so the day is not four more evidence hunts.

## Credit

Inspired by Law of the West (Accolade, 1985), designed by Alan Miller. Original
game music and sound effects by Ed Bogas.

This project is an independent, unofficial reinterpretation. Its code, writing,
artwork, and audio are newly created and do not reproduce the original game's
dialogue, audiovisual assets, or musical compositions.

## The music

Original material in the SID idiom, not a transcription and not a reworking of
the original score. The identity aimed at is dusty frontier and saloon tension,
and one rule carries it: the lead sits an octave below a bright arcade SID lead,
with the high register kept for short glints, draw stings and saloon accents.

- **title** — an identity sting rather than a melody: a three-note motif answered
  twice over an open-fifth drone, 8.05 s.
- **dawn** — the bass an octave down, slower movement, open fifths.
- **dusk** — the same intervals closing downward, a chromatic descent into the
  cadence, and the filter shutting over the final note.
- **romance** — a suspended fourth taking its time falling to the third, a sixth
  underneath, no triad arpeggio.
- **piano** — off-beats pushed late and played lighter, a flattened third leaning
  on the major, oom-pah bass.
- **respect** — low octaves and fifths in a dotted figure: authority, not a
  positive stinger.
- **disgrace** — a narrow pulse with a pitch fall and the resonance brought up.

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
