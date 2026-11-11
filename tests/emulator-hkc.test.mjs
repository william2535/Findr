import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildEmulatorModel,createEmulatorState,pressEmulatorKey,openEmulatorNode,setEmulatorRoot,setEmulatorText,applyEmulatorEdit,setEmulatorZone,emulatorView,restoreEmulatorState,leaveEmulator} from '../public/app/emulator-engine.mjs';
import {startHints,advanceHints} from '../public/app/emulator-hints.mjs';
import {createPracticeState,pressPracticeKey,setPracticeZone,currentNode,currentFrame,currentZone} from '../public/app/practice-engine.mjs';
import {prepareMenuMap,validateMenuMap} from '../public/app/menu-map-engine.mjs';

const json=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const map=json('../public/app/data/menu-maps/hkc-quantum70.json');
const profile=json('../research/expansion-0.9.0/hkc-profile.json');
const model=buildEmulatorModel(map,profile);
const raw=id=>map.nodes.find(node=>node.id===id);
const press=(state,...keys)=>keys.flat().reduce((s,key)=>pressEmulatorKey(model,s,key),state);
const view=state=>emulatorView(model,state);
const locate=(id,record,state=createEmulatorState(model))=>{
  let next=openEmulatorNode(model,state,id);
  if(view(next).mode==='selector')next=record?press(next,...String(record),'enter'):press(next,'enter');
  return next;
};
const unchanged=state=>JSON.stringify({values:state.values,committed:state.committedValues,names:state.zoneNames,types:state.zoneTypes,eligible:state.zoneOmitEnabled,omitted:state.omittedZones,armed:state.armed,mode:state.armingMode,chime:state.chime,outputs:state.outputStates});
const arming=state=>setEmulatorRoot(model,state||createEmulatorState(model),'h-arming');

test('Quantum70 graph retains exact sources, edition split, regional scope and visible contradictory branches',()=>{
  assert.deepEqual(validateMenuMap(prepareMenuMap(map)),[]);
  assert.equal(map.sources[0].sha256,'52a169e5d15c68f33da4e6215ec134400d6b27d798054a969ae416c9d73fbb47');
  assert.match(map.sources[1].url,/hkcsecurity\.com/);
  assert.match(model.rootById['h-arming'].edition,/2011|160811_1/);
  assert.equal(raw('h-e3.1').address,'3.1');
  assert.ok(raw('h-e3.1').sourceRefs.some(ref=>ref.pdfPage===53));
  assert.equal(raw('h-e8.6.0').code,'0');
  assert.equal(model.nodes['h-e7'].mode,'info');
  assert.equal(model.nodes['h-e1.3.9'].mode,'info');
  assert.equal(model.nodes['h-u-bell'].mode,'info');
  assert.equal(model.nodes['h-e8.2.2'].mode,'info');
  assert.equal(model.nodes['h-point-hardware'].code,null);
  assert.equal(model.nodes['h-point-block'].code,null);
  assert.equal(model.nodes['h-e9.5.3'].label,'Remote User Phones');
  assert.equal(model.nodes['h-remote-retired'].mode,'info');
  assert.equal(model.nodes['h-e9.7.4'].mode,'info');
  assert.equal(model.nodes['h-e9.7.3.4'],undefined,'Do not fill the missing Options4 from another model');
  assert.deepEqual(profile.panelIds,['hkc-quantum-70']);
  for(const node of map.nodes.filter(node=>node.kind==='selection'))assert.equal(node.address,undefined,node.id);
  const state=createEmulatorState(model);
  assert.equal(state.records.user.length,32);
  assert.equal(state.records.point.length,10);
  assert.equal(state.records.eventTimer.length,7);
  assert.equal(state.records.remoteUser.length,7);
  assert.deepEqual(state.records.block.map(record=>record.id),['0','1','2']);
  assert.equal(state.eventCapacity,999);
});

test('HKC 31 traverses immediately, without invented intermediate YES presses; a zone name is saved per record',()=>{
  let state=press(createEmulatorState(model),'3','1');
  assert.equal(view(state).node.id,'h-e3.1');
  assert.equal(view(state).mode,'selector');
  state=press(state,'2','enter','1');
  assert.equal(state.editor.nodeId,'h-e3.1.1');
  state=setEmulatorText(model,state,'Training lobby');state=press(state,'enter');
  assert.equal(state.zoneNames['002'],'Training lobby');
  assert.equal(state.zoneNames['003'],'Store PIR');
  assert.deepEqual(state.committedValues,state.values);
  state=restoreEmulatorState(model,state);
  assert.equal(state.zoneNames['002'],'Training lobby');
});

