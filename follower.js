import {measureAt,keyAlter} from './engine.js?v=8';
// Map the written accompaniment to abcjs voice/measure/note groups. Pass the measure length, or the
// measure starts of a score whose meter changes.
export function makeCues(events, hand, start, measures=4){
 const voices=hand==='both'?['right','left']:[hand], counters=new Map(), bar=Array.isArray(measures)?beat=>measureAt(measures,beat):beat=>Math.floor((beat+1e-6)/measures)+1;
 return events.filter(e=>voices.includes(e.voice)).map(e=>{
  const measure=bar(e.beat)-start,voice=voices.indexOf(e.voice),key=voice+':'+measure,index=counters.get(key)||0;counters.set(key,index+1);
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
// Written pitch spelling of noteheads the player must notice: alterations from the key signature
// (kind 'key') and accidentals against it, including naturals that cancel it (kind 'chromatic').
// Unspelled built-in notes are spelled with sharps in sharp keys and flats otherwise.
export function alteredNoteHeads(event,fifths=0){
 const flats=[['C',0],['C',1],['D',0],['E',-1],['E',0],['F',0],['F',1],['G',0],['A',-1],['A',0],['B',-1],['B',0]],sharps=[['C',0],['C',1],['D',0],['D',1],['E',0],['F',0],['F',1],['G',0],['G',1],['A',0],['A',1],['B',0]];
 return event.notes.map((midi,i)=>{const [step,alter]=(fifths>0?sharps:flats)[midi%12];const p=event.spellings?.[i]||{step,alter,octave:Math.floor(midi/12)-1},inKey=keyAlter(p.step,fifths);if(p.alter===0&&inKey===0)return null;const kind=p.alter===inKey?'key':'chromatic';return {name:p.octave>=5?p.step.toLowerCase()+"'".repeat(p.octave-5):p.step+','.repeat(Math.max(0,4-p.octave)),alter:p.alter,kind,label:p.step+(p.alter>0?' sharp'.repeat(p.alter):p.alter<0?' flat'.repeat(-p.alter):' natural')+' '+p.octave+(kind==='key'?' (key signature)':' (accidental)')};}).filter(Boolean);
}
