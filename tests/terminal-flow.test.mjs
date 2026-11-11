import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureTerminalSession,getTerminalPrompt,submitTerminalInput,skipTerminalIntro,recordTerminalEvent,attachTerminalManual,confirmTerminalIdentity,recordTerminalMeasurement,resumeTerminalSession,errorPrompt,resolveTerminalOption,refreshTerminalPrompt} from '../public/app/terminal-flow.mjs';
import {getDiagnosticPrompt,getDiagnosticReport,ensureDiagnosticChat,attachDiagnosticManual,confirmDiagnosticIdentity} from '../public/app/diagnostic-chat-engine.mjs';
import {addTestEvent} from '../public/app/field-model.mjs';
import {TERMINAL_READING_SOURCES} from '../public/app/terminal-reading-evidence.mjs';
const now=1794300000000;
let sequence=0;
const options=()=>({now:now+(++sequence),id:`input-${sequence}`});
const send=(session,text)=>submitTerminalInput(session,text,options());
const current=session=>session.fieldVisit.incidents.find(item=>item.id===session.diagnosticChat.incidentId);
function manual(extra={}){return {id:'terminal-synthetic-panel',manualId:'terminal-synthetic-panel',contentHash:'terminal-synthetic-hash',processorVersion:'synthetic-1',title:'SYNTHETIC panel manual',filename:'synthetic-panel.pdf',usable:true,pageCount:2,identity:{manufacturer:'Synthetic',model:'Fixture 1',models:['Fixture 1'],equipmentType:'panel',systemTypes:['intruder'],revision:'TEST ONLY'},pages:[{page:1,text:'SYNTHETIC TEST ONLY manual. Fixture 1 panel manufacturer Synthetic. Intruder alarm panel installation and maintenance.'},{page:2,text:'Read the panel event history. Record the exact zone resistance wiring profile and the input expander. Confirm access to both ends before resistance testing. Record the supply and load voltage at the actual terminals and current operating condition.'}],...extra};}
function fresh(){return ensureTerminalSession({id:'terminal-job-'+(++sequence),started:now},{intro:true,now});}
function identified(){let session=send(fresh(),'start').session;session=attachTerminalManual(session,manual(),{now});return send(session,'yes').session;}
function investigating(){let session=send(identified(),'the panel').session;session=send(session,'Intermittent resistance fault at the rear-store detector').session;return send(session,'intermittent').session;}

test('intro, START and manual question persist in one transcript and do not replay on reload',()=>{
 const initial=fresh(),id=initial.id;assert.equal(getTerminalPrompt(initial).kind,'intro');assert.match(initial.diagnosticChat.messages[0].text,/let’s find that shit/);
 const started=send(initial,'StArT').session;assert.equal(started.id,id);assert.equal(getTerminalPrompt(started).kind,'manuals');
 const transcript=started.diagnosticChat.messages.map(m=>m.text).join('\n');assert.match(transcript,/Ready\? Type START/);assert.match(transcript,/StArT/);assert.match(transcript,/\[1\] Find a manual\n\[2\] Use a saved manual\n\[3\] Upload a PDF/);
 const reopened=ensureTerminalSession(JSON.parse(JSON.stringify(started)),{intro:true,now:now+1});assert.equal(getTerminalPrompt(reopened).kind,'manuals');assert.equal(reopened.diagnosticChat.messages.length,started.diagnosticChat.messages.length);
});

test('skipping intro enters the same manual question without discarding the opening',()=>{
 const session=skipTerminalIntro(fresh());assert.equal(getTerminalPrompt(session).kind,'manuals');assert.ok(session.diagnosticChat.messages.some(message=>/Skipped intro/.test(message.text)));assert.ok(session.diagnosticChat.messages.some(message=>/let’s find that shit/.test(message.text)));
});

test('number, option label and natural equivalent resolve the same upload action',()=>{
 const session=send(fresh(),'start').session;
 for(const value of ['3','[3]','Upload a PDF','upload a manual','UPLOAD']){const result=send(session,value);assert.equal(result.effect.type,'upload');assert.ok(result.session.diagnosticChat.messages.some(message=>message.role==='user'&&message.text===value));}
 assert.equal(send(session,'1').effect.type,'archive');assert.equal(send(session,'saved manuals').effect.type,'saved');
});

