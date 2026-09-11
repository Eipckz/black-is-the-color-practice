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
