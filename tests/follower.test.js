import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCues,cueState,stepBeat} from '../follower.js';
import {score} from '../score-data.js';
import {eventsFor} from '../engine.js';
const cues=makeCues(eventsFor(score,'both',1,12),'both',1);
test('held bass stays active while right-hand notes change',()=>{
 const a=cueState(cues,.5),b=cueState(cues,1);
 assert.deepEqual(a.current.find(e=>e.voice==='left').notes,[40]);
 assert.equal(a.current.find(e=>e.voice==='left'),b.current.find(e=>e.voice==='left'));
 assert.deepEqual(b.current.find(e=>e.voice==='right').notes,[55,59]);
 assert.equal(b.current.length,2);
});
test('rest boundaries highlight silence instead of the previous chord',()=>{
 const at=cueState(cues,19);assert.ok(at.current.every(e=>!e.notes.length));
 assert.equal(cueState(cues,48).current.length,0);assert.equal(cueState(cues,48).next.length,0);
});
test('next preview groups simultaneous entries and stepping respects eighth notes',()=>{
 assert.equal(stepBeat(cues,0,1),.5);assert.equal(stepBeat(cues,.5,-1),0);
 assert.equal(stepBeat(cues,48,1),46);assert.equal(stepBeat(cues,0,-1),0);
 assert.ok(cueState(cues,3.5).next.every(e=>e.beat===4));
});
test('selectors remain unique for every hand and excerpt start',()=>{
 for(const hand of ['left','right','both'])for(let start=1;start<=12;start++){
 const c=makeCues(eventsFor(score,hand,start,12),hand,start);
 assert.equal(new Set(c.map(e=>e.selector)).size,c.length);
 assert.ok(c[0].selector.includes('.abcjs-mm0.'));
 if(hand!=='both')assert.ok(c.every(e=>e.selector.startsWith('.abcjs-v0.')));
 }
});

test('altered noteheads separate key-signature alterations from accidentals',async()=>{
 const {alteredNoteHeads}=await import('../follower.js');
 const sp=(step,octave,alter)=>({step,octave,alter});
 assert.deepEqual(alteredNoteHeads({notes:[54],spellings:[sp('F',3,1)]},1),[{name:'F,',alter:1,kind:'key',label:'F sharp 3 (key signature)'}],'E minor F sharp');
 assert.equal(alteredNoteHeads({notes:[51],spellings:[sp('D',3,1)]},1)[0].kind,'chromatic','D sharp in E minor');
 assert.deepEqual(alteredNoteHeads({notes:[53],spellings:[sp('F',3,0)]},1).map(p=>[p.kind,p.label]),[['chromatic','F natural 3 (accidental)']],'F natural in G major');
 assert.deepEqual(alteredNoteHeads({notes:[48],spellings:[sp('C',3,0)]},0),[],'C natural in C major');
 assert.deepEqual(alteredNoteHeads({notes:[50,53,58],spellings:[sp('D',3,0),sp('F',3,0),sp('B',3,-1)]},-1).map(p=>p.kind),['key']);
 assert.equal(alteredNoteHeads({notes:[54]},1)[0].kind,'key','unspelled built-in F sharp in E minor');
 assert.equal(alteredNoteHeads({notes:[51]},1)[0].name,'D,','unspelled notes use sharps in sharp keys');
 assert.deepEqual(alteredNoteHeads({notes:[]}),[]);
});
test('an imported key change applies from its measure',async()=>{
 const {alteredNoteHeads}=await import('../follower.js');const {parseMusicXML}=await import('../import-score.js');const {DOMParser}=await import('linkedom');
 const n=(step,alter)=>`<note><pitch><step>${step}</step><alter>${alter}</alter><octave>4</octave></pitch><duration>4</duration></note>`;
 const s=parseMusicXML(`<score-partwise><part id="p"><measure><attributes><divisions>1</divisions><key><fifths>-1</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time></attributes>${n('B',-1)}</measure><measure><attributes><key><fifths>0</fifths></key></attributes>${n('B',-1)}</measure></part></score-partwise>`,'k',DOMParser);
 const [first,second]=s.voices[0].events.filter(e=>e.notes.length);
 assert.equal(alteredNoteHeads(first,s.measureKeys[0])[0].kind,'key');assert.equal(alteredNoteHeads(second,s.measureKeys[1])[0].kind,'chromatic');
});
test('note names follow the written spelling in letters or fixed do',async()=>{
 const {spelledNotes,noteLabel}=await import('../follower.js');
 const [fs]=spelledNotes({notes:[54],spellings:[{step:'F',octave:3,alter:1}]},1);assert.equal(noteLabel(fs),'F♯');assert.equal(noteLabel(fs,'solfege'),'Fa♯');
 assert.equal(noteLabel(spelledNotes({notes:[54]},-2)[0]),'G♭','unspelled notes in flat keys use flats');
 assert.equal(noteLabel(spelledNotes({notes:[54]},1)[0]),'F♯');
 assert.deepEqual(spelledNotes({notes:[48,67]},0).map(p=>p.name),['C,','G']);
});
