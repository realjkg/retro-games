# Archon — The Light and the Dark

Part of [retro-games](../README.md).

[Play the browser game](https://realjkg.github.io/retro-games/archon/).

A self-contained browser recreation, with the **Commodore 64 release** as the reference. GitHub Pages publishes this directory's `index.html` from `main` at `/archon/`. No packages, external assets, accounts, or build step are required.

## Controls

- Board: arrows and Z/Enter to select; X to cancel. Touch the board or use the on-screen pad.
- Combat: **hold fire and a direction to aim/shoot; release fire to move**. All eight directions work, including the corner buttons on touch devices.
- Second player: WASD and Shift/F, or the upper touch pad.
- Sound starts after a tap/key press. SOUND ON/OFF mutes or enables it. A high recharge bell belongs to Light; a low bell belongs to Dark.

## C64 fidelity corrections

The September 2026 correction replaces the earlier modern arena approximations:

- The original board's fixed squares, oscillating cross/diagonals, and six luminosity stages; advancement after Dark's turn.
- Small scattered arena barriers with independent colour cycles: solid, slowing, and absent when matching the background. Fighters are displaced when a barrier solidifies around them; projectile collision uses substeps.
- Fire holds the fighter stationary while allowing eight-way aiming; distinct attack intervals and recharge bells.
- Sustained Phoenix/Banshee area damage; only Phoenix has its attack shield. Shapeshifter copies its opponent's attack.
- Vertical life bars and terrain-dependent lifespan. Weapon damage is deterministic and unaffected by terrain; surviving wounds are converted back to board health.
- No automatic health loss after fifty seconds. Already-fired projectiles can still produce a double kill.
- Corrected imprisoned-mage spell restriction, cycle-based release, enemy-targeted Teleport, and cross-side Exchange.
- Locally synthesized weapon, hit, transition, defeat, and recharge effects, with mute and browser audio activation.

## What remains approximate

This is **not a C64 emulator or an exact reproduction**. The effects are new Web Audio synthesis, not the original SID program, recordings, or soundtrack. Artwork remains a browser interpretation. Exact frame timings, obstacle generation/seeds, damage numbers, health scaling, movement speeds, and CPU tactics have not been measured against a running C64 release. Attack timings preserve the reference card's relative classes; they are reconstructed values. The summon implementation still uses one generic elemental rather than the original four variants. These distinctions must be preserved when describing the game.

## Sources

- [Original manual and quick reference scans](https://www.c64sets.com/archon.html)
- [Manual page 2: board layout, luminosity, movement](https://www.c64sets.com/archon/archon_manual_04.jpg)
- [Manual page 3: combat, barriers, attack interval and recharge bells](https://www.c64sets.com/archon/archon_manual_05.jpg)
- [Manual page 5: exchange, summon, imprisonment](https://www.c64sets.com/archon/archon_manual_07.jpg)
- [Manual page 6: solidifying barriers, recharge cues, double kills](https://www.c64sets.com/archon/archon_manual_08.jpg)
- [Light reference card](https://www.c64sets.com/archon/archon_ref_01.jpg) and [Dark reference card](https://www.c64sets.com/archon/archon_ref_02.jpg)
- [C64 board screenshot](https://www.c64sets.com/archon/archon_scr02.jpg) and [arena screenshot](https://www.c64sets.com/archon/archon_scr04.jpg)

## Verification

Run `node --test archon/tests/combat.test.cjs` from the repository root (or `node --test tests/combat.test.cjs` from `archon/`) with Node.js. The tests execute the game's own script with minimal DOM/audio stubs and check the mechanical regressions above. They verify audio events and pitch distinction, not subjective sound authenticity. Browser smoke testing separately verifies menus, board/arena rendering, audio activation, and mute.
