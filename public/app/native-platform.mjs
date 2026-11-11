// APK-only capabilities. The browser/PWA keeps its existing fetch and download
// paths. The native relay accepts one fixed endpoint, never an arbitrary URL.
export const NATIVE_ORIGIN='https://appassets.androidplatform.net';
const endpoint='/api/assistant/online';
const aborted=()=>new DOMException('Request cancelled.','AbortError');
const bridgeFor=(host=globalThis)=>host.location?.origin===NATIVE_ORIGIN&&host.FindrNative?.version?.()===1?host.FindrNative:null;
const decode=value=>Uint8Array.from(atob(value),char=>char.charCodeAt(0));

export function createNativeOnlineTransport({host=globalThis,fetchImpl=(...args)=>globalThis.fetch(...args),timeoutMs=55000}={}){
 const pending=new Map();let listening=false;
 const receive=event=>{
  let reply;try{reply=JSON.parse(event.detail);}catch{return;}
  const operation=pending.get(reply?.id);if(!operation)return;
  if(!Number.isInteger(reply.status)||reply.status<200||reply.status>599||typeof reply.body!=='string'||reply.body.length>750000){operation.fail(Error('Invalid native relay response.'));return;}
  try{operation.finish(new Response(decode(reply.body),{status:reply.status,headers:{'Content-Type':reply.contentType||'application/json','Cache-Control':'no-store'}}));}catch(error){operation.fail(error);}
 };
 return async function nativeOnlineFetch(input,options={}){
  const bridge=bridgeFor(host);
  if(!bridge)return fetchImpl(input,options);
  const url=new URL(typeof input==='string'?input:input.url,NATIVE_ORIGIN);
  if(url.origin!==NATIVE_ORIGIN||url.pathname!==endpoint||url.search||url.hash||options.method!=='POST')throw Error('Unsupported native relay request.');
  const headers=new Headers(options.headers),key=headers.get('X-FINDR-Provider-Key'),body=options.body;
  if(typeof body!=='string'||new TextEncoder().encode(body).length>262144||!key||!/^[\x21-\x7e]{16,512}$/.test(key)||headers.get('Content-Type')!=='application/json')throw Error('Invalid native relay request.');
  if(options.signal?.aborted)throw aborted();
  if(!listening){host.addEventListener('findr-native-online',receive);listening=true;}
  const id=host.crypto.randomUUID();
  return new Promise((resolve,reject)=>{
   let timer;
   const cleanup=()=>{clearTimeout(timer);pending.delete(id);options.signal?.removeEventListener('abort',cancel);};
   const cancel=()=>{try{bridge.cancelOnline(id);}catch{}cleanup();reject(aborted());};
   const operation={finish:response=>{cleanup();resolve(response);},fail:error=>{cleanup();reject(error);}};
   pending.set(id,operation);options.signal?.addEventListener('abort',cancel,{once:true});
   timer=setTimeout(()=>{try{bridge.cancelOnline(id);}catch{}operation.fail(Error('Native relay timed out.'));},timeoutMs);
   try{bridge.online(id,body,key);}catch(error){operation.fail(error);}
  });
 };
}
const nativeOnlineFetch=createNativeOnlineTransport();
export {nativeOnlineFetch};

export function safeNativeFilename(value){return String(value||'FINDR-export').replace(/[\x00-\x1f\x7f/\\:*?"<>|]/g,'-').slice(0,180)||'FINDR-export';}

/** Stream one export to Android private temporary storage, then let the system
 * Save As picker choose its destination. Neither original files nor JS data
 * are removed. Chunking avoids one huge base64 bridge allocation for packs. */
export async function saveNativeBlob(blob,filename,{host=globalThis,yieldTurn=()=>new Promise(resolve=>setTimeout(resolve,0))}={}){
 const bridge=bridgeFor(host);if(!bridge)throw Error('Native export is unavailable.');
 const id=bridge.beginExport(safeNativeFilename(filename),blob.type||'application/octet-stream',blob.size);
 if(!id)throw Error('Another export is open, or there is not enough space for this file.');
 try{
  for(let offset=0;offset<blob.size;offset+=131072){
   const bytes=new Uint8Array(await blob.slice(offset,offset+131072).arrayBuffer());
   let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
   if(!bridge.appendExport(id,btoa(binary)))throw Error('Android could not prepare this export. Check free storage and retry.');
   await yieldTurn();
  }
  if(!bridge.finishExport(id))throw Error('Android could not open Save As. Retry the export.');
 }catch(error){try{bridge.cancelExport(id);}catch{}throw error;}
}

export function installNativePlatform({host=globalThis,notify=message=>host.alert(message)}={}){
 if(!bridgeFor(host)||!host.document)return false;
 const prototypes=new WeakSet();
 const save=async anchor=>{try{const response=await host.fetch(anchor.href);if(!response.ok)throw Error('The export file is no longer available. Retry the export.');await saveNativeBlob(await response.blob(),anchor.download,{host});}catch(error){notify(error.message||'This export could not be saved.');}};
 // Existing exporters create a detached anchor and call .click(), so a document
 // event listener alone cannot handle those downloads in Android WebView.
 const proto=host.HTMLAnchorElement.prototype;
 if(prototypes.has(proto)||proto.__findrExportInstalled)return true;
 const original=proto.click;
 Object.defineProperty(proto,'__findrExportInstalled',{value:true});prototypes.add(proto);
 proto.click=function(){if(this.download&&this.protocol==='blob:'){void save(this);return;}return original.call(this);};
 host.document.addEventListener('click',event=>{const anchor=event.target?.closest?.('a[download]');if(anchor?.protocol==='blob:'){event.preventDefault();void save(anchor);}},true);
 return true;
}
