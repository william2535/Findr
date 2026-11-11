// A conversation may ask for several operations. Search and assess each one
// independently; an absent device procedure must not erase a supported panel
// procedure. A task is a request, never evidence that work was performed.
import {buildManualIndex, retrieveManualPassages} from './manual-retrieval.mjs';
import {prepareManualAnswer, normaliseManualQuote} from './manual-answers.mjs';
import {normalizeHelperDialogue, taskQuery, updateHelperTaskEvidence} from './helper-dialogue.mjs';

export const HELPER_TASK_EVIDENCE_VERSION='2026-11-11.1';
const list=value=>Array.isArray(value)?value:[];
const str=value=>String(value??'');
const compact=value=>str(value).normalize('NFC').replace(/\u0000/g,'').replace(/\s+/g,' ').trim();
const fold=value=>compact(value).toLowerCase();
const unique=values=>[...new Set(values.filter(Boolean))];
const words=value=>(fold(value).match(/[\p{L}\p{N}][\p{L}\p{N}_.+-]*/gu)||[]).map(value=>value.replace(/[.]+$/,''));
const stem=value=>value.length>3&&!/\d/.test(value)?value.replace(/s$/,''):value;
const generic=new Set('a an the it this that old new one all each them of for with on at in my our your please how do i'.split(' '));
const controls=value=>/(?:ignore|override|disregard).{0,45}(?:system|developer|previous|earlier).{0,30}(?:prompt|instructions)|(?:system|developer) prompt|reveal.{0,25}(?:secret|api.?key)|(?:execute|run).{0,20}(?:javascript|shell command|script)|(?:read|access).{0,25}other helpers?/i.test(str(value));
const ACTIONS={start:/\bstart\w*|\bbegin\w*/i,stop:/\bstop\w*|\bcancel\w*|\bexit\w*|\bend (?:the )?(?:walk )?test\b/i,disable:/\bdisabl\w*|\binhibit\w*/i,isolate:/\bisolat\w*/i,bypass:/\bbypass\w*/i,enable:/\benabl\w*|\bre[ -]?enabl\w*/i,replace:/\breplac\w*|\bswap\w*/i,test:/\btest\w*/i,view:/\bview\w*|\bhistory\b|\blog\b|\bdisplay\w*/i,connect:/\bconnect\w*|\bwiring\b|\bterminal\w*/i,disconnect:/\bdisconnect\w*|\bisolat\w*/i,restore:/\brestor\w*|\bre[ -]?enabl\w*/i,configure:/\bconfigur\w*|\bprogram\w*|\bsettings?\b/i};
const ALIASES={device:['device','detector','input','point','address'],detector:['detector','sensor','input'],output:['output','sounder'],sounder:['sounder','audible'],psu:['psu','power','supply'],recorder:['recorder','nvr','dvr'],nvr:['nvr','recorder'],dvr:['dvr','recorder'],history:['history','event','log'],input:['input','detector'],walktest:['walk','test']};
const isPhysical=task=>['start','stop','disable','isolate','bypass','enable','replace','connect','disconnect','measure','restore','test'].includes(task.action);
const electricalQuantity=/\b(?:voltage|volts?|amperage|amps?|resistance|ohms?|continuity|insulation resistance|(?:input|output|supply|load|loop|device|charging|standby|alarm|battery|mains|dc|ac) current|current (?:draw|consumption|rating))\b/i;
function measurementTask(task,passages){
 if(task.action==='measure'||['inspect','verify','test'].includes(task.action)&&electricalQuantity.test(task.target))return true;
 // “Check” and “verify” can describe a measurement without using “measure”.
 // Also inspect the selected source: a visual-check answer must not reproduce
 // a neighbouring voltage/continuity instruction as ordinary information.
 return list(passages).some(p=>compact(p.text).split(/[.!?](?:\s+|$)/).some(sentence=>{
  const instructed=/\b(?:check|verify|inspect|test|measure|read|take|record|probe|meter|confirm)\b/i.test(sentence);
  return instructed&&(electricalQuantity.test(sentence)||/\b\d+(?:\.\d+)?\s*(?:V(?:DC|AC)?|mA|A|Ω|ohms?)\b/i.test(sentence)||/\b(?:across|between)\b.{0,90}(?:\b(?:terminals?|conductors?|positive|negative)\b|[+−])/i.test(sentence))||/\b(?:connect|place|put|touch|hold|apply)\b.{0,65}\b(?:multimeter|ohmmeter|voltmeter|meter probes?|test (?:leads|probes))\b|\b(?:multimeter|ohmmeter|voltmeter|meter probes?|test (?:leads|probes))\b.{0,65}\b(?:across|between|connected|terminals?|conductors?)\b/i.test(sentence);
 }));
}
const title=task=>{const value=compact(task.action+' '+task.target);return value?value[0].toUpperCase()+value.slice(1):'Requested task';};
const refKey=ref=>[ref.manualId,ref.contentHash,ref.page,ref.quote].join(':');
const sourceRefs=refs=>[...new Map(refs.map(ref=>[refKey(ref),ref])).values()].map((ref,index)=>({...ref,citationId:'S'+(index+1)}));

