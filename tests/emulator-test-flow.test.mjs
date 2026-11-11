import test from 'node:test';
import assert from 'node:assert/strict';
import {activateExtendedTest,handleExtendedTestKey,extendedTestScreen,updateExtendedWalk} from '../public/app/emulator-test-flow.mjs';

const model={profile:{keys:[{id:'enter',label:'YES'},{id:'back',label:'NO'}],zones:[{address:'01',name:'Door',areas:['A']},{address:'02',name:'Hall',areas:['B']},{address:'03',name:'Office',areas:['A','B']}]},config:{navigation:{recordNextKey:'right',recordPreviousKey:'left'}}};
const baseWalk={id:'walk',mode:'walk',areaSelection:true,initialAreas:['A'],keyChoiceCodes:{logout:'A',previous:'B',cancel:'C','area-d':'D'},requireRestore:true,finishKey:'back'};
function fixture(node={...baseWalk}) {
  const frame={id:node.id,cursor:0,context:{}},state={trail:[frame],digits:'',records:{zone:model.profile.zones.map(zone=>({id:zone.address,label:zone.name}))},zoneStates:{'01':'secure','02':'secure','03':'secure'},zoneNames:{'01':'Door','02':'Hall','03':'Office'},walk:{running:false,hits:[],selected:[],allowed:[],view:0},outputStates:{Bell:false,Strobe:false},values:{saved:7},committedValues:{saved:7},omittedZones:{'01':false},armed:false,alarm:false,history:[],events:[]};
  activateExtendedTest(model,state,node,frame);
  const press=(...keys)=>keys.flat().map(key=>handleExtendedTestKey(model,state,node,key,frame)).at(-1);
  const transition=(address,after)=>{const before=state.zoneStates[address];state.zoneStates[address]=after;return updateExtendedWalk(state,address,before,after);};
  return {node,state,frame,press,transition,screen:()=>extendedTestScreen(model,state,node,frame)};
}

test('ordinary nodes retain their existing engine behavior without any state mutation',()=>{
  const node={id:'legacy',mode:'walk'},frame={id:'legacy',cursor:2,context:{}},state={digits:'12',walk:{running:true,hits:[]},outputStates:{Bell:false}},before=structuredClone(state);
  assert.equal(activateExtendedTest(model,state,node,frame),false);
  assert.equal(handleExtendedTestKey(model,state,node,'back',frame),null);
  assert.equal(extendedTestScreen(model,state,node,frame),null);
  assert.equal(updateExtendedWalk(state,'01','secure','active'),false);
  assert.deepEqual(state,before);assert.equal(frame.cursor,2);
});

test('area letters are local selection keys and YES tests only inputs in selected areas',()=>{
  const run=fixture();assert.deepEqual(run.screen().lines,['Walk Test Areas','[A---]']);
  run.press('logout','previous');assert.deepEqual(run.state.testFlow.areas,['B']);assert.equal(run.state.walk.running,false);
  run.press('enter');assert.deepEqual(run.state.walk.allowed,['02','03']);assert.equal(run.state.walk.running,true);
  assert.equal(run.frame.context.zone,'02');assert.deepEqual(run.state.values,{saved:7});
});

test('single-area user flow validates exactly one selection without silently changing the area flags',()=>{
  const run=fixture({...baseWalk,singleAreaOnly:true});run.press('previous','enter');
  assert.equal(run.state.walk.running,false);assert.deepEqual(run.state.testFlow.areas,['A','B']);assert.match(run.state.feedback,/FINDR validation/);
  run.press('logout','previous','enter');assert.deepEqual(run.state.testFlow.areas,[]);assert.equal(run.state.walk.running,false);
  run.press('previous','enter');assert.deepEqual(run.state.walk.allowed,['02','03']);
});

test('empty fitted area cannot start a walk test',()=>{
  const run=fixture();run.press('logout','cancel','enter');
  assert.deepEqual(run.state.testFlow.areas,['C']);assert.equal(run.state.walk.running,false);assert.match(run.state.feedback,/No fitted fictional inputs/);
});

test('Engineer individual route confirms numeric and arrow selections, rejects missing inputs, then starts with NO',()=>{
  const run=fixture();run.press('back','0','2','enter');
  assert.deepEqual(run.state.walk.selected,['02']);assert.equal(run.state.walk.running,false);
  run.press('9','9','enter');assert.deepEqual(run.state.walk.selected,['02']);assert.match(run.state.feedback,/not fitted/);
  run.press('right','enter','enter');assert.deepEqual(run.state.walk.selected,['02','03']);
  run.press('back');assert.equal(run.state.walk.running,true);assert.deepEqual(run.state.walk.allowed,['02','03']);
  assert(!run.state.walk.allowed.includes('01'));
});

