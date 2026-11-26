// Browser integration for actual field records. All data/photos are synthetic.
// Uses real local OCR, IndexedDB and (when requested) the verified service worker.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const kind = process.env.FINDR_FIELD_BROWSER || 'chromium';
const base = process.env.FINDR_FIELD_URL || 'http://127.0.0.1:4186/app/';
const output = process.env.FINDR_FIELD_OUTPUT || '/tmp/findr-loop-field-qa';
const offline = process.env.FINDR_FIELD_OFFLINE === '1';
const label = `${kind}${offline ? '-offline' : ''}`;
const startedAt = Date.now();
const result = { browser: kind, offline, physicalDevice: false, checks: [], errors: [], screenshots: [] };
await fs.mkdir(output, { recursive: true });
let context, page, stage = 'launch';
const check = (name, details) => { result.checks.push({ name, ...(details ? { details } : {}) }); console.log('PASS ' + name); };
const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1).then(value => assert.ok(value, 'No body overflow'));
const screenshot = async name => { const filename = `${label}-${name}.png`; await page.screenshot({ path: path.join(output, filename) }); result.screenshots.push(filename); };
// waitForFunction treats an async predicate's Promise as truthy in this runtime.
// Evaluate and await IndexedDB predicates explicitly instead.
async function waitAsync(predicate, argument, { timeout = 30000 } = {}) {
  const deadline = Date.now() + timeout; let lastError;
  while (Date.now() < deadline) {
    try { if (await page.evaluate(predicate, argument)) return; } catch (error) { lastError = error; }
    await page.waitForTimeout(60);
  }
  throw new Error(`Timed out awaiting browser data${lastError ? ': ' + lastError.message : ''}`);
}
async function createPhoto(name, lines) {
  const encoded = await page.evaluate(lines => {
    const canvas = document.createElement('canvas'); canvas.width = 1400; canvas.height = 900;
    const drawing = canvas.getContext('2d'); drawing.fillStyle = '#fff'; drawing.fillRect(0, 0, canvas.width, canvas.height);
    drawing.fillStyle = '#000'; drawing.font = '40px monospace';
    lines.forEach((line, index) => drawing.fillText(line, 60, 70 + index * 72));
    return canvas.toDataURL('image/png').split(',')[1];
  }, lines);
  const filename = path.join(output, name + '.png'); await fs.writeFile(filename, Buffer.from(encoded, 'base64')); return filename;
}
async function verifiedShell() {
  const started = Date.now();
  while (Date.now() - started < 180000) {
    const status = await page.evaluate(async () => {
      if (!navigator.serviceWorker.controller) return null;
      return new Promise(resolve => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => { channel.port1.close(); resolve(null); }, 5000);
        channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data?.ready ? event.data : null); };
        navigator.serviceWorker.controller.postMessage({ type: 'CHECK_OFFLINE' }, [channel.port2]);
      });
    });
    if (status) return { ...status, waitMs: Date.now() - started };
    await page.waitForTimeout(300);
  }
  throw Error('The actual service worker did not verify this release for offline use');
}

