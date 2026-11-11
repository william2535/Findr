import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {filterDevices,filterDevicePacks,devicePackStatus} from '../public/app/devices.mjs';

const load=name=>JSON.parse(readFileSync(new URL('../public/app/data/'+name+'.json',import.meta.url)));
const allDevices=load('devices'),packs=load('device-packs'),catalogue=load('catalogue');
const records=new Map(catalogue.records.map(record=>[record.id,record]));
const audit=JSON.parse(readFileSync(new URL('../research/device-packs-0.19.0/source-audit.json',import.meta.url)));
const specifications=[
 ['bosch-device-blue-line-gen2-wp',['ISC-BDL2-WP6G','ISC-BDL2-WP12G','ISC-BDL2-WP12H'],'bosch-0ba92138ab30'],
 ['bosch-device-blue-line-gen2-w12',['ISC-BDL2-W12G','ISC-BDL2-W12H'],'bosch-c221490fad45'],
 ['risco-device-bware-rk515dtgl',['RK515DTGL'],'risco-00a6655953a1'],
 ['risco-device-iwise-dt-g3',['RK815DTG3','RK815DTG3A','RK825DTG3','RK825DTG3A'],'risco-e8aee4e7a650'],
];
const batch=specifications.map(([id])=>allDevices.find(device=>device.id===id));

test('Bosch and Risco cards preserve full documented model suffixes and the applicable installation sheet',()=>{
 for(const [id,codes,document]of specifications){
  const device=allDevices.find(row=>row.id===id);assert.ok(device,id);
  assert.deepEqual(device.part_numbers,codes);assert.deepEqual(device.record_ids,[document]);
  assert.equal(records.get(document).type,'installation');assert.equal(records.get(document).brand,device.brand);
  assert.equal(records.get(document).category,'security');assert.equal(device.device_type,'detector');
  assert.match(device.identification_notes,/label/);assert.match(device.applicability_limits,/2017|2012|2022/);
  for(const code of codes)assert.ok(filterDevices(batch,{query:code}).some(row=>row.id===id),code);
 }
 // An E/CHI suffix or generic family name cannot acquire a code not in this batch.
 for(const code of ['ISC-BDL2-WP12GE','ISC-BDL2-W12HE','ISC-BDL2-WP6G-CHI','RK815DT'])assert.ok(!batch.some(row=>row.part_numbers.includes(code)));
 assert.equal(filterDevices(batch,{query:'ISC-BDL2-WP12GE'}).length,0);
});

test('the source audit pins each existing PDF and distinguishes reviewed but unlinked editions',()=>{
 assert.equal(audit.checked_sources.length,6);
 for(const source of audit.checked_sources){
  const record=records.get(source.record_id);assert.ok(record);
  assert.equal(source.sha256,record.sha256);assert.equal(source.bytes,record.bytes);assert.equal(source.pages,record.pages);assert.equal(source.url,record.url);assert.equal(source.hash_matches_archive,true);
 }
 const linked=new Set(batch.flatMap(device=>device.record_ids));
 assert.equal(linked.size,4);assert.ok(!linked.has('bosch-3d8651b2effe'));assert.ok(!linked.has('bosch-be9d38fc89d0'));
 assert.match(audit.review_decisions.join(' '),/2019 quick guide.*not linked/);
 assert.match(audit.review_decisions.join(' '),/A-suffixed models/);
});

test('original PDF photographs retain exact attribution, page evidence and reviewed local image hashes',()=>{
 for(const device of batch){
  const source=audit.devices.find(row=>row.id===device.id);assert.ok(source);
  const bytes=readFileSync(new URL('../public/app/devices/'+device.image,import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),source.image_sha256);assert.equal(device.image_sha256,source.image_sha256);
  assert.equal(device.source_pdf_page,1);assert.equal(device.image_type,'manufacturer-manual-photo');
  assert.equal(device.source_image_url,records.get(source.image_record_id).url);assert.equal(device.source_page_url,device.source_image_url);
  assert.ok(source.image_pdf_xref>0);assert.ok(device.image_dimensions.every(value=>value>=120));
 }
 assert.equal(batch[0].image_sha256,batch[1].image_sha256,'The Bosch picture is intentionally a disclosed family photograph');
 assert.match(batch[0].identification_notes,/Representative.*family photograph/);assert.match(batch[1].identification_notes,/cannot distinguish W12 from WP12/);
});

test('new device packs use the existing saved-PDF count and deduplicate real manual IDs',()=>{
 for(const brand of ['bosch','risco']){
  const pack=packs.find(row=>row.id===brand+'-security-devices');assert.ok(pack);
  assert.equal(pack.device_ids.length,2);assert.equal(pack.record_count,2);assert.equal(pack.direct_pdf_count,2);assert.deepEqual(pack.supplementary_record_ids,[]);
  assert.deepEqual(new Set(pack.record_ids),new Set(batch.filter(device=>pack.device_ids.includes(device.id)).flatMap(device=>device.record_ids)));
  const empty=devicePackStatus(pack,records,new Map());assert.equal(empty.savedCount,0);assert.equal(empty.missingIds.length,2);
  const saved=devicePackStatus(pack,records,new Map([[pack.record_ids[0],{}]]));assert.equal(saved.savedCount,1);assert.equal(saved.missingIds.length,1);
  assert.ok(filterDevicePacks(packs,allDevices,{query:brand}).some(row=>row.id===pack.id));
 }
});
