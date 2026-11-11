import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildFireMenuMaps} from '../scripts/build-fire-menu-maps.mjs';
import {validateMenuMap,prepareMenuMap,searchMenuMaps} from '../public/app/menu-map-engine.mjs';

const read=name=>JSON.parse(readFileSync(new URL('../'+name,import.meta.url),'utf8'));
const ids=['gent-vigilon','gent-nano','c-tec-cfp-standard','kentec-sigma-cp'];
const maps=ids.map(id=>read('public/app/data/menu-maps/'+id+'.json'));
const get=id=>maps.find(map=>map.profileId===id);

test('all four new engine maps validate with bounded PDF pages and preserved source identities',()=>{
 for(const map of maps){assert.deepEqual(validateMenuMap(map),[]);assert.equal(map.coverage.hardwareVerified,false);assert.ok(map.gaps.length);assert.ok(map.coverage.excludedAreas.length);for(const source of map.sources){assert.match(source.sha256,/^[a-f0-9]{64}$/);assert.ok(source.edition);assert.ok(source.publisher);assert.ok(source.totalPdfPages>0);}for(const node of map.nodes){assert.equal(typeof node.summary,'string');for(const note of node.notes)assert.equal(typeof note,'string');}}
});

test('fire map generation is reproducible and does not mutate the reviewed sources',()=>{
 assert.deepEqual(buildFireMenuMaps(),maps);assert.deepEqual(buildFireMenuMaps(),maps);
});

test('every reviewed Gent reference survives once and exact duplicate paths merge without losing evidence',()=>{
 for(const id of ['gent-vigilon','gent-nano']){
  const source=read('public/app/data/'+id+'.json'),map=get(id),allIds=map.nodes.flatMap(n=>n.sourceReferenceIds||[]);
  assert.deepEqual([...allIds].sort(),source.menuReference.map(r=>r.id).sort());
  const paths=map.nodes.filter(n=>n.sourcePath).map(n=>JSON.stringify(n.sourcePath));assert.equal(new Set(paths).size,paths.length);
  for(const row of source.menuReference){const node=map.nodes.find(n=>n.sourceReferenceIds?.includes(row.id));for(const ref of row.sourceRefs)for(const page of ref.pages)assert.ok(node.sourceRefs.some(r=>r.sourceId===ref.sourceId&&r.pdfPage===page));if(row.note)assert.ok(node.notes.includes(row.note));}
 }
 const merged=get('gent-vigilon').nodes.find(n=>JSON.stringify(n.sourcePath)===JSON.stringify(['Set Up','Modify','Label','MCP']));assert.equal(merged.sourceReferenceIds.length,2);assert.ok(merged.sourceRefs.length>=1);
});

test('Sigma maps all 103 exact configuration codes with 48 supported and 55 reference-only effects',()=>{
 const map=get('kentec-sigma-cp'),codes=map.nodes.filter(n=>n.id.startsWith('code-'));
 assert.equal(codes.length,103);assert.equal(codes.filter(n=>n.simulationStatus==='implemented').length,48);assert.equal(codes.filter(n=>n.simulationStatus==='reference-only').length,55);
 assert.equal(codes.find(n=>n.id==='code-00').code,'00');assert.equal(codes.find(n=>n.id==='code-2A').code,'2A');
 assert.ok(codes.find(n=>n.id==='code-2A').conditions.includes('Requires sigma_CP 215.hex'));
 for(const node of codes){assert.equal(node.address,null);assert.equal(node.hintsRoute,undefined);assert.equal(node.practiceRoute,undefined);}
 assert.match(codes.find(n=>n.id==='code-21').notes.join(' '),/not complying with EN54-2/);
});

test('CFP retains all nine physical SW8 positions without invented menu codes',()=>{
 const map=get('c-tec-cfp-standard'),source=read('public/app/data/conventional-fire.json').profiles.find(p=>p.id===map.profileId);
 assert.equal(map.engine.mapKind,'controls');assert.deepEqual(map.nodes.filter(n=>n.id.startsWith('function-')).map(n=>n.sourceControlId),source.engineering.functionOrder);
 for(const node of map.nodes.filter(n=>n.id.startsWith('function-'))){assert.equal(node.address,null);assert.equal(node.code,null);assert.ok(node.sourceRefs.some(r=>r.sourceId==='cfp-engineer-rev1'));}
 assert.equal(map.nodes.find(n=>n.id==='function-open-circuit').kind,'status');assert.match(map.nodes.find(n=>n.id==='function-coincidence').notes.join(' '),/non-compliant/);
});

