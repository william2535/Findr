/*
 * FINDR's offline GENT Vigilon training engine.
 *
 * The supplied map owns every menu label, soft-key slot and cited route. This
 * module owns the simulated consequences. It has no network or hardware I/O.
 * Source-dependent and unconfigured functions deliberately produce a reference
 * message instead of claiming that a panel command succeeded.
 */

const VERSION = 1;
const MAX_HISTORY = 255;
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const INPUTS = new Set(['normal', 'fire', 'fault']);
const CLOCK_FIELDS = ['hour', 'minute', 'day', 'month', 'year'];
const clone = value => structuredClone(value);
const unique = values => [...new Set(values)];
const text = (value, limit = 200) => String(value ?? '').slice(0, limit);
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const list = value => Array.isArray(value) ? value : [];
const truth = value => value === true;
const dictionary = rows => Object.fromEntries(rows.map(row => [row.id, row]));
const count = value => Object.keys(value || {}).length;

const DEFAULT_KEYS = [
  ['MENU_ON_OFF', 'Menu On/Off'], ['F1', 'F1'], ['F2', 'F2'], ['F3', 'F3'], ['F4', 'F4'],
  ['CANCEL_BUZZER', 'Cancel Buzzer'], ['SOUND_ALARMS', 'Sound Alarms'],
  ['SILENCE_ALARMS', 'Silence Alarms'], ['RESET', 'Reset'], ['VERIFY', 'Verify'],
  ['PREVIOUS', 'Previous'], ['NEXT', 'Next'], ['LEFT', 'Left'], ['RIGHT', 'Right'],
  ['ENTER', 'Enter'], ['DELETE', 'Delete'], ['INSERT', 'Insert'], ['SPACE', 'Space'], ['SHIFT', 'Shift'],
  ...Array.from('1234567890QWERTYUIOPASDFGHJKLZXCVBNM').map(key => [key, key]),
  ...['U1', 'U2', 'U3', 'U4'].map(key => [key, key]),
].map(([id, label]) => ({id, label}));

const DEFAULT_LEDS = [
  ['fault', 'Fault', 'amber'], ['power-fault', 'Power Fault', 'amber'],
  ['system-fault', 'System Fault', 'amber'], ['delay', 'Delay', 'amber'],
  ['test', 'Test', 'amber'], ['disablement', 'Disablement', 'amber'],
  ['fire', 'Fire', 'red'], ['verify', 'Verify', 'amber'], ['sounder', 'Sounder', 'amber'],
  ['fire-routing-active', 'Fire Routing O/P Active', 'red'],
  ['fire-routing-fault', 'Fire Routing O/P Fault/Dis', 'amber'], ['power', 'Power', 'green'],
].map(([id, label, color]) => ({id, label, color}));

function softKeys(node) {
  const raw = node?.softKeys || [];
  return Array.isArray(raw) ? raw : Object.entries(raw).map(([key, value]) => ({key, ...value}));
}

function authenticationRoles(button) {
  const args = {...button?.action?.args, ...button?.args};
  return list(args.roles).length ? args.roles : [{level: 2, pinRole: 'customer', to: button?.to}];
}

function practiceCredential(model, state, role) {
  return role.pinRole === 'engineering' ? model.fixture.trainingEngineeringPin : state.trainingPin;
}

function nodeAccess(node) {
  return Number(node?.accessLevel) === 3 ? 3 : 0;
}

/** Compile source data once; the returned model is not a persisted session. */
export function buildGentModel(data) {
  if (!data || !data.id) throw new Error('A GENT map requires an id.');
  const raw = clone(data);
  const nodeList = Array.isArray(raw.nodes) ? raw.nodes : Object.values(raw.nodes || {});
  const nodes = Object.create(null);
  for (const node of nodeList) {
    if (!node.id || nodes[node.id]) throw new Error('GENT menu ids must be unique.');
    nodes[node.id] = {...node, softKeys: softKeys(node)};
  }
  const menuRootId = raw.menuRootId || 'main';
  if (!nodes[menuRootId]) throw new Error('GENT menu root is missing.');
  for (const node of Object.values(nodes)) {
    for (const action of [...softKeys(node), ...(node.enter ? [node.enter] : [])]) {
      if (action.to && !nodes[action.to] && action.to !== 'status') {
        throw new Error(`GENT menu ${node.id} links to unknown node ${action.to}.`);
      }
      for (const role of list(action.args?.roles)) {
        if (![2, 3].includes(role.level) || !['customer', 'engineering'].includes(role.pinRole) || !nodes[role.to]) {
          throw new Error(`GENT menu ${node.id} has an invalid practice authentication role.`);
        }
        if ((role.level === 3) !== (role.pinRole === 'engineering')) throw new Error('GENT practice credentials must retain their distinct access roles.');
      }
    }
  }
  const fixture = {
    ...raw.fixture,
    id: raw.fixture?.id || 'findr-vigilon-training-site',
    loops: list(raw.fixture?.loops).map(loop => typeof loop === 'number' ? {id: loop, label: `Loop ${loop}`} : loop),
    zones: list(raw.fixture?.zones), devices: list(raw.fixture?.devices),
    trainingPin: text(raw.fixture?.trainingPin || '2468', 12),
    trainingEngineeringPin: text(raw.fixture?.trainingEngineeringPin || '3917', 12),
  };
  if (!/^\d{4,8}$/.test(fixture.trainingEngineeringPin) || fixture.trainingEngineeringPin === fixture.trainingPin) {
    throw new Error('GENT engineering practice code must be fictional, numeric and distinct from the customer practice code.');
  }
  const scenarios = list(raw.scenarios);
  if (!scenarios.some(scenario => scenario.id === 'normal')) scenarios.unshift({id: 'normal', title: 'Normal'});
  const knownFaults = Object.create(null);
  for (const fault of [...list(fixture.faults), ...scenarios.flatMap(scenario => list(scenario.faults))]) {
    if (fault && typeof fault === 'object' && fault.id) knownFaults[fault.id] = fault;
  }
  const physical = list(raw.physicalKeys).map(key => typeof key === 'string' ? {id: key, label: key} : key);
  return {
    ...raw, data: raw, nodes, nodeList, menuRootId, fixture, scenarios,
    mapVersion: String(raw.version || raw.schemaVersion || '1'),
    sourceFingerprint: list(raw.sources).map(source => `${source.id}:${source.sha256 || source.url || ''}`).join('|'),
    devices: dictionary(fixture.devices), zones: dictionary(fixture.zones),
    scenarioById: dictionary(scenarios), knownFaults,
    physicalKeys: physical.length ? physical : DEFAULT_KEYS,
    leds: (list(raw.leds).length ? raw.leds : DEFAULT_LEDS).map(led => ({...led, color: led.color || led.colour || DEFAULT_LEDS.find(item => item.id === led.id)?.color || 'amber'})),
  };
}

function initialLabels(model) {
  const ios = {};
  for (const device of model.fixture.devices) {
    const channels = list(device.ioLines || device.ios || device.inputs || device.ioChannels);
    for (const entry of channels) {
      const io = typeof entry === 'object' ? entry.number ?? entry.id : entry;
      ios[`${device.id}:${io}`] = typeof entry === 'object' ? entry.label || `I/O ${io}` : `I/O ${io}`;
    }
    if (device.type === 'interface' && !channels.length) {
      for (let io = 1; io <= 4; io++) ios[`${device.id}:${io}`] = `I/O ${io}`;
    }
  }
  return {
    devices: Object.fromEntries(model.fixture.devices.map(device => [device.id, device.label || device.id])),
    zones: Object.fromEntries(model.fixture.zones.map(zone => [zone.id, zone.label || zone.id])),
    ios,
    local: model.fixture.localLabel || model.fixture.panelLabel || 'FINDR training panel',
    custom: model.fixture.customLabel || 'FINDR practice site',
  };
}

function defaultClock(model) {
  return validClock(model.fixture.clock || {hour: 12, minute: 0, day: 16, month: 3, year: 2015});
}

