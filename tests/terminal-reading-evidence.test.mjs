import test from 'node:test';
import assert from 'node:assert/strict';
import {compareTerminalReading,TERMINAL_READING_SOURCES,TERMINAL_READING_CONTEXT_QUESTIONS,getTerminalReadingContextQuestion} from '../public/app/terminal-reading-evidence.mjs';

const source=TERMINAL_READING_SOURCES[0];
const manual={manualId:'local-psu',usable:true,contentHash:source.sha256,pages:[{page:1,quality:{readable:true}},{page:2,quality:{readable:true}}]};
const equipment={manufacturer:'Elmdene',model:'2405ST-C',confirmedEquipment:true};
const reading={id:'measured-1',testKind:'voltage',result:{kind:'numeric',rawText:'24.1',unit:'V',value:24.1,source:'meter',executionState:'performed'},points:[{label:'PSU output'}],reference:'positive to negative',electricalMode:'DC',operatingState:'normal',loadState:'connected',circuitState:'energised_connected',interpretation:{status:'recorded_only'},rawEntry:'24.1 V at the PSU output with the load connected'};
const context={outputPair:'LOAD1',electricalMode:'DC',powerMode:'mains',loadCondition:'full_load',batteryConnectionTransient:'no'};
const run=(change={})=>compareTerminalReading({reading,manuals:[manual],equipment,context,...change});

test('reviewed source is pinned to real manufacturer bytes, revision, page and conditions',()=>{
 assert.match(source.sha256,/^[a-f0-9]{64}$/);assert.equal(source.pageCount,25);assert.equal(source.revision,'APR 2026');assert.ok(Object.isFrozen(source.ranges.mains));
 assert.equal(source.actionEnabled,false);assert.equal(source.causeConfirmationEnabled,false);
 const output=run();assert.equal(output.status,'compared');assert.equal(output.comparison.inside,true);assert.equal(output.comparison.min,21.6);assert.equal(output.comparison.max,28.8);
 assert.equal(output.sourceRefs[1].page,2);assert.equal(output.sourceRefs[1].contentHash,source.sha256);assert.equal(output.sourceRefs[1].manualId,'local-psu');
 assert.match(output.summary,/does not establish/);assert.equal(output.causeConfirmed,false);assert.equal(output.actionEnabled,false);
});

test('natural 24.1 V connected-load example asks scope instead of treating connected as full load',()=>{
 const output=run({context:{}});assert.equal(output.status,'needs_context');assert.deepEqual(output.missing.map(item=>item.key),['outputPair','powerMode','loadCondition']);
 assert.match(output.nextQuestion,/actual/);assert.equal(output.comparison,undefined);
 assert.equal(output.missing.find(item=>item.key==='loadCondition').options[0].value,'full_load');
 const next=run({context:{outputPair:'LOAD1',powerMode:'mains',loadCondition:'full_load'}});assert.equal(next.missing[0].key,'batteryConnectionTransient');
});

test('same value and exact source cannot bypass unknown identity, unreadable pages or missing method',()=>{
 for(const changed of [{model:'PSU'},{model:'2405ST-x'},{manufacturer:'Other'},{confirmedEquipment:false},{model:'2405ST-unknown'}])assert.equal(run({equipment:{...equipment,...changed}}).status,'unverified');
 assert.equal(run({manuals:[{...manual,contentHash:'wrong'}]}).status,'unverified');
 assert.equal(run({manuals:[{...manual,usable:false}]}).status,'unverified');
 assert.equal(run({manuals:[{...manual,pages:[{page:2,quality:{readable:true}}]}]}).status,'unverified');
 assert.equal(run({manuals:[{...manual,pages:[{page:1,quality:{readable:true}},{page:2,quality:{readable:false},text:'readable elsewhere'}]}]}).status,'unverified');
 assert.equal(run({reading:{...reading,interpretation:{status:'method_unverified'}}}).status,'unverified');
});

