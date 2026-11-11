import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash,webcrypto} from 'node:crypto';
import {repairRedirectedAppShells} from '../lib/offline-recovery.mjs';
import {APP_VERSION} from '../public/app/version.mjs';

const origin='https://findr.test';
const scope=origin+'/app/';
const shell='<html><body>FINDR offline shell</body></html>';
const imageBytes=Buffer.from([0,255,82,73,70,70,128,1]);
const defaultAssets=['./index.html','./app.mjs','./panels/fixture.webp'];
const assetBodies={'./index.html':shell,'./app.mjs':'export const fixture = true;','./panels/fixture.webp':imageBytes};
const hash=value=>createHash('sha256').update(value).digest('hex');
const assetHashes=Object.fromEntries(Object.entries(assetBodies).map(([name,body])=>[name,hash(body)]));
const key=request=>typeof request==='string'?request:request.url;

// Exact worker from deb5e2b1cf414e291c0134b69895ef527de726f8. Keep this fixed:
// recovery must help a browser whose old worker is still controlling the app.
const legacyWorkerSource=String.raw`importScripts('./precache.js');
const PREFIX='findr-shell-',CACHE=PREFIX+self.__BUILD,ASSETS=self.__PRECACHE.map(x=>new URL(x,self.registration.scope).href),allowed=new Set(ASSETS);
async function broadcast(message){for(const client of await self.clients.matchAll({includeUncontrolled:true}))client.postMessage(message)}
self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);let cursor=0,completed=0;try{await Promise.all(Array.from({length:6},async()=>{while(cursor<ASSETS.length){const url=ASSETS[cursor++];if(!await c.match(url)){let last;for(let attempt=0;attempt<2;attempt++){try{const r=await fetch(new Request(url,{cache:'reload'}));if(!r.ok)throw new Error('Asset download failed');await c.put(url,r);last=null;break}catch(error){last=error}}if(last)throw last}completed++;if(completed%12===0||completed===ASSETS.length)await broadcast({type:'OFFLINE_PROGRESS',completed,total:ASSETS.length})}}));await self.skipWaiting()}catch(error){await broadcast({type:'OFFLINE_ERROR'});throw error}})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);await self.clients.claim()})()));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin)return;u.search='';u.hash='';const home=new URL('./index.html',self.registration.scope).href;if(u.href===self.registration.scope)u.href=home;if(!allowed.has(u.href))return;e.respondWith((async()=>await(await caches.open(CACHE)).match(u.href)||fetch(e.request))())});
self.addEventListener('message',e=>{if(e.data?.type==='CHECK_OFFLINE'&&e.ports?.[0])e.waitUntil((async()=>{const c=await caches.open(CACHE),keys=new Set((await c.keys()).map(r=>r.url));e.ports[0].postMessage({ready:ASSETS.every(u=>keys.has(u)),build:self.__BUILD})})())});
`;

// Node's native fetch follows this in-memory HTTP dispatcher. No socket or
// external request is used. Unlike Response.redirect(), the resulting 200
// response really has redirect history, which also survives clone().
function makeNetwork({failPaths=[],homeRedirectTo=''}={}){
  const requests=[],responses=[];
  const failures=new Set(failPaths);
  const dispatcher={dispatch(options,handler){
    const url=new URL(options.path,String(options.origin));
    requests.push(url.href);
    queueMicrotask(()=>{
      try{
        if(failures.has(url.pathname))throw new Error('Fixture asset unavailable');
        handler.onConnect(()=>{});
        let status=200,body='',headers={'content-type':'text/plain'};
        if(url.pathname==='/app/index.html'){
          status=302;headers={location:'/app/'};
        }else if(url.pathname==='/app/'&&url.origin===origin&&homeRedirectTo){
          status=302;headers={location:homeRedirectTo};
        }else if(url.pathname==='/app/'){
          body=shell;
          headers={'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=60','x-fixture':'shell'};
        }else if(url.pathname==='/app/app.mjs'){
          body='export const fixture = true;';headers={'content-type':'text/javascript'};
        }else if(url.pathname==='/app/panels/fixture.webp'&&!url.searchParams.has('canonical')){
          url.searchParams.set('canonical','1');
          status=302;headers={location:url.pathname+url.search};
        }else if(url.pathname==='/app/panels/fixture.webp'){
          body=imageBytes;headers={'content-type':'image/webp','x-fixture':'picture'};
        }else if(url.pathname==='/signin-with-chatgpt'){
          body='<html><body>Sign in</body></html>';headers={'content-type':'text/html'};
        }else{
          status=404;body='Fixture not found';
        }
        handler.onHeaders(status,Object.entries(headers).flat(),()=>{},status===302?'Found':status===404?'Not Found':'OK');
        const bytes=Buffer.isBuffer(body)?body:Buffer.from(body);
        if(bytes.length)handler.onData(bytes);
        handler.onComplete([]);
      }catch(error){handler.onError(error)}
    });
    return true;
  }};
  return{
    requests,responses,
    async fetch(input,init={}){
      const response=await fetch(input,{...init,dispatcher});
      responses.push({url:response.url,status:response.status,redirected:response.redirected});
      return response;
    },
  };
}

