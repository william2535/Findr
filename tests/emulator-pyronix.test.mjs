import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateMenuMap} from '../public/app/menu-map-engine.mjs';
import {getPyronixConfig} from '../public/app/emulator-pyronix.mjs';
import {buildEmulatorModel,createEmulatorState,pressEmulatorKey,emulatorView,openEmulatorNode,setEmulatorRoot,setEmulatorText,setEmulatorZone,restoreEmulatorState} from '../public/app/emulator-engine.mjs';
import {startHints,advanceHints} from '../public/app/emulator-hints.mjs';

const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8'));
const map=read('../public/app/data/menu-maps/pyronix-enforcer.json');
const profile=read('../research/expansion/pyronix-profile.json');
const config=getPyronixConfig(map,profile),model=buildEmulatorModel(map,profile);
const view=state=>emulatorView(model,state);
const physical=new Set(profile.keys.map(key=>key.id));
const press=(state,...keys)=>keys.flat().reduce((previous,key)=>{
  assert(physical.has(key),'Only a real Enforcer menu key may be pressed: '+key);
  return pressEmulatorKey(model,previous,key);
},state);
const snapshot=state=>JSON.stringify(Object.fromEntries(['values','committedValues','zoneTypes','zoneNames','zoneOmitEnabled','omittedZones','outputStates','armed','alarm'].map(key=>[key,state[key]])));
function hintsTo(id,{recordId}={}) {
  const run=startHints(model,createEmulatorState(model),id,{recordId});
  let {state,hint}=run;const keys=[],before=snapshot(state);
  while(hint.status==='active'&&keys.length<160){
    const key=hint.nextKey,next=press(state,key);
    hint=advanceHints(model,hint,state,next,key);state=next;keys.push(key);
    assert.equal(snapshot(state),before,'Guidance must not commit programming, omit an input or activate an output');
  }
  assert.notEqual(hint.status,'active','Guidance must terminate');
  return {state,hint,keys};
}
function locate(id,recordId) {
  let state=openEmulatorNode(model,createEmulatorState(model),id);
  for(let i=0;view(state).mode==='selector'&&i<5;i++)state=recordId?press(state,...String(recordId),'enter'):press(state,'enter');
  return state;
}
function engineerTests() {
  const index=config.roots[0].nodeIds.indexOf('py-tests');
  return press(createEmulatorState(model),Array(index).fill('back'),'enter');
}
function engineerWalkArea() {
  let state=engineerTests();assert.equal(state.editor.nodeId,'py-test-sounds');
  state=press(state,'back');assert.equal(view(state).node.id,'py-test-walk');
  assert.equal(state.walk.running,false);state=press(state,'enter');
  assert.equal(state.walk.running,false);return state;
}

test('Pyronix atlas validates every source page and keeps the three V11 editions pinned',()=>{
  assert.deepEqual(validateMenuMap(map),[]);
  assert.deepEqual(map.sources.map(source=>source.totalPdfPages),[60,28,40]);
  assert(map.sources.every(source=>/^[a-f0-9]{64}$/.test(source.sha256)));
  assert.equal(map.sources[0].sha256,'92f47ace93369e6a407e5f217652ad727eb3ed69ca1403ac70aadc1c627ed0a7');
  assert.equal(map.sources[1].sha256,'75162c4f14a16da98bbd49be16244f061cbfe82e8da40c6f5fb630ba0a6e41b1');
  assert.equal(map.coverage.hardwareVerified,false);
  for(const gap of map.gaps)assert(gap.affectedNodeIds.every(id=>map.nodes.some(node=>node.id===id)));
});

test('Engineer root preserves the documented 22-question order and has no chapter-number shortcuts',()=>{
  assert.deepEqual(config.roots[0].nodeIds,['py-date','py-wireless','py-inputs','py-mode','py-zems','py-outputs','py-keypads','py-timers','py-codes','py-volume','py-system','py-logs','py-tests','py-diagnostics','py-restore','py-communications','py-response','py-downloading','py-dial','py-software','py-clean','py-exit']);
  assert(config.roots[0].nodeIds.every(id=>model.nodes[id].code===null));
  const state=press(createEmulatorState(model),'3');
  assert.equal(state.trail.length,1);assert.equal(state.digits,'');
  assert.match(state.feedback,/scrolling/);
  assert.equal(config.roots.find(root=>root.id==='pm-manager').nodeIds.length,16);
  assert.equal(config.roots.find(root=>root.id==='pu-user').nodeIds.length,7);
});

