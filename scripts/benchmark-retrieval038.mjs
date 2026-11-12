// Reads existing real source analyses; no manuals, model weights or app state change.
// Usage: node scripts/benchmark-retrieval038.mjs [analysis.json] [output.json]
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
const root=process.cwd(),fixture=process.argv[2]||'/tmp/findr034-manual-evidence/analyses.json';
const output=process.argv[3]||path.join(root,'research/retrieval-0.38.0/lexical-benchmark.json');
const base='d1ff3d032895efa02b4f2ad8188e2d9508fbdf00';
function historicModule(file,overrides={}){
 let source=execFileSync('git',['show',`${base}:${file}`],{cwd:root,encoding:'utf8'});
 source=source.replace(/from (['"])(\.\/[^'"]+)\1/g,(_,quote,name)=>'from '+quote+(overrides[name]||pathToFileURL(path.resolve(root,path.dirname(file),name)).href)+quote);
 return 'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
}
const baselineURL=historicModule('public/app/manual-retrieval.mjs'),baseline=await import(baselineURL),current=await import(pathToFileURL(path.join(root,'public/app/manual-retrieval.mjs'))),baselineHelper=await import(historicModule('public/app/helpers-engine.mjs',{'./manual-retrieval.mjs':baselineURL})),currentHelper=await import(pathToFileURL(path.join(root,'public/app/helpers-engine.mjs')));
const analyses=JSON.parse(fs.readFileSync(fixture,'utf8')),user='advanced-0254975c10bd',installer='advanced-a18ea5cccf04';
const cases=[
 ['How do I view the event history?',[[user,24]]],
 ['How do I do a walk test?',[[user,33],[user,34]]],
 ['How do I disable a detector?',[[user,26],[user,27]]],
 ['What is the panel battery voltage?',[[user,23],[installer,25]]],
 ['What does loop open circuit mean?',[[user,23]]],
 ['Where do I find the disable sounders menu?',[[user,27],[user,28]]],
 ['How do I change the date and time?',[[user,39],[installer,50]]],
 ['How can I see all disabled devices?',[[user,15],[user,16],[user,21]]],
 ['How do I enable sounders?',[[user,30]]],
 ['What does the yellow disable light mean?',[[user,8],[user,15]]],
 ['How do I print the event log?',[[user,38]]],
 ['How do I calibrate the loop?',[[installer,47]]]
];
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
function run(module,helperEngine){
 const start=performance.now(),indexes=analyses.map(module.buildManualIndex),buildMs=performance.now()-start;
 const helper={scope:{brand:'Advanced',model:'MxPro5'},selectedManualIds:analyses.map(a=>a.manualId),manualStates:Object.fromEntries(analyses.map(a=>[a.manualId,{status:'ready',contentHash:a.contentHash}]))};
 const results=cases.map(([question,expected])=>{
  let hits;const times=[];for(let repeat=0;repeat<7;repeat++){const t=performance.now();hits=helperEngine.retrieveHelperEvidence({helper,conversation:helperEngine.createHelperConversation(),question,indexes,analyses,limit:4});times.push(performance.now()-t);}
  const relevant=p=>expected.some(([manualId,page])=>p.manualId===manualId&&p.page===page);
  return {question,expectedReferences:expected,medianMs:median(times),top1:!!hits[0]&&relevant(hits[0]),top4:hits.some(relevant),hits:hits.map(p=>({manualId:p.manualId,page:p.page,offset:p.offset,score:p.score,section:p.section||null,headings:p.headings||[]}))};
 });
 return {version:module.MANUAL_RETRIEVAL_VERSION,buildMs,passages:indexes.reduce((n,i)=>n+i.passages.length,0),indexBytes:Buffer.byteLength(JSON.stringify(indexes)),top1:results.filter(r=>r.top1).length,top4:results.filter(r=>r.top4).length,medianQueryMs:median(results.map(r=>r.medianMs)),results};
}
function scale(module,count){
 // SYNTHETIC distinct manuals with narrow component terms; tests candidate
 // pruning, not additional manufacturer coverage or genuine model inference.
 const synthetic=Array.from({length:count},(_,manual)=>({manualId:`synthetic-scale-${manual}`,contentHash:`synthetic-distinct-hash-${manual}`,usable:true,identity:{model:`Fixture${manual}`},pages:Array.from({length:40},(_,p)=>({page:p+1,quality:{readable:true},text:`${p+1}.1 Fixture component${manual} section${p}\nSYNTHETIC BENCHMARK ONLY. The component${manual} equipment reference describes section${p}. For event history on component${manual}, choose the recorded log. Preserve the original supported reference. This text does not describe real equipment. `.repeat(4)}))}));
 const start=performance.now(),indexes=synthetic.map(module.buildManualIndex),buildMs=performance.now()-start,queries={broad:`component${count-1} section39 event history`,precise:`component${count-1} section39`},results={};
 for(const [kind,question]of Object.entries(queries)){const times=[];for(let n=0;n<9;n++){const t=performance.now();module.retrieveManualPassages(indexes,question,{limit:4});times.push(performance.now()-t);}results[kind]={question,medianMs:median(times)};}
 return {manuals:count,pages:count*40,passages:indexes.reduce((n,i)=>n+i.passages.length,0),buildMs,indexBytes:Buffer.byteLength(JSON.stringify(indexes)),queries:results};
}
const result={environment:{node:process.version,platform:process.platform,arch:process.arch},baselineCommit:base,source:'Cached actual manufacturer PDFs extracted previously into local analysis.json. Page relevance is a retrieval benchmark, not proof of procedure completeness or physical-panel validation.',manuals:analyses.map(a=>{const pdf=path.join(path.dirname(fixture),a.manualId+'.pdf'),pdfHashVerified=fs.existsSync(pdf)?createHash('sha256').update(fs.readFileSync(pdf)).digest('hex')===a.contentHash:null;return {manualId:a.manualId,title:a.title,contentHash:a.contentHash,pages:a.pages.length,pdfHashVerified};}),baseline:run(baseline,baselineHelper),current:run(current,currentHelper),scale:{label:'SYNTHETIC repeated text, distinct manual identities',baseline:[scale(baseline,20),scale(baseline,100)],current:[scale(current,20),scale(current,100)]}};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({output,baseline:{top1:result.baseline.top1,top4:result.baseline.top4,medianMs:result.baseline.medianQueryMs},current:{top1:result.current.top1,top4:result.current.top4,medianMs:result.current.medianQueryMs},scale:result.scale},null,2));
