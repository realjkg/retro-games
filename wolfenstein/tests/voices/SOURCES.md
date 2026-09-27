# Reference voices

Recordings of voices whose sex is known, used by `voices.test.cjs` to check
the man-or-woman measure in `tools/voicegender.js` before it is trusted on
anything the game plays. Resampled to 8 kHz, 8-bit mono, at most 1.6 s each.

* `LJ001-*.wav`: the first 1.6 seconds of six clips from **LJSpeech 1.1**,
  one woman (Linda Johnson) reading. Public domain.
  https://keithito.com/LJ-Speech-Dataset/ (taken from the copies in
  coqui-ai/TTS `tests/data/ljspeech/wavs`).
* `<digit>_<name>_0.wav`: two digits each from six men (george, jackson,
  lucas, nicolas, theo, yweweler) in the **Free Spoken Digit Dataset**,
  https://github.com/Jakobovski/free-spoken-digit-dataset, licensed
  CC BY-SA 4.0. Unchanged apart from the header.

* `espeak-m1..m7.wav`, `espeak-f1..f5.wav`: eSpeak NG's own labelled male
  and female German voices saying "Halt! Kommen Sie! Wohin gehen Sie?",
  rendered through meSpeak. The audio eSpeak makes is its output, not its
  code.

Only one real woman is here; the other five women are eSpeak's. More real
recordings of women would make the check stronger.
