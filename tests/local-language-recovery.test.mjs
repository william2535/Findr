import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalLanguageRecovery,LOCAL_LANGUAGE_ATTEMPT_KEY} from '../public/app/local-language-recovery.mjs';

class MemoryStorage{
 constructor(){this.values=new Map();}
 getItem(key){return this.values.get(key)??null;}
 setItem(key,value){this.values.set(key,String(value));}
}
const options=storage=>({getStorage:()=>storage,modelId:'SYNTHETIC/model',revision:'revision-a',runtimeVersion:'runtime-a',now:()=>100});

test('a fresh application instance detects unfinished loading and requires an explicit retry',()=>{
 const storage=new MemoryStorage(),first=createLocalLanguageRecovery(options(storage));
 first.begin('attempt-1');first.progress('attempt-1','load');
 const reopened=createLocalLanguageRecovery(options(storage));
 assert.equal(reopened.snapshot().state,'interrupted');assert.equal(reopened.snapshot().blocked,true);
 assert.match(reopened.snapshot().message,/interrupted while loading/);
 assert.throws(()=>reopened.begin('automatic-retry'),{code:'MODEL_INTERRUPTED'});
 const stillBlocked=createLocalLanguageRecovery(options(storage));
 assert.equal(stillBlocked.snapshot().state,'interrupted','Checking or reopening does not acknowledge the interruption');
 stillBlocked.allowRetry();stillBlocked.begin('explicit-retry');
 assert.equal(stillBlocked.snapshot().state,'running');assert.equal(stillBlocked.snapshot().attemptId,'explicit-retry');
});

test('success settles the checkpoint, records validation time and survives reopening',()=>{
 const storage=new MemoryStorage(),guard=createLocalLanguageRecovery(options(storage));
 guard.begin('success');guard.progress('success','generate');assert.equal(guard.finish('success'),true);
 const reopened=createLocalLanguageRecovery(options(storage));
 assert.equal(reopened.snapshot().blocked,false);assert.equal(reopened.snapshot().state,'idle');assert.equal(reopened.snapshot().validatedAt,100);
 assert.equal(reopened.snapshot().attemptId,null);assert.equal(reopened.snapshot().phase,null);
});

test('handled cancellation is not recorded as a device failure',()=>{
 const storage=new MemoryStorage(),guard=createLocalLanguageRecovery(options(storage));
 guard.begin('cancelled');guard.progress('cancelled','load');guard.finish('cancelled',{outcome:'cancelled'});
 const reopened=createLocalLanguageRecovery(options(storage));
 assert.equal(reopened.snapshot().blocked,false);assert.equal(reopened.snapshot().validatedAt,null);
 reopened.begin('next');assert.equal(reopened.snapshot().state,'running');
});

test('caught runtime failure stays blocked across reload until explicit acknowledgement',()=>{
 const storage=new MemoryStorage(),guard=createLocalLanguageRecovery(options(storage));
 guard.begin('failed');guard.progress('failed','load');guard.finish('failed',{outcome:'failed',code:'MODEL_MEMORY_LIMIT'});
 const reopened=createLocalLanguageRecovery(options(storage));
 assert.equal(reopened.snapshot().state,'failed');assert.equal(reopened.snapshot().code,'MODEL_MEMORY_LIMIT');
 assert.throws(()=>reopened.begin('automatic-retry'),{code:'MODEL_MEMORY_LIMIT'});
 reopened.allowRetry();assert.equal(reopened.snapshot().blocked,false);
});

test('late completions and progress cannot replace a newer attempt in the same instance',()=>{
 const storage=new MemoryStorage(),guard=createLocalLanguageRecovery(options(storage));
 guard.begin('old');guard.finish('old',{outcome:'cancelled'});guard.begin('new');
 const checkpoint=storage.getItem(LOCAL_LANGUAGE_ATTEMPT_KEY);
 assert.equal(guard.finish('old'),false);assert.equal(guard.progress('old','generate'),false);
 assert.equal(storage.getItem(LOCAL_LANGUAGE_ATTEMPT_KEY),checkpoint);
 assert.throws(()=>guard.allowRetry(),{code:'MODEL_BUSY'});assert.throws(()=>guard.begin('third'),{code:'MODEL_BUSY'});
 assert.equal(guard.snapshot().attemptId,'new');
});

