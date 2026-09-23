# Castle Wolfenstein — The War Plans

A browser recreation of Silas Warner's *Castle Wolfenstein* (Muse Software,
1981, Apple II). One HTML file, no build step, no assets fetched: open
`index.html` from a `file://` URL and it plays.

[Play it](https://realjkg.github.io/retro-games/wolfenstein/)

You are a prisoner in the castle. Your dying cellmate has given you a pistol.
Somewhere in one of the chests are the war plans. Find them, get out through
the castle's one way out, and you are promoted. Get out without them and you
are only alive.

    arrows · WASD      walk, in eight directions
    hold X or SHIFT    turn in place without walking (aim)
    SPACE              fire
    E                  search: pick a chest's lock, or go through a guard's pockets
    G                  throw a grenade
    P                  pause, and the map

**On a phone** the Apple IIe's own joystick is on the glass: the beige box,
the black ball-topped stick standing in its well, and the two buttons in the
top corners. **Button 0 fires, button 1 held is AIM.** FIRE, AIM, SEARCH and
THROW are also beside it for the other thumb.

The stick handles the way Galaga's does, the best of the sticks in this
collection. You drag it, and **how far you push it is how fast he walks.**
The Apple read its joystick through the paddle inputs, so it was analogue too,
and a small push is a careful step. It takes the pointer captive on the way
down, so a thumb that slides off the well keeps walking him. It lets go on
`pointerup`, `pointercancel` and `lostpointercapture`, and at the document as
well, so a gesture the browser swallows still stops him. The throw is measured
from the well and the knob, not assumed, and it springs back to the middle.

**Held sideways**, the stick goes to the left of the playfield and the buttons
to the right, and the playfield takes what height is left. Nothing is drawn
over the castle and nothing has to be scrolled to, either way up, on screens
from 320 wide to a tablet (`tools/layout.js`). **A double or triple tap zooms
nothing**, anywhere: the shared zoom guard eats the second and third tap
everywhere that is not a control, and every control carries its own
`touch-action`. A press that lands while the gun is cooling down is kept and
goes off as soon as it can, so a triple tap on FIRE is three shots.

**A gamepad** works through the Gamepad API, analogue as well: A fires,
B searches, X throws, a shoulder button aims, START pauses.

The playfield is 280×168 logical pixels, the Apple's own width, drawn at
whatever size the page has room for with `image-rendering: pixelated`. Every
figure is a grid of letters in the source, so the picture in the file is the
picture on the screen.

## Impenetrable: the endless mode

`IMPENETRABLE` on the title (and on the pause card) has two positions:

* **OFF · MORTAL**: the game as it was. One bullet ends it, unless you have
  found a bulletproof vest, which takes three.
* **ON · ENDLESS**: the prisoner is bulletproof. Guards' bullets ring off him
  with a violet flash and a *ping*, and a grenade at his own feet knocks down
  the walls and leaves him standing. Nothing else changes: the guards still
  shout and shoot, the SS still follow, chests still take time to pick. So a
  run never ends. Escape a castle and there is another, bigger and worse, and
  another after that. Ranks go up to Field Marshal and then keep counting
  (`FIELD MARSHAL *2`, `*3` …).

An impenetrable run is never a record. Switching it off part-way does not
launder the run. The status bar shows **IMPENETRABLE** while it is on, and the
choice is remembered between visits.

## What it does

**A castle of rooms.** Seen from above, one room at a time, the way the Apple
drew it. The rooms are joined as a maze, so every one can be reached, with a
few extra openings so there is more than one way round. The first castle is
four rooms by three. Each one you escape is bigger, up to six by five, with
more guards in it and more of them SS. The same seed is the same castle.

**Guards** (green) walk their rounds. One who sees you shouts, *HALT!* or
*ACHTUNG!* or *KOMMEN SIE HIER!*, and after a moment he shoots. His bullets
are slower than yours and can be stepped out of. **Point your gun at one** and
he may put his hands up (*KAMERAD!*). He keeps them up for as long as the gun
is on him, and a moment after. Look away and he goes for his gun again
(*SCHWEINEHUND!*). A guard with his hands up, or a dead one, can be searched
for bullets and grenades, and a dead guard sometimes for his uniform.

**The SS** (violet) never go about alone. A room that has them has a squad,
two men and from the fourth castle sometimes three, standing together. They
wear vests and take three bullets each, and they never surrender. They
**follow you**: leave a room with the SS after you and a moment later they
walk in through the same opening, one after another.

**The alarm** is the frightening part. An SS man who sees you for what you are
raises it. A klaxon goes, the screen flares red, and from then on its edges
beat red in time with a heartbeat under everything, faster when they are in
the room with you. `ALARM` flashes in the status bar. Every so often **a squad
comes through one of the doors** of whatever room you are in: boots, the
klaxon again, `SS! THROUGH THE WEST DOOR`. They come from the far side of the
room, and they walk in on their own feet from off the screen. The alarm goes
quiet only when nobody has had you in their sights for half a minute.

**Chests** are picked standing still. It takes a couple of seconds, and
walking away gives it up. Shoot the lock off and it opens at once. They hold
bullets, grenades, bulletproof vests, uniforms, and a great deal of sauerkraut
and schnapps.

**In a German uniform you blend in**, with the guards and with the SS. Guards
let you by until you fire in front of them or walk into one (*WAS IST LOS?*).
The SS look closely. Come near one, or stay near him, and he stops you:
*PAPIERE!* You have a couple of seconds. Walk away out of his sight and he
lets it go (*WEITER.*). Still standing in front of him when he has looked, and
you are a spy (*SPION!*), the room knows, and the alarm goes. A squad the
alarm sends into a room where your uniform still holds does not know you
either: they come in looking (*WO IST ER?*), and they have to find you out
the same way. In a uniform the alarm goes quiet in twelve seconds instead of
thirty. Firing, or throwing a grenade, gives it away to everyone in the room.

**The war plans** are in a steel strongbox, grey, in a room at least half way
from the cell. Bullets do not open it and grenades do not break it. It has to
be picked, and it takes longer than a chest.

**Grenades** land where you throw them and go off a moment later. They bring
down the inside walls of a room (never the castle's own), wreck chests and
everything in them, and kill anyone standing close. That includes you, unless
you are impenetrable.

**The way out** is an opening in an outside wall, with daylight in it and
`EXIT` blinking beside it. Walk out through it.

### Carried over from the other games' defects

* **Nobody slides.** The leg frame is read from the distance actually walked,
  and walking into a wall stops the legs as well as the man
  (`the legs move only when he does`). Diagonals count the ground covered,
  not the sum of the axes. The first version got that wrong and the legs ran
  1.4× fast on every diagonal. The playtest found it.
* **Nobody appears.** The prisoner crosses into the next room through the
  opening, off the edge of one screen and onto the next with no jump. An SS
  man following you is placed outside the opening, off the screen, and walks
  in.
* **Alive standing there.** A figure standing still breathes: his gun sinks a
  pixel and rises once a second, and he blinks. A guard with his hands up lets
  them sag and raises them again. The first version breathed only when aiming
  level, so a prisoner aiming up or down was a still picture. The playtest
  found that too.
* **Nobody is drawn in pieces.** Head, torso and legs are put together as
  letters before anything is drawn, and nothing is drawn across a figure.
* **The controls, storage and a backgrounded tab** are handled as in the other
  games: every control carries its own `touch-action`, held buttons use
  pointer capture, every touch of `localStorage` is guarded, a hand-edited
  record is ignored, the frame step is capped and a hidden tab pauses.

## How this is checked

    node --test tests/*.test.cjs                              # 27 tests, no browser
    PW=$PWD/../node_modules/playwright-core node tools/playtest.js
    PW=... node tools/playthrough.js
    PW=... node tools/layout.js

`tests/` runs the page's own script under a stub DOM and reads the game's
numbers: every castle at several sizes and seeds can be walked from the cell to
the way out and to every chest, and holds exactly one set of plans; one
bullet kills a guard and three an SS man; a mortal prisoner dies of one
bullet and a vest takes three; **impenetrable survives twenty seconds in front
of an SS man and a grenade at his feet, and fourteen castles in a row, past
the last rank**; an impenetrable run never reaches the record; hands up, the
uniform, the SS following, picking and shooting locks, the strongbox, grenades
and walls, the walk cycle, and storage that throws. The SS tests are
**squads, never one alone**; **the alarm sends squads through the doors,
walking in from off the screen**; **the alarm goes quiet, sooner in a
uniform**; **the papers: stay and you are a spy, walk away and you pass**; and
**a squad that comes in after a man in uniform does not know him**. All six
fail on the build before them.

`tools/playtest.js` asks **how it moved**. It opens the real page in Chromium
and reads the canvas, one row per scene: the title demo, the cell, walking
into the next room, a guard on his rounds, a guard who has seen you, hands up,
an SS man walking in after you, the alarm's first squad man and the second,
the papers, picking a lock, a grenade, a uniform, a
bulletproof prisoner under fire, a mortal one shot, the way out, a ninth
castle and the pause card. The columns are the repository's questions: *walks
in, strides, alive, answers, walks off, whole.* Read the rows.

Each column has been shown to fail on a broken build. `--break=` patches a
known defect back in:

    --break=slide     one pose translated              strides   fails on every walker
    --break=appear    the SS man put down inside       walks in  fails
    --break=keyline   a line across every figure       whole     fails (90–93%)
    --break=still     the picture never changes        alive, answers, whole fail
    --break=jump      a 30px jump on the way out       walks off fails (41px)

The *alive* column looks four times across a second rather than once at the
second. A guard walking at 22 px/s comes round to the same leg frame after
exactly one second, and a single look called him a statue.

`tools/playthrough.js` asks **what a player gets**, by keyboard and by touch:
the switch turns on, shows in the status bar and survives a reload; START tells
the story and goes in; arrows walk, X turns in place, SPACE fires, G throws;
ten real seconds in front of an SS man with the switch on and he is still
standing; the pause card has the map and switching off part-way still leaves
no record; walking out of the way out escapes and there is a next castle;
mortal, one bullet ends it; on a phone the stick leans, walks him and springs
back, **a light push walks him slower than a full one**, button 0 on the box
fires and button 1 held turns him without a step, and FIRE, THROW, SEARCH and
AIM-with-the-stick all work with fingers.

`tools/layout.js` asks **where the controls are**, on six screens from 320×568
to an iPad, each way up, during play. Is any control over the playfield or over
another control? Is everything on screen with nothing to scroll to? Is the
playfield its own shape? Then, with fingers on a phone each way up, a triple
tap on the playfield, the status bar, the space between, the stick, FIRE,
button 0 and SEARCH: nothing zooms, the guard eats the second and third tap
everywhere that is not a control, and a triple tap on FIRE or button 0 is
three shots. Run against the build before this one it fails on every phone
held sideways, where the playfield and buttons were off the bottom of the
screen, and on the 320-wide phone upright. With the zoom guard taken out, the
tap rows fail.

For eyes, not checks:

    PW=... node tools/sprites.js out.png     every figure and frame, 8×
    PW=... node tools/shots.js out.png       sixteen moments of the game, 3×
    PW=... node tools/render-icons.js        the home-screen icons, from the art
    PW=... node tools/render-icons.js --check

## What is not fixed

* **The guards do not speak.** The Apple version was famous for real digitised
  speech out of a one-bit speaker. Here a shout is its words in a bubble and a
  burst of square-wave syllables.
* **One floor.** The original castle had about sixty rooms on several floors
  joined by stairs. This one is a single grid of rooms, up to thirty, with no
  stairs and no locked doors.
* **Guards already in a room are standing there when you walk in.** They live
  there, which is how the original worked, but it is not a walk-in. Only the
  SS walk in after you.
* **An SS man loses you** if you have left the room he was following you into
  before he gets there. He does not follow a second time.
* **Standing legs are straight.** The walk is four drawn frames. Standing is
  five rows of dead-straight legs; the life in a standing figure is in the
  arms and the blink.
* **The reference builds could not be looked at from here.** The DOS build on
  retrogames.cz and the Atari 8-bit build on archive.org were both blocked by
  this environment's network policy. What is here is from what is known of
  Silas Warner's game, not from playing those builds side by side.
* **The SS in a uniform are this game's.** The alarm, the squads sent through
  the doors, the inspection for papers, and a uniform that gets you past the
  SS at a distance were all asked for, as an enhancement, and are not a
  reading of the 1981 disk.
* **The numbers are this game's, not the Apple's.** Ten rounds and three
  grenades to start, three hits for a vest and three bullets for an SS man,
  the rank ladder, and the strongbox that grenades cannot break (so a castle
  can always be won). None of them was checked against the original disk.
* **Only the best rank is kept.** No initials table, no save slot. The other
  games' coin-op module is not wired into this one yet.
* **The double-tap zoom fix is unverified on iOS**, as in every other game
  here: `tools/zoomguard.js` proves it in Chromium, and there is no WebKit here.