function selectedIndexes(helper,indexes,analyses,scopeIndexes){
 const selected=new Set(list(helper?.selectedManualIds)),states=helper?.manualStates||{};
 const rows=typeof scopeIndexes==='function'?scopeIndexes(helper,indexes,analyses):list(indexes).length?indexes:analyses.map(buildManualIndex);
 return list(rows).filter(index=>selected.has(index.manualId)&&index.contentHash&&(!states[index.manualId]?.contentHash||states[index.manualId].contentHash===index.contentHash)&&(!states[index.manualId]?.status||states[index.manualId].status==='ready')).map(index=>{
  const analysis=list(analyses).find(a=>a.manualId===index.manualId&&a.contentHash===index.contentHash);
  return {...index,passages:list(index.passages).filter(p=>{
   const page=analysis?.pages?.find(item=>item.page===p.page);
   return p.manualId===index.manualId&&p.contentHash===index.contentHash&&Number.isInteger(p.page)&&p.page>0&&compact(p.text)&&!controls(p.text)&&(!analysis||analysis.usable!==false&&page&&page.quality?.readable!==false&&!controls(page.text)&&normaliseManualQuote(page.text).includes(normaliseManualQuote(p.text)));
  })};
 });
}
function scopedAnalyses(indexes,analyses){
 return indexes.map(index=>{
  const original=list(analyses).find(a=>a.manualId===index.manualId&&a.contentHash===index.contentHash),pages=new Map();
  for(const p of index.passages){if(!pages.has(p.page))pages.set(p.page,[]);pages.get(p.page).push(p);}
  return {...(original||{}),manualId:index.manualId,contentHash:index.contentHash,processorVersion:index.processorVersion,title:index.title,identity:index.identity,usable:true,pages:[...pages].map(([number,parts])=>{
   const page=original?.pages?.find(p=>p.page===number),text=page?.text||parts.sort((a,b)=>(a.offset||0)-(b.offset||0)).map(p=>p.text).join('\n');
   return {...page,page:number,text,method:page?.method||(parts.some(p=>p.method==='ocr')?'ocr':'text'),quality:{readable:page?.quality?.readable!==false}};
  }).filter(page=>page.quality.readable&&!controls(page.text))};
 });
}
function refFrom(p){return {sourceId:p.id,manualId:p.manualId,contentHash:p.contentHash,processorVersion:p.processorVersion||'',title:p.title||'Saved manual',revision:p.revision||'',models:list(p.models),page:p.page,pdfPage:p.page,printedPage:p.printedPage??null,section:p.section||null,method:p.method||'text',requiresSourceReview:p.method==='ocr',quote:compact(p.text),excerpt:compact(p.text),relationship:'Exact saved-manual text for this requested task. A reference does not record completed work.'};}
function verifiedRef(ref,sources){return list(sources).some(a=>a.manualId===ref.manualId&&a.contentHash===ref.contentHash&&list(a.pages).some(p=>p.page===ref.page&&p.quality?.readable!==false&&!controls(p.text)&&normaliseManualQuote(p.text).includes(normaliseManualQuote(ref.quote||ref.excerpt))));}

