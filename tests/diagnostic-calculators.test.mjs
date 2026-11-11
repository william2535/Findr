import test from 'node:test';
import assert from 'node:assert/strict';
import {CALCULATOR_DEFINITIONS,calculateDiagnostic,calculateEvidenceBoundary,parseDiagnosticQuantity,recordDiagnosticCalculation} from '../public/app/diagnostic-calculators.mjs';
import {ensureDiagnosticChat,attachDiagnosticManual,confirmDiagnosticIdentity,submitDiagnosticText,getDiagnosticPrompt,finishDiagnosticChat} from '../public/app/diagnostic-chat-engine.mjs';

const voltageContext={supplyVoltage:'24.2 V',deviceVoltage:'23600 mV',supplyPoint:'PSU + to PSU −',devicePoint:'Device + to Device −',powerDomain:'PSU 1',loadState:'connected, standby',operatingState:'standby',circuitState:'energised_connected',measurementTime:'2026-11-10T10:00:00Z',sameConditionConfirmed:true};

test('quantity parsing preserves zero/raw entries and distinguishes SI prefixes',()=>{
 assert.deepEqual(parseDiagnosticQuantity('0 V','voltage'),{ok:true,raw:'0 V',value:0,unit:'V',enteredUnit:'V'});
 assert.equal(parseDiagnosticQuantity('350 mA','current').value,0.35);
 assert.equal(parseDiagnosticQuantity('4k7','resistance').value,4700);
 assert.equal(parseDiagnosticQuantity('2K2','resistance').value,2200);
 assert.equal(parseDiagnosticQuantity('100 mΩ','resistance').value,0.1);
 assert.equal(parseDiagnosticQuantity('100 mOhm','resistance').value,0.1);
 assert.equal(parseDiagnosticQuantity('1 MΩ','resistance').value,1e6);
 assert.equal(parseDiagnosticQuantity('12 MV','voltage').ok,false);
 for(const value of ['OL','unknown','unstable','12 or 14','12 V AC',Infinity,true,{},'1e999 V'])assert.equal(parseDiagnosticQuantity(value,'voltage').ok,false,String(value));
 assert.equal(parseDiagnosticQuantity('','voltage').missing,true);
});

test('voltage arithmetic with mixed metric units requires actual comparable conditions',()=>{
 const incomplete=calculateDiagnostic('voltage-drop',{supplyVoltage:'24.2V',deviceVoltage:'23600mV'});
 assert.equal(incomplete.values.dropV,0.6);
 assert.equal(incomplete.status,'needs_context');assert.equal(incomplete.comparable,false);
 const result=calculateDiagnostic('voltage-drop',voltageContext);
 assert.equal(result.status,'calculated');assert.equal(result.comparable,true);assert.equal(result.values.dropV,0.6);
 assert.equal(result.raw.device,'23600 mV');assert.equal('pass' in result,false);
 for(const key of ['circuitState','measurementTime','powerDomain','sameConditionConfirmed'])assert.equal(calculateDiagnostic('voltage-drop',{...voltageContext,[key]:null}).comparable,false,key);
});

test('voltage comparisons reject different loads, unavailable tests and reversed inferences',()=>{
 const event=(id,value,unit='V_DC')=>({id,eventTime:'2026-11-10T10:00:00Z',testKind:'dc_voltage',method:'DC voltage',points:[{terminal:id+' + to −'}],powerDomain:'PSU 1',operatingState:'standby',loadState:'connected',circuitState:'energised_connected',result:{kind:'numeric',executionState:'performed',value,unit,rawText:String(value),source:'meter'}});
 const source=event('source',24),device=event('device',23000,'mV_DC');
 assert.equal(calculateDiagnostic('voltage-drop',{source,device,sameConditionConfirmed:true}).values.dropV,1);
 assert.equal(calculateDiagnostic('voltage-drop',{source,device:{...device,loadState:'disconnected'},sameConditionConfirmed:true}).comparable,false);
 assert.equal(calculateDiagnostic('voltage-drop',{source,device:{...device,result:{...device.result,kind:'unavailable'}},sameConditionConfirmed:true}).status,'invalid');
 const reverse=calculateDiagnostic('voltage-drop',{...voltageContext,supplyVoltage:'12V',deviceVoltage:'13V'});
 assert.equal(reverse.values.dropV,-1);assert.match(reverse.warnings.join(' '),/alternate feed/);
 const zero=calculateDiagnostic('voltage-drop',{...voltageContext,supplyVoltage:'0V',deviceVoltage:'0V'});
 assert.equal(zero.values.dropPercent,null);assert.equal(zero.values.dropV,0);
});

