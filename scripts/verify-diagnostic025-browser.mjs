// Normal-entry acceptance at desktop and iPhone portrait dimensions. All visits,
// manuals and readings are synthetic. Viewport emulation is not an iPhone test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.FINDR_PLAYWRIGHT_PATH||'/opt/codex/cua_node/lib/node_modules/playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fixtures=path.join(root,'tests/fixtures/diagnostic025');
const base=process.env.FINDR_QA_URL||'http://127.0.0.1:8088';
const offline=process.env.FINDR_QA_OFFLINE!=='0';
const output=process.env.FINDR_QA_RESULTS||'/tmp/findr-diagnostic025-browser.json';
const widths=(process.env.FINDR_QA_WIDTHS||'390,1440').split(',').map(Number);
const action=(page,name)=>page.locator(`[data-action="chat-${name}"]`);
const state=page=>page.evaluate(async()=>{const db=await import('./db.mjs');return db.setting('session');});
const prompt=page=>page.evaluate(async()=>{const db=await import('./db.mjs'),engine=await import('./diagnostic-chat-engine.mjs');return engine.getDiagnosticPrompt(await db.setting('session'));});
const saved=page=>page.locator('#diagnostic-save-status').filter({hasText:'Saved on this device'}).waitFor();
const waitKind=(page,kind)=>page.waitForFunction(async kind=>{const db=await import('./db.mjs'),engine=await import('./diagnostic-chat-engine.mjs');return engine.getDiagnosticPrompt(await db.setting('session')).kind===kind;},kind);
async function send(page,text){
 const previous=(await state(page)).diagnosticChat.messages.length,start=performance.now();
 await page.locator('#diagnostic-message').fill(text);await page.locator('#diagnostic-message-form button[type="submit"]').click();
 await page.waitForFunction(async previous=>{const db=await import('./db.mjs');return(await db.setting('session')).diagnosticChat.messages.length>previous;},previous);await saved(page);
 return performance.now()-start;
}
async function noOverflow(page){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal overflow');}
async function fillForm(page,selector,values){for(const [name,value]of Object.entries(values)){const el=page.locator(`${selector} [name="${name}"]`);const tag=await el.evaluate(e=>e.tagName);if(tag==='SELECT')await el.selectOption(String(value));else if(typeof value==='boolean')await el.setChecked(value);else await el.fill(String(value));}}
async function exportPreview(page,format){await page.locator('[name="reportFormat"]').selectOption(format);const preview=await page.locator('#diagnostic-report-preview').inputValue(),pending=page.waitForEvent('download');await action(page,'export').click();const download=await pending;const content=fs.readFileSync(await download.path(),'utf8');assert.equal(content,preview,'Export equals the reviewed preview');return content;}

const browser=await chromium.launch({executablePath:process.env.FINDR_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const results={synthetic:true,environment:'Linux Chromium desktop and viewport emulation; not physical iPhone/Safari',offline,results:[]};
let active;
try{
 for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:844},acceptDownloads:true,reducedMotion:'reduce',...(!offline?{serviceWorkers:'block'}:{})}),page=await context.newPage();active=page;
  const errors=[];page.on('pageerror',error=>errors.push(error.message));const responseMs=[];
  await page.goto(base+'/app/#faults');await page.getByRole('button',{name:'Start a fault visit',exact:true}).waitFor();
  assert.equal(await page.locator('.header').isVisible(),true,'Top menu remains accessible during startup');
  assert.equal(await page.locator('.fault-entry-type').evaluate(e=>getComputedStyle(e).animationName),'none','Reduced motion disables intro typing');
  const preserved=await page.evaluate(async()=>{const db=await import('./db.mjs');const old={id:'synthetic-025-old-visit',notes:'SYNTHETIC undated original visit, model unknown',answers:{old_question:'unknown'}};await db.setSetting('history',[old]);return old;});
  await page.getByRole('button',{name:'Start a fault visit',exact:true}).click();await page.locator('#diagnostic-pdf-input').waitFor({state:'attached'});
  assert.match(await page.locator('.diagnostic-manual-selection').innerText(),/manual.*first|manual.*compulsory/i);
  assert.equal(await action(page,'found').isDisabled(),true,'Cannot diagnose a new job without a manual');
  const initialId=(await state(page)).id;
  if(offline){
   await page.locator('#connection').filter({hasText:'App ready offline'}).waitFor({timeout:180000});
   await page.waitForFunction(()=>navigator.serviceWorker.controller?.state==='activated',null,{timeout:180000});
   await action(page,'readiness').click();
   await page.waitForFunction(async()=>{const api=await import('./manual-analysis.mjs');return(await api.getManualProcessingReadiness()).ready;},null,{timeout:180000});
   await context.setOffline(true);await page.reload();await page.locator('#diagnostic-pdf-input').waitFor({state:'attached'});
   assert.equal(await page.evaluate(()=>navigator.onLine),false);
  }
  const filename=width===390?'synthetic-premier-elite-scan.pdf':'synthetic-premier-elite-text.pdf',start=performance.now();
  await page.locator('#diagnostic-pdf-input').setInputFiles(path.join(fixtures,filename));await page.locator('[data-action="chat-reply"][data-value="intruder"]').waitFor({timeout:90000});await waitKind(page,'system');
  const importMs=performance.now()-start;
  await page.locator('[data-action="chat-reply"][data-value="intruder"]').click();await waitKind(page,'equipment');
  await fillForm(page,'#diagnostic-identity-form',{model:'Premier Elite 24',variant:'24, confirmed on synthetic label',manufacturer:'Texecom',equipmentType:'panel'});
  await page.locator('#diagnostic-identity-form button[type="submit"]').click();await waitKind(page,'fault');
  responseMs.push(await send(page,'SYNTHETIC Zone 4 detector resistance fault. Expander room is locked; it has been intermittent.'));
  await waitKind(page,'faultCondition');await page.locator('[data-action="chat-reply"][data-value="intermittent"]').click();await waitKind(page,'detail');
  let question=await prompt(page);assert.equal(question.key,'I01.profile');assert.ok(question.sourceRefs.some(ref=>ref.page===2),'Relevant question has the manual page reference');
  await action(page,'source').filter({hasText:'Open source page'}).last().click();await page.locator('#pdf-status').filter({hasText:'Saved PDF · offline'}).waitFor();assert.ok(await page.locator('#pdf-canvas').evaluate(canvas=>canvas.width>0));await page.locator('[data-action="close-modal"]').click();
  responseMs.push(await send(page,'The input is expander 2 zone 4. The expander is inaccessible and the wiring profile is unknown.'));await waitKind(page,'question');
  await page.locator('[data-action="chat-reply"][data-value="no"]').click();await saved(page);question=await prompt(page);assert.notEqual(question.key,'I01.Q1','Answered isolation question advances');
  const answer=(await state(page)).fieldVisit.events.find(event=>event.ruleId==='I01.Q1'&&event.answer==='no');assert.ok(answer);
  await action(page,'evidence').click();await page.locator(`[data-action="chat-correct"][data-id="${answer.id}"]`).last().click();await fillForm(page,'#diagnostic-answer-correction',{answer:'unknown',reason:'SYNTHETIC correction: remote isolation was not established.'});await page.locator('#diagnostic-answer-correction button').click();await saved(page);
  assert.ok((await state(page)).fieldVisit.events.some(event=>event.supersedes===answer.id&&event.answer==='unknown'),'Answer correction appends instead of deleting');await action(page,'chat').click();

  responseMs.push(await send(page,'12 volts'));await waitKind(page,'measurement');assert.match((await prompt(page)).text,/where|supply|device/i);
  for(const answerText of ['Panel AUX positive','AUX negative terminal on the same panel','Normal standby with the load connected','Connected and energised','Panel display'])responseMs.push(await send(page,answerText));
  await saved(page);let session=await state(page);const original=session.fieldVisit.events.find(event=>event.testKind==='voltage'&&event.result?.rawText==='12');assert.ok(original);assert.equal(original.result.source,'panel');assert.match(original.reference,/AUX negative/);
  await page.locator(`[data-action="chat-correct"][data-id="${original.id}"]`).last().click();
  assert.match(await page.locator('#diagnostic-measurement-form [name="point"]').inputValue(),/Panel AUX/);
  assert.match(await page.locator('#diagnostic-measurement-form [name="reference"]').inputValue(),/AUX negative/);
  await fillForm(page,'#diagnostic-measurement-form',{rawText:'12.40',operatingState:'normal',notes:'SYNTHETIC transcription correction; original was rounded.'});await page.locator('#diagnostic-measurement-form button[type="submit"]').click();await saved(page);
  session=await state(page);assert.ok(session.fieldVisit.events.some(event=>event.id===original.id&&event.result.rawText==='12'));assert.ok(session.fieldVisit.events.some(event=>event.supersedes===original.id&&event.result.rawText==='12.40'));
  const beforeManual=(await prompt(page)).key;
  await action(page,'manuals').click();await page.locator('#diagnostic-manual-role').fill('SYNTHETIC external PSU');await page.locator('#diagnostic-pdf-input').setInputFiles(path.join(fixtures,'synthetic-elmdene-component.pdf'));await waitKind(page,'additional_manual_identity');
  assert.equal(await page.locator('#diagnostic-identity-form [name="manufacturer"]').inputValue(),'Elmdene');assert.equal(await page.locator('#diagnostic-identity-form [name="model"]').inputValue(),'2405ST');
  await page.locator('#diagnostic-identity-form button[type="submit"]').click();await saved(page);assert.equal((await prompt(page)).key,beforeManual,'Second manual resumes the same question');session=await state(page);assert.equal(session.diagnosticChat.manuals.length,2);assert.equal(session.diagnosticChat.manuals[1].equipmentRole,'SYNTHETIC external PSU');assert.equal(session.id,initialId);assert.equal(session.diagnosticChat.identity.model,'Premier Elite 24','Component manual does not replace panel identity');

  // Additional observations do not pull a reader away from older transcript text.
  await page.locator('.diagnostic-transcript').evaluate(el=>{el.scrollTop=0;el.dispatchEvent(new Event('scroll'));});
  responseMs.push(await send(page,'SYNTHETIC additional observation: room key requested from site contact.'));
  assert.ok(await page.locator('.diagnostic-transcript').evaluate(el=>el.scrollTop<5),'Sending while reviewing history preserves scroll position');
  assert.equal(await action(page,'newest').isVisible(),true);await action(page,'newest').click();
  await noOverflow(page);await page.screenshot({path:`/tmp/findr-diagnostic025-conversation-${width}.png`,fullPage:false});
  if(width===390){await page.setViewportSize({width,height:500});await page.locator('#diagnostic-message').focus();await page.waitForTimeout(100);for(const selector of ['.diagnostic-composer','.diagnostic-outcomes']){const bounds=await page.locator(selector).boundingBox();assert.ok(bounds&&bounds.y>=0&&bounds.y+bounds.height<=502,selector+' stays in reduced keyboard-like viewport');}await noOverflow(page);await page.screenshot({path:'/tmp/findr-diagnostic025-keyboard-390.png',fullPage:false});await page.setViewportSize({width,height:844});}

  await action(page,'calculator').click();await page.locator('#diagnostic-calculator-form [name="kind"]').selectOption('resistor-network');
  await fillForm(page,'#diagnostic-calculator-form',{resistors:'2k2, 4k7',connection:'series'});await page.locator('#diagnostic-calculator-form button[type="submit"]').click();assert.match(await page.locator('#diagnostic-calculator-result').innerText(),/6900/);
  await page.locator('#diagnostic-calculator-form [name="kind"]').selectOption('voltage-drop');await fillForm(page,'#diagnostic-calculator-form',{supplyVoltage:'24.2 V',deviceVoltage:'23.6 V',supplyPoint:'SYNTHETIC PSU + to PSU -',devicePoint:'SYNTHETIC detector + to detector -',powerDomain:'SYNTHETIC PSU1',loadState:'Connected',operatingState:'Standby',circuitState:'energised_connected',measurementTime:'2026-11-10T10:15',sameConditionConfirmed:true});await page.locator('#diagnostic-calculator-form button[type="submit"]').click();assert.match(await page.locator('#diagnostic-calculator-result').innerText(),/0\.6/);assert.match(await page.locator('#diagnostic-calculator-result').innerText(),/conditions match|calculated/i);await page.locator('[data-action="chat-save-calculation"]').evaluate(button=>{button.click();button.click();});await saved(page);const calculations=(await state(page)).fieldVisit.events.filter(event=>event.testKind==='calculation');assert.equal(calculations.length,1,'Repeated save taps do not duplicate a calculation');assert.equal(calculations[0].result.source,'derived');assert.equal(calculations[0].result.executionState,'calculated');assert.equal(calculations[0].calculation.values.dropV,0.6);
  await action(page,'give-up').click();await fillForm(page,'#diagnostic-outcome-form',{reason:'inaccessible_equipment',nextAction:'SYNTHETIC keyholder to provide expander access, wiring profile and detector manual.',owner:'SYNTHETIC site keyholder',systemLeft:'Fault intermittent; no new disablements introduced.'});await page.locator('#diagnostic-outcome-form button[type="submit"]').click();await page.locator('#diagnostic-report-preview').waitFor();await saved(page);
  session=await state(page);assert.equal(session.diagnosticChat.status,'paused');assert.equal(session.diagnosticChat.outcome.causeConfirmed,false);
  const paused=JSON.parse(await exportPreview(page,'json'));assert.equal(paused.visit.diagnosticConversation.manuals.length,2);assert.ok(paused.visit.diagnosticConversation.transcript.length>10);assert.ok(paused.visit.events.some(event=>event.result?.rawText==='12.40'));
  await page.locator('#diagnostic-redact').uncheck();const full=await exportPreview(page,'text');assert.match(full,/AUX negative/,'Exact measurement reference survives human-readable export');assert.match(full,/COMPLETE CONVERSATION/);
  const short=await exportPreview(page,'short');assert.match(short,/cause unconfirmed/i);assert.match(short,/expander access/i);
  await page.reload();await page.locator('.diagnostic-shell').waitFor();assert.equal((await state(page)).id,initialId);await action(page,'report').last().click();await action(page,'resume').click();await saved(page);assert.equal((await prompt(page)).key,beforeManual,'Paused visit resumes exact pending question');

  // A discriminating visual observation can support a confirmed cause awaiting
  // parts. It does not claim functional restoration or a successful retest.
  await action(page,'measurement').click();await fillForm(page,'#diagnostic-measurement-form',{testKind:'observation',point:'SYNTHETIC detector terminal',rawText:'SYNTHETIC visibly fractured terminal clamp fails to retain its conductor.',unit:'state',operatingState:'normal',circuitState:'unknown',source:'visual',instrument:'Visual observation',allowIncomplete:true});await page.locator('#diagnostic-measurement-form button[type="submit"]').click();await saved(page);
  session=await state(page);const causeEvidence=session.fieldVisit.events.findLast(event=>event.result?.rawText.includes('fractured terminal'));
  assert.ok(causeEvidence);
  await action(page,'found').click();await fillForm(page,'#diagnostic-outcome-form',{cause:'SYNTHETIC fractured terminal clamp',confirmation:'SYNTHETIC direct observation of fracture and failure to retain conductor.',evidenceId:causeEvidence.id,engineerConfirmed:true,awaitingParts:true,action:'SYNTHETIC replacement terminal assembly required.',nextAction:'SYNTHETIC replace under approved procedure and perform functional retests.',owner:'SYNTHETIC next engineer',systemLeft:'Repair pending; function and restoration not verified.'});await page.locator('#diagnostic-outcome-form button[type="submit"]').click();await page.locator('#diagnostic-report-preview').waitFor();await saved(page);session=await state(page);
  assert.equal(session.diagnosticChat.outcome.type,'found');assert.equal(session.diagnosticChat.outcome.causeConfirmed,true,'Discriminating recorded observation supports confirmed cause awaiting parts');assert.equal(session.diagnosticChat.outcome.awaitingParts,true);assert.equal(session.diagnosticChat.outcome.retestsPassed,false);assert.notEqual(session.diagnosticChat.outcome.restoration.fullyRestored,true);
  const found=JSON.parse(await exportPreview(page,'json'));assert.equal(found.visit.diagnosticConversation.outcome.awaitingParts,true);
  const retained=await page.evaluate(async()=>{const db=await import('./db.mjs');return(await db.setting('history')).find(item=>item.id==='synthetic-025-old-visit');});assert.deepEqual(retained,preserved,'Old saved visit remains unchanged');
  await noOverflow(page);await page.screenshot({path:`/tmp/findr-diagnostic025-report-${width}.png`,fullPage:false});assert.deepEqual(errors,[],'No uncaught browser errors');
  results.results.push({width,status:'passed',offline,import:{filename,elapsedMs:importMs},responseMs,confirmedAwaitingParts:session.diagnosticChat.outcome.causeConfirmed,
    checks:['manual compulsory','text/scanned PDF import','system/model/variant confirmation','free fault','relevant manual page','open saved PDF','Yes/No/unknown route','answer correction','ambiguous reading clarification','reading correction','second component manual','history scroll preserved','newest shortcut','reduced motion','keyboard-like viewport','resistor and comparable voltage calculators','derived calculation saved with duplicate-tap guard','Give up','review/export JSON/full/short','reload/resume','Fault found awaiting parts','legacy preservation']});
  fs.writeFileSync(output,JSON.stringify(results,null,2));await context.close();
 }
 results.status='passed';fs.writeFileSync(output,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}catch(error){results.status='failed';results.error=error.stack;fs.writeFileSync(output,JSON.stringify(results,null,2));if(active){await active.screenshot({path:'/tmp/findr-diagnostic025-browser-failure.png',fullPage:true}).catch(()=>{});fs.writeFileSync('/tmp/findr-diagnostic025-browser-failure.html',await active.content().catch(()=>''));}throw error;}
finally{await browser.close();}
