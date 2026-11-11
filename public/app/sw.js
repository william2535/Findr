importScripts('./precache.js');

const PREFIX = 'findr-shell-';
const CACHE = PREFIX + self.__BUILD;
const SCOPE = self.registration.scope;
const HOME = new URL('./index.html', SCOPE).href;
const ASSETS = self.__PRECACHE.map(path => new URL(path, SCOPE).href);
const allowed = new Set(ASSETS);
const hashes = new Map(self.__PRECACHE.map(path => [new URL(path, SCOPE).href, self.__ASSET_SHA256?.[path]]));
const relativeNames = new Map(self.__PRECACHE.map(path => [new URL(path, SCOPE).href, path]));
const READY_KEY = new URL('./offline-verified.json', SCOPE).href;
const READY_STAMP = JSON.stringify({format: 'sha256-v1', build: self.__BUILD, version: self.__APP_VERSION,
  assets: self.__PRECACHE.map(path => [path, self.__ASSET_SHA256?.[path]])});
const ASSET_TIMEOUT_MS = 15000;

function assetError(key, code, message) {
  const error = new Error(message);
  error.asset = relativeNames.get(key) || './precache.js';
  error.code = code;
  return error;
}

function requireManifest() {
  if (!self.crypto?.subtle || allowed.size !== ASSETS.length ||
      !self.__ASSET_SHA256 || Object.keys(self.__ASSET_SHA256).length !== ASSETS.length ||
      ASSETS.some(key => !key.startsWith(SCOPE) || !/^[a-f0-9]{64}$/.test(hashes.get(key) || ''))) {
    throw assetError(null, 'invalid_manifest', 'The offline asset verification manifest is missing or invalid.');
  }
}

// The deadline covers response headers, body consumption, hashing and writing.
// Aborting fetch alone would not bound a stalled CacheStorage operation.
async function boundedAsset(key, operation) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(() => operation(controller.signal)),
      new Promise((_, reject) => { timer = setTimeout(() => {
        controller.abort();
        reject(assetError(key, 'asset_timeout', 'The offline asset took too long to load.'));
      }, ASSET_TIMEOUT_MS); }),
    ]);
  } catch (error) {
    controller.abort();
    if (error?.asset) throw error;
    throw assetError(key, 'asset_failed', 'The offline asset could not be loaded.');
  } finally {
    clearTimeout(timer);
  }
}

function checkSignal(signal, key) {
  if (signal.aborted) throw assetError(key, 'asset_timeout', 'The offline asset took too long to load.');
}

function assetKey(input) {
  const url = new URL(input, SCOPE);
  url.search = '';
  url.hash = '';
  return url.href === SCOPE ? HOME : url.href;
}

// Safari rejects a navigation response that retains a followed redirect.
// Reconstruct approved same-asset responses at both storage and delivery time:
// older installations may already have redirected HTML in their cache.
function cleanResponse(response, key) {
  if (!response.redirected) return response;
  if (!response.ok || assetKey(response.url) !== key) {
    throw new Error('Unexpected redirect while loading an offline app asset');
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

async function checkedResponse(response, key, signal) {
  checkSignal(signal, key);
  if (!response?.ok) throw assetError(key, 'asset_http', 'The offline asset returned an unsuccessful response.');
  let clean;
  try { clean = cleanResponse(response, key); }
  catch { throw assetError(key, 'asset_redirect', 'The offline asset redirected to an unexpected address.'); }
  const body = await clean.arrayBuffer();
  checkSignal(signal, key);
  const digest = Array.from(new Uint8Array(await self.crypto.subtle.digest('SHA-256', body)),
    value => value.toString(16).padStart(2, '0')).join('');
  checkSignal(signal, key);
  if (digest !== hashes.get(key)) {
    throw assetError(key, 'asset_integrity', 'The offline asset does not match this FINDR release.');
  }
  // Fetch exposes decoded bytes. Do not retain compressed-body size/encoding
  // headers on the new response; preserve content type and other metadata.
  const headers = new Headers(clean.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  return new Response(body, {status: clean.status, statusText: clean.statusText, headers});
}

async function matchingCachedResponse(cache, key, signal) {
  const response = await cache.match(key);
  if (!response) return null;
  try { return await checkedResponse(response, key, signal); }
  catch (error) {
    if (['asset_integrity', 'asset_http', 'asset_redirect'].includes(error.code)) return null;
    throw error;
  }
}

async function loadVerifiedAsset(cache, previousCaches, key) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await boundedAsset(key, async signal => {
        const current = await matchingCachedResponse(cache, key, signal);
        if (current) {
          // Also repairs any same-build legacy response with redirect history.
          await cache.put(key, current.clone());
          return current;
        }
        for (const previous of previousCaches) {
          const reusable = await matchingCachedResponse(previous, key, signal);
          if (reusable) {
            checkSignal(signal, key);
            await cache.put(key, reusable.clone());
            return reusable;
          }
        }
        // Each build gets a separate network URL, preventing a successful but
        // stale CDN/browser response from silently creating a mixed release.
        const url = new URL(key === HOME ? SCOPE : key);
        url.searchParams.set('findr_build', self.__BUILD);
        const response = await fetch(new Request(url, {cache: 'reload', redirect: 'follow', signal}));
        const verified = await checkedResponse(response, key, signal);
        checkSignal(signal, key);
        await cache.put(key, verified.clone());
        return verified;
      });
    } catch (error) { lastError = error; }
  }
  throw lastError;
}

