/**
 * Bounded, deterministic FINDR learning exercise; never communicates with a panel.
 * The supplied survey, section tests and per-device counts are fictional training
 * data. Protec's Map Node is an approximate isolator grouping, not cable order.
 */
export const LOOP_SCHEMA = 1;
export const LOOP_LIMITS = Object.freeze({actions: 300, noteCharacters: 2000, observationSeconds: 3600});
export const LOOP_NOTICE = 'FINDR training only. Virtual section tests do not represent a Protec menu command or instructions for disconnecting a live loop. Use the applicable manufacturer procedure, site authority, monitoring and impairment arrangements for real work.';
export const LOOP_COUNTER_NOTICE = 'Each sample advances one simulated hour. Per-device attempts and missed replies below are synthetic teaching data; the cited panel manual documents a total missed-reply counter. Lower totals with fewer devices polled do not establish a better loop. The real Reset Counts also clears Total Exchange Errors; those separate loop-card/driver communication errors are not simulated here.';

const clone = value => structuredClone(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const fail = message => { const error = new Error(message); error.code = 'PROTEC_LOOP_INVALID'; throw error; };
function keys(value, allowed, title) {
  if (!object(value) || Object.keys(value).some(key => !allowed.includes(key))) fail(`${title} has unknown or invalid fields.`);
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
const sectionIds = ['a', 'b', 'c', 'd'];
const addresses = [42, 7, 65, 12, 3, 91, 27, 16];
const labels = ['Entrance detector', 'Lobby call point', 'Corridor detector', 'Stair interface', 'Workshop detector', 'Store call point', 'Office detector', 'Rear interface'];
const sections = sectionIds.map((id, i) => ({id, label: `Survey section ${id.toUpperCase()}`, deviceIds: [`d${i * 2 + 1}`, `d${i * 2 + 2}`]}));
const devices = addresses.map((address, i) => ({id: `d${i + 1}`, address, label: labels[i], isolator: i % 2 === 1, mapNode: Math.floor(i / 2), physicalPosition: i + 1, sectionId: sectionIds[Math.floor(i / 2)]}));
const baseHints = [
  'Sort the Map column, then compare it with the supplied training survey. Addresses and tied Map numbers do not establish cable order.',
  'Reset the synthetic counts for each configuration, then record equal one-hour windows. Keep the previous observations in the log.',
  'Compare repeated windows and the opposite section. A zero for an unpolled device is no evidence of a healthy device.',
  'Restore the original configuration, reset the counts and record a final whole-loop window. Localising a suspect section does not confirm its cause or repair.'
];
export const LOOP_SCENARIOS = freeze([
  {id: 'mapped', title: 'Mapped loop', summary: 'Repeated communication losses on a loop with a supplied, checked training survey. Narrow the suspect section without guessing cable order.', devices, sections, topologyComplete: true, baselineMissingIds: [], hints: baseHints},
  {id: 'intermittent', title: 'Intermittent replies', summary: 'An intermittent indication is reported. Compare repeat windows and keep uncertainty when the symptom disappears.', devices, sections, topologyComplete: true, baselineMissingIds: [], hints: [...baseHints, 'One quiet hour cannot exclude an intermittent problem. Preserve the timestamps and arrange further observation.']},
  {id: 'incomplete', title: 'Incomplete map', summary: 'No isolators are recorded, Map nodes are tied and one scheduled device is not logged. Establish what this evidence cannot locate.', devices: devices.map((device, i) => ({...device, isolator: false, mapNode: i === 7 ? null : 0, physicalPosition: null, sectionId: null})), sections: [], topologyComplete: false, baselineMissingIds: ['d8'], hints: [...baseHints, 'Without a verified route, tied Map values cannot identify a physical section. Record the unlogged device and the missing survey for the next engineer.']}
]);
const configurationDefinitions = [
  {id: 'whole', label: 'Whole training loop', sectionIds: ['a', 'b', 'c', 'd']},
  {id: 'half-a', label: 'Virtual sections A + B only', sectionIds: ['a', 'b']},
  {id: 'half-b', label: 'Virtual sections C + D only', sectionIds: ['c', 'd']},
  ...sectionIds.map(id => ({id, label: `Virtual section ${id.toUpperCase()} only`, sectionIds: [id]}))
];
function scenarioFor(id) {
  const scenario = LOOP_SCENARIOS.find(item => item.id === id);
  if (!scenario) fail('That loop exercise is not available.');
  return scenario;
}
function configurationFor(id) {
  const config = configurationDefinitions.find(item => item.id === id);
  if (!config) fail('That virtual test configuration is not available.');
  return config;
}
function canonicalAction(action) {
  if (!object(action) || typeof action.type !== 'string') fail('Choose a loop exercise action.');
  if (['acknowledge', 'map', 'verify-topology', 'reset-counts', 'observe', 'restore', 'finish'].includes(action.type)) {
    keys(action, ['type'], 'Action'); return {type: action.type};
  }
  if (action.type === 'configure') {
    keys(action, ['type', 'configurationId'], 'Action'); configurationFor(action.configurationId);
    return {type: action.type, configurationId: action.configurationId};
  }
  if (action.type === 'conclude') {
    keys(action, ['type', 'kind', 'sectionId', 'note'], 'Conclusion');
    if (!['localised', 'unresolved'].includes(action.kind)) fail('Choose a localised or unresolved finding.');
    if (action.kind === 'localised' && !sectionIds.includes(action.sectionId)) fail('Choose the suspected survey section.');
    if (action.kind === 'unresolved' && action.sectionId != null) fail('An unresolved finding must not assign a section.');
    if (typeof action.note !== 'string' || !action.note.trim() || action.note.length > LOOP_LIMITS.noteCharacters) fail('Record the evidence and outstanding checks in a note of up to 2,000 characters.');
    return {type: action.type, kind: action.kind, sectionId: action.kind === 'localised' ? action.sectionId : null, note: action.note.trim()};
  }
  fail('Unknown loop exercise action.');
}
function initial(scenario) {
  return {scenario, acknowledged: false, mapped: false, topologyChecked: false, configurationId: 'whole', resetForConfiguration: false, seconds: 0, epoch: 0, cumulativeLost: 0, deviceTotals: Object.fromEntries(scenario.devices.map(device => [device.id, 0])), observations: [], events: [], conclusion: null, restoredAtSequence: null, complete: false};
}
function event(state, action, text) {
  state.events.push({sequence: state.events.length + 1, time: state.seconds, type: action.type, text});
}
function pollingIds(state, configurationId = state.configurationId) {
  const config = configurationFor(configurationId);
  return state.scenario.devices.filter(device => !state.scenario.baselineMissingIds.includes(device.id) && (configurationId === 'whole' || config.sectionIds.includes(device.sectionId))).map(device => device.id);
}
function evidence(state) {
  // A decrease in total losses cannot eliminate a section. Only repeat,
  // coverage-complete, equal-window observations may support an exclusion.
  const samples = state.observations.filter(sample => !sample.restorationWindow);
  const repeated = configurationDefinitions.map(config => {
    const observations = samples.filter(sample => sample.configurationId === config.id && sample.coverageComplete && sample.seconds === LOOP_LIMITS.observationSeconds);
    return {config, observations, positive: observations.length >= 2 && observations.every(sample => sample.totalMissedDelta > 0), quiet: observations.length >= 2 && observations.every(sample => sample.totalMissedDelta === 0)};
  });
  let candidates = [...sectionIds];
  if (state.scenario.id === 'mapped') for (const group of repeated) {
    if (group.positive) candidates = candidates.filter(id => group.config.sectionIds.includes(id));
    if (group.quiet) candidates = candidates.filter(id => !group.config.sectionIds.includes(id));
  }
  const wholePositive = samples.some(sample => sample.configurationId === 'whole' && sample.coverageComplete && sample.totalMissedDelta > 0);
  const only = candidates.length === 1 ? candidates[0] : null;
  const isolatedPositive = !!only && repeated.some(group => group.config.sectionIds.length === 1 && group.config.sectionIds[0] === only && group.positive);
  const oppositeCovered = !!only && sectionIds.filter(id => id !== only).every(id => repeated.some(group => group.quiet && group.config.sectionIds.includes(id)));
  const localised = state.scenario.id === 'mapped' && state.topologyChecked && wholePositive && isolatedPositive && oppositeCovered;
  const enoughForHandover = samples.length >= (state.scenario.id === 'incomplete' ? 2 : 3);
  return {samples, repeated, candidates: state.scenario.topologyComplete ? candidates : [], localised, localisedSection: localised ? only : null, enoughForHandover};
}
function checksFor(state) {
  const proof = evidence(state), conclusion = state.conclusion;
  const supported = !!conclusion && (conclusion.kind === 'localised' ? proof.localised && conclusion.sectionId === proof.localisedSection : proof.enoughForHandover);
  const finalSample = state.observations.at(-1);
  const originalIds = pollingIds(state, 'whole');
  const finalWindow = !!finalSample && state.restoredAtSequence !== null && finalSample.sequence > state.restoredAtSequence && finalSample.restorationWindow && finalSample.configurationId === 'whole' && finalSample.polledDeviceIds.length === originalIds.length && originalIds.every(id => finalSample.polledDeviceIds.includes(id));
  return [
    {id: 'scope', label: 'Training scope acknowledged', passed: state.acknowledged, detail: 'Virtual tests do not authorise work on a live system.'},
    {id: 'map', label: 'Map reviewed', passed: state.mapped && state.topologyChecked, detail: state.scenario.topologyComplete ? 'Map groups were checked against the supplied fictional survey.' : 'Tied and missing Map values do not establish the physical route.'},
    {id: 'evidence', label: 'Evidence supports the recorded finding', passed: supported, detail: !conclusion ? 'Record a finding with the evidence and checks still needed.' : conclusion.kind === 'localised' ? proof.localised && conclusion.sectionId === proof.localisedSection ? 'Repeated covered windows narrow a suspect section; its cause remains unconfirmed.' : 'Repeat equal windows in the suspected section and its opposite sections before localising.' : proof.enoughForHandover ? 'An unresolved handover preserves the observation limits and remaining work.' : 'Record more observations before ending this exercise.'},
    {id: 'restored', label: 'Original test configuration restored', passed: state.restoredAtSequence !== null && state.configurationId === 'whole', detail: 'All introduced virtual exclusions must be removed.'},
    {id: 'final-window', label: 'Final whole-loop observation recorded', passed: finalWindow, detail: finalWindow ? 'Original polling coverage was restored. This is not a repair or a healthy-system sign-off.' : 'Restore, reset the counts and record one whole-loop simulated hour.'}
  ];
}
function apply(state, action) {
  if (state.complete) fail('This exercise is finished. Start a new run to practise again.');
  if (action.type === 'acknowledge') {
    if (state.acknowledged) fail('The training scope is already acknowledged.');
    state.acknowledged = true; event(state, action, 'Training scope acknowledged. No panel is connected.'); return;
  }
  if (!state.acknowledged) fail('Acknowledge the training scope before starting.');
  if (action.type === 'map') {
    if (state.mapped) fail('The Map groups have already been reviewed.');
    state.mapped = true; event(state, action, 'Map groups reviewed. A Map Node counts preceding isolators; tied values do not order the devices within that group.'); return;
  }
  if (!state.mapped) fail('Review the Map groups first.');
  if (action.type === 'verify-topology') {
    if (state.topologyChecked) fail('The supplied survey has already been checked.');
    state.topologyChecked = true; event(state, action, state.scenario.topologyComplete ? 'Supplied fictional wiring survey checked independently of addresses and Map order. Virtual section tests are available.' : 'Survey check recorded: physical sequence is unverified. Virtual section tests remain unavailable.'); return;
  }
  if (action.type === 'configure') {
    if (action.configurationId === state.configurationId) fail('That configuration is already selected.');
    if (action.configurationId !== 'whole' && (!state.topologyChecked || !state.scenario.topologyComplete)) fail('A complete supplied training survey must be checked before virtual section tests.');
    if (action.configurationId !== 'whole' && !state.observations.some(sample => sample.configurationId === 'whole' && !sample.restorationWindow)) fail('Record the original whole-loop baseline before changing the virtual configuration.');
    state.configurationId = action.configurationId; state.resetForConfiguration = false; state.restoredAtSequence = null;
    event(state, action, `${configurationFor(action.configurationId).label} selected. Excluded devices will not be polled. Reset counts before observing.`); return;
  }
  if (action.type === 'reset-counts') {
    state.cumulativeLost = 0; Object.keys(state.deviceTotals).forEach(id => { state.deviceTotals[id] = 0; });
    state.epoch++; state.resetForConfiguration = true;
    event(state, action, `Synthetic counters reset (epoch ${state.epoch}). Earlier observations remain in the log.`); return;
  }
  if (action.type === 'observe') {
    if (!state.resetForConfiguration) fail('Reset counts for this configuration before recording its one-hour window.');
    const ids = pollingIds(state), config = configurationFor(state.configurationId);
    const start = state.seconds, index = state.observations.length;
    // Synthetic repeatable fixture, deliberately unrelated to real polling rate.
    const active = state.scenario.id === 'intermittent' ? index % 3 !== 1 : true;
    const includedProblem = state.scenario.id === 'incomplete' || config.sectionIds.includes('c');
    const rows = state.scenario.devices.map((device, i) => {
      const polled = ids.includes(device.id);
      const lostDelta = polled && active && includedProblem ? 1 + (i % 3) : 0;
      state.deviceTotals[device.id] += lostDelta;
      return {...clone(device), polled, attempts: polled ? 60 : 0, lostDelta: polled ? lostDelta : null, cumulativeLost: state.deviceTotals[device.id], status: polled ? lostDelta ? 'missed replies observed' : 'no missed replies in this window' : 'not polled — no health evidence'};
    });
    const totalMissedDelta = rows.reduce((sum, row) => sum + (row.lostDelta ?? 0), 0);
    state.cumulativeLost += totalMissedDelta; state.seconds += LOOP_LIMITS.observationSeconds;
    const expected = state.scenario.devices.filter(device => state.configurationId === 'whole' || config.sectionIds.includes(device.sectionId));
    const observation = {id: `window-${index + 1}`, sequence: state.events.length + 1, configurationId: state.configurationId, configurationLabel: config.label, sectionIds: [...config.sectionIds], epoch: state.epoch, start, end: state.seconds, seconds: LOOP_LIMITS.observationSeconds, polledDeviceIds: ids, expectedDeviceIds: expected.map(device => device.id), coverageComplete: expected.length === ids.length, wholeLoopCoverage: ids.length === state.scenario.devices.length, totalMissedDelta, cumulativeLost: state.cumulativeLost, rows, restorationWindow: state.restoredAtSequence !== null};
    state.observations.push(observation);
    event(state, action, `Hour ${start / 3600}–${state.seconds / 3600}: ${config.label}; ${ids.length}/${state.scenario.devices.length} devices polled; +${totalMissedDelta} synthetic missed replies (${state.cumulativeLost} since reset).${ids.length < state.scenario.devices.length ? ' Unpolled devices remain unassessed.' : ''}`); return;
  }
  if (action.type === 'conclude') {
    state.conclusion = {...action, sequence: state.events.length + 1};
    event(state, action, `${action.kind === 'localised' ? `Suspect section ${action.sectionId.toUpperCase()}` : 'Unresolved investigation'} recorded: ${action.note}`); return;
  }
  if (action.type === 'restore') {
    if (!checksFor(state).find(check => check.id === 'evidence').passed) fail('Record an evidence-supported finding or unresolved handover before restoring this exercise.');
    state.configurationId = 'whole'; state.resetForConfiguration = false; state.restoredAtSequence = state.events.length + 1;
    event(state, action, 'Original whole-loop training configuration restored. Reset counts and record a final hour; existing faults still need attention.'); return;
  }
  if (action.type === 'finish') {
    const missing = checksFor(state).filter(check => !check.passed);
    if (missing.length) fail(`Complete these checks first: ${missing.map(check => check.label).join('; ')}.`);
    state.complete = true; event(state, action, 'Practice handover completed. Virtual exclusions are restored; the cause and any real repair remain unconfirmed.'); return;
  }
}
function validateRun(raw) {
  keys(raw, ['schemaVersion', 'scenarioId', 'actions'], 'Saved loop exercise');
  if (raw.schemaVersion !== LOOP_SCHEMA) fail('This saved loop exercise uses an unsupported schema version.');
  const scenario = scenarioFor(raw.scenarioId);
  if (!Array.isArray(raw.actions) || raw.actions.length > LOOP_LIMITS.actions) fail('A loop exercise supports up to 300 actions. Export it and start a new run.');
  const state = initial(scenario), actions = raw.actions.map(action => {
    const canonical = canonicalAction(action); apply(state, canonical); return canonical;
  });
  return {run: {schemaVersion: LOOP_SCHEMA, scenarioId: scenario.id, actions}, state};
}
export function createLoopRun(scenarioId = 'mapped') {
  scenarioFor(scenarioId); return freeze({schemaVersion: LOOP_SCHEMA, scenarioId, actions: []});
}
export function restoreLoopRun(saved) { return freeze(validateRun(saved).run); }
export function stepLoopRun(previous, action) {
  const {run, state} = validateRun(previous);
  if (run.actions.length >= LOOP_LIMITS.actions) fail('A loop exercise supports up to 300 actions. Export it and start a new run.');
  const canonical = canonicalAction(action); apply(state, canonical);
  return freeze({...run, actions: [...run.actions, canonical]});
}
export function evaluateLoopRun(run) {
  const {state} = validateRun(run), proof = evidence(state), checks = checksFor(state);
  const mapGroups = [...new Set(state.scenario.devices.map(device => device.mapNode))].sort((a, b) => a === null ? 1 : b === null ? -1 : a - b).map(node => ({node, label: node === null ? 'Not mapped' : `Map Node ${node} · approximate group`, deviceIds: state.scenario.devices.filter(device => device.mapNode === node).map(device => device.id)}));
  const configurations = configurationDefinitions.map(config => ({...clone(config), deviceIds: pollingIds(state, config.id), available: config.id === 'whole' || (state.topologyChecked && state.scenario.topologyComplete), reason: config.id === 'whole' || (state.topologyChecked && state.scenario.topologyComplete) ? '' : 'A complete supplied training survey must be checked first.'}));
  const uncertainties = ['Missed replies indicate communication quality, not the electrical cause. No repair has been simulated or confirmed.'];
  if (state.scenario.id === 'intermittent') uncertainties.push('The symptom is intermittent. A quiet window cannot exclude a section; further observation and site evidence are required.');
  if (!state.scenario.topologyComplete) uncertainties.push('The physical route is unverified. Tied Map values and addresses cannot establish cable sequence.');
  if (state.scenario.baselineMissingIds.length) uncertainties.push('Address 16 is scheduled but not logged/polled. Its zero attempts provide no health evidence; investigate and restore the missing device on the real system.');
  const last = state.observations.at(-1);
  if (last?.restorationWindow && last.totalMissedDelta > 0) uncertainties.push(`The final restored window still recorded ${last.totalMissedDelta} synthetic missed replies. The communication problem remains outstanding.`);
  let stage, nextAction, hint;
  if (state.complete) { stage = 'complete'; nextAction = 'Export this training log or start another exercise'; hint = 'A completed lesson is not a repaired or healthy fire-alarm system.'; }
  else if (!state.acknowledged) { stage = 'scope'; nextAction = 'Acknowledge the training scope'; hint = LOOP_NOTICE; }
  else if (!state.mapped) { stage = 'map'; nextAction = 'Review the Map groups'; hint = baseHints[0]; }
  else if (!state.topologyChecked) { stage = 'survey'; nextAction = 'Check the supplied training survey'; hint = baseHints[0]; }
  else if (!state.resetForConfiguration) { stage = 'reset'; nextAction = 'Reset synthetic counts'; hint = baseHints[1]; }
  else if (state.restoredAtSequence !== null && !checks.find(check => check.id === 'final-window').passed) { stage = 'final-window'; nextAction = 'Record the final whole-loop hour'; hint = baseHints[3]; }
  else if (checks.every(check => check.passed)) { stage = 'finish'; nextAction = 'Finish and save the practice handover'; hint = 'The log will retain any missed replies and missing coverage. Completion does not mean repair.'; }
  else if (checks.find(check => check.id === 'evidence').passed && state.restoredAtSequence === null) { stage = 'restore'; nextAction = 'Restore the original configuration'; hint = baseHints[3]; }
  else if (proof.samples.length === 0) { stage = 'baseline'; nextAction = 'Record a whole-loop baseline hour'; hint = 'Record the original polling coverage before changing the virtual configuration.'; }
  else { stage = 'investigate'; nextAction = 'Compare repeat windows, then record your finding'; hint = state.scenario.id === 'mapped' ? 'Repeat each tested configuration twice. Compare the suspected section with all the opposite sections; total losses alone cannot locate it.' : state.scenario.hints.at(-1); }
  return clone({...state, mapGroups, configurations, devices: last?.rows || state.scenario.devices.map(device => ({...device, polled: false, attempts: 0, lostDelta: null, cumulativeLost: state.deviceTotals[device.id], status: 'not observed yet'})), candidates: proof.candidates, checks, stage, nextAction, hint, uncertainties, restoration: {recorded: state.restoredAtSequence !== null, originalConfiguration: state.configurationId === 'whole', finalWindow: checks.find(check => check.id === 'final-window').passed, originalCoverageRestored: checks.find(check => check.id === 'final-window').passed, wholeLoopCoverage: !!last?.wholeLoopCoverage, outstanding: uncertainties}});
}
