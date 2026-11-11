import test from 'node:test';
import assert from 'node:assert/strict';
import {panelPalCallRecord,panelPalCallText,pausePanelPalFault} from '../public/app/panel-pal-call.mjs';
import {createInvestigation,addQuickMeasurement,addInvestigationAction} from '../public/app/investigation-engine.mjs';
const helper={id:'pal',name:'Sparky',selectedManualIds:['manual-a'],documents:[{id:'manual-a',record:{title:'Synthetic panel manual',revision:'QA-1'}}],scope:{label:'Synthetic P1'}};
const base=()=>({id:'fault',conversationId:'job',started:10,site:'Synthetic site',message:'Loop open',group:'loop',confirmed:false,panel:{brand:'Synthetic',model:'P1'},answers:{},questionHistory:[],guideHistory:[],investigation:createInvestigation('loop',10)});

test('call notes sort actual evidence by time and preserve zero, OL, units, conditions and corrections',()=>{
 const s=base();s.questionHistory=[{id:'answer-1',questionId:'q1',question:'All devices present?',answer:'yes',answerLabel:'Yes',recordedAt:20},{id:'undo-1',kind:'undo',questionId:'q1',question:'All devices present?',answer:'yes',answerLabel:'Yes',recordedAt:40}];
 s.investigation=addQuickMeasurement(s.investigation,{value:'0.00',unit:'V DC',location:'PSU output',reference:'+ / −',condition:'Load connected',instrument:'Meter A'},30);
 const original=s.investigation.measurements[0].id;
 s.investigation=addQuickMeasurement(s.investigation,{value:'024.10',unit:'V DC',location:'PSU output',reference:'+ / −',condition:'Load connected',supersedes:original},50);
 s.investigation=addQuickMeasurement(s.investigation,{value:'OL',unit:'Ω',location:'Isolated span',condition:'Verified isolated; disconnected electronics',source:'Synthetic section 4'},70);
 s.investigation=addInvestigationAction(s.investigation,{action:'Recorded label',reason:'Establish installed variant',outcome:'P1 confirmed'},60);
 const before=structuredClone(s),record=panelPalCallRecord(helper,s),out=panelPalCallText(record);
 assert.deepEqual(record.timeline.map(e=>e.at),[20,30,40,50,60,70]);assert.equal(record.timeline[1].result,'0.00 V DC');assert.equal(record.timeline[1].superseded,true);assert.equal(record.timeline[3].supersedes,original);
 assert.equal(record.timeline[5].result,'OL Ω');assert.match(out,/Load connected/);assert.match(out,/Meter A/);assert.match(out,/Establish installed variant/);assert.match(out,/Answer correction/);assert.match(out,/original retained/);assert.equal(record.causeConfirmed,false);assert.deepEqual(s,before);
});

test('unperformed checks remain distinct and guide context never becomes an engineer-recorded reason',()=>{
 const s=base();s.investigation.checks['loop:identity']={status:'not_tested',notes:'No access',updatedAt:25};
 s.investigation=addQuickMeasurement(s.investigation,{value:'24',unit:'V DC',location:'Panel',checkId:'loop:identity'},30);
 const record=panelPalCallRecord(helper,s,{groups:[{id:'loop',questions:[],causes:[]}]});
 assert.equal(record.timeline[0].kind,'Check not completed');assert.equal(record.timeline[0].result,'not tested');assert.equal(record.timeline[0].whyLabel,'Current guide context — reason not recorded');assert.equal(record.timeline[1].whyLabel,'Current guide context — reason not recorded');
 assert.equal(record.restoration,'unknown');assert.equal(record.functionalTest,'not_done');
});

test('legacy archived observations are retained once and undated entries are not assigned invented times',()=>{
 const s=base();s.questionHistory=[{id:'q',kind:'answer',groupId:'old',runId:'run',questionId:'one',question:'Earlier one?',answer:'no',recordedAt:20}];
 s.guideHistory=[{groupId:'old',runId:'run',title:'Earlier guide',observations:[{questionId:'one',question:'Earlier one?',answer:'no',recordedAt:20},{questionId:'two',question:'Earlier two?',answer:'unknown'}]}];
 const record=panelPalCallRecord(helper,s);assert.equal(record.timeline.length,2);assert.equal(record.timeline[1].title,'Earlier two?');assert.equal(record.timeline[1].at,null);assert.equal(record.timeline[1].result,'unknown');
});

test('Give up preserves evidence and restoration separately, with unsubmitted drafts kept outside results',()=>{
 const s=base();s.investigation.handover={...s.investigation.handover,status:'in_progress',restored:'no',functionalTest:'failed',outstanding:'Output still isolated',summary:'Cause not confirmed'};
 const before=structuredClone(s),paused=pausePanelPalFault(s,{now:100,drafts:{quick:{value:'12',unit:'V DC',location:'Unspecified'}}});
 assert.equal(paused.unresolved,true);assert.equal(paused.investigation.handover.status,'unresolved');assert.equal(paused.investigation.handover.restored,'no');assert.equal(paused.investigation.handover.functionalTest,'failed');assert.deepEqual(s,before);
 const report=panelPalCallRecord(helper,paused);assert.equal(report.timeline.length,0);assert.equal(report.unsavedDrafts.length,1);assert.match(panelPalCallText(report),/UNSUBMITTED DRAFTS — NOT RECORDED RESULTS/);assert.match(panelPalCallText(report),/Output still isolated/);
 const again=pausePanelPalFault(paused,{now:200});assert.equal(again.supportHandover.history[0].stoppedAt,100);
});

test('call record only names the pal selected manuals, using actual saved metadata when available',()=>{
 const h={...helper,documents:[],manualStates:{'manual-a':{storedManualId:'actual-a'}}};
 const r=panelPalCallRecord(h,base(),{},{records:[{id:'actual-a',title:'Actual saved title',revision:'2'},{id:'unrelated',title:'Other pal manual'}]});
 assert.deepEqual(r.manuals.map(m=>m.title),['Actual saved title']);assert.equal(r.manuals[0].revision,'2');
});

test('legacy numeric drafts remain unsubmitted evidence rather than breaking call preparation',()=>{
 const s=base();s.supportHandover={drafts:{quick:{value:0,unit:'V DC'},work:{action:24},empty:{value:null}}};
 const record=panelPalCallRecord(helper,s);
 assert.equal(record.timeline.length,0);assert.equal(record.unsavedDrafts.length,2);
 assert.match(panelPalCallText(record),/UNSUBMITTED DRAFTS/);
 assert.match(panelPalCallText(record),/"value":0/);
});
