import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {DOMParser} from 'linkedom';
import {loadRepertoire,mergeRepertoire} from '../repertoire.js';
import {parseMusicXML,importedExcerpt} from '../import-score.js';
import {scheduleFrom} from '../piano.js';
import {eventsFor} from '../engine.js';
const source=key=>fs.readFileSync(new URL('../repertoire/Red-River-Valley-'+key+'.musicxml',import.meta.url),'utf8');
const parse=key=>parseMusicXML(source(key),'Red River',DOMParser);
test('Red River preserves source melody, chromatic spelling, ties and the silent pickup',()=>{
 const s=parse('Bb'),doc=new DOMParser().parseFromString(source('Bb'),'application/xml');
 const rh=[...doc.querySelectorAll('note')].filter(n=>n.querySelector('staff')?.textContent==='1');
 assert.equal(rh.length,40);assert.equal(doc.querySelectorAll('beam').length,28);
 assert.equal(rh.filter(n=>n.querySelector('tie[type="start"]')).length,2);
 const left=s.voices.find(v=>v.id==='left').events.filter(e=>e.notes.length);
 assert.deepEqual(s.printedMeasures,['Pickup','1','2','3','4','5','6','7','8']);
 assert.deepEqual(left.map(e=>e.beat),[4,6,8,12,16,20,22,24,28,32]);
 assert.deepEqual(left.map(e=>e.duration),[2,2,4,4,4,2,2,4,4,3]);
 // Segmenting at melodic cuts does not add left-hand attacks.
 assert.deepEqual([...new Set(scheduleFrom(eventsFor(s,'left',1,9),0,36).map(e=>e.beat))],[4,6,8,12,16,20,22,24,28,32]);
 assert.deepEqual(left[6].notes,[46,50,53,56]);
 assert.equal(left[6].spellings.at(-1).step,'A');assert.equal(left[6].spellings.at(-1).alter,-1);
 const gb=s.voices[0].events.find(e=>e.notes.includes(66));assert.equal(gb.spellings[0].step,'G');assert.equal(gb.spellings[0].alter,-1);
 assert.deepEqual(left.at(-1).notes,[46,50,53]);
});
test('C-major version is a diatonic major second higher in every event',()=>{
 const a=parse('Bb'),b=parse('C');assert.ok(b.measureKeys.every(k=>k===0));
 a.voices.forEach((v,i)=>v.events.forEach((e,j)=>{const n=b.voices[i].events[j];assert.equal(e.beat,n.beat);assert.equal(e.duration,n.duration);assert.deepEqual(e.notes.map(p=>p+2),n.notes);}));
 assert.equal(b.voices[0].events.find(e=>e.notes.includes(68)).spellings[0].step,'A');
});
test('Roman chord labels engrave below the left hand without automatic accompaniment',()=>{
 const s=parse('Bb'),abc=importedExcerpt(s,'both',1,9);
 assert.deepEqual(s.chordLabels.left.map(e=>e.text),['I','I','I','I','V7','I','V7/IV','IV','V7','I']);
 assert.match(abc,/"_V7\/IV"/);assert.match(abc,/_G/);assert.match(abc,/_A/);
 const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(new URL('../vendor/abcjs-basic-min.js',import.meta.url),'utf8'),sandbox);
 const tune=sandbox.ABCJS.parseOnly(abc)[0];assert.ok(!tune.warnings?.length,JSON.stringify(tune.warnings));
 assert.equal(tune.lines.filter(l=>l.staff).flatMap(l=>l.staff[1].voices[0]).filter(n=>n.chord).length,10);
});
test('bundled repertoire shares import identities, merges without duplicates, and tolerates one failed file',async()=>{
 const fetcher=async url=>({ok:true,text:async()=>fs.readFileSync(url,'utf8')});
 const {entries,warnings}=await loadRepertoire(fetcher,DOMParser);assert.equal(entries.length,2);assert.equal(warnings.length,0);
 const saved=[{...entries[0],bundled:undefined},{id:'user',score:{title:'Own piece'}}];
 const merged=mergeRepertoire(saved,entries);assert.equal(merged.length,3);assert.equal(merged[0].bundled,true);assert.equal(merged[1].id,'user');
 const partial=await loadRepertoire(async url=>url.pathname.endsWith('-C.musicxml')?{ok:false,status:503}:fetcher(url),DOMParser);
 assert.equal(partial.entries.length,1);assert.equal(partial.warnings.length,1);
});
