import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as t from '../public/app/twinflex-engine.mjs';
const data=JSON.parse(readFileSync(new URL('../public/app/data/twinflex.json',import.meta.url))),model=t.buildTwinflexModel(data);
const press=(state,...keys)=>keys.flat().reduce((s,k)=>t.pressTwinflexKey(model,s,k),state);
const route=(...parts)=>parts.flatMap(x=>[...String(x),'ENTER']);
const login=(code='3647')=>press(t.createTwinflexState(model),[...code]);
const eng=()=>press(t.setTwinflexCover(model,login(),true),'WRITE_ENABLE');
function action(state,a){return a.type==='cover'?t.setTwinflexCover(model,state,a.open):a.type==='input'?t.setTwinflexInput(model,state,a.zone,a.kind,a.value):a.type==='tick'?t.advanceTwinflexTime(model,state,a.seconds):state;}

test('fourth digit grants 3A; cover and Write Enable are independent; key cannot change code access',()=>{
 let s=press(t.createTwinflexState(model),'3','6','4');assert.equal(s.accessLevel,'1');s=press(s,'7');assert.equal(s.accessLevel,'3A');assert.equal(t.twinflexView(model,s).keyEnabled,false);assert.equal(t.twinflexView(model,s).leds.access,'fast-flash');
 s=press(s,'WRITE_ENABLE');assert.equal(s.writeEnabled,false);s=t.setTwinflexCover(model,s,true);assert.equal(s.accessLevel,'3A');s=press(s,'WRITE_ENABLE');assert.equal(s.accessLevel,'3B');s=t.setTwinflexCover(model,s,false);assert.equal(s.writeEnabled,true);s=press(s,'ENABLE_KEY');assert.equal(s.accessLevel,'3B');
 s=press(s,'ESC');const v=t.twinflexView(model,s);assert.equal(s.accessLevel,'1');assert.equal(v.leds.systemFault,true);assert.equal(v.faultRelay,false);assert.ok(v.zones.every(z=>z.power==='ON'));
 const key=t.twinflexView(model,press(t.createTwinflexState(model),'ENABLE_KEY'));assert.equal(key.keyEnabled,true);assert.equal(key.accessLevel,'2A');
});

test('3A guards commit; ESC cancels; 3B stores pending zone supply until RESET',()=>{
 let s=press(login(),route(6,1,'01'),'RIGHT','ENTER');assert.equal(s.configured['zone-power'][0],'ON');assert.match(s.notice,/Write protected/);
 s=t.setTwinflexCover(model,s,true);s=press(s,'WRITE_ENABLE','ENTER');assert.equal(s.configured['zone-power'][0],'OFF');assert.equal(s.applied['zone-power'][0],'ON');assert.equal(s.pendingReset,true);
 const restored=t.restoreTwinflexState(model,JSON.parse(JSON.stringify(s)));assert.equal(restored.pendingReset,true);assert.equal(restored.applied['zone-power'][0],'ON');
 s=press(s,'RESET');assert.equal(t.twinflexView(model,s).zones[0].power,'OFF');assert.equal(s.pendingReset,false);s=press(s,'LEFT','ESC');assert.equal(s.configured['zone-power'][0],'OFF');
});

test('disablement blocks all zone inputs without cutting supply; sounders can activate from another zone',()=>{
 let s=press(login('7877'),route(3,4,'01'),'LEFT','ENTER');assert.equal(s.zoneDisabled[0],true);assert.equal(s.applied['zone-power'][0],'ON');const before=s.events.length;
 s=t.setTwinflexInput(model,s,1,'alarm','mcp');assert.equal(s.latched[0],false);assert.equal(s.events.length,before);s=t.setTwinflexInput(model,s,2,'alarm','smoke');assert.equal(t.twinflexView(model,s).zones[0].sounder,true);
 s=press(s,'SILENCE_ALARMS','RESET');assert.equal(s.zoneDisabled[0],true);assert.equal(s.latched[1],true);
});

test('Supervisor code3 is Delays; Engineer code3 is Re-Sound; no generation merging',()=>{
 let s=press(login('7877'),route(3,3));assert.equal(s.nodeId,'disable-delays');s=press(s,'LEFT','ENTER');assert.equal(s.delaysDisabled,true);
 s=press(login(),route(3,3));assert.equal(s.nodeId,'disable-resound');assert.equal(model.nodes.has('autolearn'),false);
});

