import {buildManualIndex} from './manual-retrieval.mjs';

/** Worker messages contain source data only; no text is evaluated as instructions. */
export function buildRetrievalWorkerReply(message={}){
 const id=typeof message.id==='string'?message.id:'';
 try{return {id,ok:true,index:buildManualIndex(message.analysis)};}
 catch(error){
  // Keep the failure type and application stack frames without copying exception
  // strings that could contain part of a document or an equipment/site label.
  const stackFrames=String(error?.stack||'').split('\n').slice(1).filter(line=>/retrieval-index\.worker\.mjs|manual-retrieval\.mjs/.test(line)).slice(0,8);
  return {id,ok:false,error:{name:typeof error?.name==='string'?error.name:'Error',code:'INDEX_WORKER_FAILED',message:'The local manual indexing worker could not build this index.',stackFrames}};
 }
}
if(typeof globalThis.postMessage==='function')globalThis.onmessage=event=>globalThis.postMessage(buildRetrievalWorkerReply(event.data));
