import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createConventionalFireController,conventionalPanelFace} from '../public/app/conventional-fire.mjs';
import {buildConventionalModel,createConventionalState,conventionalView,pressConventionalKey,selectConventionalMode,setConventionalCover} from '../public/app/conventional-fire-engine.mjs';
const data=JSON.parse(readFileSync(new URL('../public/app/data/conventional-fire.json',import.meta.url)));
const key=id=>'conventional-fire-trainer-v1:'+id;
async function harness(id,callback,{initial={},readFail=false,writeFail=false}={}){
 const before={location:globalThis.location,document:globalThis.document,fetch:globalThis.fetch,performance:globalThis.performance};
 const appEvents={},docEvents={},values=structuredClone(initial),notices=[],manuals=[];let now=1000,readFails=readFail,writeFails=writeFail;
 const app={innerHTML:'',querySelector:()=>null,addEventListener:(name,listener)=>{appEvents[name]=listener;}};
 globalThis.location={hash:'#fire-panel/'+id};globalThis.document={hidden:false,addEventListener:(name,listener)=>{docEvents[name]=listener;}};globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(data)});Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>now}});
 const db={setting:async name=>{if(readFails&&name.startsWith('conventional-fire'))throw Error('Synthetic read failure');return values[name];},setSetting:async(name,value)=>{if(writeFails&&name.startsWith('conventional-fire'))throw Error('Synthetic write failure');values[name]=structuredClone(value);}};
 const controller=createConventionalFireController({app,db,toast:value=>notices.push(value),showManuals:(ids,title)=>manuals.push({ids,title})});
 const target=(action,extra={})=>({dataset:{conventionalAction:action,...extra},disabled:false,closest:()=>target.current});
 function element(action,extra={}){const node=target(action,extra);node.closest=()=>node;return node;}
 async function click(action,extra={}){appEvents.click({target:element(action,extra)});await Promise.resolve();await Promise.resolve();}
 async function physical(id,heldMs=0){const node=element('key',{key:id});appEvents.pointerdown({target:node});now+=heldMs;docEvents.pointerup({target:node});appEvents.click({target:node});now+=1000;await Promise.resolve();await Promise.resolve();}
 async function delay(minutes){appEvents.change({target:{id:'conventional-delay-minutes',value:String(minutes),dataset:{}}});await Promise.resolve();await Promise.resolve();}
 const progress=()=>Number(app.innerHTML.match(/<progress[^>]*value="(\d+)"/)?.[1]??-1);
 try{await controller.render(id);await callback({app,controller,values,notices,manuals,click,physical,delay,progress,appEvents,docEvents,setReadFail:value=>{readFails=value;},setWriteFail:value=>{writeFails=value;}});}finally{controller.leave();await controller.flush().catch(()=>{});for(const [name,value]of Object.entries(before)){if(name==='performance')Object.defineProperty(globalThis,name,{configurable:true,value});else if(value===undefined)delete globalThis[name];else globalThis[name]=value;}}
}

