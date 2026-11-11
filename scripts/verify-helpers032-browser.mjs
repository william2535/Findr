// Helpers acceptance checks against the single Sites-managed preview.
// No model replies, PDF text, download progress or readiness flags are mocked.
// Set FINDR_HELPERS_QA_URL to the exact `sites-preview start` URL.
// FINDR_HELPERS_MODEL=1 explicitly installs/uses the real pinned 366.6 MB model.
// FINDR_HELPERS_OFFLINE=1 requires a complete shell and restarts the browser offline.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.FINDR_PLAYWRIGHT_PATH||'/opt/codex/cua_node/lib/node_modules/playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=process.env.FINDR_HELPERS_RESULTS||path.join(root,'research/helpers-0.32.0/browser-chromium.json');
const profile=process.env.FINDR_HELPERS_PROFILE||fs.mkdtempSync(path.join(os.tmpdir(),'findr-helpers032-'));
const realModel=process.env.FINDR_HELPERS_MODEL==='1',offline=process.env.FINDR_HELPERS_OFFLINE==='1';
const preview=process.env.FINDR_HELPERS_QA_URL;
const result={status:'running',recordedAt:new Date().toISOString(),checks:[],answers:[],pageErrors:[],externalOfflineRequests:[],
  transport:'Normal application manual relay and pinned model host; no substituted PDF, model, search, or reply responses',
  realModelRequested:realModel,actualInference:false,freshOfflineStartup:false,physicalPhone:false};
let context,page,appURL,helperId,networkOff=false,stage='configuration';
const options={executablePath:process.env.FINDR_CHROMIUM||'/usr/bin/chromium',headless:true,
  viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'allow',
  reducedMotion:'no-preference',acceptDownloads:true,args:['--no-sandbox','--disable-dev-shm-usage']};

function check(label){result.checks.push(label);console.log('PASS '+label);}
async function openBrowser(){
  context=await chromium.launchPersistentContext(profile,options);
  page=await context.newPage();for(const other of context.pages())if(other!==page)await other.close();
  page.setDefaultTimeout(20000);
  page.on('pageerror',error=>result.pageErrors.push(error.stack||error.message));
  page.on('request',request=>{if(networkOff){const url=request.url();if(/^https?:/.test(url)&&new URL(url).origin!==new URL(appURL).origin)result.externalOfflineRequests.push(url);}});
}
async function poll(fn,arg,{timeout=180000,label='condition'}={}){
  const deadline=Date.now()+timeout;let last;
  while(Date.now()<deadline){last=await page.evaluate(fn,arg);if(last)return last;await page.waitForTimeout(150);}
  throw Error('Timed out waiting for '+label+'; last value='+JSON.stringify(last));
}
async function store(){return page.evaluate(async()=>(await import('./helpers-store.mjs')).loadHelpers());}
async function current(){return (await store()).helpers.find(helper=>helper.id===helperId);}
function conversation(helper){return helper.conversations.find(item=>item.id===helper.activeConversationId);}
async function inspect(){return page.evaluate(async id=>{
  const {loadHelpers}=await import('./helpers-store.mjs'),{createHelperLibrary}=await import('./helpers-library.mjs');
  const helper=(await loadHelpers()).helpers.find(item=>item.id===id);
  const [catalogue,devices]=await Promise.all([fetch('./data/catalogue.json').then(r=>r.json()),fetch('./data/device-documents.json').then(r=>r.json())]);
  return createHelperLibrary({getRecords:()=>[...catalogue.records,...devices]}).inspect(helper);
},helperId);}
async function go(hash){await page.goto(appURL+hash);await page.locator('.helpers-page').waitFor();}
async function send(text){
  await page.locator('#helper-input:enabled').waitFor();
  const previous=conversation(await current()).messages.filter(m=>m.role==='assistant').length;
  await page.locator('#helper-input').fill(text);await page.locator('#helper-composer button[type=submit]').click();
  await poll(async({id,previous})=>{const {loadHelpers}=await import('./helpers-store.mjs');const h=(await loadHelpers()).helpers.find(h=>h.id===id),c=h?.conversations.find(c=>c.id===h.activeConversationId);return c&&!c.pending&&c.messages.filter(m=>m.role==='assistant').length>previous;},{id:helperId,previous},{timeout:240000,label:'saved helper reply'});
  await page.locator('#helper-input:enabled').waitFor();
  const answer=conversation(await current()).messages.filter(m=>m.role==='assistant').at(-1);
  result.answers.push({question:text,...answer});return answer;
}
async function createViaUI(name,{includeModel=false}={}){
  await go('#helpers/new');await page.locator('#helper-discipline').selectOption('fire');
  await page.locator('#helper-search').fill('MxPro');
  await page.locator('[data-action="helper-choose"][data-id="panel:advanced-mxpro-4"]').click();
  await page.locator('#helper-name').fill(name);
  await page.locator('#helper-scope-confirmed').check();
  if(await page.locator('#helper-model-download').isEnabled())await page.locator('#helper-model-download').setChecked(includeModel);
  assert.ok(await page.locator('[data-helper-manual]:checked').count(),'The selected scope must contain actual manuals');
  await page.locator('[data-action="helper-create-prepare"]').click();
  await poll(async name=>(await(await import('./helpers-store.mjs')).loadHelpers()).helpers.some(h=>h.name===name),name,{label:'helper creation'});
  const helper=(await store()).helpers.find(h=>h.name===name);helperId=helper.id;
  await poll(async id=>{const h=(await(await import('./helpers-store.mjs')).loadHelpers()).helpers.find(h=>h.id===id);return h?.selectedManualIds.length&&h.selectedManualIds.every(id=>h.manualStates[id]?.status==='ready');},helperId,{timeout:360000,label:'every selected real PDF extracted and indexed'});
  await page.locator('[data-action="helper-prepare"]:enabled').waitFor({timeout:600000});
  return current();
}
async function shellReady(){
  return poll(async()=>{const registration=await navigator.serviceWorker.getRegistration(),worker=registration?.active;if(!worker||navigator.serviceWorker.controller!==worker)return false;
    return new Promise(resolve=>{const channel=new MessageChannel(),timer=setTimeout(()=>resolve(false),3000);channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data?.ready?event.data:false);};worker.postMessage({type:'CHECK_OFFLINE'},[channel.port2]);});
  },null,{timeout:300000,label:'current service-worker shell precache'});
}

