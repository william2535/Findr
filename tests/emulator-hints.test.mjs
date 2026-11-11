import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildEmulatorModel,createEmulatorState,pressEmulatorKey,emulatorView,setEmulatorRoot} from '../public/app/emulator-engine.mjs';
import {startHints,advanceHints,hintKeyLabel} from '../public/app/emulator-hints.mjs';
import {keypadFace} from '../public/app/practice.mjs';

const profiles=JSON.parse(fs.readFileSync(new URL('../public/app/data/practice.json',import.meta.url))).profiles;
const models=Object.fromEntries(profiles.map(profile=>[profile.id,buildEmulatorModel(JSON.parse(fs.readFileSync(new URL('../public/app/data/menu-maps/'+profile.id+'.json',import.meta.url))),profile)]));
const galaxy=models['galaxy-dimension'],tex=models['texecom-premier-elite'],scan=models['scantronic-ion'],orisec=models['orisec-cp'];
const saved=state=>JSON.stringify(Object.fromEntries(['values','committedValues','zoneNames','zoneTypes','zoneOmitEnabled','omittedZones','armed','chime','alarm'].map(key=>[key,state[key]])));
const physical=model=>new Set([...keypadFace(model.profile,{heading:'Test',lines:['Test']},{}).matchAll(/data-key="([^"]+)"/g)].map(m=>m[1]));
function replay(model,run,limit=100){
  let {state,hint}=run;const keys=[],events=[];const before=saved(state),buttons=physical(model);
  while(hint.status==='active'&&keys.length<limit){
    assert(buttons.has(hint.nextKey),'A highlighted physical button exists: '+model.id+' '+hint.nextKey);
    const key=hint.nextKey,next=pressEmulatorKey(model,state,key);
    hint=advanceHints(model,hint,state,next,key);state=next;keys.push(key);events.push(hint.event);
    assert.equal(saved(state),before,'A navigation hint cannot save a value or execute a command');
  }
  assert.notEqual(hint.status,'active','The route terminates');
  return {state,hint,keys,events};
}
function step(model,run,key){const next=pressEmulatorKey(model,run.state,key);return {state:next,hint:advanceHints(model,run.hint,run.state,next,key)};}

test('SHOW HINTS starts at the access menu and never jumps or presses a key itself',()=>{
  let previous=pressEmulatorKey(galaxy,createEmulatorState(galaxy),'next');
  const before=structuredClone(previous),run=startHints(galaxy,previous,'galaxy-21');
  assert.deepEqual(previous,before);assert.equal(run.state.steps,previous.steps);
  assert.equal(run.state.trail.length,1);assert.equal(run.hint.completedSteps,0);assert.equal(run.hint.event,'none');
  assert.equal(run.hint.nextKey,'2');assert.equal(run.hint.nextLabel,'2');assert.equal(run.hint.remainingSteps,3);
});

test('Galaxy Full Menu uses its shortest documented two-digit route and stops on arrival',()=>{
  const run=startHints(galaxy,createEmulatorState(galaxy),'galaxy-21');
  assert.deepEqual(run.hint.keys,['2','1','enter']);
  const done=replay(galaxy,run);assert.equal(done.hint.status,'complete');assert.equal(done.hint.completedSteps,3);
  assert.equal(emulatorView(galaxy,done.state).node.id,'galaxy-21');assert.equal(done.hint.event,'complete');
});

test('Full Menu source entries never borrow a configurable Quick Menu slot',()=>{
  const state=createEmulatorState(galaxy,{rootId:'galaxy-quick'});
  const run=startHints(galaxy,state,'galaxy-21');assert.equal(run.state.rootId,'galaxy-engineer-full');
  assert.deepEqual(run.hint.keys,['2','1','enter']);
  const quick=startHints(galaxy,state,'galaxy-quick.3');assert.equal(quick.state.rootId,'galaxy-quick');
  assert.deepEqual(quick.hint.keys,['3','enter']);replay(galaxy,quick);
});

test('Galaxy record selection precedes a nested field and uses the selected zone',()=>{
  const run=startHints(galaxy,createEmulatorState(galaxy),'galaxy-52.1',{recordId:'1003'});
  assert.equal(run.hint.recordScope,'zone');assert.equal(run.hint.recordId,'1003');
  const done=replay(galaxy,run);assert.equal(done.hint.status,'complete');
  assert.equal(emulatorView(galaxy,done.state).node.id,'galaxy-52.1');assert.equal(emulatorView(galaxy,done.state).context.zone,'1003');
  assert(done.state.editor);assert.deepEqual(done.state.values,{});
});

test('A directly selected group parameter completes its selector before field arrival',()=>{
  const done=replay(galaxy,startHints(galaxy,createEmulatorState(galaxy),'galaxy-51.13',{recordId:'3'}));
  assert.equal(done.hint.status,'complete');assert.equal(done.hint.recordScope,'group');
  assert.equal(emulatorView(galaxy,done.state).context.group,'3');assert.equal(done.state.editor.nodeId,'galaxy-51.13');
});

test('Texecom Yes advances sequential fields; field hints stop before No editing',()=>{
  const done=replay(tex,startHints(tex,createEmulatorState(tex),'zone-text',{recordId:'002'}));
  assert.equal(done.hint.status,'complete');assert.equal(emulatorView(tex,done.state).node.id,'zone-text');
  assert.equal(emulatorView(tex,done.state).context.zone,'002');assert.equal(done.state.editor,null);
  assert(!done.keys.includes('change'));
});

test('A documented choice is highlighted but never saved, including Texecom No entry',()=>{
  for(const [model,nodeId,recordId]of [[galaxy,'galaxy-52.1','1003'],[tex,'zone-type','003'],[scan,'i-zone-type','002'],[orisec,'program-zone-programming-zone-type','02']]){
    const field=model.nodes[nodeId],choice=field.choices.find(c=>model.rawById.get(c.id)?.kind==='selection');assert(choice,nodeId);
    const done=replay(model,startHints(model,createEmulatorState(model),choice.id,{recordId}));
    assert.equal(done.hint.status,'complete',nodeId);assert.equal(done.state.editor.nodeId,nodeId);
    assert.deepEqual(done.state.editor.draft,choice.value);assert.deepEqual(done.state.values,{});
    if(model===tex)assert(done.keys.includes('change'));
  }
});

test('Scroll-only roots choose the shorter wrapped direction without chapter-number shortcuts',()=>{
  for(const model of [scan,orisec]){
    const root=model.roots[0],target=root.nodeIds.at(-1),run=startHints(model,createEmulatorState(model),target);
    assert.deepEqual(run.hint.keys,['previous','enter']);
    const done=replay(model,run);assert.equal(emulatorView(model,done.state).node.id,target);
  }
});

test('Scantronic switches to the correct user edition for ordinary omission without omitting a zone',()=>{
  const run=startHints(scan,createEmulatorState(scan),'user-v7-omit-zones');
  assert.equal(run.state.rootId,'user-v7');assert.deepEqual(run.hint.keys,['enter']);
  const done=replay(scan,run);assert.equal(done.hint.status,'complete');assert.equal(Object.values(done.state.omittedZones).some(Boolean),false);
});

test('Orisec reaches the requested field using its physical keys and selected record',()=>{
  const done=replay(orisec,startHints(orisec,createEmulatorState(orisec),'program-zone-programming-zone-text',{recordId:'02'}));
  assert.equal(done.hint.status,'complete');assert.equal(emulatorView(orisec,done.state).node.id,'program-zone-programming-zone-text');
  assert.equal(emulatorView(orisec,done.state).record.id,'02');assert.deepEqual(done.state.values,{});
});

test('Wrong numeric keys replan from the real display and never highlight a missing backspace key',()=>{
  let run=startHints(galaxy,createEmulatorState(galaxy),'galaxy-52.1',{recordId:'1003'});
  run=step(galaxy,run,'9');assert.equal(run.hint.event,'wrong');assert.equal(run.hint.completedSteps,0);
  assert(!run.hint.keys.includes('backspace'));assert.equal(run.state.digits,'9');
  const done=replay(galaxy,run);assert.equal(done.hint.status,'complete');assert.equal(emulatorView(galaxy,done.state).context.zone,'1003');
});

test('Wrong scrolling recovers and repeating old progress cannot farm earned steps',()=>{
  let run=startHints(galaxy,createEmulatorState(galaxy),'galaxy-52.1',{recordId:'1003'});
  run=step(galaxy,run,'5');assert.equal(run.hint.completedSteps,1);
  run=step(galaxy,run,'back');assert.equal(run.hint.event,'wrong');assert.equal(run.hint.completedSteps,1);
  run=step(galaxy,run,'5');assert.equal(run.hint.completedSteps,1);
  const done=replay(galaxy,run);assert.equal(done.hint.status,'complete');
  assert.equal(done.hint.completedSteps,done.hint.initialTotal);
  assert.equal(done.hint.pressesTaken,done.keys.length+3);
  assert(done.hint.pressesTaken>done.hint.completedSteps);
});

test('Recovering an invalid selector prefix uses actual scroll keys and preserves the desired record',()=>{
  let run=startHints(galaxy,createEmulatorState(galaxy),'galaxy-52.1',{recordId:'1001'});
  for(const key of ['5','2','enter'])run=step(galaxy,run,key);
  assert.equal(emulatorView(galaxy,run.state).mode,'selector');
  run=step(galaxy,run,'9');assert.equal(run.hint.status,'active');assert(!run.hint.keys.includes('backspace'));
  const done=replay(galaxy,run);assert.equal(done.hint.status,'complete');assert.equal(emulatorView(galaxy,done.state).record.id,'1001');
});

test('A conditional format branch stops at its prerequisite without saving programming',()=>{
  const done=replay(galaxy,startHints(galaxy,createEmulatorState(galaxy),'galaxy-56.1.01.v2.1'));
  assert.equal(done.hint.status,'blocked');assert.equal(done.hint.event,'blocked');
  assert.equal(done.state.editor.nodeId,'galaxy-56.1.01');assert.deepEqual(done.state.values,{});
  assert.match(done.hint.message,/requires saving Format/);assert.equal(done.hint.targetLabel,'Trigger Events');
});

test('Reference-only entries finish with an evidence message and no ordinary success event',()=>{
  const done=replay(galaxy,startHints(galaxy,createEmulatorState(galaxy),'galaxy-51.14'));
  assert.equal(done.hint.status,'reference');assert.equal(done.hint.event,'reference');assert.match(done.hint.message,/reference|evidence gap/);
  const unavailable=replay(galaxy,startHints(galaxy,createEmulatorState(galaxy),'galaxy-56.1.16'));
  assert.equal(unavailable.hint.status,'reference');
});

test('Unknown routes are blocked without altering the live state',()=>{
  const state=createEmulatorState(galaxy),run=startHints(galaxy,state,'made-up-option');
  assert.equal(run.state,state);assert.equal(run.hint.status,'blocked');assert.equal(run.hint.nextKey,null);assert.equal(run.hint.event,'none');
});

test('Already-arrived access roots need no artificial key or completion sound',()=>{
  const run=startHints(tex,createEmulatorState(tex),'eng');
  assert.equal(run.hint.status,'complete');assert.equal(run.hint.totalSteps,0);assert.equal(run.hint.event,'none');assert.equal(run.hint.nextKey,null);
});

test('Key labels match the actual families rather than a generic Enter/Back vocabulary',()=>{
  assert.equal(hintKeyLabel(galaxy,'enter'),'ent');assert.equal(hintKeyLabel(galaxy,'next'),'A');
  assert.equal(hintKeyLabel(tex,'change'),'No');assert.equal(hintKeyLabel(tex,'back'),'Menu');
  assert.equal(hintKeyLabel(scan,'enter'),'✓');assert.equal(hintKeyLabel(orisec,'backspace'),'Clear');
});


test('Galaxy wrong group recovery still uses the direct Full Menu shortcut',()=>{
  let run=startHints(galaxy,createEmulatorState(galaxy),'galaxy-52');
  run=step(galaxy,run,'enter');
  assert.equal(emulatorView(galaxy,run.state).node.id,'galaxy-10');
  assert.deepEqual(run.hint.keys,['5','2','enter']);
  assert.equal(replay(galaxy,run).hint.status,'complete');
});


test('A Texecom sequential menu counts as opened when its first field is displayed',()=>{
  const done=replay(tex,startHints(tex,createEmulatorState(tex),'global-timers'));
  assert.equal(done.hint.status,'complete');assert.equal(done.state.trail.at(-1).id,'global-timers');
  assert.equal(done.state.editor,null);
});

test('Source value entries resolve the corresponding explicit adapter choice without saving',()=>{
  const raw=scan.rawById.get('i-confirmation-confirmation-mode-dd243');
  assert(raw);
  const done=replay(scan,startHints(scan,createEmulatorState(scan),raw.id));
  assert.equal(done.hint.status,'complete');assert.equal(done.state.editor.nodeId,'i-confirmation-confirmation-mode');
  assert.equal(scan.nodes['i-confirmation-confirmation-mode'].choices[done.state.editor.choiceIndex].label,raw.label);
  assert.deepEqual(done.state.values,{});
});
