import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseQuickQuestionIntent, discoverQuickManualCandidates, manualMatchesQuickIntent} from '../public/app/question-manual-search.mjs';
import {buildManualAnalysis} from '../public/app/manual-analysis-core.mjs';

const catalogue = JSON.parse(fs.readFileSync(new URL('../public/app/data/catalogue.json', import.meta.url))).records;
const exactQuestion = 'How do I do a walk test on an MxPro panel?';
const intent = (question, options = {}) => parseQuickQuestionIntent(question, {catalogue, ...options});
const synthetic = {id:'synthetic-search-panel',brand:'Test Bench',title:'SYNTHETIC FINDR-QA-100 user guide',models:['FINDR-QA-100'],category:'fire',type:'user-guide'};
const analysis = (model, extra = {}) => buildManualAnalysis({record:{id:'synthetic-'+model,title:'SYNTHETIC model reading test'},contentHash:'synthetic-'+model,pages:[{page:1,text:`SYNTHETIC TEST ONLY. Advanced Electronics ${model} fire alarm control panel user guide.\nModel: ${model}\nThis labelled synthetic document tests model coverage and is not a manufacturer procedure. The engineer must use the actual applicable manual before operating any installed equipment.`}],...extra});

test('acceptance question names the MxPro family and walk test without guessing 4 or 5', () => {
  const actual = intent(exactQuestion);
  assert.equal(actual.sufficient,true);
  assert.equal(actual.equipment.model,'MxPro');
  assert.equal(actual.equipment.exact,false);
  assert.equal(actual.equipment.manufacturer,'Advanced');
  assert.deepEqual(actual.requestedModels,['MxPro4','MxPro5']);
  assert.equal(actual.operation.id,'walk-test');
  assert.equal(actual.contextUsed,false);
});

test('model separators, trade shorthand and a bounded typo still preserve exact variants', () => {
  for(const question of ['walktest mx pro 4','How do I walk-test MxPro5?','mxpor 4 walk tset']) {
    const actual = intent(question);
    assert.equal(actual.sufficient,true);
    assert.equal(actual.equipment.exact,true);
    assert.equal(actual.operation.id,'walk-test');
    assert.equal(actual.equipment.model,question.includes('5')?'MxPro5':'MxPro4');
  }
  assert.equal(intent('Advanced panel walk test').sufficient,false);
  assert.equal(intent('MxPro45 walk test').sufficient,false);
});

test('real catalogue proposes an operating manual and displays its actual coverage and revision', () => {
  const matches = discoverQuickManualCandidates(intent(exactQuestion), {catalogue,stage:'archive'});
  assert.ok(matches.length>1);
  assert.ok(['advanced-8f3ba6ecfc7f','advanced-0254975c10bd'].includes(matches[0].id));
  assert.equal(matches[0].type,'user-guide');
  assert.ok(matches[0].relevance.includes('likely source'));
  assert.ok(matches[0].relevance.includes('walk-test'));
  assert.ok(['MxPro4','MxPro5'].includes(matches[0].coverageLabel));
  assert.ok(matches[0].revision);
  assert.ok(!matches.some(m=>m.id==='advanced-68d6fbdda0f1'));
  assert.ok(!matches.some(m=>m.id==='advanced-e3c12063d700'));
});

test('explicit MxPro5 does not select MxPro4 and exclusion supports choose another', () => {
  const first = discoverQuickManualCandidates(intent('MxPro5 walk test'),{catalogue,stage:'archive'});
  assert.ok(first.length);
  assert.ok(first.every(record=>!/mxpro4/i.test(record.coverageLabel)));
  const again = discoverQuickManualCandidates(intent('MxPro5 walk test'),{catalogue,stage:'archive',excludedManualIds:[first[0].id]});
  assert.ok(!again.some(m=>m.id===first[0].id));
});

