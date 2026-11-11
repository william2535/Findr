import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeQuickStore,mergeQuickConversation} from '../public/app/quick-questions-store.mjs';
test('question histories remain distinct and repeated saves replace their own snapshot',()=>{const first={id:'q1',messages:[{id:'m1',text:'Question one'}],updatedAt:1};let store=mergeQuickConversation(undefined,first);store=mergeQuickConversation(store,{id:'q2',messages:[{id:'m2',text:'Question two'}],updatedAt:2});store=mergeQuickConversation(store,{...first,messages:[...first.messages,{id:'m3',text:'Answer'}],updatedAt:3});assert.equal(store.conversations.length,2);assert.equal(store.activeId,'q1');assert.equal(store.conversations[0].messages.length,2);assert.equal(first.messages.length,1);assert.equal(Object.hasOwn(store,'session'),false);});
test('a malformed prior store fails closed without discarding existing data',()=>{const prior={schemaVersion:1,activeId:'old',conversations:[{id:'old',messages:'legacy-invalid'}]};assert.throws(()=>mergeQuickConversation(prior,{id:'new',messages:[]}),/Existing records have not been changed/);assert.equal(prior.activeId,'old');assert.equal(prior.conversations[0].messages,'legacy-invalid');assert.deepEqual(normalizeQuickStore(undefined),{schemaVersion:1,activeId:null,conversations:[]});});

import {createQuickQuestionsStore,QUICK_QUESTIONS_KEY} from '../public/app/quick-questions-store.mjs';
function transactionalDatabase(initial,{fail=false}={}){
 const data=new Map(Object.entries(structuredClone(initial)));
 return {data,transaction(stores,mode){assert.deepEqual(stores,['settings']);const staged=new Map(data);let aborted=false;const tx={error:null,abort(){aborted=true;queueMicrotask(()=>tx.onabort?.());},objectStore(name){assert.equal(name,'settings');return {get(key){const r={};queueMicrotask(()=>{r.result=structuredClone(staged.get(key));r.onsuccess?.();queueMicrotask(()=>{if(aborted)return;if(fail&&mode==='readwrite'){tx.error=Error('Synthetic quota failure');tx.abort();return;}if(mode==='readwrite'){data.clear();for(const item of staged)data.set(...item);}tx.oncomplete?.();});});return r;},put(value,key){staged.set(key,structuredClone(value));}};}};return tx;}};
}
test('failed transaction retains old questions and unrelated fault jobs, with safe retry',async()=>{
 const prior={schemaVersion:1,activeId:'q-old',conversations:[{id:'q-old',messages:[{text:'Retained'}]}]},job={id:'fault-old',message:'Existing fault'};
 const broken=transactionalDatabase({[QUICK_QUESTIONS_KEY]:prior,session:job,history:[job]},{fail:true});
 await assert.rejects(createQuickQuestionsStore(async()=>broken).save({id:'q-new',messages:[{text:'New question'}]}),/quota/);
 assert.deepEqual(broken.data.get(QUICK_QUESTIONS_KEY),prior);assert.deepEqual(broken.data.get('session'),job);
 const working=transactionalDatabase(Object.fromEntries(broken.data)),store=createQuickQuestionsStore(async()=>working);
 await store.save({id:'q-new',messages:[{text:'New question'}]});await store.save({id:'q-new',messages:[{text:'New question'},{text:'Answer'}]});
 const saved=await store.load();assert.equal(saved.conversations.length,2);assert.equal(saved.activeId,'q-new');assert.deepEqual(working.data.get('history'),[job]);
});
test('background history save never changes the active question conversation',async()=>{
 const db=transactionalDatabase({}),store=createQuickQuestionsStore(async()=>db);await store.save({id:'current',messages:[]});await store.save({id:'background',messages:[{text:'Download finished'}]},{activate:false});assert.equal((await store.load()).activeId,'current');
});
