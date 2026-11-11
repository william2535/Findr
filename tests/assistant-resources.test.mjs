import test from 'node:test';
import assert from 'node:assert/strict';
import {createAssistantResourcesController,summarizeAssistantResources} from '../public/app/assistant-resources.mjs';

const resources=[{kind:'pdf',path:'pdf-reader.test',bytes:120,cached:true},{kind:'pdf',path:'pdf-worker.test',bytes:80,cached:true},{kind:'ocr',path:'english.test',bytes:300,cached:true}];
const manual=()=>({supported:true,offlineControlled:true,resources:structuredClone(resources),ready:true});
const model=()=>({supported:true,ready:false,installed:false,loaded:false,status:'missing',model:{id:'synthetic-model',title:'SYNTHETIC model',revision:'test',bytes:1000},missing:[{path:'weights.test',bytes:1000}],downloadBytes:1000,totalBytes:1020,capabilities:{backend:'wasm',missing:[]},message:'Install the synthetic test weights.'});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness({readiness=model(),prepare,prepareManual}={}){
 const events=[],states=[],modals=[],toasts=[];let nextReadiness=readiness,manualCalls=0,modelCalls=0,loads=0;
 const controller=createAssistantResourcesController({getOfflineReady:()=>true,showModal:html=>modals.push(html),toast:x=>toasts.push(x),onEvent:async event=>events.push(event),onChange:state=>states.push(state),dependencies:{selectPanel:()=>null,getManualProcessingReadiness:async()=>manual(),downloadManualProcessingResources:async args=>{manualCalls++;return prepareManual?prepareManual(args):manual();},loadLocalLanguage:async()=>{loads++;return {getLocalLanguageReadiness:async()=>structuredClone(nextReadiness),prepareLocalLanguageResources:async args=>{modelCalls++;const result=prepare?await prepare(args):{...model(),ready:true,installed:true,missing:[],downloadBytes:0};nextReadiness=result;return result;}};}}});
 return {controller,events,states,modals,toasts,get calls(){return {manual:manualCalls,model:modelCalls,readinessModule:loads};},set readiness(value){nextReadiness=value;}};
}

test('app, PDF, OCR and model readiness remain independent and never use saved-file count',()=>{
 const partial=manual();partial.resources[2].cached=false;
 let state=summarizeAssistantResources({appReady:true,manual:partial,model:model()});
 assert.equal(state.app.ready,true);assert.equal(state.pdf.ready,true);assert.equal(state.ocr.ready,false);assert.equal(state.ocr.downloadBytes,300);assert.equal(state.model.ready,false);assert.equal(state.offlineReady,false);
 state=summarizeAssistantResources({appReady:true,manual:manual(),model:{...model(),ready:true,installed:true,missing:[],downloadBytes:0}});
 assert.equal(state.offlineReady,true);assert.equal(state.model.loaded,false,'Checking installed weights must not pretend the model is loaded');
 const uncontrolled=manual();uncontrolled.offlineControlled=false;
 state=summarizeAssistantResources({appReady:true,manual:uncontrolled,model:{...model(),ready:true}});
 assert.equal(state.pdf.ready,false);assert.equal(state.pdf.state,'waiting');assert.equal(state.ocr.ready,false);
 state=summarizeAssistantResources({appReady:true,manual:manual(),model:{...model(),installed:true,runtimeReady:false,ready:false,missing:[],downloadBytes:0}});
 assert.equal(state.model.state,'waiting','Saved weights awaiting app runtime must not suggest another model download');assert.equal(state.model.ready,false);assert.equal(state.offlineReady,false);
});