function baseState(model, access = 2) {
  const labels = initialLabels(model);
  const clock = defaultClock(model);
  const history = list(model.fixture.history).slice(0, MAX_HISTORY).map((entry, index, rows) => ({
    type: entry.type || 'training-event', sequence: rows.length - index,
    at: entry.timestamp || '', message: entry.message || 'FINDR training event', origin: 'trainer',
    ...(model.devices[entry.device] ? {device: entry.device} : {}),
  }));
  return {
    version: VERSION, panelId: model.id, fixtureId: model.fixture.id, mapVersion: model.mapVersion, sourceFingerprint: model.sourceFingerprint, scenarioId: 'normal',
    accessLevel: Number(access) === 1 ? 1 : 2, authenticatedLevel: 0,
    menuOpen: false, nodeId: null, trail: [], form: {}, cursor: 0, insertMode: false, shift: false,
    inputs: Object.fromEntries(model.fixture.devices.map(device => [device.id, 'normal'])),
    disabledDevices: [], disabledZones: [], testZones: [], fireEvents: [], faults: {},
    buzzer: false, sounders: false, alarmSounders: false, manualSounders: false,
    history, sequence: history.length, lastEvent: null, lastAction: null,
    message: '', display: null, viewMode: null, viewIndex: 0, fireIndex: 0,
    labels, trainingPin: model.fixture.trainingPin, clock, clockDraft: null, clockIndex: 0,
    printer: {enabled: truth(model.fixture.printer?.enabled ?? model.fixture.printerOn), feeds: 0, tests: 0, lastJob: null},
    savedConfiguration: {labels: clone(labels), trainingPin: model.fixture.trainingPin, clock: clone(clock)},
    dirty: false, displayTestRemainingMs: 0, testCycles: {}, testSuppressedInputs: [],
    elapsedMs: 0, menuIdleMs: 0,
  };
}

/** Start with the fictional site. No real installation or access credentials are used. */
export function createGentState(model, {scenarioId = 'normal', access = 2} = {}) {
  return applyScenario(model, baseState(model, access), scenarioId);
}

function stamp(state) {
  const c = state.clock;
  return `${String(c.day).padStart(2, '0')}/${String(c.month).padStart(2, '0')}/${c.year} ${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')}`;
}

function event(state, type, message, details = {}, {historic = false, origin = 'panel-simulation'} = {}) {
  const entry = {type, sequence: ++state.sequence, at: stamp(state), message, origin, ...details};
  state.lastEvent = entry;
  if (historic) state.history = [entry, ...state.history].slice(0, MAX_HISTORY);
  return entry;
}

function action(state, key, type, ok = true, message = '', eventType = null) {
  state.lastAction = {key, type, ok, message, ...(eventType ? {eventType} : {})};
  if (message) state.message = message;
}

function reject(state, key, message, type = 'unavailable') {
  action(state, key, type, false, message);
  return false;
}

function disabled(model, state, deviceId) {
  const device = model.devices[deviceId];
  return !!device && (state.disabledDevices.includes(deviceId) || state.disabledZones.includes(device.zone));
}

function updateSounders(state) {
  state.sounders = !!(state.alarmSounders || state.manualSounders || Object.values(state.testCycles).some(cycle => cycle.remainingMs > 0 && !cycle.silenced));
}

function addFire(model, state, deviceId, {test = false} = {}) {
  if (state.fireEvents.some(entry => entry.device === deviceId)) return;
  const device = model.devices[deviceId];
  const entry = event(state, 'fire-detected', `Fire: ${state.labels.devices[deviceId]}`, {device: deviceId, zone: device.zone, test}, {historic: true});
  state.fireEvents.push({device: deviceId, zone: device.zone, sequence: entry.sequence, at: entry.at, test});
  state.buzzer = true;
  if (!test) state.alarmSounders = true;
  updateSounders(state);
}

function inputFault(model, deviceId) {
  const device = model.devices[deviceId];
  return {id: `input:${deviceId}`, device: deviceId, loop: device.loop, address: device.address, message: 'Lost Device', kind: 'device'};
}

function addFault(state, fault) {
  if (state.faults[fault.id]) return;
  const message = fault.message === 'Device removed' ? 'Lost Device' : fault.message || 'Fault';
  state.faults[fault.id] = {...clone(fault), message};
  event(state, 'fault-detected', message, {fault: fault.id, device: fault.device}, {historic: true});
  state.buzzer = true;
}

function setInput(model, state, id, input) {
  const device = model.devices[id];
  if (!device || !INPUTS.has(input)) return reject(state, 'TRAINER_INPUT', 'Choose a device and condition from this fictional site.');
  if (input === 'fire' && device.type === 'interface') return reject(state, 'TRAINER_INPUT', 'Interface fire inputs depend on their commissioned I/O configuration. This fixture provides interface labels and communication faults only.', 'source-gap');
  if (input === 'fire' && device.type === 'mcp' && state.disabledZones.includes(device.zone) && !state.disabledDevices.includes(id)) {
    return reject(state, 'TRAINER_INPUT', 'The effect of this zone disablement on a manual call point is not established by the selected source. Re-enable the zone before this practice stimulus.', 'source-gap');
  }
  const before = state.inputs[id];
  state.inputs[id] = input;
  if (input !== 'fire') state.testSuppressedInputs = state.testSuppressedInputs.filter(value => value !== id);
  if (input !== 'fault') {
    for (const fault of Object.values(state.faults)) {
      if (fault.device === id && fault.kind === 'device') {
        delete state.faults[fault.id];
        event(state, 'fault-restored', 'FINDR device fault condition restored', {device: id, fault: fault.id}, {historic: true, origin: 'trainer'});
      }
    }
  }
  if (input === 'fault' && !Object.values(state.faults).some(fault => fault.device === id && fault.kind === 'device')) addFault(state, inputFault(model, id));
  if (input === 'fire' && before !== 'fire' && !disabled(model, state, id)) {
    if (state.testZones.includes(device.zone)) {
      state.testCycles[device.zone] = {device: id, remainingMs: 5000, silenced: false};
      addFire(model, state, id, {test: true});
    } else addFire(model, state, id);
  }
  if (!state.fireEvents.length && !count(state.faults)) state.buzzer = false;
  updateSounders(state);
  const message = input === 'fire' && disabled(model, state, id)
    ? 'FINDR stimulus changed. This sensing input is disabled in the fictional site.'
    : input === 'normal' && state.fireEvents.some(entry => entry.device === id)
      ? 'FINDR initiating condition restored. The fire indication remains latched until Reset.'
      : `FINDR input: ${state.labels.devices[id]} — ${input}.`;
  event(state, 'input-changed', message, {device: id, input}, {origin: 'trainer'});
  action(state, 'TRAINER_INPUT', 'input', true, message, 'input-changed');
  return true;
}

export function setGentDeviceInput(model, previous, id, input) {
  const state = clone(previous);
  setInput(model, state, id, input);
  return state;
}

/** Only known, explicitly modelled practice faults can be injected. */
export function setGentFault(model, previous, id, active) {
  const state = clone(previous);
  id = String(id || '');
  const fault = model.knownFaults[id] || (id.startsWith('input:') && model.devices[id.slice(6)] ? inputFault(model, id.slice(6)) : null);
  if (!fault) {
    reject(state, 'TRAINER_FAULT', 'That fault is not part of the fictional site.');
    return state;
  }
  if (active) {
    addFault(state, fault);
    if (model.devices[fault.device] && fault.kind === 'device') state.inputs[fault.device] = 'fault';
  }
  else if (state.faults[id]) {
    delete state.faults[id];
    if (model.devices[fault.device] && state.inputs[fault.device] === 'fault' && !Object.values(state.faults).some(item => item.device === fault.device && item.kind === 'device')) state.inputs[fault.device] = 'normal';
    event(state, 'fault-restored', 'FINDR fault condition restored', {fault: id}, {historic: true, origin: 'trainer'});
  }
  if (!state.fireEvents.length && !count(state.faults)) state.buzzer = false;
  action(state, 'TRAINER_FAULT', 'fault', true, active ? 'FINDR fault condition introduced.' : 'FINDR fault condition restored.', state.lastEvent?.type);
  return state;
}

function closeMenu(state) {
  state.menuOpen = false;
  state.nodeId = null;
  state.trail = [];
  state.form = {};
  state.cursor = 0;
  state.authenticatedLevel = 0;
  state.viewMode = null;
  state.viewIndex = 0;
  state.display = null;
  state.clockDraft = null;
  state.menuIdleMs = 0;
}

function enterNode(model, state, id, {preserveField = false} = {}) {
  if (id === 'status') { closeMenu(state); return; }
  if (id === 'info' && state.nodeId !== 'info-output' && model.nodes['info-output'] && model.fixture.printerFitted && state.printer.enabled) id = 'info-output';
  const node = model.nodes[id];
  if (!node) return;
  state.menuOpen = true;
  state.nodeId = id;
  const index = state.trail.indexOf(id);
  state.trail = index < 0 ? [...state.trail, id] : state.trail.slice(0, index + 1);
  state.display = null;
  state.viewMode = null;
  state.message = '';
  if (node.field) {
    if (!preserveField) state.form[node.field.name] = text(node.field.default ?? '', node.field.maxLength || 80);
    state.cursor = node.field.kind === 'text' ? 0 : String(state.form[node.field.name] ?? '').length;
    state.insertMode = false;
  }
  if (node.behavior === 'clock') {
    state.clockDraft = clone(state.clock);
    state.clockIndex = 0;
  }
  if (node.id === 'active') delete state.form.card;
  if (node.set) for (const [name, value] of Object.entries(node.set)) state.form[name] = text(value, 80);
}

