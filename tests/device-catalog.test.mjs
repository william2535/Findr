import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {filterDevices,filterDevicePacks,devicePackStatus,devicePackOnlineReferences,sortDevicePacks,createDeviceController,matchImportedDocument} from '../public/app/devices.mjs';

const devices=[
  {id:'apollo-xp95',brand:'Apollo',model:'XP95 optical detector',category:'fire',device_type:'detector',part_numbers:['55000-600APO'],aliases:['optical smoke'],protocol:'XP95',uk_priority:true,uk_priority_order:100,record_ids:['xp95','shared'],image:'apollo.webp',image_type:'official-manufacturer-product-image',source_page_url:'https://example.org/apollo',image_credit:'Apollo product image',identification_notes:'Check the product label.',applicability_limits:'Match the head and base to the documented protocol.'},
  {id:'gent-s4',brand:'Gent',model:'S4 detector',category:'fire',device_type:'detector',part_numbers:['S4-711'],aliases:['S-Quad'],protocol:'Vigilon',uk_priority:true,uk_priority_order:0,record_ids:['gent'],image:'gent.webp',image_type:'manufacturer-manual-illustration',source_page_url:'https://example.org/gent',source_pdf_page:4,image_credit:'Gent manual',documentation_url:'https://example.org/gent.pdf'},
  {id:'alpha-relay',brand:'Alpha',model:'Relay module',category:'fire',device_type:'interface',part_numbers:['R-2'],aliases:[],protocol:'Alpha loop',record_ids:['source-only'],image:'relay.webp'},
];
const packs=[
  {id:'apollo-fire-devices',brand:'Apollo',title:'Apollo device pack',category:'fire',device_ids:['apollo-xp95'],record_ids:['xp95','shared','xp95','missing','source-only'],description:'Matched Apollo references.',scope:'Check the exact model.'},
  {id:'gent-fire-devices',brand:'Gent',title:'Gent device pack',category:'fire',device_ids:['gent-s4'],record_ids:['gent'],description:'Matched Gent references.',scope:'Check the exact model.'},
  {id:'alpha-fire-devices',brand:'Alpha',title:'Alpha device pack',category:'fire',device_ids:['alpha-relay'],record_ids:['source-only'],description:'Online source references.',scope:'Check the exact model.'},
];
const records=new Map([
  ['xp95',{id:'xp95',url:'https://example.org/xp95.pdf',title:'XP95 instructions',bytes:100}],
  ['shared',{id:'shared',url:'https://example.org/base.pdf',title:'Base instructions',bytes:50}],
  ['gent',{id:'gent',url:'https://example.org/gent.pdf',title:'S4 instructions',bytes:75}],
  ['source-only',{id:'source-only',source:'https://example.org/reference',title:'Online reference'}],
]);

