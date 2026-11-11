import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createTwinflexController,TWINFLEX_STORE_KEY} from '../public/app/twinflex.mjs';
import {buildTwinflexModel,createTwinflexState,pressTwinflexKey} from '../public/app/twinflex-engine.mjs';
const data=JSON.parse(readFileSync(new URL('../public/app/data/twinflex.json',import.meta.url)));
async function harness(callback,{initial={},readFail=false,writeFail=false}={}){
 const prior={fetch:globalThis.fetch,document:globalThis.document,location:globalThis.location},events={},values=structuredClone(initial),manuals=[],families=[],notices=[];let readingFails=readFail,writingFails=writeFail;
 const app={innerHTML:'',addEventListener:(name,fn)=>{events[name]=fn;},querySelector:()=>null};
 globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(data)});globalThis.location={hash:'#twinflex'};globalThis.document={addEventListener:()=>{},querySelector:()=>null};
 const db={setting:async key=>{if(readingFails)throw Error('Synthetic read failure');return values[key];},setSetting:async(key,value)=>{if(writingFails)throw Error('Synthetic write failure');values[key]=structuredClone(value);}};
 const controller=createTwinflexController({app,db,toast:v=>notices.push(v),showManuals:(ids,title)=>manuals.push({ids,title}),showFamilyManuals:id=>families.push(id)});
 async function click(action,extra={}){const node={dataset:{twinflexAction:action,...extra},disabled:false,closest(){return this;}};events.click({target:node});await Promise.resolve();await Promise.resolve();}
 async function physical(key){const node={dataset:{twinflexKey:key},disabled:false,closest(){return this;}};events.click({target:node});await Promise.resolve();await Promise.resolve();}
 const progress=()=>Number(app.innerHTML.match(/<progress[^>]*value="(\d+)"/)?.[1]??-1);
 try{await controller.render();await callback({app,events,controller,values,manuals,families,notices,click,physical,progress,setReadFail:v=>{readingFails=v;},setWriteFail:v=>{writingFails=v;}});}finally{controller.leave();await controller.flush().catch(()=>{});Object.assign(globalThis,prior);}
}

test('all nine call-outs advance only via documented physical keys or labelled assists',async()=>{
 await harness(async({click,physical,progress,app,controller,values})=>{for(const lesson of data.lessons){await click('lesson',{id:lesson.id});assert.equal(progress(),0,lesson.id);for(let i=0;i<lesson.steps.length;i++){const step=lesson.steps[i];if(step.action)await click('lesson-action');else for(const key of step.expectedKeys)await physical(key);assert.equal(progress(),i+1,lesson.id+' / '+step.title);}assert.match(app.innerHTML,/LESSON COMPLETE/);await controller.flush();assert.ok(values[TWINFLEX_STORE_KEY].completed[lesson.id],lesson.id);}});
});

test('global hints reveal the active step without advancing keys or losing progress',async()=>{
 await harness(async({click,physical,progress,events,controller,values,app})=>{await click('lesson',{id:'engineer-access'});await physical('3');await click('hints');await controller.flush();const before=structuredClone(values[TWINFLEX_STORE_KEY]),at=progress();let prevented=false;events['findr:request-hints']({detail:{engineId:'twinflex'},preventDefault(){prevented=true;}});await controller.flush();assert.ok(prevented);assert.equal(progress(),at);assert.deepEqual(values[TWINFLEX_STORE_KEY].state,before.state);assert.match(app.innerHTML,/next hinted control/);});
});

test('wrong key cannot earn a lesson step; hints never silently execute a requested route',async()=>{
 await harness(async({click,physical,progress,controller,values,app})=>{await click('lesson',{id:'engineer-access'});await physical('9');assert.equal(progress(),0);assert.match(app.innerHTML,/panel differs/);await click('restart');for(const k of '3647')await physical(k);await click('free');await click('route',{id:'zone-power'});await controller.flush();assert.equal(values[TWINFLEX_STORE_KEY].state.nodeId,'root');assert.equal(values[TWINFLEX_STORE_KEY].state.buffer,'');for(let i=0;i<12&&!app.innerHTML.includes('At the documented selection');i++){const match=app.innerHTML.match(/data-twinflex-key="([^"]+)"[^>]*aria-label="[^"]*next hinted control/);assert.ok(match);await physical(match[1]);}await controller.flush();assert.equal(values[TWINFLEX_STORE_KEY].state.nodeId,'zone-power');assert.equal(values[TWINFLEX_STORE_KEY].state.pendingReset,false);});
});

test('manual links use existing viewer and verified model-family callback',async()=>{
 await harness(async({click,manuals,families,controller,app})=>{await controller.render('sources');assert.match(app.innerHTML,/26-0959 Rev.18/);await click('source',{source:'twinflex-pro2-engineer-18',page:'41'});assert.deepEqual(manuals[0].ids,['fike-6cfbefcbbb78']);assert.match(manuals[0].title,/PDF p41/);await click('family-manuals');assert.deepEqual(families,['fike-twinflexpro2']);});
});

test('failed storage writes preserve previous saved state; retry saves ongoing practice',async()=>{
 await harness(async({physical,controller,setWriteFail,values,click,notices})=>{await physical('ENABLE_KEY');await controller.flush();const before=structuredClone(values[TWINFLEX_STORE_KEY]);setWriteFail(true);await physical('SOUND_ALARMS');await assert.rejects(controller.flush(),/Synthetic write failure/);assert.deepEqual(values[TWINFLEX_STORE_KEY],before);assert.ok(notices.length);setWriteFail(false);await click('retry-save');await controller.flush();assert.equal(values[TWINFLEX_STORE_KEY].state.evacuate,true);});
});

test('failed reads cannot overwrite existing practice; reload restores only Twinflex namespace',async()=>{
 const model=buildTwinflexModel(data),state=createTwinflexState(model);state.zoneDisabled[2]=true;const saved={version:1,state,completed:{'fault-log':{at:'earlier'}},hints:false};const initial={[TWINFLEX_STORE_KEY]:saved,'case-store-v1':{keep:'saved fault log'},'other-engine':{keep:true}};
 await harness(async({app,physical,values,setReadFail,click,controller})=>{assert.match(app.innerHTML,/has not been overwritten/);await physical('ENABLE_KEY');assert.deepEqual(values,initial);setReadFail(false);await click('retry-load');await new Promise(r=>setImmediate(r));await physical('ENABLE_KEY');await controller.flush();assert.equal(values[TWINFLEX_STORE_KEY].state.zoneDisabled[2],true);assert.deepEqual(values['case-store-v1'],initial['case-store-v1']);assert.deepEqual(values['other-engine'],initial['other-engine']);},{initial,readFail:true});
});

test('saved pending configuration and active call-out survive controller reload',async()=>{
 let initial;await harness(async({click,physical,controller,values})=>{await click('lesson',{id:'zone-power'});for(const step of data.lessons.find(l=>l.id==='zone-power').steps.slice(0,5)){if(step.action)await click('lesson-action');else for(const k of step.expectedKeys)await physical(k);}await controller.flush();initial=structuredClone(values);assert.equal(initial[TWINFLEX_STORE_KEY].state.pendingReset,true);});
 await harness(async({app,click,physical,controller,values,progress})=>{assert.match(app.innerHTML,/RESET required/);assert.equal(progress(),5);await physical('RESET');await controller.flush();assert.equal(values[TWINFLEX_STORE_KEY].state.applied['zone-power'][0],'OFF');assert.equal(progress(),6);},{initial});
});
