import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  prepareMenuMap, validateMenuMap, menuBreadcrumbs, menuChildren,
  menuCodeLabel, menuNodeKind, searchMenuMaps, menuReferenceText,
} from '../public/app/menu-map-engine.mjs';

const readJSON = relative => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const profileIds = ['galaxy-dimension', 'texecom-premier-elite', 'scantronic-ion', 'orisec-cp', 'menvier-mseries', 'pyronix-enforcer', 'ade-accenta-optima', 'risco-lightsys2', 'hkc-quantum70'];
const maps = profileIds.map(id => prepareMenuMap(readJSON(`../public/app/data/menu-maps/${id}.json`)));
const practice = readJSON('../public/app/data/practice.json').profiles;
const mapFor = id => maps.find(map => map.profileId === id);
const nodeFor = (map, id) => {
  const node = map.nodes.find(node => node.id === id);
  assert.ok(node, `${map.profileId}: missing documented node ${id}`);
  return node;
};
const pathIds = (map, id) => menuBreadcrumbs(map, id).map(node => node.id);
const query = (text, profileId = '', extra = {}) => searchMenuMaps(maps, text, {profileId, ...extra});

for (const map of maps) {
  test(`${map.profileId}: the published graph and source references are internally valid`, () => {
    assert.deepEqual(validateMenuMap(map), []);
    const sources = new Map(map.sources.map(source => [source.id, source]));
    assert.equal(sources.size, map.sources.length, 'A duplicate source ID could silently change provenance');
    const ids = new Set(map.nodes.map(node => node.id));
    for (const node of map.nodes) {
      const route = menuBreadcrumbs(map, node.id);
      assert.equal(route.at(-1).id, node.id);
      assert.equal(route[0].parentId ?? null, null, `${node.id}: path must reach a session/reference root`);
      assert.equal(new Set(route.map(part => part.id)).size, route.length);
      for (const ref of node.sourceRefs) {
        const source = sources.get(ref.sourceId);
        assert.ok(source.edition, `${node.id}: the document edition is required`);
        assert.ok(source.publisher, `${node.id}: the document publisher is required`);
        assert.ok(Number.isInteger(source.totalPdfPages) && source.totalPdfPages > 0);
        assert.ok(ref.pdfPage <= source.totalPdfPages);
      }
      for (const relatedId of node.relatedNodeIds || []) assert.ok(ids.has(relatedId), `${node.id}: missing related reference ${relatedId}`);
    }
  });

  test(`${map.profileId}: reference links open real exercises from the same practice profile`, () => {
    const profile = practice.find(item => item.id === map.profileId);
    assert.ok(profile, 'The reference must remain associated with an existing simulator profile');
    const tasks = new Set(profile.tasks.map(task => task.id));
    const linked = map.nodes.filter(node => node.practiceTaskIds?.length);
    assert.ok(linked.length, 'At least the already implemented tasks should be linked');
    for (const node of linked) for (const taskId of node.practiceTaskIds) {
      assert.ok(tasks.has(taskId), `${node.id}: ${taskId} is not implemented for ${map.profileId}`);
    }
  });

  test(`${map.profileId}: unsupported completeness and physical verification are not implied`, () => {
    assert.ok(map.baseline && map.scope);
    assert.equal(map.coverage.hardwareVerified, false);
    assert.ok(map.coverage.excludedAreas.length);
    assert.ok(map.gaps.some(gap => gap.question && gap.reason && gap.neededEvidence));
    for (const node of map.nodes.filter(node => ['selection', 'reference'].includes(node.kind))) {
      assert.ok(node.address == null || node.address === '', `${node.id}: a value/reference must not acquire an executable address`);
    }
  });
}

