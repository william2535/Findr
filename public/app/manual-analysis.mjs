import {setting, setSetting} from './db.mjs';
import {validatePDF} from './engine.mjs';
import {normalisePDFBlob,loadPDFBytes,loadPDFLibrary,pdfDocumentOptions,getPDFTextContent,getPDFRuntimeCapabilities,PDFJS_VERSION} from './pdf-runtime.mjs';
import {MANUAL_RESOURCES, MANUAL_RESOURCE_VERSION} from './manual-analysis-resources.mjs';
import {assessPageText, MANUAL_ANALYSIS_VERSION, MANUAL_ANALYSIS_SCHEMA} from './manual-analysis-core.mjs';
export {MANUAL_ANALYSIS_VERSION, MANUAL_ANALYSIS_SCHEMA, classifyManualPages, assessPageText, searchManualPages} from './manual-analysis-core.mjs';
export {MANUAL_RESOURCES, MANUAL_RESOURCE_VERSION} from './manual-analysis-resources.mjs';

const analysisKey = (hash,version=MANUAL_ANALYSIS_VERSION) => `manual-analysis:${version}:${hash}`;
const PREVIOUS_ANALYSIS_VERSIONS=['2026-11-10.2','2026-11-10.1'];
const resourceURL = path => new URL(path, import.meta.url).href;
const tick = () => new Promise(resolve=>setTimeout(resolve,0));
const abortError = () => new DOMException('Manual processing cancelled. The previous saved analysis remains unchanged.','AbortError');
const checkAbort = signal => {if(signal?.aborted)throw abortError();};
const progress = (callback, value) => {try{callback?.(value);}catch{/* A UI callback cannot corrupt processing. */}};
const codedError = (code,message,cause) => Object.assign(new Error(message,{cause}),{code});

/** Original exceptions are retained without logging document text or job fields. */
export function getManualProcessingErrorDetails(error){
  const describe=(value,depth=0)=>value&&depth<5?{name:value.name||'Error',message:String(value.message||value),stack:typeof value.stack==='string'?value.stack:null,...(typeof value.code==='string'?{code:value.code}:{}),...(value.cause?{cause:describe(value.cause,depth+1)}:{})}:null;
  return error?.diagnostic||{stage:error?.processingStage||'unknown',page:error?.processingPage||null,pdfjsVersion:PDFJS_VERSION,runtime:getPDFRuntimeCapabilities(),exception:describe(error)};
}
function retainError(error,{phase='unknown',page=0}={}){
  error.processingStage=phase;error.processingPage=page||null;
  error.diagnostic=getManualProcessingErrorDetails(error);
  // Only exception/stack/runtime metadata: never PDF page text, answers or filenames.
  console.error('[FINDR manual processing]',error.diagnostic);
  return error;
}
function workerError(value){const result=new Error(typeof value==='string'?value:value?.message||'The processing worker failed.');if(value&&typeof value==='object'){result.name=value.name||'Error';if(value.stack)result.stack=value.stack;if(typeof value.code==='string')result.code=value.code;}return result;}