test('unsupported runtime and model runtime errors cannot advertise offline readiness',()=>{
 const state=summarizeAssistantResources({appReady:true,manual:manual(),model:{...model(),supported:false,ready:true,installed:true,capabilities:{missing:['WebAssembly'],backend:'wasm'},message:'Runtime missing'}});
 assert.equal(state.model.state,'unsupported');assert.equal(state.model.ready,false);assert.equal(state.offlineReady,false);assert.deepEqual(state.model.missingCapabilities,['WebAssembly']);
 const errored=summarizeAssistantResources({appReady:true,manual:manual(),model:{...model(),ready:true,status:'error'}});assert.equal(errored.model.ready,false);assert.equal(errored.offlineReady,false);
});

test('interrupted AI remains installed but is not advertised as ready or waiting for another download',()=>{
 const state=summarizeAssistantResources({appReady:true,manual:manual(),model:{...model(),installed:true,ready:false,runtimeReady:true,status:'interrupted',recovery:{blocked:true,state:'interrupted'},downloadBytes:0,message:'The previous local AI attempt was interrupted while loading the model.'}});
 assert.equal(state.model.state,'interrupted');assert.equal(state.model.installed,true);assert.equal(state.model.ready,false);assert.equal(state.model.downloadBytes,0);assert.equal(state.offlineReady,false);assert.match(state.model.message,/interrupted while loading/);
});

test('opening readiness is lightweight and does not prepare or load model weights',async()=>{
 const h=harness();await h.controller.open({origin:{mode:'questions',conversationId:'synthetic-qq'}});
 assert.equal(h.calls.model,0);assert.equal(h.calls.manual,0);assert.equal(h.controller.getState().model.loaded,false);assert.equal(h.controller.getState().pdf.ready,true);
 assert.match(h.modals[0],/App, PDF, OCR and model readiness are checked separately/);
 assert.equal(h.events.length,0,'Checking the cache is not a fabricated download event');
});

test('one operation locks both modes and retains the initiating conversation origin',async()=>{
 const work=deferred();const h=harness({prepare:async({onProgress})=>{onProgress({phase:'download',bytes:500,totalBytes:1000,message:'Half of the test bytes received'});await work.promise;return {...model(),ready:true,installed:true,missing:[],downloadBytes:0};}});
 await h.controller.open({origin:{mode:'questions',conversationId:'first'}});
 const first=h.controller.handleAction('resources-model');await tick();
 await h.controller.open({origin:{mode:'faults',jobId:'second'}});
 const repeated=h.controller.handleAction('resources-processing');await tick();
 assert.equal(h.calls.manual,0);assert.equal(h.calls.model,1);
 assert.equal(h.controller.getState().operation.progress.bytes,500);
 work.resolve();await Promise.all([first,repeated]);
 assert.deepEqual(h.events.map(x=>x.type),['resource_download_started','resource_download_completed']);
 assert.ok(h.events.every(x=>x.origin.conversationId==='first'&&x.resource==='model'));
 assert.equal(h.controller.getState().operation,null);assert.equal(h.controller.getState().model.ready,true);
});

