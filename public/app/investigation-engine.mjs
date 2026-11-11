// FINDR's investigation record organises evidence. It does not interpret a
// numeric reading as a diagnosis, a completed check, or a safe system state.
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => structuredClone(value);
const asObject = value => object(value) ? value : {};
const text = value => typeof value === 'string' ? value : value == null ? '' : String(value);
const nonblank = value => typeof value === 'string' && value.trim().length > 0;
const time = value => Number.isFinite(value) && value >= 0 ? value : Date.now();
let sequence = 0;
const uid = () => globalThis.crypto?.randomUUID?.() || `investigation-${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2)}`;

export function createInvestigation(groupId, now = Date.now()) {
  const at = time(now);
  return {
    version: 1, groupId: text(groupId),
    setup: {engineer:'',jobRef:'',manual:'',manualSection:'',systemState:'',authorization:'',impact:''},
    checks: {}, measurements: [], actions: [],
    handover: {status:'unresolved',summary:'',workDone:'',outstanding:'',nextSteps:'',systemLeft:'',restored:'unknown',functionalTest:'not_done',handoverTo:''},
    loop: {topologyConfirmed:false,procedureConfirmed:false,singlePathConfirmed:false,singlePathNotes:'',source:'',configuration:'',points:[],observations:[]},
    createdAt: at, updatedAt: at,
  };
}

/** Add defaults to earlier records without reassigning or deleting evidence. */
export function normalizeInvestigation(value, groupId) {
  const previous = clone(asObject(value));
  const base = createInvestigation(nonblank(previous.groupId) ? previous.groupId : groupId,
    Number.isFinite(previous.createdAt) ? previous.createdAt : Date.now());
  const next = {...base,...previous,
    groupId: nonblank(previous.groupId) ? previous.groupId : text(groupId),
    setup: {...base.setup,...asObject(previous.setup)},
    checks: {...asObject(previous.checks)},
    measurements: Array.isArray(previous.measurements) ? previous.measurements : [],
    actions: Array.isArray(previous.actions) ? previous.actions : [],
    handover: {...base.handover,...asObject(previous.handover)},
    loop: {...base.loop,...asObject(previous.loop)},
  };
  // A malformed legacy collection is retained for inspection rather than erased.
  for (const key of ['checks','measurements','actions']) {
    if (Object.hasOwn(previous,key) && (key === 'checks' ? !object(previous[key]) : !Array.isArray(previous[key]))) {
      next.legacyEvidence = {...asObject(previous.legacyEvidence),...asObject(next.legacyEvidence),[key]:previous[key]};
    }
  }
  for (const key of ['points','observations']) {
    if (!Array.isArray(next.loop[key])) {
      next.legacyEvidence = {...asObject(next.legacyEvidence),[`loop.${key}`]:next.loop[key]};
      next.loop[key] = [];
    }
  }
  return next;
}

function field(input, key, required = false) {
  const value = input[key] ?? '';
  if (typeof value !== 'string') throw new Error(`Enter ${key} as text so the original value can be retained.`);
  if (required && !value.trim()) throw new Error(`Record ${key} before saving this entry.`);
  return value;
}
const electrical = (kind, unit) => /voltage|current|resistance|continuity|impedance|electrical/i.test(kind)
  || /^(?:m?[vVaA](?:\s*(?:ac|dc))?|v\s*\/\s*ac|v\s*\/\s*dc|[kKmM]?(?:ohms?|Ω)|[uµμ]a|volts?|amps?)$/i.test(unit.trim());

