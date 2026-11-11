import test from 'node:test';
import assert from 'node:assert/strict';
import {LOCAL_MODEL,LOCAL_MODEL_FILES,LOCAL_MODEL_BYTES,LOCAL_MODEL_CHUNK_BYTES,localModelPartCount,localModelPartBytes} from '../public/app/local-language-resources.mjs';
import {assertModelCacheWritable,inspectModelFile,readModelFileResponse,makeModelCacheAdapter,modelPartKey,modelVerifiedKey} from '../public/app/local-language-cache.mjs';
import {sha256} from '../public/app/vendor/local-language/hashes/sha2.js';

class MemoryCache{constructor(){this.values=new Map();}async match(key){return this.values.get(String(key))?.clone();}async put(key,response){this.values.set(String(key),new Response(await response.arrayBuffer(),{status:response.status,headers:response.headers}));}async delete(key){return this.values.delete(String(key));}}
const sample={path:'test.bin',bytes:6,sha256:'a'.repeat(64)};
async function saveSample(cache,file=sample,bytes=new Uint8Array([1,2,3,4,5,6])){await cache.put(modelPartKey(file,0),new Response(bytes,{headers:{'x-findr-part-bytes':String(file.bytes)}}));await cache.put(modelVerifiedKey(file),new Response(JSON.stringify({bytes:file.bytes,sha256:file.sha256,parts:localModelPartCount(file)})));}

