import assert from 'node:assert/strict';

// Reconstruct the old catalogue bytes after the expressly permitted 0.28
// additions. New Minerva records are separately verified by integration tests.
// Every older field must still match the independently retained snapshot hash.
export function preMinervaSnapshot(path,bytes){
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