function makeCaches(state=new Map()){
  return{
    state,
    async open(name){
      if(!state.has(name))state.set(name,new Map());
      const entries=state.get(name);
      return{
        async match(request){return entries.get(key(request))?.clone()},
        async put(request,response){entries.set(key(request),response.clone())},
        async delete(request){return entries.delete(key(request))},
        async keys(){return [...entries.keys()].map(url=>new Request(url))},
      };
    },
    async keys(){return [...state.keys()]},
    async delete(name){return state.delete(name)},
  };
}

function makeWorker({build='redirect-regression',version=APP_VERSION,assets=defaultAssets,hashes=Object.fromEntries(assets.map(name=>[name,assetHashes[name]])),caches=makeCaches(),network=makeNetwork(),deadlineMs,skipWaitingImpl,source=fs.readFileSync(new URL('../public/app/sw.js',import.meta.url),'utf8')}={}){
  const handlers={},messages=[];
  let skipWaiting=false,skipWaitingCalls=0,claimed=false;
  const self={
    __BUILD:build,__PRECACHE:assets,__APP_VERSION:version,__ASSET_SHA256:hashes,crypto:webcrypto,
    registration:{scope},location:{origin,href:scope+'sw.js'},
    clients:{
      async matchAll(){return[{postMessage(message){messages.push(message)}}]},
      async claim(){claimed=true},
    },
    async skipWaiting(){skipWaitingCalls++;if(skipWaitingImpl)await skipWaitingImpl();skipWaiting=true},
    addEventListener(name,handler){handlers[name]=handler},
  };
  vm.runInNewContext(source,{
    self,caches,URL,Request,Response,Headers,AbortController,
    setTimeout:deadlineMs===undefined?setTimeout:(fn,ms)=>setTimeout(fn,Math.min(ms,deadlineMs)),clearTimeout,
    importScripts(){},fetch:network.fetch.bind(network),
  });
  return{handlers,messages,caches,network,cacheName:'findr-shell-'+build,skipWaiting:()=>skipWaiting,skipWaitingCalls:()=>skipWaitingCalls,claimed:()=>claimed};
}

async function event(worker,name,extra={}){
  const pending=[];
  worker.handlers[name]({...extra,waitUntil(promise){pending.push(promise)}});
  await Promise.all(pending);
}

async function ready(worker){
  let result;
  await event(worker,'message',{data:{type:'CHECK_OFFLINE'},ports:[{postMessage(value){result=value}}]});
  return result;
}

async function activateUpdate(worker,expectedVersion=APP_VERSION,responses){
  let result;
  await event(worker,'message',{data:{type:'ACTIVATE_UPDATE',expectedVersion},ports:[{postMessage(value){result=value;responses?.push(value)}}]});
  return result;
}

