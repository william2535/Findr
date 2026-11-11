import test from 'node:test';
import assert from 'node:assert/strict';
import {answerHelper,createHelperConversation,retrieveHelperEvidence} from '../public/app/helpers-engine.mjs';
import {buildManualIndex} from '../public/app/manual-retrieval.mjs';

// SYNTHETIC evidence and inference: contract tests, not a model benchmark or
// real equipment instructions. Browser/real-model results are recorded separately.
const hash='c'.repeat(64),question='I need to swap a device, how do I disable outputs, disable the old one, swap it, then re enable device.';
const analysis={manualId:'synthetic-guide',contentHash:hash,title:'SYNTHETIC Unit panel user guide',usable:true,identity:{manufacturer:'Unit',model:'Unit panel',models:['Unit panel'],revision:'TEST'},pages:[
 {page:1,text:'SYNTHETIC software test. Unit panel user guide. Revision TEST.',quality:{readable:true}},
 {page:2,text:'SYNTHETIC software test. Disable outputs: sounders and fire routing are separate options. Disabled outputs will not operate for an alarm. Authorised access is required.',quality:{readable:true}},
 {page:3,text:'SYNTHETIC software test. Disable an input device: select the detector address in the input menu. Enable an input device through the input menu.',quality:{readable:true}},
 {page:4,text:'SYNTHETIC software test. View history: choose VIEW then EVENT HISTORY. The user guide describes recorded events.',quality:{readable:true}}
]};
const helper={id:'unit-pal',scope:{kind:'panel',brand:'Unit',model:'Unit panel'},selectedManualIds:[analysis.manualId],manualStates:{[analysis.manualId]:{status:'ready',contentHash:hash}}};
const tasks=[{action:'disable',target:'outputs'},{action:'disable',target:'old device'},{action:'replace',target:'device'},{action:'enable',target:'device'}];
const result=(tasks,intent='procedure',focusTask=null)=>({text:JSON.stringify({intent,tasks,focusTask,observations:[]}),modelId:'SYNTHETIC-inference',modelRevision:'TEST',backend:'test',metrics:{inputTokens:100,outputTokens:100}});
const base=()=>({helper,conversation:createHelperConversation({id:'unit-job',now:10}),indexes:[buildManualIndex(analysis)],analyses:[analysis],modelReadiness:{supported:true,installed:true,ready:true,model:{dialogueVersion:1}},now:11});

test('normal answer engine retains four requested tasks and asks one focused question',async()=>{
 let calls=0,request;const turn=await answerHelper({...base(),text:question,infer:async input=>{calls++;request=input;return result(tasks);}});
 assert.equal(calls,1);assert.equal(request.choices,undefined,'interpretation is real free generation, not a source-label menu');
 assert.equal(turn.modelUsed,true);assert.equal(turn.message.model.role,'request_interpretation');assert.equal(turn.message.tasks.length,4);
 assert.deepEqual(turn.conversation.context.dialogue.tasks.map(t=>t.action),['disable','disable','replace','enable']);
 assert.match(turn.message.text,/Which outputs do you mean/);assert.equal(turn.conversation.context.pendingQuestion.field,'task_detail');
 assert.ok(turn.message.tasks.every(t=>t.performed===false));assert.equal(turn.conversation.messages.length,2);
 assert.ok(turn.message.sourceRefs.every(ref=>ref.manualId===analysis.manualId&&ref.contentHash===hash));
});

test('step-two follow-up and correction retain history without repeating the whole answer',async()=>{
 const first=await answerHelper({...base(),text:question,infer:async()=>result(tasks)});
 const second=await answerHelper({...base(),conversation:first.conversation,text:'What about step two?',infer:async()=>result([],'followup',2)});
 assert.match(second.message.text,/part 2/);assert.doesNotMatch(second.message.text,/replacement procedure/);assert.equal(second.message.tasks.length,4);
 const revised=tasks.map((task,index)=>index===0?{...task,target:'sounders'}:task);
 const third=await answerHelper({...base(),conversation:second.conversation,text:'I meant sounders, not all outputs',infer:async()=>result(revised,'correction')});
 assert.equal(third.conversation.context.dialogue.tasks[0].target,'sounders');assert.equal(first.conversation.context.dialogue.tasks[0].target,'outputs');
 assert.equal(third.conversation.context.dialogue.history.at(-1).reason,'correction');assert.equal(third.conversation.messages.length,6);
 assert.equal(third.conversation.context.confirmedModel,'Unit panel');
});

