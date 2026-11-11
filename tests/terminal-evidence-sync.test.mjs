import test from 'node:test';
import assert from 'node:assert/strict';
import {syncTerminalEvidence} from '../public/app/terminal-evidence-sync.mjs';
import {ensureTerminalSession,submitTerminalInput,getTerminalPrompt} from '../public/app/terminal-flow.mjs';
import {addTestEvent,addImpairment} from '../public/app/field-model.mjs';

const now=1794300000000;
const seed=()=>submitTerminalInput(ensureTerminalSession({id:'external-tools-job'},{intro:true,now}),'start',{now:now+1}).session;
const mirrored=session=>session.diagnosticChat.messages.filter(item=>item.kind==='external_evidence');
function changed(session,operation){const next=structuredClone(session);operation(next.fieldVisit);return next;}

test('saved detailed-editor readings enter the same transcript with original provenance',()=>{
 const before=seed(),next=structuredClone(before);next.fieldVisit=addTestEvent(next.fieldVisit,{id:'external-reading',incidentId:next.diagnosticChat.incidentId,testKind:'voltage',points:[{label:'PSU AUX+'}],reference:'AUX− at same PSU',operatingState:'alarm demand',circuitState:'energised_connected',result:{rawText:'0.00',unit:'V',source:'meter',executionState:'performed'},sourceRefs:[{manualId:'fixture',page:3,contentHash:'fixture-hash'}]},now+2);
 const result=syncTerminalEvidence(before,next,{now:now+3}),entry=mirrored(result)[0];assert.match(entry.text,/0.00 V/);assert.match(entry.text,/PSU AUX/);assert.match(entry.text,/alarm demand/);assert.deepEqual(entry.eventIds,['external-reading']);assert.equal(entry.sourceRefs[0].page,3);
 assert.equal(result.diagnosticChat.messages[0].text,'let’s find that shit.');assert.equal(getTerminalPrompt(result).kind,'manuals');assert.equal(result.diagnosticChat.identity.confirmedEquipment,undefined);assert.equal(result.fieldVisit.events.find(item=>item.id==='external-reading').result.rawText,'0.00');
 assert.equal(mirrored(before).length,0);assert.equal(mirrored(next).length,0);
});

test('conditions, permissions and impairments record exact changes without granting answers',()=>{
 const before=seed();let next=changed(before,visit=>{visit.incidents[0].context.safeAccess=false;visit.incidents[0].context.procedure='Not available';visit.incidents[0].permissions.isolation=false;visit.siteRef='Training House';});
 next.fieldVisit=addImpairment(next.fieldVisit,{id:'external-impairment',existingOrIntroduced:'introduced',affectedAssetOrFunction:'Loop 1 disconnected',owner:'Duty engineer',measures:'Recorded cover',reviewBy:'2026-11-10T16:00:00Z'},now+1);
 const result=syncTerminalEvidence(before,next,{now:now+2}),transcript=mirrored(result).map(item=>item.text).join('\n');
 assert.match(transcript,/safe access: no \(recorded\)/);assert.match(transcript,/isolation: no \(recorded\)/);assert.match(transcript,/Loop 1 disconnected/);assert.match(transcript,/Training House/);assert.equal(result.fieldVisit.events.some(item=>item.testKind==='question_answer'),false);assert.equal(result.fieldVisit.impairments[0].restoredAt,null);
});

test('repeat transactions and UI-only autosaves do not duplicate terminal evidence',()=>{
 const before=seed(),next=changed(before,visit=>{visit.incidents[0].context.safeAccess=true;});
 const once=syncTerminalEvidence(before,next,{now:now+2}),retry=syncTerminalEvidence(before,once,{now:now+3});assert.equal(mirrored(retry).length,1);
 const afterRetry=syncTerminalEvidence(retry,changed(retry,visit=>{visit.incidents[0].context.safeAccess=false;}));assert.equal(new Set(mirrored(afterRetry).map(item=>item.id)).size,2);
 const repeated=syncTerminalEvidence(once,once,{now:now+4});assert.equal(mirrored(repeated).length,1);
 const ui=changed(once,visit=>{visit.ui={view:'handover',draftTest:{rawText:'12'}};visit.updatedAt=now+7;});assert.equal(mirrored(syncTerminalEvidence(once,ui)).length,1);
});

test('returning a condition to an earlier value still records each actual change',()=>{
 let state=seed();for(const safeAccess of [true,false,true]){const next=changed(state,visit=>{visit.incidents[0].context.safeAccess=safeAccess;});state=syncTerminalEvidence(state,next);}
 assert.equal(mirrored(state).length,3);assert.equal(new Set(mirrored(state).map(item=>item.id)).size,3);
});

test('restoration records retain unverified fields and corrections retain the original reading',()=>{
 const before=seed();before.fieldVisit=addTestEvent(before.fieldVisit,{id:'old-reading',incidentId:before.diagnosticChat.incidentId,testKind:'observation',result:{rawText:'fault indication present',source:'panel',executionState:'performed'}},now);
 const next=changed(before,visit=>{visit.handover.systemLeft='Loop 1 remains disconnected';visit.handover.restorationStatus='unverified';});
 next.fieldVisit=addTestEvent(next.fieldVisit,{id:'corrected-reading',supersedes:'old-reading',incidentId:next.diagnosticChat.incidentId,testKind:'observation',result:{rawText:'intermittent indication',source:'panel',executionState:'performed'}},now+1);
 const result=syncTerminalEvidence(before,next),messages=mirrored(result).map(item=>item.text).join('\n');assert.match(messages,/Correction recorded/);assert.match(messages,/Earlier record retained: old-reading/);assert.match(messages,/Loop 1 remains disconnected/);assert.equal(result.fieldVisit.events.length,2);assert.equal(result.fieldVisit.handover.restorationStatus,'unverified');
});

test('stale editor snapshot cannot replace newer terminal conversation state',()=>{
 const old=seed(),current=submitTerminalInput(old,'MANUALS',{now:now+5}).session,next=changed(old,visit=>{visit.incidents[0].context.safeAccess=true;});
 const result=syncTerminalEvidence(current,next);assert.equal(result.diagnosticChat.terminal.stage,current.diagnosticChat.terminal.stage);assert.ok(result.diagnosticChat.messages.some(item=>item.text==='MANUALS'));assert.equal(mirrored(result).length,1);
});

test('legacy and different-job sessions are untouched and secrets are not mirrored',()=>{
 const legacy={id:'old',notes:'preserve',fieldVisit:{events:[]}};assert.deepEqual(syncTerminalEvidence(legacy,legacy),legacy);
 const before=seed(),next=changed(before,visit=>{visit.incidents[0].context.notes='password=do-not-retain';});const result=syncTerminalEvidence(before,next);assert.doesNotMatch(JSON.stringify(mirrored(result)),/do-not-retain/);
 assert.deepEqual(syncTerminalEvidence(before,{...next,id:'other'}),{...next,id:'other'});
});
