import test from 'node:test';
import assert from 'node:assert/strict';
import {HELPERS_KEY,createHelper,createConversation,normalizeHelper,normalizeHelpers,createHelpersStore,withHelperFaultSession} from '../public/app/helpers-store.mjs';
import {normalizeHelperConversation} from '../public/app/helpers-engine.mjs';
function database(initial={}, {fail=false}={}){
 const data=new Map(Object.entries(structuredClone(initial)));
 return {data,transaction(stores,mode){assert.deepEqual(stores,['settings']);const staged=new Map(data);let aborted=false;const tx={error:null,abort(){aborted=true;queueMicrotask(()=>tx.onabort?.());},objectStore(name){assert.equal(name,'settings');return {get(key){const r={};queueMicrotask(()=>{r.result=structuredClone(staged.get(key));r.onsuccess?.();queueMicrotask(()=>{if(aborted)return;if(fail&&mode==='readwrite'){tx.error=Error('Synthetic quota failure');tx.abort();return;}if(mode==='readwrite'){data.clear();for(const item of staged)data.set(...item);}tx.oncomplete?.();});});return r;},put(value,key){staged.set(key,structuredClone(value));},delete(key){staged.delete(key);}};}};return tx;}};
}
const helper=(id='one')=>createHelper({id,name:id,scope:{kind:'panel',label:id},selectedManualIds:['manual-a'],requiredManualIds:['manual-a']});
test('helpers and new job conversations have separate identities and diagnostic context',()=>{
 const one=helper(),two=helper('two'),next=createConversation();one.conversations[0].context.checked=['battery'];one.conversations[0].messages.push({text:'Already checked'});
 assert.deepEqual(two.conversations[0].context,{});assert.deepEqual(next.context,{});assert.notEqual(one.activeConversationId,two.activeConversationId);assert.notEqual(next.id,one.activeConversationId);
});
test('atomic saves and manual progress updates retain other helpers and conversation history',async()=>{
 const backend=database({session:{id:'old-fault'},history:[{id:'retained'}],'quick-questions-v1':{conversations:[{id:'old-question'}]}}),store=createHelpersStore(async()=>backend);
 await store.save(helper());await store.save(helper('two'));await store.update('one',current=>({...current,conversations:current.conversations.map(c=>({...c,messages:[{id:'m1',text:'My observation'}]}))}));await store.update('one',current=>({...current,manualStates:{'manual-a':{status:'ready'}}}));
 const loaded=await store.load();assert.equal(loaded.helpers.length,2);assert.equal(loaded.helpers.find(h=>h.id==='one').conversations[0].messages[0].text,'My observation');assert.equal(loaded.helpers.find(h=>h.id==='two').conversations[0].messages.length,0);assert.deepEqual(backend.data.get('history'),[{id:'retained'}]);assert.equal(backend.data.get('quick-questions-v1').conversations[0].id,'old-question');
});
test('failed save leaves the previous helper and unrelated histories intact',async()=>{
 const original={schemaVersion:1,helpers:[helper()]},backend=database({[HELPERS_KEY]:original,history:[{id:'retained'}]},{fail:true}),store=createHelpersStore(async()=>backend);
 await assert.rejects(store.save({...helper(),name:'Changed'}),/quota/);assert.deepEqual(backend.data.get(HELPERS_KEY),original);assert.deepEqual(backend.data.get('history'),[{id:'retained'}]);
});
test('deleting a helper removes only that helper, retaining shared references and model settings',async()=>{
 const one=helper(),two=helper('two');one.manualStates['manual-a']={contentHash:'a'.repeat(64),storedManualId:'saved-pdf'};two.manualStates['manual-a']={contentHash:'a'.repeat(64),storedManualId:'saved-pdf'};
 const backend=database({[HELPERS_KEY]:{schemaVersion:1,helpers:[one,two]},'manual-analysis:x':'retained',model:'retained'}),store=createHelpersStore(async()=>backend);
 assert.equal((await store.references('saved-pdf')).length,2);assert.equal((await store.references('alias',{contentHash:'a'.repeat(64)})).length,2);const removed=await store.remove('one');assert.equal(removed.documentsRemoved,0);assert.equal(removed.modelRemoved,false);assert.deepEqual((await store.references('saved-pdf')).map(h=>h.id),['two']);assert.equal(backend.data.get('model'),'retained');
});
test('bad stored helper schema fails closed without erasing old records',()=>{assert.throws(()=>normalizeHelpers({schemaVersion:999,helpers:[]}),/not been changed/);assert.throws(()=>normalizeHelpers({schemaVersion:1,helpers:[{id:'bad',name:'bad',scope:{},selectedManualIds:[],requiredManualIds:[],conversations:'bad'}]}),/not been changed/);});
test('revision lease prevents an old tab overwriting a newer saved helper',async()=>{const store=createHelpersStore(async()=>backend),backend=database();const first=await store.save(helper());await store.update(first.id,h=>({...h,name:'Newer name'}));await assert.rejects(store.save({...first,name:'Old name'},{expectedRevision:first.revision}),/another tab/);assert.equal((await store.load()).helpers[0].name,'Newer name');});

