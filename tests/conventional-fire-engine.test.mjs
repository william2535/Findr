import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildConventionalModel,createConventionalState,pressConventionalKey,releaseConventionalKey,selectConventionalMode,setConventionalInput,loadConventionalScenario,conventionalView,restoreConventionalState,leaveConventional,nextConventionalHint,evaluateConventionalConditions,advanceConventionalTest,setConventionalCover,setConventionalDelay,advanceConventionalTime} from '../public/app/conventional-fire-engine.mjs';
const cfp=buildConventionalModel({id:'c-tec-cfp-standard',title:'CFP Standard synthetic test fixture',zoneCount:8,physicalKeys:['KEY_1','EXIT','NEXT_OPTION','TOGGLE','BUZZER','SOUNDERS','RESET','KEYSWITCH'].map(id=>({id,label:id,sourceRefs:[{sourceId:'synthetic-test-ref',pages:[6]}]})),indicators:['supply-present','general-fire','general-fault','accessed','general-disablement','power-supply-fault','sounder-status','remote-output','remote-output-status','auxiliary-output-status','fault-output-status'].map(id=>({id,label:id})),scenarios:[{id:'normal'},{id:'fire-zone-1'},{id:'zone-fault'},{id:'power-fault'},{id:'sounder-fault'},{id:'disabled-zone'}],lessons:[{id:'key-access',steps:[{instruction:'Turn the fictional key',expectedKeys:['KEYSWITCH'],conditions:{accessEnabled:true},sourceRefs:[{sourceId:'synthetic-test-ref',pages:[6]}]}]}]});
const sigma=buildConventionalModel({...cfp,id:'kentec-sigma-cp',title:'Sigma CP synthetic test fixture',physicalKeys:['BUZZER','SOUNDERS','RESET','LAMP_TEST','MODE','SELECT','ENTER','KEYSWITCH'].map(id=>({id,label:id})),indicators:['power-on','general-fire','general-fault','general-disablement','power-fault','sounder-fault-disablement','test-mode-on'].map(id=>({id,label:id})),lessons:[]});
const start=(m,id='normal')=>createConventionalState(m,{scenarioId:id});
const press=(m,s,...keys)=>keys.reduce((s,key)=>pressConventionalKey(m,s,key),s);
const view=(m,s)=>conventionalView(m,s);
const enabled=(m,s=start(m))=>press(m,s,'KEYSWITCH');
const begin=(s)=>pressConventionalKey(cfp,s,'NEXT_OPTION',{heldMs:3000});
function option(s,id){s=begin(s);for(let i=0;i<13&&view(cfp,s).selection?.option!==id;i++)s=press(cfp,s,'NEXT_OPTION');assert.equal(view(cfp,s).selection?.option,id);return s;}
const freeze=o=>{if(o&&typeof o==='object'){Object.freeze(o);Object.values(o).forEach(freeze);}return o;};

