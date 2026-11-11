import {helpBar} from './onsite.mjs';
import {
  buildNanoModel, createNanoState, pressNanoKey, nanoView,
  setNanoDeviceInput, setNanoFault, loadNanoScenario, tickNano,
  restoreNanoState, leaveNano, findNanoRoute, nextNanoHint, evaluateNanoConditions,
} from './gent-nano-engine.mjs';
import {createHintFeedback} from './emulator-feedback.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list = value => Array.isArray(value) ? value : value == null ? [] : [value];
const textOf = value => typeof value === 'string' ? value : Array.isArray(value) ? value.map(textOf).join(' ') : value && typeof value === 'object' ? Object.values(value).map(textOf).join(' ') : String(value ?? '');
const button = (action,label,cls='secondary gent-compact',attrs='') => `<button type="button" class="${cls}" data-nano-action="${action}" ${attrs}>${label}</button>`;
const nodesOf = data => Array.isArray(data.nodes) ? data.nodes : Object.values(data.nodes || {});
const titleOf = item => item?.title || item?.label || item?.id || '';
const uid = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36)+Math.random().toString(36).slice(2);
const storeKey='gent-nano-trainer-v1', soundKey='keypad-hint-sound-v1';
const keyLabels={LEFT_SOFT:'Left selection button',MINUS:'Minus',NEXT:'Next / Verify',PLUS:'Plus',RIGHT_SOFT:'Right selection button',CANCEL_BUZZER:'Cancel Buzzer',RESET:'Reset',SOUND_ALARMS:'Sound Alarms',SILENCE_ALARMS:'Silence Alarms'};

/** Nano's own nine-button face, based on operating instructions 4188-947 p6. */
export function nanoPanelFace(view,{hintKey=null}={}) {
  const physical=new Map((view.physicalKeys||view.keys||[]).map(key=>[key.id,key]));
  const key=(id,label='',cls='')=>{
    const spec=physical.get(id), hinted=id===hintKey;
    return `<button type="button" class="nano-key ${cls}${hinted?' nano-hint-key':''}" data-nano-action="key" data-key="${id}" aria-label="${esc(keyLabels[id]||spec?.label||id)}${hinted?' — next hinted key':''}" ${hinted?'aria-describedby="nano-next-cue"':''} ${spec?.enabled===false?'disabled':''}><span>${esc(label)}</span></button>`;
  };
  const leds=new Map((view.leds||[]).map(led=>[led.id,led]));
  const lamp=(id,label,color='amber',bar=false)=>{
    const led=leds.get(id)||{state:'off',color};
    return `<span class="nano-led ${esc(led.state||'off')} ${esc(led.color||color)}${bar?' nano-led-bar':''}" aria-label="${esc(label)}: ${esc(led.state||'off')}"><i aria-hidden="true"></i><span>${esc(label)}</span></span>`;
  };
  const zones=new Map((view.zones||[]).map(z=>[Number(z.number??String(z.id).replace(/\D/g,'')),z]));
  const screen=view.screen||{}, lines=list(screen.lines).map(String);
  if(screen.heading&&lines[0]!==screen.heading)lines.unshift(screen.heading);
  const soft=screen.softKeys||view.softKeys||[];
  const softLabel=id=>soft.find(item=>item.key===id||item.key===(id==='LEFT_SOFT'?'LEFT':'RIGHT'))?.label||'';
  const control=(id,label)=>`<div class="nano-control-caption"><span>${label}</span>${key(id)}</div>`;
  return `<div class="nano-case"><div class="nano-brand"><strong>GENT</strong><span>nano</span></div><div class="nano-face" role="group" aria-label="GENT Nano style simulated fire control panel">
    <div class="nano-lcd-frame"><div class="nano-lcd" role="status" aria-live="polite" aria-atomic="true" aria-label="Nano panel display"><div class="nano-lcd-lines">${lines.slice(0,7).map(esc).join('\n')}</div><div class="nano-lcd-soft"><span>${esc(softLabel('LEFT_SOFT'))}</span><span>${esc(softLabel('RIGHT_SOFT'))}</span></div></div></div>
    <div class="nano-navigation"><div class="nano-soft-caption">${key('LEFT_SOFT','','nano-soft-key')}</div><div class="nano-control-caption"><span>−</span>${key('MINUS')}</div><div class="nano-control-caption"><span aria-hidden="true">⟳</span>${key('NEXT')}</div><div class="nano-control-caption"><span>+</span>${key('PLUS')}</div><div class="nano-soft-caption">${key('RIGHT_SOFT','','nano-soft-key')}</div></div>
    <div class="nano-emergency">${control('CANCEL_BUZZER','Cancel<br>Buzzer')}${control('RESET','Reset')}<span aria-hidden="true"></span>${control('SOUND_ALARMS','Sound<br>Alarms')}${control('SILENCE_ALARMS','Silence<br>Alarms')}</div>
    <div class="nano-indicators">${[['disablement','Disablement'],['test','Test'],['delay','Delay'],['verify','Verify'],['system-fault','System Fault'],['power-fault','Power Fault'],['sounder-fault','Sounder Fault'],['sounder-disablement','Sounder Disablement']].map(([id,label])=>lamp(id,label)).join('')}</div>
    <div class="nano-zone-grid" aria-label="16 zone fire indicators">${Array.from({length:16},(_,i)=>{const zone=zones.get(i+1)||{},state=zone.state||(zone.fire?'on':'off');return `<span class="nano-zone${state!=='off'?' lit':''}${state==='flashing'?' flashing':''}" aria-label="Zone ${i+1}: ${esc(state)}"><i aria-hidden="true"></i>Zone ${i+1}</span>`;}).join('')}</div>
    <div class="nano-status-bars">${lamp('fault','FAULT','amber',true)}${lamp('power','POWER','green',true)}${lamp('fire','FIRE','red',true)}</div>
  </div><div class="nano-case-foot"><span>SINGLE LOOP · 16 ZONES</span><span>FINDR SIMULATION</span></div></div>`;
}

