// Short, unmocked normal-entry terminal recording. Synthetic PDF/observations.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.FINDR_PLAYWRIGHT_PATH||'/opt/codex/cua_node/lib/node_modules/playwright');
const root=path.resolve(new URL('..',import.meta.url).pathname),output=process.env.FINDR_VIDEO_DIR||'/tmp/findr027-terminal-video';
const browser=await chromium.launch({headless:true,executablePath:process.env.FINDR_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'no-preference',recordVideo:{dir:output,size:{width:390,height:844}}}),page=await context.newPage();
const marks=[],start=performance.now();
const mark=label=>marks.push({label,seconds:(performance.now()-start)/1000});
async function poll(fn,arg){const end=Date.now()+60000;while(Date.now()<end){if(await page.evaluate(fn,arg))return;await page.waitForTimeout(100);}throw Error('Recording state timed out');}
async function kind(value){await poll(async value=>{const db=await import('./db.mjs'),f=await import('./terminal-flow.mjs');return f.getTerminalPrompt(await db.setting('session')).kind===value;},value);}
async function send(text){const box=page.locator('#diagnostic-message');await box.fill(text);await page.waitForTimeout(300);await page.locator('#diagnostic-message-form button[type="submit"]').click();await page.locator('#diagnostic-save-status').filter({hasText:'Saved on this device'}).waitFor();await page.waitForTimeout(1500);}
try{
 await page.goto((process.env.FINDR_QA_URL||'http://127.0.0.1:8088')+'/app/#home');await page.locator('[data-nav="finder"]').click();await page.locator('.terminal-session').waitFor();mark('Opening terminal visibly types');await page.waitForTimeout(2400);
 await page.getByRole('button',{name:'Start a fault visit',exact:true}).click();await kind('manuals');mark('Start continues the same transcript');await page.waitForTimeout(1700);
 const chooser=page.waitForEvent('filechooser');await send('3');mark('Native upload choice');await(await chooser).setFiles(path.join(root,'tests/fixtures/diagnostic025/synthetic-premier-elite-text.pdf'));await kind('identity');mark('Local PDF read and equipment identification');await page.waitForTimeout(4000);
 await send('yes');await kind('component');await send('the panel');mark('Equipment confirmed in conversation');
 await send('SYNTHETIC Zone 4 detector resistance fault.');await send('intermittent');mark('Fault description and arrival condition recorded');
 await send('The expander is locked away and the wiring profile is unknown.');mark('Diagnostic observation changes the next question');await page.waitForTimeout(2000);
 const session=await page.evaluate(async()=>{const db=await import('./db.mjs');return db.setting('session');});assert.ok(session.diagnosticChat.messages.some(m=>m.role==='user'&&/Zone 4/.test(m.text)));assert.ok(session.diagnosticChat.manuals.length);await page.screenshot({path:path.join(output,'terminal-final.png')});
 await page.locator('[data-nav="questions"]').click();await page.locator('.quick-questions-session').waitFor();mark('Separate Quick Questions menu');await page.waitForTimeout(1800);await page.locator('#quick-message').fill('How do I view the event history on this panel?');await page.waitForTimeout(400);await page.locator('#quick-message-form button[type="submit"]').click();await page.waitForTimeout(2000);mark('Quick Questions accepts a question before choosing equipment');
}finally{await context.close();const video=await page.video().path();fs.writeFileSync(path.join(output,'recording.json'),JSON.stringify({environment:'Linux Chromium 154; phone viewport 390×844, not a physical iPhone',synthetic:true,video,marks},null,2));console.log(JSON.stringify({video,marks}));await browser.close();}
