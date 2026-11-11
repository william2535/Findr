import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyManualProcessingError} from '../public/app/manual-analysis.mjs';

test('resource cancellation remains cancellation and does not request a clearer PDF',()=>{
 const original=new DOMException('Offline-resource download cancelled.','AbortError');
 assert.equal(classifyManualProcessingError(original,{phase:'ocr-start'}),original);
 assert.doesNotMatch(original.message,/clearer|unlocked|copy/i);
});
test('missing offline software and OCR failure have separate recovery instructions',()=>{
 const original=new Error('SYNTHETIC worker startup failure');
 const missing=classifyManualProcessingError(original,{phase:'ocr-start',missingOfflineResources:true});
 assert.equal(missing.code,'OFFLINE_RESOURCES_MISSING');assert.match(missing.message,/prepare.*resources.*same PDF/i);assert.doesNotMatch(missing.message,/clearer|unlocked/);
 const failed=classifyManualProcessingError(original,{phase:'ocr-recognize',page:3});
 assert.equal(failed.code,'OCR_FAILED');assert.match(failed.message,/OCR worker failed on page 3/);assert.match(failed.message,/retry processing/i);assert.equal(failed.cause,original);
});
test('locked PDFs, rendering and indexing failures retain their distinct cause',()=>{
 const original=new Error('SYNTHETIC failure');
 assert.equal(classifyManualProcessingError(original,{passwordProtected:true}).code,'PDF_PASSWORD_PROTECTED');
 assert.equal(classifyManualProcessingError(original,{phase:'rendering',page:2}).code,'PDF_RENDER_FAILED');
 const indexing=classifyManualProcessingError(original,{phase:'indexing'});assert.equal(indexing.code,'MANUAL_INDEXING_FAILED');assert.doesNotMatch(indexing.message,/clearer|unlocked/);
 assert.equal(classifyManualProcessingError(original,{phase:'pdf-software'}).code,'PDF_RESOURCES_FAILED');
});
test('existing unreadable and storage errors are never relabelled as OCR failures',()=>{
 for(const code of ['UNREADABLE_MANUAL','STORAGE_UNAVAILABLE','RESOURCE_INTEGRITY_FAILED']){const original=Object.assign(new Error(code),{code});assert.equal(classifyManualProcessingError(original,{phase:'ocr-recognize'}),original);}
});
