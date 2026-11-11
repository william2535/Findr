// A local teaching simulation. It has no transport, panel connection or live commands.
const copy=value=>JSON.parse(JSON.stringify(value));
const clamp=(n,max)=>Math.max(0,Math.min(n,Math.max(0,max-1)));
const frame=id=>({id,cursor:0});
export const currentFrame=state=>state.trail.at(-1);
export const currentNode=(profile,state)=>profile.nodes[currentFrame(state)?.id]||profile.nodes.root;
export const currentZone=(profile,state)=>profile.zones[clamp(state.zoneIndex,profile.zones.length)];
export const currentTask=(profile,state)=>profile.tasks.find(t=>t.id===state.taskId)||null;
const eventsFor=(profile,node)=>profile.events.filter(e=>!node.eventIds||node.eventIds.includes(e.id)).filter(e=>!node.filter||!e.logs||e.logs.includes(node.filter));
const isZoneList=node=>['zones','zone-select','zone-program','walk-select','zone-omit'].includes(node.kind);
const zoneIndexes=(profile,node)=>profile.zones.map((zone,index)=>({zone,index})).filter(({zone})=>(node.kind!=='zone-omit'||!node.eligibleOnly||zone.omitEnabled===true)&&(!node.recordIds||node.recordIds.includes(zone.address))&&(!node.eligibleZoneTypes||node.eligibleZoneTypes.includes(zone.type))).map(({index})=>index);

export function createPracticeState(profile,taskId=null){
  const task=profile.tasks.find(t=>t.id===taskId);
  const rootId=task?.startNodeId&&profile.nodes[task.startNodeId]?.sessionRoot?task.startNodeId:'root';
  return {profileId:profile.id,taskId:task?.id||null,rootId,trail:[frame(rootId)],digits:'',zoneIndex:0,eventIndex:0,
    details:false,editing:false,choice:0,walkRunning:false,walkHits:[],lastWalk:[],walkSelected:[],walkAllowed:[],walkView:0,showZoneName:false,bell:{Bell:false,Strobe:false},
    zoneStates:Object.fromEntries(profile.zones.map(z=>[z.address,task?.initialStates?.[z.address]||'secure'])),
    zoneTypes:Object.fromEntries(profile.zones.map(z=>[z.address,z.type])),committedTypes:Object.fromEntries(profile.zones.map(z=>[z.address,z.type])),
    omittedZones:Object.fromEntries(profile.zones.map(z=>[z.address,task?.initialOmissions?.[z.address]===true])),draftOmissions:null,omissionFinished:false,
    changed:false,loggedOut:false,exitPrompt:false,complete:false,steps:0,feedback:'',history:[]};
}

