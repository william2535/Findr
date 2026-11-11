import {filterWiringDiagrams} from './wiring.mjs';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normal=value=>String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ');
const unique=values=>[...new Set(values)];
const categoryNames={fire:'Fire',security:'Intruder','access-control':'Access control',cctv:'CCTV','warden-call':'Warden call'};
const category=value=>categoryNames[value]||value;
const href=(brand='',pack='')=>'#downloads/wiring-packs'+(brand?'/'+encodeURIComponent(brand):'')+(pack?'/'+encodeURIComponent(pack):'');

// Membership is explicit per source page, not per manual or guessed model name.
export function prepareWiringPacks(data,entries){
 const byEntry=new Map(entries.map(entry=>[entry.id,entry])),byBrand=new Map(),byPack=new Map(),used=new Set();
 for(const brand of data.brands||[]){
  if(byBrand.has(brand.id)||!/^#[a-f0-9]{6}$/i.test(brand.colour))throw Error('Invalid wiring brand: '+brand.id);
  byBrand.set(brand.id,{...brand,packs:[]});
 }
 for(const pack of data.packs||[]){
  const brand=byBrand.get(pack.brandId);
  if(!brand||byPack.has(pack.id)||!pack.entryIds?.length)throw Error('Invalid wiring family: '+pack.id);
  const pictures=pack.entryIds.map(id=>{
   const entry=byEntry.get(id);
   if(!entry||used.has(id)||entry.brand!==brand.name)throw Error('Invalid wiring membership: '+id);
   used.add(id);return entry;
  });
  const prepared={...pack,brand,entries:pictures,recordIds:unique(pictures.map(e=>e.recordId)),categories:unique(pictures.map(e=>e.category)),models:unique(pictures.flatMap(e=>e.models||[]))};
  byPack.set(pack.id,prepared);brand.packs.push(prepared);
 }
 if(used.size!==byEntry.size)throw Error('Some wiring pictures have no family pack');
 for(const brand of byBrand.values())if(!brand.packs.length)throw Error('Empty wiring brand: '+brand.id);
 return {brands:[...byBrand.values()],packs:[...byPack.values()],byBrand,byPack};
}

export function searchWiringPacks(index,query='',brandId=''){
 const terms=normal(query).trim().split(/\s+/).filter(Boolean);
 return index.packs.filter(pack=>(!brandId||pack.brandId===brandId)&&terms.every(term=>normal([pack.brand.name,pack.family,...pack.models,...pack.entries.flatMap(e=>[e.title,...(e.keywords||[])])].join(' ')).includes(term)));
}

export function wiringPackAvailability(pack,saved,records){
 const ids=pack.recordIds||unique(pack.entries.map(entry=>entry.recordId));
 const savedIds=ids.filter(id=>saved.has(id));
 const missingIds=ids.filter(id=>!saved.has(id)&&records.get(id)?.url);
 return {manualCount:ids.length,savedCount:savedIds.length,missingIds,sourceOnlyCount:ids.filter(id=>!saved.has(id)&&!records.get(id)?.url).length};
}

function preview(entries){return `<div class="wiring-pack-preview" aria-hidden="true">${entries.slice(0,3).map((entry,i)=>`<img class="sheet-${i+1}" src="./${esc(entry.image)}" alt="" loading="lazy" decoding="async" width="${entry.imageWidth}" height="${entry.imageHeight}">`).join('')}</div>`;}
const types=entries=>unique(entries.map(e=>category(e.category))).join(' · ');
const plural=(n,word)=>n+' '+word+(n===1?'':'s');
const decode=value=>{try{return decodeURIComponent(value||'');}catch{return String(value||'');}};

export function createWiringPackController({data,entries,getSaved,records,cards,equipmentPreview=()=>'',onDownload,onShowManuals}){
 const index=prepareWiringPacks(data,entries),packQueries=new Map(),downloadMessages=new Map();
 let query='',host=null,currentBrand='',currentPack='',savingPack=null;
 const link=(brand,pack)=>href(brand,pack);
 function brandCard(brand,packs){
  const pictures=packs.flatMap(pack=>pack.entries),representatives=packs.flatMap(pack=>pack.entries.slice(0,1));
  return `<a class="wiring-brand-card" href="${link(brand.id)}" style="--pack-accent:${brand.colour}" aria-label="Open ${esc(brand.name)} wiring families"><div class="wiring-brand-strip"><span>${esc(brand.name)}</span><span aria-hidden="true">→</span></div>${preview(representatives.length>1?representatives:pictures)}<div class="wiring-pack-card-copy"><small>${esc(types(pictures))}</small><h3>${esc(brand.name)}</h3><p>${plural(packs.length,'family pack')} · ${plural(pictures.length,'picture')}</p><span class="wiring-pack-cta">Choose a family <span aria-hidden="true">→</span></span></div></a>`;
 }
 function familyCard(pack){
  const status=wiringPackAvailability(pack,getSaved(),records);
  return `<a class="wiring-family-card" href="${link(pack.brandId,pack.id)}" style="--pack-accent:${pack.brand.colour}" aria-label="Open ${esc(pack.brand.name+' '+pack.family)} wiring pack"><div class="wiring-family-card-top"><small>${esc(pack.brand.name)}</small><span>${plural(pack.entries.length,'picture')}</span></div>${preview(pack.entries)}<div class="wiring-pack-card-copy">${equipmentPreview(pack.entries)}<h3>${esc(pack.family)}</h3><p>${esc(pack.categories.map(category).join(' · '))}${pack.sharedFamilyReference?' · Shared source page':''}</p><small>${status.savedCount} / ${status.manualCount} full PDFs saved</small><span class="wiring-pack-cta">Open family <span aria-hidden="true">→</span></span></div></a>`;
 }
 function resultMarkup(){
  const packs=searchWiringPacks(index,query,currentBrand),brand=index.byBrand.get(currentBrand);
  if(!packs.length)return '<div class="empty"><h3>No matching wiring family.</h3><p>Try a brand, a shorter model name or a wiring topic. This collection contains the pages reviewed so far.</p><button class="secondary" data-wiring-pack-action="clear">Clear pack search</button></div>';
  const groups=brand?packs:index.brands.filter(b=>packs.some(p=>p.brandId===b.id));
  return `<p class="small wiring-pack-result-count" role="status">${brand?plural(packs.length,'family pack'):plural(groups.length,'brand')+' · '+plural(packs.length,'family pack')}${query?' matching your search':''}</p><div class="wiring-pack-grid${brand?' wiring-family-grid':''}">${brand?packs.map(familyCard).join(''):groups.map(b=>brandCard(b,packs.filter(p=>p.brandId===b.id))).join('')}</div>`;
 }
 function refreshResults(){const target=host?.querySelector('[data-wiring-pack-results]');if(target)target.innerHTML=resultMarkup();}
 function detailResults(pack){
  const shown=filterWiringDiagrams(pack.entries,{query:packQueries.get(pack.id)||'',order:'page'});
  return `<p class="small" role="status">${plural(shown.length,'picture')} in this family</p><div class="wiring-grid">${cards(shown)}</div>${shown.length?'':'<div class="empty"><p>No picture in this family matches your search.</p><button class="secondary" data-wiring-pack-action="clear-pictures">Show all family pictures</button></div>'}`;
 }
 function renderDetail(pack){
  const status=wiringPackAvailability(pack,getSaved(),records),isSaving=savingPack===pack.id;
  return `<nav class="wiring-pack-crumbs" aria-label="Wiring pack breadcrumb"><a href="${href()}">All brands</a><span aria-hidden="true">/</span><a href="${href(pack.brandId)}">${esc(pack.brand.name)}</a><span aria-hidden="true">/</span><span>${esc(pack.family)}</span></nav><section class="wiring-pack-detail-banner" style="--pack-accent:${pack.brand.colour}"><div><small>${esc(pack.brand.name)} / WIRING FAMILY</small><h2>${esc(pack.family)}</h2><p>${plural(pack.entries.length,'picture')} · ${plural(status.manualCount,'source manual')} · ${esc(pack.categories.map(category).join(' · '))}</p></div><span class="wiring-pack-included">Pictures included with offline app</span></section><p class="wiring-pack-scope">${esc(pack.note)}</p><div class="wiring-pack-manual-actions"><p><strong>${status.savedCount} / ${status.manualCount}</strong> full PDFs saved on this device${status.sourceOnlyCount?` · ${status.sourceOnlyCount} source-only reference${status.sourceOnlyCount===1?'':'s'}`:''}</p><div><button class="secondary" data-wiring-pack-action="manuals">View source manuals</button>${status.missingIds.length?`<button class="primary" data-wiring-pack-action="download" ${isSaving?'disabled':''}>${isSaving?'Saving PDFs…':'Save '+plural(status.missingIds.length,'missing PDF')}</button>`:''}</div></div>${downloadMessages.has(pack.id)?`<p class="wiring-pack-download-status" role="status">${esc(downloadMessages.get(pack.id))}</p>`:''}<label class="wiring-pack-search"><span>Find a picture in ${esc(pack.family)}</span><input type="search" data-wiring-pack-picture-search value="${esc(packQueries.get(pack.id)||'')}" placeholder="Try zone, loop, relay or a model…"></label><div data-wiring-pack-pictures>${detailResults(pack)}</div>`;
 }
 function draw(){
  if(!host)return;
  const brand=index.byBrand.get(currentBrand),pack=index.byPack.get(currentPack);
  if(currentBrand&&!brand||currentPack&&(!pack||pack.brandId!==currentBrand)){host.innerHTML=`<div class="empty"><h2>Wiring pack not found.</h2><p>Choose an available brand and family.</p><a class="primary" href="${href()}">Browse wiring packs</a></div>`;return;}
  if(pack){host.innerHTML=renderDetail(pack);return;}
  host.innerHTML=`${brand?`<nav class="wiring-pack-crumbs" aria-label="Wiring pack breadcrumb"><a href="${href()}">All brands</a><span aria-hidden="true">/</span><span>${esc(brand.name)}</span><a class="wiring-pack-crumb-all" href="#downloads/wiring" data-preserve-manual-filters>All pictures →</a></nav>`:''}<div class="wiring-pack-browse-heading${brand?' is-family-index':' is-brand-index'}" ${brand?`style="--pack-accent:${brand.colour}"`:''}><div><h2>${brand?esc(brand.name)+' families':'Choose your brand.'}</h2><p>${brand?'Source pictures organised by product family.':'A familiar name, then the family you need.'}</p></div><a class="secondary" href="#downloads/wiring" data-preserve-manual-filters>All pictures →</a></div><label class="wiring-pack-search"><span>Find a brand, family or model</span><input type="search" data-wiring-pack-search value="${esc(query)}" placeholder="Try Kentec, Sigma CP or S-Quad…"></label><div class="wiring-pack-offline-note"><span aria-hidden="true">✓</span><p><strong>Pictures included with the offline app.</strong> Full PDFs are saved separately.</p></div><div data-wiring-pack-results>${resultMarkup()}</div>`;
 }
 function mount(element,brandId='',packId=''){host=element;currentBrand=decode(brandId);currentPack=decode(packId);draw();}
 globalThis.document?.addEventListener('input',event=>{
  if(!host?.isConnected||!host.contains(event.target))return;
  if(event.target.matches('[data-wiring-pack-search]')){query=event.target.value;refreshResults();}
  if(event.target.matches('[data-wiring-pack-picture-search]')){packQueries.set(currentPack,event.target.value);host.querySelector('[data-wiring-pack-pictures]').innerHTML=detailResults(index.byPack.get(currentPack));}
 });
 globalThis.document?.addEventListener('click',async event=>{
  const button=event.target.closest('[data-wiring-pack-action]');if(!button||!host?.contains(button))return;
  const pack=index.byPack.get(currentPack),action=button.dataset.wiringPackAction;
  if(action==='clear'){query='';draw();host.querySelector('[data-wiring-pack-search]')?.focus();}
  if(action==='clear-pictures'&&pack){packQueries.set(pack.id,'');draw();}
  if(action==='manuals'&&pack)onShowManuals(pack.recordIds,pack.brand.name+' '+pack.family+' source manuals');
  if(action==='download'&&pack&&!savingPack){savingPack=pack.id;downloadMessages.delete(pack.id);draw();try{await onDownload(wiringPackAvailability(pack,getSaved(),records).missingIds);const missing=wiringPackAvailability(pack,getSaved(),records).missingIds.length;downloadMessages.set(pack.id,missing?plural(missing,'PDF')+' still need saving. Check the download status below, then retry when connected. Your wiring pictures remain available.':'The family’s downloadable PDFs are saved on this device.');}catch(error){downloadMessages.set(pack.id,'Could not complete the download: '+(error?.message||'Please try again.')+' Your wiring pictures remain available.');}finally{savingPack=null;if(host?.isConnected)draw();}}
 });
 return {mount,index};
}
