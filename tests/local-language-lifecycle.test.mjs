import test from 'node:test';
import assert from 'node:assert/strict';
import {LOCAL_MODEL,LOCAL_MODEL_FILES,LOCAL_LANGUAGE_VERSION,localModelPartCount,localModelPartBytes} from '../public/app/local-language-resources.mjs';
import {modelPartKey,modelVerifiedKey} from '../public/app/local-language-cache.mjs';
import {createLocalLanguageRecovery,LOCAL_LANGUAGE_ATTEMPT_KEY} from '../public/app/local-language-recovery.mjs';

let serial=0;
const never=()=>new Promise(()=>{});
class MemoryStorage{
 constructor(){this.values=new Map();}
 getItem(key){return this.values.get(key)??null;}
 setItem(key,value){this.values.set(key,String(value));}
}
// Metadata only: this lifecycle fixture never loads weights or represents a
// successful real inference. The FakeWorker supplies its explicitly synthetic result.
function installedMetadataCache(){
 const rows=new Map();
 for(const file of LOCAL_MODEL_FILES){
  rows.set(modelVerifiedKey(file),()=>new Response(JSON.stringify({sha256:file.sha256,bytes:file.bytes,parts:localModelPartCount(file)})));
  for(let i=0;i<localModelPartCount(file);i++)rows.set(modelPartKey(file,i),()=>new Response(null,{headers:{'x-findr-part-bytes':String(localModelPartBytes(file,i))}}));
 }
 return {async match(key){return rows.get(String(key))?.();}};
}
function unfinishedCheckpoint(storage,phase='load'){
 const guard=createLocalLanguageRecovery({getStorage:()=>storage,modelId:LOCAL_MODEL.id,revision:LOCAL_MODEL.revision,runtimeVersion:LOCAL_LANGUAGE_VERSION});
 guard.begin('SYNTHETIC-previous-page');guard.progress('SYNTHETIC-previous-page',phase);
}
async function fixture(t,{open,estimate,onStart,installed=false,sessionStorage=new MemoryStorage()}={}){
 const original=new Map(['Worker','caches','navigator','document','sessionStorage'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const workers=[],cache=installed?installedMetadataCache():{async match(){return undefined;}},document=new EventTarget();document.visibilityState='visible';
 let started;
 const whenStarted=new Promise(resolve=>{started=resolve;});
 class FakeWorker{
  constructor(){workers.push(this);this.terminated=false;this.cleanups=[];}
  postMessage(request){this.request=request;started(this);onStart?.(this,request);}
  send(value){this.onmessage?.({data:{id:this.request.id,...value}});}
  terminate(){this.terminated=true;this.cleanups.forEach(cleanup=>cleanup());}
 }
 Object.defineProperties(globalThis,{
  Worker:{configurable:true,value:FakeWorker},
  caches:{configurable:true,value:{open:open||(()=>Promise.resolve(cache)),async match(){return installed?new Response('SYNTHETIC runtime metadata'):undefined;}}},
  navigator:{configurable:true,value:{onLine:true,storage:{estimate:estimate||(()=>Promise.resolve({quota:2e9,usage:0}))}}},
  document:{configurable:true,value:document},
  sessionStorage:{configurable:true,value:sessionStorage}
 });
 const api=await import(`../public/app/local-language.mjs?lifecycle=${++serial}`);
 t.after(()=>{api.unloadLocalLanguage();for(const [key,descriptor]of original)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];});
 return {api,workers,whenStarted,document,sessionStorage};
}

test('a hung readiness scan times out, releases its single-flight lock and can be checked again',async t=>{
 let hung=true;
 const {api}=await fixture(t,{open:()=>hung?never():Promise.resolve({async match(){return undefined;}})});
 const stalled=await api.getLocalLanguageReadiness({timeoutMs:20});
 assert.equal(stalled.error.code,'MODEL_STORAGE_TIMEOUT');assert.equal(stalled.supported,true);assert.equal(stalled.ready,false);
 hung=false;
 const retry=await api.getLocalLanguageReadiness({timeoutMs:100});
 assert.equal(retry.status,'missing');assert.equal(retry.error,undefined);
});

test('cancelling an unresponsive storage preflight settles without ever starting a worker',async t=>{
 let entered,release;
 const checking=new Promise(resolve=>{entered=resolve;});
 const {api,workers}=await fixture(t,{estimate:()=>{entered();return new Promise(resolve=>{release=resolve;});}});
 const controller=new AbortController(),attempt=api.prepareLocalLanguageResources({signal:controller.signal,preflightTimeoutMs:1000});
 await checking;controller.abort();await assert.rejects(attempt,{name:'AbortError'});
 release({quota:2e9,usage:0});await Promise.resolve();await Promise.resolve();
 assert.equal(workers.length,0);assert.equal(api.getLocalLanguageOperation(),null);
});

test('an unresponsive storage estimate gets a download-specific bounded error',async t=>{
 const {api,workers}=await fixture(t,{estimate:never});
 await assert.rejects(api.prepareLocalLanguageResources({preflightTimeoutMs:20}),error=>error.code==='MODEL_STORAGE_TIMEOUT'&&/storage check/.test(error.message));
 assert.equal(workers.length,0);
});

test('identical progress messages cannot keep a stalled download alive',async t=>{
 const {api,workers}=await fixture(t,{onStart:worker=>{
  const progress={type:'progress',phase:'download',file:'weights',bytes:62247799,receivedBytes:0};
  worker.send(progress);const timer=setInterval(()=>worker.send(progress),4);worker.cleanups.push(()=>clearInterval(timer));
 }});
 await assert.rejects(api.prepareLocalLanguageResources({timeoutMs:35}),error=>error.code==='MODEL_DOWNLOAD_STALLED'&&/Completed parts are retained/.test(error.message)&&!/narrow the question/.test(error.message));
 assert.equal(workers[0].terminated,true);assert.equal(api.getLocalLanguageOperation(),null);
});

test('real incoming bytes keep a slow transfer alive before its next saved part',async t=>{
 const progress=[];
 const {api}=await fixture(t,{onStart:worker=>{
  let receivedBytes=0;
  const timer=setInterval(()=>{receivedBytes+=1024;worker.send({type:'progress',phase:'download',file:'weights',bytes:62247799,receivedBytes});if(receivedBytes===8192){clearInterval(timer);worker.send({type:'complete',result:{installed:true}});}},10);
  worker.cleanups.push(()=>clearInterval(timer));
 }});
 await api.prepareLocalLanguageResources({timeoutMs:40,onProgress:value=>progress.push(value)});
 assert.equal(progress.length,8);assert.equal(new Set(progress.map(value=>value.bytes)).size,1);assert.equal(progress.at(-1).receivedBytes,8192);
});

test('returning to the foreground detects a suspended stale download immediately',async t=>{
 const {api,whenStarted,document}=await fixture(t);
 const attempt=api.prepareLocalLanguageResources({timeoutMs:90000});
 const worker=await whenStarted,now=Date.now();t.mock.method(Date,'now',()=>now+90001);
 document.dispatchEvent(new Event('visibilitychange'));
 await assert.rejects(attempt,{code:'MODEL_DOWNLOAD_STALLED'});assert.equal(worker.terminated,true);
});

test('late worker messages after cancellation cannot update progress or a newer attempt',async t=>{
 const progress=[],{api,whenStarted,workers}=await fixture(t);
 const controller=new AbortController(),first=api.prepareLocalLanguageResources({signal:controller.signal,onProgress:value=>progress.push(value)});
 const old=await whenStarted;controller.abort();await assert.rejects(first,{name:'AbortError'});
 old.send({type:'progress',phase:'download',bytes:999});old.send({type:'complete',result:{installed:true}});
 assert.equal(progress.length,0);assert.equal(api.getLocalLanguageOperation(),null);
 const nextController=new AbortController(),next=api.prepareLocalLanguageResources({signal:nextController.signal});
 while(workers.length<2)await new Promise(resolve=>setImmediate(resolve));
 old.send({type:'complete',result:{installed:true}});assert.equal(api.getLocalLanguageOperation().type,'download');
 nextController.abort();await assert.rejects(next,{name:'AbortError'});
});

test('a new page detects interrupted model loading and checking or retrying cannot start another worker',async t=>{
 const storage=new MemoryStorage();unfinishedCheckpoint(storage);
 const {api,workers}=await fixture(t,{installed:true,sessionStorage:storage});
 const state=await api.getLocalLanguageReadiness();
 assert.equal(state.installed,true);assert.equal(state.runtimeReady,true);assert.equal(state.ready,false);assert.equal(state.canGenerate,false);
 assert.equal(state.recovery.state,'interrupted');assert.equal(state.lastRuntimeError.code,'MODEL_INTERRUPTED');
 await assert.rejects(api.generateLocalReply({messages:[{role:'user',content:'SYNTHETIC saved question'}]}),{code:'MODEL_INTERRUPTED'});
 await api.getLocalLanguageReadiness();assert.equal(workers.length,0);
 assert.equal(JSON.parse(storage.getItem(LOCAL_LANGUAGE_ATTEMPT_KEY)).state,'interrupted');
});

test('explicit retry enables a new attempt, persists its checkpoint before worker execution and settles success',async t=>{
 const storage=new MemoryStorage();unfinishedCheckpoint(storage);
 let checkpointAtStart;
 const {api,workers}=await fixture(t,{installed:true,sessionStorage:storage,onStart:(worker,request)=>{
  checkpointAtStart=JSON.parse(storage.getItem(LOCAL_LANGUAGE_ATTEMPT_KEY));
  assert.equal(checkpointAtStart.state,'running');assert.equal(checkpointAtStart.attemptId,request.id);
  worker.send({type:'progress',phase:'load'});worker.send({type:'progress',phase:'generate'});
  worker.send({type:'complete',result:{text:'SYNTHETIC result'}});
 }});
 const enabled=await api.allowLocalLanguageRetry();assert.equal(enabled.ready,true);assert.equal(workers.length,0,'Acknowledgement alone must not load the model');
 const reply=await api.generateLocalReply({messages:[{role:'user',content:'SYNTHETIC private question'}],context:'SYNTHETIC private manual'});
 assert.equal(reply.text,'SYNTHETIC result');assert.equal(workers.length,1);assert.equal(workers[0].terminated,false);
 assert.doesNotMatch(JSON.stringify(checkpointAtStart),/private question|private manual/);
 const state=await api.getLocalLanguageReadiness();assert.equal(state.ready,true);assert.equal(state.loaded,true);assert.equal(state.recovery.state,'idle');assert.ok(state.recovery.validatedAt);
});

test('checkpoint write loss blocks worker construction even when all model assets are present',async t=>{
 const storage={getItem(){return null;},setItem(){}};
 const {api,workers}=await fixture(t,{installed:true,sessionStorage:storage});
 await assert.rejects(api.generateLocalReply({messages:[{role:'user',content:'SYNTHETIC question'}]}),{code:'MODEL_RECOVERY_UNAVAILABLE'});
 assert.equal(workers.length,0);assert.equal(api.getLocalLanguageOperation(),null);
 const state=await api.getLocalLanguageReadiness();assert.equal(state.ready,false);assert.equal(state.recovery.state,'storage-unavailable');
});

test('cancelling model generation settles the checkpoint and ignores late worker completion',async t=>{
 const {api,whenStarted,sessionStorage}=await fixture(t,{installed:true});
 const controller=new AbortController(),attempt=api.generateLocalReply({messages:[{role:'user',content:'SYNTHETIC question'}],signal:controller.signal});
 const worker=await whenStarted;worker.send({type:'progress',phase:'load'});controller.abort();
 await assert.rejects(attempt,{name:'AbortError'});assert.equal(worker.terminated,true);
 const checkpoint=sessionStorage.getItem(LOCAL_LANGUAGE_ATTEMPT_KEY);
 worker.send({type:'complete',result:{text:'SYNTHETIC late result'}});
 assert.equal(sessionStorage.getItem(LOCAL_LANGUAGE_ATTEMPT_KEY),checkpoint);
 const state=await api.getLocalLanguageReadiness();assert.equal(state.ready,true);assert.equal(state.recovery.state,'idle');assert.equal(state.recovery.validatedAt,null);
});

test('a context-limit error permits a smaller request without destroying and reloading the worker',async t=>{
 let starts=0;const logged=[];t.mock.method(console,'error',(...values)=>logged.push(values));
 const {api,workers}=await fixture(t,{installed:true,onStart:worker=>{
  if(++starts===1)worker.send({type:'error',error:{code:'MODEL_CONTEXT_TOO_LONG',message:'SYNTHETIC oversized context'}});
  else worker.send({type:'complete',result:{text:'SYNTHETIC smaller result'}});
 }});
 await assert.rejects(api.generateLocalReply({messages:[{role:'user',content:'SYNTHETIC oversized request'}]}),{code:'MODEL_CONTEXT_TOO_LONG'});
 assert.equal(workers[0].terminated,false);
 const state=await api.getLocalLanguageReadiness();assert.equal(state.recovery.blocked,false);assert.equal(state.lastRuntimeError,null);
 const reply=await api.generateLocalReply({messages:[{role:'user',content:'SYNTHETIC smaller request'}]});
 assert.equal(reply.text,'SYNTHETIC smaller result');assert.equal(workers.length,1);assert.equal(starts,2);
});

test('a caught runtime error persists across a fresh page and requires explicit retry',async t=>{
 t.mock.method(console,'error',()=>{});
 const {api,workers}=await fixture(t,{installed:true,onStart:worker=>worker.send({type:'error',error:{code:'MODEL_MEMORY_LIMIT',message:'SYNTHETIC allocation failure'}})});
 await assert.rejects(api.generateLocalReply({messages:[{role:'user',content:'SYNTHETIC question'}]}),{code:'MODEL_MEMORY_LIMIT'});
 assert.equal(workers[0].terminated,true);
 const reopened=await import(`../public/app/local-language.mjs?lifecycle=${++serial}`);t.after(()=>reopened.unloadLocalLanguage());
 const state=await reopened.getLocalLanguageReadiness();assert.equal(state.recovery.state,'failed');assert.equal(state.ready,false);
 await assert.rejects(reopened.generateLocalReply({messages:[{role:'user',content:'SYNTHETIC retry'}]}),{code:'MODEL_MEMORY_LIMIT'});
 assert.equal(workers.length,1);
});