test('Source RF supervisory range is 20–999 minutes and unknown timer bounds remain labelled',()=>{
  let state=press(createEmulatorState(model),'2','1','5','2');
  assert.equal(view(state).node.id,'h-e2.1.5.2');
  state=setEmulatorText(model,state,'19');state=press(state,'enter');
  assert.ok(state.editor);assert.deepEqual(state.values,{});
  state=setEmulatorText(model,state,'1000');state=press(state,'enter');assert.ok(state.editor);
  state=setEmulatorText(model,state,'240');state=press(state,'enter');
  assert.equal(view(state).setting.value,240);
  assert.match(model.nodes['h-e6.2.4'].evidenceNote,/bounds|range/i);
  assert.equal(model.nodes['h-e6.2.4'].max,undefined,'Do not invent a firmware timer upper limit');
});

test('Zone types have no invented value codes and Inhibit permission is distinct from current inhibition',()=>{
  let state=locate('h-e3.2','002');
  assert.ok(model.nodes['h-e3.2'].choices.every(choice=>choice.code===null));
  state=press(state,'next','enter');
  assert.equal(state.zoneTypes['002'],'Ent/Exit');
  state=locate('h-e3.3','002',state);
  assert.match(view(state).screen.lines.join(' '),/Inhibit YES/);
  state=press(state,'change');
  assert.equal(state.zoneOmitEnabled['002'],false);
  assert.equal(state.omittedZones['002'],false);
  state=press(state,'next');
  assert.equal(view(state).screen.lines[0],'Exclude Part Set A','Access is not an Ent/Exit option');
  state=press(state,'enter');
  const flag=model.nodes['h-e3.3'].choices.find(choice=>choice.label==='Exclude Part Set A');
  assert.equal(state.editor.draft[flag.id],true);
  state=press(state,'back');
  assert.equal(view(state).node.id,'h-e3');
  state=arming(state);state=press(state,'previous','2','enter');
  assert.equal(state.armed,false);assert.equal(state.omittedZones['002'],false);
  assert.match(state.feedback,/not configured/i);
});

test('YES enables and NO disables immediately, while camera Image Size documents its source conflict',()=>{
  let state=locate('h-e8.7.1');
  state=press(state,'change');assert.equal(view(state).setting.value,false);
  state=press(state,'enter');assert.equal(view(state).setting.value,true);
  state=locate('h-e2.1.6.1',null,state);
  assert.equal(view(state).setting.value,'VGA');
  state=press(state,'enter');assert.equal(view(state).setting.value,'QVGA');
  state=press(state,'change');assert.equal(view(state).setting.value,'QVGA');
  assert.match(view(state).evidence.notes.join(' '),/p17|conflict|dedicated|discrepancy/i);
  state=press(state,'next');assert.equal(view(state).node.id,'h-e2.1.6.2');
});

test('Arming Options 1/10/11 cannot be mis-entered as immediate digits; Silent Fire uses explicit 860',()=>{
  let state=press(createEmulatorState(model),'8','1','1');
  assert.equal(view(state).node.id,'h-e8.1');
  assert.match(state.feedback,/scroll/i);
  state=press(state,Array(9).fill('next'),'enter');
  assert.equal(view(state).node.id,'h-e8.1.10');
  state=press(createEmulatorState(model),'8','6','0');
  assert.equal(view(state).node.id,'h-e8.6.0');
});

test('Open zones and open tampers use separate live fixture lists; engineering log 7/9 skips non-alarms',()=>{
  let state=setEmulatorZone(model,createEmulatorState(model),'002','active');
  state=setEmulatorZone(model,state,'001','tamper');
  state=locate('h-open-zones',null,state);
  assert.equal(view(state).zone.address,'002');
  assert.match(view(state).screen.lines.join(' '),/Lobby PIR.*Open/);
  state=setEmulatorZone(model,state,'002','secure');
  assert.match(view(state).screen.lines[0],/No Open Zones/);
  state=locate('h-open-tampers',null,state);
  assert.equal(view(state).zone.address,'001');
  assert.match(view(state).screen.lines.join(' '),/Tamper/);
  state=locate('h-e1.2.1');
  state=press(state,'9');assert.equal(state.events[state.eventIndex].id,'hkc-fixture-door');
  state=press(state,'9');assert.equal(state.events[state.eventIndex].id,'hkc-fixture-office');
  state=press(state,'9');assert.equal(state.events[state.eventIndex].id,'hkc-fixture-tamper');
  state=press(state,'7');assert.equal(state.events[state.eventIndex].id,'hkc-fixture-office');
});

