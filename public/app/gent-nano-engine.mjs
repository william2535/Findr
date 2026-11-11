/* Offline Nano training model. No network, panel transport or real credentials.
 * Operator behaviour is pinned by gent-nano.json; fictional site policies are
 * explicit. Mutations return a new state, and hint planning only returns keys.
 */
const VERSION = 1;
const MAX_HISTORY = 999;
const IDLE_MS = 3 * 60 * 1000; // FINDR timeout convention; V3 manual says a few minutes.
const CLOCK_FIELDS = ['hour', 'minute', 'day', 'month', 'year'];
const OUTPUTS = ['masterAlarms', 'fireRelay', 'evacuateInput'];
const clone = value => structuredClone(value);
const list = value => Array.isArray(value) ? value : [];
const txt = (value, max = 160) => String(value ?? '').slice(0, max);
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const uniq = value => [...new Set(value)];
const dict = value => Object.fromEntries(value.map(row => [row.id, row]));
const defaultKeys = [['LEFT_SOFT','Left selection'],['MINUS','Minus'],['NEXT','Next / Verify'],['PLUS','Plus'],['RIGHT_SOFT','Right selection'],['CANCEL_BUZZER','Cancel Buzzer'],['RESET','Reset'],['SOUND_ALARMS','Sound Alarms'],['SILENCE_ALARMS','Silence Alarms']].map(([id,label])=>({id,label}));
const defaultLeds = [['disablement','Disablement','amber'],['test','Test','amber'],['delay','Delay','amber'],['verify','Verify','amber'],['system-fault','System Fault','amber'],['power-fault','Power Fault','amber'],['sounder-fault','Sounder Fault','amber'],['sounder-disablement','Sounder Disablement','amber'],['fault','Fault','amber'],['power','Power','green'],['fire','Fire','red']].map(([id,label,color])=>({id,label,color}));
const isReference = node => node && (node.kind === 'reference' || node.referenceOnly === true || ['reference','conflict','unverified'].includes(node.confidence));
const wrap = (value, min, max) => ((value - min) % (max - min + 1) + max - min + 1) % (max - min + 1) + min;

export function buildNanoModel(data) {
  if (!data?.id) throw Error('A Nano map requires an id.');
  const raw = clone(data), nodeList = Array.isArray(raw.nodes) ? raw.nodes : Object.values(raw.nodes || {}), nodes = Object.create(null);
  for (const node of nodeList) {
    if (!node.id || nodes[node.id]) throw Error('Nano menu ids must be unique.');
    nodes[node.id] = {...node, kind: node.kind || node.type || 'form', accessLevel: node.accessLevel ?? node.requiredAccess ?? 1};
  }
  if (!nodes[raw.menuRootId || 'main']) throw Error('Nano menu root is missing.');
  for (const node of Object.values(nodes)) for (const item of list(node.items)) if (!nodes[item.to]) throw Error(`Unknown Nano route: ${node.id} → ${item.to}`);
  const fixture = {...raw.fixture, id: raw.fixture?.id || 'findr-nano-training-site', trainingPin: txt(raw.fixture?.trainingPin || '2468', 4), devices: list(raw.fixture?.devices), zones: list(raw.fixture?.zones), sectors: list(raw.fixture?.sectors), deviceDisablementLevel: raw.fixture?.deviceDisablementLevel === 3 ? 3 : 2};
  if (!/^\d{4}$/.test(fixture.trainingPin)) throw Error('The Nano practice PIN must contain four digits.');
  const channels = fixture.devices.flatMap(device => list(device.channels || device.ioChannels).map((channel,index)=>({...channel,id:channel.id || `${device.id}C${index+1}`,device:device.id,number:channel.number || index+1})));
  const scenarios = list(raw.scenarios), knownFaults = dict([...list(fixture.faults),...scenarios.flatMap(s=>list(s.faults).filter(x=>typeof x==='object'))].filter(x=>x?.id));
  const defaults = [{id:'device-lost',device:'D3',kind:'device',message:'Lost Device'},{id:'loop-open',kind:'loop',message:'Loop wiring open circuit',requiresRepair:true},{id:'mains-failed',kind:'power',message:'Mains supply failed'}];
  for (const fault of defaults) if (!knownFaults[fault.id]) knownFaults[fault.id]=fault;
  return {...raw,data:raw,nodes,nodeList,menuRootId:raw.menuRootId || 'main',fixture,devices:dict(fixture.devices),zones:dict(fixture.zones),sectors:dict(fixture.sectors),channels:dict(channels),channelList:channels,scenarios,scenarioById:dict(scenarios),knownFaults,mapVersion:String(raw.version || raw.schemaVersion || '1'),sourceFingerprint:list(raw.sources).map(s=>`${s.id}:${s.sha256 || s.url}`).join('|'),physicalKeys:list(raw.physicalKeys).length?raw.physicalKeys:defaultKeys,leds:(list(raw.leds).length?raw.leds:defaultLeds).map(l=>({...l,color:l.color || l.colour || defaultLeds.find(x=>x.id===l.id)?.color || 'amber'}))};
}

