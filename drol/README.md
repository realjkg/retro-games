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

- **▲ is the jetpack**: hold it and he flies. **▼ puts him back on his feet**, and on a floor
  he walks — slower than flying, steadier, and it is also how you drop through a hole to the
  storey below. **◀ ▶** move either way, **HOVER** (Shift/H) holds your height. A floor is
  only passable where a gap is cut in it.
- The big left button (Space/Z/Enter) is **FIRE**, and points the way you are facing.
  The big right button (X/E) sends a ball **straight up**, or **straight down** while ▼ is
  held. Three balls in the air at once, no more.
- **RADAR** (R) switches the panel along the top: the scope in the middle of it holds the
  whole maze at once — you, the child, the toy, the pet and everything hunting you — with the
  score, the robots you have left and the high score either side. Switching it off hands
  those rows back to the maze, which is worth doing on a small phone.
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
  **zombies**, **serpents**, **witch doctors** who throw a curse down the length of their
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

The art is drawn from a photograph of the original running, supplied by the owner of this
repository — I cannot reach a screenshot or a disk image from where this is built, so that
photograph is the only sight of the game anyone here has had.

**Everything the photographs actually show is transcribed from them.** The hero, the
wordmark, the pillars, the serpent, the urn, the thrown sword, the scorpion and the
alligator are all read off the screen pixel by pixel rather than drawn by hand. Three pictures of him,
in fact, because the screen has three: standing on his feet with the white of him in a block
under the collar, mid-stride with that block swung forward, and flying with it streaming out
behind. They line up with each other — the red band across his middle is the ninth row of all
three — so the game swaps between them without him jumping, and which one is on is the
difference between the jetpack and his feet. The photograph is a 320×240 screen at double size, so
each native pixel is a 2×2 block; the blocks under the character were averaged, matched to the
nearest of the four colours on screen, mirrored (he faces left in the photograph and right in
the sprite sheet), and written out as the twenty-by-nineteen character map that is `HERO_PIX`.
That is where the shape comes from: the blue dome, the white eye with its blue pupil, the red
band across his middle, the white vent the balls come out of, the red collar, the white of him
below it, and the pack on his back with its own red band and a nozzle under it. Read back and
compared against the photograph pixel by pixel, **393 of the 400 pixels are identical**; the
seven that are not are the jetpack's flame, which the game draws live so that it can go out
when you let go of ▲. Everything else on screen is drawn to match what the photograph shows
rather than copied out of it.

What the photograph settled:

- **The screen is black**, and the floors are bright bands with a white edge along the top —
  not shaded stone. Four colours and a black background is what the machine had.
- **The hero is a blue dome with a white eye and a red band**, a white vent below it and the
  pack on his back — a bot shaped like a cartoon creature, and now transcribed rather than
  imagined.
- **The top of the screen is a panel, not a strip**: SCORE at the left with a little robot
  and the count of them beside it, a magenta-framed scope in the middle with a line per
  storey and a dot for everything on it, HISCORE at the right, and the game's name in red
  beside three green bars.
- **The serpents are coiled and upright**, swaying where they stand, tongue out — a twenty
  by twenty-six character map, `SERPENT_PIX`, read off the third scene.
- **Thrown weapons are swords**: a white blade with a red guard, grip and pommel, twenty-nine
  pixels of floor long. `SWORD_PIX`.
- **White urns stand on the floors** of the scene the photograph shows: `URN_PIX`, nineteen
  by thirty-one, lip and belly and foot, three quarters of a storey tall. A ball apiece stops
  in one, two shatters it for points, and they are cover while they last.
- **The pillars are fluted columns** with a chequered frieze under the abacus, not the dentils
  guessed at before. `PILLAR_PIX` is a capital, one repeating shaft row and a base, so a pillar
  is drawn to whatever height a storey asks for.
- **The scorpion is salmon-red** and curls its tail over its back, twenty by twenty-one.
  `SCORPION_PIX` is the Apple II one, not the Commodore's.
