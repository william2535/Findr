import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureFieldVisit,createIncident,addTestEvent,addImpairment,updateImpairment,createReturnVisit,normalizeResult,exportFieldVisit,searchVisits,sanitizeFieldVisitForStorage} from '../public/app/field-model.mjs';

const fresh=()=>createIncident(ensureFieldVisit({id:'visit-1',started:100,panel:{brand:'Unknown',model:'Unknown',category:'fire'}},101),{id:'incident-1',systemTypes:['fire'],exactComplaint:'Loop 1 open',currentSymptomState:'showing_now'},102);
const reading=(id='reading-1',rawText='0.00')=>({id,incidentId:'incident-1',testKind:'voltage',points:[{role:'positive_probe',terminal:'+',location:'First device'},{role:'reference_probe',terminal:'-',location:'First device'}],circuitState:'energised_connected',operatingState:'standby',instrument:{type:'DMM',mode:'V_DC'},result:{rawText,unit:'V DC',source:'meter',executionState:'performed'}});

test('fresh blank visits stay empty for first screen, and incident creation retains independent system scope',()=>{
 const session={id:'blank',started:12,panel:{brand:'Unknown',model:'Unknown',category:'fire'},answers:{},notes:'',site:'',message:''};
 const visit=ensureFieldVisit(session,20);assert.equal(visit.incidents.length,0);assert.equal(visit.events.length,0);assert.equal(session.fieldVisit,undefined);
 let next=createIncident(visit,{id:'door',systemTypes:['access'],exactComplaint:'Door 2 will not release',routeId:'A04'},30);
 next=createIncident(next,{id:'camera',systemTypes:['cctv'],exactComplaint:'No recording',routeId:'C08'},31);
 assert.deepEqual(next.incidents.map(i=>i.systemTypes),[['access'],['cctv']]);assert.equal(next.currentIncidentId,'camera');assert.equal(next.incidents[0].diagnosisState,'unresolved');
});

test('legacy migration is pure, idempotent and retains original text without inventing test times or models',()=>{
 const session={id:'old',notes:'Previous engineer could not get access',answers:{fault_active:'unknown'},panel:{brand:'Unknown',model:'Unknown'},investigation:{measurements:[{id:'m1',value:'0.00',unit:'V DC',location:'First device',recordedAt:456},{id:'m2',value:'12.8',unit:'V DC',location:'First device',supersedes:'m1'}],checks:{'loop:trace':{status:'not_tested',notes:'No drawing'}},actions:[{action:'Inspected visible label',outcome:'Unresolved'}],handover:{nextSteps:'Return with key'}}};
 const original=structuredClone(session),v1=ensureFieldVisit(session,1000),v2=ensureFieldVisit({...session,fieldVisit:v1},2000);
 assert.deepEqual(session,original);assert.deepEqual(v2,v1);assert.deepEqual(v1.legacySnapshot,original);
 const notes=v1.events.find(e=>e.legacyPath==='notes');assert.equal(notes.result.rawText,session.notes);assert.equal(notes.eventTime,null);assert.equal(notes.capturedTime,null);
 const m1=v1.events.find(e=>e.legacyPath==='investigation.measurements.0'),m2=v1.events.find(e=>e.legacyPath==='investigation.measurements.1');
 assert.equal(m1.eventTime,null);assert.equal(m1.capturedTime,456);assert.equal(m1.result.rawText,'0.00');assert.equal(m1.result.executionState,'recorded');assert.equal(m2.supersedes,m1.id);assert.equal(m2.capturedTime,null);
 assert.equal(v1.assets[0].model,'Unknown');assert.equal(v1.incidents[0].currentSymptomState,'unknown');
});

test('later legacy edits and appended readings migrate without overwriting earlier observations',()=>{
 const old={id:'old',notes:'First note',investigation:{measurements:[{id:'m1',value:'0.00',unit:'V DC'}]}};
 const first=ensureFieldVisit(old,1),later={...old,fieldVisit:first,notes:'Updated note',investigation:{measurements:[...old.investigation.measurements,{id:'m2',value:'OL',unit:'Ω'}]}};
 const next=ensureFieldVisit(later,2);assert.equal(next.events.length,4);assert.deepEqual(next.legacySnapshot,old);
 assert.deepEqual(next.events.filter(e=>e.legacyPath==='notes').map(e=>e.result.rawText),['First note','Updated note']);assert.deepEqual(ensureFieldVisit({...later,fieldVisit:next},3),next);
});

