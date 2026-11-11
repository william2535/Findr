import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildNanoModel,createNanoState,pressNanoKey,nanoView,findNanoRoute,nextNanoHint,evaluateNanoConditions,setNanoDeviceInput,setNanoFault,loadNanoScenario,tickNano,leaveNano,restoreNanoState} from '../public/app/gent-nano-engine.mjs';
const data=JSON.parse(readFileSync(new URL('../public/app/data/gent-nano.json',import.meta.url)));
const model=buildNanoModel(data);
const start=(scenarioId='normal',options={})=>createNanoState(model,{scenarioId,...options});
const press=(s,...keys)=>keys.flat().reduce((s,k)=>pressNanoKey(model,s,k),s);
const v=s=>nanoView(model,s);
const PIN=[...Array(2).fill('PLUS'),'NEXT',...Array(4).fill('PLUS'),'NEXT',...Array(4).fill('MINUS'),'NEXT',...Array(2).fill('MINUS'),'LEFT_SOFT'];
const login=s=>press(s,'LEFT_SOFT','NEXT','LEFT_SOFT','LEFT_SOFT','LEFT_SOFT',PIN);
function route(s,target){for(let i=0;i<150;i++){const before=JSON.stringify(s),h=findNanoRoute(model,s,target);assert.equal(JSON.stringify(s),before,'route planning must be pure');assert.equal(h.found,true,h.reason);if(!h.keys.length)return s;s=press(s,h.keys[0]);assert.equal(s.lastAction.ok,true,s.lastAction.message);}assert.fail(`Route loop: ${target}`);}
function draft(s,nodeId,values={},cursor){for(let i=0;i<200;i++){const before=JSON.stringify(s),h=nextNanoHint(model,s,{goal:{nodeId,values,...(cursor===undefined?{}:{cursor})}});assert.equal(JSON.stringify(s),before,'hint planning must be pure');assert.equal(h.found,true,h.reason);if(!h.key)return s;s=press(s,h.key);assert.equal(s.lastAction.ok,true,s.lastAction.message);}assert.fail(`Draft loop: ${nodeId}`);}
const save=(s,nodeId,values)=>press(draft(s,nodeId,values),'LEFT_SOFT');
const effects=s=>JSON.stringify({inputs:s.inputs,disabledDevices:s.disabledDevices,disabledZones:s.disabledZones,disabledSectors:s.disabledSectors,disabledChannels:s.disabledChannels,disabledOutputs:s.disabledOutputs,fireEvents:s.fireEvents,faults:s.faults,buzzer:s.buzzer,sounders:s.sounders,clock:s.clock,weeklyTest:s.weeklyTest,testZones:s.testZones});
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);Object.values(value).forEach(freeze);}return value;}

test('Nano compiles its own single-loop map and nine physical controls',()=>{
  assert.equal(model.id,'gent-nano');assert.equal(model.fixture.loops.length,1);assert.equal(model.fixture.zones.length,16);assert.equal(model.fixture.devices.length,7);
  assert.deepEqual(model.physicalKeys.map(k=>k.id),['LEFT_SOFT','MINUS','NEXT','PLUS','RIGHT_SOFT','CANCEL_BUZZER','RESET','SOUND_ALARMS','SILENCE_ALARMS']);
  assert.ok(!model.physicalKeys.some(k=>k.id==='F1'||k.id==='1'));
  assert.throws(()=>buildNanoModel({...data,nodes:[...data.nodes,data.nodes[0]]}),/unique/);
  assert.throws(()=>buildNanoModel({...data,menuRootId:'missing'}),/root/);
});

test('normal starts locked with only green Power lit and sixteen off zone indicators',()=>{
  const s=start(),view=v(s);assert.equal(s.accessLevel,1);assert.equal(view.status.normal,true);assert.equal(s.trainingPin,'2468');
  assert.deepEqual(view.leds.filter(l=>l.state==='on').map(l=>[l.id,l.color]),[['power','green']]);assert.equal(view.zones.length,16);assert.ok(view.zones.every(z=>z.state==='off'));
});