test('C and D are separate physical keys from the value and record arrows',()=>{
  assert.equal(physical.size,18);
  assert.deepEqual(['enter','back','logout','previous','cancel','area-d','left','right'].map(id=>profile.keys.find(key=>key.id===id).label),['YES','NO','A','B','C','D','◀','▶']);
  assert(!physical.has('next'));assert(!physical.has('details'));
  assert.deepEqual(config.overrides['py-input-areas'].keyChoiceCodes,{logout:'A',previous:'B',cancel:'C','area-d':'D'});
});

test('Physical input route immediately edits type, advances areas and skips the attribute question with NO',()=>{
  let state=press(createEmulatorState(model),'back','back','enter','0','4','enter');
  assert.equal(state.editor.nodeId,'py-input-type');assert.equal(view(state).context.zone,'04');
  state=press(state,'0','8','enter');
  assert.equal(state.zoneTypes['04'],'Entry Route');assert.equal(state.editor.nodeId,'py-input-areas');
  assert.equal(state.values['py-input-type|zone|04|'],'Entry Route');assert.deepEqual(state.committedValues,{});
  const count=Object.keys(state.values).length;
  state=press(state,'enter','enter');
  assert.equal(view(state).node.id,'py-input-attributes');assert.equal(state.editor,null);
  assert.equal(Object.keys(state.values).length,count,'Unchanged YES accepts must not fabricate edits');
  state=press(state,'back','enter');
  assert.equal(state.editor.nodeId,'py-input-name');
  state=setEmulatorText(model,state,'SIDE OFFICE');state=press(state,'enter','enter');
  assert.equal(state.zoneNames['04'],'SIDE OFFICE');assert.equal(view(state).mode,'selector');
  assert.equal(view(state).record.id,'04');
});

test('Area letters toggle their own flags while C returns one field outside the area flag editor',()=>{
  let state=press(createEmulatorState(model),'back','back','enter','enter','enter');
  assert.equal(state.editor.nodeId,'py-input-areas');
  state=press(state,'previous','cancel','area-d','logout');
  assert.deepEqual(state.editor.draft,{A:false,B:true,C:true,D:true});assert.equal(state.confirm,null);
  state=press(state,'enter');assert.equal(state.editor.nodeId,'py-input-area-logic');
  state=press(state,'right','cancel');assert.equal(state.editor.nodeId,'py-input-areas');
  assert(!Object.keys(state.values).some(key=>key.startsWith('py-input-area-logic|')),'C discards an unaccepted draft');
});

test('Engineer edits remain pending until exit while Manager fields commit when accepted',()=>{
  let state=press(createEmulatorState(model),'back','back','enter','enter','0','8','enter','back','logout','enter');
  assert.equal(state.loggedOut,true);assert.deepEqual(state.committedValues,state.values);
  state=setEmulatorRoot(model,state,'pm-manager');
  state=openEmulatorNode(model,state,'pm-block-value');
  assert.equal(state.editor.nodeId,'pm-block-value');
  state=press(state,'1','enter');
  const key=Object.keys(state.values).find(key=>key.startsWith('pm-block-value|'));
  assert(key);assert.equal(state.committedValues[key],'Yes');
});

test('Nested question lists leave at the final NO while the main menu wraps',()=>{
  let state=press(createEmulatorState(model),'back','enter');
  assert.equal(view(state).node.id,'py-wireless');
  state=press(state,'previous');assert.equal(view(state).cursor,0);
  state=press(state,'back','back','back','back');
  assert.equal(state.trail.length,1);assert.equal(view(state).selected.id,'py-wireless');
  state=press(createEmulatorState(model),'previous');assert.equal(view(state).selected.id,'py-exit');
});

test('Panel and Access logs use D/B chronology, C detail, and A summary without logging out',()=>{
  let state=locate('py-log-panel');state=press(state,'area-d','area-d','cancel');
  assert.equal(state.eventIndex,2);assert.equal(state.details,true);assert.match(view(state).screen.lines.join(' '),/HALL PIR/);
  state=press(state,'logout');assert.equal(state.details,false);assert.equal(state.confirm,null);
  state=press(state,'previous');assert.equal(state.eventIndex,1);
  const access=locate('py-log-access');assert.match(view(access).screen.lines.join(' '),/Access Granted/);
  assert.doesNotMatch(view(access).screen.lines.join(' '),/Mains/);
});

test('Wireless and wired diagnostics retain address boundaries and never offer wireless resistance',()=>{
  let wireless=locate('py-diag-wireless-inputs','02');
  assert.deepEqual(view(wireless).records.map(record=>record.id),['01','02','03','04']);
  wireless=press(wireless,'right');assert.equal(view(wireless).zone.address,'03');assert.equal(wireless.details,false);
  wireless=press(wireless,'3','3');assert.equal(view(wireless).zone.address,'03');
  assert.match(wireless.feedback,/not fitted/);assert.doesNotMatch(view(wireless).screen.lines.join(' '),/2k20|6k90|Demo reading/);
  let wired=locate('py-diag-endstation-inputs');
  assert.deepEqual(view(wired).records.map(record=>record.id),['33','34']);
  wired=press(wired,'enter');assert.equal(wired.details,true);assert.match(view(wired).screen.lines.join(' '),/2k20/);
});

