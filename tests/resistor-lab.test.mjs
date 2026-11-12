import test from 'node:test';
import assert from 'node:assert/strict';
import {parseResistance,formatResistance,combineResistance,resistor,group,demoCircuit,validateCircuit,circuitResistance,changeCircuit,parseStock,findResistorCombinations,instantiateCircuit,validateLabState,defaultLabState} from '../public/app/resistor-lab-engine.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)),`${a} != ${b}`);
test('resistance notation preserves units and distinguishes open, zero and invalid readings',()=>{
 for(const [raw,value]of [['2.2k',2200],['2k2',2200],['4R7',4.7],['1 MΩ',1e6],['0',0],['OL',null],['open',null],['.5 ohm',.5]])assert.equal(parseResistance(raw),value);
 for(const bad of ['', '-1','NaN','Infinity V','12 volts','1m','1e99','1.2.3'])assert.throws(()=>parseResistance(bad));assert.throws(()=>parseResistance('open',{allowOpen:false}));assert.equal(formatResistance(null),'Open circuit');assert.equal(formatResistance(0),'0 Ω');
});
test('series, parallel and mixed examples use actual equivalent resistance',()=>{
 near(circuitResistance(demoCircuit()),1100);near(circuitResistance(demoCircuit('small')),.8);near(circuitResistance(demoCircuit('mixed')),2100);
 near(combineResistance('parallel',[270,470,550]),130.7267278516576);near(combineResistance('series',[1,2,3]),6);
});
test('an open branch and a short branch have distinct circuit effects',()=>{
 assert.equal(combineResistance('series',[10,null]),null);assert.equal(combineResistance('parallel',[10,null]),10);assert.equal(combineResistance('parallel',[10,0]),0);assert.equal(combineResistance('parallel',[null,null]),null);assert.equal(combineResistance('series',[0,0]),0);assert.equal(circuitResistance(group('series')),null);assert.equal(circuitResistance(group('parallel')),null);
});
test('moving a resistor changes topology without changing its value or original circuit',()=>{
 const root=group('series',[resistor(1000,'r1'),group('parallel',[resistor(2200,'r2'),resistor(2200,'r3')],'p')],'root');
 const moved=changeCircuit(root,{kind:'move',id:'r1',parentId:'p'});near(circuitResistance(root),2100);near(circuitResistance(moved),1/(1/1000+1/2200+1/2200));assert.equal(root.children.length,2);assert.equal(moved.children.length,1);
});
test('cycle attempts, duplicate IDs, malformed values and root removal are rejected',()=>{
 const tree=group('series',[group('parallel',[resistor(10,'r')],'p')],'root');assert.throws(()=>changeCircuit(tree,{kind:'move',id:'root',parentId:'p'}));assert.throws(()=>changeCircuit(tree,{kind:'move',id:'p',parentId:'p'}));assert.throws(()=>changeCircuit(tree,{kind:'remove',id:'root'}));assert.throws(()=>changeCircuit(tree,{kind:'add',parentId:'root',node:resistor(20,'r')}));assert.throws(()=>changeCircuit(tree,{kind:'value',id:'r',ohms:-1}));
 const nested=group('series',[group('parallel',[group('series',[],'child')],'parent')],'root');assert.throws(()=>changeCircuit(nested,{kind:'move',id:'parent',parentId:'child'}));
});
test('removing the only child leaves an explicit open group; adding a branch restores it',()=>{const root=group('series',[resistor(10,'r')],'root'),empty=changeCircuit(root,{kind:'remove',id:'r'});assert.equal(circuitResistance(empty),null);assert.equal(circuitResistance(changeCircuit(empty,{kind:'add',parentId:'root',node:resistor(20,'new')})),20);});
test('stock parsing honours physical quantities and finite search bounds',()=>{assert.deepEqual(parseStock('2.2k x 2\n470 x 1'),[2200,2200,470]);for(const raw of ['', '2k x 0','2k x 13','1k x 7\n2k x 6','open','-2k'])assert.throws(()=>parseStock(raw));});
test('search finds the two 2.2k parallel solution and cannot reuse a single stocked resistor',async()=>{
 const options={target:1100,stock:[2200,2200],maxParts:2,yieldControl:async()=>{}};const found=await findResistorCombinations(options);near(found.results[0].ohms,1100);assert.equal(found.results[0].count,2);assert.equal(found.results[0].tree.type,'parallel');near(circuitResistance(instantiateCircuit(found.results[0].tree)),1100);
 const one=await findResistorCombinations({...options,stock:[2200]});assert.equal(one.results.length,1);assert.equal(one.results[0].ohms,2200);
});
test('search includes mixed topologies and respects maximum count',async()=>{
 const found=await findResistorCombinations({target:2100,stock:[1000,2200,2200],maxParts:3,yieldControl:async()=>{}});near(found.results[0].ohms,2100);assert.equal(found.results[0].count,3);
 const limited=await findResistorCombinations({target:2100,stock:[1000,2200,2200],maxParts:2,yieldControl:async()=>{}});assert.ok(limited.results.every(r=>r.count<=2));assert.ok(limited.results.every(r=>r.ohms!==2100));
});
test('search reports genuine bounded progress and can cancel before returning results',async()=>{
 const control=new AbortController(),progress=[];await assert.rejects(()=>findResistorCombinations({target:1000,stock:[1,2,3,4,5,6],maxParts:4,signal:control.signal,onProgress:p=>{progress.push(p);control.abort();},yieldControl:async()=>{}}),{name:'AbortError'});assert.ok(progress[0].completed<=progress[0].total);assert.ok(progress[0].candidates>0);
 await assert.rejects(()=>findResistorCombinations({target:0,stock:[1]}));await assert.rejects(()=>findResistorCombinations({target:1,stock:[1],maxParts:5}));
});
test('saved state round trips open circuits and preserves malformed records for recovery',()=>{
 const state=defaultLabState();state.circuit=group('parallel',[resistor(null),resistor(1000)]);assert.deepEqual(validateLabState(JSON.parse(JSON.stringify(state))),state);assert.equal(circuitResistance(validateLabState(state).circuit),1000);assert.throws(()=>validateLabState({...state,schemaVersion:2}));assert.throws(()=>validateLabState({...state,circuit:resistor(3)}));
});
test('large sandbox structures stop at explicit node and depth limits',()=>{assert.throws(()=>validateCircuit(group('series',Array.from({length:49},()=>resistor(1)))));let deep=resistor(1);for(let i=0;i<10;i++)deep=group('series',[deep]);assert.throws(()=>validateCircuit(deep));});
