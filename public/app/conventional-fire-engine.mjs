// Conventional source-scoped training only. No live panel, device protocol or analogue
// threshold is represented. Every enabled control is bounded by the source pack.
const copy=value=>structuredClone(value);
const array=value=>Array.isArray(value)?value:[];
const unique=value=>[...new Set(value)];
const CFP='c-tec-cfp-standard',SIGMA='kentec-sigma-cp';
const codeKeys={KEY_1:'1',EXIT:'2',NEXT_OPTION:'3',TOGGLE:'4'};
const supportedKeys={
 [CFP]:['KEY_1','EXIT','NEXT_OPTION','TOGGLE','BUZZER','SOUNDERS','RESET','KEYSWITCH'],
 [SIGMA]:['BUZZER','SOUNDERS','RESET','LAMP_TEST','MODE','SELECT','ENTER','KEYSWITCH'],
};
const modes=['d','t','db','Ad']; // Valid targets, NOT a verified MODE cycle order.
const plainText=value=>typeof value==='string'?value:'';
const zoneId=value=>typeof value==='number'?`Z${value}`:String(value||'');
const accessed=s=>s.keyEnabled||s.codeAccess;
const engineeringAccess=s=>Boolean(s.engineering);
const authorised=s=>accessed(s)||(s.profileId===CFP&&engineeringAccess(s));
const isCFP=m=>m.id===CFP;
const isSigma=m=>m.id===SIGMA;
const zoneExists=(m,id)=>m.zones.some(z=>z.id===id);
const disableOptions=(m,s)=>[...m.disableOptions,...(isCFP(m)&&hasConfiguredDelays(s)?['delays']:[])];
const selectedOption=(m,s)=>s.selection?disableOptions(m,s)[s.selection.index]:null;
const refs=(m,id)=>{const feature={'fire-zone-1':'alarm','zone-fault':'fault','power-fault':'fault','sounder-fault':'fault','disabled-zone':'disablement','test-zone':'zone-test'}[id]||id;return copy(m.features.find(f=>f.id===feature)?.sourceRefs||m.physicalKeys.find(k=>k.id===id)?.sourceRefs||m.sourceRefs||[]);};
const activeFaults=(m,s)=>[...m.zones.filter(z=>s.inputs[z.id].fault&&!s.disabledZones.includes(z.id)&&!(isCFP(m)&&s.testZones.includes(z.id))).map(z=>z.id),...Object.entries(s.faults).filter(([,v])=>v).map(([k])=>k),...array(s.diagnostics?.systemFaults),...array(s.diagnostics?.repeaters).map(id=>'repeater-'+id),...(m.id===SIGMA?sigmaActiveFaults(s):[])];
const sounders=s=>s.soundersRequested&&!s.disabledOutputs.includes('sounders')&&(s.profileId===CFP?cfpSounderPath(s):sigmaSounderPath(s));
const disabled=(s,id)=>id==='delays'?s.settings?.delaysEnabled!==false:id.startsWith('Z')?s.disabledZones.includes(id):s.disabledOutputs.includes(id);
function record(m,s,key,ok,message,kind='key',sourceId=key){s.sequence++;s.lastAction={key,kind,ok,message,sequence:s.sequence,sourceRefs:refs(m,sourceId)};s.log.push(copy(s.lastAction));s.log=s.log.slice(-60);return s;}
function reconcile(m,s){
 if(isSigma(m))reconcileSigma(m,s);
 if(isCFP(m)){
  const automatic=[...array(s.settings?.nonLatchingZones),...s.testZones];
  s.fireZones=s.fireZones.filter(id=>!automatic.includes(id)||s.inputs[id].alarm);
  s.silencedZones=s.silencedZones.filter(id=>s.fireZones.includes(id));
 }
 const fresh=m.zones.filter(z=>s.inputs[z.id].alarm&&!s.disabledZones.includes(z.id)&&!s.fireZones.includes(z.id)).map(z=>z.id);
 if(fresh.length){const hadFire=s.fireZones.length>0;s.fireZones.push(...fresh);s.silencedZones=s.silencedZones.filter(id=>!fresh.includes(id));s.buzzerSilenced=false;if(!hadFire||(isCFP(m)?s.settings?.resoundNewZone:!sigmaSet(s,'29')))s.soundersRequested=true;}
 if(isSigma(m))for(const id of fresh){if(!s.testZones.includes(id))s.sigmaLocalRelayRequested=true;const seconds=sigmaDelaySeconds(s);if(s.sigmaConfig?.delaysEnabled&&seconds!==null&&sigmaZoneDelayed(s,id))s.pendingDelays[id]=(s.simulationSeconds||0)+seconds;}
 if(isCFP(m)){
  s.pendingDelays||={};s.testStartedAt||={};
  const now=s.simulationSeconds||0;
  for(const id of s.fireZones){
   if(s.testZones.includes(id)){if(!Number.isFinite(s.testStartedAt[id]))s.testStartedAt[id]=now;}
   else if(s.settings?.delayedZones.includes(id)&&!Number.isFinite(s.pendingDelays[id]))s.pendingDelays[id]=now+(s.settings.delayMinutes*60);
  }
  for(const id of Object.keys(s.testStartedAt))if(!s.fireZones.includes(id)||!s.testZones.includes(id))delete s.testStartedAt[id];
  for(const id of Object.keys(s.pendingDelays))if(id.startsWith('Z')&&!s.fireZones.includes(id))delete s.pendingDelays[id];
  const normal=s.fireZones.filter(id=>!s.testZones.includes(id));
  for(const id of ['remote','auxiliary']){if(normal.length&&s.settings?.delayedOutputs.includes(id)&&!Number.isFinite(s.pendingDelays[id]))s.pendingDelays[id]=now+s.settings.delayMinutes*60;if(!normal.length)delete s.pendingDelays[id];}
  if(!normal.length){s.manualOverride=false;s.overrideDelays=false;}
 }
 if(!s.fireZones.length&&!s.evacuation)s.soundersRequested=false;
 return s;
}
function setDisabled(m,s,id,value){
 if(id==='delays'){s.settings.delaysEnabled=value;reconcile(m,s);return;}
 const target=id.startsWith('Z')?'disabledZones':'disabledOutputs';s[target]=value?unique([...s[target],id]):s[target].filter(x=>x!==id);reconcile(m,s);
}
function enableKey(m,s){s.keyEnabled=!s.keyEnabled;s.codeAccess=false;s.codeBuffer='';s.selection=null;s.modeChooser=false;s.sigmaMode=null;s.lampTest=false;return record(m,s,'KEYSWITCH',true,s.keyEnabled?'Simulated enable key turned on. Authorised controls are available.':'Simulated enable key turned off. Unconfirmed selection discarded; committed disablements remain.');}


