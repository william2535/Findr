/** Generic text schedules only. This is not a manufacturer backup decoder. */
export const IMPORT_FIELDS = Object.freeze([
  {key:'panel',label:'Panel',aliases:['panel','panel name','panel number','panel id','control panel']},
  {key:'node',label:'Network node',aliases:['node','network node','node number','node id','panel node','network address']},
  {key:'loop',label:'Loop',aliases:['loop','loop no','loop number','loop id','circuit','loop circuit']},
  {key:'address',label:'Device address',aliases:['address','device address','device no','device number','detector address','addr']},
  {key:'subAddress',label:'Sub-address',aliases:['sub address','subaddress','sub addr','sub device','subdevice','input number','channel']},
  {key:'zone',label:'Zone',aliases:['zone','zone no','zone number','zone id','fire zone']},
  {key:'location',label:'Programmed location text',aliases:['location','location text','programmed location','programmed location text','programmed text','device text','device label','label','description','text']},
  {key:'type',label:'Device type',aliases:['type','device type','sensor type','detector type','point type']},
  {key:'manufacturer',label:'Manufacturer',aliases:['manufacturer','make','brand','device manufacturer']},
  {key:'model',label:'Model / family',aliases:['model','device model','product model','model name','family']},
  {key:'partNumber',label:'Complete part number',aliases:['part number','part no','part code','partnumber','product code','catalogue number','catalog number','item code','sku']},
  {key:'exportDate',label:'Export date (from file)',aliases:['export date','exported at','exported on','download date','configuration date','export timestamp']},
].map(field=>Object.freeze({...field,aliases:Object.freeze(field.aliases)})));

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 10000;
const MAX_COLUMNS = 100;
const headerKey = value => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
const textValue = value => typeof value === 'string' ? value : String(value ?? '');
const nonblank = value => textValue(value).trim().length > 0;

function sniffDelimiter(text) {
  let quoted=false,commas=0,tabs=0;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){
      if(quoted&&text[i+1]==='"'){i++;continue;}
      quoted=!quoted;continue;
    }
    if(!quoted){
      if(c===',')commas++;
      if(c==='\t')tabs++;
      if((c==='\r'||c==='\n')&&(commas||tabs||text.slice(0,i).trim()))break;
    }
  }
  if(tabs&&commas)throw new Error('The header contains both tabs and commas. Choose CSV or tab-delimited explicitly.');
  if(tabs)return '\t';
  if(commas)return ',';
  throw new Error('No CSV or tab-delimited header found. Use a header row with separate Loop and Address columns.');
}

