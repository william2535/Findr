import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiagnosticChatController} from '../public/app/diagnostic-chat.mjs';
import {ensureDiagnosticChat,attachDiagnosticManual,confirmDiagnosticIdentity} from '../public/app/diagnostic-chat-engine.mjs';

// Exercise the real controller's save queue, not a duplicate queue implementation.
// This harness stays off the active route: layout/keyboard tests run in Chromium.
function harness(t,initial,write){
 const originals=new Map(['location','window','document','innerHeight'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 globalThis.location={hash:'#controller-unit-test'};
 globalThis.window={addEventListener(){},visualViewport:null};
 globalThis.document={addEventListener(){},visibilityState:'visible'};
 globalThis.innerHeight=844;
 t.after(()=>{for(const [key,descriptor]of originals)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];});
 const status={textContent:'',classList:{toggle(){}}},notices=[],writes=[];
 let saved=structuredClone(initial);
 const controller=createDiagnosticChatController({app:{querySelector:selector=>selector==='#diagnostic-save-status'?status:null,querySelectorAll:()=>[],style:{setProperty(){}}},getSession:()=>saved,
  onUpdate:async next=>{writes.push(structuredClone(next));await write?.(next,writes.length);saved=structuredClone(next);},
  getSaved:()=>new Map(),refreshSaved:async()=>{},readPDF:async()=>{},searchManuals(){},toast:message=>notices.push(message),showModal(){},closeModal(){},onNewVisit(){}});
 return {controller,status,writes,notices,async inspect(){location.hash='#investigation';controller.render();await new Promise(resolve=>setImmediate(resolve));location.hash='#controller-unit-test';},get saved(){return saved;},set saved(value){saved=value;}};
}
function session(id){
 const manual={manualId:`${id}-manual`,contentHash:`synthetic-controller-${id}`,processorVersion:'TEST ONLY',title:'SYNTHETIC controller test manual',usable:true,pageCount:1,identity:{systemTypes:['fire'],manufacturer:'Synthetic',model:'Fixture 1',models:['Fixture 1'],equipmentType:'panel'},pages:[{page:1,text:'SYNTHETIC TEST ONLY. Fire panel loop return and input/output diagnostics. Record the actual circuit topology before considering loop tests.',method:'text'}]};
 let value=attachDiagnosticManual(ensureDiagnosticChat({id,site:'Synthetic controller fixture'}),manual);
 value=confirmDiagnosticIdentity(value,{step:'system',systemTypes:['fire']});
 return confirmDiagnosticIdentity(value,{model:'Fixture 1',manufacturer:'Synthetic',equipmentType:'panel'});
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};

test('controller failed save is visible, blocks flush, and retry preserves one copy of the input',async t=>{
 let fail=true;const original=session('controller-save-failure'),h=harness(t,original,async()=>{if(fail)throw Error('Synthetic quota failure');});
 await h.controller.handleAction('reply',null,'Loop open, all devices present');
 await h.inspect();
 assert.match(h.status.textContent,/Not saved/);assert.equal(h.saved.diagnosticChat.phase,'fault');
 await assert.rejects(h.controller.flush(),/Synthetic quota failure/);
 fail=false;await h.controller.handleAction('retry');await h.controller.flush();
 await h.inspect();
 assert.equal(h.saved.diagnosticChat.phase,'condition');
 assert.equal(h.saved.diagnosticChat.messages.filter(m=>m.role==='user'&&m.text==='Loop open, all devices present').length,1);
 assert.equal(h.saved.fieldVisit.incidents[0].exactComplaint,'Loop open, all devices present');
 assert.match(h.status.textContent,/Saved on this device/);
});

test('controller serialises rapid replies and keeps the newest full snapshot',async t=>{
 const first=deferred(),second=deferred();const h=harness(t,session('controller-rapid'),async(next,index)=>index===1?first.promise:second.promise);
 const p1=h.controller.handleAction('reply',null,'Loop open, all devices present');await tick();
 const p2=h.controller.handleAction('reply',null,'present');await tick();
 assert.equal(h.writes.length,1,'Second write must wait for first storage operation');
 first.resolve();await tick();assert.equal(h.writes.length,2);
 second.resolve();await Promise.all([p1,p2]);await h.controller.flush();
 assert.equal(h.saved.diagnosticChat.phase,'diagnosis');
 assert.equal(h.saved.fieldVisit.incidents[0].currentSymptomState,'present');
 assert.equal(h.saved.fieldVisit.incidents[0].exactComplaint,'Loop open, all devices present');
 assert.equal(new Set(h.saved.diagnosticChat.messages.map(m=>m.id)).size,h.saved.diagnosticChat.messages.length);
});

test('a later successful queued save clears an earlier failure indicator',async t=>{
 const first=deferred();const h=harness(t,session('controller-fail-then-success'),async(next,index)=>{if(index===1)await first.promise;});
 const p1=h.controller.handleAction('reply',null,'Loop open');await tick();
 const p2=h.controller.handleAction('reply',null,'present');await tick();
 first.reject(Error('Synthetic first transaction aborted'));
 await Promise.all([p1,p2]);await h.controller.flush();
 await h.inspect();
 assert.equal(h.saved.diagnosticChat.phase,'diagnosis');
 assert.match(h.status.textContent,/^Saved on this device$/,'Latest successful snapshot must clear stale save errors');
});

test('legacy visit fields survive a new controller save without inventing performed checks',async t=>{
 const old={id:'controller-legacy',started:1234,site:'Legacy synthetic site',answers:{historic_question:'unknown'},notes:'Original note',customLegacyField:{retain:'verbatim'}};
 const h=harness(t,old);
 await h.controller.handleAction('reply',null,'I need a readable manual');await h.controller.flush();
 assert.deepEqual(h.saved.answers,old.answers);assert.deepEqual(h.saved.customLegacyField,old.customLegacyField);assert.equal(h.saved.notes,old.notes);
 assert.equal(h.saved.diagnosticChat.phase,'manual');
 assert.equal(h.saved.fieldVisit.events.some(event=>event.result?.executionState==='performed'&&event.testKind==='voltage'),false);
});
