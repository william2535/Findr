import test from 'node:test';
import assert from 'node:assert/strict';
import {createFieldVisitController} from '../public/app/field-visit.mjs';
import {ensureFieldVisit} from '../public/app/field-model.mjs';
// Controller fault-injection tests. Native controls and viewport layout are
// covered separately by qa-field-visit.cjs; every record here is synthetic.
const decode=value=>String(value||'').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const attribute=(attrs,name)=>decode(attrs.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1]);
function fakeApp(){
 let html='',elements=new Map();
 return {
  get innerHTML(){return html},
  set innerHTML(value){
   html=value;elements=new Map();
   for(const [,tag,attrs] of html.matchAll(/<(form|span)\b([^>]*)>/g)){const id=attribute(attrs,'id');if(id)elements.set('#'+id,{textContent:'',classList:{toggle(){}},addEventListener(){},tagName:tag.toUpperCase()});}
   for(const match of html.matchAll(/<(input|textarea|select)\b([^>]*)(?:>([\s\S]*?)<\/\1>|>)/g)){
    const [,tag,attrs,body='']=match,id=attribute(attrs,'id');if(!id)continue;
    let value=tag==='textarea'?decode(body):attribute(attrs,'value');
    if(tag==='select'){
     const options=[...body.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)];
     const selected=options.find(option=>/\bselected\b/.test(option[1]))||options[0];
     value=selected?attribute(selected[1],'value'):'';
    }
    elements.set('#'+id,{value,disabled:/\bdisabled\b/.test(attrs),checked:/\bchecked\b/.test(attrs),textContent:'',classList:{toggle(){}},addEventListener(){},tagName:tag.toUpperCase()});
   }
  },
  querySelector:selector=>elements.get(selector)||null,
  querySelectorAll:()=>[],
 };
}

function harness(){
 globalThis.location={hash:'#investigation'};globalThis.window={scrollTo(){}};
 let session={id:'synthetic-field-controller',panel:{brand:'Unknown',model:'Unknown',category:'access'},message:'SYNTHETIC grant without release',answers:{},notes:''};
 session.fieldVisit=ensureFieldVisit(session);Object.assign(session.fieldVisit.incidents[0],{routeId:'A04',permissions:{readOnly:true},safety:{immediateRisk:false},systemTypes:['access']});session.fieldVisit.currentIncidentId=session.fieldVisit.incidents[0].id;session.fieldVisit.ui={view:'next'};
 let failures=0,wait=null;const notices=[],app=fakeApp();const controller=createFieldVisitController({app,getSession:()=>session,getKnowledge:()=>({}),onUpdate:async next=>{if(failures){failures--;throw Error('SYNTHETIC storage failure');}if(wait)await wait;session=structuredClone(next);},saveSession:async()=>{},showManuals(){},toast:m=>notices.push(m),onExport(){}});controller.render();
 return {app,controller,notices,get session(){return session},fail(){failures++},pause(p){wait=p},field(id){const el=app.querySelector('#field-'+id);assert.ok(el,'Expected '+id);return el},fill(values){for(const[key,value]of Object.entries(values))this.field(key).value=value},act:(action,id,value)=>controller.handleAction('field-'+action,id,value),view:value=>controller.handleAction('field-view',null,value)};
}
async function displayDraft(h,value='0.00'){
 await h.view('log');h.field('test-kind').value='voltage';h.field('test-kind').onchange();h.fill({'point':'SYNTHETIC panel','test-source':'panel',value,'operating-state':'standby','execution':'performed'});await h.controller.flush();
}

test('failed answer retry saves the original once without answering the next unseen question',async()=>{
 const h=harness();h.fail();await h.act('answer',null,'yes');assert.equal(h.session.fieldVisit.events.length,0);await h.act('answer',null,'yes');
 const answers=h.session.fieldVisit.events.filter(e=>e.testKind==='question_answer');assert.equal(answers.length,1);assert.equal(answers[0].ruleId,'A04.Q1');assert.equal(answers[0].answer,'yes');assert.match(h.app.innerHTML,/A04/);await h.controller.flush();
});