test('upload and cancellation are real transcript events without invented manual attachment',()=>{
 let session=send(fresh(),'start').session;session=recordTerminalEvent(session,{type:'file_cancelled'});assert.equal(getTerminalPrompt(session).kind,'error');assert.match(getTerminalPrompt(session).text,/No file selected/);assert.equal(session.diagnosticChat.manuals.length,0);
 assert.equal(send(session,'retry').effect.type,'upload');session=recordTerminalEvent(session,{type:'file_selected',filename:'panel-manual.pdf'});assert.match(session.diagnosticChat.messages.map(m=>m.text).join('\n'),/Uploaded panel-manual.pdf/);assert.equal(session.diagnosticChat.manuals.length,0);
});

test('usable manual identification and confirmation happen in the conversation',()=>{
 let session=send(fresh(),'start').session;session=attachTerminalManual(session,manual());assert.equal(getTerminalPrompt(session).kind,'identity');assert.match(getTerminalPrompt(session).text,/Synthetic Fixture 1.*intruder/s);
 session=send(session,'1').session;assert.equal(session.diagnosticChat.identity.confirmedEquipment,true);assert.equal(getTerminalPrompt(session).kind,'component');
 session=send(session,'the panel').session;assert.equal(getTerminalPrompt(session).kind,'fault');assert.equal(session.diagnosticChat.phase,'fault');
});

test('identity changes are collected as typed answers and exact family variants remain required',()=>{
 let session=send(fresh(),'start').session;session=attachTerminalManual(session,manual());session=send(session,'change equipment').session;
 for(const answer of ['access','Synthetic Devices','Controller 2','controller'])session=send(session,answer).session;
 assert.equal(getTerminalPrompt(session).kind,'component');assert.equal(session.diagnosticChat.identity.model,'Controller 2');assert.deepEqual(current(session).systemTypes,['access']);
 const family=manual({contentHash:'terminal-family',identity:{manufacturer:'Synthetic',model:'Family',models:['Model 1','Model 2'],equipmentType:'panel',systemTypes:['fire'],requiresVariant:true}});
 let ambiguous=attachTerminalManual(send(fresh(),'start').session,family);ambiguous=send(ambiguous,'yes').session;assert.equal(getTerminalPrompt(ambiguous).kind,'identity_edit');assert.equal(getTerminalPrompt(ambiguous).field,'model');
});

test('external component manual is associated and the panel identity is preserved',()=>{
 let session=send(identified(),'the external power supply').session;assert.equal(getTerminalPrompt(session).kind,'component_manual');assert.equal(send(session,'1').effect.type,'upload');
 const component=manual({id:'psu',manualId:'psu',contentHash:'terminal-psu',title:'SYNTHETIC PSU',identity:{manufacturer:'Synthetic',model:'PSU 24',equipmentType:'PSU',models:['PSU 24'],systemTypes:['intruder']}});
 session=attachTerminalManual(session,component);session=send(session,'yes').session;
 assert.equal(getTerminalPrompt(session).kind,'fault');assert.equal(session.diagnosticChat.identity.model,'Fixture 1');assert.equal(session.diagnosticChat.manuals[1].equipmentRole,'the external power supply');assert.equal(session.diagnosticChat.manuals[1].confirmedIdentity.model,'PSU 24');assert.equal(current(session).context.componentSpecificationsVerified,true);
});

test('missing component manual keeps specifications and physical procedures unverified',()=>{
 let session=send(identified(),'the external power supply').session;session=send(session,"I haven't got it").session;
 assert.equal(getTerminalPrompt(session).kind,'fault');assert.equal(session.diagnosticChat.identity.observationsOnly,true);assert.equal(current(session).context.componentSpecificationsVerified,false);assert.match(getDiagnosticReport(session,{format:'text',redact:false}),/manual unavailable|Manual unavailable/i);
});

test('command words inside ordinary descriptions remain the exact fault',()=>{
 let session=send(identified(),'the panel').session;const fault='The panel says HELP and the log says start failed';session=send(session,fault).session;assert.equal(current(session).exactComplaint,fault);assert.equal(getTerminalPrompt(session).kind,'faultCondition');
});

