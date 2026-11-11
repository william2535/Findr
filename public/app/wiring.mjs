// Reviewed manual-page pictures. Search is discovery; model applicability comes
// only from explicit source-reviewed links, never from a title/brand resemblance.
const array=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'');
const normalize=value=>text(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const names=(a,b)=>text(a).localeCompare(text(b),'en-GB',{numeric:true,sensitivity:'base'});
const idSet=value=>value===undefined?null:value instanceof Map?new Set(value.keys()):value instanceof Set?value:new Set(array(value));
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/i.test(value)?value.toLowerCase():null;
const byTitle=(a,b)=>names(a.title,b.title)||names(a.brand,b.brand)||names(a.recordId,b.recordId)||(a.pdfPage-b.pdfPage)||names(a.id,b.id);

export function filterWiringDiagrams(entries,{query='',brand='',category='',targetType='',diagramType='',recordId='',recordIds,deviceId='',panelId='',order='relevance',savedRecordIds}={}){
 const terms=text(query).trim().split(/\s+/).map(normalize).filter(Boolean),phrase=normalize(query),ids=idSet(recordIds),saved=idSet(savedRecordIds);
 const savedAt=id=>{const value=savedRecordIds instanceof Map?savedRecordIds.get(id)?.savedAt:0;return Number.isFinite(value)?value:0;};
 return array(entries).filter(entry=>(!brand||entry.brand===brand)&&(!category||entry.category===category)&&(!targetType||entry.targetType===targetType)&&(!diagramType||entry.diagramType===diagramType)&&(!recordId||entry.recordId===recordId)&&(!ids||ids.has(entry.recordId))&&(!saved||saved.has(entry.recordId))&&(!panelId||array(entry.panelIds).includes(panelId))&&(!deviceId||array(entry.deviceIds).includes(deviceId)))
  .map(entry=>{const models=array(entry.models).map(normalize),title=normalize(entry.title),haystack=normalize([entry.title,entry.brand,...array(entry.models),...array(entry.keywords),entry.section,entry.edition,entry.scope,`PDF page ${entry.pdfPage}`,entry.printedPage?`printed page ${entry.printedPage}`:''].join(' '));return {entry,match:terms.every(term=>haystack.includes(term)),score:phrase?(models.includes(phrase)?100:0)+(title.startsWith(phrase)?30:0)+(title.includes(phrase)?10:0):0};})
  .filter(result=>result.match).sort((a,b)=>{if(order==='recent')return savedAt(b.entry.recordId)-savedAt(a.entry.recordId)||byTitle(a.entry,b.entry);if(order==='brand')return names(a.entry.brand,b.entry.brand)||byTitle(a.entry,b.entry);if(order==='page')return names(a.entry.recordId,b.entry.recordId)||(a.entry.pdfPage-b.entry.pdfPage)||byTitle(a.entry,b.entry);if(order==='relevance'&&a.score!==b.score)return b.score-a.score;return byTitle(a.entry,b.entry);}).map(result=>result.entry);
}

export function buildWiringIndex(entries){
 const index={byId:new Map(),byRecord:new Map(),byPanel:new Map(),byDevice:new Map()};
 const add=(map,id,entry)=>{if(!map.has(id))map.set(id,[]);map.get(id).push(entry);};
 for(const entry of array(entries)){if(index.byId.has(entry.id))throw new Error('Duplicate wiring entry: '+entry.id);index.byId.set(entry.id,entry);add(index.byRecord,entry.recordId,entry);for(const id of new Set(array(entry.panelIds)))add(index.byPanel,id,entry);for(const id of new Set(array(entry.deviceIds)))add(index.byDevice,id,entry);}
 return index;
}
const asIndex=value=>value?.byRecord instanceof Map?value:buildWiringIndex(value);
export function wiringForRecord(entriesOrIndex,recordId){return [...(asIndex(entriesOrIndex).byRecord.get(recordId)||[])];}
export function wiringForTarget(entriesOrIndex,{panelId='',deviceId=''}={}){
 if(!panelId&&!deviceId)return [];
 const index=asIndex(entriesOrIndex),entries=panelId?index.byPanel.get(panelId)||[]:index.byDevice.get(deviceId)||[];
 return entries.filter(entry=>!deviceId||array(entry.deviceIds).includes(deviceId));
}

// actualPdfHash must be computed from the stored Blob. A shared record ID,
// filename, model or catalogue hash cannot verify that the saved bytes match.
export function wiringSourceStatus(entry,actualPdfHash,{pageCount}={}){
 const expected=hash(entry?.sourceSha256),actual=hash(actualPdfHash),validPage=Number.isInteger(entry?.pdfPage)&&entry.pdfPage>0;
 if(!expected||!actual)return {status:'unknown',matchesSource:false,canJump:false,pdfPage:null,message:'The saved PDF edition has not been verified against this diagram. Open the PDF from its beginning.'};
 if(expected!==actual)return {status:'mismatch',matchesSource:false,canJump:false,pdfPage:null,message:'The saved PDF differs from the source used for this picture. Its page numbers may differ.'};
 if(!validPage||(pageCount!==undefined&&(!Number.isInteger(pageCount)||pageCount<entry.pdfPage)))return {status:'page-out-of-range',matchesSource:true,canJump:false,pdfPage:null,message:'The recorded diagram page is not available in this PDF.'};
 return {status:'exact',matchesSource:true,canJump:true,pdfPage:entry.pdfPage,message:'Saved PDF matches the checked diagram source.'};
}

export function wiringAvailability(entry,{savedRecordIds,downloadableRecordIds}={}){
 const saved=idSet(savedRecordIds),downloadable=idSet(downloadableRecordIds),isSaved=saved?.has(entry?.recordId)===true,canDownload=downloadable?.has(entry?.recordId)===true;
 const pictureAvailable=typeof entry?.image==='string'&&/^wiring\/[a-z0-9][a-z0-9-]*\.webp$/.test(entry.image);
 return {picture:{available:pictureAvailable,offlineIncluded:pictureAvailable},pdf:{status:isSaved?'saved':canDownload?'available':'unavailable',saved:isSaved,downloadable:canDownload}};
}

export function wiringCoverage(entries){
 const list=array(entries),byCategory={};for(const entry of list)byCategory[entry.category]=(byCategory[entry.category]||0)+1;
 return {diagramCount:list.length,manualCount:new Set(list.map(entry=>entry.recordId)).size,panelCount:new Set(list.flatMap(entry=>array(entry.panelIds))).size,deviceCount:new Set(list.flatMap(entry=>array(entry.deviceIds))).size,brandCount:new Set(list.map(entry=>entry.brand)).size,byCategory};
}