test('ZEM diagnostics select the fitted expander before showing only its input records',()=>{
  let state=openEmulatorNode(model,createEmulatorState(model),'py-diag-zem-inputs');
  assert.equal(view(state).mode,'selector');assert.deepEqual(view(state).records.map(record=>record.id),['0']);
  state=press(state,'enter');assert.equal(view(state).context.module,'0');
  assert.deepEqual(view(state).records.map(record=>record.id),['35','36']);
  state=press(state,'right','enter');assert.equal(view(state).zone.address,'36');assert.equal(state.details,true);
});

test('Manager omission is limited to Day Alarm inputs and persists after leaving its screen',()=>{
  let state=locate('pm-omit');assert.equal(state.rootId,'pm-manager');
  assert.deepEqual(view(state).records.map(record=>record.id),['03']);
  state=press(state,'0','2');assert.equal(view(state).zone.address,'03');assert.match(state.feedback,/not fitted/);
  state=press(state,'enter','back');assert.equal(state.omittedZones['03'],true);assert.equal(state.omittedZones['02'],false);
  assert.equal(view(state).node.id,'@pm-manager');
});

test('Source contradictions and absent ranges cannot create numeric shortcuts or arbitrary editors',()=>{
  const eol=config.overrides['py-eol-range'];
  assert.deepEqual(eol.choices.map(choice=>choice.code),['0','1',null,null]);
  assert.equal(config.overrides['py-timer-occupancy'].mode,'info');
  assert.equal(config.overrides['py-timer-service-time'].mode,'info');
  assert.equal(config.overrides['py-timer-wi-fi-fault-delay'].mode,'info');
  assert.equal(config.overrides['py-timer-a-siren-time'].min,2);
  assert.equal(config.overrides['py-timer-a-siren-time'].max,15);
  assert.equal(config.overrides['py-timer-hu-confirm-time'].min,8);
  assert.equal(config.overrides['py-timer-hu-confirm-time'].max,20);
  assert(config.overrides['py-response-area-a-stops-at'].choices.every(choice=>choice.code!=='4'));
  for(const [id,node]of Object.entries(config.overrides))if(node.choices){const codes=node.choices.filter(choice=>choice.code!=null).map(choice=>String(choice.code));assert.equal(new Set(codes).size,codes.length,id+' ambiguous numeric code');}
});

test('Status fixtures show their intended values even in sequential containers',()=>{
  const voltage=locate('py-diag-volts-panel');assert.match(view(voltage).screen.lines.join(' '),/13\.7V/);
  const software=locate('py-software-panel-software');assert.match(view(software).screen.lines.join(' '),/V11/);
  const signal=locate('py-diag-input-signal','02');assert.match(view(signal).screen.lines.join(' '),/85%/);
  assert.equal(view(signal).context.zone,'02');
});

test('FINDR hints find the mixed input sequence without saving any intermediate value',()=>{
  for(const [id,recordId]of [['py-input-name','04'],['py-input-confirm-group','04'],['py-keypad-location','1'],['py-diag-endstation-inputs',undefined],['pm-omit',undefined]]){
    const result=hintsTo(id,{recordId});assert.equal(result.hint.status,'complete',id+': '+result.hint.message);
    assert.equal(view(result.state).node.id,id);
    if(recordId==='04')assert.equal(view(result.state).context.zone,'04');
  }
});

test('Compound selector hints require the output module and then output record',()=>{
  const result=hintsTo('py-output-module-function');
  assert.equal(result.hint.status,'complete',result.hint.message);
  assert.equal(view(result.state).node.id,'py-output-module-function');
  assert.equal(view(result.state).context.outputModule,'0');
  assert.equal(view(result.state).context.output,'1');
});

test('Walk states remain inside the operational screen rather than invented extra menu questions',()=>{
  for(const id of ['py-test-walk-areas','py-test-walk-run','py-test-walk-individual']){
    assert.equal(model.rawById.get(id).kind,'reference');assert.equal(model.nodes[id],undefined);
  }
  assert.equal(model.nodes['py-test-walk'].mode,'walk');
  assert.equal(model.nodes['py-test-walk'].areaSelection,true);
});

test('Engineer area walk test starts with YES and registers a detector only after activation and restoration',()=>{
  let state=press(engineerWalkArea(),'enter');assert.equal(state.walk.running,true);
  state=setEmulatorZone(model,state,'02','active');assert.deepEqual(state.walk.hits,[]);
  state=setEmulatorZone(model,state,'02','secure');assert.deepEqual(state.walk.hits,['02']);
  state=press(state,'back');assert.equal(state.walk.running,false);
});