function push(profile,state,id){
  if(!profile.nodes[id])return;
  state.trail.push(frame(id));state.digits='';state.details=false;state.editing=false;
  const node=profile.nodes[id];
  if(isZoneList(node))state.zoneIndex=zoneIndexes(profile,node)[0]??0;
  if(node.kind==='zone-omit'){
    state.draftOmissions=node.commitKey?copy(state.omittedZones):null;state.omissionFinished=false;
  }
  if(node.kind==='walk-select')state.walkSelected=[];
  if(node.kind==='log')state.eventIndex=0;
  if(node.kind==='type'){
    state.choice=Math.max(0,profile.zoneTypes.findIndex(t=>t.label===state.zoneTypes[currentZone(profile,state).address]));
    state.editing=true;
  }
  if(node.kind==='walk-run'){
    state.walkRunning=true;state.walkHits=[];state.lastWalk=[];state.walkView=0;
    state.walkAllowed=node.selected?[...state.walkSelected]:profile.zones.filter(z=>node.allFilter==='omitEnabled'?z.omitEnabled===true:true).map(z=>z.address);
    state.feedback='Walk test running in this practice session. Activate a demo detector below.';
  }
  if(node.kind==='logout'){if(node.confirmExit)state.exitPrompt=true;else logoff(profile,state);}
}
function leave(profile,state){
  const node=currentNode(profile,state);
  if(node.kind==='bell'&&node.stopOutputsOnExit){for(const output of node.outputs){if(output==='Bell'&&state.bell[output])state.history.push({event:'bell-off'});state.bell[output]=false;}}
  if(node.kind==='zone-omit'){
    if(node.commitKey){state.draftOmissions=null;state.feedback='FINDR discarded the unconfirmed omit selection. Press '+profile.enterLabel+' to store it in this lesson.';}
    else if(node.finishKey==='back'){state.omissionFinished=true;state.feedback='Returned from the omit list. The demo zone selection is retained.';}
  }
  if(node.kind==='walk-run'){state.walkRunning=false;state.lastWalk=[...state.walkHits];state.feedback='Practice walk test stopped.';}
  state.editing=false;state.digits='';state.details=false;
  state.showZoneName=false;
  if(state.trail.length>1)state.trail.pop();
  else if(profile.exitFromRoot&&(state.rootId||'root')==='root'){if(profile.exitWithoutConfirmation)logoff(profile,state);else state.exitPrompt=true;}
  else state.feedback='You are at the top of the selected practice menus.';
}
function logoff(profile,state){
  if(profile.exitChecks&&(state.rootId||'root')==='root'&&Object.values(state.zoneStates).some(s=>s!=='secure')){
    state.exitPrompt=false;state.feedback='FINDR exit check: restore all demo zones to Secure before leaving Installer mode. Real panels also check devices and tampers.';return;
  }
  state.committedTypes=copy(state.zoneTypes);state.changed=false;state.loggedOut=true;state.exitPrompt=false;
  state.walkRunning=false;state.bell={Bell:false,Strobe:false};state.feedback='Practice session logged off. All changes were simulated.';
}
function enterByDigits(profile,state){
  const node=currentNode(profile,state),digits=state.digits;
  if(!digits)return 'empty';
  if(node.kind==='type'||state.editing){
    const index=profile.zoneTypes.findIndex(t=>t.code===digits||Number(t.code)===Number(digits));
    if(index>=0){state.choice=index;state.digits='';return 'type';}
  }else if(isZoneList(node)&&node.numericSelection!==false){
    const allowed=zoneIndexes(profile,node);
    const index=profile.zones.findIndex((z,index)=>allowed.includes(index)&&(z.address===digits||Number(z.address)===Number(digits)));
    if(index>=0){state.zoneIndex=index;state.digits='';return 'zone';}
  }
  if(node.kind==='menu'){
    const direct=(node.children||[]).find(id=>profile.nodes[id].code===digits);
    if(direct){push(profile,state,direct);return 'menu';}
    if(profile.directMenuCodes&&(currentFrame(state).id===(state.rootId||'root')||node.parent===(state.rootId||'root')||node.globalShortcuts)){
      const target=Object.entries(profile.nodes).find(([,n])=>n.shortcut===digits);
      if(target){
        const ids=[];let id=target[0];let budget=30;
        while(id&&id!==(state.rootId||'root')&&budget--){ids.unshift(id);id=profile.nodes[id]?.parent;}
        if(id!==(state.rootId||'root'))return 'invalid';
        state.trail=[frame(state.rootId||'root')];for(const next of ids)push(profile,state,next);
        return 'menu';
      }
    }
  }
  state.digits='';state.feedback='That number is not included in this practice route. Use the scroll keys or Show route.';
  return 'invalid';
}
function saveType(profile,state){
  const zone=currentZone(profile,state),choice=profile.zoneTypes[state.choice];
  if(!choice)return;
  state.zoneTypes[zone.address]=choice.label;state.changed=true;state.editing=false;state.digits='';
  if(!profile.commitOnExit)state.committedTypes[zone.address]=choice.label;
  state.feedback=profile.commitOnExit?'Selection accepted in the simulation. Leave Installer mode to save it.':'The demo zone type has been updated.';
  if(currentNode(profile,state).kind==='type')leave(profile,state);
}

function toggleOmission(profile,state,node){
  const zone=currentZone(profile,state);
  if(zone.omitEnabled!==true){state.feedback='This demo zone is not configured as omittable. Choose an eligible zone.';return;}
  const values=node.commitKey?state.draftOmissions:state.omittedZones;
  values[zone.address]=node.omitOnly?true:!values[zone.address];state.omissionFinished=false;
  state.history.push({event:'omission-change',zone:zone.address,value:values[zone.address]});
  state.feedback=zone.name+(values[zone.address]?' selected for omission.':' selected for inclusion.')+(node.commitKey?' Press '+profile.enterLabel+' to store the choice.':' '+profile.backLabel+' finishes this practice route.');
}

