export function timingState(value={}) {
  if(!value||typeof value!=='object')value={};
  return {activeSeconds:Math.max(0,Number(value.activeSeconds)||0),roundSeconds:Math.max(0,Number(value.roundSeconds)||0),samples:Array.isArray(value.samples)?value.samples.filter(s=>s&&Number.isFinite(s.seconds)&&s.seconds>=10&&s.seconds<=3600&&[0,1,2].includes(s.rating)).slice(-30):[],running:false};
}
export function recordTimedRound(timing,rating){
  if(timing.roundSeconds>=10&&timing.roundSeconds<=3600)timing.samples.push({seconds:timing.roundSeconds,rating});
  timing.samples=timing.samples.slice(-30);timing.roundSeconds=0;timing.running=false;
}
export function estimatePractice(state){
  const timing=state.practiceTiming,remaining=['learn','mix','polish'].reduce((n,p)=>n+Math.max(0,state.targets[p]-(state.stages[p]?.completed||0)),0);
  if(!remaining)return {ready:true,remaining:0};
  if(!timing||timing.samples.length<3)return {ready:false,remaining};
  const samples=timing.samples,average=samples.reduce((n,s)=>n+s.seconds,0)/samples.length;
  const retryFactor=1+samples.reduce((n,s)=>n+(2-s.rating)*.25,0)/samples.length;
  const current=['learn','mix','polish'].includes(state.phase)&&!state.rated?Math.min(timing.roundSeconds,average*.9):0;
  const seconds=Math.max(0,Math.round(remaining*average*retryFactor-current));
  return {ready:true,remaining,seconds,low:Math.round(seconds*.75),high:Math.round(seconds*1.5),samples:samples.length};
}
export function timeText(seconds){seconds=Math.max(0,Math.round(seconds));const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;return (h?h+'h ':'')+m+'m '+String(s).padStart(2,'0')+'s';}
// Practice minutes per local calendar day, shared by every piece on this device. Keeps 60 days.
const isDay=d=>/^\d{4}-\d{2}-\d{2}$/.test(d);
export function dailyState(value={}){
  if(!value||typeof value!=='object')value={};
  const goal=Number.isInteger(value.goal)&&value.goal>=0&&value.goal<=600?value.goal:0;
  const days=Object.fromEntries(Object.entries(value.days&&typeof value.days==='object'?value.days:{}).filter(([d,s])=>isDay(d)&&Number.isFinite(s)&&s>=0).sort().slice(-60));
  return {goal,days};
}
export function addPractice(daily,day,seconds){
  daily.days[day]=(daily.days[day]||0)+seconds;
  const keep=Object.keys(daily.days).sort().slice(-60);
  if(keep.length<Object.keys(daily.days).length)daily.days=Object.fromEntries(keep.map(d=>[d,daily.days[d]]));
  return daily;
}
export function mergeDaily(a,b){const out=dailyState(a),other=dailyState(b);for(const [d,s] of Object.entries(other.days))out.days[d]=Math.max(out.days[d]||0,s);if(!out.goal)out.goal=other.goal;return dailyState(out);}
