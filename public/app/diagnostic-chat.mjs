import {buildFaultLanguageRequest,beginFaultLanguage,applyFaultLanguageReply,failFaultLanguage,requestFaultComponentManual} from './fault-language.mjs';
import {generateLocalReply,getLocalLanguageReadiness} from './local-language.mjs';
import * as engine from './diagnostic-chat-engine.mjs';
import * as terminal from './terminal-flow.mjs';
import {createTerminalTyper} from './terminal-typing.mjs';
import {analyseManual,getManualAnalysis,getManualProcessingReadiness,downloadManualProcessingResources,getManualProcessingErrorDetails} from './manual-analysis.mjs';
import {calculateDiagnostic,CALCULATOR_DEFINITIONS,recordDiagnosticCalculation} from './diagnostic-calculators.mjs';
import {findManuals} from './manual-search.mjs';
import {validatePDF} from './engine.mjs';
import * as db from './db.mjs';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>crypto.randomUUID();
const list=value=>Array.isArray(value)?value:[];
const label=value=>String(value??'').replaceAll('_',' ');
const button=(action,text,style='secondary',extra='')=>`<button type="button" class="${style}" data-action="chat-${action}" ${extra}>${text}</button>`;
const option=(choices,value)=>[...(value&&!choices.some(item=>(Array.isArray(item)?item[0]:item)===value)?[[value,'Recorded: '+label(value)]]:[]),...choices].map(item=>{const [key,title]=Array.isArray(item)?item:[item,label(item)];return `<option value="${esc(key)}" ${key===value?'selected':''}>${esc(title)}</option>`;}).join('');
const input=(name,title,value='',extra='')=>`<label class="form-label">${title}<input name="${name}" value="${esc(value)}" ${extra}></label>`;
const area=(name,title,value='',extra='')=>`<label class="form-label">${title}<textarea name="${name}" rows="3" ${extra}>${esc(value)}</textarea></label>`;
const select=(name,title,choices,value='')=>`<label class="form-label">${title}<select name="${name}">${option(choices,value)}</select></label>`;
const stamp=value=>value?new Date(value).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'';

