// Additive source associations. Existing catalogue identities and bytes stay intact.
const array=value=>Array.isArray(value)?value:[];
const unique=values=>[...new Set(values)];
const roles=['installation','engineering','user-guide','quick-start','application-note','repeater','accessory','datasheet','brochure'];
export const FIRE_SERVICE_BINDINGS=Object.freeze({
 'tyco-minerva-mx':Object.freeze({engineId:'minerva',variantId:'mx',route:'#minerva/variant/mx',title:'Minerva MX',scope:'MX1000 / MX4000 / MX4000M, Firmware 5.0 operating manual Issue 5 (11/04). Other firmware is not established by this trainer.'}),
 'tyco-minerva-mx2':Object.freeze({engineId:'minerva',variantId:'mx2',route:'#minerva/variant/mx2',title:'Minerva MX2',scope:'MX2-100 / MX2-200, Firmware 5.0 operating manual Issue 5 (11/04). Other firmware is not established by this trainer.'}),
 'c-tec-xfp-16-zone':Object.freeze({engineId:'xfp',variantId:'16',route:'#xfp/variant/16',title:'XFP 16 zone',scope:'Apollo / Hochiki single-loop 16-zone source edition. CAST is a separate model.'}),
 'c-tec-xfp-32-zone':Object.freeze({engineId:'xfp',variantId:'32',route:'#xfp/variant/32',title:'XFP 32 zone',scope:'Apollo / Hochiki one/two-loop 32-zone source edition. CAST is a separate model.'}),
 'fike-twinflexpro2':Object.freeze({engineId:'twinflex',route:'#twinflex',title:'TWINFLEXpro²',scope:'Eight-zone TWINFLEXpro² V3.00+ training fixture. Original Twinflex, earlier pro and repeaters are separate.'}),
});
export const serviceTrainerForPanel=panelId=>FIRE_SERVICE_BINDINGS[panelId]||null;
export function serviceManualsForPanel(data,panelId,records){
 const families=array(data?.families).filter(family=>array(family.panelIds).includes(panelId));
 const documents=new Map(),excludedRecordIds=new Set(families.flatMap(family=>array(family.excludedRecordIds).map(item=>typeof item==='string'?item:item.recordId)).filter(Boolean));
 for(const family of families){
  const ids=new Set(array(family.recordIds));
  for(const document of array(family.documents)){
   if(document.verificationStatus!=='verified'||!ids.has(document.recordId)||excludedRecordIds.has(document.recordId)||!records?.has(document.recordId))continue;
   for(const alternate of array(document.alternateRecordIds))excludedRecordIds.add(alternate);
   if(!documents.has(document.recordId))documents.set(document.recordId,{...document,record:records.get(document.recordId),familyTitle:family.title});
  }
 }
 return {families,excludedRecordIds,documents:[...documents.values()].sort((a,b)=>{
  const rank=role=>roles.includes(role)?roles.indexOf(role):roles.length;
  // Source review orders the preferred current edition before historical ones.
  return rank(a.role)-rank(b.role);
 })};
}
export function serviceManualDelivery(document,records,saved){
 const ids=[document.recordId,...array(document.alternateRecordIds)];
 const matches=id=>Boolean(document.sha256&&saved?.get(id)?.fileHash===document.sha256);
 // Reuse a previously saved byte-identical alias without changing its stored ID.
 const recordId=ids.find(matches)||document.recordId;
 const record=records?.get(recordId)||document.record;
 const stored=saved?.get(recordId);
 const editionStatus=!stored?'not-saved':!stored.fileHash||!document.sha256?'unverified':matches(recordId)?'matching':'different';
 return {record,editionStatus,otherSavedIds:ids.filter(id=>id!==recordId&&saved?.has(id)&&!matches(id))};
}
export function manualIdsForPanel(panel,data,records){
 if(!panel)return [];
 const review=serviceManualsForPanel(data,panel.id,records);
 return unique([...review.documents.map(document=>document.recordId),...array(panel.record_ids).filter(id=>!review.excludedRecordIds.has(id))]);
}
