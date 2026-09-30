import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {DOMParser} from 'linkedom';
import {parseMusicXML,importedExcerpt,readMusicXMLFile} from '../import-score.js';import {eventsFor} from '../engine.js';import {scheduleFrom} from '../piano.js';import {midiTargets,RhythmCheck} from '../midi.js';import {makeCues} from '../follower.js';
const xml=fs.readFileSync(new URL('./fixtures/three-beat-study.musicxml',import.meta.url),'utf8');const parse=s=>parseMusicXML(s,'test.musicxml',DOMParser);
test('score selection does not depend on file extension or MIME classification',async()=>{for(const name of ['soundslice.musicxml','soundslice.xml','SCORE.XML','download','score.mxl']){const source=await readMusicXMLFile(new File([xml],name,{type:'application/octet-stream'}));assert.equal(parse(source).title,'Three-beat study');}assert.throws(()=>parse('This is not a MusicXML score.'));});
test('MusicXML preserves meter, fingerings, voices, accidental and clefs',()=>{const s=parse(xml);assert.equal(s.measures,2);assert.equal(s.beatsPerMeasure,3);assert.equal(s.clefs.right,'treble');assert.deepEqual(s.voices[0].events[0].notes,[60,64]);assert.deepEqual(s.voices[0].events[0].fingers,['1','3']);assert.deepEqual(s.voices[0].events[1].notes,[60,66]);assert.equal(eventsFor(s,'left',2,2)[0].beat,3);const abc=importedExcerpt(s,'both',1,2);assert.match(abc,/!1!!3!/);assert.match(abc,/\^F/);assert.match(abc,/M:3\/4/);});
test('overlapping voices sustain without false MIDI or playback attacks',()=>{const s=parse(xml),events=eventsFor(s,'both',1,2),audio=scheduleFrom(events,0,6);const c=audio.filter(e=>e.notes.includes(60));assert.equal(c.length,1);assert.equal(c[0].length,3);const targets=midiTargets(events);assert.deepEqual(targets[1].attacks,[66]);assert.ok(targets[1].notes.includes(60));assert.equal(new RhythmCheck(events,60).expected.length,6);assert.equal(makeCues(events,'both',1,3).find(e=>e.beat===3).selector,'.abcjs-v0.abcjs-mm1.abcjs-n0');});
test('reject unsupported notation before saving a misleading score',()=>{assert.throws(()=>parse(xml.replace('<staves>2</staves>','<transpose><chromatic>2</chromatic></transpose>')));assert.throws(()=>parse(xml.replace('<measure number="2">','<measure number="2"><barline><repeat direction="backward"/></barline>')),/Expand repeats/);assert.throws(()=>parse(xml.replace('<measure number="2">','<measure number="2"><attributes><time><beats>4</beats><beat-type>4</beat-type></time></attributes>')),/Changing time/);assert.throws(()=>parse('<html>no score</html>'));});
test('single-staff scores include a silent left staff',()=>{const s=parse(xml.replaceAll('<staff>2</staff>','<staff>1</staff>'));assert.ok(s.voices[1].events.every(e=>e.notes.length===0));});
test('eighth-note meter keeps quarter-note timing and measure boundaries',()=>{const s=parse(xml.replace('<divisions>4</divisions>','<divisions>8</divisions>').replace('<beat-type>4</beat-type>','<beat-type>8</beat-type>'));assert.equal(s.beatsPerMeasure,1.5);assert.equal(eventsFor(s,'right',2,2)[0].beat,1.5);assert.equal(scheduleFrom(eventsFor(s,'both',1,2),0,3).at(-1).length,1.5);});
test('starting at a tied continuation asks for a fresh MIDI attack',()=>{const s=parse(xml);s.voices[0].events.at(-1).tieEnds=[67];const events=eventsFor(s,'right',2,2);assert.deepEqual(midiTargets(events)[0].attacks,[67]);});
const accidentalScore=(bars,{fifths=0}={})=>parse(`<score-partwise><part><measure><attributes><divisions>1</divisions><key><fifths>${fifths}</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time></attributes>${bars[0]}</measure>${bars.slice(1).map(b=>`<measure>${b}</measure>`).join('')}</part></score-partwise>`);
const pitchNote=(step,alter=0,octave=4)=>`<note><pitch><step>${step}</step><alter>${alter}</alter><octave>${octave}</octave></pitch><duration>1</duration></note>`;
test('imported notation omits redundant naturals and repeats but cancels alterations',()=>{
  const s=accidentalScore([pitchNote('C')+pitchNote('B',-1)+pitchNote('B',-1)+pitchNote('B'),pitchNote('B')+pitchNote('B',-1)]);
  const abc=importedExcerpt(s,'right',1,2);
  assert.match(abc,/C1\/1 _B1\/1 B1\/1 =B1\/1 \| B1\/1 _B1\/1/);
  assert.deepEqual(s.voices[0].events.slice(0,4).map(e=>e.notes[0]),[60,70,70,71]);
  delete s.measureKeys;
  assert.equal(importedExcerpt(s,'right',1,2),abc,'previously saved imports also improve immediately');
});
test('accidentals reset by measure and octave, and excerpts establish their own state',()=>{
  const s=accidentalScore([pitchNote('F',1)+pitchNote('F',0,5)+pitchNote('F',1),pitchNote('F',1)+pitchNote('F',1)]);
  assert.match(importedExcerpt(s,'right',1,2),/\^F1\/1 f1\/1 F1\/1 z1\/1 \| \^F1\/1 F1\/1/);
  assert.match(importedExcerpt(s,'right',2,2),/\[V:right\] \^F1\/1 F1\/1/);
});
test('key signatures and changes supply defaults without changing actual pitches',()=>{
  const s=accidentalScore([pitchNote('F',1)+pitchNote('F')+pitchNote('F',1),'<attributes><key><fifths>-1</fifths></key></attributes>'+pitchNote('B',-1)+pitchNote('B')],{fifths:1});
  assert.deepEqual(s.measureKeys,[1,-1]);
  assert.match(importedExcerpt(s,'right',1,2),/K:G\n/);
  assert.match(importedExcerpt(s,'right',1,2),/F1\/1 =F1\/1 \^F1\/1/);
  assert.match(importedExcerpt(s,'right',1,2),/\[K:F\] B1\/1 =B1\/1/);
  assert.match(importedExcerpt(s,'right',2,2),/K:F\n/);
});
test('accidental state remains independent for the two staves',()=>{
  const s=parse(xml);s.voices[1].events=structuredClone(s.voices[0].events);const abc=importedExcerpt(s,'both',1,2);
  assert.doesNotMatch(abc.split('K:C\n')[1],/=[A-Ga-g]/);
  assert.equal((abc.match(/\^F/g)||[]).length,2,'each staff prints its own sharp and a sustained sharp is not printed again on its tied slices');
});

test('multi-part import requests a named selection and ignores unsupported other parts',()=>{
 const doc=new DOMParser().parseFromString(xml,'application/xml');const original=doc.querySelector('part');original.setAttribute('id','piano');const other=doc.createElement('part');other.setAttribute('id','voice');other.innerHTML='<measure><note><grace/></note></measure>';doc.documentElement.append(other);const source=doc.toString();
 assert.throws(()=>parse(source),error=>error.parts.length===2&&error.parts[0].id==='piano');
 const selected=parseMusicXML(source,'test.xml',DOMParser,'piano');assert.equal(selected.measures,2);assert.equal(selected.partId,'piano');assert.throws(()=>parseMusicXML(source,'test.xml',DOMParser,'missing'),/missing/);
});
test('MIDI and overfull bars give specific actionable errors',()=>{
 assert.throws(()=>parse('MThd0000'),/MIDI/);
 assert.throws(()=>parse(xml.replace('<duration>12</duration>','<duration>16</duration>')),/Measure/);
});
