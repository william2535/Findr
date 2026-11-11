import test from 'node:test';
import assert from 'node:assert/strict';
import {buildManualAnalysis} from '../public/app/manual-analysis-core.mjs';
import {ensureQuickConversation,getQuickPrompt,submitQuickQuestion,attachQuickManual,applyQuickModelReply,recordQuickEvent,resumeQuickQuestion,createQuickFaultTransfer,confirmQuickEquipment,completeQuickManualDiscovery} from '../public/app/quick-questions-engine.mjs';
import {getDiagnosticPrompt} from '../public/app/diagnostic-chat-engine.mjs';
let seq=0;
const now=1794300000000;
const record={id:'qq-synthetic-mxpro4',title:'SYNTHETIC Advanced MxPro4 user manual',brand:'Advanced',models:['MxPro4'],type:'user manual',revision:'TEST ONLY',url:'https://example.invalid/synthetic.pdf'};
const options=extra=>({id:'input-'+(++seq),now:now+seq,catalogue:[record],savedManuals:[record],...extra});
const send=(c,value,extra={})=>submitQuickQuestion(c,value,options(extra));
const source='To view the event history, choose View, then Log. Use the arrow keys to scroll through the event records. Exit returns to the previous menu.';
function manual(extra={}){return buildManualAnalysis({record:{...record,...extra.record},contentHash:extra.hash||'synthetic-qq-panel',pages:[{page:1,text:'SYNTHETIC TEST ONLY. Advanced Electronics MxPro4 fire alarm control panel User Manual. Model: MxPro4\nManufacturer: Advanced\nRevision: TEST\nThis fictitious reference is for software tests and must not be used to operate equipment.'},{page:2,text:extra.pageText||'SYNTHETIC TEST ONLY. Event history reference. '+source}],...extra.analysis});}
function initial(){return ensureQuickConversation({id:'quick-'+(++seq)},{now});}
// A pending pre-0.29 job remains resumable through its old confirmation/model path.
function ready(question='How do I view the event history on this panel?',extra={}){
 const c=initial();c.questions=[{id:'legacy-question-'+(++seq),raw:question,question,createdAt:now,status:'pending',manualSelectionRequired:true}];c.pendingQuestionId=c.questions[0].id;c.phase='select_saved_manual';
 let out=attachQuickManual(c,manual(),options(extra));return send(out.conversation,'yes',extra);
}
function answered(){const out=ready(),passage=out.effect.context.passages.find(p=>p.text.includes(source));return applyQuickModelReply(out.conversation,{text:source+` [${passage.citationId}]`,modelId:'synthetic-test-model',modelRevision:'TEST ONLY',backend:'wasm',metrics:{generationMs:1}},{requestId:out.effect.requestId,now}).conversation;}

test('generated answer accepts exact readable source and retains model/source provenance',()=>{
 const out=ready();assert.equal(out.effect.type,'generate');assert.ok(out.effect.messages.some(m=>m.content.includes('QUESTION: How do I view')));
 const p=out.effect.context.passages.find(p=>p.text.includes(source));const answered=applyQuickModelReply(out.conversation,{text:source+` [${p.citationId}]`,modelId:'TEST-local-inference',modelRevision:'TEST-1',backend:'wasm',metrics:{generationMs:11}},{requestId:out.effect.requestId,now}).conversation;
 const answer=answered.answers[0];assert.equal(answer.supported,true);assert.equal(answer.model.ran,true);assert.equal(answer.model.outputAccepted,true);assert.equal(answer.sourceRefs[0].page,2);assert.equal(answer.sourceRefs[0].contentHash,'synthetic-qq-panel');assert.equal(answer.sourceRefs[0].revision,'TEST');assert.match(answer.text,/choose View, then Log/);assert.equal(getQuickPrompt(answered).kind,'question');
});

test('invented procedure is withheld even when its words appear elsewhere in source',()=>{
 const out=ready(),answer=applyQuickModelReply(out.conversation,{text:'Press Reset then choose Event Log from the toolbar. [S1]',modelId:'TEST-local-inference'},{requestId:out.effect.requestId}).conversation.answers[0];
 assert.equal(answer.supported,false);assert.equal(answer.model.outputAccepted,false);assert.match(answer.text,/wording did not pass source checking/);assert.doesNotMatch(answer.text,/toolbar/);assert.match(answer.text,/manual extracts/i);
});

test('stale generation cannot append an answer to a changed question',()=>{
 const first=ready(),second=send(first.conversation,'What is the supply rating?');const originalCount=second.conversation.messages.length;
 const late=applyQuickModelReply(second.conversation,{text:source,modelId:'TEST'},{requestId:first.effect.requestId});assert.equal(late.conversation.messages.length,originalCount);assert.equal(late.conversation.answers.length,0);
});

test('ordinary command words stay ordinary question text; exact commands preserve current question',()=>{
 let out=send(initial(),'The log says HELP, what does start failed mean?');assert.equal(out.conversation.questions[0].raw,'The log says HELP, what does start failed mean?');const id=out.conversation.pendingQuestionId;
 out=send(out.conversation,'HELP');assert.equal(out.conversation.pendingQuestionId,id);out=send(out.conversation,'QUICK QUESTIONS');assert.equal(out.conversation.id,out.conversation.id);assert.equal(out.conversation.pendingQuestionId,id);
});

