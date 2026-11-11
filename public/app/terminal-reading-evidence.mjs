import {parseDiagnosticQuantity} from './diagnostic-calculators.mjs';

// Reviewed comparisons of recorded evidence, not permission to perform a test.
// PDF/OCR text, filenames and model guesses cannot add executable limits here.
export const TERMINAL_READING_RULE_VERSION='2026-11-10.1';
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const text=value=>String(value??'').trim();
const list=value=>Array.isArray(value)?value:[];
const normal=value=>text(value).toLowerCase().replace(/[_\s]+/g,' ');
const clone=value=>structuredClone(value);
export const TERMINAL_READING_SOURCES=freeze([{
 id:'elmdene-2405st-04a-output',manufacturer:'Elmdene',documentId:'PAK200789_04A',revision:'APR 2026',
 title:'2405ST-x 24.0 V dc 5 Amp Switch Mode Power Supply',pageCount:25,
 url:'https://www.elmdene.co.uk/product/manual/PAK200789_04A_2405ST.pdf',
 sha256:'039cf3f194763593dc2c6eb2e0ac97429025db44d5757260036a9c4be8bbb4ef',
 reviewedAt:'2026-11-10',models:['2405ST','2405ST-C','2405ST-K','2405ST-E','2405ST-H'],
 pages:[
  {page:1,section:'Load output diagram',excerpt:'LOAD1 − / +; LOAD2 − / +. “x” denotes enclosure size.'},
  {page:2,section:'Specification — PSU Output',excerpt:'Voltage on Mains power (at full load): 21.6 V dc (Umin) – 28.8 V dc (Umax). Un = 24.0 V dc +/-3% at 25°C. Voltage on Battery standby (at full load): 21.6 V dc – 26.0 V dc. Umax elevated by approximately +1% of Un when connecting the battery. Umax = 28.8 V at all other times.'},
 ],
 ranges:{mains:{min:21.6,max:28.8,unit:'V',condition:'mains power, at full load, outside battery-connection transient'},battery_standby:{min:21.6,max:26.0,unit:'V',condition:'battery standby, at full load'}},
 // This comparison uses the published operating envelope, not the tighter
 // nominal 24 V ±3% at 25°C. Neither proves PSU health or locates a fault.
 actionEnabled:false,causeConfirmationEnabled:false,
}]);

const choice=(key,question,options)=>({key,question,type:'choice',options:[...options.map(([value,label])=>({value,label})),{value:'unknown',label:'I don’t know'}]});
export const TERMINAL_READING_CONTEXT_QUESTIONS=freeze({
 outputPair:choice('outputPair','Where was this reading taken — across which actual + and − output pair?',[
  ['LOAD1','Across LOAD1 + and LOAD1 −'],['LOAD2','Across LOAD2 + and LOAD2 −'],['other','Another point or reference'],
 ]),
 electricalMode:choice('electricalMode','Was that reading measured on the DC or AC voltage range?',[
  ['DC','DC volts'],['AC','AC volts'],
 ]),
 powerMode:choice('powerMode','Was the PSU operating from mains or battery standby when you took it?',[
  ['mains','Mains power'],['battery_standby','Battery standby'],['other','Another or changing condition'],
 ]),
 loadCondition:choice('loadCondition','Was it at the full load specified for its configured charger setting? “Connected” alone doesn’t establish full load.',[
  ['full_load','Full load, confirmed against the configured rating'],['partial_load','Connected, but full load not established'],['no_load','No load'],
 ]),
 batteryConnectionTransient:choice('batteryConnectionTransient','Was this taken during the brief transient when connecting the battery?',[
  ['no','No — outside that transient'],['yes','Yes — while connecting the battery'],
 ]),
});

export function getTerminalReadingContextQuestion(key){return TERMINAL_READING_CONTEXT_QUESTIONS[key]?clone(TERMINAL_READING_CONTEXT_QUESTIONS[key]):null;}

