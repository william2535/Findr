// Explicit engine bindings. A shared brand or similar model name is not a route.
export const MENU_MAP_FAMILIES = Object.freeze([
 {id:'gent-vigilon',title:'Gent Vigilon 4/6 loop',kind:'gent',route:'#gent',mapKind:'menu',category:'fire'},
 {id:'gent-nano',title:'Gent Nano V3.xx',kind:'nano',route:'#nano',mapKind:'menu',category:'fire'},
 {id:'c-tec-cfp-standard',title:'C-TEC CFP Standard',kind:'conventional',route:'#fire-panel/c-tec-cfp-standard',mapKind:'controls',category:'fire'},
 {id:'kentec-sigma-cp',title:'Kentec Sigma CP',kind:'conventional',route:'#fire-panel/kentec-sigma-cp',mapKind:'controls',category:'fire'},
 {id:'xfp',title:'C-TEC XFP 16 / 32 zone',kind:'xfp',route:'#xfp',mapKind:'menu',category:'fire'},
 {id:'twinflex',title:'Fike TWINFLEXpro²',kind:'twinflex',route:'#twinflex',mapKind:'menu',category:'fire'},
 {id:'minerva',title:'Tyco Minerva MX / MX2',kind:'minerva',route:'#minerva',mapKind:'menu',category:'fire'},
 ...[
  ['galaxy-dimension','Galaxy Dimension'],['texecom-premier-elite','Texecom Premier Elite'],
  ['scantronic-ion','Scantronic i-on'],['orisec-cp','Orisec CP'],['menvier-mseries','Menvier M750 / M800'],
  ['pyronix-enforcer','Pyronix Enforcer V11'],['ade-accenta-optima','Accenta / Optima G4 LCD'],
  ['risco-lightsys2','Risco LightSYS2'],['hkc-quantum70','HKC Quantum70 V4']
 ].map(([id,title])=>({id,title,kind:'keypad',route:'#emulator/'+id,mapKind:'menu',category:'security'}))
].map(Object.freeze));
const byId=new Map(MENU_MAP_FAMILIES.map(family=>[family.id,family]));
export const menuMapFamily = value => byId.get(typeof value==='string'?value:value?.profileId)||null;
export const menuMapType = map => menuMapFamily(map)?.mapKind==='controls'?'Controls & configuration':menuMapFamily(map)?.kind==='keypad'?'Keypad menus':'Panel menus';
const referenceStates=new Set(['reference-only','conditional','conflict','version-limited']);
const routeToken='[a-zA-Z0-9][a-zA-Z0-9._~-]*';
function explicitRoute(family,route){
 if(typeof route!=='string')return null;
 const root=['gent','nano','xfp','twinflex','minerva'].includes(family.kind)?family.kind:null;
 const pattern=root?new RegExp('^#'+root+'/(guided|coach)/'+routeToken+'$'):family.kind==='conventional'?new RegExp('^#fire-panel/'+family.id+'/coach/'+routeToken+'$'):null;
 return pattern?.test(route)?route:null;
}
export function menuEntryRoutes(map,node){
 const family=menuMapFamily(map);if(!family||!node?.id)return {practice:null,hints:null};
 if(family.kind==='keypad'){
  const practice=family.route+'/'+encodeURIComponent(node.id);
  return {practice,hints:node.kind==='reference'||referenceStates.has(node.simulationStatus)?null:practice+'/hints'};
 }
 // Fire routes must be source-reviewed and individually bound. A supported
 // configuration effect alone does not establish a physical navigation route.
 if(node.simulationStatus!=='implemented'||node.kind==='reference')return {practice:null,hints:null};
 return {practice:explicitRoute(family,node.practiceRoute),hints:explicitRoute(family,node.hintsRoute)};
}
export function menuSimulationLabel(node){
 return ({implemented:'Supported in trainer','reference-only':'Reference only',conditional:'Configuration dependent',conflict:'Source conflict','version-limited':'Other version reference'}[node?.simulationStatus]|| (node?.kind==='reference'?'Reference only':''));
}
