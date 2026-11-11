import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  buildEmulatorModel,createEmulatorState,pressEmulatorKey,openEmulatorNode,
  setEmulatorZone,setEmulatorRoot,restoreEmulatorState,setEmulatorText,applyEmulatorEdit,leaveEmulator,emulatorView,
} from '../public/app/emulator-engine.mjs';

const read=name=>JSON.parse(readFileSync(new URL('../public/app/data/'+name,import.meta.url)));
const models=Object.fromEntries(read('practice.json').profiles.map(profile=>[profile.id,buildEmulatorModel(read('menu-maps/'+profile.id+'.json'),profile)]));
const galaxy=models['galaxy-dimension'],tex=models['texecom-premier-elite'],scan=models['scantronic-ion'],orisec=models['orisec-cp'];
const press=(model,state,...keys)=>keys.flat().reduce((state,key)=>pressEmulatorKey(model,state,key),state);
const view=(model,state)=>emulatorView(model,state);
const chooseRecord=(model,state,id)=>press(model,state,...String(id),'enter');
const located=(model,id,record)=>{
  let state=openEmulatorNode(model,createEmulatorState(model),id);
  if(view(model,state).mode==='selector')state=record?chooseRecord(model,state,record):press(model,state,'enter');
  return state;
};

test('all nine models retain source metadata and only documented numbered navigation',()=>{
  for(const model of Object.values(models)){
    assert.ok(model.stats.editable>=(model.id==='ade-accenta-optima'?40:51),model.id);
    for(const node of model.reachable.map(id=>model.nodes[id])){
      assert.ok(node.sourceRefs.length,node.id);
      if(node.codeType==='ambiguous')assert.equal(node.code,null,node.id);
    }
  }
  assert.deepEqual(galaxy.roots[0].nodeIds,['galaxy-10','galaxy-20','galaxy-30','galaxy-40','galaxy-50','galaxy-60','galaxy-70']);
  assert.ok(!scan.roots[0].nodeIds.includes('i-setting'));
  assert.ok(!scan.roots[1].nodeIds.includes('i-partitions'));
  assert.ok(!tex.roots.some(r=>r.id==='legacy-arming'));
});

test('Galaxy complete Full Menu number selects real option and requires zone context',()=>{
  let state=press(galaxy,createEmulatorState(galaxy),'5','2','enter');
  assert.equal(view(galaxy,state).mode,'selector');
  assert.equal(view(galaxy,state).records[0].id,'1001');
  state=chooseRecord(galaxy,state,'1002');
  state=press(galaxy,state,'1','enter');
  assert.equal(view(galaxy,state).node.id,'galaxy-52.1');
  state=press(galaxy,state,'0','3','enter');
  assert.equal(state.zoneTypes['1002'],'Intruder');
  assert.equal(state.zoneTypes['1001'],'Final');
  state=openEmulatorNode(galaxy,state,'galaxy-21');
  state=press(galaxy,state,'1','0','0','2');
  assert.equal(view(galaxy,state).zone.type,'Intruder');
});

test('Galaxy system resistance and per-zone resistance retain distinct contexts',()=>{
  let state=located(galaxy,'galaxy-51.46');
  assert.equal(view(galaxy,state).mode,'choice');
  assert.equal(view(galaxy,state).node.id,'galaxy-51.46');
  state=press(galaxy,state,'2','enter');
  const systemKey=view(galaxy,state).setting.key;
  assert.match(systemKey,/system/);
  state=openEmulatorNode(galaxy,state,'galaxy-52.9');
  assert.equal(view(galaxy,state).mode,'selector');
  state=chooseRecord(galaxy,state,'1003');
  assert.equal(view(galaxy,state).node.id,'galaxy-52.9');
  assert.match(view(galaxy,state).setting.key,/zone\|1003/);
  assert.ok(Object.hasOwn(state.values,systemKey));
});

test('Galaxy factory Quick slot three runs same zones operation without Full Menu code shortcuts',()=>{
  let state=createEmulatorState(galaxy,{rootId:'galaxy-quick'});
  state=press(galaxy,state,'3','enter');
  assert.equal(view(galaxy,state).mode,'zones');
  assert.equal(state.rootId,'galaxy-quick');
  state=press(galaxy,state,'back','2','1','enter');
  assert.equal(view(galaxy,state).node.id,'@galaxy-quick');
  assert.match(state.feedback,/not a documented option/);
});