test('repeated input IDs and selected same manual do not duplicate records',()=>{
 const original=initial(),once=submitQuickQuestion(original,'What is the fault?',{id:'same'}).conversation,twice=submitQuickQuestion(once,'What is the fault?',{id:'same'}).conversation;assert.deepEqual(twice,once);
 const c=answered(),reused=attachQuickManual(c,manual()).conversation;assert.equal(reused.manuals.length,1);assert.equal(reused.equipment.length,1);
});

test('model not ready retains pending request and labels manual-only fallback honestly',()=>{
 const out=ready();let waiting=recordQuickEvent(out.conversation,{type:'model_required',code:'MODEL_NOT_READY'}).conversation;assert.equal(getQuickPrompt(waiting).kind,'model_required');assert.equal(waiting.pendingGeneration.requestId,out.effect.requestId);
 waiting=send(waiting,'manual extracts').conversation;assert.equal(waiting.answers[0].limitedFallback,true);assert.equal(waiting.answers[0].model.ran,false);assert.match(waiting.answers[0].text,/no language-model answer/);
});

test('unreadable manual and runtime error preserve earlier usable documents and exact error context',()=>{
 const c=answered(),count=c.manuals.length;let out=attachQuickManual(c,{usable:false});assert.equal(out.conversation.manuals.length,count);
 out=recordQuickEvent(c,{type:'error',code:'PDF_RUNTIME_FAILED',message:'TypeError: missing iterator',stage:'text-extraction',details:{stack:'SYNTHETIC stack'}});assert.match(getQuickPrompt(out.conversation).text,/reader hit an error/);assert.doesNotMatch(getQuickPrompt(out.conversation).text,/unlocked|complete copy/);assert.equal(out.conversation.lastError.details.stack,'SYNTHETIC stack');
});

test('manual-family identity requires installed variant and preserves uncertainty',()=>{
 const family=manual({hash:'synthetic-family',analysis:{pages:[{page:1,quality:{readable:true},text:'SYNTHETIC TEST ONLY. Model range: Fixture 1 / Fixture 2 panel. Fire alarm control panel. Manufacturer: Synthetic. The two variants have different documented menu procedures. Select the installed label before use.'}]}});
 let out=attachQuickManual(initial(),family);out=confirmQuickEquipment(out.conversation,{manufacturer:'Synthetic',model:'Fixture',equipmentType:'panel',models:['Fixture 1','Fixture 2'],requiresVariant:true});assert.equal(getQuickPrompt(out.conversation).kind,'identity_edit');assert.equal(out.conversation.equipment.length,0);
});

test('intentional transfer makes separate Fault Finder context with no invented performed tests',()=>{
 let c=answered();c=send(c,'I observed 24.1 V at the external PSU output.').conversation;
 let out=send(c,'START FAULT FINDER');assert.equal(getQuickPrompt(out.conversation).kind,'transfer_confirm');assert.equal(send(out.conversation,'yes').effect.type,'transfer');
 const job=createQuickFaultTransfer(c,{id:'SYNTHETIC-transferred-job',now});assert.notEqual(job.id,c.id);assert.equal(job.quickQuestionsContext.conversationId,c.id);assert.equal(job.diagnosticChat.manuals.length,1);assert.ok(job.fieldVisit.events.some(e=>e.testKind==='context_observation'&&e.result.executionState==='recorded'));assert.equal(job.fieldVisit.events.some(e=>e.testKind==='voltage'||e.testKind==='question_answer'),false);assert.ok(['fault','manual_unavailable'].includes(getDiagnosticPrompt(job).kind));assert.equal(c.mode,'quick-questions');
});

test('reload preserves full historical messages without repeating the opening',()=>{
 const c=answered(),reopened=ensureQuickConversation(JSON.parse(JSON.stringify(c)));assert.equal(reopened.messages.length,c.messages.length);assert.equal(reopened.id,c.id);assert.equal(reopened.answers.length,1);assert.equal(reopened.messages.filter(m=>m.bodyText==='What do you want to know?').length,1);
});

test('resource events distinguish local-model and PDF/OCR downloads, cancellations and resume',()=>{
 const prepared=ready(),questionId=prepared.conversation.pendingQuestionId;
 let c=recordQuickEvent(prepared.conversation,{type:'resource_download_started',resource:'model'}).conversation;
 assert.ok(c.messages.some(m=>/Downloading the local language model/.test(m.text)));
 c=recordQuickEvent(c,{type:'resource_download_cancelled',resource:'model'}).conversation;
 assert.equal(getQuickPrompt(c).kind,'model_error');assert.match(getQuickPrompt(c).text,/Local model processing was cancelled/);assert.equal(c.pendingQuestionId,questionId);assert.ok(c.pendingGeneration);
 let out=recordQuickEvent(c,{type:'resource_download_completed',resource:'model'});
 assert.equal(out.effect.type,'generate');assert.equal(out.conversation.pendingQuestionId,questionId);
 c=recordQuickEvent(out.conversation,{type:'resource_download_cancelled',resource:'processing'}).conversation;
 assert.match(getQuickPrompt(c).text,/PDF\/OCR resource download was cancelled/);assert.doesNotMatch(getQuickPrompt(c).text,/clearer|unlocked/);assert.equal(send(c,'retry').effect.type,'resources');
 c=recordQuickEvent(c,{type:'resource_download_completed',resource:'processing'}).conversation;
 assert.equal(send(c,'retry').effect.type,'retry_import');
});

