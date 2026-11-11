import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGentController,gentPanelFace,gentSearch} from '../public/app/gent.mjs';
import {buildGentModel,createGentState,gentView,setGentDeviceInput} from '../public/app/gent-engine.mjs';

const data=JSON.parse(readFileSync(new URL('../public/app/data/gent-vigilon.json',import.meta.url)));
const lessons=JSON.parse(readFileSync(new URL('../public/app/data/gent-lessons.json',import.meta.url)));
const model=buildGentModel(data);

async function harness(callback, initial={}) {
  const savedGlobals={document:globalThis.document,location:globalThis.location,fetch:globalThis.fetch};
  const listeners={},values={...initial},notices=[],results={};
  const app={innerHTML:'',addEventListener:(name,fn)=>listeners[name]=fn,querySelector:selector=>selector.endsWith('-results')?(results[selector]??={innerHTML:''}):null,querySelectorAll:()=>[]};
  globalThis.document={hidden:false,activeElement:null,addEventListener:()=>{}};
  globalThis.location={hash:'#gent'};
  globalThis.fetch=async url=>({ok:true,json:async()=>structuredClone(String(url).includes('gent-lessons')?lessons:data)});
  const db={setting:async key=>values[key],setSetting:async(key,value)=>{values[key]=structuredClone(value);}};
  const controller=createGentController({app,db,toast:message=>notices.push(message)});
  const click=(action,extra={})=>{
    const target={dataset:{gentAction:action,...extra},disabled:false,closest:()=>target};
    listeners.click({target});
  };
  const progress=()=>Number(app.innerHTML.match(/<progress[^>]*value="(\d+)"/)?.[1]??-1);
  const hint=()=>app.innerHTML.match(/class="[^"]*gent-hint-key[^"]*"[^>]*data-key="([^"]+)"/)?.[1]||null;
  const search=(kind,value)=>{listeners.input({target:{dataset:{gentSearch:kind},value}});return results[`#gent-${kind==='learn'?'lesson':kind}-results`].innerHTML;};
  try{await controller.render();await callback({controller,app,click,progress,hint,values,notices,search,listeners});}
  finally{controller.leave();await controller.flush();for(const [key,value] of Object.entries(savedGlobals)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
}

test('GENT face has source control arrangement and distinct red/green indicators',()=>{
  let state=createGentState(model);let html=gentPanelFace(gentView(model,state));
  assert.match(html,/gent-led on green/);
  assert.doesNotMatch(html,/gent-screen-softkeys/,'no empty menu boxes on normal display');
  for(const key of ['MENU_ON_OFF','CANCEL_BUZZER','SOUND_ALARMS','SILENCE_ALARMS','RESET','-',';','.'])assert.ok(html.includes(`data-key="${key}"`));
  state=setGentDeviceInput(model,state,'L1D1','fire');html=gentPanelFace(gentView(model,state),{hintKey:'CANCEL_BUZZER'});
  assert.match(html,/gent-led on red/);assert.match(html,/data-key="CANCEL_BUZZER"[^>]*aria-label="Cancel Buzzer — next hinted key"/);
  assert.match(html,/<span class="lit">1<\/span>/);
});

test('GENT controller completes every lesson only after the real learner actions',async()=>{
  await harness(async({app,click,progress,controller,values})=>{
    for(const lesson of lessons.lessons){
      click('start-lesson',{id:lesson.id});
      assert.equal(progress(),0,lesson.id+' starts at first step');
      for(let index=0;index<lesson.steps.length;index++){
        const step=lesson.steps[index];
        assert.equal(progress(),index,lesson.id+' before '+step.id);
        if(lesson.id==='gent-display-test'&&step.action?.type==='acknowledge'){
          click('lesson-action');assert.equal(progress(),index,'display test cannot complete while still running');
          click('tick');
        }
        if(step.action)click('lesson-action');else click('key',{key:step.nextKey});
        if(index+1<lesson.steps.length)assert.equal(progress(),index+1,lesson.id+' advances '+step.id);
      }
      assert.ok(app.innerHTML.includes('LESSON COMPLETE'),lesson.id+' reaches completed UI');
      await controller.flush();
      assert.ok(values['gent-vigilon-trainer-v1'].completed[lesson.id],lesson.id+' persisted');
    }
  });
});

test('wrong PIN digits and detours produce useful hints without granting progress',async()=>{
  await harness(async({click,progress,hint})=>{
    const lesson=lessons.lessons.find(l=>l.id==='gent-disable-device');
    click('start-lesson',{id:lesson.id});
    const pinIndex=lesson.steps.findIndex(step=>step.conditions?.some(c=>c.type==='field'&&c.name==='pin'&&c.value==='2'));
    assert.ok(pinIndex>0);
    for(const step of lesson.steps.slice(0,pinIndex)){if(step.action)click('lesson-action');else click('key',{key:step.nextKey});}
    click('key',{key:'9'});assert.equal(progress(),pinIndex);assert.equal(hint(),'DELETE');
    click('key',{key:'DELETE'});assert.equal(hint(),'2');
    click('key',{key:'2'});assert.equal(progress(),pinIndex+1);assert.equal(hint(),'4');
    click('key',{key:'4'});assert.equal(progress(),pinIndex+2);
    click('key',{key:'MENU_ON_OFF'});assert.equal(progress(),pinIndex+2);
    let turns=0;
    while(progress()===pinIndex+2&&turns++<15){const key=hint();assert.ok(key,'recovery offers a key');click('key',{key});}
    assert.equal(progress(),pinIndex+3,'rebuilds246 after a menu detour without an infinite loop');
  });
});

test('SHOW HINTS replans protected menu navigation without auto pressing or disabling',async()=>{
  await harness(async({click,app,hint,controller,values})=>{
    click('hint-node',{id:'disable-device-loop'});
    assert.equal(hint(),'MENU_ON_OFF');
    await controller.flush();assert.equal(values['gent-vigilon-trainer-v1'].state.menuOpen,false);
    let presses=0;
    while(!app.innerHTML.includes('MENU REACHED')&&presses++<25){const key=hint();assert.ok(key);click('key',{key});}
    assert.ok(app.innerHTML.includes('MENU REACHED'));
    await controller.flush();assert.deepEqual(values['gent-vigilon-trainer-v1'].state.disabledDevices,[]);
    assert.deepEqual(values['gent-vigilon-trainer-v1'].state.disabledZones,[]);
  });
});

test('guided commit hints rebuild cleared device, loop, zone and history selections after a detour',async()=>{
  await harness(async({click,progress,hint,app})=>{
    for(const lesson of lessons.lessons){
      for(let index=0;index<lesson.steps.length;index++){
        if(!lesson.steps[index].requiredEntries?.length)continue;
        click('start-lesson',{id:lesson.id});
        for(const step of lesson.steps.slice(0,index)){if(step.action)click('lesson-action');else click('key',{key:step.nextKey});}
        assert.equal(progress(),index);
        click('key',{key:'MENU_ON_OFF'});
        assert.equal(progress(),index,'an abort is not a completed commit');
        let presses=0;
        while(progress()===index&&presses++<65){const key=hint();assert.ok(key,lesson.id+' has a recovery key');click('key',{key});}
        assert.ok(progress()===index+1||app.innerHTML.includes('LESSON COMPLETE'),lesson.id+' recovered its cleared selectors');
      }
    }
  });
});

test('lesson progress survives reopening while current tests and temporary access do not',async()=>{
  let persisted;
  await harness(async({click,controller,values})=>{
    const lesson=lessons.lessons[0];click('start-lesson',{id:lesson.id});
    for(const step of lesson.steps){if(step.action)click('lesson-action');else click('key',{key:step.nextKey});}
    click('zone-test',{zone:'Z2',value:'on'});
    controller.leave();await controller.flush();persisted=structuredClone(values['gent-vigilon-trainer-v1']);
    assert.deepEqual(persisted.state.testZones,[]);
  });
  await harness(async({controller,app})=>{
    await controller.render('learn');
    assert.ok(app.innerHTML.includes(`1 / ${lessons.lessons.length}`));
    assert.ok(app.innerHTML.includes('✓ Completed'));
  },{'gent-vigilon-trainer-v1':persisted});
});

test('help and menu search match multiple words and do not lose source-only entries',()=>{
  assert.ok(gentSearch(lessons.helpArticles,'sensing disable').length>0);
  assert.ok(gentSearch(data.menuReference,'Zone Test').some(item=>item.status!=='implemented'));
  assert.equal(gentSearch(lessons.helpArticles,'unfindable-gent-phrase').length,0);
});

test('walk-test aliases lead to usable lessons in Learn, Help and Menu map',async()=>{
  for(const query of ['walk test','walk-test','walktest','Zone Test','how to put a vigilion in walk test']){
    assert.ok(gentSearch(lessons.lessons,query).some(item=>item.id==='gent-walk-test'),query);
    assert.ok(gentSearch(lessons.helpArticles,query).some(item=>item.id==='zone-test-behaviour'),query);
  }
  await harness(async({controller,app,search})=>{
    assert.match(app.innerHTML,/aria-label="Walk test with hints"/);
    assert.match(app.innerHTML,/data-id="gent-walk-test">SHOW HINTS/);
    for(const [section,kind] of [['learn','learn'],['help','help'],['map','map']]){
      await controller.render(section);
      const html=search(kind,'walktest');
      assert.match(html,/data-id="gent-walk-test"/);
      assert.match(html,/SHOW HINTS/);
    }
    await controller.render('help','zone-test-behaviour');
    assert.match(app.innerHTML,/data-id="gent-walk-test">SHOW HINTS/);
    await controller.render('help','finish-zone-test');
    assert.match(app.innerHTML,/data-id="gent-end-walk-test">SHOW HINTS/);
  });
});

test('walk-test hints never enter the menu, authenticate or start Test for the learner',async()=>{
  await harness(async({click,progress,hint,controller,values})=>{
    click('start-lesson',{id:'gent-walk-test'});
    click('hints');click('hints');
    await controller.flush();
    const state=values['gent-vigilon-trainer-v1'].state;
    assert.equal(progress(),0);
    assert.equal(hint(),null,'initial review is an explicit learner action');
    assert.equal(state.menuOpen,false);
    assert.equal(gentView(model,state).status.authenticatedLevel<3,true);
    assert.deepEqual(state.testZones,[]);
    click('lesson-action');assert.equal(hint(),'MENU_ON_OFF');
    await controller.flush();
    assert.equal(values['gent-vigilon-trainer-v1'].state.menuOpen,false);
  });
});

test('guided walk test pauses its cycle, then free practice counts elapsed time across redraws',async()=>{
  const original={now:Date.now,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
  let now=1000,nextId=0;const timers=new Map();
  Date.now=()=>now;
  globalThis.setTimeout=(callback,ms)=>{const id=++nextId;timers.set(id,{callback,ms});return id;};
  globalThis.clearTimeout=id=>timers.delete(id);
  try{
    await harness(async({click,progress,controller,values,app})=>{
      const lesson=lessons.lessons.find(item=>item.id==='gent-walk-test');
      const cycleStep=lesson.steps.findIndex(step=>step.action?.type==='advance-time');
      click('start-lesson',{id:lesson.id});
      for(const step of lesson.steps.slice(0,cycleStep)){if(step.action)click('lesson-action');else click('key',{key:step.nextKey});}
      assert.equal(progress(),cycleStep);
      assert.match(app.innerHTML,/Advance 5 simulated seconds/);
      await controller.flush();
      assert.equal(gentView(model,values['gent-vigilon-trainer-v1'].state).status.fireCount,1);
      assert.equal(timers.size,0,'guided time waits for its labelled learner action');
      for(const key of ['MENU_ON_OFF','F4','F1'])click('key',{key});
      assert.deepEqual([...timers.values()].map(timer=>timer.ms),[4000],'an accidental display test still gets its own timer');
      now+=4000;[...timers.values()][0].callback();await controller.flush();
      const afterDisplay=gentView(model,values['gent-vigilon-trainer-v1'].state);
      assert.equal(afterDisplay.displayTestRemainingMs,0,'the display-test detour does not freeze');
      assert.equal(afterDisplay.testCycles.Z2.remainingMs,5000,'guided zone time remains paused while the display test runs');
      assert.equal(progress(),cycleStep,'the detour does not complete the learner action');
      click('stop-lesson');
      assert.deepEqual([...timers.values()].map(timer=>timer.ms),[5000]);
      now+=2000;click('hints');
      assert.deepEqual([...timers.values()].map(timer=>timer.ms),[3000],'a redraw keeps the elapsed two seconds');
      now+=3000;const timer=[...timers.values()][0];timer.callback();
      await controller.flush();
      const view=gentView(model,values['gent-vigilon-trainer-v1'].state);
      assert.equal(view.status.fireCount,0,'automatic cycle resets the test fire');
      assert.equal(view.status.sounders,false);
      assert.equal(view.status.testCount,1,'five seconds does not finish Zone Test');
      assert.equal(timers.size,0);
    });
  }finally{Date.now=original.now;globalThis.setTimeout=original.setTimeout;globalThis.clearTimeout=original.clearTimeout;}
});


test('global HINTS keeps the current guided task and only enables its existing next-step cues',async()=>{
 await harness(async({controller,click,progress,values,listeners})=>{
  const selected=lessons.lessons[0];click('start-lesson',{id:selected.id});
  if(selected.steps[0].action)click('lesson-action');
  click('hints');await controller.flush();const before=structuredClone(values['gent-vigilon-trainer-v1']),at=progress();let prevented=false;
  listeners['findr:request-hints']({detail:{engineId:'gent-vigilon'},preventDefault(){prevented=true;}});await controller.flush();
  assert.ok(prevented);assert.equal(progress(),at);assert.deepEqual(values['gent-vigilon-trainer-v1'].state,before.state);assert.deepEqual(values['gent-vigilon-trainer-v1'].completed,before.completed);assert.equal(values['gent-vigilon-trainer-v1'].hints,true);
 });
});
