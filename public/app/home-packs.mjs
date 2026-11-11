const MAX_NUMBER = Number.MAX_SAFE_INTEGER;
const validKey = key => typeof key === 'string' && /^(?:pack|device-pack)\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(key);
const nonnegativeInteger = value => typeof value === 'number' && Number.isFinite(value)
  ? Math.min(MAX_NUMBER, Math.max(0, Math.floor(value))) : 0;

function cleanUsage(usage) {
  if (!usage || typeof usage !== 'object' || Array.isArray(usage)) return {};
  return Object.fromEntries(Object.entries(usage).filter(([key]) => validKey(key)).map(([key, value]) => [key, {
    count: nonnegativeInteger(value?.count),
    lastUsed: nonnegativeInteger(value?.lastUsed),
  }]));
}

/** Record a real pack visit without changing the stored input object. */
export function recordPackUse(usage, key, now = Date.now()) {
  const next = cleanUsage(usage);
  if (!validKey(key)) return next;
  next[key] = {
    count: Math.min(MAX_NUMBER, (next[key]?.count || 0) + 1),
    lastUsed: nonnegativeInteger(now),
  };
  return next;
}

/** Derive Home's pack lists from actual visits and PDFs saved on this device. */
export function buildHomePacks(panelPacks, devicePacks, records, saved, usage) {
  const recordMap = records instanceof Map ? records : new Map();
  const savedMap = saved instanceof Map ? saved : new Map();
  const visits = cleanUsage(usage);
  const entries = new Map();
  for (const [kind, packs] of [['pack', panelPacks], ['device-pack', devicePacks]]) {
    for (const pack of Array.isArray(packs) ? packs : []) {
      if (!pack || typeof pack.id !== 'string') continue;
      const key = `${kind}/${pack.id}`;
      if (!validKey(key) || entries.has(key)) continue;
      const ids = [...new Set(Array.isArray(pack.record_ids) ? pack.record_ids : [])]
        .filter(id => typeof id === 'string' && id.length > 0);
      const available = ids.filter(id => savedMap.has(id) || (
        typeof recordMap.get(id)?.url === 'string' && recordMap.get(id).url.trim().length > 0
      ));
      const savedIds = ids.filter(id => savedMap.has(id));
      entries.set(key, {
        pack, kind, key,
        savedCount: savedIds.length,
        totalCount: available.length,
        lastSaved: savedIds.reduce((latest, id) => Math.max(latest, nonnegativeInteger(savedMap.get(id)?.savedAt)), 0),
        count: visits[key]?.count || 0,
        lastUsed: visits[key]?.lastUsed || 0,
      });
    }
  }
  const byTitle = (a, b) => String(a.pack.title || '').localeCompare(String(b.pack.title || '')) || a.key.localeCompare(b.key);
  return {
    frequent: [...entries.values()].filter(entry => entry.count > 0)
      .sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed || byTitle(a, b)),
    downloaded: [...entries.values()].filter(entry => entry.savedCount > 0)
      .sort((a, b) => b.lastSaved - a.lastSaved || byTitle(a, b)),
  };
}
