import test from 'node:test';
import assert from 'node:assert/strict';
import {createInvestigation,normalizeInvestigation,addMeasurement,addQuickMeasurement,addInvestigationAction,getNextCheck,investigationReport,investigationLogReport,recommendLoopCheck} from '../public/app/investigation-engine.mjs';
const reading = extra => ({kind:'DC voltage',value:'0.00',unit:'V DC',location:'Confirmed physical first device',reference:'Approved + to reference test points',condition:'Powered; recorded loading condition',expected:'See exact-model test reference',source:'Selected manual, approved test section',assessment:'not_assessed',engineer:'Test engineer',instrument:'Meter M01',notes:'Synthetic test reading',...extra});
const physical = extra => ({topologyConfirmed:true,procedureConfirmed:true,singlePathConfirmed:true,singlePathNotes:'The applicable procedure confirms this one controlled test path; unchanged test conditions.',source:'Exact-model procedure section entered by engineer',configuration:'Recorded single-path test configuration',points:['Panel side','Lobby','Stair','Landing','End device'],observations:[],...extra});
const observation = (pointIndex,assessment) => ({pointIndex,assessment,measurementId:`reading-${pointIndex}`,notes:'Synthetic classification, manually assessed'});

test('new and older investigation records remain unresolved and preserve existing evidence',()=>{
 const inv=createInvestigation('loop',100);assert.equal(inv.handover.status,'unresolved');assert.equal(inv.handover.restored,'unknown');assert.equal(inv.handover.functionalTest,'not_done');assert.deepEqual(inv.measurements,[]);
 const older={groupId:'old',setup:{engineer:'Previous engineer'},checks:{'old-check':{status:'issue_found',notes:'Retain this'}},measurements:[{id:'prior',value:'0.00'}],actions:[{id:'action-old',action:'Recorded action'}],customField:'unchanged'};
 const normalized=normalizeInvestigation(older,'loop');assert.equal(normalized.groupId,'old');assert.deepEqual(normalized.measurements,older.measurements);assert.equal(normalized.customField,'unchanged');assert.equal(normalized.handover.status,'unresolved');normalized.measurements[0].value='edited';assert.equal(older.measurements[0].value,'0.00');
 const malformed=normalizeInvestigation({measurements:{legacy:'retained'}},'loop');assert.deepEqual(malformed.legacyEvidence.measurements,{legacy:'retained'});
 const partial=investigationReport({...inv,checks:{earlier:'Original note'},measurements:[null,'Original reading'],actions:[false,'Original action'],loop:{...inv.loop,earlierReference:'Original path reference'}},{checks:null});
 for(const retained of ['Original note','Original reading','Original action','Original path reference'])assert.ok(partial.includes(retained));
});
test('measurements retain exact zero/overrange strings and never perform checks or classify a path',()=>{
 const before=createInvestigation('loop',100);const after=addMeasurement(before,reading(),200);assert.equal(after.measurements[0].value,'0.00');assert.equal(after.measurements[0].instrument,'Meter M01');assert.deepEqual(after.checks,{});assert.deepEqual(after.loop.observations,[]);assert.equal(before.measurements.length,0);
 for(const value of ['OL','>200','-0.04',' 0.00 '])assert.equal(addMeasurement(before,reading({value}),200).measurements[0].value,value);
 assert.throws(()=>addMeasurement(before,reading({value:''})),/value/);assert.throws(()=>addMeasurement(before,reading({value:' '})),/value/);assert.throws(()=>addMeasurement(before,reading({value:0})),/as text/);
});
test('electrical readings need reference/conditions and assessed results need a recorded expected source',()=>{
 const inv=createInvestigation('power');assert.throws(()=>addMeasurement(inv,reading({reference:''})),/reference/);assert.throws(()=>addMeasurement(inv,reading({condition:''})),/condition/);
 assert.throws(()=>addMeasurement(inv,reading({assessment:'within_reference',expected:''})),/expected/);assert.throws(()=>addMeasurement(inv,reading({assessment:'outside_reference',source:''})),/source/);
 const nonElectric=addMeasurement(inv,{kind:'Signal strength',value:'-71',unit:'dBm',location:'Remote detector',assessment:'not_assessed'});assert.equal(nonElectric.measurements[0].value,'-71');
});
test('corrections append traceable entries without replacing the original reading',()=>{
 const first=addMeasurement(createInvestigation('loop'),reading(),100);const id=first.measurements[0].id;
 const corrected=addMeasurement(first,reading({value:'12.80',supersedes:id,notes:'Corrected transcription'}),200);assert.equal(corrected.measurements.length,2);assert.equal(corrected.measurements[0].value,'0.00');assert.equal(corrected.measurements[1].supersedes,id);assert.equal(first.measurements.length,1);
 assert.throws(()=>addMeasurement(corrected,reading({supersedes:id})),/latest entry/);assert.throws(()=>addMeasurement(first,reading({supersedes:'missing'})),/no longer available/);
 const report=investigationReport(corrected);assert.match(report,/original retained/);assert.ok(report.includes('0.00'));assert.ok(report.includes('12.80'));
});
test('action log and full unresolved handover include every record including checks from earlier guides',()=>{
 let inv=addInvestigationAction(createInvestigation('loop',100),{engineer:'A',action:'Compared records',reason:'Establish scope',outcome:'Still unresolved'},200);
 inv.setup.manual='Model-specific manual';inv.checks={'earlier-group-check':{status:'issue_found',notes:'Earlier finding'},current:{status:'not_tested',notes:'No safe access'}};
 inv.handover={...inv.handover,outstanding:'Return for authorised tests',systemLeft:'Recorded impairment remains',nextSteps:'Contact responsible engineer',handoverTo:'Next engineer'};
 const report=investigationReport(inv,{checks:[{id:'current',title:'Current check'},{id:'new',title:'Untested check'}]});
 for(const value of ['unresolved','unknown','not done','Earlier finding','No safe access','Untested check','Compared records','Next engineer','Recorded impairment remains','No measurements recorded'])assert.ok(report.includes(value),value);
 assert.equal(investigationReport(null),'');assert.throws(()=>addInvestigationAction(inv,{action:' '}),/action/);
});
test('next check follows recorded progress without interpreting readings as answers',()=>{
 const plan={checks:[{id:'a'},{id:'b'},{id:'c'}]}, inv=createInvestigation('loop');inv.checks.a={status:'satisfactory'};inv.checks.b={status:'not_tested'};assert.equal(getNextCheck(inv,plan).id,'b');inv.checks.b.status='issue_found';assert.equal(getNextCheck(inv,plan).id,'c');inv.checks.c={status:'not_applicable'};assert.equal(getNextCheck(inv,plan),null);
});
test('loop guidance needs verified physical topology and procedure rather than imported addresses',()=>{
 assert.equal(recommendLoopCheck({points:['1','2','37']}).kind,'setup');assert.equal(recommendLoopCheck(physical({topologyConfirmed:false})).kind,'setup');assert.equal(recommendLoopCheck(physical({source:''})).kind,'setup');assert.equal(recommendLoopCheck(physical({points:['Same point','Same point']})).kind,'setup');
 assert.equal(recommendLoopCheck(physical()).index,0);assert.equal(recommendLoopCheck(physical({observations:[observation(0,'satisfactory')]})).index,4);
});
test('consistent observations progressively narrow the next investigation interval without asserting a break location',()=>{
 let loop=physical({observations:[observation(0,'satisfactory'),observation(4,'fault_present')]});let next=recommendLoopCheck(loop);assert.equal(next.kind,'midpoint');assert.equal(next.index,2);
 loop.observations.push(observation(2,'satisfactory'));next=recommendLoopCheck(loop);assert.equal(next.index,3);loop.observations.push(observation(3,'fault_present'));next=recommendLoopCheck(loop);assert.equal(next.kind,'interval');assert.equal(next.from,2);assert.equal(next.to,3);assert.match(next.message,/does not prove a cable break/);
 assert.equal(recommendLoopCheck(physical({observations:[observation(0,'fault_present'),observation(4,'satisfactory')]})).index,2);
});
test('dual-feed, missing justification and contradictory results never silently select a fault interval',()=>{
 const endpoints=[observation(0,'satisfactory'),observation(4,'fault_present')];
 assert.match(recommendLoopCheck(physical({singlePathConfirmed:false,observations:endpoints})).message,/both ends/);assert.equal(recommendLoopCheck(physical({singlePathNotes:'',observations:endpoints})).kind,'review');
 assert.equal(recommendLoopCheck(physical({observations:[observation(0,'satisfactory'),observation(4,'satisfactory')]})).kind,'review');
 assert.equal(recommendLoopCheck(physical({observations:[...endpoints,observation(1,'fault_present'),observation(2,'satisfactory')]})).kind,'review');
 assert.equal(recommendLoopCheck(physical({observations:[...endpoints,observation(0,'fault_present')]})).kind,'review');
 assert.equal(recommendLoopCheck(physical({observations:[{...observation(0,'satisfactory'),configuration:'Different loading'},observation(4,'fault_present')]})).kind,'review');
 assert.equal(recommendLoopCheck(physical({observations:[{pointIndex:0,assessment:'satisfactory'},observation(4,'fault_present')]})).kind,'review');
 assert.equal(recommendLoopCheck(physical({observations:[observation(0,'inconclusive'),observation(4,'fault_present')]})).kind,'endpoint');
});


