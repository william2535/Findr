import {LOCAL_MODEL,LOCAL_MODEL_FILES} from './local-language-resources.mjs';
import {openModelCache,inspectModelFile,makeModelCacheAdapter,modelError} from './local-language-cache.mjs';
import {downloadModelPack} from './local-language-download.mjs';
let generator=null,library=null,active=false;
const send=(id,type,data)=>postMessage({id,type,...data});
function errorDetails(error,phase){return {code:error?.code||(/memory|allocation|out of bounds/i.test(error?.message||'')?'MODEL_MEMORY_LIMIT':'MODEL_RUNTIME_ERROR'),message:error?.message||'Local language processing failed.',name:error?.name||'Error',stack:String(error?.stack||'').slice(0,10000),phase,modelId:LOCAL_MODEL.id,revision:LOCAL_MODEL.revision};}
async function downloadPack(id){const result=await downloadModelPack({onProgress:value=>send(id,'progress',value)});send(id,'complete',{result});}
async function loadGenerator(id){
 if(generator)return {loadMs:0};const start=performance.now();send(id,'progress',{phase:'load',message:'Loading the local language model into memory…',modelId:LOCAL_MODEL.id});
 library||=await import('./vendor/local-language/transformers.min.js');
 const cache=await openModelCache();for(const file of LOCAL_MODEL_FILES)if(!(await inspectModelFile(cache,file)).ready)throw modelError('MODEL_RESOURCE_MISSING','Download the complete local model pack before using local language inference.');
 const {env}=library;env.allowRemoteModels=false;env.allowLocalModels=true;env.useBrowserCache=false;env.useFSCache=false;env.useCustomCache=true;env.customCache=makeModelCacheAdapter(cache);
 // The model uses the CPU backend only. The matching non-JSEP runtime avoids
 // loading the WebGPU/WebNN build on mobile Safari; never mix ORT versions.
 env.backends.onnx.wasm.wasmPaths={mjs:new URL('./vendor/local-language/ort-wasm-simd-threaded.mjs',import.meta.url).href,wasm:new URL('./vendor/local-language/ort-wasm-simd-threaded.wasm',import.meta.url).href};env.backends.onnx.wasm.numThreads=1;env.backends.onnx.wasm.proxy=false;
 generator=await library.pipeline('text-generation',LOCAL_MODEL.id,{revision:LOCAL_MODEL.revision,dtype:LOCAL_MODEL.dtype,device:'wasm',local_files_only:true,progress_callback:value=>{if(value.status==='progress')send(id,'progress',{phase:'load',message:'Reading verified local model files…',completed:value.loaded||0,total:value.total||0});}});
 return {loadMs:performance.now()-start};
}
function plainMessages(input){const rows=Array.isArray(input)?input:[];return rows.filter(row=>['system','user','assistant'].includes(row?.role)&&typeof row.content==='string').map(row=>({role:row.role,content:row.content}));}
// Constrain syntax, not the selection. Every allowed continuation keeps the
// model's original logit; disallowed tokens alone are masked. This lets the small
// shared model select evidence without mistaking a restatement for a source ID.
// It is opt-in, so existing free-generation callers retain their prior behavior.
export function createLocalChoiceConstraint({choices,tokenizer,promptLength,eosTokenIds,library:runtime}){
 if(!Array.isArray(choices)||!choices.length||choices.length>32||choices.some(choice=>typeof choice!=='string'||!choice.trim()||choice.length>64))throw modelError('MODEL_CHOICES_INVALID','Local model choices must be a non-empty list of short labels.');
 const allowed=[...new Set(choices)],eos=[...new Set([].concat(eosTokenIds??tokenizer.eos_token_id).map(Number))];
 if(!Number.isSafeInteger(promptLength)||promptLength<1||!eos.length||eos.some(id=>!Number.isSafeInteger(id)||id<0))throw modelError('MODEL_CHOICES_INVALID','The local model cannot determine a safe end for these choices.');
 const root={children:new Map(),terminal:false};let maxTokens=0;
 for(const choice of allowed){
  const ids=tokenizer.encode(choice,{add_special_tokens:false}).map(Number);
  if(!ids.length||ids.length>32||ids.some(id=>!Number.isSafeInteger(id)||id<0||eos.includes(id))||tokenizer.decode(ids,{skip_special_tokens:false})!==choice)throw modelError('MODEL_CHOICES_INVALID','A local model choice cannot be represented exactly by this tokenizer.');
  let node=root;for(const id of ids){if(!node.children.has(id))node.children.set(id,{children:new Map(),terminal:false});node=node.children.get(id);}node.terminal=true;maxTokens=Math.max(maxTokens,ids.length+1);
 }
 class ChoiceLogitsProcessor extends runtime.LogitsProcessor{
  _call(inputIds,scores){
   for(let batch=0;batch<inputIds.length;batch++){
    const generated=inputIds[batch].slice(promptLength);let node=root;
    for(const token of generated){node=node.children.get(Number(token));if(!node)throw modelError('MODEL_CHOICE_INVALID','The local model left its permitted choice sequence.');}
    const permitted=[...node.children.keys(),...(node.terminal?eos:[])],data=scores[batch].data;
    if(!permitted.length||permitted.some(id=>id>=data.length))throw modelError('MODEL_CHOICES_INVALID','A local model choice is outside its vocabulary.');
    const original=permitted.map(id=>data[id]);
    if(!original.some(Number.isFinite))throw modelError('MODEL_CHOICE_INVALID','The local model did not give any permitted choice a usable score.');
    data.fill(-Infinity);permitted.forEach((id,index)=>{data[id]=Number.isFinite(original[index])?original[index]:-Infinity;});
   }
   return scores;
  }
 }
 const processors=new runtime.LogitsProcessorList();processors.push(new ChoiceLogitsProcessor());
 return {processors,choices:allowed,maxTokens,method:'model_logits_token_trie'};
}
async function generate(id,request){
 let messages=plainMessages(request.messages),truncated=false;
 if(!messages.length)throw modelError('MODEL_INPUT_REQUIRED','Enter a question before running local inference.');
 const load=await loadGenerator(id),start=performance.now();
 // Keep the latest question and its supplied references; remove oldest turns first.
 const count=rows=>generator.tokenizer.apply_chat_template(rows,{tokenize:true,return_tensor:false,add_generation_prompt:true}).length;
 while(messages.length>2&&count(messages)>LOCAL_MODEL.maxInputTokens){const index=messages[0].role==='system'?1:0;messages.splice(index,1);truncated=true;}
 if(count(messages)>LOCAL_MODEL.maxInputTokens)throw modelError('MODEL_CONTEXT_TOO_LONG','The selected references are too long for this compact local model. Narrow the question or use fewer passages.');
 const inputTokens=count(messages),constraint=request.choices===undefined?null:createLocalChoiceConstraint({choices:request.choices,tokenizer:generator.tokenizer,promptLength:inputTokens,eosTokenIds:generator.model.generation_config?.eos_token_id??generator.model.config?.eos_token_id??generator.tokenizer.eos_token_id,library});
 let text='',tokens=0,firstTokenMs=null;const maxNewTokens=constraint?constraint.maxTokens:Math.max(16,Math.min(160,Number(request.maxNewTokens)||LOCAL_MODEL.maxNewTokens));
 const streamer=new library.TextStreamer(generator.tokenizer,{skip_prompt:true,skip_special_tokens:true,token_callback_function:values=>{tokens+=values.length;firstTokenMs??=performance.now()-start;send(id,'progress',{phase:'generate',message:`Generating locally · ${tokens} tokens`,tokens,maxTokens:maxNewTokens,elapsedMs:performance.now()-start});},callback_function:value=>{text+=value;send(id,'token',{text:value,tokens});}});
 const output=await generator(messages,{max_new_tokens:maxNewTokens,do_sample:false,return_full_text:false,streamer,...(constraint?{logits_processor:constraint.processors}:{} )});
 const generated=output?.[0]?.generated_text,answer=Array.isArray(generated)?generated.at(-1)?.content:typeof generated==='string'?generated:text,generationMs=performance.now()-start;
 const selected=String(answer||text).trim();
 if(constraint&&!constraint.choices.includes(selected))throw modelError('MODEL_CHOICE_INVALID','The local model did not finish one of the permitted choices.');
 send(id,'complete',{result:{text:selected,modelId:LOCAL_MODEL.id,modelRevision:LOCAL_MODEL.revision,backend:'wasm',interpretationOnly:true,contextTruncated:truncated,...(constraint?{choiceConstraint:{method:constraint.method,allowed:constraint.choices,selected}}:{}),metrics:{...load,inputTokens,outputTokens:tokens,firstTokenMs,generationMs,tokensPerSecond:tokens/(generationMs/1000)}}});
}
if(typeof self!=='undefined')self.onmessage=async event=>{const {id,type,request}=event.data||{};if(active){send(id,'error',{error:errorDetails(modelError('MODEL_BUSY','Another local model operation is running.'),'busy')});return;}active=true;try{if(type==='download')await downloadPack(id);else if(type==='generate')await generate(id,request||{});else throw modelError('MODEL_REQUEST_INVALID','Unknown local model operation.');}catch(error){send(id,'error',{error:errorDetails(error,type)});}finally{active=false;}};
