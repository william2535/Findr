// Independent integration audit: physical hint routes must preserve panel data.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildEmulatorModel,createEmulatorState,pressEmulatorKey,openEmulatorNode,setEmulatorRoot,emulatorView,setEmulatorText,applyEmulatorEdit} from '../public/app/emulator-engine.mjs';
import {startHints,advanceHints} from '../public/app/emulator-hints.mjs';
const json=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const models=Object.fromEntries([['ade','ade-accenta-optima'],['risco','risco-lightsys2'],['hkc','hkc-quantum70']].map(([family,id])=>{
  const map=json('../public/app/data/menu-maps/'+id+'.json'),profile=json('../research/expansion-0.9.0/'+family+'-profile.json');
  return [family,buildEmulatorModel(map,profile)];
}));
const protectedFields=['values','committedValues','zoneNames','zoneTypes','zoneStates','zoneAreas','zoneOmitEnabled','omittedZones','armed','armingMode','chime','alarm','changed','lastReport'];
const fingerprint=state=>JSON.stringify(Object.fromEntries(protectedFields.map(key=>[key,state[key]])));
const persistentRisco=state=>JSON.stringify(Object.fromEntries(['riscoPermanent','riscoOneTime','riscoRecall'].map(key=>[key,state.runtimeState?.[key]])));
const key=(model,state,...keys)=>keys.flat().reduce((next,k)=>pressEmulatorKey(model,next,k),state);
const located=(model,id)=>openEmulatorNode(model,createEmulatorState(model),id);
const noFittedRecord=new Set(['h-e1.3.1.5','h-wand-options']);
function follow(model,target,initial=createEmulatorState(model)) {
  const before=fingerprint(initial),original=JSON.stringify(initial),physical=new Set(model.profile.keys.map(item=>item.id));
  let {state,hint}=startHints(model,initial,target);
  assert.equal(JSON.stringify(initial),original,target+' mutated the caller while planning');
  assert.equal(fingerprint(state),before,target+' changed panel data while starting hints');
  const keys=[];
  while(hint.status==='active'&&keys.length<140) {
    assert.ok(physical.has(hint.nextKey),target+' highlighted a nonexistent physical key: '+hint.nextKey);
    const next=pressEmulatorKey(model,state,hint.nextKey);
    assert.equal(fingerprint(next),before,target+' changed panel data on '+hint.nextKey);
    assert.ok(!Object.entries(next.outputStates||{}).some(([name,on])=>on===true&&state.outputStates?.[name]!==true),target+' activated an output');
    keys.push(hint.nextKey);hint=advanceHints(model,hint,state,next,hint.nextKey);state=next;
  }
  assert.notEqual(hint.status,'active',target+' did not terminate after140 presses');
  if(hint.status==='complete'&&!hint.goal.beforeActivation)assert.ok(emulatorView(model,state).node.id===hint.goal.nodeId||state.trail.some(frame=>frame.id===hint.goal.nodeId),target+' completed at an unrelated screen');
  return {state,hint,keys};
}

for(const [family,model] of Object.entries(models))test(family+': every reachable screen has a physical, non-mutating hint route or explicit unavailable prerequisite',()=>{
  for(const target of model.reachable) {
    const result=follow(model,target);
    if(result.hint.status==='blocked')assert.ok(noFittedRecord.has(target)||model.nodes[target].hintRouteUnverified===true||result.hint.prerequisite,target+': '+result.hint.message);
    else assert.ok(['complete','reference'].includes(result.hint.status),target+': '+result.hint.status);
  }
});

test('ADE has only one arrow and hints preserve programme masks, omissions and an active setting period',()=>{
  const model=models.ade;
  let initial=key(model,located(model,'a-eP-1-used'),'2','back');
  initial=setEmulatorRoot(model,initial,'a-setting-root');initial=key(model,initial,'omit','5','enter');
  assert.equal(initial.armed,true);assert.equal(initial.omittedZones['5'],true);
  for(const target of ['a-eP-3-mode','a-eO-2','a-e8-3','a-e6','a-e4-date','a-setting-omit','a-unset']) {
    const result=follow(model,target,initial);assert.equal(result.hint.status,'complete',target);
    assert.ok(!result.keys.includes('previous'));assert.equal(result.state.omittedZones['5'],true);assert.equal(result.state.armed,true);
  }
});

