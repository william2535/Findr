import {compareTestEvents, localisePath} from './field-engine.mjs';
import {addTestEvent} from './field-model.mjs';

// These calculators do arithmetic on supplied evidence. They do not authorise a
// test, establish a manufacturer's limit or turn an estimate into a diagnosis.
export const CALCULATOR_VERSION = '2026-11-10.1';
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const field=(key,label,placeholder='',extra={})=>({key,label,placeholder,type:'text',...extra});
export const CALCULATOR_DEFINITIONS=freeze([
 {id:'voltage-drop',label:'Supply → device voltage',description:'Compare DC readings from the same supply and load condition.',fields:[field('supplyVoltage','Supply voltage','24.2 V'),field('deviceVoltage','Device voltage','23.6 V'),field('supplyPoint','Supply measurement points','PSU + to PSU −'),field('devicePoint','Device measurement points','Detector + to detector −'),field('powerDomain','Which supply?','PSU 1'),field('loadState','Load state','Connected, all sounders operating'),field('operatingState','Operating condition','Authorised alarm test'),field('circuitState','Circuit state','',{type:'select',options:[{value:'',label:'Choose actual state'},{value:'energised_connected',label:'Energised, load connected'},{value:'energised_disconnected',label:'Energised, load disconnected'},{value:'unknown',label:'Unknown'}]}),field('measurementTime','Measurement time','',{type:'datetime-local'}),field('sameConditionConfirmed','Same supply, method, reference polarity and operating conditions confirmed','',{type:'checkbox'})]},
 {id:'ohms-power',label:'Voltage / current / resistance',description:'Enter any two values for a passive DC load. This is an ideal calculation.',fields:[field('voltage','Voltage (optional)','12 V'),field('current','Current (optional)','200 mA'),field('resistance','Resistance (optional)','60 Ω')]},
 {id:'resistor-network',label:'Resistor network',description:'Nominal series or parallel totals; no firmware acceptance band is implied.',fields:[field('resistors','Resistors, separated by commas','2k2, 4k7'),field('connection','Connection','',{type:'select',options:[{value:'series',label:'Series'},{value:'parallel',label:'Parallel'}]})]},
 {id:'poe-budget',label:'PoE headroom',description:'Use maximum demand referred to the supplying port, its actual allocation and the total budget.',fields:[field('demands','Maximum demands, W (one per port)','12, 25'),field('allocations','Available allocations, W (same order)','15.4, 30'),field('totalBudget','Total available PoE budget','60 W'),field('otherLoad','Other load already using that budget','10 W')]},
 {id:'battery-runtime',label:'Battery runtime estimate',description:'Steady-load arithmetic only; not a capacity test or a standby-compliance result.',fields:[field('capacity','Battery-bank capacity','7 Ah'),field('current','Steady total load','350 mA'),field('usablePercent','Usable capacity percentage (optional)','80')]},
]);

const blank=value=>value===null||value===undefined||typeof value==='string'&&!value.trim();
const tidy=value=>String(value??'').trim();
const r=value=>Number.parseFloat(Number(value).toPrecision(12));
const unitSets={
 voltage:{canonical:'V',units:{v:1,vdc:1,v_dc:1,'v dc':1,mv:0.001,mvdc:0.001,mv_dc:0.001,'mv dc':0.001}},
 current:{canonical:'A',units:{a:1,adc:1,a_dc:1,'a dc':1,ma:0.001,madc:0.001,'ma dc':0.001,ua:0.000001,'µa':0.000001,'μa':0.000001}},
 resistance:{canonical:'Ω',units:{'ω':1,ohm:1,ohms:1,r:1,'kω':1000,kohm:1000,kohms:1000,k:1000,'mω':1000000,mohm:1000000,mohms:1000000}},
 power:{canonical:'W',units:{w:1,watt:1,watts:1,mw:0.001,kw:1000}},
 capacity:{canonical:'Ah',units:{ah:1,'a h':1,mah:0.001,'ma h':0.001}},
 scalar:{canonical:'',units:{'':1,'%':1}},
};