test('helper deep link inserts selector and highlights selection without committing',()=>{
  const option=galaxy.nodes['galaxy-52.1'].choices.find(c=>c.label==='Intruder');
  let state=openEmulatorNode(galaxy,createEmulatorState(galaxy),option.id);
  assert.equal(view(galaxy,state).mode,'selector');
  assert.deepEqual(state.values,{});
  state=chooseRecord(galaxy,state,'1003');
  assert.equal(view(galaxy,state).editor.draft,option.value);
  assert.equal(state.zoneTypes['1003'],'Spare');
  state=press(galaxy,state,'back');
  assert.equal(state.zoneTypes['1003'],'Spare');
});

test('invalid enum value code cannot silently save the last highlighted choice',()=>{
  let state=located(galaxy,'galaxy-52.1','1003');
  state=press(galaxy,state,'9','9','9','enter');
  assert.equal(state.zoneTypes['1003'],'Spare');
  assert.deepEqual(state.values,{});
  assert.match(state.feedback,/not documented/);
});

test('bounded parameters reject bad input, cancel drafts, and isolate records',()=>{
  let state=located(galaxy,'galaxy-51.04','1');
  state=setEmulatorText(galaxy,state,'301');state=press(galaxy,state,'enter');
  assert.deepEqual(state.values,{});assert.match(state.feedback,/0–300/);
  state=setEmulatorText(galaxy,state,'60');state=press(galaxy,state,'enter');
  const savedKey=view(galaxy,state).setting.key;assert.equal(state.values[savedKey],60);
  state=openEmulatorNode(galaxy,state,'galaxy-51.04');state=chooseRecord(galaxy,state,'2');
  state=setEmulatorText(galaxy,state,'90');state=press(galaxy,state,'back');
  assert.equal(state.values[savedKey],60);assert.equal(Object.keys(state.values).length,1);
});

test('Galaxy descriptor escape saves and live zone display reads updated name',()=>{
  let state=located(galaxy,'galaxy-52.2','1002');
  state=setEmulatorText(galaxy,state,'LOBBY PIR');state=press(galaxy,state,'back');
  assert.equal(state.zoneNames['1002'],'LOBBY PIR');
  state=openEmulatorNode(galaxy,state,'galaxy-21');state=press(galaxy,state,'1','0','0','2');
  assert.equal(view(galaxy,state).zone.name,'LOBBY PIR');
});

test('Galaxy physical text picker appends, erases, changes case and saves on escape',()=>{
  let state=located(galaxy,'galaxy-52.2','1002');
  state=setEmulatorText(galaxy,state,'');
  state=press(galaxy,state,'enter','next','enter','star','details','next','enter');
  assert.equal(view(galaxy,state).editor.draft,'Ab');
  assert.equal(state.zoneNames['1002'],'HALL PIR');
  state=press(galaxy,state,'details','enter');
  assert.equal(view(galaxy,state).editor.draft,'Ab');
  assert.match(state.feedback,/Word-library selection is not yet reproduced/);
  state=press(galaxy,state,'back');assert.equal(state.zoneNames['1002'],'Ab');
});

test('documented Galaxy telecom B key erases account digits and dial strings',()=>{
  for(const [id,draft,result] of [['galaxy-56.1.03','123456','12345'],['galaxy-56.1.02','0123*#','0123*']]){
    let state=located(galaxy,id);state=setEmulatorText(galaxy,state,draft);
    state=press(galaxy,state,'previous');assert.equal(view(galaxy,state).editor.draft,result);
    state=press(galaxy,state,'enter');assert.equal(view(galaxy,state).setting.value,result);
  }
});

