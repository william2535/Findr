import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const readJson = relative => JSON.parse(readFileSync(new URL(relative, import.meta.url), 'utf8'));
const data = readJson('../public/app/data/gent-vigilon.json');
const audit = readJson('../research/gent-0.10.0/menu-audit.json');
const walkTestAudit = readJson('../research/vigilon-walktest-0.12.1/engine-audit.json');
const sources = new Map(data.sources.map(source => [source.id, source]));
const nodes = new Map(data.nodes.map(node => [node.id, node]));

function walk(value, visit, path = '$') {
  if (!value || typeof value !== 'object') return;
  visit(value, path);
  if (Array.isArray(value)) value.forEach((item, index) => walk(item, visit, `${path}[${index}]`));
  else Object.entries(value).forEach(([key, child]) => walk(child, visit, `${path}.${key}`));
}

test('GENT evidence resolves to identified manufacturer documents and valid PDF pages', () => {
  assert.equal(sources.size, data.sources.length, 'Duplicate source identifiers would make citations ambiguous');
  for (const source of sources.values()) {
    assert.match(source.url, /^https:\/\//, `No working public document URL for ${source.id}`);
    assert.match(source.sha256, /^[a-f0-9]{64}$/, `Document bytes are not pinned for ${source.id}`);
    assert.ok(Number.isInteger(source.pages) && source.pages > 0);
    assert.ok(source.publisher && source.edition);
    assert.ok(source.documentNumber || source.documentType === 'training-presentation', 'Do not invent a document number for an undated training presentation');
  }
  let cited = 0;
  for (const document of [data, audit, walkTestAudit]) walk(document, (value, path) => {
    if (!Object.hasOwn(value, 'sourceRefs')) return;
    assert.ok(Array.isArray(value.sourceRefs) && value.sourceRefs.length, `Empty evidence at ${path}`);
    for (const ref of value.sourceRefs) {
      const source = sources.get(ref.sourceId);
      assert.ok(source, `Unknown evidence source ${ref.sourceId} at ${path}`);
      assert.ok(Array.isArray(ref.pages) && ref.pages.length, `No page anchor at ${path}`);
      for (const page of ref.pages) {
        assert.ok(Number.isInteger(page) && page >= 1 && page <= source.pages,
          `${path} cites page ${page} outside ${source.documentNumber} (${source.pages} pages)`);
      }
      cited++;
    }
  });
  assert.ok(cited > data.nodes.length, 'Evidence should cover menus and limits, not merely the profile header');
});

test('GENT working navigation cannot link to a missing screen or silently duplicate a function key', () => {
  assert.equal(nodes.size, data.nodes.length, 'Screen IDs must be unique');
  assert.ok(nodes.has(data.menuRootId));
  for (const node of nodes.values()) {
    assert.ok(node.sourceRefs?.length, `Screen ${node.id} has no evidence`);
    const keys = node.softKeys.map(key => key.key);
    assert.equal(new Set(keys).size, keys.length, `Conflicting prompts on ${node.id}`);
    for (const transition of [...node.softKeys, node.enter].filter(Boolean)) {
      if (transition.key) assert.match(transition.key, /^F[1-4]$/, `Invented function key on ${node.id}`);
      if (transition.to) assert.ok(nodes.has(transition.to), `${node.id} points to absent screen ${transition.to}`);
      for (const role of transition.args?.roles || []) assert.ok(nodes.has(role.to), `${node.id} has an absent ${role.pinRole} destination`);
    }
  }
});

test('GENT source-only menus cannot masquerade as fully implemented operations', () => {
  const routeIds = data.menuReference.map(route => route.id);
  assert.equal(new Set(routeIds).size, routeIds.length, 'Reference route IDs must be unambiguous');
  for (const entry of data.menuReference) {
    assert.ok(['implemented','reference','conflict','conditional'].includes(entry.status), `Unclassified route ${entry.id}`);
    assert.ok(entry.route?.length && entry.sourceRefs?.length, `Unsubstantiated route ${entry.id}`);
    if (entry.nodeId) assert.ok(nodes.has(entry.nodeId), `Broken Open on keypad target ${entry.nodeId}`);
    if (entry.status === 'implemented') {
      assert.ok(entry.nodeId, `Implemented route ${entry.id} has no actual keypad screen`);
      const target = nodes.get(entry.nodeId);
      assert.equal(target.confidence, 'verified', `Reference screen falsely marked working: ${entry.id}`);
      assert.ok(target.softKeys.length || target.enter, `Working screen has no possible user input: ${entry.id}`);
    }
  }
  for (const node of nodes.values()) {
    if (node.confidence !== 'reference') continue;
    assert.ok(node.note, `Reference limit is hidden on ${node.id}`);
    for (const transition of [...node.softKeys, node.enter].filter(Boolean)) {
      assert.ok(!transition.action || ['reference','abort'].includes(transition.action),
        `Reference screen ${node.id} performs ${transition.action} without verified operation evidence`);
    }
  }
});

test('GENT panel layout retains the sourced physical keys rather than intruder-keypad substitutions', () => {
  const physical = new Map(data.physicalKeys.map(key => [key.id, key]));
  assert.equal(physical.size, data.physicalKeys.length);
  for (const row of data.physicalLayout.rows) {
    for (const key of row) assert.ok(physical.has(key), `Unrecognised physical key ${key}`);
  }
  assert.deepEqual(data.physicalLayout.rows[0], ['MENU_ON_OFF','F1','F2','F3','F4','CANCEL_BUZZER']);
  assert.deepEqual(data.physicalLayout.rows[1], ['SOUND_ALARMS','SILENCE_ALARMS','RESET','VERIFY']);
  assert.equal(data.physicalLayout.rows[2][10], '-', 'The unshifted minus key must not become a plus key');
  assert.equal(data.physicalLayout.rows[3][10], ';', 'Semicolon is the unshifted source key');
  assert.equal(data.physicalLayout.rows[4][10], '.', 'Full stop is the unshifted source key');
  assert.deepEqual(data.physicalLayout.outerDoorKeys, ['PREVIOUS','NEXT']);
  assert.ok(!physical.has('BACK') && !physical.has('OK'), 'Do not import invented intruder navigation keys');
  assert.equal(data.modelScope.display.rows, 8);
  assert.equal(data.modelScope.display.columns, 40);
  assert.equal(data.zoneIndicators.numbers.length, 32);
});

test('GENT remaining source disputes stay visible and the original audit is preserved beside the bounded update', () => {
  const operator = sources.get('gent-vigilon-4188-1025-2015');
  assert.match(operator.edition, /issue 4/i);
  assert.match(operator.edition, /issue 2/i);
  const findings = new Map(audit.findings.map(finding => [finding.id, finding]));
  for (const id of ['issue-identification','loop-limits','device-limits','repair-route','zone-test-order','fare-switch-key','aux-disable-key','zone-mcp-behaviour']) {
    const finding = findings.get(id);
    assert.ok(finding?.finding && finding?.resolution && finding?.sourceRefs?.length, `Lost material limitation: ${id}`);
    assert.ok(data.knownLimits.some(limit => limit.id === id), `Limitation ${id} is absent from learner-facing data`);
  }
  assert.equal(nodes.get('zone-test-reference').confidence, 'reference');
  assert.equal(nodes.get('repair-reference').confidence, 'reference');
  assert.match(data.modelScope.editionBoundary, /not a claimed match/i);
  assert.match(data.modelScope.editionBoundary, /Plus/);
  assert.equal(audit.nodeCount, walkTestAudit.baseline.nodeCount);
  assert.equal(audit.menuReferenceCount, walkTestAudit.baseline.menuReferenceCount);
  assert.equal(audit.nodeCount + walkTestAudit.addedNodeIds.length, data.nodes.length);
  assert.equal(audit.menuReferenceCount + walkTestAudit.addedMenuReferenceIds.length, data.menuReference.length);
  assert.equal(walkTestAudit.nodeCount, data.nodes.length);
  assert.equal(walkTestAudit.menuReferenceCount, data.menuReference.length);
});

test('the bounded walk-test branch retains the documented double Test route and direct Zone entry', () => {
  const expected = [
    ['test-engineer', 'F4', '<etc>', 'test-engineer-more'],
    ['test-engineer-more', 'F2', 'Test', 'test-engineer-tests'],
    ['test-engineer-tests', 'F4', 'Test', 'zone-test-mode'],
    ['zone-test-mode', 'F2', 'On', 'zone-test-on'],
    ['zone-test-mode', 'F1', 'Off', 'zone-test-off'],
  ];
  for (const [from, key, label, to] of expected) {
    const node = nodes.get(from), button = node.softKeys.find(button => button.key === key);
    assert.equal(button.label, label);
    assert.equal(button.to, to);
    assert.equal(node.accessLevel, 3);
    assert.ok(node.sourceRefs.some(ref => ref.sourceId === 'gent-vigilon-4188-856-2015' && ref.pages.includes(105)));
  }
  for (const suffix of ['on', 'off']) {
    const node = nodes.get(`zone-test-${suffix}`);
    assert.equal(node.field.name, 'zone', 'On/Off goes directly to numeric Zone entry');
    assert.equal(node.field.min, 1);
    assert.equal(node.field.max, 128);
    assert.deepEqual(node.softKeys.map(button => [button.key, button.label]), [['F1','Params'],['F2','Enter'],['F3','Cancel'],['F4','Quit']]);
    assert.equal(node.softKeys.find(button => button.key === 'F2').action, `zone-test-${suffix}`);
    assert.equal(node.enter, undefined, 'do not substitute physical Enter for the displayed F2 commit');
    assert.ok(node.sourceRefs.some(ref => ref.sourceId === 'gent-vigilon-plus-basic-training-archive' && ref.pages.includes(103)));
  }
  const corroboration = sources.get('gent-vigilon-plus-basic-training-archive');
  assert.equal(corroboration.sha256, '1f1eb22abf19c69e38019524c70ea90424b45285d76218d1e63ae45b8f800dd3');
  assert.match(corroboration.edition, /undated/i);
  assert.match(corroboration.note, /does not change the classic/);
  assert.match(data.modelScope.menuMapFirmware, /V4\.53/);
  assert.deepEqual(data.modelScope.models, ['VIG1-24', 'VIG1-72']);
  assert.match(data.trainingPolicies.walkTestCancel, /FINDR/);
  assert.match(data.trainingPolicies.walkTestCancel, /never remove a committed test/);
});

test('GENT practice access and equipment state cannot be mistaken for manufacturer credentials or a live site', () => {
  assert.equal(data.fixture.fictional, true);
  assert.match(data.fixture.trainingPinNote, /FINDR-only practice credential/i);
  assert.match(data.fixture.trainingPinNote, /not a Gent factory default/i);
  assert.equal(data.trainingPolicies.noLiveConnection, true);
  assert.equal(data.trainingPolicies.noRealEngineerCodes, true);
  assert.equal(data.fixture.trainingPin, '2468');
  assert.equal(data.fixture.trainingEngineeringPin, '3917');
  assert.notEqual(data.fixture.trainingPin, data.fixture.trainingEngineeringPin);
  assert.match(data.fixture.trainingEngineeringPinNote, /fictional/i);
  assert.match(data.fixture.trainingEngineeringPinNote, /not a Gent factory default/i);
  walk(data, (value, path) => {
    for (const key of Object.keys(value)) {
      assert.ok(!/^(defaultPin|defaultCode|engineerPin|engineerCode|dailyPin|dailyCode)$/i.test(key),
        `A source default or engineering credential leaked into the practice model at ${path}.${key}`);
    }
  });
  for (const node of nodes.values()) {
    if (node.enter?.action !== 'authenticate') continue;
    assert.equal(node.enter.args?.level, 2, `The customer practice code grants engineering access at ${node.id}`);
    assert.match(node.note, /fictional/i, `Access prompt ${node.id} does not identify the practice credential`);
    const roles = node.enter.args?.roles || [];
    if (roles.length) {
      assert.equal(node.id, 'test-pin', 'engineering access remains confined to the sourced Test/Eng branch');
      assert.deepEqual(roles, [{level: 2, pinRole: 'customer', to: 'test-user'}, {level: 3, pinRole: 'engineering', to: 'test-engineer'}]);
    }
  }
});
