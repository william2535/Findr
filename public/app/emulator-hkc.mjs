// HKC Quantum70, V4.0+ installation manual 310118_1.
// The separate authorised inhibit prompt uses the official 160811_1 user guide.
// No SW1070/10270 assumptions, credentials, hardware transport or timers.
const copy = value => JSON.parse(JSON.stringify(value));
const numbered = (count, label, width=1) => Array.from({length:count}, (_,i) => ({id:String(i+1).padStart(width,'0'),label:`${label} ${i+1}`}));
const wrap = (value,size) => size ? (value % size + size) % size : 0;
const local = state => { state.runtimeState ||= {}; return state.runtimeState.hkc ||= {}; };
const currentRecord = (state, frame, scope) => (state.records[scope] || []).find(record => record.id===frame.context?.[scope]);
const alarmEvent = event => event.alarm===true || /alarm|tamper|panic|fire/i.test(event.label || '');

function allowedFlags(node,state,frame) {
  const type=state.zoneTypes[frame.context?.zone];
  return node.choices.map((choice,index)=>({choice,index})).filter(({choice})=>!choice.allowedTypes || choice.allowedTypes.includes(type));
}
function seedFlags(node,state,frame) {
  if(!state.editor)return;
  const selected=allowedFlags(node,state,frame);
  if(!selected.some(item=>item.index===state.editor.cursor))state.editor.cursor=selected[0]?.index ?? 0;
  const inhibit=node.choices.find(choice=>choice.bind==='zoneOmitEnabled'),zone=frame.context?.zone;
  if(inhibit&&zone)state.editor.draft[inhibit.id]=state.zoneOmitEnabled[zone]===true;
}
function sibling({model,state,node,frame,helpers},direction) {
  if(state.trail.length<2)return false;
  const parentFrame=state.trail.at(-2),parent=model.nodes[parentFrame.id];
  const ids=parent?.children || model.rootById[state.rootId]?.nodeIds || [];
  const index=ids.indexOf(frame.id);
  if(index<0||!ids.length)return false;
  const nextIndex=wrap(index+direction,ids.length),nextId=ids[nextIndex];
  helpers.back();
  state.trail.at(-1).cursor=nextIndex;
  helpers.push(nextId);
  return true;
}
function diagnosticInputs(state,node) { return (state.records.zone || []).filter(record=>state.zoneStates[record.id]===(node.interaction==='open-tampers'?'tamper':'active')); }
function userEvents(state) {
  const lastSet=state.events.findIndex(event=>/^(?:full (?:set|arm)|quick arm|part (?:set|arm))/i.test(event.label));
  return (lastSet<0?state.events:state.events.slice(0,lastSet)).filter(event=>!event.logs || !event.logs.length || event.logs.includes('user'));
}
function canInhibit(model,state,address) {
  const option=model.nodes['h-e3.3']?.choices.find(choice=>choice.bind==='zoneOmitEnabled');
  return state.zoneOmitEnabled[address]===true&&Boolean(option?.allowedTypes?.includes(state.zoneTypes[address]));
}
function pendingZone(model,state,flow) {
  if(!/^\d{1,3}$/.test(flow.buffer || ''))return {error:'Enter the zone number after *.'};
  const zone=model.profile.zones.find(item=>Number(item.address)===Number(flow.buffer));
  if(!zone)return {error:'That zone is not fitted in this fictional Quantum70. QUIT cancels this draft.'};
  if(!canInhibit(model,state,zone.address))return {error:'Zone '+zone.address+' is not configured for user inhibition with its current type. Nothing has been inhibited.'};
  return {zone};
}
function commitPending(model,state,flow) {
  if(!flow.buffer)return true;
  const result=pendingZone(model,state,flow);
  if(result.error){state.feedback=result.error;return false;}
  if(!flow.selected.includes(result.zone.address))flow.selected.push(result.zone.address);
  flow.buffer='';state.digits='';return true;
}
function doArm({model,state,node,helpers}) {
  const before=Object.keys(state.omittedZones).filter(id=>state.omittedZones[id]);
  if(['arm','part-arm'].includes(node.action)&&state.armed){state.feedback='The fictional panel is already set. Unset it before beginning another setting period.';return;}
  const automatic=[];
  if(node.action==='part-arm') {
    const label=/\bB\b/.test(node.setMode || '')?'Exclude Part Set B':'Exclude Part Set A';
    const flag=model.nodes['h-e3.3']?.choices.find(choice=>choice.label===label);
    if(flag)for(const zone of model.profile.zones) {
      const values=state.values['h-e3.3|zone|'+zone.address+'|'];
      if(values?.[flag.id]&&flag.allowedTypes?.includes(state.zoneTypes[zone.address])&&!state.omittedZones[zone.address]){state.omittedZones[zone.address]=true;automatic.push(zone.address);}
    }
  }
  helpers.executeAction(node);
  if(['unset','disarm'].includes(node.action)) {
    for(const zone of before)if(!state.omittedZones[zone]) {
      helpers.recordHistory('omission',{zone,value:false});
      helpers.addEvent('Zone restored',state.zoneNames[zone],zone);
    }
    state.feedback='Fictional panel unset; inhibition for the setting period has been removed.';
  } else if(state.armed) {
    if(node.setMode)state.armingMode=node.setMode;
    state.feedback=state.armingMode+' in the fictional panel. Exit timing is condensed; no alarm is connected.';
    if(node.leavesEngineer){
      state.rootId='h-user';state.trail=[{id:'@h-user',cursor:0,context:{},namespace:{}}];
      state.editor=null;state.digits='';state.confirm=null;
      state.feedback+=' The engineer menu has been left.';
    }
  } else {
    for(const id of automatic)state.omittedZones[id]=false;
  }
}

