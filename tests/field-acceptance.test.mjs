import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ensureFieldVisit,createIncident,addTestEvent,addImpairment,updateImpairment,normalizeResult,exportFieldVisit,createReturnVisit,searchVisits} from '../public/app/field-model.mjs';
import {getNextFieldStep,evaluateTestEligibility,recordFieldAnswer,validateProvingDead,compareTestEvents,localisePath,getRestorationStatus,validateFinding,interpretCoaxObservation} from '../public/app/field-engine.mjs';
import {FIELD_ROUTES,getRoute,getRule,TEST_TEMPLATES} from '../public/app/field-routes.mjs';
import {FIELD_PROFILE_CANDIDATES,matchFieldProfile} from '../public/app/field-profiles.mjs';

// Every record, identity and measured value below is a labelled synthetic test.
// Numbers are preservation fixtures, never equipment thresholds or approved methods.
const fixtures=JSON.parse(readFileSync(new URL('./fixtures/field-visits/synthetic-visits.json',import.meta.url),'utf8'));
const now=1792484040000;
const copy=value=>structuredClone(value);
function visitFor(routeId='P06',overrides={}){
 let visit=ensureFieldVisit(copy(fixtures.radial),now);
 if(!visit.incidents.length)visit=createIncident(visit,{id:'synthetic-incident',systemTypes:['fire'],exactComplaint:'SYNTHETIC open circuit',currentSymptomState:'showing_now',provenance:'engineer_observation'},now);
 const incident=visit.incidents[0];Object.assign(incident,{routeId,safety:{immediateRisk:false},permissions:{readOnly:true},context:{topology:'unknown'},...copy(overrides)});
 return visit;
}
const first=visit=>visit.incidents[0];
const sessionFor=visit=>({...copy(fixtures.radial),fieldVisit:visit});
function event(visit,id,rawText='0.00',extra={}){
 return addTestEvent(visit,{id,incidentId:first(visit).id,assetIds:['synthetic-point'],actor:'SYNTHETIC engineer',testKind:'voltage',method:'across_device',points:[{assetId:'synthetic-point',terminal:'+'},{assetId:'synthetic-point',terminal:'-'}],circuitState:'energised_connected',operatingState:'standby',result:{rawText,unit:'V DC',source:'meter',executionState:'performed'},...extra},now);
}
function answer(visit,ruleId,value,reason=''){return recordFieldAnswer(visit,{incidentId:first(visit).id,ruleId,answer:value,reason,now});}
function textOf(step){return [step.question,step.why,step.reason,step.message,step.rule?.question,step.rule?.why].filter(Boolean).join(' ');}
const template=id=>TEST_TEMPLATES.find(item=>item.id===id)||{id,requires:[]};
const physical={electricalState:'isolated',allSourcesIdentified:true,bothEndsConfirmed:true,isolatedSpanConfirmed:true,connectedEquipment:'none',storedEnergyControlled:true,parallelPathsKnown:true,suitableInstrument:true,safeAccess:true,competenceConfirmed:true,procedure:'SYNTHETIC exact procedure',sourceType:'dc'};

test('T01 legacy free-text case remains readable, exportable and idempotent without invented dates or model',()=>{
 const old=copy(fixtures.legacy),visit=ensureFieldVisit(old,now),again=ensureFieldVisit({...old,fieldVisit:visit},now+10000);
 assert.deepEqual(again,visit);assert.deepEqual(old,fixtures.legacy);
 const exported=exportFieldVisit({...old,fieldVisit:visit},{format:'text',redact:false});assert.ok(exported.includes(old.notes));
 assert.equal(visit.events.some(item=>item.eventTime===now||item.eventTime===new Date(now).toISOString()),false,'Missing event time is not the migration time');
 assert.equal(JSON.stringify(visit).includes('Kentec'),false,'Unknown identity is not inferred');
});

test('T02 unknown open-circuit scope requests topology/evidence, never an address-derived interval or limit',()=>{
 const visit=visitFor('P06'),step=getNextFieldStep(visit,first(visit).id);assert.ok(['question','clarification','manual'].includes(step.kind));assert.match(textOf(step),/radial|physical|topolog|route|indication/i);
 assert.doesNotMatch(textOf(step),/between (?:device |address )?10 and (?:device |address )?11|\b\d+(?:\.\d+)?\s*(?:Ω|ohms?|V DC)\b/i);
});

