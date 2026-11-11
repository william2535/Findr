import {parseDiagnosticQuantity} from './diagnostic-calculators.mjs';

// Offline arithmetic, not a design approval or a performed electrical test.
export const TOOLBOX_CALCULATOR_VERSION = '2026-11-11.1';
export const COPPER_RESISTIVITY_20 = 0.01724; // Ω mm² / m, ideal annealed copper
export const COPPER_TEMPERATURE_COEFFICIENT = 0.00393; // per °C near room temperature
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const blank=value=>value===null||value===undefined||typeof value==='string'&&!value.trim();
const rounded=value=>Number.parseFloat(value.toPrecision(12));
const display=value=>Number(value.toPrecision(6)).toLocaleString('en-GB',{maximumSignificantDigits:6});

const copperSource={title:'Eland Cables — copper conductor properties',url:'https://www.elandcables.com/the-cable-lab/faqs/faq-what-are-the-benefits-of-using-copper-vs-aluminium-conductors',section:'IACS annealed copper resistivity',note:'1.724 µΩ cm at 20°C = 0.01724 Ω mm²/m. Ideal material value, not a cable manufacturer’s maximum DC resistance.'};
const temperatureSource={title:'Cirris — Temperature Coefficient of Copper',url:'https://cirris.com/temperature-coefficient-of-copper/',section:'Resistance temperature correction',note:'Linear copper coefficient 0.00393/°C near room temperature; not a cable temperature rating.'};
const batterySource={title:'C-TEC XFP 1 or 2 Loop 32 Zone Engineering Manual',url:'https://c-tec.com/download?wpdmdl=12095',revision:'DFU2200510 Rev 2',pdfPage:35,section:'Standby battery calculation guide',note:'Manufacturer example only: this panel specifies separate loop-load multipliers and an ageing factor. The generic calculator does not apply those model-specific adjustments automatically.'};
const resistorSources=[{title:'Vishay — Color Code and Standard Resistance Series',url:'https://www.vishay.com/docs/20143/colorcod.pdf',revision:'28-Aug-09',pdfPage:1,section:'Resistor colour code'}, {title:'TE Connectivity — Resistor Color Codes',url:'https://www.te.com/en/products/passive-active-electronic-components/resistors/intersection/resistor-color-codes.html',section:'4, 5 and 6 band resistor tables',note:'Sixth-band temperature coefficient and orange/yellow tolerance values are shown in the TE table. Check unusual markings against the component datasheet.'}];

export const RESISTOR_COLOURS=freeze([
 ['black','Black','#111111',0,1,null,250],['brown','Brown','#83512e',1,10,1,100],
 ['red','Red','#e43c3c',2,100,2,50],['orange','Orange','#ee8a20',3,1000,3,15],
 ['yellow','Yellow','#f2d329',4,10000,4,25],['green','Green','#198a42',5,100000,0.5,20],
 ['blue','Blue','#286bd4',6,1000000,0.25,10],['violet','Violet','#8a49b5',7,10000000,0.1,5],
 ['grey','Grey','#909090',8,100000000,0.05,1],['white','White','#f4f4f4',9,1000000000,null,null],
 ['gold','Gold','#c8a43d',null,0.1,5,null],['silver','Silver','#b9bec4',null,0.01,10,null],
].map(([value,label,hex,digit,multiplier,tolerancePercent,tempcoPpm])=>({value,label,hex,digit,multiplier,tolerancePercent,tempcoPpm})));

const bandCount=value=>[4,5,6].includes(Number(value))&&['number','string'].includes(typeof value)?Number(value):null;
export function resistorBandOptions(bands,index){
 const count=bandCount(bands);if(!count||!Number.isInteger(index)||index<0||index>=count)return [];
 const digits=count===4?2:3;
 if(index<digits)return RESISTOR_COLOURS.filter(colour=>colour.digit!==null&&(index!==0||colour.digit!==0));
 const role=index===digits?'multiplier':index===digits+1?'tolerancePercent':'tempcoPpm';
 return RESISTOR_COLOURS.filter(colour=>colour[role]!==null);
}

