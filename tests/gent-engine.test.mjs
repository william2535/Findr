import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  buildGentModel, createGentState, pressGentKey, setGentDeviceInput, setGentFault,
  setGentAccess, loadGentScenario, setGentZoneTest, tickGent, leaveGent,
  restoreGentState, gentView, evaluateGentConditions, findGentRoute,
} from '../public/app/gent-engine.mjs';

const read = name => JSON.parse(readFileSync(new URL(`../public/app/data/${name}.json`, import.meta.url)));
const data = read('gent-vigilon');
const model = buildGentModel(data);
const start = scenarioId => createGentState(model, {scenarioId: scenarioId || 'normal'});
const press = (state, ...keys) => keys.flat().reduce((current, key) => pressGentKey(model, current, key), state);
const view = state => gentView(model, state);
const control = state => press(state, 'MENU_ON_OFF', 'F1', 'F4', ...'2468', 'ENTER');
const setup = state => press(state, 'MENU_ON_OFF', 'F2', 'F4', ...'2468', 'ENTER');
const engineering = (state, pin = '3917') => press(state, 'MENU_ON_OFF', 'F4', 'F4', ...pin, 'ENTER');
const walkTestForm = (state, enabled) => press(engineering(close(state)), 'F4', 'F2', 'F4', enabled ? 'F2' : 'F1');
const disableDevice = (state, address = '1', loop = '1') => press(control(state), 'F2', 'F1', ...address, 'F2', ...loop, 'F2');
const enableDevice = (state, address = '1', loop = '1') => press(control(state), 'F1', 'F1', ...address, 'F2', ...loop, 'F2');
const disableZone = (state, zone = '2') => press(control(state), 'F2', 'F4', 'F2', ...zone, 'F2');
const enableZone = (state, zone = '2') => press(control(state), 'F1', 'F4', 'F2', ...zone, 'F2');
const close = state => state.menuOpen ? press(state, 'MENU_ON_OFF') : state;
const savedEffects = state => JSON.stringify({
  inputs: state.inputs, disabledDevices: state.disabledDevices, disabledZones: state.disabledZones,
  testZones: state.testZones, fireEvents: state.fireEvents, faults: state.faults,
  buzzer: state.buzzer, sounders: state.sounders, labels: state.labels,
  savedConfiguration: state.savedConfiguration, clock: state.clock, printer: state.printer,
});

function route(state, target, limit = 100) {
  const keys = [];
  while (keys.length < limit) {
    const advice = findGentRoute(model, state, target);
    assert.equal(advice.found, true, `${target}: ${advice.reason}`);
    if (!advice.keys.length) return {state, keys};
    keys.push(advice.keys[0]);
    state = press(state, advice.keys[0]);
    assert.equal(state.lastAction.ok, true, `${target}: ${keys.at(-1)} — ${state.lastAction.message}`);
  }
  assert.fail(`Adaptive route did not terminate: ${target}`);
}

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) freeze(item);
  }
  return value;
}

test('GENT compiles a separate, sourced model with the exact fixture and physical key identities', () => {
  assert.equal(model.id, 'gent-vigilon');
  assert.equal(model.fixture.loops.length, 2);
  assert.equal(model.fixture.zones.length, 3);
  assert.equal(model.fixture.devices.length, 6);
  assert.ok(model.nodeList.length >= 90);
  for (const node of model.nodeList) assert.ok(node.sourceRefs.length, node.id);
  assert.ok(model.physicalKeys.some(key => key.id === 'ENTER'));
  assert.ok(model.physicalKeys.some(key => key.id === 'F2'));
  assert.ok(!model.physicalKeys.some(key => key.id === 'BACK'));
  assert.throws(() => buildGentModel({...data, nodes: [...data.nodes, data.nodes[0]]}), /unique/);
  assert.throws(() => buildGentModel({...data, menuRootId: 'missing'}), /root/);
});

test('a healthy panel has only the green Power indicator and no intruder arming state', () => {
  const state = start(), v = view(state);
  assert.equal(v.status.normal, true);
  assert.deepEqual(v.leds.filter(led => led.state !== 'off').map(led => led.id), ['power']);
  assert.equal(v.leds.find(led => led.id === 'power').color, 'green');
  assert.equal(v.leds.find(led => led.id === 'fire').color, 'red');
  assert.equal(v.leds.find(led => led.id === 'fault').color, 'amber');
  assert.ok(v.references.some(ref => ref.pages.includes(8)));
  assert.equal(v.screen.heading, 'Panel Healthy');
  assert.equal(Object.hasOwn(state, 'armed'), false);
  assert.equal(Object.hasOwn(state, 'omittedZones'), false);
  assert.equal(state.trainingPin, '2468');
  assert.equal(state.authenticatedLevel, 0);
});

test('the closed practice door allows fire scrolling but does not grant controls or PIN access', () => {
  let state = setGentAccess(model, start('multiple-fires'), 1);
  const before = savedEffects(state);
  state = press(state, 'CANCEL_BUZZER');
  assert.equal(state.lastAction.ok, false);
  assert.equal(savedEffects(state), before);
  state = press(state, 'NEXT');
  assert.equal(state.lastEvent.type, 'fire-next');
  assert.equal(state.authenticatedLevel, 0);
  assert.equal(findGentRoute(model, state, 'control').found, false);
});

