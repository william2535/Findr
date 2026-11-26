import test from 'node:test';
import assert from 'node:assert/strict';
import {LOOP_SCENARIOS, LOOP_NOTICE, LOOP_COUNTER_NOTICE, LOOP_LIMITS, createLoopRun, stepLoopRun, evaluateLoopRun, restoreLoopRun} from '../public/app/protec-loop-engine.mjs';

const act = (run, type, fields = {}) => stepLoopRun(run, {type, ...fields});
const display = evaluateLoopRun;
function ready(id = 'mapped') {
  let run = createLoopRun(id);
  for (const type of ['acknowledge', 'map', 'verify-topology', 'reset-counts', 'observe']) run = act(run, type);
  return run;
}
function sample(run, config, count = 2) {
  run = act(run, 'configure', {configurationId: config});
  run = act(run, 'reset-counts');
  for (let i = 0; i < count; i++) run = act(run, 'observe');
  return run;
}
function narrowed() {
  let run = ready();
  for (const config of ['half-a', 'c', 'd']) run = sample(run, config);
  return run;
}
function restore(run) {
  for (const type of ['restore', 'reset-counts', 'observe']) run = act(run, type);
  return run;
}
function conclude(run, kind = 'localised', sectionId = 'c') {
  return act(run, 'conclude', {kind, sectionId: kind === 'unresolved' ? null : sectionId, note: 'Comparable windows recorded. Check the suspect section on site; cause and repair are unconfirmed.'});
}

test('three offline synthetic scenarios keep approximate Map groups separate from surveyed order', () => {
  assert.equal(LOOP_SCENARIOS.length, 3);
  assert.match(LOOP_NOTICE, /do not represent a Protec menu command/);
  assert.match(LOOP_COUNTER_NOTICE, /not simulated/);
  const mapped = LOOP_SCENARIOS[0], incomplete = LOOP_SCENARIOS[2];
  assert.equal(mapped.devices.length, 8);
  assert.notDeepEqual(mapped.devices.map(d => d.address), mapped.devices.map(d => d.address).sort((a, b) => a - b));
  assert.equal(new Set(mapped.devices.map(d => d.mapNode)).size, 4, 'Map ties must exist');
  assert.equal(mapped.devices[0].mapNode, mapped.devices[1].mapNode);
  assert.notEqual(mapped.devices[0].physicalPosition, mapped.devices[1].physicalPosition);
  assert.ok(incomplete.devices.every(d => !d.isolator && d.physicalPosition === null));
  assert.equal(incomplete.devices.at(-1).mapNode, null);
  assert.equal(display(createLoopRun()).complete, false);
  assert.throws(() => { mapped.devices[0].address = 1; }, TypeError);
});

test('scope, Map, supplied survey and baseline gates block invented or premature tests', () => {
  let run = createLoopRun();
  assert.throws(() => act(run, 'map'), /scope/);
  run = act(run, 'acknowledge');
  assert.throws(() => act(run, 'configure', {configurationId: 'c'}), /Map/);
  run = act(run, 'map');
  assert.throws(() => act(run, 'configure', {configurationId: 'c'}), /survey/);
  run = act(run, 'verify-topology');
  assert.throws(() => act(run, 'configure', {configurationId: 'c'}), /baseline/);
  assert.throws(() => act(run, 'observe'), /Reset counts/);
  assert.throws(() => act(run, 'split-loop'), /Unknown/);
  assert.throws(() => act(run, 'configure', {configurationId: 'live-terminal-A'}), /not available/);
});

test('one-hour samples retain monotonic cumulative totals, exact deltas and reset history', () => {
  let run = ready();
  const first = display(run).observations[0];
  assert.equal(first.start, 0); assert.equal(first.end, 3600);
  assert.equal(first.seconds, LOOP_LIMITS.observationSeconds);
  assert.equal(first.polledDeviceIds.length, 8);
  run = act(run, 'observe');
  const second = display(run).observations[1];
  assert.equal(second.start, first.end);
  assert.equal(second.cumulativeLost, first.cumulativeLost + second.totalMissedDelta);
  assert.ok(second.cumulativeLost > first.cumulativeLost);
  run = act(run, 'reset-counts');
  const reset = display(run);
  assert.equal(reset.cumulativeLost, 0);
  assert.equal(reset.observations.length, 2);
  assert.deepEqual(reset.observations[0], first);
  run = act(run, 'observe');
  const third = display(run).observations[2];
  assert.equal(third.epoch, first.epoch + 1);
  assert.equal(third.cumulativeLost, third.totalMissedDelta);
  assert.equal(third.start, second.end);
});

