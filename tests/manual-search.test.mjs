import test from 'node:test';
import assert from 'node:assert/strict';
import {findManuals} from '../public/app/manual-search.mjs';
const docs = [
  {id:'a',title:'Installer guide',brand:'Orisec',models:['CP-25'],category:'intruder',savedAt:10},
  {id:'b',title:'CP-250 user guide',brand:'Orisec',models:['CP-250'],category:'intruder',savedAt:20},
  {id:'c',title:'Fire user guide',brand:'Gent',models:['Nano'],category:'fire',savedAt:30},
];
test('exact model matches rank above similar codes and separator variations match',()=>{
  assert.deepEqual(findManuals(docs,{query:'CP25'}).map(r=>r.id),['a','b']);
  assert.deepEqual(findManuals(docs,{query:'orisec CP-25 installer'}).map(r=>r.id),['a']);
});
test('brand and discipline filters intersect search, and clearing restores records',()=>{
  assert.equal(findManuals(docs,{query:'user',category:'intruder',brand:'Gent'}).length,0);
  assert.deepEqual(findManuals(docs,{query:'user',category:'fire'}).map(r=>r.id),['c']);
  assert.equal(findManuals(docs).length,3);
});
test('recent sorting handles local imports without models, without modifying source',()=>{
  const records=[...docs,{id:'d',title:'My local PDF',brand:'Local import',savedAt:40}];
  assert.deepEqual(findManuals(records,{order:'recent'}).map(r=>r.id),['d','c','b','a']);
  assert.equal(records[0].id,'a');
  assert.equal(findManuals(records,{query:'local'})[0].id,'d');
});