test('imported addresses and physical label conflict remain dated hints rather than topology or current identity',()=>{
 const session={id:'import',message:'Missing address',panel:{brand:'Kentec',model:'Syncro',category:'fire'},importedContext:{loop:'01',address:'037',subAddress:'02',location:'Original reception',partNumber:'S4-720-ST-VO',importedAt:100,exportDate:'2025-01-01'}};
 const first=ensureFieldVisit(session,200),asset=first.assets.find(a=>a.kind==='imported_device');assert.equal(asset.localAddress.address,'037');assert.equal(asset.confirmedOnSite,false);assert.deepEqual(asset.edges,[]);
 asset.location='Field-confirmed stairwell';asset.identityProvenance='engineer_observed';const next=ensureFieldVisit({...session,fieldVisit:first},300);
 assert.equal(next.assets.find(a=>a.id===asset.id).location,'Field-confirmed stairwell');assert.equal(next.assets.find(a=>a.id===asset.id).expectedConfiguration.location,'Original reception');assert.equal(next.events.find(e=>e.testKind==='configuration_import').result.source,'import');
});

test('raw values, unavailable states and precision survive normalisation without unknown-to-zero conversion',()=>{
 const samples=['0','0.00','OL','unknown','not tested','no reading','fluctuating'];const results=samples.map(rawText=>normalizeResult({rawText,unit:'Ω'}));
 assert.deepEqual(results.map(r=>r.rawText),samples);assert.equal(results[0].value,0);assert.equal(results[1].precision,2);assert.equal(results[2].kind,'overrange');assert.equal(results[3].value,undefined);assert.equal(results[4].executionState,'not_tested');assert.equal(results[5].kind,'unavailable');assert.equal(results[6].kind,'fluctuating');
 const milli=normalizeResult({rawText:'1.967',unit:'kΩ'});assert.equal(milli.rawText,'1.967');assert.equal(milli.value,1.967);assert.equal(milli.normalizedValue,1967);assert.equal(milli.normalizedUnit,'Ω');assert.equal(milli.precision,3);
 const inline=normalizeResult({rawText:'1.967 kΩ'});assert.equal(inline.rawText,'1.967 kΩ');assert.equal(inline.normalizedValue,1967);
 assert.equal(normalizeResult({rawText:'unknown',value:0}).value,undefined);
});

test('test IDs make repeated saves idempotent and changed data requires an append-only correction',()=>{
 const source=fresh(),first=addTestEvent(source,reading(),200),retry=addTestEvent(first,reading(),999);
 assert.equal(source.events.length,0);assert.deepEqual(retry,first);assert.equal(first.events[0].eventTime,null);assert.equal(first.events[0].capturedTime,200);
 assert.throws(()=>addTestEvent(first,reading('reading-1','12.8'),300),/different details/);
 const next=addTestEvent(first,{...reading('correction','12.8'),supersedes:'reading-1'},300);assert.equal(next.events.length,2);assert.equal(next.events[0].result.rawText,'0.00');assert.equal(next.events[1].supersedes,'reading-1');assert.equal(next.events[1].interpretation.status,'recorded_only');
 assert.throws(()=>addTestEvent(next,{...reading('other','13'),supersedes:'reading-1'},400),/latest entry/);
});

test('a different load state remains a separate repeated observation rather than replacing evidence',()=>{
 let v=addTestEvent(fresh(),reading(),200);v=addTestEvent(v,{...reading('loaded','12.8'),operatingState:'release_demand',repeats:'reading-1',ruleId:'A04.Q2',ruleRevision:'old-pack',ruleSnapshot:{question:'Was the relay state observed?',revision:'old-pack'}},300);
 assert.equal(v.events[0].operatingState,'standby');assert.equal(v.events[1].operatingState,'release_demand');assert.equal(v.events[1].supersedes,undefined);assert.equal(v.events[1].ruleSnapshot.revision,'old-pack');
 const output=JSON.parse(exportFieldVisit({id:v.id,fieldVisit:v},{format:'json',redact:false}));assert.equal(output.visit.events[1].ruleRevision,'old-pack');assert.equal(output.visit.events[1].result.rawText,'12.8');
});