function validClock(raw={}) {
  const c={hour:Math.max(0,Math.min(23,Math.trunc(finite(raw.hour,12)))),minute:Math.max(0,Math.min(59,Math.trunc(finite(raw.minute,0)))),day:Math.max(1,Math.min(31,Math.trunc(finite(raw.day,30)))),month:Math.max(1,Math.min(12,Math.trunc(finite(raw.month,10)))),year:Math.max(2000,Math.min(2099,Math.trunc(finite(raw.year,2026))))};
  c.day=Math.min(c.day,new Date(Date.UTC(c.year,c.month,0)).getUTCDate());return c;
}
function stamp(state) {const c=state.clock;return `${String(c.hour).padStart(2,'0')}:${String(c.minute).padStart(2,'0')} ${String(c.day).padStart(2,'0')}/${String(c.month).padStart(2,'0')}/${c.year}`;}
function base(model) {
  const history=list(model.fixture.history).slice(0,MAX_HISTORY).map((row,index,rows)=>({...row,type:row.type || 'training-event',message:row.message || 'FINDR training event',sequence:rows.length-index,origin:'trainer'}));
  return {version:VERSION,panelId:model.id,fixtureId:model.fixture.id,mapVersion:model.mapVersion,sourceFingerprint:model.sourceFingerprint,scenarioId:'normal',nodeId:'status',menuOpen:false,menuIndex:0,trail:[],form:{},cursor:0,viewIndex:0,fireIndex:0,statusOverview:false,accessLevel:1,authenticatedLevel:0,trainingPin:model.fixture.trainingPin,deviceDisablementLevel:model.fixture.deviceDisablementLevel,inputs:Object.fromEntries(model.fixture.devices.map(d=>[d.id,'normal'])),disabledDevices:[],disabledZones:[],disabledSectors:[],disabledChannels:[],disabledOutputs:[],testZones:[],weeklyTest:false,testCycles:{},testSuppressedInputs:[],fireEvents:[],faults:{},buzzer:false,sounders:false,alarmSounders:false,manualSounders:false,masterAlarmsActive:false,fireRelayActive:false,sectorOutputs:{},plantActive:false,dayOverride:'NONE',dayOverrideRemainingMs:0,delayRemainingMs:0,verifyRemainingMs:0,displayTestRemainingMs:0,clock:validClock(model.fixture.clock),history,sequence:history.length,lastEvent:null,lastAction:null,message:'',menuIdleMs:0,elapsedMs:0,selectedDevice:model.fixture.devices[0]?.id,selectedChannel:model.channelList[0]?.id,weeklyMcpIndex:0,printer:{fitted:model.fixture.printerFitted===true || model.fixture.printer?.fitted===true,jobs:[]},dayDraft:null};
}
function emit(state,type,message,details={},historic=false) {
  const row={type,message,sequence:++state.sequence,at:stamp(state),origin:'panel-simulation',...details};state.lastEvent=row;
  if(historic)state.history=[row,...state.history].slice(0,MAX_HISTORY);return row;
}
function act(state,key,type,ok=true,message='') {state.lastAction={key,type,ok,message};state.message=message;return state;}
function reject(state,key,message,type='unavailable') {return act(state,key,type,false,message);}
function disabled(model,state,id) {const d=model.devices[id];return !!d&&(state.disabledDevices.includes(id)||state.disabledZones.includes(d.zone));}
function dayState(model,state) {if(state.dayOverride==='DAY')return 'DAY';if(state.dayOverride==='NIGHT')return 'NIGHT';return model.fixture.dayNight?.scheduledState==='DAY'?'DAY':'NIGHT';}
function updateOutputs(model,state) {
  const testSound=Object.values(state.testCycles).some(c=>c.elapsedMs<5000);
  const demand=state.manualSounders || state.alarmSounders || testSound;
  const alarmSectors=model.fixture.sectors.filter(s=>s.kind!=='plant' && s.activationControl!=='PLANT' && s.type!=='plant');
  state.sectorOutputs=Object.fromEntries(model.fixture.sectors.map(s=>[s.id,demand&&!state.disabledSectors.includes(s.id)&&(s.kind!=='plant'&&s.type!=='plant'&&s.activationControl!=='PLANT')]));
  const loopSounders=model.fixture.devices.some(d=>(d.sounder || /sounder/i.test(d.type||''))&&!state.disabledDevices.includes(d.id)&&!state.disabledSectors.includes(d.sector));
  state.masterAlarmsActive=!!(demand&&!state.disabledOutputs.includes('masterAlarms'));
  state.sounders=!!(demand&&(state.masterAlarmsActive||loopSounders||(!model.fixture.devices.some(d=>d.sounder||/sounder/i.test(d.type||''))&&alarmSectors.some(s=>!state.disabledSectors.includes(s.id)))));
  const fullFire=state.fireEvents.some(e=>!e.test)&&!state.delayRemainingMs&&!state.verifyRemainingMs;
  state.fireRelayActive=!!(fullFire&&!state.disabledOutputs.includes('fireRelay'));
  // The fictional site has an immediate plant/fire-relay response. Weekly test
  // inhibits plant; no real cause-and-effect configuration is inferred.
  state.plantActive=!!(fullFire&&!state.weeklyTest);
}
function addFire(model,state,id,{test=false}={}) {
  const d=model.devices[id];if(!d || state.fireEvents.some(e=>e.device===id))return;
  const e=emit(state,'fire-detected',`Fire: ${d.label}`,{device:id,zone:d.zone,test},true);
  state.fireEvents.push({device:id,zone:d.zone,sequence:e.sequence,at:e.at,test});state.buzzer=true;state.statusOverview=false;
  if(test){state.testCycles[id]={device:id,elapsedMs:0,phase:'sound'};}
  else if(dayState(model,state)==='DAY'&&d.type!=='mcp'&&!state.alarmSounders&&!state.fireEvents.some(x=>model.devices[x.device]?.type==='mcp')) {
    // This declared fixture keeps the first deadline when another sensor fires.
    if(!state.delayRemainingMs&&!state.verifyRemainingMs)state.delayRemainingMs=finite(model.fixture.dayNight?.dayDelayMs,30000);
  }else{state.delayRemainingMs=0;state.verifyRemainingMs=0;state.alarmSounders=true;}
  updateOutputs(model,state);
}
function addFault(state,fault) {if(state.faults[fault.id]?.physicalActive!==false&&state.faults[fault.id])return;state.buzzer=true;const entry=emit(state,'fault-detected',fault.message || 'Fault',{fault:fault.id,device:fault.device},true);state.faults[fault.id]={...clone(fault),physicalActive:true,at:entry.at,sequence:entry.sequence};}
function setInput(model,state,id,value) {
  const d=model.devices[id];if(!d||!['normal','fire','fault'].includes(value))return reject(state,'TRAINER_INPUT','Choose a known fictional device and condition.');
  if(value==='fire'&&d.type==='sounder')return reject(state,'TRAINER_INPUT','This sounder has no sensing input in the practice site.');
  if(value==='fire'&&d.type==='interface')return reject(state,'TRAINER_INPUT','Interface input cause and effect is not configured for this practice stimulus.','source-limit');
  const old=state.inputs[id];state.inputs[id]=value;
  if(value!=='fire')state.testSuppressedInputs=state.testSuppressedInputs.filter(x=>x!==id);
  if(value!=='fault')for(const fault of Object.values(state.faults))if(fault.device===id&&fault.kind==='device'){delete state.faults[fault.id];emit(state,'fault-restored','Device communication restored',{device:id,fault:fault.id},true);}
  if(value==='fault'&&!Object.values(state.faults).some(f=>f.device===id&&f.kind==='device'))addFault(state,{id:`input:${id}`,device:id,kind:'device',sounder:d.sounder===true||d.type==='sounder',message:'Lost Device'});
  if(value==='fire'&&old!=='fire'&&!disabled(model,state,id))addFire(model,state,id,{test:state.weeklyTest||state.testZones.includes(d.zone)});
  if(!state.fireEvents.length&&!Object.keys(state.faults).length)state.buzzer=false;
  updateOutputs(model,state);const message=value==='fire'&&disabled(model,state,id)?'FINDR stimulus is present, but the selected device or its zone is disabled.':value==='normal'&&state.fireEvents.some(e=>e.device===id)?'FINDR input restored. Fire remains latched until Reset.':`FINDR ${d.label}: ${value}.`;
  emit(state,'input-changed',message,{device:id,input:value,origin:'trainer'});return act(state,'TRAINER_INPUT','input',true,message);
}
export function setNanoDeviceInput(model,previous,id,value){const state=clone(previous);return setInput(model,state,id,value);}
export function setNanoFault(model,previous,id,active){
  const state=clone(previous),fault=model.knownFaults[id] || (id.startsWith('input:')&&model.devices[id.slice(6)]?{id,device:id.slice(6),kind:'device',message:'Lost Device'}:null);
  if(!fault)return reject(state,'TRAINER_FAULT','This fault is outside the fictional site.');
  if(active){addFault(state,fault);if(fault.device&&fault.kind==='device')state.inputs[fault.device]='fault';}
  else if(state.faults[id]){
    if(state.faults[id].requiresRepair){state.faults[id].physicalActive=false;emit(state,'fault-cause-restored','FINDR wiring condition restored. The loop still needs the sourced Repair operation.',{fault:id,origin:'trainer'},true);}
    else{delete state.faults[id];if(fault.device)state.inputs[fault.device]='normal';emit(state,'fault-restored','FINDR fault condition restored',{fault:id,origin:'trainer'},true);}
  }
  if(!state.fireEvents.length&&!Object.keys(state.faults).length)state.buzzer=false;updateOutputs(model,state);return act(state,'TRAINER_FAULT','fault',true,active?'FINDR fault introduced.':'FINDR fault cause restored.');
}
function applyScenario(model,state,id){
  if(!model.scenarioById[id]&&id!=='normal')return reject(state,'TRAINER_SCENARIO','Unknown practice scenario.');state.scenarioId=id;
  const s=model.scenarioById[id]||{};
  for(const d of list(s.disabledDevices))if(model.devices[d])state.disabledDevices.push(d);
  for(const z of list(s.disabledZones))if(model.zones[z])state.disabledZones.push(z);
  for(const x of list(s.disabledSectors))if(model.sectors[x])state.disabledSectors.push(x);
  for(const x of list(s.disabledChannels))if(model.channels[x])state.disabledChannels.push(x);
  for(const x of list(s.disabledOutputs))if(OUTPUTS.includes(x))state.disabledOutputs.push(x);
  for(const z of list(s.testZones))if(model.zones[z])state.testZones.push(z);
  if(s.weeklyTest||id==='weekly-test')state.weeklyTest=true;
  if(s.dayOverride||id==='day-delay'){state.dayOverride=s.dayOverride||'DAY';state.dayOverrideRemainingMs=finite(model.fixture.dayNight?.overrideDurationMs,600000);}
  const givenInputs=Array.isArray(s.inputs)?s.inputs:Object.entries(s.inputs||{}).map(([device,input])=>({device,input}));
  for(const entry of givenInputs){const d=entry.device||entry.id;if(model.devices[d])setInput(model,state,d,entry.input||entry.value);}
  for(const f of list(s.faults)){const fault=typeof f==='string'?model.knownFaults[f]:f;if(fault)addFault(state,fault);}
  if(id==='device-disabled'&&!state.disabledDevices.length)state.disabledDevices=['D1'].filter(d=>model.devices[d]);
  if(id==='zone-disabled'&&!state.disabledZones.length)state.disabledZones=['Z1'].filter(z=>model.zones[z]);
  if(id==='sector-disabled'&&!state.disabledSectors.length)state.disabledSectors=['S1'].filter(x=>model.sectors[x]);
  if(['fire','day-delay'].includes(id)&&!state.fireEvents.length)setInput(model,state,model.devices.D1?'D1':model.fixture.devices[0].id,'fire');
  if(id==='multiple-fires'&&!state.fireEvents.length)for(const d of model.fixture.devices.filter(d=>['sensor','mcp'].includes(d.type)).slice(0,3))setInput(model,state,d.id,'fire');
  if(id==='fault'&&!Object.keys(state.faults).length){addFault(state,model.knownFaults['device-lost']);if(model.devices.D3)state.inputs.D3='fault';}
  if(id==='loop-fault'&&!Object.keys(state.faults).length)addFault(state,model.knownFaults['loop-open']);
  state.conditionTimes={};for(const [name,entity] of [['disabledDevices','device'],['disabledZones','zone'],['disabledSectors','sector'],['disabledChannels','channel'],['disabledOutputs','output']])for(const id of state[name])state.conditionTimes[`${entity}:${id}`]=stamp(state);
  for(const zone of testZoneIds(model,state))state.conditionTimes[`test:${zone}`]=stamp(state);
  updateOutputs(model,state);state.lastAction=null;state.message='';return state;
}
export function createNanoState(model,{scenarioId='normal',deviceDisablementLevel}={}){const s=base(model);if(deviceDisablementLevel===3)s.deviceDisablementLevel=3;return applyScenario(model,s,scenarioId);}
export function loadNanoScenario(model,previous,id){return createNanoState(model,{scenarioId:id,deviceDisablementLevel:previous?.deviceDisablementLevel});}

