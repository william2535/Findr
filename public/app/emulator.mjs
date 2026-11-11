import {helpBar} from './onsite.mjs';
import {
  buildEmulatorModel, createEmulatorState, pressEmulatorKey, openEmulatorNode,
  setEmulatorZone, setEmulatorRoot, restoreEmulatorState, emulatorView,
  setEmulatorText, applyEmulatorEdit, leaveEmulator as pauseEmulator,
} from './emulator-engine.mjs';
import {keypadFace, lookFor, practiceKeyboardKey} from './practice.mjs';
import {prepareMenuMap, searchMenuMaps, menuBreadcrumbs} from './menu-map-engine.mjs';
import {startHints, advanceHints} from './emulator-hints.mjs';
import {createHintFeedback} from './emulator-feedback.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storageKey = 'keypad-emulator-state-v1';
const soundStorageKey = 'keypad-hint-sound-v1';
const layoutStorageKey = 'emulator-library-layout-v1';
const href = (profile = '', node = '') => '#emulator' + (profile ? '/' + encodeURIComponent(profile) : '') + (node ? '/' + encodeURIComponent(node) : '');
const plain = value => Array.isArray(value) ? value.map(plain).join(' · ') : value && typeof value === 'object' ? value.label ?? value.name ?? value.title ?? '' : String(value ?? '');
const shortTitle = profile => ({'galaxy-dimension':'Galaxy Dimension','texecom-premier-elite':'Texecom Premier Elite','scantronic-ion':'Scantronic i-on','orisec-cp':'Orisec CP','menvier-mseries':'Menvier M750 / M800','pyronix-enforcer':'Pyronix Enforcer V11','ade-accenta-optima':'Accenta / Optima G4','risco-lightsys2':'Risco LightSYS2','hkc-quantum70':'HKC Quantum 70'}[profile.id] || profile.title);
const button = (action, label, cls = 'secondary', attrs = '') => `<button type="button" class="${cls}" data-emulator-action="${action}" ${attrs}>${label}</button>`;
const icons = {
  arrow:'M5 12h14m-6-6 6 6-6 6', search:'m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  keypad:'M5 2h14v20H5zM8 6h8v4H8zM8 14h1m3 0h1m3 0h1M8 18h1m3 0h1m3 0h1',
  check:'m5 12 4 4L19 6', reset:'M3 10a9 9 0 1 1 2 8M3 4v6h6',
  book:'M3 4h7l2 2 2-2h7v16h-7l-2 1-2-1H3zM12 6v15',
  sound:'M11 5 6 9H3v6h3l5 4V5m4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  muted:'M11 5 6 9H3v6h3l5 4V5m5 4 5 6m0-6-5 6',
  grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  list:'M3 5h3v3H3zM10 6h11M3 16h3v3H3zM10 17h11',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[name] || icons.keypad}"/></svg>`;
const distinct = values => [...new Set(values.filter(Boolean))];

// The visual face is shared with lessons. Its event namespace is separate:
// pressing an emulator key cannot also advance a guided-practice session.
function emulatorFace(profile, screen, state = {}, miniature = false, view = {}) {
  const names = {enter:profile.enterLabel + ': select or accept as shown on the display', back:profile.backLabel + ': return or finish as shown on the display', change:'No: edit or change the current field', details:profile.id==='texecom-premier-elite'?'Part: contextual function':'Hash: contextual function',star:'Star: contextual function',area:'Area or menu: contextual function',omit:'Omit: contextual omission function','reset-key':'Reset: contextual return function'};
  if(profile.id==='menvier-mseries')names.change='Toggle: change the displayed choice or show log details';
  if(profile.id==='pyronix-enforcer')names.back='NO: next question or return, as shown on the display';
  if(profile.id==='hkc-quantum70')Object.assign(names,{change:'LIGHT / NO: reject or disable the displayed option',back:'PLAY / QUIT: leave this menu',enter:'REC / YES: accept the displayed option'});
  if(profile.id==='risco-lightsys2')Object.assign(names,{enter:'Green Unset / OK: accept the displayed selection',back:'Menu / Back: return to the previous menu'});
  if(profile.id==='ade-accenta-optima')names.back='RESET: return, stop testing or save where indicated on this screen';
  if (['galaxy-picker','orisec-picker'].includes(view.editor?.textMode)) {
    names.enter = profile.enterLabel + ': add the selected character to the text draft';
    names.back = profile.backLabel + (view.editor.textMode === 'galaxy-picker' ? ': save this text edit' : ': discard this unconfirmed helper edit');
    if (view.editor.textMode === 'galaxy-picker') {
      names.star = 'Star: erase the last character';
      names.details = 'Hash: switch character mode';
    }
  }
  const visualProfile={...profile,keys:profile.keys.map(key=>({...key,ariaLabel:names[key.id] || key.ariaLabel}))};
  return keypadFace(visualProfile, screen, state, miniature)
    .replaceAll('data-practice-', 'data-emulator-')
    .replaceAll('outside selected practice routes', 'context-dependent emulator key')
    .replaceAll('outside the selected practice routes', 'context-dependent emulator key')
    .replaceAll('Shown for recognition; outside the selected practice routes', 'Key action depends on the current menu')
    .replaceAll('style practice keypad', 'style emulator keypad');
}

function keypadHint(profile, view) {
  if (view.editor?.textMode === 'galaxy-picker') return 'A / B choose a character · ent adds · * erases · # changes mode · esc saves';
  if (view.editor?.textMode === 'orisec-picker') return '← / → choose a character · Enter adds · Apply text saves the FINDR draft · Back discards it';
  if (view.editor || view.mode === 'fields') return view.screen?.note || '';
  if(profile.id==='menvier-mseries')return '↑ / ↓ scroll · ENT selects · ESC returns · Toggle changes an option';
  if(profile.id==='pyronix-enforcer')return 'NO / B browse questions · YES selects · ◀ / ▶ choose records and values';
  if(profile.id==='ade-accenta-optima')return '▲ moves forward · SET selects · RESET returns · CHIME, OMIT and PROG follow the current screen';
  if(profile.id==='risco-lightsys2')return '↑ / ↓ scroll · green Unset / OK accepts · Menu returns · Full Set / Part Set change supported options';
  if(profile.id==='hkc-quantum70')return '* / # scroll · REC / YES accepts · LIGHT / NO changes · PLAY / QUIT returns';
  return profile.id === 'galaxy-dimension' ? 'A / B scroll · ent selects · esc goes back' : profile.id === 'texecom-premier-elite' ? '▲ / ▼ scroll · Yes selects · Menu goes back' : profile.id === 'scantronic-ion' ? '▲ / ▼ scroll · ✓ selects · ✕ goes back' : '↑ / ↓ scroll · Enter selects · Back returns';
}

function sourceUrl(source, ref) {
  try {
    const url = new URL(source.url);
    if (!['https:', 'http:'].includes(url.protocol)) return '';
    if (Number.isInteger(ref.pdfPage) && ref.pdfPage > 0) url.hash = 'page=' + ref.pdfPage;
    return url.href;
  } catch { return ''; }
}

