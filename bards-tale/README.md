# The Bard's Tale — The Sewers of Skara Brae

A browser recreation of the town and the sewers from Interplay's 1985 dungeon
crawler. One HTML file, no build step, nothing fetched: open `index.html` from a
`file://` URL and it plays.

[Play it](https://realjkg.github.io/retro-games/bards-tale/)

    stick / ↑ / W   forward, one square — held, it keeps walking
    ← → / A D      turn
    ↓ / S          about face
    C B U P        cast · sing · use an item · the party's sheets
    ESC            menu, and saving

On a phone the three walk buttons are one round stick: push it forward to walk,
left or right to turn, back to turn about. Held, it keeps going — 380ms, then a
square every 200ms — because a corridor is walked rather than tapped out one
square at a time, and the sewers are long.

The view is 256×176 logical pixels drawn with `image-rendering: pixelated`.

## What is in it

**Six adventurers, made at the Guild.** Seven races and ten classes, each with
its own requirements — a Wizard needs an 18 intellect and will not take you
otherwise. Five statistics, rolled, and you may roll again as often as you like
before you commit. The first four in the marching order take the blows; the two
behind cast, sing and shoot.

**Skara Brae**, drawn by hand rather than generated, with the Guild and Garth's
on the north street, the Temple and the Scarlet Bard on the flanks, the Review
Board in the south, and the grate in the middle of the plaza.

**Three levels of sewer**, cut by a generator with a fixed seed, so level two is
the same level two on every machine and every time you come back to it. They are
proper mazes with about a fifth of the dead ends opened up, which is what gives
you loops to run a fight into. On them: strongboxes, squares that spin you
somewhere you did not choose, squares that put your light out, teleporters, and
on the bottom floor the thing that used to be a god.

**Fights** against up to three groups at once. Melee reaches the first two
groups that are still standing — as the front ones fall the back ones come
forward, so nothing is ever permanently out of reach. Six of them can get at you
in a round, whatever the total. Orders are given in the button pad rather than
over the picture, so you can see what you are deciding about.

**Fourteen spells** across the four casting classes, learned two levels at a
time, and the bard's six songs, which cost a swallow from the flask rather than
spell points and run for a set number of turns.

**The Temple** will close a wound for 8 gold a point, draw poison for 70, and
raise the dead for 220 a level. The **Review Board** promotes when you have the
experience for it. The **Scarlet Bard** fills the flask.

## How this is checked

    node --test tests/*.test.cjs                         # 25 tests, no browser
    PW=$PWD/../node_modules/playwright-core node tools/playtest.js
    PW=$PWD/../node_modules/playwright-core node tools/playthrough.js

`tests/` runs the page's own script under a stub DOM and reads the game's
numbers: that every landmark in Skara Brae is on a street you can walk to, that
each sewer level's way down is reachable from its way in and is a long way from
it, that the same seed builds the same maze twice, that a magician cannot get
into plate mail through his pack, that poison kills, that a saved party comes
back the same party.

`tools/playtest.js` opens the real thing in a real browser and reads the canvas,
a row per scene, asking what no state check can answer:

* does the corridor have **depth** in it — more than a handful of distinct
  colours, rather than one flat wall?
* does **turning** change the picture?
* does **forward** do something, even if what it does is say "a wall"?
* is the door at the Guild actually **drawn** on the wall in front of you?
* is the dark actually **darker** than the lit?
* is the monster **whole** on the canvas and not half off the edge?

`tools/playthrough.js` plays the whole game for twenty thousand turns: it kits
the party out at Garth's, fights whatever turns up, has the casters cast and the
bard sing, goes back to the Temple when somebody dies, grinds a level before
going deeper, and walks to the stairs. It reports fights, levels, how deep it
got, the longest fight it had, and whether the Mad God is dead. A run that does
not finish the Mad God, or that has a fight run past thirty rounds, fails.

Two tools exist only so a person can look at the pixels:

    PW=... node tools/monsters.js out.png    every monster at 4×
    PW=... node tools/shots.js out/          fourteen moments of the game
    PW=... node tools/render-icons.js        the icons, from the art
    PW=... node tools/render-icons.js --check

Three real defects came out of looking rather than testing, and one came out of
the playthrough:

* The Guild's door and its sign were drawn into the slab in front of the wall
  they belong to, and then the wall was painted over them. Every door in the
  game was invisible and no test noticed, because the door was in the map and
  the map was right.
* The combat menu was an opaque overlay across the whole view, so the monster
  you were choosing what to do about was behind it. The orders moved into the
  button pad.
* The skeleton's sword was three pixels wide with a point on it and read as the
  kobold's spear. It has a crossguard now.
* A fight ran to **round ninety-seven** in a playthrough. Melee reach was fixed
  to the group's index, so a third group could never be touched by a sword; once
  the casters ran out of spell points the fight could not end. Reach now counts
  the *living* groups in front.

## What is not fixed

* **The party cannot back up.** Pulling the stick back turns them about, which
  is two of the turns they could always make rather than a step backwards.
* **This is the sewers, not the game.** There is no Mangar, no Harkyn's Castle,
  no Catacombs, no Kylearan's Tower, no snow that lifts at the end. The Mad God
  on the third level is the end of what is here.
* **Character classes do not change.** In the original a Wizard is something you
  become; here it is something you roll for, and the Review Board will not
  reclass anybody.
* **The spell list is a subset and the four-letter codes are in the game's
  style rather than verified against it.** Where I was not certain of the
  original's code I made one. The same goes for two of the six songs.
* **No mapping.** The original sold you graph paper with the box, and this does
  not draw you a map either — but it also does not have a Scry Site that shows
  one, only one that tells you your coordinates.
* **No bows worth the name.** `reach` exists on the short bow and lets a back
  rank hit a back group, and that is all ranged combat does.
* **Nothing is identified, cursed, or magical.** Garth's sells plain equipment
  at a fixed price and buys it back at half.
* **The monsters do not resist anything.** Undead are marked in the data and the
  mark is not used; Holy Word hits them like it hits everything else.
* **No party of monsters ever surrenders, flees or calls for help**, and none of
  them has a second attack form.