test('legacy helpers gain the default appearance without changing saved work or the source record',()=>{
 const old=helper();delete old.appearance;old.conversations[0].messages=[{id:'legacy-answer',text:'Saved before customisation'}];
 const before=structuredClone(old),loaded=normalizeHelper(old);
 assert.deepEqual(loaded.appearance,{icon:'terminal',colour:'yellow'});
 assert.deepEqual(loaded.conversations,before.conversations);assert.deepEqual(old,before);
});

test('appearance updates survive reload and backup serialization independently of other helpers and fault evidence',async()=>{
 const one=helper(),two=helper('two');one.conversations[0].draft='Unsent observation';one.conversations[0].faultSession={id:'fault',answers:{supply:'unknown'}};
 const backend=database(),store=createHelpersStore(async()=>backend);await store.save(one);await store.save(two);
 await store.update('one',h=>({...h,appearance:{icon:'terminal',colour:'blue'}}));
 const loaded=await createHelpersStore(async()=>backend).load(),updated=loaded.helpers.find(h=>h.id==='one');
 assert.deepEqual(updated.appearance,{icon:'terminal',colour:'blue'});assert.deepEqual(updated.conversations,one.conversations);
 assert.deepEqual(loaded.helpers.find(h=>h.id==='two').appearance,{icon:'terminal',colour:'yellow'});
 const backup=JSON.parse(JSON.stringify(updated));assert.deepEqual(normalizeHelper(backup).appearance,updated.appearance);
});

test('untrusted imported appearance cannot supply CSS or executable icon markup',()=>{
 const hostile={icon:'<svg onload=alert(1)>',colour:'red; background:url(https://example.invalid)',customCSS:'display:none'};
 const normalized=normalizeHelper({...helper(),appearance:hostile});
 assert.deepEqual(normalized.appearance,{icon:'terminal',colour:'yellow'});
 assert.deepEqual(normalizeHelper({...helper(),appearance:null}).appearance,normalized.appearance);
});

test('failed appearance save preserves the last saved colours, chats and shared manuals',async()=>{
 const one=helper();one.appearance={icon:'terminal',colour:'blue'};one.conversations[0].messages=[{id:'m1',text:'Keep this reading'}];
 const original={schemaVersion:1,helpers:[one,helper('two')]},backend=database({[HELPERS_KEY]:original},{fail:true}),store=createHelpersStore(async()=>backend);
 await assert.rejects(store.update('one',h=>({...h,appearance:{icon:'terminal',colour:'yellow'}})),/quota/);
 assert.deepEqual(backend.data.get(HELPERS_KEY),original);
});