async function cacheIsVerified(cache) {
  const stamp = await cache.match(READY_KEY);
  if (!stamp || await stamp.text() !== READY_STAMP) return false;
  const keys = new Set((await cache.keys()).map(request => request.url));
  return ASSETS.every(url => keys.has(url));
}

async function broadcast(message) {
  for (const client of await self.clients.matchAll({includeUncontrolled: true})) {
    client.postMessage(message);
  }
}

self.addEventListener('install', event => event.waitUntil((async () => {
  let cursor = 0;
  let completed = 0;
  let stopped = false;
  try {
    requireManifest();
    const cache = await caches.open(CACHE);
    await boundedAsset(null, () => cache.delete(READY_KEY));
    const previousCaches = await Promise.all((await caches.keys())
      .filter(name => name.startsWith(PREFIX) && name !== CACHE).reverse().map(name => caches.open(name)));
    await Promise.all(Array.from({length: 6}, async () => {
      while (!stopped && cursor < ASSETS.length) {
        const key = ASSETS[cursor++];
        await loadVerifiedAsset(cache, previousCaches, key);
        if (stopped) return;
        completed++;
        if (completed % 12 === 0 || completed === ASSETS.length) {
          await broadcast({type: 'OFFLINE_PROGRESS', completed, total: ASSETS.length});
        }
      }
    }));
    await boundedAsset(null, () => cache.put(READY_KEY, new Response(READY_STAMP, {headers: {'content-type': 'application/json'}})));
    await self.skipWaiting();
  } catch (error) {
    stopped = true;
    await broadcast({type: 'OFFLINE_ERROR', asset: error.asset || './precache.js',
      code: error.code || 'asset_failed', message: error.message});
    throw error;
  }
})()));

self.addEventListener('activate', event => event.waitUntil((async () => {
  requireManifest();
  if (!await boundedAsset(null, async () => cacheIsVerified(await caches.open(CACHE)))) {
    throw assetError(null, 'cache_unverified', 'The offline release has not completed verification.');
  }
  for (const name of await caches.keys()) {
    if (name.startsWith(PREFIX) && name !== CACHE) await caches.delete(name);
  }
  await self.clients.claim();
})()));

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const key = assetKey(url.href);
  if (!allowed.has(key)) return;
  event.respondWith((async () => {
    requireManifest();
    // Cached and network fallback responses both prove their bytes before use.
    return loadVerifiedAsset(await caches.open(CACHE), [], key);
  })());
});

self.addEventListener('message', event => {
  const activate = event.data?.type === 'ACTIVATE_UPDATE';
  if ((!activate && event.data?.type !== 'CHECK_OFFLINE') || !event.ports?.[0]) return;
  event.waitUntil((async () => {
    let ready = false, error, message;
    try {
      if (activate && (typeof event.data.expectedVersion !== 'string' || event.data.expectedVersion !== self.__APP_VERSION)) {
        throw assetError(null, 'version_mismatch', 'The waiting update does not match the requested app version.');
      }
      requireManifest();
      ready = await boundedAsset(null, async () => cacheIsVerified(await caches.open(CACHE)));
      if (activate) {
        if (!ready) throw assetError(null, 'cache_unverified', 'The offline release has not completed verification.');
        // An installed worker may still be waiting after its original install
        // request. Only request activation for this exact, verified release.
        // Verification can finish before the browser releases the old worker.
        // Report that state without claiming activation has been accepted.
        event.ports[0].postMessage({phase: 'verified_waiting', ready: true,
          build: self.__BUILD, version: self.__APP_VERSION, verification: 'sha256-v1'});
        // Await acceptance so a rejected skipWaiting never receives success.
        try { await self.skipWaiting(); }
        catch { throw assetError(null, 'activation_failed', 'The browser could not activate the verified app update.'); }
      }
    } catch (failure) {
      ready = false;
      error = failure.code || 'cache_unverified';
      message = failure.message || 'The offline release could not be verified.';
    }
    event.ports[0].postMessage({ready, build: self.__BUILD, version: self.__APP_VERSION,
      verification: 'sha256-v1', ...(activate ? {accepted: ready} : {}),
      ...(error ? {error, ...(activate ? {message} : {})} : {})});
  })());
});
