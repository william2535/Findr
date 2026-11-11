import test from 'node:test';
import assert from 'node:assert/strict';
import {getPDFTextContent,normalisePDFBlob,loadPDFBytes,pdfDocumentOptions,PDFJS_VERSION} from '../public/app/pdf-runtime.mjs';
import {classifyManualProcessingError,getManualProcessingErrorDetails} from '../public/app/manual-analysis.mjs';

test('PDF text extraction supports Safari streams without async iteration',async()=>{
  const chunks=[{items:[{str:'First',hasEOL:true}],styles:{F1:{fontFamily:'serif'}},lang:'en'},{items:[{str:'Second'}],styles:{F2:{fontFamily:'sans-serif'}},lang:null}];
  let released=0,cancelled=0,received;
  const stream={getReader:()=>({read:async()=>chunks.length?{value:chunks.shift(),done:false}:{done:true},releaseLock:()=>released++,cancel:async()=>cancelled++})};
  assert.equal(stream[Symbol.asyncIterator],undefined);
  await assert.rejects(async()=>{for await(const chunk of stream){void chunk;}},TypeError);
  const text=await getPDFTextContent({streamTextContent:options=>(received=options,stream)},{disableNormalization:false});
  assert.deepEqual(text.items,[{str:'First',hasEOL:true},{str:'Second'}]);assert.deepEqual(Object.keys(text.styles),['F1','F2']);assert.equal(text.lang,'en');
  assert.deepEqual(received,{disableNormalization:false});assert.equal(released,1);assert.equal(cancelled,0);
});

test('extraction preserves a worker exception and always releases the reader',async()=>{
  const original=new TypeError('SYNTHETIC text worker failure');let released=0,cancelled=0;
  await assert.rejects(getPDFTextContent({streamTextContent:()=>({getReader:()=>({read:async()=>{throw original;},cancel:async()=>cancelled++,releaseLock:()=>released++})})}),error=>error===original);
  assert.equal(released,1);assert.equal(cancelled,1);
});

test('abort cancels an active PDF text read instead of leaving a pending reader',async()=>{
  const controller=new AbortController();let finish,released=0;
  const pending=getPDFTextContent({streamTextContent:()=>({getReader:()=>({read:()=>new Promise(resolve=>finish=resolve),cancel:async()=>finish?.({done:true}),releaseLock:()=>released++})})},{signal:controller.signal});
  controller.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(released,1);
});

test('saved PDF bytes preserve Blob and typed-array offsets; metadata is not a file',async()=>{
  const bytes=new TextEncoder().encode('xx%PDF-1.7\n%%EOFzz'),expected=bytes.slice(2,-2),blob=new Blob([expected],{type:'application/pdf'});
  assert.equal(await normalisePDFBlob(blob),blob);
  for(const input of [blob,expected.buffer,new Uint8Array(bytes.buffer,2,bytes.length-4),new DataView(bytes.buffer,2,bytes.length-4),{type:'Buffer',data:[...expected]}])assert.deepEqual(await loadPDFBytes(input),expected);
  await assert.rejects(loadPDFBytes(undefined),{code:'MISSING_PDF'});
  await assert.rejects(loadPDFBytes({name:'old.pdf',size:500,type:'application/pdf'}),{code:'PDF_BYTES_INVALID'});
  const options=pdfDocumentOptions(expected);assert.equal(options.data,expected);assert.equal(options.isEvalSupported,false);assert.equal(options.enableXfa,false);assert.match(options.standardFontDataUrl,/vendor\/pdfjs\/standard_fonts\/$/);
});

test('runtime failures retain the original stack and never imply a damaged or locked PDF',()=>{
  const original=new TypeError("undefined is not a function (near '...value of readableStream...')");
  original.stack='getTextContent@pdf.mjs:22019:28';
  const error=classifyManualProcessingError(original,{phase:'text-extraction',page:1});
  assert.equal(error.code,'PDF_RUNTIME_FAILED');assert.equal(error.cause,original);assert.doesNotMatch(error.message,/unlock|complete copy|clearer|damaged/i);
  const details=getManualProcessingErrorDetails(error);assert.equal(details.exception.cause.stack,original.stack);assert.equal(details.pdfjsVersion,PDFJS_VERSION);assert.equal(details.runtime.textReader,'ReadableStream.getReader');
  assert.equal(classifyManualProcessingError(Object.assign(new Error('Invalid PDF structure'),{name:'InvalidPDFException'})).code,'INVALID_PDF');
  assert.equal(classifyManualProcessingError(Object.assign(new Error('Password needed'),{name:'PasswordException'})).code,'PDF_PASSWORD_PROTECTED');
  assert.equal(classifyManualProcessingError(new Error('The API version "1" does not match the Worker version "2".')).code,'PDF_VERSION_MISMATCH');
  assert.equal(classifyManualProcessingError(new Error('Setting up fake worker failed: Failed to fetch dynamically imported module')).code,'PDF_RESOURCES_FAILED');
});
