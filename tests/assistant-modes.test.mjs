import test from 'node:test';
import assert from 'node:assert/strict';
import {conversationAssistantMode,renderAssistantModeSelector,renderAssistantModePanel,createAssistantModesController} from '../public/app/assistant-modes.mjs';

// Deterministic UI/coordinator tests with fake storage and a memory-only fake
// key adapter. They do not establish real Groq inference or account billing.
const secret='SYNTHETIC_KEY_NEVER_A_REAL_CREDENTIAL';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness({hasKey=false,getConversation,onModeSelected,onDisconnected,setKey,clearKey,readinessExtra={}}={}){
  let connected=hasKey,closed=0;const calls=[],selected=[],disconnected=[];
  const input={value:''},free={checked:false},sharing={checked:false};let html='';
  const panel={get outerHTML(){return html;},set outerHTML(value){html=value;free.checked=false;sharing.checked=false;},querySelector:selector=>selector==='[data-assistant-online-key]'?input:selector==='[data-assistant-free-plan]'?free:selector==='[data-assistant-data-consent]'?sharing:null,closest:()=>null};
  const onlineAPI={getOnlineReadiness:()=>({provider:'Groq',hasKey:connected,configured:true,online:true,available:connected,canGenerate:connected,...readinessExtra}),setOnlineKey:value=>{calls.push({method:'setKey',correct:value===secret});if(setKey)setKey(value);connected=true;},clearOnlineKey:()=>{calls.push({method:'clearKey'});if(clearKey)clearKey();connected=false;},generateOnlineReply:()=>{throw Error('A mode change must never run inference');}};
  const controller=createAssistantModesController({showModal:value=>html=value,closeModal:()=>{closed++;},selectPanel:()=>panel,getConversation:getConversation||(()=>({id:'job-a',aiMode:'offline',pending:{text:'Keep this original question'}})),onModeSelected:async event=>{selected.push(event);await onModeSelected?.(event);},onDisconnected:async event=>{disconnected.push(event);await onDisconnected?.(event);},onlineAPI,now:()=>12345});
  return {controller,input,free,sharing,calls,selected,disconnected,panel,get html(){return html;},get connected(){return connected;},get closed(){return closed;},consent(){free.checked=sharing.checked=true;input.value=secret;}};
}
const origin={kind:'helper',id:'pal-a',conversationId:'job-a'};