async function navigation(worker,url,{browserRedirectCheck=true}={}){
  // A navigation uses redirect:"manual". Node cannot construct a browser
  // FetchEvent, so reproduce its redirected-response rejection at delivery.
  const request=new Request(url,{redirect:'manual'});
  let delivered,intercepted=false;
  worker.handlers.fetch({request,respondWith(value){
    intercepted=true;
    delivered=Promise.resolve(value).then(response=>{
      assert(response instanceof Response,'The service worker must return a Response');
      if(browserRedirectCheck&&request.redirect!=='follow'&&response.redirected){
        throw new Error('Response served by service worker has redirections.');
      }
      return response;
    });
  }});
  assert(intercepted,'The app navigation should be handled by the service worker');
  return delivered;
}

async function assertShell(response){
  assert.equal(response.redirected,false);
  assert.equal(response.status,200);
  assert.equal(response.statusText,'OK');
  assert.equal(response.headers.get('content-type'),'text/html; charset=utf-8');
  assert.equal(response.headers.get('cache-control'),'public, max-age=60');
  assert.equal(response.headers.get('x-fixture'),'shell');
  assert.equal(await response.text(),shell);
}

test('fixture creates genuine redirect history without network access',async()=>{
  const response=await makeNetwork().fetch(scope+'index.html');
  assert.equal(response.redirected,true);
  assert.equal(response.clone().redirected,true);
  assert.equal(response.url,scope);
  assert.equal(await response.text(),shell);
  assert.equal(Response.redirect(scope,302).redirected,false);
});

test('fresh installation stores unredirected HTML and picture responses without changing content',async()=>{
  const worker=makeWorker();
  await event(worker,'install');
  const cache=await worker.caches.open(worker.cacheName);
  await assertShell(await cache.match(scope+'index.html'));
  const picture=await cache.match(scope+'panels/fixture.webp');
  assert.equal(picture.redirected,false);
  assert.equal(picture.status,200);
  assert.equal(picture.headers.get('content-type'),'image/webp');
  assert.deepEqual(Buffer.from(await picture.arrayBuffer()),imageBytes);
  assert.equal(worker.skipWaiting(),true);
  assert.equal((await ready(worker)).ready,true);
  assert(worker.network.responses.some(r=>r.redirected),'The fixture must exercise a followed redirect');
});

test('the actual worker reports its release version and never calls an incomplete cache ready',async()=>{
  const worker=makeWorker();
  const cache=await worker.caches.open(worker.cacheName);
  await cache.put(scope+'index.html',new Response(shell,{headers:{'content-type':'text/html'}}));
  const partial=await ready(worker);
  assert.equal(partial.version,APP_VERSION,'The launch handshake must identify the worker release');
  assert.equal(partial.build,'redirect-regression');
  assert.equal(partial.ready,false,'An HTML shell alone must not authorise launch as a complete update');

  await event(worker,'install');
  const complete=await ready(worker);
  assert.equal(complete.version,APP_VERSION);
  assert.equal(complete.ready,true,'The worker may report ready after installing all required assets');
});

test('update activation rejects a nonexact expected release and requires a reply port',async()=>{
  const caches=makeCaches(),installer=makeWorker({caches});await event(installer,'install');
  for(const expectedVersion of [APP_VERSION+'-different',' '+APP_VERSION]){
    const worker=makeWorker({caches}),responses=[],result=await activateUpdate(worker,expectedVersion,responses);
    assert.equal(result.accepted,false);assert.equal(result.ready,false);assert.equal(result.error,'version_mismatch');assert.equal(result.version,APP_VERSION);assert.equal(worker.skipWaitingCalls(),0);
    assert.equal(responses.some(value=>value.phase==='verified_waiting'),false);
  }
  const worker=makeWorker({caches});await event(worker,'message',{data:{type:'ACTIVATE_UPDATE',expectedVersion:APP_VERSION}});assert.equal(worker.skipWaitingCalls(),0);
});

test('update activation rejects incomplete cached assets even with a verified-install marker',async()=>{
  const caches=makeCaches(),installer=makeWorker({caches});await event(installer,'install');
  const cache=await caches.open(installer.cacheName);assert.ok(await cache.match(scope+'offline-verified.json'));await cache.delete(scope+'app.mjs');
  const worker=makeWorker({caches}),responses=[],result=await activateUpdate(worker,APP_VERSION,responses);
  assert.equal(result.accepted,false);assert.equal(result.ready,false);assert.equal(result.error,'cache_unverified');assert.equal(worker.skipWaitingCalls(),0);assert.equal((await ready(worker)).ready,false);
  assert.equal(responses.some(value=>value.phase==='verified_waiting'),false);
});

