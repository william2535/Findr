import test from 'node:test';
import assert from 'node:assert/strict';
import {createHelperFaultSession,createHelperFaultsController,helperFaultReport} from '../public/app/helpers-faults.mjs';

// Exercise the controller's persistence boundary without a network, model, or
// global legacy fault session. Browser layout is checked in the app workflow.
const clone=value=>structuredClone(value);
const decode=value=>String(value??'').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const attribute=(attrs,name)=>decode(attrs.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1]);
const datasetOf=attrs=>Object.fromEntries([...attrs.matchAll(/\bdata-([\w-]+)="([^"]*)"/g)].map(([,key,value])=>[key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),decode(value)]));
function fakeApp(){
 let html='',elements=[];
 function matches(element,selector){
  if(selector.startsWith('#'))return element.id===selector.slice(1);
  const attr=selector.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/);
  if(attr)return attr[2]===undefined?new RegExp(`(?:^|\\s)${attr[1]}(?:=|\\s|$)`).test(element.attrs):attribute(element.attrs,attr[1])===attr[2];
  return element.tagName.toLowerCase()===selector;
 }
 return {
  get innerHTML(){return html},
  set innerHTML(value){
   html=value;elements=[];
   for(const [,tag,attrs] of html.matchAll(/<(form|span|div|p|button|section|label|h2|input|textarea|select)\b([^>]*)>/g)){
    const id=attribute(attrs,'id');
    const element={id,attrs,dataset:datasetOf(attrs),value:attribute(attrs,'value'),textContent:'',tagName:tag.toUpperCase(),disabled:/\bdisabled\b/.test(attrs),checked:/\bchecked\b/.test(attrs),hidden:/\bhidden\b/.test(attrs),classList:{toggle(){},add(){},remove(){}},focus(){},scrollIntoView(){},setAttribute(name,v){this[name]=v},getAttribute(name){return attribute(attrs,name)}};
    elements.push(element);
   }
   for(const [,tag,attrs,body] of html.matchAll(/<(textarea|select)\b([^>]*)>([\s\S]*?)<\/\1>/g)){
    const id=attribute(attrs,'id'),element=elements.find(item=>item.id===id);if(!element)continue;
    if(tag==='textarea')element.value=decode(body);
    else{const options=[...body.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)],selected=options.find(option=>/\bselected\b/.test(option[1]))||options[0];element.value=selected?attribute(selected[1],'value'):'';}
   }
  },
  querySelector(selector){return elements.find(element=>matches(element,selector))||null},
  querySelectorAll(selector){return elements.filter(element=>matches(element,selector))},
 };
}
const source={id:'synthetic-reference',title:'Synthetic panel manual, edition 2',recordId:'manual-a',page:12,section:'Displayed observations',appliesTo:'Synthetic P1 only; not other family members.',url:'https://example.invalid/manual.pdf'};
const knowledge={version:'synthetic-1',rankingNotice:'Editorial possibilities, not a confirmed diagnosis.',sources:[source],groups:[
 {id:'power',category:'fire',title:'Power / battery',subtitle:'Displayed supply observations',questions:[
  {id:'mains_message',text:'Does the display explicitly report a mains fault?',hint:'Use the exact displayed wording.',sourceRefs:[{sourceId:source.id,page:12}]},
  {id:'battery_message',text:'Does the display explicitly report a battery fault?',sourceRefs:[{sourceId:source.id,page:12}]},
  {id:'recent_change',text:'Was a recent change recorded?',sourceRefs:[{sourceId:source.id,page:12}]},
 ],causes:[
  {id:'supply',title:'Supply path possibility',summary:'An observation to investigate.',checks:['Record the first occurrence.'],likelihoods:{mains_message:.95,battery_message:.25,recent_change:.6},sources:[source],status:'hypothesis'},
  {id:'battery',title:'Battery path possibility',summary:'Another observation to investigate.',checks:['Retain the displayed message.'],likelihoods:{mains_message:.05,battery_message:.75,recent_change:.4},sources:[source],status:'hypothesis'},
 ]},
 {id:'loop',category:'fire',title:'Loop indication',subtitle:'Exact display wording',questions:[
  {id:'loop_open',text:'Does the display explicitly say loop open?',sourceRefs:[{sourceId:source.id,page:12}]},
  {id:'loop_short',text:'Does the display explicitly say loop short?',sourceRefs:[{sourceId:source.id,page:12}]},
 ],causes:[
  {id:'open',title:'Open indication possibility',summary:'Unconfirmed.',checks:['Record the wording.'],likelihoods:{loop_open:.9,loop_short:.1},sources:[source]},
  {id:'short',title:'Short indication possibility',summary:'Unconfirmed.',checks:['Record the wording.'],likelihoods:{loop_open:.1,loop_short:.9},sources:[source]},
 ]},
]};
function helper(id='helper-a',kind='panel'){
 return {id,name:'Helper '+id,discipline:'fire',scope:{kind,id:'scope-'+id,label:'Synthetic P1',brand:'Synthetic',model:'P1',variant:'V2',firmware:'1.2'},selectedManualIds:['manual-a'],requiredManualIds:['manual-a'],conversations:[{id:'job-a',title:'First job',messages:[],context:{}},{id:'job-b',title:'Second job',messages:[],context:{}}],activeConversationId:'job-a'};
}
function harness({record=helper(),conversationId='job-a',shared}={}){
 let stored=shared?.record||clone(record),failures=0,saveGate=null,view='faults';const notices=[],saved=[],opened=[],app=fakeApp();
 const job=()=>stored.conversations.find(item=>item.id===conversationId);
 if(!job().faultSession)job().faultSession=createHelperFaultSession(stored,{id:stored.id+'-'+conversationId,now:1700000000000});
 const controller=createHelperFaultsController({app,helperId:stored.id,conversationId,getHelper:()=>stored,getSession:()=>job().faultSession,getKnowledge:()=>knowledge,onUpdate:async next=>{if(failures){failures--;throw Error('Synthetic storage unavailable');}if(saveGate)await saveGate;job().faultSession=clone(next);saved.push(clone(next));return clone(next);},openManuals:async(...args)=>opened.push(args),toast:message=>notices.push(message)});
 return {app,controller,notices,saved,opened,get record(){return clone(stored)},get session(){return clone(job().faultSession)},get conversationId(){return conversationId},
  fail(){failures++},pauseSave(gate){saveGate=gate},
  async show(nextView='faults'){view=nextView;stored.activeConversationId=conversationId;globalThis.location={hash:'#helpers/'+stored.id+'/'+view};await controller.render(view);},
  async act(action,id,value,node){globalThis.location={hash:'#helpers/'+stored.id+'/'+view};return controller.handleAction(action.startsWith('investigation-')?action:'helper-fault-'+action,id,value,node);},
  field(id){const field=app.querySelector('#'+id);assert.ok(field,`Expected field ${id}`);return field},
  async edit(id,value){const field=this.field(id);field.value=value;field.oninput?.({target:field});await controller.flush();},
  question(){const attrs=[...app.innerHTML.matchAll(/<button\b([^>]*)>/g)].map(([,attrs])=>attrs).find(attrs=>attribute(attrs,'data-action')==='helper-fault-answer');return attrs?attribute(attrs,'data-id'):null;},
 };
}