test('mains envelope, battery standby, and nominal voltage are not conflated',()=>{
 const changed={...reading,result:{...reading.result,rawText:'27.0'}};
 assert.equal(run({reading:changed}).comparison.inside,true);
 const battery=run({reading:changed,context:{...context,powerMode:'battery_standby'}});assert.equal(battery.comparison.inside,false);assert.equal(battery.comparison.max,26);
 assert.equal(run({context:{...context,batteryConnectionTransient:'yes'}}).status,'unverified');
 // 25 V is outside 24 ±3% but inside the specified mains envelope. The tighter
 // nominal tolerance at 25°C is deliberately not an enabled comparator.
 const nominal=run({reading:{...reading,result:{...reading.result,rawText:'25.0'}}});assert.equal(nominal.comparison.inside,true);assert.match(nominal.summary,/documented 21.6–28.8/);
});

test('partial, no load, AC, wrong terminals and unknown scope cannot produce a range verdict',()=>{
 for(const changed of [{loadCondition:'partial_load'},{loadCondition:'no_load'},{powerMode:'other'},{outputPair:'other'},{electricalMode:'AC'},{loadCondition:'unknown'},{loadCondition:'connected'},{batteryConnectionTransient:false},{outputPair:null}]){
  const output=run({context:{...context,...changed}});assert.equal(output.status,'unverified');assert.equal(output.comparison,undefined);
 }
});

test('zero is numeric; OL, unavailable, unstable and nonperformed values remain distinct',()=>{
 const zero=run({reading:{...reading,result:{...reading.result,rawText:'0',value:24.1}}});assert.equal(zero.status,'compared');assert.equal(zero.comparison.value,0);assert.equal(zero.comparison.inside,false);
 for(const rawText of ['OL','unknown','not tested','inaccessible','unstable','24 to 25'])assert.equal(run({reading:{...reading,result:{...reading.result,rawText}}}).status,'unverified');
 for(const changed of [{source:'panel'},{source:'derived'},{executionState:'suggested'},{executionState:'not_tested'}])assert.equal(run({reading:{...reading,result:{...reading.result,...changed}}}).status,'unverified');
 assert.equal(run({reading:{...reading,historical:true}}).status,'unverified');
 assert.equal(run({reading:{...reading,result:{...reading.result,rawText:'24100',unit:'mV'}}}).comparison.value,24.1);
});

test('a corrected raw reading is re-evaluated; input and prior source snapshots stay unchanged',()=>{
 const before=structuredClone({reading,manual,equipment,context});const initial=run();
 const correction={...reading,id:'measured-2',supersedes:reading.id,result:{...reading.result,rawText:'12',value:24.1}};
 const revised=run({reading:correction});assert.equal(initial.comparison.inside,true);assert.equal(revised.comparison.inside,false);assert.equal(revised.comparison.value,12);
 revised.sourceRefs[0].title='changed snapshot';assert.equal(initial.sourceRefs[0].title,source.title);assert.deepEqual({reading,manual,equipment,context},before);
});

test('explicit stored scope can be reused, conflicting clarification requires a correction',()=>{
 const scoped={...reading,points:[{label:'LOAD2 + to LOAD2 −'}],reference:'LOAD2 + to LOAD2 −',operatingState:'battery standby',loadState:'full load'};
 const inferred=run({reading:scoped,context:{}});assert.equal(inferred.status,'compared');assert.equal(inferred.comparison.scope.outputPair,'LOAD2');
 const conflict=run({reading:scoped,context:{outputPair:'LOAD1'}});assert.equal(conflict.status,'unverified');assert.deepEqual(conflict.conflicts,['outputPair']);assert.match(conflict.summary,/Correct the reading/);
 const q=getTerminalReadingContextQuestion('outputPair');q.options[0].label='edited';assert.notEqual(TERMINAL_READING_CONTEXT_QUESTIONS.outputPair.options[0].label,'edited');assert.equal(getTerminalReadingContextQuestion('missing'),null);
});
