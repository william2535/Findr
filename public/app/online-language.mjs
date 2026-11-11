// Explicit, per-user online inference. Credentials exist only in this module's
// memory; they never enter a job record, storage, a URL or an error message.
import {nativeOnlineFetch} from './native-platform.mjs';
import {validOnlineConsent} from './helper-mode.mjs';
import {normalizeAllowance} from './online-usage.mjs';
import {getOnlineProvider} from './online-language-policy.mjs';

const ENDPOINT='/api/assistant/online';
const MAX_BODY_BYTES=64*1024,MAX_RESPONSE_BYTES=64*1024;
const MESSAGES={
 ONLINE_CONSENT_REQUIRED:'Choose Online AI and confirm what will be sent before using it.',
 ONLINE_KEY_REQUIRED:'Enter your selected provider’s API key in Online AI setup. Your question is still saved.',
 ONLINE_PROVIDER_INVALID:'Choose a supported online provider in Online AI setup.',
 ONLINE_KEY_INVALID:'That API key has an invalid format. Check it in your provider account and try again.',
 ONLINE_OFFLINE:'There is no connection. Your question and saved manuals are still here. Retry online, or choose Manual search.',
 ONLINE_UNSUPPORTED:'This browser cannot send an online AI request. Saved manuals and conversations remain available.',
 ONLINE_REQUEST_INVALID:'This request cannot be sent to online AI. Your complete question is still saved.',
 ONLINE_PAYLOAD_TOO_LARGE:'This question and its selected context exceed the online request limit. Split the request; the original is still saved.',
 ONLINE_TIMEOUT:'Online AI took too long. Your question is still saved. Retry when ready, or choose Manual search.',
 ONLINE_NETWORK_ERROR:'The online service could not be reached. Your question is still saved. Check your connection and retry.',
 ONLINE_RATE_LIMIT:'The provider allowance or rate limit has been reached. Wait before retrying, or use Manual search. No paid fallback was started.',
 ONLINE_PROVIDER_AUTH:'The selected provider did not accept that API key. Check the key and your account in Online AI setup.',
 ONLINE_BILLING_REQUIRED:'The selected provider requires an account or billing change for this request. Check its console or use Manual search. FINDR did not enable paid billing or a paid fallback.',
 ONLINE_PROVIDER_UNAVAILABLE:'The online provider is unavailable. Your question is still saved. Retry later or use Manual search.',
 ONLINE_CONFIGURATION_ERROR:'Online AI is not configured correctly on this FINDR site. Saved manuals and conversations remain available.',
 ONLINE_RESPONSE_INVALID:'The online service returned a reply FINDR could not verify. No unverified reply was accepted.',
};
const fail=(code,stage)=>Object.assign(new Error(MESSAGES[code]||MESSAGES.ONLINE_RESPONSE_INVALID),{code,stage});
const cancelled=()=>new DOMException('Online AI stopped. Your question and saved conversation are still here.','AbortError');
const safeProgress=(fn,value)=>{try{fn?.(value);}catch{/* Rendering cannot change request ownership. */}};
const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);

