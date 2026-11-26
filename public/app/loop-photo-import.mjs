import {parseLoopListText} from './loop-photo-parser.mjs';
export {parseLoopListText} from './loop-photo-parser.mjs';

export const LOOP_PHOTO_LIMITS = Object.freeze({maxFileBytes:30*1024*1024,maxDecodePixels:80_000_000,maxEdge:2400,maxWorkingPixels:5_760_000});
const error = (code,message,cause,action='retry') => Object.assign(new Error(message,{cause}),{code,action});
const cancelled = () => Object.assign(new Error('Photo reading cancelled. Any photos already saved and reviewed rows are kept.'),{name:'AbortError',code:'LOOP_PHOTO_CANCELLED',action:'retry'});
const check = signal => { if (signal?.aborted) throw cancelled(); };
const notify = (callback,value) => { try { callback?.(value); } catch { /* UI progress cannot change the imported data. */ } };
const pause = () => new Promise(resolve=>setTimeout(resolve,0));
const now = () => globalThis.performance?.now?.() ?? Date.now();
const id = () => globalThis.crypto?.randomUUID?.() || `photo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const photoError = value => ({code:value?.code || 'LOOP_PHOTO_OCR_FAILED',name:value?.name || 'Error',message:value?.message || 'Photo reading failed.',action:value?.action || 'retry',...(value?.stage?{stage:value.stage}:{})});
function processingError(cause,stage) {
  if(typeof cause?.code==='string'&&cause.code.startsWith('LOOP_PHOTO_'))return cause;
  const failure=stage==='resources'?error('LOOP_PHOTO_RESOURCES_CHECK_FAILED','The saved OCR resources could not be checked. Retry or open offline resource setup; your original photo is kept.',cause,'prepare-ocr'):
    stage==='decoding'?error('LOOP_PHOTO_RUNTIME_FAILED','The browser hit an error preparing the image. Retry or use manual row entry; this does not mean the original photo is damaged.',cause):
    stage==='parsing'?error('LOOP_PHOTO_PARSE_FAILED','The text was read but the columns could not be processed. Review the original photo and edit or enter the rows manually.',cause,'manual-entry'):
    error('LOOP_PHOTO_OCR_FAILED','The local OCR reader failed. Retry or check the OCR resources; the original photo can still be reviewed.',cause);
  failure.stage=stage;return failure;
}

function abortable(promise,signal) {
  if (!signal) return promise;
  if (signal.aborted) { Promise.resolve(promise).catch(()=>{}); return Promise.reject(cancelled()); }
  return new Promise((resolve,reject)=>{
    const aborted=()=>reject(cancelled());signal.addEventListener('abort',aborted,{once:true});
    Promise.resolve(promise).then(resolve,reject).finally(()=>signal.removeEventListener('abort',aborted));
  });
}

/** Reuse the app's verified cache status; never download OCR silently. */
export async function getLoopPhotoReadiness() {
  const {getManualProcessingReadiness} = await import('./manual-analysis.mjs');
  const status = await getManualProcessingReadiness();
  const resources = status.resources.filter(resource=>resource.path.includes('/ocr/'));
  const missing = resources.filter(resource=>!resource.cached);
  const needed = status.capabilities.missing.filter(item=>['Web Workers','WebAssembly','secure file hashing','IndexedDB local storage','canvas PDF rendering'].includes(item));
  const supported = !needed.length;
  const ready = supported && status.offlineControlled && !missing.length;
  return {supported,ready,resources,missing,downloadBytes:missing.reduce((sum,r)=>sum+r.bytes,0),
    totalBytes:resources.reduce((sum,r)=>sum+r.bytes,0),offlineControlled:status.offlineControlled,
    message:!supported?`This browser needs ${needed.join(', ')} for local photo reading.`:
      !status.offlineControlled?'The verified offline app is not ready. Keep FINDR open online and finish preparing offline resources before reading photos.':
      missing.length?'Prepare the missing English OCR resources, then retry this saved photo.':'English photo OCR is ready offline. Every suggested row still needs review.'};
}

/** A cancellable owner for the existing PDF OCR worker and its child worker. */
export function createLoopPhotoOCR({onProgress,WorkerImpl=globalThis.Worker,timeoutMs=120_000}={}) {
  let worker;
  try { worker=new WorkerImpl(new URL('./manual-analysis-ocr.worker.mjs',import.meta.url),{type:'module'}); }
  catch(cause) { throw error('LOOP_PHOTO_OCR_FAILED','The local OCR worker could not start. Retry or check the offline OCR resources.',cause,'prepare-ocr'); }
  const pending=new Map();let nextId=0,closed=false;
  const fail=cause=>{for(const request of pending.values()){clearTimeout(request.timer);request.reject(cause);}pending.clear();};
  const terminate=(cause=cancelled())=>{if(closed)return;closed=true;worker.terminate();fail(cause);};
  worker.onmessage=({data})=>{
    if(data?.type==='progress'){notify(onProgress,data.value);return;}
    const request=pending.get(data?.id);if(!request)return;pending.delete(data.id);clearTimeout(request.timer);
    if(data.error){const original=Object.assign(new Error(data.error.message||'The local OCR worker failed.'),data.error);request.reject(error('LOOP_PHOTO_OCR_FAILED','The local OCR reader failed. Your photo can still be reviewed or transcribed. Retry or check OCR resources.',original));}
    else request.resolve(data.result);
  };
  worker.onerror=event=>{event.preventDefault?.();terminate(error('LOOP_PHOTO_OCR_FAILED','The local OCR reader could not load or run. Check the offline resources, then retry the saved photo.',new Error(event.message||'OCR worker error'),'prepare-ocr'));};
  const call=(operation,payload={},transfer=[])=>new Promise((resolve,reject)=>{
    if(closed){reject(cancelled());return;}
    const requestId=++nextId;
    const timer=setTimeout(()=>terminate(error('LOOP_PHOTO_OCR_TIMEOUT','Photo reading did not finish. Retry with a smaller, clearer photo or enter the rows manually.')),timeoutMs);
    pending.set(requestId,{resolve,reject,timer});
    try{worker.postMessage({id:requestId,operation,...payload},transfer);}
    catch(cause){pending.delete(requestId);clearTimeout(timer);reject(error('LOOP_PHOTO_OCR_FAILED','The local OCR reader could not receive this image.',cause));}
  });
  return {initialize:()=>call('initialize'),recognize:image=>call('recognize',{image},[image]),terminate};
}

export function loopPhotoWorkingSize(width,height) {
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1)throw error('LOOP_PHOTO_UNREADABLE','The photo has no readable image dimensions.',null,'choose-photo');
  if(width*height>LOOP_PHOTO_LIMITS.maxDecodePixels)throw error('LOOP_PHOTO_TOO_LARGE','This image is too large to process safely on a phone. Use a smaller JPEG or PNG; the original can still be kept for manual review.',null,'choose-photo');
  const scale=Math.min(1,LOOP_PHOTO_LIMITS.maxEdge/Math.max(width,height),Math.sqrt(LOOP_PHOTO_LIMITS.maxWorkingPixels/(width*height)));
  return {originalWidth:width,originalHeight:height,width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale)),resized:scale<1,orientation:'Browser-applied image orientation',method:scale<1?'Resized working copy for OCR; original photo unchanged.':'Original image dimensions; original photo unchanged.'};
}

/** Reject oversized known image dimensions before asking the browser to decode. */
async function checkPhotoDimensions(blob,signal) {
  if(typeof blob.slice!=='function')return;
  const bytes=new Uint8Array(await abortable(blob.slice(0,262144).arrayBuffer(),signal));
  const view=new DataView(bytes.buffer);let width,height;
  if(bytes.length>=24&&view.getUint32(0)===0x89504e47&&view.getUint32(4)===0x0d0a1a0a) {
    width=view.getUint32(16);height=view.getUint32(20);
  } else if(bytes.length>=4&&bytes[0]===255&&bytes[1]===216) {
    let offset=2;
    while(offset+4<=bytes.length) {
      if(bytes[offset++]!==255)break;
      while(bytes[offset]===255)offset++;
      const marker=bytes[offset++];
      if(marker===0xda||marker===0xd9)break;
      if(marker===0x01||(marker>=0xd0&&marker<=0xd8))continue;
      if(offset+2>bytes.length)break;
      const length=view.getUint16(offset);
      if(length<2||offset+length>bytes.length)break;
      if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)&&length>=7){height=view.getUint16(offset+3);width=view.getUint16(offset+5);break;}
      offset+=length;
    }
  } else if(bytes.length>=30&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,16))==='WEBPVP8X') {
    width=1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16);height=1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16);
  }
  if(width!==undefined)loopPhotoWorkingSize(width,height);
}

async function decodePhoto(blob,signal) {
  if(typeof createImageBitmap==='function') {
    try {
      let abandoned=false;
      const promise=createImageBitmap(blob,{imageOrientation:'from-image'}).then(image=>{if(abandoned){image.close();throw cancelled();}return image;});
      try { const image=await abortable(promise,signal);return {image,close:()=>image.close()}; }
      catch(cause){abandoned=true;throw cause;}
    } catch(cause) { if(cause?.name==='AbortError')throw cause; /* Some Safari decoders only support the Image path. */ }
  }
  const url=URL.createObjectURL(blob),image=new Image();
  try {
    const loaded=new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(error('LOOP_PHOTO_UNREADABLE','The browser could not decode this image. Keep it for manual review or choose another photo.',null,'choose-photo'));image.src=url;});
    await abortable(loaded,signal);
    return {image,close:()=>{image.src='';URL.revokeObjectURL(url);}};
  } catch(cause) {image.src='';URL.revokeObjectURL(url);throw cause;}
}

/** No photo bytes leave this browser. Only a bounded working PNG reaches OCR. */
export async function prepareLoopPhoto(blob,{signal}={}) {
  check(signal);
  if(!blob||typeof blob.arrayBuffer!=='function'||!Number.isFinite(blob.size)||!blob.size)throw error('LOOP_PHOTO_UNREADABLE','This photo is empty or could not be opened. Choose another image.',null,'choose-photo');
  if(blob.size>LOOP_PHOTO_LIMITS.maxFileBytes)throw error('LOOP_PHOTO_TOO_LARGE','This photo is larger than 30 MB. Use a smaller JPEG or PNG for OCR; the original can still be reviewed.',null,'choose-photo');
  if(!/^(?:image\/(?:jpeg|jpg|png|webp|bmp|heic|heif|avif)|)$/i.test(blob.type||'')||/\.(?:svg|gif|pdf|tiff?)$/i.test(blob.name||''))throw error('LOOP_PHOTO_UNSUPPORTED_FORMAT','Choose a still JPEG, PNG or WebP photo. Other formats depend on this browser’s image decoder.',null,'choose-photo');
  await checkPhotoDimensions(blob,signal);check(signal);
  let decoded,canvas;
  try {
    try { decoded=await decodePhoto(blob,signal); }
    catch(cause){if(cause?.name==='AbortError')throw cause;if(/heic|heif/i.test(`${blob.type||''} ${blob.name||''}`))throw error('LOOP_PHOTO_UNSUPPORTED_HEIC','This browser cannot read this HEIC/HEIF photo. Export or share it as JPEG or PNG, then retry; the original photo is kept.',cause,'choose-photo');throw cause;}
    check(signal);
    const workingImage=loopPhotoWorkingSize(decoded.image.naturalWidth||decoded.image.width,decoded.image.naturalHeight||decoded.image.height);
    canvas=document.createElement('canvas');canvas.width=workingImage.width;canvas.height=workingImage.height;
    const context=canvas.getContext('2d');
    if(!context)throw error('LOOP_PHOTO_UNSUPPORTED_BROWSER','Canvas image processing is unavailable in this browser.',null,'manual-entry');
    context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
    context.drawImage(decoded.image,0,0,canvas.width,canvas.height);
    await pause();check(signal);
    const workingBlob=await abortable(new Promise((resolve,reject)=>canvas.toBlob(result=>result?resolve(result):reject(error('LOOP_PHOTO_UNREADABLE','The browser could not prepare a readable copy of this photo. Review it manually or choose another photo.',null,'choose-photo')),'image/png')),signal);
    const image=await abortable(workingBlob.arrayBuffer(),signal);check(signal);
    return {image,workingImage};
  } finally { decoded?.close();if(canvas){canvas.width=0;canvas.height=0;} }
}

/**
 * Sequential, resumable per-photo import. onPhotoStart MUST atomically persist
 * originalBlob and the pending job metadata before resolving; onPhoto saves the
 * finished result. Storage failures stop the batch and never report it saved.
 * A cancellation saves the in-flight original with a cancelled status first.
 * photoIds supports retrying existing photos without duplicate identities.
 */
export async function processLoopPhotos(files,{signal,onProgress,onPhotoStart,onPhoto,photoIds=[],readiness=getLoopPhotoReadiness,prepareImage=prepareLoopPhoto,createOCR=createLoopPhotoOCR}={}) {
  check(signal);
  const input=Array.from(files||[]),results=[];let ocr=null,active=null,readyPromise=null;
  const stopped=()=>ocr?.terminate(cancelled());signal?.addEventListener('abort',stopped,{once:true});
  const report=value=>notify(onProgress,{photoIndex:active?.index??0,totalPhotos:input.length,photoId:active?.photo.id??null,...value});
  try {
    for(let index=0;index<input.length;index++) {
      check(signal);
      const blob=input[index],started=now();
      const photo={id:photoIds[index]||id(),name:String(blob?.name||`Loop photo ${index+1}`),mimeType:blob?.type||'application/octet-stream',size:blob?.size||0,createdAt:Date.now()};
      active={index:index+1,photo};
      const result={photo,state:'pending',rawText:'',confidence:null,suggestions:[],unparsedLines:[],headers:[],warnings:[],workingImage:null};
      let aborted=null,phase='decoding';
      check(signal);
      if(onPhotoStart) {
        report({phase:'saving-original',message:'Saving this original photo before reading it…'});
        try {await onPhotoStart({...result,photo:{...photo},suggestions:[],unparsedLines:[],headers:[],warnings:[]},blob);}
        catch(cause){const failure=error('LOOP_PHOTO_STORAGE_FAILED','The original photo could not be saved. Reading has not started. Free storage or retry; earlier saved photos and reviewed rows are unchanged.',cause,'retry-save');failure.completedResults=results;failure.unsavedResult=result;throw failure;}
      }
      try {
        check(signal);
        report({phase:'decoding',message:`Opening photo ${index+1} of ${input.length}…`});
        const prepared=await abortable(prepareImage(blob,{signal}),signal);result.workingImage=prepared.workingImage;
        if(prepared.workingImage.resized)result.warnings.push(prepared.workingImage.method);
        phase='resources';
        report({phase:'resources',message:'Checking saved English OCR resources…'});
        readyPromise||=Promise.resolve().then(readiness);
        const state=await abortable(readyPromise,signal);check(signal);
        if(!state.supported)throw error('LOOP_PHOTO_UNSUPPORTED_BROWSER',state.message,null,'manual-entry');
        if(!state.ready)throw error('LOOP_PHOTO_RESOURCES_MISSING',state.message,null,'prepare-ocr');
        if(!ocr) {
          phase='initializing';
          report({phase:'initializing',message:'Starting local English photo reader…'});
          ocr=createOCR({onProgress:value=>report({phase:'ocr',message:value?.status||'Reading photo locally…',...(Number.isFinite(value?.progress)?{progress:Math.min(1,Math.max(0,value.progress))}:{})})});
          await abortable(ocr.initialize(),signal);
        }
        check(signal);phase='recognizing';report({phase:'recognizing',message:`Reading photo ${index+1} of ${input.length} on this device…`});
        const read=await abortable(ocr.recognize(prepared.image),signal);check(signal);
        result.rawText=String(read?.text||'');result.confidence=Number.isFinite(read?.confidence)?read.confidence:null;
        phase='parsing';report({phase:'parsing',message:'Associating Address and Map columns for review…'});
        const parsed=parseLoopListText(result.rawText,{sourcePhotoId:photo.id,confidence:result.confidence});
        Object.assign(result,parsed,{warnings:[...result.warnings,...parsed.warnings]});
        if(!result.rawText.trim())throw error('LOOP_PHOTO_UNREADABLE','No readable text was found. Review the original photo and enter the rows, or retry with a closer, clearer picture.',null,'manual-entry');
        result.state='complete';
      } catch(cause) {
        if(signal?.aborted||cause?.name==='AbortError')aborted=cancelled();
        const failure=aborted||processingError(cause,phase);
        result.error=photoError(failure);
        result.state=aborted?'cancelled':'failed';
        if(ocr){ocr.terminate();ocr=null;}
      }
      result.durationMs=Math.round(now()-started);
      if(onPhoto)report({phase:'saving',message:'Saving original photo and review suggestions on this device…'});
      try { await onPhoto?.(result,blob); }
      catch(cause) {const failure=error('LOOP_PHOTO_STORAGE_FAILED','This photo could not be saved on this device. Free storage or retry; earlier saved photos and reviewed rows are unchanged.',cause,'retry-save');failure.completedResults=results;failure.unsavedResult=result;throw failure;}
      results.push(result);
      report({phase:result.error?'photo-error':'photo-complete',message:result.error?.message||`${result.suggestions.length} row suggestions ready for your review.`,completed:index+1,total:input.length});
      if(aborted){aborted.completedResults=results;throw aborted;}
    }
    return results;
  } finally {signal?.removeEventListener('abort',stopped);ocr?.terminate();report({phase:'finished',message:signal?.aborted?'Photo reading stopped.':'Photo reading finished.',completed:results.length,total:input.length});}
}