function nodeAccess(model,id){return Number(model.nodes[id]?.accessLevel||1);}
function nodeKind(model,id){return model.nodes[id]?.kind||'form';}
function isMenu(model,id){return nodeKind(model,id)==='menu';}
function menuItems(model,state,id=state.nodeId){return list(model.nodes[id]?.items).filter(item=>!(String(item.to).startsWith('print-')&&!state.printer.fitted));}
function parentOf(model,id){return model.nodes[id]?.parentId || (id==='weekly-running'?'weekly-menu':'status');}
function chain(model,id){const out=[];while(id&&id!=='status'&&!out.includes(id)){out.unshift(id);id=parentOf(model,id);}return out;}
function addressDevice(model,value){return model.fixture.devices.find(d=>d.address===Number(value));}
function numbered(model,type,value){return model.fixture[type].find(x=>(x.number ?? Number(x.id.replace(/\D/g,'')))===Number(value));}
function entityDraft(model,state,id){
  if(id==='zones'){const z=numbered(model,'zones',state.form.zone);state.form.status=state.disabledZones.includes(z?.id)?'DISABLED':'ENABLED';state.form.test=state.weeklyTest||state.testZones.includes(z?.id)?'YES':'NO';}
  if(id==='sectors'){const s=numbered(model,'sectors',state.form.sector);state.form.status=state.disabledSectors.includes(s?.id)?'DISABLED':'ENABLED';}
  if(id==='device-details'){const d=addressDevice(model,state.form.device);state.form.status=state.disabledDevices.includes(d?.id)?'DISABLED':'ENABLED';if(d)state.selectedDevice=d.id;}
  if(id==='channels'){const c=model.channels[state.form.channel];state.form.status=state.disabledChannels.includes(c?.id)?'DISABLED':'ENABLED';if(c)state.selectedChannel=c.id;}
}
function openNode(model,state,id,{restoreDraft=false}={}){
  if(id==='status'){state.nodeId='status';state.menuOpen=false;state.form={};state.cursor=0;state.menuIndex=0;state.trail=[];return;}
  if(!model.nodes[id]&&id!=='weekly-running'){reject(state,'LEFT_SOFT','This screen has no verified Nano route.','source-limit');return;}
  if(nodeAccess(model,id)>state.accessLevel&&id!=='pin'&&!isReference(model.nodes[id])){state.nodeId='pin';state.menuOpen=true;state.form={pin:'0000'};state.cursor=0;state.trail=chain(model,'pin');state.menuIndex=0;state.message='Customer mode is required. Enter the FINDR practice code, then select the operation again.';return;}
  state.nodeId=id;state.menuOpen=true;state.menuIndex=0;state.cursor=0;state.viewIndex=0;state.trail=chain(model,id);
  if(!restoreDraft)state.form={};
  if(id==='pin')state.form={pin:'0000'};
  if(id==='zones')state.form={zone:1,status:'ENABLED',test:'NO'};
  if(id==='sectors')state.form={sector:1,status:'ENABLED'};
  if(id==='device-details')state.form={device:model.devices[state.selectedDevice]?.address || model.fixture.devices[0]?.address||1,status:'ENABLED'};
  if(id==='channels')state.form={channel:state.selectedChannel || model.channelList[0]?.id,status:'ENABLED'};
  if(['zones','sectors','device-details','channels'].includes(id))entityDraft(model,state,id);
  if(id==='other-alarms')state.form=Object.fromEntries(OUTPUTS.map(k=>[k,state.disabledOutputs.includes(k)?'DISABLED':'ENABLED']));
  if(id==='clock')state.form=clone(state.clock);
  if(id==='day-night'&&!restoreDraft)state.form={override:state.dayOverride};
  if(id==='loop-map'){state.form={device:model.devices[state.selectedDevice]?.address || model.fixture.devices[0]?.address||1};}
  if(id==='print-historic')state.form={first:1,last:Math.max(1,state.history.length)};
  if(id==='display-test'){state.displayTestRemainingMs=8000;emit(state,'display-test-started','Display test started');}
}
function fieldSpecs(model,state){
  const enumField=(name,label,values)=>({name,label,values});const num=(name,label,min,max)=>({name,label,min,max});
  switch(state.nodeId){
    case 'pin':return[{name:'pin',label:`Practice code · digit ${state.cursor+1}`,kind:'pin',min:0,max:9}];
    case 'zones':return[num('zone','Zone',1,16),enumField('status','Zone status',['ENABLED','DISABLED']),enumField('test','Zone test',['NO','YES'])];
    case 'sectors':return[num('sector','Sector',1,16),enumField('status','Sector status',['ENABLED','DISABLED'])];
    case 'device-details':return[enumField('device','Device',model.fixture.devices.map(d=>d.address)),...(state.deviceDisablementLevel<=state.accessLevel?[enumField('status','Device status',['ENABLED','DISABLED'])]:[])];
    case 'loop-map':return[enumField('device','Device',model.fixture.devices.map(d=>d.address))];
    case 'channels':return[enumField('channel','Interface channel',model.channelList.map(c=>c.id)),...(state.deviceDisablementLevel<=state.accessLevel?[enumField('status','Channel status',['ENABLED','DISABLED'])]:[])];
    case 'other-alarms':return OUTPUTS.map(k=>enumField(k,{masterAlarms:'Master Alarms',fireRelay:'Fire Relay',evacuateInput:'Evacuate Input'}[k],['ENABLED','DISABLED']));
    case 'clock':return[num('hour','Hour',0,23),num('minute','Minute',0,59),num('day','Day',1,new Date(Date.UTC(state.form.year,state.form.month,0)).getUTCDate()),num('month','Month',1,12),num('year','Year',2000,2099)];
    case 'day-night':return[enumField('override','Level 2 Override',['NONE','NIGHT','DAY'])];
    case 'print-historic':return[num('first','First Event',1,Math.max(1,state.history.length)),num('last','Last Event',1,Math.max(1,state.history.length))];
    default:return[];
  }
}
function editField(model,state,amount){
  const fields=fieldSpecs(model,state);if(!fields.length)return reject(state,amount>0?'PLUS':'MINUS','This screen has no editable range.');
  if(state.nodeId==='pin'){const chars=state.form.pin.split('');chars[state.cursor]=String(wrap(Number(chars[state.cursor])+amount,0,9));state.form.pin=chars.join('');}
  else{const f=fields[state.cursor%fields.length];if(f.values){const i=f.values.findIndex(v=>String(v)===String(state.form[f.name]));state.form[f.name]=f.values[wrap(i+amount,0,f.values.length-1)];}else state.form[f.name]=wrap(Number(state.form[f.name])+amount,f.min,f.max);
    if(['zone','sector','device','channel'].includes(f.name))entityDraft(model,state,state.nodeId);
    if(state.nodeId==='clock')state.form=validClock(state.form);
  }
  emit(state,'draft-edited','FINDR practice value adjusted',{field:fields[state.cursor%fields.length]?.name});return act(state,amount>0?'PLUS':'MINUS','edit',true,'Draft changed. Save to apply, or Quit to discard.');
}
function setDisabled(state,array,id,value,entity){const present=state[array].includes(id);if(present===value)return false;state[array]=value?uniq([...state[array],id]):state[array].filter(x=>x!==id);emit(state,`${entity}-${value?'disabled':'enabled'}`,`${entity[0].toUpperCase()+entity.slice(1)} ${value?'disabled':'enabled'}`,{[entity]:id},true);state.conditionTimes??={};if(value)state.conditionTimes[`${entity}:${id}`]=stamp(state);else delete state.conditionTimes[`${entity}:${id}`];return true;}
function recheckInputs(model,state){for(const d of model.fixture.devices)if(!['interface','sounder'].includes(d.type)&&state.inputs[d.id]==='fire'&&!disabled(model,state,d.id)&&!state.testSuppressedInputs.includes(d.id))addFire(model,state,d.id,{test:state.weeklyTest||state.testZones.includes(d.zone)});updateOutputs(model,state);}
function saveForm(model,state){
  const id=state.nodeId;
  if(id==='pin'){
    if(state.form.pin!==state.trainingPin)return reject(state,'LEFT_SOFT','Incorrect FINDR practice code. Adjust the four digits or Quit.','authentication-failed');
    state.accessLevel=2;state.authenticatedLevel=2;openNode(model,state,'status');emit(state,'access-granted','Customer mode entered',{accessLevel:2});return act(state,'LEFT_SOFT','authenticate',true,'PANEL IN CUSTOMER MODE. Select the required operation again.');
  }
  if(state.accessLevel<2)return reject(state,'LEFT_SOFT','Customer mode is required.');
  if(id==='zones'){
    const z=numbered(model,'zones',state.form.zone);if(!z)return reject(state,'LEFT_SOFT','Choose a zone in this fictional site.');
    if(state.weeklyTest&&state.form.test==='NO')return reject(state,'LEFT_SOFT','The weekly test keeps all zones in test. Stop Weekly Test to restore them.');
    setDisabled(state,'disabledZones',z.id,state.form.status==='DISABLED','zone');
    const testing=state.form.test==='YES';if(!state.weeklyTest&&state.testZones.includes(z.id)!==testing){state.testZones=testing?uniq([...state.testZones,z.id]):state.testZones.filter(x=>x!==z.id);emit(state,testing?'zone-test-started':'zone-test-stopped',`Zone ${z.number} test ${testing?'started':'stopped'}`,{zone:z.id},true);state.conditionTimes??={};if(testing)state.conditionTimes[`test:${z.id}`]=stamp(state);else delete state.conditionTimes[`test:${z.id}`];}
  }else if(id==='sectors'){
    const s=numbered(model,'sectors',state.form.sector);if(!s)return reject(state,'LEFT_SOFT','Choose a known sector.');setDisabled(state,'disabledSectors',s.id,state.form.status==='DISABLED','sector');
  }else if(id==='device-details'){
    if(state.deviceDisablementLevel>state.accessLevel)return reject(state,'LEFT_SOFT','This practice access variant requires Engineering access for device disablement. The current form is read-only.','access-variant');
    const d=addressDevice(model,state.form.device);if(!d)return reject(state,'LEFT_SOFT','Choose a device fitted to the practice loop.');setDisabled(state,'disabledDevices',d.id,state.form.status==='DISABLED','device');
  }else if(id==='channels'){
    if(state.deviceDisablementLevel>state.accessLevel)return reject(state,'LEFT_SOFT','Channel disablement requires Engineering access in this practice variant.','access-variant');
    const c=model.channels[state.form.channel];if(!c)return reject(state,'LEFT_SOFT','Choose a known interface channel.');setDisabled(state,'disabledChannels',c.id,state.form.status==='DISABLED','channel');
  }else if(id==='other-alarms'){
    for(const output of OUTPUTS)setDisabled(state,'disabledOutputs',output,state.form[output]==='DISABLED','output');
  }else if(id==='clock'){
    state.clock=validClock(state.form);emit(state,'clock-set','Practice clock saved',{clock:clone(state.clock)},true);
  }else if(id==='day-night'){
    state.dayOverride=state.form.override;state.dayOverrideRemainingMs=state.dayOverride==='DAY'?finite(model.fixture.dayNight?.overrideDurationMs,600000):0;
    if(dayState(model,state)==='NIGHT'&&(state.delayRemainingMs||state.verifyRemainingMs)){state.delayRemainingMs=0;state.verifyRemainingMs=0;state.alarmSounders=state.fireEvents.some(e=>!e.test);}
    emit(state,'day-override-set','Day / Night override saved',{override:state.dayOverride},true);
  }else return reject(state,'LEFT_SOFT','No editable operator form is active.');
  const savedEvent=clone(state.lastEvent);recheckInputs(model,state);
  if(savedEvent&&state.lastEvent?.sequence!==savedEvent.sequence)emit(state,savedEvent.type,savedEvent.message,Object.fromEntries(Object.entries(savedEvent).filter(([key])=>!['sequence','at','type','message'].includes(key))));
  const parent=parentOf(model,id);openNode(model,state,parent);return act(state,'LEFT_SOFT','save',true,'Changes saved in the fictional training site.');
}
function resetSystem(model,state){
  state.fireEvents=[];state.testCycles={};state.delayRemainingMs=0;state.verifyRemainingMs=0;state.alarmSounders=false;state.manualSounders=false;state.buzzer=false;state.fireIndex=0;
  recheckInputs(model,state);if(Object.keys(state.faults).length)state.buzzer=true;openNode(model,state,'status');emit(state,'system-reset','System reset',{fireReturned:state.fireEvents.length>0},true);return act(state,'RESET','reset',true,state.fireEvents.length?'The initiating condition is still active; fire has returned.':'Reset complete. Check faults, disablements and tests separately.');
}

