// Pixel-level visibility regression for the 0.30.0 motion feedback.
// Touch emulation deliberately avoids relying on desktop hover effects.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),pw=require('/opt/codex/cua_node/lib/node_modules/playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),base=process.env.FINDR_QA_URL||'http://127.0.0.1:8088';
const name=process.env.FINDR_QA_BROWSER||'chromium',width=Number(process.env.FINDR_QA_WIDTH||390),touch=width<700;
const out=process.env.FINDR_QA_RESULTS||path.join(root,`research/motion-0.30.1/visibility-${name}-${width}.json`),prefix=out.replace(/\.json$/,'');
fs.mkdirSync(path.dirname(out),{recursive:true});
for(const file of fs.readdirSync(path.dirname(out)))if(file.startsWith(path.basename(prefix)+'-')&&file.endsWith('.png'))fs.unlinkSync(path.join(path.dirname(out),file));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'findr0301-visibility-'));
let proxy;if(process.env.FINDR_QA_PROXY==='1'){const u=new URL(process.env.HTTPS_PROXY||process.env.HTTP_PROXY);proxy={server:u.origin};if(u.username)proxy.username=decodeURIComponent(u.username);if(u.password)proxy.password=decodeURIComponent(u.password);}
const context=await pw[name].launchPersistentContext(profile,{headless:true,serviceWorkers:'block',viewport:{width,height:844},hasTouch:touch,isMobile:touch,reducedMotion:'no-preference',...(proxy?{proxy}:{}),executablePath:name==='webkit'?'/tmp/findr027-webkit-run.sh':'/usr/bin/chromium',...(name==='chromium'?{args:['--no-sandbox','--disable-dev-shm-usage']}:{}),...(process.env.FINDR_QA_VIDEO==='1'?{recordVideo:{dir:path.join(path.dirname(out),'video'),size:{width,height:844}}}:{})});
const page=context.pages()[0]||await context.newPage();for(const old of context.pages())if(old!==page)await old.close();page.setDefaultTimeout(18000);
const result={status:'running',environment:{browser:name,version:context.browser()?.version(),os:'Linux container',viewport:{width,height:844},touchEmulated:touch,physicalPhone:false},checks:[],pixelSamples:[],pageErrors:[]};
page.on('pageerror',e=>result.pageErrors.push(e.stack));
const check=text=>{result.checks.push(text);console.log('PASS '+text);};
async function poll(fn,timeout=15000){const end=Date.now()+timeout;while(Date.now()<end){if(await page.evaluate(fn))return;await page.waitForTimeout(50);}throw Error('Timed out: '+String(fn));}
async function screenshot(label){const file=prefix+'-'+label+'.png';await page.screenshot({path:file});return file;}
const animations=()=>page.evaluate(()=>document.getAnimations().filter(a=>/^findr-|motion/i.test(a.animationName||a.id||'')).map(a=>({name:a.animationName||a.id,time:a.currentTime,state:a.playState,target:a.effect?.target?.className||a.effect?.target?.tagName||''})));
async function sampleWindow(label,{duration=1800,selectors=['.home-intro h1','.home-quick-links']}={}){
 const regions=await page.evaluate(selectors=>selectors.map(selector=>{const n=document.querySelector(selector);if(!n)throw Error('Missing region '+selector);const r=n.getBoundingClientRect();return {selector,box:[Math.max(0,Math.floor(r.left)),Math.max(0,Math.floor(r.top)),Math.min(innerWidth,Math.ceil(r.right)),Math.min(innerHeight,Math.ceil(r.bottom))]};}),selectors);
 assert.ok(regions.every(r=>r.box[2]>r.box[0]&&r.box[3]>r.box[1]),'Measured regions are visible on screen');
 const times=[0,350,750,1200,duration],frames=[],started=Date.now();
 for(const ms of times){const left=ms-(Date.now()-started);if(left>0)await page.waitForTimeout(left);frames.push({ms,file:await screenshot(label+'-'+ms)});}
 const metrics=JSON.parse(execFileSync('python',['-c',`import sys,json,itertools
from PIL import Image,ImageChops
payload=json.loads(sys.stdin.read());frames=[Image.open(f['file']).convert('RGB') for f in payload['frames']];out=[]
for region in payload['regions']:
 box=region['box'];pixels=(box[2]-box[0])*(box[3]-box[1]);best={'changedPixels':0,'fromMs':0,'toMs':0}
 for a,b in itertools.combinations(range(len(frames)),2):
  diff=ImageChops.difference(frames[a],frames[b]).crop(box);changed=sum(max(p)>12 for p in diff.get_flattened_data())
  if changed>best['changedPixels']:best={'changedPixels':changed,'fromMs':payload['frames'][a]['ms'],'toMs':payload['frames'][b]['ms']}
 out.append({**region,**best,'regionPixels':pixels,'percentChanged':round(best['changedPixels']/pixels*100,3),'threshold':'max RGB-channel difference >12/255'})
print(json.dumps(out))`,],{input:JSON.stringify({frames,regions}),encoding:'utf8'}));
 const keep=new Set(label==='user-off'||label==='os-reduced'?[duration]:metrics.flatMap(m=>[m.fromMs,m.toMs]));for(const frame of frames)if(!keep.has(frame.ms))fs.unlinkSync(frame.file);result.pixelSamples.push({label,duration,metrics,sampledTimes:times,frames:frames.filter(f=>keep.has(f.ms)).map(f=>({ms:f.ms,file:path.relative(root,f.file)}))});return metrics;
}
async function closeHelp(){await page.locator('[data-action="close-modal"]').click();await page.locator('#modal').waitFor({state:'hidden'});}
try{
 await page.goto(base+'/app/#home');await page.locator('.home-intro').waitFor();await poll(()=>document.querySelector('.home-intro.motion-visible'));
 result.appVersion=await page.evaluate(async()=>(await import('./version.mjs')).APP_VERSION);assert.equal(result.appVersion,'0.30.1');
 if(touch){assert.equal(await page.evaluate(()=>matchMedia('(hover: hover)').matches),false);assert.equal(await page.evaluate(()=>matchMedia('(pointer: fine)').matches),false);}check('Fresh page uses the shipped motion revision; phone checks use actual touch media without hover');
 await page.waitForTimeout(280);const visible=await sampleWindow('first-window');for(const metric of visible)assert.ok(metric.percentChanged>1,metric.selector+' should visibly change beyond a one-pixel rail: '+JSON.stringify(metric));check('Within 1.8 seconds, actual pixels visibly change inside the Home title and main actions');
 await page.waitForTimeout(1000);const recurring=await sampleWindow('recurring-window');assert.ok(recurring.some(m=>m.percentChanged>1),'The visible main view keeps recurring motion beyond its entrance');check('The above-fold motion recurs after the entrance instead of spending the whole window still');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual((await page.locator('nav[aria-label="Main navigation"] a').allTextContents()).map(x=>x.trim()),['Home','Manuals','Emulators','Fault finder','Quick Questions','Menu maps']);check('The existing navigation order and phone layout remain intact');
 await page.locator('#help').click();await page.locator('#interface-effects').waitFor();result.helpText=await page.locator('.interface-effects-setting').innerText();await screenshot('help-state');const replay=page.getByRole('button',{name:/Replay effects/i});await replay.waitFor();assert.equal(await replay.isEnabled(),true);await replay.click();await page.waitForTimeout(70);result.replay={afterClick:await animations(),dialogOpen:await page.locator('#modal').evaluate(n=>n.open)};
 assert.equal(result.replay.dialogOpen,false,'Replay returns directly to the current page');
 for(const name of ['findr-title','findr-gloss','findr-edge']){const active=result.replay.afterClick.filter(a=>a.name===name&&a.target.includes('motion-visible'));assert.ok(active.length,'Replay includes '+name);assert.ok(active.every(a=>a.state==='running'&&a.time>=0&&a.time<300),'Replay resets every visible '+name+' clock, including pseudo-elements: '+JSON.stringify(active));}
 const replayPixels=await sampleWindow('replay-window');assert.ok(replayPixels.every(m=>m.percentChanged>1),'Replay visibly sweeps both the title and main actions');check('Help exposes the actual effects state; Replay resets visible title, gloss and edge animations and produces visible motion');
 if(await page.locator('#modal').evaluate(n=>n.open))await closeHelp();
 await page.locator('#help').click();await page.locator('#interface-effects').uncheck();await closeHelp();await page.waitForTimeout(350);assert.equal(await page.locator('body').getAttribute('data-interface-motion'),'off');const off=await sampleWindow('user-off',{duration:1500});assert.ok(off.every(m=>m.changedPixels===0),'User-off Home title and actions remain pixel-stable');check('Turning effects off immediately produces a static title and main actions');
 await page.reload();await page.locator('.home-intro').waitFor();assert.equal(await page.locator('body').getAttribute('data-interface-motion'),'off');await page.locator('#help').click();assert.equal(await page.locator('#interface-effects').isChecked(),false);await page.locator('#interface-effects').check();await closeHelp();check('The off preference persists after reload and can be re-enabled');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(350);assert.equal(await page.locator('body').getAttribute('data-interface-motion'),'off');const reduced=await sampleWindow('os-reduced',{duration:1500});assert.ok(reduced.every(m=>m.changedPixels===0),'Reduced-motion title and actions remain pixel-stable');await page.locator('#help').click();assert.equal(await page.locator('#interface-effects').isDisabled(),true);assert.equal(await page.getByRole('button',{name:/Replay effects/i}).isDisabled(),true);result.reducedHelp=await page.locator('.interface-effects-setting').innerText();assert.match(result.reducedHelp,/reduce(?:d)? motion/i);check('OS reduced motion stays authoritative, disables replay and explains why effects are off');
 await closeHelp();await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-nav="questions"]').click();await page.locator('#quick-message').waitFor();await page.emulateMedia({reducedMotion:'reduce'});await poll(()=>!document.querySelector('.terminal-history [data-typing="active"],.terminal-history [data-typing="queued"]'));const old=await page.locator('.terminal-history').innerText();await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(1300);assert.equal(await page.locator('.terminal-history').innerText(),old);check('Existing completed terminal text remains stable after the visibility fix');
 result.status='passed';
}catch(error){result.status='failed';result.error=error.stack;console.error(error.stack);try{await screenshot('failure');result.lastAnimations=await animations();}catch{}process.exitCode=1;}
finally{if(result.status==='passed'&&result.pageErrors.length){result.status='failed';result.error='Uncaught page errors';process.exitCode=1;}fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');const video=page.video();await context.close();if(video){const source=await video.path(),target=prefix+'.webm';fs.renameSync(source,target);result.video=path.relative(root,target);fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');}console.log('QA '+out);}
