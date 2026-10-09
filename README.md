# At the Piano: repertoire practice

A static GitHub Pages practice room with a persistent score library. The original Black Is the Color accompaniment remains included. No account, server, analytics, or score uploads.

Sharp and flat noteheads appear purple, including alterations supplied by the key signature. Natural notes retain their normal color. During playback, altered noteheads stay purple while the current note stem follows the hand highlight color.

## Compact practice view

The default compact view puts the score, transport, live estimate, ratings, and next round together. Show library opens a drawer; Full view restores introductory material. Settings, keyboard, MIDI, microphone, practice plan, and downloads are collapsible. Landscape iPad gets a compact two-measure layout; portrait and phones reflow vertically.

Start timer (or playback) measures active practice. Rating pauses the timer; Next practice round starts it again. Hidden tabs and reloads pause timing. After three timed rated rounds of at least ten seconds, the estimate uses recent round durations, remaining stage targets, and a retry allowance from self-ratings. It updates each second during timed practice and persists per piece, including in backups. The displayed range is a heuristic planning range, not a statistically calibrated confidence interval or a prediction of mastery. Existing untimed progress is retained but is not invented timing evidence.

## Page view

By default the score shows the page around the current section: the section stays at full strength and the rest of the page is dimmed, so you can see where the passage sits. Each system shows its real measure number. In Score, sound & practice settings choose **Score view** (current section only, page, or whole piece), **Page size** (4, 8, 12 or 16 measures; phones start at 4), **Measures per line** (auto: 4 on wide screens, 2 up to 900 px, 1 on phones), and how strongly the rest of the page is dimmed (0–90%). Playback, highlighting, Previous/Next notes, MIDI and microphone checks stay inside the section. Tap a dimmed measure to practise that measure on its own.

## Display, playback and shortcuts

Choose your own right- and left-hand highlight colours (Reset restores orange and green), turn the purple sharps and flats off, and pick a light, dark, or device-matched theme. Dark theme inverts the engraving so it reads light; choose white paper behind the notation if you prefer. These display choices belong to the device, like the compact view. Print this score page (Downloads & help) prints the current page of notation at full strength without the controls.

Loop plays a section twice, four times, or until stopped. The metronome can click each beat or each eighth note. Hear LH only, RH only, or Both hands sets the two hand sliders in one tap. Keyboard shortcuts: Space play/pause, ← → previous/next notes, L loop, M metronome, 1 2 3 rate the round, N next round. They are ignored while a form control has focus.

## Shaping your practice

For imported pieces choose 1-, 2- or 4-measure sections. Each size keeps its own practice records, so switching sizes never rewrites earlier rounds; the plan panel shows the active size. The built-in piece keeps its hand-written sections. Separate-hands rounds can start with the left or right hand, or always alternate hands. Interleaving can jump across the piece (default), stay with neighbouring passages, or go in order; weaker material still comes first. Choose the tempo step (2, 5 or 10 BPM) suggested after two clean returns, and whether Needs a slow retry slows the tempo automatically.

Set a daily practice goal in minutes. The timer adds active practice to today's total for all pieces on this device (60 days are kept, and included in backups). Write your own notes for each section and hand, up to 2,000 characters; they are saved with the piece's progress and backups.

## Library and four practice stages

- The library sidebar lists saved pieces and their last practice stage. Select a piece to restore its stage, section, hand, tempo, targets, and progress. On phones the library appears above the workspace.
- Remove an imported piece and its practice progress with **Remove this piece**. Download a backup first to retain a recoverable copy.
- Import one or several `.musicxml`, `.xml`, or compressed `.mxl` files. Source MusicXML is stored locally in IndexedDB and can be downloaded again. Identical source files reuse their existing entry.
- Learn each hand, combine hands, polish, then use the fourth **Whole piece** tab for a complete play-through. The fourth tab retains playback, pause, seek, count-in, loop, MIDI practice, note navigation, and audio export.
- Each stage has its own round counter and saved section/hand. Tab, hand, and section navigation does not add rounds. Rate an attempt once to complete a round, then choose Next practice round. Reloading or switching tabs cannot rate the same round again.
- The built-in piece starts with 24 separate-hand, 12 combined-hand, and 18 polishing rounds, 54 total. New scores get targets based on their two-measure sections and transitions. Practice rounds switch passages and prioritize weaker material; equally practiced sections jump across the piece instead of following measure order. Targets are editable plans, not mastery guarantees; stages are always accessible and extra rounds are unlimited.
- Existing Black Is the Color practice records and settings are retained. The legacy global round number counted navigation, so it is deliberately not treated as completed practice.
- Download library backup saves all imported source scores and progress. Restore validates scores and identities, keeps newer local practice records and higher round counts, and also accepts the old single-piece progress format when the built-in piece is selected.

