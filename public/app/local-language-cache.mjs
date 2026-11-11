import {LOCAL_MODEL,LOCAL_MODEL_CACHE,LOCAL_MODEL_FILES,LOCAL_MODEL_CHUNK_BYTES,localModelPartCount,localModelPartBytes} from './local-language-resources.mjs';
export const modelError=(code,message,cause)=>Object.assign(new Error(message,{cause}),{code});
const storageTimeoutMessage='Checking or saving local model files stopped responding. Completed parts are retained. Check saved files or resume the download.';
const abortError=()=>new DOMException('Local model operation cancelled. Completed parts are retained.','AbortError');
export function releaseModelResponse(response){try{response?.body?.cancel()?.catch(()=>{});}catch{/* A consumed or locked response has its own reader. */}}
/** Cache Storage has no abort API. Bound the wait and ignore late results so a
 * cancelled check cannot continue into more work. Never delete model parts. */
export function awaitModelStorage(task,{signal,timeoutMs=15000,message=storageTimeoutMessage}={}){
 if(signal?.aborted)return Promise.reject(abortError());
 return new Promise((resolve,reject)=>{
  let settled=false;
  const finish=(error,value)=>{if(settled){if(!error)releaseModelResponse(value);return;}settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);error?reject(error):resolve(value);};
  const abort=()=>finish(abortError()),timer=setTimeout(()=>finish(modelError('MODEL_STORAGE_TIMEOUT',message)),timeoutMs);
  signal?.addEventListener('abort',abort,{once:true});
  Promise.resolve().then(()=>{if(signal?.aborted)throw abortError();return task();}).then(value=>finish(null,value),error=>finish(error));
 });
}
const origin=()=>globalThis.location?.origin||'https://findr.invalid';
export const modelPartKey=(file,index)=>`${origin()}/__findr-language/${file.sha256}/part-${index}`;
export const modelVerifiedKey=file=>`${origin()}/__findr-language/${file.sha256}/verified.json`;
export async function openModelCache(options){try{return await awaitModelStorage(()=>caches.open(LOCAL_MODEL_CACHE),options);}catch(error){if(error.name==='AbortError'||error.code==='MODEL_STORAGE_TIMEOUT')throw error;throw modelError('STORAGE_UNAVAILABLE','Local model storage is unavailable. Existing manuals and conversations have not been changed.',error);}}
/** Run only for an explicit download, never during app startup/readiness. */
export async function assertModelCacheWritable(cache,options){
 const key=`${origin()}/__findr-language/storage-probe-${globalThis.crypto.randomUUID()}`,bytes=new Uint8Array([70,73,78,68,82]);
 try{await awaitModelStorage(()=>cache.put(key,new Response(bytes)),options);const response=await awaitModelStorage(()=>cache.match(key),options);if(!response)throw new Error('Cache Storage did not retain the probe.');try{const stored=new Uint8Array(await awaitModelStorage(()=>response.arrayBuffer(),options));if(stored.length!==bytes.length||stored.some((value,index)=>value!==bytes[index]))throw new Error('Cache Storage did not preserve the probe bytes.');}finally{releaseModelResponse(response);}}
 catch(error){if(error.name==='AbortError'||error.code==='MODEL_STORAGE_TIMEOUT')throw error;throw modelError('STORAGE_UNAVAILABLE','This browser is not retaining local model downloads. No model download was started. Saved manuals and conversations are unchanged. Check browser storage or use labelled manual extracts.',error);}
 finally{try{Promise.resolve(cache.delete(key)).catch(()=>{});}catch{/* Cleanup is limited to this operation’s own small probe and cannot block cancellation. */}}
}
export async function inspectModelFile(cache,file,options){
 const marker=await awaitModelStorage(()=>cache.match(modelVerifiedKey(file)),options);let verified=false;
 if(marker){try{const data=await awaitModelStorage(()=>marker.json(),options);verified=data.sha256===file.sha256&&data.bytes===file.bytes&&data.parts===localModelPartCount(file);}catch(error){if(error.name==='AbortError'||error.code==='MODEL_STORAGE_TIMEOUT')throw error;/* Incomplete metadata is not readiness. */}finally{releaseModelResponse(marker);}}
 let savedBytes=0;const missingParts=[];
 for(let index=0;index<localModelPartCount(file);index++){
  const response=await awaitModelStorage(()=>cache.match(modelPartKey(file,index)),options);
  try{if(response&&Number(response.headers.get('x-findr-part-bytes'))===localModelPartBytes(file,index))savedBytes+=localModelPartBytes(file,index);else missingParts.push(index);}finally{releaseModelResponse(response);}
 }
 return {path:file.path,bytes:file.bytes,sha256:file.sha256,ready:verified&&!missingParts.length,verified,savedBytes,missingParts};
}
export async function readModelFileResponse(cache,file,options={}){
 const status=await inspectModelFile(cache,file,options);if(!status.ready)throw modelError('MODEL_RESOURCE_MISSING','The local model pack is incomplete. Resume its download before using local inference.');
 if(options.signal?.aborted)throw abortError();
 const operation=new AbortController(),timeoutMs=options.timeoutMs??15000,storageOptions={...options,signal:operation.signal};
 let index=0,partBytes=0,partReader=null,partResponse=null,closed=false,output;
 function releasePart(done=false){
  const reader=partReader,response=partResponse;partReader=null;partResponse=null;
  const unlock=()=>{try{reader?.releaseLock();}catch{}};
  if(!done){try{reader?.cancel()?.then(unlock,unlock);}catch{}}
  unlock();releaseModelResponse(response);
 }
 function stop(){if(closed)return;closed=true;operation.abort();options.signal?.removeEventListener('abort',cancel);releasePart();}
 function fail(error){if(closed)return;stop();output.error(error);}
 const cancel=()=>fail(abortError());
 async function invalidPart(remove,message){
  // Invalidate readiness first. A deletion timeout must never leave corrupt
  // bytes carrying an earlier successful verification marker.
  await awaitModelStorage(()=>cache.delete(modelVerifiedKey(file)),storageOptions);
  if(remove)await awaitModelStorage(()=>cache.delete(modelPartKey(file,index)),storageOptions);
  throw modelError('MODEL_RESOURCE_MISSING',message);
 }
 const stream=new ReadableStream({
  start(controller){output=controller;options.signal?.addEventListener('abort',cancel,{once:true});if(options.signal?.aborted)cancel();},
  async pull(controller){
   if(closed)return;let deadline=Date.now()+timeoutMs;
   try{for(;;){
    if(!partReader){
     if(index>=localModelPartCount(file)){stop();controller.close();return;}
     partResponse=await awaitModelStorage(()=>cache.match(modelPartKey(file,index)),storageOptions);
     if(closed){releaseModelResponse(partResponse);partResponse=null;return;}
     if(!partResponse)await invalidPart(false,'A saved model chunk is missing. Repair the local model download.');
     partReader=partResponse.body?.getReader();partBytes=0;deadline=Date.now()+timeoutMs;
     if(!partReader)await invalidPart(true,'A saved model chunk has no readable body. Resume the download to repair it.');
    }
    const remaining=deadline-Date.now();if(remaining<=0)throw modelError('MODEL_STORAGE_TIMEOUT','Reading a saved model chunk stopped responding. Completed chunks are retained; retry local inference.');
    const {value,done}=await awaitModelStorage(()=>partReader.read(),{...storageOptions,timeoutMs:remaining,message:'Reading a saved model chunk stopped responding. Completed chunks are retained; retry local inference.'});
    if(closed)return;
    if(done){
     if(partBytes!==localModelPartBytes(file,index))await invalidPart(true,'A saved model chunk is incomplete. Resume the local model download to repair it.');
     releasePart(true);index++;continue;
    }
    if(!(value instanceof Uint8Array)||partBytes+value.byteLength>localModelPartBytes(file,index))await invalidPart(true,'A saved model chunk has an unexpected size. Resume the download to repair it.');
    if(!value.byteLength)continue;
    partBytes+=value.byteLength;controller.enqueue(value);return;
   }}catch(error){fail(error);}
  },
  cancel(){stop();}
 },{highWaterMark:0});
 return new Response(stream,{headers:{'content-length':String(file.bytes),'content-type':file.path.endsWith('.json')?'application/json':'application/octet-stream'}});
}
/** Transformers cache adapter is strictly offline. Unknown optional files are a local404. */
export function makeModelCacheAdapter(cache,options){return {async match(key){const name=String(key?.url||key).split('?')[0];const file=LOCAL_MODEL_FILES.find(file=>name.endsWith('/'+file.path));return file?readModelFileResponse(cache,file,options):new Response('',{status:404});},async put(){throw modelError('MODEL_NETWORK_BLOCKED','Inference cannot download unverified model files. Use the explicit model download action.');}};}
export function describeModelPack(){return {...LOCAL_MODEL,bytes:LOCAL_MODEL_FILES.reduce((sum,file)=>sum+file.bytes,0),chunkBytes:LOCAL_MODEL_CHUNK_BYTES};}