export function hasOnlineConsent(consent){
 return validOnlineConsent(consent);
}
function requestBody({messages,choices,outputFormat,maxNewTokens},provider){
 if(!Array.isArray(messages)||!messages.length||messages.length>20||messages.some(row=>!isObject(row)||!['system','user','assistant'].includes(row.role)||typeof row.content!=='string'))throw fail('ONLINE_REQUEST_INVALID','request');
 const payload={allowOnline:true,providerId:provider.id,consentVersion:provider.consentVersion,messages:messages.map(({role,content})=>({role,content}))};
 if(choices!==undefined){
  if(outputFormat!==undefined||!Array.isArray(choices)||!choices.length||choices.length>32||choices.some(value=>typeof value!=='string'||!value.trim()||value.length>64||/[\x00-\x1f\x7f]/.test(value)))throw fail('ONLINE_REQUEST_INVALID','request');
  payload.choices=[...new Set(choices)];
 }
 if(outputFormat!==undefined){if(outputFormat!=='tasks')throw fail('ONLINE_REQUEST_INVALID','request');payload.outputFormat=outputFormat;}
 if(maxNewTokens!==undefined){if(!Number.isInteger(maxNewTokens)||maxNewTokens<1||maxNewTokens>1024)throw fail('ONLINE_REQUEST_INVALID','request');payload.maxNewTokens=maxNewTokens;}
 const body=JSON.stringify(payload);if(new TextEncoder().encode(body).byteLength>MAX_BODY_BYTES)throw fail('ONLINE_PAYLOAD_TOO_LARGE','request');return {body,payload};
}
function serverFailure(response,payload){
 const supplied=payload?.error?.code;
 const codes={
  ONLINE_KEY_REQUIRED:'ONLINE_KEY_REQUIRED',ONLINE_AUTH_FAILED:'ONLINE_PROVIDER_AUTH',ONLINE_BILLING_REQUIRED:'ONLINE_BILLING_REQUIRED',ONLINE_RATE_LIMITED:'ONLINE_RATE_LIMIT',
  ONLINE_INVALID_REQUEST:'ONLINE_REQUEST_INVALID',ONLINE_ORIGIN_REJECTED:'ONLINE_CONFIGURATION_ERROR',ONLINE_PROVIDER_REJECTED:'ONLINE_PROVIDER_UNAVAILABLE',ONLINE_INVALID_RESPONSE:'ONLINE_RESPONSE_INVALID',
  ONLINE_KEY_INVALID:'ONLINE_PROVIDER_AUTH',ONLINE_AUTH_REQUIRED:'ONLINE_PROVIDER_AUTH',ONLINE_ACCESS_DENIED:'ONLINE_PROVIDER_AUTH',
  ONLINE_PROVIDER_AUTH:'ONLINE_PROVIDER_AUTH',ONLINE_RATE_LIMIT:'ONLINE_RATE_LIMIT',ONLINE_QUOTA_EXCEEDED:'ONLINE_RATE_LIMIT',
  ONLINE_PROVIDER_TIMEOUT:'ONLINE_TIMEOUT',ONLINE_TIMEOUT:'ONLINE_TIMEOUT',ONLINE_REQUEST_TOO_LARGE:'ONLINE_PAYLOAD_TOO_LARGE',
  ONLINE_PAYLOAD_TOO_LARGE:'ONLINE_PAYLOAD_TOO_LARGE',ONLINE_REQUEST_INVALID:'ONLINE_REQUEST_INVALID',ONLINE_CONSENT_REQUIRED:'ONLINE_CONSENT_REQUIRED',
  ONLINE_PROVIDER_UNAVAILABLE:'ONLINE_PROVIDER_UNAVAILABLE',ONLINE_PROVIDER_ERROR:'ONLINE_PROVIDER_UNAVAILABLE',
  ONLINE_NOT_CONFIGURED:'ONLINE_CONFIGURATION_ERROR',ONLINE_CONFIGURATION_ERROR:'ONLINE_CONFIGURATION_ERROR',ONLINE_RESPONSE_INVALID:'ONLINE_RESPONSE_INVALID',
 };
 if(supplied==='ONLINE_CANCELLED')return cancelled();
 return fail((typeof supplied==='string'&&Object.hasOwn(codes,supplied)?codes[supplied]:null)||([401,403].includes(response.status)?'ONLINE_PROVIDER_AUTH':response.status===429?'ONLINE_RATE_LIMIT':response.status===404?'ONLINE_CONFIGURATION_ERROR':response.status===413?'ONLINE_PAYLOAD_TOO_LARGE':response.status===408||response.status===504?'ONLINE_TIMEOUT':response.status>=500?'ONLINE_PROVIDER_UNAVAILABLE':'ONLINE_REQUEST_INVALID'),'response');
}
function verifiedReply(value,payload,elapsedMs,provider){
 if(!isObject(value)||typeof value.text!=='string'||!value.text.trim()||value.text.length>16000||value.modelId!==provider.modelId||value.provider!==provider.name||value.backend!=='online')throw fail('ONLINE_RESPONSE_INVALID','response');
 if(payload.choices&&!payload.choices.includes(value.text))throw fail('ONLINE_RESPONSE_INVALID','response');
 if(!payload.choices){let parsed;try{parsed=JSON.parse(value.text);}catch{throw fail('ONLINE_RESPONSE_INVALID','response');}if(!isObject(parsed)||payload.outputFormat==='tasks'&&!Array.isArray(parsed.tasks))throw fail('ONLINE_RESPONSE_INVALID','response');}
 const metrics={elapsedMs};for(const key of ['inputTokens','outputTokens','totalTokens','durationMs','generationMs']){const number=value.metrics?.[key];if(Number.isFinite(number)&&number>=0)metrics[key]=number;}
 return {text:value.text,modelId:provider.modelId,provider:provider.name,providerId:provider.id,backend:'online',metrics};
}

