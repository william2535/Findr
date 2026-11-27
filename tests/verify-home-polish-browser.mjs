// Focused Home journey verification in isolated browser profiles with synthetic PDF data.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const kind = process.env.FINDR_HOME_BROWSER || 'chromium';
const base = process.env.FINDR_HOME_URL || 'http://127.0.0.1:4187/app/';
const out = process.env.FINDR_HOME_OUTPUT || '/tmp/findr-home-polish-qa';
const offline = process.env.FINDR_HOME_OFFLINE === '1';
const label = kind + (offline ? '-offline' : '');
const results = { browser: kind, physicalDevice: false, offline, base, checks: [], errors: [], screenshots: [] };
await fs.mkdir(out, { recursive: true });
const profile = await fs.mkdtemp('/tmp/findr-home-' + kind + '-');
let context, page, stage = 'launch';
const check = (name, details) => {
  results.checks.push({ name, ...(details ? { details } : {}) }); console.log('PASS ' + name);
};
async function home() { await page.evaluate(() => location.hash = '#home'); await page.locator('#home-dashboard').waitFor(); }
async function reveal(locator) {
  const keys = await locator.evaluate(e => {
    const a = [];
    for (let n = e; n; n = n.parentElement) if (n.tagName === 'DETAILS' && !n.open)
      a.unshift(n.id ? '#' + n.id : '[data-home-extra="' + n.dataset.homeExtra + '"]');
    return a;
  });
  for (const selector of keys) await page.locator(selector + '>summary').click();
}
async function shot(name, fullPage = false) {
  await page.evaluate(() => scrollTo(0, 0));
  const file = label + '-' + name + '.png';
  await page.screenshot({ path: path.join(out, file), fullPage });
  results.screenshots.push(file);
}
async function noOverflow() {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'No horizontal page overflow');
}
async function verifiedShell() {
  const start = Date.now();
  while (Date.now() - start < 180000) {
    const status = await page.evaluate(async () => {
      if (!navigator.serviceWorker.controller) return null;
      return new Promise(resolve => {
        const c = new MessageChannel(), t = setTimeout(() => resolve(null), 5000);
        c.port1.onmessage = e => { clearTimeout(t); c.port1.close(); resolve(e.data?.ready ? e.data : null); };
        navigator.serviceWorker.controller.postMessage({ type: 'CHECK_OFFLINE' }, [c.port2]);
      });
    });
    if (status) return { ...status, waitMs: Date.now() - start };
    await page.waitForTimeout(300);
  }
  throw Error('Offline worker did not verify its complete cache');
}
try {
  context = await pw[kind].launchPersistentContext(profile, {
    headless: true,
    executablePath: kind === 'chromium' ? (process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium') : process.env.WEBKIT_EXECUTABLE,
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce',
    serviceWorkers: offline ? 'allow' : 'block',
    ...(kind === 'chromium' ? { args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {}),
  });
  results.browserVersion = context.browser()?.version();
  page = context.pages()[0] || await context.newPage();
  page.on('pageerror', e => results.errors.push({ message: e.message, stack: e.stack, stage, url: page.url() }));
  stage = 'open';
  await page.goto(base + '#home'); await page.locator('#home-dashboard').waitFor();
  results.appVersion = await page.evaluate(async () => (await import('./version.mjs')).APP_VERSION);
  if (offline) {
    stage = 'verify offline cache'; results.cache = await verifiedShell();
    check('Actual service worker verified all required release assets', results.cache);
  }
  stage = 'initial hierarchy';
  assert.match(await page.locator('#home-dashboard h1').textContent(), /Ready for the job/);
  assert.equal(await page.locator('[data-home-extra="install"]').evaluate(e => e.open), false);
  assert.equal(await page.locator('[data-home-extra="about"]').evaluate(e => e.open), false);
  results.initialHeight = await page.evaluate(() => ({ page: document.documentElement.scrollHeight, home: document.querySelector('#home-dashboard').offsetHeight }));
  check('Default Home keeps installation and About closed', results.initialHeight);
  await shot('phone', true);
  stage = 'layouts';
  for (const width of [320, 390, 820, 1440]) {
    await page.setViewportSize({ width, height: width === 820 ? 1180 : 844 });
    for (const layout of ['detailed', 'grid']) {
      await page.locator('[data-home-layout="' + layout + '"]').click(); await noOverflow();
      assert.equal(await page.locator('#home-dashboard').getAttribute('data-layout'), layout);
      const t = await page.locator('#home-toolbox>summary').boundingBox(), v = await page.locator('.home-view-options').boundingBox();
      assert.ok(t.x < v.x, 'Toolbox stays on the left');
      assert.ok(Math.abs(t.y - v.y) < 3, 'Toolbox and view controls share their row');
      assert.ok(t.width >= 44 && t.height >= 44, 'Toolbox touch target');
      const controls = await page.locator('[data-home-layout]').evaluateAll(xs => xs.map(x => ({ width: x.getBoundingClientRect().width, height: x.getBoundingClientRect().height })));
      assert.ok(controls.every(x => x.width >= 44 && x.height >= 44), 'View touch targets');
      await page.locator('#home-toolbox>summary').click();
      assert.ok(await page.locator('#home-toolbox').evaluate(e => e.open));
      assert.ok(await page.locator('#home-toolbox a[href="#toolbox/pack"]').isVisible()); await noOverflow();
      await page.locator('#home-toolbox>summary').click();
      if (layout === 'detailed' && width === 820) await shot('ipad');
      if (layout === 'detailed' && width === 1440) await shot('desktop');
      if (layout === 'grid' && width === 390) await shot('phone-grid', true);
    }
    check('Layouts, controls and toolbox fit ' + width + 'px');
  }
  stage = 'persist layout and disclosure';
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-home-layout="grid"]').click();
  await page.locator('[data-home-extra="install"]>summary').click();
  await page.locator('[data-home-layout="detailed"]').click();
  assert.ok(await page.locator('[data-home-extra="install"]').evaluate(e => e.open));
  await page.reload(); await page.locator('#home-dashboard').waitFor();
  assert.equal(await page.locator('#home-dashboard').getAttribute('data-layout'), 'detailed');
  assert.ok(await page.locator('[data-home-extra="install"]').evaluate(e => e.open));
  assert.ok(!(await page.locator('[data-home-extra="about"]').evaluate(e => e.open)));
  await page.locator('[data-home-extra="install"]>summary').click();
  await page.locator('[data-home-layout="grid"]').click();
  await page.reload(); await page.locator('#home-dashboard').waitFor();
  assert.equal(await page.locator('#home-dashboard').getAttribute('data-layout'), 'grid');
  check('Layout and independent disclosure choices survive reload');
  stage = 'navigation';
  for (const route of ['#downloads/saved', '#downloads/all', '#helpers', '#panel-lab', '#emulator', '#menus', '#panel-downloads', '#quizzes']) {
    await home();
    const link = page.locator('#home-dashboard a[href="' + route + '"]').first();
    await reveal(link); await link.click();
    await page.waitForFunction(hash => location.hash === hash, route);
    await page.waitForFunction(() => !document.querySelector('#home-dashboard') && document.querySelector('#app')?.textContent.trim().length > 10);
    assert.ok(!/FINDR couldn’t start/.test(await page.locator('#app').textContent()));
  }
  check('Every daily shortcut opens its real existing workspace');
  await home(); stage = 'app utilities';
  const update = page.locator('[data-action="check-app-update"]');
  await reveal(update); await update.scrollIntoViewIfNeeded(); assert.ok(await update.isVisible());
  await context.setOffline(true); await update.click();
  await page.waitForFunction(() => document.querySelector('[data-action="check-app-update"]')?.disabled === false && /online|connection|internet|offline/i.test(document.querySelector('#home-update-status')?.textContent || ''));
  assert.ok(await page.locator('#home-update-status').isVisible()); await context.setOffline(false);
  check('Update app is reachable and offline failure remains retryable');
  const storage = page.locator('#home-dashboard [data-action="storage"]');
  await reveal(storage); await storage.click(); await page.locator('#modal[open]').waitFor();
  await page.locator('#modal [data-action="close-modal"]').click();
  const chooserPromise = page.waitForEvent('filechooser');
  await page.locator('#home-dashboard [data-action="import"]').click();
  const chooser = await chooserPromise; await chooser.setFiles([]);
  check('Storage dialog, system PDF picker and offline status remain available');
  stage = 'saved data';
  const fixture = await fs.readFile(new URL('./fixtures/questions027/synthetic-quick-panel.pdf', import.meta.url));
  const seeded = await page.evaluate(async encoded => {
    const db = await import('./db.mjs'), [packs, catalogue] = await Promise.all(['packs', 'catalogue'].map(n => fetch('./data/' + n + '.json').then(r => r.json())));
    const pack = packs.find(p => p.record_ids.length > 1 && p.record_ids.every(id => catalogue.records.some(r => r.id === id && r.url)));
    const record = catalogue.records.find(r => r.id === pack.record_ids[0]);
    const raw = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    await db.saveManual({ ...record, title: 'Synthetic Home QA manual', bytes: raw.length, savedAt: Date.now() }, new Blob([raw], { type: 'application/pdf' }));
    return { id: record.id, pack: pack.id, bytes: raw.length };
  }, fixture.toString('base64'));
  await page.reload(); await page.locator('#home-dashboard').waitFor();
  assert.match(await page.locator('#home-dashboard a[href="#downloads/saved"]').first().innerText(), /1/);
  const packLink = page.locator('#home-dashboard a[href="#pack/' + seeded.pack + '"]');
  assert.equal(await packLink.count(), 1, 'Downloaded pack is not duplicated');
  assert.match(await packLink.innerText(), /1\s*\/\s*\d+.*saved|1.*saved/is);
  await packLink.click(); await page.waitForFunction(id => location.hash === '#pack/' + id, seeded.pack);
  await home();
  assert.equal(await page.locator('#home-dashboard a[href="#pack/' + seeded.pack + '"]').count(), 1, 'Frequent and downloaded pack are consolidated');
  await page.reload(); await page.locator('#home-dashboard').waitFor();
  const saved = await page.evaluate(async id => { const d = await import('./db.mjs'); return { count: (await d.allManuals()).length, bytes: (await d.getFile(id)).size }; }, seeded.id);
  assert.deepEqual(saved, { count: 1, bytes: seeded.bytes });
  check('Saved PDF bytes and real pack-use history survive reload without duplicate cards');
  stage = 'show more packs';
  const additional = await page.evaluate(async ({ encoded, previous }) => {
    const db = await import('./db.mjs'), [packs, catalogue] = await Promise.all(['packs', 'catalogue'].map(n => fetch('./data/' + n + '.json').then(r => r.json())));
    const raw = Uint8Array.from(atob(encoded), c => c.charCodeAt(0)), added = [], used = new Set([previous]);
    for (const pack of packs) {
      const record = catalogue.records.find(r => pack.record_ids.includes(r.id) && r.url && !used.has(r.id));
      if (!record || pack.record_ids.includes(previous)) continue;
      await db.saveManual({ ...record, title: 'Synthetic pagination QA manual', bytes: raw.length, savedAt: Date.now() }, new Blob([raw], { type: 'application/pdf' }));
      added.push(record.id); used.add(record.id); if (added.length === 4) break;
    }
    return added;
  }, { encoded: fixture.toString('base64'), previous: seeded.id });
  assert.equal(additional.length, 4);
  await page.reload(); await page.locator('#home-dashboard').waitFor();
  const cardsBefore = await page.locator('.home-pack-card').count();
  assert.ok(cardsBefore <= 4, 'Initial pack list is restrained');
  await page.locator('[data-action="more-home-packs"]').click();
  assert.ok(await page.locator('.home-pack-card').count() > cardsBefore, 'Show more reveals retained packs');
  const routes = await page.locator('.home-pack-card').evaluateAll(xs => xs.map(x => x.getAttribute('href')));
  assert.equal(new Set(routes).size, routes.length, 'No duplicates after Show more');
  await page.evaluate(async ids => { const db = await import('./db.mjs'); for (const id of ids) await db.removeManual(id); }, additional);
  await page.reload(); await page.locator('#home-dashboard').waitFor();
  check('Additional downloaded packs remain reachable with Show more and no duplicates');
  stage = 'compact viewport and motion';
  await page.setViewportSize({ width: 390, height: 430 }); await noOverflow();
  await page.locator('[data-home-extra="about"]>summary').click(); await noOverflow();
  await page.locator('[data-home-extra="about"]>summary').click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload(); await page.locator('#home-dashboard').waitFor();
  await page.locator('#findr-startup').waitFor({ state: 'detached', timeout: 10000 });
  await noOverflow(); await shot('motion-enabled');
  check('Reduced-motion and normal-motion Home both work; short viewport remains scrollable');
  if (offline) {
    stage = 'offline journey'; await verifiedShell(); await context.setOffline(true);
    await page.reload(); await page.locator('#home-dashboard').waitFor();
    assert.match(await page.locator('#home-dashboard a[href="#downloads/saved"]').first().innerText(), /1/);
    for (const route of ['#helpers', '#panel-lab', '#emulator', '#menus', '#quizzes']) {
      await home(); await page.locator('#home-dashboard a[href="' + route + '"]').first().click();
      await page.waitForFunction(hash => location.hash === hash, route);
      await page.waitForFunction(() => !document.querySelector('#home-dashboard') && document.querySelector('#app')?.textContent.trim().length > 10);
    }
    await home(); await shot('offline');
    check('Network-disabled reload restores Home, saved count and existing workspace navigation');
  }
  assert.deepEqual(results.errors, []); results.status = 'passed';
} catch (error) {
  results.status = 'failed'; results.failure = { stage, message: error.message, stack: error.stack };
  process.exitCode = 1;
  await page?.screenshot({ path: path.join(out, label + '-failure.png'), fullPage: true }).catch(() => {});
} finally {
  await context?.close();
  await fs.writeFile(path.join(out, label + '.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results));
}