test('Cancel Buzzer affects the internal buzzer, while Silence Alarms affects alarm sounders', () => {
  const fire = start('fire');
  const muted = press(fire, 'CANCEL_BUZZER');
  assert.equal(muted.buzzer, false);
  assert.equal(muted.sounders, true);
  assert.equal(muted.fireEvents.length, 1);
  assert.equal(muted.lastAction.message, 'Buzzer cancelled');
  const silenced = press(fire, 'SILENCE_ALARMS');
  assert.equal(silenced.sounders, false);
  assert.equal(silenced.buzzer, true);
  assert.equal(silenced.fireEvents.length, 1);
  assert.equal(silenced.lastAction.message, 'Alarms silenced');
  assert.equal(fire.buzzer, true, 'reducers must not mutate their input');
});

test('manual sounding is independent of Fire and the amber Sounder fault/disablement indicator', () => {
  let state = press(start(), 'SOUND_ALARMS');
  assert.equal(state.sounders, true);
  assert.equal(state.fireEvents.length, 0);
  assert.equal(view(state).leds.find(led => led.id === 'fire').state, 'off');
  assert.equal(view(state).leds.find(led => led.id === 'sounder').state, 'off');
  state = press(state, 'SILENCE_ALARMS');
  assert.equal(view(state).status.normal, true);
});

test('restoring an initiating input leaves a latched fire and zone indicator until Reset', () => {
  let state = setGentDeviceInput(model, start('fire'), 'L1D1', 'normal');
  assert.equal(state.fireEvents.length, 1);
  assert.equal(view(state).zones.find(zone => zone.id === 'Z1').fire, true);
  state = press(state, 'SILENCE_ALARMS', 'RESET');
  assert.equal(view(state).status.normal, true);
  assert.equal(view(state).zones.find(zone => zone.id === 'Z1').fire, false);
});

test('Reset cannot repair an active detector, an independent fault, or a disablement', () => {
  const state = press(start('mixed-conditions'), 'CANCEL_BUZZER', 'SILENCE_ALARMS', 'RESET');
  assert.equal(state.fireEvents.length, 1);
  assert.equal(state.sounders, true);
  assert.equal(state.buzzer, true);
  assert.equal(Object.keys(state.faults).length, 1);
  assert.deepEqual(state.disabledZones, ['Z2']);
  assert.equal(state.lastEvent.type, 'system-reset');
  assert.equal(state.lastEvent.fireReturned, true);
});

test('a new fire after silence reactivates the buzzer and sounders', () => {
  let state = press(start('fire'), 'CANCEL_BUZZER', 'SILENCE_ALARMS');
  state = setGentDeviceInput(model, state, 'L2D1', 'fire');
  assert.equal(state.fireEvents.length, 2);
  assert.equal(state.buzzer, true);
  assert.equal(state.sounders, true);
});

test('the first fire remains pinned when the later events scroll', () => {
  let state = start('multiple-fires');
  const before = view(state).screen.lines;
  state = press(state, 'NEXT');
  const after = view(state).screen.lines;
  assert.deepEqual(after.slice(0, 4), before.slice(0, 4));
  assert.notDeepEqual(after.slice(4), before.slice(4));
  state = press(state, 'PREVIOUS');
  assert.deepEqual(view(state).screen.lines, before);
  state = press(state, 'F3');
  assert.deepEqual(view(state).screen.lines, after);
  assert.equal(view(state).status.fireCount, 3);
});

test('fault restoration removes the active fault but retains the historic event', () => {
  let state = start('fault');
  assert.equal(view(state).screen.lines[0], 'Lost Device');
  assert.equal(view(state).devices.find(device => device.id === 'L1D3').input, 'fault');
  assert.equal(state.sounders, false);
  state = press(state, 'CANCEL_BUZZER', 'RESET');
  assert.equal(view(state).status.faultCount, 1);
  state = setGentFault(model, state, 'L1D3-removed', false);
  assert.equal(view(state).status.normal, true);
  assert.ok(state.history.some(event => event.type === 'fault-detected'));
  assert.ok(state.history.some(event => event.type === 'fault-restored'));
  const rejected = setGentFault(model, state, 'unknown-live-site-fault', true);
  assert.equal(rejected.lastAction.ok, false);
  assert.equal(view(rejected).status.faultCount, 0);
  const restoredByInput = setGentDeviceInput(model, start('fault'), 'L1D3', 'normal');
  assert.equal(view(restoredByInput).status.normal, true, 'the labelled FINDR input helper can restore its seeded device fault');
  assert.equal(view(restoreGentState(model, start('fault'))).status.faultCount, 1, 'restoring a seeded fault must not duplicate it');
});