test('Ohm/power calculator derives all three input combinations without unsafe measurement advice',()=>{
 for(const input of [{voltage:'12V',current:'200mA'},{voltage:'12V',resistance:'60Ω'},{current:'200mA',resistance:'60Ω'}])assert.deepEqual(calculateDiagnostic('ohms-power',input).values,{voltageV:12,currentA:0.2,resistanceOhm:60,powerW:2.4});
 assert.equal(calculateDiagnostic('ohms-power',{voltage:'0V',current:'0A'}).status,'invalid');
 assert.equal(calculateDiagnostic('ohms-power',{voltage:'12V',resistance:'0Ω'}).status,'invalid');
 assert.equal(calculateDiagnostic('ohms-power',{voltage:'12V',current:'-1A'}).status,'invalid');
 assert.equal(calculateDiagnostic('ohms-power',{voltage:'12V'}).status,'needs_context');
 assert.match(calculateDiagnostic('ohms-power',{voltage:'12V',current:'200mA'}).warnings[0],/not an instruction/);
});

test('network calculator keeps ideal totals distinct from panel states and OL',()=>{
 const series=calculateDiagnostic('resistor-network',{resistors:'2k2,4k7',connection:'series'});
 assert.equal(series.values.resistanceOhm,6900);assert.match(series.warnings[0],/not a panel acceptance band/);
 assert.equal(calculateDiagnostic('resistor-network',{resistors:'120Ω,120Ω',connection:'parallel'}).values.resistanceOhm,60);
 assert.equal(calculateDiagnostic('resistor-network',{resistors:'0,120',connection:'parallel'}).values.resistanceOhm,0);
 assert.equal(calculateDiagnostic('resistor-network',{resistors:'OL,120',connection:'parallel'}).status,'invalid');
 assert.equal(calculateDiagnostic('resistor-network',{resistors:'-1,120',connection:'series'}).status,'invalid');
 assert.equal(calculateDiagnostic('resistor-network',{resistors:'2k2,,4k7',connection:'series'}).status,'needs_context');
});

test('PoE budget distinguishes per-port shortage from aggregate spare power',()=>{
 const result=calculateDiagnostic('poe-budget',{demands:'20,10',allocations:'15.4,30',totalBudget:'100',otherLoad:'0'});
 assert.equal(result.values.headroomW,70);assert.equal(result.values.ports[0].headroomW,-4.6);
 assert.match(result.summary,/1 port\(s\) exceed/);assert.match(result.warnings[0],/not a functional pass/);
 assert.equal(calculateDiagnostic('poe-budget',{demands:'12,25',allocations:'30',totalBudget:'60',otherLoad:'0'}).status,'needs_context');
 assert.equal(calculateDiagnostic('poe-budget',{demands:'12,,25',allocations:'30,,30',totalBudget:'60',otherLoad:'0'}).status,'needs_context');
 assert.equal(calculateDiagnostic('poe-budget',{demands:'12',allocations:'30',totalBudget:'60'}).status,'needs_context');
 assert.equal(calculateDiagnostic('poe-budget',{demands:'class 4',allocations:'30',totalBudget:'60',otherLoad:'0'}).status,'invalid');
 assert.equal(calculateDiagnostic('poe-budget',{ports:[null],totalBudget:'60',otherLoad:'0'}).status,'needs_context');
});

