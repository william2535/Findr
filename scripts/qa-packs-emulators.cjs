// Browser acceptance for picture-pack expansion and the source-backed conventional
// fire trainers. Fixtures are synthetic; served PDF bytes are the checked manuals.
// Chromium viewport tests do not establish physical-panel or Safari behaviour.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.FINDR_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.FINDR_QA_URL || 'http://127.0.0.1:8085';
const layoutOnly = process.env.FINDR_QA_LAYOUT_ONLY === '1';
const root = path.resolve(__dirname, '..');
const json = name => JSON.parse(fs.readFileSync(path.join(root, 'public/app/data/'+name+'.json'), 'utf8'));
const catalogue = json('catalogue'), devices = json('devices');
const oldPdf = fs.readFileSync(process.env.FINDR_QA_PDF || '/tmp/findr-gent-installation.pdf');
const packChecks = [
 {pack:'bosch-security-devices',device:'bosch-device-blue-line-gen2-wp',record:'bosch-0ba92138ab30'},
 {pack:'risco-security-devices',device:'risco-device-bware-rk515dtgl',record:'risco-00a6655953a1'},
];
const dbValue = (page,key) => page.evaluate(async key => (await import('./db.mjs')).setting(key), key);
const key = (page,id) => page.locator(`[data-conventional-action="key"][data-key="${id}"]`);
const trainerState=(page,profile)=>dbValue(page,'conventional-fire-trainer-v1:'+profile);
async function waitState(page,profile,property,expected) {
 await page.waitForFunction(async ({profile,property,expected})=>{const db=await import('./db.mjs');let value=await db.setting('conventional-fire-trainer-v1:'+profile);for(const part of property.split('.'))value=value?.[part];return JSON.stringify(value)===JSON.stringify(expected);},{profile,property,expected});
 return trainerState(page,profile);
}
async function noOverflow(page) {
 assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false,'No horizontal viewport overflow');
}
async function readPDF(page,recordId) {
 await page.locator(`[data-action="read"][data-id="${recordId}"]`).click();
 await page.locator('#pdf-status').filter({hasText:'Saved PDF · offline'}).waitFor();
 assert.ok(await page.locator('#pdf-canvas').evaluate(canvas=>canvas.width>0));
 await page.locator('[data-action="close-modal"]').click();
}
async function seedPreservedRecords(page) {
 return page.evaluate(async encoded => {
  const db = await import('./db.mjs'), engine=await import('./emulator-engine.mjs'), maps=await import('./menu-map-engine.mjs');
  const practice=await fetch('./data/practice.json').then(r=>r.json()),profile=practice.profiles.find(p=>p.id==='galaxy-dimension');
  const map=maps.prepareMenuMap(await fetch('./data/menu-maps/galaxy-dimension.json').then(r=>r.json()));
  const state=engine.createEmulatorState(engine.buildEmulatorModel(map,profile));
  const zone=Object.keys(state.omittedZones)[0];state.omittedZones[zone]=true;state.zoneNames[zone]='SYNTHETIC retained zone';
  const emulator={version:1,profiles:{'galaxy-dimension':state}};
  const old={id:'synthetic-picture-pack-visit',site:'SYNTHETIC preserved visit',panel:{brand:'Gent',model:'Unknown',category:'fire',record_ids:[]},started:1,notes:'SYNTHETIC original fault log',answers:{},fieldVisit:{id:'synthetic-picture-pack-visit',schemaVersion:1,state:'paused',siteRef:'SYNTHETIC preserved visit',incidents:[],assets:[],events:[],impairments:[],handover:{}}};
  const imports=[{id:'synthetic-preserved-schedule',site:'SYNTHETIC site',panel:'SYNTHETIC panel',rows:[{loop:'01',address:'037',location:'SYNTHETIC retained location'}]}];
  await db.setSetting('keypad-emulator-state-v1',emulator);await db.setSetting('history',[old]);await db.setSetting('session',old);await db.setSetting('panel-imports-v1',imports);
  const catalogue=await fetch('./data/catalogue.json').then(r=>r.json()),record=catalogue.records.find(r=>r.id==='gent-0ba4cfc5de7c');
  const bytes=Uint8Array.from(atob(encoded),char=>char.charCodeAt(0));await db.saveManual({...record,savedAt:1,bytes:bytes.length},new Blob([bytes],{type:'application/pdf'}));
  return {old,imports,emulator};
 },oldPdf.toString('base64'));
}
async function checkPreservedRecords(page,seeded) {
 const actual=await page.evaluate(async()=>{const db=await import('./db.mjs');return {old:(await db.setting('history')).find(x=>x.id==='synthetic-picture-pack-visit'),imports:await db.setting('panel-imports-v1'),emulator:await db.setting('keypad-emulator-state-v1'),pdfBytes:(await db.getFile('gent-0ba4cfc5de7c')).size};});
 assert.deepEqual(actual.old,seeded.old,'Old fault visit unchanged');assert.deepEqual(actual.imports,seeded.imports,'Old imported schedule unchanged');assert.deepEqual(actual.emulator,seeded.emulator,'Earlier keypad progress unchanged');assert.equal(actual.pdfBytes,oldPdf.length,'Existing PDF bytes preserved');
}
async function checkDevicePack(page,check) {
 const expected=devices.find(d=>d.id===check.device);assert.ok(expected,'New device fixture exists');
 await page.goto(base+'/app/#device-pack/'+check.pack);await page.locator('.device-pack-grid').waitFor();
 const image=page.locator(`.device-pack-grid [data-action="device-view"][data-id="${check.device}"] img`);
 await image.waitFor();await image.evaluate(img=>img.decode());assert.ok(await image.evaluate(img=>img.complete&&img.naturalWidth>0),'Picture loads from bundled asset');
 await page.locator(`.device-pack-grid button[data-action="device-view"][data-id="${check.device}"]`).last().click();
 await page.locator('.device-detail').waitFor();assert.match(await page.locator('.device-detail').innerText(),new RegExp(expected.part_numbers[0].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 await page.locator(`[data-action="device-manuals"][data-id="${check.device}"]`).click();
 await page.locator(`#modal [data-action="download-one"][data-id="${check.record}"]`).click();
 await page.locator(`[data-action="read"][data-id="${check.record}"]`).waitFor({timeout:60000});
 await readPDF(page,check.record);await noOverflow(page);
}
async function checkPanelCard(page) {
 const panels=json('panels'),panel=panels.find(p=>p.id==='kentec-sigma-cp-r');assert.ok(panel,'New repeater card exists');
 await page.goto(base+'/app/#identify');await page.locator('#panel-search').fill('Sigma CP-R');
 const picture=page.locator('[data-action="panel"][data-id="kentec-sigma-cp-r"] img');await picture.waitFor();await picture.evaluate(img=>img.decode());assert.ok(await picture.evaluate(img=>img.complete&&img.naturalWidth>0));
 await page.locator('button[data-action="panel"][data-id="kentec-sigma-cp-r"]').last().click();await page.locator('[data-action="panel-manuals"][data-id="kentec-sigma-cp-r"]').click();
 const record='kentec-922756f21680';await page.locator(`#modal [data-action="download-one"][data-id="${record}"]`).click();await page.locator(`[data-action="read"][data-id="${record}"]`).waitFor({timeout:60000});await readPDF(page,record);await noOverflow(page);
}
async function run() {
 const browser=await chromium.launch({executablePath:process.env.FINDR_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 let activePage;
 try {for(const width of [390,1440]) {
  const context=await browser.newContext({viewport:{width,height:844},...(layoutOnly?{serviceWorkers:'block'}:{})});
  const page=await context.newPage();activePage=page;const errors=[];page.on('pageerror',error=>{errors.push(error.stack||error.message);console.error('BROWSER ERROR',error.stack||error.message);});
  for(const check of packChecks){const bytes=fs.readFileSync('/tmp/findr-pack-audit/'+check.record+'.pdf');await page.route('**/api/manual/'+check.record,route=>route.fulfill({status:200,contentType:'application/pdf',body:bytes}));}
  const panelRecord='kentec-922756f21680',panelPDF=fs.readFileSync('/tmp/findr-panel019/'+panelRecord+'.pdf');await page.route('**/api/manual/'+panelRecord,route=>route.fulfill({status:200,contentType:'application/pdf',body:panelPDF}));
  // Deterministically change the hash while the catalogue is still loading.
  let releaseCatalogue;const catalogueGate=new Promise(resolve=>{releaseCatalogue=resolve;});
  await page.route('**/app/data/device-packs.json',async route=>{await catalogueGate;await route.continue();});
  await page.goto(base+'/app/',{waitUntil:'domcontentloaded'});await page.evaluate(()=>{location.hash='#device-pack/bosch-security-devices';});releaseCatalogue();
  await page.locator('.device-pack-grid').waitFor();await page.unroute('**/app/data/device-packs.json');const seeded=await seedPreservedRecords(page);await page.reload();
  for(const check of packChecks)await checkDevicePack(page,check);await checkPanelCard(page);
  await page.goto(base+'/app/#emulator');for(const profile of ['c-tec-cfp-standard','kentec-sigma-cp'])await page.locator(`a[href="#fire-panel/${profile}"]`).first().waitFor();
  const expected=await checkTrainers(page,width);await checkPreservedRecords(page,seeded);await noOverflow(page);
  if(!layoutOnly){
   await page.locator('#connection').filter({hasText:'App ready offline'}).waitFor({timeout:90000});await context.setOffline(true);await page.reload();await page.locator('.conventional-root').waitFor();
   for(const [profile,saved]of Object.entries(expected)){await page.goto(base+'/app/#fire-panel/'+profile);await page.locator('.conventional-root').waitFor();const current=await trainerState(page,profile);assert.deepEqual(current.completed,saved.completed,'Completed lessons retained offline for '+profile);assert.deepEqual(current.state.disabledZones,saved.state.disabledZones,'Recorded disablements retained independently for '+profile);}
   for(const check of packChecks){await page.goto(base+'/app/#device-pack/'+check.pack);await page.locator('.device-pack-grid').waitFor();const pictures=page.locator('.device-pack-grid img');for(const picture of await pictures.all()){await picture.evaluate(img=>img.decode());assert.ok(await picture.evaluate(img=>img.complete&&img.naturalWidth>0),'Device picture available offline');}await readPDF(page,check.record);}
   await page.goto(base+'/app/#downloads/saved');await readPDF(page,'gent-0ba4cfc5de7c');await checkPreservedRecords(page,seeded);
   await page.goto(base+'/app/#fire-panel/kentec-sigma-cp');await page.locator('.conventional-root').waitFor();await page.locator('.visit-return-banner a[href="#investigation"]').click();await page.locator('#field-save-status').waitFor();assert.equal((await dbValue(page,'session')).id,seeded.old.id,'Trainer returns to the same fault visit');
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({width,status:'passed',offline:!layoutOnly,checks:'Bosch/Risco picture packs and exact linked PDFs; new Sigma CP-R picture/manual; both conventional fire trainers and literal-key lessons; scope/citations; independent practice state; previous visit/import/PDF/keypad settings preserved',hardware:'Chromium viewport emulation, not physical iPhone/Safari or panel hardware'}));await context.close();
 }}catch(error){if(activePage){await activePage.screenshot({path:'/tmp/findr-packs-emulators-failure.png',fullPage:true}).catch(()=>{});fs.writeFileSync('/tmp/findr-packs-emulators-failure.html',await activePage.content().catch(()=>''));}throw error;}finally{await browser.close();}
}
// checkTrainers is defined below so each operation is driven through real UI controls.
async function pressPhysical(page,id,heldMs=0) {
 // Locator click re-resolves the control if route rendering replaces the face.
 // Its delay is a real pointer-down hold, not an engine shortcut.
 await key(page,id).click(heldMs?{delay:heldMs+80}:{});
}
async function checkLampHold(page,profile) {
 const cfp=profile.id==='c-tec-cfp-standard',lampKey=cfp?'TOGGLE':'LAMP_TEST';
 if(cfp)await pressPhysical(page,'KEYSWITCH');
 const target=key(page,lampKey);await target.scrollIntoViewIfNeeded();const bounds=await target.boundingBox();
 await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.down();
 await page.locator('.conventional-zone .conventional-lamp.red.on').first().waitFor();
 assert.equal(await page.locator('.conventional-zone .conventional-lamp.red.on').count(),8,'All zone fire lamps visibly on while held');
 await page.mouse.up();await waitState(page,profile.id,'state.lampTest',false);
 assert.equal(await page.locator('.conventional-zone .conventional-lamp.red.on').count(),0,'Lamp hold clears on release');
 if(cfp)await pressPhysical(page,'KEYSWITCH');
}
async function completeLesson(page,profile,lesson) {
 await page.goto(base+'/app/#fire-panel/'+profile.id+'/learn');await page.locator(`[data-conventional-action="lesson"][data-id="${lesson.id}"]`).click();
 for(let index=0;index<lesson.steps.length;index++){
  const step=lesson.steps[index];assert.ok(await page.locator('.conventional-coach .conventional-refs a').count(),'Lesson step cites source');
  if(step.expectedKeys){for(const physical of step.expectedKeys){assert.ok(await key(page,physical).evaluate(el=>el.classList.contains('conventional-key-hint')),'Expected literal control highlighted for '+lesson.id+'/'+step.id);await pressPhysical(page,physical,step.holdMs||0);}}
  else if(step.expectedMode)await page.locator(`[data-conventional-action="mode"][data-mode="${step.expectedMode}"]`).click();
  else if(step.expectedInput)await page.locator('[data-conventional-action="lesson-input"]').click();
  else if(step.expectedAction==='advance-test')await page.locator('[data-conventional-action="tick"]').click();
  else throw Error('Uncovered lesson UI operation '+lesson.id+'/'+step.id);
  try{await page.waitForFunction(value=>Number(document.querySelector('.conventional-coach progress')?.value)===value,index+1,{timeout:4000});}catch(error){throw Error('Lesson did not advance: '+lesson.id+'/'+step.id+' after '+JSON.stringify(step.expectedKeys||step.expectedMode||step.expectedInput)+': '+error.message);}
 }
 await page.locator('.conventional-coach').filter({hasText:'LESSON COMPLETE'}).waitFor();
 await page.waitForFunction(async({profile,id})=>!!(await(await import('./db.mjs')).setting('conventional-fire-trainer-v1:'+profile))?.completed?.[id],{profile:profile.id,id:lesson.id});
}
async function checkTrainers(page,width) {
 const data=json('conventional-fire'),expected={};
 for(const profile of data.profiles){
  await page.goto(base+'/app/#fire-panel/'+profile.id);await page.locator('.conventional-face').waitFor();assert.equal(await page.locator('.conventional-face [data-conventional-action="key"]').count(),profile.physicalKeys.length,'Actual controls match sourced profile');assert.equal(await page.locator('.conventional-zone').count(),8);
  assert.equal(await page.locator('.conventional-seven-segment').count(),profile.id==='kentec-sigma-cp'?1:0,'Only Sigma has a physical mode display');
  await noOverflow(page);await page.locator('.conventional-face').scrollIntoViewIfNeeded();await page.screenshot({path:`/tmp/findr-${profile.id}-${width}.png`,fullPage:false});
  await checkLampHold(page,profile);
  // SHOW HINTS does not itself press a physical control or complete a lesson.
  for(const lesson of profile.lessons)await completeLesson(page,profile,lesson);
  // The source listing and manual action must remain scoped to this panel.
  await page.goto(base+'/app/#fire-panel/'+profile.id+'/sources');await page.locator('.conventional-root').waitFor();const sources=await page.locator('.conventional-root').innerText();assert.match(sources,profile.id==='kentec-sigma-cp'?/Man-1078/:/DFU7001020/);assert.equal(sources.includes(profile.id==='kentec-sigma-cp'?'DFU7001020':'Man-1078'),false,'Other family source manuals excluded');
  await page.locator('[data-conventional-action="manuals"]').click();await page.locator('#modal[open]').waitFor();const manualText=await page.locator('#modal').innerText();assert.equal(/No panel documents linked/i.test(manualText),false);assert.equal(manualText.includes(profile.id==='kentec-sigma-cp'?'DFU7001020':'Sigma CP'),false,'Manual action only lists this family');await page.locator('[data-action="close-modal"]').click();
  // Persist a visible, deliberate disablement and keep it distinct per profile.
  await page.goto(base+'/app/#fire-panel/'+profile.id);await page.locator('.conventional-scenarios > summary').click();await page.locator('#conventional-scenario').selectOption('disabled-zone');await page.locator('[data-conventional-action="scenario"]').click();await waitState(page,profile.id,'state.disabledZones',['Z1']);
  expected[profile.id]=await trainerState(page,profile.id);assert.equal(Object.keys(expected[profile.id].completed).length,profile.lessons.length);
  await noOverflow(page);
 }
 return expected;
}
run().catch(error=>{console.error(error);process.exit(1);});
