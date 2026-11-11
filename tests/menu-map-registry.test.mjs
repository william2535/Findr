import test from 'node:test';
import assert from 'node:assert/strict';
import {MENU_MAP_FAMILIES,menuMapFamily,menuMapType,menuEntryRoutes,menuSimulationLabel} from '../public/app/menu-map-registry.mjs';
import {createMenuMapController} from '../public/app/menu-map.mjs';
import {prepareMenuMap,searchMenuMaps,menuReferenceText} from '../public/app/menu-map-engine.mjs';

test('menu registry covers exactly the current nine keypads and seven fire engines with explicit independent routes',()=>{
 assert.equal(MENU_MAP_FAMILIES.length,16);assert.equal(new Set(MENU_MAP_FAMILIES.map(f=>f.id)).size,16);
 assert.equal(MENU_MAP_FAMILIES.filter(f=>f.kind==='keypad').length,9);
 assert.equal(menuMapFamily('gent-vigilon').route,'#gent');assert.equal(menuMapFamily('gent-nano').route,'#nano');
 assert.equal(menuMapFamily('c-tec-cfp-standard').route,'#fire-panel/c-tec-cfp-standard');assert.equal(menuMapFamily('kentec-sigma-cp').route,'#fire-panel/kentec-sigma-cp');
 assert.equal(menuMapFamily('xfp').route,'#xfp');assert.equal(menuMapFamily('twinflex').route,'#twinflex');assert.equal(menuMapFamily('minerva').route,'#minerva');
 assert.equal(menuMapFamily('kentec-sigma-xt'),null);assert.equal(menuMapFamily('gent'),null,'A runtime alias must be explicitly normalized by its caller');
 assert.equal(menuMapType({profileId:'c-tec-cfp-standard'}),'Controls & configuration');
});

test('fire map hints only expose explicit supported routes to that exact engine',()=>{
 const map={profileId:'gent-vigilon'},node={id:'view-log',kind:'menu',simulationStatus:'implemented',hintsRoute:'#gent/guided/view-log'};
 assert.deepEqual(menuEntryRoutes(map,node),{practice:null,hints:'#gent/guided/view-log'});
 for(const simulationStatus of ['reference-only','conditional','conflict','version-limited','unreviewed',undefined])assert.deepEqual(menuEntryRoutes(map,{...node,simulationStatus}),{practice:null,hints:null});
 for(const hintsRoute of ['#nano/guided/view-log','#emulator/gent-vigilon/view-log/hints','#gent/view-log','https://example.org','#gent/guided/view-log?run=true','javascript:alert(1)'])assert.equal(menuEntryRoutes(map,{...node,hintsRoute}).hints,null,hintsRoute);
 assert.equal(menuEntryRoutes(map,{...node,kind:'reference'}).hints,null);
 assert.deepEqual(menuEntryRoutes({profileId:'unverified-model'},node),{practice:null,hints:null});
});

test('supported conventional configuration effects do not invent per-code navigation or hints',()=>{
 const map={profileId:'kentec-sigma-cp'},node={id:'config-29',kind:'setting',simulationStatus:'implemented'};
 assert.deepEqual(menuEntryRoutes(map,node),{practice:null,hints:null});
 assert.deepEqual(menuEntryRoutes(map,{...node,practiceRoute:'#fire-panel/kentec-sigma-cp/coach/engineering',hintsRoute:'#fire-panel/kentec-sigma-cp/coach/engineering'}),{practice:'#fire-panel/kentec-sigma-cp/coach/engineering',hints:'#fire-panel/kentec-sigma-cp/coach/engineering'});
 assert.equal(menuEntryRoutes(map,{...node,hintsRoute:'#fire-panel/c-tec-cfp-standard/coach/engineering'}).hints,null);
 assert.equal(menuEntryRoutes(map,{...node,hintsRoute:'#fire-panel/kentec-sigma-cp/code/29'}).hints,null);
});

test('existing keypad references retain their correct emulator while reference-only entries have no SHOW HINTS route',()=>{
 const map={profileId:'galaxy-dimension'},node={id:'galaxy-51.46',kind:'setting'};
 assert.deepEqual(menuEntryRoutes(map,node),{practice:'#emulator/galaxy-dimension/galaxy-51.46',hints:'#emulator/galaxy-dimension/galaxy-51.46/hints'});
 assert.equal(menuEntryRoutes(map,{...node,kind:'reference'}).hints,null);
 assert.equal(menuSimulationLabel({simulationStatus:'version-limited'}),'Other version reference');assert.equal(menuSimulationLabel({kind:'reference'}),'Reference only');
});

