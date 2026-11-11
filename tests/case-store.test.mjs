import test from 'node:test';
import assert from 'node:assert/strict';
import {createCaseStore, mergeCaseSnapshot} from '../public/app/case-store.mjs';

const record = (id, extra = {}) => ({id, site: 'Synthetic training site', answers: [], ...extra});

// Writes are staged until commit, as in IndexedDB. Inject failures after either
// write or at commit to check that history and the current session stay together.
function fakeDatabase(initial = {}, {failCommit = false, failPut = '', deferCommit = false} = {}) {
  const data = new Map(Object.entries(structuredClone(initial)));
  const transactions = [];
  let complete;
  return {
    data, transactions,
    commit() { complete?.(); },
    transaction(stores, mode) {
      assert.deepEqual(stores, ['settings']);
      assert.equal(mode, 'readwrite');
      const staged = new Map(data);
      let aborted = false;
      const transaction = {
        error: null,
        abort() {
          if (aborted) return;
          aborted = true;
          queueMicrotask(() => transaction.onabort?.());
        },
        objectStore(name) {
          assert.equal(name, 'settings');
          return {
            get(key) {
              assert.equal(key, 'history');
              const request = {};
              queueMicrotask(() => {
                request.result = structuredClone(staged.get(key));
                request.onsuccess?.();
                complete = () => {
                  if (aborted) return;
                  if (failCommit) {
                    transaction.error = new Error('Synthetic quota failure');
                    transaction.onerror?.();
                    transaction.abort();
                    return;
                  }
                  data.clear();
                  for (const [k, v] of staged) data.set(k, v);
                  transaction.oncomplete?.();
                };
                if (!deferCommit) queueMicrotask(complete);
              });
              return request;
            },
            put(value, key) {
              if (key === failPut) throw new Error('Synthetic write failure');
              staged.set(key, structuredClone(value));
              return {};
            },
          };
        },
      };
      transactions.push({stores, mode});
      return transaction;
    },
  };
}

test('merge replaces only this ID, retains all older cases and does not mutate inputs', () => {
  const older = Array.from({length: 55}, (_, i) => record(`old-${i}`, {legacyField: {keep: i}}));
  const history = [record('current', {message: 'Previous'}), ...older];
  const current = record('current', {investigation: {readings: [{value: '24.10', unit: 'V DC'}]}});
  const merged = mergeCaseSnapshot(history, current, 1234);
  assert.equal(merged.history.length, 56);
  assert.deepEqual(merged.history.slice(1), older);
  assert.equal(merged.session.savedAt, 1234);
  assert.equal(merged.history[0].investigation.readings[0].value, '24.10');
  assert.equal(current.savedAt, undefined);
  assert.equal(history[0].message, 'Previous');
  merged.session.investigation.readings[0].value = 'changed';
  merged.history[1].legacyField.keep = 'changed';
  assert.equal(merged.history[0].investigation.readings[0].value, '24.10');
  assert.equal(current.investigation.readings[0].value, '24.10');
  assert.equal(older[0].legacyField.keep, 0);
});

test('undefined history starts a case, while malformed history and identities are rejected', () => {
  assert.deepEqual(mergeCaseSnapshot(undefined, record('first'), 0).history, [record('first', {savedAt: 0})]);
  for (const history of [null, {}, [null], [[]], [{}], [{id: ''}], [{id: 3}]]) {
    assert.throws(() => mergeCaseSnapshot(history, record('new'), 1), /history cannot be read/);
  }
  for (const current of [undefined, null, {}, [], {id: ' '}]) {
    assert.throws(() => mergeCaseSnapshot([], current, 1), /valid session ID/);
  }
  assert.throws(() => mergeCaseSnapshot([], record('new'), NaN), /save time/);
});

test('snapshot commits session and history atomically and leaves other settings untouched', async () => {
  const old = record('old'), preferences = {offline: true};
  const database = fakeDatabase({history: [old], session: old, preferences});
  const result = await createCaseStore(async () => database).saveCaseSnapshot(record('new'), 5678);
  assert.deepEqual(database.data.get('session'), result.session);
  assert.deepEqual(database.data.get('history'), result.history);
  assert.deepEqual(result.history.map(item => item.id), ['new', 'old']);
  assert.deepEqual(database.data.get('preferences'), preferences);
  assert.deepEqual(database.transactions, [{stores: ['settings'], mode: 'readwrite'}]);
  result.session.site = 'Later UI edit';
  assert.equal(database.data.get('session').site, 'Synthetic training site');
});

test('save does not resolve or expose writes before transaction completion', async () => {
  const old = record('old'), database = fakeDatabase({session: old, history: [old]}, {deferCommit: true});
  let resolved = false;
  const pending = createCaseStore(async () => database).saveCaseSnapshot(record('new'), 1).then(value => { resolved = true; return value; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(resolved, false);
  assert.deepEqual(database.data.get('session'), old);
  assert.deepEqual(database.data.get('history'), [old]);
  database.commit();
  const result = await pending;
  assert.equal(resolved, true);
  assert.deepEqual(database.data.get('session'), result.session);
});

test('save takes an immutable snapshot before awaiting the database', async () => {
  const database = fakeDatabase();
  let open;
  const databaseReady = new Promise(resolve => { open = resolve; });
  const current = record('new', {investigation: {notes: 'Before save'}});
  const pending = createCaseStore(() => databaseReady).saveCaseSnapshot(current, 1);
  current.investigation.notes = 'Changed while saving';
  open(database);
  const result = await pending;
  assert.equal(result.session.investigation.notes, 'Before save');
});

test('commit failure or second-write failure preserves previous history and current session', async () => {
  const old = record('old'), current = record('current', {answers: [{id: 'q1', answer: 'unknown'}]});
  const initial = {history: [old, current], session: current, 'panel-imports-v1': [{id: 'import'}]};
  for (const options of [{failCommit: true}, {failPut: 'session'}]) {
    const database = fakeDatabase(initial, options);
    const store = createCaseStore(async () => database);
    await assert.rejects(store.saveCaseSnapshot(record('current', {message: 'New draft'}), 2), /Synthetic .* failure/);
    assert.deepEqual(Object.fromEntries(database.data), initial);
  }
});

test('malformed stored history is never overwritten by a new save', async () => {
  const current = record('current'), initial = {history: {unexpected: 'shape'}, session: current};
  const database = fakeDatabase(initial);
  await assert.rejects(createCaseStore(async () => database).saveCaseSnapshot(record('new'), 1), /history cannot be read/);
  assert.deepEqual(Object.fromEntries(database.data), initial);
});

test('updating one case uses current stored history rather than a stale caller copy', async () => {
  const database = fakeDatabase({history: [record('first')]});
  const store = createCaseStore(async () => database);
  await store.saveCaseSnapshot(record('second'), 1);
  const updated = await store.saveCaseSnapshot(record('first', {message: 'Updated'}), 2);
  assert.deepEqual(updated.history.map(item => item.id), ['first', 'second']);
  assert.equal(updated.history[0].message, 'Updated');
  assert.equal(updated.history[1].savedAt, 1);
});
