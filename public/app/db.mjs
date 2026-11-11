let opening;
export function openDB(){
 if(!opening)opening=new Promise((resolve,reject)=>{const r=indexedDB.open('findr-device',1);r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('manuals',{keyPath:'id'});d.createObjectStore('files');d.createObjectStore('settings');};r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();opening=null;};resolve(r.result)};r.onerror=()=>{opening=null;reject(r.error)};r.onblocked=()=>reject(new Error('Close other FINDR tabs and retry.'))});return opening;
}
async function tx(stores,mode,work){const d=await openDB();return new Promise((resolve,reject)=>{const t=d.transaction(stores,mode);let value;t.oncomplete=()=>resolve(value);t.onabort=t.onerror=()=>reject(t.error||new Error('Device storage is unavailable.'));try{work(n=>t.objectStore(n),v=>value=v)}catch(e){t.abort();reject(e)}})}
export const allManuals=()=>tx(['manuals'],'readonly',(s,v)=>{s('manuals').getAll().onsuccess=e=>v(e.target.result)});
export const getFile=id=>tx(['files'],'readonly',(s,v)=>{s('files').get(id).onsuccess=e=>v(e.target.result)});
export const setting=key=>tx(['settings'],'readonly',(s,v)=>{s('settings').get(key).onsuccess=e=>v(e.target.result)});
export const setSetting=(key,value)=>tx(['settings'],'readwrite',s=>s('settings').put(value,key));
export const saveManual=(record,blob)=>tx(['manuals','files'],'readwrite',s=>{s('manuals').put(record);s('files').put(blob,record.id)});
export const removeManual=id=>tx(['manuals','files'],'readwrite',s=>{s('manuals').delete(id);s('files').delete(id)});
