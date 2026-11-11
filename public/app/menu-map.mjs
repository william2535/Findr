import {prepareMenuMap,searchMenuMaps,menuBreadcrumbs,menuChildren,menuNodeKind,menuCodeLabel,menuReferenceText} from './menu-map-engine.mjs';
import {MENU_MAP_FAMILIES,menuMapFamily,menuMapType,menuEntryRoutes,menuSimulationLabel} from './menu-map-registry.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const href = (profile='',node='') => '#menus'+(profile?'/'+encodeURIComponent(profile):'')+(node?'/'+encodeURIComponent(node):'');
const button = (action,label,extra='') => `<button type="button" class="secondary" data-menu-action="${action}" ${extra}>${label}</button>`;
const sourceLink = (source,ref) => {
  try { const u = new URL(source.url);if(!['https:','http:'].includes(u.protocol))return '';u.hash='page='+ref.pdfPage;return u.href;}catch{return '';}
};
const titleFor = map => menuMapFamily(map)?.title||map.title;
const simulationBadge = node => {const label=menuSimulationLabel(node);return label?`<span class="menu-simulation-status" data-simulation-status="${esc(node.simulationStatus||'reference-only')}">${esc(label)}</span>`:'';};
const lineage = (map,node) => menuBreadcrumbs(map,node.id);
const distinct = values => [...new Set(values.filter(Boolean))];
const types = nodes => ({menus:new Set([...nodes.filter(n=>n.kind==='menu').map(n=>n.id),...nodes.map(n=>n.parentId).filter(Boolean)]).size,actions:nodes.filter(n=>['command','status'].includes(n.kind)).length,fields:nodes.filter(n=>['setting','selection','reference'].includes(n.kind)).length});
const routeText = nodes => nodes.map(n=>`${n.code!=null?n.code+' ':''}${n.label}`).join(' › ');