test('unambiguous short task clarification uses the pending question without another inference',async()=>{
 const first=await answerHelper({...base(),text:question,infer:async()=>result(tasks)});let request;
 const revised=tasks.map((task,index)=>index===0?{...task,target:'sounders'}:task);
 const second=await answerHelper({...base(),conversation:first.conversation,text:'Sounders',infer:async input=>{request=input;return result(revised,'clarification');}});
 assert.equal(request,undefined);assert.equal(second.message.interpretationResolution,'context');assert.equal(second.modelUsed,false);assert.equal(second.conversation.context.dialogue.tasks[0].target.toLowerCase(),'sounders');
});

test('missing model still separates explicit tasks and labels the limited manual-search fallback',async()=>{
 const turn=await answerHelper({...base(),modelReadiness:{installed:false},text:question,infer:async()=>{throw Error('must not run');}});
 assert.equal(turn.modelUsed,false);assert.equal(turn.mode,'manual-search');assert.equal(turn.message.tasks.length,4);assert.equal(turn.message.limitedInterpretation,true);
 assert.match(turn.message.text,/no local AI was used/);assert.doesNotMatch(turn.message.text,/undefined|SYNTHETIC-inference/);
});

test('installed legacy source selector is not misrepresented as a multi-task interpreter',async()=>{
 const turn=await answerHelper({...base(),modelReadiness:{installed:true,ready:true,model:{id:'legacy-source-selector'}},text:question,infer:async()=>{throw Error('unqualified model must not run for task interpretation');}});
 assert.equal(turn.modelUsed,false);assert.equal(turn.mode,'manual-search');assert.equal(turn.message.tasks.length,4);assert.match(turn.message.text,/no local AI was used/);
});

test('unrelated new conversation cannot inherit a previous plan or another helper document',async()=>{
 const foreign={...analysis,manualId:'another-pal',contentHash:'d'.repeat(64),pages:[{page:1,text:'SYNTHETIC secret sounders output procedure ONLY ANOTHER PAL.',quality:{readable:true}}]};
 const turn=await answerHelper({...base(),indexes:[buildManualIndex(analysis),buildManualIndex(foreign)],analyses:[analysis,foreign],text:question,infer:async()=>result(tasks)});
 assert.doesNotMatch(JSON.stringify(turn.message),/ONLY ANOTHER PAL|another-pal/);
 const unrelated=await answerHelper({...base(),text:'How do I view history?',infer:async()=>result([{action:'view',target:'history'}])});
 assert.equal(unrelated.conversation.context.dialogue.tasks.length,1);assert.match(unrelated.message.text,/EVENT HISTORY/);assert.doesNotMatch(unrelated.message.text,/swap|replacement/);
});

test('complementary user and installation documents are not mistaken for conflicting editions',async()=>{
 const installation={...analysis,manualId:'synthetic-installation',contentHash:'e'.repeat(64),title:'SYNTHETIC Unit panel installation guide',identity:{...analysis.identity,revision:'TEST B'},pages:[{page:2,text:'SYNTHETIC software test. View event history: the installation guide describes VIEW and EVENT HISTORY.',quality:{readable:true}}]};
 const h={...helper,selectedManualIds:[analysis.manualId,installation.manualId],manualStates:{...helper.manualStates,[installation.manualId]:{status:'ready',contentHash:installation.contentHash}}};
 const turn=await answerHelper({...base(),helper:h,indexes:[buildManualIndex(analysis),buildManualIndex(installation)],analyses:[analysis,installation],modelReadiness:{installed:true,ready:true},text:'How do I view event history?',infer:async()=>({text:'S1'})});
 assert.notEqual(turn.message.kind,'source_conflict');assert.match(turn.message.text,/EVENT HISTORY/);
});

