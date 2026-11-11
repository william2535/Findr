import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hintFamilyId,panelHintContext,helpBar,menuHintRows,loadHintCatalogue,searchHintRows,hintStepControlLabel} from '../public/app/onsite.mjs';
import {MENU_MAP_FAMILIES} from '../public/app/menu-map-registry.mjs';
const read=name=>JSON.parse(readFileSync(new URL('../public/app/data/'+name+'.json',import.meta.url)));
const practice=read('practice'),conventional=read('conventional-fire');

test('all sixteen explicit engine families receive correctly scoped hint controls',()=>{
 assert.equal(MENU_MAP_FAMILIES.length,16);
 for(const family of MENU_MAP_FAMILIES){const html=helpBar(family.id);assert.match(html,new RegExp(`data-onsite-panel="${family.id}"`));assert.ok(html.includes(family.title.replaceAll('&','&amp;')));assert.match(html,/data-onsite="hints"/);assert.match(html,/data-onsite="find"/);if(family.mapKind==='controls')assert.match(html,/FIND A CONTROL/);}
 assert.equal(hintFamilyId('gent'),'gent-vigilon');assert.equal(hintFamilyId('nano'),'gent-nano');assert.equal(hintFamilyId('kentec-sigma-xt'),'');
});

test('archive hints use exact model bindings and retain unimplemented panel/manual context',()=>{
 const unknown={id:'synthetic-unknown',brand:'Kentec',model:'SYNTHETIC unsupported panel',record_ids:['synthetic-manual']};
 const context=panelHintContext(unknown,practice.profiles[0]);assert.equal(context.engineId,'');assert.equal(context.manualCount,1);assert.equal(context.panelId,unknown.id);assert.equal(context.panelName,'Kentec SYNTHETIC unsupported panel');
 const html=helpBar(context.engineId,{...context,panelName:'SYNTHETIC <unknown> "panel"'});assert.match(html,/data-onsite-panel=""/);assert.match(html,/&lt;unknown&gt; &quot;panel&quot;/);assert.doesNotMatch(html,/galaxy-dimension/);
 for(const profile of practice.profiles)for(const id of profile.panelIds){const selected=panelHintContext({id,brand:profile.brand,model:profile.title,record_ids:[]},profile);assert.equal(selected.engineId,profile.id);assert.equal(selected.trainerScope,profile.scope);}
 const orisec=practice.profiles.find(profile=>profile.id==='orisec-cp');assert.match(panelHintContext({id:'orisec-cp-50-cp-100-cp-200'},orisec).bindingNotice,/CP-200 is outside/);
});

test('reference or conditional fire map entries cannot acquire a highlighted key route',()=>{
 const family=MENU_MAP_FAMILIES.find(item=>item.id==='gent-vigilon');
 const map={profileId:family.id,sources:[],nodes:['implemented','reference-only','conditional','conflict','version-limited'].map((status,index)=>({id:'synthetic-'+index,label:'SYNTHETIC '+status,kind:'menu',simulationStatus:status,hintsRoute:'#gent/guided/synthetic-target',sourceRefs:[]}))};
 const rows=menuHintRows(family,map);assert.equal(rows[0].route,'#gent/guided/synthetic-target');for(const row of rows.slice(1))assert.equal(row.route,null);
 assert.equal(menuHintRows(family,{...map,nodes:[{...map.nodes[0],kind:'reference'}]})[0].route,null);
});

test('authored practice tasks are not duplicated as manufacturer menu entries in the hints picker',()=>{
 const family=MENU_MAP_FAMILIES.find(item=>item.id==='xfp'),map={profileId:family.id,nodes:[{id:'practice-tasks',label:'Guided practice tasks',kind:'reference'},{id:'lesson-find-new',lessonId:'find-new',label:'Accept a new detector',kind:'command',simulationStatus:'implemented',hintsRoute:'#xfp/coach/find-new'},{id:'find-new',label:'FIND NEW DEVICES',kind:'command',simulationStatus:'implemented',hintsRoute:'#xfp/guided/find-new'}]};
 assert.deepEqual(menuHintRows(family,map).map(row=>row.id),['menu:find-new']);
});

test('source-backed tasks retain human control labels, hold durations and distinct practice actions',async()=>{
 const requested=[];const fetcher=async url=>{requested.push(url);const file=url.slice('./data/'.length,-5);if(file.startsWith('menu-maps/'))return {ok:true,json:async()=>({profileId:file.split('/')[1],sources:[],nodes:[]})};return {ok:true,json:async()=>structuredClone(read(file))};};
 for(const family of MENU_MAP_FAMILIES){const rows=await loadHintCatalogue(family.id,{fetcher});const tasks=rows.filter(row=>row.kind==='task');assert.ok(tasks.length,family.id);assert.ok(tasks.every(row=>row.route.startsWith(family.kind==='keypad'?'#practice/'+family.id:family.route+'/coach/')));}
 const sigma=await loadHintCatalogue('kentec-sigma-cp',{fetcher});const write=sigma.flatMap(row=>row.steps.map(step=>({row,step}))).find(({step})=>step.expectedKeys?.includes('WRITE_ENABLE'));assert.ok(write);assert.match(hintStepControlLabel(write.step,write.row.controlLabels),/Write Enable/);assert.doesNotMatch(hintStepControlLabel(write.step,write.row.controlLabels),/WRITE_ENABLE/);
 const cfp=await loadHintCatalogue('c-tec-cfp-standard',{fetcher});const held=cfp.flatMap(row=>row.steps).find(step=>step.holdMs);assert.equal(held.holdMs,3000);assert.ok(cfp.flatMap(row=>row.steps).some(step=>typeof step.expectedCover==='boolean'));
 assert.equal(hintStepControlLabel({expectedKeys:['SYNTHETIC_UNVERIFIED']}),'');
 assert.equal((await loadHintCatalogue('synthetic-unimplemented',{fetcher})).length,0);
 assert.ok(requested.every(url=>url.startsWith('./data/')),'All hints read bundled data');
});

test('hint search understands practical operation names without losing source-only outcomes',()=>{
 const rows=[{title:'Enter level three',kind:'task'},{title:'Review engineering reference',kind:'menu',route:null},{title:'Zone test',kind:'task'},{title:'Unrelated',kind:'menu'}];
 assert.deepEqual(searchHintRows(rows,'level 3'),rows.slice(0,2));assert.deepEqual(searchHintRows(rows,'weekly test'),[rows[2]]);assert.deepEqual(searchHintRows(rows,'SYNTHETIC no result'),[]);
});

test('adding a device does not match the word address or offer an unrelated disablement task',()=>{
 const rows=[{title:'Disable a detector',summary:'Use its loop and address, then restore the device.'},{title:'FIND NEW DEVICES',summary:'Review newly connected devices.'},{title:'Accept a newly connected detector',summary:'A fictional new detector.'},{title:'Isolate zone supply for fictional device work',aliases:'add device replace device',summary:'No addressed-device enrolment exists on this panel.'}];
 assert.deepEqual(searchHintRows(rows),rows);assert.deepEqual(searchHintRows(rows,'  '),rows);
 assert.deepEqual(searchHintRows(rows,'add device'),rows.slice(1));
 assert.deepEqual(searchHintRows(rows,'loop address'),[rows[0]]);
});
