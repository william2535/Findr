import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildEmulatorModel,createEmulatorState,pressEmulatorKey,openEmulatorNode,setEmulatorRoot,setEmulatorZone,restoreEmulatorState,emulatorView,setEmulatorText,applyEmulatorEdit} from '../public/app/emulator-engine.mjs';
import {startHints,advanceHints} from '../public/app/emulator-hints.mjs';
import {createPracticeState,pressPracticeKey,setPracticeZone,currentNode} from '../public/app/practice-engine.mjs';
import {prepareMenuMap,validateMenuMap} from '../public/app/menu-map-engine.mjs';
const json=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const map=json('../public/app/data/menu-maps/ade-accenta-optima.json');
const profile=json('../research/expansion-0.9.0/ade-profile.json');
const model=buildEmulatorModel(map,profile);
const press=(state,...keys)=>keys.flat().reduce((next,key)=>pressEmulatorKey(model,next,key),state);
const view=state=>emulatorView(model,state);
const fresh=()=>createEmulatorState(model);
const locate=id=>openEmulatorNode(model,fresh(),id);
const stored=(state,id)=>state.values[(model.nodes[id].valueKey||id)+'|system||'];
const zoneMask=(state,id)=>Object.fromEntries(model.nodes[id].choices.map(choice=>[choice.code,Boolean((stored(state,id)||model.nodes[id].defaultValue)[choice.id]) ]));
const savedFields=state=>JSON.stringify(Object.fromEntries(['values','committedValues','zoneNames','zoneTypes','zoneOmitEnabled','omittedZones','armed','armingMode','chime'].map(key=>[key,state[key]])));

test('ADE sources pin the matching G4 LCD editions, every factual node and the real key inventory',()=>{
  assert.deepEqual(validateMenuMap(prepareMenuMap(map)),[]);
  assert.match(map.sources[0].edition,/IU1-0040 Rev 1.0.*IE1-0040 Rev 1.1/);
  assert.equal(map.sources[0].totalPdfPages,80);
  assert.deepEqual(model.rootById['a-engineer'].nodeIds.map(id=>model.nodes[id].code),['0','1','2','3','4','6','7','8','C','O','P']);
  assert.equal(profile.keys.filter(key=>['▲','▼'].includes(key.label)).length,1);
  assert.ok(profile.keys.some(key=>key.id==='next'&&key.label==='▲'));
  assert.ok(!profile.keys.some(key=>['previous','left','right','change','details'].includes(key.id)));
  assert.equal(model.nodes['a-e6'].choices.length,25);
  assert.ok(!model.nodes['a-e6'].choices.some(choice=>choice.label==='Library'));
  for(const node of map.nodes.filter(node=>['reference','selection'].includes(node.kind)))assert.equal(node.address,undefined,node.id);
  assert.equal(model.nodes['a-eC-led'].mode,'info');
});

test('ADE immediate local menus, function-letter shortcuts and engineer8 SET distinction follow the sources',()=>{
  let state=press(fresh(),'7','1');assert.equal(view(state).node.id,'a-e7-1');
  state=press(fresh(),'program','2','5');assert.equal(view(state).node.id,'a-eP-2-exit');
  state=press(fresh(),'8');assert.equal(view(state).node.id,'@a-engineer');
  state=press(state,'enter','1');assert.equal(view(state).node.id,'a-e8-1');
  state=setEmulatorRoot(model,fresh(),'a-user1');state=press(state,'8','2');assert.equal(view(state).node.id,'a-user1-code2');
  state=setEmulatorRoot(model,fresh(),'a-user2');state=press(state,'8');assert.equal(view(state).node.id,'a-user2-code2');
  assert.ok(!model.rootById['a-user1'].nodeIds.includes('a-e8-3'));
  state=press(fresh(),'chime','1');assert.equal(view(state).node.id,'a-eC-lcd');
});

test('ADE numeric output controls select and toggle, zero clears all, and RESET exits with outputs off',()=>{
  let state=press(fresh(),'1','3');
  assert.equal(state.outputStates.Sounder,true);assert.equal(view(state).cursor,2);
  state=press(state,'enter');assert.equal(state.outputStates.Sounder,false);
  state=press(state,'1','2');assert.equal(state.outputStates.Bell,true);assert.equal(state.outputStates.Strobe,true);
  state=press(state,'0');assert.ok(Object.values(state.outputStates).every(value=>value===false));
  state=press(state,'1','back');assert.ok(Object.values(state.outputStates).every(value=>value===false));
  state=press(fresh(),'2','5');assert.equal(state.outputStates.Abort,true);assert.equal(view(state).cursor,4);
  state=press(state,'back');assert.ok(Object.values(state.outputStates).every(value=>value===false));
});

