import test from 'node:test';
import assert from 'node:assert/strict';
import {downloadModelPack} from '../public/app/local-language-download.mjs';
import {LOCAL_MODEL_CHUNK_BYTES,localModelPartBytes} from '../public/app/local-language-resources.mjs';
import {modelPartKey,modelVerifiedKey,inspectModelFile} from '../public/app/local-language-cache.mjs';
import {sha256} from '../public/app/vendor/local-language/hashes/sha2.js';

const hash=bytes=>Array.from(sha256.create().update(bytes).digest(),value=>value.toString(16).padStart(2,'0')).join('');
const fileFor=(bytes,path='test.bin')=>({path,bytes:bytes.length,sha256:hash(bytes),url:'https://model.test/'+path});
const small=new Uint8Array([1,2,3,4,5,6]),smallFile=fileFor(small);
const large=new Uint8Array(LOCAL_MODEL_CHUNK_BYTES+6);large.fill(17);large.set(small,LOCAL_MODEL_CHUNK_BYTES);const largeFile=fileFor(large,'weights.bin');
const options={maxRetries:0,retryDelayMs:0,progressIntervalMs:0,timeouts:{connectMs:5000,readMs:5000,storageMs:5000,verifyMs:5000}};
class MemoryCache{
 constructor(){this.values=new Map();this.puts=[];this.matches=[];}
 async put(key,response){key=String(key);this.puts.push(key);await this.beforePut?.(key,response);this.values.set(key,{bytes:new Uint8Array(await response.arrayBuffer()),headers:[...response.headers]});}
 async match(key){key=String(key);this.matches.push(key);const entry=this.values.get(key);if(!entry)return undefined;return this.onMatch?.(key,entry)||new Response(entry.bytes,{headers:entry.headers});}
 async delete(key){return this.values.delete(String(key));}
}
async function savePart(cache,file,index,bytes){await cache.put(modelPartKey(file,index),new Response(bytes,{headers:{'x-findr-part-bytes':String(bytes.byteLength)}}));}
function rangeResponse(bytes,file,start=0,end=file.bytes-1){return new Response(bytes,{status:206,headers:{'content-range':`bytes ${start}-${end}/${file.bytes}`}});}
function rangeFetch(bytes,file,calls=[]){return async(url,request)=>{calls.push(request.headers.Range);const [,start,end]=/^bytes=(\d+)-(\d+)$/.exec(request.headers.Range).map(Number);return rangeResponse(bytes.slice(start,end+1),file,start,end);};}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

test('finite range download verifies real bytes before writing a readiness marker',async()=>{
 const cache=new MemoryCache(),calls=[],progress=[];
 const result=await downloadModelPack({...options,files:[smallFile],cache,fetchImpl:rangeFetch(small,smallFile,calls),onProgress:p=>progress.push(p)});
 assert.deepEqual(calls,['bytes=0-5']);assert.equal(result.installed,true);assert.equal(result.receivedBytes,6);assert.equal((await inspectModelFile(cache,smallFile)).ready,true);
 assert.equal(cache.puts.at(-1),modelVerifiedKey(smallFile));assert.deepEqual([...cache.values.get(modelPartKey(smallFile,0)).bytes],[...small]);
 assert.ok(progress.some(p=>p.phase==='download'&&p.partReceived===6&&p.bytes===0));assert.ok(progress.some(p=>p.phase==='saving'&&p.bytes===6));assert.ok(progress.some(p=>p.phase==='verify'&&p.completed===6));
 assert.ok(progress.every((p,i)=>!i||p.receivedBytes>=progress[i-1].receivedBytes));
 assert.equal(progress[0].savedBytesKnown,false);assert.equal(Object.hasOwn(progress[0],'bytes'),false);
});

test('resume preserves existing 8 MiB part keys and requests only the missing suffix',async()=>{
 const cache=new MemoryCache(),calls=[];await savePart(cache,largeFile,0,large.subarray(0,LOCAL_MODEL_CHUNK_BYTES));cache.puts=[];
 await downloadModelPack({...options,files:[largeFile],cache,fetchImpl:rangeFetch(large,largeFile,calls)});
 assert.deepEqual(calls,[`bytes=${LOCAL_MODEL_CHUNK_BYTES}-${large.length-1}`]);assert.ok(!cache.puts.includes(modelPartKey(largeFile,0)));assert.equal((await inspectModelFile(cache,largeFile)).ready,true);
 assert.equal(cache.values.get(modelPartKey(largeFile,0)).bytes.length,LOCAL_MODEL_CHUNK_BYTES);
});

