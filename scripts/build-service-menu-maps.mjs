// Project the reviewed XFP/TWINFLEXpro² source trees into FINDR's shared atlas.
// Navigation links are copied only from explicit engine-reviewed routes.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {validateMenuMap} from '../public/app/menu-map-engine.mjs';
import {menuEntryRoutes} from '../public/app/menu-map-registry.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const engineIds=['xfp','twinflex'];
const clone=value=>JSON.parse(JSON.stringify(value));
const list=value=>Array.isArray(value)?value:[];
const unique=items=>[...new Set(items.filter(Boolean))];
const text=value=>typeof value==='string'?value:value?.summary||value?.description||value?.note||value?.title||JSON.stringify(value);
const read=id=>JSON.parse(readFileSync(join(root,'public/app/data',id+'.json'),'utf8'));
const contentSha=data=>createHash('sha256').update(JSON.stringify(data)).digest('hex');
function sourceRefs(refs){
 const result=[];
 for(const ref of list(refs))for(const page of list(ref.pages).length?ref.pages:[ref.pdfPage]){
  if(!Number.isInteger(page))throw Error('Missing reviewed PDF page in '+JSON.stringify(ref));
  const value={...clone(ref),pdfPage:page,printedPage:ref.printedPage??'not recorded'};
  delete value.pages;
  if(!result.some(item=>JSON.stringify(item)===JSON.stringify(value)))result.push(value);
 }
 return result;
}
function kindFor(node){
 if(node.simulationStatus!=='implemented'||node.kind==='reference')return 'reference';
 if(['root','menu'].includes(node.kind))return 'menu';
 if(['display','status','information'].includes(node.kind))return 'status';
 if(['setting','toggle','code','time','value'].includes(node.kind))return 'setting';
 if(node.kind==='selection')return 'selection';
 return 'command';
}
function normalStatus(node){return ['implemented','reference-only','conditional','conflict','version-limited'].includes(node.simulationStatus)?node.simulationStatus:'reference-only';}
function add(map,input){
 const node={parentId:null,order:map.nodes.length,code:null,address:null,aliases:[],notes:[],conditions:[],...input};
 node.sourceRefs=sourceRefs(input.sourceRefs);
 // A documented label or a supported effect does not establish a physical route.
 const routes=menuEntryRoutes(map,node);
 delete node.hintsRoute;delete node.practiceRoute;
 if(routes.hints)node.hintsRoute=routes.hints;
 if(routes.practice)node.practiceRoute=routes.practice;
 map.nodes.push(node);
 return node;
}