export function pressNanoKey(model,previous,rawKey){
  const key=({LEFT:'LEFT_SOFT',RIGHT:'RIGHT_SOFT',VERIFY:'NEXT'})[rawKey]||rawKey,state=clone(previous);state.menuIdleMs=0;state.message='';
  if(!defaultKeys.some(k=>k.id===key))return reject(state,key,'That is not a physical Nano control.');
  if(state.displayTestRemainingMs>0)return reject(state,key,'Wait for the eight-second display test to finish.');
  const emergency=['CANCEL_BUZZER','RESET','SOUND_ALARMS','SILENCE_ALARMS'].includes(key);
  if(emergency){
    const required=key==='CANCEL_BUZZER'?(model.fixture.cancelBuzzerLevel||model.fixture.buzzerAccessLevel||2):2;
    if(state.accessLevel<required){openNode(model,state,'pin');return act(state,key,'authentication-required',true,'Enter the FINDR practice PIN, then press the alarm control again.');}
    if(key==='CANCEL_BUZZER'){state.buzzer=false;emit(state,'buzzer-cancelled','Local buzzer cancelled');return act(state,key,'buzzer',true,'Local buzzer cancelled. Alarm outputs are unchanged.');}
    if(key==='SILENCE_ALARMS'){state.alarmSounders=false;state.manualSounders=false;for(const c of Object.values(state.testCycles))c.elapsedMs=Math.max(5000,c.elapsedMs);updateOutputs(model,state);emit(state,'alarms-silenced','Alarms silenced',{},true);return act(state,key,'silence',true,'Alarms silenced. Fire indications remain latched.');}
    if(key==='SOUND_ALARMS'){state.manualSounders=true;updateOutputs(model,state);emit(state,'alarms-sounded','Alarms sounded',{},true);return act(state,key,'sound',true,'Enabled alarm outputs sounded. Disabled outputs remain disabled.');}
    return resetSystem(model,state);
  }
  if(state.nodeId==='status'){
    if(key==='LEFT_SOFT'){openNode(model,state,model.menuRootId);emit(state,'menu-opened','Menu opened');return act(state,key,'navigate');}
    if(key==='RIGHT_SOFT'){
      if(state.accessLevel===2){state.accessLevel=1;state.authenticatedLevel=0;emit(state,'access-ended','Customer mode ended');return act(state,key,'logout',true,'Logged out of Customer mode.');}
      return reject(state,key,'No right selection is currently shown.');
    }
    if(key==='NEXT'&&(state.delayRemainingMs>0||state.verifyRemainingMs>0)){
      if(state.accessLevel<2){openNode(model,state,'pin');return act(state,key,'authentication-required',true,'Enter the practice PIN, then choose Verify again.');}
      if(state.verifyRemainingMs>0)return reject(state,key,'Verification is already active.');
      state.verifyRemainingMs=finite(model.fixture.dayNight?.verifyDelayMs,60000);state.delayRemainingMs=0;emit(state,'verification-started','Verification delay started',{},true);return act(state,key,'verify',true,'FINDR verification countdown started. Durations are fictional site settings.');
    }
    if(['PLUS','MINUS'].includes(key)){
      const count=state.fireEvents.length>1?state.fireEvents.length-1:Object.keys(state.faults).length;
      if(count){state.fireIndex=wrap(state.fireIndex+(key==='PLUS'?1:-1),0,count-1);emit(state,state.fireEvents.length?'fire-scrolled':'fault-scrolled','Event selection changed',{index:state.fireIndex});return act(state,key,'scroll');}
    }
    return reject(state,key,'Read the current selection labels. Menu opens with the left selection button.');
  }
  const node=model.nodes[state.nodeId];
  if(key==='RIGHT_SOFT'){
    const previousId=state.nodeId;openNode(model,state,parentOf(model,previousId));
    emit(state,'form-quit','Returned without saving the abandoned draft',{from:previousId});return act(state,key,'back',true,'Returned. Unsaved draft changes were discarded.');
  }
  if(isReference(node))return reject(state,key,node.note || 'This engineering or version-dependent route is reference-only.','source-limit');
  if(isMenu(model,state.nodeId)){
    const items=menuItems(model,state);if(key==='NEXT'){state.menuIndex=wrap(state.menuIndex+1,0,Math.max(0,items.length-1));emit(state,'menu-highlighted','Menu choice highlighted',{index:state.menuIndex});return act(state,key,'navigate');}
    if(key==='LEFT_SOFT'){const item=items[state.menuIndex];if(!item)return reject(state,key,'This menu has no selectable operator item.');openNode(model,state,item.to);emit(state,'menu-selected',`Selected ${item.label}`,{nodeId:state.nodeId});return act(state,key,'navigate',true,state.message);}
    return reject(state,key,'Use Next / Verify to move the menu highlight. Plus and Minus adjust ranges within forms.');
  }
  if(state.nodeId==='weekly-start-stop'&&key==='LEFT_SOFT'){
    state.weeklyTest=!state.weeklyTest;if(!state.weeklyTest)state.testZones=[];
    state.conditionTimes??={};for(const zone of model.fixture.zones){if(state.weeklyTest)state.conditionTimes[`test:${zone.id}`]=stamp(state);else delete state.conditionTimes[`test:${zone.id}`];}
    emit(state,state.weeklyTest?'weekly-test-started':'weekly-test-stopped',state.weeklyTest?'All zones entered weekly test':'All zones left weekly test',{},true);
    openNode(model,state,state.weeklyTest?'weekly-running':'status');return act(state,key,'weekly-test',true,state.weeklyTest?'Weekly test active. All zones are in test.':'Weekly test stopped. Check for any remaining conditions.');
  }
  if(state.nodeId==='weekly-running'){
    if(['PLUS','MINUS'].includes(key)){const mcps=model.fixture.devices.filter(d=>d.type==='mcp');state.weeklyMcpIndex=wrap(state.weeklyMcpIndex+(key==='PLUS'?1:-1),0,Math.max(0,mcps.length-1));emit(state,'weekly-device-scrolled','Next practice call point selected');return act(state,key,'scroll');}
    return reject(state,key,'Plus and Minus view suggested call points. Quit leaves this view, not weekly-test mode.');
  }
  if(state.nodeId==='loop-repair'&&key==='LEFT_SOFT'){
    const active=Object.values(state.faults).filter(f=>f.kind==='loop'&&f.physicalActive!==false);
    for(const f of Object.values(state.faults))if(f.requiresRepair&&f.physicalActive===false)delete state.faults[f.id];
    emit(state,active.length?'loop-repair-unresolved':'loop-repair-completed',active.length?'The wiring condition is still present':'Loop repair check completed',{},true);if(!Object.keys(state.faults).length&&!state.fireEvents.length)state.buzzer=false;
    openNode(model,state,'user-loop');return act(state,key,'repair',true,active.length?'Repair cannot remove a physical wiring fault. Restore its practice cause first.':'The fictional loop is checked. Read the current Loop Status.');
  }
  if(state.nodeId.startsWith('view-')){
    if(['PLUS','MINUS'].includes(key)){const rows=logRows(model,state,state.nodeId.slice(5));state.viewIndex=wrap(state.viewIndex+(key==='PLUS'?1:-1),0,Math.max(0,rows.length-1));emit(state,'log-scrolled','Log event selected',{index:state.viewIndex});return act(state,key,'scroll');}
    return reject(state,key,'Use Plus or Minus to view events, or Quit to return.');
  }
  if(state.nodeId.startsWith('print-')&&key==='LEFT_SOFT'){
    if(!state.printer.fitted)return reject(state,key,'The practice panel has no connected printer.','configuration-limit');
    const kind=state.nodeId.slice(6),rows=logRows(model,state,kind),first=state.form.first||1,last=state.form.last||rows.length;
    if(first>last)return reject(state,key,'The first event must not be after the last event.');
    state.printer.jobs.push({kind,first,last,count:rows.slice(first-1,last).length,at:stamp(state)});emit(state,'log-printed','FINDR simulated print job recorded',{kind},true);openNode(model,state,parentOf(model,state.nodeId));return act(state,key,'print',true,'A simulated print job was recorded.');
  }
  if(state.nodeId==='loop-map'&&key==='LEFT_SOFT'){state.selectedDevice=addressDevice(model,state.form.device)?.id;openNode(model,state,'device-details');emit(state,'device-viewed','Device details displayed',{device:state.selectedDevice});return act(state,key,'navigate');}
  const fields=fieldSpecs(model,state);
  if(key==='NEXT'&&fields.length){state.cursor=wrap(state.cursor+1,0,state.nodeId==='pin'?3:fields.length-1);emit(state,'field-selected','Next field selected',{cursor:state.cursor});return act(state,key,'cursor');}
  if(['PLUS','MINUS'].includes(key)&&fields.length)return editField(model,state,key==='PLUS'?1:-1);
  if(key==='LEFT_SOFT'&&fields.length)return saveForm(model,state);
  return reject(state,key,'Use the displayed Back / Quit selection to return.');
}

