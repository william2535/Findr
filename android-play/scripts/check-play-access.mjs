// Runs inside GitHub Actions. Never return credentials, tokens or raw Google errors.
import { createPrivateKey, sign } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACKAGE = 'com.findr.play';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}/edits`;
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const NOTES = Object.freeze({
  missing_secret: 'Add GOOGLE_PLAY_SERVICE_ACCOUNT_JSON in this repository’s Actions secrets.',
  invalid_secret: 'The secret must contain the complete service-account JSON file, with a valid RSA private key.',
  authentication_failed: 'Google rejected the service-account credential. Check that its key is active and the JSON was copied intact.',
  api_disabled: 'Enable Google Play Android Developer API in the service account’s Google Cloud project.',
  permission_denied: 'In Play Console, grant this service account access to FINDR and testing releases. Allow time for permission changes to apply.',
  app_not_initialized: 'Google cannot find com.findr.play for this account. Check FINDR permissions and complete its first signed upload/setup in Play Console.',
  network_error: 'Google could not be reached. Retry the check; no release was committed.',
  rate_limited: 'Google temporarily limited requests. Retry later.',
  google_error: 'Google returned an unexpected response. No release was committed.',
  cleanup_failed: 'The temporary edit could not be deleted. Nothing was committed; it will expire. Avoid concurrent work with the same service account.',
});

class CheckError extends Error {
  constructor(code, status = null) { super(code); this.code = code; this.httpStatus = status; }
}

export function parseCredential(raw) {
  if (!raw?.trim()) throw new CheckError('missing_secret');
  try {
    if (raw.length > 65536) throw new Error();
    const value = JSON.parse(raw);
    if (value.type !== 'service_account' ||
        !/^[a-z0-9][a-z0-9.-]*@[a-z0-9.-]+\.iam\.gserviceaccount\.com$/.test(value.client_email) ||
        value.token_uri !== TOKEN_URL || typeof value.private_key !== 'string') throw new Error();
    const key = createPrivateKey(value.private_key);
    if (key.asymmetricKeyType !== 'rsa') throw new Error();
    return { email: value.client_email, key };
  } catch { throw new CheckError('invalid_secret'); }
}

export function assertion(credential, now = Date.now()) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const iat = Math.floor(now / 1000);
  const body = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
    iss: credential.email, scope: SCOPE, aud: TOKEN_URL, iat, exp: iat + 3600,
  })}`;
  return `${body}.${sign('RSA-SHA256', Buffer.from(body), credential.key).toString('base64url')}`;
}

export function classifyGoogleError(status, body, stage) {
  const reasons = [
    ...(Array.isArray(body?.error?.details) ? body.error.details.map(x => x?.reason) : []),
    ...(Array.isArray(body?.error?.errors) ? body.error.errors.map(x => x?.reason) : []),
  ];
  if (reasons.some(x => ['SERVICE_DISABLED', 'accessNotConfigured'].includes(x))) return 'api_disabled';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'google_error';
  if (stage === 'token' || status === 401) return 'authentication_failed';
  if (status === 403) return 'permission_denied';
  if (status === 404) return 'app_not_initialized';
  return 'google_error';
}

async function googleRequest(fetcher, url, options, stage) {
  let response;
  try {
    response = await fetcher(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(30000) });
  } catch { throw new CheckError('network_error'); }
  let body = null;
  try {
    const text = await response.text();
    if (text.length > 1024 * 1024) throw new Error();
    if (text) body = JSON.parse(text);
  } catch { throw new CheckError('google_error', response.status); }
  if (!response.ok) throw new CheckError(classifyGoogleError(response.status, body, stage), response.status);
  return body;
}

export function releaseSetup(env = {}) {
  const combinedSigning = env.PLAY_HAS_SIGNING_JSON === 'true';
  const checks = {
    FINDR_PLAY_KEYSTORE_BASE64: combinedSigning || env.PLAY_HAS_KEYSTORE === 'true',
    FINDR_PLAY_STORE_PASSWORD: combinedSigning || env.PLAY_HAS_STORE_PASSWORD === 'true',
    FINDR_PLAY_KEY_ALIAS: combinedSigning || env.PLAY_HAS_KEY_ALIAS === 'true',
    FINDR_PLAY_KEY_PASSWORD: combinedSigning || env.PLAY_HAS_KEY_PASSWORD === 'true',
    FINDR_PLAY_REPORT_URL: env.PLAY_HAS_REPORT_URL === 'true',
    FINDR_PLAY_READINESS_CONFIRMED: env.PLAY_READINESS_CONFIRMED === 'true',
  };
  return { combinedSigningSecretPresent: combinedSigning, missingSettings: Object.keys(checks).filter(key => !checks[key]),
    note: 'Presence only; signing identity, live reporting, device tests and first-release setup are checked separately.' };
}

export async function checkAccess(raw, { fetcher = fetch, now = Date.now() } = {}) {
  const result = { applicationId: PACKAGE, authenticated: false, editCreated: false,
    tracksReadable: false, temporaryEditDeleted: false, releaseCommitted: false, code: null, httpStatus: null };
  let token, editId;
  try {
    const credential = parseCredential(raw);
    const tokenBody = await googleRequest(fetcher, TOKEN_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: assertion(credential, now) }),
    }, 'token');
    if (!tokenBody?.access_token || typeof tokenBody.access_token !== 'string' || tokenBody.token_type?.toLowerCase() !== 'bearer')
      throw new CheckError('authentication_failed');
    token = tokenBody.access_token;
    result.authenticated = true;
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const edit = await googleRequest(fetcher, API, { method: 'POST', headers, body: '{}' }, 'edit');
    if (typeof edit?.id !== 'string' || !/^[a-zA-Z0-9_-]{1,200}$/.test(edit.id)) throw new CheckError('google_error');
    editId = edit.id;
    result.editCreated = true;
    const tracks = await googleRequest(fetcher, `${API}/${encodeURIComponent(editId)}/tracks`, { method: 'GET', headers }, 'tracks');
    if (!tracks || (tracks.tracks !== undefined && !Array.isArray(tracks.tracks))) throw new CheckError('google_error');
    result.tracksReadable = true;
    result.code = 'access_verified';
  } catch (error) {
    result.code = error instanceof CheckError ? error.code : 'google_error';
    result.httpStatus = error instanceof CheckError ? error.httpStatus : null;
  } finally {
    if (editId && token) {
      try {
        await googleRequest(fetcher, `${API}/${encodeURIComponent(editId)}`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
        }, 'cleanup');
        result.temporaryEditDeleted = true;
      } catch { result.cleanupWarning = 'cleanup_failed'; }
    }
  }
  result.nextStep = result.code === 'access_verified'
    ? 'Authentication and FINDR edit/track access verified. This does not verify release-write permissions or upload/sign the AAB.'
    : NOTES[result.code];
  if (result.cleanupWarning) result.cleanupNote = NOTES.cleanup_failed;
  return result;
}

async function main() {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  const result = await checkAccess(raw);
  result.releaseSetup = releaseSetup(process.env);
  // All fields are fixed strings, booleans or status codes. No exception/response/credential is logged.
  const output = JSON.stringify(result, null, 2);
  console.log(output);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `## FINDR Play access check\n\n\`\`\`json\n${output}\n\`\`\`\n\nNo bundle was uploaded and no release was committed.\n`);
  if (result.code !== 'access_verified' || result.cleanupWarning) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error('Play check failed without exposing credential details.'); process.exitCode = 1; });
}
