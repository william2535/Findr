import {LOCAL_MODEL,LOCAL_MODEL_FILES,LOCAL_MODEL_CHUNK_BYTES,localModelPartCount,localModelPartBytes} from './local-language-resources.mjs';
import {openModelCache,assertModelCacheWritable,inspectModelFile,modelPartKey,modelVerifiedKey,modelError} from './local-language-cache.mjs';
import {sha256} from './vendor/local-language/hashes/sha2.js';

export const MODEL_DOWNLOAD_TIMEOUTS=Object.freeze({connectMs:30000,readMs:30000,storageMs:15000,verifyMs:15000});
const hex=bytes=>Array.from(bytes,value=>value.toString(16).padStart(2,'0')).join('');
const abortError=()=>new DOMException('Local model download cancelled. Completed chunks are retained.','AbortError');
const discard=response=>{try{const pending=response?.body?.cancel();pending?.catch?.(()=>{});}catch{/* Cancellation must never keep the operation waiting. */}};
const retryable=error=>['MODEL_DOWNLOAD_TIMEOUT','MODEL_NETWORK_ERROR','MODEL_DOWNLOAD_INTERRUPTED'].includes(error?.code);

/** Download pinned files into the existing 8 MiB cache parts. Inference is not
 * started here. Dependencies are injectable for transport/storage regressions. */
