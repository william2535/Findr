// Removal contract tests use tiny synthetic bodies. Byte headers model pinned
// metadata; these fixtures do not represent real model downloads or inference.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
 LOCAL_LANGUAGE_PROFILES, LOCAL_LANGUAGE_VERSION, LOCAL_MODEL_CACHE,
 localModelPartCount, localModelPartBytes,
} from '../public/app/local-language-resources.mjs';
import {modelPartKey, modelVerifiedKey} from '../public/app/local-language-cache.mjs';

let instance = 0;
const compact = LOCAL_LANGUAGE_PROFILES.compact;
const candidate = LOCAL_LANGUAGE_PROFILES['conversation-2b'];
const storage = () => {
 const values = new Map();
 return {
  values,
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
 };
};
const partKeys = profile => profile.files.flatMap(file =>
 Array.from({length: localModelPartCount(file)}, (_, index) => modelPartKey(file, index)));
const markerKeys = profile => profile.files.map(modelVerifiedKey);
const pinnedKeys = profile => [...markerKeys(profile), ...partKeys(profile)];
const proof = profile => ({
 passed: true, profileId: profile.id, modelId: profile.model.id,
 revision: profile.model.revision, runtimeVersion: LOCAL_LANGUAGE_VERSION,
 semanticQualityVerified: false, synthetic: true,
});

class MemoryCache {
 constructor(name, deletions) {
  this.name = name;
  this.values = new Map();
  this.deletions = deletions;
  this.beforeDelete = null;
 }
 async put(key, response) {
  this.values.set(String(key?.url || key), {
   body: [...new Uint8Array(await response.arrayBuffer())],
   headers: [...response.headers], status: response.status,
  });
 }
 async match(key) {
  const value = this.values.get(String(key?.url || key));
  return value ? new Response(new Uint8Array(value.body), value) : undefined;
 }
 async delete(key) {
  key = String(key?.url || key);
  this.deletions.push({cache: this.name, key});
  await this.beforeDelete?.(key);
  return this.values.delete(key);
 }
 async keys() { return [...this.values.keys()].map(key => new Request(key)); }
}

async function seedProfile(cache, profile) {
 for (const file of profile.files) {
  await cache.put(modelVerifiedKey(file), Response.json({
   sha256: file.sha256, bytes: file.bytes, parts: localModelPartCount(file),
  }));
  for (let index = 0; index < localModelPartCount(file); index++) {
   await cache.put(modelPartKey(file, index), new Response('SYNTHETIC model part', {
    headers: {'x-findr-part-bytes': String(localModelPartBytes(file, index))},
   }));
  }
 }
}

