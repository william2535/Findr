import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject} from '../public/app/cause-effect-engine.mjs';
import {CAUSE_EFFECT_PROJECTS_KEY, createCauseEffectStore} from '../public/app/cause-effect-store.mjs';

function database(initial = {}, {failCommit = false} = {}) {
  const data = new Map(Object.entries(structuredClone(initial)));
  return {data, transaction(stores, mode) {
    assert.deepEqual(stores, ['settings']);
    const staged = new Map(data); let aborted = false;
    const tx = {error: null, abort() { if (!aborted) { aborted = true; queueMicrotask(() => tx.onabort?.()); } }, objectStore(name) {
      assert.equal(name, 'settings');
      return {get(key) {
        const request = {};
        queueMicrotask(() => {
          request.result = structuredClone(staged.get(key)); request.onsuccess?.();
          queueMicrotask(() => {
            if (aborted) return;
            if (mode === 'readwrite' && failCommit) { tx.error = new DOMException('Synthetic quota failure', 'QuotaExceededError'); tx.abort(); return; }
            if (mode === 'readwrite') { data.clear(); for (const [k, v] of staged) data.set(k, v); }
            tx.oncomplete?.();
          });
        });
        return request;
      }, put(value, key) { assert.equal(mode, 'readwrite'); staged.set(key, structuredClone(value)); return {}; }};
    }};
    return tx;
  }};
}

test('projects save, reload, rename and delete without touching saved visits, pals or manuals', async () => {
  const preserved = {session: {id: 'saved-fault'}, 'helpers-v1': {name: 'My pal'}, downloaded: ['manual-1']};
  const db = database(preserved), store = createCauseEffectStore(async () => db);
  assert.deepEqual(await store.listProjects(), []);
  const first = await store.saveProject(createProject({name: 'West block'}));
  const second = await store.saveProject(createProject({name: 'East block'}));
  assert.equal(first.revision, 1);
  const reloaded = createCauseEffectStore(async () => db);
  assert.equal((await reloaded.listProjects()).length, 2);
  const renamed = await reloaded.saveProject({...first, name: 'West block revision'});
  assert.equal(renamed.revision, 2); assert.equal((await reloaded.loadProject(first.id)).name, 'West block revision');
  assert.equal(await store.removeProject(second.id, {expectedRevision: second.revision}), true);
  assert.equal(await reloaded.loadProject(second.id), null);
  assert.equal((await reloaded.listProjects()).length, 1);
  for (const [key, value] of Object.entries(preserved)) assert.deepEqual(db.data.get(key), value);
});

test('revision leases reject stale saves, stale deletion and late resurrection of deleted work', async () => {
  const db = database(), store = createCauseEffectStore(async () => db);
  const first = await store.saveProject(createProject());
  const latest = await store.saveProject({...first, name: 'Newest'});
  await assert.rejects(store.saveProject({...first, name: 'Old tab'}), e => e.code === 'CAUSE_EFFECT_REVISION_CONFLICT');
  await assert.rejects(store.removeProject(first.id, {expectedRevision: first.revision}), e => e.code === 'CAUSE_EFFECT_REVISION_CONFLICT');
  await assert.rejects(store.removeProject(first.id), e => e.code === 'CAUSE_EFFECT_REVISION_CONFLICT');
  assert.equal((await store.loadProject(first.id)).name, 'Newest');
  await store.removeProject(first.id, {expectedRevision: latest.revision});
  await assert.rejects(store.saveProject(latest), e => e.code === 'CAUSE_EFFECT_REVISION_CONFLICT');
  assert.deepEqual(await store.listProjects(), []);
});

test('a queued save uses the captured design, not UI edits made while storage opens', async () => {
  const db = database(); let ready;
  const store = createCauseEffectStore(() => new Promise(resolve => { ready = resolve; }));
  const p = createProject({name: 'Captured'}), pending = store.saveProject(p);
  p.name = 'Edited while saving'; p.outputs[0].inputIds.push('z1');
  ready(db); const saved = await pending;
  assert.equal(saved.name, 'Captured'); assert.deepEqual(saved.outputs[0].inputIds, []);
});

test('quota failure never reports a save or overwrites the last usable project', async () => {
  const original = createProject({name: 'Last saved'}); original.revision = 1;
  const initial = {schemaVersion: 1, projects: [original]};
  const db = database({[CAUSE_EFFECT_PROJECTS_KEY]: initial}, {failCommit: true});
  const store = createCauseEffectStore(async () => db);
  await assert.rejects(store.saveProject({...original, name: 'Unsaved'}), e => e.code === 'CAUSE_EFFECT_STORAGE_FULL' && /Export/.test(e.message));
  assert.deepEqual(db.data.get(CAUSE_EFFECT_PROJECTS_KEY), initial);
});

test('unavailable storage and malformed saved data have distinct recoverable errors', async () => {
  const unavailable = createCauseEffectStore(async () => { throw new DOMException('Blocked', 'SecurityError'); });
  await assert.rejects(unavailable.listProjects(), e => e.code === 'CAUSE_EFFECT_STORAGE_UNAVAILABLE');
  const bad = {schemaVersion: 5, projects: []}, db = database({[CAUSE_EFFECT_PROJECTS_KEY]: bad});
  const store = createCauseEffectStore(async () => db);
  await assert.rejects(store.listProjects(), e => e.code === 'CAUSE_EFFECT_STORAGE_INVALID');
  await assert.rejects(store.saveProject(createProject()), e => e.code === 'CAUSE_EFFECT_STORAGE_INVALID');
  assert.deepEqual(db.data.get(CAUSE_EFFECT_PROJECTS_KEY), bad);
});

test('two projects and fresh reads never share mutable references', async () => {
  const db = database(), store = createCauseEffectStore(async () => db);
  const a = await store.saveProject(createProject({name: 'A'}));
  const b = await store.saveProject(createProject({name: 'B'}));
  const loaded = await store.loadProject(a.id); loaded.outputs[0].inputIds.push('z1');
  assert.deepEqual((await store.loadProject(a.id)).outputs[0].inputIds, []);
  assert.deepEqual((await store.loadProject(b.id)).outputs[0].inputIds, []);
});