/** Strictly parse a single quantity. OL is an observation, not infinity. */
export function parseDiagnosticQuantity(input,dimension,{defaultUnit}={}){
 const spec=unitSets[dimension];if(!spec)return {ok:false,raw:input,error:'Unknown quantity type.'};
 if(blank(input))return {ok:false,missing:true,raw:input,error:'A value is needed.'};
 if(!['number','string'].includes(typeof input))return {ok:false,raw:input,error:'Enter one numeric value and its unit.'};
 const raw=String(input),text=raw.trim().replace(/−/g,'-');
 if(dimension==='resistance'){
  const shorthand=text.match(/^([+]?(?:\d+))([RrKkM])(\d+)$/);
  if(shorthand){const scale=/r/i.test(shorthand[2])?1:/k/i.test(shorthand[2])?1000:1000000;return {ok:true,raw,value:r(Number(`${shorthand[1]}.${shorthand[3]}`)*scale),unit:'Ω',enteredUnit:shorthand[2]};}
 }
 const match=text.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*([a-zA-ZΩωµμ_%\s]*)$/);
 if(!match)return {ok:false,raw,error:'Enter one number with a supported unit; keep OL, unstable or unknown as an observation.'};
 const enteredUnit=match[2].trim()||defaultUnit||spec.canonical,key=enteredUnit.toLowerCase().replace(/\s+/g,' ');
 // SI m and M are different: never turn a milliohm into a megohm.
 const milliOhm=dimension==='resistance'&&enteredUnit[0]==='m'&&['ω','ohm','ohms'].includes(enteredUnit.slice(1).toLowerCase());
 const unsupportedMega=dimension!=='resistance'&&/^M(?:V|A|W|Ah|V_DC|A_DC|V DC|A DC)$/.test(enteredUnit);
 const scale=unsupportedMega?undefined:milliOhm?0.001:spec.units[key];
 if(scale===undefined)return {ok:false,raw,error:`Use a ${spec.canonical||'numeric'} value; “${enteredUnit}” is not a supported ${dimension} unit.`};
 const value=Number(match[1])*scale;
 if(!Number.isFinite(value))return {ok:false,raw,error:'The value must be finite.'};
 return {ok:true,raw,value:r(value),unit:spec.canonical,enteredUnit};
}

const result=(kind,values={},extra={})=>({kind,calculatorVersion:CALCULATOR_VERSION,status:'calculated',values,summary:'',assumptions:[],missing:[],warnings:[],...extra});
const bad=(kind,problems)=>result(kind,{}, {status:problems.some(p=>!p.missing)?'invalid':'needs_context',missing:problems.map(p=>p.label),summary:problems.map(p=>`${p.label}: ${p.error}`).join(' ')});
const get=(input,key,dimension,problems,options={})=>{const value=parseDiagnosticQuantity(input[key],dimension,options);if(!value.ok)problems.push({...value,label:key});return value;};
const positive=(value,key,problems,{zero=false}={})=>{if(value.ok&&(zero?value.value<0:value.value<=0))problems.push({label:key,error:zero?'Must not be negative.':'Must be greater than zero.'});};
const listValues=value=>Array.isArray(value)?value:blank(value)?[]:tidy(value).split(/[,;\n]/).map(v=>v.trim());

