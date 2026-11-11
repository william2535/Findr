import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FIELD_PROFILE_CANDIDATES,matchFieldProfile} from '../public/app/field-profiles.mjs';

const cfp={manufacturer:'C-TEC',model:'CFP Standard',modelConfirmed:true,variant:'4-zone Standard',firmware:'Recorded PCB revision',protocol:'conventional'};
const cfpScope={subsystem:'detector_zone',manualId:'DFU7004010',manualRevision:'Rev 4',operatingState:'standby',endComponent:'capacitor'};

test('candidate profiles are explicitly draft, immutable and contain no enabled limits or actions',()=>{
 assert.equal(FIELD_PROFILE_CANDIDATES.length,13);
 assert.equal(new Set(FIELD_PROFILE_CANDIDATES.map(p=>p.id)).size,13);
 for(const p of FIELD_PROFILE_CANDIDATES){
  assert.equal(p.status,'draft');assert.equal(p.enabled,false);assert.equal(p.verifiedByRole,null);assert.equal(p.verifiedDate,null);
  assert.ok(p.manualId);assert.ok(p.locator.section);assert.ok(p.sourceRefs.length);assert.ok(p.notes);
  for(const key of ['boundaries','thresholds','passLimits','buttonSequence','commands'])assert.equal(p[key],undefined);
 }
 assert.throws(()=>{FIELD_PROFILE_CANDIDATES[0].enabled=true},TypeError);
 assert.throws(()=>{FIELD_PROFILE_CANDIDATES[0].scope.protocol.push('Anything')},TypeError);
});

test('an exact recorded scope remains disabled even when callers claim verification',()=>{
 const result=matchFieldProfile(cfp,{...cfpScope,verifiedProfile:true,exactProfileVerified:true,status:'verified',enabled:true});
 assert.equal(result.status,'exact');assert.equal(result.profile.id,'ctec-cfp-standard-detector-zone');assert.equal(result.enabled,false);assert.equal(result.profile.status,'draft');assert.match(result.reason,/pending competent review/);
});

test('manufacturer, generic family and imported labels never establish an exact device profile',()=>{
 assert.equal(matchFieldProfile({manufacturer:'C-TEC'}).status,'family');
 assert.equal(matchFieldProfile({manufacturer:'C-TEC',model:'CFP'}).status,'family');
 assert.equal(matchFieldProfile({protocol:'XP95'}).status,'unmatched');
 const imported=matchFieldProfile({...cfp,provenance:'import'},cfpScope);
 assert.equal(imported.status,'family');assert.ok(imported.missing.includes('engineer-confirmed model label'));
 assert.equal(matchFieldProfile({...cfp,provenance:'import',fieldConfirmed:true},cfpScope).status,'exact');
});

test('CFP detector, sounder and AlarmSense scopes remain separate without reused end-component assumptions',()=>{
 const sounder=matchFieldProfile(cfp,{...cfpScope,subsystem:'sounder_output',endComponent:'resistor'});
 assert.equal(sounder.status,'exact');assert.equal(sounder.profile.id,'ctec-cfp-standard-sounder-output');
 const wrong=matchFieldProfile(cfp,{...cfpScope,endComponent:'resistor'});
 assert.equal(wrong.status,'ambiguous');assert.equal(wrong.enabled,false);assert.ok(wrong.conflicts.some(x=>/end component/.test(x)));
 const alarmSense=matchFieldProfile({manufacturer:'C-TEC',model:'CFP AlarmSense'},{...cfpScope,protocol:'AlarmSense'});
 assert.ok(alarmSense.candidates.every(p=>p.id==='ctec-cfp-alarmsense-zone'));assert.notEqual(alarmSense.status,'exact');
});

