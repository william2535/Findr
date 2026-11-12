import test from 'node:test';
import assert from 'node:assert/strict';
import {searchHelperManuals} from '../public/app/helper-search-planner.mjs';
import {buildManualIndex} from '../public/app/manual-retrieval.mjs';
import {retrieveHelperEvidence,answerHelper,createHelperConversation} from '../public/app/helpers-engine.mjs';

// Fictional pages verify scope, query planning and reference contracts only.
const hash='a'.repeat(64);
const analysis={manualId:'synthetic-manual',contentHash:hash,title:'SYNTHETIC planning fixture',usable:true,identity:{model:'Fixture Panel',models:['Fixture Panel']},pages:[
 {page:1,text:'1.1 Scheduled clocks\nThe scheduled clock changes the special sensitivity period. This is not the displayed date and time.',quality:{readable:true}},
 {page:2,text:'1.2 Change-Time\nThe displayed clock time can be changed with the Change-Time item. These fictional controls verify retrieval only.',quality:{readable:true}},
 {page:3,text:'1.3 Event Log\nThe event history records previous fire alarms. Select the fictional VIEW LOG item to inspect recorded events.',quality:{readable:true}},
 {page:4,text:'1.4 Disable sounder\nThe fictional disable sounder item operates one sounder. This incomplete fixture omits precautions and system effects.',quality:{readable:true}}
]};
const index=buildManualIndex(analysis);
const helper={id:'h',scope:{kind:'panel',model:'Fixture Panel'},selectedManualIds:[analysis.manualId],manualStates:{[analysis.manualId]:{status:'ready',contentHash:hash}}};
const entry=(id,page,text,headings=[])=>({id,manualId:'m',contentHash:hash,page,text,headings:headings.map(title=>({title,page,quote:title}))});

test('a sufficient ordinary question uses one search without changing the source',()=>{
 const p=entry('one',2,'SYNTHETIC power rating reference'),indexes=[{passages:[p]}],before=structuredClone(indexes),events=[];
 const result=searchHelperManuals({question:'What is the power rating?',indexes,search:()=>[p],onSearch:e=>events.push(e)});
 assert.equal(result.plan.searchCount,1);assert.equal(events.length,1);assert.equal(result.plan.inferenceUsed,false);assert.deepEqual(indexes,before);assert.equal(result.passages[0].text,p.text);
});

test('a vocabulary retry finds an explicit heading and preserves the whole question',()=>{
 const wrong=entry('wrong',1,'SYNTHETIC scheduled clock'),right=entry('right',2,'SYNTHETIC displayed clock setting',['Change-Time']),calls=[];
 const result=searchHelperManuals({question:'Where do I set the clock on revision X9?',indexes:[{passages:[wrong,right]}],search:(_indexes,q)=>{calls.push(q);return calls.length===1?[wrong]:[right,wrong];}});
 assert.equal(result.passages[0].id,'right');assert.equal(result.plan.searchCount,2);assert.ok(calls.every(q=>q.startsWith('Where do I set the clock on revision X9?')));assert.equal(result.plan.status,'candidate_references_found');assert.equal(result.plan.scope,'selected_helper_manuals');
});

test('search stops after three attempts even when a matching heading yields no accepted evidence',()=>{
 const p=entry('one',1,'SYNTHETIC content',['Change-Time']),calls=[];
 const result=searchHelperManuals({question:'How do I set the clock?',indexes:[{passages:[p]}],search:(_indexes,q)=>{calls.push(q);return [];}});
 assert.equal(calls.length,3);assert.equal(new Set(calls).size,3);assert.equal(result.plan.stopped,'search_budget');assert.equal(result.plan.status,'not_established');assert.deepEqual(result.passages,[]);
});

test('reformulation cannot bypass original-question acceptance or inject outside source bytes',()=>{
 const p=entry('one',1,'SYNTHETIC allowed clock',['Change-Time']),outside=entry('outside',3,'SYNTHETIC other helper'),queries=[];
 const result=searchHelperManuals({question:'How do I set the clock?',indexes:[{passages:[p]}],search:()=>[p,outside,{...p,text:'ALTERED'}, {...p,contentHash:'b'.repeat(64)}],accept:(_p,q)=>{queries.push(q);return false;}});
 assert.deepEqual(result.passages,[]);assert.ok(queries.length);assert.ok(queries.every(q=>q==='How do I set the clock?'));assert.ok(result.plan.attempts.every(a=>a.candidateIds.length===0));
});

test('clock and historical-alarm wording retrieve scoped real source text without inference',()=>{
 const outside={...analysis,manualId:'other-helper',contentHash:'b'.repeat(64),pages:[{page:7,text:'1.1 Change-Time\nThe SECRET clock menu belongs only to another helper.',quality:{readable:true}}]};
 for(const [question,expectedPage]of [['Where do I set the clock?',2],['How can I look up old alarms?',3]]){
  let plan;const result=retrieveHelperEvidence({helper,question,indexes:[index,buildManualIndex(outside)],analyses:[analysis,outside],onPlan:p=>plan=p});
  assert.equal(result[0].page,expectedPage,question);assert.ok(result.every(p=>p.manualId===analysis.manualId));assert.ok(result.every(p=>!p.text.includes('SECRET')));assert.ok(plan.searchCount<=3);
 }
});

test('answer metadata records actual local searches and keeps fallback honestly labelled',async()=>{
 const result=await answerHelper({helper,conversation:createHelperConversation(),text:'How can I look up old alarms?',indexes:[index],analyses:[analysis],manualOnly:true,modelReadiness:{supported:false},infer:()=>{throw Error('No model call expected');}});
 assert.equal(result.message.mode,'manual-search');assert.equal(result.message.modelUsed,false);assert.equal(result.message.sourceRefs[0].page,3);assert.ok(result.message.searchPlan.searchCount<=3);assert.equal(result.message.searchPlan.inferenceUsed,false);assert.equal(result.conversation.messages.length,2);
});

test('unknown functions still abstain and incomplete impairment instructions stay blocked',async()=>{
 const common={helper,conversation:createHelperConversation(),indexes:[index],analyses:[analysis],modelReadiness:{ready:true,supported:true,installed:true},infer:async()=>({text:'S1'})};
 const unknown=await answerHelper({...common,text:'How do I enable quantum teleportation?'});assert.equal(unknown.message.coverage,'not_established');assert.deepEqual(unknown.message.sourceRefs,[]);
 const physical=await answerHelper({...common,text:'How do I disable a sounder?'});assert.notEqual(physical.message.coverage,'reviewed_manual_procedure');assert.doesNotMatch(physical.message.text,/The fictional disable sounder item operates one sounder/);assert.ok(physical.message.sourceRefs.length);
});

test('explicit print/export/clear actions are never rewritten as viewing the event log',()=>{
 const print=entry('print',8,'SYNTHETIC print event log',['Print Log']),view=entry('view',4,'SYNTHETIC view event log',['View Log']);
 for(const verb of ['print','export','clear','delete','disable','enable','reset','configure']){
  const queries=[];const result=searchHelperManuals({question:`How do I ${verb} the event log?`,indexes:[{passages:[print,view]}],search:(_indexes,q)=>{queries.push(q);return [print,view];}});
  assert.equal(queries.length,1,verb);assert.equal(result.passages[0].id,'print',verb);assert.equal(result.plan.attempts[0].kind,'original');
 }
});
