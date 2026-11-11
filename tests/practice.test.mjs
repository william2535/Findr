import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createPracticeState, pressPracticeKey, setPracticeZone, practiceScreen,
  currentNode, currentFrame, currentZone,
} from '../public/app/practice-engine.mjs';

const data = JSON.parse(fs.readFileSync(new URL('../public/app/data/practice.json', import.meta.url), 'utf8'));
const profiles = Array.isArray(data) ? data : data.profiles;
const profileFor = id => {
  const profile = profiles.find(p => p.id === id);
  assert.ok(profile, `Missing practice profile: ${id}`);
  return profile;
};
const press = (profile, state, ...keys) => keys.flat().reduce((s, key) => {
  assert.ok(profile.keys.some(button => button.id === key), `${profile.id}: ${key} is not on the practice keypad`);
  return pressPracticeKey(profile, s, key);
}, state);
const typeNumber = (profile, state, number) => press(profile, state, ...String(number));

function selectZone(profile, state, address) {
  assert.ok(profile.zones.some(zone => zone.address === address), `${profile.id}: missing zone ${address}`);
  for (let count = 0; currentZone(profile, state).address !== address && count < profile.zones.length; count++) {
    state = press(profile, state, currentNode(profile,state).recordNextKey || profile.navigation?.recordNextKey || 'next');
  }
  assert.equal(currentZone(profile, state).address, address, `${profile.id}: cannot browse to zone ${address}`);
  return state;
}

function ancestorRoute(profile, id) {
  const route = [];
  const visited = new Set();
  while (id) {
    assert.ok(!visited.has(id), `${profile.id}: cyclic parent route at ${id}`);
    visited.add(id);
    route.unshift(id);
    if (id === 'root' || profile.nodes[id]?.sessionRoot) return route;
    id = profile.nodes[id]?.parent;
  }
  assert.fail(`${profile.id}: route does not reach a documented practice session root`);
}

function followRoute(profile, task, route = task.routeNodeIds) {
  assert.ok(Array.isArray(route) && route[0] === (task.startNodeId || 'root'), `${profile.id}/${task.id}: missing routeNodeIds`);
  let state = createPracticeState(profile, task.id);
  for (const targetId of route.slice(1)) {
    const node = currentNode(profile, state);
    const targetZone = task.goal?.zone;
    if (node.kind === 'menu') {
      const index = node.children.indexOf(targetId);
      assert.ok(index >= 0, `${profile.id}: ${targetId} is not in ${currentFrame(state).id}`);
      for (let count = 0; currentFrame(state).cursor !== index && count < node.children.length; count++) {
        state = press(profile, state, node.menuNextKey || profile.navigation?.menuNextKey || 'next');
      }
      state = press(profile, state, 'enter');
    } else if (node.kind === 'user-prompt') {
      assert.equal(node.omitNode, targetId, `${profile.id}: unsupported user-prompt route`);
      state = press(profile, state, 'omit');
    } else if (node.kind === 'zone-select') {
      if (targetZone) state = selectZone(profile, state, targetZone);
      assert.equal(node.next, targetId, `${profile.id}: zone route is inconsistent`);
      state = press(profile, state, 'enter');
    } else if (node.kind === 'walk-select') {
      state = selectZone(profile, state, targetZone || profile.zones[0].address);
      state = press(profile, state, 'details', 'enter');
    } else if (node.kind === 'walk-ready') {
      assert.equal(node.next, targetId, `${profile.id}: walk route is inconsistent`);
      state = press(profile, state, 'enter');
    } else {
      assert.fail(`${profile.id}: cannot traverse ${node.kind} to ${targetId}`);
    }
    assert.equal(currentFrame(state).id, targetId, `${profile.id}: failed to enter ${targetId}`);
  }
  return state;
}

function reachTypeEditor(profile, task) {
  let state = followRoute(profile, task);
  if (currentNode(profile, state).kind === 'zone-program') {
    state = selectZone(profile, state, task.goal.zone);
    state = press(profile, state, 'change');
  }
  assert.equal(state.editing, true, `${profile.id}: type exercise did not reach an editor`);
  assert.equal(currentZone(profile, state).address, task.goal.zone);
  return state;
}