const runtime = {
  onApplyEdit(context) {return runtime.onKey({...context,key:'enter'});},
  onActivate({model,state,node,frame,helpers}) {
    const memo=local(state);
    if(['yes-no','yes-cycle'].includes(node.interaction))state.editor=null;
    if(node.interaction==='yes-no-flags')seedFlags(node,state,frame);
    if(node.interaction==='code-verify')delete memo.code;
    if(node.interaction==='arming-inhibit') {
      memo.inhibit={nodeId:node.id,phase:state.armed?'set':'prompt',pending:false,buffer:'',selected:[],force:false};
      state.draftOmissions=null;
    }
    if(['open-zones','open-tampers'].includes(node.interaction))frame.context.zone=diagnosticInputs(state,node)[0]?.id || null;
  },
  onKey(context) {
    const {model,state,key,node,frame,helpers}=context,memo=local(state);
    if(node.interaction==='yes-no') {
      if(key==='enter'||key==='change') {
        helpers.storeValue(node,key==='enter');state.editor=null;state.digits='';return true;
      }
      if(key==='next'||key==='previous')return sibling(context,key==='next'?1:-1);
    }
    if(node.interaction==='yes-cycle') {
      if(key==='enter') {
        const old=helpers.valueFor(node),index=node.choices.findIndex(choice=>JSON.stringify(choice.value)===JSON.stringify(old));
        helpers.storeValue(node,node.choices[wrap(index+1,node.choices.length)].value);state.editor=null;return true;
      }
      if(key==='next'||key==='previous')return sibling(context,key==='next'?1:-1);
      if(key==='change'){state.feedback='This field follows the dedicated source page: YES cycles the documented choices.';return true;}
    }
    if(node.interaction==='yes-no-flags') {
      if(!state.editor)helpers.startEditor(node);
      seedFlags(node,state,frame);
      const flags=allowedFlags(node,state,frame),editor=state.editor;
      if(key==='back'){helpers.back();return true;}
      if(!flags.length){state.feedback='No configurable attributes are documented for this selected type.';return true;}
      if(key==='next'||key==='previous') {
        const cursor=flags.findIndex(item=>item.index===editor.cursor);
        editor.cursor=flags[wrap(cursor+(key==='next'?1:-1),flags.length)].index;return true;
      }
      if(key==='enter'||key==='change') {
        const choice=node.choices[editor.cursor];
        editor.draft[choice.id]=key==='enter';editor.dirty=false;
        helpers.storeValue(node,editor.draft);return true;
      }
      if(/^\d$/.test(key)){state.feedback='These attributes have no documented numeric value codes. Use * / # and YES / NO.';return true;}
    }
    if(node.interaction==='code-verify' && state.editor) {
      if(key==='back'){delete memo.code;return false;}
      if(key==='enter') {
        const draft=String(state.editor.draft || '');
        if(!/^[1-9]{4,6}$/.test(draft)){state.feedback='Use a fictional four- to six-digit code without 0.';return true;}
        if(node.noFinalNine&&draft.endsWith('9')){state.feedback='User codes cannot end in 9 in this manual.';return true;}
        if(node.repeatRequired&&!memo.code) {
          memo.code={nodeId:node.id,record:frame.context?.[node.scope] || '',first:draft};
          state.editor.draft='';state.editor.dirty=true;state.feedback='Verify the fictional code by entering it again.';return true;
        }
        if(node.repeatRequired&&memo.code?.first!==draft) {
          delete memo.code;state.editor.draft='';state.editor.dirty=true;
          state.feedback='The two entries did not match. Nothing was saved; enter the new fictional code again.';return true;
        }
        delete memo.code;helpers.storeValue(node,draft);state.editor=null;state.digits='';return true;
      }
    }
    if(node.interaction==='no-clears'&&state.editor&&key==='change') {
      state.editor.draft='';state.editor.dirty=true;state.feedback='Fictional field cleared. YES accepts; QUIT cancels the draft.';return true;
    }
    if(node.interaction==='alphanumeric'&&state.editor&&key==='enter'&&!/^[a-zA-Z0-9]{6,32}$/.test(String(state.editor.draft))) {
      state.feedback='Use six to thirty-two alphanumeric characters for this fictional field.';return true;
    }
    if(node.interaction==='alarm-log'&&(key==='7'||key==='9')) {
      const direction=key==='9'?1:-1;
      for(let index=state.eventIndex+direction;index>=0&&index<state.events.length;index+=direction) {
        if(alarmEvent(state.events[index])){state.eventIndex=index;state.details=false;state.digits='';return true;}
      }
      state.feedback='No further fictional alarm event in that direction.';return true;
    }
    if(node.interaction==='user-log') {
      if(key==='next'||key==='previous'){state.eventIndex=Math.max(0,Math.min(userEvents(state).length-1,state.eventIndex+(key==='next'?1:-1)));return true;}
      if(key!=='back'){state.feedback='User Log contains only events since the last setting period; * / # scrolls.';return true;}
    }
    if(['open-zones','open-tampers'].includes(node.interaction)) {
      const list=diagnosticInputs(state,node),index=list.findIndex(item=>item.id===frame.context.zone);
      if(key==='next'||key==='previous') {
        frame.context.zone=list[wrap(index+(key==='next'?1:-1),list.length)]?.id || null;return true;
      }
      if(/^\d$/.test(key)){state.feedback='Use * / # for the open-input list; numeric selection is not verified here.';return true;}
    }
    if(node.interaction==='rf-sounder-test') {
      if(key==='enter') {
        const on=!Object.values(state.outputStates).some(Boolean);
        for(const name of node.outputs)state.outputStates[typeof name==='string'?name:name.label]=on;
        helpers.recordHistory('output',{nodeId:node.id,value:on,record:frame.context?.[node.scope]});
        state.feedback='Selected fictional '+(node.scope==='sabb'?'siren and strobe':'siren')+(on?' on.':' off.')+' YES toggles; QUIT stops and leaves.';
        return true;
      }
      if(key!=='back'){state.feedback='YES toggles the selected fictional device; QUIT stops and leaves.';return true;}
    }
    if(node.interaction==='authorised-arm-action'&&key==='enter') {doArm(context);return true;}
    if(node.interaction==='immediate-action'&&key==='enter'){helpers.executeAction(node);return true;}
    if(node.interaction==='engineer-access'&&key==='enter') {
      memo.engineerAccess=true;state.feedback='Engineer access enabled in this already-authorised fictional session. No real login or siren activation.';return true;
    }
    if(node.interaction==='arming-inhibit') {
      const flow=memo.inhibit?.nodeId===node.id?memo.inhibit:(memo.inhibit={nodeId:node.id,phase:state.armed?'set':'prompt',pending:false,buffer:'',selected:[],force:false});
      if(key==='back'){helpers.back();return true;}
      if(state.armed){state.feedback='This fictional setting period is active. Choose the User context and Unset? to restore inhibited zones.';return true;}
      if(key==='previous') {
        if(flow.pending&&!flow.buffer&&!flow.selected.length) {
          const forceNode=model.nodes['h-e8.1.5'];
          if(!forceNode||helpers.valueFor(forceNode)!==true){state.feedback='Forced Arm is not enabled in this fictional configuration. Use * plus an eligible zone number, or QUIT.';return true;}
          flow.force=true;flow.pending=false;state.feedback='Forced-arm draft selected. YES checks all open zones for inhibit permission.';return true;
        }
        if(!commitPending(model,state,flow))return true;
        flow.pending=true;flow.phase='select';flow.force=false;state.feedback='Enter the zone number to inhibit for this setting period.';return true;
      }
      if(/^\d$/.test(key)) {
        if(!flow.pending){state.feedback='Press * before entering a zone number on this authorised arming prompt.';return true;}
        flow.buffer=(flow.buffer+key).slice(0,3);state.digits=flow.buffer;return true;
      }
      if(key==='enter') {
        if(flow.pending&&!flow.buffer){state.feedback='Complete the zone number after *, or QUIT to discard the draft.';return true;}
        if(!commitPending(model,state,flow))return true;
        const selected=[...flow.selected],open=Object.entries(state.zoneStates).filter(([,status])=>status!=='secure').map(([id])=>id);
        if(flow.force)for(const id of open)if(!selected.includes(id))selected.push(id);
        const forbidden=selected.find(id=>!canInhibit(model,state,id));
        if(forbidden){state.feedback='Cannot inhibit zone '+forbidden+': its Inhibit option is disabled. Nothing has been set.';return true;}
        const blocked=open.filter(id=>!selected.includes(id)&&!state.omittedZones[id]);
        if(blocked.length){state.feedback='Cannot set: open zone '+blocked.join(', ')+' has not been inhibited. Continue the draft or QUIT.';return true;}
        for(const zone of selected) {
          if(!state.omittedZones[zone]){state.omittedZones[zone]=true;helpers.recordHistory('omission',{zone,value:true});helpers.addEvent('Zone inhibited',state.zoneNames[zone],zone);}
        }
        helpers.executeAction({action:'arm'});flow.phase='set';flow.selected=selected;flow.pending=false;state.digits='';
        state.feedback='Fictional Full Set'+(selected.length?' with '+selected.join(', ')+' inhibited':'')+'. Inhibition ends when this panel is unset.';return true;
      }
      state.feedback='After authorisation: * zone [* zone …] YES. # and NO have no verified function in this inhibit sequence.';return true;
    }
    return false;
  },
  screen({model,state,node,frame,view}) {
    const memo=state.runtimeState?.hkc || {};
    if(node.interaction==='yes-no') {
      const key=[node.valueKey||node.behaviorId||node.id,node.scope||'system',frame.context?.[node.scope]||'',node.valueKey?'':frame.namespace?.[node.scope]||''].join('|');
      const value=Object.hasOwn(state.values,key)?state.values[key]:node.defaultValue;
      return {lines:[node.label,value===true?'YES':'NO'],note:'YES enables; NO disables the displayed fictional option. * / # moves to adjacent fields; QUIT returns.'};
    }
    if(node.interaction==='yes-cycle')return {note:'YES cycles the documented value in this fictional record. '+(node.evidenceNote || '')};
    if(node.interaction==='yes-no-flags'&&state.editor) {
      const allowed=allowedFlags(node,state,frame),choice=allowed.find(item=>item.index===state.editor.cursor)?.choice;
      return {lines:[choice?.label || 'No applicable options',choice?(state.editor.draft[choice.id]?'YES':'NO'):'For this zone type'],note:'* / # selects an applicable attribute. YES enables; NO disables. Changes are stored locally; QUIT returns.'};
    }
    if(node.interaction==='code-verify'&&state.editor)return {lines:[memo.code?'Verify fictional code':'New fictional code','•'.repeat(String(state.editor.draft||'').length)],note:'No real authentication or factory code. Four to six digits without 0'+(node.noFinalNine?'; user code must not end in 9.':'.')};
    if(node.interaction==='user-log') {
      const event=userEvents(state)[state.eventIndex];
      return {lines:event?[event.time+' '+event.label,event.zone+' '+event.details]:['No User Log events','Since last setting'],note:'Fictional events since the last setting period. * / # scrolls; QUIT returns.'};
    }
    if(['open-zones','open-tampers'].includes(node.interaction)) {
      const list=diagnosticInputs(state,node),record=list.find(item=>item.id===frame.context.zone)||list[0];
      return {lines:record?['Zone '+record.id+' '+state.zoneNames[record.id],model.profile.statusLabels[state.zoneStates[record.id]]]:[node.interaction==='open-tampers'?'No Open Tampers':'No Open Zones','FINDR fixture'],note:'Only currently '+(node.interaction==='open-tampers'?'tampered':'open')+' fictional inputs are shown. Exact LCD wording is illustrative; * / # scrolls.'};
    }
    if(node.interaction==='rf-sounder-test')return {lines:[currentRecord(state,frame,node.scope)?.label || node.label,Object.values(state.outputStates).some(Boolean)?'TEST ON':'TEST OFF'],note:'YES toggles the selected fictional '+(node.scope==='sabb'?'siren and strobe':'siren')+'. QUIT stops and returns. No physical output is connected.'};
    if(node.interaction==='authorised-arm-action'||node.interaction==='immediate-action')return {lines:[node.label,'YES · local simulation'],note:'FINDR command screen. '+(node.evidenceNote || 'This changes only the fictional panel state; access is already authorised.')};
    if(node.interaction==='engineer-access')return {lines:['Eng. Access',memo.engineerAccess?'YES':'YES to enable'],note:'Manager System Config: YES enables access in the fictional session. The real engineer-entry siren is not simulated.'};
    if(node.interaction==='arming-inhibit') {
      const flow=memo.inhibit || {},list=flow.selected || [];
      if(state.armed){
        const inhibited=Object.entries(state.omittedZones).filter(([,omitted])=>omitted).map(([id])=>id);
        return {heading:'Authorised arming / inhibit',lines:['Full Set · FINDR',inhibited.length?inhibited.join(', ')+' inhibited':'All zones included'],note:'Choose the User context, Unset?, then YES in its local command screen to end this setting period and restore inhibited zones. No live panel is connected.'};
      }
      const zone=flow.buffer?model.profile.zones.find(item=>Number(item.address)===Number(flow.buffer)):null;
      return {heading:'Authorised arming / inhibit',lines:[flow.force?'Forced Arm draft':flow.pending?'Inhibit Zone '+(flow.buffer||'___'):'Authorised arming',zone?zone.name:list.length?list.join(', ')+' selected':'* zone, then YES'],note:'Official earlier user guide p8: * zone [* zone …] YES starts setting. QUIT discards the unconfirmed draft. The FINDR context selector is not a panel menu.'};
    }
    return null;
  },
  stop({state,node}) {
    const memo=state.runtimeState?.hkc;if(!memo)return;
    if(!node||memo.inhibit?.nodeId===node.id)delete memo.inhibit;
    if(!node||memo.code?.nodeId===node.id)delete memo.code;
  },
  onZone({model,state}) {
    const frame=state.trail.at(-1),node=model.nodes[frame?.id];
    if(node&&['open-zones','open-tampers'].includes(node.interaction)) {
      const list=diagnosticInputs(state,node);
      if(!list.some(record=>record.id===frame.context?.zone))frame.context.zone=list[0]?.id || null;
    }
  },
  restore({model,state,saved}) {
    state.runtimeState={};
    if(!state.armed)for(const id of Object.keys(state.omittedZones))state.omittedZones[id]=false;
    else if(/^(?:Part (?:Arm|Set) [AB]|Full (?:Arm|Set)|Quick Arm)$/.test(saved.armingMode || ''))state.armingMode=saved.armingMode;
    for(const bank of ['values','committedValues'])for(const [key,value] of Object.entries(state[bank])) {
      const node=model.nodes[key.split('|')[0]];
      if(node?.interaction==='code-verify'&&(!/^[1-9]{4,6}$/.test(String(value))||node.noFinalNine&&String(value).endsWith('9')))delete state[bank][key];
      if(node?.interaction==='alphanumeric'&&!/^[a-zA-Z0-9]{6,32}$/.test(String(value)))delete state[bank][key];
    }
  },
};

