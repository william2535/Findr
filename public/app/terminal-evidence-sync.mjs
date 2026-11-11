import {sanitizeFieldVisitForStorage} from './field-model.mjs';
import {refreshTerminalPrompt} from './terminal-flow.mjs';

// The existing detailed visit editor remains the owner of evidence and safety
// records. This adapter mirrors saved changes into the same terminal transcript;
// it does not infer answers, confirmation, permission or restoration.
export const TERMINAL_EVIDENCE_SYNC_VERSION='2026-11-10.1';
const list=value=>Array.isArray(value)?value:[];
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const clone=value=>structuredClone(value);
const text=value=>String(value??'');
const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
const digest=value=>{let hash=2166136261;for(const c of canonical(value)||'')hash=Math.imul(hash^c.charCodeAt(0),16777619);return (hash>>>0).toString(16).padStart(8,'0');};
const same=(a,b)=>canonical(a)===canonical(b);
const human=value=>text(value).replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('_',' ').toLowerCase();
const ignored=new Set(['ui','updatedAt','capturedTime']);
const display=value=>value===undefined?'removed / not recorded':value===null?'not recorded':value===true?'yes (recorded)':value===false?'no (recorded)':typeof value==='object'?JSON.stringify(value):text(value)||'not recorded';

function changes(before,after,prefix=''){
 const found=[];
 for(const key of new Set([...Object.keys(object(before)),...Object.keys(object(after))])){
  if(ignored.has(key)||same(before?.[key],after?.[key]))continue;
  const path=prefix?prefix+'.'+key:key,a=before?.[key],b=after?.[key];
  if(b&&typeof b==='object'&&!Array.isArray(b)&&(!a||typeof a==='object'&&!Array.isArray(a)))found.push(...changes(a,b,path));
  else found.push({path,before:a,after:b});
 }
 return found;
}
function formatChanges(items){return items.map(item=>`${human(item.path.replaceAll('.',' / '))}: ${display(item.after)}`).join('\n');}
function readingText(event){
 const value=event.result||{},points=list(event.points).map(point=>point.location||point.label||point.terminal||'point not recorded');
 return [event.supersedes?'Correction recorded':'Test / observation recorded',human(event.testKind||'observation')+': '+(value.rawText??event.answer??'not recorded')+(value.unit?' '+value.unit:''),points.length?'Points: '+points.join(' / '):'',event.reference?'Reference: '+event.reference:'',event.operatingState?'Condition: '+human(event.operatingState):'',event.loadState?'Load: '+human(event.loadState):'',event.circuitState?'Circuit: '+human(event.circuitState):'',value.source?'Source: '+human(value.source):'',value.executionState?'State: '+human(value.executionState):'',event.notes?'Notes: '+event.notes:'',event.supersedes?'Earlier record retained: '+event.supersedes:''].filter(Boolean).join('\n');
}

/**
 * Call immediately before committing a detailed-editor snapshot. Returns a new
 * session and leaves both inputs untouched. A legacy visit without a terminal
 * keeps its established storage shape. Repeat saves of the same facts are inert.
 */
export function syncTerminalEvidence(previous,next,{now=Date.now()}={}){
 if(!next||previous?.id!==next.id||!(next.diagnosticChat?.terminal||previous?.diagnosticChat?.terminal))return clone(next);
 let result=clone(next),before=previous.fieldVisit||{},after=result.fieldVisit||{};
 const previousChat=previous.diagnosticChat||{},incoming=result.diagnosticChat||{};
 // Detailed-editor drafts can carry an older chat snapshot. Keep every already
 // saved transcript entry and preserve its current diagnostic state.
 const merged=[...list(previousChat.messages)],seen=new Set(merged.map(item=>item.id));
 for(const message of list(incoming.messages))if(!seen.has(message.id)){merged.push(message);seen.add(message.id);}
 result.diagnosticChat={...clone(previousChat.terminal?previousChat:incoming),messages:merged};
 const chat=result.diagnosticChat,priorIds=new Set(list(previousChat.messages).map(item=>item.id));
 let sequence=Math.max(Number(previousChat.terminal?.externalEvidenceSequence)||0,Number(incoming.terminal?.externalEvidenceSequence)||0);
 const append=(changeKind,id,beforeValue,afterValue,message,extra={})=>{
  const delta=digest([changeKind,id,beforeValue,afterValue]);
  // A retry carrying the already mirrored snapshot must not append it twice.
  if(chat.messages.some(item=>!priorIds.has(item.id)&&item.externalChangeKey===delta))return;
  chat.messages.push(sanitizeFieldVisitForStorage({id:`${next.id}:external-evidence:${++sequence}`,role:'user',kind:'external_evidence',text:message,createdAt:now,externalChangeKey:delta,externalEvidence:{version:TERMINAL_EVIDENCE_SYNC_VERSION,kind:changeKind,recordId:id,before:clone(beforeValue),after:clone(afterValue)},...extra}));
 };
 for(const event of list(after.events)){
  const old=list(before.events).find(item=>item.id===event.id);
  if(same(old,event))continue;
  // Events already written by the conversation need no mirror when a helper
  // snapshot is subsequently saved unchanged through the detailed editor.
  if(!old&&chat.messages.some(message=>list(message.eventIds).includes(event.id)))continue;
  append('event',event.id,old,event,readingText(event),{eventIds:[event.id],sourceRefs:list(event.sourceRefs),incidentId:event.incidentId});
 }
 for(const value of list(after.incidents)){
  const old=list(before.incidents).find(item=>item.id===value.id)||{};
  const items=changes(old,value).filter(item=>!['eventRefs','assetRefs','id'].includes(item.path));
  if(items.length)append('incident',value.id,old,value,'Updated visit conditions / findings:\n'+formatChanges(items),{incidentId:value.id});
 }
 for(const asset of list(after.assets)){
  const old=list(before.assets).find(item=>item.id===asset.id)||{},items=changes(old,asset).filter(item=>item.path!=='id');
  if(items.length)append('asset',asset.id,old,asset,'Equipment record updated:\n'+formatChanges(items));
 }
 for(const impairment of list(after.impairments)){
  const old=list(before.impairments).find(item=>item.id===impairment.id)||{},items=changes(old,impairment).filter(item=>item.path!=='id');
  if(items.length)append('impairment',impairment.id,old,impairment,'Protection / restoration record updated:\n'+formatChanges(items),{impairmentIds:[impairment.id]});
 }
 const handoverChanges=changes(before.handover,after.handover);
 if(handoverChanges.length)append('handover',after.id||next.id,before.handover,after.handover,'Handover record updated:\n'+formatChanges(handoverChanges));
 const siteChanges=['siteRef','engineerRef'].filter(key=>!same(before[key],after[key])).map(path=>({path,before:before[path],after:after[path]}));
 if(siteChanges.length)append('visit',after.id||next.id,Object.fromEntries(siteChanges.map(item=>[item.path,item.before])),Object.fromEntries(siteChanges.map(item=>[item.path,item.after])),'Job details updated:\n'+formatChanges(siteChanges));
 chat.terminal.externalEvidenceSequence=sequence;
 if(sequence!==(Number(previousChat.terminal?.externalEvidenceSequence)||0))chat.updatedAt=now;
 return refreshTerminalPrompt(result,{now});
}