test('known credentials are removed from new events and attachments while panel fault codes remain',()=>{
 const input={...reading(),password:'synthetic-password',tokenId:'synthetic-token',faultCode:'E042',notes:'password=synthetic-phrase; physical relay still clicks',attachments:[{name:'annotated.txt',credentialCode:'1234',available:false}],referenceUrl:'rtsp://user:synthetic-pass@10.20.30.40/stream'};
 const next=addTestEvent(fresh(),input,200),json=JSON.stringify(next);for(const secret of ['synthetic-password','synthetic-token','synthetic-phrase','1234','synthetic-pass'])assert.ok(!json.includes(secret),secret);
 assert.equal(next.events[0].faultCode,'E042');assert.match(next.events[0].redactionNotice,/removed/);assert.equal(input.password,'synthetic-password');
});

test('individual impairment change history preserves pre-existing items and original state',()=>{
 let v=addImpairment(fresh(),{id:'existing',existingOrIntroduced:'existing',affectedAssetOrFunction:'Zone 7 disabled',owner:'Site owner'},100);
 v=addImpairment(v,{id:'introduced',existingOrIntroduced:'introduced',affectedAssetOrFunction:'Loop 1 on test',start:101,owner:'Engineer'},101);
 const next=updateImpairment(v,'introduced',{changeId:'restore-1',restoredAt:200,verificationEventIds:['check-1'],monitoringReceipt:'Acknowledged'},200);
 assert.equal(v.impairments[1].restoredAt,null);assert.equal(next.impairments[0].restoredAt,null);assert.equal(next.impairments[1].restorationRecords[0].before.restoredAt,null);assert.equal(next.impairments[1].restorationRecords.length,1);
 assert.deepEqual(updateImpairment(next,'introduced',{changeId:'restore-1',restoredAt:200,verificationEventIds:['check-1'],monitoringReceipt:'Acknowledged'},999),next);assert.throws(()=>updateImpairment(next,'existing',{existingOrIntroduced:'introduced'}),/classification/);
});

test('return visits reference prior evidence but start new questions, fresh test events and unknown symptom state',()=>{
 let v=addTestEvent(fresh(),reading(),200);v=addImpairment(v,{id:'unrestored',existingOrIntroduced:'introduced',affectedAssetOrFunction:'Door 2',owner:'Site contact'},201);v.handover.nextAction='Arrange access';
 const prior={id:'visit-1',started:100,panel:{brand:'Test',model:'Test'},site:'Site',message:'Door does not release',answers:{grant:'yes'},fieldVisit:v};const next=createReturnVisit(prior,'return-2',500);
 assert.equal(next.parentVisitId,'visit-1');assert.deepEqual(next.answers,{});assert.equal(next.fieldVisit.events.length,0);assert.equal(next.fieldVisit.incidents[0].currentSymptomState,'unknown');assert.deepEqual(next.fieldVisit.incidents[0].eventRefs,[]);assert.equal(next.fieldVisit.impairments[0].existingOrIntroduced,'existing');assert.equal(next.fieldVisit.impairments[0].parentImpairmentId,'unrestored');assert.equal(next.fieldVisit.priorVisitReference.handover.nextAction,'Arrange access');
 assert.equal(prior.fieldVisit.events.length,1);assert.throws(()=>createReturnVisit(prior,'visit-1',600),/new ID/);
});

test('redacted export omits identifiers, secret text and attachments but retains evidence and follow-up',()=>{
 let v=fresh();v.siteRef='Identifiable Site';v.engineerRef='Named Engineer';v.handover.nextAction='Arrange safe access';v.handover.owner='Keyholder';
 v=addTestEvent(v,{...reading(),points:[{location:'Rear private store',terminal:'+'}],notes:'Seen by Named Engineer at Identifiable Site, IP 10.20.30.40',attachments:[{name:'face.jpg',mimeType:'image/jpeg',dataUrl:'data:image/jpeg;base64,PRIVATEPHOTO',available:true}]},200);
 v.legacySnapshot={notes:'password=older-secret; original retained',password:'old-structured-secret'};
 const session={id:'visit-1',fieldVisit:v},output=exportFieldVisit(session,{format:'json'});
 for(const secret of ['Identifiable Site','Named Engineer','Rear private store','10.20.30.40','PRIVATEPHOTO','older-secret','old-structured-secret'])assert.ok(!output.includes(secret),secret);
 assert.ok(output.includes('Arrange safe access'));assert.ok(output.includes('performed'));assert.ok(output.includes('0.00'));assert.ok(output.includes('redacted'));assert.equal(v.events[0].attachments[0].dataUrl,'data:image/jpeg;base64,PRIVATEPHOTO');
 const full=exportFieldVisit(session,{format:'json',redact:false});assert.ok(full.includes('Identifiable Site'));assert.ok(!full.includes('older-secret'));assert.ok(!full.includes('old-structured-secret'));
});

