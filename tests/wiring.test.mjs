import test from 'node:test';
import assert from 'node:assert/strict';
import {filterWiringDiagrams,buildWiringIndex,wiringForRecord,wiringForTarget,wiringSourceStatus,wiringAvailability,wiringCoverage} from '../public/app/wiring.mjs';

// Explicitly synthetic: these exercise matching/identity boundaries, not wiring.
const H='a'.repeat(64),OTHER='b'.repeat(64);
const diagrams=[
 {id:'synthetic-exact',recordId:'manual-a',title:'S-Quad base connection example',brand:'Gent',category:'fire',targetType:'device',diagramType:'wiring',models:['S4-720-ST-VO'],deviceIds:['device-a'],panelIds:[],keywords:['base','loop','IN OUT'],section:'Base terminals',edition:'Issue 10',scope:'Synthetic family scope',pdfPage:2,printedPage:'1',sourceSha256:H,image:'wiring/synthetic-exact.webp'},
 {id:'synthetic-other-model',recordId:'manual-b',title:'S-Quad installation',brand:'Gent',category:'fire',targetType:'device',diagramType:'terminal-layout',models:['S4-720-ST'],deviceIds:['device-b'],panelIds:[],keywords:['terminals'],section:'Terminal layout',edition:'Issue 11',scope:'Different synthetic variant',pdfPage:5,printedPage:null,sourceSha256:OTHER,image:'wiring/synthetic-other-model.webp'},
 {id:'synthetic-panel',recordId:'manual-c',title:'Sigma CP sounder circuit',brand:'Kentec',category:'fire',targetType:'panel',diagramType:'connection-example',models:['K11080M2'],deviceIds:[],panelIds:['panel-c'],keywords:['sounders'],section:'Sounder circuits',edition:'Issue 25',scope:'Synthetic K-series scope',pdfPage:12,printedPage:'12',sourceSha256:H,image:'wiring/synthetic-panel.webp'},
 {id:'synthetic-access',recordId:'manual-d',title:'CP25 keypad connections',brand:'Example Access',category:'access-control',targetType:'accessory',diagramType:'wiring',models:['CP-25'],deviceIds:[],panelIds:[],keywords:['relay','lock'],section:'Connections',edition:'Edition not stated',scope:'Synthetic access scope',pdfPage:1,printedPage:null,sourceSha256:H,image:'wiring/synthetic-access.webp'},
 {id:'synthetic-second-page',recordId:'manual-a',title:'Remote LED example',brand:'Gent',category:'fire',targetType:'device',diagramType:'connection-example',models:['S4-720-ST-VO'],deviceIds:['device-a'],panelIds:[],keywords:['remote','LED'],section:'LED output',edition:'Issue 10',scope:'Synthetic family scope',pdfPage:3,printedPage:'2',sourceSha256:H,image:'wiring/synthetic-second-page.webp'},
];

test('wiring search retains full model suffixes and supports separator variations without claiming an identity match',()=>{
 assert.deepEqual(filterWiringDiagrams(diagrams,{query:'S4 720 ST VO'}).map(entry=>entry.id).sort(),['synthetic-exact','synthetic-second-page']);
 assert.equal(filterWiringDiagrams(diagrams,{query:'S4-720-ST'})[0].id,'synthetic-other-model');
 assert.equal(filterWiringDiagrams(diagrams,{query:'CP25'})[0].id,'synthetic-access');
 assert.deepEqual(filterWiringDiagrams(diagrams,{query:'Gent remote LED'}).map(entry=>entry.id),['synthetic-second-page']);
 assert.equal(filterWiringDiagrams(diagrams,{query:'Issue 25 PDF page 12'})[0].recordId,'manual-c');
});

test('manual, target, discipline and saved filters intersect; an empty requested scope never returns the whole collection',()=>{
 assert.deepEqual(filterWiringDiagrams(diagrams,{brand:'Gent',category:'fire',targetType:'device',diagramType:'wiring'}).map(entry=>entry.id),['synthetic-exact']);
 assert.equal(filterWiringDiagrams(diagrams,{brand:'Gent',category:'access-control'}).length,0);
 assert.deepEqual(filterWiringDiagrams(diagrams,{recordIds:new Set(['manual-a']),order:'page'}).map(entry=>entry.pdfPage),[2,3]);
 assert.deepEqual(filterWiringDiagrams(diagrams,{savedRecordIds:new Map([['manual-c',{}]])}).map(entry=>entry.id),['synthetic-panel']);
 assert.equal(filterWiringDiagrams(diagrams,{savedRecordIds:[]}).length,0);
 assert.equal(filterWiringDiagrams(diagrams,{recordIds:[]}).length,0);
 assert.equal(filterWiringDiagrams(diagrams,{recordId:'manual-a',panelId:'panel-c'}).length,0);
});