test('literal Nano PIN route uses scroll digits and Accept, never a numeric keyboard',()=>{
  let s=press(start(),'LEFT_SOFT','NEXT','LEFT_SOFT','LEFT_SOFT','LEFT_SOFT');assert.equal(s.nodeId,'pin');assert.equal(s.form.pin,'0000');
  s=press(s,PIN);assert.equal(s.nodeId,'status');assert.equal(s.accessLevel,2);assert.equal(s.authenticatedLevel,2);assert.equal(s.lastEvent.type,'access-granted');assert.deepEqual(s.form,{});
  assert.equal(press(s,'2').lastAction.ok,false);
});

test('locked emergency control prompts a PIN but authentication does not run it',()=>{
  let s=press(start('fire'),'CANCEL_BUZZER');assert.equal(s.nodeId,'pin');assert.equal(s.buzzer,true);assert.equal(s.sounders,true);
  s=press(s,PIN);assert.equal(s.nodeId,'status');assert.equal(s.buzzer,true);assert.equal(s.sounders,true);
  s=press(s,'CANCEL_BUZZER');assert.equal(s.buzzer,false);assert.equal(s.sounders,true);assert.equal(s.fireEvents.length,1);
});

test('introductory hint can deliberately teach the locked-control PIN prompt',()=>{
  const h=nextNanoHint(model,start('fire'),{allowAccessPrompt:true,goal:{nodeId:'status'},nextKey:'CANCEL_BUZZER'});assert.equal(h.key,'CANCEL_BUZZER');
});

test('wrong PIN stays locked and can be corrected from any digit without quitting',()=>{
  let s=press(start(),'SILENCE_ALARMS','PLUS','LEFT_SOFT');assert.equal(s.lastAction.ok,false);assert.equal(s.accessLevel,1);assert.equal(s.nodeId,'pin');
  s=press(s,'NEXT','PLUS','NEXT','PLUS','NEXT');s=draft(s,'pin',{pin:'2468'});assert.equal(s.form.pin,'2468');s=press(s,'LEFT_SOFT');assert.equal(s.accessLevel,2);
});

test('PIN display masks every digit except the selected position',()=>{
  let s=press(start(),'RESET','PLUS','PLUS');assert.equal(v(s).screen.field.displayValue,'2***');s=press(s,'NEXT','PLUS');assert.equal(v(s).screen.field.displayValue,'*1**');
});

test('menu highlighting uses Next, while Plus/Minus only edit form ranges',()=>{
  let s=press(start(),'LEFT_SOFT');assert.equal(s.menuIndex,0);s=press(s,'PLUS');assert.equal(s.lastAction.ok,false);assert.equal(s.menuIndex,0);s=press(s,'NEXT');assert.equal(s.menuIndex,1);s=press(s,'LEFT_SOFT');assert.equal(s.nodeId,'user');s=press(s,'RIGHT_SOFT');assert.equal(s.nodeId,'main');
});

test('pure navigation reaches a protected device screen without changing protection',()=>{
  const s=start('fire'),before=effects(s),after=route(s,'device-details');assert.equal(after.accessLevel,2);assert.equal(after.nodeId,'device-details');assert.equal(effects(after),before);assert.equal(after.form.device,1);
});

test('all implemented navigable operator pages recover from an unrelated draft',()=>{
  const targets=model.nodeList.filter(n=>n.kind!=='reference'&&!['weekly-running','display-test'].includes(n.id)).map(n=>n.id);
  for(const target of targets){const s=draft(login(start()),'zones',{zone:2,status:'DISABLED'}),before=effects(s),after=route(s,target);assert.equal(after.nodeId,target,target);assert.equal(effects(after),before,target);}
});

test('routes reject reference engineering screens and post-action weekly running',()=>{
  assert.equal(findNanoRoute(model,start(),'defaults-reference').found,false);assert.equal(findNanoRoute(model,start(),'not-a-screen').found,false);assert.equal(findNanoRoute(model,start(),'weekly-running').found,false);
});

test('abandoning a form discards its draft, and hints reconstruct address/status before Save',()=>{
  let s=draft(start(),'device-details',{device:3,status:'DISABLED'});assert.deepEqual(s.disabledDevices,[]);s=press(s,'RIGHT_SOFT');assert.deepEqual(s.disabledDevices,[]);
  s=save(s,'device-details',{device:3,status:'DISABLED'});assert.deepEqual(s.disabledDevices,['D3']);assert.equal(s.lastEvent.type,'device-disabled');
});

