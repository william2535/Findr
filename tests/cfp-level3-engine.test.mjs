import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildConventionalModel,createConventionalState,pressConventionalKey,setConventionalCover,setConventionalDelay,advanceConventionalTime,setConventionalInput,conventionalView,restoreConventionalState,evaluateConventionalConditions} from '../public/app/conventional-fire-engine.mjs';
const data=JSON.parse(readFileSync(new URL('../public/app/data/conventional-fire.json',import.meta.url)));
const model=buildConventionalModel(data,'c-tec-cfp-standard'),sigma=buildConventionalModel(data,'kentec-sigma-cp');
const fresh=()=>createConventionalState(model),v=s=>conventionalView(model,s),key=(s,...keys)=>keys.reduce((state,key)=>pressConventionalKey(model,state,key),s);
const cycle=['coincidence','nonlatching','delays','test','system-fault','repeater-fault','open-circuit','short-circuit','sounder-status'];
function enter(s,fn){s=setConventionalCover(model,s,true);if(!s.engineering)s=key(s,'ENGINEER');for(let i=0;i<cycle.length&&s.engineering.functionId!==fn;i++)s=key(s,'ENGINEER');assert.equal(s.engineering.functionId,fn);return s;}
function configure(s,fn,option,on=true){s=enter(s,fn);s=key(s,'NEXT_OPTION');for(let i=0;i<12&&v(s).engineering.selection?.option!==option;i++)s=key(s,'NEXT_OPTION');assert.equal(v(s).engineering.selection?.option,option);if(v(s).engineering.selection.draftEnabled!==on)s=key(s,'TOGGLE');s=key(s,'NEXT_OPTION','EXIT');return s;}
const input=(s,id,state,faultType)=>setConventionalInput(model,s,{zoneId:id,state,faultType});

