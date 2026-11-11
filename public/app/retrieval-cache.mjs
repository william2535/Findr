import {setting,setSetting} from './db.mjs';
import {buildManualIndex,MANUAL_RETRIEVAL_VERSION} from './manual-retrieval.mjs';

const flights=new WeakMap();
const text=value=>String(value??'');
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const strings=value=>Array.isArray(value)&&value.every(item=>typeof item==='string');
const failure=(code,message,cause)=>Object.assign(new Error(message,{cause}),{code});

export function quickManualIndexKey(analysis){return `manual-retrieval:${MANUAL_RETRIEVAL_VERSION}:${text(analysis?.processorVersion)}:${text(analysis?.contentHash)}`;}
function valid(index,analysis){
 if(!object(index)||index.schemaVersion!==1||index.version!==MANUAL_RETRIEVAL_VERSION||index.contentHash!==analysis.contentHash||index.processorVersion!==text(analysis.processorVersion)||!strings(index.vocabulary)||!Array.isArray(index.passages)||!index.passages.length||!Number.isFinite(index.averageLength)||index.averageLength<=0)return false;
 const pages=new Map((Array.isArray(analysis.pages)?analysis.pages:[]).filter(p=>p&&p.quality?.readable!==false&&typeof p.text==='string').map(p=>[p.page,p.text.replace(/\u0000/g,'')]));
 const ids=new Set();
 return index.passages.every(p=>object(p)&&p.contentHash===analysis.contentHash&&p.processorVersion===text(analysis.processorVersion)&&typeof p.id==='string'&&p.id.length>0&&Number.isInteger(p.page)&&p.page>0&&typeof p.text==='string'&&p.text.trim().length>0&&pages.get(p.page)?.includes(p.text)&&!ids.has(p.id)&&(ids.add(p.id),true)&&strings(p.tokens)&&object(p.frequencies)&&Object.values(p.frequencies).every(value=>Number.isFinite(value)&&value>0)&&Number.isFinite(p.length)&&p.length>0);
}
function workerPayload(analysis){
 const pages=Array.isArray(analysis.pages)?analysis.pages.map(page=>page?{page:page.page,text:page.text,quality:page.quality,method:page.method,confidence:page.confidence,printedPage:page.printedPage,printedPageLabel:page.printedPageLabel,section:page.section,sectionTitle:page.sectionTitle}:null):[];
 return {manualId:analysis.manualId,id:analysis.id,contentHash:analysis.contentHash,processorVersion:analysis.processorVersion,title:analysis.title,filename:analysis.filename,usable:analysis.usable,pageCount:analysis.pageCount,identity:analysis.identity,equipmentRole:analysis.equipmentRole,pages};
}
async function buildOffThread(analysis,{builder,workerFactory,workerTimeoutMs=45000}={}){
 if(!builder&&!workerFactory&&typeof globalThis.Worker!=='function')return {index:buildManualIndex(analysis),backend:'main-thread',error:null};
 try{
  let index;
  if(builder)index=await builder(analysis);
  else index=await new Promise((resolve,reject)=>{
   let worker,timer,finished=false;
   const id=globalThis.crypto?.randomUUID?.()||`index-${Date.now()}-${Math.random().toString(36).slice(2)}`;
   const finish=(error,value)=>{if(finished)return;finished=true;clearTimeout(timer);if(worker){worker.onmessage=null;worker.onerror=null;worker.terminate();}error?reject(error):resolve(value);};
   try{
    const factory=workerFactory||((url,options)=>new Worker(url,options));
    worker=factory(new URL('./retrieval-index.worker.mjs',import.meta.url),{type:'module',name:'findr-manual-index'});
    worker.onmessage=event=>{const reply=event.data;if(reply?.id!==id)return;if(reply.ok)finish(null,reply.index);else{const detail=reply.error||{};finish(failure('INDEX_WORKER_FAILED',detail.message||'The local indexing worker failed.',{name:detail.name||'Error',code:detail.code||'INDEX_WORKER_FAILED',stackFrames:Array.isArray(detail.stackFrames)?detail.stackFrames:[]}));}};
    worker.onerror=event=>{event.preventDefault?.();finish(failure('INDEX_WORKER_FAILED','The local indexing worker could not run.',event.error||new Error('Worker execution failed.')));};
    timer=setTimeout(()=>finish(failure('INDEX_WORKER_TIMEOUT','The local indexing worker did not finish in time.')),Math.max(1,Number(workerTimeoutMs)||45000));
    worker.postMessage({id,analysis:workerPayload(analysis)});
   }catch(error){finish(error);}
  });
  if(!valid(index,analysis))throw failure('INDEX_WORKER_INVALID','The indexing worker returned an unusable index.');
  return {index,backend:builder?'injected-builder':'worker',error:null};
 }catch(cause){return {index:buildManualIndex(analysis),backend:'main-thread-fallback',error:failure('INDEX_WORKER_FAILED','The local indexing worker was unavailable. Compatible indexing completed on this device; check the offline resources before retrying the worker.',cause)};}
}
function forManual(index,analysis){
 const next=structuredClone(index),manualId=analysis.manualId||analysis.id||index.manualId,title=analysis.title||analysis.filename||index.title;
 next.manualId=manualId;next.title=title;
 for(const passage of next.passages){passage.manualId=manualId;passage.title=title;if(analysis.equipmentRole!==undefined)passage.equipmentRole=analysis.equipmentRole;}
 return next;
}
function backendFlights(read,write){let writes=flights.get(read);if(!writes){writes=new WeakMap();flights.set(read,writes);}let map=writes.get(write);if(!map){map=new Map();writes.set(write,map);}return map;}