test('RISCO installer digits are immediate while user and service menus require physical scrolling',()=>{
  const model=models.risco;
  let state=key(model,createEmulatorState(model),'1','1','0','1','1');assert.equal(emulatorView(model,state).node.id,'r-e1.1.01.1');
  for(const root of ['r-user','r-service']) {
    state=setEmulatorRoot(model,createEmulatorState(model),root);
    for(const digit of '0123456789')state=key(model,state,digit);
    assert.equal(emulatorView(model,state).node.id,'@'+root);assert.equal(state.digits,'');
  }
  for(const target of ['r-u-omit-once','r-u-omit-permanent','r-u-log','r-s-resistance','r-s-log']) {
    const result=follow(model,target);assert.equal(result.hint.status,'complete',target);
    assert.ok(result.keys.every(key=>!/^\d$/.test(key)),target+' invented a numeric user/service route');
  }
});

test('RISCO automatic output tests are selected by hints but require a separate learner press to activate',()=>{
  const model=models.risco;
  for(const target of ['r-u-sounder-test','r-u-strobe-test','r-s-siren','r-s-strobe']) {
    const result=follow(model,target);assert.equal(result.hint.status,'complete',target);
    assert.equal(result.hint.goal.beforeActivation,true,target+' must declare its output-on-entry behaviour');
    assert.equal(emulatorView(model,result.state).selected?.id,target);assert.ok(!Object.values(result.state.outputStates).some(Boolean));
    const activated=key(model,result.state,'enter');assert.ok(Object.values(activated.outputStates).some(Boolean));
  }
});

test('RISCO hint root changes retain distinct committed one-time, permanent and recall omit lists',()=>{
  const model=models.risco;
  let state=key(model,located(model,'r-u-omit-permanent'),'next','part-set','enter');
  state=openEmulatorNode(model,state,'r-u-omit-once');state=key(model,state,'next','next','part-set','enter');
  const before=persistentRisco(state);
  for(const target of ['r-e1.1.01.1','r-u-omit-once','r-u-omit-permanent','r-s-resistance']) {
    const result=follow(model,target,state);assert.equal(result.hint.status,'complete',target);assert.equal(persistentRisco(result.state),before);
  }
});

test('HKC 8→1 has scroll-only arming options, so 1/10/11 cannot prematurely enter or change a field',()=>{
  const model=models.hkc;
  let state=key(model,createEmulatorState(model),'8','1');assert.equal(emulatorView(model,state).node.id,'h-e8.1');
  const before=fingerprint(state);
  state=key(model,state,'1','0','1','1');assert.equal(emulatorView(model,state).node.id,'h-e8.1');assert.equal(state.digits,'');assert.equal(fingerprint(state),before);
  for(const target of ['h-e8.1.1','h-e8.1.10','h-e8.1.11']) {
    const result=follow(model,target);assert.equal(result.hint.status,'complete',target);
    const prefix=result.keys.slice(0,2);assert.deepEqual(prefix,['8','1']);
    assert.ok(result.keys.slice(2).every(key=>!/^\d$/.test(key)),target+' bypassed scroll-only ambiguity');
  }
});

test('HKC inhibit hints do not act on the draft or disturb an already-set inhibited period',()=>{
  const model=models.hkc;
  const zone=model.profile.zones.find(zone=>Number(zone.address)===2).address;
  let result=follow(model,'h-a-inhibit');assert.equal(result.hint.status,'complete');assert.equal(result.state.armed,false);
  let state=key(model,result.state,'previous','2');assert.equal(state.omittedZones[zone],false);assert.equal(state.armed,false);
  state=key(model,state,'back');assert.equal(state.omittedZones[zone],false);
  state=setEmulatorRoot(model,state,'h-arming');state=key(model,state,'previous','2','enter');
  const omitted=Object.entries(state.omittedZones).filter(([,enabled])=>enabled).map(([id])=>id);assert.ok(omitted.length>0);assert.equal(state.armed,true);
  for(const target of ['h-a-inhibit','h-u-unset','h-e8.1.10','h-e3.1']) {
    result=follow(model,target,state);assert.equal(result.hint.status,'complete',target);
    assert.equal(result.state.armed,true);assert.deepEqual(Object.entries(result.state.omittedZones).filter(([,enabled])=>enabled).map(([id])=>id),omitted);
  }
});

