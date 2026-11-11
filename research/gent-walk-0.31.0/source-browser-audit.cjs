const {chromium}=require('/opt/codex/cua_node/lib/node_modules/playwright');
const fs=require('node:fs');
const path=require('node:path');
const source=process.argv[2];if(!source)throw Error('Pass the downloaded Gent commissioning PDF path.');
const outputPath=path.join(__dirname,'browser-source-audit.json');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage();
  await page.route('**/__gent-source.pdf',route=>route.fulfill({status:200,contentType:'application/pdf',body:fs.readFileSync(source)}));
  await page.goto((process.env.FINDR_QA_URL||'http://127.0.0.1:8088')+'/app/');
  const output=await page.evaluate(async()=>{
   const {loadPDFLibrary,pdfDocumentOptions,getPDFTextContent}=await import('./pdf-runtime.mjs');
   const {prepareManualAnswer,normaliseManualQuote}=await import('./manual-answers.mjs');
   const pack=await(await fetch('./data/quick-procedures.json')).json(),recipe=pack.procedures.find(p=>p.id==='gent-vigilon-en-zone-test-4188-856-issue7');
   const bytes=new Uint8Array(await(await fetch('/__gent-source.pdf')).arrayBuffer());
   const actualHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');if(actualHash!==recipe.manual.sha256)throw Error('Reviewed source hash changed: '+actualHash);
   const lib=await loadPDFLibrary(),doc=await lib.getDocument(pdfDocumentOptions(bytes)).promise;
   const pages=[];for(const number of [1,53,81,105]){const page=await doc.getPage(number),content=await getPDFTextContent(page);pages.push({page:number,text:content.items.filter(i=>typeof i.str==='string').map(i=>i.str+(i.hasEOL?'\n':' ')).join('').trim(),quality:{readable:true},method:'text'});page.cleanup();}
   const refs=[];const collect=x=>{if(!x||typeof x!=='object')return;if(x.quote)refs.push(x);Object.values(x).forEach(collect);};collect(recipe);
   const unique=[...new Map(refs.map(r=>[r.page+'|'+r.quote,r])).values()];
   const failures=unique.filter(ref=>!normaliseManualQuote(pages.find(p=>p.page===ref.page).text).includes(normaliseManualQuote(ref.quote)));
   const analysis={manualId:recipe.manual.recordId,contentHash:actualHash,processorVersion:'real-browser-source-audit',title:recipe.manual.title,usable:true,pages,identity:{manufacturer:'Gent',model:'Vigilon',models:['Vigilon'],equipmentType:'panel'}};
   const answer=prepareManualAnswer({question:'Putting a gent vigilon on walk test',analyses:[analysis],procedures:pack,equipment:{manufacturer:'Gent',model:'Vigilon',variant:recipe.scope.requiredVariant[0]},context:{intent:{equipment:{manufacturer:'Gent',model:'Vigilon',exact:true},operation:{id:'walk-test'},variant:recipe.scope.requiredVariant[0]}}});
   await doc.destroy();return {realPDF:true,pdfjsVersion:lib.version,recordId:recipe.manual.recordId,sha256:actualHash,uniqueAnchors:unique.length,failures,answer:{status:answer.status,coverage:answer.coverage,steps:answer.steps.length,pages:answer.sourceRefs?.map(r=>r.page),verificationFailures:answer.verificationFailures}};
  });
  fs.writeFileSync(outputPath,JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output));if(output.failures.length||output.answer.status!=='answered')process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