test('narrative and short exports include recorded test state, unknown restoration and open actions',()=>{
 const v=addTestEvent(fresh(),{...reading(),result:{rawText:'not tested',unit:'Ω',source:'engineer_observation',executionState:'inaccessible'},blockedReason:'Remote end locked'},200);v.handover.nextAction='Return with access';
 for(const format of ['text','short']){const report=exportFieldVisit({id:'visit-1',fieldVisit:v},{format,redact:false});assert.match(report,/not tested/);assert.match(report,/inaccessible/);assert.match(report,/Remote end locked/);assert.match(report,/Return with access/);assert.match(report,/Restoration: unverified/);assert.match(report,/Test time: Not recorded/);}
});

test('visit search returns original saved sessions using site, point, rule, state and outstanding action',()=>{
 let v=fresh();v.siteRef='Training House';v=addTestEvent(v,{...reading(),ruleId:'F03.Q1'},200);v.handover.nextAction='Return with access';const a={id:'visit-1',fieldVisit:v},b={id:'other',notes:'Different record'};
 assert.equal(searchVisits([a,b],'training F03')[0],a);assert.deepEqual(searchVisits([a,b],'First device'),[a]);assert.deepEqual(searchVisits([a,b],'access'),[a]);assert.deepEqual(searchVisits([a,b],'missing camera'),[]);assert.equal(searchVisits([a,b],'')[1],b);
});


test('credential state and token presentation remain access evidence while actual values are removed',()=>{
 const input={...reading(),testKind:'access_event',tokenPresented:true,tokenStatus:'denied',credentialStatus:'expired',credentialType:'proximity',accessGranted:false,tokenId:'private-id',rawToken:'private-token',credentialValue:'private-value'};
 const next=addTestEvent(fresh(),input,200),event=next.events[0];assert.equal(event.tokenPresented,true);assert.equal(event.tokenStatus,'denied');assert.equal(event.credentialStatus,'expired');assert.equal(event.accessGranted,false);assert.equal(event.credentialType,'proximity');
 for(const format of ['text','json']){const exported=exportFieldVisit({id:'visit-1',fieldVisit:next},{format,redact:true});for(const secret of ['private-id','private-token','private-value'])assert.ok(!exported.includes(secret));}
 const narrative=exportFieldVisit({id:'visit-1',fieldVisit:next},{format:'text'});assert.match(narrative,/tokenPresented: true/);assert.match(narrative,/credentialStatus: expired/);
 const exported=JSON.parse(exportFieldVisit({id:'visit-1',fieldVisit:next},{format:'json'}));assert.equal(exported.visit.events[0].tokenPresented,true);assert.equal(exported.visit.events[0].credentialStatus,'expired');
});


test('edited retry identities are rejected rather than silently dropping incident or impairment edits',()=>{
 const v=fresh();assert.throws(()=>createIncident(v,{id:'incident-1',exactComplaint:'Changed complaint'}),/different details/);
 const item={id:'imp-1',existingOrIntroduced:'introduced',affectedAssetOrFunction:'Door 2',owner:'Engineer'};const impaired=addImpairment(v,item,100);assert.deepEqual(addImpairment(impaired,item,200),impaired);assert.throws(()=>addImpairment(impaired,{...item,owner:'Another owner'}),/different details/);
 const updated=updateImpairment(impaired,'imp-1',{changeId:'change-1',measures:'Agreed temporary cover'},200);assert.throws(()=>updateImpairment(updated,'imp-1',{changeId:'change-1',measures:'Changed cover'},300),/different details/);
});


