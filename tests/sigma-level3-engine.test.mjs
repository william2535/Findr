import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildConventionalModel,createConventionalState,pressConventionalKey,setConventionalCover,selectSigmaConfiguration,resetSigmaConfiguration,setConventionalInput,selectConventionalMode,advanceConventionalTime,conventionalView,restoreConventionalState,evaluateConventionalConditions} from '../public/app/conventional-fire-engine.mjs';
const data=JSON.parse(readFileSync(new URL('../public/app/data/conventional-fire.json',import.meta.url)));
const model=buildConventionalModel(data,'kentec-sigma-cp'),cfp=buildConventionalModel(data,'c-tec-cfp-standard');
const fresh=()=>createConventionalState(model),view=s=>conventionalView(model,s),key=(s,...keys)=>keys.reduce((value,key)=>pressConventionalKey(model,value,key),s);
const input=(s,zone,state,alarmKind='detector')=>setConventionalInput(model,s,{zoneId:zone,state,alarmKind});
const diagnostic=(s,fault,active)=>setConventionalInput(model,s,{type:'sigma-diagnostic',fault,active});
const open=s=>setConventionalCover(model,s,true);
const enter=s=>s.writeEnabled?s:key(open(s),'WRITE_ENABLE');
function configure(s,code){s=enter(s);s=selectSigmaConfiguration(model,s,code);assert.equal(s.lastAction.ok,true);s=key(s,'ENTER');assert.equal(s.lastAction.ok,true,code+': '+s.lastAction.message);return s;}
const exit=s=>s.writeEnabled?key(s,'WRITE_ENABLE'):s;
const freeze=o=>{if(o&&typeof o==='object'){Object.freeze(o);Object.values(o).forEach(freeze);}return o;};