test('re enable and re-enable retrieve the same saved input reference as enable',()=>{
 const options=base(),find=question=>retrieveHelperEvidence({...options,question}).map(p=>p.id);
 assert.ok(find('enable device').length);
 assert.deepEqual(find('re enable device'),find('enable device'));
 assert.deepEqual(find('re-enable device'),find('enable device'));
});

test('a new component follow-up cannot replay the panel plan as PSU instructions',async()=>{
 const first=await answerHelper({...base(),text:question,infer:async()=>result(tasks)});
 const next=await answerHelper({...base(),conversation:first.conversation,text:'What about the external PSU?',infer:async()=>{throw Error('explicit component ambiguity needs no inference');}});
 assert.equal(next.message.kind,'clarification');assert.equal(next.conversation.context.pendingQuestion.field,'component_question');
 assert.match(next.message.text,/external PSU/);assert.equal(next.message.sourceRefs.length,0);assert.equal(next.conversation.context.dialogue.tasks.length,4);
 assert.doesNotMatch(next.message.text,/DISABLE|documented steps|its manual is saved/i);
});

test('component-question follow-up holds the original plan and asks for the component model',async()=>{
 const first=await answerHelper({...base(),manualOnly:true,text:question,infer:null});
 const second=await answerHelper({...base(),conversation:first.conversation,manualOnly:true,text:'What about the external PSU?',infer:null});
 const third=await answerHelper({...base(),conversation:second.conversation,manualOnly:true,text:'Its output voltage',infer:null});
 assert.equal(third.message.kind,'clarification');assert.equal(third.conversation.context.pendingQuestion.field,'component_question');assert.equal(third.conversation.context.pendingQuestion.component,'external PSU');assert.match(third.message.text,/Which exact model/);assert.equal(third.conversation.context.dialogue.tasks.length,4);assert.equal(third.conversation.context.dialogue.history.length,0);assert.equal(third.conversation.context.dialogue.componentContext.confirmed,false);assert.equal(third.message.sourceRefs.length,0);assert.equal(third.conversation.context.confirmedModel,'Unit panel');
});

test('task-observation continuation saves reading details without rewriting or discarding task targets',async()=>{
 const first=await answerHelper({...base(),manualOnly:true,text:question,infer:null});
 const second=await answerHelper({...base(),conversation:first.conversation,manualOnly:true,text:'24.1 V at the PSU',infer:null});
 assert.equal(second.conversation.context.pendingQuestion.field,'task_observation');
 const third=await answerHelper({...base(),conversation:second.conversation,manualOnly:true,text:'Between PSU + and minus, load connected',infer:null});
 assert.equal(third.message.kind,'clarification');assert.equal(third.conversation.context.dialogue.tasks.length,4);assert.equal(third.conversation.context.dialogue.history.length,0);assert.deepEqual(third.conversation.context.dialogue.tasks.map(task=>task.target),first.conversation.context.dialogue.tasks.map(task=>task.target));assert.deepEqual(third.conversation.context.dialogue.observations.map(item=>item.raw),['24.1 V at the PSU','Between PSU + and minus, load connected']);assert.ok(third.conversation.context.dialogue.observations.every(item=>item.assessed===false));assert.doesNotMatch(third.message.text,/Which exact terminals|Was the load connected/);
});

test('an explicit new request after an observation still archives the previous plan',async()=>{
 const first=await answerHelper({...base(),manualOnly:true,text:question,infer:null});
 const second=await answerHelper({...base(),conversation:first.conversation,manualOnly:true,text:'done',infer:null});
 const third=await answerHelper({...base(),conversation:second.conversation,manualOnly:true,text:'View event history',infer:null});assert.equal(third.conversation.context.dialogue.tasks.length,1);assert.equal(third.conversation.context.dialogue.tasks[0].action,'view');assert.equal(third.conversation.context.dialogue.history.length,1);assert.equal(third.conversation.context.dialogue.history[0].tasks.length,4);
});
