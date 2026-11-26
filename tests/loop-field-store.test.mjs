import test from 'node:test';
import assert from 'node:assert/strict';
import {createFieldJob,updateFieldJob} from '../public/app/loop-field-model.mjs';
import {FIELD_INDEX_KEY,fieldJobKey,fieldPhotoKey,createLoopFieldStore} from '../public/app/loop-field-store.mjs';

// Request-driven transactional fake: completion waits for all success callbacks
// and writes. Separate browser QA exercises real IndexedDB and concurrency.
function database(initial={},options={}){
  const data=new Map(Object.entries(structuredClone(initial)));
  return{data,options,transaction(stores,mode){
    assert.deepEqual(stores,['settings']);const staged=new Map(data);let pending=0,aborted=false,completed=false;
    const finish=()=>queueMicrotask(()=>{if(aborted||completed||pending)return;if(mode==='readwrite'&&options.failCommit){tx.error=new DOMException('Synthetic quota','QuotaExceededError');tx.abort();return;}completed=true;if(mode==='readwrite'){data.clear();for(const entry of staged)data.set(...entry);}tx.oncomplete?.();});
    const tx={error:null,abort(){if(!aborted){aborted=true;queueMicrotask(()=>tx.onabort?.());}},objectStore(name){assert.equal(name,'settings');return{get(key){pending++;const request={};queueMicrotask(()=>{request.result=structuredClone(staged.get(key));request.onsuccess?.();pending--;finish();});return request;},put(value,key){assert.equal(mode,'readwrite');staged.set(key,structuredClone(value));return{};},delete(key){assert.equal(mode,'readwrite');staged.delete(key);return{};}};}};
    return tx;
  }};
}
const photo=(job,photoId='p1',size=3)=>updateFieldJob(job,{type:'add-photo',photo:{id:photoId,name:'panel.jpg',mimeType:'image/jpeg',size,createdAt:1},ocr:{state:'pending',suggestions:[]}});

test('jobs use independent keyed records and preserve unrelated settings',async()=>{
  const preserved={session:{id:'active-fault'},'helpers-v1':{name:'Pal'},'panel-lab-protec-loop-v1':{scenarioId:'mapped'},downloads:['manual']};
  const db=database(preserved),store=createLoopFieldStore(async()=>db);assert.deepEqual(await store.listJobs(),[]);
  const first=await store.saveJob(createFieldJob({name:'West'})),second=await store.saveJob(createFieldJob({name:'East'}));
  assert.equal(first.revision,1);assert.equal((await store.listJobs()).length,2);assert.ok(db.data.has(fieldJobKey(first.id)));assert.ok(db.data.has(fieldJobKey(second.id)));
  assert.equal('devices'in db.data.get(FIELD_INDEX_KEY).jobs[0],false,'index is summary only');
  const changed=await store.saveJob(updateFieldJob(first,{type:'details',patch:{name:'West revised'}}));assert.equal(changed.revision,2);assert.equal((await store.loadJob(first.id)).name,'West revised');assert.equal((await store.loadJob(second.id)).name,'East');
  await store.removeJob(second.id,{expectedRevision:second.revision});assert.equal(await store.loadJob(second.id),null);assert.equal((await store.listJobs()).length,1);
  for(const[key,value]of Object.entries(preserved))assert.deepEqual(db.data.get(key),value);
});

test('revision leases prevent stale updates, stale deletion and resurrection',async()=>{const db=database(),store=createLoopFieldStore(async()=>db),first=await store.saveJob(createFieldJob()),latest=await store.saveJob({...first,name:'Latest'});await assert.rejects(store.saveJob({...first,name:'Old tab'}),error=>error.code==='FIELD_REVISION_CONFLICT');await assert.rejects(store.removeJob(first.id,{expectedRevision:first.revision}),error=>error.code==='FIELD_REVISION_CONFLICT');assert.equal((await store.loadJob(first.id)).name,'Latest');await store.removeJob(latest.id,{expectedRevision:latest.revision});await assert.rejects(store.saveJob(latest),error=>error.code==='FIELD_REVISION_CONFLICT');});

test('atomic original image plus pending metadata survives reload before OCR completes',async()=>{const db=database(),store=createLoopFieldStore(async()=>db),job=photo(createFieldJob()),blob=new Blob(['jpg'],{type:'image/jpeg'});const saved=await store.saveJob(job,{photo:{id:'p1',blob}}),reopened=createLoopFieldStore(async()=>db),loaded=await reopened.loadJob(saved.id);assert.equal(saved.revision,1);assert.equal(loaded.photos[0].ocr.state,'pending');assert.equal(loaded.photos[0].binaryAvailable,true);assert.equal(await(await reopened.loadPhoto(saved.id,'p1')).text(),'jpg');assert.ok(db.data.get(fieldPhotoKey(saved.id,'p1')) instanceof Blob);assert.equal(JSON.stringify(db.data.get(FIELD_INDEX_KEY)).includes('jpg'),false);});