test('new fault sessions retain selected scope without asserting installed family identity',()=>{
 const family=helper('family','family'),session=createHelperFaultSession(family,{id:'family-job',now:12345});
 assert.equal(session.id,'family-job');assert.equal(session.started,12345);assert.equal(session.confirmed,false);
 assert.deepEqual(session.answers,{});assert.deepEqual(session.questionHistory,[]);assert.deepEqual(session.guideHistory,[]);
 assert.equal(session.panel.brand,'Synthetic');assert.equal(session.panel.model,'P1');assert.equal(session.panel.category,'fire');
 assert.notEqual(createHelperFaultSession(family).id,createHelperFaultSession(family).id);
});

test('the helper matrix saves an observation and resumes the next unanswered question after reopening',async()=>{
 const h=harness();await h.show();await h.act('group','power');const first=h.question();assert.ok(first);
 await h.act('answer',first,'yes');assert.equal(h.session.answers[first],'yes');assert.notEqual(h.question(),first);
 assert.equal(h.session.questionHistory.length,1);const event=h.session.questionHistory[0];
 assert.equal(event.kind,'answer');assert.equal(event.questionId,first);assert.equal(event.answer,'yes');assert.ok(Number.isFinite(event.recordedAt));assert.match(event.question,/\?/);
 const reopened=harness({record:h.record});await reopened.show();assert.deepEqual(reopened.session.answers,h.session.answers);assert.equal(reopened.question(),h.question());
 while(reopened.question()){const id=reopened.question();assert.equal(reopened.session.answers[id],undefined);await reopened.act('answer',id,'unknown');}
 assert.equal(Object.keys(reopened.session.answers).length,3);assert.equal(reopened.session.questionHistory.filter(e=>e.kind==='answer').length,3);
});

