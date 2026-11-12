import test from 'node:test';
import assert from 'node:assert/strict';
import {validateFessBank,validateFessStore,emptyFessStore,createFessRun,createFessPersistence} from '../public/app/fess-mock-engine.mjs';
import {createFessPaper,answerFessPaper,navigateFessPaper,finishFessPaper,paperRemainingMs,paperScore,validateFessPaperRun} from '../public/app/fess-paper-engine.mjs';

const start=1000000,hour=3600000;
const fixture=()=>{
 const questions=Array.from({length:60},(_,i)=>({id:'q'+(i+1),question:'Synthetic paper question '+(i+1),explanation:'Synthetic explanation for this fixture.',options:['a','b','c','d'].map(id=>({id,text:'Synthetic option '+id,explanation:'Synthetic explanation for option '+id})),correctOptionId:i%2?'b':'c',sourceIds:['test']}));
 return {schemaVersion:1,version:'synthetic-paper-1',questions,sources:{test:{title:'Synthetic reference',url:'https://example.com/paper',pdfPage:2}},mocks:[{id:'mock',title:'Existing mock',questionIds:questions.slice(0,10).map(q=>q.id)}],quizzes:[{id:'quiz',title:'Existing section',questionIds:questions.slice(0,6).map(q=>q.id)}],papers:[{id:'paper',title:'Synthetic full paper',questionIds:questions.map(q=>q.id),durationSeconds:3600}]};
};
const create=()=>createFessPaper(fixture(),'paper',{id:'paper-run',now:start});
const storeWith=run=>({...emptyFessStore(),activeRunId:run.id,runs:[run]});

test('full-paper bank definitions require60 distinct valid questions, one hour and unique ids across all modes',()=>{
 assert.equal(validateFessBank(fixture()).papers.length,1);
 for(const change of [b=>b.papers[0].questionIds.pop(),b=>b.papers[0].questionIds[59]='q1',b=>b.papers[0].questionIds[0]='missing',b=>b.papers[0].durationSeconds=4500,b=>b.papers[0].id='quiz',b=>b.papers[0].id='mock',b=>b.papers.push({...b.papers[0]}),b=>b.papers=null]){const bad=fixture();change(bad);assert.throws(()=>validateFessBank(bad));}
 const old=fixture();delete old.papers;assert.equal(validateFessBank(old),old);
});

test('starting a full paper snapshots its60 questions and sources with a persisted unpaused deadline',()=>{
 const bank=fixture(),run=createFessPaper(bank,'paper',{id:'paper-run',now:start});assert.equal(run.kind,'paper');assert.equal(run.paperId,'paper');assert.equal(run.questions.length,60);assert.equal(run.deadlineAt,start+hour);assert.equal(run.lastObservedAt,start);assert.equal(run.durationSeconds,3600);assert.deepEqual(run.answers,{});assert.equal(paperRemainingMs(run,start),hour);
 bank.questions[0].correctOptionId='a';bank.sources.test.pdfPage=99;assert.equal(run.questions[0].correctOptionId,'c');assert.equal(run.sources.test.pdfPage,2);assert.equal(validateFessPaperRun(run),run);
});

test('paper operations reject other run kinds and unreadable clock values without changing saved records',()=>{
 const quiz=createFessRun(fixture(),'quiz',{id:'separate-quiz',now:start}),original=structuredClone(quiz);
 for(const operation of [r=>answerFessPaper(r,'q1','a'),r=>navigateFessPaper(r,1),r=>finishFessPaper(r),r=>paperRemainingMs(r),r=>paperScore(r)])assert.throws(()=>operation(quiz),/full paper/);
 assert.deepEqual(quiz,original);
 const run=create();for(const now of [NaN,Infinity,-1]){assert.throws(()=>createFessPaper(fixture(),'paper',{now}));assert.throws(()=>answerFessPaper(run,'q1','a',{now}),/time/);assert.throws(()=>paperRemainingMs(run,now),/time/);}
 assert.throws(()=>createFessPaper(fixture(),'paper',{now:Number.MAX_VALUE}),/deadline/);assert.deepEqual(run.answers,{});
});

