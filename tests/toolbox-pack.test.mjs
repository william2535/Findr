import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {TOOLBOX_PACK} from '../public/app/toolbox-pack-manifest.mjs';
import {createToolboxPackStore,packDigest,packAssetURL} from '../public/app/toolbox-pack-store.mjs';
import {calculatePackTool} from '../public/app/toolbox-pack-calculators.mjs';
import {validateToolboxPack} from '../public/app/toolbox-pack.mjs';
const manifest={...TOOLBOX_PACK,repositoryCommit:'a'.repeat(40)};
const files=new Map(await Promise.all(manifest.assets.map(async a=>[a.path,new Uint8Array(await readFile(new URL('../toolbox-packs/onsite-v1/'+a.path,import.meta.url)))])));
function fixture(options={}){
 const saved=options.saved||new Map(),requests=[];
 const store=createToolboxPackStore({manifest,read:async key=>saved.get(key),write:async(key,value)=>{saved.set(key,value);},estimate:async()=>({quota:1000000,usage:0}),fetcher:async url=>{requests.push(url);return new Response(files.get(url.split('/').at(-1)));},...options});
 return {store,saved,requests};
}
const calculated=(kind,v)=>{const r=calculatePackTool(kind,v);assert.equal(r.status,'calculated',JSON.stringify(r));return r.results.map(x=>x[1]);};

