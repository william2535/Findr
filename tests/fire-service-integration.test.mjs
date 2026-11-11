import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FIRE_SERVICE_BINDINGS,serviceTrainerForPanel,serviceManualsForPanel,serviceManualDelivery,manualIdsForPanel} from '../public/app/fire-service-manuals.mjs';
import {menuMapFamily,menuEntryRoutes} from '../public/app/menu-map-registry.mjs';
import {panelHintContext,scopedHintRoute} from '../public/app/onsite.mjs';

test('new fire engines bind only the reviewed panel variants and preserve separate XFP capacities',()=>{
 assert.equal(serviceTrainerForPanel('c-tec-xfp-16-zone').route,'#xfp/variant/16');
 assert.equal(serviceTrainerForPanel('c-tec-xfp-32-zone').route,'#xfp/variant/32');
 assert.equal(serviceTrainerForPanel('fike-twinflexpro2').route,'#twinflex');
 for(const id of ['c-tec-xfp-cast-16-zone','c-tec-xfp-cast-32-zone','c-tec-xfp510-16-repeater','fike-twinflexpro','fike-twinflex','fike-twinflexpro2-repeater']){assert.equal(serviceTrainerForPanel(id),null,id);assert.equal(panelHintContext({id}).engineId,'',id);}
 for(const [panelId,binding] of Object.entries(FIRE_SERVICE_BINDINGS)){assert.equal(panelHintContext({id:panelId}).engineId,binding.engineId);assert.ok(menuMapFamily(binding.engineId));}
 assert.equal(scopedHintRoute('#xfp/coach/disable-device','c-tec-xfp-16-zone'),'#xfp/coach/disable-device/16');
 assert.equal(scopedHintRoute('#xfp/guided/find-new','c-tec-xfp-32-zone'),'#xfp/guided/find-new/32');
 assert.equal(scopedHintRoute('#xfp/coach/disable-device','c-tec-xfp-cast-16-zone'),'#xfp/coach/disable-device');
 assert.equal(scopedHintRoute('#twinflex/coach/disable-zone','c-tec-xfp-16-zone'),'#twinflex/coach/disable-zone');
 assert.equal(scopedHintRoute(null,'c-tec-xfp-16-zone'),null);
});

test('new map routes require explicit same-engine source-reviewed navigation and never fabricate cross-panel hints',()=>{
 for(const id of ['xfp','twinflex']){
  const map={profileId:id},node={id:'synthetic-menu',kind:'menu',simulationStatus:'implemented',hintsRoute:`#${id}/guided/synthetic-menu`};
  assert.equal(menuEntryRoutes(map,node).hints,node.hintsRoute);
  assert.equal(menuEntryRoutes(map,{...node,simulationStatus:'reference-only'}).hints,null);
  assert.equal(menuEntryRoutes(map,{...node,kind:'reference'}).hints,null);
  assert.equal(menuEntryRoutes(map,{...node,hintsRoute:`#${id==='xfp'?'twinflex':'xfp'}/guided/synthetic-menu`}).hints,null);
  assert.equal(menuEntryRoutes(map,{...node,hintsRoute:`#${id}/set/synthetic-menu`}).hints,null);
  assert.equal(menuEntryRoutes(map,{...node,hintsRoute:undefined}).hints,null);
 }
});

test('source-reviewed manual associations are exact-panel scoped, deduplicated and do not promote rejected old links',()=>{
 const records=new Map(['installer','user','alternate-installer','wrong-pro','old-unreviewed','unavailable','other-model'].map(id=>[id,{id,title:'SYNTHETIC '+id}]));
 const panel={id:'synthetic-pro2',record_ids:['wrong-pro','alternate-installer','old-unreviewed','user']};
 const data={families:[{id:'synthetic',panelIds:[panel.id],recordIds:['installer','user','unavailable'],excludedRecordIds:[{recordId:'wrong-pro',reason:'SYNTHETIC other generation'}],documents:[{recordId:'user',role:'user-guide',verificationStatus:'verified'},{recordId:'installer',role:'installation',verificationStatus:'verified',alternateRecordIds:['alternate-installer']},{recordId:'unavailable',role:'installation',verificationStatus:'unavailable'}]},{id:'other',panelIds:['synthetic-other'],recordIds:['other-model'],documents:[{recordId:'other-model',verificationStatus:'verified'}]}]};
 const before=structuredClone({panel,data});
 const review=serviceManualsForPanel(data,panel.id,records);assert.deepEqual(review.documents.map(d=>d.recordId),['installer','user']);
 assert.deepEqual(manualIdsForPanel(panel,data,records),['installer','user','old-unreviewed']);
 assert.deepEqual(serviceManualsForPanel(data,'no-such-model',records).documents,[]);
 assert.deepEqual({panel,data},before,'Manual lookup cannot rewrite source catalogue identities');
 assert.deepEqual(manualIdsForPanel(null,data,records),[]);
});

test('saved identical PDF aliases reopen immediately without presenting other saved editions as the reviewed source',()=>{
 const records=new Map(['canonical','alias','old'].map(id=>[id,{id,title:'SYNTHETIC '+id}])),document={recordId:'canonical',record:records.get('canonical'),alternateRecordIds:['alias','old'],sha256:'SYNTHETIC-reviewed-hash'};
 const saved=new Map([['alias',{fileHash:document.sha256}],['old',{fileHash:'SYNTHETIC-old-hash'}]]);
 const delivery=serviceManualDelivery(document,records,saved);
 assert.equal(delivery.record.id,'alias');assert.equal(delivery.editionStatus,'matching');assert.deepEqual(delivery.otherSavedIds,['old']);
 assert.equal(records.get('alias').title,'SYNTHETIC alias');
 saved.set('canonical',{fileHash:'SYNTHETIC-other-edition'});
 assert.equal(serviceManualDelivery(document,records,saved).record.id,'alias');
 saved.delete('alias');assert.equal(serviceManualDelivery(document,records,saved).editionStatus,'different');
 saved.set('canonical',{});assert.equal(serviceManualDelivery(document,records,saved).editionStatus,'unverified');
 saved.clear();assert.equal(serviceManualDelivery(document,records,saved).editionStatus,'not-saved');
});

test('app integrates both trainers into navigation, update flushing, exact panel/manual helpers and offline asset entrypoints',()=>{
 const app=readFileSync(new URL('../public/app/app.mjs',import.meta.url),'utf8'),shell=readFileSync(new URL('../public/app/index.html',import.meta.url),'utf8');
 for(const id of ['xfp','twinflex']){assert.ok(app.includes(`if(route!=='${id}')${id}?.leave?.()`));assert.ok(app.includes(`${id}.render(id,detail`));assert.ok(app.includes(`await ${id}?.flush?.()`));assert.ok(shell.includes(`href="./${id}.css"`));}
 assert.ok(app.includes('xfp.render(id,detail,{variant:mode})'));
 assert.ok(app.includes("link?.getAttribute('href')?.startsWith('#')&&modal.open)closeModal()"));
 assert.ok(app.includes('serviceTrainerForPanel(p.id)'));assert.ok(app.includes('showFamilyManuals:showPanelManuals'));
 assert.ok(app.includes('fire-service-manuals'));assert.ok(app.includes('applicability not verified here'));
});
