// Mocked HTTP contracts only. These tests do not establish real provider
// availability, free-tier eligibility, performance or language-model quality.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createOnlineLanguage,hasOnlineConsent} from '../public/app/online-language.mjs';
import {ONLINE_PROVIDER} from '../public/app/online-language-policy.mjs';

const KEY='SYNTHETIC_TEST_KEY_NEVER_A_REAL_CREDENTIAL';
const consent=()=>({provider:ONLINE_PROVIDER.id,modelId:ONLINE_PROVIDER.modelId,version:ONLINE_PROVIDER.consentVersion,acceptedAt:1000,freePlanConfirmed:true});
const request=extra=>({messages:[{role:'user',content:'SYNTHETIC: view event history and check the reported fault.'}],consent:consent(),...extra});
const result=extra=>({text:JSON.stringify({intent:'procedure',tasks:[{action:'view',target:'event history'}],focusTask:null,observations:[]}),modelId:ONLINE_PROVIDER.modelId,provider:ONLINE_PROVIDER.name,backend:'online',metrics:{inputTokens:22,outputTokens:17},...extra});
const response=(body=result(),status=200)=>Response.json(body,{status});
function setup(overrides={}){
 const calls=[];let connected=true;
 const api=createOnlineLanguage({getOrigin:()=> 'https://findr.test',getOnline:()=>connected,fetchImpl:async(...args)=>{calls.push(args);return response();},...overrides});
 return {api,calls,setOnline:value=>{connected=value;}};
}
const errorCode=code=>error=>error.code===code&&!String(error.message).includes(KEY);
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

test('online setup and readiness make no request and expose no credential or offline-ready claim',()=>{
 const {api,calls}=setup();assert.equal(api.getOnlineReadiness().reason,'key-required');
 const ready=api.setOnlineKey(KEY);assert.equal(ready.available,true);assert.equal(ready.canGenerate,true);assert.equal(ready.mode,'online');assert.equal(ready.model.dialogueFormat,'json');
 assert.equal(Object.hasOwn(ready,'installed'),false);assert.equal(Object.hasOwn(ready,'readyOffline'),false);assert.equal(Object.hasOwn(ready,'ready'),false);assert.doesNotMatch(JSON.stringify(ready),/SYNTHETIC_TEST_KEY/);assert.equal(calls.length,0);
 assert.equal(setup().api.getOnlineReadiness().hasKey,false,'A new app instance does not recover a saved credential');
 assert.equal(api.clearOnlineKey().hasKey,false);assert.equal(calls.length,0);
});

test('missing or mismatched provider/model consent prevents all transmission',async()=>{
 const {api,calls}=setup();api.setOnlineKey(KEY);
 for(const value of [null,{}, {...consent(),provider:'another'}, {...consent(),modelId:'other-model'}, {...consent(),version:'old'}, {...consent(),acceptedAt:0}, {...consent(),acceptedAt:Infinity}, {...consent(),freePlanConfirmed:false}]){
  assert.equal(hasOnlineConsent(value),false);await assert.rejects(api.generateOnlineReply(request({consent:value})),errorCode('ONLINE_CONSENT_REQUIRED'));
 }
 assert.equal(calls.length,0);
});

test('missing key, offline connection and unsupported browser are distinct and do not fetch',async()=>{
 const {api,calls,setOnline}=setup();await assert.rejects(api.generateOnlineReply(request()),errorCode('ONLINE_KEY_REQUIRED'));api.setOnlineKey(KEY);setOnline(false);assert.equal(api.getOnlineReadiness().reason,'offline');await assert.rejects(api.generateOnlineReply(request()),errorCode('ONLINE_OFFLINE'));assert.equal(calls.length,0);
 const noFetch=setup({supported:()=>false});noFetch.api.setOnlineKey(KEY);await assert.rejects(noFetch.api.generateOnlineReply(request()),errorCode('ONLINE_UNSUPPORTED'));assert.equal(noFetch.calls.length,0);
});

test('invalid key entry preserves the previous key and never echoes supplied credentials',async()=>{
 const {api,calls}=setup();api.setOnlineKey(KEY);
 for(const bad of [null,'short',KEY+'\r\nheader: value','a'.repeat(513)])assert.throws(()=>api.setOnlineKey(bad),errorCode('ONLINE_KEY_INVALID'));
 await api.generateOnlineReply(request());assert.equal(calls[0][1].headers['X-FINDR-Provider-Key'],KEY);
});