test('fault worksheets stay with their captured job while other jobs and chat continue',async()=>{
 const one=helper(),two=helper('two'),firstId=one.activeConversationId;
 one.conversations.push(createConversation({id:'second-job',title:'A separate visit'}));one.activeConversationId='second-job';
 one.conversations[0].messages=[{id:'chat-1',role:'user',text:'The newest display message'}];one.conversations[0].draft='Unsent question';one.conversations[0].context={knownFields:{display:{value:'Battery fault',provenance:'user_report'}}};
 one.manualStates={'manual-a':{status:'ready',contentHash:'hash'}};
 const backend=database({session:{id:'legacy'},history:[{id:'legacy'}]}),store=createHelpersStore(async()=>backend);
 await store.save(one);await store.save(two);
 await store.update('one',h=>withHelperFaultSession(h,firstId,{id:'fault-first',answers:{battery:'yes'},notes:'Observed by engineer'},{now:101}));
 await store.update('one',h=>withHelperFaultSession(h,'second-job',{id:'fault-second',answers:{loop:'unknown'}},{now:102}));
 await store.update('two',h=>withHelperFaultSession(h,two.activeConversationId,{id:'fault-other-helper',answers:{supply:'no'}},{now:103}));
 const loaded=await store.load(),savedOne=loaded.helpers.find(h=>h.id==='one'),savedTwo=loaded.helpers.find(h=>h.id==='two'),first=savedOne.conversations.find(c=>c.id===firstId);
 assert.equal(savedOne.activeConversationId,'second-job');assert.deepEqual(first.messages,one.conversations[0].messages);assert.equal(first.draft,'Unsent question');assert.deepEqual(first.context,one.conversations[0].context);assert.deepEqual(savedOne.manualStates,one.manualStates);
 assert.equal(first.faultSession.id,'fault-first');assert.equal(first.updatedAt,101);assert.deepEqual(savedOne.conversations.find(c=>c.id==='second-job').faultSession.answers,{loop:'unknown'});assert.deepEqual(savedTwo.conversations[0].faultSession.answers,{supply:'no'});
 assert.deepEqual(backend.data.get('session'),{id:'legacy'});assert.deepEqual(backend.data.get('history'),[{id:'legacy'}]);
 const reloaded=await createHelpersStore(async()=>backend).load();assert.deepEqual(reloaded.helpers,loaded.helpers);
});

test('fault session identity guards preserve existing work and missing jobs cannot be recreated by a late save',async()=>{
 const one=helper(),id=one.activeConversationId,first=withHelperFaultSession(one,id,{id:'existing-log',answers:{battery:'yes'}},{now:99}),snapshot=structuredClone(first);
 assert.throws(()=>withHelperFaultSession(first,'deleted-job',{id:'late'}),error=>error.code==='HELPER_CONVERSATION_NOT_FOUND');
 assert.throws(()=>withHelperFaultSession(first,id,{id:'another-log'}),error=>error.code==='FAULT_SESSION_CHANGED');
 assert.throws(()=>withHelperFaultSession(first,id,{answers:{}}),error=>error.code==='HELPERS_STORAGE_INVALID');
 assert.deepEqual(first,snapshot);assert.equal(one.conversations[0].faultSession,undefined);
 const revised={id:'existing-log',answers:{battery:'no'}},next=withHelperFaultSession(first,id,revised,{now:100});revised.answers.battery='unknown';
 assert.equal(next.conversations[0].faultSession.answers.battery,'no');assert.equal(first.conversations[0].faultSession.answers.battery,'yes');
});

test('failed fault log save leaves answers, readings and unrelated conversations intact',async()=>{
 const one=helper(),id=one.activeConversationId,saved=withHelperFaultSession(one,id,{id:'fault',answers:{battery:'yes'},investigation:{measurements:[{id:'reading-1',value:'024.00',unit:'V DC'}]}});
 const original={schemaVersion:1,helpers:[saved,helper('two')]},backend=database({[HELPERS_KEY]:original},{fail:true}),store=createHelpersStore(async()=>backend);
 await assert.rejects(store.update('one',h=>withHelperFaultSession(h,id,{id:'fault',answers:{battery:'no'},investigation:{measurements:[]}})),/quota/);
 assert.deepEqual(backend.data.get(HELPERS_KEY),original);
});

test('fault worksheet and raw readings survive backup serialization and chat normalization',()=>{
 const one=helper(),id=one.activeConversationId,fault={id:'fault',started:123,group:'supply',answers:{battery:'yes'},guideHistory:[{groupId:'loop',observations:[{question:'Loop report?',answer:'No'}]}],investigation:{measurements:[{id:'r1',value:'024.00',unit:'V DC'},{id:'r2',value:'OL',unit:'Ω'}],actions:[{id:'work1',action:'Inspected cable label',outcome:'Recorded label'}]}};
 const saved=withHelperFaultSession(one,id,fault),backup=JSON.parse(JSON.stringify({kind:'findr-helper',schemaVersion:1,helper:saved,manuals:[]}));
 const imported=normalizeHelper({...backup.helper,id:'imported-copy',name:'Imported helper'}),normalised=normalizeHelperConversation(imported.conversations[0]);
 assert.deepEqual(imported.conversations[0].faultSession,fault);assert.deepEqual(normalised.faultSession,fault);
 normalised.messages.push({id:'later-message',role:'user',text:'What should I check next?'});assert.deepEqual(normalised.faultSession,fault);assert.equal(createConversation().faultSession,undefined);
});