function applyScenario(model, state, id) {
  const scenario = model.scenarioById[id];
  if (!scenario) {
    reject(state, 'TRAINER_SCENARIO', 'Choose one of the supplied practice scenarios.');
    return state;
  }
  state.scenarioId = id;
  state.disabledDevices = unique(list(scenario.disabledDevices).filter(device => model.devices[device]));
  state.disabledZones = unique(list(scenario.disabledZones).filter(zone => model.zones[zone]));
  state.testZones = unique(list(scenario.testZones).filter(zone => model.zones[zone]));
  for (const device of state.disabledDevices) event(state, 'device-disabled', 'Device(s) disabled', {device}, {historic: true});
  for (const zone of state.disabledZones) event(state, 'zone-disabled', `Zone ${model.zones[zone].number} disabled`, {zone}, {historic: true});
  const inputs = scenario.inputs && typeof scenario.inputs === 'object' ? scenario.inputs : {};
  for (const [device, input] of Object.entries(inputs)) setInput(model, state, device, input);
  for (const fault of list(scenario.faults)) {
    const known = typeof fault === 'string' ? model.knownFaults[fault] : model.knownFaults[fault?.id];
    if (known) {
      addFault(state, known);
      if (model.devices[known.device] && known.kind === 'device') state.inputs[known.device] = 'fault';
    }
  }
  state.message = scenario.note || 'FINDR fictional site loaded.';
  state.lastEvent = null;
  action(state, 'TRAINER_SCENARIO', 'scenario', true, state.message);
  return state;
}

export function loadGentScenario(model, previous, id) {
  if (!model.scenarioById[id]) {
    const state = clone(previous);
    reject(state, 'TRAINER_SCENARIO', 'Choose one of the supplied practice scenarios.');
    return state;
  }
  return applyScenario(model, baseState(model, previous.accessLevel), id);
}

/** Door/access context is an explicit FINDR control, not a physical key shortcut. */
export function setGentAccess(model, previous, level) {
  const state = clone(previous);
  state.accessLevel = Number(level) === 1 ? 1 : 2;
  if (state.accessLevel === 1) closeMenu(state);
  event(state, 'practice-access-changed', `FINDR access level ${state.accessLevel}`, {level: state.accessLevel}, {origin: 'trainer'});
  action(state, 'TRAINER_ACCESS', 'access', true, `FINDR practice door ${state.accessLevel === 2 ? 'open' : 'closed'}.`);
  return state;
}

function numericSelection(value) {
  const match = String(value ?? '').trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
  if (!match) return [];
  const start = Number(match[1]), end = Number(match[2] || match[1]);
  if (start < 0 || end < start || end - start > 255) return [];
  return Array.from({length: end - start + 1}, (_, index) => start + index);
}

function selectedDevices(model, state, {single = true, allowMcpRange = false} = {}) {
  const loops = numericSelection(state.form.loop);
  const addresses = numericSelection(state.form.device);
  if (!loops.length || !addresses.length || (single && (loops.length !== 1 || addresses.length !== 1))) return [];
  const found = [];
  for (const loop of loops) for (const address of addresses) {
    const device = model.fixture.devices.find(entry => Number(entry.loop) === loop && Number(entry.address) === address);
    if (!device) return [];
    found.push(device);
  }
  if (!allowMcpRange && found.length > 1 && found.some(device => device.type === 'mcp')) return [];
  return found;
}

function selectedZones(model, state, {single = true} = {}) {
  const numbers = numericSelection(state.form.zone);
  if (!numbers.length || (single && numbers.length !== 1)) return [];
  const zones = numbers.map(n => model.fixture.zones.find(zone => Number(zone.number) === n));
  return zones.every(Boolean) ? zones : [];
}

function ioKey(model, state) {
  const device = selectedDevices(model, state, {single: true})[0];
  const io = numericSelection(state.form.io);
  if (!device || io.length !== 1) return null;
  const key = `${device.id}:${io[0]}`;
  return Object.hasOwn(state.labels.ios, key) ? key : null;
}

function needsAuth(name) {
  return /^(disable-|enable-|prepare-|set-)/.test(name) || ['save-nvm', 'clock-next', 'clock-retard', 'clock-advance', 'clock-set', 'change-training-pin'].includes(name);
}

function sourceOnly(state, key, note) {
  return reject(state, key, note || 'This function depends on commissioning or an unresolved source detail. Its reference is available; no simulated panel command was applied.', 'reference');
}

