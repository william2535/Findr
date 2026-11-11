import * as store from './helpers-store.mjs';
import {buildHelperChoices,searchHelperChoices,buildHelperPlan} from './helpers-catalog.mjs';
import {createHelperLibrary} from './helpers-library.mjs';
import {createHelperFaultSession,createHelperFaultsController} from './helpers-faults.mjs';
import {createHelperConversation,answerHelper} from './helpers-engine.mjs';
import {getLocalLanguageReadiness,allowLocalLanguageRetry,unloadLocalLanguage,LOCAL_MODEL_BYTES,LOCAL_MODEL} from './local-language.mjs';
import {getManualProcessingReadiness} from './manual-analysis.mjs';
import {createTerminalTyper} from './terminal-typing.mjs';
import {createHelperTranscriptState,renderHelperSources} from './helpers-sources.mjs';
import {HELPER_ICONS,HELPER_COLOURS,normalizeHelperAppearance,helperAppearanceStyle,renderHelperIcon} from './helpers-appearance.mjs';
import {loadQuickQuestions} from './quick-questions-store.mjs';
import * as db from './db.mjs';
import * as onlineAPI from './online-language.mjs';
import {helperMode,withHelperMode,validOnlineConsent} from './helper-mode.mjs';
import {createAssistantModesController,renderAssistantModeSelector} from './assistant-modes.mjs';

const list=value=>Array.isArray(value)?value:[];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const size=value=>Number.isFinite(Number(value))?Number(value)>=1048576?(Number(value)/1048576).toFixed(1)+' MB':(Number(value)/1024).toFixed(0)+' KB':'Size unknown';
const uid=()=>crypto.randomUUID();
const categories={'fire':'Fire','security':'Intruder','cctv':'CCTV','access-control':'Access Control','warden-call':'Warden / nurse call','other-reference':'Other systems'};
const button=(action,label,extra='',style='secondary')=>`<button type="button" class="${style}" data-action="helper-${action}" ${extra}>${label}</button>`;
const errorText=error=>error?.name==='AbortError'?'Stopped. Completed downloads and your conversation are saved.':error?.message||'This operation could not finish. Your saved work is unchanged.';
const titleOf=helper=>helper.scope?.label||[helper.scope?.brand,helper.scope?.model].filter(Boolean).join(' ')||'Selected manuals';
const stateKey=value=>String(value||'checking').toLowerCase().replace(/\s+/g,'-');
const statusText=value=>({'ready':'Ready offline','ready-offline':'Ready offline','preparing':'Preparing','missing':'Missing manuals','missing-manuals':'Missing manuals','ai-unavailable':'AI unavailable','unsupported':'AI unavailable'}[value]||value||'Checking saved assets…');

