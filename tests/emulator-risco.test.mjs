import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildEmulatorModel,createEmulatorState,pressEmulatorKey,openEmulatorNode,setEmulatorText,setEmulatorZone,emulatorView,restoreEmulatorState,leaveEmulator,applyEmulatorEdit} from '../public/app/emulator-engine.mjs';
import {startHints,advanceHints} from '../public/app/emulator-hints.mjs';
import {createPracticeState,pressPracticeKey,setPracticeZone,currentNode} from '../public/app/practice-engine.mjs';
import {prepareMenuMap,validateMenuMap} from '../public/app/menu-map-engine.mjs';

const json=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const map=json('../public/app/data/menu-maps/risco-lightsys2.json');
const profile=json('../research/expansion-0.9.0/risco-profile.json');
const model=buildEmulatorModel(map,profile);
const raw=id=>map.nodes.find(n=>n.id===id);
const press=(state,...keys)=>keys.flat().reduce((s,k)=>pressEmulatorKey(model,s,k),state);
const view=state=>emulatorView(model,state);
const locate=(id,record,state=createEmulatorState(model))=>{
 let next=openEmulatorNode(model,state,id);
 if(view(next).mode==='selector')next=record?press(next,...record,'enter'):press(next,'enter');
 return next;
};
const noEdits=s=>JSON.stringify({values:s.values,committed:s.committedValues,names:s.zoneNames,types:s.zoneTypes,omitted:s.omittedZones});

test('LightSYS2 map preserves revisions, real local quick keys, type values, and reference-only uncertainty',()=>{
 assert.deepEqual(validateMenuMap(prepareMenuMap(map)),[]);
 assert.match(model.rootById['r-installer'].edition,/5IN2048 G/);
 assert.match(model.rootById['r-user'].edition,/5IN2124 E/);
 assert.equal(raw('r-e5.1.1.3').label,'Parameters');
 assert.equal(raw('r-e5.1.1.3').sourceRefs[0].pdfPage,153);
 assert.equal(raw('r-e1.1.01.1').address,'1.1.01.1');
 assert.equal(raw('r-e1.1.01.1').sourceRefs[0].pdfPage,75);
 assert.equal(model.nodes['r-e2.1.2.3'].choices.find(c=>c.code==='06').label,'Instant');
 assert.equal(model.nodes['r-e2.1.2.3'].choices.find(c=>c.code==='35').label,'KeySwitch Delayed Arm');
 assert.ok(raw('r-e1.2.7.4'));
 assert.equal(raw('r-e1.2.7.5'),undefined,'Do not fill the source gap with an invented control 5');
 assert.equal(model.nodes['r-e2.1.1'].mode,'info','One By One is not a false single-field edit');
 assert.equal(model.nodes['r-e2.1.3'].mode,'info','Resistor configuration is distinct from measured resistance');
 for(const n of map.nodes.filter(n=>n.id.startsWith('r-u')))assert.equal(n.code,null,n.id);
 for(const n of map.nodes.filter(n=>['reference','selection'].includes(n.kind)))assert.equal(n.address,undefined,n.id);
 assert.deepEqual(profile.physicalLayout,[['panic-left','previous','panic-right'],['part-set','next','arm'],['1','2','3'],['4','5','6'],['7','8','9'],['back','0','enter']]);
});

test('Installer 1→1→01→1 uses local immediate digits, honours 1–255 seconds and saves only at 0→OK',()=>{
 let state=press(createEmulatorState(model),'1','1','0','1','1');
 assert.equal(view(state).node.id,'r-e1.1.01.1');
 assert.equal(state.editor.kind,'number');
 state=press(state,'0','enter');
 assert.ok(state.editor,'Zero is outside the source lower bound');
 state=setEmulatorText(model,state,'256');state=press(state,'enter');
 assert.ok(state.editor,'256 is outside the source upper bound');
 state=setEmulatorText(model,state,'37');state=press(state,'enter');
 assert.equal(view(state).setting.value,37);
 assert.deepEqual(state.committedValues,{});
 while(state.trail.length>1)state=press(state,'back');
 state=press(state,'back');assert.equal(state.confirm,null,'Menu/Back at main menu does not replace 0 Exit');
 state=press(state,'0','enter');
 assert.equal(state.loggedOut,true);
 assert.deepEqual(state.committedValues,state.values);
});

