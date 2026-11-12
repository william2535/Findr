import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('/opt/codex/cua_node/lib/node_modules/playwright');
const base='https://william2535.github.io/Findr/',result={status:'running',url:base,checks:[],errors:[],physicalPhone:false};
let browser,page,context;
const poll=async(fn,arg,timeout=120000)=>{const end=Date.now()+timeout;while(Date.now()<end){const r=await page.evaluate(fn,arg);if(r)return r;await page.waitForTimeout(200);}throw Error('Timed out waiting for verified browser state');};
try{
 const proxyURL=process.env.HTTPS_PROXY||process.env.https_proxy;
 let proxy;if(proxyURL){const u=new URL(proxyURL);proxy={server:u.protocol+'//'+u.host,...(u.username?{username:decodeURIComponent(u.username),password:decodeURIComponent(u.password)}:{})};}
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage'],...(proxy?{proxy}:{})});
 result.browser=browser.version();context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,ignoreHTTPSErrors:true,serviceWorkers:'allow'});page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>result.errors.push(e.message));
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:90000});await page.locator('#home-dashboard').waitFor();
 result.version=await page.evaluate(async()=>(await import('./version.mjs')).APP_VERSION);assert.equal(result.version,'0.40.0');assert.equal(new URL(page.url()).pathname,'/Findr/app/');result.checks.push('Public GitHub Pages root redirects to original FINDR app and serves0.40.0');
 await page.screenshot({path:'/workspace/findr040-live-home.png'});
 result.api=await page.evaluate(async()=>{const m=await import('./deployment.mjs'),r=await fetch(m.apiAddressing.endpoint('/api/assistant/online'),{credentials:'omit'});return{status:r.status,...await r.json()};});assert.equal(result.api.status,200);assert.equal(result.api.requiresKey,true);assert.equal(result.api.serviceVerified,false);result.checks.push('Real cross-origin capability GET works without embedding a provider key');
 result.preflight=await page.evaluate(async()=>{const endpoint=(await import('./deployment.mjs')).apiAddressing.endpoint('/api/assistant/online');const r=await fetch(endpoint,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json','X-FINDR-Provider-Key':'synthetic-pages-check-not-a-real-key'},body:JSON.stringify({allowOnline:false})});return{status:r.status,body:await r.json()};});assert.equal(result.preflight.status,403);assert.equal(result.preflight.body.error.code,'ONLINE_CONSENT_REQUIRED');result.checks.push('Browser performs real custom-header preflight and receives consent rejection; no inference requested');
 await page.goto(base+'app/#downloads/manuals',{waitUntil:'domcontentloaded'});await page.locator('#manual-search').fill('Advanced MxPro5');
 const id='advanced-0254975c10bd';await page.locator('[data-action="download-one"][data-id="'+id+'"]').click();
 result.manual=await poll(async id=>{const d=await import('./db.mjs'),b=await d.getFile(id);if(!b)return false;const r=(await d.allManuals()).find(m=>m.id===id);return{id,title:r.title,bytes:b.size,pdfPrefix:await b.slice(0,5).text()};},id);
 assert.equal(result.manual.pdfPrefix,'%PDF-');assert.equal(result.manual.bytes,1079368);result.checks.push('Actual Save PDF control downloaded and saved the real Advanced MxPro5 user guide through production relay');
 await page.locator('[data-action="read"][data-id="'+id+'"]').click();await poll(()=>document.querySelector('#pdf-canvas')?.width>0);await page.screenshot({path:'/workspace/findr040-live-manual.png'});result.checks.push('Saved real manual renders through the normal Read control');
 result.shell=await poll(async()=>{if(!navigator.serviceWorker.controller)return false;return new Promise(resolve=>{const c=new MessageChannel(),t=setTimeout(()=>resolve(false),5000);c.port1.onmessage=e=>{clearTimeout(t);c.port1.close();resolve(e.data?.ready?e.data:false);};navigator.serviceWorker.controller.postMessage({type:'CHECK_OFFLINE'},[c.port2]);});},null,240000);
 result.scope=await page.evaluate(async()=>(await navigator.serviceWorker.getRegistration()).scope);assert.ok(result.scope.endsWith('/Findr/app/'));
 await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});await page.locator('#app').waitFor();await page.goto(base+'app/#downloads/saved',{waitUntil:'domcontentloaded'});await page.locator('[data-action="read"][data-id="'+id+'"]').click();await poll(()=>document.querySelector('#pdf-canvas')?.width>0);result.checks.push('Network disabled: published app and downloaded real PDF reopen at scoped Pages path');
 assert.deepEqual(result.errors,[]);result.status='passed';
}catch(e){result.status='failed';result.error={message:e.message,stack:e.stack};process.exitCode=1;await page?.screenshot({path:'/workspace/findr040-live-failure.png'}).catch(()=>{});}
finally{await browser?.close();fs.writeFileSync('/workspace/findr040-live-check.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));}
