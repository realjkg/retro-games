# Law of the West — Gold Gulch

An original recreation of the structure and feel of the 1985 Accolade release
for the Commodore 64. Part of [retro-games](../README.md), served at
[/retro-games/law-of-the-west/](https://realjkg.github.io/retro-games/law-of-the-west/).

One day as the sheriff of Gold Gulch: eleven callers in the documented order,
three exchanges each with four answers every time, robberies you either stood in
front of or read about afterwards, and a reckoning at sundown. Everything is
newly written, drawn and composed — see **What is faithful, and what is not**.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | The deliverable: one self-contained page, everything inline, 133 KB |
| `page.html` | The markup and CSS shell, with a `/* SCRIPTS */` marker |
| `sid-audio.js` | The SID-idiom synth, 54 cues; the synthesis is untouched |
| `content.js` | The eleven callers, the three robberies, the figures and the hitboxes |
| `engine.js` | Rules only: the day, the trees, the duel, the doctor, the reckoning |
| `ui.js` | The street, the figures, the five-line matrix, the input, one rAF loop |
| `tools/assemble.js` | Writes `index.html` from the shell and the four scripts |
| `tools/render-sounds.js` | Renders the cue table to wavs for auditioning |
| `tools/check-audio.js` | Drives every cue through the runtime with a stubbed AudioContext |
| `test/` | The sandbox harness and the tests |

```
node tools/assemble.js       # index.html, and its size against the 160 KB budget
node --test test/*.test.js   # 31 tests; numbers land in test/last-report.json
node tools/render-sounds.js  # 54 wavs plus 00-all-sounds.wav (gitignored)
```

`index.html` is committed and is what runs; the four scripts exist so the source
can be edited in pieces. Opening it from the file system and serving it from
Pages behave identically — no external requests of any kind, asserted by a test.

## The day

Eleven callers, in this order, each with his own tree, his own figure and his
own entrance theme:

| # | Caller | What the encounter is for | Where it can end |
| ---: | --- | --- | --- |
| 1 | A Dude | Takes the measure of the new sheriff | train tip · peaceful exit · offence · a draw |
| 2 | Miss Rose | The saloon, and who has been asking about the coach | stage tip · a Saturday · ordinary exit · cold |
| 3 | The Mexicali Kid | A wanted man testing the badge | surrender · ride on · delayed draw · a duel |
| 4 | The Doctor | Objects to what the law leaves him to sew up | bank tip · his goodwill · his contempt · coffee |
| 5 | Dude with a New Gun | Shows off the gun, then says why he bought it | put away · bank tip · arrest · ambush |
| 6 | Little Willy | A boy who saw something and was paid not to say | bank tip · keeps his promise · sent home · frightened |
| 7 | Miss April | The schoolhouse window looks down on the cut | train tip · a Saturday · ordinary exit · alienated |
| 8 | The Gambler | Eleven honest nights and a holdout clip | arrest · repayment · departure · turn-and-shoot |
| 9 | The Deputy | Runs in with something he is not sure he saw | bank warning · dismissed · his standing either way |
| 10 | Belle | Two steers with the wrong burn, and three years of grievance | surrender · drives them back · a dance · a duel |
| 11 | The Last Gunfighter | Says nothing at all | a forced duel |

Every ordinary screen is one line from the caller and four replies, and no
conversation runs past three exchanges. Drawing is never one of the four: the
gun is always available and always interrupts. A caller can draw at once, wait
and turn back, put his hands up, or simply leave.

**The robberies.** Three jobs fall between callers — the stage after the fourth,
the westbound after the eighth, the bank after the tenth — and each sits after
everybody who could have warned about it. Warned, the sheriff is standing in
front of it with his gun still in the leather, and it opens as an ambush;
unwarned, he reads about it afterwards and it counts against him.

**The doctor.** He is the difference between a wound and a grave, and he is in
one of five states by the time he is needed: dead (the sheriff can shoot him,
and there is no other one), hostile, drunk, neutral, or civil. Only a civil,
sober doctor patches the sheriff up and lets the day go on; drunk and neutral
each carry one wound and no more; hostile and dead make the first ball the last
thing that happens. Whether he has been drinking is settled before the day
starts — his scene opens differently when he has — and coffee, poured and stood
over, is what does something about it.

**Sundown** reports the original seven dimensions: authority maintained, crooks
captured, romance, bad guys shot, wounds survived, innocents killed, and crimes
missed, plus a total. No rating titles, no percentages.

## How it looks

A 320×200 logical picture presented in 4:3, the way the machine was, scaled with
nearest neighbour, and framed the way the 1985 game framed it.

**A flat row of storefronts across the back**, under a dark sky with stepped
cloud banks and a ridge of hills: five false fronts of differing heights and
colours, upstairs windows lit or dark, awnings, doors, a boardwalk along the
whole run and a tree standing out in front of it. Gold Gulch keeps the same
concerns either side every day — HANLEY'S, the ASSAY OFFICE, the LIVERY, the
TELEGRAPH — and the big board over the middle front names whichever one this
caller has come out of: Maguire's Saloon, Dr Finch Surgeon, the Gold Gulch
Hotel, School and Jail, Belle Hollister's, the J P Morgan Bank, Morgan Express
Co, and the Gold Gulch & Western where the westbound slows. Long names take two
lines and every board drops a point at a time until it fits the front it is
nailed to. In front of it the street is grey dirt with stones and ruts, and
three people on the boardwalk who leave the moment a gun comes out.

**One large thing parked in the near right**, chosen by the place: a stagecoach
with spoked wheels, a locomotive with its smokebox door and cowcatcher and the
rails running out of frame, barrels, crates, or a corral fence in perspective.

**The sheriff's own arm is the foreground.** A sleeve billows in from the left
edge at the height of the caller's chest — shaded as cloth, with the light along
the top of the arm, the shadow beneath it and folds running its length — into a
dark cuff, a black fist and the revolver — cylinder, hammer and a level barrel reaching most of the
way across to the man he is talking to. 44×26 cells at three pixels each, the
largest thing on the screen. His face is the one part of him the player never
sees; when the gun is holstered the same arm holds it muzzle-down.

Everything is stepped a column at a time with integer edges, so the diagonals
stair the way a bitmap's do, and the palette is the C64's sixteen colours.

**Eleven figures, no template.** Each caller is his own 24×28 grid, one pixel
across and two down — 24 by 56 on screen, the proportions a man has at this
distance rather than the squat block a square cell gave. The silhouette is
stamped a pixel larger in black and the colours laid over it, which gives a
one-pixel rim at any size: the Kid's sombrero, Rose's
skirt, the Doctor's bag, the new gun carried across the chest, Willy's height,
April's slate, the Gambler's tails, the Deputy's long gun, Belle's rope, and the
last man in black. Each carries its own hitboxes, so the bullet finds what the
crosshair is over whether a man keeps his gun on his hip or across his chest,
and its own overlay for the hand coming up. Hands-up is an overlay any of them
can wear.

The five-line matrix fills the rest, set the way the machine set it: upper case,
one width per character, tightly stacked, the caller's line in its own colour
above four replies. Nothing a character says may be cut off or hidden behind a
scroll, so the type steps down until all five fit, and a content check caps line
lengths at the source. The picture itself carries no chrome — who is in front of
you, where you are in the day and how it is going live in a strip above it.

## How it plays

**Two modes, one pad.** Up draws: the gun hand comes up, a crosshair appears and
the replies go dim. The pad moves the crosshair; down walks it back and, pulled
past the bottom, holsters — as do HOL and Escape. Drawn guns are not tolerated:
a hidden reflex timer of 1.5 to 2.6 seconds runs while yours is out, and an
armed man answers it.

**The shooting.** Weapon box and centre mass are separate and follow the drawn
frames. Shooting the gun out of an armed man's hand disarms and arrests; centre
mass kills. An unarmed caller has nothing to shoot out of his hand, and the
street can see that as well as the sheriff can. Draw latency and aim spread are
read apart: a fast shot is a wide one, so rushing turns a killing shot into a
wounding one, and a slow one lets him fire first. Shooting a man whose hand
never moved is murder. Violence is always available and always expensive.

**Full screen.** The game launches in it: pinning on the badge is a user
gesture, which is the only moment a browser grants fullscreen. `EXIT`, `g` or
`F11` stays in the page, and that choice is remembered. Upright, the scene zone
is exactly 4:3 and the words take the rest; turn to landscape in game mode and
the scene moves to one side with the words and the pad on the other. iPhone
Safari allows no element fullscreen; the layout still applies, and adding the
page to the Home Screen removes the browser's chrome.

## The music

Original material in the SID idiom, not a transcription and not a reworking of
anything. The identity is dusty frontier and saloon tension, and one rule
carries it: the lead sits an octave below a bright arcade SID lead, with the
high register kept for short glints and draw stings.

Twelve themes in two or three voices, 1.2 to 3.2 seconds, one for each caller
and one for a robbery in progress. Each is written to the character's job in the
day rather than to a tune: open fifths that ask and do not answer for the first
man up the street; oom-pah bass and a flat third leaning on the major for the
saloon; a dotted figure with a flattened second and boot leather in the noise
for the Kid; a slow falling minor for the doctor; a fanfare that reaches one
note further than it can hold for the man with the new gun; something small and
quick for Willy; a suspended fourth taking its time about falling to the third
for Miss April; a chromatic walk under a lead that never lands on the beat for
the Gambler; a military dotted figure that puts a foot wrong for the Deputy;
wide open intervals and no ornament for Belle; and for the last one, not a tune
at all — a drone, a tritone over it, and one glint.

A theme runs on its own gain node, so a gun leaving the leather cuts it off
mid-bar, and so does the resolution of the encounter it opened. That is the only
change to the audio module: the synthesis itself has not been touched.

**How it sequences.** Nothing loops under the dialogue; the day is scored in
short cues placed on the things that happen.

| When | What plays |
| --- | --- |
| The title screen | `title`, on the first tap or key — the only moment audio can start |
| Pinning on the badge | `dawn`, then `badge` |
| A caller arriving | `door`, boots at 260 ms, then whatever his own arrival is — hooves, a wagon, spurs, a crowd, the piano — and at 700 ms his entrance theme |
| Moving the cursor, choosing a line | `click`, then `select` |
| Drawing | the theme is **cut**, then `holster`, `cock`, and `aim` 140 ms later |
| Aiming | `click` per step |
| His hand moving | `tell` and `tension`, with the theme cut |
| Firing | `gunshot` with the muzzle flash; `dryfire` if that chamber is spent |
| The shot landing | `ricochet` and `wound` for a disarm, `hit` and `death` for a kill, `ricochet` then `graze` for a miss, `hit` for a wound taken, `patch` 400 ms after the doctor reaches you |
| A kill | `churchbell` at 900 ms; `reload` at 1200 ms after any shot |
| A tip, an arrest, an offence | `tipoff` and `point`, `respect` and `thread`, `penalty` |
| Walking on | `clock` and `wind`, then the next caller's arrival |
| A robbery | `th_job` on the brief; `alarm`, `tell` and `tension` when you ride into it, or `alarm` and `robbery` when you hear about it afterwards |
| Sundown | the theme cut, `dusk`, then `respect` or `disgrace` at 700 ms |

**Sound test.** Line 2 of the title screen opens a screen that walks all 54 cues
by name and class, so the pistol, the ricochet, the reload, the church bell and
the eleven entrance themes can all be heard without playing a day to reach them.
Play, next, previous, back are the same four lines the rest of the game uses. A
test drives the whole list and asserts every cue in `SOUNDS` is reachable
through it.

The effects — the gunshot, the tell, the bells, the doctor's bottle, the alarm —
are the supplied table. `node tools/render-sounds.js` renders any of it to wav.

## Numbers

From `node --test test/*.test.js` and 500 simulated days:

- **Coverage.** Ten trees of three exchanges; the eleventh caller never speaks.
  Every node reachable, every authored ending reached, every action class —
  draw, ambush, delayed, surrender, depart — used by somebody. No visitor line
  over 150 characters, no reply over 92.
- **500 days**, replies chosen at random. 321 sheriffs saw sundown. Every
  terminal in the game was reached at least eighteen times; scores ran −380 to
  1340 with a median of 420. Tips: the bank warning reached 418 days, the train
  244, the stage 196. 531 robberies of about 1330 went unstopped.
- **The doctor**, all five states: civil survives two wounds, neutral and drunk
  survive one and not two, hostile and dead make the first one fatal, and
  shooting him takes the town's only rescue with him.
- **The figures.** Eleven grids, no two alike, every hitbox on the grid, every
  lethal box over the man and every weapon box over actual gunmetal, and no box
  overlapping another.
- **Audio.** 54 cues through the runtime with no non-finite, negative or
  out-of-range value; every theme reachable, none needing a fourth voice at
  once, none shorter than 0.8 s or longer than 6. The gunfight, rendered:
  `gunshot` 0.61 s peak 0.33, `ricochet` 0.31 s, `hit` 0.23 s, `wound` 0.35 s,
  `death` 0.90 s, `cock` 0.16 s, `dryfire` 0.20 s, `reload` 0.59 s,
  `tell` 0.60 s, `churchbell` 2.15 s.
- **The page.** Real `pointerdown` and `keydown` events at every control in
  jsdom: the day starts, all four lines select and speak by tap and by number
  key, up draws and cuts the theme, the crosshair moves, down and Escape
  holster, fire shoots, a robbery is walked into and fought, a whole day reaches
  sundown over the seven dimensions, and FIRE restarts. Every `data-cmd` has a
  handler and every handler is reachable.

## Credit

Inspired by Law of the West (Accolade, 1985), designed by Alan Miller. Original
game music and sound effects by Ed Bogas.

This project is an independent, unofficial reinterpretation. Its code, writing,
artwork, and audio are newly created and do not reproduce the original game's
dialogue, audiovisual assets, or musical compositions.

## What is faithful, and what is not

Not an emulator, a port, or a copy of the original's content. The structure is
the 1985 design's: eleven encounters in a day, one caller line and four replies
with up to three exchanges, a gun that interrupts any of it, surrender and
departure and delayed draws and ambushes, robberies you were warned about or
were not, the doctor deciding whether a bullet is survivable, the 320×200
holster-level composition, and the seven dimensions at sundown.

The dialogue, the figures, the street, the melodies and the numbers are new.
Nothing from the original's code, artwork, script or sound is reused, and none
of it was taken from a walkthrough, a longplay, a wiki or a ROM. Modern
conveniences — touch controls, responsive placement, fullscreen, mute, keyboard
support and the test suite — are kept deliberately; they do not touch the
composition, the dialogue grammar, the encounter behaviour or the scoring.
