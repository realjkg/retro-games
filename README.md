# retro-games
Retro games on Apple II, Commodore64, Atari and in the arcade

## Games

- [Archon — The Light and the Dark](archon/) (Commodore 64) — [play it](https://realjkg.github.io/retro-games/archon/)
- [Aztec — Tomb of Quetzalcoatl](aztec/) (Commodore 64) — [play it](https://realjkg.github.io/retro-games/aztec/)
- [The Bard's Tale — The Sewers of Skara Brae](bards-tale/) (Commodore 64) — [play it](https://realjkg.github.io/retro-games/bards-tale/)
- [Choplifter — Bungeling Rescue](choplifter/) (Apple II) — [play it](https://realjkg.github.io/retro-games/choplifter/)
- [Drol — The Four-Storey Maze](drol/) (Apple II) — [play it](https://realjkg.github.io/retro-games/drol/)
- [Galaga — The Swarm](galaga/) (Arcade) — [play it](https://realjkg.github.io/retro-games/galaga/)
- [Law of the West — Gold Gulch](law-of-the-west/) (Commodore 64) — [play it](https://realjkg.github.io/retro-games/law-of-the-west/)
- [Lode Runner — Bungeling Empire](lode-runner/) (Apple II) — [play it](https://realjkg.github.io/retro-games/lode-runner/)
- [Tapped — The Root Beer Bar](tapped/) (Arcade) — [play it](https://realjkg.github.io/retro-games/tapped/)

## The controls, which all nine share

Every game is played with a **joystick on the glass** rather than a grid of
direction buttons: one round gate, a knob that follows the thumb, and the
pointer taken captive on the way down so a thumb that slides off the pad keeps
steering. The machines these games came off had a stick; a three-by-three grid
of buttons is a later idea from a different console, and on a phone it is the
worse of the two — nine targets found by feel, with hard edges between them, so
a thumb drifting from one to the next crosses a corner and stops the player
dead mid-stride.

Five of the games take it from one copy in `shared/stick.js`, written into each
page by `tools/sync-stick.js`. Four — Archon, Choplifter, Galaga and Tapped —
came with a stick of their own and keep it, because three of those are not this
one: Galaga's runs on a single axis behind a gate, Tapped's is a ball-top that
leans, Archon's is eight-way with a repeat and there are two, one per player.

The same shared copy arrangement holds the **browser guards**: `shared/no-zoom.js`
stops a double tap, a pinch or a long press from zooming the page out from
under the controls, and puts a page that is zoomed already back. Two tools
check the whole collection in a real browser:

    PW=$PWD/node_modules/playwright-core node tools/zoomguard.js
    PW=$PWD/node_modules/playwright-core node tools/stickcheck.js

`zoomguard.js` asks whether each page refuses the gestures that zoom it, whether
a long press can still take a control away, and whether the page can be panned
sideways at 320px. `stickcheck.js` drags each game's stick with a real pointer
and asks whether the knob follows, stays inside its own rim, the game reads the
push, the man moves, and everything stops when the thumb comes off. Neither is
part of the test run: CI has no browser, and the games must stay playable from
`file://` with nothing installed.

Both run in Chromium. The behaviour being defended against is WebKit's, and
there is no WebKit in CI — what they prove is that each page's own handlers and
rules are there and fire, not that iOS Safari then behaves. That needs a phone.

### What is not fixed about the controls

* **Four sticks, four implementations.** Archon, Choplifter, Galaga and Tapped
  are each on their own, and Archon's gate is a different size with no tick
  marks on it, so the collection does not look or feel quite the same game to
  game. `tools/stickcheck.js` holds all nine to the same bar; it does not make
  them one piece of code.
* **Bard's Tale cannot back up.** Pulling the stick back turns the party about,
  which is two turns they could always make, not the step backwards the
  original had.
* **None of it is proof about iOS.** Both tools run in Chromium, which is not
  the engine any of this is defending against.

## Publishing

GitHub Pages is deployed by `.github/workflows/pages.yml` on every push to
`main`. The workflow runs every game's tests, then uploads the repository root
as the Pages artifact, so the collection is served at
https://realjkg.github.io/retro-games/ and each game from its own directory.
`actions/configure-pages` runs with `enablement: true`, which switches Pages
on for this repository (source: GitHub Actions) the first time the workflow
runs, so no manual settings change is needed.
