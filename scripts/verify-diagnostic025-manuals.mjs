// Browser-only acceptance for the local manual processor. Every PDF is a
// labelled synthetic fixture; this does not verify a manufacturer procedure.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.FINDR_PLAYWRIGHT_PATH || '/opt/codex/cua_node/lib/node_modules/playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureRoot = path.join(root, 'tests/fixtures/diagnostic025');
const base = process.env.FINDR_QA_URL || 'http://127.0.0.1:8088';
const output = process.env.FINDR_QA_RESULTS || '/tmp/findr-diagnostic025-manuals.json';
const data = filename => ({filename, encoded: fs.readFileSync(path.join(fixtureRoot, filename)).toString('base64')});
const results = {synthetic: true, environment: 'Linux Chromium; not physical iPhone/Safari', measurements: [], checks: []};
const browser = await chromium.launch({executablePath: process.env.FINDR_CHROMIUM || '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage']});
const context = await browser.newContext({viewport: {width: 390, height: 844}, acceptDownloads: true});
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));

async function analyse(filename, extras = {}) {
  return page.evaluate(async ({filename, encoded, extras}) => {
    const api = await import('./manual-analysis.mjs');
    const db = await import('./db.mjs');
    const blob = new Blob([Uint8Array.from(atob(encoded), item => item.charCodeAt(0))], {type: 'application/pdf'});
    const record = {id: 'qa-' + filename, title: filename, filename, savedAt: Date.now(), bytes: blob.size};
    if (!extras.noSave) await db.saveManual(record, blob);
    const controller = new AbortController();
    const progress = [];
    const start = performance.now();
    const originalPut = IDBObjectStore.prototype.put;
    if (extras.failStorage) IDBObjectStore.prototype.put = function(value, key) { if (this.name === 'settings' && String(key).startsWith('manual-analysis:')) throw new DOMException('SYNTHETIC quota failure', 'QuotaExceededError'); return originalPut.call(this, value, key); };
    try {
      const analysis = await api.analyseManual({blob, record, force: !!extras.force, signal: controller.signal, onProgress: step => {
        progress.push({...step});
        if (extras.cancel && progress.length >= 3) controller.abort();
      }});
      return {ok: true, analysis, progress, elapsedMs: performance.now() - start};
    } catch (error) {
      return {ok: false, error: {name: error.name, code: error.code, message: error.message}, progress,
        elapsedMs: performance.now() - start};
    } finally { IDBObjectStore.prototype.put = originalPut; }
  }, {...data(filename), extras});
}