- **The alligator carries its pack on its back** and fires it backwards in puffs — the white
  dots trailing behind it in the photograph are its exhaust, so they are `PET_JET`, blinked
  on and off rather than drawn every frame. `PET_PIX` is thirty-seven by fourteen; the boy's
  lizard is the same animal in a lighter green.

What is *not* transcribed is what no photograph here shows: the zombie, the witch doctor, the
vacuum cleaner, the magnet, the children, their mother and the toys. Those are drawn in the
idiom of the machine — four colours, black background — and marked as guesses, not copies.

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

The rest is an homage in the idiom of the machine, not a reproduction: what the photograph
did not show, nobody here has seen.

What that means on screen:

- **The robot** is the photograph's: a blue dome with one white eye, a red band across his
  middle, a white vent that lights as it fires, a red collar and the white of him below it,
  with the pack on his back. The pack burns from its nozzle only while ▲ is held; on a floor
  with the pack off he walks, and the white of him swings as he goes. He throws a shadow on
  the floor below him, which shrinks as he rises — the one cue that says how high up he is.
- **The floors** are blue bands with a **dashed** white edge along the top — on for two tiles
  of every three, which reads as a rail rather than a line — and a bright lip either side of
  every hole. There is nothing behind them: the background is black, which is what makes four
  colours look like more.
- **Pillars stand in the maze**, not only on the title card: a classical column every dozen
  tiles or so, holding each storey apart, drawn in greys because they are behind everything
  that moves. Nothing collides with them.
- **Each scene has its own blue**, because both photographs of the game in play are blue: a
  deeper one for the boy's scene, a violet one for the girl's and the witch doctor's, and a
  darker one again for the descent to the mother. Magenta is left to the title screen, which
  is where the original uses it.
- **A storey is forty pixels**, as the original's are, with a five-pixel band: measured off
  the screenshots rather than chosen. Mine had been fifty, which is why everything standing in
  one had looked too small — the robot filled 42% of a storey where he fills 51% on the real
  thing.
- **The bird is a transcription of the Commodore 64 screen**, read the same way the hero was
  read off the Apple II one: white, with green wings out, and two thirds of the height of a
  storey, as it is there.
- **The scorpion and the alligator are the Apple II's**, not the Commodore's. The scorpion
  had been a chunky pink thing off the C64 screen; the machine this game was played on drew
  it in salmon red with its tail curled over its back, and that is what is here now. The
  alligator likewise: bright green, snout out, with the pack squared off on its back and its
  exhaust puffing backwards in white dots.
- **The pets fly.** Both of them wear jetpacks in the original — an alligator hovering a few
  inches off the floor with a pack strapped to its back, which is the funniest thing on the
  screen — and both pets drift along their floor with the pack firing.
- **Five balls do not kill a turkey. They cook it.** The fifth turns it into a roast on a
  plate, which falls to the floor, stops hunting you and is worth a thousand to whoever walks
  into it. It is the original's best joke and it belongs here.
- **The rest of the menagerie is still mine**: the zombie hops on its belly, the witch
  doctor carries a lit staff under a red headdress, the vacuum
  has a mouth and wheels, and the magnet is a red horseshoe with a field pulsing out of it.
  The serpent and the thrown sword have left that list: both are transcriptions now.
- **The trapdoors** of the third scene are white boards in a magenta frame while they are
  shut, and a flap hanging through the hole once sprung — green if that was the safe one, red
  if it was not.
- **The title card** is the original's, as closely as a screen with a menu on it can be: the
  robot hovering over the top floor with his pack lit, the **Drol** wordmark standing inside
  the first storey — read off the real title screen, orange with a white glint on each letter
  — and a **fluted pillar** at either end of every storey, with its cyan capital, its dentil
  frieze and its cyan base, the shaft repeated to whatever height the storey is. The floors
  there are magenta with a white edge, as the title screen's are. Underneath it says AFTER AIK
  BENG · BRØDERBUND 1983, because he wrote it and they published it, and this is neither.
- **The panel's wordmark** is that same picture at half size, where the original puts its own.
- **The icon and the gallery tile** are that same sprite, scaled up and generated from it, so
  the game looks like itself from the collection page, the home screen and the browser tab.
