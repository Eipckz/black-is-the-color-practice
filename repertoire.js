import {parseMusicXML} from './import-score.js?v=25';
import {scoreId} from './library.js?v=13';

export const repertoireFiles=['Red-River-Valley-Bb.musicxml','Red-River-Valley-C.musicxml','Auld-Lang-Syne-F.musicxml'];
// Bundled pieces use the same content identity as imports and portable backups.
export async function loadRepertoire(fetcher=fetch,Parser=DOMParser){
 const entries=[],warnings=[];
 for(const filename of repertoireFiles){try{
  const response=await fetcher(new URL('./repertoire/'+filename,import.meta.url));
  if(!response.ok)throw new Error('HTTP '+response.status);
  const source=await response.text();
  const partId=filename==='Auld-Lang-Syne-F.musicxml'?'P':null;
  const score=parseMusicXML(source,filename,Parser,partId);
  if(partId){
   const melody=parseMusicXML(source,filename,Parser,'V');
   const doc=new Parser().parseFromString(source,'application/xml');
   melody.lyrics=Array.from(doc.querySelectorAll('part[id="V"] > measure'),measure=>
    Array.from(measure.querySelectorAll('note'),note=>{
     const word=note.querySelector('lyric text')?.textContent;
     const syllable=note.querySelector('syllabic')?.textContent;
     return word ? word+(['begin','middle'].includes(syllable)?'-':'') : '_';
    }));
   score.vocalLine=melody;
   score.voices.push({...melody.voices.find(v=>v.id==='right'),id:'melody'});
  }
  const id=await scoreId(partId?source+'\nPiano part: '+partId:source);
  entries.push({id,source,filename,partId,score,bundled:true});
 }catch(error){warnings.push(filename+': '+error.message);}}
 return {entries,warnings};
}

export function mergeRepertoire(saved,bundled){
 const entries=new Map(saved.map(entry=>[entry.id,entry]));
 for(const entry of bundled)entries.set(entry.id,{...entries.get(entry.id),...entry});
 return [...entries.values()];
}
