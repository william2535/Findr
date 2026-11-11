import {menuMapFamily,menuEntryRoutes,menuSimulationLabel} from './menu-map-registry.mjs';
import {serviceTrainerForPanel} from './fire-service-manuals.mjs';

const list=value=>Array.isArray(value)?value:[];
const esc=value=>String(value??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
const aliases={gent:'gent-vigilon',nano:'gent-nano','gent-vigilon-4-6-loop':'gent-vigilon','minerva-mx':'minerva'};
export const hintFamilyId=id=>menuMapFamily(aliases[id]||id)?.id||'';
export function scopedHintRoute(route,panelId){
 const binding=serviceTrainerForPanel(panelId);
 return binding?.engineId==='xfp'&&binding.variantId&&/^#xfp\/(coach|guided)\/[^/]+$/.test(route||'')?route+'/'+binding.variantId:route;
}
export function panelHintContext(panel={},profile=null){
 const exactFire={'gent-vigilon-4-6-loop':'gent-vigilon','gent-nano':'gent-nano','c-tec-cfp-standard':'c-tec-cfp-standard','kentec-sigma-cp':'kentec-sigma-cp'},service=serviceTrainerForPanel(panel.id);
 const candidate=service?.engineId||exactFire[panel.id]||(list(profile?.panelIds).includes(panel.id)?profile.id:'');
 const bindingNotice=panel.id==='orisec-cp-50-cp-100-cp-200'?'CP-200 is outside this legacy trainer. Installer scope: CP-25/50/100; user lessons: CP-25/50.':profile?.id==='texecom-premier-elite'?'This opens the Premier Elite 48 training fixture. Check the source limits for other pictured Elite models.':service?.scope||'';
 return {bindingNotice,engineId:hintFamilyId(candidate),panelId:panel.id||'',panelName:[panel.brand,panel.model].filter(Boolean).join(' '),manualCount:list(panel.record_ids).length,trainerScope:profile?.scope||'',edition:profile?.edition||''};
}
export function helpBar(id,{panelId='',panelName='',manualCount=null,trainerScope='',edition='',bindingNotice=''}={}){
 const family=menuMapFamily(hintFamilyId(id));
 return `<div class="onsite-bar" data-onsite-panel="${esc(family?.id||'')}" data-onsite-panel-id="${esc(panelId)}" data-onsite-panel-name="${esc(panelName||family?.title||'Selected panel')}" data-onsite-scope="${esc(trainerScope)}" data-onsite-edition="${esc(edition)}" data-onsite-binding-notice="${esc(bindingNotice)}" ${manualCount===null?'':`data-onsite-manual-count="${Number(manualCount)||0}"`}><button type="button" data-onsite="hints">💡 HINTS</button><button type="button" data-onsite="find">🔎 FIND A ${family?.mapKind==='controls'?'CONTROL':'MENU'}</button></div>`;
}
const terms=[
 [/walk test|test detectors?|weekly test/,/walk test|weekly test|zone test/i],
 [/fault history|event log/,/historic|event log|fault log|history/i],
 [/date and time|set time/,/clock|time and date|date and time/i],
 [/device address/,/loop address|loop map|device address/i],
 [/engineer mode|level 3|access 3/,/engineer|engineering|level.three|level.3|write enable/i],
 [/reset panel/,/reset/i],
 [/test sounders/,/sounder test|bell test|test sounders/i],
 [/disable sounders/,/disable.*(sounder|alarm sector|master alarm)/i],
 [/add device|replace device|add detector/,/add.*(?:detector|device)|replace.*(?:detector|device)|find new devices|accept.*new.*(?:detector|device)/i]
];
export function searchHintRows(rows,query=''){
 const q=String(query).toLowerCase().trim(),alias=terms.find(([pattern])=>pattern.test(q))?.[1];
 if(!q)return rows;
 return rows.filter(row=>{const text=[row.title,row.aliases,row.summary].join(' ').toLowerCase(),shortWords=new Set(text.match(/[a-z0-9]+/g)||[]);return q.split(/\s+/).every(word=>word.length<4?shortWords.has(word)||shortWords.has(word+'s'):text.includes(word))||alias?.test(row.title);});
}
function lessonRows(family,lessons,sources,controls=[]){
 const controlLabels=Object.fromEntries(list(controls).map(key=>[key.id,[key.boardLabel,key.label].filter(Boolean).join(' · ')]));
 return list(lessons).map(lesson=>({id:'lesson:'+lesson.id,title:lesson.title,aliases:[lesson.summary,lesson.description,...list(lesson.aliases)].join(' '),summary:lesson.summary||lesson.description||'',steps:list(lesson.steps),access:list(lesson.prerequisites).join(' '),sources,controlLabels,refs:list(lesson.sourceRefs),kind:'task',route:family.route+'/coach/'+encodeURIComponent(lesson.id),routeLabel:'Start guided task',detail:'#menus/'+family.id}));
}
export function menuHintRows(family,map){
 return list(map.nodes).filter(node=>!node.lessonId&&node.id!=='practice-tasks').map(node=>({id:'menu:'+node.id,title:node.label,aliases:[node.code,node.address,...list(node.aliases),node.summary].filter(Boolean).join(' '),summary:node.summary,access:node.access,sources:list(map.sources),refs:list(node.sourceRefs),kind:'menu',status:menuSimulationLabel(node),route:menuEntryRoutes(map,node).hints,routeLabel:family.kind==='conventional'?'Start matching guided task':'Practise this menu route',detail:'#menus/'+family.id+'/'+encodeURIComponent(node.id)}));
}
export async function loadHintCatalogue(id,{fetcher=globalThis.fetch}={}){
 const family=menuMapFamily(hintFamilyId(id));if(!family)return [];
 const read=async file=>{const response=await fetcher('./data/'+file+'.json');if(!response.ok)throw Error('The saved '+family.title+' reference is unavailable.');return response.json();};
 const map=await read('menu-maps/'+family.id),menus=menuHintRows(family,map);
 let tasks=[];
 if(family.kind==='gent'||family.kind==='nano'){
  const [data,panel]=await Promise.all([read(family.kind==='gent'?'gent-lessons':'gent-nano-lessons'),read(family.id)]);tasks=lessonRows(family,data.lessons,list(data.sources),panel.physicalKeys);
 }else if(family.kind==='conventional'){
  const data=await read('conventional-fire'),profile=list(data.profiles).find(item=>item.id===family.id);tasks=lessonRows(family,profile?.lessons,[...list(data.sources),...list(profile?.sources)],[...list(profile?.physicalKeys),...list(profile?.internalControls)]);
 }else if(family.kind==='xfp'||family.kind==='twinflex'||family.kind==='minerva'){
  const data=await read(family.kind==='minerva'?'minerva-mx':family.id);tasks=lessonRows(family,data.lessons,list(data.sources),[...list(data.physicalKeys),...list(data.internalControls)]);
 }else{
  const data=await read('practice'),profile=list(data.profiles).find(item=>item.id===family.id);
  tasks=list(profile?.tasks).map(task=>({id:'task:'+task.id,title:task.title,aliases:[...list(task.aliases),task.description].join(' '),summary:task.description,steps:list(task.hints).map((instruction,index)=>({title:'Step '+(index+1),instruction,sourceRefs:task.sourceRefs})),access:task.sessionStart||profile.sessionStart,sources:list(profile.sources),refs:list(task.sourceRefs),kind:'task',route:'#practice/'+family.id+'/'+encodeURIComponent(task.id),routeLabel:'Open guided practice',detail:'#menus/'+family.id}));
 }
 return [...tasks,...menus];
}

const cache=new Map();
async function catalogue(id){if(cache.has(id))return cache.get(id);const rows=await loadHintCatalogue(id);cache.set(id,rows);return rows;}
let dialog,rows=[],selected,step=0,full=false,revision=0,mode='hints',context={};
function close(){revision++;dialog?.close();}
function reference(ref,sources){const source=list(sources).find(item=>item.id===ref.sourceId);return esc([source?.title||ref.sourceId,source?.editionLabel||source?.edition||source?.revision,(ref.pages||[ref.pdfPage]).filter(Boolean).join(', ')].filter(Boolean).join(' · '));}
function results(){
 const query=dialog.querySelector('input')?.value||'',eligible=mode==='find'?rows.filter(row=>row.kind==='menu'):rows;
 const hits=searchHintRows(eligible,query),tasks=hits.filter(row=>row.kind==='task'),menus=hits.filter(row=>row.kind==='menu');
 const cards=(items)=>items.slice(0,60).map(row=>`<button type="button" data-result="${rows.indexOf(row)}"><strong>${esc(row.title)}</strong><small>${row.kind==='task'?'Guided task':esc(row.status||'Documented menu reference')}</small></button>`).join('');
 dialog.querySelector('main').innerHTML=hits.length?`${tasks.length?`<h3>Choose a guided task</h3><p class="small">Starting a task loads its fictional practice setup. Opening these hints changes no panel settings.</p>${cards(tasks)}`:''}${menus.length?`<h3>${mode==='hints'?'Find a menu route':'Menu and control references'}</h3>${cards(menus)}${menus.length>60?'<p class="small">Add a word to narrow these results.</p>':''}`:''}`:'<p>No verified hint matches that wording for this panel.</p><p>Try the exact display label or open its full menu/control map.</p>';
}
export function hintStepControlLabel(value,labels={}){
 const keys=list(value.expectedKeys);if(keys.length)return keys.map(key=>labels[key]||(/^[A-Z0-9]$/.test(key)?key:'')).filter(Boolean).join(' → ');
 return value.nextKey?(labels[value.nextKey]||(!String(value.nextKey).includes('_')?value.nextKey:'')):'';
}
function stepMarkup(value,sources,labels={}){
 const physical=hintStepControlLabel(value,labels),instruction=value.explanation||value.instruction||'',practice=value.action||value.expectedInput||value.expectedMode||value.expectedAction||typeof value.expectedCover==='boolean'||value.expectedDelayMinutes!==undefined;
 return `<article><strong>${esc(value.title||value.id||'Documented step')}</strong><p>${esc(instruction)}</p>${physical?`<p><b>Physical control: ${esc(physical)}</b>${value.holdMs?` · hold ${value.holdMs/1000} seconds`:''}</p>`:practice?'<p class="onsite-assist">Use the labelled practice action in the trainer. This is not a panel key.</p>':''}${value.expected?`<p>Look for: ${esc(value.expected)}</p>`:''}<small>${list(value.sourceRefs).map(ref=>reference(ref,sources)).join('<br>')}</small></article>`;
}
function detail(){
 const row={...selected,route:scopedHintRoute(selected.route,context.panelId)},steps=list(row.steps);
 dialog.querySelector('main').innerHTML=`<button type="button" data-back>← Results</button><h2>${esc(row.title)}</h2><p>${esc(row.access||'Check the model, edition and authorised access against the manual.')}</p><p>${esc(row.summary||'')}</p>${steps.length?`${full?steps.map(value=>stepMarkup(value,row.sources,row.controlLabels)).join(''):`<p>Step ${step+1} of ${steps.length}</p>${stepMarkup(steps[step],row.sources,row.controlLabels)}`}<div class="onsite-step-actions"><button type="button" data-prev ${step===0?'disabled':''}>Previous step</button><button type="button" data-next ${step===steps.length-1?'disabled':''}>Next step</button><button type="button" data-full>${full?'Show current step':'Show all steps'}</button></div>`:`<p class="onsite-reference-status">${esc(row.status||'Documented reference')}</p><p>${list(row.refs).map(ref=>reference(ref,row.sources)).join('<br>')}</p>`}<p><a href="${esc(row.detail)}">Full menu/control reference →</a></p>${row.route?`<a class="primary" href="${esc(row.route)}">${esc(row.routeLabel)} →</a><p class="small">${row.kind==='task'||row.route.includes('/coach/')?'Starts a fictional task setup; you perform each action yourself.':'Highlights a supported navigation route. You press the keys; hints stop before changing a setting or activating a command.'}</p>`:'<p>No verified button sequence is linked to this reference. Read the cited source and check the exact installed version.</p>'}`;
}
function unsupported(){
 const hasManuals=context.manualCount>0;
 dialog.querySelector('main').innerHTML=`<h2>No verified interactive hints for this model yet.</h2><p>Your selected panel is <strong>${esc(context.panelName)}</strong>. FINDR has no matching engine or verified key sequence for it.</p><p>Use its linked manuals to check the exact controls and edition.</p><div class="onsite-actions">${context.panelId&&hasManuals?`<button type="button" class="primary" data-action="panel-manuals" data-id="${esc(context.panelId)}">Open ${context.manualCount} linked document${context.manualCount===1?'':'s'}</button>`:''}<button type="button" class="secondary" data-action="search-archive" data-value="${esc(context.panelName)}">Search manuals for this model</button><a class="secondary" href="#menus">Browse supported menu/control maps →</a></div>`;
}
async function load(){
 const token=++revision;rows=[];const family=menuMapFamily(context.engineId);
 if(!family){unsupported();return;}
 dialog.querySelector('main').textContent='Opening '+family.title+' hints…';
 try{const data=await catalogue(family.id);if(token!==revision||!dialog.open)return;rows=data;results();}
 catch(error){if(token===revision&&dialog.open)dialog.querySelector('main').innerHTML=`<p>${esc(error.message)}</p><p>Finish the app’s offline update, then retry.</p><button type="button" data-retry>Retry</button>`;}
}
function ensureDialog(){
 if(dialog)return;dialog=document.createElement('dialog');dialog.className='onsite-dialog';document.body.append(dialog);
 dialog.addEventListener('close',()=>{revision++;});
 dialog.addEventListener('click',event=>{const target=event.target.closest('button,a');if(!target)return;if(target.matches('a,[data-close],[data-action]'))close();else if(target.hasAttribute('data-retry'))load();else if(target.hasAttribute('data-result')){selected=rows[Number(target.dataset.result)];if(!selected)return;step=0;full=false;detail();}else if(target.hasAttribute('data-back'))results();else if(selected){if(target.hasAttribute('data-next'))step=Math.min(list(selected.steps).length-1,step+1);if(target.hasAttribute('data-prev'))step=Math.max(0,step-1);if(target.hasAttribute('data-full'))full=!full;detail();}});
 dialog.addEventListener('input',event=>{if(event.target.matches('input'))results();});
}
globalThis.document?.addEventListener('click',event=>{
 const button=event.target.closest('[data-onsite]');if(!button)return;
 const bar=button.closest('[data-onsite-panel]');if(!bar)return;
 mode=button.dataset.onsite==='find'?'find':'hints';
 context={engineId:hintFamilyId(bar.dataset.onsitePanel),panelId:bar.dataset.onsitePanelId||'',panelName:bar.dataset.onsitePanelName||'Selected panel',manualCount:Number(bar.dataset.onsiteManualCount)||0,trainerScope:bar.dataset.onsiteScope||'',edition:bar.dataset.onsiteEdition||'',bindingNotice:bar.dataset.onsiteBindingNotice||''};
 if(mode==='hints'&&context.engineId){const request=new CustomEvent('findr:request-hints',{bubbles:true,cancelable:true,detail:{engineId:context.engineId}});if(!button.dispatchEvent(request))return;}
 ensureDialog();const family=menuMapFamily(context.engineId);selected=null;
 dialog.innerHTML=`<header><strong>${mode==='hints'?'HINTS':'MENU / CONTROL FINDER'}</strong><button type="button" data-close>Close</button></header><div class="onsite-context"><small>Selected panel / keypad</small><h2>${esc(context.panelName||family?.title)}</h2>${family&&context.panelName!==family.title?`<p>Trainer: ${esc(family.title)}</p>`:''}${context.bindingNotice?`<p class="onsite-binding-notice">${esc(context.bindingNotice)}</p>`:''}${context.edition?`<p class="small">${esc(context.edition)}</p>`:''}${context.trainerScope?`<details><summary>Trainer model and source limits</summary><p>${esc(context.trainerScope)}</p></details>`:''}</div>${family?`<label>Find an operation<input type="search" placeholder="Try walk test, fault history or level 3" aria-label="Find a hint operation"></label><p class="small">${mode==='hints'?'Choose a task or menu below. Each result keeps its source and model scope.':'References include supported routes and clearly labelled source-only entries.'}</p><p><a href="#menus/${family.id}">Open full ${family.mapKind==='controls'?'control':'menu'} map →</a></p>`:''}<main></main>`;
 dialog.showModal();load();
});