// The narrowest target wins. A request to replace a detector cannot be answered
// by an LCD/chassis replacement paragraph that merely shares the verb.
export function helperTaskMatchesPassage(task,passage){
 const text=compact(passage?.text),action=ACTIONS[task.action],target=words(task.target).filter(word=>!generic.has(word)),sourceWords=new Set(words(text).map(stem));
 if(!text||controls(text)||action&&!action.test(text))return false;
 if(!target.length)return false;
 const matches=target.filter(word=>[stem(word),...list(ALIASES[stem(word)])].some(term=>sourceWords.has(stem(term))));
 if(matches.length<Math.min(2,target.length))return false;
 if(target.some(word=>/\d/.test(word)&&!sourceWords.has(stem(word))))return false;
 if(task.action==='replace'&&target.every(word=>/^(?:device|detector|sensor|point)$/.test(stem(word)))&&! /\breplac(?:e|ing|ement of)\s+(?:(?:an?|the|existing|old|faulty|addressable)\s+)*(?:field device|device|detector|sensor)\b|\b(?:field device|device|detector|sensor)\s+replacement\b/i.test(text))return false;
 return true;
}
function taskRecipeMatches(recipe,task){
 const match=recipe?.task;
 // A legacy walk-test recipe describes starting a test. A stop request must
 // never fall through to those start steps merely because both mention testing.
 if(!match)return !['stop','isolate','bypass'].includes(task.action);
 if(match.extent==='all'&&/\b(?:selected|only|this|these|those|one|(?:i|we) disabled|previously disabled)\b/i.test(task.target))return false;
 return list(match.actions).includes(task.action)&&list(match.targets).some(target=>{
  const required=words(target).map(stem),provided=words(task.target).map(stem);return required.length&&required.every(word=>provided.includes(word));
 });
}
function samePageContext(passage,indexes){
 const index=indexes.find(i=>i.manualId===passage.manualId&&i.contentHash===passage.contentHash);
 // Keep chunks intact and in source order; no cross-page or cross-document
 // warning can silently supply a prerequisite missing from this operation.
 return list(index?.passages).filter(p=>p.page===passage.page).sort((a,b)=>(a.offset||0)-(b.offset||0));
}
function quoteableOperationContext(task,context,query,hasRequiredPrecautions){
 if(typeof hasRequiredPrecautions!=='function'||!context.length)return false;
 const body=context.map(p=>compact(p.text)).join('\n');if(body.length>4400)return false;
 const targets=words(task.target).filter(word=>!generic.has(word)).map(stem);
 const aboutTarget=text=>{const tokens=new Set(words(text).map(stem));return targets.length&&targets.every(word=>tokens.has(word)||list(ALIASES[word]).some(alias=>tokens.has(stem(alias))));};
 // Same-page placement alone is insufficient: each preserved chunk and both
 // the precaution and consequence statements must explicitly name this task's
 // target. A warning for a neighbouring component cannot enable an instruction.
 if(context.some(p=>!aboutTarget(p.text)))return false;
 const statements=body.split(/[.!?\n]+/).filter(Boolean);
 const precautions=statements.some(text=>aboutTarget(text)&&/\b(?:warning|caution|before|authorised|authorized|qualified|must not|do not)\b/i.test(text));
 const effects=statements.some(text=>aboutTarget(text)&&/\b(?:will not|cannot|unable to|not (?:detect|operate|sound|activate)|loss of|unprotected)\b|\bprotection\b.{0,35}\b(?:lost|disabled|reduced|impaired)|\balarm\b.{0,35}\b(?:disabled|suppressed|prevented)/i.test(text));
 return precautions&&effects&&hasRequiredPrecautions(query,context)===true;
}
function outputChoices(passages){
 const body=passages.map(p=>p.text).join('\n'),choices=[];
 for(const [pattern,label]of [[/\bsounders?\b/i,'Sounders'],[/\bfire routing\b/i,'Fire routing'],[/\bfire protection\b/i,'Fire protection'],[/\binput\b/i,'An input device']])if(pattern.test(body))choices.push(label);
 return choices.filter(label=>label!=='An input device');
}
function ambiguousTask(task,passages){
 const target=fold(task.target).replace(/^(?:the|all|my|our)\s+/,''),refs=sourceRefs(passages.filter(p=>/\b(?:sounder|fire routing|fire protection|input|output)/i.test(p.text)).slice(0,4).map(refFrom));
 if(['disable','enable','restore'].includes(task.action)&&/^(?:outputs?|output devices?)$/.test(target))return {status:'clarification',text:'I found output-control references, but “outputs” does not tell me which kind you intend to '+task.action+'.',question:'Which outputs do you mean?',quickReplies:outputChoices(passages),sourceRefs:refs,reason:'output_type_required'};
 if(['disable','enable','restore'].includes(task.action)&&/^(?:(?:old|new)\s+)?(?:devices?|one)$/.test(target))return {status:'clarification',text:'I need the device type and model to find its control instructions.',question:'What type and model is the device you’re working on?',quickReplies:[],sourceRefs:refs,reason:'device_role_required'};
 return null;
}
function knownSourceContradiction(task,passages){
 if(!/fire protection/i.test(task.target))return null;
 const conflict=passages.find(p=>/Fire Protection Outputs/i.test(p.text)&&/select.{0,50}FIRE ROUTING OUTPUT/i.test(p.text));
 return conflict?{status:'clarification',reason:'source_conflict',text:'This page’s “Fire Protection Outputs” heading and “FIRE ROUTING OUTPUT” instruction conflict. I can’t establish the correct path from that wording.',question:'Can you add the applicable corrected manual or confirm the displayed menu with the manufacturer?',quickReplies:[],sourceRefs:[refFrom(conflict)]}:null;
}
function missingTask(task,refs=[]){
 const replacement=task.action==='replace',measurement=task.action==='measure';
 return {status:'missing_manual',reason:replacement?'replacement_procedure_missing':measurement?'measurement_procedure_missing':'task_not_established',text:replacement?'I haven’t found the replacement procedure for this device in the selected manuals. The panel-control instructions do not establish how to replace the device.':measurement?'These manuals do not establish the required measurement points, conditions and limits for that test.':'I can’t establish this part from the selected manuals.',question:replacement?'Which exact device model and protocol are you replacing? Add its installation or service manual if it isn’t saved here.':measurement?'Which component, measurement points and operating condition do you mean?':'Can you add the applicable manual or tell me the exact model and operation?',quickReplies:[],sourceRefs:refs};
}

