import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {releaseRequestResponse,EXTERNAL_RELEASES,ARCHIVED_RELEASE_FILES,DEPLOYED_RELEASE_FILES} from '../lib/release-downloads.mjs';

const origin='https://findr.example';
const request=(path,method='GET')=>new Request(origin+path,{method});

test('worker release dispatch handles exact external GET/HEAD before public-file routing',async()=>{
  for(const release of EXTERNAL_RELEASES)for(const method of ['GET','HEAD']){
    const response=releaseRequestResponse(request('/releases/'+release.apkFile,method));
    assert.equal(response.status,307);assert.equal(response.headers.get('location'),release.url);assert.equal(await response.text(),'');
    assert.equal(response.headers.get('cache-control'),'no-store');
  }
});

test('worker dispatch preserves archive GET/HEAD and leaves static checksums and prior APK to assets',async()=>{
  for(const file of ARCHIVED_RELEASE_FILES){
    const get=releaseRequestResponse(request('/releases/'+file));assert.equal(get.status,410);assert.match(await get.text(),/is archived/);
    const head=releaseRequestResponse(request('/releases/'+file,'HEAD'));assert.equal(head.status,410);assert.equal(await head.text(),'');
  }
  for(const file of DEPLOYED_RELEASE_FILES)assert.equal(releaseRequestResponse(request('/releases/'+file)),null);
});

test('unknown paths, encoded aliases and other methods do not acquire release privileges',()=>{
  const file=EXTERNAL_RELEASES[0].apkFile;
  for(const path of ['/','/app/','/releases/unknown.apk','/releases/'+file+'/', '/releases/'+file.replace('FINDR','%46INDR'), '/releases//'+file,'/api/'+file])assert.equal(releaseRequestResponse(request(path)),null,path);
  for(const method of ['POST','PUT','DELETE','OPTIONS'])assert.equal(releaseRequestResponse(request('/releases/'+file,method)),null,method);
  assert.equal(releaseRequestResponse({url:'not a URL',method:'GET'}),null);
  const response=releaseRequestResponse(request('/releases/'+file+'?target=https://untrusted.invalid/evil.apk'));
  assert.equal(response.headers.get('location'),EXTERNAL_RELEASES[0].url,'A query cannot change the exact pinned destination');
});

test('actual Worker entry bypasses a Vinext public-manifest 404 for excluded release assets',async()=>{
  // Execute the authored Worker entry, stubbing only framework/context bindings.
  // The framework stub represents the observed compiled publicFiles 404.
  let source=readFileSync(new URL('../worker/index.ts',import.meta.url),'utf8');
  source=source.replace('import handler from "vinext/server/fetch-handler";', 'const handler={fetch:()=>new Response("Vinext public-file lookup returned 404",{status:404})};');
  source=source.replace('import { runWithConnectorBinding } from "../lib/connector-context";', 'const runWithConnectorBinding=(_binding,callback)=>callback();');
  source=source.replace('"../lib/release-downloads.mjs"',JSON.stringify(new URL('../lib/release-downloads.mjs',import.meta.url).href));
  source=source.replaceAll('import.meta.env.DEV','false');
  const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
  const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
  for(const method of ['GET','HEAD']){
    const response=await worker.fetch(request('/releases/'+EXTERNAL_RELEASES[0].apkFile,method),{},{props:{}});
    assert.equal(response.status,307);assert.equal(response.headers.get('location'),EXTERNAL_RELEASES[0].url);
    const archive=await worker.fetch(request('/releases/'+ARCHIVED_RELEASE_FILES[0],method),{},{props:{}});assert.equal(archive.status,410);
  }
  const fallback=await worker.fetch(request('/releases/not-a-known-release.apk'),{},{props:{}});assert.equal(fallback.status,404);assert.match(await fallback.text(),/Vinext/);
});
