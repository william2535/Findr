import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const data=read('public/app/data/fire-service-manuals.json');
const audit=read('research/fire-service-0.24.0/manuals-audit.json');
const catalogue=new Map(read('public/app/data/catalogue.json').records.map(record=>[record.id,record]));
const panels=new Set(read('public/app/data/panels.json').map(panel=>panel.id));
const documents=new Map(data.documents.map(document=>[document.recordId,document]));
const family=id=>data.families.find(item=>item.id===id);

test('manual review accounts for every existing XFP and Twinflex candidate without changing catalogue identities',()=>{
 const candidates=[...catalogue.values()].filter(record=>/xfp|twinflex/i.test([record.brand,record.models,record.title].join(' '))).map(record=>record.id).sort();
 assert.deepEqual([...documents.keys()].sort(),candidates);
 assert.equal(documents.size,45);
 assert.equal(audit.records.length,45);
 for(const document of documents.values()){
  const record=catalogue.get(document.recordId),evidence=audit.records.find(item=>item.recordId===document.recordId);
  assert.equal(document.sourceUrl,record.url,record.id);
  assert.equal(document.verificationStatus,'verified');
  assert.equal(document.deliveryStatus,'retrieved-pdf');
  assert.match(document.sha256,/^[a-f0-9]{64}$/);
  assert.equal(document.sha256,evidence.sha256);
  assert.equal(document.pdfPages,evidence.pdfPages);
  assert.equal(document.bytes,evidence.bytes);
  assert.equal(evidence.status,'retrieved-pdf');
  assert.ok(document.evidencePages.every(page=>Number.isInteger(page)&&page>=1&&page<=document.pdfPages));
  if(record.sha256){assert.equal(document.sha256,record.sha256);assert.equal(evidence.catalogueHashMatches,true);}
 }
 assert.equal(audit.counts.hashPinnedMatches,18);
 assert.equal(audit.counts.hashPinnedMismatches,0);
 assert.equal(audit.counts.failedRetrievals,0);
});

test('duplicate copies retain distinct hashes and are grouped only with matching edition and normalized text evidence',()=>{
 const canonicals=new Set(),seenAliases=new Set();
 for(const document of documents.values()){
  const canonical=documents.get(document.canonicalRecordId);
  assert.ok(canonical,document.recordId);
  canonicals.add(canonical.recordId);
  assert.equal(document.documentNumber,canonical.documentNumber);
  assert.equal(document.edition,canonical.edition);
  assert.equal(document.textSha256,canonical.textSha256);
  for(const aliasId of document.alternateRecordIds||[]){
   assert.ok(!seenAliases.has(aliasId),aliasId);seenAliases.add(aliasId);
   const alias=documents.get(aliasId),proof=document.duplicateEvidence.find(item=>item.recordId===aliasId);
   assert.equal(alias.canonicalRecordId,document.recordId);
   assert.equal(proof.sha256,alias.sha256);
   assert.equal(proof.kind,alias.sha256===document.sha256?'identical-pdf-bytes':'same-edition-and-normalized-full-text');
  }
 }
 assert.equal(canonicals.size,34);
 assert.equal(new Set(data.documents.map(document=>document.sha256)).size,41);
 assert.equal(seenAliases.size,11);
 assert.equal(documents.get('c-tec-b03be75d8eb7').sha256,documents.get('c-tec-ba3f93b60d06').sha256);
 assert.notEqual(documents.get('fike-d32c7e8d452f').sha256,documents.get('facp-9e607562-03e2-429b-bcc3-b8f7dab17b75').sha256);
});

test('family associations bind exact existing pictures and expose only reviewed canonical documents',()=>{
 const covered=new Set(),boundPanels=new Set();
 assert.equal(data.families.length,10);
 for(const item of data.families){
  assert.equal(new Set(item.recordIds).size,item.recordIds.length);
  assert.deepEqual(item.recordIds,item.documents.map(document=>document.recordId));
  for(const panelId of item.panelIds){assert.ok(panels.has(panelId),panelId);assert.ok(!boundPanels.has(panelId),panelId);boundPanels.add(panelId);}
  for(const document of item.documents){
   assert.equal(document.verificationStatus,'verified');
   assert.equal(document.canonicalRecordId,document.recordId);
   assert.equal(document.sha256,documents.get(document.recordId).sha256);
   assert.ok(['main-panel','selected-equipment','related-equipment','supporting-reference'].includes(document.relationship));
  }
  for(const recordId of [...item.recordIds,...item.alternateRecordIds]){assert.ok(documents.has(recordId));covered.add(recordId);}
  for(const recordId of item.excludedRecordIds)assert.ok(!item.recordIds.includes(recordId));
 }
 assert.deepEqual([...covered].sort(),[...documents.keys()].sort());
 assert.equal(boundPanels.size,8);
});