function voltageDrop(input){
 const problems=[],sourceEvent=input.source||input.supplyEvent,deviceEvent=input.device||input.deviceEvent;
 for(const [label,event] of [['source',sourceEvent],['device',deviceEvent]])if(event&&((event.result?.kind&&event.result.kind!=='numeric')||(event.result?.executionState&&event.result.executionState!=='performed')))problems.push({label,error:'Use a performed numeric reading; unavailable or suggested tests are not comparable.'});
 const sourceInput=sourceEvent?`${sourceEvent.result?.value??''} ${sourceEvent.result?.unit||''}`:input.supplyVoltage;
 const deviceInput=deviceEvent?`${deviceEvent.result?.value??''} ${deviceEvent.result?.unit||''}`:input.deviceVoltage;
 const supply=get({supplyVoltage:sourceInput},'supplyVoltage','voltage',problems),device=get({deviceVoltage:deviceInput},'deviceVoltage','voltage',problems);
 if(problems.length)return bad('voltage-drop',problems);
 const time=input.measurementTime,flatEvent=(isSupply,quantity)=>({id:isSupply?'calculator-supply':'calculator-device',result:{value:quantity.value,unit:'V_DC',rawText:quantity.raw,source:'meter'},testKind:'dc_voltage',method:'DC voltage across supply pair',eventTime:time,points:tidy(isSupply?input.supplyPoint:input.devicePoint)?[{terminal:tidy(isSupply?input.supplyPoint:input.devicePoint)}]:[],operatingState:input.operatingState,loadState:input.loadState,powerDomain:input.powerDomain,circuitState:input.circuitState});
 const normalise=(event,quantity)=>({...event,result:{...event.result,value:quantity.value,unit:'V_DC'}});
 const a=sourceEvent?normalise(sourceEvent,supply):flatEvent(true,supply),b=deviceEvent?normalise(deviceEvent,device):flatEvent(false,device);
 const comparison=compareTestEvents(a,b,{kind:'voltage_drop',sameConditionConfirmed:input.sameConditionConfirmed===true});
 const drop=r(supply.value-device.value),percent=supply.value===0?null:r(drop/Math.abs(supply.value)*100);
 const warnings=['No pass limit or cable-break location is implied. Compare with the exact device manual and operating state.'];
 if(drop<0)warnings.push('The device reading exceeds the supply reading. Check polarity, times, points and any alternate feed before interpreting the difference.');
 if(supply.value===0)warnings.push('Percentage is undefined when the supply reading is zero.');
 return result('voltage-drop',{supplyV:supply.value,deviceV:device.value,dropV:drop,dropPercent:percent},{status:comparison.comparable?'calculated':'needs_context',comparable:comparison.comparable,comparison,raw:{supply:supply.raw,device:device.raw},missing:comparison.reasons,summary:`Arithmetic difference: ${drop} V${percent===null?'':` (${percent}% of the supply magnitude)`}. ${comparison.comparable?'The entered comparison conditions match.':'Interpretation is withheld until the readings are comparable.'}`,assumptions:['DC readings, with matching reference polarity.','The recorded times refer to the measurements, not merely the time entered.'],warnings});
}

function ohmsPower(input){
 const problems=[],values={};
 for(const [key,dimension] of [['voltage','voltage'],['current','current'],['resistance','resistance']])if(!blank(input[key]))values[key]=get(input,key,dimension,problems);
 if(problems.length)return bad('ohms-power',problems);
 if(Object.keys(values).length!==2)return bad('ohms-power',[{label:'values',missing:true,error:'Enter exactly two of voltage, current and resistance.'}]);
 if(values.resistance)positive(values.resistance,'resistance',problems);
 let voltage=values.voltage?.value,current=values.current?.value,resistance=values.resistance?.value;
 if(resistance===undefined){if(current===0)problems.push({label:'current',error:'Zero current cannot establish a finite resistance from this pair.'});else resistance=voltage/current;}
 else if(current===undefined)current=voltage/resistance;
 else voltage=current*resistance;
 if(resistance<0)problems.push({label:'resistance',error:'These signed values do not describe the passive resistive-load assumption. Check polarity and the model.'});
 if(problems.length)return bad('ohms-power',problems);
 const power=voltage*current;
 if(![voltage,current,resistance,power].every(Number.isFinite))return bad('ohms-power',[{label:'values',error:'The result is outside the supported finite range.'}]);
 return result('ohms-power',{voltageV:r(voltage),currentA:r(current),resistanceOhm:r(resistance),powerW:r(power)},{raw:Object.fromEntries(Object.entries(values).map(([k,v])=>[k,v.raw])),summary:`${r(voltage)} V · ${r(current)} A · ${r(resistance)} Ω · ${r(power)} W`,assumptions:['Ideal passive DC resistive load; steady state.'],warnings:['Electronic, inductive, pulsed and constant-power loads need their own model. This is not an instruction to measure resistance on a connected circuit.']});
}

