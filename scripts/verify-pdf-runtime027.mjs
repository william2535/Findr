// Browser regression for the actual local processor. Use a persistent WebKit
// context: Playwright WPE nonpersistent contexts cannot serialize IDB Blobs in
// the tested Linux package. This is a harness limitation, not a phone migration.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),pw=require(process.env.FINDR_PLAYWRIGHT_PATH||'/opt/codex/cua_node/lib/node_modules/playwright');
const root=path.resolve(new URL('..',import.meta.url).pathname),kind=process.env.FINDR_PDF_BROWSER||'chromium';
const base=process.env.FINDR_PDF_QA_URL||'http://127.0.0.1:8097/public/app/';
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'findr-pdf027-'+kind+'-'));
const context=await pw[kind].launchPersistentContext(profile,{headless:true,serviceWorkers:'block',viewport:{width:390,height:844},
  ...(kind==='webkit'?{...(process.env.FINDR_WEBKIT?{executablePath:process.env.FINDR_WEBKIT}:{})}:{executablePath:process.env.FINDR_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']})});
const page=await context.newPage(),uncaught=[],results={browser:kind,offlineVerified:false,checks:[],measurements:[]};
page.on('pageerror',e=>uncaught.push(e.message));
const fixture=filename=>path.join(root,'tests/fixtures/diagnostic025',filename);
async function processPDF(file,{id=path.basename(file),force=false,failSave=false,cancel=false,legacyBytes=false}={}){
  const encoded=fs.readFileSync(file).toString('base64');
  return page.evaluate(async({encoded,id,force,failSave,cancel,legacyBytes})=>{
    const api=await import('./manual-analysis.mjs'),db=await import('./db.mjs');
    const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),blob=new Blob([bytes],{type:'application/pdf'}),record={id,title:id,filename:id,bytes:blob.size};
    await db.saveManual(record,legacyBytes?bytes:blob);
    const saved=await db.getFile(id),controller=new AbortController(),progress=[],start=performance.now(),put=IDBObjectStore.prototype.put;
    if(failSave)IDBObjectStore.prototype.put=function(value,key){if(this.name==='settings'&&String(key).startsWith('manual-analysis:'))throw new DOMException('SYNTHETIC quota failure','QuotaExceededError');return put.call(this,value,key);};
    try{const analysis=await api.analyseManual({blob:saved,record,signal:controller.signal,force,onProgress:p=>{progress.push({phase:p.phase,page:p.page});if(cancel&&p.phase==='text')controller.abort();}});return {ok:true,analysis,elapsedMs:performance.now()-start,progress,storedRepresentation:saved.constructor.name};}
    catch(e){return {ok:false,error:{name:e.name,code:e.code,message:e.message,details:api.getManualProcessingErrorDetails(e)},elapsedMs:performance.now()-start,progress};}
    finally{IDBObjectStore.prototype.put=put;}
  },{encoded,id,force,failSave,cancel,legacyBytes});
}
const check=(label,passed=true)=>{assert.ok(passed,label);results.checks.push(label);};
try{
  await page.goto(base+'#home');
  results.environment=await page.evaluate(()=>({userAgent:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency,deviceMemory:navigator.deviceMemory||null,asyncIterator:typeof ReadableStream.prototype[Symbol.asyncIterator],getReader:typeof ReadableStream.prototype.getReader}));
  const text=await processPDF(fixture('synthetic-premier-elite-text.pdf'));
  check('Saved Blob text PDF is read and identified',text.ok&&text.analysis.identity.model==='Premier Elite 24');
  results.measurements.push({type:'synthetic text',pages:text.analysis.pageCount,elapsedMs:text.elapsedMs,timing:text.analysis.timing});
  await page.reload();
  const reopened=await page.evaluate(async()=>{const db=await import('./db.mjs'),api=await import('./manual-analysis.mjs'),start=performance.now();const a=await api.analyseManual({blob:await db.getFile('synthetic-premier-elite-text.pdf'),record:{id:'synthetic-premier-elite-text.pdf'}});return {reused:a.reused,pages:a.pages,elapsedMs:performance.now()-start};});
  check('Saved PDF and extracted pages reopen after reload',reopened.reused);assert.deepEqual(reopened.pages,text.analysis.pages);
  results.measurements.push({type:'saved text reuse',elapsedMs:reopened.elapsedMs});
  const runtimeFailure=await page.evaluate(async()=>{
    const db=await import('./db.mjs'),api=await import('./manual-analysis.mjs'),runtime=await import('./pdf-runtime.mjs');
    const blob=await db.getFile('synthetic-premier-elite-text.pdf'),lib=await runtime.loadPDFLibrary();
    const doc=await lib.getDocument(runtime.pdfDocumentOptions(await runtime.loadPDFBytes(blob))).promise,pdfPage=await doc.getPage(1),prototype=Object.getPrototypeOf(pdfPage),original=prototype.streamTextContent;
    await doc.destroy();prototype.streamTextContent=function(){throw new TypeError('SYNTHETIC reader runtime error');};
    try{await api.analyseManual({blob,record:{id:'synthetic-premier-elite-text.pdf'},force:true});return {unexpected:true};}
    catch(e){return {code:e.code,message:e.message,details:api.getManualProcessingErrorDetails(e)};}
    finally{prototype.streamTextContent=original;}
  });
  check('Actual extraction runtime error retains original stack and offers retry',runtimeFailure.code==='PDF_RUNTIME_FAILED'&&runtimeFailure.details.stage==='text-extraction'&&!!runtimeFailure.details.exception.cause.stack&&!/unlock|clearer|complete copy/i.test(runtimeFailure.message));
  results.runtimeFailure=runtimeFailure;
  const typed=await processPDF(fixture('synthetic-premier-elite-text.pdf'),{id:'legacy-typed-bytes',legacyBytes:true});
  check('Legacy typed-array bytes reopen without changing saved representation',typed.ok&&typed.storedRepresentation==='Uint8Array');
  const migrated=await page.evaluate(async current=>{
    const db=await import('./db.mjs'),api=await import('./manual-analysis.mjs');
    const old={...current,processorVersion:'2026-11-10.1',identity:{...current.identity,model:'old synthetic suggestion'},processedAt:123456789};
    await db.setSetting('manual-analysis:2026-11-10.1:'+current.contentHash,old);
    const connection=await db.openDB();await new Promise((resolve,reject)=>{const tx=connection.transaction('settings','readwrite');tx.objectStore('settings').delete('manual-analysis:'+current.processorVersion+':'+current.contentHash);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
    const progress=[],updated=await api.analyseManual({blob:await db.getFile('synthetic-premier-elite-text.pdf'),record:{id:'synthetic-premier-elite-text.pdf'},onProgress:p=>progress.push(p.phase)});
    return {old,retained:await api.getManualAnalysis(current.contentHash,{processorVersion:'2026-11-10.1'}),updated,progress};
  },text.analysis);
  assert.deepEqual(migrated.old,migrated.retained);assert.deepEqual(migrated.updated.pages,text.analysis.pages);
  check('Previous processor record is retained and reindexed without extraction/OCR',migrated.updated.reindexedFrom.processorVersion==='2026-11-10.1'&&!migrated.progress.includes('text')&&!migrated.progress.includes('ocr'));
  const scan=await processPDF(fixture('synthetic-premier-elite-scan.pdf'));
  check('Scanned PDF uses real local OCR',scan.ok&&scan.analysis.pages.every(p=>p.method==='ocr')&&scan.analysis.identity.manufacturer==='Texecom');
  results.measurements.push({type:'synthetic scanned',pages:scan.analysis.pageCount,elapsedMs:scan.elapsedMs,timing:scan.analysis.timing});
  for(const [file,expected] of [[path.join(root,'tests/fixtures/pdf-runtime027/synthetic-password-protected.pdf'),'PDF_PASSWORD_PROTECTED'],[fixture('synthetic-malformed.pdf'),'INVALID_PDF'],[fixture('synthetic-unreadable.pdf'),'UNREADABLE_MANUAL']]){
    const outcome=await processPDF(file);check(path.basename(file)+' classified '+expected,!outcome.ok&&outcome.error.code===expected);results.measurements.push({type:path.basename(file),elapsedMs:outcome.elapsedMs,errorCode:outcome.error.code});
  }
  const cancelled=await processPDF(fixture('synthetic-large-cancellation.pdf'),{cancel:true});check('Cancellation exits without a partial analysis',!cancelled.ok&&cancelled.error.name==='AbortError');
  const failedSave=await processPDF(fixture('synthetic-premier-elite-text.pdf'),{force:true,failSave:true});check('Save failure is visible and recoverable',!failedSave.ok&&failedSave.error.code==='STORAGE_UNAVAILABLE');
  const retry=await processPDF(fixture('synthetic-premier-elite-text.pdf'));check('Safe retry reuses intact analysis',retry.ok&&retry.analysis.reused);
  if(process.env.FINDR_ADVANCED_PDF){const real=await processPDF(process.env.FINDR_ADVANCED_PDF,{id:'advanced-76cae27e9ec7',force:true});check('Real archive Advanced MxPro4 PDF72pages',real.ok&&real.analysis.pageCount===72&&real.analysis.identity.manufacturer==='Advanced'&&real.analysis.identity.equipmentType==='panel'&&real.analysis.identity.requiresVariant);results.measurements.push({type:'real Advanced archive',sha256:real.analysis.contentHash,pages:72,elapsedMs:real.elapsedMs,timing:real.analysis.timing,identity:{...real.analysis.identity,evidence:undefined}});}
  assert.deepEqual(uncaught,[]);results.passed=true;
}catch(error){results.passed=false;results.failure={name:error.name,message:error.message,stack:error.stack};throw error;}
finally{const output=process.env.FINDR_PDF_RESULTS||`/tmp/findr-pdf-runtime027-${kind}.json`;fs.writeFileSync(output,JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({passed:results.passed,browser:kind,checks:results.checks,measurements:results.measurements,output}));await context.close();}