test('walk tests scope local sound, reset approximately five seconds and retain mode until END',()=>{
 for(const [option,mode] of [[1,'silent'],[2,'audible'],[3,'system']]){let s=press(login('7877'),route(2,2,option,'01'),'ENTER');assert.equal(s.testZones[0],mode);s=t.setTwinflexInput(model,s,1,'alarm','smoke');let v=t.twinflexView(model,s);assert.equal(v.zones[0].fire,true);assert.equal(v.zones[0].sounder,mode!=='silent');assert.equal(v.zones[1].sounder,false);s=t.advanceTwinflexTime(model,s,5);assert.equal(t.twinflexView(model,s).zones[0].fire,false);assert.equal(s.testZones[0],mode);s=press(s,'RIGHT','ENTER');assert.equal(s.testZones[0],null);}
 const all=press(login('7877'),route(2,2,1,'00'),'ENTER');assert.ok(all.testZones.every(v=>v==='silent'));assert.equal(press(eng(),route(6,1,'00')).phase,'zone');
});

test('fire reset requires silence and persistent input reasserts; buzzer is separate',()=>{
 let s=t.loadTwinflexScenario(model,login('7877'),'fire');s=press(s,'RESET');assert.match(s.notice,/Silence/);s=press(s,'SILENCE_ALARMS');assert.equal(t.twinflexView(model,s).buzzer,true);s=press(s,'SILENCE_BUZZER');assert.equal(t.twinflexView(model,s).buzzer,false);s=press(s,'RESET');assert.equal(s.latched[0],true);s=press(s,'SILENCE_ALARMS');s=t.setTwinflexInput(model,s,1,'alarm',false);s=press(s,'RESET');assert.equal(s.latched[0],false);
});

test('smoke delay, zone-of-origin override and CP/DET heat distinction are source-backed',()=>{
 let s=eng();s=press(s,route(8,1,'01'),'RIGHT','ENTER','ESC',route(5),'1','ENTER','RESET');s=t.setTwinflexInput(model,s,1,'alarm','smoke');assert.equal(t.twinflexView(model,s).zones[0].sounder,true,'origin default overrides delay');
 s=t.loadTwinflexScenario(model,s,'normal');s=press(s,'ESC',route(6),'RIGHT','ENTER','RESET');s=t.setTwinflexInput(model,s,1,'alarm','smoke');assert.equal(t.twinflexView(model,s).zones[0].sounder,false);s=t.advanceTwinflexTime(model,s,60);assert.equal(t.twinflexView(model,s).zones[0].sounder,true);
 s=t.loadTwinflexScenario(model,s,'normal');s=t.setTwinflexInput(model,s,1,'alarm','heat');assert.equal(t.twinflexView(model,s).zones[0].sounder,true,'CP/SM/HT heat bypass');
 s=t.loadTwinflexScenario(model,s,'normal');s=press(s,'ESC','ESC',route(6,3),'LEFT','ENTER','RESET');assert.equal(s.applied['zone-mode'],'CP/DET');s=t.setTwinflexInput(model,s,1,'alarm','heat');assert.equal(t.twinflexView(model,s).zones[0].sounder,false,'CP/DET heat follows smoke');
});

test('dwelling confirmation uses minute checks, persists warning and confirms sustained input',()=>{
 let s=press(eng(),route(7,1,'01'),'RIGHT','ENTER','RESET');s=t.setTwinflexInput(model,s,1,'alarm','smoke');assert.equal(s.latched[0],false);assert.equal(s.confirmationStart[0],0);s=t.advanceTwinflexTime(model,s,60);assert.equal(s.latched[0],true);
 s=t.loadTwinflexScenario(model,s,'normal');s=t.setTwinflexInput(model,s,1,'alarm','smoke');s=t.setTwinflexInput(model,s,1,'alarm',false);s=t.advanceTwinflexTime(model,s,60);assert.equal(s.confirmationStart[0],null);assert.equal(s.latched[0],false);
});

