// Opt-in local test flows. No panel transport, browser API, timer or live output.
// Pyronix Enforcer V11 Programming Guide, SAP 102028847-02, pp31–33:
// https://cdn.connectec.uk/Images/Products/alarms/enforcer-v11-programming-guide.pdf
// Extended User Guide Rev-02, pp23–24 distinguishes the single-input user test:
// https://eaglesecuritysolutions.co.uk/user-manual/pyronix-wireless-alarm-system-extended-user-guide.pdf

const handled = () => ({handled:true});
const wrap = (n,size) => size ? (n % size + size) % size : 0;
const unique = values => [...new Set(values)];
const enabled = node => Boolean(node.areaSelection || node.individualSelection || node.outputFunctions || node.outputsOnEnter);
const flowFor = (state,node) => enabled(node) && state.testFlow?.nodeId===node.id ? state.testFlow : null;
const digitsEqual = (a,b) => /^\d+$/.test(String(a)) && /^\d+$/.test(String(b)) && Number(a)===Number(b);
const labelForKey = (model,key) => model.profile?.keys?.find(item=>item.id===key)?.label || ({enter:'YES',back:'NO'}[key] || key);
const zoneRecords = (model,state,node) => (state.records?.zone || model.profile?.zones?.map(zone=>({id:zone.address,label:zone.name})) || [])
  .filter(record=>!node.recordIds || node.recordIds.includes(record.id));
const areaList = value => Array.isArray(value) ? value.map(String) : typeof value==='string' ? [...value].filter(code=>/[A-D]/.test(code)) : value && typeof value==='object' ? Object.keys(value).filter(code=>value[code]) : [];

function zonesInAreas(model,state,node,areas) {
  return zoneRecords(model,state,node).filter(record=>{
    const zone=model.profile?.zones?.find(item=>item.address===record.id);
    const assignment=state.zoneAreas?.[record.id] ?? node.zoneAreas?.[record.id] ?? zone?.areas ?? ['A'];
    return areaList(assignment).some(area=>areas.includes(area));
  }).map(record=>record.id);
}

function stop(state,flow) {
  if(flow.kind==='walk')state.walk.running=false;
  else for(const output of Object.keys(state.outputStates || {}))state.outputStates[output]=false;
  flow.phase='stopped';flow.activated=[];state.digits='';
  state.feedback=flow.kind==='walk' ? 'Walk test stopped. '+state.walk.hits.length+' fictional inputs completed.' : 'The fictional output test is stopped.';
  return {handled:true,exit:true};
}

function startWalk(state,flow,ids,frame) {
  if(!ids.length){state.feedback='No fitted fictional inputs belong to that selection.';return handled();}
  flow.phase='running';flow.activated=[];
  state.walk.running=true;state.walk.allowed=unique(ids);state.walk.hits=[];
  frame.cursor=0;frame.context ||= {};frame.context.zone=state.walk.allowed[0];state.digits='';
  state.feedback='Walk test running. '+(flow.requireRestore?'Activate and restore each selected fictional input.':'Activate each selected fictional input.');
  return handled();
}

/** Called after the ordinary activate() setup. Non-opted-in nodes are untouched. */
export function activateExtendedTest(model,state,node,frame) {
  if(!enabled(node))return false;
  state.digits='';frame.cursor=0;
  if(node.areaSelection || node.individualSelection) {
    const availableAreas=unique(Object.values(node.keyChoiceCodes || {logout:'A',previous:'B',cancel:'C','area-d':'D'}).map(String));
    state.testFlow={nodeId:node.id,kind:'walk',phase:node.areaSelection?'areas':'individual',areas:unique(node.initialAreas || ['A']).filter(area=>availableAreas.includes(area)),availableAreas,requireRestore:node.requireRestore===true,activated:[]};
    state.walk={running:false,hits:[],selected:[],allowed:[],view:0};
    state.feedback=node.areaSelection?'FINDR fixture: area '+(state.testFlow.areas.join(', ') || 'none')+' selected.':'Choose a fictional input for this walk test.';
  } else if(node.outputFunctions) {
    state.testFlow={nodeId:node.id,kind:'output-functions',phase:'select',functionCode:'',functionLabel:''};
    state.outputStates={};
  } else {
    const outputs=(node.outputs || Object.keys(state.outputStates || {})).map(output=>typeof output==='string'?output:output.label);
    state.testFlow={nodeId:node.id,kind:'simultaneous',phase:'running'};
    state.outputStates=Object.fromEntries(outputs.map(output=>[output,true]));
    state.feedback='The fictional siren and strobe indicators are on together.';
  }
  return true;
}