test('saved scanning filters locally first and handles both Map and array records', () => {
  const four = catalogue.find(r=>r.id==='advanced-8f3ba6ecfc7f'), five = catalogue.find(r=>r.id==='advanced-0254975c10bd');
  const savedManuals = new Map([[four.id,four],[five.id,five]]);
  const matches = discoverQuickManualCandidates(intent('MxPro4 walk test'),{catalogue,savedManuals,stage:'saved',online:false});
  assert.deepEqual(matches.map(m=>m.id),[four.id]);
  assert.equal(matches[0].saved,true);
  assert.deepEqual(discoverQuickManualCandidates(intent(exactQuestion),{catalogue,savedManuals:[four],stage:'archive',online:false}),[]);
  assert.equal(discoverQuickManualCandidates(intent(exactQuestion),{savedManuals:[four],stage:'saved',online:false})[0].id,four.id);
});

test('dynamic catalogue and uploaded models preserve complete suffixes and reject generic nouns', () => {
  const fixture = {...synthetic,models:['FINDR-QA-100-UK-R2']};
  const actual = intent('How do I view the event history on FINDR-QA-100-UK-R2?',{catalogue:[fixture]});
  assert.equal(actual.equipment.model,'FINDR-QA-100-UK-R2');
  assert.equal(actual.operation.id,'event-history');
  assert.equal(actual.sufficient,true);
  assert.equal(intent('FINDR-QA-1000-UK-R2',{catalogue:[fixture]}).sufficient,false);
  assert.equal(intent('FINDR-QA-100-UK-R2',{catalogue:[synthetic]}).sufficient,false);
  assert.equal(intent('How do I wire an optical detector?',{catalogue:[{...fixture,models:['optical detector']}]}).sufficient,false);
});

test('follow-ups retain equipment and original operation; external component requests do not inherit panel identity', () => {
  const equipment = intent('MxPro4 walk test').equipment;
  for(const question of ['where is that menu?','explain step two','what do I press next?']) {
    const next = intent(question,{equipment,previousQuestion:exactQuestion});
    assert.equal(next.contextUsed,true);
    assert.equal(next.equipment.model,'MxPro4');
    assert.equal(next.operation.id,'walk-test');
  }
  const component = intent('what about the external PSU?',{equipment,previousQuestion:exactQuestion});
  assert.equal(component.sufficient,false);
  assert.equal(component.equipment.equipmentType,'PSU');
  assert.equal(component.contextUsed,false);
  const change = intent('Actually this is an MxPro5',{equipment});
  assert.equal(change.equipment.model,'MxPro5');
  assert.equal(change.contextUsed,false);
});

test('manufacturer alone never picks an exact model or a manual', () => {
  const question = intent('How do I do a walk test on an Advanced panel?');
  assert.equal(question.sufficient,false);
  assert.deepEqual(discoverQuickManualCandidates(question,{catalogue}),[]);
});

test('readable body identity must match and a title alone cannot verify model coverage', () => {
  const manual = analysis('MxPro4');
  const result = manualMatchesQuickIntent(manual,intent('MxPro4 walk test'));
  assert.equal(result.matches,true);
  assert.equal(result.exact,true);
  assert.equal(result.needsVariant,false);
  assert.equal(manualMatchesQuickIntent(manual,intent('MxPro5 walk test')).matches,false);
  assert.equal(manualMatchesQuickIntent({...manual,identity:{}},intent('MxPro4 walk test')).matches,false);
  assert.equal(manualMatchesQuickIntent({...manual,identity:{...manual.identity,manufacturer:null}},intent('MxPro4 walk test')).matches,false);
  assert.equal(manualMatchesQuickIntent({...manual,usable:false},intent('MxPro4 walk test')).matches,false);
  assert.equal(manualMatchesQuickIntent({...manual,identity:{...manual.identity,manufacturer:'Other manufacturer'}},intent('MxPro4 walk test')).matches,false);
});

test('family matching keeps a variant question available until procedure evidence resolves scope', () => {
  const result = manualMatchesQuickIntent(analysis('MxPro4'),intent(exactQuestion));
  assert.equal(result.matches,true);
  assert.equal(result.exact,false);
  assert.equal(result.needsVariant,true);
  assert.ok(result.scope.models.includes('MxPro4'));
  assert.ok(result.reason.includes('procedure depends'));
});

