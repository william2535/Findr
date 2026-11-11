import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildEmulatorModel,createEmulatorState,pressEmulatorKey,emulatorView} from '../public/app/emulator-engine.mjs';
import {startHints,advanceHints} from '../public/app/emulator-hints.mjs';

const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8'));
const model=buildEmulatorModel(read('../public/app/data/menu-maps/pyronix-enforcer.json'),read('../research/expansion/pyronix-profile.json'));
const physical=new Set(model.profile.keys.map(key=>key.id));
const saved=state=>JSON.stringify(Object.fromEntries(['values','committedValues','zoneTypes','zoneNames','zoneAreas','zoneOmitEnabled','omittedZones','armed','chime','alarm'].map(key=>[key,state[key]])));
const view=state=>emulatorView(model,state);
function step(run,key=run.hint.nextKey) {
  assert(physical.has(key),'Guidance must highlight an actual Enforcer key: '+key);
  const next=pressEmulatorKey(model,run.state,key);
  return {state:next,hint:advanceHints(model,run.hint,run.state,next,key)};
}
function replay(run) {
  const before=saved(run.state),keys=[],visited=[];
  while(run.hint.status==='active'&&keys.length<120) {
    const key=run.hint.nextKey;run=step(run,key);keys.push(key);visited.push({node:view(run.state).node.id,selector:run.state.trail.at(-1).selectorPending||null});
    assert.equal(saved(run.state),before,'Hints must not save settings, area assignments or omission');
    assert(!Object.values(run.state.outputStates).some(Boolean),'Hints must not start an output');
    assert(!run.state.walk.running,'Hints must not start a custom walk test');
  }
  assert.notEqual(run.hint.status,'active','The route must terminate');
  return {...run,keys,visited};
}
const route=(id,options={})=>startHints(model,createEmulatorState(model),id,options);
function advanceUntil(run,predicate) {
  for(let i=0;i<100&&!predicate(run);i++){assert.equal(run.hint.status,'active');run=step(run);}
  assert(predicate(run),'The intended intermediate screen must be reachable');return run;
}

// Exactly the 19 failures from the expansion smoke report, with source gaps
// retained as reference completions rather than invented interactive behavior.
const formerBlockers=[
  ['py-master-code','complete'],['py-master-code-value','complete'],['py-master-areas','complete'],
  ['py-master-set-options','complete'],['py-master-flexi','complete'],['py-master-name','complete'],
  ['py-engineer-code','complete'],['py-engineer-code-value','complete'],['py-test-soak','complete'],
  ['py-soak-inputs','reference'],['py-soak-days-left','reference'],['py-initial-soak','reference'],
  ['py-test-siren','complete'],['py-test-battery','reference'],['py-test-outputs','complete'],
  ['py-test-comms','reference'],['py-test-fetch-time','reference'],['py-test-poll-server','reference'],
  ['py-diag-volts-reader','complete']
];
test('all 19 previously blocked source locations now have safe physical-key routes',()=>{
  for(const [id,status] of formerBlockers) {
    const done=replay(route(id));assert.equal(done.hint.status,status,id);assert.equal(view(done.state).node.id,id,id);
  }
});

test('Engineer, Master Manager and User siren hints stop at the question before outputs start',()=>{
  for(const id of ['py-test-siren','pm-siren','pu-siren']) {
    const previous=createEmulatorState(model),before=structuredClone(previous),run=startHints(model,previous,id);
    assert.deepEqual(previous,before);assert.equal(run.state.steps,previous.steps,'Planning must not press any key');
    const done=replay(run);assert.equal(done.hint.status,'complete');assert.equal(done.hint.nextKey,null);
    assert.match(done.hint.message,/stop before activation/);assert.match(view(done.state).screen.lines[0],/siren/i);
    assert.notEqual(done.state.trail.at(-1).id,id,'Arrival must remain at the menu question');
    const manual=pressEmulatorKey(model,done.state,'enter');assert.deepEqual(manual.outputStates,{Siren:true,Strobe:true},'A later manual YES, outside guidance, starts the fictional test');
  }
});

test('NO skips a changed Sound preview without saving it or blocking later test questions',()=>{
  let run=advanceUntil(route('py-test-outputs'),run=>run.state.editor?.nodeId==='py-test-sounds');
  run=step(run,'right');assert.equal(run.state.editor.dirty,true);assert.deepEqual(run.state.values,{});
  assert.equal(run.hint.status,'active');assert.equal(run.hint.nextKey,'back');
  const done=replay(run);assert.equal(done.hint.status,'complete');assert.equal(view(done.state).node.id,'py-test-outputs');
});

test('Reader Volts hints traverse intervening record selectors without confusing their scopes',()=>{
  const done=replay(route('py-diag-volts-reader',{recordId:'2'}));
  assert.equal(done.hint.status,'complete');assert.deepEqual(done.state.trail.at(-1).context,{module:'0',outputModule:'0',keypad:'1',reader:'2'});
  assert.deepEqual(view(done.state).screen.lines,['Reader Volts','13.7V · DEMO']);
  for(const scope of ['module','outputModule','keypad','reader'])assert(done.visited.some(item=>item.selector===scope),scope+' selector was actually displayed');
});

test('module selectors use selectorRecordIds independently of the child zone recordIds',()=>{
  const run=route('py-diag-zem-inputs',{recordId:'0'});
  assert.deepEqual(run.hint.recordIds,['0']);assert.equal(run.hint.recordScope,'module');
  const done=replay(run);assert.equal(done.hint.status,'complete');assert.equal(view(done.state).context.module,'0');assert.equal(view(done.state).context.zone,'35');
});

test('a wrong YES into a walk test replans through area and empty individual phases',()=>{
  let run=advanceUntil(route('py-test-soak'),run=>view(run.state).node.id==='py-test-walk');
  assert.equal(run.hint.nextKey,'back');run=step(run,'enter');assert.equal(run.state.testFlow.phase,'areas');assert.equal(run.hint.status,'active');
  assert.equal(run.hint.nextKey,'back');run=step(run);assert.equal(run.state.testFlow.phase,'individual');assert.equal(run.hint.status,'active');
  const done=replay(run);assert.equal(done.hint.status,'complete');assert.equal(view(done.state).node.id,'py-test-soak');
});

test('guidance can stop a test after a wrong manual activation without activating another output',()=>{
  let run=advanceUntil(route('py-test-battery'),run=>view(run.state).node.id==='py-test-siren');
  run=step(run,'enter');assert.deepEqual(run.state.outputStates,{Siren:true,Strobe:true});assert.equal(run.hint.status,'active');assert.equal(run.hint.nextKey,'back');
  const done=replay(run);assert.equal(done.hint.status,'reference');assert.equal(view(done.state).node.id,'py-test-battery');assert(!Object.values(done.state.outputStates).some(Boolean));
});

test('area-choice hints focus the physical C key while retaining the stored zone-area assignment',()=>{
  const done=replay(route('py-input-areas-c',{recordId:'02'}));
  assert.equal(done.hint.status,'complete');assert.equal(done.state.editor.nodeId,'py-input-areas');assert.equal(done.state.editor.draft.C,true);
  assert.deepEqual(done.state.zoneAreas['02'],{A:true});assert.deepEqual(done.state.values,{});
});
