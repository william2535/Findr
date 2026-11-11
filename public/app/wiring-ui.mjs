import {wiringEquipment} from './wiring-equipment.mjs';
import {buildWiringIndex,wiringForRecord,wiringForTarget,wiringAvailability,wiringSourceStatus} from './wiring.mjs';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list=value=>Array.isArray(value)?value:[];
const button=(action,label,id,style='secondary',extra='')=>`<button type="button" class="${style}" data-action="${action}" data-id="${esc(id)}" ${extra}>${label}</button>`;
const imagePath=entry=>/^wiring\/[a-z0-9][a-z0-9-]*\.webp$/.test(entry?.image||'')?'./'+entry.image:'';
const url=value=>{try{const parsed=new URL(value);return ['http:','https:'].includes(parsed.protocol)&&!parsed.username&&!parsed.password?parsed.href:null;}catch{return null;}};
const typeLabels={'wiring':'Wiring diagram','terminal-layout':'Terminal layout','connection-example':'Connection example'};
const plural=(count,noun)=>`${count} ${noun}${count===1?'':'s'}`;
export function wiringPageLabel(entry){return `PDF page ${entry.pdfPage}${entry.printedPage?` · printed ${entry.printedPage}`:''}`;}
export function wiringCardMarkup(entry,{pdfSaved=false,equipmentHTML=''}={}){
 const image=imagePath(entry);if(!image)return '';
 return `<article class="wiring-card">${equipmentHTML}<button class="wiring-card-picture" type="button" data-action="wiring-view" data-id="${esc(entry.id)}" aria-label="View ${esc(entry.title)}"><img src="${esc(image)}" alt="${esc(entry.title+' — '+wiringPageLabel(entry))}" loading="lazy" decoding="async" width="${Number(entry.imageWidth)||1400}" height="${Number(entry.imageHeight)||1800}"><span>${esc(typeLabels[entry.diagramType]||'Source page')}</span></button><div class="wiring-card-body"><small>${esc(entry.brand)} · ${esc(entry.targetType||'equipment')}</small><h3>${esc(entry.title)}</h3><p class="wiring-models">${esc(list(entry.models).join(' · '))}</p><small>${esc(entry.edition)}<br>${esc(wiringPageLabel(entry))}</small>${button('wiring-view','View wiring picture',entry.id,'primary')}<p class="wiring-save-status">Picture included with offline app<br>${pdfSaved?'Full PDF saved on this device':'Full PDF not saved on this device'}</p></div></article>`;
}

