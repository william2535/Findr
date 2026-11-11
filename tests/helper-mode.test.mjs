import test from 'node:test';
import assert from 'node:assert/strict';
import {helperMode,validOnlineConsent,withHelperMode,resetImportedOnlineConsent} from '../public/app/helper-mode.mjs';
import {createConversation,createHelper,normalizeHelper,importHelper,loadHelpers,HELPERS_KEY} from '../public/app/helpers-store.mjs';
import {openDB} from '../public/app/db.mjs';
import {ONLINE_PROVIDER} from '../public/app/online-language-policy.mjs';

const consent=()=>({provider:ONLINE_PROVIDER.id,modelId:ONLINE_PROVIDER.modelId,version:ONLINE_PROVIDER.consentVersion,acceptedAt:123,freePlanConfirmed:true});

test('new and legacy conversations default offline while explicit manual-search preferences survive',()=>{
 assert.equal(helperMode(),'offline');assert.equal(helperMode(createConversation()),'offline');
 assert.equal(helperMode({manualOnly:true}),'manual');assert.equal(helperMode({manualOnly:false}),'offline');
 assert.equal(helperMode({aiMode:'unsupported'}),'offline');assert.equal(helperMode({aiMode:'unsupported',manualOnly:true}),'manual');
 for(const aiMode of ['offline','online','manual'])assert.equal(helperMode({aiMode}),aiMode);
});

test('consent is bound to the exact provider, model, disclosure version and free-plan acknowledgement',()=>{
 assert.equal(validOnlineConsent(consent()),true);
 for(const patch of [{provider:'another-provider'},{modelId:'another-model'},{version:'old-version'},{freePlanConfirmed:false},{freePlanConfirmed:'true'},{acceptedAt:0},{acceptedAt:-1},{acceptedAt:NaN},{acceptedAt:Infinity},{acceptedAt:'123'}]){
  const invalid={...consent(),...patch};assert.equal(validOnlineConsent(invalid),false);
  assert.throws(()=>withHelperMode(createConversation(),'online',invalid),error=>error.code==='ONLINE_CONSENT_REQUIRED');
 }
 for(const absent of [undefined,null,{},[]])assert.equal(validOnlineConsent(absent),false);
});

test('choosing online requires fresh explicit consent and stores only the permitted metadata',()=>{
 const previous={...createConversation({id:'job'}),manualOnly:true,messages:[{role:'user',text:'Keep this question'}],context:{observations:[{raw:'24.1 V'}]}};
 const snapshot=structuredClone(previous),input={...consent(),apiKey:'SYNTHETIC-DO-NOT-PERSIST',endpoint:'https://untrusted.invalid',extra:{private:'secret'}};
 assert.throws(()=>withHelperMode(previous,'online'),error=>error.code==='ONLINE_CONSENT_REQUIRED');
 const next=withHelperMode(previous,'online',input);
 assert.equal(helperMode(next),'online');assert.equal(next.manualOnly,false);assert.deepEqual(next.onlineConsent,consent());assert.deepEqual(previous,snapshot);
 assert.deepEqual(next.messages,snapshot.messages);assert.deepEqual(next.context,snapshot.context);assert.doesNotMatch(JSON.stringify(next),/SYNTHETIC-DO-NOT-PERSIST|untrusted|private/);
 input.acceptedAt=999;assert.equal(next.onlineConsent.acceptedAt,123);
 assert.throws(()=>withHelperMode(previous,'automatic'),/Choose Offline AI, Online AI or Manual search/);
});

test('switching back to offline or manual search removes online consent without losing job evidence',()=>{
 const online=withHelperMode({...createConversation(),faultSession:{id:'fault',readings:[{raw:'OL',point:'isolated fixture span'}]}},'online',consent());
 for(const mode of ['offline','manual']){
  const next=withHelperMode(online,mode);assert.equal(helperMode(next),mode);assert.equal(Object.hasOwn(next,'onlineConsent'),false);assert.equal(next.manualOnly,mode==='manual');assert.deepEqual(next.faultSession,online.faultSession);
 }
 assert.equal(helperMode(online),'online');assert.deepEqual(online.onlineConsent,consent());
});

test('mode and consent belong to each conversation rather than the helper or next job',()=>{
 const first=withHelperMode(createConversation({id:'first'}),'online',consent()),second=createConversation({id:'second'});
 const pal=createHelper({id:'pal',name:'Synthetic pal',scope:{kind:'panel',model:'Fixture Panel'},conversations:[first,second]});
 const loaded=normalizeHelper(JSON.parse(JSON.stringify(pal)));
 assert.equal(helperMode(loaded.conversations[0]),'online');assert.deepEqual(loaded.conversations[0].onlineConsent,consent());
 assert.equal(helperMode(loaded.conversations[1]),'offline');assert.equal(loaded.conversations[1].onlineConsent,undefined);
 assert.equal(createConversation().onlineConsent,undefined);assert.equal(helperMode(createConversation()),'offline');
});