test('global fire search preserves device versus zone scope while intruder omission phrases keep their existing behaviour',()=>{
 const family=menuMapFamily('gent-vigilon'),source=syntheticMap(family),base=source.nodes[0];
 source.nodes=[{...base,id:'device',kind:'command',label:'Disable device',summary:'Selected addressable device only'}, {...base,id:'zone',kind:'command',label:'Disable zone',summary:'Whole zone only'}];
 const map=prepareMenuMap(source);assert.deepEqual(searchMenuMaps([map],'disable device').map(hit=>hit.node.id),['device']);assert.deepEqual(searchMenuMaps([map],'disable zone').map(hit=>hit.node.id),['zone']);
 source.nodes[0]={...source.nodes[0],simulationStatus:'version-limited'};assert.match(menuReferenceText(source,source.nodes[0]),/Trainer status: Other version reference/);
});
test('named fire controls such as SW8 stay whole identifiers rather than becoming a menu number',()=>{
 const source=syntheticMap(menuMapFamily('c-tec-cfp-standard')),base=source.nodes[0];
 source.nodes=[{...base,id:'sw8',label:'SW8 — Access level three functions',kind:'command'},{...base,id:'sw80',label:'SYNTHETIC SW80 different control',kind:'command'},{...base,id:'eight',label:'SYNTHETIC unrelated field',kind:'setting',code:'8'}];
 const map=prepareMenuMap(source);assert.deepEqual(searchMenuMaps([map],'CFP SW8').map(hit=>hit.node.id),['sw8']);assert.deepEqual(searchMenuMaps([map],'SW80').map(hit=>hit.node.id),['sw80']);assert.equal(searchMenuMaps([map],'8')[0].node.id,'eight');
});
test('fire code suffixes and contextual access levels stay distinct from bare numeric menu lookups',()=>{
 const source=syntheticMap(menuMapFamily('kentec-sigma-cp')),base=source.nodes[0];
 source.nodes=[...['00','2A','2','d1','db','Ad'].map((code,i)=>({...base,id:'code-'+code,label:'SYNTHETIC code '+code,kind:'setting',code,order:i})),{...base,id:'level3',label:'Access level 3 functions',kind:'menu',access:'Access level 3'},{...base,id:'minutes3',label:'Sounder delay: 3 minutes',kind:'setting',code:'3',access:'Access level 3'}];
 const map=prepareMenuMap(source);
 for(const code of ['00','2A','d1','db','Ad'])assert.equal(searchMenuMaps([map],code)[0]?.node.id,'code-'+code,code);
 assert.equal(searchMenuMaps([map],'2a')[0]?.node.id,'code-2A');assert.equal(searchMenuMaps([map],'level 3')[0]?.node.id,'level3');assert.equal(searchMenuMaps([map],'level3')[0]?.node.id,'level3');assert.equal(searchMenuMaps([map],'3')[0]?.node.id,'minutes3');
 assert.deepEqual(searchMenuMaps([map],'2B'),[]);assert.deepEqual(searchMenuMaps([map],'level 4'),[]);
});

function syntheticMap(family){return {profileId:family.id,title:family.title,baseline:'SYNTHETIC source edition',scope:'SYNTHETIC integration fixture only',panelModels:[family.title],keypadModels:[],sources:[{id:'source',edition:'SYNTHETIC edition',title:'SYNTHETIC manual',url:'https://example.org/source.pdf'}],numbering:{style:family.mapKind==='controls'?'controls':'labelled',explanation:'SYNTHETIC',examples:[],caveats:[]},navigation:[],coverage:{strategy:'SYNTHETIC',mappedAreas:[],excludedAreas:[],confidence:'SYNTHETIC'},gaps:[],nodes:[{id:'reference',label:'SYNTHETIC reference',kind:'reference',order:1,parentId:null,sourceRefs:[{sourceId:'source',pdfPage:2,printedPage:'2'}],simulationStatus:'reference-only',hintsRoute:family.route+'/guided/reference',practiceRoute:family.route+'/coach/reference'},{id:'supported',label:'SYNTHETIC supported behaviour',kind:'setting',order:2,parentId:null,sourceRefs:[{sourceId:'source',pdfPage:3,printedPage:'3'}],simulationStatus:'implemented'}]};}
async function withController(run){
 const priorFetch=globalThis.fetch,priorLocation=globalThis.location,calls=[],listeners={};
 const app={innerHTML:'',addEventListener(name,fn){listeners[name]=fn;},querySelector(){return null;}};
 globalThis.fetch=async url=>{calls.push(url);const family=MENU_MAP_FAMILIES.find(f=>url.endsWith('/'+f.id+'.json'));assert.ok(family,'Fetch only explicit known map');return {ok:true,json:async()=>syntheticMap(family)};};
 globalThis.location={hash:'#menus'};
 try{await run({app,calls,controller:createMenuMapController({app,profiles:[],toast:()=>{}})});}finally{globalThis.fetch=priorFetch;if(priorLocation===undefined)delete globalThis.location;else globalThis.location=priorLocation;}
}
test('menu landing loads every current engine, shows dynamic family counts and distinguishes conventional maps',async()=>withController(async({app,calls,controller})=>{
 await controller.render();assert.equal(calls.length,16);assert.equal((app.innerHTML.match(/class="menu-map-card"/g)||[]).length,16);assert.match(app.innerHTML,/16 emulator families/);assert.match(app.innerHTML,/All 16 families/);assert.match(app.innerHTML,/Fire panels/);assert.match(app.innerHTML,/Intruder keypads/);assert.match(app.innerHTML,/Controls &amp; configuration/);assert.doesNotMatch(app.innerHTML,/4 panel families/);
}));
test('fire map details render source status without fabricated keypad links or unverified action buttons',async()=>withController(async({app,controller})=>{
 globalThis.location.hash='#menus/kentec-sigma-cp/reference';await controller.render('kentec-sigma-cp','reference');assert.match(app.innerHTML,/Reference only/);assert.match(app.innerHTML,/No verified interactive route is linked/);assert.doesNotMatch(app.innerHTML,/SHOW HINTS|#emulator\/kentec-sigma-cp|href="#fire-panel\/kentec-sigma-cp\/coach/);
 globalThis.location.hash='#menus/kentec-sigma-cp';await controller.render('kentec-sigma-cp');assert.match(app.innerHTML,/href="#fire-panel\/kentec-sigma-cp"/);assert.match(app.innerHTML,/Open panel emulator/);assert.doesNotMatch(app.innerHTML,/#emulator\/kentec-sigma-cp/);
 globalThis.location.hash='#menus/kentec-sigma-cp/supported';await controller.render('kentec-sigma-cp','supported');assert.match(app.innerHTML,/Supported in trainer/);assert.match(app.innerHTML,/step-by-step route is not linked/);assert.doesNotMatch(app.innerHTML,/SHOW HINTS/);
}));
