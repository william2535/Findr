// Real UI integration checks. Only isolated synthetic browser storage is used.
// PLAYWRIGHT_MODULE selects an installed Playwright package. Browser overrides:
// FINDR_LOOP_BROWSER, FINDR_CHROMIUM, FINDR_WEBKIT. Other options: FINDR_LOOP_URL,
// FINDR_LOOP_OUTPUT, FINDR_LOOP_OFFLINE=1 and FINDR_LOOP_MANUAL (reviewed PDF path).
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browserName = process.env.FINDR_LOOP_BROWSER || 'chromium';
const base = process.env.FINDR_LOOP_URL || 'http://127.0.0.1:4184/app/';
const output = process.env.FINDR_LOOP_OUTPUT || '/tmp/findr-protec-loop-qa';
const offline = process.env.FINDR_LOOP_OFFLINE === '1';
const manual = process.env.FINDR_LOOP_MANUAL;
const key = 'panel-lab-protec-loop-v1';
const hash = '0e841fa49b0a24fac91d5c7cde6987e4b311974d0a96ee78643e0ca17a2bfeb0';
const recordId = 'protec-aee99ea8ed2b';
const label = browserName + (offline ? '-offline' : '');
const startedAt = Date.now();
const result = { browser: browserName, base, offline, physicalDevice: false, checks: [], errors: [], screenshots: [] };
await fs.mkdir(output, { recursive: true });
let browser, context, page, stage = 'launch';
const action = name => page.locator(`[data-loop-action="${name}"]`).first();
const check = (name, details) => { result.checks.push({ name, ...(details ? { details } : {}) }); console.log('PASS ' + name); };
// Explicitly await browser promises; waitForFunction must not receive async predicates.
async function waitAsync(predicate, argument, { timeout = 30000 } = {}) {
  const deadline = Date.now() + timeout; let lastError;
  while (Date.now() < deadline) {
    try { if (await page.evaluate(predicate, argument)) return; } catch (error) { lastError = error; }
    await page.waitForTimeout(60);
  }
  throw new Error(`Timed out awaiting browser data${lastError ? ': ' + lastError.message : ''}`);
}
const saved = () => page.evaluate(async key => (await import('./db.mjs')).setting(key), key);
const view = () => page.evaluate(async key => (await import('./protec-loop-engine.mjs')).evaluateLoopRun(await (await import('./db.mjs')).setting(key)), key);
const matrices = () => page.evaluate(async () => (await import('./cause-effect-store.mjs')).listProjects());
const idle = () => page.waitForFunction(() => document.querySelector('#pl-loop-save-status')?.textContent === 'Exercise saved on this device');
async function reveal(locator) {
  const closed = await locator.evaluate(node => {
    const list = []; for (let current = node; current; current = current.parentElement) if (current.tagName === 'DETAILS' && !current.open) list.unshift(current.dataset.loopDisclosure);
    return list;
  });
  for (const id of closed) await page.locator(`details[data-loop-disclosure="${id}"] > summary`).click();
}
async function click(name) { const target = action(name); await reveal(target); await target.click(); }
async function waitActions(count) { await waitAsync(async ({ key, count }) => (await (await import('./db.mjs')).setting(key))?.actions.length === count, { key, count }); await idle(); }
async function step(name) { const count = (await saved())?.actions.length || 0; await click(name); await waitActions(count + 1); }
async function configure(id) {
  const count = (await saved()).actions.length;
  const form = page.locator('#pll-configuration-form'); await reveal(form);
  await page.locator('#pll-configuration').selectOption(id); await form.locator('button[type=submit]').click(); await waitActions(count + 1);
}
async function conclude(kind, section, note) {
  const count = (await saved()).actions.length, form = page.locator('#pll-conclusion-form'); await reveal(form);
  await form.locator('[name=kind]').selectOption(kind);
  if (await form.locator('[name=sectionId]').isEnabled()) await form.locator('[name=sectionId]').selectOption(section || '');
  await form.locator('[name=note]').fill(note); await form.locator('button[type=submit]').click(); await waitActions(count + 1);
}
async function newScenario(id) {
  await page.locator('#pll-scenario').selectOption(id); await click('confirm-restart'); await idle();
  assert.equal((await saved()).scenarioId, id); assert.equal((await saved()).actions.length, 0);
}
async function start() { await step('acknowledge'); await step('map'); await step('verify-topology'); await step('reset-counts'); }
async function finish() { await step('restore'); await step('reset-counts'); await step('observe'); await step('finish'); assert.equal((await view()).complete, true); }
async function fits() { assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Body fits; diagrams and tables may scroll inside bounded regions'); }
async function shot(name) { const file = `${label}-${name}.png`; await page.screenshot({ path: path.join(output, file), fullPage: false }); result.screenshots.push(file); }
async function tableRows(selector) { return page.locator(selector + ' tbody tr').evaluateAll(rows => rows.map(row => [...row.children].map(cell => cell.textContent.trim()))); }
async function citation() {
  const target = page.locator('[data-loop-action=source][data-source=counts]'); await reveal(target); await target.click(); await page.locator('#modal[open]').waitFor();
}
async function seedManual(file, metadataHash = hash) {
  const encoded = (await fs.readFile(file)).toString('base64');
  await page.evaluate(async ({ encoded, metadataHash, recordId }) => {
    const catalogue = await fetch('./data/catalogue.json').then(response => response.json());
    const record = catalogue.records.find(item => item.id === recordId);
    const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    await (await import('./db.mjs')).saveManual({ ...record, fileHash: metadataHash, bytes: bytes.length, savedAt: Date.now() }, new Blob([bytes], { type: 'application/pdf' }));
  }, { encoded, metadataHash, recordId });
  await page.reload(); await page.locator('.pll-root').waitFor();
}
async function offlineShell() {
  const start = Date.now();
  while (Date.now() - start < 180000) {
    const status = await page.evaluate(async () => {
      if (!navigator.serviceWorker.controller) return null;
      return new Promise(resolve => {
        const channel = new MessageChannel(), timer = setTimeout(() => resolve(null), 3000);
        channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data?.ready ? event.data : null); };
        navigator.serviceWorker.controller.postMessage({ type: 'CHECK_OFFLINE' }, [channel.port2]);
      });
    });
    if (status) return { ...status, verificationWaitMs: Date.now() - start };
    await page.waitForTimeout(300);
  }
  throw Error('The real service worker did not verify all required offline assets');
}

