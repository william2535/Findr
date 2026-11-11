import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareWiringPacks,searchWiringPacks,wiringPackAvailability,createWiringPackController} from '../public/app/wiring-packs.mjs';
const json=name=>JSON.parse(readFileSync(new URL('../public/app/data/'+name+'.json',import.meta.url),'utf8'));
const data=json('wiring-packs'),entries=json('wiring-diagrams').entries,index=prepareWiringPacks(data,entries);

test('branded wiring families cover every reviewed picture exactly once without changing source entries',()=>{
 const original=structuredClone(entries),all=index.packs.flatMap(p=>p.entryIds);
 assert.equal(index.brands.length,28);assert.equal(index.packs.length,79);assert.equal(all.length,177);assert.equal(new Set(all).size,entries.length);assert.deepEqual([...all].sort(),entries.map(e=>e.id).sort());
 for(const pack of index.packs){assert.ok(pack.note);assert.ok(pack.entries.every(e=>e.brand===pack.brand.name));assert.deepEqual(pack.recordIds,[...new Set(pack.entries.map(e=>e.recordId))]);}
 assert.deepEqual(entries,original);
});

test('family memberships retain distinct panel variants and split the shared Gent source by exact page',()=>{
 const sigma=index.byPack.get('kentec-sigma-cp');assert.equal(sigma.entries.length,3);assert.ok(sigma.entries.every(e=>e.recordId==='kentec-0d82d93522c3'));
 const compact=index.byPack.get('gent-vigilon-compact'),large=index.byPack.get('gent-vigilon-4-6-loop');assert.ok(compact.entries.every(e=>e.models.includes('Vigilon Compact')));assert.ok(large.entries.every(e=>e.models.includes('Vigilon 4/6-loop')));assert.ok(!compact.entryIds.some(id=>large.entryIds.includes(id)));
 const shared=index.byPack.get('protec-3000plus-6000plus-bases');assert.equal(shared.sharedFamilyReference,true);assert.match(shared.note,/not interchangeable/);
 assert.match(index.byPack.get('hochiki-chq-ari-clr').note,/another CHQ-ARI variant/);
 assert.notEqual(index.byPack.get('tynetec-advent-xt').id,index.byPack.get('tynetec-advent-xt2').id);
});

test('brand and family lookup searches model codes while keeping brand scope explicit',()=>{
 assert.ok(searchWiringPacks(index,'Sigma CP').some(p=>p.id==='kentec-sigma-cp'));
 assert.deepEqual(searchWiringPacks(index,'Sigma CP','gent'),[]);
 assert.deepEqual(searchWiringPacks(index,'KX15DTAM').map(p=>p.id),['pyronix-kx15dtam']);
 assert.ok(searchWiringPacks(index,'CA408').some(p=>p.id==='c-tec-cast-devices'));
 assert.equal(searchWiringPacks(index,'').length,index.packs.length);
});

test('pack validation rejects unknown, duplicate, missing and wrong-brand picture membership',()=>{
 const altered=()=>structuredClone(data);
 let bad=altered();bad.packs[0].entryIds.push(bad.packs[0].entryIds[0]);assert.throws(()=>prepareWiringPacks(bad,entries),/membership/);
 bad=altered();bad.packs[0].entryIds[0]='unknown';assert.throws(()=>prepareWiringPacks(bad,entries),/membership/);
 bad=altered();bad.packs.shift();assert.throws(()=>prepareWiringPacks(bad,entries),/no family/);
 bad=altered();bad.packs[0].brandId='gent';assert.throws(()=>prepareWiringPacks(bad,entries),/membership/);
 bad=altered();bad.brands[0].colour='red;display:none';assert.throws(()=>prepareWiringPacks(bad,entries),/Invalid wiring brand/);
});

test('all brand accent labels meet text contrast against their dark label ink',()=>{
 const luminance=hex=>{const c=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
 for(const brand of data.brands){const light=luminance(brand.colour),dark=luminance('#151515');assert.ok((light+.05)/(dark+.05)>=4.5,brand.name+' label contrast');}
});

test('offline pictures never count as saved PDFs and bulk download excludes saved and source-only records',()=>{
 const pack={entries:[{recordId:'a'},{recordId:'a'},{recordId:'b'},{recordId:'c'}]},records=new Map([['a',{url:'https://example.test/a.pdf'}],['b',{url:null}],['c',{url:'https://example.test/c.pdf'}]]);
 assert.deepEqual(wiringPackAvailability(pack,new Map([['a',{}]]),records),{manualCount:3,savedCount:1,missingIds:['c'],sourceOnlyCount:1});
 assert.equal(wiringPackAvailability(index.byPack.get('kentec-sigma-cp'),new Map(),new Map()).savedCount,0);
});

test('pack download failure keeps the family and pictures available with an explicit retry message',async()=>{
 const listeners={},previous=globalThis.document;globalThis.document={addEventListener:(type,fn)=>listeners[type]=fn};
 try{
  const pack=index.byPack.get('kentec-sigma-cp'),records=new Map(pack.recordIds.map(id=>[id,{url:'https://example.test/manual.pdf'}]));
  const host={isConnected:true,innerHTML:'',contains:()=>true};
  const controller=createWiringPackController({data,entries,getSaved:()=>new Map(),records,cards:items=>items.map(e=>'<article>'+e.id+'</article>').join(''),onDownload:async()=>{throw Error('SYNTHETIC storage rejection <unsafe>');},onShowManuals:()=>{}});
  controller.mount(host,'kentec',pack.id);assert.ok(host.innerHTML.includes('Save 1 missing PDF'));
  const button={dataset:{wiringPackAction:'download'}};
  await listeners.click({target:{closest:()=>button}});
  assert.match(host.innerHTML,/Could not complete the download/);assert.match(host.innerHTML,/&lt;unsafe&gt;/);assert.ok(host.innerHTML.includes(pack.entryIds[0]));assert.ok(host.innerHTML.includes('Save 1 missing PDF'));
  assert.doesNotThrow(()=>controller.mount(host,'%E0%A4%A','%'));assert.match(host.innerHTML,/Wiring pack not found/);
 }finally{globalThis.document=previous;}
});
