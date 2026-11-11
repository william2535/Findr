import {openDB,allManuals,getFile,saveManual} from './db.mjs';
import {validatePDF} from './engine.mjs';
import {normalizeHelperAppearance} from './helpers-appearance.mjs';

export const HELPERS_KEY='helpers-v1';
const copy=value=>structuredClone(value);
const uid=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const strings=value=>Array.isArray(value)&&value.every(item=>typeof item==='string'&&item.length>0);
const unique=value=>[...new Set(value||[])];
const fail=message=>Object.assign(new Error(message),{code:'HELPERS_STORAGE_INVALID'});
export function createConversation({id=uid(),title='New conversation',now=Date.now()}={}){return {id,title,messages:[],context:{},createdAt:now,updatedAt:now};}
export function createHelper(input={}){
 const now=Date.now(),conversation=createConversation();
 const selectedManualIds=unique(input.selectedManualIds),requiredManualIds=unique(input.requiredManualIds);
 return normalizeHelper({...input,id:input.id||uid(),name:String(input.name||input.scope?.label||'My helper').trim(),discipline:input.discipline||'fire',scope:copy(input.scope||{kind:'manuals',label:'Selected manuals'}),selectedManualIds,requiredManualIds,manualStates:input.manualStates||{},conversations:input.conversations?.length?input.conversations:[conversation],activeConversationId:input.activeConversationId||input.conversations?.[0]?.id||conversation.id,createdAt:input.createdAt||now,updatedAt:input.updatedAt||now,revision:input.revision||0});
}
export function normalizeHelper(value){
 if(!value||typeof value.id!=='string'||!value.id||typeof value.name!=='string'||!value.name.trim()||!value.scope||typeof value.scope!=='object'||!strings(value.selectedManualIds)||!strings(value.requiredManualIds)||!Array.isArray(value.conversations)||value.conversations.some(c=>!c||typeof c.id!=='string'||!Array.isArray(c.messages)))throw fail('This helper cannot be read. Existing helpers and manuals have not been changed.');
 if(new Set(value.conversations.map(c=>c.id)).size!==value.conversations.length)throw fail('A helper has duplicate conversation identities. Existing helpers are unchanged.');
 const next=copy(value);next.name=next.name.trim();next.selectedManualIds=unique(next.selectedManualIds);next.requiredManualIds=unique(next.requiredManualIds);next.manualStates=next.manualStates&&typeof next.manualStates==='object'&&!Array.isArray(next.manualStates)?next.manualStates:{};
 next.appearance=normalizeHelperAppearance(next.appearance);
 next.revision=Number.isInteger(next.revision)&&next.revision>=0?next.revision:0;
 if(!next.conversations.some(c=>c.id===next.activeConversationId))next.activeConversationId=next.conversations[0]?.id||null;
 return next;
}
export function normalizeHelpers(value){
 if(value===undefined||value===null)return {schemaVersion:1,helpers:[]};
 if(value.schemaVersion!==1||!Array.isArray(value.helpers))throw fail('Saved helpers could not be read. Existing records have not been changed.');
 const helpers=value.helpers.map(normalizeHelper);if(new Set(helpers.map(h=>h.id)).size!==helpers.length)throw fail('Saved helpers contain duplicate identities. Existing records have not been changed.');
 return {...copy(value),schemaVersion:1,helpers};
}
/** Merge one job's worksheet into the latest helper snapshot without replacing chat or another job. */
export function withHelperFaultSession(helper,conversationId,faultSession,{now=Date.now()}={}){
 const job=helper?.conversations?.find(item=>item.id===conversationId);
 if(!job)throw Object.assign(Error('This conversation no longer exists. Its fault log could not be saved.'),{code:'HELPER_CONVERSATION_NOT_FOUND'});
 if(!faultSession||typeof faultSession!=='object'||Array.isArray(faultSession)||typeof faultSession.id!=='string'||!faultSession.id.trim())throw fail('This fault log has no valid session identity. Existing saved work is unchanged.');
 if(job.faultSession&&job.faultSession.id!==faultSession.id)throw Object.assign(Error('This conversation already has a different fault log. Reopen it before saving.'),{code:'FAULT_SESSION_CHANGED'});
 const next=copy(helper),target=next.conversations.find(item=>item.id===conversationId);
 target.faultSession=copy(faultSession);target.updatedAt=now;next.updatedAt=now;
 return next;
}
export function createHelpersStore(open=openDB){
 async function mutate(transform){const db=await open();return new Promise((resolve,reject)=>{
  const tx=db.transaction(['settings'],'readwrite'),settings=tx.objectStore('settings');let result,error;
  tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(error||tx.error||Object.assign(Error('The helper could not be saved. Check available storage; the previous saved version is intact.'),{code:'STORAGE_UNAVAILABLE'}));
  const request=settings.get(HELPERS_KEY);request.onsuccess=()=>{try{const current=normalizeHelpers(request.result),next=transform(current);if(next&&typeof next.then==='function')throw fail('Helper storage updates must be synchronous.');result=next.result;settings.put(normalizeHelpers(next.store),HELPERS_KEY);}catch(failure){error=failure;tx.abort();}};
 });}
 async function load(){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(['settings'],'readonly'),r=tx.objectStore('settings').get(HELPERS_KEY);r.onsuccess=()=>{try{resolve(normalizeHelpers(r.result));}catch(error){reject(error);}};r.onerror=()=>reject(r.error);tx.onabort=()=>reject(tx.error||Error('Helper storage is unavailable.'));});}
 async function save(helper,{expectedRevision}={}){const snapshot=normalizeHelper(helper);return mutate(store=>{const previous=store.helpers.find(h=>h.id===snapshot.id);if(expectedRevision!==undefined&&previous?.revision!==expectedRevision)throw Object.assign(Error('This helper changed in another tab. Reopen it before saving.'),{code:'HELPER_CHANGED'});const updated={...snapshot,updatedAt:Date.now(),revision:(previous?.revision||0)+1};return {store:{...store,helpers:[updated,...store.helpers.filter(h=>h.id!==updated.id)]},result:copy(updated)};});}
 async function update(id,updater){return mutate(store=>{const previous=store.helpers.find(h=>h.id===id);if(!previous)throw Object.assign(Error('This helper no longer exists.'),{code:'HELPER_NOT_FOUND'});const candidate=updater(copy(previous));if(candidate?.then)throw fail('Helper updates cannot perform asynchronous work inside storage.');const updated=normalizeHelper({...candidate,id,updatedAt:Date.now(),revision:previous.revision+1});return {store:{...store,helpers:[updated,...store.helpers.filter(h=>h.id!==id)]},result:copy(updated)};});}
 async function remove(id){return mutate(store=>({store:{...store,helpers:store.helpers.filter(h=>h.id!==id)},result:{deleted:store.helpers.some(h=>h.id===id),documentsRemoved:0,modelRemoved:false}}));}
 async function references(manualId,{contentHash}={}){return (await load()).helpers.filter(h=>h.selectedManualIds.includes(manualId)||Object.values(h.manualStates).some(s=>s?.storedManualId===manualId||contentHash&&s?.contentHash===contentHash)).map(h=>({id:h.id,name:h.name}));}
 return {load,save,update,remove,references};
}
const store=createHelpersStore();
export const loadHelpers=store.load,saveHelper=store.save,updateHelper=store.update,deleteHelper=store.remove,manualHelperReferences=store.references;

