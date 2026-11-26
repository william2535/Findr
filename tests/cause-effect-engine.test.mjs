import test from 'node:test';
import assert from 'node:assert/strict';
import {CAUSE_EFFECT_LIMITS, createProject, validateProject, updateProject, createSimulation, stepSimulation, evaluateSimulation, replaySimulation, replaySimulationAsync, exportProject, importProject, projectSummary} from '../public/app/cause-effect-engine.mjs';

function matrix(options = {}) {
  const project = createProject({template: 'blank'});
  project.outputs = [{id: 'o1', label: 'Practice sounders', kind: 'sounder', logic: 'any', inputIds: ['z1', 'z2'], delaySeconds: 0, latching: false, ...options}];
  return validateProject(project);
}
const output = (project, simulation) => evaluateSimulation(project, simulation).outputs[0];
const input = (project, state, id, active) => stepSimulation(project, state, {type: 'input', id, active});
const advance = (project, state, seconds) => stepSimulation(project, state, {type: 'advance', seconds});

test('ANY / ALL evaluate selected inputs, and an empty group never activates', () => {
  for (const logic of ['any', 'all']) {
    const p = matrix({logic}); let s = createSimulation(p);
    s = input(p, s, 'z3', true);
    assert.equal(output(p, s).active, false, 'unlinked input must not activate');
    s = input(p, s, 'z1', true);
    assert.equal(output(p, s).active, logic === 'any');
    s = input(p, s, 'z2', true);
    assert.equal(output(p, s).active, true);
    assert.deepEqual(output(p, s).matchedInputIds, ['z1', 'z2']);
    s = input(p, s, 'z1', false);
    assert.equal(output(p, s).active, logic === 'any');
  }
  const empty = matrix({logic: 'all', inputIds: []});
  assert.equal(output(empty, input(empty, createSimulation(empty), 'z1', true)).active, false);
});

test('delay uses manual time, cancels on cause loss and starts a full new period', () => {
  const p = matrix({delaySeconds: 30}); let s = input(p, createSimulation(p), 'z1', true);
  assert.equal(output(p, s).remainingSeconds, 30);
  s = advance(p, s, 20); assert.equal(output(p, s).remainingSeconds, 10);
  s = input(p, s, 'z1', false); assert.equal(output(p, s).pending, false);
  s = advance(p, s, 100); assert.equal(output(p, s).active, false);
  s = input(p, s, 'z1', true); assert.equal(output(p, s).remainingSeconds, 30);
  s = advance(p, s, 29); assert.equal(output(p, s).active, false);
  s = advance(p, s, 1); assert.equal(output(p, s).active, true);
  assert.equal(s.time, 150);
});

test('ANY delay continues when a different selected input remains active', () => {
  const p = matrix({delaySeconds: 20}); let s = input(p, createSimulation(p), 'z1', true);
  s = advance(p, s, 10); s = input(p, s, 'z2', true); s = input(p, s, 'z1', false);
  assert.equal(output(p, s).remainingSeconds, 10);
  s = advance(p, s, 10); assert.equal(output(p, s).active, true);
});

test('latching requires matured demand; active reset cannot falsely clear a cause', () => {
  const p = matrix({delaySeconds: 10, latching: true}); let s = input(p, createSimulation(p), 'z1', true);
  s = advance(p, s, 5); s = stepSimulation(p, s, {type: 'reset'});
  assert.equal(output(p, s).remainingSeconds, 5, 'reset while cause present must not restart or skip delay');
  s = advance(p, s, 5); assert.equal(output(p, s).latched, true);
  s = stepSimulation(p, s, {type: 'reset'}); assert.equal(output(p, s).active, true);
  assert.match(s.events.at(-1).text, /active causes retained/);
  s = input(p, s, 'z1', false); assert.equal(output(p, s).active, true);
  assert.match(output(p, s).reason, /Cause cleared; latched/);
  s = stepSimulation(p, s, {type: 'reset'}); assert.equal(output(p, s).active, false);
  assert.equal(output(p, s).latched, false);
});

