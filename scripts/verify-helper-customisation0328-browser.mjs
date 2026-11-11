// Real app appearance checks; only the initial synthetic helper records are seeded.
// No model inference, manuals or network requests are fabricated by this harness.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const playwright=require(process.env.FINDR_PLAYWRIGHT_PATH||'/opt/codex/cua_node/lib/node_modules/playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'research/helper-customisation-0.32.8');
const appURL=process.env.FINDR_CUSTOM_QA_URL||'http://127.0.0.1:8092/app/';
const browserName=process.env.FINDR_CUSTOM_BROWSER||'chromium';
const mobile=process.env.FINDR_CUSTOM_MOBILE!=='0';
const offline=process.env.FINDR_CUSTOM_OFFLINE==='1';
const viewport=mobile?{width:390,height:844}:{width:1440,height:1000};
const label=browserName+'-'+viewport.width+(offline?'-offline':'');
const ids=['qa-custom-helper-a','qa-custom-helper-b'];
const result={status:'running',recordedAt:new Date().toISOString(),browser:browserName,viewport,physicalIPhone:false,mobileEmulation:mobile,offlineRequested:offline,actualInference:false,checks:[],errors:[],navigationWarnings:[],requestFailures:[],fixture:'Two synthetic saved helpers with distinct appearance and conversation records; real app navigation, IndexedDB, export and import.'};
fs.mkdirSync(output,{recursive:true});
let browser,context,page,stage='launch';
const check=(name,evidence)=>{result.checks.push({name,...(evidence?{evidence}:{})});console.log('PASS '+label+' '+name);};
const shot=async name=>page.screenshot({path:path.join(output,label+'-'+name+'.png'),fullPage:true});
async function waitFor(fn,arg,timeout=30000){const end=Date.now()+timeout;while(Date.now()<end){const value=await page.evaluate(fn,arg);if(value)return value;await page.waitForTimeout(100);}throw Error('Timed out waiting for '+String(fn).slice(0,130));}
async function helpers(){return page.evaluate(async()=> (await(await import('./helpers-store.mjs')).loadHelpers()).helpers);}
async function helper(id=ids[0]){return (await helpers()).find(h=>h.id===id);}
async function shellReady(){return waitFor(async()=>{const worker=navigator.serviceWorker.controller;if(!worker)return false;return new Promise(resolve=>{const channel=new MessageChannel(),timer=setTimeout(()=>resolve(false),5000);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data?.ready===true?e.data:false);};worker.postMessage({type:'CHECK_OFFLINE'},[channel.port2]);});},null,180000);}
async function noOverflow(){const sizes=await page.evaluate(()=>({window:innerWidth,document:document.documentElement.scrollWidth}));assert.ok(sizes.document<=sizes.window+1,JSON.stringify(sizes));return sizes;}
async function seed(){return page.evaluate(async ids=>{
  const store=await import('./helpers-store.mjs');
  const records=ids.map((id,index)=>store.createHelper({id,name:index?'Night shift helper':'My panel helper',discipline:index?'cctv':'fire',scope:{kind:'manuals',label:'Synthetic UI test scope'},selectedManualIds:[],requiredManualIds:[],...(index?{appearance:{icon:'owl',colour:'blue'}}:{}),conversations:[{id:id+'-chat',title:'Saved synthetic job',createdAt:100,updatedAt:100,context:{confirmedModel:'QA synthetic model'},messages:[{id:id+'-you',role:'user',text:'Saved synthetic observation: the indication cleared before arrival.',createdAt:100},{id:id+'-findr',role:'assistant',text:'This is a synthetic saved conversation used to check that customisation keeps the job intact.',createdAt:101,sourceRefs:[],mode:'manual-search'}]}]}));
  // Deliberately omit appearance in the first old record to exercise the read migration.
  delete records[0].appearance;
  const db=await(await import('./db.mjs')).openDB();await new Promise((resolve,reject)=>{const tx=db.transaction(['settings'],'readwrite');tx.objectStore('settings').put({schemaVersion:1,helpers:records},store.HELPERS_KEY);tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error);});
  return records;
},ids);}