function appendMeasurement(inv, input, now, quick = false) {
  if (!object(input)) throw new Error('Enter a measurement before saving.');
  const next = normalizeInvestigation(inv, inv?.groupId);
  const entry = {id:uid(),recordedAt:time(now)};
  entry.kind = quick ? field(input,'kind') || 'Voltage' : field(input,'kind',true);
  for (const key of ['value','unit','location']) entry[key] = field(input,key,true);
  for (const key of ['reference','condition','expected','source','engineer','instrument','notes','checkId','node','loop','address','zone']) entry[key] = field(input,key);
  entry.assessment = quick ? 'not_assessed' : input.assessment ?? 'not_assessed';
  if (quick) entry.entryMode = 'quick';
  if (!['within_reference','outside_reference','not_assessed'].includes(entry.assessment)) throw new Error('Choose a recorded reference assessment, or leave the reading not assessed.');
  if (!quick && electrical(entry.kind,entry.unit) && (!nonblank(entry.reference) || !nonblank(entry.condition))) {
    throw new Error('Electrical readings need the test point/reference and the powered, isolated or loading condition. Follow the exact-model procedure.');
  }
  if (entry.assessment !== 'not_assessed' && (!nonblank(entry.expected) || !nonblank(entry.source))) {
    throw new Error('Record the expected reference and its manual/source before assessing a reading.');
  }
  if (input.supersedes != null && input.supersedes !== '') {
    entry.supersedes = field(input,'supersedes',true);
    if (!next.measurements.some(item=>item?.id === entry.supersedes)) throw new Error('The reading being corrected is no longer available.');
    if (next.measurements.some(item=>item?.supersedes === entry.supersedes)) throw new Error('This reading already has a correction. Correct its latest entry instead.');
  }
  next.measurements.push(entry);
  next.updatedAt = entry.recordedAt;
  return next;
}

/** Append a detailed reading without changing earlier entries. */
export function addMeasurement(inv, input, now = Date.now()) {
  return appendMeasurement(inv, input, now);
}

/** Save a raw reading quickly; missing test context stays unrecorded, never inferred. */
export function addQuickMeasurement(inv, input, now = Date.now()) {
  return appendMeasurement(inv, input, now, true);
}

/** Work performed is recorded separately from measurement and check evidence. */
export function addInvestigationAction(inv, input, now = Date.now()) {
  if (!object(input)) throw new Error('Describe the action before saving.');
  const next = normalizeInvestigation(inv, inv?.groupId);
  const entry = {id:uid(),recordedAt:time(now),action:field(input,'action',true)};
  for (const key of ['engineer','reason','outcome']) entry[key] = field(input,key);
  next.actions.push(entry); next.updatedAt = entry.recordedAt;
  return next;
}

/** Recorded issues advance the worksheet, but are never labelled repaired. */
export function getNextCheck(inv, plan) {
  const checks = asObject(inv?.checks);
  const recorded = new Set(['satisfactory','issue_found','not_applicable','completed','pass','issue']);
  return (Array.isArray(plan?.checks) ? plan.checks : []).find(check=>!recorded.has(checks[check.id]?.status)) || null;
}

const statusLabel = value => text(value).replaceAll('_',' ') || 'Not recorded';
const human = value => text(value).replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('_',' ');
const dateText = value => Number.isFinite(value) && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toISOString() : 'Not recorded';
const line = (label,value) => `${label}: ${value === '' || value == null ? 'Not recorded' : typeof value === 'object' ? JSON.stringify(value) : text(value)}`;

