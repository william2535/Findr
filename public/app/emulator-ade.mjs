// Accenta G4 + 8EP417A LCD. Source: IU1-0040 Rev1.0 / IE1-0040 Rev1.1.
// All values, records, events and physical effects remain local FINDR fixtures.
const copy = value => JSON.parse(JSON.stringify(value));
const wrap = (n,length) => length ? (n % length + length) % length : 0;
const digit = key => /^\d$/.test(key);
const pad = (value,width) => String(value ?? '').padStart(width,'0').slice(-width);
const transient = state => state.runtimeState ||= {};
const selectedProgram = state => transient(state).adeProgram || 1;
const editableInteractions = new Set(['ade-system-flags','ade-zone-flags','ade-program-flags','ade-chime','ade-timer','ade-clock','ade-code','ade-exit-mode']);
const logLabels = new Set(['INTRUDER','ENTRY START','ZONE OMITTED','FIRE ZONE','ZONE EXCLUDED','CODE ENTRY','SET PROGRAM','SYSTEM UNSET','CLEAR LOG','NVM INIT','START UP','PA','RKP PA','DURESS CODE','ENTRY TIMEOUT','SYSTEM REARM','CODE TAMPER','USER RESET',"ENG’R RESET",'ENG ACCESS','ENG FINISH','OLD TIME','NEW TIME','OLD DATE','NEW DATE','MAINS FAIL','MAINS OK','LOOP TAMPER']);
const logEvents = state => state.events.filter(event => event.fixture || logLabels.has(event.label)).slice(0,250).map((event,index)=>({...event,number:250-index}));
const maskByZone = (node,value) => Object.fromEntries(node.choices.map(choice => [String(choice.code),Boolean(value?.[choice.id])]));
const maskFor = (node,byZone) => Object.fromEntries(node.choices.map(choice => [choice.id,Boolean(byZone[String(choice.code)])]));

