import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {answerHelper,createHelperConversation} from '../public/app/helpers-engine.mjs';
import {resolveHelperPanelAccess,bindHelperReferenceSources} from '../public/app/helper-panel-access.mjs';
import {renderHelperSources} from '../public/app/helpers-sources.mjs';
const load=file=>JSON.parse(readFileSync(new URL('../public/app/data/'+file,import.meta.url)));
const panelAccess=load('panel-default-access.json'),menuMaps=[load('menu-maps/xfp.json'),load('menu-maps/gent-nano.json'),load('menu-maps/gent-vigilon.json')];
const helper=(brand='Advanced',model='MxPro5',extra={})=>({scope:{kind:'panel',brand,model,...extra},selectedManualIds:[],manualStates:{}});
const code=(question,extra={})=>resolveHelperPanelAccess({helper:helper(),question,data:panelAccess,...extra});
const engine=(text,extra={})=>answerHelper({helper:helper(),conversation:createHelperConversation(),text,panelAccess,menuMaps,modelReadiness:{supported:false},infer:()=>{throw Error('Bundled references must not allocate a model');},...extra});

test('factory defaults retain exact model, role, edition and real source page without inference',async()=>{
 const result=await engine('What is the default engineer code?');
 assert.equal(result.message.coverage,'verified_default_access');assert.equal(result.modelUsed,false);
 assert.match(result.message.text,/Level 3.*7654/);assert.match(result.message.text,/may have been changed/);
 assert.equal(result.message.sourceRefs[0].pdfPage,50);assert.equal(result.message.sourceRefs[0].revision,'680-165 Revision 05');
 assert.equal(result.message.sourceRefs[0].saved,false);assert.equal(result.conversation.messages.length,2);
 assert.equal(code('What is the default user code?').coverage,'default_not_established');
 assert.doesNotMatch(code('What is the default user code?').text,/7654/);
 const four=code('What is the default Level 3 code?',{helper:helper('Advanced','MxPro4')});assert.equal(four.sourceRefs[0].pdfPage,43);
 assert.equal(code('What is the default engineer code?',{helper:helper('Different manufacturer','MxPro5')}).coverage,'default_not_established');
});

test('firmware clarification resumes original code question and excludes Nano V3',async()=>{
 const pal=helper('Gent','Nano'),first=await engine('What is the factory default user code?',{helper:pal});
 assert.equal(first.message.coverage,'access_scope_required');assert.doesNotMatch(first.message.text,/0000/);
 const second=await engine('V2.1',{helper:pal,conversation:first.conversation});
 assert.equal(second.message.coverage,'verified_default_access');assert.match(second.message.text,/0000/);
 assert.equal(second.conversation.context.confirmedFirmware,'V2.1');
 const third=await engine('V3.1',{helper:pal,conversation:first.conversation});
 assert.equal(third.message.coverage,'default_not_established');assert.doesNotMatch(third.message.text,/0000|3333|4444/);
 const unknown=await engine('I don’t know',{helper:pal,conversation:first.conversation});assert.equal(unknown.message.coverage,'default_not_established');
});

test('access facts do not invent unsupported panel codes or cross variant boundaries',()=>{
 assert.equal(code('What is the default code?',{helper:helper('C-TEC','XFP',{variant:'CAST'})}).coverage,'default_not_established');
 assert.equal(code('What is the default code?',{helper:helper('Fike','Twinflexpro')}).coverage,'default_not_established');
 assert.equal(code('What is the default code?',{helper:helper('Fike','TWINFLEXpro²')}).coverage,'verified_default_access');
 assert.doesNotMatch(code('Default code?',{helper:helper('Tyco','Minerva MX2')}).text,/\b\d{4}\b/);
 const sigma=code('Default code?',{helper:helper('Kentec','Sigma CP')});assert.match(sigma.text,/key|switch/);assert.equal(sigma.coverage,'default_not_established');
 assert.equal(code('The panel has a battery fault code E123'),null);
 assert.equal(code('What voltage is normal at the PSU?'),null);
 assert.equal(code('What is the default code on XFP?').coverage,'different_model');
 assert.equal(code('What is the default XFP CAST code?',{helper:helper('C-TEC','XFP')}).coverage,'default_not_established');
 const vigilon=code('What is the default engineer PIN?',{helper:helper('Gent','Vigilon')});assert.match(vigilon.text,/no numeric|No numeric/);assert.equal(vigilon.coverage,'default_not_established');
});

test('saved matching edition opens locally; unsaved publisher citation remains explicitly online',()=>{
 const result=code('Default engineer code?'),ref=result.sourceRefs[0];
 const unsaved=renderHelperSources(result.sourceRefs);assert.match(unsaved,/connection required/);assert.match(unsaved,/#page=50/);assert.doesNotMatch(unsaved,/data-action="helper-source"/);
 const bound=bindHelperReferenceSources(result,[{manualId:'actual-saved-id',contentHash:ref.contentHash}]);
 const html=renderHelperSources(bound.sourceRefs);assert.match(html,/data-id="actual-saved-id" data-page="50"/);assert.doesNotMatch(html,/connection required/);
 assert.equal(bindHelperReferenceSources(result,[{manualId:'wrong-edition',contentHash:'f'.repeat(64)}]).sourceRefs[0].saved,false);
 const hostile=renderHelperSources([{...ref,sourceUrl:'javascript:alert(1)'}],{menuRefs:[{href:'#menus/xfp/walk-test',title:'Walk test'},{href:'javascript:alert(2)'}]});
 assert.doesNotMatch(hostile,/javascript:|alert\(/);assert.match(hostile,/href="#menus\/xfp\/walk-test"/);
});

test('normal answer engine uses bundled map with no saved extract and retains it after reload',async()=>{
 const pal=helper('C-TEC','XFP501E/X'),first=await engine('Where is the walk test menu?',{helper:pal});
 assert.equal(first.message.coverage,'documented_menu_reference');assert.match(first.message.text,/ENGINEER FUNCTIONS → WALK TEST/);
 assert.equal(first.message.menuRefs[0].href,'#menus/xfp/walk-test');assert.equal(first.message.sourceRefs[0].saved,false);
 assert.equal(first.modelUsed,false);assert.match(first.message.text,/map alone does not establish/);
 const next=await engine('Where is that menu?',{helper:pal,conversation:JSON.parse(JSON.stringify(first.conversation))});
 assert.equal(next.message.coverage,'documented_menu_reference');assert.equal(next.conversation.messages.length,4);
 const other=await engine('Where is the walk test menu?',{helper:helper('C-TEC','CFP AlarmSense')});assert.equal(other.message.coverage,'not_established');assert.equal(other.message.menuRefs,undefined);
});

test('missing map variant clarification accepts the answer without another download',async()=>{
 const pal=helper('Gent','Vigilon'),first=await engine('Where is event history?',{helper:pal});assert.equal(first.message.kind,'clarification');
 const next=await engine('VIG1-24',{helper:pal,conversation:first.conversation});assert.equal(next.message.coverage,'documented_menu_reference');assert.equal(next.message.menuRefs[0].profileId,'gent-vigilon');
});
