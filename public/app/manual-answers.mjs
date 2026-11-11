// Direct answers from locally read manuals. A reviewed paraphrase is released
// only for its pinned PDF bytes AND the supporting text on every cited page.
// Other manuals can supply exact extracts, never invented menu paths or limits.
import {assessPageText} from './manual-analysis-core.mjs';
import {retrieveManualPassages} from './manual-retrieval.mjs';
import {manualMatchesQuickIntent} from './question-manual-search.mjs';

export const MANUAL_ANSWERS_VERSION='2026-11-10.2';
const list=value=>Array.isArray(value)?value:[];
const str=value=>String(value??'');
const compact=value=>str(value).normalize('NFC').replace(/\u0000/g,'').replace(/\s+/g,' ').trim();
const unique=values=>[...new Set(values.filter(Boolean))];
const modelKey=value=>compact(value).toLowerCase().replace(/[\s_/-]+/g,'');
const fold=value=>compact(value).toLowerCase().replace(/[-–—]/g,' ');
const controlInstruction=value=>/(?:ignore|override|disregard).{0,35}(?:system|developer|previous|earlier).{0,25}(?:prompt|instructions)|(?:system|developer) prompt|reveal.{0,20}(?:secret|api.?key)|execute.{0,20}(?:javascript|script)/i.test(str(value));

// Typography varies between PDF.js, Poppler and OCR. Only harmless quote,
// spacing and check-mark differences are normalised: letter case, numeric
// values, units, signs and the order of words must still match exactly.
export function normaliseManualQuote(value){
 return compact(value).replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[✓✔]/g,'✔').replace(/\u00ad/g,'');
}
function readable(page){return page?.quality?.readable===true||page?.quality?.readable!==false&&assessPageText(str(page?.text),page||{}).readable;}
const usable=analysis=>!!analysis&&analysis.usable!==false&&str(analysis.contentHash).trim()&&list(analysis.pages).some(p=>p&&Number.isInteger(p.page)&&p.page>0&&readable(p));
const recipeList=value=>Array.isArray(value)?value:list(value?.procedures);
const equipmentList=value=>Array.isArray(value)?value:value?[value]:[];

