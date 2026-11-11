import test from 'node:test';
import assert from 'node:assert/strict';
import {createImportedFaultSession,importedContextReport} from '../public/app/import-fault-context.mjs';
const schedule={id:'import-one',site:'Synthetic test site',panel:'East panel',filename:'synthetic.csv',fileHash:'abc',importedAt:123456789,exportDate:'2026-10-01'};
const row={id:'2',panel:'02',node:'01',loop:'01',address:'037',subAddress:'02',zone:'003',location:'Floor 1, riser',type:'Optical',manufacturer:'Gent',model:'S-Quad',partNumber:'S4-720-ST-VO',rawValues:['01','037','S4-720-ST-VO']};
test('imported context preserves full codes and scope but never answers or confirms model',()=>{
 const s=createImportedFaultSession({schedule,row,reportedFault:'L1 D37 missing',id:'session-one'});
 assert.deepEqual(s.answers,{});assert.equal(s.confirmed,false);assert.equal(s.group,undefined);
 assert.equal(s.importedContext.address,'037');assert.equal(s.importedContext.partNumber,'S4-720-ST-VO');assert.equal(s.message,'L1 D37 missing');assert.equal(s.site,schedule.site);
 s.importedContext.rawValues.push('changed');assert.equal(row.rawValues.length,3);
});
test('saved report includes snapshot scope, provenance and separate reported fault',()=>{
 const s=createImportedFaultSession({schedule,row,reportedFault:'Loop 1 fault',id:'session'});
 const text=importedContextReport(JSON.parse(JSON.stringify(s.importedContext)));
 for(const value of ['East panel','Network node: 01','Loop: 01','Address: 037','Sub-address: 02','Zone: 003','Floor 1, riser','S4-720-ST-VO','2026-10-01','synthetic.csv','Loop 1 fault'])assert.ok(text.includes(value),value);
 assert.match(text,/No check answers were inferred/);assert.equal(importedContextReport(null),'');
});