export async function downloadModelPack({files=LOCAL_MODEL_FILES,model=LOCAL_MODEL,cache,fetchImpl=globalThis.fetch,onProgress,signal,timeouts={},maxRetries=2,retryDelayMs=1000,progressIntervalMs=200,now=()=>Date.now()}={}){
 const limits=Object.fromEntries(Object.entries(MODEL_DOWNLOAD_TIMEOUTS).map(([key,value])=>[key,Number.isFinite(timeouts[key])&&timeouts[key]>0?timeouts[key]:value]));
 const retries=Math.max(0,Math.min(3,Number.isInteger(maxRetries)?maxRetries:2)),operation=new AbortController();
 let stopped=false,terminalError=null,receivedBytes=0,savedBytes=0,savedBytesKnown=false,lastProgress=-Infinity;
 const totalBytes=files.reduce((sum,file)=>sum+file.bytes,0);
 const stop=error=>{terminalError=error;operation.abort(error);};
 const parentAbort=()=>stop(abortError());
 signal?.addEventListener('abort',parentAbort,{once:true});if(signal?.aborted)parentAbort();
 const check=()=>{if(stopped||operation.signal.aborted)throw terminalError||abortError();};
 function emit(value,force=false){
  check();const time=now();if(!force&&time-lastProgress<progressIntervalMs)return;lastProgress=time;
  try{onProgress?.({...value,...(savedBytesKnown?{bytes:savedBytes}:{}),savedBytesKnown,totalBytes,receivedBytes});}catch{/* UI callbacks do not own download state. */}
 }
 function bounded(task,timeoutMs,error,{onTimeout,onLate}={}){
  check();return new Promise((resolve,reject)=>{
   let settled=false,timer;
   const finish=(failure,value)=>{if(settled){if(!failure)onLate?.(value);return;}settled=true;clearTimeout(timer);operation.signal.removeEventListener('abort',cancel);failure?reject(failure):resolve(value);};
   const cancel=()=>finish(terminalError||abortError());
   operation.signal.addEventListener('abort',cancel,{once:true});
   timer=setTimeout(()=>{finish(error);onTimeout?.(error);},timeoutMs);
   Promise.resolve().then(()=>{if(settled)return;check();return task();}).then(value=>finish(null,value),failure=>finish(failure));
  });
 }
 async function storage(task,message='Local model storage could not finish. Completed chunks are retained; check free space and retry.'){
  const timeout=modelError('MODEL_STORAGE_TIMEOUT','Saving or checking a model chunk stalled. Completed chunks are retained. Retry without clearing FINDR storage.');
  try{return await bounded(task,limits.storageMs,timeout,{onTimeout:stop,onLate:discard});}
  catch(error){if(error?.name==='AbortError'||error?.code==='MODEL_STORAGE_TIMEOUT'){if(error.code==='MODEL_STORAGE_TIMEOUT'&&!operation.signal.aborted)stop(error);throw error;}if(error?.code)throw error;throw modelError('STORAGE_UNAVAILABLE',message,error);}
 }
 const cacheOptions=()=>({signal:operation.signal,timeoutMs:limits.storageMs});
 async function delay(ms){if(ms<=0){check();return;}await bounded(()=>new Promise(resolve=>setTimeout(resolve,ms)),ms+1000,modelError('MODEL_DOWNLOAD_TIMEOUT','The retry could not resume. Completed chunks are retained.'));}
 async function savePart(file,index,bytes,missing,details){
  check();if(!missing.has(index))return;
  emit({...details,phase:'saving',message:`Saving model part ${index+1} of ${localModelPartCount(file)}: ${file.path}`,partIndex:index,partCount:localModelPartCount(file),partReceived:bytes.byteLength,partTotal:bytes.byteLength,completed:index,total:localModelPartCount(file)},true);
  await storage(()=>cache.put(modelPartKey(file,index),new Response(bytes,{headers:{'x-findr-part-bytes':String(bytes.byteLength),'content-type':'application/octet-stream'}})));
  check();missing.delete(index);savedBytes+=bytes.byteLength;
  emit({...details,phase:'saving',message:`Saved model part ${index+1} of ${localModelPartCount(file)}: ${file.path}`,partIndex:index,partCount:localModelPartCount(file),partReceived:bytes.byteLength,partTotal:bytes.byteLength,completed:index+1,total:localModelPartCount(file)},true);
 }
 async function readStream(response,file,index,missing,requestController,attempt,fullFile){
  const reader=response.body?.getReader();if(!reader)throw modelError('MODEL_UNSUPPORTED','This browser cannot stream the model download. Saved manuals and conversations remain available.');
  let part=fullFile?0:index,used=0,position=fullFile?0:index*LOCAL_MODEL_CHUNK_BYTES;
  const expectedEnd=fullFile?file.bytes:position+localModelPartBytes(file,index),fallback=fullFile&&(index>0||localModelPartCount(file)>1);
  let writingPart=missing.has(part),buffer=writingPart?new Uint8Array(localModelPartBytes(file,part)):null,readDeadline=now()+limits.readMs;
  const progress=force=>emit({phase:'download',file:file.path,attempt,fallback,reread:!writingPart,partIndex:part,partCount:localModelPartCount(file),partReceived:used,partTotal:localModelPartBytes(file,part),completed:position,total:file.bytes,message:fallback?(writingPart?`The host resumed from the start; downloading remaining parts: ${file.path}`:`The host resumed from the start; rereading saved bytes: ${file.path}`):`Downloading local model: ${file.path}`},force);
  progress(true);
  try{
   for(;;){
    check();let item;
    try{const remaining=readDeadline-now();if(remaining<=0)throw modelError('MODEL_DOWNLOAD_TIMEOUT','The model connection stopped sending bytes. Retrying from saved chunks.');item=await bounded(()=>reader.read(),remaining,modelError('MODEL_DOWNLOAD_TIMEOUT','The model connection stopped sending bytes. Retrying from saved chunks.'),{onTimeout:()=>requestController.abort()});}
    catch(error){check();if(error?.code==='MODEL_DOWNLOAD_TIMEOUT')throw error;throw modelError('MODEL_NETWORK_ERROR','The model connection was interrupted. Completed chunks are retained.',error);}
    check();if(item.done)break;
    const value=item.value;if(!(value instanceof Uint8Array))throw modelError('MODEL_DOWNLOAD_RANGE_INVALID','The model host returned an unreadable response. No model was enabled.');
    if(value.byteLength)readDeadline=now()+limits.readMs;
    receivedBytes+=value.byteLength;
    if(position+value.byteLength>expectedEnd){emit({phase:'download',file:file.path,attempt,fallback,message:'The model host sent more bytes than the requested range.'},true);throw modelError('MODEL_DOWNLOAD_RANGE_INVALID','The model host sent more bytes than the requested range. No model was enabled.');}
    let offset=0;
    while(offset<value.byteLength){
     const partBytes=localModelPartBytes(file,part),amount=Math.min(partBytes-used,value.byteLength-offset);
     if(buffer)buffer.set(value.subarray(offset,offset+amount),used);offset+=amount;used+=amount;position+=amount;progress(false);
     if(used===partBytes&&fullFile){
      if(buffer){await savePart(file,part,buffer,missing,{file:file.path,attempt,fallback});readDeadline=now()+limits.readMs;}
      if(position<expectedEnd){part++;used=0;writingPart=missing.has(part);buffer=writingPart?new Uint8Array(localModelPartBytes(file,part)):null;}
     }
    }
   }
   if(position!==expectedEnd)throw modelError('MODEL_DOWNLOAD_INTERRUPTED','The model connection ended before this part was complete. Completed chunks are retained.');
   progress(true);
   // A 206 part is saved only after its exact body length and end are known.
   if(!fullFile&&buffer)await savePart(file,index,buffer,missing,{file:file.path,attempt,fallback:false});
  }finally{
   requestController.abort();try{reader.cancel()?.catch?.(()=>{});}catch{}try{reader.releaseLock();}catch{}
  }
 }
 async function fetchPart(file,index,missing,attempt){
  const start=index*LOCAL_MODEL_CHUNK_BYTES,end=start+localModelPartBytes(file,index)-1,controller=new AbortController(),cancel=()=>controller.abort();
  operation.signal.addEventListener('abort',cancel,{once:true});
  emit({phase:'download',file:file.path,attempt,partIndex:index,partCount:localModelPartCount(file),partReceived:0,partTotal:end-start+1,completed:savedBytes,total:totalBytes,message:`Connecting for model part ${index+1} of ${localModelPartCount(file)}: ${file.path}`},true);
  let response;
  try{
   try{response=await bounded(()=>fetchImpl(file.url,{headers:{Range:`bytes=${start}-${end}`},credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',signal:controller.signal}),limits.connectMs,modelError('MODEL_DOWNLOAD_TIMEOUT','The model host did not respond in time. Retrying from saved chunks.'),{onTimeout:()=>controller.abort(),onLate:discard});}
   catch(error){check();if(error?.code==='MODEL_DOWNLOAD_TIMEOUT')throw error;throw modelError('MODEL_NETWORK_ERROR','The model download could not connect. Completed chunks are retained.',error);}
   check();
   if(!response.ok)throw modelError('MODEL_DOWNLOAD_FAILED',`The model host returned HTTP ${response.status}. Completed chunks are retained; retry later.`);
   if(response.status===206){
    const range=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get('content-range')||'');
    if(!range||Number(range[1])!==start||Number(range[2])!==end||Number(range[3])!==file.bytes)throw modelError('MODEL_DOWNLOAD_RANGE_INVALID','The model host returned an unexpected byte range or file size. No model was enabled.');
   }else if(response.status!==200)throw modelError('MODEL_DOWNLOAD_RANGE_INVALID','The model host returned an unsupported download response. No model was enabled.');
   // A host ignoring Range is read once as a full file, retaining every newly
   // completed part. We never fetch that full response once per missing part.
   await readStream(response,file,index,missing,controller,attempt,response.status===200);
  }finally{controller.abort();operation.signal.removeEventListener('abort',cancel);discard(response);}
 }
 async function verifyFile(file){
  const hash=sha256.create();let checked=0;
  emit({phase:'verify',file:file.path,completed:0,total:file.bytes,message:`Verifying ${file.path}`},true);
  for(let index=0;index<localModelPartCount(file);index++){
   check();const response=await storage(()=>cache.match(modelPartKey(file,index)));if(!response)throw modelError('MODEL_RESOURCE_MISSING','A saved model chunk is missing. Resume the model download.');
   const reader=response.body?.getReader(),expected=localModelPartBytes(file,index),deadline=now()+limits.verifyMs;let partBytes=0;
   try{
    if(!reader)throw modelError('MODEL_INTEGRITY_FAILED','A saved model chunk has no readable body.');
    for(;;){
     const timeout=modelError('MODEL_STORAGE_TIMEOUT','Reading a saved model chunk stalled during verification. Completed chunks are retained.'),remaining=deadline-now();
     if(remaining<=0){stop(timeout);throw timeout;}
     const item=await bounded(()=>reader.read(),remaining,timeout,{onTimeout:stop});check();if(item.done)break;
     if(!(item.value instanceof Uint8Array)||partBytes+item.value.byteLength>expected)throw modelError('MODEL_INTEGRITY_FAILED','A saved model chunk has an unexpected size.');
     const started=now();hash.update(item.value);if(now()-started>limits.verifyMs)throw modelError('MODEL_VERIFY_TIMEOUT','Verifying a model chunk took too long on this device. Completed chunks are retained; retry.');
     partBytes+=item.value.byteLength;
    }
    if(partBytes!==expected)throw modelError('MODEL_INTEGRITY_FAILED','A saved model chunk is incomplete.');
   }catch(error){if(error?.code==='MODEL_INTEGRITY_FAILED'){await storage(()=>cache.delete(modelPartKey(file,index)));throw modelError('MODEL_INTEGRITY_FAILED','An incomplete model chunk was removed. Resume to repair the download.',error);}throw error;}
   finally{try{reader?.cancel()?.catch?.(()=>{});}catch{}try{reader?.releaseLock();}catch{}discard(response);}
   checked+=partBytes;emit({phase:'verify',file:file.path,completed:checked,total:file.bytes,partIndex:index,partCount:localModelPartCount(file),message:`Verifying ${file.path}`},true);
  }
  if(hex(hash.digest())!==file.sha256.toLowerCase()){
   // No per-part hashes are published. A mismatching file cannot retain trusted
   // parts; other pinned files and unrelated FINDR data remain untouched.
   for(let index=0;index<localModelPartCount(file);index++)await storage(()=>cache.delete(modelPartKey(file,index)));
   throw modelError('MODEL_INTEGRITY_FAILED','The model file did not match its pinned SHA-256. Only that invalid file’s chunks were removed. Retry its download.');
  }
  await storage(()=>cache.put(modelVerifiedKey(file),new Response(JSON.stringify({sha256:file.sha256,bytes:file.bytes,parts:localModelPartCount(file),verifiedAt:Date.now()}),{headers:{'content-type':'application/json'}})));
 }
 try{
  check();if(!files.length||files.some(file=>!Number.isSafeInteger(file.bytes)||file.bytes<=0||!/^[a-f0-9]{64}$/i.test(file.sha256)||typeof file.url!=='string'))throw modelError('MODEL_REQUEST_INVALID','The pinned local model manifest is invalid.');
  emit({phase:'checking',message:'Checking saved model chunks…'},true);
  cache||=await openModelCache(cacheOptions());check();await assertModelCacheWritable(cache,cacheOptions());check();
  const states=[];for(const file of files){check();const status=await inspectModelFile(cache,file,cacheOptions());states.push(status);savedBytes+=status.savedBytes;}
  savedBytesKnown=true;
  emit({phase:'checking',completed:savedBytes,total:totalBytes,message:'Saved model chunks checked. Resuming only missing parts.'},true);
  for(let fileIndex=0;fileIndex<files.length;fileIndex++){
   check();const file=files[fileIndex],status=states[fileIndex];if(status.ready)continue;
   await storage(()=>cache.delete(modelVerifiedKey(file)));
   const missing=new Set(status.missingParts);
   while(missing.size){
    let attempt=1;
    for(;;){
     check();const index=Math.min(...missing);
     try{await fetchPart(file,index,missing,attempt);break;}
     catch(error){
      check();if(!retryable(error))throw error;
      if(attempt>retries)throw modelError(error.code,`The model connection ${error.code==='MODEL_DOWNLOAD_TIMEOUT'?'stalled':'was interrupted'}. Completed chunks are retained. Resume the download to try again.`,error);
      emit({phase:'retry',file:file.path,attempt:attempt+1,retry:attempt,maxRetries:retries,partIndex:missing.size?Math.min(...missing):index,partCount:localModelPartCount(file),message:`Connection interrupted. Retry ${attempt} of ${retries}; completed chunks are kept.`},true);
      await delay(Math.max(0,retryDelayMs)*attempt);attempt++;
      // A full-response fallback may have saved its final part before its
      // network stream failed to close. Hash verification still decides readiness.
      if(!missing.size)break;
     }
    }
   }
   await verifyFile(file);
  }
  check();return {installed:true,modelId:model.id,revision:model.revision,bytes:totalBytes,receivedBytes};
 }catch(error){if(!operation.signal.aborted)stop(error);throw error;}
 finally{stopped=true;signal?.removeEventListener('abort',parentAbort);}
}
