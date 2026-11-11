// Source-scoped XFP training. All inputs, readings and connected devices are fictional.
const copy=v=>structuredClone(v);
const list=v=>Array.isArray(v)?v:[];
const range=(max,start=1)=>Array.from({length:max-start+1},(_,i)=>i+start);
const digits={UP:'1',ACCEPT:'2',DOWN:'3',ESCAPE:'4'};
const bounded=(v,min,max,fallback=min)=>Number.isInteger(v)&&v>=min&&v<=max?v:fallback;
export function buildXfpModel(data,{variant='32'}={}){
 const selected=data.variants.find(v=>v.id===String(variant));if(!selected)throw Error('Unknown XFP cabinet.');
 return {...copy(data),...copy(selected),variant:selected.id,id:'xfp',nodesById:Object.fromEntries(data.nodes.map(n=>[n.id,copy(n)]))};
}
function record(s,text){s.history.unshift({text,sequence:++s.eventSequence});s.history=s.history.slice(0,150);}
function result(s,ok,message=''){s.lastAction={ok,message};s.message=message;return s;}
function deviceEnabled(s,d){return !s.disabled.devices.includes(d.id)&&!s.disabled.zones.includes(d.zone);}
function root(s){return 'root'+s.accessLevel;}
export function createXfpState(model,{scenarioId='normal'}={}){
 const devices=copy(model.fixture.devices.filter(d=>d.loop<=model.loopCount));
 let s={schemaVersion:1,variant:model.variant,scenarioId,accessLevel:1,keySwitch:false,coverOpen:false,nvmUnlocked:false,mode:'home',nodeId:null,menuId:'root1',selection:0,stack:[],editor:null,devices,connected:copy(devices),disabled:{devices:[],zones:[],sounders:[],outputs:[],relays:[]},walkZones:[],activeTest:null,monitorRestore:null,settings:{code2:'3333',code3:'4444',commsMode:'Repeater',panelNumber:1,dst:'Enabled',sounderMode:'Globally',faultRelay:'Enabled',outputDelays:'Disabled',earthMonitoring:'Enabled',hour:12,minute:0,day:1,month:1,year:2026,dayHour:8,dayMinute:0,nightHour:18,nightMinute:0},networkCard:false,inputs:{fire:false,missing:false,earth:false},fireLatched:false,sounders:false,buzzer:false,alarmCounter:0,history:[],eventSequence:0,more:false,message:'Fictional training site ready.',lastAction:{ok:true},testPulse:false};
 return scenario(model,s,scenarioId);
}
function scenario(model,s,id){
 if(!model.scenarios.some(x=>x.id===id))id='normal';s.scenarioId=id;s.inputs={fire:id==='fire',missing:id==='missing',earth:id==='earth'};s.fireLatched=id==='fire';s.sounders=id==='fire';s.buzzer=['fire','missing','earth'].includes(id);s.alarmCounter=id==='fire'?1:0;
 if(id==='new-device')s.connected.push(copy(model.fixture.newDevice));if(id==='missing')s.connected=s.connected.filter(d=>d.id!=='1:1');record(s,'Loaded fictional scenario: '+id);return s;
}
export function loadXfpScenario(model,state,id){return createXfpState(model,{scenarioId:id});}
function cleanTemporary(s){if(s.monitorRestore){if(!s.monitorRestore.wasDisabled)s.disabled.devices=s.disabled.devices.filter(id=>id!==s.monitorRestore.id);s.monitorRestore=null;}s.activeTest=null;s.testPulse=false;}
export function leaveXfp(model,state){const s=copy(state);cleanTemporary(s);return s;}
export function restoreXfpState(model,saved){
 const s=createXfpState(model);if(!saved||saved.variant!==model.variant||saved.schemaVersion!==1)return s;
 // Restore durable configuration defensively; transient forms may contain uncommitted edits.
 const validDevice=d=>d&&Number.isInteger(d.loop)&&d.loop>=1&&d.loop<=model.loopCount&&Number.isInteger(d.address)&&d.address>=1&&d.address<=126&&d.id===d.loop+':'+d.address&&(!d.input||Number.isInteger(d.zone)&&d.zone>=1&&d.zone<=model.zoneCount);
 for(const name of ['devices','connected'])if(Array.isArray(saved[name])){const seen=new Set();s[name]=saved[name].filter(d=>validDevice(d)&&!seen.has(d.id)&&seen.add(d.id)).map(copy);}
 for(const name of ['coverOpen','nvmUnlocked','keySwitch','networkCard','fireLatched','sounders','buzzer','more'])if(typeof saved[name]==='boolean')s[name]=saved[name];
 s.accessLevel=bounded(saved.accessLevel,1,3,1);if(s.accessLevel===2&&!s.keySwitch)s.accessLevel=1;
 for(const [k,v]of Object.entries(s.settings)){const got=saved.settings?.[k];if(k.startsWith('code')){if(typeof got==='string'&&/^[1-4]{4}$/.test(got))s.settings[k]=got;}else if(typeof v==='string'){const choices={commsMode:['Repeater','Network'],dst:['Enabled','Disabled'],sounderMode:['Globally','Individually'],faultRelay:['Enabled','Disabled'],outputDelays:['Enabled','Disabled'],earthMonitoring:['Enabled','Disabled']};if(choices[k]?.includes(got))s.settings[k]=got;}else if(Number.isInteger(got)){const bounds=k==='panelNumber'?[1,8]:k==='year'?[2020,2099]:k==='month'?[1,12]:k==='day'?[1,31]:k.toLowerCase().includes('minute')?[0,59]:[0,23];s.settings[k]=bounded(got,...bounds,v);}}
 for(const key of ['zones','sounders','outputs','relays'])s.disabled[key]=[...new Set(list(saved.disabled?.[key]).filter(v=>Number.isInteger(v)&&v>=1&&v<=(key==='zones'?model.zoneCount:key==='relays'?3:16)))];
 s.disabled.devices=[...new Set(list(saved.disabled?.devices).filter(id=>s.devices.some(d=>d.id===id)))];
 if(saved.monitorRestore&&!saved.monitorRestore.wasDisabled)s.disabled.devices=s.disabled.devices.filter(id=>id!==saved.monitorRestore.id);
 s.walkZones=[...new Set((Array.isArray(saved.walkZones)?saved.walkZones:[]).filter(v=>Number.isInteger(v)&&v>=1&&v<=model.zoneCount))];
 for(const k of Object.keys(s.inputs))if(typeof saved.inputs?.[k]==='boolean')s.inputs[k]=saved.inputs[k];
 s.history=(Array.isArray(saved.history)?saved.history:[]).filter(e=>typeof e?.text==='string').slice(0,150).map(e=>({text:e.text.slice(0,400),sequence:bounded(e.sequence,0,1e9,0)}));s.eventSequence=bounded(saved.eventSequence,0,1e9,0);s.alarmCounter=bounded(saved.alarmCounter,0,1e9,0);s.scenarioId=model.scenarios.some(x=>x.id===saved.scenarioId)?saved.scenarioId:'normal';
 if(['menu','form','code','lamps'].includes(saved.mode)&&model.nodesById[saved.menuId]&&(!saved.nodeId||model.nodesById[saved.nodeId])&&!saved.monitorRestore&&!saved.activeTest){
  s.mode=saved.mode;s.menuId=saved.menuId;s.nodeId=saved.nodeId;s.selection=bounded(saved.selection,0,100,0);s.stack=list(saved.stack).filter(v=>model.nodesById[v?.menuId]?.children).slice(0,10).map(v=>({menuId:v.menuId,selection:bounded(v.selection,0,100,0)}));
  const e=saved.editor;if(e&&typeof e==='object'&&Number.isInteger(e.stage)&&e.stage>=0&&e.stage<=4&&Number.isInteger(e.index)&&e.index>=0&&e.index<=150&&Number.isInteger(e.addressIndex)&&e.addressIndex>=0&&e.addressIndex<=126&&(e.loop==='all'||Number.isInteger(e.loop)&&e.loop>=1&&e.loop<=model.loopCount)&&Number.isInteger(e.zone)&&e.zone>=1&&e.zone<=model.zoneCount&&typeof e.digits==='string'&&/^[1-4]{0,4}$/.test(e.digits)){s.editor=copy(e);s.editor.pending=list(e.pending).filter(validDevice).map(copy);}else if(saved.mode!=='menu'){s.mode='home';s.nodeId=null;s.editor=null;}
  const items=xfpMenuItems(model,s);if(s.selection>=items.length)s.selection=0;
  if(s.accessLevel<(model.nodesById[s.nodeId]?.minLevel||1)||s.accessLevel<(model.nodesById[s.menuId]?.minLevel||1)){s.mode='home';s.nodeId=null;s.editor=null;s.stack=[];}
 }
 s.message='Saved fictional practice restored; temporary diagnostic outputs are stopped.';return s;
}
function visible(model,s,id){const n=model.nodesById[id];if(!n||n.variants&&!n.variants.includes(model.variant))return false;if(id==='access2'&&model.keySwitch)return false;return !n.condition||({fire:s.fireLatched,fault:s.inputs.missing||(s.inputs.earth&&s.settings.earthMonitoring==='Enabled'),disabled:Object.values(s.disabled).some(a=>a.length)||s.settings.faultRelay==='Disabled',test:s.walkZones.length,network:s.networkCard})[n.condition];}
export function xfpMenuItems(model,state,id=state.menuId){return (model.nodesById[id]?.children||[]).filter(n=>visible(model,state,n));}
function menu(s,id){cleanTemporary(s);s.mode='menu';s.menuId=id;s.nodeId=id;s.selection=0;s.editor=null;}
function finish(s,text){const id=s.menuId;menu(s,id);return result(s,true,text);}
function guard(model,s,n){if(s.accessLevel<n.minLevel)return 'Enter access level '+n.minLevel+' first.';if(n.requiresNvm&&!s.nvmUnlocked)return 'NVM is locked. Open the training cover and fit the memory-unlock link first.';return '';}
function enter(model,s,id){const n=model.nodesById[id];const problem=guard(model,s,n);if(problem)return result(s,false,problem);
 if(n.kind==='menu'){s.stack.push({menuId:s.menuId,selection:s.selection});menu(s,id);return s;}
 s.nodeId=id;s.editor={stage:0,index:0,loop:1,addressIndex:0,zone:1,target:1,value:0,digits:'',draft:{},pending:[]};s.mode=n.kind==='access'?'code':'form';
 if(n.kind==='access')s.editor.accessTarget=n.accessTarget;
 if(['toggle','setting'].includes(n.kind))s.editor.value=s.settings[n.setting];
 if(n.kind==='test')s.editor.target=n.target==='relays'?1:'all';
 if(n.kind==='disable'&&['sounders','outputs'].includes(n.target))s.editor.target='all';
 if(n.kind==='time')s.editor.draft=copy(s.settings);
 if(n.kind==='clean-start')s.editor.digits='';
 if(n.kind==='lamps')s.mode='lamps';
 return result(s,true,n.summary);
}
function cycle(options,value,delta){const i=options.indexOf(value);return options[(Math.max(0,i)+delta+options.length)%options.length];}
function selectedDevices(s,e){return s.devices.filter(d=>d.loop===e.loop);}
function chooseDevice(s,e){const ds=selectedDevices(s,e);return ds[Math.min(e.addressIndex||0,Math.max(0,ds.length-1))];}
function zoneDevices(s,e){return s.devices.filter(d=>d.input&&d.zone===e.zone);}
function toggleArray(a,value,on){return on?[...new Set([...a,value])]:a.filter(v=>v!==value);}
function mutateAllowed(model,s,n){const blocked=guard(model,s,n);return blocked?result(s,false,blocked):null;}
function processForm(model,s,key){const n=model.nodesById[s.nodeId],e=s.editor,delta=key==='DOWN'?1:key==='UP'?-1:0;
 if(s.accessLevel<n.minLevel){cleanTemporary(s);s.mode='home';s.nodeId=null;s.editor=null;return result(s,false,'Access ended. Unconfirmed changes were cancelled.');}
 if(n.kind==='reference')return key==='ESCAPE'?finish(s,'Reference closed.'):result(s,false,'Source reference only; this hardware function is not simulated.');
 if(n.kind==='loop-learn'&&key==='ESCAPE'&&e.stage===2){return learn(model,s,false);}
 if(key==='ESCAPE'){cleanTemporary(s);return finish(s,'Exited; unconfirmed changes were not saved.');}
 if(['display','lamps'].includes(n.kind)){if(delta)e.index=Math.max(0,e.index+(n.id==='history'?-delta:delta));return s;}
 if(n.kind==='clean-start'){
  const expected=['UP','ACCEPT','DOWN','ESCAPE','SILENCE_INTERNAL']; // ESCAPE is part of this confirmation, handled before generic escape by caller.
  if(key!==expected[e.index]){e.index=0;return result(s,false,'Clean start confirmation cancelled. No database change.');}e.index++;if(e.index===5){if(mutateAllowed(model,s,n))return s;s.devices=[];s.disabled={devices:[],zones:[],sounders:[],outputs:[],relays:[]};s.walkZones=[];s.settings=copy(createXfpState(model).settings);s.alarmCounter=0;s.history=[];cleanTemporary(s);record(s,'Fictional configuration and settings reset to fixture defaults');return finish(s,'Fictional database cleared. Connected practice devices remain available to learn.');}return s;
 }
 if(n.kind==='confirm'){if(key==='ACCEPT'){s.history=[];return finish(s,'Fictional event history reset.');}return s;}
 if(n.kind==='toggle'||n.kind==='setting'){if(delta)e.value=cycle(n.choices||range(n.maximum,n.minimum),e.value,delta);if(key==='ACCEPT'){if(mutateAllowed(model,s,n))return s;s.settings[n.setting]=e.value;record(s,n.label+': '+e.value);return finish(s,'Saved: '+e.value);}return s;}
 if(n.kind==='time'){const field=n.fields[e.stage],max=field==='year'?2099:field==='day'?31:field==='month'?12:field.toLowerCase().includes('minute')?59:23,min=['day','month'].includes(field)?1:field==='year'?2020:0;if(delta)e.draft[field]=cycle(range(max,min),e.draft[field],delta);if(key==='ACCEPT'){if(e.stage<n.fields.length-1)e.stage++;else{if(mutateAllowed(model,s,n))return s;for(const f of n.fields)s.settings[f]=e.draft[f];record(s,n.label+' saved');return finish(s,'Fictional clock/times saved.');}}return s;}
 if(n.kind==='disable'||n.kind==='walk'){
  const target=n.kind==='walk'?'zones':n.target,all=range(target==='zones'?model.zoneCount:target==='relays'?3:16),options=['sounders','outputs'].includes(target)?(target==='sounders'&&s.settings.sounderMode==='Globally'?['all']:['all',...all]):all;
  if(e.stage===0){if(delta)e.target=cycle(options,e.target,delta);if(key==='ACCEPT'){e.stage=1;e.value=n.kind==='walk'?s.walkZones.includes(e.target):e.target==='all'?all.every(v=>s.disabled[target].includes(v)):s.disabled[target].includes(e.target);}return s;}
  if(delta)e.value=!e.value;if(key==='ACCEPT'){if(target==='zones'&&!e.value&&n.kind!=='walk'&&s.devices.filter(d=>d.input&&d.zone===e.target).length&&s.devices.filter(d=>d.input&&d.zone===e.target).every(d=>s.disabled.devices.includes(d.id)))return result(s,false,'Enable at least one input device before enabling this zone.');
   if(n.kind==='walk'){s.walkZones=toggleArray(s.walkZones,e.target,e.value);record(s,n.label+' '+e.target+': '+e.value);return finish(s,'Zone test state confirmed.');}else if(e.target==='all')s.disabled[target]=e.value?[...all]:[];else s.disabled[target]=toggleArray(s.disabled[target],e.target,e.value);record(s,n.label+' '+e.target+': '+e.value);e.stage=0;e.target=cycle(options,e.target,1);return result(s,true,'Confirmed. Select another target or Escape.');}return s;
 }
 if(n.kind==='device-disable'){
  if(e.stage===0){if(delta)e.zone=cycle(range(model.zoneCount),e.zone,delta);if(key==='ACCEPT'){e.stage=1;e.addressIndex=0;}return s;}
  const devices=zoneDevices(s,e),d=devices[e.addressIndex];if(!d)return key==='ACCEPT'?result(s,false,'No input devices assigned to this zone.'):s;
  if(e.stage===1){if(delta)e.addressIndex=(e.addressIndex+delta+devices.length)%devices.length;if(key==='ACCEPT'){e.stage=2;e.value=s.disabled.devices.includes(d.id);}return s;}
  if(delta)e.value=!e.value;if(key==='ACCEPT'){s.disabled.devices=toggleArray(s.disabled.devices,d.id,e.value);if(devices.every(x=>s.disabled.devices.includes(x.id)))s.disabled.zones=toggleArray(s.disabled.zones,e.zone,true);record(s,(e.value?'Disabled ':'Enabled ')+d.id);e.stage=1;e.addressIndex=(e.addressIndex+1)%devices.length;return result(s,true,'Device setting confirmed. Zone disablement, if present, must be cleared separately.');}return s;
 }
 if(n.kind==='loop-learn'||n.kind==='find-new'){
  if(e.stage===0){if(key==='ACCEPT')e.stage=1;return s;}
  if(e.stage===1){if(delta)e.loop=cycle(model.loopCount>1?[1,2,'all']:[1],e.loop,delta);if(key==='ACCEPT'){if(n.kind==='loop-learn')e.stage=2;else{e.pending=s.connected.filter(d=>(e.loop==='all'||d.loop===e.loop)&&!s.devices.some(x=>x.id===d.id)).map(copy);e.stage=2;if(!e.pending.length)return finish(s,'No new devices in the fictional connected fixture.');}}return s;}
  if(n.kind==='loop-learn'){if(key==='ACCEPT'){if(e.stage===2)e.stage=3;else return learn(model,s,true);}return s;}
  const d=e.pending[0];if(!d)return finish(s,'New-device search complete.');
  if(e.stage===2){if(key==='ACCEPT'){e.stage=3;e.value=1;}return s;}
  if(delta)e.value=cycle(range(d.input?model.zoneCount:16),e.value,delta);if(key==='ACCEPT'){if(mutateAllowed(model,s,n))return s;const added=copy(d);if(d.input)added.zone=e.value;else added.group=e.value;s.devices.push(added);record(s,'Learnt new device '+d.id);e.pending.shift();e.stage=2;if(!e.pending.length)return finish(s,'New fictional device accepted and assigned. Labels/cause and effect require PC programming.');}return s;
 }
 if(['fitted','assign','point','test-device','blink'].includes(n.kind)){
  if(e.stage===0){if(delta)e.loop=cycle(range(model.loopCount),e.loop,delta);if(key==='ACCEPT')e.stage=1;return s;}
  if(n.kind==='fitted'){if(delta)e.index=cycle(range(6,0),e.index,delta);return s;}
  if(n.kind==='blink'){if(delta)e.value=cycle([0,1,2],e.value,delta);if(key==='ACCEPT'){s.activeTest={kind:'blink',loop:e.loop,end:['End A','End B','Both Ends'][e.value]};return result(s,true,'Fictional LED test selected. No physical cable sequence or break location is inferred.');}return s;}
  const ds=selectedDevices(s,e),d=chooseDevice(s,e);if(!d)return result(s,false,'No learned devices on this loop.');
  if(e.stage===1){if(delta)e.addressIndex=(e.addressIndex+delta+ds.length)%ds.length;if(key==='ACCEPT'){
   if(n.kind==='assign'){e.stage=2;e.value=d.input?d.zone:d.group||1;}
   else if(n.kind==='test-device'){e.stage=2;e.value=0;}
   else if(n.id==='monitor'){e.stage=2;s.monitorRestore={id:d.id,wasDisabled:s.disabled.devices.includes(d.id)};s.disabled.devices=toggleArray(s.disabled.devices,d.id,true);}
   else e.stage=2;
  }return s;}
  if(n.kind==='assign'){if(delta)e.value=cycle(range(d.input?model.zoneCount:16),e.value,delta);if(key==='ACCEPT'){if(mutateAllowed(model,s,n))return s;if(d.input)d.zone=e.value;else d.group=e.value;record(s,'Assigned '+d.id+' to '+e.value);e.stage=1;e.addressIndex=(e.addressIndex+1)%ds.length;return result(s,true,'Basic assignment saved. Names and I/O output sets remain PC-only.');}}
  if(n.kind==='test-device'){if(delta)e.value=cycle(range(7,0),e.value,delta);if(key==='ACCEPT'||s.activeTest?.kind==='device')s.activeTest={kind:'device',deviceId:d.id,bits:e.value};}
  return s;
 }
 if(n.kind==='test'){
  const options=n.target==='relays'?range(3):['all',...range(16)];if(e.stage===0){if(delta)e.target=cycle(options,e.target,delta);if(key==='ACCEPT'){e.stage=1;e.value=0;s.activeTest={kind:n.target,target:e.target,state:n.states[0]};}return s;}
  if(delta){e.target=cycle(options,e.target,delta);e.value=0;s.activeTest={kind:n.target,target:e.target,state:n.states[0]};}
  if(key==='ACCEPT'){e.value=cycle(range(n.states.length-1,0),e.value,1);s.activeTest={kind:n.target,target:e.target,state:n.states[e.value]};record(s,'Fictional '+n.target+' test: '+n.states[e.value]);}return s;
 }
 return s;
}
function learn(model,s,erase){const n=model.nodesById[s.nodeId];if(mutateAllowed(model,s,n))return s;const loop=s.editor.loop,scoped=d=>loop==='all'||d.loop===loop;const previous=s.devices;const found=s.connected.filter(scoped).map(d=>{const old=previous.find(x=>x.id===d.id);return erase?{...copy(d),location:'',...(d.input?{zone:1}:{group:1})}:old?{...copy(old),type:d.type}:copy(d);});s.devices=[...previous.filter(d=>!scoped(d)),...found];record(s,'Loop learn '+(erase?'erased':'preserved')+' fictional data');return finish(s,'Loop learn complete in the fictional fixture. '+(erase?'Text and assignments reset.':'Existing text and assignments preserved.'));}
export function pressXfpKey(model,state,key,{hold=false}={}){
 const s=copy(state);s.lastAction={ok:true};s.message='';
 if(key==='ESCAPE'&&hold){cleanTemporary(s);s.accessLevel=s.keySwitch?2:1;s.mode='home';s.nodeId=null;s.editor=null;s.stack=[];return result(s,true,s.nvmUnlocked?'Access ended. Memory-unlock link is still fitted — relock NVM.':'Access ended.');}
 // Code digits and clean-start sequence take precedence over ordinary Escape.
 if(s.mode==='code'&&digits[key]){s.editor.digits+=digits[key];if(s.editor.digits.length===4){const level=s.editor.accessTarget;if(s.editor.digits===s.settings['code'+level]){s.accessLevel=level;s.stack=[];menu(s,root(s));record(s,'Entered access level '+level);return result(s,true,'Access level '+level+'. NVM unlock remains separate.');}s.mode='menu';s.nodeId=s.menuId;s.editor=null;return result(s,false,'Code not accepted. No access change.');}return s;}
 if(s.mode==='form'&&model.nodesById[s.nodeId]?.kind==='code'&&digits[key]){const e=s.editor,n=model.nodesById[s.nodeId];e.digits+=digits[key];if(e.digits.length===4){if(!e.firstCode){e.firstCode=e.digits;e.digits='';return result(s,true,'Confirm the new code by re-entering all four digits.');}if(e.firstCode!==e.digits){e.firstCode=null;e.digits='';return result(s,false,'Codes did not match. Existing code retained. Enter the new code again.');}if(mutateAllowed(model,s,n))return s;s.settings['code'+n.codeLevel]=e.digits;record(s,n.label+' changed in fictional site');return finish(s,'Confirmed fictional access code saved.');}return s;}
 if(s.mode==='form'&&s.nodeId==='clean-start'){
  const expected=['UP','ACCEPT','DOWN','ESCAPE','SILENCE_INTERNAL'];if(key!==expected[s.editor.index])return finish(s,'Clean start cancelled. Database unchanged.');s.editor.index++;if(s.editor.index===5){if(mutateAllowed(model,s,model.nodesById['clean-start']))return s;s.devices=[];s.disabled={devices:[],zones:[],sounders:[],outputs:[],relays:[]};s.walkZones=[];s.settings=copy(createXfpState(model).settings);s.alarmCounter=0;s.history=[];cleanTemporary(s);record(s,'Fictional configuration and settings reset to fixture defaults');return finish(s,'Fictional database cleared.');}return s;
 }
 if(key==='KEY_SWITCH'){s.keySwitch=!s.keySwitch;if(s.accessLevel<3)s.accessLevel=s.keySwitch?2:1;if(s.mode==='menu')menu(s,root(s));else if(s.nodeId&&s.accessLevel<(model.nodesById[s.nodeId]?.minLevel||1)){cleanTemporary(s);s.mode='home';s.nodeId=null;s.editor=null;s.stack=[];}return result(s,true,'Controls '+(s.keySwitch?'enabled at level 2.':'keyswitch returned; unconfirmed privileged changes cancelled.'));}
 if(key==='SILENCE_INTERNAL'){s.buzzer=false;return result(s,true,'Internal sounder silenced.');}
 if(key==='MORE'){s.more=!s.more;return result(s,true,'Displayed event information.');}
 if(['SILENCE_RESOUND','RESET','INVESTIGATE'].includes(key)){
  if(s.accessLevel<2)return result(s,false,'Enable controls at access level 2 or 3 first.');
  if(key==='SILENCE_RESOUND'){if(!s.fireLatched)return result(s,false,'No active fictional fire sounders to silence or resound.');s.sounders=!s.sounders;record(s,s.sounders?'Sounders resounded':'Sounders silenced');return result(s,true,s.sounders?'Sounders resounded.':'Sounders silenced.');}
  if(key==='INVESTIGATE')return result(s,false,'No configured investigation-delay scenario is active. PC cause/effect is not invented.');
  if(s.sounders)return result(s,false,'Silence the sounders before resetting.');s.fireLatched=false;if(s.inputs.fire&&deviceEnabled(s,s.devices.find(d=>d.id==='1:1')||{id:'1:1',zone:1})){s.fireLatched=true;s.sounders=true;s.buzzer=true;record(s,'Uncleared input reasserted fire');return result(s,true,'Fire input remains active and has reasserted.');}record(s,'Panel reset');return result(s,true,'Fictional panel reset. Persistent faults remain visible.');
 }
 if(key==='MENU'){if(['form','code'].includes(s.mode))return result(s,false,'Finish or cancel the current operation before opening another menu.');s.stack=[];menu(s,root(s));return s;}
 if(s.mode==='lamps')return key==='ESCAPE'?finish(s,'Lamp test ended.'):s;
 if(s.mode==='form'){
  if(s.nodeId==='find-new'&&s.editor.stage===2&&key==='ESCAPE'){s.editor.pending.shift();if(!s.editor.pending.length)return finish(s,'New device rejected; database unchanged for that device.');return result(s,true,'New device rejected.');}
  return processForm(model,s,key);
 }
 if(s.mode==='menu'){
  const items=xfpMenuItems(model,s);if(key==='UP'||key==='DOWN')s.selection=(s.selection+(key==='DOWN'?1:-1)+items.length)%items.length;
  if(key==='ACCEPT'&&items[s.selection])return enter(model,s,items[s.selection]);
  if(key==='ESCAPE'){const back=s.stack.pop();if(back){menu(s,back.menuId);s.selection=back.selection;}else{s.mode='home';s.nodeId=null;}}
 }
 return s;
}
export function setXfpInput(model,state,input){const s=copy(state);s.lastAction={ok:true};if(!input||typeof input.type!=='string')return result(s,false,'Unknown fictional practice input.');
 if(input.type==='end-lamp-test'){if(s.mode==='lamps')return finish(s,'Fictional lamp test completed.');return s;}
 if(input.type==='cover'){s.coverOpen=!!input.open;return result(s,true,s.coverOpen?'Training cover removed; access and memory unlock are unchanged.':s.nvmUnlocked?'Cover refitted; memory link remains fitted. Relock it before finishing.':'Training cover refitted.');}
 if(input.type==='nvm'){if(!s.coverOpen)return result(s,false,'Open the training cover to reach the memory-unlock link.');s.nvmUnlocked=!!input.enabled;return result(s,true,s.nvmUnlocked?'Memory unlocked. Access level 3 is still required for engineer configuration.':'Memory relocked.');}
 if(input.type==='hold-escape')return pressXfpKey(model,s,'ESCAPE',{hold:true});
 if(input.type==='network-card'){if(!s.coverOpen)return result(s,false,'Open the training cover to change the fictional card fixture.');s.networkCard=!!input.fitted;return result(s,true,'Fictional optional network card '+(s.networkCard?'fitted.':'removed.'));}
 if(input.type==='clear-inputs'){s.inputs.fire=false;s.inputs.earth=false;s.inputs.missing=false;s.connected=copy(s.devices);return result(s,true,'Fictional physical inputs restored. Reset any latched fire separately.');}
 if(input.type==='test-trigger'){if(!s.walkZones.includes(1))return result(s,false,'Put zone 1 into walk test first.');s.testPulse=true;record(s,'Walk test: fictional 1:1 training reception detector');return result(s,true,'Fictional zone-1 test recorded. Group 1 test pulse; output sets do not operate. Return to access level 1 to view tested devices.');}
 if(input.type==='end-pulse'){s.testPulse=false;return result(s,true,'Fictional test pulse ended. No firmware timing is asserted.');}
 return result(s,false,'Unsupported fictional practice input.');
}
function formLines(model,s){const n=model.nodesById[s.nodeId],e=s.editor;if(!n||!e)return ['',''];
 if(n.kind==='access')return ['ENTER ACCESS LEVEL '+e.accessTarget,'Code: '+('*'.repeat(e.digits.length)).padEnd(4,'_')];
 if(n.kind==='reference')return [n.label,''];
 if(n.kind==='lamps')return ['████████████████████████████████','████████████████████████████████'];
 if(n.kind==='code')return [n.label,(e.firstCode?'Confirm: ':'New code: ')+('*'.repeat(e.digits.length)).padEnd(4,'_')];
 if(n.kind==='clean-start')return ['MAKE A CLEAN START','Confirm 1 2 3 4 MUTE: '+e.index+'/5'];
 if(n.kind==='confirm')return [n.label,'Accept = confirm; Escape = exit'];
 if(['toggle','setting'].includes(n.kind))return [n.label,String(e.value)+' · Accept to save'];
 if(n.kind==='time')return [n.label,n.fields[e.stage]+': '+String(e.draft[n.fields[e.stage]]).padStart(2,'0')];
 if(n.kind==='disable'||n.kind==='walk')return [n.label,(n.kind==='walk'?'Zone':n.target)+' '+e.target+(e.stage?' : '+(n.kind==='walk'?(e.value?'Walk Test mode':'Normal operation'):(e.value?'Disabled':'Enabled')):' · Accept to select')];
 if(n.kind==='device-disable'){const d=zoneDevices(s,e)[e.addressIndex];return [n.label,e.stage===0?'Zone '+e.zone:d?'L'+d.loop+' D'+d.address+' '+(e.stage===2?(e.value?'Disabled':'Enabled'):d.type):'No input devices in zone '+e.zone];}
 if(['loop-learn','find-new'].includes(n.kind)){const d=e.pending[0];return [n.label,e.stage===0?'Are you sure? Accept / Escape':e.stage===1?'Loop '+e.loop:n.kind==='loop-learn'?(e.stage===2?'ERASE? Accept=yes Escape=preserve':'ERASE DATABASE? Accept confirms'):e.stage===2?'New L'+d?.loop+' D'+d?.address+' Accept / reject Escape':(d?.input?'Zone ':'Sounder group ')+e.value];}
 if(n.kind==='test')return [n.label,e.stage===0?'Select '+n.target+' '+e.target:String(e.target)+' : '+n.states[e.value]];
 if(n.kind==='blink')return [n.label,e.stage===0?'Loop '+e.loop:['End A','End B','Both Ends'][e.value]+' · Accept'];
 if(n.kind==='fitted'&&e.stage>0){const symbol=d=>!d?'-':d.type==='Optical detector'?'O':d.type==='Manual call point'?'C':d.type==='Sounder'?'S':'I';return [0,1].map(row=>{const start=e.index*20+row*10+1;if(start>126)return '';return 'L:'+e.loop+' D:'+start+' '+range(Math.min(126,start+9),start).map(address=>symbol(s.devices.find(d=>d.loop===e.loop&&d.address===address))).join('');});}
 if(['fitted','assign','point','test-device'].includes(n.kind)){const d=chooseDevice(s,e);return [n.label,e.stage===0?'Loop '+e.loop:!d?'No learned devices':e.stage===1?'L'+d.loop+' D'+d.address+' '+d.type:n.kind==='assign'?(d.input?'Zone ':'Sounder group ')+e.value:n.kind==='test-device'?'Output bits: '+e.value:n.id==='monitor'?'Fictional analogue: 25 · temporarily disabled':d.location+' · zone '+(d.zone||'—')];}
 if(n.id==='history')return ['EVENT HISTORY',s.history[e.index%s.history.length]?.text||'No recorded fictional events'];
 if(n.id==='alarm-counter')return [n.label,String(s.alarmCounter)];
 if(n.id==='psu')return ['SYNTHETIC PSU EXAMPLE','Output 27.4V · battery 26.8V'];
 if(n.id==='current')return ['SYNTHETIC LOOP CURRENT','L1 68mA'+(model.loopCount===2?' · L2 42mA':'')];
 if(n.id==='versions')return ['SYNTHETIC VERSION EXAMPLE','Fixture v1 · not a real firmware read'];
 if(n.id==='fire-events')return ['FIRE EVENT',s.fireLatched?'Zone 1 · L1 D1 reception':'No fire event'];
 if(n.id==='fault-events')return ['FAULT EVENT',s.inputs.missing?'Device missing · L1 D1':s.inputs.earth?'Earth fault':'No fault'];
 if(n.id==='test-events')return ['ZONES IN TEST',s.walkZones.join(', ')||'None'];
 if(n.id==='disabled-events')return ['DISABLEMENTS',Object.entries(s.disabled).filter(([,v])=>v.length).map(([k,v])=>k+': '+v.join(',')).join(' / ')||'None'];
 return [n.label,n.summary];
}
export function xfpView(model,s){const fault=s.inputs.missing||(s.inputs.earth&&s.settings.earthMonitoring==='Enabled');const disabled=Object.values(s.disabled).some(a=>a.length)||s.settings.faultRelay==='Disabled';let lcdLines;
 if(s.mode==='menu')lcdLines=['ACCESS LEVEL '+s.accessLevel,model.nodesById[xfpMenuItems(model,s)[s.selection]]?.label||'No options'];else if(s.mode==='home')lcdLines=s.fireLatched?['FIRE ZONE 1',s.more?'L1 D1 · Training reception detector':'Training reception · MORE for details']:fault?['FAULT',s.more&&s.inputs.missing?'Loop 1 Address 1 · device missing':s.inputs.missing?'Device missing · MORE for details':'Earth fault · fictional input']:['XFP '+model.zoneCount+' ZONE','FINDR PRACTICE SITE'];else lcdLines=formLines(model,s);
 const leds={fire:s.fireLatched?(s.sounders?'flash':'on'):'off',supply:'on',test:s.walkZones.length?'on':'off',accessed:s.accessLevel>1?'on':'off',disablement:disabled?'on':'off',phasedEvacuation:'off',generalFault:fault?'flash':'off',powerFault:'off',systemFault:'off',sounderStatus:s.disabled.sounders.length?'flash':'off',delaysRunning:'off'};if(s.mode==='lamps')for(const k in leds)leds[k]='on';
 const zoneStates=Object.fromEntries(range(model.zoneCount).map(z=>[z,s.mode==='lamps'?'on':s.fireLatched&&z===1?(s.sounders?'flash':'on'):'off']));return {lcdLines,leds,zoneStates,accessLevel:s.accessLevel,coverOpen:s.coverOpen,nvmUnlocked:s.nvmUnlocked,variant:model.variant,keySwitch:s.keySwitch,title:model.title,message:s.message,nodeId:s.nodeId,selectedDevice:s.editor?chooseDevice(s,s.editor):null};
}
function pathTo(model,rootId,target){const queue=[[rootId]];while(queue.length){const path=queue.shift(),last=path.at(-1);if(last===target)return path;for(const c of model.nodesById[last]?.children||[])if(!path.includes(c))queue.push([...path,c]);}return null;}
/** A hint never presses a key and never cancels an edit: Escape can itself confirm preserve-learn. */
export function findXfpRoute(model,s,target){const n=model.nodesById[target];if(!n||n.kind==='reference')return {blocked:'This function is a source reference, without a simulated key route.'};if(s.nodeId===target&&s.mode!=='menu'||s.mode==='menu'&&s.menuId===target)return {done:true};
 if(target==='access2'&&model.keySwitch)return s.accessLevel>=2?{done:true}:{key:'KEY_SWITCH',text:'This keyswitch variant uses Enable controls for level 2. Code entry applies to the separate code-entry model.'};
 if(s.mode==='code'){const code=s.settings['code'+s.editor.accessTarget];return {key:Object.keys(digits).find(k=>digits[k]===code[s.editor.digits.length]),text:'Enter the next digit of the fictional access code.'};}
 if(!['home','menu','lamps'].includes(s.mode))return {blocked:'Finish or cancel the current operation explicitly. Hints will not cancel an edit or execute a learn command.'};
 if(n.condition==='network'&&!s.networkCard||n.parentId==='network'&&!s.networkCard)return {blocked:'This option requires the explicitly fitted fictional network card.'};
 if(n.requiresNvm&&!s.nvmUnlocked)return {blocked:'Open the training cover and fit the memory-unlock link. This does not grant installer access.',input:{type:s.coverOpen?'nvm':'cover',...(s.coverOpen?{enabled:true}:{open:true})}};
 if(s.mode==='home')return {key:'MENU',text:'Open the menu.'};if(s.mode==='lamps')return {key:'ESCAPE',text:'Leave the lamp test.'};
 // AL2-only operations stay in the source's AL2 tree: hold Escape, then turn the key.
 if(['time-date','event-log','history','print-history','reset-history','test-events','lamps','alarm-counter'].includes(target)&&s.accessLevel===3)return {input:{type:'hold-escape'},text:'Hold Escape to leave installer access; use the documented level-2 menu.'};
 if(['time-date','event-log','history','print-history','reset-history'].includes(target)&&s.accessLevel===1)return {key:'KEY_SWITCH',text:'Turn the Enable controls key for access level 2.'};
 const required=n.minLevel;let actualTarget=s.accessLevel<required?'access3':target;
 let path=pathTo(model,s.menuId,actualTarget);if(!path){return {key:'ESCAPE',text:'Return to the parent menu.'};}
 const child=path[1];if(!child)return {done:true};const items=xfpMenuItems(model,s),index=items.indexOf(child);if(index<0)return {blocked:'This option is not available in the present panel state.'};if(index===s.selection)return {key:'ACCEPT',text:'Open '+model.nodesById[child].label+'.'};
 const down=(index-s.selection+items.length)%items.length,up=(s.selection-index+items.length)%items.length;return {key:down<=up?'DOWN':'UP',text:'Select '+model.nodesById[child].label+'.'};
}
export function nextXfpHint(model,state,{lessonId,stepIndex=0,nodeId}={}){if(nodeId)return findXfpRoute(model,state,nodeId);const step=model.lessons.find(l=>l.id===lessonId)?.steps[stepIndex];if(!step)return {done:true};if(step.routeNode)return findXfpRoute(model,state,step.routeNode);if(step.expectedInput)return {input:step.expectedInput,text:step.title};return {key:step.expectedKeys?.[0],text:step.title};}
export function evaluateXfpConditions(model,state,conditions={}){return Object.entries(conditions).every(([k,v])=>state[k]===v);}
