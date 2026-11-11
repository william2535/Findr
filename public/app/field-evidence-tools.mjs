import {compareTestEvents,localisePath,interpretCoaxObservation} from './field-engine.mjs';
import {addTestEvent} from './field-model.mjs';

const list=value=>Array.isArray(value)?value:[];
const clone=value=>structuredClone(value);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>globalThis.crypto?.randomUUID?.()||`evidence-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const hash=value=>{let n=2166136261;for(const c of JSON.stringify(value))n=Math.imul(n^c.charCodeAt(0),16777619);return(n>>>0).toString(16);};
const field=(id,label,control)=>`<label>${esc(label)}${control.replace(' id="',' id="field-evidence-')}</label>`;
const input=(id,label,value='')=>field(id,label,`<input id="${id}" value="${esc(value)}">`);
const options=(items,value)=>items.map(([id,label])=>`<option value="${esc(id)}" ${id===value?'selected':''}>${esc(label)}</option>`).join('');
const select=(id,label,items,value='')=>field(id,label,`<select id="${id}">${options(items,value)}</select>`);
const check=(id,label,value=false)=>`<label class="field-check"><input id="field-evidence-${id}" type="checkbox" ${value?'checked':''}>${esc(label)}</label>`;
const button=(action,label)=>`<button type="button" class="secondary" data-action="field-evidence-${action}">${esc(label)}</button>`;
const pointLabel=point=>typeof point==='string'?point:point?.label||point?.id||'';
const pointId=point=>typeof point==='string'?point:point?.id;
const currentEvents=(visit,incident)=>list(visit.events).filter(event=>event.incidentId===incident.id&&event.result?.executionState==='performed'&&!list(visit.events).some(next=>next.supersedes===event.id));
const eventChoices=events=>[['','Choose a recorded test'],...events.map(event=>[event.id,`${event.points?.[0]?.location||event.testKind} · ${event.result?.rawText||'No value'} ${event.result?.unit||''} · ${event.id}`])];
const provenanceChoices=[['unknown','Not established'],['field_trace','Traced onsite'],['checked_drawing','Drawing checked against the installation'],['field_observation','Recorded physical observation'],['manufacturer_map_verified','Manufacturer map verified onsite'],['unverified_download','Unverified download / address list']];
const pathDefinition=path=>({labels:list(path?.points).map(pointLabel),topology:path?.topology||'unknown',provenance:path?.provenance||'unknown',sourceReference:path?.sourceReference||''});
const resultText=result=>result?.reason||result?.message||'';

/** Optional tools, collapsed on arrival. A calculation is never a completed test. */
export function evidenceToolsMarkup(visit,incident){
  if(!incident)return '';
  const events=currentEvents(visit,incident),choices=eventChoices(events),path=incident.context?.path||{},result=visit.ui?.evidenceResult;
  const current=result?.incidentId===incident.id?result:null;
  return `<details class="field-card field-evidence-tools" ${visit.ui?.evidenceToolsOpen?'open':''}><summary>Compare saved tests / physical path (optional)</summary><div class="field-form"><p>Use recorded evidence. These tools never apply a generic pass value or infer cable order from addresses.</p>
    <details ${current?.kind==='comparison'?'open':''}><summary>Compare two recorded tests</summary><div class="field-form">${select('compare-a','First recorded test',choices)}${select('compare-b','Second recorded test',choices)}${select('compare-kind','Comparison',[['repeat','Repeat at the same points'],['voltage_drop','First minus second DC voltage']],'repeat')}${check('compare-same','I confirm the readings describe the same comparison conditions')}${button('compare','Compare saved evidence')}<p class="small">Unknown load, power domain, time or reference remains unknown. This checkbox cannot fill missing test details. Use a correction in the test log to add known details.</p></div></details>
    <details ${current?.kind==='path'?'open':''}><summary>Record a physical path and observation boundary</summary><div class="field-form">${field('path-points','Physical points in evidenced order — one label per line',`<textarea id="path-points" rows="4" placeholder="Panel outgoing terminal\nJB-7\nCorridor base">${esc(list(path.points).map(pointLabel).join('\n'))}</textarea>`)}${select('path-topology','Actual topology',[['unknown','Unknown'],['radial','Radial path'],['return_loop','Return loop']],path.topology||'unknown')}${select('path-provenance','How was this physical order established?',provenanceChoices,path.provenance||'unknown')}${input('path-source','Drawing / trace / source reference',path.sourceReference||'')}${check('path-verified','Physical order checked against the actual installation',path.verified===true)}${check('path-branches','Branches and alternate feeds established',path.branchesVerified===true)}${check('path-same','Boundary observations were made under the same comparison conditions',path.sameConditionConfirmed===true)}${list(path.observations).length?check('path-replace','Start a new path definition; retain this path and all its observations'):''}${button('save-path','Save physical path')}
    <p class="small">Imported addresses are programmed identifiers. They do not establish adjacent physical devices. A return-loop integrity fault needs its own supported directional evidence.</p>
    ${list(path.points).length?`${select('observation-point','Observed physical point',[['','Choose a saved point'],...path.points.map((point,index)=>[String(index),`${index+1}. ${pointLabel(point)}`])])}${select('observation-event','Saved test supporting this observation',choices)}${select('observation-assessment','Engineer’s recorded condition',[['unknown','Unknown / inconclusive'],['satisfactory','Satisfactory for this specific check'],['fault_present','Fault condition observed']],'unknown')}${input('observation-reason','What supports that condition? Include the applicable source / state')}${button('add-observation','Append point observation')}${list(path.observations).length?`<ul>${path.observations.map(observation=>`<li>${esc(pointLabel(path.points.find(point=>pointId(point)===observation.pointId))||'Point no longer available')} · ${esc(observation.assessment)} · test ${esc(observation.eventId)}<br>${esc(observation.reason)}</li>`).join('')}</ul>`:''}${button('localise','Review the evidenced investigation span')}`:'<p>Save the path before linking any observations.</p>'}
    ${list(incident.context?.pathHistory).length?`<p class="small">${incident.context.pathHistory.length} earlier path definition(s) retained with their observations.</p>`:''}</div></details>
    <details ${current?.kind==='coax'?'open':''}><summary>Review a recorded coax observation</summary><div class="field-form">${select('coax-event','Saved resistance observation',eventChoices(events.filter(event=>['resistance','continuity'].includes(event.testKind))))}${check('coax-conditions','The recorded span, remote-end, PoC and test conditions describe this saved observation')}<p class="small">This reviews an existing result. Record the exact centre-to-shield or end-to-end method in the test log. Missing isolation, endpoint or PoC evidence keeps the result uninterpreted; visit conditions cannot replace the event’s recorded electrical state.</p>${button('coax','Review saved coax evidence')}</div></details>
    ${current?`<div class="field-status-note" role="status"><strong>${current.kind==='comparison'?'Recorded evidence comparison':current.kind==='coax'?'Recorded coax evidence':'Physical path review'}</strong><p>${esc(resultText(current.result))}</p>${current.result.difference!==null&&current.result.difference!==undefined?`<p>First minus second: ${esc(current.result.difference)} ${esc(current.result.unit)}. No acceptance limit has been applied.</p>`:''}${current.result.reasons?.length?`<ul>${current.result.reasons.map(reason=>`<li>${esc(reason)}</li>`).join('')}</ul>`:''}</div>`:''}
  </div></details>`;
}

/** Returns false for other controllers' actions. Existing measurements are immutable. */
export async function handleEvidenceAction(action,{app,visit,incident,onCommit,toast=()=>{}}){
  if(!action.startsWith('field-evidence-'))return false;
  if(!incident)throw Error('Choose an incident before comparing evidence.');
  const read=id=>String(app.querySelector(`#field-evidence-${id}`)?.value??'').trim();
  const checked=id=>app.querySelector(`#field-evidence-${id}`)?.checked===true;
  let next=clone(visit);let target=next.incidents.find(item=>item.id===incident.id);
  if(!target)throw Error('The incident is no longer available.');
  target.context||={};next.ui||={};
  const events=currentEvents(next,target),findEvent=id=>events.find(event=>event.id===id);
  const append=(input)=>{next=addTestEvent(next,{incidentId:target.id,actor:visit.engineerRef||'',testKind:'evidence_review',method:'recorded_evidence_only',result:{source:'engineer_assessment',executionState:'recorded',rawText:input.text},interpretation:{status:'recorded_only',reason:'Review of saved evidence; no new physical test or model-specific pass is inferred.'},...input});target=next.incidents.find(item=>item.id===incident.id);};
  const show=(kind,result)=>{next.ui.evidenceToolsOpen=true;next.ui.evidenceResult={incidentId:target.id,kind,result};};
  switch(action.slice('field-evidence-'.length)){
    case 'compare':{
      const a=findEvent(read('compare-a')),b=findEvent(read('compare-b'));
      if(!a||!b||a.id===b.id)throw Error('Choose two different performed tests from this incident.');
      const kind=read('compare-kind');if(!['repeat','voltage_drop'].includes(kind))throw Error('Choose a supported comparison.');
      const comparison={kind,sameConditionConfirmed:checked('compare-same')},result=compareTestEvents(a,b,comparison);
      append({id:`evidence-comparison:${target.id}:${hash([a.id,b.id,comparison,result])}`,text:result.message,comparison:{...comparison,eventIds:[a.id,b.id],result}});show('comparison',result);break;
    }
    case 'save-path':{
      const labels=read('path-points').split(/\r?\n/).map(label=>label.trim()).filter(Boolean);
      if(labels.length<2)throw Error('Record at least two physical point labels.');
      if(new Set(labels).size!==labels.length)throw Error('Give each physical point a distinct label so its evidence is unambiguous.');
      const topology=read('path-topology'),provenance=read('path-provenance'),sourceReference=read('path-source');
      if(!['unknown','radial','return_loop'].includes(topology)||!provenanceChoices.some(([id])=>id===provenance))throw Error('Choose the topology and physical-order evidence source.');
      if(checked('path-verified')&&!sourceReference)throw Error('Record the drawing or onsite evidence reference for the confirmed physical order.');
      const previous=target.context.path,definition={labels,topology,provenance,sourceReference},changed=previous&&JSON.stringify(pathDefinition(previous))!==JSON.stringify(definition);
      if(changed&&list(previous.observations).length&&!checked('path-replace'))throw Error('This changes a path with observations. Choose “Start a new path definition” to retain the original and start a separate path.');
      const id=previous&&!changed?previous.id||uid():uid();
      const path={id,topology,provenance,sourceReference,verified:checked('path-verified'),branchesVerified:checked('path-branches'),sameConditionConfirmed:checked('path-same'),points:previous&&!changed?clone(previous.points):labels.map((label,index)=>({id:`${id}:point:${index}`,label,location:label})),observations:previous&&!changed?clone(list(previous.observations)):[]};
      if(JSON.stringify(previous)===JSON.stringify(path)){show('path',localisePath(next,path));break;}
      if(previous){target.context.pathHistory||=[];target.context.pathHistory.push({retainedAt:Date.now(),path:clone(previous)});}
      target.context.path=path;
      append({id:`evidence-path:${target.id}:${hash(path)}`,text:'Physical path definition recorded from the stated source. Address order is not physical cable order.',pathSnapshot:clone(path),previousPath:previous?clone(previous):undefined});show('path',localisePath(next,path));break;
    }
    case 'add-observation':{
      const path=target.context.path;if(!path?.points?.length)throw Error('Save a physical path first.');
      const rawIndex=read('observation-point'),index=Number(rawIndex),event=findEvent(read('observation-event')),assessment=read('observation-assessment'),reason=read('observation-reason');
      if(!rawIndex||!Number.isInteger(index)||!path.points[index]||!event)throw Error('Choose a physical point and a performed test from this incident.');
      if(!['unknown','satisfactory','fault_present'].includes(assessment))throw Error('Choose the observed condition.');
      if(!reason)throw Error('Record why this test supports the stated condition, including its source or limitations.');
      if(list(path.observations).some(item=>item.eventId===event.id&&item.pointId!==pointId(path.points[index])))throw Error('This test is already linked to another physical point. Record a separate test at this point; one reading cannot establish both boundaries.');
      const observation={pointId:pointId(path.points[index]),pointIndex:index,eventId:event.id,assessment,reason};
      if(!list(path.observations).some(item=>Object.keys(observation).every(key=>item[key]===observation[key]))){
        path.observations||=[];path.observations.push(observation);
        append({id:`evidence-boundary:${target.id}:${path.id}:${hash(observation)}`,text:`${pointLabel(path.points[index])}: ${assessment}. ${reason}`,pathObservation:clone(observation),pathId:path.id});
      }
      show('path',localisePath(next,target.context.path));break;
    }
    case 'localise':{
      if(!target.context.path)throw Error('Record the physical path and its evidence first.');
      const result=localisePath(next,target.context.path);
      append({id:`evidence-localisation:${target.id}:${hash([target.context.path,result])}`,text:result.reason,pathSnapshot:clone(target.context.path),localisation:result});show('path',result);break;
    }
    case 'coax':{
      const event=findEvent(read('coax-event'));
      if(!event||!['resistance','continuity'].includes(event.testKind))throw Error('Choose a performed resistance observation from this incident.');
      const conditionsApply=checked('coax-conditions');
      const context={...clone(target.context),permissions:clone(target.permissions||{}),electricalState:event.circuitState||'unknown'};
      // Path drafts are unrelated to the isolation/method context for this review.
      delete context.path;delete context.pathHistory;
      const result=conditionsApply?interpretCoaxObservation(event,context):{state:'recorded_only',reason:'The original observation is retained. Its test conditions have not been confirmed for this review.'};
      const review={eventId:event.id,conditionsApply,contextSnapshot:context,result};
      append({id:`evidence-coax:${target.id}:${hash(review)}`,text:result.reason,coaxReview:review});show('coax',result);break;
    }
    default:return false;
  }
  await onCommit(next);toast('Evidence review saved locally.');return true;
}
