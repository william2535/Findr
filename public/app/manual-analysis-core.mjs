// Manual text is reference data. These rules never evaluate PDF text as code,
// change diagnostic rules, or grant authority to perform a test.
export const MANUAL_ANALYSIS_VERSION = '2026-11-10.3';
export const MANUAL_ANALYSIS_SCHEMA = 1;
const clean = value => String(value ?? '').replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').trim();
const folded = value => clean(value).toLowerCase().replace(/[‐‑–—]/g, '-');
const excerpt = (text, index = 0, size = 240) => clean(text.slice(Math.max(0, index - 60), Math.max(0, index - 60) + size));
const unique = values => [...new Set(values.filter(Boolean))];

export function assessPageText(text, {method = 'text', confidence = null} = {}) {
  const value = clean(text), words = value.match(/[\p{L}][\p{L}\p{N}'’-]{1,}/gu) || [];
  const letters = (value.match(/\p{L}/gu) || []).length;
  const replacement = (value.match(/\uFFFD/g) || []).length;
  const readable = value.length >= 80 && words.length >= 12 && letters / Math.max(1, value.length) >= .35 && replacement / Math.max(1, value.length) < .03 && (method !== 'ocr' || Number(confidence) >= 45);
  return {readable, characters: value.length, words: words.length, method, confidence,
    reason: readable ? null : method === 'ocr' && confidence < 45 ? 'OCR confidence is too low for diagnostic reference.' : 'Too little readable text. This may be a drawing, blank page, damaged scan or unsupported language.'};
}

const SYSTEMS = [
  ['fire', /\b(fire alarm|fire detection|fire control panel|smoke detector|aspirating|sounder circuit|addressable fire|fire panel)\b/ig],
  ['access', /\b(access control|door controller|access controller|door lock|electric lock|magnetic lock|maglock|request.to.exit|door entry)\b/ig],
  ['intruder', /\b(intruder|burglar|premier elite|galaxy dimension|security alarm|alarm expander|double.balanced|PIR detector)\b/ig],
  ['cctv', /\b(CCTV|network camera|IP camera|video recorder|digital video|NVR|DVR|surveillance|PTZ)\b/ig],
];
const MANUFACTURERS = [
  ['C-TEC', /\bC[ -]?TEC\b/i], ['Texecom', /\bTexecom\b/i], ['Honeywell', /\bHoneywell\b/i],
  ['Kentec', /\bKentec\b/i], ['Fike', /\bFike\b/i], ['Apollo', /\bApollo\b/i],
  ['Paxton', /\bPaxton\b/i], ['Elmdene', /\bElmdene\b/i], ['Hikvision', /\bHikvision\b/i],
  ['Dahua', /\bDahua\b/i], ['Axis', /\bAXIS (?:Communications|[A-Z]\d|network|camera)/i],
  ['Hochiki', /\bHochiki\b/i], ['Gent', /\bGent\b/i], ['Morley', /\bMorley(?:-IAS)?\b/i],
  ['VESDA', /\bVESDA\b/i], ['Advanced', /\bAdvanced (?:Electronics|MxPro|M[xX]-)/i],
  ['Pyronix', /\bPyronix\b/i], ['Eaton', /\bEaton\b/i], ['Scantronic', /\bScantronic\b/i],
  ['Bosch', /\bBosch\b/i], ['Hanwha', /\bHanwha\b/i], ['Ajax', /\bAjax\b/i], ['Ziton', /\bZiton\b/i],
];
const MODEL_PATTERNS = [
  /\bPremier Elite(?:\s+(?:\d{2,4}[A-Z]?|[A-Z]{2}\d{0,3}))(?:[ /,-]+(?:\d{2,4}[A-Z]?|[A-Z]{2}\d{0,3}))*\b/g,
  /\bGalaxy (?:Dimension|Flex)(?:[ -]+\d{2,3}(?:[-/]\d{2,3})*)?/gi,
  /\b(?:2405ST|2402ST|1202ST|1205ST|EN54C[-A-Z0-9]{2,})\b/g,
  /\b(?:XFP|CFP)(?:[ -]?(?:[A-Z]{0,3}\d{1,3}[A-Z0-9/-]*|Standard|AlarmSense))?\b/g,
  /\bTwinflex(?:\s+(?:Pro(?:\s*2)?|Plus))?\b/gi,
  /\bVigilon(?:\s+(?:Compact(?:\s+(?:VA|Voice Alarm))?|Nano|Plus|4\s*\/\s*6[\s-]*loops?(?:\s*(?:&|and)\s*Compact)?))?\b/gi,
  /\b(?:Sigma(?:\s+(?:CP|XT|XT\+))?|Syncro(?:\s+(?:AS|Focus))?)\b/g,
  /\b(?:MxPro\s*[45]|Mx\s*-?\s*\d{3,5}V?(?:\/[A-Z]{1,4})?)\b(?!\s*-\s*\d)/gi,
  /\b(?:VEP[- ]?[A-Z0-9-]+|VESDA[- ]?[A-Z0-9-]+)\b/g,
  /\b(?:Net2(?:\s+Plus)?|Net2 classic|Net2 nano|PaxLock(?:\s+Pro)?)\b/gi,
  /\b(?:DS-[A-Z0-9][A-Z0-9()/-]{4,}|IPC-[A-Z0-9][A-Z0-9/-]{3,}|AXIS [A-Z]\d{3,5}[A-Z0-9-]*)\b/g,
];
const EQUIPMENT = [
  ['PSU', /\b(power supply|PSU|battery charger)\b/i], ['panel', /\b(control panel|fire panel|intruder panel|alarm panel|fire alarm control)\b/i],
  ['keypad', /\bkeypad\b/i], ['detector', /\b(detector|PIR|aspirating)\b/i], ['recorder', /\b(recorder|NVR|DVR)\b/i],
  ['camera', /\b(camera|PTZ)\b/i], ['controller', /\b(access controller|door controller|control unit)\b/i],
  ['reader', /\b(card reader|proximity reader|biometric reader)\b/i], ['lock', /\b(magnetic lock|electric lock|maglock|electric strike)\b/i],
  ['interface', /\b(interface|expander|input.output module)\b/i],
];

export function classifyManualPages(pages, record = {}) {
  const readable = pages.filter(p => (p.quality || assessPageText(p.text, p)).readable);
  const candidates = readable.map(p => ({...p, text: clean(p.text)}));
  // Cover/title pages establish identity more strongly than incidental wiring examples.
  const identityPages = candidates.filter((p,index)=>index<3||(p.page<=8&&/\b(?:this (?:manual|document)\s+(?:covers|describes|provides)|declare that|manufactured by|manufacturer:)\b/i.test(p.text))).map(p => ({...p, text: p.text.slice(0, 4000)}));
  const evidence = [], systemScores = [], manufacturers = [];
  for (const [system, pattern] of SYSTEMS) {
    let score = 0, first;
    for (const p of candidates) { const matches = [...p.text.matchAll(new RegExp(pattern))]; if (matches.length) { score += matches.length * (p.page <= 2 ? 2 : 1); first ||= {page:p.page,quote:excerpt(p.text,matches[0].index),field:'systemTypes'}; } }
    if (score) { systemScores.push({system,score}); evidence.push({...first,value:system}); }
  }
  systemScores.sort((a,b)=>b.score-a.score);
  for (const [name, pattern] of MANUFACTURERS) {
    for (const p of identityPages) { const match=pattern.exec(p.text); if(match){manufacturers.push({name,page:p.page,index:match.index}); evidence.push({page:p.page,quote:excerpt(p.text,match.index),field:'manufacturer',value:name});break;} }
  }
  manufacturers.sort((a,b)=>a.page-b.page||a.index-b.index);
  if (!manufacturers.length && record.brand && record.brand !== 'Local import') {
    const p = identityPages.find(p=>folded(p.text).includes(folded(record.brand)));
    if(p){manufacturers.push({name:record.brand,page:p.page,index:0});evidence.push({page:p.page,quote:excerpt(p.text,folded(p.text).indexOf(folded(record.brand))),field:'manufacturer',value:record.brand});}
  }
  // A declared manufacturer is useful for genuinely unseen products, but remains unconfirmed.
  if (!manufacturers.length) for(const p of identityPages){const m=p.text.match(/(?:Manufacturer|Manufactured by)\s*[:–-]\s*([A-Z][\w& .-]{2,55})(?:\n|$)/i);if(m){manufacturers.push({name:clean(m[1]),page:p.page,index:m.index});evidence.push({page:p.page,quote:excerpt(p.text,m.index),field:'manufacturer',value:clean(m[1])});break;}}
  const models=[];
  for(const p of identityPages){
    const declarations = [...p.text.matchAll(/(?:^|\n)\s*(?:Model(?:s| range)?|Product(?: code| model)?)\s*[:–-]\s*([^\n]{2,100})/gi)];
    for(const m of declarations){const value=clean(m[1]);if(!/\b(?:unknown|not stated|example only)\b/i.test(value)){models.push(value);evidence.push({page:p.page,quote:excerpt(p.text,m.index),field:'models',value});}}
    for(const pattern of MODEL_PATTERNS)for(const m of p.text.matchAll(new RegExp(pattern))){const value=/^Mx\s*-?\s*\d/i.test(m[0])?clean(m[0]).replace(/\s+/g,'').replace(/^mx-?(?=\d)/i,'Mx-'):clean(m[0]);models.push(value);evidence.push({page:p.page,quote:excerpt(p.text,m.index),field:'models',value});}
    for(const value of Array.isArray(record.models)?record.models:record.models?[record.models]:[]){const index=folded(p.text).indexOf(folded(value));if(index>=0){models.push(value);evidence.push({page:p.page,quote:excerpt(p.text,index),field:'models',value});}}
  }
  const distinctModels=unique(models).filter(model=>! /^(?:BS\s*)?EN\s*54(?:[- :/]+\d+)*$/i.test(model)).filter((model,_,all)=>!all.some(other=>other!==model&&folded(other).startsWith(folded(model)+' ')));
  const equipment=[];
  for(const p of identityPages)for(const [type,pattern] of EQUIPMENT){const m=pattern.exec(p.text);if(m){equipment.push({type,page:p.page,index:m.index});evidence.push({page:p.page,quote:excerpt(p.text,m.index),field:'equipmentType',value:type});}}
  equipment.sort((a,b)=>a.page-b.page||a.index-b.index);
  // A system manual's specification table often mentions its PSU before the
  // panel name. Strong title/overview evidence outranks an incidental component.
  const panelEvidence=equipment.find(item=>item.type==='panel');
  if(panelEvidence&&distinctModels.some(model=>/^(?:MxPro\s*[45]|Mx\s*-?\s*\d{3,5}V?(?:\/[A-Z]{1,4})?|CFP|XFP|Premier Elite|Galaxy |Sigma |Syncro |Twinflex|Vigilon)/i.test(model)))equipment.unshift(panelEvidence);
  let documentType=null,revision=null;
  for(const p of identityPages){
    const doc=p.text.match(/\b((?:installation(?: (?:and|&) (?:commissioning|operation))?|installer|engineering|technical|user|operating|service|wiring|commissioning|maintenance)(?:\s+(?:and|&|\/)?\s*(?:user|operation|maintenance|wiring))?\s+(?:manual|instructions|guide)|data\s*sheet)\b/i)||(p.page===1?p.text.match(/\b(installation\s+(?:&|and)\s+commissioning)\b/i):null);
    if(doc&&!documentType){documentType=clean(doc[0]);evidence.push({page:p.page,quote:excerpt(p.text,doc.index),field:'documentType',value:documentType});}
    const rev=p.text.match(/\b(?:Revision|Rev\.?|Issue|Edition)\s*[:.#-]?\s*([A-Z0-9][A-Z0-9_.\/-]{0,25})\b/i);
    if(rev&&!revision){revision=rev[1];evidence.push({page:p.page,quote:excerpt(p.text,rev.index),field:'revision',value:revision});}
  }
  const systems=systemScores.filter(x=>x.score>=Math.max(2,(systemScores[0]?.score||0)*.3)).map(x=>x.system);
  const systemTypes=systems.length?systems:systemScores.map(x=>x.system);
  const familyOnly=distinctModels.length===1&&/^(?:CFP|XFP|Sigma|Twinflex|Vigilon|Galaxy (?:Dimension|Flex)|Premier Elite|Net2|VESDA)$/i.test(distinctModels[0]);
  const requiresVariant=familyOnly||distinctModels.length>1||distinctModels.some(model=>/\s[\/,]\s*\d|\d\s*[\/,]\s*\d/.test(model))||identityPages.some(p=>/\b(?:variants?|model range|applies to models|covers models)\b/i.test(p.text));
  return {systemTypes,manufacturer:manufacturers[0]?.name||null,manufacturerCandidates:unique(manufacturers.map(x=>x.name)),model:distinctModels.length===1&&!familyOnly?distinctModels[0]:null,models:distinctModels,familyOnly,
    equipmentType:equipment[0]?.type||null,equipmentTypes:unique(equipment.map(x=>x.type)),documentType,revision,
    variants:requiresVariant?distinctModels:[],requiresVariant,uncertain:!systemTypes.length||systemTypes.length>1||!manufacturers.length||distinctModels.length!==1||requiresVariant,
    confirmed:false,evidence:evidence.slice(0,80),basis:'Unconfirmed suggestions extracted from manual contents. Confirm the installed label and applicable variant.'};
}

const STOP = new Set('a an and are as at be been by can check checking does for from has have how i in is it its of on or that the their then there these this to was were what when where which with you your'.split(' '));
const tokens = text => unique((folded(text).match(/[a-z0-9][a-z0-9-]{1,}/g)||[]).filter(t=>!STOP.has(t)).map(t=>t.replace(/(?:ing|ed|s)$/,'')));
export function searchManualPages(analysis, query, {limit=3} = {}) {
  const wanted=tokens(query);if(!wanted.length)return [];
  return (analysis?.pages||[]).filter(p=>p.quality?.readable!==false).map(p=>{
    const hay=folded(p.text);let score=0,first=-1;
    for(const term of wanted){const index=hay.indexOf(term);if(index>=0){score+=1;if(first<0||index<first)first=index;}}
    return {manualId:analysis.manualId,contentHash:analysis.contentHash,processorVersion:analysis.processorVersion,title:analysis.title,page:p.page,method:p.method,confidence:p.confidence,
      excerpt:excerpt(p.text,first,420),score,referenceOnly:true,requiresSourceReview:p.method==='ocr'};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.page-b.page).slice(0,Math.max(1,Math.min(10,limit)));
}

export function buildManualAnalysis({pages,record={},contentHash,pageCount=pages.length,timing={},processedAt=Date.now()}) {
  const normalized=pages.map(p=>({...p,page:p.page,text:clean(p.text),quality:p.quality||assessPageText(p.text,p)}));
  const readable=normalized.filter(p=>p.quality.readable),unreadable=normalized.filter(p=>!p.quality.readable).map(p=>p.page);
  const readableCharacters=readable.reduce((sum,p)=>sum+p.text.length,0);
  const usable=readable.length>0&&readableCharacters>=100;
  const identity=classifyManualPages(normalized,record);
  return {schemaVersion:MANUAL_ANALYSIS_SCHEMA,processorVersion:MANUAL_ANALYSIS_VERSION,id:'analysis-'+contentHash,manualId:record.id||'local-'+contentHash,contentHash,
    title:record.title||record.filename||'Uploaded manual',filename:record.filename||record.title||null,pageCount,pages:normalized,identity,usable,
    quality:{readablePages:readable.length,unreadablePages:unreadable,readableCharacters,ocrPages:normalized.filter(p=>p.method==='ocr').length,
      warning:!usable?'This PDF does not contain enough readable text. Add a clearer PDF or the relevant manual pages.':unreadable.length?'Some pages could not be read. Only readable pages can support the conversation; add clearer pages when needed.':normalized.some(p=>p.method==='ocr')?'Scanned text can contain recognition errors. Check cited pages and all numbers against the page image.':null},
    timing,processedAt,referencePolicy:'Manual text is untrusted reference material; model identification and procedures require confirmation. No scripts or embedded instructions are executed.'};
}