const engineeringFunctions=[
 ['coincidence','Coincidence',16],['nonlatching','Non-latching',17],['delays','Delays',17],['test','Test',17],
 ['system-fault','System fault',21],['repeater-fault','Repeater fault',22],['open-circuit','Open circuit',19],['short-circuit','Short circuit',19],['sounder-status','Sounder status',17],
];
const defaultSettings=m=>({coincidencePairs:[],nonLatchingZones:[],delayedZones:[],delayedOutputs:[],delayMinutes:1,resoundNewZone:m.fixture.resoundNewZone!==false,delaysEnabled:true});
const hasConfiguredDelays=s=>Boolean(s.settings?.delayedZones.length||s.settings?.delayedOutputs.length);
const engineeringRefs=(m,id)=>copy(m.engineering?.functions?.find(f=>f.id===id)?.sourceRefs||[{sourceId:'cfp-engineer-rev1',pdfPage:engineeringFunctions.find(f=>f[0]===id)?.[2]||16,printedPage:String(engineeringFunctions.find(f=>f[0]===id)?.[2]||16)}]);
function engineeringRecord(m,s,key,ok,message,kind='engineering',functionId=s.engineering?.functionId){record(m,s,key,ok,message,kind);s.lastAction.sourceRefs=engineeringRefs(m,functionId);s.log[s.log.length-1]=copy(s.lastAction);return s;}
function engineeringOptions(m,id){if(id==='coincidence')return m.zones.filter((_,i)=>i%2===0).map((z,i)=>z.id+'-'+m.zones[i*2+1].id);if(['nonlatching','test'].includes(id))return m.zones.map(z=>z.id);if(id==='delays')return [...m.zones.map(z=>z.id),'remote','auxiliary'];return [];}
function engineeringEnabled(s,fn,id){if(fn==='coincidence')return s.settings.coincidencePairs.includes(id);if(fn==='nonlatching')return s.settings.nonLatchingZones.includes(id);if(fn==='test')return s.testZones.includes(id);if(fn==='delays')return(id.startsWith('Z')?s.settings.delayedZones:s.settings.delayedOutputs).includes(id);return false;}
function engineeringCommit(m,s,fn,id,value){const key=fn==='coincidence'?'coincidencePairs':fn==='nonlatching'?'nonLatchingZones':fn==='delays'?(id.startsWith('Z')?'delayedZones':'delayedOutputs'):null;const target=fn==='test'?s.testZones:s.settings[key];const next=value?unique([...target,id]):target.filter(x=>x!==id);if(fn==='test')s.testZones=next;else s.settings[key]=next;reconcile(m,s);}
function pressEngineering(m,s,key){
 const e=s.engineering,fn=e.functionId,options=engineeringOptions(m,fn);
 if(key==='EXIT'){s.engineering=null;s.selection=null;s.codeAccess=false;s.codeBuffer='';reconcile(m,s);return engineeringRecord(m,s,key,true,'Access level 3 exited. Confirmed settings remain; an unconfirmed training draft was not applied.','engineering',fn);}
 if(key==='NEXT_OPTION'){
  if(!options.length)return engineeringRecord(m,s,key,false,'This function is read-only or uses its documented direct toggle; Next Option does not select a circuit.');
  if(e.optionIndex===null){e.optionIndex=0;e.draftEnabled=engineeringEnabled(s,fn,options[0]);return engineeringRecord(m,s,key,true,options[0]+' selected. Enable/Disable stages a change; Next Option confirms it.');}
  const option=options[e.optionIndex];engineeringCommit(m,s,fn,option,e.draftEnabled);
  const next=e.optionIndex+1;
  // Only delays explicitly wrap to Zone 1 in the source. Other functions return
  // to their overview after the last confirmed item, without inventing a wrap.
  e.optionIndex=next<options.length?next:fn==='delays'?0:null;e.draftEnabled=e.optionIndex===null?false:engineeringEnabled(s,fn,options[e.optionIndex]);
  return engineeringRecord(m,s,key,true,option+' confirmed. '+(e.optionIndex===null?'All listed items recorded; exit or choose the next function.':options[e.optionIndex]+' selected.'));
 }
 if(key==='TOGGLE'){
  if(fn==='sounder-status'){s.settings.resoundNewZone=!s.settings.resoundNewZone;return engineeringRecord(m,s,key,true,s.settings.resoundNewZone?'New-zone resound enabled: three quick flashes then a longer off period.':'New-zone resound disabled: equal on/off periods.');}
  if(!options.length||e.optionIndex===null)return engineeringRecord(m,s,key,false,options.length?'Press Next Option to select an item first.':'This diagnostic function is read-only. No setting changed.');
  e.draftEnabled=!e.draftEnabled;return engineeringRecord(m,s,key,true,options[e.optionIndex]+' staged '+(e.draftEnabled?'on':'off')+'. Press Next Option to confirm.');
 }
 return null;
}
export function setConventionalCover(model,state,open){const s=copy(state);if(isSigma(model)&&typeof open==='boolean'){s.coverOpen=open;s.lampTest=false;return sigmaRecord(model,s,'',true,open?'Training cover opened. Write Enable is a separate ON/OFF control.':'Training cover refitted.'+(s.writeEnabled?' Write Enable remains ON; reopen to switch it OFF.':''),'cover');}if(!isCFP(model)||typeof open!=='boolean')return record(model,s,'',false,'A removable-cover view is only implemented for the reviewed CFP Standard.','cover');s.coverOpen=open;s.lampTest=false;return engineeringRecord(model,s,'',true,open?'Training cover removed. Press the actual SW8 control to enter access level 3.':'Training cover refitted.'+(s.engineering?' Access level 3 is still active; use Escape Access to exit.':''),'cover');}
export function setConventionalDelay(model,state,minutes){const s=copy(state);if(!isCFP(model)||!s.coverOpen||typeof minutes!=='number'||!Number.isFinite(minutes)||minutes<1||minutes>10)return engineeringRecord(model,s,'',false,'The exposed VR1 training control accepts the documented 1–10 minute range.','delay-setting','delays');s.settings.delayMinutes=minutes;return engineeringRecord(model,s,'',true,'VR1 set to '+minutes+' minute(s) for subsequent delayed alarms in this fictional installation.','delay-setting','delays');}
export function advanceConventionalTime(model,state,seconds){const s=copy(state);if(isSigma(model)){if(typeof seconds!=='number'||!Number.isFinite(seconds)||seconds<=0||seconds>3600)return sigmaRecord(model,s,'',false,'Choose an explicit positive training-time step up to one hour.','time');s.simulationSeconds+=seconds;reconcile(model,s);return sigmaRecord(model,s,'',true,'Advanced fictional time by '+seconds+' second(s). Configured delays use the checked code; non-latching reset uses a labelled 20-second upper-bound demonstration, not measured firmware timing.','time');}if(!isCFP(model)||typeof seconds!=='number'||!Number.isFinite(seconds)||seconds<=0||seconds>3600)return engineeringRecord(model,s,'',false,'Choose an explicit positive training-time step up to one hour.','time');s.simulationSeconds+=seconds;reconcile(model,s);return engineeringRecord(model,s,'',true,'Advanced fictional time by '+seconds+' second(s). Walk-test timing represents the documented approximate 1 second on / 8 seconds off cycle, not measured hardware timing.','time',s.testZones.length?'test':'delays');}
function pairConfirmed(s,id){const pair=s.settings?.coincidencePairs.find(pair=>pair.split('-').includes(id));return !pair||pair.split('-').every(zone=>s.fireZones.includes(zone));}
function normalFireZones(s){return s.fireZones.filter(id=>!s.testZones.includes(id));}
function outputFireZones(s){return normalFireZones(s).filter(id=>s.manualOverride||pairConfirmed(s,id));}
function delayReady(s,id){return s.overrideDelays||s.settings?.delaysEnabled===false||!Number.isFinite(s.pendingDelays?.[id])||s.pendingDelays[id]<=s.simulationSeconds;}
function testRunning(s){return !s.engineering&&!normalFireZones(s).length&&s.fireZones.some(id=>s.testZones.includes(id));}
function cfpSounderPath(s){if(s.evacuation||s.manualOverride)return true;const ready=outputFireZones(s).some(id=>delayReady(s,id));if(ready)return true;if(testRunning(s)){const start=Math.min(...s.fireZones.filter(id=>s.testZones.includes(id)).map(id=>s.testStartedAt[id]??s.simulationSeconds));return(s.simulationSeconds-start)%9<1;}return false;}
function cfpOutput(s,id){const eligible=outputFireZones(s).filter(zone=>!s.settings.nonLatchingZones.includes(zone)&&delayReady(s,zone));return eligible.length>0&&!s.disabledOutputs.includes(id)&&delayReady(s,id)&&(id!=='remote'||s.soundersRequested);}
function delaysRunning(s){return hasConfiguredDelays(s)&&s.settings.delaysEnabled&&!s.overrideDelays&&Object.entries(s.pendingDelays||{}).some(([id,end])=>end>s.simulationSeconds&&(id.startsWith('Z')?s.fireZones.includes(id):normalFireZones(s).length));}
function diagnosticZones(s){const fn=s.engineering?.functionId;if(fn==='system-fault')return ['watchdog','site-memory','pll'].flatMap((id,i)=>s.diagnostics.systemFaults.includes(id)?['Z'+(i+1)]:[]);if(fn==='repeater-fault')return s.diagnostics.repeaters.map(id=>'Z'+id);if(fn==='open-circuit'||fn==='short-circuit')return Object.entries(s.inputs).filter(([id,input])=>input.fault&&input.faultType===(fn==='open-circuit'?'open':'short')&&!s.disabledZones.includes(id)&&!s.testZones.includes(id)).map(([id])=>id);return [];}
function engineeringView(m,s){const active=Boolean(s.engineering),fn=s.engineering?.functionId,options=engineeringOptions(m,fn);return {active,functionId:fn||null,label:engineeringFunctions.find(f=>f[0]===fn)?.[1]||'',diagnosticZones:diagnosticZones(s),selection:active&&s.engineering.optionIndex!==null?{option:options[s.engineering.optionIndex],draftEnabled:s.engineering.draftEnabled,committedEnabled:engineeringEnabled(s,fn,options[s.engineering.optionIndex]),index:s.engineering.optionIndex,total:options.length}:null,functions:engineeringFunctions.map(([id,label])=>({id,label,state:fn===id?'flashing':'off',flashPattern:fn===id&&id==='sounder-status'?(s.settings.resoundNewZone?'triple':'equal'):null,sourceRefs:engineeringRefs(m,id)})),notice:active&&!s.coverOpen?'Access level 3 remains active with the cover refitted. Use Escape Access to leave it.':''};}


