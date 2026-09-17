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

```
node tools/render-sounds.js                 # 42 wavs plus 00-all-sounds.wav
node tools/render-sounds.js --only tell,gunshot,graze
node tools/check-audio.js                   # no non-finite, negative or out-of-range values
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

## Still blocked

The game itself cannot be written yet: the eleven cast names, the place names and
the dialogue table are all outstanding, and `realjkg/law-of-the-west` has to be
created before anything can be committed to it.