test('distinct physical faces use the documented controls and Sigma display only',()=>{
 for(const profile of data.profiles){const model=buildConventionalModel(data,profile.id);let state=createConventionalState(model);if(profile.id==='kentec-sigma-cp'){state=pressConventionalKey(model,state,'KEYSWITCH');state=pressConventionalKey(model,state,'MODE');state=selectConventionalMode(model,state,'d');}const html=conventionalPanelFace(model,conventionalView(model,state));const keys=[...html.matchAll(/data-key="([^"]+)"/g)].map(match=>match[1]);assert.equal(new Set(keys).size,keys.length);assert.deepEqual(new Set(keys),new Set(profile.physicalKeys.map(item=>item.id)));if(profile.id==='c-tec-cfp-standard'){assert.doesNotMatch(html,/seven-segment|System Mode/);for(const [id,number]of [['KEY_1',1],['EXIT',2],['NEXT_OPTION',3],['TOGGLE',4]])assert.match(html,new RegExp('data-key="'+id+'"[^]*?<b aria-hidden="true">'+number+'</b>'));}else{assert.match(html,/aria-label="System Mode"/);assert.match(html,/data-display="d1"/);}assert.equal((html.match(/class="conventional-zone(?: cfp-sr| sigma-sr)?"/g)||[]).length,8);}
});

test('all sourced lessons complete using actual physical controls and explicit training inputs',async()=>{
 for(const profile of data.profiles)await harness(profile.id,async({controller,click,physical,delay,progress,app,values})=>{
  for(const lesson of profile.lessons){await click('lesson',{id:lesson.id});assert.equal(progress(),0,lesson.id);
   for(let index=0;index<lesson.steps.length;index++){const step=lesson.steps[index];assert.equal(progress(),index,lesson.id+'/'+step.id+' before');if(step.expectedKeys)for(const key of step.expectedKeys)await physical(key,step.holdMs||0);else if(typeof step.expectedCover==='boolean')await click('cover',{open:String(step.expectedCover)});else if(step.expectedDelayMinutes!==undefined)await delay(step.expectedDelayMinutes);else if(step.expectedMode)await click('mode',{mode:step.expectedMode});else if(step.expectedInput)await click('lesson-input');else if(step.expectedAction)await click('tick');assert.equal(progress(),index+1,lesson.id+'/'+step.id+' after');}
   assert.match(app.innerHTML,/LESSON COMPLETE/);await controller.flush();assert.ok(values[key(profile.id)].completed[lesson.id]);
  }
 });
});

test('hints render without pressing controls and an insufficient hold cannot complete the step',async()=>{
 await harness('c-tec-cfp-standard',async({app,click,physical,controller,values,progress})=>{const lesson=data.profiles[0].lessons.find(item=>item.steps.some(step=>step.holdMs));await click('lesson',{id:lesson.id});await controller.flush();assert.equal(values[key('c-tec-cfp-standard')].state.keyEnabled,false);assert.match(app.innerHTML,/next hinted control/);const index=lesson.steps.findIndex(step=>step.holdMs);for(const step of lesson.steps.slice(0,index))for(const key of step.expectedKeys||[])await physical(key);const before=progress();await physical(lesson.steps[index].expectedKeys[0],30);assert.equal(progress(),before);await physical(lesson.steps[index].expectedKeys[0],3100);assert.equal(progress(),before+1);});
});

test('manual actions and source lists contain only the selected panel family',async()=>{
 for(const profile of data.profiles)await harness(profile.id,async({controller,click,manuals,app})=>{await click('manuals');await controller.flush();assert.equal(manuals.length,1);const prefix=profile.id==='c-tec-cfp-standard'?'c-tec-':'kentec-';assert.ok(manuals[0].ids.length);assert.ok(manuals[0].ids.every(id=>id.startsWith(prefix)));await controller.render(profile.id,'sources');if(prefix==='c-tec-'){assert.doesNotMatch(app.innerHTML,/Man-1078|Sigma CP.*User/);}else{assert.doesNotMatch(app.innerHTML,/DFU7001020/);assert.match(app.innerHTML,/Check the saved\/downloaded edition|catalogue|source/i);}});
});

test('global HINTS reveals the current conventional lesson without replaying controls or losing progress',async()=>{
 for(const profile of data.profiles)await harness(profile.id,async({app,controller,click,physical,values,progress,appEvents})=>{
  const lesson=profile.lessons.find(item=>item.steps.length>2);await click('lesson',{id:lesson.id});
  const first=lesson.steps[0];if(first.expectedKeys)for(const key of first.expectedKeys)await physical(key,first.holdMs||0);else if(typeof first.expectedCover==='boolean')await click('cover',{open:String(first.expectedCover)});
  await click('hints');await controller.flush();const before=structuredClone(values[key(profile.id)]),at=progress();let prevented=false;
  appEvents['findr:request-hints']({detail:{engineId:profile.id},preventDefault(){prevented=true;}});await controller.flush();
  assert.ok(prevented);assert.equal(progress(),at);assert.deepEqual(values[key(profile.id)].state,before.state);assert.deepEqual(values[key(profile.id)].completed,before.completed);assert.equal(values[key(profile.id)].hints,true);assert.match(app.innerHTML,new RegExp('data-onsite-panel="'+profile.id+'"'));
 });
});

test('lamp controls illuminate while physically held and release without repeating a control',async()=>{
 for(const profile of data.profiles)await harness(profile.id,async({appEvents,docEvents,physical,controller,values})=>{if(profile.id==='c-tec-cfp-standard')await physical('KEYSWITCH');const lampKey=profile.id==='c-tec-cfp-standard'?'TOGGLE':'LAMP_TEST',target={dataset:{conventionalAction:'key',key:lampKey},disabled:false,closest(){return this;}};appEvents.pointerdown({target});await controller.flush();assert.equal(values[key(profile.id)].state.lampTest,true);docEvents.pointerup({target});appEvents.click({target});await controller.flush();assert.equal(values[key(profile.id)].state.lampTest,false);});
});

test('failed saves retain practice and retry without resetting existing disablements',async()=>{
 await harness('c-tec-cfp-standard',async({physical,controller,setWriteFail,values,click,notices})=>{await physical('KEYSWITCH');await controller.flush();const original=structuredClone(values[key('c-tec-cfp-standard')]);setWriteFail(true);await physical('NEXT_OPTION',3100);await physical('TOGGLE');await physical('NEXT_OPTION');await assert.rejects(controller.flush(),/Synthetic write failure/);assert.deepEqual(values[key('c-tec-cfp-standard')],original);assert.ok(notices.length);setWriteFail(false);await click('retry-save');await controller.flush();assert.ok(values[key('c-tec-cfp-standard')].state.disabledZones.includes('Z1'));});
});

test('failed initial read cannot overwrite an existing saved profile when retried',async()=>{
 const profile=data.profiles[0],model=buildConventionalModel(data,profile.id),state=createConventionalState(model);state.disabledZones=['Z3'];const saved={state,completed:{retained:{at:'earlier'}},hints:true};await harness(profile.id,async({physical,click,values,setReadFail,controller})=>{await physical('KEYSWITCH');assert.deepEqual(values[key(profile.id)],saved);setReadFail(false);await click('retry-save');await controller.flush();assert.deepEqual(values[key(profile.id)].state.disabledZones,['Z3']);assert.ok(values[key(profile.id)].completed.retained);},{initial:{[key(profile.id)]:saved},readFail:true});
});

test('a delayed old profile read cannot overwrite a newer profile or its manuals',async()=>{
 const before={location:globalThis.location,document:globalThis.document,fetch:globalThis.fetch};const events={},values={},manuals=[];let resolveA,readStarted;
 const readingA=new Promise(resolve=>{readStarted=resolve;});const pendingA=new Promise(resolve=>{resolveA=resolve;});
 const app={innerHTML:'',querySelector:()=>null,addEventListener:(name,listener)=>{events[name]=listener;}};
 globalThis.document={hidden:false,addEventListener:()=>{}};globalThis.location={hash:'#fire-panel/c-tec-cfp-standard'};globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(data)});
 const db={setting:async name=>{if(name===key('c-tec-cfp-standard')){readStarted();return pendingA;}return values[name];},setSetting:async(name,value)=>{values[name]=structuredClone(value);}};
 const controller=createConventionalFireController({app,db,toast:()=>{},showManuals:ids=>manuals.push(ids)});
 try{
  const a=controller.render('c-tec-cfp-standard');await readingA;
  globalThis.location.hash='#fire-panel/kentec-sigma-cp';await controller.render('kentec-sigma-cp');
  const cfpState=createConventionalState(buildConventionalModel(data,'c-tec-cfp-standard'));cfpState.disabledZones=['Z4'];resolveA({state:cfpState});await a;
  assert.match(app.innerHTML,/conventional-face-sigma/);assert.doesNotMatch(app.innerHTML,/conventional-face-cfp/);
  const target={dataset:{conventionalAction:'manuals'},disabled:false,closest(){return this;}};events.click({target});await Promise.resolve();await Promise.resolve();
  assert.ok(manuals[0].every(id=>id.startsWith('kentec-')));
  target.dataset={conventionalAction:'key',key:'KEYSWITCH'};events.click({target});await controller.flush();
  assert.equal(values[key('kentec-sigma-cp')].state.profileId,'kentec-sigma-cp');assert.deepEqual(values[key('kentec-sigma-cp')].state.disabledZones,[]);assert.equal(values[key('c-tec-cfp-standard')],undefined);
 }finally{controller.leave();await controller.flush().catch(()=>{});for(const [name,value]of Object.entries(before)){if(value===undefined)delete globalThis[name];else globalThis[name]=value;}}
});


