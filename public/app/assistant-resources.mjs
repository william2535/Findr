import {getManualProcessingReadiness,downloadManualProcessingResources} from './manual-analysis.mjs';

const list=value=>Array.isArray(value)?value:[];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=value=>structuredClone(value);
const readableBytes=value=>Number.isFinite(value)&&value>0?value<1000000?`${(value/1000).toFixed(0)} KB`:value>=1000000000?`${(value/1000000000).toFixed(2)} GB`:`${(value/1000000).toFixed(1)} MB`:'';
const sum=items=>items.reduce((value,item)=>value+(Number(item.bytes)||0),0);
const statusLabel={checking:'Checking…',ready:'Ready offline',loaded:'Ready · loaded',missing:'Download needed','needs-test':'Device test required',loading:'Downloading…',testing:'Testing this device…',unsupported:'Not supported here',error:'Check failed',interrupted:'AI interrupted',waiting:'App installation pending'};
const shortError=error=>({name:String(error?.name||'Error'),code:String(error?.code||'RESOURCE_CHECK_FAILED'),message:String(error?.message||'The resource check did not finish.').slice(0,700)});
const loadLocalLanguage=()=>import('./local-language.mjs');

/** Separate asset/capability facts; a PDF count never establishes readiness. */
export function summarizeAssistantResources({appReady=false,manual=null,model=null,experimental=null,activeProfile='compact',profiles=[],operation=null,error=null,checkedAt=null,readinessErrors={}}={}){
  const app={name:'Offline app',state:appReady?'ready':'waiting',ready:appReady,supported:true,message:appReady?'The application shell is saved on this device.':'Keep FINDR open online until the offline app finishes installing.'};
  const manualRow=kind=>{
    const name=kind==='pdf'?'PDF reader':'English OCR';
    if(!manual)return {name,state:'checking',ready:false,supported:null,message:'Checking local processing resources.'};
    const resources=list(manual.resources).filter(resource=>resource.kind===kind),missing=resources.filter(resource=>!resource.cached),supported=manual.supported!==false;
    const complete=resources.length>0&&!missing.length;
    const ready=supported&&complete&&manual.offlineControlled===true;
    const state=!supported?'unsupported':ready?'ready':!complete?'missing':'waiting';
    return {name,state,ready,supported,totalBytes:sum(resources),downloadBytes:sum(missing),missingCount:missing.length,
      message:!supported?(manual.message||'The required PDF/OCR capability is not available in this browser.'):ready?(kind==='pdf'?'Reader, worker, fonts and rendering resources are saved.':'English scan recognition resources are saved.'):
        !complete?`${missing.length||'Required'} processing files are not yet saved.`:'Files are present, but the active offline app has not verified this installation.'};
  };
  const pdf=manualRow('pdf'),ocr=manualRow('ocr');
  const language=!model?{name:'Local language model',state:'checking',ready:false,supported:null,message:'Checking model files without loading the model.'}:
    {name:'Local language model',state:model.supported===false?'unsupported':model.status==='interrupted'?'interrupted':model.status==='error'?'error':model.status==='needs-test'?'needs-test':model.ready?'ready':model.installed?'waiting':'missing',ready:model.ready===true&&model.supported!==false&&!['error','interrupted'].includes(model.status)&&!model.recovery?.blocked,supported:model.supported!==false,
      installed:model.installed===true,loaded:model.loaded===true,title:model.model?.title||model.model?.id||'',revision:model.model?.revision||'',backend:model.capabilities?.backend||'',
      totalBytes:Number(model.totalBytes)||Number(model.model?.bytes)||0,downloadBytes:Number(model.downloadBytes)||0,savedBytes:Math.max(0,Number(model.savedBytes)||((Number(model.totalBytes)||Number(model.model?.bytes)||0)-(Number(model.downloadBytes)||0))),missingCount:list(model.missing).length,runtimeReady:model.runtimeReady===true,runtimeBytes:Number(model.model?.runtimeBytes)||0,
      message:model.message||(!model.supported?'This browser cannot run the local model.':'Download the model to enable local language replies.'),
      missingCapabilities:list(model.capabilities?.missing)};
  if(manual?.error){pdf.state=ocr.state='error';pdf.ready=ocr.ready=false;pdf.message=ocr.message=manual.error.message;}
  if(model?.error){language.state='error';language.ready=false;language.message=model.error.message;}
  for(const [key,rows] of [['manual',[pdf,ocr]],['model',[language]]])if(readinessErrors[key])for(const row of rows){row.readinessError=clone(readinessErrors[key]);row.lastKnownReady=row.ready;row.ready=false;row.state='error';row.message=readinessErrors[key].message;}
  const activeOperation=operation?.resource==='model'&&(!operation.profileId||operation.profileId===activeProfile);
  if(operation?.resource==='processing'){pdf.state=ocr.state='loading';}else if(activeOperation)language.state=operation.stage==='test'?'testing':'loading';
  const progress=activeOperation?operation.progress:null;
  if(progress&&Number.isFinite(progress.bytes)&&Number.isFinite(progress.totalBytes)&&progress.totalBytes>0&&progress.bytes>=0&&progress.bytes<=progress.totalBytes){language.totalBytes=progress.totalBytes;language.savedBytes=progress.bytes;language.downloadBytes=progress.totalBytes-progress.bytes;}
  const candidate=experimental?summarizeAssistantResources({model:experimental,readinessErrors:{model:readinessErrors.experimental}}).model:null;
  if(candidate){candidate.name='Experimental offline conversation model';candidate.canActivate=experimental.canActivate===true;candidate.trialProof=experimental.trialProof||null;if(operation?.profileId==='conversation-2b'){candidate.state=operation.stage==='test'?'testing':'loading';const p=operation.progress;if(operation.stage==='download'&&Number.isFinite(p?.bytes)&&Number(p.totalBytes)>0){candidate.totalBytes=p.totalBytes;candidate.savedBytes=p.bytes;candidate.downloadBytes=Math.max(0,p.totalBytes-p.bytes);}}}
  return {app,pdf,ocr,model:language,experimental:candidate,activeProfile,profiles:clone(profiles),operation:operation?clone(operation):null,error:error?clone(error):null,checkedAt,offlineReady:app.ready&&pdf.ready&&ocr.ready&&language.ready};
}

