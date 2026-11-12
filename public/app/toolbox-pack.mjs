import {TOOLBOX_PACK} from './toolbox-pack-manifest.mjs';
import {createToolboxPackStore} from './toolbox-pack-store.mjs';
import {calculatePackTool,PACK_CALCULATOR_IDS} from './toolbox-pack-calculators.mjs';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kb=bytes=>(bytes/1024).toFixed(1)+' KB';
const format=value=>Number(value).toLocaleString(undefined,{maximumSignificantDigits:8});
const safeURL=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}};
export function validateToolboxPack(data){
 if(data?.schemaVersion!==1||data.id!==TOOLBOX_PACK.id||data.version!==TOOLBOX_PACK.version||!Array.isArray(data.tools)||data.tools.length!==PACK_CALCULATOR_IDS.length||!Array.isArray(data.guides)||data.guides.length>20)throw new Error('This tool box pack format is not supported. Update FINDR before retrying.');
 if(new Set(data.tools.map(t=>t.id)).size!==data.tools.length)throw new Error('Duplicate calculator in pack.');
 for(const tool of data.tools){if(!PACK_CALCULATOR_IDS.includes(tool.id)||!Array.isArray(tool.fields)||tool.fields.length>8||tool.fields.some(f=>!/^\w{1,30}$/.test(f.key)))throw new Error('Invalid calculator definition.');}
 for(const guide of data.guides)if(!TOOLBOX_PACK.assets.some(a=>a.path===guide.image&&a.type==='image/svg+xml'))throw new Error('Invalid picture reference.');
 return data;
}
export function createToolboxPackController({app,toast=()=>{},store=createToolboxPackStore({manifest:TOOLBOX_PACK})}={}){
 let state=null,pack=null,current='',error='',loading=false,progress=null,renderToken=0;
 const objectURLs=[];
 function cleanURLs(){while(objectURLs.length)URL.revokeObjectURL(objectURLs.pop());}
 function packImage(path){const file=state?.available[path];if(!file)return '';const url=URL.createObjectURL(new Blob([file],{type:'image/svg+xml'}));objectURLs.push(url);return url;}
 function sources(ids){return `<details class="toolbox-more"><summary>Sources & assumptions</summary><ul>${(ids||[]).map(id=>{const s=pack.sources?.[id],url=safeURL(s?.url);return url?`<li><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a></li>`:'';}).join('')}</ul><p>Reference links need a connection. The calculation and original picture are saved locally. Source review: ${esc(pack.checkedAt)}. These aids do not establish compliance or replace the equipment’s instructions.</p></details>`;}
 function action(id,label,cls='secondary',extra=''){return `<button type="button" class="${cls}" data-toolbox-pack="${id}" ${extra}>${label}</button>`;}
 function errorText(err){if(err?.name==='AbortError')return 'Download cancelled. Completed files are saved. Tap Resume to finish later.';if(err?.name==='QuotaExceededError')return 'Not enough device storage. Free space and retry; completed files and other FINDR data are kept.';return typeof err?.message==='string'&&err.message.trim()?err.message:'Tool box storage could not be used. Try again; other saved FINDR data is unchanged.';}
 function banner(){
  const total=TOOLBOX_PACK.assets.reduce((sum,a)=>sum+a.bytes,0),busy=store.downloading;
  return `<section class="toolbox-pack-banner"><div class="eyebrow">GITHUB PACK · ${esc(TOOLBOX_PACK.version)}</div><h2>${state?.complete?'Tool box pack saved':'Download tool box pack'}</h2><p>Six extra calculators and six quick picture guides. ${kb(total)} download from FINDR’s GitHub repository. No AI model needed.</p><p id="toolbox-pack-status" role="status">${loading?'Checking saved pack…':state?`${state.files} / ${state.totalFiles} files saved · ${kb(state.savedBytes)}${state.complete?' · Ready offline':' · '+kb(state.totalBytes-state.savedBytes)+' remaining'}`:'Pack storage has not been checked.'}</p><div id="toolbox-pack-progress" ${busy?'':'hidden'}><progress max="${total}" value="${progress?.receivedBytes||state?.savedBytes||0}"></progress><span>${kb(progress?.receivedBytes||state?.savedBytes||0)} / ${kb(total)}</span></div><div class="toolbox-actions">${busy?action('cancel','Cancel download'):state?.complete?action('remove-request','Remove downloaded pack'):action('download',state?.files?'Resume tool box pack':'Download tool box pack','primary',loading?'disabled':'')}${!busy?action('check','Check saved files'):''}</div><p class="toolbox-footnote">The four original calculators remain available in Tool box. Removing this pack only removes its downloaded guides and definitions.</p><p id="toolbox-pack-error" class="toolbox-error-summary" role="alert" ${error?'':'hidden'}>${esc(error)}</p><div id="toolbox-pack-remove" hidden><p>Remove these downloaded tool definitions and pictures? Your manuals, Panel Pals and fault logs are kept.</p>${action('remove','Remove this pack','danger')} ${action('keep','Keep it')}</div></section>`;
 }
 function cards(){if(!state?.complete||!pack)return `<section class="toolbox-pack-preview"><h2>What’s in the pack?</h2><p>DC current & power · resistor combinations · CCTV storage · camera bandwidth · PoE budget · DC load totals.</p><p>Picture guides: Ohm’s law · series / parallel · PSU or device voltage · camera network path · PoE limits · relay contacts.</p><p class="toolbox-footnote">Download once, then use without a connection. Original FINDR tools and illustrations, researched against the linked technical references.</p></section>`;
  return `<h2>Calculators</h2><div class="toolbox-pack-grid">${pack.tools.map(t=>`<a class="toolbox-pack-card" href="#toolbox/pack-tool--${esc(t.id)}"><span aria-hidden="true">${t.id.includes('cctv')||t.id==='bandwidth'?'▣':'⚒'}</span><h3>${esc(t.title)}</h3><p>${esc(t.description)}</p></a>`).join('')}</div><h2>Quick picture guides</h2><div class="toolbox-pack-grid">${pack.guides.map(g=>`<a class="toolbox-pack-card" href="#toolbox/pack-guide--${esc(g.id)}"><img loading="lazy" src="${packImage(g.image)}" alt="${esc(g.alt)}"><h3>${esc(g.title)}</h3></a>`).join('')}</div>`;
 }
 function toolPage(tool){return `<h1>${esc(tool.title)}</h1><p>${esc(tool.description)}</p><form id="toolbox-pack-form" data-tool="${esc(tool.id)}" class="toolbox-form" novalidate><div class="toolbox-fields">${tool.fields.map(f=>`<label class="toolbox-field">${esc(f.label)}<input type="number" name="${esc(f.key)}" value="${esc(f.default??'')}" inputmode="decimal" min="0" step="any" ${f.max?`max="${esc(f.max)}"`:''} required><small data-pack-field-error="${esc(f.key)}"></small></label>`).join('')}</div><div class="toolbox-actions"><button class="primary" type="submit">Calculate</button></div><p class="toolbox-formula">${esc(tool.formula)}</p><div id="toolbox-pack-result" class="toolbox-result" hidden tabindex="-1" aria-live="polite"></div></form>${sources(tool.sources)}`;}
 function guidePage(guide){const url=packImage(guide.image);return `<h1>${esc(guide.title)}</h1><figure class="toolbox-pack-picture"><a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="${esc(guide.alt)}"></a><figcaption>Tap the picture to open full size.</figcaption></figure><p>${esc(guide.alt)}</p>${guide.notes.map(note=>`<p class="toolbox-note">${esc(note)}</p>`).join('')}${sources(guide.sources)}`;}
 function paint(){
  if(!app.querySelector('.toolbox-pack')&&location.hash!=='#toolbox/pack'&&!location.hash.startsWith('#toolbox/pack-'))return;
  cleanURLs();let inner='';const tool=current.startsWith('tool--')&&pack?.tools.find(t=>t.id===current.slice(6)),guide=current.startsWith('guide--')&&pack?.guides.find(g=>g.id===current.slice(7));
  if(state?.complete&&tool)inner=toolPage(tool);else if(state?.complete&&guide)inner=guidePage(guide);else inner=`<h1>Tool box pack</h1>${banner()}${cards()}`;
  app.innerHTML=`<section class="toolbox-page toolbox-pack"><a class="back" href="${current?'#toolbox/pack':'#toolbox'}">← ${current?'Tool box pack':'Tool box'}</a>${inner}</section>`;
 }
 async function load(){state=await store.inspect();try{pack=state.complete?validateToolboxPack(JSON.parse(new TextDecoder().decode(state.available['pack.json']))):null;}catch(err){state={...state,complete:false};pack=null;throw err;}}
 async function render(slug=''){
  current=slug;loading=true;const token=++renderToken;app.innerHTML='<section class="toolbox-page toolbox-pack"><a class="back" href="#toolbox">← Tool box</a><h1>Tool box pack</h1><p role="status">Checking saved pack…</p></section>';error='';
  try{await load();}catch(err){error=errorText(err);state=null;pack=null;}finally{loading=false;if(token===renderToken)paint();}
 }
 app.addEventListener('click',async event=>{
  const button=event.target.closest('[data-toolbox-pack]');if(!button||!button.closest('.toolbox-pack'))return;
  const kind=button.dataset.toolboxPack;
  if(kind==='cancel'){store.cancel();return;}
  if(kind==='remove-request'){app.querySelector('#toolbox-pack-remove').hidden=false;return;}
  if(kind==='keep'){app.querySelector('#toolbox-pack-remove').hidden=true;return;}
  if(kind==='check'){await render(current);return;}
  if(!['download','remove'].includes(kind))return;
  error='';button.disabled=true;
  try{
   if(kind==='remove'){state=await store.remove();pack=null;toast('Tool box pack removed. Your other FINDR data is unchanged.');}
   else{
    const promise=store.download(p=>{progress=p;const bar=app.querySelector('#toolbox-pack-progress');if(bar){bar.hidden=false;bar.querySelector('progress').value=p.receivedBytes||0;bar.querySelector('span').textContent=kb(p.receivedBytes||0)+' / '+kb(p.totalBytes);}const text=app.querySelector('#toolbox-pack-status');if(text)text.textContent=p.phase==='complete'?'Saved files verified. Ready offline.':`${p.files} / ${p.totalFiles} files saved · ${p.path||'Downloading…'}`;});paint();await promise;await load();toast('Tool box pack saved for offline use.');
   }
  }catch(err){error=errorText(err);try{await load();}catch{/* Retain the original useful error. */}}
  finally{progress=null;paint();}
 });
 app.addEventListener('submit',event=>{
  if(event.target.id!=='toolbox-pack-form')return;event.preventDefault();const form=event.target,result=calculatePackTool(form.dataset.tool,Object.fromEntries(new FormData(form)));
  form.querySelectorAll('input').forEach(input=>input.removeAttribute('aria-invalid'));form.querySelectorAll('[data-pack-field-error]').forEach(el=>el.textContent='');
  const output=form.querySelector('#toolbox-pack-result');output.hidden=false;
  if(result.status!=='calculated'){for(const [key,message]of Object.entries(result.errors)){const field=form.elements.namedItem(key);field?.setAttribute('aria-invalid','true');const target=form.querySelector(`[data-pack-field-error="${key}"]`);if(target)target.textContent=message;}output.textContent='Check the highlighted values before calculating.';form.querySelector('[aria-invalid=true]')?.focus();return;}
  output.innerHTML=`<h2>Calculated estimate</h2><dl class="toolbox-values">${result.results.map(([label,value,unit])=>`<div><dt>${esc(label)}</dt><dd>${format(value)} <span>${esc(unit)}</span></dd></div>`).join('')}</dl>${result.notes.map(note=>`<p class="toolbox-note">${esc(note)}</p>`).join('')}`;output.focus({preventScroll:true});output.scrollIntoView({block:'nearest'});
 });
 app.addEventListener('input',event=>{if(event.target.closest('#toolbox-pack-form')){const result=app.querySelector('#toolbox-pack-result');if(result)result.hidden=true;}});
 return {render,dispose:()=>{store.cancel();cleanURLs();}};
}
