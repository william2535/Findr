import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {PAGES_ORIGIN} from '../lib/pages-cors.mjs';
import {handleOnlineAssistantRequest} from '../lib/online-assistant.mjs';
import {ONLINE_PROVIDER} from '../public/app/online-language-policy.mjs';

const api='https://findr.example/api/assistant/online';
const key='synthetic-pages-key-not-a-credential';
const preflight=(url,method,headers,origin=PAGES_ORIGIN)=>new Request(url,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':method,'Access-Control-Request-Headers':headers}});
const post=(origin=PAGES_ORIGIN,changes={})=>new Request(api,{method:'POST',headers:{Origin:origin,'Sec-Fetch-Site':'cross-site','Content-Type':'application/json',[ONLINE_PROVIDER.header]:key},body:JSON.stringify({allowOnline:true,consentVersion:ONLINE_PROVIDER.consentVersion,messages:[{role:'user',content:'SYNTHETIC fixture'}],choices:['S1','NONE'],...changes})});
const noProvider=()=>{throw Error('Unexpected provider call');};
const assertCors=response=>{
  assert.equal(response.headers.get('access-control-allow-origin'),PAGES_ORIGIN);
  assert.equal(response.headers.get('access-control-allow-credentials'),null);
  assert.match(response.headers.get('vary'),/Origin/);
};

test('Pages online preflight admits only the required method and personal-key header',async()=>{
  const response=await handleOnlineAssistantRequest(preflight(api,'POST','Content-Type, X-FINDR-Provider-Key'),{fetchImpl:noProvider});
  assert.equal(response.status,204);assertCors(response);
  assert.equal(response.headers.get('access-control-allow-headers'),'content-type, x-findr-provider-key');
  assert.equal(response.headers.get('access-control-allow-methods'),'GET, POST, OPTIONS');
  assert.equal(response.headers.get('access-control-max-age'),'600');
  for(const [method,headers] of [['DELETE','content-type'],['POST','authorization'],['POST','cookie'],['POST','x-findr-provider-key, x-arbitrary']]){
    const rejected=await handleOnlineAssistantRequest(preflight(api,method,headers),{fetchImpl:noProvider});
    assert.equal(rejected.status,403);assert.equal(rejected.headers.get('access-control-allow-origin'),null);
  }
});

test('Pages capability GET supports each provider without a key, inference or readiness claims',async()=>{
  for(const providerId of ['groq','openai']){
    const response=await handleOnlineAssistantRequest(new Request(api+'?providerId='+providerId,{headers:{Origin:PAGES_ORIGIN}}),{fetchImpl:noProvider});
    assertCors(response);assert.equal(response.status,200);
    const value=await response.json();assert.equal(value.providerId,providerId);assert.equal(value.requiresKey,true);assert.equal(value.serviceVerified,false);
  }
});

test('Pages POST retains explicit consent and request-local key, and exposes readable errors',async()=>{
  const calls=[];
  const response=await handleOnlineAssistantRequest(post(),{fetchImpl:async(url,init)=>{
    calls.push({url,init});
    return Response.json({model:ONLINE_PROVIDER.modelId,choices:[{finish_reason:'stop',message:{role:'assistant',content:'{"choice":"S1"}'}}]});
  }});
  assertCors(response);assert.equal(response.status,200);assert.equal((await response.json()).text,'S1');
  assert.equal(calls.length,1);assert.equal(calls[0].url,'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(calls[0].init.headers.Authorization,'Bearer '+key);
  assert.equal(new Headers(calls[0].init.headers).has('origin'),false);
  assert.equal(new Headers(calls[0].init.headers).has('cookie'),false);
  const declined=await handleOnlineAssistantRequest(post(PAGES_ORIGIN,{allowOnline:false}),{fetchImpl:noProvider});
  assertCors(declined);assert.equal(declined.status,403);assert.equal((await declined.json()).error.code,'ONLINE_CONSENT_REQUIRED');
  const rateLimited=await handleOnlineAssistantRequest(post(),{fetchImpl:async()=>new Response('private upstream body',{status:429,headers:{'Retry-After':'30'}})});
  assertCors(rateLimited);assert.equal(rateLimited.status,429);assert.equal(rateLimited.headers.get('access-control-expose-headers'),'Retry-After');
  const text=await rateLimited.text();assert.equal(text.includes(key),false);assert.equal(text.includes('private upstream body'),false);
});

test('similar hosts, Origin paths, insecure schemes and null origins gain no CORS or inference access',async()=>{
  for(const origin of ['https://william2535.github.io.evil.example','https://another.github.io','http://william2535.github.io','https://william2535.github.io/Findr','null']){
    const pre=await handleOnlineAssistantRequest(preflight(api,'POST','content-type',origin),{fetchImpl:noProvider});
    assert.equal(pre.status,403);assert.equal(pre.headers.get('access-control-allow-origin'),null);
    const response=await handleOnlineAssistantRequest(post(origin),{fetchImpl:noProvider});
    assert.equal(response.status,403);assert.equal(response.headers.get('access-control-allow-origin'),null);assert.equal((await response.json()).error.code,'ONLINE_ORIGIN_REJECTED');
  }
});

async function manualRoute(){
  // Execute the authored route, replacing only the publisher catalogue/transport
  // with labelled synthetic fixtures. No real PDF or upstream service is needed.
  let source=readFileSync(new URL('../app/api/manual/[id]/route.ts',import.meta.url),'utf8');
  source=source.replace("import downloads from '../../../../lib/download-map.json';",`const downloads:Record<string,string>={fixture:'https://publisher.example/manual.pdf',failure:'https://publisher.example/failure.pdf'};\nexport const publisherRequests:any[]=[];\nconst fetch=async(url:URL,init:any)=>{publisherRequests.push({url:String(url),headers:init.headers});if(url.pathname.includes('failure'))return new Response('synthetic unavailable',{status:503});return new Response('%PDF-synthetic-range',{status:206,headers:{'Content-Range':'bytes 0-19/200','Accept-Ranges':'bytes','ETag':'"fixture-edition"','Last-Modified':'Wed, 11 Nov 2026 12:00:00 GMT'}});};`);
  source=source.replace("'../../../../lib/pages-cors.mjs'",JSON.stringify(new URL('../lib/pages-cors.mjs',import.meta.url).href));
  const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
  return import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
}

test('actual manual route supports range preflight and readable streamed range metadata',async()=>{
  const route=await manualRoute(),url='https://findr.example/api/manual/fixture';
  const pre=await route.OPTIONS(preflight(url,'GET','Range, If-Range'));assert.equal(pre.status,204);assertCors(pre);
  assert.equal(pre.headers.get('access-control-allow-headers'),'range, if-range');
  assert.equal(route.publisherRequests.length,0);
  const response=await route.GET(new Request(url,{headers:{Origin:PAGES_ORIGIN,Range:'bytes=0-19','If-Range':'"fixture-edition"'}}),{params:Promise.resolve({id:'fixture'})});
  assert.equal(response.status,206);assertCors(response);assert.equal(await response.text(),'%PDF-synthetic-range');
  assert.equal(response.headers.get('content-range'),'bytes 0-19/200');
  assert.match(response.headers.get('access-control-expose-headers'),/Content-Range/);assert.match(response.headers.get('access-control-expose-headers'),/ETag/);
  assert.equal(route.publisherRequests.length,1);assert.equal(route.publisherRequests[0].headers.Range,'bytes=0-19');assert.equal(route.publisherRequests[0].headers['If-Range'],'"fixture-edition"');
  assert.equal(route.publisherRequests[0].headers.Origin,undefined);
});

test('actual manual route returns CORS on known failures, but not to arbitrary origins',async()=>{
  const route=await manualRoute();
  for(const [id,range,status] of [['missing','bytes=0-19',404],['fixture','bytes=19-2',400],['failure','bytes=0-19',502]]){
    const response=await route.GET(new Request('https://findr.example/api/manual/'+id,{headers:{Origin:PAGES_ORIGIN,Range:range}}),{params:Promise.resolve({id})});
    assert.equal(response.status,status);assertCors(response);
  }
  const unknown=await route.GET(new Request('https://findr.example/api/manual/missing',{headers:{Origin:'https://unknown.example'}}),{params:Promise.resolve({id:'missing'})});
  assert.equal(unknown.status,404);assert.equal(unknown.headers.get('access-control-allow-origin'),null);
  for(const [origin,method,headers] of [['https://unknown.example','GET','range'],[PAGES_ORIGIN,'POST','content-type'],[PAGES_ORIGIN,'GET','authorization']]){
    const response=await route.OPTIONS(preflight('https://findr.example/api/manual/fixture',method,headers,origin));assert.equal(response.status,403);assert.equal(response.headers.get('access-control-allow-origin'),null);
  }
});