/** Parse quoted CSV/TSV without coercing or trimming any cell value. */
export function parseSchedule(text,{delimiter='auto'}={}) {
  if(typeof text!=='string')throw new Error('The schedule must be UTF-8 text.');
  if(text.length>MAX_IMPORT_BYTES||new TextEncoder().encode(text).byteLength>MAX_IMPORT_BYTES)throw new Error('The schedule exceeds the 5 MiB import limit.');
  if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\ufffd]/.test(text))throw new Error('This is not valid UTF-8 CSV/TSV text. Native binary panel backups are not supported.');
  text=text.replace(/^\uFEFF/,'');
  if(!text.trim())throw new Error('The schedule file is empty.');
  const selected=delimiter==='auto'?sniffDelimiter(text):delimiter==='csv'?',':delimiter==='tsv'?'\t':delimiter;
  if(![',','\t'].includes(selected))throw new Error('Choose comma-separated CSV or tab-delimited TSV.');
  const table=[];
  let row=[],field='',quoted=false,afterQuote=false,touched=false,line=1;
  const pushField=()=>{row.push(field);field='';afterQuote=false;if(row.length>MAX_COLUMNS)throw new Error('The schedule has more than 100 columns.');};
  const pushRow=()=>{
    // Blank physical lines are separators; blank cells inside a row are retained.
    if(touched||row.length||field.length||afterQuote){pushField();table.push(row);}
    row=[];field='';afterQuote=false;touched=false;
    if(table.length>MAX_IMPORT_ROWS+1)throw new Error('The schedule exceeds the 10,000 device-row limit.');
  };
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){
      if(c==='"'){
        if(text[i+1]==='"'){field+='"';i++;}
        else{quoted=false;afterQuote=true;}
      }else{field+=c;if(c==='\n')line++;}
      continue;
    }
    if(c===selected){pushField();touched=true;continue;}
    if(c==='\r'||c==='\n'){
      pushRow();if(c==='\r'&&text[i+1]==='\n')i++;line++;continue;
    }
    if(afterQuote)throw new Error(`Unexpected text after a closing quote near line ${line}.`);
    if(c==='"'){
      if(field.length)throw new Error(`Unexpected quote inside an unquoted field near line ${line}.`);
      quoted=true;touched=true;continue;
    }
    field+=c;touched=true;
  }
  if(quoted)throw new Error('The file ends inside a quoted field. The import was not accepted.');
  pushRow();
  const headers=table.shift()||[];
  if(headers.length<2)throw new Error('The schedule needs a header row and separate Loop and Address columns.');
  if(headers.some(value=>!value.trim()))throw new Error('Every column needs a non-empty header.');
  const keys=headers.map(value=>value.trim().toLowerCase());
  if(new Set(keys).size!==keys.length)throw new Error('Duplicate column headers are not supported. Give each column a distinct name.');
  if(!table.length)throw new Error('The schedule contains headers but no device rows.');
  const bad=table.findIndex(values=>values.length!==headers.length);
  if(bad!==-1)throw new Error(`Row ${bad+2} contains ${table[bad].length} columns; the header has ${headers.length}. Nothing was imported.`);
  return {headers,rows:table,delimiter:selected,format:selected===','?'CSV':'TSV'};
}

/** Suggest only known headers; the engineer confirms or changes this mapping. */
export function suggestMapping(headers) {
  const normalized=headers.map(headerKey),used=new Set();
  return Object.fromEntries(IMPORT_FIELDS.map(field=>{
    const aliases=new Set([field.key,...field.aliases].map(headerKey));
    const candidates=normalized.flatMap((value,index)=>aliases.has(value)&&!used.has(index)?[index]:[]);
    const index=candidates.length===1?candidates[0]:-1;
    if(index!==-1)used.add(index);
    return [field.key,index];
  }));
}

/** Build canonical rows only after the full draft passes validation. */
export function mapSchedule(parsed,mapping={}) {
  if(!parsed||!Array.isArray(parsed.headers)||!Array.isArray(parsed.rows)||!parsed.rows.length)throw new Error('Parse a non-empty schedule before mapping columns.');
  const indices={};const used=new Set();
  for(const field of IMPORT_FIELDS){
    const value=mapping[field.key]??-1;
    const index=typeof value==='number'?value:(typeof value==='string'&&/^-?\d+$/.test(value)?Number(value):NaN);
    if(!Number.isInteger(index)||index < -1||index>=parsed.headers.length)throw new Error(`Choose a valid column for ${field.label}.`);
    if(index>=0&&used.has(index))throw new Error('Each source column can be mapped to only one field.');
    if(index>=0)used.add(index);indices[field.key]=index;
  }
  if(indices.loop<0||indices.address<0)throw new Error('Map both Loop and Device address before importing this addressable device schedule.');
  if(parsed.rows.length>MAX_IMPORT_ROWS)throw new Error('The schedule exceeds the 10,000 device-row limit.');
  return parsed.rows.map((values,index)=>{
    if(!Array.isArray(values)||values.length!==parsed.headers.length||values.some(value=>typeof value!=='string'))throw new Error(`Row ${index+2} is malformed. Nothing was imported.`);
    const result={id:String(index+2)};
    for(const field of IMPORT_FIELDS)result[field.key]=indices[field.key]<0?'':values[indices[field.key]];
    if(!nonblank(result.loop)||!nonblank(result.address))throw new Error(`Row ${index+2} is missing a Loop or Device address. Correct the file or mapping; nothing was imported.`);
    result.rawValues=[...values];
    return result;
  });
}

