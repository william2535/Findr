import {
  createPracticeState, pressPracticeKey, setPracticeZone, practiceScreen,
  currentNode, currentTask, currentZone, taskMatches
} from './practice-engine.mjs';
import {moreKeypadLooks,moreKeyboardMappings,moreKeypadFace,moreKeypadSymbol,moreKeypadSecondary} from './keypad-faces-more.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const glyphs = {
  arrow: 'M5 12h14m-6-6 6 6-6 6', back: 'M19 12H5m6-6-6 6 6 6',
  search: 'm21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  check: 'm5 12 4 4L19 6', book: 'M3 4h7l2 2 2-2h7v16h-7l-2 1-2-1H3zM12 6v15',
  reset: 'M3 10a9 9 0 1 1 2 8M3 4v6h6', keypad: 'M5 2h14v20H5zM8 6h8v4H8zM8 14h1m3 0h1m3 0h1M8 18h1m3 0h1m3 0h1',
  bulb: 'M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0l-1 2H9z', external: 'M14 3h7v7m0-7L10 14M10 4H4v16h16v-6'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${glyphs[name] || glyphs.keypad}"/></svg>`;
const button = (action, label, cls = 'secondary', attrs = '') => `<button type="button" class="${cls}" data-practice-action="${action}" ${attrs}>${label}</button>`;
const sourceUrl = (url, page) => {
  try {
    const parsed = new URL(url, location.href);
    if (!['https:', 'http:'].includes(parsed.protocol)) return '';
    if (page && Number.isFinite(Number(page))) parsed.hash = `page=${Number(page)}`;
    return parsed.href;
  } catch { return ''; }
};
const plain = value => Array.isArray(value) ? value.join(' ') : typeof value === 'object' ? value?.label || value?.name || '' : String(value ?? '');
const progressKey = 'keypad-practice-progress';

// Physical layouts are based on the manufacturers' photographs and keypad diagrams.
// The named model is a visual reference; this remains a selected-menu simulation.
const keypadLooks = {
  ...moreKeypadLooks,
  'galaxy-dimension': {
    style: 'galaxy', model: 'Galaxy Mk7 / KeyProx', short: 'Galaxy Mk7',
    recognition: 'Tall ivory case · round keys · A, B, ent and esc down the right',
    source: 'https://buildings.honeywell.com/gb/en/products/by-category/intrusion-detection/keypads-and-user-interfaces/galaxy-mk7-keypad-and-keyprox',
  },
  'texecom-premier-elite': {
    style: 'texecom', model: 'Premier Elite LCDLP', short: 'Premier Elite LCDLP',
    recognition: 'Black display bezel · blue LCD · oval keys with Yes and No on the bottom row',
    source: 'https://www.texe.com/products/premier-elite-lcdlp/',
  },
  'scantronic-ion': {
    style: 'scantronic', model: 'Eaton KEY-KP01', short: 'Eaton KEY-KP01',
    recognition: 'Grey display bezel · green navigation pad · A–D keys down the left',
    source: 'https://www.eaton.com/ie/en-gb/catalog/safety-security-and-emergency-communications/surface-intruder-keypad.html',
  },
  'orisec-cp': {
    style: 'orisec', model: 'Orisec MK-700', short: 'Orisec MK-700',
    recognition: 'Wide satin-metal face · blue LCD · diamond arrows on the right',
    source: 'https://www.orisec.co.uk/keypads/mk-700-series-keypads/',
  },
  'menvier-mseries': {
    style: 'menvier', model: 'Menvier MKP3 · M Series', short: 'Menvier MKP3',
    recognition: 'Ivory hinged case · green LCD · arrows and toggle down the left · green ENT and red ESC',
    source: 'https://bw-tech.co.uk/guides/eaton-menvier-m800-m2000-user-guide.pdf#page=5',
  },
  'pyronix-enforcer': {
    style: 'pyronix', model: 'Pyronix Enforcer V11 · integrated keypad', short: 'Enforcer V11',
    recognition: 'Side speaker slots · grey inset and blue LCD · A–D column beside separate arrow keys',
    source: 'https://eaglesecuritysolutions.co.uk/user-manual/pyronix-wireless-alarm-system-extended-user-guide.pdf#page=6',
  },
};
export const lookFor = profile => keypadLooks[profile.id] || {style: 'galaxy', model: plain(profile.keypad), short: profile.brand, recognition: '', source: ''};
const letters = {'2':'abc','3':'def','4':'ghi','5':'jkl','6':'mno','7':'pqrs','8':'tuv','9':'wxyz'};

export function practiceKeyboardKey(profile, input) {
  if(moreKeyboardMappings[profile.id]){const key=/^\d$/.test(input)?input:moreKeyboardMappings[profile.id][input];return profile.keys.some(button=>button.id===key)?key:null;}
  const common = {Enter:'enter',Escape:'back',ArrowDown:'next',ArrowUp:'previous',ArrowLeft:'left',ArrowRight:'right',Backspace:'backspace','*':'star','#':'details'};
  const pyronix = {ArrowDown:'back',A:'logout',a:'logout',B:'previous',b:'previous',C:'cancel',c:'cancel',D:'area-d',d:'area-d',N:'back',n:'back',Y:'enter',y:'enter'};
  const menvier = {T:'change',t:'change'};
  const family = profile.id === 'pyronix-enforcer' ? pyronix : profile.id === 'menvier-mseries' ? menvier : {};
  const key = /^\d$/.test(input) ? input : family[input] || common[input];
  if (['menvier-mseries','pyronix-enforcer'].includes(profile.id) && !profile.keys.some(button=>button.id===key)) return null;
  return key || null;
}

