import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLoopListText,processLoopPhotos,prepareLoopPhoto,loopPhotoWorkingSize,createLoopPhotoOCR} from '../public/app/loop-photo-import.mjs';

const text='SYNTHETIC TEST ONLY — no customer data\nPanel 2 Loop 2\nAdd State S/N Type Ver Map\n001 OK DFD310 16PAI 10 1\n042 OK DFD311 16PAI- 10 1\n007 OK 001234 16PAI 10 2\nLogged 6 Unallocated 0 Missing 0\n1 of 6';
const image=()=>new File(['SYNTHETIC IMAGE BYTES — decoding injected for unit test'],'synthetic.png',{type:'image/png'});
const prepareImage=async()=>({image:new ArrayBuffer(4),workingImage:{originalWidth:1000,originalHeight:700,width:1000,height:700,resized:false,method:'Original image unchanged.'}});
const readiness=async()=>({supported:true,ready:true});
const goodOCR=()=>({initialize:async()=>{},recognize:async()=>({text,confidence:91}),terminate:()=>{}});

test('documented Add/State/S/N/Type/Ver/Map columns retain addresses and tied Map nodes, never serials or counters',()=>{
  const parsed=parseLoopListText(text,{sourcePhotoId:'photo-a',confidence:81});
  assert.deepEqual(parsed.suggestions.map(row=>[row.address,row.map]),[['001','1'],['042','1'],['007','2']]);
  assert.ok(parsed.suggestions.every(row=>row.reviewRequired===true&&row.engineerConfirmed===undefined&&row.sourcePhotoId==='photo-a'));
  assert.equal(parsed.suggestions[2].sourceColumns[2].value,'001234');
  assert.equal(parsed.suggestions[0].locationText,'');
  assert.ok(parsed.unparsedLines.some(row=>row.rawLine==='1 of 6'));
  assert.ok(parsed.unparsedLines.some(row=>row.rawLine.includes('Logged 6')));
  assert.match(parsed.warnings.join(' '),/do not establish device order/);
  assert.equal(parseLoopListText('Add State S/N Type Ver Map\n001 Missing DFD310 16PAI 10 1').suggestions.length,1);
});

test('column order comes from this photo header, not assumed numeric positions',()=>{
  const parsed=parseLoopListText('Map | Type | Address | Location\n002 | Optical | 042 | First floor lobby',{sourcePhotoId:'p'});
  assert.equal(parsed.suggestions[0].address,'042');assert.equal(parsed.suggestions[0].map,'002');
  assert.equal(parsed.suggestions[0].locationText,'First floor lobby');
  assert.equal(parseLoopListText('001 OK DFD310 16PAI 10 1').suggestions.length,0);
  assert.equal(parseLoopListText('Serial Type Map\n001234 16PAI 1').suggestions.length,0);
});

test('unknown column labels and missing columns remain unparsed rather than shifting values',()=>{
  assert.equal(parseLoopListText('Address Unknown Map\n1 234 2').suggestions.length,0);
  const changed=parseLoopListText('Address Map Device\n1 2 Door\nAddress Voltage Map\n3 24 2');
  assert.equal(changed.suggestions.length,1);assert.ok(changed.unparsedLines.some(line=>line.rawLine==='3 24 2'));
  const missing=parseLoopListText('Add State S/N Type Ver Map\n001 OK DFD310 16PAI 1');
  assert.equal(missing.suggestions.length,0);
});

test('ambiguous OCR digits stay blank for review; zero and leading zeroes remain distinct raw values',()=>{
  const parsed=parseLoopListText('Address\tMap\tLocation\nOO1\t02\tHall\n002\t\tCorridor\n003\t0\tRoom',{confidence:60});
  assert.equal(parsed.suggestions[0].address,'');assert.equal(parsed.suggestions[0].rawAddress,'OO1');
  assert.equal(parsed.suggestions[0].map,'02');assert.ok(parsed.suggestions[0].issues.length>=2);
  assert.equal(parsed.suggestions[1].map,'');assert.equal(parsed.suggestions[2].map,'0');
});

test('overlapping photos retain separate provenance and conflicts for explicit UI review',async()=>{
  const saved=[],files=[image(),image()];let readers=0,terminated=0;
  const result=await processLoopPhotos(files,{readiness,prepareImage,photoIds:['a','b'],createOCR:()=>{readers++;return {...goodOCR(),terminate:()=>terminated++};},onPhoto:async(row,original)=>{saved.push({row,original});}});
  assert.equal(readers,1);assert.equal(terminated,1);assert.equal(saved.length,2);
  assert.equal(saved[0].original,files[0]);assert.equal(saved[1].original,files[1]);
  assert.equal(result[0].suggestions[0].sourcePhotoId,'a');assert.equal(result[1].suggestions[0].sourcePhotoId,'b');
  assert.equal(result[0].suggestions.length,3);assert.equal(result[1].suggestions.length,3);
  assert.notEqual(result[0].suggestions[0].id,result[1].suggestions[0].id);
});

