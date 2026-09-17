# Law of the West — work in progress

Staging for the Law of the West sub-repository. It lives here only because
`realjkg/law-of-the-west` does not exist yet; when it does, these files move to
that repository's root and this directory goes away. Nothing here is wired into
the collection or served by Pages.

## What is here

| Path | What it is |
| --- | --- |
| `sid-audio.js` | The supplied SID-idiom synth, engine untouched, with 25 cues added to the `SOUNDS` table |
| `tools/render-sounds.js` | Offline renderer: reads the table out of `sid-audio.js` and writes wav files for auditioning |
| `tools/check-audio.js` | Drives every cue through the real runtime against a stubbed AudioContext |
| `audio/` | Rendered wavs. Not committed — they are reproducible from the table |
| `content.js` | The cast as supplied, and the empty dialogue table |
| `engine.js` | All rules, no DOM: state machine, trust, duel, doctor, threads, scoring |
| `test/` | The harness, the throwaway fixture dialogue, and tests 1-7 |

```
node tools/render-sounds.js                 # 42 wavs plus 00-all-sounds.wav
node tools/render-sounds.js --only tell,gunshot,graze
node tools/check-audio.js                   # no non-finite, negative or out-of-range values
node --test test/*.test.js                  # tests 1-7, numbers to test/last-report.json
```

The renderer is not a second synthesiser: it reads `SOUNDS` from `sid-audio.js`
itself, so the two cannot drift. It mirrors the runtime's maths — the 16-bit
frequency and 4-bit level quantisers, the 23-bit LFSR noise, the 50 Hz step
list, the ring modulator, the resonant lowpass, the saw-minus-delayed-saw pulse
and the `0.3` bus gain. Node's sawtooth is naive where Web Audio's is
band-limited, so a render is slightly brighter than the browser and peaks lower;
timing is identical. Checked against the supplied reference audition wav: at its
0.33 s gap, all 17 original onsets land within the 10 ms measurement window.

## The table

17 cues were supplied. The 25 added cover the parts of the day the first table
did not, in the same idiom and as data only — no change to the synthesis, and no
change to any existing entry.

| Cue | Where it plays |
| --- | --- |
| `dawn` | The day opens, answering `dusk` at the other end |
| `badge` | The star goes on, at the start of a run |
| `hooves` | A mounted character rides up — the gunslinger, the rustler |
| `wagon` | The stage or a wagon arrives |
| `spurs` | A gunfighter walks on |
| `crowd` | Townsfolk on the street behind an encounter |
| `wind` | Dust between encounters |
| `piano` | The saloon, under the proprietress's scene |
| `churchbell` | A killing, after the body is down |
| `clock` | The day advancing from one slot to the next |
| `clue` | A robbery fragment learned |
| `point` / `penalty` | Standing gained or lost, against the running total |
| `thread` | A robbery prevented |
| `alarm` | The robbery announced in progress |
| `robbery` | The crime happening because the fragments were missed |
| `romance` | Slot seven resolving that way |
| `tension` | Two heartbeats under the pre-draw window, beneath `tell` |
| `cock` | The hammer going back |
| `aim` | The crosshair coming up |
| `dryfire` | Fire pressed with nothing available |
| `graze` | A shot passing the player |
| `reload` | The cylinder, five clicks |
| `bottle` | The doctor's bottle — the refusal branch |
| `patch` | The doctor treating a wound |

Levels sit between 0.06 and 0.33 peak with the bus gain applied; `gunshot`
remains the loudest thing in the game, as it should be.

## The engine

`content.js` holds the cast — the ten encounters in day order, each one's role,
what he knows, whether he is armed, how easily he draws, and how he reads each
of the four tones. `DIALOGUE` in the same file is empty: lines go there and
nowhere else, and the engine treats a missing beat as content pending rather
than inventing one. `engine.js` is all rules and no DOM: the state machine
(intro, approach, dialogue, tell, duel, resolve, summary), trust and agitation,
the tell window, the duel, the doctor, the three robbery threads and the
scoring. Both are development files; they get pasted into the single
`index.html` when the page is assembled, and the harness will load them from
there instead.

### Decisions taken, so they are not buried in code

- **Ten encounters, not eleven.** The supplied cast is ten characters plus the
  Sheriff, so there is no closing gunfighter and the day ends on Belle.
- **Disclosure is weighed, not gated.** Trust does not cross a hard line; it
  sets the odds, `P = 1/(1+e^-((trust-need)/2.5))`. A warm conversation makes
  disclosure likely and a cold one unlikely, and neither is certain. Hard
  thresholds made the same answers always end the same way.
- **A settled man can still turn**: each armed character carries a hostile
  chance, higher once he is riled.
- **Fragments** (pending confirmation): one fragment is enough to stop a job.
  The Deputy's slot triggers whichever job the sheriff holds nothing for,
  preferring the bank he reports; jobs nobody stopped happen at dusk.
- **Belle's alliance** (pending confirmation) counts towards judgement and
  standing; no fourth crime is attached to the rustling.

## Numbers

`node --test test/*.test.js` runs tests 1 to 7 of the plan against the fixture
dialogue; `test/last-report.json` holds the raw output. Test 8 (jsdom against
the real page, every control dispatched) waits for the page, which waits for the
dialogue table.

Where the spec is not met: its variance rule asks that no single choice path
produce the same outcome more than 80% of the time. 11 of the 40
character-and-tone paths still do. The Deputy's four are structural — whether
the bank job is stopped depends on the fragments in hand, and a coin flip there
would be wrong — and the rest are decisively cold or hot paths on unarmed
characters, where trust deciding the outcome is the point. Every character has
at least one path that varies, and the full matrix is in the report. Raising
`RULES.TEMP` would satisfy the rule at the cost of making choices matter less.

## Still blocked

The page cannot be written yet: the dialogue table is outstanding — 10
characters, 3 beats each, four written responses and a reaction per beat — and
`realjkg/law-of-the-west` has to be created before anything can be committed to
it. Four design questions are also open: the gang's name (James Gang or the
Daltons), whether the first-person reading is right, what counts as enough
fragments, and whether Belle's alliance carries a crime.
