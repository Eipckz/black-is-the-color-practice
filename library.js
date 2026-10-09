export const BUILTIN='black-is-the-color';
export const progressKey=id=>id===BUILTIN?'black-is-the-color-practice-v1':'piano-practice:'+id;
export async function scoreId(source){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source));return Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');}
// Version 2 adds local recordings, indexed by piece. They never leave this browser.
function database(){return new Promise((resolve,reject)=>{const request=indexedDB.open('piano-repertoire',2);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('scores'))db.createObjectStore('scores',{keyPath:'id'});if(!db.objectStoreNames.contains('recordings'))db.createObjectStore('recordings',{keyPath:'id'}).createIndex('piece','piece');};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function transact(mode,operation,name='scores'){const db=await database();return new Promise((resolve,reject)=>{const transaction=db.transaction(name,mode);const request=operation(transaction.objectStore(name));transaction.oncomplete=()=>{db.close();resolve(request.result);};transaction.onerror=()=>{db.close();reject(transaction.error);};transaction.onabort=()=>{db.close();reject(transaction.error||new Error('Library save cancelled.'));};});}
export const listScores=()=>transact('readonly',store=>store.getAll());
export const storeScore=entry=>transact('readwrite',store=>store.put(entry));

export const deleteScore=id=>transact('readwrite',store=>store.delete(id));
export const listRecordings=piece=>transact('readonly',store=>store.index('piece').getAll(piece),'recordings');
export const storeRecording=entry=>transact('readwrite',store=>store.put(entry),'recordings');
export const deleteRecording=id=>transact('readwrite',store=>store.delete(id),'recordings');
export async function deleteRecordings(piece){for(const r of await listRecordings(piece))await deleteRecording(r.id);}
