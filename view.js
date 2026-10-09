// Which measures the score shows around the practised section, and which of them are dimmed context.
export function renderWindow(measures,section,{scoreView='page',pageMeasures=8}={}){
 if(scoreView==='section')return {start:section.start,end:section.end};
 if(scoreView==='piece')return {start:1,end:measures};
 const start=Math.floor((section.start-1)/pageMeasures)*pageMeasures+1;
 return {start,end:Math.min(measures,Math.max(start+pageMeasures-1,section.end))};
}
export const contextMeasures=(win,section)=>Array.from({length:win.end-win.start+1},(_,i)=>win.start+i).filter(m=>m<section.start||m>section.end);
export const lineBars=(setting,width)=>setting==='auto'?(width<=600?1:width<=900?2:4):setting;
