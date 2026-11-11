import test from 'node:test';
import assert from 'node:assert/strict';
import {createWiringController,wiringCardMarkup,wiringPageLabel} from '../public/app/wiring-ui.mjs';
const hash='a'.repeat(64),otherHash='b'.repeat(64);
const entry={id:'source-one-p7-loop',recordId:'source-one',title:'Loop connections',brand:'Test brand',category:'fire',targetType:'panel',diagramType:'wiring',models:['TEST-01'],panelIds:['exact-panel'],deviceIds:[],pdfPage:7,printedPage:'5',edition:'Issue 2',image:'wiring/source-one-p7-loop.webp',imageWidth:1400,imageHeight:1900,sourceUrl:'https://example.org/manual.pdf',sourceSha256:hash,section:'Loop wiring',scope:'TEST-01 loop card only',notes:['Original condition'],reviewedOn:'2026-11-02'};
function harness({entries=[entry],file=new Blob(['SYNTHETIC PDF']),actualHash=hash,saved=true,download,hashPDF,getFile}={}){
 const records=new Map(entries.map(e=>[e.recordId,{id:e.recordId,title:'Manual '+e.recordId,url:e.sourceUrl}])),savedRecords=new Map(saved?[[entry.recordId,{id:entry.recordId,fileHash:hash}]]:[]),reads=[],galleries=[],downloads=[],notices=[];
 const modal={open:false,className:'',innerHTML:'',classList:{contains(name){return modal.className.split(' ').includes(name);}}};
 let currentFile=file;
 const controller=createWiringController({entries,records,getSaved:()=>savedRecords,getFile:getFile||(async()=>currentFile),hashPDF:hashPDF||(async()=>actualHash),showModal:(html,cls)=>{modal.open=true;modal.className=cls;modal.innerHTML=html;},readPDF:async(id,options)=>{reads.push({id,options});modal.className='reader';},startDownload:async ids=>{downloads.push(ids);if(download)await download({setFile:value=>{currentFile=value;},savedRecords});},toast:value=>notices.push(value),modal,openGallery:value=>galleries.push(value)});
 return {controller,modal,reads,galleries,downloads,notices,savedRecords};
}
test('wiring picture cards distinguish offline pictures from full PDFs and escape source text',()=>{
 const html=wiringCardMarkup({...entry,title:'<img src=x onerror=alert(1)>',models:['TEST-01" onclick="bad']});
 assert.match(html,/Picture included with offline app/);assert.match(html,/Full PDF not saved on this device/);assert.doesNotMatch(html,/<img src=x|onclick="bad/);assert.match(html,/&lt;img/);assert.equal(wiringPageLabel(entry),'PDF page 7 · printed 5');assert.equal(wiringCardMarkup({...entry,image:'https://example.org/other.png'}),'');
});
test('record and target previews use only curated links and preserve explicit gallery scope',async()=>{
 const h=harness();assert.equal(h.controller.targetPreview({panelId:'similar-panel'}),'');assert.match(h.controller.targetPreview({panelId:'exact-panel'}),/data-value="panel"/);assert.match(h.controller.recordPreview('source-one'),/wiring-inline-preview/);assert.equal(h.controller.recordPreview('unreviewed-manual'),'');
 await h.controller.handle('wiring-target','exact-panel','panel');await h.controller.handle('wiring-record','source-one');assert.deepEqual(h.galleries,[{panelId:'exact-panel',label:'Selected panel'},{recordId:'source-one',label:'Manual source-one'}]);
});
test('matching actual PDF hash opens the recorded page with a return-to-picture action',async()=>{
 const h=harness();h.controller.show(entry.id);await h.controller.handle('wiring-open-source',entry.id);assert.equal(h.reads.length,1);assert.equal(h.reads[0].options.page,7);assert.equal(h.reads[0].options.returnWiringId,entry.id);assert.match(h.reads[0].options.notice,/Exact saved PDF/);assert.equal(typeof h.reads[0].options.canOpen,'function');assert.ok(h.reads[0].options.sourceBlob instanceof Blob);
});
test('forged matching saved metadata cannot bypass actual-byte mismatch; start requires another action',async()=>{
 const h=harness({actualHash:otherHash});h.controller.show(entry.id);await h.controller.handle('wiring-open-source',entry.id);assert.equal(h.reads.length,0);assert.match(h.modal.innerHTML,/differs from the source/);assert.match(h.modal.innerHTML,/wiring-open-start/);assert.doesNotMatch(h.modal.innerHTML,/data-action="wiring-open-source"/);await h.controller.handle('wiring-open-start',entry.id);assert.equal(h.reads[0].options.page,1);assert.match(h.reads[0].options.notice,/page number was not used/);
});
test('download failure keeps the source picture and permits retry without losing context',async()=>{
 const h=harness({saved:false,file:null,download:async()=>{throw Error('Synthetic unavailable network');}});h.controller.show(entry.id);await h.controller.handle('wiring-download-source',entry.id);assert.deepEqual(h.downloads,[[entry.recordId]]);assert.equal(h.reads.length,0);assert.equal(h.modal.className,'wiring-viewer');assert.match(h.modal.innerHTML,/id="wiring-picture"/);assert.match(h.modal.innerHTML,/Synthetic unavailable network/);assert.match(h.modal.innerHTML,/wiring-download-source/);
});
test('download uses existing manual ID and then verifies its saved bytes before opening',async()=>{
 const h=harness({saved:false,file:null,download:async({setFile,savedRecords})=>{setFile(new Blob(['SYNTHETIC saved PDF']));savedRecords.set(entry.recordId,{id:entry.recordId});}});h.controller.show(entry.id);await h.controller.handle('wiring-download-source',entry.id);assert.equal(h.downloads[0][0],entry.recordId);assert.equal(h.reads[0].options.page,7);
});
test('closing a picture during a source check prevents a late reader popup',async()=>{
 let finish;const pending=new Promise(resolve=>{finish=resolve;});const h=harness({hashPDF:()=>pending});h.controller.show(entry.id);const opening=h.controller.handle('wiring-open-source',entry.id);await Promise.resolve();h.controller.leave();h.modal.open=false;finish(hash);await opening;assert.equal(h.reads.length,0);
});
test('opening another picture during a download preserves the newer selection',async()=>{
 let finish;const pending=new Promise(resolve=>{finish=resolve;});const second={...entry,id:'source-two-p1-diagram',recordId:'source-two',image:'wiring/source-two-p1-diagram.webp',title:'Other equipment',pdfPage:1};const h=harness({entries:[entry,second],saved:false,download:()=>pending});h.controller.show(entry.id);const opening=h.controller.handle('wiring-download-source',entry.id);h.controller.show(second.id);finish();await opening;assert.equal(h.reads.length,0);assert.match(h.modal.innerHTML,/Other equipment/);assert.doesNotMatch(h.modal.innerHTML,/Checking the saved/);
});
test('zoom offers original image size without replacing or cropping the source',async()=>{
 const h=harness();h.controller.show(entry.id);await h.controller.handle('wiring-zoom',entry.id,'100');assert.match(h.modal.innerHTML,/style="width:1400px"/);await h.controller.handle('wiring-zoom',entry.id,'150');assert.match(h.modal.innerHTML,/style="width:2100px"/);assert.match(h.modal.innerHTML,/wiring\/source-one-p7-loop.webp/);await h.controller.handle('wiring-zoom',entry.id,'fit');assert.match(h.modal.innerHTML,/style="width:100%"/);
});

test('source reader receives the very Blob that was hashed even if stored bytes change during hashing',async()=>{
 const original=new Blob(['SYNTHETIC original source']),replacement=new Blob(['SYNTHETIC replaced file']);let stored=original,checked=null;
 const h=harness({getFile:async()=>stored,hashPDF:async blob=>{checked=blob;stored=replacement;return hash;}});h.controller.show(entry.id);await h.controller.handle('wiring-open-source',entry.id);assert.equal(checked,original);assert.equal(h.reads[0].options.sourceBlob,original);assert.notEqual(h.reads[0].options.sourceBlob,stored);assert.equal(h.reads[0].options.page,7);
});