test('verified update activation acknowledges success only after skipWaiting completes',async()=>{
  const build='activation-ready',caches=makeCaches(),installer=makeWorker({build,caches});await event(installer,'install');
  let release;const responses=[],gate=new Promise(resolve=>{release=resolve;});
  const worker=makeWorker({build,caches,skipWaitingImpl:()=>{assert.equal(responses.at(-1)?.phase,'verified_waiting','Verified progress must be sent before invoking native activation');return gate;}});
  const pending=event(worker,'message',{data:{type:'ACTIVATE_UPDATE',expectedVersion:APP_VERSION},ports:[{postMessage(value){responses.push(value)}}]});
  await new Promise(setImmediate);assert.equal(worker.skipWaitingCalls(),1);assert.equal(responses.length,1);
  const progress=responses[0];assert.equal(progress.phase,'verified_waiting');assert.equal(progress.ready,true);assert.equal(progress.version,APP_VERSION);assert.equal(progress.build,build);assert.equal(progress.verification,'sha256-v1');assert.equal(Object.hasOwn(progress,'accepted'),false,'Verified progress is not an activation success acknowledgment');
  release();await pending;
  assert.equal(responses.length,2);const acknowledgement=responses[1];
  assert.equal(worker.skipWaiting(),true);assert.equal(acknowledgement.accepted,true);assert.equal(acknowledgement.ready,true);assert.equal(acknowledgement.version,APP_VERSION);assert.equal(acknowledgement.build,build);assert.equal(acknowledgement.verification,'sha256-v1');
});

test('native update activation rejection returns activation_failed without a false success',async()=>{
  const caches=makeCaches(),installer=makeWorker({caches});await event(installer,'install');
  const responses=[],worker=makeWorker({caches,skipWaitingImpl:async()=>{assert.equal(responses.at(-1)?.phase,'verified_waiting');throw Error('Synthetic native activation failure');}}),result=await activateUpdate(worker,APP_VERSION,responses);
  assert.equal(worker.skipWaitingCalls(),1);assert.equal(worker.skipWaiting(),false);assert.equal(result.accepted,false);assert.equal(result.ready,false);assert.equal(result.error,'activation_failed');assert.equal(result.version,APP_VERSION);
  assert.equal(responses.length,2);assert.equal(responses[0].phase,'verified_waiting');assert.equal(Object.hasOwn(responses[0],'accepted'),false);assert.equal(responses.some(value=>value.accepted===true),false);
});

test('update activation bounds a hung cache verification and returns asset_timeout',async()=>{
  const storage=makeCaches(),installer=makeWorker({caches:storage});await event(installer,'install');
  const caches={...storage,async open(name){const cache=await storage.open(name);return {...cache,async keys(){return new Promise(()=>{});}};}};
  const worker=makeWorker({caches,deadlineMs:15}),result=await activateUpdate(worker);
  assert.equal(result.accepted,false);assert.equal(result.ready,false);assert.equal(result.error,'asset_timeout');assert.equal(worker.skipWaitingCalls(),0);
});

test('installation repairs an existing redirected cache even when the new worker keeps the same build',async()=>{
  const build='unchanged-build',caches=makeCaches(),cache=await caches.open('findr-shell-'+build);
  const source=await makeNetwork().fetch(scope+'index.html');
  await cache.put(scope+'index.html',source);
  assert.equal((await cache.match(scope+'index.html')).redirected,true);
  const worker=makeWorker({build,caches,assets:['./index.html'],network:{async fetch(){throw new Error('Existing asset should be repaired without redownloading')}}});
  await event(worker,'install');
  await assertShell(await cache.match(scope+'index.html'));
  assert.equal(worker.skipWaiting(),true);
  assert.equal((await ready(worker)).ready,true);
  await assertShell(await navigation(worker,scope));
});

