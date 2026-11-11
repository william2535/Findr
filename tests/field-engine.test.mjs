import test from 'node:test';
import assert from 'node:assert/strict';
import {getRoute,getRule} from '../public/app/field-routes.mjs';
import {evaluateTestEligibility,getEmergencyState,getNextFieldStep,recordFieldAnswer,validateProvingDead,compareTestEvents,localisePath,interpretCoaxObservation,validateFinding,getRestorationStatus,rankFieldRoutes} from '../public/app/field-engine.mjs';

const baseContext=()=>({electricalState:'isolated',allSourcesIdentified:true,bothEndsConfirmed:true,isolatedSpanConfirmed:true,connectedEquipment:'none',storedEnergyControlled:true,parallelPathsKnown:true,suitableInstrument:true,safeAccess:true,competenceConfirmed:true,procedure:'Synthetic documented method',sourceType:'DC',bareSpan:true});
const incident=(routeId='P06',extra={})=>({id:'incident-1',routeId,systemTypes:['fire'],exactComplaint:'Synthetic open-circuit report',currentSymptomState:'showing_now',assetRefs:['point-a'],context:baseContext(),permissions:{readOnly:true,isolation:true,energised:true,impairment:true,change:true},safety:{},...extra});
const visit=(i=incident())=>({id:'visit-1',incidents:[i],events:[],assets:[{id:'point-a',model:'Unknown'}],impairments:[],handover:{}});
const clone=value=>structuredClone(value);
const sampleProof=()=>({testKind:'proving_dead',electricalState:'isolated',allSourcesIdentified:true,isolatedAndSecured:true,point:'Synthetic point',sources:['mains','battery'],
 instrument:{type:'two_pole_indicator',suitable:true,id:'indicator-1',provingMethod:'Synthetic proving unit',proofBefore:{result:'passed',at:'2026-11-02T10:00:00Z'},proofAfter:{result:'passed',at:'2026-11-02T10:03:00Z'}},
 singlePhase:true,pairs:[{pair:'L-N',result:'absence',at:'2026-11-02T10:01:00Z'},{pair:'L-PE',result:'absence',at:'2026-11-02T10:01:30Z'},{pair:'N-PE',result:'absence',at:'2026-11-02T10:02:00Z'}]});
const measurement=(id,point,value,extra={})=>({id,incidentId:'incident-1',testKind:'voltage',method:'dc_voltage_across_device',points:[{assetId:point,terminal:'+'},{assetId:point,terminal:'-'}],eventTime:'2026-11-02T10:00:00Z',operatingState:'standby',loadState:'connected load',powerDomain:'psu-a',circuitState:'energised_connected',comparisonId:'comparison-1',result:{kind:'numeric',rawText:String(value),value,unit:'V DC',source:'meter',executionState:'performed'},...extra});

test('physical test eligibility is separate from the next read-only evidence question',()=>{
 const i=incident('A04');i.permissions.energised=false;const v=visit(i),step=getNextFieldStep(v,i.id);
 assert.equal(step.kind,'question');assert.match(step.question,/grant/i);
 const gate=evaluateTestEligibility(v,i,'voltage',{source:'meter',electricalState:'energised',reference:'Synthetic + / -',operatingState:'release demand'});
 assert.equal(gate.allowed,false);assert.ok(gate.missing.includes('permissions.energised'));
 assert.equal(evaluateTestEligibility(v,i,'voltage',{source:'panel'}).allowed,true);
});

test('arbitrary template IDs cannot bypass their energised or specialist requirements',()=>{
 const i=incident();i.permissions.energised=false;
 const gate=evaluateTestEligibility(visit(i),i,{id:'mains_verification',requires:['energised']},{sourceType:'mains'});
 assert.equal(gate.allowed,false);assert.ok(gate.missing.includes('permissions.energised'));assert.ok(gate.missing.includes('liveWork.precautions'));
 const special=evaluateTestEligibility(visit(i),i,{id:'specialist_input',requires:['specialist','isolation']});
 assert.equal(special.allowed,false);assert.ok(special.missing.includes('permissions.specialist'));
});