test('Galaxy signalling selects a trigger before Status and Groups and isolates formats and records',()=>{
  const triggerMenu='galaxy-56.1.01.v2.1',otherFormat='galaxy-56.1.01.v3.1';
  let state=openEmulatorNode(galaxy,createEmulatorState(galaxy),triggerMenu);
  assert.equal(view(galaxy,state).mode,'selector');assert.equal(view(galaxy,state).node.id,triggerMenu);
  state=chooseRecord(galaxy,state,'2');
  assert.equal(view(galaxy,state).mode,'menu');assert.equal(view(galaxy,state).record.label,'Intruder');
  state=press(galaxy,state,'1','enter','1','enter');
  const intruderStatusKey=view(galaxy,state).setting.key;
  assert.equal(state.values[intruderStatusKey],true);assert.match(intruderStatusKey,/trigger\|2\|/);
  state=press(galaxy,state,'back','2','enter','1','enter');
  const intruderGroupsKey=view(galaxy,state).setting.key;
  assert.equal(view(galaxy,state).context.trigger,'2');assert.equal(state.values[intruderGroupsKey]['group-1'],true);
  state=openEmulatorNode(galaxy,state,triggerMenu);state=chooseRecord(galaxy,state,'6');
  state=press(galaxy,state,'1','enter','0','enter');
  assert.equal(view(galaxy,state).record.label,'Fire');assert.equal(view(galaxy,state).setting.value,false);
  assert.notEqual(view(galaxy,state).setting.key,intruderStatusKey);
  state=openEmulatorNode(galaxy,state,otherFormat);state=chooseRecord(galaxy,state,'2');
  state=press(galaxy,state,'1','enter');
  assert.equal(view(galaxy,state).setting.value,null);
  assert.equal(state.values[intruderStatusKey],true);assert.equal(state.values[intruderGroupsKey]['group-1'],true);
});

test('Galaxy telecom Group Settings selects the group before telephone and account fields',()=>{
  let state=openEmulatorNode(galaxy,createEmulatorState(galaxy),'galaxy-56.1.01.v2.2');
  assert.equal(view(galaxy,state).mode,'selector');assert.equal(view(galaxy,state).screen.heading,'Select group');
  state=chooseRecord(galaxy,state,'3');state=press(galaxy,state,'1','enter');
  state=setEmulatorText(galaxy,state,'01234567890');state=press(galaxy,state,'enter');
  assert.equal(view(galaxy,state).context.group,'3');
  assert.match(view(galaxy,state).setting.key,/group\|3\|/);
  state=press(galaxy,state,'back','2','enter');
  assert.equal(view(galaxy,state).context.group,'3');
  assert.equal(view(galaxy,state).mode,'text');
});

test('Orisec text picker can discard a draft and helper saves through both text menu aliases',()=>{
  let state=located(orisec,'program-zone-programming-zone-text','02');
  const original=state.zoneNames['02'];state=setEmulatorText(orisec,state,'');
  state=press(orisec,state,'right','enter','left','enter');
  assert.equal(view(orisec,state).editor.draft,'BA');
  state=press(orisec,state,'back');assert.equal(state.zoneNames['02'],original);
  state=press(orisec,state,'enter');state=setEmulatorText(orisec,state,'OFFICE PIR');
  state=applyEmulatorEdit(orisec,state);assert.equal(state.zoneNames['02'],'OFFICE PIR');
  assert.equal(view(orisec,state).record.label,'OFFICE PIR');
  state=openEmulatorNode(orisec,state,'program-system-text-zone-text');state=chooseRecord(orisec,state,'02');
  assert.equal(view(orisec,state).editor.draft,'OFFICE PIR');
  state=setEmulatorText(orisec,state,'STORE PIR');state=applyEmulatorEdit(orisec,state);
  state=restoreEmulatorState(orisec,JSON.parse(JSON.stringify(state)));
  state=openEmulatorNode(orisec,state,'program-zone-programming-zone-text');state=chooseRecord(orisec,state,'02');
  assert.equal(view(orisec,state).editor.draft,'STORE PIR');
  assert.equal(state.zoneNames['02'],'STORE PIR');
  assert.equal(view(orisec,state).record.label,'STORE PIR');
  assert.equal(Object.keys(state.values).filter(key=>key.startsWith('program-zone-programming-zone-text|zone|02|')).length,1);
});

test('disabled and enabled omission values update the detector binding as booleans',()=>{
  let state=located(galaxy,'galaxy-52.4','1002');
  state=press(galaxy,state,'0','enter');assert.equal(state.zoneOmitEnabled['1002'],false);
  state=press(galaxy,state,'enter','1','enter');assert.equal(state.zoneOmitEnabled['1002'],true);
});

test('Galaxy Time/Date physical A and B keys select correct clock fields',()=>{
  let state=located(galaxy,'galaxy-41');
  state=press(galaxy,state,'next');assert.equal(view(galaxy,state).node.id,'galaxy-41.time');
  state=openEmulatorNode(galaxy,state,'galaxy-41');state=press(galaxy,state,'previous');
  assert.equal(view(galaxy,state).node.id,'galaxy-41.date');
  state=setEmulatorText(galaxy,state,'310226');state=press(galaxy,state,'enter');
  assert.match(state.feedback,/valid calendar date/);assert.deepEqual(state.values,{});
});