test('Sigma cover and Write Enable are separate; neither creates undocumented operator access or a lid interlock',()=>{
 let s=fresh();assert.equal(key(s,'WRITE_ENABLE').lastAction.ok,false);s=open(s);assert.equal(view(s).accessLevel,1);s=key(s,'WRITE_ENABLE');assert.equal(s.writeEnabled,true);assert.equal(view(s).accessLevel,3);assert.equal(view(s).keys.find(k=>k.id==='MODE').enabled,true);assert.equal(view(s).keys.find(k=>k.id==='RESET').enabled,false);assert.equal(key(s,'RESET').lastAction.ok,false);
 s=setConventionalCover(model,s,false);assert.equal(s.writeEnabled,true);assert.equal(view(s).status.fault,true);assert.equal(view(s).internalKeys.find(k=>k.id==='WRITE_ENABLE').enabled,false);assert.equal(key(s,'WRITE_ENABLE').lastAction.ok,false);
 s=key(open(s),'WRITE_ENABLE');assert.equal(view(s).accessLevel,1);assert.equal(view(s).status.normal,true);assert.equal(pressConventionalKey(cfp,setConventionalCover(cfp,createConventionalState(cfp),true),'WRITE_ENABLE').lastAction.ok,false);
});
test('Sigma +10/+1 selects numeric displays; Enter sets and reviews a flashing units dot without inventing an unset toggle',()=>{
 let s=enter(fresh());s=key(s,'MODE','MODE','SELECT');assert.equal(view(s).display,'21');assert.equal(view(s).displayDot,false);s=key(s,'ENTER');assert.equal(view(s).displayDot,true);assert.equal(view(s).engineering.codeDot,'flashing');assert.ok(s.sigmaConfig.codes.includes('21'));const before=structuredClone(s.sigmaConfig);s=key(s,'ENTER');assert.deepEqual(s.sigmaConfig,before);assert.match(s.lastAction.message,/No undocumented unset/);
 s=key(s,'SELECT');assert.equal(view(s).display,'22');assert.equal(view(s).displayDot,false);s=selectSigmaConfiguration(model,s,'21');assert.equal(view(s).displayDot,true);
});
test('undocumented wraps, blank codes and conditional catalogue entries cannot become fabricated settings',()=>{
 let s=enter(fresh());s=selectSigmaConfiguration(model,s,'99');s=key(s,'SELECT');assert.equal(s.lastAction.ok,false);assert.equal(view(s).display,'99');s=key(s,'MODE');assert.equal(s.lastAction.ok,false);assert.equal(view(s).display,'99');
 s=selectSigmaConfiguration(model,s,'20');assert.equal(s.lastAction.ok,true);s=key(s,'ENTER');assert.equal(s.lastAction.ok,false);assert.ok(!s.sigmaConfig.codes.includes('20'));
 for(const code of ['11','25','2A','51','61','71','A1','C1','E1']){s=selectSigmaConfiguration(model,s,code);assert.equal(s.lastAction.ok,true,code);const before=structuredClone(s.sigmaConfig);s=key(s,'ENTER');assert.equal(s.lastAction.ok,false,code);assert.deepEqual(s.sigmaConfig,before,code);}
 s=selectSigmaConfiguration(model,s,'E1');s=key(s,'SELECT');assert.equal(s.lastAction.ok,false);assert.equal(view(s).display,'E1');
});
test('every implemented configuration can be set and re-read, while the full reference-only catalogue remains blocked',()=>{
 for(const option of model.engineering.configurationCodes){let s=selectSigmaConfiguration(model,enter(fresh()),option.code);s=key(s,'ENTER');assert.equal(s.lastAction.ok,option.status==='implemented',option.code);assert.equal(view(s).displayDot,option.status==='implemented',option.code);}
});
test('code 29 retains silenced sounders on a new zone; normal sounding and fire indications remain explicit',()=>{
 let s=exit(configure(fresh(),'29'));s=key(s,'KEYSWITCH');s=input(s,'Z1','alarm');s=key(s,'SOUNDERS');assert.equal(view(s).soundersActive,false);assert.equal(view(s).outputs.localFireRelay,false);s=input(s,'Z2','alarm');assert.equal(view(s).soundersActive,false);assert.equal(view(s).outputs.localFireRelay,true,'Code 29 does not suppress fresh-zone local relay operation');assert.equal(view(s).status.fire,true);assert.equal(view(s).zones[1].fireState,'flashing');s=key(s,'SOUNDERS');assert.equal(view(s).soundersActive,true);
});
test('programmed inhibits stay visible in the separate training status without inventing a panel disablement lamp',()=>{
 let s=exit(configure(fresh(),'21'));assert.equal(view(s).status.normal,false);assert.equal(view(s).status.configuration,true);assert.match(view(s).status.summary,/configuration remains/);assert.equal(view(s).leds.find(l=>l.id==='disablement').state,'off');s=input(s,'Z1','alarm');assert.equal(view(s).buzzerActive,false);assert.equal(view(s).soundersActive,true);s=diagnostic(s,'mains-fail',true);assert.equal(view(s).buzzerActive,true);
});
test('code 22 suppresses ordinary fault relay operation and code 26 inhibits fire relay without deleting the conditions',()=>{
 let s=exit(configure(fresh(),'22'));s=diagnostic(s,'mains-fail',true);assert.equal(view(s).status.fault,true);assert.equal(view(s).outputs.fault,false);assert.equal(view(s).leds.find(l=>l.id==='power-fault').state,'flashing');
 s=exit(configure(fresh(),'26'));s=input(s,'Z1','alarm');assert.equal(view(s).outputs.fireRelay,false);assert.equal(view(s).outputs.localFireRelay,true);assert.equal(view(s).soundersActive,true);
});
test('common sounder inhibition and configured delay do not incorrectly inhibit the independent local fire relay',()=>{
 let s=exit(configure(fresh(),'91'));s=input(s,'Z1','alarm');assert.equal(view(s).soundersActive,false);assert.equal(view(s).outputs.localFireRelay,true);assert.equal(view(s).outputs.fireRelay,true);
 s=key(s,'KEYSWITCH');s=selectConventionalMode(model,s,'db');s=key(s,'ENTER');assert.equal(view(s).outputs.localFireRelay,true,'Sounder disablement alone does not silence local fire relay');
});
test('earth monitoring disable retains the raw fictional earth cause without asserting a repaired circuit',()=>{
 let s=exit(configure(fresh(),'23'));s=diagnostic(s,'earth',true);assert.deepEqual(s.sigmaDiagnostics.active,['earth']);assert.equal(view(s).status.fault,false);assert.equal(view(s).sigmaDiagnostics.indicators.find(x=>x.id==='earth').on,false);s=resetSigmaConfiguration(model,s);assert.equal(view(s).status.fault,true);assert.deepEqual(s.sigmaDiagnostics.active,['earth']);
});
test('detector and call-point delay selection requires a period and Ad; elapsed time is an explicit training input',()=>{
 let s=exit(configure(configure(fresh(),'01'),'31'));s=key(s,'KEYSWITCH');s=selectConventionalMode(model,s,'Ad');s=key(s,'ENTER');assert.equal(s.sigmaConfig.delaysEnabled,true);s=input(s,'Z1','alarm');assert.equal(view(s).status.fire,true);assert.equal(view(s).soundersActive,false);assert.equal(view(s).outputs.fireRelay,true);assert.equal(view(s).outputs.localFireRelay,true);assert.equal(view(s).delayPending,true);s=advanceConventionalTime(model,s,59);assert.equal(view(s).soundersActive,false);s=advanceConventionalTime(model,s,1);assert.equal(view(s).soundersActive,true);assert.equal(view(s).delayPending,false);
 let cp=exit(configure(configure(fresh(),'01'),'31'));cp=key(cp,'KEYSWITCH');cp=key(selectConventionalMode(model,cp,'Ad'),'ENTER');cp=input(cp,'Z1','alarm','call-point');assert.equal(view(cp).soundersActive,true,'Detector-only delay does not delay call points');
 let separate=exit(configure(configure(fresh(),'00'),'41'));separate=key(separate,'KEYSWITCH');separate=key(selectConventionalMode(model,separate,'Ad'),'ENTER');separate=input(separate,'Z1','alarm','call-point');assert.equal(view(separate).soundersActive,false);separate=advanceConventionalTime(model,separate,30);assert.equal(view(separate).soundersActive,true);
});
test('non-latching zone retains the documented upper-bound training delay and cannot clear an active input',()=>{
 let s=exit(configure(fresh(),'81'));s=input(s,'Z1','alarm');s=advanceConventionalTime(model,s,30);assert.equal(view(s).status.fire,true);s=input(s,'Z1','normal');assert.equal(view(s).status.fire,true);s=advanceConventionalTime(model,s,19);assert.equal(view(s).status.fire,true);s=advanceConventionalTime(model,s,1);assert.equal(view(s).status.fire,false);assert.match(s.lastAction.message,/upper-bound demonstration/);
});
test('CPU/watchdog remains latched and unsilenceable until the named internal reset after the synthetic cause clears',()=>{
 let s=diagnostic(fresh(),'cpu',true);s=key(s,'BUZZER');assert.equal(s.lastAction.ok,false);assert.equal(s.buzzerSilenced,false);assert.equal(view(s).leds.find(l=>l.id==='buzzer-silenced').state,'off');assert.match(s.lastAction.message,/cannot be silenced/);s=key(s,'KEYSWITCH','RESET');assert.equal(view(s).buzzerActive,true);assert.equal(view(s).status.fault,true);assert.equal(view(s).leds.find(l=>l.id==='system-fault').state,'flashing');assert.equal(key(s,'WATCHDOG_RESET').lastAction.ok,false);s=open(s);s=key(s,'WATCHDOG_RESET');assert.equal(s.sigmaDiagnostics.cpuLatched,true);s=diagnostic(s,'cpu',false);assert.equal(s.sigmaDiagnostics.cpuLatched,true);s=key(s,'WATCHDOG_RESET');assert.equal(s.sigmaDiagnostics.cpuLatched,false);assert.equal(view(s).buzzerActive,false);
});
test('fictional device work checkpoint does not add an addressed device, fix a fault or silently restore a zone',()=>{
 let s=key(fresh(),'KEYSWITCH');s=key(selectConventionalMode(model,s,'d'),'ENTER');s=input(s,'Z1','fault');const before=structuredClone({inputs:s.inputs,disabled:s.disabledZones,tests:s.testZones});s=setConventionalInput(model,s,{type:'checkpoint',id:'detector-work'});assert.deepEqual({inputs:s.inputs,disabled:s.disabledZones,tests:s.testZones},before);assert.equal(evaluateConventionalConditions(model,s,{checkpoint:'detector-work'}),true);assert.equal('devices' in s,false);assert.match(s.lastAction.message,/not a panel action/);
});
test('training configuration restore preserves zone impairments, test flags and inputs while clearing only simulated configuration',()=>{
 let s=exit(configure(fresh(),'29'));s=key(s,'KEYSWITCH');s=key(selectConventionalMode(model,s,'d'),'ENTER');s=key(selectConventionalMode(model,s,'t'),'SELECT','ENTER');s=input(s,'Z3','fault');const before=structuredClone({disabled:s.disabledZones,tests:s.testZones,inputs:s.inputs});s=resetSigmaConfiguration(model,s);assert.deepEqual(s.sigmaConfig,{codes:['10'],delaysEnabled:false});assert.deepEqual({disabled:s.disabledZones,tests:s.testZones,inputs:s.inputs},before);assert.match(s.lastAction.message,/not a documented physical code-clear/);
});
test('legacy v1 state gains independent Sigma defaults; active write state, settings and raw inputs survive a validated reload',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/sigma-level3/synthetic-0.20-progress.json',import.meta.url)));const saved=fixture.profiles[model.id].state,original=structuredClone(saved);const old=restoreConventionalState(model,freeze(saved));assert.deepEqual(saved,original);assert.deepEqual(old.disabledZones,saved.disabledZones);assert.deepEqual(old.testZones,saved.testZones);assert.equal(old.writeEnabled,false);assert.deepEqual(old.sigmaConfig,{codes:['10'],delaysEnabled:false});
 let s=configure(fresh(),'29');s=setConventionalCover(model,s,false);s=diagnostic(s,'mains-fail',true);const restored=restoreConventionalState(model,freeze(s));assert.equal(restored.coverOpen,false);assert.equal(restored.writeEnabled,true);assert.equal(view(restored).display,'29');assert.equal(view(restored).displayDot,true);assert.deepEqual(restored.sigmaConfig,s.sigmaConfig);assert.deepEqual(restored.sigmaDiagnostics,s.sigmaDiagnostics);assert.deepEqual(restoreConventionalState(cfp,s),createConventionalState(cfp));
});
test('malformed saved Sigma configuration cannot inject unverified options, detector identities or invalid internal indications',()=>{
 const s=restoreConventionalState(model,{...fresh(),writeEnabled:true,sigmaConfig:{codes:['29','29','00','09','E1','device-37'],delaysEnabled:false},sigmaDiagnostics:{active:['cpu','mains-fail','fiction'],cpuLatched:false},engineering:{code:'device-37'},sigmaLastCode:'<script>',trainingCheckpoints:['detector-work','<script>'],pendingDelays:{Z99:30,Z1:'30'}});assert.deepEqual(s.sigmaConfig.codes,['10','29','09']);assert.equal(s.engineering.code,'00');assert.deepEqual(s.sigmaDiagnostics,{active:['cpu','mains-fail'],cpuLatched:true});assert.deepEqual(s.trainingCheckpoints,['detector-work']);assert.deepEqual(s.pendingDelays,{});
});

test('an active undelayed call-point input bypasses an existing detector delay without treating a cleared input as a new trigger',()=>{
 let s=exit(configure(configure(fresh(),'01'),'31'));s=key(s,'KEYSWITCH');s=key(selectConventionalMode(model,s,'Ad'),'ENTER');s=input(s,'Z1','alarm');assert.equal(view(s).soundersActive,false);s=input(s,'Z1','alarm','call-point');assert.equal(view(s).soundersActive,true);assert.equal(view(s).delayPending,false);
 let latched=exit(configure(configure(fresh(),'01'),'41'));latched=key(latched,'KEYSWITCH');latched=key(selectConventionalMode(model,latched,'Ad'),'ENTER');latched=input(latched,'Z1','alarm','call-point');latched=input(latched,'Z1','normal');assert.equal(latched.inputs.Z1.alarmKind,'call-point');assert.equal(view(latched).delayPending,true);assert.equal(view(latched).soundersActive,false);
});