function refFrom(analysis,ref,manual={}){
 const page=list(analysis.pages).find(p=>p?.page===ref.page),quote=compact(ref.quote),models=list(manual.models).length?manual.models:list(analysis.identity?.models).length?analysis.identity.models:analysis.identity?.model?[analysis.identity.model]:[];
 return {sourceId:`${analysis.contentHash}:pdf-${ref.page}`,manualId:analysis.manualId||analysis.id||manual.recordId||'',contentHash:analysis.contentHash,processorVersion:analysis.processorVersion||'',title:manual.title||analysis.title||analysis.filename||'Manual',revision:manual.revision||analysis.identity?.revision||analysis.revision||'',models:[...models],page:ref.page,pdfPage:ref.page,printedPage:ref.printedPage??page?.printedPage??page?.printedPageLabel??null,section:ref.section||page?.section||page?.sectionTitle||null,method:page?.method||'text',requiresSourceReview:page?.method==='ocr',quote,excerpt:quote,relationship:manual.sha256?'Reviewed procedure supported by these words in the matching PDF revision. Model coverage is document scope, not confirmation of installed equipment.':'Exact text from a successfully read page; no model-generated procedure or numerical value is added.'};
}
function verifyRef(analysis,ref){
 if(!ref||!Number.isInteger(ref.page)||ref.page<1||!str(ref.quote).trim())return 'invalid_source_reference';
 const page=list(analysis.pages).find(p=>p?.page===ref.page);
 if(!page||!readable(page))return 'source_page_unreadable';
 if(controlInstruction(ref.quote)||controlInstruction(page.text))return 'embedded_control_instruction';
 return normaliseManualQuote(page.text).includes(normaliseManualQuote(ref.quote))?null:'source_quote_missing';
}
const claimRefs=claim=>list(claim?.refs);
function verifyClaims(analysis,claims){
 const failures=[];
 for(const claim of list(claims)){
  if(!claim?.text||!claimRefs(claim).length){failures.push({reason:'claim_has_no_source'});continue;}
  for(const ref of claimRefs(claim)){const reason=verifyRef(analysis,ref);if(reason)failures.push({reason,page:ref?.page,section:ref?.section||null});}
 }
 return failures;
}
function sourceClaims(analysis,claims,manual){return list(claims).map(claim=>({text:claim.text,documented:true,sourceRefs:claimRefs(claim).map(ref=>refFrom(analysis,ref,manual))}));}
// Display one short source per PDF page; complete per-claim references remain
// in claims and the saved answer, so compact UI never discards provenance.
function displayRefs(claims){
 const seen=new Set(),refs=[];
 for(const ref of list(claims).flatMap(claim=>list(claim.sourceRefs))){const key=`${ref.contentHash}:${ref.page}`;if(seen.has(key))continue;seen.add(key);refs.push({...ref,citationId:`S${refs.length+1}`});}
 return refs;
}
function followUp(question){
 const q=fold(question);
 if(/\b(?:external|different|another|instead|change equipment|new panel|psu|power supply|camera|recorder|detector|keypad)\b/.test(q))return null;
 const step=q.match(/\b(?:explain|repeat|show|clarify|what(?:'s| is))\s+(?:me\s+)?step\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/);
 if(step){const names=['one','two','three','four','five','six','seven','eight','nine','ten'];return {type:'step',index:/^\d+$/.test(step[1])?Number(step[1])-1:names.indexOf(step[1])};}
 if(/\b(?:show|open|see)\b.{0,20}\b(?:page|manual|source|reference)\b/.test(q))return {type:'page'};
 if(/\b(?:stop|finish|cancel|end|leave|exit)\b.{0,25}\b(?:test|testing|walk)\b/.test(q))return {type:'stopTest'};
 if(/\b(?:where|find|locate|get to)\b.{0,30}\b(?:that|the|this)?\s*(?:menu|option|setting)\b|^where (?:is|was) (?:that|it)\??$/.test(q))return {type:'menuLocation'};
 if(/\b(?:what|which|where)\b.{0,25}\b(?:press|select|choose|do)\b.{0,15}\bnext\b|^what(?:'s| is) next\??$/.test(q))return {type:'nextStep'};
 return null;
}
function operationMatches(recipe,question,context,follow){
 const q=fold(question),intentOperation=typeof context.intent?.operation==='object'?context.intent.operation?.id:context.intent?.operation;
 // A subject mention is not the requested action: viewing walk-test history
 // must never start a test, and a battery test is not a zone walk test.
 if(recipe.operation==='walk-test'&&/\b(?:history|logs?|events?|batter(?:y|ies)|lamp|disable|disabled|program|programming|fault|voltage|psu|power supply|terminals?|wiring)\b/.test(q))return false;
 if(follow&&context.procedureId===recipe.id){
  if(intentOperation&&!['general','navigation',recipe.operation].includes(intentOperation))return false;
  // Only an implicit reference or a named zone/walk-test menu may inherit the
  // procedure. A newly named menu needs its own relevant source passage.
  if(follow.type==='menuLocation'&&/\b(?:menu|option|setting)\b/.test(q)&&! /\b(?:that|this|the menu|walk|test|zones?)\b/.test(q))return false;
  return true;
 }
 const terms=list(recipe.matchTerms).map(fold).filter(Boolean);
 return terms.some(term=>q.includes(term))||!follow&&intentOperation===recipe.operation&&/\b(?:walk|zones?)\b/.test(q);
}
function explicitModels(question){
 // Exact numeric MxPro identifiers must never collapse to their shared family.
 // Other manufacturers are handled by intent metadata and catalogue matching.
 return unique((str(question).match(/\bmx[\s-]*pro[\s-]*\d+[a-z0-9]*(?:\/[a-z]+)?\b|\bmx[\s-]*\d{4}[a-z]*(?:\/[a-z]+)?\b/gi)||[]).map(modelKey));
}
function scopeMatch(recipe,question,equipment,context){
 const covered=list(recipe.scope?.models).length?recipe.scope.models:list(recipe.manual?.models),keys=covered.map(modelKey),intent=context.intent?.equipment||{},explicit=explicitModels(question);
 const required=list(recipe.scope?.requiredVariant),variants=unique([context.intent?.variant,...equipmentList(equipment).map(item=>item?.variant)]).map(modelKey);
 if(explicit.length&&!explicit.every(model=>keys.includes(model)))return {matches:false,reason:'different_model',models:explicit};
 if(intent.exact&&intent.model&&!keys.includes(modelKey(intent.model)))return {matches:false,reason:'different_model',models:[intent.model]};
 const items=equipmentList(equipment),requested=intent.model||items.find(item=>item?.model)?.model||'',families=list(recipe.scope?.familyAliases).map(modelKey);
 if(requested&&!keys.includes(modelKey(requested))&&!families.includes(modelKey(requested)))return {matches:false,reason:'different_model',models:[requested]};
 if(required.length&&!required.some(value=>variants.includes(modelKey(value))))return {matches:false,reason:'scope_required',models:required,kind:'variant'};
 if(requested&&families.includes(modelKey(requested))&&recipe.scope?.allowFamilyQuestion===false)return {matches:false,reason:'scope_required',models:covered};
 return {matches:true};
}
function missing(reason,extra={}){return {status:'missing',supported:false,answersQuestion:false,text:'',steps:[],sourceRefs:[],reason,needed:reason,...extra};}

function reviewedAnswer(recipe,analysis,question,context,follow,packVersion){
 const selected=follow?.type==='step'?[recipe.steps?.[follow.index]].filter(Boolean):follow?.type==='page'?[]:follow?list(recipe.followUps?.[follow.type]):list(recipe.steps),full=!follow;
 if(!selected.length&&follow?.type!=='page')return missing('That manual does not establish the requested next step. Tell me which menu or step you are at.');
 const scopeClaims=recipe.scope?.label?[{text:recipe.scope.label,refs:list(recipe.scope.refs)}]:[];
 const prerequisites=full?list(recipe.prerequisites):[],effects=full?list(recipe.effects):[],emitted=[...scopeClaims,...prerequisites,...selected,...effects];
 const failures=[...list(recipe.anchors).map(ref=>{const reason=verifyRef(analysis,ref);return reason?{reason,page:ref?.page,section:ref?.section||null}:null;}).filter(Boolean),...verifyClaims(analysis,emitted)];
 if(!list(recipe.anchors).length)failures.push({reason:'procedure_has_no_anchors'});
 if(failures.length)return missing('The saved manual’s readable pages do not verify this procedure. I’ll look for a suitable complete reference.',{verificationFailures:failures,requiredPages:unique(failures.map(f=>f.page)),procedureId:recipe.id});
 const claims=sourceClaims(analysis,emitted,recipe.manual),steps=sourceClaims(analysis,selected,recipe.manual),scope={...recipe.scope,installedModelConfirmed:false,documentNumber:recipe.manual?.documentNumber||'',revision:recipe.manual?.revision||'',manualId:analysis.manualId||analysis.id||'',contentHash:analysis.contentHash};
 let text;
 if(follow?.type==='page'){
  // Re-read and verify the prior evidence: persisted messages alone cannot
  // manufacture a page reference after its source has become unavailable.
  const prior=list(context.previousAnswer?.sourceRefs).filter(ref=>ref.contentHash===analysis.contentHash),valid=prior.filter(ref=>!verifyRef(analysis,ref));
  if(!valid.length)return missing('The supporting page is unavailable. Add or reopen this manual to restore its reference.');
  const pageClaims=[{text:'Here are the supporting manual pages.',sourceRefs:valid.map(ref=>refFrom(analysis,ref,recipe.manual)),documented:true}];
  return {status:'answered',supported:true,answersQuestion:true,text:`${recipe.scope?.label||'For the equipment covered by this manual'}\nHere are the supporting manual pages.`,steps:[],claims:pageClaims,sourceRefs:displayRefs(pageClaims),operation:recipe.operation,procedureId:recipe.id,scope,coverage:'reviewed_manual_reference',packVersion};
 }
 if(full)text=[recipe.scope?.label,...prerequisites.map(item=>item.text),steps.map((step,index)=>`${index+1}. ${step.text}`).join('\n'),...effects.map(item=>item.text)].filter(Boolean).join('\n\n');
 else text=[recipe.scope?.label,...steps.map(step=>step.text)].filter(Boolean).join('\n\n');
 // Put the operation pages beneath the answer first; the full scope/access
 // references remain available after those and in each saved claim.
 const sourceRefs=displayRefs([...steps,...sourceClaims(analysis,prerequisites,recipe.manual),...sourceClaims(analysis,effects,recipe.manual),...sourceClaims(analysis,scopeClaims,recipe.manual)]);
 if(full){
  const uses=new Map();for(const ref of steps.flatMap(step=>step.sourceRefs))uses.set(ref.page,(uses.get(ref.page)||0)+1);
  sourceRefs.sort((a,b)=>(uses.get(b.page)||0)-(uses.get(a.page)||0));sourceRefs.forEach((ref,index)=>{ref.citationId=`S${index+1}`;});
 }
 return {status:'answered',supported:true,answersQuestion:true,text,steps,claims,sourceRefs,operation:recipe.operation,procedureId:recipe.id,scope,coverage:'reviewed_manual_procedure',packVersion,interpretationPolicy:'Source-reviewed wording, checked against the exact downloaded PDF hash and every supporting page quote. Document coverage does not confirm which equipment is installed.'};
}

const TOPICS=[
 {operation:'event-history',question:/\b(?:event|history|histry|histroy|log)\b/i,source:/\b(?:event (?:history|log|records)|recorded events|view the (?:history|log))\b/i},
 {operation:'walk-test',question:/\b(?:walk[\s-]*test|test zones|zone test|one person test)\b/i,source:/\b(?:walk[\s-]*test|test zones|zone test|one.person walk test)\b/i},
 {operation:'terminals',question:/\b(?:terminal|terminals|wiring|wire)\b/i,source:/\b(?:terminal|terminals|wiring)\b/i},
 {operation:'power',question:/\b(?:volts?|voltage|psu|power supply|output)\b/i,source:/\b(?:voltage|power supply|output)\b/i},
 {operation:'fault-message',question:/\b(?:fault|error|message|trouble)\b/i,source:/\b(?:means|indicates|occurs|displayed when|fault|trouble)\b/i},
 {operation:'configuration',question:/\b(?:disable|enable|isolate|isolation|add|program|programme|configure|configuration)\b/i,source:/\b(?:disable|enable|isolate|isolation|add|program|programme|configure|configuration)\b/i},
 {operation:'reset',question:/\b(?:reset|silence|mute)\b/i,source:/\b(?:reset|silence|mute)\b/i},
 {operation:'recording',question:/\b(?:playback|recording|record|storage|schedule|disk|hdd)\b/i,source:/\b(?:playback|recording|storage|schedule|disk|hdd)\b/i},
 {operation:'time',question:/\b(?:clock|date|time)\b/i,source:/\b(?:clock|date|time)\b/i}

];
const action=/\b(?:press|select|choose|enter|navigate|use|scroll|highlight|open|turn)\b/i;
function genericAnswer(analyses,question,equipment,context){
 const follow=followUp(question),prior=context.previousAnswer;
 if(follow&&prior&&!prior.procedureId){
  // Generic quoted answers support page follow-ups but cannot invent a next
  // keypress from an excerpt whose complete procedure has not been reviewed.
  if(follow.type==='page'){
   const refs=list(prior.sourceRefs).filter(ref=>analyses.some(a=>a.contentHash===ref.contentHash&&!verifyRef(a,ref)));
   if(refs.length)return {status:'answered',supported:true,answersQuestion:true,text:'Here are the manual pages supporting the previous answer.',steps:[],sourceRefs:refs,claims:[],coverage:'verbatim_manual_reference',operation:prior.operation||null};
  }
  if(follow.type==='menuLocation'){
   const refs=list(prior.sourceRefs).filter(ref=>action.test(ref.quote||ref.excerpt||'')&&analyses.some(a=>a.contentHash===ref.contentHash&&!verifyRef(a,ref)));
   if(refs.length){
    const quote=unique(refs.map(ref=>compact(ref.quote||ref.excerpt))).join('\n'),claim={text:quote,quote,sourceRefs:refs,documented:true};
    return {status:'partial',supported:true,answersQuestion:false,text:`The manual describes the menu here:\n\n${quote}\n\nCheck the linked page for its full context.`,reason:'The complete procedure is not independently verified.',steps:[claim],sourceRefs:refs,claims:[claim],completeProcedure:false,coverage:'verbatim_manual_extract',operation:prior.operation||null};
   }
  }
  if(follow.type==='step'&&list(prior.steps)[follow.index]){
   const step=prior.steps[follow.index],refs=list(step.sourceRefs).filter(ref=>analyses.some(a=>a.contentHash===ref.contentHash&&!verifyRef(a,ref)));
   if(refs.length&&refs.length===list(step.sourceRefs).length){
    const quote=unique(refs.map(ref=>compact(ref.quote))).join('\n'),claim={text:quote,quote,sourceRefs:refs,documented:true};
    return {status:'partial',supported:true,answersQuestion:false,text:`Here is the original manual wording for that step. Check the linked page for its surrounding conditions.\n\n${quote}`,reason:'The complete procedure is not independently verified.',steps:[claim],sourceRefs:refs,claims:[claim],completeProcedure:false,coverage:'verbatim_manual_extract',operation:prior.operation||null};
   }
  }
  return missing('That extract does not establish the requested next step. Tell me which menu or step you are at, or add a complete procedure.');
 }
 const searchQuestion=follow?context.previousQuestion||prior?.question||question:question,topic=TOPICS.find(item=>item.question.test(searchQuestion));
 if(!topic)return missing('I haven’t found a passage that establishes the answer. I’ll look for a more suitable manual.');
 if(/\b(?:compatib|will .{0,40} work with|can .{0,40} work with)/i.test(question))return missing('Compatibility needs explicit documentation for both products and their configuration. I’ll look for the relevant specifications.');
 const passages=retrieveManualPassages(analyses,searchQuestion,{equipment:equipmentList(equipment),limit:12,maxCharacters:13200});
 for(const passage of passages){
  if(!topic.source.test(passage.text)||controlInstruction(passage.text))continue;
  // A table of contents, feature list or source window cut in mid-sentence is
  // not a procedure. Keep source paragraphs intact rather than splice steps.
  const source=analyses.find(item=>item.contentHash===passage.contentHash),page=list(source?.pages).find(item=>item.page===passage.page);
  // PDF text often has headings, key labels and line breaks instead of sentence
  // punctuation. Preserve a short entire page so its warnings are not dropped.
  const pageText=compact(page?.text),chunks=[pageText.length<=1600?pageText:compact(passage.text)],procedural=/\b(?:how|procedure|steps|walk[\s-]*test|view|history|putting|disable|enable|configure|reset|silence)\b/i.test(searchQuestion);
  const candidate=chunks.find(chunk=>topic.source.test(chunk)&&!/(?:\.{3,}|\bcontents\b)/i.test(chunk)&&(!procedural||action.test(chunk)&&/\b(?:to (?:view|access|perform|start|test)|(?:press|select|choose)\s+[A-Z]|(?:then|next)\s+(?:press|select|choose)|walk[\s-]*test.{0,100}(?:press|select|choose))/i.test(chunk)));
  if(!candidate||candidate.length>1600)continue;
  const a=analyses.find(item=>item.contentHash===passage.contentHash);if(!a)continue;
  const ref=refFrom(a,{page:passage.page,quote:candidate,section:passage.section,printedPage:passage.printedPage});
  if(verifyRef(a,ref))continue;
  const claim={text:candidate,quote:candidate,documented:true,sourceRefs:[ref]},model=list(ref.models).join(', '),scope={models:[...ref.models],manualId:ref.manualId,contentHash:ref.contentHash,installedModelConfirmed:false};
  return {status:procedural?'partial':'answered',supported:true,answersQuestion:!procedural,text:`${procedural?'Relevant manual extract — I haven’t verified the complete procedure.\n\n':''}${model?`For ${model}, the manual says:`:'The manual says:'}\n\n${candidate}`,reason:procedural?'These are the documented instructions found on this page; the complete procedure has not been independently reviewed.':null,steps:procedural?[claim]:[],claims:[claim],sourceRefs:[{...ref,citationId:'S1'}],operation:topic.operation,scope,coverage:'verbatim_manual_extract',completeProcedure:false,interpretationPolicy:'Exact source text, preserving its conditions and sequence. This unreviewed extract is not asserted to be a complete procedure; no generated steps or limits are added.'};
 }
 return missing('That manual mentions the topic but does not give a readable, supported answer. I’ll look for a more suitable document.');
}

/** Pure, synchronous and offline: all inputs are existing local analysis data. */
export function prepareManualAnswer({question='',analysis,analyses=[],equipment=[],context={},procedures=[]}={}){
 const sources=unique([analysis,...list(analyses)]).filter(usable),recipes=recipeList(procedures),follow=followUp(question),packVersion=procedures?.version||MANUAL_ANSWERS_VERSION;
 if(!sources.length)return missing('A readable manual is needed to answer this question.');
 const applicable=recipes.filter(recipe=>recipe&&operationMatches(recipe,question,context,follow));
 if(follow&&context.procedureId&&!applicable.some(recipe=>recipe.id===context.procedureId))return missing('That asks about a different operation. I’ll look for its documented instructions rather than reuse the previous menu path.');
 let verificationFailure=null,scopeRequired=null;
 for(const recipe of applicable){
  const matching=sources.filter(item=>/^[a-f\d]{64}$/i.test(str(recipe.manual?.sha256))&&str(item.contentHash).toLowerCase()===recipe.manual.sha256.toLowerCase());
  if(!matching.length)continue;
  const scope=scopeMatch(recipe,question,equipment,context);
  if(!scope.matches){if(scope.reason==='scope_required')scopeRequired={status:'scope_required',reason:'Which installed variant applies to this procedure?',requiredModels:scope.models,clarification:{kind:scope.kind||'model',text:'Which installed variant applies to this procedure?',options:scope.models.map(model=>({value:model,label:model,...(list(recipe.scope?.variantAliases?.[model]).length?{aliases:list(recipe.scope.variantAliases[model])}:{})}))}};continue;}
  for(const source of matching){const answer=reviewedAnswer(recipe,source,question,context,follow&&context.procedureId===recipe.id?follow:null,packVersion);if(answer.status==='answered')return answer;verificationFailure=answer;}
 }
 if(scopeRequired)return scopeRequired;
 if(verificationFailure)return verificationFailure;
 // A known pinned manual for a different model must not evade its scope guard
 // by falling through to an exact-looking extract from the same document.
 const explicit=explicitModels(question),requested=explicit.length?explicit:context.intent?.equipment?.exact&&context.intent.equipment.model?[modelKey(context.intent.equipment.model)]:[];
 const allowed=sources.filter(source=>{
  const models=unique([...list(source.identity?.models),source.identity?.model]).map(modelKey);
  return (!requested.length||requested.every(model=>models.includes(model)||manualMatchesQuickIntent(source,{sufficient:true,equipment:{model,exact:true}}).matches))&&!applicable.some(recipe=>recipe.manual?.sha256===source.contentHash&&!scopeMatch(recipe,question,equipment,context).matches);
 });
 if(!allowed.length)return missing('The attached manual covers a different model. I’ll look for the manual for the equipment in your question.');
 return genericAnswer(allowed,question,equipment,context);
}