test('mains measurement needs each live-work condition and does not become proof of isolation',()=>{
 const i=incident();i.context={...i.context,electricalState:'energised',sourceType:'MAINS',reference:'L-N',operatingState:'standby'};
 let gate=evaluateTestEligibility(visit(i),i,'voltage');assert.equal(gate.allowed,false);
 for(const key of ['deadUnreasonable','liveReasonable','precautions'])assert.ok(gate.missing.includes('liveWork.'+key));
 i.context.liveWork={deadUnreasonable:'Synthetic specific reason',liveReasonable:'Synthetic specific reason',precautions:'Synthetic agreed precautions'};
 gate=evaluateTestEligibility(visit(i),i,'voltage');assert.equal(gate.allowed,true);
 i.context.liveWork.deadUnreasonable='no';assert.equal(evaluateTestEligibility(visit(i),i,'voltage').allowed,false);
 assert.equal(validateProvingDead({testKind:'voltage',value:'0',pairs:[{pair:'L-N',value:0}]}).valid,false);
});

test('unknown power, remaining supplies and connected electronics suppress resistance without deleting history',()=>{
 const i=incident(),v=visit(i);
 for(const change of [{electricalState:'unknown'},{electricalState:'energised'},{allSourcesIdentified:false},{connectedEquipment:'electronics'},{bothEndsConfirmed:false}]){
  const gate=evaluateTestEligibility(v,i,'resistance',change);assert.equal(gate.allowed,false);
 }
 const earlier=evaluateTestEligibility(v,i,'resistance',{historical:true,rawText:'OL',electricalState:'unknown'});
 assert.equal(earlier.allowed,false);assert.equal(earlier.allowedRecord,true);assert.equal(earlier.recordOnly,true);
 assert.equal(evaluateTestEligibility(v,i,'resistance').allowed,true);
});

test('PoE source case and current method do not bypass instrument/circuit compatibility',()=>{
 const i=incident();i.context={...i.context,electricalState:'energised',sourceType:'PoE',reference:'Synthetic points',operatingState:'active'};
 const poe=evaluateTestEligibility(visit(i),i,'voltage');assert.equal(poe.allowed,false);assert.ok(poe.missing.includes('poeTestMethod'));
 const current=evaluateTestEligibility(visit(i),i,'current',{sourceType:'DC',currentMethod:'across_supply'});assert.equal(current.allowed,false);assert.ok(current.missing.includes('currentMethod'));
 const insulation=evaluateTestEligibility(visit(i),i,'insulation_resistance',{electricalState:'isolated',connectedEquipment:'electronics'});
 assert.equal(insulation.allowed,false);assert.ok(insulation.missing.includes('testVoltage'));assert.ok(insulation.missing.includes('bareSpan'));
});

test('disruptive comparisons require separate authority, impact plan and monitoring arrangements',()=>{
 const i=incident('P09');i.permissions.impairment=false;const v=visit(i);
 const gate=evaluateTestEligibility(v,i,{id:'controlled_comparison',requires:['impairment','change']},{monitoringRequired:true});
 assert.equal(gate.allowed,false);assert.ok(gate.missing.includes('permissions.impairment'));assert.ok(gate.missing.includes('impairmentPlan'));assert.ok(gate.missing.includes('monitoringArranged'));
});

test('draft manufacturer profiles remain disabled despite claimed verified flags',()=>{
 const i=incident();i.context={...i.context,exactProfileVerified:true,verifiedProfile:true,sourceProfile:{status:'verified',id:'invented'},profileMatch:'exact'};
 const gate=evaluateTestEligibility(visit(i),i,{id:'manufacturer_action',requires:['exactProfile']});
 assert.equal(gate.allowed,false);assert.ok(gate.missing.includes('exactProfile'));
});

