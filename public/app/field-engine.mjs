import {FIELD_ROUTES,TEST_TEMPLATES,getRoute,getRule} from './field-routes.mjs';
import {matchFieldProfile} from './field-profiles.mjs';

// Deterministic evidence routing. Permission records are prerequisites, not
// proof of competence, safe isolation, installed topology or a repaired fault.
const obj=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const asObj=value=>obj(value)?value:{};
const list=value=>Array.isArray(value)?value:[];
const clone=value=>structuredClone(value);
const text=value=>typeof value==='string'?value:value==null?'':String(value);
const filled=value=>typeof value==='string'?value.trim().length>0:value!==undefined&&value!==null;
const known=value=>filled(value)&&!['unknown','not recorded','not_recorded','unverified','unspecified','pending','not confirmed','not_confirmed','none','no','yes','n/a','na','unavailable'].includes(text(value).trim().toLowerCase());
const rationale=value=>typeof value==='string'&&known(value);
const namedPoint=point=>typeof point==='string'?known(point):obj(point)&&[point.assetId,point.location,point.terminal,point.label].some(known);
const yes=value=>value===true||value==='yes'||value==='confirmed';
const positive=value=>yes(value)||['reported','present','credible_report','fire','smoke','unconfirmed_alarm','electric_shock','burning','exposed_dangerous_parts','required_escape_failure'].includes(value);
const date=value=>typeof value==='number'&&Number.isFinite(value)?value:typeof value==='string'&&value.trim()?Date.parse(value):NaN;
const unique=values=>[...new Set(values)];
const uid=()=>globalThis.crypto?.randomUUID?.()||'field-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const PHYSICAL=new Set(['voltage','voltage_drop','resistance','continuity','diode','insulation','insulation_resistance','current','functional','controlled_comparison','substitution','split','proving_dead']);
const NON_METER=new Set(['panel','visual','human_report','import']);
const RISK_FIELDS=['fire','smoke','unconfirmedAlarm','electricShock','burning','exposedDangerousParts','requiredEscapeFailure'];
const UNAVAILABLE=new Set(['blocked','declined','inaccessible','not_permitted','unsafe','equipment_unavailable','fault_absent','deferred']);
const verifiedMethod=event=>!event?.historical&&!['method_unverified','unverified','historical','recorded_only_historical'].includes(event?.interpretation?.status);

function incidentFor(visit,incidentId){return list(visit?.incidents).find(i=>i.id===incidentId)||null;}
function contextFor(visit,incident,input={}){
 const direct={...asObj(input)};delete direct.context;delete direct.permissions;delete direct.safety;
 const context={...asObj(visit?.context),...asObj(incident?.context),...direct,...asObj(input.context)};
 return {context,permissions:{...asObj(visit?.permissions),...asObj(incident?.permissions),...asObj(input.permissions)},
  safety:{...asObj(visit?.safety),...asObj(incident?.safety),...asObj(input.safety)}};
}
function contextKey(visit,incident,input={}){
 const data=contextFor(visit,incident,input);
 const stable=value=>Array.isArray(value)?value.map(stable):obj(value)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;
 return JSON.stringify(stable(data));
}
export function getEmergencyState(visit,incident,input={}){
 const current=contextFor(visit,incident,input).safety;
 const sources=[asObj(visit?.safety),...list(visit?.incidents).filter(i=>i.id!==incident?.id).map(i=>asObj(i.safety)),current];
 const unresolved=sources.filter(s=>{
  const raised=positive(s.immediateRisk)||RISK_FIELDS.some(k=>positive(s[k]));
  const accounted=yes(s.emergencyResolved)&&rationale(s.responseOwner)&&Number.isFinite(date(s.responseTime));
  return raised&&!accounted;
 });
 const reasons=unique(unresolved.flatMap(s=>RISK_FIELDS.filter(k=>positive(s[k]))));
 return {active:unresolved.length>0,reasons:reasons.length?reasons:unresolved.length?['immediateRisk']:[],
  message:'Stop routine diagnostics. Follow the site emergency process and record the affected area, notification, time and responsible response owner.'};
}
function templateInfo(template){
 const id=typeof template==='string'?template:template?.id||template?.testKind||'observation';
 const collection=Array.isArray(TEST_TEMPLATES)?TEST_TEMPLATES:Object.values(TEST_TEMPLATES||{});
 const base=collection.find(item=>item.id===id)||{};
 return {id,...base,...asObj(template),requires:unique([...list(base.requires),...list(template?.requires)])};
}
function assetFor(visit,incident,context){
 return asObj(context.asset||list(visit?.assets).find(a=>list(incident?.assetRefs).includes(a.id)));
}
function profileEligibility(visit,incident,context){
 const match=matchFieldProfile(assetFor(visit,incident,context),context);
 return match?.enabled===true&&match.status==='exact'&&match.profile?.status==='verified'&&!list(match.conflicts).length;
}

