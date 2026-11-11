import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeOnlineTransport,installNativePlatform,saveNativeBlob,safeNativeFilename,NATIVE_ORIGIN} from '../public/app/native-platform.mjs';
const KEY='TEST_ONLY_NOT_A_PROVIDER_KEY_1234';
const options=()=>({method:'POST',headers:{'Content-Type':'application/json','X-FINDR-Provider-Key':KEY},body:JSON.stringify({provider:'groq',messages:[]})});
function nativeHost(){const target=new EventTarget();return Object.assign(target,{location:{origin:NATIVE_ORIGIN},crypto:globalThis.crypto,FindrNative:{version:()=>1}});}
const reply=(host,id,data={status:200,contentType:'application/json',body:btoa('{"text":"S1","allowance":{"requests":2}}')})=>host.dispatchEvent(new CustomEvent('findr-native-online',{detail:JSON.stringify({id,...data})}));

test('web transport remains the original fetch with no native bridge or rewritten credentials',async()=>{
 const init=options(),calls=[],fetch=createNativeOnlineTransport({host:{location:{origin:'https://findr.example'}},fetchImpl:async(...args)=>{calls.push(args);return 'original';}});
 assert.equal(await fetch('/api/assistant/online',init),'original');assert.deepEqual(calls,[['/api/assistant/online',init]]);
});

test('native relay only permits fixed same-origin JSON POST after client consent has built it',async()=>{
 const host=nativeHost(),calls=[];host.FindrNative.online=(...args)=>calls.push(args);
 const fetch=createNativeOnlineTransport({host,fetchImpl:()=>{throw Error('No alternate transport');}});
 for(const url of ['https://attacker.invalid/api/assistant/online','/api/manual/secret','/api/assistant/online?url=https://attacker.invalid','/api/assistant/online#fragment'])await assert.rejects(fetch(url,options()),/Unsupported native/);
 await assert.rejects(fetch('/api/assistant/online',{...options(),method:'GET'}),/Unsupported native/);
 await assert.rejects(fetch('/api/assistant/online',{...options(),headers:{}}),/Invalid native/);
 await assert.rejects(fetch('/api/assistant/online',{...options(),body:'x'.repeat(262145)}),/Invalid native/);
 assert.deepEqual(calls,[]);
});

test('native response preserves real status, content type and provider allowance body',async()=>{
 const host=nativeHost();let sent;
 host.FindrNative.online=(id,body,key)=>{sent={body,key};queueMicrotask(()=>reply(host,id));};host.FindrNative.cancelOnline=()=>{};
 const response=await createNativeOnlineTransport({host})('/api/assistant/online',options());
 assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/json');assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(await response.json(),{text:'S1',allowance:{requests:2}});assert.equal(sent.key,KEY);assert.equal(sent.body,options().body);
 host.FindrNative.online=id=>queueMicrotask(()=>reply(host,id,{status:429,contentType:'application/json',body:btoa('{"error":{"code":"ONLINE_RATE_LIMITED"}}')}));
 const limited=await createNativeOnlineTransport({host})('/api/assistant/online',options());assert.equal(limited.status,429);assert.equal((await limited.json()).error.code,'ONLINE_RATE_LIMITED');
});

test('abort cancels the native connection and late responses cannot revive a cancelled turn',async()=>{
 const host=nativeHost(),cancelled=[];let id;host.FindrNative.online=value=>{id=value;};host.FindrNative.cancelOnline=value=>cancelled.push(value);
 const controller=new AbortController(),pending=createNativeOnlineTransport({host})('/api/assistant/online',{...options(),signal:controller.signal});controller.abort();
 await assert.rejects(pending,error=>error.name==='AbortError'&&!error.message.includes(KEY));assert.deepEqual(cancelled,[id]);reply(host,id);
 const preAborted=new AbortController();preAborted.abort();await assert.rejects(createNativeOnlineTransport({host})('/api/assistant/online',{...options(),signal:preAborted.signal}),{name:'AbortError'});
});

test('native timeout and malformed response fail without exposing key or document contents',async()=>{
 const host=nativeHost();let cancellations=0;host.FindrNative.online=()=>{};host.FindrNative.cancelOnline=()=>cancellations++;
 await assert.rejects(createNativeOnlineTransport({host,timeoutMs:1})('/api/assistant/online',options()),/Native relay timed out/);assert.equal(cancellations,1);
 host.FindrNative.online=id=>queueMicrotask(()=>reply(host,id,{status:200,body:'x'.repeat(750001)}));
 await assert.rejects(createNativeOnlineTransport({host})('/api/assistant/online',options()),/Invalid native relay response/);
});

test('large helper export streams bounded chunks and preserves every original byte',async()=>{
 const host=nativeHost(),input=Uint8Array.from({length:390000},(_,i)=>i%251),parts=[];let name,mime,size,finished=false,yields=0;
 Object.assign(host.FindrNative,{beginExport:(n,m,s)=>{name=n;mime=m;size=s;return 'export-id';},appendExport:(id,part)=>{assert.equal(id,'export-id');assert.ok(part.length<=174764);parts.push(Buffer.from(part,'base64'));return true;},finishExport:id=>{assert.equal(id,'export-id');finished=true;return true;},cancelExport:()=>{throw Error('Successful export cannot be cancelled');}});
 await saveNativeBlob(new Blob([input],{type:'application/json'}),'FINDR/pal:one.json',{host,yieldTurn:async()=>{yields++;}});
 assert.equal(name,'FINDR-pal-one.json');assert.equal(mime,'application/json');assert.equal(size,input.length);assert.equal(parts.length,3);assert.equal(yields,3);assert.deepEqual(Buffer.concat(parts),Buffer.from(input));assert.equal(finished,true);
});

test('failed export cancels only its temporary file and cannot claim successful Save As',async()=>{
 const host=nativeHost(),calls=[];Object.assign(host.FindrNative,{beginExport:()=> 'export-id',appendExport:()=>false,finishExport:()=>{throw Error('Must not open picker');},cancelExport:id=>calls.push(id)});
 await assert.rejects(saveNativeBlob(new Blob(['saved original']),'log.txt',{host}),/could not prepare/);assert.deepEqual(calls,['export-id']);
 host.FindrNative.beginExport=()=>'';await assert.rejects(saveNativeBlob(new Blob(['saved original']),'log.txt',{host}),/not enough space/);
 assert.equal(safeNativeFilename('../FINDR\\log\u0000.txt'),'..-FINDR-log-.txt');
});

test('download integration stays inactive on the browser and untrusted origins',()=>{
 assert.equal(installNativePlatform({host:{location:{origin:'https://findr.example'},FindrNative:{version:()=>1}}}),false);
 assert.equal(installNativePlatform({host:{location:{origin:NATIVE_ORIGIN}}}),false);
});
