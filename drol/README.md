# Drol — The Four-Storey Maze

Part of [retro-games](../README.md).

[Play the browser game](https://realjkg.github.io/retro-games/drol/).

A self-contained browser action game built after **Drol** (written for the Apple II by
Benny Aik Beng Ngo, published by Brøderbund in 1983, and ported to the Commodore 64, the
Atari 8-bit machines and the Sega SG-1000). GitHub Pages publishes this directory's
`index.html` from `main` at `/drol/`. No packages, external assets, accounts, or build step
are required.

A witch doctor's curse has drawn two children into a four-storey maze, and their mother is
tied up on the bottom floor of it. You are the flying robot sent in after them: rise on the
backpack, drop through the holes cut in the floors, shoot what the curse sent, and touch each
of them to bring them home. Three scenes, and then the whole thing again and faster.

## Controls

- **◀ ▶** fly sideways. **▲** rises on the backpack, **▼** drops, **HOVER** (Shift/H) holds
  your height. A floor is only passable where a gap is cut in it.
- The big left button (Space/Z/Enter) is **FIRE**, and points the way you are facing.
  The big right button (X/E) sends a ball **straight up**, or **straight down** while ▼ is
  held. Three balls in the air at once, no more.
- **RADAR** (R) is the scope along the top: it holds the whole maze at once — you, the child,
  the toy, the pet and everything hunting you. Switching it off hands those rows back to the
  maze, which is worth doing on a small phone.
- **MENU** (Esc/P) pauses, and the pause screen carries the controls card, the music switch,
  the scope switch and the full-screen switch.
- Sound starts after a tap or key press. SOUND ON/OFF mutes or enables it.
- **FULL SCREEN** hides the page around the game: everything goes black, the maze and the
  controls are all that is left. Held sideways the pads move to either side of the screen
  like a handheld. EXIT FULL SCREEN (or Esc) puts the page back.

## What the original is, and what this keeps

- The shape of it: a maze of four storeys with gaps cut in the floors, seen from the side,
  scrolling sideways and taller than one screen of the machines it ran on.
- A flying robot with a rocket backpack who shoots multi-coloured balls out of his chest,
  and who dies on contact with anything the curse sent.
- The Defender-style **radar scope along the top**, which is how you find a child who is two
  floors away and moving.
- **Three scenes, then a harder loop**: the boy, the girl, and their mother. Finish the third
  and scene one comes back with more in it and faster.
- The children chase a toy — a **plane** in the first scene, a **balloon** in the second —
  and wander floor to floor after it. **Shoot the toy** and the child stops to look at it,
  which is what makes catching them possible. Touching the child is the rescue.
- Each of the first two scenes has a **pet** — the boy's lizard, the girl's alligator —
  worth a bonus if you reach it too.
- **Mother is bound and gagged at the bottom right** of the third scene, and does not move:
  that scene is the trip down to her.
- The menagerie the manual and the reviews name: **hopping scorpions**, **flying turkeys**,
  **monsters**, **serpents**, **witch doctors** who throw a curse down the length of their
  floor, **vacuum cleaners** that drag you along the floor they are sweeping, the **swords,
  daggers, arrows and axes** that cross a storey, and **magnets**, which swallow your shots
  instead of dying to them and pull you in. A magnet's pull falls off with distance and stops
  short of the floor beneath it, so the way past one — and the way to a child standing under
  one — is low and holding ▼. A vacuum works the same way along its floor: at the edge of its
  reach you can fly straight out of it, near the mouth you cannot.
- The third scene's **three trapdoors**: one is a way down, the other two have something with
  a mouth behind them, and there is no way to tell which from above.
- Extra robots at every 10,000 points.
- A witch doctor's curse travels faster than the backpack, so it cannot be outrun along a
  floor: climb out of its path, or shoot it out of the air.

## The look of it

The sprites and the maze are drawn to the original's description rather than copied from it.
I could not open a screenshot or a disk image from where this was built, so nothing here is
traced: what the art follows is what the sources say the 1983 game looked like — a small
**blue robot** with a rocket backpack, a maze of chunky floors seen from the side, and
ANALOG Computing's February 1984 note that it had "some of the best pseudo-3D graphics I've
ever seen". Everything is therefore an homage in the idiom of the machines it ran on, not a
reproduction of anyone's pixels.

**There is only one picture of the hero.** He lives in `index.html` as `HERO_PIX`, a
twelve-by-sixteen character map with `HERO_PAL` for the colours, and everything that shows
him reads it: the game draws it at 1×, the title card at 4×, and `tools/render-art.js` reads
it back out of the page to write `icon-180/192/512.png` and the inline SVG tile on the
collection page. Edit those sixteen rows, run the tool, and the game, the title, the app icon
and the tile all change together — they cannot disagree, and CI fails the build if the
committed artwork is not what the current sprite produces:

```
node drol/tools/render-art.js          # rewrite the icons and the collection tile
node drol/tools/render-art.js --check  # what CI runs
```

What that means on screen:

- **The robot** is blue and boxy: a pale blue head with a visor that faces the way you fly, a
  red beacon on an antenna, a backpack that shows its flame the moment you ask it to climb,
  and a lit chest port that the balls come out of. He throws a shadow on the floor below him,
  which shrinks as he rises — the one cue that says how high up he is.
- **The floors** are slabs with three faces: a lit top edge you land on, a stone front, and a
  shadow under it, with brickwork seams offset storey by storey and a bright lip either side
  of every hole. Behind them is a pillared back wall, so the maze has a depth to stand in.
- **Each scene has one palette**, the way a machine with a handful of colours would have done
  it: steel blue for the boy's scene, violet for the girl's and the witch doctor's, and a
  burnt red-brown for the descent to the mother.
- **The menagerie is a handful of blocks each, two frames apiece**, with one bright colour so
  you can tell what it is at a glance: the scorpion's tail curls over its back, the turkey
  flaps, the monster hops on its belly, the serpent's body ripples along, the witch doctor
  carries a lit staff under a red headdress, the vacuum has a mouth and wheels, the axe spins,
  and the magnet is a red horseshoe with a field pulsing out of it.
- **The trapdoors** of the third scene are boards across the hole with a hinge at either end
  while they are shut, and a flap hanging through it once sprung — green if that was the safe
  one, red if it was not.
- **The title card** is the same cast at twice the size: the robot hovering with a ball
  already on its way, the boy along the floor to the right, and the witch doctor to the left
  with his staff lit.
- **The icon and the gallery tile** are that same sprite, scaled up and generated from it, so
  the game looks like itself from the collection page, the home screen and the browser tab.

## Mobile tweaks

This is the improved-for-touch version of the idea, not a key-for-key port of a 1983
joystick game:

- A thumb-sized D-pad and large FIRE / vertical-shot / RADAR / MENU buttons, laid out for
  portrait phones with safe-area padding, no page zoom, and no scroll bounce.
- The original fires where the joystick points; here the second button is the vertical shot,
  so the pad hand is not asked to aim and fly at once. Both buttons say which way the next
  ball leaves the chest.
- **HOVER** holds your height — the one thing an analogue-feeling backpack is hard to do with
  two digital buttons on glass.
- The scope can be switched off, which is not a thing the original offered; on a phone those
  sixteen rows are worth more as maze.
- A difficulty choice on the way in (Quiet / Busy / Crowded / Swarming). The original had no
  such switch — it simply came round again harder — so this only sets where round one starts:
  how many things are in the maze, how fast they move, and how often the ones that wait for
  you stop waiting.
- The holes in the floors are three tiles wide rather than two. Two tiles left a twelve-pixel
  robot four pixels of slack on either side, which is fine for something with exact aim and
  miserable for a thumb.
- The whole four-storey maze is on screen at once, at every size, and only the sideways
  scroll moves; the drawing surface takes the shape of the box it sits in rather than a fixed
  rectangle, so full screen shows more maze instead of black bars.
- The game pauses itself when the tab goes to the background.
- A full-screen mode that isolates the game and its controls, going black in both colour
  schemes so the mode is never in doubt. It asks for real fullscreen where the browser has it
  and falls back to the same stripped layout where it does not, which is what iPhone Safari
  needs, and it reshapes itself for a phone held sideways.
- Nothing on the page is selectable text: holding a control holds the control, rather than
  raising iOS Safari's selection handles and Copy / Look Up callout over the pad. A button
  also lets go when the finger slides off it or the browser swallows the release.
- A title screen rather than a menu on a black rectangle: the four storeys with the pillared
  wall behind them, the robot hanging over the top one, the boy along the floor and the witch
  doctor watching from the other end.
- **SOUND ON/OFF, the music switch, the scope and your best score are remembered** between
  visits, in `localStorage` under one key, and every read and write is wrapped: a private
  window that refuses storage is still a game.
- An **INSTALL** button beside SOUND and FULL SCREEN, as the other games in the collection
  have: Chrome and Android hand over their own install prompt, and on iOS — which has no such
  event and no full-screen switch for a web page — the button explains Share ▸ Add to Home
  Screen instead.
- A card in the [collection page](../index.html) and in its 404 page, with the same robot on
  it, so Drol is one of the games rather than a directory you have to know about.

## Music

The score here is **new writing, not an arrangement**. Before composing it I went looking for
a music or sound credit for Drol and found none: the sources reachable from here credit Benny
Aik Beng Ngo for the Apple II original and Brøderbund as publisher, and none of them — not
MobyGames, not Lemon64, not the C64 wiki, not the Internet Archive's disk images — names a
composer or sound author for any version. No score of any release was available to study
here, so there was nothing to transcribe, and nothing here is transcribed.

What the game plays instead is written in the idiom of the machines it ran on — three voices,
a pulse lead, a triangle bass and a noisy drum, sequenced sixteenth by sixteenth and scheduled
ahead of the audio clock so a busy frame cannot make it stumble:

- **Title** — a march in E minor over a walking bass.
- **Scene one** — bright and quick; nothing much has gone wrong yet.
- **Scene two** — the witch doctor's scene, a semitone leaning on the tonic and refusing to
  resolve.
- **Scene three** — lower and faster, for the descent to the bottom right.
- **The rescue** — a short fanfare over the RESCUED card.

Every scene's pulse quickens as the rounds go by, which is the pressure the original's loop
applies without saying so. The music stops when you pause, when the tab goes to the
background, and when the game ends. SOUND OFF silences it with everything else, and the pause
menu can turn the music off on its own and leave the effects playing.

## Watching a bot play it

`drol/tools/play-agent.js` is a second player: it loads this directory's `index.html`, runs
the page's own script in a `vm` against the same stubs the tests use, and puts its hands on
the same `keys` object the D-pad writes to, once per frame. Nothing about the game is
simulated or re-implemented for it, so what it reports is true of the game you can play.

```
node drol/tools/play-agent.js                   one game on the default setting
node drol/tools/play-agent.js --games 12 --seconds 150
node drol/tools/play-agent.js --diff 4 --seed 7 --trace     what it decides, second by second
node drol/tools/play-agent.js --games 20 --json  > runs.json
```

It sees only what a player can see — positions, kinds, and the holes in the floors, never
which of the three trapdoors is the safe one — and it plays the actual game: find the toy,
shoot it so the child stops chasing it, collect the pet if it is on the way, catch the child,
go down through the holes, and in the third scene pick a trapdoor and live with it. The
report counts rescues and how long each took, deaths and what did the killing, rescues and
deaths per minute, how far round the loop it got, and **stalls** — twenty seconds in which it
made no progress towards anything, which is how a maze that cannot be flown would announce
itself. Runs are reproducible: the seed drives the scene *and* the game's own `Math.random`,
so `--seed 7` is the same game every time.

### What it found, and what changed because of it

- **Magnets and vacuums were traps rather than hazards.** Their pull was a flat 160 and
  120 px/s against a robot that flies at 96, so once inside the field you could not leave it —
  and because the pull was being added to a velocity that the controls immediately smoothed
  back towards what the pad was asking for, most of it was quietly swallowed anyway. The pull
  now falls off with distance and is applied to the move rather than the velocity: outside
  about a third of the reach you fly out of it, inside it you are already being eaten, and
  there is no band in the middle to hover in forever. The magnet's reach also stops short of
  the floor below it, which is what makes a child standing under one reachable at all.
- **The difficulty setting was decoration.** The bot died at the same rate on Quiet as on
  Swarming, because the only thing the setting moved was the number of enemies in a maze big
  enough to swallow them. It now scales the count, the speed and the aggression, and the
  bot's rescues per minute fall from 3.6 to 2.1 across the four settings.
- **The holes were too tight.** Two tiles wide against a twelve-pixel robot; the bot kept
  thrusting into the edge of a slab. Three tiles now.
- **The witch doctor was the only hazard with one answer.** His curse outruns you, so the
  counter-play is vertical — but the game's verb is shooting, and a ball passed straight
  through a curse. A ball now knocks one out of the air, and deaths stopped being dominated
  by one thing: in twelve games they now split roughly evenly between the curse, the magnets,
  the thrown blades and the monsters.
- **A sprung trapdoor is a safe one.** The bot worked this out before I did: the plant
  retracts after a few seconds, so the door you survived is the door to use next time.

Where the bot stalled and the game was not at fault, the fix belonged in the bot — flying up
and down the same hole because the goal kept changing floors, dithering between two threats,
or parking in the one-pixel band between "close enough not to steer" and "close enough to
drop". Those are recorded in the agent, not in the game.

## What remains approximate

This is **not an emulator or an exact reproduction** of the 1983 release. Floor layouts,
sprite art, the exact enemy roster per scene, movement speeds, the scoring table, the bonus
values and the rate at which the loop gets harder are new work in the spirit of the original,
not measured against a running Apple II, Atari or C64 copy. The sound is locally synthesized
Web Audio, not the original machine's audio, and the music is an original composition in a
period idiom rather than any tune from the 1983 release — see **Music** above for why there
was none to arrange. These distinctions should be preserved when describing the game.

Two details the sources disagree on, and how they are resolved here:

- **Which child comes first.** One account has the boy on the first screen chasing a toy
  plane and the girl on the second chasing a balloon; a Lemon64 review has the girl and her
  lizard first and the boy and his alligator second. This game follows the first account for
  the order (boy, then girl) and the second for the pets, and pairs the lizard with the boy
  and the alligator with the girl.
- **The trapdoors.** These are described as being in "some versions" of the third level, not
  all. They are always present here.

## Sources

- [Wikipedia: Drol](https://en.wikipedia.org/wiki/Drol) — 1983, Brøderbund, written for the
  Apple II by Benny Aik Beng Ngo, ported to the C64, Atari 8-bit and SG-1000; a robot flying
  a four-storey maze; the Defender-style radar; three levels that loop harder; the trapdoor
  choice on the third level.
- [Drol on the Internet Archive (Apple II, asimov collection)](https://archive.org/details/a2_asimov_drol)
  — the emulator-playable disk image the port was asked for, and
  [the woz-a-day image](https://archive.org/details/wozaday_Drol).
- [Lemon64: Drol](https://www.lemon64.com/game/drol) and its
  [review](https://www.lemon64.com/review/drol/1162) — the witch doctor's curse, the children
  lured into multi-levelled ruins, the per-level enemy lists, the pets, and the mother bound
  at the lower right of the third level.
- Contemporary reviews, for what it looked like: a small **blue** robot, and ANALOG
  Computing's February 1984 line that Drol had "some of the best pseudo-3D graphics I've ever
  seen" — the two facts the art here is drawn towards, since no screenshot of the original was
  reachable from where this was built.
- [MobyGames: Drol](https://www.mobygames.com/game/9314/drol/) — the hero with the rocket
  backpack and the full-screen radar scope; hopping scorpions, monsters, snakes, flying
  turkeys, swords, daggers, arrows, magnets, witch doctors and vacuum cleaners; the boy
  chasing a toy plane and the girl a balloon, and shooting either to stop them.
- [Drol for the C64 at GameFAQs](https://gamefaqs.gamespot.com/c64/569566-drol) and
  [for the Atari 8-bit](https://gamefaqs.gamespot.com/atari8bit/215184-drol) — release notes
  and the joystick-and-fire-button controls. *Run* magazine's May 1984 review of the C64
  version graded it an A.
- Searched for a music or sound credit across all of the above plus the
  [High Voltage SID Collection](https://www.hvsc.c64.org/): no composer is credited for any
  version, which is why the score here is original work.

## Verification

Run `node --test drol/tests/*.test.cjs` from the repository root (or
`node --test tests/*.test.cjs` from `drol/`) with Node.js. The tests execute the game's
own script with minimal DOM/audio stubs and cover scene generation (seed determinism, four
storeys with gaps cut in them, walls at both ends, a busier maze on a harder setting and on a
later round), the backpack against ceilings and gaps, the three-balls-at-once limit and the
direction each one leaves in, shots that kill and score, the witch doctor's three hits, the
magnet that eats shots and drags you, shooting the toy to root the child, the rescue and the
scene order through to the loop back to scene one, the pet bonus, the third scene's three
trapdoors and the thing behind the wrong two, the curse, lives and the respawn's
invulnerability, extra robots at every 10,000 points, the scope switch and the rows it hands
back and remembers the switch, the way the view is sized to its box, the full-screen toggle,
the button labels, the settings and best score that survive a reload, the browser that refuses
storage altogether, the install button, the one sprite that the game, the title card, the icon
and the collection tile all draw from, the rules that stop a held control turning into a text
selection, and the music engine — that it
plays, follows the game state, quickens round after round, and answers both the mute and the
music switch. They verify audio events and mute, not subjective sound authenticity.

`tests/agent.test.cjs` is the other half: it puts the bot from `tools/play-agent.js` through
whole games and checks the things only playing can check — that a seed is the same game
twice, that every maze can be finished, that a round can be played through all three scenes
to the mother and round again, that the agent is almost never stuck for twenty seconds, and
that a harder setting really is a slower rescue. Browser smoke testing separately verifies
menus, touch controls, rendering and audio activation.

## Full screen without the browser in the way

Mobile browsers slide their toolbars in and out while you play, and anything sized to the
current viewport resizes with them — the game jumping mid-flight. Two things keep that out:

- The full-screen layout is sized in **`svh`**, the viewport height with the toolbars showing,
  so it does not move when they do. The strip the bars vacate simply stays dark. (`dvh` and
  `vh` are declared first for browsers without `svh`.)
- **Install it** and there are no toolbars at all: on iPhone or iPad, Share ▸ **Add to Home
  Screen**; on Android or desktop Chrome, the browser's own install offer. A launch from the
  icon opens straight into the full-screen layout, and `sw.js` — a small network-first service
  worker — keeps the game playable with no signal while still picking up new deploys.
