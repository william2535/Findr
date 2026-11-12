import test from 'node:test';
import assert from 'node:assert/strict';
import {createAPIAddressing,FINDR_SERVER_ORIGIN} from '../public/app/deployment.mjs';
import {checkForAppUpdate} from '../public/app/app-update.mjs';

test('Pages uses only the reviewed relay without cookies; source and APK retain same-origin routes',()=>{
  const source=createAPIAddressing(''),pages=createAPIAddressing(FINDR_SERVER_ORIGIN);
  assert.equal(source.endpoint('/api/manual/advanced-mxpro5'),'/api/manual/advanced-mxpro5');
  assert.equal(source.credentials,'same-origin');
  assert.equal(source.responseOrigin('https://appassets.androidplatform.net'),'https://appassets.androidplatform.net');
  assert.equal(pages.endpoint('/api/assistant/online'),FINDR_SERVER_ORIGIN+'/api/assistant/online');
  assert.equal(pages.responseOrigin('https://william2535.github.io'),FINDR_SERVER_ORIGIN);
  assert.equal(pages.credentials,'omit');
  assert.throws(()=>createAPIAddressing('https://unrelated.invalid'));
  for(const path of ['https://unrelated.invalid/api/manual/a','//unrelated.invalid/api/manual/a','/api/arbitrary','/api/manual/a?url=external','/api/assistant/online/other']) assert.throws(()=>pages.endpoint(path));
});

test('Pages checks its own release metadata and updates only its nested worker',async()=>{
  let requested,prepared;
  const result=await checkForAppUpdate({origin:'https://william2535.github.io',releaseBaseURL:'https://william2535.github.io/Findr/',appPath:'/Findr/app/',currentVersion:'0.39.3',online:true,
    fetchImpl:async(url,options)=>{requested={url,options};return Response.json({version:'0.40.0'});},
    prepare:async options=>{prepared=options;return {source:'cache'};},
  });
  assert.equal(requested.url,'https://william2535.github.io/Findr/app-release.json');
  assert.equal(requested.options.cache,'no-store');
  assert.equal(prepared.origin,'https://william2535.github.io');
  assert.equal(prepared.appPath,'/Findr/app/');
  assert.equal(prepared.expectedVersion,'0.40.0');
  assert.equal(result.needsReload,true);
});

test('update metadata cannot switch the current installation to another host',async()=>{
  let fetched=false;
  await assert.rejects(checkForAppUpdate({origin:'https://william2535.github.io',releaseBaseURL:FINDR_SERVER_ORIGIN+'/',online:true,fetchImpl:async()=>{fetched=true;}}),{code:'scope_mismatch'});
  assert.equal(fetched,false);
});

test('nested static previews resolve updates on their own host, not the published hostname',async()=>{
  let requested;
  await checkForAppUpdate({origin:'http://127.0.0.1:4174',appPath:'/Findr/app/',currentVersion:'0.40.0',online:true,
    fetchImpl:async url=>{requested=url;return Response.json({version:'0.40.0'});},prepare:async()=>({source:'network'})});
  assert.equal(requested,'http://127.0.0.1:4174/Findr/app-release.json');
});
