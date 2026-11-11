// Source-pinned references only: this does not infer a service procedure, an
// access PIN, or physical keystrokes from menu numbers or simulator state.
import {menuBreadcrumbs,normalizeMenuText,prepareMenuMap,searchMenuMaps} from './menu-map-engine.mjs';

export const HELPER_MENU_REFERENCE_VERSION='2026-11-11.1';
const list=value=>Array.isArray(value)?value:[];
const text=value=>typeof value==='string'?value:'';
const key=value=>normalizeMenuText(value).replace(/ /g,'');
const unique=values=>[...new Set(values.filter(Boolean))];
const flat=value=>typeof value==='string'?value:Object.values(value||{}).filter(v=>typeof v==='string').join(' · ');
// These are catalogue bindings to the reviewed map's model scope. Similar
// product names, protocol collections and a manufacturer's name are not enough.
const CATALOGUE_BINDINGS={
 'gent-vigilon-4-6-loop':'gent-vigilon','gent-nano':'gent-nano',
 'c-tec-xfp-16-zone':'xfp','c-tec-xfp-32-zone':'xfp',
 'c-tec-cfp-standard':'c-tec-cfp-standard','kentec-sigma-cp':'kentec-sigma-cp',
 'tyco-minerva-mx':'minerva','tyco-minerva-mx2':'minerva',
 'honeywell-galaxy-dimension':'galaxy-dimension',
};
const ALIASES={
 'gent-vigilon':['Vigilon 4/6 loop','Gent Vigilon 4/6 loop','VIG1-24','VIG1-72'],
 'gent-nano':['Gent Nano','Nano NANO-24','NANO-24'],
 xfp:['XFP501E/X','XFP502/X','XFP 16 Zone','XFP 32 Zone','C-TEC XFP 16 Zone','C-TEC XFP 32 Zone'],
 minerva:['Minerva MX','Minerva MX2','Tyco Minerva MX','Tyco Minerva MX2','MX1000','MX4000','MX4000M','MX2-100','MX2-200'],
 'galaxy-dimension':['Galaxy Dimension','Honeywell Galaxy Dimension'],
 'c-tec-cfp-standard':['C-TEC CFP Standard','CFP Standard'],
 'kentec-sigma-cp':['Kentec Sigma CP','Sigma CP','K11080M2'],
};
const DISALLOWED={
 'gent-vigilon':/\b(?:compact|nano|vigilon plus)\b/,
 'gent-nano':/\b(?:vigilon|compact)\b/,
 xfp:/\b(?:cast|hochiki|cfp|repeater|xfp510)\b/,
 'c-tec-cfp-standard':/\b(?:alarmsense|economy|legacy|xfp|repeater)\b/,
 'kentec-sigma-cp':/\b(?:alarmsense|sigma a cp|sigma cp a|sigma cp r|repeater|sigma xt|sigma zxt)\b/,
 'galaxy-dimension':/\b(?:flex|galaxy g2|touchcenter)\b/,
};
// Named equipment in the request must agree with this pal even when the
// other map was not loaded. These are product-family names, not brand matches.
const FAMILY_MENTIONS={
 'gent-vigilon':/\b(?:vigilon|vig1 24|vig1 72)\b/,
 'gent-nano':/\b(?:gent nano|nano(?: 24)?)\b/,
 xfp:/\bxfp(?:\d+[a-z]*)?\b/,
 'c-tec-cfp-standard':/\bcfp(?:\d+[a-z]*)?\b/,
 'kentec-sigma-cp':/\b(?:sigma|k11080m2)\b/,
 minerva:/\b(?:minerva|mx1000|mx4000m?|mx2(?: 100| 200)?|mx)\b/,
 'galaxy-dimension':/\bgalaxy\b/,
 'texecom-premier-elite':/\bpremier elite\b/,
 'scantronic-ion':/\bi on(?:40h|[0-9]+[a-z]*)?\b/,
 'orisec-cp':/\b(?:orisec|cp (?:25|50|100))\b/,
 'menvier-mseries':/\b(?:menvier|m750|m800|m2000)\b/,
 'pyronix-enforcer':/\benforcer\b/,
 'ade-accenta-optima':/\b(?:accenta|optima)\b/,
 'risco-lightsys2':/\blightsys(?:2| 2)?\b/,
 'hkc-quantum70':/\bquantum(?:70| 70)?\b/,
 twinflex:/\btwinflex(?:pro2?| pro2?)?\b/,
 // Recognisable products with no reviewed map here remain outside the scope.
 'unmapped-mxpro':/\bmxpro(?:4|5| 4| 5)?\b/,
};
function namesOtherPanel(question,map,maps){
 if(Object.entries(FAMILY_MENTIONS).some(([id,pattern])=>id!==map.profileId&&pattern.test(question)))return true;
 const padded=' '+question+' ';
 return maps.some(other=>other.profileId!==map.profileId&&aliases(other).some(alias=>{
  const name=normalizeMenuText(alias);
  return name.length>=4&&padded.includes(' '+name+' ');
 }));
}
function aliases(map){
 const models=list(map.panelModels).map(v=>text(v).split(/:|\s+\(/)[0]);
 return unique([...models,...list(ALIASES[map.profileId])]);
}
function matchedMaps(helper,context,maps){
 const scope=helper?.scope||{};
 if(scope.protocolCollection||scope.kind==='device')return [];
 const model=text(context.confirmedModel)||text(scope.model);
 const candidates=maps.filter(map=>aliases(map).some(alias=>key(alias)===key(model)) ||
   (!context.confirmedModel&&CATALOGUE_BINDINGS[scope.id]===map.profileId));
 return candidates.filter(map=>!DISALLOWED[map.profileId]?.test(normalizeMenuText([model,scope.variant,context.confirmedVariant,scope.protocol].filter(Boolean).join(' '))));
}
function safeSource(source,ref){
 if(!source||!Number.isSafeInteger(ref.pdfPage)||ref.pdfPage<1||source.totalPdfPages&&ref.pdfPage>source.totalPdfPages)return false;
 try{const url=new URL(source.url);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}
}
function referenceSources(map,node){
 const sources=new Map(list(map.sources).map(source=>[source.id,source]));
 return list(node.sourceRefs).filter(ref=>safeSource(sources.get(ref.sourceId),ref)).map(ref=>{
  const source=sources.get(ref.sourceId),printed=String(ref.printedPage??'');
  return {sourceId:source.id,title:source.title||source.id,sourceUrl:source.url,contentHash:source.sha256||'',page:ref.pdfPage,pdfPage:ref.pdfPage,
   printedPage:/^(?:not recorded|unknown)$/i.test(printed)?null:printed||null,revision:source.edition||source.revision||'',section:ref.section||null,
   method:'reviewed-menu-map',authoredBy:'FINDR source-pinned menu map',publisher:source.publisher||'',mapProfileId:map.profileId};
 });
}
function admissible(map,node){
 const path=menuBreadcrumbs(map,node.id);
 return !['selection','setting'].includes(node.kind)&&!['conflict','version-limited'].includes(node.simulationStatus)&&
  !path.some(part=>part.id==='practice-tasks'||/^lesson-/.test(part.id)||/fictional|training|practice pin/i.test(part.access||''))&&
  referenceSources(map,node).length===list(node.sourceRefs).length&&referenceSources(map,node).length>0;
}
function clarify(models,prompt='Which installed model are you using? Its menu route may differ.'){
 return {text:prompt,sourceRefs:[],menuRefs:[],coverage:'variant_required',kind:'clarification',mode:'manual-search',modelUsed:false,
  quickReplies:unique(models),pendingQuestion:{field:'model',key:'menu-map-model',text:prompt}};
}
function taskQuery(question,context){
 let q=normalizeMenuText(question).replace(/\bdevicw\b/g,'device').replace(/\b(?:histry|histroy)\b/g,'history').replace(/\bwalktest\b/g,'walk test');
 if(/^(?:where is that menu|what do i press next|show me the menu|where is that)$/.test(q))q=normalizeMenuText(context.previousQuestion);
 if(!q||/\b(?:default|factory|password|pin|engineer code|access code|wiring|terminals|voltage|resistance|compatible|compatibility)\b/.test(q))return null;
 // A reference to one menu cannot answer a compound service request.
 const operations=[/\bwalk test(?:ing)?\b/,/\b(?:history|event log|alarm memory)\b/,/\b(?:disable|isolate|omit|bypass)\b/,/\b(?:enable|reinstate|re enable)\b/,/\b(?:swap|replace|remove|rewire)\b/].filter(pattern=>pattern.test(q));
 if(operations.length>1)return null;
 if(/\bwalk test\b|\bwalk testing\b/.test(q))return {queries:['walk test'],operation:'walk-test',changesProtection:true};
 if(/\bevent (?:log|history)\b|\b(?:history|alarm memory)\b/.test(q))return {queries:['history','event log'],operation:'event-history',changesProtection:false};
 const action=q.match(/\b(disable|enable|isolate|reinstate|omit|bypass)\b/)?.[1];
 if(action){
  const targets=[['device',/\b(?:device|detector|sensor)s?\b/],['output',/\boutputs?\b/],['sounder',/\bsounders?\b/],['zone',/\bzones?\b/]].filter(([,re])=>re.test(q)).map(([label])=>label);
  if(targets.length!==1)return null;
  const verb=({isolate:'disable',reinstate:'enable',bypass:'omit'}[action]||action);
  return {queries:[verb+' '+targets[0]],operation:verb+'-'+targets[0],changesProtection:true};
 }
 if(!/\b(?:menu|navigate|navigation|display|view|where)\b/.test(q))return null;
 const stop=new Set('a an the how where do does i me my to can find on in is for of please show check get menu menus setting settings what which panel keypad this that at it you system want need navigate navigation reach access open using use view see'.split(' '));
 const query=q.split(' ').filter(word=>!stop.has(word)).join(' ');
 return query?{queries:[query],operation:'menu-lookup',changesProtection:false}:null;
}

/** No model, network or document mutation; caller supplies the bundled maps. */
export function resolveHelperMenuReference({helper,question,menuMaps=[],context={}}={}){
 const task=taskQuery(question,context);if(!task)return null;
 const maps=list(menuMaps).filter(map=>map&&typeof map.profileId==='string'&&Array.isArray(map.nodes)&&Array.isArray(map.sources));
 let candidates=matchedMaps(helper,context,maps);
 const selected=text(context.confirmedModel)||text(helper?.scope?.model);
 const current=normalizeMenuText(question),requested=/^(?:where is that menu|what do i press next|show me the menu|where is that)$/.test(current)?normalizeMenuText(context.previousQuestion):current;
 if(!candidates.length){
  // This family label spans materially different panel routes. Do not silently
  // borrow the classic map for Compact, Plus or another named family.
  if(/^(?:gent )?vigilon$/i.test(selected)&&maps.some(map=>map.profileId==='gent-vigilon'))return clarify(['VIG1-24 / VIG1-72','Vigilon Compact','Vigilon Plus'],'Is this the classic VIG1-24 / VIG1-72, Vigilon Compact, or Vigilon Plus? The mapped routes differ.');
  if(/^(?:c-tec )?xfp$/i.test(selected)&&maps.some(map=>map.profileId==='xfp'))return clarify(['XFP501E/X','XFP502/X','Another XFP variant'],'Which XFP model and protocol are installed? This map covers XFP501E/X and XFP502/X Apollo variants.');
  return null;
 }
 if(candidates.length>1)return clarify(unique(candidates.flatMap(map=>list(map.panelModels))));
 const map=candidates[0];
 if(DISALLOWED[map.profileId]?.test(requested)||namesOtherPanel(requested,map,maps))return null;
 // A known incompatible firmware remains unsupported; omitting firmware never
 // upgrades this archived reference into a claim about the installed panel.
 const firmware=text(context.confirmedFirmware)||text(helper?.scope?.firmware);
 const major=firmware.match(/(?:^|\b)v?(\d+)\./i)?.[1]||firmware.match(/^v?(\d+)$/i)?.[1];
 const expected={'gent-nano':'3',minerva:'5','pyronix-enforcer':'11'}[map.profileId];
 if(major&&expected&&major!==expected)return null;
 let prepared;try{prepared=prepareMenuMap({...map,keypadModels:list(map.keypadModels),panelModels:list(map.panelModels)});}catch{return null;}
 let matches=[],matchedQuery='';
 for(const query of task.queries){
  matches=searchMenuMaps([prepared],query).filter(result=>{
   if(!admissible(prepared,result.node))return false;
   const labels=normalizeMenuText(result.path.map(part=>part.label).join(' '));
   if(task.operation==='event-history'&&/\b(?:print|printer|triggers|access authori|menu access)\b/.test(labels))return false;
   if(/^(?:disable|enable|omit)-/.test(task.operation)){
    const [action,target]=task.operation.split('-');
    const verbs={disable:/\b(?:disable|disablement|disablements|isolate)\b/,enable:/\b(?:enable|restore|deisolate|de isolate)\b/,omit:/\bomit\b/};
    const targets={device:/\b(?:device|devices|detector|detectors|sensor|sensors|sensing|point|points)\b/,output:/\boutputs?\b/,sounder:/\bsounders?\b/,zone:/\bzones?\b/};
    if(!verbs[action].test(labels)||!targets[target].test(labels))return false;
   }
   return true;
  });
  matchedQuery=query;
  if(matches.length)break;
 }
 if(!matches.length)return null;
 // Prefer the named operation's menu over a command that immediately starts,
 // stops or changes it, and never turn a numerical reference into keystrokes.
 const exact=matches.filter(result=>task.operation==='event-history'?/^(?:history|historic|display log|event log|event history|event log functions)$/.test(normalizeMenuText(result.node.label)):normalizeMenuText(result.node.label)===normalizeMenuText(matchedQuery));
 const result=(exact.length?exact:matches).find(result=>result.node.kind==='menu')||(exact.length?exact:matches)[0];
 const {node}=result,path=menuBreadcrumbs(prepared,node.id),pathLabels=path.map(part=>part.label);
 const sourceRefs=referenceSources(prepared,node);
 const revision=map.sourceProjection?.contentSha256||map.revision||map.verifiedAt||flat(map.baseline);
 const menuRef={profileId:map.profileId,nodeId:node.id,title:node.label,mapTitle:map.title,mapRevision:revision,
  href:'#menus/'+encodeURIComponent(map.profileId)+'/'+encodeURIComponent(node.id),baseline:flat(map.baseline),models:list(map.panelModels),authoredBy:'FINDR source-pinned menu map'};
 const constraints=unique(path.flatMap(part=>list(part.conditions))).filter(value=>!/(?:fictional|practice|trainer)/i.test(String(value)));
 const lines=["I found a matching reference in FINDR’s documented menu map.",map.title+' · '+flat(map.baseline),
  'Mapped reference: '+pathLabels.join(' → '),node.access?'Access: '+node.access:null,...constraints];
 if(task.changesProtection)lines.push('This locates the menu only. Before starting the test or changing protection, use the cited procedure to check authorisation, monitoring arrangements, system effects and restoration. The map alone does not establish those precautions.');
 else lines.push('These are mapped menu labels, not a complete key-by-key sequence. Check the cited edition against the installed panel.');
 lines.push('Open the menu reference for its source pages and any available hints.');
 return {text:lines.filter(Boolean).join('\n\n'),sourceRefs,menuRefs:[menuRef],coverage:'documented_menu_reference',kind:'menu_reference',mode:'manual-search',modelUsed:false,operation:task.operation,quickReplies:[],referenceVersion:HELPER_MENU_REFERENCE_VERSION};
}
