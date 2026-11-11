import {ANSWERS,answerEntries,answerLabel,nextQuestion,assess} from './engine.mjs';
import {createInvestigation,normalizeInvestigation,investigationReport,investigationLogReport} from './investigation-engine.mjs';
import {getInvestigationPlan} from './investigation-plans.mjs';
import {createInvestigationController} from './investigation.mjs';

const list=value=>Array.isArray(value)?value:[];
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const clone=value=>structuredClone(value);
const uid=()=>globalThis.crypto?.randomUUID?.()||`fault-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const category=value=>({intruder:'security',access:'access-control'}[value]||value||'fire');
const stamp=value=>Number.isFinite(value)?new Date(value).toISOString():'Time not recorded';
const button=(action,label,extra='',style='secondary')=>`<button type="button" class="${style}" data-action="helper-fault-${action}" ${extra}>${label}</button>`;
const safeURL=value=>{try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}};
const scopeLabel=helper=>helper?.scope?.label||[helper?.scope?.brand,helper?.scope?.model].filter(Boolean).join(' ')||'Selected manual scope';

/** A job-owned record. Selecting a manual scope does not confirm the installed equipment. */
export function createHelperFaultSession(helper,{id=uid(),now=Date.now()}={}){
  const scope=object(helper?.scope);
  return {
    schemaVersion:1,id,helperId:helper?.id||'',started:now,updatedAt:now,
    panel:{id:scope.id||'',brand:scope.brand||'',model:scope.model||scope.label||'Installed model unconfirmed',category:category(helper?.discipline),variant:scope.variant||'',firmware:scope.firmware||'',record_ids:[...list(helper?.selectedManualIds)]},
    scopeKind:scope.kind||'manuals',confirmed:false,group:'',groupRunId:'',answers:{},questionHistory:[],guideHistory:[],
    site:'',message:'',notes:'',unresolved:true,investigation:createInvestigation('unlisted',now),
  };
}

function normalizeSession(value){
  const source=clone(object(value));
  return {...source,answers:{...object(source.answers)},questionHistory:list(source.questionHistory),guideHistory:list(source.guideHistory),site:String(source.site||''),message:String(source.message||''),notes:String(source.notes||''),investigation:normalizeInvestigation(source.investigation,source.group||'unlisted')};
}
function observations(session,group){
  const entries=group?answerEntries(group,session.answers):Object.entries(object(session.answers));
  return entries.map(([questionId,answer])=>{
    const event=[...list(session.questionHistory)].reverse().find(item=>item.kind==='answer'&&item.groupId===(group?.id||session.group)&&item.questionId===questionId&&(!session.groupRunId||item.runId===session.groupRunId));
    return {questionId,question:group?.questions?.find(item=>item.id===questionId)?.text||event?.question||questionId,answer,answerLabel:answerLabel(answer),recordedAt:event?.recordedAt??null};
  });
}
function questionSources(question,knowledge){
  return list(question?.sourceRefs).map(ref=>{const source=list(knowledge?.sources).find(item=>item.id===ref.sourceId);return source?{...source,...ref}:null;}).filter(Boolean);
}
function sourceText(source){
  return [source.title||'Reference',source.page!=null?'Printed page '+source.page:'',source.section||'',source.appliesTo?'Applies to: '+source.appliesTo:'Model applicability is not established'].filter(Boolean).join(' · ');
}

/** Both exports keep the matrix and engineer-recorded evidence together. */
export function helperFaultReport(helper,record,knowledge,{compact=false}={}){
  const session=normalizeSession(record),group=list(knowledge?.groups).find(item=>item.id===session.group),current=observations(session,group);
  const result=group?assess(group,session.answers):null;
  const rows=[
    'FINDR — helper fault finding log',
    `Helper: ${helper?.name||'Saved helper'}`,`Helper ID: ${helper?.id||session.helperId||'Not recorded'}`,
    `Conversation ID: ${session.conversationId||'Not recorded'}`,`Fault record ID: ${session.id||'Not recorded'}`,
    `Started: ${stamp(session.started)}`,`Updated: ${stamp(session.updatedAt)}`,
    `Helper scope: ${scopeLabel(helper)}`,
    `Recorded model: ${[session.panel?.brand,session.panel?.model].filter(Boolean).join(' ')||'Not recorded'}`,
    `Installed model: ${session.confirmed?'Confirmed by engineer':'Not confirmed by this record'}`,
    `Variant: ${session.panel?.variant||'Not recorded'}`,`Firmware: ${session.panel?.firmware||'Not recorded'}`,
    `Site / job: ${session.site||'Not recorded'}`,`Exact fault message: ${session.message||'Not recorded'}`,
    `Question matrix: ${group?.title||session.group||'Not selected'}`,`Guide version: ${knowledge?.version||'Not recorded'}`,
    '\nCURRENT QUESTION OBSERVATIONS',
    ...(current.length?current.map(item=>`${item.question}\n  ${item.answerLabel} · ${stamp(item.recordedAt)}`):['No matrix answers recorded.']),
  ];
  if(session.guideHistory.length){
    rows.push('\nEARLIER QUESTION MATRICES');
    for(const visit of session.guideHistory){
      rows.push(`${visit.title||visit.groupId||'Earlier matrix'} · archived ${stamp(visit.recordedAt)}`);
      for(const item of list(visit.observations))rows.push(`  ${item.question||item.questionId||'Observation'} — ${item.answerLabel||answerLabel(item.answer)} · ${stamp(item.recordedAt)}`);
    }
  }
  if(session.questionHistory.length){
    rows.push('\nQUESTION / ANSWER TIMELINE — CORRECTIONS RETAINED');
    for(const event of session.questionHistory)rows.push(`${stamp(event.recordedAt)} · ${event.kind==='undo'?'Answer undone':'Engineer-reported answer'} · ${event.groupId||'Guide'} · ${event.question||event.questionId||'Question'} — ${event.answerLabel||answerLabel(event.answer)}`);
  }
  rows.push('\nPOSSIBILITIES — NOT A CONFIRMED DIAGNOSIS');
  if(!result||result.insufficient)rows.push('Not narrowed down: more evidence is needed. Unknown answers do not establish a cause.');
  else{
    for(const cause of result.ranked.slice(0,3)){
      rows.push(`Hypothesis: ${cause.title}`);
      for(const source of list(cause.sources))rows.push('  '+sourceText(source));
    }
    if(result.conflicting)rows.push('Some recorded answers conflict with the leading hypothesis. Keep that uncertainty in the investigation.');
  }
  rows.push('The original matrix uses editorial weights, not calibrated probabilities. Named-model references do not establish applicability to this installed system.');
  rows.push('\nNOTES',session.notes||'None recorded');
  rows.push(compact?investigationLogReport(session.investigation):investigationReport(session.investigation,getInvestigationPlan(group)));
  rows.push('\nMatrix answers and readings are observations reported by the engineer. They do not establish a repair, confirm protection is restored, or replace the exact-model procedure.');
  return rows.join('\n');
}

/** The controller never reads or writes the legacy global Fault Finder session. */
export function createHelperFaultsController({app,helperId,conversationId,getHelper,getSession,getKnowledge,onUpdate,openManuals,toast=()=>{}}){
  const base=`#helpers/${helperId}`,routes={faults:base+'/faults','fault-log':base+'/fault-log','fault-results':base+'/fault-results'};
  const find=selector=>app.querySelector(selector);
  let state=null,sessionId='',view='faults',choosingGroup=false,queue=Promise.resolve(),timer=null,dirty=false,saving=0,error='',revision=0,busy=false,pendingAction='';
  const visible=()=>Object.values(routes).includes(globalThis.location?.hash);
  function sync(){
    const saved=getSession();
    if(!saved?.id)throw Error('This saved job is unavailable. Reopen the helper before recording a test.');
    if(sessionId&&sessionId!==saved.id)throw Error('The fault record changed. Reopen this helper job before saving.');
    if(!state||(!dirty&&!saving&&!pendingAction)){state=normalizeSession(saved);sessionId=saved.id;}
    state.helperId=helperId;state.conversationId=conversationId;
    return state;
  }
  const knowledge=()=>getKnowledge()||{groups:[],sources:[]};
  const groups=()=>list(knowledge().groups).filter(item=>category(item.category)===category(getHelper()?.discipline||state?.panel?.category));
  const group=()=>groups().find(item=>item.id===state?.group);
  function saveStatus(){
    const node=find('#helper-fault-save-state');if(node)node.textContent=error?'Not saved: '+error:saving?'Saving on this device…':dirty?'Unsaved changes…':'Saved on this device';
    const retry=find('#helper-fault-retry');if(retry)retry.hidden=!error;
  }
  function enqueue(){
    if(!state||!dirty)return queue;
    clearTimeout(timer);timer=null;dirty=false;const snapshot=clone(state),atRevision=revision;saving++;saveStatus();
    const job=queue.catch(()=>{}).then(async()=>{
      if(getSession()?.id!==sessionId)throw Error('This job changed before its edit could be saved. Reopen the helper.');
      const saved=await onUpdate(snapshot);
      if(revision===atRevision&&!dirty)state=normalizeSession(saved||getSession()||snapshot);
      error='';
    }).catch(failure=>{dirty=true;error=failure.message||'Device storage is unavailable.';throw failure;}).finally(()=>{saving--;saveStatus();});
    queue=job;job.catch(()=>{});return job;
  }
  function changed(){state.updatedAt=Date.now();state.helperId=helperId;state.conversationId=conversationId;revision++;dirty=true;error='';saveStatus();clearTimeout(timer);timer=setTimeout(()=>enqueue(),350);}
  async function flushMatrix(){
    let pending;
    do{
      clearTimeout(timer);timer=null;if(dirty)enqueue();pending=queue;await pending;
      if(error)throw Error(error);
    }while(dirty||pending!==queue);
  }
  async function persistInvestigation(next){
    await flushMatrix();
    const latest=getSession();if(latest?.id!==sessionId)throw Error('The saved job changed. Reopen it before recording this test.');
    const updated={...clone(latest),helperId,conversationId,investigation:clone(next.investigation),unresolved:next.investigation?.handover?.status!=='resolved',updatedAt:Date.now()};
    const saved=await onUpdate(updated);state=normalizeSession(saved||getSession()||updated);return saved||state;
  }
  async function showManuals(ids,title){
    const allowed=new Set(list(getHelper()?.selectedManualIds)),selected=list(ids).filter(id=>allowed.has(id));
    if(!selected.length){toast('This named-model reference is outside this helper’s selected library. Check its applicability before adding the manual.');return;}
    await openManuals?.(selected,title||'Helper manuals');
  }
  const log=createInvestigationController({
    app,route:routes['fault-log'],getSession:()=>getSession(),getKnowledge:knowledge,onUpdate:persistInvestigation,
    saveSession:async()=>{await flushMatrix();},showManuals,toast,
    downloadReport:options=>download(options),copyReport:options=>copy(options),
    backHref:routes.faults,backLabel:'Helper fault questions',questionHref:routes.faults,resultHref:routes['fault-results'],
  });
  async function flush(){await flushMatrix();await log.flush();}
  async function navigate(next){await flush();if(globalThis.location.hash===next){if(Object.values(routes).includes(next))render(Object.keys(routes).find(key=>routes[key]===next));}else globalThis.location.hash=next;}
  function sourcesMarkup(sources){
    if(!sources.length)return '<p class="small">No named-model reference is recorded for this item. Confirm the applicable manual before interpreting it.</p>';
    return `<div class="helper-fault-sources">${sources.map(source=>{
      const selected=source.recordId&&list(getHelper()?.selectedManualIds).includes(source.recordId),url=safeURL(source.url);
      return `<article><strong>${esc(source.title||'Reference')}</strong><p>${source.page!=null?'Printed page '+esc(source.page)+' · ':''}${esc(source.section||'')}</p><small>${esc(source.appliesTo||'Model applicability is not established.')}</small>${selected?button('source','Open selected reference',`data-id="${esc(source.recordId)}"`,'subtle'):url?`<a class="subtle" href="${esc(url)}" target="_blank" rel="noopener">Named-model reference ↗ (connection may be needed)</a>`:''}</article>`;
    }).join('')}</div>`;
  }
  function toolbar(){
    const investigation=state.investigation;
    return `<div class="helper-fault-toolbar">${button('log',`Tests &amp; readings <span class="pill">${investigation.measurements.length}</span>`,'','primary')}${button('results','Review possibilities')}${button('manuals','Helper manuals')}${button('download','Download log')}${button('copy','Copy log')}</div><div class="helper-fault-save-row"><span id="helper-fault-save-state" role="status" aria-live="polite"></span>${button('retry','Retry save','id="helper-fault-retry" hidden','subtle')}</div>`;
  }
  function details(){
    return `<details class="helper-fault-details" ${!state.site&&!state.message?'open':''}><summary>Site, exact fault message &amp; notes</summary><div class="form-row"><label>Site / job reference<input id="helper-fault-site" value="${esc(state.site)}" maxlength="300" placeholder="e.g. Darwen office — service visit"></label><label>Exact fault message<input id="helper-fault-message" value="${esc(state.message)}" maxlength="3000" placeholder="Copy the wording, zone, address or channel"></label></div><label>Job notes<textarea id="helper-fault-notes" rows="3" maxlength="20000" placeholder="Checks already done, observations and uncertainties…">${esc(state.notes)}</textarea></label><p class="small">Save performed tests and actual readings in the test log. An answer to a question does not record a test as performed.</p></details>`;
  }
  function chooser(){
    const available=groups();
    return `<section><h2>What is the system reporting?</h2><p>Choose the fault type, then answer one observation at a time.</p><div class="symptom-grid">${available.map(item=>button('group',`<h3>${esc(item.title)}</h3><span>${esc(item.subtitle||'')}</span>`,`data-id="${esc(item.id)}"`,'symptom')).join('')}</div>${!available.length?'<div class="notice">There is no question matrix for this discipline yet. You can still record tests, readings and unresolved findings in this job’s log.</div>':''}${state.group?button('resume','Resume current questions','','subtle'):''}</section>`;
  }
  function historyMarkup(){
    if(!state.guideHistory.length)return '';
    return `<details class="helper-fault-history"><summary>Earlier fault questions (${state.guideHistory.length})</summary>${state.guideHistory.map(item=>`<article><h3>${esc(item.title||item.groupId)}</h3><small>${esc(stamp(item.recordedAt))}</small><ul>${list(item.observations).map(observation=>`<li>${esc(observation.question)} <strong>${esc(observation.answerLabel||answerLabel(observation.answer))}</strong></li>`).join('')}</ul></article>`).join('')}</details>`;
  }
  function questionMarkup(){
    const currentGroup=group(),question=nextQuestion(currentGroup,state.answers),entries=observations(state,currentGroup);
    if(!question)return resultsMarkup();
    return `<div class="helper-fault-layout"><section class="helper-fault-question"><div class="eyebrow">QUESTION ${entries.length+1} OF ${currentGroup.questions.length}</div><h2>${esc(currentGroup.title)}</h2><progress max="${currentGroup.questions.length}" value="${entries.length}" aria-label="Questions answered"></progress><h3>${esc(question.text)}</h3><p>${esc(question.hint||'Use your observations. Choose I don’t know if the information is unavailable.')}</p><div class="answer-options">${ANSWERS.map(([value,label])=>button('answer',esc(label),`data-id="${esc(question.id)}" data-value="${esc(value)}"`,'answer')).join('')}</div><details><summary>References and model applicability</summary><p class="small">These are the original matrix’s named-model references. They do not confirm this helper’s installed model or supply an exact-model test procedure.</p>${sourcesMarkup(questionSources(question,knowledge()))}</details><div class="inline-actions">${entries.length?button('undo','Undo last answer','','subtle'):''}${button('change-group','Change fault type','','subtle')}</div></section><aside class="helper-fault-observations"><h3>Your observations</h3>${entries.length?`<ol>${entries.map(item=>`<li>${esc(item.question)}<strong>${esc(item.answerLabel)}</strong><small>${esc(stamp(item.recordedAt))}</small></li>`).join('')}</ol>`:'<p>No answers recorded yet.</p>'}<p class="small">I don’t know keeps the uncertainty. Possibilities remain hypotheses until supported by evidence.</p></aside></div>`;
  }
  function resultsMarkup(){
    const currentGroup=group();
    if(!currentGroup)return chooser();
    const assessment=assess(currentGroup,state.answers),entries=observations(state,currentGroup);
    return `<section class="helper-fault-results"><h2>${assessment.insufficient?'More evidence needed.':'Here’s what the clues suggest.'}</h2><p>Possible causes to investigate — not a confirmed diagnosis.</p><p class="notice">This is the original guided question matrix. Its editorial weights are not calibrated probabilities, and its named-model references may not apply to the installed system. Answers here are not presented as an AI answer grounded in this helper’s manuals.</p>${assessment.conflicting?'<p class="notice warning">Some observations conflict with the leading hypothesis. Keep that conflict visible while investigating.</p>':''}${assessment.ranked.slice(0,3).map(cause=>`<article class="helper-fault-result"><small>HYPOTHESIS${assessment.insufficient?' · INSUFFICIENT EVIDENCE':''}</small><h3>${esc(cause.title)}</h3><p>${esc(cause.summary||'')}</p>${list(cause.support).length?`<p><strong>Supporting observations:</strong></p><ul>${cause.support.map(id=>`<li>${esc(currentGroup.questions.find(item=>item.id===id)?.text||id)} — ${esc(answerLabel(state.answers[id]))}</li>`).join('')}</ul>`:''}${list(cause.against).length?`<p>${cause.against.length} recorded observation${cause.against.length===1?' conflicts':'s conflict'} with this hypothesis.</p>`:''}${list(cause.checks).length?`<h4>Next observation to consider</h4><ul>${cause.checks.map(check=>`<li>${esc(check)}</li>`).join('')}</ul>`:''}<details><summary>Source models, editions and applicability</summary>${sourcesMarkup(list(cause.sources))}</details></article>`).join('')}<div class="inline-actions">${button('resume','Continue questions')}${entries.length?button('undo','Undo last answer','','subtle'):''}${button('change-group','Change fault type','','subtle')}</div><h3>Recorded answers</h3><ul>${entries.map(item=>`<li>${esc(item.question)} <strong>${esc(item.answerLabel)}</strong></li>`).join('')||'<li>No answers recorded.</li>'}</ul></section>`;
  }
  function bindFields(){
    for(const name of ['site','message','notes']){
      const input=find('#helper-fault-'+name);if(!input)continue;
      input.oninput=()=>{state[name]=input.value;changed();};
      input.onblur=()=>{flushMatrix().catch(failure=>{toast(failure.message);saveStatus();});};
    }
  }
  function render(nextView='faults'){
    view=Object.hasOwn(routes,nextView)?nextView:'faults';sync();
    if(view==='fault-log'){log.render();return;}
    const helper=getHelper();
    app.innerHTML=`<section class="helpers-page helper-fault-page"><a class="back" href="${esc(base)}">← ${esc(helper?.name||'Helper conversation')}</a><div class="helper-fault-heading"><div class="eyebrow">FINDR / HELPER FAULT FINDING</div><h1>Let’s work through the fault.</h1><p>${esc(scopeLabel(helper))} · This conversation’s questions, tests and findings.</p><small>Helper scope selected; the installed model and variant must be checked before applying a procedure.</small></div>${toolbar()}${details()}${view==='fault-results'?resultsMarkup():!group()||choosingGroup?chooser():questionMarkup()}${historyMarkup()}<p class="helper-footnote">This record does not authorise electrical testing, isolation or disabling protection. Follow the applicable documented procedure and site precautions.</p></section>`;
    bindFields();saveStatus();
  }
  async function change(mutator,kind){
    await flush();sync();const next=clone(state);mutator(next);state=next;pendingAction=kind;changed();await flushMatrix();pendingAction='';
  }
  async function download(options={}){
    await flush();sync();
    const text=helperFaultReport(getHelper(),state,knowledge(),{compact:options?.format==='quick'}),url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download=`FINDR-${String(getHelper()?.name||'helper').replace(/[^a-zA-Z0-9_-]+/g,'-')}-fault-log-${new Date().toISOString().slice(0,10)}.txt`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('This helper job’s fault log was downloaded.');
  }
  async function copy(options={}){
    await flush();sync();const text=helperFaultReport(getHelper(),state,knowledge(),{compact:options?.format==='quick'});
    try{await navigator.clipboard.writeText(text);toast('This helper job’s fault log was copied.');}catch{toast('Clipboard access is unavailable. Use Download log to save the complete record.');}
  }
  async function handleAction(action,id,value,node){
    if(action.startsWith('investigation-')){
      if(view!=='fault-log'||globalThis.location?.hash!==routes['fault-log'])return false;
      return log.handleAction(action,id,value,node);
    }
    const prefix=action.startsWith('helper-fault-')?'helper-fault-':action.startsWith('fault-')?'fault-':'';
    if(!prefix)return false;
    if(busy)return true;busy=true;
    try{
      await flush();sync();
      if(pendingAction){pendingAction='';render(view);return true;}
      switch(action.slice(prefix.length)){
        case'group':{
          const selected=groups().find(item=>item.id===id);if(!selected)throw Error('Choose a fault type for this helper’s discipline.');
          if(state.group!==id)await change(next=>{
            const previous=list(knowledge().groups).find(item=>item.id===next.group),entries=observations(next,previous);
            if(next.group&&entries.length)next.guideHistory.push({groupId:next.group,title:previous?.title||next.group,runId:next.groupRunId||'',recordedAt:Date.now(),observations:entries});
            next.group=id;next.groupRunId=uid();next.answers={};next.investigation.groupId=id;
          },'group');
          choosingGroup=false;view='faults';if(globalThis.location?.hash!==routes.faults)await navigate(routes.faults);break;
        }
        case'answer':{
          const currentGroup=group(),question=currentGroup&&nextQuestion(currentGroup,state.answers);
          if(!question||question.id!==id||!ANSWERS.some(([answer])=>answer===value))throw Error('That question has changed. Use the current question shown.');
          await change(next=>{next.answers[id]=value;next.questionHistory.push({id:uid(),kind:'answer',groupId:currentGroup.id,runId:next.groupRunId||'',questionId:id,question:question.text,answer:value,answerLabel:answerLabel(value),recordedAt:Date.now(),provenance:'engineer_report'});},'answer');break;
        }
        case'undo':{
          const currentGroup=group(),last=currentGroup&&observations(state,currentGroup).at(-1);if(!last)break;
          await change(next=>{delete next.answers[last.questionId];next.questionHistory.push({id:uid(),kind:'undo',groupId:currentGroup.id,runId:next.groupRunId||'',...last,recordedAt:Date.now(),provenance:'engineer_report'});},'undo');view='faults';if(globalThis.location?.hash!==routes.faults)await navigate(routes.faults);break;
        }
        case'change-group':choosingGroup=true;view='faults';await navigate(routes.faults);break;
        case'resume':choosingGroup=false;await navigate(routes.faults);view='faults';break;
        case'log':await navigate(routes['fault-log']);return true;
        case'results':await navigate(routes['fault-results']);return true;
        case'manuals':await showManuals(list(getHelper()?.selectedManualIds),'Helper manuals');return true;
        case'source':await showManuals([id],'Named-model reference');return true;
        case'download':await download();return true;
        case'copy':await copy();return true;
        case'retry':toast('Fault questions saved on this device.');break;
        default:return false;
      }
      if(visible())render(view);
    }catch(failure){const message=failure.message||'This job could not be saved.';if(dirty||pendingAction)error=message;saveStatus();toast(message);}
    finally{busy=false;}
    return true;
  }
  return {render,handleAction,flush};
}