/** Injectable transport for tests; production always uses a fixed same-origin URL. */
export function createOnlineLanguage({fetchImpl=nativeOnlineFetch,getOnline=()=>globalThis.navigator?.onLine!==false,getOrigin=()=>globalThis.location?.origin,timeoutMs=50000,now=()=>performance.now(),wallNow=()=>Date.now(),supported=()=>typeof globalThis.fetch==='function'&&typeof AbortController==='function'}={}){
 const sessions=new Map(),usageListeners=new Set();let usageProviderId='groq';
 const sessionFor=(providerId='groq')=>{const provider=getOnlineProvider(providerId);if(!provider)throw fail('ONLINE_PROVIDER_INVALID','setup');if(!sessions.has(providerId))sessions.set(providerId,{key:'',generation:0,allowance:null,active:new Set()});return {provider,session:sessions.get(providerId)};};
 const getOnlineUsage=(providerId=usageProviderId)=>{const {provider,session}=sessionFor(providerId);return {providerId:provider.id,providerName:provider.name,hasKey:!!session.key,allowance:session.allowance?structuredClone(session.allowance):null};};
 const notifyUsage=()=>{for(const listener of usageListeners){try{listener(getOnlineUsage());}catch{}}};
 const subscribeOnlineUsage=listener=>{usageListeners.add(listener);return ()=>usageListeners.delete(listener);};
 const selectOnlineUsageProvider=providerId=>{sessionFor(providerId);usageProviderId=providerId;notifyUsage();};
 const online=()=>{try{return getOnline()!==false;}catch{return false;}};
 function getOnlineReadiness(providerId='groq'){
  const {provider,session}=sessionFor(providerId),connected=online(),hasKey=!!session.key,capable=supported();
  return {mode:'online',provider:provider.name,providerId:provider.id,modelId:provider.modelId,consentVersion:provider.consentVersion,hasKey,available:capable&&connected&&hasKey,configured:true,requiresKey:true,online:connected,reason:!hasKey?'key-required':!connected?'offline':null,supported:capable,canGenerate:capable&&connected&&hasKey,model:{id:provider.modelId,provider:provider.name,backend:'online',dialogueVersion:1,dialogueFormat:'json'}};
 }
 function stop(session){session.generation++;for(const operation of [...session.active])operation.cancel(cancelled());}
 function setOnlineKey(value,providerId='groq'){
  const {session}=sessionFor(providerId);
  if(typeof value!=='string'||value.length<20||value.length>512||!/^[\x21-\x7e]+$/.test(value))throw fail('ONLINE_KEY_INVALID','setup');
  if(providerId==='openai'&&value.startsWith('gsk_')||providerId==='groq'&&value.startsWith('sk-'))throw fail('ONLINE_KEY_INVALID','setup');
  stop(session);session.key=value;session.allowance=null;usageProviderId=providerId;notifyUsage();return getOnlineReadiness(providerId);
 }
 function clearOnlineKey(providerId='groq'){const {session}=sessionFor(providerId);session.key='';stop(session);session.allowance=null;notifyUsage();return getOnlineReadiness(providerId);}
 async function generateOnlineReply({messages=[],choices,outputFormat,maxNewTokens,signal,onProgress,consent}={}){
  if(signal?.aborted)throw cancelled();
  if(!hasOnlineConsent(consent))throw fail('ONLINE_CONSENT_REQUIRED','request');
  const {provider,session}=sessionFor(consent.provider),state=getOnlineReadiness(provider.id);if(usageProviderId!==provider.id){usageProviderId=provider.id;notifyUsage();}if(!state.supported)throw fail('ONLINE_UNSUPPORTED','request');if(!state.hasKey)throw fail('ONLINE_KEY_REQUIRED','request');if(!state.online)throw fail('ONLINE_OFFLINE','request');
  const {body,payload}=requestBody({messages,choices,outputFormat,maxNewTokens},provider),revision=session.generation,controller=new AbortController(),started=now();
  let timeout,reader=null,ended=false,stopError,rejectStopped;
  const stopped=new Promise((_,reject)=>{rejectStopped=reject;});stopped.catch(()=>{});
  const operation={cancel(error){if(ended||stopError)return;stopError=error;controller.abort();try{reader?.cancel()?.catch(()=>{});}catch{}rejectStopped(error);}};
  const abort=()=>operation.cancel(cancelled()),check=()=>{if(stopError)throw stopError;if(signal?.aborted||revision!==session.generation||!session.key)throw cancelled();};
  const race=work=>Promise.race([Promise.resolve(work),stopped]);
  session.active.add(operation);signal?.addEventListener('abort',abort,{once:true});
  timeout=setTimeout(()=>operation.cancel(fail('ONLINE_TIMEOUT','request')),Math.min(50000,Math.max(1,Number(timeoutMs)||50000)));
  try{
   check();safeProgress(onProgress,{phase:'online',message:'Sending the selected context to '+provider.name+'…',provider:provider.name});check();
   const response=await race(fetchImpl(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','X-FINDR-Provider-Key':session.key},body,credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal}));check();
   if(!response||typeof response.status!=='number'||response.redirected)throw fail('ONLINE_RESPONSE_INVALID','response');
   if(response.url){let address;try{address=new URL(response.url);}catch{throw fail('ONLINE_RESPONSE_INVALID','response');}if(getOrigin()&&address.origin!==getOrigin())throw fail('ONLINE_RESPONSE_INVALID','response');}
   if(!/^application\/json(?:\s*;|\s*$)/i.test(response.headers?.get('content-type')||''))throw response.ok?fail('ONLINE_RESPONSE_INVALID','response'):serverFailure(response,{});
   if(Number(response.headers.get('content-length')||0)>MAX_RESPONSE_BYTES||!response.body?.getReader)throw fail('ONLINE_RESPONSE_INVALID','response');
   reader=response.body.getReader();const decoder=new TextDecoder('utf-8',{fatal:true});let text='',bytes=0;
   while(true){const part=await race(reader.read());check();if(part.done)break;if(!(part.value instanceof Uint8Array))throw fail('ONLINE_RESPONSE_INVALID','response');bytes+=part.value.byteLength;if(bytes>MAX_RESPONSE_BYTES)throw fail('ONLINE_RESPONSE_INVALID','response');try{text+=decoder.decode(part.value,{stream:true});}catch{throw fail('ONLINE_RESPONSE_INVALID','response');}}
   try{text+=decoder.decode();}catch{throw fail('ONLINE_RESPONSE_INVALID','response');}let value;try{value=JSON.parse(text);}catch{throw fail('ONLINE_RESPONSE_INVALID','response');}
   check();const reported=normalizeAllowance(value?.allowance,wallNow(),provider.id);if(reported&&(!session.allowance||reported.observedAt>=session.allowance.observedAt)){session.allowance=reported;notifyUsage();}
   if(!response.ok)throw serverFailure(response,value);
   check();const result=verifiedReply(value,payload,now()-started,provider);safeProgress(onProgress,{phase:'online-complete',message:'Online reply received. Checking it against this job’s evidence…',provider:provider.name,elapsedMs:result.metrics.elapsedMs});check();return result;
  }catch(error){if(stopError)throw stopError;if(error?.name==='AbortError'||signal?.aborted||revision!==session.generation)throw cancelled();if(typeof error?.code==='string'&&Object.hasOwn(MESSAGES,error.code))throw fail(error.code,['request','response','setup'].includes(error.stage)?error.stage:'request');throw fail(online()?'ONLINE_NETWORK_ERROR':'ONLINE_OFFLINE','request');}
  finally{ended=true;controller.abort();clearTimeout(timeout);signal?.removeEventListener('abort',abort);session.active.delete(operation);try{reader?.cancel()?.catch(()=>{});}catch{}try{reader?.releaseLock();}catch{}}
 }
 return {setOnlineKey,clearOnlineKey,getOnlineReadiness,generateOnlineReply,getOnlineUsage,subscribeOnlineUsage,selectOnlineUsageProvider};
}
const onlineLanguage=createOnlineLanguage();
export const setOnlineKey=onlineLanguage.setOnlineKey;
export const clearOnlineKey=onlineLanguage.clearOnlineKey;
export const getOnlineReadiness=onlineLanguage.getOnlineReadiness;
export const generateOnlineReply=onlineLanguage.generateOnlineReply;

export const getOnlineUsage=onlineLanguage.getOnlineUsage;
export const subscribeOnlineUsage=onlineLanguage.subscribeOnlineUsage;

export const selectOnlineUsageProvider=onlineLanguage.selectOnlineUsageProvider;