test('clock editors reject impossible dates and preserve accepted calendar values',()=>{
  let state=located(galaxy,'galaxy-41.date');
  state=setEmulatorText(galaxy,state,'290226');state=applyEmulatorEdit(galaxy,state);
  assert.match(state.feedback,/valid calendar date/);assert.deepEqual(state.values,{});
  state=setEmulatorText(galaxy,state,'290228');state=applyEmulatorEdit(galaxy,state);
  assert.equal(view(galaxy,state).setting.value,'290228');
  state=openEmulatorNode(galaxy,state,'galaxy-41.time');
  state=setEmulatorText(galaxy,state,'2460');state=applyEmulatorEdit(galaxy,state);
  assert.match(state.feedback,/24-hour time/);
  state=setEmulatorText(galaxy,state,'2359');state=applyEmulatorEdit(galaxy,state);
  assert.equal(view(galaxy,state).setting.value,'2359');
  let calendar=located(scan,'i-partitions-calendar-set-add-exception-exception-start-date');
  while(view(scan,calendar).mode==='selector')calendar=press(scan,calendar,'enter');
  calendar=setEmulatorText(scan,calendar,'3104');calendar=applyEmulatorEdit(scan,calendar);
  assert.match(calendar.feedback,/valid day and month/);
  calendar=setEmulatorText(scan,calendar,'2902');calendar=applyEmulatorEdit(scan,calendar);
  assert.equal(view(scan,calendar).setting.value,'2902');
});

test('Texecom Zone Setup scrolls records, Yes steps fields, No edits',()=>{
  let state=press(tex,createEmulatorState(tex),'1','enter');
  assert.equal(view(tex,state).mode,'selector');
  state=press(tex,state,'enter');assert.equal(view(tex,state).mode,'fields');
  state=press(tex,state,'next');assert.equal(view(tex,state).record.id,'002');
  state=press(tex,state,'enter');assert.equal(view(tex,state).node.id,'zone-attrib1');
  state=press(tex,state,'change');assert.equal(view(tex,state).editor.kind,'flags');
  state=press(tex,state,'1','enter');assert.ok(Object.keys(state.values).length);
  state=press(tex,state,'enter');assert.equal(view(tex,state).node.id,'zone-attrib2');
  assert.equal(state.zoneTypes['001'],'Entry/Exit 1');
});

test('Texecom helper jumps preserve sequential field interaction',()=>{
  let state=located(tex,'zone-text','003');
  assert.equal(view(tex,state).mode,'fields');
  assert.equal(view(tex,state).node.id,'zone-text');
  state=press(tex,state,'change');state=setEmulatorText(tex,state,'OFFICE PIR');state=press(tex,state,'enter');
  assert.equal(state.zoneNames['003'],'OFFICE PIR');
  assert.equal(view(tex,state).mode,'fields');
  state=press(tex,state,'next');assert.equal(view(tex,state).record.id,'004');
});

test('ordinary omission and diagnostic disable remain separate on Texecom',()=>{
  let state=located(tex,'arm-omit');state=press(tex,state,'omit','back');
  assert.equal(state.omittedZones['001'],true);
  state=openEmulatorNode(tex,state,'util-zone-status');state=press(tex,state,'next','omit');
  assert.equal(state.diagnosticOmissions['002'],true);assert.equal(state.omittedZones['002'],false);
  state=press(tex,state,'back');assert.deepEqual(state.diagnosticOmissions,{});assert.equal(state.omittedZones['001'],true);
});

test('event views filter alarm, mandatory, non-mandatory and chime records before scrolling',()=>{
  const events=[
    {label:'Zone restored',time:'12:01'},
    {label:'Intruder alarm',time:'12:02',logs:['alarm','mandatory']},
    {label:'Chime on',time:'12:03',logs:['chime']},
    {label:'Mandatory fixture',time:'12:04',category:'mandatory'},
  ];
  for(const [model,id,first,second] of [
    [tex,'util-log-2','Intruder alarm','Intruder alarm'],
    [scan,'i-log-mandatory-events','Intruder alarm','Mandatory fixture'],
    [scan,'i-log-non-mand-events','Zone restored','Chime on'],
    [orisec,'logs-view-chime-log','Chime on','Chime on'],
  ]){
    let state=located(model,id);state.events=events;
    assert.match(view(model,state).screen.lines[0],new RegExp(first),id);
    state=press(model,state,model.profile.reverseLogScroll?'previous':'next');
    assert.match(view(model,state).screen.lines[0],new RegExp(second),id);
  }
});