function updateCompletion(profile,state){
  const task=currentTask(profile,state);if(!task||state.complete)return state;
  const node=currentNode(profile,state),zone=currentZone(profile,state),goal=task.goal;
  let done=false;
  if(goal.kind==='zone')done=node.kind==='zones'&&zone.address===goal.zone&&(!goal.resistance||node.resistance||state.details);
  if(goal.kind==='log')done=node.kind==='log'&&eventsFor(profile,node)[state.eventIndex]?.id===goal.event&&(!goal.details||state.details);
  if(goal.kind==='walk')done=!state.walkRunning&&state.lastWalk.includes(goal.zone);
  if(goal.kind==='type')done=(goal.commit?state.committedTypes:state.zoneTypes)[goal.zone]===goal.value;
  if(goal.kind==='bell')done=state.history.some(h=>h.event==='bell-on')&&state.history.some(h=>h.event==='bell-off');
  if(goal.kind==='logout')done=state.loggedOut;
  if(goal.kind==='omission')done=state.omittedZones[goal.zone]===goal.value&&state.omissionFinished&&state.history.some(h=>h.event==='omission-change'&&h.zone===goal.zone&&h.value===goal.value);
  if(done){state.complete=true;state.feedback=task.completionMessage||'Task complete. You found the right route and finished the practice action.';}
  return state;
}

