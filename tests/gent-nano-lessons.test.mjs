import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  buildNanoModel, createNanoState, pressNanoKey, nextNanoHint,
  evaluateNanoConditions, setNanoDeviceInput, setNanoFault, tickNano,
} from '../public/app/gent-nano-engine.mjs';

const read = name => JSON.parse(readFileSync(new URL(`../public/app/data/${name}.json`, import.meta.url), 'utf8'));
const source = read('gent-nano');
const content = read('gent-nano-lessons');
const model = buildNanoModel(source);
const sources = new Map(source.sources.map(item => [item.id, item]));
const keys = new Set(source.physicalKeys.map(item => item.id));
const lessonIds = new Set(content.lessons.map(item => item.id));
const press = (state, ...sequence) => sequence.flat().reduce((s, key) => pressNanoKey(model, s, key), state);
const condition = (state, conditions) => evaluateNanoConditions(model, state, conditions);

function checkReferences(item, identity) {
  assert.ok(item.sourceRefs?.length, `${identity}: a primary-source reference is required`);
  for (const ref of item.sourceRefs) {
    const pinned = sources.get(ref.sourceId);
    assert.ok(pinned, `${identity}: missing source ${ref.sourceId}`);
    assert.ok(ref.pages?.length, `${identity}: a page is required`);
    for (const page of ref.pages) assert.ok(Number.isInteger(page) && page > 0 && page <= (pinned.pages || pinned.pageCount),
      `${identity}: page ${page} is outside the pinned document`);
  }
}
function lab(state, action) {
  if (action.type === 'acknowledge') return state;
  if (action.type === 'set-input') return setNanoDeviceInput(model, state, action.device, action.value);
  if (action.type === 'set-fault') return setNanoFault(model, state, action.fault, action.value);
  if (action.type === 'tick') return tickNano(model, state, action.ms);
  assert.fail(`Unknown training action ${action.type}`);
}
function replayTo(lesson, stopId) {
  let state = createNanoState(model, {scenarioId: lesson.scenario});
  for (const step of lesson.steps) {
    if (step.id === stopId) return state;
    const previousEvent = state.lastEvent?.sequence;
    if (step.action) state = lab(state, step.action);
    else {
      assert.ok(step.expectedKeys.length, `${step.id}: every taught route needs real presses`);
      for (let i = 0; i < step.expectedKeys.length; i++) {
        state = press(state, step.expectedKeys[i]);
        assert.notEqual(state.lastAction?.ok, false, `${step.id}: literal key rejected: ${state.lastAction?.message}`);
        if (i < step.expectedKeys.length - 1) {
          assert.equal(condition(state, step.conditions), false, `${step.id}: completion must not happen before the last taught key`);
        }
      }
      if (step.nextKey) assert.equal(step.expectedKeys.at(-1), step.nextKey,
        `${step.id}: the literal route must include its explicit final control`);
    }
    assert.equal(condition(state, step.conditions), true, `${step.id}: ${step.title}`);
    if (step.conditions.some(c => c.type === 'event')) {
      assert.notEqual(state.lastEvent?.sequence, previousEvent, `${step.id}: old events cannot satisfy a new action`);
    }
  }
  return state;
}
function protection(state) {
  return JSON.stringify({
    inputs:state.inputs, fires:state.fireEvents, faults:state.faults,
    devices:state.disabledDevices, zones:state.disabledZones, sectors:state.disabledSectors,
    channels:state.disabledChannels, outputs:state.disabledOutputs, tests:state.testZones,
    weeklyTest:state.weeklyTest, buzzer:state.buzzer, sounders:state.sounders,
    clock:state.clock, dayOverride:state.dayOverride,
  });
}
function goalReady(state, goal) {
  return state.nodeId === goal.nodeId && Object.entries(goal.values || {}).every(([key, value]) => String(state.form[key] ?? '') === String(value)) &&
    (goal.cursor === undefined || goal.cursor === state.cursor);
}
function recoverDraft(state, step) {
  const before = protection(state);
  for (let i = 0; i < 200; i++) {
    if (goalReady(state, step.goal)) {
      assert.equal(protection(state), before, `${step.id}: preparation cannot alter protection`);
      return state;
    }
    const snapshot = JSON.stringify(state);
    const hint = nextNanoHint(model, state, step);
    assert.equal(JSON.stringify(state), snapshot, 'A hint must never press a key or mutate state');
    assert.equal(hint.found, true, `${step.id}: ${hint.reason}`);
    assert.ok(hint.key, `${step.id}: a recoverable goal needs a physical next key`);
    state = press(state, hint.key);
    assert.notEqual(state.lastAction?.ok, false, `${step.id}: recovery key rejected`);
  }
  assert.fail(`${step.id}: recovery route did not converge`);
}
function detour(state) {
  for (let i = 0; state.nodeId !== 'status' && i < 12; i++) state = press(state, 'RIGHT_SOFT');
  assert.equal(state.nodeId, 'status');
  if (state.accessLevel > 1) state = press(state, 'RIGHT_SOFT');
  // Open the unrelated Logs menu. All recovery must be by the learner's keys.
  state = press(state, 'LEFT_SOFT', 'LEFT_SOFT');
  assert.equal(state.nodeId, 'logs');
  assert.equal(state.accessLevel, 1);
  return state;
}