// Sigma CP uses conventional zones, not an addressed detector database. These
// fields describe an explicit training configuration, not discovered equipment.
const sigmaDiagnosticIds=['mains-fail','batt-fail','cpu','aux-24v','batt-low','earth','system-fuse','s1','s2','comms'];
const sigmaDefaultConfig=()=>({codes:['10'],delaysEnabled:false});
const sigmaSet=(s,code)=>array(s.sigmaConfig?.codes).includes(code);
const sigmaConfigured=s=>array(s.sigmaConfig?.codes).some(code=>code!=='10')||s.sigmaConfig?.delaysEnabled===true;
const sigmaCodes=m=>array(m.engineering?.configurationCodes);
const sigmaOption=(m,code)=>sigmaCodes(m).find(option=>option.code===code);
const sigmaRefs=(m,code)=>copy(sigmaOption(m,code)?.sourceRefs||m.engineering?.sourceRefs||[{sourceId:'sigma-main-25',pdfPage:16,printedPage:'16',section:'17. Configuration options'}]);
function sigmaRecord(m,s,key,ok,message,kind='sigma-engineering',code=s.engineering?.code){record(m,s,key,ok,message,kind);s.lastAction.sourceRefs=kind==='sigma-diagnostic'?[{sourceId:'sigma-main-25',pdfPage:19,printedPage:'19',section:'18–20. Internal diagnostics'},{sourceId:'sigma-main-25',pdfPage:20,printedPage:'20',section:'20. Internal fault indications'}]:kind==='checkpoint'?[{sourceId:'sigma-main-25',pdfPage:11,printedPage:'11',section:'Detection circuit source; fictional work checkpoint'}]:sigmaRefs(m,code);s.log[s.log.length-1]=copy(s.lastAction);return s;}
function sigmaActiveFaults(s){const active=array(s.sigmaDiagnostics?.active).filter(id=>id!=='cpu'&&(id!=='earth'||!sigmaSet(s,'23')));return [...active,...(s.sigmaDiagnostics?.cpuLatched?['cpu']:[]),...(s.writeEnabled?['write-enable']:[])];}
function sigmaDelaySeconds(s){const code=array(s.sigmaConfig?.codes).find(code=>/^0[0-9]$/.test(code));return code===undefined?null:code==='00'?30:Number(code)*60;}
function sigmaZoneDelayed(s,id){return sigmaSet(s,(s.inputs[id]?.alarmKind==='call-point'?'4':'3')+id.slice(1));}
function sigmaSounderPath(s){if(s.evacuation||s.sigmaManualSound)return true;return s.fireZones.some(id=>!sigmaSet(s,'9'+id.slice(1))&&(!Number.isFinite(s.pendingDelays?.[id])||s.pendingDelays[id]<=(s.simulationSeconds||0)));}
function sigmaDelayRunning(s){return Object.entries(s.pendingDelays||{}).some(([id,end])=>s.fireZones.includes(id)&&end>(s.simulationSeconds||0));}
function sigmaFireRelay(s){return !sigmaSet(s,'26')&&s.fireZones.length>0;}
function sigmaLocalRelay(s){return s.sigmaLocalRelayRequested&&(s.evacuation||s.fireZones.some(id=>!s.testZones.includes(id)));}
function reconcileSigma(m,s){
 const now=s.simulationSeconds||0;s.pendingDelays||={};s.pendingNonLatch||={};
 for(const id of s.fireZones){if(s.inputs[id].alarm&&!sigmaZoneDelayed(s,id))delete s.pendingDelays[id];if(sigmaSet(s,'8'+id.slice(1))&&!s.inputs[id].alarm){if(!Number.isFinite(s.pendingNonLatch[id]))s.pendingNonLatch[id]=now+20;}else delete s.pendingNonLatch[id];}
 s.fireZones=s.fireZones.filter(id=>!Number.isFinite(s.pendingNonLatch[id])||s.pendingNonLatch[id]>now);
 s.silencedZones=s.silencedZones.filter(id=>s.fireZones.includes(id));
 for(const field of ['pendingDelays','pendingNonLatch'])for(const id of Object.keys(s[field]))if(!s.fireZones.includes(id))delete s[field][id];
 if(!s.fireZones.length){s.sigmaManualSound=false;if(!s.evacuation)s.sigmaLocalRelayRequested=false;}
}
function sigmaEngineeringView(m,s){const code=s.engineering?.code||null,option=sigmaOption(m,code);return {kind:'sigma',active:s.writeEnabled===true,code,option:option?copy(option):null,set:sigmaSet(s,code),options:copy(sigmaCodes(m)),codeDot:sigmaSet(s,code)?'flashing':'off',configuredCodes:copy(array(s.sigmaConfig?.codes)),writeEnabled:s.writeEnabled===true,directionUnverified:true,notice:s.writeEnabled?(s.coverOpen?'Write Enable is ON. The internal warning pips and General Fault remain until it is switched OFF.':'Write Enable is still ON with the cover refitted. Reopen the cover to switch it OFF.'):'Write Enable is OFF. Confirmed training configuration is retained.',entryPolicy:'00 is this fictional starting display. The manual does not specify entry display or code wrap; the labelled code chooser loads a practice starting point.',setPolicy:'Enter sets the displayed option. Repeat Enter does not invent an undocumented unset toggle. Restore training configuration is a separate simulator action.'};}
export function selectSigmaConfiguration(model,state,code){const s=copy(state);if(!isSigma(model)||!s.writeEnabled||(!/^\d{2}$/.test(String(code))&&!sigmaOption(model,String(code))))return sigmaRecord(model,s,'',false,'Choose a two-digit starting display or a documented code with Write Enable ON.','sigma-configuration-target',String(code));s.engineering={code:String(code)};s.sigmaLastCode=String(code);return sigmaRecord(model,s,'',true,'Training starting point '+code+' loaded. This is not a physical Mode/Select sequence or a claim about code wrap.','sigma-configuration-target',String(code));}
export function resetSigmaConfiguration(model,state){const s=copy(state);if(!isSigma(model))return record(model,s,'',false,'This training restore applies only to Sigma CP.','sigma-training-reset');s.sigmaConfig=sigmaDefaultConfig();s.pendingDelays={};s.pendingNonLatch={};s.sigmaManualSound=false;reconcile(model,s);return sigmaRecord(model,s,'',true,'Training configuration restored to the fictional common-alarm defaults. This simulator action is not a documented physical code-clear procedure. Inputs, ordinary disablements and test flags are retained.','sigma-training-reset');}
function pressSigmaEngineering(m,s,key){
 if(key==='WRITE_ENABLE'){
  if(!s.coverOpen)return sigmaRecord(m,s,key,false,'Open the training cover to reach the Write Enable switch.');
  s.writeEnabled=!s.writeEnabled;s.engineering=s.writeEnabled?{code:s.sigmaLastCode||'00'}:null;s.sigmaMode=null;s.modeChooser=false;
  return sigmaRecord(m,s,key,true,s.writeEnabled?'Write Enable ON: level 3 configuration. The display starting point is fictional; use Mode (+10), Select (+1) and Enter to set a documented option.':'Write Enable OFF: level 3 ended. Confirmed settings remain.');
 }
 if(key==='WATCHDOG_RESET'){
  if(!s.coverOpen)return sigmaRecord(m,s,key,false,'The named watchdog reset is internal. Open the training cover first.','sigma-diagnostic');
  s.sigmaDiagnostics.cpuLatched=s.sigmaDiagnostics.active.includes('cpu');
  return sigmaRecord(m,s,key,true,s.sigmaDiagnostics.cpuLatched?'The fictional CPU cause remains; watchdog indication remains.':'The latched fictional CPU/watchdog indication was reset. This does not verify a physical repair.','sigma-diagnostic');
 }
 if(!s.writeEnabled)return null;
 if(key==='MODE'||key==='SELECT'){
  const current=s.engineering?.code||'00',amount=key==='MODE'?10:1;
  if(!/^\d{2}$/.test(current)||Number(current)+amount>99)return sigmaRecord(m,s,key,false,'The checked manual does not establish this code wrap or alphabetic-bank key sequence. Use the labelled training code chooser.');
  const code=String(Number(current)+amount).padStart(2,'0');s.engineering={code};s.sigmaLastCode=code;
  return sigmaRecord(m,s,key,true,'Configuration display '+code+'. '+(sigmaOption(m,code)?'Enter sets this documented option.':'No documented configuration is assigned to this code; nothing can be set.'));
 }
 if(key==='ENTER'){
  const code=s.engineering?.code,option=sigmaOption(m,code);
  if(!option)return sigmaRecord(m,s,key,false,'No verified configuration option is assigned to this code.');
  if(option.status!=='implemented')return sigmaRecord(m,s,key,false,'Reference only: '+(option.scope||option.description||option.label)+'. This option is outside the fictional K-series behaviour.');
  if(sigmaSet(s,code))return sigmaRecord(m,s,key,true,'Code '+code+' is already set; its units dot remains flashing. No undocumented unset toggle is claimed.');
  if(/^0[0-9]$/.test(code))s.sigmaConfig.codes=s.sigmaConfig.codes.filter(value=>!/^0[0-9]$/.test(value));
  s.sigmaConfig.codes=unique([...s.sigmaConfig.codes,code]);reconcile(m,s);
  return sigmaRecord(m,s,key,true,'Code '+code+' set: '+option.label+'. The flashing units dot records this training setting.');
 }
 return null;
}

