// A local, stateful panel emulator. It has no panel transport or live commands.
// Documented menu structure and explicit behavior adapters are deliberately separate.
import {getEmulatorConfig} from './emulator-config.mjs';
import {activateExtendedTest,handleExtendedTestKey,extendedTestScreen,updateExtendedWalk} from './emulator-test-flow.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
const own = (object,key) => Object.prototype.hasOwnProperty.call(object || {},key);
const wrap = (value,length) => length ? (value % length + length) % length : 0;
const clean = value => String(value ?? '').replace(/[\u0000-\u001f]/g,'');
const numberEquals = (a,b) => /^\d+$/.test(String(a)) && /^\d+$/.test(String(b)) && Number(a) === Number(b);
const editableModes = new Set(['choice','number','text','flags']);
const activeModes = new Set(['zones','omit','log','walk','walk-results','outputs','action','status']);
const normalize = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g,'');
const rootFrame = rootId => ({id:'@'+rootId,cursor:0,context:{},namespace:{}});
const nowLabel = () => new Date().toLocaleString('en-GB',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'});
const navigation = model => model.config.navigation || {};
const deferredCommit = (model,state) => model.rootById[state.rootId]?.commitOnExit ?? model.profile.commitOnExit;

function choicesFrom(raw,byParent) {
  return (byParent.get(raw.id)||[]).filter(n=>n.kind==='selection').map(n=>({id:n.id,label:n.label,code:n.code,value:n.id,nodeId:n.id}));
}

export function buildEmulatorModel(map,profile) {
  const config=getEmulatorConfig(map,profile), rawById=new Map(map.nodes.map(n=>[n.id,n])), byParent=new Map();
  for(const raw of map.nodes){const list=byParent.get(raw.parentId)||[];list.push(raw);byParent.set(raw.parentId,list);}
  for(const list of byParent.values())list.sort((a,b)=>a.order-b.order);
  const overrides=config.overrides||{},nodes={};
  for(const raw of map.nodes){
    const override=overrides[raw.id]||{}, kids=byParent.get(raw.id)||[];
    if(raw.kind==='reference'&&!override.include&&!override.mode&&!override.aliasTarget)continue;
    if(raw.kind==='selection'&&!override.include&&!override.mode&&!kids.length)continue;
    const selections=choicesFrom(raw,byParent), other=kids.filter(n=>n.kind!=='selection'&&n.kind!=='reference');
    let mode=override.mode||(selections.length&&raw.kind==='setting'?'choice':other.length?'menu':'info');
    if(raw.kind==='selection'&&kids.length&&!override.mode)mode='menu';
    const node={...raw,...override,mode,code:raw.codeType==='ambiguous'?null:raw.code,
      notes:[...(raw.notes||[]),...(override.notes||[])],conditions:[...(raw.conditions||[]),...(override.conditions||[])],sourceRefs:[...(raw.sourceRefs||[]),...(override.sourceRefs||[])],
      choices:(override.choices||selections).map((c,index)=>({...c,id:c.id||String(index),value:own(c,'value')?c.value:c.id||c.label})),
      rawChildIds:kids.map(k=>k.id),children:[]};
    if(own(override,'code'))node.code=override.code;
    nodes[raw.id]=node;
  }
  for(const node of Object.values(nodes)){
    const override=overrides[node.id]||{};
    node.children=(override.children||node.rawChildIds).filter(id=>nodes[id]&&rawById.get(id)?.kind!=='selection' || nodes[id]&&(overrides[id]?.include||overrides[id]?.mode==='menu'));
    if(node.mode==='choice')node.children=[];
    if(node.mode==='menu'&&!node.children.length&&!node.selector)node.mode='info';
    if(node.aliasTarget&&nodes[node.aliasTarget]){
      const target=nodes[node.aliasTarget];
      Object.assign(node,{...target,...node,mode:override.mode&&override.mode!=='menu'?override.mode:target.mode,children:[...target.children],choices:target.choices,
        behaviorId:target.id,sourceRefs:[...node.sourceRefs,...target.sourceRefs]});
      for(const key of ['selector','scope','bind','numericSelection','toggleKeys','commitKey','finishKey','action','selectedOnly','sequentialFields','changeKey','saveKey','cancelKey','min','max','maxLength','format','defaultValue'])
        if(!own(override,key)&&own(target,key))node[key]=target[key];
    }
  }
  // Operational screens consume their reference subentries as behavior, not as
  // extra menus. Only true menus and conditional enum branches are traversable.
  for(const node of Object.values(nodes))if(node.mode!=='menu')node.children=[];
  const roots=(config.roots||map.nodes.filter(n=>n.parentId==null&&n.kind==='menu').map(n=>({id:n.id,label:n.label,nodeIds:(byParent.get(n.id)||[]).map(c=>c.id)})))
    .map(r=>({...r,nodeIds:(r.nodeIds||nodes[r.id]?.children||[]).filter(id=>nodes[id])}));
  const rootById=Object.fromEntries(roots.map(r=>[r.id,r]));
  const reachable=new Set();
  function visit(id,seen=new Set()){if(seen.has(id)||!nodes[id])return;seen.add(id);reachable.add(id);const n=nodes[id];for(const c of [...n.children,...n.choices.map(c=>c.nodeId||c.id).filter(c=>nodes[c])])visit(c,seen);}
  for(const root of roots)for(const id of root.nodeIds)visit(id);
  const entries=[...reachable].map(id=>nodes[id]);
  const valueNodes={};for(const node of Object.values(nodes))if(node.valueKey&&!valueNodes[node.valueKey])valueNodes[node.valueKey]=node;
  const stats={total:entries.length,menus:entries.filter(n=>n.mode==='menu').length,editable:entries.filter(n=>editableModes.has(n.mode)).length,
    actions:entries.filter(n=>activeModes.has(n.mode)).length,referenceOnly:entries.filter(n=>n.mode==='info').length,documentedEntries:map.nodes.length};
  return {id:profile.id,title:profile.title,profile,map,config,nodes,valueNodes,rawById,roots,rootById,reachable:[...reachable],defaultRootId:rootById[config.defaultRootId]?config.defaultRootId:roots[0]?.id,stats};
}

function initialRecords(model) {
  const records={
    zone:model.profile.zones.map(z=>({id:z.address,label:z.name})),
    user:[{id:'001',label:'Demo manager'},{id:'002',label:'Demo user 2'},{id:'003',label:'Demo user 3'},{id:'004',label:'Demo user 4'}],
    output:['1','2','3','4'].map((id,i)=>({id,label:['Bell','Strobe','Output 3','Output 4'][i]})),
    area:['A','B','C','D'].map(id=>({id,label:'Area '+id})),
    group:['1','2','3','4'].map(id=>({id,label:'Group '+id})),
    keypad:['1','2'].map(id=>({id,label:'Keypad '+id})),
    module:['1','2'].map(id=>({id,label:'Module '+id})),
    schedule:['1','2','3','4'].map(id=>({id,label:'Schedule '+id})),
  };
  for(const [scope,list] of Object.entries(model.config.records||{}))records[scope]=clone(list);
  for(const node of Object.values(model.nodes))for(const scope of [node.scope,node.selector].filter(Boolean))
    if(!records[scope])records[scope]=['1','2','3','4'].map(id=>({id,label:scope+' '+id}));
  return records;
}

export function createEmulatorState(model,{rootId=model.defaultRootId}={}) {
  rootId=model.rootById[rootId]?rootId:model.defaultRootId;
  const zones=model.profile.zones;
  const state={schemaVersion:1,profileId:model.id,rootId,trail:[rootFrame(rootId)],digits:'',editor:null,confirm:null,pendingJump:[],runtimeState:{},eventCapacity:Math.min(1000,Math.max(1,Math.floor(Number(model.config.eventCapacity)||150))),
    records:initialRecords(model),values:{},committedValues:{},pendingChoice:null,clipboard:null,lastReport:null,zoneStates:Object.fromEntries(zones.map(z=>[z.address,'secure'])),
    zoneTypes:Object.fromEntries(zones.map(z=>[z.address,z.type])),zoneNames:Object.fromEntries(zones.map(z=>[z.address,z.name])),
    zoneAreas:Object.fromEntries(zones.map(z=>[z.address,Object.fromEntries((z.areas||['A']).map(area=>[area,true]))])),
    zoneOmitEnabled:Object.fromEntries(zones.map(z=>[z.address,z.omitEnabled===true])),omittedZones:Object.fromEntries(zones.map(z=>[z.address,false])),
    diagnosticOmissions:{},draftOmissions:null,outputStates:{Bell:false,Strobe:false},walk:{running:false,hits:[],selected:[],allowed:[],view:0},testFlow:null,
    events:model.profile.events.map((event,index)=>({...clone(event),id:event.id||'fixture-'+index,fixture:true})),
    armed:false,armingMode:'Unset',alarm:false,chime:false,changed:false,loggedOut:false,details:false,eventIndex:0,
    feedback:'Authorised '+(model.rootById[rootId]?.role||'training')+' access is already granted in this fictional panel.',steps:0,history:[]};
  enterRootStart(model,state);
  return state;
}

// Some documented user procedures begin at an already-authorised setting
// prompt. The context selector is a FINDR control, not a fabricated panel menu.
function enterRootStart(model,state){
  const root=model.rootById[state.rootId],id=root?.startNodeId;
  if(id&&root.nodeIds.includes(id)&&model.nodes[id])pushNode(model,state,id);
}

const frame=state=>state.trail.at(-1);
function rootNode(model,state){const r=model.rootById[state.rootId],source=model.nodes[r.id]||{};return {...source,...r,id:'@'+r.id,label:r.label,mode:'menu',children:r.nodeIds,sourceRefs:source.sourceRefs||[],conditions:source.conditions||[],notes:[...(source.notes||[]),...(r.notes||[])],code:null};}
function baseNode(model,state){return model.nodes[frame(state)?.id]||rootNode(model,state);}
function currentNode(model,state){
  const node=baseNode(model,state),f=frame(state);
  if(f.selectorNodeId&&model.nodes[f.selectorNodeId])return model.nodes[f.selectorNodeId];
  if(node.sequentialFields&&!f.selectorPending&&node.children.length)return model.nodes[node.children[wrap(f.fieldIndex||0,node.children.length)]]||node;
  return node;
}
function currentScope(model,state,node=currentNode(model,state)){
  if(node.scope)return node.scope;
  for(let i=state.trail.length-1;i>=0;i--){const n=model.nodes[state.trail[i].id];if(n?.scope||n?.selector)return n.scope||n.selector;}
  return null;
}
function currentRecord(model,state,scope=currentScope(model,state)){
  const id=frame(state)?.context?.[scope],record=(state.records[scope]||[]).find(r=>r.id===id);
  return record?scope==='zone'?{...record,label:state.zoneNames[record.id]||record.label}:record:null;
}
function valueKey(model,state,node=currentNode(model,state)){
  const scope=currentScope(model,state,node),f=frame(state),id=f.context?.[scope]||'';
  return [node.valueKey||node.behaviorId||node.id,scope||'system',id,node.valueKey?'':f.namespace?.[scope]||''].join('|');
}
function choiceForValue(node,value){return (node.choices||[]).find(c=>JSON.stringify(c.value)===JSON.stringify(value));}
function valueFor(model,state,node=currentNode(model,state)){
  const key=valueKey(model,state,node);if(own(state.values,key))return state.values[key];
  const address=frame(state).context.zone;
  if(address&&node.bind==='zoneType'){
    const match=node.choices.find(c=>normalize(c.label)===normalize(state.zoneTypes[address]));return match?match.value:state.zoneTypes[address];
  }
  if(address&&node.bind==='zoneName')return state.zoneNames[address];
  if(address&&node.bind==='zoneAreas')return state.zoneAreas[address];
  if(address&&node.bind==='zoneOmitEnabled')return state.zoneOmitEnabled[address];
  if(node.bind==='chime')return state.chime;
  return own(node,'defaultValue')?clone(node.defaultValue):null;
}
function displayValue(node,value){
  if(value===null||value===undefined||value==='')return 'Not configured';
  if(node.mode==='flags'&&value&&typeof value==='object')return Object.entries(value).filter(([,v])=>v).map(([key])=>node.choices.find(c=>c.id===key||String(c.value)===key)?.label||key).join(', ')||'None selected';
  return choiceForValue(node,value)?.label??(value===true?'Enabled':value===false?'Disabled':String(value))+(node.units?' '+node.units:'');
}
function addEvent(state,label,details='',zone=''){
  state.events.unshift({id:'emulator-'+state.steps+'-'+state.events.length,label,details,zone,time:nowLabel(),simulated:true});
  state.events=state.events.slice(0,state.eventCapacity||150);
}
function eventsFor(state,node){
  if(!node.filter)return state.events;
  if(node.filter==='access')return state.events.filter(e=>e.logs?.includes('access'));
  if(node.filter==='panel')return state.events.filter(e=>!e.logs||e.logs.includes('panel'));
  return state.events.filter(e=>node.filter==='alarm'?e.logs?.includes('alarm')||/alarm|intruder|tamper|hold.?up|fire/i.test(e.label):node.filter==='mandatory'?e.category==='mandatory'||e.logs?.includes('mandatory'):node.filter==='non-mandatory'?e.category!=='mandatory'&&!e.logs?.includes('mandatory'):node.filter==='chime'?e.logs?.includes('chime')||/chime/i.test(e.label):true);
}
function recordHistory(state,event,detail={}){state.history.push({event,...detail});state.history=state.history.slice(-100);}
function childrenFor(model,state,node=baseNode(model,state)){
  return (node.children||[]).map(id=>model.nodes[id]).filter(Boolean);
}
function recordsFor(model,state,scope,node=currentNode(model,state)){
  if(!scope)return [];
  const list=state.records[scope]||[{id:'1',label:scope+' 1'},{id:'2',label:scope+' 2'}];
  const recordIds=scope===node.selector&&node.selectorRecordIds?node.selectorRecordIds:!node.scope||scope===node.scope?node.recordIds:null;
  return list.map(r=>scope==='zone'?{...r,label:state.zoneNames[r.id]||r.label}:r)
    .filter(r=>!recordIds||recordIds.includes(r.id))
    .filter(r=>scope!=='zone'||node.mode!=='omit'||!node.eligibleOnly||state.zoneOmitEnabled[r.id])
    .filter(r=>scope!=='zone'||!node.eligibleZoneTypes||node.eligibleZoneTypes.some(type=>normalize(type)===normalize(state.zoneTypes[r.id])));
}

function stopTransient(state){
  if(state.walk.running){state.walk.running=false;state.feedback='Walk test stopped.';}
  for(const output of Object.keys(state.outputStates))state.outputStates[output]=false;
  state.diagnosticOmissions={};state.draftOmissions=null;state.editor=null;state.confirm=null;state.digits='';state.pendingJump=[];state.pendingChoice=null;state.testFlow=null;
}

export function leaveEmulator(model,previous){const state=clone(previous);stopTransient(state);model.config.runtime?.stop?.({model,state});return state;}

export function setEmulatorRoot(model,previous,rootId,{startAtEntry=true}={}){
  if(!model.rootById[rootId])return previous;
  const state=clone(previous);stopTransient(state);model.config.runtime?.stop?.({model,state});state.rootId=rootId;state.trail=[rootFrame(rootId)];state.loggedOut=false;state.details=false;
  if(startAtEntry)enterRootStart(model,state);
  state.feedback='Opened '+model.rootById[rootId].label+'. Simulated panel settings are retained.';return state;
}

function startEditor(model,state,node=currentNode(model,state)){
  const value=valueFor(model,state,node),choices=node.choices||[];
  state.editor={nodeId:node.id,kind:node.mode,draft:value,choiceIndex:Math.max(0,choices.findIndex(c=>JSON.stringify(c.value)===JSON.stringify(value))),cursor:0,dirty:false,characterMode:0,charIndex:0};
  if(node.mode==='choice')state.editor.draft=choices[state.editor.choiceIndex]?.value??null;
  if(node.mode==='text'||node.mode==='number')state.editor.draft=value==null?'':String(value);
  if(node.mode==='flags')state.editor.draft=value&&typeof value==='object'?clone(value):{};
  state.digits='';
}

// Menvier and Pyronix expose immediate, sequential programming fields. Their
// source-backed containers opt in; the existing Texecom Yes/No flow is retained.
function openSequenceField(model,state,container=baseNode(model,state)) {
  const f=frame(state),node=model.nodes[container.children[wrap(f.fieldIndex||0,container.children.length)]]||currentNode(model,state);
  if(container.immediateFields&&node.selector&&!node.question&&node.id!==f.fieldRecordSelected){
    f.selectorPending=node.selector;f.selectorNodeId=node.id;
    f.cursor=Math.max(0,recordsFor(model,state,node.selector,node).findIndex(r=>r.id===f.context[node.selector]));
    f.namespace[node.selector]=Object.entries(f.context).filter(([scope])=>scope!==node.selector).map(([scope,id])=>scope+'='+id).join('/')+'/'+node.id;
    return;
  }
  if(container.immediateFields&&editableModes.has(node.mode))startEditor(model,state,node);
}
function moveSequence(model,state,direction=1) {
  const container=baseNode(model,state),f=frame(state);
  if(!container.sequentialFields)return false;
  state.editor=null;state.digits='';delete f.fieldRecordSelected;delete f.selectorNodeId;
  const index=(f.fieldIndex||0)+direction;
  if(index<0 || index>=container.children.length) {
    if(container.selector&&(index<0||container.sequenceEnd==='selector')) {
      f.fieldIndex=0;f.selectorPending=container.selector;f.selectorDone=false;
      f.cursor=Math.max(0,recordsFor(model,state,container.selector,container).findIndex(r=>r.id===f.context[container.selector]));
      return true;
    }
    if(index<0||container.sequenceEnd==='parent') {
      back(model,state);
      if(index>=container.children.length&&baseNode(model,state).sequentialFields)moveSequence(model,state,1);
      return true;
    }
  }
  f.fieldIndex=wrap(index,container.children.length);openSequenceField(model,state,container);return true;
}

function activate(model,state,node){
  const f=frame(state);state.digits='';state.editor=null;state.details=false;state.eventIndex=0;
  if(node.selector&&!f.selectorDone){f.selectorPending=node.selector;f.cursor=0;return;}
  if(node.sequentialFields){f.fieldIndex=f.fieldIndex||0;openSequenceField(model,state,node);return;}
  if(editableModes.has(node.mode)&&!node.changeKey)startEditor(model,state,node);
  if(['zones','omit','walk-results'].includes(node.mode)){
    const zones=recordsFor(model,state,'zone',node);f.context.zone=zones.some(z=>z.id===f.context.zone)?f.context.zone:zones[0]?.id;
    if(node.mode==='omit')state.draftOmissions=node.commitKey?clone(state.omittedZones):null;
  }
  if(node.mode==='walk'){
    state.walk={running:!node.selectedOnly,hits:[],selected:[],allowed:node.selectedOnly?[]:state.records.zone.map(z=>z.id),view:0};
    if(!node.selectedOnly)state.feedback='Walk test running. Activate a demo detector to register it.';
  }
  if(node.mode==='outputs'){
    const outputs=node.outputs||['Bell','Strobe'];state.outputStates=Object.fromEntries(outputs.map(o=>[typeof o==='string'?o:o.label,false]));
    if(node.selector==='output'&&f.selectorDone)f.cursor=Math.max(0,Math.min(outputs.length-1,recordsFor(model,state,'output',node).findIndex(r=>r.id===f.context.output)));
  }
  activateExtendedTest(model,state,node,f);
  model.config.runtime?.onActivate?.({model,state,node,frame:f,helpers:runtimeHelpers(model,state)});
}
function pushNode(model,state,id){
  const node=model.nodes[id];if(!node)return false;
  const parent=frame(state),context={...parent.context},namespace={...parent.namespace};
  if(['output','module'].includes(node.selector))namespace[node.selector]=node.behaviorId||node.id;
  state.trail.push({id,cursor:0,context,namespace});activate(model,state,node);return true;
}

function stopForNode(state,node){
  if(node.mode==='walk')state.walk.running=false;
  if(node.mode==='outputs')for(const name of Object.keys(state.outputStates))state.outputStates[name]=false;
  if(node.mode==='zones'&&node.diagnosticOmit)state.diagnosticOmissions={};
  if(node.mode==='omit')state.draftOmissions=null;
  if(state.testFlow?.nodeId===node.id)state.testFlow=null;
}
function back(model,state){
  const node=baseNode(model,state);stopForNode(state,node);state.digits='';state.editor=null;state.pendingJump=[];
  model.config.runtime?.stop?.({model,state,node});
  if(state.trail.length>1){state.trail.pop();if(node.advanceParentOnBack&&baseNode(model,state).sequentialFields)moveSequence(model,state,1);return;}
  state.confirm={action:'logout',label:'Leave '+(model.rootById[state.rootId]?.role||'menu')+' mode?'};
}

function ancestorRoute(model,root,id){
  const seen=new Set();
  const walk=(ids,path)=>{
    for(const candidate of ids){if(seen.has(candidate))continue;seen.add(candidate);const n=model.nodes[candidate];if(!n)continue;
      const next=[...path,candidate];if(candidate===id)return next;
      const result=walk([...n.children,...n.choices.map(c=>c.nodeId||c.id).filter(c=>model.nodes[c])],next);if(result)return result;
    }return null;
  };
  return walk(root.nodeIds,[]);
}
function continueJump(model,state){
  while(state.pendingJump.length){
    const id=state.pendingJump.shift(),base=baseNode(model,state);
    if(base.sequentialFields&&base.children.includes(id)){
      frame(state).fieldIndex=base.children.indexOf(id);
      state.editor=null;
      if(!state.pendingJump.length){openSequenceField(model,state,base);break;}
    }
    pushNode(model,state,id);
    if(frame(state).selectorPending)return;
    // A helper locates the destination; it must not make configuration edits on the way.
    if(state.pendingJump.length)state.editor=null;
  }
  if(state.pendingChoice){
    const node=currentNode(model,state),index=node.choices?.findIndex(c=>c.id===state.pendingChoice||c.nodeId===state.pendingChoice);
    if(index>=0){if(!state.editor)startEditor(model,state,node);state.editor.choiceIndex=index;state.editor.draft=node.choices[index].value;state.editor.dirty=true;state.feedback='Documented choice highlighted. Confirm to save it in the fictional panel.';}
    state.pendingChoice=null;
  }
}

export function openEmulatorNode(model,previous,nodeId){
  const raw=model.rawById.get(nodeId);
  if(raw?.kind==='selection'){
    const parent=model.nodes[raw.parentId]||Object.values(model.nodes).find(n=>n.mode==='choice'&&n.choices.some(c=>c.id===nodeId||c.nodeId===nodeId));
    if(parent?.mode==='choice'&&parent.choices.some(c=>c.id===nodeId||c.nodeId===nodeId)){
      const next=openEmulatorNode(model,previous,parent.id);next.pendingChoice=nodeId;if(!frame(next).selectorPending)continueJump(model,next);return next;
    }
  }
  const requested=model.nodes[nodeId];
  if(!requested){
    let ancestor=raw;const seen=new Set();while(ancestor&&!seen.has(ancestor.id)){seen.add(ancestor.id);ancestor=model.rawById.get(ancestor.parentId);if(ancestor&&model.nodes[ancestor.id]){const next=openEmulatorNode(model,previous,ancestor.id);next.feedback='This is a reference entry. Opened its nearest documented keypad menu; no setting was changed.';return next;}}
    return {...previous,feedback:'This reference entry is not a keypad screen.'};
  }
  let root=model.rootById[previous.rootId],route=ancestorRoute(model,root,nodeId);
  if(!route)for(const candidate of model.roots){const found=ancestorRoute(model,candidate,nodeId);if(found){root=candidate;route=found;break;}}
  if(!route){
    let ancestor=model.rawById.get(nodeId);const seen=new Set();
    while(ancestor&&!seen.has(ancestor.id)){seen.add(ancestor.id);ancestor=model.rawById.get(ancestor.parentId);if(ancestor&&model.roots.some(r=>ancestorRoute(model,r,ancestor.id))){const next=openEmulatorNode(model,previous,ancestor.id);next.feedback='Opened the real keypad screen containing this reference detail. It is not a separate menu choice.';return next;}}
    return {...previous,feedback:'This entry is not in an available emulator menu.'};
  }
  const state=setEmulatorRoot(model,previous,root.id,{startAtEntry:false});state.pendingJump=route;state.feedback='Located '+requested.label+'. Select any requested record before continuing.';continueJump(model,state);return state;
}

function validateDraft(node,value){
  if(node.mode==='number'){
    if(!/^-?\d+(?:\.\d+)?$/.test(String(value)))return 'Enter a number.';
    const n=Number(value);if(node.integer!==false&&!Number.isInteger(n))return 'Enter a whole number.';
    if(node.min!==undefined&&n<node.min||node.max!==undefined&&n>node.max)return 'Use '+(node.min??'the minimum')+'–'+(node.max??'the maximum')+(node.units?' '+node.units:'')+'.';
    if(node.step&&Math.abs((n-(node.min||0))/node.step-Math.round((n-(node.min||0))/node.step))>1e-9)return 'Use increments of '+node.step+(node.units?' '+node.units:'')+'.';
  }
  if(node.mode==='text'){
    const text=String(value);if(node.minLength&&text.length<node.minLength)return 'Enter at least '+node.minLength+' characters.';
    if(node.maxLength&&text.length>node.maxLength)return 'Use at most '+node.maxLength+' characters.';
    if(node.textMode==='digits'&&!/^\d*$/.test(text))return 'Use digits for this field.';
    if(node.textMode==='telephone'&&!/^[\d*#]*$/.test(text))return 'Use digits, * and # for this telephone field.';
    if(node.format==='time'&&(!/^\d{4}$/.test(text)||Number(text.slice(0,2))>23||Number(text.slice(2))>59))return 'Enter a 24-hour time as HHMM.';
    if(node.format==='time-seconds'&&(!/^\d{6}$/.test(text)||Number(text.slice(0,2))>23||Number(text.slice(2,4))>59||Number(text.slice(4))>59))return 'Enter a 24-hour time as HHMMSS.';
    if(node.format==='date'||node.format==='date-short'){
      const length=node.format==='date-short'?6:8;
      if(!new RegExp('^\\d{'+length+'}$').test(text))return 'Enter the date as '+(length===6?'DDMMYY.':'DDMMYYYY.');
      const day=Number(text.slice(0,2)),month=Number(text.slice(2,4)),year=Number(text.slice(4))+(length===6?2000:0),date=new Date(Date.UTC(year,month-1,day));
      if(year<2000||year>2099||date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return 'Enter a valid calendar date (2000–2099).';
    }
    if(node.format==='date-month'){
      if(!/^\d{4}$/.test(text))return 'Enter the date as DDMM.';
      const day=Number(text.slice(0,2)),month=Number(text.slice(2)),date=new Date(Date.UTC(2000,month-1,day));
      if(date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return 'Enter a valid day and month.';
    }
  }
  return '';
}

function applyBinding(model,state,node,value){
  const zone=frame(state).context.zone;
  if(zone&&node.bind==='zoneType')state.zoneTypes[zone]=choiceForValue(node,value)?.label||String(value);
  if(zone&&node.bind==='zoneName')state.zoneNames[zone]=String(value);
  if(zone&&node.bind==='zoneAreas')state.zoneAreas[zone]=clone(value);
  const enabled=value===true||value===1||/^(enabled?|on|yes|allowed)$/i.test(choiceForValue(node,value)?.label||String(value));
  if(zone&&node.bind==='zoneOmitEnabled')state.zoneOmitEnabled[zone]=enabled;
  if(node.bind==='chime')state.chime=enabled;
  if(node.mode==='flags'&&zone)for(const choice of node.choices)if(choice.bind==='zoneOmitEnabled')state.zoneOmitEnabled[zone]=Boolean(value[choice.id]);
}

function storeFieldValue(model,state,node,draft){
  if(!node||!editableModes.has(node.mode)||draft===undefined)return false;
  const error=validateDraft(node,draft);if(error){state.feedback=error;return false;}
  if(node.mode==='choice'&&!choiceForValue(node,draft)){state.feedback='Choose a documented value for this field.';return false;}
  let value=clone(draft);if(node.mode==='number')value=Number(value);
  const key=valueKey(model,state,node);state.values[key]=value;state.changed=true;applyBinding(model,state,node,value);
  if(!deferredCommit(model,state))state.committedValues[key]=clone(value);
  state.feedback=node.label+' saved in the simulated panel.'+(deferredCommit(model,state)?' Leave '+model.rootById[state.rootId].role+' mode to commit the configuration.':'');
  recordHistory(state,'setting',{nodeId:node.id,key,value});addEvent(state,'Setting changed',node.label+': '+displayValue(node,value),frame(state).context.zone||'');
  return true;
}

// Family adapters can implement a documented sequence without duplicating the
// state engine. Hooks receive only this press's cloned state and local helpers.
function runtimeHelpers(model,state){
  return {
    back:()=>back(model,state),push:id=>pushNode(model,state,id),
    startEditor:node=>startEditor(model,state,node),saveEditor:()=>saveEditor(model,state),
    executeAction:node=>executeAction(model,state,node),
    selectRecord:(scope,node,digits)=>selectRecordDigits(model,state,scope,node,digits),
    toggleOmit:node=>toggleOmit(model,state,node),
    addEvent:(label,details='',zone='')=>addEvent(state,label,details,zone),
    recordHistory:(event,detail={})=>recordHistory(state,event,detail),
    valueFor:node=>valueFor(model,state,node),storeValue:(node,value)=>storeFieldValue(model,state,node,value),
  };
}
function saveEditor(model,state){
  if(!state.editor)return false;
  const node=model.nodes[state.editor.nodeId],container=baseNode(model,state);
  if(node.testPreview){
    state.feedback='Tone selected: '+displayValue(node,state.editor.draft)+'. Original panel sounds are not reproduced.';
    recordHistory(state,'preview',{nodeId:node.id,value:state.editor.draft});state.digits='';return true;
  }
  if(container.immediateFields&&container.advanceOnSave&&!state.editor.dirty){
    state.feedback=node.label+' retained.';moveSequence(model,state,1);return true;
  }
  const value=state.editor.draft;
  if(!storeFieldValue(model,state,node,value))return false;
  state.editor=null;state.digits='';
  const choice=choiceForValue(node,value),childId=choice?.nodeId||choice?.id;
  if(childId&&model.nodes[childId]?.children.length)pushNode(model,state,childId);
  else if(container.immediateFields&&container.advanceOnSave)moveSequence(model,state,1);
  else if(node.returnOnSave)back(model,state);
  return true;
}

export function setEmulatorText(model,previous,text){
  const state=clone(previous);if(!state.editor||!['text','number'].includes(state.editor.kind))return state;
  const node=model.nodes[state.editor.nodeId];state.editor.draft=clean(text).slice(0,node.maxLength||120);state.editor.dirty=true;state.feedback='';return state;
}
export function applyEmulatorEdit(model,previous){
  const state=clone(previous);
  if(!model.config.runtime?.onApplyEdit?.({model,state,node:currentNode(model,state),base:baseNode(model,state),frame:frame(state),helpers:runtimeHelpers(model,state)}))saveEditor(model,state);
  return state;
}

function pickerCharacters(node,editor){
  if(node.textMode==='galaxy-picker')return editor.characterMode===2?'':editor.characterMode===1?'abcdefghijklmnopqrstuvwxyz 0123456789.,-/()':'ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789.,-/()';
  return 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz 0123456789.,-/()';
}

function digitSelection(model,state,node,digits){
  const list=childrenFor(model,state,node),matches=list.filter(n=>n.code!=null&&(String(n.code)===digits||numberEquals(n.code,digits)));
  if(matches.length===1){state.digits='';pushNode(model,state,matches[0].id);return true;}
  const root=model.rootById[state.rootId];
  if(model.id==='galaxy-dimension'&&root.directMenuCodes!==false&&!/quick/i.test(root.id)&&/^\d{2}$/.test(digits)&&state.trail.length<=2){
    const targets=Object.values(model.nodes).filter(n=>n.address===digits&&/^\d{2}$/.test(n.address));
    const target=targets.find(n=>ancestorRoute(model,root,n.id));
    if(target){const next=openEmulatorNode(model,state,target.id);Object.assign(state,next);state.digits='';return true;}
  }
  state.digits='';state.feedback='That number is not a documented option at this screen. Use the scroll keys.';return false;
}

function immediateMenuDigit(model,state,node,key){
  state.digits=(state.digits+key).slice(0,8);
  const candidates=childrenFor(model,state,node).filter(child=>/^\d+$/.test(String(child.code))&&String(child.code).startsWith(state.digits));
  const exact=candidates.filter(child=>String(child.code)===state.digits);
  if(exact.length===1&&candidates.length===1){state.digits='';pushNode(model,state,exact[0].id);}
  else if(!candidates.length){state.digits='';state.feedback='That digit does not select a documented option here. Use the physical scroll keys.';}
}

function selectRecordDigits(model,state,scope,node,digits){
  const list=recordsFor(model,state,scope,node),match=list.find(r=>r.id===digits||numberEquals(r.id,digits));
  if(!match){state.feedback='That record is not fitted to this fictional panel.';state.digits='';return false;}
  frame(state).context[scope]=match.id;frame(state).cursor=list.indexOf(match);state.digits='';return true;
}

function toggleOmit(model,state,node){
  const address=frame(state).context.zone;if(!address)return;
  if(!state.zoneOmitEnabled[address]){state.feedback='This demo zone is not configured as omittable.';return;}
  const values=node.commitKey?state.draftOmissions:state.omittedZones;values[address]=!values[address];
  state.feedback=state.zoneNames[address]+(values[address]?' selected for omission.':' selected for inclusion.')+(node.commitKey?' Confirm to store.':'');
  if(!node.commitKey)addEvent(state,values[address]?'Zone omitted':'Zone reinstated',state.zoneNames[address],address);
  recordHistory(state,'omission',{zone:address,value:values[address]});
}

function executeAction(model,state,node){
  const action=node.action||'unsupported';
  if(node.requiresValue){
    const condition=node.requiresValue,required=model.nodes[condition.nodeId],stored=required?valueFor(model,state,required):null;
    const matches=condition.value===true?stored===true||/^(enabled?|on|yes)$/i.test(displayValue(required||{},stored)):JSON.stringify(stored)===JSON.stringify(condition.value);
    if(!matches){state.feedback='This action requires '+(required?.label||condition.nodeId)+' to be '+String(condition.value===true?'enabled':condition.value)+' in the simulated configuration.';state.confirm=null;return;}
  }
  if(action==='logout'){
    if(model.profile.exitChecks&&Object.values(state.zoneStates).some(v=>v!=='secure')){state.feedback='Restore the demo zones and tampers before leaving Installer mode.';state.confirm=null;return;}
    state.committedValues=clone(state.values);state.changed=false;state.loggedOut=true;stopTransient(state);model.config.runtime?.stop?.({model,state});state.feedback='Logged off. Simulated settings are retained.';addEvent(state,'Session ended');return;
  }
  if(action==='exit-programming'){stopTransient(state);state.trail=[rootFrame(state.rootId)];state.feedback='Programming closed. The simulated engineer remains logged on; use Log off ENGINEER to finish.';return;}
  if(action==='arm'||action==='part-arm'){
    const active=Object.entries(state.zoneStates).filter(([id,status])=>status!=='secure'&&!state.omittedZones[id]);
    if(active.length&&!node.force){state.feedback='Cannot set: '+active.map(([id])=>id+' '+state.zoneNames[id]).join(', ')+' is not secure.';state.confirm=null;return;}
    if(node.force){
      const blocked=active.find(([id])=>!state.zoneOmitEnabled[id]);
      if(blocked){state.feedback='Cannot force set: zone '+blocked[0]+' cannot be omitted.';state.confirm=null;return;}
      for(const [id] of active)state.omittedZones[id]=true;
    }
    state.armed=true;state.armingMode=action==='part-arm'?'Part set':'Full set';state.feedback=state.armingMode+' in the fictional panel. Exit timing is condensed in this emulator.';addEvent(state,state.armingMode);state.confirm=null;return;
  }
  if(action==='unset'||action==='disarm'){
    state.armed=false;state.armingMode='Unset';state.alarm=false;
    if(model.id!=='orisec-cp'||node.reinstateOnDisarm===true)for(const id of Object.keys(state.omittedZones))state.omittedZones[id]=false;
    state.feedback='Fictional panel unset.';addEvent(state,'Unset');state.confirm=null;return;
  }
  if(action==='cancel-exit'){state.armed=false;state.armingMode='Unset';state.feedback='Simulated setting cancelled.';state.confirm=null;return;}
  if(action==='chime'){state.chime=!state.chime;state.feedback='Chime '+(state.chime?'on.':'off.');addEvent(state,'Chime '+(state.chime?'on':'off'));state.confirm=null;return;}
  if(action==='reset'){
    if(Object.values(state.zoneStates).some(v=>v!=='secure')){state.feedback='Restore the demo detector or tamper before resetting.';state.confirm=null;return;}
    state.alarm=false;state.feedback='Simulated alarm reset.';addEvent(state,'Alarm reset');state.confirm=null;return;
  }
  if(action==='save'){state.committedValues=clone(state.values);state.changed=false;state.feedback='Simulated configuration committed.';state.confirm=null;return;}
  if(action==='print'){
    state.lastReport={title:node.reportTitle||node.label,text:[
      'FINDR — fictional '+model.profile.title+' panel',node.reportTitle||node.label,'Training data only. No real panel or printer is connected.','',
      'ZONE RECORDS',...state.records.zone.map(z=>z.id+' '+state.zoneNames[z.id]+' | '+state.zoneTypes[z.id]+' | '+state.zoneStates[z.id]+(state.omittedZones[z.id]?' | OMITTED':'')),
      '', 'CHANGED SETTINGS',...changesFor(model,state).map(c=>c.record+' | '+c.label+' = '+c.value),
      '', 'FICTIONAL EVENT LOG',...state.events.slice(0,50).map(e=>e.time+' '+e.label+' '+(e.zone||'')+' '+(e.details||'')),
    ].join('\n')};state.feedback='Local training report prepared below the keypad. Nothing was sent to a printer.';state.confirm=null;return;
  }
  state.feedback=node.resultText||'This operation needs hardware or behavior that has not been verified. No simulated result has been invented.';state.confirm=null;
}

function pressEditor(model,state,key){
  const editor=state.editor,node=model.nodes[editor.nodeId],nav=navigation(model);
  const forward=node.choiceNextKey||nav.choiceNextKey||'next',backward=node.choicePreviousKey||nav.choicePreviousKey||'previous';
  const direction=key===forward||key==='right'?1:-1;
  if(key===node.deleteKey&&['text','number'].includes(editor.kind)){editor.draft=String(editor.draft||'').slice(0,-1);editor.dirty=true;return;}
  if(editor.kind==='text'&&['galaxy-picker','orisec-picker'].includes(node.textMode)){
    const galaxyPicker=node.textMode==='galaxy-picker';
    if(key==='back'&&galaxyPicker){saveEditor(model,state);return;}
    if(key==='back'){state.editor=null;state.feedback='FINDR discarded the unconfirmed text draft. Use Apply text to store a helper edit; exact save/exit behavior still needs keypad verification.';return;}
    if(key==='details'&&galaxyPicker){editor.characterMode=(editor.characterMode+1)%3;editor.charIndex=0;if(editor.characterMode===2)state.feedback='The manual’s built-in word library is not reproduced. Press # again for the FINDR character strip.';return;}
    if(key==='backspace'||key==='star'&&galaxyPicker){editor.draft=String(editor.draft||'').slice(0,-1);editor.dirty=true;return;}
    const chars=pickerCharacters(node,editor),scroll=galaxyPicker?['next','previous']:['right','left'];
    if(scroll.includes(key)){editor.charIndex=wrap(editor.charIndex+(key===scroll[0]?1:-1),chars.length);return;}
    if(key==='enter'){
      if(!chars){state.feedback='Word-library selection is not yet reproduced.';return;}
      editor.draft=(String(editor.draft||'')+chars[editor.charIndex]).slice(0,node.maxLength||120);editor.dirty=true;return;
    }
    state.feedback='Use '+(galaxyPicker?'A / B':'left / right')+' to select a character, then Enter to add it. The character strip is a FINDR editing aid.';return;
  }
  if(editor.kind==='text'&&node.textMode==='telephone'){
    if(key==='previous'){editor.draft=String(editor.draft||'').slice(0,-1);editor.dirty=true;return;}
    if(key==='star'||key==='details'){editor.draft=((editor.dirty?String(editor.draft||''):'')+(key==='star'?'*':'#')).slice(0,node.maxLength||120);editor.dirty=true;return;}
  }
  if(key===node.saveKey||key==='enter'&&node.saveKey!=='back'){
    if(editor.kind==='choice'&&state.digits){const match=node.choices.find(c=>c.code!=null&&(String(c.code)===state.digits||numberEquals(c.code,state.digits)));if(!match){state.feedback='That value code is not documented for this field.';return;}editor.choiceIndex=node.choices.indexOf(match);editor.draft=match.value;}
    saveEditor(model,state);return;
  }
  if(key==='back'){
    if(node.saveKey==='back'){saveEditor(model,state);return;}
    state.editor=null;state.digits='';state.feedback='Edit cancelled; the stored value is unchanged.';return;
  }
  if(key==='backspace'||key==='star'&&node.textMode==='digits'){
    if(['text','number'].includes(editor.kind))editor.draft=String(editor.draft).slice(0,-1);else state.digits=state.digits.slice(0,-1);return;
  }
  if(editor.kind==='choice'){
    const toggles=node.choiceToggleKeys||nav.choiceToggleKeys||[];
    if(((node.choiceNextKey||nav.choiceNextKey)?[forward,backward,'change']:['next','previous','left','right','change']).includes(key)||toggles.includes(key)){
      editor.choiceIndex=wrap(editor.choiceIndex+(key==='change'||toggles.includes(key)?1:direction),node.choices.length);editor.draft=node.choices[editor.choiceIndex]?.value;editor.dirty=true;state.digits='';return;
    }
    if(/^\d$/.test(key)){
      state.digits=(state.digits+key).slice(0,8);const matches=node.choices.filter(c=>c.code!=null&&(String(c.code)===state.digits||numberEquals(c.code,state.digits)));
      if(matches.length===1){editor.choiceIndex=node.choices.indexOf(matches[0]);editor.draft=matches[0].value;editor.dirty=true;}
      return;
    }
  }
  if(editor.kind==='flags'){
    const keyCodes=node.keyChoiceCodes||{};
    if(keyCodes[key]) {
      const choice=node.choices.find(c=>String(c.code)===String(keyCodes[key])||c.id===keyCodes[key]||c.value===keyCodes[key]);
      if(choice){editor.draft[choice.id]=!editor.draft[choice.id];editor.dirty=true;editor.cursor=node.choices.indexOf(choice);}
      return;
    }
    if([forward,backward].includes(key)){editor.cursor=wrap(editor.cursor+direction,node.choices.length);return;}
    let choice=node.choices[editor.cursor];
    if(/^\d$/.test(key)){choice=node.choices.find(c=>String(c.code)===key);if(!choice){state.feedback='That digit is not a documented flag here.';return;}if(node.digitSelectOnly){editor.cursor=node.choices.indexOf(choice);return;}}
    if(/^\d$/.test(key)||['left','right','change','details','star','omit',...(node.flagToggleKeys||nav.flagToggleKeys||[])].includes(key)){if(choice){editor.draft[choice.id]=!editor.draft[choice.id];editor.dirty=true;}return;}
  }
  if(['number','text'].includes(editor.kind)){
    if(editor.kind==='number'&&key==='star'&&(node.min??0)<0){editor.draft=String(-Number(editor.draft||0));editor.dirty=true;return;}
    if(/^\d$/.test(key)){
      if(editor.kind==='text'&&!['digits','telephone'].includes(node.textMode)){state.feedback='Use the text-entry helper for this field. Its exact character-key sequence is not reproduced.';return;}
      const current=editor.dirty?String(editor.draft):'';editor.draft=(current+key).slice(0,node.maxLength||12);editor.dirty=true;
      if(node.autoCommitLength&&editor.draft.length===node.autoCommitLength)saveEditor(model,state);return;
    }
    if(editor.kind==='number'&&((node.choiceNextKey||nav.choiceNextKey)?[forward,backward]:['next','previous']).includes(key)){
      const n=Number(editor.draft||node.min||0)+direction*(node.step||1);editor.draft=String(Math.max(node.min??-999999,Math.min(node.max??999999,n)));editor.dirty=true;return;
    }
    if(key==='left'||key==='right'){state.feedback='Use the field helper to position the text cursor.';return;}
  }
}

export function pressEmulatorKey(model,previous,key){
  const state=clone(previous);state.steps++;state.feedback='';
  const nav=navigation(model);
  if(state.loggedOut){if(key==='enter'){state.loggedOut=false;state.trail=[rootFrame(state.rootId)];enterRootStart(model,state);state.feedback='Authorised demo access restored.';}else state.feedback='Confirm to reopen this authorised demo session.';return state;}
  if(state.confirm){
    if(key==='enter')executeAction(model,state,state.confirm);
    else if(['back','change','left'].includes(key)){state.confirm=null;state.feedback='Cancelled.';}
    return state;
  }
  if(!frame(state).selectorPending&&model.config.runtime?.onKey?.({model,state,key,node:currentNode(model,state),base:baseNode(model,state),frame:frame(state),helpers:runtimeHelpers(model,state)}))return state;
  if(state.editor){
    const container=baseNode(model,state),editNode=model.nodes[state.editor.nodeId];
    if(container.immediateFields&&key==='back'&&editNode.skipOnBack){moveSequence(model,state,1);state.feedback='Continued to the next test question.';return state;}
    if(container.immediateFields&&key===container.previousFieldKey&&!editNode.keyChoiceCodes?.[key]){moveSequence(model,state,-1);state.feedback='Previous programming field; the unconfirmed draft was discarded.';return state;}
    if(container.immediateFields&&key==='back'&&container.previousFieldKey!=='back'){back(model,state);state.feedback='Returned from programming; the unconfirmed draft was discarded.';return state;}
    if(nav.exitEditorToParent&&key==='back'&&editNode.saveKey!=='back'){back(model,state);state.feedback='Returned without saving the draft.';return state;}
    pressEditor(model,state,key);return state;
  }
  const f=frame(state),base=baseNode(model,state),node=currentNode(model,state);
  if(f.selectorPending){
    const selectorNode=model.nodes[f.selectorNodeId]||base;
    const scope=f.selectorPending,list=recordsFor(model,state,scope,selectorNode);
    if(/^\d$/.test(key)){state.digits=(state.digits+key).slice(0,8);return state;}
    if(key==='backspace'){state.digits=state.digits.slice(0,-1);return state;}
    const next=selectorNode.recordNextKey||nav.recordNextKey||'next',previousKey=selectorNode.recordPreviousKey||nav.recordPreviousKey||'previous';
    if(key===next||key===previousKey){f.cursor=wrap(f.cursor+(key===next?1:-1),list.length);state.digits='';return state;}
    if(key==='back'||key==='left'&&model.profile.leftIsBack){back(model,state);return state;}
    if(key==='enter'||key==='right'&&model.profile.rightIsEnter){
      if(state.digits&&!selectRecordDigits(model,state,scope,selectorNode,state.digits))return state;
      const selected=list[f.cursor];if(!selected){state.feedback='No fitted demo records in this list.';return state;}
      f.context[scope]=selected.id;
      const fieldSelector=f.selectorNodeId;delete f.selectorPending;delete f.selectorNodeId;f.cursor=0;
      if(fieldSelector){f.fieldRecordSelected=fieldSelector;openSequenceField(model,state,base);}
      else{f.selectorDone=true;activate(model,state,base);}
      continueJump(model,state);return state;
    }
    return state;
  }
  if(key==='sound-help'){state.feedback=node.summary||'Use the source notes for this screen.';return state;}
  const testResult=handleExtendedTestKey(model,state,node,key,f);
  if(testResult?.handled){if(testResult.exit)back(model,state);return state;}
  if(base.sequentialFields&&base.immediateFields){
    if(key===base.previousFieldKey){moveSequence(model,state,-1);return state;}
    if((node.question||node.skipOnBack)&&key==='back'){moveSequence(model,state,1);return state;}
    if(key==='enter'){
      if(node.question||node.mode==='menu')pushNode(model,state,node.id);
      else if(!node.nextFieldKey||node.nextFieldKey==='enter')moveSequence(model,state,1);
      else state.feedback='Use '+(model.profile.keys.find(k=>k.id===node.nextFieldKey)?.label||node.nextFieldKey)+' to continue from this screen.';
      return state;
    }
    if(key==='back'){back(model,state);return state;}
  }
  if(base.sequentialFields){
    const scope=base.selector||base.scope,records=recordsFor(model,state,scope,base);
    if(key==='next'||key==='previous'){
      if(base.scrollFields||!scope){f.fieldIndex=wrap((f.fieldIndex||0)+(key==='next'?1:-1),base.children.length);state.digits='';return state;}
      const index=records.findIndex(r=>r.id===f.context[scope]);f.context[scope]=records[wrap(index+(key==='next'?1:-1),records.length)]?.id;state.digits='';return state;
    }
    if(key==='enter'&&!state.digits){f.fieldIndex=wrap((f.fieldIndex||0)+1,base.children.length);return state;}
    if(key==='reset-key'&&base.previousFieldKey==='reset-key'){f.fieldIndex=wrap((f.fieldIndex||0)-1,base.children.length);return state;}
    if(key==='change'){if(editableModes.has(node.mode))startEditor(model,state,node);else if(node.children.length)pushNode(model,state,node.id);else state.feedback='This field has no verified editor yet. See its source note.';return state;}
    if(/^\d$/.test(key)&&node.changeKey==='digits'){startEditor(model,state,node);pressEditor(model,state,key);return state;}
    if(/^\d$/.test(key)){state.digits=(state.digits+key).slice(0,8);return state;}
    if(key==='enter'&&state.digits){selectRecordDigits(model,state,scope,base,state.digits);return state;}
  }
  if(key==='backspace'){state.digits=state.digits.slice(0,-1);return state;}
  // Pyronix NO/B advance/reverse the main questions. They are distinct from
  // the left/right keys used to choose a record or change a value.
  if(node.mode==='menu'&&nav.questionMenus){
    if(key===(node.menuNextKey||nav.menuNextKey)){
      const count=childrenFor(model,state,node).length;
      if(node.menuWrap===false&&f.cursor>=count-1&&state.trail.length>1)back(model,state);
      else{f.cursor=wrap(f.cursor+1,count);state.digits='';}
      return state;
    }
    if(key===(node.menuPreviousKey||nav.menuPreviousKey)){f.cursor=node.menuWrap===false?Math.max(0,f.cursor-1):wrap(f.cursor-1,childrenFor(model,state,node).length);state.digits='';return state;}
  }
  if(key==='back'){
    if(state.digits){state.digits='';return state;}
    if(node.mode==='omit'&&node.commitKey)state.feedback='Unconfirmed omit changes discarded.';
    back(model,state);return state;
  }
  if(key==='reset-key'&&model.id==='texecom-premier-elite'){
    stopTransient(state);state.trail=[rootFrame(state.rootId)];state.feedback='Returned from programming. Engineer access remains granted; choose Log off ENGINEER to finish.';return state;
  }
  if(node.mode==='log'&&key===node.logSummaryKey){state.details=false;state.feedback='Showing the event summary.';return state;}
  if(key==='logout'){state.confirm={action:'logout',label:'Log off?'};return state;}
  if(node.mode==='omit'){
    if(node.commitKey&&!state.draftOmissions)state.draftOmissions=clone(state.omittedZones);
    if((node.toggleKeys||[]).includes(key)){
      if(state.digits&&!selectRecordDigits(model,state,'zone',node,state.digits))return state;toggleOmit(model,state,node);return state;
    }
    if(key===node.commitKey){state.omittedZones=clone(state.draftOmissions);state.draftOmissions=null;addEvent(state,'Omit choices stored');back(model,state);state.feedback='Omit choices stored in the fictional panel.';return state;}
    if(key==='enter'&&node.enterStartsSetting){state.confirm={action:'arm',label:'Start setting?'};return state;}
    if(key===node.recordAdvanceKey){const zones=recordsFor(model,state,'zone',node),index=zones.findIndex(z=>z.id===f.context.zone);f.context.zone=zones[wrap(index+1,zones.length)]?.id;state.digits='';return state;}
  }
  if(node.mode==='zones'&&node.diagnosticOmit&&key==='omit'){
    const address=f.context.zone;state.diagnosticOmissions[address]=!state.diagnosticOmissions[address];state.feedback='Diagnostic '+(state.diagnosticOmissions[address]?'disable':'restore')+' for '+address+'. It is cleared when you leave this screen.';return state;
  }
  if(node.mode==='zones'&&(own(node,'detailsKey')?key===node.detailsKey:['details','left','right','area','chime'].includes(key))){state.details=!state.details;return state;}
  if(node.mode==='log'){
    if(node.detailsKey?key===node.detailsKey:['details','right','left','area'].includes(key)){state.details=key==='left'&&!node.detailsKey?false:!state.details;return state;}
    const next=node.logNextKey||nav.logNextKey||'next',prev=node.logPreviousKey||nav.logPreviousKey||'previous';
    if(key===next||key===prev){
      const direction=(key===next?1:-1)*((node.reverseLogScroll??model.profile.reverseLogScroll)?-1:1);state.eventIndex=Math.max(0,Math.min(eventsFor(state,node).length-1,state.eventIndex+direction));return state;
    }
  }
  if(node.mode==='outputs'){
    const outputs=Object.keys(state.outputStates);
    if(node.outputToggleCodes?.[key]){const output=node.outputToggleCodes[key];if(own(state.outputStates,output)){state.outputStates[output]=!state.outputStates[output];state.feedback=output+(state.outputStates[output]?' on':' off')+' in this simulation.';recordHistory(state,'output',{output,value:state.outputStates[output]});}return state;}
    const next=node.recordNextKey||nav.recordNextKey||'next',prev=node.recordPreviousKey||nav.recordPreviousKey||'previous';
    if(key===next||key===prev){f.cursor=wrap(f.cursor+(key===next?1:-1),outputs.length);if(node.selector==='output')f.context.output=recordsFor(model,state,'output',node)[f.cursor]?.id;return state;}
    if((node.toggleKeys||['left','right','enter','change']).includes(key)){
      const output=outputs[f.cursor];if(output){state.outputStates[output]=!state.outputStates[output];state.feedback=output+(state.outputStates[output]?' on':' off')+' in this simulation.';recordHistory(state,'output',{output,value:state.outputStates[output]});}return state;
    }
  }
  if(node.mode==='walk'){
    if(!state.walk.running&&node.selectedOnly){
      const zones=recordsFor(model,state,'zone',node),selected=zones[wrap(f.cursor,zones.length)];
      if(key==='next'||key==='previous'){f.cursor=wrap(f.cursor+(key==='next'?1:-1),zones.length);return state;}
      if(['details','star','right'].includes(key)){if(selected)state.walk.selected=state.walk.selected.includes(selected.id)?state.walk.selected.filter(id=>id!==selected.id):[...state.walk.selected,selected.id];return state;}
      if(key==='enter'){
        if(!state.walk.selected.length){state.feedback='Select a demo zone before starting the walk test.';return state;}
        state.walk.running=true;state.walk.allowed=[...state.walk.selected];state.feedback='Walk test running. Activate a selected demo detector.';return state;
      }
    }
    if(key==='area'||key==='details'){state.walk.view=state.walk.view?0:1;return state;}
    if(key==='enter'&&(node.finishKey==='enter'||model.profile.walkStopWithEnter)){state.walk.running=false;back(model,state);state.feedback='Walk test stopped. '+state.walk.hits.length+' demo zones registered.';return state;}
    if(key==='next'||key==='previous'){f.cursor=wrap(f.cursor+(key==='next'?1:-1),state.records.zone.length);return state;}
  }
  if(node.mode==='walk-results'&&(key==='next'||key==='previous')){const list=node.tested?state.walk.hits:state.records.zone.map(z=>z.id).filter(id=>!state.walk.hits.includes(id));f.cursor=wrap(f.cursor+(key==='next'?1:-1),list.length);return state;}
  if(['zones','omit'].includes(node.mode)){
    const list=recordsFor(model,state,'zone',node),index=list.findIndex(r=>r.id===f.context.zone);
    const next=node.recordNextKey||nav.recordNextKey||'next',prev=node.recordPreviousKey||nav.recordPreviousKey||'previous';
    if(key===next||key===prev){f.context.zone=list[wrap(index+(key===next?1:-1),list.length)]?.id;state.digits='';return state;}
    if(/^\d$/.test(key)){
      if(node.numericSelection===false||node.numericSelection===undefined&&model.id==='orisec-cp'){state.feedback='Use the scroll keys here; numeric record selection is not verified for this screen.';return state;}
      state.digits=(state.digits+key).slice(0,8);
      const width=model.profile.zoneDigits;if(width&&state.digits.length===width)selectRecordDigits(model,state,'zone',node,state.digits);return state;
    }
    if(key==='enter'&&state.digits){selectRecordDigits(model,state,'zone',node,state.digits);return state;}
  }
  if(node.mode==='action'){
    if(key==='enter'||key==='right'&&model.profile.rightIsEnter){state.confirm={...node,label:node.confirmLabel||node.label+'?'};return state;}
  }
  if(node.mode==='status'){
    const next=node.choiceNextKey||nav.choiceNextKey||'next',prev=node.choicePreviousKey||nav.choicePreviousKey||'previous';
    if(key===next||key===prev){f.cursor=wrap(f.cursor+(key===next?1:-1),(node.statusRows||[]).length);return state;}
  }
  if(editableModes.has(node.mode)){
    if(node.changeKey==='digits'&&/^\d$/.test(key)){startEditor(model,state,node);pressEditor(model,state,key);return state;}
    if(key===(node.changeKey||'enter')||key==='enter'){startEditor(model,state,node);return state;}
  }
  if(node.mode==='menu'){
    const children=childrenFor(model,state,node);
    if(node.shortcutKeys?.[key]&&model.nodes[node.shortcutKeys[key]]){pushNode(model,state,node.shortcutKeys[key]);return state;}
    const functionCode={details:model.id==='texecom-premier-elite'?'Part':'#','reset-key':'Reset',omit:'Omit',chime:'Chime',area:'Area',next:'A',previous:'B'}[key];
    const functionNode=functionCode&&children.find(c=>c.code===functionCode);
    if(functionNode){pushNode(model,state,functionNode.id);return state;}
    const next=node.menuNextKey||nav.menuNextKey||'next',prev=node.menuPreviousKey||nav.menuPreviousKey||'previous';
    if(key===next||key===prev){f.cursor=wrap(f.cursor+(key===next?1:-1),children.length);state.digits='';return state;}
    if(/^\d$/.test(key)){
      if(node.numericSelection===false){state.feedback='This menu is selected by scrolling; numeric shortcuts are not verified here.';return state;}
      if(!children.some(c=>/^\d+$/.test(String(c.code)))&&model.id!=='galaxy-dimension'){state.feedback='This menu is selected by scrolling, not by a chapter number.';return state;}
      if(node.directNumericMenus??nav.directNumericMenus){immediateMenuDigit(model,state,node,key);return state;}
      state.digits=(state.digits+key).slice(0,8);return state;
    }
    if(key==='enter'||key==='right'&&model.profile.rightIsEnter){
      if(state.digits)digitSelection(model,state,node,state.digits);else if(children[f.cursor])pushNode(model,state,children[f.cursor].id);return state;
    }
    if(key==='left'&&model.profile.leftIsBack){back(model,state);return state;}
  }
  if(node.mode==='info'&&key==='enter'){state.feedback='The menu location is documented; its interactive behavior is not verified yet. Read the source note here.';return state;}
  state.feedback='This key has no documented action on this emulator screen.';return state;
}

export function setEmulatorZone(model,previous,address,status){
  if(!own(previous.zoneStates,address)||!['secure','active','tamper'].includes(status))return previous;
  const state=clone(previous),old=state.zoneStates[address];state.zoneStates[address]=status;
  if(old===status)return state;
  const previousHits=state.walk.hits.length,customWalk=updateExtendedWalk(state,address,old,status);
  if(!customWalk&&state.walk.running&&state.walk.allowed.includes(address)&&status==='active'&&!state.walk.hits.includes(address))state.walk.hits.push(address);
  if(state.armed&&status!=='secure'&&!state.omittedZones[address]&&!state.diagnosticOmissions[address]){state.alarm=true;addEvent(state,status==='tamper'?'Tamper alarm':'Intruder alarm',state.zoneNames[address],address);}
  else addEvent(state,status==='secure'?'Zone restored':status==='tamper'?'Zone tamper':'Zone active',state.zoneNames[address],address);
  state.feedback=state.zoneNames[address]+': '+status+(state.walk.hits.length>previousHits?' · registered in walk test':customWalk&&state.walk.running&&status==='active'&&state.walk.allowed.includes(address)?' · restore this input to complete its test':'')+'.';
  model.config.runtime?.onZone?.({model,state,address,status,old,previous});return state;
}

export function restoreEmulatorState(model,saved){
  const state=createEmulatorState(model,{rootId:saved?.rootId});
  if(!saved||saved.schemaVersion!==1||saved.profileId!==model.id)return state;
  for(const key of ['zoneStates','zoneTypes','zoneNames','zoneOmitEnabled','omittedZones'])for(const id of Object.keys(state[key]))if(own(saved[key],id)){
    const value=saved[key][id];if(key==='zoneStates'&&!['secure','active','tamper'].includes(value))continue;
    if(['zoneTypes','zoneNames'].includes(key)&&typeof value!=='string')continue;
    state[key][id]=['zoneOmitEnabled','omittedZones'].includes(key)?value===true:typeof value==='string'?value.slice(0,120):value;
  }
  const areaIds=new Set(['A','B','C','D',...Object.values(state.zoneAreas).flatMap(value=>Object.keys(value)),...Object.values(model.nodes).filter(node=>node.bind==='zoneAreas').flatMap(node=>(node.choices||[]).flatMap(choice=>[String(choice.id??''),String(choice.value??'')]).filter(Boolean))]);
  for(const id of Object.keys(state.zoneAreas))if(saved.zoneAreas?.[id]&&typeof saved.zoneAreas[id]==='object'&&!Array.isArray(saved.zoneAreas[id]))state.zoneAreas[id]=Object.fromEntries(Object.entries(saved.zoneAreas[id]).filter(([area])=>areaIds.has(area)).map(([area,enabled])=>[area,enabled===true]));
  for(const field of ['values','committedValues'])for(const [key,value] of Object.entries(saved[field]||{})){
    const [id,scope,record]=key.split('|'),node=model.nodes[id]||model.valueNodes[id];if(!node||!editableModes.has(node.mode))continue;
    if(scope!=='system'&&!(state.records[scope]||[]).some(r=>r.id===record))continue;
    if(node.mode==='choice'&&!choiceForValue(node,value))continue;if(['number','text'].includes(node.mode)&&validateDraft(node,value))continue;
    if(node.mode==='flags'&&(!value||typeof value!=='object'||Array.isArray(value)))continue;
    state[field][key]=clone(value);
  }
  for(const key of ['armed','alarm','chime','changed'])state[key]=saved[key]===true;
  state.armingMode=state.armed?saved.armingMode==='Part set'?'Part set':'Full set':'Unset';
  if(Array.isArray(saved.events))state.events=saved.events.slice(0,state.eventCapacity||150).filter(e=>e&&typeof e.label==='string').map(e=>({id:clean(e.id).slice(0,100),label:clean(e.label).slice(0,120),time:clean(e.time).slice(0,40),details:clean(e.details).slice(0,240),zone:clean(e.zone).slice(0,120),category:clean(e.category).slice(0,40),logs:Array.isArray(e.logs)?e.logs.filter(x=>typeof x==='string').slice(0,5):[],fixture:e.fixture===true,simulated:e.simulated===true}));
  model.config.runtime?.restore?.({model,state,saved});
  state.feedback='Resumed this fictional panel’s saved settings. Tests are stopped and unconfirmed edits are discarded.';
  return state;
}

function pathFor(model,state){return state.trail.map(f=>f.id.startsWith('@')?{id:f.id,label:model.rootById[state.rootId].label}:{id:f.id,label:model.nodes[f.id]?.label||f.id}).filter(Boolean);}
function changesFor(model,state){return Object.entries(state.values).map(([key,value])=>{const [id,scope,record]=key.split('|'),node=model.nodes[id]||model.valueNodes[id];return {key,nodeId:node?.id||id,label:node?.label||id,value:node?displayValue(node,value):String(value),record:scope==='system'?'System':scope+' '+record};}).slice(-100);}

export function emulatorView(model,state){
  const f=frame(state),base=baseNode(model,state),node=currentNode(model,state),children=childrenFor(model,state,base),scope=f.selectorPending||currentScope(model,state,node),records=recordsFor(model,state,scope,node),record=currentRecord(model,state,scope);
  const zoneId=f.context.zone||state.records.zone[0]?.id,zone=zoneId?{address:zoneId,name:state.zoneNames[zoneId],type:state.zoneTypes[zoneId],status:state.zoneStates[zoneId],omitted:(state.draftOmissions||state.omittedZones)[zoneId],eligible:state.zoneOmitEnabled[zoneId],reading:model.profile.readings?.[state.zoneStates[zoneId]],diagnosticOmitted:Boolean(state.diagnosticOmissions[zoneId])}:null;
  let mode=node.mode,heading=node.label,lines=[],note='Fictional panel · manual-based menu behavior';
  const value=editableModes.has(node.mode)?valueFor(model,state,node):null,selected=children[wrap(f.cursor,children.length)]||null;
  const testScreen=extendedTestScreen(model,state,node,f);
  if(state.loggedOut){mode='logged-out';lines=['Session ended','Confirm to reopen'];}
  else if(state.confirm){mode='confirm';heading=state.confirm.label;lines=[state.confirm.label,'Confirm / Back'];}
  else if(f.selectorPending){mode='selector';heading='Select '+f.selectorPending;const r=records[wrap(f.cursor,records.length)];lines=[heading,r?r.id+' '+r.label:'No fitted records'];note='Choose the fictional '+f.selectorPending+' record before changing its settings.';}
  else if(testScreen){lines=testScreen.lines;note=testScreen.note||note;}
  else if(state.editor){
    const e=state.editor,editNode=model.nodes[e.nodeId];mode=e.kind;heading=editNode.label;
    if(e.kind==='flags'){const c=editNode.choices[wrap(e.cursor,editNode.choices.length)];lines=[editNode.label,c?(c.code!=null?c.code+' ':'')+c.label+' '+(e.draft[c.id]?'ON':'OFF'):'No documented flags'];}
    else if(e.kind==='choice'){const c=editNode.choices[e.choiceIndex];lines=[editNode.label,c?(c.code!=null?c.code+' ':'')+c.label:'No documented choices'];}
    else lines=[editNode.label,String(e.draft??'')||'_'];
    note=(editNode.saveKey==='back'?model.profile.backLabel:model.profile.enterLabel)+' accepts this simulated edit.'+(editNode.mode==='text'&&!['digits','telephone'].includes(editNode.textMode)?' Use the text-entry helper; character-key sequences are not reproduced.':'');
    if(['galaxy-picker','orisec-picker'].includes(editNode.textMode)){
      const chars=pickerCharacters(editNode,e),character=chars[e.charIndex];
      lines=[String(e.draft||'_'),character?'['+(character===' '?'space':character)+'] Enter adds':'Word library: gap'];
      note='FINDR character strip · '+(editNode.textMode==='galaxy-picker'?'A/B selects, ent adds, * erases, # changes mode, esc saves.':'Left/right selects; Enter adds. Apply text stores the helper edit; the panel’s exact save/exit sequence needs verification.');
    }
  }
  else if(base.sequentialFields&&node.mode!=='status'){mode='fields';lines=[(record?record.id+' ':'')+node.label,node.question?model.profile.enterLabel+' to select':displayValue(node,value)];note=base.immediateFields?model.profile.enterLabel+' continues; '+model.profile.backLabel+' returns.':'Scroll changes '+scope+'; Yes advances fields; No edits.';}
  else if(node.mode==='menu'){lines=navigation(model).questionMenus?[selected?.label||node.label,'YES to select']:[model.id==='texecom-premier-elite'?'YES to Select:-':node.label,selected?(selected.code!=null?selected.code+' ':'')+selected.label:'No available options'];}
  else if(editableModes.has(node.mode)){lines=[node.label,displayValue(node,value)];note=(node.changeKey==='change'?'No':model.profile.enterLabel)+' edits this field.';}
  else if(node.mode==='zones'){
    lines=zone?[zone.address+' '+zone.type,(node.resistanceAlways||state.details)&&node.showResistance!==false?(zone.reading||'Demo reading')+(model.profile.rioVoltage?' / '+model.profile.rioVoltage:''):zone.name+' '+(zone.diagnosticOmitted?'DISABLED':model.profile.statusLabels?.[zone.status]||zone.status)]:['No demo zones',''];
    note=node.showResistance===false?'Fictional input status. No resistance reading is shown for this device.':/^Fictional /i.test(model.profile.circuit||'')?model.profile.circuit:'Fictional '+(model.profile.circuit||'detector circuit')+' readings.';
  }
  else if(node.mode==='omit'){
    if(!zone)lines=['No eligible zones',''];
    else if(model.id==='galaxy-dimension')lines=[zone.address+' '+zone.type.toUpperCase(),zone.omitted?'OMITTED ENT=SET':'#=OMIT ENT=SET'];
    else if(model.id==='texecom-premier-elite')lines=['Zone'+(zone.omitted?'*':' ')+zone.address+(zone.eligible?'*':' '),zone.omitted?'is Omitted':zone.name];
    else if(model.id==='scantronic-ion')lines=['Omit Zones',zone.address+' '+zone.name+' '+(zone.omitted?'O':'I')];
    else if(model.id==='menvier-mseries')lines=[zone.address+(zone.omitted?' is Omitted':' is Armed'),zone.name];
    else if(model.id==='pyronix-enforcer')lines=['Omit Input ['+zone.address+']',zone.name+' '+(zone.omitted?'Yes':'No')];
    else lines=['Omit zones',zone.address+' '+zone.name+' '+(zone.eligible?zone.omitted?'✓':'×':'--')];
    note='Omission affects the fictional zone; it does not power off a device.';
  }
  else if(node.mode==='log'){const event=eventsFor(state,node)[state.eventIndex];lines=event?[event.time+' '+event.label,state.details?event.details:event.zone||event.details]:['No demo events',''];note='Fictional event history, including changes made in this emulator.';}
  else if(node.mode==='walk'){
    if(node.selectedOnly&&!state.walk.running){const z=state.records.zone[wrap(f.cursor,state.records.zone.length)];lines=['Selected Zones',z?z.id+' '+state.zoneNames[z.id]+' '+(state.walk.selected.includes(z.id)?'✓':'—'):'None'];}
    else{const remaining=state.walk.allowed.filter(id=>!state.walk.hits.includes(id));lines=[state.walk.running?'Walk test running':'Walk test stopped',state.walk.view?remaining.length+' zones untested':state.walk.hits.length+' of '+state.walk.allowed.length+' tested'];}
    note='Activate demo detectors to change the test results.';
  }
  else if(node.mode==='walk-results'){const list=node.tested?state.walk.hits:state.records.zone.map(z=>z.id).filter(id=>!state.walk.hits.includes(id));lines=[node.label,list[wrap(f.cursor,list.length)]||'None'];}
  else if(node.mode==='outputs'){const output=Object.keys(state.outputStates)[f.cursor];lines=[node.label,output?output+' '+(state.outputStates[output]?'ON':'OFF'):'No outputs'];note='Demo output test. Leaving the screen turns all test outputs off.';}
  else if(node.mode==='action'){lines=[node.label,'Confirm to select'];note=node.evidenceNote||'This command affects only the fictional panel.';}
  else if(node.mode==='status'){const row=node.statusRows?.[f.cursor];lines=row?[row.label,String(row.value??'FINDR DEMO')]:node.displayLines||[node.label,'FINDR DEMO'];note=node.evidenceNote||'Fictional status display; no live hardware readings.';}
  else{lines=node.displayLines||[node.label,'Behavior not verified'];note=node.evidenceNote||node.summary||'Menu location is sourced; exact interaction is still to be verified.';}
  if(state.digits&&!state.confirm&&!state.loggedOut&&!testScreen)lines=[heading,'Selection: '+state.digits];
  const path=pathFor(model,state),sourceRefs=node.sourceRefs||[],conditions=[...new Set(state.trail.flatMap(f=>model.nodes[f.id]?.conditions||[]))],notes=[...(node.notes||[])];
  if(node.evidenceNote)notes.push(node.evidenceNote);if(model.config.notes)notes.push(...model.config.notes);
  const editor=state.editor?{...clone(state.editor),min:node.min,max:node.max,maxLength:node.maxLength,minLength:node.minLength,format:node.format,textMode:node.textMode,units:node.units,choices:clone(node.choices||[]),character:['galaxy-picker','orisec-picker'].includes(node.textMode)?pickerCharacters(node,state.editor)[state.editor.charIndex]||null:null}:null;
  const view={screen:{heading,lines:lines.map(clean),note},node,children:children.map(n=>({id:n.id,label:n.label,code:n.code})),selected:selected?{id:selected.id,label:selected.label,code:selected.code}:null,cursor:f.cursor,path,mode,rootId:state.rootId,feedback:state.feedback,
    editor,setting:editableModes.has(node.mode)?{value,label:displayValue(node,value),key:valueKey(model,state,node),kind:node.mode}:null,
    records,record:f.selectorPending?records[wrap(f.cursor,records.length)]||null:record,context:{...f.context},zone,outputStates:{...state.outputStates},walk:clone(state.walk),
    panel:{armed:state.armed,armingMode:state.armingMode,alarm:state.alarm,chime:state.chime},changes:changesFor(model,state),lastReport:state.lastReport||null,
    evidence:{status:node.mode==='info'?'reference-only':node.evidenceNote?'simulation':'documented',sourceRefs,conditions,notes},stats:model.stats};
  if(!state.loggedOut&&!state.confirm&&!f.selectorPending){
    const screen=model.config.runtime?.screen?.({model,state,node,base,frame:f,view});
    if(screen)view.screen={heading:clean(screen.heading??view.screen.heading),lines:(screen.lines||view.screen.lines).map(clean),note:clean(screen.note??view.screen.note)};
  }
  return view;
}
