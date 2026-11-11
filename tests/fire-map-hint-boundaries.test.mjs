import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {menuEntryRoutes} from '../public/app/menu-map-registry.mjs';
import {loadHintCatalogue} from '../public/app/onsite.mjs';

const dataRoot=new URL('../public/app/data/',import.meta.url);
const read=name=>JSON.parse(readFileSync(new URL(name+'.json',dataRoot),'utf8'));
const localFetch=async url=>({ok:true,json:async()=>read(url.replace(/^\.\/data\//,'').replace(/\.json$/,''))});

for(const [id,route,expected] of [['gent-vigilon','#gent',31],['gent-nano','#nano',17]]){
 test(`${id}: source-reference runtime nodes never become interactive menu or onsite hint routes`,async()=>{
  const source=read(id),map=read('menu-maps/'+id);
  const unsupported=source.nodes.filter(node=>node.confidence==='reference');
  assert.equal(unsupported.length,expected,'The independently reviewed reference boundary must remain explicit');
  const hints=await loadHintCatalogue(id,{fetcher:localFetch});
  const blocked=new Set(unsupported.map(node=>route+'/guided/'+encodeURIComponent(node.id)));
  for(const node of map.nodes){
   const links=menuEntryRoutes(map,node);
   assert.ok(!blocked.has(links.practice),`${node.id}: reference node linked as practice`);
   assert.ok(!blocked.has(links.hints),`${node.id}: reference node linked as hints`);
   if(unsupported.some(original=>original.id===node.emulatorNodeId)){
    assert.notEqual(node.simulationStatus,'implemented',node.id);
    assert.deepEqual(links,{practice:null,hints:null},node.id);
   }
  }
  for(const hint of hints)assert.ok(!blocked.has(hint.route),`${hint.id}: onsite catalogue links a source-only runtime node`);
  assert.ok(hints.some(hint=>hint.route?.startsWith(route+'/guided/')),'Supported routes remain available');
 });
}

test('Vigilon conflicting Repair and reference-only PIN routes remain source references in both entry points',async()=>{
 const map=read('menu-maps/gent-vigilon');
 const hints=await loadHintCatalogue('gent-vigilon',{fetcher:localFetch});
 for(const id of ['repair-reference','new-pass-reference']){
  const entries=map.nodes.filter(node=>node.emulatorNodeId===id);
  assert.ok(entries.length,`${id}: source reference must remain discoverable`);
  for(const entry of entries){
   assert.equal(menuEntryRoutes(map,entry).hints,null);
   assert.equal(hints.find(hint=>hint.id==='menu:'+entry.id)?.route,null);
  }
 }
});
