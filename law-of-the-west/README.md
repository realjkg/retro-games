# Law of the West — Gold Gulch

An original recreation of the structure and feel of the 1985 Accolade release
for the Commodore 64. Part of [retro-games](../README.md), served at
[/retro-games/law-of-the-west/](https://realjkg.github.io/retro-games/law-of-the-west/).

One day as the sheriff of Gold Gulch: eleven callers in the documented order,
three exchanges each with four answers every time, robberies you either stood in
front of or read about afterwards, and a reckoning at sundown. Everything is
newly written, drawn and composed — see **What is faithful, and what is not**.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | The deliverable: one self-contained page, everything inline, 239 KB |
| `page.html` | The markup and CSS shell, with a `/* SCRIPTS */` marker |
| `sid-audio.js` | The SID-idiom synth, 54 cues; the synthesis is untouched |
| `content.js` | The eleven callers, the three robberies, the figure builder and the hitboxes |
| `engine.js` | Rules only: the day, the trees, the duel, the doctor, the reckoning |
| `ui.js` | The street, the figures, the five-line matrix, the input, one rAF loop |
| `tools/assemble.js` | Writes `index.html` from the shell and the four scripts |
| `tools/render-sounds.js` | Renders the cue table to wavs for auditioning |
| `tools/check-audio.js` | Drives every cue through the runtime with a stubbed AudioContext |
| `tools/playthrough.js` | Plays all eleven journeys in a real browser at phone size |
| `tools/playtest.js` | Plays the day in a real browser and reports on how the figures moved |
| `test/` | The sandbox harness and the tests |

```
node tools/assemble.js       # index.html, and its size against the 256 KB budget
node --test test/*.test.js   # 68 tests; numbers land in test/last-report.json
node tools/render-sounds.js  # 55 wavs plus 00-all-sounds.wav (gitignored)

# and a real browser, at iPhone size, playing every journey end to end.
# Not part of npm test: it needs a browser, and it skips cleanly without one.
npm i playwright-core
PW=$PWD/node_modules/playwright-core node tools/playthrough.js

# and the same browser again, watching the picture rather than the words:
# every frame the page paints, and how far each figure moved between two of
# them. A stride is three or four pixels; anything above ten is a teleport.
PW=$PWD/node_modules/playwright-core node tools/playtest.js
```

The suite can only check what the page computes. `walkNow()` returned exactly
the right offsets and test 9v passed on them while the screen showed every
caller appear at his post, stand there, and jump the whole width of the walk
backwards to begin it — because `walkNow()` returned `null` both before the
walk and after it, and the drawing read `null` as *stand him on his mark*. The
sheriff's own arm passed 9u the same way while the picture came apart at the
wrist: the sleeve stopped in a flat cut and the glove hung below it with no
forearm in between, because the seam it was hinged on ran forty pixels from the
point it turned about, and rotating a straight seam opens it. That is what
`tools/playtest.js` is for, and it is how both were found — it counts how far
each figure moved between two painted frames, how much of the sheriff is still
on the screen through the whole swing of his arm, and whether a caller's
keyline runs anywhere but around his edge. Run against the build before the
fixes it reports fourteen teleports, four per cent of the sheriff shed, ten of
the eleven callers outlined into pieces, and the near rings of his arm turning
three degrees where the far ones turn eighty.

That last one is there because weighing him was not enough. A joint cut wide
enough to cover the whole of where the arm meets him swallows the forearm
instead: the forearm is still drawn, and still weighs the same, but it is
never turned. The sleeve ends in a rounded stump on the joint's own edge, the
hand sits somewhere past it, and the arm above the hand is missing — and the
scales say nothing is wrong. So the tool turns him and takes his ink in rings
about the elbow: a rigid arm moves every ring by the same angle, and a frozen
forearm shows up as the near rings disagreeing with the far ones.

## The draw

He has one drawing of himself and the revolver is already in his hand in it, so
the gun cannot literally leave the leather and come back — there is no
holstered gun anywhere in the artwork, and an empty holster with no gun to
explain it reads as a bin. What can be drawn is the spin.

A road agent's spin turns the gun on the trigger finger: the finger is the pin,
the revolver goes round it, and the hand stays where it is. So it is hinged the
way the forearm is hinged on the elbow, one joint further out and much smaller —
a disc on the trigger guard, with the revolver beyond it — and nested inside the
arm's own turn, so the spin happens wherever the arm is pointing. Turning the
whole fist about the wrist instead swings forty-five pixels of glove and barrel
round an arc, and reads as a gun coming off its owner.

The draw itself is 280ms and does not ease: it arrives early and settles late,
most of the way up in the first third, past level, and back onto it. The spin
finishes one whole revolution before the arm has stopped moving, so the
flourish is part of the draw rather than a pose struck after it. Putting it
away is the other shape — it gives at the top, then goes — and turns the other
way, landing as the gun reaches leather. Settled at either end the spin is
nothing and the arm is the arm, which is what keeps the levelled pose exact to
the pixel.

## One clock, and the shot that was never really timed

The frame loop is handed a timestamp, and the engine stamps the moment a man
shows his hand with it — `G.tell.at=nowMs`. Everything in `ui.js` was reading
`performance.now()` instead. In a browser those two share a time origin, so
they agreed, and the game played correctly. They do not agree anywhere else.

Under the test harness, which steps frames on a clock of its own, the
subtraction came out negative and hit the floor: **every shot fired in a test
was handed a latency of 60ms**, which is the fastest the rules admit and
therefore the widest scatter they allow. So the test that fires one ball at a
drawn gun and looks at where it went was, without anybody meaning it, sampling
the worst case in the game — and it missed about a quarter of the time. It
failed roughly one run in four, at random, in a test whose subject was
something else entirely, and it was written off as weather.

It is a real bug outside the harness too, and the catch-up code says so in its
own comment: after a locked phone or a backgrounded tab, rAF stops and the wall
does not, so every one of these clocks has to be shoved forward by hand. Read
the frame's own time and there is nothing to shove.

So the page has one clock now — `clock()`, the current frame's timestamp, or the
wall's before the first frame has arrived — and the twenty-one reads that used
to take the wall's take that instead.

Two things follow. `?seed=42` in the address deals the same day every time: the
same callers, the same tells, the same scatter on the ball. That is how a report
of "he missed and he should not have" becomes something that can be looked at,
and it is what lets the test above name the day it is talking about instead of
rolling dice. And `tools/timing.js` is worth running after any change to the
numbers below; it plays four thousand fights at each of five reaction speeds and
says whether a person can answer them.

## Being outdrawn, and being charged for being quick

Two numbers moved, both measured rather than guessed.

**The window.** A man's tell and the shot that follows it were 260–420ms apart,
which put the tightest tell in the game — the ambush — at 580–920ms end to end.
A person is about 250ms at the very best and 400–600ms in ordinary play, and
`tools/timing.js` charges a further 120ms for the press itself: an unhurried
answer to an ambush was outdrawn about one time in seven. It is 320–460 now,
which puts the ambush at 640–960 and buys that back.

It cannot go much further either way, and both ends are somebody else's test.
`timing.js` insists that being slow still costs something, which needs the
slowest draw window under about 970ms and so holds the low end under 350. Test 5
insists a duel is still a gunfight, which caps the longest draw at 1500ms and so
holds the high end at 500.

**The haste tax.** A shot's accuracy ran from wide at 120ms to exact at 500ms.
But nobody answers a drawn gun at 500ms — they answer at 250 to 400 — so the
whole of ordinary play sat in the expensive part of that ramp. Measured over
three thousand dealt days per caller with the sights laid dead on the man, a
shot went home 83% of the time at 250ms and 88% at 300ms. The ceiling is 300 now
and those are 95% and 99%.

The spread itself is untouched, and so are the two things that had to stay true:
a shot laid off the man still misses, every time, out of eight thousand tried;
and a snatched shot at a man's hat still sometimes finds the man under it, which
is what makes shooting a hat off a decision rather than a free move.

`9C` in `test/engine.test.js` is the test that would have caught the old
numbers. It fires four hundred balls per caller at each of the two latencies a
person actually presses at, and reads the rate — which is what the one-ball test
in `page.test.js` could never do.

## The callers, and what is still square about them

Two things made them read as sticks leaned against a coat, and one thing still
does.

Each arm stood one pixel clear of the chest. A pixel of air is a pixel of rim,
so the sleeve and the body were both outlined along it and the slot ran the
length of the arm, shut at the shoulder and shut at the hand. They touch now,
and the coat-seam that was already written for an attached sleeve does the
separating it was meant to do. Measured as air the outside cannot reach, that
is a mean of 18.9px of street shut inside a caller before, and 9.2px after;
seven of the eleven were over the bar, and none are now. `tools/playtest.js`
holds it.

The rim was a staircase. One pixel of air in black is what keeps a figure
legible against a lit window, but on a stepped edge that black *is* the steps.
How much of him a pixel of air touches is countable — a flat edge touches three
of him, an outer corner one or two — so corners take a third or two thirds of
the black and flats keep all of it.

What is still square is the **wall**: the longest run of rows down which the
outer edge of a caller does not move a single pixel. It is about twenty rows on
an eighty-four-row figure, and it was about twenty rows before. That is the
outside of the legs, and it did not move because it cannot at this size with
integer edges: three pixels of width travel through a knee and a calf is one
and a half pixels of edge travel, which rounds to one or two values and still
sits there for a dozen rows. Shaping the legs and arms harder was tried and
measured — it made the arms detach again (mean trapped air 10.2px to 15.1px)
and left the wall where it was, so it was reverted. Fixing it properly means
authoring the figures at twice the resolution and sampling down with coverage,
which is a real change to the sprite pipeline and not a tweak.

Related, and worth knowing: the silhouette smoothing in `figureRuns` does
nothing and never has. It interpolates coverage between cells, and these
figures are drawn at a cell size of one pixel, so every weight it computes is
one or zero. The comment above it describes rounding a stepped corner off. It
has never rounded anything. It would work at a larger cell, which is the same
conclusion from the other direction.

## The walk

He is drawn walking. He used not to be: the stride was cut out of the standing
pose at run time. The trousers are one column with the boots touching at the
bottom, so a walk sliced that column down the middle and slid the halves apart
— two slabs with a flat inner edge and no outline on it, because the rim had
been worked out for the shape before it was cut. It did not read as legs, and
it could not: there were never two of them to move.

`buildFigure` takes four gait poses now, built beside the standing one and kept
as sparse diffs like `raise` and `surrender` already were, so they cost code
and not file size:

    strideA   right forward, left back, both feet down
    passB     left swinging through, boot up and knee bent, right planted
    strideB   left forward, right back, both feet down
    passA     right swinging through, left planted

Two contacts on their own were not enough — that is a scissor, both feet on the
dirt and the legs only opening and shutting, and it read as a shuffle. What
makes it a walk is the half of the cycle in between. The knee of the swinging
leg comes up and the shin hangs under it; raising the boot on a straight leg
left it hovering and still read as standing still.

Three other things the loop turned up, none of them obvious until it was drawn:

* Seen from the front the leg coming towards you is **wider**, the one going
  away **thinner**. Shortening the forward leg as well was a step too far — it
  takes length out of him and he stands there in a crouch. Width alone carries
  it.
* The **bob was backwards**. He was tallest at the contacts; a man is lowest
  when his heel lands and takes his weight, and tallest going over the planted
  leg in the middle of the step.
* The **hips swing on the feet's clock**, not on the idle sway's. Without that
  opposition — hips over the planted leg, shoulders back the other way — he is
  a man being carried along upright. With too much of it he is a man who has
  been drinking; it wants about two pixels.

`visitor` picks the beat from the gait and never overrides a pose asked for by
name, because a man with his hands up is not walking. The lean was halved:
four pixels on a figure this wide puts his shoulders off his hips.

Test 9C holds the shape: four poses, two different leading feet, two different
swinging feet, each contact standing wider and opening daylight between the
boots, each passing pose carrying less of him on the bottom rows than standing
does without lifting him off the ground, the arms moving — and, the one a
cut-and-slide could never fail, painted mid-stride he is not the standing
drawing shifted sideways by any amount.

## The callers came apart, too

The callers had the same fault as the arm and it took the same cure. They were
drawn in three bands — legs, torso, head — each offset a few pixels to sway and
each smoothed and lit as though it were a whole figure. A cut is a straight
line across a man; offsetting what is above it from what is below opens the
line by the whole difference, and five pixels of that on a forty-eight-pixel
figure is a head floating clear of its collar. Now each of them is rastered
once and laid down a row at a time, with an offset that runs smoothly from the
feet to the head: rigid through the legs, bending up the spine, rigid again
through the skull. A body does not step. It bends.

`index.html` is committed and is what runs; the four scripts exist so the source
can be edited in pieces. Opening it from the file system and serving it from
Pages behave identically — no external requests of any kind, asserted by a test.

## The day

The **Sheriff** is not a character in the cast. He is you. There is no twelfth
caller and nothing in the game decides anything on his behalf: he is the near
figure at the left of every street, seen from behind over his own shoulder, and
every word he says and every shot he fires is one you chose. The eleven below
are the people who come to him.

They come one at a time, in this order, each with their own tree, their own
figure and their own entrance theme. Seven of them carry the day's plot — Rose,
the Kid, the Doctor, Willy, April, the Deputy and Belle — and the other four are
the ones the street sends: a dude off the train, a man who
has just bought a gun, a gambler, and whoever it is that waits until evening.

| # | Caller | Who they are | What the encounter is for | Where it can end |
| ---: | --- | --- | --- | --- |
| 1 | A Dude | An Easterner off the westbound, in a derby | Takes the measure of the new sheriff | train tip · peaceful exit · offence · a draw |
| 2 | Miss Rose | The saloon hostess; tries to seduce the sheriff | Who has been asking about the coach | stage tip · a Saturday · ordinary exit · cold |
| 3 | The Mexicali Kid | A fugitive from across the border | A wanted man testing the badge | surrender · ride on · delayed draw · a duel |
| 4 | The Doctor | Grumpy and cynical; will not patch up a sheriff who is too trigger happy | Objects to what the law leaves him to sew up | bank tip · his goodwill · his contempt · coffee |
| 5 | Dude with a New Gun | A man who has just bought one and wants it seen | Shows off the gun, then says why he bought it | put away · bank tip · arrest · ambush |
| 6 | Little Willy | A kid with a secret to tell | A boy who saw something and was paid not to say | bank tip · keeps his promise · sent home · frightened |
| 7 | Miss April | The schoolteacher; enjoys spreading gossip | The schoolhouse window looks down on the cut | train tip · a Saturday · ordinary exit · alienated |
| 8 | The Gambler | Eleven honest nights and a holdout clip | Owes the house, and says what he will do about it | arrest · repayment · departure · turn-and-shoot |
| 9 | The Deputy | Never there to help; challenges the sheriff's authority | Runs in with something he is not sure he saw | bank warning · dismissed · his standing either way |
| 10 | Belle | A female cattle rustler | Two steers with the wrong burn, and three years of grievance | surrender · drives them back · a dance · a duel |
| 11 | The Last Gunfighter | Says nothing at all | A forced duel at the end of the day | a forced duel |

No caller comes twice; eleven encounters are eleven different people. The men in
the three hold-ups are not among them: they never speak, and they share one
masked figure.

Every ordinary screen is one line from the caller and four replies, and no
conversation runs past three exchanges. Drawing is never one of the four: the
gun is always available and always interrupts. A caller can draw at once, wait
and turn back, put his hands up, or simply leave.

**The robberies.** Three jobs fall between callers — the stage after the fourth,
the westbound after the eighth, the bank after the tenth — and each sits after
everybody who could have warned about it. Warned, the sheriff is standing in
front of it with his gun still in the leather, and it opens as an ambush;
unwarned, he reads about it afterwards and it counts against him.

**And the man in the alley is somebody.** An armed caller who walks out of his
encounter unstopped — sent off, told to leave the territory, or gone having
taken offence — is loose, and the next job that comes due is his. The scene then
carries his name, his figure, his colours and his own hitboxes, and the brief
tells you what you already suspect: you have seen that coat before today. Only
armed men go on the list, because a schoolteacher does not go through the back
wall of a bank, and a man arrested, shot or dead is off it. Let nobody go and
the job is what it always was: an outlaw nobody in Gold Gulch can name.

**Outsmarted.** Two callers can take the sheriff for a fool rather than for a
target: the Gambler, if you let him finish the hand while you wait outside, and
the dude in the derby, if you decide a soft hand means a soft man. Neither is a
bullet and neither ends the day. You come round on the boardwalk with your hat
beside you and your gun still in the leather, two points of authority poorer,
with one caller already come and gone while you were down and the man who did it
loose to do one of the robberies. A robbery the sheriff is carried past still
happens — the day waits for nobody, but it does not lose a job either.

**Drawing.** The gun comes out on **up** — the arrow, `W`, keypad `8`, the pad's
up, a swipe — which is how the joystick did it, and the crosshair then goes
where up, down, left and right take it. `HOL`, `Escape` or walking the sights
off the bottom of the street puts it away.

**A gun in his face.** A caller who has a gun pointed at him **before he has
been answered** stops talking, says so in his own words, and takes his four
replies off the table until it is put up. Holstering hands the conversation back
where he left it; drawing after he has been answered does not balk him, because
by then he has said his piece.

Keeping it on him is a separate matter, and every caller settles it differently,
because every caller has a temper. It used to be one window and one answer for
all of them, which made each of them the same man in a different hat. A
**hostile** one — the Kid, the man with the new gun, Belle, the last gunfighter,
the outlaws — waits about a second and answers it. A **patient** one — the dude,
the Doctor, the Gambler, the Deputy — gives you two or three seconds to think
better of it. A **frightened** one — Rose, Willy, Miss April — is quicker than
either and runs, and the whole street watches what they were running from: that
costs two points of authority, where facing down a patient unarmed caller costs
one. An armed man of any temper answers the gun, which is a wound.

**His hat.** Every caller who wears one has it as a target of its own, read off
his own drawing and kept clear of his face, because a ball through a Stetson and
a ball an inch lower are different sentences. Who he is decides which sentence
it is. An **armed, patient** man — the dude, the Gambler — gives it up: hands go
up before the hat lands, an arrest, nobody hurt, and two points of authority
with the whole street watching. An **armed, hostile** man comes for you
bareheaded and at once, on the shortest tell there is. Anybody **with no gun on
them** has simply been shot at, and the street watched that too: two points the
other way, and the Doctor, who decides whether your next wound is survivable,
does not forget it. Your own **Deputy** costs you two and buys you nothing, in
front of everybody who can see the jail door. And a **hold-up man's** Stetson
takes his bandana down with it — a man whose face the whole street has just seen
does not stay to finish the job, so that is a robbery stopped with nobody shot
and nobody arrested, which is the best shot in the game. Mid-duel it is showing
off, and showing off is a miss. One hat: once it is off the target is gone and
he is drawn without it.

Everybody who wears one has their own words for losing it, because it is the one
shot that says something about the man rather than about where it landed. The
Dude mourns London felt with his hands up. The Gambler watches his topper land
crown-down and takes his time. The Kid does not turn to watch his go. Willy is
nine years old and goes into the road after his cap with both arms over his
head. Miss April loses her bonnet in front of a window full of children. And a
caller you let walk this morning, turning up at the robbery, is not wearing a
bandana and has his own words too.

**Where the sights may not go.** A gunsight that can be walked back over the
sheriff's own sleeve, glove and revolver is a gunsight aimed at the man holding
it, and at 320×200 he is a third of the picture. The reticle is held clear of
his own outline, banded ten rows at a time off his drawing, so over his head it
comes much further left than it does over his levelled gun — and the man at the
upstairs window is still reachable, which a plain rectangle would have prevented.
Nothing is clamped vertically: walking them off the bottom of the street is how
a stand-off ends.

**Firing.** The shot is the one thing the arm does that is not a position it
settles into. Recoil throws the barrel above level and it comes back down inside
a fifth of a second, and the flare sits on the end of the barrel — drawn inside
the arm's own rotation, so it stays on the muzzle wherever the kick has put it —
rather than washing the whole picture white. Three colours and no gradient, like
everything else here.

**The hour.** The day runs from a cold early morning to a low red sun, and every
colour that carries the light is mixed toward the hour before it is used: the
sky bands, the hills and their haze, the dirt, the clouds. The lamps come on
along the row towards evening. Five of the eleven callers stand in the same
place — most of the cast say where they are in their own lines, so they cannot
be moved — but the same corner of Gold Gulch at nine and at six is not the same
picture, and the reckoning at sundown arrives in a sky that has been getting
there all day.

**The second gun.** Not every caller comes alone. On some encounters — about
one in six, never more than twice in a day, and never at the doctor's, whose
scene is indoors — the sash goes up at the lit upstairs window on the green
front across the street and a rifle comes out of it. The sash makes a noise and
the pane goes dark behind a hat: that is the whole warning, and it comes eight
to fourteen seconds in, with four to six seconds after it to look up, find him
and fire. It used to be 1.6 seconds to the sash and 5.2 to the shot, both from
the moment the scene began — while the caller was still walking in and the panel
was still building itself. Reading one beat takes fifteen to twenty-five
seconds, so he fired two or three times over before anybody could finish the
first line, on a third of all encounters. That was not a hidden threat, it was a
coin flip with a wound on one face. He is a target like any other, and the crosshair
finds him where the drawing put him; a ball through that window ends the
encounter, whatever was being said. Left alone, he shoots the sheriff, and it
makes no difference at all what the man in the street was saying at the time.

**Blacking out.** A ball that lands on the sheriff puts the street out — all the
way to black, then slowly back to a dim version of where he is lying — and it
stays dim until he is on his feet and walking on. What he wakes up to is the
doctor, or nobody.

**The doctor.** He is the difference between a wound and a grave, and he is in
one of five states by the time he is needed: dead (the sheriff can shoot him,
and there is no other one), hostile, drunk, neutral, or civil. Only a civil,
sober doctor patches the sheriff up and lets the day go on; drunk and neutral
each carry one wound and no more; hostile and dead make the first ball the last
thing that happens. Whether he has been drinking is settled before the day
starts — his scene opens differently when he has — and coffee, poured and stood
over, is what does something about it. He does not read the sheriff alone,
either: men shot who never drew count against him, a street put up with twice
counts against him, and a sheriff the town stands behind is one it is quicker to
send for.

**The goal is to be alive at sundown**, and nothing else is required of you. You
can gun down every caller without hearing a word from any of them; the day will
end, and the reckoning will say so.

**Sundown** reports the original seven dimensions: authority maintained, crooks
captured, romance, bad guys shot, wounds survived, innocents killed, and crimes
missed, plus a total. No rating titles, no percentages.

## How it looks

A 320×200 logical picture presented in 4:3, the way the machine was, scaled with
nearest neighbour, and framed the way the 1985 game framed it.

**A flat row of storefronts across the back**, under a dark sky with stepped
cloud banks and a ridge of hills: five false fronts of differing heights and
colours, upstairs windows lit or dark, awnings, doors, a boardwalk along the
whole run and a tree standing out in front of it. Gold Gulch keeps the same
concerns either side every day — HANLEY'S, the ASSAY OFFICE, the LIVERY, the
TELEGRAPH — and the big board over the middle front names whichever one this
caller has come out of: Maguire's Saloon, Dr Finch Surgeon, the Gold Gulch
Hotel, School and Jail, Belle Hollister's, the J P Morgan Bank, Morgan Express
Co, and the Gold Gulch & Western where the westbound slows. Long names take two
lines and every board drops a point at a time until it fits the front it is
nailed to. In front of it the street is grey dirt with stones and ruts, and
three people on the boardwalk who leave the moment a gun comes out.

**One large thing parked in the near right**, chosen by the place: a stagecoach
with spoked wheels, a locomotive with its smokebox door and cowcatcher and the
rails running out of frame, barrels, crates, or a corral fence in perspective.

**It is his eyes you are looking through.** The sheriff's arm runs out of the
**top-left corner** of the frame rather than in from the side, which is what
says whose arm it is: his shoulder is at the camera, not across the street. The
sleeve billows down across the picture — shaded as cloth, light along the top of
the arm, shadow beneath it, folds running its length — into a dark cuff, a black
fist, and the revolver held in it: cylinder, hammer, trigger guard and a level
barrel reaching most of the way to the man he is talking to. 44×40 cells at
three pixels each, the largest thing on the screen, rimmed a pixel in light grey
so a dark gun over a dark doorway is never just a hole. Holstered, the same hand
holds it muzzle-down.

**How he holsters it.** The supplied drawing has one pose and it is the levelled
one, so a whole man drawn whole is a man aiming a revolver at everyone he speaks
to. The picture is therefore hinged. It was hinged on a **rectangle at the
elbow**, and that was wrong: a rectangle cannot contain an arm that has a body
to the left of it, so the cut took the hand and the revolver and left the sleeve
behind — lowered, he had a sleeve pointing at nothing and a glove hanging under
it. The arm is now an **outline**, traced down the seam where the sleeve leaves
his back, round the armpit and out past the muzzle, and it turns about the
**shoulder**, which is where an arm turns. Two draws a frame: him with an
arm-shaped hole cut out of him, and the arm, clipped to that same outline built
after the turn so it turns with it. At level it reassembles to the pixel; at
1.42 radians the whole arm is down with the revolver at the leather. Not one
pixel of the supplied drawing is repainted; only the line it comes apart on
changed.

**And a hitching rail at his own boots**, nearer than anything else on the
ground, dark across the bottom-left. Between the two, the player is standing in
the street rather than watching it. His face is the one part of him there is
never any of.

**How it is drawn.** Ordered 4×4 dithering — the same matrix a C64 artist would
have used — wherever a flat field would otherwise show: the sky graduates
through four colours in dithered bands, the walls carry grain under their
clapboard, the street and the dirt near the boots are two greys mixed, and every
cloud has a dithered underside. Light comes from the left, so every edge knows
which side it is on: lit stave and shadowed stave on a barrel, a lit rim and a
shadow line on each plank, a lit face and a dark face on the hills. Windows have
frames, mullions, sills and a line of light off the glass; doors have sunken
panels and a knob; awnings throw a dithered shadow down the wall behind them;
wheels have rims, ten spokes and a hub. Everything is stepped a column at a time
with integer edges, so the diagonals stair the way a bitmap's do, and the
palette is the C64's sixteen colours with a handful of mixes between them.

**Grain follows distance.** The town is drawn a pixel at a time, the caller two
pixels to a cell, the sheriff's sleeve three — and the fist and revolver, which
are nearest of all, go back to one, so the cylinder is round and fluted, the
barrel has a rib and a front sight, the hammer is drawn back over the frame, and
the fingers have knuckles.

**Twelve figures, one draughtsman.** They used to be twelve hand-cut grids
twenty-four cells across, and at that size a man is a torso-shaped blob with two
dots on it: no neck, no sleeve, no hand, no lapel, and whatever anatomy each
grid happened to get on the day it was cut. Beside the sheriff — who is a
painting — they read as a different game.

They are now laid out on one skeleton, 48×84 cells at one pixel to the cell:
the same head on the same neck on the same sloping shoulders, the same sleeve
hung from the same joint, the same belt, the same boots, the same brow, nose and
mouth. `buildFigure` draws all of them, and a caller's whole difference is his
spec — hat, hair, what the coat is cut like, what he carries, how tall and how
wide he is built. One draughtsman means one standard: nobody is drawn worse than
anybody else. So the Kid's sombrero, Rose's skirt, the Doctor's derby, the
Gambler's topper, the dude's own derby, the new gun carried across a chest,
Willy's height and a boy's head on it, April's bonnet and slate, the Doctor's
bag, the Deputy's star, Belle's hat and rope, the last man all in black, and the
outlaw's bandana are all the same hand.

48×84 is not a taste either. The horizon is at 118 and a caller's boots are at
150; the sheriff's are at 200 and his own drawing is 129×200. A man that size
standing that much nearer the horizon comes out 50×78, and 48×84 is the nearest
round figure. Drawn at 24×56 he was a doll on the same street as a painting.

The same builder makes the drawn-gun and hands-up poses, so an arm that comes up
is that figure's own arm rather than a shared overlay, and the three hitboxes
are then **read off the drawing that was just made**: the weapon box is where
the gunmetal actually is, the raised box is where the gunmetal goes when he
draws, and the lethal box is the torso between them. The holster hangs clear of
the hip and the drawn gun comes out clear of the chest, so no two of the three
ever overlap and a shot is one answer, never two.

**Painted, not stamped.** The letters say only what a part is made of. When a
figure is put on the screen the silhouette is smoothed, so a jaw stops being a
staircase; the light comes from the left the way it does in the sheriff's own
drawing, and every run of one material on a scanline is turned on its own — the
coat rounds, the sleeve rounds inside it, each leg rounds separately, the shirt
between the lapels keeps its own light — with a gentle tilt over the whole body
so the parts still belong to one lit man; the steps between tones are dithered
on the same ordered matrix the town is drawn with, so a chest turns instead of
banding; a face takes half of all that, because a hard shadow across a cheek at
this size reads as dirt rather than form; and every pixel of air touching him is
put down in black first, which is the rim that keeps him legible against a lit
window or a dark doorway. It is worked out once per pose, mood and blink and
kept, so a frame costs a few hundred horizontal runs rather than four thousand
single pixels.

The five-line matrix fills the rest, set the way the machine set it: upper case,
one width per character, tightly stacked, the caller's line in its own colour
above four replies. Nothing a character says may be cut off or hidden behind a
scroll, so the type steps down until all five fit, and a content check caps line
lengths at the source. The picture itself carries no chrome — who is in front of
you, where you are in the day and how it is going live in a strip above it.

## How it plays

**They stand as one body.** A caller waiting for you shifts his weight, and
the hips and the shoulders do go opposite ways — a little. They used to go
opposite ways a lot: standing still, a caller was given the numbers a walk
uses, three pixels of hip against two of shoulder and two of head, and the top
half and the bottom half slid past each other by five and a half pixels on a
figure forty-eight wide. The head made it worse by nodding on a clock of its
own — 0.71 rad/s against a body swaying at 1.15, so the two drifted in and out
of phase and never agreed twice. On the screen that is two bodies moving at two
separate speeds, and a player said so. Standing now eases rather than throws,
the head stays over the feet, and every clock on a caller is the same clock.
`playtest.js` measures it per scene and fails over three pixels.

**Two modes, one pad.** Up draws: the gun hand comes up, a crosshair appears and
the replies go dim. The pad moves the crosshair; down walks it back and, pulled
past the bottom, holsters — as do HOL and Escape. Drawn guns are not tolerated:
a hidden reflex timer runs while yours is out and an armed man answers it — a
frightened man in about 1.1 to 1.9 seconds, a hostile one in 1.4 to 2.2, a
patient one not for 3 to 4.4. The draw itself is quick: 170ms to clear leather
and come up level, 240ms to put it away, both with the gun turning over inside
the move. FIRE fires — the sequence is the picture catching up with the thumb,
never something the shot waits on.

**Whose fight it is.** The windows were opened twice, both times because a
player said the same thing: the CPU kept getting there first. An ambush now
runs 850–1250ms end to end, a man who turns back on you 1010–1410, and one who
squares up and gives warning 1060–1460 — the ceiling is still under a second
and a half, so it is still a gunfight. `tools/timing.js` holds the standard at
a **phone's** press cost rather than a desk's, because this is a phone game and
a thumb on glass is slower than a key: the page's own share of a press is a
measured 41ms, and the touch on top of it is an allowance, named in the tool
rather than buried in a default. At that cost an ambush still costs a slow
player something. On a desktop keyboard the same day is generous, and the tool
prints that line too rather than letting a green run imply otherwise.

**The shooting.** Weapon box and centre mass are separate and follow the drawn
frames. Shooting the gun out of an armed man's hand disarms and arrests; centre
mass kills. An unarmed caller has nothing to shoot out of his hand, and the
street can see that as well as the sheriff can. Draw latency and aim spread are
read apart: a fast shot is a wide one, so rushing turns a killing shot into a
wounding one, and a slow one lets him fire first. Shooting a man whose hand
never moved is murder. Violence is always available and always expensive.

**Full screen.** The game launches in it: pinning on the badge is a user
gesture, which is the only moment a browser grants fullscreen. `EXIT`, `g` or
`F11` stays in the page, and that choice is remembered. Upright, the scene zone
is exactly 4:3 and the words take the rest; turn to landscape in game mode and
the scene moves to one side with the words and the pad on the other. iPhone
Safari allows no element fullscreen; the layout still applies, and adding the
page to the Home Screen removes the browser's chrome.

## The music

Original material in the SID idiom, not a transcription and not a reworking of
anything. The identity is dusty frontier and saloon tension, and one rule
carries it: the lead sits an octave below a bright arcade SID lead, with the
high register kept for short glints and draw stings.

Eight themes in two or three voices, 1.2 to 3.2 seconds, one for each caller and
one for a robbery in progress. Each is written to the character's job in the day
rather than to a tune: oom-pah bass and a flat third leaning on the major for
the saloon; a dotted figure with a flattened second and boot leather in the
noise for the Kid; a slow falling minor for the doctor; something small and
quick for Willy; a suspended fourth taking its time about falling to the third
for Miss April; a military dotted figure that puts a foot wrong for the Deputy;
wide open intervals and no ornament for Belle; and for a robbery in progress,
not a tune at all — a drone, a tritone over it, and one glint.

A theme runs on its own gain node, so a gun leaving the leather cuts it off
mid-bar, and so does the resolution of the encounter it opened. That is the only
change to the audio module: the synthesis itself has not been touched.

**How it sequences.** Nothing loops under the dialogue; the day is scored in
short cues placed on the things that happen.

| When | What plays |
| --- | --- |
| The title screen | `title`, on the first tap or key — the only moment audio can start |
| Pinning on the badge | `dawn`, then `badge` |
| A caller arriving | `door`, boots at 260 ms, then whatever his own arrival is — hooves, a wagon, spurs, a crowd, the piano — and at 700 ms his entrance theme |
| Moving the cursor, choosing a line | `click`, then `select` |
| Drawing | the theme is **cut**, then `holster`, `cock`, and `aim` 140 ms later |
| Aiming | `click` per step |
| His hand moving | `tell` and `tension`, with the theme cut |
| Firing | `gunshot` with the muzzle flash; `dryfire` if that chamber is spent |
| The shot landing | `ricochet` and `wound` for a disarm, `hit` and `death` for a kill, `ricochet` then `graze` for a miss, `hit` for a wound taken, `patch` 400 ms after the doctor reaches you |
| A kill | `churchbell` at 900 ms; `reload` at 1200 ms after any shot |
| A tip, an arrest, an offence | `tipoff` and `point`, `respect` and `thread`, `penalty` |
| Walking on | `clock` and `wind`, then the next caller's arrival |
| A robbery | `th_job` on the brief; `alarm`, `tell` and `tension` when you ride into it, or `alarm` and `robbery` when you hear about it afterwards |
| Sundown | the theme cut, `dusk`, then `respect` or `disgrace` at 700 ms |

**Sound test.** Line 2 of the title screen opens a screen that walks all 55 cues
by name and class, so the pistol, the ricochet, the reload, the church bell and
the eleven entrance themes can all be heard without playing a day to reach them.
Play, next, previous, back are the same four lines the rest of the game uses. A
test drives the whole list and asserts every cue in `SOUNDS` is reachable
through it.

The effects — the gunshot, the tell, the bells, the doctor's bottle, the alarm —
are the supplied table. `node tools/render-sounds.js` renders any of it to wav.

**Nothing counts the time the page was not running.** A locked phone or another
app stops the frame loop but not the clock behind it, so the first frame back
used to deliver a timestamp that had jumped by the whole absence and every
waiting clock expired at once: you came back to a street that had already
resolved itself. A frame more than 250 ms after the last one moves every origin
forward with it — the man at the window, the caller's patience, a tell, a
reload, a walk, the cue queue.

## Numbers

From `node --test test/*.test.js` and 500 simulated days:

- **Coverage.** Ten trees of three exchanges; the eleventh caller never speaks.
  Every node reachable, every authored ending reached, every action class —
  draw, ambush, delayed, surrender, depart — used by somebody. No visitor line
  over 150 characters, no reply over 92.
- **500 days**, replies chosen at random. 295 sheriffs saw sundown; scores ran
  −340 to 1510 with a median of 360. Tips: the bank warning reached 405 days,
  the train 252, the stage 192. 502 robberies of 1776 went unstopped, and 75
  days had a sheriff on the boardwalk with his hat off at least once.
- **Every day runs all three robberies**, including the days a caller was
  skipped because the sheriff was down, and no day is outsmarted more than
  twice.
- **The doctor**, all five states: civil survives two wounds, neutral and drunk
  survive one and not two, hostile and dead make the first one fatal, and
  shooting him takes the town's only rescue with him.
- **The figures.** Twelve figures — the eleven callers and the outlaw of the
  hold-ups — no two alike, every hitbox on the grid, every lethal box over the
  man and every weapon box over actual gunmetal, and no box overlapping another.
- **The second gun.** Between a tenth and four tenths of encounters have one and
  no day has more than two; the sash always goes up at least 1.2 seconds before
  the shot; the window is not a target until it does; shooting him counts, and
  leaving him alone costs a wound and blacks the street out.
- **Audio.** 55 cues through the runtime with no non-finite, negative or
  out-of-range value; every theme reachable, none needing a fourth voice at
  once, none shorter than 0.8 s or longer than 6. The gunfight, rendered:
  `gunshot` 0.61 s peak 0.33, `ricochet` 0.31 s, `hit` 0.23 s, `wound` 0.35 s,
  `death` 0.90 s, `cock` 0.16 s, `dryfire` 0.20 s, `reload` 0.59 s,
  `tell` 0.60 s, `churchbell` 2.15 s.
- **The page.** Real `pointerdown` and `keydown` events at every control in
  jsdom: the day starts, all four lines select and speak by tap and by number
  key, up draws and cuts the theme, the crosshair moves, down and Escape
  holster, fire shoots, a robbery is walked into and fought, a whole day reaches
  sundown over the seven dimensions, and FIRE restarts. Every `data-cmd` has a
  handler and every handler is reachable.

## Credit

Inspired by Law of the West (Accolade, 1985), designed by Alan Miller. Original
game music and sound effects by Ed Bogas.

This project is an independent, unofficial reinterpretation. Its code, writing,
artwork, and audio are newly created and do not reproduce the original game's
dialogue, audiovisual assets, or musical compositions.

## What is faithful, and what is not

Not an emulator, a port, or a copy of the original's content. The structure is
the 1985 design's, taken from its published description: eleven encounters with
eleven different people in a set sequence, met one at a time; one caller line and
four replies with up to three exchanges, the interaction style the original
introduced; a gun drawn on up that puts a
crosshair on the screen and interrupts anything; a caller who will not talk to a
gun drawn before he has been answered; surrender and departure and delayed draws
and ambushes; a caller you let walk turning up as the man in the alley, and one
who outwits you costing you the next encounter rather than the game; robberies you were warned about or were not; a blackout when the
sheriff is hit and a doctor who decides whether that was survivable; surviving
to sundown as the only requirement; the 320×200 holster-level composition; and
the seven dimensions at sundown; a gunsight bounded off the sheriff's own body;
and a hat you can shoot off a man instead of shooting the man.

The dialogue, the figures, the street, the melodies and the numbers are new.
Nothing from the original's code, artwork, script or sound is reused. The
characters, the mechanics and the framing above are facts about how the game
worked; no line, picture or bar of it has been copied, and none of its writing
was taken from a walkthrough, a longplay or a ROM. Modern
conveniences — touch controls, responsive placement, fullscreen, mute, keyboard
support and the test suite — are kept deliberately; they do not touch the
composition, the dialogue grammar, the encounter behaviour or the scoring.

## Full screen without the browser in the way

Mobile browsers slide their toolbars in and out while you play, and anything sized to the
current viewport resizes with them — the game jumping mid-move. Two things keep that out:

- The full-screen layout is sized in **`svh`**, the viewport height with the toolbars showing,
  so it does not move when they do. The strip the bars vacate simply stays dark. (`dvh` and
  `vh` are declared first for browsers without `svh`.)
- **Install it** and there are no toolbars at all: on iPhone or iPad, Share ▸ **Add to Home
  Screen**. A launch from the icon opens straight into the full-screen layout. There is no web
  app manifest and no service worker here on purpose — this page fetches nothing, which is the
  rule its own tests hold it to, and it is already as offline as a page can be. The
  `apple-mobile-web-app` tags are what make the home-screen launch run chrome-free.
