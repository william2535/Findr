import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiagnosticChatController} from '../public/app/diagnostic-chat.mjs';
import {ensureTerminalSession,submitTerminalInput,getTerminalPrompt} from '../public/app/terminal-flow.mjs';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
const defer=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const seed=id=>submitTerminalInput(ensureTerminalSession({id},{intro:true}),'START').session;

// Exercise production controller operations without replacing them with a fake
// state machine. Phone layout, actual PDF import and typing are browser checks.
function harness(t,initial,{write,controllerOptions={}}={}){
 const globals=['location','window','document','innerHeight','requestAnimationFrame'],originals=new Map(globals.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 globalThis.location={hash:'#controller-unit-test'};globalThis.window={addEventListener(){},visualViewport:null};globalThis.innerHeight=844;globalThis.requestAnimationFrame=()=>0;
 const listeners=new Map(),file={value:'',files:[],click(){clicks.push('file-picker');},addEventListener(kind,fn){listeners.set(kind,fn);}};
 const status={textContent:'',classList:{toggle(){}}};
 globalThis.document={addEventListener(){},visibilityState:'visible',createElement:()=>({getContext:()=>null})};
 t.after(()=>{for(const [key,value]of originals)value?Object.defineProperty(globalThis,key,value):delete globalThis[key];});
 let active=structuredClone(initial);const writes=[],notices=[],clicks=[];
 const controller=createDiagnosticChatController({app:{querySelector:selector=>selector==='#diagnostic-save-status'?status:selector==='#diagnostic-pdf-input'?file:null,querySelectorAll:()=>[],style:{setProperty(){}}},getSession:()=>active,onUpdate:async next=>{writes.push(structuredClone(next));await write?.(next,writes.length);if(active.id===next.id)active=structuredClone(next);},getSaved:()=>new Map(),refreshSaved:async()=>{},getRecords:()=>[],readPDF:async()=>{},toast:message=>notices.push(message),onNewVisit:async()=>{},...controllerOptions});
 return {controller,writes,notices,clicks,file,listeners,status,get saved(){return active;},set saved(value){active=structuredClone(value);}};
}

test('typed upload opens the real picker synchronously before its transcript write finishes',async t=>{
 const first=defer(),h=harness(t,seed('picker-job'),{write:async(_next,index)=>{if(index===1)await first.promise;}});
 const pending=h.controller.handleAction('reply',null,'3');assert.deepEqual(h.clicks,['file-picker']);await tick();assert.equal(h.writes.length,1);assert.ok(h.writes[0].diagnosticChat.messages.some(item=>item.role==='user'&&item.text==='3'));
 first.resolve();await pending;await h.controller.flush();assert.equal(getTerminalPrompt(h.saved).kind,'manuals');
});

test('controller persists complete opening and prompt text independently of visual typing',async t=>{
 const initial=ensureTerminalSession({id:'intro-controller'},{intro:true}),h=harness(t,initial);
 await h.controller.handleAction('reply',null,'START');await h.controller.flush();
 const messages=h.saved.diagnosticChat.messages.map(item=>item.text);assert.equal(messages[0],'let’s find that shit.');assert.ok(messages.some(item=>item.includes('Ready? Type START.')));assert.ok(messages.some(item=>item.includes('So, pick your panel.')));
 const before=h.saved.diagnosticChat.messages.length;await h.controller.handleAction('command',null,'HELP');assert.equal(h.saved.diagnosticChat.messages.filter(item=>item.text==='let’s find that shit.').length,1);assert.ok(h.saved.diagnosticChat.messages.length>before);
});

test('interrupted resource recovery keeps the same job and never asks for a clearer PDF',async t=>{
 const initial=seed('interrupted-controller');initial.diagnosticChat.terminal.pendingOperation={kind:'resources'};
 const h=harness(t,initial);await h.controller.handleAction('command',null,'HELP');await h.controller.flush();
 assert.equal(h.saved.id,initial.id);assert.equal(h.saved.diagnosticChat.terminal.pendingOperation,undefined);
 const recovery=h.saved.diagnosticChat.messages.filter(item=>/resource.*cancelled/i.test(item.text));assert.ok(recovery.length);assert.ok(recovery.every(item=>!/clearer|unreadable/i.test(item.text)));assert.equal(h.saved.diagnosticChat.manuals.length,0);
});

test('resource setup cannot put a pending operation into a different job after an awaited save',async t=>{
 const first=defer(),h=harness(t,seed('resource-origin'),{write:async(_next,index)=>{if(index===1)await first.promise;}});
 const operation=h.controller.handleAction('resources');await tick();assert.equal(h.writes.length,1);
 h.saved=seed('different-job');first.resolve();await operation;
 assert.equal(h.writes.some(item=>item.id==='different-job'),false,'Old resource setup must stop before mutating the replacement job');
 assert.equal(h.saved.diagnosticChat.terminal.pendingOperation,undefined);assert.equal(h.saved.id,'different-job');
});

test('the exact Quick Questions command saves before changing modes and ordinary descriptions remain answers',async t=>{
 const navigations=[];let h;h=harness(t,seed('mode-command'),{controllerOptions:{onQuickQuestions:async()=>navigations.push(h.saved.diagnosticChat.messages.at(-1).text)}});
 await h.controller.handleAction('reply',null,'qUiCk questions');await h.controller.flush();
 assert.deepEqual(navigations,['qUiCk questions']);assert.equal(getTerminalPrompt(h.saved).kind,'manuals');
 await h.controller.handleAction('reply',null,'I have quick questions about this loop fault');await h.controller.flush();
 assert.equal(navigations.length,1);assert.ok(h.saved.diagnosticChat.messages.some(message=>message.role==='user'&&message.text==='I have quick questions about this loop fault'));
});

test('Fault Finder resource choices use the shared coordinator with a captured job origin',async t=>{
 const openings=[],h=harness(t,seed('shared-kit'),{controllerOptions:{openResources:async value=>openings.push(value)}});
 await h.controller.handleAction('resources');await h.controller.handleAction('readiness');
 assert.deepEqual(openings,[{origin:{kind:'faults',id:'shared-kit'}},{origin:{kind:'faults',id:'shared-kit'}}]);
 assert.equal(h.writes.length,0,'Opening the kit must not fabricate a completed download or processing attempt');
});

test('shared model resource events update only their captured job without claiming PDF processing',async t=>{
 const h=harness(t,seed('model-kit')),origin={kind:'faults',id:'model-kit'};
 await h.controller.resourceEvent({type:'resource_download_started',resource:'model',origin});
 assert.equal(h.saved.diagnosticChat.terminal.pendingOperation.resource,'model');
 await h.controller.resourceEvent({type:'resource_download_completed',resource:'model',origin,ready:true});await h.controller.flush();
 assert.equal(h.saved.diagnosticChat.terminal.pendingOperation,undefined);assert.ok(h.saved.diagnosticChat.messages.some(message=>/local language model is ready offline/i.test(message.text)));
 assert.equal(h.saved.diagnosticChat.messages.some(message=>/offline processing resources are ready/i.test(message.text)),false);
 const count=h.writes.length;await h.controller.resourceEvent({type:'resource_download_started',resource:'processing',origin:{kind:'questions',id:'model-kit'}});await h.controller.resourceEvent({type:'resource_download_completed',resource:'model',origin:{kind:'faults',id:'different-job'},ready:true});assert.equal(h.writes.length,count);
});

test('shared resource cancellation retains the investigation and offers resource recovery',async t=>{
 const h=harness(t,seed('cancel-shared-kit')),origin={kind:'faults',id:'cancel-shared-kit'};
 await h.controller.resourceEvent({type:'resource_download_started',resource:'processing',origin});
 await h.controller.resourceEvent({type:'resource_download_cancelled',resource:'processing',origin,error:{code:'RESOURCE_DOWNLOAD_CANCELLED',message:'Synthetic download cancellation'}});await h.controller.flush();
 const prompt=getTerminalPrompt(h.saved);assert.match(prompt.text,/resource.*cancelled/i);assert.doesNotMatch(prompt.text,/clearer|unlocked|unreadable/i);assert.ok(prompt.options.some(option=>option.value==='resources'));assert.equal(h.saved.diagnosticChat.terminal.pendingOperation,undefined);
});