test('cancellation settles, retains data readiness and can retry without duplicate operations',async()=>{
 let attempts=0;
 const h=harness({prepare:async({signal})=>{attempts++;if(attempts===1)await new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Synthetic cancellation','AbortError')),{once:true}));return {...model(),ready:true,installed:true,missing:[],downloadBytes:0};}});
 await h.controller.open({origin:{mode:'questions',conversationId:'cancel'}});
 const pending=h.controller.handleAction('model');await tick();assert.equal(h.controller.cancel(),true);await pending;
 assert.equal(h.controller.getState().operation,null);assert.equal(h.controller.getState().error.code,'RESOURCE_DOWNLOAD_CANCELLED');assert.equal(h.controller.getState().pdf.ready,true);assert.equal(h.controller.getState().model.ready,false);
 await h.controller.handleAction('retry');assert.equal(attempts,2);assert.equal(h.controller.getState().model.ready,true);assert.equal(h.controller.getState().error,null);
 assert.deepEqual(h.events.map(x=>x.type),['resource_download_started','resource_download_cancelled','resource_download_started','resource_download_completed']);
});

test('storage failure is surfaced without implying that the manual is corrupt',async t=>{
 t.mock.method(console,'error',()=>{});
 const h=harness({prepare:async()=>{throw Object.assign(Error('Synthetic quota exceeded'),{name:'QuotaExceededError',code:'STORAGE_UNAVAILABLE'});}});
 await h.controller.open({origin:{mode:'faults',jobId:'synthetic-job'}});await h.controller.handleAction('model');
 assert.equal(h.controller.getState().error.code,'STORAGE_UNAVAILABLE');assert.equal(h.controller.getState().model.ready,false);assert.equal(h.controller.getState().operation,null);
 assert.equal(h.events.at(-1).type,'resource_download_failed');assert.doesNotMatch(h.controller.getState().error.message,/clearer|unlocked|replace.*PDF/i);
});

function coordinatorHarness({getManual=async()=>manual(),getModel=async()=>model(),prepareModel=async()=>({...model(),ready:true,installed:true,missing:[],downloadBytes:0}),prepareProcessing=async()=>manual(),onEvent=()=>{},timeout=20,plainModelAPI=false}={}){
 const events=[],states=[],toasts=[],modals=[],panel={innerHTML:'',querySelectorAll:()=>[],closest:()=>null,contains:()=>false};
 const api={getLocalLanguageReadiness:getModel,prepareLocalLanguageResources:prepareModel};
 const controller=createAssistantResourcesController({getOfflineReady:()=>true,showModal:html=>modals.push(html),toast:value=>toasts.push(value),onChange:state=>states.push(state),onEvent:event=>{events.push(event);return onEvent(event);},dependencies:{resourceCheckTimeoutMs:timeout,selectPanel:()=>panel,getManualProcessingReadiness:getManual,downloadManualProcessingResources:prepareProcessing,loadLocalLanguage:plainModelAPI?()=>api:async()=>api}});
 return {controller,events,states,toasts,modals,panel};
}
async function promptly(promise,label='resource operation'){
 let timer;
 try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' did not settle promptly')),350);})]);}
 finally{clearTimeout(timer);}
}
const readyModel=()=>({...model(),ready:true,installed:true,missing:[],downloadBytes:0});

test('cancel immediately unlocks and permits retry even when the old download ignores abort',async()=>{
 const ignored=deferred();let attempts=0,readiness=model();
 const h=coordinatorHarness({getModel:async()=>structuredClone(readiness),prepareModel:async()=>{if(++attempts===1)return ignored.promise;readiness=readyModel();return readiness;}});
 await h.controller.open({origin:{mode:'questions',conversationId:'stalled-download'}});
 const first=h.controller.handleAction('model');await tick();assert.equal(attempts,1);assert.ok(h.controller.getState().operation);
 assert.equal(h.controller.cancel(),true);assert.equal(h.controller.getState().operation,null,'Cancel must unlock without waiting for the download to cooperate');
 await promptly(first,'cancelled download');assert.equal(h.controller.getState().error.code,'RESOURCE_DOWNLOAD_CANCELLED');
 await promptly(h.controller.handleAction('retry'),'retry after uncooperative cancellation');assert.equal(attempts,2);assert.equal(h.controller.getState().model.ready,true);assert.equal(h.controller.getState().error,null);
 ignored.resolve({...model(),supported:false,status:'error',message:'Late old result'});await tick();
 assert.equal(h.controller.getState().model.ready,true);assert.equal(h.controller.getState().error,null);
 assert.deepEqual(h.events.map(event=>event.type),['resource_download_started','resource_download_cancelled','resource_download_started','resource_download_completed']);
});