const inputField=(key,label,extra={})=>({key,label,type:'text',...extra});
export const TOOLBOX_DEFINITIONS=freeze([
 {id:'battery-capacity',label:'Fire alarm battery calculator',description:'Standby and alarm capacity from your confirmed loads and design periods.',defaults:{standbyHours:24,alarmMinutes:30,capacityFactor:1,alarmCurrentMode:'total'},fields:[inputField('standbyCurrent','Total standby current (A or mA)'),inputField('alarmCurrent','Alarm current (A or mA)'),inputField('standbyHours','Standby duration (hours)'),inputField('alarmMinutes','Alarm duration (minutes)'),inputField('capacityFactor','Capacity factor (1 = no allowance)'),inputField('alarmCurrentMode','Alarm current figure',{type:'select',options:[{value:'total',label:'Total during alarm'},{value:'additional',label:'Additional to standby'}]}),inputField('selectedCapacity','Selected bank capacity (Ah, optional)'),inputField('maxCapacity','Panel / charger maximum (Ah, optional)')]},
 {id:'cable-voltage-drop',label:'Voltage drop calculator',description:'DC two-wire cable estimate, including the outgoing and return conductors.',defaults:{temperatureC:20,resistanceMode:'estimate'},fields:[inputField('supplyVoltage','Supply voltage (V)'),inputField('current','Load current (A or mA)'),inputField('lengthM','One-way cable length (m)'),inputField('csaMm2','Conductor area (mm²)'),inputField('temperatureC','Conductor temperature (°C)'),inputField('resistanceMode','Cable resistance',{type:'select',options:[{value:'estimate',label:'Ideal copper estimate'},{value:'manufacturer',label:'Manufacturer Ω/km at 20°C'}]}),inputField('resistanceOhmPerKm','Single conductor resistance at 20°C (Ω/km)')]},
 {id:'resistor-colours',label:'Resistor colour code',description:'Read nominal resistance, tolerance and a sixth-band temperature coefficient.',defaults:{bands:4,colours:['yellow','violet','red','gold']},fields:[]},
 {id:'conductor-resistance',label:'Conductor resistance & R1 + R2',description:'Separate line and protective conductor resistances for a radial length.',defaults:{temperatureC:20,resistanceMode:'estimate'},fields:[inputField('lengthM','One-way length (m)'),inputField('lineCsaMm2','Line conductor area (mm²)'),inputField('cpcCsaMm2','Protective conductor area (mm²)'),inputField('temperatureC','Conductor temperature (°C)'),inputField('resistanceMode','Cable resistance',{type:'select',options:[{value:'estimate',label:'Ideal copper estimate'},{value:'manufacturer',label:'Manufacturer Ω/km at 20°C'}]}),inputField('lineOhmPerKm','Line resistance at 20°C (Ω/km)'),inputField('cpcOhmPerKm','Protective conductor resistance at 20°C (Ω/km)')]},
]);

function context(kind,input){
 const errors={},missing=[];
 const error=(key,message,isMissing=false)=>{errors[key]=message;if(isMissing)missing.push(key);return null;};
 const quantity=(key,dimension,{optional=false,min=0,exclusive=false}={})=>{
  if(optional&&blank(input[key]))return null;
  const parsed=parseDiagnosticQuantity(input[key],dimension);
  if(!parsed.ok)return error(key,parsed.error,parsed.missing);
  if(exclusive?parsed.value<=min:parsed.value<min)return error(key,exclusive?`Enter a value greater than ${min}.`:`Enter a value of ${min} or more.`);
  return parsed.value;
 };
 const number=(key,{optional=false,min=0,exclusive=false,max=Infinity}={})=>{
  if(optional&&blank(input[key]))return null;
  if(blank(input[key]))return error(key,'A value is needed.',true);
  if(!['number','string'].includes(typeof input[key])||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(String(input[key]).trim()))return error(key,'Enter one number in the displayed unit.');
  const value=Number(input[key]);
  if(!Number.isFinite(value))return error(key,'Enter a finite number.');
  if((exclusive?value<=min:value<min)||value>max)return error(key,`Enter ${exclusive?'more than':'at least'} ${min}${max!==Infinity?` and no more than ${max}`:''}.`);
  return value;
 };
 const choice=(key,choices)=>choices.includes(input[key])?input[key]:error(key,`Choose ${choices.join(' or ')}.`,blank(input[key]));
 const finish=(values={},extra={})=>{
  if(Object.values(values).some(value=>typeof value==='number'&&!Number.isFinite(value)))error('range','The result is outside the supported finite range. Check the inputs.');
  const invalid=Object.keys(errors).length>0;
  return {kind,calculatorVersion:TOOLBOX_CALCULATOR_VERSION,status:invalid?(Object.keys(errors).every(key=>missing.includes(key))?'needs_context':'invalid'):'calculated',values:invalid?{}:Object.fromEntries(Object.entries(values).map(([key,value])=>[key,typeof value==='number'?rounded(value):value])),assumptions:[],warnings:[],formulas:[],sourceRefs:[],...extra,summary:invalid?'Check the highlighted inputs.':extra.summary||'',errors:{...errors}};
 };
 return {error,quantity,number,choice,finish,hasErrors:()=>Object.keys(errors).length>0};
}