export function getHkcConfig(map,profile) {
  const children=id=>map.nodes.filter(node=>node.parentId===id).sort((a,b)=>a.order-b.order);
  const rawById=new Map(map.nodes.map(node=>[node.id,node])),overrides={};
  for(const node of map.nodes) {
    const adapter=copy(node.simulation || {}),target=rawById.get(adapter.aliasTarget);
    const values=children(node.id).filter(child=>child.kind==='selection');
    if(['choice','flags'].includes(adapter.mode)&&!adapter.choices)adapter.choices=values.map(value=>({id:value.id,label:value.label,code:value.code,value:adapter.mode==='flags'?value.id:value.label}));
    if(target)Object.assign(adapter,{...copy(target.simulation || {}),...adapter});
    if(Object.keys(adapter).length)overrides[node.id]=adapter;
  }
  // Alias choices need their real target's reviewed values and hooks too.
  for(const node of map.nodes)if(node.simulation?.aliasTarget) {
    const target=overrides[node.simulation.aliasTarget];
    if(target) {
      overrides[node.id]={...copy(target),...overrides[node.id]};
      if(target.choices)overrides[node.id].choices=copy(target.choices);
      else delete overrides[node.id].choices;
    }
  }
  for(const gap of map.gaps || [])for(const id of gap.affectedNodeIds || [])if(overrides[id])overrides[id].evidenceNote=[overrides[id].evidenceNote,gap.reason].filter(Boolean).join(' ');
  const roots=[
    {id:'h-engineer',label:'Quantum70 V4 · Engineer',role:'Engineer',edition:'310118_1 · UK',commitOnExit:false,nodeIds:Array.from({length:9},(_,i)=>'h-e'+(i+1))},
    {id:'h-user',label:'Quantum70 · User',role:'User',edition:'User160811_1; order corroborated by V4 p57',commitOnExit:false,nodeIds:children('h-user').map(node=>node.id)},
    {id:'h-manager',label:'Quantum70 · Manager',role:'Manager',edition:'User160811_1; order corroborated by V4 p57',commitOnExit:false,nodeIds:children('h-manager').map(node=>node.id)},
    {id:'h-arming',label:'Arming / inhibit · authorised',role:'User',edition:'Official User160811_1 p8; V4 prompt timing unverified',commitOnExit:false,startNodeId:'h-a-inhibit',nodeIds:['h-a-inhibit']},
  ];
  const records={
    user:numbered(32,'Fictional user',2),point:numbered(10,'Fictional Point ID',2),
    block:[{id:'0',label:'B0 · common'},{id:'1',label:'B1'},{id:'2',label:'B2'}],
    keyfob:numbered(2,'Fictional RF keyfob',2),echo:numbered(2,'Fictional RF Echo'),sabb:numbered(2,'Fictional RF SABB'),wand:[],rfKeypad:[{id:'1',label:'RK1 · fictional RF keypad'}],
    eventTimer:numbered(7,'T'),technicalType:numbered(8,'Technical type'),fireExitType:numbered(12,'Fire Exit type'),
    arcPhone:numbered(4,'Fictional ARC phone'),smsPhone:numbered(7,'Fictional SMS phone'),remoteUser:numbered(7,'Fictional remote user'),channel:numbered(16,'Fast Format channel'),
    reportType:[{id:'fire',label:'Fire · documented example'},{id:'alarm',label:'Alarm · documented example'},{id:'panic',label:'Panic · documented example'},{id:'technical',label:'Technical · documented example'}],
  };
  const fixtureNotice='All devices, users, events, stored values and output indicators are fictional FINDR data. No RF, siren, alarm, cloud, dialler, ARC or downloader is connected.';
  return {profileId:map.profileId,roots,defaultRootId:'h-engineer',demoModel:'HKC Quantum70 V4.0+ · UK',records,overrides,runtime,eventCapacity:999,
    navigation:{menuNextKey:'next',menuPreviousKey:'previous',recordNextKey:'next',recordPreviousKey:'previous',choiceNextKey:'next',choicePreviousKey:'previous',directNumericMenus:true,exitEditorToParent:true},
    notes:[fixtureNotice,'Installer manual310118_1 defines this V4 Quantum70 tree. The separate official2011 user guide supplies the authorised inhibit procedure; exact V4 prompt timing remains a visible gap.',
      'Local engineer quick digits descend immediately: 3 then1 opens Zone Names. User/Manager lists are unnumbered. Arming Options1/10/11 is scroll-only.',
      'Output Menu7 is Not Applicable. RF Echo/SABB tests use documented YES on/off; automatic Bell Test timing is a reference.',
      'Text helpers, numeric-range limits, conditional hardware procedures and source conflicts are labelled at their screens. No SecureWave1070/10270 menus are inferred.'],fixtureNotice};
}