test('Menu/Back cancels a field draft; source tamper gate blocks exit while ordinary open input is allowed',()=>{
 let state=locate('r-e1.1.01.1');
 state=setEmulatorText(model,state,'77');state=press(state,'back');
 assert.deepEqual(state.values,{});
 state=setEmulatorZone(model,state,'02','tamper');
 state=locate('r-e0',null,state);state=press(state,'enter');
 assert.equal(state.loggedOut,false);assert.match(state.feedback,/tamper/i);
 state=setEmulatorZone(model,state,'02','active');state=press(state,'enter');
 assert.equal(state.loggedOut,true,'The source exit gate is tamper/system trouble, not every ordinary open zone');
});

test('By Category edits select a real zone record and retain type/label/partition state independently',()=>{
 let state=locate('r-e2.1.2.3','02');
 state=press(state,'0','7','enter');
 assert.equal(state.zoneTypes['02'],'I+ Exit/Entry 1');
 assert.equal(state.zoneTypes['03'],'Instant');
 state=locate('r-e2.1.2.1','02',state);state=setEmulatorText(model,state,'Lobby PIR');state=press(state,'enter');
 assert.equal(state.zoneNames['02'],'Lobby PIR');
 assert.equal(state.zoneNames['03'],'Office PIR');
 state=locate('r-e2.1.2.2','02',state);state=press(state,'2','enter');
 assert.equal(state.zoneAreas['02']['1'],true);assert.equal(state.zoneAreas['02']['2'],true);
 const restored=restoreEmulatorState(model,state);
 assert.equal(restored.zoneTypes['02'],'I+ Exit/Entry 1');
 assert.equal(restored.zoneNames['02'],'Lobby PIR');
 assert.equal(restored.zoneAreas['02']['2'],true,'Numeric Risco partitions survive validated restoration');
});

test('UK omission uses Part Set then OK; Menu/Back discards a draft and permanent omission is separate',()=>{
 let state=locate('r-u-omit-once');
 state=press(state,'next','arm');assert.equal(state.draftOmissions['02'],false,'Full Set is not the documented p40 omit selector');
 state=press(state,'part-set');assert.equal(state.draftOmissions['02'],true);assert.equal(state.omittedZones['02'],false);
 state=press(state,'back');assert.equal(state.omittedZones['02'],false);
 state=locate('r-u-omit-once',null,state);state=press(state,'next','part-set','enter');
 assert.equal(state.omittedZones['02'],true);
 state=locate('r-u-omit-permanent',null,state);state=press(state,'next','part-set','enter');
 assert.equal(state.runtimeState.riscoPermanent['02'],true);
 state=locate('r-u-omit-once',null,state);state=press(state,'next','part-set','enter');
 assert.equal(state.runtimeState.riscoOneTime['02'],false);
 assert.equal(state.omittedZones['02'],true,'Clearing a one-time omit must not clear a permanent omit');
 const saved=JSON.parse(JSON.stringify(state));saved.runtimeState.riscoPermanent.unfitted=true;saved.runtimeState.riscoVoltage=true;
 state=restoreEmulatorState(model,saved);
 assert.equal(state.omittedZones['02'],true);
 assert.equal(state.runtimeState.riscoPermanent.unfitted,undefined);
 assert.equal(state.runtimeState.riscoVoltage,undefined,'Transient diagnostic view is not restored');
 state=locate('r-u-omit-permanent',null,state);state=press(state,'next','part-set','enter');
 assert.equal(state.omittedZones['02'],false);
});

test('Follow Me flags keep destination records independent and two-digit flag numbers select before toggling',()=>{
 let state=locate('r-e5.4.1.3.3','02');
 assert.equal(state.trail.at(-1).context.followMe,'02');
 state=press(state,'1','0');
 assert.equal(state.editor.cursor,9,'10 selects PSTN Trouble');
 assert.deepEqual(state.editor.draft,{},'Selecting a numbered flag does not enable it');
 state=press(state,'part-set','enter');
 assert.equal(view(state).setting.value['r-e5.4.1.3.3-v10'],true);
 state=locate('r-e5.4.1.3.3','01',state);
 assert.equal(state.editor.draft['r-e5.4.1.3.3-v10'],undefined,'Another Follow Me destination keeps its own flags');
 assert.equal(state.armed,false);assert.equal(state.outputStates.Sounder,undefined);
});

test('Clock helper rejects invalid dates through both OK and Apply, and user/service views share the saved time',()=>{
 let state=locate('r-u-time');
 state=setEmulatorText(model,state,'25:00 31/02/26');state=press(state,'enter');
 assert.ok(state.editor);assert.match(state.feedback,/valid 24-hour/);
 state=applyEmulatorEdit(model,state);assert.ok(state.editor);assert.deepEqual(state.values,{});
 state=setEmulatorText(model,state,'18:45 28/02/26');state=applyEmulatorEdit(model,state);
 assert.equal(state.editor,null);
 state=locate('r-s-time',null,state);assert.equal(state.editor.draft,'18:45 28/02/26');
});

