import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const dataPath=new URL('../public/app/data/twinflex.json',import.meta.url),data=JSON.parse(readFileSync(dataPath));
test('current pro² source edition, hashes and binding are pinned without legacy menu blending',()=>{
 assert.deepEqual(data.panelIds,['fike-twinflexpro2']);assert.match(data.modelScope,/V3.00\+/);assert.match(data.sources[0].edition,/Rev.18/);assert.equal(data.sources[0].sha256,'19a3a00c9300574c53573cbdda4eb98fa240e6a7c633bbd5003fec9b439ef5cd');assert.equal(data.sources[0].totalPdfPages,80);assert.equal(data.sources[1].sha256,'f9142c9807f388c9e4ce65507d8ceb906a4ff609a3c9e98f6181ee981373aaf3');assert.equal(data.sources[1].totalPdfPages,32);
 assert.ok(data.nodes.some(n=>n.id==='peripheral'));assert.ok(!data.nodes.some(n=>/autolearn|enrol/i.test(n.title)));assert.match(data.nodes.find(n=>n.id==='zone-power').summary,/No addressed device enrolment/);
});
test('all documented engineer top-level entries and nested refs have stable IDs and valid source pages',()=>{
 const byId=new Map(data.nodes.map(n=>[n.id,n]));assert.equal(byId.size,data.nodes.length);
 assert.deepEqual(data.nodes.filter(n=>n.parentId==='root').map(n=>[n.code,n.id]),[['1','events'],['2','tests'],['3','enable-disable'],['4','time-date'],['5','logs'],['6','zones'],['7','confirmation'],['8','delays'],['9','panel-details'],['10','io'],['11','peripheral'],['12','printer']]);
 for(const node of data.nodes){if(node.parentId)assert.ok(byId.has(node.parentId),node.id);assert.ok(node.sourceRefs.length,node.id);for(const ref of node.sourceRefs){const source=data.sources.find(s=>s.id===ref.sourceId);assert.ok(source,node.id);assert.ok(ref.pdfPage>=1&&ref.pdfPage<=source.totalPdfPages,node.id);}if(node.simulationStatus==='reference-only'){assert.equal(node.hintsRoute,undefined,node.id);assert.ok(node.summary.length>35,node.id);}}
 assert.equal(byId.get('disable-delays').maxAccess,'2B');assert.equal(byId.get('disable-resound').access,'3A');assert.equal(byId.get('disable-resound').requiresWrite,true);assert.equal(byId.get('buzzer-enabled').writeGuard,true);
 assert.equal(byId.get('ip2-control').sourceRefs[0].pdfPage,49);assert.equal(byId.get('ip2-disable').sourceRefs[0].pdfPage,50);
});
test('data generator reproduces the checked source and lesson data exactly',()=>{
 const before=readFileSync(dataPath,'utf8');const run=spawnSync('python',['research/fire-service-0.24.0/build-twinflex-data.py'],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(run.status,0,run.stderr);assert.equal(readFileSync(dataPath,'utf8'),before);
});