test('CFP cover exposes the actual internal SW8 independently from entering level three',async()=>{
 await harness('c-tec-cfp-standard',async({app,controller,click,physical,delay,values})=>{
  assert.match(app.innerHTML,/cfp-instruction-column/);assert.match(app.innerHTML,/data-cover="closed"/);assert.doesNotMatch(app.innerHTML,/data-key="ENGINEER"/);
  await click('cover',{open:'true'});await controller.flush();let saved=values[key('c-tec-cfp-standard')];assert.equal(saved.state.coverOpen,true);assert.equal(saved.state.engineering,null);assert.match(app.innerHTML,/cfp-standard-control-pcb.webp/);assert.match(app.innerHTML,/data-key="ENGINEER"/);
  await physical('ENGINEER');await controller.flush();assert.equal(values[key('c-tec-cfp-standard')].state.engineering.functionId,'coincidence');assert.match(app.innerHTML,/non-compliant with EN54-2/);
  await delay(3);await controller.flush();assert.equal(values[key('c-tec-cfp-standard')].state.settings.delayMinutes,3);
  await click('cover',{open:'false'});await controller.flush();assert.equal(values[key('c-tec-cfp-standard')].state.engineering.functionId,'coincidence');assert.match(app.innerHTML,/Access level 3 is active/);assert.doesNotMatch(app.innerHTML,/data-key="ENGINEER"/);
  await physical('EXIT');await controller.flush();assert.equal(values[key('c-tec-cfp-standard')].state.engineering,null);
 });
});