test('Scantronic scroll menus reject invented chapter numbers and Type has documented shortcuts',()=>{
  let state=press(scan,createEmulatorState(scan),'1');
  assert.equal(state.digits,'');assert.match(state.feedback,/scrolling/);
  state=openEmulatorNode(scan,state,'i-zone-type');assert.equal(view(scan,state).mode,'selector');
  state=chooseRecord(scan,state,'002');assert.equal(view(scan,state).mode,'choice');
  state=press(scan,state,'0','5','enter');assert.equal(state.zoneTypes['002'],'Final Exit');
  assert.equal(state.zoneTypes['001'],'Normal Alarm');
});

test('Scantronic omission is a draft until tick; leaving and resuming safely discards it',()=>{
  let state=located(scan,'user-v7-omit-zones');state=press(scan,state,'right');
  assert.equal(state.omittedZones['001'],false);assert.equal(state.draftOmissions['001'],true);
  state=leaveEmulator(scan,state);assert.equal(state.draftOmissions,null);
  state=press(scan,state,'right','enter');assert.equal(state.omittedZones['001'],true);
  state=openEmulatorNode(scan,state,'user-v7-omit-zones');state=press(scan,state,'right','back');
  assert.equal(state.omittedZones['001'],true);
});

test('Scantronic installer exit checks faults and commits accepted settings',()=>{
  let state=located(scan,'i-zone-type','001');state=press(scan,state,'0','5','enter');
  assert.equal(state.changed,true);assert.equal(Object.keys(state.committedValues).length,0);
  state=setEmulatorZone(scan,state,'001','tamper');state=press(scan,state,'logout','enter');
  assert.equal(state.loggedOut,false);assert.match(state.feedback,/Restore/);
  state=setEmulatorZone(scan,state,'001','secure');state=press(scan,state,'logout','enter');
  assert.equal(state.loggedOut,true);assert.equal(state.changed,false);assert.deepEqual(state.committedValues,state.values);
});

test('Orisec programming menu00 opens real zone record; top-level numeric shortcuts stay disabled',()=>{
  let state=createEmulatorState(orisec);state=press(orisec,state,'0');
  assert.equal(state.digits,'');
  state=press(orisec,state,'enter','0','0','enter');assert.equal(view(orisec,state).mode,'selector');
  state=chooseRecord(orisec,state,'02');state=press(orisec,state,'enter');
  assert.equal(view(orisec,state).node.id,'program-zone-programming-zone-type');
  state=press(orisec,state,'0','5','enter');assert.equal(state.zoneTypes['02'],'Perimeter');
});

test('output tests stop on back, root switch, leave, and persisted-session restoration',()=>{
  let state=located(orisec,'tests-test-bell-strobe');state=press(orisec,state,'right');
  assert.equal(state.outputStates.Bell,true);
  assert.equal(leaveEmulator(orisec,state).outputStates.Bell,false);
  assert.equal(setEmulatorRoot(orisec,state,'user').outputStates.Bell,false);
  assert.equal(restoreEmulatorState(orisec,state).outputStates.Bell,false);
  state=press(orisec,state,'back');assert.equal(state.outputStates.Bell,false);
});

test('walk tests record detector transitions and stop on leaving a menu',()=>{
  for(const [model,id] of [[galaxy,'galaxy-31.2.1.1'],[scan,'i-walk-system'],[orisec,'tests-walk-test-zones']]){
    let state=located(model,id);const zone=model.profile.zones[1].address;
    assert.equal(state.walk.running,true,model.id);
    state=setEmulatorZone(model,state,zone,'active');state=setEmulatorZone(model,state,zone,'secure');
    assert.deepEqual(state.walk.hits,[zone]);
    state=press(model,state,'back');assert.equal(state.walk.running,false);
    assert.deepEqual(state.walk.hits,[zone]);
  }
});

test('Galaxy walk result lists actually scroll independently of zone context',()=>{
  let state=located(galaxy,'galaxy-31.1.1');const before=view(galaxy,state).screen.lines[1];
  state=press(galaxy,state,'next');assert.notEqual(view(galaxy,state).screen.lines[1],before);
});