test('atomic quota failure rolls back image and metadata together and retains prior job',async()=>{const db=database(),store=createLoopFieldStore(async()=>db),original=await store.saveJob(createFieldJob());db.options.failCommit=true;await assert.rejects(store.saveJob(photo(original),{photo:{id:'p1',blob:new Blob(['jpg'])}}),error=>error.code==='FIELD_STORAGE_FULL'&&/Export/.test(error.message));db.options.failCommit=false;assert.equal((await store.loadJob(original.id)).photos.length,0);assert.equal(await store.loadPhoto(original.id,'p1'),null);assert.equal((await store.loadJob(original.id)).revision,original.revision);const saved=await store.saveJob(photo(original),{photo:{id:'p1',blob:new Blob(['jpg'])}});assert.equal(saved.photos.length,1);});

test('job deletion removes only its referenced or interrupted photo blobs',async()=>{const db=database(),store=createLoopFieldStore(async()=>db),one=await store.saveJob(photo(createFieldJob()),{photo:{id:'p1',blob:new Blob(['one'])}}),two=await store.saveJob(photo(createFieldJob()),{photo:{id:'p1',blob:new Blob(['two'])}});await store.savePhoto(one.id,'pending-original',new Blob(['pending']));await assert.rejects(store.removePhoto(one.id,'p1'),/referenced/);await store.removeJob(one.id,{expectedRevision:one.revision});assert.equal(await store.loadPhoto(one.id,'p1'),null);assert.equal(await store.loadPhoto(one.id,'pending-original'),null);assert.equal(await(await store.loadPhoto(two.id,'p1')).text(),'two');assert.equal((await store.loadJob(two.id)).photos.length,1);});

test('photo validation rejects missing metadata, empty bytes and mismatched sizes before mutation',async()=>{const db=database(),store=createLoopFieldStore(async()=>db),job=createFieldJob();await assert.rejects(store.saveJob(job,{photo:{id:'p1',blob:new Blob(['jpg'])}}),/metadata/);await assert.rejects(store.saveJob(photo(job),{photo:{id:'p1',blob:new Blob([])}}),/non-empty/);await assert.rejects(store.saveJob(photo(job,'p1',4),{photo:{id:'p1',blob:new Blob(['jpg'])}}),/metadata/);assert.deepEqual(await store.listJobs(),[]);await assert.rejects(store.savePhoto(job.id,'p1',new Blob(['jpg'])),/Save this loop job/);});

test('malformed or inaccessible saved data remains untouched with recoverable errors',async()=>{for(const bad of[null,false,{schemaVersion:9,jobs:[]}]){const db=database({[FIELD_INDEX_KEY]:bad}),store=createLoopFieldStore(async()=>db);await assert.rejects(store.listJobs(),error=>error.code==='FIELD_STORAGE_INVALID');await assert.rejects(store.saveJob(createFieldJob()),error=>error.code==='FIELD_STORAGE_INVALID');assert.deepEqual(db.data.get(FIELD_INDEX_KEY),bad);}const blocked=createLoopFieldStore(async()=>{throw new DOMException('Denied','SecurityError');});await assert.rejects(blocked.listJobs(),error=>error.code==='FIELD_STORAGE_UNAVAILABLE');const db=database({[fieldJobKey('broken')]:{schemaVersion:99}}),store=createLoopFieldStore(async()=>db);await assert.rejects(store.loadJob('broken'),error=>error.code==='FIELD_STORAGE_INVALID');assert.deepEqual(db.data.get(fieldJobKey('broken')),{schemaVersion:99});});

test('captured save snapshots cannot be changed while the database is opening',async()=>{const db=database();let release;const store=createLoopFieldStore(()=>new Promise(resolve=>{release=resolve;})),job=createFieldJob({name:'Captured'}),pending=store.saveJob(job);job.name='Later edit';release(db);const saved=await pending;assert.equal(saved.name,'Captured');assert.equal(db.data.get(fieldJobKey(saved.id)).name,'Captured');});

test('job count is governed by storage rather than a small product limit',async()=>{const db=database(),store=createLoopFieldStore(async()=>db);for(let i=0;i<40;i++)await store.saveJob(createFieldJob({name:`Job ${i}`}));assert.equal((await store.listJobs()).length,40);});
