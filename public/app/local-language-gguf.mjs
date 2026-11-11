// Optional GGUF runtime. Compact inference remains the default profile.
const error=(code,message,cause)=>Object.assign(new Error(message,{cause}),{code});
const aborted=()=>new DOMException('Local model operation cancelled. Saved files are unchanged.','AbortError');
const check=signal=>{if(signal?.aborted)throw aborted();};
export const COMPACT_TASK_GRAMMAR=String.raw`root ::= "{\"tasks\":[" (task ("," task)*)? "]}"
task ::= "{\"action\":" string ",\"target\":" string "}"
string ::= "\"" char+ "\""
char ::= [^"\\\x00-\x1F] | "\\" (["\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F])
`;
export function choiceGrammar(choices){
 if(!Array.isArray(choices)||!choices.length||choices.length>32||choices.some(x=>typeof x!=='string'||!x.trim()||x.length>64||/[\x00-\x1f\x7f]/.test(x)))throw error('MODEL_CHOICES_INVALID','Local model choices must be a non-empty list of short labels.');
 return 'root ::= '+[...new Set(choices)].map(x=>JSON.stringify(x)).join(' | ')+'\n';
}
export function localRuntimeURLs(paths,origin=globalThis.location?.origin){
 const names=['module','wasm','compatWorker','compatWasm'],result={};
 for(const name of names){let value;try{value=new URL(paths[name],origin+'/');}catch(cause){throw error('MODEL_RESOURCE_MISSING','A local runtime resource path is missing.',cause);}if(value.origin!==origin||!['http:','https:'].includes(value.protocol)||value.username||value.password)throw error('MODEL_NETWORK_BLOCKED','The local model runtime must use same-origin bundled files.');result[name]=value.href;}
 return result;
}
export async function readVerifiedModelBlob({cache,file,cacheAPI,onProgress,signal,timeoutMs=15000}){
 const {inspectModelFile,modelPartKey,modelVerifiedKey,awaitModelStorage,releaseModelResponse,chunkBytes=8*1024*1024}=cacheAPI;
 check(signal);const options={signal,timeoutMs},status=await inspectModelFile(cache,file,options);
 if(!status.ready)throw error('MODEL_RESOURCE_MISSING','The local model pack is incomplete. Resume its download before using local inference.');
 const parts=[],count=Math.ceil(file.bytes/chunkBytes);let loaded=0;
 try{for(let index=0;index<count;index++){
  check(signal);const response=await awaitModelStorage(()=>cache.match(modelPartKey(file,index)),options),expected=Math.min(chunkBytes,file.bytes-index*chunkBytes);
  try{
   if(!response||Number(response.headers.get('x-findr-part-bytes'))!==expected)throw error('MODEL_RESOURCE_MISSING','A saved model chunk changed or is missing. Resume the download to repair it.');
   // Blob parts are composed without materialising the complete GGUF in JS memory.
   const part=await awaitModelStorage(()=>response.blob(),options);check(signal);
   if(part.size!==expected)throw error('MODEL_RESOURCE_MISSING','A saved model chunk has the wrong size. Resume the download to repair it.');
   parts.push(part);loaded+=part.size;onProgress?.({phase:'load',message:'Reading verified local model files...',completed:loaded,total:file.bytes,partIndex:index+1,partCount:count});
  }finally{releaseModelResponse(response);}
 }
 const blob=new Blob(parts,{type:'application/octet-stream'});if(blob.size!==file.bytes)throw error('MODEL_RESOURCE_MISSING','The saved model file has an unexpected size.');return blob;
 }catch(cause){if(cause.code==='MODEL_RESOURCE_MISSING')await awaitModelStorage(()=>cache.delete(modelVerifiedKey(file)),options);throw cause;}
 finally{parts.length=0;}
}
export function mapGgufError(cause){
 if(cause?.name==='AbortError'||cause?.code)return cause;
 const message=String(cause?.message||cause||'Local model processing failed.'),code=/context|kv_cache_full|too (?:long|many tokens)|n_ctx|exceeds.*tokens/i.test(message)?'MODEL_CONTEXT_TOO_LONG':/memory|allocation|out of bounds|OOM/i.test(message)?'MODEL_MEMORY_LIMIT':/fetch|network|not found|404/i.test(message)?'MODEL_RESOURCE_MISSING':'MODEL_RUNTIME_ERROR';
 return error(code,code==='MODEL_CONTEXT_TOO_LONG'?'This message and its context exceed the local model limit. Nothing was shortened or removed; split the request or start a new conversation.':code==='MODEL_MEMORY_LIMIT'?'This browser could not allocate enough memory for the local model. Saved manuals and conversations remain available.':code==='MODEL_RESOURCE_MISSING'?'A local inference resource is missing. Restore the runtime resources and retry.':'The local language engine hit an error. Your manuals and conversation are still saved.',cause);
}
export function createGgufRuntime({model,file,runtimeURLs,cacheAPI,importRuntime=url=>import(url),onProgress=()=>{},onToken=()=>{},origin=globalThis.location?.origin}){
 const urls=localRuntimeURLs(runtimeURLs,origin);let engine=null,active=false,disposed=false;
 const contextTokens=model.contextTokens||1536,maxOutput=model.maxNewTokens||180;
 async function load({signal}={}){
  if(disposed)throw error('MODEL_RUNTIME_ERROR','This model worker has been closed.');if(engine)return{loadMs:0};check(signal);const start=performance.now();
  onProgress({phase:'load',message:'Loading the local language engine...'});
  const {Wllama}=await importRuntime(urls.module),cache=await cacheAPI.openModelCache({signal}),blob=await readVerifiedModelBlob({cache,file,cacheAPI,onProgress,signal});check(signal);
  const instance=new Wllama({default:urls.wasm},{allowOffline:true,suppressNativeLog:true,logger:{debug(){},log(){},warn(){},error(){}}});
  instance.setCompat({worker:urls.compatWorker,wasm:urls.compatWasm});
  try{
   onProgress({phase:'load',message:'Opening the local model in memory...'});
   await instance.loadModel([blob],{n_ctx:contextTokens,n_batch:128,n_ubatch:64,n_threads:1,n_parallel:1,n_gpu_layers:0,seed:1,default_template_kwargs:{enable_thinking:false},reasoning:false,ctx_shift:false});
   check(signal);if(disposed)throw aborted();engine=instance;return{loadMs:performance.now()-start};
  }catch(cause){await instance.exit().catch(()=>{});throw mapGgufError(cause);}
 }
 async function generate(request,{signal}={}){
  if(active)throw error('MODEL_BUSY','Another local model operation is running.');active=true;
  try{
   const messages=(Array.isArray(request.messages)?request.messages:[]).filter(x=>['system','user','assistant'].includes(x?.role)&&typeof x.content==='string').map(x=>({role:x.role,content:x.content}));
   if(!messages.length)throw error('MODEL_INPUT_REQUIRED','Enter a question before running local inference.');
   if(messages.reduce((n,x)=>n+x.content.length,0)>65536)throw error('MODEL_CONTEXT_TOO_LONG','This request is too long for local inference. Nothing was shortened or removed.');
   if(request.choices!==undefined&&request.outputFormat!==undefined)throw error('MODEL_REQUEST_INVALID','Choose one local output format.');
   const grammar=request.choices!==undefined?choiceGrammar(request.choices):request.outputFormat==='tasks'?COMPACT_TASK_GRAMMAR:undefined;
   if(request.outputFormat!==undefined&&request.outputFormat!=='tasks')throw error('MODEL_REQUEST_INVALID','Unknown local output format.');
   const budget=Math.max(16,Math.min(maxOutput,Number(request.maxNewTokens)||maxOutput)),loaded=await load({signal}),begun=performance.now(),controller=new AbortController();
   const cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
   let text='',usage=null,timings=null,firstTokenMs=null,promptTokens=null,outputTokens=0,finishReason=null;
   try{for await(const chunk of await engine.createChatCompletion({messages,max_tokens:budget,temperature:0,seed:1,stream:true,return_progress:true,timings_per_token:true,cache_prompt:true,chat_template_kwargs:{enable_thinking:false},abortSignal:controller.signal,...(grammar?{grammar}:{})})){
    check(signal);const progress=chunk.prompt_progress;
    if(progress){promptTokens=progress.total;if(promptTokens+budget>contextTokens){controller.abort();throw error('MODEL_CONTEXT_TOO_LONG','This request and output budget exceed the local model context. Nothing was shortened or removed.');}onProgress({phase:'generate',subphase:'prefill',message:'Reading the conversation locally...',completed:progress.processed,total:progress.total,cached:progress.cache});}
    usage=chunk.usage||usage;timings=chunk.timings||timings;outputTokens=usage?.completion_tokens??timings?.predicted_n??outputTokens;
    const content=chunk.choices?.[0]?.delta?.content;
    if(content){firstTokenMs??=performance.now()-begun;text+=content;onToken(content);onProgress({phase:'generate',message:'Interpreting locally...',tokens:outputTokens,maxTokens:budget,elapsedMs:performance.now()-begun});}
    finishReason=chunk.choices?.[0]?.finish_reason||finishReason;
   }}finally{signal?.removeEventListener('abort',cancel);}
   check(signal);text=text.trim();
   if(finishReason==='length')throw error('MODEL_OUTPUT_INCOMPLETE','The local model reached its response limit. No incomplete interpretation was accepted.');
   if(request.choices&&!request.choices.includes(text))throw error('MODEL_CHOICE_INVALID','The local model did not finish one of the permitted choices.');
   if(request.outputFormat==='tasks'){let parsed;try{parsed=JSON.parse(text);}catch{throw error('MODEL_OUTPUT_INVALID','The local model did not finish a valid task list.');}if(!Array.isArray(parsed.tasks)||parsed.tasks.some(t=>typeof t.action!=='string'||typeof t.target!=='string'))throw error('MODEL_OUTPUT_INVALID','The local model returned an invalid task list.');}
   const generationMs=performance.now()-begun;
   return{text,modelId:model.id,modelRevision:model.revision,backend:'wasm',runtime:'wllama-3.13.0',interpretationOnly:true,contextTruncated:false,...(request.choices?{choiceConstraint:{method:'native_gbnf',allowed:request.choices,selected:text}}:{}),metrics:{...loaded,inputTokens:usage?.prompt_tokens??promptTokens,outputTokens,firstTokenMs,generationMs,tokensPerSecond:outputTokens/(generationMs/1000),timings}};
  }catch(cause){throw mapGgufError(cause);}finally{active=false;}
 }
 async function dispose(){disposed=true;const current=engine;engine=null;await current?.exit();}
 return{load,generate,dispose};
}