test('changing entity selection reloads its saved status, not the abandoned previous draft',()=>{
  let s=draft(start(),'zones',{zone:1,status:'DISABLED'});s=draft(s,'zones',{zone:2});assert.equal(s.form.status,'ENABLED');assert.deepEqual(s.disabledZones,[]);
});

test('device disablement and zone disablement stay independent after Reset or zone enable',()=>{
  let s=save(start(),'device-details',{device:1,status:'DISABLED'});s=save(s,'zones',{zone:1,status:'DISABLED'});s=save(s,'zones',{zone:1,status:'ENABLED'});s=press(s,'RESET');assert.deepEqual(s.disabledDevices,['D1']);assert.deepEqual(s.disabledZones,[]);
  s=save(s,'device-details',{device:1,status:'ENABLED'});assert.equal(v(s).status.normal,true);
});

test('Nano disabled zones suppress both sensor and manual call point stimuli',()=>{
  let s=save(start(),'zones',{zone:1,status:'DISABLED'});s=setNanoDeviceInput(model,s,'D1','fire');s=setNanoDeviceInput(model,s,'D2','fire');assert.equal(s.fireEvents.length,0);assert.equal(s.sounders,false);assert.equal(v(s).devices.find(d=>d.id==='D2').effectivelyDisabled,true);
  s=save(s,'zones',{zone:1,status:'ENABLED'});assert.equal(s.fireEvents.length,2);assert.equal(s.sounders,true);
});

test('sensor-sounder disablement gives both Disablement and Sounder Disablement lamps',()=>{
  const s=save(start(),'device-details',{device:5,status:'DISABLED'}),view=v(s);assert.equal(view.leds.find(l=>l.id==='disablement').state,'on');assert.equal(view.leds.find(l=>l.id==='sounder-disablement').state,'on');assert.equal(view.leds.find(l=>l.id==='fault').state,'off');
});

test('sector disablement suppresses that output sector but does not suppress sensing',()=>{
  let s=save(start(),'sectors',{sector:3,status:'DISABLED'});s=setNanoDeviceInput(model,s,'D5','fire');assert.equal(s.fireEvents.length,1);assert.equal(s.sectorOutputs.S3,false);assert.equal(s.masterAlarmsActive,true);assert.equal(s.sounders,true);
});

test('master-alarm disablement does not silently disable loop sounders or the fire relay',()=>{
  let s=save(start(),'other-alarms',{masterAlarms:'DISABLED'});s=setNanoDeviceInput(model,s,'D1','fire');assert.equal(s.masterAlarmsActive,false);assert.equal(s.sounders,true);assert.equal(s.fireRelayActive,true);
});

test('Other alarms stores three independent output disablements',()=>{
  let s=save(start(),'other-alarms',{masterAlarms:'DISABLED',fireRelay:'DISABLED',evacuateInput:'DISABLED'});assert.deepEqual(s.disabledOutputs,['masterAlarms','fireRelay','evacuateInput']);s=save(s,'other-alarms',{masterAlarms:'ENABLED'});assert.deepEqual(s.disabledOutputs,['fireRelay','evacuateInput']);
});

test('interface channels retain separate disablement flags and never operate a live relay',()=>{
  let s=save(start(),'channels',{channel:'D4C2',status:'DISABLED'});assert.deepEqual(s.disabledChannels,['D4C2']);assert.equal(s.lastEvent.type,'channel-disabled');s=save(s,'channels',{channel:'D4C2',status:'ENABLED'});assert.deepEqual(s.disabledChannels,[]);
  assert.equal(setNanoDeviceInput(model,s,'D4','fire').lastAction.ok,false);assert.equal(setNanoDeviceInput(model,s,'D7','fire').lastAction.ok,false);assert.deepEqual(v(s).devices.find(d=>d.id==='D7').allowedInputs,['normal','fault']);
});

