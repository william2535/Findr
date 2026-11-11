// Public, source-reviewed factory access information. Never infer a site's PIN
// or reuse practice/emulator credentials. This module performs no inference.
const list=value=>Array.isArray(value)?value:[];
const compact=value=>String(value??'').replace(/\s+/g,' ').trim();
const key=value=>compact(value).normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g,'');
const codesQuestion=value=>/\b(?:default|factory|as supplied|comes? with|come as)\b/i.test(value)&&/\b(?:codes?|pins?|passwords?|passcodes?|access)\b/i.test(value);
const rolesQuestion=value=>/\b(?:engineer|engineering|installer|commissioning|user|customer|supervisor|level\s*[234])\b/i.test(value)&&/\b(?:codes?|pins?|passwords?|passcodes?)\b/i.test(value)&&! /\b(?:fault|error)\s+code\b/i.test(value);
const brandKey=value=>key(value).replace(/^(?:honeywell|tyco|johnsoncontrols)/,'');
const sameModel=(value,entry)=>list(entry.models).some(model=>key(model)===key(value)||key(entry.manufacturer+' '+model)===key(value));
const supportedModel=(helper,context,entry)=>{
 const model=context.confirmedModel||helper.scope?.model;
 const brand=helper.scope?.brand||helper.scope?.manufacturer||'';
 return !!model&&sameModel(model,entry)&&(!brand||brandKey(brand)===brandKey(entry.manufacturer));
};
const roleMatch=(entry,question)=>{
 const level=question.match(/\b(?:level|lvl|l)\s*([234])\b/i)?.[1];
 if(level)return String(entry.accessLevel)===level||new RegExp('level\\s*'+level,'i').test(entry.role);
 if(/\b(?:engineer|engineering|installer|commissioning)\b/i.test(question))return /engineer|engineering|installer|commissioning/i.test(entry.role);
 if(/\bsupervisor\b/i.test(question))return /supervisor/i.test(entry.role);
 if(/\b(?:user|customer)\b/i.test(question))return /user|customer/i.test(entry.role);
 return true;
};
function reference(entry){const d=entry.document||{};return {title:d.title,sourceUrl:d.url,contentHash:d.contentHash,page:d.pdfPage,pdfPage:d.pdfPage,printedPage:d.printedPage,revision:d.revision,section:d.section,quote:d.quote,method:'verified-default-access',saved:false,accessReferenceId:entry.id};}
const valid=entry=>typeof entry.code==='string'&&/^\d+$/.test(entry.code)&&Number.isInteger(entry.document?.pdfPage)&&entry.document.pdfPage>0&&/^[a-f0-9]{64}$/.test(entry.document.contentHash||'')&&compact(entry.document.quote).replace(/\s+/g,'').includes(entry.code)&&/^https:\/\//.test(entry.document.url||'');
function applicability(entry,helper,context){
 const rule=entry.applicability||{},variant=compact([helper.scope?.model,helper.scope?.variant,context.confirmedVariant,context.referenceQuestion].filter(Boolean).join(' '));
 if(list(rule.variantExcludes).some(excluded=>key(variant).includes(key(excluded))))return 'excluded';
 const firmware=compact(context.confirmedFirmware||helper.scope?.firmware),version=firmware.match(/(?:^|\s)v?(\d+)(?:\.(\d+))?/i);
 if(rule.firmwareMajor){if(!version)return rule.requiresFirmware?'unknown':'applicable';if(version[1]!==rule.firmwareMajor)return 'excluded';}
 if(rule.firmwareMinimum){if(!version)return 'unknown';const [major,minor]=rule.firmwareMinimum.split('.').map(Number);if(Number(version[1])<major||Number(version[1])===major&&Number(version[2]||0)<minor)return 'excluded';}
 return 'applicable';
}

