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
// Practice history: one compact row per rated round, [time, stage, section, hand, rating, tempo, seconds].
export const HISTORY_LIMIT=2000;
const phases=['learn','mix','polish','perform'],hands=['left','right','both'];
export function validHistory(value){
  return (Array.isArray(value)?value:[]).filter(r=>Array.isArray(r)&&r.length===7&&r.every(Number.isFinite)&&r[0]>0&&Number.isInteger(r[1])&&r[1]>=0&&r[1]<4&&Number.isInteger(r[2])&&r[2]>=0&&Number.isInteger(r[3])&&r[3]>=0&&r[3]<3&&[0,1,2].includes(r[4])&&r[6]>=0).slice(-HISTORY_LIMIT);
}
export const addHistory=(history,row)=>[...(history||[]),row].slice(-HISTORY_LIMIT);
// Minutes, rounds and clean rounds for each of the last `days` local calendar days, oldest first.
export function historyByDay(history,now=Date.now(),days=30){
  const date=t=>new Date(t).toLocaleDateString('en-CA'),out=[];
  for(let i=days-1;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);out.push({date:date(d),seconds:0,rounds:0,clean:0});}
  const index=new Map(out.map((d,i)=>[d.date,i]));
  for(const [t,,,,rating,,seconds] of history||[]){const i=index.get(date(t));if(i===undefined)continue;out[i].seconds+=seconds;out[i].rounds++;if(rating===2)out[i].clean++;}
  return out;
}
export function historyCSV(history,sectionName=i=>'Section '+(i+1)){
  const ratings=['needs a slow retry','close','clean'],cell=v=>'"'+String(v).replace(/"/g,'""')+'"';
  return ['date,time,stage,section,hand,rating,tempo_bpm,seconds',...(history||[]).map(([t,p,s,h,r,tempo,seconds])=>{const d=new Date(t);return [d.toLocaleDateString('en-CA'),d.toTimeString().slice(0,5),phases[p],cell(sectionName(s)),hands[h],ratings[r],tempo,Math.round(seconds)].join(',');})].join('\n')+'\n';
}
// Recent accuracy per measure from timed checks: the new result is averaged with the previous one.
export function updateAccuracy(stats,results,now=Date.now()){
  const out={...stats};
  for(const [m,r] of results){const accuracy=r.onTime/Math.max(1,r.n+r.wrong),old=out[m];out[m]={acc:Math.round((old?(old.acc+accuracy)/2:accuracy)*1000)/1000,n:(old?.n||0)+1,t:now};}
  return out;
}