test('ADE walk test registers real fixture activation, SET restarts and RESET stops',()=>{
  let state=press(fresh(),'0');assert.equal(state.walk.running,true);
  state=setEmulatorZone(model,state,'2','active');assert.ok(state.walk.hits.includes('2'));
  assert.match(view(state).screen.lines[1],/^01000000/);
  state=press(state,'enter');assert.deepEqual(state.walk.hits,[]);assert.equal(state.walk.running,true);
  state=setEmulatorZone(model,state,'2','secure');state=setEmulatorZone(model,state,'2','active');
  state=press(state,'back');assert.equal(state.walk.running,false);assert.equal(view(state).node.id,'@a-engineer');
});

test('ADE flags use 9 all ON, 0 all OFF, numeric selection/toggle, SET save and RESET cancel',()=>{
  let state=press(fresh(),'3','1','9');assert.ok(Object.values(state.editor.draft).every(Boolean));
  state=press(state,'0');assert.ok(Object.values(state.editor.draft).every(value=>!value));
  state=press(state,'4');assert.equal(state.editor.cursor,3);assert.equal(state.editor.draft['a-e3-1-f4'],true);
  state=press(state,'back');assert.equal(stored(state,'a-e3-1'),undefined);
  state=press(state,'1','4','enter');assert.equal(stored(state,'a-e3-1')['a-e3-1-f4'],true);
  assert.equal(view(state).node.id,'a-e3');
});

test('ADE Omit Allow and Double Knock save on RESET; fire zones cannot receive Double Knock',()=>{
  let state=press(fresh(),'omit','2','2');assert.equal(state.editor.draft['a-eO-2-z2'],false);
  state=press(state,'back');assert.equal(state.zoneOmitEnabled['2'],false);
  state=openEmulatorNode(model,state,'a-eO-1');state=press(state,'8');assert.match(state.feedback,/Fire zone/);assert.equal(state.editor.draft['a-eO-1-z8'],false);
  state=press(state,'9');assert.equal(state.editor.draft['a-eO-1-z7'],true);assert.equal(state.editor.draft['a-eO-1-z8'],false);
  state=press(state,'0','chime','back');assert.equal(stored(state,'a-eO-1')['a-eO-1-z8'],false);
});

test('ADE programme masks maintain used/timed/inhibit dependencies and programme1 always retains a used zone',()=>{
  let state=press(fresh(),'program','1','2','2','back');
  assert.equal(zoneMask(state,'a-eP-1-timed')['2'],true);
  assert.equal(zoneMask(state,'a-eP-1-used')['2'],true);
  assert.equal(zoneMask(state,'a-eP-1-inhibit')['2'],false);
  state=press(state,'1','2','back');
  assert.equal(zoneMask(state,'a-eP-1-used')['2'],false);
  assert.equal(zoneMask(state,'a-eP-1-timed')['2'],false);
  assert.equal(zoneMask(state,'a-eP-1-inhibit')['2'],false);
  state=openEmulatorNode(model,state,'a-eP-1-used');
  for(const key of ['1','3','4','5','6','7','8'])state=press(state,key);
  state=press(state,'back');
  assert.deepEqual(Object.entries(zoneMask(state,'a-eP-1-used')).filter(([,on])=>on).map(([zone])=>zone),['1']);
  assert.equal(zoneMask(state,'a-eP-2-used')['2'],true,'Programme2 is independent');
});

test('ADE programme exit modes reject disabling programme1 and enforce the documented Final Door prerequisite',()=>{
  let state=locate('a-eP-1-mode');state=press(state,'0');assert.match(state.feedback,/not available/);assert.equal(state.editor.draft,'1');
  state=locate('a-eP-2-timed');state=press(state,'1','back');
  state=press(state,'6','2','back');assert.match(state.feedback,/timed zone/);assert.equal(view(state).node.id,'a-eP-2-mode');
  state=press(state,'0','back');assert.equal(stored(state,'a-eP-2-mode'),'0');
  state=setEmulatorRoot(model,state,'a-setting-root');state=press(state,'program','2');assert.match(state.feedback,/disabled/);
});

test('ADE timer cursor overwrite, OMIT restart and entry/exit 00 special value are exact',()=>{
  let state=press(fresh(),'7','1','2','0','enter');assert.equal(stored(state,'a-e7-1'),20);
  state=press(state,'1','4','omit','1','8','enter');assert.equal(stored(state,'a-e7-1'),18);
  state=press(state,'1','0','0','enter');assert.match(state.feedback,/1–99/);assert.ok(state.editor);
  state=press(state,'back');assert.equal(stored(state,'a-e7-1'),18);
  state=press(fresh(),'program','3','4','0','0');assert.match(view(state).screen.lines.join(' '),/5 seconds/);
  state=press(state,'enter');assert.equal(stored(state,'a-eP-3-entry'),0);
  state=press(state,'5','9','9');assert.match(view(state).screen.lines.join(' '),/990 seconds/);
});

