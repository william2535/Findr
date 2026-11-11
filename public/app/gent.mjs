import {helpBar} from './onsite.mjs';
import {
  buildGentModel, createGentState, pressGentKey, setGentDeviceInput, setGentFault,
  setGentAccess, loadGentScenario, setGentZoneTest, tickGent, gentView,
  restoreGentState, leaveGent, findGentRoute, evaluateGentConditions,
} from './gent-engine.mjs';
import {createHintFeedback} from './emulator-feedback.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const asArray = value => Array.isArray(value) ? value : value == null ? [] : [value];
const textOf = value => typeof value === 'string' ? value : Array.isArray(value) ? value.map(textOf).join(' ') : value && typeof value === 'object' ? Object.values(value).map(textOf).join(' ') : String(value ?? '');
const button = (action, label, cls='secondary gent-compact', attrs='') => `<button type="button" class="${cls}" data-gent-action="${action}" ${attrs}>${label}</button>`;
const keyLabels = {MENU_ON_OFF:'Menu On/Off',CANCEL_BUZZER:'Cancel Buzzer',SOUND_ALARMS:'Sound Alarms',SILENCE_ALARMS:'Silence Alarms',RESET:'Reset',VERIFY:'Verify',PREVIOUS:'Previous ↑',NEXT:'Next ↓',ENTER:'Enter',DELETE:'Delete',INSERT:'Insert',SPACE:'Space',SHIFT:'Shift',LEFT:'←',RIGHT:'→'};
const storeKey='gent-vigilon-trainer-v1';
const soundKey='keypad-hint-sound-v1';
const getNodes = data => Array.isArray(data.nodes) ? data.nodes : Object.values(data.nodes || {});
const titleOf = node => node?.title || node?.label || node?.id || '';
const uid = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);

/** Code-drawn panel recognises the actual p7 control arrangement. No photo hotspots. */
export function gentPanelFace(view, {hintKey=null}={}) {
  const physical = new Map((view.physicalKeys || []).map(key=>[key.id,key]));
  const key = (id,label=id,cls='gent-round-key',extra='') => {
    const spec=physical.get(id), enabled=spec ? spec.enabled !== false : view.status.accessLevel >= 2;
    return `<button type="button" class="gent-key ${cls}${id===hintKey?' gent-hint-key':''}" data-gent-action="key" data-key="${esc(id)}" aria-label="${esc(keyLabels[id]||spec?.label||label)}${id===hintKey?' — next hinted key':''}" ${id===hintKey?'aria-describedby="gent-next-cue"':''} ${enabled?'':'disabled'} ${extra}>${esc(label)}</button>`;
  };
  const leds = new Map((view.leds || []).map(led=>[led.id,led]));
  const lamp = (id,shortLabel) => {const led=leds.get(id)||{id,label:id,state:'off',color:'amber'};return `<span class="gent-led ${esc(led.state)} ${esc(led.color)}" aria-label="${esc(led.label)}: ${esc(led.state)}"><i class="gent-lamp" aria-hidden="true"></i><span>${esc(shortLabel||led.label)}</span></span>`;};
  const fireZones=new Set((view.zones||[]).filter(z=>z.fire).map(z=>Number(z.number ?? String(z.id).replace(/\D/g,''))));
  const captionKey = (id,label) => `<div class="gent-key-caption"><span>${esc(label||keyLabels[id])}</span>${key(id,'','gent-wide-key')}</div>`;
  const rows=[['1','2','3','4','5','6','7','8','9','0','-','INSERT','U1'],[...'QWERTYUIOP',';','DELETE','U2'],[...'ASDFGHJKL','PREVIOUS','.','ENTER','U3'],['SHIFT',...'ZXCVBNM','LEFT','NEXT','RIGHT','SPACE','U4']];
  const display = view.screen || {};
  const lines = asArray(display.lines).map(String);
  if(display.heading && lines[0]!==display.heading)lines.unshift(display.heading);
  const soft=(display.softKeys || view.softKeys || []);
  return `<div class="gent-face" role="group" aria-label="GENT Vigilon style simulated control panel">
    <div class="gent-face-brand"><strong>GENT</strong><span>VIGILON</span></div>
    <div class="gent-zone-strip"><span>Zones</span><div class="gent-zone-numbers">${Array.from({length:32},(_,i)=>`<span class="${fireZones.has(i+1)?'lit':''}">${i+1}</span>`).join('')}</div></div>
    <div class="gent-indicator-deck"><div class="gent-leds">${['fault','power-fault','system-fault','delay','test','disablement'].map(id=>lamp(id)).join('')}</div><div>
      <div class="gent-screen-frame"><div class="gent-screen" role="status" aria-live="polite" aria-atomic="true" aria-label="Panel display"><div class="gent-screen-lines">${lines.slice(0,soft.length?7:8).map(line=>esc(line)).join('\n')}</div>${soft.length?`<div class="gent-screen-softkeys">${['F1','F2','F3','F4'].map(k=>{const item=soft.find(x=>x.key===k);return `<span class="${item?.enabled===false?'inactive':''}">${esc(item?.label||'·')}</span>`;}).join('')}</div>`:''}</div></div>
      <div class="gent-event-scroll">${button('key','Previous',hintKey==='PREVIOUS'?'gent-hint-key':'',`data-key="PREVIOUS" aria-label="Previous fire event"`)}${button('key','Next',hintKey==='NEXT'?'gent-hint-key':'',`data-key="NEXT" aria-label="Next fire event"`)}</div>
    </div><div class="gent-leds right">${['fire','verify','sounder'].map(id=>lamp(id)).join('')}<div class="gent-routing-leds"><span>Fire Routing O/P</span>${lamp('fire-routing-active','Active')}${lamp('fire-routing-fault','Fault/Dis')}</div>${lamp('power')}</div></div>
    <div class="gent-soft-row">${captionKey('MENU_ON_OFF')}<div class="gent-soft-group">${['F1','F2','F3','F4'].map(k=>key(k,k,'gent-wide-key')).join('')}</div>${captionKey('CANCEL_BUZZER')}</div>
    <div class="gent-operation-row">${['SOUND_ALARMS','SILENCE_ALARMS','RESET','VERIFY'].map(k=>captionKey(k)).join('')}</div>
    <div class="gent-keyboard">${rows.flat().map(id=>key(id,({PREVIOUS:'↑',NEXT:'↓',INSERT:'Insert',DELETE:'Delete',ENTER:'Enter',SHIFT:'Shift',SPACE:'Space',LEFT:'←',RIGHT:'→'})[id]||id,'gent-round-key'+(['INSERT','DELETE','ENTER','SHIFT','SPACE'].includes(id)?' small-word':'')+(['PREVIOUS','NEXT'].includes(id)?' fire-arrow':''))).join('')}</div>
    <div class="gent-face-foot"><span>4 / 6 LOOP · 2 km CARDS</span><span class="gent-simulation-stamp">FINDR SIMULATION</span></div>
  </div>`;
}