test('HELP, MANUALS and LOG preserve the current diagnostic question',()=>{
 let session=investigating(),key=getDiagnosticPrompt(session).key;
 session=send(session,'HELP').session;assert.equal(getDiagnosticPrompt(session).key,key);assert.ok(session.diagnosticChat.messages.some(m=>m.kind==='help'));
 const log=send(session,'LOG');assert.equal(log.effect.type,'log');assert.equal(getDiagnosticPrompt(log.session).key,key);
 session=send(session,'MANUALS').session;assert.equal(getTerminalPrompt(session).kind,'manual_menu');session=send(session,'return').session;assert.equal(getDiagnosticPrompt(session).key,key);
});

test('additional manual preserves pending reading and current diagnostic step',()=>{
 let session=investigating();session=send(session,'12 volts').session;const pending=structuredClone(session.diagnosticChat.pendingReadings),key=getDiagnosticPrompt(session).key;
 session=send(session,'manuals').session;const second=manual({id:'terminal-second',manualId:'terminal-second',contentHash:'terminal-second-hash',title:'SYNTHETIC detector manual',identity:{manufacturer:'Synthetic',model:'Detector 1',equipmentType:'detector',models:['Detector 1'],systemTypes:['intruder']}});session=attachTerminalManual(session,second);session=send(session,'yes').session;
 assert.equal(getDiagnosticPrompt(session).key,key);assert.deepEqual(session.diagnosticChat.pendingReadings,pending);assert.equal(session.diagnosticChat.manuals.length,2);
});

test('ambiguous reading asks exact points and records raw evidence only after clarification',()=>{
 let session=investigating();session=send(session,'12 volts').session;assert.equal(getTerminalPrompt(session).kind,'measurement');assert.match(getTerminalPrompt(session).text,/Where|measured/);assert.equal(session.fieldVisit.events.some(e=>e.testKind==='voltage'),false);
 for(const answer of ['PSU output','PSU AUX+ to AUX-','normal load connected','connected and energised','panel display'])session=send(session,answer).session;
 const event=session.fieldVisit.events.find(e=>e.testKind==='voltage');assert.ok(event);assert.equal(event.result.rawText,'12');assert.equal(event.reference,'PSU AUX+ to AUX-');assert.match(session.diagnosticChat.messages.map(m=>m.text).join('\n'),/Saved 12 V/);
});

test('BACK corrects a reading while retaining the old entry and returns to diagnostics',()=>{
 let session=investigating();session=recordTerminalMeasurement(session,{rawText:'12.0',unit:'V',point:'PSU output',reference:'AUX+ to AUX-',operatingState:'normal',circuitState:'energised_connected',source:'panel'});const original=session.fieldVisit.events.find(e=>e.testKind==='voltage');
 session=send(session,'BACK').session;session=send(session,`event:${original.id}`).session;assert.equal(getTerminalPrompt(session).kind,'correction_value');session=send(session,'12.40 V').session;session=send(session,'I transcribed the display incorrectly.').session;
 assert.equal(getTerminalPrompt(session).kind,'detail');const correction=session.fieldVisit.events.find(e=>e.supersedes===original.id);assert.ok(correction);assert.equal(correction.result.rawText,'12.40');assert.equal(original.result.rawText,'12.0');assert.match(correction.notes,/transcribed/);
});

test('resource cancellation cannot produce advice to choose a clearer PDF',()=>{
 const session=recordTerminalEvent(send(fresh(),'start').session,{type:'error',code:'AbortError',operation:'resources',message:'Cancelled'}),prompt=getTerminalPrompt(session);
 assert.match(prompt.text,/resource download was cancelled/);assert.doesNotMatch(prompt.text,/clearer|unreadable|PDF copy/i);assert.equal(send(session,'retry').effect.type,'resources');
 for(const [type,pattern,effect]of [['resources_missing',/software is missing/,'resources'],['file_cancelled',/No file selected/,'upload'],['UNREADABLE_MANUAL',/clearer copy/,'upload'],['OCR_FAILED',/OCR failed/,'retry_import'],['STORAGE_UNAVAILABLE',/couldn’t be saved/,'retry_save']]){const prompt=errorPrompt({type});assert.match(prompt.text,pattern);assert.equal(resolveTerminalOption({...prompt,options:prompt.options.map((o,i)=>({...o,number:i+1}))},'retry')?.value,effect);}
});