test('battery estimates exclude compliance claims and never hide unknown usable capacity',()=>{
 const ideal=calculateDiagnostic('battery-runtime',{capacity:'7Ah',current:'350mA'});
 assert.equal(ideal.values.idealHours,20);assert.equal(ideal.values.usablePercent,null);assert.match(ideal.summary,/unadjusted/);
 assert.equal(calculateDiagnostic('battery-runtime',{capacity:'7Ah',current:'350mA',usablePercent:'80%'}).values.estimatedHours,16);
 for(const input of [{capacity:'7Ah',current:'0A'},{capacity:'7Ah',current:'1A',usablePercent:'101%'},{capacity:'-7Ah',current:'1A'}])assert.equal(calculateDiagnostic('battery-runtime',input).status,'invalid');
 assert.match(ideal.warnings[0],/does not measure battery capacity/);
});

test('physical boundary wrapper keeps existing topology safeguards and calculator fields frozen',()=>{
 const result=calculateEvidenceBoundary({events:[]},{topology:'radial',verified:false,points:['L1 D1','L1 D2']});
 assert.equal(result.localised,false);assert.match(result.reason,/Imported addresses/);
 assert.equal(CALCULATOR_DEFINITIONS.length,5);assert.ok(Object.isFrozen(CALCULATOR_DEFINITIONS[0].fields));
 assert.equal(calculateDiagnostic('not-a-calculator',{}).status,'invalid');
});

test('saving a calculation retains raw units and derived status without answering or confirming a test',()=>{
 let session=attachDiagnosticManual(ensureDiagnosticChat({id:'synthetic-calculation-log'}),{manualId:'synthetic-calc-manual',contentHash:'synthetic-calculation-hash',processorVersion:'TEST ONLY',title:'SYNTHETIC test manual',usable:true,identity:{systemTypes:['fire'],model:'Synthetic panel',equipmentType:'panel'},pages:[{page:1,text:'SYNTHETIC TEST ONLY fire panel loop return observations and event history.'}]});
 session=confirmDiagnosticIdentity(session,{step:'system',systemTypes:['fire']});session=confirmDiagnosticIdentity(session,{model:'Synthetic panel',equipmentType:'panel'});
 session=submitDiagnosticText(session,'Loop open');session=submitDiagnosticText(session,'present');
 const original=structuredClone(session),question=getDiagnosticPrompt(session).key,input={voltage:'12 V',current:'200 mA'},calculation=calculateDiagnostic('ohms-power',input);
 const saved=recordDiagnosticCalculation(session,calculation,input,{id:'calculation-1',now:1234}),event=saved.fieldVisit.events.find(e=>e.id==='calculation-1');
 assert.deepEqual(session,original,'Caller session is not mutated');
 assert.deepEqual(event.calculation.rawInputs,input);assert.equal(event.calculation.values.powerW,2.4);assert.equal(event.result.source,'derived');assert.equal(event.result.executionState,'calculated');
 assert.equal(event.interpretation.status,'calculated_only');assert.equal(getDiagnosticPrompt(saved).key,question);assert.equal(saved.diagnosticChat.phase,session.diagnosticChat.phase);
 assert.ok(saved.diagnosticChat.messages.some(m=>m.eventIds?.includes(event.id)&&/No test/.test(m.text)));
 const repeat=recordDiagnosticCalculation(saved,calculation,input,{id:'calculation-1',now:5678});assert.equal(repeat.fieldVisit.events.length,saved.fieldVisit.events.length);
 const outcome=finishDiagnosticChat(saved,{outcome:'found',cause:'SYNTHETIC cause',confirmation:'Only calculator arithmetic',engineerConfirmed:true,evidenceEventIds:[event.id]});assert.equal(outcome.diagnosticChat.outcome.causeConfirmed,false);
 assert.throws(()=>recordDiagnosticCalculation(session,calculateDiagnostic('ohms-power',{voltage:'12 V'}),{voltage:'12 V'}),/Complete/);
 const tampered={...calculation,values:{powerW:999},summary:'Invented result'};assert.equal(recordDiagnosticCalculation(session,tampered,input).fieldVisit.events.at(-1).calculation.values.powerW,2.4);
});