test('an ignored Range uses one full stream with honest reread progress',async()=>{
 const cache=new MemoryCache(),calls=[],progress=[];await savePart(cache,largeFile,0,large.subarray(0,LOCAL_MODEL_CHUNK_BYTES));
 const result=await downloadModelPack({...options,files:[largeFile],cache,fetchImpl:async(url,request)=>{calls.push(request.headers.Range);return new Response(large);},onProgress:p=>progress.push(p)});
 assert.equal(calls.length,1);assert.equal(result.receivedBytes,large.length);assert.equal((await inspectModelFile(cache,largeFile)).ready,true);
 assert.ok(progress.some(p=>p.fallback&&p.reread&&p.bytes===LOCAL_MODEL_CHUNK_BYTES&&/rereading saved/.test(p.message)));
 assert.ok(progress.some(p=>p.fallback&&!p.reread&&p.partIndex===1));assert.equal(progress.at(-1).bytes,large.length);
});

test('a broken full-stream fallback keeps complete parts and retries from the new missing part',async()=>{
 const cache=new MemoryCache(),calls=[],progress=[];let attempt=0;
 const result=await downloadModelPack({...options,maxRetries:1,files:[largeFile],cache,onProgress:p=>progress.push(p),fetchImpl:async(url,request)=>{
  calls.push(request.headers.Range);if(++attempt===1)return new Response(large.subarray(0,LOCAL_MODEL_CHUNK_BYTES+2));
  return rangeResponse(large.subarray(LOCAL_MODEL_CHUNK_BYTES),largeFile,LOCAL_MODEL_CHUNK_BYTES,large.length-1);
 }});
 assert.deepEqual(calls,[`bytes=0-${LOCAL_MODEL_CHUNK_BYTES-1}`,`bytes=${LOCAL_MODEL_CHUNK_BYTES}-${large.length-1}`]);assert.equal(result.receivedBytes,large.length+2);assert.ok(progress.some(p=>p.phase==='retry'&&p.bytes===LOCAL_MODEL_CHUNK_BYTES));assert.equal((await inspectModelFile(cache,largeFile)).ready,true);
});

test('a stalled response body is cancelled and only that network part is retried',async()=>{
 const cache=new MemoryCache(),progress=[];let calls=0,cancelled=0;
 const result=await downloadModelPack({...options,maxRetries:1,timeouts:{...options.timeouts,readMs:20},files:[smallFile],cache,onProgress:p=>progress.push(p),fetchImpl:async()=>{
  if(++calls===1){let sent=false;return new Response(new ReadableStream({pull(controller){if(!sent){sent=true;controller.enqueue(small.subarray(0,3));}else return new Promise(()=>{});},cancel(){cancelled++;}}),{status:206,headers:{'content-range':'bytes 0-5/6'}});}
  return rangeResponse(small,smallFile);
 }});
 assert.equal(calls,2);assert.ok(cancelled>=1);assert.equal(result.receivedBytes,9);assert.ok(progress.some(p=>p.phase==='retry'));assert.equal((await inspectModelFile(cache,smallFile)).ready,true);
});

test('a connection timeout aborts the request and a late response cannot start more work',async()=>{
 const cache=new MemoryCache();let calls=0,lateResolve,firstSignal,lateCancelled=0;
 await downloadModelPack({...options,maxRetries:1,timeouts:{...options.timeouts,connectMs:20},files:[smallFile],cache,fetchImpl:async(url,request)=>{
  calls++;if(calls===1){firstSignal=request.signal;return new Promise(resolve=>lateResolve=resolve);}return rangeResponse(small,smallFile);
 }});
 assert.equal(calls,2);assert.equal(firstSignal.aborted,true);
 lateResolve(new Response(new ReadableStream({cancel(){lateCancelled++;}})));await tick();assert.equal(lateCancelled,1);assert.equal(calls,2);
});

