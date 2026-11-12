import {setting,setSetting} from './db.mjs';
const PREFIX='toolbox-pack:asset:';
const bytes=value=>value instanceof ArrayBuffer?new Uint8Array(value):ArrayBuffer.isView(value)?new Uint8Array(value.buffer,value.byteOffset,value.byteLength):null;
export async function packDigest(value){const b=bytes(value);if(!b)throw new Error('Pack storage did not contain file bytes.');if(!globalThis.crypto?.subtle?.digest)throw new Error('This browser cannot verify pack files. Open FINDR through its secure HTTPS address or update the browser.');return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('');}
export function packAssetURL(manifest,asset){
 if(!/^[a-f0-9]{40}$/.test(manifest.repositoryCommit||''))throw new Error('This pack release has not been published yet.');
 if(!/^[a-z0-9][a-z0-9/-]*\.(json|svg)$/.test(asset.path)||asset.path.includes('..'))throw new Error('Invalid pack file path.');
 return `https://raw.githubusercontent.com/william2535/Findr/${manifest.repositoryCommit}/toolbox-packs/${manifest.id}/${asset.path}`;
}
export function createToolboxPackStore({manifest,read=setting,write=setSetting,fetcher=globalThis.fetch,estimate=()=>globalThis.navigator?.storage?.estimate?.(),digest=packDigest}={}){
 let active=null;
 const key=asset=>PREFIX+asset.sha256;
 async function verified(asset){let raw;try{raw=await read(key(asset));}catch(cause){throw new Error('Saved tool box files could not be read. Check device storage and retry; other FINDR data is unchanged.',{cause});}if(raw==null)return null;const data=bytes(raw);if(!data||data.byteLength!==asset.bytes||await digest(data)!==asset.sha256)return null;return data;}
 async function inspect(){let savedBytes=0,files=0;const available={};for(const asset of manifest.assets){const data=await verified(asset);if(data){files++;savedBytes+=data.byteLength;available[asset.path]=data;}}return {complete:files===manifest.assets.length,files,totalFiles:manifest.assets.length,savedBytes,totalBytes:manifest.assets.reduce((sum,a)=>sum+a.bytes,0),available};}
 function cancel(){active?.abort();}
 async function download(onProgress=()=>{}){
  if(active)throw new Error('A tool box pack download is already running.');const controller=new AbortController();active=controller;
  try{
   const checkCancelled=()=>{if(controller.signal.aborted)throw new DOMException('Tool box pack download cancelled. Saved files are kept for Resume.','AbortError');};
   let state=await inspect();checkCancelled();const quota=await estimate();checkCancelled();if(quota&&Number.isFinite(quota.quota)&&Number.isFinite(quota.usage)&&quota.quota-quota.usage<state.totalBytes-state.savedBytes){const error=new Error('Not enough device storage for this pack. Free space, then retry. Existing saved tools are unchanged.');error.name='QuotaExceededError';throw error;}
   const progress=(phase,extra={})=>onProgress({...state,available:undefined,phase,...extra});progress('downloading',{receivedBytes:state.savedBytes});
   for(const asset of manifest.assets){
    if(controller.signal.aborted)throw new DOMException('Tool box pack download cancelled. Saved files are kept for Resume.','AbortError');
    if(state.available[asset.path])continue;
    const url=packAssetURL(manifest,asset);let response;try{response=await fetcher(url,{signal:controller.signal,cache:'no-store',redirect:'error'});}catch(cause){if(controller.signal.aborted||cause?.name==='AbortError')throw new DOMException('Tool box pack download cancelled. Saved files are kept for Resume.','AbortError');throw new Error('The download could not connect. Check your connection and retry; completed files are saved.',{cause});}if(!response.ok)throw new Error(`Download failed (${response.status}). Retry when connected; completed files are saved.`);
    let data;
    if(response.body?.getReader){const reader=response.body.getReader(),chunks=[];let length=0,finished=false;try{while(true){const {done,value}=await reader.read();if(done){finished=true;break;}length+=value.byteLength;if(length>asset.bytes)throw new Error('Pack file length did not match its verified release.');chunks.push(value);progress('downloading',{path:asset.path,receivedBytes:state.savedBytes+length});}data=new Uint8Array(length);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}}finally{if(!finished)try{await reader.cancel();}catch{/* Preserve the original download failure. */}reader.releaseLock();}}
    else data=new Uint8Array(await response.arrayBuffer());
    if(controller.signal.aborted)throw new DOMException('Tool box pack download cancelled. Saved files are kept for Resume.','AbortError');
    if(data.byteLength!==asset.bytes||await digest(data)!==asset.sha256)throw new Error('Pack file verification failed. Retry the download; saved files remain intact.');
    try{await write(key(asset),data);}catch(cause){if(cause?.name==='QuotaExceededError')throw cause;throw new Error('This tool box file could not be saved. Check device storage and retry; completed files are kept.',{cause});}state.available[asset.path]=data;state.savedBytes+=data.byteLength;state.files++;progress('downloading',{path:asset.path,receivedBytes:state.savedBytes});
   }
   state=await inspect();if(!state.complete)throw new Error('The pack could not be verified after saving. Retry after checking device storage.');progress('complete',{receivedBytes:state.savedBytes});return state;
  }finally{controller.abort();active=null;}
 }
 async function remove(){if(active)throw new Error('Cancel the download before removing this pack.');for(const asset of manifest.assets)await write(key(asset),null);return inspect();}
 return {inspect,download,cancel,remove,get downloading(){return !!active;}};
}