test('failed impairment retry keeps one introduced impairment and its original description',async()=>{
 const h=harness();await h.view('impairments');h.fill({'impairment-kind':'introduced','impairment-affected':'SYNTHETIC temporary override','impairment-owner':'SYNTHETIC role'});h.fail();await h.act('add-impairment');assert.equal(h.session.fieldVisit.impairments.length,0);await h.act('add-impairment');
 assert.equal(h.session.fieldVisit.impairments.length,1);assert.equal(h.session.fieldVisit.impairments[0].affectedAssetOrFunction,'SYNTHETIC temporary override');assert.equal(h.session.fieldVisit.impairments[0].existingOrIntroduced,'introduced');await h.controller.flush();
});

test('edited failed test save keeps original once and retains the changed value as an explicit correction',async()=>{
 const h=harness();await displayDraft(h);h.fail();await h.act('save-test');assert.equal(h.session.fieldVisit.events.length,0);h.field('value').value='12.80';await h.act('save-test');
 const original=h.session.fieldVisit.events[0];assert.equal(h.session.fieldVisit.events.length,1);assert.equal(original.result.rawText,'0.00');assert.equal(h.field('value').value,'12.80');assert.match(h.app.innerHTML,/correction/i);await h.act('save-test');assert.equal(h.session.fieldVisit.events.length,2);assert.equal(h.session.fieldVisit.events[1].supersedes,original.id);assert.equal(h.session.fieldVisit.events[1].result.rawText,'12.80');await h.controller.flush();
});

test('an unchanged test retry and a cleared-form resubmit do not duplicate a reading',async()=>{
 const h=harness();await displayDraft(h);h.fail();await h.act('save-test');await h.act('save-test');assert.equal(h.session.fieldVisit.events.length,1);assert.equal(h.field('value').value,'');await h.act('save-test');assert.equal(h.session.fieldVisit.events.length,1);await h.controller.flush();
});

test('quick voltage requires a fresh operating state and suppresses a new ungated meter test',async()=>{
 const h=harness();await displayDraft(h);h.field('operating-state').value='';await h.act('save-test');assert.equal(h.session.fieldVisit.events.length,0);h.field('operating-state').value='unknown';h.field('test-source').value='meter';await h.act('save-test');assert.equal(h.session.fieldVisit.events.length,0);h.field('historical').checked=true;await h.act('save-test');assert.equal(h.session.fieldVisit.events.length,1);assert.equal(h.session.fieldVisit.events[0].interpretation.status,'method_unverified');assert.equal(h.session.fieldVisit.events[0].result.rawText,'0.00');await h.controller.flush();
});

test('failed start retry retains one arrival-history observation and the chosen symptom state',async()=>{
 const h=harness();await h.view('start');h.fill({'system':'access','complaint':'SYNTHETIC intermittent release','symptom-state':'intermittent','reported-by':'event_history','immediate-risk':'none_reported','start-history':'SYNTHETIC earlier grant event'});h.fail();await h.act('start');assert.equal(h.session.fieldVisit.events.length,0);await h.act('start');assert.equal(h.session.fieldVisit.events.filter(e=>e.method==='arrival_history').length,1);assert.equal(h.session.fieldVisit.incidents.length,1);assert.equal(h.session.fieldVisit.incidents[0].currentSymptomState,'intermittent');await h.controller.flush();
});

test('failed blocked-check retry records one blocked answer and one inaccessible observation',async()=>{
 const h=harness();await h.view('blocked');h.fill({'blocked-kind':'inaccessible','blocked-reason':'SYNTHETIC controller room key unavailable','blocked-owner':'SYNTHETIC site role'});h.fail();await h.act('blocked');assert.equal(h.session.fieldVisit.events.length,0);await h.act('blocked');assert.equal(h.session.fieldVisit.events.filter(e=>e.testKind==='question_answer'&&e.answer==='blocked').length,1);assert.equal(h.session.fieldVisit.events.filter(e=>e.result?.executionState==='inaccessible').length,1);assert.equal(h.session.fieldVisit.handover.nextAction,'SYNTHETIC controller room key unavailable');await h.controller.flush();
});

test('an edit made while a test save is pending remains a correction draft after the original commits',async()=>{
 const h=harness();await displayDraft(h);let release;h.pause(new Promise(resolve=>{release=resolve;}));const pending=h.act('save-test');await new Promise(resolve=>setImmediate(resolve));h.field('value').value='12.80';release();await pending;assert.equal(h.session.fieldVisit.events.length,1);assert.equal(h.session.fieldVisit.events[0].result.rawText,'0.00');assert.equal(h.field('value').value,'12.80');assert.match(h.app.innerHTML,/correction/i);await h.controller.flush();
});