test('network retries stop at their bound and never fabricate readiness',async()=>{
 const cache=new MemoryCache();let calls=0;
 await assert.rejects(downloadModelPack({...options,maxRetries:2,timeouts:{...options.timeouts,connectMs:10},files:[smallFile],cache,fetchImpl:()=>{calls++;return new Promise(()=>{});}}),error=>error.code==='MODEL_DOWNLOAD_TIMEOUT'&&/Resume/.test(error.message)&&!/Retrying/.test(error.message));
 assert.equal(calls,3);assert.equal(cache.values.has(modelVerifiedKey(smallFile)),false);assert.equal(cache.values.has(modelPartKey(smallFile,0)),false);
});

test('wrong range start, end or total fails without a retry and cancels the body',async()=>{
 for(const range of ['bytes 1-5/6','bytes 0-4/6','bytes 0-5/7','bytes 0-5/*','']){
  const cache=new MemoryCache();let calls=0,cancelled=0;
  await assert.rejects(downloadModelPack({...options,maxRetries:2,files:[smallFile],cache,fetchImpl:async()=>{calls++;return new Response(new ReadableStream({cancel(){cancelled++;}}),{status:206,headers:{'content-range':range}});}}),{code:'MODEL_DOWNLOAD_RANGE_INVALID'});
  assert.equal(calls,1,range);assert.equal(cancelled,1,range);assert.equal(cache.values.has(modelVerifiedKey(smallFile)),false);
 }
});

test('an oversized range body is rejected and never stored as a completed part',async()=>{
 const cache=new MemoryCache();let calls=0;
 await assert.rejects(downloadModelPack({...options,maxRetries:2,files:[smallFile],cache,fetchImpl:async()=>{calls++;return rangeResponse(new Uint8Array(7),smallFile);}}),{code:'MODEL_DOWNLOAD_RANGE_INVALID'});
 assert.equal(calls,1);assert.equal(cache.values.has(modelPartKey(smallFile,0)),false);
});

test('a short range body retries without storing its incomplete bytes',async()=>{
 const cache=new MemoryCache();let calls=0;
 const result=await downloadModelPack({...options,maxRetries:1,files:[smallFile],cache,fetchImpl:async()=>rangeResponse(++calls===1?small.subarray(0,2):small,smallFile)});
 assert.equal(calls,2);assert.equal(result.receivedBytes,8);assert.deepEqual([...cache.values.get(modelPartKey(smallFile,0)).bytes],[...small]);
});

test('HTTP errors are terminal and retain previously completed chunks',async()=>{
 const cache=new MemoryCache();await savePart(cache,largeFile,0,large.subarray(0,LOCAL_MODEL_CHUNK_BYTES));let calls=0;
 await assert.rejects(downloadModelPack({...options,maxRetries:2,files:[largeFile],cache,fetchImpl:async()=>{calls++;return new Response('Temporary response',{status:503});}}),{code:'MODEL_DOWNLOAD_FAILED'});
 assert.equal(calls,1);assert.equal(cache.values.get(modelPartKey(largeFile,0)).bytes.length,LOCAL_MODEL_CHUNK_BYTES);assert.equal(cache.values.has(modelVerifiedKey(largeFile)),false);
});

test('cancelling a partial transfer retains earlier parts and releases the stream',async()=>{
 const cache=new MemoryCache(),controller=new AbortController();await savePart(cache,largeFile,0,large.subarray(0,LOCAL_MODEL_CHUNK_BYTES));let cancelled=0,calls=0;
 await assert.rejects(downloadModelPack({...options,files:[largeFile],cache,signal:controller.signal,onProgress:p=>{if(p.receivedBytes>0)controller.abort();},fetchImpl:async()=>{
  calls++;return new Response(new ReadableStream({start(c){c.enqueue(small.subarray(0,2));},cancel(){cancelled++;}}),{status:206,headers:{'content-range':`bytes ${LOCAL_MODEL_CHUNK_BYTES}-${large.length-1}/${large.length}`}});
 }}),{name:'AbortError'});
 assert.equal(calls,1);assert.ok(cancelled>=1);assert.ok(cache.values.has(modelPartKey(largeFile,0)));assert.equal(cache.values.has(modelPartKey(largeFile,1)),false);
});

