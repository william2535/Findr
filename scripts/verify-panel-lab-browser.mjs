// Exercise the actual FINDR interface. Network-off tests use its verified service
// worker; storage-full checks explicitly inject a quota exception, not low disk.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const pw=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright');
const name=process.env.FINDR_LAB_BROWSER||'chromium';
const base=process.env.FINDR_LAB_URL||'http://127.0.0.1:4177/app/';
const offline=process.env.FINDR_LAB_OFFLINE==='1';
const out=path.resolve(process.env.FINDR_LAB_OUTPUT||'research/panel-lab-0.41.0');
fs.mkdirSync(out,{recursive:true});
const label=name+(offline?'-offline':'');
const result={status:'running',startedAt:new Date().toISOString(),browser:name,base,physicalPhone:false,environment:'Linux browser; emulated phone viewport. Reduced height checks layout with focused fields, not an actual iPhone keyboard.',checks:[],errors:[],networkRequests:[]};
let browser,context,page,stage='launch';
const check=(name,detail)=>{result.checks.push({name,...(detail?{detail}:{})});console.log('PASS '+name);};
const button=action=>page.locator('[data-panel-lab-action="'+action+'"]');
const shot=async name=>page.screenshot({path:path.join(out,label+'-'+name+'.png'),fullPage:false});
async function fits(){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Page should fit viewport; matrix can scroll inside its own container');}
async function projects(){return page.evaluate(async()=>(await import('./cause-effect-store.mjs')).listProjects());}
async function savedName(name){await page.waitForFunction(async name=>(await(await import('./cause-effect-store.mjs')).listProjects()).some(p=>p.name===name),name);}
async function shell(){
 const end=Date.now()+180000;
 while(Date.now()<end){
  const state=await page.evaluate(async()=>{
   if(!navigator.serviceWorker.controller)return null;
   return new Promise(resolve=>{const channel=new MessageChannel(),timer=setTimeout(()=>resolve(null),2500);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data?.ready?e.data:null)};navigator.serviceWorker.controller.postMessage({type:'CHECK_OFFLINE'},[channel.port2]);});
  });
  if(state)return state;
  await page.waitForTimeout(250);
 }
 throw Error('Verified offline shell did not become ready');
}

