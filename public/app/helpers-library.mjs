import * as db from './db.mjs';
import {validatePDF} from './engine.mjs';
import {analyseManual,getManualAnalysis,getManualProcessingReadiness,downloadManualProcessingResources,MANUAL_ANALYSIS_VERSION} from './manual-analysis.mjs';
import {loadQuickManualIndex,quickManualIndexKey} from './retrieval-cache.mjs';
import {MANUAL_RETRIEVAL_VERSION} from './manual-retrieval.mjs';
import {getLocalLanguageReadiness,prepareLocalLanguageResources} from './local-language.mjs';
import {loadHelpers,updateHelper,manualHelperReferences} from './helpers-store.mjs';

const copy=value=>structuredClone(value);
const byteSize=value=>new TextEncoder().encode(JSON.stringify(value)).byteLength;
const code=(name,message,cause)=>Object.assign(new Error(message,{cause}),{code:name});
const check=signal=>{if(signal?.aborted)throw new DOMException('Preparation cancelled. Completed files and download chunks are retained.','AbortError');};
const report=(callback,value)=>{try{callback?.(value);}catch{/* Progress rendering does not own download state. */}};
const list=value=>Array.isArray(value)?value:[];
export const HELPER_DOWNLOAD_CHUNK_BYTES=1024*1024;
const MAX_PDF_BYTES=120*1024*1024;
export const helperPartialKey=id=>'helper-download-v1:'+id;
const partKey=(id,index)=>helperPartialKey(id)+':part:'+index;
async function deleteSetting(key){const database=await db.openDB();return new Promise((resolve,reject)=>{const tx=database.transaction(['settings'],'readwrite');tx.objectStore('settings').delete(key);tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||Error('Download cache could not be updated.'));});}
function normalizedFailure(error){if(error?.name==='AbortError'||error?.code)return error;if(error?.name==='QuotaExceededError'||/quota|storage|disk/i.test(error?.message||''))return code('STORAGE_UNAVAILABLE','There is not enough available device storage. Completed manuals and download chunks have been retained.',error);return code('MANUAL_DOWNLOAD_FAILED',error?.message||'The PDF download failed. Reconnect and retry.',error);}
const downloadLocks=new Map();
/** Actual persisted chunks, with HTTP Range when the publisher supports it. */
export function createResumableManualDownloader({fetchFn=(...args)=>fetch(...args),read=db.setting,write=db.setSetting,remove=deleteSetting,getSaved=db.allManuals,getBlob=db.getFile,save=db.saveManual,validate=validatePDF,estimate=()=>globalThis.navigator?.storage?.estimate?.(),chunkBytes=HELPER_DOWNLOAD_CHUNK_BYTES}={}){
 async function discard(id,partial){for(let i=0;i<(partial?.parts||0);i++)await remove(partKey(id,i));await remove(helperPartialKey(id));}
 async function download(record,{signal,onProgress}={}){
  const lock=record.id;if(downloadLocks.has(lock))throw code('DOWNLOAD_BUSY','This manual is already being prepared. Wait for that download to finish, then retry.');
  const operation=Symbol(lock);downloadLocks.set(lock,operation);
  try{
   check(signal);let existing=await getSaved();const same=existing.find(r=>record.sha256?r.fileHash===record.sha256:r.id===record.id);if(same){const blob=await getBlob(same.id);if(blob&&blob.size===same.bytes){const hash=await validate(blob,record.sha256||same.fileHash);check(signal);return {record:{...same,fileHash:hash},blob,shared:same.id!==record.id,reused:true,resumedBytes:0};}}
   if(!record.url)throw code('MANUAL_UNAVAILABLE','This record has no downloadable PDF. Add an authorised PDF copy to your saved manuals.');
   const key=helperPartialKey(record.id),identity=record.sha256||record.url;let partial=await read(key);
   if(partial&&(partial.identity!==identity||partial.schemaVersion!==1||!Number.isInteger(partial.parts)||partial.parts<0||!Number.isFinite(partial.bytes)||partial.bytes<0)){await discard(record.id,partial);partial=null;}
   if(partial?.bytes&&!record.sha256&&!partial.etag&&!partial.lastModified){await discard(record.id,partial);partial=null;}
   partial||={schemaVersion:1,recordId:record.id,identity,parts:0,bytes:0,total:0,etag:null,lastModified:null};
   // A missing chunk must never turn a partial download into a complete document.
   for(let index=0;index<partial.parts;index++){const value=await read(partKey(record.id,index));if(!(value instanceof Blob)){await discard(record.id,partial);partial={schemaVersion:1,recordId:record.id,identity,parts:0,bytes:0,total:0};break;}}
   const storage=await estimate?.(),remaining=Math.max(0,(Number(record.bytes)||partial.total||chunkBytes)-partial.bytes);if(storage?.quota&&storage.quota-(storage.usage||0)<remaining+chunkBytes)throw code('STORAGE_UNAVAILABLE','There is not enough available device storage for this PDF. Free space and resume; existing manuals are unchanged.');
   let resumedBytes=partial.bytes,headers={};if(partial.bytes){headers.Range='bytes='+partial.bytes+'-';if(partial.etag&&!partial.etag.startsWith('W/'))headers['If-Range']=partial.etag;else if(partial.lastModified)headers['If-Range']=partial.lastModified;}
   report(onProgress,{phase:'download',manualId:record.id,message:(partial.bytes?'Resuming ':'Downloading ')+record.title,bytes:partial.bytes,savedBytes:partial.bytes,totalBytes:Number(record.bytes)||partial.total||null,resumedBytes});
   let response=await fetchFn('/api/manual/'+encodeURIComponent(record.id),{headers,signal,cache:'no-store'});check(signal);
   if(response.status===416&&partial.bytes){await discard(record.id,partial);partial={schemaVersion:1,recordId:record.id,identity,parts:0,bytes:0,total:0};resumedBytes=0;response=await fetchFn('/api/manual/'+encodeURIComponent(record.id),{signal,cache:'no-store'});}
   if(!response.ok)throw code('MANUAL_DOWNLOAD_FAILED',(await response.text()).slice(0,220)||'The publisher returned HTTP '+response.status+'.');
   const range=response.headers.get('content-range')?.match(/^bytes (\d+)-(\d+)\/(\d+)$/i);
   if(response.status===206&&(!range||Number(range[1])!==partial.bytes||Number(range[2])<Number(range[1])))throw code('MANUAL_DOWNLOAD_FAILED','The publisher returned an unexpected download range. Retry this manual.');
   if(response.status!==206&&partial.bytes){await discard(record.id,partial);partial={schemaVersion:1,recordId:record.id,identity,parts:0,bytes:0,total:0};resumedBytes=0;report(onProgress,{phase:'download',manualId:record.id,message:'The publisher cannot resume this file; restarting '+record.title,bytes:0,savedBytes:0,resumedBytes:0});}
   const contentLength=Number(response.headers.get('content-length')||0);partial.total=range?Number(range[3]):contentLength||0;partial.etag=response.headers.get('etag')||partial.etag||null;partial.lastModified=response.headers.get('last-modified')||partial.lastModified||null;
   if(partial.total>MAX_PDF_BYTES)throw code('MANUAL_TOO_LARGE','This PDF exceeds the existing 120 MB document limit. Choose the relevant manual section.');
   await write(key,partial);let buffer=new Uint8Array(chunkBytes),used=0,received=partial.bytes;
   const savePart=async bytes=>{await write(partKey(record.id,partial.parts),new Blob([bytes]));partial={...partial,parts:partial.parts+1,bytes:partial.bytes+bytes.length};await write(key,partial);};
   const consume=async value=>{let offset=0;received+=value.length;if(received>MAX_PDF_BYTES)throw code('MANUAL_TOO_LARGE','This PDF exceeds the existing 120 MB document limit.');while(offset<value.length){check(signal);const count=Math.min(chunkBytes-used,value.length-offset);buffer.set(value.subarray(offset,offset+count),used);offset+=count;used+=count;if(used===chunkBytes){await savePart(buffer);buffer=new Uint8Array(chunkBytes);used=0;}report(onProgress,{phase:'download',manualId:record.id,message:'Downloading '+record.title,bytes:partial.bytes+used,savedBytes:partial.bytes,totalBytes:partial.total||null,resumedBytes});}};
   if(response.body?.getReader){const reader=response.body.getReader();let completedStream=false;try{for(;;){check(signal);const item=await reader.read();if(item.done){completedStream=true;break;}await consume(item.value);}}finally{if(!completedStream)await reader.cancel().catch(()=>{});reader.releaseLock();}}
   else await consume(new Uint8Array(await response.arrayBuffer()));
   check(signal);if(used)await savePart(buffer.subarray(0,used));if(partial.total&&partial.bytes!==partial.total)throw code('MANUAL_DOWNLOAD_FAILED','The PDF download ended early. Reconnect and resume the remaining bytes.');
   const chunks=[];for(let index=0;index<partial.parts;index++){const part=await read(partKey(record.id,index));if(!(part instanceof Blob))throw code('MANUAL_DOWNLOAD_FAILED','A saved download chunk is missing. Retry this manual.');chunks.push(part);}
   const blob=new Blob(chunks,{type:'application/pdf'});report(onProgress,{phase:'verify',manualId:record.id,message:'Checking the complete PDF before saving…',bytes:blob.size,totalBytes:blob.size});
   let hash;try{hash=await validate(blob,record.sha256);}catch(error){await discard(record.id,partial);throw code('MANUAL_INTEGRITY_FAILED',error.message,error);}check(signal);
   existing=await getSaved();const shared=existing.find(r=>r.fileHash===hash&&r.bytes===blob.size);let stored=shared;
   if(!stored){const collision=existing.some(r=>r.id===record.id&&r.fileHash!==hash);stored={...record,id:collision?'helper-pdf-'+hash:record.id,fileHash:hash,bytes:blob.size,savedAt:Date.now(),imported:false};await save(stored,blob);}
   await discard(record.id,partial);report(onProgress,{phase:'saved',manualId:record.id,message:'PDF saved and checked.',bytes:blob.size,totalBytes:blob.size});return {record:stored,blob,shared:!!shared,reused:false,resumedBytes};
  }catch(error){throw normalizedFailure(error);}finally{if(downloadLocks.get(lock)===operation)downloadLocks.delete(lock);}
 }
 return {download,discard};
}