export function pressPracticeKey(profile,previous,key){
  const state=copy(previous);state.steps++;state.feedback='';
  const node=currentNode(profile,state),f=currentFrame(state);
  if(state.loggedOut){if(key==='enter')return createPracticeState(profile,state.taskId);state.feedback='Press the confirm key to start a fresh practice session.';return state;}
  if(state.exitPrompt){
    if(key==='enter')logoff(profile,state);
    else if(['back','change'].includes(key)){state.exitPrompt=false;if(node.kind==='logout')state.trail.pop();}
    return updateCompletion(profile,state);
  }
  const nav=profile.navigation||{};
  if(node.kind==='menu'&&node.shortcutKeys?.[key]){push(profile,state,node.shortcutKeys[key]);return updateCompletion(profile,state);}
  if(node.kind==='walk-run'&&key===node.restartKey){state.walkHits=[];state.lastWalk=[];state.walkView=0;state.feedback='Walk test restarted; the demo test results are cleared.';return updateCompletion(profile,state);}
  if(node.kind==='bell'){
    const output=node.outputToggleCodes?.[key]||(node.toggleKeys||[]).includes(key)&&node.outputs[f.cursor];
    if(key===node.allOffKey||output){
      if(key===node.allOffKey){for(const name of node.outputs){if(name==='Bell'&&state.bell[name])state.history.push({event:'bell-off'});state.bell[name]=false;}state.feedback='All simulated test outputs are off.';}
      else {state.bell[output]=!state.bell[output];f.cursor=Math.max(0,node.outputs.indexOf(output));if(output==='Bell')state.history.push({event:state.bell[output]?'bell-on':'bell-off'});state.feedback=output+(state.bell[output]?' on':' off')+' in the simulation only.';}
      return updateCompletion(profile,state);
    }
  }
  if(['zones','log'].includes(node.kind)&&Object.hasOwn(node,'detailsKey')&&['details',node.detailsKey].includes(key)&&key!==node.detailsKey){state.feedback='Use the documented controls for this screen.';return state;}
  if(node.kind==='menu'){
    if(node.menuWrap===false&&key===(node.menuNextKey||nav.menuNextKey)&&f.cursor>=node.children.length-1){leave(profile,state);return updateCompletion(profile,state);}
    if(node.menuWrap===false&&key===(node.menuPreviousKey||nav.menuPreviousKey)&&f.cursor===0)return updateCompletion(profile,state);
    if(key===nav.menuNextKey)key='next';else if(key===nav.menuPreviousKey)key='previous';
  }else if(node.kind==='log'){
    if(key===node.logSummaryKey){state.details=false;return updateCompletion(profile,state);}
    if(key===node.detailsKey)key='details';
    else if(key===(node.logNextKey||nav.logNextKey))key='next';
    else if(key===(node.logPreviousKey||nav.logPreviousKey))key='previous';
  }else if(isZoneList(node)){
    if(key===node.detailsKey)key='details';
    else if(key===(node.recordNextKey||nav.recordNextKey))key='next';
    else if(key===(node.recordPreviousKey||nav.recordPreviousKey))key='previous';
  }
  if(state.editing){if(key===nav.choiceNextKey)key='next';else if(key===nav.choicePreviousKey)key='previous';}
  if(node.kind==='zone-omit'){
    if(node.omitOnDigit&&/^\d$/.test(key)){
      state.digits=(state.digits+key).slice(-(profile.zoneDigits||1));
      if(state.digits.length===(profile.zoneDigits||1)&&enterByDigits(profile,state)==='zone')toggleOmission(profile,state,node);
      return updateCompletion(profile,state);
    }
    if(key==='enter'&&node.enterFinishesOmission){state.omissionFinished=true;state.armed=node.enterStartsSetting===true;state.trail.pop();state.digits='';state.feedback=node.enterStartsSetting?'The demo omission is retained and setting has started. It is cleared when this simulated system is unset.':'The demo omission is retained.';return updateCompletion(profile,state);}
    if((node.toggleKeys||[]).includes(key)){
      if(state.digits){state.feedback='Finish the '+profile.zoneDigits+'-digit zone number before pressing '+node.toggleLabel+'. The previous zone has not been changed.';return state;}
      state.digits='';toggleOmission(profile,state,node);return updateCompletion(profile,state);
    }
    if(key===node.commitKey){
      state.omittedZones=copy(state.draftOmissions);state.draftOmissions=null;state.omissionFinished=true;
      state.trail.pop();state.digits='';state.feedback='The demo omit choices are stored.';
      return updateCompletion(profile,state);
    }
    if(/^\d$/.test(key)&&!node.numericSelection){state.feedback='Use '+(profile.id==='galaxy-dimension'?'A / B':'the up / down keys')+' to find an eligible zone in this omit list.';return state;}
    if(key==='enter'&&node.enterStartsSetting){state.feedback='On the real keypad, ent starts setting from this screen. This lesson finishes with esc without setting.';return state;}
    if(key===node.recordAdvanceKey){const indexes=zoneIndexes(profile,node),index=indexes.indexOf(state.zoneIndex);state.zoneIndex=indexes[(index+1)%indexes.length]??0;return updateCompletion(profile,state);}
  }
  if(key==='omit'&&node.omitNode){push(profile,state,node.omitNode);return state;}
  if(/^\d$/.test(key)){
    if(!state.editing&&isZoneList(node)&&node.numericSelection===false){state.digits='';state.feedback='This FINDR lesson uses the up / down keys to select a zone.';return state;}
    state.digits=(state.digits+key).slice(-6);
    if(node.autoDigits){const match=(node.children||[]).find(id=>profile.nodes[id].code===state.digits);if(match)push(profile,state,match);}
    else if(!state.editing&&isZoneList(node)&&profile.zoneDigits&&state.digits.length===profile.zoneDigits)enterByDigits(profile,state);
    return updateCompletion(profile,state);
  }
  if(key==='backspace'){state.digits=state.digits.slice(0,-1);return state;}
  if(key==='back'){
    if(state.digits){state.digits='';return state;}
    if(state.editing&&node.kind==='zone-program'){state.editing=false;state.feedback='FINDR discarded this practice edit. The demo value is unchanged.';return state;}
    leave(profile,state);return updateCompletion(profile,state);
  }
  if(key==='logout'){state.exitPrompt=true;return state;}
  if(key==='reset-key'){
    if(state.walkRunning){state.walkRunning=false;state.lastWalk=[...state.walkHits];}
    state.trail=[frame(state.rootId||'root')];state.digits='';state.editing=false;state.details=false;state.draftOmissions=null;
    state.feedback=(state.rootId||'root')==='root'?'Returned to the practice menu. The simulated engineer is still logged on; use 0 Log off ENGINEER to finish.':'Returned to the authorised user practice prompt.';
    return updateCompletion(profile,state);
  }
  if(key==='details'){
    if(['zones','log'].includes(node.kind))state.details=!state.details;
    else if(node.kind==='walk-select'){
      const address=currentZone(profile,state).address;
      state.walkSelected=state.walkSelected.includes(address)?state.walkSelected.filter(z=>z!==address):[...state.walkSelected,address];
    }
    else if(node.kind==='walk-run')state.walkView=state.walkView?0:1;
    else state.feedback='This key has no action in the selected practice screen.';
    return updateCompletion(profile,state);
  }
  if(key==='change'){
    if(node.kind==='zone-program'){
      state.choice=Math.max(0,profile.zoneTypes.findIndex(t=>t.label===state.zoneTypes[currentZone(profile,state).address]));state.editing=true;
    }else state.feedback='Use the back/menu key to leave this practice screen.';
    return state;
  }
  if(key==='left'||key==='right'){
    if(node.kind==='bell'){
      const output=(node.outputs||['Bell','Strobe'])[f.cursor];state.bell[output]=!state.bell[output];
      if(output==='Bell')state.history.push({event:state.bell.Bell?'bell-on':'bell-off'});
      state.feedback=output+(state.bell[output]?' on':' off')+' in the simulation only.';
      return updateCompletion(profile,state);
    }
    if(['zones','walk-run'].includes(node.kind)&&profile.zoneNameToggle){state.showZoneName=!state.showZoneName;return state;}
    if(node.kind==='log'&&profile.rightLogDetails){state.details=key==='right';return updateCompletion(profile,state);}
    if(key==='right'&&profile.rightIsEnter)key='enter';
    else if(key==='left'&&profile.leftIsBack)key='back';
    else {state.feedback='Only the documented task routes are included in this practice screen.';return state;}
    if(key==='back'){leave(profile,state);return updateCompletion(profile,state);}
  }
  if(key==='area'&&node.kind==='walk-run'){
    if(profile.walkUntestedToggle){state.walkView=state.walkView?0:1;state.feedback=state.walkView?'Showing untested demo zones.':'Showing the full practice test.';}
    else {state.walkView=(state.walkView+1)%3;state.feedback=['Showing tested demo zones.','Showing demo zones still to test.','Inactivity view: this fictional site has no historical activity data.'][state.walkView];}
    return state;
  }
  if(key==='next'||key==='previous'){
    let direction=key==='next'?1:-1;state.digits='';
    if(state.editing)state.choice=(state.choice+direction+profile.zoneTypes.length)%profile.zoneTypes.length;
    else if(node.kind==='menu')f.cursor=(f.cursor+direction+node.children.length)%node.children.length;
    else if(isZoneList(node)){
      const indexes=zoneIndexes(profile,node),index=indexes.indexOf(state.zoneIndex);
      state.zoneIndex=indexes[(index+direction+indexes.length)%indexes.length]??0;
    }
    else if(node.kind==='log'){if(profile.reverseLogScroll)direction=-direction;state.eventIndex=clamp(state.eventIndex+direction,eventsFor(profile,node).length);}
    else if(node.kind==='walk-results'||(node.kind==='walk-run'&&state.walkView))f.cursor=(f.cursor+direction+profile.zones.length)%profile.zones.length;
    else if(node.kind==='bell')f.cursor=(f.cursor+direction+node.outputs.length)%node.outputs.length;
    return updateCompletion(profile,state);
  }
  if(key==='enter'){
    if(state.digits){
      const result=enterByDigits(profile,state);
      if(result==='type')saveType(profile,state);
      return updateCompletion(profile,state);
    }
    if(state.editing)saveType(profile,state);
    else if(node.kind==='menu')push(profile,state,node.children[f.cursor]);
    else if(node.kind==='zone-select')push(profile,state,node.next);
    else if(node.kind==='walk-ready')push(profile,state,node.next);
    else if(node.kind==='walk-select'){
      if(state.walkSelected.length)push(profile,state,node.next);
      else state.feedback='Select a demo zone with # before starting the walk test.';
    }
    else if(node.kind==='walk-run'&&(profile.walkStopWithEnter||node.finishKey==='enter'))leave(profile,state);
    else if(node.kind==='zone-program')state.feedback='Use '+(profile.editLabel||'the edit key')+' to change the displayed zone type.';
    else if(node.kind==='logout')logoff(profile,state);
    return updateCompletion(profile,state);
  }
  state.feedback='This key is outside the selected practice routes.';
  return state;
}

