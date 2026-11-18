import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, realpath, rm, stat, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gradleArguments, readSigningConfig, redactOutput, withSigning } from '../scripts/with-play-signing.mjs';

// Synthetic opaque bytes, not a real keystore or signing key. Certificate checks are mocked below.
const config = { schemaVersion: 1, keystoreBase64: Buffer.alloc(256, 90).toString('base64'),
  storePassword: 'synthetic-store-password', keyAlias: 'findr-test', keyPassword: 'synthetic-key-password',
  certificateSha256: 'a'.repeat(64) };
const raw = JSON.stringify(config);
const argv = ['--', './gradlew', '--no-daemon', 'bundleRelease', 'lintRelease', '-PrequirePlaySigning=true'];

async function fixtures(t) {
  const root = await mkdtemp(join(tmpdir(), 'findr-signing-test-'));
  const projectDir = join(root, 'project'), tempRoot = join(root, 'runner-temp');
  await mkdir(join(projectDir, 'android-play'), { recursive: true }); await mkdir(tempRoot);
  t.after(() => rm(root, { recursive: true, force: true }));
  return { projectDir, tempRoot, env: {}, verifyCertificate: async () => {} };
}

test('requires the complete schema and canonical base64; errors never echo input', () => {
  for (const input of [undefined, '', '{"private":"secret-must-not-leak"',
    JSON.stringify({ ...config, keystoreBase64: config.keystoreBase64 + '\n' }),
    JSON.stringify({ ...config, keystoreBase64: '!!!!' }),
    JSON.stringify({ ...config, keystoreBase64: 'eA==' }),
    JSON.stringify({ ...config, storePassword: '' }),
    JSON.stringify({ ...config, keyPassword: 'line\nbreak' }),
    JSON.stringify({ ...config, schemaVersion: 2 }),
    JSON.stringify({ ...config, extra: true }),
    JSON.stringify({ ...config, keyAlias: '../bad' }),
    JSON.stringify({ ...config, certificateSha256: 'wrong' }),
  ]) {
    assert.throws(() => readSigningConfig(input), error => {
      assert.ok(['missing_signing_secret', 'invalid_signing_secret'].includes(error.code));
      assert.ok(!error.message.includes('secret-must-not-leak')); return true;
    });
  }
});

test('rejects the known preview signer and non-signing/arbitrary commands', () => {
  assert.throws(() => readSigningConfig(JSON.stringify({ ...config,
    certificateSha256: '6075a73725dac5a3cc1f7b6b32c5e1df907cd1ca4b5b611f4c1c1d2fd502fefd' })), /preview_signing_identity_rejected/);
  for (const args of [[], ['--', 'env'], ['--', './gradlew', 'bundleRelease'],
    [...argv, '--debug'], [...argv, '--init-script=steal-credentials.gradle'], [...argv, 'bundleRelease']]) {
    assert.throws(() => gradleArguments(args), /unsupported_build_command/);
  }
  assert.ok(gradleArguments(argv).includes('--console=plain'));
});

test('review-only signing remains explicit and still requires the signing flag', () => {
  assert.ok(gradleArguments([...argv, '-PplayReviewOnly=true']).includes('-PplayReviewOnly=true'));
  assert.throws(() => gradleArguments(['--', './gradlew', 'bundleRelease', '-PplayReviewOnly=true']), /unsupported_build_command/);
  assert.throws(() => gradleArguments([...argv, '-PrequirePlaySigning=false']), /unsupported_build_command/);
});