function applyEffect(model, state, name, args = {}, key = '') {
  if (!name) return true;
  if (['zone-test-on', 'zone-test-off'].includes(name) && state.authenticatedLevel !== 3) {
    return reject(state, key, 'Enter the separate FINDR engineering practice code through Test/Eng > UserCode first.', 'access-required');
  }
  if (needsAuth(name) && state.authenticatedLevel < 2) return reject(state, key, 'Enter the FINDR practice code through UserCode first.', 'access-required');
  if (name === 'reference') return sourceOnly(state, key, args.note);
  if (name === 'abort' || name === 'quit') { closeMenu(state); return true; }
  if (name === 'authenticate') {
    const roles = list(args.roles).length ? args.roles : [{level: 2, pinRole: 'customer'}];
    const role = roles.find(candidate => String(state.form.pin || '') === practiceCredential(model, state, candidate));
    if (!role) return reject(state, key, 'Practice code not recognised. Use the displayed FINDR practice code for this task.', 'incorrect-pin');
    state.authenticatedLevel = role.level;
    delete state.form.pin;
    event(state, 'access-granted', role.level === 3 ? 'FINDR engineering practice access granted' : 'FINDR practice user access granted', {level: role.level}, {origin: 'trainer'});
    return true;
  }
  if (name === 'cancel-field') {
    const field = model.nodes[state.nodeId]?.field;
    if (!field) return reject(state, key, 'There is no uncommitted entry to cancel.');
    state.form[field.name] = '';
    state.cursor = 0;
    state.display = null;
    event(state, 'entry-cancelled', 'FINDR uncommitted entry cleared', {field: field.name}, {origin: 'trainer'});
    state.message = 'Entry cancelled. Existing zone test selections are unchanged.';
    return true;
  }
  if (name === 'zone-test-on' || name === 'zone-test-off') {
    const zones = selectedZones(model, state);
    if (zones.length !== 1) return reject(state, key, 'Enter one installed zone from the fictional site (1–3).', 'invalid-target');
    return changeZoneTest(model, state, zones[0].id, name === 'zone-test-on', {key, origin: 'panel-simulation'});
  }
  if (name === 'display-test') {
    state.displayTestRemainingMs = 4000;
    closeMenu(state);
    event(state, 'display-test', 'Display test — approximately four seconds');
    state.message = 'Display test';
    return true;
  }
  if (name === 'disable-device' || name === 'enable-device') {
    const devices = selectedDevices(model, state);
    if (!devices.length) return reject(state, key, 'Select a sensing device and loop in the fictional site. A manual call point can only be selected individually.', 'invalid-target');
    if (devices.some(device => device.type === 'interface')) return sourceOnly(state, key, 'This Sensing exercise covers the supplied sensors and manual call points. Interface I/O enablement has a separate source route.');
    const off = name === 'disable-device';
    for (const device of devices) {
      state.disabledDevices = off ? unique([...state.disabledDevices, device.id]) : state.disabledDevices.filter(id => id !== device.id);
      event(state, off ? 'device-disabled' : 'device-enabled', off ? 'Device(s) disabled' : 'Device(s) enabled', {device: device.id}, {historic: true});
      if (!off && state.inputs[device.id] === 'fire' && !disabled(model, state, device.id)) addFire(model, state, device.id);
    }
    state.message = off ? 'Device(s) disabled' : 'Device(s) enabled';
    return true;
  }
  if (name === 'disable-zone' || name === 'enable-zone') {
    const zones = selectedZones(model, state);
    if (!zones.length) return reject(state, key, 'Select a zone from the fictional site.', 'invalid-target');
    const off = name === 'disable-zone';
    if (off && zones.some(zone => model.fixture.devices.some(device => device.zone === zone.id && device.type === 'mcp' && state.inputs[device.id] === 'fire'))) return sourceOnly(state, key, 'The selected source does not establish zone-disablement effects on an active manual call point. Restore the fictional call-point input before this exercise.');
    for (const zone of zones) {
      state.disabledZones = off ? unique([...state.disabledZones, zone.id]) : state.disabledZones.filter(id => id !== zone.id);
      event(state, off ? 'zone-disabled' : 'zone-enabled', `Zone ${zone.number} ${off ? 'disabled' : 'enabled'}`, {zone: zone.id}, {historic: true});
      if (!off) for (const device of model.fixture.devices.filter(device => device.zone === zone.id)) {
        if (state.inputs[device.id] === 'fire' && !disabled(model, state, device.id)) addFire(model, state, device.id);
      }
    }
    state.message = zones.length === 1 ? `Zone ${zones[0].number} ${off ? 'disabled' : 'enabled'}` : `Zones ${off ? 'disabled' : 'enabled'}`;
    return true;
  }
  if (/^(prepare-|set-|view-)(device|zone|local|io|custom)-label$/.test(name) || name === 'view-device' || name === 'view-zone') {
    let [, mode, target] = name.match(/^(prepare|set|view)-(device|zone|local|io|custom)/) || [];
    const device = target === 'device' || target === 'io' ? selectedDevices(model, state, {single: true})[0] : null;
    const zone = target === 'zone' ? selectedZones(model, state, {single: true})[0] : null;
    const io = target === 'io' ? ioKey(model, state) : null;
    if ((target === 'device' && !device) || (target === 'zone' && !zone) || (target === 'io' && !io)) return reject(state, key, 'Select a valid item in the fictional site before reading or editing its label.', 'invalid-target');
    const store = target === 'device' ? state.labels.devices : target === 'zone' ? state.labels.zones : target === 'io' ? state.labels.ios : state.labels;
    const id = target === 'device' ? device.id : target === 'zone' ? zone.id : target === 'io' ? io : target;
    if (mode === 'prepare') { state.form.label = store[id]; return true; }
    if (mode === 'view') {
      state.display = {heading: `${target === 'local' ? 'Local panel' : target[0].toUpperCase() + target.slice(1)} label`, lines: [store[id], ...(device ? [`Loop ${device.loop} Device ${device.address}`] : []), ...(zone ? [`Zone ${zone.number}`] : [])]};
      if (state.form.output === 'print') {
        state.printer.lastJob = {type: 'label', target, id, label: store[id], at: stamp(state)};
        state.display.heading = `FINDR print: ${target} label`;
        state.message = 'Fictional printer listing prepared in FINDR.';
      }
      event(state, 'label-viewed', 'Label displayed', {target, ...(device ? {device: device.id} : {}), ...(zone ? {zone: zone.id} : {})});
      return true;
    }
    const limit = target === 'device' ? device.type === 'mcp' ? 28 : 32 : target === 'local' || target === 'custom' ? 40 : 32;
    const label = text(state.form.label, limit);
    if (!label.trim()) return reject(state, key, 'Enter a label before accepting the edit.', 'invalid-label');
    store[id] = label;
    state.dirty = true;
    event(state, `${target}-label-set`, 'Label changed in the simulation; save to NVM to retain it after Reset.', {target, ...(device ? {device: device.id} : {}), ...(zone ? {zone: zone.id} : {}), label});
    state.message = 'Label changed — save to NVM';
    return true;
  }
  if (name === 'view-active-log' || name === 'view-history') {
    const historic = name === 'view-history';
    const eventNumber = Number(state.form.event || 1);
    if (historic && (!Number.isInteger(eventNumber) || eventNumber < 1 || eventNumber > MAX_HISTORY)) return reject(state, key, 'Historic event number must be between 1 and 255.', 'invalid-target');
    if (!historic && state.nodeId === 'active-card') {
      const card = Number(state.form.card);
      if (!String(state.form.card || '').trim() || ![0, 14, ...model.fixture.loops.map(loop => Number(loop.id))].includes(card)) return reject(state, key, 'Choose a commissioned card in the fictional site: 0, 1, 2 or 14.', 'invalid-target');
    }
    state.viewMode = historic ? 'history' : 'active';
    state.viewIndex = historic ? eventNumber - 1 : 0;
    state.display = null;
    if (state.form.output === 'print') state.printer.lastJob = {type: 'events', log: state.viewMode, event: eventNumber, at: stamp(state)};
    event(state, 'log-viewed', historic ? 'Historic events displayed' : 'Active events displayed', {log: state.viewMode, event: eventNumber});
    return true;
  }
  if (name === 'events-next' || name === 'events-previous') {
    scrollEvents(model, state, name === 'events-next' ? 1 : -1);
    return true;
  }
  if (name === 'view-map') {
    const card = Number(state.form.card || state.form.loop);
    if (!model.fixture.loops.some(loop => Number(loop.id ?? loop.number) === card)) return reject(state, key, 'Choose a loop card from the fictional site.', 'invalid-target');
    const devices = model.fixture.devices.filter(device => Number(device.loop) === card);
    state.display = {heading: `Loop ${card} map — FINDR fixture`, lines: devices.map(device => `${device.address}: ${state.labels.devices[device.id]}`)};
    if (state.form.output === 'print') {
      state.printer.lastJob = {type: 'map', card, rows: clone(state.display.lines), at: stamp(state)};
      state.display.heading = `FINDR print: Loop ${card} map`;
      state.message = 'Fictional printer listing prepared in FINDR.';
    }
    event(state, 'map-viewed', 'Fictional site device map displayed', {card});
    return true;
  }
  if (name === 'save-nvm') {
    if (state.disabledDevices.length || state.disabledZones.length) return reject(state, key, 'Save is unavailable while disablements are present. Re-enable the disabled parts first.', 'save-blocked');
    state.savedConfiguration = {labels: clone(state.labels), trainingPin: state.trainingPin, clock: clone(state.clock)};
    state.dirty = false;
    event(state, 'nvm-saved', 'FINDR changes saved to simulated NVM');
    state.message = 'Data backed up';
    return true;
  }
  if (name.startsWith('clock-')) {
    if (!state.clockDraft) { state.clockDraft = clone(state.clock); state.clockIndex = 0; }
    if (name === 'clock-next') {
      state.clockIndex = (state.clockIndex + 1) % CLOCK_FIELDS.length;
      event(state, 'clock-field-changed', 'Clock field selected', {field: CLOCK_FIELDS[state.clockIndex]});
    } else if (name === 'clock-retard' || name === 'clock-advance') {
      adjustClock(state, name === 'clock-advance' ? 1 : -1);
      event(state, 'clock-adjusted', 'Practice clock field adjusted', {field: CLOCK_FIELDS[state.clockIndex]});
    }
    else if (name === 'clock-set') {
      state.clock = validClock(state.clockDraft);
      state.dirty = true;
      event(state, 'clock-set', 'FINDR clock changed; save the changes to simulated NVM.');
      state.message = 'New time and date set';
    } else return sourceOnly(state, key);
    return true;
  }
  if (name === 'change-training-pin') {
    const value = String(state.form.newPin || state.form.pin || '');
    if (!/^\d{4,8}$/.test(value) || value === model.fixture.trainingEngineeringPin) return reject(state, key, 'For this FINDR customer practice credential use 4 to 8 digits, different from the engineering practice code.', 'invalid-pin');
    state.trainingPin = value;
    state.dirty = true;
    event(state, 'practice-pin-changed', 'FINDR practice code changed. Save to simulated NVM to retain it after Reset.', {}, {origin: 'trainer'});
    state.message = 'New access code set up';
    return true;
  }
  if (name === 'printer-toggle' || name === 'printer-on' || name === 'printer-off') {
    state.printer.enabled = name === 'printer-toggle' ? state.form.printerTarget === 'on' : name === 'printer-on';
    event(state, 'printer-changed', `Printer is ${state.printer.enabled ? 'on' : 'off'}`);
    state.message = `Printer is ${state.printer.enabled ? 'on' : 'off'}`;
    return true;
  }
  if (name === 'printer-test' || name === 'printer-feed') {
    if (!state.printer.enabled) return reject(state, key, 'Switch the practice printer on before using this function.');
    if (name === 'printer-test') state.printer.tests++;
    else state.printer.feeds += 8;
    state.printer.lastJob = {type: name, at: stamp(state), ...(name === 'printer-feed' ? {lines: 8} : {})};
    closeMenu(state);
    event(state, name, name === 'printer-test' ? 'FINDR printer character test' : 'FINDR printer: 8 line feeds');
    state.message = state.lastEvent.message;
    return true;
  }
  return sourceOnly(state, key, `The source map names “${name}”, but this operation is not executable in this release.`);
}

function applyButton(model, state, button, key) {
  if (!button || button.enabled === false) return reject(state, key, 'That function key has no active option here.');
  const name = typeof button.action === 'string' ? button.action : button.action?.type;
  const args = {...button.action?.args, ...button.args};
  if (name !== 'authenticate' && nodeAccess(model.nodes[button.to]) > state.authenticatedLevel) return reject(state, key, 'This menu requires the separate FINDR engineering practice code.', 'access-required');
  if (button.set) for (const [field, value] of Object.entries(button.set)) state.form[field] = text(field === 'printerTarget' && model.nodes[state.nodeId]?.behavior === 'printer' ? state.printer.enabled ? 'off' : 'on' : value, 80);
  if (!applyEffect(model, state, name, args, key)) return false;
  const message = state.message;
  const destination = name === 'authenticate'
    ? authenticationRoles(button).find(role => role.level === state.authenticatedLevel)?.to || button.to
    : button.to;
  if (destination) enterNode(model, state, destination, {preserveField: name?.startsWith('prepare-')});
  if (name && message) state.message = message;
  action(state, key, name || 'navigate', true, state.message, name ? state.lastEvent?.type : null);
  return true;
}

