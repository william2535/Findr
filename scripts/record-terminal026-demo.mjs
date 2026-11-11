// Records actual browser interaction, not a reconstructed animation. Uses a
// labelled synthetic PDF so no field data or real equipment procedure is shown.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.FINDR_PLAYWRIGHT_PATH||'/opt/codex/cua_node/lib/node_modules/playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=process.env.FINDR_QA_URL||'http://127.0.0.1:8088';
const directory=process.env.FINDR_VIDEO_DIR||'/tmp/findr-terminal026-video';
const output=process.env.FINDR_VIDEO_OUTPUT||'/workspace/findr-0.26.0-terminal-demo.mp4';
fs.mkdirSync(directory,{recursive:true});
// This environment's Playwright waitForFunction does not await async predicates.
async function poll(page,predicate,arg,{timeout=25000}={}){const end=Date.now()+timeout;while(Date.now()<end){if(await page.evaluate(predicate,arg))return;await page.waitForTimeout(80);}throw Error('Timed out waiting for asynchronous browser state: '+String(predicate).slice(0,180));}
const browser=await chromium.launch({executablePath:process.env.FINDR_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'no-preference',serviceWorkers:'block',recordVideo:{dir:directory,size:{width:390,height:844}}});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const pause=ms=>page.waitForTimeout(ms);
async function typed(){await page.waitForFunction(()=>!document.querySelector('[data-message-id][data-typing="active"], [data-message-id][data-typing="queued"]'),null,{timeout:30000});await pause(450);}
async function send(text){await page.locator('#diagnostic-message').pressSequentially(text,{delay:55});await pause(250);await page.locator('#diagnostic-message').press('Enter');await typed();}
let video;
try{
 await page.goto(base+'/app/#faults');await page.locator('.terminal-session').waitFor();
 await typed();
 await page.getByRole('button',{name:'Start a fault visit',exact:true}).click();await typed();
 await send('3');
 await page.locator('#diagnostic-pdf-input').setInputFiles(path.join(root,'tests/fixtures/diagnostic025/synthetic-premier-elite-text.pdf'));
 await poll(page,async()=>{const db=await import('./db.mjs'),flow=await import('./terminal-flow.mjs');const s=await db.setting('session');return !s?.diagnosticChat?.terminal?.pendingOperation&&flow.getTerminalPrompt(s).kind==='identity';},null,{timeout:60000});await typed();
 await send('yes');await poll(page,async()=>{const db=await import('./db.mjs'),flow=await import('./terminal-flow.mjs');return flow.getTerminalPrompt(await db.setting('session')).kind==='component';});await send('the panel');
 await send('Zone 4 detector resistance fault.');await send('intermittent');
 await send('Expander 2 zone 4. The expander room is locked.');
 await poll(page,async()=>{const db=await import('./db.mjs'),engine=await import('./diagnostic-chat-engine.mjs');return engine.getDiagnosticPrompt(await db.setting('session')).kind==='question';});await pause(1800);
 await page.screenshot({path:'/tmp/findr-terminal026-demo-final.png'});
 video=page.video();
}finally{await context.close();await browser.close();}
if(errors.length)throw Error(errors.join('\n'));
const source=await video.path();
const converted=spawnSync('ffmpeg',['-y','-i',source,'-an','-c:v','libx264','-preset','medium','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',output],{encoding:'utf8'});
if(converted.status!==0)throw Error(converted.stderr||'Video conversion failed');
const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration,size:stream=width,height,codec_name','-of','json',output],{encoding:'utf8'});
console.log(JSON.stringify({synthetic:true,recordedActualBrowser:true,output,video:JSON.parse(probe.stdout)}));