test('safe retry preserves supplied photo/row identities and never approves OCR rows',async()=>{
  const options={readiness,prepareImage,photoIds:['existing'],createOCR:goodOCR};
  const first=(await processLoopPhotos([image()],options))[0],second=(await processLoopPhotos([image()],options))[0];
  assert.equal(first.photo.id,second.photo.id);assert.deepEqual(first.suggestions,second.suggestions);
  assert.ok(second.suggestions.every(row=>row.reviewRequired));
});

test('missing resources keep original photo with appropriate recovery and never start OCR',async()=>{
  const original=image(),saved=[];let started=false;
  const results=await processLoopPhotos([original],{prepareImage,readiness:async()=>({supported:true,ready:false,message:'Prepare English OCR.'}),createOCR:()=>{started=true;return goodOCR();},onPhoto:async(result,blob)=>saved.push({result,blob})});
  assert.equal(started,false);assert.equal(results[0].error.code,'LOOP_PHOTO_RESOURCES_MISSING');
  assert.equal(results[0].error.action,'prepare-ocr');assert.equal(saved[0].blob,original);
  assert.deepEqual(results[0].suggestions,[]);
});

test('unreadable and failed OCR photos remain reviewable and do not become accepted inventory',async()=>{
  const blank=await processLoopPhotos([image()],{readiness,prepareImage,createOCR:()=>({...goodOCR(),recognize:async()=>({text:'',confidence:0})})});
  assert.equal(blank[0].error.code,'LOOP_PHOTO_UNREADABLE');assert.equal(blank[0].error.action,'manual-entry');
  const failure=await processLoopPhotos([image()],{readiness,prepareImage,createOCR:()=>({...goodOCR(),recognize:async()=>{throw Object.assign(new Error('OCR engine failed'),{code:'LOOP_PHOTO_OCR_FAILED'});}})});
  assert.equal(failure[0].error.code,'LOOP_PHOTO_OCR_FAILED');assert.equal(failure[0].photo.name,'synthetic.png');
});

test('runtime and readiness-check failures are labelled at the actual stage, not as damaged images',async()=>{
  const brokenRuntime=await processLoopPhotos([image()],{readiness,prepareImage:async()=>{throw new TypeError('Canvas API unavailable');}});
  assert.equal(brokenRuntime[0].error.code,'LOOP_PHOTO_RUNTIME_FAILED');assert.equal(brokenRuntime[0].error.stage,'decoding');
  assert.match(brokenRuntime[0].error.message,/does not mean.*damaged/);
  const brokenCache=await processLoopPhotos([image()],{prepareImage,readiness:async()=>{throw new DOMException('Storage access failed','SecurityError');}});
  assert.equal(brokenCache[0].error.code,'LOOP_PHOTO_RESOURCES_CHECK_FAILED');assert.equal(brokenCache[0].error.action,'prepare-ocr');
});

test('cancellation terminates real worker owner and saves in-flight original with cancelled status',async()=>{
  const control=new AbortController(),saved=[],progress=[];let terminated=0,recognizing;
  const started=new Promise(resolve=>recognizing=resolve);
  const pending=processLoopPhotos([image(),image()],{signal:control.signal,readiness,prepareImage,createOCR:()=>({initialize:async()=>{},recognize:()=>{recognizing();return new Promise(()=>{});},terminate:()=>terminated++}),onPhoto:async(result,blob)=>saved.push({result,blob}),onProgress:event=>progress.push(event)});
  await started;control.abort();
  await assert.rejects(pending,error=>error.name==='AbortError'&&error.code==='LOOP_PHOTO_CANCELLED'&&error.completedResults.length===1);
  assert.ok(terminated>=1);assert.equal(saved.length,1);assert.equal(saved[0].result.error.code,'LOOP_PHOTO_CANCELLED');
  assert.equal(progress.at(-1).phase,'finished');assert.equal(saved[0].blob.name,'synthetic.png');
});

test('storage failure stops later photos and exposes unsaved result without claiming OCR failed',async()=>{
  let calls=0;
  await assert.rejects(processLoopPhotos([image(),image()],{readiness,prepareImage,createOCR:goodOCR,onPhoto:async()=>{calls++;throw new DOMException('Disk full','QuotaExceededError');}}),error=>{
    assert.equal(error.code,'LOOP_PHOTO_STORAGE_FAILED');assert.equal(error.action,'retry-save');
    assert.equal(error.completedResults.length,0);assert.equal(error.unsavedResult.suggestions.length,3);return true;
  });
  assert.equal(calls,1);
});

