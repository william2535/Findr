import {openDB} from './db.mjs';

export const QUICK_QUESTIONS_KEY='quick-questions-v1';
const clone=value=>structuredClone(value);
export function normalizeQuickStore(value){
  if(value===undefined||value===null)return {schemaVersion:1,activeId:null,conversations:[]};
  if(value.schemaVersion!==1||!Array.isArray(value.conversations)||value.conversations.some(c=>!c||typeof c.id!=='string'||!Array.isArray(c.messages)))throw Object.assign(Error('Saved question histories could not be read. Existing records have not been changed.'),{code:'QUESTIONS_STORAGE_INVALID'});
  return clone(value);
}
export function mergeQuickConversation(store,conversation,{activate=true}={}){
  const next=normalizeQuickStore(store);
  if(!conversation||typeof conversation.id!=='string'||!Array.isArray(conversation.messages))throw Error('A question conversation needs an ID and transcript before saving.');
  next.conversations=[clone(conversation),...next.conversations.filter(c=>c.id!==conversation.id)].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  if(activate)next.activeId=conversation.id;
  return next;
}
export function createQuickQuestionsStore(open=openDB){
  async function load(){const db=await open();return new Promise((resolve,reject)=>{const transaction=db.transaction(['settings'],'readonly'),request=transaction.objectStore('settings').get(QUICK_QUESTIONS_KEY);request.onsuccess=()=>{try{resolve(normalizeQuickStore(request.result));}catch(error){reject(error);}};request.onerror=()=>reject(request.error);transaction.onabort=()=>reject(transaction.error||Error('Question storage is unavailable.'));});}
  async function save(conversation,options={}){const snapshot=clone(conversation),db=await open();return new Promise((resolve,reject)=>{const transaction=db.transaction(['settings'],'readwrite'),settings=transaction.objectStore('settings');let result,failure;transaction.oncomplete=()=>resolve(result);transaction.onabort=transaction.onerror=()=>reject(failure||transaction.error||Error('The question history could not be saved.'));const request=settings.get(QUICK_QUESTIONS_KEY);request.onsuccess=()=>{try{result=mergeQuickConversation(request.result,snapshot,options);settings.put(result,QUICK_QUESTIONS_KEY);}catch(error){failure=error;transaction.abort();}};});}
  return {load,save};
}
const store=createQuickQuestionsStore();
export const loadQuickQuestions=store.load;
export const saveQuickConversation=store.save;