function editField(state, field, key) {
  const name = field.name;
  let value = String(state.form[name] ?? '');
  const max = field.maxLength || (field.kind === 'pin' ? 12 : field.kind === 'number' ? 9 : 40);
  state.cursor = Math.min(Math.max(0, state.cursor), value.length);
  if (key === 'LEFT') state.cursor = Math.max(0, state.cursor - 1);
  else if (key === 'RIGHT') state.cursor = Math.min(value.length, state.cursor + 1);
  else if (key === 'INSERT') state.insertMode = !state.insertMode;
  else if (key === 'SHIFT') state.shift = !state.shift;
  else if (key === 'DELETE' || key === 'BACKSPACE') {
    if (key === 'BACKSPACE' || state.cursor === value.length) {
      if (state.cursor > 0) { value = value.slice(0, state.cursor - 1) + value.slice(state.cursor); state.cursor--; }
    } else value = value.slice(0, state.cursor) + value.slice(state.cursor + 1);
    state.form[name] = value;
  } else {
    let character = key === 'SPACE' ? ' ' : key;
    if (character.length !== 1) return false;
    if (field.kind === 'number' && !/[0-9-]/.test(character)) return false;
    if (field.kind === 'pin' && !/[0-9]/.test(character)) return false;
    if (field.kind === 'text' && state.shift) character = character.toLowerCase();
    const insert = state.insertMode || field.kind !== 'text';
    const next = insert ? value.slice(0, state.cursor) + character + value.slice(state.cursor) : value.slice(0, state.cursor) + character + value.slice(state.cursor + 1);
    if (next.length > max) return false;
    state.form[name] = next;
    state.cursor++;
  }
  action(state, key, 'field-edit', true);
  return true;
}

function fieldFor(model, state, node) {
  if (!node?.field) return null;
  const field = {...node.field};
  if (field.name === 'label' && node.enter?.action === 'set-device-label') {
    const device = selectedDevices(model, state, {single: true})[0];
    if (device?.type === 'mcp') field.maxLength = Math.min(field.maxLength || 32, 28);
  }
  return field;
}

function resetSystem(model, state) {
  state.fireEvents = [];
  state.fireIndex = 0;
  state.alarmSounders = false;
  state.manualSounders = false;
  state.testCycles = {};
  state.buzzer = false;
  // The operating manual explicitly requires NVM backup for labels/passwords.
  state.labels = clone(state.savedConfiguration.labels);
  state.trainingPin = state.savedConfiguration.trainingPin;
  state.dirty = JSON.stringify(state.clock) !== JSON.stringify(state.savedConfiguration.clock);
  closeMenu(state);
  for (const device of model.fixture.devices) {
    if (state.inputs[device.id] === 'fire' && !disabled(model, state, device.id) && !state.testZones.includes(device.zone)) addFire(model, state, device.id);
  }
  if (count(state.faults)) state.buzzer = true;
  updateSounders(state);
  event(state, 'system-reset', 'System being Reset - please wait....', {fireReturned: state.fireEvents.length > 0});
  state.message = state.fireEvents.length ? 'System being Reset - please wait.... Fire returned: initiating condition is still active.' : 'System being Reset - please wait....';
}

function scrollFire(state, direction) {
  const subsequent = Math.max(0, state.fireEvents.length - 1);
  if (subsequent) state.fireIndex = (state.fireIndex + direction + subsequent) % subsequent;
  event(state, direction > 0 ? 'fire-next' : 'fire-previous', direction > 0 ? 'Next fire' : 'Previous fire', {index: state.fireIndex});
}

function activeEvents(model, state) {
  const fires = state.fireEvents.map(entry => ({...entry, type: 'fire', message: `Fire: ${state.labels.devices[entry.device]}`, loop: model.devices[entry.device].loop, address: model.devices[entry.device].address}));
  const faults = Object.values(state.faults).map(entry => ({...entry, type: 'fault'}));
  const devices = state.disabledDevices.map(device => ({type: 'disablement', device, loop: model.devices[device].loop, address: model.devices[device].address, message: `Device disabled at card ${model.devices[device].loop}: ${state.labels.devices[device]}`}));
  const zones = state.disabledZones.map(zone => ({type: 'disablement', zone, message: `Zone ${model.zones[zone].number} disabled: ${state.labels.zones[zone]}`}));
  let result = [...fires, ...faults, ...devices, ...zones];
  if (state.viewMode === 'active' && /^\d+$/.test(state.form.card || '')) {
    const card = Number(state.form.card);
    result = result.filter(entry => Number(entry.loop || 0) === card);
  }
  return result;
}

function scrollEvents(model, state, direction) {
  const entries = state.viewMode === 'history' ? state.history : activeEvents(model, state);
  if (entries.length) state.viewIndex = (state.viewIndex + direction + entries.length) % entries.length;
  event(state, direction > 0 ? 'events-next' : 'events-previous', direction > 0 ? 'Next event' : 'Previous event', {index: state.viewIndex, log: state.viewMode});
}

function canonicalKey(raw) {
  const value = String(raw ?? '');
  const aliases = {MENU: 'MENU_ON_OFF', MENU_ONOFF: 'MENU_ON_OFF', ARROWUP: 'PREVIOUS', ARROWDOWN: 'NEXT', ARROWLEFT: 'LEFT', ARROWRIGHT: 'RIGHT', ' ': 'SPACE', ESCAPE: 'MENU_ON_OFF'};
  return aliases[value.toUpperCase()] || value.toUpperCase();
}

/** A single physical key press. Mutates neither the input state nor the model. */
export function pressGentKey(model, previous, rawKey) {
  const state = clone(previous);
  const key = canonicalKey(rawKey);
  state.message = '';
  state.menuIdleMs = 0;
  if (key === 'PREVIOUS' || key === 'NEXT' || (!state.menuOpen && (key === 'F2' || key === 'F3'))) {
    scrollFire(state, key === 'NEXT' || key === 'F3' ? 1 : -1);
    action(state, key, 'fire-scroll', true, '', state.lastEvent.type);
    return state;
  }
  if (state.accessLevel < 2) {
    reject(state, key, 'These controls are behind the outer door. Open the FINDR practice door to use access level 2 controls.', 'access-required');
    return state;
  }
  if (key === 'MENU_ON_OFF') {
    if (state.menuOpen) closeMenu(state);
    else enterNode(model, state, model.menuRootId);
    action(state, key, 'menu', true);
    return state;
  }
  if (key === 'CANCEL_BUZZER') {
    state.buzzer = false;
    event(state, 'buzzer-cancelled', 'Buzzer cancelled');
    action(state, key, 'cancel-buzzer', true, 'Buzzer cancelled', 'buzzer-cancelled');
    return state;
  }
  if (key === 'SILENCE_ALARMS') {
    state.alarmSounders = false;
    state.manualSounders = false;
    for (const cycle of Object.values(state.testCycles)) cycle.silenced = true;
    updateSounders(state);
    event(state, 'alarms-silenced', 'Alarms silenced');
    action(state, key, 'silence-alarms', true, 'Alarms silenced', 'alarms-silenced');
    return state;
  }
  if (key === 'SOUND_ALARMS') {
    state.manualSounders = true;
    updateSounders(state);
    event(state, 'alarms-sounded', 'Alarms sounded');
    action(state, key, 'sound-alarms', true, 'Alarms sounded', 'alarms-sounded');
    return state;
  }
  if (key === 'RESET') {
    resetSystem(model, state);
    action(state, key, 'reset', true, state.message, 'system-reset');
    return state;
  }
  if (key === 'VERIFY' || /^U[1-4]$/.test(key)) {
    sourceOnly(state, key, key === 'VERIFY' ? 'Verify depends on commissioned alarm delays. It is not configured in this fictional site.' : 'This user function is commissioning-dependent and is not assigned in this fictional site.');
    return state;
  }
  if (!state.menuOpen) {
    reject(state, key, 'Press Menu On/Off to show the menu functions.');
    return state;
  }
  const node = model.nodes[state.nodeId];
  if (nodeAccess(node) > state.authenticatedLevel) {
    reject(state, key, 'This menu requires the separate FINDR engineering practice code.', 'access-required');
    return state;
  }
  if (node?.confidence === 'reference') {
    sourceOnly(state, key, node.note);
    return state;
  }
  // The operator guide explicitly supplies these soft keys for the Active list.
  if (state.viewMode === 'active' && ['F2', 'F3', 'F4'].includes(key)) {
    if (key === 'F4') closeMenu(state);
    else scrollEvents(model, state, key === 'F3' ? 1 : -1);
    action(state, key, key === 'F4' ? 'quit' : 'events-scroll', true, '', state.lastEvent?.type);
    return state;
  }
  if (/^F[1-4]$/.test(key)) {
    if (node?.behavior === 'printer' && !state.printer.enabled && ['F1', 'F2'].includes(key)) {
      reject(state, key, 'This function is available when the practice printer is switched on.');
      return state;
    }
    applyButton(model, state, softKeys(node).find(button => button.key === key), key);
    return state;
  }
  if (key === 'ENTER' && node?.enter) {
    applyButton(model, state, node.enter, key);
    return state;
  }
  if (node?.field && editField(state, fieldFor(model, state, node), key)) return state;
  reject(state, key, 'This key has no assigned action on the current display.');
  return state;
}

