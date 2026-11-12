import {createToolboxPackController} from './toolbox-pack.mjs';
import {calculateToolbox,resistorBandOptions} from './toolbox-calculators.mjs';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list=value=>Array.isArray(value)?value:[];
const STORAGE_KEY='findr:toolbox:v1';
const toolRows=[
 ['battery','battery-capacity','Fire alarm battery calculator','Standby and alarm capacity for 24 hours, 72 hours or your own duration.','battery'],
 ['voltage-drop','cable-voltage-drop','Voltage drop calculator','Estimate DC cable loss, percentage drop and voltage at the load.','bolt'],
 ['resistor','resistor-colours','Resistor colour code','Read 4, 5 or 6 bands, including tolerance and temperature coefficient.','resistor'],
 ['resistance','conductor-resistance','Conductor resistance & R1 + R2','Estimate line and protective-conductor resistance for a cable run.','ohm'],
];
const defaults={
 battery:{standbyCurrent:'',standbyCurrentUnit:'mA',alarmCurrent:'',alarmCurrentUnit:'mA',standbyHours:'24',alarmMinutes:'30',capacityFactor:'1',alarmCurrentMode:'total',selectedCapacity:'',maxCapacity:''},
 'voltage-drop':{supplyVoltage:'24',current:'',currentUnit:'A',lengthM:'',csaMm2:'1.5',temperatureC:'20',resistanceMode:'estimate',resistanceOhmPerKm:''},
 resistor:{bands:'4',colours:['brown','black','red','gold']},
 resistance:{lengthM:'',lineCsaMm2:'1.5',cpcCsaMm2:'1.5',temperatureC:'20',resistanceMode:'estimate',lineOhmPerKm:'',cpcOhmPerKm:''},
};
const palette={black:'#111111',brown:'#88502a',red:'#dc3939',orange:'#f28a24',yellow:'#f9dc46',green:'#3b9161',blue:'#397cca',violet:'#9763bd',grey:'#8d9299',white:'#f4f1e9',gold:'#c2a34b',silver:'#bec3ca',none:'transparent'};
const metricInfo={requiredAh:['Required capacity','Ah'],standbyAh:['Standby demand','Ah'],alarmAh:['Alarm demand','Ah'],baseAh:['Before capacity factor','Ah'],capacityFactor:['Capacity factor','×'],selectedAh:['Proposed capacity','Ah'],maxAh:['Documented maximum','Ah'],dropV:['Voltage drop','V'],dropPercent:['Percentage drop','%'],loadVoltageV:['Voltage at load','V DC'],loopResistanceOhm:['Outgoing + return resistance','Ω'],resistanceOhm:['Nominal resistance','Ω'],tolerancePercent:['Tolerance','%'],minimumOhm:['Minimum resistance','Ω'],maximumOhm:['Maximum resistance','Ω'],tempcoPpm:['Temperature coefficient','ppm/°C'],r1Ohm:['R1 · line conductor','Ω'],r2Ohm:['R2 · protective conductor','Ω'],r1PlusR2Ohm:['R1 + R2','Ω'],temperatureC:['Conductor temperature','°C']};
const visibleMetrics={battery:['requiredAh','standbyAh','alarmAh','baseAh','capacityFactor','selectedAh','maxAh'],'voltage-drop':['dropV','dropPercent','loadVoltageV','loopResistanceOhm'],resistor:['resistanceOhm','tolerancePercent','minimumOhm','maximumOhm','tempcoPpm'],resistance:['r1Ohm','r2Ohm','r1PlusR2Ohm','temperatureC']};
const readable=value=>String(value??'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' ').replace(/^./,c=>c.toUpperCase());
const safeURL=value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:'';}catch{return '';}};
function icon(type){
 const paths={battery:'<rect x="5" y="4" width="14" height="18" rx="3"/><path d="M9 4V2h6v2M9 10h6m-3-3v6M9 17h6"/>',bolt:'<path d="m14 2-9 12h6l-1 8 9-12h-6z"/>',resistor:'<path d="M1 12h4l2-5 3 10 4-10 3 10 2-5h4"/>',ohm:'<path d="M3 20h6v-3a7 7 0 1 1 6 0v3h6"/>'};
 return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[type]||paths.ohm}</svg>`;
}
const button=(action,label,extra='',style='secondary')=>`<button type="button" class="${style}" data-toolbox-action="${action}" ${extra}>${label}</button>`;

/** Calculator drafts are a separate convenience store, never diagnostic tests
 * or confirmed findings. No model, network request or job mutation is used. */
export function createToolboxController({app,toast=()=>{}}){
 let selected='',drafts=structuredClone(defaults),result=null,storageWarning='',loaded=false;
 const pack=createToolboxPackController({app,toast});
 const find=selector=>app.querySelector(selector);
 function load(){
  if(loaded)return;loaded=true;
  try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(saved?.schemaVersion!==1)return;for(const slug of Object.keys(defaults)){const row=saved.drafts?.[slug];if(!row||typeof row!=='object')continue;for(const name of Object.keys(defaults[slug])){const value=row[name];if(name==='colours'&&Array.isArray(value)&&value.length<=6&&value.every(v=>typeof v==='string'&&Object.hasOwn(palette,v)))drafts[slug][name]=value;else if(typeof value==='string'&&value.length<=80)drafts[slug][name]=value;}}}
  catch{storageWarning='Calculations still work, but saved calculator inputs could not be read.';}
  if(!['4','5','6'].includes(drafts.resistor.bands))drafts.resistor=structuredClone(defaults.resistor);
  const bands=Number(drafts.resistor.bands),seed=({4:['brown','black','red','gold'],5:['brown','black','black','brown','brown'],6:['brown','black','black','brown','brown','brown']})[bands];
  drafts.resistor.colours=Array.from({length:bands},(_,index)=>resistorBandOptions(bands,index).some(option=>option.value===drafts.resistor.colours[index])?drafts.resistor.colours[index]:seed[index]);
  for(const slug of ['voltage-drop','resistance'])if(!['estimate','manufacturer'].includes(drafts[slug].resistanceMode))drafts[slug].resistanceMode='estimate';
  if(!['total','additional'].includes(drafts.battery.alarmCurrentMode))drafts.battery.alarmCurrentMode='total';
  for(const slug of ['battery','voltage-drop'])for(const name of Object.keys(drafts[slug]))if(name.endsWith('Unit')&&!['A','mA'].includes(drafts[slug][name]))drafts[slug][name]=defaults[slug][name];
 }
 function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({schemaVersion:1,drafts}));storageWarning='';}catch{storageWarning='Calculations still work, but these inputs could not be saved on this device.';}const el=find('#toolbox-save-status');if(el)el.textContent=storageWarning||'Inputs kept on this device · separate from fault logs';}
 function field(name,label,{hint='',step='any',min,required=true}={}){
  const value=drafts[selected][name]??'',id='toolbox-'+name;
  return `<label class="toolbox-field" for="${id}"><span>${esc(label)}</span><input id="${id}" name="${esc(name)}" type="number" inputmode="decimal" step="${step}" ${min===undefined?'':`min="${min}"`} value="${esc(value)}" ${required?'required':''} aria-describedby="${id}-hint ${id}-error">${hint?`<small id="${id}-hint">${esc(hint)}</small>`:`<span id="${id}-hint" hidden></span>`}<small class="toolbox-field-error" id="${id}-error"></small></label>`;
 }
 function select(name,label,options,{hint=''}={}){
  const id='toolbox-'+name,value=drafts[selected][name];
  return `<label class="toolbox-field" for="${id}"><span>${esc(label)}</span><select id="${id}" name="${name}">${options.map(([key,label])=>`<option value="${esc(key)}"${String(value)===String(key)?' selected':''}>${esc(label)}</option>`).join('')}</select>${hint?`<small>${esc(hint)}</small>`:''}<small class="toolbox-field-error" id="${id}-error"></small></label>`;
 }
 function current(name,label){
  const d=drafts[selected],id='toolbox-'+name,unit=name+'Unit';
  return `<div class="toolbox-field"><label for="${id}">${esc(label)}</label><div class="toolbox-current"><input id="${id}" name="${name}" type="number" inputmode="decimal" step="any" min="0" required value="${esc(d[name])}" aria-describedby="${id}-error"><select name="${unit}" aria-label="${esc(label)} unit">${['mA','A'].map(u=>`<option${d[unit]===u?' selected':''}>${u}</option>`).join('')}</select></div><small class="toolbox-field-error" id="${id}-error"></small></div>`;
 }
 function batteryForm(){return `<div class="toolbox-preset"><span>Standby time</span>${['24','72'].map(hours=>button('standby',hours+' hours',`data-hours="${hours}" aria-pressed="${drafts.battery.standbyHours===hours}"`)).join('')}</div><div class="toolbox-fields">${current('standbyCurrent','Standby current')}${current('alarmCurrent','Alarm current')}${field('standbyHours','Standby duration (hours)',{min:0,hint:'Change this for a custom period.'})}${field('alarmMinutes','Alarm duration (minutes)',{min:0})}${select('alarmCurrentMode','What does the alarm reading include?',[['total','Total current in alarm'],['additional','Extra current above standby']])}${field('capacityFactor','Capacity factor',{min:1,hint:'1 = no allowance. Set any required design margin explicitly.'})}</div><p class="toolbox-note">Use the system’s documented loads, durations and battery allowances. A 24-hour or 72-hour preset does not establish compliance.</p><details class="toolbox-more"><summary>Battery and charger limits (optional)</summary><div class="toolbox-fields">${field('selectedCapacity','Proposed battery capacity (Ah)',{required:false,min:0})}${field('maxCapacity','Documented maximum capacity (Ah)',{required:false,min:0,hint:'Use the exact panel / charger manual.'})}</div><p class="small">Two equal batteries in series increase voltage, not Ah capacity. This estimate does not verify charge recovery time or battery condition.</p></details>`;}
 function resistanceSource(kind){
  const manual=drafts[selected].resistanceMode==='manufacturer';
  const inputs=kind==='cable'?field('resistanceOhmPerKm','One conductor resistance at 20°C (Ω/km)',{min:0,hint:'Use the cable manufacturer’s documented value.'}):field('lineOhmPerKm','Line resistance at 20°C (Ω/km)',{min:0})+field('cpcOhmPerKm','CPC resistance at 20°C (Ω/km)',{min:0});
  return `${select('resistanceMode','Resistance source',[['estimate','Copper cross-section estimate'],['manufacturer','Documented copper resistance at 20°C']])}<div class="toolbox-fields toolbox-manufacturer" ${manual?'':'hidden'}>${inputs}</div>`;
 }
 function voltageForm(){return `<div class="toolbox-fields">${field('supplyVoltage','Supply voltage (V DC)',{min:0})}${current('current','Load current')}${field('lengthM','One-way cable length (m)',{min:0,hint:'The return conductor is included automatically.'})}<div class="toolbox-estimate" ${drafts[selected].resistanceMode==='estimate'?'':'hidden'}>${field('csaMm2','Each conductor cross-section (mm²)',{min:0})}</div>${field('temperatureC','Conductor temperature (°C)')}${resistanceSource('cable')}</div><p class="toolbox-note">A DC, two-wire copper circuit with equal outgoing and return conductors. Compare the result with the actual device’s operating range; this is not an AC or distributed-load design calculation.</p>`;}
 function conductorForm(){return `<div class="toolbox-fields">${field('lengthM','One-way circuit length (m)',{min:0,hint:'Each conductor uses this length.'})}${field('temperatureC','Conductor temperature (°C)')}<div class="toolbox-estimate" ${drafts[selected].resistanceMode==='estimate'?'':'hidden'}>${field('lineCsaMm2','Line conductor cross-section (mm²)',{min:0})}</div><div class="toolbox-estimate" ${drafts[selected].resistanceMode==='estimate'?'':'hidden'}>${field('cpcCsaMm2','CPC cross-section (mm²)',{min:0})}</div>${resistanceSource('conductor')}</div><p class="toolbox-note">R1 is the line conductor; R2 is the circuit protective conductor (CPC). This is a copper resistance estimate, not a measured continuity result, earth-fault loop impedance (Zs), or a compliance decision.</p>`;}
 function colourOptions(bands,index){return list(resistorBandOptions(bands,index)).map(value=>typeof value==='string'?[value,readable(value)]:[value.id||value.value||value.name,value.label||readable(value.id||value.value||value.name)]);}
 function resistorPreview(){const colours=drafts.resistor.colours.slice(0,Number(drafts.resistor.bands));return `<div class="toolbox-resistor-preview" role="img" aria-label="${esc('Resistor bands: '+colours.map(readable).join(', '))}"><span class="toolbox-wire"></span><div class="toolbox-resistor-body">${colours.map((colour,index)=>`<span class="toolbox-band${index===colours.length-(colours.length===6?2:1)?' toolbox-tolerance-band':''}" style="--band-colour:${palette[colour]||'transparent'}"></span>`).join('')}</div><span class="toolbox-wire"></span></div>`;}
 function resistorForm(){
  const bands=Number(drafts.resistor.bands),roles=Array.from({length:bands},(_,i)=>i<(bands===4?2:3)?'Digit '+(i+1):i===(bands===4?2:3)?'Multiplier':i===bands-1&&bands===6?'Temperature coefficient':'Tolerance');
  return `${select('bands','Number of bands',[['4','4 bands'],['5','5 bands'],['6','6 bands']])}<div id="toolbox-resistor-visual">${resistorPreview()}</div><p class="toolbox-note">Set each colour to match the resistor, reading from the digit end. Do not rely on the example colours below.</p><div class="toolbox-colours">${roles.map((role,index)=>`<label class="toolbox-field" for="toolbox-band-${index}"><span>${index+1}. ${esc(role)}</span><select id="toolbox-band-${index}" data-toolbox-band="${index}" aria-describedby="toolbox-colours-error">${colourOptions(bands,index).map(([key,label])=>`<option value="${esc(key)}"${drafts.resistor.colours[index]===key?' selected':''}>${esc(label)}</option>`).join('')}</select></label>`).join('')}</div><small class="toolbox-field-error" id="toolbox-colours-error"></small>`;
 }
 function render(slug=''){
  if(slug==='pack'||slug.startsWith('pack-'))return pack.render(slug==='pack'?'':slug.slice(5));
  load();selected=toolRows.some(row=>row[0]===slug)?slug:'';result=null;
  if(!selected){app.innerHTML=`<section class="toolbox-page"><a class="back" href="#home">← Home</a><div class="eyebrow">FINDR / TOOL BOX</div><h1>Tool box</h1><p class="toolbox-lead">Quick calculations for the job in front of you. Everything here works on this device, offline.</p><a class="toolbox-pack-banner" style="display:block" href="#toolbox/pack"><h2>Download tool box pack</h2><p>Six more calculators and six quick picture guides, saved from GitHub for offline use.</p><span class="primary" style="display:inline-block">Open pack →</span></a><div class="toolbox-grid"><a class="toolbox-card" href="#resistor-lab"><span class="toolbox-icon" aria-hidden="true">Ω</span><div><h2>Resistor lab</h2><p>Find resistor combinations for a target, or build a series/parallel circuit.</p></div><span aria-hidden="true">→</span></a><a class="toolbox-card" href="#fess-mocks"><span class="toolbox-icon" aria-hidden="true">?</span><div><h2>FESS quick mocks</h2><p>Short practice sets, answer sounds and a full explanation for every question.</p></div><span aria-hidden="true">→</span></a>${toolRows.map(([slug,,title,description,type])=>`<a class="toolbox-card" href="#toolbox/${slug}"><span class="toolbox-icon">${icon(type)}</span><div><h2>${title}</h2><p>${description}</p></div><span aria-hidden="true">→</span></a>`).join('')}</div><p class="toolbox-footnote">Use the actual equipment and cable documentation for required limits. Calculator results are separate from your fault-finding logs.</p></section>`;return;}
  const [, ,title,description,type]=toolRows.find(row=>row[0]===selected);
  app.innerHTML=`<section class="toolbox-page"><div class="toolbox-top"><a class="back" href="#toolbox">← Tool box</a><a class="subtle" href="#home">Home</a></div><div class="eyebrow">FINDR / TOOL BOX</div><div class="toolbox-heading"><span class="toolbox-icon">${icon(type)}</span><h1>${title}</h1></div><p class="toolbox-lead">${description}</p><form id="toolbox-form" class="toolbox-form" novalidate>${({battery:batteryForm,'voltage-drop':voltageForm,resistor:resistorForm,resistance:conductorForm}[selected])()}<div id="toolbox-error-summary" class="toolbox-error-summary" role="alert" hidden></div><div class="toolbox-actions"><button type="submit" class="primary">Calculate</button>${button('reset','Reset')}</div><p id="toolbox-save-status" class="toolbox-footnote">${esc(storageWarning||'Inputs kept on this device · separate from fault logs')}</p></form><section id="toolbox-result" class="toolbox-result" aria-live="polite" tabindex="-1" hidden></section></section>`;
 }
 function collect(){
  const form=find('#toolbox-form');if(!form||!selected)return;
  const d=drafts[selected];for(const element of form.elements){if(element.name&&Object.hasOwn(d,element.name))d[element.name]=String(element.value).slice(0,80);}
  for(const element of form.querySelectorAll('[data-toolbox-band]'))d.colours[Number(element.dataset.toolboxBand)]=element.value;
 }
 function inputs(){const d=structuredClone(drafts[selected]);for(const key of ['standbyCurrent','alarmCurrent','current'])if(Object.hasOwn(d,key))d[key]=d[key].trim()?d[key]+' '+d[key+'Unit']:'';if(selected==='resistor'){d.bands=Number(d.bands);d.colours=d.colours.slice(0,d.bands);}return d;}
 function clearResult(){result=null;const output=find('#toolbox-result');if(output){output.hidden=true;output.innerHTML='';}const summary=find('#toolbox-error-summary');if(summary){summary.hidden=true;summary.textContent='';}for(const el of app.querySelectorAll('.toolbox-field-error'))el.textContent='';for(const el of app.querySelectorAll('[aria-invalid]'))el.removeAttribute('aria-invalid');}
 function resultMarkup(value){
  const values=list(visibleMetrics[selected]).filter(name=>Number.isFinite(value.values?.[name])).map(name=>{const v=value.values[name],[label,unit]=metricInfo[name],formatted=new Intl.NumberFormat('en-GB',{maximumSignificantDigits:6}).format(v);return `<div><dt>${esc(label)}</dt><dd>${name==='tolerancePercent'?'± ':''}${esc(formatted)} <span>${esc(unit)}</span></dd></div>`;}).join('');
  const sources=list(value.sourceRefs).map(ref=>{const url=safeURL(ref.url||ref.sourceUrl);return `<li>${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(ref.title||'Reference')} ↗</a>`:esc(ref.title||'Reference')}${[ref.section,ref.revision,Number.isInteger(ref.pdfPage)?'PDF page '+ref.pdfPage:''].filter(Boolean).map(part=>'<span> · '+esc(part)+'</span>').join('')}${ref.note?`<p>${esc(ref.note)}</p>`:''}</li>`;}).join('');
  return `<div class="eyebrow">CALCULATED RESULT</div><h2>${esc(value.summary||'Your calculation')}</h2>${values?`<dl class="toolbox-values">${values}</dl>`:''}${list(value.warnings).length?`<div class="toolbox-result-notes">${value.warnings.map(note=>`<p>${esc(note)}</p>`).join('')}</div>`:''}<details class="toolbox-more"><summary>Formula, assumptions & references</summary>${list(value.formulas).map(formula=>`<p class="toolbox-formula">${esc(typeof formula==='string'?formula:formula.text||formula.formula)}</p>`).join('')}${list(value.assumptions).length?`<ul>${value.assumptions.map(note=>`<li>${esc(note)}</li>`).join('')}</ul>`:''}${sources?`<ul class="toolbox-sources">${sources}</ul><small>Reference links require a connection; the calculation itself works offline.</small>`:''}</details>`;
 }
 function calculate(){
  collect();save();clearResult();const row=toolRows.find(row=>row[0]===selected);if(!row)return;
  result=calculateToolbox(row[1],inputs());
  if(result.status!=='calculated'){
   const errors=Object.entries(result.errors||{});for(const [name,message]of errors){const band=/^colour(\d+)$/.exec(name),input=find(band?'#toolbox-band-'+band[1]:'#toolbox-'+name),error=find(band?'#toolbox-colours-error':'#toolbox-'+name+'-error');if(input)input.setAttribute('aria-invalid','true');if(error)error.textContent=message;}
   const summary=find('#toolbox-error-summary');summary.hidden=false;summary.textContent=errors.length?errors.map(([,message])=>message).join(' '):result.summary||'Check the inputs before calculating.';
   const first=app.querySelector('[aria-invalid="true"]');if(first?.closest('details'))first.closest('details').open=true;first?.focus();return;
  }
  const output=find('#toolbox-result');output.hidden=false;output.innerHTML=resultMarkup(result);output.focus({preventScroll:true});output.scrollIntoView({block:'nearest',behavior:'auto'});
 }
 app.addEventListener('submit',event=>{if(event.target.id!=='toolbox-form')return;event.preventDefault();calculate();});
 app.addEventListener('input',event=>{if(!event.target.closest('#toolbox-form'))return;collect();save();clearResult();});
 app.addEventListener('change',event=>{
  if(!event.target.closest('#toolbox-form'))return;collect();
  if(event.target.name==='bands'){const count=Number(drafts.resistor.bands);drafts.resistor.colours=({4:['brown','black','red','gold'],5:['brown','black','black','brown','brown'],6:['brown','black','black','brown','brown','brown']})[count]||defaults.resistor.colours;save();render(selected);return;}
  if(event.target.name==='resistanceMode'){save();render(selected);return;}
  if(event.target.hasAttribute('data-toolbox-band')){const target=find('#toolbox-resistor-visual');if(target)target.innerHTML=resistorPreview();}
  save();clearResult();
 });
 app.addEventListener('click',event=>{
  const target=event.target.closest('[data-toolbox-action]');if(!target||!target.closest('.toolbox-page'))return;
  if(target.dataset.toolboxAction==='standby'){collect();drafts.battery.standbyHours=target.dataset.hours;save();render(selected);}
  if(target.dataset.toolboxAction==='reset'){drafts[selected]=structuredClone(defaults[selected]);save();render(selected);toast(selected==='resistor'?'Example colours restored. Set each band to match your resistor.':'Inputs reset. Enter the values for this circuit.');}
 });
 return {render};
}