test('ADE clock is HHMMSS then DDMMYY with validation and persistent shared user/engineer values',()=>{
  let state=press(fresh(),'4',...'235959','enter');
  assert.equal(stored(state,'a-e4-time'),'235959');assert.equal(state.editor.nodeId,'a-e4-date');
  state=press(state,...'310226','enter');assert.match(state.feedback,/valid calendar date/);
  state=press(state,'back');assert.equal(stored(state,'a-e4-date'),undefined);
  state=openEmulatorNode(model,state,'a-user1-clock');assert.equal(state.editor.draft,'235959');
  state=setEmulatorText(model,state,'246000');state=applyEmulatorEdit(model,state);assert.match(state.feedback,/HHMMSS/);assert.ok(state.editor);
  state=setEmulatorText(model,state,'081530');state=press(state,'enter',...'291026','enter');
  assert.equal(stored(state,'a-e4-time'),'081530');assert.equal(stored(state,'a-e4-date'),'291026');
  const restored=restoreEmulatorState(model,state);assert.equal(stored(restored,'a-e4-time'),'081530');
});

test('ADE names cycle only the fixed library, advance zone with ▲ and persist only on RESET',()=>{
  let state=press(fresh(),'6');assert.equal(view(state).context.zone,'1');
  state=press(state,'enter');assert.equal(state.zoneNames['1'],'Front Door');
  assert.equal(state.runtimeState.adeNames.values['1'],'Garage');
  state=press(state,'next','enter');assert.equal(view(state).context.zone,'2');assert.equal(state.runtimeState.adeNames.values['2'],'Kitchen');
  state=press(state,'back');assert.equal(state.zoneNames['1'],'Garage');assert.equal(state.zoneNames['2'],'Kitchen');
  const restored=restoreEmulatorState(model,state);assert.equal(restored.zoneNames['2'],'Kitchen');
  assert.equal(restored.values['ade-zone-names|zone|2|'],'Kitchen');
});

test('ADE codes auto-save at four digits, share roles, reject duplicates and delete only eligible records',()=>{
  let state=press(fresh(),'8','enter','1',...'2468');assert.equal(stored(state,'a-e8-1'),'2468');assert.match(view(state).screen.lines.join(' '),/Code Saved/);
  state=openEmulatorNode(model,state,'a-e8-2');state=press(state,...'2468');assert.match(state.feedback,/already in use/);assert.equal(stored(state,'a-e8-2'),undefined);
  state=press(state,...'1357');assert.equal(stored(state,'a-e8-2'),'1357');
  state=openEmulatorNode(model,state,'a-user2-code2');state=press(state,'omit');assert.equal(stored(state,'a-e8-2'),'');assert.match(view(state).screen.lines.join(' '),/Code Deleted/);
  state=openEmulatorNode(model,state,'a-e8-1');state=press(state,'omit');assert.equal(stored(state,'a-e8-1'),'2468');assert.match(state.feedback,/cannot be deleted/);
});

test('ADE LCD log uses ▲ older, OMIT newer, SET details, PROG three-digit jump, and source event phrases',()=>{
  let state=press(fresh(),'chime','1','next','next','enter');
  assert.match(view(state).screen.lines.join(' '),/248>INTRUDER.*Hall/);
  state=press(state,'omit');assert.match(view(state).screen.lines[0],/249>MAINS OK/);assert.equal(state.details,false);
  state=press(state,'program','2','4','7','enter','enter');assert.match(view(state).screen.lines.join(' '),/247>MAINS FAIL.*power failure/);
  state=press(state,'program','0','0','1','enter');assert.match(state.feedback,/present in this fictional log/);
  state=press(state,'back','back','back');assert.equal(view(state).node.id,'@a-engineer');
  assert.equal(model.config.eventCapacity,250);
});

test('ADE omission is idempotent, requires Used plus Omit Allow, SET continues setting, four-digit unset restores',()=>{
  let state=setEmulatorRoot(model,fresh(),'a-setting-root');state=press(state,'omit','2','2');assert.equal(state.omittedZones['2'],true);
  state=press(state,'8');assert.equal(state.omittedZones['8'],false);assert.match(state.feedback,/not both Used/);
  state=press(state,'enter');assert.equal(state.armed,true);
  const before=state.omittedZones['2'];state=setEmulatorRoot(model,state,'a-unset-root');assert.equal(state.omittedZones['2'],before,'Opening the context cannot silently perform unsetting');
  state=press(state,'2','4','6');assert.equal(state.armed,true);
  state=press(state,'8');assert.equal(state.armed,false);assert.ok(Object.values(state.omittedZones).every(value=>!value));
  state=openEmulatorNode(model,state,'a-eP-1-used');state=press(state,'2','back');
  state=setEmulatorRoot(model,state,'a-setting-root');state=press(state,'omit','2');assert.equal(state.omittedZones['2'],false);assert.match(state.feedback,/not both Used/);
});

