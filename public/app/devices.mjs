import {categoryLabel,sortPanels} from './catalog.mjs';

export const DEVICE_TYPES={detector:'Detector', 'call-point':'Manual call point', sounder:'Sounder / visual alarm', interface:'Interface', base:'Detector base', accessory:'Accessory'};
export const deviceTypeLabel=type=>DEVICE_TYPES[type]||'Device';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const button=(action,text,style='secondary',extra='')=>`<button class="${style}" data-action="${action}" ${extra}>${text}</button>`;
const imageKind=device=>/illustration|drawing|diagram/i.test(device.image_type||'')?'Manual illustration':'Device picture';
const names=(a,b)=>a.localeCompare(b,'en-GB',{numeric:true,sensitivity:'base'});
const plural=(count,singular,other=singular+'s')=>`${count} ${count===1?singular:other}`;

export function filterDevices(devices,{query='',brand='',type='',category='',order='uk-first'}={}){
  const terms=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return sortPanels(devices.filter(device=>(!category||device.category===category)&&(!brand||device.brand===brand)&&(!type||device.device_type===type)&&terms.every(term=>`${device.brand} ${device.model} ${(device.aliases||[]).join(' ')} ${(device.part_numbers||[]).join(' ')} ${device.protocol||''} ${deviceTypeLabel(device.device_type)}`.toLowerCase().includes(term))),order);
}

export function filterDevicePacks(packs,devices,{query='',category='',order='uk-first'}={}){
  const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const byId=new Map(devices.map(device=>[device.id,device]));
  return sortDevicePacks(packs.filter(pack=>(!category||pack.category===category)&&terms.every(term=>`${pack.brand} ${pack.title} ${pack.device_ids.map(id=>{const device=byId.get(id);return device?`${device.model} ${(device.aliases||[]).join(' ')} ${(device.part_numbers||[]).join(' ')} ${device.protocol||''}`:'';}).join(' ')}`.toLowerCase().includes(term))),devices,order);
}

export function devicePackStatus(pack,records,saved){
  const ids=[...new Set(pack.record_ids||[])].filter(id=>records.has(id));
  const downloadableIds=ids.filter(id=>records.get(id).url);
  return {
    ids,
    downloadableIds,
    missingIds:downloadableIds.filter(id=>!saved.has(id)),
    savedCount:downloadableIds.filter(id=>saved.has(id)).length,
    referenceCount:ids.length,
    knownBytes:downloadableIds.reduce((total,id)=>total+(records.get(id).bytes||0),0),
  };
}

export function devicePackOnlineReferences(pack,devices,records){
  const memberIds=new Set(pack.device_ids||[]),urls=new Set();
  const linked=(pack.record_ids||[]).map(id=>records.get(id)).filter(Boolean);
  const downloadable=new Set(linked.map(record=>record.url).filter(Boolean));
  const add=url=>{try{const parsed=new URL(url);if(['http:','https:'].includes(parsed.protocol)&&!parsed.username&&!parsed.password&&!downloadable.has(url))urls.add(url);}catch{}};
  for(const record of linked)if(!record.url)add(record.source);
  for(const device of devices)if(memberIds.has(device.id))add(device.documentation_url);
  return [...urls];
}

// A supplied reference may share bytes with a historical archive entry. Credit
// the reference used by the device pack when the user imports that checked PDF.
export function matchImportedDocument(documents,hash){
  if(!hash)return undefined;
  return documents.find(record=>record.origin==='device-reference'&&record.sha256===hash)||documents.find(record=>record.sha256===hash);
}

export function sortDevicePacks(packs,devices,order='uk-first'){
  const byId=new Map(devices.map(device=>[device.id,device]));
  const ordered=sortPanels(devices,order);
  const ranks=new Map(ordered.map((device,index)=>[device.id,index]));
  const rank=pack=>Math.min(...pack.device_ids.filter(id=>byId.has(id)).map(id=>ranks.get(id)),Infinity);
  return [...packs].sort((a,b)=>(order==='uk-first'?rank(a)-rank(b):0)||names(a.brand,b.brand)||names(a.title,b.title)||names(a.id,b.id));
}

function sourceLink(url,label,style=''){
  try{const parsed=new URL(url);if(!['https:','http:'].includes(parsed.protocol)||parsed.username||parsed.password)return '';}
  catch{return '';}
  return `<a${style?` class="${style}"`:''} href="${esc(url)}" target="_blank" rel="noopener">${esc(label)} ↗</a>`;
}

