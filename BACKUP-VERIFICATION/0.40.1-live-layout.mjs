import fs from 'node:fs';import assert from 'node:assert/strict';import{createRequire}from'node:module';
const pw=createRequire(import.meta.url)('/opt/codex/cua_node/lib/node_modules/playwright'),name=process.env.BROWSER||'chromium',base=process.env.BASE_URL||'http://127.0.0.1:4174/Findr/app/',out=process.env.OUTPUT_PREFIX||'/workspace/findr0401-'+name;
let browser,page;const results={browser:name,base,checks:[],errors:[],physicalPhone:false};
try{
 let proxy;if(base.startsWith('https:')&&(process.env.HTTPS_PROXY||process.env.https_proxy)){const u=new URL(process.env.HTTPS_PROXY||process.env.https_proxy);proxy={server:u.protocol+'//'+u.host,...(u.username?{username:decodeURIComponent(u.username),password:decodeURIComponent(u.password)}:{})};}
 browser=await pw[name].launch({headless:true,...(proxy?{proxy}:{}),executablePath:name==='webkit'?'/workspace/findr-webkit040-runtime/run-webkit.sh':'/usr/bin/chromium',...(name==='chromium'?{args:['--no-sandbox','--disable-dev-shm-usage']}:{})});results.version=browser.version();const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});page=await context.newPage();page.on('pageerror',e=>results.errors.push(e.message));
 await page.goto(base+'#home');await page.locator('#home-dashboard').waitFor();results.appVersion=await page.evaluate(async()=>(await import('./version.mjs')).APP_VERSION);assert.equal(results.appVersion,'0.40.1');
 for(const width of[320,390,430,768,1440]){
  await page.setViewportSize({width,height:844});
  for(const layout of['detailed','grid']){
   await page.locator('[data-home-layout="'+layout+'"]').click();
   const t=await page.locator('#home-toolbox>summary').boundingBox(),v=await page.locator('.home-view-options').boundingBox();assert.ok(t.x<v.x);assert.ok(Math.abs(t.y-v.y)<2,'Controls should share one row');assert.ok(t.width>=44&&t.height>=44);
   await page.locator('#home-toolbox>summary').click();assert.ok(await page.locator('#home-toolbox').getAttribute('open')!==null);assert.ok(await page.getByRole('link',{name:'Download tool box pack'}).isVisible());const body=await page.locator('.home-toolbox-body').boundingBox();const activeView=await page.locator('.home-view-options').boundingBox();assert.ok(body.y>=activeView.y+activeView.height);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await page.locator('#home-toolbox>summary').click();
  }
  results.checks.push({homeWidth:width,controlsSameRow:true,toolboxLeft:true,disclosureWorks:true});
 }
 await page.setViewportSize({width:390,height:844});await page.locator('[data-home-layout="detailed"]').click();await page.waitForTimeout(700);await page.screenshot({path:out+'-home.png'});
 await page.evaluate(()=>location.hash='#emulator');await page.locator('.emulator-landing').waitFor();await page.locator('[data-emulator-layout-choice="grid"]').click();
 for(const width of[320,390,430,768,1440]){
  await page.setViewportSize({width,height:844});const info=await page.locator('.emulator-family-section .practice-profiles').evaluateAll(groups=>groups.map(g=>({columns:getComputedStyle(g).gridTemplateColumns.split(' ').length,first:Array.from(g.children).slice(0,4).map(c=>({x:c.getBoundingClientRect().x,y:c.offsetTop,width:c.getBoundingClientRect().width})),overflow:g.scrollWidth>g.clientWidth+1})));assert.ok(info.every(g=>g.columns===4&&!g.overflow));assert.ok(info.every(g=>g.first.every(c=>Math.abs(c.y-g.first[0].y)<2)));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  const buttons=await page.locator('.emulator-profile-card .primary').evaluateAll(xs=>xs.map(x=>({w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height})));assert.ok(buttons.every(x=>x.w>=44&&x.h>=44));results.checks.push({emulatorWidth:width,fourPerRow:true,touchTargets:true});
  if(width===390||width===320){await page.locator('#emulator-fire-heading').scrollIntoViewIfNeeded();await page.screenshot({path:out+'-grid-'+width+'.png'});}
 }
 await page.setViewportSize({width:390,height:844});await page.locator('[data-emulator-layout-choice="list"]').click();assert.ok(await page.getByText('Open emulator',{exact:true}).first().isVisible());assert.equal(await page.locator('.emulator-fire-profiles').evaluate(x=>getComputedStyle(x).gridTemplateColumns.split(' ').length),1);
 await page.locator('[data-emulator-layout-choice="grid"]').click();await page.locator('a[aria-label="Open GENT Nano emulator"]').last().click();await page.waitForTimeout(200);assert.ok(page.url().includes('#nano'));results.checks.push({listPreserved:true,openPanelWorks:true});
 assert.deepEqual(results.errors,[]);results.status='passed';
}catch(e){results.status='failed';results.error={message:e.message,stack:e.stack};process.exitCode=1;await page?.screenshot({path:out+'-failure.png'}).catch(()=>{});}finally{await browser?.close();fs.writeFileSync(out+'.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));}
