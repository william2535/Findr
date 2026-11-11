import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const panels=read('public/app/data/panels.json'),byId=new Map(panels.map(p=>[p.id,p])),packs=read('public/app/data/packs.json');
const records=new Map(read('public/app/data/catalogue.json').records.map(r=>[r.id,r]));
const manifest=read('research/panel-packs-0.19.0/manifest.json'),sources=new Map(manifest.sources.map(s=>[s.id,s]));

test('new repeater pictures retain exact document/figure provenance and do not borrow main-panel manuals',()=>{
 assert.equal(manifest.new_panels.length,4);
 for(const item of manifest.new_panels){
  const panel=byId.get(item.id),source=sources.get(item.source_record_id);
  assert.ok(panel);assert.deepEqual(panel.record_ids,item.record_ids);
  assert.match(panel.model,/repeater/i);assert.match(panel.applicability_limits,/not .*main|not the Sigma CP/);
  assert.equal(panel.source_document_url,source.url);assert.equal(panel.source_pdf_page,item.source_pdf_page);
  assert.ok(panel.source_pdf_page>0&&panel.source_pdf_page<=source.pdf_pages);
  assert.equal(panel.source_image_url,source.url+'#page='+item.source_pdf_page);
  const bytes=readFileSync(new URL('../public/app/panels/'+panel.image,import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),panel.image_sha256);
  assert.ok(bytes.length>5000);assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.ok(packs.find(p=>p.id==='kentec-fire').panel_ids.includes(item.id));
 }
 assert.match(byId.get('kentec-hydrosense-cp-r').applicability_limits,/Water-detection repeater, not a fire control panel/);
 assert.match(byId.get('kentec-sigma-cp-r').applicability_limits,/alpha suffix/);
 assert.ok(!byId.has('kentec-k3200'));assert.ok(!byId.has('c-tec-xfp510-32-repeater'));
});

test('CFP family user guide does not assign the Standard engineering edition to AlarmSense or Economy',()=>{
 for(const id of ['c-tec-cfp-standard','c-tec-cfp-economy','c-tec-cfp-alarmsense']){
  const p=byId.get(id);assert.ok(p.record_ids.includes('c-tec-5332c9b751b2'));assert.match(p.applicability_limits,/family manual.*feature chart/);
 }
 assert.ok(byId.get('c-tec-cfp-standard').record_ids.includes('c-tec-4b1267f3fefc'));
 for(const id of ['c-tec-cfp-economy','c-tec-cfp-alarmsense'])assert.ok(!byId.get(id).record_ids.includes('c-tec-4b1267f3fefc'));
 for(const id of ['c-tec-xfp-cast-16-zone','c-tec-xfp-cast-32-zone'])assert.ok(byId.get(id).record_ids.includes('facp-3363e064-e6ce-4d60-9343-6744ae180a07'));
 for(const id of ['c-tec-xfp-16-zone','c-tec-xfp-32-zone'])assert.ok(!byId.get(id).record_ids.includes('facp-3363e064-e6ce-4d60-9343-6744ae180a07'));
 assert.ok(!byId.get('c-tec-zfp-apollo').record_ids.includes('facp-86a53825-e9fa-4f20-89eb-5211cddbd9fb'));
 assert.match(byId.get('c-tec-eacie').applicability_limits,/Fire and Rescue Service/);
});

test('checked manual links have pinned source evidence and retain prior links and pack identity',()=>{
 const before=read('research/panel-packs-0.19.0/preservation.json');
 for(const [id,ids]of Object.entries(before.enriched_panel_previous_record_ids))for(const recordId of ids)assert.ok(byId.get(id).record_ids.includes(recordId),id+': '+recordId);
 for(const source of manifest.sources){
  assert.equal(source.url,records.get(source.id).url);assert.match(source.sha256,/^[a-f0-9]{64}$/);assert.ok(source.bytes>1000&&source.pdf_pages>0);
  if(records.get(source.id).sha256)assert.equal(source.sha256,records.get(source.id).sha256);
 }
 for(const link of manifest.manual_links)for(const id of link.panel_ids){
  const panel=byId.get(id);assert.ok(panel.record_ids.includes(link.record_id));
  const evidence=panel.verified_manual_links.find(l=>l.record_id===link.record_id);
  assert.equal(evidence.sha256,sources.get(link.record_id).sha256);assert.equal(evidence.revision,link.revision);
  for(const page of evidence.evidence_pdf_pages)assert.ok(page>0&&page<=sources.get(link.record_id).pdf_pages);
  assert.ok(packs.find(p=>p.brand===panel.brand&&p.category===panel.category).record_ids.includes(link.record_id));
 }
 assert.equal(new Set(panels.map(p=>p.id)).size,panels.length);
 for(const pack of packs){assert.equal(pack.record_count,pack.record_ids.length);assert.equal(new Set(pack.record_ids).size,pack.record_ids.length);}
});