test('a storage write timeout is terminal, and its late completion cannot request the next part',async()=>{
 const cache=new MemoryCache(),calls=[];let release;await savePart(cache,largeFile,0,large.subarray(0,LOCAL_MODEL_CHUNK_BYTES));
 cache.beforePut=key=>key===modelPartKey(largeFile,1)?new Promise(resolve=>release=resolve):undefined;
 await assert.rejects(downloadModelPack({...options,maxRetries:2,timeouts:{...options.timeouts,storageMs:25},files:[largeFile,smallFile],cache,fetchImpl:rangeFetch(large,largeFile,calls)}),{code:'MODEL_STORAGE_TIMEOUT'});
 assert.equal(calls.length,1);assert.equal(cache.values.get(modelPartKey(largeFile,0)).bytes.length,LOCAL_MODEL_CHUNK_BYTES);release();await tick();await tick();assert.equal(calls.length,1);assert.equal(cache.values.has(modelVerifiedKey(largeFile)),false);assert.equal(cache.values.has(modelPartKey(smallFile,0)),false);
});

test('a stalled verification body cannot mark the file ready',async()=>{
 const cache=new MemoryCache();let cancelled=0;
 cache.onMatch=(key,entry)=>key===modelPartKey(smallFile,0)?new Response(new ReadableStream({cancel(){cancelled++;}}),{headers:entry.headers}):undefined;
 await assert.rejects(downloadModelPack({...options,timeouts:{...options.timeouts,verifyMs:20},files:[smallFile],cache,fetchImpl:rangeFetch(small,smallFile)}),{code:'MODEL_STORAGE_TIMEOUT'});
 assert.equal(cache.values.has(modelPartKey(smallFile,0)),true);assert.equal(cache.values.has(modelVerifiedKey(smallFile)),false);
 assert.ok(cancelled>=1);
});

test('an unexpected network AbortError is retried while a real user cancellation is not',async()=>{
 const cache=new MemoryCache();let calls=0;
 const result=await downloadModelPack({...options,maxRetries:1,files:[smallFile],cache,fetchImpl:async()=>{if(++calls===1)throw new DOMException('Network request stopped','AbortError');return rangeResponse(small,smallFile);}});
 assert.equal(calls,2);assert.equal(result.installed,true);
 const controller=new AbortController();controller.abort();calls=0;
 await assert.rejects(downloadModelPack({...options,files:[smallFile],cache,signal:controller.signal,fetchImpl:()=>{calls++;}}),{name:'AbortError'});assert.equal(calls,0);
});

test('integrity failure clears only that invalid file, retaining a previously verified file',async()=>{
 const cache=new MemoryCache(),otherBytes=new Uint8Array([7,8,9]),other=fileFor(otherBytes,'other.bin');
 await assert.rejects(downloadModelPack({...options,files:[smallFile,other],cache,fetchImpl:async(url)=>url===smallFile.url?rangeResponse(small,smallFile):rangeResponse(new Uint8Array([9,8,7]),other)}),{code:'MODEL_INTEGRITY_FAILED'});
 assert.equal((await inspectModelFile(cache,smallFile)).ready,true);assert.equal(cache.values.has(modelPartKey(other,0)),false);assert.equal(cache.values.has(modelVerifiedKey(other)),false);
});

test('an incomplete file loses an earlier verification marker before repair starts',async()=>{
 const cache=new MemoryCache();await savePart(cache,largeFile,0,large.subarray(0,LOCAL_MODEL_CHUNK_BYTES));await cache.put(modelVerifiedKey(largeFile),new Response(JSON.stringify({sha256:largeFile.sha256,bytes:largeFile.bytes,parts:2})));
 await downloadModelPack({...options,files:[largeFile],cache,fetchImpl:async()=>{assert.equal(cache.values.has(modelVerifiedKey(largeFile)),false);return rangeResponse(small,largeFile,LOCAL_MODEL_CHUNK_BYTES,large.length-1);}});
 assert.equal((await inspectModelFile(cache,largeFile)).ready,true);
});

test('already verified files need no network request or rewriting',async()=>{
 const cache=new MemoryCache();await downloadModelPack({...options,files:[smallFile],cache,fetchImpl:rangeFetch(small,smallFile)});cache.puts=[];let calls=0;
 const result=await downloadModelPack({...options,files:[smallFile],cache,fetchImpl:()=>{calls++;throw Error('Network must not be called');}});
 assert.equal(calls,0);assert.equal(result.receivedBytes,0);assert.ok(cache.puts.every(key=>key.includes('storage-probe-')));assert.equal(localModelPartBytes(smallFile,0),6);
});