/** Complete plain-text handover, including unresolved and unknown states. */
export function investigationReport(inv, plan) {
  if (!object(inv)) return '';
  const record = normalizeInvestigation(inv,inv.groupId), out = [
    '\n\nINVESTIGATION RECORD',
    line('Fault guide',record.groupId),line('Record started',dateText(record.createdAt)),line('Last updated',dateText(record.updatedAt)),
    '\nSETUP / SYSTEM STATE',
  ];
  for (const [key,value] of Object.entries(record.setup)) out.push(line(human(key),value));
  out.push('\nCHECKS / FINDINGS');
  const known = new Map((Array.isArray(plan?.checks)?plan.checks:[]).filter(object).map(check=>[check.id,check]));
  // Also show current-plan checks which have not yet been performed.
  const ids = [...new Set([...known.keys(),...Object.keys(record.checks)])];
  if (!ids.length) out.push('No investigation checks recorded.');
  for (const id of ids) {
    const check = asObject(record.checks[id]);
    out.push(`${known.get(id)?.title||id} [${id}] — ${statusLabel(check.status||'not_started')}`);
    if (Object.hasOwn(record.checks,id) && !object(record.checks[id])) out.push(line('  Retained earlier finding',record.checks[id]));
    for (const [key,value] of Object.entries(check)) if (key !== 'status') out.push(line(`  ${human(key)}`,key==='updatedAt'||key==='recordedAt'?dateText(value):value));
  }
  out.push('\nMEASUREMENTS — ORIGINAL READINGS RETAINED');
  const corrected = new Set(record.measurements.map(item=>item?.supersedes).filter(Boolean));
  if (!record.measurements.length) out.push('No measurements recorded; blanks are not zero readings.');
  for (const entry of record.measurements) {
    if (!object(entry)) { out.push(line('Retained earlier reading',entry)); continue; }
    out.push(`Reading ${entry.id||'unknown'} · ${dateText(entry.recordedAt)}${entry.entryMode==='quick'?' · quick reading (not assessed)':''}${corrected.has(entry.id)?' · corrected by a later entry (original retained)':''}`);
    for (const [key,value] of Object.entries(entry)) if (!['id','recordedAt'].includes(key)) out.push(line(`  ${human(key)}`,key==='assessment'?statusLabel(value):value));
  }
  out.push('\nWORK / ACTION LOG');
  if (!record.actions.length) out.push('No work actions recorded.');
  for (const entry of record.actions) {
    if (!object(entry)) { out.push(line('Retained earlier action',entry)); continue; }
    out.push(`Action ${entry.id||'unknown'} · ${dateText(entry.recordedAt)}`);
    for (const [key,value] of Object.entries(entry)) if (!['id','recordedAt'].includes(key)) out.push(line(`  ${human(key)}`,value));
  }
  out.push('\nPHYSICAL PATH INVESTIGATION');
  for (const key of ['topologyConfirmed','procedureConfirmed','singlePathConfirmed']) out.push(line(human(key),record.loop[key]===true?'Confirmed by engineer':'Not confirmed'));
  for (const key of ['source','configuration','singlePathNotes']) out.push(line(human(key),record.loop[key]));
  if (record.loop.points.length) out.push('Engineer-recorded physical order (not address order):',...record.loop.points.map((point,i)=>`  ${i+1}. ${text(point)}`));
  else out.push('No verified physical point sequence recorded.');
  for (const observation of record.loop.observations) {
    out.push(line('Path observation',observation));
  }
  for (const [key,value] of Object.entries(record.loop)) {
    if (!['topologyConfirmed','procedureConfirmed','singlePathConfirmed','source','configuration','singlePathNotes','points','observations'].includes(key)) out.push(line(human(key),value));
  }
  out.push('Path comparisons identify the next interval to investigate, not a proven cable-break position. Voltage may be present at both ends of an open loop supplied from both ends.');
  out.push('\nHANDOVER / OUTCOME');
  for (const [key,value] of Object.entries(record.handover)) out.push(line(human(key),['status','restored','functionalTest'].includes(key)?statusLabel(value):value));
  if (record.legacyEvidence) out.push('\nRETAINED EARLIER EVIDENCE',JSON.stringify(record.legacyEvidence,null,2));
  out.push('Recorded readings and imported details do not automatically answer checks, establish a diagnosis, confirm restoration or replace the exact-model test procedure.');
  return out.join('\n');
}

