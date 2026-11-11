import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const load=name=>JSON.parse(readFileSync(new URL('../public/app/data/'+name+'.json',import.meta.url),'utf8'));
const data=load('conventional-fire'),panels=load('panels'),catalogue=load('catalogue').records;
const sources=new Map(data.sources.map(s=>[s.id,s])),profiles=new Map(data.profiles.map(p=>[p.id,p]));

test('conventional trainer scope names the two actual pictured panel profiles and checked document editions',()=>{
 assert.deepEqual([...profiles.keys()],['c-tec-cfp-standard','kentec-sigma-cp']);
 assert.equal(data.schemaVersion,1);assert.equal(data.sources.length,4);
 for(const profile of data.profiles){
  assert.equal(profile.zoneCount,8);assert.equal(profile.panelId,profile.id);
  const panel=panels.find(p=>p.id===profile.panelId);assert.ok(panel);assert.equal(profile.image,panel.image);
  assert.ok(existsSync(new URL('../public/app/panels/'+profile.image,import.meta.url)));
  assert.equal(profile.fixture.delaysConfigured,false);assert.ok(profile.limitations.length>=4);
 }
 assert.match(sources.get('cfp-user-rev2').revision,/Rev 2/);
 assert.match(sources.get('sigma-main-25').revision,/Issue 25/);
 assert.match(sources.get('sigma-user-06').revision,/Issue 06.*_05/);
});

test('manual links keep catalogue identities and distinguish a pinned archive from an unchecked download edition',()=>{
 for(const source of data.sources){
  const record=catalogue.find(r=>r.id===source.recordId);assert.ok(record,source.recordId);
  assert.equal(source.url,record.url);assert.match(source.sha256,/^[a-f0-9]{64}$/);
  assert.ok(source.bytes>10000);assert.ok(source.pages>0);assert.equal(source.checkedOn,'2026-11-02');
  if(source.catalogueHashVerified)assert.equal(source.sha256,record.sha256);
  else {assert.equal(record.sha256,null);assert.match(source.limitations,/edition|footer|cycle/i);}
 }
});

test('every actionable feature, physical key, scenario and lesson step has bounded PDF and printed-page evidence',()=>{
 const validate=refs=>{assert.ok(Array.isArray(refs)&&refs.length);for(const ref of refs){const source=sources.get(ref.sourceId);assert.ok(source,ref.sourceId);assert.ok(Number.isInteger(ref.pdfPage)&&ref.pdfPage>=1&&ref.pdfPage<=source.pages);assert.equal(ref.printedPage,String(ref.pdfPage));}};
 for(const profile of data.profiles){
  validate(profile.sourceRefs);const frontKeys=new Set(profile.physicalKeys.map(k=>k.id));assert.equal(frontKeys.size,8);const keys=new Set([...frontKeys,...(profile.internalControls||[]).filter(k=>['button','switch'].includes(k.type)).map(k=>k.id)]);
  for(const item of [...profile.physicalKeys,...profile.indicators,...profile.features,...profile.scenarios,...(profile.modes||[]),...(profile.internalControls||[]),...(profile.engineering?.functions||[]),...(profile.engineering?.configurationCodes||[]),...(profile.engineering?.diagnostics||[]),...(profile.callOuts||[])])validate(item.sourceRefs);
  assert.equal(new Set(profile.lessons.map(l=>l.id)).size,profile.lessons.length);
  for(const lesson of profile.lessons){assert.ok(profile.scenarios.some(s=>s.id===lesson.scenarioId));assert.ok(lesson.steps.length);for(const step of lesson.steps){validate(step.sourceRefs);assert.ok(step.instruction);for(const key of step.expectedKeys||[])assert.ok(keys.has(key),key);assert.ok(step.expectedKeys?.length||step.expectedInput||step.expectedMode||Object.hasOwn(step,'expectedCover')||Number.isInteger(step.expectedDelayMinutes)||step.expectedAction==='advance-test');}}
 }
 assert.equal(data.profiles.reduce((n,p)=>n+p.lessons.length,0),28);
});

test('CFP access training uses the visually checked numbered keys and explicit three-second selection',()=>{
 const p=profiles.get('c-tec-cfp-standard');
 assert.deepEqual(p.physicalKeys.filter(k=>k.codeDigit).map(k=>[k.id,k.codeDigit]),[['KEY_1','1'],['EXIT','2'],['NEXT_OPTION','3'],['TOGGLE','4']]);
 const lesson=p.lessons.find(l=>l.id==='cfp-code-access');assert.deepEqual(lesson.steps.slice(0,4).flatMap(s=>s.expectedKeys),['EXIT','KEY_1','TOGGLE','NEXT_OPTION']);
 assert.equal(p.physicalKeys.find(k=>k.id==='SOUNDERS').codeDigit,undefined);
 assert.equal(p.physicalKeys.find(k=>k.id==='RESET').codeDigit,undefined);
 const selection=p.lessons.flatMap(l=>l.steps).filter(s=>s.holdMs);assert.ok(selection.length>=3);assert.ok(selection.every(s=>s.holdMs===3000&&s.expectedKeys[0]==='NEXT_OPTION'));
 assert.equal(p.features.find(f=>f.id==='walk-test-reference').status,'implemented');
});

test('Sigma target training records the unknown cycle and version-specific warning rather than inventing it',()=>{
 const p=profiles.get('kentec-sigma-cp');assert.equal(p.modeCycleVerified,false);assert.equal(p.modeSelection,'documented-target-chooser');
 assert.deepEqual(p.modes.map(m=>m.id),['d','db','Ad','t']);assert.equal(p.features.find(f=>f.id==='mode-cycle').status,'training-shortcut');
 assert.match(p.fixture.softwareScope,/214/);assert.equal(p.fixture.activeDisabledWarning,true);
 for(const lesson of p.lessons.filter(l=>l.steps.some(s=>s.expectedMode))){const step=lesson.steps.find(s=>s.expectedMode);assert.match(step.instruction,/training shortcut/i);assert.equal(step.expectedKeys,undefined);}
 assert.match(p.limitations.join(' '),/few seconds/);assert.match(p.limitations.join(' '),/Write Enable/);assert.equal(p.features.find(f=>f.id==='write-enable').status,'implemented');
});