test('pending original is durably saved before decode and remains an independent resumable snapshot',async()=>{
  const order=[],snapshots=[];
  const results=await processLoopPhotos([image()],{readiness,photoIds:['pending-photo'],
    onPhotoStart:async(result,blob)=>{assert.equal(blob.name,'synthetic.png');order.push('saved-pending');snapshots.push(result);},
    prepareImage:async()=>{order.push('decode');assert.equal(snapshots[0].state,'pending');return prepareImage();},
    createOCR:()=>{order.push('worker');return goodOCR();},
    onPhoto:async()=>order.push('saved-final')});
  assert.deepEqual(order,['saved-pending','decode','worker','saved-final']);
  assert.equal(snapshots[0].state,'pending');assert.equal(snapshots[0].suggestions.length,0);
  assert.equal(results[0].state,'complete');assert.equal(results[0].photo.id,'pending-photo');
});

test('failure saving pending original stops before decode or worker creation',async()=>{
  let touched=false;
  await assert.rejects(processLoopPhotos([image()],{readiness,
    onPhotoStart:async()=>{throw new DOMException('Disk full','QuotaExceededError');},
    prepareImage:async()=>{touched=true;return prepareImage();},createOCR:()=>{touched=true;return goodOCR();},
    onPhoto:async()=>{touched=true;}}),error=>{
      assert.equal(error.code,'LOOP_PHOTO_STORAGE_FAILED');assert.equal(error.unsavedResult.state,'pending');
      assert.equal(error.completedResults.length,0);assert.match(error.message,/Reading has not started/);return true;
    });
  assert.equal(touched,false);
});

test('cancelling during pending original save completes that transaction and saves cancelled status without OCR',async()=>{
  const control=new AbortController(),states=[];let decoded=false;
  await assert.rejects(processLoopPhotos([image()],{signal:control.signal,readiness,
    onPhotoStart:async result=>{states.push(result.state);control.abort();},
    prepareImage:async()=>{decoded=true;return prepareImage();},
    onPhoto:async result=>states.push(result.state)}),{code:'LOOP_PHOTO_CANCELLED'});
  assert.deepEqual(states,['pending','cancelled']);assert.equal(decoded,false);
});

test('pre-cancelled import does not decode, save or start a worker',async()=>{
  const control=new AbortController();control.abort();let touched=false;
  await assert.rejects(processLoopPhotos([image()],{signal:control.signal,prepareImage:async()=>{touched=true;},onPhoto:async()=>{touched=true;}}),{name:'AbortError',code:'LOOP_PHOTO_CANCELLED'});
  assert.equal(touched,false);
});

test('photo sizing bounds working pixels and rejects giant known image headers before decoding',async()=>{
  assert.deepEqual([loopPhotoWorkingSize(4000,3000).width,loopPhotoWorkingSize(4000,3000).height],[2400,1800]);
  assert.equal(loopPhotoWorkingSize(700,1000).resized,false);
  assert.throws(()=>loopPhotoWorkingSize(100000,100000),{code:'LOOP_PHOTO_TOO_LARGE'});
  const png=new Uint8Array(24);const view=new DataView(png.buffer);view.setUint32(0,0x89504e47);view.setUint32(4,0x0d0a1a0a);view.setUint32(16,100000);view.setUint32(20,100000);
  await assert.rejects(prepareLoopPhoto(new Blob([png],{type:'image/png'})),{code:'LOOP_PHOTO_TOO_LARGE'});
  await assert.rejects(prepareLoopPhoto(new Blob([],{type:'image/png'})),{code:'LOOP_PHOTO_UNREADABLE'});
  await assert.rejects(prepareLoopPhoto(new File(['<svg/>'],'external.svg',{type:'image/svg+xml'})),{code:'LOOP_PHOTO_UNSUPPORTED_FORMAT'});
});

test('OCR RPC uses existing worker, forwards actual progress and terminates a pending request',async()=>{
  let instance;
  class FakeWorker {constructor(url,options){instance=this;this.url=url;this.options=options;}postMessage(data){this.last=data;}terminate(){this.terminated=true;}}
  const updates=[],reader=createLoopPhotoOCR({WorkerImpl:FakeWorker,onProgress:event=>updates.push(event)});
  assert.match(instance.url.pathname,/manual-analysis-ocr.worker.mjs$/);assert.equal(instance.options.type,'module');
  const initialized=reader.initialize();instance.onmessage({data:{type:'progress',value:{status:'recognizing text',progress:0.3}}});
  instance.onmessage({data:{id:instance.last.id,result:{ready:true}}});await initialized;
  assert.deepEqual(updates,[{status:'recognizing text',progress:0.3}]);
  const recognition=reader.recognize(new ArrayBuffer(4));reader.terminate();
  await assert.rejects(recognition,{name:'AbortError',code:'LOOP_PHOTO_CANCELLED'});assert.equal(instance.terminated,true);
});

test('OCR RPC bounded timeout has a distinct retryable error',async()=>{
  let terminated=false;
  class SilentWorker {postMessage(){}terminate(){terminated=true;}}
  const reader=createLoopPhotoOCR({WorkerImpl:SilentWorker,timeoutMs:5});
  await assert.rejects(reader.initialize(),{code:'LOOP_PHOTO_OCR_TIMEOUT'});assert.equal(terminated,true);
});