test('saved-byte, download, extraction and indexing failures recover at their actual stage',()=>{
 const c=ready().conversation;
 for(const [code,operation,match,retry]of [
  ['SAVED_PDF_MISSING','download',/PDF bytes are not saved/,'upload'],
  ['MANUAL_DOWNLOAD_FAILED','download',/manual could not be downloaded/,'archive'],
  ['cancelled','download',/manual download was cancelled/,'archive'],
  ['MANUAL_INDEXING_FAILED','manual',/text was read, but local indexing failed/,'retry_import'],
  ['PDF_EXTRACTION_FAILED','manual',/could not extract/,'retry_import'],
  ['PDF_VERSION_MISMATCH','manual',/reader and its worker do not match/,'retry_import'],
  ['PDF_PASSWORD_PROTECTED','manual',/password-protected/,'upload']
 ]){const out=recordQuickEvent(c,{type:'error',code,operation}).conversation;assert.match(getQuickPrompt(out).text,match);assert.equal(send(out,'retry').effect.type,retry);assert.equal(out.pendingQuestionId,c.pendingQuestionId);}
});

test('model-selected known source IDs render immutable text and reject mixed or generated selectors',()=>{
 const out=ready(),p=out.effect.context.passages.find(p=>p.text.includes('choose View, then Log'));
 assert.equal(out.effect.maxNewTokens,16);
 const answered=applyQuickModelReply(out.conversation,{text:`SOURCE ${p.citationId}`,modelId:'TEST-actual-shape'},{requestId:out.effect.requestId}).conversation.answers.at(-1);
 assert.equal(answered.supported,true);assert.match(answered.text,/choose View, then Log/);assert.doesNotMatch(answered.text,/invented|Next and Previous|reset the panel/);assert.equal(answered.model.generatedProseUsed,false);assert.deepEqual(answered.model.sourceSelection,[p.id]);assert.equal(answered.answersQuestion,'not_independently_verified');
 for(const modelText of [`SOURCE ${p.citationId}: Use invented Next and Previous buttons.`, 'SOURCE S1, SOURCE S2, or NONE.']){const rejected=applyQuickModelReply(out.conversation,{text:modelText,modelId:'TEST'},{requestId:out.effect.requestId}).conversation.answers.at(-1);assert.equal(rejected.supported,false);assert.deepEqual(rejected.model.sourceSelection,[]);assert.doesNotMatch(rejected.text,/invented Next/);}
 const invalid=applyQuickModelReply(out.conversation,{text:'SOURCE S99: fabricated source',modelId:'TEST'},{requestId:out.effect.requestId}).conversation.answers.at(-1);assert.equal(invalid.supported,false);assert.deepEqual(invalid.model.sourceSelection,[]);
 const notReady=recordQuickEvent(out.conversation,{type:'error',code:'MODEL_NOT_READY',operation:'model'}).conversation;assert.equal(getQuickPrompt(notReady).kind,'model_required');assert.match(getQuickPrompt(notReady).text,/not ready on this device/);assert.doesNotMatch(getQuickPrompt(notReady).text,/hit an error/);
});

const walkQuestion='How do I do a walk test on an MxPro panel?';
const proposal={...record,saved:false,coverageLabel:'MxPro4',relevance:'This user guide is a likely source for the walk-test procedure.'};
function propose(question=walkQuestion,extra={}){
 let out=send(initial(),question,extra);
 out=completeQuickManualDiscovery(out.conversation,{requestId:out.effect.requestId,candidates:[],stage:'saved',online:true},options(extra));
 return completeQuickManualDiscovery(out.conversation,{requestId:out.effect.requestId,candidates:[proposal],stage:'archive',online:true},options(extra));
}

test('question-first begins with parsed equipment and operation, scans saved manuals before archives',()=>{
 const c=initial();assert.equal(getQuickPrompt(c).text,'What do you want to know?');
 let out=send(c,walkQuestion);const id=out.conversation.pendingQuestionId;
 assert.equal(out.effect.type,'discover_manual');assert.equal(out.effect.stage,'saved');assert.equal(out.effect.intent.equipment.model,'MxPro');assert.equal(out.effect.intent.operation.id,'walk-test');assert.equal(out.conversation.questions[0].raw,walkQuestion);assert.equal(out.conversation.equipment.length,0);
 out=recordQuickEvent(out.conversation,{type:'scan_started',stage:'saved',requestId:out.effect.requestId},options());assert.ok(out.conversation.messages.some(m=>m.text==='Scanning saved manuals…'));
 out=completeQuickManualDiscovery(out.conversation,{requestId:out.conversation.pendingDiscovery.requestId,candidates:[],stage:'saved',online:true},options());
 assert.equal(out.effect.stage,'archive');assert.equal(out.conversation.pendingQuestionId,id);assert.equal(out.conversation.questions.length,1);
});