test('import reset removes online authorisation while preserving transcript, readings and reference-only mode',()=>{
 const base={...createConversation(),messages:[{role:'assistant',text:'Saved historical answer',model:{backend:'online',provider:'Groq'}}],context:{confirmedModel:'Fixture Panel'},faultSession:{id:'fault',readings:[{raw:'024.10 V'}]}};
 const online=withHelperMode(base,'online',consent()),snapshot=structuredClone(online),reset=resetImportedOnlineConsent(online);
 assert.equal(helperMode(reset),'offline');assert.equal(reset.manualOnly,false);assert.equal(Object.hasOwn(reset,'onlineConsent'),false);
 assert.deepEqual(reset.messages,base.messages);assert.deepEqual(reset.context,base.context);assert.deepEqual(reset.faultSession,base.faultSession);assert.deepEqual(online,snapshot);
 for(const mode of ['offline','manual']){
  const imported=resetImportedOnlineConsent({...withHelperMode(base,mode),onlineConsent:consent()});
  assert.equal(helperMode(imported),mode);assert.equal(Object.hasOwn(imported,'onlineConsent'),false);
 }
});

// Minimal in-memory IDB contract for the real import path: no filesystem,
// network or browser database is touched. Every mutation is staged until commit.
function memoryDB(){
 const stores=new Map([['manuals',new Map()],['files',new Map()],['settings',new Map()]]);
 const db={close(){},transaction(names,mode){
  const staged=new Map(names.map(name=>[name,new Map(stores.get(name))]));let aborted=false,pending=0;
  const transaction={error:null,abort(){aborted=true;queueMicrotask(()=>transaction.onabort?.());},objectStore(name){
   const values=staged.get(name);assert.ok(values);
   function request(value){const result={};pending++;queueMicrotask(()=>{result.result=structuredClone(value);result.onsuccess?.({target:result});pending--;queueMicrotask(()=>{if(aborted||pending)return;if(mode==='readwrite')for(const [store,items]of staged)stores.set(store,items);transaction.oncomplete?.();});});return result;}
   return {get:key=>request(values.get(key)),getAll:()=>request([...values.values()]),put:(value,key)=>values.set(key||value.id,structuredClone(value)),delete:key=>values.delete(key)};
  }};return transaction;
 }};
 return {db,stores,indexedDB:{open(){const request={};queueMicrotask(()=>{request.result=db;request.onsuccess?.();});return request;}}};
}

test('actual helper backup import resets online consent and readiness before persisting the restored job',async t=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'indexedDB'),memory=memoryDB();Object.defineProperty(globalThis,'indexedDB',{value:memory.indexedDB,writable:true,configurable:true});
 t.after(()=>{memory.db.onversionchange?.();if(previous)Object.defineProperty(globalThis,'indexedDB',previous);else delete globalThis.indexedDB;});
 const online=withHelperMode({...createConversation({id:'online-job'}),messages:[{role:'user',text:'Saved original question'}],context:{observations:[{raw:'024.10 V'}]}},'online',consent());
 const manual=withHelperMode(createConversation({id:'manual-job'}),'manual');
 const source=createHelper({id:'source',name:'Synthetic pal',scope:{kind:'panel',model:'Fixture Panel',verifiedFamily:true},selectedManualIds:['fixture-manual'],requiredManualIds:['fixture-manual'],manualStates:{'fixture-manual':{status:'ready',contentHash:'a'.repeat(64)}},conversations:[online,manual]});
 const snapshot=structuredClone(source),imported=await importHelper({kind:'findr-helper',schemaVersion:1,helper:source,manuals:[]});
 assert.notEqual(imported.id,source.id);assert.equal(helperMode(imported.conversations[0]),'offline');assert.equal(imported.conversations[0].onlineConsent,undefined);assert.equal(helperMode(imported.conversations[1]),'manual');
 assert.deepEqual(imported.conversations[0].messages,source.conversations[0].messages);assert.deepEqual(imported.conversations[0].context,source.conversations[0].context);
 assert.equal(imported.manualStates['fixture-manual'].status,'pending');assert.equal(imported.scope.verifiedFamily,false);assert.deepEqual(source,snapshot);
 const saved=(await loadHelpers()).helpers.find(item=>item.id===imported.id);assert.deepEqual(saved,imported);assert.equal(saved.conversations[0].onlineConsent,undefined);
 assert.equal(memory.stores.get('settings').get(HELPERS_KEY).helpers.length,1);assert.equal(await openDB(),memory.db);
});