test('tab-scoped storage does not classify another live tab as an interrupted model',()=>{
 const firstStorage=new MemoryStorage(),secondStorage=new MemoryStorage();
 const first=createLocalLanguageRecovery(options(firstStorage));first.begin('tab-one');first.progress('tab-one','load');
 const second=createLocalLanguageRecovery(options(secondStorage));
 assert.equal(second.snapshot().blocked,false);second.begin('tab-two');
 assert.equal(first.snapshot().state,'running');assert.equal(first.snapshot().attemptId,'tab-one');
 assert.equal(second.snapshot().attemptId,'tab-two');
});

test('lost or rejected checkpoint writes prevent model startup',()=>{
 for(const storage of [{getItem(){return null;},setItem(){}},{getItem(){return null;},setItem(){throw new DOMException('SYNTHETIC storage full','QuotaExceededError');}}]){
  const guard=createLocalLanguageRecovery(options(storage));
  assert.throws(()=>guard.begin('unsafe-start'),{code:'MODEL_RECOVERY_UNAVAILABLE'});
  assert.equal(guard.snapshot().blocked,true);assert.equal(guard.snapshot().state,'storage-unavailable');
 }
});

test('a malformed checkpoint stays blocked but can be explicitly reset when storage is writable',()=>{
 const storage=new MemoryStorage();storage.setItem(LOCAL_LANGUAGE_ATTEMPT_KEY,'{SYNTHETIC truncated checkpoint');
 const guard=createLocalLanguageRecovery(options(storage));
 assert.equal(guard.snapshot().state,'failed');assert.equal(guard.snapshot().blocked,true);assert.equal(guard.snapshot().code,'MODEL_RECOVERY_INVALID');
 assert.throws(()=>guard.begin('automatic-retry'),{code:'MODEL_RECOVERY_INVALID'});
 guard.allowRetry();assert.equal(guard.snapshot().blocked,false);guard.begin('explicit-retry');
 assert.equal(guard.snapshot().state,'running');assert.equal(guard.snapshot().attemptId,'explicit-retry');
 assert.equal(JSON.parse(storage.getItem(LOCAL_LANGUAGE_ATTEMPT_KEY)).state,'running');
});

test('checkpoint contains only lifecycle metadata and keeps the phase from an interrupted reply',()=>{
 const storage=new MemoryStorage(),guard=createLocalLanguageRecovery(options(storage));
 guard.begin('attempt-metadata');guard.progress('attempt-metadata','generate');
 const record=JSON.parse(storage.getItem(LOCAL_LANGUAGE_ATTEMPT_KEY));
 assert.deepEqual(Object.keys(record).sort(),['attemptId','identity','phase','runtimeVersion','schema','startedAt','state','updatedAt','validatedAt'].sort());
 assert.match(createLocalLanguageRecovery(options(storage)).snapshot().message,/preparing the reply/);
});

test('changing runtime version does not silently reset an unfinished attempt for the same model',()=>{
 const storage=new MemoryStorage(),guard=createLocalLanguageRecovery(options(storage));guard.begin('old-runtime');
 const upgraded=createLocalLanguageRecovery({...options(storage),runtimeVersion:'runtime-b'});
 assert.equal(upgraded.snapshot().blocked,true);assert.equal(upgraded.snapshot().attemptId,'old-runtime');
 upgraded.allowRetry();upgraded.begin('new-runtime');
 assert.equal(JSON.parse(storage.getItem(LOCAL_LANGUAGE_ATTEMPT_KEY)).runtimeVersion,'runtime-b');
});
