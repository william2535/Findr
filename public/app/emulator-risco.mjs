// Source-pinned LightSYS2 behavior. Every operation is local fictional state.
// The RP432KP's physical Full/Part, arrows, Menu and OK keys stay distinct.
const copy = value => JSON.parse(JSON.stringify(value));
const numbered = (count, label, width = 2) => Array.from({length:count}, (_,i) => ({id:String(i+1).padStart(width,'0'),label:`${label} ${i+1}`}));
const wrap = (i,n) => n ? (i % n + n) % n : 0;
const omitIds = new Set(['r-u-omit-once','r-u-omit-permanent']);
const fixtureNotice = 'Every name, setting, event, identifier, voltage, resistance and detector action is fictional FINDR practice data. This emulator has no connection to an alarm, RISCO Cloud, radio, telephone network or monitoring station.';

function omissionMemory(state) {
  const r = state.runtimeState ||= {};
  r.riscoPermanent ||= Object.fromEntries(Object.keys(state.omittedZones).map(id=>[id,false]));
  r.riscoOneTime ||= {...state.omittedZones};
  r.riscoRecall ||= {...r.riscoOneTime};
  return r;
}
function mergeOmissions(state) {
  const r = omissionMemory(state);
  for (const id of Object.keys(state.omittedZones)) state.omittedZones[id] = r.riscoOneTime[id]===true || r.riscoPermanent[id]===true;
}
function alarmEvents(state,node) {
  return node.filter === 'alarm' ? state.events.filter(e=>e.logs?.includes('alarm')||/alarm|intruder|tamper|fire/i.test(e.label)).slice(0,5) : state.events;
}
function validateClockDraft(state) {
  if(!['r-u-time','r-s-time'].includes(state.editor?.nodeId))return false;
  const text=String(state.editor.draft),m=/^(\d{2}):(\d{2}) (\d{2})\/(\d{2})\/(\d{2})$/.exec(text);
  if(m){
    const [,hh,mm,dd,mo,yy]=m.map((v,i)=>i?Number(v):v),year=2000+yy,date=new Date(Date.UTC(year,mo-1,dd));
    if(hh<24&&mm<60&&date.getUTCFullYear()===year&&date.getUTCMonth()===mo-1&&date.getUTCDate()===dd)return false;
  }
  state.feedback='Use a valid 24-hour time and calendar date: HH:MM DD/MM/YY.';
  return true;
}

