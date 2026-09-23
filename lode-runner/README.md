# Lode Runner — Bungeling Empire

Part of [retro-games](../README.md).

[Play the browser game](https://realjkg.github.io/retro-games/lode-runner/).

A self-contained browser recreation built after **Lode Runner** (Doug Smith, Brøderbund, released
for the Apple II on 23 June 1983 and ported to nearly every machine of the decade, the Commodore 64
among them). GitHub Pages publishes this directory's `index.html` from `main` at `/lode-runner/`.
No packages, external assets, accounts, or build step are required.

The Bungeling Empire took the gold. You go in after it with a shovel that only digs downwards and
diagonally, and no way at all to kill the guards who are already running at you.

## Controls

- Move with the **stick** or the arrow keys — the stick is a thumb pad you drag rather than
  four buttons you press. The original's own keys work too: **I J K L** to move,
  **U** to dig left and **O** to dig right. WASD moves; Z and X also dig.
- **DIG ◀** and **DIG ▶** take out the brick diagonally below you on that side. You cannot dig
  straight down, you cannot dig upwards, and you cannot dig at all from a rope or a ladder.
- **RESTART** (R) gives yourself up and starts the level again at the cost of a man — the same
  way out the original gave you when you had walled yourself in.
- **PAUSE** (Esc or P) opens the menu, which carries the controls card, the music switch and the
  full-screen switch. **≡** on the pad does the same.
- Sound starts after a tap or key press. SOUND ON/OFF mutes or enables it.
- **FULL SCREEN** hides the page around the game: everything goes black, the board and the
  controls are all that is left. Held sideways the pads move to either side of the screen like a
  handheld. EXIT FULL SCREEN (or Esc) puts the page back.

## What the original is, and what this keeps

- **The 28 × 16 board.** The Apple II release laid every level out on a grid 28 tiles wide and 16
  tall, and so does this. The level text uses the same character set the Lode Runner level
  archives settled on — `#` brick, `@` solid block, `H` ladder, `-` rope, `X` false brick,
  `$` gold, `S` hidden ladder, `&` the runner, `0` a guard — so a level written here reads the
  way one written for the original does.
- **The loop.** Take every chest on the level, then climb to the very top of the screen. The
  ladder out is part of the level but stays invisible until the last chest is lifted.
- **No jumping, no weapon.** You can run, climb ladders, cross ropes hand over hand, fall, and
  dig. That is the whole verb list, and it was in 1983 too.
- **Holes.** A dug brick is a hole for a few seconds and then grows back. A guard who falls in is
  stuck long enough for you to run across his head, and if he was carrying a chest he drops it
  where you can reach it — often the only way to get that chest back. If he is still in the hole
  when the brick returns he is buried and reappears near the top of the screen. If **you** are
  still in the hole when it returns, that is a man gone.
- **Poured blocks cannot be dug**, and a brick with anything resting on top of it cannot be dug
  either.
- **False bricks** are drawn exactly like brick and hold nothing up. There is no telling one from
  the other until the floor is not there.
- **Guards.** They run at a little under sixty per cent of your speed, and climb at the same
  fraction, so you can open a gap on the flat and up a ladder alike — that margin is the only
  advantage you have. They get slower as more of them crowd a level. They carry one chest at a
  time, they block each other, and they do not take the shortest path: they look along the floor
  they are on for the column that brings them nearest your row and commit to it, which is why
  they overshoot, bunch up and drop into holes you dug a moment ago.
- **Scoring**: 250 a chest, 75 for a guard you put in a hole and 75 again for burying him, 1500
  for clearing a level, an extra man every 15,000 points, five men to start.
- **The level generator.** The 1983 box called it "an action game and game generator" — the
  built-in editor was half the product, and one of the first to ship in a commercial game. It is
  here: lay tiles by tapping the board, TEST plays what you have, SAVE keeps it in the browser,
  and the text box holds the level in the same character format so you can copy one out or paste
  one in. MY LEVELS on the title screen plays your set instead of the shipped one.

## What is new work, and what remains approximate

This is **not an emulator or a port**, and it is not the 1983 game's data.

- **The levels are new.** The original shipped 150 hand-made levels; the sixteen here were
  written for this recreation and are not reconstructions of any of them. They are checked
  automatically instead of by eye: the tests walk each one and require that every chest can be
  reached *and* that there is a way back to the top from it, so no level can be finished only by
  dying. The generator runs the same check when you press SAVE.
- **The guard behaviour is a reimplementation**, written from public descriptions of how the
  original's guards act, not from a disassembly. It gives the same shape of play; it is not
  frame-for-frame the 1983 algorithm.
- **Movement speeds, hole and dig timings, the fill delay and how long a guard flounders** were
  tuned here for feel and adjusted from playing it. They are not measured against a running
  Apple II or C64 copy. The guard speeds are pinned by a test to stay under 65% of the runner's
  and within a few points of each other on the flat and on a ladder, because the two drifting
  apart is what made climbing away stop working.
- **The art is drawn on a canvas** in a period palette rather than lifted from any release, and
  the drawing surface takes the shape of the box it is in rather than a fixed 280 × 192, so the
  extra room in full screen shows a bigger board instead of black bars.
- **The sound effects are synthesized the way the machine synthesized them**, but they are not
  the original's audio. No sample, recording or sound data from any release of Lode Runner is
  used here — that material is still under copyright. What is reproduced is the *technique*: see
  **Sound** below.

These distinctions should be preserved when describing the game.

## Sound

The Apple II had one bit of audio. A soft switch at `$C030` flipped the speaker cone in or out,
and that was the whole instrument — every sound the 1983 game made was a 6502 loop counting
cycles between flips. Pitch is the gap between them. There is no volume control at all: the only
way to sound quieter is to spend less of each cycle flipped out, so a fade is a pulse getting
narrower rather than a wave getting smaller.

The effects here are built that way instead of being oscillators with the edges rounded off: a
buffer of hard +1 / −1 produced by simulating the flips, run through a filter standing in for the
small paper cone that had to reproduce it. The scraping sounds — digging, a guard being buried —
pick the gap at random inside a range each cycle, which is how one bit makes noise. The tests
check the claim rather than take it on trust: every sample of every effect must be exactly +1 or
−1, and a fading effect must thin its duty cycle rather than drop its amplitude.

The runner also ticks once per tile he crosses, and is silent while falling, the way the original
clicked as you ran.

None of this is the original's sound data. It is the same method pointed at new sounds.

The speaker's randomness is deliberately kept off the game's own generator, so the SOUND switch
cannot change where a guard reappears. There is a test for that too.

## Music

The score here is **new writing, not an arrangement**. Before composing it I went looking for the
1983 release's music or sound credit and found none: the sources reachable from here credit Doug
Smith for the game and Brøderbund as publisher, and none names a composer or sound author for the
Apple II original. The VGMRips entry for the Apple II version lists the composer as unknown. A
composer is credited for the much later NES conversion, which is a different piece of music by a
different person and not what this game is after. So there was nothing to transcribe, and nothing
here is transcribed.

What plays instead is written in the idiom of the machines the game ran on. The music is three
voices — a pulse lead, a triangle bass and a noisy drum — which is a Commodore 64 SID sound
rather than an Apple II one; the Apple II speaker described above could not have played it. That
is a deliberate split: the effects are the 1983 Apple II machine, the music is the sound of the
8-bit conversions. It is sequenced sixteenth by sixteenth and scheduled ahead of the audio clock
so a busy frame cannot make it stumble:

- **Title** — a slow processional in E minor over the tower, which is already running behind the
  menu.
- **In the tower** — sparse and low, a drone and a motif that answers itself.
- **On the way out** — the same key at a much faster clip, from the moment the last chest is
  yours until you reach the top, because everything in the building now knows where you are.

It stops when you pause, when the tab goes to the background, and when the game ends. SOUND OFF
silences it with everything else, and the pause menu can turn the music off on its own and leave
the effects playing.

## Mobile tweaks

This is the improved-for-touch version of the idea, not a key-for-key port of a game written for
a keyboard:

- A thumb-sized D-pad and two large DIG buttons, laid out for portrait phones with safe-area
  padding, no page zoom and no scroll bounce.
- A full-screen mode that isolates the game and its controls, going black in both colour schemes
  so the mode is never in doubt. It asks for real fullscreen where the browser has it and falls
  back to the same stripped layout where it does not, which is what iPhone Safari needs, and it
  reshapes itself for a phone held sideways.
- The generator is usable with a finger: tap or drag across the board to lay tiles, with the
  palette where the pad usually is.
- The game pauses itself when the tab goes to the background.
- A title screen rather than a menu on a black rectangle: the tower drawn and running, a runner
  crossing a rope and guards working the floors below, with the menu sitting on it as a scrim.
- Nothing on the page is selectable text: holding a control holds the control, rather than
  raising iOS Safari's selection handles and its Copy / Look Up callout over the pad.

## Sources

- [Wikipedia: Lode Runner](https://en.wikipedia.org/wiki/Lode_Runner) — Doug Smith, Brøderbund,
  Apple II on 23 June 1983, 150 levels, the built-in level editor, the Bungeling Empire and the
  guards, and the gold-in-a-hole rule.
- [Wikipedia: Douglas E. Smith](https://en.wikipedia.org/wiki/Douglas_E._Smith) — the author, an
  architecture student at the University of Washington when the prototype (*Kong*, then *Miner*)
  was written; Brøderbund renamed it after "the mother lode".
- [Lode Runner on the Internet Archive](https://archive.org/details/msdos_Lode_Runner_1983_1983)
  and [the Apple II release](https://archive.org/details/lode-runner), whose title is
  "Lode Runner: an action game and game generator for the Apple II" — the reference the port was
  asked for.
- [ZX81 Keyboard Adventure: Lode Runner level design](https://www.zx81keyboardadventure.com/2017/02/lode-runner-on-zx81-part-2-level-design.html)
  — the Apple II maps are 28 wide by 16 tiles high, of ladders, ropes, bricks, cement and false
  bricks.
- [GameFAQs guide to Lode Runner](https://gamefaqs.gamespot.com/nes/587420-lode-runner/faqs/40192)
  and [Codex Gamicus](https://gamicus.fandom.com/wiki/Lode_Runner) — 250 a chest, 75 for trapping
  a guard, 1500 for a level.
- [GameDev.net: Lode Runner guards A.I.](https://gamedev.net/forums/topic/603171-lode-runner-guards-ai/)
  and [Data Driven Gamer on guard psychology](https://datadrivengamer.blogspot.com/2023/01/championship-lode-runner-guard.html)
  — the guards evaluate directions in a fixed order and follow a greedy scan rather than a
  shortest path, which is what makes them exploitable.
- [Applefritter: how game sound effects were made](https://www.applefritter.com/content/audiogame-sound-effects-how-were-they-made)
  — the Apple II's 1-bit speaker, the `$C030` soft switch, cycle-counted timing between clicks
  and pulse-width modulation for anything more intricate; Lode Runner is named among the games
  built on it.
- Searched for a music or sound credit across the above plus
  [MobyGames](https://www.mobygames.com/game/243/lode-runner/) and
  [VGMRips](https://vgmrips.net/wiki/Lode_Runner), which lists the Apple II version's composer as
  unknown: no composer is credited for the 1983 release, which is why the score here is original
  work.

## Verification

Run `node --test lode-runner/tests/*.test.cjs` from the repository root (or
`node --test tests/*.test.cjs` from `lode-runner/`) with Node.js. The tests execute the game's own
script with minimal DOM, storage and audio stubs.

`tests/rules.test.cjs` covers the rules of the tower: walking and being stopped by a wall, falling
with no steering, ladders and the cell above a ladder's top rung, ropes and letting go of them,
false bricks, every condition that refuses a dig, the hole that fills back in and buries what is
in it, a guard chasing along a row and killing on contact, a guard in a hole acting as a floor and
dropping his chest, a guard climbing out before the brick returns and being buried when he cannot,
the 250 / 75 / 1500 / 15,000 scoring, the way out appearing only on the last chest, the top row
counting only once it does, giving yourself up, that twenty seconds of play come out identical
with the sound on and off, and that a guard stays slow enough to be outrun both on the flat and
up a ladder.

`tests/levels.test.cjs` covers the level data and the page: that the board is 28 × 16 and every
shipped level fills it with a runner, chests, guards and a hidden exit; that each level survives
a round trip through its text format; that every chest can be reached and got away from again on
every level, with a deliberately unwinnable level proving the check can still say no; the
generator laying tiles, counting gold, saving to local storage and playing what it made; the
canvas taking the shape of its box; the full-screen switch; the original's I/J/K/L and U/O keys;
the rules that stop a held control turning into a text selection; the music engine following the
game state and answering both the mute and the music switch; and the effects being genuinely one
bit — every sample of every effect exactly +1 or −1, a fade carried by duty cycle rather than
amplitude, and one footstep click per tile crossed with silence while falling.

The tests verify audio events and mute, not subjective sound authenticity. Browser smoke testing
separately verifies menus, touch controls, rendering and audio activation.

## Full screen without the browser in the way

Mobile browsers slide their toolbars in and out while you play, and anything sized to the
current viewport resizes with them — the game jumping mid-move. Two things keep that out:

- The full-screen layout is sized in **`svh`**, the viewport height with the toolbars showing,
  so it does not move when they do. The strip the bars vacate simply stays dark. (`dvh` and
  `vh` are declared first for browsers without `svh`.)
- **Install it** and there are no toolbars at all: on iPhone or iPad, Share ▸ **Add to Home
  Screen**; on Android or desktop Chrome, the browser's own install offer. A launch from the
  icon opens straight into the full-screen layout, and `sw.js` — a small network-first service
  worker — keeps the game playable with no signal while still picking up new deploys.
