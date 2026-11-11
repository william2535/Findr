// One PDF.js API/worker pair and one byte path for uploads, saved files and search.
// PDF.js 5.6.205's getTextContent uses ReadableStream async iteration, which
// Safari/WebKit before 27 lacks. Its documented streamTextContent/getReader API
// supplies the same chunks without modifying browser or PDF.js prototypes.
export const PDFJS_VERSION='5.6.205';
export const PDF_RUNTIME_VERSION='2026-11-10.2';
const local=path=>new URL(path,import.meta.url).href;
const error=(code,message,cause)=>Object.assign(new Error(message,{cause}),{code});
const abort=()=>new DOMException('PDF reading cancelled.','AbortError');
const check=signal=>{if(signal?.aborted)throw abort();};
let libraryPromise;

/** Read compatibility only: existing bytes and IDs are never rewritten. */
export async function normalisePDFBlob(value){
  if(value instanceof Blob)return value;
  if(value instanceof ArrayBuffer)return new Blob([value],{type:'application/pdf'});
  if(ArrayBuffer.isView(value))return new Blob([new Uint8Array(value.buffer,value.byteOffset,value.byteLength)],{type:'application/pdf'});
  if(value&&value.type==='Buffer'&&Array.isArray(value.data)&&value.data.every(x=>Number.isInteger(x)&&x>=0&&x<=255))return new Blob([new Uint8Array(value.data)],{type:'application/pdf'});
  // Browser structured clone normally reconstructs a Blob; this also handles a
  // genuine Blob from another same-origin realm, without accepting metadata.
  if(Object.prototype.toString.call(value)==='[object Blob]'&&typeof value.arrayBuffer==='function'&&typeof value.size==='number')return new Blob([await value.arrayBuffer()],{type:value.type||'application/pdf'});
  throw error(value==null?'MISSING_PDF':'PDF_BYTES_INVALID',value==null?'This saved PDF file is missing. Download it again or upload a copy.':'The saved file does not contain a supported PDF byte representation. Your existing record is unchanged.');
}
export async function loadPDFBytes(value){const blob=await normalisePDFBlob(value);if(blob.size>120*1024*1024)throw error('MANUAL_TOO_LARGE','This PDF is over the 120 MB device limit.');return new Uint8Array(await blob.arrayBuffer());}
export function pdfDocumentOptions(data){return {data,isEvalSupported:false,enableXfa:false,cMapUrl:local('./vendor/pdfjs/cmaps/'),cMapPacked:true,standardFontDataUrl:local('./vendor/pdfjs/standard_fonts/'),wasmUrl:local('./vendor/pdfjs/wasm/'),useSystemFonts:false,maxImageSize:16*1024*1024};}
export async function loadPDFLibrary(){
  if(!libraryPromise)libraryPromise=import('./vendor/pdfjs/pdf.mjs').then(lib=>{
    if(lib.version!==PDFJS_VERSION)throw error('PDF_VERSION_MISMATCH',`PDF reader version ${lib.version||'unknown'} does not match the required ${PDFJS_VERSION}. Reload FINDR to finish the update.`);
    lib.GlobalWorkerOptions.workerSrc=local('./vendor/pdfjs/pdf.worker.mjs');return lib;
  }).catch(cause=>{libraryPromise=null;throw cause;});
  return libraryPromise;
}
export async function getPDFTextContent(page,options={}){
  const {signal,...params}=options;check(signal);
  if(typeof page?.streamTextContent!=='function')throw error('PDF_RUNTIME_FAILED','The PDF reader does not expose its text stream.');
  const stream=page.streamTextContent(params);
  if(typeof stream?.getReader!=='function')throw error('PDF_RUNTIME_FAILED','This browser cannot read the PDF text stream.');
  const reader=stream.getReader(),result={items:[],styles:Object.create(null),lang:null};
  const cancel=()=>{reader.cancel(abort()).catch(()=>{});};
  signal?.addEventListener('abort',cancel,{once:true});
  try{
    for(;;){check(signal);const {done,value}=await reader.read();check(signal);if(done)break;
      if(!value||!Array.isArray(value.items))throw error('PDF_EXTRACTION_FAILED','The PDF text stream returned an invalid text chunk.');
      result.lang??=value.lang;Object.assign(result.styles,value.styles||{});result.items.push(...value.items);
    }
    return result;
  }catch(cause){try{await reader.cancel(cause);}catch{/* Preserve original extraction failure. */}throw cause;}
  finally{signal?.removeEventListener('abort',cancel);try{reader.releaseLock();}catch{/* A destroyed worker can already have released it. */}}
}
export function getPDFRuntimeCapabilities(){return {version:PDF_RUNTIME_VERSION,pdfjsVersion:PDFJS_VERSION,textReader:'ReadableStream.getReader',readableStreams:typeof globalThis.ReadableStream?.prototype?.getReader==='function',nativeAsyncIteration:typeof globalThis.ReadableStream?.prototype?.[Symbol.asyncIterator]==='function'};}
