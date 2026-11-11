// Focused real-app UI checks. Synthetic PDFs and a saved conversation are seeded
// explicitly; PDF extraction, search, rendering, storage, typing and SW are real.
// No model is downloaded, called or claimed. Run the static app on port 8091.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const playwright=require(process.env.FINDR_PLAYWRIGHT_PATH||'/opt/codex/cua_node/lib/node_modules/playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'research/helper-sources-0.32.7');
const appURL=process.env.FINDR_SOURCES_QA_URL||'http://127.0.0.1:8091/app/';
const browserName=process.env.FINDR_SOURCES_BROWSER||'chromium';
const mobile=process.env.FINDR_SOURCES_MOBILE!=='0';
const offline=process.env.FINDR_SOURCES_OFFLINE==='1';
const viewport=mobile?{width:390,height:844}:{width:1440,height:1000};
const label=browserName+'-'+viewport.width+(process.env.FINDR_SOURCES_LABEL_SUFFIX||'');
const helperId='qa-sources-helper',messageId='qa-cited-message';
const quote='Synthetic QA reference: the event history retains the last 120 entries. Select the event history view to inspect the recorded date and event description.';
const title='QA event history reference — synthetic PDF for source disclosure testing';
fs.mkdirSync(output,{recursive:true});

function makePDF(documentTitle){
  const pages=[
    ['SYNTHETIC QA DOCUMENT - NOT A FIELD MANUAL',documentTitle,'This fixture tests the FINDR citation viewer and local storage only.','It is not manufacturer guidance and does not describe real equipment.','Three pages let acceptance tests verify the exact cited PDF page.'],
    ['SYNTHETIC QA DOCUMENT - PAGE TWO','Event history reference','The event history retains the last 120 entries.','Select the event history view to inspect the recorded date and event description.','This sample text is deliberately synthetic and carries no field instructions.'],
    ['SYNTHETIC QA DOCUMENT - PAGE THREE','Source display and print pagination','Printed page III corresponds to PDF page three in this test fixture.','The stored document bytes must still render when the browser is offline.','This sample text is not a manufacturer publication or equipment advice.'],
  ];
  const escape=text=>text.replace(/[\\()]/g,c=>'\\'+c);
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R 5 0 R 7 0 R] /Count 3 >>'];
  for(let i=0;i<pages.length;i++){
    objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 9 0 R >> >> /Contents '+(4+i*2)+' 0 R >>');
    const stream='BT /F1 12 Tf 50 730 Td '+pages[i].map((line,index)=>(index?'0 -28 Td ':'')+'('+escape(line)+') Tj').join('\n')+' ET';
    objects.push('<< /Length '+Buffer.byteLength(stream)+' >>\nstream\n'+stream+'\nendstream');
  }
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  let pdf='%PDF-1.4\n',offsets=[0];
  for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(pdf));pdf+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n';}
  const xref=Buffer.byteLength(pdf);pdf+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n'+offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
  return Buffer.from(pdf);
}
const pdfA=makePDF('Source disclosure fixture A'),pdfB=makePDF('Source disclosure fixture B');
fs.writeFileSync(path.join(output,'synthetic-sources-a.pdf'),pdfA);
fs.writeFileSync(path.join(output,'synthetic-sources-b.pdf'),pdfB);
const result={status:'running',recordedAt:new Date().toISOString(),browser:browserName,viewport,mobileEmulation:mobile,physicalIPhone:false,checks:[],errors:[],navigationWarnings:[],requestFailures:[],offlineRequested:offline,actualInference:false,fixture:'Two generated 3-page synthetic PDFs, extracted and indexed through real app modules; seeded saved conversation. No response interception.'};
let browser,context,page,stage='launch';
const check=(name,evidence)=>{result.checks.push({name,...(evidence?{evidence}:{})});console.log('PASS '+label+' '+name);};
const disclosure=()=>page.locator('[data-helper-sources="'+messageId+'"]');
const summary=()=>disclosure().locator(':scope > summary');
const support=()=>disclosure().locator('.helper-source-evidence').first();
const screenshot=async name=>page.screenshot({path:path.join(output,label+'-'+name+'.png'),fullPage:true});
async function waitFor(fn,arg,timeout=30000){
  // Playwright's injected waitForFunction treats a Promise as immediately truthy;
  // explicitly await each async IndexedDB/service-worker condition before retry.
  const deadline=Date.now()+timeout;
  while(Date.now()<deadline){const value=await page.evaluate(fn,arg);if(value)return value;await page.waitForTimeout(100);}
  throw Error('Timed out waiting for browser condition: '+String(fn).slice(0,160));
}
async function shellReady(){return waitFor(async()=>{
  const worker=navigator.serviceWorker.controller;if(!worker)return false;
  return new Promise(resolve=>{const channel=new MessageChannel(),timer=setTimeout(()=>resolve(false),5000);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data?.ready===true?e.data:false);};worker.postMessage({type:'CHECK_OFFLINE'},[channel.port2]);});
},null,180000);}
async function assertOpen(value=true){assert.equal(await disclosure().evaluate(el=>el.open),value);}
async function scrollTop(){return page.locator('#helper-transcript').evaluate(el=>el.scrollTop);}
async function assertNoOverflow(){const sizes=await page.evaluate(()=>({window:innerWidth,document:document.documentElement.scrollWidth,transcript:document.querySelector('#helper-transcript').clientWidth,content:document.querySelector('#helper-transcript').scrollWidth}));assert.ok(sizes.document<=sizes.window+1,JSON.stringify(sizes));assert.ok(sizes.content<=sizes.transcript+1,JSON.stringify(sizes));return sizes;}
async function seed(){return page.evaluate(async({first,second,helperId,messageId,quote,title})=>{
  const db=await import('./db.mjs'),s=await import('./helpers-store.mjs'),e=await import('./helpers-engine.mjs'),a=await import('./manual-analysis.mjs'),r=await import('./retrieval-cache.mjs');
  const records=[],states={},analyses=[];
  for(const [index,data]of[first,second].entries()){
    const blob=new Blob([Uint8Array.from(atob(data),c=>c.charCodeAt(0))],{type:'application/pdf'});
    const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(b=>b.toString(16).padStart(2,'0')).join('');
    const record={id:'qa-synthetic-source-'+index,title:index?'QA printed pagination reference — synthetic PDF':title,brand:'QA fixture',category:'fire',models:['QA fixture'],bytes:blob.size,fileHash:hash,imported:true,savedAt:Date.now()};
    await db.saveManual(record,blob);
    const analysis=await a.analyseManual({blob,record});
    const indexed=await r.loadQuickManualIndex(analysis);
    if(!analysis.usable||!indexed.persisted||!indexed.index?.passages?.length)throw Error('Synthetic PDF must be extracted and indexed normally');
    records.push(record);analyses.push({id:record.id,pages:analysis.pageCount,usable:analysis.usable,passages:indexed.index.passages.length});
    states[record.id]={status:'ready',storedManualId:record.id,contentHash:hash,processorVersion:analysis.processorVersion,pageCount:analysis.pageCount};
  }
  const c=e.createHelperConversation({id:'qa-sources-conversation',title:'Synthetic source disclosure acceptance'});
  c.messages=[{id:'qa-no-sources',role:'assistant',text:'This saved synthetic answer has no citations and must not show an empty Sources control.',sourceRefs:[],mode:'manual-search',createdAt:Date.now()}];
  for(let i=0;i<4;i++)c.messages.push({id:'qa-before-'+i,role:i%2?'assistant':'user',text:'Saved conversation context '+(i+1)+'. This synthetic history gives the transcript enough content to check scrollback while citations are being read.\nThe test keeps earlier messages in place during a refresh.',sourceRefs:[],createdAt:Date.now()});
  c.messages.push({id:messageId,role:'assistant',text:'The saved reference describes the event history. Open Sources to inspect its supporting text and the exact saved PDF pages.\nThis is a synthetic UI acceptance answer, not equipment advice.',mode:'manual-search',sourceRefs:[
    {manualId:records[0].id,title:records[0].title,page:2,printedPage:'II',revision:'QA-1',section:'Event history',contentHash:records[0].fileHash,quote},
    {manualId:records[1].id,title:records[1].title,pdfPage:3,printedPage:'III',revision:'QA-2',section:'Printed pagination',contentHash:records[1].fileHash,quote:'Printed page III corresponds to PDF page three in this synthetic test fixture.'},
    {manualId:records[0].id,title:'QA long title '+('continuous-reference-identifier-'.repeat(8)),page:1,contentHash:records[0].fileHash,quote:'Synthetic overflow probe: '+('unbrokencitationtext'.repeat(35))},
  ],createdAt:Date.now()});
  for(let i=0;i<8;i++)c.messages.push({id:'qa-after-'+i,role:i%2?'assistant':'user',text:'Later saved message '+(i+1)+'. This synthetic context allows the test to stay in scrollback rather than following the newest answer.\nMessages and citations remain on this device.',sourceRefs:[],createdAt:Date.now()});
  const h=s.createHelper({id:helperId,name:'Sources QA helper',discipline:'fire',scope:{kind:'manuals',label:'Synthetic source fixtures',verifiedFamily:false},selectedManualIds:records.map(r=>r.id),requiredManualIds:[],manualStates:states,conversations:[c],activeConversationId:c.id});
  await s.saveHelper(h);return {analyses,sourceRefs:c.messages.find(m=>m.id===messageId).sourceRefs,messages:c.messages};
},{first:pdfA.toString('base64'),second:pdfB.toString('base64'),helperId,messageId,quote,title});}

