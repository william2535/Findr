import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildMinervaMenuMap,minervaMapAudit} from '../scripts/build-minerva-menu-map.mjs';
import {prepareMenuMap,validateMenuMap,searchMenuMaps,menuBreadcrumbs} from '../public/app/menu-map-engine.mjs';
import {menuMapFamily,menuEntryRoutes} from '../public/app/menu-map-registry.mjs';
import {helpBar,loadHintCatalogue,searchHintRows} from '../public/app/onsite.mjs';
const read=name=>JSON.parse(readFileSync(new URL('../public/app/data/'+name+'.json',import.meta.url),'utf8'));
const data=read('minerva-mx'),map=read('menu-maps/minerva');
const localFetch=async url=>({ok:true,json:async()=>read(url.replace(/^\.\/data\//,'').replace(/\.json$/,''))});

test('Minerva atlas preserves every reviewed node, documented source page and explicit physical route',()=>{
 assert.deepEqual(map,buildMinervaMenuMap(data));assert.deepEqual(validateMenuMap(map),[]);
 assert.equal(map.profileId,'minerva');assert.equal(menuMapFamily(map).route,'#minerva');assert.equal(map.coverage.hardwareVerified,false);
 const projected=new Map(map.nodes.filter(node=>node.emulatorNodeId).map(node=>[node.emulatorNodeId,node]));
 assert.equal(projected.size,data.nodes.length);
 for(const original of data.nodes){const node=projected.get(original.id);assert.ok(node,original.id);assert.equal(node.parentId,original.parentId??null);assert.equal(node.label,original.label||original.title);assert.equal(node.access,original.access||'See the cited access context.');assert.ok(node.sourceRefs.length);for(const ref of node.sourceRefs){const source=map.sources.find(source=>source.id===ref.sourceId);assert.ok(source);assert.ok(ref.pdfPage>0&&ref.pdfPage<=source.totalPdfPages);assert.ok(ref.printedPage);}}
 assert.equal(minervaMapAudit(map).sourceNodes,data.nodes.length);
});

test('Minerva FIND A MENU searches documented operating paths with sourced hints',async()=>{
 const prepared=prepareMenuMap(map),rows=await loadHintCatalogue('minerva',{fetcher:localFetch});
 for(const query of ['event log','point values','walk test','battery test']){
  const hits=searchMenuMaps([prepared],query);assert.ok(hits.length,query);
  assert.ok(hits.some(hit=>menuEntryRoutes(map,hit.node).hints?.startsWith('#minerva/')),query+' has guided support');
  assert.ok(searchHintRows(rows,query).length,query+' is discoverable from HINTS');
 }
 const view=map.nodes.find(node=>node.label==='Point Values'&&node.emulatorNodeId);assert.ok(view);assert.match(menuBreadcrumbs(map,view.id).map(node=>node.label).join(' > '),/View\/Print.*Point Values/);
 const html=helpBar('minerva');assert.match(html,/data-onsite-panel="minerva"/);assert.match(html,/HINTS/);assert.match(html,/FIND A MENU/);
});

test('Minerva reference boundaries remain visible without an invented guided action',async()=>{
 const rows=await loadHintCatalogue('minerva',{fetcher:localFetch});
 const references=map.nodes.filter(node=>node.emulatorNodeId&&node.simulationStatus!=='implemented');assert.ok(references.length);
 for(const node of references){assert.deepEqual(menuEntryRoutes(map,node),{practice:null,hints:null},node.id);assert.equal(rows.find(row=>row.id==='menu:'+node.id)?.route,null,node.id);assert.ok(searchMenuMaps([map],node.label).some(hit=>hit.node.id===node.id),node.id);}
 assert.ok(references.some(node=>/Diagnostics/i.test(node.label)),'Undocumented Diagnostics procedure remains bounded');
 const tasks=rows.filter(row=>row.kind==='task');assert.equal(tasks.length,data.lessons.length);assert.ok(tasks.length);for(const task of tasks){assert.match(task.route,/^#minerva\/coach\//);assert.ok(task.refs.length);}
 assert.ok(map.coverage.excludedAreas.length);assert.ok(map.gaps.every(gap=>gap.neededEvidence));
});

test('Minerva source projection never invents a route from a label or supported status',()=>{
 const fixture={id:'minerva-mx',modelScope:'SYNTHETIC fixture',knownLimits:['SYNTHETIC boundary'],sources:[{id:'fixture',title:'SYNTHETIC',edition:'SYNTHETIC edition',publisher:'SYNTHETIC',url:'https://example.org/manual.pdf',totalPdfPages:2}],nodes:[{id:'entry',kind:'menu',label:'SYNTHETIC menu',simulationStatus:'implemented',sourceRefs:[{sourceId:'fixture',pdfPage:1,printedPage:'1'}]}]};
 assert.equal(buildMinervaMenuMap(fixture).nodes[0].hintsRoute,undefined);
 fixture.nodes[0].hintsRoute='#xfp/guided/entry';assert.equal(buildMinervaMenuMap(fixture).nodes[0].hintsRoute,undefined);
 fixture.nodes[0].hintsRoute='#minerva/guided/entry';assert.equal(buildMinervaMenuMap(fixture).nodes[0].hintsRoute,'#minerva/guided/entry');
 fixture.nodes[0].simulationStatus='reference-only';assert.equal(buildMinervaMenuMap(fixture).nodes[0].hintsRoute,undefined);
});