test('optional AL3 device/channel configuration stays read-only at Customer access',()=>{
  let s=route(start('normal',{deviceDisablementLevel:3}),'device-details');assert.equal(v(s).screen.softKeys.some(k=>k.label==='Save'),false);assert.equal(nextNanoHint(model,s,{goal:{nodeId:'device-details',values:{status:'DISABLED'}}}).found,false);s=press(s,'LEFT_SOFT');assert.equal(s.lastAction.ok,false);assert.deepEqual(s.disabledDevices,[]);
  s=route(s,'channels');assert.equal(v(s).screen.softKeys.some(k=>k.label==='Save'),false);
});

test('first fire stays pinned while later events scroll; first zone flashes',()=>{
  let s=start('multiple-fires'),before=v(s);assert.equal(before.zones.find(z=>z.id==='Z1').state,'flashing');assert.equal(before.zones.find(z=>z.id==='Z2').state,'on');s=press(s,'PLUS');const after=v(s);assert.deepEqual(after.screen.lines.slice(0,2),before.screen.lines.slice(0,2));assert.notDeepEqual(after.screen.lines.slice(2,4),before.screen.lines.slice(2,4));s=press(s,'MINUS');assert.deepEqual(v(s).screen.lines,before.screen.lines);
});

test('Silence affects sounders, Cancel Buzzer affects buzzer, neither clears fire',()=>{
  let s=login(start('fire'));s=press(s,'SILENCE_ALARMS');assert.equal(s.sounders,false);assert.equal(s.buzzer,true);assert.equal(s.fireEvents.length,1);s=press(s,'CANCEL_BUZZER');assert.equal(s.buzzer,false);assert.equal(s.fireEvents.length,1);
});

test('a newly detected fire reactivates silenced alarms in the declared fixture',()=>{
  let s=press(login(start('fire')),'SILENCE_ALARMS','CANCEL_BUZZER');s=setNanoDeviceInput(model,s,'D3','fire');assert.equal(s.sounders,true);assert.equal(s.buzzer,true);assert.equal(s.fireEvents.length,2);
});

test('Reset cannot clear an active fire cause, fault or unrelated disablement',()=>{
  let s=login(start('fire'));s=setNanoFault(model,s,'mains-failed',true);s=save(s,'zones',{zone:2,status:'DISABLED'});s=press(s,'RESET');assert.equal(s.fireEvents.length,1);assert.equal(s.sounders,true);assert.equal(v(s).status.faultCount,1);assert.deepEqual(s.disabledZones,['Z2']);assert.equal(s.lastEvent.fireReturned,true);
});

test('restoring a fire input and then Reset returns to healthy state',()=>{
  let s=login(start('fire'));s=setNanoDeviceInput(model,s,'D1','normal');assert.equal(s.fireEvents.length,1);s=press(s,'SILENCE_ALARMS','RESET');assert.equal(v(s).status.normal,true);
});

test('fault acknowledgement does not repair its cause or erase historic events',()=>{
  let s=press(login(start('fault')),'CANCEL_BUZZER','RESET');assert.equal(v(s).status.faultCount,1);s=setNanoFault(model,s,'mains-failed',false);assert.equal(v(s).status.normal,true);assert.ok(s.history.some(e=>e.type==='fault-detected'));assert.ok(s.history.some(e=>e.type==='fault-restored'));
});

test('Loop Repair only clears a latched wiring report after its physical cause was restored',()=>{
  let s=press(route(start('loop-fault'),'loop-repair'),'LEFT_SOFT');assert.equal(v(s).status.faultCount,1);assert.equal(s.lastEvent.type,'loop-repair-unresolved');s=setNanoFault(model,s,'loop-wiring',false);assert.equal(v(s).status.faultCount,1);assert.equal(s.faults['loop-wiring'].physicalActive,false);s=press(route(s,'loop-repair'),'LEFT_SOFT');assert.equal(v(s).status.faultCount,0);assert.equal(s.lastEvent.type,'loop-repair-completed');
});

test('display test blanks LCD, lights every lamp and zone and ends at eight seconds',()=>{
  let s=route(start(),'display-test');assert.equal(s.displayTestRemainingMs,8000);let view=v(s);assert.equal(view.screen.heading,'');assert.deepEqual(view.screen.lines,[]);assert.ok(view.leds.every(l=>l.state==='on'));assert.ok(view.zones.every(z=>z.state==='on'));assert.equal(view.status.buzzer,true);assert.equal(view.status.sounders,false);s=tickNano(model,s,7999);assert.equal(s.nodeId,'display-test');s=tickNano(model,s,1);assert.equal(s.nodeId,'status');assert.equal(v(s).status.normal,true);
});