function resistorNetwork(input){
 const problems=[],entries=listValues(input.resistors);
 if(!entries.length)return bad('resistor-network',[{label:'resistors',missing:true,error:'Enter at least one resistor value.'}]);
 const values=entries.map((entry,index)=>{const value=get({[index]:entry},index,'resistance',problems);positive(value,`resistor ${index+1}`,problems,{zero:true});return value;});
 if(!['series','parallel'].includes(input.connection))problems.push({label:'connection',missing:blank(input.connection),error:'Choose series or parallel.'});
 if(problems.length)return bad('resistor-network',problems);
 const ohms=input.connection==='series'?values.reduce((sum,value)=>sum+value.value,0):values.some(value=>value.value===0)?0:1/values.reduce((sum,value)=>sum+1/value.value,0);
 if(!Number.isFinite(ohms))return bad('resistor-network',[{label:'resistors',error:'The total is outside the supported finite range.'}]);
 return result('resistor-network',{resistanceOhm:r(ohms),connection:input.connection,resistorsOhm:values.map(v=>v.value)},{raw:values.map(v=>v.raw),summary:`Nominal ${input.connection} total: ${r(ohms)} Ω (${r(ohms/1000)} kΩ).`,assumptions:['Ideal resistor values; tolerance, leads and contacts are excluded.'],warnings:['A nominal network total is not a panel acceptance band. Confirm the actual wiring profile and contact states. OL is not a numeric resistor value.']});
}

function poeBudget(input){
 const problems=[],ports=Array.isArray(input.ports)?input.ports:null,demands=ports?ports.map(p=>p?.demand):listValues(input.demands),allocations=ports?ports.map(p=>p?.allocation):listValues(input.allocations);
 if(!demands.length)problems.push({label:'demands',missing:true,error:'Enter the maximum demand for each port.'});
 if(demands.length!==allocations.length)problems.push({label:'allocations',missing:true,error:'Record a matching available allocation for every port.'});
 const parseList=(values,name)=>values.map((entry,index)=>{const value=get({value:entry},'value','power',problems);positive(value,`${name} ${index+1}`,problems,{zero:true});return value;});
 const demandValues=parseList(demands,'demand'),allocationValues=parseList(allocations,'allocation');
 const budget=get(input,'totalBudget','power',problems),other=get(input,'otherLoad','power',problems);positive(budget,'totalBudget',problems,{zero:true});positive(other,'otherLoad',problems,{zero:true});
 if(problems.length)return bad('poe-budget',problems);
 const perPort=demandValues.map((value,index)=>({port:ports?.[index]?.label||`Port ${index+1}`,demandW:value.value,allocationW:allocationValues[index].value,headroomW:r(allocationValues[index].value-value.value)}));
 const totalDemand=r(demandValues.reduce((sum,v)=>sum+v.value,0)+other.value),headroom=r(budget.value-totalDemand),shortPorts=perPort.filter(p=>p.headroomW<0);
 return result('poe-budget',{ports:perPort,totalDemandW:totalDemand,totalBudgetW:budget.value,headroomW:headroom},{summary:`Total headroom: ${headroom} W. ${shortPorts.length?`${shortPorts.length} port(s) exceed their entered allocation.`:'Entered per-port demands do not exceed their allocations.'}`,assumptions:['Demand and available allocation are referred to the same point (the PSE port), including applicable cable losses.','Use model-specific maximum demand with installed IR, heaters, PTZ and accessories; record the actual allocation, not just the nominal PoE class.','Other load is included once; the entered total budget is available in the current supply/temperature configuration.'],warnings:['Headroom arithmetic cannot confirm negotiation, cable integrity, switch operation or recording. A non-negative budget is not a functional pass.']});
}

function batteryRuntime(input){
 const problems=[],capacity=get(input,'capacity','capacity',problems),current=get(input,'current','current',problems);positive(capacity,'capacity',problems);positive(current,'current',problems);
 const usable=blank(input.usablePercent)?null:get(input,'usablePercent','scalar',problems);
 if(usable?.ok&&(usable.value<=0||usable.value>100))problems.push({label:'usablePercent',error:'Enter a value above zero and no more than 100%.'});
 if(problems.length)return bad('battery-runtime',problems);
 const factor=usable?usable.value/100:1,hours=r(capacity.value*factor/current.value);
 if(!Number.isFinite(hours)||!Number.isFinite(capacity.value/current.value))return bad('battery-runtime',[{label:'values',error:'The estimate is outside the supported finite range.'}]);
 return result('battery-runtime',{idealHours:r(capacity.value/current.value),estimatedHours:hours,usablePercent:usable?.value??null,capacityAh:capacity.value,currentA:current.value},{summary:`${usable?'Adjusted estimate':'Ideal, unadjusted estimate'}: ${hours} hours at ${current.value} A.`,assumptions:['Constant total battery current, including panel and connected equipment.','Capacity is the whole bank’s Ah at the applicable discharge rate; series batteries do not add Ah.','Manufacturer discharge curves, temperature, ageing, cutoff voltage and alarm duty are not modelled.'],warnings:['This does not measure battery capacity, prove standby duration or certify compliance. Use the applicable battery/panel calculations and a supported test.']});
}