test('archive proposal shows actual title and coverage and needs explicit download confirmation',()=>{
 const out=propose(),p=getQuickPrompt(out.conversation);assert.equal(out.effect,null);assert.equal(p.kind,'download_confirm');assert.match(p.text,/SYNTHETIC Advanced MxPro4/);assert.match(p.text,/MxPro4/);assert.match(p.text,/Download it/);assert.equal(p.manual.id,record.id);assert.equal(out.conversation.messages.at(-1).manual.id,record.id);
 for(const input of ['yes','YES','1','Download it']){const yes=send(out.conversation,input);assert.equal(yes.effect.type,'download');assert.equal(yes.effect.manualId,record.id);assert.equal(yes.conversation.questions[0].question,walkQuestion);assert.equal(yes.conversation.equipment.length,0);}
 const another=send(out.conversation,'Choose another');assert.equal(another.effect,null);assert.equal(getQuickPrompt(another.conversation).kind,'manual_choices');
 const chosen=send(another.conversation,'1');assert.equal(chosen.effect,null);assert.equal(getQuickPrompt(chosen.conversation).kind,'download_confirm');
});

test('matching saved candidate is read immediately without a download or identity gate',()=>{
 let out=send(initial(),walkQuestion);out=completeQuickManualDiscovery(out.conversation,{requestId:out.effect.requestId,candidates:[{...proposal,saved:true}],stage:'saved',online:false},options({online:false}));
 assert.equal(out.effect.type,'select_manual');assert.equal(out.effect.manualId,record.id);assert.equal(out.conversation.questions[0].raw,walkQuestion);assert.notEqual(getQuickPrompt(out.conversation).kind,'identity');assert.equal(out.conversation.equipment.length,0);
});

test('late discovery results cannot select a manual for a different question',()=>{
 const first=send(initial(),walkQuestion),second=send(first.conversation,'How do I view history on MxPro5?'),count=second.conversation.messages.length;
 const late=completeQuickManualDiscovery(second.conversation,{requestId:first.effect.requestId,candidates:[proposal],stage:'archive'},options());assert.equal(late.effect,null);assert.equal(late.conversation.messages.length,count);assert.equal(late.conversation.questions.at(-1).question,'How do I view history on MxPro5?');assert.equal(late.conversation.proposedManual,null);
});

test('ambiguous equipment asks one focused question while preserving the original task',()=>{
 let out=send(initial(),'How do I do a walk test on this panel?');const id=out.conversation.pendingQuestionId;assert.equal(getQuickPrompt(out.conversation).kind,'equipment');assert.equal(out.effect,null);
 out=send(out.conversation,'MxPro5');assert.equal(out.effect.type,'discover_manual');assert.equal(out.effect.intent.equipment.model,'MxPro5');assert.equal(out.effect.intent.operation.id,'walk-test');assert.equal(out.conversation.pendingQuestionId,id);assert.equal(out.conversation.questions.length,1);
});

test('offline missing document preserves the question and offers local upload',()=>{
 let out=send(initial(),walkQuestion,{savedManuals:[],online:false});out=completeQuickManualDiscovery(out.conversation,{requestId:out.effect.requestId,candidates:[],stage:'saved',online:false},options({online:false}));
 assert.equal(out.effect,null);assert.equal(getQuickPrompt(out.conversation).kind,'missing_evidence');assert.match(getQuickPrompt(out.conversation).text,/offline/);assert.match(getQuickPrompt(out.conversation).text,/MxPro/);assert.equal(send(out.conversation,'Upload PDF').effect.type,'upload');assert.ok(out.conversation.pendingQuestionId);
});

test('download failures and cancellation retain the proposal and retry safely',()=>{
 for(const code of ['MANUAL_DOWNLOAD_FAILED','cancelled']){
  const yes=send(propose().conversation,'yes'),id=yes.conversation.pendingQuestionId;
  let out=recordQuickEvent(yes.conversation,{type:'error',code,operation:'download'},options());assert.match(getQuickPrompt(out.conversation).text,/download/);assert.doesNotMatch(getQuickPrompt(out.conversation).text,/clearer|unlocked/);assert.equal(out.conversation.pendingQuestionId,id);
  out=send(out.conversation,'retry');assert.equal(out.effect,null);assert.equal(getQuickPrompt(out.conversation).kind,'download_confirm');out=send(out.conversation,'yes');assert.equal(out.effect.type,'download');assert.equal(out.effect.manualId,record.id);assert.equal(out.conversation.pendingQuestionId,id);
 }
});

test('reopening pending discovery uses the same request and does not replay the intro',()=>{
 const out=send(initial(),walkQuestion),id=out.effect.requestId,count=out.conversation.messages.length;
 const resumed=resumeQuickQuestion(JSON.parse(JSON.stringify(out.conversation)),options());assert.equal(resumed.effect.requestId,id);assert.equal(resumed.conversation.messages.length,count);assert.equal(resumed.conversation.messages.filter(m=>m.bodyText==='What do you want to know?').length,1);
 const confirm=propose(),restored=resumeQuickQuestion(JSON.parse(JSON.stringify(confirm.conversation)),options());assert.equal(restored.effect,null);assert.equal(getQuickPrompt(restored.conversation).kind,'download_confirm');
});

test('manual commands preserve the pending question and uploaded selections enter the transcript',()=>{
 let out=send(initial(),walkQuestion);const id=out.conversation.pendingQuestionId;
 out=send(out.conversation,'MANUALS');assert.equal(getQuickPrompt(out.conversation).kind,'manual_menu');assert.equal(send(out.conversation,'saved').effect.type,'saved');assert.equal(send(out.conversation,'upload a manual').effect.type,'upload');
 out=recordQuickEvent(out.conversation,{type:'uploaded',filename:'onsite-guide.pdf'},options());assert.equal(out.conversation.pendingQuestionId,id);assert.ok(out.conversation.messages.some(m=>m.text==='Uploaded onsite-guide.pdf'));assert.equal(out.conversation.pendingDiscovery,null);
});