test('the exact sensing route requires PIN, address, loop and the F2 Enter prompt', () => {
  let state = press(control(start()), 'F2', 'F1', '1', 'F2', '1');
  assert.equal(state.nodeId, 'disable-device-loop');
  state = press(state, 'ENTER');
  assert.equal(state.lastAction.ok, false);
  assert.deepEqual(state.disabledDevices, []);
  state = press(state, 'F2');
  assert.deepEqual(state.disabledDevices, ['L1D1']);
  assert.equal(state.lastEvent.type, 'device-disabled');
  assert.equal(view(state).leds.find(led => led.id === 'disablement').state, 'on');
  assert.equal(view(state).leds.find(led => led.id === 'fault').state, 'off');
});

test('invalid credentials and fictional-site addresses cannot produce successful operations', () => {
  let state = press(start(), 'MENU_ON_OFF', 'F1', 'F4', '1', '1', '1', '1', 'ENTER');
  assert.equal(state.nodeId, 'control-pin');
  assert.equal(state.authenticatedLevel, 0);
  assert.equal(state.lastAction.ok, false);
  state = press(state, 'DELETE', 'DELETE', 'DELETE', 'DELETE', ...'2468', 'ENTER');
  assert.equal(state.authenticatedLevel, 2);
  assert.equal(Object.hasOwn(state.form, 'pin'), false);
  state = press(state, 'F2', 'F1', ...'199', 'F2', '1', 'F2');
  assert.equal(state.lastAction.ok, false);
  assert.deepEqual(state.disabledDevices, []);
  assert.equal(disableDevice(start(), '1-2').lastAction.ok, false, 'range syntax is outside this fixture');
});

test('device and zone disablements are separate, and Reset is not an enable command', () => {
  let state = disableDevice(start(), '3');
  state = disableZone(close(state));
  state = enableZone(close(state));
  assert.deepEqual(state.disabledZones, []);
  assert.deepEqual(state.disabledDevices, ['L1D3']);
  state = press(state, 'RESET');
  assert.deepEqual(state.disabledDevices, ['L1D3']);
  state = enableDevice(state, '3');
  assert.equal(view(state).status.disablementCount, 0);
});

test('disabled sensing suppresses a new fixture stimulus and enabling an active input restores its fire response', () => {
  let state = disableDevice(start());
  state = setGentDeviceInput(model, state, 'L1D1', 'fire');
  assert.equal(state.fireEvents.length, 0);
  assert.equal(state.inputs.L1D1, 'fire');
  state = enableDevice(close(state));
  assert.equal(state.fireEvents.length, 1);
  assert.equal(state.sounders, true);
});

test('unresolved MCP zone effects and unconfigured interface fire causes are explicit source gaps', () => {
  let state = disableZone(start(), '1');
  state = setGentDeviceInput(model, state, 'L1D2', 'fire');
  assert.equal(state.lastAction.type, 'source-gap');
  assert.equal(state.inputs.L1D2, 'normal');
  assert.equal(view(state).devices.find(device => device.id === 'L1D2').effectivelyDisabled, null, 'an unresolved MCP scope must not be presented as verified disabled sensing');
  const activeMcp = setGentDeviceInput(model, start(), 'L1D2', 'fire');
  const rejected = disableZone(activeMcp, '1');
  assert.equal(rejected.lastAction.ok, false);
  assert.equal(rejected.fireEvents.length, 1);
  assert.deepEqual(rejected.disabledZones, []);
  const interfaceInput = setGentDeviceInput(model, start(), 'L1D4', 'fire');
  assert.equal(interfaceInput.lastAction.type, 'source-gap');
});

test('Menu On/Off aborts rather than acting as Back; the five-minute timeout drops the practice access context', () => {
  let state = control(start());
  state = press(state, 'F2', 'MENU_ON_OFF');
  assert.equal(state.menuOpen, false);
  assert.equal(state.nodeId, null);
  assert.equal(state.authenticatedLevel, 0);
  state = control(state);
  state = tickGent(model, state, 299999);
  assert.equal(state.menuOpen, true);
  state = tickGent(model, state, 1);
  assert.equal(state.menuOpen, false);
  assert.equal(state.authenticatedLevel, 0);
});

test('display test lights all indicators for about four seconds without sounding alarm outputs', () => {
  let state = press(start(), 'MENU_ON_OFF', 'F4', 'F1');
  assert.equal(state.lastEvent.type, 'display-test');
  assert.equal(view(state).leds.every(led => led.state === 'on'), true);
  assert.equal(view(state).status.buzzer, true);
  assert.equal(state.sounders, false);
  state = tickGent(model, state, 3999);
  assert.ok(state.displayTestRemainingMs > 0);
  state = tickGent(model, state, 1);
  assert.equal(state.lastEvent.type, 'display-test-complete');
  assert.equal(view(state).status.normal, true);
});

test('Active includes fire, faults and disablements and uses documented F2/F3/F4 result controls', () => {
  let state = press(start('mixed-conditions'), 'MENU_ON_OFF', 'F3', 'F1', 'F2');
  assert.equal(state.viewMode, 'active');
  assert.equal(view(state).activeLog.length, 3);
  assert.deepEqual(view(state).softKeys.map(key => key.label), ['Previous', 'Next', 'Quit']);
  const before = savedEffects(state), line = view(state).screen.lines[0];
  state = press(state, 'F3');
  assert.notEqual(view(state).screen.lines[0], line);
  assert.equal(state.lastEvent.type, 'events-next');
  state = press(state, 'F2');
  assert.equal(view(state).screen.lines[0], line);
  assert.equal(savedEffects(state), before);
  state = press(state, 'F4');
  assert.equal(state.menuOpen, false);
});

