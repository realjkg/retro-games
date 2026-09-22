# Galaga — The Swarm

A browser recreation of Namco's 1981 arcade game. One HTML file, no build step,
no assets fetched: open `index.html` from a `file://` URL and it plays.

[Play it](https://realjkg.github.io/retro-games/galaga/)

    ← →  or A D     move
    SPACE or Z      fire — hold it down and it repeats
    P               pause
    drag / FIRE     on a phone: drag anywhere on the playfield to steer

The playfield is 224×288 logical pixels, which is the arcade's, drawn at
whatever size the page has room for with `image-rendering: pixelated`. Every
sprite in the game is a 16×16 grid written out as text in the source, so the
picture in the file is the picture on the screen.

## What it does

**Forty enemies, and they fly in.** Five flights of eight, each along one of
four curved entry paths, mirrored left and right. Nothing is ever placed in the
formation: it comes on from off the edge of the screen, flies a loop, and then
curves into its slot on a bezier that leaves its current heading and arrives
pointing down. A sprite faces the direction it is actually travelling, computed
from the step it just took — which is why they are upside down on the way up.

**The formation is alive.** It sways nine pixels either side of centre and
breathes about five per cent in and out of its column spacing, on two clocks
that every enemy standing in it reads. Wings beat at about eight frames a
second.

**Dives.** Every couple of seconds somebody peels off, loops, and runs at
wherever you were standing when it started — so the same enemy never quite comes
down the same way twice. It goes off the bottom, comes back in at the top, and
flies home. A boss brings two bees with it.

**The beam.** From stage two on, a boss will break formation, descend, hover,
and open a tractor beam. Stand in it and it takes your fighter and a life, and
carries it in the formation underneath itself. Shoot that boss **while it is
diving** and the fighter is released: it climbs, comes back down, docks with
your ship, and you are flying two — two ships wide, two shots at a time, four
bullets on screen instead of two. Shoot the boss while it sits in the formation
and your fighter dies with it. Shoot the fighter on its way home and you have
shot your own fighter. All three of those are the arcade's rules and all three
are in here.

**Challenging stages** every fourth stage (3, 7, 11, …). Forty pass through in
formation flights, nothing takes a slot, nothing shoots back. Each is 100, and
all forty is a flat 10,000.

**How it handles.** The fighter crosses the playfield in about one and a
quarter seconds, so a tenth of a second on the control is worth one column of
the formation and you can aim with a tap. Holding fire repeats at up to eleven
a second; what actually paces you is the arcade's two-bullet limit, and a shot
the limit turns away retries on the very next frame rather than paying the
cooldown again. Bullets leave the top of the screen in about four tenths of a
second — roughly twice the arcade's, which is a deliberate departure: with the
original's slower bullet the two-shot limit bites on every other press and a
held button stutters.

**Endless fighters.** `FIGHTERS` on the title card cycles 3, 5, 2, ENDLESS, and
the setting is remembered between visits; the same switch is in the pause menu,
along with a way to end a run and see the tally. On endless a death still costs
you the fighter and whatever the boss was carrying — what it does not cost is
the game. The panel shows **∞** where the count goes. No extra fighters are
handed out, because there is nothing to hand them to, and **an endless run never
becomes a high score**. Turning the switch off part way through does not launder
the run: once it has been endless, it is not a score.

**Music.** An eight-bar fanfare plays over the first flight of every game — it
runs about as long as the five flights take to come down — a second tune
announces a challenging stage, a third lands a perfect bonus and a fourth closes
a game out. Nothing plays while you are shooting, which is the arcade's
arrangement.

What makes a chip tune sound like one is the texture rather than the melody, and
all of it is here: a **lead** that arrives from just under its own pitch and
wobbles when it is held, a **harmony** under it, an **arpeggio** channel playing
each chord as a run of sixteenths because no sound chip had a voice to spare for
holding one, a walking **bass**, a **noise channel** doing the work of a kick,
a snare and a hat, and an echo a beat and a half behind. Everything is scheduled
against the audio clock rather than the frame clock, so a busy page cannot drag
it.

The chords are written as a chart — `C4+E4+G4:4` — and `arpeggiate()` turns them
into the run of sixteenths; drum patterns are tiled to an exact length by
`tile()`, so the noise channel can never be the thing that knocks a tune out of
step. It was, on the first attempt, twice.

They are **reconstructions by ear and not transcriptions.** Nobody working on
this could hear the result, so `tools/music.js` draws each tune as a piano roll
and the shapes were checked by looking: a rising figure answered a step higher,
a turn, a landing, and every voice ending on the same beat.

**Scoring**

| | in the formation | in flight |
|---|---|---|
| bee (blue) | 50 | 100 |
| butterfly (red) | 80 | 160 |
| boss (green, two hits) | 150 | 400 |
| boss with one escort still flying | — | 800 |
| boss with both escorts still flying | — | 1,600 |

An extra fighter at 20,000 and every 70,000 after. The game-over screen gives
you the arcade's shots-fired / hits / hit-miss ratio.

## How this is checked

Two things, and they ask different questions.

    node --test tests/*.test.cjs                          # 42 tests, no browser
    PW=$PWD/../node_modules/playwright-core node tools/playtest.js

`tests/` runs the page's own script under a stub DOM and reads the game's
numbers: what a bee is worth in flight, that a boss takes two hits, that the
beam costs a life, that killing the captor in the formation loses the fighter
and killing it in flight gets it back, that the high score reaches storage.

`tools/playtest.js` opens the real thing in a real browser and reads the canvas.
It prints a row per scene — title, both halves of the entry, the settled
formation, a dive, the boss's run, the beam, a captured fighter, a pair, a
challenging stage, an explosion, a death, the stage card — and asks of each one:

* is it **alive** — is a tenth of a second later a different picture?
* is anything **moving**, and by how much?
* is the fighter **whole** — does the ink under it still add up to the ink in
  its own sprite, or has something taken a wing off it?
* is anything **stranded** off the playfield?
* does it **answer** what you press?

Neither is wired into `npm test` for the repository as a whole; CI runs the
first one, because CI has no browser and the game has to stay playable from
`file://` with nothing installed.

Two more tools exist only so a person can look at the pixels, which is the one
thing no check does:

    PW=... node tools/music.js out.png       the tunes, as piano rolls
    PW=... node tools/sprites.js out.png     every sprite and frame at 8×
    PW=... node tools/shots.js out/          thirteen moments of the game
    PW=... node tools/render-icons.js        the home-screen icons, from the art
    PW=... node tools/render-icons.js --check

Two defects in this game were found by looking rather than by testing, and one
was found by a test that was written afterwards to catch it:

* The boss's wings barely moved between frames — the flap existed in the data
  and was invisible on the screen. Both boss frames were redrawn.
* Explosions were a ring of identical dots expanding at one rate, which reads as
  a smoke ring, not a burst. Every fragment now has its own radius, size and
  moment of going out.
* The fourth entry pattern's mirrored half started its loop a full diameter away
  from where the dive ended: a sixty-pixel teleport that nothing in the game's
  state would ever have shown. `no flight path has a gap in it` in
  `tests/flight.test.cjs` fails on the build that had it.
* A held fire button gave a tenth of a second, then a whole second of nothing,
  then a tenth again. A shot the two-bullet limit turned away still paid the
  cooldown, so the retry kept landing outside the window. Nobody would find
  that by reading the code; it took counting the gaps between shots.
* `the beam takes the fighter, and the boss carries it` failed two runs in five
  on CI and blocked every deploy for a day. The boss shoots on its capture run,
  the test parked a fighter under it with no invulnerability, and sometimes the
  capture cost two lives instead of one. Three green runs locally are not
  evidence that a suite passes.

Three numbers govern all of that and sit together at the top of the script as
`SHIPSPD`, `BULLETSPD` and `FIREGAP`. `tests/feel.test.cjs` holds them to what a
player can feel: across in under a second and a half, a column of movement per
tenth of a second, and no gap over a third of a second in a held button. All
four of those checks fail on the build they replaced.

## What is not fixed

* **The dive paths do not thread the formation.** A diver leaving a slot in the
  middle of the swarm flies straight through the enemies below it rather than
  around them. The arcade's do too, more or less, but its formation is thinner
  by the time dives get going.
* **Escorts overlap their boss.** The two bees that peel off with a boss are
  given the same path from their own slots and can end up drawn on top of it for
  a few frames.
* **No enemy ever fires from the formation**, which is right, but no enemy fires
  a *pair* of shots on a spread either, which the arcade does at higher stages.
* **Endless is not a practice mode.** It removes the cost of dying and nothing
  else: there is no way to start at stage 12, no slow motion, and no way to
  summon a capture so you can practise getting the fighter back.
* **The stage never gets harder in the ways the arcade's does** beyond entry and
  dive speed and how often somebody dives. There is no second beam, no faster
  formation, no tighter dive.
* **The double-tap zoom fix is unverified on the device it is for.** The
  controls now carry their own `touch-action`, which is what the shared guard
  always assumed they did, and `tools/zoomguard.js` proves it in Chromium.
  The behaviour being defended against is WebKit's and there is no WebKit here.
* **There is no attract-mode demo.** The title screen flies the formation and
  that is all; the arcade plays itself.
* **The music is not the arcade's music.** It is a fanfare written to sit where
  the arcade's sits and to have its shape; it is not a transcription and it is
  not off by a note, it is a different tune. Anyone with the original to hand
  could replace the note rows in `TUNES` and nothing else would need to change.
* **There is no music during play**, which is faithful, and no enemy-entry
  sound worth the name, which is not: the arcade's swarm has a voice and this
  one has a single blip.
