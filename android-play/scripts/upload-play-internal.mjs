// Explicitly uploads one verified AAB as an INTERNAL DRAFT. Never rolls out to testers.
import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertion, classifyGoogleError, parseCredential, PACKAGE } from './check-play-access.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const EDITS = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}/edits`;
const UPLOAD = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PACKAGE}/edits`;
const PREVIEW_CERT = '6075a73725dac5a3cc1f7b6b32c5e1df907cd1ca4b5b611f4c1c1d2fd502fefd';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
class UploadError extends Error {
  constructor(code, status = null, uncertain = false) { super(code); this.code = code; this.httpStatus = status; this.uncertain = uncertain; }
}
const requireValue = (condition, code) => { if (!condition) throw new UploadError(code); };

export function releaseProperties(text) {
  return Object.fromEntries(text.split(/\r?\n/).filter(x => x.trim() && !x.trimStart().startsWith('#'))
    .map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
}

export function verifyUploadInput(bytes, report, expected, readinessConfirmed) {
  requireValue(Buffer.isBuffer(bytes) && bytes.length > 0, 'invalid_bundle');
  const version = Number(expected.versionCode);
  requireValue(expected.applicationId === PACKAGE && Number.isSafeInteger(version) && version > 0 && version <= 2100000000,
    'invalid_release_identity');
  const productionReady = report?.uploadableBuildChecksPassed === true && report.releaseConfigurationReady === true && report.reviewOnly !== true;
  const reviewDraft = report?.draftUploadChecksPassed === true && report.reviewOnly === true && report.releaseConfigurationReady === false;
  requireValue((productionReady || reviewDraft) && report.bundletoolValidated === true &&
    report.signature?.status === 'signed' && report.signature.verified === true, 'bundle_not_release_verified');
  if (productionReady) requireValue(readinessConfirmed === 'yes', 'readiness_not_confirmed');
  requireValue(report.manifest?.applicationId === PACKAGE && report.manifest.versionCode === version &&
    report.manifest.versionName === expected.versionName && report.manifest.debuggable === false,
    'bundle_identity_mismatch');
  requireValue(typeof expected.uploadCertificateSha256 === 'string' && /^[a-f0-9]{64}$/.test(expected.uploadCertificateSha256) &&
    expected.uploadCertificateSha256 !== PREVIEW_CERT && Array.isArray(report.signature.certificateSha256) &&
    report.signature.certificateSha256.length === 1 && report.signature.certificateSha256[0] === expected.uploadCertificateSha256,
    'invalid_signing_identity');
  requireValue(report.bytes === bytes.length && /^[a-f0-9]{64}$/.test(report.sha256) && report.sha256 === hash(bytes),
    'bundle_checksum_mismatch');
  requireValue(typeof expected.versionName === 'string' && expected.versionName.length > 0 && expected.versionName.length < 100,
    'invalid_release_identity');
  return { applicationId: PACKAGE, versionCode: version, versionName: expected.versionName, sha256: report.sha256, bytes: bytes.length,
    reviewOnly: reviewDraft, distributionReady: productionReady };
}

async function request(fetcher, url, options, stage) {
  let response;
  try {
    response = await fetcher(url, { ...options, redirect: 'error',
      signal: AbortSignal.timeout(stage === 'upload' ? 600000 : 30000) });
  } catch { throw new UploadError('network_error', null, true); }
  let body = null;
  try {
    const text = await response.text();
    if (text.length > 2 * 1024 * 1024) throw new Error();
    if (text) body = JSON.parse(text);
  } catch { throw new UploadError('invalid_google_response', response.status, response.ok || response.status >= 500); }
  if (!response.ok) {
    const reviewBlocked = stage === 'commit' && response.status === 400 && Array.isArray(body?.error?.details) &&
      body.error.details.some(detail => detail?.reason === 'CHANGES_ALREADY_IN_REVIEW');
    throw new UploadError(reviewBlocked ? 'review_in_progress' : classifyGoogleError(response.status, body, stage), response.status, response.status >= 500);
  }
  return body;
}

function validEdit(edit) {
  requireValue(typeof edit?.id === 'string' && /^[a-zA-Z0-9_-]{1,200}$/.test(edit.id), 'invalid_google_response');
  return edit.id;
}
function collection(body, name) {
  requireValue(body && (body[name] === undefined || Array.isArray(body[name])), 'invalid_google_response');
  return body[name] ?? [];
}
function internalRelease(tracks, metadata, bundles, apks) {
  const version = String(metadata.versionCode);
  requireValue(tracks.every(t => t && (t.releases === undefined || Array.isArray(t.releases)) &&
    (t.releases ?? []).every(r => r && Array.isArray(r.versionCodes))), 'invalid_google_response');
  const internal = tracks.find(t => t.track === 'internal');
  const releases = internal?.releases ?? [];
  requireValue(Array.isArray(releases) && !releases.some(r => r.status === 'draft'), 'existing_internal_draft');
  const versions = [...bundles, ...apks].map(x => String(x.versionCode)).concat(
    tracks.flatMap(t => (t.releases ?? []).flatMap(r => r.versionCodes.map(String))));
  requireValue(!versions.includes(version), 'version_already_exists');
  requireValue(!versions.some(x => Number(x) >= metadata.versionCode), 'version_not_newer');
  // Retain existing internal releases exactly. No other track is ever updated.
  return { track: 'internal', releases: [...releases,
    { name: metadata.versionName, versionCodes: [version], status: 'draft' }] };
}
function normalized(value, key = '') {
  if (Array.isArray(value)) {
    const items = value.map(x => normalized(x));
    return key === 'versionCodes' ? items.map(String).sort() : items;
  }
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, normalized(value[k], k)]));
  return value;
}
function trackMatches(track, desired) {
  if (track?.track !== 'internal' || !Array.isArray(track.releases) || track.releases.length !== desired.releases.length) return false;
  // Google may emit explicit protocol defaults that were absent from the request.
  const fingerprints = list => list.map(r => JSON.stringify(normalized({ inAppUpdatePriority: 0, releaseNotes: [], ...r }))).sort();
  return JSON.stringify(fingerprints(track.releases)) === JSON.stringify(fingerprints(desired.releases));
}

export async function uploadInternalDraft({ bytes, report, expected, rawCredential, readinessConfirmed },
  { fetcher = fetch, now = Date.now() } = {}) {
  const result = { applicationId: PACKAGE, track: 'internal', releaseStatus: 'draft',
    authenticated: false, uploadAttempted: false, uploadVerified: false, draftStaged: false,
    editValidated: false, commitAttempted: false, committed: false, readbackVerified: false,
    temporaryEditDeleted: false, manualReconciliationRequired: false, code: null, httpStatus: null };
  let editId, readbackId, headers, phase = 'preflight', commitUncertain = false;
  const clean = async id => request(fetcher, `${EDITS}/${encodeURIComponent(id)}`, { method: 'DELETE', headers }, 'cleanup');
  try {
    const metadata = verifyUploadInput(bytes, report, expected, readinessConfirmed);
    Object.assign(result, { versionCode: metadata.versionCode, versionName: metadata.versionName, sha256: metadata.sha256,
      reviewOnly: metadata.reviewOnly, distributionReady: metadata.distributionReady });
    const credential = parseCredential(rawCredential);
    phase = 'token';
    const token = await request(fetcher, TOKEN_URL, { method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: assertion(credential, now) }),
    }, phase);
    requireValue(typeof token?.access_token === 'string' && token.access_token.length > 0 &&
      typeof token.token_type === 'string' && token.token_type.toLowerCase() === 'bearer', 'authentication_failed');
    headers = { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' };
    result.authenticated = true;
    phase = 'create_edit';
    editId = validEdit(await request(fetcher, EDITS, { method: 'POST', headers, body: '{}' }, phase));
    const edit = `${EDITS}/${encodeURIComponent(editId)}`;
    phase = 'inspect';
    const tracks = collection(await request(fetcher, `${edit}/tracks`, { method: 'GET', headers }, phase), 'tracks');
    const bundles = collection(await request(fetcher, `${edit}/bundles`, { method: 'GET', headers }, phase), 'bundles');
    const apks = collection(await request(fetcher, `${edit}/apks`, { method: 'GET', headers }, phase), 'apks');
    const desiredTrack = internalRelease(tracks, metadata, bundles, apks);
    phase = 'upload';
    result.uploadAttempted = true;
    const uploaded = await request(fetcher, `${UPLOAD}/${encodeURIComponent(editId)}/bundles?uploadType=media`, {
      method: 'POST', headers: { Authorization: headers.Authorization, 'Content-Type': 'application/octet-stream' }, body: bytes,
    }, phase);
    requireValue(uploaded?.versionCode === metadata.versionCode && uploaded.sha256 === metadata.sha256, 'uploaded_bundle_mismatch');
    result.uploadVerified = true;
    phase = 'stage';
    const staged = await request(fetcher, `${edit}/tracks/internal`, {
      method: 'PUT', headers, body: JSON.stringify(desiredTrack),
    }, phase);
    requireValue(trackMatches(staged, desiredTrack), 'draft_response_mismatch');
    result.draftStaged = true;
    phase = 'validate';
    requireValue(validEdit(await request(fetcher, `${edit}:validate`, { method: 'POST', headers }, phase)) === editId, 'validation_response_mismatch');
    result.editValidated = true;
    phase = 'commit';
    result.commitAttempted = true;
    // Explicitly refuse cancellation of an existing review. Never retry with weaker parameters.
    const committed = await request(fetcher,
      `${edit}:commit?changesNotSentForReview=true&changesInReviewBehavior=ERROR_IF_IN_REVIEW`, { method: 'POST', headers }, phase);
    if (committed?.id !== editId) throw new UploadError('invalid_google_response', null, true);
    result.committed = true;
    phase = 'readback';
    readbackId = validEdit(await request(fetcher, EDITS, { method: 'POST', headers, body: '{}' }, phase));
    const after = `${EDITS}/${encodeURIComponent(readbackId)}`;
    const track = await request(fetcher, `${after}/tracks/internal`, { method: 'GET', headers }, phase);
    const savedBundles = collection(await request(fetcher, `${after}/bundles`, { method: 'GET', headers }, phase), 'bundles');
    requireValue(trackMatches(track, desiredTrack) && savedBundles.some(b => b.versionCode === metadata.versionCode && b.sha256 === metadata.sha256),
      'readback_mismatch');
    result.readbackVerified = true;
    result.code = 'internal_draft_uploaded';
  } catch (error) {
    const safeCodes = new Set(['missing_secret', 'invalid_secret']);
    result.code = error instanceof UploadError || safeCodes.has(error?.code) ? error.code : 'unexpected_error';
    result.httpStatus = error instanceof UploadError ? error.httpStatus : null;
    result.failedStage = phase;
    if (phase === 'commit' && error?.uncertain) {
      result.code = 'commit_outcome_unknown'; commitUncertain = true; result.manualReconciliationRequired = true;
    } else if (phase === 'upload' && error?.uncertain) {
      result.code = 'upload_outcome_unknown'; result.manualReconciliationRequired = true;
    } else if (result.committed) {
      result.code = 'committed_readback_unverified'; result.manualReconciliationRequired = true;
    }
  } finally {
    if (readbackId) {
      try { await clean(readbackId); result.temporaryEditDeleted = true; }
      catch { result.cleanupWarning = true; }
    } else if (editId && !result.committed && !commitUncertain) {
      try { await clean(editId); result.temporaryEditDeleted = true; }
      catch { result.cleanupWarning = true; }
    }
  }
  result.note = result.code === 'internal_draft_uploaded'
    ? 'Saved and read back an internal draft. Not rolled out to testers or production; not a claim of Google Play approval. Review-only builds still require distribution readiness work.'
    : result.manualReconciliationRequired
      ? 'Do not retry automatically. Inspect FINDR in Play Console to reconcile the uploaded version and draft before another attempt.'
      : 'No successful release commit was established. Inspect the fixed status code, resolve setup and rerun deliberately.';
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const value = key => { const i = args.indexOf(key); return i < 0 ? undefined : args[i + 1]; };
  requireValue(args.includes('--commit-internal-draft') && value('--bundle') && value('--verification'), 'explicit_upload_arguments_required');
  const bundlePath = resolve(value('--bundle')), reportPath = resolve(value('--verification'));
  requireValue(statSync(bundlePath).isFile() && statSync(bundlePath).size <= 1024 * 1024 * 1024, 'invalid_bundle');
  const rawCredential = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  const result = await uploadInternalDraft({ bytes: readFileSync(bundlePath), report: JSON.parse(readFileSync(reportPath, 'utf8')),
    expected: releaseProperties(readFileSync(`${ROOT}/play-release.properties`, 'utf8')), rawCredential,
    readinessConfirmed: process.env.FINDR_PLAY_READINESS_CONFIRMED });
  const output = JSON.stringify(result, null, 2);
  console.log(output);
  if (value('--output')) writeFileSync(resolve(value('--output')), `${output}\n`, { mode: 0o600 });
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `## FINDR internal draft upload\n\n\`\`\`json\n${output}\n\`\`\`\n`);
  if (result.code !== 'internal_draft_uploaded' || result.cleanupWarning) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error('Upload stopped before completion. No credential or upstream error details are logged.'); process.exitCode = 1; });
}
