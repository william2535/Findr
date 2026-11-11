import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {IMPORT_FIELDS,parseSchedule,suggestMapping,mapSchedule,lookupSchedule,MAX_IMPORT_ROWS} from '../public/app/panel-import.mjs';
const fixture=name=>readFileSync(new URL(`./fixtures/panel-import/${name}`,import.meta.url),'utf8');
const csv=fixture('synthetic-addressable.csv');
const parsed=parseSchedule(csv),mapping=suggestMapping(parsed.headers),rows=mapSchedule(parsed,mapping);

test('labelled synthetic CSV preserves leading zeros, exact suffixes, blank fields and quoted location text',()=>{
 assert.equal(parsed.format,'CSV');assert.equal(rows.length,7);
 assert.equal(rows[0].loop,'01');assert.equal(rows[0].address,'037');assert.equal(rows[0].zone,'003');
 assert.equal(rows[0].partNumber,'S4-720-ST-VO');assert.equal(rows[0].location,'Ground floor, reception');
 assert.equal(rows[0].subAddress,'');assert.equal(rows[0].exportDate,'2026-10-31');
 assert.equal(rows[6].location,'Store "east"\nBy loading door');
 assert.deepEqual(rows[0].rawValues,parsed.rows[0]);assert.notEqual(rows[0].rawValues,parsed.rows[0]);
 assert.deepEqual(Object.keys(mapping),IMPORT_FIELDS.map(field=>field.key));
});
test('BOM and quoted tab-delimited schedule parse to the same original cell values',()=>{
 const tsv=parseSchedule('\uFEFF'+fixture('synthetic-addressable.tsv'));
 assert.equal(tsv.format,'TSV');assert.equal(tsv.delimiter,'\t');
 assert.deepEqual(mapSchedule(tsv,suggestMapping(tsv.headers)),rows);
});
test('engineer can map unfamiliar headers without changing cells or inferring exact models',()=>{
 const draft=parseSchedule('Circuit label,Point label,Where,What,SKU\n001,0037,Landing,optical detector,\n');
 const suggested=suggestMapping(draft.headers);assert.equal(suggested.loop,-1);assert.equal(suggested.address,-1);
 const mapped=mapSchedule(draft,{loop:0,address:1,location:2,type:3,partNumber:4});
 assert.equal(mapped[0].address,'0037');assert.equal(mapped[0].model,'');assert.equal(mapped[0].partNumber,'');
 assert.throws(()=>mapSchedule(draft,{loop:0,address:0}),/only one field/);
 assert.throws(()=>mapSchedule(draft,{}),/Map both/);
 assert.throws(()=>mapSchedule(draft,{loop:0,address:10}),/valid column/);
});
test('malformed and unusable drafts are rejected atomically without mutating previous usable rows',()=>{
 const before=structuredClone(rows);
 for(const source of [fixture('synthetic-malformed.csv'),'Loop,Address\n1,37,extra','Loop,Address\n1,"37"junk','Loop,Address\n1,3"7','Loop,Loop\n1,37','Loop,\n1,37','Loop,Address\n','\u0000binary'])assert.throws(()=>parseSchedule(source));
 assert.throws(()=>mapSchedule(parseSchedule('Loop,Address\n1,37\n2,\n'),{loop:0,address:1}),/Row 3 is missing/);
 assert.deepEqual(rows,before);
 assert.equal(mapSchedule(parseSchedule(csv),mapping).length,rows.length,'re-parsing produces a replacement set, not appended duplicates');
});
test('import limits reject oversized schedules before building an unlimited record set',()=>{
 assert.throws(()=>parseSchedule('Loop,Address\n'+'1,37\n'.repeat(MAX_IMPORT_ROWS+1)),/10,000/);
 assert.throws(()=>parseSchedule('Loop,Address\n1,'+'x'.repeat(5*1024*1024)),/5 MiB/);
});
test('two panels and loops can reuse address 37; selected panel and loop narrow without choosing a duplicate',()=>{
 assert.equal(lookupSchedule(rows,{query:'address 37'}).rows.length,6);
 const a=lookupSchedule(rows,{panel:'A',query:'L1 D37'});
 assert.equal(a.rows.length,3);assert.equal(a.kind,'address');assert.equal(a.ambiguous,true);
 assert.deepEqual(a.rows.map(row=>[row.node,row.subAddress]),[['01',''],['02','01'],['02','02']]);
 const b=lookupSchedule(rows,{panel:'B',query:'L1 D37'});assert.equal(b.rows.length,1);assert.equal(b.rows[0].location,'Annexe entrance');
 const loop2=lookupSchedule(rows,{panel:'A',loop:'2',address:'37'});assert.equal(loop2.rows.length,1);assert.equal(loop2.rows[0].type,'optical detector');
});
test('network nodes and distinct sub-addresses remain explicit candidates',()=>{
 const two=lookupSchedule(rows,{panel:'A',query:'node 2 loop 1 address 37'});assert.equal(two.rows.length,2);assert.equal(two.ambiguous,true);
 const one=lookupSchedule(rows,{panel:'A',query:'N2 L1 D37 sub-address 2'});assert.equal(one.rows.length,1);assert.equal(one.rows[0].location,'Plant room input 2');
 assert.equal(lookupSchedule(rows,{panel:'A',node:'01',loop:'01',address:'0037'}).rows.length,1);
 assert.equal(lookupSchedule(rows,{panel:'A',query:'N2 L1 D37/02'}).rows[0].subAddress,'02');
 assert.equal(lookupSchedule(rows,{panel:'A',query:'N2 L1 D37.01'}).rows[0].subAddress,'01');
 assert.equal(lookupSchedule(rows,{panel:'A',query:'N1 L1 D37.02'}).rows.length,0,'a requested channel cannot match a channel-less row');
 assert.throws(()=>lookupSchedule(rows,{panel:'A',loop:'2',query:'L1 D37'}),/conflicts/);
 assert.throws(()=>lookupSchedule(rows,{query:'loop 1 loop 2'}),/more than one loop/);
});
test('loop lookup is a scoped source-order list, not a cable break or topology assertion',()=>{
 const result=lookupSchedule(rows,{panel:'A',query:'Loop 1 open circuit fault'});
 assert.equal(result.kind,'loop');assert.equal(result.rows.length,4);
 assert.deepEqual(result.rows.map(row=>row.id),['2','6','7','8']);
 assert.equal(result.ambiguous,false);assert.equal(result.parsed.text,'');
 assert.equal(Object.hasOwn(result,'topology'),false);assert.equal(Object.hasOwn(result,'breakLocation'),false);
 assert.equal(lookupSchedule(rows,{panel:'A',query:'zone 3'}).rows.length,2);
});
test('programmed-text and reported-fault searches stay distinct',()=>{
 assert.equal(lookupSchedule(rows,{panel:'A',query:'loading door'}).rows[0].address,'038');
 assert.equal(lookupSchedule(rows,{panel:'A',query:'L1 D37 missing device',node:'1'}).rows[0].partNumber,'S4-720-ST-VO');
 assert.equal(lookupSchedule(rows,{panel:'A',query:'L1 D37 missing device',text:'plant room'}).rows.length,2);
});
