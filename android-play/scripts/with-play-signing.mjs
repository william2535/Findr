// Keep upload-key material in a private temporary directory, never in the checkout.
import { createHash, X509Certificate } from 'node:crypto';
import { chmod, mkdtemp, open, realpath, rm, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PREVIEW_CERTIFICATE = '6075a73725dac5a3cc1f7b6b32c5e1df907cd1ca4b5b611f4c1c1d2fd502fefd';
const REQUIRED = ['schemaVersion', 'keystoreBase64', 'storePassword', 'keyAlias', 'keyPassword', 'certificateSha256'];
const ALLOWED_ARGS = new Set(['--no-daemon', '--console=plain', '--no-configuration-cache', 'bundleRelease', 'lintRelease', '-PrequirePlaySigning=true', '-PplayReviewOnly=true']);

export class SigningError extends Error {
  constructor(code) { super(code); this.code = code; }
}

export function readSigningConfig(raw) {
  if (!raw?.trim()) throw new SigningError('missing_signing_secret');
  try {
    if (raw.length > 2 * 1024 * 1024) throw new Error();
    const c = JSON.parse(raw);
    if (!c || Array.isArray(c) || Object.keys(c).sort().join() !== [...REQUIRED].sort().join() || c.schemaVersion !== 1) throw new Error();
    if (typeof c.keystoreBase64 !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(c.keystoreBase64)) throw new Error();
    const bytes = Buffer.from(c.keystoreBase64, 'base64');
    if (bytes.length < 128 || bytes.length > 1024 * 1024 || bytes.toString('base64') !== c.keystoreBase64) throw new Error();
    for (const key of ['storePassword', 'keyPassword']) {
      if (typeof c[key] !== 'string' || c[key].length < 6 || c[key].length > 256 || /[\x00-\x1f\x7f]/.test(c[key])) throw new Error();
    }
    if (typeof c.keyAlias !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(c.keyAlias)) throw new Error();
    if (typeof c.certificateSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(c.certificateSha256)) throw new Error();
    if (c.certificateSha256 === PREVIEW_CERTIFICATE) throw new SigningError('preview_signing_identity_rejected');
    return { ...c, bytes };
  } catch (error) {
    if (error instanceof SigningError) throw error;
    throw new SigningError('invalid_signing_secret');
  }
}

export function gradleArguments(argv) {
  if (argv[0] !== '--' || argv[1] !== './gradlew') throw new SigningError('unsupported_build_command');
  const args = argv.slice(2);
  if (!args.includes('bundleRelease') || !args.includes('-PrequirePlaySigning=true') ||
      args.some(arg => !ALLOWED_ARGS.has(arg)) || new Set(args).size !== args.length) throw new SigningError('unsupported_build_command');
  return [...(args.includes('--no-daemon') ? [] : ['--no-daemon']), ...(args.includes('--console=plain') ? [] : ['--console=plain']), ...args];
}

function inside(path, parent) {
  const rel = relative(parent, path);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

export function redactOutput(text, config, raw, keystorePath) {
  const values = [raw, config.keystoreBase64, config.storePassword, config.keyPassword, keystorePath];
  for (const value of [...values].sort((a, b) => b.length - a.length)) {
    for (const form of new Set([value, JSON.stringify(value).slice(1, -1), encodeURIComponent(value)])) {
      if (form) text = text.split(form).join('[REDACTED]');
    }
  }
  return text;
}

// Buffer bounded child output before redaction so a secret spanning chunks cannot escape.
function runProcess({ command, args, cwd, env, signal, timeoutMs = 20 * 60 * 1000 }) {
  return new Promise((resolveRun, reject) => {
    let child, size = 0, overflow = false, stopping = false, killTimer;
    const stdout = [], stderr = [];
    const stop = () => {
      if (stopping || !child?.pid) return;
      stopping = true;
      const kill = sig => {
        try { if (process.platform !== 'win32') process.kill(-child.pid, sig); else child.kill(sig); } catch { /* already stopped */ }
      };
      kill('SIGTERM'); killTimer = setTimeout(() => kill('SIGKILL'), 5000);
    };
    if (signal?.aborted) return reject(new SigningError('signing_cancelled'));
    try { child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32' }); }
    catch { return reject(new SigningError('build_launch_failed')); }
    signal?.addEventListener('abort', stop, { once: true });
    const timer = setTimeout(stop, timeoutMs);
    const capture = target => chunk => {
      size += chunk.length;
      if (size > 8 * 1024 * 1024) { overflow = true; stop(); return; }
      target.push(chunk);
    };
    child.stdout.on('data', capture(stdout)); child.stderr.on('data', capture(stderr));
    const finish = () => { clearTimeout(timer); clearTimeout(killTimer); signal?.removeEventListener('abort', stop); };
    child.once('error', () => { finish(); reject(new SigningError('build_launch_failed')); });
    child.once('close', (code, exitSignal) => {
      finish();
      if (overflow) return reject(new SigningError('build_output_limit'));
      if (signal?.aborted || stopping) return reject(new SigningError('signing_cancelled'));
      resolveRun({ code: Number.isInteger(code) ? code : 1, signal: exitSignal, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr) });
    });
  });
}

async function checkCertificate({ env, cwd, config, signal }) {
  const command = env.JAVA_HOME ? join(env.JAVA_HOME, 'bin/keytool') : 'keytool';
  const result = await runProcess({ command, cwd, env, signal, timeoutMs: 30000,
    args: ['-exportcert', '-keystore', env.FINDR_PLAY_KEYSTORE, '-storepass:env', 'FINDR_PLAY_STORE_PASSWORD', '-alias', config.keyAlias] });
  try {
    if (result.code !== 0) throw new Error();
    const cert = new X509Certificate(result.stdout);
    if (createHash('sha256').update(cert.raw).digest('hex') !== config.certificateSha256 ||
        cert.publicKey.asymmetricKeyType !== 'rsa' || cert.publicKey.asymmetricKeyDetails?.modulusLength < 2048 ||
        Date.parse(cert.validTo) <= Date.now()) throw new Error();
  } catch { throw new SigningError('signing_certificate_check_failed'); }
}

export async function withSigning(raw, argv, {
  env = process.env, projectDir = PROJECT, tempRoot = env.RUNNER_TEMP,
  verifyCertificate = checkCertificate, execute = runProcess, signal,
} = {}) {
  const config = readSigningConfig(raw), args = gradleArguments(argv);
  let privateDir;
  try {
    if (!tempRoot || !isAbsolute(tempRoot)) throw new SigningError('private_temp_directory_required');
    const project = await realpath(projectDir), temporary = await realpath(tempRoot);
    if (!(await stat(temporary)).isDirectory() || inside(temporary, project)) throw new SigningError('unsafe_temp_directory');
    privateDir = await mkdtemp(join(temporary, 'findr-play-signing-'));
    await chmod(privateDir, 0o700);
    const keyPath = join(privateDir, 'upload.jks');
    const file = await open(keyPath, 'wx', 0o600);
    try { await file.writeFile(config.bytes); } finally { await file.close(); }
    const childEnv = { ...env, FINDR_PLAY_KEYSTORE: keyPath, FINDR_PLAY_STORE_PASSWORD: config.storePassword,
      FINDR_PLAY_KEY_ALIAS: config.keyAlias, FINDR_PLAY_KEY_PASSWORD: config.keyPassword };
    // Keep unrelated API credentials and the aggregate JSON out of the build process.
    delete childEnv.FINDR_PLAY_SIGNING_JSON; delete childEnv.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
    delete childEnv.FINDR_PLAY_KEYSTORE_BASE64;
    await verifyCertificate({ env: childEnv, cwd: join(project, 'android-play'), config, signal });
    if (signal?.aborted) throw new SigningError('signing_cancelled');
    const result = await execute({ command: join(project, 'android-play/gradlew'), args,
      cwd: join(project, 'android-play'), env: childEnv, signal });
    if (signal?.aborted) throw new SigningError('signing_cancelled');
    const output = redactOutput(Buffer.concat([Buffer.from(result.stdout ?? ''), Buffer.from(result.stderr ?? '')]).toString(), config, raw, keyPath);
    return { exitCode: Number.isInteger(result.code) ? result.code : 1, output, certificateSha256: config.certificateSha256 };
  } catch (error) {
    if (error instanceof SigningError) throw error;
    throw new SigningError('signing_setup_failed');
  } finally {
    config.bytes.fill(0);
    if (privateDir) {
      try { await rm(privateDir, { recursive: true, force: true }); }
      catch { throw new SigningError('private_temp_cleanup_failed'); }
    }
  }
}

async function main() {
  const raw = process.env.FINDR_PLAY_SIGNING_JSON;
  delete process.env.FINDR_PLAY_SIGNING_JSON;
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
  try {
    const result = await withSigning(raw, process.argv.slice(2), { signal: controller.signal });
    if (result.output) process.stdout.write(result.output);
    process.exitCode = result.exitCode;
  } catch (error) {
    console.error(`Play signing stopped: ${error instanceof SigningError ? error.code : 'signing_setup_failed'}. Credential values were not printed.`);
    process.exitCode = controller.signal.aborted ? 130 : 1;
  } finally {
    process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