test('recent wiring order uses the parent saved PDF date and keeps its pages together',()=>{
 const saved=new Map([['manual-a',{savedAt:10}],['manual-c',{savedAt:30}],['unrelated',{savedAt:50}]]);
 assert.deepEqual(filterWiringDiagrams(diagrams,{order:'recent',savedRecordIds:saved}).map(entry=>entry.id),['synthetic-panel','synthetic-second-page','synthetic-exact']);
 assert.deepEqual([...saved.values()].map(record=>record.savedAt),[10,30,50]);
});

test('model detail links require an explicit reviewed ID, never matching a brand or similar name',()=>{
 const index=buildWiringIndex(diagrams);
 assert.deepEqual(wiringForTarget(index,{deviceId:'device-a'}).map(entry=>entry.id),['synthetic-exact','synthetic-second-page']);
 assert.equal(wiringForTarget(index,{deviceId:'S4-720-ST-VO'}).length,0);
 assert.equal(wiringForTarget(index,{panelId:'Gent'}).length,0);
 assert.equal(wiringForTarget(index).length,0);
 assert.equal(wiringForTarget(index,{panelId:'panel-c',deviceId:'device-a'}).length,0);
 assert.deepEqual(wiringForRecord(index,'manual-a').map(entry=>entry.pdfPage),[2,3]);
 assert.equal(wiringForRecord(index,'unknown').length,0);
 assert.throws(()=>buildWiringIndex([...diagrams,diagrams[0]]),/Duplicate wiring entry/);
});

test('filtering and index lookups leave source arrays unchanged and distinguish pages within one manual',()=>{
 const original=structuredClone(diagrams),index=buildWiringIndex(diagrams),found=wiringForRecord(index,'manual-a');
 found.pop();filterWiringDiagrams(diagrams,{order:'brand'});filterWiringDiagrams(diagrams,{order:'page'});
 assert.deepEqual(diagrams,original);assert.equal(wiringForRecord(index,'manual-a').length,2);
 assert.deepEqual(wiringCoverage(diagrams),{diagramCount:5,manualCount:4,panelCount:1,deviceCount:2,brandCount:3,byCategory:{fire:4,'access-control':1}});
});

test('only an exact actual saved-PDF hash enables the recorded source-page jump',()=>{
 const entry=diagrams[0];
 assert.equal(wiringSourceStatus(entry,H).canJump,true);assert.equal(wiringSourceStatus(entry,H.toUpperCase()).pdfPage,2);
 const mismatch=wiringSourceStatus(entry,OTHER);assert.equal(mismatch.status,'mismatch');assert.equal(mismatch.canJump,false);assert.equal(mismatch.pdfPage,null);
 for(const unverified of [undefined,null,'','manual-a',{fileHash:H},'a'.repeat(63)]){const result=wiringSourceStatus(entry,unverified);assert.equal(result.status,'unknown');assert.equal(result.canJump,false);}
 assert.equal(wiringSourceStatus({...entry,sourceSha256:null},H).canJump,false);
});

test('an exact edition still needs a valid source page within the saved PDF',()=>{
 assert.equal(wiringSourceStatus(diagrams[0],H,{pageCount:1}).status,'page-out-of-range');
 assert.equal(wiringSourceStatus(diagrams[0],H,{pageCount:2}).canJump,true);
 for(const pdfPage of [0,-1,1.5,'2'])assert.equal(wiringSourceStatus({...diagrams[0],pdfPage},H).canJump,false);
 assert.equal(wiringSourceStatus(diagrams[0],H,{pageCount:NaN}).canJump,false);
});

test('bundled pictures never mark the full manual as saved or downloadable without its separate state',()=>{
 const entry=diagrams[0],available=wiringAvailability(entry,{downloadableRecordIds:['manual-a']});
 assert.equal(available.picture.offlineIncluded,true);assert.equal(available.pdf.status,'available');assert.equal(available.pdf.saved,false);
 assert.equal(wiringAvailability(entry,{savedRecordIds:new Map([['manual-a',{}]])}).pdf.status,'saved');
 assert.equal(wiringAvailability(entry).pdf.status,'unavailable');
 assert.equal(wiringAvailability({...entry,image:'https://example.test/picture.webp'}).picture.available,false);
});