test('legacy mode defaults remain local and the selector labels all three choices without exposing readiness secrets',()=>{
  assert.equal(conversationAssistantMode({}),'offline');assert.equal(conversationAssistantMode({manualOnly:true}),'manual');assert.equal(conversationAssistantMode({aiMode:'online',manualOnly:true}),'online');assert.equal(conversationAssistantMode({aiMode:'<script>'}),'offline');
  const html=renderAssistantModeSelector({mode:'online',onlineReadiness:{hasKey:true,key:secret,token:secret},pending:true});
  for(const text of ['Offline AI','Online AI','Manual search','Groq','Internet required','Retry'])assert.match(html,new RegExp(text));assert.doesNotMatch(html,new RegExp(secret));assert.match(html,/data-value="online" aria-pressed="true"/);
});
test('online disclosure names the provider, relay, excerpts, Free plan limits and session key lifetime',()=>{
  const html=renderAssistantModePanel({mode:'online',readiness:{configured:true,hasKey:false,online:false},pending:true});
  for(const text of ['Groq','openai/gpt-oss-120b','FINDR server','relevant recent conversation context','Whole PDFs are not uploaded','No local model download','Free plan limits','cannot verify your Groq billing tier','console.groq.com/keys','browser session','password','Retry','offline'])assert.ok(html.includes(text),text);
  assert.doesNotMatch(html,/<input[^>]*type="password"[^>]*value=/);assert.doesNotMatch(html,/<input[^>]*type="checkbox"[^>]*checked/);
});
test('opening online setup reads local state only and retains a pending question without inference or key changes',async()=>{
  const h=harness();await h.controller.open({origin,initialMode:'online'});assert.deepEqual(h.calls,[]);assert.deepEqual(h.selected,[]);assert.equal(h.controller.getState().pending,true);assert.equal(h.controller.getState().savedMode,'offline');assert.match(h.html,/Choosing a mode|original question/);
});
test('both affirmative consent choices are required before the key adapter or saved mode is touched',async()=>{
  const h=harness();await h.controller.open({origin,initialMode:'online'});h.input.value=secret;h.free.checked=true;assert.equal(await h.controller.handleAction('enable'),false);assert.deepEqual(h.calls,[]);assert.deepEqual(h.selected,[]);assert.doesNotMatch(JSON.stringify(h.controller.getState()),new RegExp(secret));h.free.checked=false;h.sharing.checked=true;assert.equal(await h.controller.handleAction('enable'),false);assert.deepEqual(h.calls,[]);
});
test('explicit enable passes a key only to the memory adapter, then saves key-free scoped consent without answering',async()=>{
  const h=harness();await h.controller.open({origin,initialMode:'online'});h.consent();assert.equal(await h.controller.handleAction('enable'),true);assert.equal(h.input.value,'');assert.deepEqual(h.calls,[{method:'setKey',correct:true}]);assert.deepEqual(h.selected,[{origin,mode:'online',consent:{provider:'groq',modelId:'openai/gpt-oss-120b',version:'groq-byok-v1',acceptedAt:12345,freePlanConfirmed:true}}]);assert.equal(h.closed,1);assert.doesNotMatch(JSON.stringify(h.controller.getState())+JSON.stringify(h.selected)+h.html,new RegExp(secret));
});
test('an existing session key still requires consent but is not copied into the field or reset when reused',async()=>{
  const h=harness({hasKey:true});await h.controller.open({origin,initialMode:'online'});assert.equal(h.input.value,'');h.free.checked=h.sharing.checked=true;assert.equal(await h.controller.handleAction('enable'),true);assert.deepEqual(h.calls,[]);assert.equal(h.selected[0].mode,'online');
});
test('an absent key has a useful recovery message without creating online consent',async()=>{
  const h=harness();await h.controller.open({origin,initialMode:'online'});h.free.checked=h.sharing.checked=true;assert.equal(await h.controller.handleAction('enable'),false);assert.match(h.controller.getState().error,/Add your Groq Free plan key/);assert.deepEqual(h.selected,[]);assert.equal(h.controller.getState().savedMode,'offline');
});
test('invalid key exceptions cannot echo sensitive input through markup or controller state',async()=>{
  const h=harness({setKey:()=>{throw Object.assign(Error('Invalid '+secret),{code:'ONLINE_KEY_INVALID'});}});await h.controller.open({origin,initialMode:'online'});h.consent();assert.equal(await h.controller.handleAction('enable'),false);assert.equal(h.input.value,'');assert.match(h.html,/Check the key in your Groq console/);assert.doesNotMatch(h.html+JSON.stringify(h.controller.getState()),new RegExp(secret));assert.deepEqual(h.selected,[]);
});
test('manual and offline mode choices retain connected keys and do not download models or run inference',async()=>{
  const h=harness({hasKey:true});await h.controller.open({origin,initialMode:'manual'});await h.controller.handleAction('save');assert.deepEqual(h.selected[0],{origin,mode:'manual'});assert.equal(h.connected,true);assert.deepEqual(h.calls,[]);await h.controller.open({origin,initialMode:'offline'});await h.controller.handleAction('save');assert.deepEqual(h.selected[1],{origin,mode:'offline'});assert.equal(h.connected,true);assert.deepEqual(h.calls,[]);
});
test('Cancel clears an unsubmitted key and leaves the saved conversation mode untouched',async()=>{
  const h=harness();await h.controller.open({origin,initialMode:'online'});h.input.value=secret;await h.controller.handleAction('cancel');assert.equal(h.input.value,'');assert.equal(h.closed,1);assert.deepEqual(h.calls,[]);assert.deepEqual(h.selected,[]);
});
test('switching a preview away from online clears input and remains an unsaved choice',async()=>{
  const h=harness();await h.controller.open({origin,initialMode:'online'});h.input.value=secret;await h.controller.handleAction('choose','manual');assert.equal(h.input.value,'');assert.equal(h.controller.getState().mode,'manual');assert.equal(h.controller.getState().savedMode,'offline');assert.deepEqual(h.calls,[]);assert.deepEqual(h.selected,[]);
});
test('failed mode persistence preserves the prior mode and never exposes a key through the storage error',async()=>{
  const h=harness({onModeSelected:()=>{throw Object.assign(Error(secret),{code:'STORAGE_UNAVAILABLE'});}});await h.controller.open({origin,initialMode:'online'});h.consent();assert.equal(await h.controller.handleAction('enable'),false);assert.equal(h.closed,0);assert.equal(h.controller.getState().savedMode,'offline');assert.equal(h.connected,true);assert.match(h.html,/mode could not be saved/);assert.doesNotMatch(h.html+JSON.stringify(h.controller.getState()),new RegExp(secret));
});
test('a late read from an old dialog cannot save its mode or key into a newly opened conversation',async()=>{
  const blocked=deferred();let count=0;const h=harness({getConversation:async()=>++count===2?blocked.promise:{id:'job',aiMode:'offline'}});await h.controller.open({origin,initialMode:'online'});h.consent();const saving=h.controller.handleAction('enable');await tick();const other={kind:'helper',id:'pal-b',conversationId:'job-b'};await h.controller.open({origin:other,initialMode:'manual'});blocked.resolve({id:'job-a',aiMode:'offline'});assert.equal(await saving,false);assert.deepEqual(h.calls,[]);assert.deepEqual(h.selected,[]);assert.deepEqual(h.controller.getState().origin,other);assert.equal(h.controller.getState().mode,'manual');
});
test('a completed save from an old dialog cannot close or relabel a newly opened dialog',async()=>{
  const blocked=deferred(),h=harness({onModeSelected:()=>blocked.promise});await h.controller.open({origin,initialMode:'manual'});const saving=h.controller.handleAction('save');await tick();const other={kind:'helper',id:'pal-b',conversationId:'job-b'};await h.controller.open({origin:other,initialMode:'online'});blocked.resolve();assert.equal(await saving,false);assert.equal(h.closed,0);assert.deepEqual(h.selected[0].origin,origin);assert.deepEqual(h.controller.getState().origin,other);assert.equal(h.controller.getState().mode,'online');
});
test('Disconnect clears the shared session key before notifying the captured conversation, without changing its mode',async()=>{
  const h=harness({hasKey:true,onDisconnected:()=>{assert.equal(h.connected,false);}});await h.controller.open({origin,initialMode:'online'});h.input.value=secret;assert.equal(await h.controller.handleAction('disconnect'),true);assert.equal(h.input.value,'');assert.deepEqual(h.calls,[{method:'clearKey'}]);assert.deepEqual(h.disconnected,[{origin}]);assert.deepEqual(h.selected,[]);assert.equal(h.controller.getState().readiness.hasKey,false);assert.match(h.html,/Key cleared/);
});
test('Disconnect does not falsely claim success if the key adapter fails',async()=>{
  const h=harness({hasKey:true,clearKey:()=>{throw Error(secret);}});await h.controller.open({origin,initialMode:'online'});assert.equal(await h.controller.handleAction('disconnect'),false);assert.match(h.html,/could not disconnect/);assert.doesNotMatch(h.html,/Key cleared/);assert.doesNotMatch(h.html,new RegExp(secret));assert.deepEqual(h.disconnected,[]);
});