test('XFP cabinet and protocol engineering editions remain separate, with current editions first',()=>{
 const expectations=[
  ['xfp-apollo-hochiki-16','c-tec-6a8ae5ddd7bc','DFU1200510','Rev 3',36],
  ['xfp-apollo-hochiki-32','c-tec-ba3f93b60d06','DFU2200510','Rev 2',36],
  ['xfp-cast-16','c-tec-232499eefc01','DFU5010000','Rev 5, 1 October 2021',48],
  ['xfp-cast-32','facp-0723eb66-9f2a-4313-bcc3-2de5e276bcbe','DFU5010020','Rev 5, 1 October 2021',48],
 ];
 for(const [id,recordId,number,edition,pages] of expectations){
  const item=family(id),installer=item.documents.find(document=>document.role==='installation');
  assert.equal(installer.recordId,recordId);assert.equal(installer.documentNumber,number);assert.equal(installer.edition,edition);assert.equal(installer.pdfPages,pages);
  for(const [otherId,otherRecordId] of expectations)if(otherId!==id)assert.ok(!item.recordIds.includes(otherRecordId),id+' excludes '+otherId);
 }
 const current16=documents.get('c-tec-6a8ae5ddd7bc');
 assert.ok(current16.evidencePages.includes(20));
 assert.match(current16.notes.join(' '),/non-redundant and not assessed to EN54-2/);
 assert.equal(documents.get('c-tec-70f490a601e3').documentNumber,'DFU2000501','Unusual historical printed document number must not be silently normalized');
});

test('original Twinflex, earlier pro and pro² manuals are identified by their actual sources rather than stale titles',()=>{
 const original=family('twinflex-original-v3'),pro=family('twinflex-pro'),pro2=family('twinflex-pro2');
 assert.deepEqual(original.panelIds,[]);
 assert.deepEqual(original.recordIds,['facp-e0c77fed-eac0-4811-9d59-b38fa3bb9ae1']);
 assert.equal(original.documents[0].documentNumber,'26-0338');
 assert.equal(original.documents[0].pdfPages,53);
 assert.equal(pro.recordIds[0],'fike-567bab4e7b04');
 assert.match(pro.documents[0].variant,/from V2\.00/);
 assert.equal(pro2.recordIds[0],'fike-6cfbefcbbb78');
 assert.match(pro2.documents[0].variant,/pro² from V3\.00/);
 assert.equal(pro2.documents[0].edition,'Rev 18, October 2020');
 assert.equal(pro2.documents[0].pdfPages,80);
 assert.deepEqual(pro.excludedRecordIds,['fike-6cfbefcbbb78','fike-ccc737b20ef3','fike-d32c7e8d452f']);
 assert.ok(!pro2.recordIds.includes('fike-fc894e8e5796'));
 assert.ok(!pro2.recordIds.includes('fike-567bab4e7b04'));
 assert.match(pro2.documents.find(document=>document.role==='user-guide').edition,/Rev 5/);
});

test('accessory compatibility is explicit and separately corroborated where generations overlap',()=>{
 const pro=family('twinflex-pro'),pro2=family('twinflex-pro2');
 assert.ok(!pro.recordIds.includes('fike-96c0a23f2943'));
 const conventional=pro2.documents.find(document=>document.recordId==='fike-96c0a23f2943');
 assert.equal(conventional.relationship,'related-equipment');
 assert.match(conventional.variant,/4-zone TWINFLEXpro² only/);
 assert.match(conventional.notes.join(' '),/cannot distinguish smoke from MCP fire signals/);
 const twinflexExpansion=pro2.documents.find(document=>document.recordId==='fike-788e7bd5bdad');
 assert.equal(twinflexExpansion.role,'accessory');
 assert.equal(twinflexExpansion.relationship,'related-equipment');
 const proof=twinflexExpansion.corroboratingSources[0];
 assert.equal(proof.recordId,'fike-6cfbefcbbb78');assert.equal(proof.pdfPage,20);
 assert.equal(proof.sha256,documents.get(proof.recordId).sha256);
 for(const document of pro2.documents.filter(document=>document.role==='brochure')){assert.equal(document.relationship,'supporting-reference');assert.match(document.notes.join(' '),/must not be used for installation/);}
});

test('repeater manuals remain related references on a main panel and primary references on their own picture',()=>{
 const repeater=family('twinflex-pro2-repeater');
 assert.deepEqual(repeater.panelIds,['fike-twinflexpro2-repeater']);
 for(const document of repeater.documents){
  assert.equal(document.role,'repeater');
  assert.equal(document.relationship,'selected-equipment');
  assert.equal(family('twinflex-pro2').documents.find(item=>item.recordId===document.recordId).relationship,'related-equipment');
 }
 assert.equal(family('xfp-repeater-16').documents[0].relationship,'selected-equipment');
 assert.deepEqual(family('xfp-repeater-32').panelIds,[]);
});
