import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveHelperMenuReference as resolve} from '../public/app/helpers-menu-reference.mjs';

const load=id=>JSON.parse(readFileSync(new URL('../public/app/data/menu-maps/'+id+'.json',import.meta.url)));
const menuMaps=['gent-vigilon','gent-nano','galaxy-dimension','xfp','minerva','c-tec-cfp-standard'].map(load);
const helper=(model,extra={})=>({scope:{model,...extra}});
const answer=(model,question,extra={})=>resolve({helper:helper(model),question,menuMaps,...extra});

test('an exact panel gets a source-pinned reference, not manufactured keystrokes',()=>{
 const result=answer('XFP501E/X','Where is the walktest menu?');
 assert.equal(result.coverage,'documented_menu_reference');
 assert.equal(result.modelUsed,false);
 assert.equal(result.menuRefs[0].href,'#menus/xfp/walk-test');
 assert.equal(result.menuRefs[0].mapRevision,load('xfp').sourceProjection.contentSha256);
 assert.match(result.text,/ENGINEER FUNCTIONS → WALK TEST/);
 assert.match(result.text,/Access level 3/);
 assert.match(result.text,/map alone does not establish those precautions/);
 assert.ok(result.sourceRefs.some(ref=>ref.pdfPage===29&&ref.revision==='DFU2200510 Rev 2'));
 assert.ok(result.sourceRefs.every(ref=>ref.sourceUrl.startsWith('https:')&&!ref.manualId&&ref.authoredBy));
 assert.doesNotMatch(result.text,/press 29|type 29|2468/);
});

test('device typo is bounded to the documented device route; a read-only details page is not disablement',()=>{
 const result=answer('XFP501E/X','How to disable a devicw');
 assert.equal(result.menuRefs[0].nodeId,'disable-devices');
 assert.match(result.text,/locates the menu only/);
 assert.equal(answer('Gent Nano','How to disable a devicw'),null);
});

test('history resolves to historical display, never print-report or active-log settings',()=>{
 assert.equal(answer('Galaxy Dimension','Where is the event histroy menu?').menuRefs[0].nodeId,'galaxy-22');
 assert.equal(answer('VIG1-24','How do I view history?').menuRefs[0].nodeId,'path-info-historic-4f17ae3b');
 assert.equal(answer('Gent Nano','Where is event history?').menuRefs[0].nodeId,'path-logs-historic-c81a2a78');
});

test('source map family never crosses Gent and C-TEC variants or inferred manufacturer membership',()=>{
 for(const model of ['Gent Vigilon Compact','Gent Vigilon Plus','XFP CAST 16 Zone','CFP AlarmSense','MxPro5','Honeywell','Apollo XP95'])assert.equal(answer(model,'Where is walk test?'),null,model);
 assert.equal(answer('Gent Nano','Where is walk test on Gent Vigilon?'),null);
 assert.equal(answer('XFP501E/X','Where is the CFP walk test?'),null);
 assert.equal(answer('Gent Nano','Where is walk test?',{helper:helper('Gent Nano',{firmware:'V2.1'})}),null);
 assert.equal(answer('MX1000','Where is walk test?',{helper:helper('MX1000',{firmware:'6.0'})}),null);
});

test('generic family asks a focused model question; confirmed context selects an exact scope',()=>{
 const broad=answer('Gent Vigilon','Where is walk test?');
 assert.equal(broad.kind,'clarification');assert.equal(broad.coverage,'variant_required');
 assert.equal(broad.menuRefs.length,0);assert.equal(broad.pendingQuestion.field,'model');
 const specific=answer('Gent Vigilon','Where is walk test?',{context:{confirmedModel:'VIG1-24'}});
 assert.equal(specific.menuRefs[0].profileId,'gent-vigilon');
 assert.equal(answer('XFP','Where is walk test?').kind,'clarification');
});