export function buildServiceMenuMap(data,id=data.id){
 if(!engineIds.includes(id))throw Error('Unknown reviewed fire engine '+id);
 const route='#'+id;
 const limits=list(data.knownLimits||data.limitations).map(text);
 const sources=list(data.sources).map(source=>({...clone(source),totalPdfPages:source.totalPdfPages??source.pages,pageNumbering:source.pageNumbering||'One-based PDF pages. Printed page labels are retained only where recorded; unknown labels are not inferred.'}));
 const modelScope=typeof data.modelScope==='string'?data.modelScope:text(data.modelScope||data.scope||'See the exact source editions.');
 const models=id==='xfp'?['XFP501E/X: single-loop 16-zone Apollo plastic cabinet','XFP502/X: two-loop 32-zone Apollo metal cabinet']:['TWINFLEXpro² eight-zone panel, V3.00+'];
 const map={schemaVersion:1,version:'0.24.0',profileId:id,title:id==='xfp'?'C-TEC XFP 16 / 32 zone':'Fike TWINFLEXpro²',panelModels:models,keypadModels:[],baseline:sources.filter(source=>id==='xfp'?['xfp32','xfp16'].includes(source.id):true).map(source=>source.edition).filter(Boolean).join(' · '),scope:modelScope,sources,engine:{kind:id,route,label:'Open panel emulator',mapKind:'menu'},nodes:[],numbering:{style:'labelled',explanation:'Documented menu labels and access levels retain the cited edition. This reference tree is not a numeric shortcut or an assertion that every entry is simulated.',examples:[],caveats:['Only entries with an explicitly reviewed physical route offer SHOW HINTS.','FINDR practice tasks are listed separately from the manufacturer menu tree.','The fictional training configuration does not establish the configuration of an installed panel.']},navigation:list(data.physicalKeys).map(key=>({keys:key.label||key.id,action:key.description||key.role||'Use this physical control when prompted by the current display and the cited source.'})),coverage:{strategy:'Deterministic projection of every reviewed engine source node, preserving source edition, access, reference status and explicit navigation bindings.',mappedAreas:[],excludedAreas:limits,confidence:'Manufacturer-manual-backed reference and fictional practice. No hardware or firmware certification.',hardwareVerified:false},gaps:limits.map((reason,index)=>({id:'scope-'+index,question:'Does the installed model and revision meet this source boundary?',reason,neededEvidence:'Exact panel model, software/hardware revision and the applicable manufacturer document.',affectedNodeIds:[]})),sourceProjection:{files:[id+'.json'],sourceNodes:list(data.nodes).length,practiceTasks:list(data.lessons).length,contentSha256:contentSha(data)}};
 for(const original of list(data.nodes)){
  const {children,...rest}=clone(original);
  const sourceAccess=original.access??original.minLevel;
  const access=sourceAccess==null?'See the cited access context.':/^[0-9]+[a-z]?$/i.test(String(sourceAccess))?'Access level '+sourceAccess:String(sourceAccess);
  add(map,{...rest,id:original.id,label:original.label||original.title,parentId:original.parentId??null,kind:kindFor(original),simulationStatus:normalStatus(original),access:access+(original.requiresWrite?id==='twinflex'?'; access level 3B with Write Enable is required for changes.':'; write enable is required for changes.':''),notes:[...list(original.notes),...(children?.length?['The trainer may expose shared functions at more than one access level; this map records one canonical parent and the entry’s access requirement.']:[])],sourceRefs:original.sourceRefs,emulatorNodeId:original.id});
 }
 const lessons=list(data.lessons);
 if(lessons.length){
  add(map,{id:'practice-tasks',label:'Guided practice tasks',kind:'reference',simulationStatus:'reference-only',summary:'FINDR exercises on a fictional training site. These are not additional manufacturer menus.',access:'Each lesson states its required controls and access.',sourceRefs:lessons.flatMap(lesson=>[...list(lesson.sourceRefs),...list(lesson.steps).flatMap(step=>list(step.sourceRefs))])});
  for(const lesson of lessons)add(map,{id:'lesson-'+lesson.id,parentId:'practice-tasks',label:lesson.title,kind:'command',simulationStatus:'implemented',summary:lesson.summary||lesson.objective||'Follow the sourced controls on the fictional training site.',access:'Fictional practice scenario; follow the lesson’s access steps.',notes:['FINDR authored practice task, not an additional manufacturer menu. Starting this task explicitly loads its fictional scenario.'],conditions:list(lesson.conditions||lesson.prerequisites),sourceRefs:[...list(lesson.sourceRefs),...list(lesson.steps).flatMap(step=>list(step.sourceRefs))],practiceRoute:route+'/coach/'+encodeURIComponent(lesson.id),hintsRoute:route+'/coach/'+encodeURIComponent(lesson.id),lessonId:lesson.id});
 }
 map.coverage.mappedAreas=['All '+list(data.nodes).length+' reviewed source nodes, including documented access level 3 options.','Reference-only, PC, hardware and unsupported operations remain visibly distinct from supported simulation.',lessons.length+' authored practice tasks, separate from the manufacturer menu tree.'];
 const errors=validateMenuMap(map);if(errors.length)throw Error(id+': '+errors.join('; '));
 return map;
}
export function buildServiceMenuMaps(){return engineIds.map(id=>buildServiceMenuMap(read(id),id));}
export function serviceMapAudit(maps){return {release:'0.24.0',baselineCommit:'b126f5b4c54709aa161416963d0cf9dde91d8d72',method:'Canonical JSON projection of reviewed engine trees; no physical route is inferred. Existing thirteen atlas families are untouched.',maps:maps.map(map=>({id:map.profileId,entries:map.nodes.length,sourceDocuments:map.sources.length,sourceNodes:map.sourceProjection.sourceNodes,practiceTasks:map.sourceProjection.practiceTasks,citedPages:new Set(map.nodes.flatMap(node=>node.sourceRefs.map(ref=>ref.sourceId+':'+ref.pdfPage))).size,statuses:Object.fromEntries(unique(map.nodes.map(node=>node.simulationStatus)).map(status=>[status,map.nodes.filter(node=>node.simulationStatus===status).length])),hintLinks:map.nodes.filter(node=>node.hintsRoute).length,contentSha256:map.sourceProjection.contentSha256})),pageConventions:['Exact sourceRefs and recorded printed page labels are preserved.','Missing printed labels remain “not recorded”; PDF offsets are never guessed.'],hardwareVerified:false};}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const maps=buildServiceMenuMaps(),check=process.argv.includes('--check');
 for(const map of maps){
  const file=join(root,'public/app/data/menu-maps',map.profileId+'.json');
  if(check){if(JSON.stringify(JSON.parse(readFileSync(file,'utf8')))!==JSON.stringify(map))throw Error('Map differs: '+map.profileId);}
  else writeFileSync(file,JSON.stringify(map)+'\n');
 }
 const audit=serviceMapAudit(maps),folder=join(root,'research/fire-service-0.24.0');
 if(!check){mkdirSync(folder,{recursive:true});writeFileSync(join(folder,'service-menu-map-audit.json'),JSON.stringify(audit,null,2)+'\n');}
 console.log(JSON.stringify({checked:check,...audit}));
}