export function tickNano(model,previous,milliseconds){
  const state=clone(previous),ms=Math.max(0,Math.min(86400000,finite(milliseconds)));if(!ms)return state;
  state.elapsedMs+=ms;state.menuIdleMs+=ms;
  if(state.displayTestRemainingMs){state.displayTestRemainingMs=Math.max(0,state.displayTestRemainingMs-ms);if(!state.displayTestRemainingMs){openNode(model,state,'status');emit(state,'display-test-ended','Display test finished');state.message='Display test finished. Read the normal status and indicators.';}}
  for(const [id,cycle] of Object.entries(state.testCycles)){
    const before=cycle.elapsedMs;cycle.elapsedMs+=ms;cycle.phase=cycle.elapsedMs<5000?'sound':'reset';
    if(before<5000&&cycle.elapsedMs>=5000)emit(state,'test-alarms-silenced','Test alarms automatically silenced after five seconds',{device:id});
    if(cycle.elapsedMs>=10000){state.fireEvents=state.fireEvents.filter(e=>!(e.device===id&&e.test));delete state.testCycles[id];state.testSuppressedInputs=uniq([...state.testSuppressedInputs,id]);emit(state,'test-reset','Test fire automatically reset after a further five seconds',{device:id},true);}
  }
  const countdown=state.verifyRemainingMs?'verifyRemainingMs':state.delayRemainingMs?'delayRemainingMs':null;
  if(countdown){state[countdown]=Math.max(0,state[countdown]-ms);if(!state[countdown]){state.alarmSounders=state.fireEvents.some(e=>!e.test);emit(state,'delayed-alarms-activated','FINDR delay elapsed; enabled alarm outputs activated',{},true);}}
  if(state.dayOverrideRemainingMs){state.dayOverrideRemainingMs=Math.max(0,state.dayOverrideRemainingMs-ms);if(!state.dayOverrideRemainingMs){state.dayOverride='NONE';emit(state,'day-override-ended','FINDR Day override expired',{},true);if(dayState(model,state)==='NIGHT'&&(state.delayRemainingMs||state.verifyRemainingMs)){state.delayRemainingMs=0;state.verifyRemainingMs=0;state.alarmSounders=state.fireEvents.some(e=>!e.test);}}}
  if((state.menuOpen||state.accessLevel>1)&&state.menuIdleMs>=IDLE_MS){openNode(model,state,'status');state.accessLevel=1;state.authenticatedLevel=0;emit(state,'menu-timed-out','FINDR timeout returned to level 1');state.message='The practice session timed out. Unsaved edits were discarded.';}
  if(!state.fireEvents.length&&!Object.keys(state.faults).length)state.buzzer=false;
  updateOutputs(model,state);state.lastAction={key:'TRAINER_TICK',type:'time',ok:true,message:'Simulated time advanced.'};return state;
}

/** Leaving ends transient training tests and access, not persistent disablements. */
export function leaveNano(model,previous){
  const state=clone(previous);const testDevices=uniq([...Object.keys(state.testCycles),...state.fireEvents.filter(e=>e.test).map(e=>e.device),...state.testSuppressedInputs]);
  state.fireEvents=state.fireEvents.filter(e=>!e.test);for(const id of testDevices)if(state.inputs[id]==='fire')state.inputs[id]='normal';
  state.weeklyTest=false;state.testZones=[];state.testCycles={};state.testSuppressedInputs=[];state.displayTestRemainingMs=0;state.accessLevel=1;state.authenticatedLevel=0;state.dayDraft=null;openNode(model,state,'status');
  if(!state.fireEvents.length&&!Object.keys(state.faults).length)state.buzzer=false;updateOutputs(model,state);state.lastAction=null;state.message='';return state;
}

/** Restore only known fictional entities; old model/source sessions are rejected. */
export function restoreNanoState(model,snapshot){
  if(!snapshot||snapshot.version!==VERSION||snapshot.panelId!==model.id||snapshot.fixtureId!==model.fixture.id||snapshot.mapVersion!==model.mapVersion||snapshot.sourceFingerprint!==model.sourceFingerprint)return createNanoState(model);
  const s=base(model);s.scenarioId=model.scenarioById[snapshot.scenarioId]?snapshot.scenarioId:'normal';
  s.clock=validClock(snapshot.clock);s.deviceDisablementLevel=snapshot.deviceDisablementLevel===3?3:model.fixture.deviceDisablementLevel;
  for(const d of model.fixture.devices)s.inputs[d.id]=(['interface','sounder'].includes(d.type)?['normal','fault']:['normal','fire','fault']).includes(snapshot.inputs?.[d.id])?snapshot.inputs[d.id]:'normal';
  for(const [name,known] of [['disabledDevices',model.devices],['disabledZones',model.zones],['disabledSectors',model.sectors],['disabledChannels',model.channels]])s[name]=uniq(list(snapshot[name]).filter(id=>Object.hasOwn(known,id)));
  s.disabledOutputs=uniq(list(snapshot.disabledOutputs).filter(id=>OUTPUTS.includes(id)));
  s.conditionTimes={};for(const [name,entity] of [['disabledDevices','device'],['disabledZones','zone'],['disabledSectors','sector'],['disabledChannels','channel'],['disabledOutputs','output']])for(const id of s[name])s.conditionTimes[`${entity}:${id}`]=txt(snapshot.conditionTimes?.[`${entity}:${id}`]||stamp(s),40);
  s.history=list(snapshot.history).slice(0,MAX_HISTORY).filter(e=>e&&typeof e==='object').map(e=>({type:txt(e.type,60),message:txt(e.message),sequence:Math.max(0,Math.trunc(finite(e.sequence))),at:txt(e.at||e.timestamp,40),origin:txt(e.origin,40),...(model.devices[e.device]?{device:e.device}:{}),...(model.zones[e.zone]?{zone:e.zone}:{})}));
  s.sequence=Math.max(Math.trunc(finite(snapshot.sequence)),...s.history.map(e=>e.sequence),0);
  const temporary=new Set([...Object.keys(snapshot.testCycles||{}),...list(snapshot.testSuppressedInputs),...list(snapshot.fireEvents).filter(e=>e.test).map(e=>e.device)]);
  for(const id of temporary)if(s.inputs[id]==='fire')s.inputs[id]='normal';
  s.fireEvents=list(snapshot.fireEvents).filter(e=>model.devices[e.device]&&!['interface','sounder'].includes(model.devices[e.device].type)&&!e.test).map(e=>({device:e.device,zone:model.devices[e.device].zone,sequence:Math.max(0,Math.trunc(finite(e.sequence))),at:txt(e.at,40),test:false})).filter((e,i,rows)=>rows.findIndex(x=>x.device===e.device)===i);
  for(const raw of Object.values(snapshot.faults||{})){
    const f=model.knownFaults[raw?.id] || (typeof raw?.id==='string'&&raw.id.startsWith('input:')&&model.devices[raw.id.slice(6)]?{id:raw.id,device:raw.id.slice(6),kind:'device',message:'Lost Device'}:null);
    if(f)s.faults[f.id]={...clone(f),physicalActive:raw.physicalActive!==false,at:txt(raw.at||stamp(s),40)};
  }
  s.dayOverride=['NONE','NIGHT','DAY'].includes(snapshot.dayOverride)?snapshot.dayOverride:'NONE';s.dayOverrideRemainingMs=Math.max(0,Math.min(finite(model.fixture.dayNight?.overrideDurationMs,600000),finite(snapshot.dayOverrideRemainingMs)));
  s.delayRemainingMs=Math.max(0,Math.min(finite(model.fixture.dayNight?.dayDelayMs,30000),finite(snapshot.delayRemainingMs)));s.verifyRemainingMs=Math.max(0,Math.min(finite(model.fixture.dayNight?.verifyDelayMs,60000),finite(snapshot.verifyRemainingMs)));
  s.manualSounders=snapshot.manualSounders===true;s.alarmSounders=snapshot.alarmSounders===true;s.buzzer=snapshot.buzzer===true;
  if(!s.fireEvents.length){s.alarmSounders=false;s.delayRemainingMs=0;s.verifyRemainingMs=0;}
  for(const d of model.fixture.devices)if(s.inputs[d.id]==='fault'&&!Object.values(s.faults).some(f=>f.device===d.id))addFault(s,{id:`input:${d.id}`,device:d.id,kind:'device',message:'Lost Device',sounder:!!d.sounder});
  recheckInputs(model,s);updateOutputs(model,s);s.lastEvent=null;s.lastAction=null;return s;
}

