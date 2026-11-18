import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { classifyCommitError, uploadInternalDraft, verifyUploadInput } from '../scripts/upload-play-internal.mjs';

const bytes = Buffer.from('Synthetic AAB fixture; never an Android application.');
const sha256 = createHash('sha256').update(bytes).digest('hex');
const expected = { applicationId: 'com.findr.play', versionCode: '1', versionName: '0.40.1-play.1', uploadCertificateSha256: 'a'.repeat(64) };
const report = { bytes: bytes.length, sha256, uploadableBuildChecksPassed: true, bundletoolValidated: true,
  releaseConfigurationReady: true, signature: { status: 'signed', verified: true, certificateSha256: ['a'.repeat(64)] },
  manifest: { applicationId: expected.applicationId, versionCode: 1, versionName: expected.versionName, debuggable: false } };
const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const rawCredential = JSON.stringify({ type: 'service_account', client_email: 'test@synthetic-project.iam.gserviceaccount.com',
  private_key: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }), token_uri: 'https://oauth2.googleapis.com/token' });
const input = { bytes, report, expected, rawCredential, readinessConfirmed: 'yes' };
const draft = { name: expected.versionName, versionCodes: ['1'], status: 'draft' };
const internal = { track: 'internal', releases: [draft] };
const token = { access_token: 'synthetic-access-token', token_type: 'Bearer' };
const bundle = { versionCode: 1, sha256 };
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
const beforeUpload = () => [[200, token], [200, { id: 'edit-1' }], [200, { tracks: [] }], [200, {}], [200, {}]];
const successful = () => [...beforeUpload(), [200, bundle], [200, internal], [200, { id: 'edit-1' }],
  [200, { id: 'edit-1' }], [200, { id: 'readback-1' }], [200, internal], [200, { bundles: [bundle] }], [204, null]];

test('signed readiness, identity, preview certificate and exact AAB bytes are required before network', async () => {
  const cases = [
    { readinessConfirmed: 'no' },
    { report: { ...report, uploadableBuildChecksPassed: false } },
    { report: { ...report, releaseConfigurationReady: false } },
    { report: { ...report, signature: { ...report.signature, status: 'unsigned' } } },
    { report: { ...report, signature: { ...report.signature, certificateSha256: ['6075a73725dac5a3cc1f7b6b32c5e1df907cd1ca4b5b611f4c1c1d2fd502fefd'] } } },
    { report: { ...report, manifest: { ...report.manifest, versionCode: 2 } } },
    { expected: { ...expected, applicationId: 'com.findr.app' } },
    { bytes: Buffer.from('Different bytes') },
    { report: { ...report, sha256: '0'.repeat(64) } },
  ];
  for (const changed of cases) {
    const m = mock([]), result = await uploadInternalDraft({ ...input, ...changed }, m);
    assert.equal(m.calls.length, 0); assert.equal(result.failedStage, 'preflight');
    assert.equal(result.uploadAttempted, false); assert.equal(result.committed, false);
  }
  assert.equal(verifyUploadInput(bytes, report, expected, 'yes').sha256, sha256);
});

test('only the exact pinned upload certificate can establish FINDR signing identity', async () => {
  for (const changed of [
    { expected: { ...expected, uploadCertificateSha256: undefined } },
    { expected: { ...expected, uploadCertificateSha256: 'invalid' } },
    { report: { ...report, signature: { ...report.signature, certificateSha256: ['b'.repeat(64)] } } },
    { report: { ...report, signature: { ...report.signature, certificateSha256: ['a'.repeat(64), 'b'.repeat(64)] } } },
  ]) {
    const m = mock([]), result = await uploadInternalDraft({ ...input, ...changed }, m);
    assert.equal(result.code, 'invalid_signing_identity'); assert.equal(m.calls.length, 0);
    assert.equal(result.uploadAttempted, false);
  }
});