test('quick readings need only the point, raw value and unit and preserve unknown context',()=>{
 const before=createInvestigation('loop',100);before.answers={existing:'unknown'};
 for(const value of ['0.00','OL','0012.80',' 0.00 ']){
  const after=addQuickMeasurement(before,{location:'Panel',value,unit:'V DC'},200),entry=after.measurements[0];
  assert.equal(entry.value,value);assert.equal(entry.kind,'Voltage');assert.equal(entry.entryMode,'quick');assert.equal(entry.recordedAt,200);
  assert.equal(entry.assessment,'not_assessed');assert.equal(entry.reference,'');assert.equal(entry.condition,'');assert.equal(entry.expected,'');
  assert.deepEqual(after.answers,before.answers);assert.deepEqual(after.checks,{});assert.deepEqual(after.loop.observations,[]);assert.equal(after.handover.status,'unresolved');
 }
 assert.equal(before.measurements.length,0);
 for(const missing of ['location','value','unit'])assert.throws(()=>addQuickMeasurement(before,{location:'Panel',value:'0.00',unit:'V DC',[missing]:''}),new RegExp(missing));
 assert.throws(()=>addQuickMeasurement(before,{location:'Panel',value:0,unit:'V DC'}),/as text/);
 assert.throws(()=>addQuickMeasurement(before,null),/measurement/);
});
test('quick readings retain optional detail but cannot automatically become assessed or bypass detailed-reading checks',()=>{
 const input=reading({location:'First device',assessment:'within_reference'}),inv=createInvestigation('loop');
 const entry=addQuickMeasurement(inv,input).measurements[0];
 for(const key of ['kind','value','unit','location','reference','condition','expected','source','engineer','instrument','notes'])assert.equal(entry[key],input[key]);
 assert.equal(entry.assessment,'not_assessed');
 assert.throws(()=>addMeasurement(inv,{location:'Panel',kind:'Voltage',value:'0.00',unit:'V DC',entryMode:'quick'}),/reference/);
 const report=investigationReport(addQuickMeasurement(inv,{location:'Last device',value:'0.00',unit:'V DC'}));
 for(const text of ['quick reading (not assessed)','reference: Not recorded','condition: Not recorded','assessment: not assessed','value: 0.00'])assert.ok(report.includes(text),text);
});
test('quick corrections retain the original and reject missing or already-corrected entries',()=>{
 const original=addQuickMeasurement(createInvestigation('loop'),{location:'Panel',value:'0.00',unit:'V DC'},100),id=original.measurements[0].id;
 const corrected=addQuickMeasurement(original,{location:'Panel',value:'12.80',unit:'V DC',supersedes:id},200);
 assert.deepEqual(corrected.measurements.map(m=>m.value),['0.00','12.80']);assert.equal(original.measurements.length,1);assert.equal(corrected.measurements[1].supersedes,id);
 assert.throws(()=>addQuickMeasurement(corrected,{location:'Panel',value:'13.00',unit:'V DC',supersedes:id}),/latest entry/);
 assert.throws(()=>addQuickMeasurement(original,{location:'Panel',value:'13.00',unit:'V DC',supersedes:'missing'}),/no longer available/);
 const report=investigationReport(corrected);for(const text of ['original retained','0.00','12.80'])assert.ok(report.includes(text));
});