test('cover access and SW8 are separate; exact S-path cycle is repeatable without L2 access',()=>{
 let s=fresh();s=key(s,'ENGINEER');assert.equal(s.lastAction.ok,false);assert.equal(s.engineering,null);
 s=setConventionalCover(model,s,true);assert.equal(v(s).accessLevel,1);assert.equal(s.engineering,null);const observed=[];
 for(let i=0;i<cycle.length;i++){s=key(s,'ENGINEER');observed.push(s.engineering.functionId);assert.equal(v(s).accessLevel,3);assert.equal(v(s).engineering.functions.filter(x=>x.state==='flashing').length,1);}
 assert.deepEqual(observed,cycle);s=key(s,'ENGINEER');assert.equal(s.engineering.functionId,'coincidence');s=key(s,'EXIT');assert.equal(v(s).accessLevel,1);assert.equal(s.coverOpen,true);
 const sigmaOpen=setConventionalCover(sigma,createConventionalState(sigma),true);assert.equal(sigmaOpen.writeEnabled,false);assert.equal(pressConventionalKey(sigma,sigmaOpen,'ENGINEER').lastAction.ok,false);
});
test('refitting the cover preserves active engineering state and staged drafts; SW8 remains physically inside',()=>{
 let s=key(enter(fresh(),'coincidence'),'NEXT_OPTION','TOGGLE');assert.deepEqual(s.settings.coincidencePairs,[]);
 s=setConventionalCover(model,s,false);assert.equal(s.coverOpen,false);assert.equal(s.engineering.draftEnabled,true);assert.match(v(s).engineering.notice,/still active|remains active/);assert.equal(v(s).internalKeys.find(k=>k.id==='ENGINEER').enabled,false);
 const before=structuredClone(s.engineering);s=key(s,'ENGINEER');assert.equal(s.lastAction.ok,false);assert.deepEqual(s.engineering,before);
 s=key(s,'NEXT_OPTION');assert.deepEqual(s.settings.coincidencePairs,['Z1-Z2']);s=key(s,'EXIT');assert.equal(s.engineering,null);assert.deepEqual(s.settings.coincidencePairs,['Z1-Z2']);
});
test('engineering Next selects immediately; per-item toggles need confirmation and unconfirmed training drafts do not change settings',()=>{
 let s=key(enter(fresh(),'nonlatching'),'NEXT_OPTION');assert.equal(v(s).engineering.selection.option,'Z1');assert.equal(v(s).zones[0].selectionRate,'slower');
 s=key(s,'TOGGLE');assert.equal(v(s).zones[0].selectionRate,'same');assert.deepEqual(s.settings.nonLatchingZones,[]);
 s=key(s,'ENGINEER');assert.equal(s.engineering.functionId,'delays');assert.deepEqual(s.settings.nonLatchingZones,[]);assert.match(s.lastAction.message,/Unconfirmed training/);
 s=configure(s,'nonlatching','Z2');assert.deepEqual(s.settings.nonLatchingZones,['Z2']);
});
test('coincidence requires both paired zones for outputs, while manual intervention and unrelated zones are distinct',()=>{
 let s=configure(fresh(),'coincidence','Z1-Z2');s=input(s,'Z1','alarm');assert.equal(v(s).status.fire,true);assert.equal(v(s).buzzerActive,true);assert.equal(v(s).soundersActive,false);assert.equal(v(s).outputs.remote,false);assert.equal(v(s).outputs.auxiliary,false);
 s=input(s,'Z2','alarm');assert.equal(v(s).soundersActive,true);assert.equal(v(s).outputs.remote,true);
 let manual=configure(fresh(),'coincidence','Z1-Z2');manual=input(manual,'Z1','alarm');manual=key(manual,'KEYSWITCH','SOUNDERS');assert.equal(v(manual).soundersActive,true);assert.equal(v(manual).outputs.auxiliary,true);
 let other=configure(fresh(),'coincidence','Z1-Z2');other=input(other,'Z3','alarm');assert.equal(v(other).soundersActive,true);
});
test('non-latching input clears itself and never asserts auxiliary or remote fire outputs',()=>{
 let s=configure(fresh(),'nonlatching','Z1');s=input(s,'Z1','alarm');assert.equal(v(s).soundersActive,true);assert.equal(v(s).outputs.remote,false);assert.equal(v(s).outputs.auxiliary,false);
 s=input(s,'Z1','normal');assert.equal(v(s).status.fire,false);assert.equal(v(s).soundersActive,false);assert.deepEqual(s.settings.nonLatchingZones,['Z1']);
});
test('VR1 is physically exposed and validates documented range; training time and delay override are explicit',()=>{
 let s=fresh();assert.equal(setConventionalDelay(model,s,3).lastAction.ok,false);s=setConventionalCover(model,s,true);
 for(const invalid of [0,11,NaN,Infinity,'3'])assert.equal(setConventionalDelay(model,s,invalid).lastAction.ok,false);
 s=configure(s,'delays','Z1');s=setConventionalDelay(model,s,1);s=setConventionalCover(model,s,false);s=input(s,'Z1','alarm');assert.equal(v(s).soundersActive,false);assert.equal(v(s).delayPending,true);assert.equal(v(s).outputs.auxiliary,false);
 let elapsed=advanceConventionalTime(model,s,59);assert.equal(v(elapsed).soundersActive,false);elapsed=advanceConventionalTime(model,elapsed,1);assert.equal(v(elapsed).soundersActive,true);assert.equal(v(elapsed).outputs.remote,true);assert.equal(v(elapsed).delayPending,false);
 assert.equal(v(s).accessLevel,1);assert.equal(v(s).internalKeys.find(k=>k.id==='SOUNDERS').enabled,true);s=key(s,'SOUNDERS');assert.equal(s.lastAction.ok,true);assert.equal(v(s).soundersActive,true);assert.equal(v(s).outputs.auxiliary,true);assert.equal(v(s).delayPending,false);
});
test('delay target cycle includes remote and auxiliary; independently delayed output does not delay unrelated outputs',()=>{
 let s=enter(fresh(),'delays');s=key(s,'NEXT_OPTION');const observed=[];for(let i=0;i<10;i++){observed.push(v(s).engineering.selection.option);s=key(s,'NEXT_OPTION');}assert.deepEqual(observed,['Z1','Z2','Z3','Z4','Z5','Z6','Z7','Z8','remote','auxiliary']);assert.equal(v(s).engineering.selection.option,'Z1');s=key(s,'EXIT');
 s=configure(s,'delays','remote');s=input(s,'Z1','alarm');assert.equal(v(s).soundersActive,true);assert.equal(v(s).outputs.remote,false);assert.equal(v(s).outputs.auxiliary,true);s=advanceConventionalTime(model,s,60);assert.equal(v(s).outputs.remote,true);
});
test('delayed remote and auxiliary output editing exposes the documented slower or same-rate selection',()=>{
 let s=key(enter(fresh(),'delays'),'NEXT_OPTION');for(let i=0;i<8;i++)s=key(s,'NEXT_OPTION');assert.equal(v(s).engineering.selection.option,'remote');assert.equal(v(s).leds.find(x=>x.id==='remote-output-status').selectionRate,'slower');s=key(s,'TOGGLE');assert.equal(v(s).leds.find(x=>x.id==='remote-output-status').selectionRate,'same');s=key(s,'NEXT_OPTION');assert.equal(v(s).engineering.selection.option,'auxiliary');assert.equal(v(s).leds.find(x=>x.id==='auxiliary-output-status').selectionRate,'slower');
});
test('configured walk test is steady, actual test pulses approx 1/8 seconds and a normal fire suspends it until reset',()=>{
 let s=configure(fresh(),'test','Z1');assert.equal(v(s).zones[0].statusState,'on');assert.equal(v(s).leds.find(x=>x.id==='test').state,'on');
 s=input(s,'Z1','alarm');assert.equal(v(s).walkTestActive,true);assert.equal(v(s).soundersActive,true);assert.equal(v(s).zones[0].statusState,'flashing');assert.equal(v(s).outputs.remote,false);assert.equal(v(s).outputs.auxiliary,false);
 s=advanceConventionalTime(model,s,1);assert.equal(v(s).soundersActive,false);s=advanceConventionalTime(model,s,8);assert.equal(v(s).soundersActive,true);
 s=input(s,'Z2','alarm');assert.equal(v(s).walkTestSuspended,true);assert.equal(v(s).soundersActive,true);assert.equal(v(s).outputs.remote,true);s=input(s,'Z2','normal');assert.equal(v(s).walkTestSuspended,true);
 s=key(s,'KEYSWITCH','SOUNDERS','RESET');assert.equal(v(s).walkTestSuspended,false);assert.equal(v(s).walkTestActive,true);s=input(s,'Z1','normal');assert.equal(v(s).status.fire,false);assert.equal(v(s).zones[0].statusState,'on');assert.deepEqual(s.testZones,['Z1']);
});
test('engineering test selection uses internal function lamp; front test status reflects committed test configuration',()=>{
 let s=enter(fresh(),'test');assert.equal(v(s).engineering.functions.find(x=>x.id==='test').state,'flashing');assert.equal(v(s).leds.find(x=>x.id==='test').state,'off');s=key(s,'NEXT_OPTION','TOGGLE','NEXT_OPTION');assert.equal(v(s).leds.find(x=>x.id==='test').state,'on');assert.equal(v(s).walkTestActive,false);
});
test('read-only diagnostic maps retain exact injected faults and do not turn unknown faults into open or short',()=>{
 let s=input(fresh(),'Z1','fault');s=input(s,'Z2','fault','open');s=input(s,'Z4','fault','short');s=enter(s,'open-circuit');assert.deepEqual(v(s).engineering.diagnosticZones,['Z2']);assert.equal(v(s).zones[0].statusState,'off');const cfg=structuredClone(s.settings);s=key(s,'TOGGLE');assert.equal(s.lastAction.ok,false);assert.deepEqual(s.settings,cfg);s=key(s,'ENGINEER');assert.deepEqual(v(s).engineering.diagnosticZones,['Z4']);s=key(s,'EXIT');assert.equal(v(s).zones[0].fault,true);assert.equal(s.inputs.Z2.faultType,'open');
 s=setConventionalInput(model,s,{type:'system-fault',fault:'pll',active:true});s=enter(s,'system-fault');assert.deepEqual(v(s).engineering.diagnosticZones,['Z3']);s=setConventionalInput(model,s,{type:'repeater-fault',repeater:7,active:true});s=key(s,'ENGINEER');assert.deepEqual(v(s).engineering.diagnosticZones,['Z7']);
});
test('source-scoped monitoring suppression in test preserves the fictional fault and restores its indication afterwards',()=>{
 let s=configure(fresh(),'test','Z1');s=input(s,'Z1','fault','open');assert.equal(s.inputs.Z1.fault,true);assert.equal(v(s).status.fault,false);assert.equal(v(s).status.normal,false);s=configure(s,'test','Z1',false);assert.equal(v(s).status.fault,true);assert.equal(s.inputs.Z1.faultType,'open');
});
test('sounder resound is an immediate setting with distinct flash pattern and affects later alarms',()=>{
 let s=enter(fresh(),'sounder-status');assert.equal(v(s).engineering.functions.at(-1).flashPattern,'triple');s=key(s,'TOGGLE');assert.equal(s.settings.resoundNewZone,false);assert.equal(v(s).engineering.functions.at(-1).flashPattern,'equal');s=key(s,'EXIT','KEYSWITCH');s=input(s,'Z1','alarm');s=key(s,'SOUNDERS');s=input(s,'Z2','alarm');assert.equal(v(s).soundersActive,false);assert.equal(v(s).status.fire,true);
});
test('new engineering records persist with cover closed, while old records receive safe defaults and Sigma remains separate',()=>{
 let s=configure(fresh(),'nonlatching','Z2');s=configure(s,'test','Z3');s=key(enter(s,'delays'),'NEXT_OPTION','TOGGLE');s=setConventionalCover(model,s,false);const restored=restoreConventionalState(model,s);assert.equal(restored.coverOpen,false);assert.deepEqual(restored.engineering,s.engineering);assert.deepEqual(restored.settings,s.settings);assert.deepEqual(restored.testZones,['Z3']);assert.equal(evaluateConventionalConditions(model,restored,{engineeringActive:true,engineeringFunction:'delays',engineeringDraftEnabled:true}),true);
 const old={...s};delete old.cfpEngineeringVersion;const migrated=restoreConventionalState(model,old);assert.equal(migrated.engineering,null);assert.equal(migrated.coverOpen,false);assert.deepEqual(migrated.testZones,[]);assert.deepEqual(migrated.settings.nonLatchingZones,[]);assert.equal(migrated.settings.delayMinutes,1);assert.deepEqual(restoreConventionalState(sigma,s),createConventionalState(sigma));
 const malformed={...s,settings:{...s.settings,delayMinutes:Infinity,coincidencePairs:['Z1-Z99'],delayedOutputs:['mains'],nonLatchingZones:['Z99']},engineering:{functionId:'invented'}};const safe=restoreConventionalState(model,malformed);assert.equal(safe.settings.delayMinutes,1);assert.deepEqual(safe.settings.delayedOutputs,[]);assert.equal(safe.engineering,null);
});