const action = (name, id) => page.locator(`[data-field-action="${name}"]${id ? `[data-id="${id}"]` : ''}`).first();
const jobs = () => page.evaluate(async () => (await import('./loop-field-store.mjs')).listJobs());
const selectedId = () => page.locator('#lfl-job-select').inputValue();
const readJob = async identity => page.evaluate(async id => (await import('./loop-field-store.mjs')).loadJob(id), identity || await selectedId());
const evaluated = async identity => page.evaluate(async id => (await import('./loop-field-model.mjs')).evaluateFieldJob(await (await import('./loop-field-store.mjs')).loadJob(id)), identity || await selectedId());
const idle = () => page.waitForFunction(() => document.querySelector('#lfl-save-status')?.textContent === 'Job saved on this device');
async function reveal(locator) {
  const closed = await locator.evaluate(node => {
    const result = []; for (let item = node; item; item = item.parentElement) if (item.tagName === 'DETAILS' && !item.open) result.unshift(item.dataset.fieldDisclosure);
    return result;
  });
  for (const id of closed) await page.locator(`details[data-field-disclosure="${id}"] > summary`).click();
}
async function click(name, id) { const target = action(name, id); await reveal(target); await target.click(); }
async function step(id) { await page.locator(`.lfl-steps [data-field-action=step][data-id="${id}"]`).click(); await idle(); }
async function fields(form, values) {
  await reveal(form);
  for (const [name, value] of Object.entries(values)) {
    const input = form.locator(`[name="${name}"]`); await reveal(input);
    const type = await input.evaluate(element => element.tagName === 'SELECT' ? 'select' : element.type);
    if (type === 'checkbox') await input.setChecked(value);
    else if (type === 'select') await input.selectOption(value);
    else await input.fill(String(value));
  }
}
async function submit(form) {
  const before = await readJob(); await reveal(form); await form.locator('button[type=submit]').click();
  await waitAsync(async ({ id, revision }) => (await (await import('./loop-field-store.mjs')).loadJob(id))?.revision > revision, { id: before.id, revision: before.revision });
  await idle();
}
async function createJob(name, loop) {
  await click('new-job'); const before = (await jobs()).length;
  const form = page.locator('#lfl-job-form[data-new=true]');
  await fields(form, { name, panel: 'Protec 6500', card: '1', loop, reference: 'Synthetic QA site; no customer data' });
  await form.locator('button[type=submit]').click();
  await waitAsync(async count => (await (await import('./loop-field-store.mjs')).listJobs()).length === count + 1, before); await idle(); return selectedId();
}
async function observe({ before = '0', after = '0', reset = 'none', resetNote = '', coverage = 'polled', unavailable = [], excluded = [], sectionIds = [], times = true, hour = 9, polls = false, note = '' } = {}) {
  await step('tests'); await click('clear-test'); const form = page.locator('#lfl-test-form');
  await fields(form, { startedAt: times ? `2026-11-25T${String(hour).padStart(2,'0')}:00:00` : '', endedAt: times ? `2026-11-25T${String(hour+1).padStart(2,'0')}:00:00` : '', missedBefore: before, missedAfter: after, reset, resetNote, conditions: 'Synthetic QA: unchanged supply and same documented operating conditions.', conditionsConfirmed: true, notes: note });
  const current = await readJob();
  for (const device of current.devices) await form.locator(`[name="coverage:${device.id}"]`).selectOption(unavailable.includes(device.id) ? 'unavailable' : excluded.includes(device.id) ? 'excluded' : coverage);
  for (const id of sectionIds) await form.locator(`[name=sectionIds][value="${id}"]`).check();
  if (polls) await fields(form, { pollsBefore: '1000', pollsAfter: '1600', pollsSource: 'Synthetic external logger totals; same covered devices and one-hour period, engineer entered.' });
  return form;
}

