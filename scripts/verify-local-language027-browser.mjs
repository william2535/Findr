// Actual local inference; no mocked model, generated text or download responses.
// Start the app server, then set FINDR_MODEL_DOWNLOAD=1 for the explicit 366 MB
// first install. Reuse FINDR_MODEL_PROFILE to avoid downloading again. Optional
// FINDR_MODEL_OFFLINE=1 requires the complete, current service-worker precache.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),pw=require(process.env.FINDR_PLAYWRIGHT_PATH||'/opt/codex/cua_node/lib/node_modules/playwright');
const browser=process.env.FINDR_MODEL_BROWSER||'chromium',base=process.env.FINDR_MODEL_QA_URL||'http://127.0.0.1:8088/app/';
const profile=process.env.FINDR_MODEL_PROFILE||fs.mkdtempSync(path.join(os.tmpdir(),'findr-model027-'+browser+'-'));
const output=process.env.FINDR_MODEL_RESULTS||path.join(os.tmpdir(),'findr-local-language027-'+browser+'.json');
const context=await pw[browser].launchPersistentContext(profile,{headless:true,viewport:{width:390,height:844},
 ...(browser==='webkit'?{...(process.env.FINDR_WEBKIT?{executablePath:process.env.FINDR_WEBKIT}:{})}:{executablePath:process.env.FINDR_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']})});
const page=await context.newPage(),result={browser,profile,syntheticReference:true,offlineVerified:false,checks:[],measurements:[]},network=[];
page.on('request',request=>{const url=new URL(request.url());network.push({origin:url.origin,path:url.pathname});});
try{
 await page.goto(base);
 result.environment=await page.evaluate(()=>({userAgent:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency,deviceMemory:navigator.deviceMemory||null,webGPU:!!navigator.gpu}));
 let state=await page.evaluate(async()=>{window.localLanguage=await import('./local-language.mjs');return localLanguage.getLocalLanguageReadiness();});
 result.model=state.model;assert.ok(state.supported,state.message);
 if(!state.installed){
  assert.equal(process.env.FINDR_MODEL_DOWNLOAD,'1','Model pack absent. Set FINDR_MODEL_DOWNLOAD=1 to explicitly download the pinned 366 MB pack.');
  const download=await page.evaluate(async()=>{const start=performance.now(),progress=[];const ready=await localLanguage.prepareLocalLanguageResources({onProgress:value=>{window.modelProgress=value;if(value.completed===value.total)progress.push(value);}});return {elapsedMs:performance.now()-start,installed:ready.installed,progress};});
  assert.ok(download.installed);result.measurements.push({stage:'actual pinned model download and integrity verification',...download});
 }
 result.checks.push('Pinned model files installed and whole-file hashes verified');
 if(process.env.FINDR_MODEL_OFFLINE==='1'){
  // Explicit async polling: Playwright waitForFunction does not await a Promise
  // predicate in every supported harness version.
  const deadline=Date.now()+180000;
  do{state=await page.evaluate(()=>localLanguage.getLocalLanguageReadiness());if(state.ready)break;await new Promise(resolve=>setTimeout(resolve,500));}while(Date.now()<deadline);
  assert.ok(state.ready,'Model and runtime must both be cached before offline test');
  await context.setOffline(true);network.length=0;await page.reload();
  await page.evaluate(async()=>{window.localLanguage=await import('./local-language.mjs');});
 }
 const messages=[{role:'system',content:'You are FINDR. Answer only from the supplied reference. If the document does not establish an answer, say what is missing.'},{role:'user',content:'SYNTHETIC BENCHMARK REFERENCE [P1], PDF page 12: To view the event log, select View, then Log. Use the arrow keys to scroll through events.\nQuestion: how do i chek the evnt histry on this panel?'}];
 const first=await page.evaluate(async messages=>localLanguage.generateLocalReply({messages,maxNewTokens:64,onProgress:value=>{window.modelProgress=value;}}),messages);
 assert.ok(first.text);assert.equal(first.interpretationOnly,true);assert.equal(first.backend,'wasm');assert.ok(first.metrics.outputTokens>0);
 result.measurements.push({stage:'cold actual inference',...first});result.checks.push('Actual worker WASM CPU model generated output');
 const followup=await page.evaluate(async messages=>localLanguage.generateLocalReply({messages,maxNewTokens:48}),[...messages,{role:'assistant',content:first.text},{role:'user',content:'Where is that menu?'}]);
 assert.ok(followup.text);result.measurements.push({stage:'warm contextual follow-up',...followup});
 result.checks.push('Follow-up ran against the same loaded model and conversation');
 if(process.env.FINDR_MODEL_OFFLINE==='1'){
  assert.equal(network.some(request=>request.origin!==new URL(base).origin),false,'No external inference dependency');
  result.offlineVerified=true;result.checks.push('App reloaded and generated both replies with browser networking disabled');
 }
 result.qualityNote='Generated text is recorded for inspection, not asserted to be technically correct. Quick Questions source/evidence guards are tested separately.';
 result.passed=true;
}catch(error){result.passed=false;result.failure={name:error.name,message:error.message,stack:error.stack};throw error;}
finally{fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,browser,offlineVerified:result.offlineVerified,checks:result.checks,output}));await context.close();}
