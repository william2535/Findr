import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {preMinervaSnapshot} from './helpers/pre-minerva-snapshot.mjs';
import {validateWiringEntries,mergeWiringBatches,webpDimensions} from '../scripts/merge-wiring.mjs';

const root=new URL('../',import.meta.url),app=new URL('../public/app/',import.meta.url),read=name=>readFileSync(new URL(name,root)),json=name=>JSON.parse(read(name));
const data=json('public/app/data/wiring-diagrams.json'),catalogue=json('public/app/data/catalogue.json'),documents=json('public/app/data/device-documents.json'),panels=json('public/app/data/panels.json'),devices=json('public/app/data/devices.json'),records=[...catalogue.records,...documents];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const hash='a'.repeat(64),record={id:'synthetic-manual',brand:'Synthetic',category:'fire',pages:3,sha256:hash};
const fixture={id:'synthetic-manual-p2-wiring',recordId:record.id,title:'SYNTHETIC schema fixture, not wiring guidance',brand:'Synthetic',category:'fire',targetType:'device',diagramType:'wiring',models:['SYNTHETIC MODEL'],panelIds:[],deviceIds:[],pdfPage:2,printedPage:null,section:'SYNTHETIC connection example',sourceUrl:'https://example.test/synthetic.pdf',sourceSha256:hash,edition:'SYNTHETIC',image:'wiring/synthetic-manual-p2-wiring.webp',imageSha256:'b'.repeat(64),imageWidth:1400,imageHeight:1980,imageBytes:1000,scope:'Synthetic test fixture only',notes:[],keywords:['synthetic'],reviewedOn:'2026-11-02',reviewStatus:'reviewed'};

test('all published wiring pictures have checked provenance, real manual/model IDs and matching image bytes',()=>{
 assert.equal(data.schemaVersion,1);assert.equal(data.version,'0.22.0');assert.ok(data.entries.length>0);assert.match(data.scope,/not exhaustive/);
 const result=validateWiringEntries(data.entries,{records,panels,devices});assert.equal(result.diagramCount,data.entries.length);
 assert.deepEqual(readdirSync(new URL('wiring/',app)).filter(name=>name.endsWith('.webp')).sort(),data.entries.map(entry=>entry.image.slice('wiring/'.length)).sort());
});

test('wiring extraction preserves all previous catalogue records, model/pack associations and download identities byte-for-byte',()=>{
 const baseline=json('research/wiring-0.22.0/baseline-data-hashes.json');assert.equal(baseline.baselineCommit,'350e887b0ce5bb3706a7a3660f0fe531d1175d9f');assert.equal(baseline.files.length,8);
 for(const item of baseline.files){const bytes=preMinervaSnapshot(item.path,read(item.path));assert.equal(bytes.length,item.bytes,item.path);assert.equal(sha(bytes),item.sha256,item.path);}
});

test('new target associations have explicit reviewed source evidence and a rejected variant stays unlinked',()=>{
 const audit=json('research/wiring-0.22.0/target-link-review.json'),result=validateWiringEntries(data.entries,{records,panels,devices,checkImages:false}),entries=new Map(data.entries.map(entry=>[entry.id,entry]));
 for(const link of result.newTargetLinks){const entry=entries.get(link.entryId),field=link.targetType==='panel'?'panelIds':'deviceIds';const review=audit.approved.find(item=>item.recordId===entry.recordId&&item.sourceSha256===entry.sourceSha256&&item[field].includes(link.targetId)&&item.pdfPages.includes(entry.pdfPage));assert.ok(review,`Missing explicit source review for ${entry.id} → ${link.targetId}`);assert.equal(review.reviewStatus,'source-reviewed');assert.ok(review.evidence.length&&review.limits);}
 for(const rejected of audit.rejected)for(const entry of data.entries.filter(item=>item.recordId===rejected.recordId&&item.sourceSha256===rejected.sourceSha256))assert.ok(!entry.deviceIds.includes(rejected.deviceId),`Rejected model variant linked: ${rejected.deviceId}`);
});

test('published wiring data is the deterministic union of the reviewed curator batches',()=>{
 const folder=new URL('research/wiring-0.22.0/',root),names=readdirSync(folder).filter(name=>name.endsWith('-entries.json')).sort();
 const batches=names.map(name=>({name,entries:JSON.parse(readFileSync(new URL(name,folder)))}));assert.ok(batches.length);
 assert.deepEqual(data.entries,mergeWiringBatches(batches).entries);
 const original=structuredClone(batches),reversed=mergeWiringBatches([...batches].reverse());assert.deepEqual(reversed.entries,data.entries);assert.deepEqual(batches,original);
});

test('merge fails closed on conflicting duplicates, unsupported model IDs and different hash-pinned editions',()=>{
 const options={records:[record],checkImages:false};assert.equal(validateWiringEntries([fixture],options).diagramCount,1);
 assert.throws(()=>validateWiringEntries([{...fixture,sourceSha256:'c'.repeat(64)}],options),/differs from the hash-pinned manual/);
 assert.throws(()=>validateWiringEntries([{...fixture,deviceIds:['unknown-device']}],options),/unknown deviceIds/);
 assert.throws(()=>validateWiringEntries([{...fixture,pdfPage:4}],options),/exceeds recorded document pages/);
 assert.throws(()=>validateWiringEntries([{...fixture,reviewStatus:'candidate'}],options),/review must be complete/);
 assert.throws(()=>validateWiringEntries([{...fixture,image:'wiring/../other.webp'}],options),/image path/);
 assert.throws(()=>mergeWiringBatches([{name:'a',entries:[fixture]},{name:'b',entries:[{...fixture,title:'Different source claim'}]}]),/conflicting duplicate/);
 const merged=mergeWiringBatches([{name:'a',entries:[fixture]},{name:'b',entries:[structuredClone(fixture)]}]);assert.equal(merged.entries.length,1);assert.deepEqual(merged.duplicates,[{id:fixture.id,retainedBatch:'a',duplicateBatch:'b'}]);
});

test('complete source pages cannot silently duplicate under different labels in one manual',()=>{
 assert.throws(()=>validateWiringEntries([fixture,{...fixture,id:'another-name',image:'wiring/another-name.webp'}],{records:[record],checkImages:false}),/duplicate complete source page/);
 const unpinned={...record,sha256:undefined};assert.equal(validateWiringEntries([{...fixture,sourceSha256:'d'.repeat(64)}],{records:[unpinned],checkImages:false}).diagramCount,1);
});

test('image inspection rejects non-WebP bytes and reads exact full-page dimensions',()=>{
 assert.throws(()=>webpDimensions(Buffer.from('not an actual wiring picture')),/WebP/);
 for(const entry of data.entries.slice(0,4)){const bytes=readFileSync(new URL(entry.image,app));assert.deepEqual(webpDimensions(bytes),[entry.imageWidth,entry.imageHeight]);}
});

test('wiring index, matching code and every reviewed picture are included in the offline integrity manifest',()=>{
 const context={self:{}};vm.runInNewContext(readFileSync(new URL('precache.js',app),'utf8'),context);const assets=new Set(context.self.__PRECACHE);
 for(const name of ['wiring.mjs','data/wiring-diagrams.json',...data.entries.map(entry=>entry.image)]){assert.ok(assets.has('./'+name),'Missing offline asset: '+name);assert.equal(context.self.__ASSET_SHA256['./'+name],sha(readFileSync(new URL(name,app))),name);}
});