/** Runs before generic back/logout and generic walk/output key handling. */
export function handleExtendedTestKey(model,state,node,key,frame) {
  const flow=flowFor(state,node);if(!flow)return null;
  if(flow.kind==='simultaneous') {
    if(key===(node.finishKey || 'back') || key==='back')return stop(state,flow);
    state.feedback='Both fictional outputs stay on together. Press '+labelForKey(model,node.finishKey || 'back')+' to finish.';
    return handled();
  }
  if(flow.kind==='output-functions') {
    if(key===(node.finishKey || 'back') || key==='back')return stop(state,flow);
    if(flow.phase==='running'){state.feedback='Press '+labelForKey(model,node.finishKey || 'back')+' to stop this fictional output-function test.';return handled();}
    if(/^\d$/.test(key)){state.digits=(state.digits+key).slice(0,8);return handled();}
    if(key==='enter') {
      const code=state.digits || '0000',choice=node.outputFunctions.find(item=>String(item.code)===code);
      if(!choice){state.feedback='That complete output-function code is not in this manual-backed fixture. NO cancels the test.';return handled();}
      flow.functionCode=String(choice.code);flow.functionLabel=choice.label;flow.phase='running';
      state.outputStates={[flow.functionCode+' '+choice.label]:Number(choice.code)!==0};state.digits='';
      state.feedback=Number(choice.code)===0?'Not Used: no fictional output is activated.':'Testing fictional output function '+flow.functionCode+' '+choice.label+'.';
      return handled();
    }
    state.feedback='Enter a documented output-function code, then YES. This is a function code, not a fitted output number.';
    return handled();
  }
  if(flow.phase==='areas') {
    const area=node.keyChoiceCodes?.[key];
    if(area){flow.areas=flow.areas.includes(String(area))?flow.areas.filter(item=>item!==String(area)):[...flow.areas,String(area)];return handled();}
    if(key==='back'){flow.phase='individual';frame.cursor=0;state.digits='';state.feedback=node.individualStartOnEnter?'Choose one input with the arrows; YES starts its test.':'Enter an input number and press YES for each selection, then NO to start.';return handled();}
    if(key==='enter') {
      if(!flow.areas.length || node.singleAreaOnly && flow.areas.length!==1){state.feedback=node.singleAreaOnly?'FINDR validation: select exactly one area, as required by this user guide.':'Select at least one area before starting the walk test.';return handled();}
      return startWalk(state,flow,zonesInAreas(model,state,node,flow.areas),frame);
    }
    state.feedback='Use the area letters, YES to start, or NO for individual inputs.';return handled();
  }
  if(flow.phase==='individual') {
    const records=zoneRecords(model,state,node),nav=model.config?.navigation || {},next=node.recordNextKey || nav.recordNextKey || 'right',previous=node.recordPreviousKey || nav.recordPreviousKey || 'left';
    if(key===next || key===previous){frame.cursor=wrap(frame.cursor+(key===next?1:-1),records.length);state.digits='';return handled();}
    if(/^\d$/.test(key)) {
      if(node.individualStartOnEnter && node.individualNumericSelection!==true){state.feedback='This user-guide route selects one input with the separate arrow keys.';return handled();}
      state.digits=(state.digits+key).slice(0,8);return handled();
    }
    if(key==='enter') {
      const selected=state.digits?records.find(record=>digitsEqual(record.id,state.digits)):records[wrap(frame.cursor,records.length)];
      if(!selected){state.feedback='That input is not fitted in this fictional panel. The confirmed selections are unchanged.';return handled();}
      frame.cursor=records.findIndex(record=>record.id===selected.id);frame.context ||= {};frame.context.zone=selected.id;state.digits='';
      if(!state.walk.selected.includes(selected.id))state.walk.selected.push(selected.id);
      if(node.individualStartOnEnter)return startWalk(state,flow,[selected.id],frame);
      state.feedback='Input '+selected.id+' selected. Choose another input, or press NO to start the confirmed selections.';
      return handled();
    }
    if(key==='back')return state.walk.selected.length?startWalk(state,flow,state.walk.selected,frame):stop(state,flow);
    state.feedback=node.individualStartOnEnter?'Choose an input with the arrows; YES starts it.':'Choose an input and press YES; NO starts the confirmed selections.';
    return handled();
  }
  if(key==='back' || key===node.finishKey)return stop(state,flow);
  if(flow.phase==='running') {
    const remaining=state.walk.allowed.filter(id=>!state.walk.hits.includes(id)),nav=model.config?.navigation || {},next=node.recordNextKey || nav.recordNextKey || 'right',previous=node.recordPreviousKey || nav.recordPreviousKey || 'left';
    if(key===next || key===previous){frame.cursor=wrap(frame.cursor+(key===next?1:-1),remaining.length);frame.context ||= {};frame.context.zone=remaining[frame.cursor];return handled();}
  }
  state.feedback='Press '+labelForKey(model,node.finishKey || 'back')+' to leave this walk test.';return handled();
}

