import test from 'node:test';
import assert from 'node:assert/strict';
import {buildManualIndex,MANUAL_RETRIEVAL_VERSION,retrieveManualPassages} from '../public/app/manual-retrieval.mjs';
import {loadQuickManualIndex,quickManualIndexKey} from '../public/app/retrieval-cache.mjs';
const analysis=(extra={})=>({manualId:'SYNTHETIC-cache-manual',contentHash:'synthetic-only-index-hash',processorVersion:'SYNTHETIC-processor',title:'SYNTHETIC TEST ONLY',usable:true,identity:{model:'Fixture panel',revision:'TEST'},pages:[{page:2,quality:{readable:true},text:'SYNTHETIC TEST ONLY. To view event history, select VIEW and EVENT LOG. This is a fictional procedure used to exercise local indexing and has no applicability to installed equipment.'}],...extra});
const storage=initial=>{let value=initial,reads=0,writes=0;return {read:async()=>{reads++;return value;},write:async(key,index)=>{writes++;value=structuredClone(index);},get reads(){return reads;},get writes(){return writes;},get value(){return value;}};};

test('new index is persisted once and reused with exact content and processor identity',async()=>{
 const a=analysis(),backend=storage(),first=await loadQuickManualIndex(a,backend),second=await loadQuickManualIndex(a,backend);
 assert.equal(first.key,`manual-retrieval:${MANUAL_RETRIEVAL_VERSION}:${a.processorVersion}:${a.contentHash}`);assert.equal(first.persisted,true);assert.equal(first.reused,false);assert.equal(first.error,null);assert.equal(second.reused,true);assert.equal(backend.writes,1);assert.ok(retrieveManualPassages([second.index],'event history').length);
});

test('same-content concurrent calls share one read and one write within a storage backend',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve);let reads=0,writes=0;const read=async()=>{reads++;await gate;},write=async()=>{writes++;};
 const pending=Array.from({length:8},()=>loadQuickManualIndex(analysis(),{read,write}));release();const results=await Promise.all(pending);assert.equal(reads,1);assert.equal(writes,1);assert.ok(results.every(result=>result.persisted));assert.notEqual(results[0].index,results[1].index,'Callers receive separate snapshots');
});

test('a failed cache write returns the usable memory index and original exception, then retries safely',async()=>{
 const quota=Object.assign(new Error('SYNTHETIC quota failure'),{name:'QuotaExceededError'});let fail=true,writes=0;const read=async()=>undefined,write=async()=>{writes++;if(fail)throw quota;};
 const first=await loadQuickManualIndex(analysis(),{read,write});assert.equal(first.persisted,false);assert.equal(first.error,quota);assert.equal(first.index.passages.length,1);
 fail=false;const retry=await loadQuickManualIndex(analysis(),{read,write});assert.equal(retry.persisted,true);assert.equal(retry.error,null);assert.equal(writes,2);
});

test('a read error remains visible even if rebuilding and saving succeeds',async()=>{
 const unavailable=new Error('SYNTHETIC read unavailable');const result=await loadQuickManualIndex(analysis(),{read:async()=>{throw unavailable;},write:async()=>{}});assert.equal(result.persisted,true);assert.equal(result.error,unavailable);assert.equal(result.reused,false);assert.ok(result.index.passages.length);
});

test('stale versions, wrong hashes and malformed passage data are rebuilt',async()=>{
 const a=analysis(),valid=buildManualIndex(a);
 const damaged=[{...valid,version:'old'}, {...valid,contentHash:'different'}, {...valid,processorVersion:'old'}, {...valid,passages:[null]}, {...valid,passages:[{...valid.passages[0],page:0}]}, {...valid,passages:[{...valid.passages[0],tokens:null}]}, {...valid,passages:[]}, {...valid,passages:[{...valid.passages[0],text:'Invented cached procedure that was never read from this source.'}]}, {...valid,passages:[valid.passages[0],valid.passages[0]]}];
 for(const value of damaged){const backend=storage(value),result=await loadQuickManualIndex(a,backend);assert.equal(result.reused,false);assert.equal(result.persisted,true);assert.equal(backend.writes,1);assert.equal(result.index.contentHash,a.contentHash);}
});

test('same PDF under a different saved record reuses text but opens the selected record',async()=>{
 const initial=analysis(),backend=storage(buildManualIndex(initial)),selected=analysis({manualId:'SYNTHETIC-new-saved-id',title:'New saved label',equipmentRole:'External PSU'}),result=await loadQuickManualIndex(selected,backend);
 assert.equal(result.reused,true);assert.equal(result.index.manualId,selected.manualId);assert.equal(result.index.passages[0].manualId,selected.manualId);assert.equal(result.index.passages[0].title,selected.title);assert.equal(result.index.passages[0].equipmentRole,'External PSU');assert.equal(backend.value.passages[0].manualId,initial.manualId,'Stored source index is not mutated');
});

test('unusable or anonymous analyses do not pollute persistent index storage',async()=>{
 const backend=storage(),unusable=await loadQuickManualIndex(analysis({usable:false}),backend);assert.equal(unusable.persisted,false);assert.equal(unusable.error.code,'INDEX_UNUSABLE');assert.equal(backend.writes,0);
 const missing=await loadQuickManualIndex(analysis({contentHash:''}),backend);assert.equal(missing.key,null);assert.equal(missing.error.code,'INDEX_SOURCE_ID_MISSING');assert.equal(backend.writes,0);assert.match(quickManualIndexKey(analysis()),/synthetic-only-index-hash$/);
});

