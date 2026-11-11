import test from 'node:test';
import assert from 'node:assert/strict';
import {createInvestigationController} from '../public/app/investigation.mjs';
import {createInvestigation,addMeasurement} from '../public/app/investigation-engine.mjs';

// Small controller harness for storage failure/recovery. Browser layout and
// native controls are covered separately by the desktop/mobile workflow check.
const decode=value=>String(value||'').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const attribute=(attrs,name)=>decode(attrs.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1]);
function fakeApp(){
 let html='',elements=new Map();
 return {
  get innerHTML(){return html},
  set innerHTML(value){
   html=value;elements=new Map();
   for(const [,tag,attrs] of html.matchAll(/<(form|span)\b([^>]*)>/g)){const id=attribute(attrs,'id');if(id)elements.set('#'+id,{textContent:'',classList:{toggle(){}},tagName:tag.toUpperCase()});}
   for(const match of html.matchAll(/<(input|textarea|select)\b([^>]*)(?:>([\s\S]*?)<\/\1>|>)/g)){
    const [,tag,attrs,body='']=match,id=attribute(attrs,'id');if(!id)continue;
    let value=tag==='textarea'?decode(body):attribute(attrs,'value');
    if(tag==='select'){
     const options=[...body.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)];
     const selected=options.find(option=>/\bselected\b/.test(option[1]))||options[0];
     value=selected?attribute(selected[1],'value'):'';
    }
    elements.set('#'+id,{value,disabled:/\bdisabled\b/.test(attrs),checked:/\bchecked\b/.test(attrs),textContent:'',classList:{toggle(){}},tagName:tag.toUpperCase()});
   }
  },
  querySelector:selector=>elements.get(selector)||null,
  querySelectorAll:()=>[],
 };
}
const syntheticReading={location:'Synthetic first physical device',kind:'DC voltage',value:'0.00',unit:'V DC',reference:'Recorded test pair',condition:'Synthetic documented test configuration',instrument:'Meter M01',assessment:'not_assessed',engineer:'Test engineer'};
function harness(investigation=createInvestigation('loop')){
 globalThis.location={hash:'#investigation'};
 let session={id:'synthetic-controller-case',group:'loop',site:'Synthetic site',panel:{brand:'Synthetic',model:'Test panel'},message:'Synthetic loop fault',answers:{loop_open:'yes'},investigation};
 let failures=0,waitForSave=null;const notices=[],app=fakeApp();
 const controller=createInvestigationController({app,getSession:()=>session,getKnowledge:()=>({groups:[],sources:[]}),onUpdate:async next=>{if(failures){failures--;throw Error('Synthetic storage failure');}if(waitForSave)await waitForSave;session=structuredClone(next);},saveSession:async()=>{},showManuals(){},toast:message=>notices.push(message),downloadReport(){},copyReport(){}});
 controller.render();
 return {app,controller,notices,get session(){return session},fail(){failures++},pauseSave(promise){waitForSave=promise},field(id){const el=app.querySelector('#'+id);assert.ok(el,`Expected form field ${id}`);return el},fill(prefix,input){for(const [key,value] of Object.entries(input))this.field(prefix+key).value=value},act:(name,id,value)=>controller.handleAction('investigation-'+name,id,value),tab:value=>controller.handleAction('investigation-tab',null,value)};
}

test('reading validation can be corrected without blocking later save and keeps answers unchanged',async()=>{
 const h=harness();await h.tab('measurements');h.fill('inv-measure-', {...syntheticReading,value:''});await h.act('add-reading');assert.equal(h.session.investigation.measurements.length,0);assert.match(h.notices.at(-1),/value/);
 h.field('inv-measure-value').value='0.00';await h.act('add-reading');assert.equal(h.session.investigation.measurements[0].value,'0.00');assert.deepEqual(h.session.answers,{loop_open:'yes'});
});

test('unchanged reading retry saves the staged original once and clears the completed draft',async()=>{
 const h=harness();await h.tab('measurements');h.fill('inv-measure-',syntheticReading);h.fail();await h.act('add-reading');assert.equal(h.session.investigation.measurements.length,0);
 await h.act('add-reading');assert.equal(h.session.investigation.measurements.length,1);assert.equal(h.session.investigation.measurements[0].value,'0.00');assert.equal(h.field('inv-measure-value').value,'');
 await h.act('add-reading');assert.equal(h.session.investigation.measurements.length,1);
});