// These selectors use stable action/data attributes, not icon artwork or CSS colour values.
const choice=(kind,value)=>page.locator('[data-action="helper-appearance-'+kind+'"][data-value="'+value+'"]');
const preview=()=>page.locator('#helper-appearance-preview');
async function appearanceIs(expected){const value=await preview().evaluate(el=>({icon:el.dataset.appearanceIcon,colour:el.dataset.appearanceColour}));assert.deepEqual(value,expected);await waitFor(()=>{const el=document.querySelector('#helper-appearance-preview'),css=getComputedStyle(el),rgb=hex=>'rgb('+hex.trim().slice(1).match(/.{2}/g).map(v=>parseInt(v,16)).join(', ')+')';return css.backgroundColor===rgb(css.getPropertyValue('--helper-tint'))&&css.borderLeftColor===rgb(css.getPropertyValue('--helper-accent'))&&css.borderTopColor===rgb(css.getPropertyValue('--helper-border'));});}
async function openSettings(id=ids[0]){await page.locator('a[href="#helpers/'+id+'/settings"]').first().click();await preview().waitFor();}
async function avatarIs(node,expected){assert.deepEqual(await node.evaluate(el=>({icon:el.dataset.appearanceIcon,colour:el.dataset.appearanceColour})),expected);}
async function cardIs(id,expected){const card=page.locator('.helper-card').filter({has:page.locator('a[href="#helpers/'+id+'"]')});await avatarIs(card.locator('.helper-avatar'),expected);assert.equal(await card.getAttribute('data-helper-colour'),expected.colour);await waitFor(id=>{const el=document.querySelector('a[href="#helpers/'+id+'"]')?.closest('.helper-card');if(!el)return false;const css=getComputedStyle(el),accent=css.getPropertyValue('--helper-accent').trim();if(!accent)return false;const canvas=document.createElement('canvas').getContext('2d'),normalise=value=>{canvas.fillStyle='#000';canvas.fillStyle=value;return canvas.fillStyle;};return normalise(css.borderTopColor)===normalise(accent);},id);}

