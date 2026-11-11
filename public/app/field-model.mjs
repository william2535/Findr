// Offline visit records. Recorded facts, suggestions and restoration are separate.
// This module never turns a number, an answer or an imported label into a diagnosis.
export const FIELD_SCHEMA_VERSION = 1;
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const obj = value => isObject(value) ? value : {};
const list = value => Array.isArray(value) ? value : [];
const clone = value => structuredClone(value);
const text = value => value == null ? '' : String(value);
const present = value => value !== undefined && value !== null && value !== '';
const uid = () => globalThis.crypto?.randomUUID?.() || `field-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const captureTime = value => Number.isFinite(value) && value >= 0 ? value : Date.now();
const knownTime = value => Number.isFinite(value) && value >= 0 ? value : typeof value === 'string' && value.trim() && Number.isFinite(Date.parse(value)) ? value : null;
const canonical = value => JSON.stringify(value, (_key,item) => isObject(item) ? Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])) : item);
const digest = value => {let hash=2166136261;for(const c of canonical(value)||'')hash=Math.imul(hash^c.charCodeAt(0),16777619);return (hash>>>0).toString(16).padStart(8,'0');};
const defaultHandover = () => ({outcome:'unresolved',restorationStatus:'unverified',summary:'',nextAction:'',owner:'',reviewBy:'',systemLeft:''});
const defaultIncident = (id,input={}) => ({id,systemTypes:[],exactComplaint:'',currentSymptomState:'unknown',provenance:'engineer_observation',impact:'',assetRefs:[],eventRefs:[],candidateFindings:[],diagnosisState:'unresolved',routeId:'',safety:{},permissions:{},context:{},...clone(obj(input))});
const systemFor = category => ({fire:'fire',access:'access','access-control':'access',cctv:'cctv',security:'intruder',intruder:'intruder','intruder-alarm':'intruder'}[category]||category||'unknown');

/** Keep the raw entry and its precision. Normalisation is not an interpretation. */
export function normalizeResult(input={}) {
  input=isObject(input)?clone(input):{rawText:text(input)};
  const rawText=Object.hasOwn(input,'rawText')?text(input.rawText):Object.hasOwn(input,'value')?text(input.value):'';
  const raw=rawText.trim(),inline=raw.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*(kΩ|MΩ|Ω|kohms?|ohms?|mV|V|mA|A)$/i),unit=text(input.unit)||(inline?inline[2]:''),numericText=inline?inline[1]:raw,lower=raw.toLowerCase();
  const next={...input,rawText,unit,source:input.source||'unknown',executionState:input.executionState||(lower==='not tested'||lower==='not_tested'?'not_tested':lower==='blocked'?'blocked':lower===''||lower==='unknown'?'unknown':'performed')};
  // An explicit numeric value can never turn unavailable text into zero.
  delete next.value;delete next.normalizedValue;delete next.normalizedUnit;
  const unavailable=new Set(['','unknown','not tested','not_tested','no reading','no data','unavailable','blocked','not permitted','inaccessible','unable to inspect']);
  if(unavailable.has(lower))next.kind='unavailable';
  else if(/^(?:ol|overrange|over range|overflow|out of range)$/i.test(raw))next.kind='overrange';
  else if(/^(?:unstable|fluctuating|intermittent)$/i.test(raw))next.kind='fluctuating';
  else if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(numericText)&&Number.isFinite(Number(numericText))){
    next.kind='numeric';next.value=Number(numericText);next.precision=(numericText.match(/\.(\d*)/)?.[1]||'').length;
    const units={'Ω':['Ω',1],ohm:['Ω',1],ohms:['Ω',1],'kΩ':['Ω',1000],kohm:['Ω',1000],kohms:['Ω',1000],'MΩ':['Ω',1000000],mohm:['Ω',.001],V:['V',1],mV:['V',.001],A:['A',1],mA:['A',.001]};
    const convert=units[unit]||units[unit.toLowerCase()];if(convert){next.normalizedValue=next.value*convert[1];next.normalizedUnit=convert[0];}
  }else if(input.kind==='range'&&Number.isFinite(input.min)&&Number.isFinite(input.max)){next.kind='range';next.min=input.min;next.max=input.max;}
  else next.kind=['state','transition','indication'].includes(input.kind)?input.kind:'state';
  return next;
}

function normalizeVisit(value,id) {
  const old=clone(obj(value));
  const visit={id:id||old.id||uid(),schemaVersion:FIELD_SCHEMA_VERSION,siteRef:'',localTimeZone:'',engineerRef:'',parentVisitId:null,state:'open',incidents:[],assets:[],events:[],impairments:[],handover:defaultHandover(),...old};
  for(const key of ['incidents','assets','events','impairments']){
    if(!Array.isArray(visit[key])){visit.retainedMalformed={...obj(visit.retainedMalformed),[key]:visit[key]};visit[key]=[];}
  }
  visit.handover={...defaultHandover(),...obj(old.handover)};
  visit.incidents=visit.incidents.map((incident,index)=>defaultIncident(incident?.id||`${visit.id}:incident:${index}`,obj(incident)));
  return visit;
}

/** Lazy, repeatable migration; original session fields are never changed or removed. */
export function ensureFieldVisit(session={},now=Date.now()) {
  session=obj(session);const old=obj(session.fieldVisit),id=text(session.id||old.id)||`legacy-${digest(session)}`;
  const visit=normalizeVisit(old,id),inv=obj(session.investigation);
  const first=!session.fieldVisit;
  if(first){
    visit.siteRef=text(session.site);visit.localTimeZone=text(session.localTimeZone||session.timeZone);visit.engineerRef=text(inv.setup?.engineer||session.engineer);
    visit.createdAt=knownTime(session.started);visit.parentVisitId=session.parentVisitId||null;
    const original=clone(session);delete original.fieldVisit;visit.legacySnapshot=original;
    visit.migration={version:1,capturedAt:captureTime(now),source:'FINDR existing session',note:'Legacy capture times are not asserted test times. Originals retained.'};
    if(inv.handover)visit.handover={...defaultHandover(),...clone(inv.handover),outcome:inv.handover.status==='resolved'?'legacy_resolved':'unresolved',restorationStatus:inv.handover.restored==='yes'?'legacy_recorded':'unverified',nextAction:text(inv.handover.nextSteps),owner:text(inv.handover.handoverTo)};
  }
  const incidentId=`${id}:incident:legacy`;
  const hasLegacy=present(session.message)||present(session.notes)||present(session.group)||!!session.importedContext||isObject(session.investigation)||Object.keys(obj(session.answers)).length>0||list(session.guideHistory).length>0;
  if(hasLegacy&&(!visit.incidents.length||(!visit.incidents.some(x=>x.id===incidentId)&&!old.id)))visit.incidents.push(defaultIncident(incidentId,{systemTypes:session.panel?.category?[systemFor(session.panel.category)]:[],exactComplaint:text(session.message),provenance:session.importedContext?'imported_configuration_context':'legacy_record',impact:text(inv.setup?.impact),context:{legacyGroup:session.group||'',modelConfirmed:session.confirmed===true}}));
  const incident=visit.incidents.find(x=>x.id===incidentId)||visit.incidents[0];
  const panelId=visit.assets.find(asset=>asset.kind==='panel')?.id||`${id}:asset:panel`;
  if(session.panel&&!visit.assets.some(x=>x.id===panelId))visit.assets.push({id:panelId,kind:'panel',manufacturer:text(session.panel.brand),model:text(session.panel.model),variant:'',firmware:'',protocol:'',label:text(session.panel.model),location:'',localAddress:{},edges:[],identityProvenance:session.confirmed===true?'legacy_engineer_confirmation':'unconfirmed',legacyOriginal:clone(session.panel)});
  if(incident&&!incident.assetRefs.length&&session.panel)incident.assetRefs.push(panelId);
  const appendLegacy=(kind,key,raw,properties={})=>{
    if(raw===undefined)return;
    const eventId=`legacy:${id}:${kind}:${digest([key,raw])}`;
    if(visit.events.some(event=>event?.id===eventId))return eventId;
    const event={id:eventId,incidentId:incident?.id||incidentId,assetIds:session.panel?[panelId]:[],eventTime:null,capturedTime:null,clockSource:'legacy_time_unknown',actor:'',testKind:kind,method:'legacy_record',points:[],circuitState:'unknown',operatingState:'unknown',result:normalizeResult({rawText:typeof raw==='string'?raw:canonical(raw),source:'legacy',executionState:'recorded'}),interpretation:{status:'unverified',reason:'Retained legacy record; missing test method, time and conditions remain unknown.'},attachments:[],legacyPath:key,legacyOriginal:clone(raw),...clone(properties)};
    visit.events.push(event);if(incident&&!incident.eventRefs.includes(eventId))incident.eventRefs.push(eventId);return eventId;
  };
  if(present(session.notes))appendLegacy('legacy_observation','notes',session.notes);
  for(const [key,answer]of Object.entries(obj(session.answers)))appendLegacy('question_answer',`answers.${key}`,answer,{ruleId:key,result:normalizeResult({kind:'state',rawText:text(answer),source:'legacy_engineer_answer',executionState:'answered'})});
  for(const [index,entry]of list(session.guideHistory).entries())appendLegacy('question_history',`guideHistory.${index}`,entry,{capturedTime:knownTime(entry.recordedAt),clockSource:'legacy_capture_time_only'});
  const measurementIds=new Map();
  for(const [index,entry]of list(inv.measurements).entries())if(isObject(entry))measurementIds.set(entry.id,`legacy:${id}:measurement:${digest([`investigation.measurements.${index}`,entry])}`);
  for(const [index,entry]of list(inv.measurements).entries()){
    const source=obj(entry),at=knownTime(source.recordedAt);
    appendLegacy('measurement',`investigation.measurements.${index}`,entry,{capturedTime:at,clockSource:at===null?'legacy_time_unknown':'legacy_capture_time_only',actor:text(source.engineer),testKind:source.kind||'measurement',method:source.entryMode==='quick'?'legacy_quick_reading':'legacy_record',points:[{role:'recorded_point',location:text(source.location),terminal:text(source.reference)}],circuitState:'unknown',operatingState:text(source.condition)||'unknown',instrument:{id:text(source.instrument)},result:normalizeResult({rawText:text(source.value),unit:text(source.unit),source:'legacy',executionState:'recorded'}),interpretation:{status:'unverified',legacyAssessment:source.assessment||'not_assessed',reference:text(source.expected),source:text(source.source),reason:'Original context retained; no new pass or model interpretation inferred.'},notes:text(source.notes),...(source.supersedes?{supersedes:measurementIds.get(source.supersedes)||source.supersedes}:{})});
  }
  for(const [key,entry]of Object.entries(obj(inv.checks)))appendLegacy('legacy_check',`investigation.checks.${key}`,entry,{ruleId:key,capturedTime:knownTime(entry?.updatedAt||entry?.recordedAt),actor:text(entry?.engineer)});
  for(const [index,entry]of list(inv.actions).entries())appendLegacy('work',`investigation.actions.${index}`,entry,{capturedTime:knownTime(entry?.recordedAt),actor:text(entry?.engineer),result:normalizeResult({rawText:text(entry?.action),source:'legacy',executionState:'recorded'}),notes:[entry?.reason,entry?.outcome].filter(present).join('\n')});
  if(inv.loop&&(list(inv.loop.points).length||list(inv.loop.observations).length||present(inv.loop.source)))appendLegacy('path_evidence','investigation.loop',inv.loop);
  if(inv.legacyEvidence)appendLegacy('legacy_evidence','investigation.legacyEvidence',inv.legacyEvidence);
  for(const key of ['checks','measurements','actions'])if(Object.hasOwn(inv,key)&&(key==='checks'?!isObject(inv[key]):!Array.isArray(inv[key])))appendLegacy('legacy_evidence',`investigation.${key}`,inv[key]);
  if(session.importedContext){
    const c=clone(session.importedContext),assetId=`${id}:asset:import`;
    if(!visit.assets.some(asset=>asset.id===assetId))visit.assets.push({id:assetId,kind:'imported_device',manufacturer:text(c.manufacturer),model:text(c.model),label:text(c.partNumber||c.type),location:text(c.location),localAddress:Object.fromEntries(['panel','node','loop','address','subAddress','zone'].filter(k=>Object.hasOwn(c,k)).map(k=>[k,c[k]])),edges:[],identityProvenance:'imported_configuration',expectedConfiguration:c,confirmedOnSite:false});
    appendLegacy('configuration_import','importedContext',c,{assetIds:[assetId],capturedTime:knownTime(c.importedAt),result:normalizeResult({rawText:'Dated imported configuration; current installation and physical order unverified.',source:'import',executionState:'recorded'})});
  }
  return visit;
}

export function createIncident(value,input={},now=Date.now()) {
  input=removeSecrets(input);
  const visit=normalizeVisit(value,value?.id),id=text(input.id)||uid();
  const existing=visit.incidents.find(item=>item.id===id);if(existing){if(Object.entries(input).some(([key,item])=>canonical(existing[key])!==canonical(item)))throw Error('This incident ID is already saved with different details. Edit the existing incident instead.');return visit;}
  const incident=defaultIncident(id,input);incident.createdAt=Object.hasOwn(input,'createdAt')?knownTime(input.createdAt):captureTime(now);
  visit.incidents.push(incident);visit.currentIncidentId=id;visit.updatedAt=captureTime(now);return visit;
}

/** Client IDs make retries idempotent; changed input needs a correction/new event. */
export function addTestEvent(value,input,now=Date.now()) {
  if(!isObject(input))throw Error('Enter a test result before saving.');
  const supplied=input;input=removeSecrets(input);
  const removedSecrets=canonical(input)!==canonical(supplied);
  const visit=normalizeVisit(value,value?.id),id=text(input.id)||uid(),existing=visit.events.find(item=>item?.id===id);
  const incidentId=text(input.incidentId||visit.currentIncidentId||visit.incidents[0]?.id);
  const incident=visit.incidents.find(item=>item.id===incidentId);if(!incident)throw Error('Choose an incident for this test.');
  const event={...clone(input),id,incidentId,assetIds:clone(list(input.assetIds)),testKind:text(input.testKind)||'custom',method:text(input.method),eventTime:knownTime(input.eventTime),capturedTime:existing?.capturedTime??captureTime(now),clockSource:text(input.clockSource)||'engineer_entry',actor:text(input.actor||visit.engineerRef),points:clone(list(input.points)),circuitState:clone(input.circuitState??'unknown'),operatingState:text(input.operatingState)||'unknown',result:normalizeResult(input.result??{rawText:input.rawText,unit:input.unit,source:input.source,executionState:input.executionState}),interpretation:clone(input.interpretation||{status:'recorded_only',reason:'No applicable comparison or diagnosis has been confirmed.'}),attachments:clone(list(input.attachments))};
  if(removedSecrets||existing?.redactionNotice)event.redactionNotice=existing?.redactionNotice||'Credential-like values were removed before this event was stored.';
  if(existing){if(canonical(existing)!==canonical(event))throw Error('This test ID is already saved with different details. Add a correction to retain both records.');return visit;}
  for(const field of ['supersedes','repeats'])if(present(event[field])){
    const original=visit.events.find(item=>item?.id===event[field]);if(!original)throw Error(`The ${field==='supersedes'?'original':'earlier'} test is unavailable.`);
    if(original.incidentId!==incidentId)throw Error('Link a previous test from the same incident.');
    if(field==='supersedes'&&visit.events.some(item=>item?.supersedes===event[field]))throw Error('This test already has a correction. Correct the latest entry.');
  }
  visit.events.push(event);incident.eventRefs||=[];incident.eventRefs.push(id);visit.updatedAt=captureTime(now);return visit;
}

export function addImpairment(value,input={},now=Date.now()) {
  input=removeSecrets(input);
  const visit=normalizeVisit(value,value?.id),id=text(input.id)||uid(),existing=visit.impairments.find(item=>item?.id===id);if(existing){if(Object.entries(input).some(([key,item])=>canonical(existing[key])!==canonical(item)))throw Error('This impairment ID is already saved with different details. Record an update instead.');return visit;}
  if(!text(input.affectedAssetOrFunction).trim())throw Error('Record the affected asset or function.');
  if(!['existing','introduced'].includes(input.existingOrIntroduced))throw Error('Distinguish an existing impairment from one introduced on this visit.');
  const record={...clone(input),id,start:knownTime(input.start),capturedTime:captureTime(now),authorisedByRole:text(input.authorisedByRole),measures:text(input.measures),owner:text(input.owner),reviewBy:input.reviewBy??'',restoredAt:null,verificationEventIds:[],restorationRecords:[]};
  visit.impairments.push(record);visit.updatedAt=captureTime(now);return visit;
}

/** Append change history; restoring one item never clears another impairment. */
export function updateImpairment(value,id,patch={},now=Date.now()) {
  patch=removeSecrets(patch);
  const visit=normalizeVisit(value,value?.id),record=visit.impairments.find(item=>item?.id===id);if(!record)throw Error('The impairment is unavailable.');
  if(Object.hasOwn(patch,'id')&&patch.id!==id)throw Error('An impairment ID cannot be changed.');
  if(Object.hasOwn(patch,'existingOrIntroduced')&&patch.existingOrIntroduced!==record.existingOrIntroduced)throw Error('The original impairment classification is retained.');
  const before=clone(record);delete before.restorationRecords;
  const entry={id:text(patch.changeId)||uid(),recordedAt:captureTime(now),before,patch:clone(patch)};
  const previous=list(record.restorationRecords).find(change=>change.id===entry.id);if(previous){if(canonical(previous.patch)!==canonical(patch))throw Error('This impairment update ID is already saved with different details. Create a new update.');return visit;}
  const history=[...list(record.restorationRecords),entry];Object.assign(record,clone(patch),{id,restorationRecords:history});delete record.changeId;
  visit.updatedAt=captureTime(now);return visit;
}

/** A return is a new visit; prior evidence is a reference, never a current retest. */
export function createReturnVisit(session,newId=uid(),now=Date.now()) {
  const prior=ensureFieldVisit(session,now),started=captureTime(now),id=text(newId);if(!id||id===prior.id)throw Error('A return visit needs a new ID.');
  const incidents=prior.incidents.map((incident,index)=>defaultIncident(`${id}:incident:${index}`,{systemTypes:clone(incident.systemTypes),exactComplaint:incident.exactComplaint,currentSymptomState:'unknown',provenance:'prior_visit_report',impact:incident.impact,assetRefs:clone(incident.assetRefs),routeId:incident.routeId,context:{priorIncidentId:incident.id},parentIncidentId:incident.id}));
  const impairments=prior.impairments.filter(item=>!item.restoredAt).map((item,index)=>({...clone(item),id:`${id}:impairment:${index}`,parentImpairmentId:item.id,existingOrIntroduced:'existing',restoredAt:null,verificationEventIds:[],restorationRecords:[],priorVisitId:prior.id}));
  const next={id,started,parentVisitId:prior.id,panel:clone(session.panel||{}),site:session.site||prior.siteRef,message:session.message||'',confirmed:session.confirmed===true,answers:{},notes:'',unresolved:true};
  next.fieldVisit=normalizeVisit({id,schemaVersion:1,siteRef:prior.siteRef,localTimeZone:prior.localTimeZone,engineerRef:'',parentVisitId:prior.id,state:'open',createdAt:started,incidents,assets:clone(prior.assets),events:[],impairments,handover:defaultHandover(),currentIncidentId:incidents[0]?.id||'',priorVisitReference:{id:prior.id,incidentIds:prior.incidents.map(item=>item.id),handover:clone(prior.handover),outstandingImpairmentIds:prior.impairments.filter(item=>!item.restoredAt).map(item=>item.id)},migration:{version:1,source:'return_visit',capturedAt:started}},id);
  return next;
}

const secretKey = key => {
  const name=text(key).replace(/[_\s-]/g,'').toLowerCase();
  // Access decisions and token/credential state are evidence, not credential values.
  if(/(?:status|state|presented|accepted|denied|type|technology|format|count|known|available|configured|enabled|decision|event)$/.test(name))return false;
  return /(?:password|passcode|secret|apikey|rawtoken|authtoken|accesstoken|refreshtoken|tokenvalue|tokenid|credentialvalue|credentialid|engineercode|usercode|credentialcode|authorizationheader)$/.test(name)||['token','credential','credentials'].includes(name);
};
function scrubSecrets(value) {
  // Serialized legacy metadata must be inspected recursively before text patterns.
  if(/^\s*[\[{]/.test(value))try{const parsed=JSON.parse(value),safe=removeSecrets(parsed);if(canonical(parsed)!==canonical(safe))return JSON.stringify(safe);}catch{}
  return value.replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+:[^\s/@]+@/gi,'$1[credentials removed]@')
    .replace(/["']?([a-z0-9_-]*(?:password|passcode|secret|api[ _-]?key|raw[ _-]?token|auth[ _-]?token|access[ _-]?token|refresh[ _-]?token|token[ _-]?(?:value|id)|credential[ _-]?(?:value|id|code)|engineer[ _-]?code|user[ _-]?code|authorization[ _-]?header|token|credentials?))["']?\s*[:=]\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\r\n,;}]+)/gi,(match,key)=>secretKey(key)?`${key}=[removed]`:match);
}
function removeSecrets(value,key='') {
  if(secretKey(key))return '[removed]';
  if(typeof value==='string')return scrubSecrets(value);
  if(Array.isArray(value))return value.map(item=>removeSecrets(item));
  if(isObject(value))return Object.fromEntries(Object.entries(value).map(([k,item])=>[k,removeSecrets(item,k)]));
  return clone(value);
}
const identityKeys = /^(?:siteRef|site|siteName|engineerRef|engineer|actor|contact|contactName|contactRoute|email|phone|accountRef|accountReference|accountId|monitoringAccount|subscriberRef|owner|handoverTo|reportedBy|witness|witnessedBy|restoredBy|authorisedByRole|location|addressText|plate|registration|ip|ipAddress|subnet|gateway|hostname|host|mac|networkName)$/i;
function exportSnapshot(visit,redact) {
  // Screen state and unfinished drafts belong only to the local workspace.
  visit=clone(visit);delete visit.ui;
  const aliases=new Map(),counts={};
  const addAlias=(value,key)=>{if(!redact||typeof value!=='string'||!value.trim()||/^(?:unknown|not recorded|engineer_on_visit|engineer-on-visit|legacy|panel|first device|last device|engineer|site contact|keyholder|responsible person|customer|witness|arc)$/i.test(value.trim()))return;
    if(!aliases.has(value)){const family=/site/i.test(key)?'Site':/location|addressText/i.test(key)?'Location':/plate|registration/i.test(key)?'Identifier':/ip|subnet|gateway|host|mac|network/i.test(key)?'Network':'Person';counts[family]=(counts[family]||0)+1;aliases.set(value,`[${family} ${counts[family]}]`);}
  };
  const gather=value=>{if(Array.isArray(value)){value.forEach(gather);return;}if(!isObject(value))return;for(const [key,item]of Object.entries(value)){if(identityKeys.test(key))addAlias(item,key);gather(item);}};gather(visit);
  const ipAliases=new Map();
  const scrub=value=>{
    let output=scrubSecrets(value);
    if(redact){for(const [original,alias]of [...aliases].sort((a,b)=>b[0].length-a[0].length))output=output.split(original).join(alias);
      output=output.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g,ip=>{if(!ipAliases.has(ip))ipAliases.set(ip,`[Network ${ipAliases.size+1}]`);return ipAliases.get(ip);});
      output=output.replace(/(^|[^0-9A-Za-z:])((?:[0-9A-Fa-f]{0,4}:){2,7}[0-9A-Fa-f]{0,4})(?=$|[^0-9A-Za-z:])/g,(match,prefix,address)=>{if(!address.includes('::')&&address.split(':').length!==8)return match;if(!ipAliases.has(address))ipAliases.set(address,`[Network ${ipAliases.size+1}]`);return prefix+ipAliases.get(address);});
      output=output.replace(/\brtsps?:\/\/[^\s]+/gi,'[stream address redacted]');
      output=output.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,'[email redacted]');
    }return output;
  };
  const clean=(value,key='')=>{
    if(secretKey(key))return '[removed]';
    if(redact&&key==='attachments'&&isObject(value))return {reference:'[Attachment redacted]',available:value.available!==false,mimeType:text(value.mimeType),redacted:true};
    if(redact&&['legacySnapshot','priorVisitSnapshot'].includes(key))return {retainedLocally:true,redacted:true};
    if(redact&&/^(?:dataUrl|data|blob|base64|fileRef|path|attachmentUrl|previewUrl)$/i.test(key))return '[attachment omitted]';
    if(typeof value==='string')return /^data:/i.test(value)?'[attachment omitted]':scrub(value);
    if(Array.isArray(value))return value.map(item=>clean(item,key));
    if(isObject(value))return Object.fromEntries(Object.entries(value).map(([k,item])=>[k,clean(item,k)]));return value;
  };
  return clean(visit);
}
const display = value => value===null||value===undefined||value===''?'Not recorded':typeof value==='object'?JSON.stringify(value):String(value);
const readableTime = value => value===null||value===undefined?'Not recorded':Number.isFinite(value)?new Date(value).toISOString():text(value);
function textReport(visit,short=false) {
  const lines=['FINDR — Field fault finding visit',`Visit: ${visit.id}`,`Site: ${display(visit.siteRef)}`,`Engineer: ${display(visit.engineerRef)}`,`Time zone: ${display(visit.localTimeZone)}`,`Visit state: ${visit.state}`];
  if(visit.parentVisitId)lines.push(`Return from visit: ${visit.parentVisitId} — prior results are not current tests.`);
  for(const incident of visit.incidents){lines.push(`\nINCIDENT ${incident.id}`,`System: ${list(incident.systemTypes).join(', ')||'Unknown'}`,`Reported: ${display(incident.exactComplaint)}`,`As found: ${incident.currentSymptomState}`,`Evidence source: ${display(incident.provenance)}`,`Impact: ${display(incident.impact)}`,`Diagnosis: ${display(incident.diagnosisState)}`);
    for(const finding of list(incident.candidateFindings))lines.push(`Finding: ${display(finding.text)} [${display(finding.state)}]; for ${display(finding.evidenceForIds)}, against ${display(finding.counterEvidenceIds)}; limits ${display(finding.limits)}`);
  }
  if(visit.assets.length){lines.push('\nASSETS / RECORDED IDENTITY');for(const asset of visit.assets)lines.push(`${asset.id} · ${[asset.manufacturer,asset.model,asset.label].filter(present).join(' ')||'Identity unknown'} · ${display(asset.identityProvenance)}`,`  Location: ${display(asset.location)}; address: ${display(asset.localAddress)}`,...(asset.expectedConfiguration?[`  Imported configuration retained as dated hints; current correspondence ${asset.confirmedOnSite?'engineer confirmed':'unconfirmed'}.`]:[]));}
  lines.push('\nTESTS IN RECORDED ORDER');if(!visit.events.length)lines.push('No test results recorded.');
  for(const event of visit.events){const r=obj(event.result);lines.push(`${event.id} · ${event.testKind} · ${display(r.executionState)}`,`  Test time: ${readableTime(event.eventTime)}; captured: ${readableTime(event.capturedTime)}; by ${display(event.actor)}`,`  ${display(r.rawText)}${present(r.unit)?' '+r.unit:''} [${display(r.kind)}; source ${display(r.source)}]`);
    if(present(r.normalizedValue))lines.push(`  Normalised: ${r.normalizedValue} ${r.normalizedUnit}; original entry retained.`);
    if(event.points?.length)lines.push(`  Points: ${display(event.points)}`);
    lines.push(`  Circuit: ${display(event.circuitState)}; operating state: ${display(event.operatingState)}`);
    if(event.ruleId)lines.push(`  Route/rule: ${event.ruleId} · revision ${display(event.ruleRevision)}`);
    for(const key of ['method','notes','blockedReason','supersedes','repeats'])if(present(event[key]))lines.push(`  ${key}: ${display(event[key])}`);
    if(event.instrument&&Object.values(event.instrument).some(present))lines.push(`  Instrument: ${display(event.instrument)}`);
    if(event.interpretation)lines.push(`  Interpretation: ${display(event.interpretation)}`);
    if(!short&&event.attachments?.length)lines.push(`  Attachments: ${display(event.attachments)}`);
    if(!short&&event.legacyOriginal!==undefined)lines.push(`  Earlier record: ${display(event.legacyOriginal)}`);
    const printed=new Set(['id','incidentId','assetIds','testKind','eventTime','capturedTime','clockSource','actor','result','points','circuitState','operatingState','ruleId','ruleRevision','method','notes','blockedReason','supersedes','repeats','instrument','interpretation','attachments','legacyOriginal','legacyPath']);
    for(const [key,value]of Object.entries(event))if(!printed.has(key)&&present(value)&&(!short||!['ruleSnapshot','sourceProfileSnapshot'].includes(key)))lines.push(`  ${key}: ${display(value)}`);
  }
  lines.push('\nIMPAIRMENTS / RESTORATION');if(!visit.impairments.length)lines.push('No impairment entries recorded; this does not establish normal service.');
  for(const item of visit.impairments)lines.push(`${item.id} · ${item.existingOrIntroduced} · ${item.affectedAssetOrFunction}`,`  Started: ${readableTime(item.start)}; owner: ${display(item.owner)}; review: ${display(item.reviewBy)}`,`  Measures: ${display(item.measures)}; restoration: ${item.restoredAt?'recorded '+readableTime(item.restoredAt):'not confirmed'}`,`  Verification: ${display(item.verificationEventIds)}; monitoring receipt: ${display(item.monitoringReceipt)}`,...(!short?['  Change history: '+display(item.restorationRecords)]:[]));
  lines.push('\nHANDOVER',`Outcome: ${display(visit.handover.outcome)}`,`Restoration: ${display(visit.handover.restorationStatus)}`);
  for(const [key,value]of Object.entries(visit.handover))if(!['outcome','restorationStatus'].includes(key)&&present(value))lines.push(`${key}: ${display(value)}`);
  lines.push('Unknown, blocked and untested results remain explicit. A cleared indication or an entered reading does not prove cause or restoration.');
  return lines.join('\n');
}

/** Export is intentional in the UI; secrets are omitted even when identifiers are kept. */
export function exportFieldVisit(session,options={}) {
  const visit=exportSnapshot(ensureFieldVisit(session),options.redact!==false),format=options.format||'text';
  if(format==='json')return JSON.stringify({format:'findr-field-visit',schemaVersion:FIELD_SCHEMA_VERSION,redacted:options.redact!==false,visit},null,2);
  return textReport(visit,format==='short');
}

export function searchVisits(history,query='') {
  const terms=text(query).toLowerCase().trim().split(/\s+/).filter(Boolean);if(!terms.length)return list(history);
  return list(history).filter(session=>{
    const v=ensureFieldVisit(session),search=JSON.stringify({id:v.id,site:v.siteRef,assets:v.assets,incidents:v.incidents,events:v.events.map(e=>({testKind:e.testKind,ruleId:e.ruleId,method:e.method,points:e.points,result:e.result,notes:e.notes,blockedReason:e.blockedReason})),handover:v.handover,impairments:v.impairments}).toLowerCase();return terms.every(term=>search.includes(term));
  });
}

/** Sanitise new drafts/context before persistence without rewriting legacy evidence. */
export function sanitizeFieldVisitForStorage(value) {
  const clean=(item,key='')=>{
    if(['legacySnapshot','legacyOriginal'].includes(key)||(isObject(item)&&present(item.legacyPath)))return clone(item);
    if(secretKey(key))return '[removed]';
    if(typeof item==='string')return scrubSecrets(item);
    if(Array.isArray(item))return item.map(entry=>clean(entry));
    if(isObject(item))return Object.fromEntries(Object.entries(item).map(([name,entry])=>[name,clean(entry,name)]));
    return clone(item);
  };
  return clean(value);
}
