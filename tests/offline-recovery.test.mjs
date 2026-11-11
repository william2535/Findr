import assert from 'node:assert/strict';
import test from 'node:test';
import { repairRedirectedAppShells } from '../lib/offline-recovery.mjs';

const origin = 'https://findr.test';
const indexURL = `${origin}/app/index.html`;
const directoryURL = `${origin}/app/`;
const html = '<!doctype html><title>FINDR</title><p>My field kit</p>';

// Node's in-memory dispatcher creates a real Fetch Response with redirect
// history. It never opens a socket; Response.redirect() would not reproduce it.
async function redirectedResponse({
  finalURL = directoryURL,
  status = 200,
  statusText = 'OK',
  contentType = 'text/html; charset=utf-8',
  body = html,
} = {}) {
  const dispatcher = {
    dispatch(options, handler) {
      queueMicrotask(() => {
        handler.onConnect(() => {});
        if (options.path === '/fixture-redirect') {
          handler.onHeaders(302, ['location', finalURL], () => {}, 'Found');
          handler.onComplete([]);
          return;
        }
        handler.onHeaders(status, [
          'content-type', contentType,
          'content-language', 'en-GB',
          'cache-control', 'public, max-age=0',
          'x-fixture', 'preserve-me',
        ], () => {}, statusText);
        handler.onData(Buffer.from(body));
        handler.onComplete([]);
      });
      return true;
    },
  };
  return fetch(`${origin}/fixture-redirect`, { dispatcher });
}

function storageFixture(cacheEntries) {
  const entries = new Map(Object.entries(cacheEntries).map(([name, values]) => [name, new Map(values)]));
  const opened = [];
  const matched = [];
  const written = [];
  const cacheStorage = {
    async keys() { return [...entries.keys()]; },
    async open(name) {
      opened.push(name);
      const values = entries.get(name);
      assert.ok(values, 'Recovery must not create a new cache');
      return {
        async match(url) {
          matched.push([name, url]);
          return values.get(url)?.clone();
        },
        async put(url, response) {
          written.push([name, url]);
          values.set(url, response.clone());
        },
      };
    },
  };
  return { cacheStorage, entries, opened, matched, written };
}

test('repairs both legacy and canonical HTML entries without losing their contents or metadata', async () => {
  const response = await redirectedResponse({ status: 201, statusText: 'Created' });
  assert.equal(response.redirected, true);
  assert.equal(response.clone().redirected, true);
  const fixture = storageFixture({
    'findr-shell-old': [[indexURL, response.clone()], [directoryURL, response.clone()]],
  });

  assert.equal(await repairRedirectedAppShells({ cacheStorage: fixture.cacheStorage, origin }), 2);
  assert.equal(fixture.written.length, 2);
  for (const url of [indexURL, directoryURL]) {
    const repaired = fixture.entries.get('findr-shell-old').get(url);
    assert.equal(repaired.redirected, false, 'Old workers must now receive a navigation-safe Response');
    assert.equal(repaired.url, '');
    assert.equal(repaired.status, response.status);
    assert.equal(repaired.statusText, response.statusText);
    assert.deepEqual([...repaired.headers], [...response.headers]);
    assert.equal(await repaired.clone().text(), html);
  }
  assert.equal(await repairRedirectedAppShells({ cacheStorage: fixture.cacheStorage, origin }), 0);
  assert.equal(fixture.written.length, 2, 'A second visit must leave repaired entries alone');
});

test('repairs existing FINDR shell generations and leaves other caches and entries untouched', async () => {
  const response = await redirectedResponse();
  const pdf = new Response('saved PDF bytes', { headers: { 'content-type': 'application/pdf' } });
  const script = new Response('export const existing = true');
  const queryURL = `${indexURL}?preview=1`;
  const otherOriginURL = 'https://elsewhere.test/app/index.html';
  const unrelated = response.clone();
  const fixture = storageFixture({
    'findr-shell-previous': [[indexURL, response.clone()], [`${origin}/app/manual.pdf`, pdf]],
    'findr-shell-current': [
      [directoryURL, response.clone()],
      [`${origin}/app/app.mjs`, script],
      [queryURL, unrelated],
      [otherOriginURL, unrelated],
    ],
    'another-app-shell': [[indexURL, unrelated]],
    'findr-manuals': [[indexURL, unrelated]],
  });

  assert.equal(await repairRedirectedAppShells({ cacheStorage: fixture.cacheStorage, origin }), 2);
  assert.deepEqual(fixture.opened, ['findr-shell-previous', 'findr-shell-current']);
  assert.ok(fixture.matched.every(([, url]) => url === indexURL || url === directoryURL));
  assert.equal(fixture.entries.get('findr-shell-previous').get(`${origin}/app/manual.pdf`), pdf);
  assert.equal(fixture.entries.get('findr-shell-current').get(`${origin}/app/app.mjs`), script);
  assert.equal(fixture.entries.get('findr-shell-current').get(queryURL), unrelated);
  assert.equal(fixture.entries.get('findr-shell-current').get(otherOriginURL), unrelated);
  assert.equal(fixture.entries.get('another-app-shell').get(indexURL), unrelated);
  assert.equal(fixture.entries.get('findr-manuals').get(indexURL), unrelated);
});

for (const [label, makeResponse] of [
  ['HTML that has no redirect history', () => new Response(html, { headers: { 'content-type': 'text/html' } })],
  ['an unsuccessful HTML response', () => redirectedResponse({ status: 404, statusText: 'Not Found' })],
  ['a successful non-HTML response', () => redirectedResponse({ contentType: 'application/json', body: '{}' })],
  ['a response redirected to another origin', () => redirectedResponse({ finalURL: 'https://elsewhere.test/app/' })],
  ['a response redirected to another path', () => redirectedResponse({ finalURL: `${origin}/sign-in` })],
  ['a response redirected to a query-specific document', () => redirectedResponse({ finalURL: `${directoryURL}?preview=1` })],
]) {
  test(`leaves ${label} untouched`, async () => {
    const response = await makeResponse();
    const fixture = storageFixture({ 'findr-shell-old': [[indexURL, response]] });
    assert.equal(await repairRedirectedAppShells({ cacheStorage: fixture.cacheStorage, origin }), 0);
    assert.equal(fixture.written.length, 0);
    assert.equal(fixture.entries.get('findr-shell-old').get(indexURL), response);
  });
}

test('a fresh visit or unavailable CacheStorage needs no repair', async () => {
  assert.equal(await repairRedirectedAppShells({ origin }), 0);
  const fixture = storageFixture({});
  assert.equal(await repairRedirectedAppShells({ cacheStorage: fixture.cacheStorage, origin }), 0);
  assert.deepEqual(fixture.opened, []);
  assert.deepEqual(fixture.written, []);
});