test('Galaxy: system resistance and per-zone resistance remain different documented routes', () => {
  const map = mapFor('galaxy-dimension');
  const system = nodeFor(map, 'galaxy-51.46');
  const zone = nodeFor(map, 'galaxy-52.9');
  assert.equal(system.address, '51.46');
  assert.equal(system.code, '46');
  assert.equal(system.label, 'Resistance Select');
  assert.deepEqual(pathIds(map, system.id), ['galaxy-engineer-full', 'galaxy-50', 'galaxy-51', system.id]);
  assert.equal(zone.address, '52.9');
  assert.match(zone.summary, /individual|zone/i);
  assert.ok(zone.conditions.some(condition => /select.*record/i.test(condition)));
  assert.ok(system.sourceRefs.some(ref => ref.pdfPage === 138 && ref.printedPage === '6-64'));
});

test('Galaxy: Full Menu 21 and configurable Quick slot 3 do not become the same number namespace', () => {
  const map = mapFor('galaxy-dimension');
  const full = nodeFor(map, 'galaxy-21');
  const quick = nodeFor(map, 'galaxy-quick.3');
  assert.equal(full.address, '21');
  assert.equal(quick.code, '3');
  assert.equal(quick.address, null);
  assert.equal(quick.kind, 'reference');
  assert.ok(quick.relatedNodeIds.includes(full.id));
  assert.ok(pathIds(map, quick.id).includes('galaxy-quick'));
  assert.ok(nodeFor(map, 'galaxy-59').notes.some(note => /reorder|sort/i.test(note)));
});

test('Galaxy: function 03 is an Intruder value, not a new Full Menu or complete address', () => {
  const map = mapFor('galaxy-dimension');
  const value = nodeFor(map, 'galaxy-52.1.v03');
  assert.equal(value.label, 'Intruder');
  assert.equal(value.kind, 'selection');
  assert.equal(value.address, null);
  assert.equal(menuCodeLabel(value), 'Value 03');
  assert.equal(menuNodeKind(value), 'Value / choice');
  assert.equal(menuBreadcrumbs(map, value.id).at(-2).id, 'galaxy-52.1');
});

test('Galaxy: menu order retains reserved parameter slots instead of renumbering later choices', () => {
  const children = menuChildren(mapFor('galaxy-dimension'), 'galaxy-51');
  const position = code => children.findIndex(node => node.code === code);
  assert.equal(position('41'), position('40') + 1);
  assert.equal(position('44'), position('43') + 1);
  assert.equal(children[position('40')].kind, 'reference');
  assert.equal(children[position('43')].kind, 'reference');
  assert.equal(children[position('46')].label, 'Resistance Select');
});

test('Texecom: engineer diagnostics and user omission have separate entry contexts', () => {
  const map = mapFor('texecom-premier-elite');
  const utility = nodeFor(map, 'util-zone-status');
  assert.deepEqual(pathIds(map, utility.id), ['eng', 'utils', utility.id]);
  assert.equal(nodeFor(map, 'utils').code, '9');
  assert.equal(utility.code, '3');
  assert.equal(utility.address ?? null, null, 'Do not infer a universal 9.3 shortcut');
  assert.deepEqual(pathIds(map, 'arm-omit'), ['arming', 'arm-omit']);
  assert.ok(nodeFor(map, 'arm-omit').sourceRefs.every(ref => ref.sourceId === 'user'));
});

test('Texecom: conflicting older/newer Arming Menu numbers remain separately cited', () => {
  const map = mapFor('texecom-premier-elite');
  const userOmit = nodeFor(map, 'arm-omit');
  const olderOmit = nodeFor(map, 'legacy-arm-4');
  assert.equal(userOmit.label, olderOmit.label);
  assert.equal(userOmit.code, '7');
  assert.equal(olderOmit.code, '4');
  assert.ok(pathIds(map, userOmit.id).includes('arming'));
  assert.ok(pathIds(map, olderOmit.id).includes('legacy-arming'));
  assert.ok(olderOmit.sourceRefs.every(ref => ref.sourceId === 'install'));
  assert.equal(nodeFor(map, 'legacy-arming').kind, 'reference');
});