try {
  await page.goto(base + '/app/');
  await page.locator('#app').waitFor();
  await page.locator('#connection').filter({hasText: 'App ready offline'}).waitFor({timeout: 180000});
  await page.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated', null, {timeout: 180000});
  const environment = await page.evaluate(() => ({userAgent: navigator.userAgent, hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory ?? null, viewport: [innerWidth, innerHeight]}));
  results.browser = environment;
  const initial = await page.evaluate(async () => {
    const api = await import('./manual-analysis.mjs');
    const db = await import('./db.mjs');
    const retained = {id: 'synthetic-prior-025-visit', notes: 'SYNTHETIC original text; no model or date known',
      answers: {old_check: 'unknown'}};
    await db.setSetting('history', [retained]);
    await db.setSetting('qa025-legacy-copy', retained);
    const before = await api.getManualProcessingReadiness();
    const resourceProgress = [];
    if (!before.ready) await api.downloadManualProcessingResources({onProgress: step => resourceProgress.push(step)});
    return {before, after: await api.getManualProcessingReadiness(), resourceProgress};
  });
  assert.equal(initial.after.supported, true, 'Browser supports manual processing');
  assert.equal(initial.after.ready, true, 'All declared manual resources are cached');
  results.readiness = initial;
  // The verified app cache and activated controller are necessary for reload.
  await page.locator('#connection').filter({hasText: 'App ready offline'}).waitFor({timeout: 180000});
  await page.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated', null, {timeout: 180000});
  await context.setOffline(true);
  await page.reload();
  await page.locator('#app').waitFor();
  assert.equal(await page.evaluate(() => navigator.onLine), false, 'Browser network is unavailable before unseen manual processing');

  const text = await analyse('synthetic-premier-elite-text.pdf');
  assert.equal(text.ok, true, JSON.stringify(text.error));
  assert.equal(text.analysis.usable, true);
  assert.equal(text.analysis.pages.length, 3);
  assert.ok(text.analysis.pages.every(item => item.method === 'text'));
  assert.match(JSON.stringify(text.analysis.identity), /Texecom/i);
  assert.match(JSON.stringify(text.analysis.identity), /Premier Elite 24/i);
  assert.match(JSON.stringify(text.analysis.identity), /intruder/i);
  assert.ok(text.analysis.identity.evidence.some(item => item.page >= 1 && item.quote));
  results.measurements.push({filename: 'synthetic-premier-elite-text.pdf', elapsedMs: text.elapsedMs,
    timing: text.analysis.timing, pages: 3, progress: text.progress});

  const scan = await analyse('synthetic-premier-elite-scan.pdf');
  assert.equal(scan.ok, true, JSON.stringify(scan.error));
  assert.equal(scan.analysis.usable, true);
  assert.equal(scan.analysis.pages.length, 2);
  assert.ok(scan.analysis.pages.every(item => item.method === 'ocr'));
  assert.match(JSON.stringify(scan.analysis.identity), /Texecom/i);
  assert.match(JSON.stringify(scan.analysis.identity), /Premier Elite 24/i);
  results.measurements.push({filename: 'synthetic-premier-elite-scan.pdf', elapsedMs: scan.elapsedMs,
    timing: scan.analysis.timing, pages: 2, progress: scan.progress});

  const second = await analyse('synthetic-elmdene-component.pdf');
  assert.equal(second.ok, true, JSON.stringify(second.error));
  assert.equal(second.analysis.usable, true);
  assert.match(JSON.stringify(second.analysis.identity), /Elmdene/i);
  assert.match(JSON.stringify(second.analysis.identity), /2405ST/);
  const references = await page.evaluate(async analysis => {
    const api = await import('./manual-analysis.mjs');
    return api.searchManualPages(analysis, 'zone resistance fault expander', {limit: 3});
  }, text.analysis);
  assert.ok(references.length > 0, 'Local evidence search returns page references');
  results.references = references;

  const malicious = await analyse('synthetic-reference-injection.pdf');
  assert.equal(malicious.ok, true, JSON.stringify(malicious.error));
  assert.equal(await page.evaluate(() => window.__FINDR_PDF_PROMPT_EXECUTED), undefined,
    'Embedded prompt/script remains inert PDF reference text');
  const unreadable = await analyse('synthetic-unreadable.pdf', {noSave: true});
  assert.ok(!unreadable.ok || !unreadable.analysis.usable, 'Unreadable pages cannot establish a usable manual');
  const malformed = await analyse('synthetic-malformed.pdf', {noSave: true});
  assert.equal(malformed.ok, false, 'Malformed PDF is rejected');
  const cancelled = await analyse('synthetic-large-cancellation.pdf', {cancel: true, noSave: true});
  assert.equal(cancelled.ok, false, 'Interrupted extraction does not finish successfully');
  assert.match(JSON.stringify(cancelled.error), /abort|cancel/i);
  const interruptedHash = JSON.parse(fs.readFileSync(path.join(fixtureRoot, 'manifest.json'), 'utf8'))['synthetic-large-cancellation.pdf'].sha256;
  assert.equal(await page.evaluate(async hash => (await import('./manual-analysis.mjs')).getManualAnalysis(hash), interruptedHash), null, 'Interrupted analysis never commits a partial cache');
  const failedSave = await analyse('synthetic-premier-elite-text.pdf', {noSave: true, force: true, failStorage: true});
  assert.equal(failedSave.ok, false);
  assert.equal(failedSave.error.code, 'STORAGE_UNAVAILABLE', 'Storage failure is visible and leaves the earlier analysis intact');
  results.negativeCases = {failedSave: failedSave.error, unreadable: {ok: unreadable.ok, quality: unreadable.analysis?.quality, error: unreadable.error},
    malformed: malformed.error, cancelled: cancelled.error};

  await page.reload();
  await page.locator('#app').waitFor();
  const reused = await analyse('synthetic-premier-elite-text.pdf', {noSave: true});
  assert.equal(reused.ok, true, JSON.stringify(reused.error));
  assert.deepEqual(reused.analysis.pages, text.analysis.pages, 'Cached page text and original page references survive offline reload');
  assert.equal(reused.analysis.hash ?? reused.analysis.contentHash, text.analysis.hash ?? text.analysis.contentHash);
  const retained = await page.evaluate(async () => {
    const db = await import('./db.mjs');
    return {old: (await db.setting('history'))[0], expected: await db.setting('qa025-legacy-copy'),
      pdfBytes: (await db.getFile('qa-synthetic-premier-elite-text.pdf')).size};
  });
  assert.deepEqual(retained.old, retained.expected, 'Old saved visit remains unchanged');
  assert.equal(retained.pdfBytes, fs.statSync(path.join(fixtureRoot, 'synthetic-premier-elite-text.pdf')).size);
  results.measurements.push({filename: 'synthetic-premier-elite-text.pdf', cacheReuse: true, elapsedMs: reused.elapsedMs,
    timing: reused.analysis.timing, progress: reused.progress});
  assert.deepEqual(errors, [], 'No uncaught browser errors');
  results.checks = ['unseen text PDF offline', 'unseen scanned PDF offline', 'identity evidence with page references',
    'second component manual', 'local page retrieval', 'inert PDF prompt text', 'unreadable rejection',
    'malformed rejection', 'processing cancellation without partial cache', 'visible storage failure preserves prior analysis', 'offline reload and reuse', 'old visit and saved PDF preservation'];
  results.status = 'passed';
  fs.writeFileSync(output, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({status: results.status, output, measurements: results.measurements.map(({filename,elapsedMs,cacheReuse}) => ({filename,elapsedMs,cacheReuse}))}));
} catch (error) {
  results.status = 'failed';
  results.error = error.stack;
  results.browserErrors = errors;
  fs.writeFileSync(output, JSON.stringify(results, null, 2));
  await page.screenshot({path: '/tmp/findr-diagnostic025-manuals-failure.png', fullPage: true}).catch(() => {});
  throw error;
} finally {
  await context.close();
  await browser.close();
}