test('pack assets match shipped bytes/hash and contain no external or executable SVG references',async()=>{
 let total=0;for(const a of manifest.assets){const data=files.get(a.path);assert.equal(data.length,a.bytes);assert.equal(await packDigest(data),a.sha256);total+=data.length;if(a.type==='image/svg+xml'){const svg=new TextDecoder().decode(data);assert.doesNotMatch(svg,/<(?:script|foreignObject|iframe|image)\b|\bon\w+\s*=|(?:href|src)\s*=/i);assert.match(svg,/<svg\b/);}}
 assert.ok(total<100000);const pack=validateToolboxPack(JSON.parse(new TextDecoder().decode(files.get('pack.json'))));assert.equal(pack.tools.length,6);assert.equal(pack.guides.length,6);for(const source of Object.values(pack.sources))assert.match(source.url,/^https:\/\//);
});
test('real content download persists actual bytes and reuse needs no second fetch',async()=>{
 const {store,requests,saved}=fixture(),progress=[];assert.equal((await store.inspect()).complete,false);
 const ready=await store.download(p=>progress.push(p));assert.equal(ready.complete,true);assert.equal(requests.length,7);assert.equal(ready.totalBytes,manifest.assets.reduce((s,a)=>s+a.bytes,0));assert.equal(progress.at(-1).receivedBytes,ready.totalBytes);
 assert.ok([...saved.values()].every(v=>v instanceof Uint8Array));await store.download();assert.equal(requests.length,7);assert.deepEqual((await store.inspect()).available['pack.json'],files.get('pack.json'));
});
test('interruption preserves finished files and resumes only missing assets',async()=>{
 const {store,requests}=fixture();await assert.rejects(store.download(p=>{if(p.files===1)store.cancel();}),{name:'AbortError'});
 assert.equal((await store.inspect()).files,1);assert.equal(store.downloading,false);await store.download();assert.equal(requests.length,7);assert.equal((await store.inspect()).complete,true);
});
test('failed response leaves a partial pack, safe retry completes it',async()=>{
 const saved=new Map();let count=0;const first=fixture({saved,fetcher:async url=>{count++;return count===3?new Response('',{status:503}):new Response(files.get(url.split('/').at(-1)));}});
 await assert.rejects(first.store.download(),/503/);assert.equal((await first.store.inspect()).files,2);assert.equal((await first.store.inspect()).complete,false);
 const retry=fixture({saved});await retry.store.download();assert.equal(retry.requests.length,5);assert.equal((await retry.store.inspect()).complete,true);
});
test('checksum mismatch is not stored or shown ready',async()=>{
 const {store,saved}=fixture({fetcher:async()=>new Response(new Uint8Array(manifest.assets[0].bytes))});await assert.rejects(store.download(),/verification failed/);assert.equal(saved.size,0);assert.equal((await store.inspect()).complete,false);
});
test('quota failure makes no fetch and retains unrelated manuals and logs',async()=>{
 const saved=new Map([['session',{id:'job'}],['manual',{bytes:123}]]);let calls=0;
 const {store}=fixture({saved,estimate:async()=>({quota:100,usage:99}),fetcher:async()=>{calls++;return new Response('');}});
 await assert.rejects(store.download(),{name:'QuotaExceededError'});assert.equal(calls,0);assert.deepEqual([...saved.keys()],['session','manual']);assert.equal(store.downloading,false);
});
test('write errors keep the previous saved file and permit a new attempt',async()=>{
 const saved=new Map();let writes=0;const first=fixture({saved,write:async(key,v)=>{if(++writes===2)throw new Error('Storage interrupted');saved.set(key,v);}});
 await assert.rejects(first.store.download(),/could not be saved/);assert.equal((await first.store.inspect()).files,1);const retry=fixture({saved});await retry.store.download();assert.equal(retry.requests.length,6);
});
test('reopening uses saved bytes with networking unavailable; remove touches only this pack',async()=>{
 const {store,saved}=fixture();await store.download();saved.set('session',{id:'keep'});const reopened=fixture({saved,fetcher:async()=>{throw new Error('Network disabled');}});
 assert.equal((await reopened.store.inspect()).complete,true);await reopened.store.download();const removed=await reopened.store.remove();assert.equal(removed.files,0);assert.deepEqual(saved.get('session'),{id:'keep'});
});
test('corrupt cached bytes are detected and re-fetched instead of being counted ready',async()=>{
 const {store,saved,requests}=fixture();await store.download();saved.set('toolbox-pack:asset:'+manifest.assets[0].sha256,new Uint8Array([0]));assert.equal((await store.inspect()).files,6);await store.download();assert.equal(requests.length,8);
});
test('pack URLs are pinned, restricted and never use a mutable branch or traversal',()=>{
 assert.match(packAssetURL(manifest,manifest.assets[0]),/^https:\/\/raw\.githubusercontent\.com\/william2535\/Findr\/[a-f0-9]{40}\/toolbox-packs\/onsite-v1\//);
 assert.throws(()=>packAssetURL({...manifest,repositoryCommit:'main'},manifest.assets[0]));for(const path of ['../file.svg','https://evil.test/a.svg','a.js','a.svg?x'])assert.throws(()=>packAssetURL(manifest,{path}));
});
test('calculator examples match dimensional arithmetic',()=>{
 assert.deepEqual(calculated('dc-ohms',{volts:24,ohms:120}),[.2,4.8]);assert.deepEqual(calculated('resistors',{r1:1000,r2:1000}),[2000,500]);
 assert.deepEqual(calculated('cctv-storage',{cameras:4,mbps:4,hours:24,days:7}),[1209.6,1.2096,16]);
 assert.deepEqual(calculated('bandwidth',{cameras:8,mbps:4,streams:2,capacity:100}),[64,64,36]);
 assert.deepEqual(calculated('poe-budget',{devices:8,watts:15,budget:120,limit:30}),[120,0,15]);assert.deepEqual(calculated('dc-load',{devices:10,milliamps:50,volts:24}),[.5,500,12]);
});
test('invalid readings stay distinct from zero; limits/integer counts and unsupported tools reject',()=>{
 const valid={cameras:4,mbps:4,hours:24,days:7};for(const patch of [{mbps:''},{hours:25},{cameras:1.5},{cameras:0},{mbps:'OL'},{days:-1}])assert.equal(calculatePackTool('cctv-storage',{...valid,...patch}).status,'invalid');
 assert.deepEqual(calculated('cctv-storage',{...valid,mbps:0}),[0,0,0]);assert.equal(calculatePackTool('resistors',{r1:0,r2:1000}).status,'invalid');assert.equal(calculatePackTool('eval',{script:'process.exit()'}).status,'invalid');
});
test('over-budget results remain visible and flag insufficiency without claiming compatibility',()=>{
 const r=calculatePackTool('poe-budget',{devices:10,watts:20,budget:120,limit:15});assert.equal(r.status,'calculated');assert.deepEqual(r.results.map(v=>v[1]),[200,-80,-5]);assert.match(r.notes.join(' '),/exceeds/);assert.match(r.notes.join(' '),/negotiation/);
});

test('cancellation during initial storage inspection never starts a network request',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve);let calls=0;const {store}=fixture({read:async()=>{await gate;return null;},fetcher:async()=>{calls++;throw new Error('must not fetch');}});
 const work=store.download();store.cancel();release();await assert.rejects(work,{name:'AbortError'});assert.equal(calls,0);assert.equal(store.downloading,false);
});
test('simultaneous download is refused without interrupting the first attempt',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve);const {store}=fixture({estimate:async()=>{await gate;return {};}});const first=store.download();await assert.rejects(store.download(),/already running/);release();assert.equal((await first).complete,true);
});
test('an oversized streamed file cancels the stream instead of leaving its network reader running',async()=>{
 let cancelled=false;const {store}=fixture({fetcher:async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(manifest.assets[0].bytes+1));},cancel(){cancelled=true;}}))});
 await assert.rejects(store.download(),/length did not match/);assert.equal(cancelled,true);assert.equal(store.downloading,false);
});
test('storage read failure and a network connection failure keep distinct recovery messages',async()=>{
 const denied=fixture({read:async()=>{throw new TypeError('IDB unavailable');}});await assert.rejects(denied.store.inspect(),/files could not be read/);
 const offline=fixture({fetcher:async()=>{throw new TypeError('Failed to fetch');}});await assert.rejects(offline.store.download(),/could not connect/);assert.equal((await offline.store.inspect()).files,0);
});