async function setup(t, {installed = [compact, candidate], holdWorker = false} = {}) {
 const names = ['Worker', 'caches', 'navigator', 'localStorage', 'sessionStorage', 'indexedDB', 'location'];
 const original = new Map(names.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
 const local = storage(), session = storage(), workers = [], deletions = [], cachesByName = new Map();
 const databaseRows = new Map([
  ['manuals', {id: 'synthetic-manual', pdf: 'SYNTHETIC PDF'}],
  ['chats', {id: 'synthetic-chat', messages: ['SYNTHETIC conversation']}],
  ['indexes', {id: 'synthetic-index', pages: [1, 2]}],
  ['jobs', {id: 'synthetic-download-job', state: 'paused'}],
 ]);
 let mod;
 t.after(() => {
  try {
   mod?.unloadLocalLanguage();
   for (const worker of workers) worker.terminate();
  } finally {
   for (const [key, descriptor] of original) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
   }
  }
 });
 const install = (key, value) => Object.defineProperty(globalThis, key, {value, configurable: true, writable: true});
 install('localStorage', local);
 install('sessionStorage', session);
 install('location', {origin: 'https://findr-removal.example'});
 install('navigator', {
  onLine: true, userAgent: 'Synthetic removal test; no actual inference',
  storage: {estimate: async () => ({quota: 10e9, usage: 5e9})},
 });
 install('indexedDB', {
  open() { throw Error('Model removal must not open or edit manuals, conversations, indexes or jobs.'); },
  deleteDatabase() { throw Error('Model removal must not delete an IndexedDB database.'); },
 });
 install('caches', {
  async open(name) {
   if (!cachesByName.has(name)) cachesByName.set(name, new MemoryCache(name, deletions));
   return cachesByName.get(name);
  },
  async match(key) {
   for (const cache of cachesByName.values()) {
    const response = await cache.match(key);
    if (response) return response;
   }
  },
  async keys() { return [...cachesByName.keys()]; },
  async delete() { throw Error('Model removal must not delete an entire cache.'); },
 });
 install('Worker', class {
  constructor() { this.terminated = false; workers.push(this); }
  postMessage(message) {
   this.request = message;
   if (!holdWorker) queueMicrotask(() => this.onmessage?.({data: {
    id: message.id, type: 'complete', result: {text: 'READY', metrics: {outputTokens: 1}},
   }}));
  }
  terminate() { this.terminated = true; }
 });
 const cache = await caches.open(LOCAL_MODEL_CACHE);
 for (const profile of installed) await seedProfile(cache, profile);
 const appCache = await caches.open('findr-app-synthetic');
 for (const path of new Set(Object.values(LOCAL_LANGUAGE_PROFILES).flatMap(profile => profile.runtimePaths))) {
  await appCache.put(new URL(path, new URL('../public/app/local-language.mjs', import.meta.url)).href,
   new Response('SYNTHETIC shared runtime'));
 }
 await appCache.put('https://findr-removal.example/manual/synthetic.pdf', new Response('SYNTHETIC cached PDF'));
 await cache.put('https://findr-removal.example/__findr-language/unrelated-revision/part-0', new Response('SYNTHETIC other revision'));
 const candidateFile = candidate.files[0];
 await cache.put(modelPartKey(candidateFile, localModelPartCount(candidateFile) + 10), new Response('SYNTHETIC unpinned key'));
 await cache.put(modelVerifiedKey(candidateFile) + '.backup', new Response('SYNTHETIC unpinned metadata'));
 local.setItem('findr-synthetic-conversations', 'SYNTHETIC saved conversation');
 local.setItem('findr-synthetic-download-jobs', 'SYNTHETIC paused download');
 session.setItem('findr-synthetic-current-job', 'SYNTHETIC job checkpoint');
 mod = await import('../public/app/local-language.mjs?removal-test=' + instance++);
 local.setItem(mod.LOCAL_LANGUAGE_TRIAL_KEY, JSON.stringify({
  compact: proof(compact), [candidate.id]: proof(candidate),
  'unrelated-future-profile': {passed: true, synthetic: true, revision: 'preserve-me'},
 }));
 return {mod, local, session, workers, cache, appCache, deletions, cachesByName, databaseRows};
}

function preservationSnapshot(h, removedProfile) {
 const excluded = new Set(pinnedKeys(removedProfile));
 return {
  caches: [...h.cachesByName].map(([name, cache]) => [name, [...cache.values]
   .filter(([key]) => name !== LOCAL_MODEL_CACHE || !excluded.has(key))]),
  local: [...h.local.values].filter(([key]) => ![h.mod.LOCAL_LANGUAGE_TRIAL_KEY, h.mod.LOCAL_LANGUAGE_PROFILE_KEY].includes(key)),
  session: [...h.session.values], databases: [...h.databaseRows],
 };
}

function assertNoFreedByteClaim(result) {
 assert.equal(result.reclaimedBytes, null, 'Cache deletion does not measure reclaimed browser storage');
 for (const key of ['freedBytes', 'removedBytes', 'reclaimedStorageBytes']) {
  assert.ok(result[key] === undefined || result[key] === null, 'No inferred freed-byte total: ' + key);
 }
}

