import test from 'node:test';
import assert from 'node:assert/strict';
import {getOnlineProvider} from '../public/app/online-language-policy.mjs';
import {conversationAssistantMode,renderAssistantModeSelector,renderAssistantModePanel,createAssistantModesController} from '../public/app/assistant-modes.mjs';

// Deterministic UI/coordinator tests with fake storage and a memory-only fake
// key adapter. They do not establish real provider inference or account billing.
const secret='SYNTHETIC_KEY_NEVER_A_REAL_CREDENTIAL';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness({hasKey=false,hasOpenAIKey=false,getConversation,onModeSelected,onDisconnected,setKey,clearKey,readinessExtra={}}={}){
  const keys={groq:hasKey,openai:hasOpenAIKey};let closed=0;const calls=[],selected=[],disconnected=[],readinessCalls=[];
  const input={value:''},free={checked:false},paid={checked:false},sharing={checked:false};let html='';
  const panel={get outerHTML(){return html;},set outerHTML(value){html=value;free.checked=false;paid.checked=false;sharing.checked=false;},querySelector:selector=>selector==='[data-assistant-online-key]'?input:selector==='[data-assistant-free-plan]'?free:selector==='[data-assistant-paid-usage]'?paid:selector==='[data-assistant-data-consent]'?sharing:null,closest:()=>null};
  const onlineAPI={getOnlineReadiness:(providerId='groq')=>{readinessCalls.push(providerId);return {provider:getOnlineProvider(providerId).name,providerId,hasKey:keys[providerId],configured:true,online:true,available:keys[providerId],canGenerate:keys[providerId],...readinessExtra};},setOnlineKey:(value,providerId='groq')=>{calls.push({method:'setKey',providerId,correct:value===secret});if(setKey)setKey(value,providerId);keys[providerId]=true;},clearOnlineKey:(providerId='groq')=>{calls.push({method:'clearKey',providerId});if(clearKey)clearKey(providerId);keys[providerId]=false;},generateOnlineReply:()=>{throw Error('A mode change must never run inference');}};
  const controller=createAssistantModesController({showModal:value=>html=value,closeModal:()=>{closed++;},selectPanel:()=>panel,getConversation:getConversation||(()=>({id:'job-a',aiMode:'offline',pending:{text:'Keep this original question'}})),onModeSelected:async event=>{selected.push(event);await onModeSelected?.(event);},onDisconnected:async event=>{disconnected.push(event);await onDisconnected?.(event);},onlineAPI,now:()=>12345});
  return {controller,input,free,paid,sharing,calls,selected,disconnected,readinessCalls,panel,get html(){return html;},get connected(){return keys.groq;},hasKey:providerId=>keys[providerId],get closed(){return closed;},consent(providerId='groq'){(providerId==='openai'?paid:free).checked=sharing.checked=true;input.value=secret;}};
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
  const h=harness();await h.controller.open({origin,initialMode:'online'});h.consent();assert.equal(await h.controller.handleAction('enable'),true);assert.equal(h.input.value,'');assert.deepEqual(h.calls,[{method:'setKey',providerId:'groq',correct:true}]);assert.deepEqual(h.selected,[{origin,mode:'online',consent:{provider:'groq',modelId:'openai/gpt-oss-120b',version:'groq-byok-v1',acceptedAt:12345,freePlanConfirmed:true}}]);assert.equal(h.closed,1);assert.doesNotMatch(JSON.stringify(h.controller.getState())+JSON.stringify(h.selected)+h.html,new RegExp(secret));
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
  const h=harness({hasKey:true,onDisconnected:()=>{assert.equal(h.connected,false);}});await h.controller.open({origin,initialMode:'online'});h.input.value=secret;assert.equal(await h.controller.handleAction('disconnect'),true);assert.equal(h.input.value,'');assert.deepEqual(h.calls,[{method:'clearKey',providerId:'groq'}]);assert.deepEqual(h.disconnected,[{origin}]);assert.deepEqual(h.selected,[]);assert.equal(h.controller.getState().readiness.hasKey,false);assert.match(h.html,/Key cleared/);
});
test('Disconnect does not falsely claim success if the key adapter fails',async()=>{
  const h=harness({hasKey:true,clearKey:()=>{throw Error(secret);}});await h.controller.open({origin,initialMode:'online'});assert.equal(await h.controller.handleAction('disconnect'),false);assert.match(h.html,/could not disconnect/);assert.doesNotMatch(h.html,/Key cleared/);assert.doesNotMatch(h.html,new RegExp(secret));assert.deepEqual(h.disconnected,[]);
});


