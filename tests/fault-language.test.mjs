import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFaultLanguageRequest,beginFaultLanguage,applyFaultLanguageReply,failFaultLanguage,requestFaultComponentManual} from '../public/app/fault-language.mjs';
import {ensureTerminalSession,submitTerminalInput,attachTerminalManual,getTerminalPrompt} from '../public/app/terminal-flow.mjs';
const manual={manualId:'language-fixture',contentHash:'language-fixture-hash',processorVersion:'synthetic',title:'SYNTHETIC intruder panel manual',usable:true,identity:{manufacturer:'Test',model:'Fixture 1',models:['Fixture 1'],systemTypes:['intruder'],equipmentType:'panel'},pages:[{page:1,quality:{readable:true},text:'SYNTHETIC TEST ONLY. The resistance wiring profile must match the installed zone wiring. Open the event history from the View menu. The event history shows the zone resistance and expander address. Record the exact model and firmware before changing any configuration.'}]};
const send=(s,value)=>submitTerminalInput(s,value).session;
function fixture(){let s=ensureTerminalSession({id:'language-job'},{intro:true});s=send(s,'START');s=attachTerminalManual(s,manual);s=send(s,'yes');s=send(s,'the panel');s=send(s,'Resistance fault on rear store detector');s=send(s,'present now');s=send(s,'DEOL profile at expander 1 input 3. Both ends accessible.');return s;}
test('manual gate and commands/readings retain the structured flow',()=>{
 assert.equal(buildFaultLanguageRequest(ensureTerminalSession({id:'empty'}),'explain that'),null);
 const s=fixture();for(const raw of ['HELP','BACK','GIVE UP','24.1 V at PSU output'])assert.equal(buildFaultLanguageRequest(s,raw),null);
});
test('actual model interpretation remains unperformed until explicit engineer confirmation',()=>{
 const s=fixture(),prompt=getTerminalPrompt(s);assert.equal(prompt.enginePrompt.kind,'question');
 const request=buildFaultLanguageRequest(s,'I checked that and it was definitely the case',{id:'request'});assert.equal(request.kind,'interpretation');
 const before=s.fieldVisit.events.length,started=beginFaultLanguage(s,request),proposed=applyFaultLanguageReply(started,request,{text:'YES',modelId:'test',metrics:{generationMs:1}});
 assert.equal(proposed.fieldVisit.events.length,before);assert.equal(getTerminalPrompt(proposed).kind,'language_confirmation');
 const accepted=send(proposed,'Use that answer');assert.ok(accepted.fieldVisit.events.length>before);assert.equal(accepted.diagnosticChat.languageInteractions[0].confirmed,true);
 const rejected=send(proposed,'Let me clarify');assert.equal(rejected.fieldVisit.events.length,before);assert.equal(rejected.diagnosticChat.languageInteractions[0].confirmed,false);
});
test('unsupported model wording never becomes a manual procedure or finding',()=>{
 const s=fixture(),request=buildFaultLanguageRequest(s,'Where is the event history?',{analyses:[manual],id:'explain'}),started=beginFaultLanguage(s,request),before=started.fieldVisit.events.length;
 const unsupported=applyFaultLanguageReply(started,request,{text:'Apply 240 V to terminal X1. [S1]',modelId:'test'});
 assert.equal(unsupported.fieldVisit.events.length,before);assert.ok(!unsupported.diagnosticChat.messages.some(m=>m.text.includes('Apply 240')));assert.match(unsupported.diagnosticChat.messages.at(-1).text,/couldn’t verify/);
 const supported=applyFaultLanguageReply(started,request,{text:'Open the event history from the View menu. [S1]',modelId:'test'});
 assert.ok(supported.diagnosticChat.messages.some(m=>m.sourceRefs?.some(r=>r.page===1&&r.contentHash===manual.contentHash)));
 assert.equal(getTerminalPrompt(supported).key,getTerminalPrompt(s).key);
});
test('cancel, refresh and stale model reply preserve the original check and full user text',()=>{
 const s=fixture(),request=buildFaultLanguageRequest(s,'I have inspected it but cannot be certain',{id:'cancel'}),started=beginFaultLanguage(s,request);
 const cancelled=failFaultLanguage(started,request,new DOMException('Cancelled','AbortError'));assert.equal(cancelled.diagnosticChat.languageInteractions[0].status,'cancelled');assert.equal(getTerminalPrompt(cancelled).key,getTerminalPrompt(s).key);
 const restored=ensureTerminalSession(JSON.parse(JSON.stringify(cancelled)));assert.ok(restored.diagnosticChat.messages.some(m=>m.text===request.raw));
 const different=send(started,'no'),late=applyFaultLanguageReply(different,request,{text:'YES'});assert.equal(late.diagnosticChat.languageInteractions[0].status,'superseded');assert.ok(!late.diagnosticChat.terminal.languageProposal);
});

test('an external component question requests its missing manual without interpreting panel limits',()=>{
 const s=fixture(),request=buildFaultLanguageRequest(s,'What about the external PSU?');assert.equal(request.kind,'component_manual');
 const next=requestFaultComponentManual(s,request);assert.equal(getTerminalPrompt(next).key,getTerminalPrompt(s).key);assert.equal(next.fieldVisit.events.at(-1).testKind,'manual_requirement');assert.match(next.diagnosticChat.messages.at(-1).text,/PSU manual/);assert.equal(next.diagnosticChat.languageInteractions,undefined);
});