function changeZoneTest(model, state, zoneId, enabled, {key, origin}) {
  if (!model.zones[zoneId]) return reject(state, key, 'Choose a zone from the fictional site.');
  if (!enabled && model.fixture.devices.some(device => device.zone === zoneId && state.inputs[device.id] === 'fire')) {
    return reject(state, key, 'Restore the simulated fire input before finishing this FINDR test demonstration. The real-panel transition with an active test input is not modelled.', 'active-test-input');
  }
  state.testZones = enabled ? unique([...state.testZones, zoneId]) : state.testZones.filter(id => id !== zoneId);
  if (!enabled) {
    delete state.testCycles[zoneId];
    state.fireEvents = state.fireEvents.filter(entry => !(entry.test && entry.zone === zoneId));
    state.testSuppressedInputs = state.testSuppressedInputs.filter(id => model.devices[id].zone !== zoneId);
  }
  if (!state.fireEvents.length && !count(state.faults)) state.buzzer = false;
  updateSounders(state);
  event(state, enabled ? 'zone-test-on' : 'zone-test-off', `FINDR zone ${model.zones[zoneId].number} test ${enabled ? 'on' : 'off'}`, {zone: zoneId}, {origin});
  state.message = `Zone ${model.zones[zoneId].number} test ${enabled ? 'On' : 'Off'}`;
  return true;
}

/** Explicit scenario helper; the guided walk-test lessons use physical F-key commits. */
export function setGentZoneTest(model, previous, zoneId, enabled) {
  const state = clone(previous);
  if (changeZoneTest(model, state, zoneId, enabled, {key: 'TRAINER_ZONE_TEST', origin: 'trainer'})) {
    action(state, 'TRAINER_ZONE_TEST', 'zone-test', true, `${state.message}. This is a FINDR scenario control, separate from the physical engineering menu.`, state.lastEvent.type);
  }
  return state;
}

/** Advance practice timers; a guided lesson may pause only its zone-test cycles. */
export function tickGent(model, previous, elapsedMs, {pauseZoneTests = false} = {}) {
  const state = clone(previous);
  const elapsed = Math.min(IDLE_TIMEOUT_MS, Math.max(0, number(elapsedMs)));
  state.elapsedMs += elapsed;
  if (state.menuOpen) {
    state.menuIdleMs += elapsed;
    if (state.menuIdleMs >= IDLE_TIMEOUT_MS) {
      closeMenu(state);
      state.message = 'Menu closed after five minutes without a key press.';
    }
  }
  const displayWasActive = state.displayTestRemainingMs > 0;
  state.displayTestRemainingMs = Math.max(0, state.displayTestRemainingMs - elapsed);
  if (displayWasActive && !state.displayTestRemainingMs) {
    event(state, 'display-test-complete', 'Display test complete');
    state.message = '';
  }
  if (!pauseZoneTests) {
    for (const [zone, cycle] of Object.entries(state.testCycles)) {
      cycle.remainingMs = Math.max(0, cycle.remainingMs - elapsed);
      if (!cycle.remainingMs) {
        delete state.testCycles[zone];
        state.fireEvents = state.fireEvents.filter(entry => !(entry.test && entry.zone === zone));
        state.testSuppressedInputs = unique([...state.testSuppressedInputs, cycle.device]);
        event(state, 'test-complete', 'FINDR zone test: sounders silenced and test fire reset after five seconds.', {zone, device: cycle.device}, {origin: 'trainer'});
        state.message = 'Test cycle complete. Restore the simulated input; switch zone test Off when finished.';
      }
    }
  }
  if (!state.fireEvents.length && !count(state.faults)) state.buzzer = false;
  updateSounders(state);
  return state;
}

/** On leaving/reloading FINDR, temporary practice tests stop; disablements persist. */
export function leaveGent(model, previous) {
  const state = clone(previous);
  closeMenu(state);
  const testDevices = unique([
    ...state.fireEvents.filter(entry => entry.test).map(entry => entry.device),
    ...Object.values(state.testCycles).map(cycle => cycle.device),
    ...state.testSuppressedInputs,
  ]);
  state.testZones = [];
  state.testCycles = {};
  state.testSuppressedInputs = [];
  state.displayTestRemainingMs = 0;
  state.fireEvents = state.fireEvents.filter(entry => !entry.test);
  // Scenario stimuli introduced for a temporary test are removed by the trainer.
  for (const device of testDevices) state.inputs[device] = 'normal';
  if (!state.fireEvents.length && !count(state.faults)) state.buzzer = false;
  updateSounders(state);
  state.lastAction = null;
  state.message = '';
  return state;
}

function validClock(raw) {
  const c = {
    hour: Math.max(0, Math.min(23, Math.trunc(number(raw.hour, 12)))),
    minute: Math.max(0, Math.min(59, Math.trunc(number(raw.minute, 0)))),
    day: Math.max(1, Math.min(31, Math.trunc(number(raw.day, 1)))),
    month: Math.max(1, Math.min(12, Math.trunc(number(raw.month, 1)))),
    year: Math.max(2000, Math.min(2099, Math.trunc(number(raw.year, 2015)))),
  };
  c.day = Math.min(c.day, new Date(Date.UTC(c.year, c.month, 0)).getUTCDate());
  return c;
}

function adjustClock(state, amount) {
  const key = CLOCK_FIELDS[state.clockIndex];
  const limits = {hour: [0, 23], minute: [0, 59], day: [1, new Date(Date.UTC(state.clockDraft.year, state.clockDraft.month, 0)).getUTCDate()], month: [1, 12], year: [2000, 2099]};
  const [min, max] = limits[key];
  const value = state.clockDraft[key] + amount;
  state.clockDraft[key] = value > max ? min : value < min ? max : value;
  state.clockDraft = validClock(state.clockDraft);
}

function restoredLabels(model, raw, fallback = initialLabels(model)) {
  const labels = clone(fallback);
  if (!raw || typeof raw !== 'object') return labels;
  for (const device of model.fixture.devices) if (typeof raw.devices?.[device.id] === 'string') labels.devices[device.id] = text(raw.devices[device.id], device.type === 'mcp' ? 28 : 32);
  for (const zone of model.fixture.zones) if (typeof raw.zones?.[zone.id] === 'string') labels.zones[zone.id] = text(raw.zones[zone.id], 32);
  for (const id of Object.keys(labels.ios)) if (typeof raw.ios?.[id] === 'string') labels.ios[id] = text(raw.ios[id], 32);
  for (const key of ['local', 'custom']) if (typeof raw[key] === 'string') labels[key] = text(raw[key], 40);
  return labels;
}