test('compound service requests, default codes and unverified measurements stay outside this fallback',()=>{
 for(const question of ['Disable outputs, disable the device, swap it, then re-enable it','How do I walk test then disable a device?','Where is walk test and the history menu?','What is the default engineer code?','What voltage should the panel output be?','Which terminals do I wire?'])assert.equal(answer('XFP501E/X',question),null,question);
});

test('follow-up retains the prior operation within the current exact model only',()=>{
 const result=answer('XFP501E/X','Where is that menu?',{context:{previousQuestion:'How do I disable a device?'}});
 assert.equal(result.menuRefs[0].nodeId,'disable-devices');
 assert.equal(answer('MxPro5','Where is that menu?',{context:{previousQuestion:'How do I disable a device?'}}),null);
});

test('practice branch, conflicting sources and invalid source page are not accepted',()=>{
 for(const mutate of [
  map=>{map.nodes.find(n=>n.id==='walk-test').simulationStatus='conflict';},
  map=>{map.nodes.find(n=>n.id==='walk-test').simulationStatus='version-limited';},
  map=>{map.nodes.find(n=>n.id==='walk-test').sourceRefs[0].pdfPage=9999;},
  map=>{map.nodes.find(n=>n.id==='walk-test').sourceRefs=[];},
 ]){
  const map=load('xfp');mutate(map);
  assert.equal(answer('XFP501E/X','Where is walk test?',{menuMaps:[map]}),null);
 }
});

test('no code field or dotted option address is emitted as a physical shortcut',()=>{
 const result=answer('Galaxy Dimension','Where is the history menu?');
 assert.match(result.text,/Display Log/);
 assert.doesNotMatch(result.text,/50\.22|type 22|press 22/);
 assert.ok(result.sourceRefs.some(ref=>ref.page===90&&ref.printedPage==='6-16'));
});

test('catalogue binding uses exact panel ID, not a brand or helper name',()=>{
 assert.equal(resolve({helper:helper('MINERVA MX (MX1000 / MX4000 / MX4000M)',{id:'tyco-minerva-mx'}),question:'Where is walk test?',menuMaps}).menuRefs[0].profileId,'minerva');
 assert.equal(resolve({helper:{name:'Gent Nano',scope:{model:'Unknown panel',brand:'Gent'}},question:'Where is walk test?',menuMaps}),null);
 assert.equal(resolve({helper:helper('Gent Nano',{protocolCollection:true}),question:'Where is walk test?',menuMaps}),null);
});

test('an explicitly named foreign panel never borrows this pal’s map, including unloaded families',()=>{
 for(const [model,question] of [
  ['Gent Nano','Where is the XFP walk test menu?'],
  ['XFP501E/X','Where is the Sigma walk test menu?'],
  ['XFP501E/X','Where is walk test on the Kentec Sigma CP?'],
  ['Gent Nano','Where is the MxPro5 event history menu?'],
  ['MX1000','Where is the Texecom Premier Elite history menu?'],
  ['Galaxy Dimension','Where is the TWINFLEXpro2 walk test menu?'],
 ])assert.equal(answer(model,question),null,model+': '+question);
 assert.equal(answer('Gent Nano','Where is that menu?',{context:{previousQuestion:'Where is the XFP walk test menu?'}}),null);
 assert.equal(answer('Gent Nano','Where is the XFP walk test menu?',{menuMaps:[load('gent-nano')]}),null);
 assert.equal(answer('XFP501E/X','Where is the XFP walk test menu?').menuRefs[0].profileId,'xfp');
});

test('publisher links require HTTPS without embedded credentials',()=>{
 for(const url of ['http://manufacturer.invalid/manual.pdf','https://user:password@manufacturer.invalid/manual.pdf']){
  const map=load('xfp');map.sources.find(source=>source.id==='xfp32').url=url;
  assert.equal(answer('XFP501E/X','Where is walk test?',{menuMaps:[map]}),null);
 }
});