/** Decide whether to propose performing a test; recording earlier facts remains possible. */
export function evaluateTestEligibility(visit,incident,testTemplate,input={}){
 incident=typeof incident==='string'?incidentFor(visit,incident):incident;
 const {context,permissions,safety}=contextFor(visit,incident,input),template=templateInfo(testTemplate),kind=template.id;
 const source=input.source||input.result?.source||context.source||'';
 const historical=input.historical===true||input.executionState==='historical'||input.result?.executionState==='historical';
 const observationalValue=!['functional','controlled_comparison','substitution','split','proving_dead'].includes(kind);
 const observed=NON_METER.has(source)&&observationalValue&&input.intent!=='perform';
 const physical=(PHYSICAL.has(kind)||template.requires.some(r=>['energised','isolation','impairment','change','instrument','specialist','bareSpan'].includes(r)))&&!observed;
 const emergency=getEmergencyState(visit,incident,input);
 const missing=[],reasons=[];
 const need=(key,condition,reason)=>{if(!condition){missing.push(key);reasons.push(reason);}};
 if(emergency.active){
  return {allowed:false,allowedRecord:true,recordOnly:true,missing:emergency.reasons.map(x=>'safety.'+x),
   reason:emergency.message,safeAlternative:'Record only existing facts and the emergency response; do not continue routine testing.',emergency:true};
 }
 if(historical)return {allowed:false,allowedRecord:true,recordOnly:true,missing:[],reason:'Retain this earlier result as historical evidence with its method and conditions unverified.',safeAlternative:'Record what was actually observed; this does not authorise a new test.'};
 if(template.reviewStatus==='draft'||template.reviewStatus==='withdrawn'||template.reviewStatus==='stale'){
  need('reviewStatus',false,'This procedure is not an enabled, reviewed test.');
 }
 const specialist=positive(safety.hazardousArea)||positive(safety.intrinsicallySafe)||positive(safety.suppression)||positive(safety.smokeControl)||positive(safety.liftHoming)||positive(safety.criticalPlant)||template.requires.includes('specialist');
 if(specialist&&physical){
  need('permissions.specialist',yes(permissions.specialist),'Specialist authority and the relevant system owner are required.');
  need('specialistProcedure',filled(context.specialistProcedure)&&filled(context.controlDrawing),'Record the specialist procedure and equipment/control drawing.');
  need('specialistInstrument',yes(context.specialistInstrument),'A suitable specialist instrument and test point must be established.');
 }
 if(physical){
  need('safeAccess',yes(context.safeAccess),'The proposed test point must be safely accessible.');
  need('competenceConfirmed',yes(context.competenceConfirmed),'The appropriate competent person must assess this test.');
  need('procedure',filled(context.procedure),'Record the applicable test method before performing a physical test.');
  if(kind!=='functional')need('suitableInstrument',yes(context.suitableInstrument)||yes(input.instrument?.suitable),'Confirm the instrument is suitable for this circuit and test.');
 }
 // Observation of an existing display is not permission to enter an enclosure,
 // actuate a function, alter a configuration or carry out a new measurement.
 if(!physical&&permissions.readOnly===false)need('permissions.readOnly',false,'Read-only access is unavailable. Record the reported account or request authorised access.');
 const sourceType=text(context.sourceType).toLowerCase();
 const state=text(context.electricalState||context.circuitState?.state||context.circuitState||input.circuitState).toLowerCase();
 const isolated=['isolated','proved_dead','de_energised'].includes(state);
 const resistance=['resistance','continuity','diode','insulation','insulation_resistance'].includes(kind)&&!observed;
 if(resistance){
  need('electricalState',isolated,'Do not propose resistance, continuity or diode tests on an energised or unknown circuit.');
  need('permissions.isolation',yes(permissions.isolation),'Separate isolation authority is required.');
  need('allSourcesIdentified',yes(context.allSourcesIdentified),'Identify every supply, battery, backfeed and possible PoC source.');
  need('storedEnergyControlled',yes(context.storedEnergyControlled),'Stored energy must be accounted for under the applicable method.');
  need('bothEndsConfirmed',yes(context.bothEndsConfirmed),'Identify both ends and their actual disposition.');
  need('isolatedSpanConfirmed',yes(context.isolatedSpanConfirmed),'The intended isolated test span must be identified.');
  need('parallelPathsKnown',yes(context.parallelPathsKnown),'Record remaining parallel paths and connected components.');
  need('connectedEquipment',['none','passive','known_passive'].includes(context.connectedEquipment),'Unknown or connected electronics prevent this proposed test.');
  if(['insulation','insulation_resistance'].includes(kind)){
   need('bareSpan',context.connectedEquipment==='none'&&yes(context.bareSpan),'Insulation testing is unavailable while electronics or unidentified components may remain connected.');
   need('testVoltage',filled(context.testVoltage)&&filled(context.testVoltageSource),'No default insulation-test voltage is supplied; record the applicable method and specified test voltage.');
  }
  if(sourceType==='mains')need('provingDead',validateProvingDead(context.provingDead).valid,'A complete, successful proving-dead record is required for the point of work.');
 }
 if((['voltage','voltage_drop','current'].includes(kind)||template.requires.includes('energised'))&&!observed){
  need('electricalState',['energised','energised_connected','energised_disconnected'].includes(state),'Record the actual energised state for this proposed powered measurement.');
  need('permissions.energised',yes(permissions.energised),'Permission for measurement on energised equipment is separate from read-only access.');
  need('reference',rationale(input.reference)||(list(input.points).length>=2&&input.points.every(namedPoint))||rationale(context.reference),'Name the actual probe pair or terminal reference.');
  need('operatingState',filled(input.operatingState||context.operatingState),'Record the current operating/load state; do not reuse a prior state silently.');
  if(sourceType==='mains'||yes(context.dangerMayArise)){
   const live=asObj(context.liveWork);
   need('liveWork.deadUnreasonable',rationale(live.deadUnreasonable),'Record why making dead is unreasonable in the circumstances.');
   need('liveWork.liveReasonable',rationale(live.liveReasonable),'Record why the proposed live work is reasonable.');
   need('liveWork.precautions',rationale(live.precautions),'Record the suitable precautions for the live-work assessment.');
  }
  if(kind==='current')need('currentMethod',['clamp','manufacturer_diagnostic','approved_series'].includes(context.currentMethod),'No current-meter-across-supply method is offered; identify a suitable supported current method.');
  if(sourceType==='poe')need('poeTestMethod',context.poeTestMethod==='rated_test_instrument','Do not probe PoE pins; use supported diagnostics or a suitable rated test instrument.');
 }
 if(kind==='proving_dead'&&!observed){
  need('permissions.isolation',yes(permissions.isolation),'Isolation authority is required before a proving-dead procedure.');
  need('allSourcesIdentified',yes(context.allSourcesIdentified),'Identify all supplies and backfeeds.');
  need('isolatedAndSecured',yes(context.isolatedAndSecured),'Record the approved isolation and securing arrangement.');
 }
 const disruptive=!observed&&(kind==='functional'||['controlled_comparison','substitution','split'].includes(kind)||template.requires.includes('impairment'));
 if(disruptive){
  need('permissions.impairment',yes(permissions.impairment),'The scope and authority for interruption must be recorded separately.');
  const plan=asObj(context.impairmentPlan);
  need('impairmentPlan',filled(plan.owner)&&filled(plan.scope)&&filled(plan.reviewBy)&&filled(plan.measures)&&filled(plan.authorisedByRole),'Record the affected scope, authority, temporary measures, owner and review time.');
  if(positive(context.monitoringRequired))need('monitoringArranged',yes(context.monitoringArranged),'Arrange the relevant site/monitoring test window before activation.');
 }
 for(const requirement of template.requires){
  if(requirement==='readOnly'&&permissions.readOnly===false)need('permissions.readOnly',false,'Read-only access is unavailable.');
  if(requirement==='change'&&!observed)need('permissions.change',yes(permissions.change),'Configuration/change authority is separate from inspection.');
  if(requirement==='isolation'&&!observed){
   need('permissions.isolation',yes(permissions.isolation),'Separate isolation authority is required.');
   need('electricalState',isolated,'The actual isolated state must be established before this proposed operation.');
   need('allSourcesIdentified',yes(context.allSourcesIdentified),'Identify every source and possible backfeed.');
  }
  if(requirement==='physicalPath'&&!observed)need('physicalPathConfirmed',yes(context.physicalPathConfirmed)&&context.topologyProvenance!=='unverified_download','A verified physical route is required; addresses do not establish adjacency.');
  if(requirement==='bothEnds'&&!observed)need('bothEndsConfirmed',yes(context.bothEndsConfirmed),'Both endpoints must be identified.');
  if(requirement==='bareSpan'&&!observed)need('bareSpan',yes(context.bareSpan)&&context.connectedEquipment==='none','The isolated bare span must be established.');
  if(requirement==='exactProfile'&&!observed)need('exactProfile',profileEligibility(visit,incident,context),'No verified exact model/profile action is enabled for this match. Use the manual or record observations.');
 }
 const unavailable=UNAVAILABLE.has(input.executionState)||UNAVAILABLE.has(context.executionState);
 if(unavailable)need('executionState',false,'The engineer recorded this test as unavailable; retain the reason and choose other evidence.');
 const all=unique(missing);
 return {allowed:!all.length,allowedRecord:true,recordOnly:observed||!!all.length,missing:all,
  reason:all.length?unique(reasons).join(' '):observed?'Record the displayed or reported value as evidence; it does not establish a safe electrical state.':'Recorded prerequisites permit considering this test under the applicable procedure; FINDR does not establish competence or electrical safety.',
  safeAlternative:all.length?'Keep safe-side indications, event history and missing access/tools in the log, or arrange a return visit.':'Record a fresh result, exact point and state; a suggested test is not completed evidence.'};
}