test('weekly test requires Yes, Quit keeps test active and Stop explicitly ends all zones',()=>{
  let s=route(start(),'weekly-start-stop');s=press(s,'RIGHT_SOFT');assert.equal(s.weeklyTest,false);s=press(route(s,'weekly-start-stop'),'LEFT_SOFT');assert.equal(s.nodeId,'weekly-running');assert.equal(s.weeklyTest,true);assert.equal(v(s).status.testCount,16);s=press(s,'RIGHT_SOFT');assert.equal(s.weeklyTest,true);s=press(route(s,'weekly-start-stop'),'LEFT_SOFT');assert.equal(s.weeklyTest,false);assert.equal(v(s).status.testCount,0);
});

test('weekly test sound lasts five seconds then reset follows five seconds later',()=>{
  let s=press(route(start(),'weekly-start-stop'),'LEFT_SOFT');s=setNanoDeviceInput(model,s,'D2','fire');assert.equal(s.sounders,true);assert.equal(s.plantActive,false);assert.equal(s.fireRelayActive,false);assert.equal(v(s).status.timerKind,'weekly-test-sound');
  s=tickNano(model,s,4999);assert.equal(s.sounders,true);s=tickNano(model,s,1);assert.equal(s.sounders,false);assert.equal(s.fireEvents.length,1);assert.equal(v(s).status.timerKind,'weekly-test-reset');s=setNanoDeviceInput(model,s,'D2','normal');s=tickNano(model,s,5000);assert.equal(s.fireEvents.length,0);assert.equal(s.weeklyTest,true);assert.equal(v(s).status.testCount,16);assert.equal(s.lastEvent.type,'test-reset');
});

test('individual zone test uses the same timed cycle without enabling all-zone weekly mode',()=>{
  let s=save(start(),'zones',{zone:1,test:'YES'});assert.equal(s.weeklyTest,false);assert.deepEqual(s.testZones,['Z1']);s=setNanoDeviceInput(model,s,'D2','fire');assert.equal(s.fireRelayActive,false);s=tickNano(model,s,10000);assert.equal(s.fireEvents.length,0);assert.equal(v(s).status.testCount,1);s=save(s,'zones',{zone:1,test:'NO'});assert.equal(v(s).status.testCount,0);
});

test('zone form cannot partially commit a weekly-test exit through a zone test flag',()=>{
  let s=draft(start('weekly-test'),'zones',{zone:1,status:'DISABLED',test:'NO'});const before=s.disabledZones;s=press(s,'LEFT_SOFT');assert.equal(s.lastAction.ok,false);assert.deepEqual(s.disabledZones,before);assert.equal(s.weeklyTest,true);
});

test('CALENDAR Day/Night override commits with Save and NONE restores scheduled state',()=>{
  let s=save(start(),'day-night',{override:'DAY'});assert.equal(s.nodeId,'user-system');assert.equal(s.dayOverride,'DAY');assert.equal(s.lastEvent.type,'day-override-set');assert.equal(v(s).leds.find(l=>l.id==='delay').state,'on');s=save(s,'day-night',{override:'NONE'});assert.equal(v(s).status.dayState,'NIGHT');assert.equal(v(s).leds.find(l=>l.id==='delay').state,'off');
});

test('manual sound and silence during day delay do not activate plant or fire relay early',()=>{
  let s=login(start('day-delay'));assert.equal(s.delayRemainingMs,30000);assert.equal(s.sounders,false);s=press(s,'SILENCE_ALARMS');assert.equal(s.delayRemainingMs,30000);assert.equal(s.fireRelayActive,false);assert.equal(s.plantActive,false);s=press(s,'SOUND_ALARMS');assert.equal(s.sounders,true);assert.equal(s.fireRelayActive,false);assert.equal(s.delayRemainingMs,30000);s=press(s,'SILENCE_ALARMS');s=tickNano(model,s,30000);assert.equal(s.sounders,true);assert.equal(s.fireRelayActive,true);
});

