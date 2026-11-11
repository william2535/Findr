// Groq's response headers report RPD and TPM, not all four account limits.
// https://console.groq.com/docs/rate-limits — checked 2026-11-11.
const MAX_DELAY=7*86400000;
const count=value=>typeof value==='string'&&/^\d+$/.test(value)&&Number.isSafeInteger(Number(value))?Number(value):null;
const number=value=>Number.isSafeInteger(value)&&value>=0?value:null;
export function parseResetDuration(value){
 if(typeof value!=='string'||!value||value.length>80)return null;
 const units={d:86400000,h:3600000,m:60000,s:1000,ms:1},parts=[...value.matchAll(/(\d+(?:\.\d+)?)(ms|d|h|m|s)/g)];
 if(parts.map(p=>p[0]).join('')!==value||!parts.length||new Set(parts.map(p=>p[2])).size!==parts.length)return null;
 const ms=parts.reduce((n,p)=>n+Number(p[1])*units[p[2]],0);return Number.isFinite(ms)&&ms<=MAX_DELAY?Math.ceil(ms):null;
}
export function readProviderAllowance(headers,observedAt=Date.now()){
 const bucket=kind=>{const limit=count(headers.get('x-ratelimit-limit-'+kind)),remaining=count(headers.get('x-ratelimit-remaining-'+kind));return {limit,remaining:remaining!==null&&limit!==null&&remaining>limit?null:remaining,resetAfterMs:parseResetDuration(headers.get('x-ratelimit-reset-'+kind))};};
 const requests=bucket('requests'),tokens=bucket('tokens'),raw=headers.get('retry-after');
 const retry=raw&&/^\d+(?:\.\d+)?$/.test(raw)?Math.ceil(Number(raw)*1000):raw?Date.parse(raw)-observedAt:null;
 const retryAfterMs=Number.isFinite(retry)&&retry>=0&&retry<=MAX_DELAY?retry:null;
 if(![...Object.values(requests),...Object.values(tokens),retryAfterMs].some(x=>x!==null))return null;
 return {observedAt,requests,tokens,retryAfterMs};
}
// Projection prevents arbitrary provider values entering markup or saved jobs.
export function normalizeAllowance(value,receivedAt=Date.now()){
 if(!value||!Number.isFinite(value.observedAt)||value.observedAt<=0)return null;
 const delay=v=>Number.isFinite(v)&&v>=0&&v<=MAX_DELAY?v:null;
 const bucket=raw=>{const limit=number(raw?.limit),remaining=number(raw?.remaining),ms=delay(raw?.resetAfterMs);return {limit,remaining:remaining!==null&&limit!==null&&remaining>limit?null:remaining,resetAt:ms===null?null:receivedAt+ms};};
 const requests=bucket(value.requests),tokens=bucket(value.tokens),retry=delay(value.retryAfterMs);
 if(![...Object.values(requests),...Object.values(tokens),retry].some(x=>x!==null))return null;
 return {observedAt:value.observedAt,receivedAt,requests,tokens,retryAt:retry===null?null:receivedAt+retry};
}
export function resetCountdown(resetAt,now=Date.now()){
 if(!Number.isFinite(resetAt))return 'Reset time not reported';
 const seconds=Math.ceil((resetAt-now)/1000);if(seconds<=0)return 'Reset due · awaiting next reply';
 const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;
 return 'Resets in '+(h?`${h}h ${m}m`:m?`${m}m ${s}s`:`${s}s`);
}
