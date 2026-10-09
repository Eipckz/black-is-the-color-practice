export const phases = ['learn', 'mix', 'polish', 'perform'];
export function makeSections(measures, size=2) {
  const sections = [];
  for (let start = 1; start <= measures; start += size) {const end=Math.min(start+size-1,measures);sections.push({name:start===end?`Measure ${start}`:`Measures ${start} to ${end}`,start,end,goal:'Read the notes and rests, then practise slowly with a steady pulse.',hint:'Prepare the first notes in each hand. Choose a comfortable fingering and keep it consistent.'});}
  const count = sections.length;
  for (let i=1;i<count;i++) sections.push({name:'Join sections '+i+' and '+(i+1),start:sections[i-1].end,end:sections[i].end,goal:'Keep the pulse through the change between sections.',hint:'Prepare the next hand position before the bar line.'});
  sections.push({name:'Full performance',start:1,end:measures,goal:'Play the whole piece through. Keep going after a small slip, then revisit it.',hint:'Choose a reliable tempo and prepare both hands before the count-in.'});
  sections.push({name:'Your measure range',start:1,end:Math.min(2,measures),goal:'Work on the passage you choose.',hint:'Prepare the starting position before counting in.'});
  return sections;
}
// Records and notes for 2-measure sections keep their original keys; other section sizes get their own key space.
export const recordKey=(state,section,hand)=>(state.sectionSize&&state.sectionSize!==2?state.sectionSize+'/':'')+section+':'+hand;
export const recordKeyPattern=/^(?:[14]\/)?\d+:(left|right|both)$/;
export function freshState(saved={}, sections, measures) {
  const phase=phases.includes(saved.phase)?saved.phase:'learn';
  const state={tempo:50,volume:75,leftVolume:70,rightVolume:80,countBars:1,metronomeSub:'beat',scoreSize:'standard',customStart:1,customEnd:Math.min(2,measures),highlightMode:'notes',outlineNext:false,scoreView:'page',pageMeasures:8,barsPerLine:'auto',contextDim:65,showCueGuide:true,autoFollow:true,sectionSize:2,learnOrder:'left',interleave:'jump',tempoStep:5,autoSlow:true,records:{},...saved,phase};
  if(![1,2,4].includes(state.sectionSize))state.sectionSize=2;
  if(!['left','right','alternate'].includes(state.learnOrder))state.learnOrder='left';
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
  state.tempo=Number.isFinite(state.tempo)?Math.max(30,Math.min(180,state.tempo)):50;
  for(const key of ['customStart','customEnd'])state[key]=Number.isInteger(state[key])?Math.max(1,Math.min(measures,state[key])):1;
  if(state.customStart>state.customEnd)state.customEnd=state.customStart;
  for(const key of ['volume','leftVolume','rightVolume'])state[key]=Number.isFinite(state[key])?Math.max(0,Math.min(100,state[key])):75;
  if(![0,1,2].includes(state.countBars))state.countBars=1;
  if(!['beat','eighth'].includes(state.metronomeSub))state.metronomeSub='beat';
  if(!['section','page','piece'].includes(state.scoreView))state.scoreView='page';
  if(![4,8,12,16].includes(state.pageMeasures))state.pageMeasures=8;
  if(!['auto',1,2,4].includes(state.barsPerLine))state.barsPerLine='auto';
  state.contextDim=Number.isFinite(state.contextDim)?Math.max(0,Math.min(90,Math.round(state.contextDim))):65;
  delete state.previewNext;state.outlineNext=state.outlineNext===true;
  for(const key of ['showCueGuide','autoFollow','autoSlow'])state[key]=state[key]!==false;
  if(!['jump','near','order'].includes(state.interleave))state.interleave='jump';
  if(![2,5,10].includes(state.tempoStep))state.tempoStep=5;
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
  // Return to a passage after practising a different one, including in separate-hands mode.
  const otherSections=candidates.filter(c=>c.section!==state.section);
  const other=otherSections.length?otherSections:candidates.filter(c=>c.hand!==state.hand);
  if(other.length)candidates=other;
  // Strict alternation switches hands every separate-hands round, even when the other hand is stronger.
  if(state.phase==='learn'&&state.learnOrder==='alternate'){const switched=candidates.filter(c=>c.hand!==state.hand);if(switched.length)candidates=switched;}
  const priority=c=>{const r=state.records[recordKey(state,c.section,c.hand)]||{};return (r.clean||0)*4+(r.attempts||0)*.5;};
  // Equal-priority passages: jump across the piece (default), stay with neighbouring passages, or go in order.
  const nextSection=((state.section%count)+Math.max(1,Math.floor(count/2)))%count;
  const distance=state.interleave==='near'?c=>Math.abs(c.section-state.section):state.interleave==='order'?c=>(c.section-state.section-1+count)%count:c=>(c.section-nextSection+count)%count;
  return candidates.sort((a,b)=>priority(a)-priority(b)||distance(a)-distance(b)||Number(a.hand===state.hand)-Number(b.hand===state.hand))[0];
}