export function setPracticeZone(profile,previous,address,status){
  const state=copy(previous);if(!profile.zones.some(z=>z.address===address)||!['secure','active','tamper'].includes(status))return state;
  const before=state.zoneStates[address];state.zoneStates[address]=status;
  if(state.walkRunning&&state.walkAllowed.includes(address)&&status==='active'&&before!=='active'&&!state.walkHits.includes(address)){
    state.walkHits.push(address);state.feedback='Demo zone '+address+' registered in the walk test.';
  }
  return updateCompletion(profile,state);
}

export function practiceScreen(profile,state){
  const node=currentNode(profile,state),f=currentFrame(state),zone=currentZone(profile,state);
  if(state.loggedOut)return {heading:'Practice session',lines:['Session ended','Press '+profile.enterLabel+' to restart'],note:'FINDR practice display'};
  if(state.exitPrompt)return {heading:'Confirm exit',lines:(state.rootId||'root')!=='root'?['Exit user practice?','Confirm to finish']:profile.exitPrompt||['Log off ENGINEER?','YES to confirm'],note:profile.commitOnExit&&(state.rootId||'root')==='root'?'Accept to save the simulated configuration.':'This ends the simulated session.'};
  if(state.digits)return {heading:node.label,lines:['Selection: '+state.digits,profile.enterLabel+' to confirm'],note:'Numeric entry'};
  if(state.editing){const choice=profile.zoneTypes[state.choice],mark=profile.markCurrentType&&state.zoneTypes[zone.address]===choice.label?'*':'';return {heading:'Zone '+zone.address,lines:[profile.typeLabel||'Type',`${choice.code&&!profile.hideTypeCodes?choice.code+' ':''}${mark}${choice.label}`],note:profile.enterLabel+' accepts the demo value.'};}
  if(node.kind==='user-prompt')return {heading:'Authorised user practice',lines:node.lines,note:node.note||'A valid user code is already assumed. Press Omit to begin; arming is outside this lesson.'};
  if(node.kind==='zone-omit'){
    if(!zoneIndexes(profile,node).length)return {heading:node.label,lines:node.emptyLines||['No omittable zones','Check configuration'],note:'Only zones configured for omission are available.'};
    const omitted=(state.draftOmissions||state.omittedZones)[zone.address],eligible=zone.omitEnabled===true;
    if(profile.id==='galaxy-dimension')return {heading:node.label,lines:[zone.address+' '+state.zoneTypes[zone.address].toUpperCase(),omitted?'OMITTED ENT=SET':'#=OMIT ENT=SET'],note:zone.name+' · # toggles; esc returns without setting.'};
    if(profile.id==='texecom-premier-elite')return {heading:node.label,lines:['Zone'+(omitted?'*':' ')+zone.address+(eligible?'*':' ')+(profile.statusLabels[state.zoneStates[zone.address]]||'Secure'),omitted?'is Omitted':zone.name],note:'Omit toggles the selected zone. Menu finishes. The right-hand * marks eligibility.'};
    if(profile.id==='scantronic-ion')return {heading:node.label,lines:['OMIT ZONES','Zone '+zone.address+'        '+(omitted?'O':'I')],note:zone.name+' · O = omitted; I = included. ▶ changes; ✓ stores.'};
    if(profile.id==='menvier-mseries')return {heading:node.label,lines:[zone.address+(omitted?' is Omitted':' is Armed'),zone.name],note:'Toggle changes; ENT next; ESC finishes.'};
    if(profile.id==='pyronix-enforcer')return {heading:node.label,lines:['Omit Input ['+zone.address+']',zone.name+' '+(omitted?'Yes':'No')],note:'◀ / ▶ chooses a Day Alarm input; YES toggles; NO finishes.'};
    if(profile.id==='ade-accenta-optima')return {heading:node.label,lines:['Omit Zones',profile.zones.filter(z=>state.omittedZones[z.address]).map(z=>z.address).join(' ')||'None omitted'],note:'A zone number selects it for omission. SET continues setting; RESET cancels the setting route. Unsetting restores omitted zones.'};
    return {heading:node.label,lines:['Omit zones',zone.address+': '+zone.name+' '+(eligible?(omitted?'✓':'×'):'--')],note:'✓ = omitted; × = monitored; -- = cannot omit. ◀/▶ changes; Back finishes.'};
  }
  if(node.kind==='menu'){
    const selected=profile.nodes[node.children[f.cursor]];
    if(node.lines)return {heading:node.label,lines:node.lines,note:'Select a number · '+selected.label+' highlighted'};
    return {heading:node.label,lines:[node.screenTitle||node.label,(selected.code?selected.code+' ':'')+(selected.display||selected.label)],note:`${f.cursor+1} of ${node.children.length} selected menu routes`};
  }
  if(node.kind==='zones'){
    const status=state.zoneStates[zone.address],reading=profile.readings[status];
    const metric=node.resistance||state.details;
    const statusLabel=profile.statusLabels[status]||status;
    const metricLine=profile.id==='galaxy-dimension'?reading+'  '+(profile.rioVoltage||'12.6V'):profile.id==='texecom-premier-elite'||profile.statusWithReading?statusLabel+' '+reading:reading;
    return {heading:node.label,lines:[profile.zoneNameToggle?(state.showZoneName?zone.name:'Zone '+zone.address):zone.address+' '+zone.name,metric?metricLine:statusLabel],note:metric?'Simulated reading · '+profile.circuit:'Demo zone '+zone.address};
  }
  if(node.kind==='zone-select')return {heading:node.label,lines:['Zone '+zone.address,zone.name],note:profile.enterLabel+' selects this demo zone.'};
  if(node.kind==='zone-program')return {heading:node.label,lines:['Zone '+zone.address+' '+zone.name,state.zoneTypes[zone.address]],note:profile.editLabel+' edits the type.'};
  if(node.kind==='log'){
    const events=eventsFor(profile,node),event=events[state.eventIndex];
    if(!event)return {heading:node.label,lines:['No example events','Selected log'],note:'Fictional practice data'};
    return {heading:node.label,lines:state.details?[event.details,event.time]:[event.label,event.zone+' '+event.time],note:`Example event ${state.eventIndex+1} of ${events.length} · invented site data`};
  }
  if(node.kind==='walk-select')return {heading:node.label,lines:[zone.address+' '+zone.name,state.walkSelected.includes(zone.address)?'TEST':'#=TEST'],note:'# selects a demo zone; '+profile.enterLabel+' starts.'};
  if(node.kind==='walk-ready')return {heading:node.label,lines:node.lines||['Walk test','Area A selected'],note:profile.enterLabel+' starts the practice test.'};
  if(node.kind==='walk-results'||(node.kind==='walk-run'&&(state.walkView||profile.id==='texecom-premier-elite'))){
    const hits=state.walkRunning?state.walkHits:state.lastWalk;
    const untested=node.filter==='untested'||((profile.id==='texecom-premier-elite'||profile.walkUntestedToggle)&&state.walkView===1);
    const list=profile.zones.filter(z=>!state.walkRunning||state.walkAllowed.includes(z.address)).filter(z=>untested?!hits.includes(z.address):hits.includes(z.address));
    const item=list[f.cursor%Math.max(1,list.length)];
    return {heading:node.label,lines:profile.id==='texecom-premier-elite'&&state.walkView===2?['Recent inactivity','No demo history']:[untested?'Zones Untested':'Zones Tested',item?(profile.zoneNameToggle?(state.showZoneName?item.name:item.address):item.address+' '+item.name):'None'],note:'FINDR result display · fictional detectors'};
  }
  if(node.kind==='walk-run')return {heading:node.label,lines:profile.id==='galaxy-dimension'?['WALK TEST ACTIVE','ESC to abort']:[`${state.walkHits.length} tested / ${state.walkAllowed.length-state.walkHits.length} remaining`,state.walkHits.length?'Zone '+state.walkHits.at(-1)+' tested':'Activate a demo detector'],note:'Practice test · '+(profile.walkStopWithEnter||node.finishKey==='enter'?profile.enterLabel:profile.backLabel)+' stops the test.'};
  if(node.kind==='bell'){
    const output=node.outputs[f.cursor];return {heading:node.label,lines:[output,state.bell[output]?'ON':'OFF'],note:node.note||'Simulated output only · use ◀ / ▶ to toggle.'};
  }
  return {heading:node.label,lines:[node.label,'Selected practice route'],note:''};
}

export function taskMatches(profile,task,query){
  const haystack=[profile.brand,profile.title,task.title,task.description,...(task.aliases||[])].join(' ').toLowerCase();
  return query.toLowerCase().trim().split(/\s+/).filter(Boolean).every(term=>haystack.includes(term));
}
