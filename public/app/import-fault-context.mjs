const fields = [
  ['panel','Export panel'],['node','Network node'],['loop','Loop'],['address','Address'],
  ['subAddress','Sub-address'],['zone','Zone'],['location','Programmed location'],
  ['type','Programmed device type'],['manufacturer','Imported manufacturer'],
  ['model','Imported model'],['partNumber','Imported part number'],
];
export function createImportedFaultSession({schedule,row,reportedFault='',panel=null,id,started=Date.now()}) {
  if (!schedule?.site || !schedule?.panel || !row?.address || !row?.loop || !id) throw new Error('Choose an imported device before starting Fault Finder.');
  const context = Object.fromEntries(fields.map(([key])=>[key,String(row[key]??'')]));
  return {
    id,started,site:schedule.site,message:String(reportedFault),confirmed:false,
    panel:panel ? {...panel,category:'fire'} : {brand:'Imported panel',model:schedule.panel,category:'fire',record_ids:[]},
    answers:{},notes:'',
    importedContext:{...context,importId:schedule.id,site:schedule.site,selectedPanel:schedule.panel,
      filename:schedule.filename,fileHash:schedule.fileHash,importedAt:schedule.importedAt,
      exportDate:row.exportDate||schedule.exportDate||'',exportDateSource:row.exportDate?'file':schedule.exportDateSource||'file',reportedFault:String(reportedFault),
      rawValues:[...(row.rawValues||[])],rowId:row.id},
  };
}
export function importedContextReport(context){
  if(!context)return '';
  return '\n\nIMPORTED CONFIGURATION — CONTEXT ONLY\n'+[
    `Site: ${context.site}`,`Selected panel / network: ${context.selectedPanel}`,
    ...fields.map(([key,label])=>`${label}: ${context[key]||'Not supplied'}`),
    `Source file: ${context.filename}`,`Import time: ${new Date(context.importedAt).toISOString()}`,
    `Panel export date${context.exportDateSource==='engineer'?' (entered by engineer)':''}: ${context.exportDate||'Not supplied'}`,
    `Reported fault at lookup: ${context.reportedFault||'Not recorded'}`,
    'Configuration records what was programmed at export time. It does not establish the installed device, an active fault, cable order or cable-break position. No check answers were inferred from the import.',
  ].join('\n');
}
