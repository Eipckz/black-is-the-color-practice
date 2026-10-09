import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {DOMParser} from 'linkedom';
import {parseMusicXML,importedExcerpt} from '../import-score.js';
import {eventsFor,measureStarts,measureAt} from '../engine.js';
import {makeCues} from '../follower.js';
import {scheduleFrom} from '../piano.js';
import {score as builtin} from '../score-data.js';

const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../vendor/abcjs-basic-min.js',import.meta.url),'utf8'),sandbox);
const xml=fs.readFileSync(new URL('./fixtures/changing-meters.musicxml',import.meta.url),'utf8');
const parse=source=>parseMusicXML(source,'meters.musicxml',DOMParser);

test('changing meters keep each measure its own length and start',()=>{
  const s=parse(xml);
  assert.deepEqual(s.meters,['4/4','3/4','6/8','2/4']);
  assert.deepEqual(s.measureStarts,[0,4,7,10,12]);
  assert.deepEqual(measureStarts(builtin).slice(0,3),[0,4,8],'uniform scores derive their starts');
  assert.equal(measureAt(s.measureStarts,6.5),2);assert.equal(measureAt(s.measureStarts,7),3);assert.equal(measureAt(s.measureStarts,99),4);
  for(const [m,length] of [[1,4],[2,3],[3,3],[4,2]]){
    const right=eventsFor(s,'right',m,m),left=eventsFor(s,'left',m,m);
    assert.equal(right.reduce((n,e)=>n+e.duration,0),length);assert.equal(left.reduce((n,e)=>n+e.duration,0),length);
    assert.equal(right[0].beat,s.measureStarts[m-1]);
  }
  assert.equal(scheduleFrom(eventsFor(s,'both',1,4),0,12).filter(e=>e.voice==='right').length,15);
});
test('notation states each new meter and beams compound eighths in threes',()=>{
  const s=parse(xml),abc=importedExcerpt(s,'both',1,4);
  assert.match(abc,/\nM:4\/4\n/);for(const m of ['3/4','6/8','2/4'])assert.equal(abc.split('[M:'+m+']').length,3,'each staff marks '+m);
  assert.match(importedExcerpt(s,'right',2,3),/\nM:3\/4\n/);
  const tune=sandbox.ABCJS.parseOnly(abc)[0],notes=tune.lines.flatMap(l=>l.staff?.[0]?.voices[0]||[]).filter(n=>n.el_type==='note');
  assert.equal(notes.length,15);
  const compound=notes.slice(7,13);assert.ok(compound[0].startBeam&&compound[2].endBeam&&compound[3].startBeam&&compound[5].endBeam);
});
test('cues follow measure starts across meter changes',()=>{
  const s=parse(xml);
  for(const [start,end] of [[1,4],[2,4],[3,4]])for(const hand of ['right','both']){
    const cues=makeCues(eventsFor(s,hand,start,end),hand,start,s.measureStarts);
    assert.equal(new Set(cues.map(c=>c.selector)).size,cues.length);
    const first6=cues.find(c=>c.voice==='right'&&c.beat===7);assert.ok(first6.selector.includes('.abcjs-mm'+(3-start)+'.abcjs-n0'));
  }
});
test('a pickup before a meter change ends on the first barline',()=>{
  const pickup=xml.replace('<measure number="1">','<measure number="0"><attributes><divisions>2</divisions><time><beats>3</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="2"><sign>F</sign><line>4</line></clef></attributes><note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><staff>1</staff></note></measure><measure number="1">');
  const s=parse(pickup);
  assert.deepEqual(s.measureStarts.slice(0,3),[0,3,7]);assert.equal(eventsFor(s,'right',1,1).find(e=>e.notes.length).beat,2);
});