test('emergency is visit-wide and recording an emergency answer immediately interrupts other routes',()=>{
 let v=visit(incident('A05'));v.incidents.push(incident('C08',{id:'incident-2',systemTypes:['cctv']}));
 v=recordFieldAnswer(v,{incidentId:'incident-1',ruleId:'A05.Q1',answer:'yes',now:1});
 assert.equal(getNextFieldStep(v,'incident-2').kind,'emergency');assert.equal(getRestorationStatus(v).canClose,false);
 const historical=evaluateTestEligibility(v,v.incidents[1],'observation',{historical:true});assert.equal(historical.allowed,false);assert.equal(historical.allowedRecord,true);
 v.incidents[0].safety.emergencyResolved=true;
 assert.equal(getEmergencyState(v,v.incidents[1]).active,true,'Checkbox alone does not account for response');
 v.incidents[0].safety.responseOwner='unknown';v.incidents[0].safety.responseTime='2026-11-02T10:00:00Z';assert.equal(getEmergencyState(v,v.incidents[1]).active,true);
 v.incidents[0].safety.responseOwner='Synthetic responsible person';v.incidents[0].safety.responseTime='2026-11-02T10:00:00Z';
 assert.equal(getEmergencyState(v,v.incidents[1]).active,false);
});

test('answers preserve rule revision/snapshot and never infer a performed test or diagnosis',()=>{
 const v=visit(incident('A04')),before=clone(v),rule=getRule('A04.Q1');
 const next=recordFieldAnswer(v,{id:'answer-one',incidentId:'incident-1',ruleId:rule.id,answer:'yes',now:12});
 assert.deepEqual(v,before);assert.equal(next.events[0].ruleRevision,rule.revision);assert.deepEqual(next.events[0].ruleSnapshot,rule);
 assert.equal(next.events[0].result.executionState,'answered');assert.equal(next.events[0].interpretation.status,'recorded_observation');
 assert.equal(recordFieldAnswer(next,{id:'answer-one',incidentId:'incident-1',ruleId:rule.id,answer:'yes'}).events.length,1);
 const step=getNextFieldStep(next,'incident-1');assert.notEqual(step.rule?.id,rule.id);
});

test('a blocked step is suppressed until its prerequisite changes; unknown never becomes No',()=>{
 let v=visit(incident('P06'));const id=getRoute('P06').rules[0].id;
 v=recordFieldAnswer(v,{incidentId:'incident-1',ruleId:id,answer:'blocked',reason:'Synthetic remote end inaccessible'});
 assert.equal(getNextFieldStep(v,'incident-1').kind,'handover');
 v.incidents[0].context.safeAccess=false;
 assert.equal(getNextFieldStep(v,'incident-1').kind,'question');
 let unknown=recordFieldAnswer(visit(incident('P06')),{incidentId:'incident-1',ruleId:id,answer:'unknown'});
 unknown=recordFieldAnswer(unknown,{incidentId:'incident-1',ruleId:id,answer:'unknown'});
 assert.equal(getNextFieldStep(unknown,'incident-1').kind,'handover');
 assert.deepEqual(unknown.events.map(e=>e.answer),['unknown','unknown']);
});

test('proving dead requires its own successful indicator sequence and all applicable pairs',()=>{
 const r=sampleProof();assert.equal(validateProvingDead(r).valid,true);assert.equal(validateProvingDead(r).establishesSafeIsolation,false);
 for(const mutation of [x=>x.instrument.proofAfter.result='failed',x=>x.instrument.type='non_contact_pen',x=>x.pairs.pop(),x=>x.pairs[1].result='0',x=>x.pairs[1].at='2026-11-02T10:05:00Z',x=>x.allSourcesIdentified=false]){
  const changed=clone(r);mutation(changed);assert.equal(validateProvingDead(changed).valid,false);
 }
 const failed=clone(r);failed.instrument.proofAfter.result='failed';assert.equal(validateProvingDead(failed).status,'invalid');
});