test('different injected storage backends cannot share each other’s in-flight cache reads',async()=>{
 const a=storage(),b=storage();await Promise.all([loadQuickManualIndex(analysis(),a),loadQuickManualIndex(analysis(),b)]);assert.equal(a.reads,1);assert.equal(b.reads,1);assert.equal(a.writes,1);assert.equal(b.writes,1);
});

test('cache misses dispatch a module worker and terminate it after a validated reply',async()=>{
 const backend=storage();let url,options,submitted,terminated=0;
 const result=await loadQuickManualIndex(analysis({unrelatedJobDetails:'MUST NOT BE SENT'}),{...backend,workerFactory:(workerURL,workerOptions)=>{url=workerURL;options=workerOptions;return {terminate(){terminated++;},postMessage(message){submitted=message;queueMicrotask(()=>this.onmessage({data:{id:message.id,ok:true,index:buildManualIndex(message.analysis)}}));}};}});
 assert.match(url.href,/\/retrieval-index\.worker\.mjs$/);assert.equal(options.type,'module');assert.equal(submitted.analysis.unrelatedJobDetails,undefined);assert.equal(result.backend,'worker');assert.equal(result.error,null);assert.equal(result.persisted,true);assert.equal(terminated,1);
});

test('worker errors return compatible memory indexing with a visible error and no lost cache write',async()=>{
 const backend=storage(),runtime=new Error('SYNTHETIC worker resource unavailable');let terminated=0;
 const result=await loadQuickManualIndex(analysis(),{...backend,workerFactory:()=>({terminate(){terminated++;},postMessage(){queueMicrotask(()=>this.onerror({error:runtime,preventDefault(){}}));}})});
 assert.equal(result.backend,'main-thread-fallback');assert.equal(result.error.code,'INDEX_WORKER_FAILED');assert.equal(result.error.cause.cause,runtime);assert.equal(result.persisted,true);assert.equal(result.index.passages.length,1);assert.equal(backend.writes,1);assert.equal(terminated,1);
});

test('a stopped or invalid worker cannot leave indexing permanently pending',async()=>{
 for(const response of ['invalid','silent']){
  let terminated=0;const backend=storage(),result=await loadQuickManualIndex(analysis(),{...backend,workerTimeoutMs:5,workerFactory:()=>({terminate(){terminated++;},postMessage(message){if(response==='invalid')queueMicrotask(()=>this.onmessage({data:{id:message.id,ok:true,index:{version:'bad'}}}));}})});
  assert.equal(result.backend,'main-thread-fallback');assert.equal(result.error.code,'INDEX_WORKER_FAILED');assert.equal(result.persisted,true);assert.equal(terminated,1);
 }
});

test('an injected asynchronous builder is awaited once and bypasses browser worker discovery',async()=>{
 const backend=storage();let called=0,release;const pause=new Promise(resolve=>release=resolve),builder=async a=>{called++;await pause;return buildManualIndex(a);};
 const one=loadQuickManualIndex(analysis(),{...backend,builder}),two=loadQuickManualIndex(analysis(),{...backend,builder});await new Promise(resolve=>setImmediate(resolve));assert.equal(called,1);assert.equal(backend.writes,0);release();const results=await Promise.all([one,two]);assert.ok(results.every(result=>result.backend==='injected-builder'));assert.equal(backend.writes,1);
});

test('worker dispatch returns useful failure type without document text in the error payload',async()=>{
 const {buildRetrievalWorkerReply}=await import('../public/app/retrieval-index.worker.mjs');
 const successful=buildRetrievalWorkerReply({id:'synthetic-message',analysis:analysis()});assert.equal(successful.id,'synthetic-message');assert.equal(successful.ok,true);assert.equal(successful.index.passages.length,1);
 const malicious={contentHash:'synthetic',get pages(){throw new TypeError('SENSITIVE SYNTHETIC DOCUMENT TEXT');}},failed=buildRetrievalWorkerReply({id:'synthetic-error',analysis:malicious});assert.equal(failed.ok,false);assert.equal(failed.error.name,'TypeError');assert.equal(failed.error.code,'INDEX_WORKER_FAILED');assert.doesNotMatch(JSON.stringify(failed.error),/SENSITIVE SYNTHETIC/);
});

test('legacy indexes and corrupted postings or heading labels rebuild without changing saved analysis',async()=>{
 const a=analysis({pages:[{page:2,quality:{readable:true},text:'4.2 Event history\nSYNTHETIC TEST ONLY. To view history, select the fictional event log. This page has enough readable context for source indexing.'}]}),valid=buildManualIndex(a),term=valid.vocabulary[0],original=structuredClone(a);
 const corrupt=[
  {...valid,schemaVersion:1},
  {...valid,postings:{...valid.postings,[term]:[9999]}},
  {...valid,documentFrequencies:{...valid.documentFrequencies,[term]:999}},
  {...valid,passageIds:['different-source']},
  {...valid,passages:[{...valid.passages[0],headings:[{...valid.passages[0].headings[0],title:'Invented unrelated procedure'}]}]}
 ];
 for(const damaged of corrupt){const backend=storage(damaged),result=await loadQuickManualIndex(a,backend);assert.equal(result.reused,false);assert.equal(result.persisted,true);assert.equal(backend.writes,1);assert.deepEqual(a,original);}
 const cache=storage(valid),reused=await loadQuickManualIndex(a,cache);assert.equal(reused.reused,true);assert.deepEqual(reused.index.passages[0].headings,valid.passages[0].headings);
});
