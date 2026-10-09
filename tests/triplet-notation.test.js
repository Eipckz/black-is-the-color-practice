import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {DOMParser} from 'linkedom';
import {parseMusicXML,importedExcerpt} from '../import-score.js';
import {eventsFor} from '../engine.js';
import {makeCues} from '../follower.js';
import {scheduleFrom} from '../piano.js';

// Use the shipped notation parser to check written values and tuplet timing.
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../vendor/abcjs-basic-min.js',import.meta.url),'utf8'),sandbox);
const parseAbc=abc=>sandbox.ABCJS.parseOnly(abc)[0];
const note=(step,duration,{octave=5,alter=0,staff=1,finger='',chord=false,type='eighth'}={})=>`<note>${chord?'<chord/>':''}<pitch><step>${step}</step><alter>${alter}</alter><octave>${octave}</octave></pitch><duration>${duration}</duration><type>${type}</type><staff>${staff}</staff><notations><technical><fingering>${finger}</fingering></technical></notations></note>`;
const scoreFor=bar=>parseMusicXML(`<score-partwise><part id="piano"><measure number="1"><attributes><divisions>24</divisions><time><beats>4</beats><beat-type>4</beat-type></time><key><fifths>3</fifths></key></attributes>${bar}</measure></part></score-partwise>`,'Triplet study',DOMParser);
const blues=()=>scoreFor(note('A',8,{octave:4,finger:'1'})+note('C',8,{finger:'2'})+note('D',8,{finger:'1'})+note('E',8,{alter:-1,finger:'2'})+note('E',8,{finger:'3'})+note('G',8,{finger:'4'})+note('A',24,{finger:'5',type:'quarter'})+'<note><rest/><duration>24</duration></note><backup><duration>96</duration></backup>'+note('A',48,{octave:3,staff:2,type:'half'})+note('E',48,{octave:4,staff:2,chord:true,type:'half'})+'<note><rest/><duration>24</duration><staff>2</staff></note>'+note('A',24,{octave:3,staff:2,type:'quarter'})+note('E',24,{octave:4,staff:2,chord:true,type:'quarter'}));
const notationNotes=(abc,staff=0)=>parseAbc(abc).lines.flatMap(l=>l.staff?.[staff]?.voices[0]||[]).filter(n=>n.el_type==='note');