test('Historic event 1 is the newest and reads do not create a new historic entry', () => {
  let state = start('mixed-conditions');
  const latest = state.history[0].message, length = state.history.length;
  state = press(state, 'MENU_ON_OFF', 'F3', 'F2', '1', 'F2');
  assert.equal(state.viewMode, 'history');
  assert.equal(view(state).screen.lines[0], latest.slice(0, 40));
  assert.equal(state.history.length, length);
  assert.ok(!view(state).softKeys.some(key => key.label === 'Next'), 'unverified historical result scroll is not invented');
});

test('active card filters reject uncommissioned card numbers', () => {
  let state = press(start('mixed-conditions'), 'MENU_ON_OFF', 'F3', 'F1', 'F3', '9', 'F2');
  assert.equal(state.lastAction.ok, false);
  state = press(state, 'DELETE', '1', 'F2');
  assert.equal(state.lastAction.ok, true);
  assert.ok(view(state).activeLog.every(event => event.loop === 1));
});

test('label views preserve the actual fixture labels, including separate interface I/O labels', () => {
  let state = route(start(), 'view-device').state;
  state = press(state, '1', 'F2', '1', 'F2');
  assert.equal(state.lastEvent.type, 'label-viewed');
  assert.ok(view(state).screen.lines.includes(data.fixture.devices[0].label));
  state = route(close(state), 'view-io').state;
  state = press(state, '1', 'F2', '4', 'F2', '1', 'F2');
  assert.equal(state.lastEvent.type, 'label-viewed');
  assert.ok(view(state).screen.lines.includes('PLANT MONITOR INPUT'));
});

test('label edits need physical Enter, and Reset discards an unsaved label but preserves a saved label', () => {
  let state = route(start(), 'edit-local').state;
  state = press(state, 'F2');
  const oldLabel = state.labels.local;
  for (let i = 0; i < oldLabel.length; i++) state = press(state, 'DELETE');
  state = press(state, ...'TRAINING ROOM');
  assert.equal(state.labels.local, oldLabel);
  state = press(state, 'ENTER');
  assert.equal(state.labels.local, 'TRAINING ROOM');
  assert.equal(state.dirty, true);
  assert.equal(press(state, 'RESET').labels.local, oldLabel);
  state = route(close(state), 'save').state;
  state = press(state, 'F2');
  assert.equal(state.lastEvent.type, 'nvm-saved');
  assert.equal(state.dirty, false);
  assert.equal(press(state, 'RESET').labels.local, 'TRAINING ROOM');
});

test('an MCP label editor exposes the documented 28-character ceiling', () => {
  let state = route(start(), 'edit-device').state;
  state = press(state, '2', 'F2', '1', 'F2');
  assert.equal(state.nodeId, 'edit-device-label');
  assert.equal(view(state).screen.field.maxLength, 28);
  const oldLength = state.form.label.length;
  for (let i = 0; i < oldLength; i++) state = press(state, 'DELETE');
  state = press(state, ...'A'.repeat(29));
  assert.equal(state.form.label.length, 28);
  state = press(state, 'ENTER');
  assert.equal(state.labels.devices.L1D2.length, 28);
});

test('Save to NVM is blocked while any disablement remains', () => {
  let state = route(start('disabled-device'), 'save').state;
  const before = structuredClone(state.savedConfiguration);
  state = press(state, 'F2');
  assert.equal(state.lastAction.type, 'save-blocked');
  assert.deepEqual(state.savedConfiguration, before);
  assert.notEqual(state.lastEvent?.type, 'nvm-saved');
});

test('Set Clock follows hour, minute, date, month and year, with separate adjust and commit outcomes', () => {
  let state = press(setup(start()), 'F1');
  assert.equal(view(state).clockField, 'hour');
  const oldHour = state.clock.hour;
  state = press(state, 'F3');
  assert.equal(state.clock.hour, oldHour);
  assert.equal(state.clockDraft.hour, oldHour + 1);
  assert.equal(state.lastEvent.type, 'clock-adjusted');
  for (const field of ['minute', 'day', 'month', 'year']) {
    state = press(state, 'F1');
    assert.equal(view(state).clockField, field);
  }
  state = press(state, 'F4');
  assert.equal(state.clock.hour, oldHour + 1);
  assert.equal(state.lastEvent.type, 'clock-set');
  assert.equal(state.dirty, true);
});

