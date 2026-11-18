import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { assertion, checkAccess, classifyGoogleError, parseCredential, releaseSetup } from '../scripts/check-play-access.mjs';

// Synthetic key material is generated in memory; it cannot access any service.
const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const fixture = {
  type: 'service_account', client_email: 'findr-test@synthetic-project.iam.gserviceaccount.com',
  private_key: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }),
  token_uri: 'https://oauth2.googleapis.com/token',
};
const raw = JSON.stringify(fixture);
const okayToken = { access_token: 'synthetic-access-token-never-a-real-credential', token_type: 'Bearer' };
function mock(responses) {
  const calls = [];
  return { calls, fetcher: async (url, options) => {
    calls.push({ url, ...options });
    const next = responses.shift(); assert.ok(next, 'Unexpected network call');
    if (next instanceof Error) throw next;
    const [status, body] = next;
    return new Response(status === 204 ? null : JSON.stringify(body), { status });
  } };
}

test('missing and malformed secrets make no network request and return no raw credential', async () => {
  for (const value of [undefined, '', '{malformed private_key', JSON.stringify({ type: 'authorized_user' })]) {
    const m = mock([]), result = await checkAccess(value, m);
    assert.equal(m.calls.length, 0);
    assert.ok(['missing_secret', 'invalid_secret'].includes(result.code));
    assert.equal(result.authenticated, false);
    assert.equal(result.releaseCommitted, false);
    assert.ok(!JSON.stringify(result).includes('private_key'));
  }
});

test('untrusted token endpoints and non-RSA keys are rejected before network', async () => {
  const ec = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  for (const fields of [{ token_uri: 'https://example.invalid/collect' },
    { private_key: ec.privateKey.export({ type: 'pkcs8', format: 'pem' }) }, { client_email: 'bad\naddress' }]) {
    const m = mock([]), result = await checkAccess(JSON.stringify({ ...fixture, ...fields }), m);
    assert.equal(result.code, 'invalid_secret'); assert.equal(m.calls.length, 0);
  }
});

test('JWT has fixed Google audience/scope, bounded expiry and valid RSA signature', () => {
  const jwt = assertion(parseCredential(raw), 1700000000000), [header, body, signature] = jwt.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(header, 'base64url')), { alg: 'RS256', typ: 'JWT' });
  const payload = JSON.parse(Buffer.from(body, 'base64url'));
  assert.equal(payload.aud, 'https://oauth2.googleapis.com/token');
  assert.equal(payload.scope, 'https://www.googleapis.com/auth/androidpublisher');
  assert.equal(payload.exp - payload.iat, 3600);
  assert.equal(verify('RSA-SHA256', Buffer.from(`${header}.${body}`), pair.publicKey, Buffer.from(signature, 'base64url')), true);
});

test('successful access checks only the configured app and deletes its uncommitted edit', async () => {
  const m = mock([[200, okayToken], [200, { id: 'synthetic-edit' }], [200, { tracks: [] }], [204, null]]);
  const result = await checkAccess(raw, m);
  assert.equal(result.code, 'access_verified'); assert.equal(result.authenticated, true);
  assert.equal(result.tracksReadable, true); assert.equal(result.temporaryEditDeleted, true);
  assert.equal(result.releaseCommitted, false);
  assert.deepEqual(m.calls.map(x => x.method), ['POST', 'POST', 'GET', 'DELETE']);
  assert.ok(m.calls.slice(1).every(x => x.url.startsWith('https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.findr.play/edits')));
  assert.ok(m.calls.every(x => x.redirect === 'error' && x.signal));
  assert.ok(!m.calls.some(x => x.url.includes(':commit') || x.url.includes('/bundles')));
  const output = JSON.stringify(result);
  for (const sensitive of [fixture.client_email, fixture.private_key, okayToken.access_token, 'synthetic-edit']) assert.ok(!output.includes(sensitive));
});

test('Google rejection never emits the response body or credential-bearing errors', async () => {
  const m = mock([[400, { error: 'invalid_grant', error_description: raw }]]);
  const result = await checkAccess(raw, m);
  assert.equal(result.code, 'authentication_failed'); assert.equal(result.httpStatus, 400);
  assert.ok(!JSON.stringify(result).includes(fixture.client_email));
  assert.equal(m.calls.length, 1);
});

test('disabled API, denied permission and uninitialized app have distinct recoveries', async () => {
  for (const [status, body, code] of [
    [403, { error: { details: [{ reason: 'SERVICE_DISABLED' }] } }, 'api_disabled'],
    [403, { error: { status: 'PERMISSION_DENIED' } }, 'permission_denied'],
    [404, { error: { status: 'NOT_FOUND' } }, 'app_not_initialized'],
    [429, { error: {} }, 'rate_limited'],
  ]) {
    const m = mock([[200, okayToken], [status, body]]), result = await checkAccess(raw, m);
    assert.equal(result.authenticated, true); assert.equal(result.code, code);
    assert.equal(result.editCreated, false); assert.equal(m.calls.length, 2);
  }
});

test('failed track inspection still cleans up the created edit', async () => {
  const m = mock([[200, okayToken], [200, { id: 'cleanup-me' }], [403, {}], [204, null]]);
  const result = await checkAccess(raw, m);
  assert.equal(result.code, 'permission_denied'); assert.equal(result.temporaryEditDeleted, true);
  assert.equal(m.calls.at(-1).method, 'DELETE');
});

test('cleanup failure remains visible without raw server errors', async () => {
  const m = mock([[200, okayToken], [200, { id: 'temporary' }], [200, {}], [503, { private: raw }]]);
  const result = await checkAccess(raw, m);
  assert.equal(result.code, 'access_verified'); assert.equal(result.cleanupWarning, 'cleanup_failed');
  assert.equal(result.temporaryEditDeleted, false); assert.equal(result.releaseCommitted, false);
  assert.ok(!JSON.stringify(result).includes(fixture.client_email));
});

test('network exceptions and malformed edit identifiers cannot leak or redirect tokens', async () => {
  let m = mock([new Error(raw)]), result = await checkAccess(raw, m);
  assert.equal(result.code, 'network_error'); assert.ok(!JSON.stringify(result).includes(fixture.client_email));
  m = mock([[200, okayToken], [200, { id: '../../other-app' }]]); result = await checkAccess(raw, m);
  assert.equal(result.code, 'google_error'); assert.equal(m.calls.length, 2);
});

test('setup reporting accepts only presence flags, and never treats them as verified signing', () => {
  const state = releaseSetup({ PLAY_HAS_KEYSTORE: 'true', PLAY_HAS_KEY_PASSWORD: 'a secret value' });
  assert.ok(!state.missingSettings.includes('FINDR_PLAY_KEYSTORE_BASE64'));
  assert.ok(state.missingSettings.includes('FINDR_PLAY_KEY_PASSWORD'));
  assert.ok(!JSON.stringify(state).includes('a secret value'));
  assert.match(state.note, /Presence only/);
  assert.equal(classifyGoogleError(503, {}, 'token'), 'google_error');
  assert.equal(classifyGoogleError(403, { error: { errors: [{ reason: 'accessNotConfigured' }] } }, 'edit'), 'api_disabled');
});
