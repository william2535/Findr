import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {
  buildGentModel, createGentState, pressGentKey, findGentRoute,
  evaluateGentConditions, setGentDeviceInput, setGentFault, tickGent,
} from '../public/app/gent-engine.mjs';

const read = name => JSON.parse(readFileSync(new URL(`../public/app/data/${name}.json`, import.meta.url), 'utf8'));
const source = read('gent-vigilon');
const content = read('gent-lessons');
const model = buildGentModel(source);
const lessons = content.lessons;
const press = (state, ...keys) => keys.flat().reduce((previous, key) => pressGentKey(model, previous, key), state);
const page = state => state.menuOpen ? state.nodeId : 'status';
const sources = new Map(source.sources.map(item => [item.id, item]));
const keys = new Set(source.physicalKeys.map(item => item.id));
const scenarioIds = new Set(source.scenarios.map(item => item.id));
const lessonIds = new Set(lessons.map(item => item.id));

function checkReferences(item, identity) {
  assert.ok(item.sourceRefs?.length, `${identity} needs a source`);
  for (const reference of item.sourceRefs) {
    assert.ok(sources.has(reference.sourceId), `${identity}: unknown source ${reference.sourceId}`);
    assert.ok(reference.pages?.length, `${identity}: missing page`);
    for (const number of reference.pages) {
      assert.ok(Number.isInteger(number) && number >= 1 && number <= sources.get(reference.sourceId).pages,
        `${identity}: page ${number} is outside its source`);
    }
  }
}

function act(state, step) {
  if (step.nextKey) return press(state, step.nextKey);
  if (step.action.type === 'set-input') return setGentDeviceInput(model, state, step.action.device, step.action.value);
  if (step.action.type === 'set-fault') return setGentFault(model, state, step.action.fault, step.action.value);
  if (step.action.type === 'advance-time') return tickGent(model, state, step.action.milliseconds);
  if (step.action.type === 'acknowledge') {
    // An observer waits for the documented display test to finish. This does
    // not skip any physical key or silently clear an alarm/input condition.
    return state.displayTestRemainingMs > 0 ? tickGent(model, state, state.displayTestRemainingMs) : state;
  }
  assert.fail(`Unknown training action ${step.action.type}`);
}

function assertStepOutcome(before, after, step) {
  assert.equal(evaluateGentConditions(model, after, step.conditions), true,
    `${step.id}: ${step.title}; ${JSON.stringify(after.lastAction)}`);
  if (step.conditions.some(condition => condition.type === 'event')) {
    assert.notEqual(after.lastEvent?.sequence, before.lastEvent?.sequence,
      `${step.id} must produce a new semantic outcome, not reuse an old confirmation`);
  }
}

function replayTo(lesson, stopBefore = null) {
  let state = createGentState(model, {scenarioId: lesson.scenario});
  for (const step of lesson.steps) {
    if (step.id === stopBefore) return state;
    if (step.goal) {
      // Do not auto-navigate in a happy-path test: doing so could hide an
      // omitted or wrongly ordered physical key in the published lesson.
      assert.equal(page(state), step.goal.nodeId, `${step.id}: preceding lesson keys must reach the containing page`);
      const before = JSON.stringify(state);
      const route = findGentRoute(model, state, step.goal.nodeId);
      assert.equal(JSON.stringify(state), before, 'Computing a hint must be read-only');
      assert.equal(route.found, true);
      assert.deepEqual(route.keys, []);
    }
    const before = state;
    state = act(state, step);
    assertStepOutcome(before, state, step);
  }
  return state;
}

function protectionState(state) {
  return JSON.stringify({
    inputs: state.inputs, fires: state.fireEvents, faults: state.faults,
    devices: state.disabledDevices, zones: state.disabledZones, tests: state.testZones,
    buzzer: state.buzzer, sounders: state.sounders, clock: state.clock,
    labels: state.labels, savedConfiguration: state.savedConfiguration,
  });
}

function navigateTo(state, nodeId) {
  const originalEffects = protectionState(state);
  for (let attempts = 0; attempts < 150; attempts++) {
    const before = JSON.stringify(state);
    const advice = findGentRoute(model, state, nodeId);
    assert.equal(JSON.stringify(state), before, 'Route planning must not operate anything');
    assert.equal(advice.found, true, `${nodeId}: ${advice.reason}`);
    if (!advice.keys.length) {
      assert.equal(page(state), nodeId);
      assert.equal(protectionState(state), originalEffects, 'Following only recovery navigation must not change protection state');
      return state;
    }
    state = press(state, advice.keys[0]);
    assert.notEqual(state.lastAction?.ok, false, `${nodeId}: ${advice.keys[0]} was rejected`);
  }
  assert.fail(`Recovery did not reach ${nodeId}`);
}

function repairEntries(state, step) {
  for (const entry of step.requiredEntries) {
    if (String(state.form[entry.name] ?? '') === entry.value) continue;
    state = navigateTo(state, entry.nodeId);
    for (let attempts = 0; attempts < 30; attempts++) {
      const current = String(state.form[entry.name] ?? '');
      if (current === entry.value) break;
      state = press(state, entry.value.startsWith(current) ? entry.value[current.length] : 'DELETE');
    }
    assert.equal(String(state.form[entry.name]), entry.value, `${step.id}: could not reconstruct ${entry.name}`);
  }
  return navigateTo(state, step.goal.nodeId);
}

