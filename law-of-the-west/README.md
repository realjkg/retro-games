# Law of the West — Gold Gulch

Part of [retro-games](../README.md).

[Play the browser game](https://realjkg.github.io/retro-games/law-of-the-west/).

A browser take on the 1985 **Commodore 64** release by Accolade, in the spirit of the
original rather than as a copy of it: you are the sheriff of Gold Gulch, seven people come up
the street over one day, and each of them is a short conversation that you may or may not turn
into a gunfight. The point of the design — then and here — is that most of them do not need to
be shot, and the lawman who shoots them anyway does not keep the badge.

Self-contained: one `index.html`, no packages, assets, accounts or build step. GitHub Pages
publishes this directory at `/law-of-the-west/`.

## Playing

- **Talking.** Up/down picks a reply, FIRE says it. Replies are worth standing, and they
  branch: a question can open a way out that a threat closes.
- **The duel.** Up/down moves your aim between his **hat**, his **gun hand** and his
  **chest**. FIRE shoots.
- **Never shoot before his hand moves.** That is murder whatever he came for, costs 250
  standing, and two of them end your day with the council taking the star.
- Drawing on someone with no gun at all is the same thing, and the street sees you do it.

## The shooting, as the design intends it

| Shot | Outcome |
| --- | --- |
| Gun hand | His revolver goes into the dust. +150 — the best a lawman can do |
| Hat | A nervous man puts his hands up (+120); a hired gun does not flinch, and still has his shot |
| Chest | He is dead in the street. +60 |
| Before his hand moves | Murder. −250, and a second one costs the badge |
| Too slow | He fires first: −60 and one of your three lives |

Fire within about a tenth of a second of his hand moving and the shot is rushed: it pulls one
mark low, so the shot you aimed at his hand kills him. Waiting is the skill — his hand moves
between 0.9 and 1.65 seconds depending on his nerve, and his own shot follows 0.62 seconds
after that.

Talking a visitor down is usually worth more than beating him to the draw, which is the
point.

## Standing

Settled at sundown, or when the badge is taken:

| Standing | Rating |
| --- | --- |
| below 0 | Run out of town |
| 0 | Deputy on probation |
| 300 | Town constable |
| 600 | Sheriff of Gold Gulch |
| 900 | Marshal of the territory |
| 1200 | Legend of the West |

Two murders, or three bullets, is "Run out of town" whatever the standing.

## Controls

Same scheme as [Archon](../archon/): keyboard (arrows, Z/Enter/Space to act, Escape for the
menu), the on-screen pad, or a gamepad — d-pad or left stick to aim, A or a trigger to fire,
Y/Start for the menu, Back for full screen. Keys map by physical position, so they hold their
places on a non-QWERTY layout.

`FULL SCREEN`, the `G` key or a gamepad's Back button hands the whole screen to the game:
the canvas covers the viewport, the street is drawn as large as it fits, the pads move into
the space beside or below it, and the page stops scrolling, zooming and opening context menus
mid-duel. The screen is kept awake while you play.

The input and full-screen layer is deliberately a copy of Archon's rather than a shared
file: each game in this repository stays a single page that runs from `file://` with nothing
fetched alongside it.

## What is faithful, and what is not

This is **not an emulator, a port, or a reproduction of the original's content**. The
structure is the 1985 design's — a sequence of street encounters, branching dialogue, aimed
duels, a lawman's rating at sundown. Everything else is new: these seven visitors, their
lines, the scoring numbers, the draw and reaction timings, the synthesized sound, and a
street drawn from rectangles. The original's characters, artwork, script and audio are not
reused, and none of its data files are needed.

## Verification

Run `node --test law-of-the-west/tests/game.test.cjs` with Node.js. The tests execute the
page's own script with DOM and audio stubs, and check that every dialogue reply leads to a
real node, that every visitor can be settled without shooting, that every node is reachable,
and the duel rules above: murder, the disarm/hat/chest outcomes, the rushed shot, the
opponent's reply shot, aim stepping, and the ratings. Browser smoke testing separately
covers a full day played from the title screen, and full game mode on a landscape phone.