try {
  const executablePath = process.env[browserName === 'webkit' ? 'FINDR_WEBKIT' : 'FINDR_CHROMIUM'];
  browser = await pw[browserName].launch({ headless: true, ...(executablePath ? { executablePath } : {}), ...(browserName === 'chromium' ? { args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {}) });
  result.browserVersion = browser.version();
  stage = 'fine-pointer desktop entry';
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const desktopPage = await desktop.newPage();
  desktopPage.on('pageerror', error => result.errors.push(error.message));
  await desktopPage.goto(base + '#home');
  await desktopPage.locator('#findr-startup').waitFor({ state: 'detached' });
  await desktopPage.locator('header [data-nav=panel-lab]').click();
  await desktopPage.locator('[data-panel-lab-action=tab][data-tab=loop-diagnostics]').click();
  const desktopPractice = desktopPage.locator('[data-panel-lab-action=loop-mode][data-id=practice]');
  if (await desktopPractice.count()) await desktopPractice.click();
  await desktopPage.locator('.pll-root').waitFor();
  assert.ok(await desktopPage.evaluate(() => matchMedia('(pointer:fine)').matches && document.documentElement.scrollWidth <= innerWidth + 1));
  await desktopPage.locator('[data-loop-action=acknowledge]').first().click();
  await desktopPage.waitForFunction(() => document.querySelector('#pl-loop-save-status')?.textContent === 'Exercise saved on this device');
  await desktopPage.screenshot({ path: path.join(output, `${label}-desktop-fine-pointer.png`) });
  result.screenshots.push(`${label}-desktop-fine-pointer.png`);
  await desktop.close();
  check('Fine-pointer desktop opens the normal navigation entry, saves a real action and fits at 1440px');
  const contextOptions = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce', acceptDownloads: true, serviceWorkers: offline ? 'allow' : 'block' };
  // Linux WebKit's ephemeral context rejects IndexedDB Blob writes even for 3 bytes.
  // A fresh persistent profile exercises real Blob storage, as a normal install does.
  if (browserName === 'webkit') {
    await browser.close();
    context = await pw.webkit.launchPersistentContext(await fs.mkdtemp(path.join(output, 'webkit-profile-')), { ...contextOptions, headless: true, ...(executablePath ? { executablePath } : {}) });
    browser = context.browser();
    result.storageContext = 'Fresh persistent profile; actual IndexedDB Blob records';
  } else context = await browser.newContext(contextOptions);
  page = await context.newPage(); page.setDefaultTimeout(30000);
  page.on('pageerror', error => { if (error.message !== 'Context is stopped') result.errors.push(error.message); });
  stage = 'normal entry and matrix preservation';
  await page.goto(base + '#home'); await page.locator('#home-dashboard').waitFor(); await page.locator('#findr-startup').waitFor({ state: 'detached' });
  await page.locator('header [data-nav=panel-lab]').click(); await page.locator('.pl-matrix').waitFor();
  await page.waitForFunction(() => document.querySelector('#pl-save-status')?.textContent.startsWith('Saved on this device'));
  const cell = page.locator('.pl-cell').first(); await cell.click();
  await page.waitForFunction(() => document.querySelector('#pl-save-status')?.textContent.startsWith('Saved on this device'));
  const originalMatrices = await matrices();
  await page.locator('[data-panel-lab-action=tab][data-tab=loop-diagnostics]').click();
  const practiceChoice = page.locator('[data-panel-lab-action=loop-mode][data-id=practice]');
  if (await practiceChoice.count()) await practiceChoice.click();
  await page.locator('.pll-root').waitFor(); await fits();
  assert.match(await page.locator('.pll-root').innerText(), /No live panel is connected/);
  assert.ok(await action('observe').count() === 0 || await action('observe').isDisabled(), 'Observations are unavailable before prerequisites');
  check('Normal Panel Lab entry opens Loop diagnostics and retains the existing edited matrix');

  stage = 'scope, map and address order'; await start();
  const deviceList = page.locator('.pll-device-list'); await reveal(deviceList);
  await page.locator('#pll-list-order').selectOption('address');
  assert.deepEqual((await tableRows('.pll-device-list')).map(row => Number(row[0])), [3, 7, 12, 16, 27, 42, 65, 91]);
  await page.locator('#pll-list-order').selectOption('map');
  assert.deepEqual((await tableRows('.pll-device-list')).map(row => Number(row[0])), [42, 7, 65, 12, 3, 91, 27, 16]);
  assert.match(await page.locator('.pll-map-panel').innerText(), /same Map node remain a group/);
  await click('hint'); await page.locator('.pll-hint').waitFor();
  check('Addresses and Map groups use different order; exact survey positions are explicitly independent; real hints open');

  stage = 'one-hour counts and premature finding';
  await step('observe'); let current = await view(); assert.equal(current.seconds, 3600); assert.equal(current.observations[0].totalMissedDelta, 15);
  await step('observe'); current = await view(); assert.equal(current.observations[1].totalMissedDelta, 15); assert.equal(current.observations[1].cumulativeLost, 30);
  const firstRow = (await tableRows('.pll-observations')).find(row => row[0] === '42'); assert.deepEqual(firstRow.slice(2), ['Polled', '60', '1', '2']);
  await conclude('localised', 'c', 'Premature hypothesis: section C needs comparison evidence.');
  const premature = await saved(); await click('finish'); await page.getByRole('alert').waitFor(); assert.deepEqual(await saved(), premature); assert.equal((await view()).complete, false);
  check('Each action advances one synthetic hour; interval deltas stay separate from cumulative counts; premature completion is rejected');

  stage = 'virtual splits and coverage';
  for (const id of ['half-a', 'half-b', 'c', 'd']) {
    await configure(id); await step('reset-counts'); await step('observe'); await step('observe');
    current = await view();
    assert.equal(current.observations.at(-1).seconds, 3600);
    assert.equal(current.observations.at(-1).totalMissedDelta, { 'half-a': 0, 'half-b': 8, c: 5, d: 0 }[id]);
    const unpolled = (await tableRows('.pll-observations')).filter(row => row[2] === 'Not polled');
    assert.ok(unpolled.length > 0); assert.ok(unpolled.every(row => row.slice(3).every(value => value === '—')));
  }
  assert.deepEqual((await view()).candidates, ['c']);
  check('Repeat equal windows localise synthetic section C; excluded devices display Not polled and dashes, never healthy zero readings');

  stage = 'viewport and navigation persistence';
  const snapshot = await saved();
  for (const [width, height] of [[390, 844], [820, 1180], [1440, 1000]]) {
    await page.setViewportSize({ width, height }); await fits(); await page.locator('.pll-map-panel').scrollIntoViewIfNeeded(); await shot(`${width}-map`);
    assert.ok((await action('observe').boundingBox()).height >= 44);
  }
  await page.setViewportSize({ width: 390, height: 430 }); await reveal(page.locator('#pll-conclusion-form')); await page.locator('#pll-conclusion-form [name=note]').focus(); await fits(); await shot('short-viewport-focused');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('header [data-nav=home]').click(); await page.locator('#home-dashboard').waitFor();
  await page.goto(base + '#panel-lab/loops'); await page.locator('.pll-root').waitFor(); assert.deepEqual(await saved(), snapshot);
  await page.reload(); await page.locator('.pll-root').waitFor(); assert.deepEqual(await saved(), snapshot); assert.deepEqual(await matrices(), originalMatrices);
  check('Phone, tablet, large touch and reduced-height layouts fit; alias/navigation/reload preserve exact actions and unrelated matrix');

  stage = 'restoration and honest completion';
  await conclude('localised', 'c', 'Repeated covered one-hour tests narrow survey section C. Electrical cause and repair remain unconfirmed.');
  await step('restore'); await step('reset-counts'); await step('observe');
  assert.ok((await view()).observations.at(-1).totalMissedDelta > 0);
  await configure('c'); const invalidated = await saved(); await click('finish'); await page.getByRole('alert').waitFor(); assert.deepEqual(await saved(), invalidated);
  await finish(); current = await view(); assert.equal(current.seconds, 43200); assert.ok(current.uncertainties.some(text => /remains outstanding/.test(text)));
  assert.match(await page.locator('.pll-restoration').innerText(), /not a repair certificate/);
  await reveal(page.locator('.pll-evidence-log')); const exportEvent = page.waitForEvent('download'); await click('export'); const download = await exportEvent;
  const exported = JSON.parse(await fs.readFile(await download.path(), 'utf8')); assert.equal(exported.format, 'findr-loop-training-log'); assert.equal(exported.result.complete, true); assert.deepEqual(exported.run, await saved()); assert.ok(exported.sources.every(source => source.sha256 === hash));
  check('Later configuration changes invalidate restoration; completed exported handover retains missed replies and unconfirmed cause/repair');

  stage = 'intermittent and incomplete scenarios';
  await newScenario('intermittent'); await start(); for (let i = 0; i < 3; i++) await step('observe');
  assert.deepEqual((await view()).observations.map(sample => sample.totalMissedDelta), [15, 0, 15]);
  await conclude('unresolved', '', 'One quiet hour did not exclude an intermittent fault. Continue observation.'); await finish(); assert.match((await view()).uncertainties.join(' '), /quiet window cannot exclude/);
  await newScenario('incomplete'); await start();
  assert.equal(await page.locator('.pll-diagram').count(), 0, 'An incomplete route must not invent an exact wiring drawing');
  await reveal(page.locator('.pll-device-list'));
  const incompleteRows = await tableRows('.pll-device-list'); assert.ok(incompleteRows.every(row => /unknown|unverified|not confirmed/i.test(row[3])));
  assert.ok(await page.locator('#pll-configuration option:not([value=whole])').evaluateAll(options => options.every(option => option.disabled)));
  await step('observe'); await step('observe');
  const missing = (await tableRows('.pll-observations')).find(row => row[0] === '16'); assert.deepEqual(missing.slice(2), ['Not polled', '—', '—', '—']);
  await conclude('unresolved', '', 'Address16 is not logged/polled and the physical route is unverified. Obtain a survey and investigate the missing device.'); await finish();
  current = await view(); assert.equal(current.restoration.wholeLoopCoverage, false); assert.match(current.uncertainties.join(' '), /Address 16.*not logged\/polled/);
  check('Intermittent quiet windows remain uncertain; incomplete map supplies no invented route, blocks splits and retains missing-address coverage at handover');

  stage = 'source citations and edition checks';
  await citation(); assert.match(await page.locator('#modal').innerText(), /6500|Commissioning/i); await page.locator('#modal [data-action=close-modal]').click();
  if (manual) {
    await seedManual(manual); await citation(); await page.waitForFunction(() => document.querySelector('#pdf-page')?.value === '21' && document.querySelector('#pdf-status')?.textContent === 'Saved PDF · offline');
    await page.locator('#modal [data-action=close-modal]').click();
    await seedManual(new URL('./fixtures/questions027/synthetic-quick-panel.pdf', import.meta.url)); await citation();
    await page.waitForFunction(() => document.querySelector('#pdf-page')?.value === '1' && document.querySelector('#pdf-status')?.textContent === 'Saved PDF · offline');
    assert.match(await page.locator('.wiring-reader-notice').innerText(), /differs.*reviewed|cited page has not been applied/);
    await page.locator('#modal [data-action=close-modal]').click(); await seedManual(manual);
    check('Reviewed manual opens PDFpage21; forged matching metadata with different actual bytes is rejected for that page and opens page1 with an edition warning');
  } else result.manualVerification = 'Skipped: FINDR_LOOP_MANUAL not supplied; only unsaved citation chooser was tested';

  stage = 'save failure and malformed saved data';
  await newScenario('mapped'); const beforeFailure = await saved();
  await page.evaluate(key => { window.__loopPut = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function (value, itemKey) { if (itemKey === key) throw new DOMException('Synthetic quota failure', 'QuotaExceededError'); return window.__loopPut.call(this, value, itemKey); }; }, key);
  await click('acknowledge'); await page.waitForFunction(() => document.querySelector('#pl-loop-save-status')?.textContent.includes('storage is full')); assert.deepEqual(await saved(), beforeFailure);
  await page.evaluate(() => { IDBObjectStore.prototype.put = window.__loopPut; delete window.__loopPut; }); await click('retry-save'); await waitActions(1);
  const valid = await saved(), malformed = { schemaVersion: 999, scenarioId: 'mapped', actions: [] };
  await page.evaluate(async ({ key, malformed }) => (await import('./db.mjs')).setSetting(key, malformed), { key, malformed }); await page.reload();
  await page.getByRole('alert').waitFor(); assert.match(await page.getByRole('alert').innerText(), /saved record has not been replaced/); assert.deepEqual(await saved(), malformed);
  await page.evaluate(async ({ key, valid }) => (await import('./db.mjs')).setSetting(key, valid), { key, valid }); await page.reload(); await page.locator('.pll-root').waitFor(); assert.deepEqual(await matrices(), originalMatrices);
  check('Injected quota failure preserves saved actions and supports Retry; malformed data is retained rather than silently replaced; matrices are unaffected');

  if (offline) {
    stage = 'real verified offline operation'; result.offlineShell = await offlineShell(); assert.equal(result.offlineShell.version, await page.evaluate(async () => (await import('./version.mjs')).APP_VERSION));
    await context.setOffline(true); await page.reload(); await page.locator('.pll-root').waitFor();
    await step('map'); await step('verify-topology'); await step('reset-counts'); await step('observe'); assert.equal((await view()).seconds, 3600);
    if (manual) { await citation(); await page.waitForFunction(() => document.querySelector('#pdf-page')?.value === '21' && document.querySelector('#pdf-status')?.textContent === 'Saved PDF · offline'); await page.locator('#modal [data-action=close-modal]').click(); }
    await page.reload(); await page.locator('.pll-root').waitFor(); assert.equal((await view()).seconds, 3600); assert.deepEqual(await matrices(), originalMatrices); await shot('offline-resumed');
    check('Actual SHA256-verified service-worker release runs new observations, reloads saved state and opens the downloaded citation with networking disabled', result.offlineShell);
  }
  assert.deepEqual(result.errors, []); result.status = 'passed';
} catch (error) {
  result.status = 'failed'; result.stage = stage; result.error = { message: error.message, stack: error.stack }; process.exitCode = 1;
  await shot('failure').catch(() => {});
} finally {
  result.elapsedMs = Date.now() - startedAt;
  await fs.writeFile(path.join(output, `${label}-verification.json`), JSON.stringify(result, null, 2));
  await context?.close(); await browser?.close(); console.log(JSON.stringify({ status: result.status, stage, checks: result.checks.length, error: result.error?.message }));
}