/** One saved conversation. Visual typing and temporary selection sheets never own diagnostic state. */
export function createDiagnosticChatController({app,getSession,onUpdate,getSaved,refreshSaved,readPDF,searchManuals,getRecords=()=>[],downloadManual,toast,showModal:externalModal,closeModal:externalClose,onNewVisit,getOfflineReady=()=>false,openResources,getLanguageState=()=>null,onQuickQuestions}) {
  let current=null,sessionId='',queue=Promise.resolve(),saveError='',saving=false,dirty=false,draftTimer=null;
  let revision=0,pendingSaves=0,draft='',sheet=null,manualQuery='',manualRole='',processing=null,progress=null,lastImport=null;
  let readiness=null,readinessPending=false,hydrating=false,hydratedKey='',reportFormat='short',redact=true,correctionId='',calculatorKind='voltage-drop',lastCalculation=null;
  let followLatest=true,scrollTop=0,programmaticScroll=false,renderedSession='',firstPresentation=true,freshPresentation=false,picker=null,scrollFrame=null;
  const rows=new Map();
  const find=selector=>app.querySelector(selector);
  const active=()=>['#faults','#investigation','#diagnostic','#legacy-faults'].includes(location.hash);
  const prompt=()=>terminal.getTerminalPrompt(current);
  const messages=()=>list(current?.diagnosticChat?.messages);
  let typer=createTerminalTyper({onProgress:()=>followOutput(),onFinish:()=>followOutput()});

  function sync(){
    const saved=getSession();if(!saved)return;
    if(sessionId!==saved.id){
      processing?.abort.abort();picker=null;current=terminal.ensureTerminalSession(saved);sessionId=saved.id;
      draft=current.diagnosticChat?.ui?.draft||'';sheet=null;saveError='';dirty=!saved.diagnosticChat?.terminal;
      followLatest=true;scrollTop=0;hydratedKey='';manualRole='';lastImport=null;renderedSession='';rows.clear();firstPresentation=true;
      typer.destroy();typer=createTerminalTyper({onProgress:()=>followOutput(),onFinish:()=>followOutput()});
      const interrupted=current.diagnosticChat.terminal.pendingOperation;
      if(interrupted){delete current.diagnosticChat.terminal.pendingOperation;if(interrupted.kind==='model'){current=failFaultLanguage(current,{id:interrupted.requestId},new DOMException('Interrupted','AbortError'));}else current=terminal.recordTerminalEvent(current,{type:'error',code:interrupted.kind==='resources'?'resource_cancelled':interrupted.kind==='download'?'manual_download_cancelled':'processing_cancelled',operation:interrupted.kind,message:'The previous operation was interrupted. Your saved conversation is intact.'});dirty=true;}
    }else if(!dirty&&!saving)current=terminal.ensureTerminalSession(saved);
  }
  function setStatus(){
    const status=find('#diagnostic-save-status');if(status){status.textContent=saveError?'Not saved — retry':saving?'Saving on this device…':dirty?'Unsaved changes':'Saved on this device';status.classList.toggle('error',!!saveError);}
    app.querySelectorAll('[data-prompt-key]').forEach(control=>{control.disabled=saving||!!processing||control.dataset.promptKey!==prompt()?.key;});
  }
  function save(next,{renderAfter=true}={}){
    current=next;dirty=true;saving=true;pendingSaves++;saveError='';const snapshot=structuredClone(next),id=sessionId,version=++revision;
    queue=queue.catch(()=>{}).then(async()=>{
      try{await onUpdate(snapshot);if(id===sessionId&&version===revision){dirty=false;saveError='';}}
      catch(error){if(id===sessionId){saveError=error.message||'Device storage is unavailable.';if(version===revision)current=terminal.recordTerminalEvent(current,{type:'error',code:'STORAGE_UNAVAILABLE',operation:'save',message:saveError});}throw error;}
      finally{pendingSaves--;saving=pendingSaves>0;if(active())setStatus();}
    });
    if(renderAfter&&active())render();else setStatus();return queue;
  }
  function mutate(operation){sync();try{return save(terminal.refreshTerminalPrompt(operation(current))).catch(error=>{toast(error.message);if(active())render();});}catch(error){toast(error.message);return Promise.resolve();}}
  function saveDraft(){if(!current||current.id!==getSession()?.id)return Promise.resolve();const next=structuredClone(current);next.diagnosticChat.ui={...next.diagnosticChat.ui,draft};return save(next,{renderAfter:false});}
  async function flush(){clearTimeout(draftTimer);if(current&&current.id===getSession()?.id&&draft!==(current.diagnosticChat?.ui?.draft||''))await saveDraft();await queue;if(dirty&&saveError)throw Error(saveError);}
  function captureScroll(){const transcript=find('.diagnostic-transcript');if(transcript)scrollTop=transcript.scrollTop;}
  function followOutput(){
    if(!active()||!followLatest)return;if(scrollFrame!=null)return;
    scrollFrame=requestAnimationFrame(()=>{scrollFrame=null;if(!followLatest)return;const transcript=find('.diagnostic-transcript');if(!transcript)return;programmaticScroll=true;transcript.scrollTop=transcript.scrollHeight;scrollTop=transcript.scrollTop;requestAnimationFrame(()=>{programmaticScroll=false;});const newest=find('.diagnostic-newest');if(newest)newest.hidden=true;});
  }
  function refsMarkup(refs){return list(refs).map(ref=>`<div class="diagnostic-source"><span>${esc(ref.title||ref.manualTitle||'Selected manual')} · ${ref.page?'PDF page '+esc(ref.page):esc(ref.locator||'Reference')}</span>${ref.quote||ref.excerpt?`<blockquote>${esc(ref.quote||ref.excerpt)}</blockquote>`:''}${ref.manualId?button('source','[ open source page ]','subtle',`data-id="${esc(ref.manualId)}" data-page="${esc(ref.page||1)}" data-source-hash="${esc(ref.contentHash||ref.sha256||'')}"`):''}</div>`).join('');}
  function rowMarkup(message){
    const user=['user','engineer'].includes(message.role),p=prompt(),options=list(message.options);
    return `<div class="terminal-line" data-role="${user?'engineer':'assistant'}" data-message-id="${esc(message.id)}"><span class="terminal-prefix">${user?'YOU':'FINDR'} &gt;</span><span class="terminal-text" data-terminal-message-text></span>${options.length?`<div class="terminal-options">${options.map(o=>{const display=message.terminalKind==='intro'?'[ start ]':`[${o.number}] ${o.label}`,value=message.terminalKind==='intro'?'START':o.label;return `<button type="button" class="terminal-option terminal-line" data-role="assistant" data-message-id="${esc(message.id+':option:'+o.value)}" data-action="chat-option" data-value="${esc(value)}" data-prompt-key="${esc(message.terminalPromptKey||'')}" ${message.terminalPromptKey!==p.key?'disabled':''} aria-label="${message.terminalKind==='intro'?'Start a fault visit':esc(o.label)}"><span class="terminal-prefix">FINDR &gt;</span><span class="terminal-text" data-terminal-message-text></span></button>`;}).join('')}</div>`:''}${message.explanation||message.why||message.sourceRefs?.length||message.eventIds?.length||message.errorDetails?`<details class="terminal-detail"><summary>${message.errorDetails?'Error details':message.sourceRefs?.length?'Why / source':'Record details'}</summary>${message.explanation||message.why?`<p>${esc(message.explanation||message.why)}</p>`:''}${refsMarkup(message.sourceRefs)}${message.errorDetails?`<pre class="assistant-error-stack">${esc(JSON.stringify(message.errorDetails,null,2))}</pre>`:''}${list(message.eventIds).map(id=>button('correct','[ correct this record ]','subtle',`data-id="${esc(id)}"`)).join('')}<small>${stamp(message.createdAt)}</small></details>`:''}</div>`;
  }
  function displayMessages(){return messages().flatMap(message=>[{...message,text:message.bodyText??message.text},...list(message.options).map(o=>({id:message.id+':option:'+o.value,role:'assistant',text:message.terminalKind==='intro'?'[ start ]':`[${o.number}] ${o.label}`}))]);}
  function languageStatusMarkup(){const state=getLanguageState();if(!state)return '';const mode=state.loaded?'ready':state.ready?'ready':state.supported===false?'unsupported':'limited',message=state.loaded?'Local language model active':state.ready?'Local model ready · loads when needed':state.installed?'Model saved · offline runtime pending':state.supported===false?'Local model unavailable here · structured rules remain available':'Structured rules / manual references · local model not installed';return `<p class="assistant-language-status" data-state="${mode}">${esc(message)}</p>`;}
  function jobMarkup(){const identity=current.diagnosticChat?.identity||{},manuals=list(current.diagnosticChat.manuals);return `<details class="terminal-job-details"><summary>${esc(current.site||'Current job')} · ${esc(identity.model||'equipment to confirm')}</summary><p>${esc(current.importedContext?.selectedPanel||[identity.manufacturer,identity.model].filter(Boolean).join(' '))}</p>${current.importedContext?`<p>${esc(current.importedContext.location)} · Loop ${esc(current.importedContext.loop)} · Address ${esc(current.importedContext.address)}</p>`:''}<p>${manuals.length} manual${manuals.length===1?'':'s'} attached. ${getOfflineReady()?'App ready offline.':'Preparing offline app.'}</p>${languageStatusMarkup()}<div class="inline-actions">${button('site','[ site / equipment ]','subtle')}${button('readiness','[ offline kit ]','subtle')}<a href="#investigation/evidence">[ safety / restoration ]</a><a href="#history">[ saved jobs ]</a>${button('new-job','[ new job ]','subtle')}</div></details><span id="diagnostic-save-status" role="status" aria-live="polite"></span>${saveError?button('retry','[ retry save ]','subtle'):''}`;}
  function ensureShell(){
    if(find('.terminal-session')&&renderedSession===sessionId)return;
    app.innerHTML=`<section class="diagnostic-shell terminal-session"><header class="terminal-job-bar"></header><div class="diagnostic-workspace"><div class="diagnostic-transcript" role="log" aria-label="Fault finding conversation" aria-live="off" tabindex="0"><div class="terminal-history"></div><div class="terminal-current-controls"></div><div class="terminal-operation" aria-live="polite"></div><div class="terminal-sheet-slot"></div></div>${button('newest','↓ Latest message','diagnostic-newest','hidden')}<div class="diagnostic-composer"><form id="diagnostic-message-form"><label class="sr-only" for="diagnostic-message">Your terminal reply</label><div class="terminal-input-row"><span class="terminal-prefix" aria-hidden="true">YOU &gt;</span><textarea id="diagnostic-message" name="message" rows="2" placeholder="Type a reply or HELP" enterkeyhint="send" aria-label="Your terminal reply"></textarea><button type="submit" class="primary" aria-label="Send message">Send ↵</button></div></form><div class="terminal-command-bar">${button('command','HELP','subtle','data-value="HELP"')}${button('command','MANUALS','subtle','data-value="MANUALS"')}${button('command','LOG','subtle','data-value="LOG"')}${button('command','BACK','subtle','data-value="BACK"')}${button('measurement','＋ Reading','subtle')}${button('calculator','Calculator','subtle')}${button('reveal','Skip typing','subtle','aria-label="Reveal the current message"')}</div><div class="diagnostic-outcomes">${button('give-up','Give up','secondary')}${button('found','Fault found','primary')}</div></div></div><input id="diagnostic-pdf-input" type="file" accept="application/pdf,.pdf" hidden></section>`;
    renderedSession=sessionId;rows.clear();bindShell();
  }
  function render({fresh=false}={}){
    if(!active())return;captureScroll();sync();if(!current)return;
    if(firstPresentation)freshPresentation=fresh;ensureShell();const history=find('.terminal-history');if(!history){setStatus();return;}
    const oldOpen=find('.terminal-job-details')?.open;find('.terminal-job-bar').innerHTML=jobMarkup();if(oldOpen)find('.terminal-job-details').open=true;find('.terminal-job-details').ontoggle=()=>updateViewport();
    const p=prompt();for(const message of messages()){
      const signature=JSON.stringify([message.text,message.options,message.explanation,message.sourceRefs,message.eventIds,message.errorDetails]);let row=rows.get(message.id);
      if(!row){history.insertAdjacentHTML('beforeend',rowMarkup(message));row={node:history.lastElementChild,signature};rows.set(message.id,row);}
      else if(row.signature!==signature){row.node.outerHTML=rowMarkup(message);row.node=history.querySelector(`[data-message-id="${CSS.escape(message.id)}"]`);row.signature=signature;}
    }
    find('.terminal-current-controls').innerHTML=`${p.kind==='intro'?button('skip-intro','[ skip intro ]','subtle','id="fault-entry-skip"'):''}${p.helper==='measurement'?button('measurement','[ use reading helper ]','subtle'):''}${p.helper==='conditions'?'<a class="subtle" href="#investigation/evidence">[ record safety / restoration details ]</a>':''}${p.enginePrompt?.kind==='question'&&['voltage','voltage_drop','resistance','continuity','current','functional','controlled_split','controlled_comparison'].includes(p.enginePrompt.measurementTemplate)?button('prepare-test','[ establish test prerequisites ]','subtle'):''}${hydrating?'<span class="terminal-working">Restoring saved manual references…</span>':''}`;
    renderOperation();renderSheet();const textarea=find('#diagnostic-message');if(textarea&&textarea.value!==draft)textarea.value=draft;
    typer.reconcile(history,displayMessages(),{initial:firstPresentation&&!freshPresentation});firstPresentation=false;setStatus();updateViewport();
    if(followLatest)followOutput();else{const transcript=find('.diagnostic-transcript');programmaticScroll=true;transcript.scrollTop=scrollTop;requestAnimationFrame(()=>{programmaticScroll=false;});}
    if(dirty&&!saving&&!saveError)save(current,{renderAfter:false}).catch(()=>{if(active())render();});
    hydrateManuals();
  }
  function bindShell(){
    const textarea=find('#diagnostic-message'),form=find('#diagnostic-message-form'),transcript=find('.diagnostic-transcript');
    if(!textarea||!form||!transcript)return;textarea.value=draft;textarea.oninput=()=>{draft=textarea.value;clearTimeout(draftTimer);draftTimer=setTimeout(()=>saveDraft().catch(()=>{}),250);};
    textarea.onkeydown=event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();form.requestSubmit();}};
    form.onsubmit=event=>{event.preventDefault();if(processing){toast('A local operation is running. Cancel it to send a different reply.');return;}const value=textarea.value.trim();if(value){draft='';textarea.value='';clearTimeout(draftTimer);submit(value);}};
    transcript.onscroll=()=>{if(programmaticScroll)return;scrollTop=transcript.scrollTop;followLatest=transcript.scrollHeight-transcript.clientHeight-scrollTop<55;const latest=find('.diagnostic-newest');if(latest)latest.hidden=followLatest||!!sheet;};
    transcript.addEventListener('wheel',()=>{programmaticScroll=false;},{passive:true});transcript.addEventListener('touchmove',()=>{programmaticScroll=false;},{passive:true});
    const file=find('#diagnostic-pdf-input');file.onchange=()=>{const chosen=file.files?.[0],origin=picker;picker=null;file.value='';if(chosen)upload(chosen,origin);else if(origin)eventRecord({type:'file_cancelled'},origin.jobId);};
    file.addEventListener('cancel',()=>{const origin=picker;picker=null;if(origin)eventRecord({type:'file_cancelled'},origin.jobId);});
  }
  function updateViewport(){
    if(!active())return;const height=window.visualViewport?.height||innerHeight,workspace=find('.diagnostic-workspace');app.style.setProperty('--diagnostic-viewport-height',`${Math.round(height)}px`);
    if(workspace){const footer=document.querySelector('body > footer'),footerHeight=footer?.offsetHeight||0,top=workspace.getBoundingClientRect().top;app.style.setProperty('--diagnostic-workspace-height',`${Math.max(110,Math.round(height-Math.max(0,top)-footerHeight-10))}px`);app.style.setProperty('--terminal-composer-height',`${find('.diagnostic-composer')?.offsetHeight||150}px`);const focused=document.activeElement,transcript=find('.diagnostic-transcript');if(focused&&transcript?.contains(focused)&&/^(INPUT|SELECT|TEXTAREA)$/.test(focused.tagName)){followLatest=false;requestAnimationFrame(()=>{const a=focused.getBoundingClientRect(),b=transcript.getBoundingClientRect();if(a.bottom>b.bottom-12)transcript.scrollTop+=a.bottom-b.bottom+12;else if(a.top<b.top+12)transcript.scrollTop-=b.top-a.top+12;});}else if(followLatest)followOutput();}
  }
  async function eventRecord(event,originId=sessionId){if(getSession()?.id!==originId)return;await mutate(s=>terminal.recordTerminalEvent(s,event));}
  async function errorRecord(error,operation,originId=sessionId){
    if(getSession()?.id!==originId)return;
    const code=error.name==='AbortError'?(operation==='resources'?'resource_cancelled':operation==='download'?'manual_download_cancelled':'processing_cancelled'):(error.code||(/storage|quota/i.test(error.message)?'STORAGE_UNAVAILABLE':operation==='resources'?'RESOURCE_DOWNLOAD_FAILED':operation==='download'?'MANUAL_DOWNLOAD_FAILED':'MANUAL_PROCESSING_FAILED'));
    const details=getManualProcessingErrorDetails(error);
    await mutate(s=>{const next=terminal.recordTerminalEvent(s,{type:'error',code,operation,message:error.message,retryEffect:operation==='resources'?'resources':'retry_import'});next.diagnosticChat.terminal.lastErrorDetails={operation,...details};const message=next.diagnosticChat.messages.at(-1);if(message?.terminalKind==='error')message.errorDetails=structuredClone(next.diagnosticChat.terminal.lastErrorDetails);return next;});
  }
  async function submit(value){
    sync();const originId=sessionId;typer.reveal({all:true});
    if(onQuickQuestions&&/^quick\s+questions$/i.test(String(value).trim())){const next=terminal.recordTerminalEvent(current,{type:'navigation_command',text:String(value),role:'user'});next.diagnosticChat.ui={...next.diagnosticChat.ui,draft};try{await save(next);await flush();if(getSession()?.id===originId)await onQuickQuestions();}catch(error){toast(error.message);if(active())render();}return;}
    if(processing){toast('Cancel the current operation before sending another reply.');return;}
    const languageRequest=buildFaultLanguageRequest(current,value);
    if(languageRequest?.kind==='component_manual'){manualRole=languageRequest.equipmentRole;await save(requestFaultComponentManual(current,languageRequest));return;}
    if(languageRequest){await localLanguageReply(languageRequest);return;}
    const outcome=terminal.submitTerminalInput(current,value,{id:uid()});outcome.session.diagnosticChat.ui={...outcome.session.diagnosticChat.ui,draft};
    const pending=save(outcome.session).then(()=>true).catch(error=>{toast(error.message);if(active())render();return false;});
    // A file picker must open in the original trusted tap/Enter event, before awaiting IndexedDB.
    if(outcome.effect?.type==='upload'){openPicker(outcome.effect);await pending;return;}
    if(await pending&&getSession()?.id===originId&&outcome.effect)await runEffect(outcome.effect);
  }
  async function localLanguageReply(request){
    const originId=sessionId,abort=new AbortController();processing={abort,id:originId,kind:'model'};progress={message:'Preparing a local language reply…'};
    try{
      await save(beginFaultLanguage(current,request));await pendingOperation('model',{requestId:request.id},originId);renderOperation();
      const readiness=await getLocalLanguageReadiness();
      if(!readiness.ready&&!readiness.installed)throw Object.assign(Error('Local language resources are not ready.'),{code:'MODEL_NOT_READY'});
      if(request.kind==='explanation'){
        const analyses=[];for(const manual of current.diagnosticChat.manuals){const analysis=await getManualAnalysis(manual.contentHash,{processorVersion:manual.processorVersion});if(analysis)analyses.push(analysis);}
        request=buildFaultLanguageRequest(current,request.raw,{analyses,id:request.id})||request;
      }
      const response=await generateLocalReply({messages:request.messages,maxNewTokens:request.maxNewTokens,signal:abort.signal,onProgress:value=>{progress=value;renderOperation();}});
      if(!abort.signal.aborted&&getSession()?.id===originId)await save(applyFaultLanguageReply(current,request,response));
    }catch(error){if(getSession()?.id===originId)await save(failFaultLanguage(current,request,error)).catch(failure=>toast(failure.message));}
    finally{if(processing?.abort===abort){processing=null;progress=null;}await clearOperation(originId);if(active())render();}
  }
  function openPicker(effect={}){if(processing)return;sheet=null;followLatest=true;renderSheet();followOutput();const file=find('#diagnostic-pdf-input');if(!file)return;picker={jobId:sessionId,equipmentRole:effect.equipmentRole||manualRole};file.value='';file.click();}
  async function runEffect(effect){
    if(effect.type==='saved'||effect.type==='archive'){sheet={kind:effect.type};manualQuery='';manualRole=effect.equipmentRole||manualRole;renderSheet();showSheetStart();}
    else if(effect.type==='log'){sheet={kind:'log'};renderSheet();showSheetStart();}
    else if(effect.type==='copy')await copyReport();
    else if(effect.type==='export'){sheet={kind:'report'};reportFormat='json';renderSheet();showSheetStart();}
    else if(effect.type==='resources')await prepareResources();
    else if(effect.type==='retry_import'){if(lastImport)await processManual(lastImport.blob,lastImport.record,sessionId,lastImport.equipmentRole);else{const previous=current.diagnosticChat.terminal.lastManualAttempt;if(previous?.manualId){const blob=await db.getFile(previous.manualId);if(blob)await processManual(blob,getSaved().get(previous.manualId),sessionId,previous.equipmentRole);else openPicker();}else openPicker();}}
    else if(effect.type==='retry_save')await save(terminal.recordTerminalEvent(current,{type:'save_retry',text:'Retrying the local save.',role:'assistant'})).catch(error=>{toast(error.message);render();});
    else if(effect.type==='recalculate')recalculate(effect.eventId);
    else if(effect.type==='measurement')measurementDialog();
    else if(effect.type==='conditions')location.hash='#investigation/evidence';
    else if(effect.type==='error_details'){sheet={kind:'error'};renderSheet();showSheetStart();}
  }
  function readinessMarkup(){const missing=list(readiness?.missing),ready=readiness?.ready&&getOfflineReady();return `<p><strong>${ready?'Offline kit ready':readiness?.supported===false?'Processing unavailable here':'Offline kit not ready yet'}</strong></p><p>${esc(readiness?.message||readiness?.reason|| (ready?'PDF reading, English OCR and diagnostic rules are installed.':'Keep a connection while the app and PDF/OCR resources finish downloading.'))}</p>${missing.length?`<p>${missing.length} files still needed · ${((readiness.downloadBytes||0)/1048576).toFixed(1)} MB</p>`:''}<div class="inline-actions">${button('check-resources','[ check again ]','subtle')}${!ready?button('resources','[ download resources ]','secondary',processing?'disabled':''):''}</div>`;}
  function renderOperation(){const slot=find('.terminal-operation');if(!slot)return;if(!processing){slot.innerHTML='';return;}const total=Number(progress?.total||0),completed=Number(progress?.completed||0)+(Number(progress?.pageProgress)||0),value=total?Math.min(100,completed/total*100):null;slot.innerHTML=`<div class="diagnostic-progress" role="status"><span>FINDR &gt; ${esc(progress?.message||'Working…')}${progress?.page?' · page '+progress.page+(progress.pages?' / '+progress.pages:''):''}</span><progress ${value!==null?`value="${value}" max="100"`:''}></progress>${button('cancel-processing','[ cancel ]','subtle')}</div>`;if(followLatest)followOutput();}
  function manualResults(){const saved=getSaved(),entries=sheet?.kind==='archive'?findManuals(getRecords(),{query:manualQuery}).slice(0,30):[...saved.values()].filter(r=>`${r.title} ${r.brand} ${(r.models||[]).join(' ')}`.toLowerCase().includes(manualQuery.toLowerCase())).slice(0,40);return entries.length?entries.map(r=>`<div class="terminal-manual-result"><strong>${esc(r.title)}</strong><small>${esc(r.brand||'Uploaded PDF')} · ${saved.has(r.id)?'saved on this device':r.url?'available to download':'no PDF link'}</small><div>${button(sheet.kind==='archive'?'archive-select':'select-manual',saved.has(r.id)?'[ use manual ]':'[ download and use ]','subtle',`data-id="${esc(r.id)}" ${!saved.has(r.id)&&!r.url||processing?'disabled':''}`)}${saved.has(r.id)?button('source','[ open PDF ]','subtle',`data-id="${esc(r.id)}"`):''}</div></div>`).join(''):'<p>No matches. Try the exact model or upload a PDF.</p>';}
  function renderSheet(){const slot=find('.terminal-sheet-slot');if(!slot)return;if(!sheet){slot.innerHTML='';return;}
    if(sheet.kind==='helper'){if(slot.dataset.sheetKey!==sheet.key){slot.innerHTML=`<section class="terminal-sheet">${button('close-sheet','[ close helper ]','subtle')}${sheet.html}</section>`;slot.dataset.sheetKey=sheet.key;}return;}
    delete slot.dataset.sheetKey;let html='';
    if(['saved','archive'].includes(sheet.kind))html=`<h2>${sheet.kind==='saved'?'Saved manuals':'Manual Archives'}</h2>${sheet.kind==='archive'&&!navigator.onLine?'<p>Archive downloads need a connection. Your saved PDFs and uploads work offline.</p>':''}<form id="terminal-manual-search-form"><label>Model / manufacturer<input id="diagnostic-manual-search" type="search" value="${esc(manualQuery)}" placeholder="Search manuals"></label><button class="secondary">Find</button></form><div class="diagnostic-manual-list">${manualResults()}</div>`;
    else if(sheet.kind==='readiness')html=readinessMarkup();
    else if(sheet.kind==='report')html=reportMarkup();
    else if(sheet.kind==='log')html=evidenceMarkup();
    else if(sheet.kind==='error')html=`<h2>Error details</h2><p>Reader stage, browser capability and the original exception. Document contents and job answers are not included.</p><pre class="assistant-error-stack">${esc(JSON.stringify(current.diagnosticChat.terminal.lastErrorDetails||{},null,2))}</pre>`;
    slot.innerHTML=`<section class="terminal-sheet">${button('close-sheet','[ return to conversation ]','subtle')}${html}</section>`;
    const search=find('#terminal-manual-search-form');if(search){const field=find('#diagnostic-manual-search');field.oninput=()=>{manualQuery=field.value;find('.diagnostic-manual-list').innerHTML=manualResults();};search.onsubmit=event=>{event.preventDefault();eventRecord({type:'archive_query',query:manualQuery});};}
    const format=find('[name="reportFormat"]');if(format)format.onchange=()=>{reportFormat=format.value;renderSheet();};const redaction=find('#diagnostic-redact');if(redaction)redaction.onchange=()=>{redact=redaction.checked;renderSheet();};
  }
  function showSheetStart(){if(!sheet)return;followLatest=false;requestAnimationFrame(()=>{const slot=find('.terminal-sheet-slot'),transcript=find('.diagnostic-transcript');if(!slot||!transcript)return;programmaticScroll=true;transcript.scrollTop+=slot.getBoundingClientRect().top-transcript.getBoundingClientRect().top;const newest=find('.diagnostic-newest');if(newest)newest.hidden=true;requestAnimationFrame(()=>{programmaticScroll=false;});});}
  function showModal(html){sheet={kind:'helper',html,key:uid()};renderSheet();showSheetStart();}
  function closeModal(){sheet=null;renderSheet();followLatest=true;followOutput();}
  async function hydrateManuals(){
    if(hydrating)return;const missing=engine.missingDiagnosticManualAnalyses(current);if(!missing.length)return;
    const key=sessionId+':'+missing.map(m=>m.contentHash+':'+m.processorVersion).join(',');if(key===hydratedKey)return;
    hydratedKey=key;hydrating=true;const originId=sessionId;
    try{for(const manual of missing){const analysis=await getManualAnalysis(manual.contentHash,{processorVersion:manual.processorVersion});if(analysis)engine.registerDiagnosticManualAnalysis(analysis);}if(getSession()?.id!==originId)return;await mutate(s=>terminal.refreshTerminalPrompt(s));}
    catch(error){await errorRecord(error,'restore',originId);}
    finally{hydrating=false;if(active())render();}
  }
  async function checkReadiness(){if(readinessPending)return;readinessPending=true;try{readiness=await getManualProcessingReadiness();}catch(error){readiness={ready:false,supported:false,reason:error.message};}finally{readinessPending=false;if(active())renderSheet();}return readiness;}
  async function pendingOperation(kind,extra={},originId=sessionId){if(getSession()?.id!==originId)return;await mutate(s=>{const next=structuredClone(s);next.diagnosticChat.terminal.pendingOperation={kind,...extra};return next;});}
  async function clearOperation(originId){if(getSession()?.id!==originId)return;await mutate(s=>{const next=structuredClone(s);delete next.diagnosticChat.terminal.pendingOperation;return next;});}
  async function prepareResources(){
    if(openResources){if(processing)return;await openResources({origin:{kind:'faults',id:sessionId}});return;}
    if(processing)return;const originId=sessionId,abort=new AbortController();processing={abort,id:originId,kind:'resources'};progress={message:'Downloading PDF / OCR resources…'};sheet=null;followLatest=true;
    await eventRecord({type:'resources_started'},originId);if(getSession()?.id!==originId||abort.signal.aborted){if(processing?.abort===abort)processing=null;return;}await pendingOperation('resources',{},originId);renderOperation();
    try{await downloadManualProcessingResources({signal:abort.signal,onProgress:value=>{progress=value;renderOperation();}});await eventRecord({type:'resources_ready'},originId);}
    catch(error){await errorRecord(error,'resources',originId);}
    finally{processing=null;progress=null;await clearOperation(originId);await checkReadiness();if(active())render();}
  }
  async function resourceEvent(event){
    const originId=event.origin?.id;
    if(event.origin?.kind!=='faults'||!originId||getSession()?.id!==originId)return;
    sync();const model=event.resource==='model';
    if(event.type==='resource_download_started'){
      if(model)await mutate(s=>{let next=terminal.recordTerminalEvent(s,{type:'resource_action',role:'user',text:'Download the local language model.'});next.diagnosticChat.terminal.notice=null;return terminal.recordTerminalEvent(next,{type:'resource_progress',role:'assistant',text:'Downloading local language resources. The offline kit shows the actual progress.'});});
      else await eventRecord({type:'resources_started'},originId);
      await pendingOperation('resources',{resource:event.resource},originId);return;
    }
    if(event.type==='resource_download_completed'){
      await clearOperation(originId);if(getSession()?.id!==originId)return;
      if(!model&&event.ready)await eventRecord({type:'resources_ready'},originId);
      else await mutate(s=>{const next=structuredClone(s);next.diagnosticChat.terminal.notice=null;return terminal.recordTerminalEvent(next,{type:'assistant_resource_status',role:'assistant',text:event.ready?'The local language model is ready offline. It will load when a reply needs it.':model?'The model files are saved. Check the offline kit for app runtime files still needed.':'The processing download finished. Check the offline kit for any resources still needed.'});});
      if(!model)await checkReadiness();return;
    }
    if(['resource_download_cancelled','resource_download_failed'].includes(event.type)){
      await clearOperation(originId);await eventRecord({type:'error',operation:'resources',code:event.type==='resource_download_cancelled'?'resource_cancelled':event.error?.code||(model?'MODEL_RESOURCE_DOWNLOAD_FAILED':'RESOURCE_DOWNLOAD_FAILED'),message:event.error?.message||'The resource download did not finish. Your manuals and conversation are unchanged.',retryEffect:'resources'},originId);
    }
  }
  async function processManual(blob,record,originId=getSession()?.id,equipmentRole=manualRole){
    if(processing||originId!==getSession()?.id||!record)return;sync();const abort=new AbortController();processing={abort,id:originId,kind:'manual'};progress={message:'Checking PDF and preparing local text extraction…'};sheet=null;lastImport={blob,record,equipmentRole};
    await eventRecord({type:'processing_started',filename:record.filename||record.title},originId);
    if(getSession()?.id!==originId||abort.signal.aborted){if(processing?.abort===abort)processing=null;return;}
    await mutate(s=>{const next=structuredClone(s);next.diagnosticChat.terminal.lastManualAttempt={manualId:record.id,equipmentRole};next.diagnosticChat.terminal.pendingOperation={kind:'manual',manualId:record.id};return next;});
    try{
      const analysis=await analyseManual({blob,record,signal:abort.signal,onProgress:value=>{progress=value;renderOperation();}});
      if(abort.signal.aborted||originId!==sessionId||getSession()?.id!==originId)return;
      if(!analysis.usable){const error=Error(analysis.quality?.message||'Too little readable text.');error.code='UNREADABLE_MANUAL';throw error;}
      await mutate(s=>terminal.attachTerminalManual(s,analysis,{equipmentRole}));
    }catch(error){await errorRecord(error,'manual',originId);}
    finally{if(processing?.abort===abort){processing=null;progress=null;}await clearOperation(originId);if(active()&&originId===getSession()?.id)render();}
  }
  async function upload(file,origin={jobId:sessionId,equipmentRole:manualRole}){
    if(!file)return;origin=origin||{jobId:sessionId,equipmentRole:manualRole};const {jobId:originId,equipmentRole}=origin;
    await eventRecord({type:'file_selected',filename:file.name},originId);
    try{const hash=await validatePDF(file),record={id:'local-'+hash,title:file.name.replace(/\.pdf$/i,''),filename:file.name,brand:'Local import',category:'local',models:[],type:'user-import',url:null,bytes:file.size,fileHash:hash,savedAt:Date.now(),imported:true};
      try{await db.saveManual(record,file);}catch(error){error.code='STORAGE_UNAVAILABLE';throw error;}
      await refreshSaved();if(getSession()?.id!==originId)return;await processManual(file,record,originId,equipmentRole);
    }catch(error){if(!error.code)error.code='INVALID_PDF';await errorRecord(error,'manual',originId);}
  }
  async function selectManual(id,archive=false){
    if(processing)return;const originId=sessionId,equipmentRole=manualRole,record=getSaved().get(id)||getRecords().find(r=>r.id===id);if(!record)return;
    sheet=null;followLatest=true;await eventRecord({type:archive?'archive_selected':'saved_manual_selected',filename:record.filename,title:record.title,manualId:id,saved:getSaved().has(id)},originId);
    if(getSession()?.id!==originId)return;
    if(!getSaved().has(id)){
      if(!downloadManual){await errorRecord(Object.assign(Error('Download this manual from Manual Archives, then choose it from saved manuals.'),{code:'MANUAL_DOWNLOAD_FAILED'}),'download',originId);return;}
      const abort=new AbortController();processing={abort,id:originId,kind:'download'};progress={message:'Downloading '+record.title};await pendingOperation('download',{manualId:id},originId);
      try{await downloadManual(id,{signal:abort.signal,onProgress:p=>{progress=p;renderOperation();}});}
      catch(error){await errorRecord(error,'download',originId);return;}
      finally{processing=null;progress=null;await clearOperation(originId);if(active())render();}
    }
    try{const blob=await db.getFile(id);if(!blob){const error=Error('This PDF is not saved here. Download it again or upload a copy.');error.code='SAVED_PDF_MISSING';throw error;}await processManual(blob,getSaved().get(id)||record,originId,equipmentRole);}
    catch(error){await errorRecord(error,'manual',originId);}
  }
  function reportMarkup(){const report=engine.getDiagnosticReport(current,{format:reportFormat,redact});return `<section class="diagnostic-report"><h2>Review before exporting</h2><p>Cause confirmation and restoration are separate. Unknown details remain explicit.</p><div class="field-form">${select('reportFormat','Report',['short','text','json'],reportFormat)}<label class="field-check"><input id="diagnostic-redact" type="checkbox" ${redact?'checked':''}> Redact identifying site / network details</label><textarea id="diagnostic-report-preview" rows="18" readonly aria-label="Report preview">${esc(typeof report==='string'?report:JSON.stringify(report,null,2))}</textarea></div><div class="inline-actions">${button('copy','Copy handover','primary')}${button('export','Download reviewed report','secondary')}${button('resume','Resume this visit','secondary')}${button('chat','Back to conversation','subtle')}</div></section>`;}
  function evidenceMarkup(){const events=list(current.fieldVisit?.events),superseded=new Set(events.map(e=>e.supersedes).filter(Boolean));return `<section class="diagnostic-evidence"><h2>Evidence, in your words</h2><p>Recorded observations are separate from inferred findings. Corrections retain the original.</p><div class="inline-actions">${button('chat','Return to conversation','secondary')}<a class="secondary" href="#investigation/evidence">Detailed conditions, topology & restoration</a></div>${events.map(event=>`<article class="field-card"><small>${esc(event.testKind)} · ${stamp(event.capturedTime)}${superseded.has(event.id)?' · superseded':''}</small><h3>${esc(event.result?.rawText||event.answer||'Not recorded')} ${esc(event.result?.unit||'')}</h3><p>${esc(list(event.points).map(p=>p.location||p.terminal||p.label).join(' → '))}</p><p>${esc(label(event.operatingState))} · ${esc(label(event.circuitState))} · ${esc(event.interpretation?.reason||'No model-specific conclusion inferred.')}</p>${button('correct','Add correction','subtle',`data-id="${esc(event.id)}"`)}</article>`).join('')||'<p>No tests recorded yet.</p>'}</section>`;}
  function answerCorrectionDialog(original){showModal(`<h2>Correct this answer</h2><p>The original ${esc(original.result?.rawText||original.answer)} is retained.</p><form id="diagnostic-answer-correction" class="field-form">${select('answer','Correct answer',[['yes','Yes'],['no','No'],['unknown','I don’t know'],['blocked','Can’t test here']],'unknown')}${area('reason','Why this correction / why blocked?','','required')}<button class="primary">Save correction</button></form>`);document.querySelector('#diagnostic-answer-correction').onsubmit=async event=>{event.preventDefault();const values=Object.fromEntries(new FormData(event.currentTarget));await mutate(s=>engine.correctDiagnosticEvent(terminal.recordTerminalEvent(s,{type:'observation',text:'Correction: '+values.answer+'. '+values.reason}),original.id,{...values,correctionReason:values.reason}));closeModal();};}
  function measurementDialog(id=''){
    correctionId=id;const event=list(current.fieldVisit?.events).find(e=>e.id===id)||{},pending=!id?(prompt().enginePrompt||prompt()).pendingMeasurement||{}:{},point=event.points?.[0]||{},reference=event.points?.[1]||{};
    showModal(`<h2>${id?'Correct a recorded result':'Quick reading'}</h2><p>${id?'The original remains in the log.':'Record a test you have performed. This form does not authorise electrical work.'}</p><form id="diagnostic-measurement-form" class="field-form">${select('testKind','Test',['voltage','resistance','continuity','current','observation','functional_test'],event.testKind||pending.testKind||'voltage')}${input('point','Measurement point',point.location||point.terminal||point.label||pending.label||'','list="diagnostic-points" placeholder="e.g. Panel / first device + terminal" required')}<datalist id="diagnostic-points"><option>Panel output</option><option>PSU output</option><option>First device</option><option>Last device</option><option>Lock terminals</option><option>Recorder display</option></datalist>${input('reference','Across / reference',reference.location||reference.terminal||event.reference||pending.reference||'','placeholder="e.g. AUX− at same PSU; 0 V is not PE"')}${input('rawText','Reading / observation',event.result?.rawText||pending.rawText||'','placeholder="0, 12.40, OL, unstable, not tested…" required')}${select('unit','Units',['V','mV','Ω','kΩ','MΩ','A','mA','W','dB','state'],event.result?.unit||pending.unit||'V')}${select('operatingState','Operating condition',['unknown','normal','alarm','release_demand','night_IR','full_load','on_battery','other'],event.operatingState||pending.operatingState||'unknown')}${select('circuitState','Circuit state',['unknown','energised_connected','energised_disconnected','isolated','proved_dead'],event.circuitState||pending.circuitState||'unknown')}<details><summary>Instrument / notes</summary>${select('source','Source',['meter','panel','visual','human_report'],event.result?.source||pending.source||'meter')}${input('instrument','Instrument / display',event.instrument?.id||pending.instrument?.id||'')}${area('notes',id?'Why this correction?':'Observation / exact condition',event.notes||'')}</details><label class="field-check"><input type="checkbox" name="allowIncomplete"> Keep missing conditions explicitly unverified</label><details><summary>Functional retest record</summary><p>Use only for a completed functional test, with its prerequisites recorded.</p>${input('verificationFunction','Function tested','','placeholder="e.g. Door 2 physical release and resecure"')}<label class="field-check"><input type="checkbox" name="verificationPassed"> I observed this functional test pass</label></details><button class="primary" type="submit">Save reading to log</button></form>`);
    const form=document.querySelector('#diagnostic-measurement-form');form.elements.testKind.onchange=()=>{if(['observation','functional_test'].includes(form.elements.testKind.value)){form.elements.unit.value='state';form.elements.source.value='visual';}};
    form.onsubmit=async event=>{event.preventDefault();const values=Object.fromEntries(new FormData(form));const measurement={...values,id:pending.id||uid(),allowIncomplete:values.allowIncomplete==='on',points:[{location:values.point,role:'test_point'},...(values.reference?[{location:values.reference,role:'reference'}]:[])],result:{rawText:values.rawText,unit:values.unit,source:values.source},instrument:{id:values.instrument},verification:values.testKind==='functional_test'?{function:values.verificationFunction,passed:values.verificationPassed==='on'}:undefined};await mutate(s=>correctionId?engine.correctDiagnosticEvent(terminal.recordTerminalEvent(s,{type:'observation',text:'Corrected reading: '+values.rawText+' '+values.unit+' at '+values.point+'. '+values.notes}),correctionId,measurement):terminal.recordTerminalMeasurement(s,measurement));closeModal();};
  }
  function calculatorDialog(){const definitions=Array.isArray(CALCULATOR_DEFINITIONS)?CALCULATOR_DEFINITIONS:Object.entries(CALCULATOR_DEFINITIONS||{}).map(([id,x])=>({id,...x})),definition=definitions.find(x=>x.id===calculatorKind||x.kind===calculatorKind)||definitions[0];if(!definition){toast('Calculator definitions unavailable.');return;}showModal(`<h2>Fault-finding calculator</h2><p>Arithmetic supports the investigation. Equipment limits require an applicable manual.</p><form id="diagnostic-calculator-form" class="field-form">${select('kind','Calculation',definitions.map(d=>[d.id||d.kind,d.title||d.label||label(d.id||d.kind)]),calculatorKind)}<div id="diagnostic-calculator-fields">${list(definition.fields).map(field=>field.type==='checkbox'?`<label class="field-check"><input type="checkbox" name="${esc(field.key)}">${esc(field.label)}</label>`:field.type==='select'?select(field.key,esc(field.label),field.options.map(o=>[o.value,o.label])):input(field.key||field.name,esc(field.label||field.title||label(field.key||field.name)),'',`type="${field.type==='datetime-local'?'datetime-local':'text'}" placeholder="${esc(field.placeholder||'')}"`)).join('')}</div><button class="primary" type="submit">Calculate</button></form><div id="diagnostic-calculator-result" aria-live="polite"></div>`);const form=document.querySelector('#diagnostic-calculator-form');form.elements.kind.onchange=()=>{calculatorKind=form.elements.kind.value;calculatorDialog();};form.onsubmit=event=>{event.preventDefault();const data=Object.fromEntries(new FormData(form));try{for(const field of definition.fields||[])if(field.type==='checkbox')data[field.key]=form.elements[field.key].checked;const result=calculateDiagnostic(data.kind,data);lastCalculation={result,input:data,id:uid()};document.querySelector('#diagnostic-calculator-result').innerHTML=`<h3>${esc(label(result.status))}</h3><p>${esc(result.summary)}</p><pre>${esc(JSON.stringify(result.values||{},null,2))}</pre><p>${esc([...list(result.missing),...list(result.assumptions),...list(result.warnings)].join('\n'))}</p>${button('save-calculation','Save calculation to this log','secondary',result.status==='invalid'?'disabled':'')}`;}catch(error){document.querySelector('#diagnostic-calculator-result').textContent=error.message;}};}
  function recalculate(id){const event=current.fieldVisit?.events?.find(e=>e.id===id);if(!event?.calculation)return;calculatorKind=event.calculation.kind;calculatorDialog();const form=find('#diagnostic-calculator-form');for(const [key,value]of Object.entries(event.calculation.rawInputs||{})){const field=form.elements.namedItem(key);if(field){if(field.type==='checkbox')field.checked=value===true;else field.value=String(value);}}}
  async function copyReport(){const text=engine.getDiagnosticReport(current,{format:'short',redact});try{await navigator.clipboard.writeText(text);toast('Engineer handover copied.');}catch{sheet={kind:'report'};reportFormat='short';renderSheet();toast('Select and copy the handover below.');}}
  function exportReport(){const content=engine.getDiagnosticReport(current,{format:reportFormat,redact}),blob=new Blob([typeof content==='string'?content:JSON.stringify(content,null,2)],{type:reportFormat==='json'?'application/json':'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`FINDR-diagnostic-${new Date().toISOString().slice(0,10)}.${reportFormat==='json'?'json':'txt'}`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function handleAction(action,id,value,node){
    sync();if(!current)return;
    switch(action){
      case'option':case'reply':case'command':if(node?.dataset.promptKey&&node.dataset.promptKey!==prompt().key)return;await submit(value);break;
      case'skip-intro':typer.reveal({all:true});await mutate(s=>terminal.skipTerminalIntro(s));break;
      case'reveal':typer.reveal({all:false});break;
      case'chat':case'close-sheet':closeModal();break;
      case'manuals':await submit('MANUALS');break;
      case'upload':openPicker();break;
      case'archive':sheet={kind:'archive'};renderSheet();showSheetStart();break;
      case'select-manual':await selectManual(id);break;
      case'archive-select':await selectManual(id,true);break;
      case'source':{const expected=node?.dataset.sourceHash,record=getSaved().get(id);if(expected&&record?.fileHash!==expected){const matching=[...getSaved().values()].find(r=>r.fileHash===expected);if(matching)await readPDF(matching.id,{page:Number(node?.dataset.page)||1});else if(record)await readPDF(id,{page:1,notice:'This saved PDF differs from the edition cited in this visit. Opened page 1; the original page excerpt remains in the conversation.'});else toast('The cited edition is no longer saved. Its page excerpt and revision remain in the report.');}else await readPDF(id,{page:Number(node?.dataset.page)||1});break;}
      case'cancel-processing':processing?.abort.abort();break;
      case'readiness':if(openResources){await openResources({origin:{kind:'faults',id:sessionId}});break;}sheet={kind:'readiness'};renderSheet();showSheetStart();await checkReadiness();break;
      case'check-resources':await checkReadiness();break;
      case'resources':await prepareResources();break;
      case'error-details':sheet={kind:'error'};renderSheet();showSheetStart();break;
      case'quick-questions':await submit('QUICK QUESTIONS');break;
      case'prepare-test':await mutate(s=>engine.prepareDiagnosticTest(terminal.recordTerminalEvent(s,{type:'observation',text:'Check the prerequisites for this test.'})));break;
      case'measurement':if(!list(current.diagnosticChat.manuals).length){await submit('I want to record a reading');break;}measurementDialog();break;
      case'correct':{let event=current.fieldVisit?.events?.find(e=>e.id===id);if(event?.testKind==='reading_assessment'){id=event.readingAssessment?.readingEventId;event=current.fieldVisit.events.find(e=>e.id===id);}if(!event){toast('Correct the original reading through BACK.');break;}if(event.testKind==='question_answer')answerCorrectionDialog(event);else if(event.testKind==='calculation')recalculate(id);else measurementDialog(id);break;}
      case'evidence':await submit('LOG');break;
      case'calculator':calculatorDialog();break;
      case'save-calculation':if(lastCalculation){await mutate(s=>recordDiagnosticCalculation(terminal.recordTerminalEvent(s,{type:'observation',text:'Calculation: '+lastCalculation.result.summary}),lastCalculation.result,lastCalculation.input,{id:lastCalculation.id}));closeModal();}break;
      case'report':sheet={kind:'report'};renderSheet();showSheetStart();break;
      case'found':await submit('FAULT FOUND');break;
      case'give-up':await submit('GIVE UP');break;
      case'resume':sheet=null;await mutate(s=>terminal.resumeTerminalSession(s));break;
      case'newest':followLatest=true;followOutput();break;
      case'retry':await save(terminal.refreshTerminalPrompt({...current,diagnosticChat:{...current.diagnosticChat,terminal:{...current.diagnosticChat.terminal,notice:null}}})).catch(error=>{toast(error.message);if(active())render();});break;
      case'copy':await copyReport();break;
      case'export':exportReport();break;
      case'new-job':await flush();await onNewVisit?.();break;
      case'site':showModal(`<h2>Site and equipment</h2><form id="diagnostic-site-form" class="field-form">${input('site','Site / job reference',current.site||'')}${input('location','Equipment location',current.diagnosticChat.location||current.importedContext?.location||'')}<button class="primary">Save details</button></form>`);find('#diagnostic-site-form').onsubmit=async event=>{event.preventDefault();const values=Object.fromEntries(new FormData(event.currentTarget));await mutate(s=>{const next=terminal.recordTerminalEvent(s,{type:'observation',text:'Site: '+(values.site||'not recorded')+'. Equipment location: '+(values.location||'not recorded')});next.site=values.site;next.fieldVisit.siteRef=values.site;next.diagnosticChat.location=values.location;return next;});closeModal();};break;
    }
  }
  window.addEventListener('focus',()=>{const waiting=picker;if(!waiting)return;setTimeout(()=>{if(picker===waiting&&!find('#diagnostic-pdf-input')?.files?.length){picker=null;eventRecord({type:'file_cancelled'},waiting.jobId);}},500);});
  window.visualViewport?.addEventListener('resize',updateViewport);window.addEventListener('resize',updateViewport);
  window.addEventListener('pagehide',()=>{if(active())flush().catch(()=>{});});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&active())flush().catch(()=>{});});
  return {render,flush,handleAction,resourceEvent,leave:()=>{captureScroll();typer.reveal({all:true});},getReadiness:()=>readiness,offlineStatusChanged:()=>{readiness=null;if(active()&&!readinessPending)checkReadiness();}};
}
