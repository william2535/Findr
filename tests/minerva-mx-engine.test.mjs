import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildMinervaModel,createMinervaState,restoreMinervaState,pressMinervaKey,minervaHint,minervaView,minervaMenuEntries,minervaPath,setMinervaInput,setMinervaText} from '../public/app/minerva-mx-engine.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../public/app/data/minerva-mx.json',import.meta.url)));
const model=buildMinervaModel(data);
function keys(s,...values){for(const k of values.flatMap(v=>Array.isArray(v)?v:[v]))s=pressMinervaKey(model,s,k);return s;}
function go(target,start=createMinervaState(model)){let s=start;for(let i=0;i<70;i++){const h=minervaHint(model,s,target);if(h.arrived)return s;assert.ok(h.key,'Hint blocked for '+target+': '+h.reason);s=pressMinervaKey(model,s,h.key);assert.equal(s.lastAction.ok,true,target+': '+s.notice);}assert.fail('Hint route loop for '+target);}
function safety(s){return {isolations:s.isolations,zoneIsolations:s.zoneIsolations,globalIsolations:s.globalIsolations,walk:s.walk,pendingTexts:s.pendingTexts,texts:s.texts};}
test('every unconditional documented source route is reached by physical hints without changing protection or configuration',()=>{
 const targets=Object.values(model.nodes).filter(n=>n.simulationStatus!=='reference-only'&&n.id!=='restart');assert.equal(targets.length,71);
 for(const n of targets){const first=createMinervaState(model),s=go(n.id,first);assert.deepEqual(safety(s),safety(first),n.id);assert.ok(minervaHint(model,s,n.id).arrived,n.id);assert.ok(n.sourceRefs?.length,n.id);}
});
test('every documented route can recover after the engineer enters a different real menu',()=>{
 for(const n of Object.values(model.nodes).filter(n=>n.simulationStatus!=='reference-only'&&n.id!=='restart')){const wrong=go(n.id==='event-view'?'status-point-loop':'event-view');const s=go(n.id,wrong);assert.ok(minervaHint(model,s,n.id).arrived,n.id);}
});
test('unpublished selector and diagnostics procedure stay explicit source boundaries',()=>{
 for(const id of ['diagnostics','initialisation-count']){assert.equal(minervaPath(model,id),null);assert.equal(minervaHint(model,createMinervaState(model),id).key,null);}
 let s=go('service');s=keys(s,'3');assert.match(minervaView(model,s).lines.join(' '),/SOURCE REFERENCE ONLY/);const before=safety(s);s=keys(s,'1','F5');assert.deepEqual(safety(s),before);
});
test('enable key and source access table gate the actual menu, while practice credentials are explicit',()=>{
 let s=createMinervaState(model);s=keys(s,'1');assert.equal(s.enabled,false);s=keys(s,'ENABLE','F1');assert.equal(s.accessRank,1);assert.ok(minervaMenuEntries(model,s).some(e=>e.target==='status'));assert.ok(!minervaMenuEntries(model,s).some(e=>e.target==='isolate'));
 s=keys(s,'F1','F3','0','1');assert.equal(s.login.stage,'pin');s=keys(s,...'246810','F5');assert.equal(s.accessRank,9);assert.ok(minervaMenuEntries(model,s).some(e=>e.target==='configuration'));
 s=keys(s,'ENABLE');assert.equal(s.accessRank,0);assert.equal(s.mode,'home');
});
test('point input and output isolation remain distinct; an isolated input does not raise a fire',()=>{
 let s=go('isolate-input-loop');s=keys(s,'F5','1');assert.deepEqual(s.isolations.A001,{input:true,output:false});s=setMinervaInput(model,s,'A001','Active');assert.equal(s.fire,false);s=setMinervaInput(model,s,'A001','Normal');s=keys(s,'2');assert.deepEqual(s.isolations.A001,{input:false,output:false});
 s=go('isolate-output-loop',s);s=keys(s,'F5','1');assert.deepEqual(s.isolations.A001,{input:false,output:true});s=setMinervaInput(model,s,'A001','Active');assert.equal(s.fire,true);
});
test('zone category isolation suppresses that input category without silently isolating another',()=>{
 let s=go('isolate-zone-detectors');s=keys(s,'F5','1');s=setMinervaInput(model,s,'A001','Active');assert.equal(s.fire,false);s=setMinervaInput(model,s,'A002','Active');assert.equal(s.fire,true);
});
test('walk-test end requires inactive selected points and a second session cannot silently replace it',()=>{
 let s=go('walk-test');s=keys(s,'F5');assert.ok(s.walk);s=setMinervaInput(model,s,'A001','Active');assert.equal(s.fire,false);s=keys(s,'F5');assert.ok(s.walk);assert.equal(s.lastAction.ok,false);s=setMinervaInput(model,s,'A001','Normal');s=keys(s,'F5');assert.equal(s.walk,null);
});
test('text changes remain pending until deliberate Restart; hints stop before committing and history survives reload',()=>{
 let s=go('text-point'),original=s.devices[0].text;s=keys(s,'F5');s=setMinervaText(model,s,'Training amended location');s=keys(s,'F5','F4');assert.equal(s.devices[0].text,original);assert.equal(s.pendingTexts.length,1);
 s=restoreMinervaState(model,JSON.parse(JSON.stringify(s)));assert.equal(s.pendingTexts.length,1);s=go('restart',s);assert.equal(s.menuId,'configuration');assert.equal(minervaHint(model,s,'restart').key,null);assert.equal(s.devices[0].text,original);s=keys(s,'F1');assert.equal(s.lastAction.ok,false);assert.equal(s.menuId,'configuration');s=keys(s,'9');assert.equal(s.pendingTexts.length,0);assert.equal(s.devices[0].text,'Training amended location');s=restoreMinervaState(model,s);assert.equal(s.devices[0].text,'Training amended location');assert.ok(s.events.some(e=>/Restart/.test(e.message)));
});
test('key OFF discards staged configuration and cannot overwrite a committed location',()=>{
 let s=go('text-point');const original=s.texts.point.A001;s=keys(s,'F5');s=setMinervaText(model,s,'Must not commit');s=keys(s,'F5','F4','ENABLE');assert.equal(s.pendingTexts.length,0);assert.equal(s.texts.point.A001,original);
});
test('alphanumeric panel keys cycle letters with cursor acceptance and case controls',()=>{
 let s=go('text-zone');s=keys(s,'F5','UP','2','2');assert.equal(s.editor.draft,'B');s=keys(s,'F4','2');assert.equal(s.editor.draft,'BA');s=keys(s,'F4','DOWN','3','3');assert.equal(s.editor.draft,'BAe');
});
test('event filtering and displayed report softkeys change the selected fictional view',()=>{
 let s=createMinervaState(model,{scenarioId:'fault'});s=go('event-filter',s);s=keys(s,'5','F4');const view=minervaView(model,s);assert.ok(view.lines.some(l=>/detector fault/.test(l)));assert.ok(!view.lines.some(l=>/panel started/.test(l)));s=keys(s,'F1');s=go('menu-points',s);s=keys(s,'F4');assert.ok(minervaView(model,s).lines.some(l=>l==='5 Unconfigured'));
});
test('both source cabinet variants share the documented engine while restoring the same local state',()=>{
 let s=go('isolate-point-loop');s=keys(s,'F5','1');const mx2=buildMinervaModel(data,{variant:'mx2'});assert.equal(mx2.variant,'mx2');const restored=restoreMinervaState(mx2,s);assert.equal(restored.variant,'mx2');assert.deepEqual(restored.isolations,s.isolations);assert.equal(restored.nodeId,s.nodeId);assert.equal(mx2.selected.display,'DCM800');
});
