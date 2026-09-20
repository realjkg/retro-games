# Working on this repository

These are games. What matters about a game is what a player sees on the screen
while they are playing it, and nothing in a test suite can see that.

## The standing rule

**Test movement and gameplay throughout each scene, in a real browser, before
saying anything is fixed.**

Not one scene. Not the average. Every scene a player can reach — in Law of the
West that is eleven callers, three robberies, the interludes between them and
the reckoning at the end — and in each one the same questions:

* did the figure **walk in** on his own feet, or appear?
* did he **stride**, or slide? (a drawn walk cycle, not one pose translated)
* is he **alive** standing there — is a frame a second later a different picture?
* does the scene **answer** what a player presses at it?
* does he **walk off** the way he came?
* and is he **whole** — no keyline across his middle, no street shut inside him?

`law-of-the-west/tools/playtest.js` asks all of these, scene by scene, and
prints a row per scene. Run it. Read the rows, not the summary line.

## Why the rule exists

Every visual defect in this game's history passed its tests first.

* `walkNow()` returned exactly the right offsets and test 9v passed on them,
  while on the screen every caller appeared at his post, stood there, and
  jumped eighty-six pixels backwards to start the walk the test had approved.
* The sheriff's arm passed 9u while the picture came apart at the wrist.
* The fix for that passed too, with the joint drawn so wide it swallowed the
  forearm — nothing was lost, so the ink check said it was fine, while the
  sleeve ended in a rounded stump and the arm above the hand was missing.
* The callers were drawn in three bands and outlined into pieces, and every
  test was green.
* The walk was a standing figure sliced down the middle and slid apart. Nobody
  had ever looked at it.

The pattern is always the same: **the numbers were right and the picture was
wrong.** A check that reads state cannot catch that. A check that reads pixels
can, and only if somebody looks at the pixels first to know what to check.

## When you change something you can see

1. **Look at it.** Render it, at a magnification where you can judge it, and
   put your eyes on it. Frame by frame if it moves.
2. **Then find the measurement** that separates the broken version from the
   fixed one, and **prove it fails on the build you are replacing.** A check
   that passes both ways is not a check. Two of the ones in `playtest.js`
   started out measuring the wrong thing and had to be thrown away.
3. **Keep the tool runnable against older builds.** Read anything the page
   exposes for the tools defensively (`typeof x==='string'?x:''`), or you lose
   the ability to do step 2 at all.
4. **Say what you did not fix.** The callers' legs are still ~20 rows of
   dead-straight silhouette and that is written down in the game's README
   rather than quietly left for the player to find.

## The tools

    npm test                                # 82 tests; needs jsdom installed
    node tools/assemble.js                  # index.html from its sources
    PW=$PWD/node_modules/playwright-core node tools/playtest.js
    PW=$PWD/node_modules/playwright-core node tools/playthrough.js

`playtest.js` asks how it moved. `playthrough.js` asks what it said. Neither is
part of `npm test` — CI has no browser, and the game must stay playable from
`file://` with nothing installed.

`playthrough.js` has one long-standing failure, `the sheriff could not be
killed in four days`, which fails identically on `main`. Anything else is yours.