test('second automatic fire does not restart the first practice delay deadline',()=>{
  let s=tickNano(model,start('day-delay'),10000);s=setNanoDeviceInput(model,s,'D3','fire');assert.equal(s.delayRemainingMs,20000);s=tickNano(model,s,20000);assert.equal(s.sounders,true);
});

test('Verify requires Customer mode and starts the declared 60-second practice delay',()=>{
  let s=login(start('day-delay'));s=press(s,'NEXT');assert.equal(s.verifyRemainingMs,60000);assert.equal(s.delayRemainingMs,0);assert.equal(v(s).leds.find(l=>l.id==='verify').state,'on');s=tickNano(model,s,60000);assert.equal(s.sounders,true);assert.equal(s.verifyRemainingMs,0);
});

test('clock edits are drafts until Save, including valid leap-year boundaries',()=>{
  let s=draft(start(),'clock',{minute:5});assert.equal(s.clock.minute,0);s=press(s,'RIGHT_SOFT');assert.equal(s.clock.minute,0);s=save(s,'clock',{minute:5});assert.equal(s.clock.minute,5);assert.equal(s.lastEvent.type,'clock-set');s=draft(s,'clock',{year:2028,month:2,day:29});s=press(s,'LEFT_SOFT');assert.equal(s.clock.day,29);s=draft(s,'clock',{year:2027});assert.equal(s.form.day,28);
});

test('historic logs are newest-first and capped at the documented training bound',()=>{
  let s=login(start());for(let i=0;i<1020;i++)s=press(s,i%2?'SILENCE_ALARMS':'SOUND_ALARMS');assert.equal(s.history.length,999);assert.ok(s.history[0].sequence>s.history[1].sequence);s=route(s,'view-historic');assert.match(v(s).screen.lines[0],/^1:/);const first=v(s).screen.lines[1];s=press(s,'PLUS');assert.match(v(s).screen.lines[0],/^2:/);assert.notEqual(v(s).screen.lines[1],first);
});

test('active disablement and test logs remain separate from historic events',()=>{
  let s=save(start(),'zones',{zone:2,status:'DISABLED',test:'YES'});s=route(s,'view-disablement');assert.match(v(s).screen.heading,/\(1\)/);assert.match(v(s).screen.lines.join(' '),/Zone Disabled/);s=route(s,'view-test');assert.match(v(s).screen.lines.join(' '),/Zone in Test/);s=save(s,'zones',{zone:2,status:'ENABLED',test:'NO'});s=route(s,'view-disablement');assert.match(v(s).screen.heading,/\(0\)/);assert.ok(s.history.some(e=>e.type==='zone-disabled'));
});

test('FINDR idle timeout discards edits and returns to level 1 without changing protection',()=>{
  let s=draft(start('device-disabled'),'zones',{zone:2,status:'DISABLED'}),before=effects(s);assert.ok(v(s).status.timers.some(t=>t.kind==='access-timeout'));s=tickNano(model,s,180000);assert.equal(s.nodeId,'status');assert.equal(s.accessLevel,1);assert.equal(effects(s),before);
});

test('leaving removes transient practice tests and access but preserves disablements and real scenario fires',()=>{
  let s=save(start('fire'),'device-details',{device:3,status:'DISABLED'});s=save(s,'zones',{zone:3,test:'YES'});s=setNanoDeviceInput(model,s,'D6','fire');const after=leaveNano(model,s);assert.equal(after.accessLevel,1);assert.equal(after.testZones.length,0);assert.deepEqual(after.disabledDevices,['D3']);assert.equal(after.fireEvents.length,1);assert.equal(after.fireEvents[0].device,'D1');assert.equal(after.inputs.D6,'normal');
});

test('snapshot restore checks identity/source and clears transient access, PIN and test state',()=>{
  let s=save(start('device-disabled'),'zones',{zone:2,test:'YES'});s=route(s,'pin');s=press(s,'PLUS');let restored=restoreNanoState(model,s);assert.deepEqual(restored.disabledDevices,['D1']);assert.equal(restored.nodeId,'status');assert.equal(restored.accessLevel,1);assert.deepEqual(restored.form,{});assert.deepEqual(restored.testZones,[]);
  assert.equal(v(restoreNanoState(model,{...s,panelId:'gent-vigilon'})).status.normal,true);assert.equal(v(restoreNanoState(model,{...s,sourceFingerprint:'stale'})).status.normal,true);
});

