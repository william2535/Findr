import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildServiceMenuMap,buildServiceMenuMaps} from '../scripts/build-service-menu-maps.mjs';
import {validateMenuMap,prepareMenuMap,searchMenuMaps} from '../public/app/menu-map-engine.mjs';
import {menuEntryRoutes} from '../public/app/menu-map-registry.mjs';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
for(const id of ['xfp','twinflex']){
 test(`${id}: published menu map is a reproducible projection of every source-reviewed node and lesson`,()=>{
  const data=read(`public/app/data/${id}.json`),map=read(`public/app/data/menu-maps/${id}.json`);
  assert.deepEqual(map,buildServiceMenuMap(data,id));assert.deepEqual(validateMenuMap(map),[]);
  assert.equal(map.coverage.hardwareVerified,false);assert.ok(map.coverage.excludedAreas.length);
  assert.equal(map.sourceProjection.sourceNodes,data.nodes.length);
  for(const source of map.sources){assert.match(source.sha256,/^[a-f0-9]{64}$/);assert.ok(source.publisher&&source.edition);assert.ok(source.totalPdfPages>0);}
  for(const sourceNode of data.nodes){
   const node=map.nodes.find(item=>item.id===sourceNode.id);assert.ok(node,sourceNode.id);
   assert.equal(node.emulatorNodeId,sourceNode.id);assert.equal(node.simulationStatus,sourceNode.simulationStatus);
   assert.deepEqual(node.sourceRefs,sourceNode.sourceRefs,sourceNode.id+': page labels must not be inferred');
   assert.equal(node.parentId,sourceNode.parentId??null);
   const routes=menuEntryRoutes(map,node);
   if(sourceNode.simulationStatus!=='implemented'||sourceNode.kind==='reference'){assert.equal(routes.hints,null);assert.equal(routes.practice,null);}
   else assert.equal(routes.hints,sourceNode.hintsRoute||null,sourceNode.id+': only explicit navigation can gain hints');
  }
  for(const lesson of data.lessons||[]){const node=map.nodes.find(item=>item.id==='lesson-'+lesson.id);assert.ok(node);assert.equal(node.parentId,'practice-tasks');assert.equal(node.lessonId,lesson.id);assert.equal(node.hintsRoute,`#${id}/coach/${lesson.id}`);assert.match(node.notes.join(' '),/not an additional manufacturer menu/);}
 });
 test(`${id}: source-only references retain searchable labels without a fabricated physical route`,()=>{
  const map=prepareMenuMap(read(`public/app/data/menu-maps/${id}.json`));
  const references=map.nodes.filter(node=>node.simulationStatus==='reference-only'&&node.emulatorNodeId);assert.ok(references.length);
  for(const node of references){assert.equal(menuEntryRoutes(map,node).hints,null);assert.equal(menuEntryRoutes(map,node).practice,null);assert.ok(searchMenuMaps([map],node.label).some(result=>result.node.id===node.id),node.id);}
 });
}

test('projection never creates a hints route from supported status or an unrelated engine route',()=>{
 const source={id:'xfp32',title:'SYNTHETIC',edition:'SYNTHETIC',publisher:'SYNTHETIC',url:'https://example.org/manual.pdf',totalPdfPages:5};
 const node={id:'entry',kind:'command',label:'SYNTHETIC source entry',parentId:null,sourceRefs:[{sourceId:source.id,pdfPage:1,printedPage:'1'}],simulationStatus:'implemented'};
 const data={id:'xfp',sources:[source],nodes:[node],modelScope:'SYNTHETIC fixture',knownLimits:['SYNTHETIC boundary']};
 assert.equal(buildServiceMenuMap(data).nodes[0].hintsRoute,undefined);
 node.hintsRoute='#twinflex/guided/entry';assert.equal(buildServiceMenuMap(data).nodes[0].hintsRoute,undefined);
 node.hintsRoute='#xfp/guided/entry';assert.equal(buildServiceMenuMap(data).nodes[0].hintsRoute,node.hintsRoute);
 node.simulationStatus='reference-only';assert.equal(buildServiceMenuMap(data).nodes[0].hintsRoute,undefined);
});

test('new projections add two families while retaining separate cabinet/model scopes',()=>{
 const maps=buildServiceMenuMaps();assert.deepEqual(maps.map(map=>map.profileId),['xfp','twinflex']);
 assert.match(maps[0].scope,/16|32/);assert.match(maps[0].scope,/CAST/);assert.match(maps[1].scope,/pro²/);assert.match(maps[1].scope,/V3\.00/);
});

test('named numbered physical outputs are searchable without converting their label number into a bare menu code',()=>{
 const map=prepareMenuMap(read('public/app/data/menu-maps/twinflex.json'));
 assert.ok(searchMenuMaps([map],'Monitored O/P 1').some(result=>result.node.id==='activate-monitored-1'));
 assert.ok(!searchMenuMaps([map],'1').some(result=>result.node.id==='activate-monitored-1'));
});

test('level-three searches include documented 3A review and 3B Write Enable while retaining their distinction',()=>{
 const map=prepareMenuMap(read('public/app/data/menu-maps/twinflex.json'));
 assert.ok(searchMenuMaps([map],'level 3').some(result=>result.node.id==='zone-power'));
 assert.ok(searchMenuMaps([map],'level3A').some(result=>result.node.id==='zone-power'));
 assert.ok(searchMenuMaps([map],'level 3B').some(result=>result.node.id==='zone-power'));
 assert.ok(!searchMenuMaps([map],'level 2B').some(result=>result.node.id==='zone-power'));
});