function batteryCapacity(input){
 const c=context('battery-capacity',input);
 const standby=c.quantity('standbyCurrent','current'),alarm=c.quantity('alarmCurrent','current');
 const hours=c.number('standbyHours'),minutes=c.number('alarmMinutes'),factor=c.number('capacityFactor',{min:1});
 const mode=c.choice('alarmCurrentMode',['total','additional']);
 const selected=c.quantity('selectedCapacity','capacity',{optional:true,exclusive:true}),maximum=c.quantity('maxCapacity','capacity',{optional:true,exclusive:true});
 if(c.hasErrors())return c.finish();
 if(hours+minutes===0)return c.error('standbyHours','Enter a standby or alarm period greater than zero.'),c.finish();
 const totalAlarm=mode==='additional'?standby+alarm:alarm,alarmHours=minutes/60;
 const standbyAh=standby*hours,alarmAh=totalAlarm*alarmHours,baseAh=standbyAh+alarmAh,requiredAh=baseAh*factor;
 const warnings=['This is capacity arithmetic, not a capacity test, standby guarantee or BS 5839 compliance assessment.','Use the applicable panel/battery calculation for load adjustments, ageing, temperature, discharge rate, cutoff and charging limits. Series batteries retain one battery’s Ah; their Ah values do not add.'];
 if(factor===1)warnings.push('Capacity factor 1 adds no allowance. Confirm the factor and any load multipliers required for this system.');
 if(selected!==null&&selected<requiredAh)warnings.push('The selected capacity is below this calculated requirement.');
 if(maximum!==null&&requiredAh>maximum)warnings.push('The calculated requirement exceeds the entered panel / charger maximum. Review the system design.');
 if(maximum!==null&&selected!==null&&selected>maximum)warnings.push('The selected capacity exceeds the entered panel / charger maximum.');
 if(mode==='total'&&alarm<standby)warnings.push('Total alarm current is lower than standby current. Confirm this reflects the actual operating configuration.');
 return c.finish({standbyCurrentA:standby,alarmCurrentA:alarm,totalAlarmCurrentA:totalAlarm,standbyHours:hours,alarmHours,standbyAh,alarmAh,baseAh,capacityFactor:factor,requiredAh,selectedAh:selected,maxAh:maximum,selectedHeadroomAh:selected===null?null:selected-requiredAh,maximumHeadroomAh:maximum===null?null:maximum-requiredAh},{summary:`Calculated capacity: ${display(requiredAh)} Ah${factor===1?' before any allowance':''}.`,assumptions:['Standby is followed by the full alarm period; alarm time is not deducted from standby time.',mode==='additional'?'The entered extra alarm current is added to standby current for the alarm period.':'The entered alarm current is the total during alarm; standby current is not added again.','Loads are referred to the battery bank. Apply any manufacturer-specific load multipliers before entry. No panel, battery model or required design period is assumed.'],warnings,formulas:['Alarm hours = alarm minutes ÷ 60',`Total alarm current = ${mode==='additional'?'standby current + additional alarm current':'entered total alarm current'}`,'Required Ah = capacity factor × [(standby A × standby hours) + (total alarm A × alarm hours)]'],sourceRefs:[batterySource]});
}

