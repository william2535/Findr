// Project the source-reviewed Minerva MX/MX2 tree into the shared menu atlas.
// Only explicit engine-reviewed links are copied; labels alone never grant a route.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {validateMenuMap} from '../public/app/menu-map-engine.mjs';
import {menuEntryRoutes} from '../public/app/menu-map-registry.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const list=value=>Array.isArray(value)?value:[];
const clone=value=>structuredClone(value);
const text=value=>typeof value==='string'?value:value?.summary||value?.description||value?.note||value?.reason||JSON.stringify(value);
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const statuses=new Set(['implemented','reference-only','conditional','conflict','version-limited']);
function refs(values){
 const result=[];
 for(const ref of list(values))for(const page of list(ref.pages).length?ref.pages:[ref.pdfPage]){
  if(!Number.isInteger(page))throw Error('Missing reviewed Minerva PDF page: '+JSON.stringify(ref));
  const value={...clone(ref),pdfPage:page,printedPage:ref.printedPage??'not recorded'};delete value.pages;
  if(!result.some(item=>JSON.stringify(item)===JSON.stringify(value)))result.push(value);
 }
 return result;
}
function kind(node){
 if(node.simulationStatus!=='implemented'||node.kind==='reference')return 'reference';
 if(['root','menu'].includes(node.kind))return 'menu';
 if(['display','status','information'].includes(node.kind))return 'status';
 if(['setting','toggle','code','time','value','form'].includes(node.kind))return 'setting';
 if(node.kind==='selection')return 'selection';
 return 'command';
}
function add(map,input){
 const node={parentId:null,order:map.nodes.length,code:null,address:null,aliases:[],notes:[],conditions:[],...input,sourceRefs:refs(input.sourceRefs)};
 const links=menuEntryRoutes(map,node);delete node.practiceRoute;delete node.hintsRoute;
 if(links.practice)node.practiceRoute=links.practice;if(links.hints)node.hintsRoute=links.hints;
 map.nodes.push(node);return node;
}
export function buildMinervaMenuMap(data){
 const sources=list(data.sources).map(source=>({...clone(source),totalPdfPages:source.totalPdfPages??source.pages}));
 const boundaries=list(data.boundaries),limits=list(data.knownLimits||data.limitations||data.boundaries).map(text);
 const map={schemaVersion:1,version:'0.28.0',profileId:'minerva',title:'Tyco Minerva MX / MX2',panelModels:list(data.panelModels).length?clone(data.panelModels):list(data.models).flatMap(model=>list(model.variants)),keypadModels:[],baseline:sources.map(source=>source.edition||source.revision||source.title).join(' · '),scope:text(data.modelScope||data.scope),sources,engine:{kind:'minerva',route:'#minerva',label:'Open Minerva emulator',mapKind:'menu'},nodes:[],numbering:{style:'labelled',explanation:'Numbers and F-key labels are local to the documented screen. This hierarchy is not a single continuous shortcut. Operator and Manager access levels follow the cited edition.',examples:[],caveats:['Match the panel and software to the cited operating manual.','Guided routes use the actual displayed menu and physical controls.','Source-only procedures retain their boundaries; a listed label is not an implemented engineering procedure.']},navigation:list(data.physicalKeys).map(key=>({keys:key.label||key.id,action:key.description||key.role||key.hint||'Use this physical control when indicated by the display and the cited source.'})),coverage:{strategy:'Deterministic projection of every reviewed Minerva source node with explicit simulated routes, source pages and access requirements.',mappedAreas:[],excludedAreas:limits,confidence:'Manufacturer-manual-backed menu reference with fictional training data; not hardware or firmware certification.',hardwareVerified:false},gaps:limits.map((reason,index)=>({id:boundaries[index]?.id||'scope-'+index,title:'Check the applicable model and procedure',question:'Does the installed panel and edition meet this source boundary?',reason,neededEvidence:'Exact model, firmware, site configuration and the applicable manufacturer document.',affectedNodeIds:boundaries[index]?.nodeId?[boundaries[index].nodeId]:[]})),sourceProjection:{files:['minerva-mx.json'],sourceNodes:list(data.nodes).length,practiceTasks:list(data.lessons).length,contentSha256:digest(data)}};
 for(const original of list(data.nodes)){
  const {children,...node}=clone(original);
  add(map,{...node,id:node.id,label:node.label||node.title,parentId:node.parentId??null,kind:kind(node),simulationStatus:statuses.has(node.simulationStatus)?node.simulationStatus:'reference-only',code:node.code??(/^\d+$/.test(String(node.key))?String(node.key):null),access:node.access||'See the cited access context.',notes:[...list(node.notes),...(/^F[1-5]$/.test(node.key||'')?['Use softkey '+node.key+' from the documented parent screen; its action follows the displayed label.']:[])],summary:node.summary||node.hint||'',emulatorNodeId:node.id});
 }
 const lessons=list(data.lessons);
 if(lessons.length){
  add(map,{id:'practice-tasks',label:'Guided practice tasks',kind:'reference',simulationStatus:'reference-only',summary:'FINDR-authored exercises on a fictional site; these are not additional manufacturer menus.',access:'Each task follows its documented access requirements.',sourceRefs:lessons.flatMap(lesson=>[...list(lesson.sourceRefs),...list(lesson.steps).flatMap(step=>list(step.sourceRefs))])});
  for(const lesson of lessons){
   const route='#minerva/coach/'+encodeURIComponent(lesson.id);
   add(map,{id:'lesson-'+lesson.id,parentId:'practice-tasks',label:lesson.title,kind:'command',simulationStatus:'implemented',summary:lesson.summary||lesson.description||'Follow the sourced controls on the fictional training panel.',access:'Fictional practice setup; follow the documented access steps.',notes:['FINDR-authored practice task, not an additional manufacturer menu. Starting a task deliberately loads a fictional scenario.'],conditions:list(lesson.prerequisites),sourceRefs:[...list(lesson.sourceRefs),...list(lesson.steps).flatMap(step=>list(step.sourceRefs))],lessonId:lesson.id,practiceRoute:route,hintsRoute:route});
  }
 }
 map.coverage.mappedAreas=[`${list(data.nodes).length} reviewed source entries, retaining their exact labels and source pages.`,`${lessons.length} authored practice tasks, kept separate from the manufacturer tree.`,'Reference-only entries remain searchable without an invented interactive route.'];
 const errors=validateMenuMap(map);if(errors.length)throw Error('Minerva map: '+errors.join('; '));
 return map;
}
export function minervaMapAudit(map){return {release:'0.28.0',profileId:map.profileId,entries:map.nodes.length,sourceNodes:map.sourceProjection.sourceNodes,practiceTasks:map.sourceProjection.practiceTasks,sourceDocuments:map.sources.length,sourcePages:[...new Set(map.nodes.flatMap(node=>node.sourceRefs.map(ref=>ref.pdfPage)))].sort((a,b)=>a-b),hintLinks:map.nodes.filter(node=>node.hintsRoute).length,referenceOnly:map.nodes.filter(node=>node.simulationStatus==='reference-only').map(node=>node.id),sourceContentSha256:map.sourceProjection.contentSha256,hardwareVerified:false};}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const data=JSON.parse(readFileSync(join(root,'public/app/data/minerva-mx.json'),'utf8')),map=buildMinervaMenuMap(data),file=join(root,'public/app/data/menu-maps/minerva.json'),check=process.argv.includes('--check');
 if(check){if(JSON.stringify(JSON.parse(readFileSync(file,'utf8')))!==JSON.stringify(map))throw Error('Minerva map differs from source projection');}
 else{writeFileSync(file,JSON.stringify(map)+'\n');const folder=join(root,'research/minerva-0.28.0');mkdirSync(folder,{recursive:true});writeFileSync(join(folder,'menu-map-audit.json'),JSON.stringify(minervaMapAudit(map),null,2)+'\n');}
 console.log(JSON.stringify({checked:check,...minervaMapAudit(map)}));
}
