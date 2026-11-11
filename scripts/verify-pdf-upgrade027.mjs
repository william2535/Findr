import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),pw=require(process.env.FINDR_PLAYWRIGHT_PATH||'/opt/codex/cua_node/lib/node_modules/playwright');
const root=path.resolve(new URL('..',import.meta.url).pathname),kind=process.env.FINDR_PDF_BROWSER||'chromium';
const prior=process.env.FINDR_OLD_APP||'/tmp/findr026-baseline/public/app';
const snapshot=fs.mkdtempSync(path.join(os.tmpdir(),'findr-upgrade027-assets-'));
fs.cpSync(process.env.FINDR_NEW_APP||path.join(root,'public/app'),snapshot,{recursive:true});
function verifyManifest(directory){const state={self:{}};vm.runInNewContext(fs.readFileSync(path.join(directory,'precache.js'),'utf8'),state);for(const [asset,digest]of Object.entries(state.self.__ASSET_SHA256)){assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(directory,asset))).digest('hex'),digest,'Manifest must match '+asset);}return {build:state.self.__BUILD,version:state.self.__APP_VERSION,assets:state.self.__PRECACHE.length};}
const oldManifest=verifyManifest(prior),newManifest=verifyManifest(snapshot);assert.equal(oldManifest.version,'0.26.0');assert.equal(newManifest.version,'0.27.0');
let updated=false,networkCut=false;const requests=[];
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.gz':'application/gzip','.ttf':'font/ttf'};
const server=http.createServer((request,response)=>{const url=new URL(request.url,'http://localhost');if(!url.pathname.startsWith('/app/')){response.writeHead(404).end();return;}const rel=decodeURIComponent(url.pathname.slice(5))||'index.html',directory=updated?snapshot:prior,file=path.resolve(directory,rel);if(!file.startsWith(directory+path.sep)){response.writeHead(404).end();return;}requests.push({updated,path:url.pathname,build:url.searchParams.get('findr_build'),blocked:networkCut});if(networkCut){response.destroy();return;}try{const body=fs.readFileSync(file);response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(body);}catch{response.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}/app/`;
const context=await pw[kind].launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(),'findr-upgrade027-profile-')),{headless:true,viewport:{width:390,height:844},
  ...(kind==='webkit'?{...(process.env.FINDR_WEBKIT?{executablePath:process.env.FINDR_WEBKIT}:{})}:{executablePath:process.env.FINDR_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']})});
let page=await context.newPage();const errors=[],results={browser:kind,oldManifest,newManifest,checks:[]};page.on('pageerror',e=>errors.push(e.message));
await context.addInitScript(()=>{window.__offlineQA=[];navigator.serviceWorker?.addEventListener('message',event=>{window.__offlineQA.push(event.data);if(window.__offlineQA.length>25)window.__offlineQA.shift();});});
async function offlineStatus(){return page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration(),worker=reg?.waiting||reg?.active||navigator.serviceWorker.controller;if(!worker)return null;const controlled=navigator.serviceWorker.controller===worker;return new Promise(resolve=>{const channel=new MessageChannel(),timer=setTimeout(()=>resolve(null),4000);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve({...e.data,controlled,workerState:worker.state});};worker.postMessage({type:'CHECK_OFFLINE'},[channel.port2]);});});}
async function ready(version){const start=Date.now();let lastLog=0;for(;;){const value=await offlineStatus();if(value?.ready&&value.version===version){if(!value.controlled){if(value.workerState==='installed'){results.reopenedForActivation=true;await page.close();page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'#home');}else await page.reload();continue;}return value;}if(Date.now()-lastLog>10000){lastLog=Date.now();const detail=await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration(),stored=[];for(const name of await caches.keys()){if(!name.startsWith('findr-shell-'))continue;const c=await caches.open(name),keys=await c.keys(),stamp=await c.match(new URL('./offline-verified.json',location.href).href);stored.push({name,keys:keys.length,stamp:stamp?(await stamp.text()).slice(0,80):null});}return {controller:navigator.serviceWorker.controller?.state,active:r?.active?.state,waiting:r?.waiting?.state,installing:r?.installing?.state,stored,events:window.__offlineQA?.slice(-3)};});console.log(JSON.stringify({waitingFor:version,status:value,requests:requests.length,detail,errors}));}if(Date.now()-start>Number(process.env.FINDR_UPGRADE_TIMEOUT||180000))throw new Error('Offline release '+version+' did not become ready: '+JSON.stringify(value));await new Promise(resolve=>setTimeout(resolve,1000));}}
const check=(name,value=true)=>{assert.ok(value,name);results.checks.push(name);console.log(JSON.stringify({passed:name}));};
try{
 await page.goto(base+'#home');results.environment=await page.evaluate(()=>({userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight]}));
 results.before=await ready('0.26.0');check('Actual complete v0.26 offline shell installed and controlling the page');
 const fixture=process.env.FINDR_ADVANCED_PDF||path.join(root,'tests/fixtures/diagnostic025/synthetic-premier-elite-text.pdf');
 const encoded=fs.readFileSync(fixture).toString('base64');
 results.seed=await page.evaluate(async encoded=>{
  const db=await import('./db.mjs'),flow=await import('./terminal-flow.mjs'),bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),blob=new Blob([bytes],{type:'application/pdf'});
  const record={id:'upgrade-existing-manual',title:'SYNTHETIC upgrade record / original bytes',bytes:blob.size,savedAt:123456789};await db.saveManual(record,blob);
  const job=flow.ensureTerminalSession({id:'synthetic-pre-update-job',started:123456789,panel:{brand:'Unknown',model:'Unknown model',category:'fire',record_ids:[]},confirmed:false,answers:{},notes:'SYNTHETIC upgrade retention check',site:'Synthetic site',message:''});
  await db.setSetting('session',job);await db.setSetting('history',[job]);await db.setSetting('pack-usage',{'synthetic-pack':{count:2,lastUsed:123456789}});
  return {job,history:[job],bytes:blob.size,sha256:[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('')};
 },encoded);
 await context.setOffline(true);await page.reload();check('Previously cached v0.26 still opens offline',(await ready('0.26.0')).ready);
 await context.setOffline(false);updated=true;await page.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration();await registration.update();});
 results.after=await ready('0.27.0');check('v0.27 activates only after its manifest is fully verified',results.after.build===newManifest.build);
 await page.reload();await page.locator('[href="#quick-questions"]').first().waitFor({timeout:30000});
 networkCut=true;await context.setOffline(true);await page.reload();check('Updated app and separate Quick Questions menu load offline',(await ready('0.27.0')).ready);
 const retained=await page.evaluate(async()=>{const db=await import('./db.mjs'),blob=await db.getFile('upgrade-existing-manual');return {job:await db.setting('session'),history:await db.setting('history'),packUsage:await db.setting('pack-usage'),sha256:[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join(''),bytes:blob.size,dbVersion:(await db.openDB()).version,caches:await caches.keys()};});
 assert.deepEqual(retained.job,results.seed.job);assert.deepEqual(retained.history,results.seed.history);assert.equal(retained.sha256,results.seed.sha256);assert.equal(retained.bytes,results.seed.bytes);assert.equal(retained.dbVersion,1);
 check('Manual bytes, job, transcript, history, pack usage and DBv1 survive the update',retained.packUsage['synthetic-pack'].count===2);results.retained={...retained,job:undefined,history:undefined};
 const beforeRequests=requests.length;
 const processing=await page.evaluate(async()=>{const db=await import('./db.mjs'),api=await import('./manual-analysis.mjs'),start=performance.now(),a=await api.analyseManual({blob:await db.getFile('upgrade-existing-manual'),record:{id:'upgrade-existing-manual'}});return {usable:a.usable,pageCount:a.pageCount,processorVersion:a.processorVersion,elapsedMs:performance.now()-start,readiness:await api.getManualProcessingReadiness()};});
 check('Manual saved before the update processes for the first time offline',processing.usable);assert.ok(requests.slice(beforeRequests).every(request=>request.blocked),'Server cannot supply any bytes during offline PDF processing');results.blockedBackgroundRequests=requests.slice(beforeRequests);results.offlineNetwork={browserOffline:await page.evaluate(()=>!navigator.onLine),serverRefusesAllRequests:networkCut};
 results.processing={...processing,readiness:{ready:processing.readiness.ready,offlineControlled:processing.readiness.offlineControlled,missing:processing.readiness.missing.map(x=>x.path)}};
 check('PDF and OCR resources are verified ready in the updated shell',processing.readiness.ready);
 assert.deepEqual(errors,[]);results.passed=true;
}catch(error){results.passed=false;results.failure={message:error.message,stack:error.stack};results.offlineDiagnostic=await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();return {messages:window.__offlineQA,controller:navigator.serviceWorker.controller?.state,active:reg?.active?.state,waiting:reg?.waiting?.state,installing:reg?.installing?.state};}).catch(()=>null);throw error;}
finally{const output=process.env.FINDR_UPGRADE_RESULTS||`/tmp/findr-upgrade027-${kind}.json`;const safe={...results,seed:results.seed?{bytes:results.seed.bytes,sha256:results.seed.sha256,jobId:results.seed.job.id,messageCount:results.seed.job.diagnosticChat.messages.length}:null};fs.writeFileSync(output,JSON.stringify(safe,null,2)+'\n');console.log(JSON.stringify({passed:results.passed,browser:kind,checks:results.checks,output,errors}));await context.close();await new Promise(resolve=>server.close(resolve));}
