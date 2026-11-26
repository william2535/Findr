import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const paxton=JSON.parse(readFileSync(new URL('../fixtures/preservation/paxton-95ac61a-additions.json',import.meta.url)));
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

// The reviewed 95ac61a batch was strictly additive: no previous records changed.
// Reverse only its exact, independently hash-pinned IDs and the importer’s
// documented pack sorting before checking the old
// snapshots. Any unreviewed addition, altered original or altered new record
// still fails. This fixture is evidence, not generated from the working tree.
export function prePaxtonSnapshot(path,bytes){
 const review=paxton.files[path];if(!review)return bytes;
 assert.equal(paxton.sourceCommit,'95ac61a58420bcf77a36405f9c9365d954e7a1b0');
 const data=JSON.parse(bytes),array=Array.isArray(data);
 assert.equal(array,review.shape==='array',path);
 const records=array?Object.fromEntries(data.map(item=>[item.id,item])):data;
 if(array)assert.equal(Object.keys(records).length,data.length,`${path}: repeated record ID`);
 const ids=new Set(review.added.map(item=>item.id));
 for(const entry of review.added){
  assert.ok(Object.hasOwn(records,entry.id),`${path}: missing reviewed addition ${entry.id}`);
  assert.equal(sha(records[entry.id]),entry.sha256,`${path}: reviewed addition changed ${entry.id}`);
 }
 let previous=array?data.filter(item=>!ids.has(item.id)):Object.fromEntries(Object.entries(data).filter(([id])=>!ids.has(id)));
 if(review.priorOrder){
  assert.equal(sha(data.map(item=>item.id)),review.publishedOrderSha256,`${path}: reviewed pack order changed`);
  assert.equal(previous.length,review.priorOrder.length,`${path}: unreviewed catalogue change`);
  previous=review.priorOrder.map(id=>records[id]);
 }
 return Buffer.from(JSON.stringify(previous,null,array?2:undefined)+'\n');
}

// Reconstruct the old catalogue bytes after the expressly permitted 0.28
// additions. New Minerva records are separately verified by integration tests.
// Every older field must still match the independently retained snapshot hash.
export function preMinervaSnapshot(path,bytes){
 bytes=prePaxtonSnapshot(path,bytes);
 if(path==='public/app/data/panels.json'){
  const raw=bytes.toString(),addedStart=raw.indexOf(',\n  {\n    "id": "tyco-minerva-mx"');
  assert.ok(addedStart>0,'Minerva additions follow the unchanged prior panel records');
  return Buffer.from(raw.slice(0,addedStart)+'\n]\n');
 }
 if(path==='public/app/data/packs.json'){
  const data=JSON.parse(bytes),pack=data.find(pack=>pack.id==='tyco-fire');
  pack.panel_ids=pack.panel_ids.filter(id=>!['tyco-minerva-mx','tyco-minerva-mx2'].includes(id));
  pack.record_ids=pack.record_ids.filter(id=>id!=='facp-ec7a65d3-2379-41c6-987d-b091da8b3e53');
  pack.record_count=pack.record_ids.length;pack.direct_pdf_count=pack.record_ids.length;
  return Buffer.from(JSON.stringify(data,null,2)+'\n');
 }
 return bytes;
}