/**
 * Keep the derived search index next to FINDR's existing hash-keyed analysis.
 * Failure to cache derived data never discards the readable analysis or job.
 * The caller must display result.error when present; it is the original storage
 * exception, not an invented PDF error. No document text is logged here.
 */
export async function loadQuickManualIndex(analysis,{read=setting,write=setSetting,builder,workerFactory,workerTimeoutMs}={}){
 if(!object(analysis)||!text(analysis.contentHash).trim())return {index:buildManualIndex(analysis),reused:false,key:null,persisted:false,backend:'main-thread',error:failure('INDEX_SOURCE_ID_MISSING','The searchable manual has no content identity. Reprocess the saved PDF before storing its index.')};
 const key=quickManualIndexKey(analysis);
 if(analysis.usable===false)return {index:buildManualIndex(analysis),reused:false,key,persisted:false,backend:'main-thread',error:failure('INDEX_UNUSABLE','The current manual analysis is not usable. Keep the saved PDF and reprocess a readable copy before retrieving its instructions.')};
 const inFlight=backendFlights(read,write);
 if(!inFlight.has(key)){
  const operation=(async()=>{
   let existing,readError=null;
   try{existing=await read(key);}catch(error){readError=error;}
   if(valid(existing,analysis))return {index:existing,reused:true,key,persisted:true,backend:'cache',error:null};
   const built=await buildOffThread(analysis,{builder,workerFactory,workerTimeoutMs}),{index,backend}=built;
   if(!valid(index,analysis))return {index,reused:false,key,persisted:false,backend,error:failure('INDEX_UNUSABLE','No usable indexed passages were available. The saved PDF and conversation are unchanged.',readError)};
   try{await write(key,index);return {index,reused:false,key,persisted:true,backend,error:built.error||readError,...(built.error&&readError?{readError}:{})};}
   catch(error){return {index,reused:false,key,persisted:false,backend,error,...(readError?{readError}:{}),...(built.error?{buildError:built.error}:{})};}
  })();
  inFlight.set(key,operation);
  // A rejection from processing also releases the slot; a later retry may work.
  operation.then(()=>inFlight.delete(key),()=>inFlight.delete(key));
 }
 const result=await inFlight.get(key);return {...result,index:forManual(result.index,analysis)};
}