test('models validate exact physical keys and do not accept configured delay simulation',()=>{
 assert.equal(cfp.physicalKeys.length,8);assert.equal(cfp.zones.length,8);
 assert.throws(()=>buildConventionalModel({...cfp,physicalKeys:[...cfp.physicalKeys,{id:'ENGINEER'}]}),/Physical keys/);
 assert.throws(()=>buildConventionalModel({...sigma,fixture:{delaysConfigured:true}}),/outside/);
 assert.throws(()=>buildConventionalModel({...cfp,id:'lookalike'}),/Unsupported/);
});
test('CFP physical 2143 sequence uses numbered EXIT/KEY_1/TOGGLE/NEXT_OPTION, not alarm buttons',()=>{
 let s=start(cfp);s=press(cfp,s,'SOUNDERS','RESET');assert.equal(view(cfp,s).accessEnabled,false);assert.equal(s.codeBuffer,'');
 s=press(cfp,s,'KEY_1','KEY_1','KEY_1','KEY_1');assert.equal(s.codeBuffer,'');assert.equal(view(cfp,s).accessEnabled,false);
 s=press(cfp,s,'EXIT','KEY_1','TOGGLE');assert.equal(s.codeBuffer,'214');assert.equal(s.lampTest,false);s=press(cfp,s,'NEXT_OPTION');assert.equal(view(cfp,s).accessEnabled,true);assert.equal(s.selection,null);
 s=press(cfp,s,'EXIT');assert.equal(view(cfp,s).accessEnabled,false);
});
test('buzzer acknowledgement never silences alarm sounders or clears alarm indications',()=>{
 for(const m of [cfp,sigma]){let s=start(m,'fire-zone-1');assert.equal(view(m,s).soundersActive,true);s=press(m,s,'BUZZER');assert.equal(view(m,s).soundersActive,true);assert.equal(view(m,s).buzzerActive,false);assert.equal(view(m,s).zones[0].fireState,'flashing');assert.equal(s.inputs.Z1.alarm,true);}
});
test('CFP lamp test is gated while Sigma lamp test works at level one; release/reload stops a held test',()=>{
 let s=press(cfp,start(cfp),'TOGGLE');assert.equal(s.lampTest,false);s=press(cfp,enabled(cfp),'TOGGLE');assert.equal(s.lampTest,true);assert.equal(view(cfp,s).zones.every(z=>z.fireState==='on'),true);s=releaseConventionalKey(cfp,s,'TOGGLE');assert.equal(s.lampTest,false);
 s=press(sigma,start(sigma),'LAMP_TEST');assert.equal(s.lampTest,true);assert.equal(view(sigma,s).buzzerActive,true);assert.equal(restoreConventionalState(sigma,s).lampTest,false);assert.equal(leaveConventional(sigma,s).lampTest,false);
});
test('CFP Next Option requires real hold duration and stages changes until confirmation',()=>{
 const before=freeze(enabled(cfp));let s=pressConventionalKey(cfp,before,'NEXT_OPTION',{heldMs:2999});assert.equal(s.selection,null);assert.equal(before.selection,null);
 s=begin(s);assert.equal(view(cfp,s).selection.option,'Z1');s=press(cfp,s,'TOGGLE');assert.equal(s.selection.draftDisabled,true);assert.deepEqual(s.disabledZones,[]);assert.equal(view(cfp,s).zones[0].selectionRate,'same');s=press(cfp,s,'NEXT_OPTION');assert.deepEqual(s.disabledZones,['Z1']);assert.equal(view(cfp,s).selection.option,'Z2');s=press(cfp,s,'TOGGLE','KEYSWITCH');assert.deepEqual(s.disabledZones,['Z1']);assert.equal(s.selection,null);assert.equal(view(cfp,s).accessEnabled,false);
});
test('CFP output cycle is zones then fault, remote, sounders and auxiliary; no unconfigured delays',()=>{
 let s=begin(enabled(cfp));const sequence=[];while(s.selection){sequence.push(view(cfp,s).selection.option);s=press(cfp,s,'NEXT_OPTION');}
 assert.deepEqual(sequence,['Z1','Z2','Z3','Z4','Z5','Z6','Z7','Z8','fault','remote','sounders','auxiliary']);
});
test('CFP disabled zones suppress new alarms/faults but original physical inputs are preserved',()=>{
 let s=press(cfp,begin(enabled(cfp)),'TOGGLE','NEXT_OPTION','KEYSWITCH');s=setConventionalInput(cfp,s,{zoneId:'Z1',state:'alarm'});assert.equal(view(cfp,s).status.fire,false);assert.equal(s.inputs.Z1.alarm,true);s=setConventionalInput(cfp,s,{zoneId:'Z1',state:'fault'});assert.equal(view(cfp,s).status.fault,false);
 s=press(cfp,begin(press(cfp,s,'KEYSWITCH')),'TOGGLE','NEXT_OPTION','KEYSWITCH');assert.equal(view(cfp,s).status.fault,true);assert.deepEqual(s.disabledZones,[]);
});
test('CFP manual evacuation does not activate remote/auxiliary fire outputs',()=>{
 let s=press(cfp,enabled(cfp),'SOUNDERS');assert.equal(view(cfp,s).soundersActive,true);assert.equal(view(cfp,s).outputs.remote,false);assert.equal(view(cfp,s).outputs.auxiliary,false);assert.deepEqual(s.fireZones,[]);assert.equal(view(cfp,s).status.fire,true);s=press(cfp,s,'SOUNDERS','RESET');assert.equal(view(cfp,s).status.normal,true);
});
test('CFP silence keeps auxiliary output and latched indications, new zone resounds with prior zone steady',()=>{
 let s=press(cfp,enabled(cfp,start(cfp,'fire-zone-1')),'SOUNDERS');assert.equal(view(cfp,s).outputs.remote,false);assert.equal(view(cfp,s).outputs.auxiliary,true);assert.equal(view(cfp,s).zones[0].fireState,'on');s=setConventionalInput(cfp,s,{zoneId:'Z2',state:'alarm'});assert.equal(view(cfp,s).soundersActive,true);assert.equal(view(cfp,s).zones[0].fireState,'on');assert.equal(view(cfp,s).zones[1].fireState,'flashing');
});
test('CFP reset requires silence and does not clear persistent alarm or fault inputs',()=>{
 let s=enabled(cfp,start(cfp,'fire-zone-1'));s=press(cfp,s,'RESET');assert.equal(s.lastAction.ok,false);assert.equal(s.fireZones.length,1);s=press(cfp,s,'SOUNDERS','RESET');assert.equal(s.inputs.Z1.alarm,true);assert.equal(view(cfp,s).soundersActive,true);
 s=setConventionalInput(cfp,s,{zoneId:'Z1',state:'normal'});assert.equal(view(cfp,s).status.fire,true);s=press(cfp,s,'SOUNDERS','RESET');assert.equal(view(cfp,s).status.normal,true);
 s=enabled(cfp,start(cfp,'power-fault'));s=press(cfp,s,'BUZZER','RESET');assert.equal(view(cfp,s).status.fault,true);assert.equal(view(cfp,s).buzzerActive,true);assert.equal(s.faults.power,true);
});
test('disabled sounders cannot be implicitly reenabled with SOUNDERS or RESET',()=>{
 let s=option(enabled(cfp),'sounders');s=press(cfp,s,'TOGGLE','NEXT_OPTION','KEYSWITCH');s=setConventionalInput(cfp,s,{zoneId:'Z1',state:'alarm'});assert.equal(view(cfp,s).soundersActive,false);s=press(cfp,press(cfp,s,'KEYSWITCH'),'SOUNDERS');assert.equal(s.lastAction.ok,false);assert.ok(s.disabledOutputs.includes('sounders'));
});
test('Sigma MODE exposes a limitation and target assist, never an invented cycle',()=>{
 let s=enabled(sigma);s=press(sigma,s,'MODE');assert.equal(s.sigmaMode,null);assert.equal(view(sigma,s).modeChooser,true);assert.equal(s.lastAction.kind,'mode-help');s=press(sigma,s,'MODE');assert.equal(s.sigmaMode,null);s=selectConventionalMode(sigma,s,'d');assert.equal(s.sigmaMode,'d');assert.equal(s.lastAction.kind,'mode-target');assert.match(s.lastAction.message,/not a physical MODE/);assert.equal(selectConventionalMode(sigma,start(sigma),'d').lastAction.ok,false);assert.equal(selectConventionalMode(cfp,enabled(cfp),'d').lastAction.ok,false);
});
test('Sigma d SELECT/ENTER uses actual zonal disable toggle and retains active source until reset',()=>{
 let s=selectConventionalMode(sigma,enabled(sigma),'d');s=press(sigma,s,'SELECT','ENTER');assert.deepEqual(s.disabledZones,['Z2']);assert.equal(view(sigma,s).display,'d2');assert.equal(view(sigma,s).displayDot,true);s=setConventionalInput(sigma,s,{zoneId:'Z2',state:'alarm'});assert.equal(view(sigma,s).status.fire,false);s=press(sigma,s,'ENTER');assert.equal(view(sigma,s).status.fire,true);assert.equal(view(sigma,s).soundersActive,true);assert.equal(s.inputs.Z2.alarm,true);
});
test('Sigma db has direct enter commit and Ad remains unconfigured reference only',()=>{
 let s=selectConventionalMode(sigma,enabled(sigma),'db');s=press(sigma,s,'ENTER');assert.deepEqual(s.disabledOutputs,['sounders']);assert.equal(view(sigma,s).displayDot,true);s=press(sigma,s,'ENTER');assert.deepEqual(s.disabledOutputs,[]);s=selectConventionalMode(sigma,s,'Ad');const before=copyProtection(s);s=press(sigma,s,'ENTER');assert.equal(s.lastAction.ok,false);assert.deepEqual(copyProtection(s),before);
});
function copyProtection(s){return structuredClone({inputs:s.inputs,fireZones:s.fireZones,faults:s.faults,disabledZones:s.disabledZones,disabledOutputs:s.disabledOutputs,testZones:s.testZones,soundersRequested:s.soundersRequested});}
test('Sigma zone tests retain test mode until explicit exit; automatic reset is an untimed demonstration only',()=>{
 let s=selectConventionalMode(sigma,enabled(sigma),'t');s=press(sigma,s,'ENTER');assert.deepEqual(s.testZones,['Z1']);s=setConventionalInput(sigma,s,{zoneId:'Z1',state:'alarm'});s=advanceConventionalTest(sigma,s);assert.equal(s.lastAction.ok,false);assert.equal(view(sigma,s).status.fire,true);s=setConventionalInput(sigma,s,{zoneId:'Z1',state:'normal'});s=advanceConventionalTest(sigma,s);assert.equal(s.lastAction.ok,true);assert.equal(view(sigma,s).status.fire,false);assert.equal(view(sigma,s).status.normal,false);assert.deepEqual(s.testZones,['Z1']);s=press(sigma,s,'ENTER');assert.equal(view(sigma,s).status.normal,true);assert.equal(advanceConventionalTest(cfp,start(cfp)).lastAction.ok,false);
});
test('Sigma reset keeps active inputs, test flags and disablements; key off does not restore them',()=>{
 let s=selectConventionalMode(sigma,enabled(sigma),'t');s=press(sigma,s,'ENTER');s=selectConventionalMode(sigma,s,'db');s=press(sigma,s,'ENTER');s=setConventionalInput(sigma,s,{zoneId:'Z2',state:'alarm'});s=press(sigma,s,'RESET','KEYSWITCH');assert.deepEqual(s.testZones,['Z1']);assert.deepEqual(s.disabledOutputs,['sounders']);assert.deepEqual(s.fireZones,['Z2']);assert.equal(view(sigma,s).accessEnabled,false);assert.equal(view(sigma,s).status.normal,false);
});
test('restore is profile scoped, validates arrays, preserves selected drafts and raw fictional inputs without changing source',()=>{
 let s=press(cfp,begin(enabled(cfp)),'TOGGLE');const original=structuredClone(s);const restored=restoreConventionalState(cfp,freeze(s));assert.deepEqual(s,original);assert.equal(restored.selection.draftDisabled,true);assert.deepEqual(restored.disabledZones,[]);
 const malformed={...original,cfpEngineeringVersion:undefined,disabledZones:['Z1','Z1','Z99'],disabledOutputs:['sounders','unknown'],testZones:['Z1'],selection:{index:999,draftDisabled:true},inputs:{Z1:{alarm:'true',fault:true}}};const result=restoreConventionalState(cfp,malformed);assert.deepEqual(result.disabledZones,['Z1']);assert.deepEqual(result.disabledOutputs,['sounders']);assert.deepEqual(result.testZones,[]);assert.equal(result.inputs.Z1.alarm,false);assert.equal(result.selection,null);assert.deepEqual(restoreConventionalState(sigma,original),start(sigma));
});
test('hints are pure, retain page evidence, and require explicit progression even when endpoints coincide',()=>{
 const s=freeze(start(cfp)),before=JSON.stringify(s),h=nextConventionalHint(cfp,s,{lessonId:'key-access',stepIndex:0});assert.equal(h.key,'KEYSWITCH');assert.equal(h.conditionsMet,false);assert.equal(h.done,false);assert.deepEqual(h.sourceRefs,[{sourceId:'synthetic-test-ref',pages:[6]}]);assert.equal(JSON.stringify(s),before);assert.equal(nextConventionalHint(cfp,enabled(cfp),{lessonId:'key-access',stepIndex:0}).done,false);assert.equal(nextConventionalHint(cfp,enabled(cfp),{lessonId:'key-access',stepIndex:1}).done,true);assert.equal(evaluateConventionalConditions(cfp,s,{inventedPermission:true}),false);
});