test('Orisec: chapter headings are not fabricated root shortcuts', () => {
  const map = mapFor('orisec-cp');
  assert.equal(nodeFor(map, 'tests').code, null);
  assert.equal(nodeFor(map, 'programming').code, null);
  assert.equal(nodeFor(map, 'tests-view-zone-status').code, '03');
  assert.equal(nodeFor(map, 'program-zone-programming').code, '00');
  assert.deepEqual(pathIds(map, 'tests-view-zone-status'), ['engineer', 'tests', 'tests-view-zone-status']);
  assert.ok(map.numbering.caveats.some(caveat => /chapter|top.level/i.test(caveat)));
});

test('Orisec: the narrower CP-25/CP-50 user source is not silently extended to CP-100', () => {
  const map = mapFor('orisec-cp');
  const user = map.sources.find(source => source.id === 'ins023');
  assert.match(user.scope, /CP-25.*CP-50.*only/i);
  const omit = nodeFor(map, 'user-omit');
  assert.deepEqual(pathIds(map, omit.id), ['user', omit.id]);
  assert.ok(omit.sourceRefs.every(ref => ref.sourceId === 'ins023'));
  assert.ok(omit.sourceRefs.some(ref => ref.pdfPage === 21));
});

test('Scantronic: labelled installer branches do not gain made-up numeric shortcuts', () => {
  const map = mapFor('scantronic-ion');
  const diagnostic = nodeFor(map, 'i-test-zone-resistances');
  assert.equal(diagnostic.code, null);
  assert.equal(diagnostic.address ?? null, null);
  assert.equal(diagnostic.kind, 'status');
  assert.ok(pathIds(map, diagnostic.id).includes('installer-v6'));
  assert.ok(pathIds(map, diagnostic.id).includes('i-test'));
  assert.equal(map.numbering.style, 'labelled');
});

test('Scantronic: installer v6, user v7 and 2020 omission provenance remain separate', () => {
  const map = mapFor('scantronic-ion');
  assert.match(nodeFor(map, 'installer-v6').label, /6\.0/);
  assert.match(nodeFor(map, 'user-v7').label, /7\.02/);
  for (const node of map.nodes.filter(node => pathIds(map, node.id).includes('installer-v6'))) {
    assert.ok(node.sourceRefs.every(ref => ref.sourceId === 'cfg6'), `${node.id}: later user firmware cannot substantiate the v6 installer tree`);
  }
  const userOmit = nodeFor(map, 'user-2020-omit-zones');
  assert.deepEqual(pathIds(map, userOmit.id), ['user-2020', userOmit.id]);
  assert.ok(userOmit.sourceRefs.every(ref => ref.sourceId === 'user2020'));
  assert.ok(pathIds(map, 'user-v7-omit-zones').includes('user-v7'));
});

test('Exact 51.46 search returns the parameter before any dependent values or loose number matches', () => {
  for (const text of ['51.46', 'Galaxy 51.46', '051.046']) {
    const hits = query(text);
    assert.ok(hits.length, text);
    assert.equal(hits[0].map.profileId, 'galaxy-dimension');
    assert.equal(hits[0].node.id, 'galaxy-51.46');
    assert.equal(hits[0].approximate, false);
  }
  assert.deepEqual(query('50.51.46'), [], 'Grouping headings must not create invented dotted addresses');
});

test('Model numbers qualify diagnostic searches without weakening numeric menu lookup', () => {
  const premier = query('Premier Elite 48 zone status', '', {includeValues: false});
  const status = premier.find(hit => hit.node.id === 'util-zone-status');
  assert.ok(status, '48 identifies the Premier Elite model, not a required menu address');
  assert.ok(premier.every(hit => hit.map.profileId === 'texecom-premier-elite'));
  assert.deepEqual(status.path.map(node => node.id), ['eng', 'utils', 'util-zone-status']);
  assert.ok(status.node.sourceRefs.some(ref => ref.sourceId === 'install' && ref.pdfPage === 116));

  const ion = query('i-on40H zone resistances', '', {includeValues: false});
  assert.equal(ion[0]?.node.id, 'i-test-zone-resistances');
  assert.ok(ion.every(hit => hit.map.profileId === 'scantronic-ion'));
  assert.ok(ion[0].node.sourceRefs.some(ref => ref.sourceId === 'cfg6' && ref.pdfPage === 110));

  for (const text of ['999', '999.999', 'menu 999', 'menu 999.999', 'Texecom 51.46', 'Premier Elite 48 51.46', 'i-on40H 51.46']) {
    assert.deepEqual(query(text), [], `${text}: model recognition must not invent a menu or borrow another brand's address`);
  }
});