test('CFP open-board rendering shares actual status indicators and provides a larger-control view',()=>{
 const model=buildConventionalModel(data,'c-tec-cfp-standard');let state=createConventionalState(model);state=setConventionalCover(model,state,true);state=pressConventionalKey(model,state,'ENGINEER');const html=conventionalPanelFace(model,conventionalView(model,state),{zoom:'large'});
 assert.match(html,/cfp-zoom-large/);assert.match(html,/manufacturer diagram|Manufacturer control PCB diagram/);assert.equal((html.match(/data-key="ENGINEER"/g)||[]).length,1);for(const id of ['system-fault','repeater-fault','sounder-fault'])assert.equal((html.match(new RegExp('data-cfp-led="'+id+'"','g'))||[]).length,1,id);assert.equal((html.match(/data-key="[^"]+"/g)||[]).length,9);
});

test('Sigma sourced face keeps the internal Write Enable separate from front controls',()=>{
 const model=buildConventionalModel(data,'kentec-sigma-cp');let state=createConventionalState(model);const closed=conventionalPanelFace(model,conventionalView(model,state));assert.match(closed,/sigma-zone-chart/);assert.match(closed,/sigma-seven-segment/);assert.doesNotMatch(closed,/data-key="WRITE_ENABLE"/);assert.equal((closed.match(/class="sigma-zone-heading"/g)||[]).length,2);
 state=setConventionalCover(model,state,true);const open=conventionalPanelFace(model,conventionalView(model,state),{zoom:'large',hintKey:'WRITE_ENABLE'});assert.match(open,/sigma-zoom-large/);assert.match(open,/sigma-cp-write-enable.webp/);assert.match(open,/manual conflicts on slide direction/);assert.equal((open.match(/data-key="WRITE_ENABLE"/g)||[]).length,1);assert.doesNotMatch(open,/data-key="PROCESSOR_RESET"/);
});

test('Sigma actual code controls set and retain configuration without an invented Enter-unset action',async()=>{
 await harness('kentec-sigma-cp',async({app,controller,click,physical,appEvents,values})=>{
  await click('cover',{open:'true'});await physical('WRITE_ENABLE');await controller.flush();assert.equal(values[key('kentec-sigma-cp')].state.writeEnabled,true);assert.match(app.innerHTML,/data-display="00"/);
  appEvents.change({target:{id:'sigma-configuration-code',value:'29',dataset:{}}});await controller.flush();await physical('ENTER');await controller.flush();assert.ok(values[key('kentec-sigma-cp')].state.sigmaConfig.codes.includes('29'));assert.match(app.innerHTML,/sigma-units-dot flashing/);
  await physical('ENTER');await controller.flush();assert.ok(values[key('kentec-sigma-cp')].state.sigmaConfig.codes.includes('29'));
  await click('cover',{open:'false'});await controller.flush();assert.equal(values[key('kentec-sigma-cp')].state.writeEnabled,true);assert.match(app.innerHTML,/Write Enable remains ON under the closed cover/);assert.doesNotMatch(app.innerHTML,/data-key="WRITE_ENABLE"/);
  await click('cover',{open:'true'});await physical('WRITE_ENABLE');await controller.flush();assert.equal(values[key('kentec-sigma-cp')].state.writeEnabled,false);assert.ok(values[key('kentec-sigma-cp')].state.sigmaConfig.codes.includes('29'));
 });
});

test('Sigma call-out choices lead to sourced lessons and conventional device work remains a training checkpoint',async()=>{
 await harness('kentec-sigma-cp',async({app,controller,click,progress})=>{
  const model=data.profiles.find(item=>item.id==='kentec-sigma-cp');await controller.render(model.id,'callouts');assert.match(app.innerHTML,/zone can contain several detectors/);assert.equal((app.innerHTML.match(/data-conventional-action="callout"/g)||[]).length,model.callOuts.length);
  for(const callout of model.callOuts){await click('callout',{id:callout.id});assert.equal(progress(),0,callout.id);const lesson=model.lessons.find(item=>item.id===callout.lessonId);assert.ok(lesson);assert.match(app.innerHTML,new RegExp(lesson.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));}
  assert.ok(model.lessons.find(item=>item.id==='sigma-add-replace-detector').steps.some(step=>step.expectedInput?.type==='checkpoint'));assert.doesNotMatch(app.innerHTML,/data-key="(?:ADD_DEVICE|ENROL_DEVICE)"/);
 });
});

test('Sigma internal fault references use indicated view state and expose the named watchdog control',async()=>{
 await harness('kentec-sigma-cp',async({app,click,physical,controller,appEvents,values})=>{
  await click('cover',{open:'true'});appEvents.change({target:{id:'',value:'active',dataset:{sigmaDiagnostic:'cpu'}}});await controller.flush();assert.match(app.innerHTML,/CPU fault: indicated/);assert.match(app.innerHTML,/physical positions are not mapped/);assert.match(app.innerHTML,/data-key="WATCHDOG_RESET"/);
  appEvents.change({target:{id:'',value:'normal',dataset:{sigmaDiagnostic:'cpu'}}});await controller.flush();assert.match(app.innerHTML,/CPU fault: indicated/);await physical('WATCHDOG_RESET');await controller.flush();assert.equal(values[key('kentec-sigma-cp')].state.sigmaDiagnostics.cpuLatched,false);assert.match(app.innerHTML,/CPU fault: not indicated/);
 });
});
