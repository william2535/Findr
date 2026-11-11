// Browser regression for the generic import. Use a local FINDR server and the
// actual Gent PDF referenced by gent-0ba4cfc5de7c; all schedules are synthetic.
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {chromium}=require(process.env.FINDR_PLAYWRIGHT_PATH||'playwright');
const base=process.env.FINDR_QA_URL||'http://127.0.0.1:8085';
const root=path.resolve(__dirname,'..');
const pdf=fs.readFileSync(process.env.FINDR_QA_PDF||'/tmp/findr-gent-installation.pdf');
const fixture=fs.readFileSync(path.join(root,'tests/fixtures/panel-import/synthetic-addressable.csv'));
const malformed=fs.readFileSync(path.join(root,'tests/fixtures/panel-import/synthetic-malformed.csv'));
const act=(p,name)=>p.locator(`[data-action="import-${name}"]`);
async function importFile(page,{name='synthetic.csv',buffer=fixture,mapping=false,confirm=true}={}){
 await act(page,'new').first().click();await page.locator('#import-site').fill('SYNTHETIC Training House');await page.locator('#import-panel').fill('Test fire network');await page.locator('#import-panel-model').selectOption('gent-vigilon-compact');
 await page.locator('#import-schedule-file').setInputFiles({name,mimeType:'text/plain',buffer});await act(page,'preview-file').click();await page.getByRole('heading',{name:'Map the columns'}).waitFor();
 if(mapping){await page.locator('[data-import-map=loop]').selectOption('2');await page.locator('[data-import-map=address]').selectOption('3');}
 await act(page,'review').click();await page.getByRole('heading',{name:'Confirm this import'}).waitFor();if(confirm){await act(page,'confirm').click();await page.locator('#import-reported-fault').waitFor();}
}
async function search(page,text,scope='0'){
 const source=page.locator('#import-source-panel');if(await source.count())await source.selectOption(scope);
 await page.locator('#import-reported-fault').fill(text);await page.locator('#import-query').fill('');
 await page.locator('#import-lookup-form button[type=submit]').click();await page.locator('#import-results-title').waitFor();
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.FINDR_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:844},permissions:['clipboard-read','clipboard-write']});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/manual/gent-0ba4cfc5de7c',route=>route.fulfill({status:200,contentType:'application/pdf',body:pdf}));
  await page.goto(base+'/app/');await page.getByRole('link',{name:'Import panel download',exact:true}).waitFor();
  await page.evaluate(async()=>{const db=await import('./db.mjs');await db.setSetting('history',[{id:'existing-session',site:'Existing site',panel:{brand:'Gent',model:'Vigilon',category:'fire',record_ids:[]},started:1,savedAt:2,answers:{mains_message:'yes'},notes:'Preserve previous observations',message:'AC failure',group:'power'}]);});
  await page.reload();await page.getByRole('link',{name:'Import panel download',exact:true}).click();await act(page,'new').first().waitFor();
  const tsv=fs.readFileSync(path.join(root,'tests/fixtures/panel-import/synthetic-addressable.tsv')).toString().replace('Loop\tAddress','CircuitRef\tPointRef');
  await importFile(page,width===390?{name:'synthetic-unfamiliar.tsv',buffer:Buffer.from(tsv),mapping:true}:{});
  await search(page,'address 37');assert.equal(await page.locator('.import-result').count(),4);
  await search(page,'L1 D37');assert.equal(await page.locator('.import-result').count(),3);await page.getByText(/No device has been selected automatically/).waitFor();
  await page.locator('.import-separate summary').click();await page.locator('#import-filter-node').fill('1');await page.locator('#import-lookup-form button[type=submit]').click();await page.locator('#import-results-title').waitFor();assert.equal(await page.locator('.import-result').count(),1,'Node refines the loop/address already entered in the display');assert.match(await page.locator('.import-result').textContent(),/Ground floor, reception/);await act(page,'clear').click();
  await search(page,'L1 D37','1');assert.equal(await page.locator('.import-result').count(),1);assert.match(await page.locator('.import-result').textContent(),/Annexe entrance/);
  await search(page,'Loop 1 fault','0');assert.equal(await page.locator('.import-result').count(),4);await page.getByText(/Address numbers are not physical cable order/).waitFor();
  await search(page,'L2 D37 optical missing');await page.locator('.import-result').click();await page.getByText('Family / type evidence only',{exact:true}).first().waitFor();assert.equal(await act(page,'download-pdf').count(),0);await act(page,'back-results').click();
  await search(page,'L1 D37 missing');await page.locator('.import-result').filter({hasText:'Ground floor, reception'}).click();await page.getByRole('heading',{name:'Ground floor, reception',exact:true}).waitFor();await page.getByText('Exact part-number match',{exact:true}).first().waitFor();
  assert.match(await page.locator('.import-device-detail').innerText(),/S4-720-ST-VO/);await act(page,'download-pdf').first().waitFor();
  if(width===390){const location=await page.locator('#import-device-title').boundingBox();const download=await act(page,'download-pdf').first().boundingBox();assert.ok(location.y>=0&&download.y+download.height<844,'Location and primary manual action fit in iPhone portrait');}
  await page.screenshot({path:`/tmp/findr-import-device-${width}.png`,fullPage:false});
  await act(page,'download-pdf').first().click();await act(page,'open-pdf').first().waitFor({timeout:60000});await act(page,'open-pdf').first().click();await page.locator('#pdf-status').filter({hasText:'Saved PDF · offline'}).waitFor();assert.ok(await page.locator('#pdf-canvas').evaluate(c=>c.width>0));await page.locator('[data-action=close-modal]').click();
  await act(page,'start-fault').click();await page.locator('#fault-message').waitFor();assert.equal(await page.locator('#fault-message').inputValue(),'L1 D37 missing');
  const fresh=await page.evaluate(async()=>{const db=await import('./db.mjs');return db.setting('session')});assert.deepEqual(fresh.answers,{});assert.equal(fresh.confirmed,false);assert.equal(fresh.importedContext.address,'037');assert.equal(fresh.importedContext.partNumber,'S4-720-ST-VO');
  await page.locator('[data-action=symptom][data-id=device]').click();await page.locator('[data-action=answer][data-value=unknown]').click();await page.getByText('1 answered',{exact:true}).waitFor();await page.locator('[data-action=view-results]').click();await page.locator('#session-notes').fill('SYNTHETIC workflow check');await page.locator('[data-action=save-session]').click();await page.locator('#toast').filter({hasText:'Session saved on this device.'}).waitFor();await page.locator('[data-action=copy-report]').click();
  const report=await page.evaluate(()=>navigator.clipboard.readText());for(const item of ['IMPORTED CONFIGURATION','Address: 037','S4-720-ST-VO','L1 D37 missing','Ground floor, reception'])assert.ok(report.includes(item),item);
  await page.goto(base+'/app/#panel-downloads');await page.reload();await page.locator('#import-reported-fault').waitFor();
  const before=await page.evaluate(async()=>{const db=await import('./db.mjs');return db.setting('panel-imports-v1')});assert.equal(before[0].rows.length,7);
  // Cancellation and malformed/unchecked replacement never alter the snapshot.
  await act(page,'new').first().click();await act(page,'cancel').click();
  await act(page,'new').first().click();await page.locator('#import-site').fill('SYNTHETIC Training House');await page.locator('#import-panel').fill('Test fire network');await page.locator('#import-schedule-file').setInputFiles({name:'broken.csv',mimeType:'text/csv',buffer:malformed});await act(page,'preview-file').click();await page.locator('[role=alert]').waitFor();await act(page,'cancel').click();
  await importFile(page,{confirm:false});await act(page,'confirm').click();await page.locator('[role=alert]').filter({hasText:'Tick the replacement'}).waitFor();
  assert.deepEqual(await page.evaluate(async()=>{const db=await import('./db.mjs');return db.setting('panel-imports-v1')}),before);
  await page.locator('#import-replace').check();await act(page,'confirm').click();await page.locator('#import-reported-fault').waitFor();
  const after=await page.evaluate(async()=>{const db=await import('./db.mjs');return db.setting('panel-imports-v1')});assert.equal(after.length,1);assert.equal(after[0].rows.length,7);assert.notEqual(after[0].id,before[0].id);
  // The actual service worker must finish caching; then test with no network.
  await page.locator('#connection').filter({hasText:'App ready offline'}).waitFor({timeout:90000});await context.setOffline(true);await page.reload();await page.locator('#import-reported-fault').waitFor();await search(page,'L1 D37');await page.locator('.import-result').filter({hasText:'Ground floor, reception'}).click();await act(page,'open-pdf').first().click();await page.locator('#pdf-status').filter({hasText:'Saved PDF · offline'}).waitFor();await page.locator('[data-action=close-modal]').click();
  const persisted=await page.evaluate(async()=>{const db=await import('./db.mjs');return {history:await db.setting('history'),imports:await db.setting('panel-imports-v1')}});assert.ok(persisted.history.some(s=>s.id==='existing-session'&&s.notes==='Preserve previous observations'));assert.ok(persisted.history.some(s=>s.importedContext?.partNumber==='S4-720-ST-VO'));assert.equal(persisted.imports[0].rows.length,7);
  await page.goto(base+'/app/#history');await page.locator('[data-action=open-session][data-id=existing-session]').click();await page.locator('#session-notes').waitFor();assert.equal(await page.locator('#session-notes').inputValue(),'Preserve previous observations');
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal viewport overflow');assert.deepEqual(errors,[]);
  console.log(JSON.stringify({width,status:'passed',formats:width===390?'UTF-8 TSV with custom mapping + CSV replacement':'UTF-8 CSV',checks:'scope, ambiguity, loop aid, exact/generic evidence, actual PDF download/read, session context/report, cancelled/malformed/rejected/confirmed reimport, service-worker offline reload and previous sessions'}));await context.close();
 }}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