test('GENT learning content has four tracks, 20 substantive lessons and a source-backed help library', () => {
  assert.equal(content.panelId, source.id);
  assert.equal(content.fixtureId, source.fixture.id);
  assert.equal(content.tracks.length, 4);
  assert.equal(lessons.length, 20);
  assert.equal(lessonIds.size, lessons.length);
  assert.equal(content.helpArticles.length, 28);
  assert.equal(content.glossary.length, 16);
  const tracks = new Set(content.tracks.map(track => track.id));
  const allStepIds = new Set();
  for (const lesson of lessons) {
    assert.ok(tracks.has(lesson.trackId), lesson.id);
    assert.ok(scenarioIds.has(lesson.scenario), lesson.id);
    assert.ok(lesson.steps.length >= 3, `${lesson.id} must include interpretation as well as a press`);
    assert.ok(lesson.prerequisites.length && lesson.restoreInstruction && lesson.completionConditions.length, lesson.id);
    checkReferences(lesson, lesson.id);
    for (const step of lesson.steps) {
      assert.ok(!allStepIds.has(step.id), `Duplicate step ${step.id}`);
      allStepIds.add(step.id);
      assert.notEqual(Boolean(step.nextKey), Boolean(step.action), `${step.id}: choose a physical key OR explicit trainer action`);
      assert.ok(step.explanation && step.expected && step.commonMistake && step.conditions.length, step.id);
      if (step.nextKey) assert.ok(keys.has(step.nextKey), `${step.id}: no invented physical key`);
      if (step.action) assert.ok(['acknowledge', 'set-input', 'set-fault', 'advance-time'].includes(step.action.type), step.id);
      if (step.goal) assert.ok(model.nodes[step.goal.nodeId], step.id);
      for (const entry of step.requiredEntries || []) {
        assert.equal(model.nodes[entry.nodeId]?.field?.name, entry.name, `${step.id}: repair targets the actual field`);
        assert.match(entry.value, /^\d+$/);
        assert.notEqual(entry.name, 'pin', 'Commit metadata must not disguise an access-control bypass');
      }
      checkReferences(step, step.id);
    }
  }
  assert.equal(allStepIds.size, 236);
});

test('the original 18 Vigilon lesson objects remain unchanged by the walk-test addition', () => {
  const original = lessons.filter(lesson => !['gent-walk-test', 'gent-end-walk-test'].includes(lesson.id));
  assert.equal(original.length, 18);
  // Snapshot of the pre-0.12.1 authored content, independent of engine logic.
  const hash = createHash('sha256').update(JSON.stringify(original)).digest('hex');
  assert.equal(hash, '7556a0d957ca8698ad0c7929eb3b481471c0b5dfb98fab3d0850b055e9dc1f65');
});

test('all help, glossary and limitation references point to actual pinned manufacturer pages', () => {
  for (const item of [...content.helpArticles, ...content.glossary, ...content.sourceGaps]) {
    checkReferences(item, item.id || item.term);
    for (const lessonId of item.relatedLessonIds || []) assert.ok(lessonIds.has(lessonId), `${item.id}: missing related lesson`);
  }
});

test('unresolved engineering routes stay outside drills while the complete Zone Test route is sourced', () => {
  for (const lesson of lessons) {
    for (const step of lesson.steps) {
      assert.ok(!['VERIFY', 'U1', 'U2', 'U3', 'U4'].includes(step.nextKey), `${step.id}: a site-defined function is not a universal drill`);
      const node = step.goal && model.nodes[step.goal.nodeId];
      assert.notEqual(node?.confidence, 'reference', `${step.id}: unverified route entered a guided drill`);
      if (step.conditions.some(condition => condition.type === 'zoneDisabled')) {
        const intendedZone = step.conditions.find(condition => condition.type === 'zoneDisabled').zone;
        assert.ok(!source.fixture.devices.some(device => device.zone === intendedZone && device.type === 'mcp'),
          'Zone lessons must not silently assume unresolved MCP-in-zone behaviour');
      }
    }
  }
  const zoneTest = content.helpArticles.find(article => article.id === 'zone-test-behaviour');
  assert.equal(zoneTest.status, 'verified');
  assert.ok(zoneTest.sourceRefs.some(reference => reference.sourceId === 'gent-vigilon-4188-856-2015' && reference.pages.includes(81) && reference.pages.includes(105)));
  assert.ok(zoneTest.sourceRefs.some(reference => reference.sourceId === 'gent-vigilon-plus-basic-training-archive' && reference.pages.includes(103)));
  assert.deepEqual(zoneTest.relatedLessonIds, ['gent-walk-test', 'gent-end-walk-test']);
  const finish = content.helpArticles.find(article => article.id === 'finish-zone-test');
  assert.equal(finish.status, 'verified');
  assert.deepEqual(finish.relatedLessonIds, ['gent-end-walk-test', 'gent-walk-test']);
});

