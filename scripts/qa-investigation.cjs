// Synthetic browser regression for the documented investigation workflow.
// No reading or test procedure in this script is an equipment specification.
// Run against a prepared FINDR app: python scripts/prepare-app.py, serve public.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.FINDR_PLAYWRIGHT_PATH||'playwright');
const base=process.env.FINDR_QA_URL||'http://127.0.0.1:8085';
const act=(page,name)=>page.locator(`[data-action="investigation-${name}"]`);
const readCase=page=>page.evaluate(async()=>{const db=await import('./db.mjs');return db.setting('session');});
const saved=async page=>{await page.locator('#investigation-save-status').filter({hasText:/^Saved on this device$/}).waitFor();};
async function openTab(page,name){const target=page.locator(`[data-action="investigation-tab"][data-value="${name}"]`).first();if(!await target.isVisible())await page.locator('.investigation-tools > summary').click();await target.click();}
async function addReading(page,fields,count){
 for(const [key,value] of Object.entries(fields)){
  const field=page.locator('#inv-measure-'+key);
  if(['assessment','supersedes'].includes(key))await field.selectOption(value);else await field.fill(value);
 }
 await page.locator('#investigation-measurement-form button[type=submit]').click();
 await page.getByRole('heading',{name:`Recorded readings (${count})`,exact:true}).waitFor();await saved(page);
}
async function recordPoint(page,index,measurementId,assessment){
 await page.locator('#inv-loop-point').selectOption(String(index));
 await page.locator('#inv-loop-measurement').selectOption(measurementId);
 await page.locator('#inv-loop-assessment').selectOption(assessment);
 await page.locator('#inv-loop-notes').fill('SYNTHETIC QA observation under the same controlled comparison method; no equipment diagnosis.');
 await act(page,'add-loop-observation').click();await saved(page);
}
async function noOverflow(page){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal viewport overflow');}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.FINDR_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:844},permissions:['clipboard-read','clipboard-write'],acceptDownloads:true});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/app/');await page.getByRole('link',{name:'Import panel download',exact:true}).waitFor();
  await page.evaluate(async()=>{
   const db=await import('./db.mjs'),{createImportedFaultSession}=await import('./import-fault-context.mjs');
   const panels=await fetch('./data/panels.json').then(r=>r.json()),panel=panels.find(p=>p.id==='kentec-syncro');
   const legacy=Array.from({length:32},(_,i)=>({id:'legacy-'+i,site:'SYNTHETIC previous case '+i,panel,started:1,savedAt:i+2,answers:{},notes:'Retain earlier engineer record '+i,message:'Previous fault',group:'power'}));
   const session=createImportedFaultSession({id:'synthetic-investigation',started:Date.now(),panel,
    schedule:{id:'synthetic-schedule',site:'SYNTHETIC Training House',panel:'Test fire panel A',filename:'synthetic-schedule.csv',fileHash:'synthetic-only',importedAt:Date.now()},
    row:{id:'synthetic-row',panel:'A',node:'01',loop:'01',address:'037',subAddress:'02',zone:'004',location:'SYNTHETIC reception',type:'Optical detector',model:'Unverified model',partNumber:'QA-ONLY-037',rawValues:['01','037']},reportedFault:'SYNTHETIC loop 1 open circuit'});
   await db.setSetting('history',legacy);await db.setSetting('session',session);
  });
  await page.goto(base+'/app/#symptoms');await page.reload();await page.locator('[data-action=symptom][data-id=loop]').click();
  for(const [i,answer] of ['unknown','yes','no'].entries()){await page.locator(`[data-action=answer][data-value=${answer}]`).click();await page.getByText(`${i+1} answered`,{exact:true}).waitFor();}
  await page.getByText('3 answered',{exact:true}).waitFor();const answers=structuredClone((await readCase(page)).answers);
  assert.deepEqual(new Set(Object.values(answers)),new Set(['unknown','yes','no']));
  await page.getByRole('link',{name:'Quick fault log',exact:true}).click();await page.getByRole('heading',{name:'Fault finding log.',exact:true}).waitFor();
  await openTab(page,'plan');await page.screenshot({path:`/tmp/findr-investigation-plan-${width}.png`,fullPage:false});
  await page.locator('#inv-setup-engineer').fill('SYNTHETIC Engineer A');await page.locator('#inv-setup-jobRef').fill('QA-017');
  await page.locator('#inv-setup-manual').fill('SYNTHETIC QA method — not an equipment procedure');await page.locator('#inv-setup-manualSection').fill('Fictional test reference 1');
  await page.locator('#inv-setup-systemState').fill('SYNTHETIC controlled test; no real equipment connected');
  await page.locator('#inv-setup-authorization').fill('SYNTHETIC test fixture only');await page.locator('#inv-setup-impact').fill('No operational system');
  const check=page.locator('.investigation-check').first(),checkId=await check.locator('select').getAttribute('data-inv-path');
  await check.locator('select').selectOption('not_tested');await check.locator('textarea').fill('SYNTHETIC access unavailable; next engineer must check this.');
  await openTab(page,'measurements');await page.getByRole('heading',{name:'Measurements',exact:true}).waitFor();
  await addReading(page,{location:'SYNTHETIC confirmed first device',kind:'DC voltage',value:'24.00',unit:'V DC',reference:'Synthetic positive / negative reference',instrument:'QA meter 017',condition:'SYNTHETIC controlled single test path',expected:'No equipment threshold claimed',source:'SYNTHETIC QA method only',notes:'Original first reading'},1);
  await addReading(page,{location:'SYNTHETIC confirmed last device',kind:'DC voltage',value:'0.00',unit:'V DC',reference:'Synthetic positive / negative reference',instrument:'QA meter 017',condition:'SYNTHETIC controlled single test path',expected:'No equipment threshold claimed',source:'SYNTHETIC QA method only',notes:'Explicit zero, not a missing reading'},2);
  const original=(await readCase(page)).investigation.measurements[0];
  await page.locator(`[data-action="investigation-correct-reading"][data-id="${original.id}"]`).click();
  await addReading(page,{value:'23.90',notes:'SYNTHETIC transcription correction; original retained'},3);
  await addReading(page,{location:'SYNTHETIC separate isolated cable test',kind:'Resistance',value:'OL',unit:'Ω',reference:'Synthetic isolated conductor ends',instrument:'QA meter 017',condition:'SYNTHETIC isolated fixture, separate from the powered comparison',source:'SYNTHETIC QA method only',notes:'OL retained exactly; not used to classify the powered route'},4);
  let current=await readCase(page);assert.deepEqual(current.answers,answers,'Readings must not answer Yes / No questions');
  assert.deepEqual(current.investigation.measurements.map(m=>m.value),['24.00','0.00','23.90','OL']);assert.equal(current.investigation.measurements[2].supersedes,original.id);
  assert.equal(current.investigation.checks[checkId.split('.')[1]].status,'not_tested');
  await noOverflow(page);await page.screenshot({path:`/tmp/findr-investigation-readings-${width}.png`,fullPage:false});
  await openTab(page,'plan');await page.locator('.investigation-loop details > summary').click();
  await page.locator('#inv-loop-points').fill('SYNTHETIC confirmed first device\nSYNTHETIC first junction\nSYNTHETIC verified midpoint\nSYNTHETIC final junction\nSYNTHETIC confirmed last device');
  await page.locator('#inv-loop-source').fill('SYNTHETIC traced route + QA procedure; not device address order');await page.locator('#inv-loop-configuration').fill('SYNTHETIC controlled single test path');
  await page.locator('#inv-loop-topology').check();await act(page,'save-loop').click();await saved(page);
  assert.match(await page.locator('.investigation-loop .investigation-next').innerText(),/exact-model test procedure/,'Topology alone must not start narrowing');
  await page.locator('.investigation-loop details > summary').click();await page.locator('#inv-loop-procedure').check();await act(page,'save-loop').click();await saved(page);
  current=await readCase(page);await recordPoint(page,0,current.investigation.measurements[2].id,'satisfactory');await recordPoint(page,4,current.investigation.measurements[1].id,'fault_present');
  assert.match(await page.locator('.investigation-loop .investigation-next').innerText(),/single test path/,'Endpoint readings without controlled-path confirmation must not narrow');
  await page.locator('.investigation-loop details > summary').click();await page.locator('#inv-loop-single').check();await page.locator('#inv-loop-single-notes').fill('SYNTHETIC fixture represents one verified test path with comparable conditions.');
  await page.locator('#inv-loop-replace').check();await act(page,'save-loop').click();await saved(page);
  assert.equal((await readCase(page)).investigation.loop.observations.length,0,'Changing comparison setup starts fresh observations');assert.ok((await readCase(page)).investigation.actions.some(a=>a.action==='Started a new physical-route comparison'&&a.reason.includes('fault_present')),'Earlier comparison observations retained in work log');
  await recordPoint(page,0,current.investigation.measurements[2].id,'satisfactory');await recordPoint(page,4,current.investigation.measurements[1].id,'fault_present');
  assert.match(await page.locator('.investigation-loop .investigation-next').innerText(),/next comparable check point is SYNTHETIC verified midpoint/);
  assert.match(await page.locator('.investigation-loop .investigation-next').innerText(),/not a confirmed fault location/);
  await openTab(page,'work');await page.locator('#inv-work-action').fill('SYNTHETIC inspected accessible route labels');await page.locator('#inv-work-reason').fill('SYNTHETIC requested comparison');await page.locator('#inv-work-outcome').fill('SYNTHETIC midpoint inaccessible; fault unresolved');await page.locator('#investigation-work-form button[type=submit]').click();await saved(page);
  await openTab(page,'handover');await page.locator('[data-inv-path="handover.status"]').selectOption('resolved');assert.equal(await page.locator('[data-inv-path="handover.status"]').inputValue(),'unresolved','Cannot claim resolved without restoration/test evidence');
  for(const [key,value] of Object.entries({handoverTo:'SYNTHETIC Engineer B',summary:'SYNTHETIC fault remains unresolved; readings recorded, no break proven',workDone:'SYNTHETIC accessible checks only',outstanding:'SYNTHETIC midpoint access required',nextSteps:'SYNTHETIC arrange access and compare at verified midpoint under exact procedure',systemLeft:'SYNTHETIC no operational protection involved; restoration not established'}))await page.locator('#inv-handover-'+key).fill(value);
  await act(page,'save-case').first().click();await saved(page);
  current=await readCase(page);assert.equal(current.unresolved,true);assert.equal(current.investigation.handover.restored,'unknown');assert.equal(current.investigation.handover.functionalTest,'not_done');
  const downloadEvent=page.waitForEvent('download');await act(page,'download-report').first().click();const download=await downloadEvent;const report=fs.readFileSync(await download.path(),'utf8');
  for(const text of ['24.00','0.00','23.90','OL','QA meter 017','SYNTHETIC controlled single test path','Original first reading','transcription correction','SYNTHETIC Engineer B','Address: 037','Sub-address: 02','SYNTHETIC reception','not tested','not done','restored: unknown','SYNTHETIC access unavailable'])assert.ok(report.includes(text),`Report includes ${text}`);
  await noOverflow(page);await page.screenshot({path:`/tmp/findr-investigation-handover-${width}.png`,fullPage:false});
  // Switching the worksheet must preserve earlier readings and check evidence.
  await page.goto(base+'/app/#symptoms');await page.locator('[data-action=symptom][data-id=power]').click();await page.locator('[data-action=answer]').first().waitFor();await page.getByRole('link',{name:'Quick fault log',exact:true}).click();await page.getByRole('heading',{name:'Fault finding log.',exact:true}).waitFor();
  await openTab(page,'plan');if(!await page.locator('#inv-setup-jobRef').isVisible())await page.locator('.investigation-setup > summary').click();await page.locator('#inv-setup-jobRef').fill('QA-017-follow-up');await act(page,'retry-save').click();await saved(page);current=await readCase(page);
  assert.equal(current.guideHistory.at(-1).groupId,'loop');assert.equal(current.guideHistory.at(-1).observations.length,3,'Prior guide answers are retained');assert.equal(current.group,'power');assert.equal(current.investigation.groupId,'power');assert.equal(current.investigation.measurements.length,4);assert.ok(current.investigation.checks[checkId.split('.')[1]].notes.includes('access unavailable'));
  await page.locator('#connection').filter({hasText:'App ready offline'}).waitFor({timeout:90000});await context.setOffline(true);await page.reload();await page.getByRole('heading',{name:'Fault finding log.',exact:true}).waitFor();
  await openTab(page,'measurements');await page.getByRole('heading',{name:'Recorded readings (4)',exact:true}).waitFor();await openTab(page,'handover');assert.equal(await page.locator('#inv-handover-nextSteps').inputValue(),'SYNTHETIC arrange access and compare at verified midpoint under exact procedure');
  const history=await page.evaluate(async()=>{const db=await import('./db.mjs');return db.setting('history');});assert.equal(history.length,33,'No older cases truncated');assert.ok(history.some(s=>s.id==='legacy-31'&&s.notes==='Retain earlier engineer record 31'));
  await page.goto(base+'/app/#history');await page.locator('[data-action=open-session][data-id=legacy-31]').click();await page.locator('#session-notes').waitFor();assert.equal(await page.locator('#session-notes').inputValue(),'Retain earlier engineer record 31');
  await page.goto(base+'/app/#history');await page.locator('[data-action=open-session][data-id=synthetic-investigation]').click();await page.getByRole('heading',{name:'Fault finding log.',exact:true}).waitFor();await openTab(page,'measurements');await page.getByRole('heading',{name:'Recorded readings (4)',exact:true}).waitFor();await noOverflow(page);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({width,status:'passed',checks:'Yes/No/unknown retained, raw readings and corrections, procedure-gated endpoint/midpoint comparison, prior route retained, work log, unresolved report download, group-change preservation, offline reload, 32 legacy sessions preserved'}));await context.close();
 }}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