test('wrong answers do not reveal correctness or block navigation and can be revised before submission',()=>{
 const original=create();let run=answerFessPaper(original,'q1','a',{now:start+100});assert.deepEqual(original.answers,{});assert.deepEqual(run.answers.q1,{optionId:'a',at:start+100});assert.deepEqual(paperScore(run),{total:60,answered:1,unanswered:59,correct:null,incorrect:null,percent:null});
 run=navigateFessPaper(run,59,{now:start+200});assert.equal(run.cursor,59);run=navigateFessPaper(run,0,{now:start+300});run=answerFessPaper(run,'q1','c',{now:start+400});assert.deepEqual(run.answers.q1,{optionId:'c',at:start+400});assert.equal(paperScore(run).answered,1);assert.equal(run.deadlineAt,original.deadlineAt);
 const repeated=answerFessPaper(run,'q1','c',{now:start+500});assert.equal(repeated.answers.q1.at,start+400);assert.equal(repeated.lastObservedAt,start+500);
});

test('questions may be skipped freely and unfinished papers retain unanswered counts',()=>{
 const run=navigateFessPaper(create(),40,{now:start+2000});assert.equal(run.cursor,40);assert.equal(paperScore(run).unanswered,60);assert.equal(run.status,'active');assert.throws(()=>navigateFessPaper(run,60,{now:start+2001}),/Choose a question/);assert.throws(()=>answerFessPaper(run,'missing','a',{now:start+2001}),/Choose an answer/);assert.throws(()=>answerFessPaper(run,'q1','missing',{now:start+2001}),/Choose an answer/);
});

test('submitting a partially answered paper distinguishes correct, incorrect and unanswered',()=>{
 let run=answerFessPaper(create(),'q1','c',{now:start+100});run=answerFessPaper(run,'q2','a',{now:start+200});run=finishFessPaper(run,{now:start+300,reason:'submitted'});
 assert.equal(run.status,'completed');assert.equal(run.finishedAt,start+300);assert.equal(run.submittedReason,'submitted');assert.deepEqual(paperScore(run),{total:60,answered:2,unanswered:58,correct:1,incorrect:1,percent:2});assert.equal(paperRemainingMs(run,start+300),0);assert.equal(validateFessPaperRun(run),run);
});

test('all60 answers are scored from the final choices after submission, not interim attempts',()=>{
 let run=create();for(const [i,q]of run.questions.entries())run=answerFessPaper(run,q.id,q.correctOptionId,{now:start+100+i});run=answerFessPaper(run,'q1','a',{now:start+200});run=answerFessPaper(run,'q1','c',{now:start+300});assert.equal(paperScore(run).correct,null);run=finishFessPaper(run,{now:start+400});assert.deepEqual(paperScore(run),{total:60,answered:60,unanswered:0,correct:60,incorrect:0,percent:100});
});

test('answer at deadline minus1ms is accepted, at exact deadline is rejected and the paper expires',()=>{
 let run=answerFessPaper(create(),'q1','c',{now:start+hour-1});assert.equal(run.status,'active');assert.equal(paperRemainingMs(run,start+hour-1),1);run=answerFessPaper(run,'q2','b',{now:start+hour});assert.equal(run.status,'completed');assert.equal(run.answers.q2,undefined);assert.equal(run.finishedAt,start+hour);assert.equal(run.submittedReason,'expired');assert.equal(paperScore(run).answered,1);assert.equal(validateFessPaperRun(run),run);
});

test('navigation after background time expires the paper without changing cursor or extending its hour',()=>{
 const previous=navigateFessPaper(create(),7,{now:start+500});const expired=navigateFessPaper(previous,8,{now:start+hour+90000});assert.equal(expired.status,'completed');assert.equal(expired.cursor,7);assert.equal(expired.finishedAt,start+hour);assert.equal(expired.deadlineAt,previous.deadlineAt);assert.equal(expired.lastObservedAt,start+hour+90000);assert.equal(expired.submittedReason,'expired');assert.equal(paperScore(expired).unanswered,60);
});

test('manual submission at or after the deadline is recorded as expiry, and premature expiry cannot finish early',()=>{
 const run=create(),early=finishFessPaper(run,{now:start+100,reason:'expired'});assert.equal(early.status,'active');assert.equal(early.finishedAt,null);assert.equal(early.deadlineAt,run.deadlineAt);assert.equal(early.lastObservedAt,start+100);
 for(const now of [start+hour,start+hour+1]){const expired=finishFessPaper(run,{now,reason:'submitted'});assert.equal(expired.submittedReason,'expired');assert.equal(expired.finishedAt,start+hour);}
 assert.throws(()=>finishFessPaper(run,{now:start+100,reason:'paused'}),/submitted or finish/);
});

