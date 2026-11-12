import {parseMusicXML} from './import-score.js?v=24';
import {scoreId} from './library.js?v=12';

export const repertoireFiles=['Red-River-Valley-Bb.musicxml','Red-River-Valley-C.musicxml'];
// Bundled pieces use the same content identity as imports and portable backups.
export async function loadRepertoire(fetcher=fetch,Parser=DOMParser){
 const entries=[],warnings=[];
 for(const filename of repertoireFiles){try{
  const response=await fetcher(new URL('./repertoire/'+filename,import.meta.url));
  if(!response.ok)throw new Error('HTTP '+response.status);
  const source=await response.text(),score=parseMusicXML(source,filename,Parser);
  entries.push({id:await scoreId(source),source,filename,score,bundled:true});
 }catch(error){warnings.push(filename+': '+error.message);}}
 return {entries,warnings};
}

export function mergeRepertoire(saved,bundled){
 const entries=new Map(saved.map(entry=>[entry.id,entry]));
 for(const entry of bundled)entries.set(entry.id,{...entries.get(entry.id),...entry});
 return [...entries.values()];
}