test('partial, corrupt and missing candidate parts are removable without changing unrelated saved data', async t => {
 const h = await setup(t, {installed: [compact]});
 const file = candidate.files[0];
 await h.cache.put(modelVerifiedKey(file), new Response('not valid verification JSON'));
 await h.cache.put(modelPartKey(file, 0), new Response('SYNTHETIC corrupt part', {headers: {'x-findr-part-bytes': '3'}}));
 await h.cache.put(modelPartKey(file, 3), new Response('SYNTHETIC incomplete part'));
 const before = preservationSnapshot(h, candidate);
 const previousTrials = JSON.parse(h.local.getItem(h.mod.LOCAL_LANGUAGE_TRIAL_KEY));
 const result = await h.mod.removeLocalLanguageResources(candidate.id);
 assert.equal(result.profileId, candidate.id);
 assert.equal(result.complete, true);
 assert.equal(result.removedParts, 2);
 assert.equal(result.removedMarkers, 1);
 assert.equal(result.removedTrialProof, true);
 assert.equal(result.activeProfileId, 'compact');
 assertNoFreedByteClaim(result);
 assert.ok(pinnedKeys(candidate).every(key => !h.cache.values.has(key)));
 assert.deepEqual(preservationSnapshot(h, candidate), before);
 const trials = JSON.parse(h.local.getItem(h.mod.LOCAL_LANGUAGE_TRIAL_KEY) || '{}');
 delete previousTrials[candidate.id];
 assert.deepEqual(trials, previousTrials, 'Only the requested profile trial proof is removed');
 assert.ok(h.deletions.every(row => row.cache === LOCAL_MODEL_CACHE && pinnedKeys(candidate).includes(row.key)));
 const second = await h.mod.removeLocalLanguageResources(candidate.id);
 assert.equal(second.complete, true);
 assert.equal(second.removedParts, 0);
 assert.equal(second.removedMarkers, 0);
 assert.equal(second.removedTrialProof, false);
 assertNoFreedByteClaim(second);
});

test('every pinned verification marker is invalidated before the first compact chunk is deleted', async t => {
 const h = await setup(t);
 const before = preservationSnapshot(h, compact);
 h.cache.beforeDelete = key => {
  if (partKeys(compact).includes(key)) {
   assert.ok(markerKeys(compact).every(marker => !h.cache.values.has(marker)),
    'No file may retain verified readiness once any model chunk is removed');
  }
 };
 const result = await h.mod.removeLocalLanguageResources(compact.id);
 assert.equal(result.complete, true);
 assert.equal(result.removedMarkers, compact.files.length);
 assert.equal(result.removedParts, partKeys(compact).length);
 assertNoFreedByteClaim(result);
 assert.deepEqual(preservationSnapshot(h, compact), before);
 const trials = JSON.parse(h.local.getItem(h.mod.LOCAL_LANGUAGE_TRIAL_KEY));
 assert.equal(trials.compact, undefined);
 assert.deepEqual(trials[candidate.id], proof(candidate));
});

test('a marker invalidation failure reports partial removal and leaves every chunk intact', async t => {
 const h = await setup(t);
 const beforeParts = partKeys(compact).map(key => [key, h.cache.values.get(key)]);
 const failingMarker = modelVerifiedKey(compact.files[1]);
 h.cache.beforeDelete = key => { if (key === failingMarker) throw Error('SYNTHETIC marker deletion denied'); };
 await assert.rejects(h.mod.removeLocalLanguageResources(compact.id), error => {
  assert.ok(error.message.length > 0);
  assert.equal(error.code, 'MODEL_REMOVAL_PARTIAL');
  assert.equal(error.removal?.complete, false);
  assert.equal(error.removal.profileId, compact.id);
  assert.equal(error.removal.removedParts, 0);
  assertNoFreedByteClaim(error.removal);
  return true;
 });
 assert.deepEqual(partKeys(compact).map(key => [key, h.cache.values.get(key)]), beforeParts);
 assert.ok(h.deletions.every(row => !partKeys(compact).includes(row.key)));
 assert.equal(h.cache.values.has(failingMarker), true);
});