test('confirmation checks cleared smoke at the next minute boundary, not on the clearing action',()=>{
 let s=press(eng(),route(7,1,'01'),'RIGHT','ENTER','ESC',route(3),'2','ENTER','RESET');s=t.setTwinflexInput(model,s,1,'alarm','smoke');s=t.advanceTwinflexTime(model,s,65);s=t.setTwinflexInput(model,s,1,'alarm',false);assert.notEqual(s.confirmationStart[0],null);s=t.advanceTwinflexTime(model,s,5);assert.notEqual(s.confirmationStart[0],null);s=t.advanceTwinflexTime(model,s,50);assert.equal(s.confirmationStart[0],null);assert.equal(s.latched[0],false);
});

test('weekly reminder HHMM entry is guarded, validated, stored and applied by RESET',()=>{
 let s=press(eng(),route(9,5,1,3),...'2560','ENTER');assert.equal(s.configured['weekly-time'],'1000');s=press(s,...'1430','ENTER');assert.equal(s.configured['weekly-time'],'1430');assert.equal(s.applied['weekly-time'],'1000');s=press(s,'RESET');assert.equal(s.applied['weekly-time'],'1430');const restored=t.restoreTwinflexState(model,s);assert.equal(restored.applied['weekly-time'],'1430');
});

test('code edits validate and defer until reset; date edits reject impossible dates and ESC cancels',()=>{
 let s=press(eng(),route(9,2,1),'DOWN',...'1234','DOWN',...'4321','ENTER');assert.equal(s.configured.codes.user,'8737');s=press(s,...'1234','ENTER');assert.equal(s.configured.codes.user,'1234');assert.equal(s.applied.codes.user,'8737');s=press(s,'RESET');assert.equal(s.applied.codes.user,'1234');
 s=press(login('7877'),route(4),...'311126','ENTER');assert.equal(s.clock.date,'021126');s=press(s,...'031126','DOWN',...'103000','ESC');assert.equal(s.clock.date,'021126');
});

test('all authored lessons replay their physical keys and reach meaningful final states',()=>{
 for(const l of data.lessons){let s=t.createTwinflexState(model,{scenarioId:l.scenarioId});for(const step of l.steps)s=step.action?action(s,step.action):press(s,step.expectedKeys);assert.equal(s.pendingReset,false,l.id);assert.equal(s.writeEnabled,false,l.id);assert.equal(s.latched.some(Boolean),false,l.id);if(l.id==='date-time')assert.deepEqual(s.clock,{date:'031126',time:'103000'});if(l.id==='practice-code'){assert.equal(s.accessLevel,'2A');assert.equal(s.applied.codes.user,'1234');}if(l.id==='disable-zone')assert.equal(s.zoneDisabled[0],false);if(l.id==='silent-walk-test')assert.ok(s.testZones.every(v=>v===null));}
});

test('all exposed map routes replay to the intended node without committing a setting',()=>{
 for(const node of data.nodes.filter(n=>n.hintsRoute)){const initial=node.maxAccess==='2B'?login('7877'):eng(),path=t.findTwinflexRoute(model,initial,node.id);assert.ok(path.found,node.id);const before=JSON.stringify(initial.configured),result=press(initial,path.keys);assert.equal(result.nodeId,node.id,node.id);assert.equal(JSON.stringify(result.configured),before,node.id);}
 for(const n of data.nodes.filter(n=>n.simulationStatus==='reference-only'))assert.equal(t.findTwinflexRoute(model,eng(),n.id).found,false,n.id);
});

test('freshly recomputed physical hints consume numeric prefixes instead of undoing each key',()=>{
 for(const node of data.nodes.filter(n=>n.hintsRoute)){let s=node.maxAccess==='2B'?login('7877'):eng();for(let count=0;count<45&&s.nodeId!==node.id;count++){const path=t.findTwinflexRoute(model,s,node.id);assert.ok(path.found,node.id);assert.ok(path.keys[0],node.id);s=press(s,path.keys[0]);}assert.equal(s.nodeId,node.id,node.id);}
});

test('engineer-only temporary buzzer needs 3B and restores when access ends',()=>{
 let s=press(login(),route(9,1,1),'RIGHT','ENTER');assert.equal(s.engineerBuzzer,'ON');s=t.setTwinflexCover(model,s,true);s=press(s,'WRITE_ENABLE','ENTER');assert.equal(s.engineerBuzzer,'OFF');s=press(s,'ENABLE_KEY');assert.equal(s.accessLevel,'3B');s=press(s,'ESC','ESC','ESC','ESC');assert.equal(s.accessLevel,'1');assert.equal(s.engineerBuzzer,'ON');
});
