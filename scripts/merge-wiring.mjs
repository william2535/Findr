// Merge reviewed batches only. This never modifies catalogue/manual identities.
import {readFileSync,writeFileSync,readdirSync,existsSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
import {wiringCoverage} from '../public/app/wiring.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=path=>JSON.parse(readFileSync(path,'utf8'));
const names=(a,b)=>String(a).localeCompare(String(b),'en-GB',{numeric:true,sensitivity:'base'});
const requiredStrings=['id','recordId','title','brand','category','section','sourceUrl','sourceSha256','edition','image','imageSha256','scope'];
const arrayFields=['models','panelIds','deviceIds','notes','keywords'];

export function webpDimensions(bytes){
 assert.ok(bytes.length>=25&&bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP','Image must be a WebP file');
 assert.equal(bytes.readUInt32LE(4)+8,bytes.length,'WebP RIFF size differs');
 for(let offset=12;offset+8<=bytes.length;){const kind=bytes.subarray(offset,offset+4).toString(),length=bytes.readUInt32LE(offset+4),start=offset+8;assert.ok(start+length<=bytes.length,'Truncated WebP chunk');
  if(kind==='VP8X'){assert.ok(length>=10,'Invalid extended WebP header');return [bytes.readUIntLE(start+4,3)+1,bytes.readUIntLE(start+7,3)+1];}
  if(kind==='VP8L'){assert.ok(length>=5&&bytes[start]===0x2f,'Invalid lossless WebP header');const bits=bytes.readUInt32LE(start+1);return [(bits&0x3fff)+1,((bits>>>14)&0x3fff)+1];}
  if(kind==='VP8 '){assert.ok(length>=10&&bytes.subarray(start+3,start+6).equals(Buffer.from([0x9d,0x01,0x2a])),'Invalid lossy WebP header');return [bytes.readUInt16LE(start+6)&0x3fff,bytes.readUInt16LE(start+8)&0x3fff];}
  offset=start+length+(length%2);
 }
 throw new Error('WebP dimensions not found');
}

export function validateWiringEntries(entries,{records,panels=[],devices=[],publicApp=join(root,'public/app'),checkImages=true}={}){
 assert.ok(Array.isArray(entries),'Wiring batch must be an array');
 const recordMap=records instanceof Map?records:new Map((records||[]).map(record=>[record.id,record]));
 const panelMap=new Map(panels.map(item=>[item.id,item])),deviceMap=new Map(devices.map(item=>[item.id,item])),ids=new Set(),pages=new Set(),imagePaths=new Set(),newTargetLinks=[];
 let imageBytes=0;
 for(const entry of entries){assert.ok(entry&&typeof entry==='object'&&!Array.isArray(entry),'Invalid wiring entry');
  for(const key of requiredStrings)assert.ok(typeof entry[key]==='string'&&entry[key].trim(),`${entry.id||'?'}: missing ${key}`);
  assert.match(entry.id,/^[a-z0-9][a-z0-9-]*$/,'Unsafe wiring ID');assert.ok(!ids.has(entry.id),`Duplicate wiring ID: ${entry.id}`);ids.add(entry.id);
  const record=recordMap.get(entry.recordId);assert.ok(record,`${entry.id}: unknown manual ${entry.recordId}`);assert.equal(entry.brand,record.brand,`${entry.id}: manual brand differs`);assert.equal(entry.category,record.category,`${entry.id}: manual discipline differs`);
  assert.ok(['panel','device','accessory'].includes(entry.targetType),`${entry.id}: target type`);assert.ok(['wiring','terminal-layout','connection-example'].includes(entry.diagramType),`${entry.id}: diagram type`);
  assert.ok(Number.isInteger(entry.pdfPage)&&entry.pdfPage>0,`${entry.id}: PDF page must be positive and 1-based`);if(Number.isInteger(record.pages))assert.ok(entry.pdfPage<=record.pages,`${entry.id}: page exceeds recorded document pages`);
  assert.ok(entry.printedPage===null||(typeof entry.printedPage==='string'&&entry.printedPage.trim()),`${entry.id}: printed page must be explicit or null`);
  for(const key of arrayFields){assert.ok(Array.isArray(entry[key]),`${entry.id}: ${key} must be an array`);assert.ok(entry[key].every(value=>typeof value==='string'&&value.trim()),`${entry.id}: ${key} must contain nonempty text`);assert.equal(new Set(entry[key]).size,entry[key].length,`${entry.id}: duplicate ${key}`);}
  assert.ok(entry.models.length,`${entry.id}: source-supported models required`);
  const url=new URL(entry.sourceUrl);assert.ok(['https:','http:'].includes(url.protocol)&&!url.username&&!url.password,`${entry.id}: invalid source URL`);
  assert.match(entry.sourceSha256,/^[a-f0-9]{64}$/,`${entry.id}: source hash`);assert.match(entry.imageSha256,/^[a-f0-9]{64}$/,`${entry.id}: image hash`);
  if(record.sha256)assert.equal(entry.sourceSha256,record.sha256.toLowerCase(),`${entry.id}: reviewed source differs from the hash-pinned manual; investigate before inclusion`);
  assert.equal(entry.reviewStatus,'reviewed',`${entry.id}: review must be complete`);assert.match(entry.reviewedOn,/^\d{4}-\d{2}-\d{2}$/,`${entry.id}: review date`);
  assert.equal(entry.image,`wiring/${entry.id}.webp`,`${entry.id}: image path must follow the reviewed entry ID`);assert.ok(!imagePaths.has(entry.image),`${entry.id}: reused image path`);imagePaths.add(entry.image);
  const sourcePage=[entry.recordId,entry.sourceSha256,entry.pdfPage].join(':');assert.ok(!pages.has(sourcePage),`${entry.id}: duplicate complete source page; combine the page's topics before inclusion`);pages.add(sourcePage);
  for(const [field,map]of [['panelIds',panelMap],['deviceIds',deviceMap]])for(const id of entry[field]){const target=map.get(id);assert.ok(target,`${entry.id}: unknown ${field} ${id}`);if(!(target.record_ids||[]).includes(entry.recordId))newTargetLinks.push({entryId:entry.id,recordId:entry.recordId,targetType:field==='panelIds'?'panel':'device',targetId:id});}
  assert.ok(Number.isInteger(entry.imageWidth)&&entry.imageWidth>=400&&Number.isInteger(entry.imageHeight)&&entry.imageHeight>=400,`${entry.id}: image dimensions must retain a usable full page`);assert.ok(Number.isInteger(entry.imageBytes)&&entry.imageBytes>0,`${entry.id}: image bytes`);
  if(checkImages){const path=resolve(publicApp,entry.image);assert.ok(path.startsWith(resolve(publicApp)+ '/'),`${entry.id}: unsafe image path`);const bytes=readFileSync(path);assert.equal(bytes.length,entry.imageBytes,`${entry.id}: image byte count differs`);assert.equal(sha256(bytes),entry.imageSha256,`${entry.id}: image hash differs`);assert.deepEqual(webpDimensions(bytes),[entry.imageWidth,entry.imageHeight],`${entry.id}: image dimensions differ`);assert.ok(bytes.length<=25*1024*1024,`${entry.id}: image exceeds static asset limit`);}
  imageBytes+=entry.imageBytes;
 }
 assert.ok(imageBytes<128*1024*1024,'Wiring images exceed the reviewed image budget; check total deployment size');
 return {...wiringCoverage(entries),imageBytes,newTargetLinks};
}

export function mergeWiringBatches(batches){
 const byId=new Map(),duplicates=[];
 for(const {name,entries}of batches){assert.ok(Array.isArray(entries),`${name}: expected an array`);for(const entry of entries){const previous=byId.get(entry.id);if(previous){assert.deepEqual(entry,previous.entry,`${name}: conflicting duplicate ${entry.id}`);duplicates.push({id:entry.id,retainedBatch:previous.name,duplicateBatch:name});}else byId.set(entry.id,{entry,name});}}
 const entries=[...byId.values()].map(item=>item.entry).sort((a,b)=>names(a.brand,b.brand)||names(a.title,b.title)||names(a.recordId,b.recordId)||(a.pdfPage-b.pdfPage)||names(a.id,b.id));
 return {entries,duplicates};
}

function main(){
 const args=process.argv.slice(2),checkOnly=args.includes('--check'),strictAssets=args.includes('--strict-assets'),batchRoot=join(root,'research/wiring-0.22.0'),dataRoot=join(root,'public/app/data');
 assert.ok(args.every(arg=>['--check','--strict-assets'].includes(arg)),'Usage: node scripts/merge-wiring.mjs [--check] [--strict-assets]');
 const names=readdirSync(batchRoot).filter(name=>name.endsWith('-entries.json')).sort();assert.ok(names.length,'No reviewed wiring batches found');
 const batches=names.map(name=>({name,entries:json(join(batchRoot,name))})),{entries,duplicates}=mergeWiringBatches(batches);
 assert.ok(entries.length,'Refusing to publish an empty reviewed wiring collection');
 const records=[...json(join(dataRoot,'catalogue.json')).records,...json(join(dataRoot,'device-documents.json'))],panels=json(join(dataRoot,'panels.json')),devices=json(join(dataRoot,'devices.json'));
 const coverage=validateWiringEntries(entries,{records,panels,devices});
 const baselinePath=join(batchRoot,'baseline-data-hashes.json');assert.ok(existsSync(baselinePath),'Missing baseline identity snapshot');const baseline=json(baselinePath);
 for(const item of baseline.files){const bytes=readFileSync(join(root,item.path));assert.equal(bytes.length,item.bytes,`Preserved file size changed: ${item.path}`);assert.equal(sha256(bytes),item.sha256,`Preserved file changed: ${item.path}`);}
 const expectedImages=new Set(entries.map(entry=>entry.image.slice('wiring/'.length))),actualImages=readdirSync(join(root,'public/app/wiring')).filter(name=>name.endsWith('.webp')).sort(),unreferencedImages=actualImages.filter(name=>!expectedImages.has(name));
 if(strictAssets)assert.deepEqual(unreferencedImages,[],'Unreferenced public wiring pictures need review/removal before release');
 const dataset={schemaVersion:1,version:'0.22.0',reviewedOn:[...new Set(entries.map(entry=>entry.reviewedOn))].sort().at(-1),scope:'Reviewed source-page pictures only. This collection is not exhaustive; missing coverage does not mean a model has no wiring diagram.',entries};
 const target=join(dataRoot,'wiring-diagrams.json');
 if(checkOnly)assert.deepEqual(json(target),dataset,'Published wiring data differs from the reviewed batches');
 else{const temporary=target+'.tmp';writeFileSync(temporary,JSON.stringify(dataset)+'\n');renameSync(temporary,target);}
 const audit={schemaVersion:1,version:'0.22.0',preservation:{baselineCommit:baseline.baselineCommit,file:'baseline-data-hashes.json',sha256:sha256(readFileSync(baselinePath)),filesVerified:baseline.files.length},batches:names.map(name=>({name,sha256:sha256(readFileSync(join(batchRoot,name)))})),coverage,duplicates,unreferencedImages,datasetSha256:sha256(Buffer.from(JSON.stringify(dataset)+'\n'))};
 if(!checkOnly)writeFileSync(join(batchRoot,'merge-audit.json'),JSON.stringify(audit,null,2)+'\n');
 console.log(JSON.stringify({checked:checkOnly,batches:names.length,...coverage,duplicateEntriesRemoved:duplicates.length,unreferencedImages:unreferencedImages.length}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main();