export function gentSearch(items, query) {
  const normalise=value=>String(value||'').toLowerCase().replace(/\b(vigilion|vigillion|viglion)\b/g,'vigilon').replace(/\bwalk[-\s]?test\b/g,'walk test').replace(/[\/–—-]/g,' ');
  const terms=normalise(query).trim().split(/\s+/).filter(term=>term&&!['how','to','put','a','the','in','into','please'].includes(term));
  return items.filter(item=>terms.every(term=>normalise(textOf(item)).includes(term)));
}

export function createGentController({app,db,toast}) {
  let data,lessonsData,model,state,pending,visible=false,token=0,section='panel',detail='';
  let run=null,routeRun=null,completed={},hints=true,panelZoom='fit',lessonQuery='',helpQuery='',mapQuery='',helpCategory='',mapLimit=30;
  let scenarioChoice='normal',saveChain=Promise.resolve(),saveWarning=false,lastNotice='',completedNow=false,displayTimer=null,timerStartedAt=null;
  const feedback=createHintFeedback({enabled:true});
  const sourceById=()=>new Map((data?.sources||[]).map(source=>[source.id,source]));
  const currentLesson=()=>lessonsData?.lessons.find(lesson=>lesson.id===run?.lessonId);
  const currentStep=()=>currentLesson()?.steps[run?.index];
  const view=()=>gentView(model,state);
  const nodeFor=id=>getNodes(data).find(node=>node.id===id);

  function refs(references=[]) {
    const sources=sourceById();
    return `<div class="gent-refs">${asArray(references).map(ref=>{
      const source=sources.get(ref.sourceId);if(!source?.url)return '';
      let url;try{url=new URL(source.url);if(!['http:','https:'].includes(url.protocol))return '';}catch{return '';}
      const pages=ref.pages || [ref.pdfPage || ref.printedPage].filter(Boolean);
      if(pages[0])url.hash='page='+pages[0];
      return `<a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">${esc(source.documentNumber||source.document||source.shortTitle||'Source manual')} · p${esc(pages.join(', '))} ↗</a>`;
    }).join('')}</div>`;
  }

  async function load() {
    if(model)return;
    if(!pending)pending=(async()=>{
      const files=await Promise.all(['gent-vigilon','gent-lessons'].map(async name=>{const response=await fetch(`./data/${name}.json`);if(!response.ok)throw Error(`Could not load ${name}.`);return response.json();}));
      [data,lessonsData]=files;model=buildGentModel(data);
      let saved=null;
      try{saved=await db.setting(storeKey);const sound=await db.setting(soundKey);if(typeof sound==='boolean')feedback.setEnabled(sound);}catch{}
      state=saved?.state?restoreGentState(model,saved.state):createGentState(model,{scenarioId:'normal',access:2});
      completed=saved?.completed && typeof saved.completed==='object'?saved.completed:{};
      hints=saved?.hints!==false;
    })().catch(error=>{pending=null;model=null;throw error;});
    return pending;
  }

  function save() {
    if(!state)return saveChain;
    const payload=JSON.parse(JSON.stringify({version:1,state,completed,hints}));
    saveChain=saveChain.catch(()=>{}).then(()=>db.setSetting(storeKey,payload)).catch(()=>{
      if(!saveWarning){saveWarning=true;toast?.('GENT still works, but this device could not save your practice progress.');}
    });
    return saveChain;
  }

  function heading() {
    return `<div class="gent-family-switch" aria-label="Choose GENT panel"><a href="#gent" aria-current="page">Vigilon · 4/6 loop</a><a href="#nano">Nano · single loop</a></div><header class="gent-heading"><div><div class="eyebrow">FINDR / FIRE PANEL TRAINING</div><h1>Meet the GENT Vigilon.</h1><p>4/6-loop panel with 2 km loop cards · July 2015 operator manual.<br>Learn the controls, practise the routes, understand what the panel is telling you.</p></div><span class="gent-badge">FICTIONAL TRAINING SITE</span></header><nav class="gent-tabs" aria-label="GENT trainer sections">${[['panel','Panel'],['learn','Learn'],['help','Help centre'],['map','Menu map'],['sources','Sources & scope']].map(([id,label])=>`<a href="#gent${id==='panel'?'':'/'+id}" ${section===id?'aria-current="page"':''}>${label}</a>`).join('')}<small>${lessonsData.lessons.length} guided lessons · ${Object.keys(completed).filter(id=>lessonsData.lessons.some(l=>l.id===id)).length} completed</small></nav>`;
  }

  function nextHint() {
    const step=currentStep(),v=view();
    if(run&&!run.done&&step){
      if(v.status.accessLevel<2 && step.nextKey && !['PREVIOUS','NEXT'].includes(step.nextKey))return {key:null,message:'Open the demo door to reveal the operator controls.',openDoor:true};
      for(const entry of step.requiredEntries||[]){
        const actual=String(v.form[entry.name]||''),expected=String(entry.value);
        if(actual===expected)continue;
        if(v.nodeId!==entry.nodeId){const route=findGentRoute(model,state,entry.nodeId);if(route.found&&route.keys.length)return {key:route.keys[0],message:'Restore the '+entry.name+' selection before completing this step.',recovery:true};return {key:null,message:route.reason||'Restart this lesson to recover its field selections.'};}
        if(v.screen.field?.cursor<actual.length)return {key:'RIGHT',message:'Move to the end of the field to correct its value.',recovery:true};
        return {key:expected.startsWith(actual)?expected[actual.length]:'DELETE',message:'Restore '+entry.name+' '+expected+' before accepting this operation.',recovery:true};
      }
      const target=step.goal?.nodeId || (typeof step.goal==='string'?step.goal:null);
      if(target && (v.menuOpen?v.nodeId:'status')!==target){const route=findGentRoute(model,state,target);if(route.found&&route.keys.length)return {key:route.keys[0],message:'Return to '+(target==='status'?'the status display':titleOf(nodeFor(target)))+' to continue this step.',recovery:true};if(!route.found)return {key:null,message:route.reason||'Use Menu On/Off to return, then resume the route.'};}
      const expectedField=asArray(step.conditions).find(c=>c.type==='field'&&c.name===v.screen.field?.name);
      if(expectedField && /^[A-Z0-9]$/.test(step.nextKey||'')){
        const actual=String(v.screen.field.value||''),expected=String(expectedField.value);
        if(actual && (!expected.startsWith(actual)||actual===expected))return {key:v.screen.field.cursor<actual.length?'RIGHT':'DELETE',message:'Remove the extra character, then enter the value shown in this step.',recovery:true};
        if(expected.startsWith(actual)&&actual!==expected)return {key:v.screen.field.cursor<actual.length?'RIGHT':expected[actual.length],message:actual.length<expected.length-1?'Rebuild the field shown in this step.':'Press the indicated key yourself.',recovery:actual.length<expected.length-1};
      }
      if(step.nextKey==='ENTER'&&nodeFor(v.nodeId)?.enter?.action==='authenticate'){
        const actual=String(v.form.pin||''),expected=String(step.requiredAccess===3?data.fixture.trainingEngineeringPin:data.fixture.trainingPin);
        if(!expected.startsWith(actual))return {key:v.screen.field?.cursor<actual.length?'RIGHT':'DELETE',message:'Correct the fictional practice code before accepting it.',recovery:true};
        if(actual!==expected)return {key:v.screen.field?.cursor<actual.length?'RIGHT':expected[actual.length],message:'Finish entering the fictional practice code before pressing Enter.',recovery:true};
      }
      return {key:step.nextKey||null,message:step.action?'Use the training action after checking the panel.':'Press the indicated key yourself.'};
    }
    if(routeRun&&!routeRun.done){const route=findGentRoute(model,state,routeRun.targetId);return {key:route.keys[0]||null,message:route.found?'Follow the highlighted physical key.':route.reason};}
    return {key:null,message:''};
  }

  function panelStatus(v) {
    return `<div class="gent-live-summary">${[['fireCount','Fire','hot'],['faultCount','Fault','warn'],['disablementCount','Disablement','warn'],['testCount','Zone test','warn']].map(([id,label,cls])=>`<div class="gent-stat ${v.status[id]?cls:''}"><strong>${v.status[id]||0}</strong>${label}</div>`).join('')}</div>`;
  }

  function lessonActionLabel(action) {
    if(action.type==='acknowledge')return 'I’ve checked this';
    if(action.type==='set-input')return 'Set simulated input to '+esc(action.value);
    if(action.type==='set-fault')return 'Clear this fictional fault';
    if(action.type==='advance-time')return 'Advance 5 simulated seconds';
    return 'Run training action';
  }

  function coach(v) {
    const lesson=currentLesson(),step=currentStep(),hint=nextHint();
    if(run?.done){const restoreId=({'gent-disable-device':'gent-enable-device','gent-disable-zone':'gent-enable-zone'})[lesson.id];return `<section class="gent-card gent-coach"><div class="gent-completed"><div class="gent-completed-mark" aria-hidden="true">✓</div><div class="eyebrow">LESSON COMPLETE</div><h2>${esc(lesson.title)}</h2><p>You worked through every step and reached the lesson’s final state.</p>${v.status.disablementCount?`<div class="gent-callout">${v.status.disablementCount} simulated disablement${v.status.disablementCount===1?' is':'s are'} still active. Restore protection explicitly; Reset does not do this.</div>`:''}<p>${esc(lesson.restoreInstruction||'Keep checking the indications before moving on.')}</p><div class="gent-inline">${restoreId?button('start-lesson','Learn the matching re-enable route →','primary gent-compact',`data-id="${restoreId}"`):''}${button('restart-lesson','Try again','secondary gent-compact')}<a class="secondary gent-compact" href="#gent/learn">Choose next lesson →</a></div></div>${refs(lesson.sourceRefs)}</section>`;}
    if(lesson&&step)return `<section class="gent-card gent-coach" aria-label="GENT lesson coach"><div class="gent-step-count"><span>GUIDED LESSON</span><span>${run.index+1} / ${lesson.steps.length}</span></div><progress max="${lesson.steps.length}" value="${run.index}" aria-label="Lesson progress"></progress><div class="gent-step-number">${esc(lesson.title)}</div><h2 class="gent-step-title">${esc(step.title)}</h2><p>${esc(step.explanation)}</p><p class="gent-outcome"><strong>Look for:</strong> ${esc(step.expected)}</p>${hint.recovery?`<div class="gent-callout">${esc(hint.message)} Your completed steps are kept.</div>`:''}${step.action?button('lesson-action',lessonActionLabel(step.action),'primary gent-compact'):''}${hint.openDoor?button('door','Open demo door','primary gent-compact'):''}<div class="gent-inline" style="margin-top:16px">${button('hints',hints?'Hints on':'SHOW HINTS','secondary gent-compact',`aria-pressed="${hints}"`)}${button('sound',feedback.isEnabled()?'Sound on':'Sound off','secondary gent-compact',`aria-pressed="${feedback.isEnabled()}"`)}</div>${step.commonMistake?`<details class="gent-details"><summary>Common mistake to avoid</summary><p>${esc(step.commonMistake)}</p></details>`:''}<details class="gent-details"><summary>All steps in this lesson</summary><ol class="gent-step-list">${lesson.steps.map((s,i)=>`<li class="${i<run.index?'done':i===run.index?'current':''}">${esc(s.title)}</li>`).join('')}</ol></details>${refs(step.sourceRefs||lesson.sourceRefs)}<div class="gent-inline" style="margin-top:17px">${button('restart-lesson','Restart lesson','subtle gent-compact')}${button('stop-lesson','Free practice','subtle gent-compact')}</div></section>`;
    if(routeRun){const done=routeRun.done;return `<section class="gent-card gent-coach"><div class="eyebrow">${done?'MENU REACHED':'SHOW HINTS'}</div><h2>${esc(titleOf(nodeFor(routeRun.targetId)))}</h2><p>${done?'You pressed the route yourself. Read the screen and check its fields before committing an action.':'The highlight follows a supported navigation route from your current screen. You press every key yourself.'}</p>${done?'<div class="gent-completed-mark" aria-hidden="true">✓</div>':`<p>${esc(hint.message)}</p>`}<div class="gent-inline">${button('hints',hints?'Hints on':'SHOW HINTS','secondary gent-compact')}${button('sound',feedback.isEnabled()?'Sound on':'Sound off','secondary gent-compact')}${button('stop-lesson','Finish route','subtle gent-compact')}</div>${refs(nodeFor(routeRun.targetId)?.sourceRefs)}</section>`;}
    return `<section class="gent-card"><div class="eyebrow">YOUR OWN PRACTICE PANEL</div><h2>Start with a guided lesson.</h2><p>Learn a complete task with a highlighted next key, an explanation at each step and checks against what the panel actually did.</p><a class="primary gent-compact" href="#gent/learn">Explore ${lessonsData.lessons.length} lessons →</a><div class="gent-practice-code">FINDR customer practice code: <code>${esc(data.fixture?.trainingPin||'2468')}</code><br>Walk-test engineering practice code: <code>${esc(data.fixture?.trainingEngineeringPin||'3917')}</code><br>Both are made up for this emulator. They are not manufacturer or site codes.</div><details class="gent-details"><summary>Keyboard shortcuts</summary><p>Use letters and numbers to type. Enter accepts a PIN or label; use the displayed F1–F4 prompt for numeric selections. Esc toggles Menu On/Off. The on-screen controls show the actual panel labels.</p></details></section>`;
  }

  function simulator(v) {
    return `<details class="gent-card gent-sim"><summary>Training controls · fictional site</summary><p>These controls create events for practice. They are FINDR controls, outside the panel face.</p><label for="gent-scenario">Start a scenario</label><select id="gent-scenario" data-gent-scenario>${asArray(data.scenarios).map(s=>`<option value="${esc(s.id)}" ${s.id===scenarioChoice?'selected':''}>${esc(s.title||s.label||s.id)}</option>`).join('')}</select><div class="gent-inline" style="margin-top:10px">${button('scenario','Load scenario','secondary gent-compact')}${button('normal','Fresh normal panel','subtle gent-compact')}</div><p>Loading a scenario starts a fresh fictional panel and ends the current lesson. Completed lessons stay saved.</p><div class="gent-device-list">${v.devices.map(d=>`<div class="gent-device-row"><strong>${esc(d.label||d.name||d.id)}</strong><small>${esc(d.id)} · Zone ${esc(d.zoneId||d.zone||'')}</small>${d.disablementScopeUnknown?'<span class="gent-state-tag">Zone disabled · MCP scope not verified</span>':d.effectivelyDisabled?'<span class="gent-state-tag">Sensing disabled</span>':''}<label for="gent-input-${esc(d.id)}">Simulated input</label><select id="gent-input-${esc(d.id)}" data-gent-input="${esc(d.id)}">${['normal','fire','fault'].map(input=>`<option value="${input}" ${d.input===input?'selected':''}>${input==='normal'?'Normal input':input==='fire'?'Fire stimulus':'Device fault'}</option>`).join('')}</select></div>`).join('')}</div><h3>Zone-test scenario presets</h3><p>These FINDR controls preset a fictional test state. To learn the panel menu sequence, start Walk test with SHOW HINTS.</p><div class="gent-inline">${v.zones.map(z=>button('zone-test',`${esc(z.label||z.id)}: ${z.test?'finish test':'demonstrate test'}`,'secondary gent-compact',`data-zone="${esc(z.id)}" data-value="${z.test?'off':'on'}"`)).join('')}${button('tick','Advance simulated time 5 seconds','subtle gent-compact')}</div><p class="gent-note">Zone tests stop when you leave or reload this trainer. Real panel procedures still require an explicit end-of-test check.</p></details>`;
  }

  function panel() {
    const v=view(),hint=nextHint(),message=v.screen?.message||state.lastAction?.message||lastNotice;
    return `${!run&&!routeRun?walkTestFeature():''}${helpBar('gent')}<div class="gent-workspace"><div class="gent-console-column"><div class="gent-panel-toolbar"><small>${v.status.accessLevel>=2?(v.status.authenticatedLevel===3?'Demo door open · Engineering practice access':'Demo door open · Operator controls'):'Demo door closed · View only'} · ${v.status.normal?'Panel normal':'Check active indications'}</small><div class="gent-inline">${button('zoom',panelZoom==='fit'?'Larger keys':'Fit whole panel','secondary gent-compact gent-panel-zoom')}${button('door',v.status.accessLevel>=2?'Close demo door':'Open demo door','secondary gent-compact')}</div></div>${(run&&!run.done||routeRun&&!routeRun.done)?`<div class="gent-next-key" id="gent-next-cue"><span>${hints&&hint.key?'Next key':hints?'Next step':'Try it yourself'}<br><small>${esc(hint.recovery?'Return to the lesson screen':currentStep()?.title||titleOf(nodeFor(routeRun?.targetId)))}</small></span>${hints&&hint.key?`<kbd>${esc(keyLabels[hint.key]||hint.key)}</kbd>`:hints?'<span>Read the coach</span>':button('hints','SHOW HINTS','secondary gent-compact')}</div>`:''}${run&&!run.done&&currentStep()?`<section class="gent-mobile-step" aria-label="Current lesson step"><p>${esc(currentStep().explanation)}</p><p><strong>Look for:</strong> ${esc(currentStep().expected)}</p>${currentStep().action?button('lesson-action',lessonActionLabel(currentStep().action),'primary gent-compact'):''}${hint.openDoor?button('door','Open demo door','primary gent-compact'):''}</section>`:''}<div class="gent-panel-scroll" tabindex="0" aria-label="Panel controls; scroll sideways on smaller screens"><div class="gent-panel-stage">${gentPanelFace(v,{hintKey:hints?hint.key:null})}</div></div><p class="gent-panel-caption">Panel layout based on the operating manual, p7. <strong>On a phone, choose Larger keys to zoom in, then slide sideways to reach every control.</strong> The yellow highlight follows the next key.</p>${panelStatus(v)}<section class="gent-card"><div class="gent-step-count"><span>WHAT THE PANEL IS DOING</span></div><h3>${esc(v.screen?.heading||'Panel status')}</h3>${message?`<p role="status">${esc(message)}</p>`:''}<p>${esc(v.note||'Use Menu On/Off to open the operator menus.')}</p><p class="gent-note"><strong>Panel buzzer:</strong> ${v.status.buzzer?'sounding':'quiet'} · <strong>Alarm sounders:</strong> ${v.status.sounders?'running':'quiet'}. These are simulated output states; lesson sounds are optional feedback.</p>${v.screen?.field?`<p class="gent-callout"><strong>${esc(v.screen.field.label)}:</strong> ${esc(v.screen.field.displayValue??v.screen.field.value)}<br>Use the physical keys to enter or change the value.</p>`:''}<small>${(v.breadcrumb||[]).map(n=>esc(titleOf(n))).join(' › ')}</small>${refs(v.references)}</section>${simulator(v)}<details class="gent-card"><summary>Fictional event history</summary><ul class="gent-event-list">${v.events.slice(0,35).map(event=>`<li>${esc(event.message||event.label||event.type)}<small>${esc(event.time||event.timestamp||'')} ${esc(event.device||event.zone||'')}</small></li>`).join('')||'<li>No events recorded.</li>'}</ul></details></div><aside class="gent-side-column">${coach(v)}<section class="gent-card"><h3>Need the meaning behind a menu?</h3><p>Search common panel phrases, check indications or read why a sequence works.</p><div class="gent-inline"><a class="secondary gent-compact" href="#gent/help">Help centre →</a><a class="secondary gent-compact" href="#gent/map">Menu map →</a></div><p class="gent-note">For a real fire or suspected fire, follow the site emergency procedure. FINDR is an offline practice panel and has no connection to equipment.</p></section></aside></div>`;
  }

  function walkTestFeature() {
    if(!lessonsData.lessons.some(lesson=>lesson.id==='gent-walk-test'))return '';
    return `<section class="gent-card gent-walk-card" aria-label="Walk test with hints"><div><div class="eyebrow">WALK TEST / ZONE TEST</div><h2>Put a zone in test. Learn every press.</h2><p>Follow the highlighted keys to start Zone Test, try a fictional detector and finish with the zone back in normal operation.</p><p class="gent-note">GENT Vigilon EN 4/6-loop · V4.53+ menu diagram. Uses a fictional FINDR engineering code.</p></div><div class="gent-walk-actions">${button('start-lesson','SHOW HINTS','primary', 'data-id="gent-walk-test"')}${button('start-lesson','Finish walk test','secondary','data-id="gent-end-walk-test"')}<a href="#gent/help/zone-test-behaviour">How Zone Test works →</a></div></section>`;
  }

  function lessonCard(lesson) {
    return `<article class="gent-lesson-card ${completed[lesson.id]?'complete':''}"><span class="gent-lesson-meta">${lesson.steps.length} steps · about ${lesson.durationMinutes||5} min ${completed[lesson.id]?'<span class="gent-done-marker">✓ Completed</span>':''}</span><h3>${esc(lesson.title)}</h3><p>${esc(lesson.summary)}</p><div class="gent-inline">${button('start-lesson','SHOW HINTS','primary',`data-id="${esc(lesson.id)}"`)}${button('challenge','Without hints','secondary',`data-id="${esc(lesson.id)}"`)}</div></article>`;
  }

  function lessonResults() {
    const matches=gentSearch(lessonsData.lessons,lessonQuery);
    return `<p class="gent-note" role="status">${matches.length} matching lessons</p>${lessonsData.tracks.map((track,i)=>{
      const lessons=matches.filter(lesson=>lesson.trackId===track.id);if(!lessons.length)return '';
      return `<section class="gent-track"><div class="gent-track-heading"><span class="gent-track-number">${String(i+1).padStart(2,'0')}</span><div><h2>${esc(track.title)}</h2><p>${esc(track.description)}</p></div></div><div class="gent-lesson-grid">${lessons.map(lessonCard).join('')}</div></section>`;
    }).join('')}${matches.length?'':'<div class="gent-empty">No lesson matches yet. Try walk test, reset, disable sensing or another short phrase.</div>'}`;
  }

  function matchingWalkLessons(query) {
    if(!query.trim())return '';
    const matches=gentSearch(lessonsData.lessons.filter(lesson=>['gent-walk-test','gent-end-walk-test'].includes(lesson.id)),query);
    return matches.length?`<section class="gent-card"><h3>Practise with SHOW HINTS</h3><div class="gent-inline" style="margin-top:14px">${matches.map(lesson=>button('start-lesson',esc(lesson.title)+' · SHOW HINTS','primary gent-compact',`data-id="${esc(lesson.id)}"`)).join('')}</div></section>`:'';
  }

  function learn() {
    const count=lessonsData.lessons.filter(lesson=>completed[lesson.id]).length;
    return `<div class="gent-learn-intro"><div><h2>From first look to confident operation.</h2><p>Each lesson explains the reason, guides your next press and checks the result. Choose a task or search the words you use on site.</p><p class="gent-note">Times are practice estimates. Progress is saved on this device.</p></div><div class="gent-learning-progress"><strong>${count} / ${lessonsData.lessons.length}</strong>lessons completed</div></div>${walkTestFeature()}<label class="sr-only" for="gent-lesson-query">Search GENT lessons</label><input id="gent-lesson-query" class="gent-search" type="search" data-gent-search="learn" value="${esc(lessonQuery)}" placeholder="Try walk test, zone test, reset or disable sensing…"><div id="gent-lesson-results">${lessonResults()}</div>`;
  }

  function blocks(body) {
    return asArray(body).map(block=>typeof block==='string'?block.split(/\n\n/).map(p=>`<p>${esc(p)}</p>`).join(''):`${block.heading?`<h3>${esc(block.heading)}</h3>`:''}${block.text?`<p>${esc(block.text)}</p>`:''}${block.items?`<ul>${block.items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:''}`).join('');
  }

  function help() {
    const article=lessonsData.helpArticles.find(a=>a.id===detail);
    if(article)return `<article class="gent-article"><a class="back" href="#gent/help">← Help centre</a><div class="gent-lesson-meta" style="margin-top:18px">${esc(article.category)}</div><h2>${esc(article.title)}</h2><p class="gent-summary">${esc(article.summary)}</p>${blocks(article.body)}${article.commonMistake?`<div class="gent-callout"><strong>Watch for this:</strong> ${esc(article.commonMistake)}</div>`:''}${refs(article.sourceRefs)}${article.relatedLessonIds?.length?`<section class="gent-card" style="margin-top:25px"><h3>Practise it on the panel</h3><div class="gent-inline">${article.relatedLessonIds.map(id=>{const l=lessonsData.lessons.find(l=>l.id===id);return l?button('start-lesson','SHOW HINTS · '+esc(l.title),'secondary gent-compact',`data-id="${esc(id)}"`):'';}).join('')}</div></section>`:''}</article>`;
    const categories=[...new Set(lessonsData.helpArticles.map(a=>a.category))];
    return `<div><h2>Understand the panel’s language.</h2><p style="margin-top:14px">Search a display phrase, a control or a question. Every topic keeps its model scope and source pages.</p><label class="sr-only" for="gent-help-query">Search GENT help</label><input id="gent-help-query" class="gent-search" type="search" data-gent-search="help" value="${esc(helpQuery)}" placeholder="Try walk test, zone test, reset, buzzer…"><div class="gent-help-layout"><nav class="gent-help-nav" aria-label="Help topics">${['',...categories,'Glossary'].map(c=>button('help-category',esc(c||'All topics'),helpCategory===c?'active':'',`data-value="${esc(c)}"`)).join('')}</nav><div id="gent-help-results">${helpResults()}</div></div></div>`;
  }

  function helpResults() {
    const articles=gentSearch(lessonsData.helpArticles.filter(a=>!helpCategory||a.category===helpCategory),helpQuery);
    const glossary=gentSearch(lessonsData.glossary||[],helpQuery);
    if(helpCategory==='Glossary')return `<dl class="gent-glossary">${glossary.map(item=>`<div><dt>${esc(item.term)}</dt><dd>${esc(item.definition)}${refs(item.sourceRefs)}</dd></div>`).join('')}</dl>`;
    return `${matchingWalkLessons(helpQuery)}<p class="gent-note" role="status">${articles.length} matching help topics</p><div class="gent-help-grid">${articles.map(article=>`<article class="gent-help-card"><span class="gent-lesson-meta">${esc(article.category)}</span><h3>${esc(article.title)}</h3><p>${esc(article.summary)}</p><a href="#gent/help/${encodeURIComponent(article.id)}">Read explanation →</a></article>`).join('')}</div>${!articles.length?'<div class="gent-empty">No saved explanation matches. Try a shorter phrase, or check Sources & scope for unresolved details.</div>':''}${!helpCategory&&helpQuery&&glossary.length?`<h3 style="margin:24px 0 12px">Matching terms</h3><dl class="gent-glossary">${glossary.map(item=>`<div><dt>${esc(item.term)}</dt><dd>${esc(item.definition)}</dd></div>`).join('')}</dl>`:''}`;
  }

  function mapItems() {
    const nodes=getNodes(data),used=new Set();
    const references=asArray(data.menuReference).map(ref=>{const node=nodes.find(n=>n.id===(ref.nodeId||ref.emulatorNodeId||ref.id));if(node)used.add(node.id);return {...ref,emulatorNodeId:node?.id,title:ref.title||ref.label||ref.route?.at(-1)||ref.id};});
    return [...nodes.filter(n=>!used.has(n.id)).map(n=>({...n,emulatorNodeId:n.id,status:n.status||((n.confidence==='reference'||n.confidence==='conflict'||n.kind==='reference'||n.referenceOnly)?'reference':'implemented')})),...references];
  }

  function menuMap() {
    const nodes=getNodes(data);
    return `<div class="gent-learn-intro"><div><h2>Follow the wording on the display.</h2><p>Browse the documented hierarchy and working operator routes. Reference entries show additional menus without claiming a verified physical-key sequence.</p></div><div class="gent-learning-progress"><strong>${nodes.length}</strong>mapped panel screens</div></div><label class="sr-only" for="gent-map-query">Search GENT menus</label><input id="gent-map-query" class="gent-search" type="search" data-gent-search="map" value="${esc(mapQuery)}" placeholder="Search a menu or task, e.g. walk test, sensing, historic…"><div id="gent-map-results">${mapResults()}</div>`;
  }

  function mapResults() {
    const items=gentSearch(mapItems(),mapQuery);
    return `${matchingWalkLessons(mapQuery)}<p class="gent-note" role="status">${items.length} matching entries · select SHOW HINTS to press the navigation route yourself</p><div class="gent-map-results">${items.slice(0,mapLimit).map(item=>{
      const node=item.emulatorNodeId?nodeFor(item.emulatorNodeId):null;
      const routable=node&&!node.referenceOnly&&node.kind!=='reference'&&(!['reference','conditional','conflict'].includes(item.status));
      return `<article class="gent-map-node">${item.status&&item.status!=='implemented'?`<span class="gent-reference-tag">${esc(item.status==='conflict'?'Source conflict':item.status==='conditional'?'Conditional reference':'Reference only')}</span>`:''}<div class="gent-map-path">${esc(asArray(item.route||item.path).join(' › '))}${item.accessLevel?' · Access '+esc(item.accessLevel):''}</div><h3>${esc(titleOf(item))}</h3><p>${esc(item.note||item.description||item.summary||'Open the source pages for the model-specific details.')}</p>${refs(item.sourceRefs)}${routable?`<div class="gent-inline">${button('open-node','Open on panel','secondary',`data-id="${esc(node.id)}"`)}${button('hint-node','SHOW HINTS','primary',`data-id="${esc(node.id)}"`)}</div>`:''}</article>`;
    }).join('')}</div>${items.length>mapLimit?`<div style="margin-top:20px">${button('more-map','Show more entries','secondary')}</div>`:''}${items.length?'':'<div class="gent-empty">No documented match. Try the exact display wording or a shorter phrase.</div>'}`;
  }

  function sources() {
    const scope=data.modelScope||{};
    const gaps=asArray(data.knownLimits||data.sourceGaps||data.gaps||lessonsData.sourceGaps);
    return `<article class="gent-article"><h2>Exact model. Visible limits.</h2><p class="gent-summary">This is a manual-based training model of the GENT Vigilon 4/6-loop control panel with 2 km loop cards, using the July 2015 operating instructions.</p><p>The fictional site has two fitted loops and three zones. Panel states and addresses belong to FINDR. Compact, Plus, voice-alarm variants and other firmware can have different controls and menus.</p>${blocks(scope.limits||scope.limitations)}<div class="gent-callout">Manufacturer-document research supports this trainer. It has not been validated against a physical panel, and FINDR is not affiliated with or endorsed by GENT or Honeywell.</div><h3>Sources</h3>${(data.sources||[]).map(source=>`<section class="gent-source"><h3>${esc(source.title)}</h3><p>${esc(source.edition||source.date||'')} ${esc(source.scope||source.note||'')}</p><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">Open original manufacturer document ↗</a>${source.sha256?`<p class="gent-note">Pinned file SHA-256<br><code>${esc(source.sha256)}</code></p>`:''}</section>`).join('')}<h3>What still needs checking</h3><p>The entries below stay explicit so a missing detail cannot become an invented button sequence. To resolve one, record the exact model, software version, preceding screen and the key you pressed.</p>${gaps.map(gap=>`<section class="gent-source"><h3>${esc(gap.title||gap.id||'Source limit')}</h3><p>${esc(typeof gap==='string'?gap:gap.description||gap.explanation||gap.note||gap.detail||textOf(gap))}</p>${refs(gap.sourceRefs)}</section>`).join('')}<a class="secondary" href="./data/gent-vigilon.json" download="FINDR-GENT-Vigilon-reference.json">Download menu reference data ↓</a></article>`;
  }

  function draw() {
    if(!visible||!model)return;
    pausePanelTimer();
    const scroll=app.querySelector('.gent-panel-scroll')?.scrollLeft||0;
    const openSim=app.querySelector('.gent-sim')?.open;
    const focused=document.activeElement?.dataset?.key;
    app.innerHTML=`<section class="gent-root" data-gent-root>${heading()}${section==='learn'?learn():section==='help'?help():section==='map'?menuMap():section==='sources'?sources():panel()}</section>`;
    const scroller=app.querySelector('.gent-panel-scroll');
    fitPanel();
    if(scroller){scroller.scrollLeft=panelZoom==='fit'?0:scroll;const hinted=scroller.querySelector('.gent-key.gent-hint-key');if(hinted&&panelZoom!=='fit'){const box=hinted.getBoundingClientRect(),bounds=scroller.getBoundingClientRect();if(box.left<bounds.left+10||box.right>bounds.right-10)scroller.scrollLeft+=box.left-bounds.left-bounds.width/2+box.width/2;}}
    if(openSim&&app.querySelector('.gent-sim'))app.querySelector('.gent-sim').open=true;
    if(focused){const key=[...app.querySelectorAll('[data-gent-action="key"]')].find(el=>el.dataset.key===focused);key?.focus({preventScroll:true});}
    scheduleDisplayTest();
  }

  function fitPanel() {
    const scroller=app.querySelector('.gent-panel-scroll'),stage=app.querySelector('.gent-panel-stage'),face=app.querySelector('.gent-face');
    if(!scroller||!stage||!face)return;
    face.style.position='relative';face.style.transform='none';stage.style.height='';scroller.style.overflowX='auto';
    const available=stage.clientWidth,naturalWidth=face.offsetWidth;
    if(panelZoom==='fit'&&available>0&&available<naturalWidth){
      const ratio=available/naturalWidth,height=face.offsetHeight;
      face.style.position='absolute';face.style.transformOrigin='top left';face.style.transform=`scale(${ratio})`;stage.style.height=`${height*ratio}px`;scroller.style.overflowX='hidden';
    }
  }

  function scheduleDisplayTest() {
    const pauseZoneTests=run&&!run.done&&currentLesson()?.manualTestTime;
    const cycles=pauseZoneTests?[]:Object.values(state?.testCycles||{}).map(cycle=>cycle.remainingMs);
    const remaining=Math.min(...[state?.displayTestRemainingMs,...cycles].filter(value=>Number.isFinite(value)&&value>0));
    if(visible&&!document.hidden&&Number.isFinite(remaining)){
      timerStartedAt=Date.now();
      displayTimer=setTimeout(()=>{
        if(!visible)return;pausePanelTimer();save();draw();
      },remaining);
    }
  }

  function pausePanelTimer() {
    clearTimeout(displayTimer);displayTimer=null;
    const started=timerStartedAt;timerStartedAt=null;
    if(started!==null&&state){const elapsed=Math.max(0,Date.now()-started);if(elapsed)state=tickGent(model,state,elapsed,{pauseZoneTests:!!(run&&!run.done&&currentLesson()?.manualTestTime)});}
  }

  function navigatePanel() {
    section='panel';detail='';
    if(location.hash!=='#gent')location.hash='#gent';else draw();
  }

  function cancelRun(){pausePanelTimer();run=null;routeRun=null;completedNow=false;feedback.cancel();}

  function startLesson(id,showHints=true) {
    const lesson=lessonsData.lessons.find(l=>l.id===id);if(!lesson)return;
    cancelRun();state=loadGentScenario(model,state,typeof lesson.scenario==='string'?lesson.scenario:lesson.scenario?.id||'normal');
    state=setGentAccess(model,state,2);hints=showHints;run={id:uid(),lessonId:id,index:0,done:false};
    feedback.start(run.id);save();navigatePanel();
  }

  function advance(before, actionType) {
    const lesson=currentLesson(),step=currentStep();
    if(run&&!run.done&&step){
      const conditions=asArray(step.conditions);
      const hasEvent=conditions.some(c=>c.type==='event');
      const freshEvent=!hasEvent || state.lastEvent?.sequence!==before?.lastEvent?.sequence;
      const actionAllowed=step.action ? actionType==='lesson-action' : actionType==='key' && state.lastAction?.ok!==false;
      if(actionAllowed&&freshEvent&&evaluateGentConditions(model,state,conditions)){
        run.index++;feedback.step({runId:run.id,completed:run.index,total:lesson.steps.length});
        if(run.index>=lesson.steps.length){
          if(evaluateGentConditions(model,state,lesson.completionConditions||[])){
            run.done=true;completed[lesson.id]={at:new Date().toISOString(),withHints:hints};completedNow=true;feedback.complete({runId:run.id});
          }else{run.index=lesson.steps.length-1;lastNotice='The final panel state still needs attention. '+(lesson.restoreInstruction||'Check the active indications.');toast?.(lastNotice);}
        }
      }
    }
    if(routeRun&&!routeRun.done){
      const v=view(),remaining=findGentRoute(model,state,routeRun.targetId);
      if(v.nodeId===routeRun.targetId){routeRun.done=true;feedback.complete({runId:routeRun.id});}
      else if(remaining.found&&remaining.keys.length<routeRun.bestRemaining){routeRun.bestRemaining=remaining.keys.length;routeRun.progress++;feedback.step({runId:routeRun.id,completed:routeRun.progress,total:routeRun.total});}
    }
  }

  function mutate(reducer,actionType='key') {
    pausePanelTimer();
    const before=state;state=reducer(state);advance(before,actionType);save();draw();
  }

  function routeTo(id,guided) {
    cancelRun();state=setGentAccess(model,state,2);
    const route=findGentRoute(model,state,id);
    if(!route.found){toast?.(route.reason||'A verified key route is not available for this entry.');return;}
    if(guided){hints=true;routeRun={id:uid(),targetId:id,total:route.keys.length,bestRemaining:route.keys.length,progress:0,done:route.keys.length===0};feedback.start(routeRun.id);}
    else for(const key of route.keys)state=pressGentKey(model,state,key);
    save();navigatePanel();
  }

  async function render(nextSection,nextDetail) {
    const stamp=++token;visible=true;section=['learn','help','map','sources'].includes(nextSection)?nextSection:'panel';detail=nextDetail?decodeURIComponent(nextDetail):'';
    if(!model)app.innerHTML='<div class="loading">Opening the GENT fire panel trainer…</div>';
    try{await load();if(stamp!==token||!visible||!location.hash.startsWith('#gent'))return;if(nextSection==='guided'){routeTo(detail,true);return;}if(nextSection==='coach'&&lessonsData.lessons.some(l=>l.id===detail)){startLesson(detail,true);return;}draw();}catch(error){if(stamp===token)app.innerHTML=`<div class="gent-empty"><h2>GENT could not load.</h2><p>${esc(error.message)}</p>${button('retry','Try again')}</div>`;}
  }

  app.addEventListener('findr:request-hints',event=>{if(!visible||section!=='panel'||!(run||routeRun)||event.detail?.engineId!=='gent-vigilon')return;event.preventDefault();hints=true;save();draw();app.querySelector('.gent-coach')?.scrollIntoView?.({block:'nearest'});});

  app.addEventListener('click',event=>{
    const target=event.target.closest('[data-gent-action]');if(!visible||!target||target.disabled)return;
    const action=target.dataset.gentAction,id=target.dataset.id;
    if(action==='retry'){render(section,detail);return;}
    if(!model)return;
    feedback.unlock();
    if(action==='zoom'){panelZoom=panelZoom==='fit'?'large':'fit';draw();return;}
    if(action==='key'){mutate(s=>pressGentKey(model,s,target.dataset.key));return;}
    if(action==='door'){mutate(s=>setGentAccess(model,s,view().status.accessLevel>=2?1:2),'trainer');return;}
    if(action==='start-lesson'||action==='challenge'){startLesson(id,action==='start-lesson');return;}
    if(action==='restart-lesson'){if(run)startLesson(run.lessonId,hints);return;}
    if(action==='stop-lesson'){cancelRun();save();draw();return;}
    if(action==='hints'){hints=!hints;save();draw();return;}
    if(action==='sound'){feedback.setEnabled(!feedback.isEnabled());if(feedback.isEnabled())feedback.unlock();db.setSetting(soundKey,feedback.isEnabled()).catch(()=>{});draw();return;}
    if(action==='lesson-action'){
      const step=currentStep(),a=step?.action;if(!a)return;
      if(a.type==='set-input')mutate(s=>setGentDeviceInput(model,s,a.device,a.value),'lesson-action');
      else if(a.type==='set-fault')mutate(s=>setGentFault(model,s,a.fault,a.value),'lesson-action');
      else if(a.type==='advance-time')mutate(s=>tickGent(model,s,Math.min(60000,Math.max(0,Number(a.milliseconds)||5000))),'lesson-action');
      else if(a.type==='acknowledge')mutate(s=>s,'lesson-action');
      return;
    }
    if(action==='scenario'||action==='normal'){cancelRun();state=loadGentScenario(model,state,action==='normal'?'normal':scenarioChoice);state=setGentAccess(model,state,2);save();draw();return;}
    if(action==='zone-test'){mutate(s=>setGentZoneTest(model,s,target.dataset.zone,target.dataset.value==='on'),'trainer');return;}
    if(action==='tick'){mutate(s=>tickGent(model,s,5000),'trainer');return;}
    if(action==='help-category'){helpCategory=target.dataset.value||'';draw();return;}
    if(action==='more-map'){mapLimit+=30;const el=app.querySelector('#gent-map-results');if(el)el.innerHTML=mapResults();return;}
    if(action==='open-node'||action==='hint-node'){routeTo(id,action==='hint-node');return;}
  });

  app.addEventListener('input',event=>{
    if(!visible||!model)return;const kind=event.target.dataset.gentSearch;
    if(kind==='learn'){lessonQuery=event.target.value;app.querySelector('#gent-lesson-results').innerHTML=lessonResults();}
    if(kind==='help'){helpQuery=event.target.value;app.querySelector('#gent-help-results').innerHTML=helpResults();}
    if(kind==='map'){mapQuery=event.target.value;mapLimit=30;app.querySelector('#gent-map-results').innerHTML=mapResults();}
  });
  app.addEventListener('change',event=>{
    if(!visible||!model)return;
    if(event.target.hasAttribute('data-gent-scenario'))scenarioChoice=event.target.value;
    if(event.target.hasAttribute('data-gent-input'))mutate(s=>setGentDeviceInput(model,s,event.target.dataset.gentInput,event.target.value),'trainer');
  });
  document.addEventListener('keydown',event=>{if(document.querySelector('.onsite-dialog[open]'))return;
    if(!visible||section!=='panel'||!model||event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey||event.repeat)return;
    if(event.target.closest('input,textarea,select,[contenteditable="true"],dialog')||event.target.matches('button,a'))return;
    const key=({Escape:'MENU_ON_OFF',Enter:'ENTER',Backspace:'DELETE',Delete:'DELETE',ArrowUp:'PREVIOUS',ArrowDown:'NEXT',ArrowLeft:'LEFT',ArrowRight:'RIGHT',' ':'SPACE'})[event.key]||(/^F[1-4]$/.test(event.key)?event.key:/^[a-z0-9]$/i.test(event.key)?event.key.toUpperCase():null);
    if(!key)return;event.preventDefault();feedback.unlock();mutate(s=>pressGentKey(model,s,key));
  });
  globalThis.addEventListener?.('resize',()=>{if(visible&&section==='panel')fitPanel();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){feedback.pause();pausePanelTimer();save();}else if(visible)draw();});

  function leave() {
    if(!visible)return;visible=false;token++;cancelRun();if(state){state=leaveGent(model,state);save();}
  }
  async function flush(){if(state)await save();await saveChain;}
  return {render,leave,flush};
}