function chooseType(profile, state, label) {
  const choice = profile.zoneTypes.find(type => type.label === label);
  assert.ok(choice, `${profile.id}: unknown type ${label}`);
  if(choice.code==null){for(let i=0;profile.zoneTypes[state.choice]?.label!==label&&i<profile.zoneTypes.length;i++)state=press(profile,state,profile.navigation?.choiceNextKey||'next');return press(profile,state,'enter');}
  return press(profile, typeNumber(profile, state, choice.code), 'enter');
}

function exitFromRoot(profile, state) {
  for (let count = 0; state.trail.length > 1 && count < 30; count++) state = press(profile, state, 'back');
  assert.equal(currentFrame(state).id, 'root');
  state = press(profile, state, 'back');
  if(profile.exitWithoutConfirmation){assert.equal(state.loggedOut,true);return state;}
  assert.equal(state.exitPrompt, true);
  return press(profile, state, 'enter');
}

function completeTask(profile, task) {
  let state = followRoute(profile, task);
  const goal = task.goal;
  if (goal.kind === 'zone') {
    state = selectZone(profile, state, goal.zone);
    if (goal.resistance && !currentNode(profile, state).resistance) state = press(profile, state, currentNode(profile,state).detailsKey || 'details');
  } else if (goal.kind === 'log') {
    const node=currentNode(profile,state);
    const direction = profile.reverseLogScroll ? node.logPreviousKey || profile.navigation?.logPreviousKey || 'previous' : node.logNextKey || profile.navigation?.logNextKey || 'next';
    for (let count = 0; !state.complete && count <= profile.events.length; count++) {
      if (goal.details) state = press(profile, state, node.detailsKey || (profile.rightLogDetails ? 'right' : 'details'));
      if (state.complete) break;
      state = press(profile, state, direction);
    }
  } else if (goal.kind === 'walk') {
    if (currentNode(profile, state).kind === 'walk-select') {
      state = selectZone(profile, state, goal.zone);
      state = press(profile, state, 'details', 'enter');
    }
    assert.equal(state.walkRunning, true, `${profile.id}: walk route did not start a test`);
    state = setPracticeZone(profile, state, goal.zone, 'secure');
    state = setPracticeZone(profile, state, goal.zone, 'active');
    const node = currentNode(profile, state);
    state = press(profile, state, profile.walkStopWithEnter || node.finishKey === 'enter' ? 'enter' : 'back');
  } else if (goal.kind === 'type') {
    if (currentNode(profile, state).kind === 'zone-program') {
      state = selectZone(profile, state, goal.zone);
      state = press(profile, state, 'change');
    }
    state = chooseType(profile, state, goal.value);
    if (goal.commit) state = exitFromRoot(profile, state);
  } else if (goal.kind === 'bell') {
    const node = currentNode(profile, state);
    for (let count = 0; node.outputs[currentFrame(state).cursor] !== 'Bell' && count < node.outputs.length; count++) {
      state = press(profile, state, 'next');
    }
    const toggle=node.toggleKeys?.[0]||'right';
    state = press(profile, state, toggle, toggle);
  } else if (goal.kind === 'logout') {
    if (!state.loggedOut && state.exitPrompt) state = press(profile, state, 'enter');
    else if (!state.loggedOut && profile.exitFromRoot) state = exitFromRoot(profile, state);
  } else if (goal.kind === 'omission') {
    state = selectZone(profile, state, goal.zone);
    const node = currentNode(profile, state);
    assert.equal(node.kind, 'zone-omit');
    state = node.omitOnDigit ? typeNumber(profile,state,goal.zone) : press(profile, state, node.toggleKeys[0]);
    assert.equal(state.complete, false, `${profile.id}: finish/accept step was skipped`);
    state = press(profile, state, node.commitKey || node.finishKey);
  } else {
    assert.fail(`${profile.id}: unsupported task goal ${goal.kind}`);
  }
  return state;
}

test('Every practice task is achievable through its published keypad route', async t => {
  assert.deepEqual(profiles.map(profile=>profile.id).sort(), ['galaxy-dimension','texecom-premier-elite','scantronic-ion','orisec-cp','menvier-mseries','pyronix-enforcer','ade-accenta-optima','risco-lightsys2','hkc-quantum70'].sort(), 'All nine published families must retain their working practice routes');
  for (const profile of profiles) {
    for (const task of profile.tasks) {
      await t.test(`${profile.title}: ${task.title}`, () => {
        const state = completeTask(profile, task);
        assert.equal(state.complete, true, `${profile.id}/${task.id}: ${state.feedback}`);
      });
    }
  }
});

