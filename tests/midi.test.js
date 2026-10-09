import test from 'node:test';import assert from 'node:assert/strict';
import {MidiKeys,midiTargets,matchesTarget,MidiConnection,RhythmCheck,timingWindow} from '../midi.js';
import {score} from '../score-data.js';import {eventsFor} from '../engine.js';
test('note on, velocity-zero note off, channel filtering and sustain independence',()=>{const k=new MidiKeys();k.read([144,40,90]);k.read([145,40,70]);k.read([144,40,0]);assert.deepEqual(k.notes(),[40]);k.read([177,64,127]);k.read([129,40,64]);assert.deepEqual(k.notes(),[]);k.read([145,52,90],'0');assert.deepEqual(k.notes(),[]);k.read([144,52,90]);k.read([176,123,0]);assert.deepEqual(k.notes(),[]);});
test('wait targets preserve held bass and require fresh repeated attacks',()=>{const targets=midiTargets(eventsFor(score,'both',1,2));assert.deepEqual(targets[1].notes,[40,52]);assert.deepEqual(targets[1].attacks,[52]);assert.ok(matchesTarget(targets[1],[40,52],new Set([52])));assert.ok(!matchesTarget(targets[1],[40,52],new Set()));assert.ok(!matchesTarget(targets[1],[40,52,60],new Set([52])));});
test('rhythm check accepts moderate jitter and distinguishes errors',()=>{const r=new RhythmCheck([{beat:0,notes:[40,52]},{beat:2,notes:[40]},{beat:4,notes:[35]}],60,'balanced');assert.equal(r.hit(40,.1).kind,'on time');assert.equal(r.hit(52,-.1).kind,'on time');assert.equal(r.hit(40,2.4).kind,'late');r.hit(60,4);const s=r.summary();assert.deepEqual(s,{expected:4,onTime:2,early:0,late:1,missed:1,wrong:1,extra:0});});
test('full score ideal MIDI performance has no misses or extra ending attacks',()=>{for(const hand of ['left','right','both']){const e=eventsFor(score,hand,1,12),r=new RhythmCheck(e,50,'balanced');for(const event of e)for(const n of event.notes)r.hit(n,event.beat*1.2);const summary=r.summary();assert.equal(summary.missed,0);assert.equal(summary.onTime,summary.expected);assert.equal(summary.wrong,0);}});
test('timing tolerance is ordered and bounded',()=>{for(const bpm of [30,50,90]){assert.ok(timingWindow(bpm,'tighter')<=timingWindow(bpm));assert.ok(timingWindow(bpm)<=timingWindow(bpm,'relaxed'));assert.ok(timingWindow(bpm)<=.3);}assert.equal(timingWindow(60),.25);});
test('MIDI connection binds input only, handles unplugging, and closes cleanly',async()=>{let lost=0,messages=0,options;const input={id:'casio',name:'CASIO USB-MIDI',state:'connected',open:async()=>{},close:async()=>{}};const access={inputs:new Map([['casio',input]])};const c=new MidiConnection({onPorts:()=>{},onMessage:()=>messages++,onLost:()=>lost++});await c.connect(async o=>{options=o;return access;});assert.equal(options.sysex,false);await c.select('casio');input.onmidimessage({data:[144,40,80]});assert.equal(messages,1);input.state='disconnected';access.onstatechange();assert.equal(c.input,null);assert.equal(input.onmidimessage,null);assert.ok(lost>=2);c.disconnect();assert.equal(access.onstatechange,null);});
test('disconnect while permission is pending does not reconnect',async()=>{let resolve;const c=new MidiConnection({onPorts:()=>{},onMessage:()=>{},onLost:()=>{}});const pending=c.connect(()=>new Promise(r=>resolve=r));c.disconnect();resolve({inputs:new Map()});await pending;assert.equal(c.access,null);});
test('timed check ignores attacks made during the count-in',()=>{
 const r=new RhythmCheck([{beat:4,notes:[40]},{beat:5,notes:[43]}],60,'balanced');
 assert.equal(r.hit(40,1).kind,'ignored');assert.equal(r.hit(40,3.5).kind,'ignored');
 assert.equal(r.hit(40,3.9).kind,'on time');assert.deepEqual([r.summary().extra,r.summary().wrong],[0,0]);
});
test('the virtual input is listed first, works without Web MIDI, and round-trips through MidiKeys',async()=>{
 const {VirtualMidiInput}=await import('../midi.js');
 const keys=new MidiKeys();let ports=[],lost=[];
 const c=new MidiConnection({onPorts:p=>ports=p,onMessage:data=>keys.read(data),onLost:silent=>lost.push(silent)});
 await c.connect(null);assert.deepEqual(ports.map(p=>p.id),['virtual']);assert.ok(c.virtual instanceof VirtualMidiInput);
 await c.select('virtual',true);assert.equal(c.input,c.virtual);assert.deepEqual(lost,[true],'a chosen switch is silent');
 c.virtual.send([144,40,100]);c.virtual.send([144,52,100]);assert.deepEqual(keys.notes(),[40,52]);
 c.virtual.send([128,40,0]);assert.deepEqual(keys.notes(),[52]);
 const input={id:'casio',name:'CASIO USB-MIDI',state:'connected',open:async()=>{},close:async()=>{}};
 await c.connect(async()=>({inputs:new Map([['casio',input]])}));assert.deepEqual(ports.map(p=>p.id),['virtual','casio']);
 c.disconnect();assert.equal(lost.at(-1),undefined);
});
test('pitchless taps score each note start once, including chords',()=>{
 const events=[{beat:0,notes:[40,52]},{beat:1,notes:[43]},{beat:1,notes:[55]},{beat:2,notes:[]},{beat:3,notes:[45]}];
 const r=new RhythmCheck(events,60,'balanced',{pitchless:true});assert.equal(r.expected.length,3);
 assert.equal(r.hit(null,-2).kind,'ignored');assert.equal(r.hit(null,.05).kind,'on time');assert.equal(r.hit(null,.1).kind,'extra','a second tap on the same chord is extra');
 assert.equal(r.hit(null,1.4).kind,'late');const s=r.summary();assert.deepEqual([s.onTime,s.late,s.missed,s.extra,s.wrong],[1,1,1,1,0]);
});
test('timed check results group by measure, including wrong and extra attacks',()=>{
 const r=new RhythmCheck([{beat:0,notes:[40]},{beat:2,notes:[43]},{beat:4,notes:[45]},{beat:6,notes:[47]}],60,'balanced');
 r.hit(40,.05);r.hit(43,2.5);r.hit(50,4.02);r.hit(40,5.3);
 const m=r.measureResults(beat=>Math.floor(beat/4)+1);
 assert.deepEqual(m.get(1),{onTime:1,early:0,late:1,missed:0,wrong:0,n:2});assert.deepEqual(m.get(2),{onTime:0,early:0,late:0,missed:2,wrong:2,n:2});
});