function answerEvents(visit,incidentId){return list(visit?.events).filter(e=>e.incidentId===incidentId&&e.testKind==='question_answer'&&e.ruleId);}
function eventAnswer(event){return event.answer||event.result?.rawText;}
function firstRule(route){return list(route?.rules)[0]||null;}
function resolveTarget(target){const rule=getRule(target);return rule||firstRule(getRoute(target));}
function step(kind,question,why,extra={}){return {kind,question,why,template:'observation',blockedReasons:[],...extra};}
/** Choose one next evidence question; no answers are inferred from imported data or readings. */
export function getNextFieldStep(visit,incidentId,input={}){
 const incident=incidentFor(visit,incidentId);
 if(!incident)return step('clarification','Choose the incident being investigated.','Keep each affected function and its evidence in its own thread.');
 const emergency=getEmergencyState(visit,incident,input);
 if(emergency.active)return step('emergency','Follow the site emergency process now.',emergency.message,{blockedReasons:emergency.reasons,routeId:incident.routeId||''});
 const route=getRoute(incident.routeId);
 if(!route)return step('clarification',/open|break|continuity/i.test(incident.exactComplaint||'')?'Is the physical circuit topology known?':'Which affected function or symptom should this investigation follow?','Choose a route or keep recording observations. Unknown equipment does not enable fixed limits or physical cable-order assumptions.',{routeId:''});
 const {context}=contextFor(visit,incident,input),events=answerEvents(visit,incident.id),key=contextKey(visit,incident,input);
 let rule=firstRule(route),traversed=new Set(),unknownCount=0;
 while(rule){
  if(traversed.has(rule.id))return step('handover','Keep this branch unresolved and prepare the next visit.','The recorded branch returns to an earlier question; gather new comparable evidence instead of repeating it.',{routeId:rule.routeId||route.id});
  traversed.add(rule.id);
  const recorded=events.filter(e=>e.ruleId===rule.id);
  const latest=recorded.at(-1),answer=latest&&eventAnswer(latest);
  const changed=latest?.prerequisiteKey&&latest.prerequisiteKey!==key;
  if(latest&&!(answer==='blocked'&&changed)){
   if(answer==='unknown')unknownCount+=Math.max(1,recorded.filter(e=>eventAnswer(e)==='unknown'&&(!e.prerequisiteKey||e.prerequisiteKey===key)).length);
   if(unknownCount>=2)return step('handover','Record the missing evidence and a worthwhile return check.','Two unknown answers do not count as No or failed tests. Keep the uncertainty and access/tool needs visible.',{routeId:rule.routeId||route.id});
   const snapshot=latest.ruleSnapshot||rule;
   const target=latest.target||snapshot[answer+'Target']||'handover';
   if(target==='manual')return step('manual','Use the applicable manual or record why this check cannot be completed.','The existing answer is retained as unknown. The manual is context; opening it does not complete a test.',{routeId:rule.routeId||route.id,rule:clone(rule),sourceRefs:clone(rule.sourceRefs||[])});
   if(target==='handover')return step('handover','Review the evidence and leave the next action.','This branch has reached its recorded limit. A cleared indication or a completed route does not prove the cause or restoration.',{routeId:rule.routeId||route.id});
   rule=resolveTarget(target);continue;
  }
  // Questions ask for facts already observed. Their associated test template is
  // screened independently before the UI proposes actually performing it.
  const questionGate=evaluateTestEligibility(visit,incident,{id:'observation',requires:list(rule.requires).filter(x=>['readOnly','exactProfile','specialist','physicalPath'].includes(x)),reviewStatus:rule.reviewStatus},input);
  if(!questionGate.allowed)return step('clarification','Record the missing prerequisite or choose an available observation.',questionGate.reason,{rule:clone(rule),routeId:rule.routeId||route.id,blockedReasons:questionGate.missing,safeAlternative:questionGate.safeAlternative});
  const proposed=evaluateTestEligibility(visit,incident,{id:rule.testTemplate||'observation',requires:rule.testRequires||rule.requires,reviewStatus:rule.reviewStatus},input);
  return step('question',rule.question,rule.why,{rule:clone(rule),routeId:rule.routeId||route.id,template:rule.testTemplate||'observation',blockedReasons:proposed.missing,testEligibility:proposed,sourceRefs:clone(rule.sourceRefs||[]),
   symptomState:incident.currentSymptomState||'unknown',note:['cleared_before_arrival','cleared','intermittent','fault_absent'].includes(incident.currentSymptomState)?'Preserve the original event and time. A currently normal indication does not mean the cause is fixed.':''});
 }
 return step('handover','Keep the incident unresolved and record the next check.','No enabled rule remains on this branch.',{routeId:route.id});
}