test('edited reading survives failed-save recovery as an explicit correction draft',async()=>{
 const h=harness();await h.tab('measurements');h.fill('inv-measure-',syntheticReading);h.fail();await h.act('add-reading');h.field('inv-measure-value').value='12.8';
 await h.act('add-reading');const original=h.session.investigation.measurements[0];assert.equal(h.session.investigation.measurements.length,1);assert.equal(original.value,'0.00');assert.equal(h.field('inv-measure-value').value,'12.8');assert.equal(h.field('inv-measure-supersedes').value,original.id);assert.match(h.notices.at(-1),/correction draft/);
 await h.act('add-reading');assert.deepEqual(h.session.investigation.measurements.map(m=>m.value),['0.00','12.8']);assert.equal(h.session.investigation.measurements[1].supersedes,original.id);
});

test('a reading edited while its first save is pending is retained for review too',async()=>{
 const h=harness();await h.tab('measurements');h.fill('inv-measure-',syntheticReading);let release;h.pauseSave(new Promise(resolve=>{release=resolve}));const pending=h.act('add-reading');await new Promise(resolve=>setImmediate(resolve));h.field('inv-measure-value').value='12.80';release();await pending;
 assert.equal(h.session.investigation.measurements.length,1);assert.equal(h.session.investigation.measurements[0].value,'0.00');assert.equal(h.field('inv-measure-value').value,'12.80');assert.match(h.notices.at(-1),/correction draft/);
});

test('work-log retry preserves changed text as a draft without silently adding or replacing it',async()=>{
 const h=harness();await h.tab('work');h.fill('inv-work-',{engineer:'Test engineer',action:'Original inspection',reason:'Initial scope',outcome:'Unresolved'});h.fail();await h.act('add-work');h.field('inv-work-outcome').value='Revised findings, still unresolved';await h.act('retry-save');
 assert.equal(h.session.investigation.actions.length,1);assert.equal(h.session.investigation.actions[0].outcome,'Unresolved');assert.equal(h.field('inv-work-outcome').value,'Revised findings, still unresolved');assert.match(h.notices.at(-1),/revised text.*draft/);
 await h.act('add-work');assert.equal(h.session.investigation.actions.length,2);assert.equal(h.session.investigation.actions[1].outcome,'Revised findings, still unresolved');assert.equal(h.field('inv-work-action').value,'');
});

test('unchanged work-log retry adds only the staged original',async()=>{
 const h=harness();await h.tab('work');h.fill('inv-work-',{engineer:'Test engineer',action:'Original inspection',reason:'Initial scope',outcome:'Unresolved'});h.fail();await h.act('add-work');await h.act('add-work');assert.equal(h.session.investigation.actions.length,1);assert.equal(h.field('inv-work-action').value,'');
});

test('loop observation fields stay locked while the submitted classification awaits storage recovery',async()=>{
 const inv=addMeasurement(createInvestigation('loop'),syntheticReading);inv.loop={...inv.loop,points:['Synthetic first point','Synthetic last point'],source:'Synthetic procedure',configuration:'Recorded condition'};
 const h=harness(inv);await h.tab('plan');h.fill('inv-loop-',{point:'0',assessment:'inconclusive',measurement:inv.measurements[0].id,notes:'Synthetic evidence remains inconclusive'});h.fail();await h.act('add-loop-observation');assert.equal(h.session.investigation.loop.observations.length,0);
 h.controller.render();for(const key of ['point','assessment','measurement','notes'])assert.equal(h.field('inv-loop-'+key).disabled,true);
 assert.match(h.notices.at(-1),/fields are locked/);await h.act('retry-save');assert.equal(h.session.investigation.loop.observations.length,1);for(const key of ['point','assessment','measurement','notes'])assert.equal(h.field('inv-loop-'+key).disabled,false);
});


test('quick log is the default and saves a raw panel voltage with no form details',async()=>{
 const h=harness();assert.match(h.app.innerHTML,/Fault finding log\./);assert.ok(h.app.querySelector('#investigation-quick-form'));assert.equal(h.app.querySelector('#inv-setup-engineer'),null);
 h.field('inv-quick-value').value='0.00';await h.act('add-quick');const reading=h.session.investigation.measurements[0];
 assert.equal(reading.location,'Panel');assert.equal(reading.value,'0.00');assert.equal(reading.unit,'V DC');assert.equal(reading.entryMode,'quick');assert.equal(reading.assessment,'not_assessed');assert.equal(reading.reference,'');assert.equal(reading.condition,'');assert.deepEqual(h.session.answers,{loop_open:'yes'});assert.equal(h.field('inv-quick-value').value,'');
});