try{
  const launch=browserName==='chromium'?{executablePath:process.env.FINDR_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']}:{...(process.env.FINDR_WEBKIT?{executablePath:process.env.FINDR_WEBKIT}:{})};
  const options={viewport,isMobile:mobile,hasTouch:mobile,serviceWorkers:offline?'allow':'block',reducedMotion:'no-preference',acceptDownloads:true};
  if(browserName==='webkit')context=await playwright.webkit.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(),'findr-custom-wk-')),{...launch,headless:true,...options});
  else{browser=await playwright[browserName].launch({...launch,headless:true});context=await browser.newContext(options);}
  result.browserVersion=(browser||context.browser())?.version()||'26.0';page=await context.newPage();page.setDefaultTimeout(20000);
  page.on('pageerror',e=>{if(browserName==='webkit'&&e.message==='Context is stopped')result.navigationWarnings.push({message:e.message,stage});else result.errors.push(e.message);});
  page.on('requestfailed',r=>result.requestFailures.push({url:r.url(),error:r.failure()?.errorText}));
  stage='seed';await page.goto(appURL+'#helpers');await page.locator('.helpers-page').waitFor();if(offline)result.offlineReadiness=await shellReady();result.seed=await seed();await page.reload();await page.locator('.helper-card').first().waitFor();
  assert.deepEqual((await helper()).appearance,{icon:'terminal',colour:'yellow'});assert.deepEqual((await helper(ids[1])).appearance,{icon:'owl',colour:'blue'});await cardIs(ids[0],{icon:'terminal',colour:'yellow'});await cardIs(ids[1],{icon:'owl',colour:'blue'});check('An older helper opens with the default appearance while another retains its own choices');
  stage='preview';await openSettings();mobile?await choice('icon','mug').tap():await choice('icon','mug').click();mobile?await choice('colour','purple').tap():await choice('colour','purple').click();await appearanceIs({icon:'mug',colour:'purple'});assert.deepEqual((await helper()).appearance,{icon:'terminal',colour:'yellow'});
  assert.equal(await choice('icon','mug').getAttribute('aria-pressed'),'true');assert.equal(await choice('colour','purple').getAttribute('aria-pressed'),'true');
  result.touchTargets=await page.locator('.helper-icon-option,.helper-colour-option').evaluateAll(nodes=>nodes.map(el=>({label:el.textContent.trim(),width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})));assert.ok(result.touchTargets.every(size=>size.width>=44&&size.height>=44));
  result.layout=await noOverflow();await choice('colour','purple').focus();await shot('preview');check('Icon and colour choices preview immediately, expose selected state, and remain unsaved until Save');
  stage='cancel';await page.locator('[data-action="helper-appearance-cancel"]').click();await appearanceIs({icon:'terminal',colour:'yellow'});assert.deepEqual((await helper()).appearance,{icon:'terminal',colour:'yellow'});check('Cancel restores the saved appearance without changing the helper');
  stage='keyboard';await choice('icon','ghost').focus();await page.keyboard.press('Enter');await choice('colour','coral').focus();await page.keyboard.press('Space');await appearanceIs({icon:'ghost',colour:'coral'});check('Icon and colour controls work with Enter and Space');
  stage='save';await page.locator('[data-action="helper-appearance-save"]').click();await waitFor(async id=>{const h=(await(await import('./helpers-store.mjs')).loadHelpers()).helpers.find(h=>h.id===id);return h.appearance?.icon==='ghost'&&h.appearance?.colour==='coral';},ids[0]);
  assert.deepEqual((await helper(ids[1])).appearance,{icon:'owl',colour:'blue'});assert.deepEqual((await helper()).conversations,result.seed[0].conversations);check('Save persists only the selected helper and leaves its conversations and diagnostic context unchanged');
  stage='reload';await page.reload();await preview().waitFor();await appearanceIs({icon:'ghost',colour:'coral'});check('Reload restores the chosen icon and colour');
  stage='chat';await page.locator('a.back').click();await page.locator('#helper-input').waitFor();await avatarIs(page.locator('.helper-chat-identity .helper-avatar'),{icon:'ghost',colour:'coral'});assert.equal(await page.locator('.helpers-page').getAttribute('data-helper-colour'),'coral');await page.locator('#helper-input').fill('Unsent synthetic draft stays with this job.');await openSettings();assert.equal((await helper()).conversations[0].draft,'Unsent synthetic draft stays with this job.');
  await page.locator('[data-action="helper-appearance-reset"]').click();await appearanceIs({icon:'terminal',colour:'yellow'});await page.locator('[data-action="helper-appearance-cancel"]').click();await appearanceIs({icon:'ghost',colour:'coral'});check('Customising from the conversation preserves an unsent draft; Reset is reversible before saving');
  stage='export';await page.locator('#helper-export-files').uncheck();const downloaded=page.waitForEvent('download');await page.locator('[data-action="helper-export"]').click();const download=await downloaded;const backupPath=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'findr-custom-export-')),'helper.json');await download.saveAs(backupPath);const payload=JSON.parse(fs.readFileSync(backupPath,'utf8'));assert.deepEqual(payload.helper.appearance,{icon:'ghost',colour:'coral'});
  await page.goto(appURL+'#helpers');await page.locator('[data-action="helper-import"]').waitFor();const picked=page.waitForEvent('filechooser');await page.locator('[data-action="helper-import"]').click();await(await picked).setFiles(backupPath);await waitFor(async()=> (await(await import('./helpers-store.mjs')).loadHelpers()).helpers.some(h=>h.name==='My panel helper (imported)'));
  const imported=(await helpers()).find(h=>h.name==='My panel helper (imported)');assert.deepEqual(imported.appearance,{icon:'ghost',colour:'coral'});assert.notEqual(imported.id,ids[0]);check('Normal helper export and file-picker import preserve appearance alongside saved conversations');
  stage='reduced-motion';await page.goto(appURL+'#helpers');await page.locator('.helper-card').first().waitFor();await page.emulateMedia({reducedMotion:'reduce'});await cardIs(ids[0],{icon:'ghost',colour:'coral'});await cardIs(ids[1],{icon:'owl',colour:'blue'});await noOverflow();await shot('cards');await openSettings(ids[1]);await choice('icon','wizard').click();await choice('colour','teal').click();await appearanceIs({icon:'wizard',colour:'teal'});await page.locator('[data-action="helper-appearance-cancel"]').click();await appearanceIs({icon:'owl',colour:'blue'});check('Multiple helpers remain visually distinct and controls remain usable with reduced motion');
  if(offline){stage='offline';result.offlineReadiness=await shellReady();await context.setOffline(true);await page.reload();await preview().waitFor();await choice('icon','cone').click();await choice('colour','orange').click();await page.locator('[data-action="helper-appearance-save"]').click();await waitFor(async id=> (await(await import('./helpers-store.mjs')).loadHelpers()).helpers.find(h=>h.id===id).appearance?.icon==='cone',ids[1]);await page.reload();await preview().waitFor();await appearanceIs({icon:'cone',colour:'orange'});await shot('offline');check('With networking disabled, the verified app reloads and saves/reopens new appearance choices');}
  assert.deepEqual(result.errors,[]);stage='complete';result.status='passed';
}catch(error){result.status='failed';result.stage=stage;result.error={message:error.message,stack:error.stack};process.exitCode=1;if(page)await shot('failure').catch(()=>{});}
finally{result.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(output,label+'.json'),JSON.stringify(result,null,2)+'\n');await context?.close();await browser?.close();console.log(JSON.stringify({status:result.status,stage,checks:result.checks.length,error:result.error?.message}));}