export function keypadFace(profile, screen, state = {}, miniature = false) {
  const look = lookFor(profile);
  const key = (id, label, extra = '') => {
    const meta = profile.keys.find(item => item.id === id);
    const visible = label || meta?.label || id;
    const digits = /^\d$/.test(id);
    const secondary=moreKeypadSecondary(look.style,id)||(!['galaxy','pyronix','ade','risco'].includes(look.style)?letters[id]:'');
    const sub = digits && secondary ? `<small>${secondary}</small>` : '';
    const symbol = id === 'panic-police' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m12 3 3 2 5 1-1 9-7 6-7-6-1-9 5-1z"/><path d="m12 7 1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5L7 10.5l3.5-.5z"/></svg>' : id === 'panic-fire' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M13 3c1 6-4 6-4 10-2-1-2-3-2-4-4 6-1 12 5 12 7 0 9-7 4-12 0 4-2 4-2 4 1-4 0-7-1-10Z"/><path d="M11 15c-2 2-1 5 1 5 3 0 3-3 1-5 0 2-2 2-2 0Z"/></svg>' : id === 'change' && look.style === 'menvier' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 4a9 9 0 0 0 0 16l-1-5m1 5-5-1M16 20a9 9 0 0 0 0-16l1 5m-1-5 5 1"/></svg>' : id === 'unset' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 11V7a4 4 0 0 1 8 0v1M6 11h12v10H6zM12 15v3"/></svg>' : id.startsWith('panic-') ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"${id === 'panic-bottom' ? ' style="transform:rotate(180deg)"' : ''}><path d="M3 5a9 9 0 0 0 18 0M7 5a5 5 0 0 0 10 0M11 5a1 1 0 0 0 2 0"/></svg>` : '';
    const contents = `<span>${moreKeypadSymbol(look.style,id) || symbol || esc(visible)}</span>${sub}`;
    const cls = `practice-key ${digits ? 'practice-key-number' : 'practice-key-function'} key-${esc(id)} ${extra}`;
    if (miniature) return `<span class="${cls}">${contents}</span>`;
    const unsupported = !meta && id !== 'backspace';
    const accessible = meta?.ariaLabel || (id === 'backspace' ? 'Clear: clear numeric entry' : `${visible}: outside selected practice routes`);
    return button('key', contents, cls, `data-key="${esc(id)}" data-practice-focus="key-${esc(id)}" aria-label="${esc(accessible)}"${unsupported ? ' title="Shown for recognition; outside the selected practice routes"' : ''}`);
  };
  const numberBlock = (bottomLeft, bottomRight) => `<div class="practice-physical-numbers">${['1','2','3','4','5','6','7','8','9'].map(id => key(id)).join('')}${key(...bottomLeft)}${key('0')}${key(...bottomRight)}</div>`;
  const lcd = `<div class="practice-lcd"${miniature ? '' : ` role="status" aria-live="polite" aria-atomic="true" aria-label="${esc(screen.heading)}"`}><div class="practice-lcd-lines ${screen.lines.some(line => String(line).length > 27) ? 'practice-lcd-long' : ''}">${screen.lines.map(line => `<span>${esc(line) || '&nbsp;'}</span>`).join('')}</div></div>`;
  const led = (name, on = false) => `<span><i class="${on ? 'is-lit' : ''}"></i>${name}</span>`;
  const omitted = Object.values(state.omittedZones || {}).some(Boolean);
  let face = '';
  if (['ade','hkc','risco'].includes(look.style)) {
    face = moreKeypadFace(look.style,{key,lcd,led,state});
  } else if (look.style === 'galaxy') {
    face = `<div class="practice-galaxy-top">${lcd}</div><div class="practice-galaxy-keys">${[['1'],['2'],['3'],['next','A ▸'],['4'],['5'],['6'],['previous','B ◂'],['7'],['8'],['9'],['enter','ent'],['star','*'],['0'],['details','#'],['back','esc']].map(args => key(...args)).join('')}</div><div class="practice-galaxy-base"><i></i><strong>Honeywell</strong></div>`;
  } else if (look.style === 'texecom') {
    face = `<div class="practice-texecom-bezel">${lcd}<div class="practice-texecom-leds" aria-hidden="true">${led('Power', true)}${led('Info')}${led('Ready', Boolean(state.zoneStates) && Object.values(state.zoneStates).every(value => value === 'secure'))}</div><div class="practice-texecom-bezel-bottom" aria-hidden="true"><span>PROX</span>${led('Omit', omitted)}<strong>Texecom</strong>${led('Service')}</div></div><div class="practice-texecom-keys">${[['1'],['2'],['3'],['omit','Omit'],['reset-key','Reset'],['4'],['5'],['6'],['chime','Chime'],['previous','▲'],['7'],['8'],['9'],['details','Part'],['next','▼'],['enter','Yes'],['0'],['change','No'],['area','Area'],['back','Menu']].map(args => key(...args)).join('')}</div><div class="practice-texecom-hinge" aria-hidden="true"></div>`;
  } else if (look.style === 'scantronic') {
    face = `<div class="practice-scantronic-bezel">${lcd}</div><div class="practice-scantronic-navigation"><div class="practice-arrow-pad">${key('previous','▲')}${key('left','◀')}<i aria-hidden="true"></i>${key('right','▶')}${key('next','▼')}</div><div class="practice-scantronic-actions">${key('back','✕')}${key('enter','✓')}${key('area','≡')}</div></div><div class="practice-scantronic-keybank"><div class="practice-setting-keys">${['A','B','C','D'].map(label => key('set-'+label.toLowerCase(),label)).join('')}</div><div class="practice-security-keys">${key('unset','Unset')}<span class="practice-key-spacer"></span>${key('panic-top','PA')}${key('panic-bottom','PA')}</div>${numberBlock(['star','*'],['hash','#'])}</div><div class="practice-scantronic-base" aria-hidden="true"><span></span><strong>EATON</strong><span></span></div>`;
  } else if (look.style === 'menvier') {
    face = `<div class="practice-menvier-display"><div class="practice-menvier-bezel">${lcd}<div class="practice-menvier-leds" aria-hidden="true">${led('~',true)}${led('△',Boolean(state.alarm))}</div></div></div><div class="practice-menvier-key-recess"><div class="practice-menvier-mark" aria-hidden="true"><span>M</span><strong>MENVIER</strong></div><div class="practice-menvier-keys">${[['previous','▲'],['1'],['2'],['3'],['change','Toggle'],['4'],['5'],['6'],['next','▼'],['7'],['8'],['9'],['details','#'],['enter','ENT'],['0'],['back','ESC']].map(args=>key(...args)).join('')}</div></div><div class="practice-menvier-flap" aria-hidden="true"><span class="practice-menvier-hinge"></span><div><strong>M SERIES</strong><span>MKP3</span></div></div>`;
  } else if (look.style === 'pyronix') {
    const statusGlyph = path => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="${path}"/></svg>`;
    face = `<div class="practice-pyronix-vents practice-pyronix-vents-left" aria-hidden="true"></div><div class="practice-pyronix-vents practice-pyronix-vents-right" aria-hidden="true"></div><div class="practice-pyronix-inset"><div class="practice-pyronix-bezel"><div class="practice-pyronix-leds" aria-hidden="true">${led(statusGlyph('m12 3 10 18H2zM12 9v6m0 3v1'),Boolean(state.alarm))}${led(statusGlyph('M5 17h14l-2-3V9a5 5 0 0 0-10 0v5zM10 20h4M3 7v6m18-6v6'),Boolean(state.alarm))}${led(statusGlyph('m5 3 16 18M6 10l6-5M4 12l3 3m8-12 6 6'))}${led(statusGlyph('m10 3 10 18H0zM12 9v6m-7 2L15 7'))}${led(statusGlyph('M7 10h13v11H7zM10 10V6a4 4 0 0 1 8 0M13 15v3'),!state.armed)}</div><div class="practice-pyronix-display">${lcd}<span class="practice-pyronix-prox" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m13 12 6-6 8 8-6 6zM9 11a10 10 0 0 0 12 15M6 7a15 15 0 0 0 18 23M14 20l-7 7m5-4 3 3"/></svg></span></div></div><div class="practice-pyronix-keys">${[['1'],['2'],['3'],['logout','A'],['panic-police','Police'],['4'],['5'],['6'],['previous','B'],['panic-fire','Fire'],['7'],['8'],['9'],['cancel','C'],['left','◀'],['back','NO'],['0'],['enter','YES'],['area-d','D'],['right','▶']].map(args=>key(...args)).join('')}</div></div><div class="practice-pyronix-flap" aria-hidden="true"><strong>PYRONIX</strong><span>Enforcer</span></div>`;
  } else {
    face = `<div class="practice-orisec-bezel"><i aria-hidden="true"></i>${lcd}<span class="practice-prox-mark" aria-hidden="true">N))</span></div><div class="practice-orisec-status" aria-hidden="true"></div><div class="practice-orisec-keybank">${numberBlock(['enter','Enter ✓'],['backspace','Clear ×'])}<div class="practice-orisec-functions">${key('arm','Arm')}${key('part-set','Part')}${key('area-select','Area')}${key('omit','Omit')}</div><div class="practice-orisec-navigation"><div class="practice-diamond-pad">${key('previous','⌃')}${key('left','❮')}${key('right','❯')}${key('next','⌄')}</div><div class="practice-orisec-bottom">${key('sound-help','♪ ?')}${key('back','Back ←')}</div></div></div>`;
  }
  const attrs = miniature ? 'aria-hidden="true"' : `tabindex="0" data-practice-keyboard data-practice-focus="keypad" role="group" aria-label="${esc(look.model)} style practice keypad for ${esc(profile.title)}. Use digits, Enter, Escape and arrow keys."`;
  return `<div class="practice-keypad practice-device-${look.style}${miniature ? ' practice-mini-device' : ''}" ${attrs}>${face}</div>`;
}