function copperInputs(c,input){
 const mode=c.choice('resistanceMode',['estimate','manufacturer']);
 // Linear approximation is useful near ambient, not at arbitrary temperatures.
 const temperature=c.number('temperatureC',{min:-50,max:150});
 return {mode,temperature,factor:temperature===null?null:1+COPPER_TEMPERATURE_COEFFICIENT*(temperature-20)};
}
const copperAssumptions=(mode)=>[mode==='estimate'?`Ideal annealed copper at 20°C: ρ = ${COPPER_RESISTIVITY_20} Ω mm²/m. Actual cable resistance may be higher; use its datasheet Ω/km where available.`:'Entered manufacturer resistance is for one copper conductor at 20°C, not an already doubled loop or mV/A/m figure.',`Copper temperature factor = 1 + ${COPPER_TEMPERATURE_COEFFICIENT} × (°C − 20). This is a linear approximation near ambient; the input range does not imply a safe cable operating temperature.`,'Joints, terminations, contact resistance and parallel return paths are excluded.'];
const copperSources=mode=>mode==='estimate'?[copperSource,temperatureSource]:[temperatureSource];

function voltageDrop(input){
 const c=context('cable-voltage-drop',input),supply=c.quantity('supplyVoltage','voltage',{exclusive:true}),current=c.quantity('current','current'),length=c.number('lengthM');
 const {mode,temperature,factor}=copperInputs(c,input);
 const area=mode==='estimate'?c.number('csaMm2',{exclusive:true}):null;
 const perKm=mode==='manufacturer'?c.number('resistanceOhmPerKm',{exclusive:true}):area?COPPER_RESISTIVITY_20*1000/area:null;
 if(c.hasErrors())return c.finish();
 const conductor=length*perKm/1000*factor,loop=conductor*2,drop=current*loop,load=supply-drop;
 const warnings=['DC, two equal copper conductors and one load at the far end only. Not an AC, distributed loop, PoE or cable-sizing calculation.','Compare the estimated load voltage with the device’s applicable documented requirements. No operating pass is inferred.'];
 if(drop>=supply)warnings.push('The model uses all or more of the supply voltage. The requested constant current cannot be assumed at the load; check the circuit and assumptions. A negative arithmetic result is not a predicted physical reverse voltage.');
 return c.finish({supplyVoltageV:supply,currentA:current,lengthM:length,temperatureC:temperature,temperatureFactor:factor,conductorOhmPerKm20:perKm,conductorResistanceOhm:conductor,loopResistanceOhm:loop,dropV:drop,dropPercent:drop/supply*100,loadVoltageV:load},{summary:`Cable drop ${display(drop)} V (${display(drop/supply*100)}%); arithmetic load voltage ${display(load)} V.`,assumptions:[...copperAssumptions(mode),'Length is one way; the return conductor is included once. The same current flows through both conductors.'],warnings,formulas:['Single-conductor R at temperature = (one-way metres × Ω/km at 20°C ÷ 1000) × temperature factor','Pair R = 2 × single-conductor R','Drop V = load A × pair Ω; drop % = 100 × drop V ÷ supply V','Load V = supply V − drop V'],sourceRefs:copperSources(mode)});
}

