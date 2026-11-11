import {normalizeInvestigation} from './investigation-engine.mjs';
import {getInvestigationPlan} from './investigation-plans.mjs';
import {assess} from './engine.mjs';
const list=value=>Array.isArray(value)?value:[];
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const text=value=>value==null?'':String(value);
const time=value=>Number.isFinite(value)&&value>=0&&Number.isFinite(new Date(value).getTime())?value:null;
const label=value=>text(value).replaceAll('_',' ')||'Not recorded';
const stamp=value=>time(value)===null?'Time not recorded':new Date(value).toISOString();

/** Presentation of recorded evidence only. No result, reason or cause is inferred. */
export function panelPalCallRecord(helper,session,knowledge={},{records=[]}={}){
  const s=object(session),inv=normalizeInvestigation(s.investigation,s.group),group=list(knowledge.groups).find(g=>g.id===s.group),plan=getInvestigationPlan(group);
  const checks=new Map(list(plan?.checks).map(c=>[c.id,c])),corrected=new Set(inv.measurements.map(m=>m?.supersedes).filter(Boolean));
  const timeline=[];
  const add=entry=>timeline.push({...entry,sequence:timeline.length});
  for(const e of list(s.questionHistory))add({id:e.id||`question-${timeline.length}`,kind:e.kind==='undo'?'Answer correction':'Reported observation',at:time(e.recordedAt),title:e.question||e.questionId||'Earlier question',result:e.kind==='undo'?`Earlier answer withdrawn: ${e.answerLabel||label(e.answer)}`:e.answerLabel||label(e.answer),why:e.reason||'An answer to a diagnostic question; it does not record an electrical test as performed.',source:e.source||'',fields:[],correction:e.kind==='undo'});
  for(const archive of list(s.guideHistory))for(const observation of list(archive.observations)){
    const represented=list(s.questionHistory).some(e=>e.kind==='answer'&&e.groupId===archive.groupId&&e.questionId===observation.questionId&&(!archive.runId||e.runId===archive.runId)&&(observation.recordedAt==null||e.recordedAt===observation.recordedAt));
    if(!represented)add({id:'archived-question-'+timeline.length,kind:'Earlier reported observation',at:time(observation.recordedAt),title:observation.question||observation.questionId||archive.title||'Earlier question',result:observation.answerLabel||label(observation.answer),why:observation.reason||'Earlier guide observation retained; no test method or reason was recorded.',fields:[['Earlier guide',archive.title||archive.groupId]],correction:false});
  }
  if(!list(s.questionHistory).length)for(const [id,value]of Object.entries(object(s.answers)))add({id:'legacy-answer-'+id,kind:'Reported observation',at:null,title:group?.questions?.find(q=>q.id===id)?.text||id,result:label(value),why:'Earlier answer retained; its time and test method were not recorded.',fields:[]});
  for(const [id,candidate]of Object.entries(inv.checks)){
    const check=object(candidate),definition=checks.get(id),status=check.status||'not_started';
    add({id:'check-'+id,kind:['not_started','not_tested'].includes(status)?'Check not completed':'Recorded check',at:time(check.updatedAt??check.recordedAt),title:definition?.title||id,result:label(status),why:check.reason||definition?.prompt||'Reason not recorded',whyLabel:check.reason?'Recorded reason':definition?.prompt?'Current guide context — reason not recorded':'Reason',source:check.source||'',fields:[['Findings',check.notes],['Engineer',check.engineer]],correction:false});
  }
  for(const m of inv.measurements){if(!m||typeof m!=='object')continue;const check=checks.get(m.checkId);
    add({id:m.id||'reading-'+timeline.length,kind:m.supersedes?'Corrected reading':'Recorded reading',at:time(m.recordedAt),title:m.location||'Point not recorded',result:`${text(m.value)} ${text(m.unit)}`.trim(),why:m.reason||check?.prompt||'Reason not recorded',whyLabel:m.reason?'Recorded reason':check?.prompt?'Current guide context — reason not recorded':'Reason',source:m.source||'',supersedes:m.supersedes||'',superseded:corrected.has(m.id),fields:[['Type',m.kind],['Exact reference / terminals',m.reference],['Operating / load condition',m.condition],['Instrument / source',m.instrument],['Expected value',m.expected],['Recorded assessment',label(m.assessment||'not_assessed')],['Panel / node',m.node],['Loop',m.loop],['Address',m.address],['Zone',m.zone],['Engineer',m.engineer],['Notes',m.notes]],correction:!!m.supersedes});
  }
  for(const a of inv.actions){if(!a||typeof a!=='object')continue;add({id:a.id||'work-'+timeline.length,kind:'Work / action',at:time(a.recordedAt),title:a.action||'Recorded action',result:a.outcome||'Outcome not recorded',why:a.reason||'Reason not recorded',source:a.source||'',fields:[['Engineer',a.engineer]]});}
  for(const o of list(inv.loop.observations)){if(!o||typeof o!=='object')continue;add({id:'path-'+timeline.length,kind:'Engineer path classification',at:time(o.recordedAt),title:inv.loop.points[o.pointIndex]||'Earlier physical point',result:label(o.assessment),why:o.notes||'Reason not recorded',source:inv.loop.source||'',fields:[['Linked reading',o.measurementId],['Configuration',o.configuration],['Engineer',o.engineer]],superseded:corrected.has(o.measurementId)});}
  timeline.sort((a,b)=>(a.at===null)-(b.at===null)||(a.at??0)-(b.at??0)||a.sequence-b.sequence);
  const selected=new Set(list(helper?.selectedManualIds)),documents=list(helper?.documents);
  const manuals=[...selected].map(id=>{const doc=documents.find(d=>d.id===id||d.record?.id===id),record=doc?.record||doc||list(records).find(r=>r.id===(helper?.manualStates?.[id]?.storedManualId||id));return {id,title:record?.title||id,revision:record?.revision||record?.edition||'',contentHash:helper?.manualStates?.[id]?.contentHash||''};});
  const handover=object(inv.handover),stop=object(s.supportHandover),drafts=object(stop.drafts);
  const assessed=group?assess(group,object(s.answers)):null;
  const possibilities=assessed&&!assessed.insufficient?list(assessed.ranked).slice(0,3).map(c=>c.title):[];
  return {version:1,helperName:helper?.name||'Panel pal',helperId:helper?.id||s.helperId||'',conversationId:s.conversationId||'',faultRecordId:s.id||'',site:s.site||inv.setup.jobRef||'',equipment:[s.panel?.brand,s.panel?.model].filter(Boolean).join(' ')||helper?.scope?.label||'Not recorded',variant:s.panel?.variant||'',firmware:s.panel?.firmware||'',modelConfirmed:s.confirmed===true,fault:s.message||'',notes:s.notes||'',startedAt:time(s.started),stoppedAt:time(stop.stoppedAt),stopReason:stop.reason||'Not recorded',returnRequirements:stop.requirements||handover.nextSteps||'',manuals,timeline,findings:handover.summary||'',workDone:handover.workDone||'',outstanding:handover.outstanding||'',systemLeft:handover.systemLeft||inv.setup.systemState||'',restoration:handover.restored||'unknown',functionalTest:handover.functionalTest||'not_done',causeConfirmed:s.causeConfirmed===true||handover.causeConfirmed===true,unsavedDrafts:Object.entries(drafts).filter(([,d])=>d&&typeof d==='object'&&(text(d.value).trim()||text(d.action).trim())),guideTitle:group?.title||s.group||'',possibilities,warning:'Reported answers are observations, not proof that a test was performed. A cleared fault does not by itself confirm its cause. Times missing from older records are shown last, not invented.'};
}
export function panelPalCallText(record){
  const r=record,lines=['FINDR — Panel Pal support call',`Panel pal: ${r.helperName}`,`Site / job: ${r.site||'Not recorded'}`,`Equipment: ${r.equipment}`,`Installed model: ${r.modelConfirmed?'Confirmed by engineer':'Not confirmed'}`,`Variant: ${r.variant||'Not recorded'} · Firmware: ${r.firmware||'Not recorded'}`,`Reported fault: ${r.fault||'Not recorded'}`,`Why I stopped: ${r.stopReason}`,`What I need next: ${r.returnRequirements||'Not recorded'}`,`Cause: ${r.causeConfirmed?'Engineer confirmation recorded':'Unconfirmed'}`,`Findings: ${r.findings||'Not recorded'}`,`Guide possibilities (unconfirmed): ${r.possibilities?.join('; ')||'Not narrowed down'}`,`Work done: ${r.workDone||'Not recorded'}`,`Still outstanding: ${r.outstanding||'Not recorded'}`,`System left: ${r.systemLeft||'Not recorded'}`,`Restoration: ${label(r.restoration)} · Functional retest: ${label(r.functionalTest)}`,`Notes: ${r.notes||'None recorded'}`,'','MANUALS',...r.manuals.map(m=>`${m.title}${m.revision?' · '+m.revision:''}`),'','TESTS, READINGS AND OBSERVATIONS — EARLIEST FIRST'];
  for(const [i,e]of r.timeline.entries()){lines.push(`${i+1}. ${stamp(e.at)} · ${e.kind} · ${e.title}`,`   Result: ${e.result}`,`   ${e.whyLabel||'Why'}: ${e.why}`);for(const [key,value]of e.fields||[])if(value!==''&&value!=null)lines.push(`   ${key}: ${value}`);if(e.source)lines.push(`   Source: ${e.source}`);if(e.supersedes)lines.push(`   Corrects reading: ${e.supersedes}; original retained`);if(e.superseded)lines.push('   Superseded by a later correction; do not use as the current result.');}
  if(!r.timeline.length)lines.push('No tests or readings recorded.');
  if(r.unsavedDrafts.length)lines.push('','UNSUBMITTED DRAFTS — NOT RECORDED RESULTS',...r.unsavedDrafts.map(([kind,draft])=>`${kind}: ${JSON.stringify(draft)}`));
  lines.push('',r.warning);return lines.join('\n');
}
export function pausePanelPalFault(session,{now=Date.now(),drafts={}}={}){
  const next=structuredClone(session),inv=normalizeInvestigation(next.investigation,next.group);
  inv.handover={...inv.handover,status:'unresolved'};inv.updatedAt=now;
  next.investigation=inv;next.unresolved=true;next.updatedAt=now;
  const previous=object(next.supportHandover),history=list(previous.history);if(previous.stoppedAt)history.push({...previous,history:undefined});
  next.supportHandover={...previous,history,stoppedAt:now,reason:next.supportHandover?.reason||'',requirements:next.supportHandover?.requirements||'',drafts:structuredClone(drafts),stage:'support'};
  return next;
}
