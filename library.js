export const BUILTIN='black-is-the-color';
export const progressKey=id=>id===BUILTIN?'black-is-the-color-practice-v1':'piano-practice:'+id;
export async function scoreId(source){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source));return Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');}
function database(){return new Promise((resolve,reject)=>{const request=indexedDB.open('piano-repertoire',1);request.onupgradeneeded=()=>request.result.createObjectStore('scores',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function transact(mode,operation){const db=await database();return new Promise((resolve,reject)=>{const transaction=db.transaction('scores',mode);const request=operation(transaction.objectStore('scores'));transaction.oncomplete=()=>{db.close();resolve(request.result);};transaction.onerror=()=>{db.close();reject(transaction.error);};transaction.onabort=()=>{db.close();reject(transaction.error||new Error('Library save cancelled.'));};});}
export const listScores=()=>transact('readonly',store=>store.getAll());
export const storeScore=entry=>transact('readwrite',store=>store.put(entry));

export const deleteScore=id=>transact('readwrite',store=>store.delete(id));