test('the printer commits On/Off only at Enter and inserts the conditional Info output menu', () => {
  let state = press(start(), 'MENU_ON_OFF', 'F1', 'F3');
  assert.deepEqual(view(state).softKeys.map(key => key.label), ['On']);
  const off = press(state, 'F1');
  assert.equal(off.lastAction.ok, false);
  state = press(state, 'F3');
  assert.equal(state.printer.enabled, false);
  state = press(state, 'F2');
  assert.equal(state.printer.enabled, true);
  state = route(close(state), 'info').state;
  assert.equal(state.nodeId, 'info');
  const advice = findGentRoute(model, close(state), 'info');
  assert.deepEqual(advice.keys, ['MENU_ON_OFF', 'F3', 'F1']);
  state = route(close(state), 'printer').state;
  assert.deepEqual(view(state).softKeys.map(key => key.label), ['Test', 'Paper Fd', 'Off']);
  state = press(state, 'F2');
  assert.equal(state.printer.feeds, 8);
  assert.equal(state.menuOpen, false);
  state = route(state, 'printer').state;
  state = press(state, 'F3', 'F2');
  assert.equal(state.printer.enabled, false);
  state = press(state, 'F2');
  assert.equal(state.printer.enabled, false, 'repeating confirmation is not another toggle');
});

test('the Print output selection produces a fictional label or loop-map listing without a transport', () => {
  let state = press(start(), 'MENU_ON_OFF', 'F1', 'F3', 'F3', 'F2');
  state = press(close(state), 'MENU_ON_OFF', 'F3', 'F2');
  assert.equal(state.nodeId, 'info');
  assert.equal(state.form.output, 'print');
  state = route(state, 'view-local').state;
  state = press(state, 'F2');
  assert.equal(state.printer.lastJob.type, 'label');
  assert.equal(state.printer.lastJob.label, state.labels.local);
  assert.match(view(state).screen.heading, /^FINDR print:/);
  state = press(close(state), 'MENU_ON_OFF', 'F3', 'F2');
  state = route(state, 'view-map').state;
  state = press(state, '1', 'F2');
  assert.equal(state.lastAction.ok, false, 'Map uses its documented F3 Enter, unlike ordinary F2 forms');
  state = press(state, 'F3');
  assert.equal(state.printer.lastJob.type, 'map');
  assert.equal(state.printer.lastJob.card, 1);
  assert.equal(state.printer.lastJob.rows.length, 4);
});

test('Verify and U1–U4 remain unconfigured and reference pages cannot execute hidden commands', () => {
  for (const key of ['VERIFY', 'U1', 'U2', 'U3', 'U4']) {
    const state = start('fire'), after = press(state, key);
    assert.equal(after.lastAction.ok, false);
    assert.equal(savedEffects(after), savedEffects(state));
  }
  let state = route(start(), 'disable-io-reference').state;
  const before = savedEffects(state);
  state = press(state, 'F2', 'ENTER', '1');
  assert.equal(state.lastAction.ok, false);
  assert.equal(savedEffects(state), before);
  state = press(state, 'MENU_ON_OFF');
  assert.equal(state.menuOpen, false);
});

test('zone-test helper uses the five-second cycle while the zone stays in test until explicitly finished', () => {
  let state = setGentZoneTest(model, start(), 'Z2', true);
  state = setGentDeviceInput(model, state, 'L1D3', 'fire');
  assert.equal(state.sounders, true);
  state = tickGent(model, state, 4999);
  assert.equal(state.sounders, true);
  state = tickGent(model, state, 1);
  assert.equal(state.sounders, false);
  assert.equal(state.fireEvents.length, 0);
  assert.equal(state.inputs.L1D3, 'fire', 'the source stimulus is not magically restored by the test reset');
  assert.equal(state.lastEvent.type, 'test-complete');
  assert.deepEqual(state.testZones, ['Z2']);
  assert.equal(view(state).leds.find(led => led.id === 'test').state, 'on');
  assert.equal(setGentZoneTest(model, state, 'Z2', false).lastAction.ok, false);
  state = setGentDeviceInput(model, state, 'L1D3', 'normal');
  state = setGentZoneTest(model, state, 'Z2', false);
  assert.equal(view(state).status.normal, true);
});

test('pausing lesson zone-test time still completes display tests and advances menu idle time', () => {
  let state = setGentDeviceInput(model, start('zone-test'), 'L1D3', 'fire');
  state = press(state, 'MENU_ON_OFF', 'F4', 'F1');
  assert.equal(state.displayTestRemainingMs, 4000);
  assert.equal(state.testCycles.Z2.remainingMs, 5000);
  const before = JSON.stringify(state);
  const elapsed = state.elapsedMs;
  const displayed = tickGent(model, state, 4000, {pauseZoneTests: true});
  assert.equal(JSON.stringify(state), before, 'pausing remains an immutable reducer operation');
  assert.equal(displayed.displayTestRemainingMs, 0);
  assert.equal(displayed.lastEvent.type, 'display-test-complete');
  assert.equal(displayed.elapsedMs, elapsed + 4000);
  assert.equal(displayed.testCycles.Z2.remainingMs, 5000);
  assert.equal(displayed.sounders, true);
  assert.equal(displayed.fireEvents.length, 1);
  state = press(displayed, 'MENU_ON_OFF');
  assert.equal(state.menuOpen, true);
  state = tickGent(model, state, 300000, {pauseZoneTests: true});
  assert.equal(state.menuOpen, false, 'zone-test pause must not freeze the menu idle timeout');
  assert.equal(state.testCycles.Z2.remainingMs, 5000);
  state = tickGent(model, state, 5000);
  assert.equal(state.testCycles.Z2, undefined, 'an explicit lesson advance uses normal timing by default');
  assert.equal(state.lastEvent.type, 'test-complete');
  assert.equal(state.sounders, false);
  assert.deepEqual(state.testZones, ['Z2']);
});