test('bounded readiness checks retain known byte counts and capabilities when cache reads stall',async()=>{
 const manualCheck=deferred(),modelCheck=deferred();let stalled=false;
 const h=coordinatorHarness({getManual:()=>stalled?manualCheck.promise:Promise.resolve(manual()),getModel:()=>stalled?modelCheck.promise:Promise.resolve(model()),timeout:15});
 await h.controller.open();const previous=h.controller.getState();stalled=true;
 await promptly(h.controller.refresh({fresh:true}),'stalled readiness check');const state=h.controller.getState();
 for(const key of ['pdf','ocr','model']){
  assert.equal(state[key].supported,previous[key].supported,key+' capability must not become unsupported after a cache timeout');
  assert.notEqual(state[key].state,'unsupported');assert.equal(state[key].totalBytes,previous[key].totalBytes);assert.equal(state[key].downloadBytes,previous[key].downloadBytes);
  assert.ok(state[key].readinessError,key+' should expose the failed readiness check');
 }
 manualCheck.resolve(manual());modelCheck.resolve(model());await tick();
});

test('a late timed-out readiness result cannot replace a newer successful cache check',async()=>{
 const oldManual=deferred(),oldModel=deferred();let calls=0;
 const h=coordinatorHarness({getManual:()=>calls===1?oldManual.promise:Promise.resolve(manual()),getModel:()=>calls===1?oldModel.promise:Promise.resolve(calls>1?readyModel():model()),timeout:15});
 await h.controller.open();calls=1;await promptly(h.controller.refresh({fresh:true}));calls=2;await h.controller.refresh({fresh:true});
 assert.equal(h.controller.getState().model.ready,true);const current=h.controller.getState();
 oldManual.resolve({supported:false,resources:[],offlineControlled:false,message:'Stale manual check'});oldModel.resolve({...model(),supported:false,ready:false,message:'Stale model check'});await tick();
 assert.deepEqual(h.controller.getState(),current);
});

test('readiness accepts a loader that returns its model API as a plain object',async()=>{
 const h=coordinatorHarness({plainModelAPI:true});await h.controller.open();const state=h.controller.getState();
 assert.equal(state.pdf.ready,true);assert.equal(state.model.supported,true);assert.equal(state.model.totalBytes,1020);assert.equal(state.model.downloadBytes,1000);assert.equal(state.model.state,'missing');assert.equal(state.model.readinessError,undefined);
});

test('old download progress and completion cannot overwrite a new active attempt or its origin',async()=>{
 const oldWork=deferred(),newWork=deferred();let attempts=0,oldProgress,readiness=model();
 const h=coordinatorHarness({getModel:async()=>structuredClone(readiness),prepareModel:async({onProgress})=>{
  attempts++;if(attempts===1){oldProgress=onProgress;onProgress({phase:'download',bytes:100,totalBytes:1000,message:'Old attempt receiving'});return oldWork.promise;}
  onProgress({phase:'download',bytes:300,totalBytes:1000,message:'New attempt receiving'});await newWork.promise;readiness=readyModel();return readiness;
 }});
 await h.controller.open({origin:{mode:'questions',conversationId:'old-job'}});const oldPending=h.controller.handleAction('model');await tick();const oldId=h.controller.getState().operation.id;
 h.controller.cancel();await promptly(oldPending);await h.controller.open({origin:{mode:'faults',jobId:'new-job'}});
 const newPending=h.controller.handleAction('retry');await tick();const current=h.controller.getState().operation;assert.notEqual(current.id,oldId);assert.equal(current.progress.bytes,300);
 assert.doesNotThrow(()=>oldProgress({phase:'download',bytes:999,totalBytes:1000,message:'Stale progress'}));assert.equal(h.controller.getState().operation.id,current.id);assert.equal(h.controller.getState().operation.progress.bytes,300);
 oldWork.resolve({...model(),supported:false,status:'error',message:'Stale completion'});await tick();assert.equal(h.controller.getState().operation.id,current.id);assert.equal(h.controller.getState().model.supported,true);
 newWork.resolve();await promptly(newPending);assert.equal(h.controller.getState().model.ready,true);assert.equal(h.controller.getState().operation,null);
 const completed=h.events.filter(event=>event.type==='resource_download_completed');assert.equal(completed.length,1);assert.deepEqual(completed[0].origin,{mode:'faults',jobId:'new-job'});
});

