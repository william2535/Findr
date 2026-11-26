/**
 * FINDR's generic cause-and-effect learning model. This is deliberately not a
 * manufacturer's configuration format, a real panel connection or a life-safety
 * design verifier. All time is simulated; no wall-clock timers or network calls.
 */
export const CAUSE_EFFECT_SCHEMA = 1;
export const CAUSE_EFFECT_LIMITS = Object.freeze({inputs: 64, outputs: 64, delaySeconds: 3600, advanceSeconds: 3600, durationSeconds: 86400, commands: 2000, importBytes: 2097152});
export const CAUSE_EFFECT_NOTICE = 'Learning simulation and design draft only. Confirm the installed panel capabilities, approved cause-and-effect specification and commissioning tests before real programming. No configuration is sent to a panel.';
export const CAUSE_EFFECT_SEMANTICS = 'ANY needs one selected input; ALL needs every selected input. An empty group never activates. Delay restarts after the condition clears. Latched demand remains until causes clear and reset is pressed. Isolation blocks the simulated output but does not cancel its timer or latch; restoring can activate it immediately.';
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const clone = value => structuredClone(value);
const uid = () => globalThis.crypto?.randomUUID?.() || `ce-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
const fail = message => { const error = new Error(message); error.code = 'CAUSE_EFFECT_INVALID'; throw error; };
function text(value, title, max, blank = false) {
  if (typeof value !== 'string' || value.length > max || (!blank && !value.trim())) fail(`${title} must be ${blank ? '' : 'non-empty '}text, up to ${max} characters.`);
  return value.trim();
}
function identity(value, title) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value) || ['__proto__', 'constructor', 'prototype'].includes(value)) fail(`${title} has an invalid ID.`);
  return value;
}
function integer(value, title, max, min = 0) {
  if (!Number.isSafeInteger(value) || value < min || value > max) fail(`${title} must be a whole number from ${min} to ${max}.`);
  return value;
}
function bool(value, title) { if (typeof value !== 'boolean') fail(`${title} must be true or false.`); return value; }
function enumValue(value, allowed, title) { if (!allowed.includes(value)) fail(`${title} is not supported.`); return value; }
function keys(value, allowed, title) {
  if (!object(value) || Object.keys(value).some(key => !allowed.includes(key))) fail(`${title} has unknown or invalid fields.`);
}

/** Validate, copy and canonicalise; unknown fields are rejected, never executed. */
export function validateProject(value) {
  keys(value, ['schemaVersion', 'id', 'name', 'notes', 'createdAt', 'updatedAt', 'revision', 'inputs', 'outputs'], 'Project');
  if (value.schemaVersion !== CAUSE_EFFECT_SCHEMA) fail('This matrix uses an unsupported schema version.');
  if (!Array.isArray(value.inputs) || value.inputs.length > CAUSE_EFFECT_LIMITS.inputs || !Array.isArray(value.outputs) || value.outputs.length > CAUSE_EFFECT_LIMITS.outputs) fail('Use up to 64 inputs and 64 outputs in this learning matrix.');
  const ids = new Set();
  const inputs = value.inputs.map(input => {
    keys(input, ['id', 'label', 'kind', 'notes'], 'Input');
    const id = identity(input.id, 'Input');
    if (ids.has(id)) fail('Inputs and outputs must have unique IDs.');
    ids.add(id);
    return {id, label: text(input.label, 'Input label', 120), kind: enumValue(input.kind, ['zone', 'device', 'manual'], 'Input kind'), notes: text(input.notes ?? '', 'Input notes', 2000, true)};
  });
  const inputIds = new Set(inputs.map(input => input.id));
  const outputs = value.outputs.map(output => {
    keys(output, ['id', 'label', 'kind', 'logic', 'inputIds', 'delaySeconds', 'latching'], 'Output');
    const id = identity(output.id, 'Output');
    if (ids.has(id)) fail('Inputs and outputs must have unique IDs.');
    ids.add(id);
    if (!Array.isArray(output.inputIds) || output.inputIds.length > inputs.length || new Set(output.inputIds).size !== output.inputIds.length || output.inputIds.some(input => !inputIds.has(input))) fail('An output refers to a missing or repeated input.');
    return {id, label: text(output.label, 'Output label', 120), kind: enumValue(output.kind, ['sounder', 'relay', 'interface', 'other'], 'Output kind'), logic: enumValue(output.logic, ['any', 'all'], 'Output logic'), inputIds: [...output.inputIds], delaySeconds: integer(output.delaySeconds, 'Delay', CAUSE_EFFECT_LIMITS.delaySeconds), latching: bool(output.latching, 'Latching')};
  });
  return {schemaVersion: CAUSE_EFFECT_SCHEMA, id: identity(value.id, 'Project'), name: text(value.name, 'Project name', 160), notes: text(value.notes ?? '', 'Project notes', 6000, true), createdAt: integer(value.createdAt, 'Creation time', Number.MAX_SAFE_INTEGER), updatedAt: integer(value.updatedAt, 'Update time', Number.MAX_SAFE_INTEGER), revision: integer(value.revision, 'Revision', Number.MAX_SAFE_INTEGER), inputs, outputs};
}

export function createProject({name = 'My cause & effect', template = 'blank'} = {}) {
  enumValue(template, ['blank', 'evacuation', 'coincidence', 'staged'], 'Template');
  const now = Date.now();
  const project = {schemaVersion: CAUSE_EFFECT_SCHEMA, id: uid(), name, notes: '', createdAt: now, updatedAt: now, revision: 0,
    inputs: [1, 2, 3].map(n => ({id: `z${n}`, label: `Zone ${n}`, kind: 'zone', notes: ''})),
    outputs: [1, 2, 3].map(n => ({id: `o${n}`, label: `Output group ${n}`, kind: n === 1 ? 'sounder' : 'relay', logic: 'any', inputIds: [], delaySeconds: 0, latching: false}))};
  if (template === 'evacuation') {
    project.outputs = [{...project.outputs[0], label: 'Evacuation sounders', inputIds: ['z1', 'z2', 'z3'], latching: true}];
    project.notes = 'Generic practice: any selected zone requests the common output. Clear the zone and reset to release the latch.';
  } else if (template === 'coincidence') {
    project.outputs = [{...project.outputs[0], label: 'Practice coincidence output', logic: 'all', inputIds: ['z1', 'z2']}];
    project.notes = 'Generic two-input logic exercise only; not a suppression, release or evacuation specification.';
  } else if (template === 'staged') {
    project.outputs = [{...project.outputs[0], label: 'Immediate group', inputIds: ['z1']}, {...project.outputs[1], label: 'Delayed group', inputIds: ['z1'], delaySeconds: 30}];
    project.notes = 'Generic timing exercise only. A delay is not permission to delay an installed fire-alarm response.';
  }
  return validateProject(project);
}

/** Immutable edits keep saved revision until the store commits a new revision. */
export function updateProject(project, change) {
  const next = validateProject(project);
  if (!object(change)) fail('Choose a matrix edit.');
  if (change.type === 'rename') next.name = change.name;
  else if (change.type === 'notes') next.notes = change.notes;
  else if (change.type === 'add-input') next.inputs.push({id: uid(), label: `Input ${next.inputs.length + 1}`, kind: 'zone', notes: '', ...(change.input || {})});
  else if (change.type === 'add-output') next.outputs.push({id: uid(), label: `Output group ${next.outputs.length + 1}`, kind: 'sounder', logic: 'any', inputIds: [], delaySeconds: 0, latching: false, ...(change.output || {})});
  else if (change.type === 'remove-input' || change.type === 'remove-output') {
    const field = change.type === 'remove-input' ? 'inputs' : 'outputs';
    if (!next[field].some(item => item.id === change.id)) fail('That item is no longer in this matrix.');
    next[field] = next[field].filter(item => item.id !== change.id);
    if (field === 'inputs') next.outputs.forEach(output => { output.inputIds = output.inputIds.filter(id => id !== change.id); });
  } else if (change.type === 'update-input' || change.type === 'update-output') {
    const field = change.type === 'update-input' ? 'inputs' : 'outputs';
    const index = next[field].findIndex(item => item.id === change.id);
    if (index < 0 || !object(change.patch) || own(change.patch, 'id')) fail('Choose an existing item; its ID cannot be changed.');
    next[field][index] = {...next[field][index], ...clone(change.patch)};
  } else fail('Unknown matrix edit.');
  next.updatedAt = Date.now();
  return validateProject(next);
}

function signature(project) {
  return JSON.stringify([project.id, project.inputs.map(input => [input.id, input.label]), project.outputs]);
}
function condition(output, state) {
  const matchedInputIds = output.inputIds.filter(id => state.inputs[id]);
  const missingInputIds = output.inputIds.filter(id => !state.inputs[id]);
  return {condition: output.inputIds.length > 0 && (output.logic === 'any' ? matchedInputIds.length > 0 : missingInputIds.length === 0), matchedInputIds, missingInputIds};
}
function applyDemand(project, state) {
  for (const output of project.outputs) {
    const current = state.outputs[output.id], met = condition(output, state).condition;
    if (!met) current.pendingSince = null;
    else if (current.pendingSince === null) current.pendingSince = state.time;
    const mature = met && state.time - current.pendingSince >= output.delaySeconds;
    if (mature && output.latching) current.latched = true;
    current.demand = mature || current.latched;
  }
}
function validSimulation(project, state) {
  if (!object(state) || state.schemaVersion !== 1 || state.signature !== signature(project)) fail('The matrix changed. Start a fresh simulation for the current configuration.');
  integer(state.time, 'Simulation time', CAUSE_EFFECT_LIMITS.durationSeconds);
  if (!object(state.inputs) || !object(state.outputs) || Object.keys(state.inputs).length !== project.inputs.length || Object.keys(state.outputs).length !== project.outputs.length) fail('This simulation state cannot be read. Replay its recorded actions instead.');
  for (const input of project.inputs) bool(state.inputs[input.id], 'Input state');
  for (const output of project.outputs) {
    const item = state.outputs[output.id];
    if (!object(item)) fail('An output simulation state is missing.');
    for (const key of ['latched', 'demand', 'isolated']) bool(item[key], key);
    if (item.pendingSince !== null) integer(item.pendingSince, 'Delay start', state.time);
  }
  if (!Array.isArray(state.events) || state.events.length > CAUSE_EFFECT_LIMITS.commands) fail('This simulation log is too large. Export it and start a fresh run.');
}
export function createSimulation(value) {
  const project = validateProject(value);
  return {schemaVersion: 1, signature: signature(project), time: 0,
    inputs: Object.fromEntries(project.inputs.map(input => [input.id, false])),
    outputs: Object.fromEntries(project.outputs.map(output => [output.id, {pendingSince: null, latched: false, demand: false, isolated: false}])), events: []};
}

function evaluateOutputs(project, state) {
  return project.outputs.map(output => {
    const current = state.outputs[output.id], match = condition(output, state);
    const remainingSeconds = match.condition && !current.demand ? Math.max(0, output.delaySeconds - (state.time - current.pendingSince)) : 0;
    const pending = remainingSeconds > 0;
    let reason;
    if (!output.inputIds.length) reason = 'No inputs linked. This output has no activation condition.';
    else if (current.latched && !match.condition) reason = 'Cause cleared; latched demand remains until reset.';
    else if (!match.condition) reason = output.logic === 'all' ? `Waiting for ${match.missingInputIds.length} of ${output.inputIds.length} selected inputs.` : 'None of the selected inputs is active.';
    else if (pending) reason = `Condition met; ${remainingSeconds}s of the ${output.delaySeconds}s delay remains.`;
    else reason = `${output.logic === 'all' ? 'All selected inputs are active' : 'A selected input is active'}; ${output.delaySeconds ? 'delay elapsed' : 'immediate demand'}${current.latched ? ', latched' : ''}.`;
    if (current.isolated) reason = `Output isolated: drive blocked. ${reason} Timer and latch remain live; restoration may activate the output.`;
    return {...output, ...match, active: current.demand && !current.isolated, demand: current.demand, latched: current.latched, isolated: current.isolated, pending, remainingSeconds, reason};
  });
}

/** Readable decision traces; technical language refers only to this lab model. */
export function evaluateSimulation(value, state) {
  const project = validateProject(value);
  validSimulation(project, state);
  return {time: state.time, inputs: project.inputs.map(input => ({...input, active: state.inputs[input.id]})), outputs: evaluateOutputs(project, state), events: clone(state.events)};
}

export function stepSimulation(value, previous, action) {
  const project = validateProject(value);
  validSimulation(project, previous);
  if (previous.events.length >= CAUSE_EFFECT_LIMITS.commands) fail('This run has 2,000 recorded actions. Export it and start a fresh simulation.');
  if (!object(action)) fail('Choose a simulation action.');
  const before = evaluateOutputs(project, previous);
  // Historical events are immutable records. Reuse them during replay rather
  // than repeatedly deep-copying the entire growing log for every command.
  const state = {...previous, inputs: {...previous.inputs}, outputs: Object.fromEntries(Object.entries(previous.outputs).map(([id, value]) => [id, {...value}])), events: [...previous.events]};
  let description;
  if (action.type === 'input') {
    const input = project.inputs.find(item => item.id === action.id);
    if (!input) fail('That input does not exist in this matrix.');
    state.inputs[input.id] = bool(action.active, 'Input state');
    description = `${input.label}: ${action.active ? 'activated' : 'cleared'}.`;
  } else if (action.type === 'advance') {
    integer(action.seconds, 'Time advance', CAUSE_EFFECT_LIMITS.advanceSeconds, 1);
    integer(state.time + action.seconds, 'Simulation time', CAUSE_EFFECT_LIMITS.durationSeconds);
    state.time += action.seconds;
    description = `Advanced the simulation by ${action.seconds}s.`;
  } else if (action.type === 'isolate') {
    const output = project.outputs.find(item => item.id === action.id);
    if (!output) fail('That output does not exist in this matrix.');
    state.outputs[output.id].isolated = bool(action.isolated, 'Isolation');
    description = `${output.label}: ${action.isolated ? 'isolated in the simulation; timer and latch continue' : 'restored in the simulation; current demand is applied'}.`;
  } else if (action.type === 'reset') {
    const held = [];
    for (const output of project.outputs) {
      if (condition(output, state).condition) held.push(output.label);
      else state.outputs[output.id].latched = false;
    }
    description = held.length ? `Reset requested. Cleared causes released; active causes retained for: ${held.join(', ')}.` : 'Reset requested. Cleared causes and latches released.';
  } else fail('Unknown simulation action.');
  applyDemand(project, state);
  const after = evaluateOutputs(project, state);
  const changes = after.flatMap((output, i) => {
    const old = before[i];
    return ['active', 'demand', 'latched', 'isolated', 'pending', 'remainingSeconds', 'condition'].some(key => output[key] !== old[key]) ? [{outputId: output.id, label: output.label, active: output.active, demand: output.demand, isolated: output.isolated, pending: output.pending, remainingSeconds: output.remainingSeconds, reason: output.reason}] : [];
  });
  state.events.push(Object.freeze({sequence: state.events.length + 1, time: state.time, type: action.type, text: description, changes: Object.freeze(changes.map(item => Object.freeze(item)))}));
  return state;
}

export function replaySimulation(project, commands) {
  if (!Array.isArray(commands) || commands.length > CAUSE_EFFECT_LIMITS.commands) fail('A saved simulation needs at most 2,000 recorded actions.');
  return commands.reduce((state, command) => stepSimulation(project, state, command), createSimulation(project));
}
/** Large saved runs can resume without monopolising a phone's main thread. */
export async function replaySimulationAsync(project, commands, {signal, onProgress = () => {}, yieldControl = () => new Promise(resolve => setTimeout(resolve, 0))} = {}) {
  if (!Array.isArray(commands) || commands.length > CAUSE_EFFECT_LIMITS.commands) fail('A saved simulation needs at most 2,000 recorded actions.');
  let state = createSimulation(project);
  for (let i = 0; i < commands.length; i++) {
    if (signal?.aborted) throw new DOMException('Restoring the simulation was cancelled.', 'AbortError');
    state = stepSimulation(project, state, commands[i]);
    if ((i + 1) % 16 === 0 || i + 1 === commands.length) {
      onProgress({completed: i + 1, total: commands.length});
      await yieldControl();
    }
  }
  if (signal?.aborted) throw new DOMException('Restoring the simulation was cancelled.', 'AbortError');
  return state;
}
export function exportProject(project) {
  return JSON.stringify({format: 'findr-cause-effect', version: 1, project: validateProject(project)}, null, 2);
}
export function importProject(raw) {
  if (typeof raw !== 'string' || new TextEncoder().encode(raw).byteLength > CAUSE_EFFECT_LIMITS.importBytes) fail('Choose a FINDR matrix JSON file smaller than 2 MB.');
  let envelope;
  try { envelope = JSON.parse(raw); } catch { fail('This file is not valid JSON. The current matrix has not been changed.'); }
  keys(envelope, ['format', 'version', 'project'], 'Import');
  if (envelope.format !== 'findr-cause-effect' || envelope.version !== 1) fail('Choose an exported FINDR cause-and-effect matrix, not a native panel backup.');
  const project = validateProject(envelope.project), now = Date.now();
  return {...project, id: uid(), createdAt: now, updatedAt: now, revision: 0};
}
export function projectSummary(value) {
  const project = validateProject(value);
  return {id: project.id, name: project.name, inputs: project.inputs.length, outputs: project.outputs.length, links: project.outputs.reduce((total, output) => total + output.inputIds.length, 0), unlinkedOutputs: project.outputs.filter(output => !output.inputIds.length).map(output => output.label), delayedOutputs: project.outputs.filter(output => output.delaySeconds > 0).length, revision: project.revision, updatedAt: project.updatedAt};
}