test('loaded voltage comparison preserves mismatched states and only computes an explicit comparable difference',()=>{
 const a=measurement('a','source',24),b=measurement('b','load',22);
 assert.equal(compareTestEvents(a,b,{kind:'voltage_drop'}).difference,2);
 const other={...b,operatingState:'release demand',loadState:'moving'};
 const comparison=compareTestEvents(a,other,{kind:'voltage_drop'});assert.equal(comparison.comparable,false);assert.equal(comparison.difference,null);
 assert.equal(compareTestEvents(a,{...b,comparisonId:'other'},{kind:'voltage_drop'}).comparable,false);
 assert.equal(compareTestEvents(a,{...b,result:{...b.result,source:'import'}},{kind:'voltage_drop'}).comparable,false);
});

test('localisation names adjacent verified physical terminations and widens unknown branches or return loops',()=>{
 const a=measurement('a','jb-7',24),b=measurement('b','base',0),v={...visit(),events:[a,b]};
 const path={topology:'radial',verified:true,provenance:'field_trace',branchesVerified:true,points:[{id:'jb-7',label:'JB-7'},{id:'base',label:'Corridor base'}],observations:[{pointId:'jb-7',assessment:'satisfactory',eventId:'a'},{pointId:'base',assessment:'fault_present',eventId:'b'}]};
 const result=localisePath(v,path);assert.equal(result.localised,true);assert.match(result.reason,/outgoing termination/);assert.match(result.reason,/not a proven cable-break/);
 assert.equal(localisePath(v,{...path,unverifiedBranch:true}).localised,false);
 assert.equal(localisePath(v,{...path,provenance:'unverified_download'}).localised,false);
 assert.equal(localisePath(v,{...path,topology:'return_loop'}).localised,false);
});

test('coax OL interpretation follows the exact isolated test method, never generic open/short guessing',()=>{
 const context={...baseContext(),permissions:{isolation:true},pocExcluded:true,farEndDisposition:'open'},event={testKind:'resistance',method:'centre_to_shield',result:{kind:'overrange',rawText:'OL',unit:'Ω',source:'meter'}};
 assert.equal(interpretCoaxObservation(event,context).state,'expected_open');
 assert.equal(interpretCoaxObservation({...event,method:'centre_end_to_end'},context).state,'possible_discontinuity');
 assert.equal(interpretCoaxObservation(event,{...context,pocExcluded:false}).state,'recorded_only');
 assert.equal(interpretCoaxObservation(event,{...context,electricalState:'unknown'}).state,'recorded_only');
});

test('a physical boundary cannot reuse one event at two points or rely on a corrected reading',()=>{
 const a=measurement('a','jb-7',24),b=measurement('b','base',0),v={...visit(),events:[a,b]};
 const path={topology:'radial',verified:true,provenance:'field_trace',branchesVerified:true,points:[{id:'jb-7',label:'JB-7'},{id:'base',label:'Corridor base'}],observations:[{pointId:'jb-7',assessment:'satisfactory',eventId:'a'},{pointId:'base',assessment:'fault_present',eventId:'b'}]};
 const reused=clone(path);reused.observations[1].eventId='a';
 assert.equal(localisePath(v,reused).localised,false);assert.match(localisePath(v,reused).reason,/same saved test/);
 const corrected={...v,events:[...v.events,{...b,id:'b-correction',supersedes:'b'}]};
 assert.equal(localisePath(corrected,path).localised,false);assert.match(localisePath(corrected,path).reason,/superseded/);
 const refreshed=clone(path);refreshed.observations[1].eventId='b-correction';
 assert.equal(localisePath(corrected,refreshed).localised,true);
 const historical=clone(v);historical.events[1].result.executionState='recorded';
 assert.equal(localisePath(historical,path).localised,false);
});

