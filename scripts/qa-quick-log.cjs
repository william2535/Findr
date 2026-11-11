// Quick-log browser regression. Every site, point and reading here is synthetic;
// no figure is an equipment specification or a manufacturer test procedure.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.FINDR_PLAYWRIGHT_PATH||'playwright');
const base=process.env.FINDR_QA_URL||'http://127.0.0.1:8085';
const act=(page,name)=>page.locator(`[data-action="investigation-${name}"]`);
const readCase=page=>page.evaluate(async()=>{const db=await import('./db.mjs');return db.setting('session');});
const saved=page=>page.locator('#investigation-save-status').filter({hasText:/^Saved on this device$/}).waitFor();
const quickReady=page=>page.getByRole('heading',{name:'Fault finding log.',exact:true}).waitFor();
async function reading(page,point,value,count){
 await page.locator('#inv-quick-point').selectOption(point);await page.locator('#inv-quick-value').fill(value);
 await page.locator('#investigation-quick-form button[type=submit]').click();
 await page.getByRole('heading',{name:`Saved readings (${count})`,exact:true}).waitFor();await saved(page);
}
async function noOverflow(page){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal viewport overflow');}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.FINDR_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:844},acceptDownloads:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/app/');await page.getByRole('link',{name:'Import panel download',exact:true}).waitFor();
  const advanced=await page.evaluate(async()=>{
   const db=await import('./db.mjs'),{createImportedFaultSession}=await import('./import-fault-context.mjs'),{createInvestigation,addMeasurement,addInvestigationAction}=await import('./investigation-engine.mjs');
   const panels=await fetch('./data/panels.json').then(r=>r.json()),panel=panels.find(p=>p.id==='kentec-syncro');
   let investigation=createInvestigation('loop',1);investigation.setup.engineer='SYNTHETIC earlier engineer';investigation.checks['legacy-check']={status:'not_tested',notes:'SYNTHETIC inaccessible junction'};
   investigation=addMeasurement(investigation,{kind:'DC voltage',location:'SYNTHETIC old test point',value:'22.80',unit:'V DC',reference:'SYNTHETIC terminals',condition:'SYNTHETIC controlled test',instrument:'QA meter previous',engineer:'SYNTHETIC earlier engineer',notes:'Retain full earlier evidence'},2);
   investigation=addInvestigationAction(investigation,{action:'SYNTHETIC earlier inspection',reason:'SYNTHETIC prior visit',outcome:'SYNTHETIC remained unresolved'},3);
   investigation.handover.nextSteps='SYNTHETIC arrange access for earlier visit';
   const old={id:'advanced-existing',panel,site:'SYNTHETIC earlier site',message:'SYNTHETIC earlier loop fault',group:'loop',started:1,savedAt:4,answers:{},notes:'Retain earlier full case',investigation,unresolved:true};
   const session=createImportedFaultSession({id:'synthetic-quick-log',panel,started:Date.now(),
    schedule:{id:'synthetic-quick-schedule',site:'SYNTHETIC Training House',panel:'Test fire panel A',filename:'synthetic-only.csv',fileHash:'synthetic-only',importedAt:Date.now()},
    row:{id:'synthetic-row',node:'01',loop:'01',address:'037',zone:'004',location:'SYNTHETIC reception',partNumber:'QA-ONLY-037'},reportedFault:'SYNTHETIC loop 1 open circuit'});
   await db.setSetting('history',[old]);await db.setSetting('session',session);return old;
  });
  // The direct link is available before the optional fault guide is selected.
  await page.goto(base+'/app/#symptoms');await page.reload();await page.getByRole('link',{name:'Quick fault log',exact:true}).click();await quickReady(page);await page.locator('#inv-quick-point').waitFor();
  assert.equal(await page.locator('#inv-quick-point').inputValue(),'Panel');assert.equal(await page.locator('#inv-quick-unit').inputValue(),'V DC');
  assert.equal(await page.locator('.investigation-tools').evaluate(el=>el.open),false,'Advanced tools start collapsed');assert.equal(await page.locator('#inv-setup-engineer').count(),0,'No full setup form required for a quick reading');
  for(const selector of ['#inv-quick-point','#inv-quick-value','#investigation-quick-form button[type=submit]']){
   const box=await page.locator(selector).boundingBox();assert.ok(box&&box.y>=0&&box.y+box.height<=844,`${selector} visible in the initial viewport`);
  }
  await noOverflow(page);await page.screenshot({path:`/tmp/findr-quick-log-initial-${width}.png`,fullPage:false});
  // Each save needs only a selected point and a literal reading.
  await reading(page,'Panel','24.50',1);await reading(page,'First device','24.10',2);await reading(page,'Last device','0.00',3);
  let current=await readCase(page);assert.deepEqual(current.answers,{},'Readings do not answer the question guide');assert.equal(current.group,undefined,'No guide selection needed to record a reading');
  assert.deepEqual(current.investigation.measurements.map(m=>[m.location,m.value,m.unit]),[['Panel','24.50','V DC'],['First device','24.10','V DC'],['Last device','0.00','V DC']]);
  for(const item of current.investigation.measurements){assert.equal(item.entryMode,'quick');assert.equal(item.assessment,'not_assessed');assert.equal(item.reference,'');assert.equal(item.condition,'');assert.ok(Number.isFinite(item.recordedAt));}
  // A point name and note remain available when the preset labels are unsuitable.
  await page.locator('#inv-quick-point').selectOption('other');await page.locator('#inv-quick-location').fill('SYNTHETIC Device 37, reception');await page.locator('#inv-quick-unit').selectOption('Ω');await page.locator('#inv-quick-value').fill('OL');await page.locator('.quick-log-note > summary').click();await page.locator('#inv-quick-notes').fill('SYNTHETIC isolated fixture; no equipment diagnosis.');
  await page.locator('#investigation-quick-form button[type=submit]').click();await page.getByRole('heading',{name:'Saved readings (4)',exact:true}).waitFor();await saved(page);
  await page.locator('#investigation-quick-form button[type=submit]').click();current=await readCase(page);assert.equal(current.investigation.measurements.length,4,'Submitting the cleared form does not duplicate a saved reading');
  assert.equal(current.investigation.measurements[3].location,'SYNTHETIC Device 37, reception');assert.equal(current.investigation.measurements[3].value,'OL');
  const storedAdvanced=await page.evaluate(async()=>{const db=await import('./db.mjs');return(await db.setting('history')).find(s=>s.id==='advanced-existing');});assert.deepEqual(storedAdvanced,advanced,'Quick saves preserve the whole earlier detailed case');
  await page.locator('.quick-log-readings-title').scrollIntoViewIfNeeded();await noOverflow(page);await page.screenshot({path:`/tmp/findr-quick-log-readings-${width}.png`,fullPage:false});
  // Use the real verified service-worker cache, then reload with no connection.
  await page.locator('#connection').filter({hasText:'App ready offline'}).waitFor({timeout:90000});await context.setOffline(true);await page.reload();await quickReady(page);await page.getByRole('heading',{name:'Saved readings (4)',exact:true}).waitFor();
  const downloadEvent=page.waitForEvent('download');await act(page,'download-report').click();const download=await downloadEvent,report=fs.readFileSync(await download.path(),'utf8');
  for(const text of ['FINDR — Fault finding log','SYNTHETIC Training House','Kentec Syncro','SYNTHETIC loop 1 open circuit','24.50','24.10','0.00','OL','Panel','First device','Last device','SYNTHETIC Device 37, reception','SYNTHETIC isolated fixture','037'])assert.ok(report.includes(text),`Compact report includes ${text}`);
  for(const text of ['SETUP / SYSTEM STATE','CHECKS / FINDINGS','PHYSICAL PATH INVESTIGATION','not_started','No work actions recorded','No investigation checks recorded'])assert.equal(report.includes(text),false,`No blank checklist scaffolding: ${text}`);
  await page.goto(base+'/app/#history');await page.locator('[data-action=open-session][data-id=advanced-existing]').click();await quickReady(page);await page.getByRole('heading',{name:'Saved readings (1)',exact:true}).waitFor();
  await page.locator('.investigation-tools > summary').click();await page.locator('[data-action=investigation-tab][data-value=measurements]').click();await page.getByRole('heading',{name:'Recorded readings (1)',exact:true}).waitFor();assert.match(await page.locator('.investigation-timeline').innerText(),/QA meter previous/);assert.match(await page.locator('.investigation-timeline').innerText(),/SYNTHETIC controlled test/);
  await page.goto(base+'/app/#history');await page.locator('[data-action=open-session][data-id=synthetic-quick-log]').click();await quickReady(page);await page.getByRole('heading',{name:'Saved readings (4)',exact:true}).waitFor();assert.equal((await readCase(page)).investigation.measurements[2].value,'0.00');await noOverflow(page);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({width,status:'passed',checks:'point + value + save without full form, visible phone controls, zero preserved, custom point/note, no duplicate save, compact download offline, old detailed case unchanged, offline reload/reopen'}));await context.close();
 }}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