test('undo and changing fault type retain dated evidence instead of silently deleting observations',async()=>{
 const h=harness();await h.show();await h.act('group','power');const first=h.question();await h.act('answer',first,'yes');
 await h.act('undo');assert.equal(h.session.answers[first],undefined);assert.equal(h.session.questionHistory.length,2);assert.equal(h.session.questionHistory[1].kind,'undo');assert.equal(h.session.questionHistory[1].questionId,first);
 await h.act('answer',first,'no');await h.act('change-group');await h.act('group','loop');
 assert.equal(h.session.group,'loop');assert.deepEqual(h.session.answers,{});assert.ok(h.session.guideHistory.length);
 const previous=h.session.guideHistory.find(item=>item.groupId==='power'||item.group==='power'||item.id==='power');assert.ok(previous);assert.ok(Number.isFinite(previous.recordedAt));assert.match(JSON.stringify(previous),new RegExp(first));
 assert.equal(h.session.questionHistory.filter(e=>e.groupId==='power'&&e.kind==='answer').length,2);
});

test('a failed matrix save is visible, retry saves the staged answer once, and later questions remain usable',async()=>{
 const h=harness();await h.show();await h.act('group','power');const first=h.question();h.fail();await h.act('answer',first,'yes');
 assert.equal(h.session.answers[first],undefined);assert.match(h.notices.join(' ')+h.app.innerHTML,/storage|not saved|retry/i);
 await h.act('retry');assert.equal(h.session.answers[first],'yes');assert.equal(h.session.questionHistory.filter(e=>e.kind==='answer'&&e.questionId===first).length,1);
 const second=h.question();assert.ok(second);assert.notEqual(second,first);await h.act('answer',second,'no');assert.equal(h.session.answers[second],'no');
});

test('replayed answers and unsupported response values cannot alter the saved current question',async()=>{
 const h=harness();await h.show();await h.act('group','power');const first=h.question();await h.act('answer',first,'yes');
 const saved=h.session;await h.act('answer',first,'no');assert.deepEqual(h.session,saved);
 const current=h.question();await h.act('answer',current,'probably');assert.deepEqual(h.session,saved);assert.equal(h.question(),current);
 await h.act('answer',current,'unknown');assert.equal(h.session.answers[current],'unknown');assert.equal(h.session.questionHistory.length,2);
});

test('job fields autosave and survive reopening without changing another job or helper',async()=>{
 const first=harness(),otherJob=harness({record:helper(),conversationId:'job-b'}),otherHelper=harness({record:helper('helper-b')});
 await first.show();await first.edit('helper-fault-site','Site A / job 12');await first.edit('helper-fault-message','EXACT DISPLAY: F 003');await first.edit('helper-fault-notes','Already inspected label; fault remains.');
 await first.act('group','power');await first.act('answer',first.question(),'yes');
 assert.equal(first.session.site,'Site A / job 12');assert.equal(first.session.message,'EXACT DISPLAY: F 003');assert.match(first.session.notes,/fault remains/);
 assert.deepEqual(otherJob.session.answers,{});assert.equal(otherJob.session.site,'');assert.deepEqual(otherHelper.session.answers,{});assert.equal(otherHelper.session.message,'');
 assert.equal(first.record.conversations.find(c=>c.id==='job-b').faultSession,undefined);
 const reopened=harness({record:first.record});await reopened.show();assert.equal(reopened.field('helper-fault-message').value,'EXACT DISPLAY: F 003');assert.match(reopened.field('helper-fault-notes').value,/fault remains/);
});

