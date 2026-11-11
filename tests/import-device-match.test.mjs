import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {identifyImportedDevice} from '../public/app/import-device-match.mjs';

const load = name => JSON.parse(readFileSync(new URL(`../public/app/data/${name}.json`, import.meta.url), 'utf8'));
const devices = load('devices');
const records = new Map([...load('catalogue').records, ...load('device-documents')].map(record => [record.id, record]));
const syntheticDevice = {id:'synthetic-sensor',category:'fire',brand:'Example',model:'Synthetic sensor',part_numbers:['0012-ABC-VO'],record_ids:['user','install','source','missing'],device_type:'detector',aliases:['optical detector'],source_pdf_page:44};
const syntheticRecords = new Map([
  ['user',{id:'user',title:'Operating manual',type:'user',url:'https://example.invalid/user.pdf'}],
  ['install',{id:'install',title:'Installation and wiring',type:'installation',revision:'Synthetic Rev 2',url:'https://example.invalid/install.pdf'}],
  ['source',{id:'source',title:'Fault reference',type:'fault reference',source:'https://example.invalid/source'}],
]);

test('the real complete Gent part number links its actual family installation manual', () => {
  const row = {partNumber:'S4-720-ST-VO',manufacturer:'Gent',type:'optical detector'};
  const result = identifyImportedDevice(row, devices, records, new Map());
  assert.equal(result.status, 'exact');
  assert.equal(result.device.id, 'gent-squad-legacy-family');
  assert.deepEqual(result.documents.map(item => item.record.id), ['gent-0ba4cfc5de7c']);
  assert.equal(result.documents[0].family, true);
  assert.equal(result.documents[0].status, 'downloadable');
  assert.match(result.documents[0].reason, /Family\/range reference/);
  assert.match(result.documents[0].reason, /No document revision is recorded/);
  assert.equal(Object.hasOwn(result.documents[0], 'page'), false, 'image provenance is not a manual destination');
  assert.equal(row.partNumber, 'S4-720-ST-VO');
});

test('complete codes ignore case and outer whitespace but retain suffixes, punctuation and zeros', () => {
  assert.equal(identifyImportedDevice({partNumber:'  s4-720-st-vo  '},devices,records).status,'exact');
  for (const partNumber of ['S4-720-ST-VO-VAD','S4720STVO','S4-720-ST-V','012-ABC-VO','0012ABCVO']) {
    const result=identifyImportedDevice({partNumber},[...devices,syntheticDevice],records);
    assert.notEqual(result.status,'exact',partNumber);
    assert.deepEqual(result.documents,[]);
  }
  assert.equal(identifyImportedDevice({partNumber:'0012-ABC-VO'},[syntheticDevice],syntheticRecords).status,'exact');
});

test('generic optical wording and S-Quad family never acquire a verified model or manual', () => {
  for(const row of [{type:'optical detector'},{model:'S-Quad',manufacturer:'Gent'},{model:'optical smoke'},{manufacturer:'Gent',protocol:'Vigilon'}]) {
    const result=identifyImportedDevice(row,devices,records);
    assert.notEqual(result.status,'exact');
    assert.equal(result.device,null);
    assert.deepEqual(result.documents,[]);
  }
  const family=identifyImportedDevice({model:'S-Quad',manufacturer:'Gent'},devices,records);
  assert.equal(family.status,'family');
  assert.ok(family.candidates.some(device=>device.id==='gent-squad-legacy-family'));
});

test('manufacturer conflict and catalogue code collisions cannot choose a first match', () => {
  const conflict=identifyImportedDevice({partNumber:'S4-720-ST-VO',manufacturer:'Apollo'},devices,records);
  assert.equal(conflict.status,'ambiguous');
  assert.deepEqual(conflict.documents,[]);
  assert.match(conflict.reason,/conflicting manufacturer/);
  const collision=identifyImportedDevice({partNumber:'0012-ABC-VO'},[syntheticDevice,{...syntheticDevice,id:'other-entry'}],syntheticRecords);
  assert.equal(collision.status,'ambiguous');
  assert.equal(collision.candidates.length,2);
  assert.equal(collision.device,null);
  assert.deepEqual(collision.documents,[]);
});

test('explicit unknown part number takes precedence over an otherwise recognised model code', () => {
  const result=identifyImportedDevice({partNumber:'S4-720-ST-VO-VAD',model:'S4-720-ST-VO'},devices,records);
  assert.notEqual(result.status,'exact');
  assert.deepEqual(result.documents,[]);
  assert.equal(identifyImportedDevice({model:'S4-720-ST-VO'},devices,records).status,'exact');
});

test('linked documents rank installation/fault references first and use actual saved state', () => {
  const result=identifyImportedDevice({partNumber:'0012-ABC-VO'},[syntheticDevice],syntheticRecords,new Map([['source',{}]]));
  assert.equal(result.status,'exact');
  assert.deepEqual(result.documents.map(item=>item.record.id),['source','install','user']);
  assert.equal(result.documents[0].status,'saved','saved source-only bytes are immediately usable');
  assert.equal(result.documents[1].status,'downloadable');
  assert.match(result.documents[1].reason,/Recorded edition: Synthetic Rev 2/);
  assert.equal(result.documents.some(item=>item.record.id==='missing'),false);
  const offlineMissing=identifyImportedDevice({partNumber:'0012-ABC-VO'},[syntheticDevice],syntheticRecords);
  assert.equal(offlineMissing.documents.find(item=>item.record.id==='source').status,'unavailable');
});

test('fire scope excludes intruder lookalikes and missing records do not invent a manual', () => {
  const intruder={...syntheticDevice,category:'security'};
  assert.notEqual(identifyImportedDevice({partNumber:'0012-ABC-VO'},[intruder],syntheticRecords).status,'exact');
  const result=identifyImportedDevice({partNumber:'0012-ABC-VO'},[syntheticDevice],new Map());
  assert.equal(result.status,'exact');
  assert.deepEqual(result.documents,[]);
  assert.match(result.reason,/No verified linked manual/);
});

test('unrecognised model text remains unmatched instead of claiming a known family', () => {
  const result=identifyImportedDevice({model:'ZX-UNKNOWN-42'},devices,records);
  assert.equal(result.status,'unmatched');
  assert.deepEqual(result.documents,[]);
});


test('multi-model documents are family references and accessory titles retain their actual scope', () => {
  const scopedRecords = new Map([
    ['install',{id:'install',title:'Multi-Sensor and Tri-Sensor Installation Instructions',models:['SA5100-710APO','SA5100-810APO'],url:'https://example.invalid/multi.pdf'}],
    ['source',{id:'source',title:'Detector base wiring instructions',models:['BASE-001'],url:'https://example.invalid/base.pdf'}],
  ]);
  const result=identifyImportedDevice({partNumber:'0012-ABC-VO'},[syntheticDevice],scopedRecords);
  const multi=result.documents.find(item=>item.record.id==='install');
  assert.equal(multi.family,true);
  assert.match(multi.reason,/Recorded model scope: SA5100-710APO; SA5100-810APO/);
  const base=result.documents.find(item=>item.record.id==='source');
  assert.match(base.reason,/Recorded document title: Detector base wiring instructions/);
  assert.match(base.reason,/Recorded model scope: BASE-001/);
  assert.doesNotMatch(base.reason,/detector installation/i);
});
