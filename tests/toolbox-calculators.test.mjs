import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateToolbox,TOOLBOX_DEFINITIONS,RESISTOR_COLOURS,resistorBandOptions,COPPER_RESISTIVITY_20} from '../public/app/toolbox-calculators.mjs';

const battery={standbyCurrent:'100 mA',alarmCurrent:'1 A',standbyHours:24,alarmMinutes:30,capacityFactor:1.25,alarmCurrentMode:'total'};
const cable={supplyVoltage:24,current:1,lengthM:100,csaMm2:1.5,temperatureC:20,resistanceMode:'estimate'};
const conductor={lengthM:100,lineCsaMm2:2.5,cpcCsaMm2:1.5,temperatureC:20,resistanceMode:'estimate'};
const calculate=(kind,input)=>{const result=calculateToolbox(kind,input);assert.equal(result.status,'calculated',JSON.stringify(result.errors));return result;};
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);

test('battery sizes sequential standby and total alarm without adding standby twice',()=>{
 const r=calculate('battery-capacity',battery);
 near(r.values.standbyAh,2.4);near(r.values.alarmAh,0.5);near(r.values.requiredAh,3.625);
 assert.equal(r.values.totalAlarmCurrentA,1);assert.match(r.assumptions.join(' '),/not added again/);
 assert.match(r.warnings.join(' '),/not a capacity test/);assert.match(r.warnings.join(' '),/Series batteries/);
});
test('72h and custom periods use entered loads rather than a regulatory default',()=>{
 near(calculate('battery-capacity',{...battery,standbyHours:72}).values.requiredAh,9.625);
 near(calculate('battery-capacity',{...battery,standbyHours:15.5,alarmMinutes:45}).values.requiredAh,2.875);
 assert.match(calculate('battery-capacity',battery).assumptions.join(' '),/required design period is assumed/);
});
test('additional alarm current is explicitly added; factor1 means no allowance',()=>{
 const r=calculate('battery-capacity',{...battery,alarmCurrentMode:'additional',capacityFactor:1});
 near(r.values.totalAlarmCurrentA,1.1);near(r.values.requiredAh,2.95);
 assert.match(r.warnings.join(' '),/factor 1 adds no allowance/);
});
test('battery selected and charger capacity limits are user supplied and distinct',()=>{
 const r=calculate('battery-capacity',{...battery,selectedCapacity:'3 Ah',maxCapacity:'3.5 Ah'});
 near(r.values.selectedHeadroomAh,-0.625);near(r.values.maximumHeadroomAh,-0.125);
 assert.match(r.warnings.join(' '),/selected capacity is below/);assert.match(r.warnings.join(' '),/requirement exceeds/);
 const tooBig=calculate('battery-capacity',{...battery,selectedCapacity:7,maxCapacity:3.5});
 assert.match(tooBig.warnings.join(' '),/selected capacity exceeds/);
});
test('battery supports zero measured loads but not blank, negative, invalid mode or factor below1',()=>{
 assert.equal(calculate('battery-capacity',{...battery,standbyCurrent:0,alarmCurrent:0}).values.requiredAh,0);
 for(const patch of [{standbyCurrent:-0.1},{alarmCurrent:'OL'},{capacityFactor:0.8},{alarmCurrentMode:'assume'},{standbyHours:0,alarmMinutes:0},{selectedCapacity:0}])assert.equal(calculateToolbox('battery-capacity',{...battery,...patch}).status,'invalid');
 const missing=calculateToolbox('battery-capacity',{...battery,standbyCurrent:''});assert.equal(missing.status,'needs_context');assert.deepEqual(missing.values,{});
});
test('generic battery arithmetic can reproduce explicitly pre-adjusted XFP example without guessing its multipliers',()=>{
 // DFU2200510 Rev2 p35: engineer applies that model's loop multiplier to loads first.
 const r=calculate('battery-capacity',{...battery,standbyCurrent:0.065+150*0.0003*1.5,alarmCurrent:0.29+40*0.008*1.5});
 near(r.values.standbyAh,3.18);near(r.values.alarmAh,0.385);near(r.values.requiredAh,4.45625);
 assert.equal(r.sourceRefs[0].pdfPage,35);assert.match(r.sourceRefs[0].note,/does not apply/);
});
test('DC cable voltage drop includes outgoing and return once',()=>{
 const r=calculate('cable-voltage-drop',cable);
 near(r.values.conductorResistanceOhm,100*COPPER_RESISTIVITY_20/1.5);
 near(r.values.loopResistanceOhm,2*100*COPPER_RESISTIVITY_20/1.5);
 near(r.values.dropV,2.29866666666667);near(r.values.loadVoltageV,21.7013333333333);
 near(r.values.dropPercent,9.57777777777778);assert.match(r.assumptions.join(' '),/one way/);
});
test('manufacturer cable resistance is per single conductor at20°C and ignores unused CSA',()=>{
 const r=calculate('cable-voltage-drop',{...cable,current:'500 mA',resistanceMode:'manufacturer',resistanceOhmPerKm:12.1,csaMm2:''});
 near(r.values.loopResistanceOhm,2.42);near(r.values.dropV,1.21);near(r.values.loadVoltageV,22.79);
 assert.match(r.assumptions.join(' '),/not an already doubled loop/);
});
test('temperature correction follows manufacturer tester formula and stays distinct from insulation rating',()=>{
 const r=calculate('cable-voltage-drop',{...cable,resistanceMode:'manufacturer',resistanceOhmPerKm:10.15,temperatureC:30});
 near(r.values.conductorResistanceOhm,1.0548895);near(r.values.temperatureFactor,1.0393);
 assert.match(r.assumptions.join(' '),/does not imply a safe cable/);
 assert.equal(calculateToolbox('cable-voltage-drop',{...cable,temperatureC:1000}).status,'invalid');
});
test('zero current or zero length have zero drop; missing supply is not assumed',()=>{
 for(const patch of [{current:0},{lengthM:0}]){const r=calculate('cable-voltage-drop',{...cable,...patch});assert.equal(r.values.dropV,0);assert.equal(r.values.loadVoltageV,24);}
 assert.equal(calculateToolbox('cable-voltage-drop',{...cable,supplyVoltage:''}).status,'needs_context');
 for(const patch of [{supplyVoltage:0},{current:-1},{lengthM:-1},{csaMm2:0},{resistanceMode:'aluminium'}])assert.equal(calculateToolbox('cable-voltage-drop',{...cable,...patch}).status,'invalid');
});
test('drop above supply is retained as arithmetic and clearly invalidates constant current assumption',()=>{
 const r=calculate('cable-voltage-drop',{...cable,supplyVoltage:12,current:100});
 assert.ok(r.values.loadVoltageV<0);assert.match(r.warnings.join(' '),/cannot be assumed/);assert.match(r.warnings.join(' '),/not a predicted physical reverse voltage/);
});
test('conductor resistance treats line and CPC areas separately without doubling the sum',()=>{
 const r=calculate('conductor-resistance',conductor);
 near(r.values.r1Ohm,0.6896);near(r.values.r2Ohm,1.14933333333333);near(r.values.r1PlusR2Ohm,1.83893333333333);
 assert.match(r.warnings.join(' '),/not a measured continuity result/);assert.match(r.warnings.join(' '),/Zs/);
});
test('conductor manufacturer values and temperature are applied to each conductor',()=>{
 const r=calculate('conductor-resistance',{...conductor,resistanceMode:'manufacturer',lineOhmPerKm:7.41,cpcOhmPerKm:12.1,temperatureC:30,lineCsaMm2:'',cpcCsaMm2:''});
 near(r.values.r1Ohm,0.741*1.0393);near(r.values.r2Ohm,1.21*1.0393);near(r.values.r1PlusR2Ohm,1.951*1.0393);
 const missing=calculateToolbox('conductor-resistance',{...conductor,cpcCsaMm2:''});assert.equal(missing.status,'needs_context');assert.ok(missing.errors.cpcCsaMm2);
});
test('four-band TE worked example gives1500Ω±5%',()=>{
 const r=calculate('resistor-colours',{bands:4,colours:['brown','green','red','gold']});
 assert.equal(r.values.resistanceOhm,1500);assert.equal(r.values.tolerancePercent,5);assert.equal(r.values.minimumOhm,1425);assert.equal(r.values.maximumOhm,1575);assert.equal(r.values.tempcoPpm,null);
});
test('five-band TE example gives270kΩ±10% and sixthband yields realTCR',()=>{
 const r=calculate('resistor-colours',{bands:5,colours:['red','violet','black','orange','silver']});assert.equal(r.values.resistanceOhm,270000);assert.equal(r.values.tolerancePercent,10);
 const six=calculate('resistor-colours',{bands:6,colours:['blue','grey','black','green','gold','black']});assert.equal(six.values.resistanceOhm,68000000);assert.equal(six.values.tempcoPpm,250);
});
test('gold and silver multipliers, grey alias and precision tolerance retain small values',()=>{
 const r=calculate('resistor-colours',{bands:4,colours:['brown','black','silver','grey']});near(r.values.resistanceOhm,0.1);near(r.values.minimumOhm,0.09995);assert.equal(r.values.tolerancePercent,0.05);
 const gold=calculate('resistor-colours',{bands:4,colours:['brown','black','gold','gold']});assert.equal(gold.values.resistanceOhm,1);
 const grey=calculate('resistor-colours',{bands:6,colours:['Brown','black','black','black','brown','gray']});assert.equal(grey.values.tempcoPpm,1);assert.equal(grey.values.colours[5],'grey');
});
test('resistor band roles reject impossible/unsupported markings',()=>{
 for(const input of [{bands:3,colours:['red','red','red']},{bands:4,colours:['black','red','red','gold']},{bands:4,colours:['gold','red','red','gold']},{bands:4,colours:['red','red','red','black']},{bands:6,colours:['red','red','red','black','brown','gold']},{bands:4,colours:['red','red','red']}])assert.equal(calculateToolbox('resistor-colours',input).status,'invalid');
 assert.ok(!resistorBandOptions(4,0).some(c=>c.value==='black'));
 assert.ok(resistorBandOptions(6,5).some(c=>c.value==='black'&&c.tempcoPpm===250));
 assert.ok(!resistorBandOptions(6,5).some(c=>c.value==='white'));
 assert.deepEqual(resistorBandOptions(4,5),[]);
});
test('parsers reject blank-tozero, malformed values and overflow without NaN output',()=>{
 for(const value of [true,{},NaN,Infinity,'Infinity','1,000','12 m','12;13'])assert.equal(calculateToolbox('cable-voltage-drop',{...cable,lengthM:value}).status,'invalid');
 for(const value of ['1e309',true,'1 A and2 A','OL'])assert.equal(calculateToolbox('cable-voltage-drop',{...cable,current:value}).status,'invalid');
 const overflow=calculateToolbox('battery-capacity',{...battery,standbyCurrent:'1e308',standbyHours:1e308});assert.equal(overflow.status,'invalid');assert.deepEqual(overflow.values,{});assert.match(overflow.errors.range,/finite range/);assert.doesNotMatch(overflow.summary,/Infinity|NaN/);
});
test('raw inputs are preserved independently; exported definitions and colour records are immutable',()=>{
 const input={bands:4,colours:['brown','green','red','gold']},result=calculate('resistor-colours',input);input.colours[0]='red';assert.equal(result.rawInputs.colours[0],'brown');
 assert.ok(Object.isFrozen(TOOLBOX_DEFINITIONS));assert.ok(Object.isFrozen(RESISTOR_COLOURS[0]));assert.ok(TOOLBOX_DEFINITIONS.every(d=>d.id));
 assert.equal(calculateToolbox('unknown',{}).status,'invalid');assert.equal(calculateToolbox('battery-capacity',null).status,'invalid');
});