export function createHelperLibrary({getRecords=()=>[],refreshSaved=async()=>{},onHelperUpdate,read=db.setting,allManuals=db.allManuals,getFile=db.getFile,getAnalysis=getManualAnalysis,analyse=analyseManual,loadIndex=loadQuickManualIndex,modelReadiness=getLocalLanguageReadiness,processingReadiness=getManualProcessingReadiness,prepareModel=prepareLocalLanguageResources,prepareProcessing=downloadManualProcessingResources,loadStore=loadHelpers,patchHelper=updateHelper,estimate=()=>globalThis.navigator?.storage?.estimate?.(),downloader}={}){
 const downloads=downloader||createResumableManualDownloader({read,getSaved:allManuals,getBlob:getFile,estimate});let active=null;
 const catalog=()=>{const value=getRecords();return value instanceof Map?value:new Map(list(value).map(r=>[r.id,r]));};
 const recordFor=(helper,id)=>helper.documents?.find(d=>d.id===id||d.record?.id===id)?.record||catalog().get(id)||null;
 const locate=(helper,id,saved)=>{const desired=recordFor(helper,id),state=helper.manualStates?.[id]||{},expected=desired?.sha256||state.contentHash;const named=saved.find(r=>r.id===(state.storedManualId||id));return named&&(!expected||named.fileHash===expected)?named:saved.find(r=>expected&&r.fileHash===expected)||null;};
 async function patch(id,manualId,state){const helper=await patchHelper(id,current=>({...current,manualStates:{...current.manualStates,[manualId]:{...current.manualStates?.[manualId],...state}}}));try{onHelperUpdate?.(helper);}catch{}return helper;}
 async function resolveManualId(helper,id){const saved=await allManuals();return locate(helper,id,saved)?.id||null;}
 async function getAnalyses(helper){const saved=await allManuals(),results=[];for(const id of helper.selectedManualIds){const record=locate(helper,id,saved);if(!record?.fileHash)continue;const blob=await getFile(record.id);if(!blob||blob.size!==record.bytes)continue;const analysis=await getAnalysis(record.fileHash);if(analysis?.usable)results.push({...analysis,manualId:id});}return results;}
 async function getIndexes(helper,{analyses}={}){
  const sources=analyses===undefined?await getAnalyses(helper):list(analyses),selected=new Set(helper.selectedManualIds),indexes=[];
  for(const analysis of sources){
   if(!analysis?.usable||!selected.has(analysis.manualId))continue;
   const expected=recordFor(helper,analysis.manualId)?.sha256||helper.manualStates?.[analysis.manualId]?.contentHash;
   if(expected&&analysis.contentHash!==expected)continue;
   const result=await loadIndex(analysis);if(result.index?.passages?.length)indexes.push(result.index);
  }
  return indexes;
 }
 async function inspect(helper){
  const saved=await allManuals(),store=await loadStore(),manuals=[],hashes=new Set(),indexHashes=new Set();let pdfBytes=0,indexBytes=0,sharedBytes=0,partialDownloadBytes=0,manualAdditionalBytes=0,unknownSizeCount=0;
  for(const id of helper.selectedManualIds){const definition=recordFor(helper,id),record=locate(helper,id,saved),state=helper.manualStates?.[id]||{},blob=record?await getFile(record.id):null,valid=!!(record?.fileHash&&blob&&blob.size===record.bytes),analysis=valid?await getAnalysis(record.fileHash):null,index=analysis?.usable?await read(quickManualIndexKey(analysis)):null,readable=!!analysis?.usable,indexed=!!(index&&index.version===MANUAL_RETRIEVAL_VERSION&&index.contentHash===record.fileHash&&index.processorVersion===MANUAL_ANALYSIS_VERSION&&index.passages?.length),checkedForHelper=state.status==='ready'&&state.contentHash===record?.fileHash&&state.processorVersion===MANUAL_ANALYSIS_VERSION,partial=await read(helperPartialKey(id));let status=valid?(readable?(indexed&&checkedForHelper?'ready':'preparing'):analysis?'unreadable':'preparing'):'missing';if(state.status==='failed')status='failed';if(active===helper.id&&['downloading','processing','indexing'].includes(state.status))status=state.status;
   const other=store.helpers.filter(h=>h.id!==helper.id&&(h.selectedManualIds.includes(id)||record?.fileHash&&Object.values(h.manualStates||{}).some(s=>s.contentHash===record.fileHash)));
   if(valid&&!hashes.has(record.fileHash)){hashes.add(record.fileHash);pdfBytes+=blob.size;if(other.length)sharedBytes+=blob.size;}
   if(index&&!indexHashes.has(record.fileHash)){indexHashes.add(record.fileHash);indexBytes+=byteSize(index)+byteSize(analysis);}
   partialDownloadBytes+=Number(partial?.bytes)||0;
   const expected=Number(definition?.bytes)||0,additional=valid?0:expected?Math.max(0,expected-(partial?.bytes||0)):null;if(additional===null)unknownSizeCount++;else manualAdditionalBytes+=additional;
   manuals.push({id,record:definition||record||{id,title:id},storedManualId:record?.id||null,status,ready:status==='ready',required:helper.requiredManualIds.includes(id),bytes:valid?blob.size:0,additionalBytes:additional,partialBytes:partial?.bytes||0,contentHash:record?.fileHash||null,pageCount:analysis?.pageCount||0,readable,sharedWith:other.map(h=>({id:h.id,name:h.name})),error:status==='unreadable'?(analysis.quality?.warning||'This PDF could not be read reliably.'):['failed','missing'].includes(status)?state.error||(!definition?.url?'No downloadable PDF is linked.':null):null});
  }
  for(const id of helper.requiredManualIds)if(!helper.selectedManualIds.includes(id))manuals.push({id,record:recordFor(helper,id)||{id,title:id},status:'not-selected',ready:false,required:true,bytes:0,error:'A required document was not selected.'});
  const [model,processing,storage]=await Promise.all([modelReadiness(),processingReadiness(),estimate?.()]);
  const missing=manuals.filter(m=>!m.ready),docsReady=helper.selectedManualIds.length>0&&!missing.length,aiAvailable=model.supported!==false&&!model.error&&!model.lastRuntimeError,engineReady=aiAvailable&&model.ready===true,offlineReady=docsReady&&engineReady&&processing.ready===true;
  const status=active===helper.id?'Preparing':!helper.selectedManualIds.length||missing.some(m=>['missing','failed','unreadable','not-selected'].includes(m.status))?'Missing manuals':!aiAvailable||!model.installed?'AI unavailable':!offlineReady?'Preparing':'Ready offline';
  const conversationBytes=byteSize(helper),modelAdditionalBytes=model.downloadBytes||0,processingAdditionalBytes=processing.downloadBytes||0;
  return {status,label:status,offlineReady,docsReady,aiAvailable,engineReady,manuals,missing,usedBytes:pdfBytes+indexBytes+conversationBytes+partialDownloadBytes,pdfBytes,indexBytes,conversationBytes,partialDownloadBytes,sharedBytes,exclusiveBytes:pdfBytes-sharedBytes+conversationBytes+partialDownloadBytes,manualAdditionalBytes,modelAdditionalBytes,processingAdditionalBytes,additionalBytes:manualAdditionalBytes+modelAdditionalBytes+processingAdditionalBytes,unknownSizeCount,model,processing,storage:storage||null,sharedModelBytes:list(model.files).reduce((sum,f)=>sum+(f.savedBytes||0),0),message:offlineReady?'Selected PDFs, indexes and the shared local engine have been checked on this device.':!docsReady?missing.every(m=>m.status==='preparing')?'Prepare the selected manuals to check their PDF hashes and indexes for this helper.':'Download and prepare the missing or unreadable selected manuals.':!engineReady?model.message:'The offline app/PDF runtime still needs to finish preparing.'};
 }
 async function prepare(helper,{signal,onProgress,downloadModel=false}={}){
  if(active)throw code('HELPER_BUSY','Another helper is being prepared. Cancel or finish it before starting this one.');active=helper.id;let current=copy(helper),completed=0;const failed=[];let cancelled=false;
  try{
   for(const id of current.selectedManualIds){check(signal);const record=recordFor(current,id)||((await allManuals()).find(r=>r.id===id));if(!record){current=await patch(current.id,id,{status:'failed',error:'This document is no longer in the catalogue. Add a readable PDF copy.',errorCode:'MANUAL_UNAVAILABLE'});failed.push({id,error:'Missing catalogue document'});continue;}
    try{
     current=await patch(current.id,id,{status:'downloading',error:null,errorCode:null});report(onProgress,{phase:'download',manualId:id,documentNumber:completed+1,totalDocuments:current.selectedManualIds.length,message:'Preparing '+record.title});
     const result=await downloads.download(record,{signal,onProgress:progress=>report(onProgress,{...progress,documentNumber:completed+1,totalDocuments:current.selectedManualIds.length})});check(signal);await refreshSaved();
     current=await patch(current.id,id,{status:'processing',storedManualId:result.record.id,contentHash:result.record.fileHash,bytes:result.blob.size,error:null});
     const analysis=await analyse({blob:result.blob,record:{...record,id},signal,onProgress:progress=>report(onProgress,{...progress,manualId:id,documentNumber:completed+1,totalDocuments:current.selectedManualIds.length})});check(signal);
     current=await patch(current.id,id,{status:'indexing'});const indexed=await loadIndex({...analysis,manualId:id});check(signal);if(!indexed.persisted||!indexed.index?.passages?.length)throw code('MANUAL_INDEXING_FAILED',indexed.error?.message||'This manual has no reliable searchable sections.');
     current=await patch(current.id,id,{status:'ready',processorVersion:analysis.processorVersion,contentHash:analysis.contentHash,storedManualId:result.record.id,pageCount:analysis.pageCount,indexedAt:Date.now(),error:null,errorCode:null});completed++;
    }catch(error){if(error.name==='AbortError'){cancelled=true;current=await patch(current.id,id,{status:'pending',error:'Preparation paused. Completed files and chunks are retained.',errorCode:'CANCELLED'});break;}const failure=normalizedFailure(error);current=await patch(current.id,id,{status:failure.code==='UNREADABLE_MANUAL'?'unreadable':'failed',error:failure.message,errorCode:failure.code});failed.push({id,error:failure.message,code:failure.code});if(failure.code==='STORAGE_UNAVAILABLE')break;}
   }
   if(downloadModel&&!cancelled){check(signal);report(onProgress,{phase:'resources',message:'Preparing the shared PDF and OCR resources…'});await prepareProcessing({signal,onProgress});check(signal);report(onProgress,{phase:'model',message:'Preparing the shared local AI engine…'});await prepareModel({signal,onProgress});}
  }catch(error){if(error.name==='AbortError')cancelled=true;else failed.push({id:null,error:error.message,code:error.code||'RESOURCE_PREPARATION_FAILED'});}
  finally{active=null;await refreshSaved();}
  current=(await loadStore()).helpers.find(h=>h.id===helper.id)||current;const inspection=await inspect(current);return {helper:current,inspection,completed,failed,cancelled};
 }
 async function removeManual(id){const record=(await allManuals()).find(r=>r.id===id),references=await manualHelperReferences(id,{contentHash:record?.fileHash});if(references.length)throw code('MANUAL_IN_USE','This PDF is used by '+references.map(h=>h.name).join(', ')+'. Remove it from those helpers first.');await db.removeManual(id);await refreshSaved();return {removed:true};}
 return {inspect,prepare,getIndexes,getAnalyses,resolveManualId,removeManual,get active(){return active;}};
}