test('Brand filtering cannot borrow a valid numeric route from a different manufacturer', () => {
  assert.deepEqual(query('51.46', 'texecom-premier-elite'), []);
  const hits = query('zone', 'scantronic-ion');
  assert.ok(hits.length);
  assert.ok(hits.every(hit => hit.map.profileId === 'scantronic-ion'));
});

test('Root filtering preserves the selected menu/session context', () => {
  const hits = query('walk test', 'scantronic-ion', {rootId: 'installer-v6'});
  assert.ok(hits.some(hit => hit.node.id === 'i-walk'));
  assert.ok(hits.every(hit => hit.path.some(node => node.id === 'installer-v6')));
  assert.ok(hits.every(hit => !hit.path.some(node => node.id === 'user-v7')));
});

test('Hiding values/references preserves applicable menus and removes function-code matches', () => {
  const all = query('walk test', 'galaxy-dimension');
  assert.ok(all.some(hit => hit.node.id === 'galaxy-53.1.v31'), 'The output-function reference should be searchable when requested');
  const menus = query('walk test', 'galaxy-dimension', {includeValues: false});
  assert.ok(menus.some(hit => hit.node.id === 'galaxy-31'));
  assert.ok(menus.every(hit => !['selection', 'reference'].includes(hit.node.kind)));
});

test('Common omission and restoration phrases find documented user actions', () => {
  for (const [profileId, expected] of [['galaxy-dimension', 'galaxy-11'], ['orisec-cp', 'user-omit']]) {
    assert.equal(query('disable device', profileId, {includeValues: false})[0]?.node.id, expected);
    assert.equal(query('restore device', profileId, {includeValues: false})[0]?.node.id, expected);
  }
  assert.ok(query('disable a detector', 'texecom-premier-elite').some(hit => hit.node.id === 'arm-omit'));
  assert.ok(query('isolate a sensor', 'scantronic-ion').some(hit => hit.node.id === 'user-2020-omit-zones'));
});

test('Resistance questions prioritise diagnostic readings over resistor programming', () => {
  const expected = new Map([
    ['texecom-premier-elite', 'util-zone-status-1'],
    ['scantronic-ion', 'i-test-zone-resistances'],
    ['orisec-cp', 'tests-view-zone-status'],
  ]);
  for (const [profileId, nodeId] of expected) {
    assert.equal(query('how do I check zone resistance', profileId, {includeValues: false})[0]?.node.id, nodeId);
  }
});

test('Alarm-history phrases locate the log and retain its real path and source', () => {
  for (const question of ['what caused the last alarm', 'what triggered the last alarm']) {
    assert.ok(query(question, 'galaxy-dimension', {includeValues: false}).some(hit => hit.node.id === 'galaxy-22'), question);
  }
  const hits = query('last alarm', 'galaxy-dimension', {includeValues: false});
  const log = hits.find(hit => hit.node.id === 'galaxy-22');
  assert.ok(log);
  assert.deepEqual(log.path.map(node => node.id), ['galaxy-user-full', 'galaxy-20', 'galaxy-22']);
  assert.ok(log.node.sourceRefs.some(ref => ref.pdfPage === 90));
  assert.ok(query('what set it off', 'texecom-premier-elite').some(hit => hit.node.id === 'util-log'));
});