/** Classify the failed operation, never guess document damage from a JS error. */
export function classifyManualProcessingError(error,{phase='pdf-read',page=0,passwordProtected=false,missingOfflineResources=false}={}){
  if(error?.name==='AbortError'||typeof error?.code==='string')return error;
  if(passwordProtected||error?.name==='PasswordException')return codedError('PDF_PASSWORD_PROTECTED','This PDF needs a password. Upload an authorised unlocked copy; the current job is unchanged.',error);
  if(error?.name==='InvalidPDFException')return codedError('INVALID_PDF','The PDF reader identified an invalid PDF structure. Download a complete PDF or upload another copy.',error);
  if(error?.name==='MissingPDFException')return codedError('MISSING_PDF','The saved PDF bytes are missing. Download the manual again or upload a copy.',error);
  if(/API version .*does not match.*Worker version/i.test(error?.message||''))return codedError('PDF_VERSION_MISMATCH','The PDF reader and worker come from different app versions. Reload FINDR to finish the update; your manual and conversation are saved.',error);
  if(missingOfflineResources)return codedError('OFFLINE_RESOURCES_MISSING','The required offline PDF/OCR software is not ready on this device. Reconnect and prepare the offline resources, then retry this same PDF.',error);
  if(/Setting up fake worker failed|Cannot load script at.*pdf\.worker|Failed to construct ['"]Worker['"]/i.test(error?.message||''))return codedError('PDF_RESOURCES_FAILED','The PDF worker could not load. Check or download the processing resources, then retry this saved PDF.',error);
  if(phase==='ocr-start'||phase==='ocr-recognize')return codedError('OCR_FAILED','The local OCR worker failed'+(page?' on page '+page:'')+'. Retry processing, or check the offline OCR resources. The PDF and current job have been kept.',error);
  if(phase==='indexing')return codedError('MANUAL_INDEXING_FAILED','The manual text was read, but local indexing failed. Retry processing; your saved manual and conversation are intact.',error);
  if(['TypeError','ReferenceError','SyntaxError'].includes(error?.name))return codedError('PDF_RUNTIME_FAILED','The PDF reader hit an error. Your manual and conversation are still saved. Retry, or open Error details.',error);
  if(phase==='rendering')return codedError('PDF_RENDER_FAILED','The PDF reader could not render page '+(page||'?')+'. Retry processing or inspect the page in another reader; the failure does not establish that the file is damaged.',error);
  if(phase==='pdf-software')return codedError('PDF_RESOURCES_FAILED','The local PDF reader could not load. Check or download the processing resources, then retry this PDF.',error);
  if(phase==='text-extraction')return codedError('PDF_EXTRACTION_FAILED','The PDF reader could not extract text'+(page?' from page '+page:'')+'. Retry or review the reader error details; your manual is saved.',error);
  return codedError('PDF_RUNTIME_FAILED','The PDF reader hit an error. Your manual and conversation are still saved. Retry, or open Error details.',error);
}

function abortable(promise,signal){
  if(!signal)return promise;
  if(signal.aborted){Promise.resolve(promise).catch(()=>{});throw abortError();}
  return new Promise((resolve,reject)=>{
    const aborted=()=>reject(abortError());signal.addEventListener('abort',aborted,{once:true});
    Promise.resolve(promise).then(resolve,reject).finally(()=>signal.removeEventListener('abort',aborted));
  });
}

export function getManualProcessingCapabilities(){
  const missing=[];
  if(typeof Worker==='undefined')missing.push('Web Workers');
  if(typeof WebAssembly==='undefined')missing.push('WebAssembly');
  if(!globalThis.crypto?.subtle)missing.push('secure file hashing');
  if(!globalThis.indexedDB)missing.push('IndexedDB local storage');
  if(!getPDFRuntimeCapabilities().readableStreams)missing.push('ReadableStream.getReader');
  if(typeof document==='undefined'||!document.createElement('canvas').getContext('2d'))missing.push('canvas PDF rendering');
  return {supported:!missing.length,missing,pdfRuntime:getPDFRuntimeCapabilities(),language:'English',localModel:false,engine:'PDF.js text extraction and Tesseract English OCR; deterministic diagnostic rules',
    deviceMemoryGB:globalThis.navigator?.deviceMemory??null,logicalProcessors:globalThis.navigator?.hardwareConcurrency??null,
    requiresSecureContext:true,notes:'OCR and identity suggestions need review. English OCR is installed; other scanned languages are not supported by this resource pack.'};
}

async function controllerStatus(){
  const controller=globalThis.navigator?.serviceWorker?.controller;
  if(!controller||controller.state!=='activated')return {ready:false,build:null,error:'service-worker-not-active'};
  return new Promise(resolve=>{
    const channel=new MessageChannel();let settled=false;
    const finish=value=>{if(settled)return;settled=true;clearTimeout(timer);channel.port1.close();resolve(value);};
    const timer=setTimeout(()=>finish({ready:false,build:null,error:'offline-check-timeout'}),8000);
    channel.port1.onmessage=event=>finish(event.data||{ready:false});
    controller.postMessage({type:'CHECK_OFFLINE'},[channel.port2]);
  });
}

let readinessInFlight=null;
export function getManualProcessingReadiness(){
  // Coalesce simultaneous UI checks without retaining a stale readiness claim.
  // An explicit later check always observes the current controller and cache.
  if(!readinessInFlight)readinessInFlight=readManualProcessingReadiness().finally(()=>{readinessInFlight=null;});
  return readinessInFlight;
}
async function readManualProcessingReadiness(){
  const capabilities=getManualProcessingCapabilities();
  const status=await controllerStatus();
  const cache=globalThis.caches&&status.build?await caches.open('findr-shell-'+status.build):null;
  const cachedURLs=new Set(cache?(await cache.keys()).map(request=>request.url):[]);
  const resources=MANUAL_RESOURCES.map(resource=>{
    const url=resourceURL(resource.path);
    return {...resource,url,cached:cachedURLs.has(url)};
  });
  const missing=resources.filter(r=>!r.cached);
  const offlineControlled=!!globalThis.navigator?.serviceWorker?.controller&&status.ready===true;
  return {supported:capabilities.supported,capabilities,ready:capabilities.supported&&offlineControlled&&!missing.length,
    resources,missing,downloadBytes:missing.reduce((sum,r)=>sum+r.bytes,0),totalBytes:resources.reduce((sum,r)=>sum+r.bytes,0),
    resourceVersion:MANUAL_RESOURCE_VERSION,offlineControlled,offlineStatus:status,
    message:!capabilities.supported?'This browser is missing '+capabilities.missing.join(', ')+'.':!offlineControlled?'FINDR’s verified offline app is still installing. Keep the app open online, then reload when the offline status is ready.':missing.length?'Download the missing PDF and English OCR resources before going offline.':'Ready for new text PDFs and English scanned PDFs offline.'};
}

export async function downloadManualProcessingResources({signal,onProgress}={}){
  const cancelled=()=>new DOMException('Offline-resource download cancelled. You can resume the download without replacing your PDF.','AbortError');
  const check=()=>{if(signal?.aborted)throw cancelled();};
  let before;try{before=await abortable(getManualProcessingReadiness(),signal);}catch(error){if(error?.name==='AbortError')throw cancelled();throw error;}
  if(!before.supported)throw codedError('UNSUPPORTED_BROWSER',before.message);
  let completed=0,bytes=0;
  for(const resource of before.resources){
    check();
    if(!resource.cached){
      progress(onProgress,{phase:'resources',message:'Downloading '+resource.path.split('/').at(-1),completed,total:before.resources.length,bytes,totalBytes:before.totalBytes});
      let response;try{response=await fetch(resource.url,{signal,cache:'reload'});}catch(cause){if(signal?.aborted||cause?.name==='AbortError')throw cancelled();throw codedError('RESOURCE_DOWNLOAD_FAILED','Could not download '+resource.path.split('/').at(-1)+'. Reconnect and retry the resource download; your PDF is unchanged.',cause);}
      if(!response.ok)throw codedError('RESOURCE_DOWNLOAD_FAILED','Could not download '+resource.path.split('/').at(-1)+'. Connect to the internet and try again.');
      const data=await response.arrayBuffer();check();
      const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(x=>x.toString(16).padStart(2,'0')).join('');
      if(hash!==resource.sha256)throw codedError('RESOURCE_INTEGRITY_FAILED','The downloaded processing resource did not match this FINDR release. Reload FINDR online before retrying.');
      // The active service worker also verifies and caches every fetch in its
      // versioned shell. No separate cache is advertised as offline-ready.
    }
    completed++;bytes+=resource.bytes;progress(onProgress,{phase:'resources',message:'Processing resources '+completed+' / '+before.resources.length,completed,total:before.resources.length,bytes,totalBytes:before.totalBytes});
  }
  return getManualProcessingReadiness();
}

export async function getManualAnalysis(contentHash,{processorVersion=MANUAL_ANALYSIS_VERSION}={}){
  if(!/^[a-f\d]{64}$/i.test(contentHash||''))return null;
  const value=await setting(analysisKey(contentHash,processorVersion));
  return value?.schemaVersion===MANUAL_ANALYSIS_SCHEMA&&value?.processorVersion===processorVersion&&value?.contentHash===contentHash?value:null;
}

async function analyseInWorker(payload,signal){
  checkAbort(signal);
  const worker=new Worker(new URL('./manual-analysis.worker.mjs',import.meta.url),{type:'module'});
  try{return await abortable(new Promise((resolve,reject)=>{
    worker.onmessage=({data})=>data.error?reject(workerError(data.error)):resolve(data.result);
    worker.onerror=event=>reject(new Error(event.message||'The manual indexing worker could not start.'));
    worker.postMessage({id:'analyse',operation:'analyse',payload});
  }),signal);}finally{worker.terminate();}
}

function createOCRWorker(onProgress){
  const worker=new Worker(new URL('./manual-analysis-ocr.worker.mjs',import.meta.url),{type:'module'});
  const pending=new Map();let nextId=0,closed=false;
  const fail=error=>{for(const request of pending.values())request.reject(error);pending.clear();};
  worker.onmessage=({data})=>{
    if(data.type==='progress'){onProgress(data.value);return;}
    const request=pending.get(data.id);if(!request)return;pending.delete(data.id);
    if(data.error)request.reject(workerError(data.error));else request.resolve(data.result);
  };
  worker.onerror=event=>{event.preventDefault();fail(new Error(event.message||'The local OCR worker failed.'));};
  const call=(operation,payload={},transfer=[])=>new Promise((resolve,reject)=>{
    if(closed){reject(abortError());return;}const id=++nextId;pending.set(id,{resolve,reject});
    try{worker.postMessage({id,operation,...payload},transfer);}catch(error){pending.delete(id);reject(error);}
  });
  return {initialize:()=>call('initialize'),recognize:image=>call('recognize',{image},[image]),
    terminate:async()=>{if(closed)return;closed=true;worker.terminate();fail(abortError());}};
}

/**
 * Process a locally supplied PDF once. Completed analysis is saved atomically
 * under its hash; cancellations, failed reads and failed saves never replace it.
 * No network operation is performed except loading same-origin software assets.
 */
export async function analyseManual({blob,record={},signal,onProgress,force=false}={}){
  const started=performance.now();checkAbort(signal);
  const capabilities=getManualProcessingCapabilities();
  if(!capabilities.supported)throw codedError('UNSUPPORTED_BROWSER','Offline manual processing needs '+capabilities.missing.join(', ')+'.');
  try{blob=await normalisePDFBlob(blob);}catch(error){throw retainError(error,{phase:'bytes'});}
  progress(onProgress,{phase:'checking',message:'Checking the PDF and looking for a saved analysis…',completed:0,total:null});
  let contentHash;try{contentHash=await abortable(validatePDF(blob),signal);}catch(error){if(error?.name==='AbortError')throw error;throw retainError(codedError(blob.size>120*1024*1024?'MANUAL_TOO_LARGE':'INVALID_PDF',error.message,error),{phase:'validation'});}checkAbort(signal);
  let cached;
  try{cached=!force&&await getManualAnalysis(contentHash);}catch(cause){throw codedError('STORAGE_UNAVAILABLE','Device storage is unavailable. The manual cannot be saved for a reliable offline visit.',cause);}
  if(cached){
    progress(onProgress,{phase:'complete',message:'Reusing the saved manual analysis.',completed:cached.pageCount,total:cached.pageCount,reused:true});
    if(!cached.usable)throw Object.assign(codedError('UNREADABLE_MANUAL',cached.quality.warning),{analysis:cached});
    return {...cached,manualId:record.id||cached.manualId,reused:true,timing:{...cached.timing,cacheLookupMs:Math.round(performance.now()-started)}};
  }
  if(!force){
    // Keep historical versions for saved job references. Re-index already read
    // pages into a new record instead of reopening or OCRing the PDF again.
    let previous;
    try{for(const version of PREVIOUS_ANALYSIS_VERSIONS){previous=await getManualAnalysis(contentHash,{processorVersion:version});if(previous?.pages?.length)break;}}
    catch(cause){throw codedError('STORAGE_UNAVAILABLE','The previous manual analysis could not be loaded. Your manual and saved visits are unchanged.',cause);}
    if(previous?.pages?.length){
      checkAbort(signal);progress(onProgress,{phase:'indexing',message:'Updating equipment suggestions from the saved page text…',completed:previous.pageCount,total:previous.pageCount,reused:true});
      let updated;
      try{updated=await analyseInWorker({pages:previous.pages,record:{id:previous.manualId,title:previous.title,filename:previous.filename,...record},contentHash,pageCount:previous.pageCount,
        timing:{...previous.timing},processedAt:previous.processedAt},signal);}
      catch(error){if(error?.name==='AbortError')throw error;throw retainError(classifyManualProcessingError(error,{phase:'indexing'}),{phase:'indexing'});}
      updated.documentMetadata=previous.documentMetadata||{};
      updated.reindexedFrom={processorVersion:previous.processorVersion,processedAt:previous.processedAt};
      updated.reindexedAt=Date.now();updated.timing.reindexMs=Math.round(performance.now()-started);
      checkAbort(signal);
      try{await setSetting(analysisKey(contentHash),updated);}catch(cause){throw codedError('STORAGE_UNAVAILABLE','The updated manual index could not be saved. The original pages and saved visits remain unchanged.',cause);}
      checkAbort(signal);progress(onProgress,{phase:'complete',message:'Reused saved text and updated the equipment suggestions.',completed:updated.pageCount,total:updated.pageCount,reused:true});
      if(!updated.usable)throw Object.assign(codedError('UNREADABLE_MANUAL',updated.quality.warning),{analysis:updated});
      return {...updated,reused:true};
    }
  }
  let documentTask,doc,ocr,renderTask,canvas,index=0,total=0,documentMetadata={},phase='pdf-software',passwordProtected=false;
  const pages=[];let extractionMs=0,ocrMs=0;
  const cleanup=()=>{renderTask?.cancel();ocr?.terminate().catch(()=>{});documentTask?.destroy().catch(()=>{});};
  signal?.addEventListener('abort',cleanup,{once:true});
  try{
    const lib=await abortable(loadPDFLibrary(),signal);
    phase='pdf-read';documentTask=lib.getDocument(pdfDocumentOptions(await abortable(loadPDFBytes(blob),signal)));
    documentTask.onPassword=()=>{passwordProtected=true;documentTask.destroy();};
    doc=await abortable(documentTask.promise,signal);total=doc.numPages;
    try{const metadata=await abortable(doc.getMetadata(),signal);documentMetadata=Object.fromEntries(Object.entries(metadata.info||{}).filter(([,value])=>['string','number','boolean'].includes(typeof value)));}catch(error){checkAbort(signal);/* Missing metadata does not discard readable page evidence. */}
    if(total>1500)throw codedError('MANUAL_TOO_LARGE','This PDF has more than 1,500 pages. Upload the relevant equipment manual or chapter to keep processing practical on a phone.');
    for(index=1;index<=total;index++){
      phase='pdf-read';checkAbort(signal);progress(onProgress,{phase:'text',message:`Reading PDF text · page ${index} of ${total}`,page:index,pages:total,completed:index-1,total});
      const textStart=performance.now(),page=await abortable(doc.getPage(index),signal);
      try{
        phase='text-extraction';const content=await getPDFTextContent(page,{disableNormalization:false,signal});
        let text=content.items.filter(item=>typeof item.str==='string').map(item=>item.str+(item.hasEOL?'\n':' ')).join('').trim();
        extractionMs+=performance.now()-textStart;
        let method='text',confidence=null,quality=assessPageText(text);
        if(!quality.readable){
          const ocrStart=performance.now();
          if(!ocr){
            phase='ocr-start';progress(onProgress,{phase:'ocr-start',message:'Starting the local English OCR worker…',page:index,pages:total,completed:index-1,total});
            ocr=createOCRWorker(value=>progress(onProgress,{phase:'ocr',message:`Reading scanned page ${index} of ${total} · ${value.status}`,page:index,pages:total,completed:index-1,total,
              pageProgress:value.status==='recognizing text'?Math.max(0,Math.min(1,Number(value.progress)||0)):0,stageProgress:Math.max(0,Math.min(1,Number(value.progress)||0))}));
            await abortable(ocr.initialize(),signal);
          }
          phase='rendering';progress(onProgress,{phase:'rendering',message:`Rendering scanned page ${index} of ${total} for local OCR…`,page:index,pages:total,completed:index-1,total});
          const base=page.getViewport({scale:1});
          // Bound the canvas independently of document page size. One page and
          // one OCR worker live at a time, including on low-memory phones.
          const maxEdge=globalThis.navigator?.deviceMemory&&navigator.deviceMemory<=2?1600:2200;
          const scale=Math.min(2.6,maxEdge/Math.max(base.width,base.height),Math.sqrt(4_000_000/(base.width*base.height)));
          const viewport=page.getViewport({scale});canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
          const context=canvas.getContext('2d',{alpha:false});context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
          renderTask=page.render({canvasContext:context,viewport,background:'#fff',intent:'display'});
          renderTask.onContinue=continueRendering=>setTimeout(()=>{if(!signal?.aborted)continueRendering();},0);
          await abortable(renderTask.promise,signal);renderTask=null;
          const image=await abortable(new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('The scanned page could not be rendered for OCR.')),'image/png')),signal);
          phase='ocr-recognize';const result=await abortable(ocr.recognize(await abortable(image.arrayBuffer(),signal)),signal);
          text=String(result.text||'').trim();confidence=Number(result.confidence)||0;method='ocr';quality=assessPageText(text,{method,confidence});
          ocrMs+=performance.now()-ocrStart;
          canvas.width=canvas.height=0;canvas=null;
        }
        pages.push({page:index,text,method,confidence,quality});
      }finally{page.cleanup();}
      progress(onProgress,{phase:'page-complete',message:`Read ${index} of ${total} pages`,page:index,pages:total,completed:index,total});
      await tick();
    }
    checkAbort(signal);progress(onProgress,{phase:'indexing',message:'Identifying the equipment and indexing page references locally…',completed:total,total});
    phase='indexing';const indexingStart=performance.now();
    const analysis=await analyseInWorker({pages,record:{...record,filename:record.filename||blob.name||null},contentHash,pageCount:total,
      timing:{extractionMs:Math.round(extractionMs),ocrMs:Math.round(ocrMs)},processedAt:Date.now()},signal);
    analysis.documentMetadata=documentMetadata;
    analysis.timing={...analysis.timing,indexingMs:Math.round(performance.now()-indexingStart),totalMs:Math.round(performance.now()-started)};
    checkAbort(signal);progress(onProgress,{phase:'saving',message:'Saving searchable text and page references on this device…',completed:total,total});
    try{await setSetting(analysisKey(contentHash),analysis);}catch(cause){throw codedError('STORAGE_UNAVAILABLE','The manual was read, but its analysis could not be saved. Free device storage and retry; the last saved analysis and visits are unchanged.',cause);}
    checkAbort(signal);progress(onProgress,{phase:'complete',message:analysis.usable?'Manual ready. Confirm the equipment before continuing.':'The manual needs a clearer copy or relevant pages.',completed:total,total});
    if(!analysis.usable)throw Object.assign(codedError('UNREADABLE_MANUAL',analysis.quality.warning),{analysis});
    return analysis;
  }catch(error){
    if(signal?.aborted||error?.name==='AbortError')throw abortError();
    if(typeof error?.code==='string')throw retainError(error,{phase,page:index});
    let missingOfflineResources=false;
    if(globalThis.navigator?.onLine===false&&['pdf-software','ocr-start','indexing'].includes(phase)){
      try{const readiness=await getManualProcessingReadiness();missingOfflineResources=readiness.missing.length>0;}catch{/* A readiness error does not establish a missing file. */}
    }
    throw retainError(classifyManualProcessingError(error,{phase,page:index,passwordProtected,missingOfflineResources}),{phase,page:index});
  }finally{
    signal?.removeEventListener('abort',cleanup);renderTask?.cancel();
    if(canvas)canvas.width=canvas.height=0;
    if(ocr)await ocr.terminate().catch(()=>{});
    if(doc)await doc.destroy().catch(()=>{});else if(documentTask)await documentTask.destroy().catch(()=>{});
  }
}
