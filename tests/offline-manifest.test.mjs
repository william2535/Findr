import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

test('each offline asset has its exact byte hash for safe migration and installation',()=>{
  const context={self:{}};
  vm.runInNewContext(readFileSync(new URL('../public/app/precache.js',import.meta.url),'utf8'),context);
  const {__PRECACHE:paths,__ASSET_SHA256:hashes}=context.self;
  assert.ok(hashes,'Offline manifest requires content hashes');
  assert.deepEqual(Object.keys(hashes),Array.from(paths));
  for(const path of paths){
    assert.match(hashes[path],/^[a-f0-9]{64}$/);
    const bytes=readFileSync(new URL('../public/app/'+path.slice(2),import.meta.url));
    assert.equal(hashes[path],createHash('sha256').update(bytes).digest('hex'),path);
  }
});