test('Give up asks for a handover in the transcript and exports the complete record',()=>{
 let session=investigating();session=send(session,'GIVE UP').session;assert.equal(getTerminalPrompt(session).kind,'finish');
 for(const answer of ['inaccessible equipment','Expander room key and input wiring profile needed.','No changes introduced. Expander remains inaccessible.','Site keyholder','Site supervisor received the handover.','not applicable'])session=send(session,answer).session;
 assert.equal(session.diagnosticChat.status,'paused');assert.equal(getTerminalPrompt(session).kind,'summary');assert.ok(getTerminalPrompt(session).options.some(o=>o.value==='copy'));assert.match(getDiagnosticReport(session,{format:'text',redact:false}),/Expander room key/);
 const resumed=resumeTerminalSession(JSON.parse(JSON.stringify(session)));assert.equal(resumed.diagnosticChat.status,'open');assert.equal(getTerminalPrompt(resumed).kind,'detail');
});

test('Fault found can confirm a discriminating cause while awaiting parts and restoration',()=>{
 let session=investigating();session=recordTerminalMeasurement(session,{testKind:'observation',point:'PSU output terminal',rawText:'Detached conductor visibly outside the clamp',unit:'state',operatingState:'normal',source:'visual'});const evidence=session.fieldVisit.events.find(e=>e.testKind==='observation'&&e.result.rawText.includes('Detached'));
 session=send(session,'FAULT FOUND').session;
 const answers=['Detached conductor at PSU terminal','The conductor is visibly out of its terminal clamp.',`event:${evidence.id}`,'yes','Awaiting replacement terminal block.','yes','Not tested','none','Circuit remains impaired pending repair.','Replacement block and authorised retest window required.','Service engineer','Site manager informed','not applicable'];
 for(const answer of answers)session=send(session,answer).session;
 assert.equal(session.diagnosticChat.status,'finished');assert.equal(session.diagnosticChat.outcome.causeConfirmed,true);assert.equal(session.diagnosticChat.outcome.awaitingParts,true);assert.equal(session.diagnosticChat.outcome.retestsPassed,false);assert.equal(session.diagnosticChat.outcome.restoration.fullyRestored,false);
});

test('old 0.25 sessions migrate at their current step without replaying intro or dropping messages',()=>{
 let legacy=ensureDiagnosticChat({id:'old-job',started:now});legacy=attachDiagnosticManual(legacy,manual());legacy=confirmDiagnosticIdentity(legacy,{step:'system',systemTypes:['intruder']});legacy=confirmDiagnosticIdentity(legacy,{model:'Fixture 1',equipmentType:'panel'});
 const ids=legacy.diagnosticChat.messages.map(m=>m.id),next=ensureTerminalSession(legacy,{intro:true});assert.equal(getTerminalPrompt(next).kind,'fault');assert.equal(next.diagnosticChat.messages.some(m=>m.kind==='terminal_intro'),false);for(const id of ids)assert.ok(next.diagnosticChat.messages.some(m=>m.id===id));
});

test('repeated input IDs do not duplicate selections or completed answers',()=>{
 const initial=fresh(),once=submitTerminalInput(initial,'START',{id:'stable',now}).session,twice=submitTerminalInput(once,'START',{id:'stable',now}).session;assert.deepEqual(twice,once);
});

test('explicit danger interrupts the terminal without converting a generic power fault into an emergency',()=>{
 let session=investigating();session=send(session,'Actual fire reported in the riser').session;assert.equal(getTerminalPrompt(session).kind,'emergency');assert.equal(current(session).safety.fire,true);
 const found=send(session,'FAULT FOUND');assert.equal(found.effect.type,'conditions');assert.notEqual(found.session.diagnosticChat.status,'finished');
});