test('finished paper operations are idempotent and cannot reopen or change answers even if clock rolls back',()=>{
 for(const reason of ['submitted','expired']){const now=reason==='expired'?start+hour:start+500,run=finishFessPaper(answerFessPaper(create(),'q1','a',{now:start+100}),{now,reason});assert.equal(answerFessPaper(run,'q1','c',{now:start}),run);assert.equal(navigateFessPaper(run,5,{now:start}),run);assert.equal(finishFessPaper(run,{now:start,reason}),run);assert.equal(paperRemainingMs(run,start),0);}
});

test('saved last observed time prevents backwards clock movement from adding time beyond that observation',()=>{
 let run=navigateFessPaper(create(),5,{now:start+600000});assert.equal(paperRemainingMs(run,start+300000),3000000);run=answerFessPaper(run,'q6','b',{now:start+300000});assert.equal(run.lastObservedAt,start+600000);assert.equal(run.answers.q6.at,start+600000);run=finishFessPaper(run,{now:start+100000});assert.equal(run.finishedAt,start+600000);assert.equal(validateFessPaperRun(run),run);
});

test('reloading restores the same paper, final choices, cursor and absolute deadline alongside older run types',()=>{
 const bank=fixture(),mock=createFessRun(bank,'mock',{id:'old-mock',now:10}),quiz=createFessRun(bank,'quiz',{id:'old-quiz',now:20});delete mock.kind;delete mock.understoodQuestionIds;delete mock.understandingConfirmedAt;
 const paper=navigateFessPaper(answerFessPaper(create(),'q1','a',{now:start+100}),10,{now:start+200}),saved={...emptyFessStore(),activeRunId:paper.id,runs:[mock,quiz,paper]},restored=validateFessStore(JSON.parse(JSON.stringify(saved)));assert.deepEqual(restored,saved);assert.equal(paperRemainingMs(restored.runs[2],start+1800000),1800000);assert.equal(finishFessPaper(restored.runs[2],{now:start+hour+100,reason:'expired'}).status,'completed');
});

test('tampered deadlines, premature completion, late answers and malformed snapshots are rejected without clearing data',()=>{
 for(const change of [r=>r.deadlineAt+=1000,r=>r.durationSeconds=4500,r=>r.lastObservedAt=start-1,r=>r.updatedAt=start-1,r=>r.cursor=60,r=>r.questions.pop(),r=>r.sources.test.url='javascript:alert(1)',r=>r.answers.q1={optionId:'c',at:start+hour},r=>r.answers.missing={optionId:'c',at:start},r=>r.answers.q1={optionId:'z',at:start},r=>r.lastObservedAt=r.deadlineAt,r=>{r.status='completed';r.finishedAt=start+100;r.submittedReason='expired';r.lastObservedAt=start+100;r.updatedAt=start+100;}]){const bad=create();change(bad);assert.throws(()=>validateFessStore(storeWith(bad)),/unchanged/);}
 const complete=finishFessPaper(create(),{now:start+100});complete.answers.q1={optionId:'c',at:start+101};assert.throws(()=>validateFessStore(storeWith(complete)),/unchanged/);
});

test('failed paper save retains prior stored answers and retries the identical expired snapshot',async()=>{
 let disk=storeWith(create()),fail=true;const initial=structuredClone(disk),persistence=createFessPersistence({read:async()=>structuredClone(disk),write:async(_,value)=>{if(fail)throw new DOMException('Synthetic full device','QuotaExceededError');disk=structuredClone(value);}});await persistence.load();const expired=storeWith(finishFessPaper(initial.runs[0],{now:start+hour+100,reason:'expired'}));await assert.rejects(persistence.save(expired),{name:'QuotaExceededError'});assert.deepEqual(disk,initial);assert.deepEqual(await persistence.load(),initial);fail=false;await persistence.save(expired);assert.deepEqual(disk,expired);assert.equal(disk.runs.length,1);
});