test('cached navigation strips redirect history from a previously poisoned shell entry',async()=>{
  const worker=makeWorker({assets:['./index.html'],network:{async fetch(){throw new Error('Cached navigation must work offline')}}});
  const cache=await worker.caches.open(worker.cacheName);
  await cache.put(scope+'index.html',await makeNetwork().fetch(scope+'index.html'));
  // Do not run install: covers an entry that predates this worker's response fix.
  await assertShell(await navigation(worker,scope+'index.html'));
});

test('directory and query navigation aliases serve the cached index shell offline',async()=>{
  for(const url of [scope,scope+'?open=1',scope+'index.html?open=1#identify']){
    const worker=makeWorker({assets:['./index.html'],network:{async fetch(){throw new Error('Directory alias must use the cached shell')}}});
    const cache=await worker.caches.open(worker.cacheName);
    await cache.put(scope+'index.html',await makeNetwork().fetch(scope+'index.html'));
    await assertShell(await navigation(worker,url));
  }
});

test('a navigation cache miss fetches a successful canonical shell response',async()=>{
  const worker=makeWorker({assets:['./index.html']});
  await assertShell(await navigation(worker,scope+'index.html'));
});

test('an asset cache miss follows an accepted redirect and strips its history',async()=>{
  const worker=makeWorker({assets:['./panels/fixture.webp']});
  const response=await navigation(worker,scope+'panels/fixture.webp');
  assert.equal(response.redirected,false);
  assert.equal(response.status,200);
  assert.equal(response.headers.get('content-type'),'image/webp');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()),imageBytes);
  assert(worker.network.responses.some(r=>r.redirected),'The network fallback must exercise a followed redirect');
});

test('cached redirects to a sign-in path or another origin are rejected by the worker',async()=>{
  for(const homeRedirectTo of [origin+'/signin-with-chatgpt','https://different.test/app/']){
    const worker=makeWorker({assets:['./index.html'],network:{async fetch(){throw new Error('Offline fixture')}}});
    const cache=await worker.caches.open(worker.cacheName);
    const source=await makeNetwork({homeRedirectTo}).fetch(scope);
    assert.equal(source.redirected,true);
    await cache.put(scope+'index.html',source);
    // Disable the browser guard to prove that the worker itself rejects the
    // wrong content instead of laundering it into an unredirected response.
    await assert.rejects(navigation(worker,scope,{browserRedirectCheck:false}));
  }
});

test('network redirects to a sign-in path or another origin are rejected by the worker',async()=>{
  for(const homeRedirectTo of [origin+'/signin-with-chatgpt','https://different.test/app/']){
    const worker=makeWorker({assets:['./index.html'],network:makeNetwork({homeRedirectTo})});
    await assert.rejects(navigation(worker,scope,{browserRedirectCheck:false}));
  }
});

test('normal cached JavaScript retains its content and media type',async()=>{
  const worker=makeWorker({assets:['./app.mjs'],hashes:{'./app.mjs':hash('export const offline = true;')},network:{async fetch(){throw new Error('Cached JavaScript must not need network')}}});
  const cache=await worker.caches.open(worker.cacheName);
  await cache.put(scope+'app.mjs',new Response('export const offline = true;',{headers:{'content-type':'text/javascript'}}));
  const response=await navigation(worker,scope+'app.mjs');
  assert.equal(response.redirected,false);
  assert.equal(response.status,200);
  assert.equal(response.headers.get('content-type'),'text/javascript');
  assert.equal(await response.text(),'export const offline = true;');
});

test('failed installation never reports the incomplete app ready or activates the worker',async()=>{
  const worker=makeWorker({assets:['./index.html','./app.mjs'],network:makeNetwork({failPaths:['/app/app.mjs']})});
  await assert.rejects(event(worker,'install'));
  await new Promise(setImmediate);
  assert.equal(worker.skipWaiting(),false);
  assert(worker.messages.some(message=>message.type==='OFFLINE_ERROR'));
  assert.equal((await ready(worker)).ready,false);
});

