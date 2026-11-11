import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const data=JSON.parse(readFileSync(new URL('../public/app/data/conventional-fire.json',import.meta.url)));
const audit=JSON.parse(readFileSync(new URL('../research/cfp-level3-0.20.0/source-audit.json',import.meta.url)));
const cfp=data.profiles.find(p=>p.id==='c-tec-cfp-standard');
const sorted=value=>Array.isArray(value)?value.map(sorted):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,sorted(value[k])])):value;
const sha=value=>createHash('sha256').update(JSON.stringify(sorted(value))).digest('hex');

test('CFP source content retains its eight original operator lessons exactly',()=>{
 // Sigma expands in 0.21; its original lessons and the complete CFP profile are
 // independently protected by sigma-level3-sources.test.mjs.
 assert.equal(sha(cfp.lessons.slice(0,8)),audit.preservation.legacyCFPLessonsSha256);
 assert.deepEqual(cfp.lessons.slice(0,8).map(l=>l.id),audit.preservation.originalCFPLessonIds);
 assert.equal(cfp.lessons.length,15);assert.equal(cfp.lessons.slice(8).reduce((n,l)=>n+l.steps.length,0),93);
});

test('front controls remain distinct from source-identified internal SW8 and VR1',()=>{
 assert.equal(cfp.physicalKeys.length,8);assert.ok(!cfp.physicalKeys.some(k=>k.id==='ENGINEER'));
 assert.equal(cfp.internalControls.find(k=>k.id==='ENGINEER').boardLabel,'SW8');
 const vr1=cfp.internalControls.find(k=>k.id==='DELAY_MINUTES');assert.equal(vr1.boardLabel,'VR1');assert.equal(vr1.minimum,1);assert.equal(vr1.maximum,10);
 assert.equal(audit.mainPCBSource.pdfPage,16);assert.equal(audit.frontSource.pdfPage,6);
 assert.match(audit.sha256,/^[a-f0-9]{64}$/);assert.equal(data.sources.find(s=>s.id===audit.sourceId).sha256,audit.sha256);
});

test('all nine engineering targets follow the actual Figure12 S-shaped line',()=>{
 assert.deepEqual(cfp.engineering.functionOrder,['coincidence','nonlatching','delays','test','system-fault','repeater-fault','open-circuit','short-circuit','sounder-status']);
 assert.deepEqual(cfp.engineering.functions.map(f=>f.id),cfp.engineering.functionOrder);
 assert.deepEqual(cfp.engineering.delaySelection,['Z1','Z2','Z3','Z4','Z5','Z6','Z7','Z8','remote','auxiliary']);
 assert.deepEqual(cfp.engineering.coincidencePairs,['Z1-Z2','Z3-Z4','Z5-Z6','Z7-Z8']);
 assert.match(cfp.engineering.functions.find(f=>f.id==='system-fault').scope,/1 watchdog, 2 site-memory corruption, 3 PLL/);
 assert.equal(cfp.engineering.functions.filter(f=>f.kind==='diagnostic').length,4);
 for(const id of ['coincidence','nonlatching'])assert.match(cfp.engineering.functions.find(f=>f.id===id).warning,/non-compliant with EN54-2/);
});

test('new lessons cite actual engineering pages and use explicit cover, potentiometer and fictional-input actions',()=>{
 const lessons=cfp.lessons.slice(8),steps=lessons.flatMap(l=>l.steps);
 for(const lesson of lessons){assert.equal(new Set(lesson.steps.map(s=>s.id)).size,lesson.steps.length);assert.equal(lesson.steps[0].expectedCover,true);assert.equal(lesson.steps.at(-1).expectedCover,false);assert.deepEqual(lesson.steps.at(-1).conditions,{coverOpen:false,engineeringActive:false});}
 for(const step of steps){assert.ok(step.sourceRefs.length);for(const ref of step.sourceRefs){assert.equal(ref.sourceId,'cfp-engineer-rev1');assert.ok([14,15,16,17,19,21,22].includes(ref.pdfPage));assert.equal(ref.printedPage,String(ref.pdfPage));}assert.ok(!step.holdMs,'Engineering Next Option does not inherit the user three-second hold');}
 assert.deepEqual(steps.filter(s=>s.expectedDelayMinutes!==undefined).map(s=>s.expectedDelayMinutes),[2,1]);
 assert.ok(steps.some(s=>s.expectedInput?.type==='advance-time'&&s.expectedInput.seconds===1));
 assert.ok(steps.some(s=>s.expectedInput?.type==='system-fault'));
 assert.ok(steps.some(s=>s.expectedInput?.type==='repeater-fault'));
 assert.ok(steps.some(s=>s.expectedInput?.faultType==='open'));assert.ok(steps.some(s=>s.expectedInput?.faultType==='short'));
});

test('timing, cover and unconfirmed-draft evidence limits are explicit rather than hardware claims',()=>{
 assert.match(cfp.engineering.timingNote,/approximately one second on\/eight seconds off/);
 assert.match(cfp.engineering.timingNote,/pages 15 and 17/);
 assert.match(cfp.engineering.draftPolicyNote,/do not explicitly describe/);
 assert.match(cfp.limitations.join(' '),/Closing the training cover does not press Escape Access/);
 assert.match(cfp.limitations.join(' '),/electrical thresholds/);
});

test('the open-cover PCB asset is a hash-pinned crop of the checked manufacturer figure',()=>{
 const picture=JSON.parse(readFileSync(new URL('../research/cfp-level3-0.20.0/pcb-image-source.json',import.meta.url)));
 const catalogue=JSON.parse(readFileSync(new URL('../public/app/data/catalogue.json',import.meta.url))).records;
 assert.equal(picture.record_id,'c-tec-4b1267f3fefc');assert.equal(picture.source_sha256,catalogue.find(r=>r.id===picture.record_id).sha256);
 assert.equal(picture.source_sha256,audit.sha256);assert.equal(picture.pdf_page,16);assert.equal(picture.printed_page,'16');assert.match(picture.figure,/12/);
 assert.deepEqual(picture.crop_pdf_points,[110,160,450,331]);assert.deepEqual(picture.image_dimensions,[1020,513]);
 const bytes=readFileSync(new URL('../'+picture.asset,import.meta.url));assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');
 assert.equal(createHash('sha256').update(bytes).digest('hex'),picture.image_sha256);assert.match(picture.scope,/not a photograph of the complete enclosure/);
});
