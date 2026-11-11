import {ensureFieldVisit,createIncident,addTestEvent,normalizeResult,exportFieldVisit,sanitizeFieldVisitForStorage} from './field-model.mjs';
import {getNextFieldStep,recordFieldAnswer,evaluateTestEligibility,getEmergencyState,getRestorationStatus,localisePath,rankFieldRoutes} from './field-engine.mjs';
import {FIELD_ROUTES,ROUTE_VERSION,getRoute} from './field-routes.mjs';
import {verifiedSourceEvidence} from './diagnostic-verified-sources.mjs';

// The conversational layer is deliberately deterministic. Manual text supplies
// references, never commands, permissions, executed code or an automatic verdict.
export const DIAGNOSTIC_CHAT_VERSION='2026-11-10.2';
const array=value=>Array.isArray(value)?value:[];
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const text=value=>value==null?'':String(value);
const clone=value=>structuredClone(value);
const uid=()=>globalThis.crypto?.randomUUID?.()||`chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const present=value=>text(value).trim().length>0;
const nowOf=options=>Number.isFinite(options?.now)?options.now:Date.now();
const safe=value=>sanitizeFieldVisitForStorage(value);
const unique=items=>[...new Set(items)];
const known=value=>present(value)&&! /^(?:unknown|not recorded|not tested|unverified|none|n\/a)$/i.test(text(value).trim());
const readablePage=page=>page?.quality?.readable!==false&&known(page?.text);
const currentIncident=session=>array(session.fieldVisit?.incidents).find(item=>item.id===session.diagnosticChat?.incidentId);
const activeEvents=visit=>array(visit?.events).filter(event=>!array(visit?.events).some(later=>later.supersedes===event.id));
const SYSTEMS=[{value:'fire',label:'Fire alarm'},{value:'access',label:'Access control'},{value:'intruder',label:'Intruder'},{value:'cctv',label:'CCTV'},{value:'several',label:'Combined systems'}];
// A sentence mentioning 'no voltage' is an observation, not automatically No to
// whichever proposition happens to be active. Uncertainty takes precedence.
function conversationalAnswer(raw){
 if(/^(?:i (?:don.t know|am not sure)|unknown|not sure|no idea|not known|can.t tell)(?:[\s,.!]|$)/i.test(raw))return 'unknown';
 const explicit=raw.match(/^(yes|no)(?:[,!.]|$|\s+(?:it|they|that|there|this|i)\b)/i);if(explicit)return explicit[1].toLowerCase();
 if(/^(?:correct|confirmed)(?:[,!.]|$)/i.test(raw))return 'yes';
 if(/^(?:blocked|inaccessible|can.t|cannot)(?:[\s,.!]|$)/i.test(raw))return 'blocked';
 return '';
}
const ANSWERS=[{value:'yes',label:'Yes'},{value:'no',label:'No'},{value:'unknown',label:'I don’t know'},{value:'blocked',label:'Can’t test here'}];
export const DIAGNOSTIC_STOP_REASONS=['Inaccessible equipment','Missing manual','Missing test equipment','Fault absent','Specialist assistance','Awaiting parts','End of visit'];
// Full searchable text belongs in the content-addressed analysis cache, not every
// autosaved session/history snapshot. Historical cited excerpts remain in jobs.
const analysisRegistry=new Map();
const analysisKey=manual=>`${manual.contentHash}:${manual.processorVersion||''}`;
export function registerDiagnosticManualAnalysis(analysis){
 if(!analysis?.contentHash||!array(analysis.pages).some(readablePage))return false;
 analysisRegistry.set(analysisKey(analysis),analysis);return true;
}
export function missingDiagnosticManualAnalyses(session){return array(session?.diagnosticChat?.manuals).filter(manual=>manual.usable&&!analysisRegistry.has(analysisKey(manual))&&!manual.pages?.some(readablePage)).map(manual=>({contentHash:manual.contentHash,processorVersion:manual.processorVersion,manualId:manual.manualId,title:manual.title}));}
function searchablePages(manual){return array(analysisRegistry.get(analysisKey(manual))?.pages||manual.pages);}

// Inspectable symptom routing: these select a question bank, never a diagnosis.
export const DIAGNOSTIC_ROUTE_MATCHERS=[
 {id:'F03',systems:['fire'],patterns:[/\bloop\b.*\b(?:open|return|break)\b/i,/\bopen\b.*\bloop\b/i],note:'All devices can remain present while return-loop integrity is impaired. Establish the actual return path and supported directional diagnostics. Address numbers are not physical cable order.'},
 {id:'F09',systems:['fire'],patterns:[/aspirat|vesda|air\s?flow|low[- ]flow|high[- ]flow/i],note:'Keep the original event, affected pipe and detector time offset. Current normal flow does not establish the cause; preserve the commissioning baseline and do not normalise flow to conceal the warning.'},
 {id:'P06',systems:[],patterns:[/radial.*(?:open|break|good|bad)|(?:open|break).*radial/i],note:'Use a verified physical sequence and comparable observations. An inspection span includes both terminations; it is not a proven cable-break location.'},
 {id:'A05',systems:['access'],patterns:[/(?:fire|emergency|escape|exit).*(?:release|door).*(?:fail|not|stuck|locked)/i,/required (?:escape|exit).*fail/i],note:'A failed required escape function takes priority over routine diagnosis. Record the site emergency response and responsible owner.'},
 {id:'A04',systems:['access'],patterns:[/(?:grant|relay|click).*(?:lock|door)|(?:door|lock).*(?:grant|click|release|stuck)/i],note:'A grant and relay click establish neither actual contact switching nor physical release. Identify the lock manual, independent supply, dry/powered contact and whether the positive or negative conductor is switched; compare the actual connected lock drive in normal and release states.'},
 {id:'C08',systems:['cctv'],patterns:[/playback|no recording|not record|missing (?:clip|recording)|live.*(?:record|clip)/i],note:'Compare the requested time with the recorder clock, channel, schedule/event source and storage. A recording icon is not a verified playable clip. Preserve existing footage; no format/reset shortcut is offered.'},
 {id:'C05',systems:['cctv'],patterns:[/(?:group|several|multiple|all|\d+).*(?:camera|feed).*(?:offline|down|fail|freeze)|(?:camera|feed).*(?:group|switch|uplink|fibre|fiber)/i],note:'Establish the cameras’ actual shared power, switch and uplink, including fibre/transceivers where fitted. A reachable recorder does not prove the camera network path or PoE supply.'},
 {id:'I01',systems:['intruder'],patterns:[/resistan|\bEOL\b|\bDEOL\b|\bTEOL\b|zone.*(?:open|short|tamper)/i],note:'Identify the actual programmed wiring profile and detector/expander variants. Unknown power or an inaccessible remote end blocks a new resistance test. Keep historic readings as method unverified and gather supported panel observations.'},
 {id:'P03',systems:[],patterns:[/voltage|power supply|\bPSU\b|dead|no power/i],note:'Distinguish source voltage from voltage across the connected load under the same operating condition. No generic voltage reading proves the model is working or safe to touch.'},
];

export const DIAGNOSTIC_DETAIL_QUESTIONS={
 F09:[
  {id:'F09.history',text:'What exact airflow event, pipe number and detector time were recorded? Include whether its clock matches site time.',why:'A cleared fault needs a reliable event timeline and affected pipe before a physical cause can be localised.',keywords:'airflow event pipe history clock'},
  {id:'F09.baseline',text:'What flow is shown for that pipe now, and is the commissioned baseline available?',why:'Without a comparable commissioned baseline, current flow alone cannot confirm the cause or justify normalisation.',keywords:'flow baseline commissioning pipe'},
  {id:'F09.environment',text:'Was HVAC starting, a loading door opening, or work taking place around the time of the event?',why:'Record correlations as possible influences, not confirmed causes.',keywords:'airflow pipe pressure environment'},
  {id:'F09.return',text:'Which pipe sections or filters are inaccessible, and what access, drawings or OEM tools would a return visit need?',why:'Missing access must remain visible even when the indication has cleared.',keywords:'filter pipe inspection maintenance'},
 ],
 C05:[{id:'C05.dependencies',text:'Which power supply, PoE switch and uplink do the affected cameras actually share? Is any uplink fibre?',why:'A common recorder is not evidence of shared power or cabling. For fibre, retain switch/transceiver diagnostics and endpoint identity; do not infer an optical break from an IP timeout.',keywords:'switch uplink fibre fiber power PoE'}],
 I01:[{id:'I01.profile',text:'What panel/expander input and programmed wiring profile are involved, and can both physical ends be accessed?',why:'The detector manual alone does not establish the expander input mode. Without the remote end and safe isolation, collect available indications and record the access needed.',keywords:'zone input expander resistance wiring profile EOL'}],
 A04:[{id:'A04.components',text:'Which controller, lock and actual lock power supply are fitted? Add the lock/PSU manual if their requirements are not in this manual.',why:'The command, actual lock drive and physical door movement are separate evidence. A dry contact does not generate voltage, and some circuits switch the negative conductor.',keywords:'lock relay power supply dry contact COM NO NC'}],
};

function appendMessage(session,role,message,details={},options={}){
 // Operation IDs deduplicate submissions/events, not messages: one submission
 // may create a user entry, an acknowledgement and the next question.
 const chat=session.diagnosticChat,id=options.messageId||uid();
 if(chat.messages.some(item=>item.id===id))return;
 chat.messages.push({id,role,text:text(safe(message)),createdAt:nowOf(options),kind:details.kind||'message',...safe(details)});
 chat.updatedAt=nowOf(options);
}
function savePrompt(session,options={}){
 const prompt=getDiagnosticPrompt(session);
 const signature=JSON.stringify([prompt.kind,prompt.key,prompt.text,prompt.pendingMeasurement?.index,prompt.missing]);
 if(signature!==session.diagnosticChat.lastPromptSignature){
  appendMessage(session,'assistant',prompt.text,{kind:prompt.kind,promptKey:prompt.key,why:prompt.why||'',sourceRefs:prompt.sourceRefs||[],ruleRevision:prompt.ruleRevision||DIAGNOSTIC_CHAT_VERSION},options);
  session.diagnosticChat.lastPromptSignature=signature;
 }
 return session;
}
function mutate(session,options={}){
 const next=ensureDiagnosticChat(session,options);next.diagnosticChat.lastError='';return next;
}
function incidentUpdate(session,patch){const incident=currentIncident(session);if(incident)Object.assign(incident,clone(patch));}
function usableManuals(session){return array(session.diagnosticChat?.manuals).filter(manual=>manual.usable&&manual.contentHash&&(manual.readablePageCount>0||manual.pages?.some(readablePage)));}
function sourceTerms(query){return unique(text(query).toLowerCase().match(/[a-z0-9]{3,}/g)||[]).filter(word=>!['the','and','for','this','that','from','with','what','does','have','into','there','which','record','actual'].includes(word));}
function manualReferences(session,query,limit=2){
 const terms=sourceTerms(query),matches=[];
 for(const manual of usableManuals(session))for(const page of searchablePages(manual).filter(readablePage)){
  const hay=text(page.text).toLowerCase(),hits=terms.filter(term=>hay.includes(term));
  if(!hits.length)continue;
  const first=hay.indexOf(hits[0]),start=Math.max(0,first-90);
  matches.push({manualId:manual.manualId,contentHash:manual.contentHash,title:manual.title,revision:manual.identity?.revision||'',page:page.page,excerpt:text(page.text).slice(start,start+460),method:page.method||'text',score:hits.length,relationship:'Relevant reference text; applicability and any procedure must be confirmed against the installed variant.'});
 }
 return matches.sort((a,b)=>b.score-a.score||a.page-b.page).slice(0,limit).map(({score,...ref})=>ref);
}

/** Idempotent lazy addition; all original legacy fields and event IDs survive. */
export function ensureDiagnosticChat(session={},options={}){
 const next=clone(object(session)),at=nowOf(options);
 next.id=next.id||uid();next.fieldVisit=ensureFieldVisit(next,at);
 const existing=object(next.diagnosticChat);
 next.diagnosticChat={schemaVersion:1,engineVersion:DIAGNOSTIC_CHAT_VERSION,routeVersion:ROUTE_VERSION,phase:'manual',status:'open',messages:[],manuals:[],identity:{},details:{},handledInputIds:[],pendingReadings:[],pendingCorrection:null,lastError:'',createdAt:at,...existing};
 const chat=next.diagnosticChat;
 for(const key of ['messages','manuals','handledInputIds','pendingReadings'])chat[key]=array(chat[key]);
 for(const manual of chat.manuals)if(manual.pages?.some(page=>known(page.text))){registerDiagnosticManualAnalysis(manual);manual.readablePageCount=manual.pages.filter(readablePage).length;manual.pages=manual.pages.map(({text:_text,...page})=>page);}
 chat.identity=object(chat.identity);chat.details=object(chat.details);
 if(!chat.incidentId){
  chat.incidentId=next.fieldVisit.currentIncidentId||next.fieldVisit.incidents[0]?.id||`${next.id}:diagnostic`;
  if(!next.fieldVisit.incidents.some(item=>item.id===chat.incidentId))next.fieldVisit=createIncident(next.fieldVisit,{id:chat.incidentId},at);
 }
 next.fieldVisit.currentIncidentId=chat.incidentId;
 if(!chat.messages.length)appendMessage(next,'assistant','A readable manual is compulsory. Choose a saved manual, download one from Manual Archives, or upload a PDF. I will keep the fault, readings and unfinished checks together.',{kind:'manual'},options);
 return next;
}

export function attachDiagnosticManual(session,analysis,options={}){
 const next=mutate(session,options),chat=next.diagnosticChat;
 if(!analysis?.usable||!analysis.contentHash||!array(analysis.pages).some(readablePage)){chat.lastError='This manual is not sufficiently readable. Try another copy or the relevant manual pages before using it for diagnostic instructions.';appendMessage(next,'assistant',chat.lastError,{kind:'manual_error'},options);return next;}
 const prior=chat.manuals.find(manual=>manual.contentHash===analysis.contentHash);
 registerDiagnosticManualAnalysis(analysis);
 if(prior){appendMessage(next,'assistant','This manual is already associated with this visit. Its saved analysis has been reused.',{kind:'manual'},options);return next;}
 const record=safe({id:analysis.id||analysis.manualId,manualId:analysis.manualId||analysis.id,contentHash:analysis.contentHash,processorVersion:analysis.processorVersion,title:analysis.title||analysis.filename||'Uploaded manual',filename:analysis.filename||'',pageCount:analysis.pageCount,readablePageCount:array(analysis.pages).filter(readablePage).length,usable:true,quality:clone(analysis.quality||{}),identity:clone(analysis.identity||{}),pages:array(analysis.pages).map(page=>({page:page.page,method:page.method||'text',quality:page.quality,confidence:page.confidence})),equipmentRole:options.equipmentRole||'Equipment under investigation',addedAt:nowOf(options)});
 chat.manuals.push(record);
 appendMessage(next,'assistant',`${record.title} is attached to this job. ${record.readablePageCount} of ${record.pages.length} page${record.pages.length===1?' is':'s are'} readable; all page references are retained with the source revision.`,{kind:'manual',manualId:record.manualId},options);
 const qualityWarnings=[text(record.quality.warning)].filter(present);
 if(record.pages.some(page=>page.method==='ocr')&&!qualityWarnings.some(warning=>/recognition errors|page image/i.test(warning)))qualityWarnings.push('OCR text can contain recognition errors. Check cited pages and all numbers against the page image.');
 if(record.pages.some(page=>page.quality?.readable===false)&&!qualityWarnings.some(warning=>/could not be read|unreadable|clearer pages/i.test(warning)))qualityWarnings.push('Some pages could not be read. Only readable pages support the conversation; add a clearer copy of the relevant pages when needed.');
 if(qualityWarnings.length)appendMessage(next,'assistant',qualityWarnings.join(' '),{kind:'manual_warning',manualId:record.manualId,unreadablePages:record.pages.filter(page=>page.quality?.readable===false).map(page=>page.page)},options);
 if(chat.phase==='manual'){
  chat.identity={...clone(record.identity),confirmedSystem:false,confirmedEquipment:false};chat.phase='system';
 }else{
  chat.additionalManualConfirmation={manualId:record.manualId,identity:clone(record.identity),equipmentRole:record.equipmentRole};
  appendMessage(next,'assistant','The current question is still open. Confirm what this additional manual applies to; adding a manual does not answer a test.',{kind:'manual_identity'},options);
 }
 return savePrompt(next,options);
}

export function confirmDiagnosticIdentity(session,input={},options={}){
 const next=mutate(session,options),chat=next.diagnosticChat;
 if(!usableManuals(next).length){chat.lastError='Select a readable manual first.';return next;}
 const systems=array(input.systemTypes).length?unique(input.systemTypes):input.system? [input.system]:array(chat.identity.systemTypes);
 if(input.step==='system'||chat.phase==='system'){
  if(!systems.length){chat.lastError='Choose the system or combined systems.';return next;}
  chat.identity={...chat.identity,systemTypes:systems,confirmedSystem:true};chat.phase='equipment';incidentUpdate(next,{systemTypes:systems});
  appendMessage(next,'user',`System confirmed: ${systems.join(', ')}.`,{kind:'identity'},options);return savePrompt(next,options);
 }
 if(input.additionalManualId||chat.additionalManualConfirmation){
  const pending=chat.additionalManualConfirmation,manual=chat.manuals.find(item=>item.manualId===(input.additionalManualId||pending?.manualId));
  if(!manual){chat.lastError='Choose the additional manual to identify.';return next;}
  manual.confirmedIdentity={...clone(manual.identity),...safe(input),confirmedAt:nowOf(options)};manual.equipmentRole=input.equipmentRole||manual.equipmentRole;
  chat.additionalManualConfirmation=null;appendMessage(next,'user',`Additional manual applies to: ${manual.equipmentRole}; ${input.manufacturer||manual.identity.manufacturer||'manufacturer unconfirmed'} ${input.model||manual.identity.model||'model unconfirmed'}.`,{kind:'identity'},options);
  return savePrompt(next,options);
 }
 const enteredModel=text(input.model||input.installedModel||chat.identity.model),model=/^unknown$/i.test(enteredModel)?'Model unknown':enteredModel,equipmentType=text(input.equipmentType||chat.identity.equipmentType),variants=array(chat.identity.variants),models=array(chat.identity.models);
 if(!known(model)||!known(equipmentType)){chat.lastError='Record the installed equipment type and model, or explicitly choose “Model unknown” to continue with observations only.';return next;}
 const unknownModel=/^model unknown$/i.test(model),variant=text(input.variant||chat.identity.variant);
 if(!unknownModel&&(chat.identity.requiresVariant||variants.length>1||models.length>1)&&!known(variant)&&!models.includes(model)){chat.lastError='Choose the installed model or variant. This manual covers more than one and the procedure may differ.';return next;}
 chat.identity={...chat.identity,...safe(input),systemTypes:systems,model,equipmentType,variant,confirmedSystem:true,confirmedEquipment:true,confirmedAt:nowOf(options),observationsOnly:unknownModel};
 chat.phase='fault';
 const assetId=`${next.id}:chat-equipment`,asset={id:assetId,kind:equipmentType,manufacturer:text(chat.identity.manufacturer),model,variant,label:model,identityProvenance:'engineer_confirmation',manualRefs:chat.manuals.map(manual=>({manualId:manual.manualId,contentHash:manual.contentHash,revision:manual.identity.revision||''})),location:text(input.location),localAddress:clone(next.importedContext||{})};
 const index=next.fieldVisit.assets.findIndex(item=>item.id===assetId);if(index>=0)next.fieldVisit.assets[index]=asset;else next.fieldVisit.assets.push(asset);
 incidentUpdate(next,{systemTypes:systems,assetRefs:unique([...array(currentIncident(next)?.assetRefs),assetId])});
 appendMessage(next,'user',`Equipment confirmed: ${[chat.identity.manufacturer,model,variant].filter(Boolean).join(' ')} (${equipmentType}).${unknownModel?' Exact model remains unknown; equipment-specific procedures and limits stay unverified.':''}`,{kind:'identity'},options);
 return savePrompt(next,options);
}

function chooseRoute(incident){
 const systems=array(incident?.systemTypes),complaint=text(incident?.exactComplaint);
 return DIAGNOSTIC_ROUTE_MATCHERS.find(match=>(!match.systems.length||match.systems.some(system=>systems.includes(system)))&&match.patterns.some(pattern=>pattern.test(complaint)))?.id||'';
}
function selectedDetail(session){
 const chat=session.diagnosticChat,routeId=currentIncident(session)?.routeId;
 return array(DIAGNOSTIC_DETAIL_QUESTIONS[routeId]).find(question=>!Object.hasOwn(chat.details,question.id));
}
function routeNote(session){return DIAGNOSTIC_ROUTE_MATCHERS.find(item=>item.id===currentIncident(session)?.routeId)?.note||'Recorded observations support questions, not an automatic confirmed cause.';}
const GATE_QUESTIONS={
 sourceType:['What type of supply is involved at this exact test point?','choice',[{value:'selv',label:'Extra-low voltage'},{value:'mains',label:'Mains'},{value:'poe',label:'PoE'},{value:'unknown',label:'Not established'}]],
 safeAccess:['Is this exact test point safely accessible?','boolean'],
 competenceConfirmed:['Has the appropriate competent person assessed this proposed test?','boolean'],
 procedure:['Which applicable manual page and test method will you follow for this installed variant?','text'],
 suitableInstrument:['Is your instrument suitable for this circuit and the proposed test?','boolean'],
 electricalState:['What is the actual electrical state of this identified test span?','choice',[{value:'energised_connected',label:'Energised, connected'},{value:'energised_disconnected',label:'Energised, load disconnected'},{value:'isolated',label:'Isolated under the recorded method'},{value:'unknown',label:'Not established'}]],
 'permissions.energised':['Is measurement on energised equipment authorised for this test?','boolean'],
 'permissions.isolation':['Is isolating this circuit authorised separately from read-only access?','boolean'],
 'permissions.impairment':['Is the affected function’s interruption authorised for this test?','boolean'],
 'permissions.change':['Is this particular configuration/change operation authorised?','boolean'],
 allSourcesIdentified:['Have all supplies, batteries, stored-energy sources and possible backfeeds for this span been identified?','boolean'],
 storedEnergyControlled:['Has stored energy been accounted for under the applicable method?','boolean'],
 bothEndsConfirmed:['Are both physical ends identified, with their actual disposition established?','boolean'],
 isolatedSpanConfirmed:['Is the specific isolated span suitable and verified for this proposed test?','boolean'],
 parallelPathsKnown:['Are the remaining parallel paths and connected components known?','boolean'],
 connectedEquipment:['What remains connected to the isolated span?','choice',[{value:'none',label:'No equipment / bare span'},{value:'known_passive',label:'Identified passive components'},{value:'electronics',label:'Electronics connected'},{value:'unknown',label:'Not known'}]],
 reference:['Name the actual terminal/probe pair. DC 0 V, protective earth, screen and chassis are different references.','text'],
 operatingState:['What operating/load condition will this measurement represent?','text'],
 physicalPathConfirmed:['Is the actual physical path verified by a trace or checked drawing? Addresses alone are insufficient.','detailed'],
 provingDead:['A separate complete proving-dead record is required, including identified sources, securing arrangement, actual pairs and instrument proof before and after. Open the detailed safety record.','detailed'],
 impairmentPlan:['Record the affected scope, authorising role, temporary measures, owner and review time in the detailed impairment plan.','detailed'],
 'liveWork.deadUnreasonable':['Record why making dead is unreasonable for this particular live-work assessment.','liveText'],
 'liveWork.liveReasonable':['Record why this particular live-work measurement is reasonable.','liveText'],
 'liveWork.precautions':['Record the suitable precautions for this particular live-work assessment.','liveText'],
};
function testPreparation(session){
 const pending=session.diagnosticChat?.pendingTest;if(!pending)return null;
 const incident=currentIncident(session),context=object(incident?.context),step=getNextFieldStep(session.fieldVisit,incident.id);
 if(step.rule?.id!==pending.ruleId)return {invalid:true,text:'The diagnostic question changed. Reassess the intended test at the new question.'};
 const gate=evaluateTestEligibility(session.fieldVisit,incident,{id:step.template,requires:step.rule.testRequires||step.rule.requires,reviewStatus:step.rule.reviewStatus},{intent:'perform'});
 const missing=unique([...(!known(context.sourceType)?['sourceType']:[]),...gate.missing]);
 const key=missing[0],spec=GATE_QUESTIONS[key]||['This prerequisite needs an explicit detailed record: '+text(key)+'. Open the evidence/safety record, or mark this test unavailable.','detailed'];
 return {gate,missing,key,spec,ready:!missing.length,ruleId:pending.ruleId,template:step.template,sourceRefs:pending.sourceRefs};
}

/** Prepare one proposed test through explicit gates; no prompt grants authority. */
export function prepareDiagnosticTest(session,options={}){
 const next=mutate(session,options),prompt=getDiagnosticPrompt(next);
 if(prompt.kind!=='question'||!prompt.fieldStep?.rule){next.diagnosticChat.lastError='Choose the current diagnostic question before preparing its test.';return next;}
 if(!prompt.sourceRefs?.length||next.diagnosticChat.identity.observationsOnly){next.diagnosticChat.lastError='An applicable readable manual and installed model are needed before preparing an equipment-specific physical test. Keep existing observations or add the relevant manual.';return next;}
 next.diagnosticChat.pendingTest={ruleId:prompt.fieldStep.rule.id,template:prompt.measurementTemplate,sourceRefs:clone(prompt.sourceRefs),startedAt:nowOf(options)};
 return savePrompt(next,options);
}

function answerTestPreparation(session,raw,options){
 const pending=testPreparation(session),chat=session.diagnosticChat;
 if(!pending||pending.invalid){chat.pendingTest=null;chat.lastError=pending?.text||'The proposed test is unavailable.';return savePrompt(session,options);}
 if(pending.ready){chat.preparedTest={...chat.pendingTest,preparedAt:nowOf(options),contextSnapshot:clone(currentIncident(session).context)};chat.pendingTest=null;return savePrompt(session,options);}
 if(/^(?:unknown|not established|blocked|can.t|cannot|no|not known)$/i.test(raw)){
  const id=genericObservation(session,`Proposed ${pending.template} test unavailable: ${pending.key} — ${raw}`,options);chat.pendingTest=null;
  appendMessage(session,'assistant','This test remains unavailable. Keep the existing observations and the missing prerequisite in the handover; no physical test has been completed.',{kind:'test_blocked',eventIds:[id]},options);return savePrompt(session,options);
 }
 if(pending.spec[1]==='detailed'){chat.lastError='This prerequisite cannot be confirmed by a single Yes. Complete its detailed record, or keep the test unavailable.';return session;}
 let value=raw;
 if(pending.spec[1]==='boolean'){
  if(!/^(yes|confirmed)$/i.test(raw)){chat.lastError='Confirm this single prerequisite, or choose Not established.';return session;}value=true;
 }else if(pending.spec[1]==='choice'&&!pending.spec[2].some(choice=>choice.value===raw)){chat.lastError='Choose the actual recorded state; unknown remains an available answer.';return session;}
 const incident=currentIncident(session);if(pending.key.startsWith('permissions.'))incident.permissions={...incident.permissions,[pending.key.slice(12)]:value};
 else if(pending.key.startsWith('liveWork.'))incident.context={...incident.context,liveWork:{...object(incident.context.liveWork),[pending.key.slice(9)]:value}};
 else incident.context={...incident.context,[pending.key]:value};
 const id=genericObservation(session,`Explicit prerequisite: ${pending.key} = ${text(value)}`,options);const event=session.fieldVisit.events.find(item=>item.id===id);event.testKind='prerequisite_record';event.prerequisiteKey=pending.key;event.ruleId=pending.ruleId;
 return savePrompt(session,options);
}
function readingPrompt(pending){
 const missing=pending.missing||[],name=pending.label||'this reading';
 if(missing.includes('point'))return `Where was “${pending.rawText} ${pending.unit}” measured: at the supply, or across which connected device? Name the two actual terminals or probe reference.`;
 if(missing.includes('reference'))return `For ${name}, what were the two actual terminals or probe reference? Chassis, protective earth, screen and DC 0 V are distinct references.`;
 if(missing.includes('operatingState'))return `Under what operating/load condition was ${name} recorded: normal, release/alarm demand, IR/night load, or another stated condition?`;
 if(missing.includes('circuitState'))return `Was ${name} measured connected and energised, energised with the load disconnected, or on an identified isolated span? Choose unknown if it was not established.`;
 if(missing.includes('source'))return `Was ${name} from a meter/instrument, a panel display, or someone’s earlier report? Include the instrument if known.`;
 return `Review the exact points and conditions for ${name}, then save the reading.`;
}

export function getDiagnosticPrompt(session){
 const chat=session?.diagnosticChat;
 if(!chat)return {kind:'manual',key:'manual',text:'Select a readable manual to start Fault Finder.',quickReplies:[]};
 const base={quickReplies:[],engineVersion:DIAGNOSTIC_CHAT_VERSION};
 const emergency=getEmergencyState(session.fieldVisit,currentIncident(session));
 if(emergency.active)return {...base,kind:'emergency',key:'emergency',text:emergency.message,why:'Emergency response takes precedence over all routine questions. Existing observations can still be recorded.',blockedReasons:emergency.reasons};
 if(chat.status==='finished'||chat.status==='paused')return {...base,kind:'report',key:'report',text:chat.status==='paused'?'This visit is saved for handover. Review the findings or resume at the same question.':'Review the findings, evidence and restoration separately before exporting.'};
 if(!usableManuals(session).length||chat.phase==='manual')return {...base,kind:'manual',key:'manual',text:'A readable manual is compulsory. Choose a saved manual, download one while online, or upload your PDF.',reason:'The manual establishes equipment context; unreadable or unavailable instructions cannot support a procedure.'};
 const missingAnalyses=missingDiagnosticManualAnalyses(session);
 if(missingAnalyses.length)return {...base,kind:'manual_unavailable',key:'manual-analysis-unavailable',text:'The saved manual analysis is not loaded. Restore its cached text or reselect the same PDF before continuing diagnostic questions. The existing transcript and report remain available.',missingManualAnalyses:missingAnalyses,reason:'A document title alone is not readable manual evidence.'};
 if(chat.additionalManualConfirmation)return {...base,kind:'additional_manual_identity',key:`additional:${chat.additionalManualConfirmation.manualId}`,text:'Confirm the equipment and installed variant covered by the additional manual. The diagnostic question will resume at the same point.',identity:clone(chat.additionalManualConfirmation.identity),manualId:chat.additionalManualConfirmation.manualId};
 if(chat.phase==='system')return {...base,kind:'system',key:'system',text:`${chat.identity.systemTypes?.length?`This appears to cover ${chat.identity.systemTypes.join(' / ')}.`:'The system type is uncertain.'} Is that the system you are investigating?`,identity:clone(chat.identity),quickReplies:SYSTEMS,sourceRefs:manualReferences(session,`${chat.identity.manufacturer||''} ${chat.identity.model||''} ${array(chat.identity.systemTypes).join(' ')}`)};
 if(chat.phase==='equipment')return {...base,kind:'equipment',key:'equipment',text:`${chat.identity.manufacturer||chat.identity.model?`This appears to be ${[chat.identity.manufacturer,chat.identity.model].filter(Boolean).join(' ')}.`:'The exact model is uncertain.'} Confirm or correct the installed equipment and model.${chat.identity.requiresVariant||array(chat.identity.models).length>1?' This manual covers multiple models: select the installed variant.':''}`,identity:clone(chat.identity),quickReplies:[],sourceRefs:manualReferences(session,`${chat.identity.manufacturer||''} ${chat.identity.model||''}`)};
 if(chat.phase==='fault')return {...base,kind:'fault',key:'fault',text:'What fault are you investigating? Enter the exact display message and what happened in your own words. You can include several observations.',quickReplies:[]};
 if(chat.phase==='condition')return {...base,kind:'faultCondition',key:'condition',text:'Is that fault present now, intermittent, or cleared before you arrived?',quickReplies:[{value:'present',label:'Present now'},{value:'intermittent',label:'Intermittent'},{value:'cleared_before_arrival',label:'Cleared before arrival'},{value:'unknown',label:'Not established'}]};
 if(chat.pendingTest){
  const preparation=testPreparation(session);
  if(preparation.invalid)return {...base,kind:'test_prerequisite',key:'test-changed',text:preparation.text,quickReplies:[{value:'unknown',label:'Keep test unavailable'}]};
  if(preparation.ready)return {...base,kind:'test_prerequisite',key:'test-prepared',text:`The recorded prerequisites for ${preparation.template.replaceAll('_',' ')} are complete. Follow the recorded applicable method at the identified points and operating condition. Save a result only after the test is actually performed.`,sourceRefs:preparation.sourceRefs,quickReplies:[{value:'continue',label:'Return to question / record result'}],prepared:true};
  const [,type,choices]=preparation.spec;return {...base,kind:'test_prerequisite',key:`gate:${preparation.key}`,text:preparation.spec[0],why:'This records one prerequisite only. It does not establish competence, safe isolation or a completed test.',missing:preparation.missing,gateKey:preparation.key,requiresDetailedRecord:type==='detailed',sourceRefs:preparation.sourceRefs,quickReplies:type==='boolean'?[{value:'yes',label:'Yes — this prerequisite is established'},{value:'unknown',label:'Not established / cannot test'}]:type==='choice'?choices:[{value:'unknown',label:'Not established / cannot test'}]};
 }
 if(chat.pendingReadings.length){const pending=chat.pendingReadings[0];return {...base,kind:'measurement',key:`measurement:${pending.id}:${pending.missing.join(',')}`,text:readingPrompt(pending),pendingMeasurement:clone(pending),missing:clone(pending.missing),quickReplies:[{value:'unknown',label:'Not known / keep unverified'}]};}
 if(chat.pendingCorrection)return {...base,kind:'correction',key:'correction',text:'Choose the saved reading or answer you are correcting. The original entry will remain in the record.',eventChoices:activeEvents(session.fieldVisit).filter(event=>event.incidentId===chat.incidentId).map(event=>({id:event.id,label:`${event.testKind}: ${event.result?.rawText||event.answer||''}`}))};
 const incident=currentIncident(session);
 if(!incident?.routeId)return {...base,kind:'route',key:'route',text:/open|break/i.test(incident?.exactComplaint||'')?'What actual circuit topology and affected function are involved? An “open” indication alone cannot establish a resistor threshold or physical break location.':'Which symptom or affected function should we investigate first?',quickReplies:rankFieldRoutes(session.fieldVisit,chat.incidentId).slice(0,8).map(item=>({value:item.routeId,label:item.title})),routeChoices:FIELD_ROUTES.filter(route=>route.systems.includes('shared')||route.systems.some(system=>incident?.systemTypes.includes(system))).map(route=>({value:route.id,label:route.title}))};
 const detail=selectedDetail(session);
 if(detail)return {...base,kind:'detail',key:detail.id,text:detail.text,why:detail.why,quickReplies:[{value:'unknown',label:'I don’t know'},{value:'inaccessible',label:'Inaccessible'}],sourceRefs:manualReferences(session,detail.keywords),routeNote:routeNote(session),ruleRevision:DIAGNOSTIC_CHAT_VERSION};
 const step=getNextFieldStep(session.fieldVisit,chat.incidentId),sources=manualReferences(session,`${getRoute(incident.routeId)?.title||''} ${step.question}`);
 const verifiedSources=verifiedSourceEvidence({manuals:chat.manuals.map(manual=>({...manual,hash:manual.contentHash})),routeId:incident.routeId,context:{...object(incident.context),...chat.identity,modelConfirmed:chat.identity.confirmedEquipment===true}});
 const verifiedRefs=verifiedSources.flatMap(evidence=>array(evidence.source?.pages).slice(0,2).map(page=>({manualId:evidence.source.manualId,contentHash:evidence.source.hash,title:evidence.source.title,revision:evidence.source.revision,page:page.number,excerpt:page.excerpt,relationship:evidence.applicable?'Verified document fact within the recorded scope; no operational sequence is enabled.':'Verified source document; installed scope is unconfirmed.',sourcePackVersion:evidence.source.sourcePackVersion,scopeStatus:evidence.status,missing:evidence.missing,actionEnabled:false,comparatorEnabled:false})));
 const common={...base,key:step.rule?.id||step.kind,text:step.question,why:step.why,sourceRefs:[...verifiedRefs,...sources].slice(0,4),verifiedSources,ruleSourceRefs:step.sourceRefs||[],ruleRevision:step.rule?.revision||ROUTE_VERSION,routeId:step.routeId||incident.routeId,routeNote:routeNote(session),fieldStep:step,testEligibility:step.testEligibility,blockedReasons:step.blockedReasons||[],manualApplicability:verifiedRefs.length?'verified_document_reference':sources.length?'reference_only':'no_relevant_page_identified',note:step.note||''};
 if(step.kind==='question')return {...common,kind:'question',quickReplies:ANSWERS,maySuggestTest:step.testEligibility?.allowed===true&&sources.length>0&&!chat.identity.observationsOnly,measurementTemplate:step.template,observationOnly:!step.testEligibility?.allowed||!sources.length||chat.identity.observationsOnly,procedureNotice:!step.testEligibility?.allowed?'Record an existing observation if available. A new physical test remains blocked until its prerequisites are explicitly recorded.':!sources.length?'No matching source page was identified. Add the relevant manual before an equipment-specific test.':'The page is a reference. Confirm the installed variant and applicable method before considering a physical test.'};
 if(step.kind==='manual')return {...common,kind:'manual_needed',text:'This branch needs more manual or configuration evidence. Add the applicable component manual, record what remains unknown, or choose another supported route.',quickReplies:[{value:'continue_observations',label:'Keep recording observations'},{value:'choose_route',label:'Choose another route'}]};
 if(step.kind==='clarification')return {...common,kind:'prerequisite',text:step.question,quickReplies:[{value:'unknown',label:'Not established'},{value:'blocked',label:'Can’t establish here'}]};
 return {...common,kind:step.kind==='handover'?'review':step.kind,quickReplies:[{value:'choose_route',label:'Choose another route'}]};
}

const measurementPattern=/([+-]?(?:\d+(?:\.\d*)?|\.\d+)|OL|unstable|fluctuating|unknown|not tested|inaccessible)\s*(milli\s?volts?|volts?|mV|V|kilo\s?ohms?|kohms?|kΩ|mega\s?ohms?|MΩ|ohms?|Ω|milli\s?amps?|mA|amps?|A)(?:\s*(AC|DC))?(?=$|[\s,;.!])/gi;
const unitName=value=>/^milli\s?volt|^mv$/i.test(value)?'mV':/^volt|^v$/i.test(value)?'V':/^kilo|^kohm|^kΩ$/i.test(value)?'kΩ':/^mega|^MΩ$/.test(value)?'MΩ':/^ohm|^Ω$/i.test(value)?'Ω':/^milli\s?amp|^ma$/i.test(value)?'mA':'A';
/** Parse proposals only; ambiguous text is not silently assigned to a terminal. */
export function parseDiagnosticReadings(raw){
 const input=text(raw),matches=[...input.matchAll(measurementPattern)];
 return matches.map((match,index)=>{
  const previous=index?matches[index-1].index+matches[index-1][0].length:0,next=index+1<matches.length?matches[index+1].index:input.length;
  let before=input.slice(previous,match.index).replace(/^[\s,;]*(?:and\s+)?/i,'').trim();
  let after=input.slice(match.index+match[0].length,next).trim();
  const labelMatch=before.match(/(?:at|across|between|from)\s+(.+)$/i)||before.match(/((?:panel|PSU|supply|lock|camera|first device|last device|detector|input|output|L[-–]N|L[-–]PE|N[-–]PE)[^;\n]*?)(?:\s+(?:was|is|reads?|measured|voltage))?\s*[:=]?$/i);
  let label=labelMatch?labelMatch[1].trim():'';
  if(!label){const following=after.match(/^(?:at|across|between)\s+(.+?)(?:[,;.]|\s+(?:under|during|when|with)|$)/i);if(following)label=following[1].trim();}
  const clause=`${before} ${after}`;
  const referenceMatch=clause.match(/\b(L\s*[-–/]\s*(?:N|PE)|N\s*[-–/]\s*PE|\+\s*(?:to|and|\/)\s*(?:0\s?V|negative|[-−])|positive\s+(?:to|and)\s+(?:negative|0\s?V)|COM\s+(?:to|and)\s+(?:NO|NC)|[^,;.]{0,30}\bterminal\s+\S+\s+(?:to|and)\s+\S+)/i);
  const reference=referenceMatch?.[1]||(/across\s+(?:the\s+)?(?:connected\s+)?(?:lock|device|supply|PSU|detector|camera)(?:\s+(?:terminals?|input))?/i.test(clause)?label:'');
  const stateMatch=clause.match(/\b(normal|standby|idle|release demand|alarm demand|alarm|release|IR(?:\/night)?(?: load)?|night(?: load)?|under load|full load|no load)\b/i);
  const circuitState=/isolated|de[- ]?energised|proved dead/i.test(clause)?'isolated':/energised.*disconnected|load disconnected/i.test(clause)?'energised_disconnected':/connected|energised/i.test(clause)?'energised_connected':'unknown';
  const source=/panel (?:display|shows|reading)|displayed/i.test(clause)?'panel':/meter|multimeter|instrument|measured/i.test(clause)?'meter':/reported|earlier|previous|history/i.test(clause)?'human_report':'unknown';
  const candidate={id:uid(),rawEntry:input,rawText:match[1],unit:unitName(match[2]),electricalMode:match[3]?.toUpperCase()||'',label,reference,operatingState:stateMatch?.[1]||'',circuitState,source,index,measurementText:match[0],points:label?[{label}]:[],historical:source==='human_report'};
  candidate.missing=readingMissing(candidate);return candidate;
 });
}
function readingMissing(input){
 const missing=[],observation=['observation','functional_test','panel_display','display','visual'].includes(input.testKind)||input.unit==='state',nonMeter=['panel','visual','human_report'].includes(input.source);
 if(!known(input.label)&&!array(input.points).some(point=>known(point.label||point.terminal||point.location)))missing.push('point');
 if(!observation&&!nonMeter&&!known(input.reference)&&array(input.points).filter(point=>known(point.label||point.terminal||point.location)).length<2)missing.push('reference');
 if(!known(input.operatingState))missing.push('operatingState');
 if(!observation&&!nonMeter&&(!known(input.circuitState)||input.circuitState==='unknown'))missing.push('circuitState');
 if(!known(input.source)||input.source==='unknown')missing.push('source');return missing;
}
function genericObservation(session,message,options={}){
 const id=options.eventId||uid();session.fieldVisit=addTestEvent(session.fieldVisit,{id,incidentId:session.diagnosticChat.incidentId,testKind:'observation',method:'engineer_free_text',eventTime:nowOf(options),result:{rawText:message,source:'engineer_observation',executionState:'recorded'},interpretation:{status:'reported',reason:'Free text is retained as an observation; it does not answer an unrelated check or establish a confirmed cause.'}},nowOf(options));return id;
}

/** Recognise explicit reports of immediate danger, never generic fault words. */
export function detectDiagnosticEmergencyReport(value){
 const input=text(value),sentences=input.split(/[.!\n]+/).filter(Boolean),reasons=[];
 for(const sentence of sentences){
  if(sentence.includes('?'))continue;
  if(/\b(?:real|actual|confirmed|active)\s+fire\b/i.test(sentence)&&!/\b(?:no|not|without|ruled out)\s+(?:(?:a|an|any|real|actual|confirmed|active)\s+)*fire\b/i.test(sentence))reasons.push('fire');
  if(/\b(?:smoke|burning)\s+(?:is\s+)?(?:coming|seen|visible|present|from)\b/i.test(sentence)&&!/\b(?:no|not|without)\s+(?:smoke|burning)\b/i.test(sentence))reasons.push(/burning/i.test(sentence)?'burning':'smoke');
  if(/\b(?:received|suffered|getting|got|had)\s+(?:an?\s+)?electric(?:al)?\s+shock\b/i.test(sentence)&&!/\b(?:no|not|never)\b.*\bshock\b/i.test(sentence))reasons.push('electricShock');
  if(/\b(?:required|emergency|escape|fire)\s+(?:exit|door)\b.*\b(?:cannot|can.t|won.t|will not|does not|failed to)\s+(?:be\s+)?(?:open(?:ed)?|release(?:d)?|used)\b/i.test(sentence)||/\b(?:required exit|escape route)\s+(?:is\s+)?(?:blocked|unusable)\b/i.test(sentence))reasons.push('requiredEscapeFailure');
 }
 return unique(reasons);
}

export function submitDiagnosticText(session,value,options={}){
 const next=mutate(session,options),chat=next.diagnosticChat,raw=text(safe(value)).trim();if(!raw)return next;
 if(options.id&&chat.handledInputIds.includes(options.id))return next;
 if(options.id)chat.handledInputIds.push(options.id);
 appendMessage(next,'user',raw,{kind:'input'},options);
 const dangers=detectDiagnosticEmergencyReport(raw);
 if(dangers.length){
  const eventId=genericObservation(next,raw,options),incident=currentIncident(next);
  incident.safety={...incident.safety,...Object.fromEntries(dangers.map(reason=>[reason,true])),emergencyResolved:false,riskEvidenceId:eventId,riskReason:raw};
  appendMessage(next,'assistant','An immediate danger has been reported. I have retained the exact words and stopped routine diagnostics. Record the site response, notification, time and responsible owner in the safety record.',{kind:'emergency',eventIds:[eventId]},options);
  return savePrompt(next,options);
 }
 const prompt=getDiagnosticPrompt(next);
 if(prompt.kind==='manual'){chat.lastError='Select a readable manual before starting diagnostic questions.';return savePrompt(next,options);}
 if(chat.status==='paused'||chat.status==='finished'){chat.lastError='Resume the saved visit before adding new observations.';return next;}
 if(prompt.kind==='system'){
  const normalized=raw.toLowerCase(),systems=SYSTEMS.filter(item=>item.value!=='several'&&(normalized.includes(item.value)||normalized.includes(item.label.toLowerCase()))).map(item=>item.value);
  if(/^(yes|correct|confirm)$/i.test(raw)&&array(chat.identity.systemTypes).length)return confirmDiagnosticIdentity(next,{step:'system',systemTypes:chat.identity.systemTypes},{...options,id:undefined});
  if(systems.length)return confirmDiagnosticIdentity(next,{step:'system',systemTypes:systems},{...options,id:undefined});
  chat.lastError='Choose Fire alarm, Access control, Intruder, CCTV or the applicable combined systems.';return next;
 }
 if(prompt.kind==='equipment'){
  if(/^(yes|correct|confirm)$/i.test(raw))return confirmDiagnosticIdentity(next,{},options);
  chat.identity.proposedCorrection=raw;chat.lastError='Review the model and equipment fields to apply this correction; the original manual suggestion remains in the transcript.';return next;
 }
 if(prompt.kind==='additional_manual_identity'){chat.lastError='Confirm the additional manual’s equipment and model to return to the pending question.';return next;}
 if(chat.phase==='fault'){
  incidentUpdate(next,{exactComplaint:raw,provenance:'engineer_report',currentSymptomState:'unknown'});next.message=raw;chat.phase='condition';
  genericObservation(next,raw,options);return savePrompt(next,options);
 }
 if(chat.phase==='condition'){
  const condition=/\b(?:unknown|not known|not established|don.t know|not sure|no idea|can.t tell|uncertain)\b/i.test(raw)?'unknown':/cleared|before.*arriv|no longer|not.*present|absent/i.test(raw)?'cleared_before_arrival':/intermittent|comes.*goes/i.test(raw)?'intermittent':/\b(?:present|active|happening|now)\b/i.test(raw)?'present':'';
  if(!condition){chat.lastError='Please establish present now, intermittent, cleared before arrival, or not known.';return next;}
  incidentUpdate(next,{currentSymptomState:condition});chat.phase='diagnosis';const routeId=chooseRoute(currentIncident(next));if(routeId)incidentUpdate(next,{routeId});
  return savePrompt(next,options);
 }
 if(prompt.kind==='test_prerequisite')return answerTestPreparation(next,raw,options);
 if(prompt.kind==='measurement'){
  const pending=chat.pendingReadings[0],missing=pending.missing[0];
  if(/^unknown|not known|not tested|inaccessible|skip|keep unverified/i.test(raw)){
   return recordDiagnosticMeasurement(next,{...pending,allowIncomplete:true,notes:[pending.notes,raw].filter(Boolean).join('\n')},options);
  }
  if(missing==='point'){pending.label=raw;pending.points=[{label:raw}];if(/\b(?:to|across|between|\+|0\s?V|L[-–]N|L[-–]PE|N[-–]PE)\b/i.test(raw))pending.reference=raw;}
  else if(missing==='reference')pending.reference=raw;
  else if(missing==='operatingState')pending.operatingState=raw;
  else if(missing==='circuitState')pending.circuitState=/isolated|de[- ]?energised|proved dead/i.test(raw)?'isolated':/disconnected/i.test(raw)?'energised_disconnected':/connected|energised/i.test(raw)?'energised_connected':'unknown';
  else if(missing==='source'){pending.source=/panel|display/i.test(raw)?'panel':/report|earlier|history/i.test(raw)?'human_report':/meter|instrument|fluke|megger|multimeter/i.test(raw)?'meter':'unknown';pending.instrument={id:raw};}
  pending.missing=readingMissing(pending);
  if(!pending.missing.length)return recordDiagnosticMeasurement(next,pending,options);
  return savePrompt(next,options);
 }
 if(/^correct(?:ion)?\b|^actually\b|^change (?:my|the|last|previous)/i.test(raw)){
  chat.pendingCorrection={rawText:raw,requestedAt:nowOf(options)};genericObservation(next,raw,options);return savePrompt(next,options);
 }
 const readings=parseDiagnosticReadings(raw);
 if(readings.length){
  // A clear Yes/No addresses only the current proposition; numeric observations
  // in the same message still need their own point/state provenance.
  const intent=prompt.kind==='question'?conversationalAnswer(raw):'',explicitAnswer=['yes','no','unknown'].includes(intent)?intent:null;
  if(explicitAnswer)next.fieldVisit=recordFieldAnswer(next.fieldVisit,{id:options.id?`${options.id}:answer`:uid(),incidentId:chat.incidentId,ruleId:prompt.fieldStep.rule.id,answer:explicitAnswer,now:nowOf(options)});
  chat.pendingReadings.push(...readings);genericObservation(next,raw,options);
  appendMessage(next,'assistant',`${explicitAnswer?'Your '+explicitAnswer+' answer is saved. ':''}I found ${readings.length} reading${readings.length===1?'':'s'}. I will keep the raw entry and establish the actual points and operating conditions before interpreting it.`,{kind:'measurement'},options);return savePrompt(next,options);
 }
 if(prompt.kind==='detail'){
  const eventId=genericObservation(next,raw,options);chat.details[prompt.key]={rawText:raw,eventId,recordedAt:nowOf(options),state:/unknown|don.t know/i.test(raw)?'unknown':/inaccessible|locked|cannot access/i.test(raw)?'blocked':'recorded'};
  return savePrompt(next,options);
 }
 if(prompt.kind==='route'&&getRoute(raw.toUpperCase()))return selectDiagnosticRoute(next,raw.toUpperCase(),options);
 if(raw==='choose_route'){incidentUpdate(next,{routeId:''});return savePrompt(next,options);}
 if(raw==='continue_observations'){chat.lastPromptSignature='';appendMessage(next,'assistant','Keep recording available observations and readings. The missing manual/configuration evidence remains outstanding; choose another supported route when useful.',{kind:'observation'},options);return next;}
 if(prompt.kind==='question'){
  const answer=conversationalAnswer(raw);
  if(answer)return answerDiagnosticQuestion(next,answer,{...options,alreadyMessaged:true,reason:answer==='blocked'?raw:undefined,observation:raw});
 }
 const eventId=genericObservation(next,raw,options);
 appendMessage(next,'assistant',prompt.kind==='emergency'?'The existing observation is saved. Routine diagnostic tests remain suspended while the emergency response is unresolved.':'Observation saved. It does not yet give a clear answer to the current question. Use a quick reply if the observation answers that specific check; otherwise keep it as supporting evidence.',{kind:'observation',eventIds:[eventId]},options);
 return savePrompt(next,options);
}

export function selectDiagnosticRoute(session,routeId,options={}){
 const next=mutate(session,options),route=getRoute(routeId);if(!route){next.diagnosticChat.lastError='Choose an available diagnostic route.';return next;}
 if(!usableManuals(next).length){next.diagnosticChat.lastError='Select a readable manual first.';return next;}
 incidentUpdate(next,{routeId});next.diagnosticChat.phase='diagnosis';
 appendMessage(next,'assistant',`Investigating: ${route.title}. This selects relevant questions; it is not a diagnosis.`,{kind:'route',routeId,ruleRevision:ROUTE_VERSION},options);
 return savePrompt(next,options);
}

export function answerDiagnosticQuestion(session,answer,options={}){
 const next=mutate(session,options),chat=next.diagnosticChat,prompt=getDiagnosticPrompt(next);
 if(prompt.kind!=='question')return submitDiagnosticText(next,answer,options);
 if(!['yes','no','unknown','blocked'].includes(answer)){chat.lastError='Choose Yes, No, I don’t know or Can’t test here.';return next;}
 if(answer==='blocked'&&!known(options.reason)){chat.lastError='Record why this check cannot be completed here.';chat.blockedReasonRequired=true;return next;}
 const id=options.eventId||options.id||uid();
 if(next.fieldVisit.events.some(event=>event.id===id))return next;
 next.fieldVisit=recordFieldAnswer(next.fieldVisit,{id,incidentId:chat.incidentId,ruleId:prompt.fieldStep.rule.id,answer,reason:options.reason,now:nowOf(options)});
 if(!options.alreadyMessaged)appendMessage(next,'user',answer==='blocked'?`Can’t test here: ${options.reason}`:ANSWERS.find(item=>item.value===answer).label,{kind:'answer',eventIds:[id]},options);
 if(known(options.observation)&&! /^(yes|no|unknown)$/i.test(options.observation))genericObservation(next,options.observation,{...options,eventId:undefined});
 chat.blockedReasonRequired=false;return savePrompt(next,options);
}

/** Explicit engineer context is provenance-bearing; PDF text never calls this. */
export function updateDiagnosticContext(session,patch={},options={}){
 const next=mutate(session,options),incident=currentIncident(next),safePatch=safe(patch);
 for(const key of ['context','permissions','safety'])if(safePatch[key])incident[key]={...object(incident[key]),...object(safePatch[key])};
 const eventId=genericObservation(next,options.note||'Engineer explicitly updated the recorded test prerequisites.',options);
 const event=next.fieldVisit.events.find(item=>item.id===eventId);event.testKind='prerequisite_record';event.contextPatch=clone(safePatch);event.interpretation={status:'engineer_recorded',reason:'Recorded permission and context do not establish competence or safe isolation. Each proposed test is screened separately.'};
 appendMessage(next,'assistant','The prerequisite record is saved. Each proposed test will be screened against its own points, state and applicable procedure.',{kind:'context',eventIds:[eventId]},options);
 return savePrompt(next,options);
}

export function recordDiagnosticMeasurement(session,input={},options={}){
 const next=mutate(session,options),chat=next.diagnosticChat;
 if(!usableManuals(next).length){chat.lastError='Select a readable manual first. Existing legacy logs remain available.';return next;}
 const candidate={...clone(input),label:input.label||input.point||input.points?.[0]?.location||input.points?.[0]?.label||'',rawText:input.rawText??input.value??input.result?.rawText??'',source:input.source||input.result?.source||'unknown'},missing=readingMissing(candidate);
 if(missing.length&&!input.allowIncomplete){chat.pendingReadings=[{...candidate,id:candidate.id||uid(),missing},...chat.pendingReadings.filter(item=>item.id!==candidate.id)];return savePrompt(next,options);}
 const incident=currentIncident(next),result=normalizeResult({rawText:candidate.rawText,unit:candidate.unit,source:candidate.source,executionState:input.executionState||(/^(?:unknown|not tested|inaccessible|blocked)$/i.test(text(candidate.rawText))?'not_tested':'performed')});
 const kind=input.testKind||(['Ω','kΩ','MΩ'].includes(candidate.unit)?'resistance':['A','mA'].includes(candidate.unit)?'current':['V','mV','V DC','V AC'].includes(candidate.unit)?'voltage':'measurement');
 const points=array(candidate.points).length?candidate.points:known(candidate.label)?[{label:candidate.label}]:[];
 const gate=evaluateTestEligibility(next.fieldVisit,incident,kind==='functional_test'?'functional':kind,{...candidate,points,reference:candidate.reference,source:candidate.source,historical:candidate.historical===true});
 const id=options.eventId||candidate.id||uid(),time=Object.hasOwn(candidate,'eventTime')?candidate.eventTime:nowOf(options);
 const event={id,incidentId:chat.incidentId,assetIds:clone(incident.assetRefs||[]),testKind:kind,method:candidate.method||'engineer_recorded_measurement',points,reference:text(candidate.reference),operatingState:candidate.operatingState||'unknown',circuitState:candidate.circuitState||'unknown',loadState:candidate.loadState||candidate.operatingState||'unknown',powerDomain:candidate.powerDomain||'unknown',instrument:object(candidate.instrument),eventTime:time,clockSource:'engineer_entry',result,rawEntry:candidate.rawEntry||text(candidate.rawText),electricalMode:candidate.electricalMode||'',notes:text(candidate.notes),sourceRefs:array(candidate.sourceRefs),historical:candidate.historical===true,interpretation:{status:gate.allowed&&!missing.length?'recorded_only':'method_unverified',reason:missing.length?`Missing ${missing.join(', ')}. The raw result is retained without a pass/fail or model verdict.`:gate.reason,missing:unique([...missing,...gate.missing])},...(candidate.supersedes?{supersedes:candidate.supersedes}:{}),...(candidate.repeats?{repeats:candidate.repeats}:{}),...(candidate.comparisonId?{comparisonId:candidate.comparisonId}:{}),...(candidate.verification?{verification:clone(candidate.verification)}:{})};
 try{next.fieldVisit=addTestEvent(next.fieldVisit,event,nowOf(options));}catch(error){chat.lastError=error.message;return next;}
 if(candidate.supersedes)reviewCorrectedEvidence(next,candidate.supersedes,id,options);
 chat.pendingReadings=chat.pendingReadings.filter(item=>item.id!==candidate.id);chat.pendingCorrection=null;
 appendMessage(next,'assistant',`Saved ${text(candidate.rawText)}${candidate.unit?' '+candidate.unit:''}${candidate.label?' at '+candidate.label:''}. ${event.interpretation.status==='method_unverified'?'The test method or conditions remain unverified.':'No equipment-specific pass limit has been assumed.'}${candidate.supersedes?' The original remains in the record; the correction is now the current reading.':''}`,{kind:'measurement_saved',eventIds:[id]},options);
 return savePrompt(next,options);
}

export function correctDiagnosticEvent(session,eventId,patch={},options={}){
 const next=mutate(session,options),original=next.fieldVisit.events.find(event=>event.id===eventId),chat=next.diagnosticChat;
 if(!original){chat.lastError='The original event is unavailable.';return next;}
 if(next.fieldVisit.events.some(event=>event.supersedes===eventId)){chat.lastError='Correct the latest entry in this correction chain.';return next;}
 if(original.incidentId!==chat.incidentId){chat.lastError='Choose a reading from the current incident.';return next;}
 if(original.testKind==='question_answer'){
  if(!['yes','no','unknown','blocked'].includes(patch.answer)){chat.lastError='Choose the corrected answer.';return next;}
  if(patch.answer==='blocked'&&!known(patch.reason)){chat.lastError='Record why the check is blocked.';return next;}
  const id=options.eventId||uid();next.fieldVisit=recordFieldAnswer(next.fieldVisit,{id,incidentId:chat.incidentId,ruleId:original.ruleId,answer:patch.answer,reason:patch.reason,now:nowOf(options)});
  const corrected=next.fieldVisit.events.find(event=>event.id===id);corrected.supersedes=eventId;corrected.correctionReason=patch.correctionReason||'Engineer correction';chat.pendingCorrection=null;
  reviewCorrectedEvidence(next,eventId,id,options);
  appendMessage(next,'assistant',`Answer corrected to ${patch.answer}. The earlier answer is retained, and the next question is recalculated from the current evidence.`,{kind:'correction',eventIds:[id,eventId]},options);return savePrompt(next,options);
 }
 return recordDiagnosticMeasurement(next,{...clone(original),...clone(patch),id:options.eventId||uid(),rawText:patch.rawText??patch.value??original.result?.rawText,unit:patch.unit??original.result?.unit,source:patch.source??original.result?.source,label:patch.label||patch.point||original.points?.[0]?.label||original.points?.[0]?.location||'',supersedes:eventId,allowIncomplete:true,rawEntry:patch.rawEntry||patch.rawText||patch.value||original.rawEntry,notes:[original.notes,patch.correctionReason||patch.notes||'Engineer correction'].filter(Boolean).join('\n')},options);
}

function reviewCorrectedEvidence(session,originalId,correctionId,options){
 const chat=session.diagnosticChat,incident=currentIncident(session),outcome=chat.outcome;
 for(const finding of array(incident.candidateFindings))if(array(finding.evidenceForIds).includes(originalId)){finding.reviewRequired=true;finding.correctionEventId=correctionId;}
 if(array(incident.verificationEventIds).includes(originalId)){incident.verificationState='review_required';incident.verificationCorrectionId=correctionId;}
 if(outcome&&(array(outcome.evidenceEventIds).includes(originalId)||array(outcome.retestEventIds).includes(originalId))){
  chat.outcomeHistory=[...array(chat.outcomeHistory),clone(outcome)];outcome.causeConfirmed=false;outcome.retestsPassed=false;outcome.reviewRequired=true;
  outcome.warnings=unique([...array(outcome.warnings),'A supporting event was corrected. Reassess the finding and functional verification against the latest evidence.']);
  incident.diagnosisState='review_required';session.fieldVisit.handover.outcome='finding_requires_review';session.fieldVisit.handover.restorationStatus='unverified';
  appendMessage(session,'assistant','This correction changes evidence used by the earlier finding. Cause confirmation and any affected restoration check now require review; the earlier conclusion remains in the history.',{kind:'correction_review',eventIds:[originalId,correctionId]},options);
 }
}

export function getDiagnosticEvidence(session){
 const incident=currentIncident(session),events=activeEvents(session.fieldVisit).filter(event=>event.incidentId===incident?.id),path=incident?.context?.path?localisePath(session.fieldVisit,incident.id):null;
 return {reportedFault:incident?.exactComplaint||'',condition:incident?.currentSymptomState||'unknown',routeId:incident?.routeId||'',supports:[routeNote(session),...(path?.localised?[path.reason]:[])],uncertain:unique([...(session.diagnosticChat?.identity?.observationsOnly?['Exact installed model remains unknown.']:[]),...events.filter(event=>event.interpretation?.status==='method_unverified').map(event=>`Reading ${event.id}: ${event.interpretation.reason}`),...(path&&!path.localised?[path.reason]:[]),...(!session.diagnosticChat?.outcome?.causeConfirmed?['The cause is not confirmed by the current recorded finding.']:[])]),measurements:events.filter(event=>['voltage','voltage_drop','resistance','continuity','current','measurement'].includes(event.testKind)),restoration:getRestorationStatus(session.fieldVisit),path,completedQuestionCount:events.filter(event=>event.testKind==='question_answer').length,outstanding:getDiagnosticPrompt(session)};
}

function confirmationEvidence(visit,ids){
 const current=activeEvents(visit),selected=array(ids).map(id=>current.find(event=>event.id===id)).filter(Boolean);
 const unsuitable=selected.filter(event=>event.historical||['reset','power_cycle','substitution','question_answer','prerequisite_record'].includes(event.testKind)||event.interpretation?.status==='method_unverified'||event.result?.executionState!=='performed'||!['meter','instrument','panel','visual'].includes(event.result?.source)||/^(?:reset|reboot|power[- ]?cycl|cleared after reset|fault cleared|working after reset)/i.test(event.result?.rawText||''));
 return {selected,valid:selected.length>0&&selected.length===array(ids).length&&!unsuitable.length};
}

/** Finish never fabricates confirmation or reinstatement; validation is visible. */
export function finishDiagnosticChat(session,input={},options={}){
 const next=mutate(session,options),chat=next.diagnosticChat,incident=currentIncident(next),at=nowOf(options);
 const outcome=input.outcome==='give_up'?'give_up':input.outcome==='found'?'found':'';
 if(!outcome){chat.lastError='Choose Fault found or Give up.';return next;}
 if(outcome==='found'&&!usableManuals(next).length){chat.lastError='A readable manual is required before recording a new diagnostic finding. You can give up with “Missing manual” and retain the visit for handover.';return next;}
 input={...input,evidenceEventIds:input.evidenceEventIds||input.evidenceIds||[],retestEventIds:input.retestEventIds||[]};
 const evidence=confirmationEvidence(next.fieldVisit,input.evidenceEventIds),cause=text(input.cause||input.confirmedCause),confirmation=text(input.confirmation||input.confirmingEvidence),action=text(input.action||input.workCompleted),reason=text(input.reason);
 if(outcome==='give_up'&&!known(reason)){chat.lastError='Record why the investigation stopped.';return next;}
 const warnings=[];
 let causeConfirmed=outcome==='found'&&known(cause)&&known(confirmation)&&evidence.valid&&input.engineerConfirmed===true;
 if(outcome==='found'&&!causeConfirmed)warnings.push('The recorded cause remains unconfirmed. Confirmation needs an identified cause, a discriminating observation/test linked to this visit, and engineer confirmation; reset or temporary recovery alone is insufficient.');
 const retestIds=array(input.retestEventIds),retests=activeEvents(next.fieldVisit).filter(event=>retestIds.includes(event.id)),retestsPassed=retests.length>0&&retests.length===retestIds.length&&retests.every(event=>event.result?.executionState==='performed'&&event.verification?.passed===true&&!event.historical&&event.interpretation?.status!=='method_unverified');
 incident.diagnosisState=causeConfirmed?'cause_confirmed':'unresolved';
 if(causeConfirmed)incident.candidateFindings=[...array(incident.candidateFindings),{id:uid(),text:cause,state:'cause_confirmed',evidenceForIds:array(input.evidenceEventIds),confirmation,verifiedBy:input.verifiedBy||next.fieldVisit.engineerRef||'engineer_on_visit',recordedAt:at,limits:'Cause confirmation is separate from repair, functional retest and restoration.',ruleRevision:DIAGNOSTIC_CHAT_VERSION}];
 if(retestsPassed){incident.verificationState='function_restored';incident.verificationEventIds=retestIds;}
 next.fieldVisit.handover={...next.fieldVisit.handover,outcome:causeConfirmed?'cause_confirmed':outcome==='give_up'?'paused_unresolved':'finding_unconfirmed',summary:input.summary||cause||reason,nextAction:text(input.nextAction||input.returnRequirements),owner:text(input.owner),reviewBy:text(input.reviewBy),systemLeft:text(input.systemLeft),impairmentAccepted:input.impairmentAccepted===true,siteAcknowledgement:text(input.siteAcknowledgement),monitoringAcknowledgement:text(input.monitoringAcknowledgement),monitoringNotApplicable:input.monitoringNotApplicable===true,verificationEventIds:retestIds,workCompleted:action};
 const restoration=getRestorationStatus(next.fieldVisit);next.fieldVisit.handover.restorationStatus=restoration.status;
 if(!restoration.fullyRestored)warnings.push(restoration.reason);
 const outstandingPrompt=getDiagnosticPrompt(next);
 chat.outcome={type:outcome,cause,confirmation,causeConfirmed,evidenceEventIds:array(input.evidenceEventIds),action,retestEventIds:retestIds,retestsReported:text(input.retests),retestsPassed,reason,returnRequirements:text(input.returnRequirements||input.nextAction),restoration:clone(restoration),warnings,recordedAt:at,outstandingQuestion:{key:outstandingPrompt.key,text:outstandingPrompt.text,sourceRefs:outstandingPrompt.sourceRefs||[]},awaitingParts:input.awaitingParts===true};
 chat.status=outcome==='give_up'?'paused':'finished';next.fieldVisit.state=outcome==='give_up'?'paused':'review';next.unresolved=!causeConfirmed||!restoration.fullyRestored;
 appendMessage(next,'assistant',outcome==='give_up'?`Investigation paused: ${reason}. The conversation, readings and next check are saved for the next engineer.`:`Finding recorded: ${cause||'cause not specified'}. Cause ${causeConfirmed?'confirmed by the linked evidence':'unconfirmed'}; restoration ${restoration.fullyRestored?'verified':'not fully verified'}.${input.awaitingParts?' Awaiting parts.':''}`,{kind:'outcome',warnings},options);
 return savePrompt(next,options);
}

export function resumeDiagnosticChat(session,options={}){
 const next=mutate(session,options);next.diagnosticChat.status='open';next.fieldVisit.state='open';next.diagnosticChat.lastPromptSignature='';
 appendMessage(next,'assistant','Visit resumed. Earlier evidence is retained with its original time and source; it is not a fresh retest.',{kind:'resume'},options);return savePrompt(next,options);
}

export function getDiagnosticReport(session,options={}){
 const next=ensureDiagnosticChat(session,options),chat=next.diagnosticChat,format=options.format||'text';
 next.fieldVisit.diagnosticConversation={schemaVersion:1,engineVersion:chat.engineVersion,routeVersion:chat.routeVersion,identity:clone(chat.identity),manuals:chat.manuals.map(({pages,...manual})=>({...manual,pages:pages.map(page=>({page:page.page,method:page.method,quality:page.quality})),referencedExcerpts:chat.messages.flatMap(message=>array(message.sourceRefs)).filter(ref=>ref.contentHash===manual.contentHash)})),transcript:clone(chat.messages),outcome:clone(chat.outcome||null),pendingReadings:clone(chat.pendingReadings),pendingCorrection:clone(chat.pendingCorrection),details:clone(chat.details)};
 const parsed=JSON.parse(exportFieldVisit(next,{format:'json',redact:options.redact!==false})),visit=parsed.visit,conversation=visit.diagnosticConversation;
 if(format==='json')return JSON.stringify({...parsed,format:'findr-diagnostic-visit',diagnosticSchemaVersion:1},null,2);
 const incident=visit.incidents.find(item=>item.id===chat.incidentId),outcome=conversation.outcome;
 if(format==='short')return [`FINDR handover — ${visit.siteRef||'site not recorded'}`,`${incident?.exactComplaint||'Fault not recorded'}; on arrival: ${incident?.currentSymptomState||'unknown'}.`,`Equipment: ${[conversation.identity.manufacturer,conversation.identity.model,conversation.identity.variant].filter(Boolean).join(' ')||'unconfirmed'}.`,outcome?`Cause ${outcome.causeConfirmed?'confirmed':'unconfirmed'}: ${outcome.cause||outcome.reason||'not established'}.`:'Cause unconfirmed.',`Readings: ${activeEvents(visit).filter(event=>['voltage','resistance','current','measurement'].includes(event.testKind)).map(event=>`${event.points?.[0]?.label||event.points?.[0]?.location||'point unknown'} ${event.result.rawText} ${event.result.unit||''} (${event.operatingState}; ${event.interpretation.status})`).join('; ')||'none recorded'}.`,`Restoration: ${visit.handover.restorationStatus||'unverified'}; outstanding impairments: ${getRestorationStatus(visit).unresolved.length}.`,`Next: ${outcome?.returnRequirements||outcome?.outstandingQuestion?.text||getDiagnosticPrompt(next).text}`,`Owner/review: ${visit.handover.owner||'not recorded'} / ${visit.handover.reviewBy||'not recorded'}.`].join('\n');
 const fieldText=exportFieldVisit(next,{format:'text',redact:options.redact!==false});
 return [fieldText,'\nMANUALS USED',...conversation.manuals.map(manual=>`${manual.title} · ${manual.equipmentRole} · revision ${manual.identity?.revision||'not stated'} · SHA-256 ${manual.contentHash} · processor ${manual.processorVersion}`),'\nDIAGNOSTIC OUTCOME',JSON.stringify(outcome||{causeConfirmed:false,restoration:'unverified'},null,2),'\nCOMPLETE CONVERSATION',...conversation.transcript.flatMap(message=>[`${new Date(message.createdAt).toISOString()} · ${message.role.toUpperCase()}`,message.text,...array(message.sourceRefs).map(ref=>`  ${ref.title}, page ${ref.page}, revision ${ref.revision||'not stated'}: ${ref.excerpt}`)])].join('\n');
}