- **The panel along the top** carries what the photograph carries: score, robots left, the
  scope, the high score and the name of the game. Switch the scope off and it collapses to a
  single line, which is worth doing on a small phone.

## Mobile tweaks

This is the improved-for-touch version of the idea, not a key-for-key port of a 1983
joystick game:

- A thumb-sized D-pad and large FIRE / vertical-shot / RADAR / MENU buttons, laid out for
  portrait phones with safe-area padding, no page zoom, and no scroll bounce.
- The original fires where the joystick points; here the second button is the vertical shot,
  so the pad hand is not asked to aim and fly at once. Both buttons say which way the next
  ball leaves the chest, and the pad says which of ▲ and ▼ is the jetpack and which is his
  feet.
- **HOVER** holds your height — the one thing an analogue-feeling backpack is hard to do with
  two digital buttons on glass.
- The scope can be switched off, which is not a thing the original offered; on a phone those
  sixteen rows are worth more as maze.
- **Stepping over the lip of a floor.** Blocked sideways with room just above — hovering in a
  hole, or half a body too low beside a slab — used to stop you dead against an edge you had
  no way of seeing. The robot now lifts himself over it. The bot found this one by spending
  forty seconds pressing right against a ledge.
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
  bot pays 0.28 robots per child rescued on Quiet and 1.73 on Swarming — six times the price —
  with its rescues per minute falling by more than half.
- **The holes were too tight.** Two tiles wide against a twelve-pixel robot; the bot kept
  thrusting into the edge of a slab. Three tiles now.
- **The witch doctor was the only hazard with one answer.** His curse outruns you, so the
  counter-play is vertical — but the game's verb is shooting, and a ball passed straight
  through a curse. A ball now knocks one out of the air, and deaths stopped being dominated
  by one thing: in twelve games they now split roughly evenly between the curse, the magnets,
  the thrown blades and the monsters.
- **A sprung trapdoor is a safe one.** The bot worked this out before I did: the plant
  retracts after a few seconds, so the door you survived is the door to use next time.
- **It was running away from dinner.** The roast a shot turkey becomes went into the same
  list as everything else on the floor, so the bot gave a plate of cooked bird a forty-six
  pixel berth and, when the child was behind it, fled the length of the scene for the rest of
  the round. Three mazes in fourteen ended with no rescue at all because of it. A roast is now
  neither a threat nor a target — it is a thousand points you walk into — and the same fourteen
  mazes went from 32 rescues to 42, with nothing left stuck.
- **Getting unwedged took longer than one frame.** Standing in the five pixels of a slab's
  thickness, the robot cannot move sideways at all, and the escape — climb or drop out of the
  band — used to be abandoned the moment he moved, because moving cleared the jam counter that
  had asked for it. He settled straight back in. Wedging now commits him to three quarters of
  a second of going one way.

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
- [Sega Does on the SG-1000 version](https://segadoes.com/2014/08/15/drol/) — "you control a
  generic-looking robot across a four story map layout. The robot levitates and is able to
  shoot multi-coloured balls out of his chest."
- **Photographs of the original running, of its title screen, and of the Commodore 64
  version**, supplied by the owner of this repository, which are where the palette, the panel across the top, the coiled serpents,
  the swords, the urns, the shape of the hero, his three poses, the **Drol** wordmark, the
  pillars, the scorpion and the bird come from.
  They are the only sight of the game this work has had, and they name its author: **Aik Beng**,
  for Brøderbund, 1983.
- Contemporary reviews, for what else it looked like: ANALOG
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
back and remembers the switch, the jetpack against his feet — that ▲ climbs and lights the
pack, that ▼ lands him and that walking is slower than flying — the way the view is sized to
its box, the full-screen toggle,
the button labels, the settings and best score that survive a reload, the browser that refuses
storage altogether, the install button, the one sprite that the game, the title card, the icon
and the collection tile all draw from, every kind of thing in the maze moving and being drawn
without throwing — the test that catches a sprite pasted into the AI by mistake, which is a
thing that happened — the rules that stop a held control turning into a text
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
