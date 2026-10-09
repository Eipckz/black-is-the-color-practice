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
const parseAbc=abc=>sandbox.ABCJS.parseOnly(abc)[0];
const notes=(abc,staff=0)=>parseAbc(abc).lines.flatMap(l=>l.staff?.[staff]?.voices[0]||[]).filter(n=>n.el_type==='note');
const score=(measures,{staves=1}={})=>parseMusicXML(`<score-partwise><part id="p">${measures.map((m,i)=>`<measure number="${i+1}">${i?'':`<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>${staves===2?'<staves>2</staves><clef number="2"><sign>F</sign><line>4</line></clef>':''}</attributes>`}${m}</measure>`).join('')}</part></score-partwise>`,'Expression',DOMParser);
const n=(step,extra='',staff=1)=>`<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>1</duration><staff>${staff}</staff><notations>${extra}</notations></note>`;
const dir=(inner,staff=1)=>`<direction><direction-type>${inner}</direction-type><staff>${staff}</staff></direction>`;

test('dynamics, hairpins, articulations, slurs and pedal marks engrave without extra notes',()=>{
  const s=score([dir('<dynamics><mf/></dynamics>')+dir('<wedge type="crescendo"/>')+n('C','<slur type="start"/><articulations><staccato/></articulations>')+n('D','<articulations><accent/></articulations>')+dir('<wedge type="stop"/>')+n('E','<articulations><tenuto/></articulations>')+dir('<pedal type="start"/>')+n('F','<slur type="stop"/><fermata/>'),
    dir('<dynamics><sf/></dynamics>')+dir('<pedal type="stop"/>')+n('G')+'<note><rest/><duration>3</duration></note>']);
  const plain=importedExcerpt(s,'right',1,2),abc=importedExcerpt(s,'right',1,2,false,{expression:true});
  assert.doesNotMatch(plain,/!mf!|\(C|Ped/,'off by default');
  for(const mark of ['!mf!','!<(!','!<)!','.C','!>!D','!tenuto!E','"_Ped."','!fermata!F','"_*"','!sfz!'])assert.ok(abc.includes(mark),mark);
  assert.match(abc,/\(!<\(!|!<\(!\(/,'the slur opens on the first note');assert.match(abc,/F1\/1\)/,'and closes after the last');
  const withMarks=notes(abc),without=notes(plain);
  assert.equal(withMarks.length,without.length,'one abcjs note element per event either way');
  assert.deepEqual([...withMarks[0].decoration],['mf','crescendo(','staccato']);
  assert.ok(!parseAbc(abc).warnings?.length,JSON.stringify(parseAbc(abc).warnings));
  const cues=makeCues(eventsFor(s,'right',1,2),'right',1,4);assert.equal(new Set(cues.map(c=>c.selector)).size,cues.length);
});
test('a pickup shifts its marks with its notes and unknown dynamics are dropped',()=>{
  const s=score([dir('<dynamics><p/></dynamics>')+n('C'),dir('<dynamics><other-dynamics>pocof</other-dynamics></dynamics>')+n('D')+n('E')+n('F')+n('G')]);
  assert.deepEqual(s.expressions.right,[{beat:3,dynamic:'p'}]);
});
test('repeats and endings are written out with printed bar numbers',()=>{
  const bar=(m,lines='')=>lines+n(m)+'<note><rest/><duration>3</duration></note>';
  const s=score([bar('C','<barline location="left"><repeat direction="forward"/></barline>'),bar('D'),bar('E','<barline location="left"><ending number="1" type="start"/></barline><barline location="right"><ending number="1" type="stop"/><repeat direction="backward"/></barline>'),bar('F','<barline location="left"><ending number="2" type="start"/></barline><barline location="right"><ending number="2" type="discontinue"/></barline>'),bar('G')]);
  assert.equal(s.measures,7);assert.deepEqual(s.printedMeasures,['1','2','3','1 (2nd time)','2 (2nd time)','4','5']);
  assert.deepEqual(s.voices[0].events.filter(e=>e.notes.length).map(e=>e.notes[0]),[60,62,64,60,62,65,67]);
  assert.ok(s.warnings.some(w=>/written out/.test(w)));
});
test('a backward repeat without a forward one returns to the start, and times repeats more than twice',()=>{
  const bar=(m,lines='')=>lines+n(m)+'<note><rest/><duration>3</duration></note>';
  assert.equal(score([bar('C'),bar('D','<barline location="right"><repeat direction="backward"/></barline>'),bar('E')]).measures,5);
  const three=score([bar('C','<barline location="left"><repeat direction="forward"/></barline>'),bar('D','<barline location="right"><repeat direction="backward" times="3"/></barline>')]);
  assert.deepEqual(three.printedMeasures,['1','2','1 (2nd time)','2 (2nd time)','1 (3rd time)','2 (3rd time)']);
  assert.equal(score([bar('C'),bar('D')]).printedMeasures,undefined,'no repeats, no labels');
});
