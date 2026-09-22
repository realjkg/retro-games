# retro-games
Retro games on Apple II, Commodore64 and Atari

## Games

- [Archon — The Light and the Dark](archon/) (Commodore 64) — [play it](https://realjkg.github.io/retro-games/archon/)
- [Aztec — Tomb of Quetzalcoatl](aztec/) (Commodore 64) — [play it](https://realjkg.github.io/retro-games/aztec/)
- [The Bard's Tale — Skara Brae](bards-tale/) (Commodore 64) — [play it](https://realjkg.github.io/retro-games/bards-tale/)
- [Choplifter — Bungeling Rescue](choplifter/) (Apple II) — [play it](https://realjkg.github.io/retro-games/choplifter/)
- [Drol — The Four-Storey Maze](drol/) (Apple II) — [play it](https://realjkg.github.io/retro-games/drol/)
- [Galaga — The Swarm](galaga/) (Arcade) — [play it](https://realjkg.github.io/retro-games/galaga/)
- [Law of the West — Gold Gulch](law-of-the-west/) (Commodore 64) — [play it](https://realjkg.github.io/retro-games/law-of-the-west/)
- [Lode Runner — Bungeling Empire](lode-runner/) (Apple II) — [play it](https://realjkg.github.io/retro-games/lode-runner/)

## Publishing

GitHub Pages is deployed by `.github/workflows/pages.yml` on every push to
`main`. The workflow runs every game's tests, then uploads the repository root
as the Pages artifact, so the collection is served at
https://realjkg.github.io/retro-games/ and each game from its own directory.
`actions/configure-pages` runs with `enablement: true`, which switches Pages
on for this repository (source: GitHub Actions) the first time the workflow
runs, so no manual settings change is needed.