test('reset and substitution cannot establish verified cause without discriminating evidence and retest',()=>{
 const v={...visit(),events:[{id:'reset',testKind:'reset',interpretation:{discriminating:true},result:{executionState:'performed'},verification:{passed:true}}]};
 const result=validateFinding(v,{state:'cause_verified',text:'Fault cleared',evidenceForIds:['reset'],verificationTestIds:['reset'],verifiedBy:'Engineer'});
 assert.equal(result.valid,false);assert.equal(result.state,'consistent_with');
});

test('an identified cause needs genuine observed discrimination and a separate verification event',()=>{
 const v={...visit(),events:[
  {id:'finding',testKind:'visual',result:{executionState:'performed',source:'visual'},interpretation:{discriminating:true,reason:'Synthetic loose termination observed on the evidenced span'},verification:{passed:true}},
  {id:'retest',testKind:'functional',result:{executionState:'performed',source:'visual'},verification:{passed:true}},
 ]};
 const finding={state:'cause_verified',text:'Synthetic loose terminal at JB-7',evidenceForIds:['finding'],verificationTestIds:['retest'],verifiedBy:'Synthetic engineer'};
 assert.equal(validateFinding(v,finding).valid,true);
 assert.equal(validateFinding(v,{...finding,verificationTestIds:['finding']}).valid,false);
 assert.equal(validateFinding(v,{...finding,text:'unknown'}).valid,false);
 assert.equal(validateFinding(v,{...finding,verifiedBy:'unknown'}).valid,false);
 const imported=clone(v);imported.events[0].result.source='import';assert.equal(validateFinding(imported,finding).valid,false);
 const historical=clone(v);historical.events[1].interpretation={status:'method_unverified'};assert.equal(validateFinding(historical,finding).valid,false);
});

test('restoration keeps original impairments and requires each function, retest and acknowledgements',()=>{
 const v=visit();v.incidents[0].verificationState='function_restored';v.incidents[0].verificationEventIds=['retest'];
 v.events=[{id:'retest',incidentId:'incident-1',result:{executionState:'performed'},verification:{passed:true}}];
 v.impairments=[{id:'temporary',existingOrIntroduced:'introduced',restoredAt:123,restoredBy:'Engineer',normalConfiguration:'Original terminals',verificationEventIds:['retest']}];
 v.handover={verificationEventIds:['retest']};
 assert.equal(getRestorationStatus(v).fullyRestored,false);
 v.handover.siteAcknowledgement='Synthetic site contact';v.handover.monitoringNotApplicable=true;assert.equal(getRestorationStatus(v).fullyRestored,true);
 const unverified=clone(v);unverified.events[0].interpretation={status:'method_unverified'};assert.equal(getRestorationStatus(unverified).fullyRestored,false);
 v.impairments.push({id:'prior',existingOrIntroduced:'existing',affectedAssetOrFunction:'Pre-existing disabled zone'});
 const impaired=getRestorationStatus(v);assert.equal(impaired.fullyRestored,false);assert.equal(impaired.existingCount,1);
 v.handover={...v.handover,owner:'Responsible person',reviewBy:'2026-11-03',systemLeft:'Agreed cover with pre-existing disablement',impairmentAccepted:true};
 assert.equal(getRestorationStatus(v).canClose,true);assert.equal(getRestorationStatus(v).status,'impaired');
});

test('route order is deterministic and reported as a selection order, not confidence',()=>{
 const v=visit(incident('C08',{systemTypes:['cctv'],exactComplaint:'Live view but no recording'}));
 const ranked=rankFieldRoutes(v,'incident-1');assert.equal(ranked[0].routeId,'C08');assert.deepEqual(ranked,rankFieldRoutes(v,'incident-1'));assert.ok(ranked.every(r=>!('probability' in r)));
});