test('A close spelling match is marked approximate instead of being presented as exact wording', () => {
  const hits = query('zone resistnce', 'orisec-cp', {includeValues: false});
  assert.equal(hits[0]?.node.id, 'tests-view-zone-status');
  assert.equal(hits[0]?.approximate, true);
});

test('Unknown concepts, missing addresses and empty requests do not generate invented answers', () => {
  for (const text of ['', '   ', 'menu 999.999', 'quantum xylophone', '50.51.46']) assert.deepEqual(query(text), [], text);
  assert.deepEqual(query('cloud', 'galaxy-dimension'), [], 'The archived Dimension atlas has no cloud menu');
  for (const hit of query('zone')) {
    assert.equal(hit.node, nodeFor(hit.map, hit.node.id), 'Every hit must be an actual source-backed node');
    assert.ok(hit.node.sourceRefs.length);
  }
});

test('Copied references retain the baseline, actual path and exact source page', () => {
  const map = mapFor('galaxy-dimension');
  const text = menuReferenceText(map, nodeFor(map, 'galaxy-51.46'));
  assert.match(text, /IE1-0063 Rev 1\.0/);
  assert.match(text, /Verified address: 51\.46/);
  assert.match(text, /printed p6-64; PDF p138/);
  assert.match(text, /\.pdf#page=138/);
  assert.doesNotMatch(text, /Verified address: 50\.51/);
  const value = menuReferenceText(map, nodeFor(map, 'galaxy-52.1.v03'));
  assert.match(value, /Value \/ choice/);
  assert.match(value, /Value 03/);
  assert.doesNotMatch(value, /Verified address:/);
});

const validFixture = () => ({
  profileId: 'fixture', title: 'Fixture', baseline: 'Pinned fixture edition', scope: 'Validation fixture',
  sources: [{id: 'manual', publisher: 'Fixture publisher', title: 'Fixture manual', edition: '1', url: 'https://example.test/manual.pdf', totalPdfPages: 5}],
  nodes: [
    {id: 'root', parentId: null, order: 1, label: 'Menu', kind: 'menu', sourceRefs: [{sourceId: 'manual', printedPage: '1', pdfPage: 1}]},
    {id: 'child', parentId: 'root', order: 1, label: 'Entry', kind: 'setting', sourceRefs: [{sourceId: 'manual', printedPage: '2', pdfPage: 2}]},
  ],
  gaps: [],
});

test('Integrity validation rejects duplicate/missing parents and cycles before publication', () => {
  assert.deepEqual(validateMenuMap(validFixture()), []);
  const duplicate = validFixture(); duplicate.nodes.push({...duplicate.nodes[1]});
  assert.ok(validateMenuMap(duplicate).some(error => /Duplicate node/.test(error)));
  const orphan = validFixture(); orphan.nodes[1].parentId = 'absent';
  assert.ok(validateMenuMap(orphan).some(error => /missing parent/.test(error)));
  const cycle = validFixture(); cycle.nodes[0].parentId = 'child';
  assert.ok(validateMenuMap(cycle).some(error => /cycle/.test(error)));
});

test('Integrity validation rejects missing provenance, out-of-range pages and unsafe source URLs', () => {
  const missing = validFixture(); missing.nodes[1].sourceRefs[0].sourceId = 'unknown';
  assert.ok(validateMenuMap(missing).some(error => /unknown source/.test(error)));
  const page = validFixture(); page.nodes[1].sourceRefs[0].pdfPage = 6;
  assert.ok(validateMenuMap(page).some(error => /invalid PDF page/.test(error)));
  const unsafe = validFixture(); unsafe.sources[0].url = 'javascript:alert(1)';
  assert.ok(validateMenuMap(unsafe).some(error => /invalid source URL/.test(error)));
  const gap = validFixture(); gap.gaps.push({id: 'gap', affectedNodeIds: ['absent']});
  assert.ok(validateMenuMap(gap).some(error => /missing affected node/.test(error)));
});