function disablementRows(model,state){
  return [...state.disabledDevices.map(id=>({type:'device-disabled',message:'Device Disabled',device:id,detail:`Device ${model.devices[id].address}: ${model.devices[id].label}`})),...state.disabledZones.map(id=>({type:'zone-disabled',message:'Zone Disabled',zone:id,detail:`Zone ${model.zones[id].number}: ${model.zones[id].label}`})),...state.disabledSectors.map(id=>({type:'sector-disabled',message:'Sector Disabled',sector:id,detail:`Sector ${model.sectors[id].number}: ${model.sectors[id].label}`})),...state.disabledChannels.map(id=>({type:'channel-disabled',message:'Channel Disabled',channel:id,detail:model.channels[id].label})),...state.disabledOutputs.map(id=>({type:'output-disabled',message:({masterAlarms:'Master Alarms disabled',fireRelay:'Fire Relay disabled',evacuateInput:'Evacuate Input disabled'})[id],output:id}))].map(row=>{const entity=row.type.split('-')[0];return {...row,at:state.conditionTimes?.[`${entity}:${row[entity]}`]||'FINDR scenario start'};});
}
function testZoneIds(model,state){return state.weeklyTest?model.fixture.zones.map(z=>z.id):state.testZones;}
function logRows(model,state,kind){
  if(kind==='historic')return state.history;
  if(kind==='fire')return [...state.fireEvents].reverse().map(e=>({...e,message:`Fire: ${model.devices[e.device]?.label}`,detail:`Device ${model.devices[e.device]?.address} / Zone ${model.zones[e.zone]?.number}`}));
  if(kind==='fault')return Object.values(state.faults).map(f=>({...f,detail:f.device?model.devices[f.device]?.label:f.physicalActive===false?'Cause restored; Repair pending':'FINDR condition active'}));
  if(kind==='disablement')return disablementRows(model,state);
  if(kind==='test')return testZoneIds(model,state).map(zone=>({type:'zone-test',zone,message:'Zone in Test',at:state.conditionTimes?.[`test:${zone}`]||'FINDR scenario start',detail:`Zone ${model.zones[zone]?.number}: ${model.zones[zone]?.label}`}));
  return[];
}
function statusFor(model,state){
  const fireCount=state.fireEvents.length,faultCount=Object.keys(state.faults).length,disablementCount=disablementRows(model,state).length,testCount=testZoneIds(model,state).length;
  const timers=[];if(state.displayTestRemainingMs)timers.push({kind:'display-test',remainingMs:state.displayTestRemainingMs});
  for(const c of Object.values(state.testCycles))timers.push({kind:c.elapsedMs<5000?'weekly-test-sound':'weekly-test-reset',remainingMs:(c.elapsedMs<5000?5000:10000)-c.elapsedMs});
  if(state.delayRemainingMs)timers.push({kind:'day-delay',remainingMs:state.delayRemainingMs});if(state.verifyRemainingMs)timers.push({kind:'verify-delay',remainingMs:state.verifyRemainingMs});
  if(state.dayOverrideRemainingMs)timers.push({kind:'day-override',remainingMs:state.dayOverrideRemainingMs});
  if(state.menuOpen||state.accessLevel>1)timers.push({kind:'access-timeout',remainingMs:Math.max(0,IDLE_MS-state.menuIdleMs)});
  timers.sort((a,b)=>a.remainingMs-b.remainingMs);
  return {normal:!fireCount&&!faultCount&&!disablementCount&&!testCount&&!state.sounders&&!state.displayTestRemainingMs,fireCount,faultCount,disablementCount,testCount,buzzer:state.buzzer||state.displayTestRemainingMs>0,sounders:state.sounders,manualSounders:state.manualSounders,masterAlarmsActive:state.masterAlarmsActive,fireRelayActive:state.fireRelayActive,plantActive:state.plantActive,accessLevel:state.accessLevel,authenticatedLevel:state.authenticatedLevel,weeklyTest:state.weeklyTest,dayOverride:state.dayOverride,dayState:dayState(model,state),displayTest:state.displayTestRemainingMs>0,displayTestRemainingMs:state.displayTestRemainingMs,testCycleCount:Object.keys(state.testCycles).length,fireZones:uniq(state.fireEvents.map(e=>e.zone)),fireDevices:state.fireEvents.map(e=>e.device),timerRemainingMs:timers[0]?.remainingMs||0,timerKind:timers[0]?.kind||null,timers};
}
function displayScreen(model,state,status){
  const id=state.nodeId,node=model.nodes[id],fields=fieldSpecs(model,state),field=fields[state.cursor%Math.max(1,fields.length)],f={...state.form},b=(name,value=f[name])=>field?.name===name?`[${value}]`:String(value);
  let heading=node?.title||'Nano Fire Alarm System',lines=[],left='',right='Quit';
  if(id==='status'){
    heading=state.fireEvents.length?'FIRE':Object.keys(state.faults).length?'FAULT':state.weeklyTest?'Weekly Fire Test':'Nano Fire Alarm System';
    left='Menu';right=state.accessLevel>=2?'Logout':'';
    if(state.fireEvents.length){const first=state.fireEvents[0],later=state.fireEvents.length>1?state.fireEvents[1+(state.fireIndex%(state.fireEvents.length-1))]:null;heading=status.faultCount||status.disablementCount||status.testCount?`FAULT:${status.faultCount} DISABLE:${status.disablementCount} TEST:${status.testCount}`:stamp(state);lines=[`FIRST FIRE: Zone ${model.zones[first.zone]?.number}`,`Dv ${model.devices[first.device]?.address} ${model.devices[first.device]?.label}`];if(later)lines.push(`LATEST: Zone ${model.zones[later.zone]?.number}`,`Dv ${model.devices[later.device]?.address} ${model.devices[later.device]?.label}`);const disabledAlarms=[...(state.disabledOutputs.includes('masterAlarms')?['MA']:[]),...(state.disabledSectors.length?[`Sector ${state.disabledSectors.map(id=>model.sectors[id]?.number).join(',')}`]:[])];lines.push(disabledAlarms.length?`${disabledAlarms.join(' + ')} Disabled`:`Total Fires: ${state.fireEvents.length}`);if(state.delayRemainingMs||state.verifyRemainingMs)lines.push(`${state.verifyRemainingMs?'VERIFY':'DELAY'} ${Math.ceil((state.verifyRemainingMs||state.delayRemainingMs)/1000)}s`);}
    else if(status.faultCount){const fault=Object.values(state.faults)[state.fireIndex%status.faultCount];lines=[`FAULT:${status.faultCount} DISABLE:${status.disablementCount} TEST:${status.testCount}`,fault.message,...(fault.device?[model.devices[fault.device]?.label]:[]),fault.physicalActive===false?'Cause restored; loop Repair pending':''];}
    else lines=[stamp(state),model.fixture.localLabel||'Gent by Honeywell',state.accessLevel>=2?'PANEL IN CUSTOMER MODE':'',`FAULT:${status.faultCount} DISABLE:${status.disablementCount} TEST:${status.testCount}`,...(state.weeklyTest?['ALL ZONES IN TEST STATE']:[])];
  }else if(isMenu(model,id)){left='Select';right='Back';const items=menuItems(model,state);lines=items.slice(Math.max(0,state.menuIndex-4),Math.max(0,state.menuIndex-4)+5).map((item,index)=>`${index+Math.max(0,state.menuIndex-4)===state.menuIndex?'›':' '} ${item.label}${isMenu(model,item.to)?' >':''}`);}
  else if(isReference(node)){heading='Reference only';lines=[node.title,...list(node.lines),node.note||'This route is not simulated.'].filter(Boolean);right='Back';}
  else if(id==='pin'){heading='User Access Code Entry';const masked=state.form.pin.split('').map((d,i)=>i===state.cursor?d:'*').join('');lines=[`Enter User Code : [${masked}]`,`Digit ${state.cursor+1} of 4`];left='Accept';}
  else if(id==='weekly-start-stop'){heading=state.weeklyTest?'Stop Weekly Fire Test':'Start Weekly Fire Test';lines=['Warning!',state.weeklyTest?'All zones will leave test state.':'All zones will enter test state.','ARE YOU SURE YOU WANT TO PROCEED?'];left='Yes';right='No';}
  else if(id==='weekly-running'){const mcps=model.fixture.devices.filter(d=>d.type==='mcp'),d=mcps[state.weeklyMcpIndex%Math.max(1,mcps.length)];heading='Weekly Fire Test';lines=['ALL ZONES IN TEST STATE','Next manual call point to be tested:',d?`Dev ${d.address} ${d.label}`:'No call point in this fixture',d?`Zn ${model.zones[d.zone]?.number} ${model.zones[d.zone]?.label}`:'','+/- More'];}
  else if(id==='zones'){const z=numbered(model,'zones',f.zone);lines=[`Zone : ${b('zone')}`,`Label: ${z?.label||'Unassigned'}`,`Status : ${b('status')}`,`Test : ${b('test')}`];left='Save';}
  else if(id==='sectors'){const s=numbered(model,'sectors',f.sector);lines=[`Sector : ${b('sector')}`,`Label : ${s?.label||'Unassigned'}`,`Activation Control : ${s?.activationControl||'EVACUATE'}`,`Status Control : ${b('status')}`,`Current State : ${state.sectorOutputs[s?.id]?'ACTIVE':'IDLE'}`];left='Save';}
  else if(id==='loop-map'){const index=Math.max(0,model.fixture.devices.findIndex(d=>d.address===Number(f.device))),offset=Math.max(0,index-3);lines=model.fixture.devices.slice(offset,offset+5).map(d=>`${d.address===Number(f.device)?'›':' '} ${d.address}${d.safeAddress?'+':''} ${d.label}`);left='Select';}
  else if(id==='device-details'){const d=addressDevice(model,f.device);lines=[`Device : ${b('device')}`,`Label : ${d?.label||'Not fitted'}`,`Type : ${d?.model||d?.type||''}`,`Status : ${b('status')}`,...(d?.zone?[`Assigned to Zone ${model.zones[d.zone]?.number}`]:[])];left=state.deviceDisablementLevel<=state.accessLevel?'Save':'';}
  else if(id==='channels'){const c=model.channels[f.channel];lines=[`Channel: ${b('channel',c?`Device ${model.devices[c.device]?.address} Channel ${c.number}`:'None')}`,`Label : ${c?.label||''}`,`Status : ${b('status')}`];left=state.deviceDisablementLevel<=state.accessLevel?'Save':'';right='Back';}
  else if(id==='other-alarms'){heading='Alarms Status';lines=[`Master Alarms : ${state.masterAlarmsActive?'ACTIVE':'INACTIVE'}`,`Enable Status : ${b('masterAlarms')}`,`Fire Relay : ${state.fireRelayActive?'ACTIVE':'INACTIVE'} ${b('fireRelay')}`,`Evacuate Input : INACTIVE ${b('evacuateInput')}`];left='Save';}
  else if(id==='clock'){heading='System Clock';lines=[`Current Time : ${b('hour')}:${b('minute')}`,`Current Date : ${b('day')}/${b('month')}/${b('year')}`,`Current Day : ${new Date(Date.UTC(f.year,f.month-1,f.day)).toLocaleDateString('en-GB',{weekday:'long',timeZone:'UTC'})}`];left='Save';}
  else if(id==='day-night'){heading='Day Mode Control';lines=[`Mode: ${model.fixture.dayNight?.mode||'CALENDAR'}  State: ${dayState(model,state)}`,`Level 2 Override: ${b('override')}`];left='Save';}
  else if(id==='loop-status'){heading='Loop status';lines=['Current status : Started',`Total devices : ${model.fixture.devices.length}`,`Wiring Status : ${Object.values(state.faults).some(x=>x.kind==='loop')?'Fault / repair pending':'Complete'}`,`Last device found at address : ${Math.max(...model.fixture.devices.map(d=>d.address))}`];right='Back';}
  else if(id==='loop-repair'){heading='Loop Repair';lines=['Warning! Ensure loop wiring faults','have been cleared before continuing.','','ARE YOU SURE YOU WANT TO PROCEED?'];left='Yes';right='No';}
  else if(id==='firmware'){heading='Firmware Version Numbers';lines=[`Main Controller ${model.fixture.firmware?.mainController||'V3.xx source profile'}`,`Loop Driver ${model.fixture.firmware?.loopDriver||'Source example only'}`,`Vig Compact PSU ${model.fixture.firmware?.psu||'Source example only'}`];right='Back';}
  else if(id==='site-data'){heading='Site Data Version Details';lines=[`Version Number: ${String(model.fixture.siteData?.version||1).padStart(3,'0')}`,`Last Updated: ${model.fixture.siteData?.updated||'2026-10-30'}`,'FINDR fictional site'];right='Back';}
  else if(id.startsWith('view-')){const kind=id.slice(5),rows=logRows(model,state,kind),entry=rows[state.viewIndex%Math.max(1,rows.length)];heading=`${({historic:'Event',fire:'Fire',fault:'Fault',disablement:'Disablement',test:'Test'})[kind]} Log (${rows.length})`;lines=entry?[`${state.viewIndex+1}: ${entry.at||entry.timestamp||'Current condition'}`,entry.message,entry.detail||'',entry.device?model.devices[entry.device]?.label:'']:['No active entries'];}
  else if(id.startsWith('print-')){heading='Print Event Log';lines=['FINDR printer simulation',...(id==='print-historic'?[`First Event to Print ${b('first')}`,`Last Event to Print ${b('last')}`]:['This prints the complete active log.'])];left=state.printer.fitted?'Print':'';}
  if(state.displayTestRemainingMs>0){heading='';lines=[];left='';right='';}
  return {heading:txt(heading,40),lines:lines.slice(0,6).map(x=>txt(x,40)),softKeys:[...(left?[{key:'LEFT_SOFT',label:left,enabled:true}]:[]),...(right?[{key:'RIGHT_SOFT',label:right,enabled:true}]:[])],field:field?{...field,value:state.form[field.name],displayValue:field.kind==='pin'?state.form.pin.split('').map((d,i)=>i===state.cursor?d:'*').join(''):String(state.form[field.name]),cursor:state.cursor}:null,message:state.message,displayTest:state.displayTestRemainingMs>0};
}
export function nanoView(model,state){
  const status=statusFor(model,state),node=model.nodes[state.nodeId],faults=Object.values(state.faults),screen=displayScreen(model,state,status),firstZone=state.fireEvents[0]?.zone;
  const flags={power:true,fire:status.fireCount>0,fault:status.faultCount>0,disablement:status.disablementCount>0,test:status.testCount>0,delay:dayState(model,state)==='DAY',verify:state.verifyRemainingMs>0,'system-fault':faults.some(f=>f.kind==='system'),'power-fault':faults.some(f=>f.kind==='power'),'sounder-fault':faults.some(f=>f.kind==='sounder'||f.sounder||model.devices[f.device]?.sounder),'sounder-disablement':state.disabledOutputs.includes('masterAlarms')||state.disabledSectors.length>0||state.disabledDevices.some(id=>model.devices[id]?.sounder||model.devices[id]?.type==='sounder')};
  const leds=model.leds.map(l=>({...l,state:state.displayTestRemainingMs>0||flags[l.id]?'on':'off'}));
  const zones=model.fixture.zones.map(z=>({...z,disabled:state.disabledZones.includes(z.id),test:testZoneIds(model,state).includes(z.id),fire:status.fireZones.includes(z.id),state:state.displayTestRemainingMs>0?'on':status.fireZones.includes(z.id)?z.id===firstZone?'flashing':'on':'off',flashing:z.id===firstZone&&status.fireZones.includes(z.id)}));
  const devices=model.fixture.devices.map(d=>({...d,input:state.inputs[d.id],allowedInputs:['sounder','interface'].includes(d.type)?['normal','fault']:['normal','fire','fault'],disabled:state.disabledDevices.includes(d.id),effectivelyDisabled:disabled(model,state,d.id),fire:status.fireDevices.includes(d.id)}));
  const refs=node?.sourceRefs||[{sourceId:'nano-operator-9',pages:status.fireCount?[12,13,14]:status.faultCount?[15,16]:status.disablementCount?[17]:[6,7,8,9]}];
  const note=[node?.note,...(state.nodeId==='channels'?['The source warns that Find can operate relay outputs. FINDR provides channel records and optional disablement practice; it has no Find output action.']:[])].filter(Boolean).join(' ');
  return {panelId:model.id,nodeId:state.nodeId,menuOpen:state.menuOpen,screen,message:state.message,softKeys:screen.softKeys,physicalKeys:model.physicalKeys.map(k=>({...k,enabled:state.displayTestRemainingMs===0})),keys:model.physicalKeys,leds,zones,devices,status,breadcrumb:state.trail.map(id=>({id,title:model.nodes[id]?.title||id})),references:clone(refs),note,form:clone(state.form),cursor:state.cursor,menuIndex:state.menuIndex,viewIndex:state.viewIndex,events:clone(state.history),lastAction:clone(state.lastAction),lastEvent:clone(state.lastEvent),faults:clone(faults),clock:clone(state.clock),printer:clone(state.printer),activeLog:[...logRows(model,state,'fire'),...logRows(model,state,'fault'),...disablementRows(model,state),...logRows(model,state,'test')],displayTestRemainingMs:state.displayTestRemainingMs,testCycles:clone(state.testCycles),sectors:model.fixture.sectors.map(s=>({...s,disabled:state.disabledSectors.includes(s.id),active:state.sectorOutputs[s.id]===true})),channels:model.channelList.map(c=>({...c,disabled:state.disabledChannels.includes(c.id)}))};
}

