import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildEmulatorModel, createEmulatorState, pressEmulatorKey, openEmulatorNode, setEmulatorText, setEmulatorZone, emulatorView} from '../public/app/emulator-engine.mjs';
import {startHints, advanceHints} from '../public/app/emulator-hints.mjs';
import {createPracticeState, pressPracticeKey, setPracticeZone, currentNode} from '../public/app/practice-engine.mjs';
import {prepareMenuMap, validateMenuMap} from '../public/app/menu-map-engine.mjs';

const json = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const map = json('../public/app/data/menu-maps/menvier-mseries.json');
const profile = json('../research/expansion/menvier-profile.json');
const model = buildEmulatorModel(map, profile);
const raw = id => map.nodes.find(node => node.id === id);
const press = (state, ...keys) => keys.flat().reduce((next, key) => pressEmulatorKey(model, next, key), state);
const view = state => emulatorView(model, state);
const locate = (id, record) => {
  let state = openEmulatorNode(model, createEmulatorState(model), id);
  if (view(state).mode === 'selector') state = record ? press(state, ...String(record), 'enter') : press(state, 'enter');
  return state;
};
const values = state => JSON.stringify({values:state.values, committed:state.committedValues, names:state.zoneNames, types:state.zoneTypes, omission:state.omittedZones, eligible:state.zoneOmitEnabled});

test('Menvier graph retains source provenance, distinct editions, and no chapter-as-shortcut guessing', () => {
  assert.deepEqual(validateMenuMap(prepareMenuMap(map)), []);
  assert.equal(model.rootById['m-engineer'].commitOnExit, true);
  assert.equal(model.rootById['m-manager'].commitOnExit, false);
  assert.match(model.rootById['m-manager'].edition, /M800 only/);
  assert.equal(raw('m-e2.7.3.4').address, '2.7.3.4');
  assert.ok(raw('m-e2.7.3.4').sourceRefs.some(ref => ref.sourceId === 'eng5' && ref.printedPage === '108' && ref.pdfPage === 110));
  for (const node of map.nodes.filter(node => ['reference','selection'].includes(node.kind))) assert.equal(node.address, undefined, node.id);
  for (const node of map.nodes.filter(node => /^m-e1\.5\.[345]-(?:on|off|days)\d+$/.test(node.id))) assert.equal(node.code, null, 'Old timer fields are scrolled, not invented numbered submenus');
});

test('Menvier source path 2.7.3.4 requires local selections and shows resistance immediately', () => {
  let state = press(createEmulatorState(model), '2', 'enter', '7', 'enter', '3', 'enter', '4', 'enter');
  assert.equal(view(state).node.id, 'm-e2.7.3.4');
  state = press(state, '0','0','0','2');
  assert.equal(view(state).zone.address, '0002');
  assert.match(view(state).screen.lines.join(' '), /02\.200 K Ohms/);
  state = setEmulatorZone(model, state, '0002', 'active');
  assert.match(view(state).screen.lines.join(' '), /06\.900 K Ohms/);
  const before = view(state).screen.lines;
  assert.deepEqual(view(press(state, 'details')).screen.lines, before, '# is not a resistance toggle');
  const invalid = press(createEmulatorState(model), '2','7','3','4','enter');
  assert.equal(view(invalid).node.id, '@m-engineer');
});

test('Menvier zone programming follows type → attributes → wards → description and commits at engineer exit', () => {
  let state = locate('m-e1.1', '0002');
  assert.equal(state.editor.nodeId, 'm-zone-type');
  state = press(state, '7','enter');
  assert.equal(state.zoneTypes['0002'], 'Final Exit');
  assert.equal(state.editor.nodeId, 'm-zone-attributes');
  const flag = 'm-zone-attributes-v3';
  state = press(state, '4');
  assert.equal(state.editor.cursor, 3);
  assert.equal(state.editor.draft[flag], true, 'The attribute digit selects; it must not toggle');
  state = press(state, 'change','enter');
  assert.equal(state.zoneOmitEnabled['0002'], false);
  assert.equal(state.editor.nodeId, 'm-zone-wards');
  state = press(state, '2','enter');
  assert.equal(state.editor.nodeId, 'm-zone-description');
  state = setEmulatorText(model, state, 'Lobby PIR');
  state = press(state, 'enter');
  assert.equal(state.zoneNames['0002'], 'Lobby PIR');
  assert.equal(view(state).mode, 'selector');
  assert.deepEqual(state.committedValues, {});
  while (state.trail.length > 1) state = press(state, 'back');
  state = press(state, 'back','enter');
  assert.equal(state.loggedOut, true);
  assert.deepEqual(state.committedValues, state.values);
});

test('Menvier ESC discards a description draft and steps back; unchanged ENT does not invent saved edits', () => {
  let state = locate('m-e1.1', '0003');
  state = press(state, 'enter','enter','enter');
  assert.equal(state.editor.nodeId, 'm-zone-description');
  assert.deepEqual(state.values, {});
  state = setEmulatorText(model, state, 'Not saved');
  state = press(state, 'back');
  assert.equal(state.editor.nodeId, 'm-zone-wards');
  assert.equal(state.zoneNames['0003'], 'Office PIR');
  assert.deepEqual(state.values, {});
});