// Numeric comparison is only for lookup, never for rewriting imported values.
const addressKey=value=>{
  const trimmed=textValue(value).trim().toLowerCase();
  return /^\d+$/.test(trimmed)?trimmed.replace(/^0+(?=\d)/,''):trimmed;
};
const equivalent=(left,right)=>addressKey(left)===addressKey(right);
const SEARCH_FIELDS=['panel','node','loop','address','subAddress','zone'];

function queryParts(query) {
  const values={panel:'',node:'',loop:'',address:'',subAddress:'',zone:''};
  let remainder=textValue(query).trim();
  const setValue=(key,value)=>{
    if(values[key]&&!equivalent(values[key],value))throw new Error(`The display text contains more than one ${key==='subAddress'?'sub-address':key}. Enter one location at a time.`);
    values[key]=value;
  };
  // Preserve distinct channels in common compact notation such as D37/02.
  remainder=remainder.replace(/\b(?:address|addr|device|detector|d)\s*[:=#]?\s*([0-9]+[a-z]?)\s*[./]\s*([0-9]+[a-z]?)\b/gi,(_,address,subAddress)=>{
    setValue('address',address);setValue('subAddress',subAddress);return ' ';
  });
  // Explicit words precede single-letter shorthand; full suffixes remain intact.
  const patterns=[
    ['subAddress',/\b(?:sub[\s-]*address|subaddr|sub|channel|input)\s*[:=#-]?\s*([0-9]+[a-z]?)\b/gi],
    ['panel',/\bpanel\s*[:=#]?\s*([a-z0-9][a-z0-9._-]*)\b/gi],
    ['node',/\b(?:node|network\s+node|n)\s*[:=#]?\s*([0-9]+[a-z]?)\b/gi],
    ['loop',/\b(?:loop|l)\s*[:=#]?\s*([0-9]+[a-z]?)\b/gi],
    ['address',/\b(?:address|addr|device|detector|d)\s*[:=#]?\s*([0-9]+[a-z]?)\b/gi],
    ['zone',/\b(?:zone|z)\s*[:=#]?\s*([0-9]+[a-z]?)\b/gi],
  ];
  for(const [key,pattern] of patterns){
    remainder=remainder.replace(pattern,(_,value)=>{
      setValue(key,value);return ' ';
    });
  }
  return {values,remainder:remainder.replace(/\s+/g,' ').trim()};
}

/** Return every matching programmed row, in source order, without location inference. */
export function lookupSchedule(rows,options={}) {
  const query=textValue(options.query);
  const fromQuery=queryParts(query);
  const parsed={query};
  for(const key of SEARCH_FIELDS){
    const explicit=textValue(options[key]).trim(),inferred=fromQuery.values[key];
    if(explicit&&inferred&&!equivalent(explicit,inferred))throw new Error(`The ${key==='subAddress'?'sub-address':key} field conflicts with the display text. Check the selected scope and fault text.`);
    parsed[key]=explicit||inferred;
  }
  const hasAddress=nonblank(parsed.address);
  // A reported fault such as "L1 D37 missing" must not require "missing" in a
  // programmed location. Free text is searched only when no address tokens exist.
  const hasQueryTokens=SEARCH_FIELDS.some(key=>nonblank(fromQuery.values[key]));
  parsed.text=textValue(options.text).trim()||(!hasQueryTokens?fromQuery.remainder:'');
  const terms=parsed.text.toLowerCase().split(/\s+/).filter(Boolean);
  const matches=(Array.isArray(rows)?rows:[]).filter(row=>{
    if(!row||typeof row!=='object')return false;
    if(SEARCH_FIELDS.some(key=>nonblank(parsed[key])&&!equivalent(row[key],parsed[key])))return false;
    const haystack=[row.location,row.type,row.manufacturer,row.model,row.partNumber].map(textValue).join(' ').toLowerCase();
    return terms.every(term=>haystack.includes(term));
  });
  const kind=hasAddress?'address':nonblank(parsed.loop)?'loop':nonblank(parsed.zone)?'zone':parsed.text?'text':'all';
  return {rows:matches,kind,ambiguous:kind==='address'&&matches.length>1,parsed};
}