test('Nano training has four tracks, substantive tutorials and a source-backed help library', () => {
  assert.equal(content.panelId, source.id);
  assert.equal(content.fixtureId, source.fixture.id);
  assert.equal(content.tracks.length, 4);
  assert.equal(content.lessons.length, 28);
  assert.equal(lessonIds.size, 28);
  assert.equal(content.helpArticles.length, 34);
  assert.equal(content.glossary.length, 20);
  const tracks = new Set(content.tracks.map(t => t.id));
  const scenarios = new Set(source.scenarios.map(s => s.id));
  const stepIds = new Set();
  for (const lesson of content.lessons) {
    assert.ok(tracks.has(lesson.trackId) && scenarios.has(lesson.scenario), lesson.id);
    assert.ok(lesson.prerequisites.length && lesson.restoreInstruction && lesson.completionConditions.length, lesson.id);
    assert.ok(lesson.steps.length >= 3, lesson.id);
    if (lesson.restoreLessonId) assert.ok(lessonIds.has(lesson.restoreLessonId));
    checkReferences(lesson, lesson.id);
    for (const step of lesson.steps) {
      assert.ok(!stepIds.has(step.id));stepIds.add(step.id);
      assert.ok(step.title && step.explanation && step.expected && step.commonMistake && step.conditions.length, step.id);
      assert.ok(step.action || step.goal || step.nextKey, step.id);
      assert.ok(!(step.action && step.nextKey), step.id);
      assert.ok(Array.isArray(step.expectedKeys), step.id);
      for (const key of step.expectedKeys) assert.ok(keys.has(key), `${step.id}: invented physical key ${key}`);
      if (step.nextKey) assert.ok(keys.has(step.nextKey), step.id);
      if (step.action) {
        assert.ok(['acknowledge','set-input','set-fault','tick'].includes(step.action.type), step.id);
        assert.equal(step.expectedKeys.length, 0, `${step.id}: lab actions must be distinct from panel keys`);
      }
      if (step.goal) assert.ok(step.goal.nodeId === 'status' || model.nodes[step.goal.nodeId], step.id);
      checkReferences(step, step.id);
    }
  }
  assert.equal(stepIds.size, 229);
  assert.equal(content.lessons.flatMap(l => l.steps).reduce((sum,s)=>sum+s.expectedKeys.length,0), 835);
});

test('Nano help, glossary, source limits and cross-links refer to pinned manufacturer pages', () => {
  for (const item of [...content.helpArticles,...content.glossary,...content.sourceGaps]) {
    checkReferences(item,item.id || item.term);
    for (const id of item.relatedLessonIds || []) assert.ok(lessonIds.has(id), `${item.id}: missing related lesson ${id}`);
  }
  const history = content.helpArticles.find(a=>a.id==='nano-history-help');
  assert.ok(history.sourceRefs.some(r=>r.sourceId==='nano-commissioning-3'&&r.pages.includes(22)), '999-event bound requires its older source');
  assert.match(history.body,/older V2/);
  for (const id of ['nano-disable-device','nano-enable-device']) {
    const l=content.lessons.find(l=>l.id===id);
    assert.equal(l.status,'configuration-dependent');
    assert.ok(l.sourceRefs.some(r=>r.sourceId==='nano-commissioning-3'&&r.pages.includes(58)));
    assert.match(l.steps[0].explanation,/real access may differ/);
  }
});

