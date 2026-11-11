import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const read=path=>JSON.parse(fs.readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const data=read('public/app/data/minerva-mx.json');
test('Minerva source scope pins the verified manufacturer edition and both exact panel families',()=>{
 assert.equal(data.sources[0].sha256,'36a61c77885611d2e3ecaa5f3cdaead4294d96266780d32f61947368bfec928f');
 assert.equal(data.sources[0].firmware,'5.0');assert.equal(data.sources[0].totalPdfPages,35);
 assert.deepEqual(data.models.map(x=>x.id),['minerva-mx','minerva-mx2']);
 assert.deepEqual(data.models[1].variants,['MX2-100','MX2-200']);
});
test('every documented Minerva node and hint has valid identity, ancestry and page references',()=>{
 const ids=new Set(data.nodes.map(n=>n.id));assert.equal(ids.size,74);assert.equal(data.nodes.length,74);
 for(const n of data.nodes){assert.ok(n.hint.length>30,n.id);assert.ok(n.sourceRefs.length,n.id);for(const r of n.sourceRefs){assert.ok(data.sources.some(s=>s.id===r.sourceId));assert.ok(r.pdfPage>=1&&r.pdfPage<=35);assert.equal(String(r.pdfPage),r.printedPage);assert.ok(r.section);}
 if(n.parentId)assert.ok(ids.has(n.parentId),n.id);assert.ok(n.accessLevel>=1&&n.accessLevel<=9);}
 for(const m of Object.values(data.menus))for(const e of m.entries)assert.ok(ids.has(e.target));
});
test('unverified Diagnostics and missing numbered Initialisation selector remain explicit reference boundaries',()=>{
 for(const id of ['diagnostics','initialisation-count']){const n=data.nodes.find(n=>n.id===id);assert.equal(n.simulationStatus,'reference-only');assert.equal(n.behavior,'reference');assert.equal(n.practiceRoute,undefined);assert.equal(n.hintsRoute,undefined);}
 assert.equal(data.screens['initialisation-count'].key,null);assert.equal(data.menus.maintenance.entries.find(e=>e.target==='initialisation-count').key,null);
 assert.equal(data.menus['view-print'].accessLevel,4);assert.equal(data.screens['loop-counters'].accessLevel,9);
 assert.ok(data.boundaries.some(b=>b.id==='view-print-access'));assert.ok(data.boundaries.some(b=>b.id==='configuration'));
});
test('all Minerva guided lessons use existing target nodes and sourced steps',()=>{
 assert.equal(data.lessons.length,7);
 for(const l of data.lessons){assert.ok(data.nodes.some(n=>n.id===l.targetNode&&n.behavior!=='reference'));assert.ok(l.steps.length>=2);for(const s of l.steps){assert.ok(s.instruction);assert.ok(s.sourceRefs.every(r=>r.pdfPage>=1&&r.pdfPage<=35));}}
});
test('Minerva panel cards are pinned excerpts from the verified manufacturer figures',()=>{
 const provenance=read('research/minerva-0.28.0/panel-image-provenance.json');assert.equal(provenance.length,2);
 for(const item of provenance){const bytes=fs.readFileSync(new URL('../public/app/'+item.file,import.meta.url));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),item.sha256);assert.equal(item.source_pdf_sha256,data.sources[0].sha256);assert.ok([3,4].includes(item.pdf_page));assert.equal(item.crop_points.length,4);}
});