async function run(){
 browser=await pw[name].launch({headless:true,executablePath:name==='webkit'?(process.env.FINDR_WEBKIT||'/workspace/findr-webkit040-runtime/run-webkit.sh'):'/usr/bin/chromium',...(name==='chromium'?{args:['--no-sandbox','--disable-dev-shm-usage']}:{})});
 result.browserVersion=browser.version();
 context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true,serviceWorkers:offline?'allow':'block'});
 page=await context.newPage();page.setDefaultTimeout(30000);
 page.on('pageerror',e=>{if(e.message!=='Context is stopped')result.errors.push(e.message);});
 page.on('request',r=>{if(!r.url().startsWith(new URL(base).origin)&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:'))result.networkRequests.push(r.url());});
 stage='home and entry';await page.goto(base+'#home');await page.locator('#home-dashboard').waitFor();
 if(await page.locator('#findr-startup').count())await page.locator('#findr-startup').click({force:true});
 await page.locator('#findr-startup').waitFor({state:'detached'});
 assert.equal(await page.locator('.zone-sketch-link').count(),0,'Zone Sketch promotion removed');
 await page.locator('header [data-nav="panel-lab"]').click();
 await page.locator('.panel-lab').waitFor();await fits();
 await page.evaluate(()=>scrollTo(0,0));await shot('overview');
 check('Normal Home and top navigation open Panel Lab; Zone Sketch promotion removed');
 // Flow assertions are deliberately against visible UI and persisted engine
 // state. They are kept below once the controller's public controls are loaded.
 await exerciseLab();
 assert.deepEqual(result.errors,[]);
 result.status='passed';
}

async function exerciseLab(){
 const idle=()=>page.waitForFunction(()=>document.querySelector('#pl-save-status')?.textContent.startsWith('Saved on this device'));
 const tab=async name=>{await page.locator('.pl-tabs [data-tab="'+name+'"]').click();};
 const openDetails=async selector=>{const d=page.locator(selector);if(!await d.evaluate(e=>e.open))await d.locator('summary').click();};
 const rename=async value=>{await openDetails('.pl-project-details');await page.locator('#pl-project-form [name="name"]').fill(value);await page.locator('#pl-project-form button[type="submit"]').click();};
 const states=()=>page.locator('.pl-output-state');
 const firstState=()=>states().first();
 await idle();
 await page.evaluate(async()=>{const db=await import('./db.mjs');await db.setSetting('qa-panel-lab-unrelated',{visit:'existing',readings:[{value:0,unit:'V'}]});});
 stage='create and configure';await button('new-project').click();await idle();
 const projectName='QA matrix '+label;await rename(projectName);await savedName(projectName);await idle();
 const original=(await projects()).find(p=>p.name===projectName);
 await openDetails('.pl-input-editor');await page.locator('#pl-add-input [name="label"]').fill('Plant test');await page.locator('#pl-add-input button').click();await idle();
 await page.locator('#pl-add-output [name="label"]').fill('Plant relay');await page.locator('#pl-add-output button').click();await idle();
 assert.equal((await projects()).find(p=>p.id===original.id).inputs.length,4);
 assert.equal((await projects()).find(p=>p.id===original.id).outputs.length,4);
 await page.getByRole('button',{name:'Zone 1 activates Output group 1',exact:true}).click();await idle();
 const keyboardCell=page.getByRole('button',{name:'Zone 1 activates Output group 1',exact:true});await keyboardCell.focus();await keyboardCell.press('Enter');await idle();assert.equal(await keyboardCell.getAttribute('aria-pressed'),'false');assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Zone 1 activates Output group 1');await keyboardCell.press('Space');await idle();assert.equal(await keyboardCell.getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'Zone 2 activates Output group 1',exact:true}).click();await idle();
 await page.locator('#pl-output-form [name="logic"]').selectOption('all');
 await page.locator('#pl-output-form [name="delaySeconds"]').fill('10');
 await page.locator('#pl-output-form [name="latching"]').check();
 await page.locator('#pl-output-form button[type="submit"]').click();await idle();
 const configured=(await projects()).find(p=>p.id===original.id);
 assert.deepEqual(configured.outputs[0].inputIds,['z1','z2']);assert.equal(configured.outputs[0].logic,'all');assert.equal(configured.outputs[0].delaySeconds,10);assert.equal(configured.outputs[0].latching,true);
 check('Create, rename, add input/output and save real AND/delay/latch configuration');
 stage='layouts';
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});await fits();const cell=page.locator('.pl-cell').first();assert.ok((await cell.boundingBox()).height>=44);await shot(width+'-matrix');}
 await page.setViewportSize({width:390,height:430});await page.locator('#pl-output-form [name="label"]').focus();await page.locator('#pl-output-form [name="label"]').scrollIntoViewIfNeeded();await fits();await shot('focused-small-viewport');
 await page.setViewportSize({width:390,height:844});check('Matrix fits320/390/1440px;44px cell targets; focused form remains scrollable at reduced viewport height');
 stage='simulation';await tab('simulate');await idle();assert.equal(await page.locator('.pl-output-state.is-driving').count(),0);
 await button('toggle-input').filter({hasText:'Zone 1'}).click();await idle();assert.match(await firstState().innerText(),/Waiting for 1/);
 await button('toggle-input').filter({hasText:'Zone 2'}).click();await idle();assert.match(await firstState().innerText(),/10s remaining/);
 await page.locator('[data-panel-lab-action="advance"][data-seconds="1"]').click();await idle();assert.match(await firstState().innerText(),/9s remaining/);
 await page.locator('[data-panel-lab-action="advance"][data-seconds="10"]').click();await idle();assert.ok((await firstState().getAttribute('class')).includes('is-driving'));
 await firstState().locator('[data-panel-lab-action="isolate-output"]').click();await idle();assert.ok((await firstState().getAttribute('class')).includes('is-isolated'));assert.ok(!(await firstState().getAttribute('class')).includes('is-driving'));
 await button('clear-inputs').click();await idle();assert.match(await firstState().innerText(),/latched demand remains/);
 await firstState().locator('[data-panel-lab-action="isolate-output"]').click();await idle();assert.ok((await firstState().getAttribute('class')).includes('is-driving'));
 await button('reset-outputs').click();await idle();assert.ok(!(await firstState().getAttribute('class')).includes('is-driving'));
 const eventCount=await page.locator('.pl-log li').count();assert.ok(eventCount>=8);
 await shot('simulation');await page.reload();await page.locator('.pl-clock').waitFor();await idle();assert.match(await page.locator('.pl-clock strong').innerText(),/^11/);assert.equal(await page.locator('.pl-log li').count(),eventCount);
 check('Two causes, delay boundary, isolate/restore, latch and reset change real outputs;11s clock and complete run resume after reload');
 const logEvent=page.waitForEvent('download');await button('export-log').click();const log=await logEvent;const logData=JSON.parse(fs.readFileSync(await log.path(),'utf8'));assert.equal(logData.result.time,11);assert.equal(logData.commands.length,eventCount);assert.equal(logData.result.outputs[0].active,false);
 stage='export import';await tab('build');await openDetails('.pl-project-details');
 const exportEvent=page.waitForEvent('download');await button('export').click();const file=await exportEvent;const exported=JSON.parse(fs.readFileSync(await file.path(),'utf8'));assert.equal(exported.project.name,projectName);
 const countBefore=(await projects()).length;await page.locator('#pl-import-file').setInputFiles({name:'matrix.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});await idle();assert.equal((await projects()).length,countBefore+1);
 assert.equal((await projects()).filter(p=>p.name===projectName).length,2);assert.ok((await projects()).some(p=>p.id===original.id));
 const importedId=await page.locator('#panel-lab-project').inputValue();assert.notEqual(importedId,original.id);
 await page.locator('#pl-import-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{invalid')});await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/not valid JSON/);assert.equal((await projects()).length,countBefore+1);assert.equal(await page.locator('#panel-lab-project').inputValue(),importedId);
 await openDetails('.pl-project-details');await button('delete').click();await button('cancel-delete').click();assert.equal((await projects()).length,countBefore+1);await openDetails('.pl-project-details');await button('delete').click();await button('confirm-delete').click();await idle();assert.equal((await projects()).length,countBefore);assert.ok((await projects()).some(p=>p.id===original.id));
 check('Real JSON/log downloads contain saved rules and events; import creates separate identity; rejected JSON preserves all projects');
 stage='practice';await tab('practice');assert.equal(await button('start-challenge').count(),7);assert.equal(await page.locator('.pl-lesson').count(),10);
 await button('start-challenge').first().click();await idle();await button('check-challenge').click();assert.equal(await page.locator('.pl-grade.is-passed').count(),0);
 await page.getByRole('button',{name:'Reception activates Practice sounder',exact:true}).click();await idle();await page.getByRole('button',{name:'Workshop activates Practice sounder',exact:true}).click();await idle();await button('check-challenge').click();await page.locator('.pl-grade.is-passed').waitFor();await idle();
 await page.getByRole('button',{name:'Reception activates Practice sounder',exact:true}).click();await idle();assert.equal(await page.locator('.pl-grade.is-passed').count(),0,'Editing must clear stale current grade');
 await tab('practice');assert.equal(await page.locator('.pl-challenge-card.is-complete').count(),1);
 const firstLesson=page.locator('.pl-lesson').first();await firstLesson.locator('summary').click();await firstLesson.locator('[data-panel-lab-action="source"]').first().click();await page.locator('#modal[open]').waitFor();assert.match(await page.locator('#modal').innerText(),/CFP|manual/i);await page.keyboard.press('Escape');
 const lessonHref=await page.locator('.pl-lesson a[href^="#"]').first().getAttribute('href');await page.locator('.pl-lesson a[href^="#"]').first().click();await page.locator('.conventional-root').waitFor();assert.ok(page.url().includes(lessonHref.split('/coach/')[0]));assert.equal(await page.locator('.conventional-coach progress').getAttribute('value'),'0');await page.locator('header [data-nav="panel-lab"]').click();await page.locator('.pl-practice').waitFor();assert.equal(await page.locator('.pl-challenge-card.is-complete').count(),1);await shot('practice');
 check('Seven challenges grade actual rules; wrong board fails, correct board passes, edits clear stale grade;10 sourced lessons open existing trainer without awarding completion');
 stage='quota recovery';await tab('build');await idle();
 await page.evaluate(()=>{window.__qaOriginalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,key){if(key==='cause-effect-projects-v1')throw new DOMException('QA injected full storage','QuotaExceededError');return window.__qaOriginalPut.call(this,value,key);};});
 await rename('Unsaved quota recovery');await page.waitForFunction(()=>document.querySelector('#pl-save-status')?.textContent.includes('storage is full'));
 assert.ok(!(await projects()).some(p=>p.name==='Unsaved quota recovery'));
 const dirtyId=await page.locator('#panel-lab-project').inputValue();await button('new-project').click();await page.getByRole('alert').waitFor();assert.equal(await page.locator('#panel-lab-project').inputValue(),dirtyId);assert.match(await page.getByRole('alert').innerText(),/Save or export/);
 await openDetails('.pl-project-details');const failedExportEvent=page.waitForEvent('download');await button('export').click();const failedExport=await failedExportEvent;assert.equal(JSON.parse(fs.readFileSync(await failedExport.path(),'utf8')).project.name,'Unsaved quota recovery');
 await page.evaluate(()=>{IDBObjectStore.prototype.put=window.__qaOriginalPut;delete window.__qaOriginalPut;});await button('retry-save').click();await idle();await savedName('Unsaved quota recovery');
 check('Injected IndexedDB quota failure is visible; unsaved work can be exported; Retry saves it after storage recovers');
 stage='reduced motion and retained data';await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.locator('.panel-lab').waitFor();await idle();assert.equal(await page.locator('#findr-startup').count(),0);await fits();
 assert.deepEqual(await page.evaluate(async()=>(await import('./db.mjs')).setting('qa-panel-lab-unrelated')),{visit:'existing',readings:[{value:0,unit:'V'}]});
 check('Reduced-motion reload preserves selected matrix and unrelated saved readings');
 if(offline){stage='verified offline';result.shell=await shell();await context.setOffline(true);await page.reload();await page.locator('.panel-lab').waitFor();await idle();await tab('simulate');await button('toggle-input').first().click();await idle();await page.reload();await page.locator('.pl-clock').waitFor();assert.equal(await page.locator('[data-panel-lab-action="toggle-input"][aria-pressed="true"]').count(),1);await tab('practice');assert.equal(await button('start-challenge').count(),7);await button('start-challenge').last().click();await idle();await button('check-challenge').click();await page.locator('.pl-grade').waitFor();await shot('offline');check('Verified installed shell cold-reloads with network disabled; saved project, simulation input/reload and new practice challenge work offline',result.shell);}
}

try{await run();}catch(error){result.status='failed';result.stage=stage;result.error={message:error.message,stack:error.stack};process.exitCode=1;await shot('failure').catch(()=>{});}
finally{result.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(out,label+'.json'),JSON.stringify(result,null,2)+'\n');await browser?.close();console.log(JSON.stringify({status:result.status,stage,checks:result.checks.length,error:result.error?.message}));}
