// Separate opt-in reporting service. Never deploy over FINDR's live Site Worker.
const ORIGIN = 'https://appassets.androidplatform.net';
const MAX_BYTES = 40000;
const CATEGORIES = new Set(['unsafe', 'offensive', 'unsupported', 'other']);
const KEYS = new Set(['schemaVersion', 'id', 'category', 'description', 'answerExcerpt', 'appVersion', 'applicationId', 'consent']);

function json(body, status = 200, cors = false) {
  const headers = {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'};
  if (cors) Object.assign(headers, {'Access-Control-Allow-Origin': ORIGIN, 'Vary': 'Origin'});
  return new Response(JSON.stringify(body), {status, headers});
}

export function validateReport(body, applicationId) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !KEYS.has(k))) return null;
  if (body.schemaVersion !== 1 || body.consent !== true || body.applicationId !== applicationId ||
      !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/.test(applicationId || '') ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id || '') ||
      !CATEGORIES.has(body.category) || typeof body.description !== 'string' || typeof body.answerExcerpt !== 'string' ||
      typeof body.appVersion !== 'string' || !/^[0-9A-Za-z.+_-]{1,64}$/.test(body.appVersion)) return null;
  if (body.description.length > 4000 || body.answerExcerpt.length > 4000 || (!body.description.trim() && !body.answerExcerpt.trim())) return null;
  // Stable property order makes retries idempotent even if request key order changes.
  return {schemaVersion: 1, id: body.id.toLowerCase(), category: body.category, description: body.description.trim(),
    answerExcerpt: body.answerExcerpt.trim(), appVersion: body.appVersion, applicationId, consent: true};
}

async function readBody(request) {
  const length = Number(request.headers.get('Content-Length'));
  if (length > MAX_BYTES) throw Error('too-large');
  if (!request.body) throw Error('invalid-json');
  const reader = request.body.getReader(), chunks = []; let total = 0;
  try {
    while (true) {
      const {done, value} = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {await reader.cancel(); throw Error('too-large');}
      chunks.push(value);
    }
  } finally {reader.releaseLock();}
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) {bytes.set(chunk, offset); offset += chunk.byteLength;}
  return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
}

const configured = env => env.DB && typeof env.DB.prepare === 'function' && env.REPORT_RATE_LIMIT &&
  typeof env.REPORT_RATE_LIMIT.limit === 'function' && /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/.test(env.FINDR_APPLICATION_ID || '');

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    const allowed = request.headers.get('Origin') === ORIGIN;
    if (path === '/health' && request.method === 'GET') {
      if (!configured(env)) return json({ready: false}, 503);
      try {
        await env.DB.prepare('SELECT id FROM ai_reports LIMIT 1').first();
        return json({ready: true, applicationId: env.FINDR_APPLICATION_ID, schemaVersion: 1});
      } catch {return json({ready: false}, 503);}
    }
    if (path !== '/reports') return json({error: 'not-found'}, 404);
    if (!allowed) return json({error: 'origin-not-allowed'}, 403);
    if (request.method === 'OPTIONS') {
      const requestedMethod = request.headers.get('Access-Control-Request-Method');
      const requestedHeaders = (request.headers.get('Access-Control-Request-Headers') || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
      if (requestedMethod !== 'POST' || requestedHeaders.some(h => h !== 'content-type')) return json({error: 'preflight-not-allowed'}, 403, true);
      return new Response(null, {status: 204, headers: {'Access-Control-Allow-Origin': ORIGIN, 'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600', 'Vary': 'Origin', 'Cache-Control': 'no-store'}});
    }
    if (request.method !== 'POST') return json({error: 'method-not-allowed'}, 405, true);
    if (!configured(env)) return json({error: 'service-not-configured'}, 503, true);
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '')) return json({error: 'json-required'}, 415, true);
    try {
      // IP is used transiently by Cloudflare's per-location limiter, never saved in D1.
      const rate = await env.REPORT_RATE_LIMIT.limit({key: 'reports:' + (request.headers.get('CF-Connecting-IP') || 'unknown')});
      if (!rate.success) return json({error: 'rate-limited'}, 429, true);
    } catch {return json({error: 'service-unavailable'}, 503, true);}
    let body;
    try {body = await readBody(request);} catch (error) {return json({error: error.message === 'too-large' ? 'report-too-large' : 'invalid-json'}, error.message === 'too-large' ? 413 : 400, true);}
    const report = validateReport(body, env.FINDR_APPLICATION_ID);
    if (!report) return json({error: 'invalid-report'}, 400, true);
    try {
      const encoded = JSON.stringify(report);
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(encoded))), b => b.toString(16).padStart(2, '0')).join('');
      const now = Date.now();
      // Expire at 29 days; hourly cleanup leaves room inside the stated 30-day window.
      const expires = now + 29 * 24 * 60 * 60 * 1000;
      const db = env.DB.withSession ? env.DB.withSession('first-primary') : env.DB;
      const saved = await db.prepare('INSERT INTO ai_reports (id, payload, payload_sha256, created_at, expires_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING')
        .bind(report.id, encoded, hash, now, expires).run();
      if (saved.success === false) throw Error('write-failed');
      const stored = await db.prepare('SELECT payload_sha256 FROM ai_reports WHERE id = ?').bind(report.id).first();
      if (!stored) throw Error('write-not-confirmed');
      if (stored.payload_sha256 !== hash) return json({error: 'reference-conflict'}, 409, true);
      return json({accepted: true, id: report.id}, 200, true);
    } catch {
      // Do not log report bodies, names, jobs, excerpts or keys.
      return json({error: 'storage-unavailable'}, 503, true);
    }
  },
  async scheduled(_event, env, ctx) {
    // Let failures reach the platform's failed-invocation monitoring, without payload logs.
    ctx.waitUntil(env.DB.prepare('DELETE FROM ai_reports WHERE expires_at <= ?').bind(Date.now()).run().then(result => {
      if (result.success === false) throw Error('Report retention cleanup failed');
    }));
  },
};