async function openPDF(index,expectedPage){
  await disclosure().locator('[data-action="helper-source"]').nth(index).click();
  await page.locator('#pdf-status').filter({hasText:'Saved PDF · offline'}).waitFor();
  await waitFor(()=>document.querySelector('#pdf-canvas')?.width>0);
  assert.equal(Number(await page.locator('#pdf-page').inputValue()),expectedPage);
  assert.match(await page.locator('#pdf-total').textContent(),/3/);
  await screenshot('pdf-page-'+expectedPage);
  await page.locator('[data-action="close-modal"]').click();
  await assertOpen();assert.equal(await support().isVisible(),true);
}

try{
  const launch=browserName==='chromium'?{executablePath:process.env.FINDR_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']}:{...(process.env.FINDR_WEBKIT?{executablePath:process.env.FINDR_WEBKIT}:{})};
  const contextOptions={viewport,isMobile:mobile,hasTouch:mobile,serviceWorkers:offline?'allow':'block',reducedMotion:'no-preference'};
  if(browserName==='webkit')context=await playwright.webkit.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(),'findr-sources-wk-')),{...launch,headless:true,...contextOptions});
  else {browser=await playwright[browserName].launch({...launch,headless:true});context=await browser.newContext(contextOptions);}
  result.browserVersion=(browser||context.browser())?.version()||'26.0';
  page=await context.newPage();page.setDefaultTimeout(20000);
  page.on('pageerror',error=>{
    if(browserName==='webkit'&&error.message==='Context is stopped')result.navigationWarnings.push({message:error.message,stage,stack:error.stack});
    else result.errors.push(error.message);
  });page.on('requestfailed',request=>result.requestFailures.push({url:request.url(),error:request.failure()?.errorText}));
  stage='seed';await page.goto(appURL+'#helpers');await page.locator('.helpers-page').waitFor();
  if(offline){stage='initial-offline-readiness';result.offlineReadiness=await shellReady();stage='seed';}
  result.seed=await seed();check('Synthetic PDFs extracted and indexed through the actual local PDF pipeline',result.seed.analyses);
  await page.goto(appURL+'#helpers/'+helperId);await page.reload();await page.locator('#helper-input').waitFor();
  await waitFor(()=>document.querySelector('.helper-chat-head .helper-state')?.textContent==='AI unavailable');
  stage='collapsed';await disclosure().waitFor();await assertOpen(false);
  assert.equal((await summary().innerText()).trim(),'Sources (3)');
  assert.equal(await page.locator('[data-message-id="qa-no-sources"] .helper-sources').count(),0);
  assert.equal(await disclosure().locator('[data-action="helper-source"]').first().isVisible(),false);
  await summary().evaluate(el=>{el.focus({preventScroll:true});el.scrollIntoView({block:'center'});});await screenshot('collapsed');await page.locator('.helper-terminal').screenshot({path:path.join(output,label+'-collapsed-terminal.png')});check('Saved assistant sources start collapsed with the correct count; citation-free messages have no disclosure');
  stage='expand';mobile?await summary().tap():await summary().click();await assertOpen();
  assert.equal(await disclosure().locator('.helper-source').count(),3);assert.match(await disclosure().innerText(),/Edition QA-1/);assert.match(await disclosure().innerText(),/Printed page II/);
  assert.equal(await support().locator('blockquote').innerText(),quote);
  result.layout=await assertNoOverflow();await screenshot('expanded');await page.locator('.helper-terminal').screenshot({path:path.join(output,label+'-expanded-terminal.png')});check('Pointer/touch expansion shows unchanged source metadata and supporting quote without horizontal overflow',result.layout);
  stage='keyboard';await summary().focus();await page.keyboard.press('Enter');await assertOpen(false);await page.keyboard.press('Space');await assertOpen();
  assert.equal(await summary().evaluate(el=>el===document.activeElement),true);await screenshot('keyboard');check('Native summary supports keyboard Enter/Space and retains focus');
  stage='pdf';await openPDF(0,2);await openPDF(1,3);check('Both page and legacy pdfPage citations open the actual saved PDF at the exact page; disclosure and quote stay open on return');
  stage='repaint';await summary().evaluate(el=>el.scrollIntoView({block:'center'}));
  const draft='Unsent synthetic follow-up draft';await page.locator('#helper-input').fill(draft);
  await page.locator('#helper-input').evaluate(el=>{el.focus({preventScroll:true});el.setSelectionRange(7,16);});
  await page.locator('#helper-transcript').evaluate(el=>{el.scrollTop=Math.max(0,el.scrollTop-35);el.dispatchEvent(new Event('scroll'));});
  const before=await scrollTop();await page.locator('#helper-transcript').evaluate(el=>el.dataset.qaOld='yes');await page.evaluate(()=>window.dispatchEvent(new Event('online')));
  await waitFor(()=>!document.querySelector('#helper-transcript')?.dataset.qaOld);
  assert.deepEqual(await page.locator('#helper-input').evaluate(el=>({value:el.value,focused:el===document.activeElement,start:el.selectionStart,end:el.selectionEnd})),{value:draft,focused:true,start:7,end:16});
  await assertOpen();assert.equal(await support().isVisible(),true);const after=await scrollTop();assert.ok(Math.abs(before-after)<=2,JSON.stringify({before,after}));check('Same-chat connectivity/resource refresh preserves disclosure, quote, scrollback, unsent draft and selection',{before,after});
  stage='typed-reply';await page.locator('#helper-input').fill('How many entries does the event history retain?');
  const messageCount=result.seed.messages.length;const beforeReply=await scrollTop();
  await page.locator('#helper-composer button[type=submit]').click();
  await waitFor(async({helperId,messageCount})=>{const h=(await(await import('./helpers-store.mjs')).loadHelpers()).helpers.find(h=>h.id===helperId);const c=h.conversations.find(c=>c.id===h.activeConversationId);return c.messages.length>=messageCount+2&&!c.pending;},{helperId,messageCount});
  await waitFor(()=>document.querySelector('#helper-transcript')?.dataset.terminalTyping==='complete');
  await assertOpen();assert.equal(await support().isVisible(),true);const afterReply=await scrollTop();assert.ok(Math.abs(beforeReply-afterReply)<=2,JSON.stringify({beforeReply,afterReply}));
  const reply=await page.evaluate(async helperId=>{const h=(await(await import('./helpers-store.mjs')).loadHelpers()).helpers.find(h=>h.id===helperId);return h.conversations.find(c=>c.id===h.activeConversationId).messages.at(-1);},helperId);
  assert.equal(reply.role,'assistant');assert.equal(reply.modelUsed,false);assert.ok(reply.sourceRefs.length>0);result.generatedReply=reply;
  assert.equal(await page.locator('[data-helper-sources="'+reply.id+'"]').evaluate(el=>el.open),false);
  check('A real manual-search reply types and saves while earlier sources, quote and scrollback stay open; new sources start collapsed',{beforeReply,afterReply,replyId:reply.id,citationCount:reply.sourceRefs.length});
  stage='reduced-motion';await page.emulateMedia({reducedMotion:'reduce'});await summary().evaluate(el=>el.scrollIntoView({block:'center'}));await summary().click();await assertOpen(false);await summary().click();await assertOpen();await assertNoOverflow();await screenshot('reduced-motion');check('Sources remain usable with reduced motion');
  stage='reload';const refsBefore=result.seed.sourceRefs;await page.reload();await disclosure().waitFor();await assertOpen(false);
  const refsAfter=await page.evaluate(async({helperId,messageId})=>{const h=(await(await import('./helpers-store.mjs')).loadHelpers()).helpers.find(h=>h.id===helperId);return h.conversations.find(c=>c.id===h.activeConversationId).messages.find(m=>m.id===messageId).sourceRefs;},{helperId,messageId});
  assert.deepEqual(refsAfter,refsBefore);check('Reload resets visual expansion while preserving every saved source reference unchanged');
  if(offline){
    stage='offline-readiness';
    result.offlineReadiness=await shellReady();
    stage='offline-reload';await context.setOffline(true);await page.reload();await disclosure().waitFor();await assertOpen(false);await summary().click();await openPDF(0,2);await assertNoOverflow();await screenshot('offline');result.offlineReload=true;check('Network-disabled reload restores the saved chat and renders the exact cited PDF page through verified app cache and local storage');
  }
  assert.deepEqual(result.errors,[]);stage='complete';result.status='passed';
}catch(error){result.status='failed';result.stage=stage;result.error={message:error.message,stack:error.stack};process.exitCode=1;if(page)await screenshot('failure').catch(()=>{});}
finally{result.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(output,label+'.json'),JSON.stringify(result,null,2)+'\n');await context?.close();await browser?.close();console.log(JSON.stringify({status:result.status,stage,checks:result.checks.length,error:result.error?.message,output}));}