test('engineering practice authentication is distinct, typed and confined to the Test/Eng login', () => {
  const door = setGentAccess(model, start(), 3);
  assert.equal(door.accessLevel, 2);
  assert.equal(door.authenticatedLevel, 0, 'opening the practice door cannot grant engineering access');
  const customer = engineering(start(), '2468');
  assert.equal(customer.nodeId, 'test-user');
  assert.equal(customer.authenticatedLevel, 2);
  assert.equal(press(customer, 'F4').lastAction.ok, false, 'customer menu has no engineering paging shortcut');
  let state = press(start(), 'MENU_ON_OFF', 'F4', 'F4', ...'3917');
  assert.equal(state.authenticatedLevel, 0, 'typing alone does not accept the credential');
  state = press(state, 'ENTER');
  assert.equal(state.nodeId, 'test-engineer');
  assert.equal(state.authenticatedLevel, 3);
  assert.equal(state.lastEvent.level, 3);
  assert.equal(Object.hasOwn(state.form, 'pin'), false, 'accepted PIN draft is removed');
  assert.equal(engineering(start(), '3918').lastAction.type, 'incorrect-pin');
  for (const nodeId of ['control-pin', 'info-pin', 'setup-pin']) {
    const other = press(route(start(), nodeId).state, ...'3917', 'ENTER');
    assert.equal(other.lastAction.type, 'incorrect-pin', nodeId);
    assert.equal(other.authenticatedLevel, 0, nodeId);
  }
  assert.throws(() => buildGentModel({...data, fixture: {...data.fixture, trainingEngineeringPin: '2468'}}), /distinct/);
});

test('the complete physical walk-test route starts, cycles and explicitly ends the selected zone', () => {
  let state = walkTestForm(start(), true);
  assert.equal(state.nodeId, 'zone-test-on');
  assert.deepEqual(state.testZones, [], 'On opens an uncommitted Zone form');
  state = press(state, '2');
  assert.deepEqual(state.testZones, [], 'entering the number alone does not start a test');
  state = press(state, 'ENTER');
  assert.equal(state.lastAction.ok, false, 'numeric selection uses F2 Enter, not the physical PIN Enter key');
  state = press(state, 'F2');
  assert.equal(state.nodeId, 'zone-test-on');
  assert.deepEqual(state.testZones, ['Z2']);
  assert.equal(state.lastAction.key, 'F2');
  assert.equal(state.lastAction.type, 'zone-test-on');
  assert.equal(state.lastEvent.origin, 'panel-simulation');
  assert.equal(evaluateGentConditions(model, state, {type: 'zoneTest', zone: 'Z2', value: true}), true);
  state = press(state, 'MENU_ON_OFF');
  state = setGentDeviceInput(model, state, 'L1D3', 'fire');
  assert.equal(evaluateGentConditions(model, state, {type: 'testCycleActive', zone: 'Z2', value: true}), true);
  assert.equal(evaluateGentConditions(model, state, {type: 'testCycleRemainingMs', zone: 'Z2', value: 5000}), true);
  state = tickGent(model, state, 4999);
  assert.equal(state.sounders, true);
  state = tickGent(model, state, 1);
  assert.equal(evaluateGentConditions(model, state, {type: 'testCycleActive', zone: 'Z2', value: false}), true);
  assert.equal(evaluateGentConditions(model, state, {type: 'testCycleRemainingMs', zone: 'Z2', value: 0}), true);
  assert.deepEqual(state.testZones, ['Z2']);
  assert.equal(view(state).leds.find(led => led.id === 'test').state, 'on');
  state = setGentDeviceInput(model, state, 'L1D3', 'normal');
  state = press(walkTestForm(state, false), '2', 'F2');
  assert.equal(state.lastEvent.type, 'zone-test-off');
  assert.equal(state.lastEvent.origin, 'panel-simulation');
  assert.equal(state.nodeId, 'zone-test-off');
  assert.equal(evaluateGentConditions(model, state, {type: 'testCount', value: 0}), true);
  assert.equal(view(state).leds.find(led => led.id === 'test').state, 'off');
  state = press(state, 'MENU_ON_OFF');
  assert.equal(view(state).status.normal, true);
  assert.equal(state.menuOpen, false);
  assert.equal(state.authenticatedLevel, 0);
});

