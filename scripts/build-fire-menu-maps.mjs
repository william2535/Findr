// Publish reviewed fire-panel references in the shared menu atlas. This is a
// deterministic projection of existing source-reviewed data, not new firmware.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {validateMenuMap} from '../public/app/menu-map-engine.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=name=>JSON.parse(readFileSync(join(root,'public/app/data',name+'.json'),'utf8'));
const sha=value=>createHash('sha256').update(value).digest('hex');
const clone=value=>JSON.parse(JSON.stringify(value));
const unique=values=>[...new Set(values.filter(Boolean))];
const slug=value=>String(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const sourceFiles=['gent-vigilon','gent-lessons','gent-nano','gent-nano-lessons','conventional-fire'];
const refs=items=>{
 const out=[];
 for(const ref of items||[])for(const page of ref.pages||[ref.pdfPage]){
  if(!Number.isInteger(page))throw Error('Missing reviewed PDF page');
  let printedPage=ref.printedPage;
  if(!printedPage){
   if(ref.sourceId==='nano-operator-9')printedPage=String(page);
   else if(ref.sourceId==='nano-commissioning-3'&&page===85)printedPage='86';
   else if(ref.sourceId==='gent-vigilon-4188-856-2015'&&page>=98&&page<=106)printedPage=String(page);
   else printedPage='not recorded';
  }
  const result={sourceId:ref.sourceId,pdfPage:page,printedPage,...(ref.section?{section:ref.section}:{})};
  if(!out.some(x=>JSON.stringify(x)===JSON.stringify(result)))out.push(result);
 }
 return out.sort((a,b)=>a.sourceId.localeCompare(b.sourceId)||a.pdfPage-b.pdfPage||String(a.section||'').localeCompare(String(b.section||'')));
};
const sources=items=>items.map(item=>({...clone(item),edition:item.edition||[item.documentNumber,item.revision].filter(Boolean).join(' · '),publisher:item.publisher||(item.id.startsWith('cfp-')?'C-TEC':'Kentec Electronics'),totalPdfPages:item.pages,scope:item.id==='cfp-engineer-rev1'?'Historical CFP Standard DFU7004010 Rev 1. The existing reviewed engineering profile supports the recorded SW8/VR1 functions; this is not a claim that current production hardware or other CFP variants match.':item.scope||item.note||item.limitations||'See the exact model and edition recorded here.',pageNumbering:item.pageNumbering||'Links use one-based PDF pages. Printed labels are shown only where recorded; unknown printed pages are not inferred.'}));
const normalStatus=status=>status==='implemented'?'implemented':['conditional','conflict','version-limited'].includes(status)?status:'reference-only';
function template({id,title,models,keypads=[],baseline,scope,sourceList,kind,route,limits=[]}){
 return {schemaVersion:1,version:'0.23.0',profileId:id,title,panelModels:models,keypadModels:keypads,baseline,scope,sources:sources(sourceList),engine:{kind,route,label:'Open panel emulator',mapKind:kind==='conventional'?'controls':'menu'},nodes:[],numbering:{style:kind==='conventional'?'physical-controls':'labelled',explanation:kind==='conventional'?'These are documented physical controls, indications and engineering functions. They are not LCD menu screens. Displayed configuration codes retain the manual’s exact spelling.':'This tree groups documented routes. Branch labels, access context and editions are retained; the tree does not turn path labels into a numeric shortcut or a verified button sequence.',examples:[],caveats:[]},navigation:[],coverage:{strategy:'Derived from FINDR’s existing reviewed manufacturer sources; references, supported simulation and authored practice tasks remain distinct.',mappedAreas:[],excludedAreas:limits,confidence:'Manual-backed reference; not hardware or firmware certification.',hardwareVerified:false},gaps:[]};
}
function add(map,node){const result={id:node.id,parentId:node.parentId??null,order:map.nodes.length,code:null,address:null,aliases:[],notes:[],conditions:[],...node};result.sourceRefs=refs(result.sourceRefs);map.nodes.push(result);return result;}
function group(map,id,label,childrenRefs,notes=[]){return add(map,{id,label,kind:'reference',simulationStatus:'reference-only',summary:'Reference grouping for '+label.toLowerCase()+'.',sourceRefs:childrenRefs,notes:['This heading organises references; it is not an additional physical menu.',...notes],access:'See each entry’s access and model context.'});}
function addLessons(map,lessons,route){
 const lessonRefs=lessons.flatMap(l=>[...(l.sourceRefs||[]),...(l.steps||[]).flatMap(s=>s.sourceRefs||[])]);
 group(map,'practice-tasks','Guided practice tasks',lessonRefs,['These are FINDR exercises based on the cited controls, not manufacturer menu names. Starting a lesson explicitly loads its fictional scenario.']);
 for(const lesson of lessons){const routeValue=route+'/coach/'+encodeURIComponent(lesson.id);add(map,{id:'lesson-'+lesson.id,parentId:'practice-tasks',label:lesson.title,kind:'command',simulationStatus:'implemented',summary:lesson.summary||lesson.objective||lesson.description||'Follow the sourced controls on the fictional training site.',access:(lesson.prerequisites||[]).join(' · ')||'Fictional training scenario; the lesson explains its required access.',notes:unique(['FINDR practice task, not an additional menu screen. Opening it starts the fictional lesson; each physical control or labelled training action is still performed by the learner.',lesson.restoreInstruction]),conditions:lesson.prerequisites||[],sourceRefs:[...(lesson.sourceRefs||[]),...(lesson.steps||[]).flatMap(s=>s.sourceRefs||[])],practiceRoute:routeValue,hintsRoute:routeValue,lessonId:lesson.id});}
}
function gentMap(id){
 const data=read(id),nano=id==='gent-nano',lessons=read(nano?'gent-nano-lessons':'gent-lessons').lessons,route=nano?'#nano':'#gent';
 const limits=(data.knownLimits||[]).map(x=>typeof x==='string'?x:[x.summary||x.description||x.title,x.treatment].filter(Boolean).join(' '));
 const map=template({id,title:nano?'Gent Nano V3.xx':'Gent Vigilon 4/6 loop',models:data.modelScope.models||['Nano single-loop panel, V3.xx'],baseline:nano?'V3.xx operator: 4188-947 Issue 9 / 4188-948 Issue 11. V2.xx engineering references stay separately labelled.':'Classic VIG1-24 / VIG1-72, July 2015 operator source; EN54 V4 MCC/MCB V4.53+ commissioning appendix.',scope:[data.modelScope.variant,data.modelScope.editionBoundary,data.menuReferenceNote].filter(Boolean).join(' '),sourceList:data.sources,kind:nano?'nano':'gent',route,limits});
 if(!map.scope)map.scope='V3.xx operator controls with older V2.xx engineering references. No complete firmware or installed-system match is claimed.';
 const rows=new Map(),runtime=new Map(data.nodes.map(n=>[n.id,n]));
 for(const item of data.menuReference){
  for(let length=1;length<=item.route.length;length++){
   const path=item.route.slice(0,length),key=JSON.stringify(path);
   if(!rows.has(key))rows.set(key,{path,items:[],allRefs:[]});
   rows.get(key).allRefs.push(...item.sourceRefs);
   if(length===item.route.length)rows.get(key).items.push(item);
  }
 }
 const ids=new Map([...rows].map(([key,row])=>[key,'path-'+slug(row.path.join('-')).slice(0,105)+'-'+sha(key).slice(0,8)]));
 for(const [key,row] of rows){
  const direct=row.items,states=unique(direct.map(x=>normalStatus(x.status))),state=states.includes('conflict')?'conflict':states.length===1?states[0]:states.length?'reference-only':'reference-only';
  const nodeIds=unique(direct.map(x=>x.nodeId)),physical=nodeIds.length===1?runtime.get(nodeIds[0]):null;
  const safe=state==='implemented'&&physical&&physical.confidence==='verified'&&!physical.referenceOnly&&physical.kind!=='reference';
  const sourceRefs=direct.length?direct.flatMap(x=>x.sourceRefs):row.allRefs;
  const label=direct.find(x=>x.title)?.title||row.path.at(-1),hasChildren=[...rows.values()].some(x=>x.path.length===row.path.length+1&&JSON.stringify(x.path.slice(0,-1))===key);
  const notes=unique([...direct.map(x=>x.note),...(safe?[physical.note,physical.fieldHelp]:[]),...(!direct.length?['Branch grouping from the cited routes; no additional physical screen or universal key order is asserted.']:[])]);
  if(nano&&sourceRefs.some(x=>x.sourceId==='nano-commissioning-3'))notes.push('The commissioning source is V2.xx. A shared category in V3.xx does not verify its older detailed engineering sequence.');
  const node=add(map,{id:ids.get(key),parentId:row.path.length>1?ids.get(JSON.stringify(row.path.slice(0,-1))):null,label,kind:hasChildren?'menu':safe&&(/view|log|status|firmware|site-data/i.test(physical.formType||physical.id))?'status':safe?'command':'reference',simulationStatus:state,summary:direct.map(x=>x.note).filter(Boolean).join(' ')||'Documented route: '+row.path.join(' → ')+'. Read the cited source and exact access context.',access:unique(direct.map(x=>x.accessLevel)).map(x=>'Access '+x).join(' / ')||'See the branch entries and source access table.',aliases:unique([...direct.flatMap(x=>x.aliases||[]),row.path.join(' '),...(physical?[physical.title]:[])]),notes,conditions:unique(direct.map(x=>x.status==='conditional'?x.note||'Configuration dependent.':null)),sourceRefs,sourcePath:row.path,sourceReferenceIds:direct.map(x=>x.id),...(physical?{emulatorNodeId:physical.id}:{}),...(safe?{hintsRoute:route+'/guided/'+encodeURIComponent(physical.id)}:{})});
  if(!safe&&node.simulationStatus==='implemented'){node.simulationStatus='reference-only';node.notes.push('The source row names an implementation, but no verified runtime target was resolved; no interactive route is offered.');}
 }
 addLessons(map,lessons,route);
 map.numbering.caveats=['No numeric shortcuts are inferred from this hierarchy.','Conditional, conflicting and older-version entries never gain a highlighted-key route solely because the label exists.'];
 map.navigation=nano?[{keys:'Next / Verify',action:'Move through the documented Nano selection.'},{keys:'Left / right selection',action:'Follow the context prompt shown above each key.'},{keys:'− / +',action:'Change a documented value or PIN digit; this is not a numeric keypad.'}]:[{keys:'F1–F4',action:'Select the corresponding prompt currently displayed above the physical function key.'},{keys:'Menu On/Off',action:'Enter or abort menu operation; it is not a generic Back control.'},{keys:'Enter',action:'Commit only the documented current selection; a hint never presses it automatically.'}];
 map.coverage.mappedAreas=['All '+data.menuReference.length+' reviewed source-reference rows, with identical full paths merged.','Documented parent branches grouped without inventing shortcut numbers.','Existing verified operator routes and '+lessons.length+' guided practice tasks.'];
 map.gaps=(data.knownLimits||[]).map((x,i)=>({id:'source-limit-'+(x.id||i),question:'What does the matching panel/manual establish for '+(x.title||x.id||'this limit')+'?',reason:typeof x==='string'?x:x.summary||x.description||x.explanation||x.note||JSON.stringify(x),neededEvidence:typeof x==='string'?'Exact model, software version and corresponding manufacturer page.':x.treatment||'Exact model, software version and corresponding manufacturer page.',affectedNodeIds:[]}));
 map.sourceProjection={files:[id+'.json',nano?'gent-nano-lessons.json':'gent-lessons.json'],referenceRows:data.menuReference.length,uniqueReferencePaths:new Set(data.menuReference.map(x=>JSON.stringify(x.route))).size};
 return map;
}
function conventionalMap(profile,sourceData){
 const id=profile.id,sigma=id==='kentec-sigma-cp',route='#fire-panel/'+id;
 const used=new Set();const walk=value=>{if(!value||typeof value!=='object')return;if(value.sourceId)used.add(value.sourceId);Object.values(value).forEach(walk);};walk(profile);
 const map=template({id,title:profile.brand+' '+profile.title,models:[profile.variant],baseline:profile.variant,scope:profile.scope+' This is a physical control/function map, not an LCD menu tree.',sourceList:sourceData.sources.filter(x=>used.has(x.id)),kind:'conventional',route,limits:profile.limitations});
 const collections=[['front-controls','Front controls',profile.physicalKeys],['indications','Panel indications',profile.indicators],['inside-controls','Internal controls',profile.internalControls],['operations','Operator functions',profile.features.filter(x=>!x.id.startsWith('engineering-')&&!['configuration','internal-diagnostics'].includes(x.id))]];
 for(const [groupId,label,items] of collections){
  group(map,groupId,label,items.flatMap(x=>x.sourceRefs));
  for(const item of items){const status=item.type==='reference'||item.status&&item.status!=='implemented'?'reference-only':'implemented';add(map,{id:groupId+'-'+slug(item.id),parentId:groupId,label:item.boardLabel?item.boardLabel+' — '+item.label:item.label||item.title,kind:groupId==='indications'?'status':groupId==='inside-controls'&&item.type==='rotary'?'setting':groupId==='operations'?'command':'reference',simulationStatus:status,summary:item.description||item.role||item.placement||('Documented '+(groupId==='indications'?'indication':'control')+': '+(item.label||item.title)+'.'),access:groupId==='inside-controls'?'Internal access; see the exact control and source.':'Access depends on the function and current control-access state; see the source.',notes:unique([item.placement,item.type==='rotary'?`Source range ${item.minimum}–${item.maximum} ${item.unit}.`:null,item.status==='training-shortcut'?'FINDR practice assist; no verified physical MODE cycle or invented hardware control.':null]),sourceRefs:item.sourceRefs,sourceControlId:item.id});}
 }
 if(sigma){
  group(map,'operator-modes','Operator modes',profile.modes.flatMap(x=>x.sourceRefs),['The complete physical MODE cycle order remains unresolved; the trainer’s starting-point selector is explicitly a practice assist.']);
  for(const item of profile.modes)add(map,{id:'mode-'+item.id,parentId:'operator-modes',label:item.label,kind:'setting',simulationStatus:'implemented',code:item.display,codeType:'parameter',summary:'Documented '+item.display+' operator selection. Check the enabled-control state and restore the affected zone/output explicitly.',access:'Access level 2',notes:['The trainer offers a labelled practice starting point because the source does not establish the complete physical MODE cycle order.'],sourceRefs:item.sourceRefs});
  group(map,'configuration','Level 3 configuration codes',profile.engineering.sourceRefs,Object.entries(profile.engineering).filter(([k,v])=>k.endsWith('Note')&&typeof v==='string').map(([,v])=>v));
  for(const item of profile.engineering.configurationCodes){
   const groupId='configuration-'+item.group;
   if(!map.nodes.some(x=>x.id===groupId)){const members=profile.engineering.configurationCodes.filter(x=>x.group===item.group);const parent=group(map,groupId,item.group.replaceAll('-',' '),members.flatMap(x=>x.sourceRefs));parent.parentId='configuration';}
   add(map,{id:'code-'+item.code,parentId:groupId,label:item.label,kind:item.kind==='choice'?'selection':'setting',simulationStatus:normalStatus(item.status),code:item.code,codeType:item.kind==='choice'?'value':'parameter',summary:item.scope,access:'Access level 3 with Write Enable ON',notes:unique([item.warning,item.firmwareMinimum?'Minimum recorded firmware: '+item.firmwareMinimum:null,item.status==='reference-only'?'This configuration code is documented but has no supported effect in the present trainer.':null]),conditions:unique([item.firmwareMinimum?'Requires '+item.firmwareMinimum:null]),sourceRefs:item.sourceRefs,sourceControlId:item.code});
  }
  group(map,'internal-diagnostics','Internal diagnostic indications',profile.engineering.diagnostics.flatMap(x=>x.sourceRefs));
  for(const item of profile.engineering.diagnostics)add(map,{id:'diagnostic-'+item.id,parentId:'internal-diagnostics',label:item.label,kind:'status',simulationStatus:'implemented',summary:item.scope,access:'Internal indication; see the documented access and safe service arrangements.',sourceRefs:item.sourceRefs});
  group(map,'callouts','Call-out practice',profile.callOuts.flatMap(x=>x.sourceRefs),['Authored practice tasks; these are not additional physical menu screens.']);
  for(const item of profile.callOuts)add(map,{id:'callout-'+item.id,parentId:'callouts',label:item.title,kind:'command',simulationStatus:'implemented',summary:item.summary,access:'Fictional practice scenario',notes:[item.scope,'Opening the linked lesson loads its fictional scenario; it does not perform physical work or certify compatibility.'],sourceRefs:item.sourceRefs,lessonId:item.lessonId,practiceRoute:route+'/coach/'+item.lessonId,hintsRoute:route+'/coach/'+item.lessonId});
 }else{
  group(map,'engineering','SW8 level 3 functions',profile.engineering.sourceRefs,[profile.engineering.confirmation,profile.engineering.timingNote,profile.engineering.draftPolicyNote]);
  for(const item of profile.engineering.functions)add(map,{id:'function-'+item.id,parentId:'engineering',label:item.label,kind:item.kind==='diagnostic'?'status':'setting',simulationStatus:'implemented',summary:item.scope,access:'Access level 3 via internal SW8',notes:unique([item.warning]),sourceRefs:item.sourceRefs,sourceControlId:item.id});
 }
 addLessons(map,profile.lessons,route);
 map.numbering.explanation+=sigma?' Configuration codes such as 00 and 2A are preserved as strings; they are not route addresses.':' SW8 follows the recorded S-shaped function sequence. No LCD menu numbers are assigned.';
 map.numbering.examples=sigma?[{code:'00',meaning:'Documented sounder-delay choice, 30 seconds; not an access PIN.'},{code:'2A',meaning:'Version-limited configuration reference; no supported simulation effect.'}]:[{code:'SW8',meaning:'Internal access-level-three function button.'},{code:'VR1',meaning:'Documented delay-period rotary control.'}];
 map.numbering.caveats=sigma?[profile.engineering.selectionNote,profile.engineering.unsetNote,profile.engineering.entryDirectionNote]:[profile.engineering.draftPolicyNote,profile.engineering.timingNote];
 map.navigation=sigma?[{keys:'Enable Control',action:'Provides the documented operator access; distinct from internal Write Enable.'},{keys:'Write Enable',action:'Select ON to reach level 3 in the trainer; source switch direction conflict remains visible.'},{keys:'Mode (+10) / Select (+1) / Enter',action:'Select and set/review a documented engineering code; reference-only effects stay unavailable.'}]:[{keys:'SW8',action:'Enter/advance the documented internal engineering function sequence.'},{keys:'Next Option',action:'Confirm documented staged choices.'},{keys:'Enable/Disable',action:'Toggle the selected documented item; verify confirmation and restoration.'}];
 map.coverage.mappedAreas=['Documented physical keys, indications and internal controls.','Source-backed operator functions and all existing guided lessons.',sigma?'All 103 configuration-code records, preserving 48 supported and 55 reference-only effects.':'All nine SW8 function positions, with programming and diagnostic views kept distinct.'];
 map.gaps=profile.limitations.map((text,index)=>({id:'scope-'+index,question:'Does this model/revision match the recorded scope?',reason:text,neededEvidence:'Exact panel label, software/hardware revision and applicable manufacturer document.',affectedNodeIds:[]}));
 map.sourceProjection={files:['conventional-fire.json'],profileId:id};
 return map;
}
export function buildFireMenuMaps(){const conventional=read('conventional-fire');return [gentMap('gent-vigilon'),gentMap('gent-nano'),...conventional.profiles.map(p=>conventionalMap(p,conventional))];}
export function fireMapAudit(maps){return {release:'0.23.0',baselineCommit:'e8691d604f07fc882a803892d4c6ca7f8722a869',method:'Deterministic projection of the existing reviewed source data. Exact full reference paths are merged, parent paths are labelled reference groupings, and authored lessons remain practice tasks. No new firmware or hardware verification.',inputs:sourceFiles.map(name=>({file:'public/app/data/'+name+'.json',sha256:sha(readFileSync(join(root,'public/app/data',name+'.json')))})),maps:maps.map(map=>({id:map.profileId,entries:map.nodes.length,sourceDocuments:map.sources.length,sourcePages:map.sources.reduce((n,s)=>n+s.totalPdfPages,0),citedPages:new Set(map.nodes.flatMap(n=>n.sourceRefs.map(r=>r.sourceId+':'+r.pdfPage))).size,statuses:Object.fromEntries(unique(map.nodes.map(n=>n.simulationStatus)).map(s=>[s,map.nodes.filter(n=>n.simulationStatus===s).length])),hintLinks:map.nodes.filter(n=>n.hintsRoute).length,practiceTasks:map.nodes.filter(n=>n.id.startsWith('lesson-')).length,...map.sourceProjection})),pageConventions:['Existing explicit printedPage labels are preserved.','Nano operator PDF pages equal printed pages per its existing reviewed source note.','Nano commissioning PDF page 85 is printed page 86; other unrecorded labels remain unknown.','Gent commissioning PDF pages 98–106 were independently checked against their printed footers in the matching a08baba…66998 PDF.','Unrecorded printed page labels remain “not recorded”; no offset is guessed.']};}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const maps=buildFireMenuMaps();for(const map of maps){const errors=validateMenuMap(map);if(errors.length)throw Error(map.profileId+': '+errors.join('; '));}
 const check=process.argv.includes('--check');
 for(const map of maps){const file=join(root,'public/app/data/menu-maps',map.profileId+'.json');if(check){if(JSON.stringify(JSON.parse(readFileSync(file,'utf8')))!==JSON.stringify(map))throw Error('Map differs: '+map.profileId);}else writeFileSync(file,JSON.stringify(map)+'\n');}
 const audit=fireMapAudit(maps),folder=join(root,'research/packs-hints-maps-0.23.0');mkdirSync(folder,{recursive:true});
 if(!check)writeFileSync(join(folder,'fire-menu-map-audit.json'),JSON.stringify(audit,null,2)+'\n');
 console.log(JSON.stringify({checked:check,maps:audit.maps,totalEntries:maps.reduce((n,m)=>n+m.nodes.length,0)}));
}
