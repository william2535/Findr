// Real Chromium profile close/reopen, with network disabled before the second
// launch navigates. Synthetic manuals exercise first-use OCR after restart.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.FINDR_PLAYWRIGHT_PATH||'/opt/codex/cua_node/lib/node_modules/playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fixtures=path.join(root,'tests/fixtures/diagnostic025');
const base=process.env.FINDR_QA_URL||'http://127.0.0.1:8088';
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'findr-025-restart-'));
const output=process.env.FINDR_QA_RESULTS||'/tmp/findr-diagnostic025-restart.json';
const launch=()=>chromium.launchPersistentContext(profile,{executablePath:process.env.FINDR_CHROMIUM||'/usr/bin/chromium',headless:true,viewport:{width:390,height:844},reducedMotion:'reduce',args:['--no-sandbox','--disable-dev-shm-usage']});
const state=page=>page.evaluate(async()=>{const db=await import('./db.mjs');return db.setting('session');});
const saved=page=>page.locator('#diagnostic-save-status').filter({hasText:'Saved on this device'}).waitFor();
const kind=(page,wanted)=>page.waitForFunction(async wanted=>{const db=await import('./db.mjs'),engine=await import('./diagnostic-chat-engine.mjs');return engine.getDiagnosticPrompt(await db.setting('session')).kind===wanted;},wanted);
async function send(page,text){const before=(await state(page)).diagnosticChat.messages.length;await page.locator('#diagnostic-message').fill(text);await page.locator('#diagnostic-message-form button[type=submit]').click();await page.waitForFunction(async before=>{const db=await import('./db.mjs');return(await db.setting('session')).diagnosticChat.messages.length>before;},before);await saved(page);}
let context,page;const errors=[];
try{
 context=await launch();page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto(base+'/app/#faults');await page.getByRole('button',{name:'Start a fault visit',exact:true}).click();
 await page.locator('#connection').filter({hasText:'App ready offline'}).waitFor({timeout:180000});await page.waitForFunction(()=>navigator.serviceWorker.controller?.state==='activated',null,{timeout:180000});
 await context.setOffline(true);await page.locator('#diagnostic-pdf-input').setInputFiles(path.join(fixtures,'synthetic-premier-elite-text.pdf'));await kind(page,'system');await page.locator('[data-action=chat-reply][data-value=intruder]').click();await kind(page,'equipment');await page.locator('#diagnostic-identity-form [name=variant]').fill('SYNTHETIC installed 24');await page.locator('#diagnostic-identity-form button[type=submit]').click();await kind(page,'fault');
 await send(page,'SYNTHETIC intermittent resistance warning at detector 4.');await page.locator('[data-action=chat-reply][data-value=intermittent]').click();await kind(page,'detail');await send(page,'12 volts');await kind(page,'measurement');await saved(page);
 const before=await state(page);assert.equal(before.diagnosticChat.manuals.length,1);assert.ok(before.diagnosticChat.pendingReadings.length);const manualId=before.diagnosticChat.manuals[0].manualId;
 await context.close();context=null;
 context=await launch();await context.setOffline(true);page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto(base+'/app/#investigation');await kind(page,'measurement');await saved(page);
 const after=await state(page);assert.equal(after.id,before.id);assert.deepEqual(after.diagnosticChat.pendingReadings,before.diagnosticChat.pendingReadings);assert.deepEqual(after.fieldVisit.events.map(item=>item.id),before.fieldVisit.events.map(item=>item.id));assert.deepEqual(after.diagnosticChat.messages.map(item=>item.id),before.diagnosticChat.messages.map(item=>item.id));assert.equal(await page.evaluate(()=>navigator.onLine),false);
 await page.locator(`[data-action=chat-source][data-id="${manualId}"]`).first().click();await page.locator('#pdf-status').filter({hasText:'Saved PDF · offline'}).waitFor();assert.ok(await page.locator('#pdf-canvas').evaluate(canvas=>canvas.width>0));await page.locator('[data-action=close-modal]').click();
 await page.locator('[data-action=chat-manuals]').click();await page.locator('#diagnostic-manual-role').fill('SYNTHETIC external PSU after browser restart');const start=performance.now();await page.locator('#diagnostic-pdf-input').setInputFiles(path.join(fixtures,'synthetic-elmdene-component-scan.pdf'));await kind(page,'additional_manual_identity');const importMs=performance.now()-start;
 assert.equal(await page.locator('#diagnostic-identity-form [name=model]').inputValue(),'2405ST');await page.locator('#diagnostic-identity-form button[type=submit]').click();await kind(page,'measurement');await saved(page);const final=await state(page);assert.equal(final.diagnosticChat.manuals.length,2);assert.deepEqual(final.diagnosticChat.pendingReadings,before.diagnosticChat.pendingReadings);const secondManual=final.diagnosticChat.manuals[1];const expected=JSON.parse(fs.readFileSync(path.join(fixtures,'manifest.json'),'utf8'))['synthetic-elmdene-component-scan.pdf'].sha256;assert.equal(secondManual.contentHash,expected);const analysis=await page.evaluate(async hash=>(await import('./manual-analysis.mjs')).getManualAnalysis(hash),expected);assert.ok(analysis.pages.every(item=>item.method==='ocr'));assert.equal(analysis.reused,undefined);assert.deepEqual(errors,[]);
 const result={status:'passed',synthetic:true,environment:'Linux Chromium persistent profile, actual browser process/profile restart; not physical iPhone/Safari',network:'Playwright browser context offline before navigation',checks:['pending question and saved partial reading clarification survive browser restart','event IDs and transcript preserved without duplicate saves','previously saved PDF opens offline','previously unseen scanned component manual OCR on first use after offline restart','second component resumes original reading clarification'],scannedComponentProcessing:analysis.timing,scannedComponentMethods:analysis.pages.map(item=>item.method),scannedComponentHash:expected};
 fs.writeFileSync(output,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(error){fs.writeFileSync(output,JSON.stringify({status:'failed',error:error.stack,errors},null,2));if(page)await page.screenshot({path:'/tmp/findr-diagnostic025-restart-failure.png',fullPage:true}).catch(()=>{});throw error;}
finally{if(context)await context.close();fs.rmSync(profile,{recursive:true,force:true});}
