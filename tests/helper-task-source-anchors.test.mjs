import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normaliseManualQuote} from '../public/app/manual-answers.mjs';
import {answerHelper,createHelperConversation} from '../public/app/helpers-engine.mjs';
import {buildManualIndex} from '../public/app/manual-retrieval.mjs';

const pack=JSON.parse(fs.readFileSync(new URL('../public/app/data/helper-task-procedures.json',import.meta.url)));
const captured=JSON.parse(fs.readFileSync(new URL('./fixtures/panel-pals034/mxpro5-disable-menu-browser-text.json',import.meta.url)));

test('MxPro menu anchors survive actual PDF.js USER - ID text without weakening verification',()=>{
 const body=normaliseManualQuote(captured.excerpt);
 assert.match(body,/USER - ID/);
 assert.equal(body.includes(normaliseManualQuote('ZONE/INPUTS OUTPUTS GROUPS CONTROLS USER-ID')),false,'Original failing anchor must remain a mismatch');
 const checked=[];
 for(const recipe of pack.procedures){
  for(const claim of [...recipe.prerequisites,...recipe.steps,...recipe.effects]){
   for(const ref of claim.refs){
    if(ref.page===captured.pdfPage&&ref.section===captured.section){
     assert.equal(recipe.manual.sha256,captured.sha256);
     assert.equal(body.includes(normaliseManualQuote(ref.quote)),true,`${recipe.id}: ${ref.quote}`);
     checked.push(recipe.id);
    }
   }
  }
 }
 assert.deepEqual(checked.sort(),['mxpro5-disable-individual-input-680-166-rev04','mxpro5-disable-sounders-680-166-rev04']);
});

test('MxPro5 reported typo and detector clarification release only the source-pinned individual-input procedure',async()=>{
 // A bounded test document assembled from the already-reviewed source quotes,
 // not a claim that this test imports/processes the original PDF or runs AI.
 const recipe=pack.procedures.find(item=>item.id==='mxpro5-disable-individual-input-680-166-rev04');
 const refs=[...recipe.anchors,...recipe.scope.refs,...[...recipe.prerequisites,...recipe.steps,...recipe.effects].flatMap(claim=>claim.refs)],pages=new Map();
 for(const ref of refs){if(!pages.has(ref.page))pages.set(ref.page,new Set());pages.get(ref.page).add(ref.quote);}
 const analysis={manualId:recipe.manual.recordId,contentHash:recipe.manual.sha256,title:recipe.manual.title,usable:true,identity:{manufacturer:'Advanced',model:'MxPro5',models:['MxPro5'],revision:recipe.manual.revision},pages:[...pages].map(([page,quotes])=>({page,text:[...quotes].join('\n'),quality:{readable:true},method:'text'}))};
 const helper={id:'mxpro5-test-pal',scope:{kind:'panel',brand:'Advanced',model:'MxPro 5'},selectedManualIds:[analysis.manualId],manualStates:{[analysis.manualId]:{status:'ready',contentHash:analysis.contentHash}}};
 const options={helper,indexes:[buildManualIndex(analysis)],analyses:[analysis],taskProcedures:pack,modelReadiness:{installed:true,ready:true,model:{id:'legacy-source-selector'}},infer:async()=>{throw Error('No model should be needed for explicit device scope and reviewed steps.');}};
 const first=await answerHelper({...options,conversation:createHelperConversation(),text:'How to disable a devicw'});
 assert.equal(first.message.tasks[0].reason,'device_role_required');assert.equal(first.conversation.messages[0].text,'How to disable a devicw');
 const second=await answerHelper({...options,conversation:first.conversation,text:'detector'});
 assert.equal(second.message.tasks[0].status,'documented');assert.equal(second.message.tasks[0].procedureId,recipe.id);
 assert.ok(second.message.tasks[0].steps.length>0);assert.ok(second.message.sourceRefs.some(ref=>ref.page===captured.pdfPage));
 assert.ok(second.message.sourceRefs.every(ref=>ref.contentHash===recipe.manual.sha256));assert.equal(second.message.modelUsed,false);
 assert.equal(second.conversation.context.dialogue.history.at(-1).tasks[0].target,'a device');assert.ok(second.conversation.context.dialogue.tasks.every(task=>task.performed===false));
});