export function recordFieldAnswer(visit,input={}){
 const incident=incidentFor(visit,input.incidentId),rule=getRule(input.ruleId);
 if(!incident||!rule)throw new Error('Choose an existing incident and question before recording the answer.');
 if(!['yes','no','unknown','blocked'].includes(input.answer))throw new Error('Choose Yes, No, I don’t know or Can’t do this here.');
 if(input.answer==='blocked'&&!text(input.reason).trim())throw new Error('Record why this check cannot be done here.');
 const next=clone(visit);next.events=list(next.events);
 if(input.id&&next.events.some(e=>e.id===input.id))return next;
 const at=input.now??Date.now(),event={id:input.id||uid(),incidentId:incident.id,assetIds:clone(incident.assetRefs||[]),testKind:'question_answer',
  ruleId:rule.id,ruleRevision:rule.revision,ruleSnapshot:clone(rule),eventTime:at,capturedTime:at,clockSource:'device',
  actor:input.actor||visit.engineerRef||'',answer:input.answer,question:rule.question,target:rule[input.answer+'Target']||'handover',
  prerequisiteKey:contextKey(visit,incident,input.context||{}),blockedReason:input.answer==='blocked'?input.reason:'',
  result:{kind:'state',rawText:input.answer,source:'engineer_observation',executionState:input.answer==='blocked'?'blocked':'answered'},
  interpretation:{status:input.answer==='unknown'||input.answer==='blocked'?'unknown':'recorded_observation',reason:'An answer records only the stated proposition, not a completed physical test or diagnosis.'}};
 next.events.push(event);const current=next.incidents.find(i=>i.id===incident.id);current.eventRefs=unique([...list(current.eventRefs),event.id]);next.updatedAt=at;
 // These answers directly assert a pending fire/required life-safety failure.
 // They do not infer an emergency from unrelated numeric measurements.
 if((rule.id==='F02.Q1'&&input.answer==='yes')||(rule.id==='A05.Q1'&&input.answer==='yes')||(rule.id==='F08.Q1'&&['no','unknown'].includes(input.answer))){
  current.safety={...asObj(current.safety),immediateRisk:true,emergencyResolved:false,riskReason:rule.question,riskEvidenceId:event.id};
 }
 return next;
}