export function createPracticeController({app, profiles, db, showManuals, toast}) {
  const sessions = new Map();
  const hints = new Map();
  const demoZones = new Map();
  let query = '';
  let visibleProfile = null;
  let progress = {version: 1, completed: {}};
  let progressLoad;
  let progressWrite = Promise.resolve();
  let storageUnavailable = false;
  let storageNotified = false;

  const profileById = id => profiles.find(profile => profile.id === id);
  const profileForPanel = panelId => profiles.find(profile => (profile.panelIds || []).includes(panelId)) || null;
  const stateFor = profile => {
    if (!sessions.has(profile.id)) sessions.set(profile.id, createPracticeState(profile));
    return sessions.get(profile.id);
  };
  const completed = (profile, taskId) => Boolean(progress.completed?.[profile.id]?.[taskId]);
  const completionCount = profile => profile.tasks.filter(task => completed(profile, task.id)).length;
  const practiceIsVisible = () => Boolean(app.querySelector('[data-practice-root]'));

  function loadProgress() {
    if (progressLoad) return progressLoad;
    progressLoad = Promise.resolve().then(async () => {
      if (!db?.setting) return;
      try {
        const saved = await db.setting(progressKey);
        if (saved && typeof saved.completed === 'object' && saved.completed) {
          for (const profile of profiles) {
            const stored = saved.completed[profile.id];
            if (!stored || typeof stored !== 'object') continue;
            const allowed = Object.fromEntries(profile.tasks.filter(task => stored[task.id]).map(task => [task.id, stored[task.id]]));
            progress.completed[profile.id] = {...allowed, ...progress.completed[profile.id]};
          }
        }
      } catch { storageUnavailable = true; }
      if (practiceIsVisible()) redraw();
    });
    return progressLoad;
  }

  function rememberCompletion(profile, state) {
    if (!state.complete || !state.taskId || completed(profile, state.taskId)) return;
    progress.completed[profile.id] ||= {};
    progress.completed[profile.id][state.taskId] = Date.now();
    progressWrite = progressWrite.then(async () => {
      await loadProgress();
      if (!db?.setSetting) return;
      try { await db.setSetting(progressKey, JSON.parse(JSON.stringify(progress))); }
      catch {
        storageUnavailable = true;
        if (!storageNotified) {
          storageNotified = true;
          toast?.('Your progress stays in this tab. Device storage is unavailable.');
        }
        if (practiceIsVisible()) redraw();
      }
    });
  }

  function miniature(profile) {
    return `<div class="practice-mini-holder">${keypadFace(profile, {heading:'Practice keypad', lines:[profile.brand === 'Honeywell' ? 'GALAXY DIMENSION' : profile.brand === 'Texecom' ? 'Premier Elite' : profile.brand === 'Orisec' ? 'Orisec' : 'EATON', 'Choose a task']}, {}, true)}</div>`;
  }

  function profileCard(profile, index) {
    const count = completionCount(profile);
    const look = lookFor(profile);
    return `<article class="practice-profile practice-tone-${index % 4}">
      <a class="practice-profile-visual" href="#practice/${encodeURIComponent(profile.id)}" aria-label="Practise ${esc(profile.title)} using ${esc(look.model)} style keypad">
        <span class="practice-visual-caption">Recognise the keypad</span>
        ${miniature(profile)}
        <span class="practice-visual-bottom">${esc(look.model)}</span>
      </a>
      <div class="practice-profile-body"><span class="practice-overline">${esc(profile.brand)}</span><h2>${esc(profile.title)}</h2><p class="practice-profile-keypad">${esc(look.short)} style</p><p>${profile.tasks.length} guided tasks · selected menus</p><a class="practice-map-link" href="#emulator/${encodeURIComponent(profile.id)}">Open free-use emulator →</a><div class="practice-card-progress"><span>${count ? `${count} / ${profile.tasks.length} practised` : 'Ready when you are'}</span>${count ? icon('check') : icon('keypad')}</div><a class="secondary" href="#practice/${encodeURIComponent(profile.id)}">Open keypad ${icon('arrow')}</a></div>
    </article>`;
  }

  function landing() {
    app.innerHTML = `<section class="practice-page" data-practice-root>
      <div class="practice-landing-head"><div><div class="eyebrow">UK INTRUDER PANELS / PRACTICE</div><h1>Know the keypad.<br><em>Find the menu.</em></h1><p>Build confidence with the menus you use on site. Choose a keypad, try a common task, and check the route against its manual.</p></div><div class="practice-intro-note">${icon('keypad')}<div><strong>A place to practise.</strong><span>Selected user and engineer menus. Fictional readings and events. No panel connection.</span></div></div></div>
      <section class="practice-search-section" aria-labelledby="practice-search-title"><label id="practice-search-title" for="practice-query">What do you want to practise?</label><div class="search">${icon('search')}<input id="practice-query" type="search" value="${esc(query)}" placeholder="Try “disable device” or “last alarm”…" autocomplete="off" data-practice-search></div><div class="practice-search-suggestions"><span>Try a phrase:</span>${['disable device', 'restore device', 'zone resistance', 'event log', 'walk test'].map(phrase => button('search-phrase', esc(phrase), 'practice-phrase', `data-value="${esc(phrase)}"`)).join('')}</div><div id="practice-search-results"></div></section>
      <section class="menu-practice-link"><div><h2>Explore freely on the keypad.</h2><p>Use the free-use emulator to navigate beyond these lessons and save changes to a fictional panel.</p></div><a class="secondary" href="#emulator">Open keypad emulator →</a></section><section class="practice-omit-callout"><div><span class="practice-overline">NEW GUIDED PRACTICE</span><h2>Disable / restore a device</h2><p>Learn to omit a detector’s zone, then include it again. Omission does not power off or disconnect the device.</p></div>${button('search-phrase', 'Choose an omit / restore exercise ' + icon('arrow'), 'primary', 'data-value="disable device"')}</section>
      <div class="practice-section-heading"><h2>Choose your keypad</h2><span>${profiles.length} panel families · UK focus</span></div><div class="practice-profiles">${profiles.map(profileCard).join('')}</div>
      <div class="practice-how"><div><span>01</span><h3>Choose an exercise</h3><p>Use everyday phrases to find the menu you need.</p></div><div><span>02</span><h3>Try the keypad</h3><p>Navigate with the panel’s keys and activate demo inputs.</p></div><div><span>03</span><h3>Check the source</h3><p>See the documented route, edition and page references.</p></div></div>
      <p class="practice-footnote">Practice begins with authorised user or engineer access already granted, as shown for each exercise. The supported menu subset and manual edition are shown for each keypad.${storageUnavailable ? ' Progress is available in this tab; device storage could not be loaded.' : ' Completed tasks are remembered on this device.'}</p>
    </section>`;
    renderSearchResults();
  }

  function renderSearchResults() {
    const container = app.querySelector('#practice-search-results');
    if (!container) return;
    if (!query.trim()) { container.innerHTML = ''; return; }
    const matches = profiles.flatMap(profile => profile.tasks.filter(task => taskMatches(profile, task, query)).map(task => ({profile, task})));
    container.innerHTML = `<p class="practice-search-count" role="status">${matches.length} practice ${matches.length === 1 ? 'task' : 'tasks'} for “${esc(query)}”</p>${matches.length ? `<div class="practice-task-results">${matches.map(({profile, task}) => button('start-task', `<span class="practice-result-brand">${esc(profile.brand)} · ${esc(profile.title)}</span><strong>${esc(task.title)}</strong><span class="practice-result-description">${esc(task.description)}</span><span class="practice-result-link">${completed(profile, task.id) ? icon('check') + ' Practise again' : 'Start task'} ${icon('arrow')}</span>`, 'practice-task-result', `data-profile="${esc(profile.id)}" data-task="${esc(task.id)}"`)).join('')}</div>` : '<div class="practice-search-empty">No matching exercise yet. Try “disable device”, “restore device”, “zone” or a panel name.</div>'}`;
  }

  function taskSources(profile, task) {
    if (!task?.sourceRefs?.length) return '';
    return `<div class="practice-task-sources"><span>Manual references</span>${task.sourceRefs.map(ref => {
      const source = profile.sources.find(item => item.id === ref.sourceId);
      if (!source) return '';
      const printed = Array.isArray(ref.printedPage) ? ref.printedPage.join(', ') : ref.printedPage;
      const pdf = Array.isArray(ref.pdfPage) ? ref.pdfPage[0] : ref.pdfPage;
      const href = sourceUrl(source.url, pdf);
      const label = `${source.edition || source.title}${printed ? ` · p. ${printed}` : pdf ? ` · PDF p. ${pdf}` : ''}`;
      return href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer" title="${esc(source.title)}">${icon('book')}${esc(label)} ${icon('external')}</a>` : `<span>${esc(label)}</span>`;
    }).join('')}</div>`;
  }

  function guide(profile, state) {
    const task = currentTask(profile, state);
    const showHints = hints.get(profile.id) || false;
    const count = completionCount(profile);
    return `<aside class="practice-guide">
      <section class="practice-task-card"><div class="practice-guide-label"><span class="practice-overline">YOUR EXERCISE</span><span class="practice-progress-count">${count} / ${profile.tasks.length} practised</span></div>
        <label class="practice-field-label" for="practice-task-select">Choose a task</label><select id="practice-task-select" data-practice-task-select data-practice-focus="task-select"><option value="">Free practice</option>${profile.tasks.map(item => `<option value="${esc(item.id)}" ${item.id === state.taskId ? 'selected' : ''}>${completed(profile, item.id) ? '✓ ' : ''}${esc(item.title)}</option>`).join('')}</select>
        <h2>${esc(task?.title || 'Find your way around')}</h2><p>${esc(task?.description || 'Explore the supported menus at your own pace. Choose an exercise when you want a specific goal.')}</p>
        ${state.complete ? `<div class="practice-complete" role="status">${icon('check')}<div><strong>Task complete</strong><span>You finished this practice route.</span></div></div>${task?.relatedTaskId ? button('start-task', `${task.category === 'omission' ? 'Practise restoring this device' : 'Practise omitting this device'} ${icon('arrow')}`, 'primary practice-next', `data-profile="${esc(profile.id)}" data-task="${esc(task.relatedTaskId)}" data-practice-focus="next-task"`) : button('next-task', `Next exercise ${icon('arrow')}`, 'primary practice-next', 'data-practice-focus="next-task"')}` : task && completed(profile, task.id) ? '<div class="practice-previous-completion">Previously practised on this device</div>' : ''}
        <div class="practice-task-actions">${button('toggle-hints', icon('bulb') + (showHints ? 'Hide hints' : 'SHOW HINTS'), 'secondary', `aria-expanded="${showHints}" aria-controls="practice-route-help" data-practice-focus="hints"`)}${button('reset', icon('reset') + (task ? 'Restart task' : 'Reset practice'), 'subtle', 'data-practice-focus="reset"')}${button('jump-keypad', 'Use keypad ↓', 'secondary practice-mobile-jump', 'data-practice-focus="jump-keypad"')}</div>
        ${showHints ? `<div id="practice-route-help" class="practice-route-help">${task ? `<span class="practice-overline">DOCUMENTED ROUTE</span><div class="practice-route">${(task.path || []).map((part, index) => `<span>${index ? '<i aria-hidden="true">›</i>' : ''}${esc(part)}</span>`).join('')}</div>${task.hints?.length ? `<ol>${task.hints.map(hint => `<li>${esc(hint)}</li>`).join('')}</ol>` : ''}` : '<p>Use the scroll keys to choose a menu, then its confirm key to enter. The key guide below explains the controls for this panel.</p>'}</div>` : ''}
        ${task && ['omission', 'restore'].includes(task.category) && profile.omissionInfo ? `<div class="practice-omission-explainer"><strong>${esc(profile.omissionInfo.label || 'Omit and restore a zone')}</strong><p>${esc(profile.omissionInfo.meaning || 'Omit the detector’s zone. This does not power off or disconnect the device.')}</p>${profile.omissionInfo.duration ? `<p>${esc(profile.omissionInfo.duration)}</p>` : ''}${profile.omissionInfo.restore ? `<p><strong>Restore:</strong> ${esc(profile.omissionInfo.restore)}</p>` : ''}</div>` : ''}
        ${taskSources(profile, task)}
        ${task ? button('free-practice', 'Switch to free practice', 'practice-text-button', 'data-practice-focus="free-practice"') : ''}
      </section>
      <details class="practice-reference-card" ${task ? '' : 'open'}><summary>Key guide <span>${esc(lookFor(profile).model)}</span></summary><dl>${(profile.controls || []).map(control => `<div><dt>${esc(control.label)}</dt><dd>${esc(control.description)}</dd></div>`).join('')}</dl><p class="practice-keyboard-help">Focus the keypad for keyboard entry: 0–9, Enter, Escape and arrow keys. Tab moves between controls. Extra physical keys are shown for recognition; only the selected practice routes respond.</p></details>
    </aside>`;
  }

  function keypad(profile, state) {
    const screen = practiceScreen(profile, state);
    const task = currentTask(profile, state);
    const look = lookFor(profile);
    return `<div class="practice-keypad-stage"><div class="practice-stage-label"><span>${state.loggedOut ? 'SESSION ENDED' : task?.sessionLabel || 'SIMULATED ENGINEER SESSION'}</span><span class="practice-demo-indicator">Demo data</span></div>
      ${button('jump-route', 'View route ↑', 'practice-text-button practice-mobile-jump practice-keypad-jump', 'data-practice-focus="jump-route"')}<div class="practice-model-identity"><span>KEYPAD STYLE</span><h2>${esc(look.model)}</h2><p>${esc(look.recognition)}</p></div>
      ${keypadFace(profile, screen, state)}
      <div class="practice-recognition-note"><span>Match the keys and display to your keypad.</span>${look.source ? `<a href="${esc(look.source)}" target="_blank" rel="noopener noreferrer">Compare real model ${icon('external')}</a>` : ''}</div>
      <a class="practice-map-link" href="#menus/${encodeURIComponent(profile.id)}">Browse the documented menu map →</a><p class="practice-screen-note"><strong>${esc(screen.heading)}</strong> · ${esc(screen.note)}</p><div class="practice-feedback ${state.complete ? 'is-complete' : ''}" role="status">${esc(state.feedback || 'Choose a menu and use the keypad to explore.')}</div>
      <span class="practice-display-note">Style reference · selected menus · ${esc(profile.lcdNotice || 'LCD layout and spacing simplified')}</span>
    </div>`;
  }

  function demoAddress(profile, state) {
    const requested = demoZones.get(profile.id);
    return profile.zones.some(zone => zone.address === requested) ? requested : currentZone(profile, state)?.address || profile.zones[0]?.address;
  }

  function demoInputs(profile, state) {
    if (!profile.zones?.length) return '';
    const address = demoAddress(profile, state);
    const status = state.zoneStates[address] || 'secure';
    const omitted = Boolean(state.omittedZones?.[address]);
    const pending = state.draftOmissions && Boolean(state.draftOmissions[address]) !== omitted;
    const inclusionLabel = pending ? (state.draftOmissions[address] ? 'Omit selected — not yet saved' : 'Restore selected — not yet saved') : omitted ? 'Zone omitted' : 'Zone included';
    const inclusionNote = pending ? 'Confirm this selection on the keypad to apply it in this practice session.' : omitted ? 'The zone is omitted in this practice session. Its physical input can still show Secure, Active or Tamper.' : 'The zone is included in this practice session. The input status below is a separate reading.';
    return `<section class="practice-demo-inputs" aria-labelledby="practice-demo-title"><div class="practice-demo-head"><div><span class="practice-overline">FINDR DEMO INPUTS</span><h2 id="practice-demo-title">Make something happen</h2></div><span class="practice-input-status is-${esc(status)}">${esc(status === 'tamper' ? 'Tamper' : status === 'active' ? 'Active' : 'Secure')}</span></div><p>These controls change the fictional detector, so you can see the keypad respond.</p><label class="practice-field-label" for="practice-demo-zone">Demo detector</label><select id="practice-demo-zone" data-practice-demo-select data-practice-focus="demo-select">${profile.zones.map(zone => `<option value="${esc(zone.address)}" ${zone.address === address ? 'selected' : ''}>${esc(zone.address)} · ${esc(zone.name)}</option>`).join('')}</select><div class="practice-zone-inclusion ${pending ? 'is-pending' : omitted ? 'is-omitted' : 'is-included'}">${icon(omitted || pending ? 'keypad' : 'check')}<div><strong>${esc(inclusionLabel)}</strong><span>${esc(inclusionNote)}</span></div></div><div class="practice-input-buttons">${[['secure','Secure'],['active','Active'],['tamper','Tamper']].map(([value, label]) => button('zone-state', esc(label), `practice-input-button ${status === value ? 'is-selected' : ''}`, `data-state="${value}" aria-pressed="${status === value}" data-practice-focus="state-${value}" ${state.loggedOut ? 'disabled' : ''}`)).join('')}</div>${button('pulse-zone', icon('keypad') + ' Pulse detector: Active → Secure', 'secondary practice-pulse', `data-practice-focus="pulse" ${state.loggedOut ? 'disabled' : ''}`)}<p class="practice-input-help">${state.walkRunning ? 'Walk test is running. Activate each detector, then leave the test to finish.' : 'For a walk test, start the test on the keypad before activating a detector.'}</p></section>`;
  }

  function sourcesSection(profile) {
    const recordIds = profile.sources.map(source => source.recordId).filter(Boolean);
    return `<section class="practice-sources-section"><div class="practice-section-heading"><div><span class="practice-overline">CHECK THE EDITION</span><h2>Built from the manuals</h2></div>${recordIds.length ? button('manuals', icon('book') + ' Manual downloads', 'secondary') : ''}</div><p>${esc(plain(profile.scope))}</p><div class="practice-source-list">${profile.sources.map(source => { const href = sourceUrl(source.url); return `<article><span>${icon('book')}</span><div><strong>${href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(source.title)} ${icon('external')}</a>` : esc(source.title)}</strong><small>${esc(source.edition || 'Edition specified in the source document')}</small></div></article>`; }).join('')}</div><details class="practice-limitations"><summary>What this practice version covers</summary><p>The selected exercise starts with authorised user or engineer access already granted in the simulation. Zone names, readings and events are examples. Your actions change this practice session only.</p>${profile.limitations?.length ? `<ul>${profile.limitations.map(limit => `<li>${esc(limit)}</li>`).join('')}</ul>` : ''}</details></section>`;
  }

  function trainer(profile, focus) {
    const state = stateFor(profile);
    app.innerHTML = `<section class="practice-page practice-trainer" data-practice-root data-practice-profile="${esc(profile.id)}"><a class="back" href="#practice">${icon('back')} Exit practice · All keypads</a><div class="practice-trainer-heading"><div><div class="eyebrow">KEYPAD PRACTICE / ${esc(profile.brand)}</div><h1>${esc(profile.title)}</h1><p>${esc(lookFor(profile).model)} style · ${esc(plain(profile.keypad))}${profile.edition ? ` · ${esc(profile.edition)}` : ''}</p></div><label class="practice-switch-label">Switch keypad<select data-practice-profile-select data-practice-focus="profile-select">${profiles.map(item => `<option value="${esc(item.id)}" ${item.id === profile.id ? 'selected' : ''}>${esc(item.title)}</option>`).join('')}</select></label></div><div class="practice-session-note">${icon('check')}<span>${esc(currentTask(profile, state)?.sessionStart || 'Starts with authorised engineer access granted')} · selected menus · demo data</span></div><div class="practice-workspace"><div class="practice-console">${keypad(profile, state)}${demoInputs(profile, state)}</div>${guide(profile, state)}</div>${sourcesSection(profile)}<p class="practice-footnote">${storageUnavailable ? 'Progress is kept in this tab. Device storage is currently unavailable.' : 'Completed tasks are saved on this device. Resetting an exercise keeps your progress.'}</p></section>`;
    if (focus) [...app.querySelectorAll('[data-practice-focus]')].find(element => element.dataset.practiceFocus === focus)?.focus({preventScroll: true});
  }

  function redraw(focus) {
    if (!practiceIsVisible()) return;
    const active = focus || document.activeElement?.dataset?.practiceFocus;
    const searchFocused = document.activeElement?.matches?.('[data-practice-search]');
    const searchSelection = searchFocused ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
    const profile = profileById(visibleProfile);
    profile ? trainer(profile, active) : landing();
    if (!profile && searchFocused) {
      const input = app.querySelector('[data-practice-search]');
      input?.focus({preventScroll: true});
      if (input && searchSelection) input.setSelectionRange(...searchSelection);
    }
  }

  function render(profileId, taskId) {
    const profile = profileById(profileId);
    if (profile && taskId && profile.tasks.some(task => task.id === taskId)) {
      sessions.set(profile.id, createPracticeState(profile, taskId));
      hints.set(profile.id, true);
      demoZones.delete(profile.id);
    }
    visibleProfile = profile?.id || null;
    profile ? trainer(profile) : landing();
    loadProgress();
  }

  function startTask(profile, taskId, focus = 'keypad') {
    sessions.set(profile.id, createPracticeState(profile, taskId || null));
    hints.set(profile.id, ['omission', 'restore'].includes(profile.tasks.find(task => task.id === taskId)?.category));
    demoZones.delete(profile.id);
    const target = `#practice/${encodeURIComponent(profile.id)}`;
    visibleProfile = profile.id;
    if (location.hash === target) trainer(profile, focus);
    else location.hash = target;
  }

  function applyKey(profile, key, focus) {
    const before = stateFor(profile);
    const state = pressPracticeKey(profile, before, key);
    sessions.set(profile.id, state);
    if (currentZone(profile, before)?.address !== currentZone(profile, state)?.address) demoZones.set(profile.id, currentZone(profile, state).address);
    rememberCompletion(profile, state);
    trainer(profile, focus || 'keypad');
  }

  app.addEventListener('click', async event => {
    const target = event.target.closest('[data-practice-action]');
    if (!target || !app.contains(target)) return;
    event.preventDefault();
    const action = target.dataset.practiceAction;
    const profile = profileById(target.dataset.profile || visibleProfile);
    try {
      if (action === 'search-phrase') {
        query = target.dataset.value || '';
        const input = app.querySelector('[data-practice-search]');
        if (input) { input.value = query; input.focus(); }
        renderSearchResults(); return;
      }
      if (action === 'start-task' && profile) { startTask(profile, target.dataset.task); return; }
      if (!profile) return;
      const state = stateFor(profile);
      const focus = event.detail > 0 && action === 'key' ? 'keypad' : target.dataset.practiceFocus;
      if (action === 'key') { applyKey(profile, target.dataset.key, focus); return; }
      if (action === 'jump-keypad' || action === 'jump-route') {
        if (action === 'jump-route' && !hints.get(profile.id)) { hints.set(profile.id, true); trainer(profile); }
        const toKeypad = action === 'jump-keypad';
        const destination = app.querySelector(toKeypad ? '.practice-keypad-stage' : '.practice-route-help');
        app.querySelector(toKeypad ? '[data-practice-keyboard]' : '[data-practice-focus="hints"]')?.focus({preventScroll: true});
        destination?.scrollIntoView({block: 'start', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
        return;
      }
      if (action === 'toggle-hints') { hints.set(profile.id, !hints.get(profile.id)); trainer(profile, focus); return; }
      if (action === 'reset') { startTask(profile, state.taskId, 'reset'); return; }
      if (action === 'free-practice') { startTask(profile, null); return; }
      if (action === 'next-task') {
        const index = profile.tasks.findIndex(task => task.id === state.taskId);
        const ordered = [...profile.tasks.slice(index + 1), ...profile.tasks.slice(0, index + 1)];
        const next = ordered.find(task => !completed(profile, task.id)) || ordered[0];
        startTask(profile, next?.id); return;
      }
      if (action === 'manuals') { await showManuals?.(profile.sources.map(source => source.recordId).filter(Boolean)); return; }
      if (action === 'zone-state' || action === 'pulse-zone') {
        const address = demoAddress(profile, state);
        let updated = state;
        if (action === 'pulse-zone') {
          updated = setPracticeZone(profile, updated, address, 'secure');
          updated = setPracticeZone(profile, updated, address, 'active');
          updated = setPracticeZone(profile, updated, address, 'secure');
          if (!updated.complete && !updated.feedback) updated.feedback = `Demo detector ${address} activated, then returned to Secure.`;
        } else updated = setPracticeZone(profile, updated, address, target.dataset.state);
        sessions.set(profile.id, updated);
        rememberCompletion(profile, updated);
        trainer(profile, focus);
      }
    } catch (error) { toast?.(error?.message || 'That practice action could not be completed. Try restarting the exercise.'); }
  });

  app.addEventListener('input', event => {
    if (!event.target.matches('[data-practice-search]')) return;
    query = event.target.value;
    renderSearchResults();
  });

  app.addEventListener('change', event => {
    const target = event.target;
    if (target.matches('[data-practice-profile-select]')) { location.hash = `#practice/${encodeURIComponent(target.value)}`; return; }
    const profile = profileById(visibleProfile);
    if (!profile) return;
    if (target.matches('[data-practice-task-select]')) startTask(profile, target.value, 'task-select');
    if (target.matches('[data-practice-demo-select]')) { demoZones.set(profile.id, target.value); trainer(profile, 'demo-select'); }
  });

  app.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
    const target = event.target;
    if (!target.closest('[data-practice-keyboard]') || target.matches('input,textarea,select,[contenteditable="true"]') || document.querySelector('dialog[open]')) return;
    if ((event.key === 'Enter' || event.key === ' ') && target.closest('button')) return;
    const profile = profileById(visibleProfile);
    if (!profile) return;
    const key = practiceKeyboardKey(profile,event.key);
    if (!key) return;
    event.preventDefault();
    applyKey(profile, key, 'keypad');
  });

  app.addEventListener('error', event => {
    if (event.target.matches?.('[data-practice-photo]')) event.target.remove();
  }, true);

  return {render, profileForPanel};
}