test('scan and processing lines are only recorded from actual controller events',()=>{
 const out=send(initial(),walkQuestion);assert.equal(out.conversation.messages.some(m=>m.text==='Scanning saved manuals…'),false);
 const c=recordQuickEvent(out.conversation,{type:'processing_started',message:'Finding the walk-test section…',id:'processing-once'},options()).conversation;
 const again=recordQuickEvent(c,{type:'processing_started',message:'Finding the walk-test section…',id:'processing-once'},options()).conversation;assert.equal(again.messages.filter(m=>m.text==='Finding the walk-test section…').length,1);
});

// Labelled synthetic reviewed procedure: exercises orchestration and source pins,
// and is not operating guidance for real MxPro equipment.
const testHash='c'.repeat(64);
const testRecipe={id:'SYNTHETIC-QQ-reviewed-walk',operation:'walk-test',matchTerms:['walk test'],manual:{recordId:record.id,sha256:testHash,title:record.title,models:['MxPro4'],revision:'TEST ONLY'},scope:{models:['MxPro4'],familyAliases:['MxPro'],allowFamilyQuestion:true,label:'SYNTHETIC ONLY: for MxPro4 fixture scope.',refs:[{page:1,quote:'SYNTHETIC MxPro4 fixture scope.'}]},anchors:[{page:1,quote:'SYNTHETIC MxPro4 fixture scope.'}],prerequisites:[{text:'Synthetic Level 2 access applies.',refs:[{page:2,quote:'Use authorised Level 2 access.'}]}],steps:[{text:'Select the synthetic TEST menu.',refs:[{page:2,quote:'Select TEST, then ZONES.'}]},{text:'Choose the synthetic zone.',refs:[{page:2,quote:'Choose the required zone.'}]}],effects:[{text:'Finish the synthetic test.',refs:[{page:3,quote:'Select FINISHED TEST.'}]}],followUps:{menuLocation:[{text:'Synthetic menu: select TEST, then ZONES.',refs:[{page:2,quote:'Select TEST, then ZONES.'}]}],nextStep:[{text:'If at synthetic TEST, select ZONES.',refs:[{page:2,quote:'Select TEST, then ZONES.'}]}]}};
const reviewedOptions={procedures:{version:'SYNTHETIC-QQ-PACK',procedures:[testRecipe]}};
function reviewedManual(){return {manualId:record.id,title:record.title,contentHash:testHash,processorVersion:'SYNTHETIC-QQ',usable:true,identity:{manufacturer:'Advanced',model:'MxPro4',models:['MxPro4'],equipmentType:'panel',systemTypes:['fire']},pages:[{page:1,text:'SYNTHETIC MxPro4 fixture scope. A synthetic software test, never real operating instructions.',quality:{readable:true}},{page:2,text:'Use authorised Level 2 access. Select TEST, then ZONES. Choose the required zone.',quality:{readable:true}},{page:3,text:'Select FINISHED TEST. This is only a synthetic fixture for the software test.',quality:{readable:true}}]};}
function directAnswered(){const out=send(initial(),walkQuestion,reviewedOptions);return attachQuickManual(out.conversation,reviewedManual(),options(reviewedOptions)).conversation;}

test('readable reviewed manual answers the original question immediately without model setup or identity prompt',()=>{
 const c=directAnswered(),answer=c.answers[0];assert.equal(c.pendingQuestionId,null);assert.equal(c.questions.length,1);assert.equal(c.questions[0].raw,walkQuestion);assert.equal(getQuickPrompt(c).kind,'question');assert.equal(answer.coverage,'reviewed_manual_procedure');assert.equal(answer.completeProcedure,true);assert.equal(answer.packVersion,'SYNTHETIC-QQ-PACK');assert.match(answer.text,/1\. Select the synthetic/);assert.match(answer.text,/Level 2/);assert.equal(answer.sourceRefs[0].page,2);assert.equal(answer.sourceRefs[0].contentHash,testHash);assert.equal(c.messages.some(m=>m.terminalKind==='identity'||m.terminalKind==='model_required'),false);
 assert.equal(c.equipment[0].confirmed,false);assert.equal(c.equipment[0].installedModelConfirmed,false);assert.equal(c.equipment[0].confirmedAt,undefined);assert.equal(c.equipment[0].confirmationSource,'manual_scope');
});

test('same-context follow-up and repeat question reuse verified text offline',()=>{
 let c=directAnswered();for(const query of ['Where is that menu?','Explain step two','what do I press next?',walkQuestion]){
  const out=send(c,query,{...reviewedOptions,online:false,savedManuals:[]});assert.equal(out.effect,null);assert.equal(out.conversation.pendingQuestionId,null);assert.equal(out.conversation.answers.length,c.answers.length+1);assert.equal(out.conversation.manuals.length,1);assert.equal(out.conversation.answers.at(-1).sourceRefs[0].contentHash,testHash);c=out.conversation;
 }
 const page=send(c,'Show me the page');assert.equal(page.effect.type,'open_source');assert.equal(page.effect.page,2);
});