/** Validate completeness and sequence of a dedicated proving-dead record. */
export function validateProvingDead(record={}){
 const r=asObj(record),instrument=asObj(r.instrument),missing=[];
 const need=(key,condition)=>{if(!condition)missing.push(key);};
 need('testKind',r.testKind==='proving_dead');need('electricalState',['isolated','proved_dead','de_energised'].includes(r.electricalState||r.circuitState));
 need('allSourcesIdentified',yes(r.allSourcesIdentified));need('isolatedAndSecured',yes(r.isolatedAndSecured));need('point',namedPoint(r.point)||(list(r.points).length>0&&r.points.every(namedPoint)));
 need('sources',list(r.sources).length>0&&r.sources.every(known));need('instrument.type',['two_pole_indicator','test_lamp'].includes(instrument.type));need('instrument.suitable',yes(instrument.suitable));
 need('instrument.provingMethod',rationale(instrument.provingMethod||r.provingMethod));
 const before=asObj(instrument.proofBefore||r.proofBefore),after=asObj(instrument.proofAfter||r.proofAfter);
 need('proofBefore',before.result==='passed');need('proofAfter',after.result==='passed');
 const beforeTime=date(before.at||before.time),afterTime=date(after.at||after.time);need('proofSequence',Number.isFinite(beforeTime)&&Number.isFinite(afterTime)&&beforeTime<afterTime);
 const required=list(r.requiredPairs).length?r.requiredPairs:r.singlePhase!==false?['L-N','L-PE','N-PE']:[];
 need('requiredPairs',required.length>0);
 for(const pair of required){
  const entry=list(r.pairs||r.conductorPairs).find(p=>p.pair===pair),at=date(entry?.at||entry?.time);
  need('pair.'+pair,!!entry&&['absence','absence_confirmed','no_voltage_indicated'].includes(entry.result)&&Number.isFinite(at)&&at>beforeTime&&at<afterTime);
 }
 const valid=!missing.length;
 return {valid,recordComplete:valid,status:valid?'complete_record':after.result==='failed'?'invalid':'incomplete',missing,
  reason:valid?'The dedicated proof record is complete. It records the competent person’s procedure; software does not establish electrical safety.':after.result==='failed'?'The final instrument proof failed. The proving-dead sequence is invalid, even if the conductor checks indicated absence.':'The dedicated proving-dead sequence is incomplete. Earlier voltage readings, a non-contact pen or a checkbox cannot replace it.',
  establishesSafeIsolation:false};
}