test('unresolved conversation event callbacks do not block download completion or cancellation',async()=>{
 const blockedEvent=deferred(),blockedDownload=deferred();let attempts=0,readiness=model();
 const h=coordinatorHarness({getModel:async()=>structuredClone(readiness),onEvent:()=>blockedEvent.promise,prepareModel:async()=>{attempts++;if(attempts===1){readiness=readyModel();return readiness;}return blockedDownload.promise;}});
 await h.controller.open({origin:{mode:'questions',conversationId:'event-storage-stalled'}});
 await promptly(h.controller.handleAction('model'),'download with stalled event callback');assert.equal(attempts,1);assert.equal(h.controller.getState().model.ready,true);assert.equal(h.controller.getState().operation,null);
 readiness=model();await h.controller.refresh({fresh:true});const second=h.controller.handleAction('model');await tick();assert.equal(attempts,2);
 h.controller.cancel();assert.equal(h.controller.getState().operation,null);await promptly(second,'cancellation with stalled event callback');assert.equal(h.controller.getState().error.code,'RESOURCE_DOWNLOAD_CANCELLED');
 blockedDownload.resolve(readyModel());blockedEvent.resolve();await tick();assert.equal(h.controller.getState().operation,null);
 assert.deepEqual(h.events.map(event=>event.type),['resource_download_started','resource_download_completed','resource_download_started','resource_download_cancelled']);
});

test('download progress separates durable saved parts from received bytes and the current transfer',async()=>{
 const work=deferred(),cacheCheck=deferred(),saved=62_247_799,total=366_600_000;let stallChecks=false;
 const h=coordinatorHarness({getModel:()=>stallChecks?cacheCheck.promise:Promise.resolve(model()),prepareModel:async({onProgress})=>{onProgress({phase:'download',bytes:saved,totalBytes:total,receivedBytes:6_000_000,partReceived:2_000_000,partTotal:4_000_000,partIndex:1,partCount:3,fallback:true,message:'Receiving synthetic model bytes'});await work.promise;return readyModel();}});
 await h.controller.open();const pending=h.controller.handleAction('model');await tick();await h.controller.open();
 assert.match(h.panel.innerHTML,/Saved parts: 62\.2 MB \/ 366\.6 MB/);assert.match(h.panel.innerHTML,/Current transfer: 2\.0 MB \/ 4\.0 MB/);assert.match(h.panel.innerHTML,/part 2 of 3/);
 assert.equal(h.controller.getState().model.totalBytes,total);assert.equal(h.controller.getState().model.savedBytes,saved);assert.equal(h.controller.getState().model.downloadBytes,304_352_201);assert.match(h.panel.innerHTML,/304\.4 MB still to download.*366\.6 MB total/);
 assert.match(h.panel.innerHTML,/6\.0 MB received/);assert.match(h.panel.innerHTML,/earlier bytes.*reread/);assert.ok(h.panel.innerHTML.includes(`<progress value="${saved/total}"`));
 assert.equal(h.controller.getState().model.ready,false,'Receiving bytes is not completion or verified readiness');
 const checkAttributes=()=>h.panel.innerHTML.match(/<button\b([^>]*data-action="resources-check"[^>]*)>/)?.[1];
 assert.ok(checkAttributes());assert.doesNotMatch(checkAttributes(),/\bdisabled\b/,'Check saved files stays usable while downloading');
 stallChecks=true;await promptly(h.controller.handleAction('check'),'cache check during an active download');assert.ok(h.controller.getState().operation);assert.doesNotMatch(checkAttributes(),/\bdisabled\b/,'A stalled check becomes available again after its bounded wait');
 stallChecks=false;cacheCheck.resolve(model());h.controller.cancel();await promptly(pending);work.resolve();await tick();
});
