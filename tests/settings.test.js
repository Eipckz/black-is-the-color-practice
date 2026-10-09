import test from 'node:test';
import assert from 'node:assert/strict';
import {settings,settingByKey,defaults,validate,presets,matchingPreset,groups,actions,validKeys} from '../settings.js';
import {freshState,makeSections} from '../practice.js';

test('every setting has a default that validates to itself and a known group',()=>{
  const groupIds=groups.map(g=>g[0]);
  for(const s of settings){
    assert.deepEqual(validate(s.key,s.default),s.default,s.key);
    assert.ok(s.group===null||groupIds.includes(s.group),s.key);
    assert.ok(['piece','device'].includes(s.scope),s.key);
  }
  assert.equal(new Set(settings.map(s=>s.key)).size,settings.length,'keys are unique');
  assert.deepEqual(Object.keys(defaults('device')).sort(),settings.filter(s=>s.scope==='device').map(s=>s.key).sort());
});
test('validate rejects wrong types and unknown options, clamps numbers and migrates old values',()=>{
  assert.equal(validate('scoreView','gallery'),'piece');assert.equal(validate('scoreView','page'),'around');
  assert.equal(validate('pageMeasures','12'),12,'select values keep their option type');assert.equal(validate('pageMeasures',7),8);
  assert.equal(validate('barsPerLine','auto'),'auto');assert.equal(validate('barsPerLine','4'),4);assert.equal(validate('barsPerLine',''),'auto');
  assert.equal(validate('outlineNext','yes'),false);assert.equal(validate('followSection',false),false);
  assert.equal(validate('rhColor','red'),'#b94c22');assert.equal(validate('rhColor','#ABCDEF'),'#abcdef');
  assert.equal(validate('contextDim','x'),65);assert.equal(validate('contextDim',200),90);assert.equal(validate('tempo',12),30);assert.equal(validate('dailyGoal','25'),25);
  assert.equal(validate('nonexistent',1),undefined);
  assert.equal(validate('countBars',null,2),2,'a fallback replaces the default');
});
test('presets reference only existing settings with valid values and are recognised',()=>{
  for(const preset of Object.values(presets))for(const [key,value] of Object.entries(preset.values)){assert.ok(settingByKey[key],key);assert.equal(validate(key,value),value,key);}
  const values={...defaults('piece'),...defaults('device'),...presets.beginner.values};
  assert.equal(matchingPreset(k=>values[k]),'beginner');values.contextDim=50;assert.equal(matchingPreset(k=>values[k]),'custom');
  const advanced={...presets.advanced.values,sectionSize:2};assert.equal(matchingPreset(k=>advanced[k],true),'advanced','fixed sections ignore size');
});
test('freshState is unchanged by the schema refactor and uses applied piece defaults for unset keys',()=>{
  const sections=makeSections(12);
  // Every value from before the refactor is unchanged; settings added later only add keys.
  const now=JSON.parse(JSON.stringify(freshState({},sections,12)));
  for(const [key,value] of Object.entries({"tempo":50,"volume":75,"leftVolume":70,"rightVolume":80,"countBars":1,"metronomeSub":"beat","scoreSize":"standard","customStart":1,"customEnd":2,"highlightMode":"notes","outlineNext":false,"scoreView":"piece","pageMeasures":8,"followSection":true,"scoreHeight":"auto","barsPerLine":"auto","contextDim":65,"showCueGuide":true,"autoFollow":true,"sectionSize":2,"learnOrder":"left","interleave":"jump","tempoStep":5,"autoSlow":true,"records":{},"phase":"learn","stages":{"learn":{"completed":0,"section":0,"hand":"left","rated":false},"mix":{"completed":0,"section":0,"hand":"both","rated":false},"polish":{"completed":0,"section":0,"hand":"both","rated":false},"perform":{"completed":0,"section":11,"hand":"both","rated":false}},"targets":{"learn":24,"mix":12,"polish":24},"notes":{},"completed":0,"section":0,"hand":"left","rated":false}))assert.deepEqual(now[key],value,key);
  const s=freshState({contextDim:30},sections,12,{contextDim:80,highlightMode:'measure',scoreView:'nonsense'});
  assert.equal(s.contextDim,30,'stored values win');assert.equal(s.highlightMode,'measure');assert.equal(s.scoreView,'piece');
});
test('shortcut keys fall back to defaults for every action',()=>{
  const keys=validKeys({playPause:'KeyP',nextRound:'not a key!',extra:'KeyQ'});
  assert.equal(keys.playPause,'KeyP');assert.equal(keys.nextRound,'KeyN');assert.equal(Object.keys(keys).length,actions.length);
  assert.equal(validKeys(null).openSettings,'Comma');
});