const eventState=e=>typeof e?.circuitState==='string'?e.circuitState:JSON.stringify(e?.circuitState||null);
const quantity=e=>({value:e?.result?.value,unit:e?.result?.unit||'',raw:e?.result?.rawText});
/** Compare like-for-like evidence; preserve both entries when conditions differ. */
export function compareTestEvents(a,b,options={}){
 const reasons=[],drop=options.kind==='voltage_drop',boundary=options.kind==='boundary',qa=quantity(a),qb=quantity(b);
 if(!a||!b)return {comparable:false,reasons:['Two recorded tests are needed.'],difference:null};
 for(const key of ['operatingState','loadState','powerDomain']){
  if(!known(a[key])||!known(b[key])||a[key]!==b[key])reasons.push('Different or unknown '+key+'.');
 }
 if(!a.circuitState||!b.circuitState||eventState(a)!==eventState(b)||/unknown/.test(eventState(a)+eventState(b)))reasons.push('Different or unknown circuit state.');
 if(!list(a.points).length||!list(b.points).length)reasons.push('The actual test points must be recorded.');
 if(!drop&&!boundary&&JSON.stringify(a.points)!==JSON.stringify(b.points))reasons.push('Different test points.');
 if(a.result?.source!==b.result?.source||!(boundary?['meter','instrument','panel','visual']:['meter','instrument','panel']).includes(a.result?.source))reasons.push('The evidence sources are not comparable measurements.');
 if(a.testKind!==b.testKind||a.method!==b.method)reasons.push('Different test methods.');
 if(!Number.isFinite(date(a.eventTime))||!Number.isFinite(date(b.eventTime)))reasons.push('A measurement time is missing.');
 if(!((filled(a.comparisonId)&&a.comparisonId===b.comparisonId)||options.sameConditionConfirmed===true))reasons.push('The same comparison conditions have not been confirmed.');
 if(qa.unit!==qb.unit)reasons.push('Different units; preserve the raw readings.');
 if(drop&&(!['V DC','V_DC','V','mV DC','mV_DC'].includes(qa.unit)||!Number.isFinite(qa.value)||!Number.isFinite(qb.value)))reasons.push('DC numeric readings with matched units are required for this difference.');
 const comparable=!reasons.length,difference=comparable&&drop?qa.value-qb.value:null;
 return {comparable,reasons,difference,unit:difference!==null?qa.unit:null,eventIds:[a.id,b.id],
  different:comparable&&(qa.raw!==qb.raw||qa.value!==qb.value),message:comparable?'Compare these recorded observations; no generic pass limit is implied.':'Keep both readings and obtain comparable point, state, load and time evidence. Neither silently replaces the other.'};
}