test('authored task links point to actual same-engine lessons and stay separate from menu paths',()=>{
 const conventional=read('public/app/data/conventional-fire.json');
 for(const map of maps){const source=map.profileId.startsWith('gent-')?read('public/app/data/'+(map.profileId==='gent-vigilon'?'gent-lessons':'gent-nano-lessons')+'.json').lessons:conventional.profiles.find(p=>p.id===map.profileId).lessons;const lessonIds=new Set(source.map(l=>l.id));assert.equal(map.nodes.filter(n=>n.id.startsWith('lesson-')).length,source.length);for(const node of map.nodes.filter(n=>n.lessonId)){assert.ok(lessonIds.has(node.lessonId));assert.equal(node.practiceRoute,map.engine.route+'/coach/'+node.lessonId);assert.equal(node.hintsRoute,node.practiceRoute);assert.ok(node.kind!=='reference');assert.equal(node.sourcePath,undefined);}}
});

test('older Nano engineering and known Vigilon conflicts retain their boundaries',()=>{
 const nano=get('gent-nano');for(const node of nano.nodes.filter(n=>n.sourcePath?.[0]==='Engineering'&&n.simulationStatus!=='implemented')){assert.equal(node.hintsRoute,undefined);assert.equal(node.practiceRoute,undefined);}
 for(const node of nano.nodes.filter(n=>n.sourcePath?.[0]==='Engineering'&&n.simulationStatus==='implemented')){assert.ok(['firmware','site-data'].includes(node.emulatorNodeId));assert.ok(node.sourceRefs.every(r=>r.sourceId==='nano-operator-9'));}
 const reset=nano.nodes.find(n=>n.sourceReferenceIds?.includes('ref-engineering-loop-map-view-device-conditions-reset-codes'));assert.ok(reset.notes.some(n=>/V2\.xx/.test(n)));assert.ok(reset.sourceRefs.some(r=>r.sourceId==='nano-commissioning-3'));
 const gent=get('gent-vigilon');assert.equal(gent.nodes.filter(n=>n.simulationStatus==='conflict').length,4);for(const node of gent.nodes.filter(n=>n.simulationStatus==='conflict'))assert.equal(node.hintsRoute,undefined);
});

test('printed page labels are not guessed from every PDF page number',()=>{
 const refs=maps.flatMap(m=>m.nodes.flatMap(n=>n.sourceRefs));assert.ok(refs.some(r=>r.printedPage==='not recorded'));assert.ok(refs.some(r=>r.sourceId==='nano-commissioning-3'&&r.pdfPage===85&&r.printedPage==='86'));
 for(const ref of refs.filter(r=>r.sourceId==='gent-vigilon-4188-856-2015'&&r.pdfPage>=98&&r.pdfPage<=106))assert.equal(ref.printedPage,String(ref.pdfPage));
});

test('new control maps expose exact code and diagnostic searches without inventing installed readings',()=>{
 const prepared=maps.map(prepareMenuMap),code=searchMenuMaps(prepared,'2A',{profileId:'kentec-sigma-cp'});assert.ok(code.some(r=>r.node.id==='code-2A'));
 const fault=searchMenuMaps(prepared,'open circuit',{profileId:'c-tec-cfp-standard'});assert.ok(fault.some(r=>r.node.id==='function-open-circuit'));
 for(const map of maps)for(const node of map.nodes)assert.equal(node.installedValue,undefined);
});

test('the original nine intruder maps remain byte-identical to the 0.22.0 baseline',()=>{
 const audit=read('research/packs-hints-maps-0.23.0/intruder-map-baseline.json');assert.equal(audit.baselineCommit,'e8691d604f07fc882a803892d4c6ca7f8722a869');assert.equal(audit.files.length,9);
 for(const file of audit.files){const bytes=readFileSync(new URL('../'+file.path,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,file.path);}
});