test('clearing a delayed cause before maturation never creates a latch', () => {
  const p = matrix({delaySeconds: 15, latching: true}); let s = input(p, createSimulation(p), 'z1', true);
  s = advance(p, s, 14); s = input(p, s, 'z1', false); s = advance(p, s, 30);
  assert.equal(output(p, s).latched, false); assert.equal(output(p, s).active, false);
});

test('isolation blocks drive, retains timer and latch and can energise on restore', () => {
  const p = matrix({delaySeconds: 10, latching: true}); let s = createSimulation(p);
  s = stepSimulation(p, s, {type: 'isolate', id: 'o1', isolated: true});
  s = input(p, s, 'z1', true); s = advance(p, s, 10);
  assert.equal(output(p, s).active, false); assert.equal(output(p, s).demand, true);
  assert.equal(output(p, s).latched, true); assert.match(output(p, s).reason, /restoration may activate/);
  s = input(p, s, 'z1', false);
  s = stepSimulation(p, s, {type: 'isolate', id: 'o1', isolated: false});
  assert.equal(output(p, s).active, true);
  s = stepSimulation(p, s, {type: 'reset'}); assert.equal(output(p, s).active, false);
});

test('decision trace and deterministic replay preserve exact order and simulated times', () => {
  const p = matrix({delaySeconds: 2});
  const actions = [{type: 'input', id: 'z1', active: true}, {type: 'advance', seconds: 2}, {type: 'isolate', id: 'o1', isolated: true}];
  const s = replaySimulation(p, actions);
  assert.deepEqual(s, replaySimulation(p, actions));
  assert.deepEqual(s.events.map(e => [e.sequence, e.time, e.type]), [[1, 0, 'input'], [2, 2, 'advance'], [3, 2, 'isolate']]);
  assert.equal(s.events[1].changes[0].active, true);
  assert.match(s.events[1].changes[0].reason, /delay elapsed/);
  assert.throws(() => { s.events[0].text = 'Rewritten history'; }, TypeError);
  const display = evaluateSimulation(p, s); display.events[0].text = 'UI copy';
  assert.notEqual(s.events[0].text, 'UI copy');
});

test('chunked replay yields, reports real completion and can cancel without a partial success', async () => {
  const p = matrix(), commands = Array.from({length: 40}, (_, i) => ({type: 'input', id: 'z1', active: i % 2 === 0}));
  const progress = []; let yields = 0;
  const restored = await replaySimulationAsync(p, commands, {onProgress: value => progress.push(value), yieldControl: async () => { yields++; }});
  assert.deepEqual(restored, replaySimulation(p, commands));
  assert.equal(yields, 3); assert.deepEqual(progress.map(p => p.completed), [16, 32, 40]);
  const controller = new AbortController();
  await assert.rejects(replaySimulationAsync(p, commands, {signal: controller.signal, yieldControl: async () => controller.abort()}), e => e.name === 'AbortError');
});

test('config changes invalidate an old run without mutating the original project or state', () => {
  const p = matrix(), state = createSimulation(p), before = structuredClone(p);
  const changed = updateProject(p, {type: 'update-output', id: 'o1', patch: {delaySeconds: 25}});
  assert.deepEqual(p, before);
  assert.throws(() => stepSimulation(changed, state, {type: 'advance', seconds: 1}), /matrix changed/);
  const stepped = input(p, state, 'z1', true);
  assert.equal(state.inputs.z1, false); assert.equal(stepped.inputs.z1, true);
  assert.equal(evaluateSimulation(changed, createSimulation(changed)).outputs[0].active, false);
});

test('removing an input removes its links, with empty ALL still false', () => {
  const p = matrix({logic: 'all', inputIds: ['z1']});
  const edited = updateProject(p, {type: 'remove-input', id: 'z1'});
  assert.deepEqual(edited.outputs[0].inputIds, []);
  assert.equal(output(edited, createSimulation(edited)).active, false);
  assert.equal(p.inputs.length, 3);
});

