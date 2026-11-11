// The screenshot's actual entry path, using the unchanged version-1 saved
// catalogue record and real manufacturer PDF supplied by the runner.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),pw=require(process.env.FINDR_PLAYWRIGHT_PATH||'/opt/codex/cua_node/lib/node_modules/playwright');
const kind=process.env.FINDR_QA_BROWSER||'chromium',file=process.env.FINDR_ADVANCED_PDF;
if(!file)throw Error('Set FINDR_ADVANCED_PDF to the real verified catalogue Advanced MxPro4 PDF.');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'findr027-saved-'+kind+'-'));
const context=await pw[kind].launchPersistentContext(profile,{headless:true,serviceWorkers:'block',viewport:{width:390,height:844},reducedMotion:'reduce',executablePath:kind==='webkit'?(process.env.FINDR_WEBKIT||'/tmp/findr027-webkit-run.sh'):(process.env.FINDR_CHROMIUM||'/usr/bin/chromium'),...(kind==='chromium'?{args:['--no-sandbox','--disable-dev-shm-usage']}:{})});
const page=await context.newPage(),result={browser:kind,physicalIPhone:false,recordSchema:1,steps:[]},errors=[];
page.on('pageerror',e=>errors.push(e.stack));
async function poll(fn){const until=Date.now()+90000;while(Date.now()<until){if(await page.evaluate(fn))return;await page.waitForTimeout(100);}throw Error('Saved-manual UI did not reach identification');}
try{
 await page.goto((process.env.FINDR_QA_URL||'http://127.0.0.1:8088')+'/app/#home');
 result.environment=await page.evaluate(()=>navigator.userAgent);
 result.record=await page.evaluate(async encoded=>{const db=await import('./db.mjs'),catalogue=await(await fetch('./data/catalogue.json')).json(),record=catalogue.records.find(r=>r.id==='advanced-76cae27e9ec7');if(!record)throw Error('Real screenshot catalogue record is missing');const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),blob=new Blob([bytes],{type:'application/pdf'});const saved={...record,bytes:blob.size,savedAt:Date.parse('2026-11-01T10:00:00Z'),fileHash:record.sha256,imported:false};await db.saveManual(saved,blob);return{id:saved.id,title:saved.title,bytes:saved.bytes,sha256:saved.sha256};},fs.readFileSync(file).toString('base64'));
 await page.reload();await page.locator('[data-nav="finder"]').click();await page.locator('.terminal-session').waitFor();await page.getByRole('button',{name:'Start a fault visit',exact:true}).click();await page.locator('#diagnostic-message').fill('Use a saved manual');await page.locator('#diagnostic-message-form button[type="submit"]').click();await page.locator(`[data-action="chat-select-manual"][data-id="${result.record.id}"]`).click();const began=performance.now();
 await poll(async()=>{const db=await import('./db.mjs'),f=await import('./terminal-flow.mjs'),s=await db.setting('session');return f.getTerminalPrompt(s).kind==='identity'&&!s.diagnosticChat.terminal.pendingOperation;});
 const details=await page.evaluate(async()=>{const db=await import('./db.mjs'),f=await import('./terminal-flow.mjs'),s=await db.setting('session'),m=s.diagnosticChat.manuals[0],blob=await db.getFile('advanced-76cae27e9ec7');return{prompt:f.getTerminalPrompt(s),manual:m,transcript:s.diagnosticChat.messages.map(m=>m.text),bytes:blob.size,representation:blob.constructor.name};});
 assert.equal(details.manual.pageCount,72);assert.equal(details.bytes,result.record.bytes);assert.equal(details.representation,'Blob');assert.ok(details.transcript.some(t=>t==='Selected saved manual: Advanced mxpro4'));assert.equal(details.manual.usable,true);assert.doesNotMatch(details.transcript.join('\n'),/undefined is not a function|This PDF could not be read/);assert.deepEqual(errors,[]);
 result.steps=['Version-1 catalogue record with real PDF Blob','Reload','Normal Fault Finder Start','Use a saved manual','Advanced mxpro4','Real72-page PDF read; equipment confirmation shown; original Blob preserved'];result.elapsedMs=performance.now()-began;result.identity={...details.prompt.identity,evidence:undefined};result.status='passed';
}catch(error){result.status='failed';result.error=error.stack;await page.screenshot({path:'/tmp/findr027-saved-'+kind+'-failure.png',fullPage:true});throw error;}
finally{result.pageErrors=errors;const output=process.env.FINDR_QA_RESULTS||'/tmp/findr027-saved-'+kind+'.json';fs.writeFileSync(output,JSON.stringify(result,null,2));console.log(JSON.stringify(result));await context.close();}