test('success uploads exact bytes, stages internal draft only and verifies committed readback', async () => {
  const m = mock(successful()), result = await uploadInternalDraft(input, m);
  assert.equal(result.code, 'internal_draft_uploaded'); assert.equal(result.committed, true);
  assert.equal(result.readbackVerified, true); assert.equal(result.temporaryEditDeleted, true);
  const upload = m.calls.find(x => x.url.includes('/bundles?'));
  assert.equal(upload.body, bytes); assert.equal(upload.headers['Content-Type'], 'application/octet-stream');
  assert.match(upload.url, /^https:\/\/androidpublisher\.googleapis\.com\/upload\//);
  const puts = m.calls.filter(x => x.method === 'PUT'); assert.equal(puts.length, 1);
  assert.match(puts[0].url, /\/tracks\/internal$/); assert.deepEqual(JSON.parse(puts[0].body), internal);
  const commit = m.calls.find(x => x.url.includes(':commit'));
  assert.match(commit.url, /changesNotSentForReview=true/); assert.match(commit.url, /changesInReviewBehavior=ERROR_IF_IN_REVIEW/);
  assert.equal(commit.body, undefined); assert.ok(m.calls.every(x => x.redirect === 'error' && x.signal));
  assert.ok(!JSON.stringify(result).includes('synthetic-access-token'));
  assert.ok(!JSON.stringify(result).includes('iam.gserviceaccount.com'));
});

test('harmless explicit Google defaults do not invalidate an otherwise exact draft', async () => {
  const responses = successful();
  responses[6] = responses[10] = [200, { track: 'internal', releases: [{ ...draft, inAppUpdatePriority: 0, releaseNotes: [] }] }];
  const result = await uploadInternalDraft(input, mock(responses));
  assert.equal(result.code, 'internal_draft_uploaded'); assert.equal(result.readbackVerified, true);
});

test('existing version in any bundle, APK or track is rejected before upload', async () => {
  for (const position of [2, 3, 4]) {
    const responses = beforeUpload();
    responses[position] = [200, position === 2 ? { tracks: [{ track: 'production', releases: [{ versionCodes: ['1'] }] }] }
      : position === 3 ? { bundles: [bundle] } : { apks: [{ versionCode: 1 }] }];
    const m = mock([...responses, [204, null]]), result = await uploadInternalDraft(input, m);
    assert.equal(result.code, 'version_already_exists'); assert.equal(result.uploadAttempted, false);
    assert.equal(result.temporaryEditDeleted, true); assert.equal(m.calls.at(-1).method, 'DELETE');
  }
});

test('existing internal draft is never overwritten', async () => {
  const responses = beforeUpload(); responses[2] = [200, { tracks: [{ track: 'internal', releases: [{ versionCodes: ['2'], status: 'draft' }] }] }];
  const m = mock([...responses, [204, null]]), result = await uploadInternalDraft(input, m);
  assert.equal(result.code, 'existing_internal_draft'); assert.equal(result.uploadAttempted, false);
  assert.equal(result.temporaryEditDeleted, true);
});

test('current internal releases are retained and other tracks are never modified', async () => {
  const previous = { name: 'Previous QA', versionCodes: ['8'], status: 'completed' };
  const future = { ...input, expected: { ...expected, versionCode: '10' }, report: { ...report, manifest: { ...report.manifest, versionCode: 10 } } };
  const nextDraft = { ...draft, versionCodes: ['10'] }, nextBundle = { ...bundle, versionCode: 10 };
  const responses = successful(); responses[2] = [200, { tracks: [{ track: 'internal', releases: [previous] },
    { track: 'production', releases: [{ versionCodes: ['9'], status: 'completed' }] }] }];
  responses[5] = [200, nextBundle]; responses[11] = [200, { bundles: [nextBundle] }];
  responses[6] = responses[10] = [200, { track: 'internal', releases: [previous, nextDraft] }];
  const m = mock(responses), result = await uploadInternalDraft(future, m);
  assert.equal(result.code, 'internal_draft_uploaded');
  assert.deepEqual(JSON.parse(m.calls.find(x => x.method === 'PUT').body).releases, [previous, nextDraft]);
  assert.equal(m.calls.filter(x => x.method === 'PUT').length, 1);
});

test('staging cannot silently remove or change existing releases before commit', async () => {
  const previous = { name: 'Previous QA', versionCodes: ['1'], status: 'completed' };
  const future = { ...input, expected: { ...expected, versionCode: '2' }, report: { ...report, manifest: { ...report.manifest, versionCode: 2 } } };
  const nextDraft = { ...draft, versionCodes: ['2'] }, nextBundle = { ...bundle, versionCode: 2 };
  for (const changed of [[nextDraft], [{ ...previous, status: 'halted' }, nextDraft]]) {
    const responses = beforeUpload(); responses[2] = [200, { tracks: [{ track: 'internal', releases: [previous] }] }];
    const m = mock([...responses, [200, nextBundle], [200, { track: 'internal', releases: changed }], [204, null]]);
    const result = await uploadInternalDraft(future, m);
    assert.equal(result.code, 'draft_response_mismatch'); assert.equal(result.commitAttempted, false);
    assert.equal(result.temporaryEditDeleted, true);
  }
});

test('version code must be newer than visible existing releases', async () => {
  const responses = beforeUpload(); responses[3] = [200, { bundles: [{ versionCode: 8 }] }];
  const m = mock([...responses, [204, null]]), result = await uploadInternalDraft(input, m);
  assert.equal(result.code, 'version_not_newer'); assert.equal(result.uploadAttempted, false);
});

test('review-only signed bundle needs its dedicated verified flag and never claims distribution readiness', async () => {
  const review = { ...input, readinessConfirmed: undefined, report: { ...report, reviewOnly: true,
    draftUploadChecksPassed: true, uploadableBuildChecksPassed: false, releaseConfigurationReady: false } };
  const m = mock(successful()), result = await uploadInternalDraft(review, m);
  assert.equal(result.code, 'internal_draft_uploaded'); assert.equal(result.reviewOnly, true);
  assert.equal(result.distributionReady, false);
  assert.deepEqual(JSON.parse(m.calls.find(x => x.method === 'PUT').body), internal);
  for (const changed of [{ draftUploadChecksPassed: false }, { reviewOnly: false }, { releaseConfigurationReady: true },
    { signature: { ...report.signature, verified: false } }]) {
    const n = mock([]), failure = await uploadInternalDraft({ ...review, report: { ...review.report, ...changed } }, n);
    assert.equal(failure.code, 'bundle_not_release_verified'); assert.equal(n.calls.length, 0);
  }
});

test('Google payload checksum or version mismatch is never staged or committed', async () => {
  for (const bad of [{ versionCode: 1, sha256: 'b'.repeat(64) }, { versionCode: 2, sha256 }]) {
    const m = mock([...beforeUpload(), [200, bad], [204, null]]), result = await uploadInternalDraft(input, m);
    assert.equal(result.code, 'uploaded_bundle_mismatch'); assert.equal(result.commitAttempted, false);
    assert.ok(!m.calls.some(x => x.method === 'PUT')); assert.equal(result.temporaryEditDeleted, true);
  }
});

test('Google validation rejection stops before commit and abandons the edit', async () => {
  const m = mock([...successful().slice(0, 7), [400, { error: { message: 'Synthetic incomplete listing' } }], [204, null]]);
  const result = await uploadInternalDraft(input, m);
  assert.equal(result.failedStage, 'validate'); assert.equal(result.commitAttempted, false);
  assert.equal(result.temporaryEditDeleted, true); assert.ok(!m.calls.some(x => x.url.includes(':commit')));
});

test('ambiguous upload is not retried and its uncommitted edit is abandoned', async () => {
  const m = mock([...beforeUpload(), new Error(rawCredential), [204, null]]), result = await uploadInternalDraft(input, m);
  assert.equal(result.code, 'upload_outcome_unknown'); assert.equal(result.manualReconciliationRequired, true);
  assert.equal(result.committed, false); assert.equal(result.temporaryEditDeleted, true);
  assert.equal(m.calls.filter(x => x.url.includes('/bundles?')).length, 1);
  assert.ok(!JSON.stringify(result).includes('private_key'));
});

test('ambiguous commit is not retried or deleted and requires Console reconciliation', async () => {
  for (const failure of [new Error('Lost response'), [503, {}]]) {
    const responses = successful().slice(0, 8); responses.push(failure);
    const m = mock(responses), result = await uploadInternalDraft(input, m);
    assert.equal(result.code, 'commit_outcome_unknown'); assert.equal(result.manualReconciliationRequired, true);
    assert.equal(result.committed, false); assert.equal(result.temporaryEditDeleted, false);
    assert.equal(m.calls.filter(x => x.url.includes(':commit')).length, 1);
    assert.ok(!m.calls.some(x => x.method === 'DELETE'));
  }
});

test('deterministic commit rejection never retries with weaker review flags', async () => {
  const m = mock([...successful().slice(0, 8), [400, { error: { message: rawCredential, details: [{ reason: 'CHANGES_ALREADY_IN_REVIEW' }] } }], [204, null]]);
  const result = await uploadInternalDraft(input, m);
  assert.equal(result.committed, false); assert.equal(result.temporaryEditDeleted, true);
  assert.equal(result.code, 'review_in_progress');
  assert.equal(m.calls.filter(x => x.url.includes(':commit')).length, 1);
  assert.ok(!JSON.stringify(result).includes('private_key'));
});

test('known commit diagnostics expose fixed enums only and never change flags automatically', async () => {
  const forbidden = 'Changes are sent for review automatically. The query parameter changesNotSentForReview must not be set.';
  const required = 'Changes cannot be sent for review automatically. Please set the query parameter changesNotSentForReview to true. Once committed, the changes in this edit can be sent for review from the Google Play Console UI.';
  for (const [message, code] of [[forbidden, 'review_flag_must_be_omitted'], [required, 'review_flag_required'],
    ['Only releases with status draft may be created on draft app.', 'draft_app_requires_draft_release']]) {
    const m = mock([...successful().slice(0, 8), [400, { error: { message } }], [204, null]]);
    const result = await uploadInternalDraft(input, m);
    assert.equal(result.code, code); assert.equal(result.committed, false); assert.equal(result.temporaryEditDeleted, true);
    assert.equal(m.calls.filter(x => x.url.includes(':commit')).length, 1);
    assert.match(m.calls.find(x => x.url.includes(':commit')).url, /changesNotSentForReview=true&changesInReviewBehavior=ERROR_IF_IN_REVIEW/);
    assert.ok(!JSON.stringify(result).includes(message));
  }
  assert.equal(classifyCommitError(503, { error: { message: forbidden } }), null);
  assert.equal(classifyCommitError(400, { error: { message: forbidden + ' PRIVATE INFORMATION' } }), null);
  assert.equal(classifyCommitError(400, { error: { message: rawCredential } }), null);
});

test('a committed draft with failed readback is not described as verified or uploaded again', async () => {
  const responses = successful(); responses[10] = [200, { track: 'internal', releases: [] }];
  const m = mock(responses), result = await uploadInternalDraft(input, m);
  assert.equal(result.code, 'committed_readback_unverified'); assert.equal(result.committed, true);
  assert.equal(result.readbackVerified, false); assert.equal(result.manualReconciliationRequired, true);
  assert.equal(result.temporaryEditDeleted, true); assert.equal(m.calls.filter(x => x.url.includes('/bundles?')).length, 1);
});

test('readback must preserve previous releases as well as contain the new draft', async () => {
  const previous = { name: 'Previous QA', versionCodes: ['1'], status: 'completed' };
  const future = { ...input, expected: { ...expected, versionCode: '2' }, report: { ...report, manifest: { ...report.manifest, versionCode: 2 } } };
  const nextDraft = { ...draft, versionCodes: ['2'] }, nextBundle = { ...bundle, versionCode: 2 };
  const responses = successful(); responses[2] = [200, { tracks: [{ track: 'internal', releases: [previous] }] }];
  responses[5] = [200, nextBundle]; responses[6] = [200, { track: 'internal', releases: [previous, nextDraft] }];
  responses[10] = [200, { track: 'internal', releases: [nextDraft] }]; responses[11] = [200, { bundles: [nextBundle] }];
  const result = await uploadInternalDraft(future, mock(responses));
  assert.equal(result.code, 'committed_readback_unverified'); assert.equal(result.committed, true);
  assert.equal(result.readbackVerified, false); assert.equal(result.manualReconciliationRequired, true);
});

test('cleanup failure is reported after a verified commit without false rollback claims', async () => {
  const responses = successful(); responses[12] = [503, {}];
  const result = await uploadInternalDraft(input, mock(responses));
  assert.equal(result.committed, true); assert.equal(result.readbackVerified, true);
  assert.equal(result.cleanupWarning, true); assert.equal(result.temporaryEditDeleted, false);
});

test('Google authentication errors remain sanitized and do not create edits', async () => {
  const m = mock([[400, { error: 'invalid_grant', error_description: rawCredential }]]);
  const result = await uploadInternalDraft(input, m);
  assert.equal(result.code, 'authentication_failed'); assert.equal(m.calls.length, 1);
  assert.equal(result.committed, false); assert.ok(!JSON.stringify(result).includes('private_key'));
});
