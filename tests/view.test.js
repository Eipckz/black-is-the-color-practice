import test from 'node:test';
import assert from 'node:assert/strict';
import {renderWindow,contextMeasures,lineBars} from '../view.js';
import {makeCues} from '../follower.js';
import {score} from '../score-data.js';
import {eventsFor} from '../engine.js';

test('section view shows exactly the section',()=>{
  assert.deepEqual(renderWindow(30,{start:9,end:10},{scoreView:'section',pageMeasures:8}),{start:9,end:10});
});
test('page view shows the page containing the section',()=>{
  assert.deepEqual(renderWindow(30,{start:9,end:10},{scoreView:'page',pageMeasures:8}),{start:9,end:16});
  assert.deepEqual(renderWindow(30,{start:29,end:30},{scoreView:'page',pageMeasures:8}),{start:25,end:30});
  assert.deepEqual(renderWindow(30,{start:5,end:6},{scoreView:'page',pageMeasures:4}),{start:5,end:8});
});
test('a joining section extends its page instead of splitting',()=>{
  assert.deepEqual(renderWindow(30,{start:8,end:9},{scoreView:'page',pageMeasures:8}),{start:1,end:9});
});
test('piece view shows every measure and short pieces never overflow',()=>{
  assert.deepEqual(renderWindow(30,{start:3,end:4},{scoreView:'piece'}),{start:1,end:30});
  assert.deepEqual(renderWindow(3,{start:1,end:2},{scoreView:'page',pageMeasures:16}),{start:1,end:3});
});
test('context measures are the window outside the section',()=>{
  assert.deepEqual(contextMeasures({start:1,end:8},{start:3,end:4}),[1,2,5,6,7,8]);
  assert.deepEqual(contextMeasures({start:3,end:4},{start:3,end:4}),[]);
});
test('automatic measures per line follow the screen width',()=>{
  assert.equal(lineBars('auto',1200),4);assert.equal(lineBars('auto',900),2);assert.equal(lineBars('auto',390),1);assert.equal(lineBars(2,1200),2);
});
test('window cues stay unique and place the section at its window offset',()=>{
  for(const hand of ['left','right','both']){
    const win=renderWindow(12,{start:3,end:4},{scoreView:'page',pageMeasures:8}),cues=makeCues(eventsFor(score,hand,win.start,win.end),hand,win.start);
    assert.equal(new Set(cues.map(c=>c.selector)).size,cues.length);
    assert.ok(cues.find(c=>c.beat===8).selector.includes('.abcjs-mm2.'));
  }
});