/** Defensive restore: keep known site conditions, never resume a menu, PIN draft or timed test. */
export function restoreGentState(model, saved) {
  if (!saved || saved.version !== VERSION || saved.panelId !== model.id || saved.fixtureId !== model.fixture.id || saved.mapVersion !== model.mapVersion || saved.sourceFingerprint !== model.sourceFingerprint) return createGentState(model);
  const state = baseState(model, saved.accessLevel);
  state.scenarioId = model.scenarioById[saved.scenarioId] ? saved.scenarioId : 'normal';
  for (const id of Object.keys(state.inputs)) if (INPUTS.has(saved.inputs?.[id])) state.inputs[id] = saved.inputs[id];
  state.disabledDevices = unique(list(saved.disabledDevices).filter(id => model.devices[id]));
  state.disabledZones = unique(list(saved.disabledZones).filter(id => model.zones[id]));
  state.labels = restoredLabels(model, saved.labels);
  state.clock = validClock(saved.clock || state.clock);
  state.savedConfiguration = {
    labels: restoredLabels(model, saved.savedConfiguration?.labels),
    trainingPin: /^\d{4,8}$/.test(saved.savedConfiguration?.trainingPin) && saved.savedConfiguration.trainingPin !== model.fixture.trainingEngineeringPin ? saved.savedConfiguration.trainingPin : model.fixture.trainingPin,
    clock: validClock(saved.savedConfiguration?.clock || defaultClock(model)),
  };
  state.trainingPin = /^\d{4,8}$/.test(saved.trainingPin) && saved.trainingPin !== model.fixture.trainingEngineeringPin ? saved.trainingPin : model.fixture.trainingPin;
  state.dirty = truth(saved.dirty);
  state.printer = {enabled: truth(saved.printer?.enabled), feeds: Math.max(0, number(saved.printer?.feeds)), tests: Math.max(0, number(saved.printer?.tests)), lastJob: null};
  state.sequence = Math.max(0, Math.min(1000000, Math.trunc(number(saved.sequence))));
  const testIds = new Set([
    ...list(saved.fireEvents).filter(entry => entry?.test).map(entry => entry.device),
    ...Object.values(saved.testCycles || {}).map(cycle => cycle?.device),
    ...list(saved.testSuppressedInputs),
  ]);
  for (const id of testIds) if (model.devices[id]) state.inputs[id] = 'normal';
  const seen = new Set();
  for (const entry of list(saved.fireEvents)) {
    const device = model.devices[entry?.device];
    if (!device || entry.test || seen.has(device.id)) continue;
    seen.add(device.id);
    state.fireEvents.push({device: device.id, zone: device.zone, sequence: Math.max(0, number(entry.sequence)), at: text(entry.at, 40), test: false});
  }
  for (const id of Object.keys(saved.faults || {})) {
    const fault = model.knownFaults[id] || (id.startsWith('input:') && model.devices[id.slice(6)] ? inputFault(model, id.slice(6)) : null);
    if (fault) state.faults[id] = clone(fault);
  }
  for (const [id, input] of Object.entries(state.inputs)) if (input === 'fault' && !Object.values(state.faults).some(fault => fault.device === id && fault.kind === 'device')) state.faults[`input:${id}`] = inputFault(model, id);
  state.buzzer = truth(saved.buzzer);
  state.alarmSounders = truth(saved.alarmSounders) && state.fireEvents.length > 0;
  state.manualSounders = truth(saved.manualSounders);
  for (const [id, input] of Object.entries(state.inputs)) if (input === 'fire' && !disabled(model, state, id) && !seen.has(id)) addFire(model, state, id);
  state.history = list(saved.history).slice(0, MAX_HISTORY).filter(entry => entry && typeof entry.type === 'string').map(entry => ({
    type: text(entry.type, 60), sequence: Math.max(0, number(entry.sequence)), at: text(entry.at, 40), message: text(entry.message, 200),
    ...(model.devices[entry.device] ? {device: entry.device} : {}), ...(model.zones[entry.zone] ? {zone: entry.zone} : {}),
    origin: entry.origin === 'trainer' ? 'trainer' : 'panel-simulation',
  }));
  state.lastEvent = null;
  updateSounders(state);
  return state;
}

function statusFor(model, state) {
  const fireCount = state.fireEvents.length;
  const faultCount = count(state.faults);
  const disablementCount = state.disabledDevices.length + state.disabledZones.length;
  const testCount = state.testZones.length;
  return {
    normal: !fireCount && !faultCount && !disablementCount && !testCount && !state.sounders && !state.displayTestRemainingMs,
    fireCount, faultCount, disablementCount, testCount,
    fireZones: unique(state.fireEvents.map(entry => entry.zone)), fireDevices: state.fireEvents.map(entry => entry.device),
    buzzer: state.buzzer || state.displayTestRemainingMs > 0, sounders: state.sounders, manualSounders: state.manualSounders,
    accessLevel: state.accessLevel, authenticatedLevel: state.authenticatedLevel, dirty: state.dirty,
  };
}

function normalScreen(model, state, status) {
  if (state.fireEvents.length) {
    const first = state.fireEvents[0];
    const later = state.fireEvents.length > 1 ? state.fireEvents[1 + (state.fireIndex % (state.fireEvents.length - 1))] : null;
    const lines = [`1st Fire: Zone ${model.zones[first.zone]?.number || first.zone}`, state.labels.zones[first.zone], state.labels.devices[first.device], `Loop ${model.devices[first.device].loop} Device ${model.devices[first.device].address}`];
    if (later) lines.push(`Next Fire: Zone ${model.zones[later.zone]?.number || later.zone}`, state.labels.devices[later.device]);
    return {heading: `Fire ${status.fireCount}`, lines};
  }
  if (status.faultCount) {
    const fault = Object.values(state.faults)[0];
    return {heading: `Fault ${status.faultCount}`, lines: [fault.message, ...(fault.device ? [state.labels.devices[fault.device], `Loop ${model.devices[fault.device].loop} Device ${model.devices[fault.device].address}`] : []), `Disable: ${status.disablementCount}`]};
  }
  if (status.disablementCount) {
    const device = state.disabledDevices[0], zone = state.disabledZones[0];
    return {heading: `Disable: ${status.disablementCount}`, lines: device ? [`Device Disabled at card ${model.devices[device].loop}`, state.labels.devices[device]] : [`Zone ${model.zones[zone].number} disabled`, state.labels.zones[zone]]};
  }
  if (status.testCount) return {heading: 'Zone test active', lines: state.testZones.map(id => `Zone ${model.zones[id].number}: ${state.labels.zones[id]}`)};
  if (state.sounders) return {heading: 'Alarms sounded', lines: ['FINDR manual alarm output', 'No fire input is latched.']};
  return {heading: 'Panel Healthy', lines: ['Vigilon Fire System', state.labels.custom, state.labels.local]};
}

function resolveLines(lines, state) {
  return list(lines).map(line => text(typeof line === 'string' ? line.replace(/\{(\w+)\}/g, (_, name) => String(state.form[name] ?? '')) : line?.text || '', 40));
}

/** Stable presentation model consumed by the GENT controller. */
export function gentView(model, state) {
  const node = state.menuOpen ? model.nodes[state.nodeId] : null;
  const status = statusFor(model, state);
  let screen = normalScreen(model, state, status);
  let buttons = node && node.confidence !== 'reference' ? softKeys(node).map(button => ({key: button.key, label: button.label, enabled: button.enabled !== false})) : [];
  if (node?.behavior === 'printer') buttons = buttons.filter(button => state.printer.enabled || !['F1', 'F2'].includes(button.key)).map(button => button.key === 'F3' ? {...button, label: state.printer.enabled ? 'Off' : 'On'} : button);
  if (node) screen = {heading: node.title || node.label || node.id, lines: resolveLines(node.lines, state)};
  if (state.display) screen = clone(state.display);
  if (state.clockDraft && node?.behavior === 'clock') screen = {heading: node.title || 'Set Clock', lines: [stamp({...state, clock: state.clockDraft}), `Editing: ${CLOCK_FIELDS[state.clockIndex]}`, 'Next / Retard / Advance / Enter']};
  if (state.viewMode) {
    const rows = state.viewMode === 'history' ? state.history : activeEvents(model, state);
    const entry = rows[state.viewIndex];
    screen = {heading: `${state.form.output === 'print' ? 'FINDR print ' : ''}${state.viewMode === 'history' ? 'Historic' : 'Active'} ${rows.length ? state.viewIndex + 1 : 0}/${rows.length}`, lines: entry ? [entry.message, ...(entry.device ? [state.labels.devices[entry.device]] : []), entry.at || 'Current condition'] : ['No event at this position.']};
    if (state.viewMode === 'active') buttons = [{key: 'F2', label: 'Previous', enabled: true}, {key: 'F3', label: 'Next', enabled: true}, {key: 'F4', label: 'Quit', enabled: true}];
  }
  if (state.displayTestRemainingMs > 0) {
    screen = {heading: 'Display Test', lines: ['All indicators illuminated', 'Two-tone internal buzzer test', 'Approximately four seconds']};
    buttons = [];
  }
  const field = node?.field && !state.display && !state.viewMode ? {
    ...fieldFor(model, state, node), value: String(state.form[node.field.name] ?? ''),
    displayValue: node.field.kind === 'pin' ? '•'.repeat(String(state.form[node.field.name] ?? '').length) : String(state.form[node.field.name] ?? ''),
    cursor: state.cursor, insertMode: state.insertMode,
  } : null;
  if (field) screen.lines = [...screen.lines, `${field.label || field.name}: ${field.displayValue || '_'}`];
  const faults = Object.values(state.faults);
  const states = {
    power: 'on', fire: status.fireCount ? 'on' : 'off', fault: status.faultCount ? 'on' : 'off',
    'power-fault': faults.some(fault => fault.kind === 'power') ? 'on' : 'off',
    'system-fault': faults.some(fault => fault.kind === 'system') ? 'on' : 'off',
    disablement: status.disablementCount ? 'on' : 'off', test: status.testCount ? 'on' : 'off',
    sounder: faults.some(fault => fault.kind === 'sounder') ? 'flashing' : 'off',
    'fire-routing-fault': faults.some(fault => fault.kind === 'fare') ? 'on' : 'off',
  };
  const leds = model.leds.map(led => ({...led, state: state.displayTestRemainingMs > 0 ? 'on' : states[led.id] || 'off'}));
  const devices = model.fixture.devices.map(device => {
    const disablementScopeUnknown = device.type === 'mcp' && state.disabledZones.includes(device.zone) && !state.disabledDevices.includes(device.id);
    return {...device, label: state.labels.devices[device.id], input: state.inputs[device.id], disabled: state.disabledDevices.includes(device.id), effectivelyDisabled: disablementScopeUnknown ? null : disabled(model, state, device.id), disablementScopeUnknown, fire: status.fireDevices.includes(device.id)};
  });
  const zones = model.fixture.zones.map(zone => ({...zone, label: state.labels.zones[zone.id], disabled: state.disabledZones.includes(zone.id), test: state.testZones.includes(zone.id), fire: status.fireZones.includes(zone.id)}));
  const operatorSource = list(model.sources).find(source => source.id === 'gent-vigilon-4188-1025-2015');
  const statusReferences = operatorSource ? [{sourceId: operatorSource.id, pages: status.fireCount ? [8, 14, 15] : status.faultCount ? [8, 16, 17] : status.disablementCount ? [8, 18, 19] : [8, 11]}] : [];
  return {
    panelId: model.id, nodeId: state.nodeId, menuOpen: state.menuOpen,
    screen: {...screen, heading: text(screen.heading, 40), lines: list(screen.lines).slice(0, 6).map(line => text(line, 40)), softKeys: buttons, field, message: state.message},
    softKeys: buttons, physicalKeys: model.physicalKeys.map(key => ({...key, enabled: state.accessLevel >= 2 || ['PREVIOUS', 'NEXT', 'F2', 'F3'].includes(key.id)})),
    leds, breadcrumb: state.trail.map(id => ({id, title: model.nodes[id]?.title || id})),
    references: clone(node?.sourceRefs || model.sourceRefs || statusReferences), note: node?.note || node?.fieldHelp || '',
    devices, zones, status, events: clone(state.history), lastEvent: clone(state.lastEvent), lastAction: clone(state.lastAction),
    form: clone(state.form), clock: clone(state.clock), clockDraft: clone(state.clockDraft), clockField: CLOCK_FIELDS[state.clockIndex],
    printer: clone(state.printer), activeLog: activeEvents(model, state), faults: clone(faults),
    displayTestRemainingMs: state.displayTestRemainingMs, testCycles: clone(state.testCycles),
  };
}

