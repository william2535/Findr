// Practice progress is separate from diagnostic jobs and official exam results.
export const FESS_STORE_KEY='fess-mocks:v1';
export const FESS_STORE_VERSION=1;
const clone=value=>structuredClone(value);
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const text=value=>typeof value==='string'&&value.trim().length>0;
const unique=items=>new Set(items).size===items.length;

export function validateFessBank(bank){
 if(!object(bank)||bank.schemaVersion!==1||!text(bank.version)||!Array.isArray(bank.questions)||!bank.questions.length||!Array.isArray(bank.mocks)||!bank.mocks.length||bank.quizzes!==undefined&&!Array.isArray(bank.quizzes)||!object(bank.sources))throw new Error('The FESS practice questions could not be read. Update FINDR and try again.');
 const sets=[...bank.mocks,...(bank.quizzes||[])];
 if(!unique(bank.questions.map(q=>q.id))||!unique(sets.map(m=>m.id)))throw new Error('The FESS question bank has duplicate identifiers.');
 for(const q of bank.questions){
  if(!text(q.id)||['__proto__','constructor','prototype'].includes(q.id)||!text(q.question)||!text(q.explanation)||!Array.isArray(q.options)||q.options.length!==4||!unique(q.options.map(o=>o.id))||!q.options.some(o=>o.id===q.correctOptionId)||q.options.some(o=>!text(o.id)||!text(o.text)||!text(o.explanation))||!Array.isArray(q.sourceIds)||!q.sourceIds.length||q.sourceIds.some(id=>!Object.hasOwn(bank.sources,id)||!object(bank.sources[id])))throw new Error('A FESS question is incomplete. Update FINDR before using this mock.');
 }
 const ids=new Set(bank.questions.map(q=>q.id));
 for(const mock of sets)if(!text(mock.id)||!text(mock.title)||!Array.isArray(mock.questionIds)||!mock.questionIds.length||!unique(mock.questionIds)||mock.questionIds.some(id=>!ids.has(id)))throw new Error('A FESS practice set references a missing question.');
 for(const source of Object.values(bank.sources)){let url;try{url=new URL(source.url);}catch{}if(!text(source.title)||url?.protocol!=='https:'||url.username||url.password)throw new Error('A FESS source reference is invalid.');}
 return bank;
}

export function emptyFessStore(){return {schemaVersion:FESS_STORE_VERSION,soundEnabled:true,activeRunId:null,runs:[]};}

export function validateFessStore(value){
 if(value==null)return emptyFessStore();
 if(!object(value)||value.schemaVersion!==FESS_STORE_VERSION||!Array.isArray(value.runs)||!unique(value.runs.map(r=>r.id))||typeof value.soundEnabled!=='boolean'||value.activeRunId!==null&&!text(value.activeRunId))throw new Error('Saved FESS practice could not be read. It has been left unchanged.');
 for(const run of value.runs){
  if(!text(run.id)||!text(run.title)||!text(run.bankVersion)||run.kind!==undefined&&!['mock','quiz'].includes(run.kind)||!Array.isArray(run.questions)||!run.questions.length||!unique(run.questions.map(q=>q.id))||!object(run.sources)||!object(run.answers)||!['active','completed'].includes(run.status)||!Number.isFinite(run.startedAt)||!Number.isFinite(run.updatedAt)||run.status==='completed'&&!Number.isFinite(run.finishedAt)||!Number.isInteger(run.cursor)||run.cursor<0||run.cursor>=run.questions.length)throw new Error('A saved FESS run is incomplete. It has been left unchanged.');
  validateFessBank({schemaVersion:1,version:run.bankVersion,questions:run.questions,mocks:[{id:run.id,title:run.title,questionIds:run.questions.map(q=>q.id)}],sources:run.sources});
  for(const [id,answer]of Object.entries(run.answers)){
   const q=run.questions.find(q=>q.id===id);
   if(!q||!object(answer)||!Array.isArray(answer.attempts)||!answer.attempts.length||typeof answer.completed!=='boolean'||answer.attempts.some(a=>!object(a)||!q.options.some(o=>o.id===a.optionId)||a.correct!==(a.optionId===q.correctOptionId)||!Number.isFinite(a.at))||answer.completed!==answer.attempts.at(-1).correct||answer.attempts.slice(0,-1).some(a=>a.correct))throw new Error('Saved FESS answers are inconsistent. They have been left unchanged.');
  }
  if(run.questions.slice(0,run.cursor).some(q=>!run.answers[q.id]?.completed)||run.status==='completed'&&run.questions.some(q=>!run.answers[q.id]?.completed))throw new Error('Saved FESS progress is inconsistent. It has been left unchanged.');
  // These fields are optional so existing runs remain readable without a
  // destructive migration. Correct answers and self-reported understanding
  // are deliberately separate records.
  const understood=run.understoodQuestionIds??[];
  if(run.understoodQuestionIds!==undefined&&(!Array.isArray(run.understoodQuestionIds)||!unique(understood)||understood.some(id=>!run.questions.some(q=>q.id===id)||!run.answers[id]?.completed)))throw new Error('Saved FESS understanding is inconsistent. It has been left unchanged.');
  if(run.understandingConfirmedAt!==undefined&&run.understandingConfirmedAt!==null&&(!Number.isFinite(run.understandingConfirmedAt)||run.status!=='completed'||understood.length!==run.questions.length))throw new Error('Saved FESS understanding confirmation is inconsistent. It has been left unchanged.');
 }
 if(value.activeRunId&&!value.runs.some(run=>run.id===value.activeRunId))throw new Error('The saved active FESS run is missing. Existing practice data is unchanged.');
 return clone(value);
}