// Synthetic event fixtures exercising orchestration against an independently
// reviewed, byte-pinned source definition. They are not field test evidence.
function loopSession(condition='present'){
 let session=send(fresh(),'start').session;
 session=attachTerminalManual(session,manual({identity:{manufacturer:'Synthetic',model:'Fixture 1',models:['Fixture 1'],equipmentType:'panel',systemTypes:['fire']}}));
 session=send(session,'yes').session;session=send(session,'panel').session;session=send(session,'Loop open, all devices present').session;
 return condition===null?session:send(session,condition).session;
}
function reviewedReadingSession(){
 const source=TERMINAL_READING_SOURCES[0];let session=send(fresh(),'start').session;
 const analysis=manual({manualId:'synthetic-reviewed-psu-context',id:'synthetic-reviewed-psu-context',contentHash:source.sha256,title:'SYNTHETIC orchestration fixture for independently reviewed source',identity:{manufacturer:'Elmdene',model:'2405ST-C',models:['2405ST-C'],systemTypes:['intruder'],equipmentType:'PSU'},pages:[{page:1,text:'SYNTHETIC TEST ONLY readable terminal page.',quality:{readable:true}},{page:2,text:'SYNTHETIC TEST ONLY readable specification page.',quality:{readable:true}}]});
 session=attachTerminalManual(session,analysis);session=send(session,'yes').session;session=send(session,'this equipment').session;
 session=send(session,'Power fault').session;session=send(session,'present').session;
 const reading={id:'synthetic-performed-voltage',incidentId:session.diagnosticChat.incidentId,testKind:'voltage',method:'synthetic verified method',points:[{label:'PSU output'}],reference:'positive to negative',electricalMode:'DC',operatingState:'normal',loadState:'connected',circuitState:'energised_connected',result:{rawText:'24.1',unit:'V',source:'meter',executionState:'performed'},interpretation:{status:'recorded_only'},rawEntry:'SYNTHETIC performed reading, 24.1 V at PSU output with connected load'};
 session.fieldVisit=addTestEvent(session.fieldVisit,reading,now);return refreshTerminalPrompt(session,{now});
}

test('uncertain arrival and no idea never silently become present or No',()=>{
 for(const answer of ['unknown','not sure if active now','no idea whether it is present']){const session=send(loopSession(null),answer).session;assert.equal(current(session).currentSymptomState,'unknown');}
 for(const answer of ['no idea','no idea, meter says 12 V','I don’t know, 12 volts']){const session=send(loopSession(),answer).session;const check=session.fieldVisit.events.find(event=>event.testKind==='question_answer');assert.equal(check?.answer,'unknown',answer);if(answer.includes('12'))assert.equal(session.diagnosticChat.pendingReadings.length,1);}
 const observation=send(loopSession(),'No voltage at the output').session;assert.equal(observation.fieldVisit.events.some(event=>event.testKind==='question_answer'),false);
});

test('inaccessible reply records a blocked check and its actual reason',()=>{
 const session=send(loopSession(),"I can't access that enclosure because the riser is locked").session;
 const event=session.fieldVisit.events.find(event=>event.testKind==='question_answer');assert.equal(event.answer,'blocked');assert.match(event.blockedReason,/riser is locked/);assert.notEqual(getTerminalPrompt(session).key,'F03.Q1');
});

test('reviewed voltage asks event-scoped conditions and appends a source-backed comparison',()=>{
 let session=reviewedReadingSession();const question=getTerminalPrompt(session);assert.equal(question.kind,'reading_context');assert.match(question.text,/actual/);
 session=send(session,'LOAD1').session;assert.match(getTerminalPrompt(session).text,/mains or battery/);
 // Reload preserves this exact question; adding a manual also uses the same stage.
 const key=getTerminalPrompt(session).key;session=ensureTerminalSession(JSON.parse(JSON.stringify(session)));assert.equal(getTerminalPrompt(session).key,key);
 session=send(session,'mains').session;session=send(session,'full_load').session;session=send(session,'no').session;
 const assessment=session.fieldVisit.events.find(event=>event.testKind==='reading_assessment');assert.equal(assessment.readingAssessment.status,'compared');assert.equal(assessment.readingAssessment.comparison.inside,true);assert.equal(assessment.readingAssessment.causeConfirmed,false);assert.equal(assessment.result.source,'derived');assert.equal(assessment.sourceRefs[1].page,2);
 assert.equal(getTerminalPrompt(session).kind,'route');session=send(session,'BACK').session;assert.equal(getTerminalPrompt(session).options.some(option=>option.eventId===assessment.id),false);
});

test('unknown comparison condition leaves a recorded reading unverified without looping',()=>{
 let session=reviewedReadingSession();session=send(session,'I don’t know').session;
 assert.notEqual(getTerminalPrompt(session).kind,'reading_context');const assessment=session.fieldVisit.events.find(event=>event.testKind==='reading_assessment');assert.equal(assessment.readingAssessment.status,'unverified');assert.equal(assessment.readingAssessment.comparison,undefined);
});