test('optional model pack is pinned to an immutable revision and exact bytes with bounded chunk sizes',()=>{
 assert.equal(LOCAL_MODEL_BYTES,366642692);assert.equal(LOCAL_MODEL.dtype,'q8');assert.match(LOCAL_MODEL.revision,/^[a-f0-9]{40}$/);
 for(const file of LOCAL_MODEL_FILES){assert.match(file.sha256,/^[a-f0-9]{64}$/);assert.ok(file.url.includes('/resolve/'+LOCAL_MODEL.revision+'/'));assert.equal(Array.from({length:localModelPartCount(file)},(_,i)=>localModelPartBytes(file,i)).reduce((a,b)=>a+b,0),file.bytes);assert.ok(localModelPartBytes(file,localModelPartCount(file)-1)<=LOCAL_MODEL_CHUNK_BYTES);}
});
test('downloaded chunks without completed integrity verification are not reported ready',async()=>{const cache=new MemoryCache();await cache.put(modelPartKey(sample,0),new Response(new Uint8Array(6),{headers:{'x-findr-part-bytes':'6'}}));const state=await inspectModelFile(cache,sample);assert.equal(state.ready,false);assert.equal(state.savedBytes,6);assert.deepEqual(state.missingParts,[]);await assert.rejects(readModelFileResponse(cache,sample),{code:'MODEL_RESOURCE_MISSING'});});
test('interrupted part download retains complete parts but cannot mark a model ready',async()=>{const file={...sample,bytes:LOCAL_MODEL_CHUNK_BYTES+6},cache=new MemoryCache();await cache.put(modelPartKey(file,0),new Response(new Uint8Array(LOCAL_MODEL_CHUNK_BYTES),{headers:{'x-findr-part-bytes':String(LOCAL_MODEL_CHUNK_BYTES)}}));const state=await inspectModelFile(cache,file);assert.equal(state.savedBytes,LOCAL_MODEL_CHUNK_BYTES);assert.deepEqual(state.missingParts,[1]);assert.equal(state.ready,false);});
test('verified small file streams its exact bytes and leaves its cached source untouched',async()=>{const cache=new MemoryCache();await saveSample(cache);const response=await readModelFileResponse(cache,sample);assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[1,2,3,4,5,6]);assert.equal(response.headers.get('content-length'),'6');assert.equal((await inspectModelFile(cache,sample)).ready,true);});
test('wrong verification revision, missing chunks and truncated cache bodies fail closed and remain repairable',async()=>{const cache=new MemoryCache();await saveSample(cache);await cache.put(modelVerifiedKey(sample),new Response(JSON.stringify({sha256:'b'.repeat(64),bytes:6,parts:1})));assert.equal((await inspectModelFile(cache,sample)).ready,false);await saveSample(cache,sample,new Uint8Array(3));const response=await readModelFileResponse(cache,sample);await assert.rejects(response.arrayBuffer(),{code:'MODEL_RESOURCE_MISSING'});const state=await inspectModelFile(cache,sample);assert.equal(state.ready,false);assert.equal(state.verified,false);assert.deepEqual(state.missingParts,[0]);await saveSample(cache);assert.equal((await inspectModelFile(cache,sample)).ready,true);});
test('offline adapter never fetches unknown optional files or accepts unverified writes',async()=>{const cache=new MemoryCache(),adapter=makeModelCacheAdapter(cache);const response=await adapter.match('/missing/special_tokens_map.json');assert.equal(response.status,404);await assert.rejects(adapter.put('/unknown',new Response('x')),{code:'MODEL_NETWORK_BLOCKED'});await assert.rejects(adapter.match(LOCAL_MODEL_FILES[0].url),{code:'MODEL_RESOURCE_MISSING'});});
test('incremental download SHA verifies chunks without concatenating the complete model',()=>{const hash=sha256.create();hash.update(new TextEncoder().encode('a'));hash.update(new TextEncoder().encode('bc'));assert.equal([...hash.digest()].map(x=>x.toString(16).padStart(2,'0')).join(''),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');});
test('explicit download storage probe removes only its own key and preserves verified files',async()=>{const cache=new MemoryCache();await saveSample(cache);const before=[...cache.values.keys()];await assertModelCacheWritable(cache);assert.deepEqual([...cache.values.keys()],before);assert.equal((await inspectModelFile(cache,sample)).ready,true);});
test('a cache silently dropping successful writes fails visibly before the model transfer',async()=>{const deleted=[],cache={async put(){},async match(){},async delete(key){deleted.push(key);return false;}};await assert.rejects(assertModelCacheWritable(cache),error=>error.code==='STORAGE_UNAVAILABLE'&&/not retaining/.test(error.message)&&!/PDF/.test(error.message));assert.equal(deleted.length,1);assert.match(deleted[0],/\/__findr-language\/storage-probe-[a-f0-9-]+$/);});
test('an unresponsive cache inspection times out and releases a late response without continuing the scan',async()=>{
 let resolveMatch,calls=0,cancelled=0;
 const cache={match(){calls++;return new Promise(resolve=>{resolveMatch=resolve;});}};
 await assert.rejects(inspectModelFile(cache,sample,{timeoutMs:20}),{code:'MODEL_STORAGE_TIMEOUT'});
 resolveMatch(new Response(new ReadableStream({cancel(){cancelled++;}})));
 await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,1);assert.equal(cancelled,1);
});
test('a stalled storage probe write cannot block its error or touch saved model parts',async()=>{
 const deleted=[],cache={put(){return new Promise(()=>{});},match(){throw new Error('Must stop after timed-out write.');},async delete(key){deleted.push(key);}};
 await assert.rejects(assertModelCacheWritable(cache,{timeoutMs:20}),{code:'MODEL_STORAGE_TIMEOUT'});
 assert.equal(deleted.length,1);assert.match(deleted[0],/storage-probe-/);
});

function streamingCache(file,makeBody){
 const reads=[],deleted=[],present=new Set(Array.from({length:localModelPartCount(file)},(_,i)=>modelPartKey(file,i))),marker=modelVerifiedKey(file);present.add(marker);
 return {reads,deleted,present,async match(key){
  if(!present.has(key))return undefined;
  if(key===marker)return new Response(JSON.stringify({sha256:file.sha256,bytes:file.bytes,parts:localModelPartCount(file)}));
  const index=Number(key.split('part-').at(-1)),read={index,pulls:0,cancelled:0,ended:false,number:reads.filter(item=>item.index===index).length+1};reads.push(read);
  const body=makeBody(read),response=new Response(body,{headers:{'x-findr-part-bytes':String(localModelPartBytes(file,index))}});
  response.arrayBuffer=()=>{throw Error('Cache parts must stream directly without materializing another whole-part buffer.');};return response;
 },async delete(key){deleted.push(key);return present.delete(key);}};
}
const nextTask=()=>new Promise(resolve=>setImmediate(resolve));

test('model reconstruction forwards cached bytes under backpressure without whole-part arrayBuffer copies',async()=>{
 const file={...sample,bytes:LOCAL_MODEL_CHUNK_BYTES+6},chunk=new Uint8Array(2*1024*1024).fill(7),tail=new Uint8Array([1,2,3,4,5,6]);
 const cache=streamingCache(file,read=>{let emitted=0;return new ReadableStream({pull(controller){read.pulls++;const count=read.index===0?4:1;controller.enqueue(read.index===0?chunk:tail);if(++emitted===count){read.ended=true;controller.close();}},cancel(){read.cancelled++;}},{highWaterMark:0});});
 const response=await readModelFileResponse(cache,file),reader=response.body.getReader();await nextTask();
 assert.equal(response.headers.get('content-length'),String(file.bytes));assert.equal(cache.reads.length,2,'only metadata inspection has run');assert.ok(cache.reads.every(item=>item.pulls===0&&item.cancelled===1));
 const first=await reader.read();assert.equal(first.value.byteLength,chunk.byteLength);const active=cache.reads.at(-1);assert.equal(active.index,0);assert.equal(active.pulls,1);await nextTask();assert.equal(active.pulls,1,'a paused consumer does not prefetch the remaining part');assert.equal(cache.reads.filter(item=>item.index===1).length,1);
 let bytes=first.value.byteLength;for(let i=0;i<3;i++)bytes+=(await reader.read()).value.byteLength;
 assert.equal(active.ended,true);assert.equal(cache.reads.filter(item=>item.index===1).length,1,'the next part waits for demand');
 const last=await reader.read();bytes+=last.value.byteLength;assert.deepEqual([...last.value],[...tail]);assert.equal((await reader.read()).done,true);assert.equal(bytes,file.bytes);assert.deepEqual(cache.deleted,[]);
});

test('consumer cancellation stops the active cache reader without invalidating saved parts',async()=>{
 const cache=streamingCache(sample,read=>new ReadableStream({pull(controller){read.pulls++;controller.enqueue(new Uint8Array([1,2]));},cancel(){read.cancelled++;}},{highWaterMark:0}));
 const response=await readModelFileResponse(cache,sample),reader=response.body.getReader();await reader.read();const active=cache.reads.at(-1);await reader.cancel();await nextTask();
 assert.equal(active.cancelled,1);assert.equal(active.pulls,1);assert.deepEqual(cache.deleted,[]);assert.equal(cache.present.has(modelVerifiedKey(sample)),true);assert.equal((await reader.read()).done,true);
});

test('a stalled inference cache body times out, cancels its reader and retains valid cached data',async()=>{
 const cache=streamingCache(sample,read=>new ReadableStream({pull(){read.pulls++;return new Promise(()=>{});},cancel(){read.cancelled++;}},{highWaterMark:0}));
 const response=await readModelFileResponse(cache,sample,{timeoutMs:20});await assert.rejects(response.arrayBuffer(),{code:'MODEL_STORAGE_TIMEOUT'});await nextTask();
 const active=cache.reads.at(-1);assert.equal(active.pulls,1);assert.equal(active.cancelled,1);assert.deepEqual(cache.deleted,[]);assert.equal(cache.present.has(modelVerifiedKey(sample)),true);
});

test('aborting inference cancels a pending cache read and does not remove the model',async()=>{
 let started;const entered=new Promise(resolve=>started=resolve),controller=new AbortController();
 const cache=streamingCache(sample,read=>new ReadableStream({pull(){read.pulls++;started();return new Promise(()=>{});},cancel(){read.cancelled++;}},{highWaterMark:0}));
 const response=await readModelFileResponse(cache,sample,{signal:controller.signal}),pending=response.body.getReader().read();await entered;controller.abort();
 await assert.rejects(pending,{name:'AbortError'});await nextTask();assert.equal(cache.reads.at(-1).cancelled,1);assert.deepEqual(cache.deleted,[]);assert.equal(cache.present.has(modelVerifiedKey(sample)),true);
});

test('an oversized cached body is rejected before forwarding and loses its old readiness marker',async()=>{
 const cache=streamingCache(sample,read=>new ReadableStream({pull(controller){read.pulls++;controller.enqueue(new Uint8Array(7));controller.close();}},{highWaterMark:0}));
 const response=await readModelFileResponse(cache,sample);await assert.rejects(response.body.getReader().read(),{code:'MODEL_RESOURCE_MISSING'});
 assert.deepEqual(cache.deleted,[modelVerifiedKey(sample),modelPartKey(sample,0)]);assert.equal(cache.present.has(modelVerifiedKey(sample)),false);
});

test('an evicted part discovered after preflight invalidates readiness without changing other parts',async()=>{
 const cache=new MemoryCache();await saveSample(cache);const response=await readModelFileResponse(cache,sample);await cache.delete(modelPartKey(sample,0));
 await assert.rejects(response.arrayBuffer(),{code:'MODEL_RESOURCE_MISSING'});assert.equal(cache.values.has(modelVerifiedKey(sample)),false);
});

test('a cache lookup stalling during reconstruction cannot continue after its deadline',async()=>{
 const cache=new MemoryCache();await saveSample(cache);const originalMatch=cache.match.bind(cache);let lookups=0,late,cancelled=0;
 cache.match=key=>{if(key===modelPartKey(sample,0)&&++lookups===2)return new Promise(resolve=>late=resolve);return originalMatch(key);};
 const response=await readModelFileResponse(cache,sample,{timeoutMs:20});await assert.rejects(response.arrayBuffer(),{code:'MODEL_STORAGE_TIMEOUT'});
 late(new Response(new ReadableStream({cancel(){cancelled++;}},{highWaterMark:0})));await nextTask();assert.equal(cancelled,1);assert.equal(lookups,2);assert.equal(cache.values.has(modelVerifiedKey(sample)),true);
});
