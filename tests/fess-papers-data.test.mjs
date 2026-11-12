import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {generateFessPapers,inspectFessPapers} from '../scripts/generate-fess-papers.mjs';
import {createFessPaper,answerFessPaper,finishFessPaper,paperScore} from '../public/app/fess-paper-engine.mjs';
import {validateFessBank,validateFessStore,emptyFessStore} from '../public/app/fess-mock-engine.mjs';
const bank=JSON.parse(fs.readFileSync(new URL('../public/app/data/fess-mocks.json',import.meta.url),'utf8'));
test('ten stored full papers reproduce deterministically, cover all196 and retain both earlier options',()=>{
 validateFessBank(bank);const generated=generateFessPapers(bank),stats=inspectFessPapers(bank,bank.papers);
 assert.deepEqual(generated.papers,bank.papers);assert.deepEqual(generated.paperFormat,bank.paperFormat);
 assert.equal(stats.paperCount,10);assert.equal(stats.questionCountPerPaper,60);assert.equal(stats.totalPlacements,600);assert.equal(stats.uniqueQuestionsCovered,196);
 assert.equal(bank.mocks.length,20);assert.equal(bank.quizzes.length,31);assert.equal(bank.version,'2026-11-12.1');
 assert.equal(bank.paperFormat.durationSeconds,3600);assert.equal(bank.paperFormat.officialDurationMinutes,75);assert.equal(bank.paperFormat.sourcePdfPage,53);
 assert.match(bank.paperFormat.sourceUrl,/FESS%20-%20EPA%20Kit%20v5.0.pdf$/);
});
test('every real paper can be answered, scored and restored with its original sources',()=>{
 for(const definition of bank.papers){let run=createFessPaper(bank,definition.id,{id:'verify-'+definition.id,now:1000});
  for(const [index,q]of run.questions.entries())run=answerFessPaper(run,q.id,q.correctOptionId,{now:2000+index});
  assert.equal(paperScore(run).correct,null);run=finishFessPaper(run,{now:4000});assert.equal(paperScore(run).correct,60);
  const store={...emptyFessStore(),activeRunId:run.id,runs:[run]};assert.deepEqual(validateFessStore(JSON.parse(JSON.stringify(store))),store);
 }
});
