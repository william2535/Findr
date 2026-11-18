import test from 'node:test';
import assert from 'node:assert/strict';
import worker, {validateReport} from '../worker.mjs';
import {makeReport, reportEndpoint, sendReport} from '../../web/play-report.mjs';

const ORIGIN = 'https://appassets.androidplatform.net';
const config = {applicationId: 'com.findr.play', versionName: '0.40.1', reportUrl: 'https://feedback.example.com/reports'};
const id = '3c21806a-63f6-4418-915a-c1fe37dd3eb7';
const body = () => makeReport(config, {category: 'unsafe', description: 'Synthetic test — do not act on this answer.', answerExcerpt: 'Synthetic answer', consent: true}, id);
function environment({failWrite = false, failRead = false, limit = true} = {}) {
  const rows = new Map(), state = {runs: 0, cleaned: false, rateKeys: []};
  const DB = {
    withSession() {return this;},
    prepare(sql) {
      return {args: [], bind(...args) {this.args = args; return this;},
        async run() {
          state.runs++;
          if (failWrite) throw Error('synthetic unavailable storage');
          if (sql.startsWith('INSERT')) {
            const [id, payload, payload_sha256, created_at, expires_at] = this.args;
            if (!rows.has(id)) rows.set(id, {payload, payload_sha256, created_at, expires_at});
          } else if (sql.startsWith('DELETE')) {
            state.cleaned = true;
            for (const [key, row] of rows) if (row.expires_at <= this.args[0]) rows.delete(key);
          }
          return {success: true};
        },
        async first() {
          if (failRead) throw Error('synthetic read failure');
          if (sql.includes('WHERE id =')) return rows.get(this.args[0]) || null;
          return rows.size ? {id: rows.keys().next().value} : null;
        },
      };
    },
  };
  return {DB, FINDR_APPLICATION_ID: config.applicationId,
    REPORT_RATE_LIMIT: {async limit({key}) {state.rateKeys.push(key); return {success: limit};}}, rows, state};
}
function request(data = body(), options = {}) {
  const {method = 'POST', origin = ORIGIN, path = '/reports', headers = {}} = options;
  return new Request('https://feedback.example.com' + path, {method,
    headers: {'Origin': origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.4', ...headers},
    ...(!['GET', 'HEAD'].includes(method) ? {body: typeof data === 'string' ? data : JSON.stringify(data)} : {})});
}

test('accepts only a reviewed bounded payload with the configured package', () => {
  assert.equal(validateReport(body(), config.applicationId).id, id);
  for (const edit of [{consent: false}, {job: 'hidden context'}, {apiKey: 'unexpected'}, {applicationId: 'com.other.app'},
    {category: 'unknown'}, {description: 'a'.repeat(4001)}, {id: 'not-a-uuid'}, {answerExcerpt: '' , description: ''}]) {
    assert.equal(validateReport({...body(), ...edit}, config.applicationId), null);
  }
});

test('writes once and retries the same reference without duplicate rows', async () => {
  const env = environment();
  for (let i = 0; i < 2; i++) {
    const response = await worker.fetch(request(), env);
    assert.equal(response.status, 200); assert.equal(response.headers.get('Access-Control-Allow-Origin'), ORIGIN);
    assert.deepEqual(await response.json(), {accepted: true, id});
  }
  assert.equal(env.rows.size, 1);
  assert.equal(JSON.parse(env.rows.get(id).payload).description, body().description);
  assert(!env.rows.get(id).payload.includes('192.0.2.4'));
});

test('same reference with different content cannot overwrite the original', async () => {
  const env = environment(); await worker.fetch(request(), env);
  const response = await worker.fetch(request({...body(), description: 'Changed text'}), env);
  assert.equal(response.status, 409);
  assert.equal(JSON.parse(env.rows.get(id).payload).description, body().description);
});

test('storage failures never return accepted and expose no exception details', async () => {
  for (const env of [environment({failWrite: true}), environment({failRead: true})]) {
    const response = await worker.fetch(request(), env);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {error: 'storage-unavailable'});
  }
});