test('creates a private key outside Git, verifies it, passes only child env and removes it after success', async t => {
  const options = await fixtures(t); let seenKey, verified = false;
  options.env = { FINDR_PLAY_SIGNING_JSON: raw, GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: 'synthetic-api-secret',
    FINDR_PLAY_KEYSTORE_BASE64: 'legacy-secret', JAVA_HOME: '/synthetic/jdk', FINDR_PLAY_REPORT_URL: 'https://example.test/reports' };
  options.verifyCertificate = async ({ env, config: read }) => {
    seenKey = env.FINDR_PLAY_KEYSTORE; verified = true;
    assert.equal((await stat(seenKey)).mode & 0o777, 0o600);
    assert.equal((await stat(join(seenKey, '..'))).mode & 0o777, 0o700);
    assert.deepEqual(await readFile(seenKey), Buffer.from(config.keystoreBase64, 'base64'));
    assert.equal(read.certificateSha256, config.certificateSha256);
    assert.ok(seenKey.startsWith(await realpath(options.tempRoot)));
  };
  options.execute = async ({ command, args, cwd, env }) => {
    assert.equal(verified, true); assert.equal(command, join(options.projectDir, 'android-play/gradlew'));
    assert.equal(cwd, join(options.projectDir, 'android-play')); assert.ok(args.includes('-PrequirePlaySigning=true'));
    assert.equal(env.FINDR_PLAY_STORE_PASSWORD, config.storePassword); assert.equal(env.FINDR_PLAY_KEY_PASSWORD, config.keyPassword);
    for (const name of ['FINDR_PLAY_SIGNING_JSON', 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON', 'FINDR_PLAY_KEYSTORE_BASE64']) assert.equal(env[name], undefined);
    assert.equal(env.FINDR_PLAY_REPORT_URL, options.env.FINDR_PLAY_REPORT_URL);
    return { code: 0, stdout: 'BUILD SUCCESSFUL\n', stderr: '' };
  };
  const result = await withSigning(raw, argv, options);
  assert.equal(result.exitCode, 0); assert.equal(result.output, 'BUILD SUCCESSFUL\n');
  assert.deepEqual(await readdir(options.tempRoot), []); await assert.rejects(stat(seenKey));
});

test('rejects temporary folders inside the checkout, including symlink aliases', async t => {
  const options = await fixtures(t); let called = false;
  options.execute = async () => { called = true; };
  await assert.rejects(withSigning(raw, argv, { ...options, tempRoot: options.projectDir }), /unsafe_temp_directory/);
  const link = join(options.tempRoot, 'project-link'); await symlink(options.projectDir, link);
  await assert.rejects(withSigning(raw, argv, { ...options, tempRoot: link }), /unsafe_temp_directory/);
  await assert.rejects(withSigning(raw, argv, { ...options, tempRoot: 'relative' }), /private_temp_directory_required/);
  assert.equal(called, false);
});

test('cleans up on child failure and redacts passwords, keystore data and complete JSON', async t => {
  const options = await fixtures(t);
  options.execute = async ({ env }) => ({ code: 23, stdout: `${raw}\n${config.keystoreBase64}\n${env.FINDR_PLAY_KEYSTORE}\n`,
    stderr: `${config.storePassword}\n${config.keyPassword}` });
  const result = await withSigning(raw, argv, options);
  assert.equal(result.exitCode, 23); assert.match(result.output, /REDACTED/);
  for (const value of [raw, config.keystoreBase64, config.storePassword, config.keyPassword]) assert.ok(!result.output.includes(value));
  assert.deepEqual(await readdir(options.tempRoot), []);
});

test('certificate failures stop before Gradle and cannot expose exception contents', async t => {
  const options = await fixtures(t); let called = false;
  options.verifyCertificate = async () => { throw Error(raw); };
  options.execute = async () => { called = true; };
  await assert.rejects(withSigning(raw, argv, options), error => {
    assert.equal(error.code, 'signing_setup_failed'); assert.ok(!error.message.includes(config.storePassword)); return true;
  });
  assert.equal(called, false); assert.deepEqual(await readdir(options.tempRoot), []);
});

test('interrupted build cleans up and returns a fixed cancellation error', async t => {
  const options = await fixtures(t), controller = new AbortController();
  options.signal = controller.signal;
  options.execute = async () => { controller.abort(); return { code: 130, stdout: '', stderr: raw }; };
  await assert.rejects(withSigning(raw, argv, options), /signing_cancelled/);
  assert.deepEqual(await readdir(options.tempRoot), []);
});

test('literal, JSON-escaped and URL-encoded password forms are redacted', () => {
  const c = { ...config, storePassword: 'test-pw%"<>', keyPassword: 'other-password' };
  const result = redactOutput(`${c.storePassword} ${JSON.stringify(c.storePassword).slice(1, -1)} ${encodeURIComponent(c.storePassword)}`, c, JSON.stringify(c), '/private/key');
  assert.equal(result, '[REDACTED] [REDACTED] [REDACTED]');
});
