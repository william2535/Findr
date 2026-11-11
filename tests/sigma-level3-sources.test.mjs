import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const data=read('public/app/data/conventional-fire.json'),audit=read('research/sigma-level3-0.21.0/source-audit.json');
const sigma=data.profiles.find(p=>p.id==='kentec-sigma-cp'),cfp=data.profiles.find(p=>p.id==='c-tec-cfp-standard');
const sorted=v=>Array.isArray(v)?v.map(sorted):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sorted(v[k])])):v;
const hash=v=>createHash('sha256').update(JSON.stringify(sorted(v))).digest('hex');
const codes=new Map(sigma.engineering.configurationCodes.map(c=>[c.code,c]));

test('Sigma extension preserves the complete CFP profile and all eight previous Sigma lessons',()=>{
 assert.equal(hash(cfp),audit.preservation.cfpProfileSha256);
 assert.equal(hash(sigma.lessons.slice(0,8)),audit.preservation.legacySigmaLessonsSha256);
 assert.deepEqual(sigma.lessons.slice(0,8).map(l=>l.id),audit.preservation.originalSigmaLessonIds);
 assert.deepEqual(sigma.physicalKeys.map(k=>k.id),audit.preservation.originalFrontControlIds);
 assert.equal(sigma.lessons.length,13);assert.equal(sigma.lessons.slice(8).reduce((n,l)=>n+l.steps.length,0),79);
});

test('Sigma source catalogue retains every table8 code and distinguishes supported effects from conditional references',()=>{
 const wanted=[...Array.from({length:10},(_,i)=>String(i).padStart(2,'0')),'10','11','12',...Array.from({length:9},(_,i)=>String(21+i)),'2A',...['3','4','5','6','7','8','9','A','C','E'].flatMap(prefix=>Array.from({length:8},(_,i)=>prefix+(i+1)))];
 assert.equal(codes.size,103);assert.deepEqual([...codes.keys()],wanted);
 assert.equal([...codes.values()].filter(c=>c.status==='implemented').length,48);
 assert.equal([...codes.values()].filter(c=>c.status==='reference-only').length,55);
 for(const id of ['11','12','24','25','27','28','2A','51','61','71','A1','C1','E1'])assert.equal(codes.get(id).status,'reference-only',id);
 for(const id of ['00','01','09','10','21','22','23','26','29','31','38','41','48','81','88','91','98'])assert.equal(codes.get(id).status,'implemented',id);
 assert.match(codes.get('51').scope,/ancillary/);assert.match(codes.get('61').scope,/threshold/);assert.match(codes.get('71').scope,/threshold/);
 assert.match(codes.get('2A').firmwareMinimum,/215/);assert.match(codes.get('C1').firmwareMinimum,/242/);assert.match(codes.get('E1').firmwareMinimum,/242/);
 const marked=['21','22',...['7','8','A','E'].flatMap(prefix=>Array.from({length:8},(_,i)=>prefix+(i+1)))];
 assert.deepEqual([...codes.values()].filter(c=>c.warning).map(c=>c.code),marked);
 for(const code of marked)assert.match(codes.get(code).warning,/not complying with EN54-2/);
});

test('level3 controls keep actual aperture, conceptual switch positions and unresolved source directions distinct',()=>{
 assert.ok(!sigma.physicalKeys.some(k=>['WRITE_ENABLE','WATCHDOG_RESET','PROCESSOR_RESET'].includes(k.id)));
 assert.equal(sigma.internalControls.find(c=>c.id==='WRITE_ENABLE').type,'switch');
 assert.match(sigma.internalControls.find(c=>c.id==='WATCHDOG_RESET').placement,/Conceptual/);
 assert.equal(sigma.internalControls.find(c=>c.id==='PROCESSOR_RESET').type,'reference');
 assert.match(sigma.engineering.entryDirectionNote,/page 16.*RIGHT.*page 19.*RIGHT/);
 assert.match(sigma.engineering.selectionNote,/initial display, wrap and alphabetic-bank/);
 assert.match(sigma.engineering.unsetNote,/does not explicitly/);
 assert.match(sigma.engineering.coverNote,/does not operate Write Enable/);
 assert.equal(sigma.modeCycleVerified,false);assert.equal(sigma.modeSelection,'documented-target-chooser');
});

