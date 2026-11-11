import test from 'node:test';
import assert from 'node:assert/strict';
import {PANEL_IMPORTS_KEY, preparePanelImports, createPanelImportStore} from '../public/app/panel-import-store.mjs';

const schedule = (id, overrides = {}) => ({
  id, site: 'Synthetic Training Site', panel: 'Fire panel A', filename: 'synthetic.csv',
  fileHash: 'synthetic-hash', importedAt: 1730000000000, exportDate: '2024-10-20', format: 'CSV',
  mapping: {loop: 0, address: 1, partNumber: 2},
  rows: [{id: '2', loop: '01', address: '0037', partNumber: 'S4-720-ST-VO', rawValues: ['01', '0037', 'S4-720-ST-VO']}],
  ...overrides,
});

// A transactional fake: writes are staged and become visible only on completion.
// The fault injection models IndexedDB quota/transaction abort after put().
function fakeDatabase(initial, {failCommit = false} = {}) {
  const data = new Map(initial === undefined ? [] : [[PANEL_IMPORTS_KEY, structuredClone(initial)]]);
  const transactions = [];
  return {
    data, transactions,
    transaction(stores, mode) {
      const staged = new Map(data); let aborted = false;
      const transaction = {
        error: null,
        abort() { if (aborted) return; aborted = true; queueMicrotask(() => transaction.onabort?.()); },
        objectStore(name) {
          assert.equal(name, 'settings');
          return {
            get(key) {
              const request = {};
              queueMicrotask(() => {
                request.result = structuredClone(staged.get(key));
                request.onsuccess?.();
                queueMicrotask(() => {
                  if (aborted) return;
                  if (failCommit && mode === 'readwrite') {
                    transaction.error = new Error('Synthetic quota failure'); transaction.abort(); return;
                  }
                  if (mode === 'readwrite') { data.clear(); for (const [k, v] of staged) data.set(k, v); }
                  transaction.oncomplete?.();
                });
              });
              return request;
            },
            put(value, key) { assert.equal(mode, 'readwrite'); staged.set(key, structuredClone(value)); return {}; },
          };
        },
      };
      transactions.push({stores, mode});
      return transaction;
    },
  };
}

test('panel imports preserve leading zeros and suffixes without changing prior data', () => {
  const first = schedule('first'), second = schedule('second', {panel: 'Fire panel B'});
  const previous = [first], next = preparePanelImports(previous, second);
  assert.equal(previous.length, 1); assert.equal(next.length, 2);
  assert.equal(next[0].rows[0].address, '0037');
  assert.equal(next[0].rows[0].partNumber, 'S4-720-ST-VO');
  next[0].rows[0].address = 'different';
  assert.equal(first.rows[0].address, '0037');
});

test('same file and scope require deliberate replacement and never append duplicate devices', () => {
  const original = schedule('first'), repeated = schedule('second', {site: ' SYNTHETIC TRAINING SITE ', panel: ' fire PANEL a '});
  assert.throws(() => preparePanelImports([original], repeated), /Confirm replacement/);
  const replaced = preparePanelImports([original], repeated, {replaceId: 'first', expectedImportId: 'first'});
  assert.equal(replaced.length, 1); assert.equal(replaced[0].rows.length, 1); assert.equal(replaced[0].id, 'second');
  assert.equal(original.id, 'first');
});

test('stale replacement, colliding ID and malformed schedule leave existing import intact', () => {
  const original = schedule('first');
  assert.throws(() => preparePanelImports([schedule('changed')], schedule('new'), {replaceId: 'first', expectedImportId: 'first'}), /changed since/);
  assert.throws(() => preparePanelImports([original], schedule('first'), {replaceId: 'first', expectedImportId: 'first'}), /new import ID/);
  assert.throws(() => preparePanelImports([original], schedule('new', {rows: []}), {replaceId: 'first', expectedImportId: 'first'}), /device rows/);
  assert.throws(() => preparePanelImports([original], schedule('new', {rows: [{id: '2', loop: '', address: '37', rawValues: []}]})), /loop and address/);
  assert.deepEqual(original, schedule('first'));
});

test('atomic store resolves after commit and touches only the existing settings store', async () => {
  const database = fakeDatabase();
  const store = createPanelImportStore(async () => database);
  assert.deepEqual(await store.loadPanelImports(), []);
  const result = await store.savePanelImport(schedule('first'));
  assert.deepEqual(database.data.get(PANEL_IMPORTS_KEY), [result]);
  const reload = createPanelImportStore(async () => database);
  assert.equal((await reload.loadPanelImports())[0].rows[0].loop, '01');
  assert.ok(database.transactions.every(t => t.stores.length === 1 && t.stores[0] === 'settings'));
  const next = await store.savePanelImport(schedule('second'), {replaceId: 'first', expectedImportId: 'first'});
  assert.equal(next.id, 'second'); assert.equal((await reload.loadPanelImports()).length, 1);
});

test('failed transaction and rejected replacement preserve last usable stored schedule', async () => {
  const original = schedule('first'), database = fakeDatabase([original], {failCommit: true});
  const store = createPanelImportStore(async () => database);
  await assert.rejects(store.savePanelImport(schedule('replacement'), {replaceId: 'first', expectedImportId: 'first'}), /quota failure/);
  assert.deepEqual(database.data.get(PANEL_IMPORTS_KEY), [original]);
  await assert.rejects(store.savePanelImport(schedule('same-file')), /Confirm replacement/);
  assert.deepEqual(await store.loadPanelImports(), [original]);
});

test('malformed stored shape fails clearly and is never replaced or erased', async () => {
  const database = fakeDatabase({unexpected: true}), store = createPanelImportStore(async () => database);
  await assert.rejects(store.loadPanelImports(), /cannot be read/);
  await assert.rejects(store.savePanelImport(schedule('new')), /cannot be read/);
  assert.deepEqual(database.data.get(PANEL_IMPORTS_KEY), {unexpected: true});
});
