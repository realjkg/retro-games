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
  instead of dying to them and pull you in.
- The third scene's **three trapdoors**: one is a way down, the other two have something with
  a mouth behind them, and there is no way to tell which from above.
- Extra robots at every 10,000 points.

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
  such switch — it simply came round again harder — so this only sets how full round one is.
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
- A title screen rather than a menu on a black rectangle: the four storeys in silhouette with
  the robot hanging between them, a child two floors down and something watching from below.

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

Run `node --test drol/tests/rescue.test.cjs` from the repository root (or
`node --test tests/rescue.test.cjs` from `drol/`) with Node.js. The tests execute the game's
own script with minimal DOM/audio stubs and cover scene generation (seed determinism, four
storeys with gaps cut in them, walls at both ends, a busier maze on a harder setting and on a
later round), the backpack against ceilings and gaps, the three-balls-at-once limit and the
direction each one leaves in, shots that kill and score, the witch doctor's three hits, the
magnet that eats shots and drags you, shooting the toy to root the child, the rescue and the
scene order through to the loop back to scene one, the pet bonus, the third scene's three
trapdoors and the thing behind the wrong two, the curse, lives and the respawn's
invulnerability, extra robots at every 10,000 points, the scope switch and the rows it hands
back, the way the view is sized to its box, the full-screen toggle, the button labels, the
rules that stop a held control turning into a text selection, and the music engine — that it
plays, follows the game state, quickens round after round, and answers both the mute and the
music switch. They verify audio events and mute, not subjective sound authenticity. Browser
smoke testing separately verifies menus, touch controls, rendering and audio activation.

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
