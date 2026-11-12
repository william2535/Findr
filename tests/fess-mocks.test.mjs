import test from 'node:test';
import assert from 'node:assert/strict';
import {validateFessBank,validateFessStore,emptyFessStore,createFessRun,answerFessQuestion,advanceFessQuestion,fessScore,fessUnderstanding,markFessUnderstood,confirmFessUnderstanding,retryFessMissed,createFessPersistence,FESS_STORE_KEY} from '../public/app/fess-mock-engine.mjs';
import {createFessAudio} from '../public/app/fess-audio.mjs';

const fixture=()=>({schemaVersion:1,version:'synthetic-1',mocks:[{id:'synthetic',title:'Synthetic test mock',questionIds:['q1','q2']}],sources:{test:{title:'Synthetic source',url:'https://example.com/reference',pdfPage:2}},questions:['q1','q2'].map((id,i)=>({id,topic:'Synthetic',question:'Synthetic question '+(i+1),explanation:'The test identifies the specified correct option.',options:['a','b','c','d'].map(id=>({id,text:'Synthetic option '+id,explanation:'Synthetic explanation for '+id})),correctOptionId:i?'b':'c',sourceIds:['test']}))});
const create=()=>createFessRun(fixture(),'synthetic',{id:'run-1',now:10});
const storeWith=run=>({...emptyFessStore(),activeRunId:run.id,runs:[run]});
const choose=(run,id)=>answerFessQuestion(run,id,{now:20}).run;
const finish=run=>{while(run.status==='active'){const q=run.questions[run.cursor];run=choose(run,q.correctOptionId);run=advanceFessQuestion(run,{now:30});}return run;};