test('T04 return loop open with all devices present retains integrity fault and seeks directional evidence',()=>{
 let visit=visitFor('F03',{context:{topology:'return_loop',expectedDevices:100,seenDevices:100,physicalPathConfirmed:true}});
 const firstStep=getNextFieldStep(visit,first(visit).id);assert.match(textOf(firstStep),/return|loop|path/i);
 visit=answer(visit,'F03.Q1','yes');const next=getNextFieldStep(visit,first(visit).id);assert.match(textOf(next),/direction|diagnostic|map|outgoing|incoming|physical/i);
 assert.notEqual(first(visit).diagnosisState,'resolved');assert.doesNotMatch(textOf(next),/fault (?:is )?cleared|all devices.*(?:means|proves).*healthy/i);
});

test('T07 absent mains authority offers safe evidence while three mains pairs may be recorded as untested',()=>{
 let visit=visitFor('P02',{context:{...physical,electricalState:'energised',sourceType:'mains'},permissions:{readOnly:true,energised:false}});
 const eligibility=evaluateTestEligibility(visit,first(visit),{id:'mains_verification',requires:['energised']});assert.equal(eligibility.allowed,false);
 for(const [index,pair] of ['L–N','L–PE','N–PE'].entries())visit=event(visit,'synthetic-mains-'+index,'not tested',{testKind:'mains_verification',points:[{terminal:pair}],result:{rawText:'not tested',unit:'V AC',source:'human_report',executionState:'not_permitted'}});
 const report=exportFieldVisit(sessionFor(visit),{format:'text',redact:false});for(const pair of ['L–N','L–PE','N–PE'])assert.ok(report.includes(pair));assert.match(report,/not tested/);assert.notEqual(first(visit).diagnosisState,'cause_verified');
});

test('T09 resistance is suppressed with unknown power, remaining battery or unidentified remote source; historical evidence survives',()=>{
 for(const context of [{...physical,electricalState:'unknown'},{...physical,electricalState:'energised',batteryConnected:true},{...physical,allSourcesIdentified:false}]){
  let visit=visitFor('I01',{context,permissions:{readOnly:true,isolation:true,energised:true}});
  assert.equal(evaluateTestEligibility(visit,first(visit),template('resistance')).allowed,false);
  visit=event(visit,'synthetic-historical-high','high',{testKind:'resistance',circuitState:'unknown',result:{rawText:'high',unit:'Ω',source:'human_report',executionState:'performed'},interpretation:{status:'unverified',reason:'Historical method not established'}});
  assert.equal(visit.events.at(-1).result.rawText,'high');assert.notEqual(visit.events.at(-1).interpretation?.status,'pass');
 }
});

test('T13 inaccessible expander step is recorded and not repeated unchanged',()=>{
 let visit=visitFor('I01');const initial=getNextFieldStep(visit,first(visit).id);assert.ok(initial.rule?.id);
 visit=answer(visit,initial.rule.id,'blocked','SYNTHETIC expander room locked; keyholder needed');const next=getNextFieldStep(visit,first(visit).id);
 assert.notEqual(next.rule?.id,initial.rule.id);assert.ok(JSON.stringify(visit.events).includes('expander room locked'));assert.notEqual(first(visit).diagnosisState,'cause_verified');
});

test('T14 denied access and granted access take different evidence routes without diagnosing a PSU or door release',()=>{
 const base=visitFor('A04',{systemTypes:['access']});
 const denied=answer(base,'A04.Q1','no'),granted=answer(base,'A04.Q1','yes');
 const noStep=getNextFieldStep(denied,first(denied).id),yesStep=getNextFieldStep(granted,first(granted).id);
 assert.notEqual(noStep.rule?.id,yesStep.rule?.id);assert.match(noStep.routeId||noStep.rule?.routeId||'',/^A0[13]$/);assert.match(textOf(yesStep),/relay|lock|drive|voltage|command/i);
 assert.doesNotMatch(textOf(yesStep),/PSU (?:has )?failed|door (?:has )?released/i);assert.notEqual(first(granted).diagnosisState,'cause_verified');
});

test('T15 failed required escape overrides a successful relay observation and blocks routine closure',()=>{
 let visit=visitFor('A05',{systemTypes:['access'],safety:{requiredEscapeFailure:true}});visit=event(visit,'synthetic-relay','changed',{testKind:'contact',result:{rawText:'changed',source:'visual',executionState:'performed'}});
 const step=getNextFieldStep(visit,first(visit).id);assert.equal(step.kind,'emergency');assert.match(textOf(step),/escape|emergency|responsible|response/i);
 const restoration=getRestorationStatus(visit);assert.notEqual(restoration.status,'verified');assert.notEqual(restoration.status,'restored');
});