test('Saved Input Areas drive the next walk test and survive restoring the fictional state',()=>{
  let state=press(createEmulatorState(model),'back','back','enter','0','4','enter','enter','logout','previous','enter');
  assert.deepEqual(Object.keys(state.zoneAreas['04']).filter(area=>state.zoneAreas['04'][area]),['B']);
  state=restoreEmulatorState(model,JSON.parse(JSON.stringify(state)));
  assert.deepEqual(Object.keys(state.zoneAreas['04']).filter(area=>state.zoneAreas['04'][area]),['B']);
  state=openEmulatorNode(model,state,'py-test-walk');state=press(state,'enter','logout','previous','enter');
  assert.equal(state.walk.running,true);assert.deepEqual(state.walk.allowed,['04']);
});

test('Engineer individual walk test collects numeric inputs with YES and starts with NO',()=>{
  let state=press(engineerWalkArea(),'back','0','2','enter');assert.equal(state.walk.running,false);
  state=press(state,'back');assert.equal(state.walk.running,true);assert.deepEqual(state.walk.allowed,['02']);
  state=setEmulatorZone(model,state,'03','active');state=setEmulatorZone(model,state,'03','secure');assert.deepEqual(state.walk.hits,[]);
  state=setEmulatorZone(model,state,'02','active');state=setEmulatorZone(model,state,'02','secure');assert.deepEqual(state.walk.hits,['02']);
  state=press(state,'back');assert.equal(state.walk.running,false);
});

test('Manager walk test enforces one area and its individual-input YES starts the chosen input',()=>{
  let state=locate('pm-walk');assert.equal(state.walk.running,false);
  state=press(state,'previous','enter');assert.equal(state.walk.running,false,'Selecting A and B cannot start a one-area test');
  assert.match(state.feedback,/one|single/i);
  state=locate('pm-walk');state=press(state,'back','right','enter');
  assert.equal(state.walk.running,true);assert.deepEqual(state.walk.allowed,['02']);
});

test('Engineer siren test starts both indicators together and NO stops and advances to Battery Load Test',()=>{
  let state=press(engineerTests(),'back','back','back');assert.equal(view(state).node.id,'py-test-siren');
  assert(Object.values(state.outputStates).every(value=>value===false));
  state=press(state,'enter');assert.deepEqual(state.outputStates,{Siren:true,Strobe:true});
  state=press(state,'back');assert(Object.values(state.outputStates).every(value=>value===false));
  assert.equal(view(state).node.id,'py-test-battery');
});

test('Manager siren test uses YES to stop both local indicators as the user guide specifies',()=>{
  let state=locate('pm-siren');assert.deepEqual(state.outputStates,{Siren:true,Strobe:true});
  state=press(state,'enter');assert(Object.values(state.outputStates).every(value=>value===false));
  assert.equal(state.rootId,'pm-manager');
});

test('Output testing selects a documented four-digit function rather than a fabricated fitted-output record',()=>{
  let state=press(engineerTests(),'back','back','back','back','back');
  assert.equal(view(state).node.id,'py-test-outputs');state=press(state,'enter');
  state=press(state,'9','9','9','9','enter');assert(Object.values(state.outputStates).every(value=>value===false));
  state=press(state,'back','enter','0','0','0','6','enter');
  assert(Object.values(state.outputStates).some(value=>value===true));
  assert.match(view(state).screen.lines.join(' '),/Confirmed Any/i);
  state=press(state,'back');assert(Object.values(state.outputStates).every(value=>value===false));
});

test('Tone selection acknowledgement never writes configuration and NO follows the documented exit',()=>{
  let state=press(engineerTests(),'right','enter');
  assert.equal(state.editor.nodeId,'py-test-sounds');assert.deepEqual(state.values,{});assert.deepEqual(state.committedValues,{});
  assert.match(state.feedback,/Tone selected/);
  state=press(state,'back');assert.equal(view(state).node.id,'py-test-walk');
  state=locate('pm-sounds');assert.equal(state.editor.draft,'No Sound');
  state=press(state,'right','enter');assert.equal(state.editor.nodeId,'pm-sounds');assert.deepEqual(state.values,{});
  state=press(state,'back');assert.equal(view(state).node.id,'@pm-manager');
});

test('Hints to tests stop on the question without starting a sounder, function test or walk test',()=>{
  for(const id of ['py-test-walk','py-test-siren','py-test-outputs']){
    const result=hintsTo(id);assert.equal(result.hint.status,'complete',id+': '+result.hint.message);
    assert.equal(result.state.walk.running,false);assert(Object.values(result.state.outputStates).every(value=>value===false));
  }
});