test('blues triplets engrave as two beamed eighth-note groups with 3 markings',()=>{
  const score=blues(),before=structuredClone(score),abc=importedExcerpt(score,'both',1,1);
  assert.equal((abc.match(/\(3:2:3/g)||[]).length,2);
  assert.match(abc,/\(3:2:3!1!A1\/2!2!=c1\/2!1!d1\/2 /);
  const notes=notationNotes(abc);
  assert.equal(notes.length,8);
  assert.ok(notes.slice(0,6).every(n=>n.duration===1/8),'written eighth notes, without dotted sixteenths');
  for(const i of [0,3]){assert.equal(notes[i].startTriplet,3);assert.equal(notes[i].tripletMultiplier,2/3);assert.equal(notes[i].startBeam,true);assert.equal(notes[i+2].endTriplet,true);assert.equal(notes[i+2].endBeam,true);}
  assert.equal(notes[6].duration,1/4);assert.equal(notes[7].duration,1/4);
  assert.deepEqual(score,before,'engraving leaves playback data untouched');
  const cues=makeCues(eventsFor(score,'both',1,1),'both',1,4);
  assert.equal(cues.length,11);assert.equal(new Set(cues.map(c=>c.selector)).size,11);
  assert.equal(scheduleFrom(eventsFor(score,'right',1,1),0,4).length,7);
});

test('previously saved rounded triplet timings render correctly in excerpts and large view',()=>{
  const score=JSON.parse(JSON.stringify(blues()));
  score.measures=9;score.measureKeys=Array(9).fill(3);
  for(const voice of score.voices)for(const event of voice.events)event.beat+=32;
  for(const hand of ['right','both'])for(const large of [false,true]){
    const abc=importedExcerpt(score,hand,9,9,large),notes=notationNotes(abc);
    assert.equal(notes.filter(n=>n.startTriplet===3).length,2);
    assert.ok(notes.slice(0,6).every(n=>n.duration===1/8));
    let factor=1;
    notes.forEach((n,i)=>{if(n.startTriplet)factor=n.tripletMultiplier;assert.ok(Math.abs(n.duration*4*factor-score.voices[0].events[i].duration)<1e-6);if(n.endTriplet)factor=1;});
  }
});

test('quarter-note triplets retain quarter-note values and exact performance duration',()=>{
  const score=scoreFor(note('C',16,{type:'quarter'})+note('D',16,{type:'quarter'})+note('E',16,{type:'quarter'})+note('F',48,{type:'half'}));
  const notes=notationNotes(importedExcerpt(score,'right',1,1));
  assert.ok(notes.slice(0,3).every(n=>n.duration===1/4));assert.equal(notes[0].startTriplet,3);assert.equal(notes[2].endTriplet,true);assert.equal(notes[3].duration,1/2);
});

test('triplets include rests and chords while genuine dotted notes remain dotted',()=>{
  const score=scoreFor(note('C',8)+note('E',8,{chord:true})+'<note><rest/><duration>8</duration></note>'+note('G',8)+note('A',9,{type:'16th'})+note('B',9,{type:'16th'})+note('C',9,{type:'16th'})+'<note><rest/><duration>45</duration></note>');
  const notes=notationNotes(importedExcerpt(score,'right',1,1));
  assert.equal(notes.filter(n=>n.startTriplet).length,1);assert.equal(notes[0].pitches.length,2);assert.equal(notes[1].rest.type,'rest');assert.equal(notes[2].endTriplet,true);
  assert.ok(notes.slice(3,6).every(n=>n.duration===3/32),'real dotted sixteenths retain their written duration');
});

// 840 divisions per quarter express fifths, sixths, sevenths and thirds exactly.
const at840=bar=>parseMusicXML(`<score-partwise><part id="p"><measure number="1"><attributes><divisions>840</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>${bar}</measure></part></score-partwise>`,'Tuplets',DOMParser);
const notes840=(steps,d)=>steps.split('').map(s=>note(s,d)).join('');
const rest=d=>`<note><rest/><duration>${d}</duration></note>`;
test('quintuplets and septuplets engrave as sixteenths with their tuplet numbers',()=>{
  for(const [count,d,m] of [[5,168,4],[7,120,4]]){
    const score=at840(notes840('CDEFGAB'.slice(0,count),d)+rest(2520)),abc=importedExcerpt(score,'right',1,1),list=notationNotes(abc);
    assert.ok(abc.includes('('+count+':'+m+':'+count));assert.doesNotMatch(abc,/\/5|\/7/);
    assert.ok(list.slice(0,count).every(n=>n.duration===1/16));assert.equal(list[0].startTriplet,count);assert.equal(list[count-1].endTriplet,true);
    assert.ok(list[0].startBeam&&list[count-1].endBeam);
    const cues=makeCues(eventsFor(score,'right',1,1),'right',1,4);assert.equal(new Set(cues.map(c=>c.selector)).size,cues.length);
  }
});
test('unequal triplets: quarter plus eighth, and a rest before a note',()=>{
  for(const bar of [note('C',560,{type:'quarter'})+note('D',280),rest(280)+note('D',560,{type:'quarter'})]){
    const abc=importedExcerpt(at840(bar+rest(2520)),'right',1,1),list=notationNotes(abc);
    assert.match(abc,/\(3:2:2/);assert.deepEqual([...list.slice(0,2)].map(n=>n.duration).sort(),[1/8,1/4]);assert.equal(list[0].startTriplet,3);
  }
});
test('sextuplet sixteenths engrave as two sixteenth-note triplets',()=>{
  const list=notationNotes(importedExcerpt(at840(notes840('CDEFGA',140)+rest(2520)),'right',1,1));
  assert.equal(list.filter(n=>n.startTriplet===3).length,2);assert.ok(list.slice(0,6).every(n=>n.duration===1/16));
});