function programMask(model,helpers,program,kind) {
  const node = model.nodes[`a-eP-${program}-${kind}`];
  return {node, value:maskByZone(node,helpers.valueFor(node))};
}
function syncEligibility(model,state,helpers) {
  const allow = model.nodes['a-eO-2'], allowed = maskByZone(allow,helpers.valueFor(allow));
  const used = programMask(model,helpers,selectedProgram(state),'used').value;
  for (const zone of state.records.zone) state.zoneOmitEnabled[zone.id] = Boolean(allowed[zone.id] && used[zone.id]);
}
function storeProgramMask(model,state,node,helpers,draft) {
  const changed = maskByZone(node,draft), program = node.program;
  const used = programMask(model,helpers,program,'used');
  const timed = programMask(model,helpers,program,'timed');
  const inhibit = programMask(model,helpers,program,'inhibit');
  const masks = {used:used.value,timed:timed.value,inhibit:inhibit.value};
  masks[node.maskKind] = changed;
  for (const zone of Object.keys(changed)) {
    if (node.maskKind === 'used' && !changed[zone]) masks.timed[zone] = masks.inhibit[zone] = false;
    if (node.maskKind === 'timed' && changed[zone]) {masks.used[zone] = true; masks.inhibit[zone] = false;}
    if (node.maskKind === 'inhibit' && changed[zone]) {masks.used[zone] = true; masks.timed[zone] = false;}
  }
  if (program === 1 && !Object.values(masks.used).some(Boolean)) masks.used['1'] = true;
  for (const field of [used,timed,inhibit]) {
    const value = maskFor(field.node,masks[field.node.maskKind]);
    if (JSON.stringify(value) !== JSON.stringify(helpers.valueFor(field.node))) helpers.storeValue(field.node,value);
  }
  state.editor = null;
  syncEligibility(model,state,helpers);
  helpers.back();
  state.feedback = 'Program '+program+' zone lists stored. Used, Timed and Inhibit dependencies are preserved.';
}
function physicalOnly(state) {state.feedback = 'Use the documented physical controls shown for this screen.';return true;}
function codeResult(state,node,label) {transient(state).adeCodeResult = {nodeId:node.id,label};state.editor = null;state.digits = '';}
function storeDemoCode(state,node,helpers,value) {
  if(!/^\d{4}$/.test(value)){state.feedback='Enter exactly four fictional digits. Use OMIT, where permitted, to delete a code.';return false;}
  const duplicate=Object.entries(state.values).some(([key,stored])=>key.startsWith('ade-code-')&&!key.startsWith(node.valueKey+'|')&&stored===value);
  if(duplicate){state.feedback='That fictional code is already in use. Enter a different four-digit value.';state.editor.draft='';state.editor.dirty=false;return false;}
  if(!helpers.storeValue(node,value))return false;
  codeResult(state,node,'Code Saved');return true;
}
function beginNameEditor(model,state,node,frame,helpers) {
  const runtime = transient(state);
  runtime.adeNames = {nodeId:node.id,index:0,values:copy(state.zoneNames)};
  frame.context.zone = state.records.zone[0]?.id;
  helpers.startEditor(node);
  state.editor.draft = runtime.adeNames.values[frame.context.zone];
  state.editor.choiceIndex = Math.max(0,node.choices.findIndex(c=>c.value===state.editor.draft));
}
function armProgram(model,state,helpers) {
  if(state.armed){state.feedback='This setting period is already active. Use User Unsetting and four fictional digits before starting another.';return;}
  const program = selectedProgram(state), mode = model.nodes[`a-eP-${program}-mode`];
  if (String(helpers.valueFor(mode)) === '0') {state.feedback='That program is disabled in the simulated configuration.';return;}
  const used = programMask(model,helpers,program,'used').value;
  const blocked = Object.keys(used).filter(id=>used[id] && state.zoneStates[id] !== 'secure' && !state.omittedZones[id]);
  if (blocked.length) {state.feedback='Cannot set: '+blocked.map(id=>id+' '+state.zoneNames[id]).join(', ')+' is not secure.';return;}
  state.armed = true;state.armingMode = 'Program '+program;state.alarm = false;
  helpers.addEvent('SET PROGRAM','Program '+program+' · fictional set period');
  helpers.recordHistory('arm',{program});
  state.feedback='Fictional Program '+program+' set. Exit timing is condensed; no live alarm is connected.';
}