function encode(bytes){let out='';for(let i=0;i<bytes.length;i+=32768)out+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(out);}
function decode(value){if(typeof value!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(value)||value.length%4)throw fail('The helper backup contains invalid PDF data.');const binary=atob(value),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes;}
export async function exportHelper(id,{includeFiles=false}={}){
 const helper=(await loadHelpers()).helpers.find(h=>h.id===id);if(!helper)throw Error('Helper not found.');
 const records=await allManuals(),manuals=[],seen=new Set(),missing=[];
 for(const selectedId of helper.selectedManualIds){const state=helper.manualStates[selectedId]||{},record=records.find(r=>r.id===(state.storedManualId||selectedId))||records.find(r=>state.contentHash&&r.fileHash===state.contentHash);if(!record){missing.push(selectedId);continue;}if(seen.has(record.fileHash||record.id))continue;seen.add(record.fileHash||record.id);const blob=includeFiles?await getFile(record.id):null;if(includeFiles&&!blob){missing.push(selectedId);continue;}manuals.push({record,...(blob?{dataBase64:encode(new Uint8Array(await blob.arrayBuffer()))}:{})});}
 return {kind:'findr-helper',schemaVersion:1,exportedAt:Date.now(),helper:copy(helper),includesFiles:includeFiles,manuals,missingManualIds:missing,modelIncluded:false};
}
export async function importHelper(payload){
 const value=typeof payload==='string'?JSON.parse(payload):payload;if(value?.kind!=='findr-helper'||value.schemaVersion!==1||!Array.isArray(value.manuals))throw fail('This is not a supported FINDR helper backup.');
 const source=normalizeHelper(value.helper),existing=await allManuals(),prepared=[],mapping=new Map(),hashMapping=new Map();
 // Validate every included PDF before writing anything. Imported ready flags and indexes are never trusted.
 for(const item of value.manuals){if(!item?.record||typeof item.record.id!=='string')throw fail('The helper backup has an invalid manual record.');if(!item.dataBase64)continue;const blob=new Blob([decode(item.dataBase64)],{type:'application/pdf'}),hash=await validatePDF(blob,item.record.fileHash||item.record.sha256),reuse=existing.find(r=>r.fileHash===hash),collision=existing.find(r=>r.id===item.record.id&&r.fileHash!==hash);const record=reuse||{...item.record,id:collision?'local-'+hash:item.record.id,fileHash:hash,bytes:blob.size,imported:true,savedAt:Date.now()};prepared.push({record,blob,reuse:!!reuse});mapping.set(item.record.id,record.id);hashMapping.set(hash,record.id);}
 const storedHashById=new Map(existing.map(r=>[r.id,r.fileHash]));
 const requestedMapping=new Map();for(const id of source.selectedManualIds){const state=source.manualStates[id]||{},target=hashMapping.get(state.contentHash)||mapping.get(state.storedManualId||id)||id;requestedMapping.set(id,target);}
 for(const item of prepared)if(!item.reuse)await saveManual(item.record,item.blob);
 const rewrite=value=>{if(Array.isArray(value))return value.map(rewrite);if(value&&typeof value==='object'){const out={};for(const [key,item]of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(key))continue;out[key]=['manualId','recordId','storedManualId'].includes(key)&&typeof item==='string'?(requestedMapping.get(item)||mapping.get(item)||item):rewrite(item);}return out;}return value;};
 const helper=rewrite(source);helper.id=uid();helper.name=source.name+' (imported)';helper.createdAt=helper.updatedAt=Date.now();helper.revision=0;helper.selectedManualIds=unique(source.selectedManualIds.map(id=>requestedMapping.get(id)||id));helper.requiredManualIds=unique(source.requiredManualIds.map(id=>requestedMapping.get(id)||id));helper.manualStates={};
 for(const id of source.selectedManualIds){const nextId=requestedMapping.get(id)||id,old=source.manualStates[id]||{};helper.manualStates[nextId]={status:'pending',contentHash:old.contentHash||storedHashById.get(nextId)||null,storedManualId:nextId,error:null};}
 helper.scope={...helper.scope,verifiedFamily:false,imported:true,limits:unique([...(Array.isArray(helper.scope.limits)?helper.scope.limits:[]),'Imported scope: confirm model, variant and source relationships on this device. Imported readiness markers were discarded.'])};helper.importedAt=Date.now();return saveHelper(helper);
}