export function nanoSearch(items,query) {
  const terms=String(query||'').toLowerCase().trim().split(/\s+/).filter(Boolean);
  return items.filter(item=>terms.every(term=>textOf(item).toLowerCase().includes(term)));
}

export function createNanoController({app,db,toast}) {
  let data,content,model,state,pending,visible=false,token=0,section='panel',detail='';
  let run=null,routeRun=null,completed={},hints=true,zoom='fit',helpQuery='',mapQuery='',helpCategory='',mapLimit=30;
  let scenarioChoice='normal',saveChain=Promise.resolve(),saveWarning=false,timer=null,timerStarted=0,timerDelay=0;
  const feedback=createHintFeedback({enabled:true});
  const lesson=()=>content?.lessons.find(item=>item.id===run?.lessonId);
  const step=()=>lesson()?.steps[run?.index];
  const view=()=>nanoView(model,state);
  const nodeFor=id=>nodesOf(data).find(node=>node.id===id);
  const countCompleted=()=>Object.keys(completed).filter(id=>content.lessons.some(item=>item.id===id)).length;

  function refs(references=[]) {
    const sources=new Map((data?.sources||[]).map(source=>[source.id,source]));
    return `<div class="gent-refs">${list(references).map(ref=>{
      const source=sources.get(ref.sourceId);if(!source?.url)return '';
      let url;try{url=new URL(source.url);if(!['http:','https:'].includes(url.protocol))return '';}catch{return '';}
      const pages=ref.pages||[ref.pdfPage||ref.printedPage].filter(Boolean);if(pages[0])url.hash='page='+pages[0];
      return `<a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">${esc(source.documentNumber||source.document||source.shortTitle||'Source manual')} · p${esc(pages.join(', '))} ↗</a>`;
    }).join('')}</div>`;
  }

  async function load() {
    if(model)return;
    if(!pending)pending=(async()=>{
      [data,content]=await Promise.all(['gent-nano','gent-nano-lessons'].map(async name=>{const response=await fetch(`./data/${name}.json`);if(!response.ok)throw Error('Could not load Nano training data.');return response.json();}));
      model=buildNanoModel(data);
      let saved=null;try{saved=await db.setting(storeKey);const sound=await db.setting(soundKey);if(typeof sound==='boolean')feedback.setEnabled(sound);}catch{}
      state=saved?.state?restoreNanoState(model,saved.state):createNanoState(model,{scenarioId:'normal'});
      completed=saved?.completed&&typeof saved.completed==='object'?saved.completed:{};hints=saved?.hints!==false;
    })().catch(error=>{pending=null;model=null;throw error;});
    return pending;
  }

  function save() {
    if(!state)return saveChain;
    const payload=JSON.parse(JSON.stringify({version:1,state,completed,hints}));
    saveChain=saveChain.catch(()=>{}).then(()=>db.setSetting(storeKey,payload)).catch(()=>{if(!saveWarning){saveWarning=true;toast?.('Nano still works, but this device could not save your practice progress.');}});
    return saveChain;
  }

  function heading() {
    return `<div class="gent-family-switch" aria-label="Choose GENT panel"><a href="#gent">Vigilon · 4/6 loop</a><a href="#nano" aria-current="page">Nano · single loop</a></div><header class="gent-heading"><div><div class="eyebrow">FINDR / GENT FIRE PANEL TRAINING</div><h1>Get to know the Nano.</h1><p>Its own controls. Its own menu routes.<br>GENT Nano V3.xx · operating manual issue 9, December 2021.</p></div><span class="gent-badge">FICTIONAL TRAINING SITE</span></header><nav class="gent-tabs" aria-label="Nano trainer sections">${[['panel','Panel'],['learn','Learn'],['help','Help centre'],['map','Menu map'],['sources','Sources & scope']].map(([id,label])=>`<a href="#nano${id==='panel'?'':'/'+id}" ${section===id?'aria-current="page"':''}>${label}</a>`).join('')}<small>${content.lessons.length} guided lessons · ${countCompleted()} completed</small></nav>`;
  }

  function currentHint() {
    const current=step();
    if(run&&!run.done&&current){
      const hint=nextNanoHint(model,state,current)||{};
      return {...hint,key:hint.key||hint.keys?.[0]||null,message:hint.message||hint.reason||(current.action?'Use the labelled training action after checking the panel.':'Press the highlighted button yourself.')};
    }
    if(routeRun&&!routeRun.done){const route=findNanoRoute(model,state,routeRun.targetId);return {...route,key:route.keys?.[0]||null,message:route.reason||'Follow the highlighted physical button. You make every selection.'};}
    return {key:null,message:''};
  }

  function summary(v) {
    return `<div class="gent-live-summary">${[['fireCount','Fire','hot'],['faultCount','Fault','warn'],['disablementCount','Disablement','warn'],['testCount','Test','warn']].map(([id,label,cls])=>`<div class="gent-stat ${v.status[id]?cls:''}"><strong>${v.status[id]||0}</strong>${label}</div>`).join('')}</div>`;
  }

  function coach(v) {
    const active=lesson(),current=step(),hint=currentHint();
    if(run?.done){
      const restoreId=active.restoreLessonId||active.id.replace('disable-','enable-');
      const restore=restoreId!==active.id&&content.lessons.some(l=>l.id===restoreId);
      return `<section class="gent-card gent-coach"><div class="gent-completed"><div class="gent-completed-mark" aria-hidden="true">✓</div><div class="eyebrow">LESSON COMPLETE</div><h2>${esc(active.title)}</h2><p>You pressed the controls and reached the required panel state.</p>${v.status.disablementCount?`<div class="gent-callout">${v.status.disablementCount} simulated disablement${v.status.disablementCount===1?' is':'s are'} still active. Re-enable explicitly when practice is complete.</div>`:''}${v.status.testCount?'<div class="gent-callout">Test mode is still active. Finish the restore/exit lesson before leaving the practice panel normal.</div>':''}<p>${esc(active.restoreInstruction||'Check the indications before moving on.')}</p><div class="gent-inline">${restore?button('start-lesson','Practise the matching re-enable route →','primary gent-compact',`data-id="${esc(restoreId)}"`):''}${button('restart-lesson','Try again')}<a class="secondary gent-compact" href="#nano/learn">Next lesson →</a></div></div>${refs(active.sourceRefs)}</section>`;
    }
    if(active&&current)return `<section class="gent-card gent-coach" aria-label="Nano lesson coach"><div class="gent-step-count"><span>GUIDED LESSON</span><span>${run.index+1} / ${active.steps.length}</span></div><progress max="${active.steps.length}" value="${run.index}" aria-label="Lesson progress"></progress><div class="gent-step-number">${esc(active.title)}</div><h2 class="gent-step-title">${esc(current.title)}</h2><p>${esc(current.explanation)}</p><p class="gent-outcome"><strong>Look for:</strong> ${esc(current.expected)}</p>${hint.recovery?`<div class="gent-callout">${esc(hint.message)} Your completed steps are kept.</div>`:''}${current.action?button('lesson-action',esc(actionLabel(current.action)),'primary gent-compact'):''}<div class="gent-inline" style="margin-top:16px">${button('hints',hints?'Hints on':'SHOW HINTS','secondary gent-compact',`aria-pressed="${hints}"`)}${button('sound',feedback.isEnabled()?'Sound on':'Sound off','secondary gent-compact',`aria-pressed="${feedback.isEnabled()}"`)}</div>${current.commonMistake?`<details class="gent-details"><summary>Common mistake</summary><p>${esc(current.commonMistake)}</p></details>`:''}<details class="gent-details"><summary>All lesson steps</summary><ol class="gent-step-list">${active.steps.map((s,i)=>`<li class="${i<run.index?'done':i===run.index?'current':''}">${esc(s.title)}</li>`).join('')}</ol></details>${refs(current.sourceRefs||active.sourceRefs)}<div class="gent-inline" style="margin-top:16px">${button('restart-lesson','Restart lesson','subtle gent-compact')}${button('stop-lesson','Free practice','subtle gent-compact')}</div></section>`;
    if(routeRun)return `<section class="gent-card gent-coach"><div class="eyebrow">${routeRun.done?'MENU REACHED':'SHOW HINTS'}</div><h2>${esc(titleOf(nodeFor(routeRun.targetId)))}</h2><p>${routeRun.done?'You navigated here yourself. Check the fields before saving a change.':esc(hint.message)}</p>${routeRun.done?'<div class="gent-completed-mark" aria-hidden="true">✓</div>':''}<div class="gent-inline">${button('hints',hints?'Hints on':'SHOW HINTS')}${button('sound',feedback.isEnabled()?'Sound on':'Sound off')}${button('stop-lesson','Finish route','subtle gent-compact')}</div>${refs(nodeFor(routeRun.targetId)?.sourceRefs)}</section>`;
    return `<section class="gent-card"><div class="eyebrow">LEARN ONE TASK AT A TIME</div><h2>Start with the buttons.</h2><p>Nano uses − and + to change a value, the centre Next button to move along, and the two outer buttons to select the options shown on the display.</p><a class="primary gent-compact" href="#nano/learn">Explore ${content.lessons.length} lessons →</a><div class="gent-practice-code">FINDR practice PIN: <code>${esc(data.fixture?.trainingPin||'2468')}</code><br>A fictional practice code, not a manufacturer or site code.</div><details class="gent-details"><summary>Keyboard shortcuts</summary><p>Enter = left selection; Esc = right selection; − / + = change value; → or ↓ = Next. You can always tap the panel buttons.</p></details></section>`;
  }

  function actionLabel(action) {
    return action.label||(action.type==='acknowledge'?'I’ve checked this':action.type==='set-input'?'Set simulated input to '+action.value:action.type==='set-fault'?'Change the fictional fault':action.type==='tick'?'Advance training time '+((action.ms||5000)/1000)+' seconds':'Run training action');
  }

  function trainingControls(v) {
    return `<details class="gent-card gent-sim nano-sim"><summary>Training controls · fictional site</summary><p>These FINDR controls create practice events. They are outside the real Nano panel controls.</p><label for="nano-scenario">Start a scenario</label><select id="nano-scenario" data-nano-scenario>${list(data.scenarios).map(s=>`<option value="${esc(s.id)}" ${s.id===scenarioChoice?'selected':''}>${esc(s.title||s.label||s.id)}</option>`).join('')}</select><div class="gent-inline" style="margin-top:10px">${button('scenario','Load scenario')}${button('normal','Fresh normal panel','subtle gent-compact')}</div><p>A scenario starts a fresh fictional panel and ends the current lesson. Completed lessons stay saved.</p><div class="gent-device-list">${(v.devices||[]).map(d=>`<div class="gent-device-row"><strong>${esc(d.label||d.name||d.id)}</strong><small>${esc(d.id)} · Zone ${esc(d.zoneId||d.zone||'')}</small>${d.effectivelyDisabled?'<span class="gent-state-tag">Disabled in this practice site</span>':''}<label for="nano-input-${esc(d.id)}">Simulated input</label><select id="nano-input-${esc(d.id)}" data-nano-input="${esc(d.id)}">${(d.allowedInputs||(['sensor','mcp'].includes(d.type)?['normal','fire','fault']:['normal','fault'])).map(input=>`<option value="${input}" ${d.input===input?'selected':''}>${input}</option>`).join('')}</select></div>`).join('')}</div>${v.status.timerRemainingMs>0?button('tick','Advance training clock 5 seconds'):''}<p>Device/channel disablement is configured for Customer access in this fictional site. A real site may require Engineering access.</p></details>`;
  }

  function panel() {
    const v=view(),hint=currentHint(),current=step(),active=lesson();
    return `${helpBar('nano')}<div class="gent-workspace nano-workspace"><div class="gent-console-column">${summary(v)}<div class="nano-panel-card"><div class="gent-panel-toolbar"><span class="gent-badge">${v.status.accessLevel>=2?'CUSTOMER MODE · ACCESS 2':'NORMAL ACCESS · LEVEL 1'}</span>${button('zoom',zoom==='fit'?'Larger keys':'Fit whole panel','secondary gent-compact nano-panel-zoom')}<small>Practice PIN ${esc(data.fixture?.trainingPin||'2468')} · set each digit with − / +${run&&!run.done?'<br>Practice time paused while you learn. Use the labelled time steps.':''}</small></div>${current||routeRun?`<div class="nano-next-cue" id="nano-next-cue"><div><span>${active?`${run.index+1} / ${active.steps.length}`:'MENU ROUTE'}</span><strong>${esc(current?.title||titleOf(nodeFor(routeRun.targetId)))}</strong></div><p>${hints&&hint.key?`Press <strong>${esc(keyLabels[hint.key]||hint.key)}</strong>`:current?.action?'Use the training action in the lesson coach.':hints?esc(hint.message):'Hints are off. Try the next step yourself.'}</p></div>`:'<p class="nano-panel-intro">Use the five buttons below the screen to navigate. The display tells you what the two outer buttons will do.</p>'}<div class="nano-panel-scroll"><div class="nano-panel-stage">${nanoPanelFace(v,{hintKey:hints?hint.key:null})}</div></div><div class="nano-panel-status"><span>Buzzer: <strong>${v.status.buzzer?'sounding':'quiet'}</strong></span><span>Alarm sounders: <strong>${v.status.sounders?'sounding':'quiet'}</strong></span></div>${v.message?`<p class="gent-callout" role="status">${esc(v.message)}</p>`:''}<p class="gent-note nano-breadcrumb">${esc(list(v.breadcrumb).map(x=>typeof x==='string'?x:titleOf(x)).join(' › '))}</p>${v.note?`<p class="gent-note"><strong>Practice scope:</strong> ${esc(v.note)}</p>`:''}${refs(v.references||v.sourceRefs||nodeFor(v.nodeId)?.sourceRefs)}</div></div><div class="gent-side-column">${coach(v)}${trainingControls(v)}<section class="gent-card"><h3>Why this Nano?</h3><p>V3.xx operator controls, with the issue 9 manual as the baseline. The model, access assumptions and older engineering references are labelled throughout.</p><a class="back" href="#nano/sources">Sources & scope →</a></section></div></div>`;
  }

  function learn() {
    const tracks=content.tracks||[];
    return `<div class="gent-learn-intro"><div><h2>Small steps. Real understanding.</h2><p>Follow the highlighted buttons, read what changed, then try the task again without hints. Your completed lessons stay on this device.</p></div><div class="gent-learning-progress"><strong>${countCompleted()} / ${content.lessons.length}</strong>lessons completed</div></div>${tracks.map((track,index)=>{
      const items=content.lessons.filter(item=>item.trackId===track.id||list(track.lessonIds).includes(item.id));
      return `<section class="gent-track"><header class="gent-track-heading"><span class="gent-track-number">${String(index+1).padStart(2,'0')}</span><div><h2>${esc(track.title)}</h2><p>${esc(track.description||track.summary||'')}</p></div></header><div class="gent-lesson-grid">${items.map(item=>`<article class="gent-lesson-card${completed[item.id]?' complete':''}"><span class="gent-lesson-meta">${item.steps.length} steps${item.durationMinutes?' · '+item.durationMinutes+' min':''}</span><h3>${esc(item.title)}</h3><p>${esc(item.summary||item.description||item.objective||'')}</p>${completed[item.id]?'<span class="gent-done-marker">✓ Completed</span>':''}<div class="gent-inline">${button('start-lesson','SHOW HINTS','primary gent-compact',`data-id="${esc(item.id)}"`)}${button('challenge','Try without hints','secondary gent-compact',`data-id="${esc(item.id)}"`)}</div></article>`).join('')}</div></section>`;
    }).join('')}`;
  }

  function blocks(body) {
    return list(body).map(block=>typeof block==='string'?block.split(/\n\n/).map(p=>`<p>${esc(p)}</p>`).join(''):`${block.heading?`<h3>${esc(block.heading)}</h3>`:''}${block.text?`<p>${esc(block.text)}</p>`:''}${block.items?`<ul>${block.items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:''}`).join('');
  }

  function helpResults() {
    const articles=nanoSearch(content.helpArticles.filter(a=>!helpCategory||a.category===helpCategory),helpQuery), glossary=nanoSearch(content.glossary||[],helpQuery);
    if(helpCategory==='Glossary')return `<dl class="gent-glossary">${glossary.map(item=>`<div><dt>${esc(item.term)}</dt><dd>${esc(item.definition)}${refs(item.sourceRefs)}</dd></div>`).join('')}</dl>`;
    return `<p class="gent-note" role="status">${articles.length} matching help topics</p><div class="gent-help-grid">${articles.map(article=>`<article class="gent-help-card"><span class="gent-lesson-meta">${esc(article.category)}</span><h3>${esc(article.title)}</h3><p>${esc(article.summary)}</p><a href="#nano/help/${encodeURIComponent(article.id)}">Read explanation →</a></article>`).join('')}</div>${!articles.length?'<div class="gent-empty">No matching explanation. Try the display wording or a shorter phrase.</div>':''}${!helpCategory&&helpQuery&&glossary.length?`<h3 style="margin:24px 0 12px">Matching terms</h3><dl class="gent-glossary">${glossary.map(item=>`<div><dt>${esc(item.term)}</dt><dd>${esc(item.definition)}</dd></div>`).join('')}</dl>`:''}`;
  }

  function help() {
    const article=content.helpArticles.find(a=>a.id===detail);
    if(article)return `<article class="gent-article"><a class="back" href="#nano/help">← Help centre</a><div class="gent-lesson-meta" style="margin-top:18px">${esc(article.category)}</div><h2>${esc(article.title)}</h2><p class="gent-summary">${esc(article.summary)}</p>${blocks(article.body)}${article.commonMistake?`<div class="gent-callout"><strong>Watch for this:</strong> ${esc(article.commonMistake)}</div>`:''}${refs(article.sourceRefs)}${article.relatedLessonIds?.length?`<section class="gent-card" style="margin-top:25px"><h3>Practise on the Nano</h3><div class="gent-inline">${article.relatedLessonIds.map(id=>{const item=content.lessons.find(l=>l.id===id);return item?button('start-lesson',esc(item.title),'secondary gent-compact',`data-id="${esc(id)}"`):'';}).join('')}</div></section>`:''}</article>`;
    const categories=[...new Set(content.helpArticles.map(a=>a.category))];
    return `<div><h2>Make sense of the screen.</h2><p style="margin-top:14px">Search the words on the display, a button, or the task you want to practise.</p><label class="sr-only" for="nano-help-query">Search Nano help</label><input id="nano-help-query" class="gent-search" type="search" data-nano-search="help" value="${esc(helpQuery)}" placeholder="Try weekly test, disabled zone, sector, PIN…"><div class="gent-help-layout"><nav class="gent-help-nav" aria-label="Nano help topics">${['',...categories,'Glossary'].map(c=>button('help-category',esc(c||'All topics'),helpCategory===c?'active':'',`data-value="${esc(c)}"`)).join('')}</nav><div id="nano-help-results">${helpResults()}</div></div></div>`;
  }

  function mapItems() {
    const nodes=nodesOf(data),used=new Set();
    const references=list(data.menuReference).map(ref=>{const node=nodes.find(n=>n.id===(ref.nodeId||ref.emulatorNodeId||ref.id));if(node)used.add(node.id);return {...ref,emulatorNodeId:node?.id,title:ref.title||ref.label||ref.route?.at(-1)||ref.id};});
    return [...nodes.filter(n=>!used.has(n.id)).map(n=>({...n,emulatorNodeId:n.id,status:n.status||((n.referenceOnly||n.kind==='reference')?'reference':'implemented')})),...references];
  }

  function mapResults() {
    const items=nanoSearch(mapItems(),mapQuery);
    return `<p class="gent-note" role="status">${items.length} matching entries · SHOW HINTS lets you press the route yourself</p><div class="gent-map-results">${items.slice(0,mapLimit).map(item=>{
      const node=item.emulatorNodeId?nodeFor(item.emulatorNodeId):null;
      const routable=node&&!node.referenceOnly&&node.kind!=='reference'&&!['reference','conditional','conflict','version-limited'].includes(item.status)&&findNanoRoute(model,state,node.id).found;
      return `<article class="gent-map-node">${item.status&&item.status!=='implemented'?`<span class="gent-reference-tag">${esc(item.status==='conditional'?'Configuration dependent':item.status==='conflict'?'Source conflict':item.status==='version-limited'?'Older version reference':'Reference only')}</span>`:''}<div class="gent-map-path">${esc(list(item.route||item.path).join(' › '))}${item.accessLevel?' · Access '+esc(item.accessLevel):''}</div><h3>${esc(titleOf(item))}</h3><p>${esc(item.note||item.description||item.summary||'Read the source pages for this route and its scope.')}</p>${refs(item.sourceRefs)}${routable?`<div class="gent-inline">${button('open-node',node.id==='display-test'?'Run display test':'Open on panel','secondary',`data-id="${esc(node.id)}"`)}${button('hint-node','SHOW HINTS','primary',`data-id="${esc(node.id)}"`)}</div>`:''}</article>`;
    }).join('')}</div>${items.length>mapLimit?`<div style="margin-top:20px">${button('more-map','Show more entries')}</div>`:''}${items.length?'':'<div class="gent-empty">No documented match. Try the exact display phrase or a shorter word.</div>'}`;
  }

  function menuMap() {
    return `<div class="gent-learn-intro"><div><h2>The Nano menu, mapped.</h2><p>Find a function, read its source, then learn the physical-button route. Older engineering references stay labelled separately from the interactive operator model.</p></div><div class="gent-learning-progress"><strong>${nodesOf(data).length}</strong>mapped screens</div></div><label class="sr-only" for="nano-map-query">Search Nano menus</label><input id="nano-map-query" class="gent-search" type="search" data-nano-search="map" value="${esc(mapQuery)}" placeholder="Search a menu or task, e.g. devices, zone, historic…"><div id="nano-map-results">${mapResults()}</div>`;
  }

  function sources() {
    const gaps=list(data.knownLimits||data.sourceGaps||content.sourceGaps);
    return `<article class="gent-article"><h2>A specific Nano. Clear sources.</h2><p class="gent-summary">This trainer models the GENT Nano single-loop panel with V3.xx operator controls, using operating instructions 4188-947 issue 9 (December 2021) and installation instructions 4188-948 issue 11 (January 2022).</p><p>The commissioning manual is an older V2.xx edition. Its engineering menus are reference material unless the implemented behaviour is supported by the stated operator baseline. The simulator is not a complete firmware replica.</p><p><strong>Your learning pace:</strong> guided lessons pause the simulation clock while you read. Their labelled time steps advance the documented test durations. Free practice runs timers while the trainer is visible.</p><div class="gent-callout"><strong>Our practice site:</strong> fictional devices, events and PIN ${esc(data.fixture?.trainingPin||'2468')}. Device/channel disablement is commissioned for Customer access here; a real installation can require Engineering access. Read the site's settings and exact manual.</div>${blocks(data.modelScope?.limits||data.modelScope?.limitations)}<p>This is manual-based training. It has not been checked against physical Nano firmware, and FINDR is not affiliated with or endorsed by GENT or Honeywell.</p><h3>Manufacturer documents</h3>${(data.sources||[]).map(source=>`<section class="gent-source"><h3>${esc(source.title)}</h3><p>${esc(source.edition||source.date||'')} ${esc(source.scope||source.note||'')}</p><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">Open manufacturer document ↗</a>${source.sha256?`<p class="gent-note">Pinned file SHA-256<br><code>${esc(source.sha256)}</code></p>`:''}</section>`).join('')}<h3>What still needs checking</h3><p>To help resolve one of these items, record the Nano software version, the preceding screen and the button you pressed.</p>${gaps.map(gap=>`<section class="gent-source"><h3>${esc(gap.title||gap.id||'Source limit')}</h3><p>${esc(typeof gap==='string'?gap:gap.description||gap.explanation||gap.note||gap.detail||gap.summary||textOf(gap))}</p>${gap.treatment?`<p>${esc(gap.treatment)}</p>`:''}${refs(gap.sourceRefs)}</section>`).join('')}<a class="secondary" href="./data/gent-nano.json" download="FINDR-GENT-Nano-reference.json">Download Nano menu reference ↓</a></article>`;
  }

  function fitPanel() {
    const scroller=app.querySelector('.nano-panel-scroll'),stage=app.querySelector('.nano-panel-stage'),face=app.querySelector('.nano-case');if(!scroller||!stage||!face)return;
    face.style.position='relative';face.style.transform='none';stage.style.height='';scroller.style.overflowX='auto';
    const width=stage.clientWidth,natural=face.offsetWidth;
    if(zoom==='fit'&&width>0&&width<natural){const ratio=width/natural,height=face.offsetHeight;face.style.position='absolute';face.style.transformOrigin='top left';face.style.transform=`scale(${ratio})`;stage.style.height=`${height*ratio}px`;scroller.style.overflowX='hidden';}
  }

  function stopTimer() {clearTimeout(timer);timer=null;timerStarted=0;timerDelay=0;}
  function scheduleTimer() {
    stopTimer();const remaining=Number(view().status.timerRemainingMs)||0;
    if(!visible||document.hidden||remaining<=0||(run&&!run.done))return;
    timerStarted=Date.now();timerDelay=remaining;
    timer=setTimeout(()=>{timer=null;timerStarted=0;timerDelay=0;if(!visible)return;state=tickNano(model,state,remaining);save();draw();},remaining);
  }

  function draw() {
    if(!visible||!model)return;
    settleTimer();
    const scroll=app.querySelector('.nano-panel-scroll')?.scrollLeft||0,openSim=app.querySelector('.nano-sim')?.open,focused=document.activeElement?.dataset?.key;
    app.innerHTML=`<section class="gent-root nano-root" data-nano-root>${heading()}${section==='learn'?learn():section==='help'?help():section==='map'?menuMap():section==='sources'?sources():panel()}</section>`;
    fitPanel();const scroller=app.querySelector('.nano-panel-scroll');
    if(scroller){scroller.scrollLeft=zoom==='fit'?0:scroll;const hinted=scroller.querySelector('.nano-hint-key');if(hinted&&zoom!=='fit'){const box=hinted.getBoundingClientRect(),bounds=scroller.getBoundingClientRect();if(box.left<bounds.left+10||box.right>bounds.right-10)scroller.scrollLeft+=box.left-bounds.left-bounds.width/2+box.width/2;}}
    if(openSim&&app.querySelector('.nano-sim'))app.querySelector('.nano-sim').open=true;
    if(focused)[...app.querySelectorAll('[data-nano-action="key"]')].find(el=>el.dataset.key===focused)?.focus({preventScroll:true});
    scheduleTimer();
  }

  function cancelRun() {run=null;routeRun=null;feedback.cancel();}
  function navigatePanel() {section='panel';detail='';if(location.hash!=='#nano')location.hash='#nano';else draw();}
  function startLesson(id,showHints=true) {
    const item=content.lessons.find(l=>l.id===id);if(!item)return;
    cancelRun();stopTimer();state=loadNanoScenario(model,state,typeof item.scenario==='string'?item.scenario:item.scenario?.id||'normal');
    hints=showHints;run={id:uid(),lessonId:id,index:0,done:false};feedback.start(run.id);save();navigatePanel();
  }

  function advance(before,actionType) {
    const active=lesson(),current=step();
    if(run&&!run.done&&current){
      const conditions=list(current.conditions),fresh=!conditions.some(c=>c.type==='event')||state.lastEvent?.sequence!==before?.lastEvent?.sequence;
      const allowed=current.action?actionType==='lesson-action':actionType==='key'&&state.lastAction?.ok!==false;
      if(allowed&&fresh&&evaluateNanoConditions(model,state,conditions)){
        run.index++;feedback.step({runId:run.id,completed:run.index,total:active.steps.length});
        if(run.index>=active.steps.length){if(evaluateNanoConditions(model,state,active.completionConditions||[])){run.done=true;completed[active.id]={at:new Date().toISOString(),withHints:hints};feedback.complete({runId:run.id});}else{run.index=active.steps.length-1;toast?.('Check the final panel state. '+(active.restoreInstruction||'The task is not complete yet.'));}}
      }
    }
    if(routeRun&&!routeRun.done){const remaining=findNanoRoute(model,state,routeRun.targetId);if(view().nodeId===routeRun.targetId){routeRun.done=true;feedback.complete({runId:routeRun.id});}else if(remaining.found&&remaining.keys.length<routeRun.bestRemaining){routeRun.bestRemaining=remaining.keys.length;routeRun.progress++;feedback.step({runId:routeRun.id,completed:routeRun.progress,total:routeRun.total});}}
  }

  function settleTimer() {
    if(timerStarted&&timerDelay){const elapsed=Math.min(timerDelay,Math.max(0,Date.now()-timerStarted));stopTimer();if(elapsed>0)state=tickNano(model,state,elapsed);}else stopTimer();
  }
  function mutate(reducer,actionType='key') {settleTimer();const before=state;state=reducer(state);advance(before,actionType);save();draw();}

  function routeTo(id,guided) {
    const route=findNanoRoute(model,state,id);
    if(!route.found){toast?.(route.reason||'This entry has no verified operator key route.');return;}
    cancelRun();stopTimer();
    if(guided){hints=true;routeRun={id:uid(),targetId:id,total:route.keys.length,bestRemaining:route.keys.length,progress:0,done:route.keys.length===0};feedback.start(routeRun.id);}else for(const key of route.keys)state=pressNanoKey(model,state,key);
    save();navigatePanel();
  }

  async function render(nextSection,nextDetail) {
    const stamp=++token;visible=true;section=['learn','help','map','sources'].includes(nextSection)?nextSection:'panel';detail=nextDetail?decodeURIComponent(nextDetail):'';
    if(!model)app.innerHTML='<div class="loading">Opening the Nano trainer…</div>';
    try{await load();if(stamp!==token||!visible||!location.hash.startsWith('#nano'))return;if(nextSection==='guided'){routeTo(detail,true);return;}if(nextSection==='coach'&&content.lessons.some(l=>l.id===detail)){startLesson(detail,true);return;}draw();}catch(error){if(stamp===token)app.innerHTML=`<div class="gent-empty"><h2>Nano could not load.</h2><p>${esc(error.message)}</p>${button('retry','Try again')}</div>`;}
  }

  app.addEventListener('findr:request-hints',event=>{if(!visible||section!=='panel'||!(run||routeRun)||event.detail?.engineId!=='gent-nano')return;event.preventDefault();hints=true;save();draw();app.querySelector('.gent-coach')?.scrollIntoView?.({block:'nearest'});});

  app.addEventListener('click',event=>{
    const target=event.target.closest('[data-nano-action]');if(!visible||!target||target.disabled)return;
    const action=target.dataset.nanoAction,id=target.dataset.id;
    if(action==='retry'){render(section,detail);return;}if(!model)return;feedback.unlock();
    if(action==='key'){mutate(s=>pressNanoKey(model,s,target.dataset.key));return;}
    if(action==='zoom'){settleTimer();zoom=zoom==='fit'?'large':'fit';draw();return;}
    if(action==='start-lesson'||action==='challenge'){startLesson(id,action==='start-lesson');return;}
    if(action==='restart-lesson'){if(run)startLesson(run.lessonId,hints);return;}
    if(action==='stop-lesson'){cancelRun();save();draw();return;}
    if(action==='hints'){settleTimer();hints=!hints;save();draw();return;}
    if(action==='sound'){settleTimer();feedback.setEnabled(!feedback.isEnabled());if(feedback.isEnabled())feedback.unlock();db.setSetting(soundKey,feedback.isEnabled()).catch(()=>{});draw();return;}
    if(action==='lesson-action'){
      const a=step()?.action;if(!a)return;
      if(a.type==='set-input')mutate(s=>setNanoDeviceInput(model,s,a.device,a.value),'lesson-action');
      else if(a.type==='set-fault')mutate(s=>setNanoFault(model,s,a.fault,a.value),'lesson-action');
      else if(a.type==='tick')mutate(s=>tickNano(model,s,a.ms||5000),'lesson-action');
      else if(a.type==='acknowledge')mutate(s=>s,'lesson-action');
      return;
    }
    if(action==='scenario'||action==='normal'){cancelRun();stopTimer();state=loadNanoScenario(model,state,action==='normal'?'normal':scenarioChoice);save();draw();return;}
    if(action==='tick'){mutate(s=>tickNano(model,s,5000),'trainer');return;}
    if(action==='help-category'){helpCategory=target.dataset.value||'';draw();return;}
    if(action==='more-map'){mapLimit+=30;const el=app.querySelector('#nano-map-results');if(el)el.innerHTML=mapResults();return;}
    if(action==='open-node'||action==='hint-node'){routeTo(id,action==='hint-node');return;}
  });
  app.addEventListener('input',event=>{if(!visible||!model)return;const kind=event.target.dataset.nanoSearch;if(kind==='help'){helpQuery=event.target.value;app.querySelector('#nano-help-results').innerHTML=helpResults();}if(kind==='map'){mapQuery=event.target.value;mapLimit=30;app.querySelector('#nano-map-results').innerHTML=mapResults();}});
  app.addEventListener('change',event=>{if(!visible||!model)return;if(event.target.hasAttribute('data-nano-scenario'))scenarioChoice=event.target.value;if(event.target.hasAttribute('data-nano-input'))mutate(s=>setNanoDeviceInput(model,s,event.target.dataset.nanoInput,event.target.value),'trainer');});
  document.addEventListener('keydown',event=>{if(document.querySelector('.onsite-dialog[open]'))return;
    if(!visible||section!=='panel'||!model||event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey||event.repeat)return;
    if(event.target.closest('input,textarea,select,[contenteditable="true"],dialog')||event.target.matches('button,a'))return;
    const key=({Escape:'RIGHT_SOFT',Enter:'LEFT_SOFT','-':'MINUS','_':'MINUS','+':'PLUS','=':'PLUS',ArrowRight:'NEXT',ArrowDown:'NEXT'})[event.key];if(!key)return;
    event.preventDefault();feedback.unlock();mutate(s=>pressNanoKey(model,s,key));
  });
  globalThis.addEventListener?.('resize',()=>{if(visible&&section==='panel')fitPanel();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){feedback.pause();if(state){settleTimer();save();}}else if(visible)scheduleTimer();});
  function leave() {if(!visible)return;visible=false;token++;stopTimer();cancelRun();if(state){state=leaveNano(model,state);save();}}
  async function flush(){if(state)await save();await saveChain;}
  return {render,leave,flush};
}