test('CFP alarm with disabled sounders can reset after clearing the input without an impossible sounder action',()=>{
 let s=option(enabled(cfp),'sounders');s=press(cfp,s,'TOGGLE','NEXT_OPTION','KEYSWITCH');s=setConventionalInput(cfp,s,{zoneId:'Z1',state:'alarm'});s=press(cfp,s,'KEYSWITCH');assert.equal(view(cfp,s).soundersActive,false);s=press(cfp,s,'RESET');assert.equal(s.lastAction.ok,true);assert.equal(view(cfp,s).status.fire,true);s=setConventionalInput(cfp,s,{zoneId:'Z1',state:'normal'});s=press(cfp,s,'RESET');assert.equal(view(cfp,s).status.fire,false);assert.deepEqual(s.disabledOutputs,['sounders']);assert.equal(view(cfp,s).status.normal,false);
});
const reviewedData=JSON.parse(readFileSync(new URL('../public/app/data/conventional-fire.json',import.meta.url)));
test('all reviewed lesson steps work through explicit keys and labelled input/mode training assists',()=>{
 for(const profile of reviewedData.profiles){const m=buildConventionalModel(reviewedData,profile.id);for(const lesson of m.lessons){let s=start(m,lesson.scenarioId);for(let i=0;i<lesson.steps.length;i++){const step=lesson.steps[i],hint=nextConventionalHint(m,s,{lessonId:lesson.id,stepIndex:i});assert.equal(hint.done,false);assert.ok(hint.sourceRefs.length,lesson.id+'/'+step.id+' source');if(step.expectedKeys){for(const key of step.expectedKeys)s=pressConventionalKey(m,s,key,{heldMs:step.holdMs||0});}else if(step.expectedMode)s=selectConventionalMode(m,s,step.expectedMode);else if(step.expectedInput)s=setConventionalInput(m,s,step.expectedInput);else if(typeof step.expectedCover==='boolean')s=setConventionalCover(m,s,step.expectedCover);else if(step.expectedDelayMinutes!==undefined)s=setConventionalDelay(m,s,step.expectedDelayMinutes);else if(step.expectedAction==='advance-test')s=advanceConventionalTest(m,s);else assert.fail('Unsupported lesson action '+lesson.id+'/'+step.id);assert.equal(s.lastAction.ok,true,lesson.id+'/'+step.id+': '+s.lastAction.message);assert.equal(evaluateConventionalConditions(m,s,step.conditions),true,lesson.id+'/'+step.id+' conditions');}assert.equal(nextConventionalHint(m,s,{lessonId:lesson.id,stepIndex:lesson.steps.length}).done,true);}}
});
test('reviewed source indicator IDs carry actual source-backed states and panel-specific common lamps',()=>{
 const c=buildConventionalModel(reviewedData,'c-tec-cfp-standard'),k=buildConventionalModel(reviewedData,'kentec-sigma-cp');
 let s=start(c,'fire-zone-1'),leds=Object.fromEntries(view(c,s).leds.map(l=>[l.id,l.state]));assert.equal(leds.fire,'flashing');assert.equal(leds['remote-output'],'on');s=begin(enabled(c));leds=Object.fromEntries(view(c,s).leds.map(l=>[l.id,l.state]));assert.equal(leds['general-disablement'],'flashing');
 s=option(enabled(c),'remote');s=press(c,s,'TOGGLE','NEXT_OPTION','KEYSWITCH');leds=Object.fromEntries(view(c,s).leds.map(l=>[l.id,l.state]));assert.equal(leds['remote-output-status'],'on');
 s=option(enabled(c),'sounders');assert.equal(view(c,s).leds.find(l=>l.id==='sounder-fault').selectionRate,'slower');s=press(c,s,'TOGGLE');assert.equal(view(c,s).leds.find(l=>l.id==='sounder-fault').selectionRate,'same');
 leds=Object.fromEntries(view(k,start(k,'fire-zone-1')).leds.map(l=>[l.id,l.state]));assert.equal(leds.fire,'on');leds=Object.fromEntries(view(k,start(k,'power-fault')).leds.map(l=>[l.id,l.state]));assert.equal(leds.fault,'on');assert.equal(leds['power-fault'],'flashing');
});
test('Sigma active-disabled warning is scoped to the explicit reviewed software fixture',()=>{
 const m=buildConventionalModel(reviewedData,'kentec-sigma-cp');let s=selectConventionalMode(m,enabled(m),'d');s=press(m,s,'ENTER');s=setConventionalInput(m,s,{zoneId:'Z1',state:'alarm'});assert.equal(view(m,s).displayDigitFlashing,true);const older=buildConventionalModel({...m,fixture:{...m.fixture,activeDisabledWarning:false}});assert.equal(view(older,s).displayDigitFlashing,false);
});