test('only explicit messages travel to a fixed same-origin no-store endpoint',async()=>{
 const {api,calls}=setup();api.setOnlineKey(KEY);const events=[];
 const reply=await api.generateOnlineReply(request({modelId:'ignored-model',endpoint:'https://unrelated.invalid',allManuals:['NOT SENT'],messages:[{role:'user',content:'SYNTHETIC exact question',privateMetadata:'NOT SENT'}],onProgress:event=>events.push(event),maxNewTokens:256}));
 assert.equal(calls.length,1);const [url,options]=calls[0];assert.equal(url,'/api/assistant/online');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');assert.equal(options.credentials,'same-origin');assert.equal(options.method,'POST');
 const payload=JSON.parse(options.body);assert.deepEqual(payload.messages,[{role:'user',content:'SYNTHETIC exact question'}]);assert.equal(payload.allowOnline,true);assert.equal(payload.consentVersion,ONLINE_PROVIDER.consentVersion);assert.equal(payload.maxNewTokens,256);assert.doesNotMatch(options.body,/NOT SENT|SYNTHETIC_TEST_KEY|ignored-model|unrelated/);
 assert.equal(reply.backend,'online');assert.equal(reply.provider,'Groq');assert.equal(reply.metrics.inputTokens,22);assert.equal(events.length,2);assert.doesNotMatch(JSON.stringify({reply,events}),/SYNTHETIC_TEST_KEY/);
});

test('full questions are rejected visibly when request limits are exceeded, never silently truncated',async()=>{
 const {api,calls}=setup();api.setOnlineKey(KEY);
 const bad=[{messages:[]},{messages:Array.from({length:21},()=>({role:'user',content:'x'}))},{messages:[{role:'tool',content:'x'}]},{messages:[{role:'user',content:{text:'x'}}]},{maxNewTokens:1025},{choices:['S1'],outputFormat:'tasks'},{choices:['\n']},{outputFormat:'unknown'}];
 for(const extra of bad)await assert.rejects(api.generateOnlineReply(request(extra)),errorCode('ONLINE_REQUEST_INVALID'));
 await assert.rejects(api.generateOnlineReply(request({messages:[{role:'user',content:'α'.repeat(40000)}]})),errorCode('ONLINE_PAYLOAD_TOO_LARGE'));assert.equal(calls.length,0);
});

test('exact-choice output and task JSON retain strict shape checks',async()=>{
 const calls=[];const api=createOnlineLanguage({fetchImpl:async(url,options)=>{calls.push(JSON.parse(options.body));return response(result({text:'SOURCE S1 NEXT NONE'}));}});api.setOnlineKey(KEY);
 const reply=await api.generateOnlineReply(request({choices:['SOURCE S1 NEXT NONE','SOURCE NONE NEXT NONE']}));assert.equal(reply.text,'SOURCE S1 NEXT NONE');assert.deepEqual(calls[0].choices,['SOURCE S1 NEXT NONE','SOURCE NONE NEXT NONE']);
 await assert.rejects(api.generateOnlineReply(request({choices:['OTHER']})),errorCode('ONLINE_RESPONSE_INVALID'));
 const tasks=setup({fetchImpl:async()=>response(result({text:'{"tasks":[{"action":"view","target":"history"}]}'}))});tasks.api.setOnlineKey(KEY);assert.match((await tasks.api.generateOnlineReply(request({outputFormat:'tasks'}))).text,/history/);
});

test('provider failures use safe classified messages and never retry automatically',async()=>{
 const cases=[[401,'ONLINE_AUTH_FAILED','ONLINE_PROVIDER_AUTH'],[429,'ONLINE_RATE_LIMITED','ONLINE_RATE_LIMIT'],[402,'ONLINE_BILLING_REQUIRED','ONLINE_BILLING_REQUIRED'],[504,'ONLINE_TIMEOUT','ONLINE_TIMEOUT'],[413,'ONLINE_REQUEST_TOO_LARGE','ONLINE_PAYLOAD_TOO_LARGE'],[403,'ONLINE_ORIGIN_REJECTED','ONLINE_CONFIGURATION_ERROR'],[502,'ONLINE_INVALID_RESPONSE','ONLINE_RESPONSE_INVALID']];
 for(const [status,code,expected] of cases){let calls=0;const {api}=setup({fetchImpl:async()=>{calls++;return response({error:{code,message:KEY,rawProviderBody:KEY}},status);}});api.setOnlineKey(KEY);await assert.rejects(api.generateOnlineReply(request()),errorCode(expected));assert.equal(calls,1);}
});