test('quick dropdown points and other point names remain distinct in the log',async()=>{
 const h=harness();h.fill('inv-quick-',{point:'First device',value:'024.00'});await h.act('add-quick');h.fill('inv-quick-',{point:'Last device',value:'0.00'});await h.act('add-quick');h.fill('inv-quick-',{point:'other',location:'Device 037 / reception',value:'OL',unit:'Ω',notes:'Synthetic isolated fixture only'});await h.act('add-quick');
 assert.deepEqual(h.session.investigation.measurements.map(m=>[m.location,m.value]),[['First device','024.00'],['Last device','0.00'],['Device 037 / reception','OL']]);assert.equal(h.session.investigation.measurements[2].notes,'Synthetic isolated fixture only');assert.equal(h.session.investigation.loop.observations.length,0);
});

test('quick save rejects a missing value or custom point without blocking correction',async()=>{
 const h=harness();await h.act('add-quick');assert.equal(h.session.investigation.measurements.length,0);h.fill('inv-quick-',{point:'other',value:'12.8',location:''});await h.act('add-quick');assert.equal(h.session.investigation.measurements.length,0);
 h.field('inv-quick-location').value='Reception';await h.act('add-quick');assert.equal(h.session.investigation.measurements.length,1);
});

test('quick failed-save retry preserves the original once and the edited correction draft',async()=>{
 const h=harness();h.field('inv-quick-value').value='0.00';h.fail();await h.act('add-quick');assert.equal(h.session.investigation.measurements.length,0);h.field('inv-quick-value').value='12.8';await h.act('add-quick');
 const original=h.session.investigation.measurements[0];assert.equal(h.session.investigation.measurements.length,1);assert.equal(original.value,'0.00');assert.equal(h.field('inv-quick-value').value,'12.8');assert.match(h.app.innerHTML,/Correction — the original reading stays/);await h.act('add-quick');
 assert.deepEqual(h.session.investigation.measurements.map(m=>m.value),['0.00','12.8']);assert.equal(h.session.investigation.measurements[1].supersedes,original.id);
});

test('unchanged quick retry does not duplicate a reading and Save log saves its pending value',async()=>{
 const h=harness();h.field('inv-quick-value').value='24.0';h.fail();await h.act('add-quick');await h.act('retry-save');assert.equal(h.session.investigation.measurements.length,1);assert.equal(h.field('inv-quick-value').value,'');
 h.fill('inv-quick-',{point:'Last device',value:'22.5'});await h.act('save-case');assert.equal(h.session.investigation.measurements.length,2);assert.equal(h.session.investigation.measurements[1].location,'Last device');assert.equal(h.field('inv-quick-value').value,'');
});

test('quick corrections use the quick form and drafts survive opening optional tools',async()=>{
 const h=harness();h.field('inv-quick-value').value='24.0';await h.act('add-quick');const original=h.session.investigation.measurements[0];await h.act('correct-reading',original.id);assert.ok(h.app.querySelector('#investigation-quick-form'));h.field('inv-quick-value').value='23.9';await h.tab('plan');await h.tab('quick');assert.equal(h.field('inv-quick-value').value,'23.9');await h.act('add-quick');assert.equal(h.session.investigation.measurements[1].supersedes,original.id);
});

test('helper-owned log navigation stays inside its helper instead of opening the legacy session',()=>{
 const app=fakeApp(),session={id:'helper-job-log',group:'loop',answers:{},panel:{brand:'Test',model:'Panel'},investigation:createInvestigation('loop')};
 globalThis.location={hash:'#helpers/helper-one/fault-log'};
 const controller=createInvestigationController({app,route:location.hash,getSession:()=>session,getKnowledge:()=>({groups:[],sources:[]}),onUpdate:async()=>{},saveSession:async()=>{},showManuals(){},toast(){},downloadReport(){},copyReport(){},backHref:'#helpers/helper-one/faults',backLabel:'Helper fault questions',questionHref:'#helpers/helper-one/faults',resultHref:'#helpers/helper-one/fault-results'});
 controller.render();
 assert.match(app.innerHTML,/href="#helpers\/helper-one\/faults">← Helper fault questions/);
 assert.match(app.innerHTML,/href="#helpers\/helper-one\/faults">Yes \/ No questions/);
 assert.match(app.innerHTML,/href="#helpers\/helper-one\/fault-results">Possible causes/);
 assert.doesNotMatch(app.innerHTML,/href="#(?:faults|questions|result)"/);
});