test('User log stops at last setting and unnumbered User/Manager lists do not borrow engineer numbers',()=>{
  let state=locate('h-u-log');
  state=press(state,Array(8).fill('next'));
  assert.match(view(state).screen.lines.join(' '),/Office/);
  assert.equal(state.eventIndex,2);
  state=setEmulatorRoot(model,state,'h-user');state=press(state,'6');
  assert.equal(view(state).node.id,'@h-user');
  state=locate('h-m-names','02',state);
  state=setEmulatorText(model,state,'Demo colleague');state=press(state,'enter');
  const saved=Object.values(state.values);assert.ok(saved.includes('Demo colleague'));
  assert.ok(state.trail.some(frame=>frame.id==='h-u-manager'),'Manager settings remain reachable through the sourced User Menu route');
});

test('Fictional user codes enforce documented format and repeated confirmation without factory defaults',()=>{
  let state=locate('h-e5.1','01');
  state=press(state,'2','0','6','8','enter');assert.match(state.feedback,/without 0/);
  state=setEmulatorText(model,state,'2469');state=press(state,'enter');assert.match(state.feedback,/end in 9/);
  state=setEmulatorText(model,state,'2468');state=press(state,'enter');
  assert.ok(state.runtimeState.hkc.code);assert.deepEqual(state.values,{});
  assert.match(view(state).screen.lines[0],/Verify/);
  state=press(state,'2','4','6','6','enter');assert.deepEqual(state.values,{});assert.match(state.feedback,/not match/);
  state=press(state,'2','4','6','8','enter','2','4','6','8','enter');
  assert.ok(Object.values(state.values).includes('2468'));assert.equal(state.editor,null);
  assert.equal(state.runtimeState.hkc.code,undefined);
  state=locate('h-e5.4',null,state);state=press(state,'2','4','6','9','enter');
  assert.equal(state.editor,null,'Engineer code may end in9');
  for(const node of Object.values(model.nodes))if(node.interaction==='code-verify')assert.equal(node.defaultValue,'');
});

test('Text-helper apply cannot bypass source code verification or alphanumeric validation',()=>{
  let state=locate('h-e5.1','01');state=setEmulatorText(model,state,'2048');state=applyEmulatorEdit(model,state);
  assert.deepEqual(state.values,{});assert.match(state.feedback,/without 0/);
  state=setEmulatorText(model,state,'2468');state=applyEmulatorEdit(model,state);
  assert.deepEqual(state.values,{});assert.ok(state.runtimeState.hkc.code);
  state=setEmulatorText(model,state,'2468');state=applyEmulatorEdit(model,state);
  assert.ok(Object.values(state.values).includes('2468'));
  state=locate('h-e9.7.3.1',null,state);state=setEmulatorText(model,state,'demo!bad');state=applyEmulatorEdit(model,state);
  assert.ok(state.editor);assert.match(state.feedback,/alphanumeric/);
});

test('Part Arm A respects programmed Exclude Part Set A and restores it when unset',()=>{
  let state=locate('h-e3.3','002');state=press(state,'next','next','enter','back');
  state=setEmulatorZone(model,state,'002','active');
  state=locate('h-u-part-a',null,state);state=press(state,'enter');
  assert.equal(state.armed,true);assert.equal(state.omittedZones['002'],true);assert.match(state.armingMode,/A/);
  state=setEmulatorZone(model,state,'002','secure');state=setEmulatorZone(model,state,'002','active');
  assert.equal(state.alarm,false);
  state=locate('h-u-unset',null,state);state=press(state,'enter');assert.equal(state.omittedZones['002'],false);
  state=locate('h-e3.2','002',state);state=press(state,Array(5).fill('next'),'enter');assert.equal(state.zoneTypes['002'],'Tamper');
  state=locate('h-u-part-a',null,state);state=press(state,'enter');assert.equal(state.armed,false,'An old Alarm exclusion is not valid after a change to Tamper type');
  state=arming(state);state=press(state,'previous','2','enter');assert.equal(state.armed,false);assert.equal(state.omittedZones['002'],false);
});

