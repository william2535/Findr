import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const data=JSON.parse(readFileSync(new URL('../public/app/data/panel-default-access.json',import.meta.url)));
const catalogue=JSON.parse(readFileSync(new URL('../public/app/data/catalogue.json',import.meta.url))).records;
const mapsDir=new URL('../public/app/data/menu-maps/',import.meta.url);
const sources=readdirSync(mapsDir).filter(name=>name.endsWith('.json')).flatMap(name=>JSON.parse(readFileSync(new URL(name,mapsDir))).sources||[]);
const normalise=value=>String(value).normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
const entry=id=>data.entries.find(row=>row.id===id);

test('access references carry explicit model, role, edition, source hash and real page evidence',()=>{
  assert.equal(data.schemaVersion,1);
  assert.equal(new Set(data.entries.map(row=>row.id)).size,data.entries.length);
  assert.match(data.policy.siteCodeCaveat,/may have been changed/i);
  for(const row of data.entries){
    assert.ok(row.models.length>0,row.id);
    assert.ok(row.models.every(model=>typeof model==='string'&&model.trim()),row.id);
    for(const key of ['manufacturer','variant','role','accessLevel','code'])assert.ok(typeof row[key]==='string'&&row[key].length,row.id+' '+key);
    assert.ok(['factory-default','documented-access-sequence'].includes(row.kind),row.id);
    assert.ok(row.conditions.length+row.notes.length>0,row.id);
    const doc=row.document;
    assert.ok(doc.title&&doc.revision&&doc.section&&doc.sourceKey,row.id);
    assert.equal(new URL(doc.url).protocol,'https:',row.id);
    assert.match(doc.contentHash,/^[a-f0-9]{64}$/);
    assert.ok(Number.isInteger(doc.pdfPage)&&doc.pdfPage>0,row.id);
    assert.ok(normalise(doc.quote).replace(/\s/g,'').includes(row.code),row.id+' code must occur in the quotation');
    const known=[...catalogue,...sources].filter(source=>source.sha256===doc.contentHash);
    assert.ok(known.length,row.id+' PDF fingerprint must match an independently existing catalogue/map source');
    assert.ok(known.some(source=>doc.pdfPage<=(source.pages||source.totalPdfPages)),row.id);
    if(doc.recordId){
      const record=catalogue.find(record=>record.id===doc.recordId);
      assert.ok(record,row.id+' catalogue reference');
      if(record.sha256)assert.equal(doc.contentHash,record.sha256,row.id);
    }
    if(row.kind==='factory-default')assert.ok(row.notes.includes(data.policy.siteCodeCaveat),row.id+' site-code caveat');
  }
});

test('MxPro engineer evidence does not turn example user passwords into factory defaults',()=>{
  for(const [id,page] of [['mxpro4-level3',43],['mxpro5-level3',50]]){
    const row=entry(id);
    assert.equal(row.code,'7654');assert.equal(row.accessLevel,'3');assert.equal(row.document.pdfPage,page);
    assert.match(row.document.quote,/factory default level 3 password/i);
    assert.match(row.firmware,/onwards/);
  }
  assert.ok(!data.entries.some(row=>row.manufacturer==='Advanced'&&row.accessLevel==='2'));
  assert.match(data.gaps.find(row=>row.id==='mxpro-level2-not-established').reason,/labelled examples/);
  assert.notEqual(entry('mxpro4-level3').document.contentHash,entry('mxpro5-level3').document.contentHash);
});

test('Gent codes retain leading zeros, old firmware scope and the conditional customer-PIN prerequisite',()=>{
  assert.equal(entry('gent-nano-v2-level2').code,'0000');
  for(const row of data.entries.filter(row=>row.id.startsWith('gent-nano-'))){
    assert.equal(row.firmware,'V2.xx');assert.match(row.conditions.join(' '),/do not verify.*V3/);
    assert.deepEqual(row.applicability,{firmwareMajor:'2',requiresFirmware:true});
    assert.ok(row.supportingEvidence.some(evidence=>/factory set/i.test(evidence.quote)));
    assert.notEqual(row.code,'2468','Nano emulator practice PIN is not manufacturer evidence');
  }
  assert.equal(entry('gent-vigilon-customer').code,'2222');
  assert.match(entry('gent-vigilon-customer').conditions.join(' '),/Engineer PIN has been made active/);
  assert.ok(!data.entries.some(row=>row.id.startsWith('gent-vigilon')&&row.accessLevel==='3'));
  assert.match(data.gaps.find(row=>row.id==='gent-vigilon-no-engineer-default').document.quote,/no Engineer PIN/);
});

test('physical access sequences, software defaults and unsupported panels remain distinct',()=>{
  assert.equal(entry('ctec-cfp-level2').kind,'documented-access-sequence');
  assert.match(entry('ctec-xfp-level2').conditions.join(' '),/Keypad\/push-button/);
  assert.equal(entry('ctec-xfp16-level3').document.revision,'DFU1200510 Rev 3');
  assert.equal(entry('ctec-xfp32-level3').document.revision,'DFU2200510 Rev 2');
  assert.equal(entry('twinflex-pro2-user').code,'8737');
  assert.equal(entry('twinflex-pro2-supervisor').code,'7877');
  assert.match(entry('twinflex-pro2-supervisor').supportingEvidence[0].quote,/Default – SUPR/);
  assert.ok(!data.entries.some(row=>/minerva|sigma/i.test(row.models.join(' '))));
  assert.ok(data.gaps.some(row=>row.id==='kentec-sigma-physical-access'));
  assert.ok(data.gaps.some(row=>row.id==='minerva-mx-default-not-established'));
});

// Optional source audit uses the actual reviewed downloads, not synthetic PDFs or network requests.
// FINDR_DEFAULT_CODE_PDF_CACHE=/tmp/findr0361-default-code-evidence node --test tests/panel-default-access.test.mjs
test('reviewed manufacturer PDF bytes and exact quoted page text match every published entry',
  {skip:!process.env.FINDR_DEFAULT_CODE_PDF_CACHE},()=>{
    const cache=process.env.FINDR_DEFAULT_CODE_PDF_CACHE;
    const documents=[...data.entries,...data.gaps.filter(row=>row.document)];
    const verifiedHashes=new Map();
    for(const row of documents){
      const doc=row.document,file=join(cache,doc.sourceKey+'.pdf');
      if(!verifiedHashes.has(file))verifiedHashes.set(file,createHash('sha256').update(readFileSync(file)).digest('hex'));
      assert.equal(verifiedHashes.get(file),doc.contentHash,row.id+' actual source bytes');
      for(const evidence of [{pdfPage:doc.pdfPage,quote:doc.quote},...(row.supportingEvidence||[])]){
        const page=execFileSync('pdftotext',['-f',String(evidence.pdfPage),'-l',String(evidence.pdfPage),file,'-'],{encoding:'utf8'});
        assert.ok(normalise(page).includes(normalise(evidence.quote)),row.id+' quotation missing from PDF page '+evidence.pdfPage);
      }
    }
  });
