import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normaliseManualQuote} from '../public/app/manual-answers.mjs';

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