export function getRiscoConfig(map, profile) {
  const overrides = {};
  for (const node of map.nodes) {
    if (node.simulation) overrides[node.id] = copy(node.simulation);
    if (node.id.startsWith('r-u') || node.id.startsWith('r-s')) {
      overrides[node.id] ||= {};
      overrides[node.id].numericSelection = false;
      overrides[node.id].directNumericMenus = false;
    }
  }
  const put = (id,value) => {overrides[id]={...overrides[id],...value};};
  for (const id of ['r-u-alarm-memory','r-s-alarm']) put(id,{filter:'alarm',detailsKey:'none'});
  for (const id of ['r-u-log','r-s-log']) put(id,{detailsKey:'none',logNextKey:'next',logPreviousKey:'previous'});
  put('r-s-resistance',{resistanceAlways:true,showResistance:true,detailsKey:'enter'});
  for (const id of omitIds) put(id,{toggleKeys:['part-set'],numericSelection:false,commitKey:'enter'});
  // These two command locations are verified; their whole-list confirmation
  // sequence is not specified in the cited table, so do not fabricate it.
  for (const id of ['r-u-omit-reset','r-u-omit-recall']) put(id,{mode:'info',evidenceNote:'The manual documents this whole-list command, but not its confirmation screens. Per-zone omit and restore are fully interactive; this command remains reference-only.'});
  // The service and UK user contexts refer to the same fictional clock record.
  put('r-s-time',{...overrides['r-u-time'],valueKey:'risco-clock',numericSelection:false});
  put('r-u-time',{valueKey:'risco-clock'});
  for (const [service,user] of [['r-s-fm-destination','r-u-fm-destination'],['r-s-fm-label','r-u-fm-label']]) put(service,{...overrides[user],numericSelection:false});
  put('r-s-fm-define',{mode:'menu',selector:'followMe',scope:'followMe',numericSelection:false});
  for (const node of map.nodes) {
    const adapter = overrides[node.id];
    if (!adapter) continue;
    if (adapter.mode === 'number') Object.assign(adapter,{choiceNextKey:'arm',choicePreviousKey:'part-set'});
    if (adapter.mode === 'flags') Object.assign(adapter,{choiceNextKey:'next',choicePreviousKey:'previous',flagToggleKeys:['arm','part-set']});
  }

  const runtime = {
    onActivate({state,node}) {
      if (omitIds.has(node.id)) {
        const r=omissionMemory(state);
        state.draftOmissions = copy(node.id==='r-u-omit-permanent'?r.riscoPermanent:r.riscoOneTime);
      }
      if(node.id==='r-s-resistance') state.runtimeState.riscoVoltage = false;
      if(['r-u-sounder-test','r-u-strobe-test','r-s-siren','r-s-strobe'].includes(node.id)) {
        for(const label of Object.keys(state.outputStates))state.outputStates[label]=true;
        state.feedback='The selected fictional test is active. Menu/Back stops it.';
      }
    },
    onKey({model,state,key,node,base,frame,helpers}) {
      if(key==='enter'&&validateClockDraft(state))return true;
      if(state.editor?.kind==='flags' && node.digitSelectOnly && /^\d$/.test(key)) {
        state.digits=(state.digits+key).slice(0,2);
        const candidates=node.choices.filter(choice=>String(choice.code).startsWith(state.digits));
        const match=candidates.find(choice=>String(choice.code)===state.digits);
        if(match&&candidates.length===1){state.editor.cursor=node.choices.indexOf(match);state.digits='';}
        else if(!candidates.length){state.digits='';state.feedback='That flag number is not in this documented list.';}
        return true;
      }
      if (state.editor) return false;
      if(['panic-left','panic-right'].includes(key)) {
        state.feedback='Emergency key combinations are outside this menu-training simulation.';
        return true;
      }
      if(['r-u-sounder-test','r-u-strobe-test','r-s-siren','r-s-strobe'].includes(node.id) && key==='enter') {
        state.feedback='The fictional test is already active. Menu/Back stops it.';
        return true;
      }
      if (state.rootId==='r-installer' && state.trail.length===1 && key==='back') {
        state.feedback='Main Menu. Select 0 Exit, then OK to save and leave installer programming.';
        return true;
      }
      if (node.id==='r-e0' && key==='enter') {
        if (Object.values(state.zoneStates).includes('tamper')) {
          state.feedback='Restore the fictional tamper before leaving Installer mode. The source also checks system faults; this fixture has none.';
          return true;
        }
        helpers.executeAction({action:'logout'});
        return true;
      }
      if (omitIds.has(node.id) && key==='enter') {
        const r=omissionMemory(state), permanent=node.id==='r-u-omit-permanent';
        const old=copy(state.omittedZones);
        if(permanent)r.riscoPermanent=copy(state.draftOmissions||r.riscoPermanent);
        else {r.riscoRecall=copy(r.riscoOneTime);r.riscoOneTime=copy(state.draftOmissions||r.riscoOneTime);}
        mergeOmissions(state);
        for(const id of Object.keys(state.omittedZones)) if(state.omittedZones[id]!==old[id]) helpers.addEvent(state.omittedZones[id]?'Zone omitted':'Zone reinstated',state.zoneNames[id],id);
        helpers.recordHistory('omission-confirmed',{nodeId:node.id,permanent});
        helpers.back();
        state.feedback=(permanent?'Permanent':'One Time Only')+' omit choices confirmed in the fictional panel.';
        return true;
      }
      if (node.id==='r-s-resistance' && key==='enter') {
        state.runtimeState.riscoVoltage=!state.runtimeState.riscoVoltage;
        return true;
      }
      if (node.mode==='log' && ['arm','part-set'].includes(key)) {
        const events=alarmEvents(state,node);
        state.eventIndex=Math.max(0,Math.min(events.length-1,state.eventIndex+(key==='part-set'?10:-10)));
        state.feedback='Moved ten events '+(key==='part-set'?'backward':'forward')+' in the fictional history.';
        return true;
      }
      if (node.mode==='log' && ['next','previous'].includes(key)) {
        const events=alarmEvents(state,node);
        state.eventIndex=Math.max(0,Math.min(events.length-1,state.eventIndex+(key==='next'?1:-1)));
        return true;
      }
      return false;
    },
    onApplyEdit({state}) { return validateClockDraft(state); },
    screen({model,state,node,frame,view}) {
      if(state.editor) return null;
      if(omitIds.has(node.id)) {
        const zone=view.zone,permanent=node.id==='r-u-omit-permanent';
        return {heading:node.label,lines:[zone?zone.address+' '+zone.name:'No eligible zones',zone?(zone.omitted?'Omitted':'Not omitted'):''],note:(permanent?'Permanent':'One Time Only')+' fixture selection · Part Set changes it; OK confirms. Populated LCD wording and spacing are illustrative.'};
      }
      if(node.id==='r-s-resistance') {
        const zone=view.zone,voltage=state.runtimeState.riscoVoltage;
        const readings={secure:'2.20 V',active:'4.40 V',tamper:'12.00 V'};
        return {heading:'Zone Resistance',lines:[zone?zone.address+' '+zone.name:'No wired zones',zone?(voltage?readings[zone.status]:zone.reading):''],note:'Fictional '+(voltage?'voltage':'resistance')+' · OK switches resistance/voltage (installer p222); arrows select the detector. Values are teaching fixtures, not a measurement formula.'};
      }
      if(node.mode==='walk') {
        const quick=node.id.endsWith('-quick'),ids=quick?state.walk.allowed.filter(id=>!state.walk.hits.includes(id)):state.walk.hits;
        const id=ids[wrap(frame.cursor,ids.length)];
        return {heading:node.label,lines:[quick?'Undetected zones':'Detected zones',id?id+' '+state.zoneNames[id]+(quick?'':' — Alarm'):quick?'All demo zones tested':'None detected yet'],note:'Fictional '+(quick?'Quick':'Full')+' walk test. Activate a demo detector; arrows browse results; Menu/Back stops. Source timeout is 60 minutes; elapsed-time warnings are not reproduced.'};
      }
      if(node.mode==='log') {
        const event=alarmEvents(state,node)[state.eventIndex];
        return {heading:node.label,lines:event?[event.time+' '+event.label,event.zone?event.zone+' '+(state.zoneNames[event.zone]||event.details):event.details]:['No demo events',''],note:'Fictional event memory. Arrows browse; Part Set moves ten older and Full Set ten newer. No erase command exists.'};
      }
      if(['r-u-fault','r-s-trouble'].includes(node.id)) {
        const tampers=Object.keys(state.zoneStates).filter(id=>state.zoneStates[id]==='tamper');
        return {lines:[node.label,tampers.length?'Demo tamper '+tampers.join(', '):'No demo faults'],note:'Fictional fixture status; other panel fault categories are reference-only.'};
      }
      if(['r-u-partition-status','r-s-partition-status'].includes(node.id)) return {lines:['Partition 1',state.armed?state.armingMode:'Unset'],note:fixtureNotice};
      const labels={
        'r-u-version':['System Version','FINDR demo baseline'], 'r-s-version':['System Version','FINDR demo baseline'],
        'r-u-level':['System Entry Level','Grand Master demo'], 'r-u-serial':['Serial Number','DEMO — not enrolled'],
        'r-u-panel-id':['Panel ID','DEMO — not registered'], 'r-u-ip':['IP Address','192.0.2.10 (demo)'],
        'r-s-ip':['IP Address','192.0.2.10 (demo)'], 'r-s-installer-info':['Installer','Demo service contact'],
      };
      return labels[node.id]?{lines:labels[node.id],note:fixtureNotice}:null;
    },
    stop({state}) { delete state.runtimeState?.riscoVoltage; },
    restore({state,saved}) {
      const r=omissionMemory(state);
      for(const field of ['riscoPermanent','riscoOneTime','riscoRecall']) {
        const candidate=saved?.runtimeState?.[field];
        if(candidate&&typeof candidate==='object'&&!Array.isArray(candidate)) for(const id of Object.keys(state.omittedZones)) r[field][id]=candidate[id]===true;
      }
      mergeOmissions(state);
    },
  };

  return {
    profileId:map.profileId,
    roots:[
      {id:'r-installer',label:'Installer programming · G (2020)',role:'Installer',edition:'5IN2048 G · 06/2020',commitOnExit:true,directNumericMenus:true,nodeIds:['r-e1','r-e2','r-e3','r-e4','r-e5','r-e6','r-e7','r-e8','r-e0']},
      {id:'r-user',label:'UK user functions · E (2021)',role:'Grand Master',edition:'5IN2124 E · 08/2021',commitOnExit:false,numericSelection:false,nodeIds:map.nodes.filter(n=>n.parentId==='r-user').map(n=>n.id)},
      {id:'r-service',label:'Installer operations · G (2020)',role:'Installer',edition:'5IN2048 G · 06/2020',commitOnExit:false,numericSelection:false,nodeIds:map.nodes.filter(n=>n.parentId==='r-service').map(n=>n.id)},
    ],
    defaultRootId:'r-installer',demoModel:'RISCO LightSYS2 · RP432KP LCD',overrides,runtime,
    records:{user:[{id:'00',label:'Demo Grand Master'},...numbered(3,'Demo user')],partition:numbered(4,'Partition',1),followMe:numbered(4,'Demo Follow Me'),schedule:numbered(4,'Weekly programme'),sounder:[{id:'01',label:'Demo sounder'}]},
    navigation:{menuNextKey:'next',menuPreviousKey:'previous',recordNextKey:'next',recordPreviousKey:'previous',choiceToggleKeys:['arm','part-set'],flagToggleKeys:['arm','part-set'],directNumericMenus:true,exitEditorToParent:true},
    fixtureNotice,
    notes:[fixtureNotice,'Installer G (2020), UK user E (2021) and physical keypad H (2022) are separately identified sources. This is not LightSYS+ or a claim about the latest firmware.','Use local numeric quick keys in installer programming. User and service menus use scrolling because their source tables do not provide numeric shortcuts.','The source requires 0 then OK to leave installer programming. Menu/Back cancels an unconfirmed editor.','The One By One zone wizard, output-programming wizard, device allocation, reset/anticode and live communications are explicitly reference-only. By Category edits, omission, diagnostics and common tests work with fictional data.'],
  };
}