export function getAdeConfig(map,profile) {
  const overrides = {};
  for (const node of map.nodes) {
    if (node.simulation) overrides[node.id] = copy(node.simulation);
  }
  // The fixed descriptor library is a real choice field, never free text.
  // Its on-key workflow edits all eight records then commits on RESET.
  const names = overrides['a-e6'];
  Object.assign(names,{mode:'choice',scope:'zone',bind:'zoneName',choices:names.library.map((label,i)=>({id:'ade-descriptor-'+i,label,value:label,code:null})),defaultValue:'Front Door',saveKey:'back'});
  for (const node of map.nodes) {
    const adapter = overrides[node.id];
    if (!adapter) continue;
    if (adapter.interaction === 'ade-timer' || adapter.interaction === 'ade-system-flags') adapter.returnOnSave = true;
    if (adapter.statusRows?.some(row=>typeof row==='string')) adapter.statusRows=adapter.statusRows.map(row=>{const [label,...value]=row.split(' / ');return {label,value:value.join(' / ')||'FINDR fixture'};});
  }
  overrides['a-e3-1'].defaultValue['a-e3-1-f8'] = true;
  const nodeIds = root => map.nodes.filter(n=>n.parentId===root && overrides[n.id]?.mode!=='info' || n.parentId===root && n.kind!=='reference').map(n=>n.id);
  const roots = [
    {id:'a-engineer',label:'Accenta G4 · Engineer',role:'Engineer',nodeIds:nodeIds('a-engineer'),shortcutKeys:{chime:'a-eC',omit:'a-eO',program:'a-eP'}},
    {id:'a-user1',label:'Accenta G4 · User 1',role:'User 1',nodeIds:nodeIds('a-user1'),shortcutKeys:{chime:'a-user1-log'}},
    {id:'a-user2',label:'Accenta G4 · User 2',role:'User 2',nodeIds:nodeIds('a-user2'),shortcutKeys:{chime:'a-user2-log'}},
    {id:'a-day-root',label:'Day Mode / Chime',role:'User',nodeIds:['a-day','a-day-chime'],startNodeId:'a-day',shortcutKeys:{chime:'a-day-chime'}},
    {id:'a-setting-root',label:'Authorised Setting',role:'User',nodeIds:['a-setting','a-setting-omit','a-setting-program'],startNodeId:'a-setting',shortcutKeys:{omit:'a-setting-omit',program:'a-setting-program'}},
    {id:'a-unset-root',label:'User Unsetting · restores omissions',role:'User',nodeIds:['a-unset'],startNodeId:'a-unset'},
  ].map(root=>({...root,edition:profile.edition,commitOnExit:false}));
  const fixtureNotice='All names, codes, events and settings are fictional FINDR data. No alarm, communicator, PA circuit or physical output is connected.';
  const runtime = {
    onActivate({model,state,node,frame,helpers}) {
      const rt = transient(state);
      delete rt.adeCodeResult;
      if (node.interaction === 'ade-zone-names') beginNameEditor(model,state,node,frame,helpers);
      if (['ade-timer','ade-clock'].includes(node.interaction)) rt.adeCursor={nodeId:node.id,index:0};
      if (node.interaction === 'ade-setting') {rt.adeProgram ||= Number(state.armingMode?.match(/^Program ([123])$/)?.[1])||1;syncEligibility(model,state,helpers);}
      if (node.interaction === 'ade-omit') {
        syncEligibility(model,state,helpers);
        const eligible=state.records.zone.filter(z=>state.zoneOmitEnabled[z.id]);
        frame.context.zone=eligible[0]?.id;
      }
      if (node.interaction === 'ade-unset') rt.adeUnsetCode={nodeId:node.id,digits:'',complete:false};
      if (node.interaction === 'ade-log') delete rt.adeLogJump;
    },
    onKey({model,state,key,node,base,frame,helpers}) {
      const rt=transient(state), interaction=node.interaction;
      if (key==='pa-left'||key==='pa-right') {state.feedback='The two PA buttons are shown for recognition. Their simultaneous hardware gesture is not reproduced.';return true;}
      if (key==='back' && state.trail.length===1) {helpers.executeAction({action:'logout'});return true;}
      // The engineer guide explicitly prints 8 followed by SET; the separate
      // user-code procedure prints an immediate 8. Preserve that distinction.
      if (node.id==='@a-engineer' && key==='8') {frame.cursor=node.children.indexOf('a-e8');state.digits='';state.feedback='Set Up Codes selected. SET enters this engineer option.';return true;}
      if (interaction==='ade-walk') {
        if (key==='enter') {state.walk.hits=[];state.walk.running=true;state.walk.view=0;state.feedback='Walk test restarted; previous hits cleared.';helpers.recordHistory('walk-restart');return true;}
        if (key==='back') return false;
        return physicalOnly(state);
      }
      if (interaction==='ade-outputs') {
        const outputs=Object.keys(state.outputStates);
        if (key==='0') {for(const output of outputs)state.outputStates[output]=false;helpers.recordHistory('output-all-off');state.feedback='All test outputs off.';return true;}
        if (node.outputToggleCodes?.[key]) {
          const output=node.outputToggleCodes[key];frame.cursor=outputs.indexOf(output);state.outputStates[output]=!state.outputStates[output];
          helpers.recordHistory('output',{output,value:state.outputStates[output]});state.feedback=output+(state.outputStates[output]?' on':' off')+' in the simulation.';return true;
        }
        if (['next','enter','back'].includes(key)) return false;
        return physicalOnly(state);
      }
      if (interaction==='ade-zone-names') {
        const edit=rt.adeNames;
        if (!edit) {beginNameEditor(model,state,node,frame,helpers);return true;}
        const address=state.records.zone[edit.index]?.id;
        if (key==='enter') {
          const index=node.choices.findIndex(choice=>choice.value===edit.values[address]);
          edit.values[address]=node.choices[wrap(index+1,node.choices.length)].value;
          state.editor.draft=edit.values[address];state.editor.choiceIndex=wrap(index+1,node.choices.length);state.editor.dirty=true;
          state.feedback='Descriptor selected. RESET stores all changed zone names.';return true;
        }
        if (key==='next') {
          edit.index=wrap(edit.index+1,state.records.zone.length);frame.context.zone=state.records.zone[edit.index].id;
          helpers.startEditor(node);state.editor.draft=edit.values[frame.context.zone];state.editor.choiceIndex=Math.max(0,node.choices.findIndex(c=>c.value===state.editor.draft));return true;
        }
        if (key==='back') {
          for (const zone of state.records.zone) if (state.zoneNames[zone.id]!==edit.values[zone.id]) {frame.context.zone=zone.id;helpers.storeValue(node,edit.values[zone.id]);}
          state.editor=null;helpers.back();state.feedback='Selected library descriptors stored.';return true;
        }
        return physicalOnly(state);
      }
      if (interaction==='ade-log') {
        const events=logEvents(state);
        if (rt.adeLogJump) {
          if (digit(key)) {rt.adeLogJump.digits=(rt.adeLogJump.digits+key).slice(0,3);return true;}
          if (key==='back') {delete rt.adeLogJump;state.feedback='Event-number entry cancelled.';return true;}
          if (key==='enter') {
            const number=Number(rt.adeLogJump.digits);
            const index=rt.adeLogJump.digits.length===3?events.findIndex((e,i)=>(e.number??250-i)===number):-1;
            if(index<0){state.feedback='Enter a three-digit event number present in this fictional log.';return true;}
            state.eventIndex=index;state.details=false;delete rt.adeLogJump;return true;
          }
          return physicalOnly(state);
        }
        if (key==='program') {rt.adeLogJump={digits:''};state.digits='';return true;}
        if (key==='next'||key==='omit') {state.eventIndex=Math.max(0,Math.min(events.length-1,state.eventIndex+(key==='next'?1:-1)));state.details=false;return true;}
        if (key==='enter') {state.details=!state.details;return true;}
        if (key==='back') return false;
        return physicalOnly(state);
      }
      if (interaction==='ade-day') {
        if(key==='chime'){helpers.push('a-day-chime');return true;}
        if(key==='enter') {
          const flags=model.nodes['a-e3-2'];
          if(helpers.valueFor(flags)?.['a-e3-2-f1'])helpers.push('a-setting');
          else state.feedback='Single Key Set is not enabled. The Authorised Setting context represents the user-code step.';
          return true;
        }
        if(key==='back')return false;return physicalOnly(state);
      }
      if (interaction==='ade-setting') {
        if(key==='omit'){helpers.push('a-setting-omit');return true;}
        if(key==='program'){helpers.push('a-setting-program');return true;}
        if(key==='enter'){armProgram(model,state,helpers);return true;}
        if(key==='back'){
          const alreadySet=state.armed;
          if(!alreadySet)state.armingMode='Unset';
          helpers.back();
          if(alreadySet)state.feedback='Left the local setting screen. The fictional system remains set; use User Unsetting and four fictional digits to unset.';
          return true;
        }
        return physicalOnly(state);
      }
      if (interaction==='ade-setting-program') {
        if (['1','2','3'].includes(key)) {
          if(state.armed){state.feedback='The system is already set. Unset before selecting a program for a new setting period.';return true;}
          const mode=model.nodes[`a-eP-${key}-mode`];
          if(String(helpers.valueFor(mode))==='0'){state.feedback='That program is disabled.';return true;}
          rt.adeProgram=Number(key);syncEligibility(model,state,helpers);helpers.back();state.feedback='Program '+key+' selected for this fictional setting period.';return true;
        }
        if(key==='back')return false;return physicalOnly(state);
      }
      if (interaction==='ade-omit') {
        const eligible=state.records.zone.filter(z=>state.zoneOmitEnabled[z.id]);
        if(state.armed&&(digit(key)||key==='enter')){state.feedback='The system is already set. Unset before choosing omissions for a new setting period.';return true;}
        if (digit(key)) {
          if(!eligible.some(z=>z.id===key)){state.feedback='Zone '+key+' is not both Used and Omit Allow in this program.';return true;}
          frame.context.zone=key;
          if(!state.omittedZones[key]) {state.omittedZones[key]=true;helpers.addEvent('ZONE OMITTED',state.zoneNames[key]+' · one set period',key);helpers.recordHistory('omission',{zone:key,value:true});}
          state.feedback='Zone '+key+' omitted for this set period. Unsetting restores it automatically.';return true;
        }
        if (key==='next') {const i=eligible.findIndex(z=>z.id===frame.context.zone);frame.context.zone=eligible[wrap(i+1,eligible.length)]?.id;state.feedback='Browsing eligible zones. Use the zone digit to omit; ▲ omission semantics still need hardware verification.';return true;}
        if (key==='enter') {armProgram(model,state,helpers);if(state.armed)helpers.back();return true;}
        if(key==='back')return false;return physicalOnly(state);
      }
      if (interaction==='ade-unset') {
        if(digit(key)) {
          const entry=rt.adeUnsetCode ||= {nodeId:node.id,digits:'',complete:false};
          if(entry.complete)return true;
          entry.digits=(entry.digits+key).slice(0,4);
          if(entry.digits.length===4) {
            helpers.executeAction({action:'unset',reinstateOnDisarm:true});
            if(state.events[0]?.label==='Unset')state.events[0].label='SYSTEM UNSET';
            helpers.recordHistory('automatic-reinstatement');entry.complete=true;entry.digits='';
            state.feedback='Fictional system unset. All temporary omissions restored; no code was authenticated or retained.';
          }
          return true;
        }
        if(key==='back')return false;return physicalOnly(state);
      }
      if (interaction==='ade-version') {if(['next','back'].includes(key))return false;return physicalOnly(state);}
      if (editableInteractions.has(interaction)) {
        if (!state.editor) {
          if(key==='back')return false;
          if(interaction==='ade-code' && (digit(key)||key==='omit'||key==='enter')) {helpers.startEditor(node);delete rt.adeCodeResult;}
          else if(key==='enter')return false;
          else return physicalOnly(state);
        }
        const editor=state.editor;
        if (['ade-system-flags','ade-zone-flags','ade-program-flags','ade-chime'].includes(interaction)) {
          if (key==='next') {editor.cursor=wrap(editor.cursor+1,node.choices.length);return true;}
          if ((key==='9'||key==='0') && ['ade-system-flags','ade-zone-flags'].includes(interaction)) {
            for(const choice of node.choices)editor.draft[choice.id]=key==='9' && !(node.maskKind==='double-knock'&&state.zoneTypes[String(choice.code)]==='Fire');
            editor.dirty=true;return true;
          }
          const choice=digit(key)?node.choices.find(choice=>String(choice.code)===key):key==='chime'&&interaction==='ade-zone-flags'?node.choices[editor.cursor]:null;
          if(choice){
            editor.cursor=node.choices.indexOf(choice);
            if(node.maskKind==='double-knock'&&state.zoneTypes[String(choice.code)]==='Fire'){state.feedback='Double Knock cannot be applied to a Fire zone.';return true;}
            editor.draft[choice.id]=!editor.draft[choice.id];editor.dirty=true;return true;
          }
          if(key==='back') {
            if(interaction==='ade-system-flags'){helpers.back();state.feedback='Unconfirmed system-flag draft cancelled.';return true;}
            if(interaction==='ade-program-flags'){storeProgramMask(model,state,node,helpers,editor.draft);return true;}
            if(helpers.storeValue(node,editor.draft)) {
              state.editor=null;
              if(node.maskKind==='omit-allow')syncEligibility(model,state,helpers);
              if(interaction==='ade-chime')state.chime=Object.values(editor.draft).some(Boolean);
              helpers.back();state.feedback=node.label+' stored in the fictional panel.';
            }
            return true;
          }
          if(key==='enter'&&interaction==='ade-system-flags') {
            const draft=copy(editor.draft);
            if(helpers.saveEditor()&&node.id==='a-e3-1')for(const id of ['7','8'])state.zoneTypes[id]=draft['a-e3-1-f'+id]?'Fire':'Intruder';
            return true;
          }
          return physicalOnly(state);
        }
        if (['ade-timer','ade-clock'].includes(interaction)) {
          const width=node.digitsRequired||6;
          if(!rt.adeCursor||rt.adeCursor.nodeId!==node.id)rt.adeCursor={nodeId:node.id,index:0};
          if(digit(key)) {
            const chars=pad(editor.draft,width).split(''),index=rt.adeCursor.index;
            chars[index]=key;editor.draft=chars.join('');editor.dirty=true;rt.adeCursor.index=Math.min(width-1,index+1);return true;
          }
          if(key==='omit'&&interaction==='ade-timer'){rt.adeCursor.index=0;state.feedback='Cursor returned to the first digit.';return true;}
          if(key==='enter') {
            const text=String(editor.draft);
            if(node.clockPart==='time'&&(!/^\d{6}$/.test(text)||Number(text.slice(0,2))>23||Number(text.slice(2,4))>59||Number(text.slice(4,6))>59)){state.feedback='Enter a valid time as HHMMSS.';return true;}
            helpers.saveEditor();return true;
          }
          if(key==='back'){helpers.back();state.feedback='Unconfirmed digit edit cancelled.';return true;}
          return physicalOnly(state);
        }
        if (interaction==='ade-code') {
          if(key==='omit') {
            if(!node.deletable){state.feedback='This code cannot be deleted with OMIT.';return true;}
            helpers.storeValue({...node,minLength:0},'');codeResult(state,node,'Code Deleted');return true;
          }
          if(digit(key)) {
            const current=editor.dirty?String(editor.draft):'',value=(current+key).slice(0,4);
            editor.draft=value;editor.dirty=true;
            if(value.length===4)storeDemoCode(state,node,helpers,value);
            return true;
          }
          if(key==='back'){helpers.back();return true;}
          return physicalOnly(state);
        }
        if(interaction==='ade-exit-mode') {
          if(digit(key)) {
            const index=node.choices.findIndex(c=>String(c.code)===key);
            if(index<0){state.feedback='That exit mode is not available for this program.';return true;}
            editor.choiceIndex=index;editor.draft=node.choices[index].value;editor.dirty=true;return true;
          }
          if(key==='back') {
            if(String(editor.draft)==='2'&&!Object.values(programMask(model,helpers,node.program,'timed').value).some(Boolean)){state.feedback='Final Door needs at least one timed zone. Configure a timed zone first.';return true;}
            helpers.saveEditor();return true;
          }
          return physicalOnly(state);
        }
      }
      return false;
    },
    onApplyEdit(context) {
      const {state,node,helpers}=context;
      if(!state.editor)return true;
      if(node.interaction==='ade-code') {
        storeDemoCode(state,node,helpers,String(state.editor.draft));
        return true;
      }
      const saveOnReset=['ade-zone-names','ade-zone-flags','ade-program-flags','ade-chime','ade-exit-mode'].includes(node.interaction);
      return runtime.onKey({...context,key:saveOnReset?'back':'enter'});
    },
    screen({model,state,node,frame,view}) {
      const rt=state.runtimeState||{},interaction=node.interaction;
      if(interaction==='ade-walk')return {lines:['12345678  TP',state.records.zone.map(z=>state.walk.hits.includes(z.id)?'1':'0').join('')+'  00'],note:'Fictional zone hits. SET restarts; RESET stops. Separate PA/tamper circuit activation is not reproduced.'};
      if(interaction==='ade-outputs')return {note:'1–'+node.outputs.length+' toggles and displays; ▲ next; SET toggles; 0 all off; RESET all off and exit. Local simulation only.'};
      if(interaction==='ade-zone-names') {
        const edit=rt.adeNames,address=edit?state.records.zone[edit.index]?.id:frame.context.zone;
        return {lines:[address+': '+(edit?.values[address]||state.zoneNames[address]),'SET: descriptor'],note:'SET cycles the fixed library; ▲ next zone; RESET stores names and exits.'};
      }
      if(interaction==='ade-log') {
        if(rt.adeLogJump)return {lines:['Event Number?',rt.adeLogJump.digits.padEnd(3,'#')],note:'Enter three digits then SET. Only events present in the fictional log can be selected.'};
        const events=logEvents(state),event=events[state.eventIndex];
        return {lines:event?[(event.number??250-state.eventIndex)+'>'+event.label,state.details?event.details:event.time]:['No demo events',''],note:'Fictional log. ▲ older; OMIT newer; SET details; PROG event number; RESET leaves.'};
      }
      if(interaction==='ade-day')return {lines:['Day Mode','SYSTEM UNSET'],note:'CHIME selects chime zones. SET starts setting only if Single Key Set is enabled. Context selection is a FINDR control.'};
      if(interaction==='ade-setting')return {lines:state.armed?['** SYSTEM SET **','Program '+selectedProgram(state)]:['Program '+selectedProgram(state)+' Set','Authorised demo user'],note:state.armed?'Use User Unsetting and any four fictional digits to demonstrate automatic restoration.':'OMIT chooses omissions; PROG chooses program; SET quick-sets. Exit timing is condensed.'};
      if(interaction==='ade-setting-program')return {lines:['Select Program','1, 2 or 3'],note:state.armed?'The system is already set. Unset before choosing a program for the next setting period.':'A program disabled in engineer settings is unavailable.'};
      if(interaction==='ade-omit') {
        const id=frame.context.zone;
        return {lines:id?[id+': '+state.zoneNames[id],state.omittedZones[id]?'Omitted':'Not Omitted']:['No eligible zones',''],note:state.armed?'This setting period is active. Its omissions are read-only here; User Unsetting restores them.':'Zone digit omits; SET continues setting. Unset restores omissions. The source’s ▲ wording remains unverified.'};
      }
      if(interaction==='ade-unset')return {lines:rt.adeUnsetCode?.complete?['SYSTEM UNSET','Omissions restored']:['Enter Your Code','*'.repeat(rt.adeUnsetCode?.digits?.length||0).padEnd(4,'-')],note:'FINDR gesture practice: use any four fictional digits. No real/factory code is requested, authenticated or retained.'};
      if(interaction==='ade-version')return {note:'Manual example values only; no actual firmware has been detected. ▲ advances; RESET returns.'};
      if(state.editor && ['ade-zone-flags','ade-program-flags','ade-chime'].includes(interaction)) {
        const choice=node.choices[state.editor.cursor],address=String(choice?.code);
        return {lines:[address+': '+state.zoneNames[address],node.label+': '+(state.editor.draft[choice?.id]?'YES':'NO')],note:interaction==='ade-zone-flags'?'Zone digit or CHIME toggles; ▲ next; 9 all on; 0 all off; RESET stores.':'Zone digit toggles; ▲ next; RESET stores and returns.'};
      }
      if(interaction==='ade-system-flags')return {note:'Digit selects and toggles; ▲ next; 9 all on; 0 all off; SET stores; RESET cancels.'};
      if(interaction==='ade-clock' && state.editor) {
        const value=pad(state.editor.draft,6),date=node.clockPart==='date';
        return {lines:['Time and Date',(date?'Date? ':'Time? ')+value.match(/.{2}/g).join(date?'-':':')],note:'Digits overwrite from left to right. SET accepts; RESET cancels. '+(date?'DDMMYY.':'HHMMSS, then date.')};
      }
      if(interaction==='ade-timer' && state.editor) {
        const value=pad(state.editor.draft,node.digitsRequired),seconds=node.secondsMultiplier?(Number(value)===0?node.zeroSeconds:Number(value)*node.secondsMultiplier):null;
        return {lines:[node.label,value+(seconds!==null?' = '+seconds+' seconds':node.units?' '+node.units:'')],note:'Digits overwrite from the cursor. OMIT returns to first digit; SET stores; RESET cancels.'};
      }
      if(interaction==='ade-code')return {lines:rt.adeCodeResult?.nodeId===node.id?[rt.adeCodeResult.label,'FINDR record only']:['Edit Code',(state.editor?.dirty?'*'.repeat(String(state.editor.draft).length):'').padEnd(4,'-')],note:'Four fictional digits auto-save. '+(node.deletable?'OMIT deletes. ':'')+'No authentication or live connection.'};
      if(interaction==='ade-exit-mode')return {note:'Choose the mode digit; RESET stores. Program1 cannot be disabled; Final Door needs a timed zone.'};
    },
    stop({state,node}) {
      const rt=transient(state);
      if(!node){for(const key of Object.keys(rt))if(key.startsWith('ade'))delete rt[key];return;}
      for(const key of ['adeNames','adeLogJump','adeCursor','adeCodeResult','adeUnsetCode'])if(!rt[key]?.nodeId||rt[key].nodeId===node.id||rt[key].nodeId.startsWith(node.id+'-'))delete rt[key];
    },
    onZone({model,state,address,status,old,previous}) {
      const latest=state.events[0];
      const program=Number(state.armingMode?.match(/^Program ([123])$/)?.[1])||selectedProgram(state);
      const mask=kind=>{
        const node=model.nodes[`a-eP-${program}-${kind}`];
        return maskByZone(node,state.values[(node.valueKey||node.id)+'|system||']??node.defaultValue);
      };
      if(state.armed && status==='active') {
        if(!mask('used')[address] || state.omittedZones[address]) {
          state.alarm=previous.alarm;
          if(latest?.simulated)latest.label='FINDR INPUT';
          state.feedback=state.zoneNames[address]+': active, excluded from this setting program.';
        } else if(mask('timed')[address]) {
          state.alarm=previous.alarm;transient(state).adeEntryStarted=true;
          if(latest?.simulated)latest.label='ENTRY START';
          state.feedback='Entry route started in the fixture. Countdown and entry-timeout alarms are not simulated.';
        } else if(mask('inhibit')[address] && transient(state).adeEntryStarted) {
          state.alarm=previous.alarm;if(latest?.simulated)latest.label='FINDR INPUT';
          state.feedback='Inhibited entry-route zone active. Physical countdown behaviour is outside this fixture.';
        } else if(latest?.simulated)latest.label='INTRUDER';
      } else if(state.armed && status==='tamper' && latest?.simulated)latest.label='LOOP TAMPER';
    },
    restore({state,saved}) {
      if(state.armed && /^Program [123]$/.test(saved?.armingMode||''))state.armingMode=saved.armingMode;
    },
  };
  return {profileId:map.profileId,roots,defaultRootId:'a-engineer',demoModel:'Accenta G4 · 8EP417A LCD',overrides,records:{},runtime,eventCapacity:250,
    navigation:{directNumericMenus:true,menuNextKey:'next',menuPreviousKey:'__none__',recordNextKey:'next',recordPreviousKey:'__none__',choiceNextKey:'next',choicePreviousKey:'__none__',exitEditorToParent:true},
    fixtureNotice,notes:[fixtureNotice,'Pinned to User Guide IU1-0040 Rev1.0 and Engineer Manual IE1-0040 Rev1.1. Original manufacturer PDF, archive hosted.','No engineer-root5 appears in this edition. CHIME / OMIT / PROG correspond to C / O / P. Only one physical ▲ key is present.','Exact source conflicts are recorded in the menu-map gaps. LED log presentation and hardware effects are reference-only.']};
}