function assessTask({task,helper,conversation,dialogue,indexes,analyses,procedures,retrieve,prepareAnswer,findConflicts,hasRequiredPrecautions}){
 const query=taskQuery(task,{helper,dialogue}),equipment=[{manufacturer:helper.scope?.brand||helper.scope?.manufacturer||'',model:conversation.context?.confirmedModel||helper.scope?.model||'',variant:conversation.context?.confirmedVariant||helper.scope?.variant||'',models:list(helper.scope?.models)}];
 const found=typeof retrieve==='function'?retrieve({helper,conversation,question:query,indexes,analyses,limit:6}):retrieveManualPassages(indexes,query,{equipment,limit:8,maxCharacters:9000});
 const allowed=new Set(indexes.flatMap(i=>i.passages.map(p=>p.id))),passages=list(found).filter(p=>allowed.has(p.id)&&helperTaskMatchesPassage(task,p));
 const context=passages.length?samePageContext(passages[0],indexes):[],contradiction=knownSourceContradiction(task,context),ambiguity=ambiguousTask(task,passages);
 const base={id:task.id,taskId:task.id,action:task.action,target:task.target,title:title(task),query,performed:false};
 const comparison=typeof findConflicts==='function'?list(findConflicts(passages)).filter(item=>list(item.sourceRefs).length&&item.sourceRefs.every(ref=>verifiedRef(ref,analyses)&&passages.some(p=>p.manualId===ref.manualId&&p.contentHash===ref.contentHash&&p.page===ref.page))):[];
 if(comparison.length)return {...base,status:'clarification',reason:'source_conflict',coverage:'conflicting_or_different_editions',text:unique(comparison.map(item=>compact(item.text))).join('\n\n'),question:'Which document edition and installed variant are you working with?',quickReplies:['I don’t know'],sourceRefs:sourceRefs(comparison.flatMap(item=>item.sourceRefs)),conflicts:comparison};
 if(contradiction)return {...base,...contradiction};
 if(ambiguity)return {...base,...ambiguity};
 const pack=Array.isArray(procedures)?{procedures}:procedures||{},selectedRecipes=list(pack.procedures).filter(recipe=>taskRecipeMatches(recipe,task));
 const prepared=prepareAnswer({question:query,analyses,equipment,context:{},procedures:{...pack,procedures:selectedRecipes}});
 if(prepared.status==='scope_required')return {...base,status:'clarification',reason:'variant_required',text:'The documented steps depend on the installed variant.',question:prepared.clarification?.text||'Which variant is installed?',quickReplies:list(prepared.clarification?.options).map(o=>o.label),sourceRefs:[]};
 if(prepared.status==='answered'&&prepared.coverage==='reviewed_manual_procedure'&&list(prepared.sourceRefs).length&&prepared.sourceRefs.every(ref=>verifiedRef(ref,analyses)))return {...base,status:'documented',reason:'verified_procedure',text:prepared.text,sourceRefs:prepared.sourceRefs,steps:list(prepared.steps),procedureId:prepared.procedureId,coverage:prepared.coverage};
 const measurement=measurementTask(task,context.length?context:passages);
 if(!passages.length)return {...base,...missingTask(measurement?{...task,action:'measure'}:task)};
 const refs=sourceRefs(context.length?context.map(refFrom):passages.slice(0,2).map(refFrom));
 if(measurement)return {...base,...missingTask({...task,action:'measure'},refs),reason:'measurement_prerequisites_unverified',text:'I found a measurement reference, but I haven’t verified the complete applicable test procedure, including its exact points, operating conditions and prerequisites. Keep the cited page as a reference until those details are established.',coverage:'measurement_reference_only'};
 if(task.action==='replace')return {...base,...missingTask(task,refs)};
 const selected=passages[0],ref=refFrom(selected),physical=isPhysical(task)||/\b(?:disconnect|remove (?:the )?cover|live test|mains (?:terminals|connections)|measure.{0,25}(?:voltage|resistance)|bypass|short (?:out|across)|disable (?:the )?(?:zone|sounder|output|device))\b/i.test(selected.text),quoteContext=physical&&quoteableOperationContext(task,context,query,hasRequiredPrecautions);
 const text=quoteContext?'The manual gives the following wording, including its stated conditions and effects. This is a source extract, not a verified complete procedure:\n\n'+context.map(p=>compact(p.text)).join('\n\n'):physical?'I found a relevant manual page. These extracts have not been verified as the complete procedure, including its conditions and effects. Open the source page before using it.':'The saved manual says:\n\n'+ref.quote;
 return {...base,status:'reference_only',reason:'unreviewed_extract',text,sourceRefs:physical?refs:[ref],coverage:quoteContext?'verbatim_manual_context':'verbatim_manual_reference',...(physical?{question:'Which part of this operation do you need clarified?',quickReplies:[]}:{})};
}