Storage belongs to this browser and site origin. It does not synchronize automatically between devices. Download backups before clearing browser data or moving devices. Import and save errors are shown visibly.

## MusicXML support

Imported eighths and sixteenths are beamed by beat (in groups of three eighths in 6/8, 9/8 and 12/8); rests and longer notes break beams. Tuplets display their written note values, beaming, and numbers: triplets (including unequal ones such as quarter + eighth, or a rest then a note), quintuplets, sextuplets and septuplets in simple meters, and duplets or quadruplets in compound meters when their durations cannot be written as plain or dotted notes. This also fixes previously saved imports without re-importing; playback timing remains unchanged.

Select the concert-pitch piano part when importing a multi-part MusicXML score. The choice persists across reloads and library backups. Use a piano part with one or two staves, standard treble/bass clefs, and a constant numeric meter. Import retains pitches, durations, accidentals, chords, multiple overlapping voices, ties, and supplied fingerings. Overlapping voices are represented as tied chord slices in the practice notation, so engraving differs from the source. The note guide retains fingering text; standard finger numbers 1 through 5 also appear above the notes.

Expand repeats and jumps before export. Grace notes, changing meters, transposing parts, percussion, and overlapping unisons are rejected with an explanation. A short first measure is treated as a pickup and placed at the end of bar 1, so it leads into the first downbeat; other short measures are padded with rests. Practice notation uses the opening clefs, preserves key signatures, and prints accidentals only when needed. Saved imports are refreshed from their stored source when the library opens, without changing practice progress. Expressive dynamics, pedal, ornaments, articulations, and tempo changes are not reproduced; consult the original source for those markings. Playback tempo is quarter-note BPM, with meter-appropriate count-in subdivisions.

ABC, MIDI, PDF, and photo import are not implemented. Convert through a notation app to MusicXML where supported. The original piece's ABC, MIDI, and PDF downloads remain available.

## Validation

Run `npm ci` and `npm test`. The development-only DOM parser supports MusicXML tests; the deployed site has no npm runtime dependency or build step. Tests cover stage persistence, legacy migration, unlimited extra rounds, variable score lengths, MusicXML fingerings/meter/overlapping voices, tied playback and MIDI attacks, rejected notation, plus the original audio, pitch, follower, and MIDI checks.

Browser checks cover independent stage counters, full-piece rendering and playback, MusicXML and compressed MXL import, batch import, duplicate handling, library switching, reload, backup restore, and desktop/mobile layout. Physical piano and microphone hardware have not been tested in this update.

## Original project details


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

Sound & practice settings includes current notes/rests, whole-measure highlighting, or no highlighting. Current left-hand notes are green and right-hand notes are orange. Held notes remain highlighted while the other hand changes. The Now / Next guide includes pitches, rests, and fingerings.

Outline upcoming notes (off by default) adds a dashed outline to the next entry. In both-hands practice the on-screen keyboard lights each key in its own hand's colour. The marked tempo of the score appears under the controls; Set to marked tempo applies it, while new pieces still start at 50 BPM for learning.

Auto-scroll follows the active system during playback and count-in practice; it follows the score's clock, not microphone performance. Toggle it independently of highlighting. Tap a written note or rest to seek, or use Previous notes / Next notes to study each entry while paused. These controls preserve the chosen section and tempo. Settings are saved on this device.

## Casio USB MIDI

Connect the PX-330 USB-B port to a computer and select its MIDI input after granting permission. Desktop Chrome or Edge is the recommended starting point. The app requests no SysEx access and sends no MIDI output. Use the piano's own sound, including through headphones. The input list updates when devices connect or disconnect, with a channel selector for routing. Pedal does not count as physically holding a key.

Wait for my notes checks exact pitches and fresh attacks while retaining sustained notes. Check notes & rhythm uses at least one bar of count-in and reports on-time, early, late, missed, wrong-pitch and extra attacks. Balanced tolerance is 25% of one beat, bounded to 90-300 ms. Relaxed and tighter settings adjust this window. Timing uses browser receipt time, so hardware/audio latency can affect results. No hold-length, pedal, or fingering grade is assigned. Transport changes cancel the timed assessment; restart for a complete result.

MIDI decoding, channel handling, chord matching, repeated-note attacks, rhythm windows, full-score simulated performances, device disconnection, and pending-permission cleanup are tested without physical hardware. A real PX-330 and iPad connection remain NOT TESTED. See the on-page manual and browser support links for setup.