test('ADE RESET cannot unset an active period, and new omit/program selections wait for normal unsetting',()=>{
  const model=models.ade;
  let state=setEmulatorRoot(model,createEmulatorState(model),'a-setting-root');state=key(model,state,'omit','2','enter');
  assert.equal(state.armed,true);assert.equal(state.omittedZones['2'],true);
  state=key(model,state,'back');assert.equal(state.armed,true);assert.equal(state.armingMode,'Program 1');assert.equal(state.omittedZones['2'],true);
  state=openEmulatorNode(model,state,'a-setting-omit');state=key(model,state,'3','enter');assert.equal(state.omittedZones['3'],false);assert.equal(state.armed,true);assert.match(state.feedback,/already set/);
  state=openEmulatorNode(model,state,'a-setting-program');state=key(model,state,'2');assert.equal(state.armingMode,'Program 1');assert.match(state.feedback,/already set/);
  state=setEmulatorRoot(model,state,'a-unset-root');state=key(model,state,'2','4','6','8');assert.equal(state.armed,false);assert.ok(Object.values(state.omittedZones).every(value=>!value));
});

test('HKC Time labels the unverified physical transition; its explicit helper advances without saving unchanged Date',()=>{
  const model=models.hkc,result=follow(model,'h-time');
  assert.equal(model.nodes['h-time'].hintRouteUnverified,true);assert.equal(result.hint.status,'blocked');assert.match(result.hint.message,/physical key sequence is not verified/);
  let state=located(model,'h-e6.1');assert.match(emulatorView(model,state).evidence.notes.join(' '),/helper/);
  state=key(model,state,'enter');assert.equal(emulatorView(model,state).node.id,'h-time');assert.deepEqual(state.values,{});assert.deepEqual(state.committedValues,{});
});

test('ADE Apply helper obeys duplicate-code rules and the code deletion key boundary',()=>{
  const model=models.ade;
  let state=located(model,'a-e8-1');state=setEmulatorText(model,state,'2468');state=applyEmulatorEdit(model,state);assert.equal(state.values['ade-code-user1|system||'],'2468');
  state=openEmulatorNode(model,state,'a-e8-2');state=setEmulatorText(model,state,'2468');state=applyEmulatorEdit(model,state);assert.match(state.feedback,/already in use/);assert.equal(state.values['ade-code-user2|system||'],undefined);
  state=setEmulatorText(model,state,'1357');state=applyEmulatorEdit(model,state);assert.equal(state.values['ade-code-user2|system||'],'1357');
  state=openEmulatorNode(model,state,'a-e8-2');state=setEmulatorText(model,state,'');state=applyEmulatorEdit(model,state);assert.equal(state.values['ade-code-user2|system||'],'1357');assert.match(state.feedback,/OMIT/);
  state=key(model,state,'omit');assert.equal(state.values['ade-code-user2|system||'],'');
});

test('ADE Apply helper keeps programme dependencies and the complete descriptor RESET transaction',()=>{
  const model=models.ade;
  let state=key(model,located(model,'a-eP-1-timed'),'2');state=applyEmulatorEdit(model,state);
  assert.equal(state.values['ade-program-1-timed|system||']['a-eP-1-timed-z2'],true);
  assert.equal(state.values['ade-program-1-inhibit|system||']['a-eP-1-inhibit-z2'],false);
  state=openEmulatorNode(model,state,'a-e6');state=key(model,state,'enter','next','enter');state=applyEmulatorEdit(model,state);
  assert.equal(state.zoneNames['1'],'Garage');assert.equal(state.zoneNames['2'],'Kitchen');assert.equal(emulatorView(model,state).node.id,'@a-engineer');
});