test('Resistance diagnostic uses OK for voltage; source log exposes ten-event Full/Part jumps and no erase',()=>{
 let state=locate('r-s-resistance');state=press(state,'next');
 assert.equal(view(state).zone.address,'02');
 assert.match(view(state).screen.lines.join(' '),/2\.20 kΩ/);
 state=press(state,'enter');assert.match(view(state).screen.lines.join(' '),/2\.20 V/);
 state=setEmulatorZone(model,state,'02','active');assert.match(view(state).screen.lines.join(' '),/4\.40 V/);
 state=press(state,'enter');assert.match(view(state).screen.lines.join(' '),/4\.40 kΩ/);
 state=locate('r-u-log',null,state);
 state.events=Array.from({length:25},(_,i)=>({id:'demo-'+i,label:'Demo '+i,time:'Fictional',details:'Local fixture',zone:''}));
 state=press(state,'part-set');assert.equal(state.eventIndex,10);
 state=press(state,'arm');assert.equal(state.eventIndex,0);
 state=press(state,'next','next');assert.equal(state.eventIndex,2);
 const count=state.events.length;state=press(state,'0','enter');assert.equal(state.events.length,count);
});

test('Full walk test lists detected zones, Quick lists untested, and tests stop on departure',()=>{
 let state=locate('r-u-walk-full');
 assert.match(view(state).screen.lines.join(' '),/None detected/);
 state=setEmulatorZone(model,state,'04','active');assert.match(view(state).screen.lines.join(' '),/04 Store PIR/);
 state=press(state,'back');assert.equal(state.walk.running,false);
 state=setEmulatorZone(model,state,'04','secure');state=locate('r-u-walk-quick',null,state);
 assert.match(view(state).screen.lines.join(' '),/01 Front Door/);
 state=setEmulatorZone(model,state,'01','active');assert.match(view(state).screen.lines.join(' '),/02 Hall PIR/);
 state=leaveEmulator(model,state);assert.equal(state.walk.running,false);
 for(const target of ['r-u-sounder-test','r-u-strobe-test','r-s-siren','r-s-strobe']){
  state=locate(target);assert.equal(Object.values(state.outputStates).some(Boolean),true,target);
  state=press(state,'back');assert.equal(Object.values(state.outputStates).some(Boolean),false,target);
 }
});

test('SHOW HINTS uses physical Risco keys and reaches numeric or scroll-only destinations without edits',()=>{
 for(const target of ['r-e1.1.01.1','r-e2.1.2.3','r-u-omit-once','r-s-resistance']){
  let {state,hint}=startHints(model,createEmulatorState(model),target,target==='r-e2.1.2.3'?{recordId:'02'}:{});
  const before=noEdits(state);let count=0;
  while(hint.status==='active'&&count++<150){
   assert.ok(profile.keys.some(k=>k.id===hint.nextKey),target+' physical key '+hint.nextKey);
   const next=pressEmulatorKey(model,state,hint.nextKey);
   hint=advanceHints(model,hint,state,next,hint.nextKey);state=next;
   assert.equal(noEdits(state),before);
  }
  assert.equal(hint.status,'complete',target+': '+hint.message);
  assert.equal(view(state).node.id,target);
 }
});

test('All seven selected lessons complete using their sourced controls and routes',()=>{
 const key=(state,...keys)=>keys.flat().reduce((s,k)=>pressPracticeKey(profile,s,k),state);
 const down=n=>Array(n).fill('next');
 for(const id of ['omit-zone','restore-zone']){
  let state=key(createPracticeState(profile,id),'enter','enter','enter','enter','next','part-set','enter');
  assert.equal(state.complete,true,id);
 }
 let state=key(createPracticeState(profile,'check-resistance'),down(5),'enter',down(3),'enter','next');
 assert.equal(state.complete,true,'resistance');
 state=key(createPracticeState(profile,'view-zone-status'),down(2),'enter',down(3),'enter','next');
 assert.equal(state.complete,true,'status');
 state=key(createPracticeState(profile,'find-last-alarm'),down(5),'enter','next','next');
 assert.equal(state.complete,true,'log');
 state=key(createPracticeState(profile,'walk-test-pir'),down(6),'enter','enter','enter');
 assert.equal(currentNode(profile,state).kind,'walk-run');
 state=setPracticeZone(profile,state,'04','active');state=key(state,'back');assert.equal(state.complete,true,'walk');
 state=key(createPracticeState(profile,'leave-engineering'),'0','enter');assert.equal(state.complete,true,'exit');
});