test('Practice menus, task targets and manual references resolve to real data', () => {
  const catalogue = JSON.parse(fs.readFileSync(new URL('../public/app/data/catalogue.json', import.meta.url), 'utf8'));
  const records = new Set(catalogue.records.map(record => record.id));
  assert.equal(new Set(profiles.map(profile => profile.id)).size, profiles.length);
  for (const profile of profiles) {
    const sources = new Map(profile.sources.map(source => [source.id, source]));
    assert.equal(sources.size, profile.sources.length, `${profile.id}: duplicate source IDs`);
    for (const source of sources.values()) {
      assert.ok(source.title && source.edition, `${profile.id}: incomplete source identity`);
      assert.match(source.url, /^https:\/\//);
      if (source.recordId) assert.ok(records.has(source.recordId), `${profile.id}: unknown catalogue record ${source.recordId}`);
    }
    const checkReferences = (item, label) => {
      assert.ok(item.sourceRefs?.length, `${profile.id}/${label}: no source references`);
      for (const ref of item.sourceRefs) {
        const source = sources.get(ref.sourceId);
        assert.ok(source, `${profile.id}/${label}: source ${ref.sourceId} does not exist`);
        assert.ok(ref.printedPage && Number.isInteger(ref.pdfPage) && ref.pdfPage > 0, `${profile.id}/${label}: unusable page reference`);
        const totalPages = source.totalPdfPages || source.pdfPages;
        if (totalPages) assert.ok(ref.pdfPage <= totalPages, `${profile.id}/${label}: page exceeds source length`);
      }
    };
    for (const [id, node] of Object.entries(profile.nodes)) {
      checkReferences(node, id);
      if (id !== 'root' && !node.sessionRoot) assert.ok(profile.nodes[node.parent], `${profile.id}/${id}: missing parent`);
      if (node.sessionRoot) assert.equal(node.parent, null, `${profile.id}/${id}: a user root must not be an invented engineer child`);
      for (const child of node.children || []) assert.equal(profile.nodes[child]?.parent, id, `${profile.id}/${id}: child link is invalid`);
      if (node.next) assert.equal(profile.nodes[node.next]?.parent, id, `${profile.id}/${id}: next link is invalid`);
      if (node.omitNode) assert.equal(profile.nodes[node.omitNode]?.parent, id, `${profile.id}/${id}: omission link is invalid`);
      if (node.eventIds) for (const id of node.eventIds) assert.ok(profile.events.some(event => event.id === id));
      ancestorRoute(profile, id);
    }
    assert.equal(new Set(profile.tasks.map(task => task.id)).size, profile.tasks.length);
    assert.equal(new Set(profile.zones.map(zone => zone.address)).size, profile.zones.length);
    assert.equal(new Set(profile.events.map(event => event.id)).size, profile.events.length);
    for (const task of profile.tasks) {
      checkReferences(task, task.id);
      assert.equal(task.routeNodeIds[0], task.startNodeId || 'root');
      if (task.startNodeId && task.startNodeId !== 'root') assert.ok(profile.nodes[task.startNodeId]?.sessionRoot);
      for (const id of task.routeNodeIds) assert.ok(profile.nodes[id], `${profile.id}/${task.id}: route node ${id} does not exist`);
      if (task.goal.zone) assert.ok(profile.zones.some(zone => zone.address === task.goal.zone));
      if (task.goal.event) assert.ok(profile.events.some(event => event.id === task.goal.event));
      if (task.goal.kind === 'type') assert.ok(profile.zoneTypes.some(type => type.label === task.goal.value));
    }
  }
});

test('Unsupported type numbers cannot save a pending choice, and Back cancels the unaccepted edit', () => {
  for (const profile of profiles) {
    const task = profile.tasks.find(task => task.goal.kind === 'type');
    if (!task) continue;
    let state = reachTypeEditor(profile, task);
    const before = structuredClone(state.zoneTypes);
    const committed = structuredClone(state.committedTypes);
    state = press(profile, state, currentNode(profile, state).choiceNextKey || profile.navigation?.choiceNextKey || 'next');
    state = press(profile, typeNumber(profile, state, '999999'), 'enter');
    assert.deepEqual(state.zoneTypes, before, `${profile.id}: invalid code saved a type`);
    assert.deepEqual(state.committedTypes, committed, `${profile.id}: invalid code committed a type`);
    assert.equal(state.changed, false, `${profile.id}: invalid code marked a change`);
    assert.equal(state.editing, true, `${profile.id}: invalid code unexpectedly left the editor`);
    state = press(profile, state, 'back');
    assert.equal(state.editing, false, `${profile.id}: Back did not close the draft`);
    assert.deepEqual(state.zoneTypes, before, `${profile.id}: cancelling a draft changed a type`);
  }
});

test('Scantronic accepts a type in-session and commits it only after a clean confirmed exit', () => {
  const profile = profileFor('scantronic-ion');
  const task = profile.tasks.find(task => task.goal.kind === 'type');
  let state = reachTypeEditor(profile, task);
  const original = state.committedTypes[task.goal.zone];
  state = chooseType(profile, state, task.goal.value);
  assert.equal(state.zoneTypes[task.goal.zone], task.goal.value);
  assert.equal(state.committedTypes[task.goal.zone], original);
  assert.equal(state.complete, false);
  while (state.trail.length > 1) state = press(profile, state, 'back');
  state = press(profile, state, 'back');
  assert.deepEqual(practiceScreen(profile, state).lines, ['Leave', 'installer mode ?']);
  state = press(profile, state, 'back');
  assert.equal(state.loggedOut, false);
  assert.equal(state.zoneTypes[task.goal.zone], task.goal.value);
  assert.equal(state.committedTypes[task.goal.zone], original);
  state = setPracticeZone(profile, state, task.goal.zone, 'tamper');
  state = press(profile, state, 'back', 'enter');
  assert.equal(state.loggedOut, false, 'A tamper must block the trainer clean-exit check');
  assert.equal(state.committedTypes[task.goal.zone], original, 'Blocked exit must not commit');
  state = setPracticeZone(profile, state, task.goal.zone, 'secure');
  state = press(profile, state, 'back', 'enter');
  assert.equal(state.loggedOut, true);
  assert.equal(state.committedTypes[task.goal.zone], task.goal.value);
  assert.equal(state.complete, true);
});

test('Texecom NO starts editing, numeric types stay in the selected zone, and 0 YES logs off', () => {
  const profile = profileFor('texecom-premier-elite');
  const task = profile.tasks.find(task => task.goal.kind === 'type');
  let state = followRoute(profile, task);
  state = selectZone(profile, state, task.goal.zone);
  assert.equal(state.editing, false);
  state = press(profile, state, 'enter');
  assert.equal(state.editing, false, 'YES alone must not substitute for NO to edit');
  state = press(profile, state, 'change');
  assert.equal(state.editing, true);
  state = chooseType(profile, state, task.goal.value);
  assert.equal(currentZone(profile, state).address, task.goal.zone);
  assert.equal(state.zoneTypes[task.goal.zone], task.goal.value);
  assert.equal(state.editing, false);
  state = createPracticeState(profile);
  state = press(profile, state, 'reset-key');
  assert.equal(state.loggedOut, false, 'RESET must not be taught as a full logoff');
  state = press(profile, state, '0', 'enter');
  assert.equal(state.loggedOut, true, '0 YES should not require another YES');
});

test('Documented menu and zone numbers work only in their current keypad context', () => {
  const galaxy = profileFor('galaxy-dimension');
  let state = press(galaxy, createPracticeState(galaxy), '2', '1', 'enter');
  assert.equal(currentFrame(state).id, 'display-zones');
  state = typeNumber(galaxy, state, '1003');
  assert.equal(currentZone(galaxy, state).address, '1003', 'Four digits select a Galaxy zone without an extra ent');
  const typesBefore = structuredClone(state.zoneTypes);
  state = press(galaxy, state, '5', '2', 'enter');
  assert.equal(currentFrame(state).id, 'display-zones', '52 inside a zone display is not a global programming jump');
  assert.deepEqual(state.zoneTypes, typesBefore);

  const texecom = profileFor('texecom-premier-elite');
  state = press(texecom, createPracticeState(texecom), '9', 'enter', '3', 'enter');
  assert.equal(currentFrame(state).id, 'zone-status');
  state = typeNumber(texecom, state, '003');
  assert.equal(currentZone(texecom, state).address, '003', 'Three digits select a Texecom zone without an extra YES');
  state = press(texecom, createPracticeState(texecom), '9', 'enter', '0', 'enter', '2');
  assert.equal(currentFrame(state).id, 'alarm-log', 'Alarm log chooser opens on 2 without another YES');

  const scantronic = profileFor('scantronic-ion');
  state = press(scantronic, createPracticeState(scantronic), '7', 'enter');
  assert.equal(currentFrame(state).id, 'root', 'Scantronic menu-map row numbers are not fabricated shortcuts');
});

test('Orisec View Zone Status uses scrolling without an unsupported numeric zone jump', () => {
  const profile = profileFor('orisec-cp');
  const task = profile.tasks.find(task => task.id === 'zone-resistance');
  let state = followRoute(profile, task);
  assert.equal(currentFrame(state).id, 'zones');
  const initialZone = currentZone(profile, state).address;
  assert.notEqual(initialZone, task.goal.zone);

  state = typeNumber(profile, state, task.goal.zone);
  assert.equal(currentZone(profile, state).address, initialZone);
  assert.equal(state.digits, '', 'Unsupported numeric selection must not offer a pending confirm prompt');
  assert.match(state.feedback, /lesson uses the up \/ down keys/);
  state = press(profile, state, 'enter');
  assert.equal(currentZone(profile, state).address, initialZone, 'Enter must not turn the digits into a zone jump');
  assert.equal(state.complete, false);

  state = press(profile, {...state, digits: task.goal.zone}, 'enter');
  assert.equal(currentZone(profile, state).address, initialZone, 'A previously queued number must also respect the node restriction');
  assert.equal(state.complete, false);
  state = press(profile, state, 'previous');
  assert.notEqual(currentZone(profile, state).address, initialZone, 'Up still browses the zone list');
  state = press(profile, state, 'next');
  assert.equal(currentZone(profile, state).address, initialZone, 'Down still browses the zone list');
  state = selectZone(profile, state, task.goal.zone);
  assert.equal(state.complete, true, 'The documented scrolling route still completes the lesson');
});

test('Galaxy # toggles zone readings and B browses to an older event', () => {
  const profile = profileFor('galaxy-dimension');
  const zonesTask = profile.tasks.find(task => task.goal.kind === 'zone');
  let state = followRoute(profile, zonesTask);
  assert.equal(state.details, false);
  state = press(profile, state, 'details');
  const display = practiceScreen(profile, state).lines.join(' ');
  assert.ok(display.includes(profile.readings[state.zoneStates[currentZone(profile, state).address]]));
  assert.match(display, /V/, 'Galaxy readings include the synthetic RIO voltage');
  state = press(profile, state, 'details');
  assert.equal(state.details, false);
  const logTask = profile.tasks.find(task => task.goal.kind === 'log');
  state = followRoute(profile, logTask);
  assert.equal(state.eventIndex, 0);
  state = press(profile, state, 'previous'); // Galaxy B
  assert.equal(state.eventIndex, 1, 'B must move from newest to older');
  state = press(profile, state, 'next'); // Galaxy A
  assert.equal(state.eventIndex, 0, 'A must move back toward newer');
});

test('Galaxy selected walk test counts only selected alarm activations, once, and esc ends it', () => {
  const profile = profileFor('galaxy-dimension');
  const selectedEntry = Object.entries(profile.nodes).find(([, node]) => node.kind === 'walk-select');
  assert.ok(selectedEntry, 'Galaxy needs the documented Selected Zones route');
  const [selectedId] = selectedEntry;
  const address = profile.zones[0].address;
  const excluded = profile.zones[1].address;
  const task = {id: null, goal: {kind: 'walk', zone: address}, routeNodeIds: ancestorRoute(profile, selectedId)};
  let state = followRoute(profile, task);
  state = press(profile, state, 'enter');
  assert.equal(currentNode(profile, state).kind, 'walk-select', 'An empty selected-zone test must not start');
  state = selectZone(profile, state, address);
  state = press(profile, state, 'details');
  assert.deepEqual(state.walkSelected, [address]);
  state = press(profile, state, 'details');
  assert.deepEqual(state.walkSelected, []);
  state = press(profile, state, 'details', 'enter');
  assert.equal(state.walkRunning, true);
  state = setPracticeZone(profile, state, excluded, 'active');
  assert.deepEqual(state.walkHits, [], 'Unselected zones must not count');
  state = setPracticeZone(profile, state, address, 'tamper');
  assert.deepEqual(state.walkHits, [], 'Tamper is not an alarm-input test success');
  state = setPracticeZone(profile, state, address, 'active');
  assert.deepEqual(state.walkHits, [address]);
  state = setPracticeZone(profile, state, address, 'secure');
  state = setPracticeZone(profile, state, address, 'active');
  assert.deepEqual(state.walkHits, [address], 'Repeated activation must not double-count');
  state = press(profile, state, 'details');
  assert.match(practiceScreen(profile, state).lines.join(' '), /Zones Tested/);
  state = press(profile, state, 'back');
  assert.equal(state.walkRunning, false);
  assert.deepEqual(state.lastWalk, [address]);
});

test('Scantronic identifier toggling keeps the resistance reading visible and hides type shortcut codes', () => {
  const profile = profileFor('scantronic-ion');
  const task = profile.tasks.find(task => task.goal.kind === 'zone');
  let state = followRoute(profile, task);
  const before = practiceScreen(profile, state);
  state = press(profile, state, 'right');
  const after = practiceScreen(profile, state);
  assert.notEqual(after.lines[0], before.lines[0]);
  assert.equal(after.lines[1], before.lines[1]);
  const typeTask = profile.tasks.find(task => task.goal.kind === 'type');
  state = reachTypeEditor(profile, typeTask);
  const candidate = profile.zoneTypes[state.choice];
  assert.ok(!practiceScreen(profile, state).lines[1].startsWith(candidate.code + ''));
  assert.equal(practiceScreen(profile, state).lines[1], '*' + candidate.label, 'The accepted current type is starred');
});

test('Scantronic Menu shows remaining walk-test zones and tick finishes the test', () => {
  const profile = profileFor('scantronic-ion');
  const task = profile.tasks.find(task => task.goal.kind === 'walk');
  let state = followRoute(profile, task);
  state = setPracticeZone(profile, state, task.goal.zone, 'active');
  state = press(profile, state, 'area'); // The Scantronic ≡ button
  const remaining = practiceScreen(profile, state);
  assert.equal(remaining.lines[0], 'Zones Untested');
  assert.ok(!remaining.lines[1].includes(task.goal.zone), 'The tested zone is excluded from the remaining list');
  const identifier = remaining.lines[1];
  state = press(profile, state, 'right');
  assert.notEqual(practiceScreen(profile, state).lines[1], identifier, 'Left/right can switch an untested zone number to its name');
  state = press(profile, state, 'area');
  assert.equal(state.walkView, 0);
  state = press(profile, state, 'enter');
  assert.equal(state.walkRunning, false);
  assert.equal(state.complete, true);
});

test('Engine actions leave the previous UI state unchanged', () => {
  for (const profile of profiles) {
    const initial = createPracticeState(profile);
    const snapshot = structuredClone(initial);
    pressPracticeKey(profile, initial, 'next');
    assert.deepEqual(initial, snapshot);
    setPracticeZone(profile, initial, profile.zones[0].address, 'active');
    assert.deepEqual(initial, snapshot);
  }
});

test('Omitting and restoring a zone do not change its detector reading or programmed type', () => {
  for (const profile of profiles) {
    for (const task of profile.tasks.filter(task => task.goal.kind === 'omission')) {
      let state = followRoute(profile, task);
      state = selectZone(profile, state, task.goal.zone);
      state = setPracticeZone(profile, state, task.goal.zone, 'active');
      const zoneStates = structuredClone(state.zoneStates);
      const zoneTypes = structuredClone(state.zoneTypes);
      const committedTypes = structuredClone(state.committedTypes);
      const snapshot = structuredClone(state);
      const node = currentNode(profile, state);
      const changed = node.omitOnDigit ? typeNumber(profile,state,task.goal.zone) : press(profile, state, node.toggleKeys[0]);
      assert.deepEqual(state, snapshot, `${profile.id}: omit action mutated its input state`);
      state = press(profile, changed, node.commitKey || node.finishKey);
      assert.equal(state.omittedZones[task.goal.zone], task.goal.value);
      assert.deepEqual(state.zoneStates, zoneStates, `${profile.id}: omission changed physical state`);
      assert.deepEqual(state.zoneTypes, zoneTypes, `${profile.id}: omission changed zone programming`);
      assert.deepEqual(state.committedTypes, committedTypes);
      assert.equal(state.complete, true);
    }
  }
});

test('An omit lesson requires the requested zone and restore starts with that zone omitted', () => {
  for (const original of profiles) {
    const profile = structuredClone(original);
    const omitTask = profile.tasks.find(task => task.goal.kind === 'omission' && task.goal.value === true);
    if(!omitTask){assert.ok(profile.omissionInfo,`${profile.id}: omission without a guided lesson must explain its supported route`);continue;}
    const omitNode = profile.nodes[omitTask.routeNodeIds.at(-1)];
    const targetZone = profile.zones.find(zone => zone.address === omitTask.goal.zone);
    let otherZone = profile.zones.find(zone => zone.address !== targetZone.address && zone.omitEnabled === true &&
      (!omitNode.eligibleZoneTypes || omitNode.eligibleZoneTypes.includes(zone.type)) &&
      (!omitNode.recordIds || omitNode.recordIds.includes(zone.address)));
    if (!otherZone) {
      // A route may expose just one eligible fixture (for example, Day Alarm).
      // Add a second eligible fixture in this test copy so the wrong-target
      // assertion still exercises an actual omission rather than an empty list.
      otherZone = profile.zones.find(zone => zone.address !== targetZone.address);
      assert.ok(otherZone, `${profile.id}: wrong-target coverage needs a second detector`);
      otherZone.omitEnabled = true;
      otherZone.type = targetZone.type;
      if (omitNode.recordIds) omitNode.recordIds.push(otherZone.address);
    }
    let state = followRoute(profile, omitTask);
    state = selectZone(profile, state, otherZone.address);
    const node = currentNode(profile, state);
    assert.notEqual(currentZone(profile, state).address, omitTask.goal.zone);
    state = node.omitOnDigit ? typeNumber(profile,state,otherZone.address) : press(profile,state,node.toggleKeys[0]);
    state = press(profile, state, node.commitKey || node.finishKey);
    assert.equal(state.omittedZones[otherZone.address], true, `${profile.id}: wrong-target test did not omit its eligible fixture`);
    assert.equal(state.complete, false, `${profile.id}: wrong detector completed the lesson`);
    assert.equal(state.omittedZones[omitTask.goal.zone], false);

    for (const restoreTask of profile.tasks.filter(task => task.goal.kind === 'omission' && task.goal.value === false)) {
      state = followRoute(profile, restoreTask);
      assert.equal(state.omittedZones[restoreTask.goal.zone], true);
      assert.equal(state.complete, false);
      state = press(profile, state, currentNode(profile, state).commitKey || currentNode(profile, state).finishKey);
      assert.equal(state.complete, false, `${profile.id}: exiting without reinstatement completed the lesson`);
    }
  }
});

test('Galaxy applies # immediately, esc preserves it, and ent is not taught as saving an omit', () => {
  const profile = profileFor('galaxy-dimension');
  const task = profile.tasks.find(task => task.id === 'omit-zone');
  let state = followRoute(profile, task);
  state = selectZone(profile, state, task.goal.zone);
  state = press(profile, state, 'details');
  assert.equal(state.omittedZones[task.goal.zone], true);
  assert.equal(practiceScreen(profile, state).lines[1], 'OMITTED ENT=SET');
  state = press(profile, state, 'enter');
  assert.match(state.feedback, /ent starts setting/);
  assert.equal(state.complete, false);
  assert.equal(currentNode(profile, state).kind, 'zone-omit');
  state = press(profile, state, 'back');
  assert.equal(state.omittedZones[task.goal.zone], true);
  assert.equal(state.complete, true);
});

test('Scantronic requires tick to store omission and discards an unconfirmed practice draft on X', () => {
  const profile = profileFor('scantronic-ion');
  const task = profile.tasks.find(task => task.id === 'omit-zone');
  let state = selectZone(profile, followRoute(profile, task), task.goal.zone);
  assert.match(practiceScreen(profile, state).lines[1], /I$/);
  state = press(profile, state, 'right');
  assert.match(practiceScreen(profile, state).lines[1], /O$/);
  assert.equal(state.draftOmissions[task.goal.zone], true);
  assert.equal(state.omittedZones[task.goal.zone], false);
  assert.equal(state.complete, false);
  state = press(profile, state, 'back');
  assert.equal(state.draftOmissions, null);
  assert.equal(state.omittedZones[task.goal.zone], false);
  assert.equal(state.complete, false);
  state = press(profile, state, 'enter');
  state = selectZone(profile, state, task.goal.zone);
  state = press(profile, state, 'right', 'enter');
  assert.equal(state.omittedZones[task.goal.zone], true);
  assert.equal(state.complete, true);
  assert.equal(currentFrame(state).id, 'user-root');
});

test('Ineligible zones cannot be omitted and eligible-only omit lists hide them', () => {
  for (const original of profiles) {
    const profile = structuredClone(original);
    const task = profile.tasks.find(task => task.goal.kind === 'omission' && task.goal.value === true);
    if(!task){assert.ok(profile.omissionInfo,`${profile.id}: omission without a guided lesson must explain its supported route`);continue;}
    profile.zones.find(zone => zone.address === task.goal.zone).omitEnabled = false;
    let state = followRoute(profile, task);
    const node = currentNode(profile, state);
    if (node.eligibleOnly) {
      for (let count = 0; count < profile.zones.length * 2; count++) {
        assert.notEqual(currentZone(profile, state).address, task.goal.zone);
        if (node.eligibleZoneTypes && profile.zones.some(zone => zone.omitEnabled === true && node.eligibleZoneTypes.includes(zone.type))) {
          assert.ok(node.eligibleZoneTypes.includes(currentZone(profile, state).type), `${profile.id}: a disallowed type appeared in the omit list`);
        }
        state = press(profile, state, node.recordNextKey || profile.navigation?.recordNextKey || 'next');
      }
    } else {
      state = selectZone(profile, state, task.goal.zone);
      state = node.omitOnDigit ? typeNumber(profile,state,task.goal.zone) : press(profile, state, node.toggleKeys[0]);
      assert.match(state.feedback, /not configured as omittable/);
      assert.equal(state.omittedZones[task.goal.zone], false);
      assert.equal(state.complete, false);
    }
    profile.zones.forEach(zone => zone.omitEnabled = false);
    state = followRoute(profile, task);
    state = currentNode(profile,state).omitOnDigit ? typeNumber(profile,state,task.goal.zone) : press(profile, state, currentNode(profile, state).toggleKeys[0]);
    assert.ok(Object.values(state.omittedZones).every(value => value === false));
    if (node.eligibleOnly) assert.match(practiceScreen(profile, state).lines.join(' '), /NO ENTRIES|No omittable zones/);
  }
});

test('Texecom incomplete zone input cannot omit the previous detector, and Menu finishes rather than No', () => {
  const profile = profileFor('texecom-premier-elite');
  const task = profile.tasks.find(task => task.id === 'omit-zone');
  let state = followRoute(profile, task);
  state = press(profile, state, '0', 'omit');
  assert.equal(state.digits, '0');
  assert.ok(Object.values(state.omittedZones).every(value => value === false));
  assert.match(state.feedback, /Finish the 3-digit/);
  state = press(profile, state, '0', '2', 'omit');
  assert.equal(currentZone(profile, state).address, '002');
  assert.match(practiceScreen(profile, state).lines[0], /^Zone\*002\*/);
  state = press(profile, state, 'change');
  assert.equal(state.complete, false);
  assert.equal(currentNode(profile, state).kind, 'zone-omit');
  state = press(profile, state, 'back');
  assert.equal(state.complete, true);
  assert.deepEqual(practiceScreen(profile, state).lines, ['Do you want to', 'Arm System?']);
});

test('User omission roots remain separate from installer menus and installer exit checks', () => {
  for (const profile of profiles) {
    const task = profile.tasks.find(task => task.goal.kind === 'omission' && task.goal.value === true && task.startNodeId && task.startNodeId !== 'root');
    if (!task) continue;
    let state = createPracticeState(profile, task.id);
    assert.equal(profile.nodes[task.startNodeId].sessionRoot, true);
    assert.equal(state.rootId, task.startNodeId);
    state = press(profile, state, '9', 'enter');
    assert.equal(currentFrame(state).id, task.startNodeId, `${profile.id}: numeric input jumped to engineering`);
    state = press(profile, state, 'back');
    assert.equal(state.exitPrompt, false, `${profile.id}: user root offered installer exit`);
    state = setPracticeZone(profile, state, task.goal.zone, 'tamper');
    state = pressPracticeKey(profile, state, 'logout'); // FINDR control outside the physical keypad
    assert.equal(practiceScreen(profile, state).lines[0], 'Exit user practice?');
    state = press(profile, state, 'enter');
    assert.equal(state.loggedOut, true, `${profile.id}: ending user practice applied installer fault checks`);
  }
});