test('storage sanitisation removes newly autosaved draft credentials without rewriting legacy originals',()=>{
 const v=ensureFieldVisit({id:'legacy-secret',notes:'password=historic-original; old observation'},1);v.ui={testDraft:{notes:'password=new-secret; new observation',tokenPresented:true,credentialStatus:'denied',tokenId:'new-token'}};v.incidents[0].context={credentialStatus:'expired',password:'new-context-secret'};
 const safe=sanitizeFieldVisitForStorage(v);assert.equal(safe.legacySnapshot.notes,'password=historic-original; old observation');assert.equal(safe.events[0].result.rawText,'password=historic-original; old observation');
 assert.ok(!JSON.stringify(safe.ui).includes('new-secret'));assert.ok(!JSON.stringify(safe).includes('new-context-secret'));assert.ok(!JSON.stringify(safe.ui).includes('new-token'));assert.equal(safe.ui.testDraft.tokenPresented,true);assert.equal(safe.ui.testDraft.credentialStatus,'denied');assert.ok(v.ui.testDraft.notes.includes('new-secret'));
 assert.ok(!exportFieldVisit({id:v.id,fieldVisit:safe},{format:'json',redact:false}).includes('historic-original'));
});


test('serialized legacy metadata cannot bypass credential redaction while status remains evidence',()=>{
 const session={id:'review',message:'Cannot unlock',investigation:{checks:{door:{credentialId:'secret-card-123',tokenId:'secret-token-456',password:'secret-password-789',rawToken:'secret-raw-012',apiKey:'secret-api-345',credentialStatus:'expired',tokenPresented:true}}}};
 const visit=ensureFieldVisit(session,1);assert.ok(JSON.stringify(visit).includes('secret-card-123'),'Originals remain local');
 for(const format of ['text','short','json'])for(const redact of [true,false]){
  const exported=exportFieldVisit({...session,fieldVisit:visit},{format,redact});for(const secret of ['secret-card-123','secret-token-456','secret-password-789','secret-raw-012','secret-api-345'])assert.ok(!exported.includes(secret),`${format}/${redact} leaked ${secret}`);assert.ok(exported.includes('expired'));
 }
});


test('nested credential text, IPv6 and identifying attachment filenames are redacted without consuming harmless evidence',()=>{
 const session={id:'nested',message:'Cannot unlock',investigation:{checks:{door:{details:{credentialId:'nested-card-private',tokenId:'nested-token-private'},notes:'password=nested-password-private',credentialStatus:'expired'}}}};
 let v=ensureFieldVisit(session,1);v=addTestEvent(v,{id:'new-event',incidentId:v.incidents[0].id,testKind:'observation',result:{rawText:'Reported status: password=new-password-private',source:'visual'},notes:'Network 2001:db8:acad::123, observed 09:12:34',attachments:[{name:'Jane Face_PrivateGate.jpg',mimeType:'image/jpeg',dataUrl:'data:image/jpeg;base64,PRIVATEPHOTO',available:true}]},2);
 assert.ok(!JSON.stringify(v.events.find(e=>e.id==='new-event')).includes('new-password-private'));
 for(const format of ['text','short','json']){const output=exportFieldVisit({...session,fieldVisit:v},{format});for(const secret of ['nested-card-private','nested-token-private','nested-password-private','new-password-private','2001:db8:acad::123','Jane Face_PrivateGate.jpg','PRIVATEPHOTO'])assert.ok(!output.includes(secret),`${format} leaked ${secret}`);assert.ok(output.includes('expired'));assert.ok(output.includes('09:12:34'));}
});


test('reports omit unfinished UI drafts and attachment filenames while preserving the local workspace',()=>{
 const visit=ensureFieldVisit({id:'draft-privacy',notes:'Recorded legacy evidence'},1);
 visit.ui={view:'log',draftTest:{rawText:'unfinished value'},testAttachments:[{name:'Private patient name.jpg',dataUrl:'data:image/jpeg;base64,UNSAVED'}],startAttachments:[{name:'Private address.png'}]};
 const session={id:visit.id,fieldVisit:visit};
 for(const redact of [true,false])for(const format of ['json','text','short']){
  const report=exportFieldVisit(session,{format,redact});
  for(const draft of ['Private patient name','Private address','unfinished value','UNSAVED'])assert.ok(!report.includes(draft));
  if(format==='json')assert.equal(JSON.parse(report).visit.ui,undefined);
  assert.ok(report.includes('Recorded legacy evidence'));
 }
 assert.equal(visit.ui.testAttachments[0].name,'Private patient name.jpg');
 assert.equal(visit.ui.draftTest.rawText,'unfinished value');
});