export function evaluateNanoConditions(model,state,conditions){
  if(Array.isArray(conditions))return conditions.every(c=>evaluateNanoConditions(model,state,c));
  if(!conditions||typeof conditions!=='object')return false;const c=conditions,v=c.value,status=statusFor(model,state);
  if(c.type==='all')return list(c.conditions).every(x=>evaluateNanoConditions(model,state,x));if(c.type==='any')return list(c.conditions).some(x=>evaluateNanoConditions(model,state,x));
  if(c.type==='page')return state.nodeId===v;
  if(c.type==='field')return String(state.form[c.name]??'')===String(v);
  if(c.type==='cursor')return state.cursor===v;
  if(c.type==='menuIndex')return state.menuIndex===v;
  if(c.type==='viewIndex')return state.viewIndex===v;
  if(c.type==='input')return state.inputs[c.device]===v;
  if(c.type==='deviceDisabled')return !!model.devices[c.device]&&state.disabledDevices.includes(c.device)===v;
  if(c.type==='zoneDisabled')return !!model.zones[c.zone]&&state.disabledZones.includes(c.zone)===v;
  if(c.type==='sectorDisabled')return !!model.sectors[c.sector]&&state.disabledSectors.includes(c.sector)===v;
  if(c.type==='channelDisabled')return !!model.channels[c.channel]&&state.disabledChannels.includes(c.channel)===v;
  if(c.type==='outputDisabled')return OUTPUTS.includes(c.output)&&state.disabledOutputs.includes(c.output)===v;
  if(['zoneTest','testZone'].includes(c.type))return !!model.zones[c.zone]&&testZoneIds(model,state).includes(c.zone)===v;
  if(c.type==='fire')return (status.fireCount>0)===v;
  if(c.type==='fault')return (c.fault?!!state.faults[c.fault]:status.faultCount>0)===v;
  if(c.type==='faultCause')return !!state.faults[c.fault]&&state.faults[c.fault].physicalActive===v;
  if(c.type==='access')return state.accessLevel===v;
  if(c.type==='event')return state.lastEvent?.type===v&&['device','zone','sector','channel','output','fault','override'].every(k=>!c[k]||state.lastEvent[k]===c[k]);
  if(c.type==='menuOpen')return state.menuOpen===v;
  if(c.type==='clock')return Object.entries(v||{}).every(([k,x])=>state.clock[k]===x);
  if(Object.hasOwn(status,c.type))return status[c.type]===v;
  return false;
}