test('conflicting identities, manuals and protocol evidence cannot be silently resolved by the last value',()=>{
 for(const extra of [{manualConflict:true},{manualRevision:'Rev 99'},{manufacturer:'Apollo'},{subsystem:'detector_zone',protocol:'AlarmSense'}]){
  const result=matchFieldProfile(cfp,{...cfpScope,...extra});assert.notEqual(result.status,'exact');assert.equal(result.enabled,false);assert.ok(result.conflicts.length);
 }
 const apollo=matchFieldProfile({manufacturer:'Apollo',model:'Apollo Test Set',modelConfirmed:true,variant:'Recorded variant',firmware:'Recorded revision',protocol:'XP95'},{subsystem:'earth_search',manualId:'PP2625',manualRevision:'Issue 4',operatingState:'isolated',inputHardware:'Recorded field devices',isolatorCompatibility:'confirmed Soteria isolators'});
 assert.notEqual(apollo.status,'exact');assert.equal(apollo.enabled,false);assert.ok(apollo.conflicts.some(x=>/protocol/.test(x)));
});

test('Galaxy, Texecom wiring modes and Paxton cable-dependent candidates cannot share a comparator',()=>{
 const tex={manufacturer:'Texecom',model:'Premier Elite 48',modelConfirmed:true,variant:'Metal enclosure',firmware:'Recorded installed firmware'};
 const scope={subsystem:'zone_input',manualId:'INS176-15',manualRevision:'INS176-15',operatingState:'secure',inputHardware:'Recorded input board',wiringMode:'DEOL'};
 const deol=matchFieldProfile(tex,scope);assert.equal(deol.status,'exact');assert.equal(deol.profile.id,'texecom-premier-elite-deol');
 const teol=matchFieldProfile(tex,{...scope,wiringMode:'TEOL',detectorFaultMask:'Recorded separate supported states'});assert.equal(teol.status,'exact');assert.equal(teol.profile.id,'texecom-premier-elite-teol');
 const galaxy=matchFieldProfile({manufacturer:'Honeywell',model:'Galaxy Dimension'},scope);assert.notEqual(galaxy.status,'exact');assert.ok(galaxy.candidates.every(p=>!p.id.startsWith('texecom')));
 const net={manufacturer:'Paxton',model:'Net2 Plus',modelConfirmed:true,variant:'Recorded ACU',firmware:'Recorded revision',protocol:'RS485'};
 const bus={subsystem:'communications_bus',manualId:'APN-1061',manualRevision:'Recorded issue',operatingState:'isolated',wiringMode:'Documented bus',cableType:'CAT5'};
 const result=matchFieldProfile(net,bus);assert.equal(result.status,'exact');assert.equal(result.profile.id,'paxton-net2-rs485-cat5');assert.equal(result.enabled,false);
 assert.notEqual(matchFieldProfile(net,{...bus,protocol:'OSDP'}).status,'exact');
});

test('camera white-paper research cannot supply a specific camera or port power limit',()=>{
 const result=matchFieldProfile({manufacturer:'Axis',model:'Q1800-LE',modelConfirmed:true,variant:'Installed accessories',firmware:'Recorded firmware'},{subsystem:'camera_power',operatingState:'night',manualId:'Exact camera data sheet and supplying PSE manual required',manualRevision:'Recorded issue',accessories:'IR',powerMode:'IR active',pseModel:'Known switch',psePort:'SW2/7'});
 assert.equal(result.status,'family');assert.equal(result.enabled,false);assert.ok(result.missing.includes('model-specific source profile'));
});

test('linked record IDs exist in the current catalogue and retain their edition evidence',()=>{
 const catalogue=JSON.parse(readFileSync(new URL('../public/app/data/catalogue.json',import.meta.url),'utf8')).records;
 for(const profile of FIELD_PROFILE_CANDIDATES)for(const doc of profile.documents){
  const record=catalogue.find(r=>r.id===doc.recordId);assert.ok(record,doc.recordId);assert.ok(doc.match);assert.ok(doc.reason);
 }
 assert.equal(FIELD_PROFILE_CANDIDATES.find(p=>p.id==='advanced-mxpro5-loop-meter').documents[0].match,'document-family');
 assert.deepEqual(FIELD_PROFILE_CANDIDATES.find(p=>p.id==='gent-vigilon-loop-map').recordIds,[]);
});