function keyboardHelp(profile){
  if(profile.id==='ade-accenta-optima')return 'Focus the keypad. Digits press the numbered keys; Arrow Up presses the single ▲ key. Enter is SET, Escape is RESET, C is CHIME, O is OMIT and P is PROG. This keypad has no down-arrow or backspace button.';
  if(profile.id==='risco-lightsys2')return 'Focus the keypad. Digits press the numbered keys; Up / Down scroll. Enter presses green Unset / OK, Escape presses Menu, A presses Full Set and P presses Part Set. Actions depend on the displayed menu.';
  if(profile.id==='hkc-quantum70')return 'Focus the keypad. Digits press the numbered keys; * and # move backwards and forwards. Enter or Y presses REC / YES, Escape or Q presses PLAY / QUIT, and N presses LIGHT / NO. Up / Down also operate the physical * / # keys.';
  return 'Click or focus the keypad, then use number keys, Enter, Escape and arrow keys. Backspace deletes from the current entry; * and # use the matching physical key where available. Each function key follows its current menu context.';
}

export function createEmulatorController({app, profiles, db, toast}) {
  const models = new Map(), pendingModels = new Map(), sessions = new Map();
  const queries = new Map(), demoZones = new Map(), expanded = new Map();
  let visibleProfile = null, renderToken = 0, restored = {}, savedLoad;
  let saveQueue = Promise.resolve(), storageUnavailable = false, storageNotified = false;
  let resetPrompt = false;
  let hint = null, hintTargetId = '', hintRunId = 0, hintCelebrating = false, hintCelebrationTimer;
  let soundPreferenceChanged = false;
  let landingLayout = 'grid', layoutLoad, layoutChanged = false, layoutSaveQueue = Promise.resolve();
  const hintFeedback = createHintFeedback({enabled:true});

  const profileById = id => profiles.find(profile => profile.id === id);
  const currentModel = () => models.get(visibleProfile);
  const isVisible = () => Boolean(app.querySelector('[data-emulator-root]')) && location.hash.startsWith('#emulator');

  function syncLayout() {
    const library = app.querySelector('[data-emulator-layout]');
    if (!library) return;
    library.dataset.emulatorLayout = landingLayout;
    for (const choice of library.querySelectorAll('[data-emulator-layout-choice]')) choice.setAttribute('aria-pressed',String(choice.dataset.emulatorLayoutChoice === landingLayout));
  }

  function loadLayout() {
    if (!layoutLoad) layoutLoad = Promise.resolve().then(async () => {
      try {
        const saved = await db?.setting?.(layoutStorageKey);
        if (!layoutChanged && ['grid','list'].includes(saved)) {landingLayout = saved;syncLayout();}
      } catch { /* A display preference cannot block or overwrite trainer progress. */ }
    });
    return layoutLoad;
  }

  function setLayout(value) {
    if (!['grid','list'].includes(value)) return;
    layoutChanged = true;landingLayout = value;syncLayout();
    layoutSaveQueue = layoutSaveQueue.then(() => db?.setSetting?.(layoutStorageKey,value)).catch(() => toast?.('This view works now, but the layout preference could not be saved.'));
  }

  function loadSaved() {
    if (savedLoad) return savedLoad;
    savedLoad = Promise.resolve().then(async () => {
      if (!db?.setting) return;
      try {
        const [saved, sound] = await Promise.all([db.setting(storageKey),db.setting(soundStorageKey)]);
        if (saved?.version === 1 && saved.profiles && typeof saved.profiles === 'object') restored = saved.profiles;
        if (!soundPreferenceChanged && typeof sound === 'boolean') hintFeedback.setEnabled(sound);
      } catch { storageUnavailable = true; }
    });
    return savedLoad;
  }

  async function loadModel(profile) {
    if (models.has(profile.id)) return models.get(profile.id);
    if (!pendingModels.has(profile.id)) {
      pendingModels.set(profile.id, (async () => {
        const response = await fetch(`./data/menu-maps/${encodeURIComponent(profile.id)}.json`);
        if (!response.ok) throw new Error(`The ${shortTitle(profile)} emulator data could not load.`);
        const map = prepareMenuMap(await response.json());
        const model = buildEmulatorModel(map, profile);
        await loadSaved();
        const state = restored[profile.id] ? restoreEmulatorState(model, restored[profile.id]) : createEmulatorState(model);
        models.set(profile.id, model);
        sessions.set(profile.id, state);
        return model;
      })().catch(error => { pendingModels.delete(profile.id); throw error; }));
    }
    return pendingModels.get(profile.id);
  }

  function save() {
    for (const [id, state] of sessions) restored[id] = state;
    const snapshot = JSON.parse(JSON.stringify({version:1, profiles:restored}));
    saveQueue = saveQueue.then(async () => {
      if (!db?.setSetting) return;
      try { await db.setSetting(storageKey, snapshot); }
      catch {
        storageUnavailable = true;
        if (!storageNotified) {
          storageNotified = true;
          toast?.('The emulator works in this tab, but this browser could not save its demo settings.');
        }
      }
    });
  }

  function update(state, focus = 'keypad') {
    if (!visibleProfile) return;
    sessions.set(visibleProfile, state);
    save();
    paint(focus);
  }

  function clearHints() {
    hintFeedback.cancel();
    clearTimeout(hintCelebrationTimer);
    hintCelebrating = false;
    hint = null;
    hintTargetId = '';
  }

  function scrollToKeypad() {
    const target=hint?.status==='active'?app.querySelector('[data-hint-next="true"]'):app.querySelector('.emulator-keypad-stage');
    target?.scrollIntoView({block:hint?.status==='active'?'center':'start',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }

  function startHintRoute(nodeId,recordId,{scroll=true}={}) {
    const model=currentModel();if(!model)return;
    const state=sessions.get(model.id);
    clearHints();
    let result=startHints(model,state,nodeId,{recordId});
    const preferredZone=demoZones.get(model.id);
    if(!recordId&&result.hint.recordScope==='zone'&&preferredZone) result=startHints(model,state,nodeId,{recordId:preferredZone});
    hint=result.hint;
    hintTargetId=nodeId;
    ++hintRunId;
    hintFeedback.start(hintRunId);
    update(result.state,'keypad');
    if(scroll)scrollToKeypad();
  }

  function handleKey(model,state,key,focus='keypad') {
    let justCompleted=false;
    if(hint?.status==='active')void hintFeedback.unlock();
    const next=pressEmulatorKey(model,state,key);
    if(hint?.status==='active') {
      hint=advanceHints(model,hint,state,next,key);
      if(hint.event==='correct') hintFeedback.step({runId:hintRunId,completed:hint.completedSteps,total:hint.totalSteps});
      if(hint.status==='complete') {
        justCompleted=true;
        hintFeedback.complete({runId:hintRunId});
        hintCelebrating=true;
        const runId=hintRunId;
        clearTimeout(hintCelebrationTimer);
        hintCelebrationTimer=setTimeout(()=>{
          if(runId!==hintRunId)return;
          hintCelebrating=false;
          app.querySelector('.emulator-hint-confetti')?.remove();
        },2200);
      }
    }
    update(next,justCompleted?'hint-restart':focus);
    if(justCompleted)app.querySelector('[data-emulator-hint-guide]')?.scrollIntoView({block:'center',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    if(hint?.status==='active') {
      const nextKey=app.querySelector('[data-hint-next="true"]'), bounds=nextKey?.getBoundingClientRect();
      if(bounds&&(bounds.top<15||bounds.bottom>window.innerHeight-20))scrollToKeypad();
    }
  }

  function hintPanel(model,state) {
    if(!hint)return '';
    const active=hint.status==='active', complete=hint.status==='complete', reference=hint.status==='reference';
    const completed=Math.max(0,Number(hint.completedSteps)||0), total=Math.max(completed,Number(hint.totalSteps)||0);
    const pressesTaken=Math.max(0,Number(hint.pressesTaken) || completed);
    const percentage=complete?100:total?Math.min(100,Math.round(completed/total*100)):0;
    const recordScope=hint.recordScope, records=recordScope?(state.records[recordScope]||[]).filter(r=>!hint.recordIds||hint.recordIds.includes(r.id)):[];
    const title=complete?(completed?'You found it!':'This menu is already open'):reference?'Reference reached':active?'Follow the glow':'Hints paused';
    const recordLabel=recordScope==='zone'?'Practise on zone':recordScope?'Practise on '+recordScope:'';
    const confetti=complete&&hintCelebrating?`<div class="emulator-hint-confetti" aria-hidden="true">${Array.from({length:16},(_,i)=>`<i style="--piece:${i};--drift:${(i%2?1:-1)*(35+i*7)}px;--turn:${90+i*31}deg;--fall:${80+(i%5)*22}px"></i>`).join('')}</div>`:'';
    return `<section class="emulator-hint-guide is-${esc(hint.status)}" data-emulator-hint-guide aria-labelledby="emulator-hint-heading">${confetti}<div class="emulator-hint-header"><span class="emulator-overline">${complete?'ROUTE COMPLETE':'SHOW HINTS'}</span>${button('hint-sound',icon(hintFeedback.isEnabled()?'sound':'muted')+(hintFeedback.isEnabled()?'Sound on':'Sound off'),'emulator-hint-sound',`aria-pressed="${hintFeedback.isEnabled()}" aria-label="${hintFeedback.isEnabled()?'Mute hint sounds':'Enable hint sounds'}" data-emulator-focus="hint-sound"`)}</div><div class="emulator-hint-title">${complete?`<span class="emulator-hint-finish" aria-hidden="true">${icon('check')}</span>`:''}<div><h2 id="emulator-hint-heading">${esc(title)}</h2><p class="emulator-hint-target">${esc(hint.targetLabel||model.nodes[hintTargetId]?.label||'Chosen menu')}</p></div></div><div class="emulator-hint-next" id="emulator-hint-next" aria-live="polite" aria-atomic="true">${active?`<span>Press</span><kbd>${esc(hint.nextLabel||hint.nextKey||'the highlighted key')}</kbd><span>on the keypad below</span>`:`<strong>${complete?(completed?'You pressed every step. Try the route again to remember it.':'Choose another option to practise its route.'):reference?'This is a documented reference; its full keypad behaviour is not verified.':'A dependable button sequence is not available for this entry.'}</strong>`}</div>${hint.message?`<p class="emulator-hint-message" role="status">${esc(hint.message)}</p>`:''}${active||complete?`<div class="emulator-hint-progress"><div role="progressbar" aria-label="Keypad route progress" aria-valuemin="0" aria-valuemax="${total||1}" aria-valuenow="${completed}" aria-valuetext="${completed} of ${total} route steps complete"><span style="width:${percentage}%"></span></div><span>${complete?`${pressesTaken} key ${pressesTaken===1?'press':'presses'}`:`${completed} / ${total} route steps`}</span></div>`:''}${recordScope&&records.length&&active?`<label class="emulator-hint-record">${esc(recordLabel)}<select aria-label="${esc(recordLabel)}" data-emulator-hint-record data-emulator-focus="hint-record">${records.map(record=>`<option value="${esc(record.id)}" ${String(record.id)===String(hint.recordId)?'selected':''}>${esc(record.id)} · ${esc(recordScope==='zone'?(state.zoneNames?.[record.id]||record.label):record.label)}</option>`).join('')}</select><small>Changing the record restarts this route.</small></label>`:''}<div class="emulator-hint-actions">${button('hint-restart',icon('reset')+(complete?'Try again':'Restart route'),'emulator-hint-restart','data-emulator-focus="hint-restart"')}${button('hint-stop',complete?'Keep exploring':'Stop hints','emulator-hint-stop','data-emulator-focus="hint-stop"')}</div><p class="emulator-hint-root">Starts at ${esc(hint.rootLabel||'the authorised menu')}. You press each key yourself.</p></section>`;
  }

  function markHintKey() {
    if(hint?.status!=='active'||!hint.nextKey)return;
    const key=[...app.querySelectorAll('[data-emulator-action="key"]')].find(item=>item.dataset.key===hint.nextKey);
    if(!key)return;
    key.classList.add('emulator-hint-key');
    key.setAttribute('data-hint-next','true');
    key.setAttribute('aria-describedby','emulator-hint-next');
    key.setAttribute('aria-label',(key.getAttribute('aria-label')||hint.nextLabel||hint.nextKey)+' — next hinted key');
    const cue=document.createElement('span');cue.className='emulator-hint-key-cue';cue.setAttribute('aria-hidden','true');cue.textContent='PRESS';key.append(cue);
  }

  function profileCard(profile, index) {
    const look = lookFor(profile);
    const screen = {heading:shortTitle(profile), lines:[profile.brand === 'Honeywell' ? 'GALAXY DIMENSION' : profile.brand === 'Texecom' ? 'Premier Elite' : profile.brand === 'Orisec' ? 'Orisec' : profile.id==='menvier-mseries' ? 'MENVIER' : profile.id==='pyronix-enforcer' ? 'PYRONIX ENFORCER' : profile.id==='ade-accenta-optima' ? 'ACCENTA / OPTIMA' : profile.id==='risco-lightsys2' ? 'RISCO LightSYS2' : profile.id==='hkc-quantum70' ? 'HKC QUANTUM 70' : 'EATON', 'Explore the menus']};
    return `<article class="practice-profile practice-tone-${index % 4} emulator-profile-card">
      <a class="practice-profile-visual" href="${href(profile.id)}" aria-label="Open ${esc(shortTitle(profile))} keypad emulator"><span class="practice-visual-caption">${esc(look.short)}</span><div class="practice-mini-holder">${emulatorFace(profile,screen,{},true)}</div><span class="practice-visual-bottom">Tap to use this keypad</span></a>
      <div class="practice-profile-body"><span class="practice-overline">${esc(profile.brand)}</span><h2>${esc(shortTitle(profile))}</h2><p>${esc(look.recognition)}</p><a class="primary" href="${href(profile.id)}">Open emulator ${icon('arrow')}</a></div>
    </article>`;
  }

  function firePanelCard(panel, index) {
    return `<article class="practice-profile practice-tone-${index} emulator-profile-card emulator-fire-card">
      <a class="practice-profile-visual" href="${panel.route}" aria-label="Open ${esc(panel.title)} emulator"><span class="practice-visual-caption">FIRE PANEL</span><img class="practice-profile-photo" src="./panels/${panel.image}" alt="${esc(panel.title)} fire alarm control panel" loading="lazy" decoding="async"><span class="practice-visual-bottom">Tap to use this panel</span></a>
      <div class="practice-profile-body"><span class="practice-overline">${esc(panel.brand)}</span><h2>${esc(panel.title)}</h2><span class="emulator-card-scope">${esc(panel.scope)}</span><p>${esc(panel.description)}</p>${panel.variants?`<div class="emulator-variant-links">${panel.variants.map(variant=>`<a class="primary" href="${variant.route}" aria-label="Open ${esc(panel.title)} ${esc(variant.title)} emulator">${esc(variant.label)}</a>`).join('')}</div>`:`<a class="primary" href="${panel.route}">Open emulator ${icon('arrow')}</a>`}</div>
    </article>`;
  }

  function landing() {
    const firePanels = [
      {brand:'GENT',title:'GENT Nano', route:'#nano', image:'gent-nano.webp', scope:'Single loop · V3.xx', description:'Five-button navigation, a scrolling PIN and 16 zone indicators. Practise operator menus with guided lessons, SHOW HINTS and in-depth help.'},
      {brand:'GENT',title:'GENT Vigilon', route:'#gent', image:'gent-vigilon-4-6-loop.webp', scope:'Classic 4/6 loop · 2 km loop cards', description:'A full keyboard and four soft keys. Learn walk tests, fire and fault handling, disablements and restoration with guided lessons, SHOW HINTS and help.'},
      {brand:'C-TEC',title:'CFP Standard', route:'#fire-panel/c-tec-cfp-standard', image:'c-tec-cfp-standard.webp', scope:'Conventional · 8-zone practice', description:'Explore the accurate Standard fascia, remove its simulated cover and use the documented access-level-3 controls with guided lessons.'},
      {brand:'Kentec',title:'Sigma CP', route:'#fire-panel/kentec-sigma-cp', image:'kentec-sigma-cp.webp', scope:'Conventional · 8-zone practice', description:'Explore the accurate Sigma CP fascia, open the simulated cover for Write Enable and practise documented level-3 settings and everyday call-outs.'},
      {brand:'C-TEC',title:'XFP', route:'#xfp', image:'c-tec-xfp-32-zone.webp', scope:'Addressable · Apollo XP95 practice', variants:[{title:'16-zone plastic',label:'16 zone',route:'#xfp/variant/16'},{title:'32-zone metal',label:'32 zone',route:'#xfp/variant/32'}],description:'Choose the 16-zone plastic or 32-zone metal cabinet. Explore installer level 3, device/zone options and source-linked call-outs; Apollo / Hochiki family manuals remain separately scoped.'},
      {brand:'Fike',title:'TWINFLEXpro²', route:'#twinflex', image:'fike-twinflexpro2.webp', scope:'Two-wire · 8-zone · V3.00+', description:'Practise the real fascia controls, engineer access and Write Enable, with source-backed installer menus, hints and service tasks.'},
      {brand:'Tyco',title:'Minerva MX / MX2', route:'#minerva', image:'tyco-minerva-mx2.webp', scope:'Firmware 5.0 · Issue 5 manual', variants:[{title:'Minerva MX fascia',label:'MX',route:'#minerva/variant/mx'},{title:'Minerva MX2 fascia',label:'MX2',route:'#minerva/variant/mx2'}],description:'Explore the documented MX / MX2 menus, event log, isolations and service options. Find a menu and follow the highlighted next key with HINTS on a fictional training panel.'},
    ];
    app.innerHTML = `<section class="emulator-page emulator-landing" data-emulator-root data-emulator-layout="${landingLayout}">
      <div class="emulator-landing-head"><div><div class="eyebrow">FINDR / EMULATORS</div><h1>Learn the panel.<br><em>Try the controls.</em></h1><p>Choose a fire panel or intruder keypad. Explore the documented menus, operate the controls and practise on a fictional site.</p></div><div class="emulator-intro"><span class="emulator-live-label">FREE PRACTICE + GUIDED HINTS</span><h2>Your own demo panel.</h2><p>Explore freely or follow a guided task. SHOW HINTS highlights the next button, and you press every key yourself.</p></div></div>
      <div class="emulator-library-toolbar"><span>${firePanels.length + profiles.length} panel &amp; keypad families</span><div class="emulator-layout-switch" role="group" aria-label="Emulator library layout">${['grid','list'].map(value=>button('layout',icon(value)+(value==='grid'?'Grid':'List'),'emulator-layout-choice',`data-emulator-layout-choice="${value}" aria-pressed="${landingLayout===value}"`)).join('')}</div></div>
      <section class="emulator-family-section" aria-labelledby="emulator-fire-heading"><div class="emulator-choice-heading"><h2 id="emulator-fire-heading">Fire panels</h2><span>${firePanels.length} panel emulators · Guided lessons &amp; help</span></div><div class="practice-profiles emulator-fire-profiles">${firePanels.map(firePanelCard).join('')}</div></section>
      <section class="emulator-family-section" aria-labelledby="emulator-intruder-heading"><div class="emulator-choice-heading"><h2 id="emulator-intruder-heading">Intruder keypads</h2><span>${profiles.length} panel families · UK focus</span></div><div class="practice-profiles">${profiles.map(profileCard).join('')}</div></section>
      <div class="emulator-guide-row"><section><span>01</span><h3>Choose your panel</h3><p>Check the model and use the practice access shown in its trainer. Each panel has its own menus and controls.</p></section><section><span>02</span><h3>Use the controls</h3><p>Follow SHOW HINTS for the next button or explore without guidance. Read each selection before you confirm or cancel it.</p></section><section><span>03</span><h3>Check the behaviour</h3><p>The current screen shows its source and any unresolved detail. Reference-only entries remain labelled; physical-panel verification is pending.</p></section></div>
      <div class="emulator-other-tools"><div><h2>Want a task to follow?</h2><p>${profiles.reduce((count,profile)=>count+profile.tasks.length,0)} guided intruder exercises are available. Open a fire panel above for its lessons and help.</p></div><div><a class="secondary" href="#practice">Intruder exercises ${icon('arrow')}</a><a class="secondary" href="#menus">Menu reference ${icon('book')}</a></div></div>
      <p class="emulator-footer-note">All readings, events and configuration values are fictional. FINDR does not connect to a panel. The exact model, software and fitted devices can change a real panel’s available menus.</p>
    </section>`;
    void loadLayout();
  }

  function rememberExpanded() {
    if (!visibleProfile) return;
    if (app.querySelector('[data-emulator-profile]')?.dataset.emulatorProfile !== visibleProfile) return;
    const state = {};
    for (const element of app.querySelectorAll('details[data-emulator-details]')) state[element.dataset.emulatorDetails] = element.open;
    expanded.set(visibleProfile, state);
  }

  function opened(id, initial = false) {
    return (expanded.get(visibleProfile)?.[id] ?? initial) ? ' open' : '';
  }

  function focusSnapshot(preferred) {
    const active = document.activeElement;
    const name = preferred || active?.dataset?.emulatorFocus;
    const selection = active?.matches?.('input,textarea') && typeof active.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd] : null;
    return {name, selection};
  }

  function restoreFocus(snapshot) {
    if (!snapshot.name) return;
    const element = [...app.querySelectorAll('[data-emulator-focus]')].find(item => item.dataset.emulatorFocus === snapshot.name);
    element?.focus({preventScroll:true});
    if (snapshot.selection && element?.setSelectionRange) {
      try { element.setSelectionRange(...snapshot.selection); } catch { /* Number/select inputs have no selection. */ }
    }
  }

  function sourceLinks(model, refs) {
    return distinct((refs || []).map(ref => JSON.stringify(ref))).map(encoded => {
      const ref = JSON.parse(encoded), source = model.map.sources.find(item => item.id === ref.sourceId);
      const url = source && sourceUrl(source, ref);
      if (!source || !url) return '';
      return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(source.edition || source.title)}</strong><span>Printed p${esc(ref.printedPage)} · PDF p${esc(ref.pdfPage)} ↗</span></a>`;
    }).join('');
  }

  function evidence(model, view) {
    const node = view.node, sourceNode = model.map._byId.get(node?.sourceNodeId || node?.id);
    const evidence = view.evidence || {};
    const pathIds = new Set((view.path || []).map(item => item.id));
    if (sourceNode) for (const item of menuBreadcrumbs(model.map, sourceNode.id)) pathIds.add(item.id);
    const gaps = model.map.gaps.filter(gap => gap.affectedNodeIds?.some(id => pathIds.has(id)));
    const conditions = distinct(evidence.conditions || sourceNode?.conditions || []);
    const notes = distinct(evidence.notes || sourceNode?.notes || []);
    return `<details class="emulator-detail" data-emulator-details="evidence"${opened('evidence')}><summary>${icon('book')} Sources &amp; accuracy <span>${gaps.length ? gaps.length + ' checks' : 'This screen'}</span></summary><div class="emulator-detail-content"><p class="emulator-baseline">${esc(model.map.baseline)}</p>${sourceNode?.summary ? `<p>${esc(sourceNode.summary)}</p>` : ''}${conditions.length ? `<h3>When this applies</h3><ul>${conditions.map(text => `<li>${esc(text)}</li>`).join('')}</ul>` : ''}${notes.length ? `<h3>Behaviour notes</h3><ul>${notes.map(text => `<li>${esc(text)}</li>`).join('')}</ul>` : ''}<div class="emulator-source-links">${sourceLinks(model, evidence.sourceRefs || sourceNode?.sourceRefs)}</div>${gaps.map(gap => `<section class="emulator-evidence-gap"><strong>${esc(gap.title)}</strong><p>${esc(gap.question)}</p><small>${esc(gap.neededEvidence)}</small></section>`).join('')}<p class="emulator-small">Menus follow the cited edition. Screen spacing and fictional site data are adapted for FINDR; physical-panel verification is pending.</p><a class="emulator-text-link" href="#menus/${encodeURIComponent(model.id)}${sourceNode ? '/' + encodeURIComponent(sourceNode.id) : ''}">Open full source entry →</a></div></details>`;
  }

  function demoAddress(model, view) {
    const profile = model.profile;
    const requested = demoZones.get(model.id);
    if (profile.zones.some(zone => zone.address === requested)) return requested;
    return view.zone?.address || profile.zones[0]?.address;
  }

  function demoPanel(model, state, view) {
    const profile = model.profile, address = demoAddress(model, view);
    const zone = profile.zones.find(item => item.address === address);
    const status = state.zoneStates?.[address] || 'secure';
    const omissions = profile.zones.filter(item => state.omittedZones?.[item.address]);
    const outputSource = view.outputStates || state.outputs || state.bell || {};
    const outputEntries = Object.entries(outputSource).filter(([, value]) => typeof value === 'boolean');
    const outputs = outputEntries.length ? outputEntries : [['Bell',false],['Strobe',false]];
    const walk = Boolean(view.walk?.running || state.walkRunning || state.walk?.running);
    const hits = view.walk?.hits || state.walkHits || state.walk?.hits || [];
    const armed = view.panel?.armed ?? state.armed ?? state.armState ?? state.panel?.armed;
    const armLabel = typeof armed === 'string' ? armed : armed ? (view.panel?.armingMode || 'Set') : 'Unset';
    return `<section class="emulator-demo-panel"><div class="emulator-card-heading"><div><span class="emulator-overline">FICTIONAL SITE</span><h2>Demo panel</h2></div><span class="emulator-state-pill">${esc(armLabel)}</span></div>
      ${zone ? `<label class="emulator-field-label" for="emulator-zone">Detector input<select id="emulator-zone" data-emulator-zone-select data-emulator-focus="zone-select">${profile.zones.map(item => `<option value="${esc(item.address)}" ${item.address === address ? 'selected' : ''}>${esc(item.address)} · ${esc(state.zoneNames?.[item.address] || item.name)}</option>`).join('')}</select></label><div class="emulator-zone-buttons">${[['secure','Secure'],['active','Active'],['tamper','Tamper']].map(([id,label]) => button('zone-state',label,`emulator-zone-button ${status === id ? 'is-selected' : ''}`,`data-state="${id}" data-emulator-focus="zone-${id}" aria-pressed="${status === id}"`)).join('')}</div>${button('pulse-zone','Trigger detector, then restore', 'secondary emulator-pulse', 'data-emulator-focus="pulse"')}<p class="emulator-small">Changes the input seen by this simulated panel, including status and active walk tests.</p>` : ''}
      <div class="emulator-site-summary"><div><span>Omitted zones</span><strong>${omissions.length ? omissions.map(item => esc(item.address)).join(', ') : 'None'}</strong></div><div><span>Walk test</span><strong>${walk ? 'Running · ' + hits.length + ' detected' : 'Stopped'}</strong></div><div><span>Alarm</span><strong class="${view.panel?.alarm ? 'emulator-output-on' : ''}">${view.panel?.alarm ? 'Active in demo' : 'Clear'}</strong></div><div><span>Chime</span><strong>${view.panel?.chime ? 'On' : 'Off'}</strong></div>${outputs.map(([name,on]) => `<div><span>${esc(name)}</span><strong class="${on ? 'emulator-output-on' : ''}">${on ? 'On in demo' : 'Off'}</strong></div>`).join('')}</div>
    </section>`;
  }

  function currentScreen(model, state, view) {
    const root = model.roots.find(item => item.id === state.rootId);
    const path = (view.path || []).filter(item => item.label);
    const node = view.node;
    const label = view.screen?.heading || node?.label || root?.label || 'Menu';
    const mode = view.mode || state.mode;
    const referenceOnly = view.evidence?.status === 'reference-only' || ['info','unsupported','reference'].includes(mode);
    const helper = view.screen?.note || '';
    const sourceId = model.map._byId.has(node?.sourceNodeId || node?.id) ? node.sourceNodeId || node.id : '';
    return `<section class="emulator-current"><div class="emulator-card-heading"><span class="emulator-overline">CURRENT SCREEN</span><span class="emulator-mode-label ${referenceOnly ? 'is-reference' : ''}">${referenceOnly ? 'Reference / evidence gap' : mode === 'menu' ? 'Menu navigation' : mode === 'selector' ? 'Choose a record' : 'Interactive demo'}</span></div><h2>${esc(label)}</h2><div class="emulator-breadcrumb" aria-label="Current keypad menu path">${path.length ? path.map(item => `<span>${esc(item.label)}</span>`).join('<i aria-hidden="true">›</i>') : `<span>${esc(root?.label || '')}</span>`}</div>${helper ? `<p>${esc(helper)}</p>` : ''}${editorValue(view)}${view.editor?.kind === 'text' ? textEditor(model,state,view) : ''}${(view.lastReport || state.lastReport)?.text ? button('show-report','View last demo printout','secondary emulator-pulse','data-emulator-focus="show-report"') : ''}<div class="emulator-current-links"><a href="#practice/${encodeURIComponent(model.id)}">Guided exercises</a><a href="#menus/${encodeURIComponent(model.id)}${sourceId ? '/' + encodeURIComponent(sourceId) : ''}">Menu reference</a></div></section>`;
  }

  function editorValue(view) {
    const editor=view.editor;
    if(!editor){
      if(view.setting)return `<div class="emulator-value"><span>${view.record ? esc(view.record.label || view.record.id)+' · ' : ''}Current value in demo</span><strong>${esc(view.setting.label || plain(view.setting.value)) || '—'}</strong></div>`;
      return view.record ? `<div class="emulator-value"><span>Selected record</span><strong>${esc(view.record.label || view.record.id)}</strong></div>` : '';
    }
    const choice=editor.choices?.[editor.kind==='flags'?editor.cursor:editor.choiceIndex];
    const value=choice ? `${choice.code != null ? choice.code + ' ' : ''}${choice.label}${editor.kind==='flags'?' · '+(editor.draft?.[choice.id]?'On':'Off'):''}` : editor.draft;
    return `<div class="emulator-value"><span>${view.record ? esc(view.record.label || view.record.id) + ' · ' : ''}Unconfirmed ${editor.kind === 'flags' ? 'options' : 'value'}</span><strong>${esc(plain(value)) || '—'}</strong>${Number.isFinite(editor.min) || Number.isFinite(editor.max) ? `<small>Documented range: ${esc(editor.min ?? '—')} to ${esc(editor.max ?? '—')}${editor.units ? ' ' + esc(editor.units) : ''}</small>` : ''}</div>`;
  }

  function textEditor(model,state,view) {
    const editor = view.editor || {};
    const text = editor.draft ?? '';
    const helperCommit = editor.textMode === 'orisec-picker';
    return `<div class="emulator-text-entry"><label class="emulator-field-label" for="emulator-text">FINDR typing helper<input id="emulator-text" type="text" value="${esc(text)}" ${Number.isInteger(editor.maxLength) ? `maxlength="${editor.maxLength}"` : ''} data-emulator-text data-emulator-focus="text-entry" autocomplete="off" spellcheck="false"></label>${helperCommit ? `<div class="emulator-text-actions">${button('apply-text','Apply text','secondary','data-emulator-focus="apply-text"')}<span>FINDR helper</span></div>` : ''}<p class="emulator-small">This helper enters the demo text. ${esc(view.screen?.note || 'Use the key shown on the display to accept or cancel it.')} The typing helper is separate from the physical keypad.</p></div>`;
  }

  function searchPanel(model) {
    const query = queries.get(model.id) || '';
    return `<details class="emulator-detail emulator-search" data-emulator-details="search"${opened('search')}><summary>${icon('search')} Find a menu <span>FINDR helper</span></summary><div class="emulator-detail-content"><p>Find a documented label or number, then place the keypad on that route. You can also reach it using the keypad alone.</p><label class="emulator-field-label" for="emulator-search">Menu name, number or task<input id="emulator-search" type="search" value="${esc(query)}" placeholder="Try “zone type” or “walk test”…" data-emulator-search data-emulator-focus="search" autocomplete="off"></label><div class="emulator-search-phrases">${['omit zone','zone type','walk test','event log'].map(text => button('phrase',esc(text),'emulator-phrase',`data-value="${esc(text)}"`)).join('')}</div><div data-emulator-results></div></div></details>`;
  }

  function historyPanel(model,state,view) {
    const events = Array.isArray(state.events) ? state.events : [];
    const changes = view.changes || Object.entries(state.values || {}).map(([key,value])=>({key,value,label:model.nodes[key]?.label || key}));
    return `<details class="emulator-detail" data-emulator-details="activity"${opened('activity')}><summary>Demo activity <span>${changes.length} stored fields</span></summary><div class="emulator-detail-content"><p>Changes belong to this fictional panel and stay on this device. The panel’s own event-log menus are available on the keypad.</p>${events.length ? `<ol class="emulator-activity-list">${events.slice(0,8).map(event => `<li><strong>${esc(event.label || event.text || event.message || event.description || event.event || 'Demo event')}</strong>${event.zone ? `<span>Zone ${esc(event.zone)}</span>` : ''}${event.time ? `<span>${esc(event.time)}</span>` : ''}</li>`).join('')}</ol>` : '<p class="emulator-small">No new demo events yet. Try a zone input or a simulated menu action.</p>'}${changes.length ? `<details class="emulator-stored-values"><summary>Stored settings</summary><dl>${changes.slice(0,50).map(change => `<div><dt>${esc(change.label || change.key)}${change.record ? '<br>' + esc(plain(change.record)) : ''}</dt><dd>${esc(plain(change.value))}</dd></div>`).join('')}</dl>${changes.length > 50 ? '<p class="emulator-small">The first 50 stored fields are shown here. Open the setting on the keypad to see its current value.</p>' : ''}</details>` : ''}</div></details>`;
  }

  function reportPanel(state,view) {
    const report=view.lastReport || state.lastReport;
    if(!report?.text)return '';
    return `<details class="emulator-detail emulator-report" data-emulator-details="report"${opened('report',true)}><summary>${icon('book')} Demo print preview <span>Local report</span></summary><div class="emulator-detail-content"><h3>${esc(report.title || 'FINDR demo report')}</h3><p>This printout contains the fictional panel’s current data. You can copy it or save it as a text file.</p><label class="emulator-field-label" for="emulator-report-text">Report text<textarea id="emulator-report-text" rows="9" readonly data-emulator-report-text data-emulator-focus="report-text">${esc(report.text)}</textarea></label><div class="emulator-report-actions">${button('copy-report','Copy report','secondary','data-emulator-focus="copy-report"')}${button('download-report','Download .txt','secondary','data-emulator-focus="download-report"')}</div></div></details>`;
  }

  function paint(focus) {
    const model = currentModel(); if (!model || !isVisible()) return;
    rememberExpanded();
    const snapshot = focusSnapshot(focus), state = sessions.get(model.id), view = emulatorView(model,state);
    const profile = model.profile, look = lookFor(profile), root = model.roots.find(item => item.id === state.rootId);
    const screen = view.screen || {heading:'Keypad emulator',lines:['Choose a menu','Press Enter']};
    app.innerHTML = `<section class="emulator-page" data-emulator-root data-emulator-profile="${esc(model.id)}">
      <div class="emulator-topline"><a class="back" href="${href()}">← All emulators</a><span class="emulator-save-state">${storageUnavailable ? 'Demo saved in this tab only' : 'Demo settings remembered on this device'}</span></div>
      <div class="emulator-heading"><div><div class="eyebrow">FREE-USE KEYPAD EMULATOR</div><h1>${esc(shortTitle(profile))}</h1><p>${esc(look.model)} style · ${esc(root?.role || 'Authorised access')} session</p></div><label class="emulator-profile-switch">Keypad<select data-emulator-profile-select data-emulator-focus="profile-select" aria-label="Choose keypad family">${profiles.map(item => `<option value="${esc(item.id)}" ${item.id === profile.id ? 'selected' : ''}>${esc(shortTitle(item))}</option>`).join('')}</select></label></div>
      <div class="emulator-session-bar"><label for="emulator-access">Access menu<select id="emulator-access" data-emulator-root-select data-emulator-focus="root-select">${model.roots.map(item => `<option value="${esc(item.id)}" ${item.id === state.rootId ? 'selected' : ''}>${esc(item.label)}</option>`).join('')}</select></label><div class="emulator-session-copy"><strong>${esc(root?.edition || 'Manual-based menu')}</strong><span>Authorised access is already granted. Values and events are fictional.</span></div>${button('reset-prompt',icon('reset')+' Reset demo','emulator-reset-button','data-emulator-focus="reset"')}</div>
      ${resetPrompt ? `<div class="emulator-reset-confirm" role="alert"><div><strong>Reset this demo panel?</strong><p>This clears this keypad’s fictional settings and events, then starts a fresh session.</p></div><div>${button('confirm-reset','Reset this demo','danger','data-emulator-focus="confirm-reset"')}${button('cancel-reset','Keep my demo','secondary','data-emulator-focus="cancel-reset"')}</div></div>` : ''}
      ${helpBar(model.id,{trainerScope:profile.scope,edition:profile.edition})}<div class="emulator-workspace"><div class="emulator-console"><section class="emulator-keypad-stage ${hint?'has-hints':''}"><div class="emulator-stage-top"><span>${esc(look.short)}</span><span class="emulator-live-label">SIMULATED PANEL</span></div>${hintPanel(model,state)}${emulatorFace(profile,screen,state,false,view)}<div class="emulator-key-hint">${esc(keypadHint(profile,view))}</div><div class="emulator-feedback" role="status" aria-live="polite" aria-atomic="true">${esc(view.feedback || state.feedback || 'Use the keypad to explore. The display changes as you press its keys.')}</div><details class="emulator-keyboard-help" data-emulator-details="keyboard"${opened('keyboard')}><summary>Keyboard controls</summary><p>${esc(keyboardHelp(profile))}</p></details></section>${reportPanel(state,view)}${searchPanel(model)}${historyPanel(model,state,view)}</div><aside class="emulator-sidebar">${currentScreen(model,state,view)}${demoPanel(model,state,view)}${evidence(model,view)}</aside></div>
      <p class="emulator-footer-note">${esc(look.recognition)}. This is a manual-based emulator with a fictional site. It does not connect to alarm hardware. Menus with incomplete key behaviour are identified inside the emulator.</p>
    </section>`;
    renderResults();
    markHintKey();
    restoreFocus(snapshot);
  }

  function renderResults() {
    const model = currentModel(), target = app.querySelector('[data-emulator-results]');
    if (!model || !target) return;
    const query = queries.get(model.id) || '';
    if (!query.trim()) {target.innerHTML='';return;}
    const results = searchMenuMaps([model.map],query,{includeValues:false}).filter(result => model.nodes[result.node.id] && result.node.kind !== 'reference');
    target.innerHTML = `<p class="emulator-result-count" role="status">${results.length} matching ${results.length === 1 ? 'menu or field' : 'menus and fields'}</p>${results.length ? `<div class="emulator-search-results">${results.slice(0,12).map(({node,path}) => `<article class="emulator-search-result"><strong>${node.code != null ? `<span>${esc(node.code)}</span> ` : ''}${esc(node.label)}</strong><small>${esc(path.slice(0,-1).map(item => item.label).join(' › '))}</small><div class="emulator-result-actions">${button('open-node','Open on keypad →','emulator-result-open',`data-node="${esc(node.id)}" data-emulator-focus="result-${esc(node.id)}" aria-label="Open ${esc(node.label)} on keypad"`)}${button('show-hints','SHOW HINTS','emulator-result-hints',`data-node="${esc(node.id)}" data-emulator-focus="hint-${esc(node.id)}" aria-label="SHOW HINTS for ${esc(node.label)}"`)}</div></article>`).join('')}</div>${results.length > 12 ? '<p class="emulator-small">Showing the first 12 results. Add another word to narrow the route.</p>' : ''}` : '<p class="emulator-small">No matching emulator menu. Try the exact label or check the broader Menu reference for reference-only material.</p>'}`;
  }

  async function render(profileId,nodeId,options={}) {
    const token = ++renderToken;
    rememberExpanded();
    if(visibleProfile && visibleProfile !== profileId)stopCurrentSession();
    clearHints();
    resetPrompt = false;
    const profile = profileById(profileId);
    visibleProfile = profile?.id || null;
    if (!profileId) {landing();void loadSaved();return;}
    if (!profile) {app.innerHTML=`<section class="emulator-page" data-emulator-root><h1>Keypad not found.</h1><p>Choose one of the available panel families.</p><a class="primary" href="${href()}">Choose a keypad</a></section>`;return;}
    app.innerHTML='<section class="emulator-page" data-emulator-root><div class="loading">Opening the keypad emulator…</div></section>';
    try {
      const model = await loadModel(profile);
      if (token !== renderToken || !location.hash.startsWith('#emulator')) return;
      if (nodeId) {
        if (model.nodes[nodeId] || model.map._byId.has(nodeId)) {
          if(options.hints) {startHintRoute(nodeId);return;}
          sessions.set(profile.id,openEmulatorNode(model,sessions.get(profile.id),nodeId));save();
        } else toast?.('That item is not an emulator screen. Its full source entry is in Menu maps.');
      }
      paint();
    } catch(error) {
      if (token !== renderToken || !location.hash.startsWith('#emulator')) return;
      app.innerHTML=`<section class="emulator-page" data-emulator-root><h1>The keypad could not load.</h1><p>${esc(error.message)}</p>${button('retry','Try again','primary')}<a class="back" href="${href()}">Choose another keypad</a></section>`;
    }
  }

  app.addEventListener('findr:request-hints',event=>{if(!hint||event.detail?.engineId!==visibleProfile||!currentModel())return;event.preventDefault();paint();scrollToKeypad();});

  app.addEventListener('click',async event => {
    const target = event.target.closest('[data-emulator-action]');
    if (!target || !app.contains(target)) return;
    event.preventDefault();
    const action = target.dataset.emulatorAction;
    if (action === 'layout') {if (app.querySelector('[data-emulator-layout]')) setLayout(target.dataset.emulatorLayoutChoice);return;}
    if (action === 'retry') {render(visibleProfile);return;}
    const model = currentModel(); if (!model) return;
    const state = sessions.get(model.id), view = emulatorView(model,state);
    const focus = action === 'key' && event.detail > 0 ? 'keypad' : target.dataset.emulatorFocus;
    try {
      if (action === 'key') {handleKey(model,state,target.dataset.key,focus || 'keypad');return;}
      if (action === 'show-hints') {void hintFeedback.unlock();startHintRoute(target.dataset.node);return;}
      if (action === 'hint-restart') {const targetId=hintTargetId,recordId=hint?.recordId;void hintFeedback.unlock();startHintRoute(targetId,recordId);return;}
      if (action === 'hint-stop') {clearHints();paint('keypad');return;}
      if (action === 'hint-sound') {soundPreferenceChanged=true;hintFeedback.setEnabled(!hintFeedback.isEnabled());if(hintFeedback.isEnabled())void hintFeedback.unlock();if(db?.setSetting)void Promise.resolve(db.setSetting(soundStorageKey,hintFeedback.isEnabled())).catch(()=>{});paint('hint-sound');return;}
      if (action === 'apply-text' && view.editor?.kind === 'text' && view.editor.textMode === 'orisec-picker') {clearHints();update(applyEmulatorEdit(model,state),'keypad');return;}
      if (action === 'open-node') {clearHints();update(openEmulatorNode(model,state,target.dataset.node),'keypad');scrollToKeypad();return;}
      if (action === 'phrase') {queries.set(model.id,target.dataset.value || '');const input=app.querySelector('[data-emulator-search]');if(input){input.value=queries.get(model.id);input.focus({preventScroll:true});}renderResults();return;}
      if (action === 'reset-prompt') {resetPrompt=true;paint('cancel-reset');return;}
      if (action === 'cancel-reset') {resetPrompt=false;paint('reset');return;}
      if (action === 'confirm-reset') {clearHints();resetPrompt=false;demoZones.delete(model.id);update(createEmulatorState(model,{rootId:state.rootId}),'keypad');return;}
      if(action==='show-report'){
        const report=app.querySelector('.emulator-report');if(report){report.open=true;report.scrollIntoView({block:'start',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});app.querySelector('[data-emulator-report-text]')?.focus({preventScroll:true});}return;
      }
      if(action==='copy-report'){
        const report=view.lastReport || state.lastReport;if(!report?.text)return;
        try{await navigator.clipboard.writeText(report.text);toast?.('Demo report copied.');}
        catch{const text=app.querySelector('[data-emulator-report-text]');text?.focus({preventScroll:true});text?.select();toast?.('Select and copy the report text.');}
        return;
      }
      if(action==='download-report'){
        const report=view.lastReport || state.lastReport;if(!report?.text)return;
        const url=URL.createObjectURL(new Blob([report.text],{type:'text/plain;charset=utf-8'}));
        const link=document.createElement('a');link.href=url;link.download=`FINDR-${model.id}-demo-report.txt`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
      }
      if (action === 'zone-state' || action === 'pulse-zone') {
        const address=demoAddress(model,view);let next=state;
        if(action==='pulse-zone'){next=setEmulatorZone(model,next,address,'secure');next=setEmulatorZone(model,next,address,'active');next=setEmulatorZone(model,next,address,'secure');}
        else next=setEmulatorZone(model,state,address,target.dataset.state);
        update(next,focus);return;
      }
    } catch(error) {toast?.(error.message || 'That emulator action could not be completed.');}
  });

  app.addEventListener('input',event => {
    const model=currentModel();if(!model)return;
    if(event.target.matches('[data-emulator-search]')){queries.set(model.id,event.target.value);renderResults();return;}
    if(event.target.matches('[data-emulator-text]')){
      try{clearHints();update(setEmulatorText(model,sessions.get(model.id),event.target.value),'text-entry');}
      catch(error){toast?.(error.message || 'That text could not be entered.');}
    }
  });

  app.addEventListener('change',event => {
    const target=event.target;
    if(target.matches('[data-emulator-profile-select]')){clearHints();location.hash=href(target.value);return;}
    const model=currentModel();if(!model)return;
    if(target.matches('[data-emulator-root-select]')){clearHints();resetPrompt=false;update(setEmulatorRoot(model,sessions.get(model.id),target.value),'root-select');}
    if(target.matches('[data-emulator-hint-record]')){const targetId=hintTargetId;startHintRoute(targetId,target.value);return;}
    if(target.matches('[data-emulator-zone-select]')){demoZones.set(model.id,target.value);paint('zone-select');}
  });

  app.addEventListener('keydown',event => {
    if(event.altKey||event.ctrlKey||event.metaKey||event.isComposing)return;
    const target=event.target;
    if(!target.closest('[data-emulator-keyboard]')||target.matches('input,textarea,select,[contenteditable="true"]')||document.querySelector('dialog[open]'))return;
    if((event.key==='Enter'||event.key===' ')&&target.closest('button'))return;
    const model=currentModel();if(!model)return;
    const key=event.key==='#'&&model.id==='scantronic-ion'?'hash':practiceKeyboardKey(model.profile,event.key);
    if(!key)return;
    event.preventDefault();
    try{handleKey(model,sessions.get(model.id),key,'keypad');}
    catch(error){toast?.(error.message || 'That emulator key could not be processed.');}
  });

  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)hintFeedback.pause();
  });

  function stopCurrentSession() {
    clearHints();
    const model=currentModel();
    if(!model||!sessions.has(model.id))return;
    sessions.set(model.id,pauseEmulator(model,sessions.get(model.id)));
    save();
  }

  function leave() {
    ++renderToken;
    rememberExpanded();
    stopCurrentSession();
    visibleProfile=null;
  }

  return {render,leave,flush:()=>Promise.all([saveQueue,layoutSaveQueue])};
}
