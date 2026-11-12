// Optional research-only encoder benchmark. Does not alter app defaults or claim
// device readiness. Model weights and baseline copies remain under /tmp.
// Run: node research/retrieval-0.38.0/compact-encoder-benchmark.mjs
// Supply FINDR_ENCODER_ANALYSES if the real, separately obtained PDFs' cached
// analyses are elsewhere. Those manufacturer documents are not bundled here.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const dir=path.dirname(fileURLToPath(import.meta.url));
const work=process.env.FINDR_ENCODER_WORK||'/tmp/findr038-encoder';
const analysesFile=process.env.FINDR_ENCODER_ANALYSES||'/tmp/findr034-manual-evidence/analyses.json';
const baseline='d1ff3d032895efa02b4f2ad8188e2d9508fbdf00';
const modelId='Xenova/multi-qa-MiniLM-L6-cos-v1';
const revision='3c96c1df3fec9a98a5de76e80877c8bec18498f6';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.FINDR_PLAYWRIGHT||'/opt/codex/cua_node/lib/node_modules/playwright');
fs.mkdirSync(work,{recursive:true});
const downloadPython=String.raw`import urllib.request,json,pathlib,hashlib,time,sys
work=pathlib.Path(sys.argv[1]); repo=sys.argv[2]; rev=sys.argv[3]
base='https://huggingface.co/'+repo+'/resolve/'+rev+'/'
meta=json.load(urllib.request.urlopen('https://huggingface.co/api/models/'+repo+'/revision/'+rev+'?blobs=true'))
names=['config.json','tokenizer.json','tokenizer_config.json','special_tokens_map.json','onnx/model_quantized.onnx']
files=[]
for name in names:
 info=next(x for x in meta['siblings'] if x['rfilename']==name)
 target=work/'models'/'multiqa'/name; target.parent.mkdir(parents=True,exist_ok=True)
 start=time.perf_counter(); reused=target.exists()
 if not reused:
  with urllib.request.urlopen(base+name,timeout=90) as response, target.open('wb') as dest:
   while True:
    block=response.read(1024*1024)
    if not block:break
    dest.write(block)
 elapsed=(time.perf_counter()-start)*1000
 data=target.read_bytes(); digest=hashlib.sha256(data).hexdigest()
 assert len(data)==info['size'],name+' size mismatch'
 if info.get('lfs'):assert digest==info['lfs']['sha256'],name+' hash mismatch'
 files.append({'path':name,'bytes':len(data),'sha256':digest,'downloadMs':elapsed,'reused':reused,'url':base+name})
print(json.dumps({'modelId':repo,'revision':rev,'files':files,'bytes':sum(f['bytes'] for f in files),'downloadMs':sum(f['downloadMs'] for f in files)}))`;
const manifest=JSON.parse(execFileSync('python',['-c',downloadPython,work,modelId,revision],{encoding:'utf8',maxBuffer:1024*1024,timeout:240000}));
const originalManifest=path.join(work,'download-manifest.json');
if(!fs.existsSync(originalManifest))fs.writeFileSync(originalManifest,JSON.stringify(manifest,null,2));
// Freeze the original lexical comparator instead of importing a moving working tree.
const baselineRoot=path.join(work,'baseline');
const modules=execFileSync('git',['ls-tree','-r','--name-only',baseline,'public/app'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(x=>x.endsWith('.mjs'));
for(const name of modules){const dest=path.join(baselineRoot,name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,execFileSync('git',['show',baseline+':'+name],{cwd:root,maxBuffer:5*1024*1024}));}
const {buildManualIndex}=await import(pathToFileURL(path.join(baselineRoot,'public/app/manual-retrieval.mjs')));
const {scopeHelperIndexes,retrieveHelperEvidence}=await import(pathToFileURL(path.join(baselineRoot,'public/app/helpers-engine.mjs')));
const analyses=JSON.parse(fs.readFileSync(analysesFile,'utf8'));
const helper={scope:{brand:'Advanced',model:'MxPro5'},selectedManualIds:analyses.map(a=>a.manualId),manualStates:Object.fromEntries(analyses.map(a=>[a.manualId,{status:'ready',contentHash:a.contentHash}]))};
const indexes=analyses.map(buildManualIndex);
const passages=scopeHelperIndexes(helper,indexes,analyses).flatMap(x=>x.passages);
const questions=['How do I view the event history?','How do I do a walk test?','How do I disable a detector?','What is the panel battery voltage?','What does loop open circuit mean?','Where do I find the disable sounders menu?','How do I change the date and time?','How can I see all disabled devices?'];
const expectedPages=[[[0,24]],[[0,33],[0,34]],[[0,26],[0,27]],[[0,23],[1,25]],[[0,23]],[[0,27],[0,28]],[[0,39],[1,50]],[[0,15],[0,16],[0,21]]];
const runtimeFiles=['transformers.min.js','ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.wasm'].map(name=>{const bytes=fs.readFileSync(path.join(root,'public/app/vendor/local-language',name));return {path:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};});
const summary=p=>({id:p.id,manualId:p.manualId,title:p.title,pdfPage:p.page,offset:p.offset,score:p.score});
const result={createdAt:new Date().toISOString(),purpose:'Research-only semantic ranking comparison; no answer generation or app integration.',baseline,model:manifest,runtimeFiles,firstDownload:JSON.parse(fs.readFileSync(originalManifest,'utf8')),environment:{host:os.platform()+' '+os.release(),cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length},manuals:analyses.map(a=>({manualId:a.manualId,title:a.title,contentHash:a.contentHash,cachedPages:a.pages.length})),passageCount:passages.length,parameters:{pooling:'mean',normalize:true,maxLength:256,device:'wasm',dtype:'q8',threads:1,batchSize:4},queries:questions.map((question,i)=>({question,expectedReferences:expectedPages[i].map(([manual,page])=>[analyses[manual].manualId,page]),baselineLexical:retrieveHelperEvidence({helper,question,indexes,analyses,limit:4}).map(summary)})),limitations:['Eight exploratory questions, not a quality benchmark or procedure-safety validation.','Warm offline inference only; does not test cold offline loading or browser persistence.','Linux Chromium CPU only; no physical phone, iPhone, Android or WebKit inference claim.','Model download measured through execution environment proxy, not typical mobile download speed.','RSS is sampled aggregate Chromium renderer resident memory; includes browser overhead, not model-only or a guaranteed peak.']};
const worker=`let enc;onmessage=async({data})=>{try{if(data.type==='load'){const started=performance.now();const lib=await import('/runtime/transformers.min.js');const {env}=lib;env.allowRemoteModels=false;env.allowLocalModels=true;env.localModelPath=location.origin+'/models/';env.useBrowserCache=false;env.useFSCache=false;env.backends.onnx.wasm.wasmPaths={mjs:location.origin+'/runtime/ort-wasm-simd-threaded.mjs',wasm:location.origin+'/runtime/ort-wasm-simd-threaded.wasm'};env.backends.onnx.wasm.numThreads=1;env.backends.onnx.wasm.proxy=false;enc=await lib.pipeline('feature-extraction','multiqa',{dtype:'q8',device:'wasm',local_files_only:true});postMessage({loadMs:performance.now()-started});return;}const start=performance.now();const tokenLengths=data.texts.map(t=>enc.tokenizer.encode(t).length);const output=await enc(data.texts,{pooling:'mean',normalize:true,truncation:true,max_length:256});postMessage({vectors:output.tolist(),ms:performance.now()-start,tokenLengths});}catch(e){postMessage({error:{name:e.name,message:e.message,stack:e.stack}})}};`;
let requests=[];
const server=http.createServer((req,res)=>{requests.push(req.url);const u=new URL(req.url,'http://localhost');if(u.pathname==='/'){res.setHeader('content-type','text/html');res.end('<!doctype html><title>FINDR optional encoder benchmark</title>');return;}if(u.pathname==='/worker.mjs'){res.setHeader('content-type','text/javascript');res.end(worker);return;}const type=u.pathname.startsWith('/runtime/')?'runtime':u.pathname.startsWith('/models/')?'models':null;if(!type){res.writeHead(404).end();return;}const base=type==='runtime'?path.join(root,'public/app/vendor/local-language'):path.join(work,'models');const file=path.resolve(base,'.'+u.pathname.slice(type.length+1));if(!file.startsWith(base+'/')||!fs.existsSync(file)){res.writeHead(404).end();return;}res.setHeader('content-type',/\.m?js$/.test(file)?'text/javascript':file.endsWith('.wasm')?'application/wasm':'application/octet-stream');fs.createReadStream(file).pipe(res);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.FINDR_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
let memoryTimer;const samples=[];
const save=()=>fs.writeFileSync(path.join(dir,'compact-encoder-results.json'),JSON.stringify(result,null,2)+'\n');
try{
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage();
page.on('console',m=>{if(m.type()==='error')console.error(m.text());});
page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:'))(result.unexpectedNetworkRequests??=[]).push(r.url());});
await page.goto('http://127.0.0.1:'+server.address().port);
result.environment.browser=await page.evaluate(()=>({userAgent:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency,deviceMemoryGB:navigator.deviceMemory,viewport:[innerWidth,innerHeight]}));
const cdp=await browser.newBrowserCDPSession();
async function sample(){try{const {processInfo}=await cdp.send('SystemInfo.getProcessInfo');let rss=0;for(const p of processInfo.filter(p=>p.type==='renderer')){const s=fs.readFileSync('/proc/'+p.id+'/status','utf8');rss+=Number(s.match(/^VmRSS:\s+(\d+) kB/m)?.[1]||0)*1024;}samples.push({at:Date.now(),rendererRssBytes:rss});}catch{}}
await sample();memoryTimer=setInterval(sample,250);
await page.evaluate(()=>{window.worker=new Worker('/worker.mjs',{type:'module'});window.run=data=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Encoder timeout')),180000);worker.onmessage=({data})=>{clearTimeout(timer);resolve(data)};worker.onerror=e=>{clearTimeout(timer);reject(Error(e.message))};worker.postMessage(data);});});
result.load=await page.evaluate(()=>run({type:'load'}));console.log('load',JSON.stringify(result.load));if(result.load.error)throw Error('Encoder loading failed');
const vectors=[];let encodingMs=0,truncated=0,maxTokens=0;
for(let start=0;start<passages.length;start+=4){const batch=await page.evaluate(texts=>run({type:'encode',texts}),passages.slice(start,start+4).map(p=>p.text));if(batch.error)throw Error(JSON.stringify(batch.error));vectors.push(...batch.vectors);encodingMs+=batch.ms;truncated+=batch.tokenLengths.filter(n=>n>256).length;maxTokens=Math.max(maxTokens,...batch.tokenLengths);if(start%80===0)console.log('encoded',vectors.length,'of',passages.length);}
result.indexing={encodingMs,passages:passages.length,dimensions:vectors[0]?.length,truncatedPassages:truncated,maxUntruncatedTokens:maxTokens,vectorFloat32Bytes:vectors.length*vectors[0].length*4};
const dot=(a,b)=>a.reduce((sum,value,i)=>sum+value*b[i],0);
function rank(vector){return passages.map((p,i)=>({...summary(p),score:dot(vector,vectors[i])})).sort((a,b)=>b.score-a.score).slice(0,5);}
for(const query of result.queries){const encoded=await page.evaluate(question=>run({type:'encode',texts:[question]}),query.question);if(encoded.error)throw Error(JSON.stringify(encoded.error));query.encodingMs=encoded.ms;query.semantic=rank(encoded.vectors[0]);console.log(query.question,query.semantic[0].title,query.semantic[0].pdfPage,query.encodingMs.toFixed(1)+'ms');save();}
const before=requests.length;await context.setOffline(true);const offline=await page.evaluate(question=>run({type:'encode',texts:[question]}),questions[0]);if(offline.error)throw Error(JSON.stringify(offline.error));result.warmOffline={networkDisabled:true,encodingMs:offline.ms,top:rank(offline.vectors[0])[0],serverRequestsDuringOffline:requests.length-before};
await sample();result.memory={sampleCount:samples.length,intervalMs:250,baselineRendererRssBytes:samples[0]?.rendererRssBytes,peakRendererRssBytes:Math.max(...samples.map(s=>s.rendererRssBytes))};
const totals={baselineTop1:0,baselineTop3:0,semanticTop1:0,semanticTop3:0};for(const query of result.queries){const hit=(rows,n)=>rows.slice(0,n).some(p=>query.expectedReferences.some(([id,page])=>id===p.manualId&&page===p.pdfPage));query.evaluation={baselineTop1:hit(query.baselineLexical,1),baselineTop3:hit(query.baselineLexical,3),semanticTop1:hit(query.semantic,1),semanticTop3:hit(query.semantic,3)};for(const key of Object.keys(totals))totals[key]+=Number(query.evaluation[key]);}result.evaluation={definition:'Page-relevance targets independently reviewed in lexical-benchmark.json. Hits do not establish a complete or safe answer; loop-open target supplies monitoring context only.',questionCount:result.queries.length,...totals};result.requests=requests;result.completed=true;
}catch(error){result.error={name:error.name,message:error.message,stack:error.stack};result.completed=false;console.error(error);}finally{clearInterval(memoryTimer);save();await browser.close();await new Promise(resolve=>server.close(resolve));}
console.log('Results:',path.join(dir,'compact-encoder-results.json'));
