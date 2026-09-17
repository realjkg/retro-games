# Aztec — Tomb of Quetzalcoatl

Part of [retro-games](../README.md).

[Play the browser game](https://realjkg.github.io/retro-games/aztec/).

A self-contained browser action-adventure built after **Aztec** (Paul Stephenson, Datamost,
1982 on the Apple II; ported to the Atari 8-bit and the Commodore 64). GitHub Pages publishes
this directory's `index.html` from `main` at `/aztec/`. No packages, external assets, accounts,
or build step are required.

You enter the newly opened Tomb of Quetzalcoatl with a pistol and three sticks of dynamite,
work your way down through the floors for the jade idol, and climb back out alive. The tomb is
generated fresh for every game, so no two raids are the same.

## Controls

- Move with the pad or the arrow keys (also WASD). **JUMP** (up) also climbs the steps you are
  standing on; **CRAWL** (down) slips under half-blocked walls and climbs back down.
- The big left button (Space/Z/Enter) is the weapon in your hand and says which it is:
  **MACHETE**, **SHOOT 6** with the bullets left, **LIGHT 3** for dynamite, or **FISTS**.
  **SWAP** (Q/C) changes it.
- The big right button (X/E) is the one context action and says what it will do where you are
  standing: **OPEN** a chest or debris pile, **DIG** the dirt wall you face, **GO DOWN**,
  **GO UP**, **ESCAPE** with the idol (**NEED IDOL** at the entrance without it), or plain **USE**.
- **WALK/RUN** toggles your pace and lights up while you are running. **MENU** (Esc/P) pauses,
  and the pause screen carries the controls card and the full-screen switch.
- Sound starts after a tap or key press. SOUND ON/OFF mutes or enables it.
- **FULL SCREEN** hides the page around the game: everything goes black, the screen and the
  controls are all that is left, and the view grows until the whole depth of the tomb is on
  screen at once. Held sideways the pads move to either side of the screen like a handheld.
  EXIT FULL SCREEN (or Esc) puts the page back.

## What the original is, and what this keeps

- The goal and the kit: the Tomb of Quetzalcoatl, a jade idol on the lowest level, a machete,
  a pistol and dynamite, and a difficulty setting of 1 to 8 that makes the tomb deeper, the
  enemies more numerous and aggressive, and the idol worth more.
- A randomly generated tomb each game, drawn from the side, with three floors per level and
  steps between them.
- Chests and debris piles that hide a machete, a pistol, bullets, dynamite, a healing potion,
  the remains of Professor Von Forster, or the idol itself.
- Snakes, spiders, jaguars, Aztec guards, alligators in the flooded rooms, and something large
  and reptilian guarding the idol.
- Dirt walls you dig through, blow open, or crawl under; spiked pits; flooded rooms that slow
  you and drown you if you go under; compacting walls on the harder settings.
- A standing machete swing passes over a serpent — the original taught you to go low, and so
  does this one: crawl and stab, or shoot from a crawl. Pistol shots fired standing fly over
  low enemies too.
- Your own dynamite does not care whose it is. Light it and get clear.

## Mobile tweaks

This is the improved-for-touch version of the idea, not a key-for-key port of a game that used
about fifteen keyboard commands:

- A thumb-sized D-pad and large FIRE/USE/WEAPON/RUN buttons, laid out for portrait phones with
  safe-area padding, no page zoom, and no scroll bounce.
- One contextual USE button replaces the original's separate open, look, take, climb and dig
  commands, and one dynamite tap replaces the crawl-position-extend-place sequence.
- RUN is a toggle rather than a separate movement mode you must switch into and out of.
- One dig at standing height clears head room as well, so a dug passage is one you can walk
  through.
- The view is a torchlit camera that follows you, with an on-canvas HUD carrying health, ammo,
  dynamite, depth, timer and score, plus a text status line above the screen for small displays.
- The game pauses itself when the tab goes to the background, and short haptic taps (where the
  browser supports them) mark hits, blasts and the idol.
- A full-screen mode that isolates the game and its controls, going black in both colour
  schemes so the mode is never in doubt. It asks for real fullscreen where the browser has it
  and falls back to the same stripped layout where it does not, which is what iPhone Safari
  needs, and it reshapes itself for a phone held sideways.
- The drawing surface takes the shape of the box it is in rather than a fixed 320x192, so the
  extra room in full screen shows more tomb instead of black bars.
- Buttons that name what they are about to do, so nothing on the pad is a guess.
- A title screen rather than a menu on a black rectangle: a moonlit step pyramid with the
  torches still burning, the jade idol glowing in the temple doorway and someone already on
  the stair, drawn on the canvas and animated, with the menu sitting on it as a scrim.

## What remains approximate

This is **not an emulator or an exact reproduction** of the 1982 release. Room layouts, tile
art, enemy roster and behaviour, damage numbers, movement speeds, the scoring formula and the
effect of each difficulty step are new work in the spirit of the original, not measured against
a running Apple II, Atari or C64 copy. The sound is locally synthesized Web Audio, not the
original machine's audio. The original's animation of the explorer, its specific trap set and
its endgame sequence are interpretations here. These distinctions should be preserved when
describing the game.

## Sources

- [C64-Wiki: Aztec (Action-Adventure)](https://www.c64-wiki.com/wiki/Aztec_(Action-Adventure)) — the reference the port was asked for.
- [Wikipedia: Aztec (video game)](https://en.wikipedia.org/wiki/Aztec_(video_game)) — tomb of Quetzalcoatl, jade idol, machete/pistol/dynamite, difficulty 1–8, randomly generated tomb.
- [GameFAQs review of the Apple II release](https://gamefaqs.gamespot.com/appleii/581004-aztec/reviews/133675) — three floors with steps, searchable chests and debris, contents including Professor Von Forster's remains, the enemy menagerie, flooding rooms and compacting walls.
- [Aztec on the Internet Archive (woz-a-day collection)](https://archive.org/details/wozaday_Aztec) — original Apple II disk image.
- [c64online.com: Aztec](https://c64online.com/c64-games/aztec/) and [Lemon64: Aztec](https://www.lemon64.com/game/aztec) — C64 release notes and controls.

## Verification

Run `node --test aztec/tests/tomb.test.cjs` from the repository root (or
`node --test tests/tomb.test.cjs` from `aztec/`) with Node.js. The tests execute the game's own
script with minimal DOM/audio stubs and cover tomb generation (seed determinism, one idol on the
lowest level, difficulty scaling), crawling under walls, digging, dynamite, the low-versus-high
weapon rule, ammunition, hazards, level transitions, the escape condition, the full-screen toggle, the button
labels and the way the view is sized to its box. They verify audio
events and mute, not subjective sound authenticity. Browser smoke testing separately verifies
menus, touch controls, rendering and audio activation.
