import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,makeSections,switchStage,rateRound,rememberStage,chooseLesson} from '../practice.js';
const sections=makeSections(12);
test('stage navigation preserves independent counters and positions',()=>{const s=freshState({},sections,12);s.section=3;s.hand='right';assert.ok(rateRound(s));assert.equal(rateRound(s),false);switchStage(s,'mix');assert.equal(s.completed,0);s.section=4;rateRound(s);switchStage(s,'learn');assert.equal(s.completed,1);assert.equal(s.section,3);assert.equal(s.hand,'right');assert.equal(s.rated,true);switchStage(s,'mix');assert.equal(s.section,4);});
test('legacy records survive without treating navigation as completed rounds',()=>{const s=freshState({round:99,phase:'polish',section:2,records:{'1:left':{attempts:2,clean:1}}},sections,12);assert.equal(s.completed,0);assert.equal(s.section,2);assert.equal(s.records['1:left'].attempts,2);});
test('targets never cap rounds and reload retains rated state',()=>{const s=freshState({targets:{learn:1}},sections,12);for(let i=0;i<3;i++){s.rated=false;rateRound(s);}rememberStage(s);const loaded=freshState(JSON.parse(JSON.stringify(s)),sections,12);assert.equal(loaded.completed,3);assert.equal(loaded.rated,true);assert.equal(loaded.targets.learn,1);});
test('small and large scores have valid lessons and full ranges',()=>{for(const n of [1,3,12,25]){const parts=makeSections(n),s=freshState({},parts,n);for(const phase of ['learn','mix','polish','perform']){switchStage(s,phase);const next=chooseLesson(s,parts,n);assert.ok(parts[next.section]);assert.ok(parts[next.section].end<=n);if(phase==='perform')assert.deepEqual([parts[next.section].start,parts[next.section].end],[1,n]);}}});

test('a fresh 30-measure import interleaves passages in separate-hands and hands-together practice',()=>{
  const parts=makeSections(30);
  for(const phase of ['learn','mix']){
    const s=freshState({phase},parts,30),visited=[];
    for(let i=0;i<6;i++){
      visited.push(s.section);
      s.records[s.section+':'+s.hand]={attempts:1,clean:1};
      const next=chooseLesson(s,parts,30);
      assert.notEqual(next.section,s.section,'switch passages before returning');
      assert.ok(Math.abs(next.section-s.section)>1,'equal-priority passages should jump across the piece');
      Object.assign(s,next);
    }
    assert.equal(new Set(visited).size,visited.length);
  }
});

test('interleaving still prioritizes weaker material and eventually covers every hand and passage',()=>{
  const parts=makeSections(30),s=freshState({},parts,30),visited=new Set();
  for(let i=0;i<60;i++){
    const key=s.section+':'+s.hand;
    visited.add(key);
    const record=s.records[key]||{attempts:0,clean:0};
    record.attempts++;record.clean++;s.records[key]=record;
    Object.assign(s,chooseLesson(s,parts,30));
  }
  assert.equal(visited.size,30);
  s.section=0;s.hand='left';
  for(const record of Object.values(s.records)){record.clean=3;record.attempts=3;}
  s.records['1:right']={attempts:3,clean:0};
  assert.deepEqual(chooseLesson(s,parts,30),{section:1,hand:'right'});
});

test('a single passage alternates hands and single-hand practice remains usable',()=>{
  const parts=makeSections(1),s=freshState({},parts,1);
  assert.deepEqual(chooseLesson(s,parts,1),{section:0,hand:'right'});
  switchStage(s,'mix');
  assert.deepEqual(chooseLesson(s,parts,1),{section:0,hand:'both'});
});