function navigation(model,state,targetId,access=state.accessLevel){
  const queue=[{id:state.nodeId,index:state.menuIndex||0,keys:[],ids:[state.nodeId]}],seen=new Map();
  while(queue.length){queue.sort((a,b)=>a.keys.length-b.keys.length);const current=queue.shift(),identity=`${current.id}:${current.index}`;if(current.id===targetId)return current;if((seen.get(identity)??Infinity)<=current.keys.length)continue;seen.set(identity,current.keys.length);
    const push=(id,keys,index=0)=>{if(id!=='status'&&nodeAccess(model,id)>access&&!isReference(model.nodes[id]))return;queue.push({id,index,keys:[...current.keys,...keys],ids:[...current.ids,id]});};
    if(current.id==='status'){push(model.menuRootId,['LEFT_SOFT']);continue;}
    push(parentOf(model,current.id),['RIGHT_SOFT']);
    if(isReference(model.nodes[current.id]))continue;
    if(isMenu(model,current.id)){
      const items=menuItems(model,state,current.id);items.forEach((item,index)=>{if(isReference(model.nodes[item.to]))return;push(item.to,[...Array(wrap(index-current.index,0,Math.max(0,items.length-1))).fill('NEXT'),'LEFT_SOFT']);});
    }else if(current.id==='loop-map')push('device-details',['LEFT_SOFT']);
  }return null;
}
function pinKeys(state,target){
  const digits=(state.form?.pin||'0000').split(''),keys=[];let cursor=state.cursor||0;
  for(let pass=0;pass<4;pass++){
    const desired=Number(target[cursor]),actual=Number(digits[cursor]),up=wrap(desired-actual,0,9),down=wrap(actual-desired,0,9),key=up<=down?'PLUS':'MINUS';
    keys.push(...Array(Math.min(up,down)).fill(key));digits[cursor]=String(desired);
    if(digits.join('')===target)break;keys.push('NEXT');cursor=(cursor+1)%4;
  }return keys;
}
/** Returns shortest navigation keys, including practice authentication when needed.
 * This never presses a key, saves a draft, disables a point, sounds alarms or resets.
 */
export function findNanoRoute(model,state,targetId){
  const result=(found,keys=[],nodeIds=[],reason='')=>({found,keys,targetId,nodeIds,reason});
  if(targetId!=='status'&&!model.nodes[targetId])return result(false,[],[],'This destination is not in the Nano source map.');
  if(isReference(model.nodes[targetId]))return result(false,[],[],'This route is reference-only; a verified interactive sequence is not available.');
  if(state.nodeId===targetId)return result(true,[],[targetId]);
  if(state.displayTestRemainingMs)return result(false,[],[],'Wait for the display test to finish.');
  const needAccess=Math.max(1,...chain(model,targetId).map(id=>nodeAccess(model,id)));
  if(needAccess>2)return result(false,[],[],'This route requires engineering access outside the operator trainer.');
  if(needAccess>state.accessLevel){
    const toPin=navigation(model,state,'pin',1);if(!toPin)return result(false,[],[],'Return to User > System > Code.');
    const pin=state.nodeId==='pin'?state:{form:{pin:'0000'},cursor:0};const after={...state,nodeId:'status',menuIndex:0,accessLevel:2};const onward=navigation(model,after,targetId,2);
    if(!onward)return result(false,[],[],'This screen needs a deliberate operation before it can be displayed.');
    return result(true,[...toPin.keys,...pinKeys(pin,state.trainingPin),'LEFT_SOFT',...onward.keys],[...toPin.ids,...onward.ids]);
  }
  const route=navigation(model,state,targetId);return route?result(true,route.keys,route.ids):result(false,[],[],'This screen follows a deliberate operation; use its guided lesson.');
}
function valueKey(spec,current,target){
  if(spec.values){const c=spec.values.findIndex(v=>String(v)===String(current)),t=spec.values.findIndex(v=>String(v)===String(target));if(c<0||t<0)return null;const up=wrap(t-c,0,spec.values.length-1),down=wrap(c-t,0,spec.values.length-1);return up<=down?'PLUS':'MINUS';}
  if(!Number.isFinite(Number(target))||Number(target)<spec.min||Number(target)>spec.max)return null;
  const size=spec.max-spec.min+1,up=wrap(Number(target)-Number(current),0,size-1),down=wrap(Number(current)-Number(target),0,size-1);return up<=down?'PLUS':'MINUS';
}
/** Recover a lesson's menu and draft using only advice for physical taps.
 * goal.values never commits; step.nextKey is the learner's explicit commit.
 */
export function nextNanoHint(model,state,step={}){
  const goal=typeof step.goal==='string'?{nodeId:step.goal}:step.goal||{},target=goal.nodeId||state.nodeId;
  const answer=(found,key=null,message='',recovery=false,keys=key?[key]:[])=>({found,key,keys,reason:found?'':message,message,recovery});
  if(!step.allowAccessPrompt&&['CANCEL_BUZZER','RESET','SOUND_ALARMS','SILENCE_ALARMS'].includes(step.nextKey)&&state.accessLevel<2){
    if(state.nodeId==='pin'){const keys=[...pinKeys(state,state.trainingPin),'LEFT_SOFT'];return answer(true,keys[0],'Enter the practice PIN before operating this control.',true,keys);}
    const route=navigation(model,state,'pin',1);return route?answer(true,route.keys[0],'Enter Customer mode first.',true,route.keys):answer(false,null,'Return to the User code form.');
  }
  if(state.nodeId!==target){const route=findNanoRoute(model,state,target);return answer(route.found,route.keys[0]||null,route.found?'Follow the highlighted physical button.':route.reason,true,route.keys);}
  const values=goal.values||{};
  if(state.nodeId==='pin'&&values.pin!==undefined){const value=String(values.pin);if(!/^\d{4}$/.test(value))return answer(false,null,'A practice PIN has four digits.');const keys=pinKeys(state,value);if(keys.length)return answer(true,keys[0],'Adjust the highlighted practice PIN digit.',false,keys);}
  const fields=fieldSpecs(model,state);
  for(const name of Object.keys(values)){
    if(name==='pin'&&state.nodeId==='pin')continue;
    if(String(state.form[name]??'')===String(values[name]))continue;
    const index=fields.findIndex(f=>f.name===name);if(index<0)return answer(false,null,'This value is not editable at the current access level.');
    if(state.cursor!==index)return answer(true,'NEXT',`Move to ${fields[index].label}.`,true);
    const key=valueKey(fields[index],state.form[name],values[name]);return key?answer(true,key,`Set ${fields[index].label} to ${values[name]}.`):answer(false,null,'The requested value is outside the fictional form range.');
  }
  if(goal.cursor!==undefined&&state.cursor!==goal.cursor){if(!Number.isInteger(goal.cursor)||goal.cursor<0||goal.cursor>=(state.nodeId==='pin'?4:fields.length))return answer(false,null,'Unknown form cursor position.');return answer(true,'NEXT','Move to the next field.');}
  if(goal.menuIndex!==undefined&&state.menuIndex!==goal.menuIndex)return answer(true,'NEXT','Move the menu highlight.');
  if(step.nextKey){const key=({LEFT:'LEFT_SOFT',RIGHT:'RIGHT_SOFT',VERIFY:'NEXT'})[step.nextKey]||step.nextKey;
    return answer(true,key,'Press the indicated physical control yourself.');
  }
  return answer(true,null,'The requested screen or draft value is ready.');
}


