import {defaults,validate} from './settings.js?v=4';
export const phases = ['learn', 'mix', 'polish', 'perform'];
export function makeSections(measures, size=2) {
  const sections = [];
  for (let start = 1; start <= measures; start += size) {const end=Math.min(start+size-1,measures);sections.push({name:start===end?`Measure ${start}`:`Measures ${start} to ${end}`,start,end,goal:'Read the notes and rests, then practice slowly with a steady pulse.',hint:'Prepare the first notes in each hand. Choose a comfortable fingering and keep it consistent.'});}
  const count = sections.length;
  for (let i=1;i<count;i++) sections.push({name:'Join sections '+i+' and '+(i+1),start:sections[i-1].end,end:sections[i].end,goal:'Keep the pulse through the change between sections.',hint:'Prepare the next hand position before the bar line.'});
  sections.push({name:'Full performance',start:1,end:measures,goal:'Play the whole piece through. Keep going after a small slip, then revisit it.',hint:'Choose a reliable tempo and prepare both hands before the count-in.'});
  sections.push({name:'Your measure range',start:1,end:Math.min(2,measures),goal:'Work on the passage you choose.',hint:'Prepare the starting position before counting in.'});
  return sections;
}
// Records and notes for 2-measure sections keep their original keys; other section sizes get their own key space.
export const recordKey=(state,section,hand)=>(state.sectionSize&&state.sectionSize!==2?state.sectionSize+'/':'')+section+':'+hand;
export const recordKeyPattern=/^(?:[14]\/)?\d+:(left|right|both)$/;
// pieceDefaults: values chosen with "Apply to all pieces", used for keys this piece never stored.
export function freshState(saved={}, sections, measures, pieceDefaults={}) {
  const phase=phases.includes(saved.phase)?saved.phase:'learn',base=defaults('piece');
  for(const key of Object.keys(base))base[key]=validate(key,pieceDefaults[key],base[key]);
  const state={...base,customStart:1,customEnd:Math.min(2,measures),records:{},...saved,phase};
  for(const key of Object.keys(base))state[key]=validate(key,state[key],base[key]);
  delete state.previewNext;
  state.stages={};
  for(const p of phases) {
    const old=saved.stages?.[p]||{};
    state.stages[p]={completed:old.completed??0,section:old.section??(p==='perform'?sections.length-2:0),hand:old.hand??(p==='learn'?(state.learnOrder==='right'?'right':'left'):'both'),rated:old.rated===true};
    const s=state.stages[p];
    if(!Number.isInteger(s.completed)||s.completed<0)s.completed=0;
    if(!sections[s.section])s.section=0;
    if(!['left','right','both'].includes(s.hand))s.hand='both';
  }
  // The old global counter included navigation, so cannot measure completed rounds.
  if(!saved.stages){const s=state.stages[phase];s.section=sections[saved.section]?saved.section:s.section;s.hand=['left','right','both'].includes(saved.hand)?saved.hand:s.hand;}
  const passages=Math.ceil(measures/state.sectionSize);
  state.targets={learn:passages*4,mix:passages*2,polish:(sections.length-1)*2,...saved.targets};
  for(const p of phases.slice(0,3))if(!Number.isInteger(state.targets[p])||state.targets[p]<1||state.targets[p]>10000)state.targets[p]=12;
  for(const key of ['customStart','customEnd'])state[key]=Number.isInteger(state[key])?Math.max(1,Math.min(measures,state[key])):1;
  if(state.customStart>state.customEnd)state.customEnd=state.customStart;
  // Trouble-spot flags: measure numbers the player marked.
  state.flags=[...new Set((Array.isArray(state.flags)?state.flags:[]).filter(m=>Number.isInteger(m)&&m>=1&&m<=measures))].sort((a,b)=>a-b);
  const notes=state.notes&&typeof state.notes==='object'&&!Array.isArray(state.notes)?state.notes:{};
  state.notes=Object.fromEntries(Object.entries(notes).filter(([k,v])=>recordKeyPattern.test(k)&&typeof v==='string'&&v).map(([k,v])=>[k,v.slice(0,2000)]));
  Object.assign(state,state.stages[phase]);
  return state;
}
export function rememberStage(state){state.stages[state.phase]={completed:state.completed,section:state.section,hand:state.hand,rated:state.rated};}
export function switchStage(state,phase){rememberStage(state);state.phase=phase;Object.assign(state,state.stages[phase]);}
export function rateRound(state){if(state.rated)return false;state.rated=true;state.completed++;rememberStage(state);return true;}
export function chooseLesson(state, sections, measures){
  if(state.phase==='perform')return {section:sections.length-2,hand:state.hand};
  const hands=state.phase==='learn'?['left','right']:['both'];
  const count=state.phase==='polish'?sections.length-1:Math.ceil(measures/(state.sectionSize||2));
  let candidates=Array.from({length:count},(_,section)=>hands.map(hand=>({section,hand}))).flat();
  // Return to a passage after practicing a different one, including in separate-hands mode.
  const otherSections=candidates.filter(c=>c.section!==state.section);
  const other=otherSections.length?otherSections:candidates.filter(c=>c.hand!==state.hand);
  if(other.length)candidates=other;
  // Strict alternation switches hands every separate-hands round, even when the other hand is stronger.
  if(state.phase==='learn'&&state.learnOrder==='alternate'){const switched=candidates.filter(c=>c.hand!==state.hand);if(switched.length)candidates=switched;}
  // Flagged trouble spots count as two points weaker, so they come back sooner.
  const flagged=c=>(state.flags||[]).some(m=>m>=sections[c.section].start&&m<=sections[c.section].end);
  const priority=c=>{const r=state.records[recordKey(state,c.section,c.hand)]||{};return (r.clean||0)*4+(r.attempts||0)*.5-(flagged(c)?2:0);};
  // Equal-priority passages: jump across the piece (default), stay with neighbouring passages, or go in order.
  const nextSection=((state.section%count)+Math.max(1,Math.floor(count/2)))%count;
  const distance=state.interleave==='near'?c=>Math.abs(c.section-state.section):state.interleave==='order'?c=>(c.section-state.section-1+count)%count:c=>(c.section-nextSection+count)%count;
  return candidates.sort((a,b)=>priority(a)-priority(b)||distance(a)-distance(b)||Number(a.hand===state.hand)-Number(b.hand===state.hand))[0];
}
// Loop points inside a section, in section-relative beats. The first chosen note sets A; the second
// sets B at the end of the later note, so the loop always covers both notes whichever comes first.
export function nextLoopPoints(points={},start,end){
  if(points.a==null||points.b!=null)return {a:start,aEnd:end,b:null};
  return start>=points.a?{a:points.a,aEnd:points.aEnd,b:Math.max(end,points.aEnd)}:{a:start,aEnd:end,b:points.aEnd};
}
export function loopRange(points={},total){
  if(points.a==null)return {a:0,b:total};
  const a=Math.max(0,Math.min(points.a,total)),b=Math.min(total,points.b??total);
  return b-a>1e-6?{a,b}:{a:0,b:total};
}
