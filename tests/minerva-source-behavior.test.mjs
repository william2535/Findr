import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildMinervaModel,createMinervaState,pressMinervaKey,minervaHint,minervaView,setMinervaText,setMinervaInput} from '../public/app/minerva-mx-engine.mjs';
const model=buildMinervaModel(JSON.parse(fs.readFileSync(new URL('../public/app/data/minerva-mx.json',import.meta.url))));
const key=(s,value)=>pressMinervaKey(model,s,value);
function signedIn(){let s=createMinervaState(model);for(const value of ['ENABLE','F3','0','1'])s=key(s,value);if(s.login?.stage==='id')s=key(s,'F5');for(const value of ['2','4','6','8','1','0','F5'])s=key(s,value);assert.equal(s.accessRank,9);return s;}
function go(s,target){for(let i=0;i<70;i++){const hint=minervaHint(model,s,target);if(hint.arrived)return s;assert.ok(hint.key,'Cannot reach '+target+': '+hint.reason);s=key(s,hint.key);}assert.fail('Navigation did not reach '+target);}
function field(s,id){for(let i=0;i<20;i++){const defs=minervaView(model,s).fieldDefs;if(defs[s.editor.fieldIndex]?.id===id)return s;s=key(s,'F2');}assert.fail('No editable field '+id);}
function digits(s,id,value){s=field(s,id);for(const char of String(value))s=key(s,char);return s;}
function select(s,id,value){s=field(s,id);for(let i=0;i<20;i++){if(s.editor.values[id]===value)return s;s=key(s,model.nodes[s.nodeId].behavior==='walk-test'?'F3':'F4');}assert.fail('Cannot select '+id+'='+value);}

test('documented F5 Print operates on isolated and maintenance reports',()=>{
 for(const target of ['isolated-points','maintenance-request']){let s=go(signedIn(),target);assert.equal(minervaView(model,s).softkeys[4],'Print');s=key(s,'F5');assert.equal(s.printJobs.length,1,target+' must record the simulated print');assert.match(s.notice,/fictional|simulat/i);}
});
test('Untested/Failed can print the active walk-test report',()=>{
 let s=go(signedIn(),'walk-test');s=key(s,'F5');assert.ok(s.walk);s=go(s,'untested');assert.equal(minervaView(model,s).softkeys[4],'Print');s=key(s,'F5');assert.equal(s.printJobs.length,1);assert.ok(s.walk,'printing must preserve the active session');
});
test('View Status Zone F3 and F4 browse the displayed zone',()=>{
 let s=go(signedIn(),'status-zone');s=key(s,'F5');assert.equal(s.editor.values.zone,1);s=key(s,'F4');assert.equal(s.editor.values.zone,2);s=key(s,'F3');assert.equal(s.editor.values.zone,1);
});
test('Set Time/Date accepts a complete four-digit year through the keypad',()=>{
 let s=go(signedIn(),'time-set');s=digits(s,'year',2028);s=key(s,'F5');assert.equal(s.clock.year,2028);
});
test('a foreign panel text target cannot alter the local training panel',()=>{
 let s=go(signedIn(),'text-panel'),original=s.texts.panel;s=digits(s,'panel',99);s=key(s,'F5');assert.equal(s.lastAction.ok,false,'unconfigured network panel must not become the local text editor');s=setMinervaText(model,s,'WRONG PANEL');assert.equal(s.texts.panel,original);assert.deepEqual(s.pendingTexts,[]);
});
test('Loop Counter Details Back preserves the selected loop',()=>{
 let s=go(signedIn(),'loop-counters');s=select(s,'loop','B');s=key(s,'F5');s=key(s,'F2');assert.equal(s.nodeId,'loop-details');s=key(s,'F1');assert.equal(s.nodeId,'loop-counters');assert.equal(s.editor.values.loop,'B');
});
test('Loop Counters refuses an unavailable network panel instead of showing local counts',()=>{
 let s=go(signedIn(),'loop-counters');s=digits(s,'panel',2);s=key(s,'F5');assert.equal(s.lastAction.ok,false);assert.ok(!minervaView(model,s).lines.some(line=>/^Conf\. & Ident:/.test(line)));
});
test('an input fault alone does not establish a missing loop device or left-only detection',()=>{
 let s=go(signedIn(),'loop-counters');s=key(s,'F5');const healthy=minervaView(model,s).lines.find(line=>/^Conf\. & Ident:/.test(line));assert.ok(healthy);s=setMinervaInput(model,s,'A001','Fault');assert.equal(minervaView(model,s).lines.find(line=>/^Conf\. & Ident:/.test(line)),healthy);s=key(s,'F3');assert.equal(s.nodeId,'loop-scan');assert.ok(!minervaView(model,s).lines.some(line=>/^001:\s*[lr]$/.test(line)),'input Fault is not left/right communications evidence');
});
test('walk-test type selection and existing input isolation affect the selected fixture points',()=>{
 let s=go(signedIn(),'isolate-point-loop');s=key(s,'F5');s=key(s,'1');assert.equal(s.isolations.A001.input,true);s=go(s,'walk-test');s=key(s,'F5');assert.ok(!s.walk.selected.includes('A001'),'isolated input is excluded');s=key(s,'F5');assert.equal(s.walk,null);s=select(s,'type','Call Points');s=key(s,'F5');assert.ok(s.walk.selected.length>0);assert.ok(s.walk.selected.every(id=>s.devices.find(d=>d.id===id).kind==='callpoint'));
});
test('RBus and Local I/O point selectors use the category limits recorded on source page 17',()=>{
 for(const [target,ranges] of [['status-point-rbus',{Real:24,Pseudo:8,XBus:96}],['status-point-local',{Real:18,Pseudo:42,IOBus:24,Timer:10,User:10}]]){
  let s=go(signedIn(),target);for(const [category,max] of Object.entries(ranges)){s=select(s,'category',category);const f=minervaView(model,s).fieldDefs.find(f=>f.id==='point');assert.equal(f.min,1);assert.equal(f.max,max,target+' '+category);}
 }
});
