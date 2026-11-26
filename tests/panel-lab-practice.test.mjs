import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MATRIX_CHALLENGES, PANEL_LESSONS, PRACTICE_SCOPE, getChallenge, createChallengeProject, gradeChallenge} from '../public/app/panel-lab-practice.mjs';
import {validateProject} from '../public/app/cause-effect-engine.mjs';

const solutions={
  'either-zone':[{inputIds:['z1','z2']}],
  'selective-groups':[{inputIds:['z1','z2']},{inputIds:['z3']}],
  'coincidence':[{inputIds:['z1','z2'],logic:'all'}],
  'restart-delay':[{inputIds:['z1'],delaySeconds:10}],
  'retain-until-reset':[{inputIds:['z1','z2'],latching:true}],
  'two-stages':[{inputIds:['z1','z2']},{inputIds:['z1','z2'],delaySeconds:20}],
  'mixed-logic':[{inputIds:['z1','z2','z3']},{inputIds:['z1','z2'],logic:'all',delaySeconds:5,latching:true},{inputIds:['z3'],delaySeconds:10}],
};
function solved(id) {
  const project=createChallengeProject(id);
  project.outputs=project.outputs.map((output,i)=>({...output,...solutions[id][i]}));
  return project;
}
const json=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));

test('seven independent, short fictional logic challenges have valid blank starters',()=>{
  assert.equal(MATRIX_CHALLENGES.length,7);
  assert.equal(new Set(MATRIX_CHALLENGES.map(c=>c.id)).size,MATRIX_CHALLENGES.length);
  assert.match(PRACTICE_SCOPE,/not an approved fire strategy/);
  for(const challenge of MATRIX_CHALLENGES) {
    assert.ok(challenge.minutes<=5);
    assert.ok(challenge.requirements.length && challenge.hints.length);
    const first=createChallengeProject(challenge.id),second=createChallengeProject(challenge.id);
    validateProject(first);
    assert.notEqual(first.id,second.id);
    first.inputs[0].label='Changed';
    assert.notEqual(first.inputs[0].label,second.inputs[0].label);
    assert.equal(gradeChallenge(challenge.id,second).passed,false,'An unopened/blank challenge must not pass');
  }
});

for(const id of Object.keys(solutions)) test(`${id}: requested behaviour passes; removing a required connection fails`,()=>{
  const project=solved(id),snapshot=JSON.stringify(project);
  const result=gradeChallenge(id,project);
  assert.equal(result.passed,true,JSON.stringify(result));
  assert.ok(result.checks.length>=4);
  assert.equal(JSON.stringify(project),snapshot,'Grading must not alter the saved board or simulation');
  project.outputs[0].inputIds=[];
  const incorrect=gradeChallenge(id,project);
  assert.equal(incorrect.passed,false);
  assert.ok(incorrect.checks.some(item=>!item.passed&&item.detail.length>10));
});

test('AND requires both causes, not just either one',()=>{
  const project=solved('coincidence');project.outputs[0].logic='any';
  const result=gradeChallenge('coincidence',project);
  assert.equal(result.passed,false);
  assert.equal(result.checks.find(c=>c.label==='A alone is not enough').passed,false);
});

test('unexpected links to a different floor fail selective routing',()=>{
  const project=solved('selective-groups');project.outputs[1].inputIds.push('z1');
  assert.equal(gradeChallenge('selective-groups',project).passed,false);
});

test('one second early or late fails the delayed-response boundary',()=>{
  for(const seconds of [0,9,11]) {
    const project=solved('restart-delay');project.outputs[0].delaySeconds=seconds;
    assert.equal(gradeChallenge('restart-delay',project).passed,false,`${seconds}s should fail`);
  }
});

test('a missing latch and an unwanted latch produce different failed restoration checks',()=>{
  const expectedLatch=solved('retain-until-reset');expectedLatch.outputs[0].latching=false;
  const result=gradeChallenge('retain-until-reset',expectedLatch);
  assert.equal(result.passed,false);
  assert.equal(result.checks.find(c=>c.label==='Cleared cause leaves a latched output').passed,false);
  const unwantedLatch=solved('either-zone');unwantedLatch.outputs[0].latching=true;
  assert.equal(gradeChallenge('either-zone',unwantedLatch).passed,false);
});

test('combined challenge catches plant output accidentally added to coincidence',()=>{
  const project=solved('mixed-logic');project.outputs[1].inputIds.push('z3');
  assert.equal(gradeChallenge('mixed-logic',project).passed,false);
});

test('renamed labels remain gradeable, but missing or extra test points do not',()=>{
  const project=solved('either-zone');project.inputs[0].label='A new name';
  assert.equal(gradeChallenge('either-zone',project).passed,true);
  project.inputs.push({id:'extra',label:'Unspecified input',kind:'zone',notes:''});
  assert.equal(gradeChallenge('either-zone',project).passed,false);
  assert.equal(gradeChallenge('either-zone',{}).passed,false);
  assert.equal(gradeChallenge('either-zone',null).passed,false);
  assert.equal(gradeChallenge('either-zone',{inputs:[null,null],outputs:[null]}).passed,false);
  assert.equal(gradeChallenge('missing',project).passed,false);
  assert.equal(getChallenge('missing'),null);
  assert.throws(()=>createChallengeProject('missing'),/not available/);
});

test('malformed output settings report failure without completing a lesson',()=>{
  const project=solved('either-zone');project.outputs[0].logic='invented-mode';
  const result=gradeChallenge('either-zone',project);
  assert.equal(result.passed,false);
  assert.ok(result.checks.some(c=>/could not be simulated/.test(c.detail)));
});

test('every manufacturer lesson resolves to the existing implemented trainer and checked source pages',()=>{
  const catalogue=json('../public/app/data/catalogue.json').records;
  const records=new Set(catalogue.map(record=>record.id));
  assert.equal(PANEL_LESSONS.length,10);
  assert.equal(new Set(PANEL_LESSONS.map(item=>item.id)).size,10);
  for(const lesson of PANEL_LESSONS) {
    const map=json(`../public/app/data/menu-maps/${lesson.sourceMapId}.json`);
    const node=map.nodes.find(item=>item.id===lesson.sourceNodeId);
    assert.ok(node,lesson.id);
    assert.equal(node.simulationStatus,'implemented');
    assert.equal(lesson.route,node.practiceRoute);
    assert.equal(lesson.id,node.lessonId);
    assert.match(lesson.completion,/does not mark it complete/);
    assert.ok(lesson.sources.length);
    for(const citation of lesson.sources) {
      const source=map.sources.find(item=>item.id===citation.sourceId);
      assert.ok(source,lesson.id);
      assert.ok(node.sourceRefs.some(ref=>ref.sourceId===citation.sourceId&&ref.pdfPage===citation.pdfPage));
      assert.equal(citation.recordId,source.recordId);
      assert.ok(records.has(citation.recordId),citation.recordId);
      assert.equal(citation.url,source.url);
      assert.ok(citation.pdfPage>=1&&Number.isInteger(citation.pdfPage));
      if(source.totalPdfPages||source.pages) assert.ok(citation.pdfPage<=(source.totalPdfPages||source.pages));
      assert.ok(citation.edition.length>0);
    }
  }
});