test('Nano uses its physical scrolling PIN controls and explicit alarm re-press', () => {
  const lesson=content.lessons.find(l=>l.id==='nano-customer-code');
  assert.deepEqual(lesson.steps[0].expectedKeys,['LEFT_SOFT','NEXT','LEFT_SOFT','LEFT_SOFT','LEFT_SOFT'],
    'Menu > User > System > Code must match the documented branch order');
  assert.ok(lesson.steps[1].expectedKeys.every(k=>['PLUS','MINUS','NEXT'].includes(k)));
  assert.equal(lesson.steps[2].expectedKeys.at(-1),'LEFT_SOFT');
  const buzzer=content.lessons.find(l=>l.id==='nano-fire-buzzer');
  assert.equal(buzzer.steps[1].allowAccessPrompt,true);
  assert.deepEqual(buzzer.steps[1].expectedKeys,['CANCEL_BUZZER']);
  assert.deepEqual(buzzer.steps[4].expectedKeys,['CANCEL_BUZZER']);
  assert.ok(buzzer.steps[3].conditions.some(c=>c.type==='buzzer'&&c.value===true), 'Accepting access must not cancel the buzzer');
});

for (const lesson of content.lessons) test(`Nano literal lesson route reaches every outcome: ${lesson.title}`, () => {
  const state=replayTo(lesson);
  assert.equal(condition(state,lesson.completionConditions),true,`${lesson.id}: final result`);
});

const recoveryIds=['nano-disable-device','nano-enable-device','nano-disable-zone','nano-enable-zone','nano-disable-sector','nano-enable-sector','nano-master-alarms','nano-zone-test','nano-clock','nano-day-night'];
for (const id of recoveryIds) test(`Nano hints rebuild an abandoned draft after logout: ${id}`, () => {
  const lesson=content.lessons.find(l=>l.id===id);
  const commit=lesson.steps.find(s=>s.nextKey==='LEFT_SOFT'&&s.goal?.values&&s.goal.nodeId!=='pin');
  assert.ok(commit,`${id}: needs an explicit save`);
  let state=replayTo(lesson,commit.id);
  const old=protection(state);
  state=detour(state);
  assert.equal(protection(state),old,'Leaving a form and logging out cannot commit its draft');
  state=recoverDraft(state,commit);
  assert.equal(protection(state),old,'Recovery must preserve the protection state before Save');
  const sequence=state.lastEvent?.sequence;
  state=press(state,commit.nextKey);
  assert.equal(condition(state,commit.conditions),true,commit.id);
  assert.notEqual(state.lastEvent?.sequence,sequence,'The learner commits a fresh semantic event');
});

test('Nano PIN hints recover wrong digits and cursor positions without submitting the code', () => {
  const lesson=content.lessons.find(l=>l.id==='nano-customer-code');
  const target=lesson.steps[1];
  let state=replayTo(lesson,target.id);
  state=press(state,'MINUS','NEXT','PLUS','PLUS','NEXT','NEXT','PLUS');
  assert.notEqual(state.form.pin,'2468');
  const old=protection(state);
  state=recoverDraft(state,target);
  assert.equal(state.form.pin,'2468');
  assert.equal(state.cursor,3);
  assert.equal(state.accessLevel,1,'Setting digits is not accepting access');
  assert.equal(protection(state),old);
  state=press(state,'LEFT_SOFT');
  assert.equal(state.accessLevel,2);
});

test('Nano weekly-test completion requires an explicit stop after automatic silence and reset', () => {
  const l=content.lessons.find(l=>l.id==='nano-weekly-test');
  const stop=l.steps.find(s=>s.conditions.some(c=>c.type==='event'&&c.value==='weekly-test-stopped'));
  const before=replayTo(l,stop.id);
  assert.equal(before.weeklyTest,true);
  assert.equal(before.fireEvents.length,0);
  assert.equal(before.sounders,false);
  assert.equal(condition(before,l.completionConditions),false);
  const after=press(before,'LEFT_SOFT');
  assert.equal(condition(after,l.completionConditions),true);
});

test('Nano lessons never direct a verified drill into engineering-only reference screens', () => {
  for (const l of content.lessons) for (const s of l.steps) {
    if(!s.goal||s.goal.nodeId==='status')continue;
    const n=model.nodes[s.goal.nodeId];
    assert.notEqual(n.kind,'reference',`${s.id}: reference screens are not executable lessons`);
    assert.ok((n.accessLevel||1)<=2,`${s.id}: this is an operator trainer`);
  }
});