test('a reduced polling group never reports excluded devices as healthy zeroes', () => {
  let run = ready();
  run = act(run, 'configure', {configurationId: 'half-a'});
  assert.throws(() => act(run, 'observe'), /Reset counts/);
  run = act(run, 'reset-counts'); run = act(run, 'observe');
  const state = display(run), sample = state.observations.at(-1);
  assert.equal(sample.totalMissedDelta, 0);
  assert.equal(sample.polledDeviceIds.length, 4);
  assert.equal(sample.coverageComplete, true);
  assert.equal(sample.wholeLoopCoverage, false);
  for (const row of sample.rows.slice(4)) {
    assert.equal(row.polled, false); assert.equal(row.attempts, 0); assert.equal(row.lostDelta, null);
    assert.match(row.status, /no health evidence/);
  }
  assert.match(state.events.at(-1).text, /Unpolled devices remain unassessed/);
  assert.equal(state.checks.find(c => c.id === 'evidence').passed, false);
});

test('smaller positive totals, single clean windows and incomplete opposite coverage cannot localise', () => {
  const baseline = ready();
  let smaller = sample(baseline, 'c');
  assert.ok(display(smaller).observations.at(-1).totalMissedDelta < display(baseline).observations[0].totalMissedDelta);
  smaller = conclude(smaller);
  assert.equal(display(smaller).checks.find(c => c.id === 'evidence').passed, false, 'fewer polled devices cannot prove localisation');
  let single = sample(ready(), 'half-a', 1);
  single = sample(single, 'c', 1); single = sample(single, 'd', 1); single = conclude(single);
  assert.equal(display(single).checks.find(c => c.id === 'evidence').passed, false, 'one window is insufficient');
  let partial = sample(ready(), 'half-a'); partial = sample(partial, 'c'); partial = conclude(partial);
  assert.equal(display(partial).checks.find(c => c.id === 'evidence').passed, false, 'opposite D still untested');
});

test('repeated covered section and opposite windows support localisation but not its cause', () => {
  let run = narrowed();
  assert.deepEqual(display(run).candidates, ['c']);
  run = conclude(run, 'localised', 'b');
  assert.equal(display(run).checks.find(c => c.id === 'evidence').passed, false);
  run = conclude(run);
  assert.equal(display(run).checks.find(c => c.id === 'evidence').passed, true);
  assert.equal(display(run).events.filter(event => event.type === 'conclude').length, 2, 'retain correction history');
  assert.match(display(run).uncertainties[0], /cause/);
  assert.throws(() => act(run, 'finish'), /restored|Final whole-loop/);
});

test('restoration requires original configuration, a reset and full original polling coverage', () => {
  let run = conclude(narrowed());
  run = act(run, 'configure', {configurationId: 'whole'});
  run = act(run, 'reset-counts'); run = act(run, 'observe');
  assert.equal(display(run).checks.find(c => c.id === 'restored').passed, false, 'selecting whole does not silently record restoration');
  run = act(run, 'restore');
  assert.throws(() => act(run, 'observe'), /Reset/);
  assert.throws(() => act(run, 'finish'), /Final whole-loop/);
  run = act(run, 'reset-counts'); run = act(run, 'observe');
  assert.equal(display(run).restoration.finalWindow, true);
  assert.ok(display(run).observations.at(-1).totalMissedDelta > 0, 'restoration must not silently repair fault');
  assert.ok(display(run).uncertainties.some(value => /still recorded/.test(value)));
  const changed = act(run, 'configure', {configurationId: 'half-a'});
  assert.equal(display(changed).restoration.finalWindow, false);
  assert.throws(() => act(changed, 'finish'), /restored|Final whole-loop/);
  run = act(run, 'finish');
  assert.equal(display(run).complete, true);
  assert.match(display(run).events.at(-1).text, /cause.*repair remain unconfirmed/);
  assert.throws(() => act(run, 'observe'), /finished/);
});