function conductorResistance(input){
 const c=context('conductor-resistance',input),length=c.number('lengthM');
 const {mode,temperature,factor}=copperInputs(c,input);
 const lineArea=mode==='estimate'?c.number('lineCsaMm2',{exclusive:true}):null,cpcArea=mode==='estimate'?c.number('cpcCsaMm2',{exclusive:true}):null;
 const line=mode==='manufacturer'?c.number('lineOhmPerKm',{exclusive:true}):lineArea?COPPER_RESISTIVITY_20*1000/lineArea:null;
 const cpc=mode==='manufacturer'?c.number('cpcOhmPerKm',{exclusive:true}):cpcArea?COPPER_RESISTIVITY_20*1000/cpcArea:null;
 if(c.hasErrors())return c.finish();
 const r1=length*line/1000*factor,r2=length*cpc/1000*factor,total=r1+r2;
 return c.finish({lengthM:length,temperatureC:temperature,temperatureFactor:factor,lineOhmPerKm20:line,cpcOhmPerKm20:cpc,r1Ohm:r1,r2Ohm:r2,r1PlusR2Ohm:total},{summary:`R1 ${display(r1)} Ω + R2 ${display(r2)} Ω = ${display(total)} Ω.`,assumptions:[...copperAssumptions(mode),'R1 is the line conductor; R2 is the circuit protective conductor. Each uses the entered one-way length. Their sum includes both; it is not doubled again.'],warnings:['Calculated DC resistance, not a measured continuity result, earth fault loop impedance Zs, proof of isolation or a compliance result.','Radial conductor lengths only; ring circuits, parallel paths, joints and fault-loop supply impedance are not modelled.'],formulas:['R1 = one-way metres × line Ω/km ÷ 1000 × temperature factor','R2 = one-way metres × protective conductor Ω/km ÷ 1000 × temperature factor','R1 + R2 = calculated R1 + calculated R2'],sourceRefs:copperSources(mode)});
}

function resistorColours(input){
 const c=context('resistor-colours',input),bands=bandCount(input.bands);
 if(!bands)c.error('bands','Choose 4, 5 or 6 bands.',blank(input.bands));
 if(!Array.isArray(input.colours)||input.colours.length!==bands)c.error('colours','Choose exactly one colour for every band.',blank(input.colours));
 if(c.hasErrors())return c.finish();
 const names=input.colours.map(colour=>typeof colour==='string'?colour.trim().toLowerCase().replace(/^gray$/,'grey'):'');
 const colours=names.map((name,index)=>{const found=resistorBandOptions(bands,index).find(colour=>colour.value===name);if(!found)c.error(`colour${index}`,`Choose a valid colour for band ${index+1}.`);return found;});
 if(c.hasErrors())return c.finish();
 const digits=bands===4?2:3,significantDigits=colours.slice(0,digits).map(colour=>colour.digit).join('');
 const multiplier=colours[digits].multiplier,ohms=Number(significantDigits)*multiplier,tolerance=colours[digits+1].tolerancePercent,tempco=bands===6?colours[5].tempcoPpm:null;
 const formatted=ohms>=1e6?`${display(ohms/1e6)} MΩ`:ohms>=1000?`${display(ohms/1000)} kΩ`:`${display(ohms)} Ω`;
 return c.finish({bands,colours:names,significantDigits,multiplier,resistanceOhm:ohms,tolerancePercent:tolerance,minimumOhm:ohms*(1-tolerance/100),maximumOhm:ohms*(1+tolerance/100),tempcoPpm:tempco},{summary:`${formatted} ±${tolerance}%${tempco===null?'':` · ${tempco} ppm/°C`}.`,assumptions:['Read from the significant-digit end; the separated tolerance band is near the other end. Confirm the physical orientation.',bands===6?'Sixth band is the temperature coefficient in this supported marking scheme.':'This is the standard resistance/tolerance marking scheme.'],warnings:['Nominal marked value only. This does not establish wattage, measured condition or suitability for a panel’s end-of-line circuit.','Unusual, damaged, military, reliability and zero-ohm link markings require the component datasheet.'],formulas:[`${digits} significant digits × multiplier = nominal Ω`,'Tolerance range = nominal Ω × (1 ± tolerance % ÷ 100)'],sourceRefs:resistorSources});
}

export function calculateToolbox(kind,input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))return {kind,calculatorVersion:TOOLBOX_CALCULATOR_VERSION,status:'invalid',values:{},summary:'Enter a calculator input record.',assumptions:[],warnings:[],errors:{input:'Enter an input record.'},formulas:[],sourceRefs:[],rawInputs:input};
 const calculator={'battery-capacity':batteryCapacity,'cable-voltage-drop':voltageDrop,'resistor-colours':resistorColours,'conductor-resistance':conductorResistance}[kind];
 const output=calculator?calculator(input):{...context(kind,input).finish(),status:'invalid',errors:{calculator:'Unknown Tool box calculator.'},summary:'Choose a Tool box calculator.'};
 // Full raw values, not display rounding, remain available to copy/export.
 return {...output,rawInputs:structuredClone(input)};
}
