import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {DOMParser} from 'linkedom';
import {parseMusicXML,importedExcerpt} from '../import-score.js';
import {eventsFor} from '../engine.js';
import {makeCues} from '../follower.js';

const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../vendor/abcjs-basic-min.js',import.meta.url),'utf8'),sandbox);
const notes=abc=>sandbox.ABCJS.parseOnly(abc)[0].lines.flatMap(l=>l.staff?.[0]?.voices[0]||[]).filter(n=>n.el_type==='note');
// Durations in divisions of 4 per quarter.
const n=(step,duration,chord=false)=>`<note>${chord?'<chord/>':''}<pitch><step>${step}</step><octave>4</octave></pitch><duration>${duration}</duration></note>`;
const r=duration=>`<note><rest/><duration>${duration}</duration></note>`;
const bar=(content,meter='4/4')=>{const [b,t]=meter.split('/');return parseMusicXML(`<score-partwise><part id="p"><measure number="1"><attributes><divisions>4</divisions><time><beats>${b}</beats><beat-type>${t}</beat-type></time></attributes>${content}</measure></part></score-partwise>`,'Beams',DOMParser);};
const engraved=score=>notes(importedExcerpt(score,'right',1,1));
// Beam groups as arrays of note indices.
const groups=list=>{const out=[];let open=null;list.forEach((x,i)=>{if(x.startBeam)open=[];if(open)open.push(i);if(x.endBeam){out.push(open);open=null;}});return out;};

test('two eighths in one beat beam together',()=>{
  const s=engraved(bar(n('C',2)+n('D',2)+n('E',4)+n('F',8)));
  assert.ok(s[0].startBeam&&s[1].endBeam);assert.deepEqual(groups(s),[[0,1]]);
});
test('four sixteenths form one beam group',()=>{
  assert.deepEqual(groups(engraved(bar(n('C',1)+n('D',1)+n('E',1)+n('F',1)+n('G',12)))),[[0,1,2,3]]);
});
test('dotted eighth and sixteenth beam',()=>{
  assert.deepEqual(groups(engraved(bar(n('C',3)+n('D',1)+n('E',12)))),[[0,1]]);
});
test('beams stop at the beat boundary',()=>{
  assert.deepEqual(groups(engraved(bar(n('C',2)+n('D',2)+n('E',2)+n('F',2)+n('G',8)))),[[0,1],[2,3]]);
});
test('a rest between eighths breaks the beam',()=>{
  const s=engraved(bar(n('C',2)+r(2)+n('E',2)+n('F',2)+n('G',8)));
  assert.deepEqual(groups(s),[[2,3]]);assert.ok(!s[0].startBeam);
});
test('quarters never beam',()=>{
  assert.deepEqual(groups(engraved(bar(n('C',4)+n('D',4)+n('E',4)+n('F',4)))),[]);
});
test('compound meter beams eighths in groups of three',()=>{
  assert.deepEqual(groups(engraved(bar(n('C',2)+n('D',2)+n('E',2)+n('F',2)+n('G',2)+n('A',2),'6/8'))),[[0,1,2],[3,4,5]]);
});
test('chords beam with adjacent eighths and cues stay unique',()=>{
  const score=bar(n('C',2)+n('E',2,true)+n('G',2)+n('E',4)+n('F',8));
  const abc=importedExcerpt(score,'right',1,1);
  assert.match(abc,/\[CE\]1\/2G1\/2 /);
  assert.deepEqual(groups(notes(abc)),[[0,1]]);
  const cues=makeCues(eventsFor(score,'right',1,1),'right',1,4);
  assert.equal(new Set(cues.map(c=>c.selector)).size,cues.length);
});