test('explicit MxPro5 question never reuses an MxPro4 answer or procedure',()=>{
 const c=directAnswered(),out=send(c,'How do I do a walk test on an MxPro5 panel?',reviewedOptions);assert.equal(out.effect.type,'discover_manual');assert.equal(out.effect.intent.equipment.model,'MxPro5');assert.equal(out.conversation.answers.length,1);assert.equal(out.conversation.pendingQuestionId,out.conversation.questions.at(-1).id);
});

test('manual coverage transfers as unconfirmed equipment context into a separate investigation',()=>{
 const c=directAnswered(),job=createQuickFaultTransfer(c,{id:'SYNTHETIC-unconfirmed-transfer',now});assert.equal(job.quickQuestionsContext.equipment[0].confirmed,false);assert.notEqual(job.diagnosticChat.identity.confirmedEquipment,true);assert.equal(job.diagnosticChat.manuals.length,1);assert.equal(c.mode,'quick-questions');assert.notEqual(c.id,job.id);
});

test('missing answer searches other documents without repeating the same candidate forever',()=>{
 let out=send(initial(),'What does battery resistance trouble mean on MxPro4?',reviewedOptions);out=attachQuickManual(out.conversation,reviewedManual(),options(reviewedOptions));
 assert.equal(out.effect.type,'discover_manual');assert.ok(out.effect.excludedManualIds.includes(record.id));assert.ok(out.conversation.pendingQuestionId);assert.equal(out.conversation.answers.length,0);
 out=completeQuickManualDiscovery(out.conversation,{requestId:out.effect.requestId,candidates:[{...proposal,saved:true}],stage:'saved',online:true},options(reviewedOptions));assert.equal(out.effect.stage,'archive');
 out=completeQuickManualDiscovery(out.conversation,{requestId:out.effect.requestId,candidates:[proposal],stage:'archive',online:true},options(reviewedOptions));assert.equal(out.effect,null);assert.equal(getQuickPrompt(out.conversation).kind,'missing_evidence');assert.match(getQuickPrompt(out.conversation).text,/do not establish/);
});

test('BACK correction retains originals, invalidates dependent follow-ups and rechecks changed model',()=>{
 let c=directAnswered();c=send(c,'Where is that menu?',reviewedOptions).conversation;const original=c.questions[0],dependent=c.answers[1];
 let out=send(c,'BACK',reviewedOptions);out=send(out.conversation,'2',reviewedOptions);out=send(out.conversation,'How do I do a walk test on MxPro5?',reviewedOptions);
 assert.equal(out.effect.type,'discover_manual');assert.equal(out.effect.intent.equipment.model,'MxPro5');assert.ok(out.conversation.questions.find(q=>q.id===original.id).supersededBy);assert.equal(out.conversation.answers.find(a=>a.id===dependent.id).superseded,true);assert.equal(out.conversation.questions[1].reviewRequired,true);assert.equal(out.conversation.corrections.length,1);assert.equal(out.conversation.answers.filter(a=>!a.superseded).length,0);
});

test('correcting to an immediately answerable question retains correction history without a null pending state',()=>{
 let out=send(directAnswered(),'BACK',reviewedOptions);out=send(out.conversation,'1',reviewedOptions);out=send(out.conversation,walkQuestion,reviewedOptions);
 assert.equal(out.effect,null);assert.equal(out.conversation.pendingQuestionId,null);assert.equal(out.conversation.corrections.length,1);assert.equal(out.conversation.answers.length,2);assert.equal(out.conversation.answers[0].superseded,true);assert.equal(out.conversation.answers[1].supported,true);
});

test('discovery cancellation and storage failures keep stage-specific recovery across reload',()=>{
 for(const code of ['cancelled','STORAGE_FAILED']){
  let out=send(initial(),walkQuestion);const requestId=out.effect.requestId;
  out=recordQuickEvent(out.conversation,{type:'error',operation:'discovery',code},options());const prompt=getQuickPrompt(out.conversation);assert.doesNotMatch(prompt.text,/PDF reader|Manual processing|unlocked/);
  const restored=resumeQuickQuestion(JSON.parse(JSON.stringify(out.conversation)),options());assert.equal(restored.effect,null);assert.equal(getQuickPrompt(restored.conversation).text,prompt.text);
  out=send(restored.conversation,'retry');assert.equal(out.effect.type,'discover_manual');assert.equal(out.effect.requestId,requestId);
 }
});

test('scope-dependent procedures ask only their required clarification and preserve the original question',()=>{
 const procedures=[{...testRecipe,scope:{...testRecipe.scope,allowFamilyQuestion:false}}],opts={procedures};
 let out=send(initial(),walkQuestion,opts);const id=out.conversation.pendingQuestionId;out=attachQuickManual(out.conversation,reviewedManual(),options(opts));assert.equal(getQuickPrompt(out.conversation).kind,'answer_scope');assert.equal(out.effect,null);
 out=send(out.conversation,'1',opts);assert.equal(out.effect,null);assert.equal(out.conversation.answers[0].questionId,id);assert.equal(out.conversation.questions.length,1);assert.equal(out.conversation.answers[0].supported,true);
});

