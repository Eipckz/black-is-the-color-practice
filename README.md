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

## Following the score

Sound & practice settings includes current notes/rests, whole-measure highlighting, or no highlighting. Current left-hand notes are green and right-hand notes are orange. Held notes remain highlighted while the other hand changes. An optional dashed outline previews the next entry. The Now / Next guide includes pitches, rests, and fingerings.

Auto-scroll follows the active system during playback and count-in practice; it follows the score's clock, not microphone performance. Toggle it independently of highlighting. Tap a written note or rest to seek, or use Previous notes / Next notes to study each entry while paused. These controls preserve the chosen section and tempo. Settings are saved on this device.

## Casio USB MIDI

Connect the PX-330 USB-B port to a computer and select its MIDI input after granting permission. Desktop Chrome or Edge is the recommended starting point. The app requests no SysEx access and sends no MIDI output. Use the piano's own sound, including through headphones. The input list updates when devices connect or disconnect, with a channel selector for routing. Pedal does not count as physically holding a key.

Wait for my notes checks exact pitches and fresh attacks while retaining sustained notes. Check notes & rhythm uses at least one bar of count-in and reports on-time, early, late, missed, wrong-pitch and extra attacks. Balanced tolerance is 25% of one beat, bounded to 90-300 ms. Relaxed and tighter settings adjust this window. Timing uses browser receipt time, so hardware/audio latency can affect results. No hold-length, pedal, or fingering grade is assigned. Transport changes cancel the timed assessment; restart for a complete result.

MIDI decoding, channel handling, chord matching, repeated-note attacks, rhythm windows, full-score simulated performances, device disconnection, and pending-permission cleanup are tested without physical hardware. A real PX-330 and iPad connection remain NOT TESTED. See the on-page manual and browser support links for setup.
