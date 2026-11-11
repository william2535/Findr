// Conversation preferences contain consent metadata, never provider credentials.
import {ONLINE_PROVIDER} from './online-language-policy.mjs';
export function helperMode(conversation={}){
 return ['offline','online','manual'].includes(conversation.aiMode)?conversation.aiMode:conversation.manualOnly?'manual':'offline';
}
export function validOnlineConsent(consent){
 return consent?.provider===ONLINE_PROVIDER.id&&consent?.modelId===ONLINE_PROVIDER.modelId&&consent?.version===ONLINE_PROVIDER.consentVersion&&consent?.freePlanConfirmed===true&&Number.isFinite(consent?.acceptedAt)&&consent.acceptedAt>0;
}
export function withHelperMode(conversation,mode,consent){
 if(!['offline','online','manual'].includes(mode))throw Error('Choose Offline AI, Online AI or Manual search.');
 if(mode==='online'&&!validOnlineConsent(consent))throw Object.assign(Error('Review and accept the online sharing details for this conversation first.'),{code:'ONLINE_CONSENT_REQUIRED'});
 const next={...conversation,aiMode:mode,manualOnly:mode==='manual'};
 if(mode==='online')next.onlineConsent={provider:consent.provider,modelId:consent.modelId,version:consent.version,freePlanConfirmed:true,acceptedAt:consent.acceptedAt};else delete next.onlineConsent;
 return next;
}
export function resetImportedOnlineConsent(conversation){
 const next={...conversation};delete next.onlineConsent;
 if(next.aiMode==='online'){next.aiMode='offline';next.manualOnly=false;}
 return next;
}