test('bank validation requires every option explanation, unambiguous correct choice and existing sources',()=>{
 assert.equal(validateFessBank(fixture()).questions.length,2);
 for(const change of [b=>b.questions[0].options[0].explanation='',b=>b.questions[0].correctOptionId='missing',b=>b.questions[0].sourceIds=['missing'],b=>b.mocks[0].questionIds.push('missing'),b=>b.questions.push(b.questions[0]),b=>b.sources.test.url='javascript:alert(1)']){const bank=fixture();change(bank);assert.throws(()=>validateFessBank(bank));}
});
test('wrong answer reveals the answer but does not advance or earn completion',()=>{
 const original=create(),result=answerFessQuestion(original,'a',{now:42});
 assert.equal(result.correct,false);assert.equal(result.run.cursor,0);assert.equal(fessScore(result.run).completed,0);assert.equal(fessScore(result.run).firstCorrect,0);assert.equal(fessScore(result.run).answered,1);assert.equal(advanceFessQuestion(result.run),result.run);assert.deepEqual(original.answers,{});assert.deepEqual(result.run.answers.q1.attempts,[{optionId:'a',correct:false,at:42}]);
});
test('selecting highlighted correct answer completes question without rewriting first attempt',()=>{
 const wrong=choose(create(),'a'),correct=choose(wrong,'c');
 assert.equal(correct.answers.q1.completed,true);assert.equal(fessScore(correct).completionPercent,50);assert.equal(fessScore(correct).firstCorrect,0);assert.equal(correct.answers.q1.attempts.length,2);assert.equal(correct.answers.q1.attempts[0].correct,false);assert.equal(correct.cursor,0);assert.equal(advanceFessQuestion(correct).cursor,1);
});
test('repeated wrong taps after reveal and correct double taps do not duplicate attempts/rewards',()=>{
 const wrong=choose(create(),'a');assert.equal(answerFessQuestion(wrong,'a').changed,false);assert.equal(answerFessQuestion(wrong,'d').changed,false);assert.equal(wrong.answers.q1.attempts.length,1);
 const right=choose(wrong,'c');assert.equal(answerFessQuestion(right,'c').changed,false);assert.equal(answerFessQuestion(right,'a').changed,false);assert.equal(right.answers.q1.attempts.length,2);
});
test('last correct answer reaches100% correction completion; explicit next finalises review',()=>{
 let run=advanceFessQuestion(choose(choose(create(),'a'),'c'));run=choose(run,'b');
 assert.equal(fessScore(run).completionPercent,100);assert.equal(fessScore(run).firstAttemptPercent,50);assert.equal(run.status,'active');run=advanceFessQuestion(run,{now:77});assert.equal(run.status,'completed');assert.equal(run.finishedAt,77);assert.equal(advanceFessQuestion(run),run);assert.equal(answerFessQuestion(run,'b').changed,false);
});
test('all first-time correct stays distinct from corrections and identifies no missed questions',()=>{
 const run=finish(create());assert.equal(fessScore(run).firstAttemptPercent,100);assert.deepEqual(fessScore(run).missedIds,[]);assert.throws(()=>retryFessMissed(run),/No missed/);
});
test('retry missed creates a separate fresh run and preserves original score, sources and revision',()=>{
 const original=finish(choose(create(),'a')),retry=retryFessMissed(original,{id:'retry-1',now:88});
 assert.equal(retry.parentRunId,original.id);assert.deepEqual(retry.questions.map(q=>q.id),['q1']);assert.deepEqual(retry.answers,{});assert.equal(retry.bankVersion,'synthetic-1');assert.equal(retry.sources.test.pdfPage,2);assert.equal(fessScore(original).firstAttemptPercent,50);assert.equal(fessScore(finish(retry)).firstAttemptPercent,100);assert.equal(original.questions.length,2);
});
test('question counts are dynamic including short final mocks, not fixed to ten or three sets',()=>{
 const bank=fixture();bank.mocks.push({id:'short',title:'Short mock',questionIds:['q2']});const run=createFessRun(bank,'short',{id:'short-run'});assert.equal(fessScore(run).total,1);assert.equal(fessScore(choose(run,'b')).completionPercent,100);
});
test('section quizzes and original mocks coexist with distinct ids and retained run kinds',()=>{
 const bank=fixture();bank.quizzes=[{id:'section-1',title:'Synthetic section',questionIds:['q2']}];
 assert.equal(validateFessBank(bank),bank);const quiz=createFessRun(bank,'section-1',{id:'quiz-run',now:10});assert.equal(quiz.kind,'quiz');assert.deepEqual(quiz.questions.map(q=>q.id),['q2']);assert.equal(create().kind,'mock');
 assert.deepEqual(validateFessStore(storeWith(finish(quiz))).runs[0].kind,'quiz');
 const old=create();delete old.kind;assert.equal(validateFessStore(storeWith(old)).runs[0].kind,undefined);
 for(const change of [b=>b.quizzes[0].id='synthetic',b=>b.quizzes[0].questionIds=['missing'],b=>b.quizzes[0].questionIds=['q2','q2'],b=>b.quizzes=null]){const bad=structuredClone(bank);change(bad);assert.throws(()=>validateFessBank(bad));}
 const badRun=create();badRun.kind='exam';assert.throws(()=>validateFessStore(storeWith(badRun)),/incomplete/);
});
test('snapshots retain exact question, explanation and source when live bank changes',()=>{
 const bank=fixture(),run=createFessRun(bank,'synthetic',{id:'historical'});bank.questions[0].correctOptionId='a';bank.questions[0].explanation='Changed';bank.sources.test.pdfPage=50;
 const restored=validateFessStore(storeWith(run)).runs[0];assert.equal(restored.questions[0].correctOptionId,'c');assert.equal(restored.questions[0].explanation,'The test identifies the specified correct option.');assert.equal(restored.sources.test.pdfPage,2);
});
test('reload after wrong answer retains highlight state, original answer and current question',()=>{
 const run=choose(create(),'a'),restored=validateFessStore(JSON.parse(JSON.stringify(storeWith(run)))).runs[0];assert.equal(restored.cursor,0);assert.equal(restored.answers.q1.attempts[0].optionId,'a');assert.equal(restored.answers.q1.completed,false);assert.equal(fessScore(choose(restored,'c')).firstCorrect,0);
});
test('malformed older storage is rejected without substituting an empty store',()=>{
 assert.deepEqual(validateFessStore(undefined),emptyFessStore());assert.throws(()=>validateFessStore({schemaVersion:99,runs:[]}),/unchanged/);
 for(const change of [s=>s.activeRunId='missing',s=>s.runs[0].cursor=99,s=>s.runs[0].status='completed',s=>s.runs[0].answers.q1={completed:true,attempts:[{optionId:'a',correct:true,at:1}]}]){const saved=storeWith(create());change(saved);assert.throws(()=>validateFessStore(saved));}
});
test('saved progress cannot skip an unanswered question or rewrite an earlier success',()=>{
 const saved=storeWith(create());saved.runs[0].cursor=1;assert.throws(()=>validateFessStore(saved),/progress/);
 const completed=storeWith(choose(create(),'c'));completed.runs[0].answers.q1.attempts.push({optionId:'c',correct:true,at:21});assert.throws(()=>validateFessStore(completed),/answers/);
});
test('many saved runs are retained rather than silently capped',()=>{
 const data=emptyFessStore();data.runs=Array.from({length:75},(_,i)=>({...create(),id:'run-'+i}));assert.equal(validateFessStore(data).runs.length,75);
});
test('older completed runs remain valid without inventing understanding or changing their original score',()=>{
 const original=finish(choose(create(),'a'));delete original.understoodQuestionIds;delete original.understandingConfirmedAt;
 const restored=validateFessStore(JSON.parse(JSON.stringify(storeWith(original)))).runs[0];
 assert.deepEqual(restored,original);assert.deepEqual(fessUnderstanding(restored),{total:2,understood:0,percent:0,confirmed:false});assert.equal(fessScore(restored).firstAttemptPercent,50);
});
test('understanding requires an answered question, is explicit and repeated taps are idempotent',()=>{
 const unanswered=create(),wrong=choose(unanswered,'a');assert.throws(()=>markFessUnderstood(unanswered,'q1'),/Complete the answer/);assert.throws(()=>markFessUnderstood(wrong,'q1'),/Complete the answer/);assert.throws(()=>markFessUnderstood(wrong,'missing'),/in this quiz/);
 const corrected=choose(wrong,'c');assert.equal(fessUnderstanding(corrected).understood,0);
 const marked=markFessUnderstood(corrected,'q1',{now:40});assert.deepEqual(fessUnderstanding(marked),{total:2,understood:1,percent:50,confirmed:false});assert.deepEqual(corrected.understoodQuestionIds,[]);assert.equal(markFessUnderstood(marked,'q1',{now:99}),marked);assert.equal(marked.updatedAt,40);assert.equal(fessScore(marked).firstCorrect,0);assert.deepEqual(marked.answers,corrected.answers);
});
test('fully green confirmation requires completed quiz and every explicit understanding mark',()=>{
 let run=create();assert.throws(()=>confirmFessUnderstanding(run),/Finish the quiz/);
 run=markFessUnderstood(choose(run,'c'),'q1');run=advanceFessQuestion(run);run=markFessUnderstood(choose(run,'b'),'q2');
 assert.deepEqual(fessUnderstanding(run),{total:2,understood:2,percent:100,confirmed:false});assert.throws(()=>confirmFessUnderstanding(run),/Finish the quiz/);
 run=advanceFessQuestion(run);const confirmed=confirmFessUnderstanding(run,{now:90});assert.equal(confirmed.understandingConfirmedAt,90);assert.equal(fessUnderstanding(confirmed).confirmed,true);assert.equal(confirmFessUnderstanding(confirmed,{now:100}),confirmed);
 const restored=validateFessStore(JSON.parse(JSON.stringify(storeWith(confirmed)))).runs[0];assert.deepEqual(restored,confirmed);assert.equal(fessUnderstanding(restored).confirmed,true);
 assert.throws(()=>confirmFessUnderstanding(finish(create())),/every question/);
});
test('invalid understanding records are rejected while the original saved run is retained',()=>{
 const complete=finish(create());
 for(const change of [r=>r.understoodQuestionIds=['missing'],r=>r.understoodQuestionIds=['q1','q1'],r=>r.understoodQuestionIds=null,r=>r.understoodQuestionIds='q1',r=>r.understandingConfirmedAt=50,r=>{r.understoodQuestionIds=['q1','q2'];r.understandingConfirmedAt='50';}]){
  const bad=structuredClone(complete);change(bad);assert.throws(()=>validateFessStore(storeWith(bad)),/understanding/);
 }
 const unanswered=create();unanswered.understoodQuestionIds=['q1'];assert.throws(()=>validateFessStore(storeWith(unanswered)),/understanding/);
 const unfinished=choose(advanceFessQuestion(choose(create(),'c')),'b');unfinished.understoodQuestionIds=['q1','q2'];unfinished.understandingConfirmedAt=50;assert.throws(()=>validateFessStore(storeWith(unfinished)),/confirmation/);
 assert.deepEqual(complete.understoodQuestionIds,[]);assert.equal(complete.understandingConfirmedAt,null);
});
test('retrying missed questions starts separate understanding progress without altering the confirmed section',()=>{
 let original=finish(choose(create(),'a'));for(const q of original.questions)original=markFessUnderstood(original,q.id);original=confirmFessUnderstanding(original);
 const retry=retryFessMissed(original,{id:'retry-understanding',now:100});assert.deepEqual(fessUnderstanding(retry),{total:1,understood:0,percent:0,confirmed:false});assert.equal(fessUnderstanding(original).confirmed,true);assert.equal(fessScore(original).firstAttemptPercent,50);assert.deepEqual(validateFessStore(storeWith(retry)).runs[0],retry);
});
test('failed save preserves persisted and in-memory prior state; retry writes one replacement',async()=>{
 let stored=storeWith(create()),fail=true,writes=0;const other={manual:'unchanged'};const persistence=createFessPersistence({read:async key=>(assert.equal(key,FESS_STORE_KEY),structuredClone(stored)),write:async(key,value)=>{assert.equal(key,FESS_STORE_KEY);writes++;if(fail)throw new DOMException('Full','QuotaExceededError');stored=structuredClone(value);}});
 const initial=await persistence.load(),next=storeWith(choose(initial.runs[0],'a'));await assert.rejects(persistence.save(next),{name:'QuotaExceededError'});assert.deepEqual(await persistence.load(),initial);assert.deepEqual(stored,initial);fail=false;await persistence.save(next);assert.equal(stored.runs.length,1);assert.equal(stored.runs[0].answers.q1.attempts.length,1);assert.equal(writes,2);assert.deepEqual(other,{manual:'unchanged'});
});
test('concurrent loads share a storage read and failed reads can be retried',async()=>{
 let reads=0,fail=true;const persistence=createFessPersistence({read:async()=>{reads++;if(fail)throw Error('Storage unavailable');return emptyFessStore();},write:async()=>{}});await assert.rejects(persistence.load());fail=false;const values=await Promise.all([persistence.load(),persistence.load()]);assert.equal(reads,2);assert.deepEqual(values[0],values[1]);
});

