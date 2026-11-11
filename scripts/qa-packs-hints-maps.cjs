// Browser acceptance for the 0.23 wiring packs, contextual hints and menu maps.
// Stored site records are synthetic; PDF fixtures are the reviewed source bytes.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require(process.env.FINDR_PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..'),base=process.env.FINDR_QA_URL||'http://127.0.0.1:8087';
const widths=(process.env.FINDR_QA_WIDTHS||'390,1440').split(',').map(Number),layoutOnly=process.env.FINDR_QA_LAYOUT_ONLY==='1';
const json=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const expectedBuild=fs.readFileSync(path.join(root,'public/app/precache.js'),'utf8').match(/self\.__BUILD="([^"]+)"/)[1];
const wiring=json('public/app/data/wiring-diagrams.json'),practice=json('public/app/data/practice.json');
const fixture=json('tests/fixtures/packs-hints-maps/synthetic-0.22-progress.json');
const sigmaId='kentec-0d82d93522c3',oldManualId='gent-0ba4cfc5de7c';
const sigmaPDF=fs.readFileSync(process.env.FINDR_SIGMA_PDF||'/tmp/findr-emulator-source-audit/kentec-sigma-cp-main.pdf');
const oldPDF=fs.readFileSync(process.env.FINDR_QA_PDF||'/tmp/findr-gent-installation.pdf');
const sigmaEntry=wiring.entries.find(entry=>entry.recordId===sigmaId&&entry.pdfPage===11);
assert.equal(hash(sigmaPDF),sigmaEntry.sourceSha256,'QA uses the exact reviewed Sigma PDF');
const fireProfiles=['gent-vigilon','gent-nano','c-tec-cfp-standard','kentec-sigma-cp'];
const engineRoutes=[...practice.profiles.map(profile=>({id:profile.id,route:'#emulator/'+profile.id,selector:'.emulator-workspace'})),
 {id:'gent-vigilon',route:'#gent',selector:'.gent-workspace'},
 {id:'gent-nano',route:'#nano',selector:'.nano-workspace'},
 {id:'c-tec-cfp-standard',route:'#fire-panel/c-tec-cfp-standard',selector:'.cfp-cabinet'},
 {id:'kentec-sigma-cp',route:'#fire-panel/kentec-sigma-cp',selector:'.sigma-cabinet'}];
