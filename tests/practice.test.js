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

test('section size makes 1-, 2- and 4-measure passages with their own record keys',async()=>{
  const {recordKey}=await import('../practice.js');
  assert.deepEqual(makeSections(5,1).slice(0,5).map(s=>[s.start,s.end]),[[1,1],[2,2],[3,3],[4,4],[5,5]]);
  assert.equal(makeSections(5,1)[0].name,'Measure 1');
  assert.deepEqual(makeSections(10,4).slice(0,3).map(s=>[s.start,s.end]),[[1,4],[5,8],[9,10]]);
  assert.deepEqual(makeSections(10,4)[3],{...makeSections(10,4)[3],start:4,end:8});
  const s=freshState({sectionSize:4},makeSections(10,4),10);
  assert.equal(recordKey(s,1,'left'),'4/1:left');assert.equal(recordKey(freshState({},sections,12),1,'left'),'1:left');
  assert.equal(s.targets.learn,12);
  assert.equal(freshState({sectionSize:3},sections,12).sectionSize,2);
  for(const n of [1,4,9]){const parts=makeSections(n,4),st=freshState({sectionSize:4},parts,n);for(const phase of ['learn','mix','polish']){switchStage(st,phase);const next=chooseLesson(st,parts,n);assert.ok(parts[next.section]&&parts[next.section].end<=n);}}
});
test('interleaving strength chooses jumping, neighbouring or in-order passages on ties',()=>{
  const parts=makeSections(30),pick=interleave=>{const s=freshState({phase:'mix',interleave},parts,30);s.section=5;return chooseLesson(s,parts,30).section;};
  assert.equal(pick('jump'),12);assert.equal(pick('near'),4);assert.equal(pick('order'),6);
  assert.equal(freshState({interleave:'random'},parts,30).interleave,'jump');
});
test('learn order sets the starting hand and strict alternation always switches hands',()=>{
  const parts=makeSections(12);
  assert.equal(freshState({learnOrder:'right'},parts,12).hand,'right');assert.equal(freshState({},parts,12).hand,'left');
  const s=freshState({learnOrder:'alternate'},parts,12);
  s.records={'1:right':{attempts:9,clean:9},'2:right':{attempts:9,clean:9}};for(let i=3;i<6;i++)s.records[i+':right']={attempts:9,clean:9};s.records['0:right']={attempts:9,clean:9};
  s.hand='left';assert.equal(chooseLesson(s,parts,12).hand,'right','switches even though every right-hand passage is stronger');
  s.learnOrder='left';assert.equal(chooseLesson(s,parts,12).hand,'left');
});
test('tempo ladder and notes settings are validated',()=>{
  const s=freshState({tempoStep:7,autoSlow:false,notes:{'0:left':'x'.repeat(3000),'bad key':'y','1:both':42,'4/2:right':'Keep wrist loose'}},sections,12);
  assert.equal(s.tempoStep,5);assert.equal(s.autoSlow,false);
  assert.deepEqual(Object.keys(s.notes),['0:left','4/2:right']);assert.equal(s.notes['0:left'].length,2000);
  assert.equal(freshState({},sections,12).autoSlow,true);
});

test('flagged trouble spots come back sooner and flags are validated',async()=>{
  const parts=makeSections(30),s=freshState({phase:'mix',flags:[21,21,99,'x',0]},parts,30);
  assert.deepEqual(s.flags,[21]);
  s.section=5;assert.equal(chooseLesson(s,parts,30).section,10,'measure 21 is in passage 11');
  s.records['10:both']={attempts:1,clean:1};assert.notEqual(chooseLesson(s,parts,30).section,10,'one clean return outweighs the flag');
});
test('loop points cover both chosen notes in either order and fall back to the whole section',async()=>{
  const {nextLoopPoints,loopRange}=await import('../practice.js');
  let p=nextLoopPoints({},2,2.5);assert.deepEqual(loopRange(p,8),{a:2,b:8},'A alone loops to the end');
  p=nextLoopPoints(p,5,6);assert.deepEqual(loopRange(p,8),{a:2,b:6});
  assert.deepEqual(loopRange(nextLoopPoints(nextLoopPoints({},5,6),1,1.5),8),{a:1,b:6},'reverse order');
  assert.deepEqual(nextLoopPoints(p,3,4).b,null,'a third choice starts again');
  assert.deepEqual(loopRange({},8),{a:0,b:8});assert.deepEqual(loopRange({a:9,b:12},8),{a:0,b:8},'stale points are ignored');
});

test('own section names and goals and edited targets are validated',()=>{
  const s=freshState({sectionText:{'2/0':{name:'Opening','goal':'Count the rests'},'3/1':{name:'x',goal:''},'2/1':{name:5}},targetsEdited:'yes'},sections,12);
  assert.deepEqual(s.sectionText,{'2/0':{name:'Opening',goal:'Count the rests'}});assert.equal(s.targetsEdited,false);
  assert.equal(freshState({targetsEdited:true},sections,12).targetsEdited,true);
});
