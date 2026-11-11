import test from 'node:test';
import assert from 'node:assert/strict';
import {VERIFIED_DIAGNOSTIC_SOURCES,verifiedSourceEvidence,snapshotDiagnosticSource} from '../public/app/diagnostic-verified-sources.mjs';
import {FIELD_PROFILE_CANDIDATES} from '../public/app/field-profiles.mjs';
const paxton=VERIFIED_DIAGNOSTIC_SOURCES.find(v=>v.documentId==='APN-1086');
const manual={manualId:'uploaded-paxton',hash:paxton.sha256};
const context={manufacturer:'Paxton',model:'Net2 Plus',modelConfirmed:true,outputType:'voltage-free relay',switchingSide:'return',lockSupplyIdentified:true};

test('checked source provenance is pinned and cannot silently enable a legacy draft',()=>{
 assert.equal(VERIFIED_DIAGNOSTIC_SOURCES.length,6);
 for(const source of VERIFIED_DIAGNOSTIC_SOURCES){
  assert.match(source.sha256,/^[0-9a-f]{64}$/);assert.ok(source.revision);assert.ok(Object.isFrozen(source));
  for(const page of source.pages)assert.ok(page.number>=1&&page.number<=source.pageCount&&page.section&&page.excerpt);
  for(const fact of source.facts){assert.equal(fact.actionEnabled,false);assert.equal(fact.comparatorEnabled,false);for(const page of fact.pages)assert.ok(source.pages.some(p=>p.number===page));}
 }
 assert.ok(FIELD_PROFILE_CANDIDATES.every(v=>v.status==='draft'&&v.enabled===false));
});

test('manual names alone cannot create source authority; exact PDF bytes and actual equipment scope are needed',()=>{
 assert.deepEqual(verifiedSourceEvidence({manuals:[{title:paxton.title,manualId:paxton.recordId}],routeId:'A04',context}),[]);
 const result=verifiedSourceEvidence({manuals:[manual],routeId:'A04',context})[0];
 assert.equal(result.applicable,true);assert.equal(result.status,'document-reference');assert.equal(result.actionEnabled,false);
 assert.equal(result.source.manualId,'uploaded-paxton');assert.equal(result.source.pages[0].number,1);
 assert.match(result.summary,/relay click is not evidence/);
 const incomplete=verifiedSourceEvidence({manuals:[manual],routeId:'A04',context:{model:'Net2',modelConfirmed:false}})[0];
 assert.equal(incomplete.applicable,false);assert.ok(incomplete.missing.length);assert.ok(incomplete.conflicts.length);
 assert.equal(verifiedSourceEvidence({manuals:[manual],routeId:'F03',context}).length,0);
});

test('source contexts separate CFP detector capacitors from sounder resistor and AlarmSense',()=>{
 const source=VERIFIED_DIAGNOSTIC_SOURCES.find(v=>v.documentId==='DFU7004010');
 const base={manuals:[{hash:source.sha256}],context:{model:'CFP Standard',modelConfirmed:true,variant:'Standard',subsystem:'detector_zone'}};
 const detector=verifiedSourceEvidence({...base,routeId:'F01'})[0];assert.equal(detector.applicable,true);assert.match(detector.summary,/capacitor/);
 const sounder=verifiedSourceEvidence({...base,routeId:'F06'})[0];assert.equal(sounder.applicable,false);
 assert.equal(verifiedSourceEvidence({...base,context:{...base.context,model:'CFP AlarmSense',variant:'AlarmSense'},routeId:'F01'})[0].applicable,false);
});

test('Texecom nominal network requires actual one-NC EOL configuration and never supplies firmware bands',()=>{
 const source=VERIFIED_DIAGNOSTIC_SOURCES.find(v=>v.documentId==='INS176-15');
 const input={manuals:[{hash:source.sha256}],routeId:'I01',context:{model:'Premier Elite 48',modelConfirmed:true,wiringMode:'Double Pole/EOL',inputHardware:'onboard',detectorCount:1,contactType:'normally closed',tamperState:'closed'}};
 const result=verifiedSourceEvidence(input)[0];assert.equal(result.applicable,true);assert.match(result.summary,/not firmware acceptance bands/);
 for(const change of [{wiringMode:'TEOL'},{detectorCount:2},{tamperState:'open'},{model:'Premier Elite'}])assert.equal(verifiedSourceEvidence({...input,context:{...input.context,...change}})[0].applicable,false);
});

test('Galaxy reference does not infer profile from 996/1967 readings or treat an alarm state as cable open',()=>{
 const source=VERIFIED_DIAGNOSTIC_SOURCES.find(v=>v.documentId==='IE1-0063');
 const base={manuals:[{hash:source.sha256}],routeId:'I01',context:{model:'Galaxy Dimension 48',modelConfirmed:true,readings:[996,1967]}};
 const result=verifiedSourceEvidence(base)[0];assert.equal(result.applicable,false);assert.match(result.summary,/not proof of an open conductor/);
 const scoped=verifiedSourceEvidence({...base,context:{...base.context,wiringMode:'option 09 double-balanced',inputHardware:'compatible hardwired RIO',zoneOverride:'none',firmwareApplicabilityConfirmed:true}})[0];
 assert.equal(scoped.applicable,true);assert.equal(scoped.comparatorEnabled,false);
});

test('historical source snapshots survive later edits and keep uncertainty',()=>{
 const result=verifiedSourceEvidence({manuals:[manual],routeId:'A04',context:{...context,manualConflict:true}})[0];
 const snapshot=snapshotDiagnosticSource(result);assert.equal(snapshot.applicable,false);assert.match(snapshot.conflicts.join(' '),/Conflicting/);
 result.source.title='changed after export';assert.equal(snapshot.source.title,paxton.title);
 assert.equal(snapshotDiagnosticSource(null),null);
});