export function buildConventionalModel(data,profileId){
 const profile=data?.profiles?data.profiles.find(p=>p.id===(profileId||data.profiles[0]?.id)):data;
 if(!profile||!supportedKeys[profile.id])throw Error('Unsupported conventional training profile.');
 const model=copy(profile);model.zones=Array.from({length:[2,4,8].includes(model.zoneCount)?model.zoneCount:8},(_,i)=>({id:`Z${i+1}`,number:i+1,label:`Zone ${i+1}`}));
 model.zoneCount=model.zones.length;model.physicalKeys=array(model.physicalKeys);model.indicators=array(model.indicators);model.features=array(model.features);model.lessons=array(model.lessons);model.scenarios=array(model.scenarios);model.sources=copy(data?.sources||model.sources||[]);model.version=data?.version||model.version||'2026-11-02.1';
 const keys=model.physicalKeys.map(k=>k.id);if(keys.length!==new Set(keys).size||keys.some(k=>!supportedKeys[model.id].includes(k))||supportedKeys[model.id].some(k=>!keys.includes(k)))throw Error('Physical keys must match this reviewed panel face.');
 // Explicit fictional installation: common alarms, no delays, normal latching
 // zones, new-zone resound selected. These are not claims about a user's panel.
 model.fixture={commonSounders:true,delaysConfigured:false,resoundNewZone:true,...model.fixture};
 if(model.fixture.delaysConfigured!==false)throw Error('Configured delay operation is outside this training scope.');
 model.disableOptions=[...model.zones.map(z=>z.id),'fault','remote','sounders','auxiliary'];
 return model;
}
export function createConventionalState(model,{scenarioId='normal'}={}){
 const s={version:1,profileId:model.id,sourceVersion:model.version,scenarioId:'normal',sequence:0,keyEnabled:false,codeAccess:false,codeBuffer:'',inputs:Object.fromEntries(model.zones.map(z=>[z.id,{alarm:false,fault:false}])),faults:{power:false,sounder:false},fireZones:[],silencedZones:[],soundersRequested:false,evacuation:false,buzzerSilenced:false,disabledZones:[],disabledOutputs:[],testZones:[],selection:null,sigmaMode:null,sigmaZone:model.zones[0].id,modeChooser:false,lampTest:false,log:[],lastAction:{ok:true,kind:'initial',message:'Fictional normal installation. Nothing is connected to a real panel.',sourceRefs:[]}};
 if(isCFP(model))Object.assign(s,{cfpEngineeringVersion:1,coverOpen:false,engineering:null,settings:defaultSettings(model),simulationSeconds:0,pendingDelays:{},testStartedAt:{},manualOverride:false,overrideDelays:false,diagnostics:{systemFaults:[],systemInputs:[],repeaters:[]}});
 if(isSigma(model))Object.assign(s,{sigmaEngineeringVersion:1,coverOpen:false,writeEnabled:false,engineering:null,sigmaLastCode:'00',sigmaConfig:sigmaDefaultConfig(),sigmaDiagnostics:{active:[],cpuLatched:false},simulationSeconds:0,pendingDelays:{},pendingNonLatch:{},sigmaManualSound:false,sigmaLocalRelayRequested:false,trainingCheckpoints:[]});
 return scenarioId==='normal'?s:loadConventionalScenario(model,s,scenarioId);
}
export function loadConventionalScenario(model,state,id){
 if(!['normal','fire-zone-1','zone-fault','power-fault','sounder-fault','disabled-zone'].includes(id))return record(model,copy(state),'',false,'That fictional scenario is outside this reviewed profile.','scenario');
 const s=createConventionalState(model);s.scenarioId=id;const first=model.zones[0].id;
 if(id==='fire-zone-1')s.inputs[first].alarm=true;
 if(id==='zone-fault')s.inputs[first].fault=true;
 if(id==='power-fault')s.faults.power=true;
 if(id==='sounder-fault')s.faults.sounder=true;
 if(id==='disabled-zone')s.disabledZones=[first];
 reconcile(model,s);return record(model,s,'',true,`Loaded fictional scenario: ${model.scenarios.find(x=>x.id===id)?.title||id}.`,'scenario',id);
}
export function pressConventionalKey(model,state,key,{heldMs=0}={}){
 const s=copy(state);s.lampTest=false;
 if(isSigma(model)){const result=pressSigmaEngineering(model,s,key);if(result)return result;}
 if(isCFP(model)&&key==='ENGINEER'){
  if(!s.coverOpen)return engineeringRecord(model,s,key,false,'SW8 is inside the CFP. Remove the training cover to reach it.');
  const current=engineeringFunctions.findIndex(f=>f[0]===s.engineering?.functionId),next=engineeringFunctions[(current+1)%engineeringFunctions.length];
  s.engineering={functionId:next[0],optionIndex:null,draftEnabled:false};s.selection=null;s.codeBuffer='';return engineeringRecord(model,s,key,true,'Access level 3: '+next[1]+'. Unconfirmed training drafts are not applied.');
 }
 if(isCFP(model)&&s.engineering&&['EXIT','NEXT_OPTION','TOGGLE'].includes(key)){const result=pressEngineering(model,s,key);if(result)return result;}
 if(isCFP(model)&&key==='SOUNDERS'&&delaysRunning(s)&&!s.disabledOutputs.includes('sounders')){s.overrideDelays=true;s.manualOverride=true;s.soundersRequested=true;s.buzzerSilenced=false;return engineeringRecord(model,s,key,true,'The running delay was overridden by Silence/Resound Sounders. Fictional sounders and applicable outputs operate.','key','delays');}
 if(!supportedKeys[model.id].includes(key))return record(model,s,key,false,'This is not a physical control on the reviewed panel face.');
 if(key==='KEYSWITCH')return enableKey(model,s);
 if(key==='BUZZER'){if(isSigma(model)&&s.sigmaDiagnostics.cpuLatched)return sigmaRecord(model,s,key,false,'The latched CPU/watchdog warning cannot be silenced. The named internal watchdog reset is required.','sigma-diagnostic');s.buzzerSilenced=true;return record(model,s,key,true,isSigma(model)&&s.writeEnabled?'Ordinary warning acknowledged; the Write Enable reminder pips remain. Fire/fault indications and alarm sounders are unchanged.':'Panel buzzer silenced in the simulation. Fire and fault indications remain; alarm sounders are unchanged.');}
 if(isCFP(model)&&!authorised(s)&&key in codeKeys){
  s.codeBuffer+=codeKeys[key];if(s.codeBuffer.length===4){const correct=s.codeBuffer==='2143';s.codeBuffer='';s.codeAccess=correct;return record(model,s,key,correct,correct?'Documented user keypad sequence accepted; authorised controls are available.':'User keypad sequence not accepted. Start the four-key sequence again.');}
  return record(model,s,key,true,'User access sequence in progress.');
 }
 if(key==='LAMP_TEST'&&!isCFP(model)){s.lampTest=true;return record(model,s,key,true,'Indicator and buzzer test while the physical button is held.');}
 if(!authorised(s))return record(model,s,key,false,'This control requires the documented authorised-user access. The simulation has not enabled it.');
 if(key==='EXIT'&&isCFP(model)){s.codeAccess=false;s.codeBuffer='';s.selection=null;return record(model,s,key,true,s.keyEnabled?'Selection ended; unconfirmed change discarded. Turn the enable key off to lock controls.':'User access ended; unconfirmed change discarded. Confirmed disablements remain.');}
 if(key==='KEY_1')return record(model,s,key,false,'Key 1 is used for user code entry. No additional function is claimed at this access level.');
 if(key==='SOUNDERS'){
  if(s.disabledOutputs.includes('sounders'))return record(model,s,key,false,'Alarm sounders are disabled in this fictional installation. The physical button does not enable them.');
  const was=sounders(s);s.soundersRequested=!was;
  if(was){s.silencedZones=[...s.fireZones];s.buzzerSilenced=true;if(isSigma(model))s.sigmaLocalRelayRequested=false;}
  else{if(!s.fireZones.length)s.evacuation=true;if(isSigma(model)){s.sigmaManualSound=true;s.sigmaLocalRelayRequested=true;s.pendingDelays={};}if(isCFP(model)&&s.fireZones.length){s.manualOverride=true;s.overrideDelays=true;}s.silencedZones=[];s.buzzerSilenced=false;}
  return record(model,s,key,true,was?'Alarm sounders silenced; this does not remove the alarm input or verify the cause.':s.fireZones.length?'Alarm sounders resounded.':'Manual sounding in the fictional installation. No device input has been invented.');
 }
 if(key==='RESET'){
  if(isCFP(model)&&sounders(s))return record(model,s,key,false,'The CFP user procedure requires the alarm sounders to be silenced before panel reset.');
  s.selection=null;s.modeChooser=false;s.sigmaMode=null;if(isCFP(model)){s.pendingDelays={};s.testStartedAt={};s.manualOverride=false;s.overrideDelays=false;s.diagnostics.systemFaults=s.diagnostics.systemFaults.filter(id=>id==='site-memory'||s.diagnostics.systemInputs.includes(id));}if(isSigma(model)){s.pendingDelays={};s.pendingNonLatch={};s.sigmaManualSound=false;s.sigmaLocalRelayRequested=false;}s.fireZones=[];s.silencedZones=[];s.evacuation=false;s.soundersRequested=false;s.buzzerSilenced=false;reconcile(model,s);
  return record(model,s,key,true,s.fireZones.length?'Reset attempted; an active fictional zone input returns the panel to alarm.':activeFaults(model,s).length?'Reset does not remove the existing fictional fault. Its indications and buzzer remain.':'Simulated reset complete. Any disablements or test zones remain explicitly recorded.');
 }
 if(isCFP(model)){
  if(key==='NEXT_OPTION'){
   if(!s.selection){if(!Number.isFinite(heldMs)||heldMs<3000)return record(model,s,key,false,'Hold Next Option for three seconds to enter the documented disablement selection.');s.selection={index:0,draftDisabled:disabled(s,disableOptions(model,s)[0])};return record(model,s,key,true,'Disablement selection started at Zone 1. Enable/Disable stages a change; Next Option confirms it.');}
   const option=selectedOption(model,s);setDisabled(model,s,option,s.selection.draftDisabled);const next=s.selection.index+1,options=disableOptions(model,s);
   s.selection=next<options.length?{index:next,draftDisabled:disabled(s,options[next])}:null;
   return record(model,s,key,true,s.selection?`${option} choice confirmed. Next available option selected.`:'Last option confirmed. Selection finished; fault indications are restored.');
  }
  if(key==='TOGGLE'){
   if(s.selection){s.selection.draftDisabled=!s.selection.draftDisabled;return record(model,s,key,true,`Selected option staged ${selectedOption(model,s)==='delays'?(s.selection.draftDisabled?'delays on':'delays off'):(s.selection.draftDisabled?'disabled':'enabled')}. Press Next Option to confirm; leaving now discards this latest change.`);}
   s.lampTest=true;return record(model,s,key,true,'Accessed lamp and internal beeper test while the shared Enable/Disable / Lamp Test button is held.');
  }
 }else{
  if(key==='MODE'){s.modeChooser=true;return record(model,s,key,true,'The manual says to press Mode until the required code is shown. The full cycle order is unverified; use the separate practice starting-point selector.','mode-help');}
  if(key==='SELECT'){
   if(!['d','t'].includes(s.sigmaMode))return record(model,s,key,false,'Select scrolls zones when the documented d or t target is loaded. The MODE cycle is not simulated.');
   s.sigmaZone=model.zones[(model.zones.findIndex(z=>z.id===s.sigmaZone)+1)%model.zones.length].id;return record(model,s,key,true,`${s.sigmaZone} selected in the documented ${s.sigmaMode} mode.`);
  }
  if(key==='ENTER'){
   if(s.sigmaMode==='d'){setDisabled(model,s,s.sigmaZone,!disabled(s,s.sigmaZone));return record(model,s,key,true,`${s.sigmaZone} ${disabled(s,s.sigmaZone)?'disabled':'enabled'} in the fictional installation. An active input on an enabled zone can cause an alarm.`);}
   if(s.sigmaMode==='db'){setDisabled(model,s,'sounders',!disabled(s,'sounders'));return record(model,s,key,true,`Fictional sounder outputs ${disabled(s,'sounders')?'disabled':'enabled'}.`);}
   if(s.sigmaMode==='t'){s.testZones=s.testZones.includes(s.sigmaZone)?s.testZones.filter(z=>z!==s.sigmaZone):[...s.testZones,s.sigmaZone];return record(model,s,key,true,`${s.sigmaZone} ${s.testZones.includes(s.sigmaZone)?'put into':'taken out of'} test mode. Test timing and output configuration are explicitly bounded in this trainer.`);}
   if(s.sigmaMode==='Ad'){if(sigmaDelaySeconds(s)===null||!s.sigmaConfig.codes.some(code=>/^[34][1-8]$/.test(code)))return record(model,s,key,false,'This fictional installation has no complete zone/time delay configuration; no change made.');s.sigmaConfig.delaysEnabled=!s.sigmaConfig.delaysEnabled;if(!s.sigmaConfig.delaysEnabled)s.pendingDelays={};return record(model,s,key,true,'Configured zone delays '+(s.sigmaConfig.delaysEnabled?'enabled for subsequent fictional activations.':'disabled in this training installation.'));}
   return record(model,s,key,false,'Load a documented practice starting point before Select/Enter. Use Write Enable for the separate level-3 configuration controls.');
  }
 }
 return record(model,s,key,false,'No additional documented action is implemented for this control in the current state.');
}
export function releaseConventionalKey(model,state,key){const s=copy(state);if(['TOGGLE','LAMP_TEST'].includes(key))s.lampTest=false;return s;}
export function selectConventionalMode(model,state,mode){
 const s=copy(state);if(isCFP(model)||!accessed(s)||s.writeEnabled||!modes.includes(mode))return record(model,s,'',false,'This documented practice starting point is unavailable.','mode-target');
 s.modeChooser=false;s.sigmaMode=mode;s.sigmaZone=model.zones[0].id;return record(model,s,'',true,`Training assist loaded ${mode} at Zone 1 where relevant. This is not a physical MODE button sequence or a claim about its cycle order.`,'mode-target','MODE');
}
export function setConventionalInput(model,state,input){
 const s=copy(state),id=zoneId(input?.zoneId);
 if(isSigma(model)){
  if(input?.type==='sigma-configuration-target')return selectSigmaConfiguration(model,state,input.code);
  if(input?.type==='sigma-training-reset')return resetSigmaConfiguration(model,state);
  if(input?.type==='advance-time')return advanceConventionalTime(model,state,input.seconds);
  if(input?.type==='checkpoint'&&typeof input.id==='string'&&/^[a-z0-9-]{1,60}$/.test(input.id)){s.trainingCheckpoints=unique([...s.trainingCheckpoints,input.id]);return sigmaRecord(model,s,'',true,'Fictional work checkpoint noted. This is not a panel action, detector discovery, measurement or confirmation of a real repair.','checkpoint');}
  if(input?.type==='sigma-diagnostic'&&sigmaDiagnosticIds.includes(input.fault)&&typeof input.active==='boolean'){s.sigmaDiagnostics.active=input.active?unique([...s.sigmaDiagnostics.active,input.fault]):s.sigmaDiagnostics.active.filter(id=>id!==input.fault);if(input.active){s.buzzerSilenced=false;if(input.fault==='cpu')s.sigmaDiagnostics.cpuLatched=true;}return sigmaRecord(model,s,'',true,'Fictional internal '+input.fault+' cause '+(input.active?'applied.':'removed.')+(input.fault==='cpu'&&!input.active?' Its latched watchdog indication still needs the named watchdog reset.':''),'sigma-diagnostic');}
 }
 if(isCFP(model)){
  if(input?.type==='advance-time')return advanceConventionalTime(model,state,input.seconds);
  if(input?.type==='delay-setting')return setConventionalDelay(model,state,input.minutes);
  if(input?.type==='system-fault'&&['watchdog','site-memory','pll'].includes(input.fault)&&typeof input.active==='boolean'){
   const key=input.fault;s.diagnostics.systemInputs=input.active?unique([...s.diagnostics.systemInputs,key]):s.diagnostics.systemInputs.filter(x=>x!==key);if(input.active){s.diagnostics.systemFaults=unique([...s.diagnostics.systemFaults,key]);s.buzzerSilenced=false;}
   return engineeringRecord(model,s,'',true,'Fictional '+key+' cause '+(input.active?'applied; its system indication is latched.':'removed; the latched indication remains until the applicable recorded reset/reprogramming action.'),'input','system-fault');
  }
  if(input?.type==='repeater-fault'&&Number.isInteger(input.repeater)&&input.repeater>=1&&input.repeater<=8&&typeof input.active==='boolean'){
   s.diagnostics.repeaters=input.active?unique([...s.diagnostics.repeaters,input.repeater]):s.diagnostics.repeaters.filter(x=>x!==input.repeater);if(input.active)s.buzzerSilenced=false;return engineeringRecord(model,s,'',true,'Fictional repeater '+input.repeater+' communication fault '+(input.active?'applied.':'removed.'),'input','repeater-fault');
  }
 }
 if(input?.type==='fault'&&['power','sounder'].includes(input.fault)&&typeof input.active==='boolean'){
  const before=s.faults[input.fault];s.faults[input.fault]=input.active;if(!before&&input.active)s.buzzerSilenced=false;return record(model,s,'',true,`Fictional ${input.fault} fault input ${input.active?'applied':'removed'}. This is not a measured or diagnosed fault.`,'input',`${input.fault}-fault`);
 }
 if(!zoneExists(model,id)||!['normal','alarm','fault'].includes(input?.state))return record(model,s,'',false,'Choose a supported fictional zone and input state.','input');
 const old=copy(s.inputs[id]);s.inputs[id]={alarm:input.state==='alarm',fault:input.state==='fault',...(isSigma(model)?{alarmKind:input.state!=='alarm'?(old.alarmKind||'detector'):input.alarmKind==='call-point'?'call-point':'detector'}:{}),...(isCFP(model)?{faultType:input.state==='fault'&&['open','short'].includes(input.faultType)?input.faultType:null}:{})};if(!old.fault&&s.inputs[id].fault)s.buzzerSilenced=false;reconcile(model,s);
 return record(model,s,'',true,`Fictional ${id} input set to ${input.state}. ${input.state==='normal'&&s.fireZones.includes(id)?'The latched alarm still needs the documented reset.':''}`.trim(),'input',input.state==='fault'?'zone-fault':'fire-zone-1');
}
export function advanceConventionalTest(model,state){
 const s=copy(state);if(isCFP(model)){if(!testRunning(s))return engineeringRecord(model,s,'',false,'No active CFP walk test is running. Exit programming and check that no normal zone alarm is suspending it.','test-cycle','test');return advanceConventionalTime(model,s,1);}
 const targets=s.fireZones.filter(id=>s.testZones.includes(id));if(!targets.length)return record(model,s,'',false,'No fictional test-zone alarm is awaiting its automatic reset demonstration.','test-cycle');
 if(targets.some(id=>s.inputs[id].alarm))return record(model,s,'',false,'The fictional test input is still active. Return it to normal before demonstrating the reset; exact timing is not simulated.','test-cycle');
 s.fireZones=s.fireZones.filter(id=>!targets.includes(id));s.silencedZones=s.silencedZones.filter(id=>!targets.includes(id));if(!s.fireZones.length&&!s.evacuation)s.soundersRequested=false;
 return record(model,s,'',true,'Demonstrated the documented automatic test-zone reset after the fictional input cleared. No exact delay or real output timing is claimed.','test-cycle','test-zone');
}
function indicatorSelectionRate(model,s,id){
 const aliases={fault:['fault-output','fault-output-status'],remote:['remote-status','remote-output-status'],sounders:['sounder-fault','sounder-status'],auxiliary:['aux-status','auxiliary-output-status']};
 if(isCFP(model)&&s.engineering?.functionId==='delays'&&s.engineering.optionIndex!==null){const option=engineeringOptions(model,'delays')[s.engineering.optionIndex];if((aliases[option]||[]).includes(id))return s.engineering.draftEnabled?'same':'slower';}
 return s.selection&&(aliases[selectedOption(model,s)]||[]).includes(id)?(s.selection.draftDisabled?'same':'slower'):null;
}
function indicatorState(model,s,id){
 id=({'remote':'remote-output','fault-output':'fault-output-status','remote-status':'remote-output-status','aux-status':'auxiliary-output-status','disablement':'general-disablement','sounder-fault':'sounder-status'})[id]||id;
 const fault=activeFaults(model,s).length>0,fire=s.fireZones.length>0||s.evacuation,select=!!s.selection;
 if(s.lampTest)return 'on';
 if(isCFP(model)&&s.engineering){
  if(id==='accessed')return 'on';
  if(['system-fault','repeater-fault','sounder-status'].includes(id)&&s.engineering.functionId===id)return 'flashing';
  if(s.engineering.functionId==='delays'&&['fault','general-fault','power-fault','power-supply-fault','system-fault','repeater-fault','sounder-status'].includes(id))return 'off';
  const e=s.engineering;if(e.functionId==='delays'&&['remote-output-status','auxiliary-output-status'].includes(id)){const output=id==='remote-output-status'?'remote':'auxiliary',options=engineeringOptions(model,'delays');return options[e.optionIndex]===output?'flashing':s.settings.delayedOutputs.includes(output)?'on':'off';}
 }
 if(isSigma(model)){
  const internal=array(s.sigmaDiagnostics?.active);
  if(['power-fault','power-supply-fault'].includes(id)&&internal.some(id=>['mains-fail','batt-fail','batt-low','system-fuse'].includes(id)))return 'flashing';
  if(['sounder-status','sounder-fault'].includes(id)&&internal.some(id=>['s1','s2'].includes(id)))return 'flashing';
  if(id==='system-fault'&&s.sigmaDiagnostics?.cpuLatched)return 'flashing';
  if(['delay','output-delays'].includes(id))return s.sigmaConfig?.delaysEnabled?'on':'off';
 }
 const fireState=fire?(!isCFP(model)?'on':s.soundersRequested?'flashing':'on'):'off',faultState=fault?(isCFP(model)?'flashing':'on'):'off';
 const map={power:'on','supply-present':'on','power-on':'on',fire:fireState,'general-fire':fireState,'general-fault':faultState,fault:faultState,'power-fault':s.faults.power?'flashing':'off','power-supply-fault':s.faults.power?'flashing':'off',accessed:authorised(s)?'on':s.codeBuffer?'flashing':'off','controls-enabled':accessed(s)?'on':'off','general-disablement':select?'flashing':s.disabledZones.length||s.disabledOutputs.length||(isCFP(model)&&hasConfiguredDelays(s)&&s.settings.delaysEnabled)?'on':'off',disablement:s.disabledZones.length||s.disabledOutputs.length?'on':'off',test:s.testZones.length?(isCFP(model)&&testRunning(s)?'flashing':'on'):'off','test-mode':s.testZones.length?'on':'off','test-mode-on':s.testZones.length?'on':'off','sounder-status':s.disabledOutputs.includes('sounders')?'on':s.faults.sounder?'flashing':'off','sounder-fault':s.disabledOutputs.includes('sounders')?'on':s.faults.sounder?'flashing':'off','sounder-fault-disablement':s.disabledOutputs.includes('sounders')?'on':s.faults.sounder?'flashing':'off','fault-output-status':s.disabledOutputs.includes('fault')?'on':'off','remote-output-status':s.disabledOutputs.includes('remote')?'on':'off','auxiliary-output-status':s.disabledOutputs.includes('auxiliary')?'on':'off','remote-output':isCFP(model)&&cfpOutput(s,'remote')?'on':'off','output-delays':isCFP(model)&&hasConfiguredDelays(s)&&s.settings.delaysEnabled?(delaysRunning(s)?'flashing':'on'):'off','delay':isCFP(model)&&hasConfiguredDelays(s)&&s.settings.delaysEnabled?(delaysRunning(s)?'flashing':'on'):'off','system-fault':isCFP(model)&&s.diagnostics.systemFaults.length?'flashing':'off','repeater-fault':isCFP(model)&&s.diagnostics.repeaters.length?'flashing':'off','buzzer-silenced':s.buzzerSilenced?'on':'off','alarm-fault-warning-silenced':s.buzzerSilenced?'on':'off'};
 if(select){const option=selectedOption(model,s),matching={fault:'fault-output-status',remote:'remote-output-status',sounders:'sounder-status',auxiliary:'auxiliary-output-status',delays:'output-delays'};if(matching[option]===id)return 'flashing';if(Object.values(matching).includes(id))return disabled(s,Object.keys(matching).find(k=>matching[k]===id))?'on':'off';}
 return map[id]||'off';
}
export function conventionalView(model,state){
 const s=state,access=accessed(s),selected=selectedOption(model,s),fault=activeFaults(model,s).length>0,fire=s.fireZones.length>0||s.evacuation;
 const engineering=isCFP(model)?engineeringView(model,s):sigmaEngineeringView(model,s);
 const zones=model.zones.map(z=>{const disabled=s.disabledZones.includes(z.id),test=s.testZones.includes(z.id),inFire=s.fireZones.includes(z.id),selectedHere=selected===z.id;return {...z,fire:inFire,fault:s.inputs[z.id].fault&&!disabled,disabled,test,selected:selectedHere||(!isCFP(model)&&['d','t'].includes(s.sigmaMode)&&s.sigmaZone===z.id),input:s.inputs[z.id].alarm?'alarm':s.inputs[z.id].fault?'fault':'normal',fireState:s.lampTest?'on':inFire?(s.silencedZones.includes(z.id)?'on':'flashing'):'off',statusState:s.lampTest?'on':selectedHere?'flashing':disabled?'on':test?(isCFP(model)&&testRunning(s)?'flashing':'on'):s.inputs[z.id].fault&&!s.selection?'flashing':'off',selectionRate:selectedHere?(s.selection.draftDisabled?'same':'slower'):null};});
 if(isCFP(model)&&engineering.active){const fn=engineering.functionId,selectedId=engineering.selection?.option;for(const zone of zones){const option=fn==='coincidence'?engineeringOptions(model,fn).find(pair=>pair.split('-').includes(zone.id)):zone.id;const selectedHere=fn==='coincidence'?selectedId?.split('-').includes(zone.id):selectedId===zone.id;zone.selected=Boolean(selectedHere);zone.statusState=selectedHere?'flashing':engineeringOptions(model,fn).length?(engineeringEnabled(s,fn,option)?'on':'off'):engineering.diagnosticZones.includes(zone.id)?'on':'off';zone.selectionRate=selectedHere?(engineering.selection.draftEnabled?'same':'slower'):null;}}
 let display='';let displayDot=false,displayDigitFlashing=false;
 if(isSigma(model)&&s.writeEnabled){display=s.engineering?.code||'00';displayDot=sigmaSet(s,display);}
 else if(!isCFP(model)&&s.sigmaMode){display=['d','t'].includes(s.sigmaMode)?s.sigmaMode+s.sigmaZone.slice(1):s.sigmaMode;displayDot=s.sigmaMode==='d'?s.disabledZones.includes(s.sigmaZone):s.sigmaMode==='t'?s.testZones.includes(s.sigmaZone):s.sigmaMode==='db'?s.disabledOutputs.includes('sounders'):s.sigmaMode==='Ad'?s.sigmaConfig?.delaysEnabled===true:false;displayDigitFlashing=model.fixture.activeDisabledWarning===true&&s.sigmaMode==='d'&&displayDot&&s.inputs[s.sigmaZone].alarm;}
 return {id:model.id,title:model.title,accessEnabled:access,accessLevel:(isCFP(model)&&s.engineering)||(isSigma(model)&&s.writeEnabled)?3:access?2:1,coverOpen:s.coverOpen===true,engineering,settings:isCFP(model)?copy(s.settings):copy(s.sigmaConfig),sigmaDiagnostics:isSigma(model)?{active:copy(s.sigmaDiagnostics.active),cpuLatched:s.sigmaDiagnostics.cpuLatched,indicators:sigmaDiagnosticIds.map(id=>({id,on:id==='cpu'?s.sigmaDiagnostics.cpuLatched:s.sigmaDiagnostics.active.includes(id)&&(id!=='earth'||!sigmaSet(s,'23'))})),positionVerified:false}:null,simulationSeconds:s.simulationSeconds||0,delayPending:isCFP(model)?delaysRunning(s):sigmaDelayRunning(s),walkTestActive:isCFP(model)&&testRunning(s),walkTestSuspended:isCFP(model)&&s.testZones.length>0&&Boolean(s.engineering||normalFireZones(s).length),keyEnabled:s.keyEnabled,codeProgress:s.codeBuffer.length,keys:model.physicalKeys.map(k=>({...copy(k),enabled:k.id==='KEYSWITCH'||k.id==='BUZZER'||(!isCFP(model)&&k.id==='LAMP_TEST')||(isCFP(model)&&k.id in codeKeys)||(isSigma(model)&&s.writeEnabled&&['MODE','SELECT','ENTER'].includes(k.id))||authorised(s)||(isCFP(model)&&k.id==='SOUNDERS'&&delaysRunning(s))})),internalKeys:isCFP(model)?[...model.physicalKeys.map(k=>({...copy(k),enabled:authorised(s)||k.id==='BUZZER'||k.id==='KEYSWITCH'||k.id in codeKeys||(k.id==='SOUNDERS'&&delaysRunning(s))})),{id:'ENGINEER',label:'Access Level Three Functions · SW8',enabled:s.coverOpen===true,sourceRefs:engineeringRefs(model,s.engineering?.functionId)}]:[{id:'WRITE_ENABLE',label:'Write Enable — '+(s.writeEnabled?'ON':'OFF'),enabled:s.coverOpen===true,sourceRefs:sigmaRefs(model)},{id:'WATCHDOG_RESET',label:'Watchdog reset — named internal control',enabled:s.coverOpen===true,positionVerified:false,sourceRefs:[{sourceId:'sigma-main-25',pdfPage:19,printedPage:'19',section:'18. Watchdog reset switch'}]}],leds:model.indicators.map(l=>({...copy(l),state:indicatorState(model,s,l.id),selectionRate:indicatorSelectionRate(model,s,l.id)})),zones,display,displayDot,displayDigitFlashing,modeChooser:s.modeChooser,mode:s.sigmaMode,modeTargets:copy(modes),selection:s.selection?{option:selected,draftDisabled:s.selection.draftDisabled,confirmedDisabled:disabled(s,selected),index:s.selection.index,total:disableOptions(model,s).length}:null,soundersActive:sounders(s),buzzerActive:s.lampTest||(isSigma(model)&&(s.writeEnabled||s.sigmaDiagnostics.cpuLatched))||((isSigma(model)?(fire&&!sigmaSet(s,'21'))||fault:fire||fault)&&!s.buzzerSilenced),buzzerPattern:isSigma(model)&&s.writeEnabled?'three-pips':null,buzzerSilenced:s.buzzerSilenced,outputs:{sounders:sounders(s),remote:isCFP(model)?cfpOutput(s,'remote'):null,auxiliary:isCFP(model)?cfpOutput(s,'auxiliary'):null,fault:isCFP(model)?fault&&!s.disabledOutputs.includes('fault'):fault&&!sigmaSet(s,'22'),fireRelay:isSigma(model)?sigmaFireRelay(s):null,localFireRelay:isSigma(model)?sigmaLocalRelay(s):null},status:{normal:!fire&&!fault&&!s.disabledZones.length&&!s.disabledOutputs.length&&!s.testZones.length&&!(isCFP(model)&&hasConfiguredDelays(s)&&s.settings.delaysEnabled)&&!(isSigma(model)&&sigmaConfigured(s)),configuration:isSigma(model)&&sigmaConfigured(s),fire,fault,disablement:!!(s.disabledZones.length||s.disabledOutputs.length||(isCFP(model)&&hasConfiguredDelays(s)&&s.settings.delaysEnabled)),test:!!s.testZones.length,summary:fire?'Fictional fire condition':fault?'Fictional fault condition':s.disabledZones.length||s.disabledOutputs.length?'Fictional disablement remains':s.testZones.length?'Fictional zone test remains':isCFP(model)&&hasConfiguredDelays(s)&&s.settings.delaysEnabled?'Fictional programmed delays are enabled':isSigma(model)&&sigmaConfigured(s)?'No active fire or fault; programmed training configuration remains':'Fictional normal installation'},message:s.lastAction?.message||'',lastAction:copy(s.lastAction),sourceRefs:copy(s.lastAction?.sourceRefs||[]),log:copy(s.log),fixture:copy(model.fixture)};
}
export function evaluateConventionalConditions(model,state,conditions={}){
 const view=conventionalView(model,state);
 return Object.entries(conditions).every(([key,value])=>{
  if(key==='coverOpen')return state.coverOpen===value;
  if(key==='sigmaWriteEnabled')return state.writeEnabled===value;
  if(key==='sigmaCode')return state.engineering?.code===value;
  if(key==='sigmaConfigured')return sigmaSet(state,typeof value==='string'?value:value.code)===(typeof value==='string'?true:value.value);
  if(key==='sigmaInternalFault')return (value.id==='cpu'?state.sigmaDiagnostics?.cpuLatched:array(state.sigmaDiagnostics?.active).includes(value.id))===value.value;
  if(key==='sigmaDelaysEnabled')return state.sigmaConfig?.delaysEnabled===value;
  if(key==='checkpoint')return array(state.trainingCheckpoints).includes(typeof value==='string'?value:value.id)===(typeof value==='string'?true:value.value);
  if(key==='fireRelay')return view.outputs.fireRelay===value;
  if(key==='localFireRelay')return view.outputs.localFireRelay===value;
  if(key==='faultRelay')return view.outputs.fault===value;
  if(key==='buzzerActive')return view.buzzerActive===value;
  if(key==='engineeringActive')return Boolean(state.engineering)===value;
  if(key==='engineeringFunction')return state.engineering?.functionId===value;
  if(key==='engineeringSelectedOption')return view.engineering?.selection?.option===value;
  if(key==='engineeringDraftEnabled')return view.engineering?.selection?.draftEnabled===value;
  if(key==='nonLatchingZone')return array(state.settings?.nonLatchingZones).includes(zoneId(value.id))===value.value;
  if(key==='coincidencePair')return array(state.settings?.coincidencePairs).includes(value.id)===value.value;
  if(key==='delayedZone')return array(state.settings?.delayedZones).includes(zoneId(value.id))===value.value;
  if(key==='delayedOutput')return array(state.settings?.delayedOutputs).includes(value.id)===value.value;
  if(key==='delayMinutes')return state.settings?.delayMinutes===value;
  if(key==='resoundNewZone')return state.settings?.resoundNewZone===value;
  if(key==='diagnosticZones'||key==='diagnosticsZones')return JSON.stringify(view.engineering?.diagnosticZones||[])===JSON.stringify(value);
  if(key==='delayPending')return view.delayPending===value;
  if(key==='walkTestActive')return view.walkTestActive===value;
  if(key==='walkTestSuspended')return view.walkTestSuspended===value;
  if(key==='remoteOutput')return view.outputs.remote===value;
  if(key==='auxiliaryOutput')return view.outputs.auxiliary===value;
  if(key==='accessEnabled')return view.accessEnabled===value;
  if(key==='keyEnabled')return state.keyEnabled===value;
  if(key==='selectionActive')return !!state.selection===value;
  if(key==='selectedOption')return selectedOption(model,state)===value;
  if(key==='selectionDraftDisabled')return state.selection?.draftDisabled===value;
  if(key==='zoneDisabled')return state.disabledZones.includes(zoneId(value.id))===value.value;
  if(key==='outputDisabled')return state.disabledOutputs.includes(value.id)===value.value;
  if(key==='zoneTest')return state.testZones.includes(zoneId(value.id))===value.value;
  if(key==='sounders')return view.soundersActive===value;
  if(key==='soundersDisabled')return state.disabledOutputs.includes('sounders')===value;
  if(key==='buzzerSilenced')return state.buzzerSilenced===value;
  if(key==='lampTest')return state.lampTest===value;
  if(key==='sigmaMode')return state.sigmaMode===value;
  if(key==='zoneSelected')return state.sigmaZone===zoneId(value);
  if(key==='modeChooser')return state.modeChooser===value;
  if(key==='normal')return view.status.normal===value;
  if(key==='fire')return view.status.fire===value;
  if(key==='fault')return view.status.fault===value;
  if(key==='codeProgress')return state.codeBuffer.length===value;
  if(key==='input')return zoneExists(model,zoneId(value.zoneId))&&view.zones.find(z=>z.id===zoneId(value.zoneId)).input===value.state;
  return false;
 });
}
export function nextConventionalHint(model,state,target){
 const id=typeof target==='string'?target:target?.lessonId,index=typeof target==='object'?Number(target.stepIndex)||0:0,lesson=model.lessons.find(l=>l.id===id),step=lesson?.steps?.[index];
 if(!lesson)return {found:false,done:false,message:'This lesson is outside the reviewed profile.',sourceRefs:[]};
 if(!step)return {found:true,done:true,message:'Documented practice steps complete. Review remaining disablements, test modes and inputs.',stepIndex:index,total:lesson.steps.length,sourceRefs:[]};
 return {found:true,done:false,key:array(step.expectedKeys)[0]||null,holdMs:step.holdMs||0,expectedMode:step.expectedMode||null,expectedInput:copy(step.expectedInput||null),expectedAction:step.expectedAction||null,expectedCover:step.expectedCover,expectedDelayMinutes:step.expectedDelayMinutes,message:step.instruction,stepIndex:index,total:lesson.steps.length,conditionsMet:evaluateConventionalConditions(model,state,step.conditions),sourceRefs:copy(step.sourceRefs||[])};
}
export function leaveConventional(model,state){const s=copy(state);s.lampTest=false;return s;}
export function restoreConventionalState(model,saved){
 const s=createConventionalState(model);if(!saved||saved.version!==1||saved.profileId!==model.id)return s;
 const zoneList=value=>unique(array(value).map(zoneId).filter(id=>zoneExists(model,id)));
 if(isCFP(model)&&saved.cfpEngineeringVersion===1){
  const cfg=saved.settings||{},pairs=engineeringOptions(model,'coincidence');s.coverOpen=saved.coverOpen===true;
  s.settings={coincidencePairs:unique(array(cfg.coincidencePairs).filter(id=>pairs.includes(id))),nonLatchingZones:zoneList(cfg.nonLatchingZones),delayedZones:zoneList(cfg.delayedZones),delayedOutputs:unique(array(cfg.delayedOutputs).filter(id=>['remote','auxiliary'].includes(id))),delayMinutes:typeof cfg.delayMinutes==='number'&&Number.isFinite(cfg.delayMinutes)&&cfg.delayMinutes>=1&&cfg.delayMinutes<=10?cfg.delayMinutes:1,resoundNewZone:typeof cfg.resoundNewZone==='boolean'?cfg.resoundNewZone:model.fixture.resoundNewZone!==false,delaysEnabled:cfg.delaysEnabled!==false};
  s.simulationSeconds=Number.isFinite(saved.simulationSeconds)&&saved.simulationSeconds>=0?saved.simulationSeconds:0;s.pendingDelays=Object.fromEntries(Object.entries(saved.pendingDelays||{}).filter(([id,end])=>(zoneExists(model,id)||['remote','auxiliary'].includes(id))&&Number.isFinite(end)&&end>=0));s.testStartedAt=Object.fromEntries(Object.entries(saved.testStartedAt||{}).filter(([id,start])=>zoneExists(model,id)&&Number.isFinite(start)&&start>=0&&start<=s.simulationSeconds));s.manualOverride=saved.manualOverride===true;s.overrideDelays=saved.overrideDelays===true;
  s.diagnostics={systemFaults:unique(array(saved.diagnostics?.systemFaults).filter(id=>['watchdog','site-memory','pll'].includes(id))),systemInputs:unique(array(saved.diagnostics?.systemInputs).filter(id=>['watchdog','site-memory','pll'].includes(id))),repeaters:unique(array(saved.diagnostics?.repeaters).filter(id=>Number.isInteger(id)&&id>=1&&id<=8))};
  if(engineeringFunctions.some(([id])=>id===saved.engineering?.functionId)){const fn=saved.engineering.functionId,options=engineeringOptions(model,fn),index=saved.engineering.optionIndex;s.engineering={functionId:fn,optionIndex:Number.isInteger(index)&&index>=0&&index<options.length?index:null,draftEnabled:saved.engineering.draftEnabled===true};}
 }
 if(isSigma(model)&&saved.sigmaEngineeringVersion===1){
  s.coverOpen=saved.coverOpen===true;s.writeEnabled=saved.writeEnabled===true;
  const validCodes=array(saved.sigmaConfig?.codes).filter(code=>sigmaOption(model,code)?.status==='implemented');
  const delayCodes=validCodes.filter(code=>/^0[0-9]$/.test(code));s.sigmaConfig={codes:unique(['10',...validCodes.filter(code=>!/^0[0-9]$/.test(code)),...delayCodes.slice(-1)]),delaysEnabled:saved.sigmaConfig?.delaysEnabled===true};
  const validDisplay=code=>typeof code==='string'&&(/^\d{2}$/.test(code)||sigmaOption(model,code));s.sigmaLastCode=validDisplay(saved.sigmaLastCode)?saved.sigmaLastCode:'00';
  s.engineering=s.writeEnabled?{code:validDisplay(saved.engineering?.code)?saved.engineering.code:s.sigmaLastCode}:null;
  s.sigmaDiagnostics={active:unique(array(saved.sigmaDiagnostics?.active).filter(id=>sigmaDiagnosticIds.includes(id))),cpuLatched:saved.sigmaDiagnostics?.cpuLatched===true};if(s.sigmaDiagnostics.active.includes('cpu'))s.sigmaDiagnostics.cpuLatched=true;
  s.simulationSeconds=Number.isFinite(saved.simulationSeconds)&&saved.simulationSeconds>=0?saved.simulationSeconds:0;
  for(const field of ['pendingDelays','pendingNonLatch'])s[field]=Object.fromEntries(Object.entries(saved[field]||{}).filter(([id,end])=>zoneExists(model,id)&&Number.isFinite(end)&&end>=0));
  s.sigmaManualSound=saved.sigmaManualSound===true;s.sigmaLocalRelayRequested=saved.sigmaLocalRelayRequested===true;s.trainingCheckpoints=unique(array(saved.trainingCheckpoints).filter(id=>typeof id==='string'&&/^[a-z0-9-]{1,60}$/.test(id)));
 }
 s.scenarioId=model.scenarios.some(x=>x.id===saved.scenarioId)?saved.scenarioId:'normal';s.sequence=Number.isSafeInteger(saved.sequence)&&saved.sequence>=0?saved.sequence:0;s.keyEnabled=saved.keyEnabled===true;s.codeAccess=isCFP(model)&&saved.codeAccess===true;s.codeBuffer=isCFP(model)&&/^[1-4]{0,3}$/.test(saved.codeBuffer)?saved.codeBuffer:'';
 for(const z of model.zones)s.inputs[z.id]={alarm:saved.inputs?.[z.id]?.alarm===true,fault:saved.inputs?.[z.id]?.fault===true,...(isSigma(model)?{alarmKind:saved.inputs?.[z.id]?.alarmKind==='call-point'?'call-point':'detector'}:{}),...(isCFP(model)&&['open','short'].includes(saved.inputs?.[z.id]?.faultType)?{faultType:saved.inputs[z.id].faultType}:{})};for(const k of ['power','sounder'])s.faults[k]=saved.faults?.[k]===true;
 s.fireZones=zoneList(saved.fireZones);s.silencedZones=zoneList(saved.silencedZones).filter(id=>s.fireZones.includes(id));s.disabledZones=zoneList(saved.disabledZones);s.disabledOutputs=unique(array(saved.disabledOutputs).filter(x=>(isCFP(model)?['fault','remote','sounders','auxiliary']:['sounders']).includes(x)));s.testZones=isCFP(model)&&saved.cfpEngineeringVersion!==1?[]:zoneList(saved.testZones);s.evacuation=saved.evacuation===true;s.soundersRequested=saved.soundersRequested===true;s.buzzerSilenced=saved.buzzerSilenced===true;
 if(isCFP(model)&&accessed(s)&&Number.isInteger(saved.selection?.index)&&saved.selection.index>=0&&saved.selection.index<disableOptions(model,s).length&&typeof saved.selection.draftDisabled==='boolean')s.selection={index:saved.selection.index,draftDisabled:saved.selection.draftDisabled};
 if(!isCFP(model)&&accessed(s)&&!s.writeEnabled){s.sigmaMode=modes.includes(saved.sigmaMode)?saved.sigmaMode:null;s.sigmaZone=zoneExists(model,zoneId(saved.sigmaZone))?zoneId(saved.sigmaZone):s.sigmaZone;s.modeChooser=saved.modeChooser===true;}
 if(isSigma(model)&&saved.sigmaEngineeringVersion!==1)s.sigmaLocalRelayRequested=s.soundersRequested&&(s.evacuation||s.fireZones.some(id=>!s.testZones.includes(id)));
 // A reload never leaves a momentary physical lamp test held down.
 s.lampTest=false;s.log=array(saved.log).slice(-60).filter(x=>x&&typeof x==='object').map(x=>({key:plainText(x.key),kind:plainText(x.kind),ok:x.ok===true,message:plainText(x.message),sequence:Number.isSafeInteger(x.sequence)?x.sequence:0,sourceRefs:copy(array(x.sourceRefs))}));s.lastAction=s.log.at(-1)||s.lastAction;reconcile(model,s);return s;
}
