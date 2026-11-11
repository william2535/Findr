import test from 'node:test';
import assert from 'node:assert/strict';
import {evidenceToolsMarkup,handleEvidenceAction} from '../public/app/field-evidence-tools.mjs';
import {ensureFieldVisit,createIncident,addTestEvent,exportFieldVisit} from '../public/app/field-model.mjs';

function fresh(){
  let visit=createIncident(ensureFieldVisit({id:'synthetic-evidence-visit'},1),{id:'incident',exactComplaint:'SYNTHETIC radial fault',systemTypes:['fire']},2);
  for(const [id,point,value]of [['first','SYNTHETIC JB-7','24.00'],['last','SYNTHETIC corridor base','0.00']])visit=addTestEvent(visit,{id,incidentId:'incident',testKind:'voltage',method:'DMM DC',eventTime:'2026-11-02T09:00:00Z',points:[{location:point,terminal:'+ to DC 0 V'}],operatingState:'standby',loadState:'normal connected load',powerDomain:'PSU A',circuitState:'energised',result:{rawText:value,unit:'V DC',source:'meter',executionState:'performed'}},3);
  return visit;
}
const controls=values=>({querySelector:selector=>{const value=values[selector.replace('#field-evidence-','')];return value===undefined?null:typeof value==='boolean'?{checked:value}:{value:String(value)};}});
async function act(visit,action,values={}){
  const original=structuredClone(visit);let saved;
  const handled=await handleEvidenceAction('field-evidence-'+action,{app:controls(values),visit,incident:visit.incidents[0],onCommit:async next=>{saved=next;}});
  assert.deepEqual(visit,original,'source record must remain immutable');assert.equal(handled,true);return saved;
}
const pathForm={'path-points':'SYNTHETIC JB-7\nSYNTHETIC corridor base','path-topology':'radial','path-provenance':'field_trace','path-source':'SYNTHETIC traced route drawing R1','path-verified':true,'path-branches':true,'path-same':true};
const observation=(index,event,assessment)=>({'observation-point':String(index),'observation-event':event,'observation-assessment':assessment,'observation-reason':'SYNTHETIC source and condition checked against the recorded test; no generic voltage limit.'});

test('comparison keeps original tests and records a difference without applying a pass limit',async()=>{
  const original=fresh(),form={'compare-a':'first','compare-b':'last','compare-kind':'voltage_drop','compare-same':true};
  const next=await act(original,'compare',form);assert.equal(next.ui.evidenceResult.result.difference,24);assert.equal(next.ui.evidenceResult.result.comparable,true);
  assert.deepEqual(next.events.slice(0,2),original.events);assert.equal(next.events[2].result.executionState,'recorded');assert.equal(next.events[2].interpretation.status,'recorded_only');
  const retried=await act(next,'compare',form);assert.equal(retried.events.length,3);
  assert.match(evidenceToolsMarkup(next,next.incidents[0]),/No acceptance limit has been applied/);
  const exported=JSON.parse(exportFieldVisit({id:next.id,fieldVisit:next},{format:'json'}));assert.equal(exported.visit.events[2].comparison.result.difference,24);assert.deepEqual(exported.visit.events[2].comparison.eventIds,['first','last']);assert.match(exportFieldVisit({id:next.id,fieldVisit:next},{format:'text'}),/comparison:/);
});

test('same-condition checkbox cannot fill missing load, time or power-domain evidence',async()=>{
  const visit=fresh();delete visit.events[1].loadState;visit.events[1].eventTime=null;
  const next=await act(visit,'compare',{'compare-a':'first','compare-b':'last','compare-kind':'voltage_drop','compare-same':true});
  assert.equal(next.ui.evidenceResult.result.comparable,false);assert.equal(next.ui.evidenceResult.result.difference,null);assert.match(next.ui.evidenceResult.result.reasons.join(' '),/loadState/);assert.match(next.ui.evidenceResult.result.reasons.join(' '),/time/);
});

test('recorded adjacent physical observations give a bounded inspection span without cable-break claim',async()=>{
  let visit=await act(fresh(),'save-path',pathForm);visit=await act(visit,'add-observation',observation(0,'first','satisfactory'));visit=await act(visit,'add-observation',observation(1,'last','fault_present'));visit=await act(visit,'localise');
  assert.equal(visit.ui.evidenceResult.result.localised,true);assert.match(visit.ui.evidenceResult.result.reason,/not a proven cable-break/);assert.equal(visit.incidents[0].context.path.observations.length,2);
  assert.equal(visit.events[0].result.rawText,'24.00');assert.equal(visit.events[1].result.rawText,'0.00');
  const retried=await act(visit,'add-observation',observation(1,'last','fault_present'));assert.equal(retried.events.length,visit.events.length);assert.equal(retried.incidents[0].context.path.observations.length,2);
  const redacted=exportFieldVisit({id:visit.id,fieldVisit:visit},{format:'json'});assert.ok(!redacted.includes('SYNTHETIC corridor base'));
  const snapshot=JSON.parse(redacted).visit.events.at(-1);assert.equal(snapshot.localisation.localised,true);assert.equal(snapshot.pathSnapshot.provenance,'field_trace');assert.deepEqual(snapshot.localisation.evidenceIds,['first','last']);
});

