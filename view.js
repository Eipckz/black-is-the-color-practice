// Which measures the score shows around the practiced section, and which of them are dimmed context.
// 'piece' (default): the whole score; 'around': a block of pageMeasures containing the section; 'section'.
export function renderWindow(measures,section,{scoreView='piece',pageMeasures=8}={}){
 if(scoreView==='section')return {start:section.start,end:section.end};
 if(scoreView!=='around')return {start:1,end:measures};
 const start=Math.floor((section.start-1)/pageMeasures)*pageMeasures+1;
 return {start,end:Math.min(measures,Math.max(start+pageMeasures-1,section.end))};
}
export const contextMeasures=(win,section)=>Array.from({length:win.end-win.start+1},(_,i)=>win.start+i).filter(m=>m<section.start||m>section.end);
// A hidden tab can report zero width; lay it out as a desktop until a real width arrives.
export const lineBars=(setting,width)=>setting==='auto'?(width&&width<=600?1:width&&width<=900?2:4):setting;
// The first rendered element of the section's first measure: where the score scrolls to.
export const firstSectionNode=(notation,win,section)=>notation.querySelector('.abcjs-mm'+(section.start-win.start));
