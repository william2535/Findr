import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateFessBank,createFessRun,answerFessQuestion,advanceFessQuestion,fessScore,validateFessStore,emptyFessStore} from '../public/app/fess-mock-engine.mjs';

const bank=JSON.parse(fs.readFileSync(new URL('../public/app/data/fess-mocks.json',import.meta.url),'utf8'));

test('the supplied 196 revision points are all represented exactly once with traceable PDF positions',()=>{
 validateFessBank(bank);
 assert.deepEqual(bank.questions.map(q=>q.sourceQuestionNumber).sort((a,b)=>a-b),Array.from({length:196},(_,i)=>i+1));
 for(const q of bank.questions){assert.ok(Number.isInteger(q.sourcePdfPage)&&q.sourcePdfPage>=7&&q.sourcePdfPage<=24,q.id);assert.equal(q.id,'fess-'+String(q.sourceQuestionNumber).padStart(3,'0'));}
 const covered=bank.mocks.flatMap(m=>m.questionIds);
 assert.equal(bank.mocks.length,20);assert.equal(covered.length,196);assert.equal(new Set(covered).size,196);
 assert.deepEqual([...covered].sort(),bank.questions.map(q=>q.id).sort());
 assert.equal(bank.mocks.filter(m=>m.questionIds.length===10).length,19);
 assert.equal(bank.mocks.filter(m=>m.questionIds.length===6).length,1);
});

test('every answer has its own explanation and every technical reference has a valid public source',()=>{
 for(const q of bank.questions){
  assert.ok(q.question.trim().length>15,q.id);assert.ok(q.explanation.trim().length>20,q.id);
  assert.equal(new Set(q.options.map(o=>o.text.trim().toLowerCase())).size,4,q.id);
  for(const o of q.options)assert.ok(o.explanation.trim().length>15,q.id+':'+o.id);
  for(const id of q.sourceIds){const source=bank.sources[id],u=new URL(source.url);assert.equal(u.protocol,'https:');assert.ok(source.title&&source.section,id);assert.ok(!u.username&&!u.password,id);if(source.pdfPage!==undefined)assert.ok(Number.isInteger(source.pdfPage)&&source.pdfPage>0,id);}
 }
 assert.ok(bank.resources.some(r=>r.url.includes('highfieldassessment.com')));
 assert.ok(bank.resources.some(r=>r.url.includes('skillsengland.education.gov.uk/apprenticeships/st0189')));
 assert.ok(bank.resources.some(r=>r.url.includes('fia.uk.com')&&r.edition.includes('2025')));
});

test('short subject quizzes cover all 196 points separately from the retained 20 mocks',()=>{
 const covered=bank.quizzes.flatMap(q=>q.questionIds);
 assert.equal(bank.quizzes.length,31);
 assert.equal(covered.length,196);assert.equal(new Set(covered).size,196);
 assert.deepEqual([...covered].sort(),bank.questions.map(q=>q.id).sort());
 for(const quiz of bank.quizzes){assert.ok(quiz.section&&quiz.title);assert.ok(quiz.questionIds.length>=4&&quiz.questionIds.length<=8);assert.equal(quiz.estimatedMinutes,5);assert.equal(createFessRun(bank,quiz.id,{id:'section-'+quiz.id}).kind,'quiz');}
 assert.equal(bank.mocks.length,20);
});

test('all actual sets can finish at 100% with the first wrong answer retained in their saved review',()=>{
 for(const mock of bank.mocks){
  let run=createFessRun(bank,mock.id,{id:'verify-'+mock.id,now:100});
  const first=run.questions[0],wrong=first.options.find(o=>o.id!==first.correctOptionId).id;
  run=answerFessQuestion(run,wrong,{now:101}).run;
  assert.equal(fessScore(run).completed,0);
  while(run.status==='active'){
   run=answerFessQuestion(run,run.questions[run.cursor].correctOptionId,{now:102}).run;
   run=advanceFessQuestion(run,{now:103});
  }
  const score=fessScore(run);assert.equal(score.completionPercent,100);assert.equal(score.firstCorrect,score.total-1);
  const restored=validateFessStore(JSON.parse(JSON.stringify({...emptyFessStore(),activeRunId:run.id,runs:[run]})));
  assert.equal(restored.runs[0].answers[first.id].attempts[0].correct,false);
  assert.equal(restored.runs[0].answers[first.id].attempts[1].correct,true);
  assert.deepEqual(restored.runs[0].questions,run.questions);
 }
});