function harness(inputDevices=devices,inputPacks=packs){
  let saved=new Map(),modal='',manualArgs,downloadIds,opened=0,jobs=0;
  const nodes=new Map();
  const app={innerHTML:'',querySelector:selector=>{if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',focus(){}});return nodes.get(selector);}};
  const controller=createDeviceController({app,devices:inputDevices,packs:inputPacks,records,getSaved:()=>saved,showModal:html=>{modal=html;},showManuals:(...args)=>{manualArgs=args;},manualRow:record=>`<article>${record.title}</article>`,startDownload:async ids=>{downloadIds=ids;},renderJob:()=>jobs++,openPacks:()=>opened++});
  return {app,controller,node:selector=>app.querySelector(selector),setSaved:ids=>{saved=new Map(ids.map(id=>[id,records.get(id)]));},get modal(){return modal;},get manualArgs(){return manualArgs;},get downloadIds(){return downloadIds;},get opened(){return opened;},get jobs(){return jobs;}};
}

test('device identification search matches codes, aliases and protocols while retaining explicit type and brand filters',()=>{
  assert.deepEqual(filterDevices(devices,{query:'55000-600'}).map(d=>d.id),['apollo-xp95']);
  assert.deepEqual(filterDevices(devices,{query:'S-Quad vigilon',brand:'Gent',type:'detector'}).map(d=>d.id),['gent-s4']);
  assert.equal(filterDevices(devices,{query:'Vigilon',brand:'Apollo'}).length,0);
  assert.deepEqual(filterDevices(devices,{type:'interface'}).map(d=>d.id),['alpha-relay']);
  assert.deepEqual(devices.map(d=>d.id),['apollo-xp95','gent-s4','alpha-relay'],'sorting does not mutate source data');
});

test('UK device and pack priority precedes alphabetical order without excluding other products',()=>{
  assert.deepEqual(filterDevices(devices).map(d=>d.id),['gent-s4','apollo-xp95','alpha-relay']);
  assert.deepEqual(filterDevices(devices,{order:'a-z'}).map(d=>d.id),['alpha-relay','apollo-xp95','gent-s4']);
  assert.deepEqual(sortDevicePacks(packs,devices).map(p=>p.brand),['Gent','Apollo','Alpha']);
  assert.deepEqual(sortDevicePacks(packs,devices,'a-z').map(p=>p.brand),['Alpha','Apollo','Gent']);
});

test('device system filters separate fire and intruder while pack searches find exact model codes',()=>{
  const intruder={...devices[0],id:'texecom-pir',brand:'Texecom',model:'Capture P15',category:'security',part_numbers:['AKB-0001'],protocol:'Wired relay',record_ids:[]};
  const all=[...devices,intruder];
  const allPacks=[...packs,{id:'texecom-security-devices',brand:'Texecom',title:'Texecom device pack',category:'security',device_ids:[intruder.id],record_ids:[]}];
  assert.deepEqual(filterDevices(all,{category:'security'}).map(d=>d.id),['texecom-pir']);
  assert.equal(filterDevices(all,{category:'fire',query:'AKB-0001'}).length,0);
  assert.deepEqual(filterDevicePacks(allPacks,all,{query:'AKB-0001',category:'security'}).map(p=>p.id),['texecom-security-devices']);
  assert.equal(filterDevicePacks(allPacks,all,{query:'AKB-0001',category:'fire'}).length,0);
  const h=harness(all);h.controller.renderBrowse();
  h.node('#device-category').onchange({target:{value:'security'}});
  assert.match(h.node('#device-results').innerHTML,/Capture P15/);
  assert.doesNotMatch(h.node('#device-results').innerHTML,/XP95 optical detector/);
});

test('pack progress counts downloadable PDFs separately from online references and deduplicates shared records',()=>{
  const state=devicePackStatus(packs[0],records,new Map([['xp95',records.get('xp95')]]));
  assert.deepEqual(state.ids,['xp95','shared','source-only']);
  assert.deepEqual(state.downloadableIds,['xp95','shared']);
  assert.deepEqual(state.missingIds,['shared']);
  assert.equal(state.referenceCount,3);
  assert.equal(state.savedCount,1);
  assert.equal(state.knownBytes,150);
});

test('device details expose exact codes, provenance and online-only supplementary documents without panel session actions',async()=>{
  const h=harness();
  await h.controller.handleAction('device-view','gent-s4');
  assert.match(h.modal,/S4-711/);
  assert.match(h.modal,/Vigilon/);
  assert.match(h.modal,/Manual illustration/);
  assert.match(h.modal,/PDF page 4/);
  assert.match(h.modal,/not automatically saved for offline use/);
  assert.doesNotMatch(h.modal,/use-panel|emulator|Use this panel/);
  await h.controller.handleAction('device-manuals','gent-s4');
  assert.deepEqual(h.manualArgs,[['gent'],'Gent S4 detector documents','S4-711']);
});

test('device pack rendering refreshes saved counts and delegates only real download records to the shared pipeline',async()=>{
  const h=harness();
  h.controller.renderPack('apollo-fire-devices');
  assert.match(h.app.innerHTML,/0 of 2 downloadable PDFs/);
  assert.equal((h.app.innerHTML.match(/<article>XP95 instructions<\/article>/g)||[]).length,1);
  await h.controller.handleAction('device-pack-download','apollo-fire-devices');
  assert.deepEqual(h.downloadIds,['xp95','shared']);
  h.setSaved(['xp95','shared']);
  h.controller.renderPack('apollo-fire-devices');
  assert.match(h.app.innerHTML,/2 of 2 downloadable PDFs/);
  assert.match(h.app.innerHTML,/data-action="device-pack-download"[^>]*disabled/);
  h.controller.renderPack('alpha-fire-devices');
  assert.doesNotMatch(h.app.innerHTML,/data-action="device-pack-download"/);
  assert.match(h.app.innerHTML,/Manufacturer references are available online/);
  assert.equal(h.jobs,3);
});

test('online-only manufacturer references are described honestly without a PDF save button',()=>{
  const h=harness([{...devices[2],record_ids:[],documentation_url:'https://example.org/online-manual'}]);
  h.controller.show('alpha-relay');
  assert.match(h.modal,/manufacturer reference is available online/);
  assert.match(h.modal,/not automatically saved for offline use/);
  assert.doesNotMatch(h.modal,/No matched document|data-action="device-manuals"/);
});

test('pack reference totals deduplicate shared online manuals and distinguish them from downloadable PDFs',()=>{
  const onlineDevices=[0,1].map(i=>({...devices[2],id:'online-'+i,record_ids:[],documentation_url:'https://example.org/shared-online-guide'}));
  const onlinePack={...packs[2],id:'online-pack',device_ids:onlineDevices.map(d=>d.id),record_ids:[]};
  assert.deepEqual(devicePackOnlineReferences(onlinePack,onlineDevices,records),['https://example.org/shared-online-guide']);
  const h=harness(onlineDevices,[onlinePack]);
  h.app.innerHTML=h.controller.packsMarkup();h.controller.mountPacks();
  assert.match(h.node('#device-pack-results').innerHTML,/1 online reference/);
  assert.doesNotMatch(h.node('#device-pack-results').innerHTML,/2 online references|Pictures only/);
  h.controller.renderPack('online-pack');
  assert.match(h.app.innerHTML,/<strong>1<\/strong> online references/);
  assert.doesNotMatch(h.app.innerHTML,/0 linked documents|data-action="device-pack-download"/);
  const duplicate={...devices[0],documentation_url:'https://example.org/xp95.pdf'};
  assert.deepEqual(devicePackOnlineReferences(packs[0],[duplicate],records),['https://example.org/reference']);
});

test('device browse filters and show more work on results without replacing the active search input',async()=>{
  const many=Array.from({length:27},(_,i)=>({...devices[0],id:'apollo-'+i,model:'Detector '+i,part_numbers:['MODEL-'+i]}));
  const h=harness(many);
  h.controller.renderBrowse();
  const result=h.node('#device-results'),input=h.node('#device-search');
  assert.equal((result.innerHTML.match(/class="panel-card device-card"/g)||[]).length,24);
  await h.controller.handleAction('device-more');
  assert.equal((result.innerHTML.match(/class="panel-card device-card"/g)||[]).length,27);
  input.oninput({target:{value:'MODEL-26'}});
  assert.equal((result.innerHTML.match(/class="panel-card device-card"/g)||[]).length,1);
  assert.match(result.innerHTML,/Detector 26/);
  assert.equal(h.node('#device-search'),input);
  input.oninput({target:{value:'not-a-model'}});
  assert.match(result.innerHTML,/No matching devices/);
});

test('device packs can be searched independently and invalid pack URLs have a useful return action',async()=>{
  const h=harness();
  h.app.innerHTML=h.controller.packsMarkup();h.controller.mountPacks();
  const result=h.node('#device-pack-results');
  assert.match(result.innerHTML,/Gent device pack/);
  h.node('#device-pack-search').oninput({target:{value:'Apollo'}});
  assert.match(result.innerHTML,/Apollo device pack/);
  assert.doesNotMatch(result.innerHTML,/Gent device pack/);
  h.controller.renderPack('missing-pack');
  assert.match(h.app.innerHTML,/Device pack not found/);
  await h.controller.handleAction('device-packs');
  assert.equal(h.opened,1);
  assert.equal(await h.controller.handleAction('unrelated-action'),false);
});

test('source metadata is escaped and unsupported link schemes are not rendered',()=>{
  const h=harness([{...devices[0],model:'<script>alert(1)</script>',source_page_url:'javascript:alert(1)',documentation_url:'data:text/html,bad'}]);
  h.controller.show('apollo-xp95');
  assert.match(h.modal,/&lt;script&gt;/);
  assert.doesNotMatch(h.modal,/<script>|href="javascript:|href="data:/);
  const credentials=harness([{...devices[0],source_page_url:'https://user:password@example.org/private'}]);
  credentials.controller.show('apollo-xp95');
  assert.doesNotMatch(credentials.modal,/user:password/);
});

test('import matching credits a supplied device reference when it shares bytes with a historical archive entry',()=>{
  const historical={id:'archive-copy',sha256:'checked-pdf-hash',title:'Historical archive document'};
  const supplied={id:'device-copy',sha256:'checked-pdf-hash',origin:'device-reference',title:'Verified device document'};
  const other={id:'unrelated',sha256:'another-pdf-hash'};
  const merged=[historical,other,supplied];
  assert.equal(matchImportedDocument(merged,'checked-pdf-hash'),supplied);
  assert.equal(matchImportedDocument(merged,'another-pdf-hash'),other);
  assert.equal(matchImportedDocument(merged,'unknown'),undefined);
  assert.equal(matchImportedDocument(merged,''),undefined);
  assert.equal(matchImportedDocument([historical],'checked-pdf-hash'),historical);
  assert.deepEqual(merged,[historical,other,supplied],'matching leaves the original records unchanged');
});

test('shared PDF rows identify supplemental device references in both catalogue and saved views',()=>{
  const source=readFileSync(new URL('../public/app/app.mjs',import.meta.url),'utf8');
  const render=source.slice(source.indexOf('function manualRow('),source.indexOf('function packCard('));
  const context={wiring:null,saved:new Map(),esc:value=>String(value??''),bytes:()=>'',icon:()=>'',action:()=>'',record:{id:'reference',brand:'C-TEC',title:'CAST instructions',origin:'device-reference',url:'https://example.org/cast.pdf'}};
  const html=vm.runInNewContext(render+';manualRow(record)',context);
  assert.match(html,/DEVICE REFERENCE/);
  assert.match(html,/Supplemental document supplied with the device packs/);
  context.saved.set('reference',context.record);
  const saved=vm.runInNewContext(render+';manualRow(record)',context);
  assert.match(saved,/SAVED ON DEVICE/);
  assert.match(saved,/DEVICE REFERENCE/);
  context.record={...context.record,origin:undefined};
  assert.doesNotMatch(vm.runInNewContext(render+';manualRow(record)',context),/DEVICE REFERENCE/);
});

test('source-only references offer Open source with escaped delivery guidance while saved copies remain readable',()=>{
  const source=readFileSync(new URL('../public/app/app.mjs',import.meta.url),'utf8');
  const render=source.slice(source.indexOf('function manualRow('),source.indexOf('function packCard('));
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const context={wiring:null,saved:new Map(),esc:escape,bytes:()=>'',icon:()=>'',action:(id,label)=>`<button data-action="${id}">${label}</button>`,record:{id:'source-only',brand:'C-TEC',title:'Earlier device instructions',origin:'device-reference',url:null,source:'https://example.org/earlier.pdf',download_mode:'source-only',delivery_note:'Open the source, then use Import PDF. <script>unsafe</script> & check the edition.'}};
  const html=vm.runInNewContext(render+';manualRow(record)',context);
  assert.match(html,/href="https:\/\/example.org\/earlier.pdf"[^>]*>Open source ↗/);
  assert.match(html,/&lt;script&gt;unsafe&lt;\/script&gt; &amp; check the edition/);
  assert.doesNotMatch(html,/<script>|Save PDF|data-action="download-one"/);
  context.saved.set('source-only',context.record);
  const saved=vm.runInNewContext(render+';manualRow(record)',context);
  assert.match(saved,/data-action="read">Read/);
  assert.doesNotMatch(saved,/Save PDF|data-action="download-one"/);
});