test('release-page repair immediately restores navigation through the same old active worker',async()=>{
  const caches=makeCaches();
  let networkAttempts=0;
  const worker=makeWorker({
    build:'old-active-worker',assets:['./index.html'],caches,source:legacyWorkerSource,
    network:{async fetch(){networkAttempts++;throw new Error('Recovery must use the existing cached shell')}},
  });
  const cache=await caches.open(worker.cacheName);
  await cache.put(scope+'index.html',await makeNetwork().fetch(scope+'index.html'));
  assert.equal((await cache.match(scope+'index.html')).redirected,true);
  await assert.rejects(navigation(worker,scope),/Response served by service worker has redirections/);

  assert.equal(await repairRedirectedAppShells({cacheStorage:caches,origin}),1);

  // Reuse the identical worker and CacheStorage; no install, activate or
  // new-worker transition occurs between the failed and successful requests.
  await assertShell(await navigation(worker,scope));
  await assertShell(await navigation(worker,scope+'index.html?reopened=1'));
  assert.equal(networkAttempts,0);
  assert.equal(worker.skipWaiting(),false);
  assert.equal(worker.claimed(),false);
});

test('a full set of URL keys cannot authorise an unverified or mixed release',async()=>{
  const caches=makeCaches(),old=await caches.open('findr-shell-older');
  await old.put(scope+'index.html',new Response(shell));
  const worker=makeWorker({caches});
  const cache=await caches.open(worker.cacheName);
  for(const [name,body] of Object.entries(assetBodies))await cache.put(new URL(name,scope).href,new Response(body));
  assert.equal((await ready(worker)).ready,false,'All keys without the exact verified-install marker are insufficient');
  await assert.rejects(event(worker,'activate'),error=>error.code==='cache_unverified');
  assert(caches.state.has('findr-shell-older'),'An unverified activation must retain the previous shell');
  assert.equal(worker.claimed(),false);
});

test('mixed current-build device JSON is replaced and unchanged earlier-cache assets are reused only by digest',async()=>{
  const path='./data/devices.json',fresh='[{"model":"CA414","revision":"Rev7","document":"modern-reference"}]',stale='[{"model":"CA414","document":"acorn-reference"}]';
  const caches=makeCaches(),old=await caches.open('findr-shell-previous');
  await old.put(scope+'data/devices.json',new Response(stale));
  await old.put(scope+'app.mjs',new Response(assetBodies['./app.mjs'],{headers:{'content-type':'text/javascript'}}));
  const current=await caches.open('findr-shell-mixed-repair');
  await current.put(scope+'data/devices.json',new Response(stale));
  const requests=[];
  const worker=makeWorker({build:'mixed-repair',assets:[path,'./app.mjs'],hashes:{[path]:hash(fresh),'./app.mjs':assetHashes['./app.mjs']},caches,network:{async fetch(request){requests.push(request.url);return new Response(fresh,{headers:{'content-type':'application/json'}});}}});
  await event(worker,'install');
  assert.deepEqual(requests,[scope+'data/devices.json?findr_build=mixed-repair'],'Only changed bytes need a network request');
  assert.equal(await(await current.match(scope+'data/devices.json')).text(),fresh);
  assert.equal(await(await current.match(scope+'app.mjs')).text(),assetBodies['./app.mjs']);
  assert.equal((await ready(worker)).ready,true);
  assert(caches.state.has('findr-shell-previous'),'Previous cache is retained throughout installation');
  await caches.open('findr-manuals');
  await event(worker,'activate');
  assert(!caches.state.has('findr-shell-previous'));
  assert(caches.state.has('findr-manuals'),'Saved-document storage is untouched');
  assert.equal(worker.claimed(),true);
});