test('OpenAI disclosure is paid API-specific and contains no Groq account links or Free-plan consent',()=>{
  const provider=getOnlineProvider('openai'),html=renderAssistantModePanel({mode:'online',providerId:'openai',readiness:{configured:true}});
  for(const text of [provider.name,provider.modelId,provider.keyURL,provider.policyURL,'OpenAI API usage is paid','A ChatGPT subscription does not include API usage','data-assistant-paid-usage','data-assistant-data-consent'])assert.ok(html.includes(text),text);
  assert.doesNotMatch(html,/console\.groq\.com|data-assistant-free-plan|Groq Free plan key|OpenAI[^<.]*is free/);
  const selector=renderAssistantModeSelector({mode:'online',onlineReadiness:{providerId:'openai',hasKey:false}});assert.match(selector,/Paid API usage applies/);assert.match(selector,/ChatGPT subscription does not cover it/);assert.doesNotMatch(selector,/Groq|Free plan/);
});
test('saved OpenAI consent chooses OpenAI readiness and does not reuse an existing Groq key',async()=>{
  const h=harness({hasKey:true,getConversation:()=>({id:'job-a',aiMode:'online',onlineConsent:{provider:'openai'}})});await h.controller.open({origin});
  assert.equal(h.controller.getState().providerId,'openai');assert.equal(h.controller.getState().readiness.hasKey,false);assert.equal(h.readinessCalls.at(-1),'openai');assert.deepEqual(h.calls,[]);
  h.paid.checked=h.sharing.checked=true;assert.equal(await h.controller.handleAction('enable'),false);assert.match(h.html,/Add your OpenAI API key/);assert.equal(h.connected,true);assert.deepEqual(h.selected,[]);
});
test('provider preview switch clears draft key and both consents without sending, changing keys or saving the job',async()=>{
  const h=harness({hasKey:true});await h.controller.open({origin,initialMode:'online'});h.consent();await h.controller.handleAction('provider','openai');
  assert.equal(h.input.value,'');assert.equal(h.free.checked,false);assert.equal(h.paid.checked,false);assert.equal(h.sharing.checked,false);assert.equal(h.controller.getState().providerId,'openai');assert.equal(h.controller.getState().readiness.hasKey,false);assert.deepEqual(h.calls,[]);assert.deepEqual(h.selected,[]);
  await h.controller.handleAction('provider','groq');assert.equal(h.controller.getState().readiness.hasKey,true);assert.equal(h.connected,true);assert.deepEqual(h.calls,[]);assert.equal(await h.controller.handleAction('provider','unrecognised'),false);assert.equal(h.controller.getState().providerId,'groq');
});
test('OpenAI requires paid API acknowledgement as well as sharing, even if Groq Free consent was checked',async()=>{
  const h=harness();await h.controller.open({origin,initialMode:'online'});await h.controller.handleAction('provider','openai');h.input.value=secret;h.free.checked=h.sharing.checked=true;
  assert.equal(await h.controller.handleAction('enable'),false);assert.deepEqual(h.calls,[]);assert.match(h.controller.getState().error,/paid API cost and data-sharing/);h.paid.checked=true;h.sharing.checked=false;assert.equal(await h.controller.handleAction('enable'),false);assert.deepEqual(h.calls,[]);assert.deepEqual(h.selected,[]);
});
test('explicit OpenAI enable stores only paid provider consent and passes the key to the scoped memory slot',async()=>{
  const h=harness({hasKey:true}),provider=getOnlineProvider('openai');await h.controller.open({origin,initialMode:'online'});await h.controller.handleAction('provider','openai');h.consent('openai');assert.equal(await h.controller.handleAction('enable'),true);
  assert.deepEqual(h.calls,[{method:'setKey',providerId:'openai',correct:true}]);assert.equal(h.hasKey('groq'),true);assert.equal(h.hasKey('openai'),true);assert.deepEqual(h.selected,[{origin,mode:'online',consent:{provider:'openai',modelId:provider.modelId,version:'openai-byok-v1',acceptedAt:12345,paidUsageConfirmed:true}}]);assert.equal(h.input.value,'');assert.doesNotMatch(JSON.stringify(h.selected)+JSON.stringify(h.controller.getState()),new RegExp(secret));
});
test('disconnecting OpenAI clears only its memory key and preserves the Groq key and saved mode',async()=>{
  const h=harness({hasKey:true,hasOpenAIKey:true});await h.controller.open({origin,initialMode:'online'});await h.controller.handleAction('provider','openai');assert.equal(h.controller.getState().readiness.hasKey,true);assert.equal(await h.controller.handleAction('disconnect'),true);
  assert.deepEqual(h.calls,[{method:'clearKey',providerId:'openai'}]);assert.equal(h.hasKey('openai'),false);assert.equal(h.hasKey('groq'),true);assert.deepEqual(h.selected,[]);assert.match(h.html,/OpenAI replies are disconnected/);assert.match(h.html,/Other provider keys/);
});
test('OpenAI key errors remain provider-specific and cannot expose input',async()=>{
  const h=harness({setKey:()=>{throw Object.assign(Error(secret),{code:'ONLINE_KEY_INVALID'});}});await h.controller.open({origin,initialMode:'online'});await h.controller.handleAction('provider','openai');h.consent('openai');assert.equal(await h.controller.handleAction('enable'),false);
  assert.match(h.html,/Check the key in your OpenAI console/);assert.doesNotMatch(h.html,new RegExp(secret));assert.deepEqual(h.selected,[]);
});