function result(status,summary,extra={}){
 return {status,ruleVersion:TERMINAL_READING_RULE_VERSION,summary,missing:[],nextQuestion:'',sourceRefs:[],causeConfirmed:false,actionEnabled:false,...extra};
}
function sourceRefs(source,manual){
 return source.pages.map(page=>({manualId:manual.manualId||manual.id,contentHash:source.sha256,revision:`${source.documentId} ${source.revision}`,title:source.title,url:source.url,...page}));
}
function inferContext(reading){
 const inferred={},reference=text(reading.reference),points=list(reading.points).map(point=>text(point.label||point.location||point.terminal)).join(' ');
 // A label such as “PSU output” does not establish probe polarity or which output.
 const pair=`${points} ${reference}`.toUpperCase().replace(/[−–]/g,'-');
 for(const output of ['LOAD1','LOAD2']){
  const other=output==='LOAD1'?'LOAD2':'LOAD1';
  if(!pair.includes(other)&&new RegExp(`\\b${output}\\s*\\+\\s*(?:TO|AND|/)\\s*(?:${output}\\s*)?-`).test(pair))inferred.outputPair=output;
 }
 const mode=text(reading.electricalMode).toUpperCase(),unit=text(reading.result?.unit||reading.unit).toUpperCase().replace(/_/g,' ');
 if(['DC','AC'].includes(mode))inferred.electricalMode=mode;
 else if(/^(?:M?V)\s*DC$/.test(unit))inferred.electricalMode='DC';
 else if(/^(?:M?V)\s*AC$/.test(unit))inferred.electricalMode='AC';
 const state=normal(reading.operatingState),load=normal(reading.loadState);
 if(/^(?:on )?mains(?: power| operation)?$/.test(state))inferred.powerMode='mains';
 if(/^(?:on )?battery standby$/.test(state))inferred.powerMode='battery_standby';
 if(load==='full load')inferred.loadCondition='full_load';
 if(load==='no load')inferred.loadCondition='no_load';
 // Transient state has to be recorded explicitly; absence of a note is not “no”.
 return inferred;
}

/**
 * Pure assessment of one current event against a byte-pinned, reviewed manual.
 * `context` is specific to this event and records explicit engineer replies.
 * Missing scope returns one-at-a-time questions; it never edits the event or
 * answers a diagnostic check. Corrections must assess the replacement event.
 */