test('intermittent quiet window does not exclude a section or establish a repair', () => {
  let run = ready('intermittent');
  run = act(run, 'observe'); run = act(run, 'observe');
  const windows = display(run).observations;
  assert.ok(windows[0].totalMissedDelta > 0);
  assert.equal(windows[1].totalMissedDelta, 0);
  assert.ok(windows[2].totalMissedDelta > 0);
  run = conclude(run);
  assert.equal(display(run).checks.find(c => c.id === 'evidence').passed, false);
  assert.deepEqual(display(run).candidates, ['a', 'b', 'c', 'd']);
  run = conclude(run, 'unresolved'); run = restore(run); run = act(run, 'finish');
  assert.equal(display(run).complete, true);
  assert.ok(display(run).uncertainties.some(value => /quiet window cannot exclude/.test(value)));
});

test('no isolators, tied map and unlogged device preserve uncertainty through handover', () => {
  let run = ready('incomplete');
  assert.throws(() => act(run, 'configure', {configurationId: 'half-a'}), /survey/);
  assert.deepEqual(display(run).candidates, []);
  const missing = display(run).devices.find(device => device.id === 'd8');
  assert.equal(missing.attempts, 0); assert.equal(missing.lostDelta, null);
  assert.equal(display(run).observations[0].coverageComplete, false);
  assert.ok(display(run).configurations.filter(config => config.id !== 'whole').every(config => !config.available));
  run = act(run, 'observe'); run = conclude(run, 'unresolved'); run = restore(run); run = act(run, 'finish');
  const state = display(run);
  assert.equal(state.complete, true);
  assert.equal(state.restoration.originalCoverageRestored, true, 'introduced exclusions restored');
  assert.equal(state.restoration.wholeLoopCoverage, false, 'pre-existing missing device remains unresolved');
  assert.ok(state.uncertainties.some(value => /Address 16/.test(value)));
});

test('premature virtual restoration cannot strand an incomplete-map exercise', () => {
  for (const id of ['mapped', 'intermittent', 'incomplete']) {
    let run = ready(id);
    const before = JSON.stringify(run);
    assert.throws(() => act(run, 'restore'), /evidence-supported finding or unresolved handover/);
    assert.equal(JSON.stringify(run), before);
    run = conclude(run, 'unresolved');
    assert.throws(() => act(run, 'restore'), /evidence-supported finding or unresolved handover/);
    run = act(run, 'observe');
    if (id !== 'incomplete') run = act(run, 'observe');
    run = restore(run); run = act(run, 'finish');
    assert.equal(display(run).complete, true);
  }
});

test('validated action-only restore is deterministic, immutable and rejects fabricated outcomes', () => {
  const run = act(restore(conclude(narrowed())), 'finish');
  const saved = JSON.parse(JSON.stringify(run));
  assert.deepEqual(display(restoreLoopRun(saved)), display(run));
  assert.deepEqual(Object.keys(saved), ['schemaVersion', 'scenarioId', 'actions']);
  assert.throws(() => { run.actions.push({type: 'observe'}); }, TypeError);
  const rendered = display(run); rendered.observations[0].rows[0].address = 999;
  assert.notEqual(display(run).observations[0].rows[0].address, 999);
  assert.throws(() => restoreLoopRun({...saved, complete: true}), /unknown or invalid/);
  assert.throws(() => restoreLoopRun({...saved, schemaVersion: 99}), /schema version/);
  assert.throws(() => restoreLoopRun({...saved, actions: [{type: 'finish'}]}), /scope/);
  assert.throws(() => restoreLoopRun(JSON.parse('{"schemaVersion":1,"scenarioId":"mapped","actions":[],"__proto__":{}}')), /unknown or invalid/);
  assert.throws(() => createLoopRun('real-panel'), /not available/);
});

test('bounded actions and strict payloads prevent runaway or ambiguous saved exercises', () => {
  let run = ready();
  assert.throws(() => stepLoopRun(run, {type: 'observe', seconds: 30}), /unknown or invalid/);
  assert.throws(() => act(run, 'conclude', {kind: 'unresolved', sectionId: 'c', note: 'Unknown'}), /must not assign/);
  assert.throws(() => act(run, 'conclude', {kind: 'localised', sectionId: 'c', note: ' '}), /note/);
  assert.throws(() => act(run, 'conclude', {kind: 'localised', sectionId: 'c', note: 'x'.repeat(2001)}), /2,000/);
  while (run.actions.length < LOOP_LIMITS.actions) run = act(run, 'reset-counts');
  assert.throws(() => act(run, 'reset-counts'), /300/);
  assert.throws(() => restoreLoopRun({...run, actions: [...run.actions, {type: 'reset-counts'}]}), /300/);
});