test('rejects other origins, non-JSON, oversized input and malformed JSON', async () => {
  for (const [req, status] of [
    [request(body(), {origin: 'https://other.example'}), 403],
    [request(body(), {headers: {'Content-Type': 'text/plain'}}), 415],
    [request('x'.repeat(40001)), 413],
    [request('{'), 400],
  ]) {
    const env = environment(), response = await worker.fetch(req, env);
    assert.equal(response.status, status); assert.equal(env.rows.size, 0);
  }
});

test('preflight permits only JSON POST; GET cannot read reports', async () => {
  let response = await worker.fetch(request('', {method: 'OPTIONS', headers: {'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type'}}), environment());
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  response = await worker.fetch(request('', {method: 'OPTIONS', headers: {'Access-Control-Request-Method': 'GET'}}), environment());
  assert.equal(response.status, 403);
  response = await worker.fetch(request(null, {method: 'GET'}), environment());
  assert.equal(response.status, 405);
});

test('missing binding and rate rejection are visible, never accepted', async () => {
  assert.equal((await worker.fetch(request(), {...environment(), REPORT_RATE_LIMIT: null})).status, 503);
  const env = environment({limit: false});
  assert.equal((await worker.fetch(request(), env)).status, 429); assert.equal(env.rows.size, 0);
});

test('health checks the actual table and configured package', async () => {
  const req = () => request(null, {method: 'GET', path: '/health'});
  const response = await worker.fetch(req(), environment());
  assert.deepEqual(await response.json(), {ready: true, applicationId: config.applicationId, schemaVersion: 1});
  assert.equal((await worker.fetch(req(), environment({failRead: true}))).status, 503);
  assert.equal((await worker.fetch(req(), {})).status, 503);
});

test('scheduled cleanup removes expired reports without touching current ones', async () => {
  const env = environment(); await worker.fetch(request(), env);
  env.rows.set('expired', {expires_at: Date.now() - 1});
  const tasks = []; await worker.scheduled({}, env, {waitUntil: p => tasks.push(p)}); await Promise.all(tasks);
  assert.equal(env.rows.has('expired'), false); assert.equal(env.rows.has(id), true); assert.equal(env.state.cleaned, true);
});

test('client only sends explicit reviewed fields and accepts an exact confirmed reference', async () => {
  const fields = {...body(), job: 'not transmitted', apiKey: 'not transmitted'};
  const payload = makeReport(config, fields, id);
  assert.equal(Object.hasOwn(payload, 'job'), false); assert.equal(Object.hasOwn(payload, 'apiKey'), false);
  const result = await sendReport(config, payload, {fetcher: async (url, options) => {
    assert.equal(url, config.reportUrl); assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error');
    assert.deepEqual(JSON.parse(options.body), payload);
    return new Response(JSON.stringify({accepted: true, id}), {status: 200});
  }});
  assert.equal(result.id, id);
  await assert.rejects(sendReport(config, payload, {fetcher: async () => new Response(JSON.stringify({accepted: true, id: 'other'}))}), /could not confirm/);
  await assert.rejects(sendReport(config, payload, {fetcher: async () => new Response('{}', {status: 503})}), /could not confirm/);
});

test('client does not fake success without a configured endpoint', async () => {
  for (const url of ['', 'http://example.com/reports', 'https://u:p@example.com/reports', 'https://example.com/reports?key=x', 'https://example.com/else']) assert.equal(reportEndpoint(url), null);
  let called = false;
  await assert.rejects(sendReport({...config, reportUrl: ''}, body(), {fetcher: async () => {called = true;}}), /not configured/);
  assert.equal(called, false);
  assert.throws(() => makeReport(config, {...body(), consent: false}), /Confirm/);
});
