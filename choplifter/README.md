# Choplifter — Bungeling Rescue

Part of [retro-games](../README.md).

[Play the browser game](https://realjkg.github.io/retro-games/choplifter/).

A self-contained browser action game built after **Choplifter**, written for the Apple II by
Dan Gorlin and published by Brøderbund in 1982, and ported afterwards to almost every machine
of the decade. GitHub Pages publishes this directory's `index.html` from `main` at
`/choplifter/`. No packages, external assets, accounts, or build step are required.

Sixty-four of ours are held in four barracks west of the Bungeling border. Home is a post
office at the far right of the strip — the helicopter came into the country in crates marked
as mail sorting equipment, which is the backstory and also why the base is what it is. You
have three machines and sixteen seats.

## Controls

The Apple II original wanted **a joystick and two buttons**, and the reason is the whole
design: the stick flies her and a button turns her, and the two have nothing to do with each
other. She can be going left with her nose pointed at you. So this has a stick.

- **The stick flies her.** Drag the thumb pad: how far out of the middle you push it is how
  hard she goes, in both axes. Hold it right out in profile and she works up onto the step —
  half as fast again, bought with a second of commitment and lost the moment you turn, ease
  off, or fly her backwards. Up lifts. Down is a *rate*, not a shove — hold it all the way
  to the sand and she settles at a speed she can be landed at. Let go of everything and she
  falls, and a fall costs you a hit. On a keyboard the **arrows or WASD** are the stick.
- **TURN** (X/E) is button 1. It walks her round the ring the original walks: side, nose-on
  to you, the other side, nose-on, round again. It does not steer her.
- **FIRE** (Space/Z/Enter) is button 0, and it points where she does:
  - **in profile the gun fires level** — this is how a jet is met and how a barrack door is
    taken off;
  - **nose-on she is in the tank attacking position and the gun fires straight down.**
- **LOAD** is the same button with her skids down on the pad at the post office: it cycles
  what she carries for the next trip — standard, light, gunship or armoured. See below; it is
  a trade every time, never an upgrade.
- **SEEK** (C/F) puts a heat seeker off the rail. She carries four, fires one at a time, and
  the only way to get more is to set down at the post office and let the crew load them, one
  every seven tenths of a second. It turns onto whatever is hottest — the jets and the air
  mines first, a tank only when the air is clear — at a rate it cannot exceed, so it can be
  out-turned and it can run out of fuel with nothing to show for it.
- **HOVER** (Shift/H) holds whatever height you are at.
- **SCAN** (R) switches the scanner in the strip along the top: the whole country at once —
  the post office, the fence, the four barracks with what is left in each, every hostage on
  his feet and everything hunting you, with your own position and how much of it you can see.
- **MENU** (Esc/P) pauses; the pause card carries the controls, the music switch, the scanner
  switch, the endless-machines switch and the full-screen switch.
- Sound starts after a tap or key press. SOUND ON/OFF mutes or enables it.
- **Out of the box there is no music — just the blades.** See below; the score is a switch on
  the title card and in the pause menu.
- **FULL SCREEN** hides the page around the game. Held sideways the stick and the buttons move
  to either side of the screen like a handheld. EXIT FULL SCREEN (or Esc) puts the page back.

### The pinch, the double tap and the iOS zoom

Every page in this repository carries one shared guard, `shared/no-zoom.js`, written in by
`tools/sync-nozoom.js` and held to that one copy by CI. iOS Safari has ignored
`user-scalable=no` and `maximum-scale` in the viewport meta tag since iOS 10, so the meta tag
is not the fix and is not relied on. What the guard actually does:

- eats `gesturestart` / `gesturechange` / `gestureend`, which is how WebKit offers a pinch and
  exists on no other engine;
- eats the second tap of a double tap on a **non-pressable** target, non-passively, because
  `preventDefault` is ignored on a passive listener and the zoom is committed before a
  `dblclick` is ever dispatched — and it leaves buttons alone, so mashing FIRE never loses a
  press;
- prevents a second finger going down anywhere, because a second finger is a pinch;
- rewrites the viewport meta to put a page back that is zoomed **already**, which is the only
  lever a page has over WebKit's zoom.

On top of that, this game's own surfaces are declared un-gesturable: `touch-action:none` on
the screen, on the stick and on every button, `overscroll-behavior:none` on the page so a drag
is never a pull-to-refresh, `-webkit-touch-callout:none` and `user-select:none` so a held
control never raises the selection handles, and the stick takes the pointer captive on the way
down so a thumb that slides off it keeps flying her instead of letting go.

`tools/zoomguard.js` (at the repository root) drives all six games in a mobile context and
checks, per game, that a single tap goes through, that the second tap of a double tap is
prevented, that mashing a button is *not* swallowed, that two fingers and the WebKit gesture
are prevented, and that a page which is already zoomed gets put back:

```
PW=$PWD/law-of-the-west/node_modules/playwright-core node tools/zoomguard.js
```

**It says what it cannot prove, and so does this.** That harness is Chromium. The behaviour
being defended against is WebKit's, and there is no WebKit on the machine this was built on —
what is proved is that the page's own handlers fire and prevent the right events, not that
iOS Safari then behaves. **That needs a real device, and nobody has run this on one.** If it
still zooms on your phone, that is a bug and the guard is where to look.

## The rescue

- **Sixty-four hostages, sixteen to a barrack, sixteen to a machine.** Four trips if you never
  lose one, and you will lose some.
- **One barrack is already open and burning when you arrive**, and its people are out and
  running about in it. That is how the original starts you, and it is the only part of the
  mission you did not cause.
- **Three rounds into a barrack and the door goes.** Then they come out one at a time, walk
  clear of the door and wait on their own patch of sand, where you can count them.
- **Set her down within a screen of them and they run for you.** In the air she is not a bus:
  nobody climbs into a helicopter that is off the ground.
- **Land nose-on among them.** In the tank attacking position she is at her narrowest and
  covers six pixels of sand either side of her middle; side-on it is fifteen. The
  walkthroughs make a point of it and so does this.
- **Fly east over the fence and put her down on the pad** and they file out, wave and salute
  you, and walk off into the post office. A hundred points apiece.
- **Your own gun and your own skids kill them** as surely as a tank does. So does going down
  with sixteen aboard.
- The Empire has three things: **tanks**, which amble along, kill the hostages they drive
  over, and shell you — they keep a stand-off of about a hundred and sixty pixels rather than
  driving onto you, lay worse the further off you are, and will not drive through a barrack,
  so each patrols the stretch of sand it was sent to; **jets**, level and fast, which is why
  the level gun is the one that meets them; and **drone air mines**, which home in on you
  and, **from your fourth trip home, shoot as well**.
- **Nothing the Empire owns shoots across the border.** The original gives you a safe zone
  around the launch area; here, east of the fence no shell is fired at you, no jet lines you
  up, and an air mine turns back. The run home is a run home.
- **The Empire's strength is topped up, not added to.** A wave brings it back to what this far
  into the mission is worth. It used to *add*, and three minutes in there were forty-six of
  them on a strip of country two thousand pixels long, which is not a harder game, it is a
  wall.
- The mission is over when all sixty-four are **accounted for** — home or lost — or when the
  hangar is empty. What you are graded on is the count, and it signs off with **The End**
  rather than "Game Over", which was Gorlin's own choice and not ours to improve on.

## How hard it gets, and how fast

The first version of this had two tanks on you at **four seconds** and a jet by twenty,
whatever setting you picked, escalating on a pure clock whether or not you had achieved
anything. A player said so, in about those words, and they were right. What it does now:

- **Eighteen seconds of quiet** before the Empire notices you, at every setting. One barrack
  is already burning, so there is something to fly at and nothing shooting at you while you
  learn the stick.
- **The first thing it ever sends is one tank.** Not two, and not a tank and a jet.
- **Pressure is the clock plus the trips you make**, and a trip counts for two waves. That is
  the original's own axis — it is on the fourth trip home that the air mines learn to shoot —
  and it is the fairer of the two, because a player who is struggling is not also being
  escalated at, and one who is getting them home is.
- **Each setting has its own ceiling and its own road to it.** The ceiling alone was not
  enough: with one ramp for all four, the hard settings never reached their own ceiling and
  the switch stopped meaning anything.

| | first jet | first mine | most at once, in the end |
| --- | --- | --- | --- |
| **Quiet** | about 4½ minutes | never | 3 tanks, 1 jet |
| **Busy** | about 1¾ minutes | about 4 minutes | 4 tanks, 2 jets, 1 mine |
| **Crowded** | about 1¼ minutes | about 2 minutes | 5 tanks, 3 jets, 2 mines |
| **Swarming** | about 50 seconds | about 1¼ minutes | 7 tanks, 4 jets, 3 mines |

Those are with no trips made; every trip home brings all of it forward. **Quiet is a place to
learn**: one tank for the first two and a half minutes, and no air mine, ever.

And it **says** what is coming. "Everything is flying at me" is a fair complaint when nothing
announced any of it, so the first jets and the first mine each get a line in the message bar,
and so does armour arriving more than one at a time.

The tanks were also simply too accurate at range and too quick on the reload; both are
slacker now, and they stand a third further off.

## Machines

- **Three to start with.** Three hits and she is down, and everyone aboard goes down with her.
- **Endless machines** is a switch on the title card and in the pause menu, remembered between
  visits. A crash still costs you the people you were carrying, and the barrack they came out
  of is still empty. What it does not cost is the mission.

## No score, just blades

The Apple II had **one bit of sound** — a speaker hung off a memory location — and Choplifter
had **no music at all**. What Gorlin spent that bit on was the rotor, and the game took a
Certificate of Merit for **Best Computer Audiovisual Effects** at the fourth Arkie Awards:
for effects, not for a score. So that is how this runs out of the box, and the music is a
switch rather than the default.

**The blades** are two voices held open for as long as she is flying: a low saw for the
engine, and a sine at the **blade-pass rate** opening and closing the gain over it, which is
the chop. Both rise as you pull up — the engine leans on it and the blades come round faster
— so the sound tells you what the collective is doing without your looking at her. It is the
same rate the rotor is *drawn* at, `26/π` ≈ 8.3 chops a second at a hover, about 9 under a
full climb, so the sound and the picture are the same machine. A machine that is down does
not turn over.

**The score**, when you switch it on, is four voices of sixteen steps: a tuned-percussion
ostinato running underneath everything, brass stabs over it, a walking bass and a drum —
the shape of a mid-eighties action picture done on synthesisers, which is what was asked for.
It follows the situation rather than a level: open over your own ground, tighter over theirs,
tighter again while something is shooting at you, a fanfare when a load gets home, and a
slower figure on the title card. It speeds up as the waves come in.

**All of the writing is original.** Nothing is transcribed from any film score or from any
port of this game, and there is nothing of the original's to transcribe in the first place —
it had no music. Both switches, and the master SOUND ON/OFF, are remembered between visits.

## The turn is the game, so the turn is drawn

The joystick had three positions and the machine drew a picture for each. It would be easy to
draw three pictures and switch between them, and it would be wrong: what everybody who played
this remembers is the *swing* — she leans over, comes round, and goes.

So there are **four drawn pictures from nose-on to profile**, mirrored for the other side,
seven in all, and the button walks her through them at nine turn-units a second. A full swing
from one profile to the other is a third of a second and every frame of it is a frame somebody
drew — nothing is squashed, interpolated or flipped.

`tools/playtest.js` counts the pictures. On the committed page a full walk round the ring
shows all seven and never moves more than 0.15 of a step in one frame. With
`--sabotage=snapturn` — the facing set instead of walked, which is what three pictures and a
switch amounts to — it shows three, moves a whole step in one frame, and the row goes red.

The rotor is not a drawn frame, because a rotor that is a drawn frame stops between frames.
It is a disc and two blades, and the blades are where they are in the turn. The disc used to
open out into an oval as she came round to nose-on, on the theory that you would then be
looking into it — on the screen that hung a lasso round her, and it was wrong anyway: the disc
is a horizontal circle and your eye is at its height, so it projects to the same flat ellipse
whichever way her nose is pointing. It is one shape now, and a test says so.

## What you load her with

Not an upgrade tree. There is nothing to unlock and nothing to accumulate:
every sortie starts from the same four choices, and every one of them gives
something up. What you are deciding, standing on the pad, is what the next trip
is *for* — shooting your way out, surviving a mistake, or getting there.

The choice is made **on the pad at the post office, with her skids down**,
because that is where the crew are. There the SEEK button shows what she is
loaded with — STD, LIGHT, GUN, ARMOUR — and tapping it cycles; in the air, or
on the sand out at a barrack, it is the seeker button again and the loadout
cannot be touched.

| | seekers | hits | weight | on the step | top | sixty pixels of climb |
|---|---|---|---|---|---|---|
| **STANDARD** | 4 | 3 | 1.00 | 2.2s | 146 | 1.06s |
| **LIGHT** | 2 | 3 | 0.84 | 2.0s | 155 | 0.92s |
| **GUNSHIP** | 6 | 3 | 1.20 | 2.5s | 138 | 1.22s |
| **ARMOURED** | 2 | 4 | 1.30 | 2.6s | 135 | 1.32s |

**Standard is the machine as she was before any of this**, so the button can be
ignored entirely and nothing has changed.

One number does the work. Weight is what she is carrying, and it is paid in
four places: how long she takes to get up on the step, how much run there is
when she is, how quickly she answers the stick, and how she climbs. The climb
is where it is felt oftenest — every barrack is something to get over, and an
armoured machine takes half again as long to clear one. It is the same
arithmetic in all four, which is why the choice reads as one decision rather
than four sliders.

A swap is a load, not a repair. Change to ARMOURED with a hit already in her
and you get the fourth hit's worth of room, not the hit back. The crew fill the
rails she has — two on a LIGHT, six on a GUNSHIP — and a fresh machine off the
hangar floor comes loaded the way you last chose.

`tools/playtest.js` flies the same climb twice off the same pad on the same
stick, once as she comes and once after three taps of the button, and compares
the height she actually gained: 31 pixels standard, 20 armoured.
`--sabotage=oneload` makes everything weigh the same and the row goes red with
"31px then 31px".

## Up on the step

The deepest barrack is nineteen hundred pixels from the pad, and sixty-four
hostages at sixteen a load is four trips there and back. At her hovering speed
that was the best part of three minutes of holding the stick in a straight
line — and none of it is the game. The game is what happens over the huts and
on the pad.

So she is not faster. She is allowed to **get** faster, and only where it costs
nothing to the part that is the game. Held at full stick, in profile, going the
way her nose is pointed, she stops fighting her own downwash and runs on. Four
things have to hold at once and any of them takes it away:

| what she needs | what takes it away |
|---|---|
| the stick right out | easing off |
| her side to you — in profile, not nose-on | turning her |
| going the way she points | being dragged backwards |
| her skids off the ground | setting her down |

It takes **1.3 seconds of commitment before it starts to build** and about a
second more to arrive; it is lost three times faster than it came. Ninety-eight
pixels a second hovering, a hundred and forty-six up on the step. Measured
against the trip it exists for — the pad to the deepest barrack — that is
**20.4 seconds down to 14.2**, and a clean rescue saves the better part of a
minute of straight-line flying.

She is quicker than a jet up there, which is the point of committing to the
run. What it costs is that she is in profile, in a straight line, not stopping,
and a jet coming the other way does not care how fast she is.

You can hear it before you can see it: the blades quicken as she gets there.
And you can see it in her attitude, because she is pinned at her deepest lean
the whole time she is up on the step.

`tools/playtest.js` measures it in **ground actually crossed** — where she was
and what the clock said, not the speed she reports. On a committed run west she
goes from 98 px/s to about 151; on the flight home, where the same stick is
held while the button turns her round and round, she never gets past about 105.
Two sabotages, one either way: `--sabotage=nocruise` never lets her up on the
step and `--sabotage=freecruise` gives it to her for nothing, and each turns
that row red.

## She goes where the disc points

A helicopter has no throttle to shove. She hangs off her disc, and she goes where the disc
leans — so standing still she sits level, and asked for everything she has she noses over into
it, tail up, rails up with her. Let go and she comes back level, and she takes a moment over
both, because a machine with that much spinning on top of it does not change its mind quickly.

Because where she points and where she is going are two different questions in this game, the
lean answers the second one:

| what she is doing | what you see |
|---|---|
| hovering | level, exactly the machine that has always been drawn here |
| flying the way she points | nosed over into it, up to about thirteen degrees |
| flying backwards | nose up, tail down, dragging herself along, and less of it |
| nose-on, sliding sideways | heeled over towards the side she is sliding to |

**The gun is bolted to her**, so it points where her nose points: level in the hover, and down
the slope when she is nosed over into a run. That is the one part of the lean you can use
rather than only look at.

The turn is seven drawn pictures because a turn is seven positions you can see one at a time.
The lean is not like that — it is a continuous angle that answers the stick, and drawing a
picture for every angle would mean drawing a hundred of them. So the machine is drawn once and
the leaning pictures are **baked from it when the page loads**: every pixel of the leaned
picture asks which pixel of her it was, nine samples of it, so nothing she is made of thins out
on the way round. Her rails are left out of that and drawn as bars at the lean, for the same
reason the rotor is drawn rather than stored — a rail one pixel thick, put through a turn,
samples into a row of dashes, and a bar turned is still a bar. Where those rails are is read
out of each drawn frame rather than written down twice, which is why she stands on one long
rail in profile and two short ones nose-on.

The disc goes over with her. A machine that leans under a level disc has not leaned: she is
hanging off that disc and it is the thing doing the leaning.

`tools/playtest.js` flies the run and then asks the picture, not the number: posed at the angle
that flight actually reached, is the nose third of her ink lower than the tail third, and the
other way round when she is dragged backwards, and mirrored when she is pointed the other way?
With `--sabotage=levelflight` — she flies flat out with her nose level, which is what she did
before any of this — the row goes red.

## Every scene, in a real browser

`npm test` cannot see the screen. Everything that has ever been visibly wrong in this
repository was wrong on the screen while the numbers were right, so there is a second tool
that opens the committed page in a real browser, presses the keys a player presses, reads the
pixels the page actually painted, and asks ten questions of ten scenes:

```
PW=$PWD/../law-of-the-west/node_modules/playwright-core node tools/playtest.js
node tools/playtest.js --keep              # and write the frames to .playtest
node tools/playtest.js --sabotage=bands    # and prove a check can go red
```

| column | the question |
| --- | --- |
| `in` | did it arrive under its own power, a step at a time, or appear? |
| `stride` | is the walk a drawn gait, or one pose slid along the ground? |
| `turn` | did she turn through drawn pictures, or flip between two? |
| `alive` | with everything let go of, is the picture a twentieth of a second later a different picture? |
| `answers` | does the scene do anything about what the player pressed? |
| `off` | does it leave the way it came — the people aboard, the machine away? |
| `whole` | is the figure one figure: no shed ink, no sky shut inside it? |
| `leans` | does she nose over into a run, come back level out of it, and lean the other way flown backwards — in the painted picture, not in the number? |
| `seeks` | does a seeker turn onto what it was fired at, or fly on past it? |
| `cruise` | does a straight run build speed in the ground she crosses, and does a turn take it away? |
| `load` | does what she is carrying change how she flies, measured in height gained? |

**Every one of those checks has been shown to fail.** `--sabotage=<name>` patches one defect
into the page in memory and runs against that, because a check that passes on the broken build
and on the fixed one is not a check:

| sabotage | what it breaks | which row goes red |
| --- | --- | --- |
| `snapturn` | the facing is set rather than walked | `turn` |
| `leanthrottle` | thrust taken off the lean instead of the stick | `off` on the flight home |
| `frozenrotor` | the rotor is drawn at one angle for ever | `alive` |
| `slidwalk` | one pose of the gait, slid along | `stride` |
| `teleport` | a hostage crosses the ground in one frame | `in`, `stride` |
| `deaf` | the keyboard is not read | `answers` |
| `bands` | the chopper drawn in three slid slices | `whole` |
| `levelflight` | she flies flat out with her nose level | `leans` |
| `dumbseeker` | the seeker flies straight on off the rail | `seeks` |
| `nocruise` | she never gets up on the step | `cruise` on the way out |
| `freecruise` | she is always up on it, turn or no turn | `cruise`, both scenes |
| `oneload` | every loadout weighs the same | `load` |

`leanthrottle` is the fidelity defect this game shipped with in its first commit, kept as a
sabotage so it cannot come back: the flight-home scene holds the stick east for four seconds
while the button turns her round and round, and asks that she never loses a pixel of ground to
any of it. With thrust coming off the lean she flies backwards every time her nose swings
west, and the row goes red.

The `whole` check had to be thrown away once and rewritten. The first version measured the
painted machine on its own and asked whether nearly all of her ink was in one connected shape
— and it passed on `bands`, at 96%, because **the rotor bridges the gaps**. Eighteen pixels of
blade either side of the hub will hold a body cut into three slices together. What catches it
is comparing what was painted against the picture it claims to be painting: draw the body
sprite at the same place and count the pixels of it that are missing from the screen. On the
committed page that is nought. Under `bands` it is ten to seventeen, every scene.

## What the original is, and what this keeps

All of this was checked against written accounts of the 1982 game — the manual, the Apple II
walkthrough, StrategyWiki, the Wikipedia summary — rather than remembered. Where those
accounts disagreed with what was here, what was here got changed:

- **One strip of country seen from the side.** The post office at the **far right**, the
  border fence west of it, the four barracks west of that. You fly **out to the left** and
  home to the right. It was built the other way round from memory; two accounts agree it is
  this way.
- **A joystick and two buttons, and facing independent of travel.** Button 1 turns her through
  the three positions; the stick flies her; she can be going one way and pointing another.
  Thrust used to come off the lean here, which made the turn a throttle.
- **The level gun and the tank attacking position.** In profile she fires level at what is in
  the air. Pointed at you she fires *down*, at the tanks. This had the nose-on gun firing
  upwards at jets, which is neither what the original does nor what the stance is for.
- **Sixty-four hostages in four barracks, sixteen at a time** in the machine, several trips.
- **One barrack already open and burning at the start**, its people out and panicking.
- **Shooting a barrack open**, hostages who come out, wave, and run to a landed chopper.
- **Nose-on is the narrowest she gets**, so it is the position to land in among people.
- **The three things the Empire has**: tanks that amble along and kill the hostages they drive
  over, jets that shoot air-to-air, drone air mines that home in — and that start shooting on
  the fourth trip.
- **A safe zone around the launch area**, which is why nothing shoots across the fence.
- **Hostages you can kill yourself**, by gun or by skid, which is what makes the game about
  care rather than speed.
- **Three helicopters**, and the mission ends when the third is gone or all sixty-four are
  accounted for.
- **"The End"** rather than "Game Over".
- **The post office**, because the helicopter was smuggled in as mail sorting equipment.

## What is modernised rather than reproduced

The brief was a modernisation, so these are deliberate and are not the original:

- **The sky.** The Apple II's was black because the machine had no colour to spare for it.
  This one is a dawn, with two parallax ridges behind the action.
- **A score.** The original had no music at all; Gorlin spent the machine's one bit of sound
  on the rotor. Nothing here is transcribed from any port — it is new writing in the idiom,
  and it changes with where you are: open over your own ground, tighter over theirs, and
  faster again while something is shooting at you.
- **The scanner**, which the original did not have, because a sixty-four-hostage mission on a
  phone needs to be able to answer "which barrack still has people in it" without flying there.
- **HOVER and FACE**, two conveniences a joystick did not need and a thumb does.
- **Endless machines**, and a difficulty switch the original did not have.
- **Hostages who spread out.** They wait nine pixels apart on their own patches rather than
  stacking on the door — partly because four men on one pixel is one man, and partly because
  a shell that finds that pixel finds all four.

## What is not fixed, and what could not be checked

- **No emulator was run.** The machine this was built on cannot reach `archive.org` — it is
  blocked by the sandbox's network policy — so the disk image could not be played and no
  screenshot of the original has been seen here. What the gameplay rules above rest on is
  written sources reached through search: the Apple II manual's control list, the GameFAQs
  Apple II walkthrough, StrategyWiki's gameplay and walkthrough pages, and the Wikipedia and
  MobyGames summaries. That is second-hand, and the places it is most likely to be wrong are
  the ones no source stated plainly: **the exact turn cycle** (whether button 1 goes
  side-front-side-front or straight side-to-side), **whether the level gun or proximity opens
  a barrack**, and **the wording of the end-of-mission grades**, which are written fresh here.
- **Nothing has been played on a phone.** The zoom guard is proved to fire in Chromium and the
  controls are proved to respond in Chromium. Neither is a real iOS device, and the whole
  point of the guard is WebKit behaviour.
- **The hostages are seven pixels wide**, and at that size the gait reads in the legs and
  barely at all in the arms. The four frames are four drawings and the two passing frames
  bring different knees through, but nobody would call the arm swing readable.
- **She has no separate landing picture.** The skids are part of every frame of the turn and
  do not flex or settle; touching down is a change of state, not a change of drawing.
- **The run is not in the original either.** The 1982 machine had one speed. This is the same
  kind of modernisation the lean is: it changes the transit, which was dead time, and leaves
  the hovering speed — where the game actually is — exactly where it was.
- **Faster trips mean a faster war.** Pressure is `wave + trips*2`, so getting home sooner
  brings the next wave sooner. That is self-balancing rather than free, but it has only been
  measured through the crude bot in the node harness, not played.
- **The lean is one axis and the original had none of it.** Nothing in the sources says the
  1982 machine tilted at all, and it plainly did not; this is a modernisation, not a
  reproduction, and it is the one place the picture departs from what that machine drew. She
  also leans only fore and aft: a real one that is sliding sideways *and* going forwards is
  doing both at once, and here the nose-on frames roll and the profile frames pitch, with a
  blend between them as she comes round.
- **The leaning pictures are baked, not drawn by hand.** Every angle she leans to is a
  resampling of the one machine somebody drew, and at the steepest angles the baking leaves
  her outline a little rougher than the drawn frame — the fin's corner and the join under the
  cabin are where it shows. A test holds it to keeping seven eighths of her ink and staying in
  one piece; it cannot hold it to being as clean as a drawn frame, because it is not.
- **A seeker cannot be steered, dropped or aimed once it is away.** It picks the hottest thing
  in the world at that instant, every instant, so two of them fired at the same moment will
  chase the same jet, and there is no lock, no warning tone and nothing on the scanner to say
  what it has chosen. It also cannot hit a barrack: it is a weapon against the things that are
  hunting you, not a second way through a door.
- **Nothing shoots seekers back at you.** They are yours alone, which is not how it would work
  if the other side had them.
- **The jets fly level and never dive**, and never turn round. They cross, they fire if you are
  in front of them and level with them, and they go.
- **A tank cannot pass a barrack**, which is how it is stopped from parking in the doorway,
  and the side effect is that no tank ever chases you the length of the map.
- **The ground is a line.** There is no terrain, no cover, and nothing to fly around.
- **One high score, in this browser.** No table, no names, no two-player.
- **The loadout is four fixed choices, not a workshop.** No mixing, no numbers to spend, no
  carrying anything over between missions beyond which of the four you last flew.
- **Nothing tells you what to load.** There is no readout of what is waiting out there before
  you commit, so the first trip of a mission is always a guess — deliberately, but it does
  mean GUNSHIP is a bet rather than a read.
- **No extra machines for points.** Three is three. The original handed them out; this does
  not, and the endless-machines switch is the only relief on offer.
- **The balance was measured against a very poor player.** `tools/` has no autopilot in it,
  but the mission was run repeatedly through the node harness with a crude one — fly out, open
  a barrack, sit down, load, fly home — and tuned until that bot could get a handful of them
  home across several seeds and settings. That is a floor, not a calibration: **nobody has
  played this with their hands.**

## Running it

```
node --test choplifter/tests/*.test.cjs          # 47 tests, no packages needed
node choplifter/tools/render-art.js --check      # the icons and the tile match the sprite
node tools/sync-nozoom.js --check                # this page carries the current zoom guard
```

and, with a browser on the machine:

```
PW=$PWD/law-of-the-west/node_modules/playwright-core node tools/zoomguard.js
cd choplifter
PW=$PWD/../law-of-the-west/node_modules/playwright-core node tools/playtest.js
PW=$PWD/../law-of-the-west/node_modules/playwright-core node tools/stickcheck.js
```

`playtest.js` asks how she moved. `stickcheck.js` asks whether a thumb can fly her: it drags
the stick in a mobile context with touch and checks that the rim is the top speed, that half
a push is about half of it, that she climbs while she flies, that letting go recentres it,
that a thumb sliding off the pad keeps flying her and letting go out there does not leave it
stuck — and that pressing TURN turns her without flying her, which is the whole of the
fidelity fix. `zoomguard.js` asks whether the pinch and the double tap are caught.

`playtest.js` is not part of `npm test`: CI has no browser, and the game must stay playable
from a `file://` URL with nothing installed.

## Where the facts came from

Nothing here is copied from the original, and nothing here was played on it. The rules above
were taken from: the Apple II manual's control list; ASchultz's Apple II walkthrough on
GameFAQs; StrategyWiki's *Choplifter!* gameplay and walkthrough pages; the Wikipedia and
MobyGames entries; and a Codex Gamicus summary of the three Bungeling weapons. Where two of
them agreed, that is what was built. Where none of them said, it is written fresh and listed
above as unverified.

## Its home, and its icons

The game lives at **`choplifter/`** and is served from
<https://realjkg.github.io/retro-games/choplifter/>. The collection page and the 404 page
both carry a card that launches it, `.github/workflows/pages.yml` runs its tests and its
artwork check on every push and pull request, and the manifest claims
`/retro-games/choplifter/` with `start_url` and `scope` of `./`, so installing it to a home
screen launches the game and nothing else.

Every picture of her outside the game is generated from the one inside it. `CHOP3`,
`CHOP_PAL`, `ROTOR_R` and `HOST_WAVE` live once, in `index.html`, and
`tools/render-art.js` reads them back out to write:

| what | where it shows |
| --- | --- |
| `icon-180.png` | the iOS home-screen icon (`apple-touch-icon`) |
| `icon-192.png` | the PWA icon, and the tab icon where an emoji favicon is not honoured |
| `icon-512.png` | the PWA icon at size |
| `icon-maskable-512.png` | Android's masked launcher icon — the same picture drawn into the middle sixty per cent, because a mask can take a fifth off every side and the full-bleed one loses its rotor tips and both of its people |
| the inline SVG tile | the launch card on the collection page and on the 404 page |

The tab icon is the helicopter twice over: **🚁** as an SVG data URI where that is honoured,
and `icon-192.png` behind it, because Firefox does not render an emoji favicon and a blank
tab is not an icon.

Edit the sprite, run the tool, and the game, the title card, all four app icons and both
collection tiles change together — they cannot disagree, and CI fails the build if what is
committed is not what the current sprite produces:

```
node choplifter/tools/render-art.js          # rewrite the icons and the launch tiles
node choplifter/tools/render-art.js --check  # what CI runs
```

## Credits

Choplifter was written by **Dan Gorlin** and published by **Brøderbund Software** in 1982.
This is an original browser game built after it — none of its code, art or data is used here.
