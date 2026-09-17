# retro-games
Retro games on Apple II, Commodore64 and Atari

## Games

- [Archon — The Light and the Dark](archon/) (Commodore 64) — [play it](https://realjkg.github.io/retro-games/archon/)

## Publishing

GitHub Pages is deployed by `.github/workflows/pages.yml` on every push to
`main`. The workflow runs the Archon tests, then uploads the repository root
as the Pages artifact, so the collection is served at
https://realjkg.github.io/retro-games/ and each game from its own directory.
`actions/configure-pages` runs with `enablement: true`, which switches Pages
on for this repository (source: GitHub Actions) the first time the workflow
runs, so no manual settings change is needed.
