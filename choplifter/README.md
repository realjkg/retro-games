# Choplifter — Bungeling Rescue

Part of [retro-games](../README.md).

[Play the browser game](https://realjkg.github.io/retro-games/choplifter/).

A self-contained browser action game built after **Choplifter**, written for the Apple II by
Dan Gorlin and published by Brøderbund in 1982, and ported afterwards to almost every machine
of the decade. GitHub Pages publishes this directory's `index.html` from `main` at
`/choplifter/`. No packages, external assets, accounts, or build step are required.

Sixty-four of ours are held in four barracks behind the Bungeling line. You have three
machines, a gun, and a helicopter that holds sixteen people. Everything else is between you
and the post.

## Controls

- **◀ ▶ turn her.** This is the whole game. She has three positions — nose-on to you, and
  profile either way — and holding a direction walks her round through them. Upright she
  hovers; once she is over she flies that way, and the further over she is the faster she
  goes. Let go and she stays where you left her.
- **▲ lifts, ▼ puts her down**, and **HOVER** (Shift/H) holds whatever height you are at.
  ▼ is a rate, not a shove: hold it all the way to the sand and she settles at a speed she
  can be landed at. **Let go of everything and she falls**, and a fall still costs you a hit.
- **FACE** (X/E) brings her back upright without waiting for the turn, because upright is the
  firing stance for anything in the air.
- **FIRE** (Space/Z/Enter) points where she does: **in profile the gun fires level**, and
  **nose-on it fires straight up**. A jet cannot be reached any other way, and a barrack door
  cannot be reached by firing upwards. Four rounds in the air at once, no more.
- **SCAN** (R) switches the scanner in the strip along the top: the whole country at once —
  the post, the line, the four barracks with what is left in each, every hostage on his feet
  and everything hunting you, with your own position and how much of it you can see.
- **MENU** (Esc/P) pauses, and the pause card carries the controls, the music switch, the
  scanner switch, the endless-machines switch and the full-screen switch.
- Sound starts after a tap or key press. SOUND ON/OFF mutes or enables it.
- **FULL SCREEN** hides the page around the game. Held sideways the pads move to either side
  of the screen like a handheld. EXIT FULL SCREEN (or Esc) puts the page back.

## The rescue

- **Sixty-four hostages, sixteen to a barrack, sixteen to a machine.** Four trips if you never
  lose one, and you will lose some.
- **Three rounds into a barrack and the door goes.** Then they come out one at a time, walk
  clear of the door and wait on their own patch of sand, where you can count them.
- **Set her down within a screen of them and they run for you.** In the air she is not a bus:
  nobody climbs into a helicopter that is off the ground.
- **Land on the pad at the post** and they file out, one every fifth of a second, a hundred
  points apiece.
- **Your own gun and your own skids kill them** as surely as a tank shell does. So does going
  down with sixteen aboard.
- The Empire sends **tanks**, which stay on their own side of the line, keep a stand-off of
  about a hundred and thirty pixels rather than driving onto the pad, and lay worse the
  further off you are — so standing away from a barrack is a decision rather than a
  formality. A tank will not drive through a barrack either, which means each one patrols
  the stretch of sand it was sent to and no further.
- **Nothing the Empire owns shoots across the line.** Get west of the frontier post and you
  are out of it: no shell is fired at you, no jet lines you up, and an air mine turns back.
  The run home is a run home.
- **The Empire's strength is topped up, not added to.** A wave brings it back to what this
  far into the mission is worth — at most seven tanks, four jets and three mines alive at
  once. It used to add, and three minutes in there were forty-six of them on a strip of
  country two thousand pixels long, which is not a harder game, it is a wall.
  **jets** from the second wave (level, fast, and only the upward gun reaches them) and
  **air mines** from the fourth on the busier settings. Each wave comes in sooner than the
  last.
- The mission is over when all sixty-four are **accounted for** — home or lost — or when the
  hangar is empty. What you are graded on is the count.

## Machines

- **Three to start with.** Three hits and she is down, and everyone aboard goes down with her.
- **Endless machines** is a switch on the title card and in the pause menu, remembered between
  visits. A crash still costs you the people you were carrying, and the barrack they came out
  of is still empty. What it does not cost is the mission.

## The turn is the game, so the turn is drawn

The joystick had three positions and the machine drew a picture for each. It would be easy to
draw three pictures and switch between them, and it would be wrong: what everybody who played
this remembers is the *swing* — she leans over, comes round, and goes.

So there are **four drawn pictures from nose-on to profile**, mirrored for the other side,
seven in all, and the game walks through them at nine turn-units a second. A full swing from
one profile to the other is a third of a second and every frame of it is a frame somebody
drew — nothing is squashed, interpolated or flipped. The tilt of the rotor disc flattens
frame by frame as she turns, because edge-on a disc is flatter, and that is most of why it
reads as a turn rather than a substitution.

`tools/playtest.js` counts the pictures. On the committed page a full swing shows all seven
and never moves more than 0.15 of a step in one frame. With `--sabotage=snapturn` — the turn
set instead of walked, which is what three pictures and a switch amounts to — it shows two,
and the row goes red.

## Every scene, in a real browser

`npm test` cannot see the screen. Everything that has ever been visibly wrong in this
repository was wrong on the screen while the numbers were right, so there is a second tool
that opens the committed page in a real browser, presses the keys a player presses, reads the
pixels the page actually painted, and asks six questions of seven scenes:

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

**Every one of those checks has been shown to fail.** `--sabotage=<name>` patches one defect
into the page in memory and runs against that, because a check that passes on the broken build
and on the fixed one is not a check:

| sabotage | what it breaks | which row goes red |
| --- | --- | --- |
| `snapturn` | the turn is set rather than walked | `turn` |
| `frozenrotor` | the rotor is drawn at one angle for ever | `alive` |
| `slidwalk` | one pose of the gait, slid along | `stride` |
| `teleport` | a hostage crosses the ground in one frame | `in`, `stride` |
| `deaf` | the keyboard is not read | `answers` |
| `bands` | the chopper drawn in three slid slices | `whole` |

The `whole` check had to be thrown away once and rewritten. The first version measured the
painted machine on its own and asked whether nearly all of her ink was in one connected shape
— and it passed on `bands`, at 96%, because **the rotor bridges the gaps**. Eighteen pixels of
blade either side of the hub will hold a body cut into three slices together. What catches it
is comparing what was painted against the picture it claims to be painting: draw the body
sprite at the same place and count the pixels of it that are missing from the screen. On the
committed page that is nought. Under `bands` it is ten to seventeen, every scene.

## What the original is, and what this keeps

- **One strip of country seen from the side**, scrolling only sideways: the post on the left,
  the Bungeling frontier a little way along it, four barracks spread out beyond.
- **The three positions of the joystick**, and the rule that falls out of them: level gun in
  profile, upward gun nose-on.
- **Sixty-four hostages in four barracks, sixteen at a time** in the machine.
- **Shooting a barrack open**, and hostages who come out, wave, and run to a landed chopper.
- **Tanks and jets**, and the later air mines.
- **Hostages you can kill yourself**, by gun or by skid, which is the thing that makes the
  game about care rather than speed.
- **A grade at the end based on the count**, not on time.

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

- **Nothing here was checked against the original.** The machine this was built on cannot
  reach `archive.org` or Wikipedia — both are blocked by the network policy of the sandbox —
  so the emulator could not be driven and the gameplay description could not be read. Every
  claim above about what the 1982 game did is from general knowledge and **should be treated
  as unverified**. Numbers worth checking first against a real disk image: the hostage count
  per barrack, the capacity of the helicopter, whether the barracks open to gunfire or to
  proximity, and what the original's end-of-mission grades actually say.
- **The hostages are seven pixels wide**, and at that size the gait reads in the legs and
  barely at all in the arms. The four frames are four drawings and the two passing frames
  bring different knees through, but nobody would call the arm swing readable.
- **She has no separate landing picture.** The skids are part of every frame of the turn and
  do not flex or settle; touching down is a change of state, not a change of drawing.
- **The tanks aim at you, not at the hostages.** Their shells kill whoever they land on, which
  is how hostages die to them, but no tank ever decides to shell a queue.
- **The jets fly level and never dive**, and never turn round. They cross, they fire if you are
  in front of them and level with them, and they go.
- **The ground is a line.** There is no terrain, no cover, and nothing to fly around.
- **One high score, in this browser.** No table, no names, no two-player.
- **The balance was measured against a very poor player.** `tools/` has no autopilot in it,
  but the mission was run repeatedly through the node harness with a crude one — fly out,
  open a barrack, sit down, load, fly home — and tuned until that bot could get four to nine
  of them home on the easier settings across several seeds. That is a floor, not a
  calibration: nobody has played this with their hands.
- **No extra machines for points.** Three is three. The original handed them out; this does
  not, and the endless-machines switch is the only relief on offer.
- **A tank cannot pass a barrack**, which is how it is stopped from parking in the doorway,
  and the side effect is that no tank ever chases you the length of the map.

## Running it

```
node --test choplifter/tests/*.test.cjs          # 34 tests, no packages needed
node choplifter/tools/render-art.js --check      # the icons and the tile match the sprite
node tools/sync-nozoom.js --check                # this page carries the current zoom guard
```

and, with a browser on the machine:

```
cd choplifter
PW=$PWD/../law-of-the-west/node_modules/playwright-core node tools/playtest.js
```

`playtest.js` is not part of `npm test`: CI has no browser, and the game must stay playable
from a `file://` URL with nothing installed.

## Credits

Choplifter was written by **Dan Gorlin** and published by **Brøderbund Software** in 1982.
This is an original browser game built after it — none of its code, art or data is used here.
