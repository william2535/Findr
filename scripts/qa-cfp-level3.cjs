// CFP Standard engineering/front-panel acceptance. All site inputs are synthetic.
// Source PDF bytes are the checked manual, not proof of physical-panel behaviour.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.FINDR_PLAYWRIGHT_PATH||'playwright');
const base=process.env.FINDR_QA_URL||'http://127.0.0.1:8085';
const layoutOnly=process.env.FINDR_QA_LAYOUT_ONLY==='1';
const widths=(process.env.FINDR_QA_WIDTHS||'390,1440').split(',').map(Number);
const root=path.resolve(__dirname,'..'),profileId='c-tec-cfp-standard',sigmaId='kentec-sigma-cp';
const json=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const data=json('public/app/data/conventional-fire.json');
const fixture=json('tests/fixtures/cfp-level3/synthetic-0.19-progress.json');
const installationId='c-tec-4b1267f3fefc';
const installPDF=fs.readFileSync(process.env.FINDR_CFP_PDF||'/tmp/findr-emulator-source-audit/ctec-cfp-install.pdf');
const oldPDF=fs.readFileSync(process.env.FINDR_QA_PDF||'/tmp/findr-gent-installation.pdf');
const action=(page,name)=>page.locator(`[data-conventional-action="${name}"]`);
const key=(page,id)=>page.locator(`[data-conventional-action="key"][data-key="${id}"]`);
const readSetting=(page,name)=>page.evaluate(async name=>(await import('./db.mjs')).setting(name),name);
const state=async(page,id=profileId)=>(await readSetting(page,'conventional-fire-trainer-v1:'+id))?.state;
async function waitProperty(page,property,expected,id=profileId){
 await page.waitForFunction(async({id,property,expected})=>{let value=(await(await import('./db.mjs')).setting('conventional-fire-trainer-v1:'+id))?.state;for(const part of property.split('.'))value=value?.[part];return JSON.stringify(value)===JSON.stringify(expected);},{id,property,expected});
 return state(page,id);
}
async function waitSaved(page){await page.locator('#conventional-save-status').filter({hasText:'Practice saved on this device'}).waitFor();}
async function press(page,id,holdMs=0){await key(page,id).click(holdMs?{delay:holdMs+80}:{});await waitSaved(page);}
async function cover(page,open){await page.locator(`[data-conventional-action="cover"][data-open="${open}"]`).click();await waitSaved(page);}
async function noOverflow(page){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal page overflow');}
async function checkZoom(page,width,view){
 await page.locator('[data-conventional-action="face-zoom"][data-value="large"]').click();await waitSaved(page);
 assert.equal(await page.locator('.cfp-viewport').evaluate(el=>el.scrollWidth>el.clientWidth),true,'Large view scrolls inside panel viewport');
 const targets=await page.locator('[data-conventional-action="key"]').evaluateAll(buttons=>buttons.map(button=>{const r=button.getBoundingClientRect();return {id:button.dataset.key,width:r.width,height:r.height};}));
 for(const target of targets)assert.ok(target.width>=44&&target.height>=44,'Zoom gives a 44px target to '+target.id);
 await noOverflow(page);await page.locator('.cfp-viewport').scrollIntoViewIfNeeded();await page.screenshot({path:`/tmp/findr-cfp-${view}-zoom-${width}.png`,fullPage:false});
 await page.locator('[data-conventional-action="face-zoom"][data-value="fit"]').click();await waitSaved(page);await noOverflow(page);
}
async function savedPDF(page,id){await page.locator(`[data-action="read"][data-id="${id}"]`).click();await page.locator('#pdf-status').filter({hasText:'Saved PDF · offline'}).waitFor();assert.ok(await page.locator('#pdf-canvas').evaluate(canvas=>canvas.width>0));await page.locator('[data-action="close-modal"]').click();}
async function seed(page){
 return page.evaluate(async({fixture,pdf})=>{
  const db=await import('./db.mjs');for(const [id,record]of Object.entries(fixture.profiles))await db.setSetting('conventional-fire-trainer-v1:'+id,record);
  const visit={id:'synthetic-cfp-visit',site:'SYNTHETIC retained field visit',panel:{brand:'C-TEC',model:'CFP Standard',category:'fire',record_ids:[]},started:1,notes:'SYNTHETIC retained reading 23.70 V',answers:{},fieldVisit:{id:'synthetic-cfp-visit',schemaVersion:1,state:'paused',siteRef:'SYNTHETIC retained field visit',incidents:[],assets:[],events:[],impairments:[],handover:{}}};
  const imports=[{id:'synthetic-cfp-schedule',site:'SYNTHETIC earlier site',panel:'Earlier network',rows:[{loop:'01',address:'037',location:'SYNTHETIC previous label'}]}];
  const keypad={version:1,profiles:{'synthetic-preservation-marker':{note:'SYNTHETIC previous intruder progress'}}};
  await db.setSetting('history',[visit]);await db.setSetting('session',visit);await db.setSetting('panel-imports-v1',imports);await db.setSetting('keypad-emulator-state-v1',keypad);
  const catalogue=await fetch('./data/catalogue.json').then(r=>r.json()),record=catalogue.records.find(r=>r.id==='gent-0ba4cfc5de7c'),bytes=Uint8Array.from(atob(pdf),char=>char.charCodeAt(0));await db.saveManual({...record,savedAt:1,bytes:bytes.length},new Blob([bytes],{type:'application/pdf'}));
  return {visit,imports,keypad,sigma:fixture.profiles['kentec-sigma-cp']};
 },{fixture,pdf:oldPDF.toString('base64')});
}
async function preserved(page,seeded,{sigmaUnchanged=true}={}){
 const actual=await page.evaluate(async()=>{const db=await import('./db.mjs');return {visit:(await db.setting('history')).find(x=>x.id==='synthetic-cfp-visit'),imports:await db.setting('panel-imports-v1'),keypad:await db.setting('keypad-emulator-state-v1'),sigma:await db.setting('conventional-fire-trainer-v1:kentec-sigma-cp'),pdfBytes:(await db.getFile('gent-0ba4cfc5de7c')).size};});
 assert.deepEqual(actual.visit,seeded.visit,'Earlier fault visit unchanged');assert.deepEqual(actual.imports,seeded.imports,'Earlier import unchanged');assert.deepEqual(actual.keypad,seeded.keypad,'Earlier keypad progress unchanged');if(sigmaUnchanged)assert.deepEqual(actual.sigma,seeded.sigma,'Sigma record untouched by CFP');assert.equal(actual.pdfBytes,oldPDF.length,'Old PDF preserved');
}
async function freshScenario(page,id='normal'){
 const details=page.locator('.conventional-scenarios');if(!await details.evaluate(node=>node.open))await details.locator('summary').click();await page.locator('#conventional-scenario').selectOption(id);await action(page,'scenario').click();await waitSaved(page);
}
async function completeLesson(page,profile,lesson){
 await page.goto(base+'/app/#fire-panel/'+profile.id+'/learn');await page.locator(`[data-conventional-action="lesson"][data-id="${lesson.id}"]`).click();
 for(let index=0;index<lesson.steps.length;index++){
  const step=lesson.steps[index];assert.ok(await page.locator('.conventional-coach .conventional-refs a').count(),'Source shown for '+lesson.id+'/'+step.id);
  if(step.expectedKeys){for(const id of step.expectedKeys){assert.ok(await key(page,id).evaluate(el=>el.classList.contains('conventional-key-hint')),'Physical hint highlights '+id);await press(page,id,step.holdMs||0);}}
  else if(typeof step.expectedCover==='boolean')await cover(page,step.expectedCover);
  else if(step.expectedDelayMinutes!==undefined){await page.locator('#conventional-delay-minutes').selectOption(String(step.expectedDelayMinutes));await waitSaved(page);}
  else if(step.expectedAdvanceSeconds!==undefined)await page.locator(`[data-conventional-action="advance-time"][data-seconds="${step.expectedAdvanceSeconds}"]`).click();
  else if(step.expectedMode)await page.locator(`[data-conventional-action="mode"][data-mode="${step.expectedMode}"]`).click();
  else if(step.expectedInput)await action(page,'lesson-input').click();
  else if(step.expectedAction==='advance-test')await action(page,'tick').click();
  else throw Error('No browser interaction for '+lesson.id+'/'+step.id+': '+JSON.stringify(step));
  try{await page.waitForFunction(expected=>Number(document.querySelector('.conventional-coach progress')?.value)===expected,index+1,{timeout:5000});}catch(error){throw Error('Lesson did not advance '+lesson.id+'/'+step.id+': '+error.message);}
 }
 await page.locator('.conventional-coach').filter({hasText:'LESSON COMPLETE'}).waitFor();await page.waitForFunction(async({profile,id})=>!!(await(await import('./db.mjs')).setting('conventional-fire-trainer-v1:'+profile))?.completed?.[id],{profile:profile.id,id:lesson.id});
}
async function run(){
 const browser=await chromium.launch({executablePath:process.env.FINDR_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});let activePage;
 try{for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:844},...(layoutOnly?{serviceWorkers:'block'}:{})}),page=await context.newPage();activePage=page;const errors=[];page.on('pageerror',e=>{errors.push(e.stack||e.message);console.error('BROWSER ERROR',e.stack||e.message);});
  await page.route('**/api/manual/'+installationId,route=>route.fulfill({status:200,contentType:'application/pdf',body:installPDF}));
  await page.goto(base+'/app/#emulator');await page.locator(`a[href="#fire-panel/${profileId}"]`).first().waitFor();const seeded=await seed(page);await page.reload();
  await page.goto(base+'/app/#fire-panel/'+profileId);await page.locator('.cfp-cabinet[data-cover="closed"]').waitFor();
  // The old operator progress acquires defaults without losing recorded changes.
  assert.deepEqual((await state(page)).disabledZones,['Z3']);assert.equal(await key(page,'ENGINEER').count(),0,'Internal SW8 is absent with the cover on');
  await cover(page,true);await waitProperty(page,'coverOpen',true);assert.equal((await state(page)).engineering,null,'Opening the cover alone does not grant level three');await page.locator('.cfp-control-pcb').waitFor();
  await press(page,'ENGINEER');await waitProperty(page,'engineering.functionId','coincidence');
  await cover(page,false);await waitProperty(page,'coverOpen',false);assert.equal((await state(page)).engineering.functionId,'coincidence','Closing the cover does not invent an access sensor or clear the engineering state');assert.equal(await key(page,'ENGINEER').count(),0);await cover(page,true);await waitProperty(page,'coverOpen',true);
  await press(page,'EXIT');await waitProperty(page,'engineering',null);await cover(page,false);await waitProperty(page,'coverOpen',false);
  await noOverflow(page);await checkZoom(page,width,'front');await page.locator('.cfp-cabinet').scrollIntoViewIfNeeded();await page.screenshot({path:`/tmp/findr-cfp-front-${width}.png`,fullPage:false});
  const cfp=data.profiles.find(p=>p.id===profileId);for(const lesson of cfp.lessons)await completeLesson(page,cfp,lesson);
  await preserved(page,seeded);await checkEngineering(page,width);
  await action(page,'manuals').first().click();await page.locator('#modal[open]').waitFor();assert.equal((await page.locator('#modal').innerText()).includes('Sigma CP'),false,'CFP manuals only');await page.locator(`#modal [data-action="download-one"][data-id="${installationId}"]`).click();await page.locator(`[data-action="read"][data-id="${installationId}"]`).waitFor();await savedPDF(page,installationId);
  await page.goto(base+'/app/#fire-panel/'+profileId);await page.locator('.cfp-cabinet').waitFor();await cover(page,true);await press(page,'ENGINEER');await press(page,'NEXT_OPTION');await press(page,'TOGGLE');await waitProperty(page,'engineering.draftEnabled',true);await cover(page,false);await waitProperty(page,'coverOpen',false);const online=await readSetting(page,'conventional-fire-trainer-v1:'+profileId);assert.ok(Object.keys(online.completed).length>=cfp.lessons.length);await preserved(page,seeded);
  if(!layoutOnly){
   await page.locator('#connection').filter({hasText:'App ready offline'}).waitFor({timeout:90000});await context.setOffline(true);await page.reload();await page.locator('.cfp-cabinet').waitFor();const offline=await readSetting(page,'conventional-fire-trainer-v1:'+profileId);assert.equal(offline.state.coverOpen,false,'Cover stays fitted after offline reload');assert.deepEqual(offline.state.engineering,online.state.engineering,'Active L3 and unconfirmed draft survive offline reload with the cover fitted');assert.equal(await key(page,'ENGINEER').count(),0,'SW8 remains hidden under the fitted cover after reload');assert.deepEqual(offline.state.settings,online.state.settings,'Engineering configuration survives offline reload');assert.deepEqual(offline.state.testZones,online.state.testZones,'Test zones survive reload');assert.deepEqual(offline.completed,online.completed,'Old/new lessons survive reload');
   await page.goto(base+'/app/#downloads/saved');await savedPDF(page,installationId);await savedPDF(page,'gent-0ba4cfc5de7c');await preserved(page,seeded);await page.goto(base+'/app/#fire-panel/'+profileId);await page.locator('.cfp-cabinet').waitFor();await cover(page,true);await press(page,'EXIT');await waitProperty(page,'engineering',null);assert.deepEqual((await state(page)).settings.coincidencePairs,[],'Exiting retains confirmed settings and discards the simulator draft');await cover(page,false);
  }
  const sigma=data.profiles.find(p=>p.id===sigmaId);for(const lesson of sigma.lessons)await completeLesson(page,sigma,lesson);await noOverflow(page);await preserved(page,seeded,{sigmaUnchanged:false});
  await page.locator('.visit-return-banner a').click();await page.locator('#field-save-status').waitFor();assert.equal((await readSetting(page,'session')).id,seeded.visit.id);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({width,status:'passed',offline:!layoutOnly,cfpLessons:cfp.lessons.length,sigmaLessons:sigma.lessons.length,checks:'source-reviewed fascia/PCB; separate cover and L3 entry; programming/commit/exit; physical guided actions; independent old progress; saved PDFs and visits'+(!layoutOnly?'; offline settings and manuals':''),cfpSteps:cfp.lessons.reduce((count,lesson)=>count+lesson.steps.length,0),sigmaSteps:sigma.lessons.reduce((count,lesson)=>count+lesson.steps.length,0),hardware:'Chromium viewport emulation; no physical panel or Safari certification'}));await context.close();
 }}catch(error){if(activePage){await activePage.screenshot({path:'/tmp/findr-cfp-level3-failure.png',fullPage:true}).catch(()=>{});fs.writeFileSync('/tmp/findr-cfp-level3-failure.html',await activePage.content().catch(()=>''));}throw error;}finally{await browser.close();}
}
// Manual-based assertions added independently of the lesson definitions.
async function viewState(page){return page.evaluate(async()=>{const db=await import('./db.mjs'),engine=await import('./conventional-fire-engine.mjs'),data=await fetch('./data/conventional-fire.json').then(r=>r.json()),saved=await db.setting('conventional-fire-trainer-v1:c-tec-cfp-standard');return engine.conventionalView(engine.buildConventionalModel(data,'c-tec-cfp-standard'),saved.state);});}
async function zoneInput(page,id,value){const details=page.locator('.conventional-scenarios');if(!await details.evaluate(node=>node.open))await details.locator('summary').click();await page.locator(`[data-conventional-input="${id}"]`).selectOption(value);await waitProperty(page,'inputs.'+id+'.alarm',value==='alarm');}
async function functionTarget(page,target){for(let n=0;n<10;n++){if((await state(page)).engineering?.functionId===target)return;await press(page,'ENGINEER');}throw Error('Function not reachable: '+target);}
async function checkEngineering(page,width){
 await freshScenario(page);await cover(page,true);await press(page,'ENGINEER');await waitProperty(page,'engineering.functionId','coincidence');
 const cycle=['coincidence','nonlatching','delays','test','system-fault','repeater-fault','open-circuit','short-circuit','sounder-status'];
 for(const expected of [...cycle.slice(1),'coincidence']){await press(page,'ENGINEER');await waitProperty(page,'engineering.functionId',expected);}
 // p19: actual scenario selectors retain open/short subtype and identify only that zone.
 await zoneInput(page,'Z3','open');await waitProperty(page,'inputs.Z3.faultType','open');assert.equal(await page.locator('[data-conventional-input="Z3"]').inputValue(),'open');await functionTarget(page,'open-circuit');assert.deepEqual((await viewState(page)).engineering.diagnosticZones,['Z3']);
 await zoneInput(page,'Z3','short');await waitProperty(page,'inputs.Z3.faultType','short');assert.equal(await page.locator('[data-conventional-input="Z3"]').inputValue(),'short');assert.deepEqual((await viewState(page)).engineering.diagnosticZones,[]);await functionTarget(page,'short-circuit');assert.deepEqual((await viewState(page)).engineering.diagnosticZones,['Z3']);await zoneInput(page,'Z3','normal');await waitProperty(page,'inputs.Z3.fault',false);await functionTarget(page,'coincidence');
 // p16: selecting is immediate at L3, but a staged pair needs NEXT to commit.
 await press(page,'NEXT_OPTION');await waitProperty(page,'engineering.optionIndex',0);await press(page,'TOGGLE');await waitProperty(page,'engineering.draftEnabled',true);assert.deepEqual((await state(page)).settings.coincidencePairs,[],'Unconfirmed pair does not change configuration');await press(page,'NEXT_OPTION');await waitProperty(page,'settings.coincidencePairs',['Z1-Z2']);
 const selected=structuredClone((await state(page)).engineering);await cover(page,false);await waitProperty(page,'coverOpen',false);assert.deepEqual((await state(page)).engineering,selected,'Cover replacement does not discard or commit engineering data');await cover(page,true);await waitProperty(page,'coverOpen',true);
 await checkZoom(page,width,'pcb');await page.locator('.cfp-control-pcb').scrollIntoViewIfNeeded();await noOverflow(page);await page.screenshot({path:`/tmp/findr-cfp-pcb-${width}.png`,fullPage:false});
 await press(page,'EXIT');await waitProperty(page,'engineering',null);await press(page,'KEYSWITCH');
 // p14: one coincidence member indicates fire; both are needed for normal outputs.
 await zoneInput(page,'Z1','alarm');let v=await viewState(page);assert.equal(v.status.fire,true);assert.equal(v.buzzerActive,true);assert.equal(v.outputs.sounders,false,'One coincidence member cannot operate alarm sounders');await zoneInput(page,'Z2','alarm');v=await viewState(page);assert.equal(v.outputs.sounders,true,'Both members permit the documented output');
 await zoneInput(page,'Z1','normal');await zoneInput(page,'Z2','normal');await press(page,'SOUNDERS');await press(page,'RESET');assert.equal((await viewState(page)).status.fire,false);
 // Preserve a deliberate tested engineering configuration for the offline check.
 await freshScenario(page);await cover(page,true);await functionTarget(page,'delays');await press(page,'NEXT_OPTION');await press(page,'TOGGLE');await press(page,'NEXT_OPTION');await waitProperty(page,'settings.delayedZones',['Z1']);
 await page.locator('#conventional-delay-minutes').selectOption('3');await waitSaved(page);await waitProperty(page,'settings.delayMinutes',3);
 const vr1Values=await page.locator('#conventional-delay-minutes option').evaluateAll(options=>options.map(option=>Number(option.value)));assert.deepEqual(vr1Values,[1,2,3,4,5,6,7,8,9,10],'VR1 UI offers the documented programmed range');
 await functionTarget(page,'test');await press(page,'NEXT_OPTION');await press(page,'NEXT_OPTION');await press(page,'NEXT_OPTION');await press(page,'NEXT_OPTION');await press(page,'NEXT_OPTION');await press(page,'TOGGLE');await press(page,'NEXT_OPTION');await waitProperty(page,'testZones',['Z5']);
 await press(page,'EXIT');await waitProperty(page,'engineering',null);assert.equal((await viewState(page)).walkTestActive,false,'A programmed test flag is not an active test input');await cover(page,false);await waitProperty(page,'coverOpen',false);
 await noOverflow(page);
}
run().catch(error=>{console.error(error);process.exit(1);});