export function createFessRun(bank,mockId,{id=globalThis.crypto.randomUUID(),now=Date.now()}={}){
 validateFessBank(bank);const quiz=bank.quizzes?.find(m=>m.id===mockId),mock=quiz||bank.mocks.find(m=>m.id===mockId);if(!mock)throw new Error('Choose an available FESS quiz or mock.');
 const questions=mock.questionIds.map(id=>clone(bank.questions.find(q=>q.id===id))),sourceIds=new Set(questions.flatMap(q=>q.sourceIds));
 return {id,mockId,kind:quiz?'quiz':'mock',title:mock.title,bankVersion:bank.version,questions,sources:Object.fromEntries([...sourceIds].map(id=>[id,clone(bank.sources[id])])),cursor:0,answers:{},understoodQuestionIds:[],understandingConfirmedAt:null,status:'active',startedAt:now,updatedAt:now,finishedAt:null};
}

export function answerFessQuestion(run,optionId,{now=Date.now()}={}){
 const q=run.questions[run.cursor],previous=run.answers[q.id];
 if(run.status!=='active'||previous?.completed)return {run,changed:false};
 if(!q.options.some(o=>o.id===optionId))throw new Error('Choose one of the answers shown.');
 // Once the answer is revealed, only tapping it can complete the question.
 // Repeated clicks on a wrong answer cannot create extra attempts or sounds.
 if(previous?.attempts.length&&optionId!==q.correctOptionId)return {run,changed:false};
 const correct=optionId===q.correctOptionId,next=clone(run);
 next.answers[q.id]={attempts:[...(previous?.attempts||[]),{optionId,correct,at:now}],completed:correct};next.updatedAt=now;
 return {run:next,changed:true,correct,questionId:q.id};
}

export function advanceFessQuestion(run,{now=Date.now()}={}){
 if(run.status!=='active'||!run.answers[run.questions[run.cursor].id]?.completed)return run;
 const next=clone(run);next.updatedAt=now;
 if(next.cursor===next.questions.length-1){next.status='completed';next.finishedAt=now;}else next.cursor++;
 return next;
}

export function fessScore(run){
 const answers=run.questions.map(q=>run.answers[q.id]),completed=answers.filter(a=>a?.completed).length,answered=answers.filter(a=>a?.attempts.length).length,firstCorrect=answers.filter(a=>a?.attempts[0]?.correct).length,total=run.questions.length;
 return {total,completed,answered,firstCorrect,completionPercent:Math.round(completed/total*100),firstAttemptPercent:Math.round(firstCorrect/total*100),missedIds:run.questions.filter(q=>run.answers[q.id]?.attempts[0]?.correct===false).map(q=>q.id)};
}

/** Self-assessed understanding is not a test grade or automatic consequence of
 * choosing the right answer. The engineer explicitly marks and confirms it. */
export function fessUnderstanding(run){
 const total=run.questions.length,understood=(run.understoodQuestionIds||[]).length;
 return {total,understood,percent:total?Math.round(understood/total*100):0,confirmed:Number.isFinite(run.understandingConfirmedAt)};
}

export function markFessUnderstood(run,questionId,{now=Date.now()}={}){
 if(!run.questions.some(q=>q.id===questionId))throw new Error('Choose a question in this quiz.');
 if(!run.answers[questionId]?.completed)throw new Error('Complete the answer before marking it understood.');
 if((run.understoodQuestionIds||[]).includes(questionId))return run;
 if(!Number.isFinite(now))throw new Error('The understanding time could not be recorded.');
 const next=clone(run);next.understoodQuestionIds=[...(run.understoodQuestionIds||[]),questionId];next.updatedAt=now;return next;
}

export function confirmFessUnderstanding(run,{now=Date.now()}={}){
 if(run.status!=='completed'||fessUnderstanding(run).understood!==run.questions.length)throw new Error('Finish the quiz and mark every question understood before confirming this section.');
 if(fessUnderstanding(run).confirmed)return run;
 if(!Number.isFinite(now))throw new Error('The understanding time could not be recorded.');
 const next=clone(run);next.understandingConfirmedAt=now;next.updatedAt=now;return next;
}

export function retryFessMissed(run,{id=globalThis.crypto.randomUUID(),now=Date.now()}={}){
 const ids=fessScore(run).missedIds;if(!ids.length)throw new Error('No missed questions to retry.');
 return {...clone(run),id,parentRunId:run.id,title:'Retry · '+run.title,questions:run.questions.filter(q=>ids.includes(q.id)).map(clone),cursor:0,answers:{},understoodQuestionIds:[],understandingConfirmedAt:null,status:'active',startedAt:now,updatedAt:now,finishedAt:null};
}

/** Write one replacement snapshot only after validation. A failed transaction
 * leaves the previous persisted state intact; UI can retry the same snapshot. */
export function createFessPersistence({read,write}){
 let saved=null,loading=null;
 return {
  async load(){if(saved)return clone(saved);if(!loading)loading=Promise.resolve().then(()=>read(FESS_STORE_KEY)).then(validateFessStore).then(value=>(saved=value,clone(value))).finally(()=>{loading=null;});return loading;},
  async save(next){const valid=validateFessStore(next);await write(FESS_STORE_KEY,valid);saved=valid;return clone(saved);},
 };
}