export function compareTerminalReading({reading={},manuals=[],equipment={},context={}}={}){
 const value=reading.result||reading,unit=text(value.unit||reading.unit),raw=text(value.rawText??reading.rawText??value.value);
 if(!['voltage','dc_voltage','measurement'].includes(reading.testKind)&&!/^m?V(?:[_ ]?(?:DC|AC))?$/i.test(unit))return result('not_applicable','No reviewed comparison applies to this kind of observation.');
 if(value.kind&&value.kind!=='numeric'||/^(?:ol|unknown|not[ _]tested|inaccessible|blocked|unstable|fluctuating)$/i.test(raw))return result('unverified',`“${raw||'No reading'}” stays an observation. It is not a numeric voltage result.`);
 // Use raw entry, never a cached normalised value, so zero and corrections survive.
 const quantity=parseDiagnosticQuantity(raw,'voltage',{defaultUnit:unit});
 if(!unit||!quantity.ok)return result('unverified','The raw reading is saved. Establish one numeric voltage and its unit before comparing it.');
 if(value.executionState!=='performed'||!['meter','instrument'].includes(value.source||reading.source)||reading.historical===true)return result('unverified','This is not a current, performed meter reading. Its source and conditions stay unverified; no model verdict is inferred.');
 if(reading.interpretation?.status==='method_unverified')return result('unverified','The reading is saved, but its measurement method or prerequisites are still unverified. No manufacturer-range interpretation is applied.',{nextQuestion:'Which recorded method or test condition is still missing? Review the reading’s prerequisite record.'});
 const source=TERMINAL_READING_SOURCES[0],manual=list(manuals).find(item=>item.usable===true&&(item.contentHash||item.hash)===source.sha256);
 if(!manual)return result('unverified','I don’t have a reviewed limit for this exact manual, model, point and condition. The reading is recorded without an equipment verdict.',{nextQuestion:'Which manual page states the applicable specification? Keep it unverified if that information is unavailable.'});
 const refs=sourceRefs(source,manual);
 // Readability of other pages does not make the specification page readable.
 if(![1,2].every(number=>list(manual.pages).some(page=>(page.page||page.number)===number&&page.quality?.readable!==false&&(page.quality?.readable===true||text(page.text)))))return result('unverified','The reviewed terminal diagram or specification page is not readable in this attached manual. Add a readable copy before applying its limit.',{sourceRefs:refs});
 const model=text(equipment.model).toUpperCase(),manufacturer=normal(equipment.manufacturer),confirmed=equipment.confirmedEquipment===true||equipment.modelConfirmed===true;
 if(!confirmed||!source.models.includes(model)||!/^elmdene(?: international(?: ltd)?)?$/.test(manufacturer))return result('unverified','Confirm the installed Elmdene 2405ST model and this manual’s applicability first. A PSU label, manufacturer or family guess is not enough to apply its range.',{sourceRefs:refs});
 const inferred=inferContext(reading),scope={...inferred,...context};
 const keys=['outputPair','electricalMode','powerMode','loadCondition'];
 if(scope.powerMode==='mains')keys.push('batteryConnectionTransient');
 const unknown=keys.find(key=>Object.hasOwn(scope,key)&&['unknown','unavailable','not_tested',''].includes(text(scope[key])));
 if(unknown)return result('unverified','That condition remains unknown, so this manual’s voltage range cannot yet be applied. The reading and missing context stay in the log.',{sourceRefs:refs,unverifiedFields:[unknown]});
 const invalid=keys.find(key=>Object.hasOwn(scope,key)&&!TERMINAL_READING_CONTEXT_QUESTIONS[key].options.some(option=>option.value===scope[key]));
 if(invalid)return result('unverified','The recorded condition is not established in this comparison’s supported scope. Keep it unverified rather than assuming a value.',{sourceRefs:refs,unverifiedFields:[invalid]});
 const conflicts=[];
 for(const key of Object.keys(inferred))if(Object.hasOwn(context,key)&&text(context[key])!==text(inferred[key]))conflicts.push(key);
 if(conflicts.length)return result('unverified','The comparison context conflicts with the original reading. Correct the reading with BACK, retaining the original; don’t silently replace its conditions.',{sourceRefs:refs,conflicts});
 if(scope.outputPair&&!['LOAD1','LOAD2'].includes(scope.outputPair))return result('unverified','This reviewed range is for the PSU load output pair. It does not apply to another point, an earth reference, or the battery terminals.',{sourceRefs:refs});
 if(scope.electricalMode&&scope.electricalMode!=='DC')return result('unverified','This specification is for DC output voltage. An AC-range observation cannot be compared with that DC limit.',{sourceRefs:refs});
 if(scope.powerMode&&!['mains','battery_standby'].includes(scope.powerMode))return result('unverified','This changing or unestablished power condition is outside the reviewed comparison scope.',{sourceRefs:refs});
 if(scope.loadCondition&&scope.loadCondition!=='full_load')return result('unverified','The published range is specified at full load. A connected, partial or absent load does not establish that condition; no pass or fail is assigned.',{sourceRefs:refs});
 if(scope.powerMode==='mains'&&scope.batteryConnectionTransient&&scope.batteryConnectionTransient!=='no')return result('unverified','The manual allows a different brief maximum while connecting the battery. This steady-condition comparison does not apply.',{sourceRefs:refs});
 const missing=keys.filter(key=>!Object.hasOwn(scope,key)).map(getTerminalReadingContextQuestion);
 if(missing.length)return result('needs_context','The reading is saved. I need its actual measurement conditions before using the manual’s range.',{sourceRefs:refs,missing,nextQuestion:missing[0].question});
 const range=source.ranges[scope.powerMode],inside=quantity.value>=range.min&&quantity.value<=range.max;
 const summary=`${quantity.value} V DC is ${inside?'within':'outside'} the documented ${range.min}–${range.max} V DC output range for ${range.condition} (${source.documentId}, p. 2). ${inside?'This does not establish that the PSU or downstream circuit is healthy, or confirm the cause.':'This supports investigating the supply/output conditions; it does not identify a failed component or confirm the cause.'}`;
 return result('compared',summary,{
  sourceRefs:refs,
  comparison:{value:quantity.value,unit:'V',min:range.min,max:range.max,inside,scope:clone(scope),condition:range.condition,model,manualHash:source.sha256,rawEntry:reading.rawEntry||raw},
  nextQuestion:inside?'What fault indication is present now, and what has actually been observed at the affected load?':'Do the recorded output pair, supply mode and load state still match that reading? Record what the PSU fault indicators show before drawing a conclusion.',
 });
}
