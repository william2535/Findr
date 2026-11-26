import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {preMinervaSnapshot} from './helpers/pre-minerva-snapshot.mjs';

const root=new URL('../',import.meta.url);
const path='public/app/data/device-documents.json';
const read=name=>readFileSync(new URL(name,root));
const review=JSON.parse(read('tests/fixtures/preservation/paxton-95ac61a-additions.json'));
const baseline=JSON.parse(read('research/wiring-0.22.0/baseline-data-hashes.json')).files.find(item=>item.path===path);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const bytes=data=>Buffer.from(JSON.stringify(data,null,2)+'\n');

test('reviewed Paxton additions project to the unchanged historical snapshot',()=>{
 assert.equal(review.sourceCommit,'95ac61a58420bcf77a36405f9c9365d954e7a1b0');
 assert.equal(review.parentCommit,'e68e7b6f843666cb653bd63447004ab4bc18b32a');
 assert.equal(review.files[path].added.length,35);
 assert.equal(review.files['public/app/data/devices.json'].added.length,41);
 assert.equal(review.files['public/app/data/device-packs.json'].added.length,1);
 assert.equal(hash(preMinervaSnapshot(path,read(path))),baseline.sha256);
});

test('projection cannot hide an altered old document or an unreviewed new document',()=>{
 const data=JSON.parse(read(path));
 const addedIds=new Set(review.files[path].added.map(item=>item.id));
 const original=data.find(item=>!addedIds.has(item.id));
 original.title+=' changed';
 assert.notEqual(hash(preMinervaSnapshot(path,bytes(data))),baseline.sha256);
 const extra=JSON.parse(read(path));extra.push({...extra[0],id:'unreviewed-new-record'});
 assert.notEqual(hash(preMinervaSnapshot(path,bytes(extra))),baseline.sha256);
});

test('reviewed additions cannot be changed, removed or duplicated before projection',()=>{
 const id=review.files[path].added[0].id;
 const changed=JSON.parse(read(path));changed.find(item=>item.id===id).title+=' changed';
 assert.throws(()=>preMinervaSnapshot(path,bytes(changed)),/reviewed addition changed/);
 const removed=JSON.parse(read(path)).filter(item=>item.id!==id);
 assert.throws(()=>preMinervaSnapshot(path,bytes(removed)),/missing reviewed addition/);
 const duplicate=JSON.parse(read(path));duplicate.push({...duplicate.find(item=>item.id===id)});
 assert.throws(()=>preMinervaSnapshot(path,bytes(duplicate)),/repeated record ID/);
});

test('only the reviewed pack sorting can be reversed',()=>{
 const packPath='public/app/data/device-packs.json',data=JSON.parse(read(packPath));
 [data[0],data[1]]=[data[1],data[0]];
 assert.throws(()=>preMinervaSnapshot(packPath,bytes(data)),/reviewed pack order changed/);
});
