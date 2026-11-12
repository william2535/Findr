// FINDR's one-hour learning papers are not the official Highfield assessment
// format. Deadlines are persisted wall-clock times, not pauseable countdowns.
export const FESS_PAPER_QUESTIONS=60;
export const FESS_PAPER_DURATION_SECONDS=3600;
const clone=value=>structuredClone(value);
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const text=value=>typeof value==='string'&&value.trim().length>0;
const unique=items=>new Set(items).size===items.length;
const finiteTime=value=>Number.isFinite(value)&&value>=0;
const bad=message=>{throw new Error(message+' Your saved practice is unchanged.');};
const requirePaper=run=>{if(run?.kind!=='paper'||!['active','completed'].includes(run.status))throw new Error('Choose a full paper for this action.');};

export function validateFessPaperDefinition(paper,questionIds){
 if(!object(paper)||!text(paper.id)||!text(paper.title)||paper.durationSeconds!==FESS_PAPER_DURATION_SECONDS||!Array.isArray(paper.questionIds)||paper.questionIds.length!==FESS_PAPER_QUESTIONS||!unique(paper.questionIds)||paper.questionIds.some(id=>!questionIds.has(id)))bad('A full paper must contain 60 different questions and a one-hour duration.');
 return paper;
}

/** Also used by the shared v1 store, without changing older quiz/mock records. */
export function validateFessPaperRun(run){
 if(!object(run)||run.kind!=='paper'||!text(run.id)||!text(run.paperId)||!text(run.title)||!text(run.bankVersion)||run.durationSeconds!==FESS_PAPER_DURATION_SECONDS||!Array.isArray(run.questions)||run.questions.length!==FESS_PAPER_QUESTIONS||!unique(run.questions.map(q=>q?.id))||!object(run.sources)||!object(run.answers)||!['active','completed'].includes(run.status)||!Number.isInteger(run.cursor)||run.cursor<0||run.cursor>=run.questions.length)bad('A saved full paper is incomplete.');
 for(const q of run.questions){
  if(!object(q)||!text(q.id)||['__proto__','constructor','prototype'].includes(q.id)||!text(q.question)||!text(q.explanation)||!Array.isArray(q.options)||q.options.length!==4||!unique(q.options.map(o=>o?.id))||q.options.some(o=>!object(o)||!text(o.id)||!text(o.text)||!text(o.explanation))||!q.options.some(o=>o.id===q.correctOptionId)||!Array.isArray(q.sourceIds)||!q.sourceIds.length||q.sourceIds.some(id=>!Object.hasOwn(run.sources,id)))bad('A saved full-paper question is incomplete.');
 }
 for(const source of Object.values(run.sources)){let url;try{url=new URL(source?.url);}catch{}if(!object(source)||!text(source.title)||url?.protocol!=='https:'||url.username||url.password)bad('A saved full-paper source is invalid.');}
 if(!finiteTime(run.startedAt)||!finiteTime(run.deadlineAt)||run.deadlineAt!==run.startedAt+FESS_PAPER_DURATION_SECONDS*1000||run.deadlineAt-run.startedAt!==FESS_PAPER_DURATION_SECONDS*1000||!finiteTime(run.lastObservedAt)||run.lastObservedAt<run.startedAt||!finiteTime(run.updatedAt)||run.updatedAt<run.lastObservedAt)bad('A saved full-paper deadline is inconsistent.');
 if(run.status==='active'){
  if(run.finishedAt!==null||run.submittedReason!==null||run.lastObservedAt>=run.deadlineAt)bad('An unfinished full paper has inconsistent timing.');
 }else{
  if(!finiteTime(run.finishedAt)||run.finishedAt<run.startedAt||run.finishedAt>run.deadlineAt||run.lastObservedAt<run.finishedAt||!['submitted','expired'].includes(run.submittedReason)||run.submittedReason==='expired'&&run.finishedAt!==run.deadlineAt||run.submittedReason==='submitted'&&run.finishedAt>=run.deadlineAt)bad('A finished full paper has inconsistent timing.');
 }
 for(const [id,answer]of Object.entries(run.answers)){
  const q=run.questions.find(q=>q.id===id);
  if(!q||!object(answer)||!q.options.some(o=>o.id===answer.optionId)||!finiteTime(answer.at)||answer.at<run.startedAt||answer.at>=run.deadlineAt||answer.at>run.lastObservedAt||run.status==='completed'&&answer.at>run.finishedAt)bad('A saved full-paper answer is inconsistent.');
 }
 return run;
}