test('invalid zone entries and cancelled drafts do not commit a walk-test operation', () => {
  for (const entry of ['', '0', '4', '128', '1-2', '2-1']) {
    const form = press(walkTestForm(start(), true), ...entry);
    const before = savedEffects(form);
    const after = press(form, 'F2');
    assert.equal(after.lastAction.type, 'invalid-target', entry);
    assert.equal(savedEffects(after), before, entry);
  }
  let state = press(walkTestForm(start(), true), '2', 'F3');
  assert.equal(state.form.zone, '');
  assert.equal(state.nodeId, 'zone-test-on');
  assert.deepEqual(state.testZones, []);
  state = press(state, '2', 'F2');
  for (const key of ['F3', 'F4', 'MENU_ON_OFF', 'RESET']) {
    const after = press(state, key);
    assert.deepEqual(after.testZones, ['Z2'], `${key} must not remove a committed test selection`);
    if (key === 'F3') assert.equal(after.form.zone, '');
    else assert.equal(after.menuOpen, false);
  }
});

test('physical Off rejects an active test input and preserves independent fire, faults and disablements', () => {
  let state = press(walkTestForm(start('mixed-conditions'), true), '3', 'F2');
  const independent = {fires: structuredClone(state.fireEvents), faults: structuredClone(state.faults), disabledZones: [...state.disabledZones]};
  state = setGentDeviceInput(model, state, 'L2D1', 'fire');
  state = tickGent(model, state, 5000);
  state = press(walkTestForm(state, false), '3');
  const before = savedEffects(state);
  const rejected = press(state, 'F2');
  assert.equal(rejected.lastAction.type, 'active-test-input');
  assert.equal(savedEffects(rejected), before);
  state = setGentDeviceInput(model, rejected, 'L2D1', 'normal');
  state = press(state, 'F2');
  assert.deepEqual(state.testZones, []);
  assert.deepEqual(state.fireEvents, independent.fires);
  assert.deepEqual(state.faults, independent.faults);
  assert.deepEqual(state.disabledZones, independent.disabledZones);
  assert.equal(state.sounders, true, 'ending a test cannot silence a real fire elsewhere');
  assert.equal(view(state).status.normal, false);
});

test('walk-test hint planning recovers engineering PIN prefixes and never commits On or Off', () => {
  for (const typed of ['3', '39', '3917', '3999', '2468', '9999']) {
    let state = press(start('zone-test'), 'MENU_ON_OFF', 'F4', 'F4', ...typed);
    if (typed === '3999') state = press(state, 'LEFT', 'LEFT');
    const before = JSON.stringify(state);
    const advice = findGentRoute(model, state, 'zone-test-off');
    assert.equal(JSON.stringify(state), before, 'planning must be pure');
    assert.equal(advice.found, true);
    if (typed === '3') assert.equal(advice.keys[0], '9');
    if (typed === '39') assert.equal(advice.keys[0], '1');
    if (typed === '3917') assert.equal(advice.keys[0], 'ENTER');
    if (typed === '3999') assert.equal(advice.keys[0], 'RIGHT');
    const effects = savedEffects(state);
    state = route(state, 'zone-test-off').state;
    assert.equal(state.authenticatedLevel, 3, typed);
    assert.equal(savedEffects(state), effects, typed);
    assert.deepEqual(state.testZones, ['Z2'], 'reaching Off must not end the test');
    assert.equal(state.form.zone, '');
  }
  const customer = engineering(start(), '2468');
  const result = route(customer, 'zone-test-on');
  assert.equal(result.state.authenticatedLevel, 3);
  assert.deepEqual(result.state.testZones, []);
  assert.ok(result.keys.includes('MENU_ON_OFF'), 'a customer session must re-enter the engineering code');
});

test('engineering authentication is temporary and unrelated engineering operations remain references', () => {
  const state = engineering(start());
  for (const key of ['F1', 'F2', 'F3']) {
    const after = press(state, key);
    assert.equal(after.lastAction.ok, false);
    assert.equal(savedEffects(after), savedEffects(state));
  }
  const more = press(state, 'F4');
  assert.equal(view(more).softKeys.find(key => key.key === 'F3').enabled, false, 'Commissn is not commissioned in this fixture');
  assert.equal(press(more, 'F4').nodeId, 'test-engineer');
  for (const after of [press(state, 'MENU_ON_OFF'), press(state, 'RESET'), tickGent(model, state, 300000), leaveGent(model, state), restoreGentState(model, state), setGentAccess(model, state, 1)]) {
    assert.equal(after.authenticatedLevel, 0);
    assert.equal(after.menuOpen, false);
  }
  const form = walkTestForm(start(), true);
  const untrusted = {...form, authenticatedLevel: 2, form: {zone: '2'}};
  const rejected = press(untrusted, 'F2');
  assert.equal(rejected.lastAction.type, 'access-required');
  assert.deepEqual(rejected.testZones, []);
});

test('a zone-test completion does not clear a real fire or sounders in a different zone', () => {
  let state = setGentZoneTest(model, start('fire'), 'Z2', true);
  state = setGentDeviceInput(model, state, 'L1D3', 'fire');
  state = tickGent(model, state, 5000);
  assert.deepEqual(state.fireEvents.map(event => event.device), ['L1D1']);
  assert.equal(state.sounders, true);
});