test('T17 cleared ASD warning retains original pipe/time evidence and avoids declaring it fixed',()=>{
 let visit=visitFor('F09',{currentSymptomState:'cleared_before_arrival',exactComplaint:'SYNTHETIC pipe 2 low flow restored at 07:48'});
 visit=event(visit,'synthetic-asd-history','Pipe 2 low flow, restored 07:48',{testKind:'display',result:{rawText:'Pipe 2 low flow, restored 07:48',source:'panel',executionState:'performed'}});
 const step=getNextFieldStep(visit,first(visit).id);assert.ok(['question','clarification','manual','handover'].includes(step.kind));assert.match(textOf(step),/pipe|history|event|flow|time/i);assert.notEqual(first(visit).diagnosisState,'cause_verified');
 assert.ok(exportFieldVisit(sessionFor(visit),{format:'text',redact:false}).includes('07:48'));
});

test('T23 specialist circuits without authority offer safe evidence rather than physical tests',()=>{
 for(const safety of [{hazardousArea:true},{intrinsicallySafe:true},{suppressionRelease:true}]){
  const visit=visitFor('F15',{safety,context:physical,permissions:{readOnly:true,isolation:true,energised:true,specialist:false}});
  assert.equal(evaluateTestEligibility(visit,first(visit),{id:'specialist_test',requires:['specialist','isolation']}).allowed,false);
  const step=getNextFieldStep(visit,first(visit).id);assert.notEqual(step.template?.id,'resistance');assert.notEqual(step.template?.id,'functional');
 }
});

test('T24 readings at different load states remain separate and cannot silently establish voltage drop',()=>{
 let visit=visitFor('P04');visit=event(visit,'synthetic-standby','24.00',{loadState:'standby',powerDomain:'SYNTHETIC PSU1',comparisonId:'synthetic-pair'});visit=event(visit,'synthetic-alarm','20.00',{loadState:'alarm',operatingState:'alarm',powerDomain:'SYNTHETIC PSU1',comparisonId:'synthetic-pair'});
 const a=visit.events.at(-2),b=visit.events.at(-1),comparison=compareTestEvents(a,b,{kind:'voltage_drop'});
 assert.equal(comparison.comparable,false);assert.equal(b.supersedes,undefined);assert.deepEqual([a.result.rawText,b.result.rawText],['24.00','20.00']);
});

test('T25 repeated unknown and blocked answers stay unknown and exit rather than become failed checks',()=>{
 let visit=visitFor('P06');const initial=getNextFieldStep(visit,first(visit).id);visit=answer(visit,initial.rule.id,'unknown');let next=getNextFieldStep(visit,first(visit).id);
 if(next.kind==='question'&&next.rule?.id){visit=answer(visit,next.rule.id,'unknown');next=getNextFieldStep(visit,first(visit).id);}
 assert.ok(['manual','handover','clarification','question'].includes(next.kind));if(next.kind==='question')assert.notEqual(next.rule?.id,initial.rule.id);
 const answers=visit.events.filter(item=>item.answer||item.result?.rawText==='unknown');assert.ok(answers.length);assert.equal(answers.some(item=>item.answer==='no'||item.result?.rawText==='no'),false);
});

test('T26 reset or substitution alone cannot verify cause',()=>{
 let visit=visitFor('P09');visit=event(visit,'synthetic-reset','Fault cleared after reset',{testKind:'observation',result:{rawText:'Fault cleared after reset',source:'visual',executionState:'performed'}});
 const finding={id:'synthetic-finding',text:'SYNTHETIC faulty controller',state:'cause_verified',evidenceForIds:['synthetic-reset'],verificationTestIds:[],verifiedBy:'SYNTHETIC engineer'};
 const checked=validateFinding(visit,finding);assert.equal(checked.allowed??checked.valid,false);assert.notEqual(first(visit).diagnosisState,'cause_verified');
});

test('T27 retried event save is idempotent and serialized offline visit preserves the exact current record',()=>{
 let visit=visitFor('A04');visit=event(visit,'synthetic-retry','12.10');const saved=copy(visit);visit=event(visit,'synthetic-retry','12.10');assert.deepEqual(visit,saved);
 const reopened=ensureFieldVisit(JSON.parse(JSON.stringify(sessionFor(visit))),now+10000);assert.deepEqual(reopened,visit);
});

test('T28 historical rule/source revision and interpretation survive a later read',()=>{
 let visit=visitFor('F03');visit=event(visit,'synthetic-old-rule','Open',{ruleId:'F03.Q1',ruleRevision:'synthetic-old-1',ruleSnapshot:{id:'F03.Q1',revision:'synthetic-old-1',question:'SYNTHETIC earlier wording'},sourceProfileId:'synthetic-previous-profile',interpretation:{status:'recorded_only',reason:'SYNTHETIC earlier interpretation'}});
 const reopened=ensureFieldVisit(sessionFor(visit),now+100000),old=reopened.events.find(item=>item.id==='synthetic-old-rule');assert.equal(old.ruleRevision,'synthetic-old-1');assert.equal(old.ruleSnapshot.question,'SYNTHETIC earlier wording');assert.equal(old.interpretation.reason,'SYNTHETIC earlier interpretation');
});