/** Compact saved log: recorded evidence only, without empty worksheet forms. */
export function investigationLogReport(inv) {
  if (!object(inv)) return '';
  const record = normalizeInvestigation(inv,inv.groupId);
  const present = value => value !== '' && value !== null && value !== undefined;
  const label = key => {const name=human(key);return name.charAt(0).toUpperCase()+name.slice(1);};
  const fields = (value, omitted=[]) => Object.entries(asObject(value)).filter(([key,item])=>!omitted.includes(key)&&present(item));
  const appendFields = entries => {
    for (const [key,value] of entries) out.push(line(`  ${label(key)}`,['recordedAt','updatedAt'].includes(key)?dateText(value):value));
  };
  const status = record.handover.status;
  const out = ['FAULT FINDING LOG',`Status: ${status==='resolved'?'Resolved':`Unresolved${present(status)&&status!=='unresolved'?' — '+statusLabel(status):''}`}`];
  const setup = fields(record.setup);
  if (setup.length) {out.push('\nCASE DETAILS');appendFields(setup);}
  out.push(`\nREADINGS (${record.measurements.length})`);
  if (!record.measurements.length) out.push('No readings saved.');
  const corrections = new Map();
  for (const entry of record.measurements) if (present(entry?.supersedes)) {
    const ids=corrections.get(entry.supersedes)||[];ids.push(entry.id);corrections.set(entry.supersedes,ids);
  }
  for (const entry of record.measurements) {
    if (!object(entry)) {out.push(line('Retained earlier reading',entry));continue;}
    const point=present(entry.location)?text(entry.location):'Point not recorded';
    const kind=present(entry.kind)?text(entry.kind):'Reading';
    const value=present(entry.value)?text(entry.value):'Value not recorded';
    out.push(`${point} · ${kind} — ${value}${present(entry.unit)?' '+text(entry.unit):''}${present(entry.recordedAt)?' · '+dateText(entry.recordedAt):''}`);
    out.push(`  ${present(entry.id)?'Reading '+text(entry.id)+' · ':''}${statusLabel(entry.assessment??'not_assessed')}`);
    if (present(entry.supersedes)) out.push(line('  Corrects reading',entry.supersedes));
    if (corrections.has(entry.id)) out.push(`  Original retained; corrected by ${corrections.get(entry.id).map(text).join(', ')}`);
    appendFields(fields(entry,['id','recordedAt','kind','value','unit','location','assessment','entryMode','supersedes']));
  }
  const checks=Object.entries(record.checks).filter(([,check])=>!object(check)?present(check):fields(check,['updatedAt','recordedAt','engineer']).some(([key,value])=>key!=='status'||value!=='not_started'));
  if (checks.length) {
    out.push('\nRECORDED CHECKS');
    for (const [id,check] of checks) {
      if (!object(check)) {out.push(line(id,check));continue;}
      out.push(`${id}${present(check.status)?' — '+statusLabel(check.status):''}`);appendFields(fields(check,['status']));
    }
  }
  if (record.actions.length) {
    out.push('\nWORK LOG');
    for (const entry of record.actions) {
      if (!object(entry)) {out.push(line('Retained earlier action',entry));continue;}
      out.push(`${present(entry.recordedAt)?dateText(entry.recordedAt)+' · ':''}${present(entry.action)?text(entry.action):'Recorded action'}`);
      appendFields(fields(entry,['recordedAt','action']));
    }
  }
  const loop=record.loop;
  if (loop.points.length||loop.observations.length||present(loop.source)||present(loop.configuration)) {
    out.push('\nRECORDED PATH EVIDENCE');
    appendFields(fields(loop).filter(([key,value])=>!Array.isArray(value)||value.length));
  }
  const handover=fields(record.handover,['status']).filter(([key,value])=>!(key==='restored'&&value==='unknown')&&!(key==='functionalTest'&&value==='not_done'));
  if (handover.length) {out.push('\nHANDOVER');appendFields(handover);}
  if (record.legacyEvidence) out.push('\nRETAINED EARLIER EVIDENCE',JSON.stringify(record.legacyEvidence,null,2));
  out.push('\nUnassessed readings are raw observations; no diagnosis or restoration is inferred.');
  return out.join('\n');
}

const review = message => ({kind:'review',message});
/**
 * Suggest where to gather the next comparable observation along an engineer-
 * verified physical sequence. No voltage threshold or imported address order
 * is interpreted. This helper does not instruct switching/disconnection.
 */