export function createFessPaper(bank,paperId,{id=globalThis.crypto.randomUUID(),now=Date.now()}={}){
 if(!object(bank)||!text(bank.version)||!Array.isArray(bank.papers)||!Array.isArray(bank.questions)||!object(bank.sources)||!finiteTime(now)||!text(id))bad('The full paper could not be started.');
 if(!unique(bank.questions.map(q=>q?.id)))bad('The question bank has duplicate identifiers.');
 const paper=bank.papers.find(p=>p.id===paperId);validateFessPaperDefinition(paper,new Set(bank.questions.map(q=>q.id)));
 const questions=paper.questionIds.map(id=>clone(bank.questions.find(q=>q.id===id))),sourceIds=new Set(questions.flatMap(q=>q.sourceIds));
 const run={id,paperId,kind:'paper',title:paper.title,bankVersion:bank.version,questions,sources:Object.fromEntries([...sourceIds].map(id=>[id,clone(bank.sources[id])])),cursor:0,answers:{},durationSeconds:FESS_PAPER_DURATION_SECONDS,status:'active',startedAt:now,deadlineAt:now+FESS_PAPER_DURATION_SECONDS*1000,lastObservedAt:now,updatedAt:now,finishedAt:null,submittedReason:null};
 return validateFessPaperRun(run);
}

function observedTime(run,now){
 if(!finiteTime(now))throw new Error('The current time could not be read.');
 // This floor prevents rollback beyond an already saved observation. The UI
 // also anchors elapsed time to performance.now while open. An offline app
 // cannot prove elapsed wall time if the device clock is changed while closed.
 return Math.max(now,run.lastObservedAt,run.startedAt);
}

export function paperRemainingMs(run,now=Date.now()){
 requirePaper(run);
 if(run.status==='completed')return 0;
 return Math.max(0,run.deadlineAt-observedTime(run,now));
}

function expire(run,at){return {...clone(run),status:'completed',finishedAt:run.deadlineAt,submittedReason:'expired',lastObservedAt:at,updatedAt:at};}

export function answerFessPaper(run,questionId,optionId,{now=Date.now()}={}){
 requirePaper(run);
 if(run.status==='completed')return run;
 const at=observedTime(run,now);if(at>=run.deadlineAt)return expire(run,at);
 const q=run.questions.find(q=>q.id===questionId);if(!q||!q.options.some(o=>o.id===optionId))throw new Error('Choose an answer for a question in this paper.');
 if(run.answers[questionId]?.optionId===optionId&&at===run.lastObservedAt)return run;
 const next=clone(run);next.lastObservedAt=at;next.updatedAt=at;
 // Selecting the same answer observes the clock without rewriting its entry.
 if(next.answers[questionId]?.optionId!==optionId)next.answers[questionId]={optionId,at};
 return next;
}

export function navigateFessPaper(run,cursor,{now=Date.now()}={}){
 requirePaper(run);
 if(run.status==='completed')return run;
 const at=observedTime(run,now);if(at>=run.deadlineAt)return expire(run,at);
 if(!Number.isInteger(cursor)||cursor<0||cursor>=run.questions.length)throw new Error('Choose a question in this paper.');
 if(cursor===run.cursor&&at===run.lastObservedAt)return run;
 return {...clone(run),cursor,lastObservedAt:at,updatedAt:at};
}

export function finishFessPaper(run,{now=Date.now(),reason='submitted'}={}){
 requirePaper(run);
 if(run.status==='completed')return run;
 if(!['submitted','expired'].includes(reason))throw new Error('A full paper can be submitted or finish when its hour expires.');
 const at=observedTime(run,now);if(at>=run.deadlineAt)return expire(run,at);
 if(reason==='expired')return at===run.lastObservedAt?run:{...clone(run),lastObservedAt:at,updatedAt:at};
 return {...clone(run),status:'completed',finishedAt:at,submittedReason:'submitted',lastObservedAt:at,updatedAt:at};
}

export function paperScore(run){
 requirePaper(run);
 const total=run.questions.length,answered=run.questions.filter(q=>Object.hasOwn(run.answers,q.id)).length,unanswered=total-answered;
 if(run.status!=='completed')return {total,answered,unanswered,correct:null,incorrect:null,percent:null};
 const correct=run.questions.filter(q=>run.answers[q.id]?.optionId===q.correctOptionId).length;
 return {total,answered,unanswered,correct,incorrect:answered-correct,percent:Math.round(correct/total*100)};
}