test('T29 dated imported wording does not replace an engineer-confirmed location or imply cable order',()=>{
 const imported={...copy(fixtures.radial),importedContext:{node:'01',loop:'01',address:'037',location:'SYNTHETIC old reception',importedAt:1,filename:'synthetic.csv'}};
 let visit=ensureFieldVisit(imported,now);visit.assets.push({id:'synthetic-confirmed-asset',label:'SYNTHETIC Device 37',location:'SYNTHETIC current store',locationProvenance:'engineer_observation',edges:[]});
 visit=ensureFieldVisit({...imported,fieldVisit:visit},now+1000);const asset=visit.assets.find(item=>item.id==='synthetic-confirmed-asset');assert.equal(asset.location,'SYNTHETIC current store');assert.deepEqual(asset.edges,[]);assert.ok(JSON.stringify(visit).includes('SYNTHETIC old reception'));
});

test('T33 several systems may share a dependency but keep individual incident verification',()=>{
 let visit=visitFor('P03',{systemTypes:['fire'],diagnosisState:'unresolved'});
 visit=createIncident(visit,{id:'synthetic-door-incident',systemTypes:['access'],exactComplaint:'SYNTHETIC door release unavailable',currentSymptomState:'showing_now',diagnosisState:'unresolved',assetRefs:['synthetic-shared-psu']},now);
 visit=createIncident(visit,{id:'synthetic-video-incident',systemTypes:['cctv'],exactComplaint:'SYNTHETIC recording absent',currentSymptomState:'showing_now',diagnosisState:'unresolved',assetRefs:['synthetic-shared-psu']},now);
 first(visit).diagnosisState='function_restored';assert.equal(visit.incidents.at(-1).diagnosisState,'unresolved');assert.equal(visit.incidents.at(-2).diagnosisState,'unresolved');
 visit=event(visit,'synthetic-only-fire-retest','SYNTHETIC fire response checked',{testKind:'functional',verification:{passed:true}});for(const incident of visit.incidents){incident.verificationState='function_restored';incident.verificationEventIds=['synthetic-only-fire-retest'];}visit.handover.verificationEventIds=['synthetic-only-fire-retest'];visit.handover.siteAcknowledgement='SYNTHETIC responsible role';visit.handover.monitoringNotApplicable=true;assert.equal(getRestorationStatus(visit).fullyRestored,false,'One system retest cannot verify other incident functions');
});

test('T34 credible fire, shock or required escape loss takes precedence over every selected route',()=>{
 for(const safety of [{fire:true},{smoke:true},{electricShock:true},{requiredEscapeFailure:true}]){
  const visit=visitFor('C08',{systemTypes:['cctv'],safety}),step=getNextFieldStep(visit,first(visit).id);assert.equal(step.kind,'emergency');assert.equal(evaluateTestEligibility(visit,first(visit),template('voltage')).allowed,false);
 }
});

test('T36 a manually logged test and a linked retest both remain in the same incident timeline',()=>{
 let visit=visitFor('P08');visit=event(visit,'synthetic-manual','0.00',{ruleId:undefined,suggestionId:undefined});visit=event(visit,'synthetic-retest','0.10',{repeats:'synthetic-manual',operatingState:'standby'});
 assert.equal(visit.events.at(-1).repeats,'synthetic-manual');assert.equal(visit.events.at(-1).supersedes,undefined);assert.equal(visit.events.filter(item=>['synthetic-manual','synthetic-retest'].includes(item.id)).length,2);
 const report=exportFieldVisit(sessionFor(visit),{format:'text',redact:false});assert.ok(report.includes('0.00')&&report.includes('0.10'));
});

test('T05 detector-zone and sounder EOL scopes stay distinct and a temporary termination remains outstanding',()=>{
 const detector=FIELD_PROFILE_CANDIDATES.find(p=>p.id==='ctec-cfp-standard-detector-zone'),sounder=FIELD_PROFILE_CANDIDATES.find(p=>p.id==='ctec-cfp-standard-sounder-output');
 assert.deepEqual(detector.scope.endComponent,['capacitor']);assert.deepEqual(sounder.scope.endComponent,['resistor']);assert.equal(detector.enabled,false);assert.equal(sounder.enabled,false);
 let visit=visitFor('F01');visit=addImpairment(visit,{id:'synthetic-local-eol',affectedAssetOrFunction:'SYNTHETIC zone 3 temporary local termination',existingOrIntroduced:'introduced',owner:'SYNTHETIC engineer',measures:'SYNTHETIC approved cover',authorisedByRole:'SYNTHETIC responsible person',reviewBy:'2026-10-20T12:00:00Z'},now);
 assert.equal(visit.impairments[0].restoredAt,null);assert.deepEqual(visit.impairments[0].verificationEventIds,[]);assert.match(exportFieldVisit(sessionFor(visit),{format:'text',redact:false}),/restoration: not confirmed/);
});