test('snapshot restore rejects unknown entities and reconstructs a missing active fire record',()=>{
  const s={...start(),inputs:{D1:'fire',D7:'unsupported'},disabledDevices:['not-a-device'],disabledZones:['Z999'],disabledOutputs:['all-protection'],fireEvents:[{device:'intruder-zone'}],faults:{bad:{id:'unknown',message:'Injected'}}};const r=restoreNanoState(model,s);assert.deepEqual(r.disabledDevices,[]);assert.deepEqual(r.disabledZones,[]);assert.deepEqual(r.disabledOutputs,[]);assert.equal(r.fireEvents.length,1);assert.equal(r.fireEvents[0].device,'D1');assert.equal(r.sounders,true);assert.equal(Object.keys(r.faults).length,0);
});

test('reducers never mutate an input state or share mutable form/history references',()=>{
  const initial=freeze(start('fire')),after=press(initial,'CANCEL_BUZZER');assert.equal(initial.nodeId,'status');assert.equal(after.nodeId,'pin');assert.notEqual(after.history,initial.history);assert.doesNotThrow(()=>setNanoDeviceInput(model,initial,'D1','normal'));assert.doesNotThrow(()=>tickNano(model,initial,1000));assert.doesNotThrow(()=>leaveNano(model,initial));
});

test('conditions report real device, output, test and fresh-event outcomes',()=>{
  const s=save(start(),'device-details',{device:1,status:'DISABLED'});assert.equal(evaluateNanoConditions(model,s,[{type:'deviceDisabled',device:'D1',value:true},{type:'event',value:'device-disabled',device:'D1'},{type:'disablementCount',value:1}]),true);assert.equal(evaluateNanoConditions(model,s,{type:'deviceDisabled',device:'missing',value:false}),false);assert.equal(evaluateNanoConditions(model,s,{type:'unknown',value:true}),false);
});

test('fire LCD retains concurrent condition counts and disabled alarm-output warning',()=>{
  let s=save(start('sector-disabled'),'other-alarms',{masterAlarms:'DISABLED'});s=setNanoDeviceInput(model,s,'D1','fire');s=setNanoFault(model,s,'mains-failed',true);const view=v(route(s,'status'));assert.match(view.screen.heading,/FAULT:1 DISABLE:2/);assert.match(view.screen.lines.join(' '),/MA \+ Sector 3 Disabled/);assert.ok(!view.screen.lines.some(line=>line.startsWith('Total Fires:')));
});

test('active-condition timestamps stay at detection time when the clock changes',()=>{
  let s=save(start('fault'),'zones',{zone:1,status:'DISABLED',test:'YES'});const original=s.faults['mains-failed'].at;s=save(s,'clock',{minute:15});assert.equal(s.faults['mains-failed'].at,original);assert.equal(s.conditionTimes['zone:Z1'],original);assert.equal(s.conditionTimes['test:Z1'],original);s=route(s,'view-fault');assert.ok(v(s).screen.lines[0].includes(original));
});

test('reintroducing a restored wiring cause makes Repair remain unresolved again',()=>{
  let s=setNanoFault(model,start('loop-fault'),'loop-wiring',false);s=setNanoFault(model,s,'loop-wiring',true);assert.equal(s.faults['loop-wiring'].physicalActive,true);s=press(route(s,'loop-repair'),'LEFT_SOFT');assert.equal(v(s).status.faultCount,1);assert.equal(s.lastEvent.type,'loop-repair-unresolved');
});

test('enabling an active detector returns fire and still records the explicit enable outcome',()=>{
  let s=start('device-disabled');s=setNanoDeviceInput(model,s,'D1','fire');assert.equal(s.fireEvents.length,0);s=save(s,'device-details',{device:1,status:'ENABLED'});assert.equal(s.fireEvents.length,1);assert.equal(s.lastEvent.type,'device-enabled');assert.equal(s.lastEvent.device,'D1');assert.ok(s.history.some(e=>e.type==='fire-detected'));
});

