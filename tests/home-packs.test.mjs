import test from 'node:test';
import assert from 'node:assert/strict';
import {buildHomePacks, recordPackUse} from '../public/app/home-packs.mjs';

const pack = (id, title, record_ids = []) => ({id, title, record_ids});

test('download progress counts unique downloadable or saved documents, including partial and full packs', () => {
  const panels = [pack('partial', 'Partial', ['a', 'a', 'b', 'landing', 'missing']), pack('full', 'Full', ['a', 'saved-only']), pack('pictures', 'Pictures')];
  const records = new Map([['a', {url: '/a.pdf'}], ['b', {url: '/b.pdf'}], ['landing', {url: null}]]);
  const saved = new Map([['a', {savedAt: 10}], ['saved-only', {savedAt: 20}]]);
  const result = buildHomePacks(panels, [], records, saved, {});
  assert.deepEqual(result.downloaded.map(({key, savedCount, totalCount, lastSaved}) => ({key, savedCount, totalCount, lastSaved})), [
    {key: 'pack/full', savedCount: 2, totalCount: 2, lastSaved: 20},
    {key: 'pack/partial', savedCount: 1, totalCount: 2, lastSaved: 10},
  ]);
  assert.deepEqual(result.frequent, []);
});

test('panel and device packs with the same ID have separate usage and identity', () => {
  const panels = [pack('shared', 'Panel', ['a'])];
  const devices = [pack('shared', 'Device', ['b'])];
  const usage = {'pack/shared': {count: 2, lastUsed: 10}, 'device-pack/shared': {count: 5, lastUsed: 20}};
  const result = buildHomePacks(panels, devices, new Map(), new Map([['b', {savedAt: 30}]]), usage);
  assert.deepEqual(result.frequent.map(({key, kind, count}) => ({key, kind, count})), [
    {key: 'device-pack/shared', kind: 'device-pack', count: 5},
    {key: 'pack/shared', kind: 'pack', count: 2},
  ]);
  assert.equal(result.frequent[0].pack, devices[0]);
  assert.deepEqual(result.downloaded.map(entry => entry.key), ['device-pack/shared']);
});

test('frequent ordering uses actual count, last visit, then title; downloaded ties use title', () => {
  const panels = [pack('z', 'Zulu', ['a']), pack('b', 'Bravo', ['a']), pack('a', 'Alpha', ['a']), pack('recent', 'Recent', ['a']), pack('never', 'Never')];
  const usage = {'pack/z': {count: 3, lastUsed: 1}, 'pack/b': {count: 2, lastUsed: 20}, 'pack/a': {count: 2, lastUsed: 20}, 'pack/recent': {count: 2, lastUsed: 30}, 'pack/never': {count: 0, lastUsed: 99}};
  const result = buildHomePacks(panels, [], new Map(), new Map([['a', {savedAt: 5}]]), usage);
  assert.deepEqual(result.frequent.map(entry => entry.key), ['pack/z', 'pack/recent', 'pack/a', 'pack/b']);
  assert.deepEqual(result.downloaded.map(entry => entry.key), ['pack/a', 'pack/b', 'pack/recent', 'pack/z']);
});

test('corrupt usage and input collections do not invent visits or throw', () => {
  const panels = [pack('a', 'Alpha', ['a', null]), null, pack('b', 'Bravo'), pack('c', 'Charlie')];
  const usage = Object.assign(Object.create({'pack/c': {count: 99}}), {'pack/a': {count: Infinity, lastUsed: '20'}, 'pack/b': {count: -3, lastUsed: NaN}});
  const result = buildHomePacks(panels, null, null, new Map([['a', {savedAt: 'yesterday'}]]), usage);
  assert.deepEqual(result.frequent, []);
  assert.equal(result.downloaded[0].lastSaved, 0);
  assert.deepEqual(buildHomePacks(null, undefined, null, null, []), {frequent: [], downloaded: []});
});

test('recordPackUse is immutable, validates keys and sanitizes malformed numbers', () => {
  const original = Object.freeze({'pack/a': Object.freeze({count: 2, lastUsed: 5})});
  const next = recordPackUse(original, 'pack/a', 20);
  assert.deepEqual(next, {'pack/a': {count: 3, lastUsed: 20}});
  assert.deepEqual(original, {'pack/a': {count: 2, lastUsed: 5}});
  assert.notEqual(next['pack/a'], original['pack/a']);
  for (const key of ['', 'pack/', '#pack/a', 'pack/a/extra', '__proto__', null]) {
    assert.deepEqual(recordPackUse(null, key, 10), {});
  }
  assert.deepEqual(recordPackUse({'pack/a': {count: -1, lastUsed: Infinity}}, 'pack/a', NaN), {'pack/a': {count: 1, lastUsed: 0}});
  assert.deepEqual(recordPackUse({'pack/a': {count: 2.9, lastUsed: 1}}, 'pack/a', 20.9), {'pack/a': {count: 3, lastUsed: 20}});
  assert.equal(recordPackUse({'pack/a': {count: Number.MAX_SAFE_INTEGER}}, 'pack/a', 10)['pack/a'].count, Number.MAX_SAFE_INTEGER);
  assert.deepEqual(recordPackUse([], 'device-pack/a', 10), {'device-pack/a': {count: 1, lastUsed: 10}});
});