test('T06 addressable mixed/XP95 equipment never enables a Soteria earth-search or generic voltage pass',()=>{
 const profile=matchFieldProfile({manufacturer:'Apollo',model:'XP95',protocol:'XP95'},{subsystem:'earth_search',modelConfirmed:true});assert.equal(profile.enabled,false);
 const visit=visitFor('F07',{context:{...physical,protocol:'XP95',exactProfileVerified:true},permissions:{isolation:true,energised:true,readOnly:true}});
 assert.equal(evaluateTestEligibility(visit,first(visit),{id:'earth_search',requires:['exactProfile']}).allowed,false);
 assert.equal(FIELD_PROFILE_CANDIDATES.some(p=>p.enabled),false,'No draft comparator is executable');
});

test('T10 zero, OL, missing, fluctuating and unknown stay distinct; normalisation retains original kΩ precision',()=>{
 const results=fixtures.rawResults.map(normalizeResult);assert.equal(results[0].kind,'numeric');assert.equal(results[0].value,0);assert.equal(results[1].kind,'overrange');assert.equal(results[1].value,undefined);assert.equal(results[3].kind,'fluctuating');
 for(const index of [2,4,5]){assert.equal(results[index].kind,'unavailable');assert.equal(results[index].value,undefined);}
 assert.equal(results[6].rawText,'1.967');assert.equal(results[6].unit,'kΩ');assert.equal(results[6].normalizedValue,1967);assert.equal(results[6].normalizedUnit,'Ω');assert.equal(results[6].precision,3);
 let visit=visitFor('I01');for(const [index,result]of fixtures.rawResults.entries())visit=event(visit,'synthetic-result-'+index,result.rawText,{result});
 const reopened=ensureFieldVisit(JSON.parse(JSON.stringify(sessionFor(visit))));assert.deepEqual(reopened.events.map(e=>e.result.rawText),fixtures.rawResults.map(r=>r.rawText));
 const report=exportFieldVisit(sessionFor(reopened),{format:'text',redact:false});for(const raw of ['OL','no reading','fluctuating','not tested','unknown','1.967'])assert.ok(report.includes(raw));
});

test('T11 unknown input profile preserves panel transitions without diagnosing a bare cable or enabling an unreviewed range',()=>{
 let visit=visitFor('I01',{context:{electricalState:'unknown',bothEndsConfirmed:false,inputHardware:'Unknown',wiringMode:'Unknown'}});
 visit=event(visit,'synthetic-door-closed','996',{testKind:'display',operatingState:'door_closed',result:{rawText:'996',unit:'Ω',source:'panel',executionState:'performed'}});
 visit=event(visit,'synthetic-door-open','1967',{testKind:'display',operatingState:'door_open',result:{rawText:'1967',unit:'Ω',source:'panel',executionState:'performed'}});
 assert.equal(evaluateTestEligibility(visit,first(visit),template('resistance')).allowed,false);
 const matched=matchFieldProfile({manufacturer:'Honeywell',model:'Galaxy Dimension 48'},{wiringMode:'option 09 double-balanced'});assert.equal(matched.enabled,false);
 assert.equal(visit.events.some(e=>/short|pass|cause_verified/.test(e.interpretation?.status||'')),false);assert.deepEqual(visit.events.map(e=>e.result.rawText),['996','1967']);
});

test('T12 DEOL and TEOL retain separate candidate scopes and no cross-manufacturer resistance bands',()=>{
 const deol=FIELD_PROFILE_CANDIDATES.find(p=>p.id==='texecom-premier-elite-deol'),teol=FIELD_PROFILE_CANDIDATES.find(p=>p.id==='texecom-premier-elite-teol');assert.ok(deol&&teol);assert.notDeepEqual(deol.scope.wiringMode,teol.scope.wiringMode);
 for(const p of [deol,teol]){assert.equal(p.status,'draft');assert.equal(p.enabled,false);assert.equal(p.boundaries,undefined);}
 const galaxy=matchFieldProfile({manufacturer:'Honeywell',model:'Galaxy Dimension 48'},{wiringMode:'DEOL',manualId:'INS176-15'});assert.equal(galaxy.enabled,false);assert.equal(galaxy.candidates.some(p=>p.manufacturer==='Texecom'),false);
});