export function recommendLoopCheck(loop) {
  loop = asObject(loop);
  const points = Array.isArray(loop.points) ? loop.points : [];
  if (loop.topologyConfirmed !== true || loop.procedureConfirmed !== true || !nonblank(loop.source) || !nonblank(loop.configuration)) {
    return {kind:'setup',message:'Record the verified physical path, exact-model test procedure/source and common test configuration first. Imported address numbers do not establish cable order.'};
  }
  if (points.length < 2 || points.some(point=>!nonblank(point)) || new Set(points.map(point=>point.trim())).size !== points.length) {
    return {kind:'setup',message:'Enter at least two distinct, confirmed physical check-point labels in their verified order. Do not generate this sequence from device address numbers.'};
  }
  const observations = Array.isArray(loop.observations) ? loop.observations : [];
  if (observations.some(entry=>!object(entry)||!Number.isInteger(entry.pointIndex)||entry.pointIndex<0||entry.pointIndex>=points.length||!['satisfactory','fault_present','inconclusive'].includes(entry.assessment))) {
    return review('A path observation has an invalid point or assessment. Review the record before narrowing the investigation.');
  }
  if (observations.some(entry=>nonblank(entry.configuration)&&entry.configuration!==loop.configuration)) {
    return review('These observations were made in different test configurations. Record comparable evidence under the approved procedure before narrowing an interval.');
  }
  const byPoint = new Map();
  for (const entry of observations) {
    if (entry.assessment === 'inconclusive') continue;
    // A classification needs traceable evidence rather than an assumed result.
    if (!nonblank(entry.measurementId) && !nonblank(entry.notes)) return review('Link each path classification to a measurement or record the observed evidence. A reading is never classified automatically.');
    if (byPoint.has(entry.pointIndex) && byPoint.get(entry.pointIndex)!==entry.assessment) return review('The same point has conflicting observations. Consider changed conditions or an intermittent/multiple fault; review the evidence instead of narrowing automatically.');
    byPoint.set(entry.pointIndex,entry.assessment);
  }
  for (const index of [0,points.length-1]) {
    if (!byPoint.has(index)) return {kind:'endpoint',index,message:`Record a supported observation at ${points[index]} using the recorded model-specific procedure and test configuration. If the result is inconclusive, keep that explicit; do not assume a healthy or faulty endpoint.`};
  }
  if (loop.singlePathConfirmed !== true || !nonblank(loop.singlePathNotes)) {
    return review('Midpoint comparison requires an explicitly confirmed single test path and recorded justification from the applicable procedure. On a loop supplied from both ends, voltage can remain present beyond an open circuit; endpoint power alone does not locate the break.');
  }
  const ordered = [...byPoint].sort((a,b)=>a[0]-b[0]);
  const transitions = ordered.slice(1).map((entry,i)=>[ordered[i],entry]).filter(([a,b])=>a[1]!==b[1]);
  if (transitions.length !== 1) {
    return review(transitions.length > 1
      ? 'The observations contain more than one change of condition. Multiple paths, multiple faults or changed test conditions may be involved; review the evidence rather than selecting one interval.'
      : 'Both ends and the recorded check points have the same classification. No interval can be narrowed from this evidence. On a dual-fed loop, power at both ends does not rule out an open circuit.');
  }
  const [[from],[to]] = transitions[0];
  if (to-from===1) return {kind:'interval',from,to,message:`The next interval to investigate is between ${points[from]} and ${points[to]}, using the recorded procedure. This does not prove a cable break or identify its physical position; retain the evidence and inspect the applicable connections/path.`};
  const index = Math.floor((from+to)/2);
  return {kind:'midpoint',index,from,to,message:`The next comparable check point is ${points[index]}, between ${points[from]} and ${points[to]}, under the same approved test conditions. Record the result before choosing a smaller interval; this is an investigation aid, not a confirmed fault location.`};
}
