import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {serviceTrainerForPanel,manualIdsForPanel} from '../public/app/fire-service-manuals.mjs';
import {panelHintContext} from '../public/app/onsite.mjs';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const panels=read('public/app/data/panels.json'),packs=read('public/app/data/packs.json');
const records=new Map(read('public/app/data/catalogue.json').records.map(record=>[record.id,record]));
const source=read('public/app/data/minerva-mx.json').sources[0];
const images=read('research/minerva-0.28.0/panel-image-provenance.json');

test('Minerva fronts bind exact source editions, real figure bytes and distinct MX/MX2 variants',()=>{
 for(const [variant,page] of [['mx',3],['mx2',4]]){
  const panel=panels.find(panel=>panel.id==='tyco-minerva-'+variant),binding=serviceTrainerForPanel(panel.id);
  assert.equal(binding.engineId,'minerva');assert.equal(binding.route,'#minerva/variant/'+variant);
  assert.equal(panelHintContext(panel).engineId,'minerva');
  assert.match(panel.applicability_limits,/Firmware 5\.0/);
  assert.deepEqual(manualIdsForPanel(panel,{},records),[source.recordId]);
  assert.equal(panel.source_pdf_page,page);assert.equal(panel.source_document_url,source.url);
  const figure=images.find(image=>image.file==='panels/'+panel.image);
  assert.equal(figure.source_pdf_sha256,records.get(source.recordId).sha256);
  const bytes=readFileSync(new URL('../public/app/panels/'+panel.image,import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),figure.sha256);
  assert.equal(panel.image_sha256,figure.sha256);
 }
 // A shared name does not bind different interfaces or newer source editions.
 for(const id of ['tyco-mzx125','tyco-mzx250','tyco-mx1000'])assert.equal(serviceTrainerForPanel(id),null);
});

test('Tyco pack includes the operating manual once while keeping its older documents and pictures',()=>{
 const pack=packs.find(pack=>pack.id==='tyco-fire');
 assert.deepEqual(pack.panel_ids,['tyco-mx1000','tyco-mzx125','tyco-mzx250','tyco-minerva-mx','tyco-minerva-mx2']);
 assert.ok(pack.record_ids.includes(source.recordId));
 assert.equal(pack.record_ids.length,new Set(pack.record_ids).size);
 assert.equal(pack.record_count,4);assert.equal(pack.direct_pdf_count,4);
 assert.equal(source.sha256,records.get(source.recordId).sha256);
});