test('call-outs name whole-zone isolation and physical detector work without inventing enrolment or recorded repairs',()=>{
 assert.equal(sigma.callOuts.length,5);assert.equal(new Set(sigma.callOuts.map(c=>c.id)).size,5);
 for(const callout of sigma.callOuts){assert.ok(sigma.lessons.some(l=>l.id===callout.lessonId));assert.ok(callout.sourceRefs.length);assert.ok(callout.scope);}
 assert.match(sigma.callOuts.find(c=>c.id==='disable-device-zone').scope,/whole zone, not an individual addressed device/);
 assert.match(sigma.callOuts.find(c=>c.id==='add-replace-device').scope,/No detector enrolment/);
 assert.match(sigma.callOuts.find(c=>c.id==='add-replace-device').scope,/fictional, never proof/);
 const lesson=sigma.lessons.find(l=>l.id==='sigma-add-replace-detector'),checkpoint=lesson.steps.find(s=>s.expectedInput?.type==='checkpoint');
 assert.match(checkpoint.instruction,/fictional work checkpoint only/);assert.match(checkpoint.instruction,/neither adds an addressed device nor certifies/);
 assert.ok(lesson.steps.some(s=>s.conditions.zoneDisabled?.value===true));assert.ok(lesson.steps.some(s=>s.conditions.zoneDisabled?.value===false));assert.ok(lesson.steps.some(s=>s.conditions.zoneTest?.value===false));
 assert.equal(lesson.steps.at(-1).conditions.normal,true);
});

test('new Sigma lessons and internal faults retain concrete source pages and explicit synthetic actions',()=>{
 const allowed=new Set([6,7,11,15,16,17,19,23]);
 for(const lesson of sigma.lessons.slice(8))for(const step of lesson.steps){assert.ok(step.sourceRefs.length);for(const r of step.sourceRefs){assert.equal(r.sourceId,'sigma-main-25');assert.ok(allowed.has(r.pdfPage)||r.pdfPage===3);assert.equal(r.printedPage,String(r.pdfPage));}}
 assert.equal(sigma.engineering.diagnostics.length,10);
 assert.deepEqual(sigma.engineering.diagnostics.map(d=>d.id),['mains-fail','batt-fail','cpu','aux-24v','batt-low','earth','system-fuse','s1','s2','comms']);
 const steps=sigma.lessons.slice(8).flatMap(l=>l.steps);
 assert.ok(steps.some(s=>s.expectedInput?.type==='sigma-training-reset'));assert.ok(steps.some(s=>s.expectedInput?.type==='sigma-configuration-target'));
 assert.ok(steps.some(s=>s.expectedInput?.type==='advance-time'&&s.expectedInput.seconds===60));
 assert.ok(steps.some(s=>s.expectedKeys?.includes('WATCHDOG_RESET')));assert.ok(!steps.some(s=>s.expectedKeys?.includes('PROCESSOR_RESET')));
 assert.match(sigma.engineering.timingNote,/few seconds/);assert.match(sigma.engineering.timingNote,/20 seconds/);
});

test('cover-off switch figure is an authentic hash-pinned crop of the checked Kentec manual',()=>{
 const image=read('research/sigma-level3-0.21.0/write-enable-image-source.json');
 const source=data.sources.find(s=>s.id==='sigma-main-25');assert.equal(source.sha256,audit.sha256);
 assert.equal(image.recordId,source.recordId);assert.equal(image.sourceSha256,source.sha256);
 assert.equal(image.pdfPage,16);assert.equal(image.printedPage,'16');assert.match(image.figure,/8/);
 assert.deepEqual(image.cropPoints,[34,479,454,628]);assert.deepEqual([image.width,image.height],[1260,447]);
 const bytes=readFileSync(new URL('../'+image.asset,import.meta.url));assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');
 assert.equal(createHash('sha256').update(bytes).digest('hex'),image.assetSha256);
 assert.match(image.description,/plate|aperture/);assert.equal(source.catalogueHashVerified,false);
});