test('a cache deletion that reports success but retains its marker cannot proceed to chunk deletion', async t => {
 const h = await setup(t);
 const retainedMarker = modelVerifiedKey(compact.files[0]);
 const remove = h.cache.delete.bind(h.cache);
 h.cache.delete = async key => {
  if (key !== retainedMarker) return remove(key);
  h.deletions.push({cache: LOCAL_MODEL_CACHE, key});
  return true;
 };
 await assert.rejects(h.mod.removeLocalLanguageResources(compact.id), error => {
  assert.equal(error.code, 'MODEL_REMOVAL_PARTIAL');
  assert.equal(error.removal?.complete, false);
  assert.equal(error.removal.removedParts, 0);
  assertNoFreedByteClaim(error.removal);
  return true;
 });
 assert.ok(partKeys(compact).every(key => h.cache.values.has(key)));
 assert.ok(h.deletions.every(row => !partKeys(compact).includes(row.key)));
 assert.equal(h.cache.values.has(retainedMarker), true);
});

test('a failed chunk deletion stays visible as partial removal after readiness was invalidated', async t => {
 const h = await setup(t);
 const failingPart = modelPartKey(compact.files[1], 0);
 h.cache.beforeDelete = key => { if (key === failingPart) throw Error('SYNTHETIC chunk deletion denied'); };
 await assert.rejects(h.mod.removeLocalLanguageResources(compact.id), error => {
  assert.ok(error.message.length > 0);
  assert.equal(error.code, 'MODEL_REMOVAL_PARTIAL');
  assert.equal(error.removal?.complete, false);
  assert.equal(error.removal.removedMarkers, compact.files.length);
  const deletedParts = partKeys(compact).filter(key => !h.cache.values.has(key)).length;
  assert.ok(deletedParts > 0, 'This failure occurs after a successfully removed part');
  assert.equal(error.removal.removedParts, deletedParts);
  assertNoFreedByteClaim(error.removal);
  return true;
 });
 assert.ok(markerKeys(compact).every(key => !h.cache.values.has(key)));
 assert.equal(h.cache.values.has(failingPart), true);
 assert.equal((await h.mod.getLocalLanguageReadiness({profileId: compact.id})).installed, false);
});

test('a trial-proof persistence failure reports removed chunks without claiming complete removal', async t => {
 const h = await setup(t);
 const beforeTrials = h.local.getItem(h.mod.LOCAL_LANGUAGE_TRIAL_KEY);
 const set = h.local.setItem;
 h.local.setItem = (key, value) => {
  if (key === h.mod.LOCAL_LANGUAGE_TRIAL_KEY && value !== beforeTrials) throw Error('SYNTHETIC proof update failed');
  return set(key, value);
 };
 await assert.rejects(h.mod.removeLocalLanguageResources(candidate.id), error => {
  assert.equal(error.code, 'MODEL_REMOVAL_PARTIAL');
  assert.equal(error.removal?.complete, false);
  assert.equal(error.removal.removedParts, partKeys(candidate).length);
  assert.equal(error.removal.removedMarkers, candidate.files.length);
  assert.equal(error.removal.removedTrialProof, false);
  assertNoFreedByteClaim(error.removal);
  return true;
 });
 assert.ok(pinnedKeys(candidate).every(key => !h.cache.values.has(key)));
 assert.equal(h.local.getItem(h.mod.LOCAL_LANGUAGE_TRIAL_KEY), beforeTrials);
 assert.ok(pinnedKeys(compact).every(key => h.cache.values.has(key)));
});

test('an active model operation blocks removal of either profile without side effects', async t => {
 const h = await setup(t, {holdWorker: true});
 const controller = new AbortController();
 const pending = h.mod.generateLocalReply({profileId: compact.id, messages: [{role: 'user', content: 'SYNTHETIC check'}], signal: controller.signal});
 const rejected = assert.rejects(pending, error => error.name === 'AbortError');
 for (let i = 0; i < 100 && !h.workers.length; i++) await new Promise(resolve => setTimeout(resolve, 1));
 assert.equal(h.workers.length, 1);
 assert.equal(h.mod.getLocalLanguageOperation()?.type, 'generate');
 const localBefore = [...h.local.values];
 for (const profile of [compact, candidate]) {
  await assert.rejects(h.mod.removeLocalLanguageResources(profile.id), error => error.code === 'MODEL_BUSY');
 }
 assert.equal(h.deletions.length, 0);
 assert.deepEqual([...h.local.values], localBefore);
 assert.equal(h.workers[0].terminated, false);
 controller.abort();
 await rejected;
});