test('bounded monotonic simulation rejects invalid, ambiguous and unknown commands', () => {
  const p = matrix(), s = createSimulation(p);
  for (const seconds of [-1, 0, 1.5, Infinity, 3601, '10']) assert.throws(() => advance(p, s, seconds), /whole number/);
  assert.throws(() => input(p, s, 'missing', true), /does not exist/);
  assert.throws(() => input(p, s, 'z1', 'true'), /true or false/);
  assert.throws(() => stepSimulation(p, s, {type: 'network-program'}), /Unknown/);
  assert.throws(() => replaySimulation(p, new Array(2001).fill({type: 'reset'})), /2,000/);
  let end = s; for (let i = 0; i < 24; i++) end = advance(p, end, 3600);
  assert.throws(() => advance(p, end, 1), /Simulation time/);
});

test('schema rejects dangling references, duplicates, non-finite values and prototype fields', () => {
  const p = matrix();
  for (const patch of [{inputIds: ['missing']}, {inputIds: ['z1', 'z1']}, {logic: 'xor'}, {delaySeconds: NaN}, {delaySeconds: 0.5}, {latching: 1}]) assert.throws(() => validateProject({...p, outputs: [{...p.outputs[0], ...patch}]}));
  assert.throws(() => validateProject({...p, inputs: [...p.inputs, p.inputs[0]]}), /unique IDs/);
  assert.throws(() => validateProject({...p, outputs: [{...p.outputs[0], id: 'z1'}]}), /unique IDs/);
  assert.throws(() => validateProject({...p, schemaVersion: 99}), /schema version/);
  assert.throws(() => validateProject({...p, inputs: [{...p.inputs[0], id: 'constructor'}]}), /invalid ID/);
  assert.throws(() => validateProject(JSON.parse(JSON.stringify(p).replace('"schemaVersion":1', '"__proto__":{},"schemaVersion":1'))), /unknown or invalid/);
});

test('export and import retain the design while creating an independent project', () => {
  const p = createProject({name: 'School A – practice', template: 'staged'}); p.revision = 3;
  const restored = importProject(exportProject(p));
  assert.notEqual(restored.id, p.id); assert.equal(restored.revision, 0);
  assert.equal(restored.name, p.name); assert.deepEqual(restored.inputs, p.inputs); assert.deepEqual(restored.outputs, p.outputs);
  assert.equal(projectSummary(restored).links, 2);
  assert.throws(() => importProject('{not-json'), /not valid JSON/);
  assert.throws(() => importProject(JSON.stringify(p)), /unknown or invalid fields/);
  assert.throws(() => importProject(JSON.stringify({format: 'native-backup', version: 1, project: p})), /not a native panel backup/);
  assert.throws(() => importProject(' '.repeat(CAUSE_EFFECT_LIMITS.importBytes + 1)), /2 MB/);
});

test('largest allowed labels, notes and fully connected matrix roundtrip below import limit', () => {
  const p = createProject();
  p.name = '𐍈'.repeat(80); p.notes = '𐍈'.repeat(3000);
  p.inputs = Array.from({length: 64}, (_, n) => ({id: `z${n}`.padEnd(80, 'x'), label: '𐍈'.repeat(60), kind: 'zone', notes: '𐍈'.repeat(1000)}));
  p.outputs = Array.from({length: 64}, (_, n) => ({id: `o${n}`.padEnd(80, 'x'), label: '𐍈'.repeat(60), kind: 'other', logic: 'all', inputIds: p.inputs.map(i => i.id), delaySeconds: 3600, latching: true}));
  const json = exportProject(p);
  assert.ok(new TextEncoder().encode(json).length < CAUSE_EFFECT_LIMITS.importBytes);
  assert.deepEqual(importProject(json).outputs, p.outputs);
});
