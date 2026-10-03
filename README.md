# retro-games
Retro games on Apple II, Commodore64, Atari and in the arcade

## Games

- [Archon — The Light and the Dark](archon/) (Commodore 64) — [play it](https://realjkg.github.io/retro-games/archon/)
- [Aztec — Tomb of Quetzalcoatl](aztec/) (Commodore 64) — [play it](https://realjkg.github.io/retro-games/aztec/)
- [The Bard's Tale — The Sewers of Skara Brae](bards-tale/) (Commodore 64) — [play it](https://realjkg.github.io/retro-games/bards-tale/)
- [Castle Wolfenstein — The War Plans](wolfenstein/) (Apple II) — [play it](https://realjkg.github.io/retro-games/wolfenstein/)
- [Choplifter — Bungeling Rescue](choplifter/) (Apple II) — [play it](https://realjkg.github.io/retro-games/choplifter/)
- [Drol — The Four-Storey Maze](drol/) (Apple II) — [play it](https://realjkg.github.io/retro-games/drol/)
- [Galaga — The Swarm](galaga/) (Arcade) — [play it](https://realjkg.github.io/retro-games/galaga/)
- [Law of the West — Gold Gulch](law-of-the-west/) (Commodore 64) — [play it](https://realjkg.github.io/retro-games/law-of-the-west/)
- [Lode Runner — Bungeling Empire](lode-runner/) (Apple II) — [play it](https://realjkg.github.io/retro-games/lode-runner/)
- [Tapped — The Root Beer Bar](tapped/) (Arcade) — [play it](https://realjkg.github.io/retro-games/tapped/)

## Full screen

Every game has a **FULL SCREEN** chip at the bottom, beside the way back to
the collection, or its own full-screen button where it had one already
(Archon, Aztec, Choplifter, Drol, Lode Runner, Law of the West).

| Where you play | What gives you the whole screen |
|---|---|
| A computer, Android, an iPad | The chip or the game's button. Esc, or pressing it again, gives the screen back. |
| An iPhone | Safari there cannot take its bars away for a web page, so no button can. The chip shows how: **Share → Add to Home Screen**, then open the game from that icon, and it runs with no browser round it. |
| Launched from a home screen | Already full screen; the chip is not shown. |

While the screen is the game's it is kept awake, where the browser allows.

The chip is one file, `shared/fullscreen.js`, which `tools/sync-fullscreen.js`
writes into every page (CI fails if a copy drifts). `tools/fullscreen.js`
checks it in Chromium, every game, on a computer and a phone each way up:
that it goes full screen and back, that SPACE still reaches the game after
it is pressed, that it covers no control or playfield, and, as an iPhone,
that it explains Add to Home Screen. It cannot be an iPhone: the Home Screen
launch itself needs a real one.

## Publishing

GitHub Pages is deployed by `.github/workflows/pages.yml` on every push to
`main`. The workflow runs every game's tests, then uploads the repository root
as the Pages artifact, so the collection is served at
https://realjkg.github.io/retro-games/ and each game from its own directory.
`actions/configure-pages` runs with `enablement: true`, which switches Pages
on for this repository (source: GitHub Actions) the first time the workflow
runs, so no manual settings change is needed.
