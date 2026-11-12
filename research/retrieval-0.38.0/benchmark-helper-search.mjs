// Run from the repository with Node 22+: node research/retrieval-0.38.0/benchmark-helper-search.mjs <analyses.json> [output.json]
// The input contains locally processed real manuals; PDFs/text are not committed.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {buildManualIndex} from '../../public/app/manual-retrieval.mjs';
import {retrieveHelperEvidence} from '../../public/app/helpers-engine.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const fixture=process.argv[2];if(!fixture)throw Error('Provide the locally processed real MxPro5 analyses.json fixture.');
const analyses=JSON.parse(fs.readFileSync(fixture,'utf8')),indexes=analyses.map(buildManualIndex);
const helper={id:'benchmark',scope:{brand:'Advanced',model:'MxPro5'},selectedManualIds:analyses.map(a=>a.manualId),manualStates:Object.fromEntries(analyses.map(a=>[a.manualId,{status:'ready',contentHash:a.contentHash}]))};
// The prior helper engine is evaluated against the SAME current lexical index,
// isolating the bounded planner and its conversational stop-word adjustment.
const baselineCommit='d1ff3d032895efa02b4f2ad8188e2d9508fbdf00';
let prior=execFileSync('git',['show',baselineCommit+':public/app/helpers-engine.mjs'],{cwd:root,encoding:'utf8'});
prior=prior.replace(/from '(\.\/[^']+)'/g,(_match,url)=>`from '${pathToFileURL(path.join(root,'public/app',url)).href}'`);
const baseline=await import('data:text/javascript;base64,'+Buffer.from(prior).toString('base64'));
const cases=[
 ['Where do I set the clock?',[[analyses[0].manualId,39],[analyses[1].manualId,50]]],
 ['How can I look up old alarms?',[[analyses[0].manualId,24]]],
 ['Where is the event log?',[[analyses[0].manualId,24]]],
 ['How do I print the event log?',[[analyses[0].manualId,38]]],
 ['How do I change the printer options?',[[analyses[0].manualId,36]]],
 ['Where can I see the software version?',[[analyses[0].manualId,22]]],
 ['What does dirty mean?',[[analyses[0].manualId,25]]],
 ['How do I enable quantum teleportation?',[]]
];
const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
const rows=[];
for(const [question,expected]of cases){
 const variants={};for(const [name,run]of [['sameIndexWithoutPlanner',baseline.retrieveHelperEvidence],['boundedPlanner',retrieveHelperEvidence]]){
  let result,plan;const samples=[];
  for(let n=0;n<10;n++){const start=performance.now();result=run({helper,question,indexes,analyses,onPlan:p=>plan=p});samples.push(performance.now()-start);}
  const top=result[0];variants[name]={medianMs:Number(median(samples).toFixed(3)),top:top?{manualId:top.manualId,page:top.page}:null,top1Expected:expected.length?expected.some(([id,page])=>top?.manualId===id&&top.page===page):!result.length,...(plan?{searchCount:plan.searchCount,attemptKinds:plan.attempts.map(a=>a.kind)}:{})};
 }
 rows.push({question,expected:expected.map(([manualId,page])=>({manualId,page})),...variants});
}
const report={recordedAt:new Date().toISOString(),environment:{node:process.version,platform:process.platform,architecture:process.arch},baselineCommit,comparison:'Previous helper engine against current lexical indexes versus bounded planner; retrieval ranking changes measured separately.',manuals:analyses.map(a=>({id:a.manualId,title:a.title,contentHash:a.contentHash,pages:a.pages.length})),claim:'Reference retrieval only. No model inference, PDF reading, procedure validation or physical iPhone benchmark is measured.',rows};
const destination=process.argv[3];if(destination)fs.writeFileSync(destination,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