/** True when all lesson conditions describe the current outcome. */
export function evaluateGentConditions(model, state, conditions) {
  if (Array.isArray(conditions)) return conditions.every(condition => evaluateGentConditions(model, state, condition));
  if (!conditions || typeof conditions !== 'object') return false;
  const c = conditions, status = statusFor(model, state), value = c.value;
  if (c.type === 'all') return list(c.conditions).every(condition => evaluateGentConditions(model, state, condition));
  if (c.type === 'any') return list(c.conditions).some(condition => evaluateGentConditions(model, state, condition));
  if (c.type === 'page') return (state.menuOpen ? state.nodeId : 'status') === value;
  if (c.type === 'deviceDisabled') return !!model.devices[c.device] && state.disabledDevices.includes(c.device) === value;
  if (c.type === 'zoneDisabled') return !!model.zones[c.zone] && state.disabledZones.includes(c.zone) === value;
  if (c.type === 'zoneTest') return !!model.zones[c.zone] && state.testZones.includes(c.zone) === value;
  if (c.type === 'testCycleActive') return !!model.zones[c.zone] && Boolean(state.testCycles[c.zone]?.remainingMs > 0) === value;
  if (c.type === 'testCycleRemainingMs') return !!model.zones[c.zone] && (state.testCycles[c.zone]?.remainingMs || 0) === value;
  if (c.type === 'input') return state.inputs[c.device] === value;
  if (c.type === 'menuOpen') return state.menuOpen === value;
  if (c.type === 'fire') return (status.fireCount > 0) === value;
  if (c.type === 'fault') return (status.faultCount > 0) === value;
  if (c.type === 'event') return state.lastEvent?.type === value && (!c.device || state.lastEvent.device === c.device) && (!c.zone || state.lastEvent.zone === c.zone);
  if (c.type === 'access') return state.authenticatedLevel === value;
  if (c.type === 'field') return String(state.form[c.name] ?? '') === String(value);
  if (c.type === 'printer') return state.printer.enabled === value;
  if (c.type === 'label') {
    const label = c.device ? state.labels.devices[c.device] : c.zone ? state.labels.zones[c.zone] : c.target === 'io' ? state.labels.ios[c.io] : state.labels[c.target || 'local'];
    return label === value;
  }
  if (Object.hasOwn(status, c.type)) return status[c.type] === value;
  return false;
}

/**
 * Shortest source-defined navigation route. The result is only advice: no key is
 * pressed and no panel condition/configuration is changed while planning.
 * Configuration commits, sounder controls and Reset are never route edges.
 */
export function findGentRoute(model, state, targetId) {
  const result = (found, keys = [], nodeIds = [], reason = '') => ({found, keys, targetId, nodeIds, reason});
  if (targetId === 'status') return result(true, state.menuOpen ? ['MENU_ON_OFF'] : [], [], '');
  if (!model.nodes[targetId]) return result(false, [], [], 'This destination is not in the selected source map.');
  if (state.menuOpen && state.nodeId === targetId && nodeAccess(model.nodes[targetId]) <= state.authenticatedLevel) return result(true, [], [targetId]);
  if (state.accessLevel < 2) return result(false, [], [], 'Open the FINDR practice door before using the menu controls.');
  const queue = state.menuOpen && state.viewMode !== 'active'
    ? [{id: state.nodeId, auth: state.authenticatedLevel, keys: [], ids: [state.nodeId]}, {id: model.menuRootId, auth: 0, keys: ['MENU_ON_OFF', 'MENU_ON_OFF'], ids: [model.menuRootId]}]
    : [{id: model.menuRootId, auth: 0, keys: state.menuOpen ? ['MENU_ON_OFF', 'MENU_ON_OFF'] : ['MENU_ON_OFF'], ids: [model.menuRootId]}];
  const visited = new Map();
  while (queue.length) {
    queue.sort((a, b) => a.keys.length - b.keys.length);
    const item = queue.shift();
    const node = model.nodes[item.id];
    if (!node || nodeAccess(node) > item.auth) continue;
    if (item.id === targetId) return result(true, item.keys, item.ids);
    const visitId = `${item.id}:${item.auth}`;
    if ((visited.get(visitId) ?? Infinity) <= item.keys.length) continue;
    visited.set(visitId, item.keys.length);
    if (node.confidence === 'reference') continue;
    for (const button of softKeys(node)) {
      const effect = typeof button.action === 'string' ? button.action : button.action?.type;
      if (!button.to || button.to === 'status' || button.enabled === false || (effect && effect !== 'reference')) continue;
      const to = button.to === 'info' && item.id !== 'info-output' && model.nodes['info-output'] && model.fixture.printerFitted && state.printer.enabled ? 'info-output' : button.to;
      if (nodeAccess(model.nodes[to]) > item.auth) continue;
      queue.push({id: to, auth: item.auth, keys: [...item.keys, button.key], ids: [...item.ids, to]});
    }
    const enter = node.enter;
    const effect = typeof enter?.action === 'string' ? enter.action : enter?.action?.type;
    if (enter?.to && effect === 'authenticate' && node.field?.name === 'pin') {
      const current = state.menuOpen && state.nodeId === node.id ? String(state.form.pin || '') : '';
      // Replanning after every tap must make progress through a correct prefix.
      // Cursor recovery uses only documented edit keys, never a fabricated clear.
      const cursor = state.menuOpen && state.nodeId === node.id ? Math.min(state.cursor, current.length) : current.length;
      const moveToEnd = Array.from({length: Math.max(0, current.length - cursor)}, () => 'RIGHT');
      for (const role of authenticationRoles(enter)) {
        const pin = String(practiceCredential(model, state, role));
        let prefix = 0;
        while (prefix < current.length && prefix < pin.length && current[prefix] === pin[prefix]) prefix++;
        const clear = Array.from({length: current.length - prefix}, () => 'DELETE');
        queue.push({id: role.to, auth: role.level, keys: [...item.keys, ...moveToEnd, ...clear, ...pin.slice(prefix), 'ENTER'], ids: [...item.ids, role.to]});
      }
    } else if (enter?.to && !effect) queue.push({id: enter.to, auth: item.auth, keys: [...item.keys, 'ENTER'], ids: [...item.ids, enter.to]});
  }
  return result(false, [], [], 'This destination requires a deliberate operation or an unresolved route. Open its help or follow a sourced lesson.');
}
