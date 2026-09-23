# Tapped — The Root Beer Bar

A browser recreation of Bally Midway's 1983 arcade game *Root Beer Tapper*,
renamed. One HTML file, no build step, no assets fetched: open `index.html`
from a `file://` URL and it plays.

[Play it](https://realjkg.github.io/retro-games/tapped/)

The arcade cabinet had a joystick and a tap handle, so that is what this has.

    joystick ▲ ▼       change bar (straight to its tap, and it wraps)
    joystick ◀ ▶       run along the bar
    POUR               hold to pour, let go to send the mug
    PAUSE              pause (and save)

**On a phone** the joystick is on the glass: a red ball-top stick in a round
gate that leans the way your thumb pushes it and springs back to the middle
when you let go. Running needs a lighter push than changing bar, and a bar
change needs the stick more up than across, so a thumb that wanders while you
run does not drop you onto the next bar.

**A real joystick or gamepad** works too, USB or Bluetooth, through the
browser's Gamepad API: the stick or d-pad moves, any face button pours, START
pauses and chooses on the menus. Nothing to set up; move it once and it is
there.

**A keyboard** still works for anyone at a desk without one: arrows or WASD,
SPACE or Z to pour, P to pause.

The playfield is 256×248 logical pixels, drawn at whatever size the page has
room for with `image-rendering: pixelated`. Every figure is a grid of letters
in the source, so the picture in the file is the picture on the screen.

## What it does

**Four bars, and a crowd that walks in.** Customers come in through the
swinging doors on the left, from off the screen, on their own feet, and walk
towards you in fits the way the arcade's crowd does: a few steps, a stop, a
thump on the bar, a few more. You stand at the taps on the right.

**Pour, send, catch.** Hold POUR at the tap and the mug fills in under half a
second; let go and it slides down the bar. The first customer it reaches who
has his hands free takes it and is shoved back. Through the door and he is
served. If not, he stands and drinks, and then slides the empty back to you.

**You lose a bartender** when a customer reaches the taps, when a full mug runs
off the far end with nobody to catch it, or when an empty comes back and you
are not there to catch it.

**Tips and the show.** Now and then a customer leaves a coin on the bar. Pick it
up and the whole bar stops to watch the show for a couple of seconds, which is
what a tip was for in the arcade.

**The Soda Shake.** After every bar you clear, a bandit shakes five of six cans
and shuffles them. Open the one he did not shake.

**Four bars in the arcade's order**: the saloon, the ball park, the punk club
and the space bar, each with its own crowd, and then round again, faster.

**Scoring**, the arcade's:

| | |
|---|---|
| customer pushed out of the door | 50 |
| empty mug caught | 100 |
| tip picked up | 1,500 |
| right can in the Soda Shake | 3,000 |

### The two common features

**Three letters on the wall.** A score that makes the top five asks for your
initials the arcade way: ▲ ▼ turn a letter, ◀ ▶ move between them, ENTER or
POUR when done. A keyboard can simply type them, and the last initials you used
come back as the default. The table is on HOW TO PLAY and on the last-call
card, and the top of it is the HIGH in the status bar.

**A save slot, and RESUME.** The game saves itself as you play: every two
seconds, when you pause, when the tab goes to the background and when the page
is closed. The slot holds the whole bar, meaning who is standing where and every mug on
the counter, so resuming carries on from where you were rather than starting
the level over. Resume always comes back **paused**, so a bar never ambushes
you. Clearing a bar writes a checkpoint for the start of the next one. The slot
is cleared at game over.

A death is paid for in the slot the moment it happens. Closing the page while
the bartender is falling does not bring him back.

### Bartenders: the arcade's count, or unlimited

`BARTENDERS` on the title has two positions:

* **3 · ARCADE**: the cabinet's game, and a high score if it's good enough.
* **UNLIMITED**: free play. A lost bartender still costs you the bar you were
  on, but never the game. The status bar shows **∞**, and an unlimited run is
  never a high score. Switching it back off part-way doesn't launder the run.

The choice is remembered between visits, and the pause menu has the same switch.

The arcade count is one constant, `ARCADE_LIVES`. It is 3 because accounts of
the cabinet say you "start with two", with the reserve shown as mugs, which reads
as two in reserve and one at the taps. That reading is not confirmed against a
cabinet or its operator manual. The MAME driver keeps the lives count in the
game's own settings, not on its DIP switches, so the driver does not settle it
either. If a cabinet disagrees, it is a one-line change.

### The attract demo

The title screen is the game playing itself: the bartender serves whoever is
nearest the taps and goes back for empties. Galaga's README lists "no attract
mode" as a defect. Tapped has one from the start.

## What was carried over from the other games' defects

Every one of these is a defect another game in this collection shipped. This
game was built against the list:

* **Nobody slides.** The leg frame is read from the distance walked, and the
  position only changes while the legs do, so a customer cannot move without a
  step (`feel.test.cjs`, and the *strides* column of the playtest).
* **Nobody appears.** Customers are spawned off the left edge and walk in
  through the doorway; the playtest's *walks in* column requires it.
* **Nobody jumps.** A customer who is served is carried backwards out through
  the door on the mug, with no frame-to-frame jump over three pixels.
* **Nobody is drawn in pieces.** A figure's head, torso and legs are put
  together as letters **before** anything is outlined, and the outline goes once
  round the whole silhouette. Outlining parts separately is what drew a keyline
  across the middle of Law of the West's callers. The counter is drawn behind
  the crowd, not across it, so no figure has a bar shut inside it. The
  playtest's *whole* column wants 99% of a customer's sprite on the screen
  where it was drawn.
* **Alive standing there.** A customer who is waiting bangs on the bar, one who
  is drinking sips, the bartender breathes, the taps drip.
* **The controls.** Every pressable control carries its own `touch-action`,
  held buttons use pointer capture, and the shared zoom guard is written in
  by `tools/sync-nozoom.js` and checked in CI.
* **Storage.** Every touch of `localStorage` is guarded, and a broken or
  hand-edited save slot is ignored rather than trusted.
* **A backgrounded tab** neither fast-forwards (the frame step is capped) nor
  keeps playing (it pauses and saves).

## How this is checked

    node --test tests/*.test.cjs                              # 40 tests, no browser
    PW=$PWD/../node_modules/playwright-core node tools/playtest.js
    PW=... node tools/playthrough.js

`tests/` runs the page's own script under a stub DOM and reads the game's
numbers: the scores, the three ways to lose a bartender, the tip and the show,
the Soda Shake, the slot round trip, the initials.

`tools/playtest.js` asks **how it moved**. It opens the real page in Chromium
and reads the canvas, one row per scene (the title demo, all four bars, pouring,
a customer served, one drinking, an empty coming back, the show, a lost
bartender, the level card, the shake, the shuffle, the pick, the initials, a
resumed game), with the questions from the repository's CLAUDE.md: *walks in,
strides, alive, answers, walks off, whole.* Read the rows.

Each column has been shown to fail on a broken build. `--break=` patches a
known defect back in:

    --break=slide     one pose translated        strides   fails on every bar
    --break=appear    customers placed at 90px   walks in  fails
    --break=keyline   a line across the middle   whole     fails (96%)
    --break=still     the picture never changes  alive, answers fail
    --break=jump      a 40px jump on the way out walks off fails

Two of these checks were wrong the first time and passed the broken build. The
stride check counted any change in a window following the customer, and the
wallpaper behind him changes as he moves, so a slid pose passed with 30
"different" pictures. It now masks the window to the customer's own pixels. The
walk-in check was skipped when nobody was at the door, so a customer who
simply appeared passed it. Scenes that should show a walk-in now require one.

`tools/playthrough.js` asks **what a player gets**, using only the keyboard and
touch: START starts, holding SPACE sends a mug, a thumb on the joystick
changes bar and runs and the stick springs back when let go, a reload offers RESUME and
brings the same bar back paused, typed letters go on the wall and survive a
reload, and a finger on POUR works the same as a key.

For eyes, not checks:

    PW=... node tools/sprites.js out.png     every figure and frame, 6×
    PW=... node tools/shots.js out.png       fourteen moments of the game, 3×
    PW=... node tools/render-icons.js        the home-screen icons, from the art
    PW=... node tools/render-icons.js --check

## What is not fixed

* **The crowd stands on the back edge of the counter**, not behind it. In the
  arcade the bar hides the customers' legs. Here the legs have to show, because
  a walk nobody can see is a walk nobody can check. It reads as a stylised bar.
  It is not the arcade's picture.
* **Changing bar is instant.** You land at the next tap with no movement in
  between. That is the arcade's rule too, but on the screen it is a jump, and it
  is the one figure movement here that is one.
* **Legs standing still are straight.** The standing pose is five rows of
  dead-straight legs. The walk is drawn; standing is not.
* **The show has no dancer.** A spotlight sweeps the bar and everybody cheers;
  the arcade had a dancing girl on a stage.
* **No extra bartenders are awarded.** The arcade gave them for points. The
  threshold wasn't known with enough confidence to write it down, so there are
  none rather than a guessed one.
* **The arcade count of 3 is a reading, not a confirmed setting**; see above.
* **A customer who reaches the taps does not throw the bartender down the bar**,
  which is the arcade's best gag. The game stops and says what happened.
* **The music is "Oh! Susanna"**, the arcade saloon's tune: Stephen Foster, 1848,
  an American classic in the public domain, so no licence is needed. The
  arrangement is this game's own and is not a transcription of the arcade's.
* **One save slot per browser.** It lives in `localStorage`, so it does not
  follow you to another device, and a private window forgets it.
* **The double-tap zoom fix is unverified on iOS**, as in every other game
  here: `tools/zoomguard.js` proves it in Chromium, and there is no WebKit here.
* **The other eight games do not have the initials table or the save slot yet.**
  They were built into this one first.