test('network exceptions are redacted and a lost connection receives the offline error',async()=>{
 const {api,setOnline}=setup({fetchImpl:async()=>{throw Object.assign(Error(KEY),{code:'ONLINE_NETWORK_ERROR'});}});api.setOnlineKey(KEY);await assert.rejects(api.generateOnlineReply(request()),errorCode('ONLINE_NETWORK_ERROR'));
 const lost=setup({fetchImpl:async()=>{lost.setOnline(false);throw Error(KEY);}});lost.api.setOnlineKey(KEY);await assert.rejects(lost.api.generateOnlineReply(request()),errorCode('ONLINE_OFFLINE'));
});

test('disconnect aborts every in-flight request and rejects late fetch responses',async()=>{
 const calls=[],resolves=[];const {api}=setup({fetchImpl:(url,options)=>{calls.push(options);return new Promise(resolve=>resolves.push(resolve));}});api.setOnlineKey(KEY);
 const first=api.generateOnlineReply(request()),second=api.generateOnlineReply(request());const settled=[assert.rejects(first,{name:'AbortError'}),assert.rejects(second,{name:'AbortError'})];await tick();api.clearOnlineKey();await Promise.all(settled);assert.ok(calls.every(call=>call.signal.aborted));assert.equal(api.getOnlineReadiness().hasKey,false);
 resolves.forEach(resolve=>resolve(response()));await tick();assert.equal(api.getOnlineReadiness().hasKey,false);
});

test('key replacement fences old replies without clearing the newly selected credential',async()=>{
 let resolve;const {api}=setup({fetchImpl:()=>new Promise(done=>resolve=done)});api.setOnlineKey(KEY);const pending=api.generateOnlineReply(request());const rejected=assert.rejects(pending,{name:'AbortError'});await tick();api.setOnlineKey(KEY+'_NEW');await rejected;resolve(response());await tick();assert.equal(api.getOnlineReadiness().hasKey,true);
});

test('caller cancellation works during body reading and cannot publish a late reply',async()=>{
 let stream;const {api}=setup({fetchImpl:async()=>new Response(new ReadableStream({start(controller){stream=controller;}}),{headers:{'content-type':'application/json'}})});api.setOnlineKey(KEY);const controller=new AbortController();const pending=api.generateOnlineReply(request({signal:controller.signal}));const rejected=assert.rejects(pending,{name:'AbortError'});await tick();controller.abort();await rejected;assert.throws(()=>stream.enqueue(new TextEncoder().encode(JSON.stringify(result()))));
});

test('timeouts bound both ignored-abort fetches and stalled response bodies',async()=>{
 for(const fetchImpl of [()=>new Promise(()=>{}),async()=>new Response(new ReadableStream({start(){}}),{headers:{'content-type':'application/json'}})]){
  const {api}=setup({fetchImpl,timeoutMs:10});api.setOnlineKey(KEY);await assert.rejects(api.generateOnlineReply(request()),errorCode('ONLINE_TIMEOUT'));assert.equal(api.getOnlineReadiness().hasKey,true);
 }
});

test('redirects, wrong model identity, malformed JSON and oversized replies are rejected',async()=>{
 const cases=[()=>{const value=response();Object.defineProperty(value,'redirected',{value:true});return value;},()=>{const value=response();Object.defineProperty(value,'url',{value:'https://unrelated.invalid/'});return value;},()=>response(result({modelId:'another-model'})),()=>response(result({provider:'Another'})),()=>response(result({backend:'local'})),()=>response(result({text:'Not JSON'})),()=>new Response('<html>error</html>',{headers:{'content-type':'text/html'}}),()=>new Response('{',{headers:{'content-type':'application/json'}}),()=>new Response(' '.repeat(65537),{headers:{'content-type':'application/json'}}),()=>new Response(new Uint8Array([0xff]),{headers:{'content-type':'application/json'}})];
 for(const makeResponse of cases){const {api}=setup({fetchImpl:async()=>makeResponse()});api.setOnlineKey(KEY);await assert.rejects(api.generateOnlineReply(request()),errorCode('ONLINE_RESPONSE_INVALID'));}
});

test('disconnecting from a progress callback prevents the request before fetch',async()=>{
 const {api,calls}=setup();api.setOnlineKey(KEY);await assert.rejects(api.generateOnlineReply(request({onProgress:()=>api.clearOnlineKey()})),{name:'AbortError'});assert.equal(calls.length,0);
});