test('T16 switched-return lock and dry-contact evidence is kept without an assumed positive COM supply',()=>{
 let visit=visitFor('A04',{systemTypes:['access'],context:{switchingSide:'return',relayType:'dry_contact',independentLockSupply:true}});
 visit=event(visit,'synthetic-com-zero','0.00',{testKind:'voltage',method:'terminal_to_reference',points:[{terminal:'COM',assetId:'synthetic-relay'},{terminal:'0 V',assetId:'synthetic-lock-psu'}]});
 assert.equal(visit.events.at(-1).result.value,0);assert.equal(visit.events.at(-1).interpretation.status,'recorded_only');
 const route=getRoute('A04');assert.match(route.sourceBrief||route.summary,/dry|volt.free/i);assert.match(route.sourceBrief||route.summary,/return|negative/i);assert.notEqual(first(visit).diagnosisState,'cause_verified');
});

test('T19 link-up with blocked ICMP seeks identity/recorder evidence and never treats ping as proof',()=>{
 const visit=visitFor('C03',{systemTypes:['cctv'],context:{linkState:'up',icmpBlocked:true,recorderState:'offline'}}),step=getNextFieldStep(visit,first(visit).id);
 assert.ok(['question','clarification'].includes(step.kind));assert.match(textOf(step),/network|recorder|identity|reach|address|code/i);assert.doesNotMatch(textOf(step),/(?:disable|turn off) (?:the )?firewall/i);assert.notEqual(first(visit).diagnosisState,'cause_verified');
});

test('T20 live video without playback remains a recording investigation, not proof of retained footage',()=>{
 let visit=visitFor('C08',{systemTypes:['cctv']});visit=event(visit,'synthetic-live','Live view present',{testKind:'network',result:{rawText:'Live view present',source:'visual',executionState:'performed'}});visit=event(visit,'synthetic-missing-clip','No clip at test time',{testKind:'playback',result:{rawText:'No clip at test time',source:'visual',executionState:'performed'}});
 const step=getNextFieldStep(visit,first(visit).id);assert.match(textOf(step),/record|playback|clock|time|channel|clip/i);assert.doesNotMatch(textOf(step),/format (?:the )?disk|factory reset/i);
 assert.notEqual(first(visit).diagnosisState,'cause_verified');assert.equal(visit.events.at(-1).result.rawText,'No clip at test time');
});

test('T30 restoring an introduced impairment cannot erase a pre-existing disablement',()=>{
 let visit=visitFor('F01');visit=addImpairment(visit,{id:'synthetic-existing',affectedAssetOrFunction:'SYNTHETIC existing disabled zone 8',existingOrIntroduced:'existing'},now);
 visit=addImpairment(visit,{id:'synthetic-introduced',affectedAssetOrFunction:'SYNTHETIC temporary zone 3 termination',existingOrIntroduced:'introduced',owner:'SYNTHETIC engineer'},now);const previous=copy(visit.impairments[0]);
 visit=event(visit,'synthetic-retest','SYNTHETIC end-to-end response witnessed',{testKind:'functional',result:{rawText:'SYNTHETIC end-to-end response witnessed',source:'visual',executionState:'performed'}});
 visit=updateImpairment(visit,'synthetic-introduced',{changeId:'synthetic-restoration',restoredAt:now+1000,restoredBy:'SYNTHETIC engineer',verificationEventIds:['synthetic-retest']},now+1000);
 assert.deepEqual(visit.impairments[0],previous);assert.equal(visit.impairments[1].restoredAt,now+1000);assert.equal(visit.impairments[1].restorationRecords.length,1);assert.equal(visit.impairments[0].restoredAt,null);
});

test('T31 missing/conflicting manual profile never enables limits or model actions',()=>{
 const unknown=matchFieldProfile({manufacturer:'Unknown',model:'Unknown'});assert.equal(unknown.enabled,false);assert.equal(unknown.status,'unmatched');
 const conflict=matchFieldProfile({manufacturer:'C-TEC',model:'CFP Standard'},{manualId:'SYNTHETIC incompatible manual',protocol:'AlarmSense',subsystem:'detector_zone'});assert.equal(conflict.enabled,false);assert.ok(conflict.missing.length||conflict.conflicts.length);
 const visit=visitFor('F01',{context:{...physical,exactProfileVerified:true},permissions:{readOnly:true,isolation:true}});assert.equal(evaluateTestEligibility(visit,first(visit),{id:'manufacturer_action',requires:['exactProfile']}).allowed,false);
});