test('RF SABB and Echo use documented YES on/off and stop on exit; Bell Test has no fabricated phase key',()=>{
  let state=locate('h-e1.3.6.2','1');
  assert.deepEqual(Object.values(state.outputStates),[false,false]);
  state=press(state,'enter');assert.deepEqual(Object.values(state.outputStates),[true,true]);
  state=press(state,'enter');assert.deepEqual(Object.values(state.outputStates),[false,false]);
  state=press(state,'enter','back');assert.ok(Object.values(state.outputStates).every(value=>!value));
  state=locate('h-e1.3.6.1','1',state);state=press(state,'enter');
  assert.equal(state.outputStates['RF Echo siren'],true);
  state=leaveEmulator(model,state);assert.ok(Object.values(state.outputStates).every(value=>!value));
  state=locate('h-e1.3.9',null,state);state=press(state,'enter');
  assert.ok(Object.values(state.outputStates).every(value=>!value));
  assert.match(view(state).evidence.notes.join(' '),/automatic sequence|timing|phase/i);
});

test('Engineer walk test registers fictional inputs and stops on QUIT',()=>{
  let state=press(createEmulatorState(model),'1','3','3');
  assert.equal(state.walk.running,true);
  state=setEmulatorZone(model,state,'002','active');assert.deepEqual(state.walk.hits,['002']);
  state=setEmulatorZone(model,state,'002','secure');state=setEmulatorZone(model,state,'002','active');
  assert.deepEqual(state.walk.hits,['002'],'Repeated activation is not double-counted');
  state=press(state,'back');assert.equal(state.walk.running,false);
});

test('Authorised *5 YES inhibits and sets, while User Unset restores without an invented Omit menu',()=>{
  let state=arming();
  assert.equal(view(state).node.id,'h-a-inhibit');
  assert.equal(state.armed,false);
  state=press(state,'previous','5');
  assert.equal(state.omittedZones['005'],false,'The selection is not committed before YES');
  state=press(state,'enter');
  assert.equal(state.armed,true);assert.equal(state.omittedZones['005'],true);
  assert.ok(state.events.some(event=>event.label==='Zone inhibited'&&event.zone==='005'));
  assert.ok(!model.rootById['h-user'].nodeIds.some(id=>/inhibit|omit/.test(id)));
  state=locate('h-u-unset',null,state);state=press(state,'enter');
  assert.equal(state.armed,false);assert.equal(state.omittedZones['005'],false);
  assert.ok(state.history.some(item=>item.event==='omission'&&item.zone==='005'&&item.value===false));
});

test('Multiple inhibits, invalid/non-eligible zones and QUIT cancellation preserve a transactional draft',()=>{
  let state=arming();state=press(state,'previous','5','previous','3','back');
  assert.equal(state.armed,false);assert.ok(Object.values(state.omittedZones).every(value=>!value));
  state=arming(state);state=press(state,'previous','7','enter');
  assert.equal(state.armed,false);assert.match(state.feedback,/not configured/);
  state=arming(state);state=press(state,'previous','7','0','enter');
  assert.equal(state.armed,false);assert.match(state.feedback,/not fitted/);
  state=arming(state);state=setEmulatorZone(model,state,'003','active');state=setEmulatorZone(model,state,'005','active');
  state=press(state,'previous','5','enter');assert.equal(state.armed,false);assert.equal(state.omittedZones['005'],false);
  state=press(state,'previous','3','enter');
  assert.equal(state.armed,true);assert.equal(state.omittedZones['005'],true);assert.equal(state.omittedZones['003'],true);
});

test('Double-star forced arming depends on its option and cannot inhibit an ineligible zone',()=>{
  let state=arming();state=setEmulatorZone(model,state,'005','active');
  state=press(state,'previous','previous','enter');assert.equal(state.armed,false);
  state=locate('h-e8.1.5',null,state);state=press(state,'enter');
  state=arming(state);state=press(state,'previous','previous','enter');
  assert.equal(state.armed,true);assert.equal(state.omittedZones['005'],true);
  state=locate('h-u-unset',null,state);state=press(state,'enter');
  state=setEmulatorZone(model,state,'007','active');state=arming(state);
  state=press(state,'previous','previous','enter');assert.equal(state.armed,false);
  assert.equal(state.omittedZones['007'],false);
});