export function calculateDiagnostic(kind,input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))return bad(kind,[{label:'input',error:'Enter a calculator input record.'}]);
 const calculator={'voltage-drop':voltageDrop,'ohms-power':ohmsPower,'resistor-network':resistorNetwork,'poe-budget':poeBudget,'battery-runtime':batteryRuntime}[kind];
 return calculator?calculator(input):bad(kind,[{label:'calculator',error:'Unknown calculator.'}]);
}

/** Existing evidence rules retain topology provenance and correction handling. */
export function calculateEvidenceBoundary(visit,path){return {calculatorVersion:CALCULATOR_VERSION,...localisePath(visit,path)};}

/** Save derived arithmetic alongside the job; this never completes a field test. */
export function recordDiagnosticCalculation(session,calculation,input={},options={}){
 if(!session?.fieldVisit||!session?.diagnosticChat)throw Error('Open a diagnostic visit before saving a calculation.');
 if(['paused','finished'].includes(session.diagnosticChat.status))throw Error('Resume this visit before adding a calculation.');
 if(calculation?.calculatorVersion!==CALCULATOR_VERSION)throw Error('Recalculate with the current calculator before saving.');
 // Recompute from raw input rather than trusting a caller-supplied verdict/value.
 const checked=calculateDiagnostic(calculation.kind,input);
 if(checked.status==='invalid'||!Object.keys(checked.values).length)throw Error('Complete the calculator inputs before saving a result.');
 const next=structuredClone(session),chat=next.diagnosticChat,incidentId=chat.incidentId||next.fieldVisit.currentIncidentId;
 if(!next.fieldVisit.incidents.some(incident=>incident.id===incidentId))throw Error('The current diagnostic incident is unavailable.');
 const now=Number.isFinite(options.now)?options.now:Date.now(),id=options.eventId||options.id||globalThis.crypto.randomUUID();
 const record={kind:checked.kind,version:CALCULATOR_VERSION,rawInputs:structuredClone(input),status:checked.status,values:structuredClone(checked.values),summary:checked.summary,assumptions:structuredClone(checked.assumptions),warnings:structuredClone(checked.warnings),missing:structuredClone(checked.missing),...(checked.comparison?{comparison:structuredClone(checked.comparison)}:{})};
 const previous=next.fieldVisit.events.find(event=>event.id===id);
 if(previous){if(previous.testKind==='calculation'&&JSON.stringify(previous.calculation)===JSON.stringify(record))return next;throw Error('This calculation ID is already used by a different record.');}
 next.fieldVisit=addTestEvent(next.fieldVisit,{id,incidentId,testKind:'calculation',method:`${checked.kind} / ${CALCULATOR_VERSION}`,eventTime:now,clockSource:'calculation_capture',points:[],circuitState:'not_a_measurement',operatingState:'derived_from_recorded_inputs',calculation:record,result:{rawText:checked.summary,kind:'state',unit:'',source:'derived',executionState:'calculated'},interpretation:{status:'calculated_only',reason:'Derived arithmetic from the retained inputs, not a performed measurement, completed check, model pass or confirmed cause.'}},now);
 chat.messages.push({id:`${id}:message`,role:'assistant',kind:'calculation',createdAt:now,text:`Calculator / ${checked.kind}\n${checked.summary}\nDerived arithmetic saved with its inputs and assumptions. No test or diagnostic answer has been completed.`,eventIds:[id],calculatorVersion:CALCULATOR_VERSION});
 chat.updatedAt=now;
 return next;
}