test('removing the selected experimental profile saves compact preference and unloads its idle worker first', async t => {
 const h = await setup(t);
 h.mod.setActiveLocalLanguageProfile(candidate.id);
 await h.mod.generateLocalReply({profileId: candidate.id, messages: [{role: 'user', content: 'SYNTHETIC check'}]});
 assert.equal(h.workers.length, 1);
 assert.equal(h.workers[0].terminated, false);
 assert.equal(h.mod.getLocalLanguageOperation(), null);
 h.cache.beforeDelete = () => {
  assert.equal(h.local.getItem(h.mod.LOCAL_LANGUAGE_PROFILE_KEY), 'compact');
  assert.equal(h.mod.getActiveLocalLanguageProfile().id, 'compact');
  assert.equal(h.workers[0].terminated, true);
 };
 const result = await h.mod.removeLocalLanguageResources(candidate.id);
 assert.equal(result.complete, true);
 assert.equal(result.activeProfileId, 'compact');
 assert.equal(h.mod.getActiveLocalLanguageProfile().id, 'compact');
 assert.equal((await h.mod.getLocalLanguageReadiness({profileId: candidate.id})).trialProof, null);
 assert.ok(pinnedKeys(compact).every(key => h.cache.values.has(key)));
});

test('removing an unselected profile preserves the other model idle worker and readiness', async t => {
 const h = await setup(t);
 await h.mod.generateLocalReply({profileId: compact.id, messages: [{role: 'user', content: 'SYNTHETIC check'}]});
 await h.mod.removeLocalLanguageResources(candidate.id);
 assert.equal(h.workers[0].terminated, false);
 const state = await h.mod.getLocalLanguageReadiness({profileId: compact.id});
 assert.equal(state.installed, true);
 assert.equal(state.loaded, true);
});

test('failure to save compact preference prevents any deletion of the selected experimental model', async t => {
 const h = await setup(t);
 h.mod.setActiveLocalLanguageProfile(candidate.id);
 const before = [...h.cache.values];
 const trialsBefore = h.local.getItem(h.mod.LOCAL_LANGUAGE_TRIAL_KEY);
 const set = h.local.setItem;
 h.local.setItem = (key, value) => {
  if (key === h.mod.LOCAL_LANGUAGE_PROFILE_KEY && value === 'compact') throw Error('SYNTHETIC preference write failed');
  return set(key, value);
 };
 await assert.rejects(h.mod.removeLocalLanguageResources(candidate.id), error => error.code === 'STORAGE_UNAVAILABLE');
 assert.equal(h.deletions.length, 0);
 assert.deepEqual([...h.cache.values], before);
 assert.equal(h.local.getItem(h.mod.LOCAL_LANGUAGE_TRIAL_KEY), trialsBefore);
 assert.equal(h.mod.getActiveLocalLanguageProfile().id, candidate.id);
});


test('failure to read the selected profile prevents deleting experimental files without a safe fallback', async t => {
 const h = await setup(t);h.mod.setActiveLocalLanguageProfile(candidate.id);
 const before = [...h.cache.values], get = h.local.getItem;
 h.local.getItem = key => {if (key === h.mod.LOCAL_LANGUAGE_PROFILE_KEY) throw Error('SYNTHETIC preference read failed');return get(key);};
 await assert.rejects(h.mod.removeLocalLanguageResources(candidate.id), error => error.code === 'STORAGE_UNAVAILABLE');
 assert.equal(h.deletions.length, 0);assert.deepEqual([...h.cache.values], before);
});