/** Name only an evidenced investigation span, never an address-derived cable break. */
export function localisePath(visit,pathOrIncident){
 const incident=typeof pathOrIncident==='string'?incidentFor(visit,pathOrIncident):null;
 const path=asObj(incident?.context?.path||pathOrIncident),points=list(path.points),observations=list(path.observations);
 const fail=reason=>({state:'search_area',localised:false,reason,boundary:null});
 if(path.topology!=='radial')return fail(path.topology==='return_loop'?'A return-loop integrity fault needs supported directional diagnostics and verified physical boundaries; all devices can remain present.':'Establish the actual topology before narrowing a physical span.');
 if(!yes(path.verified)||!['field_trace','checked_drawing','field_observation','manufacturer_map_verified'].includes(path.provenance))return fail('The physical order is unverified. Imported addresses do not establish neighbouring devices.');
 if(!yes(path.branchesVerified)||path.unverifiedBranch===true)return fail('An unverified branch or alternate feed widens the search area. Confirm it before nominating an interval.');
 const events=list(visit?.events),corrected=new Set(events.map(e=>e.supersedes).filter(Boolean));
 const classified=observations.filter(o=>['satisfactory','fault_present'].includes(o.assessment));
 const usedPoints=new Map();
 for(const observation of classified){
  if(!filled(observation.eventId))continue;
  if(usedPoints.has(observation.eventId)&&usedPoints.get(observation.eventId)!==observation.pointId)return fail('The same saved test cannot establish evidence at two different physical points. Record a distinct current test at each boundary.');
  usedPoints.set(observation.eventId,observation.pointId);
  if(corrected.has(observation.eventId))return fail('A boundary reading has been superseded by a correction. Review the latest event and record a fresh classification before narrowing the span.');
 }
 const usable=classified.filter(o=>filled(o.eventId)&&events.some(e=>e.id===o.eventId&&e.result?.executionState==='performed'&&verifiedMethod(e)));
 const map=new Map();
 for(const observation of usable){
  const index=points.findIndex(p=>(typeof p==='string'?p:p.id)===observation.pointId);if(index<0)continue;
  if(map.has(index)&&map.get(index).assessment!==observation.assessment)return fail('Conflicting evidence exists at one physical point; retain both and repeat under comparable conditions.');
  map.set(index,observation);
 }
 const ordered=[...map].sort((a,b)=>a[0]-b[0]),changes=ordered.slice(1).map((entry,i)=>[ordered[i],entry]).filter(([a,b])=>a[1].assessment!==b[1].assessment);
 if(changes.length!==1)return fail('There is no single supported change of condition. Multiple faults, shared paths or changed conditions remain possible.');
 const [[from,a],[to,b]]=changes[0];
 if(to!==from+1)return fail('The observed boundaries are not confirmed adjacent physical points; inspect the intervening route before narrowing.');
 if(a.eventId===b.eventId)return fail('Distinct current tests are required at the two physical boundaries.');
 const ea=list(visit.events).find(e=>e.id===a.eventId),eb=list(visit.events).find(e=>e.id===b.eventId);
 if(!compareTestEvents(ea,eb,{kind:'boundary',sameConditionConfirmed:yes(path.sameConditionConfirmed)}).comparable)return fail('Boundary observations were not made under confirmed comparable conditions.');
 const label=p=>typeof p==='string'?p:p.label||p.id;
 return {state:'localised',localised:true,boundary:{from:points[from],to:points[to]},evidenceIds:[a.eventId,b.eventId],
  reason:'Investigate '+label(points[from])+' outgoing termination, the intervening run and '+label(points[to])+' incoming termination. This is an evidenced inspection span, not a proven cable-break location.'};
}

export function validateFinding(visit,finding={}){
 const forIds=list(finding.evidenceForIds),verificationIds=list(finding.verificationTestIds),events=list(visit?.events);
 const knownEvidence=forIds.length>0&&forIds.every(id=>events.some(e=>e.id===id));
 const discriminatingIds=forIds.filter(id=>events.some(e=>e.id===id&&verifiedMethod(e)&&e.result?.executionState==='performed'&&e.interpretation?.discriminating===true&&known(e.interpretation?.reason||e.interpretation?.discriminatingReason)&&['meter','instrument','panel','visual'].includes(e.result?.source)&&!['reset','substitution','power_cycle'].includes(e.testKind)));
 const discriminating=discriminatingIds.length>0;
 const verified=verificationIds.length>0&&verificationIds.every(id=>events.some(e=>e.id===id&&verifiedMethod(e)&&e.result?.executionState==='performed'&&e.verification?.passed===true));
 const separateRetest=verificationIds.some(id=>!discriminatingIds.includes(id));
 const identified=known(finding.text||finding.cause);
 const cause=finding.state==='cause_verified';
 const supported=knownEvidence&&discriminating&&verified&&separateRetest&&identified&&known(finding.verifiedBy);
 return {valid:!cause||supported,state:cause&&!supported?'consistent_with':finding.state||'reported',
  reason:cause?'A verified cause requires linked discriminating evidence, an identified cause, appropriate retest and engineer confirmation. Reset, substitution or silence alone is insufficient.':'Keep the evidence, counter-evidence and limits with this finding.'};
}

/** The method defines what OL means; an isolated pair is not an end-to-end conductor. */
export function interpretCoaxObservation(event,context={}){
 const gate=evaluateTestEligibility({incidents:[],events:[]},{context,permissions:context.permissions||{},safety:{}},'resistance',{...context,source:event?.result?.source||'meter',points:event?.points,operatingState:event?.operatingState});
 const ready=gate.allowed&&yes(context.pocExcluded)&&context.connectedEquipment==='none'&&yes(context.bareSpan)&&context.farEndDisposition==='open';
 if(!ready)return {state:'recorded_only',reason:'The original reading is retained. Interpretation needs the fully isolated identified bare span, both ends, PoC exclusion and the precise conductor test.',missing:unique([...gate.missing,...(!yes(context.pocExcluded)?['pocExcluded']:[])])};
 const overrange=event?.result?.kind==='overrange'||/^(OL|overrange)$/i.test(text(event?.result?.rawText).trim());
 if(!overrange)return {state:'recorded_only',reason:'Retain this result against its stated test method; no generic cable pass limit is applied.'};
 if(event.method==='centre_to_shield')return {state:'expected_open',reason:'OL between centre and shield with the isolated far end open is consistent with no connection between those intentionally separate conductors; it does not prove end-to-end continuity.'};
 if(['centre_end_to_end','shield_end_to_end'].includes(event.method))return {state:'possible_discontinuity',reason:'OL end-to-end on this same identified conductor supports investigating that conductor and both terminations on this span. It does not uniquely prove a damaged cable.'};
 return {state:'recorded_only',reason:'Specify centre-to-shield or the same conductor end-to-end before interpreting OL.'};
}

