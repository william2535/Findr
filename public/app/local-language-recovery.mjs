// A tab-scoped checkpoint survives a reload without mistaking another open
// FINDR tab's live worker for a crashed attempt. No question or manual text is
// stored here; conversations and model files keep their existing stores.
export const LOCAL_LANGUAGE_ATTEMPT_KEY='findr-local-language-attempt-v1';
const phases=new Set(['starting','load','generate']);
const error=(code,message)=>Object.assign(new Error(message),{code});

export function createLocalLanguageRecovery({getStorage=()=>globalThis.sessionStorage,modelId,revision,runtimeVersion,now=()=>Date.now()}={}){
 const identity=String(modelId)+'@'+String(revision);
 let storage=null,record=null,currentId=null,unavailable=false;
 const empty=()=>({schema:1,identity,runtimeVersion,state:'idle',updatedAt:now()});
 function write(next){
  try{
   storage||=getStorage();if(!storage)throw Error('Session storage unavailable');
   const value=JSON.stringify(next);storage.setItem(LOCAL_LANGUAGE_ATTEMPT_KEY,value);
   if(storage.getItem(LOCAL_LANGUAGE_ATTEMPT_KEY)!==value)throw Error('Checkpoint not retained');
   record=next;unavailable=false;return true;
  }catch{unavailable=true;return false;}
 }
 try{
  storage=getStorage();if(!storage)throw Error('Session storage unavailable');
  const raw=storage.getItem(LOCAL_LANGUAGE_ATTEMPT_KEY);let previous=null;
  try{previous=raw?JSON.parse(raw):null;}catch{previous={...empty(),state:'failed',code:'MODEL_RECOVERY_INVALID'};}
  record=previous?.schema===1&&previous.identity===identity?previous:empty();
  if(record.state==='running'){
   record={...record,state:'interrupted',updatedAt:now()};write(record);
  }else if(!['idle','interrupted','failed'].includes(record.state))record=empty();
 }catch{record=empty();unavailable=true;}

 function snapshot(){
  const state=unavailable?'storage-unavailable':record.state,blocked=['interrupted','failed','storage-unavailable'].includes(state);
  const during=record.phase==='generate'?'preparing the reply':record.phase==='load'?'loading the model':'starting the model';
  const message=state==='interrupted'?`The previous local AI attempt was interrupted while ${during}. Your saved question, manuals and model files are retained. Manual search is available; enable local AI retry to try the model again.`:
   state==='failed'?'The previous local AI attempt could not finish. Your saved question, manuals and model files are retained. Manual search is available; enable local AI retry to try the model again.':
   state==='storage-unavailable'?'This browser could not retain the local AI recovery checkpoint. Manual search remains available; local AI will not start until the checkpoint can be saved.':'';
  return {state,blocked,message,phase:record.phase||null,attemptId:record.attemptId||null,updatedAt:record.updatedAt||null,validatedAt:record.validatedAt||null,
   ...(blocked?{code:state==='interrupted'?'MODEL_INTERRUPTED':state==='storage-unavailable'?'MODEL_RECOVERY_UNAVAILABLE':record.code||'MODEL_RUNTIME_ERROR'}:{})};
 }
 function begin(id){
  const state=snapshot();if(state.blocked)throw error(state.code,state.message);
  if(currentId)throw error('MODEL_BUSY','Another local model operation is running.');
  const next={...empty(),state:'running',attemptId:id,phase:'starting',startedAt:now(),validatedAt:record.validatedAt||null};
  if(!write(next)){const failed=snapshot();throw error(failed.code,failed.message);}
  currentId=id;return snapshot();
 }
 function progress(id,phase){
  if(currentId!==id||record.attemptId!==id||!phases.has(phase)||record.phase===phase)return false;
  return write({...record,phase,updatedAt:now()});
 }
 function finish(id,{outcome='complete',code}={}){
  if(currentId!==id||record.attemptId!==id)return false;
  currentId=null;
  const next=outcome==='failed'?{...record,state:'failed',code:String(code||'MODEL_RUNTIME_ERROR').slice(0,80),updatedAt:now()}:
   {...empty(),validatedAt:outcome==='complete'?now():record.validatedAt||null};
  return write(next);
 }
 function allowRetry(){
  if(currentId)throw error('MODEL_BUSY','Wait for the current local model operation to finish.');
  if(!write({...empty(),validatedAt:record.validatedAt||null})){const state=snapshot();throw error(state.code,state.message);}
  return snapshot();
 }
 return {snapshot,begin,progress,finish,allowRetry};
}