export function createMenuMapController({app,profiles,toast}) {
  let maps=null,pending=null,loadToken=0,query='',profileFilter='',rootFilter='',includeValues=true,resultLimit=40,childLimit=60;
  let currentMap=null,currentNode=null;

  async function load(){
    if(maps)return maps;
    if(!pending)pending=Promise.all(MENU_MAP_FAMILIES.map(async profile=>{
      const response=await fetch(`./data/menu-maps/${encodeURIComponent(profile.id)}.json`);
      if(!response.ok)throw Error(`Could not load the ${profile.title} menu map.`);
      return prepareMenuMap(await response.json());
    })).then(value=>maps=value).catch(error=>{pending=null;throw error;});
    return pending;
  }

  function searchBox(){
    return `<section class="menu-search-panel" aria-labelledby="menu-search-label"><label id="menu-search-label" for="menu-query">Find a menu, number or task</label><div class="menu-search-row"><input id="menu-query" type="search" data-menu-search value="${esc(query)}" placeholder="Try “zone resistance”, “51.46” or “last alarm”…" autocomplete="off"><label class="menu-filter-label">Panel<select data-menu-profile aria-label="Filter menu maps by panel"><option value="">All ${maps.length} families</option>${maps.map(m=>`<option value="${esc(m.profileId)}" ${m.profileId===profileFilter?'selected':''}>${esc(titleFor(m))}</option>`).join('')}</select></label></div><div class="menu-search-options"><label><input type="checkbox" data-menu-values ${includeValues?'checked':''}> Include value lists and references</label><div class="menu-examples">${['zone resistance','last alarm','omit zone','firmware'].map(q=>button('phrase',esc(q),`data-value="${esc(q)}"`)).join('')}</div></div><div data-menu-results></div></section>`;
  }

  function sourceRefs(map,node){
    return `<div class="menu-source-links">${(node.sourceRefs||[]).map(ref=>{
      const source=map._sourceById.get(ref.sourceId),url=source&&sourceLink(source,ref);
      return `<a ${url?`href="${esc(url)}" target="_blank" rel="noopener noreferrer"`:''}><strong>${esc(source?.edition||source?.title||ref.sourceId)}</strong><span>${ref.printedPage?`Printed p${esc(ref.printedPage)} · `:''}PDF p${esc(ref.pdfPage)} ↗</span></a>`;
    }).join('')}</div>`;
  }

  function breadcrumbs(map,node){
    return `<nav class="menu-breadcrumbs" aria-label="Menu location"><a href="${href()}">All panels</a><span aria-hidden="true">›</span><a href="${href(map.profileId)}">${esc(titleFor(map))}</a>${lineage(map,node).map((n,i,a)=>`<span aria-hidden="true">›</span>${i===a.length-1?`<span aria-current="page">${esc(n.label)}</span>`:`<a href="${href(map.profileId,n.id)}">${esc(n.label)}</a>`}`).join('')}</nav>`;
  }

  function mapCard(map){
    const counts=types(map.nodes);
    return `<a class="menu-map-card" href="${href(map.profileId)}"><span class="menu-card-kicker">${esc(menuMapType(map))}</span><h2>${esc(titleFor(map))}</h2><p>${esc(map.baseline)}</p><div class="menu-card-stats"><strong>${map.nodes.length.toLocaleString()}</strong><span>indexed entries<br>${counts.menus} reference groups</span></div><span class="menu-card-link">Explore the map <span aria-hidden="true">→</span></span></a>`;
  }

  function gapItem(map,gap){
    return `<details class="menu-gap"><summary><span class="menu-gap-priority">${gap.priority==='high'?'PRIORITY':'CHECK'}</span> ${esc(gap.title)}</summary><p><strong>Question:</strong> ${esc(gap.question)}</p><p>${esc(gap.reason)}</p><p><strong>Evidence needed:</strong> ${esc(gap.neededEvidence)}</p>${button('copy-gap','Copy this question',`data-profile="${esc(map.profileId)}" data-gap="${esc(gap.id)}"`)}</details>`;
  }

  function landing(){
    const total=maps.reduce((sum,m)=>sum+m.nodes.length,0),gapCount=maps.reduce((sum,m)=>sum+m.gaps.length,0);
    app.innerHTML=`<section class="menu-page" data-menu-root><div class="menu-heading"><div><div class="eyebrow">PANELS &amp; KEYPADS / SOURCE BY SOURCE</div><h1>Every route needs<br><em>the right map.</em></h1><p>Search documented menus, physical controls and configuration references across every current FINDR emulator family. Keep the exact model and manual edition in view.</p></div><div class="menu-research-stamp"><strong>${total.toLocaleString()}</strong><span>indexed entries · ${maps.length} emulator families</span><small>Manual references at every entry<br>Physical-panel verification pending</small></div></div>${searchBox()}${[['fire','Fire panels'],['security','Intruder keypads']].map(([category,title])=>`<section class="menu-family-section"><h2>${title}</h2><div class="menu-panel-grid">${maps.filter(map=>menuMapFamily(map)?.category===category).map(mapCard).join('')}</div></section>`).join('')}<section class="menu-legend"><h2>Know what the number means.</h2><p>A menu shortcut, a zone address and a setting value can all look like the same number. Each entry identifies its type. Conventional panels use physical controls and configuration codes, so their maps do not imply LCD menus. SHOW HINTS appears where a supported practice route is linked; reference-only entries keep their source limits visible.</p><div><span>Menu</span><span>Action / status</span><span>Setting / field</span><span>Value / choice</span><span>Reference</span></div></section><section class="menu-gap-section"><div class="menu-section-title"><div><div class="eyebrow">EVIDENCE STILL NEEDED</div><h2>Help close the gaps.</h2></div><span>${gapCount} specific checks</span></div><p>These are documented conflicts or missing model/version details. They stay visible until evidence resolves them.</p>${maps.map(map=>`<details class="menu-gap-family"><summary>${esc(titleFor(map))}<span>${map.gaps.length} checks</span></summary>${map.gaps.map(gap=>gapItem(map,gap)).join('')}</details>`).join('')}</section><p class="menu-footer-note">Each map retains its own source editions and evidence limits. Entry counts include settings, choices and references; they are not counts of simulated screens. Search retrieves saved entries and works offline with the app.</p></section>`;
    renderResults();
  }

  function panel(map){
    const roots=menuChildren(map),counts=types(map.nodes);
    app.innerHTML=`<section class="menu-page" data-menu-root><a class="back" href="${href()}">← All menu maps</a><div class="menu-panel-heading"><div><div class="eyebrow">${esc(menuMapType(map).toUpperCase())}</div><h1>${esc(titleFor(map))}</h1><p>${esc(map.baseline)}</p></div>${menuMapFamily(map)?`<a class="secondary" href="${esc(menuMapFamily(map).route)}">Open ${menuMapFamily(map).kind==='keypad'?'keypad':'panel'} emulator →</a>`:''}</div>${searchBox()}<div class="menu-scope"><strong>Model scope</strong><p>${esc(map.panelModels.join(' · '))}</p><p>${esc(map.scope)}</p><small>${counts.menus} reference groups · ${counts.actions} actions/status entries · ${counts.fields} settings, choices and references</small></div><div class="menu-panel-layout"><section><h2>Choose a reference section</h2><div class="menu-branch-list">${roots.map(node=>nodeLink(map,node)).join('')}</div><section class="menu-numbering"><h2>Numbers and navigation</h2><p>${esc(map.numbering.explanation)}</p><dl>${map.numbering.examples.map(example=>`<div><dt>${esc(example.code)}</dt><dd>${esc(example.meaning)}</dd></div>`).join('')}</dl>${map.numbering.caveats.length?`<ul>${map.numbering.caveats.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>`:''}<h3>Key actions</h3><dl>${map.navigation.map(n=>`<div><dt>${esc(n.keys)}</dt><dd>${esc(n.action)}</dd></div>`).join('')}</dl></section></section><aside><section class="menu-evidence"><h2>Source editions</h2>${map.sources.map(source=>`<details><summary>${esc(source.edition)}</summary><p>${esc(source.title)}</p><p>${esc(source.scope||'See the edition and model details in this source.')}</p><p class="small">${esc(source.pageNumbering||'PDF links use one-based page numbers.')}</p><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">Open source ↗</a></details>`).join('')}<a class="menu-download" href="./data/menu-maps/${esc(map.profileId)}.json" download="FINDR-${esc(map.profileId)}-menu-map.json">Download reference data ↓</a></section><section class="menu-coverage"><h2>Coverage and limits</h2><p>${esc(map.coverage.strategy)}</p><details><summary>Mapped areas</summary><ul>${map.coverage.mappedAreas.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></details><details><summary>Still outside this baseline</summary><ul>${map.coverage.excludedAreas.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></details><p class="small">${esc(map.coverage.confidence)}</p></section></aside></div><section class="menu-gap-section"><h2>Questions for this panel</h2><p>Resolve these against the exact model and firmware before treating the reference as a verified match.</p>${map.gaps.map(gap=>gapItem(map,gap)).join('')}</section></section>`;
    renderResults();
  }

  function nodeLink(map,node){
    const count=menuChildren(map,node.id).length;
    return `<a class="menu-branch" href="${href(map.profileId,node.id)}"><span class="menu-branch-code ${node.code==null?'menu-branch-code-blank':''}">${node.code!=null?esc(node.code):'↳'}</span><span><strong>${esc(node.label)}</strong><small>${menuNodeKind(node)}${count?' · '+count+' entries':''}${menuSimulationLabel(node)?' · '+esc(menuSimulationLabel(node)):''}${node.code!=null&&['setting','selection','reference'].includes(node.kind)?' · '+esc(menuCodeLabel(node)):''}</small></span><span class="menu-branch-arrow" aria-hidden="true">→</span></a>`;
  }

  function entry(map,node){
    const path=lineage(map,node),children=menuChildren(map,node.id),parent=map._byId.get(node.parentId),related=map.gaps.filter(gap=>gap.affectedNodeIds?.includes(node.id)),conditions=distinct(path.flatMap(n=>n.conditions||[]));
    const profile=profiles.find(p=>p.id===map.profileId),taskIds=(node.practiceTaskIds||[]).filter(id=>profile?.tasks.some(task=>task.id===id));
    const crossRefs=(node.relatedNodeIds||[]).map(id=>map._byId.get(id)).filter(Boolean),routes=menuEntryRoutes(map,node),family=menuMapFamily(map);
    const distinctPractice=routes.practice&&routes.practice!==routes.hints;
    const routeActions=`${distinctPractice?`<a class="primary" href="${esc(routes.practice)}">${family?.kind==='keypad'?(node.kind==='reference'?'Open emulator reference':'Open on keypad'):'Practise linked lesson'} →</a>`:''}${routes.hints?`<a class="${distinctPractice?'secondary':'primary'} menu-show-hints" href="${esc(routes.hints)}" title="Follow the highlighted physical controls yourself">SHOW HINTS</a>`:''}`;
    app.innerHTML=`<section class="menu-page" data-menu-root>${breadcrumbs(map,node)}<div class="menu-entry-topline"><span class="menu-kind">${menuNodeKind(node)}</span>${simulationBadge(node)}<span>${esc(menuCodeLabel(node)||'No verified numeric shortcut')}</span></div><div class="menu-entry-heading"><div><h1>${esc(node.label)}</h1><p>${esc(node.summary)}</p></div><div class="inline-actions">${routeActions}${button('copy-entry','Copy route + references')}</div></div>${!routes.practice&&!routes.hints?`<p class="menu-route-note">${node.simulationStatus==='implemented'?'This behaviour is represented in the trainer; a step-by-step route is not linked for this entry.':'Read this entry as a source reference. No verified interactive route is linked.'}</p>`:''}<div class="menu-entry-baseline"><strong>${esc(titleFor(map))}</strong><span>${esc(map.baseline)}</span></div><div class="menu-entry-layout"><div><section class="menu-path-card"><h2>Where it sits</h2><ol>${path.map(n=>`<li><a href="${href(map.profileId,n.id)}">${n.code!=null?`<span>${esc(n.code)}</span> `:''}${esc(n.label)}</a><small>${menuNodeKind(n)}</small></li>`).join('')}</ol>${node.address?`<p><strong>Documented address:</strong> <code>${esc(node.address)}</code></p>`:''}<p class="small">Numbers remain local to their menu or field. This hierarchy does not imply that its numbers can be entered as one continuous code.</p></section>${children.length?`<section class="menu-children"><div class="menu-section-title"><h2>Within this entry</h2><span>${children.length} entries</span></div><div class="menu-branch-list">${children.slice(0,childLimit).map(n=>nodeLink(map,n)).join('')}</div>${children.length>childLimit?button('more-children',`Show all ${children.length} entries`):''}</section>`:'<p class="menu-leaf-note">This is the end of the currently documented branch. The source page contains its detailed behaviour and configuration rules.</p>'}${crossRefs.length?`<section class="menu-linked-reference"><h2>Related documented entries</h2><p>Shared definitions or edition-specific counterparts linked by the source map.</p><div class="menu-branch-list">${crossRefs.map(n=>nodeLink(map,n)).join('')}</div></section>`:''}${taskIds.length?`<section class="menu-linked-practice"><h2>Practise this route</h2>${taskIds.map(id=>`<a class="secondary" href="#practice/${esc(map.profileId)}/${esc(id)}">${esc(profile.tasks.find(t=>t.id===id).title)} →</a>`).join('')}</section>`:''}${parent?`<a class="back" href="${href(map.profileId,parent.id)}">← ${esc(parent.label)}</a>`:''}</div><aside><section class="menu-entry-evidence"><h2>Check the evidence</h2><p><strong>Access:</strong> ${esc(node.access||'See the source')}</p>${conditions.length?`<h3>When it applies</h3><ul>${conditions.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>`:''}${node.notes?.length?`<h3>Details to keep in mind</h3><ul>${node.notes.map(note=>`<li>${esc(note)}</li>`).join('')}</ul>`:''}${sourceRefs(map,node)}<p class="small">A cited manual confirms the documented reference. The real panel’s firmware and configuration still need to match.</p></section>${related.length?`<section class="menu-entry-gaps"><h2>Unresolved at this entry</h2>${related.map(gap=>gapItem(map,gap)).join('')}</section>`:''}<section class="menu-contribute"><h2>Different on your panel?</h2><p>Capture the exact menu label, its parent screen, the panel model and software version. This makes the difference reproducible.</p>${button('copy-gap-template','Copy evidence checklist')}</section></aside></div></section>`;
  }

  function renderResults(){
    const target=app.querySelector('[data-menu-results]');if(!target)return;
    if(!query.trim()){target.innerHTML='';return;}
    const results=searchMenuMaps(maps,query,{profileId:profileFilter,rootId:rootFilter,includeValues});
    target.innerHTML=`<div class="menu-result-heading" role="status">${results.length} matching ${results.length===1?'entry':'entries'}${profileFilter?' in '+esc(titleFor(maps.find(m=>m.profileId===profileFilter))):''}</div>${results.length?`<div class="menu-search-results">${results.slice(0,resultLimit).map(({map,node,path,approximate})=>`<a class="menu-result" href="${href(map.profileId,node.id)}"><div class="menu-result-meta"><strong>${esc(titleFor(map))}</strong><span>${menuNodeKind(node)}${approximate?' · similar spelling':''}${menuSimulationLabel(node)?' · '+esc(menuSimulationLabel(node)):''}</span></div><h3>${node.code!=null?`<span>${esc(node.code)}</span> `:''}${esc(node.label)}</h3><p>${esc(routeText(path.slice(0,-1)))}</p><small>${esc(map._sourceById.get(node.sourceRefs[0]?.sourceId)?.edition||map.baseline)}${node.address?' · '+esc(node.address):''}</small></a>`).join('')}</div>${results.length>resultLimit?button('more-results',`Show more (${Math.min(resultLimit,results.length)} of ${results.length})`):''}`:`<div class="menu-no-match"><h3>No documented match.</h3><p>Try the exact display wording, a shorter phrase or another panel filter. An empty result means this index has no matching verified entry; it does not prove the real panel lacks that menu.</p>${button('copy-search-gap','Copy this missing-menu question')}</div>`}`;
  }

  async function copy(text){try{await navigator.clipboard.writeText(text);toast?.('Copied with its model, edition and source references.');}catch{
    const box=document.createElement('textarea');box.className='menu-copy-fallback';box.readOnly=true;box.rows=12;box.value=text;app.querySelector('[data-menu-root]')?.append(box);box.focus();box.select();toast?.('Select and copy the reference text below.');
  }}

  async function render(profileId,nodeId){
    const token=++loadToken;
    app.innerHTML='<section class="menu-page"><div class="loading">Opening the sourced menu maps…</div></section>';
    try{
      await load();
      if(token!==loadToken || !location.hash.startsWith('#menus'))return;
      currentMap=maps.find(map=>map.profileId===profileId)||null;
      currentNode=currentMap?currentMap._byId.get(nodeId)||null:null;
      profileFilter=currentMap?.profileId||'';rootFilter='';childLimit=60;
      if(profileId&&!currentMap || nodeId&&!currentNode){app.innerHTML=`<section class="menu-page"><h1>That reference was not found.</h1><p>The link may refer to another version of the map. Search the available references below.</p><a class="primary" href="${href(currentMap?.profileId||'')}">Open menu map</a></section>`;return;}
      currentNode?entry(currentMap,currentNode):currentMap?panel(currentMap):landing();
    }catch(error){if(token!==loadToken || !location.hash.startsWith('#menus'))return;app.innerHTML=`<section class="menu-page"><h1>The menu maps could not load.</h1><p>${esc(error.message)}</p>${button('retry','Try again')}<a class="back" href="#practice">Back to practice</a></section>`;}
  }

  app.addEventListener('input',event=>{if(!event.target.matches('[data-menu-search]'))return;query=event.target.value;resultLimit=40;renderResults();});
  app.addEventListener('change',event=>{
    if(event.target.matches('[data-menu-profile]')){profileFilter=event.target.value;rootFilter='';resultLimit=40;renderResults();}
    if(event.target.matches('[data-menu-values]')){includeValues=event.target.checked;resultLimit=40;renderResults();}
  });
  app.addEventListener('click',event=>{
    const target=event.target.closest('[data-menu-action]');if(!target||!app.contains(target))return;
    const action=target.dataset.menuAction;
    if(action==='retry'){render(currentMap?.profileId,currentNode?.id);return;}
    if(action==='phrase'){query=target.dataset.value;const input=app.querySelector('[data-menu-search]');input.value=query;input.focus();resultLimit=40;renderResults();}
    if(action==='more-results'){resultLimit+=40;renderResults();}
    if(action==='more-children'&&currentNode){childLimit=Infinity;entry(currentMap,currentNode);}
    if(action==='copy-entry'&&currentNode)copy(menuReferenceText(currentMap,currentNode)+'\nFINDR: '+location.href);
    if(action==='copy-gap'){
      const map=maps.find(m=>m.profileId===target.dataset.profile),gap=map?.gaps.find(g=>g.id===target.dataset.gap);
      if(gap)copy(`${titleFor(map)} — ${map.baseline}\n${gap.title}\nQuestion: ${gap.question}\nWhy: ${gap.reason}\nEvidence needed: ${gap.neededEvidence}\nFINDR: ${location.origin+location.pathname+href(map.profileId)}`);
    }
    if(action==='copy-gap-template'&&currentNode)copy(menuReferenceText(currentMap,currentNode)+'\n\nObserved on my panel:\nControl panel model:\nPanel software version:\nKeypad model/version:\nUser/engineer role:\nParent menu label and number:\nActual entry label and number:\nWhat differs (include before/after screens):\nMatching manual edition, if available:\nDo not include passcodes or customer details.');
    if(action==='copy-search-gap')copy(`FINDR missing-menu lookup\nSearch: ${query}\nPanel filter: ${profileFilter||'All families'}\nExact panel model:\nSoftware version:\nUser or engineer menu:\nExact display wording and parent menu:\nSupporting photo or manual edition/page:\n`);
  });
  return {render};
}