export function createWiringController({entries=[],panels=[],devices=[],records,getSaved,getFile,hashPDF,showModal,readPDF,startDownload,toast,modal,openGallery}){
 const index=buildWiringIndex(entries),downloadableRecordIds=new Set([...records.values()].filter(record=>record.url).map(record=>record.id));
 let current=null,scale='fit',token=0,busy=false,message='',sourceCheck=null;
 const isCurrent=(stamp,id)=>stamp===token&&current?.id===id&&modal?.open&&modal.classList.contains('wiring-viewer');
 const available=entry=>wiringAvailability(entry,{savedRecordIds:getSaved(),downloadableRecordIds});
 function equipmentPreview(items){
  const pictures=wiringEquipment(list(items),{panels,devices});
  if(!pictures.length)return '<p class="wiring-equipment-missing">Equipment photo not linked yet</p>';
  return `<div class="wiring-equipment" aria-label="Equipment pictured in this reference">${pictures.slice(0,2).map(p=>`<div class="wiring-equipment-item"><img src="${esc(p.image)}" alt="${esc(p.label)}" loading="lazy" decoding="async" width="64" height="64"><span>${esc(p.label)}${p.reference!=='Linked equipment'?'<small>'+esc(p.reference)+'</small>':''}</span></div>`).join('')}${pictures.length>2?`<small>+ ${pictures.length-2} other linked models · check the source scope</small>`:''}</div>`;
 }
 function cards(items){return list(items).map(entry=>wiringCardMarkup(entry,{pdfSaved:getSaved().has(entry.recordId),equipmentHTML:equipmentPreview([entry])})).join('');}
 function preview(items,action,id,value=''){
  if(!items.length)return '';const first=items[0],image=imagePath(first);
  return `<button type="button" class="wiring-inline-preview" data-action="${action}" data-id="${esc(id)}" ${value?`data-value="${esc(value)}"`:''}><img src="${esc(image)}" alt="" loading="lazy" decoding="async"><span><strong>${plural(items.length,'wiring picture')}</strong><small>From checked manual pages</small></span><span aria-hidden="true">→</span></button>`;
 }
 function recordPreview(recordId){return preview(wiringForRecord(index,recordId),'wiring-record',recordId);}
 function targetPreview({panelId='',deviceId=''}={}){return preview(wiringForTarget(index,{panelId,deviceId}),'wiring-target',panelId||deviceId,panelId?'panel':'device');}
 function draw(){
  if(!current)return;const entry=current,status=available(entry),record=records.get(entry.recordId),source=url(entry.sourceUrl),width=scale==='fit'?'100%':String(Math.round((Number(entry.imageWidth)||1400)*(scale==='150'?1.5:1)))+'px';
  const sourceActions=sourceCheck&&!sourceCheck.canJump?button('wiring-open-start','Open saved PDF from the beginning',entry.id,'secondary',busy?'disabled':''):status.pdf.saved?button('wiring-open-source','Open source page in saved PDF',entry.id,'primary',busy?'disabled':''):status.pdf.downloadable?button('wiring-download-source','Download full PDF for offline use',entry.id,'primary',busy?'disabled':''):source?`<a class="secondary" href="${esc(source)}" target="_blank" rel="noopener">Open source PDF online ↗</a>`:'<p class="small">No downloadable full PDF is linked.</p>';
  showModal(`<div class="wiring-viewer-heading"><div class="eyebrow">${esc(entry.brand)} / ${esc(typeLabels[entry.diagramType]||'SOURCE PAGE')}</div><h2>${esc(entry.title)}</h2><p>${esc(list(entry.models).join(' · '))}</p><small>${esc(entry.edition)} · ${esc(wiringPageLabel(entry))}</small></div><div class="wiring-viewer-controls" aria-label="Wiring picture zoom">${[['fit','Fit page'],['100','100%'],['150','150%']].map(([value,label])=>button('wiring-zoom',label,entry.id,'secondary',`data-value="${value}" aria-pressed="${scale===value}"`)).join('')}<span class="small">${scale==='fit'?'Zoom to read terminal labels':'Scroll the picture to read all connections'}</span></div><div class="wiring-picture-stage" tabindex="0" aria-label="Wiring source page; zoom then scroll to read labels"><img id="wiring-picture" src="${esc(imagePath(entry))}" alt="${esc(entry.title+' — complete source page, '+wiringPageLabel(entry))}" style="width:${width}" width="${Number(entry.imageWidth)||1400}" height="${Number(entry.imageHeight)||1800}"></div><div class="wiring-viewer-meta"><p><strong>Applies to:</strong> ${esc(entry.scope)}</p>${list(entry.notes).length?`<ul>${entry.notes.map(note=>`<li>${esc(note)}</li>`).join('')}</ul>`:''}<p class="small">The source page retains the manufacturer's labels and conditions. Check the exact model, variant and document edition.</p><p class="wiring-save-status">Picture included with offline app · ${status.pdf.saved?'Full PDF saved on this device':'Full PDF not saved on this device'}</p><p id="wiring-view-status" class="${sourceCheck&&!sourceCheck.canJump?'notice':'small'}" role="status">${esc(message||'This is a source-page picture. Opening a saved PDF checks its edition before jumping to the diagram.')}</p><div class="inline-actions">${sourceActions}</div><details class="wiring-source-details"><summary>Manual and source</summary><p>${esc(record?.title||'Source manual')}<br>${esc(entry.section)}<br>${esc(entry.edition)} · ${esc(wiringPageLabel(entry))}</p>${source?`<a href="${esc(source)}" target="_blank" rel="noopener">Publisher / archive source PDF ↗</a>`:''}<p class="small">Picture from the checked manual, reviewed ${esc(entry.reviewedOn)}. Manufacturer ownership is retained.</p></details></div>`,'wiring-viewer');
 }
 function show(id){const entry=index.byId.get(id);if(!entry)return;token++;current=entry;scale='fit';busy=false;message='';sourceCheck=null;draw();}
 function leave(){token++;current=null;busy=false;sourceCheck=null;}
 async function openSource({download=false}={}){
  if(!current||busy)return;const entry=current,stamp=token;busy=true;sourceCheck=null;message=download?'Downloading the full PDF through FINDR…':'Checking the saved PDF against this picture’s source…';draw();
  try{
   if(download)await startDownload([entry.recordId]);
   if(!isCurrent(stamp,entry.id))return;
   const blob=await getFile(entry.recordId);if(!isCurrent(stamp,entry.id))return;
   if(!blob){busy=false;message='The full PDF is not saved. Your wiring picture is still available. Check the download status and retry when connected.';draw();return;}
   const actualHash=await hashPDF(blob);if(!isCurrent(stamp,entry.id))return;
   sourceCheck=wiringSourceStatus(entry,actualHash);busy=false;message=sourceCheck.message;
   if(sourceCheck.canJump){await readPDF(entry.recordId,{page:sourceCheck.pdfPage,returnWiringId:entry.id,notice:'Exact saved PDF matches this wiring picture’s source.',sourceBlob:blob,canOpen:()=>isCurrent(stamp,entry.id)});}
   else draw();
  }catch(error){if(isCurrent(stamp,entry.id)){busy=false;sourceCheck=null;message='Could not open the full PDF: '+(error?.message||'Please try again.')+' The source picture remains available.';draw();}}
 }
 async function handle(action,id,value){
  if(action==='wiring-view'){show(id);return true;}
  if(action==='wiring-record'){const items=wiringForRecord(index,id);if(items.length)openGallery({recordId:id,label:records.get(id)?.title||'Selected manual'});return true;}
  if(action==='wiring-target'){const target=value==='panel'?{panelId:id}:{deviceId:id};if(wiringForTarget(index,target).length)openGallery({...target,label:'Selected '+(value==='panel'?'panel':'device')});return true;}
  if(!current||current.id!==id)return false;
  if(action==='wiring-zoom'&&['fit','100','150'].includes(value)){scale=value;draw();return true;}
  if(action==='wiring-open-source'){await openSource();return true;}
  if(action==='wiring-download-source'){await openSource({download:true});return true;}
  if(action==='wiring-open-start'&&sourceCheck&&!sourceCheck.canJump&&!busy){const entry=current,stamp=token;await readPDF(entry.recordId,{page:1,returnWiringId:entry.id,notice:'This saved PDF is a different or unverified source edition. The wiring-picture page number was not used.',canOpen:()=>isCurrent(stamp,entry.id)});return true;}
  return false;
 }
 return {equipmentPreview,cards,recordPreview,targetPreview,show,leave,handle,index};
}
