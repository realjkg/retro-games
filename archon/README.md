# Archon — The Light and the Dark

Part of [retro-games](../README.md).

[Play the browser game](https://realjkg.github.io/retro-games/archon/).

A self-contained browser recreation, with the **Commodore 64 release** as the reference. GitHub Pages publishes this directory's `index.html` from `main` at `/archon/`. No packages, external assets, accounts, or build step are required.

## Controls

- Board: arrows and Z/Enter to select; X to cancel. Touch the board or use the on-screen pad.
- Combat: **hold fire and a direction to aim/shoot; release fire to move**. All eight directions work, including the corner buttons on touch devices.
- Second player: WASD and Shift/F, or the upper touch pad.
- Sound starts after a tap/key press. SOUND ON/OFF mutes or enables it. A high recharge bell belongs to Light; a low bell belongs to Dark.
- A finger may **slide across the d-pad** to change direction without lifting, and fire stays held even if the thumb drifts off its button. Each touch is tracked separately, so one thumb can hold fire while the other aims.
- **Gamepads**: the first connected pad drives Light and a second drives Dark. D-pad or left stick moves, A/right trigger fires and confirms, B/left trigger cancels, X opens spells, Y or Start returns to the menu.
- Keys map by physical position, so Z/X and WASD sit in the same place on a non-QWERTY layout.

## Full game mode

`FULL SCREEN`, the `G` key, or a gamepad's Back button hands the whole screen to the game:
browser fullscreen where the API allows it — a tap or keypress, since browsers grant
fullscreen only inside a user gesture and a gamepad button is not one — and either way the
page stops behaving like a page — no scrolling, pinch zoom, double-tap zoom or long-press menu to interrupt a held
direction, and the screen is kept awake while a game is running.

The canvas then *is* the screen, not a panel on a page: the board is drawn as large as the
screen allows and the space a 9x9 square cannot use carries each side's surviving count and
fallen icons — beside the board in landscape, above and below it in portrait. The pads sit
in that same space, thumbs already resting on them. Combat gives the stage the
arena's own 320×192 shape instead of the board's square, so a duel on a landscape phone is
drawn around 40% larger than the square layout allowed. The choice is remembered, so later games
start in full game mode.

On iPhone, Safari allows no element fullscreen; the immersive layout still applies, and
adding the page to the Home Screen removes the browser's own chrome.

## Full game mode, and playing it as an app

FULL SCREEN (or `G`) drops the page furniture: the board fills the screen, the pads move into
the letterboxed space beside it, the screen is kept awake, and the choice is remembered for
next time. Where the browser has the Fullscreen API — Android, and desktop — that call is made
too, so the browser's own chrome goes as well.

**iOS Safari has no Fullscreen API at all.** `requestFullscreen` simply does not exist on an
iPhone, so a tab keeps its address bar and toolbar no matter what the page asks for. The way to
a real full screen there is to install the game:

- **iPhone/iPad:** Share ▸ **Add to Home Screen**, then open Archon from the icon. It launches
  standalone, with no address bar and no toolbar.
- **Android/desktop Chrome:** the **INSTALL** button beside SOUND, which appears when the
  browser offers the install.

What makes that possible is `manifest.webmanifest` (`display: standalone`, with
`display_override: ["fullscreen","standalone"]` so an Android launcher goes one better),
`apple-mobile-web-app-capable`, an `apple-touch-icon`, and 192/512 px icons including a maskable
one. `sw.js` is a small network-first service worker: it keeps up with deploys but caches the
shell, so the installed game opens and plays without a signal. A launch that is already
standalone enters game mode by itself — from the home screen this is a game, not a page.

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

Run `node --test archon/tests/combat.test.cjs` from the repository root (or `node --test tests/combat.test.cjs` from `archon/`) with Node.js. The tests execute the game's own script with minimal DOM/audio stubs and check the mechanical regressions above. They also check the installable-app wiring: the manifest's display mode and icons, the Apple meta tags, the offline shell, and that a standalone launch enters game mode while a browser tab does not. They verify audio events and pitch distinction, not subjective sound authenticity. Browser smoke testing separately verifies menus, board/arena rendering, audio activation, and mute.