test('replacement reading supersedes its comparison and never reuses scope silently',()=>{
 let session=reviewedReadingSession();for(const answer of ['LOAD1','mains','full_load','no'])session=send(session,answer).session;
 const oldAssessment=session.fieldVisit.events.find(event=>event.testKind==='reading_assessment'),original=session.fieldVisit.events.find(event=>event.id==='synthetic-performed-voltage');
 session.fieldVisit=addTestEvent(session.fieldVisit,{...original,id:'synthetic-corrected-voltage',supersedes:original.id,result:{...original.result,rawText:'12.0'}},now+1);session=refreshTerminalPrompt(session,{now:now+1});
 assert.equal(getTerminalPrompt(session).kind,'reading_context');assert.equal(session.fieldVisit.events.find(event=>event.id===oldAssessment.id).reviewRequired,true);
 for(const answer of ['LOAD1','mains','full_load','no'])session=send(session,answer).session;
 const replacement=session.fieldVisit.events.find(event=>event.supersedes===oldAssessment.id);assert.equal(replacement.readingAssessment.comparison.inside,false);assert.equal(replacement.readingAssessment.comparison.value,12);assert.equal(oldAssessment.readingAssessment.comparison.inside,true);assert.equal(session.diagnosticChat.outcome,undefined);
});

test('new I/O failure codes offer the relevant retry without mislabelling PDF quality',()=>{
 const cases=[['PDF_PASSWORD_PROTECTED','processing','upload'],['PDF_RESOURCES_FAILED','processing','resources'],['PDF_RENDER_FAILED','processing','retry_import'],['MANUAL_INDEXING_FAILED','processing','retry_import'],['OFFLINE_RESOURCES_MISSING','processing','resources'],['MANUAL_DOWNLOAD_FAILED','download','archive'],['SAVED_PDF_MISSING','saved','saved'],['AbortError','download','archive']];
 for(const [code,operation,retry]of cases){const session=recordTerminalEvent(send(fresh(),'start').session,{type:'error',code,operation,message:'Synthetic failure'});assert.equal(send(session,'retry').effect.type,retry,code);assert.doesNotMatch(getTerminalPrompt(session).text,/clearer copy/,code);}
});


test('paused component choice resumes the exact terminal step',()=>{
 let session=identified();assert.equal(getTerminalPrompt(session).kind,'component');session=send(session,'GIVE UP').session;
 for(const answer of ['missing manual','Obtain the component manual','No changes introduced','Next engineer','Site manager informed','not applicable'])session=send(session,answer).session;
 session=resumeTerminalSession(JSON.parse(JSON.stringify(session)));assert.equal(getTerminalPrompt(session).kind,'component');
});

test('repeated MANUALS returns to the original question and a further manual keeps component association',()=>{
 let session=investigating(),component=structuredClone(session.diagnosticChat.terminal.component),key=getTerminalPrompt(session).key;
 session=send(session,'manuals').session;session=send(session,'manuals').session;session=send(session,'return').session;assert.equal(getTerminalPrompt(session).key,key);
 session=send(session,'manuals').session;session=attachTerminalManual(session,manual({manualId:'synthetic-aux',id:'synthetic-aux',contentHash:'synthetic-aux-hash',identity:{manufacturer:'Synthetic',model:'Aux1',models:['Aux1'],equipmentType:'interface',systemTypes:['intruder']}}));session=send(session,'yes').session;
 assert.deepEqual(session.diagnosticChat.terminal.component,component);assert.equal(getTerminalPrompt(session).key,key);
});


test('PDF runtime classification retains recoverable job and offers original error details',()=>{
 const original=send(fresh(),'start').session;
 const session=recordTerminalEvent(original,{type:'processing_failed',code:'PDF_RUNTIME_FAILED',message:'SYNTHETIC TypeError: iterator is not a function'});
 const prompt=getTerminalPrompt(session);assert.match(prompt.text,/PDF reader hit an error/);assert.doesNotMatch(prompt.text,/clearer|unlocked|complete copy/);
 assert.equal(send(session,'Error details').effect.type,'error_details');assert.equal(send(session,'retry').effect.type,'retry_import');assert.equal(session.id,original.id);
 const version=errorPrompt({type:'processing_failed',code:'PDF_VERSION_MISMATCH'});assert.match(version.text,/reader and its worker do not match/);
 const protectedPDF=errorPrompt({type:'processing_failed',code:'PDF_PASSWORD_PROTECTED'});assert.match(protectedPDF.text,/password-protected/);
 const cancelled=errorPrompt({type:'resource_download_cancelled',code:'AbortError'});assert.match(cancelled.text,/resource download was cancelled/);assert.doesNotMatch(cancelled.text,/clearer/);
});
