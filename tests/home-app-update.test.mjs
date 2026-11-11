import test from 'node:test';
import assert from 'node:assert/strict';
import {checkForAppUpdate,prepareAppLaunch} from '../public/app/app-update.mjs';
import {prepareAppLaunch as releasePageUpdater} from '../lib/app-update.mjs';

const fixture=({version='0.36.2',currentVersion='0.36.1',online=true}={})=>{
 const calls=[],progress=[],serviceWorker={synthetic:true};
 return {calls,progress,serviceWorker,options:{origin:'https://findr.example/app/',currentVersion,online,serviceWorker,
  onProgress:value=>progress.push(value),
  fetchImpl:async(url,options)=>{calls.push({kind:'fetch',url,options});return {ok:true,json:async()=>({version})};},
  prepare:async options=>{calls.push({kind:'prepare',options});return {source:'worker',version:options.expectedVersion,build:'verified-fixture'};}}};
};

test('Home and the release page share the existing verified worker updater',()=>{
 assert.equal(prepareAppLaunch,releasePageUpdater);
});

test('Home reads release metadata outside its worker scope and prepares the exact published version',async()=>{
 const f=fixture(),result=await checkForAppUpdate(f.options);
 assert.equal(f.calls[0].url,'https://findr.example/app-release.json');
 const {signal,...request}=f.calls[0].options;
 assert.deepEqual(request,{cache:'no-store',credentials:'same-origin',redirect:'error'});assert.equal(signal.aborted,false);
 assert.equal(f.calls[1].options.expectedVersion,'0.36.2');
 assert.equal(f.calls[1].options.serviceWorker,f.serviceWorker);
 assert.equal(f.calls[1].options.appPath,'/app/');
 assert.equal(result.status,'ready');assert.equal(result.needsReload,true);
 assert.equal(result.build,'verified-fixture');assert.equal(result.source,'worker');
 assert.deepEqual(f.progress,[{phase:'checking'}]);
});

test('an up-to-date claim still requires a fresh release check and verified worker result',async()=>{
 const f=fixture({currentVersion:'0.36.2'}),result=await checkForAppUpdate(f.options);
 assert.equal(f.calls.length,2);assert.equal(result.status,'current');assert.equal(result.needsReload,false);
 assert.equal(result.version,'0.36.2');
 const failed=fixture({currentVersion:'0.36.2'}),error=Object.assign(Error('Synthetic cache verification failure'),{code:'not_ready'});
 await assert.rejects(checkForAppUpdate({...failed.options,prepare:async()=>{throw error;}}),value=>value===error);
});

test('offline checks cannot request an update or claim the current published version',async()=>{
 const f=fixture({online:false});
 await assert.rejects(checkForAppUpdate(f.options),error=>error.code==='offline');
 assert.equal(f.calls.length,0);assert.deepEqual(f.progress,[]);
});

test('missing, redirected and invalid release metadata leave the worker untouched',async()=>{
 for(const fetchImpl of [async()=>{throw new TypeError('Synthetic network failure');},async()=>({ok:false,status:404}),async()=>({ok:true,json:async()=>{throw new SyntaxError('Synthetic HTML response');}})]){
  const f=fixture();await assert.rejects(checkForAppUpdate({...f.options,fetchImpl}),error=>error.code==='release_unavailable');assert.equal(f.calls.length,0);
 }
 for(const version of [undefined,null,'latest','0.36.2<script>',5,'0.36']){
  const f=fixture();await assert.rejects(checkForAppUpdate({...f.options,fetchImpl:async()=>({ok:true,json:async()=>({version})})}),error=>error.code==='release_invalid');assert.equal(f.calls.length,0);
 }
});

test('an older publication is never installed over a newer running app',async()=>{
 const f=fixture({version:'0.35.0',currentVersion:'0.36.2'});
 await assert.rejects(checkForAppUpdate(f.options),error=>error.code==='release_older');
 assert.equal(f.calls.length,1);
});

test('a worker installation failure stays retryable rather than reporting reload-ready',async()=>{
 const f=fixture(),error=Object.assign(Error('Synthetic interrupted download'),{code:'install_failed'});
 await assert.rejects(checkForAppUpdate({...f.options,prepare:async()=>{throw error;}}),value=>value===error);
 const retry=await checkForAppUpdate(f.options);assert.equal(retry.needsReload,true);
});

test('a stalled release request is aborted and never starts a worker update',async()=>{
 const f=fixture();
 await assert.rejects(checkForAppUpdate({...f.options,releaseTimeoutMs:5,fetchImpl:async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Stopped','AbortError'))))}),error=>error.code==='release_timeout');
 assert.equal(f.calls.length,0);
});