export function createDeviceController({app,devices,packs,records,getSaved,showModal,showManuals,manualRow,startDownload,renderJob,openPacks,wiringPreview=()=>''}){
  let query='',brand='',type='',category='',order='uk-first',limit=24,packQuery='',packCategory='',packLimit=18;
  const byId=new Map(devices.map(device=>[device.id,device]));
  const packsById=new Map(packs.map(pack=>[pack.id,pack]));
  const find=selector=>app.querySelector(selector);
  const picture=device=>`./devices/${esc(device.image)}`;
  const orderSelect=id=>`<label class="order-control" for="${id}">Order<select id="${id}"><option value="uk-first"${order==='uk-first'?' selected':''}>UK first</option><option value="a-z"${order==='a-z'?' selected':''}>Brand A–Z</option></select></label>`;
  const categorySelect=(id,selected)=>`<select id="${id}" aria-label="${id==='device-category'?'Device system':'Device pack system'}"><option value="">Fire + intruder</option>${[...new Set(devices.map(device=>device.category))].sort(names).map(value=>`<option value="${esc(value)}"${value===selected?' selected':''}>${esc(categoryLabel(value))}</option>`).join('')}</select>`;
  const packDevices=pack=>sortPanels(pack.device_ids.map(id=>byId.get(id)).filter(Boolean),order);
  const status=pack=>devicePackStatus(pack,records,getSaved());
  const codes=device=>(device.part_numbers||[]).join(' · ');

  function card(device){
    const count=[...new Set(device.record_ids||[])].filter(id=>records.has(id)).length;
    return `<article class="panel-card device-card"><button class="panel-image device-image" data-action="device-view" data-id="${esc(device.id)}" aria-label="View ${esc(device.brand+' '+device.model)}"><img src="${picture(device)}" alt="${esc(device.brand+' '+device.model)}" loading="lazy" decoding="async"><span class="image-kind">${imageKind(device)}</span></button><div class="panel-info"><small>${esc(device.brand.toUpperCase())} · ${esc(deviceTypeLabel(device.device_type))}</small><h3>${esc(device.model)}</h3>${codes(device)?`<p class="device-code">${esc(codes(device))}</p>`:''}<small>${count?plural(count,'linked document'):device.documentation_url?'Manufacturer document online':'Picture reference'}</small>${button('device-view','View device','secondary',`data-id="${esc(device.id)}"`)}</div></article>`;
  }

  function renderBrowse(){
    const brands=[...new Set(devices.map(device=>device.brand))].sort(names);
    const types=Object.keys(DEVICE_TYPES).filter(value=>devices.some(device=>device.device_type===value));
    app.innerHTML=`<section class="devices-page"><div class="device-back-row">${button('device-packs','← Device packs','back')}<a class="back" href="#home">Home</a></div><div class="section-head"><div><div class="eyebrow">DEVICE IDENTIFICATION</div><h1>Find the device.<br>Check the code.</h1><p>Compare the picture, then check the part number, protocol and base.</p></div></div><div class="catalogue-stats"><span><strong>${devices.length}</strong> pictured device families</span><span><strong>${brands.length}</strong> brands</span><span>Pictures included offline</span></div><div class="toolbar device-toolbar"><div class="search"><input id="device-search" type="search" placeholder="Search a device or part number…" value="${esc(query)}" aria-label="Search devices"></div>${categorySelect('device-category',category)}<select id="device-brand" aria-label="Device brand"><option value="">All brands</option>${brands.map(value=>`<option value="${esc(value)}"${value===brand?' selected':''}>${esc(value)}</option>`).join('')}</select><select id="device-type" aria-label="Device type"><option value="">All device types</option>${types.map(value=>`<option value="${esc(value)}"${value===type?' selected':''}>${esc(deviceTypeLabel(value))}</option>`).join('')}</select></div><div id="device-results" aria-live="polite"></div><div class="notice">Similar-looking devices can use different protocols, bases or sensing methods. The label and exact document identify the variant; a picture does not establish compatibility.</div><div class="inline-actions">${button('device-packs','Browse device packs','primary')}<a class="secondary" href="#identify">Browse panel pictures</a></div></section>`;
    renderResults();
    find('#device-search').oninput=event=>{query=event.target.value;limit=24;renderResults();};
    find('#device-category').onchange=event=>{category=event.target.value;limit=24;renderResults();};
    find('#device-brand').onchange=event=>{brand=event.target.value;limit=24;renderResults();};
    find('#device-type').onchange=event=>{type=event.target.value;limit=24;renderResults();};
  }

  function renderResults(){
    const matches=filterDevices(devices,{query,brand,type,category,order});
    find('#device-results').innerHTML=`<div class="result-toolbar"><p class="small result-count">${plural(matches.length,'pictured device family','pictured device families')}<span class="order-note">${order==='uk-first'?'UK devices first · All models included':'All models · Alphabetical by brand'}</span></p>${orderSelect('device-order')}</div><div class="panel-grid device-grid">${matches.slice(0,limit).map(card).join('')}</div>${matches.length?'':'<div class="empty"><h3>No matching devices.</h3><p>Try a broader model name or part number, or clear a filter.</p></div>'}${matches.length>limit?`<div class="page-end">${button('device-more','Show more devices')}<small>Showing ${limit} of ${matches.length}</small></div>`:''}`;
    find('#device-order').onchange=event=>{order=event.target.value;limit=24;renderResults();find('#device-order').focus();};
  }

  function packCard(pack){
    const members=packDevices(pack),saved=status(pack),online=devicePackOnlineReferences(pack,members,records).length;
    return `<article class="pack device-pack"><div class="pack-photos">${members.slice(0,3).map(device=>`<img src="${picture(device)}" alt="${esc(device.brand+' '+device.model)}" loading="lazy" decoding="async">`).join('')}</div><div class="pack-body"><small>${esc(categoryLabel(pack.category))} · Devices</small><h3>${esc(pack.title)}</h3><p>${plural(members.length,'pictured device family','pictured device families')} · ${saved.downloadableIds.length?plural(saved.downloadableIds.length,'downloadable PDF'):online?plural(online,'online reference'):'Pictures only'}</p><div class="small">${saved.downloadableIds.length?`${saved.savedCount}/${saved.downloadableIds.length} downloadable PDFs saved`:'Pictures included offline'}${online?`<br>${plural(online,'online reference')}`:''}</div><a class="primary" href="#device-pack/${esc(pack.id)}">View device pack →</a></div></article>`;
  }

  function packsMarkup(){
    return `<section class="devices-page"><div class="device-packs-intro"><div><h2>Know your devices.</h2><p>${plural(devices.length,'pictured device family','pictured device families')} across ${plural(packs.length,'brand pack')}. Check the model, open the source and save the matched PDFs.</p></div><a class="secondary" href="#devices">Browse all device pictures →</a></div><div class="toolbar device-toolbar"><div class="search"><input id="device-pack-search" type="search" placeholder="Find a brand, device or part number…" value="${esc(packQuery)}" aria-label="Search device packs"></div>${categorySelect('device-pack-category',packCategory)}</div><div id="device-pack-results" aria-live="polite"></div><div class="notice">Device pictures and identification notes are included with the offline app. PDFs are available offline once marked <strong>Saved on device</strong>. Manufacturer website links need a connection.</div></section>`;
  }

  function mountPacks(){
    renderPackResults();
    find('#device-pack-search').oninput=event=>{packQuery=event.target.value;packLimit=18;renderPackResults();};
    find('#device-pack-category').onchange=event=>{packCategory=event.target.value;packLimit=18;renderPackResults();};
  }

  function renderPackResults(){
    const matches=filterDevicePacks(packs,devices,{query:packQuery,category:packCategory,order});
    find('#device-pack-results').innerHTML=`<div class="result-toolbar"><p class="small result-count">${plural(matches.length,'device pack')}<span class="order-note">${order==='uk-first'?'UK device packs first · All packs included':'All packs · Alphabetical by brand'}</span></p>${orderSelect('device-pack-order')}</div><div class="packs">${matches.slice(0,packLimit).map(packCard).join('')}</div>${matches.length?'':'<div class="empty">No matching device packs. Try a brand or model, or clear the system filter.</div>'}${matches.length>packLimit?`<div class="page-end">${button('device-pack-more','Show more device packs')}<small>Showing ${packLimit} of ${matches.length}</small></div>`:''}`;
    find('#device-pack-order').onchange=event=>{order=event.target.value;packLimit=18;renderPackResults();find('#device-pack-order').focus();};
  }

  function renderPack(id){
    const pack=packsById.get(id);
    if(!pack){app.innerHTML=`<div class="empty"><h2>Device pack not found.</h2><p>Choose a pack from the device library.</p>${button('device-packs','Browse device packs','primary')}</div>`;return;}
    const info=status(pack),members=packDevices(pack),online=devicePackOnlineReferences(pack,members,records).length;
    const subtitle=info.downloadableIds.length?`${info.savedCount} of ${info.downloadableIds.length} downloadable PDFs saved on this device.`:info.referenceCount||online?'Manufacturer references are available online.':'Pictures for identification. Matched documents have not been linked yet.';
    const download=info.downloadableIds.length?button('device-pack-download',info.missingIds.length?'Download missing PDFs':'All PDFs saved','primary',`data-id="${esc(pack.id)}"${info.missingIds.length?'':' disabled'}`):'';
    app.innerHTML=`<section class="devices-page">${button('device-packs','← Device packs','back')}<div class="section-head"><div><div class="eyebrow">YOUR DEVICE PACK</div><h1>${esc(pack.title)}</h1><p>${subtitle}</p></div>${download}</div><div class="catalogue-stats"><span><strong>${members.length}</strong> pictured device families</span>${info.downloadableIds.length?`<span><strong>${info.downloadableIds.length}</strong> downloadable PDFs</span>`:''}${online?`<span><strong>${online}</strong> online references</span>`:''}${!info.referenceCount&&!online?'<span>Pictures only</span>':''}</div><p>${esc(pack.description)}</p><div class="panel-grid device-grid device-pack-grid">${members.map(card).join('')}</div><div class="notice">${esc(pack.scope)}<br>Check the exact product code, protocol and document edition before applying a reference.</div><h2 class="device-documents-title">Included documents</h2>${info.referenceCount?`<div class="manual-list">${info.ids.map(recordId=>manualRow(records.get(recordId))).join('')}</div>`:online?'<p>Open a device card to view its manufacturer reference online. This pack has no PDFs available to save through FINDR.</p>':'<p>No matched documents are linked to this pack yet.</p>'}<div class="inline-actions"><a class="secondary" href="#devices">Browse all device pictures</a>${button('device-packs','All device packs','subtle')}</div><div id="job-slot"></div></section>`;
    renderJob();
  }

  function show(id){
    const device=byId.get(id);if(!device)return;
    const linked=[...new Set(device.record_ids||[])].filter(recordId=>records.has(recordId));
    const savedCount=linked.filter(recordId=>getSaved().has(recordId)).length;
    showModal(`<div class="device-detail"><img class="modal-image" src="${picture(device)}" alt="${esc(device.brand+' '+device.model)}"><div class="eyebrow">${esc(device.brand)} / ${esc(deviceTypeLabel(device.device_type))}</div><h2>${esc(device.model)}</h2><span class="pill">${imageKind(device)}</span><dl class="device-specs"><div><dt>Product code${(device.part_numbers||[]).length===1?'':'s'}</dt><dd>${esc(codes(device)||'Check the device label')}</dd></div><div><dt>Protocol / system</dt><dd>${esc(device.protocol||'Confirm from the label and exact documentation')}</dd></div></dl><p>${esc(device.identification_notes)}</p><div class="notice">${esc(device.applicability_limits)}</div><div class="inline-actions">${linked.length?button('device-manuals',plural(linked.length,'linked document'),'primary',`data-id="${esc(device.id)}"`):''}${sourceLink(device.documentation_url,'Manufacturer document','secondary')}</div>${wiringPreview({deviceId:device.id})}${linked.length?`<p class="small device-document-status">${savedCount} of ${linked.length} linked documents saved on this device.</p>`:device.documentation_url?'<p class="small">The manufacturer reference is available online.</p>':'<p class="small">No matched document is linked to this device yet.</p>'}${device.documentation_url?'<p class="small">The manufacturer document opens online and is not automatically saved for offline use.</p>':''}<p class="license device-picture-credit">Picture: ${sourceLink(device.source_page_url,device.image_credit||device.brand)}${device.source_pdf_page?' · PDF page '+esc(device.source_pdf_page):''}</p></div>`,'device-modal');
  }

  async function handleAction(action,id){
    switch(action){
      case'device-view':show(id);break;
      case'device-manuals':{const device=byId.get(id);if(device)showManuals(device.record_ids,device.brand+' '+device.model+' documents',device.part_numbers?.[0]||device.model);break;}
      case'device-packs':openPacks();break;
      case'device-more':limit+=24;renderResults();break;
      case'device-pack-more':packLimit+=18;renderPackResults();break;
      case'device-pack-download':{const pack=packsById.get(id);if(pack)await startDownload(status(pack).downloadableIds);break;}
      default:return false;
    }
    return true;
  }

  return {renderBrowse,renderPack,packsMarkup,mountPacks,show,handleAction};
}