async function noOverflow(page){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No page-level horizontal overflow');}
async function imageLoaded(locator){await locator.evaluate(async img=>{await img.decode();if(!img.complete||!img.naturalWidth)throw Error('Image did not decode');});}
async function close(page){const button=page.locator('#modal[open] [data-action="close-modal"]');if(await button.count())await button.click();}
async function waitReader(page,pdfPage){
 await page.locator('#pdf-status').filter({hasText:'Saved PDF · offline'}).waitFor();await page.evaluate(()=>delete window.__packsQApaint);
 await page.waitForFunction(()=>{const canvas=document.querySelector('#pdf-canvas');if(!canvas?.width||!canvas.height)return false;const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let ink=0,signature=2166136261;for(let offset=0;offset<pixels.length;offset+=64){const sum=pixels[offset]+pixels[offset+1]+pixels[offset+2];if(pixels[offset+3]>0&&sum<700)ink++;signature=Math.imul(signature^sum,16777619);}const previous=window.__packsQApaint,stable=previous?.signature===signature?previous.stable+1:0;window.__packsQApaint={signature,stable};return ink>50&&stable>=3;},{},{polling:100});
 assert.equal(Number(await page.locator('#pdf-page').inputValue()),pdfPage,'Correct source PDF page rendered');
}
async function seed(page){return page.evaluate(async({fixture,pdf,oldManualId,fileHash})=>{
 const db=await import('./db.mjs');for(const[id,record]of Object.entries(fixture.profiles))await db.setSetting('conventional-fire-trainer-v1:'+id,record);
 const visit={id:'synthetic-packs-hints-visit',site:'SYNTHETIC previous fault visit',panel:{brand:'Kentec',model:'Sigma CP',category:'fire',record_ids:[]},started:1,notes:'SYNTHETIC retained reading 23.70 V',answers:{},fieldVisit:{id:'synthetic-packs-hints-visit',schemaVersion:1,state:'paused',siteRef:'SYNTHETIC previous fault visit',incidents:[],assets:[],events:[],impairments:[],handover:{}}};
 const imports=[{id:'synthetic-packs-hints-import',site:'SYNTHETIC previous site',panel:'Previous addressable panel',rows:[{loop:'01',address:'037',location:'SYNTHETIC retained label'}]}];
 const keypad={version:1,profiles:{'synthetic-preservation-marker':{note:'SYNTHETIC previous intruder settings'}}};
 const usage={'pack/kentec':{count:2,lastUsed:1}};
 await db.setSetting('history',[visit]);await db.setSetting('session',visit);await db.setSetting('panel-imports-v1',imports);await db.setSetting('keypad-emulator-state-v1',keypad);await db.setSetting('pack-usage',usage);
 const catalogue=await fetch('./data/catalogue.json').then(r=>r.json()),manual=catalogue.records.find(r=>r.id===oldManualId),bytes=Uint8Array.from(atob(pdf),char=>char.charCodeAt(0));await db.saveManual({...manual,savedAt:1,bytes:bytes.length,fileHash},new Blob([bytes],{type:'application/pdf'}));
 return {visit,imports,keypadMarker:keypad.profiles['synthetic-preservation-marker'],usage,profiles:fixture.profiles};
},{fixture,pdf:oldPDF.toString('base64'),oldManualId,fileHash:hash(oldPDF)});}
async function preserved(page,seeded){
 const actual=await page.evaluate(async oldManualId=>{const db=await import('./db.mjs'),blob=await db.getFile(oldManualId);return {visit:(await db.setting('history')).find(x=>x.id==='synthetic-packs-hints-visit'),imports:await db.setting('panel-imports-v1'),keypadMarker:(await db.setting('keypad-emulator-state-v1')).profiles['synthetic-preservation-marker'],usage:await db.setting('pack-usage'),profiles:{'kentec-sigma-cp':await db.setting('conventional-fire-trainer-v1:kentec-sigma-cp'),'c-tec-cfp-standard':await db.setting('conventional-fire-trainer-v1:c-tec-cfp-standard')},pdfBytes:blob.size,pdfHash:[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('')};},oldManualId);
 for(const name of ['visit','imports','keypadMarker','usage'])assert.deepEqual(actual[name],seeded[name],'Earlier '+name+' preserved');
 for(const id of Object.keys(seeded.profiles)){assert.deepEqual(actual.profiles[id].state,seeded.profiles[id].state,'Earlier '+id+' state preserved');assert.deepEqual(actual.profiles[id].completed,seeded.profiles[id].completed,'Earlier '+id+' completions preserved');}
 assert.equal(actual.pdfBytes,oldPDF.length);assert.equal(actual.pdfHash,hash(oldPDF),'Earlier PDF bytes unchanged');
}
async function engineSnapshots(page){return page.evaluate(async()=>{const db=await import('./db.mjs'),names=['keypad-emulator-state-v1','gent-vigilon-trainer-v1','gent-nano-trainer-v1','conventional-fire-trainer-v1:c-tec-cfp-standard','conventional-fire-trainer-v1:kentec-sigma-cp'],values={};for(const name of names){const value=await db.setting(name);if(value)values[name]=value.profiles||value.state;}return values;});}
async function openWiringPicture(page){await page.locator(`[data-action="wiring-view"][data-id="${sigmaEntry.id}"]`).first().click();await page.locator('#modal.wiring-viewer[open]').waitFor();await imageLoaded(page.locator('#wiring-picture'));}

// Feature checks are below; fixtures and helpers above preserve the prior release.
async function menuMaps(page,width){
 await page.goto(base+'/app/#menus');await page.locator('.menu-map-card').first().waitFor();
 assert.equal(await page.locator('.menu-map-card').count(),13,'All existing emulator families have a map');
 assert.equal(await page.locator('[data-menu-profile] option').count(),14,'Search covers all13 families plus All');
 await noOverflow(page);await page.screenshot({path:`/tmp/findr-023-menu-maps-${width}.png`,fullPage:false});
 const checked=[];
 for(const {id}of engineRoutes){
  const map=json('public/app/data/menu-maps/'+id+'.json');
  const example=map.nodes.find(node=>node.kind==='status')||map.nodes.find(node=>node.kind==='command')||map.nodes.find(node=>node.kind==='menu');
  await page.locator('[data-menu-profile]').selectOption(id);await page.locator('[data-menu-search]').fill(example.label);
  const results=page.locator('.menu-result');await results.first().waitFor();
  const routes=await results.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));
  assert.ok(routes.every(route=>route.startsWith('#menus/'+id+'/')),'Search remains in selected exact family');checked.push({id,nodes:map.nodes.length,example:example.label});
 }
 for(const id of fireProfiles){
  const map=json('public/app/data/menu-maps/'+id+'.json');
  await page.goto(base+'/app/#menus/'+id);await page.locator('.menu-panel-heading').waitFor();await noOverflow(page);
  const expected=engineRoutes.find(route=>route.id===id).route;
  assert.equal(await page.locator('.menu-panel-heading a.secondary').getAttribute('href'),expected,'Family opens its own engine');
  const blocked=map.nodes.find(node=>['reference-only','conditional','conflict','version-limited'].includes(node.simulationStatus));
  assert.ok(blocked,'Source limits remain represented for '+id);
  await page.goto(base+'/app/#menus/'+id+'/'+encodeURIComponent(blocked.id));await page.locator('.menu-entry-heading').waitFor();
  assert.equal(await page.locator('.menu-entry-heading a').count(),0,'Reference-only entry has no simulated operation link');
  assert.ok(await page.locator('.menu-simulation-status').count(),'Reference status is visible');
  assert.ok(await page.locator('.menu-source-links a[href]').count(),'Source references remain available');
  const linked=map.nodes.find(node=>node.simulationStatus==='implemented'&&node.hintsRoute);
  assert.ok(linked,'A supported route is discoverable for '+id);
  await page.goto(base+'/app/#menus/'+id+'/'+encodeURIComponent(linked.id));await page.locator('.menu-entry-heading').waitFor();
  assert.equal(await page.locator('.menu-show-hints').getAttribute('href'),linked.hintsRoute,'Hint link uses explicit engine binding');
  if(id==='kentec-sigma-cp')await page.screenshot({path:`/tmp/findr-023-sigma-map-entry-${width}.png`,fullPage:false});
 }
 return checked;
}
async function allHints(page,width){
 const checked=[];
 for(const engine of engineRoutes){
  await page.goto(base+'/app/'+engine.route);await page.locator(engine.selector).first().waitFor();
  const hint=page.locator('[data-onsite="hints"]').first();await hint.waitFor();
  const box=await hint.boundingBox();assert.ok(box.height>=44,'Hint control is a large touch target for '+engine.id);
  const before=await engineSnapshots(page);await hint.click();
  const dialog=page.locator('.onsite-dialog[open]');await dialog.waitFor();
  await dialog.locator('[data-result]').first().waitFor();
  const data=await dialog.innerText();assert.doesNotMatch(data,/Choose the exact panel/i,'Engine context is already selected');
  const contextId=await page.locator('[data-onsite="hints"]').first().evaluate(button=>button.closest('[data-onsite-panel]').dataset.onsitePanel);
  assert.ok([engine.id,engine.id==='gent-vigilon'?'gent':engine.id==='gent-nano'?'nano':engine.id].includes(contextId),'Correct exact hint context');
  assert.deepEqual(await engineSnapshots(page),before,'Opening scoped hints does not change engine state');
  await noOverflow(page);if(engine.id==='kentec-sigma-cp')await page.screenshot({path:`/tmp/findr-023-sigma-hints-${width}.png`,fullPage:false});
  await dialog.locator('[data-close]').click();checked.push({id:engine.id,contextId});
 }
 return checked;
}
async function unsupportedHints(page,width){
 const panel=json('public/app/data/panels.json').find(item=>item.id==='kentec-sigma-xt');assert.ok(panel);
 await page.goto(base+'/app/#identify');await page.locator('#panel-search').waitFor();await page.locator('#panel-search').fill(panel.model);
 await page.locator(`[data-action="panel"][data-id="${panel.id}"]`).first().click();await page.locator('#modal[open]').waitFor();
 await page.locator('#modal [data-onsite="hints"]').click();const dialog=page.locator('.onsite-dialog[open]');await dialog.waitFor();
 const text=await dialog.innerText();assert.match(text,/Sigma XT/i,'Unsupported panel retains its own model name');assert.match(text,/not.*verified|no.*verified|not.*available|not.*yet/i,'Unavailable interactive instructions are explicit');
 assert.equal(await dialog.locator('a[href^="#emulator"],a[href^="#gent"],a[href^="#nano"],a[href^="#fire-panel"]').count(),0,'Unsupported model never borrows another engine');
 await page.screenshot({path:`/tmp/findr-023-unsupported-hints-${width}.png`,fullPage:false});
 const manuals=dialog.locator('[data-action="panel-manuals"]');if(await manuals.count()){await manuals.click();await page.locator('#modal[open] .manual').first().waitFor();assert.match(await page.locator('#modal').innerText(),/Sigma XT/i,'Unsupported model opens its own manual list');}else await dialog.locator('[data-close]').click();await close(page);
}
async function wiringPacks(page,width,setDownloadFailure){
 const data=json('public/app/data/wiring-packs.json'),allIds=data.packs.flatMap(pack=>pack.entryIds);
 assert.equal(new Set(allIds).size,wiring.entries.length,'Every picture belongs to one explicit family');assert.equal(allIds.length,wiring.entries.length,'No duplicate picture membership');
 await page.goto(base+'/app/#downloads/wiring-packs');await page.locator('.wiring-brand-card').first().waitFor();
 await page.locator('[data-wiring-pack-search]').fill('');assert.equal(await page.locator('.wiring-brand-card').count(),data.brands.length);
 const accents=await page.locator('.wiring-brand-card').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).getPropertyValue('--pack-accent').trim()));
 assert.ok(new Set(accents).size>=10,'Distinct coordinated accents are visible');assert.ok(accents.every(accent=>/^#[a-f\d]{6}$/i.test(accent)));
 for(const card of await page.locator('.wiring-brand-card').all()){await card.scrollIntoViewIfNeeded();for(const img of await card.locator('img').all())await imageLoaded(img);}
 await page.locator('.wiring-brand-card').first().evaluate(node=>node.scrollIntoView({block:'start'}));await noOverflow(page);await page.screenshot({path:`/tmp/findr-023-brands-${width}.png`,fullPage:false});
 await page.locator('[data-wiring-pack-search]').fill('S-Quad');assert.equal(await page.locator('.wiring-brand-card').count(),1);assert.match(await page.locator('.wiring-brand-card').innerText(),/Gent/);
 await page.locator('[data-wiring-pack-search]').fill('');await page.locator('.wiring-brand-card[href="#downloads/wiring-packs/kentec"]').click();await page.locator('.wiring-family-card').first().waitFor();
 const kentec=data.packs.filter(pack=>pack.brandId==='kentec');assert.equal(await page.locator('.wiring-family-card').count(),kentec.length);
 const familyAccents=await page.locator('.wiring-family-card').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).getPropertyValue('--pack-accent').trim()));assert.ok(familyAccents.every(colour=>colour===data.brands.find(brand=>brand.id==='kentec').colour),'One brand uses one consistent family colour');
 for(const card of await page.locator('.wiring-family-card').all()){await card.scrollIntoViewIfNeeded();for(const img of await card.locator('img').all())await imageLoaded(img);}await page.locator('.wiring-family-card').first().evaluate(node=>node.scrollIntoView({block:'start'}));await noOverflow(page);await page.screenshot({path:`/tmp/findr-023-kentec-families-${width}.png`,fullPage:false});
 await page.locator('.wiring-family-card[href="#downloads/wiring-packs/kentec/kentec-sigma-cp"]').click();await page.locator('.wiring-pack-detail-banner').waitFor();
 const expected=data.packs.find(pack=>pack.id==='kentec-sigma-cp'),ids=await page.locator('.wiring-grid .wiring-card-picture').evaluateAll(nodes=>nodes.map(node=>node.dataset.id));
 assert.deepEqual([...ids].sort(),[...expected.entryIds].sort(),'Sigma CP family contains only its scoped pages');
 await page.locator('[data-wiring-pack-picture-search]').fill('zone');assert.ok(await page.locator(`[data-action="wiring-view"][data-id="${sigmaEntry.id}"]`).count());
 await openWiringPicture(page);assert.ok((await page.locator('#modal').innerText()).includes(sigmaEntry.edition));await close(page);
 assert.equal(await page.locator('[data-wiring-pack-picture-search]').inputValue(),'zone','Picture return retains family query');
 await page.locator('[data-wiring-pack-picture-search]').fill('');
 setDownloadFailure(true);await page.locator('[data-wiring-pack-action="download"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-wiring-pack-action="download"]')?.disabled===false);
 assert.equal(await page.evaluate(async id=>!!(await(await import('./db.mjs')).getFile(id)),sigmaId),false,'Failed family download does not claim a saved PDF');
 assert.ok(page.url().endsWith('#downloads/wiring-packs/kentec/kentec-sigma-cp'),'Download failure keeps the family context');
 setDownloadFailure(false);await page.locator('[data-wiring-pack-action="download"]').click();
 await page.locator('.wiring-pack-manual-actions strong').filter({hasText:'1 / 1'}).waitFor();
 assert.equal(await page.locator('[data-wiring-pack-action="download"]').count(),0,'Already-saved source is not offered as a missing download');
 await openWiringPicture(page);await page.locator('[data-action="wiring-open-source"]').click();await waitReader(page,11);await page.screenshot({path:`/tmp/findr-023-pack-source-pdf-${width}.png`,fullPage:false});await close(page);
 await page.locator('[data-wiring-pack-action="manuals"]').click();await page.locator('#modal[open] .manual').first().waitFor();assert.ok((await page.locator('#modal').innerText()).includes('Sigma CP'));await close(page);
 return {brands:data.brands.length,packs:data.packs.length,pictures:allIds.length};
}
async function offlineChecks(page,context,seeded,width){
 await page.locator('#connection').filter({hasText:'App ready offline'}).waitFor({timeout:180000});
 await page.unroute('**/api/manual/'+sigmaId);await context.setOffline(true);await page.goto(base+'/app/#downloads/wiring-packs/kentec/kentec-sigma-cp');await page.reload();
 await page.locator('.wiring-pack-detail-banner').waitFor();assert.equal(await page.evaluate(()=>navigator.onLine),false);
 await openWiringPicture(page);await page.screenshot({path:`/tmp/findr-023-offline-picture-${width}.png`,fullPage:false});
 await page.locator('[data-action="wiring-open-source"]').click();await waitReader(page,11);await close(page);
 await page.goto(base+'/app/#downloads/saved');await page.locator('#manual-search').waitFor();await page.locator('#manual-search').fill('');
 await page.locator(`[data-action="read"][data-id="${oldManualId}"]`).click();await waitReader(page,1);await close(page);
 await menuMaps(page,width);await allHints(page,width);await preserved(page,seeded);
 const cache=await page.evaluate(async()=>{const result=[];for(const name of(await caches.keys()).filter(name=>name.startsWith('findr-shell-'))){const cache=await caches.open(name),stamp=await cache.match(new URL('./offline-verified.json',location.href));if(stamp){const data=await stamp.json();result.push({cache:name,build:data.build,version:data.version,assetCount:data.assets.length});}}return result;});
 assert.ok(cache.some(item=>item.build===expectedBuild),'Current release assets are verified offline');return cache;
}
async function activeHints(browser,width){
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 const cases=[
  {id:'galaxy-dimension',route:'#emulator/galaxy-dimension/galaxy-21/hints',coach:'[data-emulator-hint-guide]',cue:'[data-emulator-hint-guide] [role="progressbar"]',advance:'[data-hint-next="true"]'},
  {id:'gent-vigilon',route:'#gent/coach/gent-menu-basics',coach:'.gent-coach',cue:'.gent-coach .gent-step-count',advance:'[data-gent-action="lesson-action"]'},
  {id:'gent-nano',route:'#nano/coach/nano-panel-basics',coach:'.gent-coach',cue:'.gent-coach .gent-step-count',advance:'[data-nano-action="lesson-action"]'},
  {id:'c-tec-cfp-standard',route:'#fire-panel/c-tec-cfp-standard/coach/cfp-code-access',coach:'.conventional-coach',cue:'.conventional-mobile-cue',advance:'[data-conventional-action="key"][data-key="EXIT"]'},
  {id:'kentec-sigma-cp',route:'#fire-panel/kentec-sigma-cp/coach/sigma-access',coach:'.conventional-coach',cue:'.conventional-mobile-cue',advance:'[data-conventional-action="key"][data-key="KEYSWITCH"]'}
 ];
 try{for(const item of cases){
  await page.goto(base+'/app/'+item.route);await page.locator(item.coach).first().waitFor();
  const cueValue=()=>page.locator(item.cue).first().evaluate(node=>JSON.stringify({text:node.textContent,step:node.getAttribute('aria-valuenow')}));
  const initialCue=await cueValue();await page.locator(item.advance+':visible').first().click();
  await page.waitForFunction(({selector,previous})=>{const node=document.querySelector(selector);return node&&JSON.stringify({text:node.textContent,step:node.getAttribute('aria-valuenow')})!==previous;},{selector:item.cue,previous:initialCue});
  const beforeCue=await cueValue(),before=await engineSnapshots(page),url=page.url();
  await page.locator('[data-onsite="hints"]').first().click();await page.locator(item.coach).first().waitFor();
  assert.equal(await page.locator('.onsite-dialog[open]').count(),0,'Active task retains its in-place hints');
  assert.equal(await cueValue(),beforeCue,'Opening active hints keeps earned task progress');
  assert.deepEqual(await engineSnapshots(page),before,'Opening active hints presses no key and changes no engine state');
  assert.equal(page.url(),url,'Active hints keep the current route');await noOverflow(page);
 }
 for(const id of fireProfiles){
  const map=json('public/app/data/menu-maps/'+id+'.json'),node=map.nodes.find(node=>node.simulationStatus==='implemented'&&node.hintsRoute),engine=engineRoutes.find(item=>item.id===id);
  await page.goto(base+'/app/#menus/'+id+'/'+encodeURIComponent(node.id));await page.locator('.menu-show-hints').waitFor();await page.locator('.menu-show-hints').click();await page.locator(engine.selector).first().waitFor();
  assert.ok(page.url().split('/app/')[1].startsWith(engine.route),'Map click opens the correct engine for '+id);
  await page.locator(id.startsWith('gent-')?'.gent-coach':'.conventional-coach').first().waitFor();
 }
 assert.deepEqual(errors,[]);return cases.map(item=>item.id);}finally{await context.close();}
}
async function run(){
 const browser=await chromium.launch({executablePath:process.env.FINDR_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});let activePage;const results=[];
 try{for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:844},...(layoutOnly?{serviceWorkers:'block'}:{})}),page=await context.newPage();activePage=page;const errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error(error.message);});
  let failDownload=true;await page.route('**/api/manual/'+sigmaId,route=>failDownload?route.fulfill({status:503,contentType:'text/plain',body:'SYNTHETIC publisher failure'}):route.fulfill({status:200,contentType:'application/pdf',body:sigmaPDF}));
  await page.goto(base+'/app/#downloads/all');await page.locator('#manual-search').waitFor();const seeded=await seed(page);await page.reload();await page.locator('#manual-search').waitFor();
  const packs=await wiringPacks(page,width,value=>failDownload=value),hints=await allHints(page,width),maps=await menuMaps(page,width);await unsupportedHints(page,width);await preserved(page,seeded);
  const offlineCache=layoutOnly?null:await offlineChecks(page,context,seeded,width);
  await page.goto(base+'/app/#fire-panel/c-tec-cfp-standard');await page.locator('.cfp-cabinet').waitFor();await page.locator('.visit-return-banner a').click();await page.locator('#field-save-status').waitFor();assert.equal(await page.evaluate(async()=>(await(await import('./db.mjs')).setting('session')).id),seeded.visit.id,'Earlier fault visit reopens');
  assert.deepEqual(errors,[]);await context.close();
  const active=await activeHints(browser,width),result={width,height:844,status:'passed',offline:!layoutOnly,offlineCache,packs,hintFamilies:hints.length,menuMaps:maps.map(({id,nodes})=>({id,nodes})),activeHintFamilies:active,browserErrors:errors};results.push(result);console.log(JSON.stringify(result));
 }
 if(!layoutOnly){const dir=path.join(root,'research/packs-hints-maps-0.23.0');fs.mkdirSync(dir,{recursive:true});const screenshots=[];for(const width of widths)for(const name of ['brands','kentec-families','pack-source-pdf','sigma-hints','menu-maps','sigma-map-entry','unsupported-hints','offline-picture']){const source=`/tmp/findr-023-${name}-${width}.png`,file=`${name}-${width}.png`;if(fs.existsSync(source)){fs.copyFileSync(source,path.join(dir,file));screenshots.push({file,sha256:hash(fs.readFileSync(source))});}}const runtimeFiles={};for(const name of ['app.mjs','wiring-packs.mjs','onsite.mjs','menu-map.mjs','menu-map-registry.mjs','precache.js'])runtimeFiles[name]=hash(fs.readFileSync(path.join(root,'public/app',name)));const report={release:'0.23.0',status:'passed',build:expectedBuild,testedAt:new Date().toISOString(),browser:await browser.version(),command:'FINDR_PLAYWRIGHT_PATH=/opt/codex/cua_node/lib/node_modules/playwright node scripts/qa-packs-hints-maps.cjs',scriptSha256:hash(fs.readFileSync(__filename)),results,screenshots,runtimeFiles,limits:['Chromium viewport emulation, not physical iPhone/Safari testing','Stored sites, readings and programming fixtures are explicitly synthetic','Manual API uses actual checked local source PDF bytes; publisher availability is not part of this run','Reference/control maps are source-backed indexes, not a claim of complete physical-panel simulation','Publication, build and regression results are reported separately by the release owner']};fs.writeFileSync(path.join(dir,'browser-validation.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(path.join(dir,'browser-results.jsonl'),results.map(item=>JSON.stringify(item)).join('\n')+'\n');}
 }catch(error){if(activePage&&!activePage.isClosed()){await activePage.screenshot({path:'/tmp/findr-023-qa-failure.png',fullPage:true}).catch(()=>{});fs.writeFileSync('/tmp/findr-023-qa-failure.html',await activePage.content().catch(()=>''));}throw error;}finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exit(1);});