/** One download coordinator shared by both modes. It never loads model weights
 * to check readiness and never mutates a job or question history by itself. */
export function createAssistantResourcesController({getOfflineReady=()=>false,showModal,toast=()=>{},onEvent=()=>{},onChange=()=>{},dependencies={}}={}){
  const manualReadiness=dependencies.getManualProcessingReadiness||getManualProcessingReadiness;
  const prepareManual=dependencies.downloadManualProcessingResources||downloadManualProcessingResources;
  const modelAPI=dependencies.loadLocalLanguage||loadLocalLanguage;
  const selectPanel=dependencies.selectPanel||(()=>globalThis.document?.querySelector('[data-assistant-resources="local-kit"]'));
  const checkTimeoutMs=Number.isFinite(dependencies.resourceCheckTimeoutMs)&&dependencies.resourceCheckTimeoutMs>0?dependencies.resourceCheckTimeoutMs:15000;
  let manual=null,model=null,experimental=null,activeProfile='compact',profiles=[],operation=null,error=null,checkedAt=null,origin=null,refreshing=null,lastResource=null,lastProfileId=null,lastStage=null,progressTimer=null;
  let activeAttempt=null,attemptSequence=0,refreshRevision=0,readinessErrors={manual:null,model:null,experimental:null};
  let state=summarizeAssistantResources();
  const currentAppReady=()=>{try{return getOfflineReady()===true;}catch{return false;}};
  function publish(){state=summarizeAssistantResources({appReady:currentAppReady(),manual,model,experimental,activeProfile,profiles,operation,error,checkedAt,readinessErrors});try{onChange(clone(state));}catch{/* A UI callback cannot corrupt cached resources. */}render();return state;}
  // A conversation callback must never hold a resource attempt or its cancellation open.
  function event(type,attempt,extra={}){
    const payload={type,resource:attempt.resource,origin:clone(attempt.origin),operationId:attempt.id,...(attempt.profileId?{profileId:attempt.profileId}:{}),...(attempt.stage?{stage:attempt.stage}:{}),...extra};
    const failed=cause=>{toast('The resource action completed, but its conversation entry could not be saved.');console.error('FINDR resource event was not saved',{name:cause?.name,code:cause?.code});};
    try{Promise.resolve(onEvent(payload)).catch(failed);}catch(cause){failed(cause);}
  }
  function boundedCheck(work,name){
    let timer;
    const timeout=new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Object.assign(Error(`Checking the saved ${name} files took too long. Last known progress is retained. Check saved files again or resume the download.`),{code:'RESOURCE_CHECK_TIMEOUT'})),checkTimeoutMs);});
    return Promise.race([Promise.resolve().then(work),timeout]).finally(()=>clearTimeout(timer));
  }
  function invalidateChecks(){refreshRevision++;refreshing=null;}
  async function refresh({fresh=false}={}){
    if(refreshing&&!fresh)return refreshing;
    const revision=++refreshRevision;
    const task=(async()=>{
      const results=await Promise.allSettled([boundedCheck(manualReadiness,'PDF / OCR'),(async()=>{const api=await boundedCheck(modelAPI,'model software');const available=typeof api.getLocalLanguageProfiles==='function'?await api.getLocalLanguageProfiles():[],active=typeof api.getActiveLocalLanguageProfile==='function'?api.getActiveLocalLanguageProfile().id:'compact';const checks=await Promise.allSettled([boundedCheck(()=>api.getLocalLanguageReadiness(),'model'),available.some(p=>p.id==='conversation-2b')?boundedCheck(()=>api.getLocalLanguageReadiness({profileId:'conversation-2b'}),'experimental model'):Promise.resolve(null)]);return {available,active,checks};})()]);
      if(revision!==refreshRevision)return state;
      if(results[0].status==='fulfilled'){manual=results[0].value;readinessErrors.manual=null;}else readinessErrors.manual=shortError(results[0].reason);
      if(results[1].status==='fulfilled'){const value=results[1].value;profiles=value.available;activeProfile=value.active;const [active,candidate]=value.checks;if(active.status==='fulfilled'){model=active.value;readinessErrors.model=null;}else readinessErrors.model=shortError(active.reason);if(candidate.status==='fulfilled'){experimental=candidate.value;readinessErrors.experimental=null;}else readinessErrors.experimental=shortError(candidate.reason);}else readinessErrors.model=shortError(results[1].reason);
      checkedAt=Date.now();return publish();
    })().finally(()=>{if(refreshing===task){refreshing=null;render();}});
    refreshing=task;render();return task;
  }
  function rowMarkup(key,row){
    const busy=operation&&(key==='model'?operation.resource==='model'&&(!operation.profileId||operation.profileId===activeProfile):key==='experimental'?operation.profileId==='conversation-2b':operation.resource==='processing'&&['pdf','ocr'].includes(key));
    const total=readableBytes(row.totalBytes),needed=readableBytes(row.downloadBytes),size=row.state==='checking'?'':needed?`${needed} still to download${total?' · '+total+' total':''}`:total?`${total} installed resources`:'';
    const subtitle=['model','experimental'].includes(key)&&row.title?[row.title,row.backend?row.backend.toUpperCase()+' on this device':''].filter(Boolean).join(' · '):'';
    return `<div class="assistant-resource-row" data-state="${esc(row.state)}" data-resource="${key}"><span class="assistant-resource-name">${esc(row.name)}</span><span class="assistant-resource-status">${esc(busy&&operation.cancelling?'Cancelling…':statusLabel[row.state]||row.state)}</span>${subtitle?`<span class="assistant-resource-detail">${esc(subtitle)}</span>`:''}<span class="assistant-resource-detail">${esc(row.message)}</span>${size?`<span class="assistant-resource-detail">${esc(size)}</span>`:''}${row.missingCapabilities?.length?`<span class="assistant-resource-detail">Missing: ${esc(row.missingCapabilities.join(', '))}</span>`:''}</div>`;
  }
  function progressMarkup(){
    if(!operation)return '';
    const p=operation.progress||{},testing=operation.stage==='test',target=operation.profileId==='conversation-2b'?state.experimental:state.model,total=testing?0:Number(p.totalBytes)||0,done=Number.isFinite(p.bytes)?p.bytes:operation.resource==='model'?Number(target?.savedBytes)||0:0,fileTotal=testing?0:Number(p.total)||0,fileDone=Number(p.completed)||0;
    const fraction=total>0?Math.min(1,done/total):fileTotal>0?Math.min(1,fileDone/fileTotal):null;
    const partDone=Number(p.partReceived)||0,partTotal=Number(p.partTotal)||0,received=Number(p.receivedBytes)||0;
    const phase=testing?'Running a local device test':{checking:'Checking saved parts',download:'Receiving model data',saving:'Saving a completed part',retry:'Retrying the current part',verify:'Checking file integrity'}[p.phase]||'Preparing resources';
    const part=partTotal>0?`<small>Current transfer: ${esc(readableBytes(partDone)||'0 KB')} / ${esc(readableBytes(partTotal))}${Number.isInteger(p.partIndex)&&Number(p.partCount)>0?' · part '+esc(p.partIndex+1)+' of '+esc(p.partCount):''}${Number(p.attempt)>1?' · attempt '+esc(p.attempt):''}</small>`:'';
    const transfer=received>0?`<small>${esc(readableBytes(received))} received during this attempt${p.fallback||p.reread?' · includes earlier bytes being reread':''}. Saved progress advances when a complete part is stored.</small>`:'';
    const verification=p.phase==='verify'&&fileTotal>0?`<small>File check: ${esc(readableBytes(fileDone)||'0 MB')} / ${esc(readableBytes(fileTotal))}</small>`:'';
    return `<div class="assistant-processing" data-busy="true" role="status" aria-live="polite"><span><span class="assistant-busy-dot" aria-hidden="true"></span>${esc(p.message||phase+'…')}</span><small>${esc(phase)}</small>${total>0?`<small>${operation.resource==='model'?'Saved parts: ':''}${esc(readableBytes(done)||'0 MB')} / ${esc(readableBytes(total))}</small>`:''}${part}${transfer}${verification}<progress ${fraction!==null?`value="${fraction}" max="1"`:''} aria-label="${testing?'Local device test activity':'Resource download progress'}"></progress>${operation.resource==='model'?testing?'<small>This test checks that the model can run here. It does not establish answer quality or equipment compatibility. Your current model stays selected until the test succeeds.</small>':'<small>Keep FINDR open while downloading. Saved parts still need the final file checks before the model is ready.</small>':''}<div class="assistant-resource-actions"><button type="button" data-action="resources-cancel">${testing?'Stop device test':'Pause download'}</button></div></div>`;
  }
  function experimentalMarkup(){
    const descriptor=profiles.find(profile=>profile.id==='conversation-2b');if(!descriptor)return '';
    const row=state.experimental,selected=activeProfile==='conversation-2b',bytes=readableBytes(descriptor.bytes),runtime=readableBytes(descriptor.runtimeBytes),busy=!!operation;
    return `<section class="assistant-resource-experimental" aria-labelledby="experimental-model-title"><h3 id="experimental-model-title">Experimental offline conversation model</h3><p>An optional larger model for interpreting requests with several parts. The compact model remains the default. This is still a limited local assistant.</p><p><strong>${esc(bytes)} model + ${esc(runtime)} runtime</strong>. Downloads stay on this device and are shared by your pals.</p>${row?rowMarkup('experimental',row):'<p>Checking the optional files…</p>'}${selected?'<p><strong>Selected on this device.</strong> You can switch back without removing the downloaded files.</p>':''}<details><summary>Device requirements and measured limits</summary><p>In Linux Chromium, benchmark replies took 33–87 seconds; the complete app took 106–107 seconds including a cold model load. Peak memory in the benchmark was about 2.2 GiB. A real iPhone has not been validated; some phones may close the tab or be unable to run it.</p><p>Raw task understanding was correct in three of five small benchmark cases. Corrections and component changes can still be misunderstood. FINDR checks interpreted tasks and supporting manual pages; installing this model does not make unsupported instructions verified.</p><p>The device test runs real local inference before selection. Passing proves that this test ran, not general conversation quality or reliability on every job.</p></details><div class="assistant-resource-actions"><button type="button" data-action="resources-experimental" ${busy||row?.supported===false?'disabled':''}>${row?.installed?'Test & use experimental model':'Download & test experimental model'}</button>${selected?`<button type="button" data-action="resources-compact" ${busy?'disabled':''}>Use compact model</button>`:''}${origin?.kind==='helper'?`<button type="button" data-action="resources-manual-search" ${busy?'disabled':''}>Use manual search</button>`:''}</div></section>`;
  }
  function markup(){
    const partial=state.model.savedBytes>0,modelLabel=partial?(state.model.downloadBytes>0?'Resume download':'Finish model checks'):'Download local model';
    const retryModel=error&&lastResource==='model'&&(!lastProfileId||lastProfileId===activeProfile),retryProcessing=error&&lastResource==='processing';
    const retryLabel=lastStage==='test'?'Retry device test':lastProfileId==='conversation-2b'?'Resume download & test':lastResource==='model'&&partial||error?.code==='RESOURCE_DOWNLOAD_CANCELLED'?'Resume download':'Retry download';
    return `<h2>Local assistant / offline kit</h2><p>App, PDF, OCR and model readiness are checked separately. Your saved manuals and conversations remain available if a resource is missing.</p><p class="small">The local model is experimental. Tests found irrelevant replies, so FINDR checks its output and uses labelled manual extracts when it cannot verify an answer. CPU replies can take tens of seconds.</p><div class="assistant-resource-list">${Object.entries(state).filter(([key])=>['app','pdf','ocr','model'].includes(key)).map(([key,row])=>rowMarkup(key,row)).join('')}</div>${progressMarkup()}${error?`<p class="assistant-resource-error" role="alert">${esc(error.message)}</p>`:''}<div class="assistant-resource-actions">${(!state.pdf.ready||!state.ocr.ready)&&!retryProcessing?`<button type="button" data-action="resources-processing" ${operation||state.pdf.supported===false?'disabled':''}>Download PDF / OCR resources</button>`:''}${!state.model.ready&&!state.model.installed&&!retryModel?`<button type="button" class="primary" data-action="resources-model" ${operation||state.model.supported===false?'disabled':''}>${modelLabel}${state.model.downloadBytes?' · '+esc(readableBytes(state.model.downloadBytes))+' remaining':''}</button>`:''}${error&&lastResource?`<button type="button" class="primary" data-action="resources-retry" ${operation?'disabled':''}>${retryLabel}</button>`:''}<button type="button" data-action="resources-check" ${refreshing?'disabled':''}>${refreshing?'Checking saved files…':'Check saved files'}</button></div>${experimentalMarkup()}<details><summary>What works without the model?</summary><p>Saved PDFs, conversations and the existing rule-based Fault Finder remain available. Manual search and quoted source passages are a limited reference mode, not local model inference.</p><p>Installing a model downloads software and weights. Questions and manual contents stay on this device for local inference; no online reply service is enabled.</p></details>${error?`<details class="assistant-error-details"><summary>Error details</summary><pre>${esc([error.code,error.name,error.message].join('\n'))}</pre></details>`:''}`;
  }
  function render(){
    const panel=selectPanel();if(!panel)return;
    const active=panel.ownerDocument?.activeElement,focusedAction=active&&panel.contains?.(active)?active.dataset?.action:null;
    const openDetails=new Set([...panel.querySelectorAll('details[open]')].map(detail=>detail.querySelector('summary')?.textContent));
    const dialog=panel.closest('dialog'),scroll=dialog?.scrollTop;
    panel.innerHTML=markup();
    for(const detail of panel.querySelectorAll('details'))if(openDetails.has(detail.querySelector('summary')?.textContent))detail.open=true;
    if(focusedAction)[...panel.querySelectorAll('[data-action]')].find(node=>node.dataset.action===focusedAction)?.focus({preventScroll:true});
    if(dialog&&Number.isFinite(scroll))dialog.scrollTop=scroll;
  }
  function updateProgress(attempt,value){
    if(activeAttempt!==attempt||attempt.settled||!operation)return;
    operation.progress=clone(value||{});state.operation=clone(operation);
    if(progressTimer===null)progressTimer=setTimeout(()=>{progressTimer=null;if(activeAttempt===attempt&&!attempt.settled)publish();},120);
  }
  async function open(options={}){origin=clone(options.origin??null);publish();showModal?.(`<section class="assistant-resource-panel" data-assistant-resources="local-kit">${markup()}</section>`);return refresh();}
  function finish(attempt,{result,cause,cancelled=false}={}){
    if(activeAttempt!==attempt||attempt.settled)return;
    attempt.settled=true;
    const progress=operation?.progress||{};lastStage=attempt.stage||'download';
    if(progressTimer!==null){clearTimeout(progressTimer);progressTimer=null;}
    activeAttempt=null;operation=null;invalidateChecks();
    if(cancelled||cause){
      if(attempt.resource==='model'&&attempt.stage!=='test'&&Number.isFinite(progress.bytes)&&Number(progress.totalBytes)>0){
        const total=Number(progress.totalBytes),saved=Math.min(total,Math.max(0,progress.bytes));
        if(attempt.profileId==='conversation-2b')experimental={...experimental,totalBytes:total,savedBytes:saved,downloadBytes:total-saved,ready:false,installed:false};else model={...model,totalBytes:total,savedBytes:saved,downloadBytes:total-saved,ready:false,installed:false};
      }
      error=cancelled?{name:'AbortError',code:attempt.stage==='test'?'RESOURCE_TEST_CANCELLED':'RESOURCE_DOWNLOAD_CANCELLED',message:attempt.stage==='test'?'Device test stopped. Your previous model is still selected, and downloaded files are retained. Retry the device test when ready.':'Download paused. Completed parts are retained; resume to continue and finish the file checks. Your manuals and conversations are unchanged.'}:shortError(cause);
      if(attempt.profileId==='conversation-2b'&&!cancelled)error={...error,message:(attempt.stage==='activate'?'The device test passed, but the model selection could not be saved. ':attempt.stage==='test'?'The experimental model’s device test did not finish. ':'The experimental model download did not finish. ')+error.message+' Your previous model is still selected; saved files are retained.'};
      error.stage=attempt.stage||'download';error.profileId=attempt.profileId||null;
    }else{
      error=null;if(attempt.profileId==='conversation-2b'){experimental=result.readiness;model=result.readiness;activeProfile='conversation-2b';readinessErrors.model=readinessErrors.experimental=null;}else if(attempt.resource==='model'){model=result;readinessErrors.model=null;}else{manual=result;readinessErrors.manual=null;}
    }
    // Publish and unlock first. Cache checks and conversation callbacks cannot trap Retry.
    publish();
    if(cancelled||cause){
      event(cancelled?'resource_download_cancelled':'resource_download_failed',attempt,{error:clone(error)});
      if(!cancelled)console.error('FINDR resource download failed',{resource:attempt.resource,code:error.code,name:error.name,message:error.message},cause);
    }else{
      const ready=attempt.profileId==='conversation-2b'?result?.readiness?.ready===true:result?.ready===true;
      event('resource_download_completed',attempt,{ready});
      if(attempt.profileId==='conversation-2b'){event('resource_profile_selected',attempt,{ready,deviceTestPassed:true});toast('Experimental model selected after its device test. Its answers still need manual evidence.');}
      else toast(ready?'Resources are ready on this device.':'Download finished. The readiness check will show anything still needed.');
    }
    attempt.resolve(clone(state));
    refresh({fresh:true}).catch(()=>{/* The bounded readiness check publishes its own error. */});
  }
  function start(resource,profileId=resource==='model'?activeProfile:null){
    if(activeAttempt)return activeAttempt.promise;
    if(resource==='model'&&profileId!=='conversation-2b'&&state.model.ready||resource==='processing'&&state.pdf.ready&&state.ocr.ready){toast('These resources are already ready on this device.');return state;}
    invalidateChecks();
    const attempt={id:'resource-'+(++attemptSequence),resource,profileId,stage:'download',origin:clone(origin),controller:new AbortController(),settled:false};
    attempt.promise=new Promise(resolve=>{attempt.resolve=resolve;});activeAttempt=attempt;lastResource=resource;lastProfileId=profileId;lastStage='download';error=null;
    operation={id:attempt.id,resource,profileId,stage:'download',origin:clone(attempt.origin),startedAt:Date.now(),progress:{phase:'checking',message:'Checking the saved parts before downloading…'},cancelling:false};publish();
    event('resource_download_started',attempt);
    Promise.resolve().then(async()=>{
      const options={signal:attempt.controller.signal,onProgress:value=>updateProgress(attempt,value)};
      if(options.signal.aborted)throw new DOMException('Resource download paused.','AbortError');
      if(resource!=='model')return prepareManual(options);
      const api=await modelAPI();
      if(options.signal.aborted)throw new DOMException('Resource download paused.','AbortError');
      const prepared=await api.prepareLocalLanguageResources({...options,...(profileId?{profileId}:{})});
      if(profileId!=='conversation-2b')return prepared;
      if(options.signal.aborted||activeAttempt!==attempt)throw new DOMException('Experimental model preparation stopped.','AbortError');
      experimental=prepared;attempt.stage='test';operation.stage='test';operation.progress={phase:'test',message:'Testing the experimental model on this device…'};publish();
      if(typeof api.testLocalLanguageProfile!=='function'||typeof api.setActiveLocalLanguageProfile!=='function')throw Object.assign(Error('This app cannot run the experimental device test. Reload the complete update.'),{code:'MODEL_TEST_UNAVAILABLE'});
      if(typeof api.allowLocalLanguageRetry==='function')await api.allowLocalLanguageRetry({profileId});
      if(options.signal.aborted||activeAttempt!==attempt)throw new DOMException('Device test stopped.','AbortError');
      const tested=await api.testLocalLanguageProfile(profileId,options);
      if(options.signal.aborted||activeAttempt!==attempt)throw new DOMException('Device test stopped.','AbortError');
      if(tested?.passed!==true)throw Object.assign(Error('The device test did not confirm a successful local inference.'),{code:'MODEL_TEST_FAILED'});
      const verified=tested.readiness||await api.getLocalLanguageReadiness({profileId});
      if(options.signal.aborted||activeAttempt!==attempt)throw new DOMException('Device test stopped.','AbortError');
      // The profile API performs one synchronous, verified preference write.
      // No activation occurs before this explicit download/test has succeeded.
      attempt.stage='activate';
      api.setActiveLocalLanguageProfile(profileId);
      return {readiness:verified,trialProof:tested.trialProof};
    }).then(result=>finish(attempt,{result}),cause=>finish(attempt,{cause,cancelled:attempt.controller.signal.aborted||cause?.name==='AbortError'}));
    return attempt.promise;
  }
  function cancel(){const attempt=activeAttempt;if(!attempt)return false;attempt.controller.abort();finish(attempt,{cancelled:true});return true;}
  async function selectProfile(profileId){if(activeAttempt)return false;const chosenOrigin=clone(origin);try{const api=await modelAPI();if(activeAttempt)return false;api.setActiveLocalLanguageProfile(profileId);activeProfile=profileId;error=null;event('resource_profile_selected',{id:'profile-'+(++attemptSequence),resource:'model',profileId,origin:chosenOrigin},{ready:false});toast('Compact model selected. Downloaded files and conversations are unchanged.');return refresh({fresh:true});}catch(cause){error=shortError(cause);publish();return false;}}
  async function handleAction(action){action=String(action||'').replace(/^resources-/,'');if(action==='model')return start('model');if(action==='experimental')return start('model','conversation-2b');if(action==='compact')return selectProfile('compact');if(action==='manual-search'&&origin?.kind==='helper'){if(activeAttempt)return false;event('resource_reference_selected',{id:'reference-'+(++attemptSequence),resource:'model',origin:clone(origin),profileId:activeProfile});toast('Manual search selected for this conversation. Your model files are retained.');return true;}if(action==='processing')return start('processing');if(action==='check')return refresh();if(action==='cancel')return cancel();if(action==='retry'&&lastResource)return start(lastResource,lastProfileId);return false;}
  return {open,handleAction,refresh,getState:()=>clone(state),cancel};
}