function mockAudio({suspended=false}={}){
 const events=[];let context,resolveResume;
 class Context{
  constructor(){context=this;this.state=suspended?'suspended':'running';this.currentTime=1;this.destination={};events.push('context');}
  resume(){events.push('resume');return new Promise(resolve=>{resolveResume=()=>{this.state='running';resolve();};});}
  createOscillator(){return {type:'',frequency:{setValueAtTime:value=>events.push(['frequency',value])},connect(){},disconnect(){},start(){events.push('start');},stop(){events.push('stop');}};}
  createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
  close(){this.state='closed';return Promise.resolve();}
 }
 return {Context,events,resolve:()=>resolveResume?.(),get context(){return context;}};
}
test('audio stays silent until gesture unlock, then correct and wrong have distinct tones',async()=>{
 const mock=mockAudio(),sound=createFessAudio({AudioContext:mock.Context});assert.equal(sound.play('correct'),false);assert.deepEqual(mock.events,[]);await sound.unlock();sound.play('correct');const correct=mock.events.filter(e=>Array.isArray(e)).map(e=>e[1]);mock.events.length=0;sound.play('wrong');const wrong=mock.events.filter(e=>Array.isArray(e)).map(e=>e[1]);assert.notDeepEqual(correct,wrong);assert.ok(correct.every(n=>n>700));assert.ok(wrong.every(n=>n<200));sound.dispose();
});
test('mute and leaving cancel a pending audio resume, not just existing tones',async()=>{
 for(const leave of [s=>s.pause(),s=>s.setEnabled(false)]){const mock=mockAudio({suspended:true}),sound=createFessAudio({AudioContext:mock.Context});const ready=sound.unlock();sound.play('correct');leave(sound);mock.resolve();await ready;await Promise.resolve();assert.equal(mock.events.includes('start'),false);sound.dispose();}
});
test('unsupported audio degrades to visual feedback without throwing',async()=>{
 const sound=createFessAudio({AudioContext:null});assert.equal(sound.isAvailable(),false);assert.equal(await sound.unlock(),false);assert.equal(sound.play('wrong'),false);sound.dispose();
});
