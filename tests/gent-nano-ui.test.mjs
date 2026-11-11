import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNanoController,nanoPanelFace,nanoSearch} from '../public/app/gent-nano.mjs';
import {buildNanoModel,createNanoState,nanoView,setNanoDeviceInput,pressNanoKey,findNanoRoute} from '../public/app/gent-nano-engine.mjs';

const read=name=>JSON.parse(readFileSync(new URL(`../public/app/data/${name}.json`,import.meta.url)));
const data=read('gent-nano'),content=read('gent-nano-lessons'),model=buildNanoModel(data);
const storageKey='gent-nano-trainer-v1';

async function harness(callback,initial={}) {
  const original={document:globalThis.document,location:globalThis.location,fetch:globalThis.fetch};
  const listeners={},values=structuredClone(initial),notices=[];
  const app={innerHTML:'',addEventListener:(name,fn)=>listeners[name]=fn,querySelector:()=>null,querySelectorAll:()=>[]};
  globalThis.document={hidden:false,activeElement:null,addEventListener:()=>{}};
  globalThis.location={hash:'#nano'};
  globalThis.fetch=async url=>({ok:true,json:async()=>structuredClone(String(url).includes('gent-nano-lessons')?content:data)});
  const db={setting:async key=>values[key],setSetting:async(key,value)=>{values[key]=structuredClone(value);}};
  const controller=createNanoController({app,db,toast:message=>notices.push(message)});
  const click=(action,extra={})=>{const target={dataset:{nanoAction:action,...extra},disabled:false,closest:()=>target};listeners.click({target});};
  const progress=()=>Number(app.innerHTML.match(/<progress[^>]*value="(\d+)"/)?.[1]??-1);
  const hint=()=>app.innerHTML.match(/class="[^"]*nano-hint-key[^"]*"[^>]*data-key="([^"]+)"/)?.[1]||null;
  const act=step=>{if(step.action)click('lesson-action');else for(const key of step.expectedKeys)click('key',{key});};
  try{await controller.render();await callback({controller,app,click,progress,hint,act,values,notices,listeners});}
  finally{controller.leave();await controller.flush();for(const [key,value] of Object.entries(original)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
}

test('Nano face uses the nine sourced controls, sixteen zones and correct indicator colours',()=>{
  let state=createNanoState(model),html=nanoPanelFace(nanoView(model,state));
  const keys=[...html.matchAll(/data-key="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(keys,['LEFT_SOFT','MINUS','NEXT','PLUS','RIGHT_SOFT','CANCEL_BUZZER','RESET','SOUND_ALARMS','SILENCE_ALARMS']);
  assert.equal((html.match(/class="nano-zone(?: lit| flashing)*"/g)||[]).length,16);
  assert.match(html,/nano-led on green nano-led-bar/);
  state=setNanoDeviceInput(model,state,'D1','fire');html=nanoPanelFace(nanoView(model,state),{hintKey:'CANCEL_BUZZER'});
  assert.match(html,/nano-zone lit flashing/);assert.match(html,/nano-led on red nano-led-bar/);
  assert.match(html,/aria-label="Cancel Buzzer — next hinted key"/);
  assert.doesNotMatch(html,/data-key="(?:F[1-4]|[0-9]|MENU_ON_OFF)"/);
});

test('Every Nano lesson completes through the real controller and its complete literal key sequences',async()=>{
  await harness(async({controller,app,click,progress,values})=>{
    for(const lesson of content.lessons){
      click('start-lesson',{id:lesson.id});assert.equal(progress(),0,lesson.id+' first step');
      for(let index=0;index<lesson.steps.length;index++){
        const step=lesson.steps[index];assert.equal(progress(),index,step.id+' before');
        if(step.action)click('lesson-action');else {
          assert.ok(step.expectedKeys.length,step.id+' has literal physical keys');
          for(let k=0;k<step.expectedKeys.length;k++){
            click('key',{key:step.expectedKeys[k]});
            if(k+1<step.expectedKeys.length)assert.equal(progress(),index,step.id+' does not advance early');
          }
        }
        if(index+1<lesson.steps.length)assert.equal(progress(),index+1,step.id+' advances on its actual result');
      }
      assert.ok(app.innerHTML.includes('LESSON COMPLETE'),lesson.id+' completes');
      await controller.flush();assert.ok(values[storageKey].completed[lesson.id],lesson.id+' completion persisted');
    }
  });
});

test('Nano hint navigation waits for learner presses and does not commit a disablement',async()=>{
  await harness(async({click,hint,app,controller,values})=>{
    click('hint-node',{id:'zones'});assert.equal(hint(),'LEFT_SOFT');
    await controller.flush();assert.equal(values[storageKey].state.nodeId,'status');
    let presses=0;
    while(!app.innerHTML.includes('MENU REACHED')&&presses++<70){const key=hint();assert.ok(key,'route offers a real next button');click('key',{key});}
    assert.ok(app.innerHTML.includes('MENU REACHED'));
    await controller.flush();assert.deepEqual(values[storageKey].state.disabledZones,[]);assert.deepEqual(values[storageKey].state.disabledDevices,[]);
    assert.equal(values[storageKey].state.weeklyTest,false);
  });
});

test('Wrong Nano PIN digits and cursor detours recover through visible physical-button hints',async()=>{
  await harness(async({click,progress,hint,act,controller,values})=>{
    const lesson=content.lessons.find(l=>l.id==='nano-customer-code');click('start-lesson',{id:lesson.id});act(lesson.steps[0]);
    assert.equal(progress(),1);click('key',{key:'MINUS'});click('key',{key:'NEXT'});assert.equal(progress(),1);
    let taps=0;while(progress()===1&&taps++<50){const key=hint();assert.ok(key,'incorrect PIN has a recovery key');click('key',{key});}
    assert.equal(progress(),2);await controller.flush();assert.equal(values[storageKey].state.form.pin,'2468');assert.equal(values[storageKey].state.accessLevel,1);
    click('key',{key:'LEFT_SOFT'});assert.equal(progress(),3);await controller.flush();assert.equal(values[storageKey].state.accessLevel,2);
  });
});

test('A discarded disablement draft can be rebuilt, and completion offers its matching restore lesson',async()=>{
  await harness(async({click,progress,hint,act,app,controller,values})=>{
    const lesson=content.lessons.find(l=>l.id==='nano-disable-device');
    const commit=lesson.steps.findIndex(s=>s.nextKey==='LEFT_SOFT'&&s.goal?.values?.status==='DISABLED');
    assert.ok(commit>=0);click('start-lesson',{id:lesson.id});for(const s of lesson.steps.slice(0,commit))act(s);
    click('key',{key:'RIGHT_SOFT'});assert.equal(progress(),commit);
    await controller.flush();assert.deepEqual(values[storageKey].state.disabledDevices,[]);
    let taps=0;while(progress()===commit&&taps++<80){const key=hint();assert.ok(key,'abandoned draft has a recovery key');click('key',{key});}
    assert.equal(progress(),commit+1);for(const s of lesson.steps.slice(commit+1))act(s);
    assert.ok(app.innerHTML.includes('LESSON COMPLETE'));assert.ok(app.innerHTML.includes('data-id="nano-enable-device"'));
    assert.ok(app.innerHTML.includes('simulated disablement'));
  });
});

test('Guided timed lessons explicitly pause time and keep each observation under learner control',async()=>{
  await harness(async({click,act,app,progress,controller,values})=>{
    const lesson=content.lessons.find(l=>l.id==='nano-display-test');click('start-lesson',{id:lesson.id});
    const timed=lesson.steps.findIndex(s=>s.action?.type==='tick');assert.ok(timed>=0);
    for(const s of lesson.steps.slice(0,timed))act(s);
    assert.match(app.innerHTML,/Practice time paused while you learn/);
    await controller.flush();assert.equal(values[storageKey].state.displayTestRemainingMs,8000);
    assert.match(app.innerHTML,/nano-zone lit/);click('lesson-action');assert.equal(progress(),timed+1);
    await controller.flush();assert.equal(values[storageKey].state.displayTestRemainingMs,0);
  });
});

test('Nano completion and persistent disablements survive reopening; transient access and tests are cleared',async()=>{
  let saved;
  await harness(async({click,act,controller,values})=>{
    const lesson=content.lessons.find(l=>l.id==='nano-disable-device');click('start-lesson',{id:lesson.id});for(const s of lesson.steps)act(s);
    controller.leave();await controller.flush();saved=structuredClone(values[storageKey]);
    assert.equal(saved.state.accessLevel,1);assert.equal(saved.state.nodeId,'status');assert.ok(saved.state.disabledDevices.includes('D1'));
    assert.equal(saved.state.weeklyTest,false);assert.deepEqual(saved.state.testCycles,{});
  });
  await harness(async({controller,app})=>{await controller.render('learn');assert.ok(app.innerHTML.includes('1 / 28'));assert.ok(app.innerHTML.includes('✓ Completed'));},{[storageKey]:saved});
});

test('Nano help retains exact scope and references without offering an automatic operation to reach weekly-running',async()=>{
  assert.ok(nanoSearch(content.helpArticles,'weekly test').length>0);
  assert.ok(nanoSearch(content.helpArticles,'PIN').length>0);
  assert.ok(nanoSearch(data.menuReference,'engineering').some(item=>item.status!=='implemented'));
  await harness(async({controller,app})=>{
    await controller.render('map');assert.doesNotMatch(app.innerHTML,/data-id="weekly-running"/);
    await controller.render('sources');assert.match(app.innerHTML,/Device\/channel disablement is commissioned for Customer access here/);
    assert.doesNotMatch(app.innerHTML,/<p>[^<]*nano-operator-9[^<]*<\/p>/,'raw source identifiers stay out of scope prose');
  });
});

test('A completed display test lights every zone without changing saved disablements',()=>{
  let state=createNanoState(model,{scenarioId:'device-disabled'});
  for(const key of findNanoRoute(model,state,'display-test').keys)state=pressNanoKey(model,state,key);
  const html=nanoPanelFace(nanoView(model,state));
  assert.equal((html.match(/class="nano-zone lit"/g)||[]).length,16);
  assert.deepEqual(state.disabledDevices,['D1']);
});


test('global HINTS keeps the current guided task and only enables its existing next-step cues',async()=>{
 await harness(async({controller,click,progress,values,listeners})=>{
  const selected=content.lessons[0];click('start-lesson',{id:selected.id});
  if(selected.steps[0].action)click('lesson-action');
  click('hints');await controller.flush();const before=structuredClone(values['gent-nano-trainer-v1']),at=progress();let prevented=false;
  listeners['findr:request-hints']({detail:{engineId:'gent-nano'},preventDefault(){prevented=true;}});await controller.flush();
  assert.ok(prevented);assert.equal(progress(),at);assert.deepEqual(values['gent-nano-trainer-v1'].state,before.state);assert.deepEqual(values['gent-nano-trainer-v1'].completed,before.completed);assert.equal(values['gent-nano-trainer-v1'].hints,true);
 });
});
