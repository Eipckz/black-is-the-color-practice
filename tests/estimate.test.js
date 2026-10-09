import test from 'node:test';import assert from 'node:assert/strict';import {timingState,recordTimedRound,estimatePractice} from '../estimate.js';
const make=()=>({phase:'learn',rated:false,targets:{learn:5,mix:3,polish:2},stages:{learn:{completed:2},mix:{completed:0},polish:{completed:0}},practiceTiming:timingState()});
test('estimate waits for actual timed rounds and ignores untimed historic progress',()=>{const s=make();assert.equal(estimatePractice(s).ready,false);for(let i=0;i<3;i++){s.practiceTiming.roundSeconds=60;recordTimedRound(s.practiceTiming,2);}assert.equal(estimatePractice(s).seconds,480);s.practiceTiming.roundSeconds=20;assert.equal(estimatePractice(s).seconds,460);});
test('retries lengthen estimate, current timer cannot falsely finish the plan',()=>{const s=make();s.practiceTiming.samples=Array.from({length:3},()=>({seconds:60,rating:0}));assert.equal(estimatePractice(s).seconds,720);s.practiceTiming.roundSeconds=9000;assert.equal(estimatePractice(s).seconds,666);});
test('timing persists while timer always resumes paused and completed plans do not claim mastery',()=>{const t=timingState({activeSeconds:99,roundSeconds:20,running:true,samples:[{seconds:-1,rating:2}]});assert.equal(t.running,false);assert.equal(t.activeSeconds,99);assert.equal(t.samples.length,0);const s=make();for(const p of Object.keys(s.targets))s.stages[p].completed=s.targets[p];assert.deepEqual(estimatePractice(s),{ready:true,remaining:0});});
import {dailyState,addPractice,mergeDaily} from '../estimate.js';
test('daily practice totals accumulate per day, keep 60 days and merge backups by the larger total',()=>{
  const d=dailyState({goal:20,days:{'2026-10-08':60,bad:5,'2026-10-09':-1}});
  assert.deepEqual(d,{goal:20,days:{'2026-10-08':60}});
  addPractice(d,'2026-10-09',30);addPractice(d,'2026-10-09',15);assert.equal(d.days['2026-10-09'],45);
  for(let i=1;i<=70;i++)addPractice(d,'2027-01-'+String(i).padStart(2,'0'),1);
  assert.equal(Object.keys(d.days).length,60);assert.ok(!d.days['2026-10-08']);
  assert.deepEqual(mergeDaily({days:{'2026-10-09':10}},{goal:15,days:{'2026-10-09':40,'2026-10-10':5}}),{goal:15,days:{'2026-10-09':40,'2026-10-10':5}});
  assert.equal(dailyState({goal:9999}).goal,0);
});
