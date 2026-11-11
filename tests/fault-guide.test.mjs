import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ANSWERS,answerLabel,answerEntries,rank,nextQuestion,assess} from '../public/app/engine.mjs';
import {groupsForPanel} from '../public/app/catalog.mjs';

const knowledge=JSON.parse(fs.readFileSync(new URL('../public/app/data/knowledge.json',import.meta.url),'utf8'));
const power=knowledge.groups.find(g=>g.id==='power');

test('new fault questions offer exactly Yes, No and I don’t know in that order',()=>{
 assert.deepEqual(ANSWERS,[['yes','Yes'],['no','No'],['unknown','I don’t know']]);
 assert.deepEqual(knowledge.answerOptions.map(({id,label})=>[id,label]),ANSWERS);
});

test('unknown observations remain neutral and every fault flow can finish unresolved',()=>{
 for(const group of knowledge.groups){
  const answers={};
  while(nextQuestion(group,answers)){
   const question=nextQuestion(group,answers);
   assert.ok(!Object.hasOwn(answers,question.id),group.id+' repeated a question');
   answers[question.id]='unknown';
  }
  assert.equal(Object.keys(answers).length,group.questions.length,group.id);
  assert.deepEqual(rank(group,answers).map(c=>[c.id,c.share]),rank(group,{}).map(c=>[c.id,c.share]),group.id);
  assert.equal(assess(group,answers).known,0,group.id);
  assert.equal(assess(group,answers).insufficient,true,group.id);
 }
});

test('invalid or unrelated saved answers cannot hide questions or add evidence',()=>{
 const unrelated={made_up_question:'yes',mains_message:'unsupported',battery_message:null};
 assert.deepEqual(answerEntries(power,unrelated),[]);
 assert.deepEqual(rank(power,unrelated),rank(power,{}));
 assert.equal(nextQuestion(power,unrelated).id,nextQuestion(power,{}).id);
 const result=assess(power,{...unrelated,mains_message:'yes'});
 assert.equal(result.known,1);
 assert.equal(result.insufficient,true);
});

test('earlier tentative answers keep their meaning without returning as button choices',()=>{
 assert.equal(answerLabel('probably'),'Probably (earlier session)');
 assert.equal(answerLabel('probably-not'),'Probably not (earlier session)');
 assert.equal(answerLabel('unknown'),'I don’t know');
 assert.equal(answerLabel('invalid'),'Not recorded');
 assert.deepEqual(answerEntries(power,{mains_message:'probably',battery_message:'probably-not'}),[['mains_message','probably'],['battery_message','probably-not']]);
 assert.ok(!ANSWERS.some(([value])=>value.startsWith('probably')));
 const tentative=rank(power,{mains_message:'probably'}).find(c=>c.id==='mains_supply');
 const certain=rank(power,{mains_message:'yes'}).find(c=>c.id==='mains_supply');
 assert.ok(tentative.share<certain.share);
});

test('each expanded fault route has distinct candidates, complete weights and traceable sources',()=>{
 const sources=new Map(knowledge.sources.map(s=>[s.id,s]));
 assert.equal(sources.size,knowledge.sources.length);
 assert.equal(new Set(knowledge.groups.map(g=>g.id)).size,knowledge.groups.length);
 for(const group of knowledge.groups){
  assert.ok(group.questions.length>=3,group.id);
  assert.ok(group.causes.length>=2,group.id);
  assert.equal(new Set(group.questions.map(q=>q.id)).size,group.questions.length,group.id);
  assert.equal(new Set(group.causes.map(c=>c.id)).size,group.causes.length,group.id);
  for(const question of group.questions){
   assert.ok(question.text.endsWith('?'),group.id+'/'+question.id);
   assert.ok(question.sourceRefs?.length,group.id+'/'+question.id+' needs a source');
   for(const ref of question.sourceRefs){
    const source=sources.get(ref.sourceId);
    assert.ok(source,ref.sourceId);
    assert.match(source.url,/^https:\/\//,source.id);
    assert.ok(source.appliesTo,source.id);
    assert.ok((Number.isInteger(ref.page)&&ref.page>0)||ref.section,group.id+'/'+question.id);
   }
  }
  const profiles=[];
  for(const cause of group.causes){
   assert.ok(cause.sources.length&&cause.checks.length,group.id+'/'+cause.id);
   for(const source of cause.sources){
    assert.ok(sources.has(source.id),source.id);
    assert.equal(source.url,sources.get(source.id).url,source.id);
   }
   for(const question of group.questions){
    const value=cause.likelihoods[question.id];
    assert.ok(Number.isFinite(value)&&value>0&&value<1,group.id+'/'+cause.id+'/'+question.id);
   }
   profiles.push(JSON.stringify(group.questions.map(q=>cause.likelihoods[q.id])));
  }
  assert.equal(new Set(profiles).size,profiles.length,group.id+' has indistinguishable candidates');
 }
});

test('the selected system only receives its own fault guides',()=>{
 for(const category of ['fire','security','access-control','cctv','warden-call']){
  const groups=groupsForPanel(knowledge,{category});
  assert.ok(groups.length>0,category);
  assert.ok(groups.every(g=>g.category===category),category);
 }
 assert.deepEqual(groupsForPanel(knowledge,{category:'other-reference'}),[]);
});

test('reviewed fault examples lead to the documented possibility without reporting certainty',()=>{
 const scenarios=JSON.parse(fs.readFileSync(new URL('../research/faults-0.12.0/scenarios.json',import.meta.url),'utf8'));
 assert.ok(scenarios.length>0);
 for(const scenario of scenarios){
  const group=knowledge.groups.find(g=>g.id===scenario.groupId);
  assert.ok(group,scenario.groupId);
  for(const [id,value] of Object.entries(scenario.answers)){
   assert.ok(group.questions.some(q=>q.id===id),scenario.groupId+'/'+id);
   assert.ok(ANSWERS.some(([key])=>key===value),value);
  }
  const result=assess(group,scenario.answers);
  assert.equal(result.ranked[0].id,scenario.expectedCause,scenario.groupId);
  assert.equal(result.insufficient,false,scenario.groupId);
  assert.ok(result.ranked[0].share<1,scenario.groupId);
 }
});