try {
  const executablePath = process.env[kind === 'webkit' ? 'FINDR_WEBKIT' : 'FINDR_CHROMIUM'];
  context = await pw[kind].launchPersistentContext(await fs.mkdtemp(path.join(output, `${kind}-profile-`)), { headless: true, ...(executablePath ? { executablePath } : {}), ...(kind === 'chromium' ? { args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {}), viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce', acceptDownloads: true, serviceWorkers: 'allow' });
  result.browserVersion = context.browser().version(); result.storageContext = 'Fresh persistent profile with actual Blob records';
  page = await context.newPage(); page.setDefaultTimeout(30000); page.on('pageerror', error => { if (error.message !== 'Context is stopped') result.errors.push(error.message); });
  await page.goto(base + '#home'); await page.locator('#findr-startup').waitFor({ state: 'detached' });
  result.releaseVersion = await page.evaluate(async () => (await import('./version.mjs')).APP_VERSION);
  stage = 'prepare actual offline resources'; result.offlineShell = await verifiedShell(); assert.equal(result.offlineShell.version, result.releaseVersion);
  const readiness = await page.evaluate(async () => (await import('./loop-photo-import.mjs')).getLoopPhotoReadiness()); assert.equal(readiness.ready, true); result.ocrResources = { ready: readiness.ready, bytes: readiness.totalBytes };
  const actualColumns = await createPhoto('synthetic-protec-columns', ['PROTEC 6500 - SYNTHETIC TEST IMAGE', 'Add   State   S/N      Type    Ver   Map', '001   OK      DFD310   16PAI   10    1', '042   OK      DFD311   16PAI   10    1', '007   OK      DFD312   16PAI   10    2', '065   OK      DFD313   16PAI   10    2', '012   OK      DFD314   16PAI   10    3', '003   OK      DFD315   16PAI   10    3', 'Logged 6   Unallocated 0   Missing 0', '1 of 6']);
  const genericPhoto = await createPhoto('synthetic-generic-list', ['SYNTHETIC REVIEW TEST', 'Address   Map   Device', '88        4     Extra detector', '89        4     Extra call point']);
  const blankPhoto = await createPhoto('synthetic-blank-image', []);
  if (offline) { await context.setOffline(true); await page.reload(); await page.locator('#home-dashboard').waitFor(); }
  check('Actual release and English OCR resources are verified before the journey', { offline, ...result.offlineShell });

  stage = 'normal entry and legacy preservation';
  await page.locator('header [data-nav=panel-lab]').click(); await page.locator('.pl-matrix').waitFor();
  await page.locator('.pl-cell').first().click(); await page.waitForFunction(() => document.querySelector('#pl-save-status')?.textContent.startsWith('Saved on this device'));
  const originalMatrices = await page.evaluate(async () => (await import('./cause-effect-store.mjs')).listProjects());
  await page.locator('[data-panel-lab-action=tab][data-tab=loop-diagnostics]').click();
  await page.locator('[data-panel-lab-action=loop-mode][data-id=practice]').click(); await page.locator('.pll-root').waitFor();
  await page.locator('[data-loop-action=acknowledge]').first().click(); await page.waitForFunction(() => document.querySelector('#pl-loop-save-status')?.textContent === 'Exercise saved on this device');
  const originalPractice = await page.evaluate(async () => (await import('./db.mjs')).setting('panel-lab-protec-loop-v1'));
  await page.locator('[data-panel-lab-action=loop-mode][data-id=site]').first().click(); await page.locator('#lfl-job-select').waitFor();
  const firstId = await createJob('QA East building', '1');
  assert.equal((await readJob()).devices.length, 0); assert.equal((await readJob()).tests.length, 0); await fits();
  check('Normal navigation creates an empty real job while existing matrix and practice are retained');

  stage = 'real OCR and explicit review';
  const ocrStarted = Date.now(); await page.locator('#lfl-photo-files').setInputFiles(actualColumns);
  await action('cancel-ocr').waitFor(); assert.ok(await page.locator('#lfl-job-select').isDisabled(), 'Do not switch jobs during photo processing');
  await waitAsync(async id => (await (await import('./loop-field-store.mjs')).loadJob(id))?.photos[0]?.ocr?.suggestions?.length === 6, firstId, { timeout: 120000 });
  await action('cancel-ocr').waitFor({ state: 'hidden' }); await idle();
  let current = await readJob(); const sourcePhoto = current.photos[0]; result.firstOCRMs = Date.now() - ocrStarted;
  assert.equal(current.devices.length, 0, 'OCR cannot approve inventory automatically');
  assert.deepEqual(sourcePhoto.ocr.suggestions.map(row => [Number(row.address), Number(row.map)]), [[1,1],[42,1],[7,2],[65,2],[12,3],[3,3]]);
  assert.ok(sourcePhoto.ocr.unparsedLines.some(row => /Logged/.test(row.rawLine)));
  assert.equal(await page.evaluate(async ({ id, photoId }) => (await (await import('./loop-field-store.mjs')).loadPhoto(id, photoId)) instanceof Blob, { id: firstId, photoId: sourcePhoto.id }), true);
  await page.locator('.lfl-photo-preview img').waitFor(); await page.waitForFunction(() => document.querySelector('.lfl-photo-preview img')?.naturalWidth > 0);
  await page.locator('.lfl-photo-review').scrollIntoViewIfNeeded(); await screenshot('original-photo-review');
  const review = page.locator('[data-review-row]'); assert.equal(await review.count(), 6);
  await review.nth(0).locator('[name=address]').fill('42'); await page.locator('#lfl-review-confirmed').check(); await click('confirm-rows');
  await page.getByRole('alert').first().waitFor(); assert.match(await page.getByRole('alert').first().innerText(), /already recorded|duplicate|repeated/i); assert.equal((await readJob()).devices.length, 0);
  await review.nth(0).locator('[name=address]').fill('1'); await review.nth(0).locator('[name=label]').fill('Engineer checked entrance');
  await review.nth(5).locator('[name=mapNode]').fill(''); await page.locator('#lfl-review-confirmed').check(); await click('confirm-rows');
  await waitAsync(async id => (await (await import('./loop-field-store.mjs')).loadJob(id))?.devices.length === 6, firstId); await idle();
  current = await readJob(); assert.equal(current.devices.find(device => device.address === 3).mapNode, null); assert.ok(current.devices.every(device => device.sourcePhotoIds.includes(sourcePhoto.id)));
  assert.equal(current.inventoryScope.inventoryComplete, false); await step('devices'); assert.match(await page.locator('.lfl-map-groups').innerText(), /Address 42/);
  check('Real OCR associates documented columns; serials/summaries are excluded, duplicates block approval, corrections and unknown Map retain photo provenance', { milliseconds: result.firstOCRMs, confidence: sourcePhoto.ocr.confidence });

  stage = 'partial inventory and independent topology';
  await submit(await observe({ note: 'Synthetic first photographed page only; completeness not yet established.' }));
  let assessment = await evaluated(); assert.equal(assessment.tests.at(-1).coverageComplete, false); assert.equal(assessment.tests.at(-1).comparisonEligible, false); assert.match(assessment.tests.at(-1).interpretation, /unrecorded devices.*not assessed|does not establish a healthy/i);
  await step('devices'); const scopeForm = page.locator('#lfl-inventory-form');
  await fields(scopeForm, { inventoryComplete: true, expectedDeviceCount: '7', confirmation: 'Synthetic complete-list check says six devices.' });
  await scopeForm.locator('button[type=submit]').click(); await page.getByRole('alert').first().waitFor(); assert.equal((await readJob()).inventoryScope.inventoryComplete, false);
  await fields(scopeForm, { expectedDeviceCount: '6' }); await submit(scopeForm);
  assert.equal((await readJob()).tests[0].scopeSnapshot.inventoryComplete, false); assert.equal((await readJob()).tests[0].needsReview, true);
  await step('sections'); const sectionForm = page.locator('#lfl-section-form');
  await fields(sectionForm, { name: 'Same Map group — route still unknown', topologyEvidence: '', topologyConfirmed: false });
  const firstTwo = (await readJob()).devices.slice(0,2).map(device => device.id);
  for (const id of firstTwo) await sectionForm.locator(`[name=deviceIds][value="${id}"]`).check();
  await submit(sectionForm); const section = (await readJob()).sections[0]; assert.equal(section.topologyConfirmed, false);
  await submit(await observe({ before: '10', after: '12', sectionIds: [section.id], note: 'Addresses and matching Map values do not establish the physical route.' }));
  assert.ok((await evaluated()).tests.at(-1).reasons.some(reason => /unverified topology/.test(reason)));
  await step('sections'); await click('edit-section', section.id);
  await fields(sectionForm, { topologyEvidence: 'Synthetic QA drawing QA-01, checked route between labelled points A and B; no live panel action.', topologyConfirmed: true, reason: 'Independent route evidence was added; earlier test snapshot remains unverified.' });
  await submit(sectionForm); assert.equal((await readJob()).tests.at(-1).sectionSnapshot[0].topologyConfirmed, false);
  check('Partial photographs and mismatched expected counts cannot establish full coverage; Map ties do not prove a section; later evidence preserves original snapshots');

  stage = 'actual counters, polls and comparison boundaries';
  await submit(await observe({ before: '10', after: '12', hour: 10, polls: true, note: 'Known baseline; independently supplied poll denominator.' }));
  assessment = await evaluated(); assert.equal(assessment.tests.at(-1).delta, 2); assert.equal(assessment.tests.at(-1).pollDelta, 600); assert.equal(assessment.tests.at(-1).durationSeconds, 3600);
  await submit(await observe({ before: '12', after: '12', hour: 11, note: 'Quiet equal window is an observation, not a healthy-system finding.' }));
  assessment = await evaluated(); assert.equal(assessment.comparisons.at(-1).comparable, true); assert.equal(assessment.comparisons.at(-1).change, 'lower'); assert.match(assessment.tests.at(-1).interpretation, /does not establish a healthy loop/);
  const omitted = (await readJob()).devices.at(-1).id;
  await submit(await observe({ before: '0', after: '0', reset: 'before-window', resetNote: 'Synthetic counter reset at the recorded start; zero explicitly checked.', hour: 12, excluded: [omitted] }));
  assessment = await evaluated(); assert.equal(assessment.comparisons.at(-1).comparable, false); assert.ok(assessment.comparisons.at(-1).reasons.some(reason => /coverage differs/.test(reason))); assert.equal(assessment.tests.at(-1).coverageComplete, false);
  await submit(await observe({ before: '5', after: '1', reset: 'during-window', resetNote: 'Reset time was not recorded precisely; retain both raw readings.', hour: 13, unavailable: [omitted] }));
  assessment = await evaluated(); assert.equal(assessment.tests.at(-1).delta, null); assert.equal(assessment.tests.at(-1).comparisonEligible, false);
  await submit(await observe({ before: '', after: '9', times: false, note: 'Only the current raw total was captured.' }));
  assessment = await evaluated(); assert.equal(assessment.tests.at(-1).delta, null); assert.equal(assessment.tests.at(-1).durationSeconds, null);
  let invalid = await observe({ before: '10', after: '2', hour: 14 }); const beforeInvalid = (await readJob()).tests.length;
  await invalid.locator('button[type=submit]').click(); await page.getByRole('alert').first().waitFor(); assert.match(await page.getByRole('alert').first().innerText(), /decreased|reset/i); assert.equal((await readJob()).tests.length, beforeInvalid);
  await fields(invalid, { missedBefore: '0', missedAfter: '1', pollsBefore: '10', pollsAfter: '20', pollsSource: '' });
  await invalid.locator('button[type=submit]').click(); await page.getByRole('alert').first().waitFor(); assert.match(await page.getByRole('alert').first().innerText(), /poll.*source|source.*poll/i); assert.equal((await readJob()).tests.length, beforeInvalid);
  await click('clear-test');
  check('Recorded timestamps/counters drive deltas; equal coverage can compare, excluded or unknown coverage cannot, quiet is not healthy, resets/raw-only readings retain uncertainty, polls require a source');

  stage = 'corrections retain source and dependent evidence';
  current = await readJob(); const correctionTarget = current.devices[0], originalAddress = correctionTarget.address;
  await step('devices'); await click('edit-device', correctionTarget.id); const deviceForm = page.locator('#lfl-device-form');
  await fields(deviceForm, { address: '2', reason: 'Rechecked the synthetic source photograph: earlier address transcription was wrong.' }); await submit(deviceForm);
  current = await readJob(); assert.equal(current.devices[0].address, 2); assert.ok(current.tests.every(test => test.needsReview)); assert.ok(current.tests.every(test => test.deviceSnapshot.find(device => device.id === correctionTarget.id).address === originalAddress));
  const correction = current.history.find(event => event.type === 'correct-device'); assert.equal(correction.before.address, originalAddress); assert.equal(correction.after.address, 2); assert.ok(current.devices[0].sourcePhotoIds.includes(sourcePhoto.id));
  await step('tests'); const toReview = current.tests.find(test => test.missedBefore === 10 && test.pollsSource);
  await click('edit-test', toReview.id); const testForm = page.locator('#lfl-test-form'); await fields(testForm, { reason: 'Rechecked this baseline against the corrected device inventory and retained source.' }); await submit(testForm);
  assert.equal((await readJob()).tests.find(test => test.id === toReview.id).needsReview, false); assert.ok((await readJob()).history.some(event => event.type === 'correct-test' && event.before.needsReview === true));
  check('A corrected device retains its photo and old values; dependent observations are marked for review and explicit review has its own history');

  stage = 'handover and outstanding restoration';
  await step('handover'); const impairmentForm = page.locator('#lfl-impairment-form');
  await fields(impairmentForm, { description: 'Synthetic recorded isolation only: area A protection affected; QA authorisation/monitoring arrangements noted, reinstate and retest required.' }); await submit(impairmentForm);
  const handoverForm = page.locator('#lfl-handover-form'); await fields(handoverForm, { note: 'Recorded mixed counter evidence. Cause and repair remain unconfirmed.', outstanding: 'Independent inspection, review stale observations and confirm final functional retest.' }); await submit(handoverForm);
  assessment = await evaluated(); assert.equal(assessment.restoration.complete, false); assert.match(assessment.handoverSummary, /Restoration outstanding/);
  const restoreForm = page.locator('.lfl-restoration-form').first(); await fields(restoreForm, { evidence: 'Synthetic restoration record: connection reinstated and engineer functional check recorded; electrical cause still unresolved.' }); await submit(restoreForm);
  assessment = await evaluated(); assert.equal(assessment.restoration.complete, true); assert.match(assessment.restoration.statement, /does not verify overall system health/);
  check('Handover preserves an open impairment; recording restoration remains distinct from a cause confirmation or healthy-system certificate');

  stage = 'export, independent import and multiple jobs';
  const originalJob = await readJob(); const downloading = page.waitForEvent('download'); await click('export'); const downloaded = await downloading;
  const exportedText = await fs.readFile(await downloaded.path(), 'utf8'), exported = JSON.parse(exportedText);
  assert.equal(exported.format, 'findr-loop-field-job'); assert.equal(exported.photoBytesIncluded, false); assert.deepEqual(exported.job.history, originalJob.history);
  const chooser = page.waitForEvent('filechooser'); await click('import'); await (await chooser).setFiles({ name: 'synthetic-loop-job.json', mimeType: 'application/json', buffer: Buffer.from(exportedText) });
  await waitAsync(async () => (await (await import('./loop-field-store.mjs')).listJobs()).length === 2); await idle();
  const importedId = await selectedId(); assert.notEqual(importedId, firstId); current = await readJob(); assert.equal(current.devices.length, 6); assert.ok(current.photos.every(photo => photo.binaryAvailable === false)); assert.equal(await page.evaluate(async ({ id, photoId }) => (await import('./loop-field-store.mjs')).loadPhoto(id, photoId), { id: importedId, photoId: sourcePhoto.id }), null);
  await step('capture'); await page.getByText(/original image is not stored on this device/i).waitFor();
  const secondId = await createJob('QA West building', '2'); await click('manual-rows');
  const manualRow = page.locator('[data-review-row]').first(); await manualRow.locator('[name=address]').fill('2'); await manualRow.locator('[name=mapNode]').fill('9'); await manualRow.locator('[name=label]').fill('Separate loop, same address allowed');
  await page.locator('#lfl-review-confirmed').check(); await click('confirm-rows');
  await waitAsync(async id => (await (await import('./loop-field-store.mjs')).loadJob(id))?.devices.length === 1, secondId); await idle();
  assert.equal((await readJob()).tests.length, 0); assert.equal((await readJob()).impairments.length, 0); assert.equal((await readJob(firstId)).devices.length, 6);
  await page.reload(); await page.locator('#lfl-job-select').waitFor(); assert.equal(await selectedId(), secondId); assert.equal((await readJob()).devices[0].mapNode, 9);
  await page.locator('#lfl-job-select').selectOption(firstId); await page.locator('.lfl-job-context strong').filter({ hasText: 'QA East building' }).waitFor(); await idle();
  assert.deepEqual((await readJob()).history, originalJob.history);
  check('Export includes full provenance/history and explicitly excludes image bytes; import creates an independent job with honest missing-photo notice; other jobs share no device/impairment state');

  stage = 'pending originals survive reload and cancellation';
  await step('capture'); let photoCount = (await readJob()).photos.length;
  await page.locator('#lfl-photo-files').setInputFiles(genericPhoto);
  await waitAsync(async ({ id, count }) => { const job = await (await import('./loop-field-store.mjs')).loadJob(id); return job?.photos.length === count + 1 && job.photos.at(-1).ocr.state === 'pending'; }, { id: firstId, count: photoCount });
  const pendingPhoto = (await readJob()).photos.at(-1); await page.reload(); await page.locator('#lfl-job-select').waitFor(); await step('capture');
  await page.locator('#lfl-photo-select').selectOption(pendingPhoto.id); assert.equal(await action('cancel-ocr').count(), 0); assert.equal(await page.evaluate(async ({ id, photoId }) => (await (await import('./loop-field-store.mjs')).loadPhoto(id, photoId)) instanceof Blob, { id: firstId, photoId: pendingPhoto.id }), true);
  await click('retry-ocr'); await action('cancel-ocr').waitFor(); await click('cancel-ocr'); await action('cancel-ocr').waitFor({ state: 'hidden' }); await idle();
  current = await readJob(); assert.equal(current.photos.length, photoCount + 1); assert.equal(current.photos.find(photo => photo.id === pendingPhoto.id).ocr.error.code, 'LOOP_PHOTO_CANCELLED');
  await click('retry-ocr'); await action('cancel-ocr').waitFor(); await action('cancel-ocr').waitFor({ state: 'hidden' });
  await waitAsync(async ({ id, photoId }) => (await (await import('./loop-field-store.mjs')).loadJob(id))?.photos.find(photo => photo.id === photoId)?.ocr.suggestions.length === 2, { id: firstId, photoId: pendingPhoto.id }, { timeout: 120000 });
  current = await readJob(); assert.equal(current.photos.length, photoCount + 1); assert.equal(current.devices.length, 6, 'Retried suggestions are not automatically confirmed'); assert.deepEqual((await readJob(secondId)).photos, []);
  check('Original photo is atomically saved before OCR, survives an interrupted page, can be cancelled/retried without duplicate identity, and never moves to a different job');

  stage = 'unreadable photo and atomic storage failure';
  photoCount = (await readJob()).photos.length;
  await page.locator('#lfl-photo-files').setInputFiles({ name: 'synthetic-broken.png', mimeType: 'image/png', buffer: Buffer.from('This is intentionally not a decodable image.') });
  await waitAsync(async ({ id, count }) => { const job = await (await import('./loop-field-store.mjs')).loadJob(id); return job?.photos.length === count + 1 && job.photos.at(-1).ocr.error; }, { id: firstId, count: photoCount }); await idle();
  current = await readJob(); assert.equal(current.photos.at(-1).ocr.error.code, 'LOOP_PHOTO_UNREADABLE'); assert.equal(current.devices.length, 6);
  const beforeQuota = await readJob();
  await page.evaluate(() => { window.__fieldPut = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function (value, key) { if (String(key).startsWith('loop-field-photo-v1:')) throw new DOMException('Synthetic photo quota failure', 'QuotaExceededError'); return window.__fieldPut.call(this, value, key); }; });
  await page.locator('#lfl-photo-files').setInputFiles(blankPhoto);
  await page.getByText(/could not be saved|storage is full|couldn.t save/i).first().waitFor();
  assert.deepEqual((await readJob()).photos, beforeQuota.photos); assert.equal((await readJob()).devices.length, 6);
  assert.match(await page.locator('.lfl-photo-caption').innerText(), /not yet saved|not saved|unsaved/i);
  await page.evaluate(() => { IDBObjectStore.prototype.put = window.__fieldPut; delete window.__fieldPut; });
  await click('retry-save'); await waitAsync(async ({ id, count }) => (await (await import('./loop-field-store.mjs')).loadJob(id))?.photos.length === count + 1, { id: firstId, count: beforeQuota.photos.length }); await idle();
  const recoveredPhoto = (await readJob()).photos.at(-1);
  assert.equal(await page.evaluate(async ({ id, photoId }) => (await (await import('./loop-field-store.mjs')).loadPhoto(id, photoId)) instanceof Blob, { id: firstId, photoId: recoveredPhoto.id }), true);
  await click('retry-ocr');
  await waitAsync(async ({ id, count }) => { const job = await (await import('./loop-field-store.mjs')).loadJob(id); return job?.photos.length === count + 1 && job.photos.at(-1).ocr.error; }, { id: firstId, count: beforeQuota.photos.length }, { timeout: 120000 }); await idle();
  assert.equal((await readJob()).photos.at(-1).ocr.error.code, 'LOOP_PHOTO_UNREADABLE');
  check('Invalid and blank images retain originals with honest recovery; injected photo quota failure remains visibly unsaved, then Retry saves the retained original without duplicating the photo');

  stage = 'responsive layout and exact resume';
  await step('tests'); await fields(page.locator('#lfl-test-form'), { notes: 'Unsubmitted synthetic draft survives reopening.' }); await page.waitForTimeout(700); await idle();
  for (const [width, height] of [[390,844],[820,1180],[1440,1000],[390,430]]) {
    await page.setViewportSize({ width, height }); await fits(); await page.locator('#lfl-test-form [name=notes]').focus(); await screenshot(`${width}x${height}-readings`);
  }
  await page.setViewportSize({ width:390, height:844 });
  const resume = await readJob(); await page.reload(); await page.locator('#lfl-job-select').waitFor(); assert.equal(await selectedId(), firstId);
  await step('tests'); assert.equal(await page.locator('#lfl-test-form [name=notes]').inputValue(), 'Unsubmitted synthetic draft survives reopening.'); assert.deepEqual(await readJob(), resume);
  assert.deepEqual(await page.evaluate(async () => (await import('./cause-effect-store.mjs')).listProjects()), originalMatrices);
  assert.deepEqual(await page.evaluate(async () => (await import('./db.mjs')).setting('panel-lab-protec-loop-v1')), originalPractice);
  assert.deepEqual(result.errors, []);
  check('Phone/tablet/large-touch/reduced-height views fit; saved job and draft resume exactly; separate practice and matrix are unchanged; no page errors');

  stage = 'deep-link preference and ordinary reopen';
  await page.goto(base + '#panel-lab/loops'); await page.locator('.pll-root').waitFor();
  await page.goto(base + '#panel-lab/loop-log'); await page.locator('#lfl-job-select').waitFor();
  await page.locator('header [data-nav=home]').click(); await page.locator('#home-dashboard').waitFor();
  await page.locator('header [data-nav=panel-lab]').click(); await page.locator('#lfl-job-select').waitFor();
  assert.equal(await page.locator('[data-panel-lab-action=loop-mode][data-id=site]').first().getAttribute('aria-pressed'), 'true');
  await page.reload(); await page.locator('#lfl-job-select').waitFor(); assert.equal(await selectedId(), firstId);
  assert.deepEqual(await readJob(), resume);
  check('Explicit practice→field deep links persist the chosen site mode through ordinary navigation and reload');

  stage = 'fine-pointer desktop';
  const desktop = await context.browser().newContext({ viewport: { width:1440, height:1000 }, reducedMotion:'reduce', serviceWorkers:'block' });
  const desktopPage = await desktop.newPage(); desktopPage.on('pageerror', error => result.errors.push(error.message)); await desktopPage.goto(base + '#panel-lab/loop-log');
  await desktopPage.locator('#findr-startup').waitFor({ state:'detached' }); await desktopPage.locator('#lfl-job-select').waitFor();
  assert.ok(await desktopPage.evaluate(() => matchMedia('(pointer:fine)').matches && document.documentElement.scrollWidth <= innerWidth + 1));
  await desktopPage.screenshot({ path:path.join(output, `${label}-desktop-fine-pointer.png`) }); result.screenshots.push(`${label}-desktop-fine-pointer.png`); await desktop.close();
  assert.deepEqual(result.errors, []);
  check('Separate fine-pointer desktop reaches the real field route and fits at1440px');

  result.status = 'passed';
} catch (error) {
  result.status = 'failed'; result.stage = stage; result.error = { message: error.message, stack: error.stack }; process.exitCode = 1;
  await screenshot('failure').catch(() => {});
} finally {
  result.elapsedMs = Date.now() - startedAt;
  await fs.writeFile(path.join(output, `${label}-verification.json`), JSON.stringify(result, null, 2));
  await context?.close(); console.log(JSON.stringify({ status: result.status, stage, checks: result.checks.length, error: result.error?.message }));
}