/** Shared model and files, with one document allowlist and separate jobs per helper. */
export function createHelpersController({app,getData,getSaved,refreshSaved,readPDF,toast,openResources,getOfflineReady=()=>false,onModelStateChanged=()=>{}}){
  const syncModelReadiness=()=>{Promise.resolve().then(onModelStateChanged).catch(()=>{});};
  let creating=false;
  let helpers=[],loaded=false,choices=null,procedures=null,taskProcedures=null,renderRevision=0,current=null,operation=null,progress=null,error='',saveState='Saved on this device';
  let processing=null;
  let setup={discipline:'fire',query:'',choiceId:'',name:'',variant:'',firmware:'',step:1,selected:[]},plan=null,pendingLegacy=null,model=null;
  let queue=Promise.resolve(),draftTimer=null,renderedConversation='',renderedHelper='',followLatest=true,archiveItems=[],faults=null,faultKey='';
  const inspections=new Map();
  const pendingManualSelections=new Set();
  const pendingModeSelections=new Set();
  const transcriptState=createHelperTranscriptState();
  let appearanceDraft=null,appearanceSaving=false;
  const find=selector=>app.querySelector(selector);
  const active=()=>location.hash.startsWith('#helpers');
  const route=()=>location.hash.slice(1).split('/');
  const faultRoute=()=>['faults','fault-log','fault-results','fault-support','fault-call'].includes(route()[2]);
  const go=hash=>{if(location.hash===hash)render(...route().slice(1));else location.hash=hash;};
  const typer=createTerminalTyper({characterDelay:24,maximumDuration:1700,onProgress:follow,onFinish:follow});
  const library=createHelperLibrary({getRecords:()=>getData().records,refreshSaved,onHelperUpdate:helper=>{
    helpers=helpers.map(item=>item.id===helper.id?helper:item);
    if(current?.id===helper.id){current=helper;if(active()&&route()[2]==='library')libraryView();}
    if(active())renderProgress();
  }});
  const modes=createAssistantModesController({
    showModal:html=>{const dialog=document.querySelector('#modal');dialog.className='helper-dialog';dialog.innerHTML='<button class="modal-close" data-action="close-modal" aria-label="Close">×</button>'+html;if(!dialog.open)dialog.showModal();},closeModal:close,
    getConversation:origin=>list(helpers.find(h=>h.id===origin.id)?.conversations).find(c=>c.id===origin.conversationId),onlineAPI,
    onModeSelected:async({origin,mode,consent})=>{
      const key=origin.id+':'+origin.conversationId;pendingModeSelections.add(key);
      const stop=()=>{if(operation?.kind==='answer'&&operation.helperId===origin.id&&operation.conversationId===origin.conversationId)operation.abort.abort();};
      stop();
      try{await flush();applySaved(await store.updateHelper(origin.id,h=>{if(!list(h.conversations).some(c=>c.id===origin.conversationId))throw Object.assign(Error('This saved conversation no longer exists.'),{code:'HELPER_CONVERSATION_NOT_FOUND'});return {...h,conversations:h.conversations.map(c=>c.id===origin.conversationId?{...withHelperMode(c,mode,consent),updatedAt:Date.now()}:c)};}));stop();if(mode==='online')unloadLocalLanguage();}
      finally{pendingModeSelections.delete(key);}
      if(current?.id===origin.id&&active()&&!operation)chatView();
    },
    onDisconnected:async()=>{if(active()&&!operation&&!faultRoute())chatView();}
  });
  function follow(){const log=find('#helper-transcript');if(log&&followLatest)log.scrollTop=log.scrollHeight;}
  function conversation(helper=current){return list(helper?.conversations).find(item=>item.id===helper.activeConversationId)||list(helper?.conversations)[0];}
  async function initialise(){
    const data=await store.loadHelpers();helpers=data.helpers;loaded=true;
    choices||=buildHelperChoices(getData());
    if(!procedures){try{const response=await fetch(new URL('./data/quick-procedures.json',import.meta.url));if(response.ok)procedures=await response.json();}catch{/* Saved retrieval remains available; no procedural claims are fabricated. */}}
    if(!taskProcedures){try{const response=await fetch(new URL('./data/helper-task-procedures.json',import.meta.url));if(response.ok)taskProcedures=await response.json();}catch{/* Missing reviewed task data never authorises generated instructions. */}}
  }
  function applySaved(helper){helpers=[helper,...helpers.filter(item=>item.id!==helper.id)];if(current?.id===helper.id)current=helper;return helper;}
  async function saveConversation(helperId,next){
    saveState='Saving on this device…';renderSaveState();
    const saved=await store.updateHelper(helperId,helper=>{const existing=list(helper.conversations).find(item=>item.id===next.id),merged=existing?.faultSession?{...next,faultSession:existing.faultSession}:{...next};if(existing){for(const key of ['manualOnly','aiMode','onlineConsent']){if(Object.hasOwn(existing,key))merged[key]=existing[key];else if(key==='onlineConsent')delete merged[key];}}return {...helper,activeConversationId:next.id,conversations:[merged,...list(helper.conversations).filter(item=>item.id!==next.id)],updatedAt:Date.now()};});
    applySaved(saved);saveState='Saved on this device';renderSaveState();return saved;
  }
  async function faultController(){
    const helperId=current.id,conversationId=conversation().id,key=helperId+':'+conversationId;
    if(faults&&faultKey===key)return faults;
    await faults?.flush();
    const getHelper=()=>helpers.find(item=>item.id===helperId);
    const getSession=()=>list(getHelper()?.conversations).find(item=>item.id===conversationId)?.faultSession;
    const onUpdate=async next=>{const saved=await store.updateHelper(helperId,h=>store.withHelperFaultSession(h,conversationId,next));applySaved(saved);return list(saved.conversations).find(item=>item.id===conversationId).faultSession;};
    if(!getSession())applySaved(await store.updateHelper(helperId,h=>{
      const job=list(h.conversations).find(item=>item.id===conversationId);
      if(!job)throw Error('I can’t open that saved conversation. Try opening the pal again.');
      return job.faultSession?h:store.withHelperFaultSession(h,conversationId,{...createHelperFaultSession(h),conversationId});
    }));
    const openManuals=async ids=>{
      if(list(ids).length===1){const helper=getHelper(),actual=helper&&await library.resolveManualId(helper,ids[0])||ids[0];if(getSaved().has(actual)){await readPDF(actual,{page:1});return;}toast('Save this reference in the pal’s manual library before opening it.');}
      go('#helpers/'+helperId+'/library');
    };
    faults=createHelperFaultsController({app,helperId,conversationId,getHelper,getSession,getKnowledge:()=>getData().knowledge,onUpdate,openManuals,getSupportAnalyses:()=>library.getAnalyses(getHelper()),getSupportRecords:()=>[...new Map([...list(getData().records),...getSaved().values()].map(record=>[record.id,record])).values()],openSource:ref=>openSource(ref.manualId,ref.page,ref.contentHash),toast});faultKey=key;return faults;
  }
  function renderSaveState(){const node=find('#helper-save-state');if(node)node.textContent=saveState;}
  async function flush(){
    clearTimeout(draftTimer);const input=find('#helper-input'),c=conversation();
    if(current&&c&&input&&current.id===renderedHelper&&c.id===renderedConversation&&input.value!==String(c.draft||'')){const id=current.id,next={...c,draft:input.value};queue=queue.catch(()=>{}).then(()=>saveConversation(id,next));}
    await queue;
    await faults?.flush();
  }
  async function inspect(helper){
    const value=await library.inspect(helper);if(value.offlineReady&&!getOfflineReady()){value.offlineReady=false;value.status='Preparing';value.label='Preparing';value.message='Waiting for this version of the app to finish saving offline.';}inspections.set(helper.id,value);return value;
  }
  function badgeInfo(helper){const state=inspections.get(helper.id),mode=helperMode(conversation(helper));if(mode==='online'&&state?.docsReady)return {status:'online',label:'Manuals saved · online AI'};if(mode==='manual'&&state?.docsReady)return {status:'manual',label:'Manuals saved · no AI'};return state;}
  function badge(helper){const state=badgeInfo(helper);return `<span class="helper-state" data-state="${esc(stateKey(state?.status))}">${esc(state?.label||statusText(state?.status))}</span>`;}
  function rememberTranscript(){return transcriptState.capture(find('#helper-transcript'),followLatest);}
  function frame(content){rememberTranscript();app.innerHTML=`<section class="helpers-page"${current&&route()[1]===current.id?` data-helper-colour="${normalizeHelperAppearance(current.appearance).colour}" style="${helperAppearanceStyle(current.appearance)}"`:''}>${content}</section>`;}
  function heading(title,description,aside=''){return `<div class="helpers-heading"><div><div class="eyebrow">FINDR / PANEL PALS</div><h1>${esc(title)}</h1><p>${esc(description)}</p></div>${aside}</div>`;}
  function card(helper){const c=conversation(helper),last=list(c?.messages).filter(item=>item.role==='user'||item.role==='engineer').at(-1),state=inspections.get(helper.id);return `<article class="helper-card" data-helper-colour="${normalizeHelperAppearance(helper.appearance).colour}" style="${helperAppearanceStyle(helper.appearance)}"><a class="helper-card-main" href="#helpers/${esc(helper.id)}"><div class="helper-card-top">${avatar(helper.appearance)}${badge(helper)}</div><h2>${esc(helper.name)}</h2><p>${esc(titleOf(helper))}</p><small>${esc(categories[helper.discipline]||helper.discipline)} · ${helper.selectedManualIds.length} manual${helper.selectedManualIds.length===1?'':'s'}${state?' · '+size(state.usedBytes??state.actualBytes??0):''}</small><div class="helper-last"><span>${c?'LATEST CONVERSATION':'READY WHEN YOU ARE'}</span><p>${esc(last?.text||last?.content||c?.faultSession?.message||c?.faultSession?.site||c?.title||'Ask a question or describe a fault.')}</p></div></a><div class="helper-card-footer"><a href="#helpers/${esc(helper.id)}/library">Manual library</a><a href="#helpers/${esc(helper.id)}/settings" aria-label="Customise ${esc(helper.name)}">Customise</a></div></article>`;}
  function listView(){frame(heading('Your panel pals.','Pick a pal for the system you’re working on. Its manuals and conversations stay together.','<a class="primary" href="#helpers/new">+ Make a pal</a>')+`<div class="helper-list-tools">${button('import','Import a pal')}<a class="subtle" href="#helpers/archive">Earlier saved sessions</a></div><div class="helper-grid">${helpers.length?helpers.map(card).join(''):`<div class="helper-empty"><span class="helper-empty-mark" aria-hidden="true">&gt;_</span><h2>Meet your next panel pal.</h2><p>Choose a panel, device or documented family. Save the manuals once, then come back with questions or faults.</p><a class="primary" href="#helpers/new">Make a pal</a><small>Your conversations and manuals stay on this device.</small></div>`}</div><p class="helper-footnote">Identical files and the local AI model are shared. Each pal searches only the manuals you’ve chosen for it. Check its offline status before leaving signal.</p>`);}
  function setupView(){
    if(setup.step===2&&plan){planView();return;}
    frame(`<a class="back" href="#helpers">← Your panel pals</a>`+heading('Make a pal.','What system are we working on?')+`<div class="helper-steps"><span class="active">1 · Choose system</span><span>2 · Save manuals</span><span>3 · Conversation</span></div><div class="helper-setup"><label class="form-label">System type<select id="helper-discipline">${Object.entries(categories).map(([id,label])=>`<option value="${id}" ${setup.discipline===id?'selected':''}>${label}</option>`).join('')}</select></label><label class="form-label">Manufacturer, model or protocol family<input id="helper-search" type="search" value="${esc(setup.query)}" placeholder="Try MxPro5, Gent, Apollo XP95…" autocomplete="off"></label><p class="small">Choose the exact model where possible. The same brand or protocol name doesn’t mean two devices are compatible.</p><div id="helper-choices"></div></div>`);
    find('#helper-discipline').onchange=e=>{setup.discipline=e.target.value;setup.choiceId='';renderChoices();};
    find('#helper-search').oninput=e=>{setup.query=e.target.value;renderChoices();};renderChoices();
  }
  function renderChoices(){const node=find('#helper-choices');if(!node)return;const matches=searchHelperChoices(choices,setup.query,{discipline:setup.discipline});node.innerHTML=`<p class="helper-result-count">${matches.length} matching system${matches.length===1?'':'s'}</p><div class="helper-choice-list">${matches.slice(0,36).map(choice=>`<button class="helper-choice" data-action="helper-choose" data-id="${esc(choice.id)}"><span><strong>${esc(choice.label)}</strong><small>${esc(choice.kind==='panel'?'Panel':choice.kind==='device'?'Device':choice.kind==='manual'?'Manual reference':choice.verifiedFamily?'Documented family':'Reference family')}${choice.protocolCollection?' · Compatibility needs review':''}</small></span><span aria-hidden="true">→</span></button>`).join('')||'<div class="notice">I couldn’t find a match. Try the model on the label or a shorter search. You can also upload its PDF in Manuals.</div>'}</div>${matches.length>36?'<p class="small">Refine the search to narrow these results.</p>':''}`;}
  function syncSetup(){for(const key of ['name','variant','firmware']){const node=find('#helper-'+key);if(node)setup[key]=node.value;}const selected=[...app.querySelectorAll('[data-helper-manual]:checked')].map(node=>node.value);if(setup.step===2)setup.selected=selected;}
  function planView(){
    const selected=new Set(setup.selected),modelBytes=model?.installed?0:(model?.downloadBytes??LOCAL_MODEL_BYTES),selectedDocs=plan.documents.filter(doc=>selected.has(doc.id)),documentBytes=selectedDocs.reduce((sum,doc)=>sum+(Number(doc.additionalBytes)||0),0),processingBytes=processing?.downloadBytes||0;
    frame(button('setup-back','← Choose another system','','back')+heading('Let’s get the right manuals.','Check the model and document editions, then choose what to save.')+`<div class="helper-steps"><span>1 · Choose system</span><span class="active">2 · Save manuals</span><span>3 · Conversation</span></div><div class="helper-plan"><section class="helper-scope"><span class="eyebrow">SELECTED SCOPE</span><h2>${esc(plan.scope.label)}</h2><p>${esc(plan.scope.description||plan.scope.summary||'The selected model and its explicitly linked documents.')}</p><div class="helper-fields"><label class="form-label">Panel pal name<input id="helper-name" value="${esc(setup.name)}" maxlength="120"></label><label class="form-label">Exact variant / product code, if known<input id="helper-variant" value="${esc(setup.variant)}" placeholder="Not established" maxlength="160"></label><label class="form-label">Firmware, if known<input id="helper-firmware" value="${esc(setup.firmware)}" placeholder="Not established" maxlength="80"></label></div>${list(plan.scope.members).length?`<details><summary>Panels and devices included (${plan.scope.members.length})</summary><ul>${plan.scope.members.map(member=>`<li>${esc(typeof member==='string'?member:member.label||member.model||member.name||member.id)}</li>`).join('')}</ul></details>`:''}${list(plan.warnings).length?`<div class="helper-limits"><strong>Coverage to check</strong><ul>${plan.warnings.map(warning=>`<li>${esc(typeof warning==='string'?warning:warning.message||warning.label)}</li>`).join('')}</ul></div>`:''}</section><section class="helper-plan-manuals"><div class="helper-section-title"><h2>Manuals for this pal</h2>${button('select-all','Download entire family','','subtle')}${button('choose-downloads','Choose what to download','','subtle')}</div><p class="small">If you have the space, save the complete documented pack. Required manuals stay selected.</p><div class="helper-document-list">${plan.documents.map(doc=>`<label class="helper-document"><input type="checkbox" data-helper-manual value="${esc(doc.id)}" ${selected.has(doc.id)?'checked':''} ${doc.required?'disabled':''}><span><strong>${esc(doc.record.title)}</strong><small>${doc.required?'Required':'Optional'} · ${esc(doc.record.revision||doc.record.edition||'Edition: check PDF')} · ${doc.alreadySaved?'Already saved':doc.available?size(doc.additionalBytes||doc.record.bytes):'PDF not linked'}</small><small>${esc(doc.reason||'Linked to the selected scope')}</small></span></label>`).join('')||'<div class="notice">No linked manuals were found for this scope. You can make your pal now and add the right PDF later. It won’t be ready offline until its files are saved and checked.</div>'}</div></section><section class="helper-download-summary"><h3>On this device</h3><p>Documents: <strong id="helper-document-bytes">${size(documentBytes)}</strong> additional${plan.unknownSizeCount?' · '+plan.unknownSizeCount+' file sizes not supplied':''}.</p><label class="helper-check"><input id="helper-model-download" type="checkbox" ${model?.installed?'checked':''} ${model?.installed?'disabled':''}><span>${model?.installed?'Shared local AI already saved':'Download shared local AI · '+size(modelBytes)}<small>All your pals share one ${esc(model?.model?.title||LOCAL_MODEL.title)} engine. Optional: use Online AI or Manual search without downloading a model.</small></span></label><p>Shared PDF / OCR resources: <strong>${processing?.ready?'Already saved':processingBytes?size(processingBytes):'Included in offline app preparation'}</strong>.</p><p class="small">The app also saves its shared offline field kit. Sizes that the publisher has not supplied are checked during download.</p><p class="small" id="helper-space"></p><label class="helper-check"><input id="helper-scope-confirmed" type="checkbox"><span>This is the model or reference family I want my pal to cover. I will check the installed variant and manual edition before using instructions.</span></label><div class="inline-actions">${button('create-prepare','Make pal & download','','primary')}${button('create-only','Create now, prepare later')}</div><p class="small">Downloads are real files. Unreadable or missing documents stay visible and do not count as ready.</p></section></div>`);
    for(const node of app.querySelectorAll('[data-helper-manual]'))node.onchange=()=>{syncSetup();const extra=plan.documents.filter(doc=>setup.selected.includes(doc.id)).reduce((sum,doc)=>sum+(Number(doc.additionalBytes)||0),0);find('#helper-document-bytes').textContent=size(extra);};
    navigator.storage?.estimate?.().then(value=>{const node=find('#helper-space');if(node&&value.quota)node.textContent=size(Math.max(0,value.quota-value.usage))+' currently available in browser storage.';}).catch(()=>{});
  }
  function messageRow(message,index){
    const user=['user','engineer'].includes(message.role),messageId=String(message.id??'message-'+index),key=JSON.stringify([current?.id,conversation()?.id]);
    const name=user?'YOU':current?.name||'Panel Pal';
    return `<article class="helper-message" data-message-id="${esc(message.id)}" data-role="${user?'user':'assistant'}">${user?'':avatar(current?.appearance,'data-pal-message-avatar aria-hidden="true"')}<div class="helper-message-label"><span>${esc(name)}</span><span aria-hidden="true">&gt;</span>${!user&&message.mode==='manual-search'?'<small>MANUAL SEARCH · NO AI</small>':!user&&message.mode==='online-ai'?'<small>ONLINE AI · '+esc(message.model?.provider||'Groq')+'</small>':''}</div><div class="helper-message-text" data-terminal-message-text>${esc(message.text||message.content||'')}</div>${user?'':renderHelperSources(message.sourceRefs,{messageId,open:transcriptState.isOpen(key,messageId)})}${message.modelUsed&&message.model?.id?`<small class="helper-model-proof">${message.mode==='online-ai'?(message.model.role==='request_interpretation'?'Request interpreted online':'Source selected online'):(message.model.role==='request_interpretation'?'Request understood on this device':'Answered on this device')} · ${esc(message.model.id.split('/').at(-1))}</small>`:''}</article>`;
  }
  function manualRecoveryActive(){return model?.recovery?.blocked===true||!!model?.lastRuntimeError;}
  function savedQuestionRetryLabel(){const mode=helperMode(conversation());return mode==='online'?'Retry online question':mode==='manual'||manualRecoveryActive()?'Search saved manuals':'Retry saved question';}
  function modeBanner(){
    const mode=helperMode(conversation()),selector=renderAssistantModeSelector({mode,onlineReadiness:onlineAPI.getOnlineReadiness(),pending:!!conversation()?.pending||!!conversation()?.interrupted});
    if(mode==='online'){const state=onlineAPI.getOnlineReadiness(),consent=validOnlineConsent(conversation()?.onlineConsent);return selector+`<p>Online AI · ${esc(state.provider)} / ${esc(state.modelId)} · Internet required.</p><p>${!consent?'Review the sharing details for this conversation.':!state.hasKey?'Add your free-plan API key for this browser session.':!state.online?'You’re offline. Your question and manuals are saved; retry online later or choose Manual search.':'Questions, relevant context and selected manual excerpts go to Groq through FINDR. No model is loaded on your phone.'}</p>${button('mode','Online setup','data-value="online"','subtle')} ${button('resources','Offline kit & storage','','subtle')}`;}
    if(mode==='manual')return selector+ `Manual search selected for this conversation · no AI replies. Saved sources and your log stay available. ${button('resources','Choose local AI','','subtle')}`;
    const recovery=manualRecoveryActive(),ready=(model?.ready||model?.canGenerate)&&model?.supported!==false&&!model?.error&&!recovery;
    const message=model?.recovery?.message||model?.lastRuntimeError?.message||'The last local AI reply didn’t finish. Your question, manuals and model files are still saved.';
    return selector+`${ready?(model?.model?.experimental?'Experimental local AI · manual-checked replies. Longer questions can take over a minute.':'Local AI · using this pal’s saved manuals.'):'Manual search only · you can read saved extracts here. Local AI isn’t running.'}${ready&&!model?.ready?' Offline setup is still finishing; keep a connection until the app resources are saved.':''}${recovery?`<p>${esc(message)}</p>${button('enable-ai-retry',model?.recovery?.state==='storage-unavailable'?'Check local AI storage':'Enable local AI retry',operation?'disabled':'','subtle')}`:!ready?' Set up local AI when you’re ready for AI replies.':''} ${button('resources',model?.installed?'Local resources':'Prepare local AI','','subtle')}`;
  }
  function refreshChatReadiness(){const badgeNode=find('.helper-chat-head .helper-state');if(badgeNode&&current){const state=badgeInfo(current);badgeNode.dataset.state=stateKey(state?.status);badgeNode.textContent=state?.label||statusText(state?.status);}const banner=find('#helper-mode-banner');if(banner)banner.innerHTML=modeBanner();const retry=find('[data-action="helper-retry-answer"]');if(retry)retry.textContent=savedQuestionRetryLabel();}
  function chatView(){
    rememberTranscript();
    const c=conversation(),messages=list(c?.messages),last=messages.at(-1),key=JSON.stringify([current.id,c?.id]),first=renderedConversation!==c?.id||renderedHelper!==current.id;
    const previousInput=find('#helper-input'),keepInput=!first&&!operation&&previousInput&&find('#helper-transcript')?.dataset.helperConversation===key;
    const inputState=keepInput?{value:previousInput.value,focused:document.activeElement===previousInput,start:previousInput.selectionStart,end:previousInput.selectionEnd}:null;
    renderedConversation=c?.id;renderedHelper=current.id;
    frame(`<a class="back" href="#helpers">← Your panel pals</a><div class="helper-chat-head"><div class="helper-chat-identity">${avatar(current.appearance)}<div><div class="eyebrow">${esc(categories[current.discipline]||current.discipline)}</div><h1>${esc(current.name)}</h1><p>${esc(titleOf(current))}</p></div></div>${badge(current)}</div><div class="helper-chat-tools"><a class="secondary" href="#helpers/${esc(current.id)}/library">Manuals <span class="pill">${current.selectedManualIds.length}</span></a>${button('new-conversation','New conversation')}${button('jobs','Saved conversations')}<a class="subtle" href="#helpers/${esc(current.id)}/settings">Customise</a><span id="helper-save-state">${esc(saveState)}</span></div><div class="helper-fault-entry"><div><strong>${c?.faultSession?.site?esc(c.faultSession.site):'Got a fault to work through?'}</strong><p>Let’s take it one check at a time. Your answers, readings and work stay in this job’s log.</p></div><div class="helper-fault-entry-actions">${button('start-fault','I want to fault find',operation?'disabled':'','primary')}${c?.faultSession?`<a class="secondary" href="#helpers/${esc(current.id)}/fault-log">View saved test log</a>`:''}</div></div><div id="helper-mode-banner" class="helper-mode-banner">${modeBanner()}</div>${!operation&&(c?.pending||c?.interrupted)?`<div class="helper-interrupted">Your question is safe. The reply didn’t finish. ${button('retry-answer',savedQuestionRetryLabel(),'','subtle')}</div>`:''}<div class="helper-terminal"><div id="helper-transcript" class="helper-transcript" role="log" aria-label="Panel pal conversation" aria-live="polite">${messages.length?messages.map(messageRow).join(''):`<div class="helper-chat-empty"><span class="helper-prompt" aria-hidden="true">&gt;_</span><h2>What can I help with?</h2><p>Tell me what you want to know, or what the panel is doing. An exact message or a reading is a good place to start.</p><div class="helper-suggestions">${button('suggest','How do I start a walk test?',`data-value="How do I start a walk test?"`)}${button('suggest','Help investigate a fault',`data-value="Help me investigate a fault on this system."`)}</div></div>`}</div><div id="helper-operation" role="status" aria-live="polite"></div><div class="helper-quick-replies">${list(last?.quickReplies).map(reply=>{const label=typeof reply==='string'?reply:reply.label,value=typeof reply==='string'?reply:reply.value||reply.label;return button('reply',esc(label),`data-value="${esc(value)}" ${operation?'disabled':''}`);}).join('')}</div><form id="helper-composer" class="helper-composer"><label class="sr-only" for="helper-input">Message your panel pal</label><textarea id="helper-input" rows="2" maxlength="12000" placeholder="Ask a question, describe a fault, or add a reading…" ${operation?'disabled':''}>${esc(c?.draft||'')}</textarea><button class="primary" type="submit" data-action="helper-send" ${operation?'disabled':''}>Send ↑</button></form><div class="helper-chat-note">I’ll use this pal’s manuals. Start a new conversation when you move to another job.</div></div>`);
    find('#helper-composer').onsubmit=e=>{e.preventDefault();submit().catch(failure);};
    find('#helper-input').oninput=()=>{clearTimeout(draftTimer);draftTimer=setTimeout(()=>flush().catch(failure),350);};
    find('#helper-input').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&matchMedia('(min-width: 760px)').matches){e.preventDefault();submit().catch(failure);}};
    const log=find('#helper-transcript');log.dataset.helperConversation=key;
    const savedView=transcriptState.get(key);followLatest=savedView?.followLatest??true;
    log.onscroll=()=>{followLatest=log.scrollHeight-log.scrollTop-log.clientHeight<70;};
    log.addEventListener('toggle',event=>{if(!event.target.matches('[data-helper-sources]'))return;followLatest=log.scrollHeight-log.scrollTop-log.clientHeight<70;rememberTranscript();},true);
    typer.reconcile(log,messages.map(item=>({...item,text:item.text||item.content||''})),{initial:first});renderProgress();transcriptState.restore(log);
    if(inputState){const input=find('#helper-input');input.value=inputState.value;if(inputState.focused){input.focus({preventScroll:true});input.setSelectionRange(inputState.start,inputState.end);}}
    if(followLatest)follow();
  }
  function renderProgress(){const node=find('#helper-operation')||find('#helper-library-progress');if(!node)return;if(!operation){node.innerHTML=error?`<div class="helper-error">${esc(error)}</div>`:'';return;}const p=progress||{},total=Number(p.totalBytes||p.total),done=Number(p.bytes??p.completed);node.innerHTML=`<div class="helper-working"><span class="helper-working-dot" aria-hidden="true"></span><span>${esc(p.message||'Preparing…')}</span>${button('cancel','Stop','','subtle')}</div>${Number.isFinite(total)&&total>0&&Number.isFinite(done)?`<progress max="${total}" value="${Math.min(total,Math.max(0,done))}"></progress>`:''}`;}
  function libraryView(){const state=inspections.get(current.id),records=new Map(getData().records.map(item=>[item.id,item])),rows=list(state?.manuals).length?state.manuals:current.selectedManualIds.map(id=>({id,record:records.get(id),status:current.manualStates?.[id]?.status}));frame(`<a class="back" href="#helpers/${esc(current.id)}">← Conversation</a>`+heading('Your saved manuals.',titleOf(current),badge(current))+`<div class="helper-library-stats"><span><strong>${size(state?.usedBytes??state?.actualBytes??0)}</strong> stored PDFs / indexes</span><span><strong>${size(helperMode(conversation())==='offline'?(state?.additionalBytes??0):((state?.manualAdditionalBytes||0)+(state?.processingAdditionalBytes||0)))}</strong> additional known downloads</span></div><div class="inline-actions">${button('prepare','Download / retry missing files',`${operation?'disabled':''}`,'primary')}${button('prepare-all','Prepare manuals & local AI',`${operation?'disabled':''}`)}${button('attach-saved','Add a saved PDF')}${button('import-pdf','Import a PDF')}</div><div id="helper-library-progress"></div><div class="helper-document-list">${rows.map(row=>{const id=row.id||row.manualId,record=row.record||records.get(id)||{title:id},m=current.manualStates?.[id]||row;return `<article class="helper-document"><span class="helper-file-mark" aria-hidden="true">PDF</span><span><strong>${esc(record.title)}</strong><small>${current.requiredManualIds.includes(id)?'Required':'Optional'} · ${esc(m.status||row.status||'Not saved')} · ${size(row.bytes??record.bytes)}</small>${m.error||row.error?`<small class="helper-error">${esc(typeof(m.error||row.error)==='string'?m.error||row.error:(m.error||row.error).message)}</small>`:''}</span>${button('source','Open',`data-id="${esc(id)}" data-page="1"`,'subtle')}</article>`;}).join('')||'<div class="notice">No manuals here yet. Add a saved PDF or upload the manual for this system.</div>'}</div>${list(current.scope?.limits).length?`<div class="helper-limits"><strong>Scope and missing coverage</strong><ul>${current.scope.limits.map(item=>`<li>${esc(typeof item==='string'?item:item.message||item.label)}</li>`).join('')}</ul></div>`:''}<p class="helper-footnote">A saved PDF is prepared only after its bytes, readable text and search index are checked. Scanned pages use English OCR where available. Unreadable pages are not sources for answers.</p>`);renderProgress();}
  function avatar(appearance,extra=''){
    const value=normalizeHelperAppearance(appearance),icon=HELPER_ICONS.find(item=>item.id===value.icon);
    return `<span class="helper-avatar" data-appearance-icon="${value.icon}" data-appearance-colour="${value.colour}" style="${helperAppearanceStyle(value)}" aria-label="${icon.label}" ${extra}>${renderHelperIcon(value)}</span>`;
  }
  function appearanceEditor(){
    if(appearanceDraft?.helperId!==current.id)appearanceDraft={helperId:current.id,value:normalizeHelperAppearance(current.appearance),message:'Pick a little personality. Your manuals and saved conversations stay the same.',error:false};
    const value=appearanceDraft.value;
    return `<section class="helper-customise" aria-labelledby="helper-customise-title" style="${helperAppearanceStyle(value)}"><h2 id="helper-customise-title">Make it yours.</h2><p>A face for the job. A colour you can spot.</p><div id="helper-appearance-preview" class="helper-appearance-preview" data-appearance-icon="${value.icon}" data-appearance-colour="${value.colour}" style="${helperAppearanceStyle(value)}">${avatar(value)}<div><small>YOUR PANEL PAL</small><strong>${esc(current.name)}</strong><span>${esc(titleOf(current))}</span></div></div><fieldset class="helper-appearance-fieldset"><legend>Pick an icon</legend><div class="helper-icon-options">${HELPER_ICONS.map(icon=>`<button type="button" class="helper-icon-option" data-action="helper-appearance-icon" data-value="${icon.id}" aria-pressed="${value.icon===icon.id}" ${appearanceSaving?'disabled':''}>${renderHelperIcon({icon:icon.id})}<span>${esc(icon.label)}</span><span class="helper-choice-check" aria-hidden="true">✓</span></button>`).join('')}</div></fieldset><fieldset class="helper-appearance-fieldset"><legend>Pick a colour</legend><div class="helper-colour-options">${HELPER_COLOURS.map(colour=>`<button type="button" class="helper-colour-option" data-action="helper-appearance-colour" data-value="${colour.id}" style="--swatch:${colour.accent}" aria-pressed="${value.colour===colour.id}" ${appearanceSaving?'disabled':''}><span class="helper-colour-swatch" aria-hidden="true"><span>✓</span></span><span>${esc(colour.label)}</span></button>`).join('')}</div></fieldset><p id="helper-appearance-status" role="status" aria-live="polite" class="${appearanceDraft.error?'is-error':''}">${esc(appearanceDraft.message)}</p><div class="inline-actions">${button('appearance-save',appearanceSaving?'Saving…':'Save appearance',appearanceSaving?'disabled':'','primary')}${button('appearance-cancel','Cancel changes',appearanceSaving?'disabled':'')}${button('appearance-reset','Reset to FINDR',appearanceSaving?'disabled':'','subtle')}</div></section>`;
  }
  function refreshAppearance(){
    if(!appearanceDraft||appearanceDraft.helperId!==current?.id)return;
    const value=appearanceDraft.value,preview=find('#helper-appearance-preview');
    const editor=find('.helper-customise');if(editor)editor.style.cssText=helperAppearanceStyle(value);
    if(preview){preview.style.cssText=helperAppearanceStyle(value);preview.dataset.appearanceIcon=value.icon;preview.dataset.appearanceColour=value.colour;preview.querySelector('.helper-avatar').outerHTML=avatar(value);}
    for(const node of app.querySelectorAll('[data-action="helper-appearance-icon"]'))node.setAttribute('aria-pressed',String(node.dataset.value===value.icon));
    for(const node of app.querySelectorAll('[data-action="helper-appearance-colour"]'))node.setAttribute('aria-pressed',String(node.dataset.value===value.colour));
    for(const node of app.querySelectorAll('.helper-customise button'))node.disabled=appearanceSaving;
    const save=find('[data-action="helper-appearance-save"]');if(save)save.textContent=appearanceSaving?'Saving…':'Save appearance';
    const status=find('#helper-appearance-status');if(status){status.textContent=appearanceDraft.message;status.classList.toggle('is-error',appearanceDraft.error);}
  }
  function settingsView(){frame(`<a class="back" href="#helpers/${esc(current.id)}">← Conversation</a>`+heading('Customise your panel pal.',titleOf(current))+`<div class="helper-settings">${appearanceEditor()}<section><h2>Its name</h2><label class="form-label">Name<input id="helper-rename" value="${esc(current.name)}" maxlength="120"></label>${button('rename','Save name','','primary')}</section><section><h2>Export a copy</h2><p>Includes its appearance, scope, conversations and diagnostic context. Include PDFs to move the manual library to another device. The shared AI model is downloaded separately.</p><label class="helper-check"><input type="checkbox" id="helper-export-files" checked><span>Include saved PDFs</span></label>${button('export','Export helper')}</section><section><h2>Delete this panel pal</h2><p>Removes its conversations and scope from this device. Saved PDFs, reusable indexes and the shared local model are kept for your other pals and Manuals.</p>${button('delete','Delete panel pal','','danger')}</section></div>`);}
  function modal(title,body){const dialog=document.querySelector('#modal');dialog.className='helper-dialog';dialog.innerHTML=`<button class="modal-close" data-action="close-modal" aria-label="Close">×</button><h2>${esc(title)}</h2>${body}`;if(!dialog.open)dialog.showModal();}
  function close(){document.querySelector('#modal')?.close();}
  function downloadJSON(data,name){const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function pick(accept,callback){const input=document.createElement('input');input.type='file';input.accept=accept;input.onchange=async()=>{if(input.files?.[0])try{await callback(input.files[0]);}catch(e){failure(e);}};input.click();}
  async function archiveView(){
    const [questions,history,activeJob]=await Promise.all([loadQuickQuestions(),db.setting('history'),db.setting('session')]);
    const jobs=[...list(history),...(activeJob&&!list(history).some(item=>item.id===activeJob.id)?[activeJob]:[])];archiveItems=[...questions.conversations.map(item=>({kind:'question',id:item.id,value:item})),...jobs.map(item=>({kind:'fault',id:item.id,value:item}))];
    frame(`<a class="back" href="#helpers">← Your panel pals</a>`+heading('Earlier saved work.','Your previous questions, fault visits and downloaded PDFs are preserved.')+`<div class="helper-archive">${archiveItems.map(item=>{const old=item.value,name=old.title||old.site||old.siteRef||[old.panel?.brand,old.panel?.model].filter(Boolean).join(' ')||'Saved '+(item.kind==='question'?'questions':'fault visit');return `<article class="helper-card"><h2>${esc(name)}</h2><p>${esc(item.kind==='question'?'Quick Questions history':'Fault Finder history')}</p><div class="inline-actions">${button('legacy-view','Read saved record',`data-id="${esc(item.id)}" data-value="${item.kind}"`)}${button('legacy-continue','Continue in Helpers',`data-id="${esc(item.id)}" data-value="${item.kind}"`)}</div></article>`;}).join('')||'<div class="notice">No earlier question histories or fault visits are saved on this device.</div>'}</div>`);
  }
  function legacyMessages(value){const rows=list(value.messages).length?value.messages:list(value.diagnosticChat?.messages).length?value.diagnosticChat.messages:list(value.terminal?.messages);return rows.map((item,index)=>({id:item.id||'import-'+index,role:['user','engineer','you'].includes(item.role)?'user':'assistant',text:String(item.text||item.content||item.body||''),sourceRefs:list(item.sourceRefs),createdAt:item.createdAt||Date.now(),kind:'imported-history'})).filter(item=>item.text);}
  async function render(id='',detail=''){
    const revision=++renderRevision;
    if(detail!=='settings'||appearanceDraft?.helperId!==id)appearanceDraft=null;
    try{
      await faults?.flush();await initialise();if(revision!==renderRevision||!active())return;
      if(id==='new'){setupView();getLocalLanguageReadiness().then(value=>model=value).catch(()=>{});return;}
      if(id==='archive'){await archiveView();return;}
      current=helpers.find(item=>item.id===id)||null;
      if(!current){listView();await Promise.allSettled(helpers.map(inspect));if(revision===renderRevision&&active()&&!route()[1])listView();return;}
      if(!conversation()){const c=createHelperConversation({id:uid(),title:'New conversation'});await saveConversation(current.id,c);}
      if(['faults','fault-log','fault-results','fault-support','fault-call'].includes(detail)){const controller=await faultController();if(revision===renderRevision&&active())controller.render(detail);return;}
      if(detail==='library')libraryView();else if(detail==='settings')settingsView();else chatView();
      const [readiness]=await Promise.all([getLocalLanguageReadiness().catch(()=>null),inspect(current).catch(()=>null)]);model=readiness;
      if(revision===renderRevision&&active()){
        if(detail==='library')libraryView();else if(detail!=='settings')refreshChatReadiness();
      }
    }catch(e){if(revision===renderRevision){frame(heading('Your panel pals.','')+`<div class="helper-error">${esc(errorText(e))}</div>${button('reload','Retry')}`);}}
  }
  async function create(prepare=false){
    if(creating||operation||!plan)return;syncSetup();if(!find('#helper-scope-confirmed')?.checked){toast('Confirm the selected model or reference family before creating this helper.');find('#helper-scope-confirmed')?.focus();return;}if(!setup.name.trim()){toast('Give your pal a name.');return;}
    creating=true;try{const includeModel=find('#helper-model-download')?.checked===true;
    const selected=[...new Set([...setup.selected,...plan.requiredManualIds])],c=createHelperConversation({id:uid(),title:pendingLegacy?'Continued saved job':'New conversation'});
    if(pendingLegacy){c.messages=legacyMessages(pendingLegacy.value);c.context={...c.context,importedHistory:{kind:pendingLegacy.kind,id:pendingLegacy.id},observations:c.messages.filter(item=>item.role==='user').map(item=>({id:item.id,text:item.text,at:item.createdAt,provenance:'imported_user_report',assessed:false}))};if(pendingLegacy.kind==='fault')c.faultSession={...structuredClone(pendingLegacy.value),id:uid(),importedLegacySessionId:pendingLegacy.id};}
    const helper=store.createHelper({name:setup.name.trim(),discipline:setup.discipline,scope:{...plan.scope,variant:setup.variant.trim(),firmware:setup.firmware.trim(),variantConfirmed:!!setup.variant.trim(),firmwareConfirmed:!!setup.firmware.trim(),limits:[...new Set([...list(plan.scope.limits),...list(plan.warnings)])]},documents:plan.documents.filter(doc=>selected.includes(doc.id)),selectedManualIds:selected,requiredManualIds:plan.requiredManualIds,conversations:[c],activeConversationId:c.id});
    current=applySaved(await store.saveHelper(helper));pendingLegacy=null;setup={discipline:'fire',query:'',choiceId:'',name:'',variant:'',firmware:'',step:1,selected:[]};plan=null;go('#helpers/'+current.id+(prepare?'/library':''));if(prepare)await prepareCurrent(includeModel);
    }finally{creating=false;}
  }
  async function prepareCurrent(downloadModel=false){
    if(operation||!current)return;const target=structuredClone(current),id=target.id,abort=new AbortController();operation={kind:'prepare',helperId:id,abort};error='';progress={message:'Checking saved files…'};renderProgress();
    try{await flush();const result=await library.prepare(target,{signal:abort.signal,downloadModel,onProgress:value=>{progress=value;renderProgress();}});applySaved(result.helper);if(list(result.failed).length)error='A few documents still need attention. Check the files below before relying on this pack offline.';model=await getLocalLanguageReadiness();}
    catch(e){error=errorText(e);}finally{operation=null;progress=null;await refreshSaved();if(current?.id===id&&active())await render(...route().slice(1));}
  }
  async function submit(value,{retry=false,manualOnly=false}={}){
    if(operation||!current)return;const target=structuredClone(current),id=target.id,base=structuredClone(conversation(target));if(pendingModeSelections.has(id+':'+base.id))return;
    const raw=String(value??find('#helper-input')?.value??'').trim();if(!raw)return;
    if(retry){const last=list(base.messages).at(-1);if(last?.role==='user'&&(last.text||last.content)===raw)base.messages.pop();}
    const abort=new AbortController();operation={kind:'answer',helperId:id,conversationId:base.id,abort};error='';base.draft='';base.pending=null;base.interrupted=false;
    progress={message:'Searching saved manuals…'};
    try{
      await flush();
      // Save before inference. All work below uses this captured helper and job.
      const userMessage={id:uid(),role:'user',text:raw,createdAt:Date.now(),kind:'input'};
      const pending={...base,messages:[...list(base.messages),userMessage],pending:{kind:'answer',messageId:userMessage.id,text:raw},updatedAt:Date.now()};
      await saveConversation(id,pending);if(current?.id===id&&active()&&!route()[2])chatView();
      const analyses=await library.getAnalyses(target),indexes=await library.getIndexes(target,{analyses});
      const savedJob=list(helpers.find(item=>item.id===id)?.conversations).find(item=>item.id===base.id)||base;
      if(abort.signal.aborted||pendingModeSelections.has(id+':'+base.id))throw new DOMException('Stopped','AbortError');
      const selected=manualOnly||pendingManualSelections.has(id+':'+base.id)?'manual':helperMode(savedJob),isOnline=selected==='online';
      const readiness=isOnline?onlineAPI.getOnlineReadiness():await getLocalLanguageReadiness();if(!isOnline)model=readiness;
      if(isOnline){if(!validOnlineConsent(savedJob.onlineConsent))throw Object.assign(Error('Review the online sharing details before sending this saved question.'),{code:'ONLINE_CONSENT_REQUIRED'});if(!readiness.hasKey)throw Object.assign(Error('Add your Groq Free plan key in Online setup, then retry this saved question.'),{code:'ONLINE_KEY_REQUIRED'});if(!readiness.online)throw Object.assign(Error('You’re offline. Your question is saved. Retry when connected or choose Manual search.'),{code:'ONLINE_OFFLINE'});}
      const result=await answerHelper({helper:target,conversation:base,text:raw,indexes,analyses,procedures,taskProcedures,modelReadiness:readiness,manualOnly:selected==='manual',inferenceMode:isOnline?'online':'offline',...(isOnline?{infer:request=>onlineAPI.generateOnlineReply({...request,consent:savedJob.onlineConsent})}:{}),signal:abort.signal,onProgress:value=>{progress=typeof value==='string'?{message:value}:value;renderProgress();}});
      if(!isOnline&&result.message?.error&&!readiness.error&&!readiness.lastRuntimeError){model=await getLocalLanguageReadiness().catch(()=>({...readiness,ready:false,canGenerate:false,lastRuntimeError:result.message.error}));syncModelReadiness();}
      if(abort.signal.aborted||result.message?.coverage==='cancelled')throw new DOMException('Stopped','AbortError');
      await saveConversation(id,{...result.conversation,draft:'',pending:null,interrupted:false});
    }catch(e){error=errorText(e);const latest=helpers.find(item=>item.id===id),c=conversation(latest);if(c?.id===base.id)await saveConversation(id,{...c,pending:null,interrupted:true,lastError:error});}
    finally{operation=null;progress=null;if(current?.id===id&&active()){if(route()[2])await render(...route().slice(1));else{chatView();follow();}}}
  }
  function failure(e){error=errorText(e);saveState=/storage|quota|save/i.test(error)?'Not saved · retry':saveState;toast(error);renderProgress();renderSaveState();}
  async function openSource(id,page=1,hash=''){
    let actual=id;if(current)actual=await library.resolveManualId(current,id)||id;
    if(hash){const matches=[...getSaved().values()].filter(item=>item.fileHash===hash);if(matches.length)actual=matches[0].id;else{toast('That PDF edition isn’t saved here. Open this pal’s library to download it again.');return;}}
    close();await readPDF(actual,{page:Number(page)||1});
  }
  async function handleAction(action,id,value,node){try{
    if(action.startsWith('fault-')||action.startsWith('investigation-')){if(current&&['faults','fault-log','fault-results','fault-support','fault-call'].includes(route()[2]))await (await faultController()).handleAction(action,id,value,node);return;}
    switch(action){
      case'mode':if(current)await modes.open({origin:{kind:'helper',id:current.id,conversationId:conversation().id},initialMode:value});break;
      case'start-fault':if(operation){toast('Let the current task finish, or stop it, before opening fault finding.');break;}await flush();go('#helpers/'+current.id+'/faults');break;
      case'choose':{const choice=choices.find(item=>item.id===id);if(!choice)return;plan=buildHelperPlan(choice,getData(),{variant:'',firmware:'',saved:getSaved()});setup={...setup,choiceId:id,name:plan.suggestedName||choice.label+' pal',step:2,selected:[...plan.selectedManualIds]};[model,processing]=await Promise.all([getLocalLanguageReadiness().catch(()=>null),getManualProcessingReadiness().catch(()=>null)]);setupView();break;}
      case'setup-back':syncSetup();setup.step=1;setupView();break;
      case'select-all':syncSetup();setup.selected=plan.documents.map(item=>item.id);planView();toast('All documents in the stated scope are selected.');break;
      case'choose-downloads':find('.helper-plan-manuals')?.scrollIntoView({behavior:'smooth',block:'start'});break;
      case'create-prepare':await create(true);break;case'create-only':await create(false);break;
      case'prepare':await prepareCurrent(false);break;case'prepare-all':await prepareCurrent(true);break;
      case'cancel':operation?.abort.abort();break;
      case'retry-answer':{const c=conversation(),last=list(c?.messages).at(-1),text=c?.pending?.text||(last?.role==='user'?last.text||last.content:'');if(text)await submit(text,{retry:true,manualOnly:helperMode(c)!=='online'&&manualRecoveryActive()});break;}
      case'enable-ai-retry':{if(operation){toast('Wait for the current operation to finish before enabling an AI retry.');break;}model=await allowLocalLanguageRetry();syncModelReadiness();if(current)await inspect(current).catch(()=>{});refreshChatReadiness();toast(manualRecoveryActive()?model?.recovery?.message||'Local AI retry is still unavailable. Saved manuals remain accessible.':'Local AI retry is enabled. Retry the saved question or send a question when you are ready.');break;}
      case'send':break; // The form owns submission; do not run it twice.
      case'reply':await submit(value);break;case'suggest':if(find('#helper-input')){find('#helper-input').value=value;find('#helper-input').focus();}break;
      case'resources':await openResources({origin:{kind:'helper',id:current?.id,conversationId:conversation()?.id}});break;
      case'source':await openSource(id,node?.dataset.page,node?.dataset.hash);break;
      case'new-conversation':{if(operation){toast('Stop the current operation before changing jobs.');break;}const helperId=current.id,title='Job '+(current.conversations.length+1);await flush();await saveConversation(helperId,createHelperConversation({id:uid(),title}));renderedConversation='';if(current?.id===helperId&&active())await render(helperId);break;}
      case'jobs':modal('Saved conversations',`<div class="helper-choice-list">${current.conversations.map(c=>button('open-conversation',esc(c.faultSession?.site||c.title||list(c.messages).find(m=>m.role==='user')?.text?.slice(0,70)||'Conversation')+' · '+new Date(c.updatedAt||c.createdAt).toLocaleDateString('en-GB'),`data-id="${esc(c.id)}"`)).join('')}</div>`);break;
      case'open-conversation':{if(operation)break;const helperId=current.id;await flush();applySaved(await store.updateHelper(helperId,h=>({...h,activeConversationId:id})));close();renderedConversation='';if(current?.id===helperId&&active())await render(helperId);break;}
      case'appearance-icon':case'appearance-colour':{if(!appearanceDraft||appearanceSaving)break;const key=action==='appearance-icon'?'icon':'colour';appearanceDraft.value=normalizeHelperAppearance({...appearanceDraft.value,[key]:value});appearanceDraft.message='Preview only · save when it feels like your pal.';appearanceDraft.error=false;refreshAppearance();break;}
      case'appearance-cancel':case'appearance-reset':{if(!appearanceDraft||appearanceSaving)break;appearanceDraft.value=normalizeHelperAppearance(action==='appearance-reset'?null:current.appearance);appearanceDraft.message=action==='appearance-reset'?'Original FINDR look previewed · save to keep it.':'Changes cancelled. Your saved look is unchanged.';appearanceDraft.error=false;refreshAppearance();break;}
      case'appearance-save':{if(!appearanceDraft||appearanceSaving)break;const helperId=current.id,value=normalizeHelperAppearance(appearanceDraft.value);appearanceSaving=true;appearanceDraft.message='Saving on this device…';appearanceDraft.error=false;refreshAppearance();try{applySaved(await store.updateHelper(helperId,h=>({...h,appearance:value})));if(appearanceDraft?.helperId===helperId){appearanceDraft.value=value;appearanceDraft.message='Saved on this device. Looking good.';const page=find('.helpers-page');if(page){page.style.cssText=helperAppearanceStyle(value);page.dataset.helperColour=value.colour;}}toast('Your pal’s new look is saved.');}catch(e){if(appearanceDraft?.helperId===helperId){appearanceDraft.message='Not saved. '+errorText(e)+' Your previous look is unchanged; try Save appearance again.';appearanceDraft.error=true;}}finally{appearanceSaving=false;refreshAppearance();}break;}
      case'rename':{const name=find('#helper-rename').value.trim();if(!name)throw Error('Enter a name for this helper.');applySaved(await store.updateHelper(current.id,h=>({...h,name})));const preview=find('#helper-appearance-preview strong');if(preview)preview.textContent=name;toast('Name saved.');break;}
      case'delete':modal('Delete '+current.name+'?',`<p>Its saved conversations will be removed from this device. Shared PDFs, indexes and the local AI model will be kept.</p>${button('confirm-delete','Delete panel pal',`data-id="${esc(current.id)}"`,'danger')}`);break;
      case'confirm-delete':if(operation)throw Error('Stop the current operation before deleting this pal.');await store.deleteHelper(id);helpers=helpers.filter(h=>h.id!==id);current=null;close();go('#helpers');break;
      case'export':{const target=current,includeFiles=find('#helper-export-files')?.checked!==false;await flush();const payload=await store.exportHelper(target.id,{includeFiles});downloadJSON(payload,'FINDR-panel-pal-'+target.name.replace(/[^a-z0-9]+/gi,'-')+'.json');toast('Your panel pal export is ready.');break;}
      case'import':pick('.json,application/json',async file=>{const result=await store.importHelper(JSON.parse(await file.text()));await refreshSaved();await initialise();toast('Your panel pal is ready to open.');go('#helpers/'+(result.helper?.id||result.id||''));});break;
      case'attach-saved':modal('Add a saved manual',`<p>Choose only a document that applies to this pal’s model and edition.</p><div class="helper-choice-list">${[...getSaved().values()].filter(record=>!current.selectedManualIds.includes(record.id)).map(record=>button('attach',esc(record.title),`data-id="${esc(record.id)}"`)).join('')||'<p>No additional saved PDFs. Import an applicable manual first.</p>'}</div>`);break;
      case'attach':{const helperId=current.id;applySaved(await store.updateHelper(helperId,h=>({...h,selectedManualIds:[...new Set([...h.selectedManualIds,id])]})));close();if(current?.id===helperId)await prepareCurrent(false);break;}
      case'import-pdf':{const target=structuredClone(current);pick('.pdf,application/pdf',async file=>{const {validatePDF}=await import('./engine.mjs'),hash=await validatePDF(file),record={id:'local-'+hash,title:file.name.replace(/\.pdf$/i,''),category:target.discipline,brand:target.scope.brand||'Local import',models:[target.scope.model].filter(Boolean),fileHash:hash,bytes:file.size,savedAt:Date.now(),imported:true};await db.saveManual(record,file);await refreshSaved();applySaved(await store.updateHelper(target.id,h=>({...h,selectedManualIds:[...new Set([...h.selectedManualIds,record.id])]})));if(current?.id===target.id)await prepareCurrent(false);else toast('PDF added to '+target.name+'. Open its library to prepare it.');});break;}
      case'legacy-view':{const item=archiveItems.find(x=>x.id===id&&x.kind===value),messages=legacyMessages(item.value);modal('Earlier saved record',`<p>This is the original saved history. Its documents and conclusions have not been rechecked.</p><div class="helper-legacy-record">${messages.length?messages.map(messageRow).join(''):`<pre>${esc(JSON.stringify(item.value,null,2))}</pre>`}</div>${button('legacy-export','Export original record',`data-id="${esc(id)}" data-value="${esc(value)}"`)}`);break;}
      case'legacy-export':{const item=archiveItems.find(x=>x.id===id&&x.kind===value);downloadJSON(item.value,'FINDR-earlier-'+id+'.json');break;}
      case'legacy-continue':pendingLegacy=archiveItems.find(x=>x.id===id&&x.kind===value);setup.step=1;setup.query=pendingLegacy.value.panel?.model||'';setup.discipline=pendingLegacy.value.panel?.category||'fire';toast('Choose the exact system and manuals for this saved job.');go('#helpers/new');break;
      case'reload':await render(...route().slice(1));break;
    }
  }catch(e){failure(e);}}
  async function resourceEvent(event={}){
    if(['resource_reference_selected','resource_profile_selected'].includes(event.type)&&event.origin?.kind==='helper'&&event.origin.id&&event.origin.conversationId){
      const helperId=event.origin.id,conversationId=event.origin.conversationId,manualOnly=event.type==='resource_reference_selected';
      const key=helperId+':'+conversationId,stopMatchingAnswer=()=>{if(operation?.kind==='answer'&&operation.helperId===helperId&&operation.conversationId===conversationId)operation.abort.abort();};
      pendingModeSelections.add(key);if(manualOnly)pendingManualSelections.add(key);
      stopMatchingAnswer();
      try{applySaved(await store.updateHelper(helperId,h=>({...h,conversations:list(h.conversations).map(c=>c.id===conversationId?{...withHelperMode(c,manualOnly?'manual':'offline'),updatedAt:Date.now()}:c)})));stopMatchingAnswer();}
      finally{pendingManualSelections.delete(key);pendingModeSelections.delete(key);}
    }
    model=await getLocalLanguageReadiness().catch(()=>null);if(active()&&!operation&&!faultRoute())await render(...route().slice(1));
  }
  window.addEventListener('pagehide',()=>flush().catch(()=>{}));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush().catch(()=>{});});
  window.addEventListener('online',()=>{if(active()&&!operation&&!faultRoute())render(...route().slice(1));});
  window.addEventListener('offline',()=>{if(active()&&!operation&&!faultRoute())render(...route().slice(1));});
  return {render,flush,handleAction,resourceEvent,refreshStatus:()=>{if(active()&&!operation&&!faultRoute())render(...route().slice(1));},leave:()=>{rememberTranscript();typer.reveal({all:true});},getHelper:()=>current};
}