export function resolveHelperPanelAccess({helper={},question='',context={},data={}}={}){
 const pending=context.pendingPanelAccess;
 const resume=!!pending&&/^(?:[234]|(?:access )?(?:level|lvl)\s*[234]|engineer|engineering|installer|user|customer|supervisor)(?:[.!?])?$/i.test(compact(question));
 if(!codesQuestion(question)&&!rolesQuestion(question)&&!resume)return null;
 const query=resume?'factory default '+(/^[234]$/.test(question)?'level '+question:question)+' code':question;
 context={...context,referenceQuestion:query};
 const entries=list(data?.entries).filter(entry=>supportedModel(helper,context,entry)&&valid(entry));
 const gaps=list(data?.gaps).filter(entry=>supportedModel(helper,context,entry)&&applicability(entry,helper,context)!=='excluded');
 const base={kind:'panel_access_reference',mode:'manual-search',modelUsed:false,sourceRefs:[],quickReplies:[],coverage:'default_not_established'};
 const model=compact(context.confirmedModel||helper.scope?.model||'this panel');
 const tokens=value=>' '+compact(value).normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()+' ';
 const named=[...new Set(list(data?.entries).concat(list(data?.gaps)).flatMap(entry=>list(entry.models)))].filter(name=>key(name).length>=3&&tokens(query).includes(tokens(name)));
 if(named.length&&!named.some(name=>sameModel(model,{models:[name]})||key(model).startsWith(key(name))))return {...base,coverage:'different_model',text:'This pal is scoped to '+model+'. Open the pal for '+named.join(' / ')+', or explicitly confirm the equipment change before using its access information.'};
 if(helper.scope?.kind==='family'&&!context.confirmedModel)return {...base,kind:'clarification',coverage:'access_scope_required',text:'Which exact panel model are you working on? Factory access values can differ within a family.',pendingQuestion:{field:'model',key:'factory-access-model',text:'Which exact panel model?'}};
 if(!entries.length&&!gaps.length)return {...base,text:'I don’t have a verified factory-default access code for '+model+'. Add its exact installation or commissioning manual; I won’t substitute another panel’s code.'};
 const eligible=entries.filter(entry=>roleMatch(entry,query));
 if(eligible.some(entry=>applicability(entry,helper,context)==='unknown')&&!list(context.answeredQuestions).some(item=>item.key==='factory-access-firmware'))return {...base,kind:'clarification',coverage:'access_scope_required',text:'Which firmware version is installed on '+model+'? The verified default-code reference is limited to '+[...new Set(eligible.map(entry=>entry.firmware).filter(Boolean))].join(' / ')+'.',quickReplies:['I don’t know'],pendingQuestion:{field:'firmware',key:'factory-access-firmware',text:'Which firmware version is installed?'}};
 const selected=eligible.filter(entry=>applicability(entry,helper,context)==='applicable');
 if(!selected.length){const relevant=gaps.filter(entry=>roleMatch(entry,query));return {...base,text:'I haven’t verified that access code for '+model+'. '+(relevant.map(item=>item.reason).join(' ')||'The reviewed sources do not establish a default for that access level.'),sourceRefs:relevant.filter(item=>item.document?.pdfPage&&item.document?.quote).map(reference)};}
 // Different firmware/variant defaults are kept distinct. Never silently pick
 // a code based on a family name; the documented scope travels with each row.
 const rows=selected.map(entry=>{
  const scope=[entry.variant,entry.firmware].filter(Boolean).join(' · ');
  const name=entry.kind==='documented-access-sequence'?'Documented access sequence':'Factory default';
  return name+' — '+entry.role+(entry.accessLevel?' · Level '+entry.accessLevel:'')+(scope?' ('+scope+')':'')+': '+entry.code+'\n'+list(entry.conditions).concat(list(entry.notes)).map(compact).filter(Boolean).join('\n');
 });
 const relevantGaps=gaps.filter(entry=>roleMatch(entry,query));
 return {...base,coverage:'verified_default_access',text:'For '+model+', the reviewed documentation records:\n\n'+rows.join('\n\n')+(relevantGaps.length?'\n\nNot established: '+relevantGaps.map(item=>item.reason).join(' '):'')+'\n\nThese are documented defaults or entry sequences, not confirmation of this site’s current code. Codes may have been changed. Use the site’s authorised access arrangements; this does not bypass access or establish permission to change the system.',sourceRefs:selected.map(reference)};
}

/** Link a bundled reference to a selected, readable saved edition only when its
 * bytes match. A publisher URL is not presented as an offline saved document. */
export function bindHelperReferenceSources(detail,sources=[]){
 if(!detail)return detail;
 return {...detail,sourceRefs:list(detail.sourceRefs).map(ref=>{
  const match=list(sources).find(source=>source.contentHash&&source.contentHash===ref.contentHash);
  return match?{...ref,manualId:match.manualId,saved:true}:{...ref,saved:false};
 })};
}