test('walk-test lessons expose common search names and use the separate engineering credential', () => {
  for (const id of ['gent-walk-test', 'gent-end-walk-test']) {
    const lesson = lessons.find(item => item.id === id);
    for (const alias of ['walk test', 'walk-test', 'walktest', 'zone test', 'vigilon', 'vigilion']) {
      assert.ok(lesson.aliases.includes(alias), `${id}: missing alias ${alias}`);
    }
    const pinSteps = lesson.steps.filter(step => step.goal?.nodeId === 'test-pin');
    assert.equal(pinSteps.length, id === 'gent-walk-test' ? 10 : 5);
    for (const step of pinSteps) assert.equal(step.requiredAccess, 3, `${step.id}: engineering PIN recovery must not substitute the customer code`);
    const submissions = pinSteps.filter(step => step.nextKey === 'ENTER');
    assert.ok(submissions.every(step => step.conditions.some(condition => condition.type === 'access' && condition.value === 3)));
  }
  const timed = lessons.find(lesson => lesson.id === 'gent-walk-test');
  assert.equal(timed.manualTestTime, true);
  const advances = timed.steps.filter(step => step.action?.type === 'advance-time');
  assert.equal(advances.length, 1);
  assert.equal(advances[0].action.milliseconds, 5000);
  assert.ok(advances[0].conditions.some(condition => condition.type === 'testCycleActive' && condition.zone === 'Z2' && condition.value === false));
  assert.ok(!lessons.find(lesson => lesson.id === 'gent-end-walk-test').steps.some(step => step.action?.type === 'advance-time'));
});

test('the full walk-test lesson cannot finish after automatic reset or input restoration alone', () => {
  const lesson = lessons.find(item => item.id === 'gent-walk-test');
  const afterCycle = replayTo(lesson, 'gent-walk-test-step-19');
  assert.equal(evaluateGentConditions(model, afterCycle, [
    {type: 'zoneTest', zone: 'Z2', value: true},
    {type: 'testCycleActive', zone: 'Z2', value: false},
    {type: 'input', device: 'L1D3', value: 'fire'},
    {type: 'fire', value: false},
    {type: 'sounders', value: false},
  ]), true);
  assert.equal(evaluateGentConditions(model, afterCycle, lesson.completionConditions), false);
  const inputRestored = replayTo(lesson, 'gent-walk-test-step-21');
  assert.equal(inputRestored.inputs.L1D3, 'normal');
  assert.equal(evaluateGentConditions(model, inputRestored, lesson.completionConditions), false);
  const beforeOff = replayTo(lesson, 'gent-walk-test-step-34');
  assert.ok(beforeOff.testZones.includes('Z2'));
  assert.equal(evaluateGentConditions(model, beforeOff, lesson.completionConditions), false);
  const restored = replayTo(lesson);
  assert.equal(evaluateGentConditions(model, restored, lesson.completionConditions), true);
  assert.deepEqual(restored.testZones, []);
  assert.equal(restored.inputs.L1D3, 'normal');
});

test('engineering hint recovery corrects a wrong practice PIN without operating Zone Test', () => {
  const lesson = lessons.find(item => item.id === 'gent-walk-test');
  let state = replayTo(lesson, 'gent-walk-test-step-9');
  assert.equal(page(state), 'test-pin');
  state = press(state, 'DELETE', '9');
  assert.equal(state.form.pin, '3919');
  const before = JSON.stringify(state);
  const advice = findGentRoute(model, state, 'test-engineer');
  assert.equal(JSON.stringify(state), before, 'A hint must not type or authenticate');
  assert.equal(advice.found, true);
  assert.deepEqual(advice.keys, ['DELETE', '7', 'ENTER']);
  const originalEffects = protectionState(state);
  for (const key of advice.keys) state = press(state, key);
  assert.equal(page(state), 'test-engineer');
  assert.equal(state.authenticatedLevel, 3);
  assert.equal(protectionState(state), originalEffects);
});

for (const lesson of lessons) {
  test(`GENT lesson reaches every taught outcome using its literal keys: ${lesson.title}`, () => {
    const state = replayTo(lesson);
    assert.equal(evaluateGentConditions(model, state, lesson.completionConditions), true, `${lesson.id}: final result`);
  });
}

for (const lesson of lessons) {
  for (const step of lesson.steps.filter(item => item.requiredEntries?.length)) {
    test(`GENT hint metadata reconstructs abandoned fields before commit: ${step.id}`, () => {
      let state = replayTo(lesson, step.id);
      const originalEffects = protectionState(state);
      // Leave the form, lose its entries and authentication, and take a
      // harmless turn into Info. Advice must rebuild the real entry route.
      state = press(state, 'MENU_ON_OFF', 'MENU_ON_OFF', 'F3', 'F4');
      assert.equal(page(state), 'info-more');
      assert.equal(protectionState(state), originalEffects);
      state = repairEntries(state, step);
      assert.equal(protectionState(state), originalEffects, 'Repair advice cannot commit the target operation');
      const beforeCommit = state;
      state = press(state, step.nextKey);
      assertStepOutcome(beforeCommit, state, step);
    });
  }
}