/** Pure local assembly. `retrieve` and `scopeIndexes` are the existing helper
 * engine boundaries; callbacks avoid circular imports. Technical answers are
 * reviewed source claims or exact references, never generated instructions. */
export function answerHelperTasks({helper={},conversation={},dialogue={},interpretation={},indexes=[],analyses=[],procedures=[],retrieve,scopeIndexes,prepareAnswer=prepareManualAnswer,findConflicts,hasRequiredPrecautions}={}){
 let state=normalizeHelperDialogue(dialogue);if(!state.tasks.length)return null;
 if(interpretation.needsClarification){
  const text=compact(interpretation.clarification)||'Which part should I change, and what should it refer to?';
  const component=interpretation.clarificationKind==='component',evidence=interpretation.clarificationKind==='evidence';
  return {text,kind:'clarification',coverage:'dialogue_clarification',tasks:[],sourceRefs:[],quickReplies:[],dialogue:state,pendingQuestion:{field:component?'component_question':evidence?'task_observation':'task_correction',key:component?'component-question':evidence?'task-observation':'task-correction',text,...(component?{component:interpretation.component}:{}),...(evidence?{evidenceKind:interpretation.evidenceKind}:{})},retrieval:'not_requested_pending_clarification',interpretationPolicy:'The existing task plan is unchanged until the requested clarification is clear.'};
 }
 const scoped=selectedIndexes(helper,indexes,analyses,scopeIndexes),sources=scopedAnalyses(scoped,analyses),results=state.tasks.map(task=>assessTask({task,helper,conversation,dialogue:state,indexes:scoped,analyses:sources,procedures,retrieve,prepareAnswer,findConflicts,hasRequiredPrecautions}));
 for(const result of results)state=updateHelperTaskEvidence(state,result.taskId,{coverage:{documented:'supported',reference_only:'partial',missing_manual:'missing',clarification:'needs_clarification'}[result.status],sourceRefs:result.sourceRefs,missingInformation:result.status==='documented'?[]:[result.reason]});
 const focused=Number.isInteger(state.focusTask)&&['followup','correction','clarification'].includes(interpretation.intent||state.lastIntent)?state.focusTask:null,shown=focused?results.filter((_,index)=>index===focused-1):results;
 const intro=focused?'Let’s take part '+focused+': '+title(state.tasks[focused-1])+'.':results.length>1?'Got it. You’re asking about '+results.length+' parts:':'I’ll check that in your saved manuals.';
 const sections=shown.map(result=>{const number=results.indexOf(result)+1;return number+'. '+result.title+'\n'+result.text;}),pending=shown.find(item=>item.status==='clarification'&&item.question)||shown.find(item=>item.status==='missing_manual'&&item.question)||null;
 const refs=sourceRefs(shown.flatMap(result=>list(result.sourceRefs))),warnings=refs.some(ref=>ref.requiresSourceReview)?['Some source text was read with OCR. Check the page image before relying on numbers or symbols.']:[];
 const text=[intro,...sections,pending?.question,...warnings].filter(Boolean).join('\n\n');
 return {text,kind:'task_answer',coverage:'per_task_manual_evidence',tasks:results,sourceRefs:refs,quickReplies:pending?.quickReplies||[],dialogue:state,warnings,...(pending?{pendingQuestion:{field:'task_detail',taskId:pending.taskId,key:'task-detail:'+pending.taskId,text:pending.question,sourceRefs:pending.sourceRefs}}:{}),retrieval:'per_task_scoped_manual_evidence',interpretationPolicy:'Task labels interpret the request. Only verified saved-manual claims supply procedures; task coverage does not mean work was performed.'};
}