test('user individual route uses arrows and YES starts one input directly',()=>{
  const run=fixture({...baseWalk,singleAreaOnly:true,individualStartOnEnter:true});
  run.press('back','2');assert.equal(run.state.digits,'');assert.match(run.state.feedback,/separate arrow/);
  run.press('right','enter');assert.deepEqual(run.state.walk.allowed,['02']);assert.equal(run.state.walk.running,true);
});

test('empty individual selection cancels with NO and direct individual opt-in works',()=>{
  const run=fixture({...baseWalk,areaSelection:false,individualSelection:true});
  assert.equal(run.state.testFlow.phase,'individual');assert.deepEqual(run.press('back'),{handled:true,exit:true});assert.equal(run.state.walk.running,false);
});

test('source-backed walk completion requires a new active then secure cycle, not activation or tamper alone',()=>{
  const run=fixture();run.press('enter');
  run.transition('02','active');run.transition('02','secure');assert.deepEqual(run.state.walk.hits,[],'Unselected inputs do not count');
  run.transition('01','active');assert.deepEqual(run.state.walk.hits,[]);run.transition('01','tamper');run.transition('01','secure');assert.deepEqual(run.state.walk.hits,[],'Tamper does not count as a successful restoration');
  run.transition('01','active');run.transition('01','secure');assert.deepEqual(run.state.walk.hits,['01']);
  run.transition('01','active');run.transition('01','secure');assert.deepEqual(run.state.walk.hits,['01'],'Results are unique');
  run.transition('03','active');assert.equal(run.state.testFlow.phase,'running');run.transition('03','secure');
  assert.deepEqual(run.state.walk.hits,['01','03']);assert.equal(run.state.testFlow.phase,'complete');assert.equal(run.state.walk.running,false);assert.equal(run.screen().lines[0],'Walk Test Completed');
});

test('NO stops a running walk and later detector changes cannot resurrect it',()=>{
  const run=fixture();run.press('enter');run.transition('01','active');assert.deepEqual(run.press('back'),{handled:true,exit:true});
  run.transition('01','secure');assert.deepEqual(run.state.walk.hits,[]);assert.equal(run.state.walk.running,false);
  run.state.trail=[{id:'legacy-walk'}];run.state.walk.running=true;
  assert.equal(updateExtendedWalk(run.state,'01','secure','active'),false,'A stale custom flow must not hijack another walk screen');
});

test('output tests accept complete documented function codes and never interpret them as fitted output records',()=>{
  const run=fixture({id:'outputs',mode:'outputs',outputFunctions:[{code:'0000',label:'Not Used'},{code:'0006',label:'Confirmed Any'},{code:'0014',label:'Siren Any'}],finishKey:'back'});
  run.press('6','enter');assert.deepEqual(run.state.outputStates,{});assert.equal(run.state.testFlow.phase,'select');
  assert.match(run.state.feedback,/complete output-function code/);assert.deepEqual(run.press('back'),{handled:true,exit:true});
  activateExtendedTest(model,run.state,run.node,run.frame);run.press('0','0','0','6','enter');
  assert.deepEqual(run.state.outputStates,{'0006 Confirmed Any':true});assert.equal(run.frame.context.output,undefined);
  run.press('right','enter');assert.deepEqual(run.state.outputStates,{'0006 Confirmed Any':true},'No independent output scrolling/toggling');
  assert.deepEqual(run.press('back'),{handled:true,exit:true});assert.deepEqual(run.state.outputStates,{'0006 Confirmed Any':false});
});

test('Not Used output function never energises a fictional indicator',()=>{
  const run=fixture({id:'output-zero',mode:'outputs',outputFunctions:[{code:'0000',label:'Not Used'}]});run.press('enter');
  assert.deepEqual(run.state.outputStates,{'0000 Not Used':false});assert.match(run.screen().lines[1],/OFF$/);
});

test('siren and strobe start simultaneously and only the documented finish action changes their state',()=>{
  for(const finishKey of ['back','enter']) {
    const run=fixture({id:'siren-'+finishKey,mode:'outputs',outputs:['Siren','Strobe'],outputsOnEnter:true,simultaneous:true,finishKey});
    assert.deepEqual(run.state.outputStates,{Siren:true,Strobe:true});run.press('left','right','1');assert.deepEqual(run.state.outputStates,{Siren:true,Strobe:true});
    assert.deepEqual(run.press(finishKey),{handled:true,exit:true});assert.deepEqual(run.state.outputStates,{Siren:false,Strobe:false});
    assert.deepEqual({values:run.state.values,committed:run.state.committedValues,omissions:run.state.omittedZones,armed:run.state.armed,alarm:run.state.alarm,history:run.state.history,events:run.state.events},{values:{saved:7},committed:{saved:7},omissions:{'01':false},armed:false,alarm:false,history:[],events:[]});
  }
});