test('successful but stale network responses fail integrity twice and name the asset without activating',async()=>{
  const path='./data/devices.json',fresh='[{"edition":"Rev7"}]';
  const caches=makeCaches();
  await(await caches.open('findr-shell-working-old')).put(scope+'data/devices.json',new Response('[{"edition":"old"}]'));
  const requests=[];
  const worker=makeWorker({assets:[path],hashes:{[path]:hash(fresh)},caches,network:{async fetch(request){requests.push(request.url);return new Response('[{"edition":"old"}]');}}});
  await assert.rejects(event(worker,'install'),error=>error.code==='asset_integrity'&&error.asset===path);
  assert.equal(requests.length,2);
  assert(requests.every(url=>new URL(url).searchParams.get('findr_build')==='redirect-regression'));
  assert(worker.messages.some(message=>message.type==='OFFLINE_ERROR'&&message.asset===path&&message.code==='asset_integrity'));
  assert.equal((await ready(worker)).ready,false);
  assert.equal(worker.skipWaiting(),false);
  assert(caches.state.has('findr-shell-working-old'));
});

test('a transient stale response can recover on the second verified network attempt',async()=>{
  const path='./data/devices.json',fresh='[{"edition":"Rev7"}]';let attempts=0;
  const worker=makeWorker({assets:[path],hashes:{[path]:hash(fresh)},network:{async fetch(){return new Response(++attempts===1?'[]':fresh);}}});
  await event(worker,'install');
  assert.equal(attempts,2);
  assert.equal((await ready(worker)).ready,true);
  assert.equal(await(await navigation(worker,scope+'data/devices.json')).text(),fresh);
});

test('missing or malformed hash manifests fail closed rather than accepting unverified production bytes',async()=>{
  for(const hashes of [undefined,{}, {'./index.html':'not-a-sha256'}]){
    let requests=0;
    const worker=makeWorker({assets:['./index.html'],hashes:hashes===undefined?null:hashes,network:{async fetch(){requests++;return new Response(shell);}}});
    await assert.rejects(event(worker,'install'),error=>error.code==='invalid_manifest');
    assert.equal(requests,0);
    assert.equal((await ready(worker)).ready,false);
    assert.equal(worker.skipWaiting(),false);
    assert(worker.messages.some(message=>message.type==='OFFLINE_ERROR'&&message.asset==='./precache.js'));
  }
});

test('network headers and response bodies that never settle have bounded retries and identify the failed asset',async()=>{
  for(const stage of ['headers','body']){
    let attempts=0;
    const worker=makeWorker({assets:['./app.mjs'],deadlineMs:15,network:{async fetch(){
      attempts++;
      if(stage==='headers')return new Promise(()=>{});
      return new Response(new ReadableStream({start(){}}),{headers:{'content-type':'text/javascript'}});
    }}});
    await assert.rejects(event(worker,'install'),error=>error.code==='asset_timeout'&&error.asset==='./app.mjs',stage);
    assert.equal(attempts,2,stage+' is attempted exactly twice');
    assert.equal(worker.skipWaiting(),false);
    assert(worker.messages.some(message=>message.type==='OFFLINE_ERROR'&&message.code==='asset_timeout'&&message.asset==='./app.mjs'));
  }
});

test('a stalled cache write is bounded as part of the asset attempt',async()=>{
  const cacheStorage=makeCaches();
  const caches={...cacheStorage,async open(name){
    const cache=await cacheStorage.open(name);
    return {...cache,async put(request,response){
      if(key(request)===scope+'app.mjs')return new Promise(()=>{});
      return cache.put(request,response);
    }};
  }};
  const worker=makeWorker({assets:['./app.mjs'],caches,deadlineMs:15});
  await assert.rejects(event(worker,'install'),error=>error.code==='asset_timeout'&&error.asset==='./app.mjs');
  assert.equal(worker.skipWaiting(),false);
  assert.equal((await ready(worker)).ready,false);
});

test('cache delivery also rejects altered bytes instead of serving mixed data after installation',async()=>{
  const worker=makeWorker({assets:['./app.mjs']});
  await event(worker,'install');
  const cache=await worker.caches.open(worker.cacheName);
  await cache.put(scope+'app.mjs',new Response('export const fixture = "stale";'));
  const response=await navigation(worker,scope+'app.mjs');
  assert.equal(await response.text(),assetBodies['./app.mjs']);
  assert.equal(await(await cache.match(scope+'app.mjs')).text(),assetBodies['./app.mjs']);
});
