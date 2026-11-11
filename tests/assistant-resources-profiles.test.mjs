import test from 'node:test';
import assert from 'node:assert/strict';
import {createAssistantResourcesController} from '../public/app/assistant-resources.mjs';

// Deterministic coordinator tests only. These doubles do not establish model
// inference, hardware capacity, download integrity or language quality.
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const manual=()=>({ready:true,supported:true,offlineControlled:true,resources:[{kind:'pdf',bytes:100,cached:true},{kind:'ocr',bytes:100,cached:true}]});
const descriptors=[{id:'compact',title:'Compact fixture',bytes:366000000,runtimeBytes:12000000},{id:'conversation-2b',title:'Experimental fixture',experimental:true,bytes:1281000000,runtimeBytes:29400000}];
const state=(profileId,{installed=true,proof=true}={})=>({profileId,ready:installed&&proof,installed,canGenerate:installed&&proof,canActivate:installed&&proof,status:installed&&proof?'ready':'missing',supported:true,runtimeReady:installed,model:{id:'SYNTHETIC-'+profileId,title:descriptors.find(p=>p.id===profileId).title,bytes:descriptors.find(p=>p.id===profileId).bytes},downloadBytes:installed?0:descriptors.find(p=>p.id===profileId).bytes,totalBytes:descriptors.find(p=>p.id===profileId).bytes,missing:installed?[]:[{path:'SYNTHETIC-weights'}],trialProof:proof?{model:'SYNTHETIC',passed:true}:null,capabilities:{backend:'wasm',missing:[]}});
function harness({download,probe,candidateCheck,activate,timeout=25}={}){
 let active='compact',candidate=state('conversation-2b',{installed:false,proof:false});const calls=[],events=[],states=[],panel={innerHTML:'',querySelectorAll:()=>[],closest:()=>null,contains:()=>false};
 const api={getLocalLanguageProfiles:()=>descriptors,getActiveLocalLanguageProfile:()=>({id:active}),getLocalLanguageReadiness:async({profileId=active}={})=>profileId==='compact'?state('compact'):candidateCheck?candidateCheck(candidate):structuredClone(candidate),prepareLocalLanguageResources:async options=>{calls.push({method:'download',profileId:options.profileId});const result=download?await download(options):state(options.profileId,{proof:false});candidate=result;return result;},allowLocalLanguageRetry:async({profileId})=>{calls.push({method:'allowRetry',profileId});},testLocalLanguageProfile:async(profileId,options)=>{calls.push({method:'probe',profileId});const result=probe?await probe(profileId,options):{passed:true,profileId,readiness:state(profileId)};if(result?.passed)candidate=result.readiness;return result;},setActiveLocalLanguageProfile:profileId=>{calls.push({method:'activate',profileId});if(activate)activate(profileId);if(profileId==='conversation-2b'&&!candidate.canActivate)throw Error('Synthetic proof missing');active=profileId;return {id:active};}};
 const controller=createAssistantResourcesController({getOfflineReady:()=>true,showModal:()=>{},onEvent:value=>events.push(value),onChange:value=>states.push(value),dependencies:{selectPanel:()=>panel,getManualProcessingReadiness:async()=>manual(),downloadManualProcessingResources:async()=>{calls.push({method:'processing'});return manual();},loadLocalLanguage:()=>api,resourceCheckTimeoutMs:timeout}});
 return {controller,calls,events,states,panel,get active(){return active;}};
}
test('opening resources shows an optional honest larger model without downloading or changing the compact default',async()=>{
 const h=harness();await h.controller.open({origin:{kind:'helper',id:'pal',conversationId:'job'}});
 assert.equal(h.active,'compact');assert.deepEqual(h.calls,[]);assert.equal(h.controller.getState().model.ready,true);
 assert.match(h.panel.innerHTML,/Experimental offline conversation model/);assert.match(h.panel.innerHTML,/1\.28 GB model \+ 29\.4 MB runtime/);assert.match(h.panel.innerHTML,/Download &amp; test experimental model|Download & test experimental model/);
 assert.match(h.panel.innerHTML,/33–87 seconds/);assert.match(h.panel.innerHTML,/2\.2 GiB/);assert.match(h.panel.innerHTML,/iPhone has not been validated/);assert.match(h.panel.innerHTML,/three of five/);assert.match(h.panel.innerHTML,/not general conversation quality/);
});
test('candidate download and device-test progress never replace active compact readiness; activation follows successful test',async()=>{
 const downloading=deferred(),testing=deferred();const h=harness({download:async({onProgress})=>{onProgress({phase:'download',bytes:8000000,totalBytes:1281000000,message:'Real transfer event represented by test double'});await downloading.promise;return state('conversation-2b',{proof:false});},probe:async()=>{await testing.promise;return {passed:true,readiness:state('conversation-2b')};}});
 const origin={kind:'helper',id:'pal-a',conversationId:'job-a'};await h.controller.open({origin});const pending=h.controller.handleAction('experimental');await tick();await h.controller.open({origin:{kind:'helper',id:'pal-b',conversationId:'job-b'}});
 assert.equal(h.active,'compact');assert.equal(h.controller.getState().model.state,'ready');assert.equal(h.controller.getState().model.totalBytes,366000000);assert.equal(h.controller.getState().experimental.savedBytes,8000000);assert.equal(h.controller.getState().operation.profileId,'conversation-2b');
 const locked=h.controller.handleAction('processing');await tick();assert.ok(!h.calls.some(c=>c.method==='processing'));downloading.resolve();await tick();await tick();assert.equal(h.controller.getState().operation.stage,'test');assert.equal(h.controller.getState().model.ready,true);assert.match(h.panel.innerHTML,/Stop device test/);assert.equal(h.active,'compact');assert.ok(!h.calls.some(c=>c.method==='activate'));
 testing.resolve();await Promise.all([pending,locked]);assert.equal(h.active,'conversation-2b');assert.deepEqual(h.calls.map(c=>c.method),['download','allowRetry','probe','activate']);assert.ok(h.events.every(e=>e.origin.id==='pal-a'&&e.origin.conversationId==='job-a'&&e.profileId==='conversation-2b'));assert.equal(h.events.at(-1).type,'resource_profile_selected');assert.equal(h.events.at(-1).deviceTestPassed,true);
});
test('cancelled candidate download cannot probe or activate when an old ignored-abort operation later resolves',async()=>{
 const blocked=deferred(),h=harness({download:()=>blocked.promise});await h.controller.open();const pending=h.controller.handleAction('experimental');await tick();h.controller.cancel();await pending;
 assert.equal(h.active,'compact');assert.equal(h.controller.getState().model.ready,true);assert.equal(h.controller.getState().error.code,'RESOURCE_DOWNLOAD_CANCELLED');assert.equal(h.controller.getState().operation,null);
 blocked.resolve(state('conversation-2b',{proof:false}));await tick();assert.deepEqual(h.calls.map(c=>c.method),['download']);assert.equal(h.active,'compact');assert.equal(h.events.filter(e=>e.type==='resource_profile_selected').length,0);
});
test('cancelling a running device test preserves the current model and distinguishes it from a download failure',async()=>{
 const blocked=deferred(),h=harness({probe:()=>blocked.promise});await h.controller.open();const pending=h.controller.handleAction('experimental');await tick();await tick();assert.equal(h.controller.getState().operation.stage,'test');h.controller.cancel();await pending;
 assert.equal(h.active,'compact');assert.equal(h.controller.getState().error.code,'RESOURCE_TEST_CANCELLED');assert.match(h.controller.getState().error.message,/Device test stopped/);assert.match(h.panel.innerHTML,/Retry device test/);assert.equal(h.controller.getState().model.ready,true);
 blocked.resolve({passed:true,readiness:state('conversation-2b')});await tick();assert.ok(!h.calls.some(c=>c.method==='activate'));assert.equal(h.active,'compact');
});
test('failed device test retains the installed candidate, compact readiness and a useful explicit retry',async t=>{
 t.mock.method(console,'error',()=>{});let attempts=0;const h=harness({probe:async()=>{if(++attempts===1)throw Object.assign(Error('Synthetic memory limit'),{code:'MODEL_MEMORY_LIMIT'});return {passed:true,readiness:state('conversation-2b')};}});
 await h.controller.open();await h.controller.handleAction('experimental');await tick();assert.equal(h.active,'compact');assert.equal(h.controller.getState().model.ready,true);assert.equal(h.controller.getState().experimental.installed,true);assert.match(h.controller.getState().error.message,/device test did not finish/);assert.doesNotMatch(h.controller.getState().error.message,/PDF|clearer|unlock/);
 await h.controller.handleAction('retry');assert.equal(attempts,2);assert.equal(h.active,'conversation-2b');assert.equal(h.controller.getState().error,null);assert.equal(h.calls.filter(c=>c.method==='activate').length,1);
});
test('an unsuccessful trial return is not proof and cannot activate the candidate',async t=>{
 t.mock.method(console,'error',()=>{});const h=harness({probe:async()=>({passed:false})});await h.controller.open();await h.controller.handleAction('experimental');assert.equal(h.active,'compact');assert.equal(h.controller.getState().error.code,'MODEL_TEST_FAILED');assert.ok(!h.calls.some(c=>c.method==='activate'));
});
test('activation storage failure is reported at selection stage and does not change the compact profile',async t=>{
 t.mock.method(console,'error',()=>{});const h=harness({activate:()=>{throw Object.assign(Error('Synthetic preference quota'),{code:'STORAGE_UNAVAILABLE'});}});await h.controller.open();await h.controller.handleAction('experimental');assert.equal(h.active,'compact');assert.equal(h.controller.getState().error.stage,'activate');assert.match(h.controller.getState().error.message,/test passed, but the model selection could not be saved/);
});
test('an optional cache check timeout does not downgrade installed active resources',async()=>{
 const blocked=deferred(),h=harness({candidateCheck:()=>blocked.promise,timeout:10});await h.controller.open();const current=h.controller.getState();assert.equal(current.model.ready,true);assert.equal(current.offlineReady,true);assert.equal(current.activeProfile,'compact');blocked.resolve(state('conversation-2b'));await tick();assert.equal(h.active,'compact');
});
test('switching to compact and scoped manual-search events do not delete files or automatically download another model',async()=>{
 const h=harness(),origin={kind:'helper',id:'pal',conversationId:'saved-job'};await h.controller.open({origin});await h.controller.handleAction('experimental');const downloads=h.calls.filter(c=>c.method==='download').length;await h.controller.handleAction('compact');assert.equal(h.active,'compact');assert.equal(h.calls.filter(c=>c.method==='download').length,downloads);assert.equal(h.events.at(-1).type,'resource_profile_selected');assert.equal(h.events.at(-1).profileId,'compact');
 await h.controller.handleAction('manual-search');assert.equal(h.events.at(-1).type,'resource_reference_selected');assert.deepEqual(h.events.at(-1).origin,origin);assert.equal(h.active,'compact');assert.ok(!h.calls.some(c=>/delete|remove/.test(c.method)));
 await h.controller.open({origin:{kind:'questions',id:'legacy'}});assert.equal(await h.controller.handleAction('manual-search'),false);
});