test('Persistent fictional configuration survives restoration; transient inhibit/code drafts and outputs do not',()=>{
  let state=locate('h-e8.7.5');state=setEmulatorText(model,state,'7');state=press(state,'enter');
  state=arming(state);state=press(state,'previous','5','enter');
  const saved=copyState(state);saved.runtimeState.hkc.code={first:'2468'};saved.outputStates.Bell=true;
  state=restoreEmulatorState(model,saved);
  assert.equal(state.armed,true);assert.equal(state.omittedZones['005'],true);
  assert.deepEqual(state.runtimeState,{});assert.ok(Object.values(state.outputStates).every(value=>!value));
  state=locate('h-e8.7.5',null,state);assert.equal(state.editor.draft,'7');
  const unarmed=copyState(state);unarmed.armed=false;unarmed.omittedZones['005']=true;
  state=restoreEmulatorState(model,unarmed);assert.equal(state.omittedZones['005'],false,'Inhibits cannot persist outside a setting period');
});
function copyState(state){return JSON.parse(JSON.stringify(state));}

test('SHOW HINTS reaches deep menus and authorised inhibit context using physical buttons without changing settings',()=>{
  for(const [target,recordId] of [['h-e3.1.1','002'],['h-e2.1.5.2',null],['h-e9.5.3','2'],['h-e8.1.10',null],['h-e9.7.3.5',null],['h-a-inhibit',null],['h-u-unset',null]]) {
    let {state,hint}=startHints(model,createEmulatorState(model),target,recordId?{recordId}:{});
    const before=unchanged(state);let count=0;
    while(hint.status==='active'&&count++<120) {
      assert.ok(profile.keys.some(key=>key.id===hint.nextKey),'Highlight is a physical HKC button');
      const next=pressEmulatorKey(model,state,hint.nextKey);
      hint=advanceHints(model,hint,state,next,hint.nextKey);state=next;
      assert.equal(unchanged(state),before,target);
    }
    assert.equal(hint.status,'complete',target+': '+JSON.stringify(hint));
  }
});

test('Date/time helper works but SHOW HINTS declines its unverified physical inter-field route',()=>{
  const start=createEmulatorState(model),before=unchanged(start);
  const result=startHints(model,start,'h-time');
  assert.equal(result.hint.status,'blocked');
  assert.equal(unchanged(result.state),before);
  assert.equal(model.nodes['h-time'].hintRouteUnverified,true);
  let state=locate('h-m-datetime');
  assert.equal(state.editor.nodeId,'h-date');
  state=press(state,'enter');assert.equal(state.editor.nodeId,'h-time');
  state=setEmulatorText(model,state,'1630');state=press(state,'enter');
  assert.ok(Object.values(state.values).includes('1630'));
  assert.ok(!state.editor);
  assert.match(model.nodes['h-m-datetime'].evidenceNote,/FINDR.*helper/);
});

test('All seven selected practice lessons are achievable with the published HKC physical buttons',()=>{
  assert.equal(profile.tasks.length,7);
  const pp=(state,...keys)=>keys.flat().reduce((s,key)=>{
    assert.ok(profile.keys.some(button=>button.id===key),key+' is a physical HKC button');
    return pressPracticeKey(profile,s,key);
  },state);
  for(const task of profile.tasks) {
    let state=createPracticeState(profile,task.id);
    for(const target of task.routeNodeIds.slice(1)) {
      const node=currentNode(profile,state);
      if(node.kind==='menu') {
        const index=node.children.indexOf(target);assert.ok(index>=0,task.id);
        while(currentFrame(state).cursor!==index)state=pp(state,'next');
        state=pp(state,'enter');
      } else if(node.kind==='zone-select') {
        while(currentZone(profile,state).address!==task.goal.zone)state=pp(state,'next');
        state=pp(state,'enter');
      } else assert.fail('Unsupported route '+node.kind);
      assert.equal(currentFrame(state).id,target);
    }
    if(task.goal.kind==='zone')while(currentZone(profile,state).address!==task.goal.zone)state=pp(state,'next');
    if(task.goal.kind==='log')for(let i=0;i<profile.events.length&&!state.complete;i++)state=pp(state,'next');
    if(task.goal.kind==='walk'){state=setPracticeZone(profile,state,task.goal.zone,'active');state=pp(state,'back');}
    if(task.goal.kind==='type') {
      for(let i=0;i<profile.zoneTypes.length&&profile.zoneTypes[state.choice]?.label!==task.goal.value;i++)state=pp(state,'next');
      state=pp(state,'enter');
    }
    if(task.goal.kind==='logout')state=pp(state,'back','enter');
    assert.equal(state.complete,true,task.id);
  }
});