test('verified Advanced model-family relationships match coverage without replacing original labels', () => {
  const four = analysis('Mx-4200'), five = analysis('Mx-5200');
  assert.equal(manualMatchesQuickIntent(four,intent('MxPro4 walk test')).matches,true);
  assert.equal(manualMatchesQuickIntent(five,intent('MxPro5 walk test')).matches,true);
  assert.equal(manualMatchesQuickIntent(four,intent('MxPro5 walk test')).matches,false);
  assert.ok(manualMatchesQuickIntent(four,intent(exactQuestion)).scope.models.includes('Mx-4200'));
  assert.equal(manualMatchesQuickIntent(analysis('Mx-4500'),intent('MxPro4 walk test')).matches,false);
});

test('terminal questions prioritize actual installation/wiring documents instead of operating menus', () => {
  const matches = discoverQuickManualCandidates(intent('Which terminals do I wire on an MxPro4?'),{catalogue});
  assert.ok(matches.length);
  assert.equal(matches[0].type,'installation');
  assert.equal(matches[0].coverageLabel,'MxPro4');
});

test('a co-branded manual uses manufacturers actually extracted from its pages without widening model coverage',()=>{
 const requested=intent('Putting a gent vigilon on walk test');assert.equal(requested.equipment.model,'Vigilon');assert.equal(requested.equipment.exact,false);
 const source={usable:true,contentHash:'SYNTHETIC-cobranded',identity:{manufacturer:'Honeywell',manufacturerCandidates:['Honeywell','Gent'],model:'Vigilon',models:['Vigilon']},pages:[{page:1,text:'SYNTHETIC TEST ONLY Gent Vigilon by Honeywell operating guide',quality:{readable:true}}]};
 assert.equal(manualMatchesQuickIntent(source,requested).matches,true);
 assert.equal(manualMatchesQuickIntent({...source,identity:{...source.identity,manufacturerCandidates:['Honeywell']}},requested).matches,false);
 assert.equal(manualMatchesQuickIntent({...source,identity:{...source.identity,models:['Nano'],model:'Nano'}},requested).matches,false);
});

test('a reviewed section outranks a generic user-guide guess while requiring its PDF to be checked later',()=>{
 const asked=intent('Putting a gent vigilon on walk test'),source=catalogue.find(r=>r.id==='facp-7538be76-f958-46e4-99f6-c718601bb349');assert.ok(source);
 const procedures=[{id:'SYNTHETIC-ranking-only',operation:'walk-test',manual:{recordId:source.id,models:['Vigilon']},scope:{models:['Vigilon']}}];
 const hits=discoverQuickManualCandidates(asked,{catalogue,procedures,stage:'archive'});assert.equal(hits[0].id,source.id);assert.match(hits[0].relevance,/check its edition/);
});


test('readable Gent ownership footer resolves Honeywell cover without using a catalogue brand as evidence',()=>{
 const requested=intent('Putting a gent vigilon on walk test');const source={usable:true,contentHash:'SYNTHETIC-footer-ownership',identity:{manufacturer:'Honeywell',manufacturerCandidates:['Honeywell'],model:null,models:['Vigilon'],familyOnly:true},pages:[{page:1,text:'SYNTHETIC TEST ONLY by Honeywell. Generic commissioning instructions for Vigilon 4/6 loop and Compact fire panels.',quality:{readable:true}},{page:162,text:'Gent by Honeywell reserves the right to revise this publication.',quality:{readable:true}}]};
 assert.equal(manualMatchesQuickIntent(source,requested).matches,true);assert.equal(manualMatchesQuickIntent({...source,pages:source.pages.slice(0,1)},requested).matches,false);assert.equal(manualMatchesQuickIntent({...source,pages:source.pages.map(p=>({...p,quality:{readable:p.page===1}}))},requested).matches,false);
});