test('a changed definition requires deliberate preservation and starts fresh observations',async()=>{
  let visit=await act(fresh(),'save-path',pathForm);visit=await act(visit,'add-observation',observation(0,'first','satisfactory'));const original=structuredClone(visit);
  await assert.rejects(act(visit,'save-path',{...pathForm,'path-points':'SYNTHETIC other point\nSYNTHETIC corridor base'}),/Start a new path definition/);assert.deepEqual(visit,original);
  const next=await act(visit,'save-path',{...pathForm,'path-points':'SYNTHETIC other point\nSYNTHETIC corridor base','path-replace':true});
  assert.equal(next.incidents[0].context.path.observations.length,0);assert.equal(next.incidents[0].context.pathHistory.at(-1).path.observations.length,1);assert.equal(next.events.at(-1).previousPath.observations.length,1);assert.deepEqual(next.events.slice(0,visit.events.length),visit.events);
});

test('unverified download, return loop and conflicting observations never become a localised cable break',async()=>{
  for(const extra of [{'path-provenance':'unverified_download'},{'path-topology':'return_loop'}]){
    let visit=await act(fresh(),'save-path',{...pathForm,...extra});visit=await act(visit,'add-observation',observation(0,'first','satisfactory'));visit=await act(visit,'add-observation',observation(1,'last','fault_present'));visit=await act(visit,'localise');assert.equal(visit.ui.evidenceResult.result.localised,false);
  }
  let visit=await act(fresh(),'save-path',pathForm);visit=await act(visit,'add-observation',observation(0,'first','satisfactory'));visit=await act(visit,'add-observation',observation(0,'last','fault_present'));assert.equal(visit.ui.evidenceResult.result.localised,false);assert.match(visit.ui.evidenceResult.result.reason,/Conflicting/);assert.equal(visit.incidents[0].context.path.observations.length,2);
});

test('unperformed, corrected and another incident’s tests cannot be linked through spoofed controls',async()=>{
  let visit=await act(fresh(),'save-path',pathForm);visit.events[0].result.executionState='not_tested';
  await assert.rejects(act(visit,'add-observation',observation(0,'first','satisfactory')),/performed test/);
  visit=fresh();visit.events.push({...structuredClone(visit.events[0]),id:'correction',supersedes:'first'});
  await assert.rejects(act(visit,'compare',{'compare-a':'first','compare-b':'last','compare-kind':'voltage_drop','compare-same':true}),/two different performed/);
  visit=fresh();visit.events[0].incidentId='another';await assert.rejects(act(visit,'compare',{'compare-a':'first','compare-b':'last','compare-kind':'voltage_drop','compare-same':true}),/two different performed/);
  visit=await act(fresh(),'save-path',pathForm);visit=await act(visit,'add-observation',observation(0,'first','satisfactory'));await assert.rejects(act(visit,'add-observation',observation(1,'first','fault_present')),/one reading cannot establish both boundaries/);
});

test('optional markup is initially collapsed and escaped; failed persistence leaves input intact',async()=>{
  const visit=fresh();visit.events[0].points[0].location='<img src=x onerror=alert(1)>';const markup=evidenceToolsMarkup(visit,visit.incidents[0]);assert.ok(markup.startsWith('<details class="field-card field-evidence-tools" >'));assert.ok(!markup.includes('<img'));assert.match(markup,/&lt;img/);
  const before=structuredClone(visit);await assert.rejects(handleEvidenceAction('field-evidence-save-path',{app:controls(pathForm),visit,incident:visit.incidents[0],onCommit:async()=>{throw Error('Storage full');}}),/Storage full/);assert.deepEqual(visit,before);
  assert.equal(await handleEvidenceAction('field-answer',{app:controls({}),visit,incident:visit.incidents[0],onCommit:async()=>assert.fail()}),false);
});

test('coax review cannot replace a saved unknown electrical state with newly checked visit conditions',async()=>{
  const visit=fresh(),incident=visit.incidents[0];incident.permissions={isolation:true};incident.context={electricalState:'isolated',sourceType:'dc',safeAccess:true,competenceConfirmed:true,procedure:'SYNTHETIC isolated span procedure',allSourcesIdentified:true,bothEndsConfirmed:true,isolatedSpanConfirmed:true,storedEnergyControlled:true,parallelPathsKnown:true,suitableInstrument:true,connectedEquipment:'none',bareSpan:true,pocExcluded:true,farEndDisposition:'open'};
  visit.events[0]={...visit.events[0],testKind:'resistance',method:'centre_to_shield',circuitState:'unknown',result:{rawText:'OL',kind:'overrange',unit:'Ω',source:'meter',executionState:'performed'}};
  const next=await act(visit,'coax',{'coax-event':'first','coax-conditions':true});assert.equal(next.ui.evidenceResult.result.state,'recorded_only');assert.equal(next.events[0].circuitState,'unknown');
  visit.events[0].circuitState='isolated';const interpreted=await act(visit,'coax',{'coax-event':'first','coax-conditions':true});assert.equal(interpreted.ui.evidenceResult.result.state,'expected_open');assert.match(interpreted.ui.evidenceResult.result.reason,/does not prove end-to-end/);
  const exported=JSON.parse(exportFieldVisit({id:interpreted.id,fieldVisit:interpreted},{format:'json'}));assert.equal(exported.visit.events.at(-1).coaxReview.eventId,'first');assert.equal(exported.visit.events.at(-1).coaxReview.contextSnapshot.electricalState,'isolated');assert.match(exportFieldVisit({id:interpreted.id,fieldVisit:interpreted},{format:'text'}),/coaxReview:/);
  const unconfirmed=await act(visit,'coax',{'coax-event':'first','coax-conditions':false});assert.equal(unconfirmed.ui.evidenceResult.result.state,'recorded_only');
});