test('legacy identity correction fields remain usable without discarding the manual or original question',()=>{
 const question='What is this panel model?',c=initial();c.questions=[{id:'legacy-edit',raw:question,question,status:'pending',manualSelectionRequired:true}];c.pendingQuestionId='legacy-edit';c.phase='select_saved_manual';
 let out=attachQuickManual(c,manual());out=send(out.conversation,'Change equipment');assert.equal(getQuickPrompt(out.conversation).field,'manufacturer');
 for(const value of ['Advanced','MxPro4','panel','Fire alarm'])out=send(out.conversation,value);
 assert.equal(out.conversation.equipment[0].confirmed,true);assert.equal(out.conversation.equipment[0].confirmationSource,'engineer');assert.equal(out.conversation.manuals.length,1);assert.equal(out.conversation.questions[0].raw,question);assert.equal(out.effect.type,'generate');
});

test('an unrelated uploaded or previously attached manual cannot silently change the requested model',()=>{
 for(const c of [initial(),directAnswered()]){
  let out=send(c,'How do I do a walk test on MxPro5?',reviewedOptions);out=attachQuickManual(out.conversation,reviewedManual(),options(reviewedOptions));
  assert.equal(out.effect.type,'discover_manual');assert.equal(out.effect.intent.equipment.model,'MxPro5');assert.ok(out.effect.excludedManualIds.includes(record.id));assert.notEqual(getQuickPrompt(out.conversation).kind,'identity');assert.equal(out.conversation.answers.length,c.answers.length);assert.ok(out.conversation.messages.some(m=>m.kind==='manual_scope_mismatch'));
 }
});

test('legacy two-product compatibility preserves separate manuals and configuration uncertainty',()=>{
 const c=initial(),question='Will this camera work with this recorder?';c.questions=[{id:'legacy-two-products',raw:question,question,status:'pending',manualSelectionRequired:true}];c.pendingQuestionId='legacy-two-products';c.phase='select_saved_manual';let out={conversation:c};
 for(const [model,equipmentType,hash]of [['QA-CAM-200','camera','synthetic-two-camera'],['QA-NVR-300','recorder','synthetic-two-recorder']]){
  const doc={manualId:hash,contentHash:hash,processorVersion:'synthetic-two-1',title:'SYNTHETIC '+model,usable:true,identity:{manufacturer:'Test Bench',model,models:[model],equipmentType,systemTypes:['cctv'],revision:'TEST'},pages:[{page:1,quality:{readable:true},text:`SYNTHETIC TEST ONLY. This ${equipmentType} supports ONVIF for the declared configuration. ${model} needs confirmed firmware and supported codec configuration. Compatibility with another product is not established by this fixture.`}]};
  out=attachQuickManual(out.conversation,doc);out=send(out.conversation,'yes',{catalogue:[],savedManuals:[]});
 }
 assert.equal(getQuickPrompt(out.conversation).kind,'variant');out=send(out.conversation,'unknown');assert.equal(getQuickPrompt(out.conversation).kind,'variant');out=send(out.conversation,'unknown');assert.equal(out.effect.type,'generate');assert.equal(new Set(out.effect.context.passages.map(p=>p.contentHash)).size,2);
 const answer=applyQuickModelReply(out.conversation,{text:'This camera supports ONVIF for the declared configuration. [S1]',modelId:'synthetic-local-model'},{requestId:out.effect.requestId}).conversation;assert.match(answer.answers.at(-1).text,/do not establish compatibility/);assert.equal(answer.questions.at(-1).status,'evidence_incomplete');
});

test('a generic how-to answers from the attached readable manual instead of offering endless downloads',()=>{
 const q='How do I view the event history on MxPro4?';
 let out=send(initial(),q,{online:false});out=attachQuickManual(out.conversation,manual({hash:'SYNTHETIC-generic-answer'}),options({online:false}));
 assert.equal(out.effect,null);assert.equal(out.conversation.pendingQuestionId,null);assert.equal(out.conversation.answers.length,1);assert.match(out.conversation.answers[0].text,/choose View, then Log/);assert.equal(out.conversation.answers[0].completeProcedure,false);assert.equal(out.conversation.answers[0].coverage,'verbatim_manual_extract');assert.equal(out.conversation.answers[0].sourceRefs[0].page,2);assert.deepEqual(out.conversation.questions[0].triedManualIds,[]);
 const repeat=send(out.conversation,q,{online:false});assert.equal(repeat.effect,null);assert.equal(repeat.conversation.answers.length,2);assert.equal(repeat.conversation.manuals.length,1);
 const follow=send(repeat.conversation,'Explain step one',{online:false});assert.equal(follow.effect,null);assert.match(follow.conversation.answers.at(-1).text,/choose View, then Log/);assert.equal(follow.conversation.answers.length,3);
});

test('installed local model runs on question-first evidence without discarding the correct manual',()=>{
 let out=send(initial(),'How do I view the event history on MxPro4?',{modelReady:true});out=attachQuickManual(out.conversation,manual({hash:'SYNTHETIC-model-generic'}),options({modelReady:true}));
 assert.equal(out.effect.type,'generate');assert.ok(out.effect.context.passages.every(p=>/event history/i.test(p.text)));assert.deepEqual(out.conversation.questions[0].triedManualIds,[]);
 const answer=applyQuickModelReply(out.conversation,{text:'SOURCE S1',modelId:'SYNTHETIC-local-model'},{requestId:out.effect.requestId});assert.equal(answer.effect,null);assert.equal(answer.conversation.pendingQuestionId,null);assert.equal(answer.conversation.answers[0].model.ran,true);assert.equal(answer.conversation.answers[0].answersQuestion,'not_independently_verified');assert.match(answer.conversation.answers[0].text,/choose View, then Log/);
 const none=applyQuickModelReply(out.conversation,{text:'NONE',modelId:'SYNTHETIC-local-model'},{requestId:out.effect.requestId});assert.equal(none.effect,null);assert.equal(none.conversation.pendingQuestionId,null);assert.equal(none.conversation.answers[0].model.outputAccepted,false);assert.match(none.conversation.answers[0].text,/manual extracts/i);assert.equal(none.conversation.manuals.length,1);
});

