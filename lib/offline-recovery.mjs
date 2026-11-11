/**
 * Repair the two FINDR document cache entries that older workers may have
 * stored after an index.html redirect. No other cache entry or device store
 * is accessed.
 *
 * @param {{cacheStorage?: CacheStorage, origin: string, ResponseImpl?: typeof Response}} options
 * @returns {Promise<number>} Number of document entries repaired.
 */
export async function repairRedirectedAppShells({ cacheStorage, origin, ResponseImpl = Response }) {
  if (!cacheStorage) return 0;

  const base = new URL(origin).origin;
  const documentURLs = new Set([
    new URL('/app/index.html', base).href,
    new URL('/app/', base).href,
  ]);
  let repaired = 0;

  for (const name of await cacheStorage.keys()) {
    if (!name.startsWith('findr-shell-')) continue;
    const cache = await cacheStorage.open(name);

    for (const url of documentURLs) {
      const response = await cache.match(url);
      if (!response?.ok || !response.redirected) continue;
      if (!documentURLs.has(response.url)) continue;
      const contentType = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
      if (contentType !== 'text/html') continue;

      // A fresh Response keeps the document while removing the redirect
      // history that Safari rejects when the old worker serves a navigation.
      await cache.put(url, new ResponseImpl(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      }));
      repaired += 1;
    }
  }

  return repaired;
}
