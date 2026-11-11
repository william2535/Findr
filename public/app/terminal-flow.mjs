import * as diagnostic from './diagnostic-chat-engine.mjs';
import {compareTerminalReading} from './terminal-reading-evidence.mjs';
import {addTestEvent,sanitizeFieldVisitForStorage} from './field-model.mjs';

// The terminal is an interaction layer, not a second diagnostic engine. Every
// check, reading, correction and outcome delegates to the existing evidence rules.
export const TERMINAL_FLOW_VERSION='2026-11-10.2';
const list=value=>Array.isArray(value)?value:[];
const text=value=>value==null?'':String(value);
const clone=value=>structuredClone(value);
const uid=()=>globalThis.crypto?.randomUUID?.()||`terminal-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const at=options=>Number.isFinite(options?.now)?options.now:Date.now();
const normal=value=>text(value).normalize('NFKC').trim().toLowerCase().replace(/[’‘]/g,"'").replace(/[.!?]+$/,'').replace(/\s+/g,' ');
const safe=value=>sanitizeFieldVisitForStorage(value);
const systemNames={fire:'fire alarm',access:'access control',intruder:'intruder',cctv:'CCTV',several:'combined systems',unknown:'unconfirmed system'};
const terminal=session=>session.diagnosticChat.terminal;
const incident=session=>session.fieldVisit.incidents.find(item=>item.id===session.diagnosticChat.incidentId);
const activeEvents=session=>list(session.fieldVisit.events).filter(event=>!session.fieldVisit.events.some(later=>later.supersedes===event.id)&&event.incidentId===session.diagnosticChat.incidentId);
const opt=(value,label,aliases=[],extra={})=>({value,label,aliases,...extra});
const numbered=options=>options.map((item,index)=>({...item,number:index+1}));
const COMMANDS=new Map([['start','start'],['help','help'],['manuals','manuals'],['log','log'],['back','back'],['give up','give_up'],['fault found','found']]);
const manualOptions=()=>[opt('archive','Find a manual',['find manual','find a manual','search manuals','manual archives','search archive']),opt('saved','Use a saved manual',['saved','saved manuals','use saved manual','use a saved manual']),opt('upload','Upload a PDF',['upload','upload pdf','upload a pdf','upload a manual','upload manual'])];
const componentOptions=()=>[opt('upload','Upload PDF',['upload','upload pdf','upload a pdf','upload a manual','upload manual']),opt('saved','Saved manuals',['saved','use saved manual','use a saved manual']),opt('archive','Find manual',['find a manual','find manual','search manuals','manual archives']),opt('manual_unavailable',"I haven’t got it",["i haven't got it","i don't have it","no manual","unavailable","i haven't got the manual"] )];

function append(session,role,message,details={},options={}){
 const id=options.messageId||uid();if(session.diagnosticChat.messages.some(item=>item.id===id))return;
 session.diagnosticChat.messages.push({id,role,text:text(safe(message)),createdAt:at(options),kind:'terminal',...safe(details)});
 session.diagnosticChat.updatedAt=at(options);
}
function engineCall(session,operation,{keepUser=false}={}){
 const count=session.diagnosticChat.messages.length,next=operation(session);
 next.diagnosticChat.messages=[...next.diagnosticChat.messages.slice(0,count),...next.diagnosticChat.messages.slice(count).filter(message=>!message.promptKey&&(keepUser||message.role!=='user'))];
 return assessNewReadings(next);
}
function promptText(prompt){return [prompt.text,...prompt.options.map(item=>`[${item.number}] ${item.label}`)].filter(Boolean).join('\n');}
function finishMutation(session,options={},force=false){
 const prompt=getTerminalPrompt(session),flow=terminal(session),signature=JSON.stringify([prompt.key,prompt.text,prompt.options.map(item=>[item.value,item.label])]);
 if(force||signature!==flow.lastPromptSignature){
  append(session,'assistant',promptText(prompt),{kind:'terminal_prompt',terminalPromptKey:prompt.key,terminalKind:prompt.kind,bodyText:prompt.text,options:prompt.options.map(({aliases,...item})=>item),sourceRefs:prompt.sourceRefs||[],explanation:prompt.explanation||'',ruleRevision:prompt.enginePrompt?.ruleRevision||TERMINAL_FLOW_VERSION},options);
  flow.lastPromptSignature=signature;
 }
 return session;
}
function capture(session,raw,options){
 const flow=terminal(session);if(options?.id&&flow.handledInputIds.includes(options.id))return false;
 if(options?.id)flow.handledInputIds.push(options.id);
 append(session,'user',raw,{kind:'terminal_input'},options);flow.notice=null;return true;
}
function effect(type,extra={}){return {type,...extra};}
function currentIdentity(session){const chat=session.diagnosticChat;return chat.additionalManualConfirmation?.identity||chat.identity||{};}
function hasUsableManual(session){return session.diagnosticChat.manuals.some(manual=>manual.usable&&manual.contentHash);}


function comparisonEquipment(session){
 const flow=terminal(session),componentManual=session.diagnosticChat.manuals.find(manual=>manual.manualId===flow.component?.manualId);
 return componentManual?.confirmedIdentity?{...componentManual.confirmedIdentity,confirmedEquipment:!!componentManual.confirmedIdentity.confirmedAt}:session.diagnosticChat.identity;
}
function saveReadingAssessment(session,item,options={}){
 const result=item.result,id=item.assessmentId||uid(),reading=session.fieldVisit.events.find(event=>event.id===item.eventId),previous=reading?.supersedes?activeEvents(session).find(event=>event.testKind==='reading_assessment'&&event.readingAssessment?.readingEventId===reading.supersedes):null;
 session.fieldVisit=addTestEvent(session.fieldVisit,{id,incidentId:session.diagnosticChat.incidentId,testKind:'reading_assessment',...(previous?{supersedes:previous.id}:{}),method:'reviewed_manual_comparison',eventTime:at(options),result:{rawText:result.summary,source:'derived',executionState:'interpreted'},sourceRefs:result.sourceRefs||[],readingAssessment:{readingEventId:item.eventId,context:clone(item.context),...clone(result)},interpretation:{status:result.status,reason:'Comparison of the recorded reading only; this does not complete a test or confirm a cause.'}},at(options));
 append(session,'assistant',result.summary,{kind:'reading_assessment',eventIds:[id],sourceRefs:result.sourceRefs||[],comparison:result.comparison,ruleRevision:result.ruleVersion},options);
}
function assessNewReadings(session,options={}){
 const flow=session.diagnosticChat?.terminal;if(!flow)return session;
 flow.processedReadingIds||=[];flow.readingQueue||=[];
 for(const reading of activeEvents(session).filter(event=>!flow.processedReadingIds.includes(event.id))){
  flow.processedReadingIds.push(reading.id);
  if(!['voltage','voltage_drop','dc_voltage','measurement'].includes(reading.testKind))continue;
  if(reading.supersedes){for(const prior of session.fieldVisit.events.filter(event=>event.testKind==='reading_assessment'&&event.readingAssessment?.readingEventId===reading.supersedes)){prior.reviewRequired=true;prior.correctionEventId=reading.id;prior.interpretation={...prior.interpretation,status:'review_required',reason:'The underlying reading was corrected. This historical comparison is no longer a current finding.'};}
   flow.readingQueue=flow.readingQueue.filter(item=>item.eventId!==reading.supersedes);if(flow.readingAssessment?.eventId===reading.supersedes){flow.readingAssessment=null;flow.stage=flow.readingReturnStage||'engine';flow.readingReturnStage=null;}
  }
  const assessment=compareTerminalReading({reading,manuals:session.diagnosticChat.manuals,equipment:comparisonEquipment(session),context:{}});
  if(assessment.status==='not_applicable')continue;
  const item={eventId:reading.id,context:{},result:assessment,assessmentId:uid()};
  if(assessment.status==='needs_context')flow.readingQueue.push(item);else saveReadingAssessment(session,item,options);
 }
 if(flow.readingQueue.length&&!flow.readingAssessment){flow.readingAssessment=flow.readingQueue.shift();flow.readingReturnStage=flow.stage;flow.stage='reading_context';}
 return session;
}
function answerReadingContext(session,raw,choice,options){
 const flow=terminal(session),item=flow.readingAssessment,descriptor=item?.result?.missing?.[0];if(!item||!descriptor){flow.stage=flow.readingReturnStage||'engine';return finishMutation(session,options);}
 if(!choice){append(session,'assistant','Choose the recorded condition, or I don’t know. I won’t infer it from the voltage.',{kind:'clarification'},options);return finishMutation(session,options,true);}
 item.context[descriptor.key]=choice.value;
 const reading=session.fieldVisit.events.find(event=>event.id===item.eventId);
 item.result=compareTerminalReading({reading,manuals:session.diagnosticChat.manuals,equipment:comparisonEquipment(session),context:item.context});
 if(item.result.status!=='needs_context'){
  saveReadingAssessment(session,item,options);flow.readingAssessment=null;flow.stage=flow.readingReturnStage||'engine';flow.readingReturnStage=null;
  if(flow.readingQueue.length){flow.readingAssessment=flow.readingQueue.shift();flow.readingReturnStage=flow.stage;flow.stage='reading_context';}
 }
 return finishMutation(session,options);
}

/** Existing visits migrate without replacing transcript/evidence or replaying intro. */
export function ensureTerminalSession(session={},options={}){
 const hadChat=!!session.diagnosticChat,hadVisit=!!session.fieldVisit||!!session.investigation||!!session.message||!!session.notes;
 const next=diagnostic.ensureDiagnosticChat(session,options),chat=next.diagnosticChat;
 if(!chat.terminal){
  const fresh=options.intro===true&&!hadChat&&!hadVisit;
  chat.terminal={schemaVersion:1,version:TERMINAL_FLOW_VERSION,stage:fresh?'intro':'engine',started:!fresh,handledInputIds:[],lastPromptSignature:'',component:null,returnStage:null,identityDraft:null,finish:null,notice:null,processedReadingIds:list(next.fieldVisit.events).map(event=>event.id),readingQueue:[]};
  if(fresh){chat.messages=[];append(next,'assistant',"let’s find that shit.",{kind:'terminal_intro',bodyText:'let’s find that shit.'},options);}
  else if(chat.phase==='manual')chat.terminal.stage='manuals';
  else if(['system','equipment'].includes(chat.phase)||chat.additionalManualConfirmation)chat.terminal.stage='identity';
 }
 const flow=chat.terminal;flow.handledInputIds=list(flow.handledInputIds);
 return finishMutation(next,options);
}

export function skipTerminalIntro(session,options={}){
 let next=ensureTerminalSession(session,options);if(terminal(next).stage!=='intro')return next;
 append(next,'user','Skipped intro.',{kind:'terminal_action'},options);terminal(next).started=true;terminal(next).stage='manuals';return finishMutation(next,options);
}

function identityPrompt(session){
 const identity=currentIdentity(session),flow=terminal(session),name=[identity.manufacturer,identity.model||list(identity.models).join(' / ')].filter(Boolean).join(' ')||'equipment I can’t identify confidently';
 const systems=list(identity.systemTypes).map(system=>systemNames[system]||system).join(' / ')||'an unconfirmed system';
 return {kind:'identity',key:`identity:${session.diagnosticChat.additionalManualConfirmation?.manualId||'main'}`,text:`This looks like a ${name} manual for ${systems}.\nHave I got that right?`,options:[opt('identity_yes','Yes',['yes','yes correct','correct','that is right',"that's right"]),opt('identity_change','Change equipment',['no','change equipment','change','wrong','incorrect'])],helper:'identity',identity,explanation:'Check the installed label, document revision and applicable model. A family name is not an exact variant.'};
}
const identityFields=['system','manufacturer','model','equipmentType','variant'];
function identityEditPrompt(session){
 const flow=terminal(session),draft=flow.identityDraft||{},field=flow.identityField||'system',identity=currentIdentity(session);
 const definitions={system:{text:'What type of system is it?',options:Object.entries(systemNames).filter(([key])=>key!=='unknown').map(([value,label])=>opt(value,label,[label]))},manufacturer:{text:'Who made it? Type the manufacturer, or UNKNOWN.',options:[]},model:{text:'What exact model is on the installed label? If you can’t establish it, type UNKNOWN.',options:list(identity.models).map(model=>opt(model,model))},equipmentType:{text:'What kind of equipment is it?',options:['panel','PSU','detector','keypad','camera','recorder','controller','reader','lock','interface','other'].map(value=>opt(value,value))},variant:{text:'Which installed variant or configuration does this manual apply to? Type UNKNOWN if it cannot be established.',options:list(identity.variants).map(value=>opt(value,value))}};
 return {kind:'identity_edit',key:`identity-edit:${field}`,field,identity:draft,...definitions[field]};
}
function eventOptions(session,filter=()=>true){return activeEvents(session).filter(event=>!['reading_assessment','manual_requirement','prerequisite_record'].includes(event.testKind)).filter(filter).slice(-20).reverse().map(event=>opt(`event:${event.id}`,`${event.points?.[0]?.location||event.points?.[0]?.label||event.testKind}: ${event.result?.rawText||event.answer||'recorded'}`,[],{eventId:event.id}));}
function finishPrompt(session){
 const flow=terminal(session),draft=flow.finish,field=draft.field;
 const choices={reason:[opt('inaccessible_equipment','Equipment inaccessible',["i can't access it","can't access","inaccessible","no access"]),opt('missing_manual','Missing manual',['no manual']),opt('missing_test_equipment','Missing test equipment',['no meter','no test equipment']),opt('fault_absent','Fault absent',['cleared','not present']),opt('specialist_assistance','Specialist assistance',['specialist']),opt('other','Something else',['other'])],evidence:[...eventOptions(session,event=>!['question_answer','prerequisite_record','calculation'].includes(event.testKind)),opt('none','No discriminating test yet',['none','unknown','not yet'])],confirmed:[opt('yes','Yes — the linked evidence confirms this cause',['yes','confirmed']),opt('no','No — keep it unconfirmed',['no','unknown','not sure'])],awaitingParts:[opt('yes','Yes — awaiting parts or repair',['yes','awaiting parts']),opt('no','No',['no'])],retest:[...eventOptions(session,event=>event.verification?.passed===true),opt('none','No completed, passed functional retest',['none','not tested','not yet','unknown'])],monitoring:[opt('not_applicable','Not applicable',['not applicable','n/a']),opt('not_confirmed','Not confirmed',['unknown','not confirmed'])]};
 const questions={reason:'What prevented you going further?',nextAction:'What does the next engineer need — access, equipment, manuals or the next check?',cause:'What caused the fault?',confirmation:'What observation or test distinguished and confirmed that cause?',evidence:'Which recorded test supports that finding?',confirmed:'Does that linked evidence establish the cause, beyond a reset or temporary recovery?',action:'What did you do? Include repairs, changes or parts still needed.',awaitingParts:'Are parts or repair still outstanding?',retests:'Which functional retests did you actually complete? “Not tested” is a valid answer.',retest:'Link the recorded functional retest, if there is one.',systemLeft:'What state are you leaving the system in? Include any disablements, test modes or disconnected circuits still outstanding.',owner:'Who will pick up the outstanding work? Use a role or job reference, or UNKNOWN.',siteAcknowledgement:'Who received the site handover? If it is not confirmed, say so.',monitoring:'What is the monitoring / ARC acknowledgement, or is monitoring not applicable?'};
 const existing=text(draft.values[field]).trim(),reuse=existing&&!['evidence','confirmed','awaitingParts','retest','monitoring'].includes(field);
 return {kind:'finish',key:`finish:${draft.outcome}:${field}`,field,text:questions[field]+(reuse?`\nAlready recorded: ${existing}`:''),options:[...(choices[field]||[]),...(reuse?[opt('use_recorded','Keep the recorded answer',['keep','keep recorded','as recorded'])]:[])],helper:['evidence','retest'].includes(field)?'evidence-selection':undefined,explanation:['systemLeft','monitoring'].includes(field)?'A cause can be confirmed while repairs or restoration remain outstanding. Existing individual restoration records are checked separately.':''};
}

export function getTerminalPrompt(session){
 if(!session?.diagnosticChat?.terminal)return getTerminalPrompt(ensureTerminalSession(session));
 const flow=terminal(session),enginePrompt=diagnostic.getDiagnosticPrompt(session),base={options:[],sourceRefs:enginePrompt.sourceRefs||[],explanation:'',enginePrompt};let prompt;
 if(enginePrompt.kind==='emergency'&&flow.stage!=='finish')prompt={...base,...enginePrompt,options:[],explanation:enginePrompt.why,helper:'conditions'};
 else if(flow.notice)prompt={...base,...flow.notice};
 else if(flow.languageProposal)prompt={...base,kind:'language_confirmation',key:'language:'+flow.languageProposal.requestId,text:`I read that as “${flow.languageProposal.answer}” for: ${flow.languageProposal.promptText}\nHave I understood you? Nothing is marked complete until you confirm.`,options:[opt('language_accept','Use that answer',['yes','correct','use that answer']),opt('language_reject','Let me clarify',['no','wrong','let me clarify'])]};
 else if(flow.stage==='intro')prompt={...base,kind:'intro',key:'terminal-intro-ready',text:'Ready? Type START.',options:[opt('start','start',['start'])]};
 else if(flow.stage==='manuals')prompt={...base,kind:'manuals',key:'terminal-manuals',text:flow.started?'So, pick your panel.':'Pick the manual for this job.',options:manualOptions(),helper:'manuals',explanation:'A usable manual is compulsory before diagnostic checks. Choose a saved PDF, find one online, or upload your own.'};
 else if(flow.stage==='manual_menu')prompt={...base,kind:'manual_menu',key:'terminal-manual-menu',text:`Manuals attached to this job:\n${session.diagnosticChat.manuals.map((manual,index)=>`${index+1}. ${manual.title} — ${manual.equipmentRole||'equipment under investigation'}`).join('\n')||'None yet.'}\nAdd another, or return to the current question.`,options:[...componentOptions().slice(0,3),opt('return','Return to conversation',['back','return','continue'])],helper:'manuals'};
 else if(flow.stage==='identity')prompt={...base,...identityPrompt(session)};
 else if(flow.stage==='identity_edit')prompt={...base,...identityEditPrompt(session)};
 else if(flow.stage==='component')prompt={...base,kind:'component',key:'terminal-component',text:'Which part are we investigating?',options:[opt('same_equipment','This panel / equipment',['the panel','panel','this panel','the same equipment','same equipment','this equipment']),opt('external_psu','The external power supply',['external power supply','the external power supply','external psu','the psu'])]};
 else if(flow.stage==='component_manual')prompt={...base,kind:'component_manual',key:'terminal-component-manual',text:`Have you got the manual for ${flow.component?.description||'that component'}? Add it here so I can check its specifications.`,options:componentOptions(),helper:'manuals',explanation:'The panel manual does not automatically establish another component’s terminals, ratings or test procedure.'};
 else if(flow.stage==='correction_choice')prompt={...base,kind:'correction_choice',key:'terminal-correction-choice',text:'Which earlier record needs correcting? The original will stay in the log.',options:[...eventOptions(session),opt('return','Keep the existing records',['cancel','return'])],helper:'correction'};
 else if(flow.stage==='correction_value'){const event=session.fieldVisit.events.find(item=>item.id===flow.correction?.eventId);prompt={...base,kind:'correction_value',key:`terminal-correction:${event?.id}`,text:event?.testKind==='question_answer'?'What should that answer be?':`What is the corrected result for ${event?.points?.[0]?.location||event?.points?.[0]?.label||event?.testKind||'that record'}? Include changed units or conditions.`,options:event?.testKind==='question_answer'?[opt('yes','Yes'),opt('no','No'),opt('unknown','I don’t know',["i don't know"]),opt('blocked','Can’t access / test',["i can't access that","can't test","inaccessible"])]:[],event};}
 else if(flow.stage==='correction_reason')prompt={...base,kind:'correction_reason',key:'terminal-correction-reason',text:'What changed, or why was the earlier entry wrong?',options:[]};
 else if(flow.stage==='reading_context'){const item=flow.readingAssessment,question=item?.result?.missing?.[0];prompt={...base,kind:'reading_context',key:`reading-context:${item?.eventId}:${question?.key}`,text:question?.question||'Keep the reading context unverified.',options:list(question?.options).map(item=>opt(item.value,item.label,[item.value,item.label])),sourceRefs:item?.result?.sourceRefs||[],explanation:'This comparison applies only to this recorded test point and operating condition. It cannot establish a cause or authorise a test.'};}
 else if(flow.stage==='blocked_reason')prompt={...base,kind:'blocked_reason',key:'terminal-blocked-reason',text:'What prevents this check — access, equipment, authority or something else?',options:[]};
 else if(flow.stage==='finish')prompt={...base,...finishPrompt(session)};
 else if(['paused','finished'].includes(session.diagnosticChat.status))prompt={...base,kind:'summary',key:`terminal-summary:${session.diagnosticChat.outcome?.recordedAt||session.diagnosticChat.status}`,text:diagnostic.getDiagnosticReport(session,{format:'short',redact:false}),options:[opt('copy','Copy handover',['copy handover','copy']),opt('log','View full log',['view full log','log']),opt('export','Export',['export']),opt('resume','Resume this visit',['resume','continue'])]};
 else if(enginePrompt.kind==='manual')prompt={...base,kind:'manuals',key:'terminal-manuals-required',text:'I need a readable manual before diagnostic checks. How do you want to add it?',options:manualOptions(),helper:'manuals'};
 else if(enginePrompt.kind==='manual_unavailable')prompt={...base,...enginePrompt,text:'The saved manual text isn’t available yet. Restore its cached analysis or reselect the PDF; your log is still here.',options:[opt('saved','Use a saved PDF',['saved']),opt('upload','Upload the PDF',['upload']),opt('log','Review the saved log',['log'])],helper:'manuals'};
 else if(['system','equipment','additional_manual_identity'].includes(enginePrompt.kind))prompt={...base,...identityPrompt(session)};
 else if(enginePrompt.kind==='fault')prompt={...base,...enginePrompt,text:'Okay. Tell me what’s happening. What exactly does the panel say?',options:[]};
 else if(enginePrompt.kind==='correction')prompt={...base,...enginePrompt,text:'Which earlier answer or reading are you correcting?',options:eventOptions(session),helper:'correction'};
 else prompt={...base,...enginePrompt,options:list(enginePrompt.quickReplies).map(choice=>opt(choice.value,choice.label,[choice.label])),explanation:[enginePrompt.why,enginePrompt.procedureNotice,enginePrompt.routeNote].filter(Boolean).join('\n'),helper:enginePrompt.kind==='measurement'?'measurement':enginePrompt.requiresDetailedRecord?'conditions':undefined};
 prompt.options=numbered(prompt.options||[]);return prompt;
}

export function resolveTerminalOption(prompt,raw){
 const value=normal(raw),options=prompt.options||[];
 const numeric=value.match(/^\[?(\d+)\]?$/);if(numeric)return options.find(item=>item.number===Number(numeric[1]))||null;
 return options.find(item=>[item.value,item.label,...list(item.aliases)].some(alias=>normal(alias)===value))||null;
}

function markComponentManual(session,status,manualId){
 const flow=terminal(session),component=flow.component;if(!component)return;
 component.manualStatus=status;if(manualId)component.manualId=manualId;
 const i=incident(session);i.context||={};i.context.componentUnderInvestigation=clone(component);i.context.componentSpecificationsVerified=status==='available';
 if(status==='unavailable'){flow.previousObservationsOnly=session.diagnosticChat.identity.observationsOnly===true;session.diagnosticChat.identity.observationsOnly=true;i.context.missingComponentManual=component.description;}
 else if(status==='available'){session.diagnosticChat.identity.observationsOnly=flow.previousObservationsOnly===true||/^model unknown$/i.test(session.diagnosticChat.identity.model||'');delete i.context.missingComponentManual;}
}
function identityDone(session,options){
 const flow=terminal(session),additional=flow.identifyingAdditional;
 flow.identityDraft=null;flow.identityField=null;flow.identifyingAdditional=false;
 if(additional){if(flow.returnStage==='component_manual'||['needed','unavailable'].includes(flow.component?.manualStatus))markComponentManual(session,'available',flow.identifyingManualId);flow.stage=flow.returnStage==='component_manual'?'engine':flow.returnStage||'engine';flow.returnStage=null;}
 else flow.stage='component';
 return finishMutation(session,options);
}

/** Compact identity helper and typed confirmation share this exact path. */
export function confirmTerminalIdentity(session,input={},options={}){
 let next=ensureTerminalSession(session,options),flow=terminal(next),chat=next.diagnosticChat;
 const additional=!!chat.additionalManualConfirmation,identity={...currentIdentity(next),...safe(input)};
 if(input.system)identity.systemTypes=input.system==='several'?['fire','access','cctv','intruder']:[input.system];
 flow.identifyingAdditional=additional;flow.identifyingManualId=chat.additionalManualConfirmation?.manualId;
 if(!additional&&chat.phase==='system')next=engineCall(next,s=>diagnostic.confirmDiagnosticIdentity(s,{step:'system',systemTypes:identity.systemTypes},options));
 if(next.diagnosticChat.lastError)return finishMutation(next,options);
 next=engineCall(next,s=>diagnostic.confirmDiagnosticIdentity(s,{...identity,additionalManualId:additional?flow.identifyingManualId:undefined},options));
 if(next.diagnosticChat.lastError){terminal(next).stage='identity_edit';terminal(next).identityDraft=identity;terminal(next).identityField=!list(identity.systemTypes).length?'system':!identity.manufacturer?'manufacturer':'model';append(next,'assistant',next.diagnosticChat.lastError,{kind:'identity_clarification'},options);return finishMutation(next,options);}
 return identityDone(next,options);
}

export function attachTerminalManual(session,analysis,options={}){
 let next=ensureTerminalSession(session,options),flow=terminal(next);const first=!hasUsableManual(next),priorStage=flow.stage,already=next.diagnosticChat.manuals.some(manual=>manual.contentHash===analysis?.contentHash);
 const role=options.equipmentRole||(priorStage==='component_manual'?flow.component?.description:first?'Panel / main equipment':'Additional component');
 next=engineCall(next,s=>diagnostic.attachDiagnosticManual(s,analysis,{...options,equipmentRole:role}));flow=terminal(next);
 if(next.diagnosticChat.lastError){flow.notice=errorPrompt({type:'unreadable_pdf',message:next.diagnosticChat.lastError});return finishMutation(next,options);}
 if(already){flow.stage=flow.returnStage||(!first&&next.diagnosticChat.identity.confirmedEquipment?'engine':'identity');flow.returnStage=null;return finishMutation(next,options);}
 flow.returnStage=first?null:(priorStage==='component_manual'?'component_manual':flow.returnStage||'engine');flow.stage='identity';flow.identifyingAdditional=!first;flow.identifyingManualId=analysis.manualId||analysis.id;
 return finishMutation(next,options);
}

function finishFields(outcome){return outcome==='give_up'?['reason','nextAction','systemLeft','owner','siteAcknowledgement','monitoring']:['cause','confirmation','evidence','confirmed','action','awaitingParts','retests','retest','systemLeft','nextAction','owner','siteAcknowledgement','monitoring'];}
function beginFinish(session,outcome,options){
 const flow=terminal(session),previous=session.diagnosticChat.outcome||{},handover=session.fieldVisit.handover||{};
 flow.returnStage=flow.stage;flow.stage='finish';flow.finish={outcome,field:finishFields(outcome)[0],values:{cause:previous.cause||'',confirmation:previous.confirmation||'',action:previous.action||'',nextAction:handover.nextAction||'',systemLeft:handover.systemLeft||'',owner:handover.owner||'',siteAcknowledgement:handover.siteAcknowledgement||'',monitoringAcknowledgement:handover.monitoringAcknowledgement||''}};
 append(session,'assistant',outcome==='found'?'Let’s separate the cause, the repair and the retest. I’ll keep anything still outstanding.':'Fair enough. Let’s leave the next engineer a useful handover.',{kind:'terminal_finish'},options);return finishMutation(session,options);
}
function answerFinish(session,raw,choice,options){
 const flow=terminal(session),draft=flow.finish,field=draft.field,value=choice?.value||raw;
 if(['evidence','confirmed','awaitingParts','retest'].includes(field)&&!choice){append(session,'assistant','Choose the matching option so I can keep the evidence and uncertainty accurate.',{kind:'clarification'},options);return {session:finishMutation(session,options,true),effect:null};}
 if(value==='use_recorded')raw=text(draft.values[field]);
 const fields=finishFields(draft.outcome);let effectValue=null;
 if(field==='evidence')draft.values.evidenceEventIds=value.startsWith('event:')?[value.slice(6)]:[];
 else if(field==='confirmed')draft.values.engineerConfirmed=value==='yes';
 else if(field==='awaitingParts')draft.values.awaitingParts=value==='yes';
 else if(field==='retest')draft.values.retestEventIds=value.startsWith('event:')?[value.slice(6)]:[];
 else if(field==='monitoring'){draft.values.monitoringNotApplicable=value==='not_applicable';draft.values.monitoringAcknowledgement=value==='not_confirmed'?'':value==='not_applicable'?'Not applicable':raw;}
 else draft.values[field]=raw;
 const index=fields.indexOf(field),nextField=fields[index+1];
 if(nextField){draft.field=nextField;return {session:finishMutation(session,options),effect:effectValue};}
 let next=engineCall(session,s=>diagnostic.finishDiagnosticChat(s,{...draft.values,outcome:draft.outcome},options));
 if(next.diagnosticChat.lastError){append(next,'assistant',next.diagnosticChat.lastError,{kind:'outcome_error'},options);return {session:finishMutation(next,options),effect:null};}
 terminal(next).resumeStage=terminal(next).returnStage||'engine';terminal(next).stage='engine';terminal(next).finish=null;terminal(next).returnStage=null;return {session:finishMutation(next,options),effect:null};
}

function correctFromText(session,raw,options){
 const flow=terminal(session),correction=flow.correction,event=session.fieldVisit.events.find(item=>item.id===correction.eventId);
 if(flow.stage==='correction_value'){
  if(event.testKind==='question_answer'){const answer=normal(raw);if(!['yes','no','unknown','blocked'].includes(answer)){append(session,'assistant','Choose Yes, No, I don’t know or Can’t test for that specific check.',{kind:'clarification'},options);return session;}correction.patch={answer};}
  else {const parsed=diagnostic.parseDiagnosticReadings(raw);if(parsed.length>1){append(session,'assistant','Correct one recorded reading at a time. Which single value belongs to this record?',{kind:'clarification'},options);return finishMutation(session,options,true);}const candidate=parsed[0];correction.patch={rawText:candidate?.rawText??raw,rawEntry:raw,unit:candidate?.unit||event.result?.unit};if(candidate)for(const key of ['label','points','reference','operatingState','circuitState','electricalMode','source'])if(candidate[key]&&candidate[key]!=='unknown'&&(!Array.isArray(candidate[key])||candidate[key].length))correction.patch[key]=candidate[key];}
  flow.stage='correction_reason';return finishMutation(session,options);
 }
 const patch={...correction.patch,correctionReason:raw,reason:raw};let next=engineCall(session,s=>diagnostic.correctDiagnosticEvent(s,correction.eventId,patch,options));
 if(next.diagnosticChat.lastError)append(next,'assistant',next.diagnosticChat.lastError,{kind:'correction_error'},options);
 if(terminal(next).stage!=='reading_context')terminal(next).stage='engine';else terminal(next).readingReturnStage='engine';terminal(next).correction=null;return finishMutation(next,options);
}

/** Ordinary fault text containing command words never becomes a command. */
export function submitTerminalInput(session,value,options={}){
 let next=ensureTerminalSession(session,options),raw=text(value).trim();if(!raw)return {session:next,effect:null};
 const beforePrompt=getTerminalPrompt(next),flow=terminal(next),command=COMMANDS.get(normal(raw)),choice=resolveTerminalOption(beforePrompt,raw);
 next.diagnosticChat.lastError='';
 if(!capture(next,raw,options))return {session:next,effect:null};
 const selected=choice?.value||raw;
 if(command&&flow.languageProposal)delete flow.languageProposal;
 // Emergency reports retain priority even during selection, correction or handover.
 if(diagnostic.detectDiagnosticEmergencyReport(raw).length){
  next=engineCall(next,s=>diagnostic.submitDiagnosticText(s,raw,{...options,id:options.id?`${options.id}:engine`:undefined}));return {session:finishMutation(next,options),effect:null};
 }
 if(flow.languageProposal){
  const proposal=flow.languageProposal;
  if(selected==='language_accept'||selected==='language_reject'){
   delete flow.languageProposal;const record=next.diagnosticChat.languageInteractions?.find(item=>item.id===proposal.requestId);if(record)record.confirmed=selected==='language_accept';
   if(selected==='language_accept'&&getTerminalPrompt(next).key===proposal.promptKey)next=engineCall(next,s=>diagnostic.answerDiagnosticQuestion(s,proposal.answer,{...options,reason:proposal.raw}));
   else append(next,'assistant','Tell me what you observed and what could not be checked.',{kind:'clarification'},options);
   return {session:finishMutation(next,options),effect:null};
  }
  append(next,'assistant','Confirm that interpretation, or choose “Let me clarify”. Your original reply stays in the log.',{kind:'clarification'},options);return {session:next,effect:null};
 }
 if(command==='help'){
  append(next,'assistant',[beforePrompt.text,beforePrompt.explanation,'Type a full reply, or choose the number or name of an option. Commands: START, HELP, MANUALS, LOG, BACK, GIVE UP, FAULT FOUND.'].filter(Boolean).join('\n'),{kind:'help',sourceRefs:beforePrompt.sourceRefs},options);return {session:finishMutation(next,options,true),effect:null};
 }
 if(command==='log'||selected==='log'){append(next,'assistant','Here’s the complete log. The current question will wait here.',{kind:'terminal_log'},options);return {session:next,effect:effect('log')};}
 if(selected==='copy')return {session:next,effect:effect('copy')};
 if(selected==='export')return {session:next,effect:effect('export')};
 if(command==='manuals'){
  if(flow.stage!=='manual_menu'){flow.returnStage=flow.stage;flow.stage='manual_menu';}return {session:finishMutation(next,options),effect:null};
 }
 if(command==='back'){
  if(['paused','finished'].includes(next.diagnosticChat.status))next=engineCall(next,s=>diagnostic.resumeDiagnosticChat(s,options));
  terminal(next).returnStage=terminal(next).stage;terminal(next).stage='correction_choice';return {session:finishMutation(next,options),effect:null};
 }
 if(command==='give_up'||command==='found'){
  if(command==='found'&&beforePrompt.enginePrompt?.kind==='emergency'){append(next,'assistant','Record the emergency response and responsible owner before reviewing a finding. Routine diagnostics remain suspended.',{kind:'emergency'},options);return {session:finishMutation(next,options),effect:effect('conditions')};}
  if(command==='found'&&!hasUsableManual(next)){append(next,'assistant','I need a usable manual before confirming a new diagnostic finding. You can still GIVE UP and save why the investigation stopped.',{kind:'manual_required'},options);return {session:finishMutation(next,options,true),effect:null};}
  return {session:beginFinish(next,command==='found'?'found':'give_up',options),effect:null};
 }
 if(command==='start'||selected==='start'){
  if(flow.stage==='intro'){flow.started=true;flow.stage='manuals';}
  else append(next,'assistant','We’re already in this job. I’ve kept your place.',{kind:'terminal_status'},options);
  return {session:finishMutation(next,options),effect:null};
 }
 if(selected==='resume')return {session:resumeTerminalSession(next,options),effect:null};
 if(beforePrompt.kind==='error'){
  const action=choice?.effect||choice?.value;
  if(action==='return'){return {session:finishMutation(next,options,true),effect:null};}
  if(action==='identity_change'){flow.stage='identity_edit';flow.identityDraft=clone(currentIdentity(next));flow.identityField='system';return {session:finishMutation(next,options),effect:null};}
  if(action)return {session:finishMutation(next,options),effect:effect(action)};
 }
 if(['archive','saved','upload'].includes(selected)&&choice){
  append(next,'assistant',selected==='upload'?'Choose the PDF. I’ll pick up here when you’ve selected it.':selected==='saved'?'Choose one of the manuals saved on this device.':'Search Manual Archives for the exact model and document edition.',{kind:'manual_selection'},options);
  return {session:next,effect:effect(selected,{equipmentRole:flow.stage==='component_manual'?flow.component?.description||'':'',purpose:flow.stage})};
 }
 if(selected==='return'&&choice){flow.stage=flow.returnStage||'engine';flow.returnStage=null;return {session:finishMutation(next,options),effect:null};}
 if(flow.stage==='intro'){append(next,'assistant','Type START, or tap [ start ], when you’re ready.',{kind:'clarification'},options);return {session:next,effect:null};}
 if(['manuals','manual_menu'].includes(flow.stage)){append(next,'assistant','Choose a manual option by number or name. A readable manual comes before diagnostic checks.',{kind:'clarification'},options);return {session:finishMutation(next,options),effect:null};}
 if(flow.stage==='identity'||flow.stage==='engine'&&['system','equipment','additional_manual_identity'].includes(beforePrompt.enginePrompt?.kind)){
  if(selected==='identity_yes')return {session:confirmTerminalIdentity(next,currentIdentity(next),options),effect:null};
  if(selected==='identity_change'){flow.stage='identity_edit';flow.identityDraft=clone(currentIdentity(next));flow.identityField='system';return {session:finishMutation(next,options),effect:null};}
  append(next,'assistant','Have I identified the installed equipment correctly? Say YES, or CHANGE EQUIPMENT.',{kind:'clarification'},options);return {session:next,effect:null};
 }
 if(flow.stage==='identity_edit'){
  const field=flow.identityField||'system',draft=flow.identityDraft||{};
  if(field==='system'){const system=normal(selected);if(!Object.hasOwn(systemNames,system)){append(next,'assistant','Choose Fire alarm, Access control, Intruder, CCTV or Combined systems.',{kind:'clarification'},options);return {session:next,effect:null};}draft.systemTypes=system==='several'?['fire','access','intruder','cctv']:[system];}
  else draft[field]=normal(raw)==='unknown'&&field==='model'?'Model unknown':raw;
  flow.identityDraft=draft;
  const index=identityFields.indexOf(field),needsVariant=currentIdentity(next).requiresVariant&&!list(currentIdentity(next).models).includes(draft.model)&&draft.model!=='Model unknown';
  if(field==='equipmentType'&&!needsVariant||field==='variant')return {session:confirmTerminalIdentity(next,draft,options),effect:null};
  flow.identityField=identityFields[index+1];return {session:finishMutation(next,options),effect:null};
 }
 if(flow.stage==='component'){
  const same=selected==='same_equipment'||/^(?:this|the|same)?\s*(?:panel|equipment|whole panel)$/i.test(raw)||normal(raw)===normal(next.diagnosticChat.identity.equipmentType);
  if(same){flow.component={description:raw,manualStatus:'available',manualId:next.diagnosticChat.manuals[0]?.manualId};flow.stage='engine';}
  else {flow.component={description:selected==='external_psu'?'the external power supply':raw,manualStatus:'needed',equipmentType:/power supply|psu/i.test(raw)?'PSU':'other'};markComponentManual(next,'needed');flow.stage='component_manual';}
  return {session:finishMutation(next,options),effect:null};
 }
 if(flow.stage==='component_manual'){
  if(selected==='manual_unavailable'){markComponentManual(next,'unavailable');const id=uid();next.fieldVisit=addTestEvent(next.fieldVisit,{id,incidentId:next.diagnosticChat.incidentId,testKind:'manual_requirement',method:'engineer_report',result:{rawText:`Manual unavailable for ${flow.component.description}`,source:'engineer_observation',executionState:'recorded'},interpretation:{status:'unverified',reason:'Component specifications and procedures remain unverified; only supported existing observations may continue.'}},at(options));append(next,'assistant','Okay. I’ll keep its specifications unverified and stick to checks supported by the manuals we have. The missing manual will stay in the handover.',{kind:'manual_unavailable',eventIds:[id]},options);flow.stage='engine';return {session:finishMutation(next,options),effect:null};}
  append(next,'assistant','Choose how to add that component’s manual, or say “I haven’t got it”.',{kind:'clarification'},options);return {session:next,effect:null};
 }
 if(flow.stage==='correction_choice'||beforePrompt.enginePrompt?.kind==='correction'){
  if(selected.startsWith('event:')){const event=next.fieldVisit.events.find(item=>item.id===selected.slice(6));if(event?.testKind==='reading_assessment'){append(next,'assistant','Correct the underlying reading, not its derived comparison. The original comparison will remain with its source revision.',{kind:'clarification'},options);return {session:finishMutation(next,options),effect:null};}if(event?.testKind==='calculation')return {session:next,effect:effect('recalculate',{eventId:event.id})};flow.correction={eventId:selected.slice(6)};flow.stage='correction_value';return {session:finishMutation(next,options),effect:null};}
 }
 if(['correction_value','correction_reason'].includes(flow.stage))return {session:correctFromText(next,choice?.value||raw,options),effect:null};
 if(flow.stage==='blocked_reason'){
  next=engineCall(next,s=>diagnostic.answerDiagnosticQuestion(s,'blocked',{...options,reason:raw}));terminal(next).stage='engine';return {session:finishMutation(next,options),effect:null};
 }
 if(flow.stage==='reading_context')return {session:answerReadingContext(next,raw,choice,options),effect:null};
 if(flow.stage==='finish')return answerFinish(next,raw,choice,options);
 const enginePrompt=diagnostic.getDiagnosticPrompt(next);
 if(enginePrompt.kind==='question'&&/^(?:i\s+)?(?:can.t|cannot|can not)\s+(?:access|reach|test|measure|open|inspect)\b/i.test(raw)){next=engineCall(next,s=>diagnostic.answerDiagnosticQuestion(s,'blocked',{...options,reason:raw}));return {session:finishMutation(next,options),effect:null};}
 if(enginePrompt.kind==='question'&&selected==='blocked'){flow.stage='blocked_reason';return {session:finishMutation(next,options),effect:null};}
 next=engineCall(next,s=>enginePrompt.kind==='question'&&['yes','no','unknown'].includes(selected)?diagnostic.answerDiagnosticQuestion(s,selected,{...options,id:options.id?`${options.id}:engine`:undefined}):diagnostic.submitDiagnosticText(s,selected,{...options,id:options.id?`${options.id}:engine`:undefined}));
 if(next.diagnosticChat.lastError)append(next,'assistant',next.diagnosticChat.lastError,{kind:'clarification'},options);
 return {session:finishMutation(next,options),effect:null};
}

export function recordTerminalMeasurement(session,input,options={}){
 let next=ensureTerminalSession(session,options);
 append(next,'user',[`${input.rawText??input.result?.rawText??''} ${input.unit||input.result?.unit||''}`.trim(),input.point||input.label?`at ${input.point||input.label}`:'',input.reference?`across ${input.reference}`:'',input.operatingState||''].filter(Boolean).join(' '),{kind:'measurement_input'},options);
 next=engineCall(next,s=>diagnostic.recordDiagnosticMeasurement(s,input,options));return finishMutation(next,options);
}
export function refreshTerminalPrompt(session,options={}){return finishMutation(assessNewReadings(ensureTerminalSession(session,options),options),options);}
export function resumeTerminalSession(session,options={}){let next=ensureTerminalSession(session,options);next=engineCall(next,s=>diagnostic.resumeDiagnosticChat(s,options));terminal(next).stage=terminal(next).resumeStage||'engine';terminal(next).resumeStage=null;terminal(next).finish=null;terminal(next).notice=null;return finishMutation(next,options);}

export function errorPrompt(event){
 const type=(event.code&&!['AbortError','cancelled'].includes(event.code)?event.code:event.type)||'unknown_error',message=text(event.message),base={kind:'error',key:`terminal-error:${type}`,sourceRefs:[],explanation:message,options:[]};
 if(['resource_cancelled','resource_download_cancelled','RESOURCE_DOWNLOAD_CANCELLED'].includes(type)||['resource_cancelled','resource_download_cancelled'].includes(event.type))return {...base,text:'The offline-resource download was cancelled. Your manual and job haven’t changed. Resume the software download when you’re ready.',options:[opt('resources','Download offline resources',['retry','resume download']),opt('return','Return to conversation',['continue','back'])]};
 if(['resources_missing','OFFLINE_RESOURCES_MISSING','RESOURCE_MISSING','RESOURCE_DOWNLOAD_FAILED','RESOURCE_INTEGRITY_FAILED'].includes(type))return {...base,text:'Some offline PDF/OCR software is missing. Download those resources while connected, then try this manual again.',options:[opt('resources','Download offline resources',['retry','download resources']),opt('return','Return to conversation',['continue','back'])]};
 if(['file_cancelled','file_selection_cancelled'].includes(type))return {...base,text:'No file selected. Your place is saved. Choose a PDF when you’re ready.',options:[opt('upload','Choose PDF',['retry','upload','choose pdf']),opt('return','Return to conversation',['continue','back'])]};
 if(['processing_cancelled','import_cancelled'].includes(type))return {...base,text:'Manual processing was cancelled. No incomplete analysis was attached, and your existing job is unchanged.',options:[opt('retry_import','Retry this manual',['retry']),opt('upload','Choose another PDF',['upload']),opt('return','Return to conversation',['continue','back'])]};
 if(['manual_download_cancelled','MANUAL_DOWNLOAD_CANCELLED'].includes(type))return {...base,text:'The manual download was cancelled. Your existing manuals and job are unchanged. Find the document again when you’re ready.',options:[opt('archive','Find the manual again',['retry','find manual']),opt('saved','Use a saved manual',['saved']),opt('return','Return to conversation',['continue','back'])]};
 if(type==='MANUAL_DOWNLOAD_FAILED')return {...base,text:'The manual PDF could not be downloaded. Check the connection and retry from Manual Archives, or upload a copy. Your current job is retained.',options:[opt('archive','Retry Manual Archives',['retry','find manual']),opt('upload','Upload a PDF',['upload']),opt('return','Return to conversation',['continue','back'])]};
 if(['SAVED_PDF_MISSING','MISSING_PDF'].includes(type))return {...base,text:'The PDF bytes are no longer saved on this device. Choose another saved manual, download the document again, or upload your own copy. The existing log is retained.',options:[opt('saved','Choose a saved PDF',['retry','saved']),opt('archive','Download from Manual Archives',['find manual']),opt('upload','Upload a PDF',['upload'])]};
 if(['unreadable_pdf','UNREADABLE_MANUAL','INVALID_PDF'].includes(type))return {...base,text:'I couldn’t read enough of that PDF to support diagnostic instructions. Upload a clearer copy or the relevant manual pages.',options:[opt('upload','Choose another PDF',['retry','upload']),opt('saved','Use a saved manual',['saved']),opt('return','Return to conversation',['continue','back'])]};
 if(['ocr_failed','OCR_FAILED','OCR_ERROR','OCR_INITIALIZATION_FAILED','OCR_RECOGNITION_FAILED'].includes(type))return {...base,text:'OCR failed while reading the scanned pages. Retry processing, or choose another copy. No incomplete analysis was attached.',options:[opt('retry_import','Retry OCR',['retry']),opt('upload','Choose another PDF',['upload']),opt('resources','Check offline resources',['resources'])]};
 if(['storage_failed','STORAGE_UNAVAILABLE','QuotaExceededError'].includes(type))return {...base,text:'This change couldn’t be saved on this device. Keep this tab open. Retry saving or export the current log before freeing storage.',options:[opt('retry_save','Retry save',['retry']),opt('export','Export current log',['export']),opt('return','Return to conversation',['continue','back'])]};
 if(type==='PDF_PASSWORD_PROTECTED')return {...base,text:'This PDF is password-protected. Upload an authorised unlocked copy or relevant unlocked manual pages; the job is unchanged.',options:[opt('upload','Choose an unlocked PDF',['upload','retry']),opt('return','Return to conversation',['continue','back'])]};
 if(['PDF_RUNTIME_FAILED','PDF_VERSION_MISMATCH','PDF_WORKER_FAILED','PDF_EXTRACTION_FAILED'].includes(type))return {...base,text:type==='PDF_VERSION_MISMATCH'?'The PDF reader and its worker do not match. Your manual and conversation are still saved. Reload the updated app, then retry.':'The PDF reader hit an error. Your manual and conversation are still saved.',options:[opt('retry_import','Retry',['retry']),opt('saved','Choose another manual',['saved']),opt('error_details','Error details',['details'])]};
 if(type==='PDF_RESOURCES_FAILED')return {...base,text:'A local PDF reader or worker resource could not be loaded. Check the offline resources and retry this PDF.',options:[opt('resources','Check offline resources',['resources','retry']),opt('upload','Choose another PDF',['upload'])]};
 if(type==='PDF_RENDER_FAILED')return {...base,text:'The PDF reader could not render a page. Your manual and job remain saved. Retry or open Error details; this does not establish that the PDF is damaged.',options:[opt('retry_import','Retry this PDF',['retry']),opt('error_details','Error details',['details']),opt('saved','Choose a saved manual',['saved'])]};
 if(type==='MANUAL_INDEXING_FAILED')return {...base,text:'The manual text was read, but local indexing failed. Retry processing; no incomplete analysis has replaced your saved evidence.',options:[opt('retry_import','Retry indexing',['retry']),opt('error_details','Error details',['details']),opt('return','Return to conversation',['continue','back'])]};
 if(type==='UNSUPPORTED_BROWSER')return {...base,text:'This browser cannot run the required local PDF/OCR software. Your job is retained; use a supported browser or review the saved log.',options:[opt('log','View saved log',['log']),opt('export','Export current log',['export']),opt('return','Return to conversation',['continue','back'])]};
 if(type==='MANUAL_TOO_LARGE')return {...base,text:'That PDF is too large for this processing workflow. Upload the relevant equipment manual or chapter; the existing job is unchanged.',options:[opt('upload','Choose a smaller PDF',['upload','retry']),opt('return','Return to conversation',['continue','back'])]};
 if(['equipment_ambiguous','equipment_unsupported'].includes(type))return {...base,text:'The installed equipment or variant is still uncertain. Correct its identity; unsupported specifications will remain unverified.',options:[opt('identity_change','Change equipment',['change equipment','change']),opt('return','Keep current observations',['continue','back'])]};
 return {...base,text:message||'That action didn’t complete. Your current job is still here.',options:[opt(event.retryEffect||'retry_import','Retry',['retry']),opt('return','Return to conversation',['continue','back'])]};
}

/** Real I/O outcomes are supplied by the controller; no invented progress. */
export function recordTerminalEvent(session,event={},options={}){
 event={...event,originalType:event.type};const aliases={manual_processing:'processing_started',manual_cancelled:'processing_cancelled',saved_selected:'saved_manual_selected',archive_search:'archive_query',download_start:'archive_selected',download_saved:'archive_selected',resource_start:'resources_started',resource_cancelled:'resource_cancelled',resource_ready:'resources_ready'};event.type=aliases[event.type]||event.type;if(event.type==='archive_selected'&&event.saved===undefined)event.saved=event.originalType==='download_saved';if(event.type==='error'){event.type=event.code||'unknown_error';if(event.operation==='resources'){event.type=event.code==='AbortError'?'resource_cancelled':['RESOURCE_INTEGRITY_FAILED','RESOURCE_DOWNLOAD_FAILED','OFFLINE_RESOURCES_MISSING'].includes(event.code)?'resources_missing':event.type;}else if(event.code==='AbortError')event.type=event.operation==='download'?'manual_download_cancelled':'processing_cancelled';}
 const next=ensureTerminalSession(session,options),flow=terminal(next),type=event.type;
 if(event.id&&list(flow.eventIds).includes(event.id))return next;
 flow.eventIds||=[];if(event.id)flow.eventIds.push(event.id);
 if(type==='file_selected'||type==='uploaded'){append(next,'user',`Uploaded ${event.filename||event.title||'manual.pdf'}`,{kind:'manual_upload',filename:event.filename},options);append(next,'assistant','Got it. I’ll read that manual.',{kind:'manual_processing'},options);flow.notice=null;}
 else if(type==='saved_manual_selected'){append(next,'user',`Selected saved manual: ${event.title||event.filename||'PDF'}`,{kind:'manual_selection',manualId:event.manualId},options);append(next,'assistant','Got it. I’ll read that manual.',{kind:'manual_processing'},options);flow.notice=null;}
 else if(type==='archive_selected'){append(next,'user',`Selected archive manual: ${event.title||'PDF'}`,{kind:'manual_selection',manualId:event.manualId},options);append(next,'assistant',event.saved?'It’s saved on this device. I’ll read it now.':'Downloading the selected manual…',{kind:'manual_processing'},options);flow.notice=null;}
 else if(type==='archive_query')append(next,'user',`Find manual: ${event.query||''}`,{kind:'manual_search'},options);
 else if(type==='resources_started'){append(next,'user','Prepare offline resources.',{kind:'resource_action'},options);append(next,'assistant','Downloading the PDF/OCR resources. I’ll show the actual progress here.',{kind:'resource_processing'},options);flow.notice=null;}
 else if(type==='resources_ready'){append(next,'assistant','The offline processing resources are ready on this device.',{kind:'resource_ready'},options);flow.notice=null;}
 else if(type==='processing_started'){append(next,'assistant','Reading your manual…',{kind:'manual_processing'},options);flow.notice=null;}
 else if(type==='observation'||type==='identity_changed'||type==='measurement_recorded'||type==='correction'){append(next,event.role||'user',event.text||event.message||'Record updated.',{kind:'terminal_action'},options);}
 else if(typeof event.text==='string'&&!event.code&&!/error|failed|cancelled|missing/.test(type||'')){append(next,event.role||'user',event.text,{kind:type||'terminal_action'},options);}
 else {flow.notice=errorPrompt(event);if(type==='file_cancelled'||type==='file_selection_cancelled')append(next,'user','File selection cancelled.',{kind:'file_cancelled'},options);else if(type==='resource_cancelled'||type==='resource_download_cancelled')append(next,'user','Cancelled offline-resource download.',{kind:'resource_cancelled'},options);}
 return finishMutation(next,options);
}