test('T32 intentional redacted export omits credentials, private addresses and attachment pixels while retaining open actions',()=>{
 let visit=visitFor('C03');visit.siteRef='SYNTHETIC Private Site';visit.engineerRef='SYNTHETIC Named Engineer';visit.handover.nextAction='SYNTHETIC network owner to verify the recorder route';
 visit=event(visit,'synthetic-sensitive','Camera offline',{testKind:'network',password:'CANARY-PASSWORD-001',rawToken:'CANARY-TOKEN-001',notes:'Address 10.12.13.14; password=CANARY-ASSIGNMENT-001',points:[{location:'SYNTHETIC Confidential Room',terminal:'LAN'}],streamURL:'rtsp://syntheticUser:CANARY-URL-PASSWORD@10.12.13.14/path',attachments:[{name:'SYNTHETIC identifying image',dataUrl:'data:image/png;base64,CANARY-IMAGE-PIXELS'}]});
 const stored=JSON.stringify(visit.events.at(-1));for(const secret of ['CANARY-PASSWORD-001','CANARY-TOKEN-001','CANARY-ASSIGNMENT-001','CANARY-URL-PASSWORD'])assert.equal(stored.includes(secret),false,secret+' not stored');
 visit.ui={draftTest:{rawText:'SYNTHETIC PRIVATE DRAFT',filename:'SYNTHETIC private draft filename.png'}};const output=exportFieldVisit(sessionFor(visit),{format:'json',redact:true});assert.equal(output.includes('SYNTHETIC PRIVATE DRAFT'),false);assert.equal(output.includes('SYNTHETIC private draft filename.png'),false);assert.equal(visit.ui.draftTest.rawText,'SYNTHETIC PRIVATE DRAFT');for(const sensitive of ['CANARY-IMAGE-PIXELS','10.12.13.14','SYNTHETIC Confidential Room','SYNTHETIC Private Site','SYNTHETIC Named Engineer'])assert.equal(output.includes(sensitive),false,sensitive+' redacted');
 const parsed=JSON.parse(output);assert.equal(parsed.redacted,true);assert.equal(parsed.visit.handover.nextAction,'SYNTHETIC network owner to verify the recorder route');assert.ok(parsed.visit.events.some(e=>e.id==='synthetic-sensitive'&&e.result.executionState==='performed'));
});

test('T03 comparable evidence localises an adjacent verified radial span but an unknown branch widens it',()=>{
 let visit=visitFor('P06');const shared={eventTime:now,loadState:'standby',powerDomain:'SYNTHETIC PSU1',comparisonId:'synthetic-boundary'};
 visit=event(visit,'synthetic-upstream','24.00',{...shared,points:[{location:'SYNTHETIC JB-7 incoming',terminal:'+'},{location:'SYNTHETIC JB-7 incoming',terminal:'-'}]});
 visit=event(visit,'synthetic-downstream','0.00',{...shared,points:[{location:'SYNTHETIC corridor base incoming',terminal:'+'},{location:'SYNTHETIC corridor base incoming',terminal:'-'}]});
 const path={topology:'radial',verified:true,provenance:'field_trace',branchesVerified:true,sameConditionConfirmed:true,points:[{id:'jb7',label:'SYNTHETIC JB-7'},{id:'base',label:'SYNTHETIC corridor base'}],observations:[{pointId:'jb7',assessment:'satisfactory',eventId:'synthetic-upstream'},{pointId:'base',assessment:'fault_present',eventId:'synthetic-downstream'}]};
 const bounded=localisePath(visit,path);assert.equal(bounded.localised,true);assert.match(bounded.reason,/outgoing termination.*incoming termination/i);assert.match(bounded.reason,/not a proven cable.break/i);
 assert.equal(localisePath(visit,{...path,unverifiedBranch:true}).localised,false);assert.equal(localisePath(visit,{...path,provenance:'unverified_download'}).localised,false);assert.equal(localisePath(visit,{...path,topology:'return_loop'}).localised,false);
});

test('T08 a full dedicated proving sequence is distinct from live readings and invalid after failed final proof',()=>{
 const proof={testKind:'proving_dead',electricalState:'isolated',allSourcesIdentified:true,isolatedAndSecured:true,point:'SYNTHETIC input enclosure',sources:['mains','battery'],singlePhase:true,instrument:{type:'two_pole_indicator',suitable:true,id:'SYNTHETIC indicator',provingMethod:'SYNTHETIC proving unit',proofBefore:{result:'passed',at:now-1000},proofAfter:{result:'passed',at:now+1000}},requiredPairs:['L-N','L-PE','N-PE'],pairs:['L-N','L-PE','N-PE'].map(pair=>({pair,result:'absence',at:now}))};
 const complete=validateProvingDead(proof);assert.equal(complete.valid,true);assert.equal(complete.establishesSafeIsolation,false,'Software validates the record, not actual safety');
 assert.equal(validateProvingDead({...proof,testKind:'voltage',electricalState:'energised',pairs:fixtures.powerPairs}).valid,false);
 assert.equal(validateProvingDead({...proof,instrument:{...proof.instrument,proofAfter:{result:'failed',at:now+1000}}}).valid,false);
 assert.equal(validateProvingDead({...proof,instrument:{...proof.instrument,type:'non_contact_pen'}}).valid,false);
});