export function getRestorationStatus(visit){
 const events=list(visit?.events),items=list(visit?.impairments),introduced=items.filter(i=>i.existingOrIntroduced!=='existing'),existing=items.filter(i=>i.existingOrIntroduced==='existing');
 const unresolved=[];
 const verifiedEvent=(id,incidentId)=>events.some(e=>e.id===id&&(!incidentId||e.incidentId===incidentId)&&verifiedMethod(e)&&e.result?.executionState==='performed'&&e.verification?.passed===true);
 for(const item of items){
  const records=list(item.restorationRecords),last=asObj(records.at(-1)),record={...item,...last,...asObj(last.patch)};
  const ids=list(record.verificationEventIds||item.verificationEventIds);
  const verified=ids.length>0&&ids.every(id=>verifiedEvent(id,item.incidentId));
  const restored=Number.isFinite(date(record.restoredAt))&&known(record.restoredBy)&&known(record.normalConfiguration||item.normalConfiguration)&&verified;
  const monitoring=!positive(item.monitoringRequired)||(known(record.monitoringReceipt||item.monitoringReceipt)&&yes(record.monitoringOffTest||item.monitoringOffTest));
  if(!restored||!monitoring)unresolved.push({id:item.id,existingOrIntroduced:item.existingOrIntroduced||'introduced',reason:!restored?'Restoration and the linked functional retest are unverified.':'Monitoring removal from test and acknowledgement remain unconfirmed.'});
 }
 const handover=asObj(visit?.handover),siteAcknowledged=known(handover.siteAcknowledgement)||known(handover.acknowledgedBy);
 const monitoringAcknowledged=known(handover.monitoringAcknowledgement)||handover.monitoringNotApplicable===true;
 const incidents=list(visit?.incidents);
 const pendingIncidents=incidents.filter(i=>!['function_restored','cause_verified','verified'].includes(i.verificationState)||!list(i.verificationEventIds).length||!list(i.verificationEventIds).every(id=>verifiedEvent(id,i.id)));
 const eventRefs=list(handover.verificationEventIds),functionalVerified=incidents.length>0&&!pendingIncidents.length&&eventRefs.every(id=>verifiedEvent(id));
 const emergency=getEmergencyState(visit,null).active;
 const fullyRestored=!emergency&&!unresolved.length&&siteAcknowledged&&monitoringAcknowledged&&functionalVerified;
 return {status:fullyRestored?'verified':unresolved.length?'impaired':'unverified',fullyRestored,
  unresolved,introducedCount:introduced.length,existingCount:existing.length,pendingIncidentIds:pendingIncidents.map(i=>i.id),siteAcknowledged,monitoringAcknowledged,
  canClose:fullyRestored||(!emergency&&known(handover.owner)&&known(handover.reviewBy)&&known(handover.systemLeft)&&yes(handover.impairmentAccepted)),
  reason:fullyRestored?'The recorded functions, restoration items and acknowledgements are verified.':'Keep restoration prominently unverified unless each affected function, temporary change and required acknowledgement is accounted for. An agreed impaired handover remains distinct from full reinstatement.'};
}

export function rankFieldRoutes(visit,incidentId){
 const incident=incidentFor(visit,incidentId),systems=list(incident?.systemTypes),complaint=text(incident?.exactComplaint).toLowerCase();
 return FIELD_ROUTES.map(route=>({route,score:(route.id===incident?.routeId?100:0)+(list(route.systems).some(s=>systems.includes(s))?20:0)+(list(route.systems).includes('shared')?5:0)+text(route.title).toLowerCase().split(/\W+/).filter(w=>w.length>3&&complaint.includes(w)).length}))
  .sort((a,b)=>b.score-a.score||a.route.id.localeCompare(b.route.id)).map(({route,score})=>({routeId:route.id,title:route.title,score,reason:route.id===incident?.routeId?'The engineer selected this route.':'Ordered by the recorded discipline and symptom words; this is not a diagnosis or probability.'}));
}