test('leaving and restoring clear temporary practice tests and credentials but retain disablements and latched normal-input fires', () => {
  let state = setGentDeviceInput(model, start('fire'), 'L1D1', 'normal');
  state = disableZone(state);
  state = setGentZoneTest(model, state, 'Z3', true);
  state = setGentDeviceInput(model, state, 'L2D1', 'fire');
  state = tickGent(model, state, 5000);
  state = press(close(state), 'MENU_ON_OFF', 'F1', 'F4', '2');
  for (const after of [leaveGent(model, state), restoreGentState(model, JSON.parse(JSON.stringify(state)))]) {
    assert.equal(after.menuOpen, false);
    assert.equal(after.authenticatedLevel, 0);
    assert.deepEqual(after.form, {});
    assert.deepEqual(after.testZones, []);
    assert.equal(after.inputs.L2D1, 'normal');
    assert.deepEqual(after.disabledZones, ['Z2']);
    assert.deepEqual(after.fireEvents.map(event => event.device), ['L1D1']);
  }
});

test('restore rejects other models, fixtures and source revisions and sanitises unknown saved records', () => {
  const saved = start('disabled-device');
  for (const replacement of [{panelId: 'other'}, {fixtureId: 'other'}, {mapVersion: 'other'}, {sourceFingerprint: 'other'}, {version: 999}]) {
    assert.equal(view(restoreGentState(model, {...saved, ...replacement})).status.normal, true);
  }
  const dirty = {...saved, inputs: {...saved.inputs, hacked: 'fire'}, disabledDevices: ['L1D1', 'unknown'], disabledZones: ['missing'], faults: {'unknown-fault': {message: 'invented'}}, form: {pin: 'secret'}, menuOpen: true, nodeId: 'disable-device-loop'};
  const state = restoreGentState(model, dirty);
  assert.deepEqual(state.disabledDevices, ['L1D1']);
  assert.deepEqual(state.disabledZones, []);
  assert.equal(Object.hasOwn(state.inputs, 'hacked'), false);
  assert.deepEqual(state.faults, {});
  assert.deepEqual(state.form, {});
  assert.equal(state.menuOpen, false);
});

test('all source navigation hints replan after every tap and never commit a panel operation', () => {
  let reached = 0;
  for (const node of model.nodeList) {
    const state = start('mixed-conditions'), advice = findGentRoute(model, state, node.id);
    if (!advice.found) continue;
    const before = savedEffects(state), result = route(state, node.id);
    assert.equal(result.state.nodeId, node.id);
    assert.equal(savedEffects(result.state), before, node.id);
    assert.equal(result.keys.some(key => ['RESET', 'SOUND_ALARMS', 'SILENCE_ALARMS', 'CANCEL_BUZZER'].includes(key)), false);
    reached++;
  }
  assert.ok(reached >= 70, `${reached} menu destinations`);
});

test('adaptive PIN hints retain correct prefixes and recover wrong suffixes or cursor positions', () => {
  for (const typed of ['2', '24', '2468', '2499', '9999']) {
    let state = press(start(), 'MENU_ON_OFF', 'F1', 'F4', ...typed);
    if (typed === '2499') state = press(state, 'LEFT', 'LEFT');
    const result = route(state, 'disable-device');
    assert.equal(result.state.nodeId, 'disable-device');
    assert.equal(result.state.authenticatedLevel, 2);
    if (typed === '2') assert.equal(result.keys[0], '4');
    if (typed === '2468') assert.equal(result.keys[0], 'ENTER');
  }
});

test('navigation from an Active results screen accounts for its temporary Previous/Next soft keys', () => {
  const state = press(start('mixed-conditions'), 'MENU_ON_OFF', 'F3', 'F1', 'F2');
  assert.equal(state.viewMode, 'active');
  const result = route(state, 'active-card');
  assert.equal(result.state.nodeId, 'active-card');
  assert.equal(result.state.viewMode, null);
  assert.equal(savedEffects(result.state), savedEffects(state));
});

test('reducers and presentation/hint helpers accept frozen input without mutation', () => {
  const state = freeze(start('fire')), before = JSON.stringify(state);
  const frozenModel = freeze(model);
  pressGentKey(frozenModel, state, 'CANCEL_BUZZER');
  setGentDeviceInput(frozenModel, state, 'L1D1', 'normal');
  setGentAccess(frozenModel, state, 1);
  tickGent(frozenModel, state, 1000);
  leaveGent(frozenModel, state);
  gentView(frozenModel, state);
  findGentRoute(frozenModel, state, 'disable-zone');
  evaluateGentConditions(frozenModel, state, {type: 'fire', value: true});
  assert.equal(JSON.stringify(state), before);
});

test('history is bounded to the documented 255 entries and screen content respects eight-by-forty layout', () => {
  let state = start();
  for (let i = 0; i < 140; i++) {
    state = setGentFault(model, state, 'L1D3-removed', true);
    state = setGentFault(model, state, 'L1D3-removed', false);
  }
  assert.equal(state.history.length, 255);
  assert.ok(state.history[0].sequence > state.history.at(-1).sequence);
  const v = view(start('multiple-fires'));
  assert.ok(v.screen.heading.length <= 40);
  assert.ok(v.screen.lines.length <= 6);
  assert.ok(v.screen.lines.every(line => line.length <= 40));
});