test('two controllers save different jobs into one helper record without mixing their questions or notes',async()=>{
 const shared={record:helper()},first=harness({shared}),second=harness({shared,conversationId:'job-b'});
 await first.show();await first.act('group','power');const firstQuestion=first.question();await first.act('answer',firstQuestion,'yes');await first.edit('helper-fault-notes','First job observation');
 await second.show();await second.act('group','loop');const secondQuestion=second.question();await second.act('answer',secondQuestion,'no');await second.edit('helper-fault-notes','Second job observation');
 await first.show();assert.equal(first.session.group,'power');assert.deepEqual(first.session.answers,{[firstQuestion]:'yes'});assert.equal(first.session.notes,'First job observation');
 await first.act('answer',first.question(),'unknown');assert.equal(second.session.group,'loop');assert.deepEqual(second.session.answers,{[secondQuestion]:'no'});assert.equal(second.session.notes,'Second job observation');
 assert.equal(shared.record.conversations[0].faultSession.questionHistory.length,2);assert.equal(shared.record.conversations[1].faultSession.questionHistory.length,1);
});

test('helper log preserves exact raw readings, traceable corrections and work alongside matrix answers',async()=>{
 const h=harness();await h.show();await h.act('group','power');const first=h.question();await h.act('answer',first,'unknown');
 await h.show('fault-log');h.field('inv-quick-value').value='024.00';await h.act('investigation-add-quick');
 const original=h.session.investigation.measurements[0];assert.equal(original.value,'024.00');assert.equal(original.assessment,'not_assessed');
 await h.act('investigation-correct-reading',original.id);h.field('inv-quick-value').value='0.00';await h.act('investigation-add-quick');
 assert.deepEqual(h.session.investigation.measurements.map(m=>m.value),['024.00','0.00']);assert.equal(h.session.investigation.measurements[1].supersedes,original.id);assert.equal(h.session.answers[first],'unknown');
 await h.act('investigation-tab',null,'work');h.field('inv-work-action').value='Checked the recorded label';h.field('inv-work-reason').value='Identify the installed variant';h.field('inv-work-outcome').value='Variant recorded; fault unresolved';await h.act('investigation-add-work');
 const full=helperFaultReport(h.record,h.session,knowledge),compact=helperFaultReport(h.record,h.session,knowledge,{compact:true});
 for(const report of [full,compact]){assert.match(report,/Helper helper-a/);assert.match(report,/024\.00/);assert.match(report,/0\.00/);assert.match(report,/Checked the recorded label/);assert.match(report,/fault unresolved/);assert.match(report,/I don.t know/);assert.match(report,/original|correct/i);assert.match(report,/unresolved|not.*diagnos/i);}
});

test('helper log retry does not duplicate a saved reading or lose matrix observations',async()=>{
 const h=harness();await h.show();await h.act('group','power');const first=h.question();await h.act('answer',first,'yes');await h.show('fault-log');
 h.field('inv-quick-value').value='0.00';h.fail();await h.act('investigation-add-quick');assert.equal(h.session.investigation.measurements.length,0);
 await h.act('investigation-retry-save');assert.equal(h.session.investigation.measurements.length,1);assert.equal(h.session.investigation.measurements[0].value,'0.00');assert.equal(h.session.answers[first],'yes');
 const reopened=harness({record:h.record});await reopened.show('fault-log');assert.equal(reopened.session.investigation.measurements.length,1);assert.match(reopened.app.innerHTML,/0\.00/);
});

test('results expose hypotheses and the reference model limits rather than an automatic diagnosis',async()=>{
 const h=harness();await h.show();await h.act('group','power');await h.act('answer',h.question(),'yes');await h.act('answer',h.question(),'no');await h.show('fault-results');
 assert.match(h.app.innerHTML,/hypothes|possibilit/i);assert.match(h.app.innerHTML,/not a confirmed diagnosis|not.*diagnos|unconfirmed/i);assert.match(h.app.innerHTML,/Synthetic panel manual, edition 2/);assert.match(h.app.innerHTML,/Synthetic P1 only/);
 assert.doesNotMatch(h.app.innerHTML,/href="#(?:questions|result|faults)"/);
});
