import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {preMinervaSnapshot} from './helpers/pre-minerva-snapshot.mjs';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root));
const baseline=JSON.parse(read('research/packs-hints-maps-0.23.0/baseline-preservation.json'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const sort=value=>Array.isArray(value)?value.map(sort):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,sort(value[key])])):value;

test('pack, hint and menu expansion preserves original manuals, nine keypad maps and fire source data',()=>{
 assert.equal(baseline.baselineCommit,'e8691d604f07fc882a803892d4c6ca7f8722a869');
 assert.equal(baseline.files.length,23);
 for(const record of baseline.files){
  const bytes=preMinervaSnapshot(record.path,read(record.path));
  assert.equal(bytes.length,record.bytes,record.path);
  assert.equal(sha(bytes),record.sha256,record.path);
 }
});

test('release preparation only changes the version in the existing keypad practice data',()=>{
 const record=baseline.practiceData,data=JSON.parse(read(record.path));
 assert.deepEqual(record.excludeTopLevelKeys,['version']);
 delete data.version;
 assert.equal(sha(JSON.stringify(sort(data))),record.sha256);
});
