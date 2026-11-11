// Real-menu regression for queued transcript rows pushing the active cursor offscreen.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium,webkit}=require(process.env.FINDR_PLAYWRIGHT_PATH||'/opt/codex/cua_node/lib/node_modules/playwright');
const root=path.resolve(new URL('..',import.meta.url).pathname),base=process.env.FINDR_QA_URL||'http://127.0.0.1:8088';
const results=[];
for(const [name,driver,executablePath]of [['chromium',chromium,process.env.FINDR_CHROMIUM||'/usr/bin/chromium'],['webkit',webkit,process.env.FINDR_WEBKIT||'/tmp/findr027-webkit-run.sh']]){
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'findr027-animation-'+name+'-'));
 const context=await driver.launchPersistentContext(profile,{headless:true,executablePath,viewport:{width:390,height:844},reducedMotion:'no-preference',serviceWorkers:'block',...(name==='chromium'?{args:['--no-sandbox']}: {})});
 const browser=context.browser();
 try{
  const page=await context.newPage(),samples=[];
  const result={browser:name,version:browser.version(),viewport:{width:390,height:844},physicalIPhone:false,syntheticManual:true,samples};
  async function sample(label){await page.waitForTimeout(80);const value=await page.evaluate(()=>{const log=document.querySelector('.diagnostic-transcript'),active=document.querySelector('.terminal-history .terminal-line[data-typing="active"]'),host=active?.querySelector('[data-terminal-message-text]'),rect=host?.getBoundingClientRect(),bounds=log.getBoundingClientRect();return {queued:[...document.querySelectorAll('.terminal-history .terminal-line[data-typing="queued"]')].map(row=>({height:row.getBoundingClientRect().height,display:getComputedStyle(row).display})),active:rect?{visible:host.querySelector('[data-terminal-visible-text]')?.textContent.length||0,full:host.dataset.terminalFullText.length,top:rect.top,bottom:rect.bottom,logTop:bounds.top,logBottom:bounds.bottom}:null};});samples.push({label,...value});assert.ok(value.queued.length,'The check must observe future messages waiting to type');assert.ok(value.queued.every(row=>row.height===0&&row.display==='none'),'Queued rows, including options and details, must not reserve height');assert.ok(value.active&&value.active.visible<value.active.full,'The active message must genuinely be mid-animation');assert.ok(value.active.bottom<=value.active.logBottom+1&&value.active.bottom>value.active.logTop,'The active typing position must remain in the transcript viewport');}
  async function send(text){await page.locator('#diagnostic-message').fill(text);await page.locator('#diagnostic-message-form button[type="submit"]').click();await page.locator('#diagnostic-save-status').filter({hasText:'Saved on this device'}).waitFor();}
  async function poll(predicate,arg){const end=Date.now()+30000;while(Date.now()<end){const value=await page.evaluate(predicate,arg);if(value)return value;await page.waitForTimeout(80);}throw Error('Saved conversation state did not reach '+String(arg||'identity ID')+': '+JSON.stringify(await page.evaluate(async()=>{const db=await import('./db.mjs'),flow=await import('./terminal-flow.mjs'),s=await db.setting('session');return {prompt:flow.getTerminalPrompt(s),messages:s.diagnosticChat.messages.slice(-3),pending:s.diagnosticChat.terminal.pendingOperation};})));}
  async function kind(kind){await poll(async kind=>{const db=await import('./db.mjs'),flow=await import('./terminal-flow.mjs'),session=await db.setting('session');return session&&flow.getTerminalPrompt(session).kind===kind;},kind);}
  await page.goto(base+'/app/#home');await page.locator('[data-nav="finder"]').click();await page.locator('#diagnostic-message').waitFor();
  await sample('Opening introduction');await send('START');await kind('manuals');await sample('Manual question and three queued options');
  const chooser=page.waitForEvent('filechooser');await send('3');await(await chooser).setFiles(path.join(root,'tests/fixtures/diagnostic025/synthetic-premier-elite-text.pdf'));await kind('identity');await sample('Manual processed while identification waits in the same transcript');
  const identityId=await poll(async()=>{const db=await import('./db.mjs'),s=await db.setting('session');return s?.diagnosticChat?.messages.findLast(message=>message.terminalKind==='identity')?.id;});
  const identity=page.locator(`[data-message-id="${identityId}"]`);await identity.locator(':scope[data-typing="active"]').waitFor({timeout:20000});await sample('Equipment identification visibly types');
  await identity.locator(':scope > [data-terminal-message-text]').click();
  assert.equal(await identity.getAttribute('data-typing'),'complete','Tap must reveal the entire current message');
  const yes=identity.locator('[data-action="chat-option"]').first();await yes.waitFor();assert.ok((await yes.boundingBox()).height>=44,'An active option retains its touch target');await yes.click();await kind('component');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>!document.querySelector('.terminal-history [data-typing="queued"], .terminal-history [data-typing="active"]'));
  const session=await page.evaluate(async()=>{const db=await import('./db.mjs');return db.setting('session');});assert.ok(session.diagnosticChat.manuals.length);assert.ok(session.diagnosticChat.messages.some(message=>message.terminalKind==='identity'&&message.text.length>50));
  assert.ok(await page.locator('.terminal-history [data-terminal-full-text]').count());result.status='passed';result.checks=['Queued rows have zero layout height','Active typing remains visible after PDF import','Tap reveals the current message','Active option is tappable and at least 44px','Reduced motion reveals all pending output','Full transcript text and manual remain saved'];
  results.push(result);await context.close();
 }finally{await context.close();fs.rmSync(profile,{recursive:true,force:true});}
}
const output=process.env.FINDR_QA_RESULTS||path.join(root,'research/assistant-0.27.0/animation-layout-checks.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(results,null,2));console.log(JSON.stringify({status:'passed',browsers:results.map(result=>result.browser),output}));
