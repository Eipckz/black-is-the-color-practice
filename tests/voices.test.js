import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {DOMParser} from 'linkedom';
import {parseMusicXML,importedExcerpt,excerptVoices} from '../import-score.js';
import {eventsFor,voiceEventsFor} from '../engine.js';
import {makeCues} from '../follower.js';
import {scheduleFrom} from '../piano.js';

const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../vendor/abcjs-basic-min.js',import.meta.url),'utf8'),sandbox);
const n=(step,octave,duration,voice,staff=1,chord=false)=>`<note>${chord?'<chord/>':''}<pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${duration}</duration><voice>${voice}</voice><staff>${staff}</staff></note>`;
const back=d=>`<backup><duration>${d}</duration></backup>`;
// Right hand: voice 1 half notes, voice 2 quarters (absent in bar 2); left hand: one voice.
const xml=`<score-partwise><part id="p"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="2"><sign>F</sign><line>4</line></clef></attributes>${n('E',5,2,'1')+n('G',5,2,'1',1,true)+n('F',5,2,'1')}${back(4)}${n('C',5,1,'2')+n('D',5,1,'2')+n('C',5,1,'2')+n('B',4,1,'2')}${back(4)}${n('C',3,4,'5',2)}</measure><measure number="2">${n('E',5,4,'1')}${back(4)}${n('C',3,4,'5',2)}</measure></part></score-partwise>`;
const s=parseMusicXML(xml,'Voices',DOMParser);

test('voices are kept apart for engraving while playback stays merged',()=>{
  assert.deepEqual(s.voiceParts.right.map(p=>p.voice),['1','2']);assert.equal(s.voiceParts.left,undefined,'single-voice staves are not split');
  assert.deepEqual(s.voiceParts.right[0].events.map(e=>e.notes),[[76,79],[77],[76]]);
  assert.deepEqual(s.voiceParts.right[1].events.map(e=>e.notes),[[72],[74],[72],[71],[]]);
  assert.equal(scheduleFrom(eventsFor(s,'right',1,2),0,8).length,8,'merged playback still sounds each written note once');
  assert.deepEqual(excerptVoices(s,'both',true).map(v=>v.key),['right1','right2','left']);assert.deepEqual(excerptVoices(s,'both').map(v=>v.key),['right','left']);
});
test('separate voices engrave on one staff with stems up and down, and every cue is unique and present',()=>{
  for(const hand of ['right','both']){
    const abc=importedExcerpt(s,hand,1,2,false,{separate:true}),tune=sandbox.ABCJS.parseOnly(abc)[0];
    assert.match(abc,/V:right1 clef=treble name="RH" stem=up/);assert.match(abc,/V:right2 clef=treble stem=down/);assert.match(abc,hand==='both'?/%%score \{ \(right1 right2\) left \}/:/%%score \(right1 right2\)/);
    assert.match(abc,/\[V:right2\][^\n]*x4\/1/,'the absent lower voice has an invisible rest');
    assert.equal(tune.lines[0].staff.length,hand==='both'?2:1);assert.equal(tune.lines[0].staff[0].voices.length,2);
    const cues=makeCues(voiceEventsFor(s,hand,1,2),hand,1,4);
    assert.equal(new Set(cues.map(c=>c.selector)).size,cues.length);
    const visible=cues.filter(c=>!c.hidden);assert.equal(visible.length,cues.length-1);
    assert.ok(visible.some(c=>c.selector==='.abcjs-v1.abcjs-mm0.abcjs-n3'),'lower voice notes use abcjs voice 1');
    if(hand==='both')assert.ok(visible.some(c=>c.selector==='.abcjs-v2.abcjs-mm1.abcjs-n0'),'left hand is abcjs voice 2');
    // every visible cue matches an abcjs note element in the parsed tune
    const voices=tune.lines.flatMap(l=>l.staff.flatMap(st=>st.voices));
    for(const c of visible){const [,v,m,i]=c.selector.match(/v(\d+)\.abcjs-mm(\d+)\.abcjs-n(\d+)/).map(Number);const bars=[];let bar=[];for(const el of voices[v]){if(el.el_type==='bar'){bars.push(bar);bar=[];}else if(el.el_type==='note')bar.push(el);}assert.ok(bars[m]?.[i]&&!bars[m][i].rest?.type?.includes('invisible'),c.selector);}
  }
});