test('compact fault log includes exact readings and correction links without blank worksheet scaffolding',()=>{
 let inv=addQuickMeasurement(createInvestigation('loop',100),{location:'Panel',value:'0.00',unit:'V DC'},200);
 const original=inv.measurements[0].id;
 inv=addQuickMeasurement(inv,{location:'Panel',value:'24.10',unit:'V DC',supersedes:original,notes:'Transcription corrected'},300);
 inv=addQuickMeasurement(inv,{location:'Last device',kind:'Resistance',value:'OL',unit:'Ω'},400);
 const report=investigationLogReport(inv);
 for(const expected of ['FAULT FINDING LOG','Status: Unresolved','Panel · Voltage — 0.00 V DC','Last device · Resistance — OL Ω','not assessed',original,'Corrects reading','Original retained','Transcription corrected','1970-01-01T00:00:00.200Z'])assert.ok(report.includes(expected),expected);
 for(const omitted of ['Not recorded','SETUP / SYSTEM STATE','CHECKS / FINDINGS','CASE DETAILS','HANDOVER','Reference:','Condition:','not started'])assert.ok(!report.includes(omitted),omitted);
 assert.equal(investigationLogReport(null),'');
});
test('compact log keeps optional detailed readings, earlier checks, work and populated handover fields',()=>{
 let inv=addMeasurement(createInvestigation('power'),reading({location:'Supply',value:'0012.80'}),200);
 inv=addInvestigationAction(inv,{action:'Compared earlier visits',reason:'Intermittent report',outcome:'No cause established',engineer:'Engineer B'},300);
 inv.checks={'old:check':{status:'not_tested',notes:'Access required'},'blank:check':{status:'not_started',notes:''}};
 inv.handover={...inv.handover,status:'in_progress',nextSteps:'Return with access',handoverTo:'Next engineer'};
 const report=investigationLogReport(inv);
 for(const expected of ['Status: Unresolved — in progress','0012.80 V DC','Meter M01','Selected manual, approved test section','Powered; recorded loading condition','old:check','Access required','Compared earlier visits','No cause established','Return with access','Next engineer'])assert.ok(report.includes(expected),expected);
 assert.ok(!report.includes('blank:check'));assert.ok(!report.includes('System left:'));assert.ok(!report.includes('Restored: unknown'));
 inv.handover.status='resolved';assert.match(investigationLogReport(inv),/Status: Resolved/);
});
test('compact log preserves recorded false and zero values including legacy evidence',()=>{
 const inv=createInvestigation('loop');inv.measurements=[{id:'legacy',location:'Panel',kind:'Status',value:false,unit:'state',recordedAt:0,notes:0,reference:false,assessment:'not_assessed'}];
 inv.checks={legacy:false};inv.actions=[{action:'Legacy result',recordedAt:0,outcome:false}];inv.handover.summary=0;
 const report=investigationLogReport(inv);
 for(const expected of ['Status — false state','1970-01-01T00:00:00.000Z','Notes: 0','Reference: false','legacy: false','Outcome: false','Summary: 0'])assert.ok(report.includes(expected),expected);
});