test('ADE an unused zone cannot create an intruder alarm in the selected setting programme',()=>{
  let state=locate('a-eP-2-used');state=press(state,'5','back');
  state=setEmulatorRoot(model,state,'a-setting-root');state=press(state,'program','2','enter');assert.equal(state.armed,true);assert.equal(state.armingMode,'Program 2');
  state=setEmulatorZone(model,state,'5','active');assert.equal(state.alarm,false);
  state=setEmulatorZone(model,state,'3','active');assert.equal(state.alarm,true);
  const restored=restoreEmulatorState(model,state);assert.equal(restored.armingMode,'Program 2');
});

test('ADE day CHIME uses zone digits and RESET stores; engineer RESET leaves without invented confirmation',()=>{
  let state=setEmulatorRoot(model,fresh(),'a-day-root');state=press(state,'chime','2','back');assert.equal(stored(state,'a-day-chime')['a-day-chime-z2'],true);assert.equal(state.chime,true);
  state=press(fresh(),'back');assert.equal(state.loggedOut,true);assert.equal(state.confirm,null);
  state=press(fresh(),'pa-left','pa-right');assert.equal(state.alarm,false);assert.match(state.feedback,/not reproduced/);
});

test('ADE Day SET follows the Single Key Set flag rather than always starting setting',()=>{
  let state=setEmulatorRoot(model,fresh(),'a-day-root');state=press(state,'enter');assert.equal(view(state).node.id,'a-day');assert.match(state.feedback,/not enabled/);
  state=openEmulatorNode(model,state,'a-e3-2');state=press(state,'1','enter');
  state=setEmulatorRoot(model,state,'a-day-root');state=press(state,'enter');assert.equal(view(state).node.id,'a-setting');assert.equal(state.armed,false);
  state=press(state,'enter');assert.equal(state.armed,true);
});

test('ADE SHOW HINTS uses physical keys, reaches deep menu targets and never saves configuration or unsets',()=>{
  for(const target of ['a-eP-2-exit','a-e8-3','a-eO-2','a-eC-lcd','a-e4-date','a-e6','a-setting-omit','a-unset']) {
    const initial=fresh();initial.omittedZones['2']=true;
    const before=savedFields(initial);
    let {state,hint}=startHints(model,initial,target);
    assert.equal(savedFields(state),before,target+' starting hints changed state');
    let steps=0;
    while(hint.status==='active'&&steps++<60) {
      assert.ok(profile.keys.some(key=>key.id===hint.nextKey),target+' has nonphysical key '+hint.nextKey);
      const next=pressEmulatorKey(model,state,hint.nextKey);hint=advanceHints(model,hint,state,next,hint.nextKey);state=next;
      assert.equal(savedFields(state),before,target+' changed a setting');
    }
    assert.equal(hint.status,'complete',target+': '+hint.message);
    assert.equal(view(state).node.id,target);
  }
});

test('All seven ADE guided lessons finish using their documented physical controls',()=>{
  const p=(state,...keys)=>keys.flat().reduce((next,key)=>pressPracticeKey(profile,next,key),state);
  for(const [task,zone] of [['omit-zone','2'],['omit-garage','5']]) {
    let state=p(createPracticeState(profile,task),'omit',zone,'enter');assert.equal(state.complete,true,task);assert.equal(state.omittedZones[zone],true);
  }
  let state=p(createPracticeState(profile,'find-last-alarm'),'chime','1','next','next','enter');assert.equal(state.complete,true,'last alarm');
  state=p(createPracticeState(profile,'find-mains-fault'),'chime','1','next','next','next','enter');assert.equal(state.complete,true,'mains failure');
  state=p(createPracticeState(profile,'walk-test-pir'),'0');assert.equal(currentNode(profile,state).kind,'walk-run');
  state=setPracticeZone(profile,state,'2','active');state=p(state,'back');assert.equal(state.complete,true,'walk');
  state=p(createPracticeState(profile,'bell-test'),'1','1','0','back');assert.equal(state.complete,true,'bell');assert.ok(Object.values(state.bell).every(value=>!value));
  state=p(createPracticeState(profile,'leave-engineering'),'back');assert.equal(state.complete,true,'exit');
});
