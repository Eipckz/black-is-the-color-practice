# Black Is the Color - piano practice

A static, phone-friendly practice room for the supplied 12-measure accompaniment. The visible score is retained throughout practice. No account, backend, analytics, or audio uploads.

## Use

1. Start with **Learn each hand** at 50 BPM (or slower).
2. Read the visible score, try the section, then listen to check it. Piano RH is the middle bass-clef staff, not the separate melody.
3. Rate your own attempt and choose **Next mixed round**. The next round changes sections and prioritizes less secure material.
4. Move to **Mix & combine** for both hands and **Polish** for transitions and a full run.
5. Optional microphone mode checks one left-hand note at a time. Play without pedal and fully release between notes. Timing, fingering, and polyphonic chords are not graded.

The included PDF and ABC file preserve the corrected score, including left-hand fingerings below the notes and removal of automatically generated chord accompaniment. The final E1 is written at its sounding octave. The MIDI reference contains only the three written parts.

Progress stays in this browser's localStorage. Downloads provide a portable backup; progress does not automatically sync between devices.

## Implementation and validation

- Static ES modules; vendored abcjs 6.6.4 for notation, self-hosted Salamander grand-piano recordings with Web Audio playback.
- Pure JavaScript YIN pitch detector with level, confidence, cents, stability and release gates. Audio is neither recorded nor sent anywhere.
- `node --test tests/*.test.js` checks note/fingering parity, the absence of extra ending events, section selection, silence rejection, and synthetic harmonic bass detection.
- UI checked through Codex browser: hand/section selection, two-staff rendering, playback start/finish/stop, self-rating, interleaved next round, persistence after reload.
- PDF rendered and visually reviewed; one letter-size page.
- Physical iPhone/Android playback and microphone accuracy with a real piano: **NOT TESTED**. Browser permission may be unavailable in embedded webviews; use Safari or Chrome directly.
- Audio uses recorded piano samples and fixed selected tempo. Printed dynamics/ritardando are musical instructions for the learner, not modeled expressive playback.

## Local preview

Run a static server, e.g. `python -m http.server 8767`, then open localhost. Microphone requires HTTPS or localhost and a user permission prompt. No API key or build step.

## Sources and alternatives

- [Piano Marvel custom uploads](https://pianomarvel.com/en/feature/uploads)
- [Piano Marvel microphone assessment limitations](https://support.pianomarvel.com/portal/en/kb/articles/ios-microphone)
- [Interleaved music practice - Carter & Grahn, 2016](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2016.01251/full)
- [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

abcjs is MIT licensed; see `vendor/abcjs-LICENSE.txt`. The score is a transcription/completion of a user-supplied exercise; no claim is made that the textbook arrangement is freely licensed. This repository does not include the source photograph.

## Piano and practice controls

Pause and resume, seek within a section, choose any measure range, and adjust each hand's balance. Focus mode keeps the score and transport prominent; large notation uses one measure per line. Download a WAV of the selected section, hands, tempo, and balance to retain the same piano sound outside the site. MIDI playback depends on the receiving player's instrument.

Progress can be downloaded and restored on another device. Import validates the song and practice records and retains newer local entries.

Samples: Salamander Grand Piano, Yamaha C5 recordings by Alexander Holm, CC BY 3.0. See `assets/piano/ATTRIBUTION.txt` and the source manifest for attribution, modifications, and checksums. Samples are served from this site, with no third-party runtime requests. Audio export uses these recordings.

Automated checks cover score parity, final attack, ties, seeking held notes, muted voices, sample integrity, WAV encoding, progress validation, interleaving, and synthetic pitch detection. Browser offline rendering also verifies all 18 samples decode and produce finite stereo audio without clipping.
