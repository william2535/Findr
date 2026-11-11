import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const data = readJson('../public/app/data/gent-nano.json');
const audit = readJson('../research/nano-0.11.0/menu-audit.json');
const sources = new Map(data.sources.map(source => [source.id, source]));
const nodes = new Map(data.nodes.map(node => [node.id, node]));

function walk(value, visitor, path = '$') {
  if (!value || typeof value !== 'object') return;
  visitor(value, path);
  if (Array.isArray(value)) value.forEach((child, index) => walk(child, visitor, `${path}[${index}]`));
  else Object.entries(value).forEach(([key, child]) => walk(child, visitor, `${path}.${key}`));
}

test('Nano evidence resolves to exact manufacturer documents and actual PDF page bounds', () => {
  assert.equal(sources.size, data.sources.length);
  for (const source of sources.values()) {
    assert.match(source.url, /^https:\/\//);
    assert.match(source.sha256, /^[a-f0-9]{64}$/);
    assert.ok(source.documentNumber && source.edition && source.publisher);
    assert.equal(source.originalPublisher, true);
    assert.ok(Number.isInteger(source.pages) && source.pages > 0);
  }
  let cited = 0;
  for (const document of [data, audit]) walk(document, (value, path) => {
    if (!Object.hasOwn(value, 'sourceRefs')) return;
    assert.ok(Array.isArray(value.sourceRefs) && value.sourceRefs.length, `Missing evidence at ${path}`);
    for (const ref of value.sourceRefs) {
      const source = sources.get(ref.sourceId);
      assert.ok(source, `Unknown evidence ${ref.sourceId} at ${path}`);
      assert.ok(Array.isArray(ref.pages) && ref.pages.length, `No source page at ${path}`);
      for (const page of ref.pages) {
        assert.ok(Number.isInteger(page) && page >= 1 && page <= source.pages,
          `Invalid PDF page ${page} for ${ref.sourceId} at ${path}`);
      }
      cited++;
    }
  });
  assert.ok(cited > data.nodes.length + data.menuReference.length);
  assert.equal(sources.get('nano-commissioning-3').pages, 85);
  assert.match(sources.get('nano-commissioning-3').note, /printed page 86/);
  assert.match(sources.get('nano-operator-9').edition, /V3\.xx/);
  assert.match(sources.get('nano-commissioning-3').edition, /V2\.xx/);
});

test('Nano navigation and Open on panel targets resolve without importing Vigilon keys', () => {
  assert.equal(nodes.size, data.nodes.length);
  assert.ok(nodes.has(data.menuRootId));
  for (const node of nodes.values()) {
    assert.ok(node.sourceRefs?.length, `No source evidence on ${node.id}`);
    assert.ok(['menu','form','reference'].includes(node.kind), `Invalid node kind ${node.id}`);
    if (node.parentId) assert.ok(nodes.has(node.parentId), `Absent parent for ${node.id}`);
    if (node.kind === 'menu') {
      assert.ok(node.items?.length, `Empty menu ${node.id}`);
      const labels = node.items.map(item => item.label);
      assert.equal(new Set(labels).size, labels.length, `Ambiguous menu labels on ${node.id}`);
      for (const item of node.items) assert.ok(nodes.has(item.to), `${node.id} links to absent ${item.to}`);
    }
    if (node.selectTo) assert.ok(nodes.has(node.selectTo));
  }
  const ids = data.menuReference.map(entry => entry.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const entry of data.menuReference) {
    assert.ok(entry.route.length && entry.sourceRefs.length);
    assert.ok(nodes.has(entry.nodeId), `Invalid Open on panel target ${entry.id}`);
    assert.ok(['implemented','reference','conditional','conflict'].includes(entry.status));
    if (entry.status === 'implemented') {
      assert.equal(nodes.get(entry.nodeId).confidence, 'verified');
      assert.ok(entry.sourceRefs.some(ref => ref.sourceId === 'nano-operator-9'),
        `Older-only route incorrectly promoted to V3 implementation: ${entry.id}`);
    }
    if (entry.status === 'reference') assert.equal(nodes.get(entry.nodeId).kind, 'reference');
  }
  const keys = new Set(data.physicalKeys.map(key => key.id));
  assert.equal(keys.size, 9);
  for (const key of ['F1','F2','F3','F4','MENU_ON_OFF','ENTER','1','2','3','4']) {
    assert.equal(keys.has(key), false, `Invented Nano physical key ${key}`);
  }
  assert.deepEqual(data.physicalLayout.rows[0], ['LEFT_SOFT','MINUS','NEXT','PLUS','RIGHT_SOFT']);
  assert.deepEqual(data.physicalLayout.rows[1], ['CANCEL_BUZZER','RESET','SOUND_ALARMS','SILENCE_ALARMS']);
  assert.deepEqual(data.modelScope.display, {rows:8, columns:40});
  assert.deepEqual(data.zoneIndicators.numbers, Array.from({length:16}, (_, index) => index + 1));
  assert.equal(data.leds.find(led => led.id === 'power').colour, 'green');
  assert.equal(data.leds.find(led => led.id === 'fire').colour, 'red');
});

test('Nano fixture access overrides remain explicit and no manufacturer engineering credentials leak into practice', () => {
  assert.equal(data.fixture.fictional, true);
  assert.equal(data.fixture.trainingPin, '2468');
  assert.match(data.fixture.trainingPinNote, /FINDR-only practice credential/);
  assert.match(data.fixture.trainingPinNote, /not a Gent factory default/);
  assert.equal(data.fixture.deviceDisablementLevel, 2);
  assert.match(data.fixture.deviceDisablementLevelNote, /level 3/);
  assert.match(nodes.get('device-details').note, /optional level-2/);
  assert.match(nodes.get('channels').note, /level 3/);
  assert.deepEqual(nodes.get('device-details').conditionalFields, ['status']);
  assert.deepEqual(nodes.get('channels').conditionalFields, ['status']);
  assert.equal(data.fixture.cancelBuzzerLevel, 2);
  assert.equal(data.trainingPolicies.noLiveConnection, true);
  assert.equal(data.trainingPolicies.noEngineerCodes, true);
  walk(data, (value, path) => {
    for (const key of Object.keys(value)) {
      assert.ok(!/^(defaultPin|defaultCode|engineerPin|engineerCode|maintenancePin|maintenanceCode)$/i.test(key),
        `A source default or engineering credential appeared in ${path}.${key}`);
    }
  });
  for (const node of nodes.values()) {
    if (node.kind === 'reference') {
      assert.ok(node.note);
      assert.ok(!node.action && !node.enter?.action, `Reference-only node mutates state: ${node.id}`);
    }
  }
});

test('Nano fixture respects single-loop addresses and does not import the contradictory device-145 illustration', () => {
  assert.equal(data.fixture.loops.length, 1);
  assert.equal(data.fixture.loops[0].id, 1);
  assert.equal(data.modelScope.hardwareLimits.maxDevices, 127);
  const zones = new Set(data.fixture.zones.map(zone => zone.id));
  const sectors = new Set(data.fixture.sectors.map(sector => sector.id));
  const deviceIds = new Set(data.fixture.devices.map(device => device.id));
  assert.equal(deviceIds.size, data.fixture.devices.length);
  assert.equal(zones.size, 16);
  assert.equal(sectors.size, 16);
  for (const device of data.fixture.devices) {
    assert.equal(device.loop, 1);
    assert.ok(Number.isInteger(device.address) && device.address >= 1 && device.address <= 127);
    assert.ok(device.label.length <= 32);
    if (device.zone) assert.ok(zones.has(device.zone));
    if (device.sector) assert.ok(sectors.has(device.sector));
    for (const channel of device.channels || []) {
      assert.ok(channel.number >= 1 && channel.number <= 4);
      if (channel.zone) assert.ok(zones.has(channel.zone));
      if (channel.sector) assert.ok(sectors.has(channel.sector));
    }
  }
  for (const scenario of data.scenarios) {
    for (const id of Object.keys(scenario.inputs || {})) assert.ok(deviceIds.has(id));
    for (const id of scenario.disabledDevices || []) assert.ok(deviceIds.has(id));
    for (const id of [...scenario.disabledZones || [], ...scenario.testZones || []]) assert.ok(zones.has(id));
    for (const id of scenario.disabledSectors || []) assert.ok(sectors.has(id));
  }
});

test('Nano source-specific test, zone, history and Day-mode limits are retained for learners', () => {
  const limits = new Map(data.knownLimits.map(limit => [limit.id, limit]));
  for (const id of ['firmware-boundary','menu-order','commissioning-pagination','device-access','device-number-artwork','zones-and-mcp','channel-form','day-mode-warning-order','history-capacity','cursor-and-return','timeout','repair-cause','simulation-boundary','guided-practice-clock']) {
    assert.ok(limits.get(id)?.summary && limits.get(id)?.treatment && limits.get(id)?.sourceRefs.length, `Missing material limit ${id}`);
    assert.ok(audit.findings.some(finding => finding.id === id));
  }
  assert.match(nodes.get('zones').note, /both sensors and manual call points/);
  assert.equal(nodes.get('display-test').durationSeconds, 8);
  assert.match(nodes.get('weekly-running').note, /does not stop/);
  assert.equal(data.trainingPolicies.historyLimit, 999);
  assert.equal(data.trainingPolicies.historyLimitSourceRefs[0].sourceId, 'nano-commissioning-3');
  assert.equal(data.fixture.dayNight.mode, 'CALENDAR');
  assert.equal(data.fixture.dayNight.fictionalDurations, true);
  assert.match(limits.get('day-mode-warning-order').treatment, /does not invent a post-save confirmation/);
  assert.equal(nodes.has('day-night-confirm'), false);
  assert.match(data.trainingPolicies.clockYearRange.basis, /training/);
  assert.equal(audit.verification.physicalPanelCompared, false);
  assert.equal(audit.verification.olderEngineeringRoutesInteractive, false);
  assert.equal(data.trainingPolicies.guidedPracticeClock.origin, 'FINDR teaching policy');
  assert.equal(data.trainingPolicies.guidedPracticeClock.guidedLessons, 'manual-advance');
  assert.equal(data.trainingPolicies.guidedPracticeClock.freePractice, 'visible-realtime');
  assert.equal(data.trainingPolicies.guidedPracticeClock.firmwareBehaviour, false);
  assert.match(limits.get('guided-practice-clock').treatment, /Real Nano firmware does not pause/);
});

test('Nano source audit distinguishes implemented, reference and conditional coverage without inflated totals', () => {
  assert.equal(audit.nodeCount, data.nodes.length);
  assert.equal(audit.interactiveNodeCount, data.nodes.filter(node => node.confidence === 'verified').length);
  assert.equal(audit.referenceNodeCount, data.nodes.filter(node => node.confidence === 'reference').length);
  assert.equal(audit.menuReferenceCount, data.menuReference.length);
  assert.equal(audit.knownLimitCount, data.knownLimits.length);
  for (const status of ['implemented','conditional','reference','conflict']) {
    assert.equal(audit.routeCounts[status], data.menuReference.filter(route => route.status === status).length);
  }
  assert.ok(audit.routeCounts.reference > audit.routeCounts.implemented);
  assert.equal(data.fixture.printerFitted, false);
  for (const route of data.menuReference.filter(route => route.route[0] === 'Logs' && route.route.at(-1) === 'Print')) {
    assert.equal(route.status, 'conditional');
    assert.equal(nodes.get(route.nodeId).kind, 'reference');
  }
});
