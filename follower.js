// Map the written accompaniment to abcjs voice/measure/note groups.
export function makeCues(events, hand, start){
 const voices=hand==='both'?['right','left']:[hand], counters=new Map();
 return events.filter(e=>voices.includes(e.voice)).map(e=>{
  const measure=Math.floor(e.beat/4)-(start-1),voice=voices.indexOf(e.voice),key=voice+':'+measure,index=counters.get(key)||0;counters.set(key,index+1);
  return {...e,selector:'.abcjs-v'+voice+'.abcjs-mm'+measure+'.abcjs-n'+index};
 });
}
export function cueState(cues,beat){
 const current=cues.filter(e=>e.beat<=beat+1e-7&&beat<e.beat+e.duration-1e-7);
 const upcoming=cues.filter(e=>e.beat>beat+1e-7),nextBeat=upcoming.length?Math.min(...upcoming.map(e=>e.beat)):null;
 return {current,next:upcoming.filter(e=>e.beat===nextBeat)};
}
export function stepBeat(cues,beat,direction){
 const beats=[...new Set(cues.map(e=>e.beat))].sort((a,b)=>a-b);
 return direction>0?(beats.find(b=>b>beat+1e-6)??beats.at(-1)):(beats.findLast(b=>b<beat-1e-6)??beats[0]);
}