test('saved emulator settings and omissions survive validation but transient edits do not',()=>{
  let state=located(orisec,'program-zone-programming-zone-type','03');state=press(orisec,state,'0','5','enter');
  state=openEmulatorNode(orisec,state,'user-omit');state=press(orisec,state,'right');
  state=openEmulatorNode(orisec,state,'program-zone-programming-zone-text');state=chooseRecord(orisec,state,'02');
  state=setEmulatorText(orisec,state,'UNSAVED');
  const restored=restoreEmulatorState(orisec,JSON.parse(JSON.stringify(state)));
  assert.equal(restored.zoneTypes['03'],'Perimeter');assert.equal(restored.omittedZones['01'],true);
  assert.notEqual(restored.zoneNames['02'],'UNSAVED');assert.equal(restored.editor,null);
  assert.deepEqual(restored.values,state.values);assert.equal(restored.walk.running,false);
});

test('fictional arming, omission, detector alarm, and disarm affect one panel state',()=>{
  let state=located(tex,'arm-omit');state=press(tex,state,'omit','back');
  state=openEmulatorNode(tex,state,'arm-arm');state=press(tex,state,'enter','enter');assert.equal(state.armed,true);
  state=setEmulatorZone(tex,state,'001','active');assert.equal(state.alarm,false);
  state=setEmulatorZone(tex,state,'002','active');assert.equal(state.alarm,true);
  assert.ok(state.events.some(e=>e.label==='Intruder alarm'&&e.zone==='002'));
  state=openEmulatorNode(tex,state,'arm-disarm');state=press(tex,state,'enter','enter');
  assert.equal(state.armed,false);assert.equal(state.omittedZones['001'],false);
});

test('Galaxy forced setting requires permission and never partially omits a rejected set',()=>{
  let state=located(galaxy,'galaxy-52.4','1002');state=press(galaxy,state,'0','enter');
  state=setEmulatorZone(galaxy,state,'1001','active');state=setEmulatorZone(galaxy,state,'1002','active');
  state=openEmulatorNode(galaxy,state,'galaxy-14');state=press(galaxy,state,'enter','enter');
  assert.equal(state.armed,false);assert.match(state.feedback,/requires.*Forced/);
  assert.equal(state.omittedZones['1001'],false);
  state=openEmulatorNode(galaxy,state,'galaxy-51.26');state=press(galaxy,state,'1','enter');
  state=openEmulatorNode(galaxy,state,'galaxy-14');state=press(galaxy,state,'enter','enter');
  assert.equal(state.armed,false);assert.match(state.feedback,/1002 cannot be omitted/);
  assert.equal(state.omittedZones['1001'],false);
  state=setEmulatorZone(galaxy,state,'1002','secure');state=press(galaxy,state,'enter','enter');
  assert.equal(state.armed,true);assert.equal(state.omittedZones['1001'],true);
});

test('selected-zone walk test does not count or claim an unselected detector',()=>{
  let state=located(galaxy,'galaxy-31.2.1.2');state=press(galaxy,state,'details','enter');
  assert.deepEqual(state.walk.allowed,['1001']);
  state=setEmulatorZone(galaxy,state,'1002','active');assert.deepEqual(state.walk.hits,[]);
  assert.doesNotMatch(state.feedback,/registered in walk test/);
  state=setEmulatorZone(galaxy,state,'1001','active');assert.deepEqual(state.walk.hits,['1001']);
});

test('all reachable menus can open, render, and leave without treating selection values as numbered menus',()=>{
  for(const model of Object.values(models)){
    for(const node of model.reachable.map(id=>model.nodes[id])){
      let state=openEmulatorNode(model,createEmulatorState(model),node.id);
      let budget=15;while(view(model,state).mode==='selector'&&view(model,state).records.length&&budget--)state=press(model,state,'enter');
      assert.ok(budget>0,model.id+' '+node.id);
      if(view(model,state).mode==='selector'&&!view(model,state).records.length){state=press(model,state,'enter');assert.match(state.feedback,/No fitted demo records/,node.id);}
      assert.ok(Array.isArray(view(model,state).screen.lines),node.id);
      state=press(model,state,'back');assert.ok(view(model,state).screen.heading,node.id);
    }
  }
});