test('T18 reboot plus documented demand conflict differs from stable night-image haze',()=>{
 let power=visitFor('C02',{systemTypes:['cctv']}),image=copy(power);power=answer(power,'C02.Q1','yes');power=answer(power,'C02.Q2','yes');power=answer(power,'C02.Q3','yes');image=answer(image,'C02.Q1','no');
 const powerStep=getNextFieldStep(power,first(power).id),imageStep=getNextFieldStep(image,first(image).id);assert.equal(powerStep.routeId,'P04');assert.equal(imageStep.routeId,'C07');
 const timingOnly=visitFor('C02',{systemTypes:['cctv'],context:{night:true}});assert.equal(getNextFieldStep(timingOnly,first(timingOnly).id).rule.id,'C02.Q1');assert.notEqual(first(power).diagnosisState,'cause_verified');
});

test('T22 an online communicator without matching ARC receipt leaves delivery and redundancy unverified',()=>{
 let visit=visitFor('I11',{systemTypes:['intruder']});visit=answer(visit,'I11.Q1','yes');assert.match(textOf(getNextFieldStep(visit,first(visit).id)),/ARC|receipt|matching/i);visit=answer(visit,'I11.Q2','no');assert.equal(getNextFieldStep(visit,first(visit).id).kind,'handover');assert.equal(getRestorationStatus(visit).fullyRestored,false);
 let alternate=visitFor('I11',{systemTypes:['intruder']});alternate=answer(alternate,'I11.Q1','yes');alternate=answer(alternate,'I11.Q2','yes');alternate=answer(alternate,'I11.Q3','no');assert.equal(getRestorationStatus(alternate).fullyRestored,false);assert.match(getRule('I11.Q3').why,/redundancy|impairment/i);
});

test('T35 full reinstatement needs individual restoration, functional evidence and site/monitoring acknowledgement',()=>{
 let visit=visitFor('F13');visit=addImpairment(visit,{id:'synthetic-monitoring-test',affectedAssetOrFunction:'SYNTHETIC signalling test state',existingOrIntroduced:'introduced',monitoringRequired:true,owner:'SYNTHETIC engineer'},now);
 visit=event(visit,'synthetic-functional-retest','SYNTHETIC intended output and received restore verified',{testKind:'functional',verification:{passed:true},result:{rawText:'SYNTHETIC intended output and received restore verified',source:'visual',executionState:'performed'}});
 visit=updateImpairment(visit,'synthetic-monitoring-test',{changeId:'synthetic-reinstatement',restoredAt:now+1000,restoredBy:'SYNTHETIC engineer',normalConfiguration:'SYNTHETIC original normal configuration',verificationEventIds:['synthetic-functional-retest'],monitoringReceipt:'SYNTHETIC matched ARC restore acknowledgement',monitoringOffTest:true},now+1000);
 first(visit).verificationState='function_restored';first(visit).verificationEventIds=['synthetic-functional-retest'];visit.handover.verificationEventIds=['synthetic-functional-retest'];visit.handover.monitoringAcknowledgement='SYNTHETIC ARC confirmed receipt and removal from test';
 assert.equal(getRestorationStatus(visit).fullyRestored,false,'Missing site acknowledgement remains pending');visit.handover.siteAcknowledgement='SYNTHETIC responsible person confirmed';assert.equal(getRestorationStatus(visit).fullyRestored,true);
 visit.impairments[0].monitoringReceipt='';visit.impairments[0].restorationRecords.at(-1).patch.monitoringReceipt='';assert.equal(getRestorationStatus(visit).fullyRestored,false,'Missing monitoring acknowledgement cannot become full reinstatement');
});


test('T21 isolated coax OL has different meanings across the pair and along one conductor; unknown PoC blocks interpretation',()=>{
 const context={...physical,permissions:{isolation:true,readOnly:true},pocExcluded:true,bareSpan:true,farEndDisposition:'open'};
 const result={rawText:'OL',kind:'overrange',unit:'Ω',source:'meter',executionState:'performed'};
 const observation={method:'centre_to_shield',points:[{terminal:'centre'},{terminal:'shield'}],operatingState:'isolated_test',result};
 assert.equal(interpretCoaxObservation(observation,context).state,'expected_open');
 const endToEnd=interpretCoaxObservation({...observation,method:'centre_end_to_end'},context);assert.equal(endToEnd.state,'possible_discontinuity');assert.match(endToEnd.reason,/terminations/);assert.match(endToEnd.reason,/not uniquely prove/);
 assert.equal(interpretCoaxObservation(observation,{...context,pocExcluded:false}).state,'recorded_only');assert.equal(interpretCoaxObservation(observation,{...context,connectedEquipment:'unknown'}).state,'recorded_only');
});