try{
  assert.ok(preview,'Set FINDR_HELPERS_QA_URL to the exact URL returned by sites-preview start.');
  appURL=new URL('app/',preview.endsWith('/')?preview:preview+'/').href;
  stage='browser-launch';await openBrowser();result.environment={browser:context.browser()?.version(),platform:'Linux',viewport:options.viewport,appURL};
  stage='helper-creation-and-download';await createViaUI('QA MxPro4 helper',{includeModel:realModel});
  const firstId=helperId,ready=await inspect();result.prepared=ready;assert.equal(ready.docsReady,true);check('Normal setup creates a panel helper and downloads, verifies, extracts and indexes its real selected manuals');
  await go('#helpers/'+helperId);await page.locator('#helper-input').waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);check('Helpers conversation fits a 390px phone viewport');
  stage='verified-procedure-without-inference';const procedure=await send('How do I start a walk test?');
  assert.equal(procedure.coverage,'reviewed_manual_procedure');assert.equal(procedure.mode,'manual-search');assert.equal(procedure.modelUsed,false);
  assert.ok(procedure.steps?.length,'The verified procedure must keep its documented steps');assert.ok(procedure.sourceRefs?.length,'The verified procedure must keep its saved PDF citations');assert.match(procedure.text,/No local AI was used/);assert.equal(procedure.model,undefined);
  check('Pinned walk-test procedure is returned with its steps and citations as manual search without model inference');
  // A reviewed procedure must never be counted as proof that the model ran.
  // This independent question still requires real source selection when enabled.
  stage='question-and-citation';const answer=await send('How do I view the event history on an MxPro4 panel?');
  assert.ok(answer.sourceRefs?.length,'A known manual question must return a saved citation');
  if(realModel){assert.equal(answer.modelUsed,true);assert.equal(answer.mode,'local-ai');assert.ok(answer.model?.metrics?.outputTokens>0);result.actualInference=true;check('Actual local model generates a verifiable source selection for the manual question');}
  else{assert.equal(answer.mode,'manual-search');assert.match(answer.text,/manual search/i);check('No-model fallback is explicitly labelled manual search');}
  const citation=page.locator('[data-message-id="'+answer.id+'"] [data-action="helper-source"]').first(),pdfPage=Number(await citation.getAttribute('data-page'));
  await citation.click();await page.locator('#pdf-status').filter({hasText:'Saved PDF'}).waitFor();
  await poll(()=>document.querySelector('#pdf-canvas')?.width>0,null,{label:'saved PDF rendering'});assert.equal(Number(await page.locator('#pdf-page').inputValue()),pdfPage);await page.locator('[data-action="close-modal"]').click();check('Answer citation opens the actual saved PDF at its cited page');
  stage='persistence';const before=conversation(await current());await page.reload();await page.locator('#helper-input').waitFor();assert.deepEqual(conversation(await current()).messages,before.messages);check('Reload restores the saved conversation without losing or replaying messages');
  await page.locator('[data-action="helper-new-conversation"]').click();await poll(async id=>{const h=(await(await import('./helpers-store.mjs')).loadHelpers()).helpers.find(h=>h.id===id);return h.conversations.length===2&&h.conversations.find(c=>c.id===h.activeConversationId).messages.length===0;},helperId,{label:'new job'});assert.equal(conversation(await current()).context.investigation,null);check('New conversation has a clean diagnostic context while the previous job remains saved');
  stage='unsupported-question';const unknown=await send('How do I enable the quantum smoke compensator on MxPro4?');assert.equal(unknown.coverage,'not_established');assert.equal(unknown.sourceRefs.length,0);assert.match(unknown.text,/not established|no sufficiently relevant/i);check('Unsupported feature receives an honest missing-evidence answer');
  if(realModel){stage='diagnostic-follow-up';await page.locator('[data-action="helper-new-conversation"]').click();const asked=[];for(const text of ['The panel is showing a battery fault.','The display says "Battery fault".','Yes, the fault is showing now.','Battery terminals were already inspected; no measurement taken.']){await send(text);const c=conversation(await current()),pending=c.context.pendingQuestion;if(pending){assert.ok(!c.context.answeredQuestions.some(q=>q.field===pending.field),'A completed diagnostic question must not be repeated');asked.push(pending.field);}}assert.ok(asked.length>=2,'Actual inference must select useful follow-up observations');assert.ok(conversation(await current()).context.observations.length>=4);check('Actual multi-turn diagnosis retains observations and does not repeat completed questions');}
  stage='shared-manuals';const savedBefore=await page.evaluate(async()=>(await(await import('./db.mjs')).allManuals()).length);
  await createViaUI('QA second MxPro4 helper');const secondId=helperId,second=await inspect();assert.ok(second.sharedBytes>0);assert.equal(await page.evaluate(async()=>(await(await import('./db.mjs')).allManuals()).length),savedBefore);check('Second helper reuses verified PDFs without duplicating stored documents');
  const scopeCheck=await page.evaluate(async({firstId,secondId})=>{
    const s=await import('./helpers-store.mjs'),{createHelperLibrary}=await import('./helpers-library.mjs'),e=await import('./helpers-engine.mjs');const hs=(await s.loadHelpers()).helpers,first=hs.find(h=>h.id===firstId),second=hs.find(h=>h.id===secondId);
    const catalogue=(await(await fetch('./data/catalogue.json')).json()).records,library=createHelperLibrary({getRecords:()=>catalogue}),indexes=await library.getIndexes(first),allowed=first.selectedManualIds[0],restricted={...second,selectedManualIds:[allowed]};
    return {allowed,returned:e.scopeHelperIndexes(restricted,indexes).map(i=>i.manualId),secondMessages:second.conversations.flatMap(c=>c.messages).length};
  },{firstId,secondId});assert.ok(scopeCheck.returned.every(id=>id===scopeCheck.allowed));assert.equal(scopeCheck.secondMessages,0);result.scopeCheck=scopeCheck;check('Retrieval boundary restricts shared indexes to each helper allowlist and keeps jobs separate');
  helperId=firstId;await go('#helpers/'+helperId);
  if(offline){stage='fresh-offline-restart';result.shellReadiness=await shellReady();const original=await current();await context.close();context=null;await openBrowser();await context.setOffline(true);networkOff=true;
    await go('#helpers/'+helperId);await page.locator('#helper-input').waitFor();assert.equal((await current()).activeConversationId,original.activeConversationId);
    const offlineAnswer=await send('How do I view the event history on an MxPro4 panel?');assert.ok(offlineAnswer.sourceRefs?.length);if(realModel){assert.equal(offlineAnswer.modelUsed,true);assert.ok(offlineAnswer.model?.metrics?.outputTokens>0);}
    const ref=page.locator('[data-message-id="'+offlineAnswer.id+'"] [data-action="helper-source"]').first();await ref.click();await poll(()=>document.querySelector('#pdf-canvas')?.width>0,null,{label:'offline PDF page'});await page.locator('[data-action="close-modal"]').click();assert.deepEqual(result.externalOfflineRequests,[]);result.freshOfflineStartup=true;check('Fresh browser process opens the saved helper, answers and renders its PDF with networking disabled');
  }
  stage='complete';assert.deepEqual(result.pageErrors,[]);result.status='passed';await page.screenshot({path:output.replace(/\.json$/,'.png'),fullPage:true});
}catch(error){result.status=stage==='browser-launch'?'blocked':'failed';result.stage=stage;result.error={name:error.name,message:error.message,stack:error.stack};process.exitCode=1;
  if(page)try{result.lastHelper=await current();await page.screenshot({path:output.replace(/\.json$/,'-failure.png'),fullPage:true});}catch{}
}finally{result.finishedAt=new Date().toISOString();fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');await context?.close();console.log(JSON.stringify({status:result.status,stage:result.stage,checks:result.checks,actualInference:result.actualInference,freshOfflineStartup:result.freshOfflineStartup,output}));}