/** Returns true when the custom walk owns counting, including completed tests. */
export function updateExtendedWalk(state,address,before,after) {
  const flow=state.testFlow;
  if(flow?.kind!=='walk' || state.trail?.length && state.trail.at(-1).id!==flow.nodeId)return false;
  if(flow.phase!=='running' || !state.walk.running)return true;
  if(!state.walk.allowed.includes(address) || state.walk.hits.includes(address) || before===after)return true;
  if(after==='active') {
    if(!flow.requireRestore)state.walk.hits.push(address);
    else if(!flow.activated.includes(address))flow.activated.push(address);
  } else {
    if(after==='secure' && before==='active' && flow.activated.includes(address))state.walk.hits.push(address);
    flow.activated=flow.activated.filter(id=>id!==address);
  }
  if(state.walk.allowed.length && state.walk.allowed.every(id=>state.walk.hits.includes(id))){flow.phase='complete';state.walk.running=false;}
  return true;
}

export function extendedTestScreen(model,state,node,frame) {
  const flow=flowFor(state,node);if(!flow)return null;
  if(flow.kind==='simultaneous')return {lines:[flow.phase==='stopped'?'Siren test stopped':'Testing Siren...',flow.phase==='stopped'?'Siren + Strobe OFF':'Siren + Strobe ON'],note:'Fictional indicators only. '+labelForKey(model,node.finishKey || 'back')+' finishes the simultaneous test.'};
  if(flow.kind==='output-functions')return {lines:['OP Test  ['+(state.digits || flow.functionCode || '0000')+']',flow.phase==='running'?flow.functionLabel+' '+(Object.values(state.outputStates).some(Boolean)?'ON':'OFF'):'YES to test function'],note:'Enter the documented output-function code. This local test does not select or drive a real output.'};
  if(flow.phase==='areas')return {lines:['Walk Test Areas','['+flow.availableAreas.map(area=>flow.areas.includes(area)?area:'-').join('')+']'],note:(node.singleAreaOnly?'Select one area. ':'Select the required areas. ')+'YES starts; NO chooses individual inputs. Initial area selection belongs to the FINDR fixture.'};
  if(flow.phase==='individual') {
    const records=zoneRecords(model,state,node),selected=records[wrap(frame.cursor,records.length)],id=state.digits || selected?.id || '--';
    return {lines:['Walk Test Input','['+id+']'+(state.walk.selected.includes(selected?.id)&&!state.digits?' selected':'')],note:node.individualStartOnEnter?'Use the separate arrows; YES starts this one input.':'Input number or arrows, YES to select each, then NO to start. '+state.walk.selected.length+' confirmed.'};
  }
  if(flow.phase==='complete')return {lines:['Walk Test Completed',state.walk.hits.length+' inputs tested'],note:'Each selected fictional input was activated'+(flow.requireRestore?' and restored':'')+'. NO exits.'};
  const remaining=state.walk.allowed.filter(id=>!state.walk.hits.includes(id)),id=remaining[wrap(frame.cursor,remaining.length)];
  return {lines:[flow.phase==='stopped'?'Walk Test Stopped':'Walk Test Inputs',id?'Input '+id:state.walk.hits.length+' inputs tested'],note:flow.requireRestore?'Activate and restore each displayed fictional input. The rolling display and wireless wake-up delay are condensed.':'Activate each displayed fictional input. NO exits.'};
}