test('Menvier omission uses Toggle, ENT advances, and changing eligibility removes a zone from the list', () => {
  let state = locate('m-u1.2');
  assert.equal(state.rootId, 'm-manager');
  state = press(state, '0','0','0','2','change');
  assert.equal(state.omittedZones['0002'], true);
  state = press(state, 'enter');
  assert.equal(view(state).zone.address, '0003');
  state = press(state, 'back');
  assert.equal(view(state).node.id, 'm-u1');
  state = openEmulatorNode(model, state, 'm-u1.2');
  state = press(state, '0','0','0','2','change');
  assert.equal(state.omittedZones['0002'], false);
  state.zoneOmitEnabled['0002'] = false;
  state = openEmulatorNode(model, state, 'm-u1.2');
  state = press(state, '0','0','0','2');
  assert.notEqual(view(state).zone.address, '0002');
});

test('Menvier logs use up for older events and Toggle for associated text', () => {
  let state = locate('m-e2.8.1');
  assert.equal(state.eventIndex, 0);
  state = press(state, 'previous','previous');
  assert.equal(state.events[state.eventIndex].id, 'zone-0004-alarm');
  assert.equal(press(state, 'details').details, false);
  state = press(state, 'change');
  assert.equal(state.details, true);
  assert.match(view(state).screen.lines.join(' '), /Store PIR/);
});

test('M750/M800 physical output tests expose 1, 3 and 4 and stop on exit', () => {
  let state = locate('m-e2.7.2.1');
  assert.deepEqual(Object.keys(state.outputStates), ['Output 1','Output 3','Output 4']);
  state = press(state, '2');
  assert.equal(Object.values(state.outputStates).some(Boolean), false);
  state = press(state, '1','3','4');
  assert.equal(Object.values(state.outputStates).every(Boolean), true);
  state = press(state, 'back');
  assert.equal(Object.values(state.outputStates).some(Boolean), false);
});

test('Menvier actual user submenus, type hotkeys and later timer capacity remain separate from old engineering', () => {
  assert.deepEqual(model.nodes['m-u2.4'].children.map(id => [model.nodes[id].code, model.nodes[id].label]), [['1','Code'],['2','User Name'],['3','Customise Menus'],['4','Telecommands']]);
  const types = model.nodes['m-manager-user-type'].choices;
  assert.equal(types.find(type => type.code === '5').label, 'Easy Set');
  assert.equal(types.find(type => type.code === '8').label, 'Duress Code');
  assert.equal(types.find(type => type.label === 'Shunt').code, null);
  assert.equal(types.find(type => type.label === 'Not in use').code, null);
  const records = createEmulatorState(model).records;
  assert.equal(records.autoSet.length, 3);
  assert.equal(records.autoSetLater.length, 8);
  assert.equal(records.timeSwitchLater.length, 5);
  assert.equal(records.codeLockLater.length, 8);
  assert.equal(records.exception.length, 30);
  const codes = model.nodes['m-u2.0.3'].children.map(id => model.nodes[id].code);
  assert.deepEqual(codes, ['1','2','3','4','5','6']);
  assert.equal(model.nodes['m-u1.6'].max, 7);
  assert.equal(model.nodes['m-e2.5.4.1'].mode, 'info', 'M1000-only baud programming is not editable as M800');
});

test('Menvier SHOW HINTS reaches deep menus and sequential text fields without saving anything', () => {
  for (const [target, recordId] of [['m-e2.7.3.4',undefined],['m-u1.2',undefined],['m-zone-description','0002']]) {
    let {state, hint} = startHints(model, createEmulatorState(model), target, recordId ? {recordId} : {});
    const before = values(state);
    let presses = 0;
    while (hint.status === 'active' && presses++ < 100) {
      assert.ok(profile.keys.some(key => key.id === hint.nextKey), 'Highlight must be a physical Menvier key');
      const next = pressEmulatorKey(model, state, hint.nextKey);
      hint = advanceHints(model, hint, state, next, hint.nextKey);
      state = next;
      assert.equal(values(state), before);
    }
    assert.equal(hint.status, 'complete', `${target}: ${hint.message || hint.status}`);
    assert.equal(view(state).node.id, target);
  }
});

test('All seven Menvier guided exercises finish through their documented physical controls', () => {
  const key = (state, ...keys) => keys.flat().reduce((next, button) => pressPracticeKey(profile, next, button), state);
  for (const id of ['omit-zone','restore-zone']) {
    let state = key(createPracticeState(profile,id),'1','enter','2','enter','0','0','0','2','change','back');
    assert.equal(state.complete, true, id);
  }
  let state = key(createPracticeState(profile,'check-resistance'),'2','enter','7','enter','3','enter','4','enter','0','0','0','2');
  assert.equal(state.complete, true, 'resistance');
  state = key(createPracticeState(profile,'view-zone-status'),'2','enter','1','enter','0','0','0','2');
  assert.equal(state.complete, true, 'status');
  state = key(createPracticeState(profile,'find-last-alarm'),'2','enter','8','enter','1','enter','previous','previous','change');
  assert.equal(state.complete, true, 'log');
  state = key(createPracticeState(profile,'walk-test-pir'),'1','enter','1','enter','2','enter','enter');
  assert.equal(currentNode(profile,state).kind, 'walk-run');
  state = setPracticeZone(profile,state,'0004','active');
  state = key(state,'back');
  assert.equal(state.complete, true, 'walk');
  state = key(createPracticeState(profile,'leave-engineering'),'back','enter');
  assert.equal(state.complete, true, 'exit');
});
