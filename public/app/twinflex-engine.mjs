/** Source-bounded TWINFLEXpro² practice engine. No live hardware connection. */
const clone = value => JSON.parse(JSON.stringify(value));
const ranks = {'1':0,'2A':1,'2B':2,'3A':3,'3B':4};
const engineer = state => ranks[state.accessLevel] >= 3;
export function buildTwinflexModel(data) {
  const nodes = new Map(data.nodes.map(node => [node.id,node]));
  const children = new Map();
  for (const node of data.nodes) if(node.parentId){if(!children.has(node.parentId))children.set(node.parentId,[]);children.get(node.parentId).push(node);}
  return {data,nodes,children};
}
function defaults(model) {
  const out={};
  for(const node of model.nodes.values())if(node.requiresWrite&&!node.editor)out[node.field]=node.zoneSelect?Array(8).fill(node.options[0]):node.options[0];
  out.codes=clone(model.data.fixture.codes);
  out['zone-mode']='CP/SM/HT';out['confirmation-delay']='1';out['weekly-enabled']='OFF';out.resound='AUTO';out['weekly-time']='1000';
  return out;
}
function event(state,type,text){state.events.unshift({id:++state.eventSequence,seconds:state.seconds,type,text});state.events=state.events.slice(0,500);}
export function createTwinflexState(model,{scenarioId='normal'}={}) {
  const configured=defaults(model);
  const state={version:1,accessLevel:'1',keyEnabled:false,coverOpen:false,writeEnabled:false,menuOpen:false,nodeId:'root',selection:0,buffer:'',pin:'',phase:'menu',zone:1,draft:null,notice:'',configured,applied:clone(configured),pendingReset:false,zoneDisabled:Array(8).fill(false),testZones:Array(8).fill(null),inputs:Array.from({length:8},()=>({alarm:null,fault:false})),latched:Array(8).fill(false),testUntil:Array(8).fill(0),confirmationStart:Array(8).fill(null),confirmationChecks:Array(8).fill(0),alarmStart:Array(8).fill(null),clock:{date:'021126',time:'090000'},fields:[],fieldIndex:0,fieldFresh:true,soundersDisabled:false,remoteDisabled:false,resound:'AUTO',engineerBuzzer:'ON',silenced:false,buzzerSilenced:false,evacuate:false,seconds:0,eventSequence:0,events:[],diagnostic:null,keyboardEsc:0,scenarioId};
  event(state,'panel','Fictional training panel started');
  return loadTwinflexScenario(model,state,scenarioId);
}
function activeInput(state,i){return !state.zoneDisabled[i]&&state.applied['zone-power'][i]==='ON';}
function instantInput(s,i){return s.inputs[i].alarm==='mcp'||s.inputs[i].alarm==='heat'&&s.applied['zone-mode']==='CP/SM/HT';}
function refresh(s){
  const active=s.inputs.flatMap((input,i)=>activeInput(s,i)&&input.alarm&&!s.testZones[i]?[i]:[]);
  for(let i=0;i<8;i++){
    if(!active.includes(i)){if(s.confirmationStart[i]!==null&&Math.floor((s.seconds-s.confirmationStart[i])/60)>s.confirmationChecks[i])s.confirmationStart[i]=null;continue;}
    const confirmation=s.applied['zone-type'][i]==='DWELLING'&&!instantInput(s,i);
    if(confirmation&&s.confirmationStart[i]===null){s.confirmationStart[i]=s.seconds;s.confirmationChecks[i]=0;}if(s.confirmationStart[i]!==null)s.confirmationChecks[i]=Math.floor((s.seconds-s.confirmationStart[i])/60);
    const confirmed=!confirmation||s.seconds-s.confirmationStart[i]>=Number(s.applied['confirmation-delay'])*60||(s.applied['confirmation-type']==='SYSTEM'&&active.length>1);
    if(confirmed){if(!s.latched[i])s.alarmStart[i]=s.seconds;s.latched[i]=true;s.confirmationStart[i]=null;}
  }
}
export function loadTwinflexScenario(model,input,id){
  const state=clone(input);state.scenarioId=id;
  state.inputs=Array.from({length:8},()=>({alarm:null,fault:false}));state.latched.fill(false);state.testUntil.fill(0);state.confirmationStart.fill(null);state.confirmationChecks.fill(0);state.alarmStart.fill(null);state.silenced=false;state.buzzerSilenced=false;state.evacuate=false;
  if(id==='zone-fault')state.inputs[0].fault=true;
  if(id==='fire')state.inputs[0].alarm='smoke';
  if(id==='disabled-zone')state.zoneDisabled[0]=true;
  refresh(state);event(state,id==='fire'?'fire':id==='zone-fault'?'fault':'panel','Loaded fictional scenario: '+id);return state;
}
export function setTwinflexCover(model,input,open){const s=clone(input);s.coverOpen=Boolean(open);s.notice=open?'Right-hand cover removed in this simulation. Access has not changed.':'Right-hand cover refitted. Write Enable switch position is retained.';return s;}
export function setTwinflexInput(model,input,zone,kind,value=true){
  const s=clone(input),i=Number(zone)-1;if(i<0||i>7)return s;
  if(kind==='fault'){s.inputs[i].fault=Boolean(value);event(s,'fault',`Zone ${i+1} fictional EOL fault ${value?'applied':'cleared'}`);}
  else if(kind==='alarm'){
    s.inputs[i].alarm=value===false||value==='clear'?null:['smoke','heat','mcp'].includes(value)?value:'smoke';
    if(s.inputs[i].alarm&&activeInput(s,i)){
      if(s.testZones[i])s.testUntil[i]=s.seconds+5;
      else if(s.applied.resound==='AUTO')s.silenced=false;
      s.buzzerSilenced=false;event(s,'fire',`Zone ${i+1} fictional ${s.inputs[i].alarm} input${s.testZones[i]?' in '+s.testZones[i]+' test':''}`);
    }
  }
  refresh(s);return s;
}
export function advanceTwinflexTime(model,input,seconds=5){const s=clone(input);s.seconds+=Math.max(0,Math.min(300,Number(seconds)||0));for(let i=0;i<8;i++)if(s.testUntil[i]&&s.seconds>=s.testUntil[i]){s.inputs[i].alarm=null;s.testUntil[i]=0;event(s,'panel',`Zone ${i+1} walk-test device reset after approximately five simulated seconds`);}refresh(s);return s;}
const accessible=(s,n)=>ranks[s.accessLevel]>=ranks[n.access]&&(!n.maxAccess||ranks[s.accessLevel]<=ranks[n.maxAccess]);
function children(model,state){return (model.children.get(state.nodeId)||[]).filter(n=>accessible(state,n));}
function enterNode(model,s,id){const n=model.nodes.get(id);if(!n)return;if(!accessible(s,n)){s.notice=`Requires access ${n.access}. Exit to Normal before entering the appropriate practice code.`;return;}s.nodeId=id;s.buffer='';s.selection=0;s.diagnostic=null;s.zone=1;s.draft=null;
  if(n.editor){s.phase='fields';s.fieldIndex=0;s.fieldFresh=true;s.fields=n.editor==='code'?[s.configured.codes[n.codeRole],'','']:n.editor==='time'?[s.configured[n.field]]:[s.clock.date,s.clock.time];}
  else if(n.simulationStatus==='reference-only')s.phase='reference';
  else if(n.kind==='menu')s.phase='menu';
  else if(n.kind==='status')s.phase='status';
  else if(n.zoneSelect)s.phase='zone';
  else if(n.options?.length){s.phase='edit';s.draft=currentValue(s,n);}
  else{s.phase='diagnostic';s.diagnostic=n.command;s.keyboardEsc=0;}
}
function currentValue(s,n){if(n.requiresWrite)return n.zoneSelect?s.configured[n.field][s.zone-1]:s.configured[n.field];if(n.command==='zone-test')return s.testZones[s.zone-1]?'END':'START';if(n.field==='zoneDisabled')return s.zoneDisabled[s.zone-1]?'DISABLE':'ENABLE';if(['remoteDisabled','soundersDisabled','delaysDisabled'].includes(n.field))return s[n.field]?'DISABLE':'ENABLE';return s[n.field]||n.options[0];}
function commit(model,s,n){
  if(n.writeGuard&&(s.accessLevel!=='3B'||!s.writeEnabled)){s.notice='Write protected. This Engineer-only option requires access 3B.';return;}
  if(n.requiresWrite){
    if(s.accessLevel!=='3B'||!s.writeEnabled){s.notice='Write protected. Engineer access 3A can review; remove right-hand cover and switch Write Enable ON for 3B before confirming.';return;}
    if(n.zoneSelect)s.configured[n.field][s.zone-1]=s.draft;else s.configured[n.field]=s.draft;
    s.pendingReset=JSON.stringify(s.configured)!==JSON.stringify(s.applied);s.notice='Configuration stored. RESET SYSTEM is required before changed settings take effect.';event(s,'panel',`${n.title}${n.zoneSelect?' zone '+s.zone:''} stored: ${s.draft}; reset required`);
  }else if(n.command==='zone-test'){
    const zones=s.zone===0?[0,1,2,3,4,5,6,7]:[s.zone-1];for(const i of zones)s.testZones[i]=s.draft==='START'?n.testMode:null;
    s.notice=`${s.draft==='START'?'Started':'Ended'} ${n.testMode} test ${s.zone===0?'on all zones':'on zone '+s.zone}.`;event(s,'panel',s.notice);
  }else if(n.command==='operation'){
    if(n.field==='zoneDisabled')s.zoneDisabled[s.zone-1]=s.draft==='DISABLE';
    else if(['remoteDisabled','soundersDisabled','delaysDisabled'].includes(n.field))s[n.field]=s.draft==='DISABLE';
    else s[n.field]=s.draft;
    s.notice=`${n.title}${n.zoneSelect?' zone '+s.zone:''}: ${s.draft}. Operator action applied.`;event(s,'panel',s.notice);refresh(s);
  }
}
function exitAccess(s){s.accessLevel='1';s.keyEnabled=false;s.menuOpen=false;s.nodeId='root';s.phase='menu';s.pin='';s.buffer='';s.diagnostic=null;s.engineerBuzzer='ON';s.notice=s.writeEnabled?'Normal access. Write Enable remains ON: System Fault reminder. Re-enter Engineer and switch it OFF.':'Normal access.';}
export function pressTwinflexKey(model,input,key){
  const s=clone(input);s.notice='';
  if(!model.data.physicalKeys.some(k=>k.id===key))return s;
  if(key==='WRITE_ENABLE'){
    if(!s.coverOpen){s.notice='Remove the right-hand cover to reach Write Enable.';return s;}
    s.writeEnabled=!s.writeEnabled;if(engineer(s))s.accessLevel=s.writeEnabled?'3B':'3A';
    s.notice=s.writeEnabled?(engineer(s)?'Write Enable ON: Engineer 3B. Confirmed configuration still needs RESET.':'Write Enable ON outside Engineer: System Fault reminder. No other panel operation is inhibited.'):'Write Enable OFF. Programming is protected.';return s;
  }
  if(key==='ENABLE_KEY'){if(s.keyEnabled){exitAccess(s);}else if(s.accessLevel==='1'){s.keyEnabled=true;s.accessLevel='2A';s.menuOpen=true;enterNode(model,s,'root');}else s.notice='Access is already enabled by code. Exit to Normal before using the Enable Controls key.';return s;}
  if(s.diagnostic==='test-keyboard'){
    if(key==='ESC'){if(++s.keyboardEsc===2)enterNode(model,s,'test-controls');}else{s.keyboardEsc=0;s.notice=`${key} key pressed`;}
    return s;
  }
  if(['SILENCE_ALARMS','RESET','SOUND_ALARMS','SILENCE_BUZZER'].includes(key)){
    if(ranks[s.accessLevel]<1){s.notice='Enable controls at access 2 before using this control.';return s;}
    if(key==='SILENCE_ALARMS'){s.silenced=true;s.evacuate=false;s.notice='Alarm sounders silenced. Fire indications and internal buzzer remain.';}
    if(key==='SILENCE_BUZZER'){s.buzzerSilenced=true;s.notice='Internal buzzer silenced. Alarm outputs are unchanged.';}
    if(key==='SOUND_ALARMS'){s.evacuate=true;s.silenced=false;s.buzzerSilenced=false;s.notice='Sound Alarms activated in the fictional site.';}
    if(key==='RESET'){
      if((s.latched.some(Boolean)||s.evacuate)&&!s.silenced){s.notice='Silence alarms before resetting the fire condition.';return s;}
      if(s.pendingReset){s.applied=clone(s.configured);s.pendingReset=false;}
      s.latched.fill(false);s.confirmationStart.fill(null);s.confirmationChecks.fill(0);s.alarmStart.fill(null);s.evacuate=false;s.silenced=false;s.buzzerSilenced=false;refresh(s);
      s.notice='System reset. Stored configuration applied; remaining fictional inputs reassert. Disablements and test modes are retained.';
    }
    event(s,'panel',key.replaceAll('_',' '));return s;
  }
  if(!s.menuOpen){
    if(/^\d$/.test(key)){s.pin=(s.pin+key).slice(-4);if(s.pin.length===4){const match=Object.entries(s.applied.codes).find(([,code])=>code===s.pin);s.pin='';if(match){s.accessLevel=({user:'2A',supervisor:'2B',engineer:s.writeEnabled?'3B':'3A'})[match[0]];s.menuOpen=true;enterNode(model,s,'root');s.notice='Practice code accepted: access '+s.accessLevel;}else s.notice='Practice code not recognised.';}}
    else if(key==='ENTER'){s.menuOpen=true;enterNode(model,s,'root');}
    else if(key==='ESC')s.pin='';
    return s;
  }
  const n=model.nodes.get(s.nodeId);
  if(key==='ESC'){
    if(n.id==='root')exitAccess(s);else{enterNode(model,s,n.parentId||'root');s.notice='Returned without confirming any uncommitted edit.';}return s;
  }
  if(s.phase==='menu'){
    const list=children(model,s);
    if(/^\d$/.test(key))s.buffer=(s.buffer+key).slice(-2);
    if(key==='HASH'){s.buffer=s.buffer.slice(0,-1);}
    if(key==='UP'||key==='DOWN'){s.selection=(s.selection+(key==='DOWN'?1:-1)+list.length)%list.length;s.buffer='';}
    if(key==='ENTER'){const choice=s.buffer?(model.children.get(s.nodeId)||[]).find(c=>Number(c.code)===Number(s.buffer)&&accessible(s,c)):list[s.selection];if(choice)enterNode(model,s,choice.id);else{s.notice='That option is not listed at this access level.';s.buffer='';}}
  }else if(s.phase==='zone'){
    if(/^\d$/.test(key))s.buffer=(s.buffer+key).slice(-2);
    if(key==='HASH')s.buffer=s.buffer.slice(0,-1);
    if(key==='ENTER'){const zone=Number(s.buffer);if(s.buffer&&zone>=1&&zone<=8||(s.buffer==='00'&&n.command==='zone-test')){s.zone=zone;s.phase='edit';s.buffer='';s.draft=currentValue(s,n);}else s.notice=n.command==='zone-test'?'Enter 01–08, or 00 for all zones.':'Enter a fitted fixture zone: 01–08.';}
  }else if(s.phase==='edit'){
    if(['LEFT','RIGHT','UP','DOWN'].includes(key)){const direction=n.direction==='vertical'?['UP','DOWN']:['LEFT','RIGHT'];if(direction.includes(key)){const index=n.options.indexOf(s.draft);s.draft=n.options[(index+(direction[1]===key?1:-1)+n.options.length)%n.options.length];s.buffer='';}}
    if(/^\d$/.test(key)){
      if(n.numericRange){s.buffer=(s.buffer+key).slice(-(n.digits||1));const value=Number(s.buffer);if(value>=n.numericRange[0]&&value<=n.numericRange[1])s.draft=String(value).padStart(n.digits||1,'0');}
      else if(n.options[Number(key)-1])s.draft=n.options[Number(key)-1];
    }
    if(key==='ENTER'){if(n.numericRange&&s.buffer&&(Number(s.buffer)<n.numericRange[0]||Number(s.buffer)>n.numericRange[1]))s.notice='Value is outside the documented range.';else commit(model,s,n);}
  }else if(s.phase==='fields'){
    if(['UP','DOWN'].includes(key)){s.fieldIndex=(s.fieldIndex+(key==='DOWN'?1:-1)+s.fields.length)%s.fields.length;s.fieldFresh=true;}
    if(/^\d$/.test(key)){s.fields[s.fieldIndex]=((s.fieldFresh?'':s.fields[s.fieldIndex])+key).slice(-(n.editor==='clock'?6:4));s.fieldFresh=false;}
    if(key==='HASH'){s.fields[s.fieldIndex]=s.fields[s.fieldIndex].slice(0,-1);s.fieldFresh=false;}
    if(key==='ENTER'){
      if(n.editor==='code'){
        if(s.accessLevel!=='3B'||!s.writeEnabled)s.notice='Write protected. Enable Engineer 3B before confirming practice code changes.';
        else if(s.fields[0]!==s.configured.codes[n.codeRole]||!/^\d{4}$/.test(s.fields[1])||s.fields[1]!==s.fields[2])s.notice='Existing code and matching four-digit NEW / CONFIRM fields are required.';
        else if(Object.entries(s.configured.codes).some(([role,code])=>role!==n.codeRole&&code===s.fields[1]))s.notice='Use a distinct practice code for each access level.';
        else{s.configured.codes[n.codeRole]=s.fields[1];s.pendingReset=JSON.stringify(s.configured)!==JSON.stringify(s.applied);s.notice='Practice code stored. RESET applies it; no real panel credentials are changed.';event(s,'panel',n.codeRole+' practice access code changed; reset required');}
      }else if(n.editor==='time'){
        if(s.accessLevel!=='3B'||!s.writeEnabled)s.notice='Write protected. Enable Engineer 3B before confirming.';
        else if(!/^\d{4}$/.test(s.fields[0])||Number(s.fields[0].slice(0,2))>23||Number(s.fields[0].slice(2,4))>59)s.notice='Enter a valid HHMM time.';
        else{s.configured[n.field]=s.fields[0];s.pendingReset=JSON.stringify(s.configured)!==JSON.stringify(s.applied);s.notice='Weekly reminder time stored. RESET applies; calendar expiry is outside this fixture.';event(s,'panel','Weekly reminder time stored; reset required');}
      }else{
        const [date,time]=s.fields,d=Number(date.slice(0,2)),m=Number(date.slice(2,4)),y=2000+Number(date.slice(4,6)),check=new Date(Date.UTC(y,m-1,d));
        if(!/^\d{6}$/.test(date)||!/^\d{6}$/.test(time)||check.getUTCDate()!==d||check.getUTCMonth()!==m-1||Number(time.slice(0,2))>23||Number(time.slice(2,4))>59||Number(time.slice(4,6))>59)s.notice='Enter a valid DDMMYY date and HHMMSS time.';
        else{s.clock={date,time};s.notice='Practice date/time stored. No automatic BST correction.';event(s,'panel','Practice date/time set');}
      }
    }
  }else if(s.phase==='status'&&['UP','DOWN'].includes(key))s.selection=Math.max(0,s.selection+(key==='DOWN'?1:-1));
  else if(s.phase==='reference'&&key==='ENTER')s.notice='Reference only: this hardware, text-entry or unavailable function is not simulated.';
  return s;
}
function statusLines(model,s,node){
  if(node.viewType==='software')return [model.data.fixture.software,'Fictional firmware label'];
  if(node.viewType==='fixed')return [node.fixedValue,'Documented fixed value'];
  const list=node.viewType==='log'?s.events.filter(e=>node.logType==='all'||e.type===node.logType).map(e=>e.text):node.viewType==='fires'?s.latched.flatMap((v,i)=>v?[`Zone ${i+1} ${model.data.fixture.zoneNames[i]}`]:[]):node.viewType==='faults'?s.inputs.flatMap((v,i)=>v.fault&&activeInput(s,i)?[`Zone ${i+1} EOL missing`]:[]):node.viewType==='disables'?s.zoneDisabled.flatMap((v,i)=>v?[`Zone ${i+1} inputs disabled`]:[]):node.viewType==='warnings'?s.confirmationStart.flatMap((v,i)=>v!==null?[`Zone ${i+1} confirmation`]:[]):[];
  if(node.viewType==='faults'&&s.writeEnabled&&!engineer(s))list.unshift('System Fault: Write Enable');
  return list.length?[list[Math.min(s.selection,list.length-1)],`${Math.min(s.selection+1,list.length)} of ${list.length} · UP/DOWN`]:['No events in this view'];
}
export function twinflexView(model,s){
  const n=model.nodes.get(s.nodeId)||model.nodes.get('root'),level=({'1':'NORM','2A':'USER','2B':'SUPR','3A':'ENGR','3B':'ENGR'})[s.accessLevel];
  const date=s.clock.date.replace(/(..)(..)(..)/,'$1/$2/$3'),time=s.clock.time.replace(/(..)(..)(..)/,'$1:$2:$3');
  let lines=[`${date} ${time.slice(0,5)} ${level}`];
  if(!s.menuOpen)lines.push(s.pin?'ENTER ACCESS CODE':'FINDR PRACTICE SITE',s.pin?'•'.repeat(s.pin.length):s.latched.some(Boolean)?'FIRE — check zone LEDs':s.writeEnabled&&!engineer(s)?'SYSTEM FAULT':s.inputs.some((input,i)=>input.fault&&activeInput(s,i))?'FAULT — view events':'SYSTEM NORMAL',s.pin?'Code accepted on 4th digit':s.writeEnabled&&!engineer(s)?'WRITE ENABLE ON':'ENTER: current events');
  else if(s.phase==='menu'){const list=children(model,s);lines.push(n.title,...list.slice(s.selection,s.selection+1).map(c=>`${c.code}. ${c.title}`),s.buffer?`Option: ${s.buffer} ENTER`:'UP/DOWN + ENTER · ESC');}
  else if(s.phase==='zone')lines.push(n.title,`ENTER ZONE: ${s.buffer||'00'}`,'Press ENTER · ESC cancels');
  else if(s.phase==='edit')lines.push(`${n.title}${n.zoneSelect?' '+String(s.zone).padStart(2,'0'):''}`,String(s.draft),n.requiresWrite?'ENTER stores · RESET applies':'ENTER confirms · ESC cancels');
  else if(s.phase==='reference')lines.push(n.title,n.options?.join(' / ')||'','Press ESC Key');
  else if(s.phase==='fields')lines=n.editor==='code'?['EXISTING CODE:'+s.fields[0],'NEW CODE: '+s.fields[1],'CONFIRM CODE: '+s.fields[2],'Press ENTER Key']:n.editor==='time'?[lines[0],'WEEKLY TEST TIMER','TIME: '+s.fields[0].replace(/(..)(..)/,'$1:$2'),'Press ENTER Key']: [lines[0],'DATE: '+s.fields[0].replace(/(..)(..)(..)/,'$1/$2/$3'),'TIME: '+s.fields[1].replace(/(..)(..)(..)/,'$1:$2:$3'),'Press ENTER Key'];
  else if(s.phase==='status')lines.push(n.title,...statusLines(model,s,n));
  else lines.push(n.title,s.diagnostic==='test-lcd'?'████████████████████':s.diagnostic==='test-keyboard'?s.notice||'Press each physical key':'TRAINING TEST ACTIVE',s.diagnostic==='test-keyboard'?'ESC twice to exit':'ESC returns');
  const outputReady=(field,zone=null)=>s.latched.some((active,i)=>active&&(s.delaysDisabled||instantInput(s,i)||s.applied[field]==='INSTANT'||(Array.isArray(s.applied[field])&&s.applied[field][zone]==='INSTANT')||(zone===i&&s.applied['origin-delay']==='INSTANT')||s.seconds-(s.alarmStart[i]??s.seconds)>=Number(s.applied['delay-time'])*60));
  const zones=s.inputs.map((input,i)=>({id:i+1,name:model.data.fixture.zoneNames[i],fire:s.latched[i]||Boolean(s.testUntil[i]),fault:input.fault&&activeInput(s,i),disabled:s.zoneDisabled[i]||s.applied['zone-power'][i]==='OFF',test:Boolean(s.testZones[i]),power:s.applied['zone-power'][i],sounder:!s.soundersDisabled&&!s.silenced&&s.applied['zone-power'][i]==='ON'&&(s.evacuate||outputReady('zone-delay',i)||Boolean(s.testUntil[i]&&['audible','system'].includes(s.testZones[i])))}));
  const writeReminder=s.writeEnabled&&!engineer(s),fire=zones.some(z=>z.fire),fault=zones.some(z=>z.fault)||writeReminder,disabled=zones.some(z=>z.disabled)||s.soundersDisabled||s.remoteDisabled;
  const leds={fire,fault,systemFault:writeReminder,disabled,test:zones.some(z=>z.test)||Boolean(s.diagnostic),power:true,access:s.accessLevel==='1'?false:s.accessLevel==='2A'?true:s.accessLevel==='2B'?'slow-flash':'fast-flash',delay:Number(s.applied['delay-time'])>0,sounderFault:false,sounderDisabled:s.soundersDisabled,remoteDisabled:s.remoteDisabled,alarms:zones.some(z=>z.sounder)?'flash':s.silenced?'on':false,buzzerSilenced:s.buzzerSilenced};
  if(s.diagnostic==='test-leds')for(const key of Object.keys(leds))leds[key]=true;
  return {lcdLines:lines.slice(0,4),accessLevel:s.accessLevel,coverOpen:s.coverOpen,keyEnabled:s.keyEnabled,keypadOpen:true,writeEnabled:s.writeEnabled,controlsEnabled:ranks[s.accessLevel]>=1,leds,zones,node:n,phase:s.phase,fieldIndex:s.fieldIndex,pendingReset:s.pendingReset,notice:s.notice,writeReminder,buzzer:s.diagnostic==='test-buzzer'||(!s.buzzerSilenced&&s.engineerBuzzer!=='OFF'&&(fire||fault||s.evacuate||s.confirmationStart.some(v=>v!==null))),faultRelay:!fault,fireRelay:!s.remoteDisabled&&outputReady('fire-delay'),summary:{fires:zones.filter(z=>z.fire).length,faults:zones.filter(z=>z.fault).length+(writeReminder?1:0),disabled:zones.filter(z=>z.disabled).length,tests:zones.filter(z=>z.test).length}};
}
export function restoreTwinflexState(model,saved){
  const base=createTwinflexState(model);if(saved?.version!==1)return base;
  const s=clone(base);
  for(const key of ['seconds','eventSequence'])if(Number.isFinite(saved[key])&&saved[key]>=0)s[key]=saved[key];
  for(const key of ['keyEnabled','coverOpen','writeEnabled','menuOpen','pendingReset','soundersDisabled','remoteDisabled','delaysDisabled','silenced','buzzerSilenced','evacuate'])if(typeof saved[key]==='boolean')s[key]=saved[key];
  if(Object.hasOwn(ranks,saved.accessLevel))s.accessLevel=saved.accessLevel;
  if(s.accessLevel==='3B'&&!s.writeEnabled)s.accessLevel='3A';
  for(const key of ['configured','applied']){for(const node of model.nodes.values())if(node.requiresWrite&&!node.editor){const value=saved[key]?.[node.field];if(node.zoneSelect&&Array.isArray(value)&&value.length===8&&value.every(v=>node.options.includes(v)))s[key][node.field]=clone(value);else if(!node.zoneSelect&&node.options.includes(value))s[key][node.field]=value;}for(const role of ['user','supervisor','engineer'])if(/^\d{4}$/.test(saved[key]?.codes?.[role]||''))s[key].codes[role]=saved[key].codes[role];if(/^\d{4}$/.test(saved[key]?.['weekly-time']))s[key]['weekly-time']=saved[key]['weekly-time'];}
  if(saved.clock&&/^\d{6}$/.test(saved.clock.date)&&/^\d{6}$/.test(saved.clock.time))s.clock=clone(saved.clock);
  for(const key of ['confirmationStart','alarmStart','confirmationChecks'])if(Array.isArray(saved[key])&&saved[key].length===8&&saved[key].every(v=>v===null||Number.isFinite(v)))s[key]=clone(saved[key]);
  for(const key of ['zoneDisabled','latched'])if(Array.isArray(saved[key])&&saved[key].length===8&&saved[key].every(v=>typeof v==='boolean'))s[key]=clone(saved[key]);
  if(Array.isArray(saved.testZones)&&saved.testZones.length===8&&saved.testZones.every(v=>v===null||['silent','audible','system'].includes(v)))s.testZones=clone(saved.testZones);
  if(Array.isArray(saved.inputs)&&saved.inputs.length===8&&saved.inputs.every(v=>v&&typeof v.fault==='boolean'&&(v.alarm===null||['smoke','heat','mcp'].includes(v.alarm))))s.inputs=clone(saved.inputs);
  if(Array.isArray(saved.testUntil)&&saved.testUntil.length===8&&saved.testUntil.every(Number.isFinite))s.testUntil=clone(saved.testUntil);
  if(['MANUAL','AUTO'].includes(saved.resound))s.resound=saved.resound;
  if(engineer(s)&&['ON','OFF'].includes(saved.engineerBuzzer))s.engineerBuzzer=saved.engineerBuzzer;
  if(model.nodes.has(saved.nodeId)&&accessible(s,model.nodes.get(saved.nodeId))){enterNode(model,s,saved.nodeId);if(['menu','zone','edit','fields','status','reference','diagnostic'].includes(saved.phase))s.phase=saved.phase;if(Number.isInteger(saved.zone)&&saved.zone>=0&&saved.zone<=8)s.zone=saved.zone;const node=model.nodes.get(s.nodeId);if(node.options?.includes(saved.draft))s.draft=saved.draft;if(typeof saved.buffer==='string'&&/^\d{0,2}$/.test(saved.buffer))s.buffer=saved.buffer;if(Number.isInteger(saved.selection)&&saved.selection>=0)s.selection=saved.selection;if(node.editor&&Array.isArray(saved.fields)&&saved.fields.length===(node.editor==='code'?3:node.editor==='time'?1:2)&&saved.fields.every(v=>typeof v==='string'&&/^\d{0,6}$/.test(v)))s.fields=clone(saved.fields);if(Number.isInteger(saved.fieldIndex)&&saved.fieldIndex>=0&&saved.fieldIndex<s.fields.length)s.fieldIndex=saved.fieldIndex;}
  s.events=Array.isArray(saved.events)?saved.events.filter(e=>e&&typeof e.text==='string'&&['panel','fire','fault'].includes(e.type)).slice(0,500):s.events;
  s.pendingReset=JSON.stringify(s.configured)!==JSON.stringify(s.applied);s.notice='Saved fictional practice restored on this device.';return s;
}
export function leaveTwinflex(model,input){return clone(input);}
export function findTwinflexRoute(model,input,id){
  const target=model.nodes.get(id);if(!target)return {found:false,keys:[],reason:'Unknown menu item.'};
  if(target.simulationStatus==='reference-only')return {found:false,keys:[],reason:'Reference only. No verified executable route is offered.'};
  if(!accessible(input,target))return {found:false,keys:[],reason:`Exit to Normal and enter the published practice code for access ${target.access}.`};
  if(input.menuOpen&&input.nodeId===id)return {found:true,keys:[],reason:'At the documented selection. Review before confirming; hints do not commit.'};
  let s=clone(input),keys=[];if(!s.menuOpen){keys.push('ENTER');s=pressTwinflexKey(model,s,'ENTER');}
  const path=[target];let n=target;while(n.parentId){n=model.nodes.get(n.parentId);path.unshift(n);}
  let guard=0;while(!path.some(item=>item.id===s.nodeId)&&guard++<30){keys.push('ESC');s=pressTwinflexKey(model,s,'ESC');}
  const rest=path.slice(path.findIndex(item=>item.id===s.nodeId)+1);
  for(let i=0;i<rest.length;i++){
    const item=rest[i],prefix=i===0?s.buffer:'';
    if(prefix&&!item.code.startsWith(prefix))keys.push(...Array(prefix.length).fill('HASH'),...item.code.split(''),'ENTER');
    else keys.push(...item.code.slice(prefix.length).split(''),'ENTER');
  }
  return {found:true,keys,reason:'Navigate only. Enter a zone and choose the final value yourself; confirmation is never automatic.'};
}