test('an older pending loop rechecks already attached text once without losing history or redownloading',()=>{
 const c=directAnswered();c.version='2026-11-10.3';const q=c.questions[0];delete q.answerSearchVersion;q.status='waiting_for_manual';q.triedManualIds=[record.id,'SYNTHETIC-unusable-other'];c.pendingQuestionId=q.id;c.phase='download_confirm';c.proposedManual={id:'SYNTHETIC-next-download'};c.answers=[];const history=structuredClone(c.messages);
 const out=resumeQuickQuestion(JSON.parse(JSON.stringify(c)),options(reviewedOptions));assert.equal(out.effect,null);assert.equal(out.conversation.pendingQuestionId,null);assert.equal(out.conversation.answers.length,1);assert.deepEqual(out.conversation.questions[0].triedManualIds,['SYNTHETIC-unusable-other']);assert.deepEqual(out.conversation.messages.slice(0,history.length),history);assert.equal(out.conversation.proposedManual,null);
 const again=resumeQuickQuestion(JSON.parse(JSON.stringify(out.conversation)),options(reviewedOptions));assert.equal(again.effect,null);assert.equal(again.conversation.answers.length,1);assert.equal(again.conversation.messages.length,out.conversation.messages.length);
});

test('unknown or unsupported required variants keep a recoverable pending question without an affirmative loop',()=>{
 const recipe=structuredClone(testRecipe);recipe.scope.requiredVariant=['EN fixture firmware 4.53 or later'];const opts={procedures:[recipe]};
 for(const reply of ['unknown',"I don't know",'BS variant']){
  let out=send(initial(),walkQuestion,opts);out=attachQuickManual(out.conversation,reviewedManual(),options(opts));assert.equal(getQuickPrompt(out.conversation).kind,'answer_scope');out=send(out.conversation,reply,opts);
  assert.equal(out.effect,null);assert.equal(getQuickPrompt(out.conversation).kind,'missing_evidence');assert.match(getQuickPrompt(out.conversation).text,/Check the installed variant/);assert.ok(out.conversation.pendingQuestionId);assert.equal(out.conversation.answers.length,0);
  const resumed=resumeQuickQuestion(out.conversation,options(opts));assert.equal(resumed.effect,null);assert.equal(getQuickPrompt(resumed.conversation).kind,'missing_evidence');assert.equal(resumed.conversation.messages.length,out.conversation.messages.length);assert.equal(send(resumed.conversation,'Upload PDF',opts).effect.type,'upload');
 }
});


test('a fully stated single variant accepts confirmation or its source-approved shorthand',()=>{
 const recipe=structuredClone(testRecipe);recipe.scope.requiredVariant=['EN fixture firmware 4.53 or later'];recipe.scope.variantAliases={'EN fixture firmware 4.53 or later':['EN fixture 4.53']};const opts={procedures:[recipe]};
 for(const reply of ['yes','correct','EN fixture 4.53']){let out=send(initial(),walkQuestion,opts);out=attachQuickManual(out.conversation,reviewedManual(),options(opts));out=send(out.conversation,reply,opts);assert.equal(out.effect,null);assert.equal(out.conversation.pendingQuestionId,null);assert.equal(out.conversation.answers.length,1);assert.equal(out.conversation.equipment[0].variant,'EN fixture firmware 4.53 or later');}
});


test('explicitly reopening a now-applicable manual clears only that stale exclusion and resumes the original question',()=>{
 const c=directAnswered();const q=c.questions[0];c.pendingQuestionId=q.id;q.status='waiting_for_manual';q.triedManualIds=[record.id,'SYNTHETIC-keep-excluded'];c.answers=[];c.phase='missing_evidence';
 const out=attachQuickManual(c,reviewedManual(),options(reviewedOptions));assert.equal(out.effect,null);assert.equal(out.conversation.answers.length,1);assert.equal(out.conversation.pendingQuestionId,null);assert.deepEqual(out.conversation.questions[0].triedManualIds,['SYNTHETIC-keep-excluded']);
});


test('old saved analysis restores model identity from readable pages without changing historical source version',()=>{
 const old=manual({hash:'SYNTHETIC-old-identity-cache'});old.processorVersion='2026-11-10.2';old.identity={...old.identity,manufacturer:'Advanced',model:null,models:[]};
 let out=send(initial(),'How do I view event history on MxPro4?',{online:false});out=attachQuickManual(out.conversation,old,options({online:false}));assert.equal(out.effect,null);assert.equal(out.conversation.answers.length,1);assert.equal(out.conversation.answers[0].sourceRefs[0].processorVersion,'2026-11-10.2');assert.equal(out.conversation.answers[0].sourceRefs[0].contentHash,old.contentHash);assert.deepEqual(old.identity.models,[]);
});
